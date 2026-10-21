/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FoodStreetInventoryPanel
 * Comprehensive Food Street item-wise stock, purchases, movements, and reports component.
 * Can be embedded inside FoodVendorDashboard (for cafe/vendor staff) and AdminDashboard (Sub-Admin portal).
 */

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  InventoryItem, FoodStreetPurchaseRecord, StockMovement, 
  MenuItemRecipe, StockMovementType 
} from '../../types';
import { FoodStreetPurchaseModal } from './FoodStreetPurchaseModal';
import { computeCafeInventoryValuation, CafeDateFilterType } from '../../lib/cafeFinanceSync';
import { 
  Package, ShoppingCart, Plus, Edit, Trash2, CheckCircle, 
  AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, 
  FileText, Search, Filter, Download, Layers, ShieldAlert,
  Calendar, Check, X, Tag, Truck, History, IndianRupee, TrendingUp, DollarSign
} from 'lucide-react';

interface FoodStreetInventoryPanelProps {
  vendorIdFilter?: string; // Optional filter if vendor is selected
  isSubAdminPortal?: boolean;
  initialTab?: 'items' | 'purchases' | 'movements' | 'reports' | 'valuation';
}

export const FoodStreetInventoryPanel: React.FC<FoodStreetInventoryPanelProps> = ({
  vendorIdFilter,
  isSubAdminPortal = false,
  initialTab = 'items'
}) => {
  const { 
    vendors, inventory, foodStreetPurchases, stockMovements, menuItemRecipes,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    recordStockMovement, acceptPurchaseIntoStock, setMenuItemRecipe,
    menuItems, currentUser, orders
  } = useAppContext();

  // Active view tab inside inventory panel
  type ViewTab = 'items' | 'purchases' | 'movements' | 'reports' | 'valuation';
  const [valuationDateFilter, setValuationDateFilter] = useState<CafeDateFilterType>('all');
  const [customValuationStart, setCustomValuationStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [customValuationEnd, setCustomValuationEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<ViewTab>(initialTab);

  // Purchase modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Selected vendor
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorIdFilter || 'all');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');

  // Stock Adjustment / Consumption Modal State
  const [movementModalItem, setMovementModalItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<StockMovementType>('consumption');
  const [movementQty, setMovementQty] = useState<number>(1);
  const [movementReason, setMovementReason] = useState<string>('');

  // Item Create/Edit Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    category: 'Groceries & Grains',
    unit: 'kg',
    currentStock: 10,
    minStockLevel: 5,
    vendorId: vendors[0]?.id || 'vendor-forest-cafe',
    costPrice: 50
  });

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (selectedVendorId !== 'all' && item.vendorId !== selectedVendorId) return false;
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      
      const isOut = item.currentStock <= 0;
      const isLow = item.currentStock <= item.minStockLevel && item.currentStock > 0;
      if (stockStatusFilter === 'out' && !isOut) return false;
      if (stockStatusFilter === 'low' && !isLow) return false;
      if (stockStatusFilter === 'ok' && (isLow || isOut)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || 
               (item.category || '').toLowerCase().includes(q) ||
               (item.supplier || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [inventory, selectedVendorId, categoryFilter, stockStatusFilter, searchQuery]);

  // Filtered purchases list
  const filteredPurchases = useMemo(() => {
    return foodStreetPurchases.filter(p => {
      if (selectedVendorId !== 'all' && p.vendorId !== selectedVendorId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.itemName.toLowerCase().includes(q) || 
               p.supplierName.toLowerCase().includes(q) || 
               p.supplierInvoiceNumber.toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
  }, [foodStreetPurchases, selectedVendorId, searchQuery]);

  // Filtered movements list
  const filteredMovements = useMemo(() => {
    return stockMovements.filter(m => {
      if (selectedVendorId !== 'all' && m.vendorId !== selectedVendorId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return m.itemName.toLowerCase().includes(q) || (m.reason || '').toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [stockMovements, selectedVendorId, searchQuery]);

  // Inventory Categories
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach(i => { if (i.category) cats.add(i.category); });
    return Array.from(cats);
  }, [inventory]);

  // Summary Metrics
  const lowStockCount = useMemo(() => 
    inventory.filter(i => i.currentStock <= i.minStockLevel && i.currentStock > 0).length
  , [inventory]);

  const outOfStockCount = useMemo(() => 
    inventory.filter(i => i.currentStock <= 0).length
  , [inventory]);

  const totalInventoryValue = useMemo(() => 
    inventory.reduce((sum, i) => sum + (i.currentStock * (i.costPrice || i.lastPurchasePrice || 40)), 0)
  , [inventory]);

  const pendingReceiptCount = useMemo(() => 
    foodStreetPurchases.filter(p => p.status === 'pending_receipt').length
  , [foodStreetPurchases]);

  // Handle Manual Stock Movement (Consumption, Wastage, Adjustment)
  const handleRecordMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModalItem || movementQty <= 0) return;

    recordStockMovement({
      itemId: movementModalItem.id,
      vendorId: movementModalItem.vendorId,
      type: movementType,
      quantity: movementQty,
      reason: movementReason.trim() || `Manual ${movementType.replace('_', ' ')} entry by staff`,
      recordedBy: currentUser?.name || 'Food Street Staff'
    });

    setMovementModalItem(null);
    setMovementQty(1);
    setMovementReason('');
  };

  // Handle Add/Edit Inventory Item
  const handleSaveItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) return;

    if (editingItem) {
      updateInventoryItem({
        ...editingItem,
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit,
        currentStock: itemForm.currentStock,
        minStockLevel: itemForm.minStockLevel,
        vendorId: itemForm.vendorId,
        costPrice: itemForm.costPrice
      });
    } else {
      addInventoryItem({
        name: itemForm.name.trim(),
        category: itemForm.category,
        unit: itemForm.unit,
        currentStock: itemForm.currentStock,
        minStockLevel: itemForm.minStockLevel,
        vendorId: itemForm.vendorId,
        costPrice: itemForm.costPrice,
        openingStock: itemForm.currentStock,
        totalPurchased: 0,
        totalConsumed: 0,
        totalSold: 0,
        totalWasted: 0
      });
    }

    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  // CSV Export for Stock Reports
  const handleExportStockCSV = () => {
    const headers = [
      "Item ID", "Item Name", "Category", "Vendor Stall", "Opening Stock", 
      "Total Purchased", "Total Consumed", "Total Sold", "Total Wasted", 
      "Available Stock", "Unit", "Min Reorder Level", "Stock Status", 
      "Cost Price (INR)", "Inventory Valuation (INR)", "Last Supplier", "Last Purchase Date"
    ];

    const rows = filteredInventory.map(item => {
      const vendorName = vendors.find(v => v.id === item.vendorId)?.name || 'Central Cafe';
      const status = item.currentStock <= 0 ? 'Out of Stock' : item.currentStock <= item.minStockLevel ? 'Low Stock Alert' : 'Stock OK';
      const cost = item.costPrice || item.lastPurchasePrice || 0;
      const valuation = item.currentStock * cost;

      return [
        `"${item.id}"`,
        `"${item.name}"`,
        `"${item.category || 'General'}"`,
        `"${vendorName}"`,
        item.openingStock ?? item.currentStock,
        item.totalPurchased ?? 0,
        item.totalConsumed ?? 0,
        item.totalSold ?? 0,
        item.totalWasted ?? 0,
        item.currentStock,
        `"${item.unit}"`,
        item.minStockLevel,
        `"${status}"`,
        cost.toFixed(2),
        valuation.toFixed(2),
        `"${item.supplier || 'N/A'}"`,
        `"${item.lastPurchaseDate || 'N/A'}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `food_street_stock_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Financial valuation & stock ledger data computation
  const valuationData = useMemo(() => {
    return computeCafeInventoryValuation({
      menuItems,
      orders,
      foodStreetPurchases,
      stockMovements,
      vendors,
      dateFilterType: valuationDateFilter,
      customStartDate: customValuationStart,
      customEndDate: customValuationEnd,
      categoryFilter,
      itemSearch: searchQuery
    });
  }, [
    menuItems, orders, foodStreetPurchases, stockMovements, vendors,
    valuationDateFilter, customValuationStart, customValuationEnd,
    categoryFilter, searchQuery
  ]);

  const handleExportValuationCSV = () => {
    const headers = [
      "Date", "Item Name", "Category", "Unit", "Opening Stock", "Opening Stock Value",
      "Purchased Qty", "Purchase Rate (Wtd Avg)", "Purchase Amount",
      "Sold Qty", "Selling Rate", "Sales Amount", "COGS", "Gross Profit",
      "Balance Qty", "Balance Stock Amount", "Supplier", "Last Purchase Date"
    ];

    const rows = valuationData.items.map(item => [
      `"${item.lastPurchaseDate || new Date().toISOString().split('T')[0]}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.unit}"`,
      item.openingStock,
      item.openingStockValue.toFixed(2),
      item.purchasedQty,
      item.purchaseRate.toFixed(2),
      item.purchaseAmount.toFixed(2),
      item.soldQty,
      item.sellingRate.toFixed(2),
      item.salesAmount.toFixed(2),
      item.cogs.toFixed(2),
      item.grossProfit.toFixed(2),
      item.balanceQty,
      item.balanceStockAmount.toFixed(2),
      `"${item.supplierName || 'N/A'}"`,
      `"${item.lastPurchaseDate || 'N/A'}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `cafe_inventory_financial_valuation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Top Banner / Summary */}
      <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00ABAB]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ABAB]/15 border border-[#00ABAB]/30 text-[#40E0D0] text-xs font-mono font-bold uppercase">
            <Package className="w-3.5 h-3.5" /> Food Street Stock & Purchase Engine
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans tracking-tight">
            Item-Wise Inventory, Purchase Orders & Goods Receipt
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Automated synchronization between Sub-Admin purchase approvals, goods receipt verification, and live Food Street POS deductions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(0,171,171,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Purchase / Goods Receipt
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setItemForm({
                name: '',
                category: 'Groceries & Grains',
                unit: 'kg',
                currentStock: 10,
                minStockLevel: 5,
                vendorId: vendors[0]?.id || 'vendor-forest-cafe',
                costPrice: 50
              });
              setIsItemModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-teal-400 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-teal-400" /> New Inventory Item
          </button>
          <button
            onClick={activeTab === 'valuation' ? handleExportValuationCSV : handleExportStockCSV}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-teal-400 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export CSV Stock Report"
          >
            <Download className="w-4 h-4 text-[#40E0D0]" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl space-y-1">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Total Tracked Items</span>
          <div className="text-2xl font-black text-white">{inventory.length} materials</div>
          <span className="text-[10px] text-[#666] font-normal">Active stock catalog</span>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-amber-900/30 rounded-2xl space-y-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Low Stock Alerts
          </span>
          <div className="text-2xl font-black text-amber-400">{lowStockCount} items</div>
          <span className="text-[10px] text-amber-300/60 font-normal">At or below reorder level</span>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-rose-900/30 rounded-2xl space-y-1">
          <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Out of Stock
          </span>
          <div className="text-2xl font-black text-rose-400">{outOfStockCount} items</div>
          <span className="text-[10px] text-rose-300/60 font-normal">Requires immediate purchase</span>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-2xl space-y-1">
          <span className="text-[10px] text-[#40E0D0] font-bold uppercase tracking-wider block">Estimated Inventory Value</span>
          <div className="text-2xl font-black text-[#40E0D0]">₹{totalInventoryValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <span className="text-[10px] text-teal-400/60 font-normal">Valuation at unit cost</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#1C1C1C] gap-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'items'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> Available Stock Register ({inventory.length})
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'purchases'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Purchase Register & Invoices ({foodStreetPurchases.length})
          {pendingReceiptCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40">
              {pendingReceiptCount} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'movements'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <History className="w-4 h-4" /> Stock Movement Audit Trail ({stockMovements.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Reorder & Inventory Reports
        </button>

        <button
          onClick={() => setActiveTab('valuation')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'valuation'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <IndianRupee className="w-4 h-4 text-[#14F1D9]" /> Financial Valuation & Stock Ledger
        </button>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="glass-panel p-4 rounded-2xl border border-[#1C1C1C] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#666] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ingredient, item, supplier, category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl pl-9 pr-3.5 py-2 text-white text-xs outline-none"
            />
          </div>

          {!vendorIdFilter && (
            <select
              value={selectedVendorId}
              onChange={e => setSelectedVendorId(e.target.value)}
              className="bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none cursor-pointer"
            >
              <option value="all">All Vendor Outlets</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.stallNumber})</option>
              ))}
            </select>
          )}

          {activeTab === 'items' && (
            <>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={stockStatusFilter}
                onChange={e => setStockStatusFilter(e.target.value as any)}
                className="bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-xs outline-none cursor-pointer font-mono"
              >
                <option value="all">All Statuses</option>
                <option value="ok">✅ Stock OK</option>
                <option value="low">⚠️ Low Stock Alerts</option>
                <option value="out">🛑 Out of Stock</option>
              </select>
            </>
          )}
        </div>

        <div className="text-[11px] font-mono text-[#94A3B8]">
          {activeTab === 'items' && `${filteredInventory.length} items listed`}
          {activeTab === 'purchases' && `${filteredPurchases.length} purchases`}
          {activeTab === 'movements' && `${filteredMovements.length} audit movements`}
          {activeTab === 'valuation' && `${valuationData.items.length} valuation items audited`}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 1: AVAILABLE STOCK REGISTER                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'items' && (
        <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0A0A0A] text-[#94A3B8] font-mono font-bold border-b border-[#00ABAB]/30">
                  <th className="p-3.5">Material / Ingredient</th>
                  <th className="p-3.5">Stall Outlet</th>
                  <th className="p-3.5 text-right">Available Stock</th>
                  <th className="p-3.5 text-right">Min Reorder</th>
                  <th className="p-3.5">Stock Status</th>
                  <th className="p-3.5 text-right">Last Purchase Rate</th>
                  <th className="p-3.5 text-right">Valuation</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#94A3B8]">
                      No inventory items found matching your filters. Click <strong>"Record Purchase"</strong> to stock materials.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map(item => {
                    const isOut = item.currentStock <= 0;
                    const isLow = item.currentStock <= item.minStockLevel && !isOut;
                    const vendorName = vendors.find(v => v.id === item.vendorId)?.name || 'Central Cafe';
                    const unitRate = item.costPrice || item.lastPurchasePrice || 40;
                    const valuation = item.currentStock * unitRate;

                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-white flex items-center gap-2">
                            {item.name}
                            {item.category && (
                              <span className="px-2 py-0.5 rounded text-[9px] bg-white/5 border border-white/10 text-teal-300">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#666] font-mono mt-0.5">
                            ID: {item.id} {item.supplier && `• Supplier: ${item.supplier}`}
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-[#94A3B8]">
                          {vendorName}
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-sm">
                          <span className={isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-[#14F1D9]'}>
                            {item.currentStock} {item.unit}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono text-[#94A3B8]">
                          {item.minStockLevel} {item.unit}
                        </td>

                        <td className="p-3.5">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <AlertTriangle className="w-3 h-3" /> Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                              <ShieldAlert className="w-3 h-3" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" /> Available
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-mono text-white">
                          ₹{unitRate.toFixed(2)} / {item.unit}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-[#40E0D0]">
                          ₹{valuation.toFixed(2)}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setMovementModalItem(item);
                                setMovementType('consumption');
                                setMovementQty(1);
                                setMovementReason('');
                              }}
                              className="px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold transition-all cursor-pointer"
                              title="Record Issue / Consumption / Wastage"
                            >
                              Issue / Adjust
                            </button>

                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setItemForm({
                                  name: item.name,
                                  category: item.category || 'Groceries & Grains',
                                  unit: item.unit,
                                  currentStock: item.currentStock,
                                  minStockLevel: item.minStockLevel,
                                  vendorId: item.vendorId,
                                  costPrice: item.costPrice || item.lastPurchasePrice || 50
                                });
                                setIsItemModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-white/10 text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                              title="Edit Item Master"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Delete "${item.name}" from inventory?`)) {
                                  deleteInventoryItem(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-rose-900/40 text-rose-400 hover:bg-rose-900/30 transition-colors cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 2: PURCHASE REGISTER & INVOICES                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'purchases' && (
        <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0A0A0A] text-[#94A3B8] font-mono font-bold border-b border-[#00ABAB]/30">
                  <th className="p-3.5">Invoice / Date</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Material Name</th>
                  <th className="p-3.5 text-right">Qty Purchased</th>
                  <th className="p-3.5 text-right">Qty Received</th>
                  <th className="p-3.5 text-right">Accepted Stock</th>
                  <th className="p-3.5 text-right">Total (incl. GST)</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Goods Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-[#94A3B8]">
                      No purchase entries recorded yet. Click <strong>"Record Purchase / Goods Receipt"</strong> to submit supplier bills.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(p => {
                    const isPending = p.status === 'pending_receipt';
                    const isPartial = p.paymentStatus === 'Partially Paid';
                    const isUnpaid = p.paymentStatus === 'Unpaid';

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-white">{p.supplierInvoiceNumber}</div>
                          <div className="text-[10px] text-[#666]">{p.purchaseDate}</div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-white">{p.supplierName}</div>
                          <div className="text-[10px] text-[#888] font-mono">ID: {p.id.slice(-8)}</div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-[#14F1D9]">{p.itemName}</span>
                          <span className="text-[10px] text-[#94A3B8] block">{p.itemCategory}</span>
                        </td>

                        <td className="p-3.5 text-right font-mono text-white">
                          {p.quantityPurchased} {p.unit}
                        </td>

                        <td className="p-3.5 text-right font-mono text-white">
                          {p.quantityReceived} {p.unit}
                          {p.quantityRejected > 0 && (
                            <span className="text-rose-400 text-[10px] block">
                              (-{p.quantityRejected} damaged)
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                          {p.quantityAccepted} {p.unit}
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-white">
                          ₹{p.totalPurchaseValue.toFixed(2)}
                          <span className="text-[9px] text-teal-400 block font-normal">
                            (GST: ₹{p.gstAmount.toFixed(2)})
                          </span>
                        </td>

                        <td className="p-3.5 font-mono">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            p.paymentStatus === 'Paid'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                              : isPartial
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                              : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                          }`}>
                            {p.paymentStatus}
                          </span>
                          <span className="text-[9px] text-[#666] block mt-0.5">{p.paymentMethod}</span>
                        </td>

                        <td className="p-3.5">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <Calendar className="w-3 h-3" /> Awaiting Receipt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" /> Stock Credited
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          {isPending && (
                            <button
                              onClick={() => {
                                const res = acceptPurchaseIntoStock(p.id, p.quantityAccepted);
                                alert(res.message);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold text-[10px] cursor-pointer hover:opacity-90 shadow-sm"
                            >
                              Accept into Stock
                            </button>
                          )}
                          {!isPending && (
                            <span className="text-[10px] font-mono text-[#666]">
                              Posted to Finance
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 3: STOCK MOVEMENT AUDIT TRAIL                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'movements' && (
        <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#050816] z-10 border-b border-[#00ABAB]/30">
                <tr className="bg-[#0A0A0A] text-[#94A3B8] font-mono font-bold">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Movement Type</th>
                  <th className="p-3.5">Item Name</th>
                  <th className="p-3.5 text-right">Qty Changed</th>
                  <th className="p-3.5 text-right">Prev Stock</th>
                  <th className="p-3.5 text-right">New Stock</th>
                  <th className="p-3.5">Recorded By</th>
                  <th className="p-3.5">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C] font-mono">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#94A3B8]">
                      No stock movement audit records yet. Movements are logged automatically on purchase receipts, POS sales, and manual issues.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    const isAdd = m.type === 'purchase_receipt' || m.type === 'adjustment_add';
                    return (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 text-[#94A3B8]">
                          {new Date(m.timestamp).toLocaleString()}
                        </td>

                        <td className="p-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            m.type === 'purchase_receipt'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                              : m.type === 'sale_deduction'
                              ? 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                              : m.type === 'consumption'
                              ? 'bg-teal-950/60 text-teal-300 border-teal-800/60'
                              : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                          }`}>
                            {m.type.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold text-white font-sans">
                          {m.itemName}
                        </td>

                        <td className={`p-3.5 text-right font-black ${isAdd ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isAdd ? '+' : '-'}{m.quantity} {m.unit}
                        </td>

                        <td className="p-3.5 text-right text-[#666]">
                          {m.previousStock} {m.unit}
                        </td>

                        <td className="p-3.5 text-right font-bold text-[#14F1D9]">
                          {m.newStock} {m.unit}
                        </td>

                        <td className="p-3.5 text-[#94A3B8] font-sans">
                          {m.recordedBy}
                        </td>

                        <td className="p-3.5 text-[#888] font-sans truncate max-w-xs" title={m.reason}>
                          {m.reason || 'Routine movement'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 4: REORDER & INVENTORY REPORTS                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Low Stock Items Requiring Reorder */}
            <div className="glass-panel p-6 rounded-3xl border border-amber-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-amber-400 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Recommended Reorder List ({lowStockCount + outOfStockCount} Items)
                </h3>
                <span className="text-[10px] font-mono text-[#94A3B8]">Automatic Calculation</span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Materials currently below the configured minimum safety stock level. Recommended purchase quantities calculated to bring stock to 3x minimum level.
              </p>

              <div className="overflow-y-auto max-h-[300px] border border-[#1C1C1C] rounded-2xl divide-y divide-[#1C1C1C] text-xs font-mono">
                {inventory.filter(i => i.currentStock <= i.minStockLevel).length === 0 ? (
                  <div className="p-8 text-center text-emerald-400 font-bold">
                    ✅ All inventory items are currently above safety reorder thresholds!
                  </div>
                ) : (
                  inventory.filter(i => i.currentStock <= i.minStockLevel).map(item => {
                    const suggestedOrderQty = Math.max(item.minStockLevel * 3 - item.currentStock, item.minStockLevel * 2);
                    return (
                      <div key={item.id} className="p-3.5 flex justify-between items-center hover:bg-white/5 transition-colors">
                        <div>
                          <div className="font-bold text-white font-sans">{item.name}</div>
                          <div className="text-[10px] text-[#666]">
                            Available: <strong className="text-rose-400">{item.currentStock} {item.unit}</strong> • Min Threshold: {item.minStockLevel} {item.unit}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-[#94A3B8] block">Suggested Order:</span>
                          <span className="text-sm font-bold text-amber-400">
                            {suggestedOrderQty} {item.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top Consumed Materials */}
            <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-[#40E0D0] flex items-center gap-2">
                  <Layers className="w-5 h-5" /> Stock Consumption & Wastage Summary
                </h3>
                <span className="text-[10px] font-mono text-[#94A3B8]">Lifetime Audited</span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Cumulative material utilization across Food Street dining orders, kitchen preparation issues, and damaged goods.
              </p>

              <div className="overflow-y-auto max-h-[300px] border border-[#1C1C1C] rounded-2xl divide-y divide-[#1C1C1C] text-xs font-mono">
                {inventory.map(item => {
                  const consumed = (item.totalConsumed || 0) + (item.totalSold || 0);
                  const wasted = item.totalWasted || 0;
                  return (
                    <div key={item.id} className="p-3.5 flex justify-between items-center hover:bg-white/5 transition-colors">
                      <div>
                        <div className="font-bold text-white font-sans">{item.name}</div>
                        <div className="text-[10px] text-[#888]">
                          Total Consumed / Sold: <strong className="text-teal-300">{consumed} {item.unit}</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-rose-400 block">
                          Wastage / Damaged: {wasted} {item.unit}
                        </span>
                        <span className="text-[10px] text-[#666] block">
                          Available: {item.currentStock} {item.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 5: FINANCIAL VALUATION & STOCK LEDGER                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          {/* Date Filter & Control Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-[#00ABAB]/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-[#94A3B8] font-bold uppercase tracking-wider flex items-center gap-1.5 mr-2">
                <Calendar className="w-3.5 h-3.5 text-[#00ABAB]" /> Valuation Period:
              </span>
              {[
                { key: 'all', label: 'All Time' },
                { key: 'today', label: 'Today' },
                { key: 'yesterday', label: 'Yesterday' },
                { key: 'this_week', label: 'This Week' },
                { key: 'this_month', label: 'This Month' },
                { key: 'custom', label: 'Custom Range' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setValuationDateFilter(f.key as CafeDateFilterType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                    valuationDateFilter === f.key
                      ? 'bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black shadow-[0_0_12px_rgba(0,171,171,0.4)]'
                      : 'bg-white/5 border border-white/10 text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              {valuationDateFilter === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={customValuationStart}
                    onChange={e => setCustomValuationStart(e.target.value)}
                    className="bg-[#141414] border border-[#262626] rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:border-[#00ABAB] outline-none"
                  />
                  <span className="text-xs text-[#666]">to</span>
                  <input
                    type="date"
                    value={customValuationEnd}
                    onChange={e => setCustomValuationEnd(e.target.value)}
                    className="bg-[#141414] border border-[#262626] rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:border-[#00ABAB] outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
              <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-[#40E0D0]">
                Method: Weighted-Average Cost
              </span>
              <span>As of Date: <strong className="text-white">{valuationData.asOfDate}</strong></span>
            </div>
          </div>

          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <div className="p-4 bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-[#40E0D0] font-bold uppercase tracking-wider block">Balance Stock Value</span>
              <div className="text-xl font-black text-[#40E0D0]">₹{valuationData.summary.totalClosingStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <span className="text-[9px] text-[#888] font-normal">{valuationData.summary.totalClosingBalanceQty} total units asset</span>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-blue-900/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">Potential Retail</span>
              <div className="text-xl font-black text-blue-400">₹{valuationData.summary.totalPotentialRetailValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <span className="text-[9px] text-blue-300/60 font-normal">At selling price</span>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-emerald-900/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Net Sales</span>
              <div className="text-xl font-black text-emerald-400">₹{valuationData.summary.totalNetSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <span className="text-[9px] text-emerald-300/60 font-normal">{valuationData.summary.totalSoldQty} units sold</span>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-amber-900/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">COGS</span>
              <div className="text-xl font-black text-amber-400">₹{valuationData.summary.totalCogs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <span className="text-[9px] text-amber-300/60 font-normal">Cost of goods sold</span>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-teal-900/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-teal-300 font-bold uppercase tracking-wider block">Gross Profit</span>
              <div className="text-xl font-black text-teal-300">₹{valuationData.summary.totalGrossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <span className="text-[9px] text-teal-300/60 font-normal">Margin: {valuationData.summary.overallGrossMarginPercent}%</span>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-purple-900/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Total Purchases</span>
              <div className="text-xl font-black text-purple-400">₹{valuationData.summary.totalPurchaseAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
              <span className="text-[9px] text-purple-300/60 font-normal">Unpaid: ₹{valuationData.summary.totalOutstandingPurchases.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Item-Wise Financial Valuation & Stock Ledger Table */}
          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
            <div className="p-4 bg-[#0A0A0A] border-b border-[#1C1C1C] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-[#14F1D9]" /> Cafe Menu Item Inventory & Financial Valuation Ledger
                </h3>
                <p className="text-[11px] text-[#94A3B8]">
                  Date | Item Name | Opening Stock | Purchased Qty | Purchase Rate | Purchase Amount | Sold Qty | Selling Rate | Sales Amount | Balance Qty | Balance Stock Amount
                </p>
              </div>
              <button
                onClick={handleExportValuationCSV}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-teal-400 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#40E0D0]" /> Export Valuation CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#0D0D0D] text-[#94A3B8] text-[10px] uppercase font-bold border-b border-[#1C1C1C]">
                    <th className="p-3">Date</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3 text-right">Opening Stock</th>
                    <th className="p-3 text-right">Purchased Qty</th>
                    <th className="p-3 text-right">Purchase Rate</th>
                    <th className="p-3 text-right">Purchase Amount</th>
                    <th className="p-3 text-right">Sold Qty</th>
                    <th className="p-3 text-right">Selling Rate</th>
                    <th className="p-3 text-right">Sales Amount</th>
                    <th className="p-3 text-right text-[#14F1D9]">Balance Qty</th>
                    <th className="p-3 text-right text-[#40E0D0]">Balance Stock Amount</th>
                    <th className="p-3 text-right text-emerald-400">Gross Profit</th>
                    <th className="p-3">Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {valuationData.items.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-12 text-center text-[#94A3B8]">
                        No cafe menu inventory records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    valuationData.items.map(item => {
                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-[11px] text-[#94A3B8] whitespace-nowrap">
                            {item.lastPurchaseDate || valuationData.asOfDate}
                          </td>
                          <td className="p-3 font-sans">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {item.name}
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-teal-300">
                                {item.unit}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#666] font-mono">
                              Cat: {item.category}
                            </div>
                          </td>
                          <td className="p-3 text-right text-white">
                            {item.openingStock}
                          </td>
                          <td className="p-3 text-right text-purple-300 font-bold">
                            {item.purchasedQty}
                          </td>
                          <td className="p-3 text-right text-white">
                            ₹{item.purchaseRate.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-purple-300">
                            ₹{item.purchaseAmount.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-amber-400 font-bold">
                            {item.soldQty}
                          </td>
                          <td className="p-3 text-right text-white">
                            ₹{item.sellingRate.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-amber-400">
                            ₹{item.salesAmount.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-black text-sm text-[#14F1D9]">
                            {item.balanceQty} {item.unit}
                          </td>
                          <td className="p-3 text-right font-black text-[#40E0D0]">
                            ₹{item.balanceStockAmount.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-400">
                            ₹{item.grossProfit.toFixed(2)}
                            <span className="block text-[9px] text-emerald-300/70">
                              ({item.grossMarginPercent}%)
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-[#94A3B8] font-sans">
                            {item.supplierName}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="border-t-2 border-[#00ABAB]/40 bg-[#0A0A0A] font-bold">
                  <tr className="text-white text-xs">
                    <td className="p-3" colSpan={2}>CONSOLIDATED TOTAL</td>
                    <td className="p-3 text-right">
                      {valuationData.items.reduce((s, i) => s + i.openingStock, 0)}
                    </td>
                    <td className="p-3 text-right text-purple-300">
                      {valuationData.summary.totalPurchasedQty}
                    </td>
                    <td className="p-3 text-right text-[#888]">—</td>
                    <td className="p-3 text-right text-purple-300">
                      ₹{valuationData.summary.totalPurchaseAmount.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-amber-400">
                      {valuationData.summary.totalSoldQty}
                    </td>
                    <td className="p-3 text-right text-[#888]">—</td>
                    <td className="p-3 text-right text-amber-400">
                      ₹{valuationData.summary.totalNetSales.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-[#14F1D9] font-black">
                      {valuationData.summary.totalClosingBalanceQty}
                    </td>
                    <td className="p-3 text-right text-[#40E0D0] font-black">
                      ₹{valuationData.summary.totalClosingStockValue.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-emerald-400 font-black">
                      ₹{valuationData.summary.totalGrossProfit.toFixed(2)}
                    </td>
                    <td className="p-3 text-[#94A3B8] text-[10px]">
                      {valuationData.items.length} items
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECORD STOCK MOVEMENT (ISSUE / WASTAGE / ADJUSTMENT)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {movementModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-3">
              <h3 className="font-bold text-base text-white">
                Record Stock Issue / Adjustment
              </h3>
              <button onClick={() => setMovementModalItem(null)} className="text-[#666] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#141414] rounded-xl font-mono text-xs space-y-1">
              <div className="text-white font-bold">{movementModalItem.name}</div>
              <div className="text-[#94A3B8]">
                Current Available: <strong className="text-[#14F1D9]">{movementModalItem.currentStock} {movementModalItem.unit}</strong>
              </div>
            </div>

            <form onSubmit={handleRecordMovementSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">Adjustment Type *</label>
                <select
                  value={movementType}
                  onChange={e => setMovementType(e.target.value as StockMovementType)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                >
                  <option value="consumption">🥣 Kitchen Issue / Preparation Consumption</option>
                  <option value="wastage">🗑️ Spoilage / Wastage</option>
                  <option value="damaged">⚠️ Damaged Goods</option>
                  <option value="return_to_supplier">↩️ Return to Supplier</option>
                  <option value="adjustment_add">➕ Physical Audit Stock Gain (+)</option>
                  <option value="adjustment_sub">➖ Physical Audit Stock Loss (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">
                  Quantity ({movementModalItem.unit}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={movementQty}
                  onChange={e => setMovementQty(Number(e.target.value) || 0)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white text-sm outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1 font-sans">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Daily shift cooking issue, Expired dairy, Count adjustment"
                  value={movementReason}
                  onChange={e => setMovementReason(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1C1C1C]">
                <button
                  type="button"
                  onClick={() => setMovementModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-[#262626] text-[#94A3B8] font-sans font-bold hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-sans font-bold cursor-pointer"
                >
                  Record Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / EDIT INVENTORY ITEM                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-3">
              <h3 className="font-bold text-base text-white">
                {editingItem ? 'Edit Inventory Item' : 'New Food Street Material'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-[#666] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice, Milk, Cooking Oil"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                  >
                    <option value="Groceries & Grains">Groceries & Grains</option>
                    <option value="Cooking Oil & Ghee">Cooking Oil & Ghee</option>
                    <option value="Flour & Bakery Items">Flour & Bakery Items</option>
                    <option value="Vegetables & Fresh Produce">Vegetables & Fresh Produce</option>
                    <option value="Dairy & Milk Products">Dairy & Milk Products</option>
                    <option value="Beverages & Soft Drinks">Beverages & Soft Drinks</option>
                    <option value="Tea & Coffee">Tea & Coffee</option>
                    <option value="Snacks & Packaged Foods">Snacks & Packaged Foods</option>
                    <option value="Disposables & Packaging">Disposables & Packaging</option>
                    <option value="Cleaning & Kitchen Supplies">Cleaning & Kitchen Supplies</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">Unit</label>
                  <select
                    value={itemForm.unit}
                    onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="litre">litre</option>
                    <option value="ml">ml</option>
                    <option value="packet">packet</option>
                    <option value="bottle">bottle</option>
                    <option value="piece">piece</option>
                    <option value="box">box</option>
                    <option value="bag">bag</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={itemForm.currentStock}
                    onChange={e => setItemForm({ ...itemForm, currentStock: Number(e.target.value) || 0 })}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">Min Reorder</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={itemForm.minStockLevel}
                    onChange={e => setItemForm({ ...itemForm, minStockLevel: Number(e.target.value) || 0 })}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">Cost Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={itemForm.costPrice}
                    onChange={e => setItemForm({ ...itemForm, costPrice: Number(e.target.value) || 0 })}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">Stall / Vendor Outlet</label>
                <select
                  value={itemForm.vendorId}
                  onChange={e => setItemForm({ ...itemForm, vendorId: e.target.value })}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.stallNumber})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1C1C1C]">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#262626] text-[#94A3B8] font-bold hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold cursor-pointer"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: SUB-ADMIN FOOD STREET PURCHASE ENTRY                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <FoodStreetPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        defaultVendorId={selectedVendorId !== 'all' ? selectedVendorId : vendors[0]?.id}
      />

    </div>
  );
};
