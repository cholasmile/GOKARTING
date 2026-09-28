/**
 * ActivityManagementPanel.tsx
 * Main Activity Management Panel for the Admin Dashboard.
 * Provides rich activity editing, photo gallery management, and offers/promotions CRUD.
 * Displayed as a new tab inside the existing Admin Panel � no existing tabs are modified.
 */

import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Activity, ActivityOffer } from '../../types';
import ActivityPhotoManager from './ActivityPhotoManager';
import ActivityOfferManager from './ActivityOfferManager';
import {
  Edit, Image as ImageIcon, Tag, ChevronDown, ChevronUp,
  Eye, EyeOff, GripVertical, Clock, Users as UsersIcon,
  Shield, BookOpen, CheckCircle, X, Save, Plus
} from 'lucide-react';

type SubView = 'list' | 'details' | 'photos' | 'offers';

const ActivityManagementPanel: React.FC = () => {
  const {
    activities,
    addActivityPhoto, removeActivityPhoto, reorderActivityPhotos, setCoverPhoto,
    updateActivityExtended,
    addActivityOffer, updateActivityOffer, deleteActivityOffer, setOfferActive
  } = useAppContext();

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [subView, setSubView] = useState<SubView>('list');

  // Extended details edit form state
  const [detailsForm, setDetailsForm] = useState({
    shortDescription: '',
    detailedDescription: '',
    duration: '',
    ageRequirement: '',
    rulesString: '',
    isActive: true,
    displayOrder: 0
  });
  const [detailsSaved, setDetailsSaved] = useState(false);

  const selectedActivity = activities.find(a => a.id === selectedActivityId);

  const sortedActivities = activities.filter(a => !a.id.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('arena')).sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

  const today = new Date().toISOString().split('T')[0];

  const getActiveOffer = (act: Activity): ActivityOffer | undefined => {
    return (act.offers || []).find(o => o.isActive && o.validFrom <= today && (!o.validUntil || o.validUntil >= today));
  };

  const handleSelectActivity = (actId: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act) return;
    setSelectedActivityId(actId);
    setDetailsForm({
      shortDescription: act.shortDescription || '',
      detailedDescription: act.detailedDescription || '',
      duration: act.duration || '',
      ageRequirement: act.ageRequirement || '',
      rulesString: (act.rules || []).join('\n'),
      isActive: act.isActive !== false,
      displayOrder: act.displayOrder ?? 0
    });
    setSubView('details');
    setDetailsSaved(false);
  };

  const handleSaveDetails = () => {
    if (!selectedActivityId) return;
    updateActivityExtended(selectedActivityId, {
      shortDescription: detailsForm.shortDescription,
      detailedDescription: detailsForm.detailedDescription,
      duration: detailsForm.duration,
      ageRequirement: detailsForm.ageRequirement,
      rules: detailsForm.rulesString.split('\n').map(r => r.trim()).filter(Boolean),
      isActive: detailsForm.isActive,
      displayOrder: Number(detailsForm.displayOrder)
    });
    setDetailsSaved(true);
    setTimeout(() => setDetailsSaved(false), 2000);
  };

  const subTabs: { key: SubView; label: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Details', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { key: 'photos', label: 'Photos', icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { key: 'offers', label: 'Offers', icon: <Tag className="h-3.5 w-3.5" /> }
  ];

  // -- ACTIVITY LIST VIEW --
  if (subView === 'list' || !selectedActivity) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-bold text-lg text-white">Activity Management</h3>
          <p className="text-xs text-[#9CA3AF]">Select an activity to manage its details, photos, and promotional offers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedActivities.map(act => {
            const activeOffer = getActiveOffer(act);
            const totalOffers = (act.offers || []).length;
            const photoCount = (act.photos || []).length;
            const isInactive = act.isActive === false;

            return (
              <div
                key={act.id}
                className={`glass-panel border rounded-2xl overflow-hidden transition-all hover:border-[#00ABAB]/60 cursor-pointer flex flex-col ${
                  isInactive ? 'border-white/10 opacity-60' : 'border-[#00ABAB]/30'
                }`}
                onClick={() => handleSelectActivity(act.id)}
              >
                {/* Cover image */}
                <div className="h-36 relative">
                  <img src={act.image} alt={act.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  {isInactive && (
                    <div className="absolute top-2 left-2 bg-red-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <EyeOff className="h-2.5 w-2.5" /> Inactive
                    </div>
                  )}
                  {activeOffer && (
                    <div className="absolute top-2 right-2 bg-[#007B8B] text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag className="h-2.5 w-2.5" /> {activeOffer.discountPercentage}% OFF
                    </div>
                  )}
                  <div className="absolute bottom-2 left-3">
                    <h4 className="font-bold text-white text-sm">{act.name}</h4>
                  </div>
                </div>

                <div className="p-4 flex-1 space-y-3">
                  <p className="text-[11px] text-[#9CA3AF] line-clamp-2 leading-relaxed">
                    {act.shortDescription || act.description}
                  </p>

                  <div className="flex gap-3 text-[10px] text-[#9CA3AF] font-mono">
                    <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3 text-[#40E0D0]" /> {photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3 text-[#40E0D0]" /> {totalOffers} offer{totalOffers !== 1 ? 's' : ''}</span>
                    {act.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-[#40E0D0]" /> {act.duration}</span>}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); handleSelectActivity(act.id); }}
                    className="w-full py-2 text-xs font-bold text-[#40E0D0] border border-[#00ABAB]/40 hover:bg-[#007B8B]/20 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit className="h-3.5 w-3.5" /> Manage Activity
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -- DETAIL / PHOTO / OFFER VIEWS --
  return (
    <div className="space-y-4">
      {/* Back + Activity Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setSubView('list'); setSelectedActivityId(null); }}
          className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#40E0D0] transition-colors cursor-pointer font-bold"
        >
          ? All Activities
        </button>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-sm font-bold text-white">{selectedActivity.name}</span>
        {selectedActivity.isActive === false && (
          <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">Inactive</span>
        )}
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-[#00ABAB]/20 pb-px">
        {subTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubView(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              subView === tab.key
                ? 'border-[#40E0D0] text-[#40E0D0] bg-[#0A0A0A]'
                : 'border-transparent text-[#9CA3AF] hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
            {tab.key === 'photos' && (selectedActivity.photos?.length ?? 0) > 0 && (
              <span className="bg-[#007B8B]/30 text-[#40E0D0] text-[9px] px-1.5 py-0.5 rounded-full font-mono">{selectedActivity.photos!.length}</span>
            )}
            {tab.key === 'offers' && (selectedActivity.offers?.length ?? 0) > 0 && (
              <span className="bg-[#007B8B]/30 text-[#40E0D0] text-[9px] px-1.5 py-0.5 rounded-full font-mono">{selectedActivity.offers!.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* -- DETAILS SUB-VIEW -- */}
      {subView === 'details' && (
        <div className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Short Description */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Short Description</label>
              <input
                type="text"
                placeholder="One-liner for activity cards..."
                value={detailsForm.shortDescription}
                onChange={e => setDetailsForm(f => ({ ...f, shortDescription: e.target.value }))}
                className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none"
              />
            </div>

            {/* Detailed Description */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Detailed Description</label>
              <textarea
                placeholder="Full description shown on the activity detail page..."
                value={detailsForm.detailedDescription}
                onChange={e => setDetailsForm(f => ({ ...f, detailedDescription: e.target.value }))}
                rows={4}
                className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none resize-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Duration</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="e.g. 30 mins, 1 hour"
                  value={detailsForm.duration}
                  onChange={e => setDetailsForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none"
                />
              </div>
            </div>

            {/* Age Requirement */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Age Requirement</label>
              <div className="relative">
                <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="e.g. 6+ years, All ages"
                  value={detailsForm.ageRequirement}
                  onChange={e => setDetailsForm(f => ({ ...f, ageRequirement: e.target.value }))}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none"
                />
              </div>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1">Display Order</label>
              <div className="relative">
                <GripVertical className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <input
                  type="number"
                  min="0"
                  placeholder="0 = first"
                  value={detailsForm.displayOrder}
                  onChange={e => setDetailsForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none"
                />
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-3 bg-[#050816] rounded-xl border border-white/5">
              <div>
                <p className="text-sm text-white font-bold flex items-center gap-2">
                  {detailsForm.isActive ? <Eye className="h-4 w-4 text-[#40E0D0]" /> : <EyeOff className="h-4 w-4 text-red-400" />}
                  Activity Status
                </p>
                <p className="text-[10px] text-[#9CA3AF]">
                  {detailsForm.isActive ? 'Visible to customers in booking portal' : 'Hidden from customer-facing display'}
                </p>
              </div>
              <button
                onClick={() => setDetailsForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${detailsForm.isActive ? 'bg-[#007B8B]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${detailsForm.isActive ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* Rules */}
            <div className="md:col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] font-bold mb-1 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Rules & Safety Instructions (one per line)
              </label>
              <textarea
                placeholder="Always wear safety helmet.&#10;Follow staff instructions.&#10;No running on the track."
                value={detailsForm.rulesString}
                onChange={e => setDetailsForm(f => ({ ...f, rulesString: e.target.value }))}
                rows={5}
                className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none resize-none font-mono"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDetails}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#007B8B] to-[#00ABAB] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save Details
            </button>
            {detailsSaved && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                <CheckCircle className="h-4 w-4" /> Saved successfully!
              </span>
            )}
          </div>
        </div>
      )}

      {/* -- PHOTOS SUB-VIEW -- */}
      {subView === 'photos' && (
        <ActivityPhotoManager
          activity={selectedActivity}
          onAddPhoto={photo => addActivityPhoto(selectedActivity.id, photo)}
          onRemovePhoto={photoId => removeActivityPhoto(selectedActivity.id, photoId)}
          onReorder={photos => reorderActivityPhotos(selectedActivity.id, photos)}
          onSetCover={photoId => setCoverPhoto(selectedActivity.id, photoId)}
        />
      )}

      {/* -- OFFERS SUB-VIEW -- */}
      {subView === 'offers' && (
        <ActivityOfferManager
          activity={selectedActivity}
          onAddOffer={offer => addActivityOffer(selectedActivity.id, offer)}
          onUpdateOffer={offer => updateActivityOffer(selectedActivity.id, offer)}
          onDeleteOffer={offerId => deleteActivityOffer(selectedActivity.id, offerId)}
          onSetOfferActive={(offerId, active) => setOfferActive(selectedActivity.id, offerId, active)}
        />
      )}
    </div>
  );
};

export default ActivityManagementPanel;
