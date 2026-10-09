import { db, SyncQueueItem } from '../db/db';
import { supabase, isSupabaseConfigured } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface RealtimeChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any;
}

export const TABLE_MAP_TO_DEXIE: Record<string, string> = {
  'food_vendors': 'vendors',
  'vendors': 'vendors',
  'menu_items': 'menuItems',
  'menuItems': 'menuItems',
  'food_orders': 'orders',
  'orders': 'orders',
  'lap_records': 'lapRecords',
  'lapRecords': 'lapRecords',
  'activities': 'activities',
  'bookings': 'bookings',
  'tickets': 'tickets',
  'notifications': 'notifications',
  'payments': 'payments',
  'users': 'users',
  'karts': 'karts',
  'sessions': 'sessions',
  'waivers': 'waivers',
  'inventory': 'inventory'
};

export const TABLE_MAP_TO_SUPABASE: Record<string, string> = {
  'vendors': 'food_vendors',
  'food_vendors': 'food_vendors',
  'menuItems': 'menu_items',
  'menu_items': 'menu_items',
  'orders': 'food_orders',
  'food_orders': 'food_orders',
  'lapRecords': 'lap_records',
  'lap_records': 'lap_records',
  'activities': 'activities',
  'bookings': 'bookings',
  'tickets': 'tickets',
  'notifications': 'notifications',
  'payments': 'payments',
  'users': 'users',
  'karts': 'karts',
  'sessions': 'sessions',
  'waivers': 'waivers',
  'inventory': 'inventory'
};

// Dependency order: push parent tables before dependent foreign-key children
const TABLE_DEPENDENCY_ORDER: string[] = [
  'users',
  'food_vendors',
  'vendors',
  'activities',
  'menu_items',
  'menuItems',
  'inventory',
  'bookings',
  'tickets',
  'food_orders',
  'orders',
  'payments',
  'notifications',
  'karts',
  'sessions',
  'waivers',
  'lap_records',
  'lapRecords'
];

class SyncEngine {
  private isSyncing = false;
  private isRealtimeActive = false;
  private realTimeChannel: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private syncListeners: ((status: SyncStatus, pendingCount: number, isRealtime: boolean, lastSyncTime?: string) => void)[] = [];
  private changeListeners: ((event: RealtimeChangeEvent) => void)[] = [];
  private syncCompletedListeners: ((syncedCount: number) => void)[] = [];
  private lastSyncTime: string = '';
  private autoRetryTimer: any = null;

  constructor() {
    // Load last sync time from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        this.lastSyncTime = localStorage.getItem('deuce_last_sync_time') || '';
      } catch (e) {}

      // 1. Online reconnection event
      window.addEventListener('online', () => {
        console.log('[SyncEngine] Network reconnected – triggering immediate sync and subscribing to realtime');
        this.triggerSync();
        this.setupRealtimeSubscription(true);
      });

      // 2. Offline event
      window.addEventListener('offline', () => {
        console.log('[SyncEngine] Network went offline – operating in offline-first mode');
        this.broadcastStatus('idle');
      });

      // 3. Tab focus / activation sync
      window.addEventListener('focus', () => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          this.triggerSync();
        }
      });

      // 4. Document visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && typeof navigator !== 'undefined' && navigator.onLine) {
          this.triggerSync();
        }
      });

      // 5. Cross-tab broadcast channel for immediate multi-tab sync on same machine
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          this.broadcastChannel = new BroadcastChannel('deuce_realtime_sync');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data && event.data.table && event.data.record) {
              this.notifyChangeListeners(event.data);
            }
          };
        }
      } catch (e) {
        console.warn('[SyncEngine] BroadcastChannel not supported in this environment');
      }

      // 6. Periodic background retry check (every 15s) for any lingering pending/failed items
      this.autoRetryTimer = setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          this.checkAndAutoRetry();
        }
      }, 15000);
    }

    // Initialize realtime connection if configured and online
    if (isSupabaseConfigured && typeof window !== 'undefined' && navigator.onLine) {
      this.setupRealtimeSubscription();
      // Initial startup sync
      setTimeout(() => {
        this.triggerSync();
      }, 1000);
    }
  }

  public getLastSyncTime(): string {
    return this.lastSyncTime;
  }

  public subscribe(listener: (status: SyncStatus, pendingCount: number, isRealtime: boolean, lastSyncTime?: string) => void) {
    this.syncListeners.push(listener);
    this.broadcastStatus('idle');
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  public subscribeToChanges(listener: (event: RealtimeChangeEvent) => void) {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  public onSyncCompleted(listener: (syncedCount: number) => void) {
    this.syncCompletedListeners.push(listener);
    return () => {
      this.syncCompletedListeners = this.syncCompletedListeners.filter(l => l !== listener);
    };
  }

  private notifySyncCompleted(syncedCount: number) {
    this.syncCompletedListeners.forEach(listener => {
      try {
        listener(syncedCount);
      } catch (e) {
        console.error('[SyncEngine] SyncCompleted listener error:', e);
      }
    });
  }

  private async broadcastStatus(status: SyncStatus) {
    let pendingCount = 0;
    try {
      pendingCount = await db.syncQueue
        .where('status')
        .anyOf(['pending', 'syncing', 'failed'])
        .count();
    } catch (e) {
      console.warn('[SyncEngine] Error counting pending sync items:', e);
    }
    this.syncListeners.forEach(listener => listener(status, pendingCount, this.isRealtimeActive, this.lastSyncTime));
  }

  public setupRealtimeSubscription(forceReconnect = false) {
    if (!isSupabaseConfigured || !supabase) return;

    if (this.realTimeChannel) {
      if (!forceReconnect) return;
      try {
        supabase.removeChannel(this.realTimeChannel);
      } catch (e) {}
      this.realTimeChannel = null;
    }

    try {
      console.log('[SyncEngine] Subscribing to Supabase Realtime Data Channel...');
      this.realTimeChannel = supabase
        .channel('public-db-realtime-changes-' + Date.now())
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload: any) => {
            console.log('[SyncEngine Realtime Event Received]:', payload.eventType, payload.table);
            this.handleIncomingRealtimePayload(payload);
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[SyncEngine Realtime Stream]: CONNECTED & ACTIVE');
            this.isRealtimeActive = true;
          } else {
            this.isRealtimeActive = false;
          }
          this.broadcastStatus('idle');
        });
    } catch (err) {
      console.error('[SyncEngine] Realtime connection failed:', err);
      this.isRealtimeActive = false;
    }
  }

  private notifyChangeListeners(changeEvent: RealtimeChangeEvent) {
    this.changeListeners.forEach(listener => {
      try {
        listener(changeEvent);
      } catch (e) {
        console.error('[SyncEngine] Change listener execution error:', e);
      }
    });
  }

  private async handleIncomingRealtimePayload(payload: any) {
    const { table, eventType, new: newRecord, old: oldRecord } = payload;
    const record = newRecord && Object.keys(newRecord).length > 0 ? newRecord : oldRecord;

    if (!table || !record) return;

    // 1. Write immediately into local Dexie IndexedDB
    const dexieTableName = TABLE_MAP_TO_DEXIE[table] || table;
    try {
      const dexieTable = (db as any)[dexieTableName];
      if (dexieTable) {
        if (eventType === 'DELETE') {
          if (record.id) await dexieTable.delete(record.id);
        } else {
          await dexieTable.put(record);
        }
      }
    } catch (err) {
      console.warn(`[SyncEngine] Dexie sync write error for ${table}:`, err);
    }

    // 2. Broadcast change event to AppContext / UI listeners
    const changeEvent: RealtimeChangeEvent = {
      table,
      eventType: eventType as any,
      record
    };

    this.notifyChangeListeners(changeEvent);
  }

  /**
   * Queues an operation to be synced. Always writes locally first.
   * Prevents duplicate entries for the same entity by updating existing pending items.
   */
  public async queueOperation(table: string, action: 'insert' | 'update' | 'delete', payload: any) {
    if (!payload) return;

    // Ensure updatedAt timestamp is always present
    const now = new Date().toISOString();
    if (!payload.updatedAt && typeof payload === 'object') {
      payload.updatedAt = now;
    }

    // 1. Write to local Dexie immediately (offline-first local database)
    const dexieTableName = TABLE_MAP_TO_DEXIE[table] || table;
    try {
      const dexieTable = (db as any)[dexieTableName];
      if (dexieTable && payload.id) {
        if (action === 'delete') {
          await dexieTable.delete(payload.id);
        } else {
          await dexieTable.put(payload);
        }
      }
    } catch (err) {
      console.warn(`[SyncEngine] Local Dexie write error:`, err);
    }

    // 2. De-duplicate in syncQueue: Check if a pending or failed item for the same record exists
    try {
      if (payload.id) {
        const existingItems = await db.syncQueue
          .where('table')
          .equals(table)
          .toArray();

        const match = existingItems.find(item => item.payload?.id === payload.id);
        if (match && match.id) {
          // If already queued, update action and payload with the latest version
          await db.syncQueue.update(match.id, {
            action: action === 'delete' ? 'delete' : match.action === 'insert' ? 'insert' : 'update',
            payload,
            status: 'pending',
            updatedAt: now
          });
        } else {
          // Add new queue item
          await db.syncQueue.add({
            table,
            action,
            payload,
            status: 'pending',
            retryCount: 0,
            createdAt: now,
            updatedAt: now
          });
        }
      } else {
        await db.syncQueue.add({
          table,
          action,
          payload,
          status: 'pending',
          retryCount: 0,
          createdAt: now,
          updatedAt: now
        });
      }
    } catch (queueErr) {
      console.error('[SyncEngine] Error enqueueing operation:', queueErr);
    }

    // 3. Broadcast to other tabs on same machine
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          table,
          eventType: action === 'insert' ? 'INSERT' : action === 'update' ? 'UPDATE' : 'DELETE',
          record: payload
        });
      } catch (e) {}
    }

    // 4. Attempt sync immediately if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.triggerSync();
    } else {
      this.broadcastStatus('idle');
    }
  }

  private async checkAndAutoRetry() {
    if (this.isSyncing) return;
    try {
      const count = await db.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .count();
      if (count > 0) {
        console.log(`[SyncEngine] Auto-retry triggered for ${count} pending/failed items`);
        this.triggerSync();
      }
    } catch (e) {}
  }

  /**
   * Main synchronization routine. Flushes all pending and failed operations to server/cloud.
   */
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncing) {
      console.log('[SyncEngine] Sync already in progress, skipping duplicate trigger.');
      return { success: false, syncedCount: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[SyncEngine] Device is offline. Sync skipped until connection returns.');
      await this.broadcastStatus('idle');
      return { success: false, syncedCount: 0 };
    }

    this.isSyncing = true;
    await this.broadcastStatus('syncing');

    let totalSynced = 0;

    try {
      // Find all items that need to be synced (pending, failed, or previously stuck in syncing)
      const pendingItems = await db.syncQueue
        .where('status')
        .anyOf(['pending', 'failed', 'syncing'])
        .toArray();

      if (pendingItems.length === 0) {
        await this.broadcastStatus('idle');
        this.isSyncing = false;
        return { success: true, syncedCount: 0 };
      }

      console.log(`[SyncEngine] Starting synchronization of ${pendingItems.length} records...`);

      // Mark items as 'syncing'
      for (const item of pendingItems) {
        if (item.id) {
          await db.syncQueue.update(item.id, { status: 'syncing', lockedAt: new Date().toISOString() });
        }
      }

      // Sort items by dependency order (parent entities first)
      const sortedItems = [...pendingItems].sort((a, b) => {
        const orderA = TABLE_DEPENDENCY_ORDER.indexOf(a.table);
        const orderB = TABLE_DEPENDENCY_ORDER.indexOf(b.table);
        const rankA = orderA === -1 ? 999 : orderA;
        const rankB = orderB === -1 ? 999 : orderB;
        return rankA - rankB;
      });

      // 1. Primary Sync: Send batch to backend /api/sync/batch if available
      let apiBatchSuccess = false;
      try {
        const res = await fetch('/api/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: sortedItems.map(item => ({
              table: TABLE_MAP_TO_SUPABASE[item.table] || item.table,
              action: item.action,
              payload: item.payload
            }))
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            apiBatchSuccess = true;
            console.log(`[SyncEngine] Backend /api/sync/batch acknowledged ${sortedItems.length} items.`);
          }
        }
      } catch (err) {
        console.warn('[SyncEngine] Backend /api/sync/batch not reachable or failed:', err);
      }

      // 2. Supabase Sync (if configured)
      let supabaseSuccessCount = 0;
      if (isSupabaseConfigured && supabase) {
        for (const item of sortedItems) {
          try {
            const targetTable = TABLE_MAP_TO_SUPABASE[item.table] || item.table;
            let itemSuccess = false;

            if (item.action === 'delete') {
              if (item.payload?.id) {
                const { error } = await supabase.from(targetTable).delete().eq('id', item.payload.id);
                if (!error) {
                  itemSuccess = true;
                } else {
                  console.warn(`[SyncEngine] Supabase delete error on ${targetTable}:`, error);
                }
              }
            } else {
              // Upsert operation
              const { error } = await supabase.from(targetTable).upsert([item.payload], { onConflict: 'id' });
              if (!error) {
                itemSuccess = true;
              } else {
                console.warn(`[SyncEngine] Supabase upsert error on ${targetTable}:`, error);
                // If table doesn't exist in Supabase (e.g., karts/sessions) or schema mismatch, check if API batch succeeded
                if (apiBatchSuccess) {
                  itemSuccess = true;
                }
              }
            }

            if (itemSuccess) {
              supabaseSuccessCount++;
              if (item.id) {
                await db.syncQueue.update(item.id, { status: 'synced' });
                await db.syncQueue.delete(item.id);
                totalSynced++;
              }
            } else if (!apiBatchSuccess) {
              if (item.id) {
                await db.syncQueue.update(item.id, {
                  status: 'failed',
                  retryCount: (item.retryCount || 0) + 1,
                  error: 'Supabase upsert rejected or failed'
                });
              }
            }
          } catch (itemErr: any) {
            console.warn(`[SyncEngine] Supabase item sync exception (${item.table}):`, itemErr);
            if (!apiBatchSuccess && item.id) {
              await db.syncQueue.update(item.id, {
                status: 'failed',
                retryCount: (item.retryCount || 0) + 1,
                error: itemErr?.message || String(itemErr)
              });
            }
          }
        }
      }

      // If backend API succeeded and Supabase is not configured (or Supabase synced everything)
      if (apiBatchSuccess && (!isSupabaseConfigured || supabaseSuccessCount === 0)) {
        for (const item of sortedItems) {
          if (item.id) {
            await db.syncQueue.update(item.id, { status: 'synced' });
            await db.syncQueue.delete(item.id);
            totalSynced++;
          }
        }
      }

      // If at least some items synced or all were processed
      const nowIso = new Date().toISOString();
      this.lastSyncTime = nowIso;
      try {
        localStorage.setItem('deuce_last_sync_time', nowIso);
      } catch (e) {}

      console.log(`[SyncEngine] Synchronisation completed. ${totalSynced}/${pendingItems.length} records successfully uploaded.`);

      // Notify AppContext & UI to refresh fresh authoritative data
      if (totalSynced > 0 || apiBatchSuccess || supabaseSuccessCount > 0) {
        this.notifySyncCompleted(totalSynced);
      }

      const remainingFailed = await db.syncQueue
        .where('status')
        .anyOf(['pending', 'failed'])
        .count();

      if (remainingFailed > 0) {
        await this.broadcastStatus('error');
      } else {
        await this.broadcastStatus('idle');
      }

      return { success: remainingFailed === 0, syncedCount: totalSynced };
    } catch (err) {
      console.error('[SyncEngine] Critical error during sync process:', err);
      await this.broadcastStatus('error');
      return { success: false, syncedCount: totalSynced };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
