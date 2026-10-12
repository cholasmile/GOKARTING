/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super_admin' | 'finance_sub_admin' | 'activity_staff' | 'food_vendor' | 'cafe_staff' | 'customer' | 'go_karting_manager' | 'go_karting_staff' | 'ticket_counter_staff' | 'horse_riding_staff' | 'shooting_staff';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  password?: string;
  vendorId?: string; // If role is 'food_vendor'
  organizationId?: string;
  updatedAt?: string;
  // Staff Master & Banking details for Payroll
  employeeId?: string; // unique (e.g. EMP-101)
  profilePhoto?: string;
  address?: string;
  emergencyContact?: string;
  assignedActivity?: string;
  dateOfJoining?: string; // YYYY-MM-DD
  employmentType?: 'Full-time' | 'Part-time' | 'Temporary' | 'Contract';
  salaryType?: 'Monthly' | 'Daily' | 'Hourly' | 'Contract-based';
  weeklyOff?: string; // e.g. Sunday, Monday
  shiftId?: string; // linked to ShiftDefinition
  shiftName?: string;
  employmentStatus?: 'Active' | 'On Leave' | 'Inactive';
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  branchName?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  department?: string;
  designation?: string;
  monthlySalary?: number;
  dailyRate?: number;
  hourlyRate?: number;
  notes?: string;
}

export type AttendanceStatusType =
  | 'Present'
  | 'Absent'
  | 'Half Day'
  | 'Paid Leave'
  | 'Unpaid Leave'
  | 'Weekly Off'
  | 'Holiday'
  | 'Work From Home';

export interface StaffAttendanceRecord {
  id: string;
  employeeId?: string;
  staffId: string;
  staffName: string;
  department?: string;
  assignedActivity?: string;
  date: string; // YYYY-MM-DD
  shiftName?: string;
  status: AttendanceStatusType | 'present' | 'absent' | 'half_day' | 'leave';
  checkInTime?: string; // HH:mm
  checkOutTime?: string; // HH:mm
  breakDurationMinutes?: number;
  totalWorkingHours?: number;
  lateArrivalMinutes?: number;
  earlyDepartureMinutes?: number;
  overtimeHours?: number;
  isOvertimeApproved?: boolean;
  remarks?: string;
  markedBy?: string;
  correctedBy?: string;
  correctionReason?: string;
  isCorrected?: boolean;
  timestamp: string;
}

export interface ShiftDefinition {
  id: string;
  name: string; // e.g. Morning Shift, Afternoon Shift, Evening Shift
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakDurationMinutes: number;
  applicableDepartment?: string;
  applicableActivity?: string;
  weeklyOff?: string;
  isActive: boolean;
}

export interface LeaveRequestRecord {
  id: string;
  staffId: string;
  staffName: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Annual Leave' | 'Unpaid Leave' | string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  numberOfDays: number;
  isPaid: boolean;
  reason: string;
  supportingDocUrl?: string;
  submittedBy: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffSalaryPayment {
  id: string;
  staffId: string;
  staffName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  dailyRate: number;
  totalDaysInMonth: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  payableDays: number;
  approvedOvertimeHours?: number;
  overtimePay?: number;
  allowances?: number;
  deductions?: number;
  calculatedSalary: number;
  bonusAmount: number;
  deductionAmount: number;
  netPayable: number;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'UPI' | 'Cheque';
  paymentStatus: 'Paid' | 'Pending';
  isApprovedBySuperAdmin?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  transactionRef?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  notes?: string;
  createdAt: string;
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
  videoUrl?: string;
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
  organizationId?: string;
  updatedAt?: string;
}

export interface Booking {
  id: string;
  customerName: string; customerPhone?: string;
  customerEmail: string;
  activityId: string;
  activityName: string;
  date: string;
  timeSlot: string;
  ticketType: 'standard' | 'package' | string;
  details: string; // e.g. "2x Adult, 1x Child" or "Package: Sharp Shooter (25 shots)"
  quantity: number;
  totalAmount: number;
  discountType?: 'none' | 'individual_5' | 'group_10' | 'group_15' | 'bulk_30' | 'custom' | 'cash' | string;
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
  packageId?: string;
  packageName?: string;
  unitPrice?: number;
  organizationId?: string;
  updatedAt?: string;
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
  packageId?: string;
  packageName?: string;
  unitPrice?: number;
  organizationId?: string;
  updatedAt?: string;
}

export interface FoodVendor {
  id: string;
  name: string;
  type: 'cafe' | 'fast_food' | 'juice' | 'ice_cream';
  image: string;
  ownerName: string;
  stallNumber: string;
  organizationId?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number; // Selling Price
  purchasePrice?: number; // Vendor / Trade Purchase Price
  category: string;
  isAvailable: boolean;
  image: string;
  stockQuantity?: number;
  organizationId?: string;
  updatedAt?: string;
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
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid';
  invoiceNumber?: string;
  tokenNumber?: string | number;
  paymentMethod?: 'cash' | 'upi' | 'card' | 'net_banking';
  createdAt: string;
  organizationId?: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  vendorId: string;
  name: string;
  category?: string;
  currentStock: number;
  minStockLevel: number;
  unit: string;
  openingStock?: number;
  totalPurchased?: number;
  totalConsumed?: number;
  totalSold?: number;
  totalWasted?: number;
  lastPurchaseDate?: string;
  lastPurchasePrice?: number;
  supplier?: string;
  costPrice?: number;
  organizationId?: string;
  updatedAt?: string;
}

export type StockMovementType =
  | 'purchase_receipt'
  | 'consumption'
  | 'sale_deduction'
  | 'wastage'
  | 'damaged'
  | 'return_to_supplier'
  | 'adjustment_add'
  | 'adjustment_sub';

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  vendorId: string;
  type: StockMovementType;
  quantity: number;
  unit: string;
  previousStock: number;
  newStock: number;
  referenceId?: string; // Purchase ID or Order ID
  reason?: string;
  recordedBy?: string;
  timestamp: string;
  organizationId?: string;
}

export interface FoodStreetPurchaseRecord {
  id: string;
  purchaseDate: string; // YYYY-MM-DD
  vendorId: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  itemName: string;
  itemCategory: string;
  itemId?: string; // Links to existing InventoryItem if matched
  quantityPurchased: number;
  unit: string; // kg, g, litre, ml, packet, bottle, piece, box, bag
  ratePerUnit: number;
  discount: number;
  gstRate: number; // 0, 5, 12, 18, 28
  gstAmount: number;
  totalPurchaseValue: number;
  quantityReceived: number;
  quantityRejected: number;
  quantityAccepted: number; // added to stock
  amountPaid: number;
  outstandingBalance: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit';
  paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid';
  invoiceReceiptUrl?: string;
  remarks?: string;
  status: 'pending_receipt' | 'accepted_into_stock' | 'rejected';
  receivedAt?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
  postedToFinance: boolean;
  postedToFinanceAt?: string;
}

export interface RecipeIngredient {
  inventoryItemId: string;
  inventoryItemName: string;
  quantityRequired: number; // e.g. 0.05 kg coffee beans, 0.15 litre milk
  unit: string;
}

export interface MenuItemRecipe {
  menuItemId: string;
  menuItemName: string;
  ingredients: RecipeIngredient[];
  updatedAt?: string;
}

export interface Payment {
  id: string;
  orderId?: string;
  bookingId?: string;
  amount: number;
  method: 'upi' | 'card' | 'net_banking' | 'cash' | 'razorpay' | 'complimentary' | 'qrcode' | string;
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
  packageName?: string;
  counterId?: string;
  organizationId?: string;
  updatedAt?: string;
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
  organizationId?: string;
  updatedAt?: string;
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
  organizationId?: string;
  updatedAt?: string;
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
  organizationId?: string;
  updatedAt?: string;
}

export interface GoKartingWaiver {
  id: string;
  ticketId: string;
  riderName: string;
  digitalSignature: string; // base64 or URL
  acceptedTerms: boolean;
  timestamp: string;
  verifiedByStaffId?: string;
  organizationId?: string;
  updatedAt?: string;
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

// ==========================================
// FINANCE ENTRY SUB-ADMIN PORTAL TYPES
// ==========================================

export type EntryWorkflowStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'posted';

export interface SupplierRecord {
  id: string; // e.g. SUP-1001
  supplierName: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  supplierType: 'Vendor' | 'Contractor' | 'Service Provider' | 'Manufacturer' | 'Wholesaler' | string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItemRecord {
  id: string; // e.g. ITEM-2001
  itemCode: string;
  itemName: string;
  category: string;
  defaultUnit: string;
  taxClassification?: string; // e.g. 'Standard GST 5%', 'Standard GST 18%', 'Nil Rated'
  defaultGstPercent: number;
  defaultSupplierId?: string;
  defaultSupplierName?: string;
  defaultRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  expenseRef: string; // e.g. EXP-2026-001
  expenseDate: string; // YYYY-MM-DD
  department: string;
  expenseCategory: string;
  description: string;
  payee: string;
  invoiceOrRefNumber?: string;
  amountBeforeTax: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Credit';
  paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid';
  amountPaid: number;
  receiptAttachment?: string; // base64 or receipt URL
  notes?: string;
  createdBy: string;
  createdByEmail?: string;
  workflowStatus: EntryWorkflowStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  postedLedgerId?: string;
  postedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: 'purchase' | 'expense' | 'salary' | 'supplier' | 'item' | 'staff';
  entityId: string;
  action: 'create' | 'update' | 'submit' | 'approve' | 'reject' | 'post' | 'reverse' | 'deactivate';
  performedBy: string;
  performedByRole: string;
  timestamp: string;
  details?: string;
}

