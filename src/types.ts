/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super_admin' | 'activity_staff' | 'food_vendor' | 'customer' | 'go_karting_manager' | 'go_karting_staff' | 'ticket_counter_staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  vendorId?: string; // If role is 'food_vendor'
}

export interface ActivityPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  shots?: number;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  adultPrice?: number;
  childPrice?: number;
  image: string;
  dailyLimit: number;
  safetyInstructions: string[];
  packages?: ActivityPackage[];
  type: 'horse_riding' | 'shooting' | 'go_karting' | 'dynamic';
}

export interface Booking {
  id: string;
  customerName: string; customerPhone?: string;
  customerEmail: string;
  activityId: string;
  activityName: string;
  date: string;
  timeSlot: string;
  ticketType: 'standard' | 'package';
  details: string; // e.g. "2x Adult, 1x Child" or "Package: Sharp Shooter (25 shots)"
  quantity: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'paid';
  bookingDate: string;
  status?: 'confirmed' | 'reserved';
}

export interface Ticket {
  id: string;
  bookingId: string;
  customerName: string; customerPhone?: string;
  customerEmail: string;
  activityId: string;
  activityName: string;
  date: string;
  timeSlot: string;
  ticketType: string;
  quantity: number;
  qrCodeValue: string;
  status: 'valid' | 'used';
  scannedAt?: string;
  scannedBy?: string;
}

export interface FoodVendor {
  id: string;
  name: string;
  type: 'cafe' | 'fast_food' | 'juice' | 'ice_cream';
  image: string;
  ownerName: string;
  stallNumber: string;
}

export interface MenuItem {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  image: string;
}

export interface FoodOrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface FoodOrder {
  id: string;
  customerName: string; customerPhone?: string;
  customerEmail: string;
  items: FoodOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  vendorId: string;
  name: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
}

export interface Payment {
  id: string;
  orderId?: string;
  bookingId?: string;
  amount: number;
  method: 'upi' | 'card' | 'net_banking' | 'cash';
  status: 'success' | 'failed' | 'pending';
  transactionId: string;
  timestamp: string;
}

export interface NotificationLog {
  id: string;
  recipient: string;
  title: string;
  body: string;
  channel: 'email' | 'sms' | 'whatsapp';
  sentAt: string;
}

// ==========================================
// GO KARTING OPERATIONS MODULE TYPES
// ==========================================

export interface GoKartingBooking extends Booking {
  riderAge: number;
  riderGender?: string;
  emergencyContact: string;
  sessionDuration: number; // in minutes
  sessionType: 'standard' | 'pro' | 'endurance';
  waiverSigned: boolean;
}

export type KartStatus = 'Available' | 'Reserved' | 'On Track' | 'Maintenance' | 'Out of Service';

export interface Kart {
  id: string;
  kartNumber: string;
  status: KartStatus;
  currentDriverId?: string;
  assignedSessionId?: string;
}

export type SessionStatus = 'Scheduled' | 'Active' | 'Paused' | 'Completed';

export interface GoKartingSession {
  id: string;
  name: string;
  status: SessionStatus;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  riders: string[]; // Driver IDs
  kartAssignments: Record<string, string>; // RiderID -> KartID
}

export interface LapRecord {
  id: string;
  sessionId: string;
  driverId: string;
  driverName: string;
  kartNumber: string;
  lapTime: number; // in milliseconds
  lapNumber: number;
  isFastestLap: boolean;
  timestamp: string;
}

export interface GoKartingWaiver {
  id: string;
  ticketId: string;
  riderName: string;
  digitalSignature: string; // base64 or URL
  acceptedTerms: boolean;
  timestamp: string;
  verifiedByStaffId?: string;
}
