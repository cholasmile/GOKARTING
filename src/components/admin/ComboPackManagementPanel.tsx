/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DEUCE - Admin Multi-Activity Combo Pack Management Panel
 */

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ComboPack, ComboActivityItem, ComboRedemptionRecord, Activity } from '../../types';
import { INITIAL_COMBO_PACKS } from '../../data/initialData';
import { 
  Package, Plus, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, 
  Search, Filter, Calendar, TrendingUp, IndianRupee, Layers, 
  Check, ArrowRight, ShieldCheck, Clock, Download, Copy, Eye,
  Sparkles, RefreshCw, User, Phone, Tag
} from 'lucide-react';

export const ComboPackManagementPanel: React.FC = () => {
  const { 
    activities, 
    comboPacks, 
    comboRedemptions, 
    addComboPack, 
    updateComboPack, 
    deleteComboPack, 
    setComboPackActive,
    redeemComboActivity,
    adjustComboRedemption,
    currentUser,
    bookings,
    payments
  } = useAppContext();

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'create' | 'redemptions' | 'reports'>('catalog');

  // Search & Filters in catalog
  const [catalogSearch, setCatalogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Editing state for create/edit form
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [comboName, setComboName] = useState('');
  const [comboDescription, setComboDescription] = useState('');
  const [comboPrice, setComboPrice] = useState<number>(999);
  const [validityDays, setValidityDays] = useState<number>(30);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [comboImage, setComboImage] = useState<string>('');
  const [comboBadge, setComboBadge] = useState<string>('Best Value');

  // Items builder for combo
  const [comboItems, setComboItems] = useState<ComboActivityItem[]>([
    {
      activityId: activities[0]?.id || 'act-go-karting',
      activityName: activities[0]?.name || 'Go-Karting',
      packageId: activities[0]?.packages?.[0]?.id || '',
      packageName: activities[0]?.packages?.[0]?.name || 'Single Kart (5 Laps)',
      quantity: 1,
      unitOrDuration: '5 Laps',
      originalPrice: activities[0]?.packages?.[0]?.price || 350
    },
    {
      activityId: activities[1]?.id || 'act-air-gun',
      activityName: activities[1]?.name || 'Air Rifle Shooting',
      packageId: activities[1]?.packages?.[0]?.id || '',
      packageName: activities[1]?.packages?.[0]?.name || 'Starter Aim (10 Shots)',
      quantity: 1,
      unitOrDuration: '10 Shots',
      originalPrice: activities[1]?.packages?.[0]?.price || 250
    }
  ]);

  // Form validation error
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Redemptions tab state
  const [redemptionSearch, setRedemptionSearch] = useState('');
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState<'all' | 'pending' | 'partially_redeemed' | 'completed'>('all');
  const [redemptionActivityFilter, setRedemptionActivityFilter] = useState<string>('all');
  
  // Correction modal state
  const [selectedRedemptionForCorrection, setSelectedRedemptionForCorrection] = useState<ComboRedemptionRecord | null>(null);
  const [correctionNewQuantity, setCorrectionNewQuantity] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [auditLogViewRecord, setAuditLogViewRecord] = useState<ComboRedemptionRecord | null>(null);

  // Calculate original total for current combo builder form
  const formOriginalTotal = useMemo(() => {
    return comboItems.reduce((sum, item) => sum + (Number(item.originalPrice || 0) * (item.quantity || 1)), 0);
  }, [comboItems]);

  const formSavings = Math.max(0, formOriginalTotal - comboPrice);
  const formSavingsPercent = formOriginalTotal > 0 ? Math.round((formSavings / formOriginalTotal) * 100) : 0;

  // ── Combo Item Handlers ──
  const handleAddComboItem = () => {
    const act = activities[0];
    if (!act) return;
    const pkg = act.packages?.[0];
    setComboItems(prev => [
      ...prev,
      {
        activityId: act.id,
        activityName: act.name,
        packageId: pkg?.id || '',
        packageName: pkg?.name || 'Standard Session',
        quantity: 1,
        unitOrDuration: '1 Session',
        originalPrice: pkg?.price || act.adultPrice || 100
      }
    ]);
  };

  const handleUpdateComboItem = (index: number, updates: Partial<ComboActivityItem>) => {
    setComboItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleActivitySelectChange = (index: number, activityId: string) => {
    const act = activities.find(a => a.id === activityId);
    if (!act) return;
    const firstPkg = act.packages?.[0];
    handleUpdateComboItem(index, {
      activityId: act.id,
      activityName: act.name,
      packageId: firstPkg?.id || '',
      packageName: firstPkg?.name || 'Standard Session',
      unitOrDuration: firstPkg?.name || '1 Session',
      originalPrice: firstPkg?.price || act.adultPrice || 100
    });
  };

  const handlePackageSelectChange = (index: number, packageId: string) => {
    const item = comboItems[index];
    const act = activities.find(a => a.id === item.activityId);
    if (!act || !act.packages) return;
    const pkg = act.packages.find(p => p.id === packageId);
    if (pkg) {
      handleUpdateComboItem(index, {
        packageId: pkg.id,
        packageName: pkg.name,
        unitOrDuration: pkg.name,
        originalPrice: pkg.price
      });
    }
  };

  const handleRemoveComboItem = (index: number) => {
    if (comboItems.length <= 1) {
      alert('A Combo Pack must have at least one activity item.');
      return;
    }
    setComboItems(prev => prev.filter((_, i) => i !== index));
  };

  // ── Start Edit Combo ──
  const handleStartEdit = (pack: ComboPack) => {
    setEditingComboId(pack.id);
    setComboName(pack.name);
    setComboDescription(pack.description);
    setComboPrice(pack.comboPrice);
    setValidityDays(pack.validityDays || 30);
    setIsActive(pack.isActive);
    setComboImage(pack.image || '');
    setComboBadge(pack.badge || '');
    setComboItems([...pack.items]);
    setFormError(null);
    setFormSuccess(null);
    setActiveSubTab('create');
  };

  const handleResetForm = () => {
    setEditingComboId(null);
    setComboName('');
    setComboDescription('');
    setComboPrice(999);
    setValidityDays(30);
    setIsActive(true);
    setComboImage('');
    setComboBadge('Best Value');
    setFormError(null);
    setFormSuccess(null);
    if (activities.length >= 2) {
      setComboItems([
        {
          activityId: activities[0].id,
          activityName: activities[0].name,
          packageId: activities[0].packages?.[0]?.id || '',
          packageName: activities[0].packages?.[0]?.name || 'Single Session',
          quantity: 1,
          unitOrDuration: '1 Session',
          originalPrice: activities[0].packages?.[0]?.price || activities[0].adultPrice || 250
        },
        {
          activityId: activities[1].id,
          activityName: activities[1].name,
          packageId: activities[1].packages?.[0]?.id || '',
          packageName: activities[1].packages?.[0]?.name || 'Single Session',
          quantity: 1,
          unitOrDuration: '1 Session',
          originalPrice: activities[1].packages?.[0]?.price || activities[1].adultPrice || 200
        }
      ]);
    }
  };

  const handleDuplicateCombo = (pack: ComboPack) => {
    addComboPack({
      name: `${pack.name} (Copy)`,
      description: pack.description,
      items: JSON.parse(JSON.stringify(pack.items)),
      originalPrice: pack.originalPrice,
      comboPrice: pack.comboPrice,
      validityDays: pack.validityDays,
      isActive: true,
      image: pack.image,
      badge: 'Special Offer'
    });
  };

  // ── Save or Update Combo ──
  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!comboName.trim()) {
      setFormError('Please enter a combo pack name.');
      return;
    }
    if (comboItems.length < 2) {
      setFormError('A combo pack must contain at least 2 activity entitlements.');
      return;
    }
    if (comboPrice <= 0) {
      setFormError('Please enter a valid selling price greater than ₹0.');
      return;
    }

    if (editingComboId) {
      const existing = comboPacks.find(c => c.id === editingComboId);
      if (existing) {
        await updateComboPack(editingComboId, {
          name: comboName.trim(),
          description: comboDescription.trim(),
          items: comboItems,
          originalPrice: formOriginalTotal,
          comboPrice: Number(comboPrice),
          validityDays: Number(validityDays || 30),
          isActive,
          image: comboImage.trim(),
          badge: comboBadge.trim()
        });
        setFormSuccess(`Combo Pack "${comboName}" updated successfully!`);
      }
    } else {
      await addComboPack({
        name: comboName.trim(),
        description: comboDescription.trim(),
        items: comboItems,
        originalPrice: formOriginalTotal,
        comboPrice: Number(comboPrice),
        validityDays: Number(validityDays || 30),
        isActive,
        image: comboImage.trim(),
        badge: comboBadge.trim()
      });
      setFormSuccess(`New Combo Pack "${comboName}" created successfully!`);
    }

    setTimeout(() => {
      setActiveSubTab('catalog');
      handleResetForm();
    }, 1200);
  };

  // ── Admin Correction for Redemptions ──
  const handleConfirmCorrection = () => {
    if (!selectedRedemptionForCorrection) return;
    if (!correctionReason.trim()) {
      alert('Please enter an audit reason for modifying this redemption record.');
      return;
    }

    const res = adjustComboRedemption({
      redemptionId: selectedRedemptionForCorrection.id,
      newRedeemedQuantity: Number(correctionNewQuantity),
      performedBy: currentUser?.name || 'Administrator',
      reason: correctionReason.trim()
    });

    if (res.success) {
      alert(res.message);
      setSelectedRedemptionForCorrection(null);
      setCorrectionReason('');
    } else {
      alert(res.message);
    }
  };

  const catalogPacks = (comboPacks && comboPacks.length > 0) ? comboPacks : INITIAL_COMBO_PACKS;

  // ── Filtered Catalog ──
  const filteredCatalog = useMemo(() => {
    return catalogPacks.filter(pack => {
      const term = (catalogSearch || '').toLowerCase();
      const matchesSearch = 
        (pack.name || '').toLowerCase().includes(term) ||
        (pack.description || '').toLowerCase().includes(term) ||
        (pack.items || []).some(i => (i.activityName || '').toLowerCase().includes(term));

      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && pack.isActive !== false) ||
        (statusFilter === 'inactive' && pack.isActive === false);

      return matchesSearch && matchesStatus;
    });
  }, [catalogPacks, catalogSearch, statusFilter]);

  // ── Filtered Redemptions ──
  const filteredRedemptions = useMemo(() => {
    return comboRedemptions.filter(rec => {
      const matchesSearch = 
        rec.ticketId.toLowerCase().includes(redemptionSearch.toLowerCase()) ||
        rec.customerName.toLowerCase().includes(redemptionSearch.toLowerCase()) ||
        (rec.customerPhone || '').toLowerCase().includes(redemptionSearch.toLowerCase()) ||
        rec.comboPackName.toLowerCase().includes(redemptionSearch.toLowerCase()) ||
        rec.activityName.toLowerCase().includes(redemptionSearch.toLowerCase());

      const matchesStatus = 
        redemptionStatusFilter === 'all' || rec.status === redemptionStatusFilter;

      const matchesActivity = 
        redemptionActivityFilter === 'all' || rec.activityId === redemptionActivityFilter;

      return matchesSearch && matchesStatus && matchesActivity;
    });
  }, [comboRedemptions, redemptionSearch, redemptionStatusFilter, redemptionActivityFilter]);

  // ── Reporting Calculations ──
  const comboBookings = useMemo(() => {
    return bookings.filter(b => b.isComboPack || b.ticketType === 'combo_pack' || b.ticketType === 'combo_package');
  }, [bookings]);

  const totalComboRevenue = useMemo(() => {
    return comboBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  }, [comboBookings]);

  const totalComboPacksSold = useMemo(() => {
    return comboBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + (b.quantity || 1), 0);
  }, [comboBookings]);

  const completedRedemptionsCount = useMemo(() => {
    return comboRedemptions.filter(r => r.status === 'completed').length;
  }, [comboRedemptions]);

  const pendingRedemptionsCount = useMemo(() => {
    return comboRedemptions.filter(r => r.status === 'pending' || r.status === 'partially_redeemed').length;
  }, [comboRedemptions]);

  // Pack-wise Breakdown
  const packWiseStats = useMemo(() => {
    const stats: Record<string, { name: string; count: number; revenue: number }> = {};
    comboBookings.filter(b => b.paymentStatus === 'paid').forEach(b => {
      const key = b.comboPackId || b.comboPackName || b.activityName || 'Standard Combo';
      if (!stats[key]) {
        stats[key] = {
          name: b.comboPackName || b.activityName || 'Combo Pack',
          count: 0,
          revenue: 0
        };
      }
      stats[key].count += b.quantity || 1;
      stats[key].revenue += b.totalAmount || 0;
    });
    return Object.values(stats);
  }, [comboBookings]);

  // Activity-wise Usage from Combos
  const activityUsageStats = useMemo(() => {
    const stats: Record<string, { activityName: string; totalIssued: number; redeemed: number }> = {};
    comboRedemptions.forEach(r => {
      if (!stats[r.activityId]) {
        stats[r.activityId] = {
          activityName: r.activityName,
          totalIssued: 0,
          redeemed: 0
        };
      }
      stats[r.activityId].totalIssued += r.totalQuantity;
      stats[r.activityId].redeemed += r.redeemedQuantity;
    });
    return Object.values(stats);
  }, [comboRedemptions]);

  // Export report to CSV
  const handleExportCSV = () => {
    const rows = [
      ['Ticket ID', 'Booking ID', 'Customer Name', 'Phone', 'Combo Pack', 'Activity', 'Total Qty', 'Redeemed Qty', 'Remaining', 'Status', 'Date'],
      ...filteredRedemptions.map(r => [
        r.ticketId,
        r.bookingId,
        r.customerName,
        r.customerPhone || 'N/A',
        r.comboPackName,
        r.activityName,
        r.totalQuantity,
        r.redeemedQuantity,
        r.remainingQuantity,
        r.status,
        new Date(r.createdAt).toLocaleDateString()
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(item => `"${item}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DEUCE_Combo_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-[#14F1D9]/30 relative overflow-hidden bg-gradient-to-r from-[#050816] via-[#0A1628] to-[#050816]">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#14F1D9]/15 text-[#14F1D9] border border-[#14F1D9]/30 text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full font-mono">
                ★ Admin Enterprise Module
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full font-mono">
                Realtime Sync Active
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] via-[#14F1D9] to-[#00B4FF]">
              Multi-Activity Combo Pack Management
            </h2>
            <p className="text-[#CBD5E1] text-xs max-w-xl font-medium mt-1">
              Combine more than two park activities into unified packages with custom pricing, manage tickets, track redemptions, and view sales reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleResetForm();
                setActiveSubTab('create');
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(20,241,217,0.3)] hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create New Combo Pack
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#14F1D9]/20 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'catalog'
              ? 'bg-[#14F1D9] text-black font-black shadow-[0_0_15px_rgba(20,241,217,0.4)]'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
          }`}
        >
          <Package className="w-4 h-4" /> Active Combo Packs ({catalogPacks.length})
        </button>

        <button
          onClick={() => {
            if (activeSubTab !== 'create' && !editingComboId) handleResetForm();
            setActiveSubTab('create');
          }}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'create'
              ? 'bg-[#14F1D9] text-black font-black shadow-[0_0_15px_rgba(20,241,217,0.4)]'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
          }`}
        >
          <Plus className="w-4 h-4" /> {editingComboId ? 'Edit Combo Pack' : 'Create Combo Pack'}
        </button>

        <button
          onClick={() => setActiveSubTab('redemptions')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'redemptions'
              ? 'bg-[#14F1D9] text-black font-black shadow-[0_0_15px_rgba(20,241,217,0.4)]'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Redemption & Usage Tracking ({comboRedemptions.length})
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-4 py-2.5 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'bg-[#14F1D9] text-black font-black shadow-[0_0_15px_rgba(20,241,217,0.4)]'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Combo Reports & Analytics
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. CATALOG SUBTAB                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          {/* Search & Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search combo packs or activities..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-[#94A3B8] font-bold">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-[#0A0A0A] border border-white/10 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none"
              >
                <option value="all">All ({catalogPacks.length})</option>
                <option value="active">Active Only ({catalogPacks.filter(p => p.isActive !== false).length})</option>
                <option value="inactive">Disabled ({catalogPacks.filter(p => p.isActive === false).length})</option>
              </select>
            </div>
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center border border-dashed border-white/15 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-[#94A3B8]">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No Combo Packs Found</h3>
              <p className="text-xs text-[#94A3B8] max-w-sm mx-auto">
                {catalogSearch ? 'No combo packs match your search query.' : 'Create your first multi-activity combo pack to offer bundled tickets at the sales counter.'}
              </p>
              <button
                onClick={() => {
                  handleResetForm();
                  setActiveSubTab('create');
                }}
                className="px-5 py-2.5 bg-[#14F1D9] text-black font-bold text-xs rounded-xl hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Combo Pack Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCatalog.map(pack => {
                const savings = Math.max(0, pack.originalPrice - pack.comboPrice);
                const savingsPct = pack.originalPrice > 0 ? Math.round((savings / pack.originalPrice) * 100) : 0;

                return (
                  <div
                    key={pack.id}
                    className={`glass-panel rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative group ${
                      pack.isActive 
                        ? 'border-[#14F1D9]/40 hover:border-[#14F1D9] shadow-[0_0_20px_rgba(20,241,217,0.1)]' 
                        : 'border-white/10 opacity-70'
                    }`}
                  >
                    <div>
                      {/* Top Header Card */}
                      <div className="p-5 pb-3">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#14F1D9]/15 text-[#14F1D9] border border-[#14F1D9]/30">
                            {pack.badge || 'Multi-Activity Combo'}
                          </span>
                          <button
                            onClick={() => setComboPackActive(pack.id, !pack.isActive)}
                            title={pack.isActive ? 'Click to disable' : 'Click to activate'}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                              pack.isActive 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/40'
                            }`}
                          >
                            {pack.isActive ? '● ACTIVE' : '○ DISABLED'}
                          </button>
                        </div>

                        <h3 className="text-lg font-black text-white">{pack.name}</h3>
                        <p className="text-xs text-[#94A3B8] line-clamp-2 mt-1">{pack.description || 'Custom multi-activity adventure combo pass.'}</p>
                      </div>

                      {/* Included Activities Breakdown Table */}
                      <div className="px-5 py-3 bg-[#0A0A0A]/60 border-t border-b border-white/5 space-y-2">
                        <span className="text-[10px] font-mono font-bold text-[#14F1D9] uppercase tracking-wider block">
                          Included Activities ({pack.items.length})
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {pack.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs text-slate-300 py-0.5 border-b border-white/5">
                              <div>
                                <span className="font-bold text-white">{item.activityName}</span>
                                <span className="text-[10px] text-[#94A3B8] ml-1.5 font-mono">({item.unitOrDuration})</span>
                              </div>
                              <span className="font-mono text-[11px] text-[#94A3B8]">
                                ₹{item.originalPrice * (item.quantity || 1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & Actions */}
                    <div className="p-5 pt-3 space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-[10px] text-[#94A3B8] line-through block font-mono">
                            Original: ₹{pack.originalPrice}
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-[#14F1D9] font-mono">
                              ₹{pack.comboPrice}
                            </span>
                            <span className="text-xs text-[#94A3B8]">/ ticket</span>
                          </div>
                        </div>

                        {savings > 0 && (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black font-mono">
                            SAVE ₹{savings} ({savingsPct}%)
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 border-t border-white/10">
                        <button
                          onClick={() => handleStartEdit(pack)}
                          className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDuplicateCombo(pack)}
                          title="Duplicate combo pack"
                          className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete combo pack "${pack.name}"?`)) {
                              deleteComboPack(pack.id);
                            }
                          }}
                          title="Delete combo pack"
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. CREATE / EDIT COMBO PACK SUBTAB                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'create' && (
        <form onSubmit={handleSaveCombo} className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#14F1D9]/30 space-y-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-[#14F1D9]" />
                {editingComboId ? `Edit Combo Pack: ${comboName}` : 'Create New Multi-Activity Combo Pack'}
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Configure package name, combine more than two activities with specific duration/laps, and set combo price.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editingComboId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-[#14F1D9] border border-[#14F1D9]/30 transition-all cursor-pointer"
                >
                  + Switch to New
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleResetForm();
                  setActiveSubTab('catalog');
                }}
                className="text-xs font-mono text-[#94A3B8] hover:text-white cursor-pointer px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-xl flex items-center gap-2 text-xs text-red-400 font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-400 font-bold">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-white block mb-1">
                Combo Pack Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DEUCE Ultimate Adventure Pack, Family Fun Pack"
                value={comboName}
                onChange={e => setComboName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0A0A0A] border border-white/15 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white block mb-1">Badge / Tagline (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Best Value, Weekend Special, Most Popular"
                value={comboBadge}
                onChange={e => setComboBadge(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0A0A0A] border border-white/15 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-white block mb-1">Package Description</label>
              <textarea
                rows={2}
                placeholder="Describe what is included in this combo pass..."
                value={comboDescription}
                onChange={e => setComboDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0A0A0A] border border-white/15 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none resize-none"
              />
            </div>
          </div>

          {/* Included Activities Builder */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#14F1D9]" /> Activity Entitlements ({comboItems.length})
                </h4>
                <p className="text-xs text-[#94A3B8]">Select activities, package option, quantity, and duration (e.g. 5 laps, 10 shots).</p>
              </div>

              <button
                type="button"
                onClick={handleAddComboItem}
                className="px-3.5 py-1.5 bg-[#14F1D9]/15 text-[#14F1D9] border border-[#14F1D9]/40 hover:bg-[#14F1D9] hover:text-black rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Activity
              </button>
            </div>

            <div className="space-y-3">
              {comboItems.map((item, idx) => {
                const act = activities.find(a => a.id === item.activityId);
                const hasPkgs = act?.packages && act.packages.length > 0;

                return (
                  <div key={idx} className="p-4 bg-[#0A0A0A] border border-white/10 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-[#14F1D9] uppercase tracking-wider">
                        Activity #{idx + 1}
                      </span>
                      {comboItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveComboItem(idx)}
                          className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Activity Selector */}
                      <div>
                        <label className="text-[10px] font-mono text-[#94A3B8] block mb-1">Select Activity</label>
                        <select
                          value={item.activityId}
                          onChange={e => handleActivitySelectChange(idx, e.target.value)}
                          className="w-full px-2.5 py-2 bg-[#121A24] border border-white/15 rounded-lg text-xs text-white focus:border-[#14F1D9] outline-none font-bold"
                        >
                          {activities.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Package Option */}
                      <div>
                        <label className="text-[10px] font-mono text-[#94A3B8] block mb-1">Package / Tier</label>
                        {hasPkgs ? (
                          <select
                            value={item.packageId || ''}
                            onChange={e => handlePackageSelectChange(idx, e.target.value)}
                            className="w-full px-2.5 py-2 bg-[#121A24] border border-white/15 rounded-lg text-xs text-white focus:border-[#14F1D9] outline-none"
                          >
                            {act!.packages!.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Standard Session"
                            value={item.packageName || ''}
                            onChange={e => handleUpdateComboItem(idx, { packageName: e.target.value })}
                            className="w-full px-2.5 py-2 bg-[#121A24] border border-white/15 rounded-lg text-xs text-white focus:border-[#14F1D9] outline-none"
                          />
                        )}
                      </div>

                      {/* Quantity & Duration */}
                      <div>
                        <label className="text-[10px] font-mono text-[#94A3B8] block mb-1">Duration / Laps / Shots</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 5 Laps, 10 Shots, 1 Ride"
                          value={item.unitOrDuration}
                          onChange={e => handleUpdateComboItem(idx, { unitOrDuration: e.target.value })}
                          className="w-full px-2.5 py-2 bg-[#121A24] border border-white/15 rounded-lg text-xs text-white focus:border-[#14F1D9] outline-none font-bold"
                        />
                      </div>

                      {/* Individual Price */}
                      <div>
                        <label className="text-[10px] font-mono text-[#94A3B8] block mb-1">Original Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.originalPrice}
                          onChange={e => handleUpdateComboItem(idx, { originalPrice: Number(e.target.value) })}
                          className="w-full px-2.5 py-2 bg-[#121A24] border border-white/15 rounded-lg text-xs text-white font-mono font-bold focus:border-[#14F1D9] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing & Savings Summary Card */}
          <div className="p-5 bg-gradient-to-r from-[#00ABAB]/10 via-[#0A0A0A] to-[#00B4FF]/10 border border-[#14F1D9]/40 rounded-2xl space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-[#14F1D9]" /> Pricing & Value Calculation
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-[#0A0A0A] border border-white/10 rounded-xl">
                <span className="text-[10px] text-[#94A3B8] font-mono uppercase block">Total Original Price</span>
                <span className="text-xl font-black text-white font-mono">₹{formOriginalTotal}</span>
                <span className="text-[10px] text-[#94A3B8] block mt-0.5">Sum of individual activities</span>
              </div>

              <div className="p-3 bg-[#0A0A0A] border border-[#14F1D9]/50 rounded-xl">
                <label className="text-[10px] text-[#14F1D9] font-mono uppercase block font-bold">
                  Special Combo Price (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={comboPrice}
                  onChange={e => setComboPrice(Number(e.target.value))}
                  className="w-full mt-1 bg-transparent text-2xl font-black text-[#14F1D9] font-mono outline-none"
                />
              </div>

              <div className="p-3 bg-[#0A0A0A] border border-emerald-500/30 rounded-xl">
                <span className="text-[10px] text-emerald-400 font-mono uppercase block">Guest Savings</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {formSavings > 0 ? `₹${formSavings} (${formSavingsPercent}%)` : '₹0'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Attractive bundled discount</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-white block mb-1">Validity (Days from Purchase)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={validityDays}
                  onChange={e => setValidityDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-[#0A0A0A] border border-white/15 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="chk-combo-active"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#14F1D9] rounded cursor-pointer"
                />
                <label htmlFor="chk-combo-active" className="text-xs font-bold text-white cursor-pointer">
                  Enable Combo Pack in Sales Counter Immediately
                </label>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setActiveSubTab('catalog');
              }}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-black rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-95 shadow-[0_0_20px_rgba(20,241,217,0.35)] transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> {editingComboId ? 'Update Combo Pack' : 'Save & Publish Combo Pack'}
            </button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. REDEMPTION & USAGE TRACKING SUBTAB                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'redemptions' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Ticket ID, Customer, Phone, or Activity..."
                value={redemptionSearch}
                onChange={e => setRedemptionSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <select
                value={redemptionActivityFilter}
                onChange={e => setRedemptionActivityFilter(e.target.value)}
                className="px-3 py-1.5 bg-[#0A0A0A] border border-white/10 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none"
              >
                <option value="all">All Activities</option>
                {activities.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <select
                value={redemptionStatusFilter}
                onChange={e => setRedemptionStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-[#0A0A0A] border border-white/10 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none"
              >
                <option value="all">All Statuses ({comboRedemptions.length})</option>
                <option value="pending">Pending ({comboRedemptions.filter(r => r.status === 'pending').length})</option>
                <option value="partially_redeemed">Partially Used ({comboRedemptions.filter(r => r.status === 'partially_redeemed').length})</option>
                <option value="completed">Completed ({comboRedemptions.filter(r => r.status === 'completed').length})</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> CSV Export
              </button>
            </div>
          </div>

          {filteredRedemptions.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center border border-dashed border-white/15 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-[#94A3B8]">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white">No Redemption Records Found</h4>
              <p className="text-xs text-[#94A3B8]">
                When guests purchase combo packs or package bundles at the sales counter, individual redemption records will appear here for gate staff and audit tracking.
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#0A0A0A] text-[#94A3B8] font-mono uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="p-3.5">Ticket / Token</th>
                      <th className="p-3.5">Guest & Contact</th>
                      <th className="p-3.5">Combo Pack</th>
                      <th className="p-3.5">Activity Entitlement</th>
                      <th className="p-3.5">Redemption Progress</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRedemptions.map(record => {
                      const pct = record.totalQuantity > 0 
                        ? Math.round((record.redeemedQuantity / record.totalQuantity) * 100) 
                        : 0;

                      return (
                        <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-3.5 font-mono font-bold text-[#14F1D9]">
                            {record.ticketId}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-white">{record.customerName}</div>
                            <div className="text-[10px] text-[#94A3B8] font-mono">{record.customerPhone || 'N/A'}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-200">{record.comboPackName}</span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-white">{record.activityName}</div>
                            <div className="text-[10px] text-[#14F1D9] font-mono">{record.unitOrDuration || record.packageName || '1 Session'}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-bold text-white">
                                {record.redeemedQuantity} / {record.totalQuantity}
                              </span>
                              <span className="text-[10px] text-[#94A3B8]">
                                ({record.remainingQuantity} left)
                              </span>
                            </div>
                            <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${record.status === 'completed' ? 'bg-emerald-400' : 'bg-[#14F1D9]'}`} 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              record.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : record.status === 'partially_redeemed'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              {record.status === 'completed' ? '✓ Completed' : record.status === 'partially_redeemed' ? 'Partially Used' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {record.remainingQuantity > 0 && (
                                <button
                                  onClick={() => {
                                    const res = redeemComboActivity({
                                      redemptionId: record.id,
                                      quantityToRedeem: 1,
                                      staffName: currentUser?.name || 'Admin',
                                      note: 'Counter / Admin Portal Manual Redemption'
                                    });
                                    alert(res.message);
                                  }}
                                  className="px-2.5 py-1 bg-[#14F1D9] text-black font-bold text-[10px] rounded hover:opacity-90 transition-all cursor-pointer"
                                  title="Mark 1 unit redeemed"
                                >
                                  Redeem 1
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedRedemptionForCorrection(record);
                                  setCorrectionNewQuantity(record.redeemedQuantity);
                                  setCorrectionReason('');
                                }}
                                className="p-1 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white rounded text-[10px] cursor-pointer"
                                title="Admin Audit / Correct Quantity"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setAuditLogViewRecord(record)}
                                className="p-1 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white rounded text-[10px] cursor-pointer"
                                title="View History & Audit Trail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. REPORTS SUBTAB                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-[#14F1D9]/30 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#94A3B8] font-bold">Total Combo Revenue</span>
              <div className="text-2xl font-black text-[#14F1D9] font-mono">
                ₹{totalComboRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Included in consolidated revenue</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#94A3B8] font-bold">Total Combo Packs Sold</span>
              <div className="text-2xl font-black text-white font-mono">
                {totalComboPacksSold} Packs
              </div>
              <span className="text-[10px] text-slate-400">Paid customer bookings</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 space-y-1">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Completed Redemptions</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {completedRedemptionsCount}
              </div>
              <span className="text-[10px] text-slate-400">Activities fully used at gates</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 space-y-1">
              <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">Pending Entitlements</span>
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {pendingRedemptionsCount}
              </div>
              <span className="text-[10px] text-slate-400">Awaiting park gate check-in</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Combo Pack-Wise Performance */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#14F1D9]" /> Combo Pack-Wise Sales Breakdown
              </h4>

              {packWiseStats.length === 0 ? (
                <p className="text-xs text-[#94A3B8] italic">No combo pack sales recorded yet today.</p>
              ) : (
                <div className="space-y-3">
                  {packWiseStats.map((stat, idx) => (
                    <div key={idx} className="p-3 bg-[#0A0A0A] rounded-xl border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-white block">{stat.name}</span>
                        <span className="text-[10px] text-[#94A3B8] font-mono">{stat.count} sold</span>
                      </div>
                      <span className="text-sm font-mono font-bold text-[#14F1D9]">
                        ₹{stat.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity-Wise Usage From Combos */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Activity-Wise Usage from Combo Packs
              </h4>

              {activityUsageStats.length === 0 ? (
                <p className="text-xs text-[#94A3B8] italic">No activity redemptions recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {activityUsageStats.map((stat, idx) => {
                    const usageRate = stat.totalIssued > 0 ? Math.round((stat.redeemed / stat.totalIssued) * 100) : 0;
                    return (
                      <div key={idx} className="p-3 bg-[#0A0A0A] rounded-xl border border-white/5 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{stat.activityName}</span>
                          <span className="font-mono text-[#94A3B8]">
                            {stat.redeemed} / {stat.totalIssued} used ({usageRate}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${usageRate}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Admin Correction with Audit Log ── */}
      {selectedRedemptionForCorrection && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-amber-500/40 max-w-md w-full space-y-4 bg-[#0A0A0A]">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h4 className="text-base font-bold text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Authorized Redemption Adjustment
              </h4>
              <button
                onClick={() => setSelectedRedemptionForCorrection(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300">
                Ticket: <strong className="text-white font-mono">{selectedRedemptionForCorrection.ticketId}</strong>
              </p>
              <p className="text-slate-300">
                Activity: <strong className="text-[#14F1D9]">{selectedRedemptionForCorrection.activityName}</strong> ({selectedRedemptionForCorrection.unitOrDuration})
              </p>
              <p className="text-slate-300">
                Total Entitlement: <strong className="text-white">{selectedRedemptionForCorrection.totalQuantity}</strong>
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-white block mb-1">
                New Redeemed Quantity (0 to {selectedRedemptionForCorrection.totalQuantity}):
              </label>
              <input
                type="number"
                min="0"
                max={selectedRedemptionForCorrection.totalQuantity}
                value={correctionNewQuantity}
                onChange={e => setCorrectionNewQuantity(Math.min(selectedRedemptionForCorrection.totalQuantity, Math.max(0, Number(e.target.value))))}
                className="w-full px-3 py-2 bg-[#121A24] border border-white/20 rounded-xl text-white font-mono font-bold focus:border-[#14F1D9] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-white block mb-1">
                Mandatory Audit Reason <span className="text-red-400">*</span>:
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Erroneous scan by turnstile marshal, customer granted re-entry"
                value={correctionReason}
                onChange={e => setCorrectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#121A24] border border-white/20 rounded-xl text-xs text-white focus:border-[#14F1D9] outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setSelectedRedemptionForCorrection(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCorrection}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg"
              >
                Confirm Audit Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: View History & Audit Logs ── */}
      {auditLogViewRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-white/20 max-w-lg w-full space-y-4 bg-[#0A0A0A] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#14F1D9]" /> Redemption History & Audit Logs
              </h4>
              <button
                onClick={() => setAuditLogViewRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div>Ticket ID: <span className="font-mono text-[#14F1D9] font-bold">{auditLogViewRecord.ticketId}</span></div>
              <div>Customer: <span className="font-bold text-white">{auditLogViewRecord.customerName}</span></div>
              <div>Activity: <span className="font-bold text-white">{auditLogViewRecord.activityName}</span></div>
              <div>Progress: <span className="font-mono text-emerald-400 font-bold">{auditLogViewRecord.redeemedQuantity} / {auditLogViewRecord.totalQuantity} used</span></div>
            </div>

            {/* Check-In History */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono uppercase font-bold text-[#14F1D9] block">
                Turnstile Check-In History ({auditLogViewRecord.history?.length || 0})
              </span>
              {(!auditLogViewRecord.history || auditLogViewRecord.history.length === 0) ? (
                <p className="text-xs text-[#94A3B8] italic">No check-in events recorded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {auditLogViewRecord.history.map((h, i) => (
                    <div key={i} className="p-2 bg-white/5 rounded-lg text-xs flex justify-between items-center">
                      <div>
                        <span className="text-emerald-400 font-bold">+{h.quantityRedeemed} Entry</span> by {h.scannedBy}
                        {h.note && <span className="text-[#94A3B8] block text-[10px]">{h.note}</span>}
                      </div>
                      <span className="text-[10px] text-[#94A3B8] font-mono">
                        {new Date(h.scannedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Audit Adjustments */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block">
                Admin Audit Corrections ({auditLogViewRecord.auditLogs?.length || 0})
              </span>
              {(!auditLogViewRecord.auditLogs || auditLogViewRecord.auditLogs.length === 0) ? (
                <p className="text-xs text-[#94A3B8] italic">No administrative corrections made.</p>
              ) : (
                <div className="space-y-1.5">
                  {auditLogViewRecord.auditLogs.map((a, i) => (
                    <div key={i} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-400 font-bold">{a.action}</span>
                        <span className="text-[10px] text-[#94A3B8] font-mono">{new Date(a.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-white text-[11px]">{a.details}</p>
                      <span className="text-[10px] text-slate-400 block">Performed by: {a.performedBy}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setAuditLogViewRecord(null)}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ComboPackManagementPanel;
