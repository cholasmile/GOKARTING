import React, { useState, useEffect } from 'react';
import {
  X, Download, Upload, ShieldCheck, HardDrive, RefreshCw,
  AlertTriangle, CheckCircle2, FileText, Database, Lock
} from 'lucide-react';
import { db } from '../../db/db';
import { getStorageInfo, requestPersistentStorage, getComputerId } from '../../lib/deviceSetup';
import { salesSummaryEngine } from '../../lib/salesSummaryEngine';

interface DataSafetyBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSafetyBackupModal: React.FC<DataSafetyBackupModalProps> = ({ isOpen, onClose }) => {
  const [storageInfo, setStorageInfo] = useState<{ usageMb: number; quotaMb: number; isPersisted: boolean }>({
    usageMb: 0,
    quotaMb: 0,
    isPersisted: false
  });
  const [counts, setCounts] = useState<{
    tickets: number;
    bookings: number;
    payments: number;
    summaries: number;
    pendingQueue: number;
  }>({
    tickets: 0,
    bookings: 0,
    payments: 0,
    summaries: 0,
    pendingQueue: 0
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStorageAndCounts();
    }
  }, [isOpen]);

  const loadStorageAndCounts = async () => {
    try {
      const sInfo = await getStorageInfo();
      setStorageInfo(sInfo);

      const [tickets, bookings, payments, summaries, pendingQueue] = await Promise.all([
        db.tickets.count(),
        db.bookings.count(),
        db.payments.count(),
        db.dailySalesSummaries.count(),
        db.syncQueue.where('status').anyOf(['pending', 'failed']).count()
      ]);

      setCounts({ tickets, bookings, payments, summaries, pendingQueue });
    } catch (e) {
      console.warn('Error fetching backup info:', e);
    }
  };

  const handleRequestPersistence = async () => {
    const persisted = await requestPersistentStorage();
    await loadStorageAndCounts();
    if (persisted) {
      setStatusMessage({ type: 'success', text: 'Browser persistent storage successfully granted. Data will not be evicted by browser.' });
    } else {
      setStatusMessage({ type: 'info', text: 'Persistent storage already active or managed by browser policy.' });
    }
  };

  // Full Local IndexedDB Export to JSON
  const handleExportFullJSON = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const [tickets, bookings, payments, waivers, sessions, lapRecords, summaries] = await Promise.all([
        db.tickets.toArray(),
        db.bookings.toArray(),
        db.payments.toArray(),
        db.waivers.toArray(),
        db.sessions.toArray(),
        db.lapRecords.toArray(),
        db.dailySalesSummaries.toArray()
      ]);

      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        computerId: getComputerId(),
        counts: {
          tickets: tickets.length,
          bookings: bookings.length,
          payments: payments.length,
          waivers: waivers.length,
          sessions: sessions.length,
          lapRecords: lapRecords.length,
          summaries: summaries.length
        },
        data: {
          tickets,
          bookings,
          payments,
          waivers,
          sessions,
          lapRecords,
          dailySalesSummaries: summaries
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `DEUCE_LOCAL_BACKUP_${getComputerId()}_${new Date().toISOString().split('T')[0]}.json`;
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Record backup time in localStorage
      localStorage.setItem('deuce_last_backup_date', new Date().toISOString());

      setStatusMessage({
        type: 'success',
        text: `Export complete! Saved ${tickets.length} tickets, ${payments.length} payments to ${filename}`
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Export failed: ' + (err?.message || String(err)) });
    } finally {
      setIsExporting(false);
    }
  };

  // Export Tickets & Billing Log to CSV
  const handleExportTransactionsCSV = async () => {
    setIsExporting(true);
    setStatusMessage(null);
    try {
      const tickets = await db.tickets.toArray();
      const headers = [
        'Ticket ID', 'Booking ID', 'Customer Name', 'Customer Phone',
        'Activity Name', 'Ticket / Package', 'Quantity', 'Status',
        'Date', 'Time Slot', 'QR Code Value', 'Updated At'
      ];

      const rows = tickets.map(t => [
        `"${t.id}"`,
        `"${t.bookingId}"`,
        `"${t.customerName || ''}"`,
        `"${t.customerPhone || ''}"`,
        `"${t.activityName || ''}"`,
        `"${t.ticketType || t.packageName || ''}"`,
        t.quantity || 1,
        `"${t.status}"`,
        `"${t.date}"`,
        `"${t.timeSlot || ''}"`,
        `"${t.qrCodeValue}"`,
        `"${t.updatedAt || ''}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DEUCE_Local_Tickets_${getComputerId()}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setStatusMessage({ type: 'success', text: `Successfully exported ${tickets.length} ticket records to CSV.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'CSV Export failed: ' + (err?.message || String(err)) });
    } finally {
      setIsExporting(false);
    }
  };

  // Restore Local Records from JSON Backup
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const backup = JSON.parse(text);

        if (!backup || !backup.data) {
          throw new Error('Invalid backup file format.');
        }

        const { tickets, bookings, payments, waivers, sessions, lapRecords, dailySalesSummaries } = backup.data;

        // Restore into Dexie tables using bulkPut (idempotent, never overwrites with blanks)
        if (Array.isArray(tickets) && tickets.length > 0) {
          await db.tickets.bulkPut(tickets);
        }
        if (Array.isArray(bookings) && bookings.length > 0) {
          await db.bookings.bulkPut(bookings);
        }
        if (Array.isArray(payments) && payments.length > 0) {
          await db.payments.bulkPut(payments);
        }
        if (Array.isArray(waivers) && waivers.length > 0) {
          await db.waivers.bulkPut(waivers);
        }
        if (Array.isArray(sessions) && sessions.length > 0) {
          await db.sessions.bulkPut(sessions);
        }
        if (Array.isArray(lapRecords) && lapRecords.length > 0) {
          await db.lapRecords.bulkPut(lapRecords);
        }
        if (Array.isArray(dailySalesSummaries) && dailySalesSummaries.length > 0) {
          await db.dailySalesSummaries.bulkPut(dailySalesSummaries);
        }

        // Recalculate summary after restore
        await salesSummaryEngine.calculateDailySummary();
        await loadStorageAndCounts();

        setStatusMessage({
          type: 'success',
          text: `Restore complete! Successfully verified and imported ${tickets?.length || 0} tickets and ${payments?.length || 0} payments.`
        });
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: 'Restore failed: ' + (err?.message || String(err)) });
      } finally {
        setIsRestoring(false);
      }
    };

    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-5 animate-in fade-in duration-200">

        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Local Data Safety & Storage</h2>
              <p className="text-xs text-gray-500">Terminal: <span className="font-mono font-bold">{getComputerId()}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Local Storage Health & Persistent Storage Status */}
        <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700/80 space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-gray-400" />
              IndexedDB Storage State:
            </span>
            <span className="font-mono text-gray-900 dark:text-white font-bold">
              {storageInfo.usageMb} MB used {storageInfo.quotaMb > 0 ? `/ ${storageInfo.quotaMb} MB quota` : ''}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200/60 dark:border-gray-800">
            <span className="text-gray-600 dark:text-gray-400">Persistent Eviction Protection:</span>
            {storageInfo.isPersisted ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active (Safe)
              </span>
            ) : (
              <button
                onClick={handleRequestPersistence}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Enable Persistence
              </button>
            )}
          </div>
        </div>

        {/* Local Records Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">{counts.tickets}</div>
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Local Tickets</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">{counts.payments}</div>
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Payments</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-lg font-bold text-gray-900 dark:text-white font-mono">{counts.summaries}</div>
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Day Summaries</div>
          </div>
        </div>

        {/* Backup & Export Actions */}
        <div className="space-y-2.5">
          <button
            onClick={handleExportFullJSON}
            disabled={isExporting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export Complete Local Database (JSON Backup)'}
          </button>

          <button
            onClick={handleExportTransactionsCSV}
            disabled={isExporting}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <FileText className="w-4 h-4" />
            Export Tickets & Billing History to CSV
          </button>

          {/* Restore / Import */}
          <div className="pt-2">
            <label className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition">
              <Upload className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {isRestoring ? 'Restoring records...' : 'Restore / Import from Local Backup (.json)'}
              </span>
              <span className="text-[10px] text-gray-400">Non-destructive merge into IndexedDB</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-gray-400 text-center leading-relaxed">
          Local IndexedDB records are never automatically deleted after synchronization. Your ticket numbers and customer details remain permanently accessible locally.
        </p>

      </div>
    </div>
  );
};
