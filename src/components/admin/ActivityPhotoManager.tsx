/**
 * ActivityPhotoManager.tsx
 * Photo gallery management sub-component for the Admin Activity Management Panel.
 */

import React, { useState, useRef } from 'react';
import { Activity, ActivityPhoto } from '../../types';
import {
  Upload, Star, StarOff, Trash2, ChevronUp, ChevronDown,
  X, ZoomIn, ImagePlus, CheckCircle
} from 'lucide-react';

interface ActivityPhotoManagerProps {
  activity: Activity;
  onAddPhoto: (photo: Omit<ActivityPhoto, 'id' | 'uploadedAt' | 'order'>) => void;
  onRemovePhoto: (photoId: string) => void;
  onReorder: (photos: ActivityPhoto[]) => void;
  onSetCover: (photoId: string) => void;
}

const ActivityPhotoManager: React.FC<ActivityPhotoManagerProps> = ({
  activity,
  onAddPhoto,
  onRemovePhoto,
  onReorder,
  onSetCover
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photos = [...(activity.photos || [])].sort((a, b) => a.order - b.order);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onAddPhoto({ url: reader.result, caption: captionInput || file.name });
        setCaptionInput('');
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 2000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    onAddPhoto({ url: urlInput.trim(), caption: captionInput || 'Activity photo' });
    setUrlInput('');
    setCaptionInput('');
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 2000);
  };

  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const newPhotos = [...photos];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newPhotos.length) return;
    [newPhotos[index], newPhotos[swapIdx]] = [newPhotos[swapIdx], newPhotos[index]];
    onReorder(newPhotos);
  };

  return (
    <div className="space-y-5">
      {/* Upload Controls */}
      <div className="p-4 bg-[#0A0A0A]/60 border border-[#00ABAB]/30 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold text-[#40E0D0] uppercase tracking-wider">Upload Photos</h5>
          <div className="flex gap-1">
            {(['file', 'url'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setUploadMode(mode)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  uploadMode === mode
                    ? 'bg-[#007B8B] text-white'
                    : 'bg-white/5 text-[#9CA3AF] hover:text-white'
                }`}
              >
                {mode === 'file' ? 'File Upload' : 'URL'}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder="Caption (optional)"
          value={captionInput}
          onChange={e => setCaptionInput(e.target.value)}
          className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none"
        />

        {uploadMode === 'file' ? (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#40E0D0] bg-[#40E0D0]/10'
                : 'border-[#00ABAB]/40 hover:border-[#40E0D0] hover:bg-[#40E0D0]/5'
            }`}
          >
            <ImagePlus className="h-8 w-8 text-[#40E0D0] mx-auto mb-2" />
            <p className="text-xs text-[#9CA3AF]">Drag & drop images or <span className="text-[#40E0D0] font-bold">click to browse</span></p>
            <p className="text-[10px] text-[#9CA3AF]/60 mt-1">Supports JPG, PNG, WebP — multiple files allowed</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              className="flex-1 bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#9CA3AF] focus:border-[#40E0D0] focus:outline-none"
            />
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim()}
              className="px-4 py-2 bg-[#007B8B] text-white rounded-xl text-xs font-bold hover:bg-[#00ABAB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        )}

        {uploadSuccess && (
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
            <CheckCircle className="h-4 w-4" /> Photo added successfully!
          </div>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-10 text-[#9CA3AF] text-xs font-mono border border-dashed border-[#00ABAB]/20 rounded-2xl">
          No photos uploaded yet. Add photos above to build the gallery.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider">{photos.length} Photo{photos.length !== 1 ? 's' : ''} in Gallery</h5>
            <p className="text-[10px] text-[#9CA3AF] font-mono">Star = Cover Photo</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                  photo.id === activity.coverPhotoId
                    ? 'border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.3)]'
                    : 'border-[#00ABAB]/20 hover:border-[#00ABAB]/50'
                }`}
              >
                <div className="relative h-36">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Activity photo'}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  {photo.id === activity.coverPhotoId && (
                    <div className="absolute top-2 left-2 bg-amber-400 text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-current" /> Cover
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-mono px-2 py-0.5 rounded-full">
                    #{idx + 1}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <button
                      onClick={() => setPreviewUrl(photo.url)}
                      title="Preview"
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onSetCover(photo.id)}
                      title={photo.id === activity.coverPhotoId ? 'Already cover' : 'Set as cover'}
                      className="p-2 bg-amber-400/20 hover:bg-amber-400/40 rounded-full text-amber-300 transition-all cursor-pointer"
                    >
                      {photo.id === activity.coverPhotoId ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => onRemovePhoto(photo.id)}
                      title="Delete photo"
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="p-2 bg-[#0A0A0A] flex items-center justify-between gap-2">
                  <p className="text-[10px] text-[#9CA3AF] truncate flex-1">{photo.caption || 'No caption'}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => movePhoto(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#9CA3AF] disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => movePhoto(idx, 'down')}
                      disabled={idx === photos.length - 1}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#9CA3AF] disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Lightbox */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
};

export default ActivityPhotoManager;
