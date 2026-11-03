import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'deuce_device_prefix';
const COMPUTER_ID_KEY = 'deuce_computer_id';

/**
 * Gets or initializes the unique computer ID for this installation.
 * Format: "COUNTER-1", "POS-4A2F", etc.
 */
export const getComputerId = (): string => {
  if (typeof window === 'undefined') return 'SERVER';

  let computerId = localStorage.getItem(COMPUTER_ID_KEY);
  if (!computerId) {
    // Check if we have an existing device prefix to keep continuity
    const existingPrefix = localStorage.getItem(DEVICE_ID_KEY);
    if (existingPrefix) {
      computerId = existingPrefix;
    } else {
      const randomHex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(4, '0');
      computerId = `COUNTER-${randomHex}`;
    }
    localStorage.setItem(COMPUTER_ID_KEY, computerId);
    localStorage.setItem(DEVICE_ID_KEY, computerId);
  }
  return computerId;
};

/**
 * Allows the administrator to explicitly set or rename this computer's ID (e.g. "COUNTER-1").
 */
export const setComputerId = (newId: string): void => {
  if (typeof window === 'undefined') return;
  const sanitized = newId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  if (sanitized) {
    localStorage.setItem(COMPUTER_ID_KEY, sanitized);
    localStorage.setItem(DEVICE_ID_KEY, sanitized);
  }
};

/**
 * Ensures a unique prefix is generated and saved for this device/browser.
 * Backward compatible alias for getComputerId().
 */
export const getDevicePrefix = (): string => {
  return getComputerId();
};

/**
 * Generates an offline-safe ID using the computer ID, timestamp, and a random sequence.
 * Format: typePrefix-COUNTER-1-1698765432-1234
 */
export const generateOfflineId = (typePrefix: string = 'id'): string => {
  const compId = getComputerId();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${typePrefix}-${compId}-${timestamp}-${randomSuffix}`;
};

/**
 * Requests browser persistent storage so browser cache eviction does not clear IndexedDB.
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return true;
    } catch (e) {
      console.warn('[DeviceSetup] Persistent storage request error:', e);
    }
  }
  return false;
};

/**
 * Estimates storage usage and quota in MB.
 */
export const getStorageInfo = async (): Promise<{ usageMb: number; quotaMb: number; isPersisted: boolean }> => {
  let usageMb = 0;
  let quotaMb = 0;
  let isPersisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        usageMb = Math.round((est.usage || 0) / (1024 * 1024) * 10) / 10;
        quotaMb = Math.round((est.quota || 0) / (1024 * 1024) * 10) / 10;
      }
    } catch (e) {}
  }

  return { usageMb, quotaMb, isPersisted };
};
