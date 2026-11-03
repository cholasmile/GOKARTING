import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory / file-persisted stores for fallback and rapid desktop access
const holdsFilePath = path.join(__dirname, 'slot_holds_store.json');
const onlineBookingsFilePath = path.join(__dirname, 'online_bookings_store.json');
const slotConfigFilePath = path.join(__dirname, 'slot_config_store.json');

const readJSON = (filePath, defaultVal) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`[bookingService] Failed reading ${filePath}:`, e);
  }
  return defaultVal;
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`[bookingService] Failed writing ${filePath}:`, e);
  }
};

let slotHolds = readJSON(holdsFilePath, []);
let onlineBookings = readJSON(onlineBookingsFilePath, []);
let slotConfigs = readJSON(slotConfigFilePath, {});

// Purge expired holds every 60 seconds
setInterval(() => {
  const now = new Date().toISOString();
  let changed = false;
  slotHolds.forEach(h => {
    if (h.status === 'active' && h.expires_at < now) {
      h.status = 'expired';
      changed = true;
    }
  });
  if (changed) {
    writeJSON(holdsFilePath, slotHolds);
  }
}, 30000);

/**
 * Returns configuration for an activity slot.
 */
export const getSlotCapacityConfig = (activityId, date, timeSlot) => {
  const key = `${activityId}_${date}_${timeSlot}`;
  return slotConfigs[key] || {
    maxCapacity: activityId.includes('kart') ? 14 : 20,
    maxSingleKarts: 10,
    maxDoubleKarts: 4,
    offlineQuota: 4, // Guaranteed quota reserved for counter walk-ins
    isClosed: false
  };
};

/**
 * Checks remaining live availability for an activity on a given date and slot.
 */
export const checkSlotAvailability = (activityId, date, timeSlot) => {
  const config = getSlotCapacityConfig(activityId, date, timeSlot);
  if (config.isClosed) {
    return {
      available: false,
      reason: 'Slot is temporarily closed for maintenance or special event.',
      remainingCapacity: 0,
      config
    };
  }

  const now = new Date().toISOString();

  // 1. Confirmed online reservations
  const confirmedBookings = onlineBookings.filter(b => 
    b.activity_id === activityId &&
    b.date === date &&
    b.time_slot === timeSlot &&
    b.payment_status === 'paid' &&
    b.payment_status !== 'cancelled' &&
    b.payment_status !== 'refunded'
  );

  const bookedCount = confirmedBookings.reduce((sum, b) => sum + (Number(b.quantity) || 1), 0);
  const bookedSingleKarts = confirmedBookings.reduce((sum, b) => sum + (Number(b.single_karts) || 0), 0);
  const bookedDoubleKarts = confirmedBookings.reduce((sum, b) => sum + (Number(b.double_karts) || 0), 0);

  // 2. Active temporary holds (under 10 minutes)
  const activeHolds = slotHolds.filter(h =>
    h.activity_id === activityId &&
    h.date === date &&
    h.time_slot === timeSlot &&
    h.status === 'active' &&
    h.expires_at > now
  );

  const heldCount = activeHolds.reduce((sum, h) => sum + (Number(h.quantity) || 1), 0);
  const heldSingleKarts = activeHolds.reduce((sum, h) => sum + (Number(h.single_karts) || 0), 0);
  const heldDoubleKarts = activeHolds.reduce((sum, h) => sum + (Number(h.double_karts) || 0), 0);

  // Available for online reservation (excluding preallocated offline walk-in quota)
  const onlineMax = Math.max(0, config.maxCapacity - config.offlineQuota);
  const remainingOnlineCapacity = Math.max(0, onlineMax - (bookedCount + heldCount));
  const remainingSingleKarts = Math.max(0, config.maxSingleKarts - (bookedSingleKarts + heldSingleKarts));
  const remainingDoubleKarts = Math.max(0, config.maxDoubleKarts - (bookedDoubleKarts + heldDoubleKarts));

  return {
    available: remainingOnlineCapacity > 0,
    remainingCapacity: remainingOnlineCapacity,
    remainingSingleKarts,
    remainingDoubleKarts,
    maxCapacity: config.maxCapacity,
    offlineQuota: config.offlineQuota,
    bookedCount,
    heldCount
  };
};

/**
 * Creates an atomic 10-minute capacity hold while customer is paying.
 */
export const createSlotHold = (data) => {
  const { activityId, date, timeSlot, quantity = 1, singleKarts = 0, doubleKarts = 0, customerEmail, customerPhone } = data;

  const availability = checkSlotAvailability(activityId, date, timeSlot);
  if (!availability.available || availability.remainingCapacity < quantity) {
    return {
      success: false,
      reason: `Slot capacity exceeded. Only ${availability.remainingCapacity} spots left online.`
    };
  }

  // Double Kart limit check
  if (doubleKarts > 0 && availability.remainingDoubleKarts < doubleKarts) {
    return {
      success: false,
      reason: `Double Kart capacity exceeded. Only ${availability.remainingDoubleKarts} double karts available.`
    };
  }

  const holdToken = `HOLD-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const newHold = {
    id: `sh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    hold_token: holdToken,
    activity_id: activityId,
    date,
    time_slot: timeSlot,
    quantity,
    single_karts: singleKarts,
    double_karts: doubleKarts,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    status: 'active',
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  slotHolds.push(newHold);
  writeJSON(holdsFilePath, slotHolds);

  return {
    success: true,
    holdToken,
    expiresAt,
    remainingAfterHold: availability.remainingCapacity - quantity
  };
};

/**
 * Confirms booking after verified payment, binds hold and generates secure QR.
 */
export const confirmBookingWithPayment = (data) => {
  const {
    holdToken,
    razorpayOrderId,
    razorpayPaymentId,
    customerName,
    customerEmail,
    customerPhone,
    activityId,
    activityName,
    packageId,
    packageName,
    date,
    timeSlot,
    quantity = 1,
    singleKarts = 0,
    doubleKarts = 0,
    totalAmount,
    paymentMethod = 'RAZORPAY'
  } = data;

  // 1. If holdToken provided, mark hold as confirmed
  if (holdToken) {
    const hold = slotHolds.find(h => h.hold_token === holdToken);
    if (hold) {
      if (hold.status === 'confirmed') {
        return {
          success: false,
          error: 'HOLD_ALREADY_CONFIRMED',
          message: 'This hold token has already been confirmed and paid.'
        };
      }
      hold.status = 'confirmed';
      hold.razorpay_order_id = razorpayOrderId;
      writeJSON(holdsFilePath, slotHolds);
    }
  }

  // 2. Generate secure booking reference and QR code
  const dateStr = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingRef = `DEUCE-BK-${dateStr}-${randSuffix}`;

  // Unique QR token with crypto hash (no customer PII inside the QR string itself)
  const qrCodeValue = `DEUCE-PASS-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;

  const newBooking = {
    id: `obk-${Date.now()}-${randSuffix}`,
    booking_ref: bookingRef,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone || '',
    activity_id: activityId,
    activity_name: activityName,
    package_id: packageId || '',
    package_name: packageName || '',
    date,
    time_slot: timeSlot,
    quantity,
    single_karts: singleKarts,
    double_karts: doubleKarts,
    total_amount: Number(totalAmount) || 0,
    payment_method: paymentMethod,
    payment_status: 'paid',
    razorpay_order_id: razorpayOrderId || '',
    razorpay_payment_id: razorpayPaymentId || '',
    qr_code_value: qrCodeValue,
    checkin_status: 'pending',
    created_at: new Date().toISOString()
  };

  onlineBookings.push(newBooking);
  writeJSON(onlineBookingsFilePath, onlineBookings);

  return {
    success: true,
    booking: newBooking
  };
};

/**
 * Validates a QR code or Booking Reference and performs check-in.
 * Prevents duplicate check-in.
 */
export const validateAndCheckIn = (qrOrRef, terminalId = 'DEUCE-COUNTER-01', staffName = 'Staff') => {
  const query = (qrOrRef || '').trim().toUpperCase();

  const booking = onlineBookings.find(b => 
    b.qr_code_value.toUpperCase() === query ||
    b.booking_ref.toUpperCase() === query
  );

  if (!booking) {
    return {
      valid: false,
      message: 'Booking not found. Please verify booking reference or scan a valid DEUCE QR code.'
    };
  }

  if (booking.payment_status !== 'paid') {
    return {
      valid: false,
      message: `Cannot check-in. Payment status is '${booking.payment_status}'. Please collect payment at counter.`,
      booking
    };
  }

  if (booking.checkin_status === 'checked_in') {
    return {
      valid: false,
      alreadyCheckedIn: true,
      message: `ALREADY CHECKED IN! This pass was redeemed on ${booking.checked_in_at} by ${booking.checked_in_by || 'Staff'} at ${booking.checked_in_terminal || 'Counter'}.`,
      booking
    };
  }

  // Perform Check-in
  const nowIso = new Date().toISOString();
  booking.checkin_status = 'checked_in';
  booking.checked_in_at = nowIso;
  booking.checked_in_by = staffName;
  booking.checked_in_terminal = terminalId;

  writeJSON(onlineBookingsFilePath, onlineBookings);

  return {
    valid: true,
    message: 'Check-in confirmed successfully! Ticket redeemed.',
    booking
  };
};

/**
 * Returns online bookings list with optional date and checkin_status filters.
 */
export const getOnlineBookingsList = (filterDate, filterStatus) => {
  return onlineBookings.filter(b => {
    if (filterDate && b.date !== filterDate) return false;
    if (filterStatus && filterStatus !== 'all' && b.checkin_status !== filterStatus) return false;
    return true;
  });
};
