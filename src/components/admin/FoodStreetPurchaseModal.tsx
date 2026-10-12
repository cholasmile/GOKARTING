/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FoodStreetPurchaseModal
 * Comprehensive Sub-Admin modal to record Food Street Purchases and materials receipt.
 * Supports:
 * - Purchase date, supplier name & invoice number
 * - Item name with auto-match to existing inventory items (prevents duplicate spelling/import items)
 * - Category, unit (kg, g, litre, ml, packet, bottle, piece, box, bag)
 * - Quantity purchased, unit rate, discount, GST% (0, 5, 12, 18, 28)
 * - Auto-calculated total purchase value
 * - Goods receipt breakdown: Quantity received, quantity rejected/damaged, quantity accepted into stock
 * - Amount paid, payment method, outstanding balance
 * - Optional invoice/receipt upload or link, and remarks
 */

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { FoodStreetPurchaseRecord, InventoryItem } from '../../types';
import { 
  ShoppingBag, Plus, Save, X, AlertTriangle, CheckCircle, 
  Package, Calendar, Truck, CreditCard, DollarSign, FileText, ArrowRight
} from 'lucide-react';

interface FoodStreetPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVendorId?: string;
  onSuccess?: (record: FoodStreetPurchaseRecord) => void;
}

const UNITS = ['kg', 'g', 'litre', 'ml', 'packet', 'bottle', 'piece', 'box', 'bag'];
const GST_RATES = [0, 5, 12, 18, 28];
const PAYMENT_METHODS: Array<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit'> = [
  'Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Credit'
];

const FOOD_CATEGORIES = [
  'Groceries & Grains',
  'Cooking Oil & Ghee',
  'Flour & Bakery Items',
  'Vegetables & Fresh Produce',
  'Dairy & Milk Products',
  'Beverages & Soft Drinks',
  'Tea & Coffee',
  'Snacks & Packaged Foods',
  'Disposables & Packaging',
  'Cleaning & Kitchen Supplies',
  'Other Supplies'
];

export const FoodStreetPurchaseModal: React.FC<FoodStreetPurchaseModalProps> = ({
  isOpen,
  onClose,
  defaultVendorId,
  onSuccess
}) => {
  const { vendors, inventory, addFoodStreetPurchase, currentUser } = useAppContext();

  const [vendorId, setVendorId] = useState(defaultVendorId || vendors[0]?.id || 'vendor-forest-cafe');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  
  // Item selection or new creation
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>('new');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('Groceries & Grains');
  const [unit, setUnit] = useState('kg');
  
  // Pricing & Quantities
  const [quantityPurchased, setQuantityPurchased] = useState<number>(10);
  const [ratePerUnit, setRatePerUnit] = useState<number>(50);
  const [discount, setDiscount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(5);

  // Goods Receipt Verification
  const [quantityReceived, setQuantityReceived] = useState<number>(10);
  const [quantityRejected, setQuantityRejected] = useState<number>(0);
  
  // Financials
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Credit'>('Cash');
  const [remarks, setRemarks] = useState('');
  const [invoiceReceiptUrl, setInvoiceReceiptUrl] = useState('');
  const [autoAcceptStock, setAutoAcceptStock] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // Filter inventory items for this vendor
  const stallInventoryItems = useMemo(() => {
    return inventory.filter(i => i.vendorId === vendorId);
  }, [inventory, vendorId]);

  // When user selects existing inventory item
  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedInventoryItemId(val);
    if (val !== 'new') {
      const existing = inventory.find(i => i.id === val);
      if (existing) {
        setItemName(existing.name);
        setUnit(existing.unit || 'kg');
        if (existing.category) setItemCategory(existing.category);
        if (existing.costPrice) setRatePerUnit(existing.costPrice);
      }
    } else {
      setItemName('');
    }
  };

  // Calculations
  const grossValue = Math.max(0, quantityPurchased * ratePerUnit - discount);
  const gstAmount = Math.round(((grossValue * gstRate) / 100) * 100) / 100;
  const totalPurchaseValue = Math.round((grossValue + gstAmount) * 100) / 100;
  const quantityAccepted = Math.max(0, quantityReceived - quantityRejected);
  const outstandingBalance = Math.max(0, totalPurchaseValue - amountPaid);
  
  const paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' = 
    amountPaid <= 0 ? 'Unpaid' : amountPaid >= totalPurchaseValue ? 'Paid' : 'Partially Paid';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierName.trim()) {
      setError('Supplier Name is required.');
      return;
    }
    if (!supplierInvoiceNumber.trim()) {
      setError('Supplier Invoice Number is required.');
      return;
    }
    if (!itemName.trim()) {
      setError('Item Name is required.');
      return;
    }
    if (quantityPurchased <= 0) {
      setError('Quantity purchased must be greater than 0.');
      return;
    }
    if (quantityAccepted < 0) {
      setError('Accepted quantity cannot be negative.');
      return;
    }

    try {
      const record = addFoodStreetPurchase({
        purchaseDate,
        vendorId,
        supplierName: supplierName.trim(),
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        itemName: itemName.trim(),
        itemCategory,
        itemId: selectedInventoryItemId !== 'new' ? selectedInventoryItemId : undefined,
        quantityPurchased,
        unit,
        ratePerUnit,
        discount,
        gstRate,
        gstAmount,
        totalPurchaseValue,
        quantityReceived,
        quantityRejected,
        quantityAccepted,
        amountPaid,
        outstandingBalance,
        paymentMethod,
        paymentStatus,
        invoiceReceiptUrl: invoiceReceiptUrl.trim() || undefined,
        remarks: remarks.trim() || undefined,
        status: autoAcceptStock && quantityAccepted > 0 ? 'accepted_into_stock' : 'pending_receipt',
        recordedBy: currentUser?.name || 'Sub-Admin'
      });

      if (onSuccess) onSuccess(record);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record purchase.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-[0_0_50px_rgba(0,171,171,0.25)]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#1C1C1C] flex items-center justify-between sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#00ABAB]/15 border border-[#00ABAB]/30 rounded-2xl text-[#40E0D0]">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-sans">
                Food Street Purchase & Goods Receipt Entry
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Record supplier invoices, verify received quantities, and update Food Street inventory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Invoice & Supplier Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold text-[#40E0D0] tracking-wider flex items-center gap-2">
              <Truck className="w-3.5 h-3.5" /> 1. Supplier & Invoice Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Stall / Food Vendor *</label>
                <select
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none cursor-pointer"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.stallNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Purchase Date *</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[#666] absolute left-3.5 top-3" />
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Supplier Invoice Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-SUP-2024-89"
                  value={supplierInvoiceNumber}
                  onChange={e => setSupplierInvoiceNumber(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Supplier / Vendor Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yelagiri Fresh Dairy & Agro Traders"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Invoice Doc / Receipt Link</label>
                <input
                  type="text"
                  placeholder="e.g. Receipt URL or Ref"
                  value={invoiceReceiptUrl}
                  onChange={e => setInvoiceReceiptUrl(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Item & Material Definition */}
          <div className="space-y-4 pt-3 border-t border-[#1C1C1C]">
            <h3 className="text-xs font-mono uppercase font-bold text-amber-400 tracking-wider flex items-center gap-2">
              <Package className="w-3.5 h-3.5" /> 2. Material & Item Definition
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Link to Existing Item</label>
                <select
                  value={selectedInventoryItemId}
                  onChange={handleItemSelect}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none cursor-pointer"
                >
                  <option value="new">➕ Add New Item to Stock</option>
                  {stallInventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.currentStock} {item.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice, Milk, Coffee Beans"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Item Category</label>
                <select
                  value={itemCategory}
                  onChange={e => setItemCategory(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none cursor-pointer"
                >
                  {FOOD_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Purchase Value, Rates & Goods Receipt */}
          <div className="space-y-4 pt-3 border-t border-[#1C1C1C]">
            <h3 className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" /> 3. Quantity, Rates & Goods Receipt
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Qty Purchased *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={quantityPurchased}
                  onChange={e => {
                    const q = Number(e.target.value) || 0;
                    setQuantityPurchased(q);
                    setQuantityReceived(q); // default received = purchased
                  }}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Unit of Measure *</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none cursor-pointer"
                >
                  {UNITS.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Rate per Unit (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={ratePerUnit}
                  onChange={e => setRatePerUnit(Number(e.target.value) || 0)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value) || 0)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none"
                />
              </div>
            </div>

            {/* Goods Receipt Verification Row */}
            <div className="p-4 bg-[#141414] border border-[#262626] rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Quantity Received</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={quantityReceived}
                  onChange={e => setQuantityReceived(Number(e.target.value) || 0)}
                  className="w-full bg-[#0A0A0A] border border-[#333] focus:border-teal-400 rounded-xl px-3.5 py-2 text-white font-mono text-sm outline-none"
                />
                <p className="text-[10px] text-[#666] mt-1 font-mono">Actual physical goods delivered</p>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-rose-400 mb-1 font-bold">Quantity Damaged / Rejected</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={quantityRejected}
                  onChange={e => setQuantityRejected(Number(e.target.value) || 0)}
                  className="w-full bg-[#0A0A0A] border border-rose-900/50 focus:border-rose-500 rounded-xl px-3.5 py-2 text-rose-300 font-mono text-sm outline-none"
                />
                <p className="text-[10px] text-[#666] mt-1 font-mono">Excluded from inventory stock</p>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-emerald-400 mb-1 font-bold">Accepted into Stock</label>
                <div className="w-full bg-[#0A0A0A] border border-emerald-900/50 rounded-xl px-3.5 py-2 text-emerald-400 font-mono font-black text-sm flex items-center justify-between">
                  <span>{quantityAccepted} {unit}</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[10px] text-[#666] mt-1 font-mono">Credits directly to Food Street inventory</p>
              </div>
            </div>

            {/* Calculations Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#050816] border border-[#00ABAB]/30 rounded-2xl font-mono">
              <div>
                <span className="text-[10px] text-[#94A3B8] block">Applicable GST:</span>
                <select
                  value={gstRate}
                  onChange={e => setGstRate(Number(e.target.value))}
                  className="bg-transparent text-white font-bold text-xs border-b border-[#00ABAB]/40 outline-none cursor-pointer mt-0.5"
                >
                  {GST_RATES.map(r => (
                    <option key={r} value={r} className="bg-[#141414] text-white">{r}% GST</option>
                  ))}
                </select>
                <span className="text-[10px] text-teal-400 block mt-1">₹{gstAmount.toFixed(2)}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#94A3B8] block">Total Purchase Value:</span>
                <span className="text-sm font-black text-white block mt-1">₹{totalPurchaseValue.toFixed(2)}</span>
                <span className="text-[9px] text-[#666] block">Incl. ₹{gstAmount.toFixed(2)} GST</span>
              </div>

              <div>
                <span className="text-[10px] text-[#94A3B8] block">Amount Paid:</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amountPaid}
                  onChange={e => setAmountPaid(Number(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#141414] border border-[#333] focus:border-teal-400 rounded-lg px-2 py-1 text-white text-xs mt-1 outline-none font-bold"
                />
              </div>

              <div>
                <span className="text-[10px] text-[#94A3B8] block">Outstanding Balance:</span>
                <span className={`text-sm font-black block mt-1 ${outstandingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  ₹{outstandingBalance.toFixed(2)}
                </span>
                <span className="text-[9px] text-[#888] uppercase block">{paymentStatus}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Payment Method & Remarks */}
          <div className="space-y-4 pt-3 border-t border-[#1C1C1C]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none cursor-pointer"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Remarks / Batch / Expiry Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Batch #458, Fresh grade A, Stored in Dry Storage"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>
            </div>

            {/* Immediate Acceptance Checkbox */}
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="chk-auto-accept"
                  checked={autoAcceptStock}
                  onChange={e => setAutoAcceptStock(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-400 focus:ring-0 cursor-pointer accent-[#00ABAB]"
                />
                <label htmlFor="chk-auto-accept" className="text-xs text-white cursor-pointer">
                  <strong>Automatically accept verified quantity into Food Street stock immediately</strong>
                  <span className="text-[10px] text-[#94A3B8] block">
                    Updates available stock position in Food Street page & posts transaction to Finance.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#1C1C1C] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#262626] hover:bg-white/5 text-xs text-[#94A3B8] hover:text-white font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold text-xs flex items-center gap-2 hover:opacity-95 shadow-[0_0_20px_rgba(0,171,171,0.3)] transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Purchase & Credit Inventory
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
