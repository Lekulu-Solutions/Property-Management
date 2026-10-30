import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileSpreadsheet,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  TrendingUp,
  SlidersHorizontal,
  Droplets,
  ShoppingBasket,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
  Treemap,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  WorkbookState,
} from '../data/initialLedgerData';
import {
  calculateGroceriesSummary,
  calculateMesfinSummary,
  calculateRentalSummary,
  calculateWaterSummary,
  calculateZewdneshSummary,
  formatETB,
} from '../utils/excelParser';
import { translateTextForMode, useLanguage } from '../utils/i18n';

interface VisualAnalyticsProps {
  state: WorkbookState;
  selectedMonth: EthiopianMonth | 'ANNUAL';
  onSelectMonth?: (month: EthiopianMonth | 'ANNUAL') => void;
  bilingual: boolean;
  workbooksByYear?: Record<string, WorkbookState>;
  yearsList?: string[];
  onNavigateTab: (
    tab: 'analytics' | 'rental' | 'mesfin' | 'zewdnesh' | 'groceries' | 'water' | 'settings'
  ) => void;
  onSyncMesfinTikimt?: () => void;
  onSyncGroceriesToExpense?: () => void;
  onExportExcel: () => void;
  onOpenPdfReport: () => void;
}

type AnalyticsSectionFilter = 'ALL' | 'RENTAL' | 'PARTNERS' | 'GROCERIES' | 'WATER';
type TenantChartMode = 'STACKED_PARETO' | 'HORIZONTAL_RANK' | 'MONTHLY_CASHFLOW';
type AllocationChartMode = 'CONCENTRIC_DONUT' | 'WATERFALL';
type ZewdneshChartMode = 'PAYEE_PARETO' | 'CATEGORY_DONUT';
type GroceryChartMode = 'COMPOSED_BAR' | 'TREEMAP' | 'RADIAL_GAUGE';
type WaterChartMode = 'MEMBERS_BAR' | 'MONTHLY_TREND';

const COLORS = {
  mesfin: '#2563EB', // Royal Blue
  mesfinLight: '#60A5FA',
  zewdnesh: '#7C3AED', // Royal Purple
  zewdneshLight: '#A78BFA',
  emerald: '#059669', // Net / Positive Income
  emeraldLight: '#10B981',
  crimson: '#DC2626', // Expense / Deduction
  amber: '#D97706', // Reserve / Consumables
  slate: '#64748B',
};

const PALETTE_GROCERIES = [
  '#059669',
  '#2563EB',
  '#7C3AED',
  '#D97706',
  '#0D9488',
  '#4F46E5',
  '#E11D48',
];

const formatCompactETB = (val: number) => {
  if (Math.abs(val) >= 1000) {
    return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${val}`;
};

// Custom Treemap Node for Groceries & Expense Matrix
const CustomTreemapContent: React.FC<any> = (props) => {
  const { x, y, width, height, index, name, spent, completionPct, itemsLabel } = props;
  if (width < 32 || height < 28) return null;
  const bg = PALETTE_GROCERIES[index % PALETTE_GROCERIES.length];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        ry={4}
        style={{
          fill: bg,
          stroke: '#ffffff',
          strokeWidth: 2,
          fillOpacity: 0.92,
        }}
      />
      {width > 65 && height > 42 && (
        <>
          <text
            x={x + 10}
            y={y + 20}
            fill="#ffffff"
            fontSize={12}
            fontWeight={700}
            className="font-sans"
          >
            {name}
          </text>
          <text
            x={x + 10}
            y={y + 38}
            fill="#ECFDF5"
            fontSize={11}
            fontWeight={600}
            fontFamily="JetBrains Mono, monospace"
          >
            {formatETB(spent || 0)} ብር
          </text>
          {height > 62 && (
            <text
              x={x + 10}
              y={y + 54}
              fill="rgba(255,255,255,0.82)"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
            >
              {itemsLabel} ({Number(completionPct || 0).toFixed(0)}%)
            </text>
          )}
        </>
      )}
    </g>
  );
};

export const VisualAnalytics: React.FC<VisualAnalyticsProps> = ({
  state,
  selectedMonth,
  onSelectMonth,
  bilingual,
  workbooksByYear,
  yearsList,
  onNavigateTab,
  onExportExcel,
  onOpenPdfReport,
}) => {
  const { langMode, formatDual } = useLanguage();
  const [sectionFilter, setSectionFilter] = useState<AnalyticsSectionFilter>('ALL');
  const [tenantFilter, setTenantFilter] = useState<'ALL' | '50_50' | '100_MESFIN' | '100_ZEWDNESH'>('ALL');
  const [tenantChartMode, setTenantChartMode] = useState<TenantChartMode>('STACKED_PARETO');
  const [allocationChartMode, setAllocationChartMode] = useState<AllocationChartMode>('CONCENTRIC_DONUT');
  const [zewdneshChartMode, setZewdneshChartMode] = useState<ZewdneshChartMode>('PAYEE_PARETO');
  const [groceryChartMode, setGroceryChartMode] = useState<GroceryChartMode>('COMPOSED_BAR');
  const [waterChartMode, setWaterChartMode] = useState<WaterChartMode>('MEMBERS_BAR');
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);

  const rental = useMemo(
    () => calculateRentalSummary(state, selectedMonth),
    [state, selectedMonth]
  );
  const mesfin = useMemo(() => calculateMesfinSummary(state), [state]);
  const zewdnesh = useMemo(() => calculateZewdneshSummary(state), [state]);
  const groceries = useMemo(
    () => calculateGroceriesSummary(state, selectedMonth),
    [state, selectedMonth]
  );
  const water = useMemo(
    () => calculateWaterSummary(state, selectedMonth),
    [state, selectedMonth]
  );

  const filteredTenants = useMemo(() => {
    return rental.tenantRows.filter((tr) => {
      if (tenantFilter === 'ALL') return true;
      return tr.row.splitType === tenantFilter;
    });
  }, [rental.tenantRows, tenantFilter]);

  // Group totals by split rule
  const shared5050Total = useMemo(
    () =>
      rental.tenantRows
        .filter((t) => t.row.splitType === '50_50')
        .reduce((s, t) => s + t.gross, 0),
    [rental.tenantRows]
  );
  const mesfin100Total = useMemo(
    () =>
      rental.tenantRows
        .filter((t) => t.row.splitType === '100_MESFIN')
        .reduce((s, t) => s + t.gross, 0),
    [rental.tenantRows]
  );
  const zewdnesh100Total = useMemo(
    () =>
      rental.tenantRows
        .filter((t) => t.row.splitType === '100_ZEWDNESH')
        .reduce((s, t) => s + t.gross, 0),
    [rental.tenantRows]
  );

  const zewdneshRetentionRate =
    zewdnesh.totalDeposit > 0 ? (zewdnesh.netBalance / zewdnesh.totalDeposit) * 100 : 0;

  // 1. Tenant Recharts Dataset (Sorted or Filtered with Cumulative Pareto %)
  const tenantChartData = useMemo(() => {
    const totalFilteredGross = filteredTenants.reduce((s, t) => s + t.gross, 0) || 1;
    let runningGross = 0;

    return filteredTenants.map((item) => {
      runningGross += item.gross;
      const cumulativePct = Math.round((runningGross / totalFilteredGross) * 1000) / 10;
      const shareOfPropertyPct =
        rental.totalGrossIncome > 0
          ? Math.round((item.gross / rental.totalGrossIncome) * 1000) / 10
          : 0;

      return {
        id: item.row.id,
        name: formatDual(item.row.tenantName, item.row.tenantNameEn),
        nameEn: item.row.tenantNameEn,
        displayName: formatDual(item.row.tenantName, item.row.tenantNameEn),
        splitLabel: translateTextForMode(item.row.splitLabel, langMode),
        splitType: item.row.splitType,
        gross: item.gross,
        mesfinShare: item.mesfinShare,
        zewdneshShare: item.zewdneshShare,
        cumulativePct,
        shareOfPropertyPct,
      };
    });
  }, [filteredTenants, formatDual, langMode, rental.totalGrossIncome]);

  // 2. 12-Month Ethiopian Calendar Cashflow Dataset
  const monthlySeriesData = useMemo(() => {
    let cumulativeNet = 0;
    return rental.monthlySeries.map((m) => {
      cumulativeNet += m.net;
      const monthMeta = ETHIOPIAN_MONTHS.find((em) => em.id === m.month);
      const monthEnShort = monthMeta ? monthMeta.labelEn.split(' ')[0] : m.month;
      return {
        month: formatDual(m.month, monthEnShort),
        monthEn: monthEnShort,
        gross: m.gross,
        expense: m.expense,
        net: m.net,
        mesfinNet: m.mesfinNet,
        zewdneshNet: m.zewdneshNet,
        cumulativeNet,
      };
    });
  }, [rental.monthlySeries, formatDual]);

  // 3. Concentric Donut Datasets (Inner: Gross by Split Rule, Outer: Net Allocation + Expenses)
  const innerSplitRingData = useMemo(
    () => [
      {
        name: '50% / 50% የጋራ (Shared)',
        value: shared5050Total,
        color: COLORS.emerald,
      },
      {
        name: '100% መስፍን (Mesfin Only)',
        value: mesfin100Total,
        color: COLORS.mesfin,
      },
      {
        name: '100% ዘውድነሽ (Zewdnesh Only)',
        value: zewdnesh100Total,
        color: COLORS.zewdnesh,
      },
    ].filter((d) => d.value > 0),
    [shared5050Total, mesfin100Total, zewdnesh100Total]
  );

  const outerAllocationRingData = useMemo(
    () => [
      {
        name: 'መስፍን የተጣራ ድርሻ (Mesfin Net)',
        shortName: 'መስፍን የተጣራ',
        value: Math.max(0, rental.mesfinNetShare),
        pct: rental.mesfinNetPercent,
        color: COLORS.mesfin,
      },
      {
        name: 'ዘውድነሽ የተጣራ ድርሻ (Zewdnesh Net)',
        shortName: 'ዘውድነሽ የተጣራ',
        value: Math.max(0, rental.zewdneshNetShare),
        pct: rental.zewdneshNetPercent,
        color: COLORS.zewdnesh,
      },
      {
        name: 'የንብረት ወጪዎች (Property Expenses)',
        shortName: 'ወጪ ተቀናሽ',
        value: Math.max(0, rental.totalExpenses),
        pct:
          rental.totalGrossIncome > 0
            ? (rental.totalExpenses / rental.totalGrossIncome) * 100
            : 0,
        color: COLORS.crimson,
      },
    ].filter((d) => d.value > 0),
    [
      rental.mesfinNetShare,
      rental.zewdneshNetShare,
      rental.totalExpenses,
      rental.mesfinNetPercent,
      rental.zewdneshNetPercent,
      rental.totalGrossIncome,
    ]
  );

  // 4. Gross-to-Net Waterfall Chart Data
  const waterfallData = useMemo(() => {
    const activeExp = rental.expenseRows.filter((e) => e.totalExpense > 0);
    let running = rental.totalGrossIncome;

    const steps: {
      name: string;
      base: number;
      amount: number;
      displayAmount: number;
      color: string;
      type: 'GROSS' | 'EXPENSE' | 'NET' | 'PARTNER';
    }[] = [
      {
        name: translateTextForMode('ጠቅላላ ኪራይ (Gross Rent)', langMode),
        base: 0,
        amount: rental.totalGrossIncome,
        displayAmount: rental.totalGrossIncome,
        color: COLORS.emerald,
        type: 'GROSS',
      },
    ];

    activeExp.forEach((exp) => {
      running -= exp.totalExpense;
      steps.push({
        name: `-${formatDual(exp.row.expenseType, exp.row.expenseTypeEn)}`,
        base: Math.max(0, running),
        amount: exp.totalExpense,
        displayAmount: -exp.totalExpense,
        color: COLORS.crimson,
        type: 'EXPENSE',
      });
    });

    steps.push(
      {
        name: translateTextForMode('የተጣራ ገቢ (Net Income)', langMode),
        base: 0,
        amount: Math.max(0, rental.netIncome),
        displayAmount: rental.netIncome,
        color: '#0D9488',
        type: 'NET',
      },
      {
        name: translateTextForMode('መስፍን የተጣራ (Mesfin Net)', langMode),
        base: 0,
        amount: Math.max(0, rental.mesfinNetShare),
        displayAmount: rental.mesfinNetShare,
        color: COLORS.mesfin,
        type: 'PARTNER',
      },
      {
        name: translateTextForMode('ዘውድነሽ የተጣራ (Zewdnesh Net)', langMode),
        base: 0,
        amount: Math.max(0, rental.zewdneshNetShare),
        displayAmount: rental.zewdneshNetShare,
        color: COLORS.zewdnesh,
        type: 'PARTNER',
      }
    );

    return steps;
  }, [
    rental.totalGrossIncome,
    rental.expenseRows,
    rental.netIncome,
    rental.mesfinNetShare,
    rental.zewdneshNetShare,
    langMode,
    formatDual,
  ]);

  // 5. Mesfin Personal Ledger Composed Chart Dataset
  const mesfinTimelineData = useMemo(() => {
    let runningBalance = 0;
    const rows = state.mesfinIncome
      .filter((inc) => !inc.isPlaceholder || inc.amount > 0)
      .map((inc) => {
        const matchingExpenses = state.mesfinExpenses
          .filter((e) => e.dateOrMonth.trim() === inc.dateOrMonth.trim())
          .reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const net = inc.amount - matchingExpenses;
        runningBalance += net;
        return {
          period: inc.dateOrMonth,
          income: inc.amount,
          expense: matchingExpenses,
          net,
          runningBalance,
        };
      });

    return rows;
  }, [state.mesfinIncome, state.mesfinExpenses]);

  const avgMesfinIncome = useMemo(() => {
    if (mesfin.activeIncomes.length === 0) return 0;
    return mesfin.totalIncome / mesfin.activeIncomes.length;
  }, [mesfin.activeIncomes, mesfin.totalIncome]);

  // 6. Zewdnesh Payee Concentration & Pareto Dataset
  const zewdneshPayeeData = useMemo(() => {
    let cumulative = 0;
    const total = zewdnesh.totalExpense || 1;
    return zewdnesh.payeeBreakdown.map((item, idx) => {
      cumulative += item.amount;
      const sharePct = Math.round((item.amount / total) * 1000) / 10;
      const cumulativePct = Math.round((cumulative / total) * 1000) / 10;
      return {
        name: item.label,
        amount: item.amount,
        count: item.count,
        sharePct,
        cumulativePct,
        fill: idx === 0 ? '#6D28D9' : idx === 1 ? '#7C3AED' : idx === 2 ? '#8B5CF6' : '#A78BFA',
      };
    });
  }, [zewdnesh.payeeBreakdown, zewdnesh.totalExpense]);

  // 7. Partner 6-Dimension Financial Balance Radar Dataset
  const partnerRadarData = useMemo(() => {
    const maxGross = Math.max(rental.mesfinGrossIncome, rental.zewdneshGrossIncome, 1);
    const maxNet = Math.max(rental.mesfinNetShare, rental.zewdneshNetShare, 1);
    const maxInflow = Math.max(mesfin.totalIncome, zewdnesh.totalDeposit, 1);
    const maxAvailable = Math.max(mesfin.netBalance, zewdnesh.netBalance, 1);
    const maxExclusive = Math.max(mesfin100Total, zewdnesh100Total, 1);

    return [
      {
        metric: 'የኪራይ ጠቅላላ (Gross)',
        mesfinScore: Math.round((rental.mesfinGrossIncome / maxGross) * 100),
        zewdneshScore: Math.round((rental.zewdneshGrossIncome / maxGross) * 100),
        mesfinRaw: `${formatETB(rental.mesfinGrossIncome)} ብር`,
        zewdneshRaw: `${formatETB(rental.zewdneshGrossIncome)} ብር`,
      },
      {
        metric: 'የተጣራ ድርሻ (Net Rent)',
        mesfinScore: Math.round((rental.mesfinNetShare / maxNet) * 100),
        zewdneshScore: Math.round((rental.zewdneshNetShare / maxNet) * 100),
        mesfinRaw: `${formatETB(rental.mesfinNetShare)} ብር`,
        zewdneshRaw: `${formatETB(rental.zewdneshNetShare)} ብር`,
      },
      {
        metric: 'የግል ገቢ/ተቀማጭ',
        mesfinScore: Math.round((mesfin.totalIncome / maxInflow) * 100),
        zewdneshScore: Math.round((zewdnesh.totalDeposit / maxInflow) * 100),
        mesfinRaw: `${formatETB(mesfin.totalIncome)} ብር`,
        zewdneshRaw: `${formatETB(zewdnesh.totalDeposit)} ብር`,
      },
      {
        metric: 'የቁጠባ ምጣኔ (Retention %)',
        mesfinScore: Math.max(0, Math.min(100, Math.round(mesfin.retentionRate))),
        zewdneshScore: Math.max(0, Math.min(100, Math.round(zewdneshRetentionRate))),
        mesfinRaw: `${mesfin.retentionRate.toFixed(1)}%`,
        zewdneshRaw: `${zewdneshRetentionRate.toFixed(1)}%`,
      },
      {
        metric: 'ቀሪ ሂሳብ (Net Balance)',
        mesfinScore: Math.max(0, Math.round((mesfin.netBalance / maxAvailable) * 100)),
        zewdneshScore: Math.max(0, Math.round((zewdnesh.netBalance / maxAvailable) * 100)),
        mesfinRaw: `${formatETB(mesfin.netBalance)} ብር`,
        zewdneshRaw: `${formatETB(zewdnesh.netBalance)} ብር`,
      },
      {
        metric: '100% የግል ቤቶች',
        mesfinScore: Math.round((mesfin100Total / maxExclusive) * 100),
        zewdneshScore: Math.round((zewdnesh100Total / maxExclusive) * 100),
        mesfinRaw: `${formatETB(mesfin100Total)} ብር`,
        zewdneshRaw: `${formatETB(zewdnesh100Total)} ብር`,
      },
    ];
  }, [
    rental.mesfinGrossIncome,
    rental.zewdneshGrossIncome,
    rental.mesfinNetShare,
    rental.zewdneshNetShare,
    mesfin.totalIncome,
    mesfin.retentionRate,
    mesfin.netBalance,
    zewdnesh.totalDeposit,
    zewdneshRetentionRate,
    zewdnesh.netBalance,
    mesfin100Total,
    zewdnesh100Total,
  ]);

  // 8. Groceries & Household Consumables Dataset
  const groceryChartData = useMemo(() => {
    return groceries.categoryBreakdown.map((cat, idx) => {
      const completionPct =
        cat.totalItems > 0 ? Math.round((cat.purchasedCount / cat.totalItems) * 1000) / 10 : 0;
      return {
        name: translateTextForMode(cat.category, langMode),
        spent: cat.spent,
        visualWeight: Math.max(cat.spent, cat.totalItems * 80), // ensures unpurchased categories remain visible in Treemap
        totalItems: cat.totalItems,
        purchasedCount: cat.purchasedCount,
        unpurchasedCount: cat.totalItems - cat.purchasedCount,
        completionPct,
        itemsLabel: `${cat.purchasedCount}/${cat.totalItems}`,
        fill: PALETTE_GROCERIES[idx % PALETTE_GROCERIES.length],
      };
    });
  }, [groceries.categoryBreakdown, langMode]);

  // 9. Multi-Year Comparison Dataset (when workbooksByYear is provided)
  const multiYearData = useMemo(() => {
    if (!workbooksByYear || !yearsList || yearsList.length === 0) return [];
    return yearsList
      .map((yr) => {
        const wb = workbooksByYear[yr];
        if (!wb) return null;
        const r = calculateRentalSummary(wb, 'ANNUAL');
        const m = calculateMesfinSummary(wb);
        const z = calculateZewdneshSummary(wb);
        return {
          year: yr,
          annualRentalNet: r.annualNetIncome,
          mesfinRentalShare: r.annualMesfinNet,
          zewdneshRentalShare: r.annualZewdneshNet,
          mesfinPersonalNet: m.netBalance,
          zewdneshPersonalNet: z.netBalance,
        };
      })
      .filter(Boolean) as {
      year: string;
      annualRentalNet: number;
      mesfinRentalShare: number;
      zewdneshRentalShare: number;
      mesfinPersonalNet: number;
      zewdneshPersonalNet: number;
    }[];
  }, [workbooksByYear, yearsList]);

  // 10. Water Usage & Payment Dataset
  const waterMemberChartData = useMemo(() => {
    return water.rows.map((r) => ({
      name: formatDual(r.name, r.nameEn),
      usage: r.totalUsage,
      due: r.totalPaymentDue,
      deposit: r.installmentDeposit,
      paid: r.amountPaid,
      balance: r.nextMonthBalance,
    }));
  }, [water.rows, formatDual]);

  const waterMonthlyChartData = useMemo(() => {
    return water.monthlySeries.map((ms) => ({
      month: ms.labelAm,
      usage: ms.totalUsage,
      due: ms.totalPaymentDue,
      paid: ms.totalAmountPaid,
      balance: ms.totalNextMonthBalance,
    }));
  }, [water.monthlySeries]);

  const showRentalSection = sectionFilter === 'ALL' || sectionFilter === 'RENTAL';
  const showPartnersSection = sectionFilter === 'ALL' || sectionFilter === 'PARTNERS';
  const showGroceriesSection = sectionFilter === 'ALL' || sectionFilter === 'GROCERIES';
  const showWaterSection = sectionFilter === 'ALL' || sectionFilter === 'WATER';

  const activeDonutItem =
    activeDonutIndex !== null && outerAllocationRingData[activeDonutIndex]
      ? outerAllocationRingData[activeDonutIndex]
      : null;

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Top Executive Header, Quick Period Switcher & KPI Strip */}
      <section aria-label="Executive Summary Metrics" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3.5 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>
                {bilingual
                  ? 'RECHARTS VISUAL ANALYTICS ENGINE · የገቢ እና ወጪ ዳሽቦርድ'
                  : 'የገቢ፣ ወጪ እና የሀብት ክፍፍል ቻርት ትንታኔ'}
              </span>
            </div>
            <h1
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              {bilingual
                ? `የገቢ፣ ወጪ እና የንብረት ትንታኔ (${state.yearEC})`
                : `የኪራይ ንብረት እና የግል መዝገቦች ትንታኔ (${state.yearEC})`}
            </h1>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 no-print">
            {onSelectMonth && (
              <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-1.5 bg-white border border-slate-200 rounded-md px-3 py-2 sm:py-1.5 text-xs min-h-[42px] sm:min-h-0">
                <span className="text-slate-500 font-medium whitespace-nowrap">ወር / ጊዜ:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) =>
                    onSelectMonth(e.target.value as EthiopianMonth | 'ANNUAL')
                  }
                  aria-label="የሪፖርት ወር ምረጥ"
                  className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer flex-1 sm:flex-initial text-right sm:text-left"
                >
                  {ETHIOPIAN_MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.labelAm} ({m.labelEn})
                    </option>
                  ))}
                  <option value="ANNUAL">ዓመታዊ ድምር (Annual Total)</option>
                </select>
              </div>
            )}

            <button
              onClick={onOpenPdfReport}
              className="min-h-[42px] sm:min-h-0 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 border border-slate-900 rounded-md hover:bg-slate-800 shadow-xs transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <span>{bilingual ? 'ሪፖርት አትም (PDF)' : 'ሪፖርት አትም'}</span>
            </button>
            <button
              onClick={onExportExcel}
              className="min-h-[42px] sm:min-h-0 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>{bilingual ? 'Excel (.xlsx)' : 'ወደ Excel'}</span>
            </button>
          </div>
        </div>

        {/* 5-Column Consolidated Overview Grid (All 5 Independent Sheets Displayed Together) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 bg-white border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {/* Sheet 1: የኪራይ እና ወጪ ክፍፍል (Rental & Expense Split) */}
          <div className="p-4 flex flex-col justify-between sm:border-b xl:border-b-0 border-slate-200">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-800">
                  የኪራይ እና ወጪ ክፍፍል
                </span>
                <button
                  onClick={() => onNavigateTab('rental')}
                  className="px-1 text-emerald-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <span>ክፈት</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`text-xl font-bold font-mono tabular-nums ${
                    rental.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {rental.netIncome >= 0
                    ? `+${formatETB(rental.netIncome)}`
                    : formatETB(rental.netIncome)}
                </span>
                <span className="text-xs text-slate-500">ብር</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>ኪራይ / ወጪ:</span>
                <span>
                  <strong className="text-emerald-700">+{formatETB(rental.totalGrossIncome)}</strong>{' '}
                  / <strong className="text-red-700">-{formatETB(rental.totalExpenses)}</strong>
                </span>
              </div>
              <div className="flex justify-between">
                <span>መስፍን / ዘውድነሽ:</span>
                <span>
                  <strong className="text-blue-700">{formatETB(rental.mesfinNetShare)}</strong> /{' '}
                  <strong className="text-purple-700">{formatETB(rental.zewdneshNetShare)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Sheet 2: የመስፍን መዝገብ (Mesfin's Personal Ledger) */}
          <div className="p-4 flex flex-col justify-between sm:border-b xl:border-b-0 border-slate-200">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-blue-600 inline-block" />
                  <span>የመስፍን መዝገብ</span>
                </span>
                <button
                  onClick={() => onNavigateTab('mesfin')}
                  className="px-1 text-blue-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <span>ክፈት</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`text-xl font-bold font-mono tabular-nums ${
                    mesfin.netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatETB(mesfin.netBalance)}
                </span>
                <span className="text-xs text-slate-500">ብር</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>ጠቅላላ ገቢ:</span>
                <strong className="text-emerald-700">+{formatETB(mesfin.totalIncome)} ብር</strong>
              </div>
              <div className="flex justify-between">
                <span>ጠቅላላ ወጪ:</span>
                <strong className="text-red-700">-{formatETB(mesfin.totalExpense)} ብር</strong>
              </div>
            </div>
          </div>

          {/* Sheet 3: የዘውድነሽ መዝገብ (Zewdnesh's Personal Ledger) */}
          <div className="p-4 flex flex-col justify-between sm:border-b xl:border-b-0 border-slate-200">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-purple-600 inline-block" />
                  <span>የዘውድነሽ መዝገብ</span>
                </span>
                <button
                  onClick={() => onNavigateTab('zewdnesh')}
                  className="px-1 text-purple-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <span>ክፈት</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`text-xl font-bold font-mono tabular-nums ${
                    zewdnesh.netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatETB(zewdnesh.netBalance)}
                </span>
                <span className="text-xs text-slate-500">ብር</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>ጠቅላላ ተቀማጭ:</span>
                <strong className="text-emerald-700">+{formatETB(zewdnesh.totalDeposit)} ብር</strong>
              </div>
              <div className="flex justify-between">
                <span>ጠቅላላ ወጪ:</span>
                <strong className="text-red-700">-{formatETB(zewdnesh.totalExpense)} ብር</strong>
              </div>
            </div>
          </div>

          {/* Sheet 4: የአስቤዛ መከታተያ (Groceries Tracker) */}
          <div className="p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                  <ShoppingBasket className="w-3.5 h-3.5 text-emerald-700" />
                  <span>የአስቤዛ መከታተያ</span>
                </span>
                <button
                  onClick={() => onNavigateTab('groceries')}
                  className="px-1 text-emerald-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <span>ክፈት</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {formatETB(groceries.totalSpent)}
                </span>
                <span className="text-xs text-slate-500">ብር</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>የተገዙ / ጠቅላላ:</span>
                <strong className="text-emerald-700">
                  {groceries.purchasedCount} / {groceries.totalItems} ዕቃ
                </strong>
              </div>
              <div className="flex justify-between">
                <span>ዓመታዊ ድምር:</span>
                <strong className="text-slate-900">{formatETB(groceries.annualTotalSpent)} ብር</strong>
              </div>
            </div>
          </div>

          {/* Sheet 5: ውሃ (Monthly Water Recording & Payment Tracking) */}
          <div className="p-4 flex flex-col justify-between bg-sky-50/25">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-900 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  <span>ውሃ ({selectedMonth === 'ANNUAL' ? 'ዓመታዊ' : selectedMonth})</span>
                </span>
                <button
                  onClick={() => onNavigateTab('water')}
                  className="px-1 text-sky-700 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                >
                  <span>ክፈት</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {formatETB(water.totalPaymentDue)}
                </span>
                <span className="text-xs text-slate-500">
                  ብር ({formatETB(water.totalUsage)} ዙር)
                </span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-[11px] font-mono tabular-nums text-slate-600">
              <div className="flex justify-between">
                <span>የተከፈለ (Paid):</span>
                <strong className="text-emerald-700">{formatETB(water.totalAmountPaid)} ብር</strong>
              </div>
              <div className="flex justify-between">
                <span>ለሚቀጥለው ወር ቀሪ:</span>
                <strong
                  className={
                    water.totalNextMonthBalance < 0 ? 'text-red-700' : 'text-sky-800'
                  }
                >
                  {formatETB(water.totalNextMonthBalance, water.totalNextMonthBalance > 0)} ብር
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Analytics Lens Filter Bar (All 5 Independent Sheets) */}
      <section className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 no-print">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>የቻርት ትንታኔ እይታ (5ቱም መዝገቦች በአንድ ላይ):</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              ['ALL', 'ሁሉም (All 5 Sheets)'],
              ['RENTAL', 'የኪራይ እና ወጪ ክፍፍል'],
              ['PARTNERS', 'የመስፍን & የዘውድነሽ መዝገብ'],
              ['GROCERIES', 'የአስቤዛ መከታተያ'],
              ['WATER', 'ውሃ (Water)'],
            ] as [AnalyticsSectionFilter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSectionFilter(id)}
              className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                sectionFilter === id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Primary Visual Analytics Row: Recharts Tenant Rental Breakdown & Partner Cashflow Allocation */}
      {showRentalSection && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          {/* Left 7 cols: Recharts Tenant Rental Income & Ownership Split */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    ወርሃዊ የቤት ኪራይ ገቢ በተከራይ እና የድርሻ ክፍፍል
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {state.tenants.length} ተከራዮች (አዲስ አበባ) · ጠቅላላ{' '}
                    <span className="text-emerald-700 font-semibold font-mono tabular-nums">
                      +{formatETB(rental.totalGrossIncome)} ብር
                    </span>{' '}
                    ·{' '}
                    <span className="text-blue-700 font-medium font-mono tabular-nums">
                      መስፍን {formatETB(rental.mesfinGrossIncome)} ብር
                    </span>{' '}
                    /{' '}
                    <span className="text-purple-700 font-medium font-mono tabular-nums">
                      ዘውድነሽ {formatETB(rental.zewdneshGrossIncome)} ብር
                    </span>
                  </p>
                </div>

                {/* Chart Mode Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start shrink-0">
                  <button
                    type="button"
                    onClick={() => setTenantChartMode('STACKED_PARETO')}
                    className={`min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      tenantChartMode === 'STACKED_PARETO'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>የድርሻ ቻርት (Pareto)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenantChartMode('HORIZONTAL_RANK')}
                    className={`min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      tenantChartMode === 'HORIZONTAL_RANK'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>አግድም ንጽጽር</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenantChartMode('MONTHLY_CASHFLOW')}
                    className={`min-h-[32px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      tenantChartMode === 'MONTHLY_CASHFLOW'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>12 ወራት ፍሰት</span>
                  </button>
                </div>
              </div>

              {/* 3-Group Split Summary Strip + Split Rule Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 py-3 text-xs">
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <div>
                    <span className="text-slate-500 block">50% / 50% የጋራ</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-700 mt-0.5 block">
                      +{formatETB(shared5050Total)} ብር
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium block">100% መስፍን ብቻ</span>
                    <span className="font-mono tabular-nums font-bold text-blue-700 mt-0.5 block">
                      {formatETB(mesfin100Total)} ብር
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-700 font-medium block">100% ዘውድነሽ ብቻ</span>
                    <span className="font-mono tabular-nums font-bold text-purple-700 mt-0.5 block">
                      {formatETB(zewdnesh100Total)} ብር
                    </span>
                  </div>
                </div>

                {tenantChartMode !== 'MONTHLY_CASHFLOW' && (
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start sm:self-center overflow-x-auto no-scrollbar max-w-full">
                    <button
                      type="button"
                      onClick={() => setTenantFilter('ALL')}
                      className={`min-h-[30px] px-2 py-0.5 text-[11px] font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                        tenantFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ሁሉም ({rental.tenantRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenantFilter('50_50')}
                      className={`min-h-[30px] px-2 py-0.5 text-[11px] font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                        tenantFilter === '50_50'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      50/50
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenantFilter('100_MESFIN')}
                      className={`min-h-[30px] px-2 py-0.5 text-[11px] font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                        tenantFilter === '100_MESFIN'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 hover:text-blue-700'
                      }`}
                    >
                      100% መስፍን
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenantFilter('100_ZEWDNESH')}
                      className={`min-h-[30px] px-2 py-0.5 text-[11px] font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                        tenantFilter === '100_ZEWDNESH'
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-600 hover:text-purple-700'
                      }`}
                    >
                      100% ዘውድነሽ
                    </button>
                  </div>
                )}
              </div>

              {/* Recharts Canvas for Tenant Rental Analysis */}
              <div className="mt-4 h-[320px] sm:h-[350px] w-full">
                {tenantChartMode === 'STACKED_PARETO' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={tenantChartData}
                      margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
                    >
                      <defs>
                        <linearGradient id="mesfinBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563EB" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.85} />
                        </linearGradient>
                        <linearGradient id="zewdneshBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={formatCompactETB}
                        tick={{
                          fontSize: 11,
                          fill: '#64748B',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={46}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{
                          fontSize: 10,
                          fill: '#059669',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={38}
                      />
                      <Tooltip
                        cursor={{ fill: '#F8FAFC' }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-3 shadow-lg text-xs space-y-1.5 min-w-[220px]">
                              <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                                <span className="font-bold text-sm">
                                  {d.name} ({d.nameEn})
                                </span>
                                <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                                  {d.shareOfPropertyPct}% የጠቅላላ
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300">{d.splitLabel}</div>
                              <div className="pt-1 space-y-1 font-mono tabular-nums">
                                <div className="flex justify-between">
                                  <span className="text-slate-300">ጠቅላላ ኪራይ (Gross):</span>
                                  <span className="font-bold text-emerald-400">
                                    +{formatETB(d.gross)} ብር
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-300">መስፍን ድርሻ:</span>
                                  <span className="font-semibold text-blue-300">
                                    {formatETB(d.mesfinShare)} ብር
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-purple-300">ዘውድነሽ ድርሻ:</span>
                                  <span className="font-semibold text-purple-300">
                                    {formatETB(d.zewdneshShare)} ብር
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-slate-800 pt-1 text-[11px] text-slate-400">
                                  <span>ድምር ፓሬቶ (Cumulative):</span>
                                  <span>{d.cumulativePct}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="mesfinShare"
                        name="የመስፍን ድርሻ"
                        stackId="rent"
                        fill="url(#mesfinBarGrad)"
                        radius={[0, 0, 2, 2]}
                        maxBarSize={42}
                      />
                      <Bar
                        yAxisId="left"
                        dataKey="zewdneshShare"
                        name="የዘውድነሽ ድርሻ"
                        stackId="rent"
                        fill="url(#zewdneshBarGrad)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={42}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="cumulativePct"
                        name="ድምር መቶኛ (Cumulative %)"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={{ r: 3.5, fill: '#059669', strokeWidth: 1.5, stroke: '#ffffff' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}

                {tenantChartMode === 'HORIZONTAL_RANK' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={tenantChartData}
                      margin={{ top: 6, right: 24, left: 8, bottom: 6 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={formatCompactETB}
                        tick={{
                          fontSize: 11,
                          fill: '#64748B',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={64}
                        tick={{ fontSize: 12, fill: '#1E293B', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: '#F8FAFC' }}
                        formatter={(value: any, name: any) => [
                          `${formatETB(Number(value))} ብር`,
                          String(name ?? ''),
                        ]}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                      <Bar
                        dataKey="mesfinShare"
                        name="መስፍን (Mesfin)"
                        stackId="h"
                        fill={COLORS.mesfin}
                        barSize={18}
                      />
                      <Bar
                        dataKey="zewdneshShare"
                        name="ዘውድነሽ (Zewdnesh)"
                        stackId="h"
                        fill={COLORS.zewdnesh}
                        radius={[0, 4, 4, 0]}
                        barSize={18}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {tenantChartMode === 'MONTHLY_CASHFLOW' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={monthlySeriesData}
                      margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
                      onClick={(e: any) => {
                        if (e && e.activeLabel && onSelectMonth) {
                          onSelectMonth(e.activeLabel as EthiopianMonth);
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="netAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactETB}
                        tick={{
                          fontSize: 11,
                          fill: '#64748B',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        cursor={{ fill: '#F1F5F9' }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
                              <div className="font-bold text-sm border-b border-slate-700 pb-1 flex justify-between">
                                <span>
                                  {d.month} ({d.monthEn})
                                </span>
                                <span className="text-emerald-400 font-mono tabular-nums">
                                  {state.yearEC}
                                </span>
                              </div>
                              <div className="space-y-1 font-mono tabular-nums">
                                <div className="flex justify-between">
                                  <span className="text-slate-300">ጠቅላላ ገቢ:</span>
                                  <span className="text-emerald-400 font-bold">
                                    +{formatETB(d.gross)} ብር
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-300">ወጪ:</span>
                                  <span className="text-red-400 font-semibold">
                                    -{formatETB(d.expense)} ብር
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-slate-800 pt-1">
                                  <span className="text-blue-300">መስፍን የተጣራ:</span>
                                  <span className="text-blue-300 font-semibold">
                                    {formatETB(d.mesfinNet)} ብር
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-purple-300">ዘውድነሽ የተጣራ:</span>
                                  <span className="text-purple-300 font-semibold">
                                    {formatETB(d.zewdneshNet)} ብር
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="net"
                        name="የተጣራ ገቢ (Net)"
                        fill="url(#netAreaGrad)"
                        stroke="#059669"
                        strokeWidth={2}
                      />
                      <Bar
                        dataKey="mesfinNet"
                        name="መስፍን የተጣራ"
                        fill={COLORS.mesfin}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={20}
                      />
                      <Bar
                        dataKey="zewdneshNet"
                        name="ዘውድነሽ የተጣራ"
                        fill={COLORS.zewdnesh}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={20}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart Legend & Group Totals */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-blue-600 inline-block rounded-xs" />
                  <span>
                    የመስፍን ድርሻ:{' '}
                    <strong className="font-mono tabular-nums text-blue-700">
                      {formatETB(rental.mesfinGrossIncome)} ብር (
                      {rental.totalGrossIncome > 0
                        ? ((rental.mesfinGrossIncome / rental.totalGrossIncome) * 100).toFixed(1)
                        : '0.0'}
                      %)
                    </strong>
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-purple-600 inline-block rounded-xs" />
                  <span>
                    የዘውድነሽ ድርሻ:{' '}
                    <strong className="font-mono tabular-nums text-purple-700">
                      {formatETB(rental.zewdneshGrossIncome)} ብር (
                      {rental.totalGrossIncome > 0
                        ? ((rental.zewdneshGrossIncome / rental.totalGrossIncome) * 100).toFixed(1)
                        : '0.0'}
                      %)
                    </strong>
                  </span>
                </span>
                {tenantChartMode === 'STACKED_PARETO' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
                    <span className="text-emerald-700 font-medium">ፓሬቶ መቶኛ (Pareto %)</span>
                  </span>
                )}
              </div>
              <button
                onClick={() => onNavigateTab('rental')}
                className="text-xs font-medium text-slate-700 hover:text-slate-900 underline cursor-pointer"
              >
                የኪራይ ክፍፍል ሰንጠረዥ ክፈት →
              </button>
            </div>
          </div>

          {/* Right 5 cols: Recharts Dual Concentric Donut + Gross-to-Net Waterfall Switcher */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    የተጣራ ገቢ ምጣኔ እና የወጪ ተቀናሽ ትንታኔ
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ከጠቅላላ ገቢ ወደ የተጣራ የአጋሮች ክፍፍል (Gross → Net Split)
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
                  <button
                    type="button"
                    onClick={() => setAllocationChartMode('CONCENTRIC_DONUT')}
                    className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      allocationChartMode === 'CONCENTRIC_DONUT'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PieChartIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Donut</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationChartMode('WATERFALL')}
                    className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                      allocationChartMode === 'WATERFALL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Waterfall</span>
                  </button>
                </div>
              </div>

              {allocationChartMode === 'CONCENTRIC_DONUT' ? (
                <div className="my-3 grid grid-cols-1 sm:grid-cols-12 items-center gap-3">
                  {/* Recharts Dual Concentric PieChart */}
                  <div className="sm:col-span-6 relative h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* Inner Ring: Gross Income by Split Rule */}
                        <Pie
                          data={innerSplitRingData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={56}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        >
                          {innerSplitRingData.map((entry, idx) => (
                            <Cell key={`inner-${idx}`} fill={entry.color} fillOpacity={0.75} />
                          ))}
                        </Pie>
                        {/* Outer Ring: Net Partner Split + Expenses */}
                        <Pie
                          data={outerAllocationRingData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={64}
                          outerRadius={88}
                          paddingAngle={2}
                          stroke="#ffffff"
                          strokeWidth={2}
                          onMouseEnter={(_, index) => setActiveDonutIndex(index)}
                          onMouseLeave={() => setActiveDonutIndex(null)}
                        >
                          {outerAllocationRingData.map((entry, idx) => (
                            <Cell
                              key={`outer-${idx}`}
                              fill={entry.color}
                              style={{
                                filter:
                                  activeDonutIndex === idx
                                    ? 'brightness(1.1)'
                                    : 'none',
                                cursor: 'pointer',
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any, name: any) => [
                            `${formatETB(Number(val))} ብር`,
                            String(name ?? ''),
                          ]}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Center Dynamic Readout */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                      <span className="text-[10px] text-slate-500 font-medium truncate max-w-[96px]">
                        {activeDonutItem ? activeDonutItem.shortName : 'የተጣራ ገቢ'}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono tabular-nums">
                        {activeDonutItem
                          ? formatETB(activeDonutItem.value)
                          : `+${formatETB(rental.netIncome)}`}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono tabular-nums font-semibold">
                        {activeDonutItem
                          ? `${activeDonutItem.pct.toFixed(1)}%`
                          : 'ትክክል'}
                      </span>
                    </div>
                  </div>

                  {/* Partner Summary Breakdown Cards */}
                  <div className="sm:col-span-6 space-y-2.5">
                    <div className="p-3 bg-blue-50/40 border border-blue-200/80 rounded-md">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                          <span>መስፍን የተጣራ</span>
                        </span>
                        <span className="font-mono tabular-nums font-bold text-blue-900">
                          {rental.mesfinNetPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1.5">
                        <span className="text-[11px] font-mono tabular-nums">
                          <span className="text-emerald-700">
                            +{formatETB(rental.mesfinGrossIncome)}
                          </span>{' '}
                          <span className="text-red-700">
                            -{formatETB(rental.mesfinExpenses)}
                          </span>
                        </span>
                        <span className="text-sm font-bold font-mono tabular-nums text-blue-700">
                          {formatETB(rental.mesfinNetShare)} ብር
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-purple-50/40 border border-purple-200/80 rounded-md">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-purple-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-purple-600 inline-block" />
                          <span>ዘውድነሽ የተጣራ</span>
                        </span>
                        <span className="font-mono tabular-nums font-bold text-purple-900">
                          {rental.zewdneshNetPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1.5">
                        <span className="text-[11px] font-mono tabular-nums">
                          <span className="text-emerald-700">
                            +{formatETB(rental.zewdneshGrossIncome)}
                          </span>{' '}
                          <span className="text-red-700">
                            -{formatETB(rental.zewdneshExpenses)}
                          </span>
                        </span>
                        <span className="text-sm font-bold font-mono tabular-nums text-purple-700">
                          {formatETB(rental.zewdneshNetShare)} ብር
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Recharts Gross-to-Net Waterfall Chart */
                <div className="my-3 h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={waterfallData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactETB}
                        tick={{
                          fontSize: 10,
                          fill: '#64748B',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                      />
                      <Tooltip
                        cursor={{ fill: '#F8FAFC' }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-2.5 shadow-lg text-xs font-mono tabular-nums">
                              <div className="font-sans font-bold mb-1">{d.name}</div>
                              <div
                                className={
                                  d.displayAmount >= 0
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-red-400 font-bold'
                                }
                              >
                                {d.displayAmount >= 0
                                  ? `+${formatETB(d.displayAmount)}`
                                  : formatETB(d.displayAmount)}{' '}
                                ብር
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="base" stackId="wf" fill="transparent" />
                      <Bar dataKey="amount" stackId="wf" radius={[3, 3, 3, 3]} maxBarSize={36}>
                        {waterfallData.map((entry, idx) => (
                          <Cell key={`wf-${idx}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Active Property Expense Deductions Table */}
              <div className="mt-3">
                <h3 className="text-xs font-semibold text-slate-700 mb-2">
                  የተቀነሱ ወርሃዊ የንብረት ወጪዎች (Active Property Expenses)
                </h3>
                <div className="divide-y divide-slate-100 border-t border-b border-slate-100 text-xs">
                  {rental.expenseRows
                    .filter((e) => e.totalExpense > 0)
                    .map((exp) => (
                      <div
                        key={exp.row.id}
                        className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <div>
                          <span className="font-medium text-slate-900">{exp.row.expenseType}</span>
                          <span className="text-slate-400 mx-1.5">·</span>
                          <span className="text-slate-500">{exp.row.splitLabel}</span>
                        </div>
                        <div className="font-mono tabular-nums sm:text-right">
                          <span className="text-red-700 font-semibold">
                            -{formatETB(exp.totalExpense)}
                          </span>
                          <span className="text-slate-500 ml-2 text-[11px]">
                            (<span className="text-blue-700">መ: -{formatETB(exp.mesfinExpense)}</span>{' '}
                            /{' '}
                            <span className="text-purple-700">
                              ዘ: -{formatETB(exp.zewdneshExpense)}
                            </span>
                            )
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                ያልተሞሉ የወጪ መስመሮች: {rental.expenseRows.filter((e) => e.totalExpense === 0).length}
              </span>
              <button
                onClick={() => onNavigateTab('rental')}
                className="text-slate-700 hover:text-slate-900 underline font-medium cursor-pointer"
              >
                ወጪዎችን አስተካክል →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Visual Analytics Row: Mesfin (Blue), Partner Radar, and Zewdnesh (Purple) */}
      {showPartnersSection && (
        <div className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Mesfin Personal Income & Expense Recharts ComposedChart (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-0.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                      <span>ሉህ 2 · የመስፍን የግል መዝገብ (Mesfin · Blue)</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      የመስፍን ወርሃዊ የገቢ አዝማሚያ እና የወጪ ትንታኔ
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ጠቅላላ ገቢ (
                      <span className="text-emerald-700 font-semibold font-mono tabular-nums">
                        +{formatETB(mesfin.totalIncome)} ብር
                      </span>
                      ) · ወጪ (
                      <span className="text-red-700 font-semibold font-mono tabular-nums">
                        -{formatETB(mesfin.totalExpense)} ብር
                      </span>
                      )
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigateTab('mesfin')}
                    className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    ሙሉ መዝገብ →
                  </button>
                </div>

                {/* Recharts ComposedChart for Mesfin Income, Expense & Cumulative Balance */}
                <div className="mt-4 h-[230px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={mesfinTimelineData}
                      margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="mesfinAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactETB}
                        tick={{
                          fontSize: 11,
                          fill: '#64748B',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={46}
                      />
                      <Tooltip
                        cursor={{ fill: '#F8FAFC' }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-3 shadow-lg text-xs space-y-1 font-mono tabular-nums min-w-[200px]">
                              <div className="font-sans font-bold text-sm border-b border-slate-700 pb-1">
                                {d.period}
                              </div>
                              <div className="flex justify-between pt-1">
                                <span className="text-blue-300">ወርሃዊ ገቢ:</span>
                                <span className="text-emerald-400 font-bold">
                                  +{formatETB(d.income)} ብር
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-300">ወጪ (Expense):</span>
                                <span className="text-red-400 font-semibold">
                                  -{formatETB(d.expense)} ብር
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-slate-800 pt-1">
                                <span className="text-slate-300">ድምር ቀሪ (Cumulative):</span>
                                <span className="text-white font-bold">
                                  {formatETB(d.runningBalance)} ብር
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      />
                      {avgMesfinIncome > 0 && (
                        <ReferenceLine
                          y={avgMesfinIncome}
                          stroke="#94A3B8"
                          strokeDasharray="4 4"
                          label={{
                            value: `አማካይ: ${formatCompactETB(Math.round(avgMesfinIncome))}`,
                            position: 'insideTopRight',
                            fill: '#475569',
                            fontSize: 10,
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="runningBalance"
                        name="ድምር ቀሪ ሂሳብ"
                        fill="url(#mesfinAreaGrad)"
                        stroke="#1D4ED8"
                        strokeWidth={2}
                      />
                      <Bar
                        dataKey="income"
                        name="የመስፍን ገቢ"
                        fill={COLORS.mesfin}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={32}
                      />
                      <Bar
                        dataKey="expense"
                        name="የመስፍን ወጪ"
                        fill={COLORS.crimson}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={24}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Mesfin Personal Expenses Breakdown */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>የመስፍን የወጪ ዝርዝር</span>
                    <span className="font-mono tabular-nums text-red-700">
                      ድምር: -{formatETB(mesfin.totalExpense)} ብር
                    </span>
                  </div>
                  <div className="space-y-2">
                    {mesfin.activeExpenses.map((exp) => {
                      const pct =
                        mesfin.totalExpense > 0 ? (exp.amount / mesfin.totalExpense) * 100 : 0;
                      return (
                        <div key={exp.id} className="text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-800 font-medium">
                              {exp.description}{' '}
                              <span className="text-slate-400">· {exp.dateOrMonth}</span>
                            </span>
                            <span className="font-mono tabular-nums text-red-700 font-semibold">
                              -{formatETB(exp.amount)} ብር ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-xs overflow-hidden">
                            <div
                              className="bg-red-600/80 h-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  የመስፍን የተጣራ ቀሪ ሂሳብ (Net Available Balance)
                </span>
                <span
                  className={`text-sm font-bold font-mono tabular-nums ${
                    mesfin.netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {mesfin.netBalance >= 0
                    ? `+${formatETB(mesfin.netBalance)}`
                    : formatETB(mesfin.netBalance)}{' '}
                  ብር
                </span>
              </div>
            </div>

            {/* Zewdnesh Deposit & Payee Concentration Recharts Analytics (6 cols - Purple Partner Theme) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 mb-0.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-purple-600 inline-block" />
                      <span>ሉህ 3 · የዘውድነሽ የግል መዝገብ (Zewdnesh · Purple)</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900">
                      የዘውድነሽ ተቀማጭ አጠቃቀም እና የተከፋዮች ትንታኔ
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      መነሻ ተቀማጭ (
                      <span className="text-emerald-700 font-semibold font-mono tabular-nums">
                        +{formatETB(zewdnesh.totalDeposit)} ብር
                      </span>
                      ) · ወጪ (
                      <span className="text-red-700 font-semibold font-mono tabular-nums">
                        -{formatETB(zewdnesh.totalExpense)} ብር
                      </span>
                      )
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md shrink-0">
                    <button
                      type="button"
                      onClick={() => setZewdneshChartMode('PAYEE_PARETO')}
                      className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        zewdneshChartMode === 'PAYEE_PARETO'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ተከፋዮች (Bar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setZewdneshChartMode('CATEGORY_DONUT')}
                      className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        zewdneshChartMode === 'CATEGORY_DONUT'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ምጣኔ (Donut)
                    </button>
                  </div>
                </div>

                {/* Recharts Payee Concentration Chart */}
                <div className="mt-4 h-[290px] w-full">
                  {zewdneshChartMode === 'PAYEE_PARETO' ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        layout="vertical"
                        data={zewdneshPayeeData}
                        margin={{ top: 6, right: 24, left: 10, bottom: 6 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E2E8F0"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tickFormatter={formatCompactETB}
                          tick={{
                            fontSize: 11,
                            fill: '#64748B',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                          axisLine={{ stroke: '#CBD5E1' }}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={115}
                          tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: '#FAF5FF' }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-3 shadow-lg text-xs space-y-1 font-mono tabular-nums min-w-[200px]">
                                <div className="font-sans font-bold text-sm border-b border-slate-700 pb-1">
                                  {d.name}
                                </div>
                                <div className="flex justify-between pt-1">
                                  <span className="text-purple-300">ጠቅላላ ክፍያ:</span>
                                  <span className="text-red-400 font-bold">
                                    -{formatETB(d.amount)} ብር
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-300">የክፍያ ድግግሞሽ:</span>
                                  <span>{d.count} ጊዜ</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-300">ከጠቅላላ ወጪ ድርሻ:</span>
                                  <span className="text-purple-300 font-semibold">
                                    {d.sharePct}%
                                  </span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="amount" name="የተከፈለ ወጪ" radius={[0, 4, 4, 0]} barSize={18}>
                          {zewdneshPayeeData.map((entry, idx) => (
                            <Cell key={`zp-${idx}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={zewdneshPayeeData}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={96}
                          paddingAngle={2}
                          label={(props: any) => `${props.name} (${props.sharePct}%)`}
                          labelLine={{ stroke: '#94A3B8' }}
                        >
                          {zewdneshPayeeData.map((entry, idx) => (
                            <Cell
                              key={`zpie-${idx}`}
                              fill={
                                [
                                  '#6D28D9',
                                  '#7C3AED',
                                  '#8B5CF6',
                                  '#2563EB',
                                  '#059669',
                                  '#D97706',
                                  '#DC2626',
                                  '#475569',
                                ][idx % 8]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any, name: any) => [
                            `-${formatETB(Number(val))} ብር`,
                            String(name ?? ''),
                          ]}
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                <span className="text-slate-500">
                  ጠቅላላ ወጪ:{' '}
                  <strong className="font-mono tabular-nums text-red-700">
                    -{formatETB(zewdnesh.totalExpense)} ብር
                  </strong>{' '}
                  (ከ{state.zewdneshExpenses.length} የወጪ መዝገቦች)
                </span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-bold font-mono tabular-nums ${
                      zewdnesh.netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    ቀሪ:{' '}
                    {zewdnesh.netBalance >= 0
                      ? `+${formatETB(zewdnesh.netBalance)}`
                      : formatETB(zewdnesh.netBalance)}{' '}
                    ብር
                  </span>
                  <button
                    onClick={() => onNavigateTab('zewdnesh')}
                    className="text-xs font-medium text-purple-700 hover:underline cursor-pointer"
                  >
                    መዝገብ →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Partner 6-Axis Financial Radar Comparison + Multi-Year Trajectory */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900">
                    የመስፍን እና የዘውድነሽ 6-ዘርፍ የፋይናንስ ሚዛን ራዳር (Partner Financial Radar)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    የኪራይ ድርሻ፣ የግል ተቀማጭ፣ የቁጠባ ምጣኔ እና የ100% የግል ቤቶች ንጽጽር (Normalized 0–100 Scale)
                  </p>
                </div>

                <div className="mt-3 h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="74%" data={partnerRadarData}>
                      <PolarGrid stroke="#E2E8F0" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 9, fill: '#94A3B8' }}
                      />
                      <Radar
                        name="መስፍን (Mesfin)"
                        dataKey="mesfinScore"
                        stroke={COLORS.mesfin}
                        strokeWidth={2}
                        fill={COLORS.mesfin}
                        fillOpacity={0.28}
                      />
                      <Radar
                        name="ዘውድነሽ (Zewdnesh)"
                        dataKey="zewdneshScore"
                        stroke={COLORS.zewdnesh}
                        strokeWidth={2}
                        fill={COLORS.zewdnesh}
                        fillOpacity={0.28}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-3 shadow-lg text-xs space-y-1 font-mono tabular-nums">
                              <div className="font-sans font-bold border-b border-slate-700 pb-1">
                                {d.metric}
                              </div>
                              <div className="flex justify-between gap-4 pt-1">
                                <span className="text-blue-300">መስፍን:</span>
                                <span className="font-bold text-blue-300">
                                  {d.mesfinRaw} ({d.mesfinScore}%)
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-purple-300">ዘውድነሽ:</span>
                                <span className="font-bold text-purple-300">
                                  {d.zewdneshRaw} ({d.zewdneshScore}%)
                                </span>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                    <span className="font-medium text-blue-800">መስፍን (Blue)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-purple-600 inline-block" />
                    <span className="font-medium text-purple-800">ዘውድነሽ (Purple)</span>
                  </span>
                </div>
                <span className="font-mono tabular-nums text-slate-500">
                  ጠቅላላ የተጣራ ሀብት: {formatETB(mesfin.netBalance + zewdnesh.netBalance)} ብር
                </span>
              </div>
            </div>

            {/* Multi-Year Financial Comparison Area/Bar Chart (6 cols) */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900">
                    የዓመታት የገቢ እና የግል ቀሪ ሂሳብ ንጽጽር (Multi-Year Trajectory)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    በተመዘገቡት የኢትዮጵያ ዓመታት (EC) መካከል ያለው የኪራይ እና የግል ቀሪ ሂሳብ ፍሰት
                  </p>
                </div>

                <div className="mt-3 h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        multiYearData.length > 0
                          ? multiYearData
                          : [
                              {
                                year: state.yearEC,
                                annualRentalNet: rental.annualNetIncome,
                                mesfinRentalShare: rental.annualMesfinNet,
                                zewdneshRentalShare: rental.annualZewdneshNet,
                                mesfinPersonalNet: mesfin.netBalance,
                                zewdneshPersonalNet: zewdnesh.netBalance,
                              },
                            ]
                      }
                      margin={{ top: 12, right: 14, left: 0, bottom: 6 }}
                    >
                      <defs>
                        <linearGradient id="yrRentalGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="yrMesfinGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="yrZewdGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={formatCompactETB}
                        tick={{
                          fontSize: 11,
                          fill: '#64748B',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          `${formatETB(Number(val))} ብር`,
                          String(name ?? ''),
                        ]}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="annualRentalNet"
                        name="ዓመታዊ የተጣራ ኪራይ"
                        stroke="#059669"
                        strokeWidth={2}
                        fill="url(#yrRentalGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="mesfinPersonalNet"
                        name="የመስፍን ቀሪ ሂሳብ"
                        stroke={COLORS.mesfin}
                        strokeWidth={2}
                        fill="url(#yrMesfinGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="zewdneshPersonalNet"
                        name="የዘውድነሽ ቀሪ ሂሳብ"
                        stroke={COLORS.zewdnesh}
                        strokeWidth={2}
                        fill="url(#yrZewdGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>የተመዘገቡ የበጀት ዓመታት: {multiYearData.length || 1}</span>
                <button
                  onClick={() => onNavigateTab('settings')}
                  className="text-slate-700 hover:text-slate-900 underline font-medium cursor-pointer"
                >
                  ዓመታትን አስተዳድር →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groceries & Consumables Category Recharts Analytics Section */}
      {showGroceriesSection && (
        <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                የአስቤዛ እና የፍጆታ ዕቃዎች ግዢ ሁኔታ በምድብ (Groceries & Consumables Analytics)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ጠቅላላ የወጣ ወጪ:{' '}
                <span className="text-red-700 font-semibold font-mono tabular-nums">
                  -{formatETB(groceries.totalSpent)} ብር
                </span>{' '}
                · የተገዙ: {groceries.purchasedCount} ዕቃዎች · ያልተገዙ / ቀሪ:{' '}
                {groceries.unpurchasedCount} ዕቃዎች (
                {groceries.completionPercent.toFixed(1)}% ተጠናቋል)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setGroceryChartMode('COMPOSED_BAR')}
                  className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    groceryChartMode === 'COMPOSED_BAR'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ወጪ & አፈጻጸም (Composed)
                </button>
                <button
                  type="button"
                  onClick={() => setGroceryChartMode('TREEMAP')}
                  className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    groceryChartMode === 'TREEMAP'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Treemap ካርታ
                </button>
                <button
                  type="button"
                  onClick={() => setGroceryChartMode('RADIAL_GAUGE')}
                  className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    groceryChartMode === 'RADIAL_GAUGE'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Radial Gauge
                </button>
              </div>

              <button
                onClick={() => onNavigateTab('groceries')}
                className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer px-2"
              >
                የአስቤዛ ዝርዝር →
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Recharts Visualization (7 cols) */}
            <div className="lg:col-span-7 h-[270px] w-full">
              {groceryChartMode === 'COMPOSED_BAR' && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={groceryChartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={formatCompactETB}
                      tick={{
                        fontSize: 11,
                        fill: '#64748B',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{
                        fontSize: 10,
                        fill: '#059669',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    <Tooltip
                      cursor={{ fill: '#F8FAFC' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-3 shadow-lg text-xs space-y-1 font-mono tabular-nums">
                            <div className="font-sans font-bold text-sm border-b border-slate-700 pb-1">
                              {d.name}
                            </div>
                            <div className="flex justify-between gap-4 pt-1">
                              <span className="text-slate-300">የወጣ ወጪ:</span>
                              <span className="text-emerald-400 font-bold">
                                {formatETB(d.spent)} ብር
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-300">የተገዙ ዕቃዎች:</span>
                              <span>
                                {d.purchasedCount} / {d.totalItems} ({d.completionPct}%)
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="spent"
                      name="የወጣ ወጪ (ብር)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={38}
                    >
                      {groceryChartData.map((entry, idx) => (
                        <Cell key={`gc-${idx}`} fill={entry.fill} />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="completionPct"
                      name="የግዢ አፈጻጸም %"
                      stroke="#D97706"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#D97706', stroke: '#ffffff', strokeWidth: 1.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {groceryChartMode === 'TREEMAP' && (
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={groceryChartData}
                    dataKey="visualWeight"
                    nameKey="name"
                    aspectRatio={4 / 3}
                    stroke="#ffffff"
                    content={<CustomTreemapContent />}
                  >
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-2.5 shadow-lg text-xs font-mono tabular-nums">
                            <div className="font-sans font-bold mb-1">{d.name}</div>
                            <div className="text-emerald-400 font-bold">
                              ወጪ: {formatETB(d.spent)} ብር
                            </div>
                            <div className="text-slate-300">
                              ዕቃዎች: {d.purchasedCount}/{d.totalItems} ({d.completionPct}%)
                            </div>
                          </div>
                        );
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              )}

              {groceryChartMode === 'RADIAL_GAUGE' && (
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="20%"
                    outerRadius="92%"
                    barSize={14}
                    data={groceryChartData}
                  >
                    <RadialBar
                      label={{ position: 'insideStart', fill: '#1E293B', fontSize: 10 }}
                      background
                      dataKey="completionPct"
                    />
                    <Tooltip
                      formatter={(val: any, _name: any, props: any) => [
                        `${val}% (${props.payload.purchasedCount}/${props.payload.totalItems} ተገዝቷል · ${formatETB(props.payload.spent)} ብር)`,
                        props.payload.name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category Cards Summary Grid (5 cols) */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groceries.categoryBreakdown.map((cat, idx) => {
                const pct =
                  cat.totalItems > 0 ? (cat.purchasedCount / cat.totalItems) * 100 : 0;
                const color = PALETTE_GROCERIES[idx % PALETTE_GROCERIES.length];
                return (
                  <div
                    key={cat.category}
                    className="p-3 border border-slate-200 rounded-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-xs inline-block shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">{cat.category}</span>
                        </span>
                        <span className="font-mono tabular-nums text-slate-500 text-[11px]">
                          {cat.purchasedCount}/{cat.totalItems}
                        </span>
                      </div>
                      <div className="mt-1.5 text-base font-bold font-mono tabular-nums text-slate-900">
                        {formatETB(cat.spent)}{' '}
                        <span className="text-xs font-normal text-slate-500">ብር</span>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <div className="w-full h-1.5 bg-slate-100 rounded-xs overflow-hidden">
                        <div
                          className="h-full transition-all duration-200"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sheet 5: Water Recording & Payment Analytics Section */}
      {showWaterSection && (
        <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 mb-0.5">
                <Droplets className="w-3.5 h-3.5 text-sky-600" />
                <span>ሉህ 5 · የውሃ ፍጆታ እና ክፍያ መከታተያ (Water Tracker)</span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                ወርሃዊ የውሃ ፍጆታ (ዙር)፣ ክፍያ እና ወደ ቀጣይ ወር የሚሸጋገር ቀሪ ትንታኔ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ጠቅላላ ዙር:{' '}
                <strong className="font-mono tabular-nums text-slate-900">
                  {formatETB(water.totalUsage)} ዙር
                </strong>{' '}
                (× {water.ratePerUnit} ብር) · ጠቅላላ ክፍያ:{' '}
                <strong className="font-mono tabular-nums text-slate-900">
                  {formatETB(water.totalPaymentDue)} ብር
                </strong>{' '}
                · የተከፈለ:{' '}
                <strong className="font-mono tabular-nums text-emerald-700">
                  {formatETB(water.totalAmountPaid)} ብር
                </strong>{' '}
                · ለሚቀጥለው ወር ቀሪ:{' '}
                <strong
                  className={`font-mono tabular-nums ${
                    water.totalNextMonthBalance < 0 ? 'text-red-700' : 'text-sky-800'
                  }`}
                >
                  {formatETB(water.totalNextMonthBalance, water.totalNextMonthBalance > 0)} ብር
                </strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setWaterChartMode('MEMBERS_BAR')}
                  className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    waterChartMode === 'MEMBERS_BAR'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ተጠቃሚዎች ({water.totalMembers})
                </button>
                <button
                  type="button"
                  onClick={() => setWaterChartMode('MONTHLY_TREND')}
                  className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    waterChartMode === 'MONTHLY_TREND'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  12 ወራት ፍሰት
                </button>
              </div>

              <button
                onClick={() => onNavigateTab('water')}
                className="text-xs font-medium text-sky-700 hover:underline cursor-pointer px-2"
              >
                የውሃ መከታተያ →
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 h-[270px] w-full">
              {waterChartMode === 'MEMBERS_BAR' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={waterMemberChartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatCompactETB}
                      tick={{
                        fontSize: 11,
                        fill: '#64748B',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      cursor={{ fill: '#F8FAFC' }}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 text-white border border-slate-700 rounded-md p-3 shadow-lg text-xs space-y-1 font-mono tabular-nums min-w-[200px]">
                            <div className="font-sans font-bold text-sm border-b border-slate-700 pb-1">
                              {d.name}
                            </div>
                            <div className="flex justify-between pt-1">
                              <span className="text-slate-300">ጠቅላላ ዙር:</span>
                              <span className="text-sky-300 font-bold">{d.usage} ዙር</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">ጠቅላላ ክፍያ:</span>
                              <span className="text-white font-semibold">
                                {formatETB(d.due)} ብር
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-300">የተከፈለ:</span>
                              <span className="text-emerald-400 font-semibold">
                                {formatETB(d.paid)} ብር
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-slate-800 pt-1">
                              <span className="text-slate-300">ለሚቀጥለው ወር ቀሪ:</span>
                              <span
                                className={
                                  d.balance < 0
                                    ? 'text-red-400 font-bold'
                                    : 'text-emerald-400 font-bold'
                                }
                              >
                                {formatETB(d.balance, d.balance > 0)} ብር
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="due"
                      name="ጠቅላላ ክፍያ (Due)"
                      fill="#0284C7"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="paid"
                      name="የተከፈለ (Paid)"
                      fill="#059669"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={26}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="ለሚቀጥለው ወር ቀሪ"
                      stroke="#7C3AED"
                      strokeWidth={2}
                      dot={{ r: 3.5, fill: '#7C3AED', stroke: '#ffffff', strokeWidth: 1.5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={waterMonthlyChartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatCompactETB}
                      tick={{
                        fontSize: 11,
                        fill: '#64748B',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${formatETB(Number(val))} ብር`,
                        String(name ?? ''),
                      ]}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                    <Bar
                      dataKey="due"
                      name="ጠቅላላ ክፍያ (Due)"
                      fill="#0284C7"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={26}
                    />
                    <Bar
                      dataKey="paid"
                      name="የተከፈለ (Paid)"
                      fill="#059669"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={26}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="የወሩ መጨረሻ ቀሪ"
                      stroke="#D97706"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="p-3 border border-slate-200 rounded-md">
                <span className="text-xs text-slate-500 block">ጠቅላላ ዙር (Usage)</span>
                <span className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                  {formatETB(water.totalUsage)} ዙር
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ታሪፍ: {water.ratePerUnit} ብር / ዙር
                </span>
              </div>
              <div className="p-3 border border-slate-200 rounded-md">
                <span className="text-xs text-slate-500 block">ጠቅላላ ክፍያ (Due)</span>
                <span className="text-lg font-bold font-mono tabular-nums text-sky-800 mt-1 block">
                  {formatETB(water.totalPaymentDue)} ብር
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ዓመታዊ: {formatETB(water.annualTotalPaymentDue)} ብር
                </span>
              </div>
              <div className="p-3 border border-slate-200 rounded-md">
                <span className="text-xs text-slate-500 block">የተከፈለው ገንዘብ (Paid)</span>
                <span className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-1 block">
                  {formatETB(water.totalAmountPaid)} ብር
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ተቀማጭ: {formatETB(water.totalInstallmentDeposit, true)} ብር
                </span>
              </div>
              <div className="p-3 border border-slate-200 rounded-md bg-sky-50/40">
                <span className="text-xs text-slate-600 block">ለሚቀጥለው ወር ቀሪ</span>
                <span
                  className={`text-lg font-bold font-mono tabular-nums mt-1 block ${
                    water.totalNextMonthBalance < 0 ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {formatETB(water.totalNextMonthBalance, water.totalNextMonthBalance > 0)} ብር
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  +{water.rows.filter((r) => r.nextMonthBalance >= 0).length} ትርፍ · -{water.rows.filter((r) => r.nextMonthBalance < 0).length} ዕዳ
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
