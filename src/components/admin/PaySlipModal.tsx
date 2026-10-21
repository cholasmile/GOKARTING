/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PaySlipModal
 * Professional printable salary pay slip format for Deuce Park.
 * Includes:
 * - Base Salary (Manual Entry)
 * - Incentives (Manual Entry)
 * - Overtime (OT) Hours and Pay (Calculated directly from Daily Attendance)
 * - Total Gross Salary
 * - Leave Days & Salary Deductions (Formula: (Salary / 30) × Leave Days)
 * - Net Payable Salary
 * - Clean printable format for thermal/A4 printing
 */

import React, { useRef } from 'react';
import { User } from '../../types';
import { 
  Printer, X, Calendar, User as UserIcon, Building2, 
  CreditCard, DollarSign, Clock, ShieldCheck, CheckCircle2,
  FileText, IndianRupee, AlertCircle
} from 'lucide-react';

export interface PaySlipData {
  staff: User;
  month: string; // YYYY-MM
  baseSalary: number; // Manual entry
  incentives: number; // Manual entry
  otHours: number; // From attendance
  otPay: number; // Calculated from attendance OT hours
  totalGross: number; // baseSalary + incentives + otPay
  daysInMonth: number; // 30 standard
  perDaySalary: number; // baseSalary / 30
  hourlyRate: number; // perDaySalary / 8
  presentDays: number; // From attendance
  halfDays: number; // From attendance
  absentDays: number; // From attendance
  paidLeaveDays: number; // From attendance
  unpaidLeaveDays: number; // From attendance
  weeklyOffDays: number; // From attendance
  leaveDays: number; // absentDays + unpaidLeaveDays + (halfDays * 0.5)
  leaveDeduction: number; // leaveDays * (baseSalary / 30)
  netPayable: number; // totalGross - leaveDeduction
  paymentStatus: 'Paid' | 'Pending';
  paymentMethod?: string;
  transactionRef?: string;
}

interface PaySlipModalProps {
  data: PaySlipData;
  onClose: () => void;
}

function numberToIndianWords(num: number): string {
  if (num <= 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    const tens = b[Math.floor(n / 10)];
    const units = a[n % 10];
    return tens + (units ? ' ' + units : '') + ' ';
  };

  let integerPart = Math.floor(num);
  let words = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;
  if (crore > 0) words += convertLessThanOneThousand(crore) + 'Crore ';

  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;
  if (lakh > 0) words += convertLessThanOneThousand(lakh) + 'Lakh ';

  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;
  if (thousand > 0) words += convertLessThanOneThousand(thousand) + 'Thousand ';

  const hundred = Math.floor(integerPart / 100);
  integerPart %= 100;
  if (hundred > 0) words += convertLessThanOneThousand(hundred) + 'Hundred ';

  if (integerPart > 0) words += convertLessThanOneThousand(integerPart);

  return words.trim() + ' Rupees Only';
}

export const PaySlipModal: React.FC<PaySlipModalProps> = ({ data, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const monthFormatted = (() => {
    try {
      const [year, month] = data.month.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch {
      return data.month;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative bg-[#0F0F0F] border border-[#00ABAB]/40 rounded-3xl w-full max-w-3xl my-6 shadow-[0_0_50px_rgba(0,171,171,0.2)] overflow-hidden">
        
        {/* Top Action Bar (hidden on print) */}
        <div className="print:hidden p-4 bg-[#141414] border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-[#40E0D0]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Employee Salary Pay Slip</h3>
              <p className="text-[11px] text-[#888]">
                Attendance-Linked Payroll Voucher • 30-Day Pay Basis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold text-xs flex items-center gap-2 shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#888] hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pay Slip Sheet */}
        <div 
          ref={printRef}
          className="p-6 sm:p-8 bg-[#0B0B0B] text-white print:bg-white print:text-black print:p-8 font-sans space-y-6"
        >
          {/* Header Banner */}
          <div className="border-b border-[#262626] print:border-black pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white print:text-black">
                  DEUCE PARK
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00ABAB]/20 text-[#40E0D0] border border-[#00ABAB]/40 print:border-black print:text-black">
                  SPORTS & ENTERTAINMENT
                </span>
              </div>
              <p className="text-xs text-[#888] print:text-gray-600 mt-0.5">
                Activity Park, Food Street, Go-Karting & Sports Complex
              </p>
            </div>

            <div className="text-left sm:text-right font-mono">
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 print:border-black text-xs font-bold text-white print:text-black block">
                SALARY PAY SLIP
              </span>
              <span className="text-xs text-[#40E0D0] print:text-black font-bold block mt-1">
                Pay Period: {monthFormatted}
              </span>
              <span className="text-[10px] text-[#666] print:text-gray-600 block">
                Basis: Standard 30 Days Month
              </span>
            </div>
          </div>

          {/* Employee & Bank Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#141414] print:bg-gray-100 border border-[#222] print:border-gray-300 text-xs">
            <div>
              <span className="text-[10px] font-mono text-[#888] print:text-gray-600 uppercase block">Employee Name</span>
              <strong className="text-white print:text-black font-sans text-sm">{data.staff.name}</strong>
              <span className="text-[10px] text-[#666] font-mono block">ID: {data.staff.employeeId || data.staff.id.slice(-6).toUpperCase()}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#888] print:text-gray-600 uppercase block">Role / Designation</span>
              <strong className="text-white print:text-black font-sans">{data.staff.designation || data.staff.role || 'Staff Member'}</strong>
              <span className="text-[10px] text-[#666] font-mono block">Dept: {data.staff.department || 'Operations'}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#888] print:text-gray-600 uppercase block">Bank Details</span>
              <span className="text-white print:text-black font-mono block">{data.staff.bankName || 'Direct Disbursal'}</span>
              <span className="text-[10px] text-[#666] font-mono block">A/C: {data.staff.accountNumber || 'N/A'}</span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#888] print:text-gray-600 uppercase block">Payment Status</span>
              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-0.5 ${
                data.paymentStatus === 'Paid'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 print:text-black'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-800/60 print:text-black'
              }`}>
                {data.paymentStatus}
              </span>
              <span className="text-[10px] text-[#666] font-mono block mt-0.5">Mode: {data.paymentMethod || 'Bank Transfer'}</span>
            </div>
          </div>

          {/* Attendance Summary Ribbon (Everything taken from Attendance) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white print:text-black flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#00ABAB]" /> Biometric / Daily Attendance Summary
              </span>
              <span className="text-[10px] font-mono text-[#888]">
                Standard 30 Days Calculation
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 print:bg-gray-100 border border-white/5 print:border-gray-200">
                <span className="text-[9px] text-[#888] print:text-gray-600 uppercase block">Present Days</span>
                <strong className="text-emerald-400 print:text-black text-sm">{data.presentDays}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 print:bg-gray-100 border border-white/5 print:border-gray-200">
                <span className="text-[9px] text-[#888] print:text-gray-600 uppercase block">Half Days</span>
                <strong className="text-amber-400 print:text-black text-sm">{data.halfDays}</strong>
                <span className="text-[8px] text-[#666] block">({data.halfDays * 0.5} leave)</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 print:bg-gray-100 border border-white/5 print:border-gray-200">
                <span className="text-[9px] text-[#888] print:text-gray-600 uppercase block">Paid Leaves</span>
                <strong className="text-teal-300 print:text-black text-sm">{data.paidLeaveDays}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 print:bg-gray-100 border border-white/5 print:border-gray-200">
                <span className="text-[9px] text-[#888] print:text-gray-600 uppercase block">Weekly Offs</span>
                <strong className="text-blue-400 print:text-black text-sm">{data.weeklyOffDays}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-500/10 print:bg-rose-50 border border-rose-500/20 print:border-rose-200">
                <span className="text-[9px] text-rose-400 print:text-rose-700 uppercase font-bold block">Days on Leave</span>
                <strong className="text-rose-400 print:text-rose-700 text-sm">{data.leaveDays} Days</strong>
                <span className="text-[8px] text-rose-300/70 print:text-rose-600 block">Deducted from Pay</span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-500/10 print:bg-purple-50 border border-purple-500/20 print:border-purple-200">
                <span className="text-[9px] text-purple-400 print:text-purple-700 uppercase font-bold block">Overtime (OT)</span>
                <strong className="text-purple-400 print:text-purple-700 text-sm">{data.otHours} hrs</strong>
                <span className="text-[8px] text-purple-300/70 print:text-purple-600 block">Logged in Shift</span>
              </div>
            </div>
          </div>

          {/* Earnings vs Deductions Statement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* EARNINGS */}
            <div className="rounded-2xl border border-[#222] print:border-gray-300 overflow-hidden font-mono">
              <div className="p-3 bg-[#161616] print:bg-gray-200 border-b border-[#222] print:border-gray-300 flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 print:text-emerald-800">
                  Earnings
                </span>
                <span className="text-[10px] text-[#888] print:text-gray-600">Amount (₹)</span>
              </div>

              <div className="p-4 space-y-3 text-xs divide-y divide-[#1C1C1C] print:divide-gray-200">
                <div className="flex justify-between items-start pt-1">
                  <div>
                    <span className="text-white print:text-black font-sans font-bold block">Base Monthly Salary</span>
                    <span className="text-[10px] text-[#666] print:text-gray-500 font-mono">Manual Entry / CTC</span>
                  </div>
                  <strong className="text-white print:text-black">₹{data.baseSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="flex justify-between items-start pt-2">
                  <div>
                    <span className="text-white print:text-black font-sans font-bold block">Incentives / Performance Bonus</span>
                    <span className="text-[10px] text-[#666] print:text-gray-500 font-mono">Service, tips &amp; counter incentive</span>
                  </div>
                  <strong className="text-teal-300 print:text-black">₹{data.incentives.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="flex justify-between items-start pt-2">
                  <div>
                    <span className="text-white print:text-black font-sans font-bold block">Overtime (OT) Pay</span>
                    <span className="text-[10px] text-[#666] print:text-gray-500 font-mono">
                      {data.otHours} hrs @ ₹{data.hourlyRate.toFixed(2)}/hr × 1.5
                    </span>
                  </div>
                  <strong className="text-purple-400 print:text-black">₹{data.otPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="flex justify-between items-center pt-3 border-t-2 border-[#333] print:border-black font-bold text-sm">
                  <span className="text-emerald-400 print:text-black">TOTAL GROSS SALARY</span>
                  <span className="text-emerald-400 print:text-black">₹{data.totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* DEDUCTIONS */}
            <div className="rounded-2xl border border-[#222] print:border-gray-300 overflow-hidden font-mono">
              <div className="p-3 bg-[#161616] print:bg-gray-200 border-b border-[#222] print:border-gray-300 flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-wider text-rose-400 print:text-rose-800">
                  Deductions
                </span>
                <span className="text-[10px] text-[#888] print:text-gray-600">Amount (₹)</span>
              </div>

              <div className="p-4 space-y-3 text-xs divide-y divide-[#1C1C1C] print:divide-gray-200">
                <div className="flex justify-between items-start pt-1">
                  <div>
                    <span className="text-white print:text-black font-sans font-bold block">Leave Salary Deduction</span>
                    <span className="text-[10px] text-rose-400 print:text-rose-700 font-mono block">
                      Formula: {data.leaveDays} days × (₹{data.baseSalary.toLocaleString('en-IN')} ÷ 30)
                    </span>
                    <span className="text-[9px] text-[#666] print:text-gray-500 font-mono block">
                      Per Day Rate: ₹{data.perDaySalary.toFixed(2)}/day
                    </span>
                  </div>
                  <strong className="text-rose-400 print:text-rose-700">₹{data.leaveDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>

                <div className="flex justify-between items-start pt-2">
                  <div>
                    <span className="text-white print:text-black font-sans font-bold block">Other Deductions / Advance</span>
                    <span className="text-[10px] text-[#666] print:text-gray-500 font-mono">None</span>
                  </div>
                  <span className="text-[#666] print:text-gray-500">₹0.00</span>
                </div>

                <div className="pt-2 invisible">
                  {/* Spacer for height symmetry */}
                  <div className="h-6"></div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t-2 border-[#333] print:border-black font-bold text-sm">
                  <span className="text-rose-400 print:text-black">TOTAL DEDUCTIONS</span>
                  <span className="text-rose-400 print:text-black">₹{data.leaveDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Net Salary Payable Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#00ABAB]/15 via-[#14F1D9]/10 to-[#00ABAB]/15 print:bg-gray-100 border border-[#00ABAB]/40 print:border-black flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] print:text-gray-600 block">
                Net Disbursal Calculation: Gross Salary (₹{data.totalGross.toFixed(0)}) − Leave Deduction (₹{data.leaveDeduction.toFixed(0)})
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#40E0D0] print:text-black font-mono">
                ₹{data.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-[#9CA3AF] print:text-gray-700 italic mt-0.5">
                Amount in words: {numberToIndianWords(data.netPayable)}
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 print:text-black border border-emerald-500/40 print:border-black text-[11px] font-bold">
                ✓ Verified via Biometric Attendance
              </span>
            </div>
          </div>

          {/* Signatures & Certification */}
          <div className="pt-6 border-t border-[#222] print:border-gray-400 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-12">
              <p className="text-[10px] text-[#666] print:text-gray-600 italic">
                I hereby acknowledge receipt of the net salary stated above and agree with the attendance &amp; leave calculations.
              </p>
              <div className="border-t border-[#444] print:border-black pt-1">
                <span className="font-bold text-white print:text-black block">Employee Signature</span>
                <span className="text-[10px] text-[#666] print:text-gray-500">Date: _______________</span>
              </div>
            </div>

            <div className="space-y-12 text-right">
              <p className="text-[10px] text-[#666] print:text-gray-600 italic">
                Certified that the above particulars have been verified from the daily attendance log and approved by management.
              </p>
              <div className="border-t border-[#444] print:border-black pt-1">
                <span className="font-bold text-white print:text-black block">Authorized Signatory / Accounts Manager</span>
                <span className="text-[10px] text-[#666] print:text-gray-500">Deuce Park Entertainment</span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[9px] text-[#555] print:text-gray-400 font-mono pt-2">
            This is a computer-generated document synchronized with the park's staff attendance database.
          </div>
        </div>

      </div>
    </div>
  );
};
