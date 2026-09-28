/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MenuItem, InventoryItem, FoodOrder } from '../types';
import { printTicket } from '../lib/printTicket';
import { BulkAddMenuModal } from './BulkAddMenuModal';
import { 
  Plus, Edit, Trash2, Check, X, ShieldAlert, 
  Utensils, Clipboard, Package, ShoppingBag, 
  Eye, TrendingUp, RefreshCw, CreditCard, Search, CheckCircle, Printer, Coffee
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

  // Active dashboard view (Default to 'pos' for Deuce Cafe Counter Billing)
  const [vendorTab, setVendorTab] = useState<'pos' | 'orders' | 'menu' | 'inventory'>('pos');

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
  const [posCustomerEmail, setPosCustomerEmail] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [generatedBillOrder, setGeneratedBillOrder] = useState<FoodOrder | null>(null);

  // Form states for creating/editing menu items
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: 5.0,
    category: '',
    image: '',
    stockQuantity: 50,
    isAvailable: true
  });

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

  const posCartTotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleStaffGenerateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (posCart.length === 0) return;

    clearFoodCart();
    posCart.forEach(item => {
      const mItem = menuItems.find(m => m.id === item.menuItemId);
      if (mItem) {
        addToFoodCart(mItem, item.quantity);
      }
    });

    const order = submitFoodOrder(
      posCustomerName.trim() || 'Walk-in Guest',
      posCustomerEmail.trim() || 'guest@deucepark.com',
      posPaymentMethod
    );

    setGeneratedBillOrder(order);
    setPosCart([]);
    setPosCustomerName('Walk-in Guest');
    setPosCustomerEmail('');
  };

  // -----------------------------------------------------------------
  // CRUD - MENU ITEMS
  // -----------------------------------------------------------------
  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultImage = menuForm.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
    const qty = Number(menuForm.stockQuantity) || 0;

    if (editingMenuItem) {
      updateMenuItem({
        ...editingMenuItem,
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        category: menuForm.category,
        image: defaultImage,
        stockQuantity: qty,
        isAvailable: qty > 0 ? menuForm.isAvailable : false
      });
    } else {
      if (!currentVendor) return;
      addMenuItem({
        vendorId: currentVendor.id,
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
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
      category: '',
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
      category: item.category,
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
          id="btn-vendor-tab-orders"
          onClick={() => setVendorTab('orders')}
          className={`px-4 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
            vendorTab === 'orders' ? 'border-teal-600 text-[#40E0D0] font-extrabold bg-[#0A0A0A] rounded-t-lg' : 'border-transparent text-[#9CA3AF] hover:text-[#FFFFFF]'
          }`}
        >
          <ShoppingBag className="h-4 w-4" /> Kitchen Order Queue ({stallOrders.filter(o => o.status !== 'delivered').length})
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

            {/* Customer details for receipt */}
            <form onSubmit={handleStaffGenerateBill} className="space-y-3 border-t border-white/10 pt-3">
              <div>
                <label className="block text-[9px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Customer Name</label>
                <input 
                  type="text" 
                  value={posCustomerName}
                  onChange={e => setPosCustomerName(e.target.value)}
                  placeholder="Walk-in Guest"
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono"
                />
              </div>

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

              <div className="pt-2 border-t border-white/10 flex justify-between items-center font-black">
                <span className="text-xs text-[#9CA3AF]">Total Bill</span>
                <span className="text-xl font-mono text-[#14F1D9]">₹{posCartTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                disabled={posCart.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)]"
              >
                ⚡ Generate Bill & Print Receipt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* A. ORDERS PANEL */}
      {/* ----------------------------------------------------------------- */}
      {vendorTab === 'orders' && (
        <div className="space-y-4 text-[#FFFFFF]">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-[#FFFFFF] font-sans">Live Kitchen Order queue</h3>
              <p className="text-xs text-[#9CA3AF] font-sans">Process orders through Preparing, Ready, and Handed over stages</p>
            </div>
          </div>

          {stallOrders.length === 0 ? (
            <div className="text-center py-16 glass-panel border border-[#00ABAB]/30 rounded-2xl text-xs text-[#9CA3AF]">
              <Clipboard className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              No customer orders recorded for this food stall.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {stallOrders.map(order => {
                const isCompleted = order.status === 'delivered';
                const stallItems = currentVendor ? order.items.filter(item => item.vendorId === currentVendor.id) : [];
                const orderTotalForThisStall = stallItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

                return (
                  <div 
                    key={order.id} 
                    id={`vendor-order-card-${order.id}`}
                    className={`glass-panel border rounded-2xl overflow-hidden  hover: transition-shadow flex flex-col justify-between ${
                      order.status === 'pending'
                        ? 'border-amber-400 ring-1 ring-amber-400/20'
                        : order.status === 'preparing'
                        ? 'border-[#3E8EDE] ring-1 ring-[#7DF9FF]/10'
                        : order.status === 'ready'
                        ? 'border-teal-600 ring-1 ring-teal-600/20'
                        : 'border-[#00ABAB]/30'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-4 bg-[#0A0A0A] border-b border-[#00ABAB]/30 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#FFFFFF]">{order.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            order.status === 'pending'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200 animate-pulse'
                              : order.status === 'preparing'
                              ? 'btn-glow text-[#0B0F14] border border-teal-700'
                              : order.status === 'ready'
                              ? 'bg-teal-100 text-[#40E0D0] border border-[#00ABAB]/30'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-[10px] font-mono text-[#9CA3AF] block uppercase">Stall Share</span>
                        <span className="font-bold text-[#FFFFFF] font-mono">₹{orderTotalForThisStall.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Items specific to this stall */}
                    <div className="p-4 flex-1 space-y-2 border-b border-[#00ABAB]/30 glass-panel">
                      <span className="text-[9px] font-bold uppercase text-[#9CA3AF] font-mono block">Items to Prepare:</span>
                      {stallItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-semibold text-[#FFFFFF]">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-mono text-[#9CA3AF]">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}

                      <div className="border-t border-dashed border-[#00ABAB]/30 pt-2 text-[10px] text-[#9CA3AF] font-sans">
                        Billed To: <strong className="text-[#FFFFFF] font-sans">{order.customerName}</strong> ({order.customerEmail})
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-3 bg-[#0A0A0A] flex justify-end gap-2 text-xs font-bold">
                      {order.status === 'pending' && (
                        <button
                          id={`btn-vendor-prepare-${order.id}`}
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="w-full py-1.5 rounded-lg btn-3d-primary text-[#0B0F14] font-bold cursor-pointer"
                        >
                          Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          id={`btn-vendor-ready-${order.id}`}
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="w-full py-1.5 rounded-lg btn-3d-success text-[#0B0F14] font-bold cursor-pointer"
                        >
                          Mark as Ready
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          id={`btn-vendor-deliver-${order.id}`}
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className="w-full py-1.5 rounded-lg btn-3d-primary text-[#0B0F14] font-bold cursor-pointer"
                        >
                          Hand Over / Deliver
                        </button>
                      )}
                      {isCompleted && (
                        <div className="w-full text-center text-[#40E0D0] font-mono text-[11px] py-1 font-extrabold">
                          âœ“ Successfully Handed Over
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* B. MENU PANEL */}
      {/* ----------------------------------------------------------------- */}
      {vendorTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[#FFFFFF]">
            <div>
              <h3 className="font-bold text-base text-[#FFFFFF] font-sans">Menu Management</h3>
              <p className="text-xs text-[#9CA3AF] font-sans">Add, edit, or toggle availability of menu items for customers</p>
            </div>
            <div className="flex items-center gap-2">
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
                    price: 6.5,
                    category: 'Beverages',
                    image: '',
                    isAvailable: true
                  });
                  setIsMenuModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-[#00ABAB]/40 text-[#FFFFFF] rounded-xl hover:bg-[#0A0A0A] transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Single Item
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stallMenuItems.map(item => (
              <div 
                key={item.id} 
                id={`menu-item-card-${item.id}`}
                className={`glass-panel border rounded-2xl overflow-hidden  hover: transition-shadow flex flex-col justify-between ${
                  !item.isAvailable ? 'opacity-65 border-dashed border-teal-300 bg-[#0A0A0A]/50' : 'border-[#00ABAB]/30'
                }`}
              >
                <div className="h-32 relative">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
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
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 font-mono">
                      {item.category}
                    </span>
                    <h4 className="font-bold text-sm text-[#FFFFFF] mt-0.5">{item.name}</h4>
                    <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-[#00ABAB]/30 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm font-mono text-[#FFFFFF]">₹{item.price.toFixed(2)}</span>
                      <span className="text-[10px] font-mono text-[#40E0D0] bg-[#0A0A0A] px-2 py-0.5 rounded border border-[#00ABAB]/30 font-bold">
                        Stock: {item.stockQuantity ?? 50}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Availability Switch */}
                      <button
                        id={`btn-toggle-avail-${item.id}`}
                        onClick={() => handleToggleAvailability(item)}
                        className={`text-[10px] font-bold font-mono px-2 py-1 rounded transition-colors cursor-pointer ${
                          item.isAvailable
                            ? 'bg-[#0A0A0A] text-[#40E0D0] border border-[#00ABAB]/30 hover:bg-teal-100'
                            : 'bg-[#121A24] text-[#9CA3AF] border border-slate-250 hover:bg-slate-200'
                        }`}
                      >
                        {item.isAvailable ? 'Set Sold Out' : 'Set Available'}
                      </button>

                      <button
                        id={`btn-edit-menu-${item.id}`}
                        onClick={() => handleEditMenuClick(item)}
                        className="p-1.5 rounded-lg border border-[#00ABAB]/30 text-[#9CA3AF] hover:bg-[#0A0A0A] transition-colors cursor-pointer"
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
                        className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* C. INVENTORY PANEL */}
      {/* ----------------------------------------------------------------- */}
      {vendorTab === 'inventory' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-base text-[#FFFFFF] font-sans">Stock Control & Ingredients</h3>
            <p className="text-xs text-[#9CA3AF] font-sans">Monitor active stocks, receive low stock notifications, and execute replenishments</p>
          </div>

          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] text-[#9CA3AF] font-mono font-bold border-b border-[#00ABAB]/30">
                    <th className="p-3.5">Ingredient Name</th>
                    <th className="p-3.5">Stock Level</th>
                    <th className="p-3.5">Min Alert Level</th>
                    <th className="p-3.5">Status Check</th>
                    <th className="p-3.5 text-right">Replenish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  {stallInventory.map(ing => {
                    const isLow = ing.currentStock <= ing.minStockLevel;

                    return (
                      <tr key={ing.id} id={`inventory-row-${ing.id}`} className="hover:bg-[#0A0A0A]/50 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-[#FFFFFF] font-sans">{ing.name}</div>
                          <div className="text-[10px] text-[#9CA3AF] font-mono">ID: {ing.id}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-[#FFFFFF]">
                          {ing.currentStock} {ing.unit}
                        </td>
                        <td className="p-3.5 font-mono text-[#9CA3AF] font-medium">
                          {ing.minStockLevel} {ing.unit}
                        </td>
                        <td className="p-3.5">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200 animate-pulse">
                              <ShieldAlert className="h-3.5 w-3.5 text-red-600 flex-shrink-0" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#0A0A0A] text-[#40E0D0] border border-teal-150">
                              âœ“ Stock OK
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            id={`btn-vendor-restock-${ing.id}`}
                            onClick={() => {
                              setRestockItem(ing);
                              setRestockAmount(20);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-[#00ABAB]/30 hover:bg-[#0A0A0A] text-[#40E0D0] font-bold text-[11px] flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-teal-500" /> Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#9CA3AF] font-bold uppercase tracking-wider mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    id="input-menu-price"
                    value={menuForm.price}
                    onChange={e => setMenuForm({...menuForm, price: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF] font-mono"
                    min={0}
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
                  <input
                    type="text"
                    required
                    id="input-menu-category"
                    value={menuForm.category}
                    onChange={e => setMenuForm({...menuForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-[#00ABAB]/30 rounded-lg focus:outline-none focus:border-teal-600 glass-panel text-[#FFFFFF]"
                    placeholder="e.g. Burgers, Beverages"
                  />
                </div>
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
            <p className="text-xs text-[#9CA3AF]">Kitchen Order Token: <span className="font-mono text-[#14F1D9] font-bold">{generatedBillOrder.id}</span></p>

            <div className="my-4 p-4 bg-[#0B1120] border border-white/10 rounded-2xl text-left text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-[#9CA3AF]"><span>Customer:</span> <span className="text-white font-bold">{generatedBillOrder.customerName}</span></div>
              <div className="flex justify-between text-[#9CA3AF]"><span>Time:</span> <span className="text-white">{new Date(generatedBillOrder.createdAt).toLocaleTimeString()}</span></div>
              <div className="border-t border-white/10 my-2 pt-2 space-y-1">
                {generatedBillOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-white">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between font-black text-sm text-[#14F1D9]">
                <span>TOTAL PAID:</span>
                <span>₹{generatedBillOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (generatedBillOrder) {
                    printTicket({
                      receiptId: `KOT-${generatedBillOrder.id}`,
                      activityName: 'DEUCE FOOD & BEVERAGES',
                      customerName: generatedBillOrder.customerName,
                      date: new Date(generatedBillOrder.createdAt).toISOString(),
                      slot: 'FOOD COUNTER',
                      items: generatedBillOrder.items.map(i => ({ label: `${i.quantity}x ${i.name}`, value: `₹${(i.price * i.quantity).toFixed(2)}` })),
                      totalAmount: generatedBillOrder.totalAmount,
                      paymentStatus: 'paid',
                      quantity: generatedBillOrder.items.reduce((sum, item) => sum + item.quantity, 0),
                      paymentMethod: 'CASH',
                      counterStaff: 'Cafe Counter'
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








