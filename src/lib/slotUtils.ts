/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Master 1-hour time slots for weekdays (Monday to Friday) - up to 8:00 PM
export const WEEKDAY_SLOTS: string[] = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
  '06:00 PM - 07:00 PM',
  '07:00 PM - 08:00 PM'
];

// Master 1-hour time slots for weekends (Saturday and Sunday) - up to 11:00 PM
export const WEEKEND_SLOTS: string[] = [
  ...WEEKDAY_SLOTS,
  '08:00 PM - 09:00 PM',
  '09:00 PM - 10:00 PM',
  '10:00 PM - 11:00 PM'
];

/**
 * Get today's local date string in YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if selected date string (YYYY-MM-DD) is in the past compared to local today
 */
export const isPastDate = (dateStr: string): boolean => {
  if (!dateStr) return true;
  const todayStr = getTodayDateString();
  return dateStr < todayStr;
};

/**
 * Check if selected date string is Saturday or Sunday
 */
export const isWeekend = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  // Year, month (0-indexed), day
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  return dayOfWeek === 0 || dayOfWeek === 6;
};

/**
 * Parse start hour and minute in 24-hour format from a slot string like "09:00 AM - 10:00 AM" or "01:00 PM - 02:00 PM"
 */
export const parseSlotStartHour = (slot: string): { hour: number; minute: number } => {
  const startTimePart = slot.split('-')[0].trim(); // e.g. "01:00 PM" or "09:00 AM"
  const [time, period] = startTimePart.split(' ');
  const [hStr, mStr] = time.split(':');
  let hour = parseInt(hStr, 10);
  const minute = parseInt(mStr || '0', 10);

  if (period === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period === 'AM' && hour === 12) {
    hour = 0;
  }
  return { hour, minute };
};

/**
 * Returns available time slots for a given date string (YYYY-MM-DD).
 * - For TODAY: Permanently returns only a few (2-3) limited high-demand slots.
 * - Saturday & Sunday (Future): Full slots up to 11:00 PM.
 * - Mon - Fri (Future): Full slots up to 8:00 PM.
 * - Past dates: Empty array.
 */
export const getAvailableTimeSlots = (dateStr: string): string[] => {
  if (!dateStr || isPastDate(dateStr)) {
    return [];
  }

  const todayStr = getTodayDateString();

  // For TODAY: Permanently limit to only a few (2 to 3) prime available slots
  if (dateStr === todayStr) {
    const now = new Date();
    const currentHour = now.getHours();
    const masterSlots = isWeekend(dateStr) ? WEEKEND_SLOTS : WEEKDAY_SLOTS;

    // Filter slots that start in the upcoming hours
    const upcomingSlots = masterSlots.filter(slot => {
      const { hour } = parseSlotStartHour(slot);
      return hour >= currentHour;
    });

    // If there are upcoming slots today, return at most 3 slots (limited availability)
    if (upcomingSlots.length > 0) {
      return upcomingSlots.slice(0, 3);
    }

    // If late evening / past regular hours, provide the 2 night emergency/express slots
    return isWeekend(dateStr) 
      ? ['09:00 PM - 10:00 PM', '10:00 PM - 11:00 PM']
      : ['06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM'];
  }

  // Future dates: return full schedule
  return isWeekend(dateStr) ? WEEKEND_SLOTS : WEEKDAY_SLOTS;
};
