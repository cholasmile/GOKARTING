/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MenuItem, InventoryItem, FoodOrder } from '../types';
import { printTicket } from '../lib/printTicket';
import { BulkAddMenuModal } from './BulkAddMenuModal';
import { FoodStreetInventoryPanel } from './admin/FoodStreetInventoryPanel';
import { 
  Plus, Edit, Trash2, Check, X, ShieldAlert, 
  Utensils, Clipboard, Package, ShoppingBag, 
  Eye, TrendingUp, RefreshCw, CreditCard, Search, CheckCircle, Printer, Coffee,
  Receipt, Calendar, FileText, Download
} from 'lucide-react';

export const FoodVendorDashboard: React.FC = () => {
  const { 
    vendors, menuItems, inventory, orders, selectedVendorId, setSelectedVendorId,
    addMenuItem, updateMenuItem, deleteMenuItem, updateInventoryStock, updateOrderStatus,
    foodCart, addToFoodCart, removeFromFoodCart, clearFoodCart, submitFoodOrder,
    updateMenuItemStock, adjustMenuItemStock
  } = useAppContext();

  // Bulk add modal state
  const [isBulkMenuModalOpen, setIsBulkMenuModalOpen] = useState(false);

  // Find currently selected vendor details
  const currentVendor = vendors.find(v => v.id === selectedVendorId) || vendors[0];

  // Active dashboard view (Default to 'pos' for Food Street Retail POS Billing)
  const [vendorTab, setVendorTab] = useState<'pos' | 'history' | 'menu' | 'inventory'>('pos');

  // Staff POS Billing Cart state
  const [posCart, setPosCart] = useState<Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    vendorId: string;
    vendorName: string;
  }>>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('all');
  const [posCustomerName, setPosCustomerName] = useState('Walk-in Guest');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posCustomerEmail, setPosCustomerEmail] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [isPosSubmitting, setIsPosSubmitting] = useState(false);
  const [generatedBillOrder, setGeneratedBillOrder] = useState<FoodOrder | null>(null);

  // Sales History filter states
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState('all');
  const [historyViewOrder, setHistoryViewOrder] = useState<FoodOrder | null>(null);

  // Form states for creating/editing menu items
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: 5.0,
    purchasePrice: 3.0,
    category: 'Beverages',
    vendorId: vendors[0]?.id || 'vendor-forest-cafe',
    image: '',
    stockQuantity: 50,
    isAvailable: true
  });

  // Menu catalog filters
  const [menuCatalogSearch, setMenuCatalogSearch] = useState('');
  const [menuCatalogVendorFilter, setMenuCatalogVendorFilter] = useState('all');
  const [menuCatalogCategoryFilter, setMenuCatalogCategoryFilter] = useState('all');
  const [menuCatalogViewMode, setMenuCatalogViewMode] = useState<'table' | 'grid'>('table');

  // Restock amount
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);

  // Filter food items and ingredients matching currently selected vendor
  const stallMenuItems = currentVendor ? menuItems.filter(m => m.vendorId === currentVendor.id) : menuItems;
  const stallInventory = currentVendor ? inventory.filter(i => i.vendorId === currentVendor.id) : [];

  // Filter orders containing items from this vendor
  const stallOrders = currentVendor 
    ? orders.filter(order => order.items.some(item => item.vendorId === currentVendor.id))
    : [];

  // Calculate stall sales performance
  const getStallPerformance = () => {
    let sales = 0;
    let orderCount = 0;

    if (currentVendor) {
      stallOrders.forEach(o => {
        if (o.paymentStatus === 'paid') {
          const stallItems = o.items.filter(i => i.vendorId === currentVendor.id);
          const stallTotal = stallItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
          sales += stallTotal;
          orderCount++;
        }
      });
    }


    return { sales, orderCount };
  };

  const { sales, orderCount } = getStallPerformance();

  // POS Billing Helper Functions
  const filteredPosMenuItems = stallMenuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(posSearch.toLowerCase()) || 
                          item.description.toLowerCase().includes(posSearch.toLowerCase());
    const matchesCat = posCategoryFilter === 'all' || item.category === posCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const addToPosCart = (item: MenuItem) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        return prev.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        vendorId: item.vendorId,
        vendorName: currentVendor?.name || 'Deuce Cafe'
      }];
    });
  };

  const updatePosQty = (menuItemId: string, delta: number) => {
    setPosCart(prev => {
      return prev.map(item => {
        if (item.menuItemId === menuItemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as typeof prev;
    });
  };

  // 5% GST Inclusive of MRP
  const posGrandTotal = Math.round(posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 100) / 100;
  const posSubtotal = Math.round((posGrandTotal / 1.05) * 100) / 100;
  const posGst = Math.round((posGrandTotal - posSubtotal) * 100) / 100;
  const posCgst = Math.round((posGst / 2) * 100) / 100;
  const posSgst = Math.round((posGst - posCgst) * 100) / 100;

  const handleStaffGenerateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (posCart.length === 0 || isPosSubmitting) return;
    setIsPosSubmitting(true);

    try {
      clearFoodCart();
      posCart.forEach(item => {
        const mItem = menuItems.find(m => m.id === item.menuItemId);
        if (mItem) {
          addToFoodCart(mItem, item.quantity);
        }
      });

      const order = submitFoodOrder({
        customerName: posCustomerName.trim() || 'Walk-in Guest',
        customerEmail: posCustomerEmail.trim() || 'guest@deucepark.com',
        customerPhone: posCustomerPhone.trim() || undefined,
        paymentMethod: posPaymentMethod
      });

      setGeneratedBillOrder(order);
      setPosCart([]);
      setPosCustomerName('Walk-in Guest');
      setPosCustomerPhone('');
      setPosCustomerEmail('');
    } catch (err: any) {
      alert(err.message || 'Failed to generate bill.');
    } finally {
      setIsPosSubmitting(false);
    }
  };

  // -----------------------------------------------------------------
  // CRUD - MENU ITEMS
  // -----------------------------------------------------------------
  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultImage = menuForm.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
    const targetVendorId = menuForm.vendorId || currentVendor?.id || vendors[0]?.id || 'vendor-forest-cafe';
    const qty = Number(menuForm.stockQuantity) || 0;

    if (editingMenuItem) {
      updateMenuItem({
        ...editingMenuItem,
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        purchasePrice: Number(menuForm.purchasePrice) || 0,
        category: menuForm.category,
        vendorId: targetVendorId,
        image: defaultImage,
        stockQuantity: qty,
        isAvailable: qty > 0 ? menuForm.isAvailable : false
      });
    } else {
      addMenuItem({
        vendorId: targetVendorId,
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        purchasePrice: Number(menuForm.purchasePrice) || 0,
        category: menuForm.category,
        image: defaultImage,
        stockQuantity: qty,
        isAvailable: qty > 0 ? menuForm.isAvailable : false
      });
    }

    setIsMenuModalOpen(false);
    setEditingMenuItem(null);
    setMenuForm({
      name: '',
      description: '',
      price: 5.0,
      purchasePrice: 3.0,
      category: 'Beverages',
      vendorId: vendors[0]?.id || 'vendor-forest-cafe',
      image: '',
      stockQuantity: 50,
      isAvailable: true
    });
  };

  const handleEditMenuClick = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuForm({
      name: item.name,
      description: item.description,
      price: item.price,
      purchasePrice: item.purchasePrice ?? Math.round(item.price * 0.6 * 100) / 100,
      category: item.category,
      vendorId: item.vendorId,
      image: item.image,
      stockQuantity: item.stockQuantity ?? 50,
      isAvailable: item.isAvailable
    });
    setIsMenuModalOpen(true);
  };

  const handleToggleAvailability = (item: MenuItem) => {
    updateMenuItem({
      ...item,
      isAvailable: !item.isAvailable
    });
  };

  // -----------------------------------------------------------------
  // INVENTORY RESTOCK HANDLER
  // -----------------------------------------------------------------
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;

    updateInventoryStock(restockItem.id, restockAmount, 'adjust');
    setRestockItem(null);
    setRestockAmount(10);
  };

  return (
    <div className="space-y-6">
      
      {/* Vendor Profile & Quick Stall Switcher */}
      <div className="p-5 glass-panel border border-[#00ABAB]/30 rounded-3xl  flex flex-col md:flex-row md:items-center justify-between gap-4">
        {currentVendor ? (
          <div className="flex items-center gap-4">
            <img 
              src={currentVendor.image} 
              alt={currentVendor.name} 
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00ABAB]/30"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold text-[#40E0D0] bg-teal-100 px-2.5 py-0.5 rounded border border-[#00ABAB]/30">
                  {currentVendor.stallNumber}
                </span>
                <span className="text-xs text-[#9CA3AF] font-mono">Managed by: {currentVendor.ownerName}</span>
              </div>
              <h2 className="text-xl font-bold font-sans text-[#FFFFFF] tracking-tight mt-1">{currentVendor.name}</h2>
            </div>
          </div>
        ) : (
          <div className="text-[#9CA3AF] text-sm py-4">No vendor stall registered or selected.</div>
        )}

        {/* Dynamic Stall switcher for testing convenience */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider font-mono">Switch Stall Account:</label>
          <select
            id="select-active-vendor-stall"
            value={selectedVendorId}
            onChange={e => {
              setSelectedVendorId(e.target.value);
              setVendorTab('orders'); // reset
            }}
            className="px-3 py-1.5 border border-[#00ABAB]/30 rounded-xl glass-panel text-xs font-semibold text-slate-850 focus:outline-none focus:border-teal-600 cursor-pointer"
          >
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats specific to the active stall */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl  space-y-1">
          <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider font-mono block">Gross Stall Sales</span>
          <div className="text-xl font-extrabold text-[#FFFFFF] font-mono">₹{sales.toFixed(2)}</div>
        </div>
        <div className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl  space-y-1">
          <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider font-mono block">Order Volume</span>
          <div className="text-xl font-extrabold text-[#FFFFFF] font-mono">{orderCount} bills</div>
        </div>
        <div className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl  space-y-1">
          <span className="text-[10px] text-[#9CA3AF] font-bold uppercase tracking-wider font-mono block">Critical Stocks</span>
          <div className="text-xl font-extrabold text-[#40E0D0] font-mono">
            {stallInventory.filter(i => i.currentStock <= i.minStockLevel).length} items
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-[#00ABAB]/30 gap-1.5 overflow-x-auto text-xs font-bold text-[#FFFFFF]">
        <button
          id="btn-vendor-tab-pos"
          onClick={() => setVendorTab('pos')}
          className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            vendorTab === 'pos' ? 'border-[#14F1D9] text-[#14F1D9] font-extrabold bg-[#0A0A0A] rounded-t-lg shadow-[0_-2px_10px_rgba(20,241,217,0.15)]' : 'border-transparent text-[#9CA3AF] hover:text-[#FFFFFF]'
          }`}
        >
          <CreditCard className="h-4 w-4 text-[#14F1D9]" /> ☕ Counter Billing & POS
        </button>
        <button
          id="btn-vendor-tab-history"
          onClick={() => setVendorTab('history')}
          className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            vendorTab === 'history' ? 'border-[#14F1D9] text-[#14F1D9] font-extrabold bg-[#0A0A0A] rounded-t-lg shadow-[0_-2px_10px_rgba(20,241,217,0.15)]' : 'border-transparent text-[#9CA3AF] hover:text-[#FFFFFF]'
          }`}
        >
          <Receipt className="h-4 w-4" /> 📋 Sales History & Reports ({stallOrders.length})
        </button>
        <button
          id="btn-vendor-tab-menu"
          onClick={() => setVendorTab('menu')}
          className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            vendorTab === 'menu' ? 'border-teal-600 text-[#40E0D0] font-extrabold bg-[#0A0A0A] rounded-t-lg' : 'border-transparent text-[#9CA3AF] hover:text-[#FFFFFF]'
          }`}
        >
          <Utensils className="h-4 w-4" /> Menu Catalog ({stallMenuItems.length})
        </button>
        <button
          id="btn-vendor-tab-inventory"
          onClick={() => setVendorTab('inventory')}
          className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            vendorTab === 'inventory' ? 'border-teal-600 text-[#40E0D0] font-extrabold bg-[#0A0A0A] rounded-t-lg' : 'border-transparent text-[#9CA3AF] hover:text-[#FFFFFF]'
          }`}
        >
          <Package className="h-4 w-4" /> Stock & Ingredients ({stallInventory.length})
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 0. STAFF POS & BILLING TERMINAL */}
      {/* ----------------------------------------------------------------- */}
      {vendorTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-white">
          {/* Left 2 cols: All Menu Items Grid for Staff */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl flex flex-col md:flex-row items-center gap-3">
              <div className="flex-1 relative w-full">
                <input 
                  type="text"
                  placeholder="Search espresso, pizzas, burgers..."
                  value={posSearch}
                  onChange={e => setPosSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#00ABAB] font-mono"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
              </div>
              <select
                value={posCategoryFilter}
                onChange={e => setPosCategoryFilter(e.target.value)}
                className="w-full md:w-auto px-3 py-2.5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#00ABAB] cursor-pointer font-mono"
              >
                <option value="all">All Item Categories</option>
                {Array.from(new Set(stallMenuItems.map(m => m.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button
                id="btn-quick-bulk-add-pos"
                onClick={() => setIsBulkMenuModalOpen(true)}
                className="w-full md:w-auto px-3.5 py-2.5 bg-[#00ABAB]/20 hover:bg-[#00ABAB]/30 border border-[#00ABAB]/50 text-[#40E0D0] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4" /> ⚡ Bulk Add N Items
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-2.5">
              {filteredPosMenuItems.map(item => {
                const stockQty = item.stockQuantity ?? 50;
                const isOutOfStock = stockQty <= 0 || !item.isAvailable;

                return (
                  <div 
                    key={item.id}
                    className="glass-panel p-2 border border-[#00ABAB]/20 hover:border-[#14F1D9]/50 rounded-xl flex flex-col justify-between bg-[#0B1120] transition-all group aspect-square"
                  >
                    <div className="relative w-full h-1/2 rounded-lg overflow-hidden mb-1">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-1 left-1 px-1 py-0.5 bg-[#050816]/90 border border-white/5 text-[7px] font-mono font-bold text-[#14F1D9] rounded uppercase truncate max-w-[80%]">
                        {item.category}
                      </span>
                      <span className={`absolute top-1 right-1 px-1 py-0.5 border text-[7px] font-mono font-bold rounded uppercase ${
                        stockQty > 10 
                          ? 'bg-[#050816]/90 border-emerald-500/30 text-emerald-400'
                          : stockQty > 0
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      }`}>
                        {stockQty > 0 ? `Stk: ${stockQty}` : '0 Stk'}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-bold text-[10px] text-white truncate group-hover:text-[#14F1D9] transition-colors">{item.name}</h4>
                          <span className="font-mono text-[10px] font-black text-white shrink-0">₹{item.price.toFixed(2)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => addToPosCart(item)}
                        disabled={isOutOfStock}
                        className="w-full py-1 mt-1 rounded-lg bg-[#14F1D9]/10 hover:bg-[#14F1D9] hover:text-[#0B1120] text-[#14F1D9] font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-0.5 cursor-pointer transition-all border border-[#14F1D9]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-2.5 w-2.5" /> {isOutOfStock ? 'Sold Out' : 'Add'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Staff Billing POS Terminal */}
          <div className="glass-panel p-5 border border-[#00ABAB]/30 rounded-2xl h-fit space-y-4 bg-[#0B1120] sticky top-24">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#14F1D9]" /> Staff Billing Counter
              </h3>
              {posCart.length > 0 && (
                <button 
                  type="button"
                  onClick={() => setPosCart([])}
                  className="text-[9px] text-rose-400 font-mono font-bold hover:underline cursor-pointer uppercase"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Itemized Cart list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {posCart.length === 0 ? (
                <div className="py-8 text-center text-[#9CA3AF] text-xs space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-white/10" />
                  <p>No items added to current bill.</p>
                  <p className="text-[10px] text-white/40">Click "+ Add to Cart" on any menu item.</p>
                </div>
              ) : (
                posCart.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-[#050816] border border-white/5 rounded-xl flex justify-between items-center text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-white truncate">{item.name}</div>
                      <div className="text-[9px] text-[#14F1D9] font-mono">₹{item.price.toFixed(2)} each</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => updatePosQty(item.menuItemId, -1)}
                        className="w-5 h-5 rounded bg-white/5 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-mono text-white font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => updatePosQty(item.menuItemId, 1)}
                        className="w-5 h-5 rounded bg-white/5 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        +
                      </button>
                      <span className="font-mono font-black text-[#14F1D9] w-14 text-right">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* POS Billing & Payment Method Selection (No customer details required; token generated automatically) */}
            <form onSubmit={handleStaffGenerateBill} className="space-y-3 border-t border-white/10 pt-3">
              <div>
                <label className="block text-[9px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['cash', 'upi', 'card'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPosPaymentMethod(m)}
                      className={`py-2 rounded-xl text-[10px] font-mono uppercase font-bold border cursor-pointer transition-all ${
                        posPaymentMethod === m
                          ? 'bg-[#14F1D9]/20 border-[#14F1D9] text-[#14F1D9]'
                          : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {m === 'cash' ? '💵 Cash' : m === 'upi' ? '📱 UPI' : '💳 Card'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5% GST Retail Tax Calculation Box (GST Inclusive of MRP) */}
              <div className="pt-2 border-t border-white/10 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Taxable Base:</span>
                  <span className="text-white font-bold">₹{posSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>CGST (2.5%):</span>
                  <span className="text-[#14F1D9]">₹{posCgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>SGST (2.5%):</span>
                  <span className="text-[#14F1D9]">₹{posSgst.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between items-center font-black">
                  <span className="text-xs text-white uppercase tracking-wider">Total (Incl. 5% GST):</span>
                  <span className="text-2xl font-mono text-[#14F1D9] shadow-sm">₹{posGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={posCart.length === 0 || isPosSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)]"
              >
                {isPosSubmitting ? '⚡ Generating Bill...' : '⚡ Generate Bill & Print Receipt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* A. RETAIL SALES HISTORY & REPORTS PANEL */}
      {/* ----------------------------------------------------------------- */}
      {vendorTab === 'history' && (
        <div className="space-y-4 text-[#FFFFFF]">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-base text-[#FFFFFF] font-sans flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#14F1D9]" /> Food Street Sales History & Transaction Reports
              </h3>
              <p className="text-xs text-[#9CA3AF] font-sans">
                Review previous invoices, filter by date, verify 5% GST calculations, and reprint receipts
              </p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="glass-panel border border-[#00ABAB]/30 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice #, token, or customer name..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full bg-[#050816] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#14F1D9] font-mono"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#050816] border border-white/10 rounded-lg px-2.5 py-1">
                <Calendar className="h-3.5 w-3.5 text-[#14F1D9]" />
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={e => setHistoryDateFilter(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none font-mono"
                />
                {historyDateFilter && (
                  <button
                    onClick={() => setHistoryDateFilter('')}
                    className="text-gray-400 hover:text-white text-[10px] ml-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              <select
                value={historyPaymentFilter}
                onChange={e => setHistoryPaymentFilter(e.target.value)}
                className="bg-[#050816] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
              >
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          {/* Sales Summary KPI Ribbon */}
          {(() => {
            const relevantOrders = stallOrders.filter(o => {
              const matchesSearch = !historySearch || 
                (o.invoiceNumber && o.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase())) ||
                o.id.toLowerCase().includes(historySearch.toLowerCase()) ||
                (o.tokenNumber && String(o.tokenNumber).toLowerCase().includes(historySearch.toLowerCase())) ||
                o.customerName.toLowerCase().includes(historySearch.toLowerCase());
              
              const matchesDate = !historyDateFilter || o.createdAt.startsWith(historyDateFilter);
              const matchesPayment = historyPaymentFilter === 'all' || (o.paymentMethod || 'cash') === historyPaymentFilter;
              return matchesSearch && matchesDate && matchesPayment;
            });

            const totalGross = relevantOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            const totalTax = relevantOrders.reduce((sum, o) => {
              if (o.taxAmount != null) return sum + o.taxAmount;
              // Historical fallback 5% if not recorded
              return sum + Math.round((o.totalAmount - (o.totalAmount / 1.05)) * 100) / 100;
            }, 0);
            const totalSubtotal = Math.round((totalGross - totalTax) * 100) / 100;

            // Item-wise sales aggregation
            const itemMap = new Map<string, { name: string; qty: number; sales: number }>();
            relevantOrders.forEach(o => {
              o.items.forEach(it => {
                if (currentVendor && it.vendorId !== currentVendor.id && currentVendor.id !== 'all') return;
                const existing = itemMap.get(it.name) || { name: it.name, qty: 0, sales: 0 };
                existing.qty += it.quantity;
                existing.sales += (it.price * it.quantity);
                itemMap.set(it.name, existing);
              });
            });
            const topItems = Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 glass-panel border border-[#00ABAB]/30 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-[#9CA3AF] font-bold uppercase font-mono block">Invoices Filtered</span>
                    <div className="text-lg font-bold text-white font-mono">{relevantOrders.length}</div>
                  </div>
                  <div className="p-3 glass-panel border border-[#00ABAB]/30 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-[#9CA3AF] font-bold uppercase font-mono block">Taxable Subtotal</span>
                    <div className="text-lg font-bold text-white font-mono">₹{totalSubtotal.toFixed(2)}</div>
                  </div>
                  <div className="p-3 glass-panel border border-[#00ABAB]/30 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-[#9CA3AF] font-bold uppercase font-mono block">5% GST Collected</span>
                    <div className="text-lg font-bold text-[#14F1D9] font-mono">₹{totalTax.toFixed(2)}</div>
                  </div>
                  <div className="p-3 glass-panel border border-[#00ABAB]/30 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-[#9CA3AF] font-bold uppercase font-mono block">Grand Total Sales</span>
                    <div className="text-lg font-extrabold text-[#14F1D9] font-mono">₹{totalGross.toFixed(2)}</div>
                  </div>
                </div>

                {/* Item-wise Sales Mini Breakdown */}
                {topItems.length > 0 && (
                  <div className="p-3.5 glass-panel border border-[#00ABAB]/30 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#9CA3AF] uppercase font-mono text-[10px]">Item-Wise Sales Summary</span>
                      <span className="text-gray-400 font-mono text-[10px]">{topItems.length} unique items sold</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
                      {topItems.map((ti, idx) => (
                        <div key={idx} className="bg-[#050816] border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-2">
                          <span className="text-white font-bold">{ti.name}</span>
                          <span className="bg-[#14F1D9]/20 text-[#14F1D9] px-1.5 py-0.5 rounded text-[10px] font-bold">{ti.qty} sold</span>
                          <span className="text-gray-400">₹{ti.sales.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoices Table */}
                {relevantOrders.length === 0 ? (
                  <div className="text-center py-12 glass-panel border border-[#00ABAB]/30 rounded-2xl text-xs text-[#9CA3AF]">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                    No sales invoices found matching the current filter.
                  </div>
                ) : (
                  <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#0A0A0A] border-b border-[#00ABAB]/30 text-[#9CA3AF] uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Invoice / Token</th>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Items Sold</th>
                            <th className="p-3 text-right">Subtotal</th>
                            <th className="p-3 text-right">5% GST</th>
                            <th className="p-3 text-right">Grand Total</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {relevantOrders.map(order => {
                            const sub = order.subtotal != null 
                              ? order.subtotal 
                              : Math.round((order.totalAmount / 1.05) * 100) / 100;
                            const gst = order.taxAmount != null 
                              ? order.taxAmount 
                              : Math.round((order.totalAmount - sub) * 100) / 100;

                            return (
                              <tr key={order.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-white">{order.invoiceNumber || order.id}</div>
                                  <div className="text-[10px] text-[#9CA3AF]">{order.tokenNumber ? `Token #${order.tokenNumber}` : order.id}</div>
                                </td>
                                <td className="p-3 text-[#9CA3AF]">
                                  <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                                  <div className="text-[10px]">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td className="p-3">
                                  <div className="text-white font-semibold">{order.customerName}</div>
                                  {order.customerPhone && <div className="text-[10px] text-[#9CA3AF]">{order.customerPhone}</div>}
                                </td>
                                <td className="p-3 text-white max-w-[200px]">
                                  <div className="truncate">
                                    {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                  </div>
                                  <div className="text-[10px] text-[#9CA3AF]">{order.items.reduce((s, i) => s + i.quantity, 0)} items total</div>
                                </td>
                                <td className="p-3 text-right text-[#9CA3AF]">₹{sub.toFixed(2)}</td>
                                <td className="p-3 text-right text-[#14F1D9]">₹{gst.toFixed(2)}</td>
                                <td className="p-3 text-right font-bold text-white">₹{order.totalAmount.toFixed(2)}</td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-white">
                                    {order.paymentMethod || 'CASH'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => {
                                      printTicket({
                                        receiptId: order.invoiceNumber || order.id,
                                        tokenNumber: order.tokenNumber || order.id,
                                        activityName: 'DEUCE FOOD & BEVERAGES',
                                        packageName: 'Food Street Dining',
                                        customerName: order.customerName,
                                        customerPhone: order.customerPhone,
                                        date: new Date(order.createdAt).toISOString(),
                                        slot: 'FOOD COUNTER',
                                        items: order.items.map(i => ({ 
                                          label: `${i.quantity}x ${i.name}`, 
                                          value: `₹${(i.price * i.quantity).toFixed(2)}` 
                                        })),
                                        subtotalAmount: order.subtotal != null ? order.subtotal : sub,
                                        totalAmount: order.totalAmount,
                                        paymentStatus: 'paid',
                                        quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
                                        paymentMethod: (order.paymentMethod || 'CASH').toUpperCase(),
                                        counterStaff: 'Food Street POS'
                                      });
                                    }}
                                    className="p-1.5 rounded-lg bg-[#14F1D9]/20 hover:bg-[#14F1D9] text-[#14F1D9] hover:text-[#050816] transition-all cursor-pointer font-bold inline-flex items-center gap-1 text-[10px]"
                                    title="Reprint Invoice Receipt"
                                  >
                                    <Printer className="w-3.5 h-3.5" /> Reprint
                                  </button>
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
            );
          })()}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* B. MENU & RETAIL CATALOG PANEL */}
      {/* ----------------------------------------------------------------- */}
      {vendorTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[#FFFFFF]">
            <div>
              <h3 className="font-bold text-base text-[#FFFFFF] font-sans flex items-center gap-2">
                <Utensils className="h-5 w-5 text-[#40E0D0]" /> Retail & Food Menu Management
              </h3>
              <p className="text-xs text-[#9CA3AF] font-sans">
                Full retail & food street catalog: manage menu items, stock positions (+/-), pricing, and live availability
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-bulk-add-menu-vendor"
                onClick={() => setIsBulkMenuModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold btn-glow text-[#0B0F14] rounded-xl hover:bg-[#00A99D] transition-all cursor-pointer shadow-lg"
              >
                <Plus className="h-4 w-4" /> ⚡ Bulk Add N Items
              </button>
              <button
                id="btn-add-menu-item"
                onClick={() => {
                  setEditingMenuItem(null);
                  setMenuForm({
                    name: '',
                    description: '',
                    price: 5.0,
                    category: 'Beverages',
                    vendorId: selectedVendorId === 'all' ? (vendors[0]?.id || 'vendor-forest-cafe') : selectedVendorId,
                    image: '',
                    stockQuantity: 50,
                    isAvailable: true
                  });
                  setIsMenuModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-[#00ABAB]/40 text-[#FFFFFF] rounded-xl hover:bg-[#0A0A0A] transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> + Add Item
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="glass-panel border border-[#00ABAB]/30 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items by name, category, or description..."
                value={menuCatalogSearch}
                onChange={(e) => setMenuCatalogSearch(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-lg px-3 py-1.5 text-white font-sans focus:outline-none focus:border-[#40E0D0]"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={menuCatalogVendorFilter}
                onChange={(e) => setMenuCatalogVendorFilter(e.target.value)}
                className="bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1.5 text-white font-sans focus:outline-none focus:border-[#40E0D0] cursor-pointer"
              >
                <option value="all">All Outlets & Retail Counters</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.stallNumber})</option>
                ))}
              </select>

              <select
                value={menuCatalogCategoryFilter}
                onChange={(e) => setMenuCatalogCategoryFilter(e.target.value)}
                className="bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1.5 text-white font-sans focus:outline-none focus:border-[#40E0D0] cursor-pointer"
              >
                <option value="all">All Categories</option>
                {Array.from(new Set(menuItems.map(m => m.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <div className="flex border border-[#00ABAB]/30 rounded-lg overflow-hidden">
                <button
                  onClick={() => setMenuCatalogViewMode('table')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                    menuCatalogViewMode === 'table' ? 'bg-[#00ABAB] text-black' : 'bg-[#0A0A0A] text-white hover:bg-white/5'
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setMenuCatalogViewMode('grid')}
                  className={`px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                    menuCatalogViewMode === 'grid' ? 'bg-[#00ABAB] text-black' : 'bg-[#0A0A0A] text-white hover:bg-white/5'
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>

          {/* Filtered items */}
          {(() => {
            const displayedItems = menuItems.filter(item => {
              const matchesSearch = item.name.toLowerCase().includes(menuCatalogSearch.toLowerCase()) ||
                                    item.category.toLowerCase().includes(menuCatalogSearch.toLowerCase()) ||
                                    item.description.toLowerCase().includes(menuCatalogSearch.toLowerCase());
              const matchesVendor = menuCatalogVendorFilter === 'all' || item.vendorId === menuCatalogVendorFilter;
              const matchesCat = menuCatalogCategoryFilter === 'all' || item.category === menuCatalogCategoryFilter;
              return matchesSearch && matchesVendor && matchesCat;
            });

            if (menuCatalogViewMode === 'table') {
              return (
                <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#FFFFFF]">
                      <thead>
                        <tr className="bg-[#0A0A0A]/80 border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold">
                          <th className="p-3.5">Item Details</th>
                          <th className="p-3.5">Vendor / Stall</th>
                          <th className="p-3.5">Category</th>
                          <th className="p-3.5">Selling Price</th>
                          <th className="p-3.5">Purchase / Trade Cost</th>
                          <th className="p-3.5">Unit Margin</th>
                          <th className="p-3.5">Stock Position</th>
                          <th className="p-3.5">Availability</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-teal-100/20">
                        {displayedItems.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-[#9CA3AF] font-mono">
                              No retail or menu items match the filter criteria.
                            </td>
                          </tr>
                        ) : (
                          displayedItems.map(item => {
                            const vendor = vendors.find(v => v.id === item.vendorId);
                            const stock = item.stockQuantity ?? 50;
                            const purchaseCost = item.purchasePrice ?? 0;
                            const unitMargin = item.price - purchaseCost;
                            const marginPercent = item.price > 0 ? Math.round((unitMargin / item.price) * 100) : 0;

                            return (
                              <tr key={item.id} className="hover:bg-[#0A0A0A]/40 transition-colors">
                                <td className="p-3.5 font-bold text-[#FFFFFF] flex items-center gap-3">
                                  <img 
                                    src={item.image} 
                                    alt={item.name} 
                                    className="h-10 w-10 rounded-lg object-cover border border-[#00ABAB]/30 shrink-0" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="min-w-0">
                                    <div className="truncate font-bold">{item.name}</div>
                                    <div className="text-[10px] text-gray-400 font-sans font-normal truncate max-w-xs">{item.description}</div>
                                  </div>
                                </td>

                                <td className="p-3.5 font-mono text-[#9CA3AF]">
                                  {vendor ? `${vendor.name} (${vendor.stallNumber})` : 'Central Retail'}
                                </td>

                                <td className="p-3.5">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#121A24] text-[#40E0D0] border border-[#00ABAB]/30">
                                    {item.category}
                                  </span>
                                </td>

                                <td className="p-3.5 font-mono font-extrabold text-[#40E0D0]">
                                  ₹{item.price.toFixed(2)}
                                </td>

                                <td className="p-3.5 font-mono font-bold text-amber-400">
                                  ₹{purchaseCost.toFixed(2)}
                                </td>

                                <td className="p-3.5 font-mono text-xs">
                                  <div className="text-emerald-400 font-bold">
                                    +₹{unitMargin.toFixed(2)}
                                  </div>
                                  <div className="text-[10px] text-[#9CA3AF]">
                                    {marginPercent}% margin
                                  </div>
                                </td>

                                <td className="p-3.5 font-mono">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      stock > 10
                                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                        : stock > 0
                                        ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                        : 'bg-red-950/60 text-red-400 border-red-800/60'
                                    }`}>
                                      {stock} units
                                    </span>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => updateMenuItemStock(item.id, Math.max(0, stock - 5))}
                                        className="w-5 h-5 rounded bg-[#1A1A1A] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                                        title="Reduce 5 units"
                                      >
                                        -5
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => adjustMenuItemStock(item.id, -1)}
                                        disabled={stock <= 0}
                                        className="w-5 h-5 rounded bg-[#1A1A1A] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30"
                                        title="Reduce 1 unit"
                                      >
                                        -1
                                      </button>

                                      <input 
                                        type="number"
                                        min="0"
                                        value={stock}
                                        onChange={(e) => updateMenuItemStock(item.id, parseInt(e.target.value) || 0)}
                                        className="w-12 text-center py-0.5 bg-[#0A0A0A] border border-[#00ABAB]/50 rounded text-xs font-mono font-black text-[#40E0D0] focus:outline-none"
                                        title="Directly enter stock position"
                                      />

                                      <button
                                        type="button"
                                        onClick={() => adjustMenuItemStock(item.id, 1)}
                                        className="px-1.5 h-5 rounded bg-[#00ABAB]/15 hover:bg-[#00ABAB] text-[#00ABAB] hover:text-black text-[10px] font-bold font-mono flex items-center justify-center transition-colors cursor-pointer"
                                        title="Add +1 unit"
                                      >
                                        +1
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateMenuItemStock(item.id, stock + 10)}
                                        className="px-1.5 h-5 rounded bg-[#00ABAB]/15 hover:bg-[#00ABAB] text-[#00ABAB] hover:text-black text-[10px] font-bold font-mono flex items-center justify-center transition-colors cursor-pointer"
                                        title="Add +10 units"
                                      >
                                        +10
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => updateMenuItemStock(item.id, stock + 50)}
                                        className="px-1.5 h-5 rounded bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black text-[10px] font-bold font-mono flex items-center justify-center transition-colors cursor-pointer"
                                        title="Add +50 units"
                                      >
                                        +50
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-3.5">
                                  <button
                                    onClick={() => updateMenuItem({ ...item, isAvailable: !item.isAvailable })}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase font-mono border cursor-pointer transition-all ${
                                      item.isAvailable
                                        ? 'bg-teal-950/80 text-[#40E0D0] border-[#00ABAB]'
                                        : 'bg-red-950/80 text-red-400 border-red-800'
                                    }`}
                                  >
                                    {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                                  </button>
                                </td>

                                <td className="p-3.5 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => handleEditMenuClick(item)}
                                    className="px-2.5 py-1 text-xs rounded-lg border border-[#00ABAB]/30 hover:bg-[#0A0A0A] text-[#FFFFFF] transition-colors cursor-pointer mr-1.5"
                                  >
                                    <Edit className="h-3.5 w-3.5 inline mr-1" /> Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                        deleteMenuItem(item.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition-colors cursor-pointer"
                                    title="Delete item"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }

            // Grid Cards View
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedItems.map(item => {
                  const vendor = vendors.find(v => v.id === item.vendorId);
                  const stock = item.stockQuantity ?? 50;

                  return (
                    <div 
                      key={item.id} 
                      id={`menu-item-card-${item.id}`}
                      className={`glass-panel border rounded-2xl overflow-hidden hover:shadow-lg transition-all flex flex-col justify-between ${
                        !item.isAvailable ? 'opacity-65 border-dashed border-teal-300 bg-[#0A0A0A]/50' : 'border-[#00ABAB]/30'
                      }`}
                    >
                      <div className="h-36 relative">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-black/80 text-[#40E0D0] border border-[#00ABAB]/30 font-mono">
                            {vendor?.name || item.category}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border font-mono ${
                            item.isAvailable 
                              ? 'bg-[#0A0A0A] text-[#40E0D0] border-[#00ABAB]/30' 
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}>
                            {item.isAvailable ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm text-[#FFFFFF]">{item.name}</h4>
                            <div className="text-right">
                              <div className="font-mono font-black text-sm text-[#40E0D0]">₹{item.price.toFixed(2)}</div>
                              <div className="text-[9px] font-mono text-amber-400">Cost: ₹{(item.purchasePrice || 0).toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono mt-1 pt-1 border-t border-white/5">
                            <span className="text-[#9CA3AF]">Margin:</span>
                            <span className="text-emerald-400 font-bold">
                              +₹{(item.price - (item.purchasePrice || 0)).toFixed(2)} ({item.price > 0 ? Math.round(((item.price - (item.purchasePrice || 0)) / item.price) * 100) : 0}%)
                            </span>
                          </div>
                          <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {/* Stock Adjustment Row */}
                        <div className="p-2.5 bg-[#0A0A0A]/60 rounded-xl border border-[#00ABAB]/20 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-[#9CA3AF] uppercase font-bold">Stock Position:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => adjustMenuItemStock(item.id, -1)}
                              disabled={stock <= 0}
                              className="w-5 h-5 rounded bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-bold flex items-center justify-center cursor-pointer disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className="font-mono text-xs font-black text-[#40E0D0] px-1.5">{stock}</span>
                            <button
                              type="button"
                              onClick={() => adjustMenuItemStock(item.id, 1)}
                              className="w-5 h-5 rounded bg-white/5 hover:bg-[#00ABAB]/20 text-slate-300 hover:text-[#40E0D0] text-xs font-bold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustMenuItemStock(item.id, 10)}
                              className="px-1.5 py-0.5 rounded bg-[#00ABAB]/15 hover:bg-[#00ABAB] text-[#00ABAB] hover:text-black text-[9px] font-bold font-mono cursor-pointer"
                            >
                              +10
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#00ABAB]/30 pt-3">
                          <button
                            id={`btn-toggle-avail-${item.id}`}
                            onClick={() => handleToggleAvailability(item)}
                            className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded transition-colors cursor-pointer ${
                              item.isAvailable
                                ? 'bg-[#0A0A0A] text-[#40E0D0] border border-[#00ABAB]/30 hover:bg-teal-100'
                                : 'bg-[#121A24] text-[#9CA3AF] border border-slate-250 hover:bg-slate-200'
                            }`}
                          >
                            {item.isAvailable ? 'Set Sold Out' : 'Set Available'}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              id={`btn-edit-menu-${item.id}`}
                              onClick={() => handleEditMenuClick(item)}
                              className="p-1.5 rounded-lg border border-[#00ABAB]/30 text-[#9CA3AF] hover:bg-[#0A0A0A] transition-colors cursor-pointer"
                              title="Edit item"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              id={`btn-delete-menu-${item.id}`}
                              onClick={() => {
                                if (confirm(`Are you sure you want to permanently delete "${item.name}" from your menu?`)) {
                                  deleteMenuItem(item.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/60 transition-colors cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* C. INVENTORY PANEL */}
      {/* ----------------------------------------------------------------- */}
      {vendorTab === 'inventory' && (
        <div className="space-y-4">
          <FoodStreetInventoryPanel vendorIdFilter={currentVendor?.id} />
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MENU MODAL */}
      {/* ----------------------------------------------------------------- */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form onSubmit={handleSaveMenu} className="glass-panel border border-[#00ABAB]/30 p-6 rounded-2xl shadow-2xl max-w-md w-full space-y-4">
            <h3 className="font-bold text-lg text-[#FFFFFF] font-sans">
              {editingMenuItem ? 'Modify Menu Item' : 'Create New Menu Item'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  id="input-menu-name"
                  value={menuForm.name}
                  onChange={e => setMenuForm({...menuForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF]"
                  placeholder="e.g., Ice Cold Brew"
                />
              </div>

              <div>
                <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Description</label>
                <textarea
                  required
                  id="input-menu-desc"
                  value={menuForm.description}
                  onChange={e => setMenuForm({...menuForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF]"
                  rows={2}
                  placeholder="Briefly describe the ingredients..."
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    id="input-menu-price"
                    value={menuForm.price}
                    onChange={e => setMenuForm({...menuForm, price: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF] font-mono font-bold"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-amber-400 font-bold uppercase tracking-wider mb-1">Trade/Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    id="input-menu-purchase-price"
                    value={menuForm.purchasePrice}
                    onChange={e => setMenuForm({...menuForm, purchasePrice: Number(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-amber-500/30 rounded-lg focus:outline-none focus:border-amber-400 glass-panel text-amber-300 font-mono font-bold"
                    placeholder="e.g. 3.0"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Stock Position</label>
                  <input
                    type="number"
                    min={0}
                    required
                    id="input-menu-stock"
                    value={menuForm.stockQuantity}
                    onChange={e => setMenuForm({...menuForm, stockQuantity: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#14F1D9] font-mono font-bold"
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Category</label>
                  <select
                    id="input-menu-category"
                    value={menuForm.category}
                    onChange={e => setMenuForm({...menuForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF] cursor-pointer"
                  >
                    <option value="Beverages">Beverages</option>
                    <option value="Wood-Fired Pizza">Wood-Fired Pizza</option>
                    <option value="Smash Burgers">Smash Burgers</option>
                    <option value="Starters & Sides">Starters & Sides</option>
                    <option value="Desserts & Shakes">Desserts & Shakes</option>
                    <option value="Snacks & Fast Food">Snacks & Fast Food</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Retail & Merchandise">Retail & Merchandise</option>
                    <option value="Souvenirs & Apparel">Souvenirs & Apparel</option>
                    <option value="Combos & Offers">Combos & Offers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Stall / Vendor Outlet</label>
                  <select
                    id="input-menu-vendor"
                    value={menuForm.vendorId}
                    onChange={e => setMenuForm({...menuForm, vendorId: e.target.value})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF] cursor-pointer"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.stallNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Promo Image URL</label>
                  <input
                    type="url"
                    id="input-menu-image"
                    value={menuForm.image}
                    onChange={e => setMenuForm({...menuForm, image: e.target.value})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF]"
                    placeholder="https://images.unsplash.com..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="input-menu-available"
                  checked={menuForm.isAvailable}
                  onChange={e => setMenuForm({...menuForm, isAvailable: e.target.checked})}
                  className="h-4 w-4 rounded text-[#40E0D0] focus:ring-teal-900 cursor-pointer"
                />
                <label htmlFor="input-menu-available" className="text-slate-100/75 font-bold cursor-pointer">Immediately list as Available in Stall</label>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-[#007B8B]/10 pt-4">
              <button
                type="button"
                id="btn-cancel-menu"
                onClick={() => setIsMenuModalOpen(false)}
                className="px-4 py-2 border border-[#007B8B]/25 text-slate-100 rounded-xl font-bold text-xs hover:bg-[#007B8B]/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-menu-form"
                className="px-4 py-2 bg-gradient-to-r from-[#007B8B] to-[#134E4A] text-[#0B0F14] rounded-xl font-bold text-xs hover:bg-[#134E4A]  cursor-pointer"
              >
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RESTOCK ITEM MODAL */}
      {restockItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form onSubmit={handleRestockSubmit} className="glass-panel border border-[#00ABAB]/30 p-6 rounded-2xl shadow-2xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-base text-[#FFFFFF] font-sans">
              Restock Ingredient: <strong className="text-teal-950 font-sans">{restockItem.name}</strong>
            </h3>
            <p className="text-xs text-[#9CA3AF]">Add materials to suppress low stock warnings for menu items</p>

            <div className="space-y-2 text-xs">
              <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Add Quantity ({restockItem.unit})</label>
              <input
                type="number"
                required
                id="input-restock-amount"
                value={restockAmount}
                onChange={e => setRestockAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF]"
                min={1}
              />
            </div>

            <div className="flex gap-3 justify-end border-t border-[#00ABAB]/30 pt-4">
              <button
                type="button"
                id="btn-cancel-restock"
                onClick={() => setRestockItem(null)}
                className="px-4 py-2 border border-[#00ABAB]/30 text-[#40E0D0] rounded-xl font-bold text-xs hover:bg-[#0A0A0A] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-restock-form"
                className="px-4 py-2 btn-glow text-[#0B0F14] rounded-xl font-bold text-xs  cursor-pointer"
              >
                Add Stock
              </button>
            </div>
          </form>
        </div>
      )}
      {/* ----------------------------------------------------------------- */}
      {/* PRINTABLE STAFF BILL RECEIPT MODAL */}
      {/* ----------------------------------------------------------------- */}
      {generatedBillOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-[#14F1D9]/40 relative bg-[#050816] text-center font-sans shadow-[0_0_40px_rgba(20,241,217,0.2)]">
            <CheckCircle className="w-12 h-12 text-[#14F1D9] mx-auto mb-2" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Bill Generated!</h3>
            <p className="text-xs text-[#9CA3AF]">Token No: <span className="font-mono text-[#14F1D9] font-black text-base">#{generatedBillOrder.tokenNumber || generatedBillOrder.id}</span></p>

            <div className="my-4 p-4 bg-[#0B1120] border border-white/10 rounded-2xl text-left text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-[#9CA3AF]"><span>Invoice #:</span> <span className="text-white font-bold">{generatedBillOrder.invoiceNumber || generatedBillOrder.id}</span></div>
              <div className="flex justify-between text-[#9CA3AF]"><span>Time:</span> <span className="text-white">{new Date(generatedBillOrder.createdAt).toLocaleTimeString()}</span></div>
              <div className="border-t border-white/10 my-2 pt-2 space-y-1">
                {generatedBillOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-white">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>Subtotal:</span>
                  <span className="text-white">₹{(generatedBillOrder.subtotal != null ? generatedBillOrder.subtotal : (generatedBillOrder.totalAmount / 1.05)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#9CA3AF]">
                  <span>GST (5%):</span>
                  <span className="text-[#14F1D9]">+₹{(generatedBillOrder.taxAmount != null ? generatedBillOrder.taxAmount : (generatedBillOrder.totalAmount - (generatedBillOrder.totalAmount / 1.05))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-[#14F1D9] pt-1 border-t border-white/10">
                  <span>TOTAL PAID:</span>
                  <span>₹{generatedBillOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (generatedBillOrder) {
                    printTicket({
                      receiptId: generatedBillOrder.invoiceNumber || generatedBillOrder.id,
                      tokenNumber: generatedBillOrder.tokenNumber || generatedBillOrder.id,
                      activityName: 'DEUCE FOOD & BEVERAGES',
                      packageName: 'Food Street Dining',
                      customerName: generatedBillOrder.customerName,
                      customerPhone: generatedBillOrder.customerPhone,
                      date: new Date(generatedBillOrder.createdAt).toISOString(),
                      slot: 'FOOD COUNTER',
                      items: generatedBillOrder.items.map(i => ({ label: `${i.quantity}x ${i.name}`, value: `₹${(i.price * i.quantity).toFixed(2)}` })),
                      subtotalAmount: generatedBillOrder.subtotal != null ? generatedBillOrder.subtotal : Math.round((generatedBillOrder.totalAmount / 1.05) * 100) / 100,
                      totalAmount: generatedBillOrder.totalAmount,
                      paymentStatus: 'paid',
                      quantity: generatedBillOrder.items.reduce((sum, item) => sum + item.quantity, 0),
                      paymentMethod: (generatedBillOrder.paymentMethod || 'CASH').toUpperCase(),
                      counterStaff: 'Food Street POS'
                    });
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#14F1D9] text-[#050816] font-bold text-xs uppercase tracking-wider hover:bg-[#00B4FF] transition-all cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.3)] flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Thermal Receipt
              </button>
              <button
                type="button"
                onClick={() => setGeneratedBillOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/10"
              >
                Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
      {/* BULK ADD MENU MODAL */}
      <BulkAddMenuModal
        isOpen={isBulkMenuModalOpen}
        onClose={() => setIsBulkMenuModalOpen(false)}
        defaultVendorId={currentVendor?.id}
      />

    </div>
  );
};








