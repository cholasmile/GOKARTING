/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, UserRole, Activity, FoodVendor, MenuItem, 
  InventoryItem, Booking, Ticket, FoodOrder, Payment, 
  NotificationLog, OrderStatus, FoodOrderItem, ActivityPackage,
  Kart, GoKartingSession, LapRecord, GoKartingWaiver, KartStatus, SessionStatus
} from '../types';
import { 
  INITIAL_ACTIVITIES, INITIAL_FOOD_VENDORS, INITIAL_MENU_ITEMS, 
  INITIAL_INVENTORY, INITIAL_BOOKINGS, INITIAL_TICKETS, INITIAL_FOOD_ORDERS,
  INITIAL_USERS
} from '../data/initialData';
import { mockKarts, mockSessions, mockLapRecords } from '../data/kartingMockData';
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

  // Mutators - Activities
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (activity: Activity) => void;
  deleteActivity: (id: string) => void;

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
    ticketType: 'standard' | 'package';
    details: string;
    quantity: number;
    totalAmount: number;
    paymentMethod: 'upi' | 'card' | 'net_banking' | 'cash';
  }) => { booking: Booking; ticket: Ticket; payment: Payment } | string;

  markBookingAsPaid: (bookingId: string, staffName: string) => { success: boolean; message: string };

  scanTicket: (qrValue: string, staffName: string) => { success: boolean; message: string; ticket?: Ticket; isPendingPayment?: boolean; bookingId?: string };

  // Mutators - Vendors
  addVendor: (vendor: Omit<FoodVendor, 'id'>) => void;
  updateVendor: (vendor: FoodVendor) => void;
  deleteVendor: (id: string) => void;

  // Mutators - Menu Items
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
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

const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM'
];

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

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Sync Status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const unsubscribe = syncEngine.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingSyncCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const [selectedVendorId, setSelectedVendorId] = useState<string>(() => {
    const saved = localStorage.getItem('ap_selected_vendor_id');
    return saved || 'vendor-forest-cafe';
  });

  // Load standard states with localStorage persistence synchronously to prevent empty first-render crashes
  const [users, setUsers] = useState<User[]>(() => localLoadHelper('ap_users', INITIAL_USERS));
  const [activities, setActivities] = useState<Activity[]>(() => localLoadHelper('ap_activities', INITIAL_ACTIVITIES));
  const [vendors, setVendors] = useState<FoodVendor[]>(() => localLoadHelper('ap_vendors', INITIAL_FOOD_VENDORS));
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => localLoadHelper('ap_menu_items', INITIAL_MENU_ITEMS));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => localLoadHelper('ap_inventory', INITIAL_INVENTORY));
  const [bookings, setBookings] = useState<Booking[]>(() => localLoadHelper('ap_bookings', INITIAL_BOOKINGS));
  const [tickets, setTickets] = useState<Ticket[]>(() => localLoadHelper('ap_tickets', INITIAL_TICKETS));
  const [orders, setOrders] = useState<FoodOrder[]>(() => localLoadHelper('ap_orders', INITIAL_FOOD_ORDERS));
  const [notifications, setNotifications] = useState<NotificationLog[]>(() => localLoadHelper('ap_notifications', []));
  const [payments, setPayments] = useState<Payment[]>(() => localLoadHelper('ap_payments', []));

  // Go Karting specific states
  const [karts, setKarts] = useState<Kart[]>(() => localLoadHelper('ap_karts', mockKarts));
  const [sessions, setSessions] = useState<GoKartingSession[]>(() => localLoadHelper('ap_sessions', mockSessions));
  const [lapRecords, setLapRecords] = useState<LapRecord[]>(() => localLoadHelper('ap_lapRecords', mockLapRecords));
  const [waivers, setWaivers] = useState<GoKartingWaiver[]>(() => localLoadHelper('ap_waivers', []));

  // Cart state (transient, kept in memory/session)
  const [foodCart, setFoodCart] = useState<FoodOrderItem[]>([]);

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

        if (dbActivities && dbActivities.length > 0) { setActivities(dbActivities); db.activities.bulkPut(dbActivities); }
        if (dbVendors && dbVendors.length > 0) { setVendors(dbVendors); db.vendors.bulkPut(dbVendors); }
        if (dbMenuItems && dbMenuItems.length > 0) { setMenuItems(dbMenuItems); db.menuItems.bulkPut(dbMenuItems); }
        if (dbInventory && dbInventory.length > 0) { setInventory(dbInventory); db.inventory.bulkPut(dbInventory); }
        if (dbBookings && dbBookings.length > 0) { setBookings(dbBookings); db.bookings.bulkPut(dbBookings); }
        if (dbTickets && dbTickets.length > 0) { setTickets(dbTickets); db.tickets.bulkPut(dbTickets); }
        if (dbOrders && dbOrders.length > 0) { setOrders(dbOrders); db.orders.bulkPut(dbOrders); }
        if (dbNotifications && dbNotifications.length > 0) { setNotifications(dbNotifications); db.notifications.bulkPut(dbNotifications); }
        if (dbPayments && dbPayments.length > 0) { setPayments(dbPayments); db.payments.bulkPut(dbPayments); }
        if (dbUsers && dbUsers.length > 0) { setUsers(dbUsers); db.users.bulkPut(dbUsers); }
      } catch (err) {
        console.error('Failed to load initial data from Supabase, using localStorage:', err);
      }
    };

    loadDataFromSupabase();
  }, []);

  // Save states on updates to localStorage
  useEffect(() => { localStorage.setItem('ap_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('ap_activities', JSON.stringify(activities)); }, [activities]);
  useEffect(() => { localStorage.setItem('ap_vendors', JSON.stringify(vendors)); }, [vendors]);
  useEffect(() => { localStorage.setItem('ap_menu_items', JSON.stringify(menuItems)); }, [menuItems]);
  useEffect(() => { localStorage.setItem('ap_inventory', JSON.stringify(inventory)); }, [inventory]);
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
    const newLog: NotificationLog = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipient,
      title,
      body,
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
    setActivities(prev => [...prev, newAct]);

    if (isSupabaseConfigured) {
      writeToLocalAndSync('activities', 'insert', newAct);
    }

    sendMockNotification(
      'admin@adventurepark.com',
      'New Activity Configured',
      `Activity "${newAct.name}" has been successfully added to the park dynamic list.`,
      'email'
    );
  };

  const updateActivity = (act: Activity) => {
    setActivities(prev => prev.map(item => item.id === act.id ? act : item));

    if (isSupabaseConfigured) {
      writeToLocalAndSync('activities', 'update', act);
    }
  };

  const deleteActivity = (id: string) => {
    setActivities(prev => prev.filter(item => item.id !== id));

    if (isSupabaseConfigured) {
      writeToLocalAndSync('activities', 'delete', { id });
    }
  };

  // User Management
  const updateUserRole = (userId: string, role: UserRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    if (isSupabaseConfigured) {
      writeToLocalAndSync('users', 'update', { id: userId, role });
    }
  };

  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`
    };
    setUsers(prev => [...prev, newUser]);
    
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
    ticketType: 'standard' | 'package';
    details: string;
    quantity: number;
    totalAmount: number;
    paymentMethod: 'upi' | 'card' | 'net_banking' | 'cash';
  }) => {
    // 1. Validation: Capacity checks
    const targetActivity = activities.find(a => a.id === data.activityId);
    if (!targetActivity) return 'Activity not found';

    // Count existing bookings for this date and time slot
    const existingBookedCount = bookings
      .filter(b => b.activityId === data.activityId && b.date === data.date && b.timeSlot === data.timeSlot)
      .reduce((sum, b) => sum + b.quantity, 0);

    // Limit check
    const perSlotCapacity = Math.ceil(targetActivity.dailyLimit / TIME_SLOTS.length);
    if (existingBookedCount + data.quantity > perSlotCapacity) {
      return `Booking limit exceeded for this slot. Only ${perSlotCapacity - existingBookedCount} spots remaining.`;
    }

    const bookingId = generateOfflineId('bk');
    const txId = generateOfflineId('tx');
    const timestamp = new Date().toISOString();

    const isCash = data.paymentMethod === 'cash';

    // 2. Create Booking
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
      details: data.details,
      quantity: data.quantity,
      totalAmount: data.totalAmount,
      paymentStatus: isCash ? 'pending' : 'paid',
      status: isCash ? 'reserved' : 'confirmed',
      bookingDate: timestamp
    };

    // 3. Create Ticket
    const newTicket: Ticket = {
      id: `tkt-${bookingId}`,
      bookingId: bookingId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      activityId: data.activityId,
      activityName: data.activityName,
      date: data.date,
      timeSlot: data.timeSlot,
      ticketType: data.details,
      quantity: data.quantity,
      qrCodeValue: `adventure-park-ticket-${bookingId}`,
      status: 'valid'
    };

    // 4. Create Payment
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      bookingId: bookingId,
      amount: data.totalAmount,
      method: data.paymentMethod,
      status: isCash ? 'pending' : 'success',
      transactionId: txId,
      timestamp: timestamp
    };

    setBookings(prev => [newBooking, ...prev]);
    setTickets(prev => [newTicket, ...prev]);
    setPayments(prev => [newPayment, ...prev]);

    if (isSupabaseConfigured) {
      writeToLocalAndSync('bookings', 'insert', newBooking);
    writeToLocalAndSync('tickets', 'insert', newTicket);
    writeToLocalAndSync('payments', 'insert', newPayment);
    }

    // 5. Trigger Notifications on multiple channels!
    if (isCash) {
      sendMockNotification(
        data.customerEmail,
        'Adventure Park Reservation Confirmed (Payment Pending)',
        `Hi ${data.customerName}, your reservation for ${data.activityName} on ${data.date} (${data.timeSlot}) is reserved! Ticket ID: tkt-${bookingId}. Please arrive 30 minutes early to complete your payment of ₹${data.totalAmount} at the ticket counter.`,
        'email'
      );
      if (data.customerPhone) {
        sendMockNotification(
          data.customerPhone,
          'Reservation Copy',
          `Hi ${data.customerName}, your reservation for ${data.activityName} is saved! Ticket ID: tkt-${bookingId}. Payment of ₹${data.totalAmount} is pending at counter.`,
          'sms'
        );
      }
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
        sendMockNotification(
          data.customerPhone,
          'Your QR Ticket is Ready',
          `Hey ${data.customerName}! Get ready for adventure. Bring your ticket tkt-${bookingId} QR code to the entrance. Customer: ${data.customerName}, Mobile: ${data.customerPhone}.`,
          'whatsapp'
        );
      }
      sendMockNotification(
        data.customerEmail,
        'Ticket Receipt',
        `UPI/Card Payment of ₹${data.totalAmount} was processed successfully. Txn Ref: ${txId}.`,
        'sms'
      );
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

    if (payment) {
      const updatedPayment: Payment = {
        ...payment,
        status: 'success',
        timestamp: new Date().toISOString()
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

    return { success: true, message: 'Payment successfully recorded.' };
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
      id: `menu-dynamic-${Date.now()}`
    };
    setMenuItems(prev => [...prev, newItem]);

    if (isSupabaseConfigured) {
      writeToLocalAndSync('menuItems', 'insert', newItem);
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

    // Reduce inventory stocks for standard ordering simulation
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

  const resetAllData = () => {
    localStorage.removeItem('ap_activities');
    localStorage.removeItem('ap_vendors');
    localStorage.removeItem('ap_menu_items');
    localStorage.removeItem('ap_inventory');
    localStorage.removeItem('ap_bookings');
    localStorage.removeItem('ap_tickets');
    localStorage.removeItem('ap_orders');
    localStorage.removeItem('ap_notifications');
    localStorage.removeItem('ap_payments');

    setActivities(INITIAL_ACTIVITIES);
    setVendors(INITIAL_FOOD_VENDORS);
    setMenuItems(INITIAL_MENU_ITEMS);
    setInventory(INITIAL_INVENTORY);
    setBookings(INITIAL_BOOKINGS);
    setTickets(INITIAL_TICKETS);
    setOrders(INITIAL_FOOD_ORDERS);
    setNotifications([]);
    setPayments([]);
    setFoodCart([]);
    setUsers(INITIAL_USERS);

    if (isSupabaseConfigured) {
      writeToSupabase(
        Promise.all([
          supabase!.from('payments').delete().neq('id', ''),
          supabase!.from('tickets').delete().neq('id', ''),
          supabase!.from('bookings').delete().neq('id', ''),
          supabase!.from('food_orders').delete().neq('id', ''),
          supabase!.from('inventory').delete().neq('id', ''),
          supabase!.from('menu_items').delete().neq('id', ''),
          supabase!.from('food_vendors').delete().neq('id', ''),
          supabase!.from('activities').delete().neq('id', ''),
          supabase!.from('notifications').delete().neq('id', '')
        ]).then(() => {
          return Promise.all([
            supabase!.from('activities').insert(INITIAL_ACTIVITIES),
            supabase!.from('food_vendors').insert(INITIAL_FOOD_VENDORS),
            supabase!.from('menu_items').insert(INITIAL_MENU_ITEMS),
            supabase!.from('inventory').insert(INITIAL_INVENTORY),
            supabase!.from('bookings').insert(INITIAL_BOOKINGS),
            supabase!.from('tickets').insert(INITIAL_TICKETS),
            supabase!.from('food_orders').insert(INITIAL_FOOD_ORDERS)
          ]);
        }),
        'resetAllData'
      );
    }
    
    sendMockNotification(
      'admin@adventurepark.com',
      'System Database Reset Completed',
      'The multi-activity database and local storage states have been fully reset to factory settings.',
      'email'
    );
  };

  return (
    <AppContext.Provider value={{
      isOnline,
      syncStatus,
      pendingSyncCount,
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
      updateUserRole,
      addUser,
      
      createBooking,
      markBookingAsPaid,
      scanTicket,

      addVendor,
      updateVendor,
      deleteVendor,

      addMenuItem,
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

