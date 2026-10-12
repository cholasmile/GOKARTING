/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, UserRole, Activity, FoodVendor, MenuItem, 
  InventoryItem, Booking, Ticket, FoodOrder, Payment, 
  NotificationLog, OrderStatus, FoodOrderItem, ActivityPackage,
  Kart, GoKartingSession, LapRecord, GoKartingWaiver, KartStatus, SessionStatus,
  ActivityPhoto, ActivityOffer, FoodStreetPurchaseRecord, StockMovement, MenuItemRecipe, StockMovementType
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db } from '../db/db';
import { syncEngine, SyncStatus } from '../lib/syncEngine';
import { generateOfflineId } from '../lib/deviceSetup';
import { INITIAL_USERS, INITIAL_ACTIVITIES } from '../data/initialData';

interface AppContextProps {
  // Authentication & Role
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  selectedVendorId: string;
  setSelectedVendorId: (id: string) => void;

  // Domain Data
  users: User[];
  activities: Activity[];
  vendors: FoodVendor[];
  menuItems: MenuItem[];
  inventory: InventoryItem[];
  bookings: Booking[];
  tickets: Ticket[];
  orders: FoodOrder[];
  notifications: NotificationLog[];
  payments: Payment[];
  timeSlots: string[];

  // Food Street Purchases & Stock Tracking State
  foodStreetPurchases: FoodStreetPurchaseRecord[];
  stockMovements: StockMovement[];
  menuItemRecipes: MenuItemRecipe[];

  // Go Karting Specific State
  karts: Kart[];
  sessions: GoKartingSession[];
  lapRecords: LapRecord[];
  waivers: GoKartingWaiver[];

  // Sync State
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  isRealtimeActive: boolean;
  lastSyncTime?: string;
  retrySync: () => Promise<{ success: boolean; syncedCount: number }>;

  // Mutators - Activities
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (activity: Activity) => Promise<Activity>;
  deleteActivity: (id: string) => void;
  refetchActivitiesFromDatabase: () => Promise<Activity[]>;

  // Mutators - Activity Management Enhancement (photos + offers)
  addActivityPhoto: (activityId: string, photo: Omit<ActivityPhoto, 'id' | 'uploadedAt' | 'order'>) => void;
  removeActivityPhoto: (activityId: string, photoId: string) => void;
  reorderActivityPhotos: (activityId: string, reorderedPhotos: ActivityPhoto[]) => void;
  setCoverPhoto: (activityId: string, photoId: string) => void;
  updateActivityExtended: (activityId: string, fields: Partial<Pick<Activity, 'shortDescription' | 'detailedDescription' | 'duration' | 'ageRequirement' | 'rules' | 'isActive' | 'displayOrder'>>) => void;
  addActivityOffer: (activityId: string, offer: Omit<ActivityOffer, 'id' | 'createdAt'>) => void;
  updateActivityOffer: (activityId: string, offer: ActivityOffer) => void;
  deleteActivityOffer: (activityId: string, offerId: string) => void;
  setOfferActive: (activityId: string, offerId: string, active: boolean) => void;

  // Mutators - Users
  updateUserRole: (userId: string, role: UserRole) => void;
  addUser: (user: Omit<User, 'id'> | User) => void;
  updateUser: (user: User) => void;

  // Mutators - Bookings & Tickets
  createBooking: (bookingData: {
    customerName: string;
    customerEmail: string; customerPhone?: string;
    activityId: string;
    activityName: string;
    date: string;
    timeSlot: string;
    ticketType: 'standard' | 'package' | string;
    details: string;
    quantity: number;
    totalAmount: number;
    discountType?: 'none' | 'individual_5' | 'group_10' | 'group_15' | 'bulk_30' | 'custom' | 'cash' | string;
    discountPercentage?: number;
    discountAmount?: number;
    originalAmount?: number;
    paymentMethod: 'upi' | 'card' | 'net_banking' | 'cash' | 'razorpay' | 'complimentary';
    paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    status?: 'confirmed' | 'reserved';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    gateway?: string;
    packageId?: string;
  }) => { booking: Booking; ticket?: Ticket; payment: Payment } | string;

  markBookingAsPaid: (bookingId: string, staffName: string) => { success: boolean; message: string; ticket?: Ticket };

  markPaymentConfirmed: (params: {
    bookingId: string;
    method: 'upi' | 'card' | 'cash' | 'razorpay';
    staffId?: string;
    referenceNumber?: string;
    amountReceived?: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    gateway?: string;
    posTransactionId?: string;
    terminalId?: string;
    failureReason?: string;
    paymentStatus?: 'paid' | 'failed' | 'cancelled' | 'refunded';
  }) => { success: boolean; message: string; ticket?: Ticket };

  cancelAndRefundTicket: (params: {
    ticketId?: string;
    bookingId: string;
    reason: string;
    refundAmount: number;
    refundMethod: 'cash' | 'upi' | 'card' | 'original';
    staffName?: string;
  }) => { success: boolean; message: string; refundReceipt?: any };

  // Payment settings & gateway details
  counterUpiId: string;
  setCounterUpiId: (id: string) => void;
  razorpayKeyId: string;
  posProvider: string;
  posTerminalName: string;
  posTerminalId: string;
  enabledMethods: string;
  setPosConfig: (config: {
    posProvider?: string;
    posTerminalName?: string;
    posTerminalId?: string;
    enabledMethods?: string;
    razorpayKeyId?: string;
  }) => void;

  scanTicket: (qrValue: string, staffName: string) => { success: boolean; message: string; ticket?: Ticket; isPendingPayment?: boolean; bookingId?: string };

  // Mutators - Vendors
  addVendor: (vendor: Omit<FoodVendor, 'id'>) => void;
  updateVendor: (vendor: FoodVendor) => void;
  deleteVendor: (id: string) => void;

  // Mutators - Menu Items & Stock
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  addBulkMenuItems: (items: Array<Omit<MenuItem, 'id'>>) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;
  updateMenuItemStock: (itemId: string, newStock: number) => void;
  adjustMenuItemStock: (itemId: string, delta: number) => void;

  // Mutators - Inventory & Stock Control
  updateInventoryStock: (id: string, amount: number, mode: 'set' | 'adjust') => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (id: string) => void;
  recordStockMovement: (params: {
    itemId: string;
    vendorId: string;
    type: StockMovementType;
    quantity: number;
    referenceId?: string;
    reason?: string;
    recordedBy?: string;
  }) => StockMovement | null;
  addFoodStreetPurchase: (purchase: Omit<FoodStreetPurchaseRecord, 'id' | 'createdAt' | 'updatedAt' | 'postedToFinance'>) => FoodStreetPurchaseRecord;
  acceptPurchaseIntoStock: (purchaseId: string, quantityAccepted?: number) => { success: boolean; message: string };
  updateFoodStreetPurchase: (purchase: FoodStreetPurchaseRecord) => void;
  setMenuItemRecipe: (recipe: MenuItemRecipe) => void;

  // Mutators - Food Orders & Cart
  foodCart: FoodOrderItem[];
  addToFoodCart: (item: MenuItem, quantity: number) => void;
  removeFromFoodCart: (menuItemId: string) => void;
  clearFoodCart: () => void;
  submitFoodOrder: (
    customerNameOrData: string | { customerName: string; customerEmail: string; paymentMethod: 'upi' | 'card' | 'net_banking' | 'cash'; customerPhone?: string },
    customerEmail?: string,
    paymentMethod?: 'upi' | 'card' | 'net_banking' | 'cash',
    customerPhone?: string
  ) => FoodOrder;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Mutators - Go Karting
  updateKartStatus: (kartId: string, status: KartStatus, driverId?: string, sessionId?: string) => void;
  createGoKartingSession: (sessionData: Omit<GoKartingSession, 'id'>) => void;
  updateSessionStatus: (sessionId: string, status: SessionStatus) => void;
  recordLapTime: (lapData: Omit<LapRecord, 'id'>) => void;
  submitWaiver: (waiverData: Omit<GoKartingWaiver, 'id'>) => void;

  // Utility Actions
  sendMockNotification: (recipient: string, title: string, body: string, channel: 'email' | 'sms' | 'whatsapp') => void;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

import { WEEKEND_SLOTS } from '../lib/slotUtils';

const TIME_SLOTS = WEEKEND_SLOTS;

const localLoadHelper = <T,>(key: string, initial: T): T => {
  if (typeof window === 'undefined') return initial;
  const val = localStorage.getItem(key);
  if (val) {
    try {
      const parsed = JSON.parse(val);
      if (parsed === null || parsed === undefined) {
        return initial;
      }
      if (Array.isArray(initial) && !Array.isArray(parsed)) {
        return initial;
      }
      if (typeof initial === 'object' && typeof parsed !== 'object') {
        return initial;
      }
      return parsed as T;
    } catch {
      return initial;
    }
  }
  return initial;
};

// Helper for fire-and-forget Supabase writes
const writeToSupabase = (promise: Promise<any>, description: string) => {
  promise.catch(err => {
    console.error(`Supabase write failed for ${description}:`, err);
  });
};

const writeToLocalAndSync = (table: string, action: 'insert' | 'update' | 'delete', payload: any) => {
  syncEngine.queueOperation(table, action, payload).catch(err => {
    console.error('Failed to queue operation for sync:', err);
  });
};

/**
 * Robust Entity Merger with Offline Edit Protection
 * Allows online authoritative updates from server while protecting local offline modifications that haven't synced yet.
 */
export const mergeEntitiesWithProtection = <T extends { id: string; updatedAt?: string }>(
  localList: T[],
  incomingList: T[]
): T[] => {
  if (!Array.isArray(incomingList) || incomingList.length === 0) return localList || [];
  if (!Array.isArray(localList) || localList.length === 0) return incomingList || [];

  const map = new Map<string, T>();

  // 1. First add all local items
  localList.forEach(localItem => {
    if (localItem && localItem.id) {
      map.set(localItem.id, localItem);
    }
  });

  // 2. Merge incoming authoritative items from online server
  incomingList.forEach(incomingItem => {
    if (!incomingItem || !incomingItem.id) return;

    if (!map.has(incomingItem.id)) {
      // New record from server
      map.set(incomingItem.id, incomingItem);
    } else {
      const localItem = map.get(incomingItem.id)!;
      const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
      const incomingTime = incomingItem.updatedAt ? new Date(incomingItem.updatedAt).getTime() : 0;

      // If local item has a strictly newer timestamp (unpushed offline edit), preserve local.
      // Otherwise, the incoming authoritative server data updates the local record!
      if (localTime > incomingTime && localTime > 0) {
        map.set(incomingItem.id, { ...incomingItem, ...localItem });
      } else {
        map.set(incomingItem.id, { ...localItem, ...incomingItem });
      }
    }
  });

  return Array.from(map.values());
};

const synthesizePayments = (currentPayments: Payment[], currentBookings: Booking[], currentOrders: FoodOrder[]): Payment[] => {
  const paymentMap = new Map<string, Payment>();

  currentPayments.forEach(p => {
    const key = p.bookingId ? `b_${p.bookingId}` : p.orderId ? `o_${p.orderId}` : p.id;
    let enriched = { ...p };
    if (!enriched.counterId) {
      enriched.counterId = 'counter_1';
    }
    if (enriched.bookingId) {
      const b = currentBookings.find(bk => bk.id === enriched.bookingId);
      if (b) {
        if (!enriched.customerName || enriched.customerName === 'Guest') enriched.customerName = b.customerName;
        if (!enriched.customerPhone) enriched.customerPhone = b.customerPhone;
        if (!enriched.activityName) enriched.activityName = b.activityName;
      }
    } else if (enriched.orderId) {
      const o = currentOrders.find(ord => ord.id === enriched.orderId);
      if (o) {
        if (!enriched.customerName || enriched.customerName === 'Guest') enriched.customerName = o.customerName;
        if (!enriched.customerPhone && o.customerPhone) enriched.customerPhone = o.customerPhone;
        if (!enriched.activityName) enriched.activityName = 'Food Street Dining';
      }
    }
    paymentMap.set(key, enriched);
  });

  currentBookings.forEach(b => {
    const key = `b_${b.id}`;
    if (!paymentMap.has(key)) {
      const isPaid = b.paymentStatus === 'paid';
      const isPending = b.paymentStatus === 'pending' || (b.paymentStatus as string) === 'processing';
      const isRefunded = b.paymentStatus === 'refunded';
      const isFailed = b.paymentStatus === 'failed';
      const isCancelled = b.paymentStatus === 'cancelled';

      const methodVal = (b.discountType === 'cash' ? 'cash' : 'upi') as any;
      const statusVal = isPaid ? 'paid' : isPending ? 'pending' : isRefunded ? 'refunded' : isFailed ? 'failed' : isCancelled ? 'cancelled' : 'paid';

      const synth: Payment = {
        id: `pay-${b.id}`,
        bookingId: b.id,
        amount: b.totalAmount,
        method: methodVal,
        status: statusVal,
        transactionId: `TX-${b.id}`,
        timestamp: b.bookingDate || new Date().toISOString(),
        invoice_id: `INV-B-${b.id}`,
        customer_id: b.customerEmail,
        currency: 'INR',
        payment_method: String(methodVal).toUpperCase(),
        payment_status: String(statusVal).toUpperCase(),
        ticketId: `tkt-${b.id}`,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        activityName: b.activityName,
        counterId: 'counter_1'
      };
      paymentMap.set(key, synth);
    }
  });

  currentOrders.forEach(o => {
    const key = `o_${o.id}`;
    if (!paymentMap.has(key)) {
      const synth: Payment = {
        id: `pay-${o.id}`,
        orderId: o.id,
        amount: o.totalAmount,
        method: (o.paymentMethod || 'cash') as any,
        status: 'success',
        transactionId: `TX-${o.id}`,
        timestamp: o.createdAt || new Date().toISOString(),
        invoice_id: o.invoiceNumber || `INV-O-${o.id}`,
        customer_id: o.customerEmail,
        currency: 'INR',
        payment_method: (o.paymentMethod || 'cash').toUpperCase(),
        payment_status: 'PAID',
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        activityName: 'Food Street Dining',
        counterId: 'counter_1'
      };
      paymentMap.set(key, synth);
    }
  });

  return Array.from(paymentMap.values());
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserRaw] = useState<User | null>(() => {
    return localLoadHelper<User | null>('ap_current_user', null);
  });

  const setCurrentUser = (user: User | null) => {
    setCurrentUserRaw(user);
    if (user) {
      try {
        localStorage.setItem('ap_current_user', JSON.stringify(user));
      } catch (err) {
        console.warn('[frontend] Failed to save user session:', err);
      }
      refetchActivitiesFromDatabase();
    } else {
      localStorage.removeItem('ap_current_user');
    }
  };

  // Sync Status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => syncEngine.getLastSyncTime());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[AppContext] Online event: flushing queue and pulling unified sync');
      syncEngine.triggerSync();
      pullUnifiedSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const unsubscribe = syncEngine.subscribe((status, count, realtimeActive, lastTime) => {
      setSyncStatus(status);
      setPendingSyncCount(count);
      setIsRealtimeActive(realtimeActive);
      if (lastTime) setLastSyncTime(lastTime);
    });

    const unsubscribeSyncCompleted = syncEngine.onSyncCompleted((syncedCount) => {
      console.log(`[AppContext] Sync completed notification received (${syncedCount} records). Refreshing UI state...`);
      pullUnifiedSync();
    });

    const unsubscribeChanges = syncEngine.subscribeToChanges((event) => {
      const { table, eventType, record } = event;
      if (!record || !record.id) return;

      if (table === 'activities') {
        setActivities(prev => {
          if (eventType === 'DELETE') return prev.filter(a => a.id !== record.id);
          const exists = prev.some(a => a.id === record.id);
          return exists ? prev.map(a => a.id === record.id ? record : a) : [record, ...prev];
        });
      } else if (table === 'bookings') {
        setBookings(prev => {
          if (eventType === 'DELETE') return prev.filter(b => b.id !== record.id);
          const exists = prev.some(b => b.id === record.id);
          return exists ? prev.map(b => b.id === record.id ? record : b) : [record, ...prev];
        });
      } else if (table === 'tickets') {
        setTickets(prev => {
          if (eventType === 'DELETE') return prev.filter(t => t.id !== record.id);
          const exists = prev.some(t => t.id === record.id);
          return exists ? prev.map(t => t.id === record.id ? record : t) : [record, ...prev];
        });
      } else if (table === 'food_orders' || table === 'orders') {
        setOrders(prev => {
          if (eventType === 'DELETE') return prev.filter(o => o.id !== record.id);
          const exists = prev.some(o => o.id === record.id);
          return exists ? prev.map(o => o.id === record.id ? record : o) : [record, ...prev];
        });
      } else if (table === 'payments') {
        setPayments(prev => {
          if (eventType === 'DELETE') return prev.filter(p => p.id !== record.id);
          const exists = prev.some(p => p.id === record.id);
          return exists ? prev.map(p => p.id === record.id ? record : p) : [record, ...prev];
        });
      } else if (table === 'users') {
        setUsers(prev => {
          if (eventType === 'DELETE') return prev.filter(u => u.id !== record.id);
          const exists = prev.some(u => u.id === record.id);
          return exists ? prev.map(u => u.id === record.id ? record : u) : [record, ...prev];
        });
      } else if (table === 'karts') {
        setKarts(prev => {
          if (eventType === 'DELETE') return prev.filter(k => k.id !== record.id);
          const exists = prev.some(k => k.id === record.id);
          return exists ? prev.map(k => k.id === record.id ? record : k) : [record, ...prev];
        });
      } else if (table === 'sessions') {
        setSessions(prev => {
          if (eventType === 'DELETE') return prev.filter(s => s.id !== record.id);
          const exists = prev.some(s => s.id === record.id);
          return exists ? prev.map(s => s.id === record.id ? record : s) : [record, ...prev];
        });
      } else if (table === 'lap_records' || table === 'lapRecords') {
        setLapRecords(prev => {
          if (eventType === 'DELETE') return prev.filter(l => l.id !== record.id);
          const exists = prev.some(l => l.id === record.id);
          return exists ? prev.map(l => l.id === record.id ? record : l) : [record, ...prev];
        });
      } else if (table === 'waivers') {
        setWaivers(prev => {
          if (eventType === 'DELETE') return prev.filter(w => w.id !== record.id);
          const exists = prev.some(w => w.id === record.id);
          return exists ? prev.map(w => w.id === record.id ? record : w) : [record, ...prev];
        });
      } else if (table === 'menu_items' || table === 'menuItems') {
        setMenuItems(prev => {
          if (eventType === 'DELETE') return prev.filter(m => m.id !== record.id);
          const exists = prev.some(m => m.id === record.id);
          return exists ? prev.map(m => m.id === record.id ? record : m) : [record, ...prev];
        });
      } else if (table === 'inventory') {
        setInventory(prev => {
          if (eventType === 'DELETE') return prev.filter(i => i.id !== record.id);
          const exists = prev.some(i => i.id === record.id);
          return exists ? prev.map(i => i.id === record.id ? record : i) : [record, ...prev];
        });
      } else if (table === 'food_vendors' || table === 'vendors') {
        setVendors(prev => {
          if (eventType === 'DELETE') return prev.filter(v => v.id !== record.id);
          const exists = prev.some(v => v.id === record.id);
          return exists ? prev.map(v => v.id === record.id ? record : v) : [record, ...prev];
        });
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      unsubscribeChanges();
      unsubscribeSyncCompleted();
    };
  }, []);

  const [selectedVendorId, setSelectedVendorId] = useState<string>(() => {
    const saved = localStorage.getItem('ap_selected_vendor_id');
    return saved || 'vendor-forest-cafe';
  });

  // ── Core Domain Data ──────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>(() => {
    const cached = localStorage.getItem('ap_users');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(u => u.id !== 'usr-gam' && (u.role as string) !== 'gaming_staff' && !u.email?.toLowerCase().includes('gaming'));
          if (filtered.length > 0) return filtered;
        }
      } catch {}
    }
    return INITIAL_USERS;
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const cached = localStorage.getItem('ap_activities');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(a => a.id !== 'act-gaming-pc' && !a.id?.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming'));
          if (filtered.length > 0) return filtered;
        }
      } catch {}
    }
    return INITIAL_ACTIVITIES;
  });
  const [vendors, setVendors] = useState<FoodVendor[]>(() => {
    const cached = localStorage.getItem('ap_vendors');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  });
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const cached = localStorage.getItem('ap_menu_items');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const cached = localStorage.getItem('ap_inventory');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  });

  // Bookings, tickets, orders — always load from localStorage cache
  // (populated by sync), never from demo data
  const isDummyRecord = (item: any) => {
    if (!item || typeof item !== 'object') return false;
    const email = (item.customerEmail || item.customer_id || '').toLowerCase();
    const id = (item.id || '').toString();
    return /^bk-dummy-[1-9]$/.test(id) || 
           /^ord-dummy-[1-9]$/.test(id) || 
           /^pay-dummy-[1-9]$/.test(id) || 
           /^tkt-dummy-[1-9]$/.test(id) ||
           email === 'bruce@gotham.com' ||
           email === 'diana@themyscira.gov' ||
           email === 'peter@dailybugle.com' ||
           email === 'barry@ccpd.gov' ||
           email === 'shelby@example.com';
  };

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const cached = localStorage.getItem('ap_bookings');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.filter((b: any) => !isDummyRecord(b));
      } catch {}
    }
    return [];
  });
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const cached = localStorage.getItem('ap_tickets');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.filter((t: any) => !isDummyRecord(t));
      } catch {}
    }
    return [];
  });
  const [orders, setOrders] = useState<FoodOrder[]>(() => {
    const cached = localStorage.getItem('ap_orders');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.filter((o: any) => !isDummyRecord(o));
      } catch {}
    }
    return [];
  });
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    const cached = localStorage.getItem('ap_notifications');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    const cachedPayments = localStorage.getItem('ap_payments');
    const cachedBookings = localStorage.getItem('ap_bookings');
    const cachedOrders = localStorage.getItem('ap_orders');
    let loadedPayments: Payment[] = [];
    let realBookings: Booking[] = [];
    let realOrders: FoodOrder[] = [];
    try {
      if (cachedPayments) { const p = JSON.parse(cachedPayments); if (Array.isArray(p)) loadedPayments = p.filter((x: any) => !isDummyRecord(x)); }
      if (cachedBookings) { const b = JSON.parse(cachedBookings); if (Array.isArray(b)) realBookings = b.filter((x: any) => !isDummyRecord(x)); }
      if (cachedOrders) { const o = JSON.parse(cachedOrders); if (Array.isArray(o)) realOrders = o.filter((x: any) => !isDummyRecord(x)); }
    } catch {}
    return synthesizePayments(loadedPayments, realBookings, realOrders);
  });

  // Auto-sync payments whenever bookings or orders are modified
  useEffect(() => {
    setPayments(prev => {
      const synthesized = synthesizePayments(prev, bookings, orders);
      if (synthesized.length !== prev.length) {
        try {
          localStorage.setItem('ap_payments', JSON.stringify(synthesized));
        } catch (e) {}
        return synthesized;
      }
      return prev;
    });
  }, [bookings, orders]);

  // ── Food Street Purchases & Stock Tracking State ──
  const [foodStreetPurchases, setFoodStreetPurchases] = useState<FoodStreetPurchaseRecord[]>(() => {
    const cached = localStorage.getItem('ap_food_purchases');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const cached = localStorage.getItem('ap_stock_movements');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const [menuItemRecipes, setMenuItemRecipes] = useState<MenuItemRecipe[]>(() => {
    const cached = localStorage.getItem('ap_menu_recipes');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  // ── Go Karting State (empty — loaded from Supabase or localStorage cache) ──
  const [karts, setKarts] = useState<Kart[]>(() => {
    const cached = localStorage.getItem('ap_karts');
    if (cached) { try { const p = JSON.parse(cached); if (Array.isArray(p)) return p; } catch {} }
    return [];
  });
  const [sessions, setSessions] = useState<GoKartingSession[]>(() => {
    const cached = localStorage.getItem('ap_sessions');
    if (cached) { try { const p = JSON.parse(cached); if (Array.isArray(p)) return p; } catch {} }
    return [];
  });
  const [lapRecords, setLapRecords] = useState<LapRecord[]>(() => {
    const cached = localStorage.getItem('ap_lapRecords');
    if (cached) { try { const p = JSON.parse(cached); if (Array.isArray(p)) return p; } catch {} }
    return [];
  });
  const [waivers, setWaivers] = useState<GoKartingWaiver[]>(() => {
    const cached = localStorage.getItem('ap_waivers');
    if (cached) { try { const p = JSON.parse(cached); if (Array.isArray(p)) return p; } catch {} }
    return [];
  });

  const [foodCart, setFoodCart] = useState<FoodOrderItem[]>([]);

  // Counter UPI ID — settable by admin, persisted in localStorage
  const [counterUpiId, setCounterUpiIdState] = useState<string>(() =>
    localStorage.getItem('ap_counter_upi_id') || ''
  );
  const setCounterUpiId = (id: string) => {
    setCounterUpiIdState(id);
    localStorage.setItem('ap_counter_upi_id', id);
  };

  const [razorpayKeyId, setRazorpayKeyId] = useState<string>(() => {
    return (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_live_TYnsYBkCUZzRR3';
  });
  const [posProvider, setPosProviderState] = useState<string>('mock_pos');
  const [posTerminalName, setPosTerminalNameState] = useState<string>('Deuce POS Terminal 1');
  const [posTerminalId, setPosTerminalIdState] = useState<string>('POS-TERM-001');
  const [enabledMethods, setEnabledMethodsState] = useState<string>('CASH,UPI,QR_CODE,CARD');

  const setPosConfig = (configData: {
    posProvider?: string;
    posTerminalName?: string;
    posTerminalId?: string;
    enabledMethods?: string;
    razorpayKeyId?: string;
  }) => {
    if (configData.posProvider !== undefined) setPosProviderState(configData.posProvider);
    if (configData.posTerminalName !== undefined) setPosTerminalNameState(configData.posTerminalName);
    if (configData.posTerminalId !== undefined) setPosTerminalIdState(configData.posTerminalId);
    if (configData.enabledMethods !== undefined) setEnabledMethodsState(configData.enabledMethods);
    if (configData.razorpayKeyId !== undefined) setRazorpayKeyId(configData.razorpayKeyId);
  };

  useEffect(() => {
    fetch('/api/config/payment')
      .then(res => res.json())
      .then(data => {
        if (data.counterUpiId) setCounterUpiIdState(data.counterUpiId);
        if (data.razorpayKeyId) setRazorpayKeyId(data.razorpayKeyId);
        if (data.posProvider) setPosProviderState(data.posProvider);
        if (data.posTerminalName) setPosTerminalNameState(data.posTerminalName);
        if (data.posTerminalId) setPosTerminalIdState(data.posTerminalId);
        if (data.enabledMethods) setEnabledMethodsState(data.enabledMethods);
      })
      .catch(err => console.error('[frontend] Failed to fetch payment config:', err));
  }, []);

  // -----------------------------------------------------------------
  // REFETCH ACTIVITIES FROM DATABASE (SINGLE SOURCE OF TRUTH)
  // -----------------------------------------------------------------
  // -----------------------------------------------------------------
  // REFETCH ACTIVITIES FROM DATABASE (SINGLE SOURCE OF TRUTH WITH PROTECTION)
  // -----------------------------------------------------------------
  const refetchActivitiesFromDatabase = async (): Promise<Activity[]> => {
    let freshList: Activity[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbActivities, error } = await supabase.from('activities').select('*');
        if (!error && dbActivities && dbActivities.length > 0) {
          const cleanActs = (dbActivities as Activity[]).filter(a => a.id !== 'act-gaming-pc' && !a.id?.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming'));
          setActivities(prev => {
            const merged = mergeEntitiesWithProtection(prev, cleanActs);
            try {
              localStorage.setItem('ap_activities', JSON.stringify(merged));
            } catch (err) {}
            db.activities.bulkPut(merged);
            freshList = merged;
            return merged;
          });
          return freshList;
        }
      } catch (err) {
        console.error('[frontend] Error refetching activities from Supabase:', err);
      }
    }

    try {
      const res = await fetch('/api/activities');
      const serverActivities = await res.json();
      if (Array.isArray(serverActivities) && serverActivities.length > 0) {
        const cleanActs = serverActivities.filter((sa: Activity) => sa.id !== 'act-gaming-pc' && !sa.id?.toLowerCase().includes('gaming') && !(sa.type as string)?.toLowerCase().includes('gaming') && !sa.name?.toLowerCase().includes('gaming'));
        setActivities(prev => {
          const merged = mergeEntitiesWithProtection(prev, cleanActs);
          try {
            localStorage.setItem('ap_activities', JSON.stringify(merged));
          } catch (err) {}
          freshList = merged;
          return merged;
        });
        return freshList;
      }
    } catch (err) {
      console.warn('[frontend] Backend activities sync not available:', err);
    }

    return freshList;
  };

  // -----------------------------------------------------------------
  // SUPABASE INITIAL LOAD & AUTOMATIC SYNC (PROTECTED AGAINST DUMMY OVERWRITES)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const loadDataFromSupabase = async () => {
      try {
        const [
          { data: dbActivities },
          { data: dbVendors },
          { data: dbMenuItems },
          { data: dbInventory },
          { data: dbBookings },
          { data: dbTickets },
          { data: dbOrders },
          { data: dbNotifications },
          { data: dbPayments },
          { data: dbUsers }
        ] = await Promise.all([
          supabase.from('activities').select('*'),
          supabase.from('food_vendors').select('*'),
          supabase.from('menu_items').select('*'),
          supabase.from('inventory').select('*'),
          supabase.from('bookings').select('*'),
          supabase.from('tickets').select('*'),
          supabase.from('food_orders').select('*'),
          supabase.from('notifications').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('users').select('*')
        ]);

        if (dbActivities && dbActivities.length > 0) {
          const cleanActivities = (dbActivities as Activity[]).filter(a => a.id !== 'act-gaming-pc' && !a.id?.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming'));
          setActivities(prev => {
            const merged = mergeEntitiesWithProtection(prev, cleanActivities);
            try { localStorage.setItem('ap_activities', JSON.stringify(merged)); } catch {}
            db.activities.bulkPut(merged);
            return merged;
          });
        }
        if (dbVendors && dbVendors.length > 0) {
          setVendors(prev => {
            const merged = mergeEntitiesWithProtection(prev, dbVendors);
            try { localStorage.setItem('ap_vendors', JSON.stringify(merged)); } catch {}
            db.vendors.bulkPut(merged);
            return merged;
          });
        }
        if (dbMenuItems && dbMenuItems.length > 0) {
          setMenuItems(prev => {
            const merged = mergeEntitiesWithProtection(prev, dbMenuItems);
            try { localStorage.setItem('ap_menu_items', JSON.stringify(merged)); } catch {}
            db.menuItems.bulkPut(merged);
            return merged;
          });
        }
        if (dbInventory && dbInventory.length > 0) {
          setInventory(prev => {
            const merged = mergeEntitiesWithProtection(prev, dbInventory);
            try { localStorage.setItem('ap_inventory', JSON.stringify(merged)); } catch {}
            db.inventory.bulkPut(merged);
            return merged;
          });
        }
        if (dbBookings && dbBookings.length > 0) {
          setBookings(prev => {
            const merged = mergeEntitiesWithProtection(prev, dbBookings);
            try { localStorage.setItem('ap_bookings', JSON.stringify(merged)); } catch {}
            db.bookings.bulkPut(merged);
            return merged;
          });
        }
        if (dbTickets && dbTickets.length > 0) {
          setTickets(prev => {
            const merged = mergeEntitiesWithProtection(prev, dbTickets);
            try { localStorage.setItem('ap_tickets', JSON.stringify(merged)); } catch {}
            db.tickets.bulkPut(merged);
            return merged;
          });
        }
        if (dbOrders && dbOrders.length > 0) {
          setOrders(prev => {
            const merged = mergeEntitiesWithProtection(prev, dbOrders);
            try { localStorage.setItem('ap_orders', JSON.stringify(merged)); } catch {}
            db.orders.bulkPut(merged);
            return merged;
          });
        }
        if (dbNotifications && dbNotifications.length > 0) {
          setNotifications(dbNotifications);
          db.notifications.bulkPut(dbNotifications);
        }
        if (dbPayments && dbPayments.length > 0) {
          setPayments(prev => {
            const merged = mergeEntitiesWithProtection(prev, dbPayments);
            try { localStorage.setItem('ap_payments', JSON.stringify(merged)); } catch {}
            db.payments.bulkPut(merged);
            return merged;
          });
        }
        if (dbUsers && dbUsers.length > 0) {
          const freshUsers = (dbUsers as User[]).filter(u => u.id !== 'usr-gam' && (u.role as string) !== 'gaming_staff' && !u.email?.toLowerCase().includes('gaming'));
          setUsers(prev => {
            const merged = mergeEntitiesWithProtection(prev, freshUsers);
            try { localStorage.setItem('ap_users', JSON.stringify(merged)); } catch {}
            db.users.bulkPut(merged);
            return merged;
          });
        }
      } catch (err) {
        console.error('Failed to load initial data from Supabase, preserving local storage data:', err);
      }
    };

    // Purge legacy gaming items from Supabase, local Dexie & localStorage immediately
    try {
      if (isSupabaseConfigured && supabase) {
        Promise.resolve(supabase.from('activities').delete().or('id.eq.act-gaming-pc,id.ilike.%gaming%,name.ilike.%gaming%,name.ilike.%arena%')).catch(() => {});
        Promise.resolve(supabase.from('users').delete().or('id.eq.usr-gam,role.eq.gaming_staff,email.ilike.%gaming%')).catch(() => {});
      }
      db.activities.delete('act-gaming-pc').catch(() => {});
      db.users.delete('usr-gam').catch(() => {});
      const storedAct = localStorage.getItem('ap_activities');
      if (storedAct) {
        const parsed = JSON.parse(storedAct);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(a => a.id !== 'act-gaming-pc' && !a.id?.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('arena'));
          localStorage.setItem('ap_activities', JSON.stringify(cleaned));
        }
      }
      const storedUsers = localStorage.getItem('ap_users');
      if (storedUsers) {
        const parsedU = JSON.parse(storedUsers);
        if (Array.isArray(parsedU)) {
          const cleanedU = parsedU.filter((u: any) => u.id !== 'usr-gam' && u.role !== 'gaming_staff' && !u.email?.toLowerCase().includes('gaming'));
          localStorage.setItem('ap_users', JSON.stringify(cleanedU));
        }
      }
    } catch (e) {}

    loadDataFromSupabase();
  }, []);

  // Fetch backend persisted domain stores on startup (only if Supabase is NOT configured)
  // Immediate startup sync to ensure fresh authoritative data from central database on load
  useEffect(() => {
    pullUnifiedSync();
  }, []);

  // Save states to local storage cache for offline operation
  useEffect(() => { 
    try { localStorage.setItem('ap_users', JSON.stringify(users)); } catch {}
  }, [users]);
  useEffect(() => { 
    try { localStorage.setItem('ap_activities', JSON.stringify(activities)); } catch {}
  }, [activities]);
  useEffect(() => { 
    try { localStorage.setItem('ap_vendors', JSON.stringify(vendors)); } catch {}
  }, [vendors]);
  useEffect(() => { 
    try { localStorage.setItem('ap_menu_items', JSON.stringify(menuItems)); } catch {}
  }, [menuItems]);
  useEffect(() => { 
    try { localStorage.setItem('ap_inventory', JSON.stringify(inventory)); } catch {}
  }, [inventory]);
  useEffect(() => { 
    try { localStorage.setItem('ap_bookings', JSON.stringify(bookings)); } catch {}
  }, [bookings]);
  useEffect(() => { 
    try { localStorage.setItem('ap_tickets', JSON.stringify(tickets)); } catch {}
  }, [tickets]);
  useEffect(() => { 
    try { localStorage.setItem('ap_orders', JSON.stringify(orders)); } catch {}
  }, [orders]);
  useEffect(() => { 
    try { localStorage.setItem('ap_notifications', JSON.stringify(notifications)); } catch {}
  }, [notifications]);
  useEffect(() => { 
    try { localStorage.setItem('ap_payments', JSON.stringify(payments)); } catch {}
  }, [payments]);
  useEffect(() => { try { localStorage.setItem('ap_karts', JSON.stringify(karts)); } catch {} }, [karts]);
  useEffect(() => { try { localStorage.setItem('ap_sessions', JSON.stringify(sessions)); } catch {} }, [sessions]);
  useEffect(() => { try { localStorage.setItem('ap_lapRecords', JSON.stringify(lapRecords)); } catch {} }, [lapRecords]);
  useEffect(() => { try { localStorage.setItem('ap_waivers', JSON.stringify(waivers)); } catch {} }, [waivers]);

  // -----------------------------------------------------------------
  // UNIFIED MULTI-TERMINAL & OFFLINE-TO-ONLINE DATA SYNCHRONIZATION
  // -----------------------------------------------------------------
  const pullUnifiedSync = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    // 1. If Supabase is configured, pull latest authoritative records from Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const [
          { data: sbBookings },
          { data: sbTickets },
          { data: sbPayments },
          { data: sbOrders },
          { data: sbUsers },
          { data: sbActivities },
          { data: sbMenuItems },
          { data: sbVendors },
          { data: sbInventory }
        ] = await Promise.all([
          supabase.from('bookings').select('*'),
          supabase.from('tickets').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('food_orders').select('*'),
          supabase.from('users').select('*'),
          supabase.from('activities').select('*'),
          supabase.from('menu_items').select('*'),
          supabase.from('food_vendors').select('*'),
          supabase.from('inventory').select('*')
        ]);

        if (Array.isArray(sbBookings) && sbBookings.length > 0) {
          setBookings(prev => {
            const merged = mergeEntitiesWithProtection(prev, sbBookings);
            try { localStorage.setItem('ap_bookings', JSON.stringify(merged)); } catch {}
            db.bookings.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(sbTickets) && sbTickets.length > 0) {
          setTickets(prev => {
            const merged = mergeEntitiesWithProtection(prev, sbTickets);
            try { localStorage.setItem('ap_tickets', JSON.stringify(merged)); } catch {}
            db.tickets.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(sbPayments) && sbPayments.length > 0) {
          setPayments(prev => {
            const merged = mergeEntitiesWithProtection(prev, sbPayments);
            try { localStorage.setItem('ap_payments', JSON.stringify(merged)); } catch {}
            db.payments.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(sbOrders) && sbOrders.length > 0) {
          setOrders(prev => {
            const merged = mergeEntitiesWithProtection(prev, sbOrders);
            try { localStorage.setItem('ap_orders', JSON.stringify(merged)); } catch {}
            db.orders.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(sbUsers) && sbUsers.length > 0) {
          const cleanUsers = sbUsers.filter((u: any) => u.id !== 'usr-gam' && u.role !== 'gaming_staff' && !u.email?.toLowerCase().includes('gaming'));
          setUsers(prev => {
            const merged = mergeEntitiesWithProtection(prev, cleanUsers);
            try { localStorage.setItem('ap_users', JSON.stringify(merged)); } catch {}
            db.users.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(sbActivities) && sbActivities.length > 0) {
          const cleanActs = sbActivities.filter((a: any) => a.id !== 'act-gaming-pc' && !a.id?.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming'));
          setActivities(prev => {
            const merged = mergeEntitiesWithProtection(prev, cleanActs);
            try { localStorage.setItem('ap_activities', JSON.stringify(merged)); } catch {}
            db.activities.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(sbMenuItems) && sbMenuItems.length > 0) {
          setMenuItems(prev => {
            const merged = mergeEntitiesWithProtection(prev, sbMenuItems);
            try { localStorage.setItem('ap_menu_items', JSON.stringify(merged)); } catch {}
            db.menuItems.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(sbVendors) && sbVendors.length > 0) {
          setVendors(prev => {
            const merged = mergeEntitiesWithProtection(prev, sbVendors);
            try { localStorage.setItem('ap_vendors', JSON.stringify(merged)); } catch {}
            db.vendors.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(sbInventory) && sbInventory.length > 0) {
          setInventory(prev => {
            const merged = mergeEntitiesWithProtection(prev, sbInventory);
            try { localStorage.setItem('ap_inventory', JSON.stringify(merged)); } catch {}
            db.inventory.bulkPut(merged);
            return merged;
          });
        }
      } catch (sbErr) {
        // Supabase sync exception - continue to backend API sync
      }
    }

    // 2. Also pull from /api/sync/all (multi-terminal local network or Express server)
    try {
      const res = await fetch('/api/sync/all');
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        if (Array.isArray(data.bookings) && data.bookings.length > 0) {
          setBookings(prev => {
            const merged = mergeEntitiesWithProtection<Booking>(prev, data.bookings as Booking[]);
            try { localStorage.setItem('ap_bookings', JSON.stringify(merged)); } catch {}
            db.bookings.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.tickets) && data.tickets.length > 0) {
          setTickets(prev => {
            const merged = mergeEntitiesWithProtection<Ticket>(prev, data.tickets as Ticket[]);
            try { localStorage.setItem('ap_tickets', JSON.stringify(merged)); } catch {}
            db.tickets.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.payments) && data.payments.length > 0) {
          setPayments(prev => {
            const merged = mergeEntitiesWithProtection<Payment>(prev, data.payments as Payment[]);
            try { localStorage.setItem('ap_payments', JSON.stringify(merged)); } catch {}
            db.payments.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.orders) && data.orders.length > 0) {
          setOrders(prev => {
            const merged = mergeEntitiesWithProtection<FoodOrder>(prev, data.orders as FoodOrder[]);
            try { localStorage.setItem('ap_orders', JSON.stringify(merged)); } catch {}
            db.orders.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.users) && data.users.length > 0) {
          const cleanUsers = data.users.filter((u: any) => u.id !== 'usr-gam' && u.role !== 'gaming_staff' && !u.email?.toLowerCase().includes('gaming'));
          setUsers(prev => {
            const merged = mergeEntitiesWithProtection<User>(prev, cleanUsers as User[]);
            try { localStorage.setItem('ap_users', JSON.stringify(merged)); } catch {}
            db.users.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.activities) && data.activities.length > 0) {
          const cleanActs = data.activities.filter((a: any) => a.id !== 'act-gaming-pc' && !a.id?.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming'));
          setActivities(prev => {
            const merged = mergeEntitiesWithProtection<Activity>(prev, cleanActs as Activity[]);
            try { localStorage.setItem('ap_activities', JSON.stringify(merged)); } catch {}
            db.activities.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.menuItems) && data.menuItems.length > 0) {
          setMenuItems(prev => {
            const merged = mergeEntitiesWithProtection<MenuItem>(prev, data.menuItems as MenuItem[]);
            try { localStorage.setItem('ap_menu_items', JSON.stringify(merged)); } catch {}
            db.menuItems.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.vendors) && data.vendors.length > 0) {
          setVendors(prev => {
            const merged = mergeEntitiesWithProtection<FoodVendor>(prev, data.vendors as FoodVendor[]);
            try { localStorage.setItem('ap_vendors', JSON.stringify(merged)); } catch {}
            db.vendors.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.inventory) && data.inventory.length > 0) {
          setInventory(prev => {
            const merged = mergeEntitiesWithProtection<InventoryItem>(prev, data.inventory as InventoryItem[]);
            try { localStorage.setItem('ap_inventory', JSON.stringify(merged)); } catch {}
            db.inventory.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.karts) && data.karts.length > 0) {
          setKarts(prev => {
            const merged = mergeEntitiesWithProtection<Kart>(prev, data.karts as Kart[]);
            try { localStorage.setItem('ap_karts', JSON.stringify(merged)); } catch {}
            db.karts.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          setSessions(prev => {
            const merged = mergeEntitiesWithProtection<GoKartingSession>(prev, data.sessions as GoKartingSession[]);
            try { localStorage.setItem('ap_sessions', JSON.stringify(merged)); } catch {}
            db.sessions.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.waivers) && data.waivers.length > 0) {
          setWaivers(prev => {
            const merged = mergeEntitiesWithProtection<GoKartingWaiver>(prev, data.waivers as GoKartingWaiver[]);
            try { localStorage.setItem('ap_waivers', JSON.stringify(merged)); } catch {}
            db.waivers.bulkPut(merged);
            return merged;
          });
        }
        if (Array.isArray(data.lapRecords) && data.lapRecords.length > 0) {
          setLapRecords(prev => {
            const merged = mergeEntitiesWithProtection<LapRecord>(prev, data.lapRecords as LapRecord[]);
            try { localStorage.setItem('ap_lapRecords', JSON.stringify(merged)); } catch {}
            db.lapRecords.bulkPut(merged);
            return merged;
          });
        }
      }
    } catch (err) {
      // Network or local endpoint unavailable
    }
  };

  const retrySync = async () => {
    console.log('[AppContext] Manual sync requested by administrator');
    const res = await syncEngine.triggerSync();
    await pullUnifiedSync();
    return res;
  };

  // Periodic multi-terminal synchronization: pulls latest cloud/offline synced data with protection
  useEffect(() => {
    // Initial pull
    pullUnifiedSync();

    // Auto-sync polling every 3.5s for real-time multi-terminal sync
    const timerId = setInterval(pullUnifiedSync, 3500);

    const handleFocusSync = () => {
      pullUnifiedSync();
      syncEngine.triggerSync();
    };

    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('online', handleFocusSync);

    return () => {
      clearInterval(timerId);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('online', handleFocusSync);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ap_selected_vendor_id', selectedVendorId);
  }, [selectedVendorId]);

  // -----------------------------------------------------------------
  // GO KARTING ACTIONS
  // -----------------------------------------------------------------
  const updateKartStatus = (kartId: string, status: KartStatus, driverId?: string, sessionId?: string) => {
    const now = new Date().toISOString();
    setKarts(prev => {
      const updated = prev.map(k => k.id === kartId ? { ...k, status, currentDriverId: driverId, assignedSessionId: sessionId, updatedAt: now } : k);
      try {
        localStorage.setItem('ap_karts', JSON.stringify(updated));
        db.karts.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    const target = karts.find(k => k.id === kartId);
    if (target) {
      writeToLocalAndSync('karts', 'update', { ...target, status, currentDriverId: driverId, assignedSessionId: sessionId, updatedAt: now });
    }
  };

  const createGoKartingSession = (sessionData: Omit<GoKartingSession, 'id'>) => {
    const now = new Date().toISOString();
    const newSession: GoKartingSession = {
      ...sessionData,
      id: `sess-${Date.now()}`,
      updatedAt: now
    };
    setSessions(prev => {
      const updated = [...prev, newSession];
      try {
        localStorage.setItem('ap_sessions', JSON.stringify(updated));
        db.sessions.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('sessions', 'insert', newSession);
  };

  const updateSessionStatus = (sessionId: string, status: SessionStatus) => {
    const now = new Date().toISOString();
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== sessionId) return s;
        const updates: Partial<GoKartingSession> = { status, updatedAt: now };
        if (status === 'Active') updates.startTime = now;
        if (status === 'Completed' || status === 'Paused') updates.endTime = now;
        const merged = { ...s, ...updates };
        writeToLocalAndSync('sessions', 'update', merged);
        return merged;
      });
      try {
        localStorage.setItem('ap_sessions', JSON.stringify(updated));
        db.sessions.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
  };

  const recordLapTime = (lapData: Omit<LapRecord, 'id'>) => {
    const now = new Date().toISOString();
    const newLap: LapRecord = {
      ...lapData,
      id: `lap-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      updatedAt: now
    };
    setLapRecords(prev => {
      const updated = [...prev, newLap];
      try {
        localStorage.setItem('ap_lapRecords', JSON.stringify(updated));
        db.lapRecords.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('lapRecords', 'insert', newLap);
  };

  const submitWaiver = (waiverData: Omit<GoKartingWaiver, 'id'>) => {
    const now = new Date().toISOString();
    const newWaiver: GoKartingWaiver = {
      ...waiverData,
      id: `waiver-${Date.now()}`,
      updatedAt: now
    };
    setWaivers(prev => {
      const updated = [...prev, newWaiver];
      try {
        localStorage.setItem('ap_waivers', JSON.stringify(updated));
        db.waivers.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('waivers', 'insert', newWaiver);
  };

  // Utility to push notifications
  const sendMockNotification = (recipient: string, title: string, body: string, channel: 'email' | 'sms' | 'whatsapp') => {
    const emailBody = channel === 'email' ? `${body}\n\nFrom: deucesports22@gmail.com` : body;
    const newLog: NotificationLog = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipient,
      title,
      body: emailBody,
      channel,
      sentAt: new Date().toISOString()
    };
    setNotifications(prev => [newLog, ...prev]);

    if (isSupabaseConfigured) {
      writeToLocalAndSync('notifications', 'insert', newLog);
    }
  };

  // Activity Actions
  const addActivity = (act: Omit<Activity, 'id'>) => {
    const now = new Date().toISOString();
    const newAct: Activity = {
      ...act,
      id: `act-dynamic-${Date.now()}`,
      updatedAt: now
    };
    setActivities(prev => {
      const updatedList = [...prev, newAct];
      persistActivities(updatedList);
      try {
        db.activities.put(newAct);
      } catch (e) {}
      return updatedList;
    });

    writeToLocalAndSync('activities', 'insert', newAct);

    sendMockNotification(
      'admin@deucepark.com',
      'New Activity Configured',
      `Activity "${newAct.name}" has been successfully added to the park dynamic list.`,
      'email'
    );
  };

  const persistActivities = (updatedList: Activity[]) => {
    try {
      localStorage.setItem('ap_activities', JSON.stringify(updatedList));
    } catch (err) {
      console.warn('[frontend] localStorage quota exception on persistActivities:', err);
    }
  };

  const updateActivity = async (act: Activity): Promise<Activity> => {
    // 1. Validate packages input
    if (act.packages && Array.isArray(act.packages)) {
      for (const pkg of act.packages) {
        if (!pkg.name || !pkg.name.trim()) {
          throw new Error('Package name is required.');
        }
        if (typeof pkg.price !== 'number' || !Number.isFinite(pkg.price) || pkg.price < 0) {
          throw new Error(`Invalid price for package "${pkg.name}". Price must be a non-negative number.`);
        }
      }
    }

    const stampedAct: Activity = {
      ...act,
      organizationId: 'org_deuce_default',
      updatedAt: new Date().toISOString()
    };

    // Always update local React state, localStorage, and IndexedDB immediately!
    setActivities(prev => {
      const updatedList = prev.map(item => item.id === stampedAct.id ? stampedAct : item);
      persistActivities(updatedList);
      try {
        db.activities.put(stampedAct);
      } catch (e) {}
      return updatedList;
    });

    writeToLocalAndSync('activities', 'update', stampedAct);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('activities').upsert(stampedAct, { onConflict: 'id' });
      } catch (e) {}
    }

    return stampedAct;
  };

  const deleteActivity = (id: string) => {
    setActivities(prev => {
      const updatedList = prev.filter(item => item.id !== id);
      persistActivities(updatedList);
      try {
        db.activities.delete(id);
      } catch (e) {}
      return updatedList;
    });

    writeToLocalAndSync('activities', 'delete', { id });
  };

  // ==========================================
  // ACTIVITY MANAGEMENT ENHANCEMENT FUNCTIONS
  // ==========================================

  const addActivityPhoto = (activityId: string, photo: Omit<ActivityPhoto, 'id' | 'uploadedAt' | 'order'>) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const existingPhotos = act.photos || [];
        const newPhoto: ActivityPhoto = {
          ...photo,
          id: `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          uploadedAt: new Date().toISOString(),
          order: existingPhotos.length
        };
        const updated = { ...act, photos: [...existingPhotos, newPhoto], organizationId: 'org_deuce_default', updatedAt: new Date().toISOString() };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  const removeActivityPhoto = (activityId: string, photoId: string) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const filtered = (act.photos || []).filter(p => p.id !== photoId);
        const reordered = filtered.map((p, idx) => ({ ...p, order: idx }));
        const updated = {
          ...act,
          photos: reordered,
          coverPhotoId: act.coverPhotoId === photoId ? undefined : act.coverPhotoId,
          organizationId: 'org_deuce_default',
          updatedAt: new Date().toISOString()
        };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  const reorderActivityPhotos = (activityId: string, reorderedPhotos: ActivityPhoto[]) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const updated = { ...act, photos: reorderedPhotos.map((p, idx) => ({ ...p, order: idx })), organizationId: 'org_deuce_default', updatedAt: new Date().toISOString() };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  const setCoverPhoto = (activityId: string, photoId: string) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const photo = (act.photos || []).find(p => p.id === photoId);
        const updated = {
          ...act,
          coverPhotoId: photoId,
          image: photo ? photo.url : act.image,
          organizationId: 'org_deuce_default',
          updatedAt: new Date().toISOString()
        };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  const updateActivityExtended = (activityId: string, fields: Partial<Pick<Activity, 'shortDescription' | 'detailedDescription' | 'duration' | 'ageRequirement' | 'rules' | 'isActive' | 'displayOrder'>>) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const updated = { ...act, ...fields, organizationId: 'org_deuce_default', updatedAt: new Date().toISOString() };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  const addActivityOffer = (activityId: string, offer: Omit<ActivityOffer, 'id' | 'createdAt'>) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const newOffer: ActivityOffer = {
          ...offer,
          id: `offer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdAt: new Date().toISOString()
        };
        const updated = { ...act, offers: [...(act.offers || []), newOffer], organizationId: 'org_deuce_default', updatedAt: new Date().toISOString() };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  const updateActivityOffer = (activityId: string, offer: ActivityOffer) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const updated = { ...act, offers: (act.offers || []).map(o => o.id === offer.id ? offer : o), organizationId: 'org_deuce_default', updatedAt: new Date().toISOString() };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  const deleteActivityOffer = (activityId: string, offerId: string) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const updated = { ...act, offers: (act.offers || []).filter(o => o.id !== offerId), organizationId: 'org_deuce_default', updatedAt: new Date().toISOString() };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  const setOfferActive = (activityId: string, offerId: string, active: boolean) => {
    setActivities(prev => {
      const updatedList = prev.map(act => {
        if (act.id !== activityId) return act;
        const updated = { ...act, offers: (act.offers || []).map(o => o.id === offerId ? { ...o, isActive: active } : o), organizationId: 'org_deuce_default', updatedAt: new Date().toISOString() };
        writeToLocalAndSync('activities', 'update', updated);
        try {
          db.activities.put(updated);
        } catch (e) {}
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  // User Management
  const updateUserRole = (userId: string, role: UserRole) => {
    const now = new Date().toISOString();
    setUsers(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, role, updatedAt: now } : u);
      try {
        localStorage.setItem('ap_users', JSON.stringify(updated));
        db.users.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('users', 'update', { id: userId, role, updatedAt: now });
  };

  const addUser = (userData: User | Omit<User, 'id'>) => {
    const now = new Date().toISOString();
    const newUser: User = {
      ...userData,
      id: ('id' in userData && userData.id) ? userData.id : `usr-cust-${Date.now()}`,
      updatedAt: now
    };

    setUsers(prev => {
      const existsIndex = prev.findIndex(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      let updated: User[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = { ...updated[existsIndex], ...newUser };
      } else {
        updated = [...prev, newUser];
      }
      try {
        localStorage.setItem('ap_users', JSON.stringify(updated));
        db.users.bulkPut(updated);
      } catch (err) {
        console.warn('[frontend] Failed to save users to localStorage:', err);
      }
      return updated;
    });

    writeToLocalAndSync('users', 'insert', newUser);
  };

  const updateUser = (userData: User) => {
    const now = new Date().toISOString();
    const updatedUser = { ...userData, updatedAt: now };

    setUsers(prev => {
      const updated = prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
      try {
        localStorage.setItem('ap_users', JSON.stringify(updated));
        db.users.bulkPut(updated);
      } catch (err) {
        console.warn('[frontend] Failed to update user in localStorage:', err);
      }
      return updated;
    });

    writeToLocalAndSync('users', 'update', updatedUser);
  };

  const createBooking = (data: {
    customerName: string;
    customerEmail: string; customerPhone?: string;
    activityId: string;
    activityName: string;
    date: string;
    timeSlot: string;
    ticketType: 'standard' | 'package' | string;
    details: string;
    quantity: number;
    totalAmount: number;
    discountType?: 'none' | 'individual_5' | 'group_10' | 'group_15' | 'bulk_30' | 'custom' | 'cash' | string;
    discountPercentage?: number;
    discountAmount?: number;
    originalAmount?: number;
    paymentMethod: 'upi' | 'card' | 'net_banking' | 'cash' | 'razorpay' | 'complimentary';
    paymentStatus?: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
    status?: 'confirmed' | 'reserved';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    gateway?: string;
    packageId?: string;
  }) => {
    // Duplicate Protection: check if this Razorpay Order ID was already processed
    if (data.razorpayOrderId) {
      const existingPay = payments.find(p => p.razorpayOrderId === data.razorpayOrderId || p.gateway_order_id === data.razorpayOrderId);
      if (existingPay) {
        const existingBk = bookings.find(b => b.id === existingPay.bookingId);
        const existingTkt = tickets.find(t => t.bookingId === existingPay.bookingId);
        return { booking: existingBk!, ticket: existingTkt, payment: existingPay };
      }
    }

    // 1. Validation: Capacity checks & DB Package Price Enforcement
    // activityId may be a comma-separated list of IDs (counter multi-activity bookings)
    const activityIds = data.activityId.split(',').map(id => id.trim()).filter(Boolean);
    const primaryActivityId = activityIds[0];
    const targetActivity = activities.find(a => a.id === primaryActivityId);
    if (!targetActivity) return 'Activity not found in database.';

    let enforcedTotalAmount = data.totalAmount;
    let selectedPackageId = data.packageId;
    let selectedPackageName = '';
    let selectedUnitPrice: number | undefined = undefined;

    if (data.ticketType === 'package' || selectedPackageId) {
      if (!targetActivity.packages || targetActivity.packages.length === 0) {
        return 'No packages are configured for this activity in the database. Ticket purchase is not allowed.';
      }

      let selectedPkg: ActivityPackage | undefined;
      if (selectedPackageId) {
        selectedPkg = targetActivity.packages.find(p => p.id === selectedPackageId);
      }
      if (!selectedPkg && data.details) {
        selectedPkg = targetActivity.packages.find(p => data.details.includes(p.name));
      }
      if (!selectedPkg && targetActivity.packages.length > 0) {
        selectedPkg = targetActivity.packages[0];
      }

      if (!selectedPkg) {
        return 'Selected package was not found in database.';
      }

      selectedUnitPrice = Number(selectedPkg.price);
      selectedPackageName = selectedPkg.name;
      selectedPackageId = selectedPkg.id;

      // Fail-Safe: Calculate ticket total using database package price minus applied discount
      const pkgSubtotal = selectedUnitPrice * data.quantity;
      const appliedDiscount = data.discountAmount || 0;
      enforcedTotalAmount = data.paymentMethod === 'complimentary' ? 0 : Math.max(0, pkgSubtotal - appliedDiscount);
    }

    // Count existing confirmed/reserved bookings for this date only (daily limit, not per-slot)
    const existingDailyCount = bookings
      .filter(b => {
        const bIds = b.activityId.split(',').map(id => id.trim());
        return bIds.some(id => activityIds.includes(id)) &&
               b.date === data.date &&
               b.paymentStatus !== 'cancelled' &&
               b.paymentStatus !== 'failed';
      })
      .reduce((sum, b) => sum + b.quantity, 0);

    // Use full daily limit — counter staff manage their own slot-by-slot flow
    const dailyCapacity = targetActivity.dailyLimit;
    if (existingDailyCount + data.quantity > dailyCapacity) {
      const remaining = Math.max(0, dailyCapacity - existingDailyCount);
      return `Daily capacity reached for ${targetActivity.name}. Only ${remaining} spot${remaining !== 1 ? 's' : ''} left today.`;
    }

    const bookingId = generateOfflineId('bk');
    const txId = generateOfflineId('tx');
    const timestamp = new Date().toISOString();

    const isPending = data.paymentStatus === 'pending' || 
                      (data.paymentStatus === undefined && (data.paymentMethod === 'cash' || data.paymentMethod === 'upi'));

    const statusVal = data.status || (isPending ? 'reserved' : 'confirmed');
    const paymentStatusVal = data.paymentStatus === 'processing' ? 'pending' : (data.paymentStatus || (isPending ? 'pending' : 'paid'));

    const detailsStr = selectedPackageName 
      ? `Package: ${selectedPackageName} | Price: ₹${selectedUnitPrice} | Qty: ${data.quantity}`
      : data.details;

    // 2. Create Booking (with snapshotted package price & discounts)
    const newBooking: Booking = {
      id: bookingId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      activityId: data.activityId,
      activityName: data.activityName,
      date: data.date,
      timeSlot: data.timeSlot,
      ticketType: data.ticketType,
      details: detailsStr,
      quantity: data.quantity,
      totalAmount: enforcedTotalAmount,
      discountType: data.discountType,
      discountPercentage: data.discountPercentage,
      discountAmount: data.discountAmount,
      originalAmount: data.originalAmount || (enforcedTotalAmount + (data.discountAmount || 0)),
      paymentStatus: paymentStatusVal,
      status: statusVal,
      bookingDate: timestamp,
      packageId: selectedPackageId,
      packageName: selectedPackageName,
      unitPrice: selectedUnitPrice,
      organizationId: 'org_deuce_default',
      updatedAt: timestamp
    };

    // 3. Create Ticket (Only if NOT pending!)
    let newTicket: Ticket | undefined = undefined;
    if (!isPending) {
      newTicket = {
        id: `tkt-${bookingId}`,
        bookingId: bookingId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        activityId: data.activityId,
        activityName: data.activityName,
        date: data.date,
        timeSlot: data.timeSlot,
        ticketType: selectedPackageName || detailsStr,
        quantity: data.quantity,
        qrCodeValue: `adventure-park-ticket-${bookingId}`,
        status: 'valid',
        packageId: selectedPackageId,
        packageName: selectedPackageName,
        unitPrice: selectedUnitPrice,
        organizationId: 'org_deuce_default',
        updatedAt: timestamp
      };
    }

    // 4. Create Payment (with snapshotted package price)
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      bookingId: bookingId,
      amount: enforcedTotalAmount,
      method: data.paymentMethod === 'razorpay' ? 'razorpay' : data.paymentMethod,
      status: isPending ? 'pending' : 'paid',
      transactionId: txId,
      timestamp: timestamp,
      // DEUCE specific fields
      invoice_id: `INV-B-${bookingId}`,
      customer_id: data.customerEmail,
      currency: 'INR',
      payment_method: data.paymentMethod.toUpperCase(),
      payment_status: paymentStatusVal.toUpperCase(),
      gateway: data.gateway || (data.paymentMethod === 'razorpay' ? 'Razorpay' : 'None'),
      gateway_order_id: data.razorpayOrderId,
      gateway_payment_id: data.razorpayPaymentId,
      created_at: timestamp,
      updated_at: timestamp,
      paid_at: isPending ? undefined : timestamp,
      ticketId: `tkt-${bookingId}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      activityName: data.activityName,
      counterId: currentUser && currentUser.role !== 'customer' ? 'counter_1' : 'online',
      staffId: currentUser?.role !== 'customer' ? currentUser?.id : undefined,
      organizationId: 'org_deuce_default'
    };

    setBookings(prev => [newBooking, ...prev]);
    if (newTicket) {
      setTickets(prev => [newTicket!, ...prev]);
    }
    setPayments(prev => [newPayment, ...prev]);

    writeToLocalAndSync('bookings', 'insert', newBooking);
    if (newTicket) {
      writeToLocalAndSync('tickets', 'insert', newTicket);
    }
    writeToLocalAndSync('payments', 'insert', newPayment);

    // 5. Trigger Notifications
    if (isPending) {
      sendMockNotification(
        data.customerEmail,
        'Adventure Park Reservation Confirmed (Payment Pending)',
        `Hi ${data.customerName}, your reservation for ${data.activityName} on ${data.date} (${data.timeSlot}) is reserved! Ticket ID: tkt-${bookingId}. Please complete payment of ₹${data.totalAmount} at the ticket counter.`,
        'email'
      );
    } else {
      sendMockNotification(
        data.customerEmail,
        'Adventure Park Booking Confirmed! 🎢',
        `Hi ${data.customerName}, your booking for ${data.activityName} on ${data.date} (${data.timeSlot}) is confirmed! Ticket ID: tkt-${bookingId}. Customer Name: ${data.customerName} | Mobile: ${data.customerPhone || 'N/A'}. View QR code in your dashboard.`,
        'email'
      );
      if (data.customerPhone) {
        sendMockNotification(
          data.customerPhone,
          'Ticket Copy',
          `Hi ${data.customerName}, your ticket copy for ${data.activityName} is confirmed! Ticket ID: tkt-${bookingId}. Customer Name: ${data.customerName} | Mobile: ${data.customerPhone}. QR Code: adventure-park-ticket-${bookingId}. Show this at the counter.`,
          'sms'
        );
      }
    }

    return { booking: newBooking, ticket: newTicket, payment: newPayment };
  };

  // Booking Payment Action (for Cash)
  const markBookingAsPaid = (bookingId: string, staffName: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return { success: false, message: 'Booking not found.' };

    const now = new Date().toISOString();
    const payment = payments.find(p => p.bookingId === bookingId && p.status === 'pending');

    const updatedBooking: Booking = {
      ...booking,
      paymentStatus: 'paid',
      status: 'confirmed',
      updatedAt: now
    };

    setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));

    let newTicket = tickets.find(t => t.bookingId === bookingId);
    if (!newTicket) {
      newTicket = {
        id: `tkt-${bookingId}`,
        bookingId: bookingId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        activityId: booking.activityId,
        activityName: booking.activityName,
        date: booking.date,
        timeSlot: booking.timeSlot,
        ticketType: booking.details,
        quantity: booking.quantity,
        qrCodeValue: `adventure-park-ticket-${bookingId}`,
        status: 'valid',
        updatedAt: now
      };
      setTickets(prev => [newTicket!, ...prev]);
      writeToLocalAndSync('tickets', 'insert', newTicket);
    } else {
      const updatedTicket: Ticket = { ...newTicket, status: 'valid', updatedAt: now };
      setTickets(prev => prev.map(t => t.id === newTicket!.id ? updatedTicket : t));
      writeToLocalAndSync('tickets', 'update', updatedTicket);
    }

    if (payment) {
      const updatedPayment: Payment = {
        ...payment,
        status: 'paid',
        timestamp: now,
        payment_status: 'PAID',
        paid_at: now,
        updated_at: now
      };
      setPayments(prev => prev.map(p => p.id === payment.id ? updatedPayment : p));
      writeToLocalAndSync('payments', 'update', updatedPayment);
    }

    writeToLocalAndSync('bookings', 'update', updatedBooking);

    sendMockNotification(
      booking.customerEmail,
      'Payment Received!',
      `Hi ${booking.customerName}, your cash payment of ₹${booking.totalAmount} has been received by ${staffName}. Your booking is now confirmed.`,
      'email'
    );

    return { success: true, message: 'Payment successfully recorded.', ticket: newTicket };
  };

  // Confirm counter payment (UPI / CARD / CASH) and mark booking as PAID
  const markPaymentConfirmed = (params: {
    bookingId: string;
    method: 'upi' | 'card' | 'cash' | 'razorpay';
    staffId?: string;
    referenceNumber?: string;
    amountReceived?: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    gateway?: string;
    posTransactionId?: string;
    terminalId?: string;
    failureReason?: string;
    paymentStatus?: 'paid' | 'failed' | 'cancelled' | 'refunded';
    // Pass the freshly-created booking directly to avoid stale React state closure
    bookingData?: Booking;
  }) => {
    // Use passed-in bookingData first (avoids stale state when called immediately after createBooking)
    const booking = params.bookingData || bookings.find(b => b.id === params.bookingId);
    if (!booking) return { success: false, message: 'Booking not found.' };

    const now = new Date().toISOString();
    const finalStatus = params.paymentStatus || 'paid';

    const updatedBooking: Booking = {
      ...booking,
      paymentStatus: finalStatus,
      status: finalStatus === 'paid' ? 'confirmed' : 'reserved',
      updatedAt: now
    };
    setBookings(prev => prev.map(b => b.id === params.bookingId ? updatedBooking : b));

    // Generate ticket if paid
    let newTicket = tickets.find(t => t.bookingId === params.bookingId);
    if (finalStatus === 'paid' && !newTicket) {
      newTicket = {
        id: `tkt-${params.bookingId}`,
        bookingId: params.bookingId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        activityId: booking.activityId,
        activityName: booking.activityName,
        date: booking.date,
        timeSlot: booking.timeSlot,
        ticketType: booking.details,
        quantity: booking.quantity,
        qrCodeValue: `adventure-park-ticket-${params.bookingId}`,
        status: 'valid',
        updatedAt: now
      };
      setTickets(prev => [newTicket!, ...prev]);
      writeToLocalAndSync('tickets', 'insert', newTicket);
    } else if (finalStatus === 'paid' && newTicket) {
      const updatedTicket: Ticket = { ...newTicket, status: 'valid', updatedAt: now };
      setTickets(prev => prev.map(t => t.id === newTicket!.id ? updatedTicket : t));
      writeToLocalAndSync('tickets', 'update', updatedTicket);
    }

    // Update existing payment record or insert a new one (using functional state updater to avoid closure staleness)
    const methodVal = params.method === 'razorpay' ? 'razorpay' : params.method;

    let finalPaymentRecord: Payment | null = null;

    setPayments(prev => {
      const existingPayment = prev.find(p => p.bookingId === params.bookingId);
      if (existingPayment) {
        const updatedPayment: Payment = {
          ...existingPayment,
          method: methodVal,
          status: finalStatus === 'paid' ? 'paid' : (finalStatus as any),
          timestamp: now,
          referenceNumber: params.referenceNumber || existingPayment.referenceNumber,
          amountReceived: params.amountReceived || existingPayment.amountReceived,
          changeGiven: params.amountReceived != null ? Math.max(0, params.amountReceived - booking.totalAmount) : existingPayment.changeGiven,
          staffId: params.staffId || existingPayment.staffId,
          confirmedAt: now,
          razorpayOrderId: params.razorpayOrderId || existingPayment.razorpayOrderId,
          razorpayPaymentId: params.razorpayPaymentId || existingPayment.razorpayPaymentId,
          
          // DEUCE specific fields
          payment_method: params.method.toUpperCase(),
          payment_status: finalStatus.toUpperCase(),
          gateway: params.gateway || existingPayment.gateway || (params.method === 'razorpay' ? 'Razorpay' : 'None'),
          gateway_order_id: params.razorpayOrderId || existingPayment.gateway_order_id,
          gateway_payment_id: params.razorpayPaymentId || existingPayment.gateway_payment_id,
          gateway_reference_id: params.referenceNumber || existingPayment.gateway_reference_id,
          pos_transaction_id: params.posTransactionId || existingPayment.pos_transaction_id,
          terminal_id: params.terminalId || existingPayment.terminal_id,
          updated_at: now,
          paid_at: finalStatus === 'paid' ? now : undefined,
          failure_reason: params.failureReason,
          ticketId: `tkt-${params.bookingId}`,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          activityName: booking.activityName,
          counterId: (params.staffId || params.terminalId || params.posTransactionId || params.method === 'cash') ? 'counter_1' : 'online'
        };
        finalPaymentRecord = updatedPayment;
        // Keep the updated payment, and filter out any duplicate pending payments for the same bookingId
        const filteredOther = prev.filter(p => p.bookingId !== params.bookingId);
        return [updatedPayment, ...filteredOther];
      } else {
        const newPayment: Payment = {
          id: `pay-${Date.now()}`,
          bookingId: params.bookingId,
          amount: booking.totalAmount,
          method: methodVal,
          status: finalStatus === 'paid' ? 'paid' : (finalStatus as any),
          transactionId: params.referenceNumber || generateOfflineId('tx'),
          timestamp: now,
          referenceNumber: params.referenceNumber,
          amountReceived: params.amountReceived,
          changeGiven: params.amountReceived != null ? Math.max(0, params.amountReceived - booking.totalAmount) : undefined,
          staffId: params.staffId,
          confirmedAt: now,
          razorpayOrderId: params.razorpayOrderId,
          razorpayPaymentId: params.razorpayPaymentId,
          
          // DEUCE specific fields
          invoice_id: `INV-B-${params.bookingId}`,
          customer_id: booking.customerEmail,
          currency: 'INR',
          payment_method: params.method.toUpperCase(),
          payment_status: finalStatus.toUpperCase(),
          gateway: params.gateway || (params.method === 'razorpay' ? 'Razorpay' : 'None'),
          gateway_order_id: params.razorpayOrderId,
          gateway_payment_id: params.razorpayPaymentId,
          gateway_reference_id: params.referenceNumber,
          pos_transaction_id: params.posTransactionId,
          terminal_id: params.terminalId,
          created_at: now,
          updated_at: now,
          paid_at: finalStatus === 'paid' ? now : undefined,
          failure_reason: params.failureReason,
          ticketId: `tkt-${params.bookingId}`,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          activityName: booking.activityName,
          counterId: (params.staffId || params.terminalId || params.posTransactionId || params.method === 'cash') ? 'counter_1' : 'online'
        };
        finalPaymentRecord = newPayment;
        // Strip out any stale pending payments for the same bookingId if present
        const filteredOther = prev.filter(p => p.bookingId !== params.bookingId);
        return [newPayment, ...filteredOther];
      }
    });

    if (finalPaymentRecord) {
      writeToLocalAndSync('payments', 'update', finalPaymentRecord);
    }

    writeToLocalAndSync('bookings', 'update', updatedBooking);

    if (finalStatus === 'paid') {
      sendMockNotification(
        booking.customerEmail,
        '✅ Payment Confirmed – Deuce Adventure Park',
        `Hi ${booking.customerName}, your ${params.method.toUpperCase()} payment of ₹${booking.totalAmount} is confirmed. Booking ID: ${booking.id}. Enjoy your adventure!`,
        'email'
      );
    }

    return { success: true, message: 'Payment confirmed successfully.', ticket: newTicket, booking: updatedBooking };
  };

  // Cancel and Refund a Ticket / Booking
  const cancelAndRefundTicket = (params: {
    ticketId?: string;
    bookingId: string;
    reason: string;
    refundAmount: number;
    refundMethod: 'cash' | 'upi' | 'card' | 'original';
    staffName?: string;
  }) => {
    const booking = bookings.find(b => b.id === params.bookingId);
    if (!booking) return { success: false, message: 'Booking not found.' };

    const now = new Date().toISOString();
    const refundAmt = params.refundAmount != null ? params.refundAmount : booking.totalAmount;

    // 1. Update Booking
    const updatedBooking: Booking = {
      ...booking,
      paymentStatus: 'refunded',
      status: 'cancelled',
      cancellationReason: params.reason,
      refundAmount: refundAmt,
      refundMethod: params.refundMethod,
      refundedAt: now,
      refundedBy: params.staffName || currentUser?.name || 'Staff Counter'
    };
    setBookings(prev => prev.map(b => b.id === params.bookingId ? updatedBooking : b));
    writeToLocalAndSync('bookings', 'update', updatedBooking);

    // 2. Update Ticket
    setTickets(prev => prev.map(t => {
      if (t.bookingId === params.bookingId || (params.ticketId && t.id === params.ticketId)) {
        const updatedTicket: Ticket = {
          ...t,
          status: 'refunded',
          cancellationReason: params.reason,
          refundAmount: refundAmt,
          refundedAt: now,
          refundedBy: params.staffName || currentUser?.name || 'Staff Counter'
        };
        writeToLocalAndSync('tickets', 'update', updatedTicket);
        return updatedTicket;
      }
      return t;
    }));

    // 3. Update Payment record
    const existingPayment = payments.find(p => p.bookingId === params.bookingId);
    if (existingPayment) {
      const updatedPayment: Payment = {
        ...existingPayment,
        status: 'refunded',
        payment_status: 'REFUNDED',
        updated_at: now
      };
      setPayments(prev => prev.map(p => p.id === existingPayment.id ? updatedPayment : p));
      writeToLocalAndSync('payments', 'update', updatedPayment);
    }

    sendMockNotification(
      booking.customerEmail,
      '🛑 Booking Cancelled & Refunded – Deuce Adventure Park',
      `Hi ${booking.customerName}, your booking #${booking.id} (${booking.activityName}) has been cancelled. Refund of ₹${refundAmt} was processed via ${params.refundMethod.toUpperCase()}.`,
      'email'
    );

    return {
      success: true,
      message: `Successfully cancelled & refunded ₹${refundAmt} to ${params.refundMethod.toUpperCase()}`,
      refundReceipt: {
        bookingId: booking.id,
        ticketId: params.ticketId || `tkt-${booking.id}`,
        customerName: booking.customerName,
        refundAmount: refundAmt,
        refundMethod: params.refundMethod,
        reason: params.reason,
        timestamp: now,
        staffName: params.staffName || currentUser?.name || 'Staff Counter'
      }
    };
  };

  // Ticket Scanning Check-In
  const scanTicket = (qrValue: string, staffName: string) => {
    const foundTicket = tickets.find(t => t.qrCodeValue === qrValue);
    if (!foundTicket) {
      return { success: false, message: 'Invalid ticket. QR Code not recognized by system.' };
    }

    const booking = bookings.find(b => b.id === foundTicket.bookingId);
    if (booking && booking.paymentStatus === 'pending') {
      return { 
        success: false, 
        message: 'Payment is pending. Please collect cash at counter before checking in.',
        ticket: foundTicket,
        isPendingPayment: true,
        bookingId: booking.id
      };
    }

    if (foundTicket.status === 'used') {
      return { 
        success: false, 
        message: `Ticket already used! Checked in on ${new Date(foundTicket.scannedAt || '').toLocaleString()} by ${foundTicket.scannedBy}. Duplicate entry prohibited.`,
        ticket: foundTicket
      };
    }

    const now = new Date().toISOString();
    // Update ticket to 'used'
    const updatedTicket: Ticket = {
      ...foundTicket,
      status: 'used',
      scannedAt: now,
      scannedBy: staffName,
      updatedAt: now
    };

    setTickets(prev => prev.map(t => t.id === foundTicket.id ? updatedTicket : t));
    writeToLocalAndSync('tickets', 'update', updatedTicket);
    
    // Log notifications to visitors and admin
    sendMockNotification(
      foundTicket.customerEmail,
      'Activity Checked-In!',
      `You have been checked in for "${foundTicket.activityName}" at the park gate. Enjoy your session!`,
      'sms'
    );

    return { success: true, message: 'Ticket validated successfully! Access granted.', ticket: updatedTicket };
  };

  // Vendor Actions
  const addVendor = (v: Omit<FoodVendor, 'id'>) => {
    const now = new Date().toISOString();
    const newVendor: FoodVendor = {
      ...v,
      id: `vendor-dynamic-${Date.now()}`,
      updatedAt: now
    };
    setVendors(prev => {
      const updated = [...prev, newVendor];
      try {
        localStorage.setItem('ap_vendors', JSON.stringify(updated));
        db.vendors.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('vendors', 'insert', newVendor);

    sendMockNotification(
      'admin@adventurepark.com',
      'New Stall Assigned',
      `Vendor stall "${newVendor.name}" has been registered under Stall number ${newVendor.stallNumber}.`,
      'email'
    );
  };

  const updateVendor = (v: FoodVendor) => {
    const stampedVendor: FoodVendor = {
      ...v,
      updatedAt: new Date().toISOString()
    };
    setVendors(prev => {
      const updated = prev.map(item => item.id === stampedVendor.id ? stampedVendor : item);
      try {
        localStorage.setItem('ap_vendors', JSON.stringify(updated));
        db.vendors.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('vendors', 'update', stampedVendor);
  };

  const deleteVendor = (id: string) => {
    setVendors(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem('ap_vendors', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('vendors', 'delete', { id });
  };

  // Menu Actions
  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const now = new Date().toISOString();
    const newItem: MenuItem = {
      ...item,
      id: `menu-dynamic-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      updatedAt: now
    };
    setMenuItems(prev => {
      const updated = [...prev, newItem];
      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updated));
        db.menuItems.bulkPut(updated);
      } catch (e) {}
      return updated;
    });

    writeToLocalAndSync('menuItems', 'insert', newItem);
  };

  const addBulkMenuItems = (items: Array<Omit<MenuItem, 'id'>>) => {
    const now = new Date().toISOString();
    const newItems: MenuItem[] = items.map((item, idx) => ({
      ...item,
      id: `menu-dynamic-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      updatedAt: now
    }));

    setMenuItems(prev => {
      const updated = [...prev, ...newItems];
      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updated));
        db.menuItems.bulkPut(updated);
      } catch (e) {}
      return updated;
    });

    newItems.forEach(item => writeToLocalAndSync('menuItems', 'insert', item));
  };

  const updateMenuItem = (item: MenuItem) => {
    const stampedItem: MenuItem = {
      ...item,
      updatedAt: new Date().toISOString()
    };
    setMenuItems(prev => {
      const updated = prev.map(m => m.id === stampedItem.id ? stampedItem : m);
      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updated));
        db.menuItems.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('menuItems', 'update', stampedItem);
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems(prev => {
      const updated = prev.filter(m => m.id !== id);
      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('menuItems', 'delete', { id });
  };

  const updateMenuItemStock = (itemId: string, newStock: number) => {
    const cleanStock = Math.max(0, newStock);
    const now = new Date().toISOString();
    setMenuItems(prev => {
      const updatedList = prev.map(m => {
        if (m.id === itemId) {
          const updated = {
            ...m,
            stockQuantity: cleanStock,
            isAvailable: cleanStock > 0,
            updatedAt: now
          };
          writeToLocalAndSync('menuItems', 'update', updated);
          return updated;
        }
        return m;
      });
      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updatedList));
        db.menuItems.bulkPut(updatedList);
      } catch {}
      return updatedList;
    });
  };

  const adjustMenuItemStock = (itemId: string, delta: number) => {
    const now = new Date().toISOString();
    setMenuItems(prev => {
      const updatedList = prev.map(m => {
        if (m.id === itemId) {
          const current = m.stockQuantity ?? 50;
          const cleanStock = Math.max(0, current + delta);
          const updated = {
            ...m,
            stockQuantity: cleanStock,
            isAvailable: cleanStock > 0,
            updatedAt: now
          };
          writeToLocalAndSync('menuItems', 'update', updated);
          return updated;
        }
        return m;
      });
      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updatedList));
        db.menuItems.bulkPut(updatedList);
      } catch {}
      return updatedList;
    });
  };

  // Inventory Management
  const updateInventoryStock = (id: string, amount: number, mode: 'set' | 'adjust') => {
    const now = new Date().toISOString();
    setInventory(prev => {
      const updatedList = prev.map(item => {
        if (item.id === id) {
          const nextStock = mode === 'set' ? amount : item.currentStock + amount;
          const boundedStock = Math.max(0, nextStock);
          const updatedItem = { ...item, currentStock: boundedStock, updatedAt: now };

          writeToLocalAndSync('inventory', 'update', updatedItem);

          // Check if stock dips below minimum level
          if (boundedStock <= item.minStockLevel && item.currentStock > item.minStockLevel) {
            const ownerEmail = vendors.find(v => v.id === item.vendorId)?.ownerName.toLowerCase().replace(' ', '') + '@example.com';
            sendMockNotification(
              ownerEmail || 'vendor@example.com',
              '⚠️ CRITICAL: Low Stock Alert!',
              `Ingredient "${item.name}" has reached low stock: ${boundedStock} ${item.unit} remaining. Minimum alert level: ${item.minStockLevel} ${item.unit}. Please purchase restocking items!`,
              'email'
            );
          }

          return updatedItem;
        }
        return item;
      });
      try {
        localStorage.setItem('ap_inventory', JSON.stringify(updatedList));
        db.inventory.bulkPut(updatedList);
      } catch (e) {}
      return updatedList;
    });
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>): InventoryItem => {
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      openingStock: item.openingStock ?? item.currentStock,
      totalPurchased: item.totalPurchased ?? 0,
      totalConsumed: item.totalConsumed ?? 0,
      totalSold: item.totalSold ?? 0,
      totalWasted: item.totalWasted ?? 0,
      updatedAt: now
    };
    setInventory(prev => {
      const updated = [...prev, newItem];
      try {
        localStorage.setItem('ap_inventory', JSON.stringify(updated));
        db.inventory.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('inventory', 'insert', newItem);
    return newItem;
  };

  const updateInventoryItem = (item: InventoryItem) => {
    const now = new Date().toISOString();
    const updatedItem = { ...item, updatedAt: now };
    setInventory(prev => {
      const updated = prev.map(i => i.id === updatedItem.id ? updatedItem : i);
      try {
        localStorage.setItem('ap_inventory', JSON.stringify(updated));
        db.inventory.bulkPut(updated);
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('inventory', 'update', updatedItem);
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => {
      const updated = prev.filter(i => i.id !== id);
      try {
        localStorage.setItem('ap_inventory', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    writeToLocalAndSync('inventory', 'delete', { id });
  };

  // Record Stock Movement with full audit trail and idempotency
  const recordStockMovement = (params: {
    itemId: string;
    vendorId: string;
    type: StockMovementType;
    quantity: number;
    referenceId?: string;
    reason?: string;
    recordedBy?: string;
  }): StockMovement | null => {
    const now = new Date().toISOString();
    const targetItem = inventory.find(i => i.id === params.itemId);
    if (!targetItem) return null;

    const prevStock = targetItem.currentStock;
    let newStock = prevStock;

    if (params.type === 'purchase_receipt' || params.type === 'adjustment_add') {
      newStock = prevStock + params.quantity;
    } else {
      // consumption, sale_deduction, wastage, damaged, return_to_supplier, adjustment_sub
      newStock = Math.max(0, prevStock - params.quantity);
    }

    const movement: StockMovement = {
      id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemId: params.itemId,
      itemName: targetItem.name,
      vendorId: params.vendorId || targetItem.vendorId,
      type: params.type,
      quantity: params.quantity,
      unit: targetItem.unit,
      previousStock: prevStock,
      newStock,
      referenceId: params.referenceId,
      reason: params.reason,
      recordedBy: params.recordedBy || currentUser?.name || 'Staff',
      timestamp: now,
      organizationId: 'org_deuce_default'
    };

    // Update inventory item currentStock and tracking totals
    const updatedItem: InventoryItem = {
      ...targetItem,
      currentStock: newStock,
      totalPurchased: params.type === 'purchase_receipt' ? (targetItem.totalPurchased || 0) + params.quantity : targetItem.totalPurchased,
      totalConsumed: params.type === 'consumption' ? (targetItem.totalConsumed || 0) + params.quantity : targetItem.totalConsumed,
      totalSold: params.type === 'sale_deduction' ? (targetItem.totalSold || 0) + params.quantity : targetItem.totalSold,
      totalWasted: (params.type === 'wastage' || params.type === 'damaged') ? (targetItem.totalWasted || 0) + params.quantity : targetItem.totalWasted,
      updatedAt: now
    };

    setInventory(prev => {
      const updated = prev.map(i => i.id === targetItem.id ? updatedItem : i);
      try {
        localStorage.setItem('ap_inventory', JSON.stringify(updated));
        db.inventory.bulkPut(updated);
      } catch (e) {}
      return updated;
    });

    setStockMovements(prev => {
      const updated = [movement, ...prev];
      try {
        localStorage.setItem('ap_stock_movements', JSON.stringify(updated));
        db.stockMovements.bulkPut(updated);
      } catch (e) {}
      return updated;
    });

    writeToLocalAndSync('inventory', 'update', updatedItem);
    writeToLocalAndSync('stockMovements', 'insert', movement);

    return movement;
  };

  // Add Food Street Purchase (Sub-Admin entry)
  const addFoodStreetPurchase = (
    purchaseData: Omit<FoodStreetPurchaseRecord, 'id' | 'createdAt' | 'updatedAt' | 'postedToFinance'>
  ): FoodStreetPurchaseRecord => {
    const now = new Date().toISOString();
    const purchaseId = `fsp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newPurchase: FoodStreetPurchaseRecord = {
      ...purchaseData,
      id: purchaseId,
      createdAt: now,
      updatedAt: now,
      postedToFinance: false
    };

    setFoodStreetPurchases(prev => {
      const updated = [newPurchase, ...prev];
      try {
        localStorage.setItem('ap_food_purchases', JSON.stringify(updated));
        db.foodStreetPurchases.bulkPut(updated);
      } catch (e) {}
      return updated;
    });

    // If already accepted into stock on entry, trigger stock receipt automatically
    if (newPurchase.status === 'accepted_into_stock' && newPurchase.quantityAccepted > 0) {
      setTimeout(() => {
        acceptPurchaseIntoStock(purchaseId, newPurchase.quantityAccepted);
      }, 50);
    }

    writeToLocalAndSync('foodStreetPurchases', 'insert', newPurchase);
    return newPurchase;
  };

  // Accept Purchase into Stock — Idempotent goods receipt workflow
  const acceptPurchaseIntoStock = (
    purchaseId: string,
    quantityAcceptedOverride?: number
  ): { success: boolean; message: string } => {
    const purchase = foodStreetPurchases.find(p => p.id === purchaseId);
    if (!purchase) return { success: false, message: 'Purchase record not found.' };

    const acceptedQty = quantityAcceptedOverride !== undefined ? quantityAcceptedOverride : purchase.quantityAccepted;
    if (acceptedQty <= 0) return { success: false, message: 'Accepted quantity must be greater than 0.' };

    // Prevent duplicate stock increments (Idempotency check)
    const alreadyMoved = stockMovements.some(sm => sm.referenceId === purchaseId && sm.type === 'purchase_receipt');
    if (alreadyMoved) {
      return { success: false, message: 'Stock for this purchase has already been accepted and credited.' };
    }

    const now = new Date().toISOString();

    // 1. Locate or create corresponding inventory item
    let targetInventoryItem = inventory.find(i => 
      (purchase.itemId && i.id === purchase.itemId) ||
      (i.vendorId === purchase.vendorId && i.name.trim().toLowerCase() === purchase.itemName.trim().toLowerCase())
    );

    let updatedInventoryList = [...inventory];

    if (!targetInventoryItem) {
      // Create new inventory item seamlessly
      const newItem: InventoryItem = {
        id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        vendorId: purchase.vendorId,
        name: purchase.itemName.trim(),
        category: purchase.itemCategory || 'Ingredients',
        currentStock: acceptedQty,
        minStockLevel: 5,
        unit: purchase.unit,
        openingStock: 0,
        totalPurchased: acceptedQty,
        totalConsumed: 0,
        totalSold: 0,
        totalWasted: 0,
        lastPurchaseDate: purchase.purchaseDate,
        lastPurchasePrice: purchase.ratePerUnit,
        supplier: purchase.supplierName,
        costPrice: purchase.ratePerUnit,
        updatedAt: now
      };
      targetInventoryItem = newItem;
      updatedInventoryList.push(newItem);
    } else {
      const prevStock = targetInventoryItem.currentStock;
      const newStock = prevStock + acceptedQty;
      targetInventoryItem = {
        ...targetInventoryItem,
        currentStock: newStock,
        totalPurchased: (targetInventoryItem.totalPurchased || 0) + acceptedQty,
        lastPurchaseDate: purchase.purchaseDate,
        lastPurchasePrice: purchase.ratePerUnit,
        supplier: purchase.supplierName,
        costPrice: purchase.ratePerUnit,
        updatedAt: now
      };
      updatedInventoryList = updatedInventoryList.map(i => i.id === targetInventoryItem!.id ? targetInventoryItem! : i);
    }

    // 2. Record Stock Movement
    const movement: StockMovement = {
      id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemId: targetInventoryItem.id,
      itemName: targetInventoryItem.name,
      vendorId: purchase.vendorId,
      type: 'purchase_receipt',
      quantity: acceptedQty,
      unit: purchase.unit,
      previousStock: targetInventoryItem.currentStock - acceptedQty,
      newStock: targetInventoryItem.currentStock,
      referenceId: purchase.id,
      reason: `Goods receipt from supplier ${purchase.supplierName} (Inv: ${purchase.supplierInvoiceNumber})`,
      recordedBy: currentUser?.name || 'Sub-Admin / Storekeeper',
      timestamp: now,
      organizationId: 'org_deuce_default'
    };

    // 3. Mark purchase record as accepted and post to Finance
    const updatedPurchase: FoodStreetPurchaseRecord = {
      ...purchase,
      status: 'accepted_into_stock',
      quantityAccepted: acceptedQty,
      receivedAt: now,
      updatedAt: now,
      postedToFinance: true,
      postedToFinanceAt: now
    };

    // 4. Update Super Admin Accounts & Finance (Post to Purchases register without duplication)
    try {
      const existingFinancePurchasesRaw = localStorage.getItem('dp_purchases_v1');
      let financePurchases: any[] = existingFinancePurchasesRaw ? JSON.parse(existingFinancePurchasesRaw) : [];
      const alreadyInFinance = financePurchases.some(fp => fp.invoiceNumber === purchase.supplierInvoiceNumber && fp.supplier === purchase.supplierName && fp.itemName === purchase.itemName);
      
      if (!alreadyInFinance) {
        const financeEntry = {
          id: `purch-fs-${purchase.id}`,
          date: purchase.purchaseDate,
          department: 'Cafe / Food Street',
          category: 'Inventory / Stock',
          itemName: purchase.itemName,
          description: `Food Street Purchase - Inv ${purchase.supplierInvoiceNumber}`,
          supplier: purchase.supplierName,
          invoiceNumber: purchase.supplierInvoiceNumber,
          quantity: purchase.quantityPurchased,
          unit: purchase.unit,
          unitPrice: purchase.ratePerUnit,
          gstPercent: purchase.gstRate,
          gstAmount: purchase.gstAmount,
          totalCost: purchase.totalPurchaseValue,
          paymentMethod: purchase.paymentMethod,
          amountPaid: purchase.amountPaid,
          outstandingBalance: purchase.outstandingBalance,
          paymentStatus: purchase.paymentStatus,
          notes: purchase.remarks || 'Accepted into Food Street inventory',
          isInventory: true,
          isFixedAsset: false,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser?.name || 'Sub-Admin'
        };
        financePurchases.unshift(financeEntry);
        localStorage.setItem('dp_purchases_v1', JSON.stringify(financePurchases));
        db.purchases.put(financeEntry);
      }
    } catch (e) {
      console.warn('[FoodStreet] Failed to post to dp_purchases_v1:', e);
    }

    // 5. Commit all state
    setInventory(updatedInventoryList);
    try {
      localStorage.setItem('ap_inventory', JSON.stringify(updatedInventoryList));
      db.inventory.bulkPut(updatedInventoryList);
    } catch (e) {}

    setStockMovements(prev => {
      const updated = [movement, ...prev];
      try {
        localStorage.setItem('ap_stock_movements', JSON.stringify(updated));
        db.stockMovements.bulkPut(updated);
      } catch (e) {}
      return updated;
    });

    setFoodStreetPurchases(prev => {
      const updated = prev.map(p => p.id === purchase.id ? updatedPurchase : p);
      try {
        localStorage.setItem('ap_food_purchases', JSON.stringify(updated));
        db.foodStreetPurchases.bulkPut(updated);
      } catch (e) {}
      return updated;
    });

    writeToLocalAndSync('inventory', 'update', targetInventoryItem);
    writeToLocalAndSync('stockMovements', 'insert', movement);
    writeToLocalAndSync('foodStreetPurchases', 'update', updatedPurchase);

    return {
      success: true,
      message: `Successfully accepted ${acceptedQty} ${purchase.unit} of "${purchase.itemName}" into Food Street inventory and posted to Finance.`
    };
  };

  const updateFoodStreetPurchase = (purchase: FoodStreetPurchaseRecord) => {
    const now = new Date().toISOString();
    const updated = { ...purchase, updatedAt: now };
    setFoodStreetPurchases(prev => {
      const list = prev.map(p => p.id === updated.id ? updated : p);
      try {
        localStorage.setItem('ap_food_purchases', JSON.stringify(list));
        db.foodStreetPurchases.bulkPut(list);
      } catch (e) {}
      return list;
    });
    writeToLocalAndSync('foodStreetPurchases', 'update', updated);
  };

  const setMenuItemRecipe = (recipe: MenuItemRecipe) => {
    const now = new Date().toISOString();
    const updatedRecipe = { ...recipe, updatedAt: now };
    setMenuItemRecipes(prev => {
      const list = prev.filter(r => r.menuItemId !== updatedRecipe.menuItemId);
      const next = [...list, updatedRecipe];
      try {
        localStorage.setItem('ap_menu_recipes', JSON.stringify(next));
        db.menuItemRecipes.bulkPut(next);
      } catch (e) {}
      return next;
    });
    writeToLocalAndSync('menuItemRecipes', 'insert', updatedRecipe);
  };

  // Food Cart Actions with live stock position checks
  const addToFoodCart = (item: MenuItem, quantity: number) => {
    setFoodCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      const currentCartQty = existing ? existing.quantity : 0;
      const availableStock = item.stockQuantity !== undefined ? item.stockQuantity : 9999;

      if (availableStock <= 0) {
        alert(`Sorry, "${item.name}" is currently Out of Stock.`);
        return prev;
      }

      if (currentCartQty + quantity > availableStock) {
        alert(`Cannot add more than available stock (${availableStock} units available for ${item.name}).`);
        return prev;
      }

      const vendorName = vendors.find(v => v.id === item.vendorId)?.name || 'Food Stall';

      if (existing) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      } else {
        return [...prev, {
          id: generateOfflineId('cart-item'),
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: quantity,
          vendorId: item.vendorId,
          vendorName: vendorName
        }];
      }
    });
  };

  const removeFromFoodCart = (menuItemId: string) => {
    setFoodCart(prev => prev.filter(i => i.menuItemId !== menuItemId));
  };

  const clearFoodCart = () => {
    setFoodCart([]);
  };

  // Submit Food Order (Single checkout supporting multi-vendor list & auto stock deduction)
  const submitFoodOrder = (
    customerNameOrData: string | { customerName: string; customerEmail: string; paymentMethod: 'upi' | 'card' | 'net_banking' | 'cash'; customerPhone?: string },
    customerEmail?: string,
    paymentMethod?: 'upi' | 'card' | 'net_banking' | 'cash',
    customerPhone?: string
  ) => {
    if (foodCart.length === 0) throw new Error('Cart is empty');

    let finalName = 'Walk-in Guest';
    let finalEmail = 'guest@deucepark.com';
    let finalPhone = 'N/A';
    let finalMethod: 'upi' | 'card' | 'net_banking' | 'cash' = 'cash';

    if (typeof customerNameOrData === 'object' && customerNameOrData !== null) {
      finalName = customerNameOrData.customerName || 'Walk-in Guest';
      finalEmail = customerNameOrData.customerEmail || 'guest@deucepark.com';
      finalPhone = customerNameOrData.customerPhone || 'N/A';
      finalMethod = customerNameOrData.paymentMethod || 'cash';
    } else {
      finalName = (typeof customerNameOrData === 'string' && customerNameOrData) ? customerNameOrData : 'Walk-in Guest';
      finalEmail = customerEmail || 'guest@deucepark.com';
      finalMethod = paymentMethod || 'cash';
      finalPhone = customerPhone || 'N/A';
    }

    const orderId = generateOfflineId('ord');
    const txId = generateOfflineId('tx');
    const timestamp = new Date().toISOString();
    const todayStr = timestamp.split('T')[0];

    // Daily sequential token number: 101, 102, 103...
    const todayFoodOrdersCount = orders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr)).length;
    const tokenNumber = 101 + todayFoodOrdersCount;
    // 5% GST calculation for Food Street (GST Inclusive in MRP / Item Price)
    const grandMRP = Math.round(foodCart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 100) / 100;
    const subtotal = Math.round((grandMRP / 1.05) * 100) / 100;
    const taxAmount = Math.round((grandMRP - subtotal) * 100) / 100;
    const cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
    const sgstAmount = Math.round((taxAmount - cgstAmount) * 100) / 100;
    const totalAmount = grandMRP;
    const taxRate = 0.05;
    const invoiceNumber = `INV-FS-${Date.now().toString().slice(-6)}`;

    const newOrder: FoodOrder = {
      id: orderId,
      customerName: finalName,
      customerEmail: finalEmail,
      customerPhone: finalPhone,
      items: [...foodCart],
      subtotal,
      taxRate,
      taxAmount,
      cgstAmount,
      sgstAmount,
      totalAmount,
      status: 'delivered',
      paymentStatus: 'paid',
      invoiceNumber,
      tokenNumber,
      paymentMethod: finalMethod,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      orderId,
      amount: totalAmount,
      method: finalMethod,
      status: 'success',
      transactionId: txId,
      timestamp,
      created_at: timestamp,
      updated_at: timestamp,
      invoice_id: invoiceNumber,
      customer_id: finalEmail,
      currency: 'INR',
      payment_method: String(finalMethod).toUpperCase(),
      payment_status: 'PAID',
      customerName: finalName,
      customerPhone: finalPhone,
      activityName: 'Food Street Dining',
      counterId: 'counter_1'
    };

    setOrders(prev => [newOrder, ...prev]);
    setPayments(prev => [newPayment, ...prev]);

    writeToLocalAndSync('orders', 'insert', newOrder);
    writeToLocalAndSync('payments', 'insert', newPayment);

    // ── REDUCE DIRECT MENU ITEM STOCK AND PERSIST AFTER BILLING ──
    setMenuItems(prev => {
      const updatedList = prev.map(m => {
        const cartItem = foodCart.find(ci => ci.menuItemId === m.id);
        if (cartItem) {
          const currentStock = m.stockQuantity !== undefined ? m.stockQuantity : 50;
          const newQty = Math.max(0, currentStock - cartItem.quantity);
          const updated = {
            ...m,
            stockQuantity: newQty,
            isAvailable: newQty > 0 ? m.isAvailable : false,
            updatedAt: timestamp
          };
          writeToLocalAndSync('menuItems', 'update', updated);
          return updated;
        }
        return m;
      });

      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updatedList));
        db.menuItems.bulkPut(updatedList);
      } catch {}

      return updatedList;
    });

    // ── DEDUCT LINKED INGREDIENT INVENTORIES (RECIPES / INGREDIENT MAPPING) ──
    foodCart.forEach(cartItem => {
      // Check if user has explicitly configured a recipe for this menu item
      const configuredRecipe = menuItemRecipes.find(r => r.menuItemId === cartItem.menuItemId);
      if (configuredRecipe && configuredRecipe.ingredients.length > 0) {
        configuredRecipe.ingredients.forEach(ing => {
          const deductQty = ing.quantityRequired * cartItem.quantity;
          recordStockMovement({
            itemId: ing.inventoryItemId,
            vendorId: cartItem.vendorId,
            type: 'sale_deduction',
            quantity: deductQty,
            referenceId: orderId,
            reason: `Recipe deduction for ${cartItem.quantity}x ${cartItem.name} (Order: ${orderId})`,
            recordedBy: 'POS Sales Engine'
          });
        });
      } else {
        // Fallback: check matching ingredients by vendor and name
        const matchingIngredients = inventory.filter(inv => 
          inv.vendorId === cartItem.vendorId && 
          (cartItem.name.toLowerCase().includes(inv.name.split(' ')[0].toLowerCase()) || 
           (inv.name.toLowerCase().includes('bun') && cartItem.name.toLowerCase().includes('burger')) ||
           (inv.name.toLowerCase().includes('coffee') && cartItem.name.toLowerCase().includes('espresso')) ||
           (inv.name.toLowerCase().includes('milk') && cartItem.name.toLowerCase().includes('latte')))
        );

        matchingIngredients.forEach(ing => {
          recordStockMovement({
            itemId: ing.id,
            vendorId: cartItem.vendorId,
            type: 'sale_deduction',
            quantity: cartItem.quantity,
            referenceId: orderId,
            reason: `Sale deduction for ${cartItem.quantity}x ${cartItem.name} (Order: ${orderId})`,
            recordedBy: 'POS Sales Engine'
          });
        });
      }
    });

    clearFoodCart();

    // Notify Customer & Stall owners
    sendMockNotification(
      finalEmail,
      'Food Order Received! 🍔☕',
      `Your order ${orderId} has been successfully placed at Food Street / Cafe. Total amount: ₹${totalAmount.toFixed(2)}. Kitchen is preparing your fresh order!`,
      'email'
    );

    // Notify vendors
    const vendorIds = Array.from(new Set(newOrder.items.map(i => i.vendorId)));
    vendorIds.forEach(vId => {
      const v = vendors.find(x => x.id === vId);
      if (v) {
        const ownerEmail = v.ownerName.toLowerCase().replace(' ', '') + '@example.com';
        sendMockNotification(
          ownerEmail,
          '🔔 New Live Food Order!',
          `Hey ${v.ownerName}, you have a new incoming order (${orderId}) at ${v.name}. Open your vendor panel to start preparing.`,
          'email'
        );
      }
    });

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const now = new Date().toISOString();
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, status, updatedAt: now };
        writeToLocalAndSync('orders', 'update', updated);

        let title = '';
        let body = '';

        if (status === 'preparing') {
          title = 'Chef is Preparing Your Food! 👨‍🍳';
          body = `Hi ${o.customerName}, your food order ${orderId} is now actively being prepared by our chefs.`;
        } else if (status === 'ready') {
          title = 'Food Order is Ready to Collect! 🛎️';
          body = `Hi ${o.customerName}, great news! Your food order ${orderId} is fresh, hot, and ready for pickup at the food street. Bring your order ID!`;
        } else if (status === 'delivered') {
          title = 'Food Delivered! Bon Appétit! 😋';
          body = `Hi ${o.customerName}, order ${orderId} was marked as successfully delivered. Thank you for dining with us at Adventure Park Food Street!`;
        }

        if (title) {
          sendMockNotification(o.customerEmail, title, body, 'whatsapp');
          sendMockNotification(o.customerEmail, title, body, 'email');
        }

        return updated;
      }
      return o;
    }));
  };

  /**
   * ⚠️  LOCAL SESSION RESET ONLY
   * Clears browser localStorage cache and resets React state to empty.
   * Does NOT touch Supabase production database.
   * After reset, the app will reload fresh data from Supabase on next render.
   * 
   * This function must ONLY be called from an explicit admin action with confirmation.
   * Never called automatically on startup, login, or deployment.
   */
  const resetAllData = () => {
    console.warn('[SECURITY] resetAllData() called — clearing local session cache only. Production Supabase database is NOT affected.');
    
    // Clear browser localStorage cache
    const keysToRemove = [
      'ap_activities', 'ap_vendors', 'ap_menu_items', 'ap_inventory',
      'ap_bookings', 'ap_tickets', 'ap_orders', 'ap_notifications', 'ap_payments',
      'ap_karts', 'ap_sessions', 'ap_lapRecords', 'ap_waivers',
      'ap_users'
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Reset React state to empty (Supabase will repopulate on next load)
    setActivities([]);
    setVendors([]);
    setMenuItems([]);
    setInventory([]);
    setBookings([]);
    setTickets([]);
    setOrders([]);
    setNotifications([]);
    setPayments([]);
    setFoodCart([]);
    setUsers([]);
    setKarts([]);
    setSessions([]);
    setLapRecords([]);
    setWaivers([]);

    // ✅ NO Supabase delete/insert operations — production data is preserved
    // Reload from Supabase immediately after clearing cache
    if (isSupabaseConfigured) {
      setTimeout(() => {
        refetchActivitiesFromDatabase();
      }, 500);
    }
    
    sendMockNotification(
      'admin@deucepark.com',
      'Local Session Cache Cleared',
      'Browser cache has been cleared. Production data in Supabase is preserved. Reloading from database...',
      'email'
    );
  };

  return (
    <AppContext.Provider value={{
      isOnline,
      syncStatus,
      pendingSyncCount,
      isRealtimeActive,
      lastSyncTime,
      retrySync,
      currentUser,
      setCurrentUser,
      selectedVendorId,
      setSelectedVendorId,
      
      users,
      activities,
      vendors,
      menuItems,
      inventory,
      bookings,
      tickets,
      orders,
      notifications,
      payments,
      timeSlots: TIME_SLOTS,

      addActivity,
      updateActivity,
      deleteActivity,
      refetchActivitiesFromDatabase,
      addActivityPhoto,
      removeActivityPhoto,
      reorderActivityPhotos,
      setCoverPhoto,
      updateActivityExtended,
      addActivityOffer,
      updateActivityOffer,
      deleteActivityOffer,
      setOfferActive,
      updateUserRole,
      addUser,
      updateUser,
      
      createBooking,
      markBookingAsPaid,
      markPaymentConfirmed,
      cancelAndRefundTicket,
      scanTicket,

      counterUpiId,
      setCounterUpiId,
      razorpayKeyId,
      posProvider,
      posTerminalName,
      posTerminalId,
      enabledMethods,
      setPosConfig,

      addVendor,
      updateVendor,
      deleteVendor,

      addMenuItem,
      addBulkMenuItems,
      updateMenuItem,
      deleteMenuItem,
      updateMenuItemStock,
      adjustMenuItemStock,

      updateInventoryStock,
      addInventoryItem,
      updateInventoryItem,
      deleteInventoryItem,
      recordStockMovement,
      addFoodStreetPurchase,
      acceptPurchaseIntoStock,
      updateFoodStreetPurchase,
      setMenuItemRecipe,

      // Food Street Purchase & Stock Tracking State
      foodStreetPurchases,
      stockMovements,
      menuItemRecipes,

      foodCart,
      addToFoodCart,
      removeFromFoodCart,
      clearFoodCart,
      submitFoodOrder,
      updateOrderStatus,

      sendMockNotification,
      resetAllData,

      // Go Karting Exports
      karts, sessions, lapRecords, waivers,
      updateKartStatus, createGoKartingSession, updateSessionStatus, recordLapTime, submitWaiver
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

