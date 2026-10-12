import Dexie, { Table } from 'dexie';
import { 
  User, Activity, FoodVendor, MenuItem, InventoryItem, 
  Booking, Ticket, FoodOrder, Payment, NotificationLog,
  Kart, GoKartingSession, LapRecord, GoKartingWaiver
} from '../types';

export interface SyncQueueItem {
  id?: number; // Auto-incremented local ID
  table: string;
  action: 'insert' | 'update' | 'delete';
  payload: any;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  retryCount: number;
  error?: string;
  createdAt: string;
  updatedAt?: string;
  lockedAt?: string | null;
}

export class AppDB extends Dexie {
  users!: Table<User, string>;
  activities!: Table<Activity, string>;
  vendors!: Table<FoodVendor, string>;
  menuItems!: Table<MenuItem, string>;
  inventory!: Table<InventoryItem, string>;
  bookings!: Table<Booking, string>;
  tickets!: Table<Ticket, string>;
  orders!: Table<FoodOrder, string>;
  notifications!: Table<NotificationLog, string>;
  payments!: Table<Payment, string>;
  karts!: Table<Kart, string>;
  sessions!: Table<GoKartingSession, string>;
  lapRecords!: Table<LapRecord, string>;
  waivers!: Table<GoKartingWaiver, string>;
  purchases!: Table<any, string>;

  staffAttendance!: Table<any, string>;
  staffSalaryPayments!: Table<any, string>;
  foodStreetPurchases!: Table<any, string>;
  stockMovements!: Table<any, string>;
  menuItemRecipes!: Table<any, string>;
  shifts!: Table<any, string>;
  leaveRequests!: Table<any, string>;

  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('DeuceOfflineDB');
    this.version(2).stores({
      users: 'id, role, email',
      activities: 'id, type',
      vendors: 'id, type',
      menuItems: 'id, vendorId, category',
      inventory: 'id, vendorId',
      bookings: 'id, activityId, customerEmail, date',
      tickets: 'id, bookingId, qrCodeValue, status',
      orders: 'id, customerEmail, status',
      notifications: 'id, recipient, channel',
      payments: 'id, bookingId, orderId, status',
      karts: 'id, status',
      sessions: 'id, status',
      lapRecords: 'id, sessionId, driverId',
      waivers: 'id, ticketId',
      syncQueue: '++id, table, action, status, createdAt'
    });
    // Version 3: add purchases table for activity-wise expense management
    this.version(3).stores({
      users: 'id, role, email',
      activities: 'id, type',
      vendors: 'id, type',
      menuItems: 'id, vendorId, category',
      inventory: 'id, vendorId',
      bookings: 'id, activityId, customerEmail, date',
      tickets: 'id, bookingId, qrCodeValue, status',
      orders: 'id, customerEmail, status',
      notifications: 'id, recipient, channel',
      payments: 'id, bookingId, orderId, status',
      karts: 'id, status',
      sessions: 'id, status',
      lapRecords: 'id, sessionId, driverId',
      waivers: 'id, ticketId',
      purchases: 'id, department, category, supplier, date, paymentStatus',
      syncQueue: '++id, table, action, status, createdAt'
    });
    // Version 4: add staffAttendance and staffSalaryPayments tables
    this.version(4).stores({
      users: 'id, role, email',
      activities: 'id, type',
      vendors: 'id, type',
      menuItems: 'id, vendorId, category',
      inventory: 'id, vendorId',
      bookings: 'id, activityId, customerEmail, date',
      tickets: 'id, bookingId, qrCodeValue, status',
      orders: 'id, customerEmail, status',
      notifications: 'id, recipient, channel',
      payments: 'id, bookingId, orderId, status',
      karts: 'id, status',
      sessions: 'id, status',
      lapRecords: 'id, sessionId, driverId',
      waivers: 'id, ticketId',
      purchases: 'id, department, category, supplier, date, paymentStatus',
      staffAttendance: 'id, staffId, date, status',
      staffSalaryPayments: 'id, staffId, month, paymentStatus',
      syncQueue: '++id, table, action, status, createdAt'
    });
    // Version 5: add foodStreetPurchases, stockMovements, menuItemRecipes
    this.version(5).stores({
      users: 'id, role, email',
      activities: 'id, type',
      vendors: 'id, type',
      menuItems: 'id, vendorId, category',
      inventory: 'id, vendorId, name',
      bookings: 'id, activityId, customerEmail, date',
      tickets: 'id, bookingId, qrCodeValue, status',
      orders: 'id, customerEmail, status',
      notifications: 'id, recipient, channel',
      payments: 'id, bookingId, orderId, status',
      karts: 'id, status',
      sessions: 'id, status',
      lapRecords: 'id, sessionId, driverId',
      waivers: 'id, ticketId',
      purchases: 'id, department, category, supplier, date, paymentStatus',
      staffAttendance: 'id, staffId, date, status',
      staffSalaryPayments: 'id, staffId, month, paymentStatus',
      foodStreetPurchases: 'id, vendorId, purchaseDate, status, supplierName',
      stockMovements: 'id, itemId, vendorId, type, timestamp',
      menuItemRecipes: 'menuItemId',
      syncQueue: '++id, table, action, status, createdAt'
    });
    // Version 6: add shifts, leaveRequests
    this.version(6).stores({
      users: 'id, role, email, employeeId, department',
      activities: 'id, type',
      vendors: 'id, type',
      menuItems: 'id, vendorId, category',
      inventory: 'id, vendorId, name',
      bookings: 'id, activityId, customerEmail, date',
      tickets: 'id, bookingId, qrCodeValue, status',
      orders: 'id, customerEmail, status',
      notifications: 'id, recipient, channel',
      payments: 'id, bookingId, orderId, status',
      karts: 'id, status',
      sessions: 'id, status',
      lapRecords: 'id, sessionId, driverId',
      waivers: 'id, ticketId',
      purchases: 'id, department, category, supplier, date, paymentStatus',
      staffAttendance: 'id, staffId, date, status',
      staffSalaryPayments: 'id, staffId, month, paymentStatus',
      foodStreetPurchases: 'id, vendorId, purchaseDate, status, supplierName',
      stockMovements: 'id, itemId, vendorId, type, timestamp',
      menuItemRecipes: 'menuItemId',
      shifts: 'id, name, isActive',
      leaveRequests: 'id, staffId, startDate, status',
      syncQueue: '++id, table, action, status, createdAt'
    });
  }
}

export const db = new AppDB();

