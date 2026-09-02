/**
 * ActivityOfferManager.tsx
 * Offer creation and management sub-component for the Admin Activity Management Panel.
 */

import React, { useState } from 'react';
import { Activity, ActivityOffer } from '../../types';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Tag, Calendar, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ActivityOfferManagerProps {
  activity: Activity;
  onAddOffer: (offer: Omit<ActivityOffer, 'id' | 'createdAt'>) => void;
  onUpdateOffer: (offer: ActivityOffer) => void;
  onDeleteOffer: (offerId: string) => void;
  onSetOfferActive: (offerId: string, active: boolean) => void;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  bannerImage: '',
  originalPrice: 0,
  offerPrice: 0,
  discountPercentage: 0,
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: '',
  termsAndConditions: '',
  isActive: true
};

const ActivityOfferManager: React.FC<ActivityOfferManagerProps> = ({
  activity,
  onAddOffer,
  onUpdateOffer,
  onDeleteOffer,
  onSetOfferActive
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<ActivityOffer | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const offers = activity.offers || [];
  const today = new Date().toISOString().split('T')[0];

  const getOfferStatus = (offer: ActivityOffer): 'active' | 'inactive' | 'expired' | 'upcoming' => {
    if (!offer.isActive) return 'inactive';
    if (offer.validUntil && offer.validUntil < today) return 'expired';
    if (offer.validFrom > today) return 'upcoming';
    return 'active';
  };

  const statusConfig = {
    active: { label: 'Live', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    inactive: { label: 'Inactive', color: 'text-[#9CA3AF] bg-white/5 border-white/10' },
    expired: { label: 'Expired', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
    upcoming: { label: 'Upcoming', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
  };

  const openAddModal = () => {
    setEditingOffer(null);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (offer: ActivityOffer) => {
    setEditingOffer(offer);
    setForm({
      name: offer.name,
      description: offer.description,
      bannerImage: offer.bannerImage || '',
      originalPrice: offer.originalPrice,
      offerPrice: offer.offerPrice,
      discountPercentage: offer.discountPercentage,
      validFrom: offer.validFrom,
      validUntil: offer.validUntil,
      termsAndConditions: offer.termsAndConditions || '',
      isActive: offer.isActive
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handlePriceChange = (field: 'originalPrice' | 'offerPrice', value: number) => {
    const updated = { ...form, [field]: value };
    if (updated.originalPrice > 0 && updated.offerPrice >= 0) {
      updated.discountPercentage = Math.round(((updated.originalPrice - updated.offerPrice) / updated.originalPrice) * 100);
    }
    setForm(updated);
  };

  const handleDiscountChange = (discount: number) => {
    const updated = { ...form, discountPercentage: discount };
    if (form.originalPrice > 0) {
      updated.offerPrice = Math.round(form.originalPrice * (1 - discount / 100));
    }
    setForm(updated);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Offer name is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (form.originalPrice <= 0) errs.originalPrice = 'Original price must be greater than 0';
    if (form.offerPrice < 0) errs.offerPrice = 'Offer price cannot be negative';
    if (form.offerPrice > form.originalPrice) errs.offerPrice = 'Offer price cannot exceed original price';
    if (!form.validFrom) errs.validFrom = 'Valid from date is required';
    if (!form.validUntil) errs.validUntil = 'Valid until date is required';
    if (form.validUntil && form.validFrom && form.validUntil < form.validFrom) {
      errs.validUntil = 'Valid until must be after valid from';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingOffer) {
      onUpdateOffer({ ...editingOffer, ...form });
    } else {
      onAddOffer({ ...form });
    }
    setIsModalOpen(false);
    setEditingOffer(null);
    setForm({ ...EMPTY_FORM });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-xs font-bold text-[#40E0D0] uppercase tracking-wider">Offers & Promotions</h5>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{offers.length} offer{offers.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#007B8B] hover:bg-[#00ABAB] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> New Offer
        </button>
      </div>

      {/* Offer Cards */}
      {offers.length === 0 ? (
        <div className="text-center py-10 text-[#9CA3AF] text-xs font-mono border border-dashed border-[#00ABAB]/20 rounded-2xl">
          No offers configured yet. Create an offer to display promotions to customers.
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map(offer => {
            const status = getOfferStatus(offer);
            const sc = statusConfig[status];
            return (
              <div key={offer.id} className="bg-[#0A0A0A]/60 border border-[#00ABAB]/20 rounded-2xl overflow-hidden">
                {/* Banner if exists */}
                {offer.bannerImage && (
                  <div className="h-24 relative">
                    <img src={offer.bannerImage} alt={offer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent flex items-center px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${sc.color}`}>{sc.label}</span>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h6 className="font-bold text-sm text-white">{offer.name}</h6>
                        {!offer.bannerImage && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${sc.color}`}>{sc.label}</span>
                        )}
                        <span className="bg-[#007B8B]/20 text-[#40E0D0] border border-[#007B8B]/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {offer.discountPercentage}% OFF
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9CA3AF] mt-1">{offer.description}</p>

                      <div className="flex flex-wrap gap-3 mt-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[#9CA3AF] line-through text-xs font-mono">?{offer.originalPrice}</span>
                          <span className="text-[#40E0D0] font-black text-base font-mono">?{offer.offerPrice}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF] font-mono">
                          <Calendar className="h-3 w-3" />
                          {offer.validFrom} ? {offer.validUntil}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 items-end">
                      <button
                        onClick={() => openEditModal(offer)}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-[#00ABAB]/30 hover:bg-[#0A0A0A] text-white transition-colors cursor-pointer"
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => onSetOfferActive(offer.id, !offer.isActive)}
                        className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                          offer.isActive
                            ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        {offer.isActive ? <ToggleLeft className="h-3 w-3" /> : <ToggleRight className="h-3 w-3" />}
                        {offer.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete offer "${offer.name}"?`)) onDeleteOffer(offer.id); }}
                        className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>

                  {offer.termsAndConditions && (
                    <p className="text-[10px] text-[#9CA3AF]/70 mt-2 pt-2 border-t border-white/5">
                      T&C: {offer.termsAndConditions}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9000] bg-black/80 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div
            className="w-full max-w-2xl bg-[#0B0F14] border border-[#00ABAB]/30 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#00ABAB]/20">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-[#40E0D0]" />
                <h3 className="font-bold text-base text-white">{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-[#9CA3AF] cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Offer Name */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Offer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Weekend Special, Flash Sale"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none"
                />
                {errors.name && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Offer Description *</label>
                <textarea
                  placeholder="Describe the offer for customers..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none resize-none"
                />
                {errors.description && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.description}</p>}
              </div>

              {/* Banner Image URL */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Banner Image URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={form.bannerImage}
                  onChange={e => setForm(f => ({ ...f, bannerImage: e.target.value }))}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none"
                />
              </div>

              {/* Pricing Section */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Original Price (?) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.originalPrice}
                    onChange={e => handlePriceChange('originalPrice', Number(e.target.value))}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
                  />
                  {errors.originalPrice && <p className="text-red-400 text-[10px] mt-1">{errors.originalPrice}</p>}
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Discount % *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.discountPercentage}
                    onChange={e => handleDiscountChange(Number(e.target.value))}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Offer Price (?) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.offerPrice}
                    onChange={e => handlePriceChange('offerPrice', Number(e.target.value))}
                    className="w-full bg-[#050816] border border-[#40E0D0]/40 rounded-xl px-3 py-2.5 text-sm text-[#40E0D0] font-bold focus:border-[#40E0D0] focus:outline-none"
                  />
                  {errors.offerPrice && <p className="text-red-400 text-[10px] mt-1">{errors.offerPrice}</p>}
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Valid From *</label>
                  <input
                    type="date"
                    value={form.validFrom}
                    onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
                  />
                  {errors.validFrom && <p className="text-red-400 text-[10px] mt-1">{errors.validFrom}</p>}
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Valid Until *</label>
                  <input
                    type="date"
                    value={form.validUntil}
                    min={form.validFrom}
                    onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                    className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#40E0D0] focus:outline-none"
                  />
                  {errors.validUntil && <p className="text-red-400 text-[10px] mt-1">{errors.validUntil}</p>}
                </div>
              </div>

              {/* Terms */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Terms & Conditions (optional)</label>
                <textarea
                  placeholder="Cannot be combined with other offers. Subject to availability..."
                  value={form.termsAndConditions}
                  onChange={e => setForm(f => ({ ...f, termsAndConditions: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none resize-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#050816] rounded-xl border border-white/5">
                <div>
                  <p className="text-sm text-white font-bold">Activate Immediately</p>
                  <p className="text-[10px] text-[#9CA3AF]">When active, this offer is visible to customers</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.isActive ? 'bg-[#007B8B]' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.isActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-[#9CA3AF] text-sm font-bold hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#007B8B] to-[#00ABAB] text-white text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {editingOffer ? 'Update Offer' : 'Create Offer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityOfferManager;
