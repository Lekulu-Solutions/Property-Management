import XLSX from 'xlsx-js-style';
import {
  DEFAULT_WATER_RATE,
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  getGroceriesForMonth,
  getWaterForMonth,
  GroceryItem,
  INITIAL_WORKBOOK_STATE,
  LedgerEntry,
  PropertyExpenseRow,
  SplitType,
  TenantRentalRow,
  WaterRecordItem,
  WorkbookState,
} from '../data/initialLedgerData';

export type ReportTemplateScope =
  | 'FULL_EXECUTIVE'
  | 'RENTAL_ONLY'
  | 'MESFIN_STATEMENT'
  | 'ZEWDNESH_STATEMENT'
  | 'GROCERIES_AUDIT'
  | 'WATER_AUDIT';

export interface StandardReportExportOptions {
  scope?: ReportTemplateScope;
  includeSignatures?: boolean;
  bilingual?: boolean;
}

export interface StandardReportMetadata {
  reportRefCode: string;
  generatedDate: string;
  periodLabelAm: string;
  periodLabelEn: string;
  systemBannerTitle: string;
  systemSubtitle: string;
  auditStatusAm: string;
  auditStatusEn: string;
}

export function buildStandardReportMetadata(
  state: WorkbookState,
  selectedMonth: EthiopianMonth | 'ANNUAL' = 'ጥቅምት'
): StandardReportMetadata {
  const periodLabelAm =
    selectedMonth === 'ANNUAL'
      ? `ዓመታዊ ድምር (${state.yearEC})`
      : `ወርሃዊ — ${selectedMonth} (${state.yearEC})`;
  const periodLabelEn =
    selectedMonth === 'ANNUAL'
      ? `Annual Consolidated (${state.yearEC})`
      : `Monthly — ${
          ETHIOPIAN_MONTHS.find((m) => m.id === selectedMonth)?.labelEn || selectedMonth
        } (${state.yearEC})`;

  const reportRefCode = `MZ-${state.yearEC.replace(/\s+/g, '')}-${
    selectedMonth === 'ANNUAL' ? 'ANN' : 'MTH'
  }`;
  const generatedDate = new Date().toLocaleDateString('en-CA');

  return {
    reportRefCode,
    generatedDate,
    periodLabelAm,
    periodLabelEn,
    systemBannerTitle:
      'መስፍን እና ዘውድነሽ — የሂሳብ እና የንብረት ሪፖርት | MESFIN & ZEWDNESH OFFICIAL FINANCIAL LEDGER',
    systemSubtitle:
      'ADDIS ABABA PROPERTY & PARTNER LEDGER · STANDARD EXECUTIVE TEMPLATE (PDF & EXCEL)',
    auditStatusAm: '✓ የተረጋገጠ (Reconciled)',
    auditStatusEn: 'Verified & Reconciled',
  };
}

export interface RentalCalculationResult {
  month: EthiopianMonth | 'ANNUAL';
  tenantRows: {
    row: TenantRentalRow;
    gross: number;
    mesfinShare: number;
    zewdneshShare: number;
    annualGross: number;
    annualMesfin: number;
    annualZewdnesh: number;
  }[];
  expenseRows: {
    row: PropertyExpenseRow;
    totalExpense: number; // positive magnitude for calculations, displayed with minus sign
    mesfinExpense: number;
    zewdneshExpense: number;
    annualExpense: number;
    annualMesfinExpense: number;
    annualZewdneshExpense: number;
  }[];
  totalGrossIncome: number;
  mesfinGrossIncome: number;
  zewdneshGrossIncome: number;
  totalExpenses: number;
  mesfinExpenses: number;
  zewdneshExpenses: number;
  netIncome: number;
  mesfinNetShare: number;
  zewdneshNetShare: number;
  reconciliationSum: number;
  annualGrossIncome: number;
  annualTotalExpenses: number;
  annualNetIncome: number;
  annualMesfinNet: number;
  annualZewdneshNet: number;
  isReconciled: boolean;
  mesfinNetPercent: number;
  zewdneshNetPercent: number;
  monthlySeries: {
    month: EthiopianMonth;
    gross: number;
    expense: number;
    net: number;
    mesfinNet: number;
    zewdneshNet: number;
  }[];
}

export function calculateRentalSummary(
  state: WorkbookState,
  selectedMonth: EthiopianMonth | 'ANNUAL' = 'ጥቅምት'
): RentalCalculationResult {
  const tenantRows = state.tenants.map((row) => {
    const annualGross = ETHIOPIAN_MONTHS.reduce(
      (sum, m) => sum + (Number(row.monthlyAmounts[m.id]) || 0),
      0
    );
    const annualMesfin = Math.round(annualGross * row.mesfinRatio * 100) / 100;
    const annualZewdnesh = Math.round(annualGross * row.zewdneshRatio * 100) / 100;

    const gross =
      selectedMonth === 'ANNUAL'
        ? annualGross
        : Number(row.monthlyAmounts[selectedMonth]) || 0;
    const mesfinShare = Math.round(gross * row.mesfinRatio * 100) / 100;
    const zewdneshShare = Math.round(gross * row.zewdneshRatio * 100) / 100;

    return {
      row,
      gross,
      mesfinShare,
      zewdneshShare,
      annualGross,
      annualMesfin,
      annualZewdnesh,
    };
  });

  const expenseRows = state.propertyExpenses.map((row) => {
    const annualExpense = ETHIOPIAN_MONTHS.reduce(
      (sum, m) => sum + Math.abs(Number(row.monthlyAmounts[m.id]) || 0),
      0
    );
    const annualMesfinExpense = Math.round(annualExpense * row.mesfinRatio * 100) / 100;
    const annualZewdneshExpense = Math.round(annualExpense * row.zewdneshRatio * 100) / 100;

    const totalExpense =
      selectedMonth === 'ANNUAL'
        ? annualExpense
        : Math.abs(Number(row.monthlyAmounts[selectedMonth]) || 0);
    const mesfinExpense = Math.round(totalExpense * row.mesfinRatio * 100) / 100;
    const zewdneshExpense = Math.round(totalExpense * row.zewdneshRatio * 100) / 100;

    return {
      row,
      totalExpense,
      mesfinExpense,
      zewdneshExpense,
      annualExpense,
      annualMesfinExpense,
      annualZewdneshExpense,
    };
  });

  const totalGrossIncome = tenantRows.reduce((s, r) => s + r.gross, 0);
  const mesfinGrossIncome = tenantRows.reduce((s, r) => s + r.mesfinShare, 0);
  const zewdneshGrossIncome = tenantRows.reduce((s, r) => s + r.zewdneshShare, 0);

  const totalExpenses = expenseRows.reduce((s, r) => s + r.totalExpense, 0);
  const mesfinExpenses = expenseRows.reduce((s, r) => s + r.mesfinExpense, 0);
  const zewdneshExpenses = expenseRows.reduce((s, r) => s + r.zewdneshExpense, 0);

  const netIncome = totalGrossIncome - totalExpenses;
  const mesfinNetShare = mesfinGrossIncome - mesfinExpenses;
  const zewdneshNetShare = zewdneshGrossIncome - zewdneshExpenses;
  const reconciliationSum = mesfinNetShare + zewdneshNetShare;

  const annualGrossIncome = tenantRows.reduce((s, r) => s + r.annualGross, 0);
  const annualTotalExpenses = expenseRows.reduce((s, r) => s + r.annualExpense, 0);
  const annualNetIncome = annualGrossIncome - annualTotalExpenses;
  const annualMesfinNet =
    tenantRows.reduce((s, r) => s + r.annualMesfin, 0) -
    expenseRows.reduce((s, r) => s + r.annualMesfinExpense, 0);
  const annualZewdneshNet =
    tenantRows.reduce((s, r) => s + r.annualZewdnesh, 0) -
    expenseRows.reduce((s, r) => s + r.annualZewdneshExpense, 0);

  const isReconciled = Math.abs(netIncome - reconciliationSum) < 0.01;

  const mesfinNetPercent = netIncome > 0 ? (mesfinNetShare / netIncome) * 100 : 0;
  const zewdneshNetPercent = netIncome > 0 ? (zewdneshNetShare / netIncome) * 100 : 0;

  const monthlySeries = ETHIOPIAN_MONTHS.map((m) => {
    const gross = state.tenants.reduce(
      (s, t) => s + (Number(t.monthlyAmounts[m.id]) || 0),
      0
    );
    const mesfinG = state.tenants.reduce(
      (s, t) => s + (Number(t.monthlyAmounts[m.id]) || 0) * t.mesfinRatio,
      0
    );
    const zewdneshG = state.tenants.reduce(
      (s, t) => s + (Number(t.monthlyAmounts[m.id]) || 0) * t.zewdneshRatio,
      0
    );

    const expense = state.propertyExpenses.reduce(
      (s, e) => s + Math.abs(Number(e.monthlyAmounts[m.id]) || 0),
      0
    );
    const mesfinE = state.propertyExpenses.reduce(
      (s, e) => s + Math.abs(Number(e.monthlyAmounts[m.id]) || 0) * e.mesfinRatio,
      0
    );
    const zewdneshE = state.propertyExpenses.reduce(
      (s, e) => s + Math.abs(Number(e.monthlyAmounts[m.id]) || 0) * e.zewdneshRatio,
      0
    );

    return {
      month: m.id,
      gross,
      expense,
      net: gross - expense,
      mesfinNet: mesfinG - mesfinE,
      zewdneshNet: zewdneshG - zewdneshE,
    };
  });

  return {
    month: selectedMonth,
    tenantRows,
    expenseRows,
    totalGrossIncome,
    mesfinGrossIncome,
    zewdneshGrossIncome,
    totalExpenses,
    mesfinExpenses,
    zewdneshExpenses,
    netIncome,
    mesfinNetShare,
    zewdneshNetShare,
    reconciliationSum,
    annualGrossIncome,
    annualTotalExpenses,
    annualNetIncome,
    annualMesfinNet,
    annualZewdneshNet,
    isReconciled,
    mesfinNetPercent,
    zewdneshNetPercent,
    monthlySeries,
  };
}

export function calculateMesfinSummary(state: WorkbookState) {
  const activeIncomes = state.mesfinIncome.filter((i) => i.amount > 0);
  const activeExpenses = state.mesfinExpenses.filter((e) => e.amount > 0);

  const totalIncome = state.mesfinIncome.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalExpense = state.mesfinExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netBalance = totalIncome - totalExpense;
  const retentionRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;

  return {
    activeIncomes,
    activeExpenses,
    totalIncome,
    totalExpense,
    netBalance,
    retentionRate,
  };
}

export function calculateZewdneshSummary(state: WorkbookState) {
  const totalDeposit = state.zewdneshDeposits.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalExpense = state.zewdneshExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const netBalance = totalDeposit - totalExpense;
  const utilizationRate = totalDeposit > 0 ? (totalExpense / totalDeposit) * 100 : 0;

  const groupedByPayee: Record<string, { label: string; amount: number; count: number }> = {};
  state.zewdneshExpenses.forEach((exp) => {
    if (!exp.amount || exp.amount <= 0) return;
    const key = exp.description.trim();
    if (!groupedByPayee[key]) {
      groupedByPayee[key] = { label: key, amount: 0, count: 0 };
    }
    groupedByPayee[key].amount += exp.amount;
    groupedByPayee[key].count += 1;
  });

  const payeeBreakdown = Object.values(groupedByPayee).sort((a, b) => b.amount - a.amount);

  return {
    totalDeposit,
    totalExpense,
    netBalance,
    utilizationRate,
    payeeBreakdown,
  };
}

export interface AnnualGroceryItemRow {
  id: string;
  index: number;
  name: string;
  nameEn: string;
  category: string;
  unit: string;
  monthlyPrices: Record<EthiopianMonth, number>;
  monthlyPurchased: Record<EthiopianMonth, boolean>;
  annualSpent: number;
  purchasedMonthsCount: number;
}

export function calculateGroceriesSummary(
  state: WorkbookState,
  selectedMonth: EthiopianMonth | 'ANNUAL' = 'ጥቅምት'
) {
  const monthlySeries = ETHIOPIAN_MONTHS.map((m) => {
    const items = getGroceriesForMonth(state, m.id);
    const totalItems = items.length;
    const purchasedItems = items.filter((g) => g.purchased);
    const unpurchasedItems = items.filter((g) => !g.purchased);
    const totalSpent = items.reduce(
      (s, g) => s + (g.purchased ? Number(g.price) || 0 : 0),
      0
    );
    return {
      month: m.id,
      labelAm: m.labelAm,
      labelEn: m.labelEn,
      totalItems,
      purchasedCount: purchasedItems.length,
      unpurchasedCount: unpurchasedItems.length,
      totalSpent,
      completionPercent: totalItems > 0 ? (purchasedItems.length / totalItems) * 100 : 0,
      items,
    };
  });

  // Build consolidated 12-month item matrix across all months
  const itemRowMap = new Map<string, AnnualGroceryItemRow>();
  ETHIOPIAN_MONTHS.forEach((m) => {
    const mItems = getGroceriesForMonth(state, m.id);
    mItems.forEach((g, idx) => {
      const key = g.id || g.name.trim();
      let existing = itemRowMap.get(key);
      if (!existing) {
        const blankPrices = {} as Record<EthiopianMonth, number>;
        const blankPurchased = {} as Record<EthiopianMonth, boolean>;
        ETHIOPIAN_MONTHS.forEach((em) => {
          blankPrices[em.id] = 0;
          blankPurchased[em.id] = false;
        });
        existing = {
          id: g.id,
          index: g.index || idx + 1,
          name: g.name,
          nameEn: g.nameEn || g.name,
          category: g.category,
          unit: g.unit,
          monthlyPrices: blankPrices,
          monthlyPurchased: blankPurchased,
          annualSpent: 0,
          purchasedMonthsCount: 0,
        };
        itemRowMap.set(key, existing);
      }
      const effectivePrice = g.purchased ? Number(g.price) || 0 : 0;
      existing.monthlyPrices[m.id] = Number(g.price) || 0;
      existing.monthlyPurchased[m.id] = Boolean(g.purchased);
      existing.annualSpent += effectivePrice;
      if (g.purchased) {
        existing.purchasedMonthsCount += 1;
      }
    });
  });

  const annualItemRows = Array.from(itemRowMap.values()).sort((a, b) => a.index - b.index);
  const annualTotalSpent = monthlySeries.reduce((s, m) => s + m.totalSpent, 0);
  const annualPurchasedCount = monthlySeries.reduce((s, m) => s + m.purchasedCount, 0);
  const annualTotalItems = monthlySeries.reduce((s, m) => s + m.totalItems, 0);
  const activeMonthsCount = monthlySeries.filter((m) => m.totalSpent > 0 || m.purchasedCount > 0).length;

  const activeItems: GroceryItem[] =
    selectedMonth === 'ANNUAL'
      ? annualItemRows.map((row, idx) => ({
          id: row.id,
          index: idx + 1,
          name: row.name,
          nameEn: row.nameEn,
          category: row.category,
          unit: row.unit,
          price: row.annualSpent,
          purchased: row.purchasedMonthsCount > 0,
        }))
      : getGroceriesForMonth(state, selectedMonth);

  const totalItems = activeItems.length;
  const purchasedItems = activeItems.filter((g) => g.purchased);
  const unpurchasedItems = activeItems.filter((g) => !g.purchased);
  const totalSpent =
    selectedMonth === 'ANNUAL'
      ? annualTotalSpent
      : activeItems.reduce((s, g) => s + (g.purchased ? Number(g.price) || 0 : 0), 0);

  const byCategory: Record<
    string,
    { category: string; totalItems: number; purchasedCount: number; spent: number }
  > = {};

  activeItems.forEach((g) => {
    if (!byCategory[g.category]) {
      byCategory[g.category] = {
        category: g.category,
        totalItems: 0,
        purchasedCount: 0,
        spent: 0,
      };
    }
    byCategory[g.category].totalItems += 1;
    if (g.purchased) {
      byCategory[g.category].purchasedCount += 1;
      byCategory[g.category].spent += Number(g.price) || 0;
    }
  });

  return {
    month: selectedMonth,
    items: activeItems,
    totalItems,
    purchasedCount: purchasedItems.length,
    unpurchasedCount: unpurchasedItems.length,
    totalSpent,
    completionPercent: totalItems > 0 ? (purchasedItems.length / totalItems) * 100 : 0,
    categoryBreakdown: Object.values(byCategory).sort(
      (a, b) => b.spent - a.spent || b.totalItems - a.totalItems
    ),
    annualTotalSpent,
    annualPurchasedCount,
    annualTotalItems,
    activeMonthsCount,
    monthlySeries,
    annualItemRows,
  };
}

export interface ComputedWaterRow {
  id: string;
  index: number;
  name: string;
  nameEn: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  totalUsage: number;
  totalPaymentDue: number;
  installmentDeposit: number;
  carriedOverDeposit: number;
  hasCustomDeposit: boolean;
  amountPaid: number;
  nextMonthBalance: number;
}

export interface AnnualWaterMemberRow {
  id: string;
  index: number;
  name: string;
  nameEn: string;
  monthlyUsage: Record<EthiopianMonth, number>;
  monthlyDue: Record<EthiopianMonth, number>;
  monthlyPaid: Record<EthiopianMonth, number>;
  monthlyDeposit: Record<EthiopianMonth, number>;
  monthlyBalance: Record<EthiopianMonth, number>;
  annualWeek1: number;
  annualWeek2: number;
  annualWeek3: number;
  annualWeek4: number;
  annualTotalUsage: number;
  annualTotalPaymentDue: number;
  initialInstallmentDeposit: number;
  annualTotalAmountPaid: number;
  yearEndBalance: number;
  activeMonthsCount: number;
}

export function calculateWaterSummary(
  state: WorkbookState,
  selectedMonth: EthiopianMonth | 'ANNUAL' = 'ጥቅምት'
) {
  const ratePerUnit =
    Number(state.waterRatePerUnit) > 0 ? Number(state.waterRatePerUnit) : DEFAULT_WATER_RATE;

  const prevMonthBalances: Record<string, number> = {};
  const memberRowMap = new Map<string, AnnualWaterMemberRow>();

  const monthlySeries = ETHIOPIAN_MONTHS.map((m, mIdx) => {
    const rawItems: WaterRecordItem[] = getWaterForMonth(state, m.id);
    const computedRows: ComputedWaterRow[] = rawItems.map((item, idx) => {
      const key = item.id || item.name.trim() || `w-${idx + 1}`;
      const carriedOverDeposit = mIdx === 0 ? 0 : prevMonthBalances[key] ?? 0;
      const hasCustomDeposit =
        item.depositOverride !== undefined &&
        item.depositOverride !== null &&
        !(mIdx === 0 && Number(item.depositOverride) === 0);
      const installmentDeposit =
        item.depositOverride !== undefined && item.depositOverride !== null
          ? Number(item.depositOverride) || 0
          : carriedOverDeposit;

      const week1 = Math.max(0, Number(item.week1) || 0);
      const week2 = Math.max(0, Number(item.week2) || 0);
      const week3 = Math.max(0, Number(item.week3) || 0);
      const week4 = Math.max(0, Number(item.week4) || 0);
      const totalUsage = Math.round((week1 + week2 + week3 + week4) * 100) / 100;
      const totalPaymentDue = Math.round(totalUsage * ratePerUnit * 100) / 100;
      const amountPaid = Math.max(0, Number(item.amountPaid) || 0);
      const nextMonthBalance =
        Math.round((installmentDeposit + amountPaid - totalPaymentDue) * 100) / 100;

      prevMonthBalances[key] = nextMonthBalance;

      let annualMember = memberRowMap.get(key);
      if (!annualMember) {
        const blankMap = () => {
          const rec = {} as Record<EthiopianMonth, number>;
          ETHIOPIAN_MONTHS.forEach((em) => {
            rec[em.id] = 0;
          });
          return rec;
        };
        annualMember = {
          id: item.id || key,
          index: item.index || idx + 1,
          name: item.name,
          nameEn: item.nameEn || item.name,
          monthlyUsage: blankMap(),
          monthlyDue: blankMap(),
          monthlyPaid: blankMap(),
          monthlyDeposit: blankMap(),
          monthlyBalance: blankMap(),
          annualWeek1: 0,
          annualWeek2: 0,
          annualWeek3: 0,
          annualWeek4: 0,
          annualTotalUsage: 0,
          annualTotalPaymentDue: 0,
          initialInstallmentDeposit: mIdx === 0 ? installmentDeposit : 0,
          annualTotalAmountPaid: 0,
          yearEndBalance: 0,
          activeMonthsCount: 0,
        };
        memberRowMap.set(key, annualMember);
      }

      annualMember.monthlyUsage[m.id] = totalUsage;
      annualMember.monthlyDue[m.id] = totalPaymentDue;
      annualMember.monthlyPaid[m.id] = amountPaid;
      annualMember.monthlyDeposit[m.id] = installmentDeposit;
      annualMember.monthlyBalance[m.id] = nextMonthBalance;
      annualMember.annualWeek1 += week1;
      annualMember.annualWeek2 += week2;
      annualMember.annualWeek3 += week3;
      annualMember.annualWeek4 += week4;
      annualMember.annualTotalUsage += totalUsage;
      annualMember.annualTotalPaymentDue += totalPaymentDue;
      annualMember.annualTotalAmountPaid += amountPaid;
      annualMember.yearEndBalance = nextMonthBalance;
      if (totalUsage > 0 || amountPaid > 0) {
        annualMember.activeMonthsCount += 1;
      }

      return {
        id: item.id || key,
        index: item.index || idx + 1,
        name: item.name,
        nameEn: item.nameEn || item.name,
        week1,
        week2,
        week3,
        week4,
        totalUsage,
        totalPaymentDue,
        installmentDeposit,
        carriedOverDeposit,
        hasCustomDeposit,
        amountPaid,
        nextMonthBalance,
      };
    });

    const totalWeek1 = computedRows.reduce((s, r) => s + r.week1, 0);
    const totalWeek2 = computedRows.reduce((s, r) => s + r.week2, 0);
    const totalWeek3 = computedRows.reduce((s, r) => s + r.week3, 0);
    const totalWeek4 = computedRows.reduce((s, r) => s + r.week4, 0);
    const totalUsage = computedRows.reduce((s, r) => s + r.totalUsage, 0);
    const totalPaymentDue = computedRows.reduce((s, r) => s + r.totalPaymentDue, 0);
    const totalInstallmentDeposit = computedRows.reduce((s, r) => s + r.installmentDeposit, 0);
    const totalAmountPaid = computedRows.reduce((s, r) => s + r.amountPaid, 0);
    const totalNextMonthBalance = computedRows.reduce((s, r) => s + r.nextMonthBalance, 0);
    const hasActivity = totalUsage > 0 || totalAmountPaid > 0;

    return {
      month: m.id,
      monthNumber: mIdx + 1,
      labelAm: m.labelAm,
      labelEn: m.labelEn,
      rows: computedRows,
      totalMembers: computedRows.length,
      totalWeek1,
      totalWeek2,
      totalWeek3,
      totalWeek4,
      totalUsage,
      totalPaymentDue,
      totalInstallmentDeposit,
      totalAmountPaid,
      totalNextMonthBalance,
      hasActivity,
    };
  });

  const annualMemberRows = Array.from(memberRowMap.values()).sort((a, b) => a.index - b.index);
  const annualTotalWeek1 = monthlySeries.reduce((s, m) => s + m.totalWeek1, 0);
  const annualTotalWeek2 = monthlySeries.reduce((s, m) => s + m.totalWeek2, 0);
  const annualTotalWeek3 = monthlySeries.reduce((s, m) => s + m.totalWeek3, 0);
  const annualTotalWeek4 = monthlySeries.reduce((s, m) => s + m.totalWeek4, 0);
  const annualTotalUsage = monthlySeries.reduce((s, m) => s + m.totalUsage, 0);
  const annualTotalPaymentDue = monthlySeries.reduce((s, m) => s + m.totalPaymentDue, 0);
  const annualInitialDeposit = monthlySeries[0]?.totalInstallmentDeposit || 0;
  const annualTotalAmountPaid = monthlySeries.reduce((s, m) => s + m.totalAmountPaid, 0);
  const annualYearEndBalance =
    monthlySeries[monthlySeries.length - 1]?.totalNextMonthBalance ??
    annualInitialDeposit + annualTotalAmountPaid - annualTotalPaymentDue;
  const activeMonthsCount = monthlySeries.filter((m) => m.hasActivity).length;

  const selectedMonthSeries =
    selectedMonth === 'ANNUAL'
      ? null
      : monthlySeries.find((m) => m.month === selectedMonth) || monthlySeries[0];

  const activeRows: ComputedWaterRow[] =
    selectedMonth === 'ANNUAL'
      ? annualMemberRows.map((r, idx) => ({
          id: r.id,
          index: idx + 1,
          name: r.name,
          nameEn: r.nameEn,
          week1: r.annualWeek1,
          week2: r.annualWeek2,
          week3: r.annualWeek3,
          week4: r.annualWeek4,
          totalUsage: r.annualTotalUsage,
          totalPaymentDue: r.annualTotalPaymentDue,
          installmentDeposit: r.initialInstallmentDeposit,
          carriedOverDeposit: r.initialInstallmentDeposit,
          hasCustomDeposit: false,
          amountPaid: r.annualTotalAmountPaid,
          nextMonthBalance: r.yearEndBalance,
        }))
      : selectedMonthSeries!.rows;

  const totalWeek1 = selectedMonth === 'ANNUAL' ? annualTotalWeek1 : selectedMonthSeries!.totalWeek1;
  const totalWeek2 = selectedMonth === 'ANNUAL' ? annualTotalWeek2 : selectedMonthSeries!.totalWeek2;
  const totalWeek3 = selectedMonth === 'ANNUAL' ? annualTotalWeek3 : selectedMonthSeries!.totalWeek3;
  const totalWeek4 = selectedMonth === 'ANNUAL' ? annualTotalWeek4 : selectedMonthSeries!.totalWeek4;
  const totalUsage = selectedMonth === 'ANNUAL' ? annualTotalUsage : selectedMonthSeries!.totalUsage;
  const totalPaymentDue =
    selectedMonth === 'ANNUAL' ? annualTotalPaymentDue : selectedMonthSeries!.totalPaymentDue;
  const totalInstallmentDeposit =
    selectedMonth === 'ANNUAL'
      ? annualInitialDeposit
      : selectedMonthSeries!.totalInstallmentDeposit;
  const totalAmountPaid =
    selectedMonth === 'ANNUAL' ? annualTotalAmountPaid : selectedMonthSeries!.totalAmountPaid;
  const totalNextMonthBalance =
    selectedMonth === 'ANNUAL' ? annualYearEndBalance : selectedMonthSeries!.totalNextMonthBalance;

  return {
    month: selectedMonth,
    ratePerUnit,
    rows: activeRows,
    totalMembers: activeRows.length,
    totalWeek1,
    totalWeek2,
    totalWeek3,
    totalWeek4,
    totalUsage,
    totalPaymentDue,
    totalInstallmentDeposit,
    totalAmountPaid,
    totalNextMonthBalance,
    annualTotalWeek1,
    annualTotalWeek2,
    annualTotalWeek3,
    annualTotalWeek4,
    annualTotalUsage,
    annualTotalPaymentDue,
    annualInitialDeposit,
    annualTotalAmountPaid,
    annualYearEndBalance,
    activeMonthsCount,
    monthlySeries,
    annualMemberRows,
  };
}

export function formatETB(amount: number, showSign = false): string {
  const rounded = Math.round(amount * 100) / 100;
  const formatted = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  if (rounded < 0) return `-${formatted}`;
  if (showSign && rounded > 0) return `+${formatted}`;
  return formatted;
}

export interface TemplateSheetDefinition {
  sheetName: string;
  titleAm: string;
  themeKey: 'RENTAL_EMERALD' | 'MESFIN_BLUE' | 'ZEWDNESH_PURPLE' | 'GROCERIES_TEAL';
  rows: (string | number)[][];
  colWidths: number[];
}

/**
 * Builds the 5 sheets matching the exact schema, rows, partner sub-rows, reconciliation rows,
 * and placeholder rows of the original source Excel template (`Rental_Property_Expense_683e5269`),
 * enhanced with the standardized Executive Letterhead Metadata & Partner Approval Footer matching the PDF.
 */
export function buildExactTemplateSheets(
  state: WorkbookState,
  activeMonth: EthiopianMonth | 'ANNUAL' = 'ጥቅምት',
  options?: StandardReportExportOptions
): TemplateSheetDefinition[] {
  const scope = options?.scope || 'FULL_EXECUTIVE';
  const includeSignatures = options?.includeSignatures !== false;
  const meta = buildStandardReportMetadata(state, activeMonth);

  const rentalCalc = calculateRentalSummary(state, activeMonth);
  const mesfinCalc = calculateMesfinSummary(state);
  const zewdneshCalc = calculateZewdneshSummary(state);
  const groceryCalc = calculateGroceriesSummary(state, activeMonth);
  const waterCalc = calculateWaterSummary(state, activeMonth);

  const monthTag = activeMonth === 'ANNUAL' ? 'ዓመታዊ' : activeMonth;
  const annualMesfinGross = rentalCalc.tenantRows.reduce((s, r) => s + r.annualMesfin, 0);
  const annualZewdneshGross = rentalCalc.tenantRows.reduce((s, r) => s + r.annualZewdnesh, 0);
  const annualMesfinExp = rentalCalc.expenseRows.reduce((s, r) => s + r.annualMesfinExpense, 0);
  const annualZewdneshExp = rentalCalc.expenseRows.reduce((s, r) => s + r.annualZewdneshExpense, 0);
  const statusLabel = rentalCalc.isReconciled ? '✓ ትክክል (Reconciled)' : 'ልዩነት አለው';

  const annualMesfinPct =
    rentalCalc.annualNetIncome > 0
      ? (rentalCalc.annualMesfinNet / rentalCalc.annualNetIncome) * 100
      : rentalCalc.mesfinNetPercent;
  const annualZewdneshPct =
    rentalCalc.annualNetIncome > 0
      ? (rentalCalc.annualZewdneshNet / rentalCalc.annualNetIncome) * 100
      : rentalCalc.zewdneshNetPercent;

  const metaStripText = `የሰነድ ቁጥር (Ref): ${meta.reportRefCode}   |   የሪፖርት ጊዜ (Period): ${meta.periodLabelAm}   |   ቀን (Date): ${meta.generatedDate}   |   የኦዲት ሁኔታ: ${meta.auditStatusAm}`;
  const legendStripText =
    '■ መስፍን (Mesfin · Blue)   |   ■ ዘውድነሽ (Zewdnesh · Purple)   |   ■ +ገቢ / የተጣራ (Positive · Emerald)   |   ■ -ወጪ / ተቀናሽ (Expense · Red)';

  const buildSignatureRows = (colsCount: number): (string | number)[][] => {
    if (!includeSignatures) return [];
    const pad = (arr: (string | number)[]) => {
      const copy = [...arr];
      while (copy.length < colsCount) copy.push('');
      return copy.slice(0, colsCount);
    };
    return [
      [],
      pad(['የአጋሮች ማረጋገጫ እና የፊርማ ክፍል (Official Partner Verification & Approval Signatures)']),
      pad([
        '1. አቶ መስፍን (Mesfin Approval)',
        `የተጣራ ድርሻ: ${formatETB(rentalCalc.mesfinNetShare)} ብር`,
        'ፊርማ (Signature): ______________________   ቀን (Date): ____/____/______',
      ]),
      pad([
        '2. ወ/ሮ ዘውድነሽ (Zewdnesh Approval)',
        `የተጣራ ድርሻ: ${formatETB(rentalCalc.zewdneshNetShare)} ብር`,
        'ፊርማ (Signature): ______________________   ቀን (Date): ____/____/______',
      ]),
      pad([
        `መስፍን እና ዘውድነሽ የሂሳብ መዝገብ ሥርዓት · Standard PDF & Excel Template (${meta.reportRefCode}) · Generated: ${meta.generatedDate}`,
      ]),
    ];
  };

  // Sheet 1: መስፍን እና ዘውድነሽ - የኪራይ ንብረት እና ወጪ
  const sheet1Rows: (string | number)[][] = [
    [meta.systemBannerTitle],
    [`መስፍን እና ዘውድነሽ - የኪራይ ንብረት እና ወጪ (${state.yearEC} · ${meta.periodLabelAm})`],
    [metaStripText],
    [legendStripText],
    [],
    ['01. አጠቃላይ የሂሳብ ማጠቃለያ (Executive Financial Summary)'],
    ['ጠቅላላ ገቢ', 'ጠቅላላ ወጪ', 'የመስፍን ድርሻ', 'የዘውድነሽ ድርሻ', 'የተጣራ ዓመታዊ', 'ሁኔታ'],
    [
      rentalCalc.totalGrossIncome,
      rentalCalc.totalExpenses > 0 ? -rentalCalc.totalExpenses : 0,
      rentalCalc.mesfinNetShare,
      rentalCalc.zewdneshNetShare,
      rentalCalc.annualNetIncome,
      statusLabel,
    ],
    [],
    ['02. ወርሃዊ የቤት ኪራይ ገቢ እና የአጋሮች ድርሻ ክፍፍል (Tenant Rental Income Schedule — አዲስ አበባ)'],
    [
      activeMonth === 'ANNUAL'
        ? `በዚህ ሉህ ውስጥ የ${state.yearEC} ዓመታዊ ድምር እና የአጋሮች ድርሻ ክፍፍል ተካቷል።`
        : `በዚህ ሉህ ውስጥ መረጃ ያለው የ${activeMonth} (${state.yearEC}) ወር እና ዓመታዊ ድምር ነው።`,
    ],
    [
      'ተከራይ',
      'ዝርዝር',
      'የክፍፍል ድርሻ',
      `${monthTag} ጠቅላላ`,
      `${monthTag} መስፍን`,
      `${monthTag} ዘውድነሽ`,
      'ዓመታዊ ድምር',
      'መስፍን ዓመታዊ',
      'ዘውድነሽ ዓመታዊ',
    ],
    ...rentalCalc.tenantRows.map((tr) => [
      tr.row.tenantName,
      tr.row.description,
      tr.row.splitLabel,
      tr.gross,
      tr.mesfinShare,
      tr.zewdneshShare,
      tr.annualGross,
      tr.annualMesfin,
      tr.annualZewdnesh,
    ]),
    [
      'ጠቅላላ ድምር',
      '',
      '100% ጠቅላላ ድምር',
      rentalCalc.totalGrossIncome,
      rentalCalc.mesfinGrossIncome,
      rentalCalc.zewdneshGrossIncome,
      rentalCalc.annualGrossIncome,
      annualMesfinGross,
      annualZewdneshGross,
    ],
    [
      'መስፍን',
      'የመስፍን ጠቅላላ ገቢ (Blue)',
      'የአጋር ድርሻ',
      rentalCalc.mesfinGrossIncome,
      rentalCalc.mesfinGrossIncome,
      0,
      annualMesfinGross,
      annualMesfinGross,
      0,
    ],
    [
      'ዘውድነሽ',
      'የዘውድነሽ ጠቅላላ ገቢ (Purple)',
      'የአጋር ድርሻ',
      rentalCalc.zewdneshGrossIncome,
      0,
      rentalCalc.zewdneshGrossIncome,
      annualZewdneshGross,
      0,
      annualZewdneshGross,
    ],
    [],
    ['03. የንብረት ወጪዎች (Property Expenses Allocation)'],
    [
      'የወጪ አይነት',
      'ዝርዝር',
      'የክፍፍል ድርሻ',
      `${monthTag} ጠቅላላ`,
      `${monthTag} መስፍን`,
      `${monthTag} ዘውድነሽ`,
      'ዓመታዊ ድምር',
      'መስፍን ዓመታዊ',
      'ዘውድነሽ ዓመታዊ',
    ],
    ...rentalCalc.expenseRows.map((er) => [
      er.row.expenseType,
      er.row.description,
      er.row.splitLabel,
      er.totalExpense > 0 ? -er.totalExpense : 0,
      er.totalExpense > 0 ? (er.mesfinExpense > 0 ? -er.mesfinExpense : 0) : 0,
      er.totalExpense > 0 ? (er.zewdneshExpense > 0 ? -er.zewdneshExpense : 0) : 0,
      er.annualExpense > 0 ? -er.annualExpense : 0,
      er.annualMesfinExpense > 0 ? -er.annualMesfinExpense : 0,
      er.annualZewdneshExpense > 0 ? -er.annualZewdneshExpense : 0,
    ]),
    [
      'ጠቅላላ ወርሃዊ ወጪ',
      '',
      'ጠቅላላ ወጪ',
      rentalCalc.totalExpenses > 0 ? -rentalCalc.totalExpenses : 0,
      rentalCalc.mesfinExpenses > 0 ? -rentalCalc.mesfinExpenses : 0,
      rentalCalc.zewdneshExpenses > 0 ? -rentalCalc.zewdneshExpenses : 0,
      rentalCalc.annualTotalExpenses > 0 ? -rentalCalc.annualTotalExpenses : 0,
      annualMesfinExp > 0 ? -annualMesfinExp : 0,
      annualZewdneshExp > 0 ? -annualZewdneshExp : 0,
    ],
    [],
    ['04. የተጣራ ገቢ ማረጋገጫ (Net Income & Partner Reconciliation)'],
    [
      'ርዕስ',
      'ዝርዝር',
      'ድርሻ',
      `${monthTag} ጠቅላላ`,
      `${monthTag} መስፍን`,
      `${monthTag} ዘውድነሽ`,
      'ዓመታዊ ድምር',
      'መስፍን ዓመታዊ',
      'ዘውድነሽ ዓመታዊ',
    ],
    [
      'የተጣራ ወርሃዊ ገቢ',
      'የተጣራ የገንዘብ ፍሰት',
      'ጠቅላላ የተጣራ',
      rentalCalc.netIncome,
      rentalCalc.mesfinNetShare,
      rentalCalc.zewdneshNetShare,
      rentalCalc.annualNetIncome,
      rentalCalc.annualMesfinNet,
      rentalCalc.annualZewdneshNet,
    ],
    [
      'መስፍን',
      'የመስፍን የተጣራ ፍሰት (Blue)',
      'የተጣራ ድርሻ',
      rentalCalc.mesfinNetShare,
      rentalCalc.mesfinNetShare,
      0,
      rentalCalc.annualMesfinNet,
      rentalCalc.annualMesfinNet,
      0,
    ],
    [
      'ዘውድነሽ',
      'የዘውድነሽ የተጣራ ፍሰት (Purple)',
      'የተጣራ ድርሻ',
      rentalCalc.zewdneshNetShare,
      0,
      rentalCalc.zewdneshNetShare,
      rentalCalc.annualZewdneshNet,
      0,
      rentalCalc.annualZewdneshNet,
    ],
    [
      'ማረጋገጫ',
      'የክፍፍል ማረጋገጫ',
      'የተጣራ = መስፍን + ዘውድነሽ',
      statusLabel,
      statusLabel,
      statusLabel,
      statusLabel,
      statusLabel,
      statusLabel,
    ],
    [
      'ምጣኔ',
      'የባለቤቶች የተጣራ መቶኛ ክፍፍል',
      'የመስፍን % / የዘውድነሽ %',
      `${rentalCalc.mesfinNetPercent.toFixed(1)}% / ${rentalCalc.zewdneshNetPercent.toFixed(1)}%`,
      `${rentalCalc.mesfinNetPercent.toFixed(1)}%`,
      `${rentalCalc.zewdneshNetPercent.toFixed(1)}%`,
      `${annualMesfinPct.toFixed(1)}% / ${annualZewdneshPct.toFixed(1)}%`,
      `${annualMesfinPct.toFixed(1)}%`,
      `${annualZewdneshPct.toFixed(1)}%`,
    ],
    ...buildSignatureRows(9),
  ];

  // Sheet 2: የመስፍን ገቢ እና ወጪ መዝገብ (Blue Theme)
  const mesfinExpPlaceholders: (string | number)[][] = Array.from({ length: 6 }, () => [
    'ወደፊት የሚሞላ',
    'ወደፊት የሚሞላ',
    '-',
  ]);
  const sheet2Rows: (string | number)[][] = [
    [meta.systemBannerTitle],
    [`ሉህ 2 · የመስፍን ገቢ እና ወጪ መዝገብ — Mesfin Personal Ledger (${state.yearEC} · Blue Theme)`],
    [metaStripText],
    [legendStripText],
    [],
    ['01. የመስፍን የግል ሂሳብ ማጠቃለያ (Mesfin Personal Summary)'],
    ['ጠቅላላ ገቢ', 'ጠቅላላ ወጪ', 'የተጣራ ቀሪ ሂሳብ'],
    [mesfinCalc.totalIncome, -mesfinCalc.totalExpense, mesfinCalc.netBalance],
    [],
    ['02. የገቢ መዝገብ (የኪራይ እና ተጨማሪ ገቢዎች · Income Entries)'],
    ['ቀን / ወር', 'የገቢ አይነት / ዝርዝር', 'መጠን (ብር)'],
    ...state.mesfinIncome.map((i) => [
      i.dateOrMonth,
      i.description,
      i.amount > 0 ? i.amount : 0,
    ]),
    ['ድምር (ጠቅላላ ገቢ)', '', mesfinCalc.totalIncome],
    [],
    ['03. የወጪ መዝገብ (የግል ወጪዎች፣ ጥገና፣ ግብር እና ማውጣት · Expense Entries)'],
    ['ቀን / ወር', 'የወጪ አይነት / ዝርዝር', 'መጠን (ብር)'],
    ...state.mesfinExpenses.map((e) => [
      e.dateOrMonth,
      e.description,
      e.amount > 0 ? -e.amount : '-',
    ]),
    ...mesfinExpPlaceholders,
    ['ድምር (ጠቅላላ ወጪ)', '', -mesfinCalc.totalExpense],
    ['የተጣራ ቀሪ ሂሳብ (Net Balance)', '', mesfinCalc.netBalance],
    ...buildSignatureRows(3),
  ];

  // Sheet 3: የዘውድነሽ ተቀማጭ እና ወጪ መዝገብ (Purple Theme)
  const zewdDepPlaceholders: (string | number)[][] = Array.from({ length: 3 }, () => [
    'ወደፊት የሚሞላ',
    'ወደፊት የሚሞላ',
    '-',
  ]);
  const zewdExpPlaceholders: (string | number)[][] = Array.from({ length: 3 }, () => [
    'ወደፊት የሚሞላ',
    'ወደፊት የሚሞላ',
    '-',
  ]);
  const sheet3Rows: (string | number)[][] = [
    [meta.systemBannerTitle],
    [`ሉህ 3 · የዘውድነሽ ተቀማጭ እና ወጪ መዝገብ — Zewdnesh Personal Ledger (${state.yearEC} · Purple Theme)`],
    [metaStripText],
    [legendStripText],
    [],
    ['01. የዘውድነሽ የግል ሂሳብ ማጠቃለያ (Zewdnesh Personal Summary)'],
    ['ጠቅላላ ተቀማጭ', 'ጠቅላላ ወጪ', 'የተጣራ ቀሪ ሂሳብ'],
    [zewdneshCalc.totalDeposit, -zewdneshCalc.totalExpense, zewdneshCalc.netBalance],
    [],
    ['02. የተቀማጭ መዝገብ (የመጀመሪያ ተቀማጭ እና ተጨማሪ ገቢዎች · Deposit Entries)'],
    ['ቀን / ወር', 'የተቀማጭ አይነት / ዝርዝር', 'መጠን (ብር)'],
    ...state.zewdneshDeposits.map((d) => [
      d.dateOrMonth,
      d.description,
      d.amount > 0 ? d.amount : '-',
    ]),
    ...zewdDepPlaceholders,
    ['ድምር (ጠቅላላ ተቀማጭ)', '', zewdneshCalc.totalDeposit],
    [],
    ['03. የወጪ መዝገብ (የግል ወጪዎች፣ ጥገና፣ ግብር እና ማውጣት · Expense Entries)'],
    ['ቀን / ወር', 'የወጪ አይነት / ዝርዝር', 'መጠን (ብር)'],
    ...state.zewdneshExpenses.map((e) => [
      e.dateOrMonth,
      e.description,
      e.amount > 0 ? -e.amount : '-',
    ]),
    ...zewdExpPlaceholders,
    ['ድምር (ጠቅላላ ወጪ)', '', -zewdneshCalc.totalExpense],
    ['የተጣራ ቀሪ ሂሳብ (Net Balance)', '', zewdneshCalc.netBalance],
    ...buildSignatureRows(3),
  ];

  // Sheet 4: የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ
  const sheet4Rows: (string | number)[][] = [
    [meta.systemBannerTitle],
    [
      `ሉህ 4 · የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ — Groceries & Consumables Audit (${state.yearEC} · ${meta.periodLabelAm})`,
    ],
    [metaStripText],
    [legendStripText],
    [],
    ['01. የአስቤዛ እና የፍጆታ ማጠቃለያ (Groceries Summary)'],
    ['ጠቅላላ የወጣ ወጪ', 'ጠቅላላ የዕቃዎች ብዛት', 'የተገዙ ዕቃዎች', 'ያልተገዙ / ቀሪ ዕቃዎች', 'የግዢ አፈጻጸም %', 'ዓመታዊ ድምር'],
    [
      -groceryCalc.totalSpent,
      groceryCalc.totalItems,
      groceryCalc.purchasedCount,
      groceryCalc.unpurchasedCount,
      `${groceryCalc.completionPercent.toFixed(1)}%`,
      -groceryCalc.annualTotalSpent,
    ],
    [],
    [
      `02. ${
        activeMonth === 'ANNUAL' ? 'ዓመታዊ' : `የ${activeMonth}`
      } የአስቤዛ ፍላጎት፣ ምድብ እና የወጪ ቁጥጥር ሰንጠረዥ (Itemized Groceries Audit)`,
    ],
    ['ተ.ቁ', 'የዕቃው ዝርዝር', 'ምድብ', 'መለኪያ', `${monthTag} ዋጋ (ብር)`, 'የግዢ ሁኔታ'],
    ...groceryCalc.items.map((g, idx) => [
      idx + 1,
      g.name,
      g.category,
      g.unit,
      g.price > 0 ? g.price : '',
      g.purchased ? 'ተገዝቷል' : 'አልተገዛም',
    ]),
    ['ጠቅላላ ድምር', '', '', '', groceryCalc.totalSpent, `${groceryCalc.purchasedCount}/${groceryCalc.totalItems} ተገዝቷል`],
    [],
    ['03. ወርሃዊ የአስቤዛ ወጪ ማጠቃለያ (12-Month Groceries Expenditure Schedule)'],
    ['ተ.ቁ', 'ወር (Month)', 'የዕቃዎች ብዛት', 'የተገዙ (Purchased)', 'የወሩ ወጪ (ETB)', 'ሁኔታ (Status)'],
    ...groceryCalc.monthlySeries.map((ms, idx) => [
      idx + 1,
      ms.labelAm,
      ms.totalItems,
      ms.purchasedCount,
      ms.totalSpent,
      ms.purchasedCount > 0 ? `${ms.purchasedCount}/${ms.totalItems} ተገዝቷል` : 'አልተገዛም',
    ]),
    ['ዓመታዊ ድምር', '', groceryCalc.annualTotalItems, groceryCalc.annualPurchasedCount, groceryCalc.annualTotalSpent, `${groceryCalc.activeMonthsCount}/12 ወራት`],
    ...buildSignatureRows(6),
  ];

  // Sheet 5: የውሃ ፍጆታ እና ክፍያ መከታተያ (Monthly Water Recording & Payment Tracking)
  const sheet5Rows: (string | number)[][] = [
    [meta.systemBannerTitle],
    [
      `ሉህ 5 · የውሃ ፍጆታ እና ክፍያ መከታተያ — Monthly Water Recording & Payment Tracking (${state.yearEC} · ${meta.periodLabelAm} · ታሪፍ: ${waterCalc.ratePerUnit} ብር/ዙር)`,
    ],
    [metaStripText],
    [legendStripText],
    [],
    ['01. የውሃ ፍጆታ እና ክፍያ ማጠቃለያ (Water Usage & Payment Summary)'],
    [
      'መደበኛ ታሪፍ (Rate)',
      'ጠቅላላ ዙር (Total Usage)',
      `ጠቅላላ ክፍያ (ዙር × ${waterCalc.ratePerUnit} ብር)`,
      'የተቀመጠ ክፍያ (Installment Deposit)',
      'የተከፈለው ገንዘብ (Amount Paid)',
      'ለሚቀጥለው ወር የሚሸጋገር ቀሪ (Next Month Balance)',
    ],
    [
      `${waterCalc.ratePerUnit} ብር`,
      waterCalc.totalUsage,
      waterCalc.totalPaymentDue,
      waterCalc.totalInstallmentDeposit,
      waterCalc.totalAmountPaid,
      waterCalc.totalNextMonthBalance,
    ],
    [],
    [
      `02. ${
        activeMonth === 'ANNUAL' ? 'ዓመታዊ' : `የ${activeMonth}`
      } የውሃ ፍጆታ እና ክፍያ ሰንጠረዥ (Water Usage & Installment Carry-Over Table)`,
    ],
    [
      '#',
      'ስም (Name)',
      'ሳምንት 1 (Week 1)',
      'ሳምንት 2 (Week 2)',
      'ሳምንት 3 (Week 3)',
      'ሳምንት 4 (Week 4)',
      'ጠቅላላ ዙር (Total Usage)',
      `ጠቅላላ ክፍያ (ዙር × ${waterCalc.ratePerUnit} ብር)`,
      'የተቀመጠ ክፍያ (Installment Deposit)',
      'የተከፈለው ገንዘብ (Amount Paid)',
      'ለሚቀጥለው ወር የሚሸጋገር ቀሪ (Next Month Balance)',
    ],
    ...waterCalc.rows.map((r, idx) => [
      idx + 1,
      r.name,
      r.week1,
      r.week2,
      r.week3,
      r.week4,
      r.totalUsage,
      r.totalPaymentDue,
      r.installmentDeposit,
      r.amountPaid,
      r.nextMonthBalance,
    ]),
    [
      'Total / ጠቅላላ',
      '',
      waterCalc.totalWeek1,
      waterCalc.totalWeek2,
      waterCalc.totalWeek3,
      waterCalc.totalWeek4,
      waterCalc.totalUsage,
      waterCalc.totalPaymentDue,
      waterCalc.totalInstallmentDeposit,
      waterCalc.totalAmountPaid,
      waterCalc.totalNextMonthBalance,
    ],
    [],
    ['03. ወርሃዊ የውሃ ፍጆታ እና ክፍያ ማጠቃለያ — 12 ወራት (12-Month Water Schedule)'],
    [
      '#',
      'ወር (Month)',
      'ሳምንት 1',
      'ሳምንት 2',
      'ሳምንት 3',
      'ሳምንት 4',
      'ጠቅላላ ዙር',
      'ጠቅላላ ክፍያ (ብር)',
      'የተቀመጠ ክፍያ',
      'የተከፈለው ገንዘብ',
      'ለሚቀጥለው ወር ቀሪ',
    ],
    ...waterCalc.monthlySeries.map((ms, idx) => [
      idx + 1,
      ms.labelAm,
      ms.totalWeek1,
      ms.totalWeek2,
      ms.totalWeek3,
      ms.totalWeek4,
      ms.totalUsage,
      ms.totalPaymentDue,
      ms.totalInstallmentDeposit,
      ms.totalAmountPaid,
      ms.totalNextMonthBalance,
    ]),
    [
      'ዓመታዊ ድምር',
      '',
      waterCalc.annualTotalWeek1,
      waterCalc.annualTotalWeek2,
      waterCalc.annualTotalWeek3,
      waterCalc.annualTotalWeek4,
      waterCalc.annualTotalUsage,
      waterCalc.annualTotalPaymentDue,
      waterCalc.annualInitialDeposit,
      waterCalc.annualTotalAmountPaid,
      waterCalc.annualYearEndBalance,
    ],
    ...buildSignatureRows(11),
  ];

  const allSheets: TemplateSheetDefinition[] = [
    {
      sheetName: 'የኪራይ_እና_ወጪ',
      titleAm: 'መስፍን እና ዘውድነሽ - የኪራይ ንብረት እና ወጪ',
      themeKey: 'RENTAL_EMERALD',
      rows: sheet1Rows,
      colWidths: [22, 32, 28, 18, 18, 18, 18, 18, 18],
    },
    {
      sheetName: 'የመስፍን_መዝገብ',
      titleAm: 'የመስፍን ገቢ እና ወጪ መዝገብ',
      themeKey: 'MESFIN_BLUE',
      rows: sheet2Rows,
      colWidths: [26, 44, 24],
    },
    {
      sheetName: 'የዘውድነሽ_መዝገብ',
      titleAm: 'የዘውድነሽ ተቀማጭ እና ወጪ መዝገብ',
      themeKey: 'ZEWDNESH_PURPLE',
      rows: sheet3Rows,
      colWidths: [26, 44, 24],
    },
    {
      sheetName: 'የአስቤዛ_መከታተያ',
      titleAm: 'የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ መከታተያ',
      themeKey: 'GROCERIES_TEAL',
      rows: sheet4Rows,
      colWidths: [10, 28, 22, 16, 20, 18],
    },
    {
      sheetName: 'የውሃ_ክፍያ',
      titleAm: 'የውሃ ፍጆታ እና ክፍያ መከታተያ (Monthly Water Tracking)',
      themeKey: 'GROCERIES_TEAL',
      rows: sheet5Rows,
      colWidths: [8, 22, 14, 14, 14, 14, 18, 22, 22, 20, 26],
    },
  ];

  if (scope === 'RENTAL_ONLY') return [allSheets[0]];
  if (scope === 'MESFIN_STATEMENT') return [allSheets[1]];
  if (scope === 'ZEWDNESH_STATEMENT') return [allSheets[2]];
  if (scope === 'GROCERIES_AUDIT') return [allSheets[3]];
  if (scope === 'WATER_AUDIT') return [allSheets[4]];
  return allSheets;
}

const THIN_BORDER = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const TOTAL_BORDER = {
  top: { style: 'medium', color: { rgb: '0F172A' } },
  bottom: { style: 'double', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: '94A3B8' } },
  right: { style: 'thin', color: { rgb: '94A3B8' } },
};

const HEADER_BORDER = {
  top: { style: 'medium', color: { rgb: '0F172A' } },
  bottom: { style: 'medium', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: '334155' } },
  right: { style: 'thin', color: { rgb: '334155' } },
};

/**
 * Applies the unified MZ Executive System Design Template styling (matching the PDF report)
 * to a worksheet using `xlsx-js-style`.
 */
function applyExecutiveTemplateStylesToWorksheet(
  ws: XLSX.WorkSheet,
  s: TemplateSheetDefinition
) {
  const maxCols = s.colWidths.length;
  ws['!cols'] = s.colWidths.map((wch) => ({ wch }));

  const themeBannerRgb =
    s.themeKey === 'MESFIN_BLUE'
      ? '1D4ED8'
      : s.themeKey === 'ZEWDNESH_PURPLE'
      ? '6D28D9'
      : s.themeKey === 'GROCERIES_TEAL'
      ? '047857'
      : '064E3B';

  const tableHeaderRgb =
    s.themeKey === 'MESFIN_BLUE'
      ? '1E3A8A'
      : s.themeKey === 'ZEWDNESH_PURPLE'
      ? '4C1D95'
      : s.themeKey === 'GROCERIES_TEAL'
      ? '065F46'
      : '0F172A';

  const merges: XLSX.Range[] = [];
  const rowHeights: { hpt: number }[] = [];

  // Ensure every cell in the grid exists so merged banners and borders render cleanly
  const totalRows = s.rows.length;
  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(0, totalRows - 1), c: Math.max(0, maxCols - 1) },
  });

  let isInsideKpiValues = false;
  let currentTableSection: 'NONE' | 'TENANTS' | 'EXPENSES' | 'NET' | 'PERSONAL_INC' | 'PERSONAL_EXP' | 'GROCERIES' = 'NONE';
  let dataRowCounter = 0;

  for (let R = 0; R < totalRows; ++R) {
    const rowArr = s.rows[R] || [];
    const c0 = String(rowArr[0] ?? '').trim();
    const c1 = String(rowArr[1] ?? '').trim();

    // Default row height
    let hpt = 21;
    if (R === 0) hpt = 32;
    else if (R === 1) hpt = 26;
    else if (R === 2 || R === 3) hpt = 20;
    else if (rowArr.length === 0 || (c0 === '' && c1 === '')) hpt = 12;
    else if (
      c0.startsWith('01.') ||
      c0.startsWith('02.') ||
      c0.startsWith('03.') ||
      c0.startsWith('04.') ||
      c0.startsWith('የአጋሮች ማረጋገጫ')
    ) {
      hpt = 25;
    } else if (
      c0 === 'ተከራይ' ||
      c0 === 'የወጪ አይነት' ||
      c0 === 'ርዕስ' ||
      c0 === 'ቀን / ወር' ||
      c0 === 'ተ.ቁ' ||
      c0 === 'ጠቅላላ ገቢ' ||
      c0 === 'ጠቅላላ ተቀማጭ' ||
      c0 === 'ጠቅላላ የወጣ ወጪ'
    ) {
      hpt = 25;
    } else if (
      c0.startsWith('ጠቅላላ') ||
      c0.startsWith('ድምር') ||
      c0.startsWith('የተጣራ') ||
      c0.startsWith('1. አቶ መስፍን') ||
      c0.startsWith('2. ወ/ሮ ዘውድነሽ')
    ) {
      hpt = 24;
    }
    rowHeights[R] = { hpt };

    // Determine merges for full-width banner / section title rows
    const nonEmptyCount = rowArr.filter((v) => v !== '' && v !== undefined && v !== null).length;
    if (
      R <= 3 ||
      (nonEmptyCount === 1 &&
        (c0.startsWith('01.') ||
          c0.startsWith('02.') ||
          c0.startsWith('03.') ||
          c0.startsWith('04.') ||
          c0.startsWith('በዚህ ሉህ') ||
          c0.startsWith('የአጋሮች ማረጋገጫ') ||
          c0.startsWith('መስፍን እና ዘውድነሽ የሂሳብ መዝገብ ሥርዓት')))
    ) {
      if (maxCols > 1) {
        merges.push({ s: { r: R, c: 0 }, e: { r: R, c: maxCols - 1 } });
      }
    } else if (
      (c0.startsWith('1. አቶ መስፍን') || c0.startsWith('2. ወ/ሮ ዘውድነሽ')) &&
      maxCols > 3
    ) {
      merges.push({ s: { r: R, c: 2 }, e: { r: R, c: maxCols - 1 } });
    }

    // Track section state
    const isKpiHeaderRow =
      c0 === 'ጠቅላላ ገቢ' || c0 === 'ጠቅላላ ተቀማጭ' || c0 === 'ጠቅላላ የወጣ ወጪ';
    const isCurrentRowKpiValues = isInsideKpiValues;
    isInsideKpiValues = isKpiHeaderRow;

    if (c0 === 'ተከራይ') {
      currentTableSection = 'TENANTS';
      dataRowCounter = 0;
    } else if (c0 === 'የወጪ አይነት') {
      currentTableSection = 'EXPENSES';
      dataRowCounter = 0;
    } else if (c0 === 'ርዕስ') {
      currentTableSection = 'NET';
      dataRowCounter = 0;
    } else if (c0 === 'ቀን / ወር') {
      currentTableSection = c1.includes('የወጪ') ? 'PERSONAL_EXP' : 'PERSONAL_INC';
      dataRowCounter = 0;
    } else if (c0 === 'ተ.ቁ') {
      currentTableSection = 'GROCERIES';
      dataRowCounter = 0;
    } else if (c0 === '' && c1 === '') {
      currentTableSection = 'NONE';
    }

    const isTableHeader =
      c0 === 'ተከራይ' ||
      c0 === 'የወጪ አይነት' ||
      c0 === 'ርዕስ' ||
      c0 === 'ቀን / ወር' ||
      c0 === 'ተ.ቁ';

    const isTotalRow =
      c0 === 'ጠቅላላ ድምር' ||
      c0 === 'ጠቅላላ ወርሃዊ ወጪ' ||
      c0 === 'የተጣራ ወርሃዊ ገቢ' ||
      c0.startsWith('ድምር (') ||
      c0.startsWith('የተጣራ ቀሪ ሂሳብ');

    const isMesfinPartnerRow =
      c0 === 'መስፍን' || c0.startsWith('1. አቶ መስፍን');
    const isZewdneshPartnerRow =
      c0 === 'ዘውድነሽ' || c0.startsWith('2. ወ/ሮ ዘውድነሽ');
    const isReconcileRow = c0 === 'ማረጋገጫ' || c0 === 'ምጣኔ';
    const isPlaceholderRow = c0 === 'ወደፊት የሚሞላ';

    if (!isTableHeader && !isTotalRow && currentTableSection !== 'NONE') {
      dataRowCounter += 1;
    }

    const activeColsForRow =
      isKpiHeaderRow || isCurrentRowKpiValues
        ? Math.min(maxCols, s.themeKey === 'RENTAL_EMERALD' || s.themeKey === 'GROCERIES_TEAL' ? 6 : 3)
        : maxCols;

    for (let C = 0; C < maxCols; ++C) {
      const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
      let cell = ws[cellAddr];
      if (!cell) {
        if (R <= 3 || C < activeColsForRow) {
          cell = { t: 's', v: '' };
          ws[cellAddr] = cell;
        } else {
          continue;
        }
      }

      const isNumeric = cell.t === 'n';
      if (isNumeric) {
        if (s.sheetName === 'የአስቤዛ_መከታተያ' && (C === 0 || (isCurrentRowKpiValues && C >= 1 && C <= 3))) {
          cell.z = '0';
        } else {
          cell.z = '#,##0';
        }
      }

      // Base style
      let style: any = {
        font: { name: 'Segoe UI', sz: 10, color: { rgb: '0F172A' } },
        alignment: {
          vertical: 'center',
          horizontal: isNumeric ? 'right' : 'left',
          wrapText: true,
        },
      };

      // 1. Row 0: System Master Letterhead Banner
      if (R === 0) {
        style = {
          fill: { fgColor: { rgb: '0F172A' } },
          font: { name: 'Segoe UI', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: HEADER_BORDER,
        };
      }
      // 2. Row 1: Sheet Theme Sub-Banner
      else if (R === 1) {
        style = {
          fill: { fgColor: { rgb: themeBannerRgb } },
          font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: HEADER_BORDER,
        };
      }
      // 3. Row 2: Official Document Metadata Bar
      else if (R === 2) {
        style = {
          fill: { fgColor: { rgb: 'F1F5F9' } },
          font: { name: 'Consolas', sz: 9.5, bold: true, color: { rgb: '1E293B' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: THIN_BORDER,
        };
      }
      // 4. Row 3: 4-Color Semantic Legend Strip
      else if (R === 3) {
        style = {
          fill: { fgColor: { rgb: 'F8FAFC' } },
          font: { name: 'Segoe UI', sz: 9, bold: true, color: { rgb: '475569' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: THIN_BORDER,
        };
      }
      // 5. Section Title Banners (01., 02., 03., 04., Signature Header)
      else if (
        c0.startsWith('01.') ||
        c0.startsWith('02.') ||
        c0.startsWith('03.') ||
        c0.startsWith('04.') ||
        c0.startsWith('የአጋሮች ማረጋገጫ')
      ) {
        style = {
          fill: { fgColor: { rgb: 'E2E8F0' } },
          font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: '0F172A' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: {
            top: { style: 'medium', color: { rgb: '475569' } },
            bottom: { style: 'thin', color: { rgb: '94A3B8' } },
            left: { style: 'medium', color: { rgb: themeBannerRgb } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } },
          },
        };
      }
      // 6. Subtitle note row
      else if (c0.startsWith('በዚህ ሉህ')) {
        style = {
          fill: { fgColor: { rgb: 'F8FAFC' } },
          font: { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '475569' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: THIN_BORDER,
        };
      }
      // 7. KPI Summary Header Row
      else if (isKpiHeaderRow && C < activeColsForRow) {
        style = {
          fill: { fgColor: { rgb: '1E293B' } },
          font: { name: 'Segoe UI', sz: 9.5, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: { vertical: 'center', horizontal: C === 5 ? 'center' : 'right' },
          border: HEADER_BORDER,
        };
      }
      // 8. KPI Summary Values Row
      else if (isCurrentRowKpiValues && C < activeColsForRow) {
        let kpiFill = 'ECFDF5';
        let kpiColor = '047857';
        if (s.themeKey === 'RENTAL_EMERALD') {
          if (C === 1) {
            kpiFill = 'FEF2F2';
            kpiColor = 'B91C1C';
          } else if (C === 2) {
            kpiFill = 'EFF6FF';
            kpiColor = '1D4ED8';
          } else if (C === 3) {
            kpiFill = 'F5F3FF';
            kpiColor = '6D28D9';
          }
        } else if (s.themeKey === 'MESFIN_BLUE') {
          if (C === 1) {
            kpiFill = 'FEF2F2';
            kpiColor = 'B91C1C';
          } else if (C === 2) {
            kpiFill = 'EFF6FF';
            kpiColor = '1D4ED8';
          }
        } else if (s.themeKey === 'ZEWDNESH_PURPLE') {
          if (C === 1) {
            kpiFill = 'FEF2F2';
            kpiColor = 'B91C1C';
          } else if (C === 2) {
            kpiFill = 'F5F3FF';
            kpiColor = '6D28D9';
          }
        } else if (s.themeKey === 'GROCERIES_TEAL') {
          if (C === 0) {
            kpiFill = 'FEF2F2';
            kpiColor = 'B91C1C';
          } else {
            kpiFill = 'F8FAFC';
            kpiColor = '0F172A';
          }
        }
        style = {
          fill: { fgColor: { rgb: kpiFill } },
          font: { name: 'Segoe UI', sz: 11, bold: true, color: { rgb: kpiColor } },
          alignment: { vertical: 'center', horizontal: isNumeric ? 'right' : 'center' },
          border: TOTAL_BORDER,
        };
      }
      // 9. Table Column Header Row
      else if (isTableHeader) {
        let colHeaderBg = tableHeaderRgb;
        if (s.themeKey === 'RENTAL_EMERALD') {
          if (C === 4 || C === 7) colHeaderBg = '1E3A8A'; // Mesfin Blue
          else if (C === 5 || C === 8) colHeaderBg = '581C87'; // Zewdnesh Purple
          else if (C === 3 || C === 6) colHeaderBg = '064E3B'; // Gross/Total Emerald
        }
        style = {
          fill: { fgColor: { rgb: colHeaderBg } },
          font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
          alignment: {
            vertical: 'center',
            horizontal: C >= 3 || (maxCols === 3 && C === 2) ? 'right' : 'left',
          },
          border: HEADER_BORDER,
        };
      }
      // 10. Totals Row
      else if (isTotalRow) {
        const isExpenseTotal =
          c0.includes('ወጪ') || currentTableSection === 'EXPENSES' || currentTableSection === 'PERSONAL_EXP';
        const rowFill = isExpenseTotal ? 'FEF2F2' : 'ECFDF5';
        let textColor = isExpenseTotal ? '991B1B' : '065F46';
        if (s.themeKey === 'RENTAL_EMERALD') {
          if (C === 4 || C === 7) textColor = '1D4ED8';
          else if (C === 5 || C === 8) textColor = '6D28D9';
        }
        style = {
          fill: { fgColor: { rgb: rowFill } },
          font: { name: 'Segoe UI', sz: 10.5, bold: true, color: { rgb: textColor } },
          alignment: { vertical: 'center', horizontal: isNumeric ? 'right' : 'left' },
          border: TOTAL_BORDER,
        };
      }
      // 11. Mesfin Partner Highlight or Signature Row (Blue)
      else if (isMesfinPartnerRow) {
        style = {
          fill: { fgColor: { rgb: 'EFF6FF' } },
          font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '1E40AF' } },
          alignment: { vertical: 'center', horizontal: isNumeric ? 'right' : 'left' },
          border: THIN_BORDER,
        };
      }
      // 12. Zewdnesh Partner Highlight or Signature Row (Purple)
      else if (isZewdneshPartnerRow) {
        style = {
          fill: { fgColor: { rgb: 'F5F3FF' } },
          font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '5B21B6' } },
          alignment: { vertical: 'center', horizontal: isNumeric ? 'right' : 'left' },
          border: THIN_BORDER,
        };
      }
      // 13. Reconciliation / Ratio Row
      else if (isReconcileRow) {
        style = {
          fill: { fgColor: { rgb: c0 === 'ማረጋገጫ' ? 'ECFDF5' : 'F8FAFC' } },
          font: {
            name: 'Segoe UI',
            sz: 9.5,
            bold: true,
            color: { rgb: c0 === 'ማረጋገጫ' ? '047857' : '334155' },
          },
          alignment: { vertical: 'center', horizontal: C >= 3 ? 'right' : 'left' },
          border: THIN_BORDER,
        };
      }
      // 14. Official Footer Stamp Row
      else if (c0.startsWith('መስፍን እና ዘውድነሽ የሂሳብ መዝገብ ሥርዓት')) {
        style = {
          fill: { fgColor: { rgb: 'F1F5F9' } },
          font: { name: 'Consolas', sz: 9, italic: true, color: { rgb: '64748B' } },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: THIN_BORDER,
        };
      }
      // 15. Placeholder Row
      else if (isPlaceholderRow) {
        style = {
          fill: { fgColor: { rgb: 'FAFAFA' } },
          font: { name: 'Segoe UI', sz: 9.5, italic: true, color: { rgb: '94A3B8' } },
          alignment: { vertical: 'center', horizontal: C === 2 ? 'right' : 'left' },
          border: THIN_BORDER,
        };
      }
      // 16. Standard Data Rows inside a table (with Zebra striping + Semantic Column Colors)
      else if (currentTableSection !== 'NONE' && c0 !== '') {
        const zebraBg = dataRowCounter % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
        let cellColor = '0F172A';
        let isBoldCell = C === 0;

        if (s.themeKey === 'RENTAL_EMERALD') {
          if (C === 4 || C === 7) {
            cellColor = '1D4ED8'; // Mesfin Blue
            isBoldCell = true;
          } else if (C === 5 || C === 8) {
            cellColor = '6D28D9'; // Zewdnesh Purple
            isBoldCell = true;
          } else if (C === 3 || C === 6) {
            cellColor = currentTableSection === 'EXPENSES' ? 'B91C1C' : '047857';
            isBoldCell = true;
          }
        } else if (maxCols === 3 && C === 2) {
          cellColor = currentTableSection === 'PERSONAL_EXP' ? 'B91C1C' : '047857';
          isBoldCell = true;
        } else if (s.themeKey === 'GROCERIES_TEAL') {
          if (C === 4 && isNumeric) {
            cellColor = 'B91C1C';
            isBoldCell = true;
          } else if (C === 5) {
            const valStr = String(cell.v || '');
            cellColor = valStr === 'ተገዝቷል' ? '047857' : '64748B';
            isBoldCell = valStr === 'ተገዝቷል';
          }
        }

        style = {
          fill: { fgColor: { rgb: zebraBg } },
          font: { name: 'Segoe UI', sz: 10, bold: isBoldCell, color: { rgb: cellColor } },
          alignment: {
            vertical: 'center',
            horizontal:
              isNumeric || (s.themeKey === 'GROCERIES_TEAL' && C === 5)
                ? C === 5 && s.themeKey === 'GROCERIES_TEAL'
                  ? 'center'
                  : 'right'
                : 'left',
          },
          border: THIN_BORDER,
        };
      }

      cell.s = style;
    }
  }

  ws['!merges'] = merges;
  ws['!rows'] = rowHeights;
}

export function buildXlsxWorkbook(
  state: WorkbookState,
  activeMonth: EthiopianMonth | 'ANNUAL' = 'ጥቅምት',
  options?: StandardReportExportOptions
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const sheets = buildExactTemplateSheets(state, activeMonth, options);

  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    applyExecutiveTemplateStylesToWorksheet(ws, s);
    XLSX.utils.book_append_sheet(wb, ws, s.sheetName);
  }

  return wb;
}

export function exportWorkbookToExcel(
  state: WorkbookState,
  customFileName?: string,
  activeMonth: EthiopianMonth | 'ANNUAL' = 'ጥቅምት',
  options?: StandardReportExportOptions
) {
  const wb = buildXlsxWorkbook(state, activeMonth, options);
  const scope = options?.scope || 'FULL_EXECUTIVE';
  const scopeSuffix = scope === 'FULL_EXECUTIVE' ? '' : `_${scope}`;
  const safeFileName =
    customFileName && customFileName.trim()
      ? customFileName.trim().endsWith('.xlsx')
        ? customFileName.trim()
        : `${customFileName.trim()}.xlsx`
      : `Mesfin_Zewdnesh_Report_${state.yearEC.replace(/\s+/g, '_')}${scopeSuffix}.xlsx`;
  XLSX.writeFile(wb, safeFileName);
}

/**
 * Option B: Local Excel Export with native File System Access API (`showSaveFilePicker`)
 * allowing users to save directly to a designated local folder or file path.
 */
export async function saveWorkbookToDesignatedLocalFile(
  state: WorkbookState,
  options?: {
    customFileName?: string;
    activeMonth?: EthiopianMonth | 'ANNUAL';
    existingHandle?: any;
    scope?: ReportTemplateScope;
    includeSignatures?: boolean;
  }
): Promise<{
  savedPathLabel: string;
  fileHandle: any | null;
  usedFileSystemApi: boolean;
}> {
  const activeMonth = options?.activeMonth || 'ጥቅምት';
  const wb = buildXlsxWorkbook(state, activeMonth, {
    scope: options?.scope,
    includeSignatures: options?.includeSignatures,
  });
  const defaultFileName =
    options?.customFileName && options.customFileName.trim()
      ? options.customFileName.trim().endsWith('.xlsx')
        ? options.customFileName.trim()
        : `${options.customFileName.trim()}.xlsx`
      : `Mesfin_Zewdnesh_Report_${state.yearEC.replace(/\s+/g, '_')}.xlsx`;

  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([xlsxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // 1. If user already picked a file handle for 1-click local folder backup, write directly
  if (options?.existingHandle) {
    try {
      const writable = await options.existingHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return {
        savedPathLabel: options.existingHandle.name || defaultFileName,
        fileHandle: options.existingHandle,
        usedFileSystemApi: true,
      };
    } catch {
      // Fall through to picker or browser download if handle permission expired
    }
  }

  // 2. Try native File System Access API (`window.showSaveFilePicker`) to let user choose local folder/path
  const win = window as unknown as {
    showSaveFilePicker?: (opts: unknown) => Promise<any>;
  };

  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const handle = await win.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [
          {
            description: 'Excel Workbook (.xlsx)',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return {
        savedPathLabel: handle.name || defaultFileName,
        fileHandle: handle,
        usedFileSystemApi: true,
      };
    } catch (err: any) {
      if (err && err.name === 'AbortError') {
        throw new Error('USER_CANCELLED');
      }
      // If blocked by cross-origin iframe security policy, fall back cleanly to direct download
    }
  }

  // 3. Standard browser download fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultFileName;
  a.click();
  URL.revokeObjectURL(url);

  return {
    savedPathLabel: `Downloads/${defaultFileName}`,
    fileHandle: null,
    usedFileSystemApi: false,
  };
}

/**
 * Exports all configured fiscal years into a single comprehensive multi-year Excel backup (.xlsx)
 * with the full Executive System Design Template applied to every sheet.
 */
export function exportMultiYearArchiveToExcel(
  workbooksByYear: Record<string, WorkbookState>,
  yearsList: string[],
  customFileName?: string
) {
  const wb = XLSX.utils.book_new();

  yearsList.forEach((yr) => {
    const state = workbooksByYear[yr];
    if (!state) return;
    const yrTag = yr.replace(/\s+/g, '');
    const sheets = buildExactTemplateSheets(state, yr === '2018 EC' ? 'ሐምሌ' : 'ጥቅምት');
    sheets.forEach((s) => {
      const ws = XLSX.utils.aoa_to_sheet(s.rows);
      applyExecutiveTemplateStylesToWorksheet(ws, s);
      const tabName = `${yrTag}_${s.sheetName}`.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, tabName);
    });
  });

  const safeName =
    customFileName && customFileName.trim()
      ? customFileName.trim().endsWith('.xlsx')
        ? customFileName.trim()
        : `${customFileName.trim()}.xlsx`
      : `Mesfin_Zewdnesh_MultiYear_Archive_${yearsList.length}_Years.xlsx`;

  XLSX.writeFile(wb, safeName);
}

function parseNumberCell(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function inferSplitRatios(splitText: string, totalVal: number, mesfinVal: number, zewdneshVal: number): {
  splitType: SplitType;
  mesfinRatio: number;
  zewdneshRatio: number;
} {
  const norm = splitText.trim();
  if (norm.includes('50%')) {
    return { splitType: '50_50', mesfinRatio: 0.5, zewdneshRatio: 0.5 };
  }
  if (norm.includes('100% መስፍን')) {
    return { splitType: '100_MESFIN', mesfinRatio: 1.0, zewdneshRatio: 0.0 };
  }
  if (norm.includes('100% ዘውድነሽ')) {
    return { splitType: '100_ZEWDNESH', mesfinRatio: 0.0, zewdneshRatio: 1.0 };
  }
  if (Math.abs(totalVal) > 0) {
    const mR = Math.abs(mesfinVal) / Math.abs(totalVal);
    const zR = Math.abs(zewdneshVal) / Math.abs(totalVal);
    return { splitType: 'CUSTOM_RATIO', mesfinRatio: mR, zewdneshRatio: zR };
  }
  return { splitType: '50_50', mesfinRatio: 0.5, zewdneshRatio: 0.5 };
}

export async function parseUploadedFile(file: File): Promise<WorkbookState> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.tenants)) {
      return {
        ...parsed,
        sourceFileName: file.name,
        lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    }
  }

  if (ext === 'md' || ext === 'txt') {
    const text = await file.text();
    return parseMarkdownWorkbook(text, file.name);
  }

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const nextState: WorkbookState = JSON.parse(JSON.stringify(INITIAL_WORKBOOK_STATE));
  nextState.sourceFileName = file.name;
  nextState.lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const parsedTenants: TenantRentalRow[] = [];
  const parsedPropExpenses: PropertyExpenseRow[] = [];
  const parsedMesfinInc: LedgerEntry[] = [];
  const parsedMesfinExp: LedgerEntry[] = [];
  const parsedZewdneshDep: LedgerEntry[] = [];
  const parsedZewdneshExp: LedgerEntry[] = [];
  const parsedGroceries: GroceryItem[] = [];

  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: '' });

    let currentSection: 'NONE' | 'TENANTS' | 'PROP_EXPENSES' | 'MESFIN_INC' | 'MESFIN_EXP' | 'ZEWD_DEP' | 'ZEWD_EXP' | 'GROCERIES' = 'NONE';

    for (const row of rows) {
      const firstCell = String(row[0] ?? '').trim();
      const secondCell = String(row[1] ?? '').trim();

      if (!firstCell && !secondCell) continue;

      if (firstCell === 'ተከራይ') {
        currentSection = 'TENANTS';
        continue;
      }
      if (firstCell === 'የወጪ አይነት') {
        currentSection = 'PROP_EXPENSES';
        continue;
      }
      if (
        firstCell === 'ርዕስ' ||
        firstCell.startsWith('የተጣራ') ||
        firstCell.startsWith('የአጋሮች ማረጋገጫ') ||
        firstCell.startsWith('1. አቶ መስፍን') ||
        firstCell.startsWith('2. ወ/ሮ ዘውድነሽ') ||
        firstCell.startsWith('መስፍን እና ዘውድነሽ የሂሳብ') ||
        firstCell.startsWith('01.') ||
        firstCell.startsWith('02.') ||
        firstCell.startsWith('03.') ||
        firstCell.startsWith('04.')
      ) {
        currentSection = 'NONE';
        continue;
      }
      if (firstCell === 'ተ.ቁ' && secondCell.includes('ዕቃ')) {
        currentSection = 'GROCERIES';
        continue;
      }
      if (firstCell === 'ቀን / ወር') {
        if (secondCell.includes('የገቢ')) currentSection = 'MESFIN_INC';
        else if (secondCell.includes('የተቀማጭ')) currentSection = 'ZEWD_DEP';
        else if (secondCell.includes('የወጪ')) {
          if (sheetName.includes('ዘውድነሽ') || parsedZewdneshDep.length > 0) {
            currentSection = 'ZEWD_EXP';
          } else {
            currentSection = 'MESFIN_EXP';
          }
        }
        continue;
      }

      if (
        firstCell.startsWith('ጠቅላላ') ||
        firstCell.startsWith('ድምር') ||
        firstCell === 'መስፍን' ||
        firstCell === 'ዘውድነሽ' ||
        firstCell === 'ወደፊት የሚሞላ' ||
        firstCell.startsWith('የሰነድ ቁጥር') ||
        firstCell.startsWith('■')
      ) {
        continue;
      }

      if (currentSection === 'TENANTS' && row.length >= 4) {
        const total = parseNumberCell(row[3]);
        const mShare = parseNumberCell(row[4]);
        const zShare = parseNumberCell(row[5]);
        const splitLabel = String(row[2] || '50% መስፍን / 50% ዘውድነሽ');
        const ratios = inferSplitRatios(splitLabel, total, mShare, zShare);

        parsedTenants.push({
          id: `t-imp-${parsedTenants.length + 1}`,
          tenantName: firstCell,
          tenantNameEn: firstCell,
          description: secondCell || 'የመኖሪያ ቤት ኪራይ',
          splitLabel,
          ...ratios,
          monthlyAmounts: {
            'መስከረም': 0,
            'ጥቅምት': total,
            'ኅዳር': 0,
            'ታኅሣሥ': 0,
            'ጥር': 0,
            'የካቲት': 0,
            'መጋቢት': 0,
            'ሚያዝያ': 0,
            'ግንቦት': 0,
            'ሰኔ': 0,
            'ሐምሌ': 0,
            'ነሐሴ': 0,
          },
        });
      } else if (currentSection === 'PROP_EXPENSES' && row.length >= 4) {
        const total = Math.abs(parseNumberCell(row[3]));
        const mShare = Math.abs(parseNumberCell(row[4]));
        const zShare = Math.abs(parseNumberCell(row[5]));
        const splitLabel = String(row[2] || 'የጋራ (50% - 50%)');
        const ratios = inferSplitRatios(splitLabel, total, mShare, zShare);

        parsedPropExpenses.push({
          id: `exp-imp-${parsedPropExpenses.length + 1}`,
          expenseType: firstCell,
          expenseTypeEn: firstCell,
          description: secondCell,
          splitLabel,
          ...ratios,
          monthlyAmounts: {
            'መስከረም': 0,
            'ጥቅምት': total,
            'ኅዳር': 0,
            'ታኅሣሥ': 0,
            'ጥር': 0,
            'የካቲት': 0,
            'መጋቢት': 0,
            'ሚያዝያ': 0,
            'ግንቦት': 0,
            'ሰኔ': 0,
            'ሐምሌ': 0,
            'ነሐሴ': 0,
          },
        });
      } else if (currentSection === 'MESFIN_INC' && row.length >= 3) {
        const amt = Math.abs(parseNumberCell(row[2]));
        parsedMesfinInc.push({
          id: `mi-imp-${parsedMesfinInc.length + 1}`,
          dateOrMonth: firstCell,
          description: secondCell,
          category: 'የቤት ኪራይ',
          amount: amt,
          isPlaceholder: amt === 0,
        });
      } else if (currentSection === 'MESFIN_EXP' && row.length >= 3) {
        const amt = Math.abs(parseNumberCell(row[2]));
        if (amt > 0) {
          parsedMesfinExp.push({
            id: `me-imp-${parsedMesfinExp.length + 1}`,
            dateOrMonth: firstCell,
            description: secondCell,
            category: 'ወጪ',
            amount: amt,
          });
        }
      } else if (currentSection === 'ZEWD_DEP' && row.length >= 3) {
        const amt = Math.abs(parseNumberCell(row[2]));
        if (amt > 0) {
          parsedZewdneshDep.push({
            id: `zd-imp-${parsedZewdneshDep.length + 1}`,
            dateOrMonth: firstCell,
            description: secondCell,
            category: 'ተቀማጭ',
            amount: amt,
          });
        }
      } else if (currentSection === 'ZEWD_EXP' && row.length >= 3) {
        const amt = Math.abs(parseNumberCell(row[2]));
        if (amt > 0) {
          parsedZewdneshExp.push({
            id: `ze-imp-${parsedZewdneshExp.length + 1}`,
            dateOrMonth: firstCell,
            description: secondCell,
            category: secondCell.includes('ጋሻው') ? 'ክፍያ (ጋሻው)' : 'ወጪ',
            amount: amt,
          });
        }
      } else if (currentSection === 'GROCERIES' && row.length >= 6) {
        const idx = parseInt(firstCell, 10);
        if (!isNaN(idx)) {
          const price = parseNumberCell(row[4]);
          const statusText = String(row[5] || '').trim();
          parsedGroceries.push({
            id: `g-imp-${idx}`,
            index: idx,
            name: secondCell,
            nameEn: secondCell,
            category: String(row[2] || 'መሰረታዊ ፍጆታ'),
            unit: String(row[3] || 'ኪሎግራም'),
            price,
            purchased: statusText === 'ተገዝቷል' || price > 0,
          });
        }
      }
    }
  });

  if (parsedTenants.length > 0) nextState.tenants = parsedTenants;
  if (parsedPropExpenses.length > 0) nextState.propertyExpenses = parsedPropExpenses;
  if (parsedMesfinInc.length > 0) nextState.mesfinIncome = parsedMesfinInc;
  if (parsedMesfinExp.length > 0) nextState.mesfinExpenses = parsedMesfinExp;
  if (parsedZewdneshDep.length > 0) nextState.zewdneshDeposits = parsedZewdneshDep;
  if (parsedZewdneshExp.length > 0) nextState.zewdneshExpenses = parsedZewdneshExp;
  if (parsedGroceries.length > 0) nextState.groceries = parsedGroceries;

  return nextState;
}

export function parseMarkdownWorkbook(markdown: string, fileName: string): WorkbookState {
  const nextState: WorkbookState = JSON.parse(JSON.stringify(INITIAL_WORKBOOK_STATE));
  nextState.sourceFileName = fileName;
  nextState.lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const lines = markdown.split('\n');
  let section: 'NONE' | 'TENANTS' | 'PROP_EXP' | 'MESFIN_INC' | 'MESFIN_EXP' | 'ZEWD_DEP' | 'ZEWD_EXP' | 'GROCERIES' = 'NONE';
  let currentOwner: 'MESFIN' | 'ZEWDNESH' = 'MESFIN';

  const tenants: TenantRentalRow[] = [];
  const propExp: PropertyExpenseRow[] = [];
  const mInc: LedgerEntry[] = [];
  const mExp: LedgerEntry[] = [];
  const zDep: LedgerEntry[] = [];
  const zExp: LedgerEntry[] = [];
  const groceries: GroceryItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('## የመስፍን')) currentOwner = 'MESFIN';
    if (line.startsWith('## የዘውድነሽ')) currentOwner = 'ZEWDNESH';

    if (!line.startsWith('|') || line.includes('---|')) continue;
    const cols = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    if (cols.length < 3) continue;
    const c0 = cols[0];
    const c1 = cols[1];

    if (c0 === 'ተከራይ') {
      section = 'TENANTS';
      continue;
    }
    if (c0 === 'የወጪ አይነት') {
      section = 'PROP_EXP';
      continue;
    }
    if (c0 === 'ርዕስ') {
      section = 'NONE';
      continue;
    }
    if (c0 === 'ተ.ቁ') {
      section = 'GROCERIES';
      continue;
    }
    if (c0 === 'ቀን / ወር') {
      if (c1.includes('የገቢ')) section = 'MESFIN_INC';
      else if (c1.includes('የተቀማጭ')) section = 'ZEWD_DEP';
      else if (c1.includes('የወጪ')) {
        section = currentOwner === 'ZEWDNESH' ? 'ZEWD_EXP' : 'MESFIN_EXP';
      }
      continue;
    }

    if (
      c0.startsWith('ጠቅላላ') ||
      c0.startsWith('ድምር') ||
      c0 === 'መስፍን' ||
      c0 === 'ዘውድነሽ' ||
      c0 === 'ወደፊት የሚሞላ'
    ) {
      continue;
    }

    if (section === 'TENANTS' && cols.length >= 6) {
      const total = parseNumberCell(cols[3]);
      const mShare = parseNumberCell(cols[4]);
      const zShare = parseNumberCell(cols[5]);
      const ratios = inferSplitRatios(cols[2], total, mShare, zShare);
      tenants.push({
        id: `t-md-${tenants.length + 1}`,
        tenantName: c0,
        tenantNameEn: c0,
        description: c1,
        splitLabel: cols[2],
        ...ratios,
        monthlyAmounts: {
          'መስከረም': 0,
          'ጥቅምት': total,
          'ኅዳር': 0,
          'ታኅሣሥ': 0,
          'ጥር': 0,
          'የካቲት': 0,
          'መጋቢት': 0,
          'ሚያዝያ': 0,
          'ግንቦት': 0,
          'ሰኔ': 0,
          'ሐምሌ': 0,
          'ነሐሴ': 0,
        },
      });
    } else if (section === 'PROP_EXP' && cols.length >= 6) {
      const total = Math.abs(parseNumberCell(cols[3]));
      const mShare = Math.abs(parseNumberCell(cols[4]));
      const zShare = Math.abs(parseNumberCell(cols[5]));
      const ratios = inferSplitRatios(cols[2], total, mShare, zShare);
      propExp.push({
        id: `exp-md-${propExp.length + 1}`,
        expenseType: c0,
        expenseTypeEn: c0,
        description: c1,
        splitLabel: cols[2],
        ...ratios,
        monthlyAmounts: {
          'መስከረም': 0,
          'ጥቅምት': total,
          'ኅዳር': 0,
          'ታኅሣሥ': 0,
          'ጥር': 0,
          'የካቲት': 0,
          'መጋቢት': 0,
          'ሚያዝያ': 0,
          'ግንቦት': 0,
          'ሰኔ': 0,
          'ሐምሌ': 0,
          'ነሐሴ': 0,
        },
      });
    } else if (section === 'MESFIN_INC' && cols.length >= 3) {
      const amt = parseNumberCell(cols[2]);
      mInc.push({
        id: `mi-md-${mInc.length + 1}`,
        dateOrMonth: c0,
        description: c1,
        category: 'የቤት ኪራይ',
        amount: amt,
        isPlaceholder: amt === 0,
      });
    } else if (section === 'MESFIN_EXP' && cols.length >= 3) {
      const amt = parseNumberCell(cols[2]);
      if (amt > 0) {
        mExp.push({
          id: `me-md-${mExp.length + 1}`,
          dateOrMonth: c0,
          description: c1,
          category: 'ወጪ',
          amount: amt,
        });
      }
    } else if (section === 'ZEWD_DEP' && cols.length >= 3) {
      const amt = parseNumberCell(cols[2]);
      if (amt > 0) {
        zDep.push({
          id: `zd-md-${zDep.length + 1}`,
          dateOrMonth: c0,
          description: c1,
          category: 'ተቀማጭ',
          amount: amt,
        });
      }
    } else if (section === 'ZEWD_EXP' && cols.length >= 3) {
      const amt = parseNumberCell(cols[2]);
      if (amt > 0) {
        zExp.push({
          id: `ze-md-${zExp.length + 1}`,
          dateOrMonth: c0,
          description: c1,
          category: c1.includes('ጋሻው') ? 'ክፍያ (ጋሻው)' : 'ወጪ',
          amount: amt,
        });
      }
    } else if (section === 'GROCERIES' && cols.length >= 6) {
      const idx = parseInt(c0, 10);
      if (!isNaN(idx)) {
        const price = parseNumberCell(cols[4]);
        groceries.push({
          id: `g-md-${idx}`,
          index: idx,
          name: c1,
          nameEn: c1,
          category: cols[2],
          unit: cols[3],
          price,
          purchased: cols[5] === 'ተገዝቷል' || price > 0,
        });
      }
    }
  }

  if (tenants.length > 0) nextState.tenants = tenants;
  if (propExp.length > 0) nextState.propertyExpenses = propExp;
  if (mInc.length > 0) nextState.mesfinIncome = mInc;
  if (mExp.length > 0) nextState.mesfinExpenses = mExp;
  if (zDep.length > 0) nextState.zewdneshDeposits = zDep;
  if (zExp.length > 0) nextState.zewdneshExpenses = zExp;
  if (groceries.length > 0) nextState.groceries = groceries;

  return nextState;
}
