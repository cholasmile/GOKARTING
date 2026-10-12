/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deuce Park — Activity-Wise Purchases & Expense Management Panel
 * Integrates inside the existing AdminDashboard "Accounts & Finance" tab.
 * Uses localStorage for persistence (offline-first, no new DB tables required).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Plus, Trash2, Edit, Download, Filter, Search,
  IndianRupee, FileText, BarChart2, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertCircle, Building2, Tag, Truck,
  Calendar, ChevronDown, ChevronUp, RefreshCw, Printer,
  PieChart, ArrowUpRight, ArrowDownRight, Layers, Settings,
  Save, X, AlertTriangle, Users, Clock, Check, ShieldCheck
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { StaffManagementPanel } from './StaffManagementPanel';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ExpenseDepartment =
  | 'Cafe / Food Street'
  | 'Go-Karting'
  | 'Air Rifle Shooting'
  | 'Horse Riding'
  | 'Sports Academy'
  | 'Gaming Zone'
  | 'Adventure Activities'
  | 'Maintenance & Repairs'
  | 'Administration / Office'
  | 'Marketing & Advertising'
  | 'Electricity, Water & Utilities'
  | 'Security & Housekeeping'
  | 'Common Park Expenses'
  | 'Other Activities'
  | string; // allows custom categories

export type PurchaseCategory =
  | 'Inventory / Stock'
  | 'Consumables'
  | 'Fixed Asset'
  | 'Repairs & Maintenance'
  | 'Utilities'
  | 'Salaries & Wages'
  | 'Marketing'
  | 'Safety Equipment'
  | 'Fuel & Lubricants'
  | 'Feed & Fodder'
  | 'Veterinary'
  | 'Cleaning Supplies'
  | 'Packaging Materials'
  | 'Kitchen Equipment'
  | 'Other Expense'
  | string;

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';
export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Credit';

export interface PurchaseEntry {
  id: string;
  date: string;                      // ISO date string
  department: ExpenseDepartment;
  category: PurchaseCategory;
  itemName: string;
  description?: string;
  supplier: string;
  invoiceNumber?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstPercent: number;               // e.g. 5, 12, 18, 28
  gstAmount: number;
  totalCost: number;                // quantity * unitPrice + gstAmount
  paymentMethod: PaymentMethod;
  amountPaid: number;
  outstandingBalance: number;       // totalCost - amountPaid
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Accounting classification
  isInventory: boolean;             // true = stock/asset, false = direct expense
  isFixedAsset: boolean;
  // Audit
  createdBy?: string;
  isReversed?: boolean;
  reversalNote?: string;
}

export interface CommonExpenseAllocation {
  purchaseId: string;
  department: ExpenseDepartment;
  allocationPercent: number;
  allocationAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DEPARTMENTS: ExpenseDepartment[] = [
  'Cafe / Food Street',
  'Go-Karting',
  'Air Rifle Shooting',
  'Horse Riding',
  'Sports Academy',
  'Gaming Zone',
  'Adventure Activities',
  'Maintenance & Repairs',
  'Administration / Office',
  'Marketing & Advertising',
  'Electricity, Water & Utilities',
  'Security & Housekeeping',
  'Common Park Expenses',
  'Other Activities',
];

const DEFAULT_CATEGORIES: PurchaseCategory[] = [
  'Inventory / Stock',
  'Consumables',
  'Fixed Asset',
  'Repairs & Maintenance',
  'Utilities',
  'Salaries & Wages',
  'Marketing',
  'Safety Equipment',
  'Fuel & Lubricants',
  'Feed & Fodder',
  'Veterinary',
  'Cleaning Supplies',
  'Packaging Materials',
  'Kitchen Equipment',
  'Other Expense',
];

// Suggested items per department (for quick entry UX)
const DEPT_ITEM_SUGGESTIONS: Record<string, string[]> = {
  'Cafe / Food Street': [
    'Vegetables & Groceries', 'Rice / Flour / Oil', 'Milk & Dairy Products',
    'Beverages & Packaged Drinks', 'Snacks & Bakery Products', 'Cooking Gas (LPG)',
    'Disposable Plates & Cups', 'Packaging Materials', 'Cleaning Materials',
    'Kitchen Equipment', 'Other Cafe Supplies',
  ],
  'Air Rifle Shooting': [
    'Air Rifle Equipment', 'Target Boards', 'Pellets & Consumables',
    'Safety Helmets', 'Equipment Maintenance', 'Replacement Parts', 'Other Shooting Supplies',
  ],
  'Go-Karting': [
    'Kart Purchase', 'Spare Parts', 'Tyres', 'Fuel & Lubricants',
    'Safety Helmets', 'Track Maintenance', 'Timing / GPS Equipment', 'Other Karting Expense',
  ],
  'Horse Riding': [
    'Feed & Fodder', 'Veterinary Expense', 'Saddles & Riding Equipment',
    'Safety Helmets', 'Stable Maintenance', 'Cleaning Supplies', 'Other Horse Riding Expense',
  ],
};

const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Credit'];
const LS_KEY_PURCHASES = 'dp_purchases_v1';
const LS_KEY_CUSTOM_DEPTS = 'dp_custom_departments_v1';
const LS_KEY_CUSTOM_CATS = 'dp_custom_categories_v1';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const genId = () => `purch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().split('T')[0];
const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function loadFromLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function saveToLS(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function computePaymentStatus(amountPaid: number, totalCost: number): PaymentStatus {
  if (amountPaid <= 0) return 'Unpaid';
  if (amountPaid >= totalCost) return 'Paid';
  return 'Partially Paid';
}

// ─────────────────────────────────────────────────────────────────────────────
// BLANK FORM
// ─────────────────────────────────────────────────────────────────────────────

const blankForm = (): Omit<PurchaseEntry, 'id' | 'createdAt' | 'updatedAt'> => ({
  date: today(),
  department: 'Cafe / Food Street',
  category: 'Inventory / Stock',
  itemName: '',
  description: '',
  supplier: '',
  invoiceNumber: '',
  quantity: 1,
  unit: 'Kg',
  unitPrice: 0,
  gstPercent: 5,
  gstAmount: 0,
  totalCost: 0,
  paymentMethod: 'Cash',
  amountPaid: 0,
  outstandingBalance: 0,
  paymentStatus: 'Unpaid',
  notes: '',
  isInventory: true,
  isFixedAsset: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}> = ({ label, value, sub, color = 'text-[#40E0D0]', icon }) => (
  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C] space-y-1">
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">{label}</p>
      {icon && <span className="text-[#94A3B8]">{icon}</span>}
    </div>
    <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
    {sub && <p className="text-[10px] text-[#6B7280]">{sub}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PANEL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const AccountsFinancePanel: React.FC = () => {
  const { 
    bookings, orders, activities, currentUser, 
    dayExpenses, updateExpenseWorkflowStatus, suppliers, purchaseItems 
  } = useAppContext();

  // ── Persisted State ────────────────────────────────────────────────────────
  const [purchases, setPurchases] = useState<PurchaseEntry[]>(() =>
    loadFromLS<PurchaseEntry[]>(LS_KEY_PURCHASES, [])
  );
  const [customDepts, setCustomDepts] = useState<string[]>(() =>
    loadFromLS<string[]>(LS_KEY_CUSTOM_DEPTS, [])
  );
  const [customCats, setCustomCats] = useState<string[]>(() =>
    loadFromLS<string[]>(LS_KEY_CUSTOM_CATS, [])
  );

  const allDepts = [...DEFAULT_DEPARTMENTS, ...customDepts];
  const allCats = [...DEFAULT_CATEGORIES, ...customCats];

  // Auto-save
  useEffect(() => { saveToLS(LS_KEY_PURCHASES, purchases); }, [purchases]);
  useEffect(() => { saveToLS(LS_KEY_CUSTOM_DEPTS, customDepts); }, [customDepts]);
  useEffect(() => { saveToLS(LS_KEY_CUSTOM_CATS, customCats); }, [customCats]);

  // ── UI State ──────────────────────────────────────────────────────────────
  type FinanceSubTab = 'overview' | 'entry' | 'register' | 'reports' | 'staff_payroll' | 'subadmin_submissions' | 'settings';
  const [subTab, setSubTab] = useState<FinanceSubTab>('overview');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(blankForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saveConfirm, setSaveConfirm] = useState(false);

  // Register filters
  const [regSearch, setRegSearch] = useState('');
  const [regDept, setRegDept] = useState<string>('all');
  const [regCat, setRegCat] = useState<string>('all');
  const [regSupplier, setRegSupplier] = useState('');
  const [regStatus, setRegStatus] = useState<string>('all');
  const [regMethod, setRegMethod] = useState<string>('all');
  const [regDateFrom, setRegDateFrom] = useState('');
  const [regDateTo, setRegDateTo] = useState('');

  // Report period
  const [reportPeriod, setReportPeriod] = useState<'month' | 'year' | 'all'>('month');
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportYear, setReportYear] = useState(() => String(new Date().getFullYear()));

  // Settings
  const [newDeptInput, setNewDeptInput] = useState('');
  const [newCatInput, setNewCatInput] = useState('');

  // ── Form Helpers ──────────────────────────────────────────────────────────
  const recalcTotals = (d: typeof formData) => {
    const base = (d.quantity || 0) * (d.unitPrice || 0);
    const gst = parseFloat(((base * (d.gstPercent || 0)) / 100).toFixed(2));
    const total = parseFloat((base + gst).toFixed(2));
    const outstanding = parseFloat(Math.max(0, total - (d.amountPaid || 0)).toFixed(2));
    const status = computePaymentStatus(d.amountPaid || 0, total);
    return { ...d, gstAmount: gst, totalCost: total, outstandingBalance: outstanding, paymentStatus: status };
  };

  const setField = <K extends keyof typeof formData>(k: K, v: typeof formData[K]) => {
    setFormData(prev => recalcTotals({ ...prev, [k]: v }));
  };

  const openNewForm = () => {
    setEditingId(null);
    setFormData(blankForm());
    setFormError(null);
    setShowForm(true);
    setSubTab('entry');
  };

  const openEditForm = (p: PurchaseEntry) => {
    setEditingId(p.id);
    setFormData({
      date: p.date, department: p.department, category: p.category,
      itemName: p.itemName, description: p.description || '',
      supplier: p.supplier, invoiceNumber: p.invoiceNumber || '',
      quantity: p.quantity, unit: p.unit, unitPrice: p.unitPrice,
      gstPercent: p.gstPercent, gstAmount: p.gstAmount, totalCost: p.totalCost,
      paymentMethod: p.paymentMethod, amountPaid: p.amountPaid,
      outstandingBalance: p.outstandingBalance, paymentStatus: p.paymentStatus,
      notes: p.notes || '', isInventory: p.isInventory, isFixedAsset: p.isFixedAsset,
    });
    setFormError(null);
    setShowForm(true);
    setSubTab('entry');
  };

  const handleSave = () => {
    if (!formData.itemName.trim()) { setFormError('Item name is required.'); return; }
    if (!formData.supplier.trim()) { setFormError('Supplier name is required.'); return; }
    if (!formData.department) { setFormError('Department / Activity is required.'); return; }
    if (formData.quantity <= 0) { setFormError('Quantity must be greater than 0.'); return; }
    if (formData.unitPrice < 0) { setFormError('Unit price cannot be negative.'); return; }

    const now = new Date().toISOString();
    if (editingId) {
      setPurchases(prev => prev.map(p => p.id === editingId
        ? { ...p, ...formData, updatedAt: now }
        : p
      ));
    } else {
      const entry: PurchaseEntry = {
        ...formData,
        id: genId(),
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.name || 'Admin',
      };
      setPurchases(prev => [entry, ...prev]);
    }
    setShowForm(false);
    setEditingId(null);
    setSaveConfirm(true);
    setTimeout(() => setSaveConfirm(false), 2500);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this purchase entry? This action cannot be undone.')) return;
    setPurchases(prev => prev.filter(p => p.id !== id));
  };

  const handleReverse = (id: string) => {
    const note = window.prompt('Enter reversal reason / audit note:');
    if (!note) return;
    setPurchases(prev => prev.map(p => p.id === id
      ? { ...p, isReversed: true, reversalNote: note, updatedAt: new Date().toISOString() }
      : p
    ));
  };

  // ── Data Computations ─────────────────────────────────────────────────────

  // Active (non-reversed) purchases
  const activePurchases = useMemo(() => purchases.filter(p => !p.isReversed), [purchases]);

  // Period filter for reports
  const periodPurchases = useMemo(() => {
    return activePurchases.filter(p => {
      if (reportPeriod === 'all') return true;
      if (reportPeriod === 'month') return p.date.startsWith(reportMonth);
      if (reportPeriod === 'year') return p.date.startsWith(reportYear);
      return true;
    });
  }, [activePurchases, reportPeriod, reportMonth, reportYear]);

  // Revenue from bookings + orders (activity-wise)
  const activityRevMap = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.paymentStatus === 'paid') {
        map[b.activityName] = (map[b.activityName] || 0) + (b.totalAmount || 0);
      }
    });
    return map;
  }, [bookings]);

  const totalFoodRevenue = useMemo(() =>
    orders.reduce((s, o) => s + (o.totalAmount || 0), 0), [orders]);

  // Activity-wise expense aggregation
  const deptStats = useMemo(() => {
    const stats: Record<string, {
      totalPurchases: number;
      directExpenses: number;
      inventoryPurchases: number;
      fixedAssets: number;
      gstTotal: number;
      paid: number;
      unpaid: number;
      count: number;
    }> = {};

    periodPurchases.forEach(p => {
      if (!stats[p.department]) {
        stats[p.department] = { totalPurchases: 0, directExpenses: 0, inventoryPurchases: 0, fixedAssets: 0, gstTotal: 0, paid: 0, unpaid: 0, count: 0 };
      }
      const s = stats[p.department];
      s.totalPurchases += p.totalCost;
      s.gstTotal += p.gstAmount;
      s.count += 1;
      if (p.isFixedAsset) s.fixedAssets += p.totalCost;
      else if (p.isInventory) s.inventoryPurchases += p.totalCost;
      else s.directExpenses += p.totalCost;
      s.paid += p.amountPaid;
      s.unpaid += p.outstandingBalance;
    });

    return stats;
  }, [periodPurchases]);

  // Supplier-wise totals
  const supplierStats = useMemo(() => {
    const stats: Record<string, { total: number; paid: number; outstanding: number; count: number }> = {};
    periodPurchases.forEach(p => {
      if (!stats[p.supplier]) stats[p.supplier] = { total: 0, paid: 0, outstanding: 0, count: 0 };
      stats[p.supplier].total += p.totalCost;
      stats[p.supplier].paid += p.amountPaid;
      stats[p.supplier].outstanding += p.outstandingBalance;
      stats[p.supplier].count += 1;
    });
    return stats;
  }, [periodPurchases]);

  // Overall totals
  const overallStats = useMemo(() => {
    const total = periodPurchases.reduce((s, p) => s + p.totalCost, 0);
    const paid = periodPurchases.reduce((s, p) => s + p.amountPaid, 0);
    const outstanding = periodPurchases.reduce((s, p) => s + p.outstandingBalance, 0);
    const gst = periodPurchases.reduce((s, p) => s + p.gstAmount, 0);
    const directExp = periodPurchases.filter(p => !p.isInventory && !p.isFixedAsset).reduce((s, p) => s + p.totalCost, 0);
    const inventoryVal = periodPurchases.filter(p => p.isInventory && !p.isFixedAsset).reduce((s, p) => s + p.totalCost, 0);
    const assetVal = periodPurchases.filter(p => p.isFixedAsset).reduce((s, p) => s + p.totalCost, 0);
    return { total, paid, outstanding, gst, directExp, inventoryVal, assetVal };
  }, [periodPurchases]);

  // Revenue for overview
  const totalActivityRevenue = useMemo(() =>
    Object.values(activityRevMap).reduce((s, v) => s + v, 0), [activityRevMap]);
  const totalRevenue = totalActivityRevenue + totalFoodRevenue;

  // Profit/loss (revenue - direct operating expenses only, NOT inventory/assets)
  const operatingProfit = totalRevenue - overallStats.directExp;

  // ── Register Filter Logic ─────────────────────────────────────────────────
  const filteredRegister = useMemo(() => {
    return activePurchases.filter(p => {
      if (regDept !== 'all' && p.department !== regDept) return false;
      if (regCat !== 'all' && p.category !== regCat) return false;
      if (regStatus !== 'all' && p.paymentStatus !== regStatus) return false;
      if (regMethod !== 'all' && p.paymentMethod !== regMethod) return false;
      if (regSupplier && !p.supplier.toLowerCase().includes(regSupplier.toLowerCase())) return false;
      if (regDateFrom && p.date < regDateFrom) return false;
      if (regDateTo && p.date > regDateTo) return false;
      if (regSearch) {
        const q = regSearch.toLowerCase();
        if (!p.itemName.toLowerCase().includes(q) &&
            !p.supplier.toLowerCase().includes(q) &&
            !(p.invoiceNumber || '').toLowerCase().includes(q) &&
            !p.department.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [activePurchases, regDept, regCat, regStatus, regMethod, regSupplier, regDateFrom, regDateTo, regSearch]);

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Date', 'Department', 'Category', 'Item', 'Supplier', 'Invoice#',
      'Qty', 'Unit', 'Unit Price', 'GST%', 'GST Amt', 'Total', 'Paid', 'Outstanding',
      'Status', 'Method', 'Inventory?', 'Fixed Asset?', 'Notes'];
    const rows = filteredRegister.map(p => [
      p.date, `"${p.department}"`, `"${p.category}"`, `"${p.itemName}"`, `"${p.supplier}"`,
      p.invoiceNumber || '', p.quantity, p.unit, p.unitPrice, p.gstPercent,
      p.gstAmount, p.totalCost, p.amountPaid, p.outstandingBalance,
      p.paymentStatus, p.paymentMethod, p.isInventory ? 'Yes' : 'No',
      p.isFixedAsset ? 'Yes' : 'No', `"${p.notes || ''}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deuce_purchases_${today()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const statusBadge = (s: PaymentStatus) => {
    if (s === 'Paid') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (s === 'Partially Paid') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  };

  const subTabs: { key: FinanceSubTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { key: 'entry', label: 'New Entry', icon: <Plus className="w-3.5 h-3.5" /> },
    { key: 'register', label: 'Purchase Register', icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'reports', label: 'Reports', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'staff_payroll', label: 'Staff Attendance & Payroll', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'subadmin_submissions', label: 'Sub-Admin Entries & Approvals', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'settings', label: 'Categories', icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-[#00ABAB]" />
            Accounts &amp; Finance — Expense Management
          </h3>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Activity-wise purchases, operating expenses, supplier tracking, and profit/loss analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveConfirm && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold animate-pulse">
              <CheckCircle className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={openNewForm}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#00ABAB] text-black rounded-xl text-xs font-black hover:bg-[#40E0D0] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Purchase / Expense
          </button>
        </div>
      </div>

      {/* ── Sub Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#1C1C1C] gap-1 overflow-x-auto pb-1">
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setSubTab(t.key); if (t.key !== 'entry') setShowForm(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
              subTab === t.key
                ? 'border-[#00ABAB] text-[#00ABAB]'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'overview' && (
        <div className="space-y-6">

          {/* Period Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider">Period:</span>
            {(['month', 'year', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setReportPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  reportPeriod === p ? 'bg-[#00ABAB] text-black' : 'bg-[#1C1C1C] text-[#94A3B8] hover:text-white'
                }`}
              >
                {p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'All Time'}
              </button>
            ))}
            {reportPeriod === 'month' && (
              <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00ABAB]" />
            )}
            {reportPeriod === 'year' && (
              <input type="number" value={reportYear} onChange={e => setReportYear(e.target.value)}
                min="2020" max="2099" placeholder="YYYY"
                className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg px-2 py-1 text-xs text-white font-mono w-24 focus:outline-none focus:border-[#00ABAB]" />
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total Revenue" value={fmtINR(totalRevenue)} sub="Activities + Food Street" color="text-[#40E0D0]" icon={<TrendingUp className="w-4 h-4" />} />
            <StatCard label="Total Purchases" value={fmtINR(overallStats.total)} sub={`${periodPurchases.length} entries`} color="text-amber-400" icon={<ShoppingCart className="w-4 h-4" />} />
            <StatCard label="Direct Expenses" value={fmtINR(overallStats.directExp)} sub="Operating costs only" color="text-rose-400" icon={<TrendingDown className="w-4 h-4" />} />
            <StatCard label="Total GST" value={fmtINR(overallStats.gst)} sub="Input tax total" color="text-violet-400" icon={<Layers className="w-4 h-4" />} />
            <StatCard
              label="Operating Profit/Loss"
              value={fmtINR(Math.abs(operatingProfit))}
              sub={operatingProfit >= 0 ? 'Profit' : 'Loss'}
              color={operatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}
              icon={operatingProfit >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            />
          </div>

          {/* Payment Status Summary */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Amount Paid" value={fmtINR(overallStats.paid)} color="text-emerald-400" />
            <StatCard label="Outstanding Balance" value={fmtINR(overallStats.outstanding)} color="text-rose-400" />
            <StatCard label="Inventory / Assets" value={fmtINR(overallStats.inventoryVal + overallStats.assetVal)} sub="Not counted as expense" color="text-blue-400" />
          </div>

          {/* Activity-Wise Revenue */}
          <div className="glass-panel border border-[#00ABAB]/20 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#00ABAB]" /> Activity-Wise Revenue vs. Expenses
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#94A3B8] border-b border-[#1C1C1C]">
                    <th className="text-left py-2 px-3 font-bold">Activity / Department</th>
                    <th className="text-right py-2 px-3 font-bold">Revenue</th>
                    <th className="text-right py-2 px-3 font-bold">Total Purchases</th>
                    <th className="text-right py-2 px-3 font-bold">Direct Expenses</th>
                    <th className="text-right py-2 px-3 font-bold">GST</th>
                    <th className="text-right py-2 px-3 font-bold">Op. Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {/* Cafe row */}
                  {(() => {
                    const cafeRev = totalFoodRevenue;
                    const cafeExp = deptStats['Cafe / Food Street'];
                    const cafeDirectExp = cafeExp?.directExpenses || 0;
                    const result = cafeRev - cafeDirectExp;
                    return (
                      <tr key="cafe" className="hover:bg-[#1C1C1C]/40 transition-colors">
                        <td className="py-2 px-3 font-medium text-white">Cafe / Food Street</td>
                        <td className="py-2 px-3 text-right text-emerald-400">{fmtINR(cafeRev)}</td>
                        <td className="py-2 px-3 text-right text-amber-400">{fmtINR(cafeExp?.totalPurchases || 0)}</td>
                        <td className="py-2 px-3 text-right text-rose-400">{fmtINR(cafeDirectExp)}</td>
                        <td className="py-2 px-3 text-right text-violet-400">{fmtINR(cafeExp?.gstTotal || 0)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {result >= 0 ? '+' : ''}{fmtINR(result)}
                        </td>
                      </tr>
                    );
                  })()}
                  {/* Activity rows */}
                  {activities.filter(a => !a.name?.toLowerCase().includes('gaming')).map(act => {
                    const rev = activityRevMap[act.name] || 0;
                    // Map activity name to expense department
                    const deptKey = act.type === 'go_karting' ? 'Go-Karting'
                      : act.type === 'shooting' ? 'Air Rifle Shooting'
                      : act.type === 'horse_riding' ? 'Horse Riding'
                      : act.name;
                    const exp = deptStats[deptKey];
                    const directExp = exp?.directExpenses || 0;
                    const result = rev - directExp;
                    return (
                      <tr key={act.id} className="hover:bg-[#1C1C1C]/40 transition-colors">
                        <td className="py-2 px-3 font-medium text-white">{act.name}</td>
                        <td className="py-2 px-3 text-right text-emerald-400">{fmtINR(rev)}</td>
                        <td className="py-2 px-3 text-right text-amber-400">{fmtINR(exp?.totalPurchases || 0)}</td>
                        <td className="py-2 px-3 text-right text-rose-400">{fmtINR(directExp)}</td>
                        <td className="py-2 px-3 text-right text-violet-400">{fmtINR(exp?.gstTotal || 0)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {result >= 0 ? '+' : ''}{fmtINR(result)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Other departments */}
                  {Object.keys(deptStats)
                    .filter(d => d !== 'Cafe / Food Street' && !activities.some(a => {
                      const mapped = a.type === 'go_karting' ? 'Go-Karting'
                        : a.type === 'shooting' ? 'Air Rifle Shooting'
                        : a.type === 'horse_riding' ? 'Horse Riding'
                        : a.name;
                      return mapped === d;
                    }))
                    .map(dept => {
                      const exp = deptStats[dept];
                      return (
                        <tr key={dept} className="hover:bg-[#1C1C1C]/40 transition-colors">
                          <td className="py-2 px-3 font-medium text-[#94A3B8]">{dept}</td>
                          <td className="py-2 px-3 text-right text-[#94A3B8]">—</td>
                          <td className="py-2 px-3 text-right text-amber-400">{fmtINR(exp.totalPurchases)}</td>
                          <td className="py-2 px-3 text-right text-rose-400">{fmtINR(exp.directExpenses)}</td>
                          <td className="py-2 px-3 text-right text-violet-400">{fmtINR(exp.gstTotal)}</td>
                          <td className="py-2 px-3 text-right text-rose-400">{fmtINR(-exp.directExpenses)}</td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="border-t-2 border-[#00ABAB]/40">
                  <tr className="font-black text-white">
                    <td className="py-3 px-3">TOTAL DEUCE PARK</td>
                    <td className="py-3 px-3 text-right text-emerald-400">{fmtINR(totalRevenue)}</td>
                    <td className="py-3 px-3 text-right text-amber-400">{fmtINR(overallStats.total)}</td>
                    <td className="py-3 px-3 text-right text-rose-400">{fmtINR(overallStats.directExp)}</td>
                    <td className="py-3 px-3 text-right text-violet-400">{fmtINR(overallStats.gst)}</td>
                    <td className={`py-3 px-3 text-right ${operatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {operatingProfit >= 0 ? '+' : ''}{fmtINR(operatingProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-[10px] text-[#6B7280] mt-3">
              * Operating Result = Revenue − Direct Operating Expenses only. Inventory purchases and fixed assets are not counted as operating expenses.
              Common park expenses are not auto-allocated across activities — they are shown separately.
            </p>
          </div>

          {/* Supplier Outstanding Summary */}
          {Object.keys(supplierStats).length > 0 && (
            <div className="glass-panel border border-[#1C1C1C] rounded-2xl p-5">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" /> Supplier Outstanding Balances
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#94A3B8] border-b border-[#1C1C1C]">
                      <th className="text-left py-2 px-3">Supplier</th>
                      <th className="text-right py-2 px-3">Entries</th>
                      <th className="text-right py-2 px-3">Total</th>
                      <th className="text-right py-2 px-3">Paid</th>
                      <th className="text-right py-2 px-3">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C]">
                    {Object.entries(supplierStats).sort((a, b) => b[1].outstanding - a[1].outstanding).map(([sup, s]) => (
                      <tr key={sup} className="hover:bg-[#1C1C1C]/40 transition-colors">
                        <td className="py-2 px-3 font-medium text-white">{sup}</td>
                        <td className="py-2 px-3 text-right text-[#94A3B8]">{s.count}</td>
                        <td className="py-2 px-3 text-right text-white">{fmtINR(s.total)}</td>
                        <td className="py-2 px-3 text-right text-emerald-400">{fmtINR(s.paid)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${s.outstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {fmtINR(s.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ENTRY FORM TAB                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'entry' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">
              {editingId ? 'Edit Purchase Entry' : 'New Purchase / Expense Entry'}
            </h4>
            {editingId && (
              <button onClick={() => { setEditingId(null); setFormData(blankForm()); setFormError(null); }}
                className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> New Entry
              </button>
            )}
          </div>

          {formError && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}

          <div className="glass-panel border border-[#00ABAB]/20 rounded-2xl p-5 space-y-5">

            {/* Row 1: Date + Department + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Date *</label>
                <input type="date" value={formData.date} onChange={e => setField('date', e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Expense Department / Activity *</label>
                <select value={formData.department} onChange={e => setField('department', e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none">
                  {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Purchase Category *</label>
                <select value={formData.category} onChange={e => setField('category', e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none">
                  {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Row 2: Item + Supplier + Invoice */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Item Name *</label>
                <input
                  type="text"
                  value={formData.itemName}
                  onChange={e => setField('itemName', e.target.value)}
                  placeholder="e.g. Cooking Gas LPG, Kart Tyre, Pellets..."
                  list={`item-suggestions-${formData.department}`}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none"
                />
                <datalist id={`item-suggestions-${formData.department}`}>
                  {(DEPT_ITEM_SUGGESTIONS[formData.department] || []).map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Supplier *</label>
                <input type="text" value={formData.supplier} onChange={e => setField('supplier', e.target.value)}
                  placeholder="Supplier name" list="supplier-list"
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none" />
                <datalist id="supplier-list">
                  {[...new Set(activePurchases.map(p => p.supplier))].map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Invoice Number</label>
                <input type="text" value={formData.invoiceNumber || ''} onChange={e => setField('invoiceNumber', e.target.value)}
                  placeholder="e.g. INV-2024-001"
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none font-mono" />
              </div>
            </div>

            {/* Row 3: Quantity + Unit + Unit Price + GST */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Quantity *</label>
                <input type="number" min="0.001" step="0.001" value={formData.quantity}
                  onChange={e => setField('quantity', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Unit</label>
                <input type="text" value={formData.unit} onChange={e => setField('unit', e.target.value)}
                  placeholder="Kg / Ltr / Nos / Box..."
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Unit Price (₹) *</label>
                <input type="number" min="0" step="0.01" value={formData.unitPrice}
                  onChange={e => setField('unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">GST %</label>
                <select value={formData.gstPercent} onChange={e => setField('gstPercent', parseInt(e.target.value))}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none">
                  {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
            </div>

            {/* Row 4: Calculated Totals (read-only display) */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-[#0A0A0A] rounded-xl border border-[#1C1C1C]">
              <div>
                <p className="text-[10px] text-[#94A3B8] font-mono uppercase mb-1">GST Amount</p>
                <p className="text-sm font-black text-violet-400 font-mono">{fmtINR(formData.gstAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8] font-mono uppercase mb-1">Total Cost (incl. GST)</p>
                <p className="text-sm font-black text-white font-mono">{fmtINR(formData.totalCost)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#94A3B8] font-mono uppercase mb-1">Outstanding Balance</p>
                <p className={`text-sm font-black font-mono ${formData.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {fmtINR(formData.outstandingBalance)}
                </p>
              </div>
            </div>

            {/* Row 5: Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Payment Method</label>
                <select value={formData.paymentMethod} onChange={e => setField('paymentMethod', e.target.value as PaymentMethod)}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Amount Paid (₹)</label>
                <input type="number" min="0" step="0.01" value={formData.amountPaid}
                  onChange={e => setField('amountPaid', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none font-mono" />
              </div>
              <div className="flex items-end">
                <span className={`px-3 py-2 rounded-xl text-xs font-bold border ${statusBadge(formData.paymentStatus)}`}>
                  {formData.paymentStatus}
                </span>
              </div>
            </div>

            {/* Row 6: Accounting classification */}
            <div className="flex flex-wrap gap-6 p-4 bg-[#0A0A0A] rounded-xl border border-[#1C1C1C]">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="chk-inventory" checked={formData.isInventory}
                  onChange={e => setField('isInventory', e.target.checked)}
                  className="w-4 h-4 rounded accent-[#00ABAB]" />
                <label htmlFor="chk-inventory" className="text-xs text-white font-bold cursor-pointer">
                  Inventory / Stock Purchase
                  <span className="text-[10px] text-[#94A3B8] font-normal ml-1">(not a direct operating expense)</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="chk-asset" checked={formData.isFixedAsset}
                  onChange={e => setField('isFixedAsset', e.target.checked)}
                  className="w-4 h-4 rounded accent-violet-500" />
                <label htmlFor="chk-asset" className="text-xs text-white font-bold cursor-pointer">
                  Fixed Asset Purchase
                  <span className="text-[10px] text-[#94A3B8] font-normal ml-1">(capitalised, not expensed)</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 font-mono">Notes / Description</label>
              <textarea value={formData.notes || ''} onChange={e => setField('notes', e.target.value)}
                rows={2} placeholder="Additional details, batch number, reference..."
                className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none resize-none" />
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#00ABAB] text-black rounded-xl text-xs font-black hover:bg-[#40E0D0] transition-colors">
                <Save className="w-4 h-4" /> {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); setSubTab('register'); }}
                className="px-5 py-2.5 bg-[#1C1C1C] text-[#94A3B8] rounded-xl text-xs font-bold hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PURCHASE REGISTER TAB                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'register' && (
        <div className="space-y-4">

          {/* Filters */}
          <div className="glass-panel border border-[#1C1C1C] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Filter className="w-4 h-4 text-[#94A3B8]" />
              <span className="text-xs font-bold text-white">Filters</span>
              <button onClick={() => { setRegSearch(''); setRegDept('all'); setRegCat('all'); setRegSupplier(''); setRegStatus('all'); setRegMethod('all'); setRegDateFrom(''); setRegDateTo(''); }}
                className="ml-auto text-[10px] text-[#94A3B8] hover:text-white flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="relative col-span-2 sm:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                <input type="text" value={regSearch} onChange={e => setRegSearch(e.target.value)}
                  placeholder="Search item, supplier, invoice..."
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl pl-9 pr-3 py-2 text-white text-xs outline-none" />
              </div>
              <select value={regDept} onChange={e => setRegDept(e.target.value)}
                className="bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none">
                <option value="all">All Departments</option>
                {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={regCat} onChange={e => setRegCat(e.target.value)}
                className="bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none">
                <option value="all">All Categories</option>
                {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={regStatus} onChange={e => setRegStatus(e.target.value)}
                className="bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none">
                <option value="all">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
              <select value={regMethod} onChange={e => setRegMethod(e.target.value)}
                className="bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none">
                <option value="all">All Methods</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div>
                <input type="text" value={regSupplier} onChange={e => setRegSupplier(e.target.value)}
                  placeholder="Supplier name..."
                  className="w-full bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none" />
              </div>
              <div className="flex gap-2">
                <input type="date" value={regDateFrom} onChange={e => setRegDateFrom(e.target.value)}
                  className="flex-1 bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-2 py-2 text-white text-[10px] outline-none font-mono" />
                <input type="date" value={regDateTo} onChange={e => setRegDateTo(e.target.value)}
                  className="flex-1 bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-2 py-2 text-white text-[10px] outline-none font-mono" />
              </div>
            </div>
          </div>

          {/* Export + Count */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">{filteredRegister.length} entries</span>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1C] border border-[#2C2C2C] text-white rounded-xl text-xs font-bold hover:border-[#00ABAB] transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[#1C1C1C]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1C1C1C] text-[#94A3B8] text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3 py-3">Date</th>
                  <th className="text-left px-3 py-3">Department</th>
                  <th className="text-left px-3 py-3">Item</th>
                  <th className="text-left px-3 py-3">Supplier</th>
                  <th className="text-left px-3 py-3">Invoice</th>
                  <th className="text-right px-3 py-3">Qty</th>
                  <th className="text-right px-3 py-3">Unit Price</th>
                  <th className="text-right px-3 py-3">GST</th>
                  <th className="text-right px-3 py-3">Total</th>
                  <th className="text-right px-3 py-3">Paid</th>
                  <th className="text-right px-3 py-3">Outstanding</th>
                  <th className="text-left px-3 py-3">Status</th>
                  <th className="text-left px-3 py-3">Type</th>
                  <th className="text-left px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {filteredRegister.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-10 text-[#94A3B8]">
                    No purchase entries found. Add your first entry using the "New Entry" tab.
                  </td></tr>
                ) : filteredRegister.map(p => (
                  <tr key={p.id} className="hover:bg-[#1C1C1C]/50 transition-colors">
                    <td className="px-3 py-2 font-mono text-[#94A3B8]">{p.date}</td>
                    <td className="px-3 py-2 max-w-[120px] truncate text-white">{p.department}</td>
                    <td className="px-3 py-2 font-medium text-white max-w-[150px]">
                      <div className="truncate">{p.itemName}</div>
                      <div className="text-[10px] text-[#6B7280] truncate">{p.category}</div>
                    </td>
                    <td className="px-3 py-2 text-[#94A3B8]">{p.supplier}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-[#6B7280]">{p.invoiceNumber || '—'}</td>
                    <td className="px-3 py-2 text-right text-[#94A3B8]">{p.quantity} {p.unit}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtINR(p.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-mono text-violet-400">{fmtINR(p.gstAmount)}<span className="text-[10px] text-[#6B7280]"> ({p.gstPercent}%)</span></td>
                    <td className="px-3 py-2 text-right font-bold font-mono text-white">{fmtINR(p.totalCost)}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{fmtINR(p.amountPaid)}</td>
                    <td className={`px-3 py-2 text-right font-mono font-bold ${p.outstandingBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {fmtINR(p.outstandingBalance)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBadge(p.paymentStatus)}`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {p.isFixedAsset ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Asset</span>
                      ) : p.isInventory ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">Expense</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(p)}
                          className="p-1 text-[#94A3B8] hover:text-[#00ABAB] transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleReverse(p.id)}
                          className="p-1 text-[#94A3B8] hover:text-amber-400 transition-colors" title="Reverse/Void">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="p-1 text-[#94A3B8] hover:text-rose-400 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reversed entries toggle */}
          {purchases.filter(p => p.isReversed).length > 0 && (
            <details className="text-xs text-[#94A3B8]">
              <summary className="cursor-pointer hover:text-white py-2">
                {purchases.filter(p => p.isReversed).length} reversed / voided entries (click to view)
              </summary>
              <div className="mt-2 space-y-1">
                {purchases.filter(p => p.isReversed).map(p => (
                  <div key={p.id} className="p-3 bg-[#1C1C1C] rounded-xl opacity-60 flex justify-between items-center">
                    <span>{p.date} — {p.itemName} — {p.supplier} — {fmtINR(p.totalCost)}</span>
                    <span className="text-amber-400 text-[10px]">REVERSED: {p.reversalNote}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* REPORTS TAB                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'reports' && (
        <div className="space-y-6">

          {/* Period picker (reuse) */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider">Period:</span>
            {(['month', 'year', 'all'] as const).map(p => (
              <button key={p} onClick={() => setReportPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${reportPeriod === p ? 'bg-[#00ABAB] text-black' : 'bg-[#1C1C1C] text-[#94A3B8] hover:text-white'}`}>
                {p === 'month' ? 'This Month' : p === 'year' ? 'This Year' : 'All Time'}
              </button>
            ))}
            {reportPeriod === 'month' && (
              <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#00ABAB]" />
            )}
            {reportPeriod === 'year' && (
              <input type="number" value={reportYear} onChange={e => setReportYear(e.target.value)}
                min="2020" max="2099"
                className="bg-[#1C1C1C] border border-[#2C2C2C] rounded-lg px-2 py-1 text-xs text-white font-mono w-24 focus:outline-none focus:border-[#00ABAB]" />
            )}
            <button onClick={exportCSV}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1C] border border-[#2C2C2C] text-white rounded-xl text-xs font-bold hover:border-[#00ABAB] transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* Department-wise expense report */}
          <div className="glass-panel border border-[#00ABAB]/20 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00ABAB]" /> Department-Wise Expense Report
            </h4>
            {Object.keys(deptStats).length === 0 ? (
              <p className="text-[#94A3B8] text-xs text-center py-8">No purchase data for selected period. Add entries in the "New Entry" tab.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#94A3B8] border-b border-[#1C1C1C] text-[10px] uppercase tracking-wider">
                      <th className="text-left py-2 px-3">Department</th>
                      <th className="text-right py-2 px-3">Entries</th>
                      <th className="text-right py-2 px-3">Total Purchases</th>
                      <th className="text-right py-2 px-3">Direct Expenses</th>
                      <th className="text-right py-2 px-3">Stock / Inventory</th>
                      <th className="text-right py-2 px-3">Fixed Assets</th>
                      <th className="text-right py-2 px-3">GST</th>
                      <th className="text-right py-2 px-3">Paid</th>
                      <th className="text-right py-2 px-3">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C]">
                    {Object.entries(deptStats).sort((a, b) => b[1].totalPurchases - a[1].totalPurchases).map(([dept, s]) => (
                      <tr key={dept} className="hover:bg-[#1C1C1C]/40 transition-colors">
                        <td className="py-2 px-3 font-medium text-white">{dept}</td>
                        <td className="py-2 px-3 text-right text-[#94A3B8]">{s.count}</td>
                        <td className="py-2 px-3 text-right font-mono text-white">{fmtINR(s.totalPurchases)}</td>
                        <td className="py-2 px-3 text-right font-mono text-rose-400">{fmtINR(s.directExpenses)}</td>
                        <td className="py-2 px-3 text-right font-mono text-amber-400">{fmtINR(s.inventoryPurchases)}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-400">{fmtINR(s.fixedAssets)}</td>
                        <td className="py-2 px-3 text-right font-mono text-violet-400">{fmtINR(s.gstTotal)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400">{fmtINR(s.paid)}</td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${s.unpaid > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {fmtINR(s.unpaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-[#00ABAB]/40">
                    <tr className="font-black text-white text-[11px]">
                      <td className="py-3 px-3">TOTAL</td>
                      <td className="py-3 px-3 text-right text-[#94A3B8]">{periodPurchases.length}</td>
                      <td className="py-3 px-3 text-right font-mono">{fmtINR(overallStats.total)}</td>
                      <td className="py-3 px-3 text-right font-mono text-rose-400">{fmtINR(overallStats.directExp)}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-400">{fmtINR(overallStats.inventoryVal)}</td>
                      <td className="py-3 px-3 text-right font-mono text-blue-400">{fmtINR(overallStats.assetVal)}</td>
                      <td className="py-3 px-3 text-right font-mono text-violet-400">{fmtINR(overallStats.gst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400">{fmtINR(overallStats.paid)}</td>
                      <td className={`py-3 px-3 text-right font-mono ${overallStats.outstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fmtINR(overallStats.outstanding)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Supplier Outstanding Report */}
          <div className="glass-panel border border-[#1C1C1C] rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" /> Supplier-Wise Purchase & Outstanding Report
            </h4>
            {Object.keys(supplierStats).length === 0 ? (
              <p className="text-[#94A3B8] text-xs text-center py-6">No supplier data for selected period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[#94A3B8] border-b border-[#1C1C1C] text-[10px] uppercase tracking-wider">
                      <th className="text-left py-2 px-3">Supplier</th>
                      <th className="text-right py-2 px-3">Entries</th>
                      <th className="text-right py-2 px-3">Total Billed</th>
                      <th className="text-right py-2 px-3">Total Paid</th>
                      <th className="text-right py-2 px-3">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C]">
                    {Object.entries(supplierStats).sort((a, b) => b[1].outstanding - a[1].outstanding).map(([sup, s]) => (
                      <tr key={sup} className="hover:bg-[#1C1C1C]/40 transition-colors">
                        <td className="py-2 px-3 font-medium text-white">{sup}</td>
                        <td className="py-2 px-3 text-right text-[#94A3B8]">{s.count}</td>
                        <td className="py-2 px-3 text-right font-mono text-white">{fmtINR(s.total)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-400">{fmtINR(s.paid)}</td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${s.outstanding > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {fmtINR(s.outstanding)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* GST Summary */}
          <div className="glass-panel border border-violet-500/20 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-violet-400" /> Activity-Wise GST Input Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(deptStats).map(([dept, s]) => (
                <div key={dept} className="bg-[#0A0A0A] p-3 rounded-xl border border-[#1C1C1C]">
                  <p className="text-[10px] text-[#94A3B8] font-mono truncate mb-1">{dept}</p>
                  <p className="text-sm font-black text-violet-400 font-mono">{fmtINR(s.gstTotal)}</p>
                  <p className="text-[10px] text-[#6B7280]">from {s.count} entries</p>
                </div>
              ))}
              <div className="bg-[#0A0A0A] p-3 rounded-xl border border-violet-500/30">
                <p className="text-[10px] text-violet-400 font-mono font-bold mb-1">TOTAL GST INPUT</p>
                <p className="text-sm font-black text-violet-400 font-mono">{fmtINR(overallStats.gst)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SETTINGS TAB — Add Custom Departments & Categories                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          <p className="text-xs text-[#94A3B8]">
            Add custom departments/activities and purchase categories here. They will appear in all dropdowns immediately, 
            without requiring any software update.
          </p>

          {/* Add Custom Department */}
          <div className="glass-panel border border-[#1C1C1C] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00ABAB]" /> Custom Expense Departments / Activities
            </h4>
            <div className="flex gap-2">
              <input type="text" value={newDeptInput} onChange={e => setNewDeptInput(e.target.value)}
                placeholder="e.g. Archery Range, Laser Tag..."
                className="flex-1 bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newDeptInput.trim()) {
                    if (!allDepts.includes(newDeptInput.trim())) {
                      setCustomDepts(prev => [...prev, newDeptInput.trim()]);
                    }
                    setNewDeptInput('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newDeptInput.trim() && !allDepts.includes(newDeptInput.trim())) {
                    setCustomDepts(prev => [...prev, newDeptInput.trim()]);
                    setNewDeptInput('');
                  }
                }}
                className="px-3 py-2 bg-[#00ABAB] text-black rounded-xl text-xs font-black hover:bg-[#40E0D0] transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-bold">All Departments</p>
              <div className="flex flex-wrap gap-2">
                {allDepts.map(d => (
                  <span key={d} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1C1C1C] border border-[#2C2C2C] text-[11px] text-white">
                    {d}
                    {customDepts.includes(d) && (
                      <button onClick={() => setCustomDepts(prev => prev.filter(x => x !== d))}
                        className="text-[#94A3B8] hover:text-rose-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Add Custom Category */}
          <div className="glass-panel border border-[#1C1C1C] rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400" /> Custom Purchase Categories
            </h4>
            <div className="flex gap-2">
              <input type="text" value={newCatInput} onChange={e => setNewCatInput(e.target.value)}
                placeholder="e.g. Insurance Premium, Licence Fees..."
                className="flex-1 bg-[#1C1C1C] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newCatInput.trim()) {
                    if (!allCats.includes(newCatInput.trim())) {
                      setCustomCats(prev => [...prev, newCatInput.trim()]);
                    }
                    setNewCatInput('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newCatInput.trim() && !allCats.includes(newCatInput.trim())) {
                    setCustomCats(prev => [...prev, newCatInput.trim()]);
                    setNewCatInput('');
                  }
                }}
                className="px-3 py-2 bg-amber-500 text-black rounded-xl text-xs font-black hover:bg-amber-400 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allCats.map(c => (
                <span key={c} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1C1C1C] border border-[#2C2C2C] text-[11px] text-white">
                  {c}
                  {customCats.includes(c) && (
                    <button onClick={() => setCustomCats(prev => prev.filter(x => x !== c))}
                      className="text-[#94A3B8] hover:text-rose-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Accounting Note */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
            <p className="font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Accounting Guidelines</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/80">
              <li>Mark purchases as "Inventory / Stock" if they are goods held for use, not immediate expense.</li>
              <li>Mark as "Fixed Asset" for equipment and durable goods — these are capitalised, not expensed.</li>
              <li>Only direct operating expenses (unchecked) reduce the activity operating result.</li>
              <li>Common park expenses are tracked separately and can be manually allocated by an authorised approver.</li>
              <li>Use "Reverse / Void" to audit-safely undo a posted entry — never delete a confirmed entry without voiding first.</li>
              <li>GST amounts shown are input tax totals (purchases), not GST collected on sales.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* STAFF ATTENDANCE & PAYROLL INTEGRATION                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'staff_payroll' && (
        <div className="space-y-4">
          <StaffManagementPanel isSuperAdmin={currentUser?.role === 'super_admin'} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SUB-ADMIN ENTRIES REVIEW & APPROVAL WORKFLOW                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'subadmin_submissions' && (
        <div className="space-y-6">
          <div className="p-4 bg-[#121A24] border border-[#00ABAB]/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00ABAB]" /> Super Admin Review &amp; Approval Queue
              </h4>
              <p className="text-xs text-[#9CA3AF]">
                Review operational expense vouchers submitted by Sub-Admins. Approved entries automatically post into the general ledger.
              </p>
            </div>
            <div className="text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              Pending Review: {dayExpenses.filter(e => e.workflowStatus === 'submitted').length}
            </div>
          </div>

          {/* Master records overview counts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#94A3B8]">Approved Suppliers</span>
              <div className="text-xl font-bold font-mono text-white">{suppliers.length} Registered</div>
              <p className="text-[10px] text-[#6B7280]">Maintained by Sub-Admin</p>
            </div>
            <div className="p-4 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#94A3B8]">Configured Purchase Items</span>
              <div className="text-xl font-bold font-mono text-white">{purchaseItems.length} Items</div>
              <p className="text-[10px] text-[#6B7280]">With standard tax classifications</p>
            </div>
            <div className="p-4 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#94A3B8]">Expense Vouchers</span>
              <div className="text-xl font-bold font-mono text-white">{dayExpenses.length} Total</div>
              <p className="text-[10px] text-emerald-400">{dayExpenses.filter(e => e.workflowStatus === 'approved').length} Approved &amp; Posted</p>
            </div>
          </div>

          {/* Expense Review Table */}
          <div className="glass-panel border border-[#1C1C1C] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1C1C1C] bg-[#0A0A0A]/50 font-bold text-xs text-white">
              Submitted Operating Expense Vouchers
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#9CA3AF] font-mono font-bold">
                    <th className="p-3">Ref</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Payee</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Taxable</th>
                    <th className="p-3 text-right">GST</th>
                    <th className="p-3 text-right">Total (₹)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {dayExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-amber-300 font-bold">{e.expenseRef}</td>
                      <td className="p-3 font-mono text-[#9CA3AF]">{e.expenseDate}</td>
                      <td className="p-3 font-bold text-white">{e.department}</td>
                      <td className="p-3 font-mono text-slate-300">{e.expenseCategory}</td>
                      <td className="p-3 text-slate-200">{e.payee}</td>
                      <td className="p-3 text-[#9CA3AF] max-w-[180px] truncate">{e.description}</td>
                      <td className="p-3 text-right font-mono text-white">₹{(e.amountBeforeTax || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono text-violet-400">₹{(e.gstAmount || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-white">₹{(e.totalAmount || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          e.workflowStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          e.workflowStatus === 'rejected' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {e.workflowStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {e.workflowStatus === 'submitted' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => {
                                if (confirm(`Approve expense ${e.expenseRef} and post ₹${e.totalAmount} to ledger?`)) {
                                  updateExpenseWorkflowStatus(e.id, 'approved');
                                }
                              }}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt(`Reason for rejecting ${e.expenseRef}:`);
                                if (reason) {
                                  updateExpenseWorkflowStatus(e.id, 'rejected', reason);
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-[#6B7280]">
                            {e.workflowStatus === 'approved' ? `Approved by ${e.reviewedBy || 'Admin'}` : `Rejected: ${e.rejectionReason || 'N/A'}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {dayExpenses.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-[#9CA3AF] text-xs font-mono">
                        No Sub-Admin expense vouchers in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsFinancePanel;
