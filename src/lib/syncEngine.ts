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
  private syncListeners: ((status: SyncStatus, pendingCount: number, isRealtime: boolean) => void)[] = [];
  private changeListeners: ((event: RealtimeChangeEvent) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.triggerSync();
        this.setupRealtimeSubscription();
      });
      window.addEventListener('offline', () => {
        this.broadcastStatus('idle');
      });
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

    this.changeListeners.forEach(listener => {
      try {
        listener(changeEvent);
      } catch (e) {
        console.error('[SyncEngine] Change listener execution error:', e);
      }
    });
  }

  public async queueOperation(table: string, action: 'insert' | 'update' | 'delete', payload: any) {
    await db.syncQueue.add({
      table,
      action,
      payload,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString()
    });
    
    // Attempt sync immediately if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.triggerSync();
    } else {
      this.broadcastStatus('idle');
    }
  }

  public async triggerSync() {
    if (this.isSyncing || (typeof navigator !== 'undefined' && !navigator.onLine) || !isSupabaseConfigured || !supabase) return;
    this.isSyncing = true;
    await this.broadcastStatus('syncing');

    try {
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
      
      for (const item of pendingItems) {
        if (!item.id) continue;
        
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

          // Delete from offline queue upon successful cloud push
          await db.syncQueue.delete(item.id);
        } catch (err: any) {
          console.error(`Failed to sync item ${item.id}`, err);
          await db.syncQueue.update(item.id, {
            retryCount: item.retryCount + 1,
            error: err.message || 'Unknown error'
          });
        }
      }
      await this.broadcastStatus('idle');
    } catch (err) {
      console.error('Sync process error:', err);
      await this.broadcastStatus('error');
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncEngine = new SyncEngine();
