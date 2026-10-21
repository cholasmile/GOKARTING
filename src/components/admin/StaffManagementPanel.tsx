/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StaffManagementPanel
 * Complete Sub-Admin Staff Management, Daily Attendance, Shift Management,
 * Leave Management, Attendance Reports, and Salary Calculation component.
 *
 * Designed to seamlessly embed into the Sub-Admin / Staff Portal and Super Admin Review.
 * Restricts Sub-Admin from consolidated Balance Sheet / Profit & Loss.
 */

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  User, UserRole, StaffAttendanceRecord, ShiftDefinition, 
  LeaveRequestRecord, StaffSalaryPayment, AttendanceStatusType 
} from '../../types';
import { StaffProfileModal } from './StaffProfileModal';
import { PaySlipModal, PaySlipData } from './PaySlipModal';
import { 
  Users, Calendar, Clock, DollarSign, FileText, CheckCircle, 
  XCircle, AlertCircle, Plus, Search, Filter, Download, 
  Edit, Trash2, ShieldAlert, ArrowRight, Save, UserCheck, 
  UserX, Briefcase, Building2, CreditCard, ChevronRight, Check
} from 'lucide-react';

interface StaffManagementPanelProps {
  isSuperAdmin?: boolean; // If true, enables payroll approval and consolidated view
}

const ATTENDANCE_STATUSES: AttendanceStatusType[] = [
  'Present',
  'Absent',
  'Half Day',
  'Paid Leave',
  'Unpaid Leave',
  'Weekly Off',
  'Holiday',
  'Work From Home'
];

const DEPARTMENTS = [
  'Ticketing & Counter',
  'Go-Karting',
  'Air Rifle Shooting',
  'Horse Riding',
  'Cafe & Food Street',
  'Track & Park Operations',
  'Maintenance & Repairs',
  'Security & Housekeeping',
  'Administration & Accounts'
];

export const StaffManagementPanel: React.FC<StaffManagementPanelProps> = ({
  isSuperAdmin = false
}) => {
  const { 
    users, addUser, updateUser, deactivateUser,
    staffAttendance, markAttendance, bulkMarkAttendance, correctAttendance,
    shifts, addShift, updateShift, deleteShift,
    leaveRequests, submitLeaveRequest, updateLeaveRequestStatus,
    staffSalaryPayments, saveSalaryPayment, approveSalaryPayment,
    currentUser
  } = useAppContext();

  // Active Sub-Tab
  type PanelSubTab = 'staff_master' | 'daily_attendance' | 'shifts' | 'leaves' | 'payroll' | 'reports';
  const [activeTab, setActiveTab] = useState<PanelSubTab>('daily_attendance');

  // Staff Master States
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [staffSearch, setStaffSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  // Daily Attendance States
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dailyStaffStatuses, setDailyStaffStatuses] = useState<Record<string, {
    status: AttendanceStatusType;
    checkIn: string;
    checkOut: string;
    shiftName: string;
    remarks: string;
    overtimeHours: number;
  }>>({});

  // Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState<StaffAttendanceRecord | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceStatusType>('Present');
  const [correctionReason, setCorrectionReason] = useState('');

  // Shift Modal State
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('17:00');
  const [newShiftBreak, setNewShiftBreak] = useState(60);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStaffId, setLeaveStaffId] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStart, setLeaveStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEnd, setLeaveEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveIsPaid, setLeaveIsPaid] = useState(true);

  // Payroll Calculation Month
  const [payrollMonth, setPayrollMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedPaySlipData, setSelectedPaySlipData] = useState<PaySlipData | null>(null);
  const [manualSalaries, setManualSalaries] = useState<Record<string, number>>({});
  const [manualIncentives, setManualIncentives] = useState<Record<string, number>>({});

  // Eligible Staff List (Exclude pure online customers)
  const staffList = useMemo(() => {
    return users.filter(u => u.role !== 'customer');
  }, [users]);

  // Filtered staff list for Staff Master
  const filteredStaffList = useMemo(() => {
    return staffList.filter(s => {
      if (departmentFilter !== 'all' && s.department !== departmentFilter) return false;
      if (statusFilter !== 'all' && (s.employmentStatus || 'Active') !== statusFilter) return false;
      if (staffSearch.trim()) {
        const q = staffSearch.toLowerCase();
        return s.name.toLowerCase().includes(q) || 
               (s.email || '').toLowerCase().includes(q) || 
               (s.phone || '').includes(q) ||
               (s.employeeId || '').toLowerCase().includes(q) ||
               (s.aadhaarNumber || '').includes(q) ||
               (s.address || '').toLowerCase().includes(q) ||
               (s.city || '').toLowerCase().includes(q) ||
               (s.department || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [staffList, departmentFilter, statusFilter, staffSearch]);

  // Existing attendance for the selected date
  const dayAttendanceMap = useMemo(() => {
    const map = new Map<string, StaffAttendanceRecord>();
    staffAttendance.filter(a => a.date === attendanceDate).forEach(a => {
      map.set(a.staffId, a);
    });
    return map;
  }, [staffAttendance, attendanceDate]);

  // Handle Bulk Attendance Save for the selected day
  const handleSaveDayAttendance = () => {
    const recordsToSave: Array<Omit<StaffAttendanceRecord, 'id' | 'timestamp'>> = [];

    staffList.forEach(staff => {
      const existing = dayAttendanceMap.get(staff.id);
      const input = dailyStaffStatuses[staff.id];

      const chosenStatus: AttendanceStatusType = 
        input?.status || (existing?.status as AttendanceStatusType) || 'Present';
      const chosenCheckIn = input?.checkIn ?? (existing?.checkInTime || '09:00');
      const chosenCheckOut = input?.checkOut ?? (existing?.checkOutTime || '17:00');
      const chosenShift = input?.shiftName || existing?.shiftName || staff.shiftName || 'Morning Shift';
      const chosenRemarks = input?.remarks ?? (existing?.remarks || '');
      const chosenOT = input?.overtimeHours ?? (existing?.overtimeHours || 0);

      recordsToSave.push({
        staffId: staff.id,
        employeeId: staff.employeeId || staff.id.slice(-6).toUpperCase(),
        staffName: staff.name,
        department: staff.department || 'Operations',
        assignedActivity: staff.assignedActivity || 'Park Activities',
        date: attendanceDate,
        shiftName: chosenShift,
        status: chosenStatus,
        checkInTime: chosenStatus === 'Absent' ? undefined : chosenCheckIn,
        checkOutTime: chosenStatus === 'Absent' ? undefined : chosenCheckOut,
        overtimeHours: chosenOT,
        remarks: chosenRemarks,
        markedBy: currentUser?.name || 'Sub-Admin'
      });
    });

    bulkMarkAttendance(recordsToSave);
    alert(`Successfully recorded attendance for ${recordsToSave.length} staff members on ${attendanceDate}!`);
  };

  // Submit Leave Request
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStaffId) {
      alert('Please select an employee.');
      return;
    }
    const staff = staffList.find(s => s.id === leaveStaffId);
    if (!staff) return;

    const start = new Date(leaveStart);
    const end = new Date(leaveEnd);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    submitLeaveRequest({
      staffId: staff.id,
      staffName: staff.name,
      leaveType,
      startDate: leaveStart,
      endDate: leaveEnd,
      numberOfDays: days,
      isPaid: leaveIsPaid,
      reason: leaveReason.trim() || 'Personal leave request',
      submittedBy: currentUser?.name || 'Staff'
    });

    setIsLeaveModalOpen(false);
    setLeaveReason('');
  };

  // Calculate Monthly Payroll Inputs based on approved Attendance
  const payrollSummaries = useMemo(() => {
    const daysInMonth = 30; // standard calculation

    return staffList.map(staff => {
      const monthAttendances = staffAttendance.filter(a => 
        a.staffId === staff.id && a.date.startsWith(payrollMonth)
      );

      let presentDays = 0;
      let halfDays = 0;
      let absentDays = 0;
      let paidLeaveDays = 0;
      let unpaidLeaveDays = 0;
      let weeklyOffDays = 0;
      let overtimeHours = 0;

      monthAttendances.forEach(a => {
        const st = a.status.toString().toLowerCase();
        if (st === 'present') presentDays++;
        else if (st === 'half day' || st === 'half_day') halfDays++;
        else if (st === 'absent') absentDays++;
        else if (st === 'paid leave') paidLeaveDays++;
        else if (st === 'unpaid leave') unpaidLeaveDays++;
        else if (st === 'weekly off') weeklyOffDays++;
        if (a.overtimeHours) overtimeHours += Number(a.overtimeHours) || 0;
      });

      // Existing recorded payment (if any)
      const existingPayment = staffSalaryPayments.find(p => p.staffId === staff.id && p.month === payrollMonth);

      // 1. Base Salary (Manual Entry)
      const baseSalary = manualSalaries[staff.id] !== undefined
        ? manualSalaries[staff.id]
        : (existingPayment?.baseSalary || staff.monthlySalary || 18000);

      // 2. Incentives (Manual Entry)
      const incentives = manualIncentives[staff.id] !== undefined
        ? manualIncentives[staff.id]
        : (existingPayment?.bonusAmount || 0);

      // 3. Standard 30 Days Month Calculation
      const daysInMonth = 30;
      const perDaySalary = Math.round((baseSalary / 30) * 100) / 100;
      const hourlyRate = Math.round((perDaySalary / 8) * 100) / 100;

      // 4. Overtime (OT) pay from attendance
      const otPay = Math.round(overtimeHours * hourlyRate * 1.5 * 100) / 100;

      // 5. Total Gross Salary = Base Salary + Incentives + OT Pay
      const totalGross = Math.round((baseSalary + incentives + otPay) * 100) / 100;

      // 6. Leave Days & Deduction (Salary divided by 30 days multiplied by leave days)
      const leaveDays = absentDays + unpaidLeaveDays + (halfDays * 0.5);
      const leaveDeduction = Math.round(leaveDays * perDaySalary * 100) / 100;
      const payableDays = Math.max(0, 30 - leaveDays);

      // 7. Net Payable = Total Gross - Leave Deduction
      const netPayable = Math.max(0, Math.round((totalGross - leaveDeduction) * 100) / 100);

      return {
        staff,
        month: payrollMonth,
        baseSalary,
        incentives,
        dailyRate: perDaySalary,
        perDaySalary,
        hourlyRate,
        daysInMonth,
        presentDays,
        halfDays,
        absentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        weeklyOffDays,
        leaveDays,
        leaveDeduction,
        payableDays,
        overtimeHours,
        otPay,
        overtimePay: otPay,
        totalGross,
        calculatedSalary: Math.max(0, baseSalary - leaveDeduction),
        netPayable,
        isSaved: Boolean(existingPayment),
        paymentStatus: existingPayment ? existingPayment.paymentStatus : 'Pending',
        isApproved: Boolean(existingPayment?.isApprovedBySuperAdmin),
        paymentId: existingPayment?.id
      };
    });
  }, [staffList, staffAttendance, staffSalaryPayments, payrollMonth, manualSalaries, manualIncentives]);

  // Export Daily Attendance CSV
  const handleExportAttendanceCSV = () => {
    const headers = ["Date", "Employee ID", "Staff Name", "Department", "Shift", "Status", "Check-in", "Check-out", "OT Hours", "Remarks", "Marked By"];
    const rows = staffAttendance.map(a => [
      `"${a.date}"`,
      `"${a.employeeId || 'N/A'}"`,
      `"${a.staffName}"`,
      `"${a.department || 'N/A'}"`,
      `"${a.shiftName || 'Morning'}"`,
      `"${a.status}"`,
      `"${a.checkInTime || '-'}"`,
      `"${a.checkOutTime || '-'}"`,
      a.overtimeHours || 0,
      `"${a.remarks || ''}"`,
      `"${a.markedBy || ''}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `deuce_park_attendance_${attendanceDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00ABAB]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00ABAB]/15 border border-[#00ABAB]/30 text-[#40E0D0] text-xs font-mono font-bold uppercase">
            <Users className="w-3.5 h-3.5" /> Sub-Admin Staff & Payroll Operations
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-sans tracking-tight">
            Staff Master, Daily Attendance, Shift & Payroll Center
          </h2>
          <p className="text-xs text-[#94A3B8]">
            Operational employee profiles, multi-staff daily attendance, leave approvals, and pro-rata salary calculation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => {
              setEditingStaff(null);
              setIsStaffModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(0,171,171,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Staff Profile
          </button>
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-teal-400 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-teal-400" /> Apply Leave
          </button>
          <button
            onClick={handleExportAttendanceCSV}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-teal-400 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#40E0D0]" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl space-y-1">
          <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Active Staff Workforce</span>
          <div className="text-2xl font-black text-white">{staffList.length} employees</div>
          <span className="text-[10px] text-teal-400">All Park activities</span>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-emerald-900/30 rounded-2xl space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Present Today ({attendanceDate})</span>
          <div className="text-2xl font-black text-emerald-400">
            {staffAttendance.filter(a => a.date === attendanceDate && (a.status === 'Present' || a.status === 'present')).length} staff
          </div>
          <span className="text-[10px] text-emerald-300/60">On shift</span>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-amber-900/30 rounded-2xl space-y-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">Pending Leave Requests</span>
          <div className="text-2xl font-black text-amber-400">
            {leaveRequests.filter(l => l.status === 'Pending').length} requests
          </div>
          <span className="text-[10px] text-amber-300/60">Awaiting approval</span>
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-2xl space-y-1">
          <span className="text-[10px] text-[#40E0D0] font-bold uppercase tracking-wider block">Active Shifts</span>
          <div className="text-2xl font-black text-[#40E0D0]">{shifts.filter(s => s.isActive).length} shifts</div>
          <span className="text-[10px] text-teal-400/60">Configured schedules</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#1C1C1C] gap-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('daily_attendance')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'daily_attendance'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> Daily Attendance Marking
        </button>

        <button
          onClick={() => setActiveTab('staff_master')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'staff_master'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Staff Master Directory ({staffList.length})
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'shifts'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Shift Management ({shifts.length})
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Leave Management ({leaveRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'payroll'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4 text-[#14F1D9]" /> 💵 Payroll & Pay Slips ({payrollMonth})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'border-[#00ABAB] text-[#00ABAB]'
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Attendance Reports & Registers
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. DAILY ATTENDANCE MARKING TABLE                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'daily_attendance' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-[#1C1C1C] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[#94A3B8] font-bold">Marking Attendance for Date:</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="bg-[#141414] border border-[#00ABAB]/40 rounded-xl px-3 py-2 text-white font-mono font-bold outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const bulkMap: typeof dailyStaffStatuses = {};
                  staffList.forEach(s => {
                    bulkMap[s.id] = {
                      status: 'Present',
                      checkIn: '09:00',
                      checkOut: '17:00',
                      shiftName: s.shiftName || 'Morning Shift',
                      remarks: 'Marked All Present',
                      overtimeHours: 0
                    };
                  });
                  setDailyStaffStatuses(bulkMap);
                }}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-teal-400 text-teal-300 font-bold cursor-pointer"
              >
                Mark All Present
              </button>

              <button
                onClick={handleSaveDayAttendance}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-black flex items-center gap-2 shadow-[0_0_20px_rgba(0,171,171,0.3)] hover:opacity-95 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Attendance for {attendanceDate}
              </button>
            </div>
          </div>

          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] text-[#94A3B8] font-mono font-bold border-b border-[#00ABAB]/30">
                    <th className="p-3.5">Employee Name & ID</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Shift</th>
                    <th className="p-3.5">Attendance Status</th>
                    <th className="p-3.5">Check-In</th>
                    <th className="p-3.5">Check-Out</th>
                    <th className="p-3.5 text-right">OT Hours</th>
                    <th className="p-3.5">Remarks / Audit</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {staffList.map(staff => {
                    const existing = dayAttendanceMap.get(staff.id);
                    const currentInput = dailyStaffStatuses[staff.id];
                    const currentStatus = currentInput?.status || existing?.status || 'Present';
                    const currentCheckIn = currentInput?.checkIn ?? (existing?.checkInTime || '09:00');
                    const currentCheckOut = currentInput?.checkOut ?? (existing?.checkOutTime || '17:00');
                    const currentOT = currentInput?.overtimeHours ?? (existing?.overtimeHours || 0);
                    const currentRemarks = currentInput?.remarks ?? (existing?.remarks || '');

                    return (
                      <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-white flex items-center gap-2">
                            {staff.name}
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 border border-white/10 text-teal-300">
                              {staff.employeeId || staff.id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#666] font-mono">{staff.designation || staff.role}</div>
                        </td>

                        <td className="p-3.5 font-mono text-[#94A3B8]">
                          {staff.department || 'Ticketing & Counter'}
                        </td>

                        <td className="p-3.5">
                          <select
                            value={currentInput?.shiftName || existing?.shiftName || staff.shiftName || 'Morning Shift'}
                            onChange={e => {
                              const sName = e.target.value;
                              setDailyStaffStatuses(prev => ({
                                ...prev,
                                [staff.id]: {
                                  ...(prev[staff.id] || { status: currentStatus as any, checkIn: currentCheckIn, checkOut: currentCheckOut, remarks: currentRemarks, overtimeHours: currentOT }),
                                  shiftName: sName
                                }
                              }));
                            }}
                            className="bg-[#141414] border border-[#262626] rounded-lg px-2 py-1 text-white text-[11px] outline-none cursor-pointer"
                          >
                            {shifts.map(s => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                        </td>

                        <td className="p-3.5">
                          <select
                            value={currentStatus}
                            onChange={e => {
                              const newSt = e.target.value as AttendanceStatusType;
                              setDailyStaffStatuses(prev => ({
                                ...prev,
                                [staff.id]: {
                                  ...(prev[staff.id] || { shiftName: staff.shiftName || 'Morning Shift', checkIn: currentCheckIn, checkOut: currentCheckOut, remarks: currentRemarks, overtimeHours: currentOT }),
                                  status: newSt
                                }
                              }));
                            }}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border outline-none cursor-pointer font-mono ${
                              currentStatus === 'Present'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : currentStatus === 'Absent'
                                ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                                : currentStatus === 'Half Day'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                : 'bg-blue-950/60 text-blue-300 border-blue-800/60'
                            }`}
                          >
                            {ATTENDANCE_STATUSES.map(st => (
                              <option key={st} value={st} className="bg-[#141414] text-white">{st}</option>
                            ))}
                          </select>
                        </td>

                        <td className="p-3.5">
                          <input
                            type="time"
                            value={currentCheckIn}
                            disabled={currentStatus === 'Absent'}
                            onChange={e => {
                              const val = e.target.value;
                              setDailyStaffStatuses(prev => ({
                                ...prev,
                                [staff.id]: {
                                  ...(prev[staff.id] || { status: currentStatus as any, shiftName: 'Morning Shift', checkOut: currentCheckOut, remarks: currentRemarks, overtimeHours: currentOT }),
                                  checkIn: val
                                }
                              }));
                            }}
                            className="bg-[#141414] border border-[#262626] rounded-lg px-2 py-1 text-white text-[11px] font-mono outline-none disabled:opacity-30"
                          />
                        </td>

                        <td className="p-3.5">
                          <input
                            type="time"
                            value={currentCheckOut}
                            disabled={currentStatus === 'Absent'}
                            onChange={e => {
                              const val = e.target.value;
                              setDailyStaffStatuses(prev => ({
                                ...prev,
                                [staff.id]: {
                                  ...(prev[staff.id] || { status: currentStatus as any, shiftName: 'Morning Shift', checkIn: currentCheckIn, remarks: currentRemarks, overtimeHours: currentOT }),
                                  checkOut: val
                                }
                              }));
                            }}
                            className="bg-[#141414] border border-[#262626] rounded-lg px-2 py-1 text-white text-[11px] font-mono outline-none disabled:opacity-30"
                          />
                        </td>

                        <td className="p-3.5 text-right font-mono">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={currentOT}
                            onChange={e => {
                              const val = Number(e.target.value) || 0;
                              setDailyStaffStatuses(prev => ({
                                ...prev,
                                [staff.id]: {
                                  ...(prev[staff.id] || { status: currentStatus as any, shiftName: 'Morning Shift', checkIn: currentCheckIn, checkOut: currentCheckOut, remarks: currentRemarks }),
                                  overtimeHours: val
                                }
                              }));
                            }}
                            className="w-16 bg-[#141414] border border-[#262626] rounded-lg px-2 py-1 text-white text-[11px] font-mono text-right outline-none"
                          />
                        </td>

                        <td className="p-3.5">
                          <input
                            type="text"
                            placeholder="Optional note"
                            value={currentRemarks}
                            onChange={e => {
                              const val = e.target.value;
                              setDailyStaffStatuses(prev => ({
                                ...prev,
                                [staff.id]: {
                                  ...(prev[staff.id] || { status: currentStatus as any, shiftName: 'Morning Shift', checkIn: currentCheckIn, checkOut: currentCheckOut, overtimeHours: currentOT }),
                                  remarks: val
                                }
                              }));
                            }}
                            className="w-full bg-[#141414] border border-[#262626] rounded-lg px-2 py-1 text-white text-[11px] outline-none"
                          />
                        </td>

                        <td className="p-3.5 text-right">
                          {existing?.isCorrected && (
                            <span className="text-[10px] text-amber-400 font-mono block">
                              Edited by {existing.correctedBy}
                            </span>
                          )}
                          {existing && (
                            <button
                              onClick={() => {
                                setCorrectionTarget(existing);
                                setCorrectionStatus(existing.status as AttendanceStatusType);
                                setCorrectionReason('');
                              }}
                              className="text-[10px] text-teal-400 hover:underline cursor-pointer"
                            >
                              Correction History
                            </button>
                          )}
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. STAFF MASTER DIRECTORY                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'staff_master' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-[#1C1C1C] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#666] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff by name, ID, phone, email, department..."
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl pl-9 pr-3.5 py-2 text-white outline-none"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active Staff</option>
                <option value="Inactive">Inactive / Deactivated</option>
              </select>
            </div>

            <span className="text-[11px] font-mono text-[#94A3B8]">
              {filteredStaffList.length} staff profiles found
            </span>
          </div>

          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] text-[#94A3B8] font-mono font-bold border-b border-[#00ABAB]/30">
                    <th className="p-3.5">Employee Name &amp; ID</th>
                    <th className="p-3.5">Department &amp; Activity</th>
                    <th className="p-3.5">Contact Details</th>
                    <th className="p-3.5">Residential Address &amp; Aadhaar</th>
                    <th className="p-3.5">Bank Master (Payroll)</th>
                    {isSuperAdmin && (
                      <th className="p-3.5 text-right">Salary (Super Admin)</th>
                    )}
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {filteredStaffList.map(staff => (
                    <tr key={staff.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          {staff.name}
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/5 border border-white/10 text-teal-300">
                            {staff.employeeId || staff.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#666] font-mono mt-0.5">
                          {staff.designation || 'Staff Member'} • Joined: {staff.dateOfJoining || '2026-01-01'}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <div className="text-white font-bold">{staff.department || 'Operations'}</div>
                        <div className="text-[10px] text-teal-400">{staff.assignedActivity || 'Park Activities'}</div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <div className="text-white">{staff.phone || 'N/A'}</div>
                        <div className="text-[10px] text-[#666]">{staff.email}</div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <div className="text-white text-xs max-w-xs truncate" title={staff.address || staff.streetAddress || 'Address not recorded'}>
                          {staff.streetAddress ? (
                            <span>{staff.streetAddress}{staff.city ? `, ${staff.city}` : ''}</span>
                          ) : staff.address ? (
                            <span>{staff.address}</span>
                          ) : (
                            <span className="text-[#666] italic">No address provided</span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#40E0D0] mt-0.5 font-bold flex items-center gap-1">
                          {staff.aadhaarNumber ? (
                            <span>Aadhaar: {staff.aadhaarNumber}</span>
                          ) : (
                            <span className="text-amber-400 font-normal">Aadhaar: Pending</span>
                          )}
                          {staff.pincode && <span className="text-[#888]">• PIN {staff.pincode}</span>}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        {staff.accountNumber ? (
                          <div>
                            <div className="text-emerald-400 font-bold">{staff.bankName}</div>
                            <div className="text-[10px] text-[#888]">A/C: {staff.accountNumber} • {staff.ifscCode}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-400">⚠️ Bank details missing</span>
                        )}
                      </td>

                      {isSuperAdmin && (
                        <td className="p-3.5 text-right font-mono font-black text-sm text-emerald-400">
                          ₹{(staff.monthlySalary || 18000).toLocaleString('en-IN')}
                          <span className="text-[9px] text-[#666] block font-normal">
                            ₹{staff.dailyRate || 600}/day
                          </span>
                        </td>
                      )}

                      <td className="p-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          (staff.employmentStatus || 'Active') === 'Active'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                        }`}>
                          {staff.employmentStatus || 'Active'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingStaff(staff);
                              setIsStaffModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-white/10 text-teal-300 hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit Staff &amp; Banking Profile"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {(staff.employmentStatus || 'Active') === 'Active' && (
                            <button
                              onClick={() => {
                                if (confirm(`Deactivate staff profile for "${staff.name}"? Historical attendance and salary records will be safely preserved.`)) {
                                  deactivateUser(staff.id);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-rose-900/40 text-rose-400 hover:bg-rose-900/30 transition-colors cursor-pointer"
                              title="Deactivate Staff"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SHIFT MANAGEMENT                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-white">Park Work Shifts</h3>
              <p className="text-xs text-[#94A3B8]">Configure shift timings, break durations, and overtime tracking rules</p>
            </div>
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Shift Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shifts.map(shift => (
              <div key={shift.id} className="p-5 bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-sm">{shift.name}</h4>
                    <span className="text-[10px] text-teal-400 font-mono">ID: {shift.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    shift.isActive ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' : 'bg-white/5 text-[#666] border-white/10'
                  }`}>
                    {shift.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-[#1C1C1C]">
                  <div>
                    <span className="text-[10px] text-[#666] block">Hours:</span>
                    <strong className="text-white">{shift.startTime} - {shift.endTime}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#666] block">Break Duration:</span>
                    <strong className="text-white">{shift.breakDurationMinutes} mins</strong>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#1C1C1C]">
                  <button
                    onClick={() => {
                      updateShift({ ...shift, isActive: !shift.isActive });
                    }}
                    className="text-[10px] font-bold text-teal-400 hover:underline cursor-pointer"
                  >
                    {shift.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete shift "${shift.name}"?`)) deleteShift(shift.id);
                    }}
                    className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. LEAVE MANAGEMENT                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'leaves' && (
        <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0A0A0A] text-[#94A3B8] font-mono font-bold border-b border-[#00ABAB]/30">
                  <th className="p-3.5">Staff Name</th>
                  <th className="p-3.5">Leave Type</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5 text-right">Days</th>
                  <th className="p-3.5">Pay Policy</th>
                  <th className="p-3.5">Reason</th>
                  <th className="p-3.5">Approval Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#94A3B8]">
                      No leave requests submitted yet. Click <strong>"Apply Leave"</strong> to record employee absence requests.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map(leave => (
                    <tr key={leave.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5 font-bold text-white">
                        {leave.staffName}
                      </td>

                      <td className="p-3.5 font-mono text-teal-400 font-bold">
                        {leave.leaveType}
                      </td>

                      <td className="p-3.5 font-mono text-white">
                        {leave.startDate} to {leave.endDate}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-white">
                        {leave.numberOfDays} days
                      </td>

                      <td className="p-3.5 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${leave.isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {leave.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                        </span>
                      </td>

                      <td className="p-3.5 text-[#94A3B8] max-w-xs truncate" title={leave.reason}>
                        {leave.reason}
                      </td>

                      <td className="p-3.5 font-mono">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          leave.status === 'Approved'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            : leave.status === 'Rejected'
                            ? 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                            : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                        }`}>
                          {leave.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        {leave.status === 'Pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => updateLeaveRequestStatus(leave.id, 'Approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-[10px] cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const r = prompt('Reason for rejection:');
                                if (r) updateLeaveRequestStatus(leave.id, 'Rejected', r);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 font-bold text-[10px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. ATTENDANCE-LINKED PAYROLL & PAY SLIP SECTION               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'payroll' && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Header & Formula Explanation Card */}
          <div className="glass-panel p-5 rounded-3xl border border-[#00ABAB]/30 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-[#40E0D0]">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-base text-white font-sans">
                    Staff Payroll &amp; Pay Slip Generation
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00ABAB]/15 text-[#40E0D0] border border-[#00ABAB]/30">
                    Standard 30-Day Pay Basis
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Salary and Incentives are manually entered per employee. Present days, leave deductions, and Overtime (OT) are calculated 100% automatically from attendance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#94A3B8] font-bold whitespace-nowrap">Pay Month:</span>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={e => setPayrollMonth(e.target.value)}
                  className="bg-[#141414] border border-[#00ABAB]/40 focus:border-[#40E0D0] rounded-xl px-3 py-1.5 text-white font-mono text-xs font-bold outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Accounting Formula Banner */}
            <div className="p-3.5 bg-[#0A0A0A] rounded-2xl border border-[#1C1C1C] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#888] uppercase block">1. Total Gross Salary</span>
                <span className="text-emerald-400 font-bold block">
                  Gross = Salary (Manual) + Incentives + OT Pay
                </span>
                <span className="text-[10px] text-[#666]">OT Rate = (Salary ÷ 30 ÷ 8) × 1.5</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-[#888] uppercase block">2. Leave Salary Deduction</span>
                <span className="text-rose-400 font-bold block">
                  Deduction = Leave Days × (Salary ÷ 30)
                </span>
                <span className="text-[10px] text-[#666]">Days on Leave = Absent + Unpaid + (Half Day × 0.5)</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-[#888] uppercase block">3. Net Payable Disbursal</span>
                <span className="text-[#40E0D0] font-bold block">
                  Net Pay = Total Gross − Leave Deduction
                </span>
                <span className="text-[10px] text-[#666]">Official Pay Slip generated with 1 click</span>
              </div>
            </div>
          </div>

          {/* Payroll KPI Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-4 bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-2xl space-y-1">
              <span className="text-[10px] text-[#40E0D0] font-bold uppercase tracking-wider block">Total Gross Payroll</span>
              <div className="text-xl font-black text-white">
                ₹{payrollSummaries.reduce((s, p) => s + p.totalGross, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[9px] text-[#888]">Across {payrollSummaries.length} staff members</span>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-rose-900/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">Leave Deductions</span>
              <div className="text-xl font-black text-rose-400">
                −₹{payrollSummaries.reduce((s, p) => s + p.leaveDeduction, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[9px] text-rose-300/60">
                {payrollSummaries.reduce((s, p) => s + p.leaveDays, 0)} total leave days docked
              </span>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-purple-900/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Overtime (OT) Pay</span>
              <div className="text-xl font-black text-purple-400">
                +₹{payrollSummaries.reduce((s, p) => s + p.otPay, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[9px] text-purple-300/60">
                {payrollSummaries.reduce((s, p) => s + p.overtimeHours, 0)} hrs logged in shifts
              </span>
            </div>

            <div className="p-4 bg-[#0A0A0A] border border-emerald-900/40 rounded-2xl space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Net Disbursable Salary</span>
              <div className="text-xl font-black text-emerald-400">
                ₹{payrollSummaries.reduce((s, p) => s + p.netPayable, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <span className="text-[9px] text-emerald-300/60">Final payout for {payrollMonth}</span>
            </div>
          </div>

          {/* Main Payroll & Pay Slip Register Table */}
          <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-[#0A0A0A] text-[#94A3B8] text-[10px] uppercase font-bold border-b border-[#00ABAB]/30">
                    <th className="p-3.5">Employee Name &amp; Dept</th>
                    <th className="p-3.5 text-right min-w-[140px]">Base Salary (Manual)</th>
                    <th className="p-3.5 text-center">Attendance (Log)</th>
                    <th className="p-3.5 text-center">Leave Days</th>
                    <th className="p-3.5 text-right text-rose-400">Leave Deduction (÷30)</th>
                    <th className="p-3.5 text-right min-w-[120px]">Incentives (Manual)</th>
                    <th className="p-3.5 text-right text-purple-300">OT (Hours / Pay)</th>
                    <th className="p-3.5 text-right text-white">Total Gross</th>
                    <th className="p-3.5 text-right text-emerald-400 font-black">Net Pay</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Pay Slip &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {payrollSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-[#94A3B8]">
                        No staff employees found. Add staff in Staff Master to compute payroll.
                      </td>
                    </tr>
                  ) : (
                    payrollSummaries.map(p => {
                      return (
                        <tr key={p.staff.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3.5 font-sans">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {p.staff.name}
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-teal-300">
                                {p.staff.employeeId || p.staff.id.slice(-6).toUpperCase()}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#666] font-mono">
                              {p.staff.department || 'Operations'} • {p.staff.designation || p.staff.role}
                            </div>
                            <div className="text-[9px] text-[#555] font-mono mt-0.5">
                              A/C: {p.staff.accountNumber ? `${p.staff.bankName || 'Bank'} (${p.staff.accountNumber})` : 'Direct Cash/Transfer'}
                            </div>
                          </td>

                          {/* Base Salary Manual Input */}
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-[#888]">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="500"
                                value={p.baseSalary}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setManualSalaries(prev => ({ ...prev, [p.staff.id]: val }));
                                }}
                                onBlur={() => {
                                  updateUser({ ...p.staff, monthlySalary: p.baseSalary });
                                }}
                                className="w-24 bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-lg px-2 py-1 text-right text-white font-bold text-xs outline-none"
                                title="Manually edit monthly salary for this employee"
                              />
                            </div>
                            <span className="text-[9px] text-[#666] block font-mono">
                              ₹{p.perDaySalary.toFixed(0)}/day
                            </span>
                          </td>

                          {/* Attendance Breakdown (From Attendance) */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1 text-[11px]">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" title="Present Days">
                                {p.presentDays}P
                              </span>
                              {p.halfDays > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40" title="Half Days">
                                  {p.halfDays}HD
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-800/40" title="Paid Leaves">
                                {p.paidLeaveDays}PL
                              </span>
                            </div>
                            <span className="text-[9px] text-[#666] block mt-0.5">
                              {p.payableDays}/30 Payable
                            </span>
                          </td>

                          {/* Leave Days Subject to Deduction */}
                          <td className="p-3.5 text-center">
                            {p.leaveDays > 0 ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                {p.leaveDays} Days
                              </span>
                            ) : (
                              <span className="text-emerald-400 text-[11px] font-bold">
                                0 Days
                              </span>
                            )}
                          </td>

                          {/* Leave Salary Deduction */}
                          <td className="p-3.5 text-right font-bold text-rose-400">
                            {p.leaveDeduction > 0 ? (
                              <>
                                −₹{p.leaveDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                <span className="text-[9px] text-[#666] block font-normal">
                                  ({p.leaveDays}d × ₹{p.perDaySalary.toFixed(0)})
                                </span>
                              </>
                            ) : (
                              <span className="text-[#666] font-normal">₹0.00</span>
                            )}
                          </td>

                          {/* Incentives Manual Input */}
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span className="text-[#888]">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={p.incentives}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setManualIncentives(prev => ({ ...prev, [p.staff.id]: val }));
                                }}
                                className="w-20 bg-[#141414] border border-[#262626] focus:border-teal-400 rounded-lg px-2 py-1 text-right text-teal-300 font-bold text-xs outline-none"
                                title="Manually enter bonus/performance incentives"
                              />
                            </div>
                            <span className="text-[9px] text-[#666] block">Bonus / Tip</span>
                          </td>

                          {/* Overtime (OT) From Attendance */}
                          <td className="p-3.5 text-right text-purple-300">
                            <div className="font-bold">
                              ₹{p.otPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <span className="text-[9px] text-purple-300/70 block">
                              {p.overtimeHours} hrs @ 1.5x
                            </span>
                          </td>

                          {/* Total Gross Salary */}
                          <td className="p-3.5 text-right font-bold text-white">
                            ₹{p.totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Net Payable Disbursal */}
                          <td className="p-3.5 text-right font-black text-sm text-emerald-400">
                            ₹{p.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status */}
                          <td className="p-3.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              p.paymentStatus === 'Paid'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                            }`}>
                              {p.paymentStatus}
                            </span>
                          </td>

                          {/* Actions: Pay Slip & Disbursal */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 📄 Pay Slip Button */}
                              <button
                                onClick={() => {
                                  setSelectedPaySlipData({
                                    staff: p.staff,
                                    month: p.month,
                                    baseSalary: p.baseSalary,
                                    incentives: p.incentives,
                                    otHours: p.overtimeHours,
                                    otPay: p.otPay,
                                    totalGross: p.totalGross,
                                    daysInMonth: p.daysInMonth,
                                    perDaySalary: p.perDaySalary,
                                    hourlyRate: p.hourlyRate,
                                    presentDays: p.presentDays,
                                    halfDays: p.halfDays,
                                    absentDays: p.absentDays,
                                    paidLeaveDays: p.paidLeaveDays,
                                    unpaidLeaveDays: p.unpaidLeaveDays,
                                    weeklyOffDays: p.weeklyOffDays,
                                    leaveDays: p.leaveDays,
                                    leaveDeduction: p.leaveDeduction,
                                    netPayable: p.netPayable,
                                    paymentStatus: p.paymentStatus as any,
                                    paymentMethod: p.staff.accountNumber ? 'Bank Transfer' : 'Cash',
                                    transactionRef: p.paymentId
                                  });
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-[#40E0D0] border border-teal-500/40 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                title="Open & Print Official Pay Slip"
                              >
                                <FileText className="w-3.5 h-3.5" /> Pay Slip
                              </button>

                              {/* Save / Disburse Button */}
                              {p.paymentStatus !== 'Paid' ? (
                                <button
                                  onClick={() => {
                                    saveSalaryPayment({
                                      staffId: p.staff.id,
                                      staffName: p.staff.name,
                                      month: p.month,
                                      baseSalary: p.baseSalary,
                                      dailyRate: p.dailyRate,
                                      totalDaysInMonth: p.daysInMonth,
                                      presentDays: p.presentDays,
                                      halfDays: p.halfDays,
                                      absentDays: p.absentDays,
                                      paidLeaveDays: p.paidLeaveDays,
                                      unpaidLeaveDays: p.unpaidLeaveDays,
                                      payableDays: p.payableDays,
                                      approvedOvertimeHours: p.overtimeHours,
                                      overtimePay: p.otPay,
                                      bonusAmount: p.incentives,
                                      incentives: p.incentives,
                                      deductionAmount: p.leaveDeduction,
                                      leaveDeduction: p.leaveDeduction,
                                      grossSalary: p.totalGross,
                                      calculatedSalary: p.calculatedSalary,
                                      netPayable: p.netPayable,
                                      paymentMethod: 'Bank Transfer',
                                      paymentStatus: 'Pending',
                                      bankName: p.staff.bankName,
                                      accountNumber: p.staff.accountNumber,
                                      ifscCode: p.staff.ifscCode
                                    });
                                    alert(`Recorded salary calculations and pay slip for ${p.staff.name}!`);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[10px] font-bold cursor-pointer"
                                  title="Save / Submit to Super Admin"
                                >
                                  Save Record
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-400 font-bold">
                                  ✓ Disbursed
                                </span>
                              )}

                              {isSuperAdmin && p.paymentId && !p.isApproved && (
                                <button
                                  onClick={() => {
                                    approveSalaryPayment(p.paymentId!);
                                    alert(`Super Admin approved salary payment for ${p.staff.name}!`);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black cursor-pointer shadow-md"
                                  title="Approve Disbursal"
                                >
                                  Approve
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. ATTENDANCE & PAYROLL REPORTS                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-400" /> Attendance Summary Statistics
            </h3>
            <p className="text-xs text-[#94A3B8]">Cumulative records across shifts and activities</p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-[#141414] rounded-xl flex justify-between">
                <span>Total Recorded Shifts:</span>
                <strong className="text-white">{staffAttendance.length} entries</strong>
              </div>
              <div className="p-3 bg-[#141414] rounded-xl flex justify-between">
                <span>Overall Present Rate:</span>
                <strong className="text-emerald-400">
                  {staffAttendance.length > 0 
                    ? Math.round((staffAttendance.filter(a => a.status.toString().toLowerCase() === 'present').length / staffAttendance.length) * 100) 
                    : 100}%
                </strong>
              </div>
              <div className="p-3 bg-[#141414] rounded-xl flex justify-between">
                <span>Total Approved Leaves:</span>
                <strong className="text-teal-300">
                  {leaveRequests.filter(l => l.status === 'Approved').length} approved leaves
                </strong>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30 space-y-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-400" /> Department Breakdown
            </h3>
            <p className="text-xs text-[#94A3B8]">Staff allocation per park operation</p>

            <div className="space-y-2 text-xs font-mono">
              {DEPARTMENTS.map(dept => {
                const count = staffList.filter(s => s.department === dept).length;
                if (count === 0) return null;
                return (
                  <div key={dept} className="p-3 bg-[#141414] rounded-xl flex justify-between">
                    <span>{dept}:</span>
                    <strong className="text-teal-300">{count} staff</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Staff Profile Master Modal */}
      <StaffProfileModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staff={editingStaff}
        onSave={(updated) => {
          if (editingStaff) updateUser(updated);
          else addUser(updated);
        }}
        isNew={!editingStaff}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Leave Application Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-3">
              <h3 className="font-bold text-base text-white">Record Leave Request</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-[#666] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">Select Employee *</label>
                <select
                  required
                  value={leaveStaffId}
                  onChange={e => setLeaveStaffId(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                >
                  <option value="">Choose Employee</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={e => setLeaveType(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={e => setLeaveStart(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={e => setLeaveEnd(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chk-leave-paid"
                  checked={leaveIsPaid}
                  onChange={e => setLeaveIsPaid(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#00ABAB]"
                />
                <label htmlFor="chk-leave-paid" className="text-white cursor-pointer">
                  Eligible for Paid Leave
                </label>
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={e => setLeaveReason(e.target.value)}
                  placeholder="Medical, family emergency, or personal..."
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl p-2.5 text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1C1C1C]">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#262626] text-[#94A3B8] font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold"
                >
                  Submit Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-3">
              <h3 className="font-bold text-base text-white">New Shift Schedule</h3>
              <button onClick={() => setIsShiftModalOpen(false)} className="text-[#666] hover:text-white">✕</button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              if (!newShiftName.trim()) return;
              addShift({
                name: newShiftName.trim(),
                startTime: newShiftStart,
                endTime: newShiftEnd,
                breakDurationMinutes: newShiftBreak,
                isActive: true
              });
              setIsShiftModalOpen(false);
              setNewShiftName('');
            }} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">Shift Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Afternoon Peak Shift"
                  value={newShiftName}
                  onChange={e => setNewShiftName(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newShiftStart}
                    onChange={e => setNewShiftStart(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] font-bold uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    value={newShiftEnd}
                    onChange={e => setNewShiftEnd(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">Break Duration (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  step="15"
                  value={newShiftBreak}
                  onChange={e => setNewShiftBreak(Number(e.target.value) || 0)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1C1C1C]">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#262626] text-[#94A3B8] font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold"
                >
                  Create Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-3">
              <h3 className="font-bold text-base text-white">Correct Attendance Record</h3>
              <button onClick={() => setCorrectionTarget(null)} className="text-[#666] hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-[#141414] rounded-xl font-mono text-xs space-y-1">
              <div>Staff: <strong className="text-white">{correctionTarget.staffName}</strong></div>
              <div>Date: <strong className="text-white">{correctionTarget.date}</strong></div>
              <div>Current Status: <strong className="text-teal-400">{correctionTarget.status}</strong></div>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              if (!correctionReason.trim()) {
                alert('Please state the reason for this attendance correction.');
                return;
              }
              correctAttendance(correctionTarget.id, { status: correctionStatus }, correctionReason.trim());
              setCorrectionTarget(null);
            }} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1">New Status *</label>
                <select
                  value={correctionStatus}
                  onChange={e => setCorrectionStatus(e.target.value as AttendanceStatusType)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                >
                  {ATTENDANCE_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#94A3B8] font-bold uppercase mb-1 font-sans">Reason for Correction *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Card scanner sync failure, Late gate approval"
                  value={correctionReason}
                  onChange={e => setCorrectionReason(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] focus:border-[#00ABAB] rounded-xl px-3 py-2 text-white outline-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1C1C1C]">
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[#262626] text-[#94A3B8] font-bold hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00ABAB] to-[#40E0D0] text-black font-bold"
                >
                  Save Audited Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* PAY SLIP PRINTABLE MODAL                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedPaySlipData && (
        <PaySlipModal 
          data={selectedPaySlipData} 
          onClose={() => setSelectedPaySlipData(null)} 
        />
      )}

    </div>
  );
};
