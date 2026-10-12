/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StaffProfileModal
 * Reusable modal for viewing, creating, and editing staff profile master data
 * including Bank Account, Bank Name, IFSC code, PAN, Aadhaar, and Salary structure.
 */

import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { 
  Building2, CreditCard, UserCheck, Mail, Phone, Briefcase, 
  IndianRupee, X, Save, AlertCircle, MapPin, Home, ShieldCheck, Lock
} from 'lucide-react';

interface StaffProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: User | null;
  onSave: (updatedStaff: User) => void;
  isNew?: boolean;
  isSuperAdmin?: boolean;
}

const ROLE_OPTIONS: { role: UserRole; label: string }[] = [
  { role: 'ticket_counter_staff', label: 'Ticket Counter Staff' },
  { role: 'activity_staff', label: 'General Activity Staff' },
  { role: 'go_karting_staff', label: 'Go-Karting Staff' },
  { role: 'go_karting_manager', label: 'Go-Karting Manager' },
  { role: 'horse_riding_staff', label: 'Horse Riding Staff' },
  { role: 'shooting_staff', label: 'Shooting Range Staff' },
  { role: 'cafe_staff', label: 'Cafe Staff' },
  { role: 'food_vendor', label: 'Food Vendor' },
  { role: 'super_admin', label: 'Super Admin' },
];

export const StaffProfileModal: React.FC<StaffProfileModalProps> = ({
  isOpen,
  onClose,
  staff,
  onSave,
  isNew = false,
  isSuperAdmin = false
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<Partial<User>>(() => {
    if (staff) {
      return { ...staff };
    }
    return {
      name: '',
      email: '',
      phone: '',
      role: 'ticket_counter_staff',
      department: 'Ticketing & Counter',
      designation: 'Counter Executive',
      streetAddress: '',
      city: '',
      state: 'Tamil Nadu',
      pincode: '',
      address: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      branchName: '',
      panNumber: '',
      aadhaarNumber: '',
      monthlySalary: 18000,
      dailyRate: 600,
    };
  });

  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof User, val: any) => {
    setFormData(prev => {
      const next = { ...prev, [field]: val };
      // Auto-calculate daily rate if monthly salary changes
      if (field === 'monthlySalary') {
        const salary = Number(val) || 0;
        next.dailyRate = Math.round(salary / 30);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      setError('Staff Name is required.');
      return;
    }
    if (!formData.email?.trim()) {
      setError('Staff Email or Identifier is required.');
      return;
    }

    // Combine street, city, state, pincode into address string for backward compatibility
    const detailedParts = [
      formData.streetAddress?.trim(),
      formData.city?.trim(),
      formData.state?.trim(),
      formData.pincode?.trim() ? `PIN: ${formData.pincode.trim()}` : ''
    ].filter(Boolean);
    const combinedAddress = detailedParts.join(', ') || formData.address?.trim() || '';

    const payload: User = {
      id: formData.id || `usr-staff-${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone?.trim() || '',
      role: (formData.role as UserRole) || 'ticket_counter_staff',
      department: formData.department || 'Ticketing & Counter',
      designation: formData.designation || 'Staff',
      streetAddress: formData.streetAddress?.trim() || '',
      city: formData.city?.trim() || '',
      state: formData.state?.trim() || '',
      pincode: formData.pincode?.trim() || '',
      address: combinedAddress,
      accountNumber: formData.accountNumber?.trim() || '',
      bankName: formData.bankName?.trim() || '',
      ifscCode: formData.ifscCode?.trim().toUpperCase() || '',
      branchName: formData.branchName?.trim() || '',
      panNumber: formData.panNumber?.trim().toUpperCase() || '',
      aadhaarNumber: formData.aadhaarNumber?.trim() || '',
      monthlySalary: isSuperAdmin ? (Number(formData.monthlySalary) || 0) : (staff?.monthlySalary ?? Number(formData.monthlySalary) ?? 18000),
      dailyRate: isSuperAdmin ? (Number(formData.dailyRate) || 0) : (staff?.dailyRate ?? Number(formData.dailyRate) ?? 600),
      updatedAt: new Date().toISOString()
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,171,171,0.2)]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#1C1C1C] flex items-center justify-between sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#00ABAB]/15 border border-[#00ABAB]/30 rounded-2xl text-[#40E0D0]">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-sans">
                {isNew ? 'Register New Staff Profile' : 'Staff Profile & Banking Master'}
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Personal credentials, banking details, and payroll rate for salary calculation
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Basic Staff Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase font-bold text-[#40E0D0] tracking-wider flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" /> 1. Basic Staff Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => handleChange('name', e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Email / Username *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-[#666] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={formData.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="ramesh@deucepark.com"
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Contact Phone Number</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-[#666] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={e => handleChange('phone', e.target.value)}
                    placeholder="9876543210"
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Assigned Role</label>
                <select
                  value={formData.role || 'ticket_counter_staff'}
                  onChange={e => handleChange('role', e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none cursor-pointer"
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.role} value={opt.role}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Department</label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={e => handleChange('department', e.target.value)}
                  placeholder="e.g. Ticketing, Karting, Cafe"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Designation</label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={e => handleChange('designation', e.target.value)}
                  placeholder="e.g. Senior Counter Cashier"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Detailed Address & Identification Master */}
          <div className="space-y-4 pt-3 border-t border-[#1C1C1C]">
            <h3 className="text-xs font-mono uppercase font-bold text-[#40E0D0] tracking-wider flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#00ABAB]" /> 2. Detailed Address &amp; Identity (Aadhaar)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Street Address / Door No / Landmark</label>
                <div className="relative">
                  <Home className="w-3.5 h-3.5 text-[#666] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={formData.streetAddress || ''}
                    onChange={e => handleChange('streetAddress', e.target.value)}
                    placeholder="e.g. No. 42/B, Park View Avenue, Near Bus Stand"
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">City / Town / Village</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={e => handleChange('city', e.target.value)}
                  placeholder="e.g. Yelagiri / Tirupattur"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">State</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={e => handleChange('state', e.target.value)}
                  placeholder="Tamil Nadu"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Postal PIN Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={formData.pincode || ''}
                  onChange={e => handleChange('pincode', e.target.value)}
                  placeholder="635853"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#40E0D0] mb-1 font-bold">Aadhaar Card Number *</label>
                <div className="relative">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00ABAB] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    maxLength={14}
                    value={formData.aadhaarNumber || ''}
                    onChange={e => handleChange('aadhaarNumber', e.target.value)}
                    placeholder="12-digit Aadhaar (e.g. 1234 5678 9012)"
                    className="w-full bg-[#141414] border border-[#00ABAB]/40 focus:border-[#00ABAB] rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs outline-none font-mono tracking-wider font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Bank Account Details (Master) */}
          <div className="space-y-4 pt-3 border-t border-[#1C1C1C]">
            <h3 className="text-xs font-mono uppercase font-bold text-amber-400 tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> 3. Bank Account Master (For Salary Disbursal)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName || ''}
                  onChange={e => handleChange('bankName', e.target.value)}
                  placeholder="e.g. State Bank of India, HDFC Bank"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Bank Account Number</label>
                <div className="relative">
                  <CreditCard className="w-3.5 h-3.5 text-[#666] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={formData.accountNumber || ''}
                    onChange={e => handleChange('accountNumber', e.target.value)}
                    placeholder="e.g. 50100234567890"
                    className="w-full bg-[#141414] border border-[#262626] focus:border-amber-400 rounded-xl pl-9 pr-3.5 py-2.5 text-white text-xs outline-none font-mono tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifscCode || ''}
                  onChange={e => handleChange('ifscCode', e.target.value)}
                  placeholder="e.g. SBIN0001234 / HDFC0000123"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Branch Name / City</label>
                <input
                  type="text"
                  value={formData.branchName || ''}
                  onChange={e => handleChange('branchName', e.target.value)}
                  placeholder="e.g. Yelagiri Hills Branch"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">PAN Number (Optional)</label>
                <input
                  type="text"
                  value={formData.panNumber || ''}
                  onChange={e => handleChange('panNumber', e.target.value)}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-[#141414] border border-[#262626] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* 4. Salary & Pay Structure (SUPER ADMIN ONLY) */}
          <div className="space-y-4 pt-3 border-t border-[#1C1C1C]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-2">
                <IndianRupee className="w-3.5 h-3.5" /> 4. Salary &amp; Wage Structure
              </h3>
              {!isSuperAdmin && (
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  <Lock className="w-3 h-3" /> Super Admin Only
                </span>
              )}
            </div>
            
            {isSuperAdmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Monthly Salary Amount (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.monthlySalary ?? 18000}
                    onChange={e => handleChange('monthlySalary', Number(e.target.value))}
                    placeholder="18000"
                    className="w-full bg-[#141414] border border-[#262626] focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-emerald-400 font-mono font-bold text-sm outline-none"
                  />
                  <p className="text-[10px] text-[#666] mt-1 font-mono">Entered exclusively by Super Admin for payroll</p>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#94A3B8] mb-1 font-bold">Calculated Per-Day Wage (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.dailyRate ?? 600}
                    onChange={e => handleChange('dailyRate', Number(e.target.value))}
                    placeholder="600"
                    className="w-full bg-[#141414] border border-[#262626] focus:border-emerald-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm outline-none"
                  />
                  <p className="text-[10px] text-[#666] mt-1 font-mono">Base salary ÷ 30 days</p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-[#0D1520] border border-[#00ABAB]/20 rounded-xl text-xs text-[#9CA3AF] flex items-center justify-between">
                <div>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Confidential Salary Configuration
                  </p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">
                    Salary amounts are restricted to Super Admin review and Accounts &amp; Finance disbursement.
                  </p>
                </div>
                <div className="text-right font-mono text-[11px] text-[#40E0D0] font-bold">
                  Protected by Access Policy
                </div>
              </div>
            )}
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
              <Save className="w-4 h-4" /> Save Profile & Banking Master
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
