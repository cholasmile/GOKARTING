import React, { useState } from 'react';
import { X, User, Phone, Calendar, Clock, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { GoKartingBooking } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface GoKartingBookingModalProps {
  onClose: () => void;
  onBook: (booking: GoKartingBooking) => void;
}

const GoKartingBookingModal: React.FC<GoKartingBookingModalProps> = ({ onClose, onBook }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    mobileNumber: '',
    riderAge: '',
    gender: 'unspecified',
    emergencyContact: '',
    numberOfRiders: 1,
    sessionType: 'standard',
    sessionDuration: 10,
    preferredDate: new Date().toISOString().split('T')[0],
    preferredTimeSlot: '10:00 AM',
  });

  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    
    // Generate mock booking
    const newBooking: GoKartingBooking = {
      id: `GK-${uuidv4().substring(0, 8).toUpperCase()}`,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      activityId: 'act-go-karting',
      activityName: 'Pro Go Karting',
      date: formData.preferredDate,
      timeSlot: formData.preferredTimeSlot,
      ticketType: 'standard',
      details: `${formData.numberOfRiders} Riders | ${formData.sessionDuration} mins | ${formData.sessionType} Session`,
      quantity: formData.numberOfRiders,
      totalAmount: formData.numberOfRiders * (formData.sessionDuration === 10 ? 800 : 1500),
      paymentStatus: 'pending',
      bookingDate: new Date().toISOString(),
      riderAge: parseInt(formData.riderAge),
      riderGender: formData.gender,
      emergencyContact: formData.emergencyContact,
      sessionDuration: formData.sessionDuration,
      sessionType: formData.sessionType as any,
      waiverSigned: false
    };

    setTimeout(() => {
      setIsSubmitting(false);
      onBook(newBooking);
    }, 1000);
  };

  const inputClass = "w-full bg-[#0A0A0A]/50 border border-[#00ABAB]/30 rounded-xl py-3 px-4 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#3E8EDE] focus:ring-1 focus:ring-[#40E0D0] transition-all font-medium";
  const labelClass = "block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="glass-card w-full max-w-2xl overflow-hidden animate-fade-in relative border border-[#00ABAB]/30 shadow-[0_0_50px_rgba(0,171,171,0.1)]">
        
        {/* Header */}
        <div className="bg-[#0A0A0A]/80 border-b border-[#00ABAB]/30 p-6 flex justify-between items-center relative overflow-hidden">
          {/* Accent Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#40E0D0]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span className="text-[#40E0D0]">Go Karting</span> Booking
            </h2>
            <p className="text-xs text-[#00ABAB] font-mono tracking-widest uppercase mt-1">Race Registration Module</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[#1C1C1C] hover:bg-[#242424] rounded-full text-[#94A3B8] hover:text-white transition-colors border border-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-[#40E0D0]' : 'bg-[#1C1C1C]'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-[#40E0D0]' : 'bg-[#1C1C1C]'}`}></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {step === 1 && (
              <div className="space-y-5 animate-slide-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Lead Rider Name</label>
                    <input required type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className={inputClass} placeholder="Enter name..." />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input required type="email" value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} className={inputClass} placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile Number</label>
                    <input required type="tel" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} className={inputClass} placeholder="+1 ..." />
                  </div>
                  <div>
                    <label className={labelClass}>Emergency Contact</label>
                    <input required type="text" value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})} className={inputClass} placeholder="Name & Number" />
                  </div>
                  <div>
                    <label className={labelClass}>Rider Age</label>
                    <input required type="number" min="8" value={formData.riderAge} onChange={e => setFormData({...formData, riderAge: e.target.value})} className={inputClass} placeholder="Must be 8+" />
                  </div>
                  <div>
                    <label className={labelClass}>Gender (Optional)</label>
                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className={inputClass + " appearance-none"}>
                      <option value="unspecified">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5 animate-slide-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Number of Racers</label>
                    <input required type="number" min="1" max="15" value={formData.numberOfRiders} onChange={e => setFormData({...formData, numberOfRiders: parseInt(e.target.value)})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Session Type</label>
                    <select value={formData.sessionType} onChange={e => setFormData({...formData, sessionType: e.target.value})} className={inputClass + " appearance-none"}>
                      <option value="standard">Standard Session (80cc)</option>
                      <option value="pro">Pro Session (125cc)</option>
                      <option value="endurance">Endurance Race</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Session Duration (Mins)</label>
                    <select value={formData.sessionDuration} onChange={e => setFormData({...formData, sessionDuration: parseInt(e.target.value)})} className={inputClass + " appearance-none"}>
                      <option value={10}>10 Minutes</option>
                      <option value={20}>20 Minutes</option>
                      <option value={30}>30 Minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Preferred Date</label>
                    <input required type="date" value={formData.preferredDate} onChange={e => setFormData({...formData, preferredDate: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Preferred Time</label>
                    <input required type="time" value={formData.preferredTimeSlot} onChange={e => setFormData({...formData, preferredTimeSlot: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div className="p-4 bg-[#0A0A0A]/80 border border-[#00ABAB]/20 rounded-xl mt-4">
                  <div className="flex justify-between items-center text-white">
                    <span className="font-mono text-sm text-[#94A3B8]">Total Amount</span>
                    <span className="text-2xl font-black text-[#40E0D0]">₹{formData.numberOfRiders * (formData.sessionDuration === 10 ? 800 : 1500)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-3 border-t border-[#00ABAB]/20">
              {step === 2 && (
                <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-xl bg-[#1C1C1C] text-white hover:bg-[#242424] border border-[#00ABAB]/30 font-bold transition-colors">
                  Back
                </button>
              )}
              <button type="submit" disabled={isSubmitting} className="flex-1 btn-glow font-bold py-3 rounded-xl uppercase tracking-wider flex items-center justify-center">
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  step === 1 ? 'Next: Race Details' : 'Generate Ticket & QR'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GoKartingBookingModal;
