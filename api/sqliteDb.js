/**
 * DEUCE ADVENTURE PARK - PERMANENT LOCAL SQLITE DATABASE ENGINE
 * Path: %LOCALAPPDATA%\DeucePark\data\deuce.sqlite (with local fallback)
 * Automated daily & startup backup to: %LOCALAPPDATA%\DeucePark\data\backups\
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;
let activeDataDir = '';
let activeDbPath = '';
let activeBackupDir = '';

/**
 * Resolve database directory with fallback
 */
function resolveDirectories() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const primaryDir = path.join(localAppData, 'DeucePark', 'data');
  const primaryBackupDir = path.join(primaryDir, 'backups');

  try {
    fs.mkdirSync(primaryBackupDir, { recursive: true });
    activeDataDir = primaryDir;
    activeBackupDir = primaryBackupDir;
  } catch (err) {
    // Fallback to local workspace / portable drive directory
    const fallbackDir = path.resolve(__dirname, '..', 'data');
    const fallbackBackupDir = path.join(fallbackDir, 'backups');
    fs.mkdirSync(fallbackBackupDir, { recursive: true });
    activeDataDir = fallbackDir;
    activeBackupDir = fallbackBackupDir;
  }

  activeDbPath = path.join(activeDataDir, 'deuce.sqlite');
  return { activeDataDir, activeDbPath, activeBackupDir };
}

/**
 * Automatically create a backup file on startup / daily
 */
function createStartupBackup() {
  try {
    if (!fs.existsSync(activeDbPath)) return null;
    const stats = fs.statSync(activeDbPath);
    if (stats.size === 0) return null;

    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
    const backupName = `deuce_backup_${timestamp}.sqlite`;
    const backupPath = path.join(activeBackupDir, backupName);

    fs.copyFileSync(activeDbPath, backupPath);

    // Retain up to 30 most recent backups
    const files = fs.readdirSync(activeBackupDir)
      .filter(f => f.startsWith('deuce_backup_') && f.endsWith('.sqlite'))
      .sort()
      .reverse();

    if (files.length > 30) {
      for (let i = 30; i < files.length; i++) {
        try {
          fs.unlinkSync(path.join(activeBackupDir, files[i]));
        } catch (e) {}
      }
    }

    return backupPath;
  } catch (err) {
    console.error('[SQLite] Backup creation error:', err.message);
    return null;
  }
}

/**
 * Initialize SQLite database and tables
 */
export function initSqliteDb() {
  if (db) return db;

  resolveDirectories();
  createStartupBackup();

  db = new DatabaseSync(activeDbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  // 1. Station configuration
  db.exec(`
    CREATE TABLE IF NOT EXISTS station_configuration (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT
    );
  `);

  // 2. Operational Tickets Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      activity_id TEXT,
      activity_name TEXT,
      package_id TEXT,
      package_name TEXT,
      date TEXT,
      time_slot TEXT,
      quantity INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'completed',
      payment_method TEXT DEFAULT 'cash',
      qr_code_value TEXT,
      computer_id TEXT,
      created_at TEXT,
      checked_in INTEGER DEFAULT 0,
      checked_in_at TEXT,
      is_synced INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_date ON tickets(date);
    CREATE INDEX IF NOT EXISTS idx_tickets_computer_id ON tickets(computer_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_qr ON tickets(qr_code_value);
  `);

  // 3. Online Bookings Cache & Offline Verification Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS online_bookings_cache (
      id TEXT PRIMARY KEY,
      booking_ref TEXT UNIQUE,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      activity_id TEXT,
      activity_name TEXT,
      date TEXT,
      time_slot TEXT,
      quantity INTEGER DEFAULT 1,
      total_amount REAL DEFAULT 0,
      payment_status TEXT DEFAULT 'paid',
      payment_id TEXT,
      qr_pass_code TEXT,
      check_in_status TEXT DEFAULT 'CONFIRMED',
      checked_in_at TEXT,
      checked_in_by TEXT,
      computer_id TEXT,
      downloaded_at TEXT,
      sync_pending INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_online_date ON online_bookings_cache(date);
    CREATE INDEX IF NOT EXISTS idx_online_qr ON online_bookings_cache(qr_pass_code);
    CREATE INDEX IF NOT EXISTS idx_online_ref ON online_bookings_cache(booking_ref);
  `);

  // 4. Daily Sales Summaries Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_sales_summaries (
      id TEXT PRIMARY KEY,
      business_date TEXT,
      computer_id TEXT,
      total_tickets INTEGER DEFAULT 0,
      single_kart_tickets INTEGER DEFAULT 0,
      double_kart_tickets INTEGER DEFAULT 0,
      silver_package_tickets INTEGER DEFAULT 0,
      golden_package_tickets INTEGER DEFAULT 0,
      total_gokart_sales REAL DEFAULT 0,
      air_rifle_sales REAL DEFAULT 0,
      horse_riding_sales REAL DEFAULT 0,
      car_simulator_sales REAL DEFAULT 0,
      moto_simulation_sales REAL DEFAULT 0,
      cash_total REAL DEFAULT 0,
      upi_total REAL DEFAULT 0,
      card_total REAL DEFAULT 0,
      total_sales REAL DEFAULT 0,
      last_synced_at TEXT,
      is_synced INTEGER DEFAULT 0,
      UNIQUE(business_date, computer_id)
    );
    CREATE INDEX IF NOT EXISTS idx_summaries_date ON daily_sales_summaries(business_date);
  `);

  // 5. Offline Sync Queue
  db.exec(`
    CREATE TABLE IF NOT EXISTS offline_sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT,
      entity_id TEXT,
      action TEXT,
      payload TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON offline_sync_queue(status);
  `);

  // 6. Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      computer_id TEXT,
      user_id TEXT,
      action TEXT,
      details TEXT
    );
  `);

  console.log(`[SQLite] Local database initialized at: ${activeDbPath}`);
  return db;
}

/**
 * Save or update local ticket
 */
export function sqliteSaveTicket(ticket) {
  const d = initSqliteDb();
  const stmt = d.prepare(`
    INSERT OR REPLACE INTO tickets (
      id, booking_id, customer_name, customer_phone, customer_email,
      activity_id, activity_name, package_id, package_name, date, time_slot,
      quantity, price, total_amount, payment_status, payment_method,
      qr_code_value, computer_id, created_at, checked_in, checked_in_at, is_synced
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    ticket.id,
    ticket.bookingId || ticket.booking_id || '',
    ticket.customerName || ticket.customer_name || 'Walk-in Guest',
    ticket.customerPhone || ticket.customer_phone || '',
    ticket.customerEmail || ticket.customer_email || '',
    ticket.activityId || ticket.activity_id || 'act-go-karting',
    ticket.activityName || ticket.activity_name || 'Go-Karting',
    ticket.packageId || ticket.package_id || '',
    ticket.packageName || ticket.package_name || '',
    ticket.date || new Date().toISOString().split('T')[0],
    ticket.timeSlot || ticket.time_slot || '',
    Number(ticket.quantity || 1),
    Number(ticket.price || 0),
    Number(ticket.totalAmount || ticket.total_amount || 0),
    ticket.paymentStatus || ticket.payment_status || 'completed',
    ticket.paymentMethod || ticket.payment_method || 'cash',
    ticket.qrCodeValue || ticket.qr_code_value || `DEUCE-TKT-${ticket.id}`,
    ticket.computerId || ticket.computer_id || 'DEUCE-COUNTER-01',
    ticket.createdAt || ticket.created_at || new Date().toISOString(),
    ticket.checkedIn || ticket.checked_in ? 1 : 0,
    ticket.checkedInAt || ticket.checked_in_at || null,
    ticket.isSynced || ticket.is_synced ? 1 : 0
  );

  return ticket;
}

/**
 * Get tickets from SQLite
 */
export function sqliteGetTickets({ date, computerId, limit = 100 } = {}) {
  const d = initSqliteDb();
  let query = 'SELECT * FROM tickets WHERE 1=1';
  const params = [];

  if (date) {
    query += ' AND date = ?';
    params.push(date);
  }
  if (computerId) {
    query += ' AND computer_id = ?';
    params.push(computerId);
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  return d.prepare(query).all(...params);
}

/**
 * Save / Upsert Daily Sales Summary
 */
export function sqliteUpsertDailySummary(summary) {
  const d = initSqliteDb();
  const id = summary.id || `SUM-${summary.business_date || summary.businessDate}-${summary.computer_id || summary.computerId}`;
  const bDate = summary.business_date || summary.businessDate;
  const cId = summary.computer_id || summary.computerId;

  const stmt = d.prepare(`
    INSERT INTO daily_sales_summaries (
      id, business_date, computer_id, total_tickets, single_kart_tickets, double_kart_tickets,
      silver_package_tickets, golden_package_tickets, total_gokart_sales, air_rifle_sales,
      horse_riding_sales, car_simulator_sales, moto_simulation_sales, cash_total,
      upi_total, card_total, total_sales, last_synced_at, is_synced
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
    ON CONFLICT(business_date, computer_id) DO UPDATE SET
      total_tickets = excluded.total_tickets,
      single_kart_tickets = excluded.single_kart_tickets,
      double_kart_tickets = excluded.double_kart_tickets,
      silver_package_tickets = excluded.silver_package_tickets,
      golden_package_tickets = excluded.golden_package_tickets,
      total_gokart_sales = excluded.total_gokart_sales,
      air_rifle_sales = excluded.air_rifle_sales,
      horse_riding_sales = excluded.horse_riding_sales,
      car_simulator_sales = excluded.car_simulator_sales,
      moto_simulation_sales = excluded.moto_simulation_sales,
      cash_total = excluded.cash_total,
      upi_total = excluded.upi_total,
      card_total = excluded.card_total,
      total_sales = excluded.total_sales,
      last_synced_at = excluded.last_synced_at,
      is_synced = excluded.is_synced
  `);

  stmt.run(
    id,
    bDate,
    cId,
    Number(summary.total_tickets ?? summary.totalTickets ?? 0),
    Number(summary.single_kart_tickets ?? summary.singleKartTickets ?? 0),
    Number(summary.double_kart_tickets ?? summary.doubleKartTickets ?? 0),
    Number(summary.silver_package_tickets ?? summary.silverPackageTickets ?? 0),
    Number(summary.golden_package_tickets ?? summary.goldenPackageTickets ?? 0),
    Number(summary.total_gokart_sales ?? summary.totalGokartSales ?? 0),
    Number(summary.air_rifle_sales ?? summary.airRifleSales ?? 0),
    Number(summary.horse_riding_sales ?? summary.horseRidingSales ?? 0),
    Number(summary.car_simulator_sales ?? summary.carSimulatorSales ?? 0),
    Number(summary.moto_simulation_sales ?? summary.motoSimulationSales ?? 0),
    Number(summary.cash_total ?? summary.cashTotal ?? 0),
    Number(summary.upi_total ?? summary.upiTotal ?? 0),
    Number(summary.card_total ?? summary.cardTotal ?? 0),
    Number(summary.total_sales ?? summary.totalSales ?? 0),
    summary.last_synced_at || summary.lastSyncedAt || new Date().toISOString(),
    summary.is_synced || summary.isSynced ? 1 : 0
  );

  return { id, businessDate: bDate, computerId: cId };
}

/**
 * Get daily sales summaries
 */
export function sqliteGetDailySummaries({ fromDate, toDate, computerId } = {}) {
  const d = initSqliteDb();
  let query = 'SELECT * FROM daily_sales_summaries WHERE 1=1';
  const params = [];

  if (fromDate) {
    query += ' AND business_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND business_date <= ?';
    params.push(toDate);
  }
  if (computerId) {
    query += ' AND computer_id = ?';
    params.push(computerId);
  }
  query += ' ORDER BY business_date DESC';

  return d.prepare(query).all(...params);
}

/**
 * Cache downloaded online bookings into local SQLite for offline operations
 */
export function sqliteCacheOnlineBookings(bookingsList) {
  const d = initSqliteDb();
  const stmt = d.prepare(`
    INSERT OR REPLACE INTO online_bookings_cache (
      id, booking_ref, customer_name, customer_phone, customer_email,
      activity_id, activity_name, date, time_slot, quantity,
      total_amount, payment_status, payment_id, qr_pass_code,
      check_in_status, checked_in_at, checked_in_by, computer_id,
      downloaded_at, sync_pending
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
  `);

  const now = new Date().toISOString();
  d.exec('BEGIN TRANSACTION;');
  try {
    for (const b of bookingsList) {
      stmt.run(
        b.id || '',
        b.booking_ref || b.bookingRef || '',
        b.customer_name || b.customerName || '',
        b.customer_phone || b.customerPhone || '',
        b.customer_email || b.customerEmail || '',
        b.activity_id || b.activityId || '',
        b.activity_name || b.activityName || '',
        b.date || '',
        b.time_slot || b.timeSlot || '',
        Number(b.quantity || 1),
        Number(b.total_amount || b.totalAmount || 0),
        b.payment_status || b.paymentStatus || 'paid',
        b.payment_id || b.paymentId || '',
        b.qr_pass_code || b.qrPassCode || '',
        b.check_in_status || b.checkInStatus || 'CONFIRMED',
        b.checked_in_at || b.checkedInAt || null,
        b.checked_in_by || b.checkedInBy || null,
        b.computer_id || b.computerId || null,
        now,
        0
      );
    }
    d.exec('COMMIT;');
    return { count: bookingsList.length };
  } catch (err) {
    d.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Check-in an online ticket offline using the local SQLite cache
 */
export function sqliteCheckInOnlineBookingOffline(qrOrRef, scannedBy = 'Staff', computerId = 'DEUCE-COUNTER-01') {
  const d = initSqliteDb();
  const code = (qrOrRef || '').trim();

  const record = d.prepare(`
    SELECT * FROM online_bookings_cache
    WHERE qr_pass_code = ? OR booking_ref = ?
  `).get(code, code);

  if (!record) {
    return {
      success: false,
      notFound: true,
      message: 'Booking not found in local offline database. If newly booked, connect to internet to download bookings.'
    };
  }

  if (record.check_in_status === 'CHECKED_IN') {
    return {
      success: false,
      duplicate: true,
      message: `ALREADY CHECKED IN! This pass was redeemed on ${record.checked_in_at} by ${record.checked_in_by || 'Staff'} at ${record.computer_id || 'Counter'}.`,
      checkedInAt: record.checked_in_at,
      checkedInBy: record.checked_in_by
    };
  }

  const checkInTime = new Date().toISOString();
  d.prepare(`
    UPDATE online_bookings_cache
    SET check_in_status = 'CHECKED_IN',
        checked_in_at = ?,
        checked_in_by = ?,
        computer_id = ?,
        sync_pending = 1
    WHERE id = ?
  `).run(checkInTime, scannedBy, computerId, record.id);

  // Queue into offline sync queue
  const queueId = `QUEUE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  d.prepare(`
    INSERT INTO offline_sync_queue (id, entity_type, entity_id, action, payload, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    queueId,
    'online_check_in',
    record.id,
    'check_in',
    JSON.stringify({ bookingId: record.id, qrOrRef: code, checkInTime, scannedBy, computerId }),
    checkInTime
  );

  return {
    success: true,
    offlineValidated: true,
    message: 'Check-in confirmed locally (Validated Offline - Pending Cloud Sync)',
    booking: {
      ...record,
      check_in_status: 'CHECKED_IN',
      checked_in_at: checkInTime,
      checked_in_by: scannedBy
    }
  };
}

/**
 * Get pending sync items
 */
export function sqliteGetPendingSyncItems() {
  const d = initSqliteDb();
  return d.prepare(`SELECT * FROM offline_sync_queue WHERE status = 'pending' ORDER BY created_at ASC`).all();
}

/**
 * Mark sync queue item completed
 */
export function sqliteMarkQueueItemDone(id) {
  const d = initSqliteDb();
  d.prepare(`UPDATE offline_sync_queue SET status = 'completed' WHERE id = ?`).run(id);
}

/**
 * Audit log
 */
export function sqliteLogAudit(computerId, userId, action, details) {
  const d = initSqliteDb();
  const id = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  d.prepare(`
    INSERT INTO audit_logs (id, timestamp, computer_id, user_id, action, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    new Date().toISOString(),
    computerId,
    userId,
    action,
    typeof details === 'object' ? JSON.stringify(details) : String(details)
  );
}

/**
 * Database health and statistics
 */
export function sqliteGetStats() {
  const d = initSqliteDb();
  const ticketCount = d.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
  const onlineCount = d.prepare('SELECT COUNT(*) as count FROM online_bookings_cache').get().count;
  const summaryCount = d.prepare('SELECT COUNT(*) as count FROM daily_sales_summaries').get().count;
  const pendingSync = d.prepare("SELECT COUNT(*) as count FROM offline_sync_queue WHERE status = 'pending'").get().count;

  let fileSize = 0;
  try {
    fileSize = fs.statSync(activeDbPath).size;
  } catch (e) {}

  let backupCount = 0;
  try {
    backupCount = fs.readdirSync(activeBackupDir).filter(f => f.endsWith('.sqlite')).length;
  } catch (e) {}

  return {
    dbPath: activeDbPath,
    dataDir: activeDataDir,
    backupDir: activeBackupDir,
    fileSizeBytes: fileSize,
    fileSizeKb: (fileSize / 1024).toFixed(1),
    backupCount,
    ticketCount,
    onlineCount,
    summaryCount,
    pendingSync
  };
}
