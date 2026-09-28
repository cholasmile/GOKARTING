import { db, SyncQueueItem } from '../db/db';
import { supabase, isSupabaseConfigured } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface RealtimeChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any;
}

const TABLE_MAP_TO_DEXIE: Record<string, string> = {
  'food_vendors': 'vendors',
  'menu_items': 'menuItems',
  'food_orders': 'orders',
  'lap_records': 'lapRecords',
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

class SyncEngine {
  private isSyncing = false;
  private isRealtimeActive = false;
  private realTimeChannel: any = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private syncListeners: ((status: SyncStatus, pendingCount: number, isRealtime: boolean) => void)[] = [];
  private changeListeners: ((event: RealtimeChangeEvent) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncEngine] Network reconnected – triggering sync and subscribing to realtime');
        this.triggerSync();
        this.setupRealtimeSubscription();
      });
      window.addEventListener('offline', () => {
        this.broadcastStatus('idle');
      });

      // Local cross-tab broadcast channel for immediate multi-tab sync on same machine
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
    }

    // Initialize realtime connection if configured
    if (isSupabaseConfigured && typeof window !== 'undefined' && navigator.onLine) {
      this.setupRealtimeSubscription();
    }
  }

  public subscribe(listener: (status: SyncStatus, pendingCount: number, isRealtime: boolean) => void) {
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

  private async broadcastStatus(status: SyncStatus) {
    let pendingCount = 0;
    try {
      pendingCount = await db.syncQueue.where('status').equals('pending').count();
    } catch (e) {
      console.warn('[SyncEngine] Error counting pending sync items:', e);
    }
    this.syncListeners.forEach(listener => listener(status, pendingCount, this.isRealtimeActive));
  }

  public setupRealtimeSubscription() {
    if (!isSupabaseConfigured || !supabase || this.realTimeChannel) return;

    try {
      console.log('[SyncEngine] Subscribing to Supabase Realtime Data Channel...');
      this.realTimeChannel = supabase
        .channel('public-db-realtime-changes')
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

  public async queueOperation(table: string, action: 'insert' | 'update' | 'delete', payload: any) {
    // 1. Write to local Dexie immediately
    const dexieTableName = TABLE_MAP_TO_DEXIE[table] || table;
    try {
      const dexieTable = (db as any)[dexieTableName];
      if (dexieTable) {
        if (action === 'delete') {
          if (payload.id) await dexieTable.delete(payload.id);
        } else {
          await dexieTable.put(payload);
        }
      }
    } catch (err) {
      console.warn(`[SyncEngine] Dexie write error:`, err);
    }

    // 2. Add to syncQueue
    await db.syncQueue.add({
      table,
      action,
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString()
    });

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

  public async triggerSync() {
    if (this.isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    this.isSyncing = true;
    await this.broadcastStatus('syncing');

    try {
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
      if (pendingItems.length === 0) {
        await this.broadcastStatus('idle');
        return;
      }

      console.log(`[SyncEngine] Flushing ${pendingItems.length} pending offline items to server/cloud...`);

      // 1. Primary Sync: Send batch to /api/sync/batch
      let apiBatchSuccess = false;
      try {
        const res = await fetch('/api/sync/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: pendingItems.map(item => ({
              table: item.table,
              action: item.action,
              payload: item.payload
            }))
          })
        });
        if (res.ok) {
          apiBatchSuccess = true;
          console.log(`[SyncEngine] Successfully synced ${pendingItems.length} items to backend.`);
        }
      } catch (err) {
        console.warn('[SyncEngine] Backend /api/sync/batch request failed, trying Supabase fallback:', err);
      }

      // 2. Supabase Sync (if configured)
      let supabaseSuccess = false;
      if (isSupabaseConfigured && supabase) {
        try {
          for (const item of pendingItems) {
            try {
              if (item.action === 'insert') {
                const { error } = await supabase.from(item.table).insert([item.payload]);
                if (error && error.code !== '23505') throw error;
              } else if (item.action === 'update') {
                const { error } = await supabase.from(item.table).update(item.payload).eq('id', item.payload.id);
                if (error) throw error;
              } else if (item.action === 'delete') {
                const { error } = await supabase.from(item.table).delete().eq('id', item.payload.id);
                if (error) throw error;
              }
            } catch (itemErr) {
              console.warn(`[SyncEngine] Supabase item sync warning (${item.table}):`, itemErr);
            }
          }
          supabaseSuccess = true;
        } catch (sbErr) {
          console.warn('[SyncEngine] Supabase batch sync failed:', sbErr);
        }
      }

      // If either backend API or Supabase succeeded, remove successfully pushed items from syncQueue
      if (apiBatchSuccess || supabaseSuccess) {
        for (const item of pendingItems) {
          if (item.id) {
            await db.syncQueue.delete(item.id);
          }
        }
      } else {
        for (const item of pendingItems) {
          if (item.id) {
            await db.syncQueue.update(item.id, {
              retryCount: item.retryCount + 1,
              error: 'Sync destination unreachable'
            });
          }
        }
      }

      await this.broadcastStatus('idle');
    } catch (err) {
      console.error('[SyncEngine] Sync process error:', err);
      await this.broadcastStatus('error');
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
