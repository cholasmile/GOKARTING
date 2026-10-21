/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cafe Inventory & Financial Valuation Engine
 * Computes weighted-average purchase rates, inventory assets, COGS, 
 * gross margins, and historical date-wise stock balances.
 */

import { MenuItem, FoodOrder, FoodStreetPurchaseRecord, StockMovement } from '../types';

export interface CafeInventoryValuationItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  vendorId: string;
  vendorName: string;
  openingStock: number;
  openingStockValue: number;
  purchasedQty: number;
  purchaseRate: number; // Weighted average purchase cost per unit
  latestPurchaseRate: number;
  purchaseAmount: number;
  soldQty: number;
  sellingRate: number; // Current retail price per unit
  salesAmount: number; // Net sales generated
  cogs: number; // Cost of Goods Sold = soldQty * weightedAverageCost
  grossProfit: number; // salesAmount - cogs
  grossMarginPercent: number; // (grossProfit / salesAmount) * 100
  wastageQty: number;
  adjustmentQty: number;
  balanceQty: number;
  balanceStockAmount: number; // balanceQty * weightedAverageCost
  potentialRetailValue: number; // balanceQty * sellingRate
  lastUpdated: string;
  supplierName: string;
  lastPurchaseDate: string;
}

export interface CafeFinancialSummary {
  totalOpeningStockValue: number;
  totalPurchasedQty: number;
  totalPurchaseAmount: number;
  totalPaidPurchases: number;
  totalUnpaidPurchases: number;
  totalOutstandingPurchases: number;
  totalSoldQty: number;
  totalGrossSales: number;
  totalNetSales: number;
  totalTaxCollected: number;
  totalCogs: number;
  totalGrossProfit: number;
  overallGrossMarginPercent: number;
  totalWastageQty: number;
  totalWastageValue: number;
  totalClosingBalanceQty: number;
  totalClosingStockValue: number; // Closing inventory asset value
  totalPotentialRetailValue: number;
  itemsCount: number;
}

export type CafeDateFilterType = 'all' | 'today' | 'yesterday' | 'this_week' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'custom';

/**
 * Returns [startDateStr, endDateStr] in YYYY-MM-DD
 */
export function getCafeDateBounds(
  filterType: CafeDateFilterType,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = fmt(now);

  if (filterType === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }

  if (filterType === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yestStr = fmt(yest);
    return { startDate: yestStr, endDate: yestStr };
  }

  if (filterType === 'this_week') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // 0 is Sunday
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);
    return { startDate: fmt(startOfWeek), endDate: todayStr };
  }

  if (filterType === '7days') {
    const d7 = new Date(now);
    d7.setDate(d7.getDate() - 6);
    return { startDate: fmt(d7), endDate: todayStr };
  }

  if (filterType === '30days') {
    const d30 = new Date(now);
    d30.setDate(d30.getDate() - 29);
    return { startDate: fmt(d30), endDate: todayStr };
  }

  if (filterType === 'last_month') {
    const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLast = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: fmt(startLast), endDate: fmt(endLast) };
  }

  if (filterType === 'this_year') {
    return { startDate: `${now.getFullYear()}-01-01`, endDate: todayStr };
  }

  if (filterType === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: fmt(startOfMonth), endDate: todayStr };
  }

  if (filterType === 'custom') {
    return {
      startDate: customStart || '2020-01-01',
      endDate: customEnd || todayStr
    };
  }

  // 'all'
  return { startDate: '2020-01-01', endDate: todayStr };
}

/**
 * Checks if a date string falls within [startDate, endDate] (inclusive, YYYY-MM-DD comparison)
 */
export function isDateWithinBounds(dateStr?: string | null, bounds?: { startDate: string; endDate: string }): boolean {
  if (!dateStr || !bounds) return true;
  const d = dateStr.slice(0, 10);
  return d >= bounds.startDate && d <= bounds.endDate;
}

/**
 * Computes item-wise inventory valuation and consolidated summary.
 */
export function computeCafeInventoryValuation(params: {
  menuItems: MenuItem[];
  orders: FoodOrder[];
  foodStreetPurchases: FoodStreetPurchaseRecord[];
  stockMovements: StockMovement[];
  vendors: { id: string; name: string }[];
  dateFilterType?: CafeDateFilterType;
  customStartDate?: string;
  customEndDate?: string;
  categoryFilter?: string;
  itemSearch?: string;
}): {
  items: CafeInventoryValuationItem[];
  summary: CafeFinancialSummary;
  asOfDate: string;
} {
  const {
    menuItems,
    orders,
    foodStreetPurchases,
    stockMovements,
    vendors,
    dateFilterType = 'all',
    customStartDate,
    customEndDate,
    categoryFilter = 'all',
    itemSearch = ''
  } = params;

  const { startDate, endDate } = getCafeDateBounds(dateFilterType, customStartDate, customEndDate);
  const nowIso = new Date().toISOString();

  // Deduplicate orders by ID to prevent duplicate stock deductions
  const processedOrderIds = new Set<string>();
  const validPaidOrders = orders.filter(o => {
    if (processedOrderIds.has(o.id)) return false;
    processedOrderIds.add(o.id);
    const isPaid = o.paymentStatus === 'paid' || o.status === 'delivered';
    if (!isPaid) return false;

    const orderDate = o.createdAt ? o.createdAt.split('T')[0] : '';
    if (dateFilterType === 'all') return true;
    return orderDate >= startDate && orderDate <= endDate;
  });

  // Deduplicate purchases by ID
  const processedPurchaseIds = new Set<string>();
  const validPurchases = foodStreetPurchases.filter(p => {
    if (processedPurchaseIds.has(p.id)) return false;
    processedPurchaseIds.add(p.id);

    const isAccepted = p.status === 'accepted_into_stock' || p.quantityAccepted > 0;
    if (!isAccepted) return false;

    const pDate = p.purchaseDate || (p.createdAt ? p.createdAt.split('T')[0] : '');
    if (dateFilterType === 'all') return true;
    return pDate >= startDate && pDate <= endDate;
  });

  // Deduplicate stock movements
  const processedMovementIds = new Set<string>();
  const validMovements = stockMovements.filter(sm => {
    if (processedMovementIds.has(sm.id)) return false;
    processedMovementIds.add(sm.id);

    const smDate = sm.timestamp ? sm.timestamp.split('T')[0] : '';
    if (dateFilterType === 'all') return true;
    return smDate >= startDate && smDate <= endDate;
  });

  // Calculate item-wise valuation
  const valuationItems: CafeInventoryValuationItem[] = menuItems
    .filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (itemSearch.trim()) {
        const q = itemSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      }
      return true;
    })
    .map(item => {
      const vendor = vendors.find(v => v.id === item.vendorId);
      const vendorName = vendor?.name || 'Cafe & Food Street';
      const unit = item.unit || 'pcs';

      // 1. Opening Stock
      const openingStock = item.openingStock ?? 0;
      const basePurchaseRate = item.purchasePrice && item.purchasePrice > 0 ? item.purchasePrice : Math.round(item.price * 0.6);
      const openingStockValue = openingStock * basePurchaseRate;

      // 2. Purchases for this item in selected window
      const itemPurchases = validPurchases.filter(p => 
        (p.itemId && p.itemId === item.id) || 
        p.itemName.trim().toLowerCase() === item.name.trim().toLowerCase()
      );

      const purchasedQtyFromRecords = itemPurchases.reduce((s, p) => s + (p.quantityAccepted || p.quantityPurchased || 0), 0);
      const purchaseAmountFromRecords = itemPurchases.reduce((s, p) => s + (p.totalPurchaseValue || ((p.quantityAccepted || 0) * (p.ratePerUnit || basePurchaseRate))), 0);

      // Fallback if no individual purchase records exist yet
      const totalPurchasedQty = purchasedQtyFromRecords > 0 
        ? purchasedQtyFromRecords 
        : (item.purchaseQuantity && item.purchaseQuantity > 0 ? item.purchaseQuantity : 0);

      const totalPurchaseAmount = purchasedQtyFromRecords > 0 
        ? purchaseAmountFromRecords 
        : totalPurchasedQty * basePurchaseRate;

      // Latest purchase rate
      const latestPurchase = itemPurchases[0];
      const latestPurchaseRate = latestPurchase?.ratePerUnit ?? basePurchaseRate;
      const supplierName = latestPurchase?.supplierName || item.supplierName || 'Primary Food Distributor';
      const lastPurchaseDate = latestPurchase?.purchaseDate || item.purchaseDate || startDate;

      // 3. Weighted-Average Purchase Rate
      // (Opening Value + Purchases Value) / (Opening Qty + Purchases Qty)
      const totalUnitsAvailable = openingStock + totalPurchasedQty;
      const totalValueAvailable = openingStockValue + totalPurchaseAmount;
      const weightedAvgPurchaseRate = totalUnitsAvailable > 0
        ? Math.round((totalValueAvailable / totalUnitsAvailable) * 100) / 100
        : basePurchaseRate;

      // 4. Sales for this item in selected window
      let soldQty = 0;
      let salesAmount = 0;

      validPaidOrders.forEach(order => {
        order.items.forEach(orderItem => {
          if (orderItem.menuItemId === item.id || orderItem.name.trim().toLowerCase() === item.name.trim().toLowerCase()) {
            soldQty += orderItem.quantity;
            salesAmount += (orderItem.price * orderItem.quantity);
          }
        });
      });

      // 5. Cost of Goods Sold (COGS)
      const cogs = Math.round(soldQty * weightedAvgPurchaseRate * 100) / 100;
      const grossProfit = Math.round((salesAmount - cogs) * 100) / 100;
      const grossMarginPercent = salesAmount > 0 
        ? Math.round(((grossProfit / salesAmount) * 100) * 10) / 10 
        : 0;

      // 6. Wastage & Adjustments
      const itemMovements = validMovements.filter(sm => 
        sm.itemId === item.id || sm.itemName.trim().toLowerCase() === item.name.trim().toLowerCase()
      );

      const wastageQty = itemMovements
        .filter(sm => sm.type === 'wastage' || sm.type === 'damaged')
        .reduce((s, sm) => s + sm.quantity, 0) + (item.wastageQuantity || 0);

      const adjustmentQty = itemMovements
        .filter(sm => sm.type === 'adjustment_add')
        .reduce((s, sm) => s + sm.quantity, 0) -
        itemMovements
        .filter(sm => sm.type === 'adjustment_sub')
        .reduce((s, sm) => s + sm.quantity, 0) + (item.stockAdjustment || 0);

      // 7. Balance Stock Quantity & Amount
      // If live item.stockQuantity is set, use it; otherwise compute from ledger
      const computedBalance = openingStock + totalPurchasedQty - soldQty - wastageQty + adjustmentQty;
      const balanceQty = item.stockQuantity !== undefined 
        ? item.stockQuantity 
        : Math.max(0, computedBalance);

      const balanceStockAmount = Math.round(balanceQty * weightedAvgPurchaseRate * 100) / 100;
      const potentialRetailValue = Math.round(balanceQty * item.price * 100) / 100;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit,
        vendorId: item.vendorId,
        vendorName,
        openingStock,
        openingStockValue,
        purchasedQty: totalPurchasedQty,
        purchaseRate: weightedAvgPurchaseRate,
        latestPurchaseRate,
        purchaseAmount: totalPurchaseAmount,
        soldQty,
        sellingRate: item.price,
        salesAmount: Math.round(salesAmount * 100) / 100,
        cogs,
        grossProfit,
        grossMarginPercent,
        wastageQty,
        adjustmentQty,
        balanceQty,
        balanceStockAmount,
        potentialRetailValue,
        lastUpdated: item.updatedAt || nowIso,
        supplierName,
        lastPurchaseDate
      };
    });

  // Calculate Consolidated Summary
  const summary: CafeFinancialSummary = {
    totalOpeningStockValue: Math.round(valuationItems.reduce((s, i) => s + i.openingStockValue, 0) * 100) / 100,
    totalPurchasedQty: valuationItems.reduce((s, i) => s + i.purchasedQty, 0),
    totalPurchaseAmount: Math.round(valuationItems.reduce((s, i) => s + i.purchaseAmount, 0) * 100) / 100,
    totalPaidPurchases: Math.round(validPurchases.filter(p => p.paymentStatus === 'Paid').reduce((s, p) => s + (p.amountPaid || 0), 0) * 100) / 100,
    totalUnpaidPurchases: Math.round(validPurchases.filter(p => p.paymentStatus === 'Unpaid').reduce((s, p) => s + (p.totalPurchaseValue || 0), 0) * 100) / 100,
    totalOutstandingPurchases: Math.round(validPurchases.reduce((s, p) => s + (p.outstandingBalance || 0), 0) * 100) / 100,
    totalSoldQty: valuationItems.reduce((s, i) => s + i.soldQty, 0),
    totalGrossSales: Math.round(validPaidOrders.reduce((s, o) => s + (o.totalAmount || 0), 0) * 100) / 100,
    totalNetSales: Math.round(validPaidOrders.reduce((s, o) => s + (o.subtotal || (o.totalAmount / 1.05)), 0) * 100) / 100,
    totalTaxCollected: Math.round(validPaidOrders.reduce((s, o) => s + (o.taxAmount || (o.totalAmount - (o.totalAmount / 1.05))), 0) * 100) / 100,
    totalCogs: Math.round(valuationItems.reduce((s, i) => s + i.cogs, 0) * 100) / 100,
    totalGrossProfit: Math.round(valuationItems.reduce((s, i) => s + i.grossProfit, 0) * 100) / 100,
    overallGrossMarginPercent: 0,
    totalWastageQty: valuationItems.reduce((s, i) => s + i.wastageQty, 0),
    totalWastageValue: Math.round(valuationItems.reduce((s, i) => s + (i.wastageQty * i.purchaseRate), 0) * 100) / 100,
    totalClosingBalanceQty: valuationItems.reduce((s, i) => s + i.balanceQty, 0),
    totalClosingStockValue: Math.round(valuationItems.reduce((s, i) => s + i.balanceStockAmount, 0) * 100) / 100,
    totalPotentialRetailValue: Math.round(valuationItems.reduce((s, i) => s + i.potentialRetailValue, 0) * 100) / 100,
    itemsCount: valuationItems.length
  };

  summary.overallGrossMarginPercent = summary.totalNetSales > 0 
    ? Math.round(((summary.totalGrossProfit / summary.totalNetSales) * 100) * 10) / 10 
    : 0;

  return {
    items: valuationItems,
    summary,
    asOfDate: endDate
  };
}
