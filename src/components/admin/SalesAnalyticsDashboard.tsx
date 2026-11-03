import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, Calendar, Download, Printer, RefreshCw,
  CheckCircle2, AlertTriangle, Clock, HardDrive, Laptop,
  TrendingUp, CreditCard, DollarSign, Award, Layers, ShieldCheck
} from 'lucide-react';
import { salesSummaryEngine, SummarySyncStatus } from '../../lib/salesSummaryEngine';
import { getComputerId, setComputerId } from '../../lib/deviceSetup';
import { DailySalesSummary } from '../../types';

interface SalesAnalyticsDashboardProps {
  onOpenBackupModal?: () => void;
}

export const SalesAnalyticsDashboard: React.FC<SalesAnalyticsDashboardProps> = ({ onOpenBackupModal }) => {
  // Filters
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '7days' | 'month' | 'last_month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(() => salesSummaryEngine.getTodayBusinessDate());
  const [endDate, setEndDate] = useState<string>(() => salesSummaryEngine.getTodayBusinessDate());
  const [selectedComputer, setSelectedComputer] = useState<string>('all');

  // Data State
  const [summaries, setSummaries] = useState<DailySalesSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SummarySyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);

  // Computer ID editing
  const [currentComputerId, setCurrentComputerId] = useState<string>(() => getComputerId());
  const [isEditingComputerId, setIsEditingComputerId] = useState<boolean>(false);
  const [computerIdInput, setComputerIdInput] = useState<string>(currentComputerId);

  // Monthly Revenue figure for Current Month
  const [currentMonthRevenue, setCurrentMonthRevenue] = useState<number>(0);

  // Subscribe to summary engine status
  useEffect(() => {
    const unsubscribe = salesSummaryEngine.subscribe((status, pending, lastSync) => {
      setSyncStatus(status);
      setPendingCount(pending);
      if (lastSync) setLastSyncTime(lastSync);
    });
    return unsubscribe;
  }, []);

  // Update date range when preset changes
  useEffect(() => {
    const today = salesSummaryEngine.getTodayBusinessDate();
    const d = new Date();

    if (datePreset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (datePreset === 'yesterday') {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      const yStr = salesSummaryEngine.normalizeDate(y.toISOString());
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (datePreset === '7days') {
      const past = new Date(d);
      past.setDate(past.getDate() - 6);
      setStartDate(salesSummaryEngine.normalizeDate(past.toISOString()));
      setEndDate(today);
    } else if (datePreset === 'month') {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      setStartDate(`${year}-${month}-01`);
      setEndDate(today);
    } else if (datePreset === 'last_month') {
      const firstDayLastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(d.getFullYear(), d.getMonth(), 0);
      setStartDate(salesSummaryEngine.normalizeDate(firstDayLastMonth.toISOString()));
      setEndDate(salesSummaryEngine.normalizeDate(lastDayLastMonth.toISOString()));
    }
  }, [datePreset]);

  // Load summaries
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await salesSummaryEngine.fetchConsolidatedSummaries(startDate, endDate, selectedComputer);
      setSummaries(data);

      // Compute current month revenue
      const d = new Date();
      const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const today = salesSummaryEngine.getTodayBusinessDate();
      const monthData = await salesSummaryEngine.fetchConsolidatedSummaries(monthStart, today, 'all');
      const mRev = monthData.reduce((sum, item) => sum + (Number(item.total_sales) || 0), 0);
      setCurrentMonthRevenue(mRev);
    } catch (e) {
      console.error('Error fetching summaries:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, selectedComputer]);

  // Unique computers list for filter dropdown
  const availableComputers = useMemo(() => {
    const set = new Set<string>();
    set.add(currentComputerId);
    summaries.forEach(s => {
      if (s.computer_id) set.add(s.computer_id);
    });
    return Array.from(set);
  }, [summaries, currentComputerId]);

  // Aggregated totals across all filtered summaries (Without double counting)
  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, s) => {
        acc.total_tickets += Number(s.total_tickets) || 0;
        acc.single_kart_tickets += Number(s.single_kart_tickets) || 0;
        acc.double_kart_tickets += Number(s.double_kart_tickets) || 0;
        acc.silver_package_tickets += Number(s.silver_package_tickets) || 0;
        acc.golden_package_tickets += Number(s.golden_package_tickets) || 0;
        acc.total_gokart_sales += Number(s.total_gokart_sales) || 0;
        acc.air_rifle_sales += Number(s.air_rifle_sales) || 0;
        acc.horse_riding_sales += Number(s.horse_riding_sales) || 0;
        acc.car_simulator_sales += Number(s.car_simulator_sales) || 0;
        acc.moto_simulation_sales += Number(s.moto_simulation_sales) || 0;
        acc.cash_total += Number(s.cash_total) || 0;
        acc.upi_total += Number(s.upi_total) || 0;
        acc.card_total += Number(s.card_total) || 0;
        acc.total_sales += Number(s.total_sales) || 0;
        return acc;
      },
      {
        total_tickets: 0,
        single_kart_tickets: 0,
        double_kart_tickets: 0,
        silver_package_tickets: 0,
        golden_package_tickets: 0,
        total_gokart_sales: 0,
        air_rifle_sales: 0,
        horse_riding_sales: 0,
        car_simulator_sales: 0,
        moto_simulation_sales: 0,
        cash_total: 0,
        upi_total: 0,
        card_total: 0,
        total_sales: 0
      }
    );
  }, [summaries]);

  // Manual Trigger Sync
  const handleManualSync = async () => {
    setIsSyncingNow(true);
    try {
      await salesSummaryEngine.syncAllPendingSummaries();
      await loadData();
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Change Computer ID
  const handleSaveComputerId = () => {
    if (computerIdInput.trim()) {
      setComputerId(computerIdInput);
      setCurrentComputerId(getComputerId());
      setIsEditingComputerId(false);
      loadData();
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = [
      'Business Date',
      'Computer ID',
      'Total Tickets',
      'Single Kart Tickets',
      'Double Kart Tickets',
      'Silver Package Tickets',
      'Golden Package Tickets',
      'Go-Kart Sales (INR)',
      'Air Rifle Sales (INR)',
      'Horse Riding Sales (INR)',
      'Car Simulator Sales (INR)',
      'Moto Simulation Sales (INR)',
      'Cash Collection (INR)',
      'UPI Collection (INR)',
      'Card Collection (INR)',
      'Total Sales (INR)',
      'Last Synced At'
    ];

    const rows = summaries.map(s => [
      `"${s.business_date}"`,
      `"${s.computer_id}"`,
      s.total_tickets,
      s.single_kart_tickets,
      s.double_kart_tickets,
      s.silver_package_tickets,
      s.golden_package_tickets,
      s.total_gokart_sales.toFixed(2),
      s.air_rifle_sales.toFixed(2),
      s.horse_riding_sales.toFixed(2),
      s.car_simulator_sales.toFixed(2),
      s.moto_simulation_sales.toFixed(2),
      s.cash_total.toFixed(2),
      s.upi_total.toFixed(2),
      s.card_total.toFixed(2),
      s.total_sales.toFixed(2),
      `"${s.last_synced_at || ''}"`
    ]);

    // Summary Total Row
    const totalRow = [
      '"TOTAL"',
      `"ALL (${summaries.length} Records)"`,
      totals.total_tickets,
      totals.single_kart_tickets,
      totals.double_kart_tickets,
      totals.silver_package_tickets,
      totals.golden_package_tickets,
      totals.total_gokart_sales.toFixed(2),
      totals.air_rifle_sales.toFixed(2),
      totals.horse_riding_sales.toFixed(2),
      totals.car_simulator_sales.toFixed(2),
      totals.moto_simulation_sales.toFixed(2),
      totals.cash_total.toFixed(2),
      totals.upi_total.toFixed(2),
      totals.card_total.toFixed(2),
      totals.total_sales.toFixed(2),
      '""'
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(',')), totalRow.join(',')].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DEUCE_Sales_Summary_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF / Print
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Multi-Computer Station Bar */}
      <div className="bg-[#0B1120] text-white p-5 rounded-2xl border border-gray-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#14F1D9]" />
            <h1 className="text-xl font-bold tracking-tight">Consolidated Sales Analytics</h1>
            <span className="bg-[#14F1D9]/20 text-[#14F1D9] border border-[#14F1D9]/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
              Egress Optimized
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Atomic daily sales summaries aggregated across all billing computers with zero redundant queries.
          </p>
        </div>

        {/* Station Identification & Sync Status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Computer ID Tag */}
          <div className="bg-[#050816] border border-gray-700/80 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
            <Laptop className="w-4 h-4 text-amber-400" />
            <span className="text-gray-400">Terminal:</span>
            {isEditingComputerId ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={computerIdInput}
                  onChange={e => setComputerIdInput(e.target.value)}
                  className="bg-black/60 border border-gray-600 rounded px-2 py-0.5 text-xs text-white uppercase w-28"
                  placeholder="COUNTER-1"
                />
                <button
                  onClick={handleSaveComputerId}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingComputerId(false)}
                  className="text-gray-400 hover:text-white px-1 text-[10px]"
                >
                  ✕
                </button>
              </div>
            ) : (
              <span
                onClick={() => setIsEditingComputerId(true)}
                className="font-mono font-bold text-white cursor-pointer hover:underline flex items-center gap-1"
                title="Click to rename this computer"
              >
                {currentComputerId}
                <span className="text-[10px] text-gray-400">✎</span>
              </span>
            )}
          </div>

          {/* Sync Status Badge */}
          <div className="flex items-center gap-2 bg-[#050816] border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs">
            {syncStatus === 'syncing' || isSyncingNow ? (
              <>
                <RefreshCw className="w-4 h-4 text-[#14F1D9] animate-spin" />
                <span className="text-[#14F1D9] font-medium">Syncing Summary...</span>
              </>
            ) : syncStatus === 'error' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span className="text-rose-400 font-medium">Sync Failed</span>
              </>
            ) : pendingCount > 0 ? (
              <>
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-medium">{pendingCount} Pending</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Cloud Synced</span>
              </>
            )}

            <button
              onClick={handleManualSync}
              disabled={isSyncingNow}
              className="ml-1 text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition"
              title="Force upload and refresh cloud summaries"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Local Backup Shortcut */}
          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              className="bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#14F1D9]" />
              Data Safety
            </button>
          )}
        </div>
      </div>

      {/* Filter & Export Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['today', 'yesterday', '7days', 'month', 'last_month', 'custom'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => setDatePreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                datePreset === preset
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {preset === '7days' ? 'Last 7 Days' : preset === 'last_month' ? 'Last Month' : preset.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Date Picker & Computer Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent border-0 text-gray-800 dark:text-gray-200 text-xs focus:ring-0"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent border-0 text-gray-800 dark:text-gray-200 text-xs focus:ring-0"
            />
          </div>

          {/* Computer Selector */}
          <select
            value={selectedComputer}
            onChange={e => setSelectedComputer(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-xl px-3 py-1.5 focus:ring-blue-500"
          >
            <option value="all">All Terminals (Combined)</option>
            {availableComputers.map(comp => (
              <option key={comp} value={comp}>
                Terminal: {comp}
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
            title="Download formatted Excel/CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={handlePrintPDF}
            className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
            title="Print or save as PDF report"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* Main KPI Highlights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Sales */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-blue-200" />
          </div>
          <div className="text-2xl font-black mt-2">₹{totals.total_sales.toLocaleString('en-IN')}</div>
          <div className="text-xs text-blue-100/80 mt-1 flex items-center gap-1">
            <span>{totals.total_tickets} tickets sold</span>
          </div>
        </div>

        {/* Single Kart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Single Kart</span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded">1-Pax</span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2">
            {totals.single_kart_tickets}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-mono">Tickets</div>
        </div>

        {/* Double Kart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Double Kart</span>
            <span className="bg-cyan-100 text-cyan-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded">Twin</span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2">
            {totals.double_kart_tickets}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-mono">Tickets</div>
        </div>

        {/* Silver Package */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Silver Package</span>
            <Award className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2">
            {totals.silver_package_tickets}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-mono">Passes</div>
        </div>

        {/* Golden Package */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Golden Package</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2">
            {totals.golden_package_tickets}
          </div>
          <div className="text-xs text-gray-500 mt-1 font-mono">Passes</div>
        </div>

        {/* Monthly Revenue KPI */}
        <div className="bg-gradient-to-br from-purple-700 to-indigo-900 text-white p-4 rounded-2xl shadow-md">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200">This Month</span>
            <TrendingUp className="w-4 h-4 text-purple-300" />
          </div>
          <div className="text-2xl font-black mt-2">₹{currentMonthRevenue.toLocaleString('en-IN')}</div>
          <div className="text-xs text-purple-200/80 mt-1">MTD Gross Sales</div>
        </div>
      </div>

      {/* Two Column Section: Activity Revenues & Payment Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Breakdown */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />
            Activity-Wise Revenue Breakdown
          </h2>

          <div className="space-y-3.5">
            {[
              { label: 'Go-Karting Track', amount: totals.total_gokart_sales, color: 'bg-emerald-500' },
              { label: 'Air Rifle Shooting Range', amount: totals.air_rifle_sales, color: 'bg-indigo-500' },
              { label: 'Royal Horse Riding', amount: totals.horse_riding_sales, color: 'bg-amber-500' },
              { label: 'Car Simulator Experience', amount: totals.car_simulator_sales, color: 'bg-cyan-500' },
              { label: 'Moto Simulation Experience', amount: totals.moto_simulation_sales, color: 'bg-pink-500' }
            ].map(act => {
              const pct = totals.total_sales > 0 ? (act.amount / totals.total_sales) * 100 : 0;
              return (
                <div key={act.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700 dark:text-gray-300">{act.label}</span>
                    <span className="text-gray-900 dark:text-white font-mono">
                      ₹{act.amount.toLocaleString('en-IN')} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div className={`${act.color} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Collection Breakdown */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-500" />
            Payment-Wise Collection Breakdown
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-xl">
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400">Cash</span>
              <div className="text-lg font-black text-emerald-900 dark:text-emerald-200 mt-1">
                ₹{totals.cash_total.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">
                {totals.total_sales > 0 ? ((totals.cash_total / totals.total_sales) * 100).toFixed(1) : 0}% of Total
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3.5 rounded-xl">
              <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-400">UPI / QR</span>
              <div className="text-lg font-black text-blue-900 dark:text-blue-200 mt-1">
                ₹{totals.upi_total.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-blue-600/80 mt-0.5">
                {totals.total_sales > 0 ? ((totals.upi_total / totals.total_sales) * 100).toFixed(1) : 0}% of Total
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-3.5 rounded-xl">
              <span className="text-[10px] font-extrabold uppercase text-purple-700 dark:text-purple-400">Card / POS</span>
              <div className="text-lg font-black text-purple-900 dark:text-purple-200 mt-1">
                ₹{totals.card_total.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-purple-600/80 mt-0.5">
                {totals.total_sales > 0 ? ((totals.card_total / totals.total_sales) * 100).toFixed(1) : 0}% of Total
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-3 border border-gray-100 dark:border-gray-800 text-xs text-gray-500">
            <div className="flex justify-between items-center">
              <span>Collection Verification:</span>
              <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                ₹{(totals.cash_total + totals.upi_total + totals.card_total).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Date-Wise Consolidated Sales Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Date-Wise Consolidated Daily Summaries
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Atomic rows from Supabase daily_sales_summary combined across all billing computers without duplicates.
            </p>
          </div>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono px-2.5 py-1 rounded-lg">
            {summaries.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-600 dark:text-gray-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-3.5 py-3">Business Date</th>
                <th className="px-3 py-3">Terminal</th>
                <th className="px-3 py-3 text-right">Tickets</th>
                <th className="px-3 py-3 text-right">Single Kart</th>
                <th className="px-3 py-3 text-right">Double Kart</th>
                <th className="px-3 py-3 text-right">Silver Pkg</th>
                <th className="px-3 py-3 text-right">Golden Pkg</th>
                <th className="px-3 py-3 text-right">Go-Kart (₹)</th>
                <th className="px-3 py-3 text-right">Air Rifle (₹)</th>
                <th className="px-3 py-3 text-right">Horse (₹)</th>
                <th className="px-3 py-3 text-right">Simulators (₹)</th>
                <th className="px-3 py-3 text-right">Cash (₹)</th>
                <th className="px-3 py-3 text-right">UPI (₹)</th>
                <th className="px-3 py-3 text-right">Card (₹)</th>
                <th className="px-3.5 py-3 text-right font-bold text-gray-900 dark:text-white">Total Sales (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={15} className="text-center py-8 text-gray-500">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-blue-500" />
                    Loading consolidated summaries...
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-8 text-gray-500">
                    No sales summaries recorded for the selected date range.
                  </td>
                </tr>
              ) : (
                summaries.map((s, idx) => (
                  <tr key={s.id || `${s.business_date}-${s.computer_id}-${idx}`} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/50">
                    <td className="px-3.5 py-2.5 font-mono font-medium text-gray-900 dark:text-white">
                      {s.business_date}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded text-[10px]">
                        {s.computer_id}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">{s.total_tickets}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{s.single_kart_tickets}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{s.double_kart_tickets}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{s.silver_package_tickets}</td>
                    <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400">{s.golden_package_tickets}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{s.total_gokart_sales.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{s.air_rifle_sales.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{s.horse_riding_sales.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {(Number(s.car_simulator_sales || 0) + Number(s.moto_simulation_sales || 0)).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {s.cash_total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400">
                      {s.upi_total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-purple-600 dark:text-purple-400">
                      {s.card_total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                      ₹{s.total_sales.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Grand Total Footer */}
            {summaries.length > 0 && (
              <tfoot className="bg-gray-100 dark:bg-gray-900 font-bold border-t-2 border-gray-300 dark:border-gray-700">
                <tr>
                  <td className="px-3.5 py-3 text-gray-900 dark:text-white uppercase font-extrabold" colSpan={2}>
                    Total ({summaries.length} Records)
                  </td>
                  <td className="px-3 py-3 text-right">{totals.total_tickets}</td>
                  <td className="px-3 py-3 text-right">{totals.single_kart_tickets}</td>
                  <td className="px-3 py-3 text-right">{totals.double_kart_tickets}</td>
                  <td className="px-3 py-3 text-right">{totals.silver_package_tickets}</td>
                  <td className="px-3 py-3 text-right">{totals.golden_package_tickets}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.total_gokart_sales.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.air_rifle_sales.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right font-mono">{totals.horse_riding_sales.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-3 text-right font-mono">
                    {(totals.car_simulator_sales + totals.moto_simulation_sales).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {totals.cash_total.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-blue-600 dark:text-blue-400">
                    {totals.upi_total.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-purple-600 dark:text-purple-400">
                    {totals.card_total.toLocaleString('en-IN')}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                    ₹{totals.total_sales.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
