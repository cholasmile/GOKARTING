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
  ActivityPhoto, ActivityOffer
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { db } from '../db/db';
import { syncEngine, SyncStatus } from '../lib/syncEngine';
import { generateOfflineId } from '../lib/deviceSetup';

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
  addUser: (user: Omit<User, 'id'>) => void;

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

  // Mutators - Menu Items
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  addBulkMenuItems: (items: Array<Omit<MenuItem, 'id'>>) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;

  // Mutators - Inventory
  updateInventoryStock: (id: string, amount: number, mode: 'set' | 'adjust') => void;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;

  // Mutators - Food Orders & Cart
  foodCart: FoodOrderItem[];
  addToFoodCart: (item: MenuItem, quantity: number) => void;
  removeFromFoodCart: (menuItemId: string) => void;
  clearFoodCart: () => void;
  submitFoodOrder: (customerName: string, customerEmail: string, paymentMethod: 'upi' | 'card' | 'net_banking' | 'cash') => FoodOrder;
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

const synthesizePayments = (currentPayments: Payment[], currentBookings: Booking[], currentOrders: FoodOrder[]): Payment[] => {
  const paymentMap = new Map<string, Payment>();

  currentPayments.forEach(p => {
    const key = p.bookingId ? `b_${p.bookingId}` : p.orderId ? `o_${p.orderId}` : p.id;
    paymentMap.set(key, p);
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
        method: 'cash',
        status: 'success',
        transactionId: `TX-${o.id}`,
        timestamp: o.createdAt || new Date().toISOString(),
        invoice_id: `INV-O-${o.id}`,
        customer_id: o.customerEmail,
        currency: 'INR',
        payment_method: 'CASH',
        payment_status: 'PAID',
        customerName: o.customerName,
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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const unsubscribe = syncEngine.subscribe((status, count, realtimeActive) => {
      setSyncStatus(status);
      setPendingSyncCount(count);
      setIsRealtimeActive(realtimeActive);
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
      } else if (table === 'food_orders') {
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
      } else if (table === 'lap_records') {
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
      } else if (table === 'menu_items') {
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
      } else if (table === 'food_vendors') {
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
    };
  }, []);

  const [selectedVendorId, setSelectedVendorId] = useState<string>(() => {
    const saved = localStorage.getItem('ap_selected_vendor_id');
    return saved || 'vendor-forest-cafe';
  });

  // ── Core Domain Data ──────────────────────────────────────────────
  // All initialized as EMPTY. Supabase load populates these.
  // localStorage is only used as an offline cache, NEVER as primary data.
  const [users, setUsers] = useState<User[]>(() => {
    const cached = localStorage.getItem('ap_users');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  });
  const [activities, setActivities] = useState<Activity[]>(() => {
    const cached = localStorage.getItem('ap_activities');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
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
  // (populated by Supabase sync), never from demo data
  const isDummyRecord = (item: any) => {
    if (!item || typeof item !== 'object') return false;
    const email = (item.customerEmail || item.customer_id || '').toLowerCase();
    const id = (item.id || '').toString();
    return id.startsWith('bk-100') || id.startsWith('ord-500') || id.startsWith('pay-bk-100') || id.startsWith('pay-ord-500') ||
           email.endsWith('@example.com') || email.includes('gotham.com') || email.includes('themyscira.gov') ||
           email.includes('dailybugle.com') || email.includes('ccpd.gov');
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
  const refetchActivitiesFromDatabase = async (): Promise<Activity[]> => {
    let freshList: Activity[] = [];
    if (isSupabaseConfigured) {
      try {
        const { data: dbActivities, error } = await supabase!.from('activities').select('*');
        if (!error && dbActivities && dbActivities.length > 0) {
          freshList = dbActivities;
          setActivities(freshList);
          try {
            localStorage.setItem('ap_activities', JSON.stringify(freshList));
          } catch (err) {}
          db.activities.bulkPut(freshList);
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
        freshList = serverActivities;
        setActivities(freshList);
        try {
          localStorage.setItem('ap_activities', JSON.stringify(freshList));
        } catch (err) {}
        return freshList;
      }
    } catch (err) {
      console.warn('[frontend] Backend activities sync not available:', err);
    }

    return freshList;
  };

  // -----------------------------------------------------------------
  // SUPABASE INITIAL LOAD & AUTOMATIC SYNC
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured) return;

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
          supabase!.from('activities').select('*'),
          supabase!.from('food_vendors').select('*'),
          supabase!.from('menu_items').select('*'),
          supabase!.from('inventory').select('*'),
          supabase!.from('bookings').select('*'),
          supabase!.from('tickets').select('*'),
          supabase!.from('food_orders').select('*'),
          supabase!.from('notifications').select('*'),
          supabase!.from('payments').select('*'),
          supabase!.from('users').select('*')
        ]);

        if (dbActivities && dbActivities.length > 0) {
          // DB is authoritative — replace local state with Supabase data
          const freshActivities = dbActivities as Activity[];
          try { localStorage.setItem('ap_activities', JSON.stringify(freshActivities)); } catch {}
          db.activities.bulkPut(freshActivities);
          setActivities(freshActivities);
        }
        if (dbVendors && dbVendors.length > 0) { setVendors(dbVendors); try { localStorage.setItem('ap_vendors', JSON.stringify(dbVendors)); } catch {} db.vendors.bulkPut(dbVendors); }
        if (dbMenuItems && dbMenuItems.length > 0) { setMenuItems(dbMenuItems); try { localStorage.setItem('ap_menu_items', JSON.stringify(dbMenuItems)); } catch {} db.menuItems.bulkPut(dbMenuItems); }
        if (dbInventory && dbInventory.length > 0) { setInventory(dbInventory); try { localStorage.setItem('ap_inventory', JSON.stringify(dbInventory)); } catch {} db.inventory.bulkPut(dbInventory); }
        if (dbBookings && dbBookings.length > 0) { setBookings(dbBookings); try { localStorage.setItem('ap_bookings', JSON.stringify(dbBookings)); } catch {} db.bookings.bulkPut(dbBookings); }
        if (dbTickets && dbTickets.length > 0) { setTickets(dbTickets); try { localStorage.setItem('ap_tickets', JSON.stringify(dbTickets)); } catch {} db.tickets.bulkPut(dbTickets); }
        if (dbOrders && dbOrders.length > 0) { setOrders(dbOrders); try { localStorage.setItem('ap_orders', JSON.stringify(dbOrders)); } catch {} db.orders.bulkPut(dbOrders); }
        if (dbNotifications && dbNotifications.length > 0) { setNotifications(dbNotifications); db.notifications.bulkPut(dbNotifications); }
        if (dbPayments && dbPayments.length > 0) { setPayments(dbPayments); try { localStorage.setItem('ap_payments', JSON.stringify(dbPayments)); } catch {} db.payments.bulkPut(dbPayments); }
        if (dbUsers && dbUsers.length > 0) {
          // Use DB users as-is — no INITIAL_USERS merging to avoid demo account pollution
          setUsers(dbUsers);
          try { localStorage.setItem('ap_users', JSON.stringify(dbUsers)); } catch {}
          db.users.bulkPut(dbUsers);
        }
      } catch (err) {
        console.error('Failed to load initial data from Supabase, using localStorage:', err);
      }
    };

    loadDataFromSupabase();
  }, []);

  // Fetch backend persisted domain stores on startup (only if Supabase is NOT configured)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      fetch('/api/activities')
        .then(res => res.json())
        .then(serverActivities => {
          if (Array.isArray(serverActivities) && serverActivities.length > 0) {
            setActivities(prev => {
              const map = new Map<string, Activity>();
              serverActivities.forEach((sa: Activity) => map.set(sa.id, sa));
              prev.forEach(existing => map.set(existing.id, existing));
              const mergedList = Array.from(map.values());
              try {
                localStorage.setItem('ap_activities', JSON.stringify(mergedList));
              } catch (err) {}
              return mergedList;
            });
          }
        })
        .catch(err => console.warn('[frontend] Backend activities sync not available:', err));
    }

    fetch('/api/menu-items')
      .then(res => res.json())
      .then(items => { if (Array.isArray(items) && items.length > 0) setMenuItems(items); })
      .catch(() => {});

    fetch('/api/vendors')
      .then(res => res.json())
      .then(v => { if (Array.isArray(v) && v.length > 0) setVendors(v); })
      .catch(() => {});

    fetch('/api/inventory')
      .then(res => res.json())
      .then(inv => { if (Array.isArray(inv) && inv.length > 0) setInventory(inv); })
      .catch(() => {});

    fetch('/api/users')
      .then(res => res.json())
      .then(u => {
        if (Array.isArray(u) && u.length > 0) {
          setUsers(prev => {
            const mergedUsers = [...u];
            prev.forEach(pu => {
              if (!mergedUsers.some(mu => mu.email.toLowerCase() === pu.email.toLowerCase())) {
                mergedUsers.push(pu);
              }
            });
            return mergedUsers;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Save states on updates to localStorage and backend API
  useEffect(() => { 
    localStorage.setItem('ap_users', JSON.stringify(users));
    fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(users) }).catch(() => {});
  }, [users]);
  useEffect(() => { 
    try {
      localStorage.setItem('ap_activities', JSON.stringify(activities));
    } catch (err) {
      console.warn('[frontend] localStorage quota exception for activities:', err);
    }
    // Persist activities array to backend API
    fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activities)
    }).catch(() => {});
  }, [activities]);
  useEffect(() => { 
    localStorage.setItem('ap_vendors', JSON.stringify(vendors));
    fetch('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vendors) }).catch(() => {});
  }, [vendors]);
  useEffect(() => { 
    localStorage.setItem('ap_menu_items', JSON.stringify(menuItems));
    fetch('/api/menu-items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(menuItems) }).catch(() => {});
  }, [menuItems]);
  useEffect(() => { 
    localStorage.setItem('ap_inventory', JSON.stringify(inventory));
    fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inventory) }).catch(() => {});
  }, [inventory]);
  useEffect(() => { localStorage.setItem('ap_bookings', JSON.stringify(bookings)); }, [bookings]);
  useEffect(() => { localStorage.setItem('ap_tickets', JSON.stringify(tickets)); }, [tickets]);
  useEffect(() => { localStorage.setItem('ap_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('ap_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('ap_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('ap_karts', JSON.stringify(karts)); }, [karts]);
  useEffect(() => { localStorage.setItem('ap_sessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('ap_lapRecords', JSON.stringify(lapRecords)); }, [lapRecords]);
  useEffect(() => { localStorage.setItem('ap_waivers', JSON.stringify(waivers)); }, [waivers]);

  useEffect(() => {
    localStorage.setItem('ap_selected_vendor_id', selectedVendorId);
  }, [selectedVendorId]);

  // -----------------------------------------------------------------
  // GO KARTING ACTIONS
  // -----------------------------------------------------------------
  const updateKartStatus = (kartId: string, status: KartStatus, driverId?: string, sessionId?: string) => {
    setKarts(prev => prev.map(k => k.id === kartId ? { ...k, status, currentDriverId: driverId, assignedSessionId: sessionId } : k));
  };

  const createGoKartingSession = (sessionData: Omit<GoKartingSession, 'id'>) => {
    const newSession: GoKartingSession = {
      ...sessionData,
      id: `sess-${Date.now()}`
    };
    setSessions(prev => [...prev, newSession]);
  };

  const updateSessionStatus = (sessionId: string, status: SessionStatus) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const updates: Partial<GoKartingSession> = { status };
      if (status === 'Active') updates.startTime = new Date().toISOString();
      if (status === 'Completed' || status === 'Paused') updates.endTime = new Date().toISOString();
      return { ...s, ...updates };
    }));
  };

  const recordLapTime = (lapData: Omit<LapRecord, 'id'>) => {
    const newLap: LapRecord = {
      ...lapData,
      id: `lap-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    setLapRecords(prev => [...prev, newLap]);
  };

  const submitWaiver = (waiverData: Omit<GoKartingWaiver, 'id'>) => {
    const newWaiver: GoKartingWaiver = {
      ...waiverData,
      id: `waiver-${Date.now()}`
    };
    setWaivers(prev => [...prev, newWaiver]);
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
    const newAct: Activity = {
      ...act,
      id: `act-dynamic-${Date.now()}`
    };
    setActivities(prev => {
      const updatedList = [...prev, newAct];
      persistActivities(updatedList);
      return updatedList;
    });

    if (isSupabaseConfigured) {
      writeToLocalAndSync('activities', 'insert', newAct);
    }

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
    fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedList)
    }).catch(err => console.warn('[frontend] Failed to sync activities to backend:', err));
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

    if (isSupabaseConfigured) {
      // 2. Fetch current record to audit price changes
      const { data: oldDbAct } = await supabase!.from('activities').select('*').eq('id', act.id).single();

      // 3. Write directly to Supabase using UPSERT (handles existing rows and missing rows seamlessly)
      const strictBasePayload = {
        id: act.id,
        name: act.name,
        description: act.description,
        adultPrice: act.adultPrice,
        childPrice: act.childPrice,
        image: act.image,
        dailyLimit: act.dailyLimit,
        safetyInstructions: act.safetyInstructions,
        packages: act.packages,
        type: act.type
      };

      let { data: updatedDbRow, error } = await supabase!
        .from('activities')
        .upsert(act, { onConflict: 'id' })
        .select()
        .single();

      // If full payload fails due to schema/column mismatch or constraint, fall back to strict base columns with upsert
      if (error) {
        console.warn('[updateActivity] Full upsert failed, falling back to strict base columns:', error.message);
        const fallbackRes = await supabase!
          .from('activities')
          .upsert(strictBasePayload, { onConflict: 'id' })
          .select()
          .single();
        
        updatedDbRow = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.error('[updateActivity] Database upsert failed:', error);
        throw new Error(`Failed to save package changes to database: ${error.message}`);
      }

      // 4. Audit Log price modifications
      if (oldDbAct && act.packages && oldDbAct.packages) {
        const oldPackagesMap = new Map<string, number>();
        (oldDbAct.packages as ActivityPackage[]).forEach((p: ActivityPackage) => oldPackagesMap.set(p.id, p.price));

        for (const pkg of act.packages) {
          const oldPrice = oldPackagesMap.get(pkg.id);
          if (oldPrice !== undefined && oldPrice !== pkg.price) {
            try {
              await supabase!.from('package_price_history').insert({
                activity_id: act.id,
                package_id: pkg.id,
                package_name: pkg.name,
                old_price: oldPrice,
                new_price: pkg.price,
                changed_by: currentUser?.name || currentUser?.email || 'admin',
                changed_at: new Date().toISOString()
              });
            } catch (e) {
              console.warn('[audit-log] Price history insert error:', e);
            }
          }
        }
      }

      // 5. Refetch fresh data from DB to confirm application state
      await refetchActivitiesFromDatabase();
      return updatedDbRow || act;
    }

    // Local server mode fallback
    setActivities(prev => {
      const updatedList = prev.map(item => item.id === act.id ? act : item);
      persistActivities(updatedList);
      return updatedList;
    });

    return act;
  };

  const deleteActivity = (id: string) => {
    setActivities(prev => {
      const updatedList = prev.filter(item => item.id !== id);
      persistActivities(updatedList);
      return updatedList;
    });

    if (isSupabaseConfigured) {
      writeToLocalAndSync('activities', 'delete', { id });
    }
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
        const updated = { ...act, photos: [...existingPhotos, newPhoto] };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
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
          coverPhotoId: act.coverPhotoId === photoId ? undefined : act.coverPhotoId
        };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
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
        const updated = { ...act, photos: reorderedPhotos.map((p, idx) => ({ ...p, order: idx })) };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
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
          // Also update the main image to the selected cover photo
          image: photo ? photo.url : act.image
        };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
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
        const updated = { ...act, ...fields };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
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
        const updated = { ...act, offers: [...(act.offers || []), newOffer] };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
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
        const updated = { ...act, offers: (act.offers || []).map(o => o.id === offer.id ? offer : o) };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
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
        const updated = { ...act, offers: (act.offers || []).filter(o => o.id !== offerId) };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
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
        const updated = { ...act, offers: (act.offers || []).map(o => o.id === offerId ? { ...o, isActive: active } : o) };
        if (isSupabaseConfigured) writeToLocalAndSync('activities', 'update', updated);
        return updated;
      });
      persistActivities(updatedList);
      return updatedList;
    });
  };

  // User Management
  const updateUserRole = (userId: string, role: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    if (isSupabaseConfigured) {
      writeToLocalAndSync('users', 'update', { id: userId, role });
    }
  };

  const addUser = (userData: User | Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: ('id' in userData && userData.id) ? userData.id : `usr-cust-${Date.now()}`
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
      } catch (err) {
        console.warn('[frontend] Failed to save users to localStorage:', err);
      }
      return updated;
    });

    if (isSupabaseConfigured) {
      writeToLocalAndSync('users', 'insert', newUser);
    }
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
      unitPrice: selectedUnitPrice
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
        unitPrice: selectedUnitPrice
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
      paid_at: isPending ? undefined : timestamp,
      ticketId: `tkt-${bookingId}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      activityName: data.activityName,
      counterId: currentUser && currentUser.role !== 'customer' ? 'counter_1' : 'online',
      staffId: currentUser?.role !== 'customer' ? currentUser?.id : undefined
    };

    setBookings(prev => [newBooking, ...prev]);
    if (newTicket) {
      setTickets(prev => [newTicket!, ...prev]);
    }
    setPayments(prev => [newPayment, ...prev]);

    if (isSupabaseConfigured) {
      writeToLocalAndSync('bookings', 'insert', newBooking);
      if (newTicket) {
        writeToLocalAndSync('tickets', 'insert', newTicket);
      }
      writeToLocalAndSync('payments', 'insert', newPayment);
    }

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

    const payment = payments.find(p => p.bookingId === bookingId && p.status === 'pending');

    const updatedBooking: Booking = {
      ...booking,
      paymentStatus: 'paid',
      status: 'confirmed'
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
        status: 'valid'
      };
      setTickets(prev => [newTicket!, ...prev]);
      if (isSupabaseConfigured) {
        writeToLocalAndSync('tickets', 'insert', newTicket);
      }
    }

    if (payment) {
      const updatedPayment: Payment = {
        ...payment,
        status: 'paid',
        timestamp: new Date().toISOString(),
        payment_status: 'PAID',
        paid_at: new Date().toISOString()
      };
      setPayments(prev => prev.map(p => p.id === payment.id ? updatedPayment : p));
      
      if (isSupabaseConfigured) {
        writeToLocalAndSync('payments', 'update', updatedPayment);
      }
    }

    if (isSupabaseConfigured) {
      writeToLocalAndSync('bookings', 'update', updatedBooking);
    }

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
      status: finalStatus === 'paid' ? 'confirmed' : 'reserved'
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
        status: 'valid'
      };
      setTickets(prev => [newTicket!, ...prev]);
      if (isSupabaseConfigured) {
        writeToLocalAndSync('tickets', 'insert', newTicket);
      }
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

    if (isSupabaseConfigured && finalPaymentRecord) {
      writeToLocalAndSync('payments', 'update', finalPaymentRecord);
    }

    if (isSupabaseConfigured) writeToLocalAndSync('bookings', 'update', updatedBooking);

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
    if (isSupabaseConfigured) writeToLocalAndSync('bookings', 'update', updatedBooking);

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
        if (isSupabaseConfigured) writeToLocalAndSync('tickets', 'update', updatedTicket);
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
      if (isSupabaseConfigured) writeToLocalAndSync('payments', 'update', updatedPayment);
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

    // Update ticket to 'used'
    const updatedTicket: Ticket = {
      ...foundTicket,
      status: 'used',
      scannedAt: new Date().toISOString(),
      scannedBy: staffName
    };

    setTickets(prev => prev.map(t => t.id === foundTicket.id ? updatedTicket : t));

    if (isSupabaseConfigured) {
      writeToLocalAndSync('tickets', 'update', updatedTicket);
    }
    
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
    const newVendor: FoodVendor = {
      ...v,
      id: `vendor-dynamic-${Date.now()}`
    };
    setVendors(prev => [...prev, newVendor]);

    if (isSupabaseConfigured) {
      writeToLocalAndSync('vendors', 'insert', newVendor);
    }

    sendMockNotification(
      'admin@adventurepark.com',
      'New Stall Assigned',
      `Vendor stall "${newVendor.name}" has been registered under Stall number ${newVendor.stallNumber}.`,
      'email'
    );
  };

  const updateVendor = (v: FoodVendor) => {
    setVendors(prev => prev.map(item => item.id === v.id ? v : item));

    if (isSupabaseConfigured) {
      writeToLocalAndSync('vendors', 'update', v);
    }
  };

  const deleteVendor = (id: string) => {
    setVendors(prev => prev.filter(item => item.id !== id));

    if (isSupabaseConfigured) {
      writeToLocalAndSync('vendors', 'delete', { id });
    }
  };

  // Menu Actions
  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: `menu-dynamic-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    setMenuItems(prev => {
      const updated = [...prev, newItem];
      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (isSupabaseConfigured) {
      writeToLocalAndSync('menuItems', 'insert', newItem);
    }
  };

  const addBulkMenuItems = (items: Array<Omit<MenuItem, 'id'>>) => {
    const newItems: MenuItem[] = items.map((item, idx) => ({
      ...item,
      id: `menu-dynamic-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`
    }));

    setMenuItems(prev => {
      const updated = [...prev, ...newItems];
      try {
        localStorage.setItem('ap_menu_items', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (isSupabaseConfigured) {
      newItems.forEach(item => writeToLocalAndSync('menuItems', 'insert', item));
    }
  };

  const updateMenuItem = (item: MenuItem) => {
    setMenuItems(prev => prev.map(m => m.id === item.id ? item : m));

    if (isSupabaseConfigured) {
      writeToLocalAndSync('menuItems', 'update', item);
    }
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== id));

    if (isSupabaseConfigured) {
      writeToLocalAndSync('menuItems', 'delete', { id });
    }
  };

  // Inventory Management
  const updateInventoryStock = (id: string, amount: number, mode: 'set' | 'adjust') => {
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const nextStock = mode === 'set' ? amount : item.currentStock + amount;
        const boundedStock = Math.max(0, nextStock);

        if (isSupabaseConfigured) {
          writeToLocalAndSync('inventory', 'update', { id, currentStock: boundedStock });
        }

        // Check if stock dips below minimum level
        if (boundedStock <= item.minStockLevel && item.currentStock > item.minStockLevel) {
          const ownerEmail = vendors.find(v => v.id === item.vendorId)?.ownerName.toLowerCase().replace(' ', '') + '@example.com';
          sendMockNotification(
            ownerEmail || 'vendor@example.com',
            'âš ï¸ CRITICAL: Low Stock Alert!',
            `Ingredient "${item.name}" has reached low stock: ${boundedStock} ${item.unit} remaining. Minimum alert level: ${item.minStockLevel} ${item.unit}. Please purchase restocking items!`,
            'email'
          );
        }

        return { ...item, currentStock: boundedStock };
      }
      return item;
    }));
  };

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...item,
      id: `inv-dynamic-${Date.now()}`
    };
    setInventory(prev => [...prev, newItem]);

    if (isSupabaseConfigured) {
      writeToLocalAndSync('inventory', 'insert', newItem);
    }
  };

  // Food Cart Actions
  const addToFoodCart = (item: MenuItem, quantity: number) => {
    setFoodCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
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

  // Submit Food Order (Single checkout supporting multi-vendor list)
  const submitFoodOrder = (customerName: string, customerEmail: string, paymentMethod: 'upi' | 'card' | 'net_banking' | 'cash') => {
    if (foodCart.length === 0) throw new Error('Cart is empty');

    const orderId = generateOfflineId('ord');
    const txId = generateOfflineId('tx');
    const timestamp = new Date().toISOString();
    const totalAmount = foodCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const newOrder: FoodOrder = {
      id: orderId,
      customerName,
      customerEmail,
      items: [...foodCart],
      totalAmount,
      status: 'pending',
      paymentStatus: 'paid',
      createdAt: timestamp
    };

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      orderId,
      amount: totalAmount,
      method: paymentMethod,
      status: 'success',
      transactionId: txId,
      timestamp
    };

    setOrders(prev => [newOrder, ...prev]);
    setPayments(prev => [newPayment, ...prev]);

    if (isSupabaseConfigured) {
      writeToLocalAndSync('orders', 'insert', newOrder);
    writeToLocalAndSync('payments', 'insert', newPayment);
    }

    // Reduce inventory stocks & direct menu item stock quantity for ordering simulation
    setMenuItems(prev => prev.map(m => {
      const cartItem = foodCart.find(ci => ci.menuItemId === m.id);
      if (cartItem && m.stockQuantity !== undefined) {
        const newQty = Math.max(0, m.stockQuantity - cartItem.quantity);
        return {
          ...m,
          stockQuantity: newQty,
          isAvailable: newQty > 0 ? m.isAvailable : false
        };
      }
      return m;
    }));

    foodCart.forEach(cartItem => {
      // Find matches in inventory (fuzzy lookup name or category)
      const matchingIngredients = inventory.filter(inv => 
        inv.vendorId === cartItem.vendorId && 
        (cartItem.name.toLowerCase().includes(inv.name.split(' ')[0].toLowerCase()) || 
         inv.name.toLowerCase().includes('bun') && cartItem.name.toLowerCase().includes('burger') ||
         inv.name.toLowerCase().includes('coffee') && cartItem.name.toLowerCase().includes('espresso') ||
         inv.name.toLowerCase().includes('milk') && cartItem.name.toLowerCase().includes('latte'))
      );

      matchingIngredients.forEach(ing => {
        // Deduct stock proportionally
        updateInventoryStock(ing.id, -cartItem.quantity, 'adjust');
      });
    });

    clearFoodCart();

    // Notify Customer & Stall owners
    sendMockNotification(
      customerEmail,
      'Food Order Received! ðŸ”â˜•',
      `Your order ${orderId} has been successfully placed at Food Street. Total amount: ₹${totalAmount.toFixed(2)}. Stalls are preparing your fresh items!`,
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
          'ðŸ”” New Live Food Order!',
          `Hey ${v.ownerName}, you have a new incoming order (${orderId}) at ${v.name}. Open your vendor panel to start preparing.`,
          'email'
        );
      }
    });

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, status };

        if (isSupabaseConfigured) {
          writeToLocalAndSync('orders', 'update', { id: orderId, status });
        }

        let title = '';
        let body = '';

        if (status === 'preparing') {
          title = 'Chef is Preparing Your Food! ðŸ‘¨â€ðŸ³';
          body = `Hi ${o.customerName}, your food order ${orderId} is now actively being prepared by our chefs.`;
        } else if (status === 'ready') {
          title = 'Food Order is Ready to Collect! ðŸ›Žï¸';
          body = `Hi ${o.customerName}, great news! Your food order ${orderId} is fresh, hot, and ready for pickup at the food street. Bring your order ID!`;
        } else if (status === 'delivered') {
          title = 'Food Delivered! Bon AppÃ©tit! ðŸ˜‹';
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

      updateInventoryStock,
      addInventoryItem,

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

