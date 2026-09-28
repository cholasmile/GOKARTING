/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MenuItem, FoodOrder } from '../types';
import { 
  Coffee, Utensils, ShoppingBag, Search, Plus, Minus, Edit,
  Trash2, ArrowRight, CheckCircle2, Clock, Sparkles, X, 
  CreditCard, Flame, ChevronRight, Ticket, Package, AlertCircle, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BulkAddMenuModal } from './BulkAddMenuModal';

export const DeuceCafePage: React.FC = () => {
  const { 
    menuItems, vendors, foodCart, addToFoodCart, removeFromFoodCart, 
    clearFoodCart, submitFoodOrder, currentUser, addMenuItem, updateMenuItem, deleteMenuItem, 
    updateMenuItemStock, adjustMenuItemStock, orders 
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showStockManager, setShowStockManager] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockVendorFilter, setStockVendorFilter] = useState('all');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [isBulkMenuModalOpen, setIsBulkMenuModalOpen] = useState(false);

  // Extract repeat / frequently ordered items
  const repeatOrderItems = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (orders && orders.length > 0) {
      orders.forEach(o => {
        o.items?.forEach(i => {
          counts[i.menuItemId] = (counts[i.menuItemId] || 0) + i.quantity;
        });
      });
    }
    const sortedIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const items = menuItems.filter(m => sortedIds.includes(m.id));
    return items.length > 0 ? items.slice(0, 8) : menuItems.slice(0, 5);
  }, [orders, menuItems]);

  // Staff / Admin Menu Management State
  const isStaffOrAdmin = Boolean(currentUser && ['super_admin', 'food_vendor', 'cafe_staff'].includes(currentUser.role));
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: 5.0,
    category: 'Beverages',
    vendorId: vendors[0]?.id || 'vendor-forest-cafe',
    image: '',
    stockQuantity: 50,
    isAvailable: true
  });

  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultImage = menuForm.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80';
    const targetVendorId = menuForm.vendorId || (vendors[0]?.id || 'vendor-forest-cafe');
    const qty = Number(menuForm.stockQuantity) || 0;

    if (editingMenuItem) {
      updateMenuItem({
        ...editingMenuItem,
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
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
      category: 'Beverages',
      vendorId: vendors[0]?.id || 'vendor-forest-cafe',
      image: '',
      stockQuantity: 50,
      isAvailable: true
    });
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      vendorId: item.vendorId,
      image: item.image,
      stockQuantity: item.stockQuantity ?? 50,
      isAvailable: item.isAvailable
    });
    setIsMenuModalOpen(true);
  };

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState(currentUser?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [confirmedOrder, setConfirmedOrder] = useState<FoodOrder | null>(null);

  // Categories
  const categories = ['all', ...Array.from(new Set(menuItems.map(m => m.category)))];

  // Filtered menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVendor = selectedVendorFilter === 'all' || item.vendorId === selectedVendorFilter;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesVendor && matchesCategory && item.isAvailable;
  });

  const cartTotal = foodCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (foodCart.length === 0) return;

    const order = submitFoodOrder({
      customerName: customerName || 'Valued Guest',
      customerEmail: customerEmail || 'guest@deucepark.com',
      customerPhone: customerPhone || 'N/A',
      paymentMethod
    });

    setConfirmedOrder(order);
    setIsCheckoutOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white font-sans relative overflow-hidden pb-12">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#14F1D9]/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-[#00B4FF]/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Hero Banner */}
      <div className="relative py-12 px-4 sm:px-8 max-w-7xl mx-auto border-b border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14F1D9]/10 border border-[#14F1D9]/30 text-[#14F1D9] text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <Coffee className="w-3.5 h-3.5" /> Deuce Cafe & Dining
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#14F1D9]">
              Artisan Coffee & Gourmet Kitchen
            </h1>
            <p className="text-sm text-[#9CA3AF] mt-2 max-w-xl">
              Fresh wood-fired pizzas, handcrafted espresso, prime smash burgers, and refreshing gourmet beverages prepared live.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isStaffOrAdmin && (
              <>
                <button
                  onClick={() => setShowStockManager(!showStockManager)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border ${
                    showStockManager 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                      : 'bg-[#0B1120] text-[#14F1D9] border-[#14F1D9]/40 hover:bg-[#14F1D9]/10'
                  }`}
                >
                  <Package className="w-4 h-4" /> {showStockManager ? 'Hide Stock Panel' : 'Stock Positions'}
                </button>
                <button
                  onClick={() => setIsBulkMenuModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Bulk Add Items
                </button>
                <button
                  onClick={() => {
                    setEditingMenuItem(null);
                    setMenuForm({
                      name: '',
                      description: '',
                      price: 5.0,
                      category: 'Beverages',
                      vendorId: vendors[0]?.id || 'vendor-forest-cafe',
                      image: '',
                      isAvailable: true,
                      stockQuantity: 50
                    });
                    setIsMenuModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.3)]"
                >
                  <Plus className="w-4 h-4" /> Add Menu Item
                </button>
              </>
            )}
            <Link 
              to="/" 
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all hover:border-[#14F1D9]"
            >
              <Ticket className="w-4 h-4 text-[#14F1D9]" /> Activity Ticketing
            </Link>
          </div>
        </div>

        {/* Comprehensive Cafe & Retail Stock Positions Manager Panel (Staff / Admin) */}
        {isStaffOrAdmin && showStockManager && (
          <div className="mt-6 p-5 rounded-2xl bg-[#0B1120] border border-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.15)] space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Header & Metric Summary */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    Live Cafe & Snack Stock Position Manager
                  </h3>
                  <p className="text-xs text-[#9CA3AF]">
                    Full retail stock management: add, adjust (+/-), toggle availability, and delete stock positions. POS billing auto-deducts live units.
                  </p>
                </div>
              </div>

              {/* Quick Summary Badges */}
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white">
                  Total Items: {menuItems.length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  In Stock: {menuItems.filter(i => (i.stockQuantity ?? 50) > 10 && i.isAvailable).length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Low Stock (&lt;10): {menuItems.filter(i => (i.stockQuantity ?? 50) > 0 && (i.stockQuantity ?? 50) <= 10).length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  Sold Out: {menuItems.filter(i => (i.stockQuantity ?? 50) <= 0 || !i.isAvailable).length}
                </span>
                <button 
                  onClick={() => setShowStockManager(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                  title="Close Stock Manager"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stock Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#9CA3AF]" />
                <input 
                  type="text"
                  placeholder="Filter stock by name or category..."
                  value={stockSearchQuery}
                  onChange={e => setStockSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#050816] border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <select
                value={stockVendorFilter}
                onChange={e => setStockVendorFilter(e.target.value)}
                className="px-3 py-2 bg-[#050816] border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer font-mono"
              >
                <option value="all">All Outlets & Vendors</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.stallNumber})</option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsBulkMenuModalOpen(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> ⚡ Bulk Add
                </button>
                <button
                  onClick={() => {
                    setEditingMenuItem(null);
                    setMenuForm({
                      name: '',
                      description: '',
                      price: 5.0,
                      category: 'Beverages',
                      vendorId: vendors[0]?.id || 'vendor-forest-cafe',
                      image: '',
                      isAvailable: true,
                      stockQuantity: 50
                    });
                    setIsMenuModalOpen(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#14F1D9]/15 hover:bg-[#14F1D9]/25 border border-[#14F1D9]/40 text-[#14F1D9] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + New Item
                </button>
              </div>
            </div>

            {/* Detailed Stock Position Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden bg-[#050816]">
              <div className="overflow-x-auto max-h-96 custom-scrollbar">
                <table className="w-full text-left text-xs text-white">
                  <thead>
                    <tr className="bg-[#0B1120] border-b border-white/10 text-[#9CA3AF] font-mono font-bold text-[10px] uppercase">
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Outlet / Category</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Stock Position</th>
                      <th className="p-3">Availability</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {menuItems
                      .filter(item => {
                        const matchesSearch = item.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
                                              item.category.toLowerCase().includes(stockSearchQuery.toLowerCase());
                        const matchesVendor = stockVendorFilter === 'all' || item.vendorId === stockVendorFilter;
                        return matchesSearch && matchesVendor;
                      })
                      .map(item => {
                        const vendor = vendors.find(v => v.id === item.vendorId);
                        const stock = item.stockQuantity ?? 50;

                        return (
                          <tr key={`stock-row-${item.id}`} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3 font-bold text-white flex items-center gap-2.5">
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <div className="truncate">{item.name}</div>
                                <div className="text-[9px] text-[#9CA3AF] font-normal truncate max-w-xs">{item.description}</div>
                              </div>
                            </td>

                            <td className="p-3 font-mono text-[11px] text-[#9CA3AF]">
                              <div className="text-white font-bold">{vendor?.name || 'Cafe Counter'}</div>
                              <div className="text-[9px] text-[#14F1D9]">{item.category}</div>
                            </td>

                            <td className="p-3 font-mono font-black text-[#14F1D9]">
                              ₹{item.price.toFixed(2)}
                            </td>

                            <td className="p-3 font-mono">
                              <div className="flex items-center gap-1.5 flex-wrap">
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
                                    className="w-5 h-5 rounded bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer border border-white/5"
                                    title="Reduce 5 units"
                                  >
                                    -5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => adjustMenuItemStock(item.id, -1)}
                                    disabled={stock <= 0}
                                    className="w-5 h-5 rounded bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer border border-white/5 disabled:opacity-30"
                                    title="Reduce 1 unit"
                                  >
                                    -1
                                  </button>
                                  
                                  <input 
                                    type="number"
                                    min="0"
                                    value={stock}
                                    onChange={(e) => updateMenuItemStock(item.id, parseInt(e.target.value) || 0)}
                                    className="w-12 text-center py-0.5 bg-[#0B1120] border border-amber-400/50 rounded text-xs font-mono font-black text-amber-300 focus:outline-none focus:border-amber-400"
                                    title="Directly enter stock position"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => adjustMenuItemStock(item.id, 1)}
                                    className="px-1.5 h-5 rounded bg-[#14F1D9]/15 hover:bg-[#14F1D9] text-[#14F1D9] hover:text-black text-[10px] font-bold font-mono flex items-center justify-center transition-colors cursor-pointer"
                                    title="Add +1 unit"
                                  >
                                    +1
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateMenuItemStock(item.id, stock + 10)}
                                    className="px-1.5 h-5 rounded bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black text-[10px] font-bold font-mono flex items-center justify-center transition-colors cursor-pointer"
                                    title="Add +10 units"
                                  >
                                    +10
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateMenuItemStock(item.id, stock + 50)}
                                    className="px-1.5 h-5 rounded bg-[#00B4FF]/15 hover:bg-[#00B4FF] text-[#00B4FF] hover:text-black text-[10px] font-bold font-mono flex items-center justify-center transition-colors cursor-pointer"
                                    title="Add +50 units"
                                  >
                                    +50
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td className="p-3">
                              <button
                                onClick={() => updateMenuItem({ ...item, isAvailable: !item.isAvailable })}
                                className={`px-2 py-1 rounded text-[10px] font-bold font-mono uppercase border cursor-pointer transition-all ${
                                  item.isAvailable
                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60 hover:bg-emerald-900/60'
                                    : 'bg-red-950/60 text-red-400 border-red-800/60 hover:bg-red-900/60'
                                }`}
                              >
                                {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                              </button>
                            </td>

                            <td className="p-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleEditClick(item)}
                                className="px-2 py-1 text-xs rounded-lg border border-white/10 hover:border-amber-400 text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer mr-1.5"
                                title="Edit Stock Item"
                              >
                                <Edit className="h-3 w-3 inline mr-1" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to permanently delete "${item.name}" and remove its stock position?`)) {
                                    deleteMenuItem(item.id);
                                  }
                                }}
                                className="px-2 py-1 text-xs rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                                title="Delete Stock Position"
                              >
                                <Trash2 className="h-3 w-3 inline mr-1" /> Delete
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

        {/* Search & Filters */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#9CA3AF]" />
            <input 
              type="text" 
              placeholder="Search espresso, artisan pizzas, burgers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#0B1120] border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#14F1D9] transition-all font-mono"
            />
          </div>

          <select
            value={selectedVendorFilter}
            onChange={e => setSelectedVendorFilter(e.target.value)}
            className="px-4 py-3 bg-[#0B1120] border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-[#14F1D9] cursor-pointer appearance-none font-mono"
          >
            <option value="all">All Cafe Stalls & Outlets</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 custom-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] shadow-[0_0_15px_rgba(20,241,217,0.3)]'
                  : 'bg-[#0B1120] border border-white/10 text-[#9CA3AF] hover:text-white hover:border-white/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Menu Items Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Repeat / Frequently Ordered Items (First Menu Section) */}
          <div className="bg-[#0B1120]/90 p-4 border border-[#14F1D9]/30 rounded-2xl space-y-3 shadow-[0_0_20px_rgba(20,241,217,0.08)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#14F1D9] flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" /> Repeat Orders & Favorites (Quick Re-Order)
              </h3>
              <span className="text-[10px] text-[#9CA3AF] font-mono">1-Tap Quick Add</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {repeatOrderItems.map(item => {
                const isOutOfStock = (item.stockQuantity ?? 50) <= 0 || !item.isAvailable;
                return (
                  <div
                    key={`repeat-${item.id}`}
                    className="group relative bg-[#050816] border border-white/10 hover:border-[#14F1D9] rounded-xl p-2 flex flex-col justify-between aspect-square overflow-hidden transition-all duration-300 hover:shadow-[0_0_15px_rgba(20,241,217,0.2)]"
                  >
                    <div className="relative w-full h-3/5 rounded-lg overflow-hidden mb-1">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#050816]/90 border border-amber-400/40 text-[8px] font-mono font-bold text-amber-300 rounded uppercase">
                        Repeat Item
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className="font-bold text-[10px] text-white truncate leading-tight group-hover:text-[#14F1D9]">{item.name}</h4>
                        <div className="font-mono text-[10px] font-black text-[#14F1D9]">₹{item.price.toFixed(2)}</div>
                      </div>

                      <button
                        onClick={() => addToFoodCart(item, 1)}
                        disabled={isOutOfStock}
                        className="w-full py-1 mt-1 rounded-lg bg-[#14F1D9]/15 hover:bg-[#14F1D9] text-[#14F1D9] hover:text-[#050816] font-mono font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-0.5 transition-all border border-[#14F1D9]/40 cursor-pointer disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" /> Re-Order
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Menu Grid (Square Cards) */}
          <div className="flex justify-between items-center mb-2 pt-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#14F1D9]" /> Menu Selection ({filteredMenuItems.length})
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredMenuItems.map(item => {
              const vendor = vendors.find(v => v.id === item.vendorId);
              const stockQty = item.stockQuantity ?? 50;
              const isOutOfStock = stockQty <= 0 || !item.isAvailable;

              return (
                <div 
                  key={item.id}
                  className="glass-panel p-2.5 border border-white/10 hover:border-[#14F1D9]/50 rounded-2xl flex flex-col justify-between transition-all duration-300 group hover:shadow-[0_0_20px_rgba(20,241,217,0.15)] bg-[#0B1120]/80 aspect-square"
                >
                  <div className="relative w-full h-1/2 rounded-xl overflow-hidden mb-1.5 border border-white/5 shrink-0">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#050816]/90 border border-white/10 text-[8px] font-mono font-bold text-[#14F1D9] rounded uppercase truncate max-w-[70%]">
                      {vendor?.name || item.category}
                    </span>
                    <span className={`absolute top-1 right-1 px-1.5 py-0.5 border text-[8px] font-mono font-bold rounded uppercase ${
                      stockQty > 10
                        ? 'bg-[#050816]/90 border-emerald-500/30 text-emerald-400'
                        : stockQty > 0
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    }`}>
                      {stockQty > 0 ? `Stock: ${stockQty}` : 'Sold Out'}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h3 className="font-bold text-xs text-white truncate group-hover:text-[#14F1D9] transition-colors">{item.name}</h3>
                        <span className="font-mono text-xs font-black text-[#14F1D9] shrink-0">₹{item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-[10px] text-[#9CA3AF] line-clamp-1 leading-snug mt-0.5">{item.description}</p>
                    </div>

                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => addToFoodCart(item, 1)}
                        disabled={isOutOfStock}
                        className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-[#14F1D9] hover:text-[#050816] text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer border border-white/10 hover:border-[#14F1D9] shadow-sm disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                      {isStaffOrAdmin && (
                        <>
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-amber-300 border border-white/10 hover:border-amber-400 text-xs font-bold transition-all cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                deleteMenuItem(item.id);
                              }
                            }}
                            className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Order Summary & Cart */}
        <div className="space-y-6">
          <div className="glass-panel p-6 border border-white/10 rounded-2xl sticky top-24 shadow-[0_0_30px_rgba(0,0,0,0.4)] bg-[#0B1120]">
            <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#14F1D9]" /> Deuce Cafe Cart
              </h3>
              {foodCart.length > 0 && (
                <button
                  onClick={clearFoodCart}
                  className="text-[10px] text-rose-400 font-mono font-bold flex items-center gap-1 hover:text-rose-300 cursor-pointer uppercase"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar mb-4">
              {foodCart.length === 0 ? (
                <div className="py-12 text-center text-[#9CA3AF] text-xs space-y-2">
                  <Coffee className="w-10 h-10 mx-auto text-white/10" />
                  <p>Your Cafe Cart is currently empty.</p>
                  <p className="text-[10px] text-white/40">Select delicious items from the menu to get started.</p>
                </div>
              ) : (
                foodCart.map((cartItem, idx) => (
                  <div key={idx} className="p-3 bg-[#050816] border border-white/5 rounded-xl flex justify-between items-center text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-white truncate">{cartItem.name}</div>
                      <div className="text-[9px] text-[#9CA3AF] font-mono">{cartItem.vendorName}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[#00B4FF] font-bold text-xs">{cartItem.quantity}x</span>
                      <span className="font-mono font-black text-white">₹{(cartItem.price * cartItem.quantity).toFixed(2)}</span>
                      <button
                        onClick={() => removeFromFoodCart(cartItem.menuItemId)}
                        className="text-white/40 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary */}
            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-[#9CA3AF]">
                <span>Items Subtotal</span>
                <span className="font-mono font-bold text-white">₹{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#9CA3AF]">
                <span>Taxes & Kitchen Service</span>
                <span className="font-mono font-bold text-[#14F1D9]">Included</span>
              </div>
              <div className="flex justify-between items-center pt-2 text-base font-black border-t border-white/5">
                <span className="text-white">Total Payable</span>
                <span className="font-mono text-[#14F1D9]">₹{cartTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                disabled={foodCart.length === 0}
                className="w-full py-3.5 mt-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)] flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 relative animate-fade-in bg-[#0B1120]">
            <button 
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-[#14F1D9]" /> Deuce Cafe Checkout
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-4">Enter customer details for instant kitchen ticket generation.</p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Customer Name</label>
                <input 
                  type="text" 
                  required 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none"
                  placeholder="Enter name"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Email</label>
                  <input 
                    type="email" 
                    required 
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Phone</label>
                  <input 
                    type="tel" 
                    required 
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none cursor-pointer"
                >
                  <option value="upi">UPI Instant QR / GPay</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Counter Cash Payment</option>
                </select>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs text-[#9CA3AF]">Amount Due</span>
                <span className="text-xl font-black font-mono text-[#14F1D9]">₹{cartTotal.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all cursor-pointer"
              >
                Confirm Order & Get Token
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmed Order Receipt Modal */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-[#14F1D9]/40 relative animate-fade-in bg-[#050816] text-center">
            <CheckCircle2 className="w-12 h-12 text-[#14F1D9] mx-auto mb-3" />
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Order Confirmed!</h3>
            <p className="text-xs text-[#9CA3AF] mt-1">Your order has been sent to Deuce Cafe Kitchen.</p>

            <div className="my-5 p-4 bg-[#0B1120] border border-white/10 rounded-2xl">
              <span className="text-[10px] font-mono text-[#9CA3AF] uppercase block">Kitchen Pickup Token</span>
              <span className="text-3xl font-black font-mono text-[#14F1D9] tracking-wider block mt-1">
                {confirmedOrder.id}
              </span>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase font-bold">
                Status: Preparing
              </span>
            </div>

            <div className="text-left text-xs space-y-1.5 border-t border-white/10 pt-3 mb-5 font-mono text-[#9CA3AF]">
              <div className="flex justify-between"><span>Customer:</span> <span className="text-white font-bold">{confirmedOrder.customerName}</span></div>
              <div className="flex justify-between"><span>Items:</span> <span className="text-white font-bold">{confirmedOrder.items.length} items</span></div>
              <div className="flex justify-between"><span>Total:</span> <span className="text-[#14F1D9] font-bold">₹{confirmedOrder.totalAmount.toFixed(2)}</span></div>
            </div>

            <button
              onClick={() => setConfirmedOrder(null)}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
            >
              Close & Order More
            </button>
          </div>
        </div>
      )}

      {/* Staff / Admin Add/Edit Menu Item Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 relative animate-fade-in bg-[#0B1120] text-white">
            <button 
              onClick={() => {
                setIsMenuModalOpen(false);
                setEditingMenuItem(null);
              }}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white mb-1 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-[#14F1D9]" />
              {editingMenuItem ? 'Edit Cafe Menu Item' : 'Add New Cafe Menu Item'}
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-4">
              {editingMenuItem ? 'Modify item details, pricing, and outlet assignment.' : 'Add a delicious item to the live cafe menu.'}
            </p>

            <form onSubmit={handleSaveMenu} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Item Name</label>
                <input 
                  type="text" 
                  required 
                  value={menuForm.name}
                  onChange={e => setMenuForm({...menuForm, name: e.target.value})}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none"
                  placeholder="e.g. Espresso Romano, Truffle Pizza"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Description</label>
                <textarea 
                  required 
                  rows={2}
                  value={menuForm.description}
                  onChange={e => setMenuForm({...menuForm, description: e.target.value})}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none"
                  placeholder="Short appetizing description..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Price (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required 
                    value={menuForm.price}
                    onChange={e => setMenuForm({...menuForm, price: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Stock Entries</label>
                  <input 
                    type="number" 
                    min="0"
                    required 
                    value={menuForm.stockQuantity}
                    onChange={e => setMenuForm({...menuForm, stockQuantity: parseInt(e.target.value) || 0})}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-[#14F1D9] focus:border-[#14F1D9] focus:outline-none font-mono"
                    placeholder="e.g. 50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Category</label>
                  <select
                    value={menuForm.category}
                    onChange={e => setMenuForm({...menuForm, category: e.target.value})}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none cursor-pointer"
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
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Stall / Vendor</label>
                  <select
                    value={menuForm.vendorId}
                    onChange={e => setMenuForm({...menuForm, vendorId: e.target.value})}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none cursor-pointer"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Image URL (Optional)</label>
                  <input 
                    type="url" 
                    value={menuForm.image}
                    onChange={e => setMenuForm({...menuForm, image: e.target.value})}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox"
                  id="isAvailableCheckbox"
                  checked={menuForm.isAvailable}
                  onChange={e => setMenuForm({...menuForm, isAvailable: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 accent-[#14F1D9] cursor-pointer"
                />
                <label htmlFor="isAvailableCheckbox" className="text-xs text-white cursor-pointer select-none">
                  Available in Live Menu
                </label>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuModalOpen(false);
                    setEditingMenuItem(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-wider hover:scale-[1.02] transition-all cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.3)]"
                >
                  {editingMenuItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Menu Items Modal */}
      <BulkAddMenuModal
        isOpen={isBulkMenuModalOpen}
        onClose={() => setIsBulkMenuModalOpen(false)}
        defaultVendorId={vendors[0]?.id || 'vendor-forest-cafe'}
      />
    </div>
  );
};
