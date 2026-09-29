/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { MenuItem } from '../types';
import { Plus, Trash2, X, Check, ShoppingBag, Sparkles, AlertCircle } from 'lucide-react';

interface BulkAddMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVendorId?: string;
}

interface DraftRow {
  name: string;
  category: string;
  vendorId: string;
  price: string;
  purchasePrice: string;
  stockQuantity: string;
  description: string;
  isAvailable: boolean;
  image: string;
}

const CATEGORY_OPTIONS = [
  'Beverages',
  'Wood-Fired Pizza',
  'Smash Burgers',
  'Starters & Sides',
  'Desserts & Shakes',
  'Snacks & Fast Food',
  'Main Course',
  'Retail & Merchandise',
  'Souvenirs & Apparel',
  'Combos & Offers'
];

const DEFAULT_IMAGE_PLACEHOLDER = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80';

export const BulkAddMenuModal: React.FC<BulkAddMenuModalProps> = ({
  isOpen,
  onClose,
  defaultVendorId
}) => {
  const { vendors, addBulkMenuItems } = useAppContext();

  const initialVendor = defaultVendorId || (vendors.length > 0 ? vendors[0].id : 'vendor-forest-cafe');

  const createEmptyRow = (vendorId = initialVendor, category = 'Beverages'): DraftRow => ({
    name: '',
    category,
    vendorId,
    price: '',
    purchasePrice: '',
    stockQuantity: '50',
    description: '',
    isAvailable: true,
    image: DEFAULT_IMAGE_PLACEHOLDER
  });

  const [rows, setRows] = useState<DraftRow[]>([
    createEmptyRow(initialVendor, 'Beverages'),
    createEmptyRow(initialVendor, 'Beverages'),
    createEmptyRow(initialVendor, 'Beverages')
  ]);

  const [selectedVendorForBatch, setSelectedVendorForBatch] = useState<string>(initialVendor);
  const [selectedCategoryForBatch, setSelectedCategoryForBatch] = useState<string>('Beverages');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const targetVendor = defaultVendorId || (vendors.length > 0 ? vendors[0].id : 'vendor-forest-cafe');
      setSelectedVendorForBatch(targetVendor);
      setRows([
        createEmptyRow(targetVendor, 'Beverages'),
        createEmptyRow(targetVendor, 'Beverages'),
        createEmptyRow(targetVendor, 'Beverages')
      ]);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, defaultVendorId, vendors]);

  if (!isOpen) return null;

  const handleAddRows = (count: number) => {
    const newRows: DraftRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push(createEmptyRow(selectedVendorForBatch, selectedCategoryForBatch));
    }
    setRows(prev => [...prev, ...newRows]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof DraftRow, value: any) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleApplyVendorToAll = (vendorId: string) => {
    setSelectedVendorForBatch(vendorId);
    setRows(prev => prev.map(row => ({ ...row, vendorId })));
  };

  const handleApplyCategoryToAll = (category: string) => {
    setSelectedCategoryForBatch(category);
    setRows(prev => prev.map(row => ({ ...row, category })));
  };

  const handleClearAll = () => {
    setRows([createEmptyRow(selectedVendorForBatch, selectedCategoryForBatch)]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    // Filter out rows that have empty name and zero/invalid price
    const validRows = rows.filter(r => r.name.trim() !== '' && !isNaN(parseFloat(r.price)) && parseFloat(r.price) >= 0);

    if (validRows.length === 0) {
      setErrorMessage('Please fill in at least one item with a valid name and price.');
      return;
    }

    const itemsToAdd: Array<Omit<MenuItem, 'id'>> = validRows.map(r => ({
      vendorId: r.vendorId || selectedVendorForBatch,
      name: r.name.trim(),
      description: r.description.trim() || `${r.name.trim()} - Freshly prepared menu item.`,
      price: parseFloat(r.price) || 0,
      purchasePrice: parseFloat(r.purchasePrice) || 0,
      stockQuantity: parseInt(r.stockQuantity) || 50,
      category: r.category.trim() || 'General',
      isAvailable: r.isAvailable,
      image: r.image.trim() || DEFAULT_IMAGE_PLACEHOLDER
    }));

    try {
      addBulkMenuItems(itemsToAdd);
      setSuccessMessage(`🎉 Successfully added ${itemsToAdd.length} menu/retail item${itemsToAdd.length > 1 ? 's' : ''} to central POS & store!`);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save menu items.');
    }
  };

  const filledRowCount = rows.filter(r => r.name.trim() !== '' && !isNaN(parseFloat(r.price))).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0B0F14] border border-[#00ABAB]/40 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#F8FAFC]">
        {/* Header */}
        <div className="p-5 border-b border-[#00ABAB]/30 bg-[#121A24] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#00ABAB]/20 text-[#40E0D0] rounded-xl border border-[#00ABAB]/40">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white font-sans">⚡ Bulk Add N Menu & Retail Items</h3>
                <span className="bg-[#99F6E4]/25 text-[#99F6E4] border border-[#99F6E4]/30 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full font-mono">
                  Fast Central POS Sync
                </span>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                Add multiple food, beverage, or retail store items in a single click for Central Ticketing POS & Food Counter.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Batch Controls */}
        <div className="p-4 bg-[#0A0A0A] border-b border-[#00ABAB]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 font-bold uppercase font-mono text-[10px]">Batch Stalls:</span>
            <select
              value={selectedVendorForBatch}
              onChange={(e) => handleApplyVendorToAll(e.target.value)}
              className="bg-[#121A24] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1 text-white font-sans text-xs focus:outline-none focus:border-[#40E0D0]"
            >
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.stallNumber})</option>
              ))}
            </select>

            <span className="text-gray-400 font-bold uppercase font-mono text-[10px] ml-2">Batch Category:</span>
            <select
              value={selectedCategoryForBatch}
              onChange={(e) => handleApplyCategoryToAll(e.target.value)}
              className="bg-[#121A24] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1 text-white font-sans text-xs focus:outline-none focus:border-[#40E0D0]"
            >
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddRows(1)}
              className="px-2.5 py-1 rounded-lg bg-[#121A24] hover:bg-[#1E293B] border border-[#00ABAB]/30 text-white font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-[#40E0D0]" /> +1 Item
            </button>
            <button
              type="button"
              onClick={() => handleAddRows(5)}
              className="px-2.5 py-1 rounded-lg bg-[#121A24] hover:bg-[#1E293B] border border-[#00ABAB]/30 text-white font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#40E0D0]" /> +5 Items
            </button>
            <button
              type="button"
              onClick={() => handleAddRows(10)}
              className="px-2.5 py-1 rounded-lg bg-[#121A24] hover:bg-[#1E293B] border border-[#00ABAB]/30 text-white font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#40E0D0]" /> +10 Items
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 font-bold transition-all cursor-pointer"
            >
              Clear Rows
            </button>
          </div>
        </div>

        {/* Feedback banners */}
        {successMessage && (
          <div className="mx-4 mt-4 p-3 bg-teal-950/80 border border-[#00ABAB] rounded-xl text-[#40E0D0] text-xs font-bold flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mt-4 p-3 bg-red-950/80 border border-red-500 rounded-xl text-red-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Form & Table */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-[#00ABAB]/30 bg-[#0A0A0A]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#121A24] border-b border-[#00ABAB]/30 text-gray-400 font-mono font-bold">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 min-w-[160px]">Item Name *</th>
                  <th className="p-3 min-w-[140px]">Stall / Vendor</th>
                  <th className="p-3 min-w-[130px]">Category</th>
                  <th className="p-3 min-w-[90px]">Selling ₹ *</th>
                  <th className="p-3 min-w-[90px]">Purchase ₹ (Trade)</th>
                  <th className="p-3 min-w-[75px]">Initial Stk</th>
                  <th className="p-3 min-w-[140px]">Description</th>
                  <th className="p-3 w-16 text-center">In Stock</th>
                  <th className="p-3 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00ABAB]/20">
                {rows.map((row, index) => (
                  <tr key={`row-${index}`} className="hover:bg-[#121A24]/40 transition-colors">
                    <td className="p-3 text-center text-gray-500 font-mono font-bold">{index + 1}</td>
                    
                    {/* Item Name */}
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="e.g. Cold Coffee / Goggles"
                        value={row.name}
                        onChange={(e) => handleRowChange(index, 'name', e.target.value)}
                        className="w-full bg-[#121A24] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1.5 text-white font-sans text-xs focus:outline-none focus:border-[#40E0D0]"
                      />
                    </td>

                    {/* Vendor */}
                    <td className="p-2">
                      <select
                        value={row.vendorId}
                        onChange={(e) => handleRowChange(index, 'vendorId', e.target.value)}
                        className="w-full bg-[#121A24] border border-[#00ABAB]/30 rounded-lg px-2 py-1.5 text-white font-sans text-xs focus:outline-none focus:border-[#40E0D0]"
                      >
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Category */}
                    <td className="p-2">
                      <input
                        type="text"
                        list={`category-list-${index}`}
                        placeholder="Category"
                        value={row.category}
                        onChange={(e) => handleRowChange(index, 'category', e.target.value)}
                        className="w-full bg-[#121A24] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1.5 text-white font-sans text-xs focus:outline-none focus:border-[#40E0D0]"
                      />
                      <datalist id={`category-list-${index}`}>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </td>

                    {/* Selling Price */}
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={row.price}
                        onChange={(e) => handleRowChange(index, 'price', e.target.value)}
                        className="w-full bg-[#121A24] border border-[#00ABAB]/30 rounded-lg px-2 py-1.5 text-[#40E0D0] font-mono font-bold text-xs focus:outline-none focus:border-[#40E0D0]"
                        title="Selling Price to Guest"
                      />
                    </td>

                    {/* Purchase Price (Trade Cost) */}
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={row.purchasePrice}
                        onChange={(e) => handleRowChange(index, 'purchasePrice', e.target.value)}
                        className="w-full bg-[#121A24] border border-amber-400/30 rounded-lg px-2 py-1.5 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                        title="Vendor Trade / Purchase Cost"
                      />
                    </td>

                    {/* Initial Stock */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="50"
                        value={row.stockQuantity}
                        onChange={(e) => handleRowChange(index, 'stockQuantity', e.target.value)}
                        className="w-full bg-[#121A24] border border-[#00ABAB]/30 rounded-lg px-2 py-1.5 text-white font-mono font-bold text-xs focus:outline-none focus:border-[#40E0D0]"
                        title="Initial Stock Quantity"
                      />
                    </td>

                    {/* Description */}
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder="Brief details..."
                        value={row.description}
                        onChange={(e) => handleRowChange(index, 'description', e.target.value)}
                        className="w-full bg-[#121A24] border border-[#00ABAB]/30 rounded-lg px-2.5 py-1.5 text-gray-300 font-sans text-xs focus:outline-none focus:border-[#40E0D0]"
                      />
                    </td>

                    {/* Availability */}
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.isAvailable}
                        onChange={(e) => handleRowChange(index, 'isAvailable', e.target.checked)}
                        className="h-4 w-4 rounded accent-[#40E0D0] cursor-pointer"
                      />
                    </td>

                    {/* Delete row */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        disabled={rows.length <= 1}
                        className="text-gray-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-gray-500 p-1 rounded-md hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-400 font-mono">
              Ready to save <strong className="text-[#40E0D0]">{filledRowCount}</strong> item{filledRowCount !== 1 ? 's' : ''} to menu.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white rounded-xl border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-extrabold btn-glow text-[#0B0F14] rounded-xl flex items-center gap-2 cursor-pointer transition-all"
              >
                <Check className="h-4 w-4" /> Save All {filledRowCount > 0 ? filledRowCount : ''} Items
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
