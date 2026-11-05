import { db } from '../db/db';
import { supabase, isSupabaseConfigured } from './supabase';
import { getComputerId } from './deviceSetup';
import { DailySalesSummary, Ticket, Payment, Booking } from '../types';

export type SummarySyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'error';

class SalesSummaryEngine {
  private syncStatus: SummarySyncStatus = 'idle';
  private lastSyncedAt: string = '';
  private debounceTimer: any = null;
  private listeners: ((status: SummarySyncStatus, pendingCount: number, lastSyncTime: string) => void)[] = [];
  private cachedSummariesMap: Map<string, DailySalesSummary[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.lastSyncedAt = localStorage.getItem('deuce_last_summary_sync') || '';
      } catch (e) {}

      // Re-trigger sync when coming back online
      window.addEventListener('online', () => {
        console.log('[SalesSummaryEngine] Back online. Flushing all pending daily sales summaries...');
        this.syncAllPendingSummaries();
      });

      // Periodic check every 60 seconds
      setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          this.checkAndAutoSync();
        }
      }, 60000);
    }
  }

  /**
   * Formats a date as YYYY-MM-DD in local timezone.
   */
  public getTodayBusinessDate(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Normalizes any ISO string or date into YYYY-MM-DD.
   */
  public normalizeDate(dateStr?: string): string {
    if (!dateStr) return this.getTodayBusinessDate();
    if (dateStr.length === 10 && dateStr.includes('-')) return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return this.getTodayBusinessDate();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return this.getTodayBusinessDate();
    }
  }

  /**
   * Calculates the cumulative daily sales summary strictly from local IndexedDB for this computer.
   */
  public async calculateDailySummary(
    targetDate?: string,
    computerIdOverride?: string
  ): Promise<DailySalesSummary> {
    const business_date = targetDate ? this.normalizeDate(targetDate) : this.getTodayBusinessDate();
    const computer_id = computerIdOverride || getComputerId();
    const summaryId = `sum-${business_date}-${computer_id}`;

    // 1. Fetch tickets for this date from local Dexie
    const allTickets: Ticket[] = await db.tickets.toArray();
    const dayTickets = allTickets.filter(t => {
      const tDate = this.normalizeDate(t.date || t.updatedAt);
      return tDate === business_date && t.status !== 'cancelled';
    });

    // 2. Fetch bookings for this date from local Dexie
    const allBookings: Booking[] = await db.bookings.toArray();
    const dayBookings = allBookings.filter(b => {
      const bDate = this.normalizeDate(b.date || b.bookingDate || b.updatedAt);
      return bDate === business_date && b.paymentStatus !== 'cancelled' && b.paymentStatus !== 'failed';
    });

    // 3. Fetch payments for this date from local Dexie
    const allPayments: Payment[] = await db.payments.toArray();
    const dayPayments = allPayments.filter(p => {
      const pDate = this.normalizeDate(p.timestamp || p.created_at || p.updatedAt);
      const isPaid = p.status === 'paid' || p.status === 'success' || p.payment_status === 'PAID';
      return pDate === business_date && isPaid;
    });

    // Category counters
    let total_tickets = 0;
    let single_kart_tickets = 0;
    let double_kart_tickets = 0;
    let silver_package_tickets = 0;
    let golden_package_tickets = 0;

    for (const t of dayTickets) {
      const qty = t.quantity || 1;
      total_tickets += qty;

      const actName = (t.activityName || '').toLowerCase();
      const actId = (t.activityId || '').toLowerCase();
      const pkgName = (t.packageName || t.ticketType || '').toLowerCase();
      const pkgId = (t.packageId || '').toLowerCase();

      // If ticket contains multiple packages (e.g., Single Kart + Double Kart combo bundle)
      if (t.packageBundleItems && t.packageBundleItems.length > 0) {
        for (const item of t.packageBundleItems) {
          const iName = (item.packageName || '').toLowerCase();
          const iId = (item.packageId || '').toLowerCase();
          const iQty = item.quantity || 1;

          if (
            iId.includes('single') ||
            iName.includes('single') ||
            (actName.includes('kart') && !iName.includes('double') && !iName.includes('twin') && !iName.includes('race'))
          ) {
            single_kart_tickets += iQty;
          }

          if (
            iId.includes('double') ||
            iName.includes('double') ||
            iName.includes('twin') ||
            iName.includes('co-pilot')
          ) {
            double_kart_tickets += iQty;
          }

          if (iName.includes('silver') || iId.includes('silver')) {
            silver_package_tickets += iQty;
          }

          if (iName.includes('golden') || iName.includes('gold') || iId.includes('golden') || iId.includes('gold')) {
            golden_package_tickets += iQty;
          }
        }
        continue;
      }

      // Single Kart check
      if (
        pkgId.includes('single') ||
        pkgName.includes('single') ||
        (actName.includes('kart') && !pkgName.includes('double') && !pkgName.includes('twin') && !pkgName.includes('race'))
      ) {
        single_kart_tickets += qty;
      }

      // Double Kart check
      if (
        pkgId.includes('double') ||
        pkgName.includes('double') ||
        pkgName.includes('twin') ||
        pkgName.includes('co-pilot')
      ) {
        double_kart_tickets += qty;
      }

      // Silver Package check
      if (pkgName.includes('silver') || pkgId.includes('silver')) {
        silver_package_tickets += qty;
      }

      // Golden Package check
      if (pkgName.includes('golden') || pkgName.includes('gold') || pkgId.includes('golden') || pkgId.includes('gold')) {
        golden_package_tickets += qty;
      }
    }

    // Activity revenue totals
    let total_gokart_sales = 0;
    let air_rifle_sales = 0;
    let horse_riding_sales = 0;
    let car_simulator_sales = 0;
    let moto_simulation_sales = 0;

    for (const b of dayBookings) {
      const amount = Number(b.totalAmount || 0);
      const actId = (b.activityId || '').toLowerCase();
      const actName = (b.activityName || '').toLowerCase();

      if (actId.includes('kart') || actName.includes('kart')) {
        total_gokart_sales += amount;
      } else if (actId.includes('gun') || actId.includes('shoot') || actId.includes('rifle') || actName.includes('shoot') || actName.includes('rifle') || actName.includes('gun')) {
        air_rifle_sales += amount;
      } else if (actId.includes('horse') || actName.includes('horse') || actName.includes('equestrian')) {
        horse_riding_sales += amount;
      } else if (actId.includes('car-sim') || actName.includes('car sim') || (actName.includes('car') && actName.includes('simulator'))) {
        car_simulator_sales += amount;
      } else if (actId.includes('moto') || actName.includes('moto') || actName.includes('bike sim')) {
        moto_simulation_sales += amount;
      } else {
        // Fallback: If not categorized above, if it's go-karting related default to gokart
        if (actName.includes('track') || actName.includes('race')) {
          total_gokart_sales += amount;
        }
      }
    }

    // Payment collection breakdown
    let cash_total = 0;
    let upi_total = 0;
    let card_total = 0;
    let other_payment_total = 0;

    for (const p of dayPayments) {
      const amt = Number(p.amount || 0);
      const method = (p.method || p.payment_method || '').toLowerCase();

      if (method === 'cash') {
        cash_total += amt;
      } else if (method === 'upi' || method === 'qrcode' || method.includes('qr')) {
        upi_total += amt;
      } else if (method.startsWith('card') || method === 'pos' || method === 'credit_card' || method === 'debit_card') {
        card_total += amt;
      } else {
        // Online gateway / razorpay
        if (method === 'razorpay' || p.gateway === 'Razorpay' || method === 'online') {
          upi_total += amt; // Default online gateway to UPI/electronic collection
        } else {
          other_payment_total += amt;
        }
      }
    }

    // Total sales matches sum of collections or sum of paid bookings
    const calculatedPaymentSales = cash_total + upi_total + card_total + other_payment_total;
    const calculatedActivitySales = total_gokart_sales + air_rifle_sales + horse_riding_sales + car_simulator_sales + moto_simulation_sales;
    const total_sales = calculatedPaymentSales > 0 ? calculatedPaymentSales : calculatedActivitySales;

    // Check existing local summary record for sync status
    const existing = await db.dailySalesSummaries.get(summaryId);

    const summary: DailySalesSummary = {
      id: summaryId,
      business_date,
      computer_id,
      total_tickets,
      single_kart_tickets,
      double_kart_tickets,
      silver_package_tickets,
      golden_package_tickets,
      total_gokart_sales: Math.round(total_gokart_sales * 100) / 100,
      air_rifle_sales: Math.round(air_rifle_sales * 100) / 100,
      horse_riding_sales: Math.round(horse_riding_sales * 100) / 100,
      car_simulator_sales: Math.round(car_simulator_sales * 100) / 100,
      moto_simulation_sales: Math.round(moto_simulation_sales * 100) / 100,
      cash_total: Math.round(cash_total * 100) / 100,
      upi_total: Math.round(upi_total * 100) / 100,
      card_total: Math.round(card_total * 100) / 100,
      total_sales: Math.round(total_sales * 100) / 100,
      last_synced_at: existing?.last_synced_at || new Date().toISOString(),
      sync_status: existing?.sync_status || 'pending'
    };

    // Save to local Dexie
    await db.dailySalesSummaries.put(summary);

    return summary;
  }

  /**
   * Debounced trigger for recalculating and uploading the daily summary after local ticket transactions.
   */
  public triggerSummaryUpdate(targetDate?: string) {
    const businessDate = targetDate ? this.normalizeDate(targetDate) : this.getTodayBusinessDate();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Mark status as pending immediately
    this.broadcastStatus('pending');

    this.debounceTimer = setTimeout(() => {
      this.syncDailySummaryToSupabase(businessDate).catch(err => {
        console.warn('[SalesSummaryEngine] Debounced summary sync error:', err);
      });
    }, 3000);
  }

  /**
   * Synchronizes the daily sales summary for this computer and business_date to Supabase using an atomic upsert.
   */
  public async syncDailySummaryToSupabase(
    targetDate?: string
  ): Promise<{ success: boolean; summary?: DailySalesSummary; error?: string }> {
    const businessDate = targetDate ? this.normalizeDate(targetDate) : this.getTodayBusinessDate();
    const computerId = getComputerId();

    // 1. Recalculate local totals
    const summary = await this.calculateDailySummary(businessDate, computerId);

    // If offline, preserve pending status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await db.dailySalesSummaries.update(summary.id, { sync_status: 'pending' });
      this.broadcastStatus('pending');
      return { success: false, summary, error: 'Offline - pending synchronization' };
    }

    // If Supabase is not configured, preserve local data and mark idle
    if (!isSupabaseConfigured || !supabase) {
      await db.dailySalesSummaries.update(summary.id, { sync_status: 'synced' });
      this.broadcastStatus('idle');
      return { success: true, summary };
    }

    this.broadcastStatus('syncing');

    try {
      const nowIso = new Date().toISOString();
      const payload = {
        id: summary.id,
        business_date: summary.business_date,
        computer_id: summary.computer_id,
        total_tickets: summary.total_tickets,
        single_kart_tickets: summary.single_kart_tickets,
        double_kart_tickets: summary.double_kart_tickets,
        silver_package_tickets: summary.silver_package_tickets,
        golden_package_tickets: summary.golden_package_tickets,
        total_gokart_sales: summary.total_gokart_sales,
        air_rifle_sales: summary.air_rifle_sales,
        horse_riding_sales: summary.horse_riding_sales,
        car_simulator_sales: summary.car_simulator_sales,
        moto_simulation_sales: summary.moto_simulation_sales,
        cash_total: summary.cash_total,
        upi_total: summary.upi_total,
        card_total: summary.card_total,
        total_sales: summary.total_sales,
        last_synced_at: nowIso
      };

      // Atomic upsert on composite unique key: business_date + computer_id
      const { error } = await supabase
        .from('daily_sales_summary')
        .upsert(payload, { onConflict: 'business_date,computer_id' });

      if (error) {
        console.error('[SalesSummaryEngine] Supabase upsert failed:', error.message);
        await db.dailySalesSummaries.update(summary.id, {
          sync_status: 'failed',
          error_message: error.message
        });
        this.broadcastStatus('error');
        return { success: false, summary, error: error.message };
      }

      // Mark local record as synced
      summary.sync_status = 'synced';
      summary.last_synced_at = nowIso;
      await db.dailySalesSummaries.put(summary);

      this.lastSyncedAt = nowIso;
      try {
        localStorage.setItem('deuce_last_summary_sync', nowIso);
      } catch (e) {}

      console.log(`[SalesSummaryEngine] Successfully synchronized summary for ${businessDate} (${computerId})`);
      this.broadcastStatus('synced');
      return { success: true, summary };
    } catch (err: any) {
      console.error('[SalesSummaryEngine] Unexpected sync exception:', err);
      await db.dailySalesSummaries.update(summary.id, {
        sync_status: 'failed',
        error_message: err?.message || String(err)
      });
      this.broadcastStatus('error');
      return { success: false, summary, error: err?.message || String(err) };
    }
  }

  /**
   * Flushes all pending or failed summaries across any business dates.
   */
  public async syncAllPendingSummaries(): Promise<number> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
    if (!isSupabaseConfigured || !supabase) return 0;

    try {
      const pendingSummaries = await db.dailySalesSummaries
        .where('sync_status')
        .anyOf(['pending', 'failed'])
        .toArray();

      let syncedCount = 0;
      for (const item of pendingSummaries) {
        const res = await this.syncDailySummaryToSupabase(item.business_date);
        if (res.success) syncedCount++;
      }

      // Always also ensure today is recalculated & synced
      await this.syncDailySummaryToSupabase();

      return syncedCount;
    } catch (e) {
      console.warn('[SalesSummaryEngine] Error syncing pending summaries:', e);
      return 0;
    }
  }

  private async checkAndAutoSync() {
    try {
      const pendingCount = await db.dailySalesSummaries
        .where('sync_status')
        .anyOf(['pending', 'failed'])
        .count();

      if (pendingCount > 0) {
        await this.syncAllPendingSummaries();
      }
    } catch (e) {}
  }

  /**
   * Fetches consolidated daily sales summaries from Supabase for a date range.
   * Minimal egress: only selects from daily_sales_summary between startDate and endDate.
   * Also merges current computer's live local summary for today so data is instant.
   */
  public async fetchConsolidatedSummaries(
    startDate: string,
    endDate: string,
    computerIdFilter?: string
  ): Promise<DailySalesSummary[]> {
    let cloudSummaries: DailySalesSummary[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('daily_sales_summary')
          .select('*')
          .gte('business_date', startDate)
          .lte('business_date', endDate);

        if (computerIdFilter && computerIdFilter !== 'all') {
          query = query.eq('computer_id', computerIdFilter);
        }

        const { data, error } = await query.order('business_date', { ascending: false });
        if (!error && data) {
          cloudSummaries = data as DailySalesSummary[];
        }
      } catch (err) {
        console.warn('[SalesSummaryEngine] Error fetching summaries from Supabase:', err);
      }
    }

    // Local fallback/supplement: check local summaries from IndexedDB
    const localSummaries = await db.dailySalesSummaries.toArray();
    const today = this.getTodayBusinessDate();
    const currentComputerId = getComputerId();

    // Map by unique key (business_date + computer_id)
    const combinedMap = new Map<string, DailySalesSummary>();

    // 1. Put cloud records
    for (const s of cloudSummaries) {
      const key = `${s.business_date}_${s.computer_id}`;
      combinedMap.set(key, s);
    }

    // 2. Put local records (overlay today's live record for current computer)
    for (const ls of localSummaries) {
      if (ls.business_date >= startDate && ls.business_date <= endDate) {
        if (!computerIdFilter || computerIdFilter === 'all' || ls.computer_id === computerIdFilter) {
          const key = `${ls.business_date}_${ls.computer_id}`;
          // If this is our computer and today, our live local record has the freshest data
          if (ls.computer_id === currentComputerId && ls.business_date === today) {
            combinedMap.set(key, ls);
          } else if (!combinedMap.has(key)) {
            combinedMap.set(key, ls);
          }
        }
      }
    }

    // Sort descending by business_date
    return Array.from(combinedMap.values()).sort((a, b) => {
      return b.business_date.localeCompare(a.business_date);
    });
  }

  /**
   * Status change listener subscription.
   */
  public subscribe(
    listener: (status: SummarySyncStatus, pendingCount: number, lastSyncTime: string) => void
  ) {
    this.listeners.push(listener);
    this.broadcastStatus(this.syncStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private async broadcastStatus(status: SummarySyncStatus) {
    this.syncStatus = status;
    let pendingCount = 0;
    try {
      pendingCount = await db.dailySalesSummaries
        .where('sync_status')
        .anyOf(['pending', 'failed'])
        .count();
    } catch (e) {}

    this.listeners.forEach(l => l(status, pendingCount, this.lastSyncedAt));
  }
}

export const salesSummaryEngine = new SalesSummaryEngine();
