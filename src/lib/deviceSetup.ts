import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'deuce_device_prefix';

/**
 * Ensures a unique prefix is generated and saved for this device/browser.
 * Uses a random short string if one doesn't exist.
 */
export const getDevicePrefix = (): string => {
  if (typeof window === 'undefined') return 'SERVER';
  
  let prefix = localStorage.getItem(DEVICE_ID_KEY);
  if (!prefix) {
    // Generate a random 4-character prefix
    const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(4, '0');
    prefix = `POS-${randomHex}`;
    localStorage.setItem(DEVICE_ID_KEY, prefix);
  }
  return prefix;
};

/**
 * Generates an offline-safe ID using the device prefix, timestamp, and a random sequence.
 * Format: POS-12AB-1698765432-1234
 */
export const generateOfflineId = (typePrefix: string = 'id'): string => {
  const devicePrefix = getDevicePrefix();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${typePrefix}-${devicePrefix}-${timestamp}-${randomSuffix}`;
};
