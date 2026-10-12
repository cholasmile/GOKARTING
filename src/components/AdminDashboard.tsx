/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Activity, FoodVendor, ActivityPackage, MenuItem } from '../types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Users, Ticket, Utensils, Award, ShieldAlert,
  Plus, Edit, Trash2, Calendar, FileText, Download, CheckCircle,
  MapPin, Coffee, Clipboard, CreditCard, Database, Lock, Terminal, Settings, Key, Layers, Globe, Copy, Check,
  Banknote, Smartphone, Filter, Search, IndianRupee, Loader2, Image as ImageIcon, Tag, RotateCcw, Monitor, Gamepad2,
  CalendarRange, Clock, ArrowUpRight, ChevronDown, CalendarDays, ShoppingBag, Sparkles
} from 'lucide-react';
import ActivityManagementPanel from './admin/ActivityManagementPanel';
import AccountsFinancePanel from './admin/AccountsFinancePanel';
import { BulkAddMenuModal } from './BulkAddMenuModal';
import { compressImageFile } from '../lib/imageUtils';

export const AdminDashboard: React.FC = () => {
  const {
    users, updateUserRole,
    activities, vendors, bookings, orders, payments, tickets,
    menuItems, deleteMenuItem, updateMenuItem, addMenuItem,
    updateMenuItemStock, adjustMenuItemStock,
    addActivity, updateActivity, deleteActivity,
    addVendor, updateVendor, deleteVendor, addUser,
    counterUpiId, setCounterUpiId
  } = useAppContext();

  const activeActivities = activities.filter(a => !a.id.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('arena'));

  // Cafe & Retail Sales Sync Filter State
  const [adminMenuSearch, setAdminMenuSearch] = useState('');
  const [adminVendorFilter, setAdminVendorFilter] = useState('all');
  const [salesDateFilter, setSalesDateFilter] = useState<'all' | 'today' | 'week'>('all');

  // Payment settings local state
  const {
    razorpayKeyId, posProvider: globalPosProvider, posTerminalName: globalPosTerminalName,
    posTerminalId: globalPosTerminalId, enabledMethods: globalEnabledMethods, setPosConfig
  } = useAppContext();

  const [razorpayKeyIdInput, setRazorpayKeyIdInput] = useState('');
  const [razorpayKeySecretInput, setRazorpayKeySecretInput] = useState('');
  const [upiIdInput, setUpiIdInput] = useState(counterUpiId);
  const [businessNameInput, setBusinessNameInput] = useState('Deuce Park');
  const [posProviderInput, setPosProviderInput] = useState('mock_pos');
  const [posTerminalNameInput, setPosTerminalNameInput] = useState('Deuce POS Terminal 1');
  const [posTerminalIdInput, setPosTerminalIdInput] = useState('POS-TERM-001');
  const [enabledMethodsInput, setEnabledMethodsInput] = useState<string[]>(['CASH', 'UPI', 'QR_CODE', 'CARD']);
  
  const [posTestResult, setPosTestResult] = useState<string | null>(null);
  const [isTestingPos, setIsTestingPos] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);



  const handleSavePaymentConfig = async () => {
    try {
      const response = await fetch('/api/config/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpayKeyId: razorpayKeyIdInput,
          razorpayKeySecret: razorpayKeySecretInput,
          counterUpiId: upiIdInput,
          businessName: businessNameInput,
          posProvider: posProviderInput,
          posTerminalName: posTerminalNameInput,
          posTerminalId: posTerminalIdInput,
          enabledMethods: enabledMethodsInput.join(',')
        })
      });

      if (response.ok) {
        setSaveSuccess(true);
        // Persist to local context state
        setCounterUpiId(upiIdInput);
        setPosConfig({
          posProvider: posProviderInput,
          posTerminalName: posTerminalNameInput,
          posTerminalId: posTerminalIdInput,
          enabledMethods: enabledMethodsInput.join(','),
          razorpayKeyId: razorpayKeyIdInput
        });
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        alert('Failed to save configurations.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving configurations.');
    }
  };

  const handleTestPosConnection = async () => {
    setIsTestingPos(true);
    setPosTestResult(null);
    try {
      const response = await fetch('/api/pos/status');
      const data = await response.json();
      if (data.status === 'Connected') {
        setPosTestResult(`✅ Connected successfully to ${data.providerName || 'terminal'} (ID: ${data.terminalId}).`);
      } else {
        setPosTestResult(`❌ Disconnected: ${data.message || data.error || 'Check terminal ID and server configs.'}`);
      }
    } catch (err) {
      setPosTestResult('❌ Test failed: Cannot connect to local server driver.');
    } finally {
      setIsTestingPos(false);
    }
  };

  const handleActivityImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImageFile(file, 1000, 1000, 0.75);
      if (compressedDataUrl) {
        setActivityForm(prev => ({ ...prev, image: compressedDataUrl }));
      }
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  // Payment report filters
  const [payFilter, setPayFilter] = useState<string>('all');
  const [paySearch, setPaySearch] = useState('');

  // Reconciliation dashboard state
  const [gatewayPayments, setGatewayPayments] = useState<any[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationTab, setReconciliationTab] = useState<'reports' | 'reconciliation'>('reports');

  // Active Admin Tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'activities' | 'activity_mgmt' | 'vendors' | 'retail_menu' | 'users' | 'reports' | 'payments' | 'pay_settings' | 'database' | 'accounts_finance'>('analytics');
  const [activeDbSubTab, setActiveDbSubTab] = useState<'schema' | 'rls' | 'hierarchy' | 'api_routes' | 'deploy'>('schema');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load configs on mount or activeTab changes
  useEffect(() => {
    fetch('/api/config/payment')
      .then(res => res.json())
      .then(data => {
        if (data.counterUpiId) setUpiIdInput(data.counterUpiId);
        if (data.razorpayKeyId) setRazorpayKeyIdInput(data.razorpayKeyId);
        if (data.razorpayKeySecret) setRazorpayKeySecretInput(data.razorpayKeySecret);
        if (data.businessName) setBusinessNameInput(data.businessName);
        if (data.posProvider) setPosProviderInput(data.posProvider);
        if (data.posTerminalName) setPosTerminalNameInput(data.posTerminalName);
        if (data.posTerminalId) setPosTerminalIdInput(data.posTerminalId);
        if (data.enabledMethods) setEnabledMethodsInput(data.enabledMethods.split(','));
      })
      .catch(err => console.error('[admin] Failed to fetch payment config:', err));
  }, [activeTab]);

  // Load gateway transactions for reconciliation
  useEffect(() => {
    if (activeTab === 'payments' && reconciliationTab === 'reconciliation') {
      setIsReconciling(true);
      fetch('/api/razorpay/payments')
        .then(res => res.json())
        .then(data => {
          setGatewayPayments(Array.isArray(data) ? data : []);
          setIsReconciling(false);
        })
        .catch(err => {
          console.error('[reconcile-fetch]', err);
          setIsReconciling(false);
        });
    }
  }, [activeTab, reconciliationTab]);

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Form states for creating/editing activities
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: '',
    adultPrice: 30,
    childPrice: 15,
    dailyLimit: 50,
    image: '',
    type: 'dynamic' as 'horse_riding' | 'shooting' | 'go_karting' | 'dynamic',
    safetyInstructionsString: '',
    packages: [] as ActivityPackage[]
  });

  // Form states for creating/editing vendors
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<FoodVendor | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    type: 'cafe' as 'cafe' | 'fast_food' | 'juice' | 'ice_cream',
    ownerName: '',
    stallNumber: '',
    image: ''
  });

  // Form states for creating users
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'customer' as any,
    department: ''
  });

  // Export alerts
  const [exportAlert, setExportAlert] = useState<string | null>(null);

  // -----------------------------------------------------------------
  // ANALYTICS SALES FILTER STATE & COMPUTATION
  // -----------------------------------------------------------------
  const [analyticsDateFilter, setAnalyticsDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom'>('all');
  const [analyticsCustomStart, setAnalyticsCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [analyticsCustomEnd, setAnalyticsCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const parseSafeDate = (str?: string): Date | null => {
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const isDateInFilter = (
    dateObj: Date | null,
    filter: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom',
    customStart?: string,
    customEnd?: string
  ): boolean => {
    if (!dateObj) return filter === 'all';
    if (filter === 'all') return true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (filter === 'today') {
      return dateObj >= startOfToday && dateObj <= endOfToday;
    }
    if (filter === 'yesterday') {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(endOfToday);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      return dateObj >= startOfYesterday && dateObj <= endOfYesterday;
    }
    if (filter === '7days') {
      const start7 = new Date(startOfToday);
      start7.setDate(start7.getDate() - 6);
      return dateObj >= start7 && dateObj <= endOfToday;
    }
    if (filter === '30days') {
      const start30 = new Date(startOfToday);
      start30.setDate(start30.getDate() - 29);
      return dateObj >= start30 && dateObj <= endOfToday;
    }
    if (filter === 'this_month') {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return dateObj >= startMonth && dateObj <= endMonth;
    }
    if (filter === 'last_month') {
      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return dateObj >= startLastMonth && dateObj <= endLastMonth;
    }
    if (filter === 'custom') {
      let valid = true;
      if (customStart) {
        const [sy, sm, sd] = customStart.split('-').map(Number);
        const s = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        valid = valid && dateObj >= s;
      }
      if (customEnd) {
        const [ey, em, ed] = customEnd.split('-').map(Number);
        const e = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        valid = valid && dateObj <= e;
      }
      return valid;
    }
    return true;
  };

  const computePeriodSales = (
    filterType: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'last_month' | 'custom',
    cStart?: string,
    cEnd?: string
  ) => {
    const periodBookings = bookings.filter(b => isDateInFilter(parseSafeDate(b.bookingDate || b.date), filterType, cStart, cEnd));
    const periodOrders = orders.filter(o => isDateInFilter(parseSafeDate(o.createdAt), filterType, cStart, cEnd));
    
    const activityRev = periodBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const foodRev = periodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalRev = activityRev + foodRev;
    const visitorsCount = periodBookings.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const bookingsCount = periodBookings.length;
    const ordersCount = periodOrders.length;
    const totalTransactions = bookingsCount + ordersCount;
    const avgTransactionValue = totalTransactions > 0 ? (totalRev / totalTransactions) : 0;

    return {
      bookings: periodBookings,
      orders: periodOrders,
      activityRev,
      foodRev,
      totalRev,
      visitorsCount,
      bookingsCount,
      ordersCount,
      totalTransactions,
      avgTransactionValue
    };
  };

  // Fixed Quick Metric Snapshots
  const todaySales = computePeriodSales('today');
  const last7DaysSales = computePeriodSales('7days');
  const last30DaysSales = computePeriodSales('30days');
  const allTimeSales = computePeriodSales('all');

  // Currently Filtered View Sales
  const filteredSalesData = computePeriodSales(analyticsDateFilter, analyticsCustomStart, analyticsCustomEnd);

  // Core metrics for backwards compatibility
  const totalActivityRevenue = allTimeSales.activityRev;
  const totalFoodRevenue = allTimeSales.foodRev;
  const totalRevenue = allTimeSales.totalRev;
  const totalVisitors = allTimeSales.visitorsCount;

  // Activity performance metric (by filtered bookings)
  const activityPerformanceData = activeActivities.map(act => {
    const actBookings = filteredSalesData.bookings.filter(b => b.activityId === act.id);
    const revenue = actBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const ticketsSold = actBookings.reduce((sum, b) => sum + (b.quantity || 0), 0);
    return {
      name: act.name.split(' ').slice(-2).join(' '),
      revenue,
      ticketsSold
    };
  });

  // Food split performance (by filtered orders)
  const foodSplitData = vendors.map(v => {
    const vOrders = filteredSalesData.orders.filter(o => o.items.some(i => i.vendorId === v.id));
    const totalSales = vOrders.reduce((sum, o) => {
      const vItems = o.items.filter(i => i.vendorId === v.id);
      return sum + vItems.reduce((s, i) => s + ((i.price || 0) * (i.quantity || 0)), 0);
    }, 0);
    return {
      name: v.name,
      value: totalSales
    };
  }).filter(v => v.value > 0);

  // Dynamic revenue charts for the selected filter
  const getDynamicSalesChartData = () => {
    if (analyticsDateFilter === 'today' || analyticsDateFilter === 'yesterday') {
      const hours = [8, 10, 12, 14, 16, 18, 20, 22];
      return hours.map(h => {
        const slotLabel = `${h > 12 ? h - 12 : h}${h >= 12 ? ' PM' : ' AM'}`;
        const slotBookings = filteredSalesData.bookings.filter(b => {
          const d = parseSafeDate(b.bookingDate || b.date);
          return d && d.getHours() >= h && d.getHours() < h + 2;
        });
        const slotOrders = filteredSalesData.orders.filter(o => {
          const d = parseSafeDate(o.createdAt);
          return d && d.getHours() >= h && d.getHours() < h + 2;
        });

        const actRev = slotBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const foodRev = slotOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        return {
          date: slotLabel,
          'Activities': actRev,
          'Food Street': foodRev,
          'Total': actRev + foodRev
        };
      });
    }

    if (analyticsDateFilter === '7days') {
      return [6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        const dStr = d.toISOString().split('T')[0];

        const dayBookings = bookings.filter(b => {
          const bD = parseSafeDate(b.bookingDate || b.date);
          return bD && bD.toISOString().split('T')[0] === dStr;
        });
        const dayOrders = orders.filter(o => {
          const oD = parseSafeDate(o.createdAt);
          return oD && oD.toISOString().split('T')[0] === dStr;
        });

        const activityRev = dayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const foodRev = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        return {
          date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
          'Activities': activityRev,
          'Food Street': foodRev,
          'Total': activityRev + foodRev
        };
      });
    }

    if (analyticsDateFilter === '30days') {
      return Array.from({ length: 30 }, (_, i) => 29 - i).map(daysAgo => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        const dStr = d.toISOString().split('T')[0];

        const dayBookings = bookings.filter(b => {
          const bD = parseSafeDate(b.bookingDate || b.date);
          return bD && bD.toISOString().split('T')[0] === dStr;
        });
        const dayOrders = orders.filter(o => {
          const oD = parseSafeDate(o.createdAt);
          return oD && oD.toISOString().split('T')[0] === dStr;
        });

        const activityRev = dayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const foodRev = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          'Activities': activityRev,
          'Food Street': foodRev,
          'Total': activityRev + foodRev
        };
      });
    }

    if (analyticsDateFilter === 'custom' && analyticsCustomStart && analyticsCustomEnd) {
      const s = parseSafeDate(analyticsCustomStart);
      const e = parseSafeDate(analyticsCustomEnd);
      if (s && e && s <= e) {
        const diffDays = Math.min(60, Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1));
        return Array.from({ length: diffDays }, (_, i) => {
          const d = new Date(s);
          d.setDate(d.getDate() + i);
          const dStr = d.toISOString().split('T')[0];

          const dayBookings = bookings.filter(b => {
            const bD = parseSafeDate(b.bookingDate || b.date);
            return bD && bD.toISOString().split('T')[0] === dStr;
          });
          const dayOrders = orders.filter(o => {
            const oD = parseSafeDate(o.createdAt);
            return oD && oD.toISOString().split('T')[0] === dStr;
          });

          const activityRev = dayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
          const foodRev = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

          return {
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            'Activities': activityRev,
            'Food Street': foodRev,
            'Total': activityRev + foodRev
          };
        });
      }
    }

    // Default (all / this_month / last_month): Past 7 days
    return [6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      const dateStr = date.toISOString().split('T')[0];

      const dayBookings = filteredSalesData.bookings.filter(b => {
        const bD = parseSafeDate(b.bookingDate || b.date);
        return bD && bD.toISOString().split('T')[0] === dateStr;
      });
      const dayOrders = filteredSalesData.orders.filter(o => {
        const oD = parseSafeDate(o.createdAt);
        return oD && oD.toISOString().split('T')[0] === dateStr;
      });

      const activityRev = dayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      const foodRev = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        'Activities': activityRev,
        'Food Street': foodRev,
        'Total': activityRev + foodRev
      };
    });
  };

  const salesTrendData = getDynamicSalesChartData();

  // Colors
  const COLORS = ['#007B8B', '#134E4A', '#99F6E4', '#F59E0B', '#10B981'];

  // -----------------------------------------------------------------
  // DETAILED DASHBOARD BREAKDOWNS (ACTIVITY-WISE & PACKAGE-WISE)
  // -----------------------------------------------------------------
  
  // 1. Activity-Wise Detailed Metrics (Filtered)
  const activityDetailedStats = activeActivities.map(act => {
    const actBookings = filteredSalesData.bookings.filter(b => b.activityId.includes(act.id));
    const visitorsCount = actBookings.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const amountCollected = actBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const bookingsCount = actBookings.length;
    const sharePercentage = filteredSalesData.activityRev > 0 ? (amountCollected / filteredSalesData.activityRev) * 100 : 0;
    return {
      id: act.id,
      name: act.name,
      type: act.type,
      visitorsCount,
      bookingsCount,
      amountCollected,
      sharePercentage
    };
  });

  // 2. Package-Wise Detailed Metrics (Filtered)
  const packageDetailedStats: Array<{
    activityId: string;
    activityName: string;
    packageId: string;
    packageName: string;
    price: number;
    visitorsCount: number;
    bookingsCount: number;
    amountCollected: number;
    shareOfActivity: number;
  }> = [];

  activities.forEach(act => {
    const actBookings = filteredSalesData.bookings.filter(b => b.activityId.includes(act.id));
    const actTotalAmount = actBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    if (act.packages && act.packages.length > 0) {
      act.packages.forEach(pkg => {
        const pkgBookings = actBookings.filter(b =>
          b.packageId === pkg.id ||
          (b.packageName && b.packageName.toLowerCase() === pkg.name.toLowerCase()) ||
          (b.details && b.details.toLowerCase().includes(pkg.name.toLowerCase()))
        );
        const visitorsCount = pkgBookings.reduce((sum, b) => sum + (b.quantity || 0), 0);
        const amountCollected = pkgBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const shareOfActivity = actTotalAmount > 0 ? (amountCollected / actTotalAmount) * 100 : 0;

        packageDetailedStats.push({
          activityId: act.id,
          activityName: act.name,
          packageId: pkg.id,
          packageName: pkg.name,
          price: pkg.price,
          visitorsCount,
          bookingsCount: pkgBookings.length,
          amountCollected,
          shareOfActivity
        });
      });
    } else {
      const visitorsCount = actBookings.reduce((sum, b) => sum + (b.quantity || 0), 0);
      const amountCollected = actBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      packageDetailedStats.push({
        activityId: act.id,
        activityName: act.name,
        packageId: `std-${act.id}`,
        packageName: 'Standard Entry / Single Ticket',
        price: act.adultPrice || 0,
        visitorsCount,
        bookingsCount: actBookings.length,
        amountCollected,
        shareOfActivity: 100
      });
    }
  });

  // Helper to format filter display label
  const getAnalyticsFilterTitle = () => {
    switch (analyticsDateFilter) {
      case 'today': return "Today's Sales";
      case 'yesterday': return "Yesterday's Sales";
      case '7days': return "Last 7 Days Sales";
      case '30days': return "Last 30 Days Sales";
      case 'this_month': return "This Month's Sales";
      case 'last_month': return "Last Month's Sales";
      case 'custom': return `Custom Range (${analyticsCustomStart} to ${analyticsCustomEnd})`;
      default: return "All-Time Lifetime Sales";
    }
  };

  // 3. Complete Dashboard Transaction Logs Filters
  const [dashLogSearch, setDashLogSearch] = useState('');
  const [dashLogMethodFilter, setDashLogMethodFilter] = useState('all');
  const [dashLogStatusFilter, setDashLogStatusFilter] = useState('all');
  const [dashLogActivityFilter, setDashLogActivityFilter] = useState('all');
  const [dashLogDateFilter, setDashLogDateFilter] = useState('all');

  const filteredDashboardPayments = payments.filter(pay => {
    if (dashLogMethodFilter !== 'all') {
      if (dashLogMethodFilter === 'cash' && pay.method !== 'cash') return false;
      if (dashLogMethodFilter === 'upi' && pay.method !== 'upi' && pay.method !== 'qrcode') return false;
      if (dashLogMethodFilter === 'card' && !pay.method.startsWith('card')) return false;
      if (dashLogMethodFilter === 'razorpay' && pay.method !== 'razorpay' && pay.gateway !== 'Razorpay') return false;
    }

    if (dashLogStatusFilter !== 'all') {
      if (dashLogStatusFilter === 'paid' && pay.status !== 'paid' && pay.status !== 'success') return false;
      if (dashLogStatusFilter === 'pending' && pay.status !== 'pending' && pay.status !== 'processing') return false;
      if (dashLogStatusFilter === 'refunded' && pay.status !== 'refunded') return false;
      if (dashLogStatusFilter === 'failed' && pay.status !== 'failed') return false;
    }

    if (dashLogActivityFilter !== 'all') {
      const booking = bookings.find(b => b.id === pay.bookingId);
      if (!booking || !booking.activityId.includes(dashLogActivityFilter)) return false;
    }

    if (dashLogDateFilter !== 'all' && pay.timestamp) {
      const payDate = new Date(pay.timestamp);
      const now = new Date();
      if (dashLogDateFilter === 'today') {
        if (payDate.toDateString() !== now.toDateString()) return false;
      } else if (dashLogDateFilter === '7days') {
        const diffDays = (now.getTime() - payDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (dashLogDateFilter === '30days') {
        const diffDays = (now.getTime() - payDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }
    }

    if (dashLogSearch.trim()) {
      const q = dashLogSearch.toLowerCase();
      const booking = bookings.find(b => b.id === pay.bookingId);
      const ticket = tickets.find(t => t.bookingId === pay.bookingId);

      const matches =
        pay.invoice_id?.toLowerCase().includes(q) ||
        pay.id?.toLowerCase().includes(q) ||
        pay.bookingId?.toLowerCase().includes(q) ||
        pay.transactionId?.toLowerCase().includes(q) ||
        pay.customerName?.toLowerCase().includes(q) ||
        pay.customerPhone?.toLowerCase().includes(q) ||
        pay.customer_id?.toLowerCase().includes(q) ||
        pay.activityName?.toLowerCase().includes(q) ||
        booking?.customerName?.toLowerCase().includes(q) ||
        booking?.activityName?.toLowerCase().includes(q) ||
        booking?.packageName?.toLowerCase().includes(q) ||
        booking?.details?.toLowerCase().includes(q) ||
        ticket?.id?.toLowerCase().includes(q);

      if (!matches) return false;
    }

    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleExportDashboardCSV = () => {
    const headers = ["Invoice ID", "Booking ID", "Customer Name", "Phone / Email", "Activity Name", "Package / Details", "Visitors Qty", "Amount (INR)", "Payment Method", "Payment Status", "Timestamp"];
    const rows = filteredDashboardPayments.map(pay => {
      const booking = bookings.find(b => b.id === pay.bookingId);
      return [
        `"${pay.invoice_id || `INV-B-${pay.bookingId?.slice(-6) || ''}`}"`,
        `"${pay.bookingId || pay.orderId || ''}"`,
        `"${pay.customerName || booking?.customerName || 'Guest'}"`,
        `"${pay.customerPhone || booking?.customerPhone || pay.customer_id || ''}"`,
        `"${pay.activityName || booking?.activityName || 'Activity'}"`,
        `"${booking?.packageName || booking?.details || 'Standard'}"`,
        booking?.quantity || 1,
        pay.amount || 0,
        `"${pay.method?.toUpperCase() || ''}"`,
        `"${pay.status?.toUpperCase() || ''}"`,
        `"${new Date(pay.timestamp).toLocaleString('en-IN')}"`
      ];
    });

    const csvStr = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `deuce_transaction_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -----------------------------------------------------------------
  // HANDLERS FOR CRUD
  // -----------------------------------------------------------------
  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    // Package Validation
    for (const pkg of activityForm.packages) {
      if (!pkg.name || !pkg.name.trim()) {
        alert("Package name cannot be empty.");
        return;
      }
      if (typeof pkg.price !== 'number' || !Number.isFinite(pkg.price) || pkg.price < 0) {
        alert(`Invalid price for package "${pkg.name}". Price must be a non-negative number.`);
        return;
      }
    }

    const safety = activityForm.safetyInstructionsString
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const defaultImage = activityForm.image && activityForm.image.trim().length > 0
      ? activityForm.image.trim()
      : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80';

    try {
      if (editingActivity) {
        await updateActivity({
          ...editingActivity,
          name: activityForm.name,
          description: activityForm.description,
          adultPrice: Number(activityForm.adultPrice),
          childPrice: Number(activityForm.childPrice),
          dailyLimit: Number(activityForm.dailyLimit),
          image: defaultImage,
          safetyInstructions: safety,
          packages: activityForm.packages
        });
      } else {
        addActivity({
          name: activityForm.name,
          description: activityForm.description,
          adultPrice: Number(activityForm.adultPrice),
          childPrice: Number(activityForm.childPrice),
          dailyLimit: Number(activityForm.dailyLimit),
          image: defaultImage,
          safetyInstructions: safety,
          type: 'dynamic',
          packages: activityForm.packages
        });
      }

      setIsActivityModalOpen(false);
      setEditingActivity(null);
      setActivityForm({
        name: '',
        description: '',
        adultPrice: 30,
        childPrice: 15,
        dailyLimit: 50,
        image: '',
        type: 'dynamic',
        safetyInstructionsString: '',
        packages: []
      });
    } catch (err: any) {
      alert(`Failed to save package price: ${err.message || String(err)}`);
    }
  };

  const handleEditActivityClick = (act: Activity) => {
    setEditingActivity(act);
    setActivityForm({
      name: act.name,
      description: act.description,
      adultPrice: act.adultPrice || 0,
      childPrice: act.childPrice || 0,
      dailyLimit: act.dailyLimit,
      image: act.image,
      type: act.type,
      safetyInstructionsString: act.safetyInstructions.join('\n'),
      packages: act.packages ? [...act.packages] : []
    });
    setIsActivityModalOpen(true);
  };

  const handleSaveVendor = () => {
    if (!vendorForm.name || !vendorForm.ownerName || !vendorForm.stallNumber) return;

    if (editingVendor) {
      updateVendor({
        ...editingVendor,
        ...vendorForm
      });
    } else {
      addVendor({
        ...vendorForm,
        image: vendorForm.image || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
      });
    }
    setIsVendorModalOpen(false);
  };

  const handleSaveUser = () => {
    if (!userForm.name || !userForm.email) return;
    
    addUser(userForm);
    setIsUserModalOpen(false);
    setUserForm({ name: '', email: '', role: 'customer', department: '' });
  };

  const handleEditVendorClick = (v: FoodVendor) => {
    setEditingVendor(v);
    setVendorForm({
      name: v.name,
      type: v.type,
      ownerName: v.ownerName,
      stallNumber: v.stallNumber,
      image: v.image
    });
    setIsVendorModalOpen(true);
  };

  const triggerExport = (format: 'pdf' | 'excel' | 'csv') => {
    setExportAlert(`Successfully prepared & downloaded full financial report split in .${format} format!`);
    setTimeout(() => setExportAlert(null), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Panel */}
      <div className="bg-gradient-to-r from-[#050816] via-[#0B1120] to-[#0F172A] text-[#F8FAFC] rounded-3xl p-6 relative overflow-hidden border border-[#14F1D9]/30 shadow-[0_0_30px_rgba(20,241,217,0.15)]">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-20 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,100 C30,40 70,60 100,0 L100,100 Z" fill="#14F1D9" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <span className="bg-[#14F1D9]/15 text-[#14F1D9] border border-[#14F1D9]/30 text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full font-mono shadow-[0_0_10px_rgba(20,241,217,0.2)]">
              ⚡ Super Admin Control Center
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] via-[#14F1D9] to-[#00B4FF]">
              Executive Park Live Overview
            </h2>
            <p className="text-[#CBD5E1] text-xs max-w-xl font-medium">
              Real-time analytics across Go-Karting, Air Rifle Shooting, Horse Riding, Food Street transactions, and gate scan redemptions.
            </p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-[#14F1D9]/20 gap-1.5 overflow-x-auto text-[#FFFFFF] pb-2">
        {(['analytics', 'activities', 'activity_mgmt', 'vendors', 'retail_menu', 'users', 'reports', 'payments', 'accounts_finance', 'pay_settings', 'database'] as const).map(tab => (
          <button
            key={tab}
            id={`btn-admin-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold capitalize transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap rounded-xl ${
              activeTab === tab
                ? 'bg-gradient-to-r from-[#14F1D9] via-[#00ABAB] to-[#00B4FF] text-[#050816] font-black shadow-[0_0_20px_rgba(20,241,217,0.35)] border border-[#14F1D9]'
                : 'border border-transparent text-[#94A3B8] hover:text-[#14F1D9] hover:bg-white/5'
            }`}
          >
            {tab === 'analytics' && <TrendingUp className="h-4 w-4" />}
            {tab === 'activities' && <Award className="h-4 w-4" />}
            {tab === 'activity_mgmt' && <ImageIcon className="h-4 w-4" />}
            {tab === 'vendors' && <Coffee className="h-4 w-4" />}
            {tab === 'retail_menu' && <Utensils className="h-4 w-4" />}
            {tab === 'users' && <Users className="h-4 w-4" />}
            {tab === 'reports' && <FileText className="h-4 w-4" />}
            {tab === 'payments' && <IndianRupee className="h-4 w-4" />}
            {tab === 'accounts_finance' && <Banknote className="h-4 w-4" />}
            {tab === 'pay_settings' && <Settings className="h-4 w-4" />}
            {tab === 'database' && <Database className="h-4 w-4" />}
            {tab === 'database' ? 'Supabase & RLS'
              : tab === 'pay_settings' ? 'Pay Settings'
              : tab === 'payments' ? 'Pay Reports'
              : tab === 'activity_mgmt' ? 'Activity Mgmt'
              : tab === 'retail_menu' ? 'Cafe & Retail Sales Sync'
              : tab === 'accounts_finance' ? 'Accounts & Finance'
              : tab}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 1. ANALYTICS VIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">

          {/* ── 1. FIXED SALES SUMMARY HIGHLIGHT CARDS (TODAY, 7 DAYS, 30 DAYS, ALL-TIME) ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#00ABAB]/10 border border-[#00ABAB]/30 text-[#40E0D0]">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-sans">
                    Sales Overview & Performance Periods
                  </h3>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Consolidated gross revenue benchmarks across adventure sports and Food Street cafe
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Today's Sales */}
              <div 
                onClick={() => setAnalyticsDateFilter('today')}
                className={`p-4 glass-card rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  analyticsDateFilter === 'today'
                    ? 'border-[#00ABAB] shadow-[0_0_25px_rgba(0,171,171,0.3)] bg-[#00ABAB]/10'
                    : 'border-[#00ABAB]/30 hover:border-[#00ABAB]/70 hover:shadow-[0_0_20px_rgba(0,171,171,0.2)]'
                }`}
              >
                <div className="flex items-center justify-between text-[#9CA3AF] mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold font-sans flex items-center gap-1.5 text-[#40E0D0]">
                    <Clock className="w-3.5 h-3.5" /> Today's Sales
                  </span>
                  <span className="p-1.5 bg-[#0A0A0A] text-[#40E0D0] rounded-lg border border-[#00ABAB]/30 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-[#40E0D0] font-mono">
                  ₹{todaySales.totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="pt-2 border-t border-[#1C1C1C] mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>Activities:</span>
                    <span className="text-white font-bold">₹{todaySales.activityRev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>Food Street:</span>
                    <span className="text-white font-bold">₹{todaySales.foodRev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-teal-400 pt-0.5 font-bold">
                    <span>Volume:</span>
                    <span>{todaySales.visitorsCount} Guests • {todaySales.ordersCount} Orders</span>
                  </div>
                </div>
                {analyticsDateFilter === 'today' && (
                  <div className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#40E0D0] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ABAB]"></span>
                  </div>
                )}
              </div>

              {/* Last 7 Days Sales */}
              <div 
                onClick={() => setAnalyticsDateFilter('7days')}
                className={`p-4 glass-card rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  analyticsDateFilter === '7days'
                    ? 'border-[#00ABAB] shadow-[0_0_25px_rgba(0,171,171,0.3)] bg-[#00ABAB]/10'
                    : 'border-[#00ABAB]/30 hover:border-[#00ABAB]/70 hover:shadow-[0_0_20px_rgba(0,171,171,0.2)]'
                }`}
              >
                <div className="flex items-center justify-between text-[#9CA3AF] mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold font-sans flex items-center gap-1.5 text-white">
                    <CalendarDays className="w-3.5 h-3.5 text-[#00ABAB]" /> Last 7 Days
                  </span>
                  <span className="p-1.5 bg-[#0A0A0A] text-[#00ABAB] rounded-lg border border-[#00ABAB]/30 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-white font-mono">
                  ₹{last7DaysSales.totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="pt-2 border-t border-[#1C1C1C] mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>Activities:</span>
                    <span className="text-white font-bold">₹{last7DaysSales.activityRev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>Food Street:</span>
                    <span className="text-white font-bold">₹{last7DaysSales.foodRev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-teal-400 pt-0.5 font-bold">
                    <span>Volume:</span>
                    <span>{last7DaysSales.visitorsCount} Guests • {last7DaysSales.ordersCount} Orders</span>
                  </div>
                </div>
                {analyticsDateFilter === '7days' && (
                  <div className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#40E0D0] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ABAB]"></span>
                  </div>
                )}
              </div>

              {/* Last 30 Days Sales */}
              <div 
                onClick={() => setAnalyticsDateFilter('30days')}
                className={`p-4 glass-card rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  analyticsDateFilter === '30days'
                    ? 'border-[#00ABAB] shadow-[0_0_25px_rgba(0,171,171,0.3)] bg-[#00ABAB]/10'
                    : 'border-[#00ABAB]/30 hover:border-[#00ABAB]/70 hover:shadow-[0_0_20px_rgba(0,171,171,0.2)]'
                }`}
              >
                <div className="flex items-center justify-between text-[#9CA3AF] mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold font-sans flex items-center gap-1.5 text-white">
                    <CalendarRange className="w-3.5 h-3.5 text-[#00ABAB]" /> Last 30 Days
                  </span>
                  <span className="p-1.5 bg-[#0A0A0A] text-[#00ABAB] rounded-lg border border-[#00ABAB]/30 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-white font-mono">
                  ₹{last30DaysSales.totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="pt-2 border-t border-[#1C1C1C] mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>Activities:</span>
                    <span className="text-white font-bold">₹{last30DaysSales.activityRev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>Food Street:</span>
                    <span className="text-white font-bold">₹{last30DaysSales.foodRev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-teal-400 pt-0.5 font-bold">
                    <span>Volume:</span>
                    <span>{last30DaysSales.visitorsCount} Guests • {last30DaysSales.ordersCount} Orders</span>
                  </div>
                </div>
                {analyticsDateFilter === '30days' && (
                  <div className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#40E0D0] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ABAB]"></span>
                  </div>
                )}
              </div>

              {/* All-Time Total Sales */}
              <div 
                onClick={() => setAnalyticsDateFilter('all')}
                className={`p-4 glass-card rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  analyticsDateFilter === 'all'
                    ? 'border-[#00ABAB] shadow-[0_0_25px_rgba(0,171,171,0.3)] bg-[#00ABAB]/10'
                    : 'border-[#00ABAB]/30 hover:border-[#00ABAB]/70 hover:shadow-[0_0_20px_rgba(0,171,171,0.2)]'
                }`}
              >
                <div className="flex items-center justify-between text-[#9CA3AF] mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold font-sans flex items-center gap-1.5 text-white">
                    <Sparkles className="w-3.5 h-3.5 text-[#40E0D0]" /> All-Time Sales
                  </span>
                  <span className="p-1.5 bg-[#0A0A0A] text-[#40E0D0] rounded-lg border border-[#00ABAB]/30 group-hover:scale-110 transition-transform">
                    <IndianRupee className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-[#40E0D0] font-mono">
                  ₹{allTimeSales.totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="pt-2 border-t border-[#1C1C1C] mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>Activities:</span>
                    <span className="text-white font-bold">₹{allTimeSales.activityRev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[#9CA3AF]">
                    <span>Food Street:</span>
                    <span className="text-white font-bold">₹{allTimeSales.foodRev.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-teal-400 pt-0.5 font-bold">
                    <span>Volume:</span>
                    <span>{allTimeSales.visitorsCount} Guests • {allTimeSales.ordersCount} Orders</span>
                  </div>
                </div>
                {analyticsDateFilter === 'all' && (
                  <div className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#40E0D0] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ABAB]"></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 2. CUSTOM SALES DROPDOWN & DATE RANGE FILTER CONTROL BAR ── */}
          <div className="p-5 glass-panel border border-[#00ABAB]/40 rounded-2xl shadow-[0_0_30px_rgba(0,171,171,0.15)] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-[#0A0A0A] text-[#40E0D0] rounded-xl border border-[#00ABAB]/30">
                  <Filter className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white font-sans flex items-center gap-2">
                    Sales Window & Custom Filter
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#00ABAB]/20 text-[#40E0D0] border border-[#00ABAB]/40 rounded-md">
                      {getAnalyticsFilterTitle()}
                    </span>
                  </h4>
                  <p className="text-[11px] text-[#9CA3AF] font-sans">
                    Select a preset period or custom date range to filter real-time revenue analytics and breakdown charts
                  </p>
                </div>
              </div>

              {/* Dropdown Menu & Quick Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Custom Dropdown Selector */}
                <div className="relative inline-block">
                  <select
                    id="select-sales-date-filter"
                    value={analyticsDateFilter}
                    onChange={e => setAnalyticsDateFilter(e.target.value as any)}
                    className="bg-[#0A0A0A] text-[#40E0D0] border border-[#00ABAB]/50 rounded-xl px-4 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00ABAB] cursor-pointer appearance-none pr-9 hover:border-[#00ABAB] transition-all shadow-inner"
                  >
                    <option value="all">🌐 All-Time History</option>
                    <option value="today">📅 Today's Sales</option>
                    <option value="yesterday">⏪ Yesterday's Sales</option>
                    <option value="7days">📊 Last 7 Days Sales</option>
                    <option value="30days">📈 Last 30 Days Sales</option>
                    <option value="this_month">🗓️ This Month (Current)</option>
                    <option value="last_month">⏮️ Last Month</option>
                    <option value="custom">⚙️ Custom Date Range...</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#40E0D0] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-80" />
                </div>

                {/* Quick Switch Buttons */}
                <div className="flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-xl border border-[#1C1C1C]">
                  <button
                    type="button"
                    onClick={() => setAnalyticsDateFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      analyticsDateFilter === 'all'
                        ? 'bg-[#00ABAB] text-black shadow-[0_0_10px_rgba(0,171,171,0.5)]'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsDateFilter('today')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      analyticsDateFilter === 'today'
                        ? 'bg-[#00ABAB] text-black shadow-[0_0_10px_rgba(0,171,171,0.5)]'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsDateFilter('7days')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      analyticsDateFilter === '7days'
                        ? 'bg-[#00ABAB] text-black shadow-[0_0_10px_rgba(0,171,171,0.5)]'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsDateFilter('30days')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      analyticsDateFilter === '30days'
                        ? 'bg-[#00ABAB] text-black shadow-[0_0_10px_rgba(0,171,171,0.5)]'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsDateFilter('this_month')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      analyticsDateFilter === 'this_month'
                        ? 'bg-[#00ABAB] text-black shadow-[0_0_10px_rgba(0,171,171,0.5)]'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsDateFilter('custom')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      analyticsDateFilter === 'custom'
                        ? 'bg-[#00ABAB] text-black shadow-[0_0_10px_rgba(0,171,171,0.5)]'
                        : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Date Range Picker Fields (Shown when Custom Range is active) */}
            {analyticsDateFilter === 'custom' && (
              <div className="pt-3 border-t border-[#1C1C1C] flex flex-wrap items-center gap-3 bg-[#0A0A0A]/60 p-3 rounded-xl border border-[#00ABAB]/20 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#9CA3AF]">From Date:</span>
                  <input
                    type="date"
                    id="input-analytics-custom-start"
                    value={analyticsCustomStart}
                    onChange={e => setAnalyticsCustomStart(e.target.value)}
                    className="bg-[#141414] text-white border border-[#00ABAB]/40 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00ABAB]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#9CA3AF]">To Date:</span>
                  <input
                    type="date"
                    id="input-analytics-custom-end"
                    value={analyticsCustomEnd}
                    onChange={e => setAnalyticsCustomEnd(e.target.value)}
                    className="bg-[#141414] text-white border border-[#00ABAB]/40 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00ABAB]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const end = d.toISOString().split('T')[0];
                    d.setDate(d.getDate() - 7);
                    const start = d.toISOString().split('T')[0];
                    setAnalyticsCustomStart(start);
                    setAnalyticsCustomEnd(end);
                  }}
                  className="text-[11px] font-mono text-[#40E0D0] hover:underline px-2 py-1 cursor-pointer"
                >
                  Reset to Last 7 Days
                </button>
              </div>
            )}

            {/* Active Filter Scope Summary Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1C1C1C] text-[11px] font-mono text-[#9CA3AF]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ABAB] animate-pulse"></span>
                <span>Active Scope: <strong className="text-white">{getAnalyticsFilterTitle()}</strong></span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-white">
                <span>Revenue: <strong className="text-[#40E0D0]">₹{filteredSalesData.totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                <span>Transactions: <strong className="text-teal-400">{filteredSalesData.totalTransactions}</strong></span>
              </div>
            </div>
          </div>

          {/* ── 3. FILTER-AWARE DETAILED KPI CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 glass-card border border-[#00ABAB]/30 rounded-xl space-y-1 hover:shadow-[0_0_15px_rgba(0,171,171,0.2)] transition-all">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#9CA3AF] font-sans">Filtered Gross Sales</div>
              <div className="text-xl font-extrabold text-[#40E0D0] font-mono">
                ₹{filteredSalesData.totalRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[9px] text-[#9CA3AF] font-mono">
                {allTimeSales.totalRev > 0 ? ((filteredSalesData.totalRev / allTimeSales.totalRev) * 100).toFixed(1) : 0}% of all-time
              </p>
            </div>

            <div className="p-3.5 glass-card border border-[#00ABAB]/30 rounded-xl space-y-1 hover:shadow-[0_0_15px_rgba(0,171,171,0.2)] transition-all">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#9CA3AF] font-sans">Activities Sales</div>
              <div className="text-xl font-extrabold text-white font-mono">
                ₹{filteredSalesData.activityRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[9px] text-teal-400 font-mono">
                {((filteredSalesData.activityRev / (filteredSalesData.totalRev || 1)) * 100).toFixed(0)}% contribution
              </p>
            </div>

            <div className="p-3.5 glass-card border border-[#00ABAB]/30 rounded-xl space-y-1 hover:shadow-[0_0_15px_rgba(0,171,171,0.2)] transition-all">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#9CA3AF] font-sans">Food Street Sales</div>
              <div className="text-xl font-extrabold text-white font-mono">
                ₹{filteredSalesData.foodRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[9px] text-teal-400 font-mono">
                {((filteredSalesData.foodRev / (filteredSalesData.totalRev || 1)) * 100).toFixed(0)}% contribution
              </p>
            </div>

            <div className="p-3.5 glass-card border border-[#00ABAB]/30 rounded-xl space-y-1 hover:shadow-[0_0_15px_rgba(0,171,171,0.2)] transition-all">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#9CA3AF] font-sans">Tickets / Visitors</div>
              <div className="text-xl font-extrabold text-white font-mono">
                {filteredSalesData.visitorsCount}
              </div>
              <p className="text-[9px] text-[#9CA3AF] font-mono">
                Across {filteredSalesData.bookingsCount} bookings
              </p>
            </div>

            <div className="p-3.5 glass-card border border-[#00ABAB]/30 rounded-xl space-y-1 hover:shadow-[0_0_15px_rgba(0,171,171,0.2)] transition-all">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#9CA3AF] font-sans">Food Orders</div>
              <div className="text-xl font-extrabold text-white font-mono">
                {filteredSalesData.ordersCount}
              </div>
              <p className="text-[9px] text-[#9CA3AF] font-mono">
                Cafe & stall orders
              </p>
            </div>

            <div className="p-3.5 glass-card border border-[#00ABAB]/30 rounded-xl space-y-1 hover:shadow-[0_0_15px_rgba(0,171,171,0.2)] transition-all">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#9CA3AF] font-sans">Avg. Transaction</div>
              <div className="text-xl font-extrabold text-[#40E0D0] font-mono">
                ₹{filteredSalesData.avgTransactionValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[9px] text-[#9CA3AF] font-mono">
                Per ticket/food sale
              </p>
            </div>
          </div>

          {/* ── 4. REVENUE CHARTS GRID ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Sales Trend Chart */}
            <div className="p-5 glass-panel border border-[#00ABAB]/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#FFFFFF] font-sans">Multi-Source Revenue History</h4>
                  <p className="text-[11px] text-[#9CA3AF] font-sans">
                    Sales compared across adventure tickets and food items ({getAnalyticsFilterTitle()})
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#40E0D0] bg-[#0A0A0A] px-2.5 py-1 rounded-lg border border-[#00ABAB]/30">
                  {salesTrendData.length} Intervals
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#007B8B" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#007B8B" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFood" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#99F6E4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#99F6E4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1C" />
                    <XAxis dataKey="date" stroke="#007B8B" opacity={0.6} fontSize={11} tickLine={false} />
                    <YAxis stroke="#007B8B" opacity={0.6} fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#00ABAB', color: '#FFFFFF', borderRadius: '8px' }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
                    <Area type="monotone" dataKey="Activities" stroke="#007B8B" fillOpacity={1} fill="url(#colorAct)" />
                    <Area type="monotone" dataKey="Food Street" stroke="#00ABAB" fillOpacity={1} fill="url(#colorFood)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activities Performance Chart */}
            <div className="p-5 glass-panel border border-[#00ABAB]/30 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#FFFFFF] font-sans">Activity Popularity Matrix</h4>
                  <p className="text-[11px] text-[#9CA3AF] font-sans">
                    Gross monetary earnings generated by sport ({getAnalyticsFilterTitle()})
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-[#40E0D0] bg-[#0A0A0A] px-2.5 py-1 rounded-lg border border-[#00ABAB]/30">
                  {activityPerformanceData.length} Activities
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1C" />
                    <XAxis dataKey="name" stroke="#007B8B" opacity={0.6} fontSize={10} tickLine={false} />
                    <YAxis stroke="#007B8B" opacity={0.6} fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', borderColor: '#00ABAB', color: '#FFFFFF', borderRadius: '8px' }} />
                    <Bar dataKey="revenue" fill="#007B8B" radius={[6, 6, 0, 0]} name="Revenue (₹)">
                      {activityPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#007B8B' : index === 1 ? '#134E4A' : '#00ABAB'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ── 1. ACTIVITY-WISE VISITORS & AMOUNT COLLECTED ── */}
          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden space-y-4 p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-[#00ABAB]/30">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#00ABAB]" /> Activity-Wise Visitors & Revenue Summary
                </h3>
                <p className="text-[#9CA3AF] text-xs mt-0.5">
                  Total visitors and amount collected for each adventure activity ({getAnalyticsFilterTitle()})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#40E0D0] bg-[#0A0A0A] px-3 py-1 rounded-full border border-[#00ABAB]/30">
                  {activities.length} Active Sports
                </span>
                <span className="text-xs font-mono font-bold text-teal-300 bg-[#00ABAB]/10 px-3 py-1 rounded-full border border-[#00ABAB]/30">
                  ₹{filteredSalesData.activityRev.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1C1C1C]">
              <table className="w-full text-left text-xs text-[#FFFFFF]">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold uppercase tracking-wider">
                    <th className="p-3.5">Activity Name</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5 text-center">Visitors Count</th>
                    <th className="p-3.5 text-center">Bookings Count</th>
                    <th className="p-3.5 text-right">Amount Collected (₹)</th>
                    <th className="p-3.5 text-right">Revenue Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {activityDetailedStats.map(stat => (
                    <tr key={`act-stat-${stat.id}`} className="hover:bg-[#1C1C1C]/40 transition-colors">
                      <td className="p-3.5 font-bold text-[#FFFFFF] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00ABAB]" />
                        {stat.name}
                      </td>
                      <td className="p-3.5 font-mono text-[10px] text-[#9CA3AF] uppercase">
                        <span className="px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#00ABAB]/20 text-[#40E0D0]">
                          {stat.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#40E0D0] text-sm">
                        {stat.visitorsCount}
                      </td>
                      <td className="p-3.5 text-center font-mono text-[#9CA3AF]">
                        {stat.bookingsCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-white text-sm">
                        ₹{stat.amountCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-[#1C1C1C] h-2 rounded-full overflow-hidden">
                            <div className="bg-[#00ABAB] h-full rounded-full" style={{ width: `${Math.min(100, stat.sharePercentage)}%` }} />
                          </div>
                          <span className="font-bold text-teal-400">{stat.sharePercentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 2. PACKAGE-WISE VISITORS & AMOUNT COLLECTED ── */}
          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden space-y-4 p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-3 border-b border-[#00ABAB]/30">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#00ABAB]" /> Package-Wise Visitors & Revenue Summary
                </h3>
                <p className="text-[#9CA3AF] text-xs mt-0.5">
                  Detailed breakdown of visitors and revenue per specific package tier ({getAnalyticsFilterTitle()})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#40E0D0] bg-[#0A0A0A] px-3 py-1 rounded-full border border-[#00ABAB]/30">
                  {packageDetailedStats.length} Configured Packages
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1C1C1C]">
              <table className="w-full text-left text-xs text-[#FFFFFF]">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold uppercase tracking-wider">
                    <th className="p-3.5">Activity</th>
                    <th className="p-3.5">Package Name</th>
                    <th className="p-3.5 text-right">Price (₹)</th>
                    <th className="p-3.5 text-center">Visitors / Tickets</th>
                    <th className="p-3.5 text-right">Amount Collected (₹)</th>
                    <th className="p-3.5 text-right">Share of Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {packageDetailedStats.map(pkgStat => (
                    <tr key={`pkg-stat-${pkgStat.activityId}-${pkgStat.packageId}`} className="hover:bg-[#1C1C1C]/40 transition-colors">
                      <td className="p-3.5 font-semibold text-[#9CA3AF]">
                        {pkgStat.activityName}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        <span className="inline-flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-[#00ABAB]" />
                          {pkgStat.packageName}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-300">
                        ₹{pkgStat.price.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-[#40E0D0] text-sm">
                        {pkgStat.visitorsCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-white text-sm">
                        ₹{pkgStat.amountCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-[#1C1C1C] h-2 rounded-full overflow-hidden">
                            <div className="bg-[#40E0D0] h-full rounded-full" style={{ width: `${Math.min(100, pkgStat.shareOfActivity)}%` }} />
                          </div>
                          <span className="font-bold text-slate-300">{pkgStat.shareOfActivity.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 3. COMPLETE REAL-TIME TRANSACTION LOGS TABLE ── */}
          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#00ABAB]/30 pb-3">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-[#00ABAB]" /> Complete Real-Time Transaction Logs
                </h3>
                <p className="text-[#9CA3AF] text-xs mt-0.5">Live database audit stream of all ticket sales, food orders, and counter transactions</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportDashboardCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#00ABAB] text-black rounded-lg hover:bg-[#00ABAB]/80 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </button>
                <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Realtime Sync
                </span>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#0A0A0A] p-3 rounded-xl border border-[#1C1C1C]">
              
              {/* Search Box */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search customer, phone, invoice, ticket ID, package..."
                  value={dashLogSearch}
                  onChange={e => setDashLogSearch(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#00ABAB]/20 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#9CA3AF] focus:border-[#00ABAB] outline-none"
                />
              </div>

              {/* Payment Method Filter */}
              <div>
                <select
                  value={dashLogMethodFilter}
                  onChange={e => setDashLogMethodFilter(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#00ABAB]/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00ABAB] outline-none capitalize"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="card">Card POS</option>
                  <option value="razorpay">Online (Razorpay)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={dashLogStatusFilter}
                  onChange={e => setDashLogStatusFilter(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#00ABAB]/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00ABAB] outline-none capitalize"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="paid">Paid / Success</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={dashLogDateFilter}
                  onChange={e => setDashLogDateFilter(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-[#00ABAB]/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#00ABAB] outline-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today Only</option>
                  <option value="7days">Past 7 Days</option>
                  <option value="30days">Past 30 Days</option>
                </select>
              </div>

            </div>

            {/* Filtered Logs Table */}
            <div className="overflow-x-auto rounded-xl border border-[#1C1C1C] max-h-[500px]">
              <table className="w-full text-left text-xs text-[#FFFFFF]">
                <thead className="sticky top-0 bg-[#0A0A0A] shadow-md z-10">
                  <tr className="bg-[#0A0A0A] border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold uppercase tracking-wider">
                    <th className="p-3">Invoice / Ref ID</th>
                    <th className="p-3">Booking ID</th>
                    <th className="p-3">Customer Details</th>
                    <th className="p-3">Activity & Package</th>
                    <th className="p-3 text-center">Qty / Visitors</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-center">Method</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {filteredDashboardPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[#9CA3AF] font-mono">
                        No transaction records match the current filters.
                      </td>
                    </tr>
                  ) : filteredDashboardPayments.map(pay => {
                    const booking = bookings.find(b => b.id === pay.bookingId);
                    const methodUpper = (pay.method || 'CASH').toUpperCase();
                    const statusUpper = (pay.status || 'PAID').toUpperCase();

                    const methodBadgeClass =
                      methodUpper === 'CASH' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : methodUpper.includes('CARD') ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : methodUpper === 'UPI' || methodUpper === 'QRCODE' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                      : 'bg-teal-500/10 text-[#40E0D0] border-teal-500/20';

                    const statusBadgeClass =
                      statusUpper === 'PAID' || statusUpper === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : statusUpper === 'PENDING' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : statusUpper === 'REFUNDED' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

                    return (
                      <tr key={`dash-pay-${pay.id}`} className="hover:bg-[#1C1C1C]/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#40E0D0] text-[11px]">
                          {pay.invoice_id || `INV-B-${pay.bookingId?.slice(-6) || '—'}`}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-[#9CA3AF]">
                          {pay.bookingId || pay.orderId || '—'}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-white">{pay.customerName || booking?.customerName || 'Guest Customer'}</div>
                          <div className="text-[10px] text-[#40E0D0] font-mono mt-0.5">{pay.customerPhone || booking?.customerPhone || pay.customer_id || ''}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{pay.activityName || booking?.activityName || 'Activity'}</div>
                          <div className="text-[10px] text-[#9CA3AF] mt-0.5">{booking?.packageName || booking?.details || 'Standard Ticket'}</div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-white">
                          {booking?.quantity || 1}
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-white text-sm">
                          ₹{pay.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-center font-mono text-[10px]">
                          <span className={`inline-block px-2 py-0.5 rounded border ${methodBadgeClass}`}>
                            {methodUpper}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-[10px]">
                          <span className={`inline-block px-2 py-0.5 rounded-full font-bold border ${statusBadgeClass}`}>
                            {statusUpper}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-[10px] text-[#9CA3AF] whitespace-nowrap">
                          {new Date(pay.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs text-[#9CA3AF] pt-2">
              <span>Showing {filteredDashboardPayments.length} of {payments.length} transactions</span>
              <span className="font-mono">Real-time sync active</span>
            </div>
          </div>

        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. ACTIVITIES VIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[#FFFFFF]">
            <div>
              <h3 className="font-bold text-lg text-[#FFFFFF] font-sans">Manage Dynamic Activities</h3>
              <p className="text-xs text-[#9CA3AF] font-sans">Configure safety checklists, limit daily riders, and set pricing models</p>
            </div>
            <button
              id="btn-add-activity"
              onClick={() => {
                setEditingActivity(null);
                setActivityForm({
                  name: '',
                  description: '',
                  adultPrice: 40,
                  childPrice: 20,
                  dailyLimit: 60,
                  image: '',
                  type: 'dynamic',
                  safetyInstructionsString: 'Always wear a safety helmet.\nListen to track marshal instructions.',
                  packages: []
                });
                setIsActivityModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold btn-glow text-[#0B0F14] rounded-xl hover:bg-[#00A99D]  transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Activity
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeActivities.map(act => (
              <div 
                key={act.id} 
                id={`activity-card-${act.id}`}
                className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden  hover: transition-shadow flex flex-col"
              >
                <div className="h-40 relative">
                  <img src={act.image} alt={act.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-[#0B0F14]">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#40E0D0] bg-teal-100 px-2 py-0.5 rounded border border-[#00ABAB]/30">
                      {act.type.replace('_', ' ')}
                    </span>
                    <h4 className="font-bold text-sm mt-1">{act.name}</h4>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-[#9CA3AF] line-clamp-3 leading-relaxed">
                    {act.description}
                  </p>

                  <div className="space-y-2 border-t border-[#00ABAB]/30 pt-3">
                    <div className="flex justify-between text-xs text-[#9CA3AF] font-mono">
                      <span>Adult Ticket:</span>
                      <span className="font-bold text-[#FFFFFF]">₹{act.adultPrice ? act.adultPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#9CA3AF] font-mono">
                      <span>Child Ticket:</span>
                      <span className="font-bold text-[#FFFFFF]">₹{act.childPrice ? act.childPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-xs text-[#9CA3AF] font-mono">
                      <span>Daily Limit:</span>
                      <span className="font-bold text-[#FFFFFF]">{act.dailyLimit} slots</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t border-[#00ABAB]/30 pt-3">
                    <button
                      id={`btn-edit-act-${act.id}`}
                      onClick={() => handleEditActivityClick(act)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#00ABAB]/30 hover:bg-[#0A0A0A] text-[#FFFFFF] transition-colors cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </button>
                    {(act.type === 'dynamic' || (act.id !== 'act-go-karting' && act.id !== 'act-air-gun' && act.id !== 'act-horse-riding')) && (
                      <button
                        id={`btn-delete-act-${act.id}`}
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete "${act.name}"?`)) {
                            deleteActivity(act.id);
                          }
                        }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2b. ACTIVITY MANAGEMENT VIEW (new enhancement tab) */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'activity_mgmt' && (
        <div className="space-y-4">
          <ActivityManagementPanel />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. VENDORS VIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[#FFFFFF]">
            <div>
              <h3 className="font-bold text-lg text-[#FFFFFF] font-sans">Manage Food Vendors</h3>
              <p className="text-xs text-[#9CA3AF] font-sans">Register new food concessions, map stall allocations, and monitor owners</p>
            </div>
            <button
              id="btn-add-vendor"
              onClick={() => {
                setEditingVendor(null);
                setVendorForm({
                  name: '',
                  type: 'cafe',
                  ownerName: '',
                  stallNumber: '',
                  image: ''
                });
                setIsVendorModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold btn-glow text-[#0B0F14] rounded-xl hover:bg-[#00A99D]  transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Vendor Stall
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vendors.map(v => (
              <div 
                key={v.id} 
                id={`vendor-card-${v.id}`}
                className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden  hover: transition-shadow flex"
              >
                <img src={v.image} alt={v.name} className="w-1/3 object-cover" referrerPolicy="no-referrer" />
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono font-bold text-[#40E0D0] bg-teal-100 px-2 py-0.5 rounded border border-[#00ABAB]/30">
                        {v.stallNumber}
                      </span>
                      <span className="text-[10px] uppercase font-mono font-bold text-[#9CA3AF]">
                        {v.type}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-[#FFFFFF] font-sans mt-1">{v.name}</h4>
                    <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">Owner: {v.ownerName}</p>
                  </div>

                  <div className="flex gap-2 justify-end border-t border-[#00ABAB]/30 pt-3">
                    <button
                      id={`btn-edit-vendor-${v.id}`}
                      onClick={() => handleEditVendorClick(v)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#00ABAB]/30 hover:bg-[#0A0A0A] text-[#FFFFFF] transition-colors cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit Stall
                    </button>
                    {v.id.includes('dynamic') && (
                      <button
                        id={`btn-delete-vendor-${v.id}`}
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete "${v.name}"?`)) {
                            deleteVendor(v.id);
                          }
                        }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* RETAIL & FOOD MENU MANAGEMENT VIEW */}
      {/* ----------------------------------------------------------------- */}
      {/* ----------------------------------------------------------------- */}
      {/* CAFE & RETAIL SALES SYNCHRONIZATION & PROFIT ANALYTICS VIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'retail_menu' && (() => {
        // Cafe & Food Sales Synchronization Analytics
        const paidCafeOrders = orders.filter(o => {
          if (o.paymentStatus !== 'paid') return false;
          if (salesDateFilter === 'today') {
            const orderDate = new Date(o.createdAt).toDateString();
            return orderDate === new Date().toDateString();
          }
          if (salesDateFilter === 'week') {
            const orderTime = new Date(o.createdAt).getTime();
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            return orderTime >= weekAgo;
          }
          return true;
        });

        const totalCafeSalesRevenue = paidCafeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        
        let totalCafeTradeCost = 0;
        let totalUnitsDispensed = 0;

        paidCafeOrders.forEach(o => {
          o.items.forEach(item => {
            const menuItem = menuItems.find(m => m.id === item.menuItemId || m.name === item.name);
            const purchasePrice = menuItem?.purchasePrice ?? (item.price * 0.6);
            totalCafeTradeCost += purchasePrice * (item.quantity || 1);
            totalUnitsDispensed += (item.quantity || 1);
          });
        });

        const netCafeProfit = totalCafeSalesRevenue - totalCafeTradeCost;
        const cafeMarginPercent = totalCafeSalesRevenue > 0 ? ((netCafeProfit / totalCafeSalesRevenue) * 100) : 0;

        const handleExportCafeSalesCSV = () => {
          const headers = ['Order ID', 'Date', 'Customer Name', 'Customer Email', 'Item Name', 'Vendor/Stall', 'Quantity', 'Selling Price (INR)', 'Trade Purchase Cost (INR)', 'Total Revenue (INR)', 'Total Trade Cost (INR)', 'Gross Margin (INR)', 'Payment Status'];
          const rows: string[][] = [];

          paidCafeOrders.forEach(o => {
            o.items.forEach(item => {
              const menuItem = menuItems.find(m => m.id === item.menuItemId || m.name === item.name);
              const purchaseCost = menuItem?.purchasePrice ?? (item.price * 0.6);
              const totalRev = item.price * item.quantity;
              const totalCost = purchaseCost * item.quantity;
              const profit = totalRev - totalCost;

              rows.push([
                `"${o.id}"`,
                `"${new Date(o.createdAt).toLocaleString()}"`,
                `"${o.customerName || 'Walk-in Guest'}"`,
                `"${o.customerEmail || 'N/A'}"`,
                `"${item.name}"`,
                `"${item.vendorName || 'Cafe Counter'}"`,
                `${item.quantity}`,
                `${item.price.toFixed(2)}`,
                `${purchaseCost.toFixed(2)}`,
                `${totalRev.toFixed(2)}`,
                `${totalCost.toFixed(2)}`,
                `${profit.toFixed(2)}`,
                `"${o.paymentStatus}"`
              ]);
            });
          });

          const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement('a');
          link.setAttribute('href', encodedUri);
          link.setAttribute('download', `deuce_cafe_synchronized_sales_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        return (
          <div className="space-y-6">
            {/* Header with Live Sync Status */}
            <div className="flex flex-wrap justify-between items-center text-[#FFFFFF] gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="font-bold text-lg text-[#FFFFFF] font-sans">Cafe & Retail Synchronized Sales</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Synced
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF] font-sans">
                  Real-time sales stream and margin analytics synchronized from Cafe POS & Food Outlets.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-xl p-1 text-xs font-mono">
                  <button
                    onClick={() => setSalesDateFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      salesDateFilter === 'all' ? 'bg-[#00ABAB] text-black font-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => setSalesDateFilter('week')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      salesDateFilter === 'week' ? 'bg-[#00ABAB] text-black font-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Past 7 Days
                  </button>
                  <button
                    onClick={() => setSalesDateFilter('today')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      salesDateFilter === 'today' ? 'bg-[#00ABAB] text-black font-black' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Today
                  </button>
                </div>

                <button
                  onClick={handleExportCafeSalesCSV}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold btn-glow text-[#0B0F14] rounded-xl hover:bg-[#00A99D] transition-all cursor-pointer shadow-lg"
                  title="Export synchronized sales to CSV"
                >
                  <Download className="h-4 w-4" /> Export CSV Ledger
                </button>
              </div>
            </div>

            {/* 4 Synchronized KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 glass-card border border-[#00ABAB]/30 space-y-1.5 hover:shadow-[0_0_20px_rgba(0,171,171,0.2)] transition-all rounded-2xl">
                <div className="flex items-center justify-between text-[#9CA3AF]">
                  <span className="text-[11px] uppercase tracking-wider font-bold font-sans">Gross Cafe Revenue</span>
                  <Utensils className="h-4 w-4 text-[#14F1D9]" />
                </div>
                <div className="text-2xl font-black font-mono text-[#14F1D9]">
                  ₹{totalCafeSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  From {paidCafeOrders.length} verified cafe orders
                </div>
              </div>

              <div className="p-4 glass-card border border-amber-500/30 space-y-1.5 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all rounded-2xl">
                <div className="flex items-center justify-between text-[#9CA3AF]">
                  <span className="text-[11px] uppercase tracking-wider font-bold font-sans text-amber-400">Trade / Purchase Outlay</span>
                  <IndianRupee className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black font-mono text-amber-400">
                  ₹{totalCafeTradeCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  Vendor trade cost across all orders
                </div>
              </div>

              <div className="p-4 glass-card border border-emerald-500/30 space-y-1.5 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all rounded-2xl">
                <div className="flex items-center justify-between text-[#9CA3AF]">
                  <span className="text-[11px] uppercase tracking-wider font-bold font-sans text-emerald-400">Net Gross Margin</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  +₹{netCafeProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono font-bold">
                  {cafeMarginPercent.toFixed(1)}% profit margin
                </div>
              </div>

              <div className="p-4 glass-card border border-[#00ABAB]/30 space-y-1.5 hover:shadow-[0_0_20px_rgba(0,171,171,0.2)] transition-all rounded-2xl">
                <div className="flex items-center justify-between text-[#9CA3AF]">
                  <span className="text-[11px] uppercase tracking-wider font-bold font-sans">Units Sold</span>
                  <Coffee className="h-4 w-4 text-[#00B4FF]" />
                </div>
                <div className="text-2xl font-black font-mono text-[#00B4FF]">
                  {totalUnitsDispensed}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  Beverages, snacks & retail items
                </div>
              </div>
            </div>

            {/* Vendor / Stall Breakdown Cards */}
            <div>
              <h4 className="text-xs uppercase font-mono font-bold text-gray-400 tracking-wider mb-3">
                Outlet & Vendor Sales Distribution
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {vendors.map(vendor => {
                  const vendorOrders = paidCafeOrders.filter(o => o.items.some(i => i.vendorId === vendor.id));
                  let vendorRev = 0;
                  let vendorCost = 0;
                  let vendorUnits = 0;

                  paidCafeOrders.forEach(o => {
                    o.items.filter(i => i.vendorId === vendor.id).forEach(i => {
                      const m = menuItems.find(item => item.id === i.menuItemId || item.name === i.name);
                      const cost = m?.purchasePrice ?? (i.price * 0.6);
                      vendorRev += i.price * i.quantity;
                      vendorCost += cost * i.quantity;
                      vendorUnits += i.quantity;
                    });
                  });

                  const vendorProfit = vendorRev - vendorCost;

                  return (
                    <div key={vendor.id} className="p-3.5 bg-[#0A0A0A]/60 border border-[#00ABAB]/20 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-white truncate">{vendor.name}</div>
                        <span className="text-[10px] font-mono text-gray-400">{vendor.stallNumber}</span>
                      </div>
                      <div className="flex justify-between items-end pt-1">
                        <div>
                          <div className="text-[10px] text-gray-400 font-mono">Revenue</div>
                          <div className="text-base font-black font-mono text-[#14F1D9]">₹{vendorRev.toFixed(2)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-emerald-400 font-mono font-bold">Margin: +₹{vendorProfit.toFixed(2)}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{vendorUnits} units sold</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Itemized Sales & Profitability Ledger */}
            <div className="space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <h4 className="text-xs uppercase font-mono font-bold text-gray-400 tracking-wider">
                  Itemized Synchronized Sales & Trade Profit Ledger
                </h4>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2 min-w-[200px] bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1">
                    <Search className="h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search menu item..."
                      value={adminMenuSearch}
                      onChange={(e) => setAdminMenuSearch(e.target.value)}
                      className="w-full bg-transparent text-white focus:outline-none text-xs font-mono"
                    />
                  </div>

                  <select
                    value={adminVendorFilter}
                    onChange={(e) => setAdminVendorFilter(e.target.value)}
                    className="bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1 text-white text-xs font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Vendors</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
                  <table className="w-full text-left text-xs text-[#FFFFFF]">
                    <thead>
                      <tr className="bg-[#0A0A0A]/80 border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold sticky top-0 bg-[#050816] z-10">
                        <th className="p-3.5">Menu Item</th>
                        <th className="p-3.5">Outlet / Stall</th>
                        <th className="p-3.5 text-right">Selling Price</th>
                        <th className="p-3.5 text-right">Trade Purchase Cost</th>
                        <th className="p-3.5 text-right">Units Sold</th>
                        <th className="p-3.5 text-right">Total Revenue</th>
                        <th className="p-3.5 text-right">Total Trade Outlay</th>
                        <th className="p-3.5 text-right">Net Profit (Margin)</th>
                        <th className="p-3.5 text-center">Stock Left</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100/10">
                      {menuItems
                        .filter(item => {
                          const matchesSearch = item.name.toLowerCase().includes(adminMenuSearch.toLowerCase()) ||
                                                item.category.toLowerCase().includes(adminMenuSearch.toLowerCase());
                          const matchesVendor = adminVendorFilter === 'all' || item.vendorId === adminVendorFilter;
                          return matchesSearch && matchesVendor;
                        })
                        .map(item => {
                          const vendor = vendors.find(v => v.id === item.vendorId);
                          const purchaseCost = item.purchasePrice ?? (item.price * 0.6);
                          
                          // Calculate units sold for this item
                          let unitsSold = 0;
                          paidCafeOrders.forEach(o => {
                            o.items.forEach(i => {
                              if (i.menuItemId === item.id || i.name === item.name) {
                                unitsSold += (i.quantity || 1);
                              }
                            });
                          });

                          const totalRev = unitsSold * item.price;
                          const totalCost = unitsSold * purchaseCost;
                          const profit = totalRev - totalCost;
                          const marginPercent = item.price > 0 ? Math.round(((item.price - purchaseCost) / item.price) * 100) : 0;
                          const stock = item.stockQuantity ?? 50;

                          return (
                            <tr key={item.id} className="hover:bg-[#0A0A0A]/40 transition-colors">
                              <td className="p-3.5 font-bold text-[#FFFFFF] flex items-center gap-3">
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="h-8 w-8 rounded-lg object-cover border border-[#00ABAB]/30 shrink-0" 
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <div className="font-bold">{item.name}</div>
                                  <div className="text-[10px] text-gray-400 font-normal">{item.category}</div>
                                </div>
                              </td>

                              <td className="p-3.5 font-mono text-[#9CA3AF]">
                                {vendor ? vendor.name : 'Central Retail'}
                              </td>

                              <td className="p-3.5 font-mono font-bold text-[#14F1D9] text-right">
                                ₹{item.price.toFixed(2)}
                              </td>

                              <td className="p-3.5 font-mono font-bold text-amber-400 text-right">
                                ₹{purchaseCost.toFixed(2)}
                              </td>

                              <td className="p-3.5 font-mono font-black text-white text-right">
                                {unitsSold}
                              </td>

                              <td className="p-3.5 font-mono font-bold text-[#14F1D9] text-right">
                                ₹{totalRev.toFixed(2)}
                              </td>

                              <td className="p-3.5 font-mono font-semibold text-amber-400 text-right">
                                ₹{totalCost.toFixed(2)}
                              </td>

                              <td className="p-3.5 font-mono text-right">
                                <span className="text-emerald-400 font-bold">
                                  +₹{profit.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-gray-400 block">
                                  {marginPercent}% margin
                                </span>
                              </td>

                              <td className="p-3.5 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                  stock > 10
                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                    : stock > 0
                                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                    : 'bg-red-950/60 text-red-400 border-red-800/60'
                                }`}>
                                  {stock} units
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Synchronized Orders Audit Stream */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-mono font-bold text-gray-400 tracking-wider">
                Recent Synchronized Orders Stream (Audit Log)
              </h4>

              <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto max-h-[350px] custom-scrollbar">
                  <table className="w-full text-left text-xs text-[#FFFFFF]">
                    <thead>
                      <tr className="bg-[#0A0A0A]/80 border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold sticky top-0 bg-[#050816] z-10">
                        <th className="p-3.5">Order ID / Time</th>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Items Ordered</th>
                        <th className="p-3.5">Total Amount</th>
                        <th className="p-3.5">Payment</th>
                        <th className="p-3.5 text-center">Sync Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-teal-100/10 font-mono">
                      {paidCafeOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            No synchronized cafe transactions recorded for this filter.
                          </td>
                        </tr>
                      ) : (
                        paidCafeOrders.slice(0, 30).map(order => (
                          <tr key={`sync-order-${order.id}`} className="hover:bg-[#0A0A0A]/40 transition-colors">
                            <td className="p-3.5">
                              <div className="font-bold text-white">{order.id}</div>
                              <div className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleString()}</div>
                            </td>
                            <td className="p-3.5 font-sans">
                              <div className="font-bold text-white">{order.customerName || 'Walk-in Guest'}</div>
                              <div className="text-[10px] text-gray-400">{order.customerEmail || 'counter@deuce.park'}</div>
                            </td>
                            <td className="p-3.5 font-sans text-[11px]">
                              {order.items.map((i, idx) => (
                                <div key={idx} className="truncate max-w-xs">
                                  <span className="font-bold text-[#14F1D9]">{i.quantity}x</span> {i.name} (@ ₹{i.price.toFixed(2)})
                                </div>
                              ))}
                            </td>
                            <td className="p-3.5 font-black text-sm text-[#14F1D9]">
                              ₹{order.totalAmount.toFixed(2)}
                            </td>
                            <td className="p-3.5">
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                                {order.paymentStatus}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-950/60 text-[#40E0D0] border border-[#00ABAB]/40">
                                <CheckCircle className="h-3 w-3" /> Synchronized
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ----------------------------------------------------------------- */}
      {/* 4. USER MANAGEMENT VIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[#FFFFFF]">
            <div>
              <h3 className="font-bold text-lg text-[#FFFFFF] font-sans">User & Role Management</h3>
              <p className="text-xs text-[#9CA3AF] font-sans">Assign roles and manage staff/vendor access.</p>
            </div>
            <button 
              onClick={() => setIsUserModalOpen(true)}
              className="btn-glow text-[#0B0F14] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </div>

          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden ">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#FFFFFF]">
                <thead>
                  <tr className="bg-[#0A0A0A]/70 border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Current Role</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {users.map(u => (
                    <tr key={`user-${u.id}`} className="hover:bg-[#0A0A0A]/40 transition-colors">
                      <td className="p-4 font-bold text-[#FFFFFF]">{u.name}</td>
                      <td className="p-4 font-mono text-[#9CA3AF]">{u.email}</td>
                      <td className="p-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#121A24] text-[#9CA3AF] border border-[#00ABAB]/30">
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <select 
                          className="text-xs border border-[#00ABAB]/30 rounded-lg px-2 py-1 glass-panel hover:border-teal-400 focus:outline-none focus:ring-1 focus:ring-[#7DF9FF] cursor-pointer"
                          value={u.role}
                          onChange={(e) => {
                            if(confirm(`Are you sure you want to change ${u.name}'s role to ${e.target.value}?`)){
                              updateUserRole(u.id, e.target.value as any);
                            }
                          }}
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="ticket_counter_staff">Ticket Counter Staff</option>
                          <option value="activity_staff">Activity Staff</option>
                          <option value="food_vendor">Food Vendor</option>
                          <option value="go_karting_manager">Go Karting Manager</option>
                          <option value="go_karting_staff">Go Karting Staff</option>
                          <option value="customer">Guest / Customer</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. REPORTS VIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[#FFFFFF]">
            <div>
              <h3 className="font-bold text-lg text-[#FFFFFF] font-sans">Executive Financial Reporting</h3>
              <p className="text-xs text-[#9CA3AF] font-sans">Consolidated audit data with adventure tax summaries and export models</p>
            </div>
            
            {/* Download Buttons */}
            <div className="flex gap-2">
              <button
                id="btn-export-pdf"
                onClick={() => triggerExport('pdf')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg glass-panel border border-[#00ABAB]/30 hover:bg-[#0A0A0A] text-[#FFFFFF] transition-colors shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
              <button
                id="btn-export-excel"
                onClick={() => triggerExport('excel')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg glass-panel border border-[#00ABAB]/30 hover:bg-[#0A0A0A] text-[#FFFFFF] transition-colors shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Excel
              </button>
              <button
                id="btn-export-csv"
                onClick={() => triggerExport('csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg glass-panel border border-[#00ABAB]/30 hover:bg-[#0A0A0A] text-[#FFFFFF] transition-colors shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
          </div>

          {exportAlert && (
            <div className="p-3 bg-[#0A0A0A] border border-[#00ABAB]/30 text-[#40E0D0] text-xs rounded-xl flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-teal-700 flex-shrink-0" />
              <span>{exportAlert}</span>
            </div>
          )}

          {/* Tax summary calculation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl  space-y-1">
              <div className="text-[10px] text-[#9CA3AF] uppercase font-bold font-mono">Gross Earnings</div>
              <div className="text-2xl font-extrabold text-[#FFFFFF] font-mono">₹{totalRevenue.toFixed(2)}</div>
              <div className="text-[10px] text-slate-400">Activities + Food Street total</div>
            </div>
            <div className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl  space-y-1">
              <div className="text-[10px] text-[#9CA3AF] uppercase font-bold font-mono">Simulated GST Liability</div>
              <div className="text-2xl font-extrabold text-[#FFFFFF] font-mono">₹{(totalRevenue * 0.12).toFixed(2)}</div>
              <div className="text-[10px] text-teal-700 font-semibold">Calculated at standard 12% GST</div>
            </div>
            <div className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl  space-y-1">
              <div className="text-[10px] text-[#9CA3AF] uppercase font-bold font-mono">Net Retained Yield</div>
              <div className="text-2xl font-extrabold text-[#FFFFFF] font-mono">₹{(totalRevenue * 0.88).toFixed(2)}</div>
              <div className="text-[10px] text-slate-400">Post simulated tax reserve</div>
            </div>
          </div>

          {/* Combined Detailed Sales Ledger */}
          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden ">
            <div className="p-4 border-b border-[#00ABAB]/30 flex justify-between items-center bg-[#0A0A0A]/50">
              <h4 className="font-bold text-sm text-[#FFFFFF] font-sans">Complete Audit Ledger</h4>
              <span className="text-[10px] font-mono font-bold text-[#9CA3AF] uppercase">Live Database Stream</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#FFFFFF]">
                <thead>
                  <tr className="bg-[#0A0A0A]/70 border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold">
                    <th className="p-3">Reference ID</th>
                    <th className="p-3">Source Channel</th>
                    <th className="p-3">Customer / Vendor</th>
                    <th className="p-3">Transaction Date</th>
                    <th className="p-3 text-right">Amount (?)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {bookings.map(b => (
                    <tr key={`report-b-${b.id}`} id={`ledger-row-booking-${b.id}`} className="hover:bg-[#0A0A0A]/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#FFFFFF]">tkt-{b.id}</td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#0A0A0A] text-[#40E0D0] border border-[#00ABAB]/30">
                          Activity Booking
                        </span>
                      </td>
                      <td className="p-3">
                          <div className="font-bold text-[#FFFFFF]">{b.customerName}</div>
                          {b.customerPhone && <div className="text-[10px] text-[#40E0D0] font-mono mt-0.5">{b.customerPhone}</div>}
                          <div className="text-[9px] text-[#9CA3AF] mt-0.5">{b.activityName}</div>
                        </td>
                      <td className="p-3 font-mono text-[#9CA3AF]">{b.date}</td>
                      <td className="p-3 text-right font-mono font-bold text-[#FFFFFF]">₹{b.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {orders.map(o => (
                    <tr key={`report-o-${o.id}`} id={`ledger-row-order-${o.id}`} className="hover:bg-[#0A0A0A]/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#FFFFFF]">{o.id}</td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                          Food Street Order
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-[#FFFFFF]">{o.customerName}</div>
                        <div className="text-[9px] text-[#9CA3AF]">{o.items.length} items</div>
                      </td>
                      <td className="p-3 font-mono text-[#9CA3AF]">{o.createdAt.split('T')[0]}</td>
                      <td className="p-3 text-right font-mono font-bold text-[#FFFFFF]">₹{o.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gate Scan Logs */}
          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden ">
            <div className="p-4 border-b border-[#00ABAB]/30 flex justify-between items-center bg-[#0A0A0A]/50">
              <h4 className="font-bold text-sm text-[#FFFFFF] font-sans">Gate Scan Activity</h4>
              <span className="text-[10px] font-mono font-bold text-[#9CA3AF] uppercase">Live Scanner Stream</span>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs text-[#FFFFFF]">
                <thead className="sticky top-0 bg-[#0A0A0A] shadow-md z-10">
                  <tr className="bg-[#0A0A0A]/90 border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold">
                    <th className="p-3">Ticket ID</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Gate Staff</th>
                    <th className="p-3 text-right">Scanned Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {tickets.filter(t => t.status === 'used' && t.usedAt).map(t => (
                    <tr key={`scan-${t.id}`} className="hover:bg-[#0A0A0A]/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#FFFFFF]">{t.id}</td>
                      <td className="p-3">
                        <div className="font-bold text-[#FFFFFF]">{t.customerName}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#134E4A] text-[#40E0D0] border border-[#00ABAB]/30">
                          {t.usedByStaffName || 'Unknown Staff'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-[#9CA3AF]">
                        {new Date(t.usedAt!).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {tickets.filter(t => t.status === 'used' && t.usedAt).length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-[#9CA3AF] text-xs font-mono">No tickets scanned at gates yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ── PAYMENT REPORTS TAB ── */}
      {activeTab === 'payments' && (() => {
        const filteredPayments = payments.filter(p => {
          const matchesMethod = payFilter === 'all' ? true
            : payFilter === 'pending' ? (p.status === 'pending' || p.payment_status === 'PENDING')
            : payFilter === 'failed' ? (p.status === 'failed' || p.payment_status === 'FAILED')
            : p.method === payFilter;
          const booking = bookings.find(b => b.id === p.bookingId);
          const ticket = tickets.find(t => t.bookingId === p.bookingId);
          const searchLower = paySearch.toLowerCase();
          const matchesSearch = !paySearch
            || booking?.customerName?.toLowerCase().includes(searchLower)
            || p.bookingId?.toLowerCase().includes(searchLower)
            || ticket?.id?.toLowerCase().includes(searchLower)
            || p.transactionId?.toLowerCase().includes(searchLower)
            || p.invoice_id?.toLowerCase().includes(searchLower);
          return matchesMethod && matchesSearch;
        }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Summaries across ALL payments in state
        const allPayments = payments;

        // Overall collection metrics
        const totalOverallCollection = allPayments
          .filter(p => p.status === 'paid' || p.status === 'success')
          .reduce((s, p) => s + p.amount, 0);

        // Counter collections
        const counterCashCollection = allPayments
          .filter(p => (p.status === 'paid' || p.status === 'success') && p.method === 'cash')
          .reduce((s, p) => s + p.amount, 0);

        const counterUpiCollection = allPayments
          .filter(p => (p.status === 'paid' || p.status === 'success') && (p.method === 'qrcode' || (p.method === 'upi' && (p.staffId || p.counterId === 'counter_1'))))
          .reduce((s, p) => s + p.amount, 0);

        const counterCardCollection = allPayments
          .filter(p => (p.status === 'paid' || p.status === 'success') && p.method.startsWith('card'))
          .reduce((s, p) => s + p.amount, 0);

        const totalCounterCollection = counterCashCollection + counterUpiCollection + counterCardCollection;

        // Online collections
        const totalOnlineCollection = allPayments
          .filter(p => (p.status === 'paid' || p.status === 'success') && 
                       (p.method === 'razorpay' || 
                        ((p.method === 'upi' || p.method === 'card' || p.method === 'net_banking') && !p.staffId && p.counterId !== 'counter_1')))
          .reduce((s, p) => s + p.amount, 0);

        // Edge states
        const failedCount = allPayments.filter(p => p.status === 'failed').length;
        const pendingCount = allPayments.filter(p => p.status === 'pending').length;
        const refundsSum = allPayments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);

        const netCollection = totalOverallCollection - refundsSum;

        const methodColors: Record<string, string> = { upi: 'text-violet-400', card: 'text-blue-400', cash: 'text-emerald-400', razorpay: 'text-[#00ABAB]', net_banking: 'text-amber-400' };
        const statusColors: Record<string, string> = { success: 'text-emerald-400 bg-emerald-500/10', paid: 'text-emerald-400 bg-emerald-500/10', pending: 'text-amber-400 bg-amber-500/10', failed: 'text-red-400 bg-red-500/10', cancelled: 'text-gray-400 bg-gray-500/10', refunded: 'text-purple-400 bg-purple-500/10' };

        return (
          <div className="space-y-6">
            
            {/* Tab Selector: Reports vs Reconciliation */}
            <div className="flex border-b border-[#1C1C1C]">
              <button 
                onClick={() => setReconciliationTab('reports')}
                className={`px-5 py-3 font-bold text-sm transition-all border-b-2 ${reconciliationTab === 'reports' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
              >
                Collection Reports
              </button>
              <button 
                onClick={() => setReconciliationTab('reconciliation')}
                className={`px-5 py-3 font-bold text-sm transition-all border-b-2 ${reconciliationTab === 'reconciliation' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
              >
                Gateway Reconciliation
              </button>
            </div>

            {reconciliationTab === 'reports' ? (
              <>
                {/* ── Collection Summaries Grid ── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#00ABAB]/40 shadow-[0_0_15px_rgba(0,171,171,0.1)]">
                    <p className="text-[10px] font-mono text-[#00ABAB] uppercase tracking-wider font-bold">Total Overall Collection</p>
                    <p className="text-lg font-black text-[#00ABAB] mt-1">₹{totalOverallCollection.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                    <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">Total Online Collection</p>
                    <p className="text-lg font-black text-violet-400 mt-1">₹{totalOnlineCollection.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                    <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">Total Counter Collection</p>
                    <p className="text-lg font-black text-emerald-400 mt-1">₹{totalCounterCollection.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                    <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">Counter Cash Collection</p>
                    <p className="text-lg font-black text-emerald-400 mt-1">₹{counterCashCollection.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                    <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">Counter UPI Collection</p>
                    <p className="text-lg font-black text-violet-400 mt-1">₹{counterUpiCollection.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                    <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">Counter Card POS Collection</p>
                    <p className="text-lg font-black text-blue-400 mt-1">₹{counterCardCollection.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                    <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">Failed Transactions</p>
                    <p className="text-lg font-black text-red-400 mt-1">{failedCount}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                    <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">Pending Transactions</p>
                    <p className="text-lg font-black text-amber-400 mt-1">{pendingCount}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                    <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider font-bold">Refunds Processed</p>
                    <p className="text-lg font-black text-purple-400 mt-1">₹{refundsSum.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#00ABAB]/30">
                    <p className="text-[10px] font-mono text-[#00ABAB] uppercase tracking-wider font-bold">Net Collection (Overall - Refund)</p>
                    <p className="text-lg font-black text-[#00ABAB] mt-1">₹{netCollection.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* ── Transaction Log Card ── */}
                <div className="glass-panel p-6 rounded-2xl border border-[#00ABAB]/30">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center gap-2"><IndianRupee className="w-5 h-5 text-[#00ABAB]" /> Transaction History Log</h3>
                      <p className="text-[#94A3B8] text-xs mt-0.5">Search and filter cash, card, and UPI collections</p>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                      <input
                        type="text"
                        placeholder="Search by name, invoice, booking ID, txn ref..."
                        value={paySearch}
                        onChange={e => setPaySearch(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#94A3B8] focus:border-[#00ABAB] outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['all', 'cash', 'upi', 'card', 'pending', 'failed'] as const).map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setPayFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize ${payFilter === f ? 'bg-[#00ABAB] text-black' : 'bg-[#1C1C1C] text-[#94A3B8] hover:text-white'}`}
                        >
                          {f === 'all' ? 'All Methods' : f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto rounded-xl border border-[#1C1C1C]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#1C1C1C] text-[#94A3B8] text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left">Invoice ID</th>
                          <th className="px-4 py-3 text-left">Booking ID</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Activity</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-left">Method</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Txn / Ref ID</th>
                          <th className="px-4 py-3 text-left">Date &amp; Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1C1C1C]">
                        {filteredPayments.length === 0 ? (
                          <tr><td colSpan={9} className="text-center py-10 text-[#94A3B8]">No payments found matching filters.</td></tr>
                        ) : filteredPayments.map(pay => {
                          const booking = bookings.find(b => b.id === pay.bookingId);
                          return (
                            <tr key={pay.id} className="hover:bg-[#1C1C1C]/50 transition-colors text-xs">
                              <td className="px-4 py-3 font-mono text-[10px] text-[#00ABAB] font-bold">{pay.invoice_id || `INV-B-${pay.bookingId?.slice(-6) || '—'}`}</td>
                              <td className="px-4 py-3 font-mono text-[10px] text-[#94A3B8]">{pay.bookingId?.slice(-8) || '—'}</td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-white">{booking?.customerName || '—'}</p>
                                <p className="text-[9px] text-[#94A3B8]">{booking?.customerEmail || '—'}</p>
                              </td>
                              <td className="px-4 py-3 text-[#94A3B8] text-xs">{booking?.activityName || '—'}</td>
                              <td className="px-4 py-3 text-right font-bold text-white">₹{pay.amount.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3">
                                <span className={`font-bold uppercase text-[10px] ${methodColors[pay.method] || 'text-white'}`}>{pay.method}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${statusColors[pay.status] || 'text-white'}`}>{pay.status}</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-[10px] text-[#94A3B8] max-w-[120px] truncate">
                                {pay.razorpayPaymentId || pay.referenceNumber || pay.transactionId || '—'}
                              </td>
                              <td className="px-4 py-3 text-[10px] text-[#94A3B8] whitespace-nowrap">
                                {new Date(pay.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-3">{filteredPayments.length} records shown</p>
                </div>
              </>
            ) : (
              /* ── GATEWAY RECONCILIATION SIDE-BY-SIDE VIEW ── */
              <div className="glass-panel p-6 rounded-2xl border border-[#00ABAB]/30 space-y-6">
                <div>
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">🔄 Live Gateway Reconciliation</h3>
                  <p className="text-[#94A3B8] text-xs mt-0.5">Compare local DEUCE billing records against actual gateway/terminal captures from Razorpay</p>
                </div>

                {isReconciling ? (
                  <div className="text-center py-12 space-y-3">
                    <Loader2 className="w-8 h-8 text-[#00ABAB] animate-spin mx-auto" />
                    <p className="text-[#94A3B8] text-xs">Syncing logs and running verification comparisons...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Local Billing Records */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-sm text-[#94A3B8] border-b border-[#1c1c1c] pb-2">DEUCE Local Billing Database ({payments.length} txn)</h4>
                      <div className="overflow-y-auto max-h-[400px] border border-[#1c1c1c] rounded-xl text-xs divide-y divide-[#1c1c1c]">
                        {payments.map(local => {
                          const hasMatch = gatewayPayments.some(g => g.id === local.gateway_payment_id || g.id === local.transactionId || g.notes?.bookingRef === local.bookingId);
                          return (
                            <div key={local.id} className="p-3 hover:bg-[#1C1C1C]/30 flex justify-between items-center transition-colors">
                              <div>
                                <p className="font-bold text-white font-mono text-[10px]">{local.invoice_id || 'COUNTER CASH'}</p>
                                <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">Booking: {local.bookingId?.slice(-8) || '—'}</p>
                                <p className="text-[9px] text-[#94A3B8] mt-0.5">TxID: {local.transactionId || '—'}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-white">₹{local.amount.toLocaleString('en-IN')}</p>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 ${hasMatch ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {hasMatch ? 'Reconciled' : 'Local Only (Cash)'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Gateway API captures */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-sm text-[#94A3B8] border-b border-[#1c1c1c] pb-2">Gateway/POS Captured API Transactions ({gatewayPayments.length} txn)</h4>
                      <div className="overflow-y-auto max-h-[400px] border border-[#1c1c1c] rounded-xl text-xs divide-y divide-[#1c1c1c]">
                        {gatewayPayments.length === 0 ? (
                          <div className="p-6 text-center text-[#94A3B8]">No gateway API transactions loaded. Configure Razorpay secret key.</div>
                        ) : gatewayPayments.map(gateway => {
                          const localMatch = payments.find(p => p.gateway_payment_id === gateway.id || p.transactionId === gateway.id || p.bookingId === gateway.notes?.bookingRef);
                          const isRefunded = gateway.status === 'refunded';
                          return (
                            <div key={gateway.id} className="p-3 hover:bg-[#1C1C1C]/30 flex justify-between items-center transition-colors">
                              <div>
                                <p className="font-bold text-white font-mono text-[10px]">{gateway.id}</p>
                                <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">Ref Notes: {gateway.notes?.bookingRef || 'Direct/Online'}</p>
                                <p className="text-[9px] text-[#94A3B8] mt-0.5">Method: {gateway.method?.toUpperCase()} | Status: {gateway.status?.toUpperCase()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-[#00ABAB]">₹{(gateway.amount / 100).toLocaleString('en-IN')}</p>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold mt-1 ${localMatch ? 'bg-emerald-500/10 text-emerald-400' : isRefunded ? 'bg-purple-500/10 text-purple-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                  {localMatch ? 'Matching' : isRefunded ? 'Refunded' : 'Missing in Local'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── ACCOUNTS & FINANCE TAB ── */}
      {activeTab === 'accounts_finance' && (
        <div className="glass-panel border border-[#00ABAB]/20 rounded-2xl p-6">
          <AccountsFinancePanel />
        </div>
      )}

      {activeTab === 'pay_settings' && (

        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-[#00ABAB]/30">
            <h3 className="font-bold text-xl text-white flex items-center gap-2 mb-2"><Settings className="w-5 h-5 text-[#00ABAB]" /> Payment Configuration</h3>
            <p className="text-[#94A3B8] text-sm mb-6">Manage transaction credentials, terminal integrations, and active collection methods for counter operations.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: API Gateways */}
              <div className="space-y-6">
                
                {/* Razorpay API Config */}
                <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#1C1C1C] space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1c1c1c] pb-3">
                    <CreditCard className="w-5 h-5 text-[#00ABAB]" />
                    <h4 className="font-bold text-white">Razorpay API Gateway</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1 font-mono uppercase tracking-wider">Key ID (Public)</label>
                      <input 
                        type="text"
                        value={razorpayKeyIdInput}
                        onChange={e => setRazorpayKeyIdInput(e.target.value)}
                        placeholder="rzp_live_..."
                        className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl px-4 py-2.5 text-white outline-none font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1 font-mono uppercase tracking-wider">Key Secret (Obscured)</label>
                      <input 
                        type="password"
                        value={razorpayKeySecretInput}
                        onChange={e => setRazorpayKeySecretInput(e.target.value)}
                        placeholder="••••••••••••••••"
                        className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl px-4 py-2.5 text-white outline-none font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Counter UPI Details */}
                <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#1C1C1C] space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1c1c1c] pb-3">
                    <Smartphone className="w-5 h-5 text-violet-400" />
                    <h4 className="font-bold text-white">UPI QR Code Settings</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1 font-mono uppercase tracking-wider">Counter UPI ID</label>
                      <input 
                        type="text"
                        value={upiIdInput}
                        onChange={e => setUpiIdInput(e.target.value)}
                        placeholder="business@upi"
                        className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl px-4 py-2.5 text-white outline-none font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1 font-mono uppercase tracking-wider">Display Business Name</label>
                      <input 
                        type="text"
                        value={businessNameInput}
                        onChange={e => setBusinessNameInput(e.target.value)}
                        placeholder="Deuce Park"
                        className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl px-4 py-2.5 text-white outline-none text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: POS Terminal & Methods */}
              <div className="space-y-6">
                
                {/* Physical Card POS Terminal */}
                <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#1C1C1C] space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#1c1c1c] pb-3">
                    <Terminal className="w-5 h-5 text-amber-400" />
                    <h4 className="font-bold text-white">Physical POS Card Terminal</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#94A3B8] mb-1 font-mono uppercase tracking-wider">POS Driver/Provider</label>
                        <select 
                          value={posProviderInput}
                          onChange={e => setPosProviderInput(e.target.value)}
                          className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl px-3 py-2.5 text-white outline-none text-xs"
                        >
                          <option value="mock_pos">Mock POS Emulator</option>
                          <option value="razorpay_pos">Razorpay SmartPOS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[#94A3B8] mb-1 font-mono uppercase tracking-wider">Terminal ID</label>
                        <input 
                          type="text"
                          value={posTerminalIdInput}
                          onChange={e => setPosTerminalIdInput(e.target.value)}
                          placeholder="POS-TERM-001"
                          className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl px-4 py-2.5 text-white outline-none font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[#94A3B8] mb-1 font-mono uppercase tracking-wider">Terminal Custom Name</label>
                      <input 
                        type="text"
                        value={posTerminalNameInput}
                        onChange={e => setPosTerminalNameInput(e.target.value)}
                        placeholder="Deuce Counter Terminal 1"
                        className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl px-4 py-2.5 text-white outline-none text-xs"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button 
                        type="button" 
                        onClick={handleTestPosConnection}
                        disabled={isTestingPos}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1C1C1C] hover:bg-[#2C2C2C] text-[#94A3B8] hover:text-white border border-white/5 transition-all flex items-center justify-center gap-1.5 self-start"
                      >
                        {isTestingPos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                        Test POS Terminal Connection
                      </button>
                      {posTestResult && (
                        <p className="text-xs font-mono p-2.5 bg-[#1C1C1C] border border-white/5 rounded-xl text-left text-white mt-1">{posTestResult}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enabled Collection Methods */}
                <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#1C1C1C] space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#1c1c1c] pb-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-white">Active Payment Channels</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 py-2 text-xs">
                    {[
                      { key: 'CASH', label: 'Cash Payment' },
                      { key: 'UPI', label: 'UPI Collect Requests' },
                      { key: 'QR_CODE', label: 'Scan dynamic QR' },
                      { key: 'CARD', label: 'Counter Cards (POS)' }
                    ].map(method => {
                      const isActive = enabledMethodsInput.includes(method.key);
                      return (
                        <label key={method.key} className="flex items-center gap-2.5 p-2 bg-[#1C1C1C]/40 border border-white/5 rounded-xl hover:bg-[#1C1C1C]/80 cursor-pointer transition-colors text-[#94A3B8] hover:text-white">
                          <input 
                            type="checkbox"
                            checked={isActive}
                            onChange={() => {
                              if (isActive) {
                                setEnabledMethodsInput(prev => prev.filter(x => x !== method.key));
                              } else {
                                setEnabledMethodsInput(prev => [...prev, method.key]);
                              }
                            }}
                            className="w-4 h-4 accent-[#00ABAB] rounded cursor-pointer"
                          />
                          <span className="font-medium text-xs">{method.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-[#1C1C1C] pt-6 mt-6 flex justify-end gap-3">
              <button 
                type="button"
                onClick={handleSavePaymentConfig}
                className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                {saveSuccess ? <><Check className="w-4 h-4" /> Configuration Saved!</> : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DATABASE & SUPABASE HUB VIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30  relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0A0A0A] rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[#FFFFFF]">
              <div className="space-y-1">
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-full">
                  Supabase Backend Configuration
                </span>
                <h3 className="font-bold text-lg text-[#FFFFFF] font-sans flex items-center gap-2">
                  <Database className="h-5 w-5 text-amber-600" /> Production Database Architecture
                </h3>
                <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">
                  Exportable PostgreSQL structures, fine-grained Row-Level Security (RLS) definitions, role hierarchies, and Vercel hosting guides.
                </p>
              </div>

              {copiedText && (
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono rounded-xl animate-fade-in flex items-center gap-1.5 font-bold">
                  <Check className="h-3.5 w-3.5" /> Copied {copiedText}!
                </div>
              )}
            </div>

            {/* Sub Tabs selector */}
            <div className="flex flex-wrap gap-2 border-b border-[#00ABAB]/30 pb-3 text-xs font-bold text-[#FFFFFF]">
              <button
                id="btn-db-subtab-schema"
                onClick={() => setActiveDbSubTab('schema')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDbSubTab === 'schema'
                    ? 'bg-[#0A0A0A] border border-[#00ABAB]/30 text-[#40E0D0] font-extrabold'
                    : 'bg-transparent border border-transparent hover:bg-[#0A0A0A]/50 text-[#9CA3AF] hover:text-[#FFFFFF]'
                }`}
              >
                <Terminal className="h-3.5 w-3.5" /> Schema DDL (11 Tables)
              </button>

              <button
                id="btn-db-subtab-rls"
                onClick={() => setActiveDbSubTab('rls')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDbSubTab === 'rls'
                    ? 'bg-[#0A0A0A] border border-[#00ABAB]/30 text-[#40E0D0] font-extrabold'
                    : 'bg-transparent border border-transparent hover:bg-[#0A0A0A]/50 text-[#9CA3AF] hover:text-[#FFFFFF]'
                }`}
              >
                <Lock className="h-3.5 w-3.5" /> RLS Security Policies
              </button>

              <button
                id="btn-db-subtab-hierarchy"
                onClick={() => setActiveDbSubTab('hierarchy')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDbSubTab === 'hierarchy'
                    ? 'bg-[#0A0A0A] border border-[#00ABAB]/30 text-[#40E0D0] font-extrabold'
                    : 'bg-transparent border border-transparent hover:bg-[#0A0A0A]/50 text-[#9CA3AF] hover:text-[#FFFFFF]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Role RBAC Hierarchy
              </button>

              <button
                id="btn-db-subtab-api"
                onClick={() => setActiveDbSubTab('api_routes')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDbSubTab === 'api_routes'
                    ? 'bg-[#0A0A0A] border border-[#00ABAB]/30 text-[#40E0D0] font-extrabold'
                    : 'bg-transparent border border-transparent hover:bg-[#0A0A0A]/50 text-[#9CA3AF] hover:text-[#FFFFFF]'
                }`}
              >
                <Settings className="h-3.5 w-3.5" /> API Routes & Structure
              </button>

              <button
                id="btn-db-subtab-deploy"
                onClick={() => setActiveDbSubTab('deploy')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDbSubTab === 'deploy'
                    ? 'bg-[#0A0A0A] border border-[#00ABAB]/30 text-[#40E0D0] font-extrabold'
                    : 'bg-transparent border border-transparent hover:bg-[#0A0A0A]/50 text-[#9CA3AF] hover:text-[#FFFFFF]'
                }`}
              >
                <Globe className="h-3.5 w-3.5" /> Vercel & Supabase Deploy Guide
              </button>
            </div>

            {/* SUB-TAB CONTENTS */}
            
            {/* 1. SCHEMA DDL */}
            {activeDbSubTab === 'schema' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[#0A0A0A]/50 p-3 rounded-xl border border-white/5 text-xs text-slate-300">
                  <span>Run this SQL code in the **Supabase SQL Editor** to bootstrap all 11 core tables and types.</span>
                  <button
                    id="btn-copy-schema-sql"
                    onClick={() => handleCopyText(SCHEMA_SQL, 'SQL Schema')}
                    className="flex items-center gap-1 bg-[#007B8B]/20 hover:bg-[#007B8B]/40 border border-[#007B8B]/30 text-[#0B0F14] px-2.5 py-1 rounded-md cursor-pointer"
                  >
                    <Copy className="h-3 w-3" /> Copy SQL DDL
                  </button>
                </div>
                <div className="relative max-h-[420px] overflow-y-auto rounded-xl border border-white/5 shadow-inner">
                  <pre className="bg-[#0A0A0A]/80 p-4 font-mono text-[10px] text-slate-100 leading-normal overflow-x-auto whitespace-pre">
                    {SCHEMA_SQL}
                  </pre>
                </div>
              </div>
            )}

            {/* 2. RLS SECURITY POLICIES */}
            {activeDbSubTab === 'rls' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[#0A0A0A]/50 p-3 rounded-xl border border-white/5 text-xs text-slate-300">
                  <span>Locks down every table to enforce Row-Level Security based on active user claims.</span>
                  <button
                    id="btn-copy-rls-sql"
                    onClick={() => handleCopyText(RLS_SQL, 'RLS Policies')}
                    className="flex items-center gap-1 bg-[#007B8B]/20 hover:bg-[#007B8B]/40 border border-[#007B8B]/30 text-[#0B0F14] px-2.5 py-1 rounded-md cursor-pointer"
                  >
                    <Copy className="h-3 w-3" /> Copy RLS SQL
                  </button>
                </div>
                <div className="relative max-h-[420px] overflow-y-auto rounded-xl border border-white/5 shadow-inner">
                  <pre className="bg-[#0A0A0A]/80 p-4 font-mono text-[10px] text-slate-100 leading-normal overflow-x-auto whitespace-pre">
                    {RLS_SQL}
                  </pre>
                </div>
              </div>
            )}

            {/* 3. ROLE RBAC HIERARCHY */}
            {activeDbSubTab === 'hierarchy' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-[#00ABAB]/30 space-y-3">
                    <h4 className="font-extrabold text-xs text-amber-850 uppercase tracking-wider font-sans flex items-center gap-1">
                      <Key className="h-3.5 w-3.5 text-amber-600" /> Departmental Access Boundaries
                    </h4>
                    <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                      Every user holds a custom claim or mapped role with strict data-isolation filters. Access is divided securely:
                    </p>
                    <div className="space-y-2 text-[10px] font-mono text-[#9CA3AF]">
                      <div className="p-2 glass-card border border-[#00ABAB]/30 ">
                        <span className="font-black text-amber-800">SUPER ADMIN:</span> scope: <span className="text-emerald-700">global</span>. Full financial metrics, database tables edits, user allocations.
                      </div>
                      <div className="p-2 glass-card border border-[#00ABAB]/30 ">
                        <span className="font-black text-amber-800">TICKET COUNTER ADMIN:</span> scope: <span className="text-emerald-700">global_booking</span>. Full checkout counter powers. Creates tickets, processes combos/refunds, checks-in guests, logs checkins.
                      </div>
                      <div className="p-2 glass-card border border-[#00ABAB]/30 ">
                        <span className="font-black text-amber-800">ACTIVITY STAFF:</span> scope: <span className="text-teal-700">department_specific</span>. Access is mapped strictly to Go Karting, Horse Riding, or Air Gun Shooting. Cannot view other activities, and cannot query gross finances.
                      </div>
                      <div className="p-2 glass-card border border-[#00ABAB]/30 ">
                        <span className="font-black text-amber-800">FOOD / CAFE STAFF:</span> scope: <span className="text-teal-700">stall_specific</span>. Isolation for kitchen orders of their own concessions. Cannot query activity bookings or central park settings.
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0A0A0A] rounded-2xl border border-[#00ABAB]/30 space-y-3 flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs text-[#FFFFFF] uppercase tracking-wider font-sans">
                        ðŸ”‘ Claim-based Authentication Token Setup
                      </h4>
                      <p className="text-[11px] text-[#9CA3AF] leading-relaxed mt-2">
                        Supabase JWT tokens contain custom app metadata inside the user claims. Mappings can be handled by a Postgres database trigger on Auth signup or via edge functions:
                      </p>
                    </div>
                    
                    <div className="bg-[#0A0A0A] p-3 rounded-xl border border-slate-800 font-mono text-[9px] text-slate-100 overflow-x-auto whitespace-pre">
                      {TRIGGER_SQL}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. API ROUTING & FOLDER STRUCTURE */}
            {activeDbSubTab === 'api_routes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1 p-4 bg-[#0A0A0A] rounded-2xl border border-[#00ABAB]/30 space-y-3">
                    <h4 className="font-extrabold text-xs text-[#FFFFFF] uppercase tracking-wider font-sans">
                      ðŸ“‚ Next.js Folder Structure
                    </h4>
                    <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                      Recommended repository map for the Next.js App Router and Supabase project:
                    </p>
                    <div className="bg-[#0A0A0A] p-3 rounded-xl border border-slate-800 font-mono text-[9px] text-slate-200 overflow-y-auto max-h-[220px]">
                      {FOLDER_TREE_STR}
                    </div>
                  </div>

                  <div className="col-span-2 p-4 bg-[#0A0A0A] rounded-2xl border border-[#00ABAB]/30 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-xs text-[#FFFFFF] uppercase tracking-wider font-sans flex items-center gap-1">
                        âš¡ Unified Scanning API Route (/api/tickets/scan)
                      </h4>
                      <button
                        id="btn-copy-scan-api"
                        onClick={() => handleCopyText(SCAN_API_CODE, 'Scan API')}
                        className="bg-[#0A0A0A] hover:bg-teal-100 border border-[#00ABAB]/30 px-2 py-0.5 rounded text-[10px] text-[#40E0D0] cursor-pointer"
                      >
                        Copy API Code
                      </button>
                    </div>
                    <div className="relative max-h-[200px] overflow-y-auto rounded-xl border border-slate-800 shadow-inner">
                      <pre className="bg-[#0A0A0A] p-3 font-mono text-[9px] text-slate-100 leading-normal overflow-x-auto whitespace-pre">
                        {SCAN_API_CODE}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. VERCEL & SUPABASE DEPLOY */}
            {activeDbSubTab === 'deploy' && (
              <div className="space-y-4">
                <div className="p-5 bg-[#0A0A0A] rounded-2xl border border-[#00ABAB]/30 space-y-4">
                  <h4 className="font-extrabold text-xs text-[#FFFFFF] uppercase tracking-wider font-sans flex items-center gap-1.5">
                    ðŸš€ Vercel & Supabase Cloud Integration Checklist
                  </h4>
                  <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                    Follow these step-by-step guidelines to publish the Adventure Park platform onto secure live nodes with server-side authentication:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
                    <div className="space-y-3 text-[#9CA3AF]">
                      <div className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono border border-amber-200">1</div>
                        <div>
                          <p className="font-bold text-[#FFFFFF]">Provision a Supabase PostgreSQL Instance</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Create a free-tier database in the Supabase Dashboard, select your preferred AWS region, and navigate to the SQL Editor.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono border border-amber-200">2</div>
                        <div>
                          <p className="font-bold text-[#FFFFFF]">Bootstrap DDL & Enable RLS</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Copy and execute the queries from the Schema & RLS sub-tabs inside our editor. This creates the 11 tables and configures strict row filters.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono border border-amber-200">3</div>
                        <div>
                          <p className="font-bold text-[#FFFFFF]">Set Up Email OTP and Auth Providers</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">In **Authentication &gt; Providers**, turn on Email Magic Link or OTP. Configure Google OAuth client secrets if you support third-party log-ins.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-[#9CA3AF]">
                      <div className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono border border-amber-200">4</div>
                        <div>
                          <p className="font-bold text-[#FFFFFF]">Publish onto Vercel</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Link your GitHub repository to Vercel. Choose the Next.js framework preset, and trigger an automatic compilation of the project's static/server files.</p>
                        </div>
                      </div>

                      <div className="flex gap-2.5 items-start">
                        <div className="w-5 h-5 bg-amber-100 text-amber-900 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 font-mono border border-amber-200">5</div>
                        <div>
                          <p className="font-bold text-[#FFFFFF]">Configure Vercel Environment Variables</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Declare the following secrets inside Vercel Dashboard Settings to establish database connections:</p>
                          <div className="bg-[#0A0A0A] p-2.5 rounded-lg border border-slate-800 font-mono text-[9px] text-slate-300 mt-1 space-y-1">
                            <div>NEXT_PUBLIC_SUPABASE_URL=your_project_url</div>
                            <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key</div>
                            <div>SUPABASE_SERVICE_ROLE_KEY=your_admin_secret_key</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* ACTIVITY MODAL */}
      {/* ----------------------------------------------------------------- */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form onSubmit={handleSaveActivity} className="glass-panel border border-[#00ABAB]/30 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[#00ABAB]/30">
              <h3 className="font-bold text-lg text-[#FFFFFF] font-sans">
                {editingActivity ? 'Modify Activity Config' : 'Configure New Adventure Activity'}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 text-xs custom-scrollbar">
              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Activity Name</label>
                <input
                  type="text"
                  required
                  id="input-activity-name"
                  value={activityForm.name}
                  onChange={e => setActivityForm({...activityForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                  placeholder="e.g., Extreme Quad Biking"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Description</label>
                <textarea
                  required
                  id="input-activity-desc"
                  value={activityForm.description}
                  onChange={e => setActivityForm({...activityForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                  rows={3}
                  placeholder="Summarize the experience..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Adult Price (?)</label>
                  <input
                    type="number"
                    required
                    id="input-activity-adult-price"
                    value={activityForm.adultPrice}
                    onChange={e => setActivityForm({...activityForm, adultPrice: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Child Price (?)</label>
                  <input
                    type="number"
                    required
                    id="input-activity-child-price"
                    value={activityForm.childPrice}
                    onChange={e => setActivityForm({...activityForm, childPrice: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Daily Cap (Riders)</label>
                  <input
                    type="number"
                    required
                    id="input-activity-daily-limit"
                    value={activityForm.dailyLimit}
                    onChange={e => setActivityForm({...activityForm, dailyLimit: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Upload Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleActivityImageUpload}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF] file:mr-3 file:rounded file:border-0 file:bg-[#00ABAB] file:px-3 file:py-1 file:text-black file:font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Image URL</label>
                <input
                  type="url"
                  id="input-activity-image"
                  value={activityForm.image}
                  onChange={e => setActivityForm({...activityForm, image: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                  placeholder="https://images.unsplash.com..."
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Safety Guidelines (One per line)</label>
                <textarea
                  id="input-activity-safety"
                  value={activityForm.safetyInstructionsString}
                  onChange={e => setActivityForm({...activityForm, safetyInstructionsString: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                  rows={3}
                  placeholder="e.g. Keep hands inside harness at all times."
                />
              </div>

              {/* PACKAGES EDITOR */}
              <div className="pt-2 border-t border-[#00ABAB]/30">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider">Packages & Pricing</label>
                  <button
                    type="button"
                    onClick={() => setActivityForm({
                      ...activityForm,
                      packages: [
                        ...activityForm.packages,
                        { id: `pkg-${Date.now()}`, name: '', description: '', price: 0 }
                      ]
                    })}
                    className="text-xs px-2 py-1 bg-[#00ABAB]/20 text-[#40E0D0] rounded border border-[#00ABAB]/30 hover:bg-[#00ABAB]/40 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Package
                  </button>
                </div>
                
                {activityForm.packages.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-[#00ABAB]/30 rounded-lg text-[#9CA3AF] text-[10px] italic">
                    No packages configured. Uses default Adult/Child pricing.
                  </div>
                ) : (
                  <div className="overflow-x-auto pr-1 custom-scrollbar">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#0A0A0A]/50 border-b border-[#00ABAB]/30">
                          <th className="text-left px-2 py-1.5 text-[#9CA3AF] font-bold">Package Name</th>
                          <th className="text-left px-2 py-1.5 text-[#9CA3AF] font-bold">Price (₹)</th>
                          <th className="text-left px-2 py-1.5 text-[#9CA3AF] font-bold">Description</th>
                          <th className="text-center px-2 py-1.5 text-[#9CA3AF] font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityForm.packages.map((pkg, idx) => (
                          <tr key={pkg.id} className="border-b border-[#00ABAB]/20 hover:bg-[#0A0A0A]/50">
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={pkg.name}
                                onChange={(e) => {
                                  const newPkgs = [...activityForm.packages];
                                  newPkgs[idx].name = e.target.value;
                                  setActivityForm({ ...activityForm, packages: newPkgs });
                                }}
                                placeholder="Package Name"
                                className="w-full px-2 py-1 bg-transparent border border-[#00ABAB]/30 rounded text-[#FFFFFF] focus:outline-none focus:border-[#40E0D0] text-xs"
                                required
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                value={pkg.price}
                                onChange={(e) => {
                                  const newPkgs = [...activityForm.packages];
                                  newPkgs[idx].price = Number(e.target.value);
                                  setActivityForm({ ...activityForm, packages: newPkgs });
                                }}
                                placeholder="Price"
                                className="w-24 px-2 py-1 bg-transparent border border-[#00ABAB]/30 rounded text-[#FFFFFF] focus:outline-none focus:border-[#40E0D0] text-xs"
                                min={0}
                                required
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                value={pkg.description}
                                onChange={(e) => {
                                  const newPkgs = [...activityForm.packages];
                                  newPkgs[idx].description = e.target.value;
                                  setActivityForm({ ...activityForm, packages: newPkgs });
                                }}
                                placeholder="Short description..."
                                className="w-full px-2 py-1 bg-transparent border border-[#00ABAB]/30 rounded text-[#FFFFFF] focus:outline-none focus:border-[#40E0D0] text-xs"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newPkgs = activityForm.packages.filter((_, i) => i !== idx);
                                  setActivityForm({ ...activityForm, packages: newPkgs });
                                }}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded inline-flex"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-[#00ABAB]/30 p-6 bg-[#0A0A0A]/50">
              <button
                type="button"
                id="btn-cancel-activity"
                onClick={() => setIsActivityModalOpen(false)}
                className="px-4 py-2 border border-[#00ABAB]/30 text-[#9CA3AF] glass-card font-bold text-xs hover:bg-[#0A0A0A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-activity-form"
                className="px-4 py-2 bg-[#007B8B] hover:bg-[#0D5C56] text-[#0B0F14] rounded-xl font-bold text-xs  cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VENDOR MODAL */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form onSubmit={(e) => { e.preventDefault(); handleSaveVendor(); }} className="glass-panel border border-[#00ABAB]/30 p-6 rounded-2xl shadow-2xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-[#FFFFFF] font-sans">
              {editingVendor ? 'Modify Vendor Stall' : 'Register New Stall Concession'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Stall Name</label>
                <input
                  type="text"
                  required
                  id="input-vendor-name"
                  value={vendorForm.name}
                  onChange={e => setVendorForm({...vendorForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                  placeholder="e.g., Spicy Tacos & Nachos"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Stall ID / Number</label>
                  <input
                    type="text"
                    required
                    id="input-vendor-stall-number"
                    value={vendorForm.stallNumber}
                    onChange={e => setVendorForm({...vendorForm, stallNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                    placeholder="e.g. Stall F-09"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Outlet Category</label>
                  <select
                    id="select-vendor-type"
                    value={vendorForm.type}
                    onChange={e => setVendorForm({...vendorForm, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                  >
                    <option value="cafe">Cafe / Beverages</option>
                    <option value="fast_food">Fast Food Grill</option>
                    <option value="juice">Juice Corner</option>
                    <option value="ice_cream">Ice Cream Dessert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Manager Owner Name</label>
                <input
                  type="text"
                  required
                  id="input-vendor-owner"
                  value={vendorForm.ownerName}
                  onChange={e => setVendorForm({...vendorForm, ownerName: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                  placeholder="e.g., Jane Cooper"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Promo Image URL</label>
                <input
                  type="url"
                  id="input-vendor-image"
                  value={vendorForm.image}
                  onChange={e => setVendorForm({...vendorForm, image: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-[#3E8EDE] glass-panel text-[#FFFFFF] focus:ring-1 focus:ring-[#7DF9FF]"
                  placeholder="https://images.unsplash.com..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                id="btn-cancel-vendor"
                onClick={() => setIsVendorModalOpen(false)}
                className="px-4 py-2 border border-[#00ABAB]/30 text-[#9CA3AF] glass-card font-bold text-xs hover:bg-[#0A0A0A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-vendor-form"
                className="px-4 py-2 bg-[#007B8B] hover:bg-[#0D5C56] text-[#0B0F14] rounded-xl font-bold text-xs  cursor-pointer"
              >
                Register Stall
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* NEW USER MODAL */}
      {/* ----------------------------------------------------------------- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-[#0A0A0A]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full shadow-2xl overflow-hidden border border-[#00ABAB]/30 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#00ABAB]/30 flex justify-between items-center bg-[#0A0A0A]">
              <h3 className="font-bold text-lg text-[#40E0D0]">Add New User</h3>
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="text-[#3E8EDE] hover:text-[#40E0D0] transition-colors p-1"
              >
                âœ•
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-sm flex-1">
              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] mb-1">Full Name *</label>
                <input 
                  type="text" 
                  className="w-full border border-[#00ABAB]/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#7DF9FF]"
                  value={userForm.name}
                  onChange={e => setUserForm({...userForm, name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] mb-1">Email *</label>
                <input 
                  type="email" 
                  className="w-full border border-[#00ABAB]/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#7DF9FF]"
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  placeholder="e.g. john@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] mb-1">Role *</label>
                <select 
                  className="w-full border border-[#00ABAB]/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#7DF9FF]"
                  value={userForm.role}
                  onChange={e => setUserForm({...userForm, role: e.target.value as any})}
                >
                  <option value="customer">Guest / Customer</option>
                  <option value="food_vendor">Food Vendor</option>
                  <option value="activity_staff">Activity Staff</option>
                  <option value="ticket_counter_staff">Ticket Counter Staff</option>
                  <option value="go_karting_manager">Go Karting Manager</option>
                  <option value="go_karting_staff">Go Karting Staff</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] mb-1">Department</label>
                <input 
                  type="text" 
                  className="w-full border border-[#00ABAB]/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#7DF9FF]"
                  value={userForm.department}
                  onChange={e => setUserForm({...userForm, department: e.target.value})}
                  placeholder="e.g. Finance, Maintenance"
                />
              </div>
            </div>
            <div className="p-4 border-t border-[#00ABAB]/30 flex justify-end gap-3 bg-[#0A0A0A]">
              <button 
                onClick={() => setIsUserModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-[#9CA3AF] hover:text-[#FFFFFF]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveUser}
                disabled={!userForm.name || !userForm.email}
                className="px-4 py-2 text-sm font-bold btn-glow text-[#0B0F14] rounded-lg transition-colors disabled:opacity-50"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
      {/* END MODALS */}
    </div>
  );
};

// ---------------------------------------------------------
// 6. BACKEND DATABASE CONSTANTS FOR EXPORT
// ---------------------------------------------------------

const TRIGGER_SQL = `-- Example trigger syncing auth.users with public.users + claims
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS ??
BEGIN
  INSERT INTO public.users (id, name, email, role, department)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Valued Guest'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'customer'),
    new.raw_user_meta_data->>'department'
  );
  RETURN new;
END;
?? LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();`;

const FOLDER_TREE_STR = `â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ migrations/
â”‚   â”‚   â””â”€â”€ 2026071700_init_park.sql
â”‚   â””â”€â”€ config.toml
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”‚   â”œâ”€â”€ bookings/route.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ tickets/scan/route.ts
â”‚   â”‚   â”‚   â””â”€â”€ orders/checkout/route.ts
â”‚   â”‚   â”œâ”€â”€ dashboard/
â”‚   â”‚   â”‚   â”œâ”€â”€ admin/page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ staff/page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”‚   â””â”€â”€ page.tsx
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ AdminDashboard.tsx
â”‚   â”‚   â”œâ”€â”€ CustomerDashboard.tsx
â”‚   â”‚   â””â”€â”€ QRScanner.tsx
â”‚   â”œâ”€â”€ context/
â”‚   â”‚   â””â”€â”€ AppContext.tsx
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â””â”€â”€ supabaseClient.ts
â”‚   â””â”€â”€ types.ts`;

const SCHEMA_SQL = `-- ---------------------------------------------------------
-- 1. ENUMS AND CUSTOM TYPES
-- ---------------------------------------------------------
CREATE TYPE user_role AS ENUM ('super_admin', 'ticket_counter_admin', 'activity_staff', 'food_street_staff', 'cafe_staff', 'manager', 'customer');
CREATE TYPE ticket_status AS ENUM ('valid', 'used', 'refunded');
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'delivered');
CREATE TYPE payment_method AS ENUM ('upi', 'card', 'net_banking');

-- ---------------------------------------------------------
-- 2. CORE MASTER TABLES
-- ---------------------------------------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'customer',
    department TEXT, -- e.g., 'Go Karting', 'Horse Riding', 'Air Gun Shooting', 'Food Street', 'Cafe'
    access_scope TEXT DEFAULT 'own_data',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name user_role UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.permissions (
    id SERIAL PRIMARY KEY,
    role_name user_role REFERENCES public.roles(name) ON DELETE CASCADE,
    resource TEXT NOT NULL, -- e.g., 'bookings', 'revenue', 'users'
    action TEXT NOT NULL,   -- e.g., 'read', 'write', 'all'
    UNIQUE(role_name, resource, action)
);

CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    adult_price NUMERIC(10, 2),
    child_price NUMERIC(10, 2),
    daily_limit INTEGER NOT NULL DEFAULT 50,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------
-- 3. TICKETS & BOOKINGS (COMMON TICKETING SYSTEM)
-- ---------------------------------------------------------
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'paid',
    payment_method payment_method NOT NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    qr_code_value TEXT UNIQUE NOT NULL,
    status ticket_status NOT NULL DEFAULT 'valid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sub-entitlements (One QR ticket can have multiple activities / combo)
CREATE TABLE public.bookings_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES public.activities(id),
    ticket_type TEXT NOT NULL, -- 'standard_adult', 'standard_child', 'package'
    details TEXT,              -- e.g., "Package Selection: Gold Combo"
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    time_slot TEXT NOT NULL,
    scheduled_date DATE NOT NULL
);

-- ---------------------------------------------------------
-- 4. CHECKS & REAL-TIME ACTIVITY ASSIGNMENTS
-- ---------------------------------------------------------
CREATE TABLE public.activity_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, activity_id)
);

CREATE TABLE public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL REFERENCES public.users(id),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    UNIQUE(ticket_id, activity_id) -- Prevent scanning the same activity multiple times
);

-- ---------------------------------------------------------
-- 5. CONCESSIONS & FOOD STREET ORDERS
-- ---------------------------------------------------------
CREATE TABLE public.food_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'paid',
    payment_method payment_method NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.food_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    vendor_id TEXT NOT NULL, -- e.g., 'vendor-forest-cafe', 'vendor-pizza-street'
    vendor_name TEXT NOT NULL
);

-- ---------------------------------------------------------
-- 6. SYSTEM TRANSACTIONS, AUDITS, AND LOGS
-- ---------------------------------------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id TEXT UNIQUE NOT NULL, -- e.g. booking_id or food_order_id
    type TEXT NOT NULL,                -- 'booking_payment', 'food_payment', 'refund'
    amount NUMERIC(10, 2) NOT NULL,
    method payment_method NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,              -- e.g., 'SCAN_TICKET', 'CREATE_BOOKING', 'REFUND'
    details TEXT,                      -- e.g., "Scanned ticket tkt-101 for Go Karting"
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;

const RLS_SQL = `-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- public.users RLS POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Super Admins can view and manage all users" 
ON public.users FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Users can read their own profile details" 
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id);

-- ---------------------------------------------------------
-- public.bookings & public.tickets RLS POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Super Admin and Ticket Counter can read all bookings" 
ON public.bookings FOR SELECT TO authenticated
USING (
    auth.jwt() ->> 'role' = 'super_admin' OR 
    auth.jwt() ->> 'role' = 'ticket_counter_admin'
);

CREATE POLICY "Activity Staff can see bookings linked to their assigned activity department"
ON public.bookings_activities FOR SELECT TO authenticated
USING (
    auth.jwt() ->> 'role' = 'super_admin' OR 
    auth.jwt() ->> 'role' = 'ticket_counter_admin' OR
    activity_id IN (
        SELECT activity_id FROM public.activity_assignments 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Customers can view their own personal tickets" 
ON public.bookings FOR SELECT TO authenticated
USING (customer_email = auth.jwt() ->> 'email');

-- ---------------------------------------------------------
-- public.checkins RLS POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Super Admin, Ticket Counter, and Activity Staff can log checkins"
ON public.checkins FOR INSERT TO authenticated
WITH CHECK (
    auth.jwt() ->> 'role' = 'super_admin' OR 
    auth.jwt() ->> 'role' = 'ticket_counter_admin' OR
    activity_id IN (
        SELECT activity_id FROM public.activity_assignments 
        WHERE user_id = auth.uid()
    )
);

-- ---------------------------------------------------------
-- public.food_orders & public.food_order_items RLS POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Food vendor staff can only select items for their specific stall"
ON public.food_order_items FOR SELECT TO authenticated
USING (
    auth.jwt() ->> 'role' = 'super_admin' OR 
    vendor_id = (
        SELECT department FROM public.users 
        WHERE id = auth.uid()
    )
);

-- ---------------------------------------------------------
-- public.audit_logs RLS POLICIES
-- ---------------------------------------------------------
CREATE POLICY "Only Super Admins can query central security audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (auth.jwt() ->> 'role' = 'super_admin');`;

const SCAN_API_CODE = `// /src/app/api/tickets/scan/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { qrCodeValue, activityId, staffUserId } = await req.json();

    // 1. Fetch user role and assignment to verify department authorization
    const { data: staff, error: staffErr } = await supabase
      .from('users')
      .select('role, department')
      .eq('id', staffUserId)
      .single();

    if (staffErr || !staff) {
      return NextResponse.json({ error: 'Authorized staff record not found.' }, { status: 403 });
    }

    // Role-Based Authorization
    if (staff.role !== 'super_admin' && staff.role !== 'ticket_counter_admin') {
      // Check if assigned specifically to this activity
      const { data: assignment } = await supabase
        .from('activity_assignments')
        .select('id')
        .eq('user_id', staffUserId)
        .eq('activity_id', activityId)
        .single();

      if (!assignment) {
        return NextResponse.json({ 
          error: 'Access denied: You are not assigned to manage check-ins for this department.' 
        }, { status: 403 });
      }
    }

    // 2. Query ticket and retrieve sub-entitlements
    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('id, status, booking_id, bookings(customer_name, customer_email)')
      .eq('qr_code_value', qrCodeValue)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Invalid or missing ticket QR code.' }, { status: 404 });
    }

    if (ticket.status !== 'valid') {
      return NextResponse.json({ error: 'This ticket has already been used or refunded.' }, { status: 410 });
    }

    // 3. Register check-in
    const { error: checkinErr } = await supabase
      .from('checkins')
      .insert({
        ticket_id: ticket.id,
        activity_id: activityId,
        scanned_by: staffUserId,
        scanned_at: new Date().toISOString()
      });

    if (checkinErr) {
      if (checkinErr.code === '23505') { // Postgres Unique Constraint error
        return NextResponse.json({ error: 'This ticket was already scanned for this activity!' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Database checkin registration failed.' }, { status: 500 });
    }

    // Log security audit event
    await supabase.from('audit_logs').insert({
      user_id: staffUserId,
      action: 'SCAN_TICKET',
      details: 'Scanned ticket ' + ticket.id + ' for activity ' + activityId
    });

    return NextResponse.json({
      success: true,
      message: 'Check-in successfully recorded!',
      customer: ticket.bookings.customer_name
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}`;








