/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MenuItem, FoodOrder } from '../types';
import { 
  Coffee, Utensils, ShoppingBag, Search, Plus, Minus, 
  Trash2, ArrowRight, CheckCircle2, Clock, Sparkles, X, 
  CreditCard, Flame, ChevronRight, Ticket
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DeuceCafePage: React.FC = () => {
  const { 
    menuItems, vendors, foodCart, addToFoodCart, removeFromFoodCart, 
    clearFoodCart, submitFoodOrder, currentUser 
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

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
            <Link 
              to="/" 
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 transition-all hover:border-[#14F1D9]"
            >
              <Ticket className="w-4 h-4 text-[#14F1D9]" /> Activity Ticketing
            </Link>
          </div>
        </div>

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
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-[#14F1D9]" /> Menu Selection ({filteredMenuItems.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMenuItems.map(item => {
              const vendor = vendors.find(v => v.id === item.vendorId);
              
              return (
                <div 
                  key={item.id}
                  className="glass-panel p-4 border border-white/10 hover:border-[#14F1D9]/50 rounded-2xl flex flex-col justify-between transition-all duration-300 group hover:shadow-[0_0_20px_rgba(20,241,217,0.1)] bg-[#0B1120]/80"
                >
                  <div>
                    <div className="relative h-36 rounded-xl overflow-hidden mb-3 border border-white/5">
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#050816]/90 border border-white/10 text-[9px] font-mono font-bold text-[#14F1D9] rounded uppercase">
                        {vendor?.name || item.category}
                      </span>
                    </div>

                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-sm text-white group-hover:text-[#14F1D9] transition-colors">{item.name}</h3>
                      <span className="font-mono text-sm font-black text-[#14F1D9]">₹{item.price.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] line-clamp-2 leading-relaxed mb-3">{item.description}</p>
                  </div>

                  <button
                    onClick={() => addToFoodCart(item, 1)}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-[#14F1D9] hover:text-[#050816] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/10 hover:border-[#14F1D9] shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add to Order
                  </button>
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
    </div>
  );
};
