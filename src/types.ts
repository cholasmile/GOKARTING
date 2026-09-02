/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super_admin' | 'activity_staff' | 'food_vendor' | 'cafe_staff' | 'customer' | 'go_karting_manager' | 'go_karting_staff' | 'ticket_counter_staff' | 'horse_riding_staff' | 'shooting_staff';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
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

// ==========================================
// ACTIVITY MANAGEMENT ENHANCEMENT TYPES
// ==========================================

export interface ActivityPhoto {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: string;
  order: number;
}

export interface ActivityOffer {
  id: string;
  name: string;
  description: string;
  bannerImage?: string;
  originalPrice: number;
  offerPrice: number;
  discountPercentage: number;
  validFrom: string;
  validUntil: string;
  termsAndConditions?: string;
  isActive: boolean;
  createdAt: string;
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
  // -- Activity Management Enhancement Fields (all optional, backward-compatible) --
  shortDescription?: string;
  detailedDescription?: string;
  photos?: ActivityPhoto[];
  coverPhotoId?: string;
  duration?: string;
  ageRequirement?: string;
  rules?: string[];
  isActive?: boolean;
  displayOrder?: number;
  offers?: ActivityOffer[];
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
  discountType?: 'none' | 'individual_5' | 'group_10' | 'group_15' | 'bulk_30' | 'custom';
  discountPercentage?: number;
  discountAmount?: number;
  originalAmount?: number;
  cancellationReason?: string;
  refundAmount?: number;
  refundMethod?: 'cash' | 'upi' | 'card' | 'original';
  refundedAt?: string;
  refundedBy?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  bookingDate: string;
  status?: 'confirmed' | 'reserved' | 'cancelled';
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
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  cancellationReason?: string;
  refundAmount?: number;
  refundedAt?: string;
  refundedBy?: string;
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
  method: 'upi' | 'card' | 'net_banking' | 'cash' | 'razorpay';
  status: 'success' | 'failed' | 'pending' | 'processing' | 'paid' | 'cancelled' | 'refunded';
  transactionId: string;
  timestamp: string;
  // Razorpay-specific
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  // Counter-specific
  referenceNumber?: string; // Card transaction reference
  amountReceived?: number;  // Cash amount received
  changeGiven?: number;     // Cash change
  staffId?: string;         // Staff who confirmed the payment
  confirmedAt?: string;     // When payment was confirmed

  // New fields from the DEUCE Billing request
  invoice_id?: string;
  customer_id?: string;
  currency?: string;
  payment_method?: string;
  payment_status?: string;
  gateway?: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  gateway_reference_id?: string;
  pos_transaction_id?: string;
  terminal_id?: string;
  created_at?: string;
  updated_at?: string;
  paid_at?: string;
  failure_reason?: string;
  refund_status?: string;
  ticketId?: string;
  customerName?: string;
  customerPhone?: string;
  activityName?: string;
  counterId?: string;
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

export interface TransponderUnit {
  id: string; // e.g. 'TR-01'
  hardwareCode: string; // e.g. 'MYLAPS-849201'
  assignedKartNumber: string; // e.g. '01'
  assignedKartId: string;
  batteryLevel: number; // 0 - 100%
  signalDbm: number; // RSSI in dBm (e.g. -45 dBm)
  lastLoopPing: string;
  lastLoopLocation: 'Finish Line' | 'Sector 1' | 'Sector 2' | 'Pit Lane';
  status: 'connected' | 'weak' | 'charging' | 'offline';
  voltage: number; // e.g. 3.95V
  totalPassings: number;
}

export interface Kart {
  id: string;
  kartNumber: string;
  status: KartStatus;
  currentDriverId?: string;
  assignedSessionId?: string;
  transponderId?: string;
  transponderCode?: string;
  transponderBattery?: number;
  transponderStatus?: 'connected' | 'weak' | 'charging' | 'offline';
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

// ==========================================
// KART ALLOTMENT OPERATIONAL MODULE TYPES
// ==========================================

export type RiderOperationalStatus =
  | 'pending'        // Ticket exists, not yet checked in
  | 'checked_in'     // Waiver verified, checked in by staff
  | 'kart_assigned'  // A kart has been allocated
  | 'ready_to_race'  // All conditions met — race can start
  | 'racing'         // Race started (kart On Track)
  | 'completed';     // Race finished, kart released

export interface OperationalRider {
  id: string;                    // Unique rider op ID: rider-{ticketId}-{index}
  riderIndex: number;            // 1-based index within a multi-rider booking
  riderName: string;             // Auto from ticket (Rider 1) or staff-entered (Rider 2 dual kart)
  ticketId: string;
  bookingId: string;
  customerId: string;            // customerEmail used as customer ID
  sessionDuration: number;       // Minutes, derived from booking details
  isDualKart: boolean;           // Whether this booking is a dual-kart type
  status: RiderOperationalStatus;
  assignedKartId?: string;
  assignedKartNumber?: string;
  checkInTime?: string;
  kartAssignedTime?: string;
  raceStartTime?: string;
  raceEndTime?: string;
  assignedByStaffId?: string;
  assignedByStaffName?: string;
  waiverVerified: boolean;
  bookingSource?: 'online' | 'walk_in';
}

export interface AllotmentAuditEntry {
  id: string;
  riderId: string;
  riderName: string;
  ticketId: string;
  bookingId: string;
  kartId: string;
  kartNumber: string;
  action: 'assigned' | 'changed' | 'released' | 'race_started' | 'race_completed';
  fromKartNumber?: string;   // Only for 'changed'
  toKartNumber?: string;     // Only for 'changed'
  timestamp: string;
  staffId: string;
  staffName: string;
  notes?: string;
}
