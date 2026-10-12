/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DEUCE PARK — SUB-ADMIN FINANCE ENTRY PORTAL
 * Operational Data Entry Terminal for:
 * 1. Staff Master
 * 2. Activity Master
 * 3. Expense Category Master
 * 4. Supplier Master
 * 5. Item / Purchase Master
 * 6. Activity-Wise Purchases
 * 7. Category-Wise Expenses
 * 8. Salary Data Entry
 * 9. Invoice and Receipt Uploads
 * 10. Submitted Entries and Status
 *
 * STRICT ACCESS RESTRICTION:
 * Sub-Admins have operational data-entry rights only.
 * They are completely restricted from viewing:
 * - Balance Sheet
 * - Profit & Loss statement
 * - Total park revenue
 * - Total assets & liabilities
 * - Bank balances or consolidated financial statements
 */

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  Users, Building2, Tag, Truck, Package, ShoppingCart, 
  Receipt, Wallet, Upload, Clock, CheckCircle, XCircle, 
  AlertTriangle, Plus, Search, Filter, Edit, Trash2, 
  FileText, ArrowRight, Eye, ShieldAlert, Sparkles, Check, 
  RotateCcw, Download, X, Coffee, Utensils
} from 'lucide-react';
import { SupplierRecord, PurchaseItemRecord, ExpenseRecord, EntryWorkflowStatus } from '../../types';
import { StaffManagementPanel } from './StaffManagementPanel';
import { FoodStreetInventoryPanel } from './FoodStreetInventoryPanel';

type SubAdminSection = 
  | 'staff_master'
  | 'activity_master'
  | 'category_master'
  | 'supplier_master'
  | 'item_master'
  | 'activity_purchases'
  | 'category_expenses'
  | 'salary_entry'
  | 'invoice_uploads'
  | 'submitted_status';

export const SubAdminFinancePortal: React.FC = () => {
  const { 
    currentUser, activities, users, suppliers, addSupplier, updateSupplier, toggleSupplierStatus,
    purchaseItems, addPurchaseItem, updatePurchaseItem, togglePurchaseItemStatus,
    dayExpenses, addExpenseRecord, updateExpenseRecord,
    staffSalaryPayments, saveSalaryPayment
  } = useAppContext();

  const [activeSection, setActiveSection] = useState<SubAdminSection>('activity_purchases');
  const [purchaseSubMode, setPurchaseSubMode] = useState<'general' | 'cafe'>('general');

  // ── 1. Activity Master State (Local Custom Activities) ──
  const [customActivities, setCustomActivities] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dp_custom_departments_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newActivityName, setNewActivityName] = useState('');

  const defaultActivitiesList = [
    'Cafe / Food Street', 'Go-Karting', 'Air Rifle Shooting', 'Horse Riding',
    'Sports Academy', 'Gaming Zone', 'Adventure Activities', 'Maintenance & Repairs',
    'Administration / Office', 'Utilities', 'Security & Housekeeping', 'Marketing',
    'Common Park Expenses', 'Other Activities'
  ];

  const allActivityNames = useMemo(() => {
    const set = new Set([...defaultActivitiesList, ...customActivities]);
    activities.forEach(a => set.add(a.name));
    return Array.from(set);
  }, [activities, customActivities]);

  const handleAddCustomActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    const trimmed = newActivityName.trim();
    if (!allActivityNames.includes(trimmed)) {
      const next = [...customActivities, trimmed];
      setCustomActivities(next);
      localStorage.setItem('dp_custom_departments_v1', JSON.stringify(next));
    }
    setNewActivityName('');
  };

  // ── 2. Expense Category Master State ──
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dp_custom_categories_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newCategoryName, setNewCategoryName] = useState('');

  const defaultCategoriesList = [
    'Raw Materials', 'Consumables', 'Equipment', 'Spare Parts', 'Maintenance',
    'Utilities', 'Staff Salaries', 'Transport', 'Rent', 'Marketing',
    'Safety Equipment', 'Cleaning Supplies', 'Office Supplies', 'Veterinary and Animal Care',
    'Other Expenses'
  ];

  const allCategoryNames = useMemo(() => {
    return Array.from(new Set([...defaultCategoriesList, ...customCategories]));
  }, [customCategories]);

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const trimmed = newCategoryName.trim();
    if (!allCategoryNames.includes(trimmed)) {
      const next = [...customCategories, trimmed];
      setCustomCategories(next);
      localStorage.setItem('dp_custom_categories_v1', JSON.stringify(next));
    }
    setNewCategoryName('');
  };

  // ── 3. Supplier Master Modal & Form State ──
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    supplierName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    supplierType: 'Vendor',
    notes: '',
    isActive: true
  });

  const handleOpenSupplierModal = (sup?: SupplierRecord) => {
    if (sup) {
      setEditingSupplier(sup);
      setSupplierForm({
        supplierName: sup.supplierName,
        contactPerson: sup.contactPerson || '',
        phone: sup.phone,
        email: sup.email || '',
        address: sup.address || '',
        gstin: sup.gstin || '',
        supplierType: sup.supplierType,
        notes: sup.notes || '',
        isActive: sup.isActive
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm({
        supplierName: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        supplierType: 'Vendor',
        notes: '',
        isActive: true
      });
    }
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.supplierName.trim() || !supplierForm.phone.trim()) {
      alert('Supplier Name and Phone are required.');
      return;
    }

    if (editingSupplier) {
      updateSupplier({
        ...editingSupplier,
        ...supplierForm
      });
    } else {
      addSupplier(supplierForm);
    }
    setIsSupplierModalOpen(false);
  };

  // ── 4. Item Master Modal & Form State ──
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseItemRecord | null>(null);
  const [itemForm, setItemForm] = useState({
    itemCode: '',
    itemName: '',
    category: 'Consumables',
    defaultUnit: 'piece',
    taxClassification: 'Standard GST 18%',
    defaultGstPercent: 18,
    defaultSupplierId: '',
    defaultSupplierName: '',
    defaultRate: 0,
    isActive: true
  });

  const handleOpenItemModal = (item?: PurchaseItemRecord) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        itemCode: item.itemCode,
        itemName: item.itemName,
        category: item.category,
        defaultUnit: item.defaultUnit,
        taxClassification: item.taxClassification || 'Standard GST 18%',
        defaultGstPercent: item.defaultGstPercent,
        defaultSupplierId: item.defaultSupplierId || '',
        defaultSupplierName: item.defaultSupplierName || '',
        defaultRate: item.defaultRate || 0,
        isActive: item.isActive
      });
    } else {
      setEditingItem(null);
      setItemForm({
        itemCode: `ITM-${Date.now().toString().slice(-4)}`,
        itemName: '',
        category: 'Consumables',
        defaultUnit: 'piece',
        taxClassification: 'Standard GST 18%',
        defaultGstPercent: 18,
        defaultSupplierId: '',
        defaultSupplierName: '',
        defaultRate: 0,
        isActive: true
      });
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.itemCode.trim() || !itemForm.itemName.trim()) {
      alert('Item Code and Item Name are required.');
      return;
    }

    const sup = suppliers.find(s => s.id === itemForm.defaultSupplierId);
    const enriched = {
      ...itemForm,
      defaultSupplierName: sup ? sup.supplierName : itemForm.defaultSupplierName
    };

    if (editingItem) {
      updatePurchaseItem({
        ...editingItem,
        ...enriched
      });
    } else {
      addPurchaseItem(enriched);
    }
    setIsItemModalOpen(false);
  };

  // ── 5. Activity-Wise Purchase Entry State ──
  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    department: 'Cafe / Food Street',
    category: 'Raw Materials',
    supplier: '',
    supplierInvoiceNumber: '',
    itemId: '',
    itemName: '',
    quantity: 1,
    unit: 'Kg',
    ratePerUnit: 0,
    discount: 0,
    gstRate: 5,
    amountPaid: 0,
    paymentMethod: 'Cash' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Credit',
    paymentStatus: 'Unpaid' as 'Paid' | 'Partially Paid' | 'Unpaid',
    receiptAttachment: '',
    notes: '',
    workflowStatus: 'submitted' as EntryWorkflowStatus
  });

  const [purchaseSubmitSuccess, setPurchaseSubmitSuccess] = useState<string | null>(null);

  const purchaseCalculations = useMemo(() => {
    const gross = (purchaseForm.quantity || 0) * (purchaseForm.ratePerUnit || 0);
    const taxable = Math.max(0, gross - (purchaseForm.discount || 0));
    const gstAmt = (taxable * (purchaseForm.gstRate || 0)) / 100;
    const total = taxable + gstAmt;
    const balance = Math.max(0, total - (purchaseForm.amountPaid || 0));
    return { gross, taxable, gstAmt, total, balance };
  }, [purchaseForm.quantity, purchaseForm.ratePerUnit, purchaseForm.discount, purchaseForm.gstRate, purchaseForm.amountPaid]);

  const handleSelectItemForPurchase = (itemId: string) => {
    const itm = purchaseItems.find(i => i.id === itemId);
    if (itm) {
      setPurchaseForm(prev => ({
        ...prev,
        itemId: itm.id,
        itemName: itm.itemName,
        category: itm.category,
        unit: itm.defaultUnit,
        ratePerUnit: itm.defaultRate || prev.ratePerUnit,
        gstRate: itm.defaultGstPercent,
        supplier: itm.defaultSupplierName || prev.supplier
      }));
    }
  };

  const handleSavePurchaseEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.itemName.trim() || !purchaseForm.supplier.trim()) {
      alert('Item Name and Supplier are required.');
      return;
    }

    try {
      const existingRaw = localStorage.getItem('dp_purchases_v1');
      let purchases: any[] = existingRaw ? JSON.parse(existingRaw) : [];
      
      const newEntry = {
        id: `purch-sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date: purchaseForm.date,
        department: purchaseForm.department,
        category: purchaseForm.category,
        itemName: purchaseForm.itemName,
        description: `Sub-Admin Entry: ${purchaseForm.itemName} (Inv #${purchaseForm.supplierInvoiceNumber || 'N/A'})`,
        supplier: purchaseForm.supplier,
        invoiceNumber: purchaseForm.supplierInvoiceNumber,
        quantity: purchaseForm.quantity,
        unit: purchaseForm.unit,
        unitPrice: purchaseForm.ratePerUnit,
        gstPercent: purchaseForm.gstRate,
        gstAmount: purchaseCalculations.gstAmt,
        totalCost: purchaseCalculations.total,
        paymentMethod: purchaseForm.paymentMethod,
        amountPaid: purchaseForm.amountPaid,
        outstandingBalance: purchaseCalculations.balance,
        paymentStatus: purchaseCalculations.balance === 0 && purchaseCalculations.total > 0 ? 'Paid' : purchaseForm.amountPaid > 0 ? 'Partially Paid' : 'Unpaid',
        notes: `${purchaseForm.notes}${purchaseForm.receiptAttachment ? ' [Receipt Attached]' : ''}`,
        isInventory: purchaseForm.category === 'Raw Materials' || purchaseForm.category === 'Inventory / Stock',
        isFixedAsset: purchaseForm.category === 'Equipment' || purchaseForm.category === 'Fixed Asset',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Finance Sub-Admin',
        workflowStatus: 'submitted'
      };

      purchases.unshift(newEntry);
      localStorage.setItem('dp_purchases_v1', JSON.stringify(purchases));

      setPurchaseSubmitSuccess(`Purchase entry #${newEntry.id} recorded successfully and submitted to Super Admin.`);
      setTimeout(() => setPurchaseSubmitSuccess(null), 4000);

      // Reset form
      setPurchaseForm(prev => ({
        ...prev,
        supplierInvoiceNumber: '',
        itemName: '',
        itemId: '',
        quantity: 1,
        ratePerUnit: 0,
        discount: 0,
        amountPaid: 0,
        receiptAttachment: '',
        notes: ''
      }));
    } catch (err: any) {
      alert(`Failed to save entry: ${err.message || String(err)}`);
    }
  };

  // ── 6. Category-Wise Expenditure State ──
  const [expenseForm, setExpenseForm] = useState({
    expenseRef: `EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    expenseDate: new Date().toISOString().split('T')[0],
    department: 'Maintenance & Repairs',
    expenseCategory: 'Maintenance',
    description: '',
    payee: '',
    invoiceOrRefNumber: '',
    amountBeforeTax: 0,
    gstPercent: 18,
    paymentMethod: 'Cash' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Credit',
    amountPaid: 0,
    receiptAttachment: '',
    notes: '',
    workflowStatus: 'submitted' as EntryWorkflowStatus
  });

  const [expenseSubmitSuccess, setExpenseSubmitSuccess] = useState<string | null>(null);

  const expenseCalculations = useMemo(() => {
    const taxable = expenseForm.amountBeforeTax || 0;
    const gstAmt = (taxable * (expenseForm.gstPercent || 0)) / 100;
    const total = taxable + gstAmt;
    const balance = Math.max(0, total - (expenseForm.amountPaid || 0));
    return { taxable, gstAmt, total, balance };
  }, [expenseForm.amountBeforeTax, expenseForm.gstPercent, expenseForm.amountPaid]);

  const handleSaveExpenseEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.description.trim() || !expenseForm.payee.trim() || expenseCalculations.total <= 0) {
      alert('Description, Payee, and positive amount are required.');
      return;
    }

    addExpenseRecord({
      expenseRef: expenseForm.expenseRef,
      expenseDate: expenseForm.expenseDate,
      department: expenseForm.department,
      expenseCategory: expenseForm.expenseCategory,
      description: expenseForm.description,
      payee: expenseForm.payee,
      invoiceOrRefNumber: expenseForm.invoiceOrRefNumber,
      amountBeforeTax: expenseForm.amountBeforeTax,
      gstPercent: expenseForm.gstPercent,
      gstAmount: expenseCalculations.gstAmt,
      totalAmount: expenseCalculations.total,
      paymentMethod: expenseForm.paymentMethod,
      paymentStatus: expenseCalculations.balance === 0 ? 'Paid' : expenseForm.amountPaid > 0 ? 'Partially Paid' : 'Unpaid',
      amountPaid: expenseForm.amountPaid,
      receiptAttachment: expenseForm.receiptAttachment,
      notes: expenseForm.notes,
      createdBy: currentUser?.name || 'Finance Sub-Admin',
      createdByEmail: currentUser?.email,
      workflowStatus: 'submitted'
    });

    setExpenseSubmitSuccess(`Expense voucher ${expenseForm.expenseRef} submitted successfully for review.`);
    setTimeout(() => setExpenseSubmitSuccess(null), 4000);

    // Reset form
    setExpenseForm(prev => ({
      ...prev,
      expenseRef: `EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      description: '',
      payee: '',
      invoiceOrRefNumber: '',
      amountBeforeTax: 0,
      amountPaid: 0,
      receiptAttachment: '',
      notes: ''
    }));
  };

  // ── 7. File Attachment Handler ──
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'purchase' | 'expense') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Receipt attachment size exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (target === 'purchase') {
        setPurchaseForm(prev => ({ ...prev, receiptAttachment: base64 }));
      } else {
        setExpenseForm(prev => ({ ...prev, receiptAttachment: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  // ── 8. Submitted Purchases & Ledger Items ──
  const submittedPurchases = useMemo(() => {
    try {
      const raw = localStorage.getItem('dp_purchases_v1');
      if (!raw) return [];
      const parsed: any[] = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [purchaseSubmitSuccess]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-white min-h-screen">
      
      {/* ── Top Header Banner (Strict Sub-Admin Role Isolation) ── */}
      <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30 relative overflow-hidden bg-gradient-to-r from-[#0A0A0A] via-[#121A24] to-[#0A0A0A] shadow-[0_0_30px_rgba(0,171,171,0.15)]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00ABAB]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00ABAB] animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#40E0D0] font-mono">
                Sub-Admin Data Entry Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-white mt-1">
              Finance &amp; Operations Entry Terminal
            </h1>
            <p className="text-xs text-[#9CA3AF] max-w-xl mt-1">
              Authorized data entry for Staff, Activities, Categories, Suppliers, Items, Purchases, and Expenses. 
              All submitted transactions flow directly into Super Admin Accounts &amp; Finance.
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="px-3.5 py-1.5 bg-[#00ABAB]/15 border border-[#00ABAB]/40 rounded-xl text-xs font-mono text-[#40E0D0] font-bold">
              Operator: {currentUser?.name || 'Sub-Admin'}
            </div>
            <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Operational Access Mode (P&amp;L Hidden)
            </span>
          </div>
        </div>
      </div>

      {/* ── 10-Tab Navigation Bar ── */}
      <div className="flex border-b border-[#1C1C1C] gap-1 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'activity_purchases', label: '6. Activity Purchases', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
          { id: 'category_expenses', label: '7. Category Expenses', icon: <Receipt className="w-3.5 h-3.5" /> },
          { id: 'supplier_master', label: '4. Supplier Master', icon: <Truck className="w-3.5 h-3.5" /> },
          { id: 'item_master', label: '5. Item Master', icon: <Package className="w-3.5 h-3.5" /> },
          { id: 'activity_master', label: '2. Activity Master', icon: <Building2 className="w-3.5 h-3.5" /> },
          { id: 'category_master', label: '3. Expense Categories', icon: <Tag className="w-3.5 h-3.5" /> },
          { id: 'staff_master', label: '1. Staff Master', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'salary_entry', label: '8. Salary Data Entry', icon: <Wallet className="w-3.5 h-3.5" /> },
          { id: 'invoice_uploads', label: '9. Invoice & Receipts', icon: <Upload className="w-3.5 h-3.5" /> },
          { id: 'submitted_status', label: '10. Submitted Entries', icon: <Clock className="w-3.5 h-3.5" /> }
        ].map(tab => (
          <button
            key={tab.id}
            id={`btn-subadmin-tab-${tab.id}`}
            onClick={() => setActiveSection(tab.id as SubAdminSection)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSection === tab.id
                ? 'bg-[#00ABAB] text-black shadow-[0_0_15px_rgba(0,171,171,0.35)]'
                : 'text-[#9CA3AF] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: STAFF MASTER DATA
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'staff_master' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-[#121A24]/60 border border-[#00ABAB]/20 rounded-2xl flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#00ABAB]" /> Staff Operational Profiles &amp; Master Directory
              </h3>
              <p className="text-[11px] text-[#9CA3AF]">
                Maintain employee records, assigned departments, designations, joining dates, and shift assignments.
              </p>
            </div>
          </div>
          <StaffManagementPanel isSuperAdmin={false} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: ACTIVITY MASTER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'activity_master' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-5 rounded-2xl border border-[#1C1C1C] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#00ABAB]" /> Activities &amp; Department Master Directory
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              All activities configured here are available in the Activity-Wise Purchase and Expense entry dropdowns.
            </p>

            <form onSubmit={handleAddCustomActivity} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Add new activity (e.g. Paintball Arena, Zipline)..."
                value={newActivityName}
                onChange={e => setNewActivityName(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#00ABAB] hover:bg-[#40E0D0] text-black rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Activity
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {allActivityNames.map(act => (
                <div key={act} className="p-3 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> {act}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121A24] text-[#40E0D0]">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: EXPENSE CATEGORY MASTER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'category_master' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-5 rounded-2xl border border-[#1C1C1C] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#00ABAB]" /> Expense &amp; Purchase Category Master
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              Categorize expenditure items to ensure accurate departmental cost allocation in accounts.
            </p>

            <form onSubmit={handleAddCustomCategory} className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Add custom expense category..."
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#00ABAB] hover:bg-[#40E0D0] text-black rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {allCategoryNames.map(cat => (
                <div key={cat} className="p-3 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{cat}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                    Category
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 4: SUPPLIER MASTER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'supplier_master' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#00ABAB]" /> Supplier Master Records
              </h3>
              <p className="text-xs text-[#9CA3AF]">Create and maintain approved park suppliers and vendors.</p>
            </div>
            <button
              onClick={() => handleOpenSupplierModal()}
              className="px-3 py-2 bg-[#00ABAB] text-black rounded-xl text-xs font-bold hover:bg-[#40E0D0] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Supplier
            </button>
          </div>

          <div className="glass-panel border border-[#1C1C1C] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#9CA3AF] font-mono font-bold">
                    <th className="p-3">Supplier ID</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">GSTIN</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-[#40E0D0] font-bold">{s.id}</td>
                      <td className="p-3 font-bold text-white">
                        {s.supplierName}
                        {s.contactPerson && <div className="text-[10px] text-[#9CA3AF] font-normal">Attn: {s.contactPerson}</div>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#121A24] text-slate-300">
                          {s.supplierType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[#9CA3AF]">{s.phone}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">{s.gstin || 'Unregistered'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenSupplierModal(s)}
                            className="p-1.5 hover:bg-[#00ABAB]/20 text-[#40E0D0] rounded-lg transition-colors cursor-pointer"
                            title="Edit Supplier"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleSupplierStatus(s.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${s.isActive ? 'text-amber-400 hover:bg-amber-400/20' : 'text-emerald-400 hover:bg-emerald-400/20'}`}
                            title={s.isActive ? 'Deactivate Supplier' : 'Activate Supplier'}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
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

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 5: ITEM MASTER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'item_master' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#00ABAB]" /> Purchase Item Master Records
              </h3>
              <p className="text-xs text-[#9CA3AF]">Predefine reusable purchase items, units, and tax classifications.</p>
            </div>
            <button
              onClick={() => handleOpenItemModal()}
              className="px-3 py-2 bg-[#00ABAB] text-black rounded-xl text-xs font-bold hover:bg-[#40E0D0] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Purchase Item
            </button>
          </div>

          <div className="glass-panel border border-[#1C1C1C] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#9CA3AF] font-mono font-bold">
                    <th className="p-3">Item Code</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Default Unit</th>
                    <th className="p-3">Tax Classification</th>
                    <th className="p-3 text-right">Default Rate (₹)</th>
                    <th className="p-3">Default Supplier</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {purchaseItems.map(item => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#40E0D0]">{item.itemCode}</td>
                      <td className="p-3 font-bold text-white">{item.itemName}</td>
                      <td className="p-3 font-mono text-slate-300">{item.category}</td>
                      <td className="p-3 font-mono text-[#9CA3AF] uppercase">{item.defaultUnit}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-500/15 text-violet-300">
                          {item.taxClassification || `${item.defaultGstPercent}% GST`}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-white">
                        ₹{(item.defaultRate || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-[#9CA3AF] text-[11px] truncate max-w-[150px]">
                        {item.defaultSupplierName || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenItemModal(item)}
                            className="p-1.5 hover:bg-[#00ABAB]/20 text-[#40E0D0] rounded-lg transition-colors cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => togglePurchaseItemStatus(item.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${item.isActive ? 'text-amber-400 hover:bg-amber-400/20' : 'text-emerald-400 hover:bg-emerald-400/20'}`}
                            title={item.isActive ? 'Deactivate Item' : 'Activate Item'}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
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

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 6: ACTIVITY-WISE PURCHASES
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'activity_purchases' && (
        <div className="space-y-6 animate-fade-in">
          {purchaseSubmitSuccess && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> {purchaseSubmitSuccess}
            </div>
          )}

          {/* Sub-menu bar for Activity Purchases: All Activities vs Cafe / Food Street */}
          <div className="flex items-center gap-2 border-b border-[#1C1C1C] pb-2">
            <button
              type="button"
              onClick={() => setPurchaseSubMode('general')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                purchaseSubMode === 'general'
                  ? 'bg-[#00ABAB] text-black shadow-[0_0_15px_rgba(0,171,171,0.3)]'
                  : 'bg-[#0A0A0A] text-[#9CA3AF] hover:text-white border border-[#2C2C2C]'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              General Activity Purchases Entry
            </button>
            <button
              type="button"
              onClick={() => setPurchaseSubMode('cafe')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                purchaseSubMode === 'cafe'
                  ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'bg-[#0A0A0A] text-[#9CA3AF] hover:text-white border border-[#2C2C2C]'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-amber-500" />
              Cafe &amp; Food Street Purchases (Raw Materials &amp; Menu Stock)
            </button>
          </div>

          {purchaseSubMode === 'cafe' ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Coffee className="w-4 h-4" /> Cafe &amp; Food Street Inventory Integration
                  </h4>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                    Record Food Street grocery, raw material, packaged item purchases, and manage vendor item recipes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPurchaseForm(prev => ({
                      ...prev,
                      department: 'Cafe / Food Street',
                      category: 'Inventory / Stock'
                    }));
                    setPurchaseSubMode('general');
                  }}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Fast Cafe Voucher
                </button>
              </div>
              <FoodStreetInventoryPanel isSubAdminPortal={true} />
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-[#00ABAB]/30 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#00ABAB]" /> Activity-Wise Purchase Entry
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  Record activity-specific goods, equipment, groceries, spare parts, and ammunition purchases.
                </p>
              </div>

            <form onSubmit={handleSavePurchaseEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.date}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Activity / Department *</label>
                  <select
                    value={purchaseForm.department}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    {allActivityNames.map(act => (
                      <option key={act} value={act}>{act}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Expense / Purchase Category *</label>
                  <select
                    value={purchaseForm.category}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    {allCategoryNames.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Supplier *</label>
                  <select
                    required
                    value={purchaseForm.supplier}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, supplier: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    <option value="">-- Select Registered Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.supplierName}>{s.supplierName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Item selection and specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Select Reusable Item (Optional)</label>
                  <select
                    value={purchaseForm.itemId}
                    onChange={e => handleSelectItemForPurchase(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    <option value="">-- Custom / Manual Item --</option>
                    {purchaseItems.map(i => (
                      <option key={i.id} value={i.id}>[{i.itemCode}] {i.itemName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Item / Material Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2T Oil, Pellets, Milk, Bread"
                    value={purchaseForm.itemName}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, itemName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Supplier Invoice Number</label>
                  <input
                    type="text"
                    placeholder="INV-2026-XXXX"
                    value={purchaseForm.supplierInvoiceNumber}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, supplierInvoiceNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Unit of Measurement</label>
                  <select
                    value={purchaseForm.unit}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    {['Kg', 'g', 'Litre', 'ml', 'Packet', 'Bottle', 'Piece', 'Box', 'Bag'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing, Tax and Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Quantity Purchased</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={purchaseForm.quantity}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Rate per Unit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={purchaseForm.ratePerUnit}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, ratePerUnit: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={purchaseForm.discount}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">GST Rate (%)</label>
                  <select
                    value={purchaseForm.gstRate}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, gstRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  >
                    {[0, 5, 12, 18, 28].map(r => (
                      <option key={r} value={r}>{r}% GST</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#40E0D0] mb-1 font-bold">Total Invoice Value (₹)</label>
                  <div className="w-full px-3 py-2 bg-[#121A24] border border-[#00ABAB]/40 rounded-xl text-xs font-mono font-black text-[#40E0D0]">
                    ₹{purchaseCalculations.total.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Payment details and attachment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={purchaseForm.amountPaid}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Payment Method</label>
                  <select
                    value={purchaseForm.paymentMethod}
                    onChange={e => setPurchaseForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    {['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Credit'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Outstanding Balance (₹)</label>
                  <div className={`w-full px-3 py-2 bg-[#0A0A0A] border rounded-xl text-xs font-mono font-bold ${purchaseCalculations.balance > 0 ? 'text-rose-400 border-rose-500/30' : 'text-emerald-400 border-emerald-500/30'}`}>
                    ₹{purchaseCalculations.balance.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Invoice / Receipt Upload</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => handleReceiptUpload(e, 'purchase')}
                    className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#121A24] file:text-[#40E0D0] hover:file:bg-[#00ABAB]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Remarks &amp; Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional delivery comments, vehicle no, batch details..."
                  value={purchaseForm.notes}
                  onChange={e => setPurchaseForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#00ABAB] hover:bg-[#40E0D0] text-black font-black text-xs uppercase font-mono rounded-xl transition-all shadow-[0_0_20px_rgba(0,171,171,0.3)] cursor-pointer"
                >
                  Submit Purchase Record
                </button>
              </div>
            </form>
          </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 7: CATEGORY-WISE EXPENDITURE
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'category_expenses' && (
        <div className="space-y-6 animate-fade-in">
          {expenseSubmitSuccess && (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs rounded-2xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> {expenseSubmitSuccess}
            </div>
          )}

          <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" /> Category-Wise Expenditure Entry
              </h3>
              <p className="text-xs text-[#9CA3AF]">
                Record operating expenses, repairs, utility vouchers, track maintenance, and office expenditures.
              </p>
            </div>

            <form onSubmit={handleSaveExpenseEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Expense Voucher Ref *</label>
                  <input
                    type="text"
                    required
                    value={expenseForm.expenseRef}
                    onChange={e => setExpenseForm(prev => ({ ...prev, expenseRef: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expenseDate}
                    onChange={e => setExpenseForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Department / Activity *</label>
                  <select
                    value={expenseForm.department}
                    onChange={e => setExpenseForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                  >
                    {allActivityNames.map(act => (
                      <option key={act} value={act}>{act}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Expense Category *</label>
                  <select
                    value={expenseForm.expenseCategory}
                    onChange={e => setExpenseForm(prev => ({ ...prev, expenseCategory: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                  >
                    {allCategoryNames.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Expense Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electrician labour for track lighting, Diesel generator refueling"
                    value={expenseForm.description}
                    onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Payee / Vendor / Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="Recipient or contractor name"
                    value={expenseForm.payee}
                    onChange={e => setExpenseForm(prev => ({ ...prev, payee: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Amount Before Tax (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={expenseForm.amountBeforeTax}
                    onChange={e => setExpenseForm(prev => ({ ...prev, amountBeforeTax: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">GST Rate (%)</label>
                  <select
                    value={expenseForm.gstPercent}
                    onChange={e => setExpenseForm(prev => ({ ...prev, gstPercent: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none font-mono"
                  >
                    {[0, 5, 12, 18, 28].map(r => (
                      <option key={r} value={r}>{r}% GST</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-amber-400 mb-1 font-bold">Total Expense (₹)</label>
                  <div className="w-full px-3 py-2 bg-[#121A24] border border-amber-500/40 rounded-xl text-xs font-mono font-black text-amber-300">
                    ₹{expenseCalculations.total.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={expenseForm.amountPaid}
                    onChange={e => setExpenseForm(prev => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Payment Method</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={e => setExpenseForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                  >
                    {['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card', 'Credit'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Receipt Attachment</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => handleReceiptUpload(e, 'expense')}
                  className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#121A24] file:text-amber-300 hover:file:bg-amber-400/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Authorization remarks or allocation info..."
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2C2C2C] focus:border-amber-400 rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase font-mono rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
                >
                  Submit Expense Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 8: SALARY DATA ENTRY
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'salary_entry' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 bg-[#121A24] border border-[#00ABAB]/20 rounded-2xl flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#00ABAB]" /> Monthly Payroll &amp; Wage Submission
              </h3>
              <p className="text-[11px] text-[#9CA3AF]">
                Calculate pro-rata wages based on attendance and submit for Super Admin disbursement review.
              </p>
            </div>
          </div>
          <StaffManagementPanel isSuperAdmin={false} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 9: INVOICE AND RECEIPT UPLOADS
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'invoice_uploads' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-panel p-6 rounded-2xl border border-[#1C1C1C] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#00ABAB]" /> Invoices and Receipts Repository
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              All bills, cash vouchers, supplier tax invoices, and fuel receipts attached during data entry.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {submittedPurchases.filter(p => p.notes?.includes('[Receipt Attached]')).map(p => (
                <div key={p.id} className="p-4 bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-[#40E0D0] font-bold">{p.invoiceNumber || p.id}</span>
                    <span className="text-[#9CA3AF] text-[10px]">{p.date}</span>
                  </div>
                  <div className="text-xs font-bold text-white truncate">{p.itemName}</div>
                  <div className="text-[11px] text-[#9CA3AF]">{p.supplier} • {p.department}</div>
                  <div className="text-sm font-mono font-black text-white">₹{p.totalCost?.toFixed(2)}</div>
                  <div className="pt-2 border-t border-[#1C1C1C] flex justify-between items-center">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                      Receipt Verified
                    </span>
                  </div>
                </div>
              ))}
              {submittedPurchases.filter(p => p.notes?.includes('[Receipt Attached]')).length === 0 && (
                <div className="col-span-3 text-center py-12 text-[#9CA3AF] text-xs font-mono">
                  No invoices or receipts attached yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 10: SUBMITTED ENTRIES AND STATUS
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'submitted_status' && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00ABAB]" /> Submitted Entries &amp; Approval Status
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              Track the verification status of submissions across Activity Purchases and Day Expenses.
            </p>
          </div>

          <div className="glass-panel border border-[#1C1C1C] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1C1C1C] bg-[#0A0A0A]/50 font-bold text-xs text-white">
              Recent Activity Purchases Submitted ({submittedPurchases.length})
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#9CA3AF] font-mono font-bold">
                    <th className="p-3">Date</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Item / Description</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3 text-right">Total (₹)</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {submittedPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-[#9CA3AF]">{p.date}</td>
                      <td className="p-3 font-bold text-white">{p.department}</td>
                      <td className="p-3 text-slate-200">{p.itemName}</td>
                      <td className="p-3 text-[#9CA3AF]">{p.supplier}</td>
                      <td className="p-3 text-right font-mono font-bold text-white">₹{(p.totalCost || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121A24] text-[#40E0D0] border border-[#00ABAB]/30">
                          {p.workflowStatus || 'posted'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel border border-[#1C1C1C] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1C1C1C] bg-[#0A0A0A]/50 font-bold text-xs text-white">
              Recent Expense Vouchers Submitted ({dayExpenses.length})
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#9CA3AF] font-mono font-bold">
                    <th className="p-3">Ref</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Payee</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3">Review Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {dayExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-amber-300 font-bold">{e.expenseRef}</td>
                      <td className="p-3 font-mono text-[#9CA3AF]">{e.expenseDate}</td>
                      <td className="p-3 font-bold text-white">{e.department}</td>
                      <td className="p-3 text-slate-200">{e.payee}</td>
                      <td className="p-3 text-[#9CA3AF] truncate max-w-[180px]">{e.description}</td>
                      <td className="p-3 text-right font-mono font-bold text-white">₹{(e.totalAmount || 0).toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          e.workflowStatus === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          e.workflowStatus === 'rejected' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {e.workflowStatus.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dayExpenses.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[#9CA3AF] text-xs font-mono">
                        No category expense vouchers submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT SUPPLIER
      ══════════════════════════════════════════════════════════════════════════ */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl p-6 text-white space-y-4 shadow-[0_0_50px_rgba(0,171,171,0.25)]">
            <div className="flex justify-between items-center pb-2 border-b border-[#1C1C1C]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#00ABAB]" />
                {editingSupplier ? 'Edit Supplier Record' : 'Add New Supplier Record'}
              </h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-[#9CA3AF] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Supplier / Firm Name *</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.supplierName}
                    onChange={e => setSupplierForm(prev => ({ ...prev, supplierName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={e => setSupplierForm(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.phone}
                    onChange={e => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Supplier Type</label>
                  <select
                    value={supplierForm.supplierType}
                    onChange={e => setSupplierForm(prev => ({ ...prev, supplierType: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    {['Vendor', 'Contractor', 'Service Provider', 'Manufacturer', 'Wholesaler'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    placeholder="33AAAAA0000A1Z5"
                    value={supplierForm.gstin}
                    onChange={e => setSupplierForm(prev => ({ ...prev, gstin: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={e => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Address</label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={e => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1C1C1C]">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 bg-white/10 text-[#9CA3AF] hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00ABAB] hover:bg-[#40E0D0] text-black rounded-xl text-xs font-bold font-mono transition-colors"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT PURCHASE ITEM
      ══════════════════════════════════════════════════════════════════════════ */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-3xl p-6 text-white space-y-4 shadow-[0_0_50px_rgba(0,171,171,0.25)]">
            <div className="flex justify-between items-center pb-2 border-b border-[#1C1C1C]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#00ABAB]" />
                {editingItem ? 'Edit Purchase Item' : 'Add New Purchase Item'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-[#9CA3AF] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.itemCode}
                    onChange={e => setItemForm(prev => ({ ...prev, itemCode: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.itemName}
                    onChange={e => setItemForm(prev => ({ ...prev, itemName: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={e => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    {allCategoryNames.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Default Unit</label>
                  <select
                    value={itemForm.defaultUnit}
                    onChange={e => setItemForm(prev => ({ ...prev, defaultUnit: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                  >
                    {['piece', 'Kg', 'g', 'litre', 'ml', 'box', 'packet', 'bag', 'bottle'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Tax Classification</label>
                  <select
                    value={itemForm.defaultGstPercent}
                    onChange={e => {
                      const pct = parseFloat(e.target.value) || 0;
                      setItemForm(prev => ({
                        ...prev,
                        defaultGstPercent: pct,
                        taxClassification: pct === 0 ? 'Nil Rated 0%' : `Standard GST ${pct}%`
                      }));
                    }}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  >
                    {[0, 5, 12, 18, 28].map(r => (
                      <option key={r} value={r}>{r}% GST</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Default Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={itemForm.defaultRate}
                    onChange={e => setItemForm(prev => ({ ...prev, defaultRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#9CA3AF] mb-1">Default Supplier</label>
                <select
                  value={itemForm.defaultSupplierId}
                  onChange={e => setItemForm(prev => ({ ...prev, defaultSupplierId: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#121A24] border border-[#2C2C2C] focus:border-[#00ABAB] rounded-xl text-xs text-white outline-none"
                >
                  <option value="">-- No Default Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.supplierName}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1C1C1C]">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-white/10 text-[#9CA3AF] hover:text-white rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#00ABAB] hover:bg-[#40E0D0] text-black rounded-xl text-xs font-bold font-mono transition-colors"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
