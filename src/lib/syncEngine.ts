import { db, SyncQueueItem } from '../db/db';
import { supabase, isSupabaseConfigured } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'error';

class SyncEngine {
  private isSyncing = false;
  private syncListeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.triggerSync());
    }
  }

  public subscribe(listener: (status: SyncStatus, pendingCount: number) => void) {
    this.syncListeners.push(listener);
    this.broadcastStatus('idle'); // Initial broadcast
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private async broadcastStatus(status: SyncStatus) {
    const pendingCount = await db.syncQueue.where('status').equals('pending').count();
    this.syncListeners.forEach(listener => listener(status, pendingCount));
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
    if (navigator.onLine) {
      this.triggerSync();
    } else {
      this.broadcastStatus('idle'); // Just to update count
    }
  }

  public async triggerSync() {
    if (this.isSyncing || !navigator.onLine || !isSupabaseConfigured) return;
    this.isSyncing = true;
    await this.broadcastStatus('syncing');

    try {
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
      
      for (const item of pendingItems) {
        if (!item.id) continue;
        
        try {
          if (item.action === 'insert') {
            const { error } = await supabase!.from(item.table).insert([item.payload]);
            if (error && error.code !== '23505') throw error; // Ignore duplicate key errors if previously synced
          } else if (item.action === 'update') {
            const { error } = await supabase!.from(item.table).update(item.payload).eq('id', item.payload.id);
            if (error) throw error;
          } else if (item.action === 'delete') {
            const { error } = await supabase!.from(item.table).delete().eq('id', item.payload.id);
            if (error) throw error;
          }

          // Mark as synced or delete from queue
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
