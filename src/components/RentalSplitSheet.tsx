import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sliders,
  FileText,
  Lock,
} from 'lucide-react';
import {
  DEFAULT_SHARE_RULES,
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  PropertyExpenseRow,
  ShareRuleConfig,
  SplitType,
  TenantRentalRow,
  WorkbookState,
} from '../data/initialLedgerData';
import {
  calculateRentalSummary,
  formatETB,
} from '../utils/excelParser';
import { useLanguage } from '../utils/i18n';
import { ViewEditRoleToggle } from './ViewEditRoleToggle';

interface RentalSplitSheetProps {
  state: WorkbookState;
  selectedMonth: EthiopianMonth | 'ANNUAL';
  onSelectMonth: (month: EthiopianMonth | 'ANNUAL') => void;
  bilingual: boolean;
  shareRules?: ShareRuleConfig[];
  onOpenSettings?: () => void;
  onUpdateTenantAmount: (tenantId: string, month: EthiopianMonth, value: number) => void;
  onUpdateTenantSplit: (tenantId: string, splitType: SplitType, mRatio: number, zRatio: number, label: string) => void;
  onAddTenant: (tenant: Omit<TenantRentalRow, 'id'>) => void;
  onDeleteTenant: (tenantId: string) => void;
  onUpdateExpenseAmount: (expenseId: string, month: EthiopianMonth, value: number) => void;
  onUpdateExpenseSplit: (expenseId: string, splitType: SplitType, mRatio: number, zRatio: number, label: string) => void;
  onAddPropertyExpense: (exp: Omit<PropertyExpenseRow, 'id'>) => void;
  onDeletePropertyExpense: (expenseId: string) => void;
  onSyncMesfinTikimt?: () => void;
  isViewOnly?: boolean;
  onToggleViewOnly?: () => void;
  isMonthClosed?: boolean;
  onOpenRentReceipt?: (
    tenant: TenantRentalRow,
    month: EthiopianMonth,
    gross: number,
    mesfinShare: number,
    zewdneshShare: number
  ) => void;
}

export const RentalSplitSheet: React.FC<RentalSplitSheetProps> = ({
  state,
  selectedMonth,
  onSelectMonth,
  bilingual,
  shareRules = DEFAULT_SHARE_RULES,
  onOpenSettings,
  onUpdateTenantAmount,
  onUpdateTenantSplit,
  onAddTenant,
  onDeleteTenant,
  onUpdateExpenseAmount,
  onUpdateExpenseSplit,
  onAddPropertyExpense,
  onDeletePropertyExpense,
  isViewOnly = true,
  onToggleViewOnly,
  isMonthClosed = false,
  onOpenRentReceipt,
}) => {
  const effectiveViewOnly = isViewOnly || isMonthClosed;
  const { formatDual } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantDesc, setNewTenantDesc] = useState('የመኖሪያ ቤት ኪራይ');
  const [newTenantRuleCode, setNewTenantRuleCode] = useState<string>('50_50');
  const [newTenantRent, setNewTenantRent] = useState('');

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpName, setNewExpName] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpRuleCode, setNewExpRuleCode] = useState<string>('50_50');
  const [newExpAmount, setNewExpAmount] = useState('');

  // Inline custom ratio editor state for individual rows
  const [editingCustomRowId, setEditingCustomRowId] = useState<string | null>(null);
  const [customMesfinPct, setCustomMesfinPct] = useState<string>('50');
  const [mobileShowFullTable, setMobileShowFullTable] = useState<boolean>(false);

  const incomeRules = shareRules.filter(
    (r) => r.appliesTo === 'BOTH' || r.appliesTo === 'INCOME'
  );
  const expenseRules = shareRules.filter(
    (r) => r.appliesTo === 'BOTH' || r.appliesTo === 'EXPENSE'
  );

  const activeEditMonth: EthiopianMonth = selectedMonth === 'ANNUAL' ? 'ጥቅምት' : selectedMonth;
  const calc = calculateRentalSummary(state, selectedMonth);

  const filteredTenantRows = calc.tenantRows.filter(
    (tr) =>
      tr.row.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.row.tenantNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.row.splitLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExpenseRows = calc.expenseRows.filter(
    (er) =>
      er.row.expenseType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      er.row.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      er.row.splitLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resolveRuleByCode = (code: string, target: 'TENANT' | 'EXPENSE'): ShareRuleConfig => {
    const found = shareRules.find((r) => r.code === code);
    if (found) return found;
    return {
      id: 'fallback',
      code: '50_50',
      labelAm: target === 'TENANT' ? '50% መስፍን / 50% ዘውድነሽ' : 'የጋራ (50% - 50%)',
      labelEn: '50% / 50%',
      splitType: '50_50',
      mesfinRatio: 0.5,
      zewdneshRatio: 0.5,
      appliesTo: 'BOTH',
    };
  };

  const getMatchingRuleCodeForRow = (
    splitType: SplitType,
    mRatio: number,
    zRatio: number,
    rulesList: ShareRuleConfig[]
  ): string => {
    const exactMatch = rulesList.find(
      (r) =>
        Math.abs(r.mesfinRatio - mRatio) < 0.005 &&
        Math.abs(r.zewdneshRatio - zRatio) < 0.005
    );
    if (exactMatch) return exactMatch.code;
    if (splitType === '50_50') return '50_50';
    if (splitType === '100_MESFIN') return '100_MESFIN';
    if (splitType === '100_ZEWDNESH') return '100_ZEWDNESH';
    return 'CUSTOM_INLINE';
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    const rentVal = parseFloat(newTenantRent) || 0;
    const rule = resolveRuleByCode(newTenantRuleCode, 'TENANT');

    const monthlyAmounts = ETHIOPIAN_MONTHS.reduce((acc, m) => {
      acc[m.id] = m.id === activeEditMonth ? rentVal : 0;
      return acc;
    }, {} as Record<EthiopianMonth, number>);

    onAddTenant({
      tenantName: newTenantName.trim(),
      tenantNameEn: newTenantName.trim(),
      description: newTenantDesc.trim() || 'የመኖሪያ ቤት ኪራይ',
      splitLabel: rule.labelAm,
      splitType: rule.splitType,
      mesfinRatio: rule.mesfinRatio,
      zewdneshRatio: rule.zewdneshRatio,
      monthlyAmounts,
    });

    setNewTenantName('');
    setNewTenantRent('');
    setShowAddTenant(false);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpName.trim()) return;
    const expVal = Math.abs(parseFloat(newExpAmount) || 0);
    const rule = resolveRuleByCode(newExpRuleCode, 'EXPENSE');

    const monthlyAmounts = ETHIOPIAN_MONTHS.reduce((acc, m) => {
      acc[m.id] = m.id === activeEditMonth ? expVal : 0;
      return acc;
    }, {} as Record<EthiopianMonth, number>);

    onAddPropertyExpense({
      expenseType: newExpName.trim(),
      expenseTypeEn: newExpName.trim(),
      description: newExpDesc.trim() || 'ወርሃዊ ወጪ',
      splitLabel: rule.labelAm,
      splitType: rule.splitType,
      mesfinRatio: rule.mesfinRatio,
      zewdneshRatio: rule.zewdneshRatio,
      monthlyAmounts,
    });

    setNewExpName('');
    setNewExpDesc('');
    setNewExpAmount('');
    setShowAddExpense(false);
  };

  const handleSplitSelectChange = (
    id: string,
    target: 'TENANT' | 'EXPENSE',
    value: string,
    currentMesfinRatio: number
  ) => {
    if (value === 'CUSTOM_INLINE') {
      setEditingCustomRowId(id);
      setCustomMesfinPct(String(Math.round(currentMesfinRatio * 100)));
      return;
    }

    const rule = resolveRuleByCode(value, target);
    const lbl =
      rule.code === '50_50' && target === 'EXPENSE'
        ? 'የጋራ (50% - 50%)'
        : rule.labelAm;

    if (target === 'TENANT') {
      onUpdateTenantSplit(id, rule.splitType, rule.mesfinRatio, rule.zewdneshRatio, lbl);
    } else {
      onUpdateExpenseSplit(id, rule.splitType, rule.mesfinRatio, rule.zewdneshRatio, lbl);
    }
    if (editingCustomRowId === id) {
      setEditingCustomRowId(null);
    }
  };

  const handleApplyInlineCustomRatio = (id: string, target: 'TENANT' | 'EXPENSE') => {
    const mPct = Math.min(Math.max(0, Math.round(parseFloat(customMesfinPct) || 0)), 100);
    const zPct = 100 - mPct;
    const mRatio = mPct / 100;
    const zRatio = zPct / 100;
    const sType: SplitType =
      mPct === 50
        ? '50_50'
        : mPct === 100
        ? '100_MESFIN'
        : mPct === 0
        ? '100_ZEWDNESH'
        : 'CUSTOM_RATIO';
    const label = `${mPct}% መስፍን / ${zPct}% ዘውድነሽ`;

    if (target === 'TENANT') {
      onUpdateTenantSplit(id, sType, mRatio, zRatio, label);
    } else {
      onUpdateExpenseSplit(id, sType, mRatio, zRatio, label);
    }
    setEditingCustomRowId(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header & Summary Strip (ማጠቃለያ) */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3.5 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              የኪራይ ንብረት እና ወጪ ({selectedMonth === 'ANNUAL' ? 'ዓመታዊ ድምር' : selectedMonth} · {state.yearEC})
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            {isMonthClosed && selectedMonth !== 'ANNUAL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>ወሩ ተዘግቷል (Closed)</span>
              </span>
            )}
            {onToggleViewOnly && (
              <ViewEditRoleToggle isViewOnly={effectiveViewOnly} onToggle={onToggleViewOnly} />
            )}

            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ተከራይ ወይም ወጪ ፈልግ..."
                className="w-full min-h-[40px] sm:min-h-0 pl-8 pr-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-emerald-700"
              />
            </div>
            {onOpenSettings && !effectiveViewOnly && (
              <button
                onClick={onOpenSettings}
                className="min-h-[40px] sm:min-h-0 flex-1 sm:flex-initial justify-center px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                title="የድርሻ ስሌት ሕጎችን እና ዓመታትን አስተዳድር"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>የስሌት ሕጎች</span>
              </button>
            )}
          </div>
        </div>

        {/* Month Selector Bar (12 Ethiopian Months + Annual — Touch Scrollable) */}
        <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar no-print">
          {ETHIOPIAN_MONTHS.map((m) => {
            const monthHasData =
              state.tenants.some((t) => (t.monthlyAmounts[m.id] || 0) > 0) ||
              state.propertyExpenses.some((e) => (e.monthlyAmounts[m.id] || 0) > 0);
            const isSelected = selectedMonth === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMonth(m.id)}
                className={`min-h-[38px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : monthHasData
                    ? 'bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/80 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m.labelAm}
                {monthHasData && !isSelected ? ' •' : ''}
              </button>
            );
          })}
          <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />
          <button
            onClick={() => onSelectMonth('ANNUAL')}
            className={`min-h-[38px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedMonth === 'ANNUAL'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            ዓመታዊ ድምር (Annual)
          </button>
        </div>

        {/* Exact Excel Summary Grid (ማጠቃለያ) — Mobile 2x3 Stat Grid + Tablet/Desktop Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">ማጠቃለያ (Summary)</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono tabular-nums text-slate-500">
                መስፍን: {calc.mesfinNetPercent.toFixed(1)}% · ዘውድነሽ: {calc.zewdneshNetPercent.toFixed(1)}%
              </span>
              <button
                type="button"
                onClick={() => setMobileShowFullTable(!mobileShowFullTable)}
                className="md:hidden px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 rounded text-slate-700 cursor-pointer"
              >
                {mobileShowFullTable ? 'የካርድ እይታ (Cards)' : 'ሙሉ ሰንጠረዥ (Full Table)'}
              </button>
            </div>
          </div>

          {/* Mobile 2x3 Summary Grid (< 768px) */}
          <div className="md:hidden grid grid-cols-2 divide-x divide-y divide-slate-200 text-xs">
            <div className="p-3.5">
              <span className="text-slate-500 block">ጠቅላላ ገቢ (+)</span>
              <span className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5 block">
                +{formatETB(calc.totalGrossIncome)}
              </span>
            </div>
            <div className="p-3.5">
              <span className="text-slate-500 block">ጠቅላላ ወጪ (-)</span>
              <span className="text-base font-bold font-mono tabular-nums text-red-700 mt-0.5 block">
                {calc.totalExpenses > 0 ? `-${formatETB(calc.totalExpenses)}` : '0'}
              </span>
            </div>
            <div className="p-3.5 bg-blue-50/30">
              <span className="text-blue-800 font-semibold block">የመስፍን ድርሻ (Blue)</span>
              <span className="text-base font-bold font-mono tabular-nums text-blue-700 mt-0.5 block">
                {formatETB(calc.mesfinNetShare)}
              </span>
            </div>
            <div className="p-3.5 bg-purple-50/30">
              <span className="text-purple-800 font-semibold block">የዘውድነሽ ድርሻ (Purple)</span>
              <span className="text-base font-bold font-mono tabular-nums text-purple-700 mt-0.5 block">
                {formatETB(calc.zewdneshNetShare)}
              </span>
            </div>
            <div className="p-3.5">
              <span className="text-slate-500 block">የተጣራ ዓመታዊ (+)</span>
              <span className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5 block">
                +{formatETB(calc.annualNetIncome)}
              </span>
            </div>
            <div className="p-3.5 flex flex-col justify-between">
              <span className="text-slate-500 block">የኦዲት ሁኔታ</span>
              <div className="mt-1">
                {calc.isReconciled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ትክክል (Reconciled)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>ልዩነት</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tablet & Desktop Summary Table (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50/50">
                  <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">ጠቅላላ ገቢ (+)</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-red-700">ጠቅላላ ወጪ (-)</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-blue-700">የመስፍን ድርሻ</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-purple-700">የዘውድነሽ ድርሻ</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">የተጣራ ዓመታዊ</th>
                  <th className="py-2.5 px-4 font-semibold text-center">ሁኔታ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-sm font-mono tabular-nums font-bold">
                  <td className="py-3 px-4 text-right text-emerald-700">
                    +{formatETB(calc.totalGrossIncome)}
                  </td>
                  <td className="py-3 px-4 text-right text-red-700">
                    {calc.totalExpenses > 0 ? `-${formatETB(calc.totalExpenses)}` : '0'}
                  </td>
                  <td className="py-3 px-4 text-right text-blue-700 bg-blue-50/30">
                    {formatETB(calc.mesfinNetShare)}
                  </td>
                  <td className="py-3 px-4 text-right text-purple-700 bg-purple-50/30">
                    {formatETB(calc.zewdneshNetShare)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700">
                    +{formatETB(calc.annualNetIncome)}
                  </td>
                  <td className="py-3 px-4 text-center font-sans text-xs">
                    {calc.isReconciled ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ትክክል</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>ልዩነት</span>
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 1: ወርሃዊ የቤት ኪራይ ገቢ (አዲስ አበባ) */}
      <fieldset disabled={effectiveViewOnly} className="contents">
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ወርሃዊ የቤት ኪራይ ገቢ {bilingual && '· Monthly Rental Income'}
            </h2>
          </div>
          {!effectiveViewOnly && (
            <button
              type="button"
              onClick={() => setShowAddTenant(!showAddTenant)}
              className="min-h-[40px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 self-stretch sm:self-auto whitespace-nowrap shrink-0 cursor-pointer no-print"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>አዲስ ተከራይ ጨምር</span>
            </button>
          )}
        </div>

        {showAddTenant && !isViewOnly && (
          <form
            onSubmit={handleCreateTenant}
            className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end no-print"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">የተከራይ ስም</label>
              <input
                type="text"
                required
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="ምሳሌ፡ አበበ"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ዝርዝር</label>
              <input
                type="text"
                value={newTenantDesc}
                onChange={(e) => setNewTenantDesc(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">የክፍፍል ድርሻ</label>
              <select
                value={newTenantRuleCode}
                onChange={(e) => setNewTenantRuleCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {incomeRules.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.labelAm} ({Math.round(r.mesfinRatio * 100)}% / {Math.round(r.zewdneshRatio * 100)}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {activeEditMonth} ኪራይ (ብር)
              </label>
              <input
                type="number"
                required
                min="0"
                value={newTenantRent}
                onChange={(e) => setNewTenantRent(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 cursor-pointer"
              >
                መዝግብ
              </button>
              <button
                type="button"
                onClick={() => setShowAddTenant(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                ሰርዝ
              </button>
            </div>
          </form>
        )}

        {/* Mobile Interactive Touch Cards for Tenants (< 768px unless Full Table toggled) */}
        {!mobileShowFullTable && (
          <div className="md:hidden divide-y divide-slate-200">
            {filteredTenantRows.map((tr) => {
              const matchedCode = getMatchingRuleCodeForRow(
                tr.row.splitType,
                tr.row.mesfinRatio,
                tr.row.zewdneshRatio,
                incomeRules
              );
              return (
                <div key={tr.row.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatDual(tr.row.tenantName, tr.row.tenantNameEn)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{tr.row.description}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onOpenRentReceipt && selectedMonth !== 'ANNUAL' && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            onOpenRentReceipt(
                              tr.row,
                              selectedMonth,
                              tr.gross,
                              tr.mesfinShare,
                              tr.zewdneshShare
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              onOpenRentReceipt(
                                tr.row,
                                selectedMonth,
                                tr.gross,
                                tr.mesfinShare,
                                tr.zewdneshShare
                              );
                            }
                          }}
                          className="min-h-[34px] px-2.5 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 cursor-pointer"
                          title="የኪራይ ደረሰኝ"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>ደረሰኝ</span>
                        </span>
                      )}
                      {!effectiveViewOnly && (
                        <button
                          type="button"
                          onClick={() => onDeleteTenant(tr.row.id)}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-md border border-slate-200 cursor-pointer"
                          title="ተከራይ ሰርዝ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile Rent Input & Split Rule Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        {selectedMonth === 'ANNUAL' ? 'ዓመታዊ ጠቅላላ (+)' : `${selectedMonth} ኪራይ (+ብር)`}
                      </label>
                      {selectedMonth === 'ANNUAL' ? (
                        <div className="min-h-[40px] px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-md font-mono tabular-nums font-bold text-emerald-700 text-sm flex items-center justify-end">
                          +{formatETB(tr.gross)} ብር
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={tr.gross === 0 ? '' : tr.gross}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateTenantAmount(
                              tr.row.id,
                              selectedMonth,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full min-h-[40px] text-right px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-700 rounded-md font-mono tabular-nums font-bold text-emerald-700 text-sm focus:outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        የክፍፍል ድርሻ (Split Rule)
                      </label>
                      <select
                        value={matchedCode}
                        onChange={(e) =>
                          handleSplitSelectChange(
                            tr.row.id,
                            'TENANT',
                            e.target.value,
                            tr.row.mesfinRatio
                          )
                        }
                        className="w-full min-h-[40px] bg-white border border-slate-200 focus:border-blue-600 rounded-md px-2.5 py-2 text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                      >
                        {incomeRules.map((r) => (
                          <option key={r.id} value={r.code}>
                            {r.labelAm}
                          </option>
                        ))}
                        {matchedCode === 'CUSTOM_INLINE' && (
                          <option value="CUSTOM_INLINE">
                            {tr.row.splitLabel} ({Math.round(tr.row.mesfinRatio * 100)}% / {Math.round(tr.row.zewdneshRatio * 100)}%)
                          </option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Partner Share Readout Bar */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                    <div>
                      <span className="font-sans text-[11px] text-blue-700 block">መስፍን (Blue)</span>
                      <span className="font-bold text-blue-700">{formatETB(tr.mesfinShare)}</span>
                    </div>
                    <div>
                      <span className="font-sans text-[11px] text-purple-700 block">ዘውድነሽ (Purple)</span>
                      <span className="font-bold text-purple-700">{formatETB(tr.zewdneshShare)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-sans text-[11px] text-slate-500 block">ዓመታዊ ድምር</span>
                      <span className="font-bold text-emerald-700">+{formatETB(tr.annualGross)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mobile Tenant Summary Footer */}
            <div className="p-4 bg-slate-50 space-y-2 text-xs font-mono tabular-nums">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span className="font-sans">ጠቅላላ የኪራይ ገቢ ድምር:</span>
                <span className="text-emerald-700 text-sm">+{formatETB(calc.totalGrossIncome)} ብር</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-blue-800 font-semibold">የመስፍን ጠቅላላ ገቢ (Blue):</span>
                <span className="text-blue-700 font-bold">{formatETB(calc.mesfinGrossIncome)} ብር</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-purple-800 font-semibold">የዘውድነሽ ጠቅላላ ገቢ (Purple):</span>
                <span className="text-purple-700 font-bold">{formatETB(calc.zewdneshGrossIncome)} ብር</span>
              </div>
            </div>
          </div>
        )}

        <div className={`${mobileShowFullTable ? 'block' : 'hidden md:block'} overflow-x-auto`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                <th className="py-2.5 px-4 font-semibold sticky left-0 z-10 bg-slate-50">ተከራይ</th>
                <th className="py-2.5 px-4 font-semibold">ዝርዝር</th>
                <th className="py-2.5 px-4 font-semibold">የክፍፍል ድርሻ</th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">
                  {selectedMonth === 'ANNUAL' ? 'ጠቅላላ (+)' : `${selectedMonth} ጠቅላላ (+)`}
                </th>
                <th className="py-2.5 px-4 font-semibold text-right text-blue-700">
                  {selectedMonth === 'ANNUAL' ? 'መስፍን' : `${selectedMonth} መስፍን`}
                </th>
                <th className="py-2.5 px-4 font-semibold text-right text-purple-700">
                  {selectedMonth === 'ANNUAL' ? 'ዘውድነሽ' : `${selectedMonth} ዘውድነሽ`}
                </th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">ዓመታዊ ድምር (+)</th>
                <th className="py-2.5 px-4 font-semibold text-right text-blue-700">መስፍን ዓመታዊ</th>
                <th className="py-2.5 px-4 font-semibold text-right text-purple-700">ዘውድነሽ ዓመታዊ</th>
                <th className="py-2.5 px-3 font-semibold text-center no-print w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredTenantRows.map((tr) => {
                const matchedCode = getMatchingRuleCodeForRow(
                  tr.row.splitType,
                  tr.row.mesfinRatio,
                  tr.row.zewdneshRatio,
                  incomeRules
                );
                return (
                  <tr key={tr.row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap sticky left-0 z-10 bg-white">
                      {formatDual(tr.row.tenantName, tr.row.tenantNameEn)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {tr.row.description}
                    </td>
                    <td className="py-2 px-4 text-slate-700 whitespace-nowrap">
                      {editingCustomRowId === tr.row.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">መስፍን %:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={customMesfinPct}
                            onChange={(e) => setCustomMesfinPct(e.target.value)}
                            className="w-14 px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyInlineCustomRatio(tr.row.id, 'TENANT')}
                            className="px-2 py-0.5 text-[11px] bg-emerald-700 text-white rounded hover:bg-emerald-800 cursor-pointer"
                          >
                            አጽድቅ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCustomRowId(null)}
                            className="px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            ተው
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-2 bg-slate-100 rounded-xs overflow-hidden flex shrink-0">
                            <div
                              className="bg-blue-600 h-full"
                              style={{ width: `${Math.round(tr.row.mesfinRatio * 100)}%` }}
                            />
                            <div
                              className="bg-purple-600 h-full"
                              style={{ width: `${Math.round(tr.row.zewdneshRatio * 100)}%` }}
                            />
                          </div>
                          <select
                            value={matchedCode}
                            onChange={(e) =>
                              handleSplitSelectChange(
                                tr.row.id,
                                'TENANT',
                                e.target.value,
                                tr.row.mesfinRatio
                              )
                            }
                            className="bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-600 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none cursor-pointer"
                          >
                            {incomeRules.map((r) => (
                              <option key={r.id} value={r.code}>
                                {r.labelAm}
                              </option>
                            ))}
                            {matchedCode === 'CUSTOM_INLINE' && (
                              <option value="CUSTOM_INLINE">
                                {tr.row.splitLabel} ({Math.round(tr.row.mesfinRatio * 100)}% / {Math.round(tr.row.zewdneshRatio * 100)}%)
                              </option>
                            )}
                            <option value="CUSTOM_INLINE">ብጁ መቶኛ (Custom %...)</option>
                          </select>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums">
                      {selectedMonth === 'ANNUAL' ? (
                        <span className="font-semibold text-emerald-700">+{formatETB(tr.gross)}</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={tr.gross === 0 ? '' : tr.gross}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateTenantAmount(
                              tr.row.id,
                              selectedMonth,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 text-right px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-700 rounded font-mono tabular-nums font-semibold text-emerald-700 focus:outline-none"
                        />
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-700 font-medium">
                      {formatETB(tr.mesfinShare)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-purple-700 font-medium">
                      {formatETB(tr.zewdneshShare)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      +{formatETB(tr.annualGross)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-700">
                      {formatETB(tr.annualMesfin)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-purple-700">
                      {formatETB(tr.annualZewdnesh)}
                    </td>
                    <td className="py-2.5 px-3 text-center no-print">
                      <div className="inline-flex items-center justify-center gap-1">
                        {onOpenRentReceipt && selectedMonth !== 'ANNUAL' && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              onOpenRentReceipt(
                                tr.row,
                                selectedMonth,
                                tr.gross,
                                tr.mesfinShare,
                                tr.zewdneshShare
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                onOpenRentReceipt(
                                  tr.row,
                                  selectedMonth,
                                  tr.gross,
                                  tr.mesfinShare,
                                  tr.zewdneshShare
                                );
                              }
                            }}
                            className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-1.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="የኪራይ ደረሰኝ አውጣ (Rent Receipt)"
                          >
                            <FileText className="w-3 h-3" />
                            <span>ደረሰኝ</span>
                          </span>
                        )}
                        {!effectiveViewOnly && (
                          <button
                            type="button"
                            onClick={() => onDeleteTenant(tr.row.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                            title="ተከራይ ሰርዝ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Totals & Partner Share Footer Rows matching exact Excel layout */}
              <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="py-2.5 px-4">ጠቅላላ ድምር</td>
                <td className="py-2.5 px-4"></td>
                <td className="py-2.5 px-4 text-slate-600 font-medium">100% ጠቅላላ ድምር</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatETB(calc.totalGrossIncome)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-700">
                  {formatETB(calc.mesfinGrossIncome)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-purple-700">
                  {formatETB(calc.zewdneshGrossIncome)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatETB(calc.annualGrossIncome)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-700">
                  {formatETB(calc.tenantRows.reduce((s, r) => s + r.annualMesfin, 0))}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-purple-700">
                  {formatETB(calc.tenantRows.reduce((s, r) => s + r.annualZewdnesh, 0))}
                </td>
                <td className="no-print"></td>
              </tr>
              <tr className="bg-blue-50/40 text-blue-950 font-semibold">
                <td className="py-2 px-4">መስፍን</td>
                <td className="py-2 px-4">የመስፍን ጠቅላላ ገቢ</td>
                <td className="py-2 px-4 text-slate-500">የአጋር ድርሻ (Blue)</td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatETB(calc.mesfinGrossIncome)}
                </td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-blue-700">
                  {formatETB(calc.mesfinGrossIncome)}
                </td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-400">0</td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatETB(calc.tenantRows.reduce((s, r) => s + r.annualMesfin, 0))}
                </td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-blue-700">
                  {formatETB(calc.tenantRows.reduce((s, r) => s + r.annualMesfin, 0))}
                </td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-400">0</td>
                <td className="no-print"></td>
              </tr>
              <tr className="bg-purple-50/40 text-purple-950 font-semibold">
                <td className="py-2 px-4">ዘውድነሽ</td>
                <td className="py-2 px-4">የዘውድነሽ ጠቅላላ ገቢ</td>
                <td className="py-2 px-4 text-slate-500">የአጋር ድርሻ (Purple)</td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatETB(calc.zewdneshGrossIncome)}
                </td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-400">0</td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-purple-700">
                  {formatETB(calc.zewdneshGrossIncome)}
                </td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatETB(calc.tenantRows.reduce((s, r) => s + r.annualZewdnesh, 0))}
                </td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-400">0</td>
                <td className="py-2 px-4 text-right font-mono tabular-nums text-purple-700">
                  {formatETB(calc.tenantRows.reduce((s, r) => s + r.annualZewdnesh, 0))}
                </td>
                <td className="no-print"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: ወጪዎች (Property Expenses) */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ወጪዎች {bilingual && '· Property Expenses'}
            </h2>
          </div>
          {!isViewOnly && (
            <button
              type="button"
              onClick={() => setShowAddExpense(!showAddExpense)}
              className="min-h-[40px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 self-stretch sm:self-auto whitespace-nowrap shrink-0 cursor-pointer no-print"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>አዲስ የወጪ መስመር ጨምር</span>
            </button>
          )}
        </div>

        {showAddExpense && !isViewOnly && (
          <form
            onSubmit={handleCreateExpense}
            className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end no-print"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">የወጪ አይነት</label>
              <input
                type="text"
                required
                value={newExpName}
                onChange={(e) => setNewExpName(e.target.value)}
                placeholder="ምሳሌ፡ የጽዳት ክፍያ"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ዝርዝር</label>
              <input
                type="text"
                value={newExpDesc}
                onChange={(e) => setNewExpDesc(e.target.value)}
                placeholder="የአካባቢ ጽዳት"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">የክፍፍል ድርሻ</label>
              <select
                value={newExpRuleCode}
                onChange={(e) => setNewExpRuleCode(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {expenseRules.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.labelAm} ({Math.round(r.mesfinRatio * 100)}% / {Math.round(r.zewdneshRatio * 100)}%)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {activeEditMonth} ወጪ (ብር)
              </label>
              <input
                type="number"
                required
                min="0"
                value={newExpAmount}
                onChange={(e) => setNewExpAmount(e.target.value)}
                placeholder="400"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 cursor-pointer"
              >
                መዝግብ
              </button>
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                ሰርዝ
              </button>
            </div>
          </form>
        )}

        {/* Mobile Interactive Touch Cards for Property Expenses (< 768px unless Full Table toggled) */}
        {!mobileShowFullTable && (
          <div className="md:hidden divide-y divide-slate-200">
            {filteredExpenseRows.map((er) => {
              const matchedCode = getMatchingRuleCodeForRow(
                er.row.splitType,
                er.row.mesfinRatio,
                er.row.zewdneshRatio,
                expenseRules
              );
              return (
                <div key={er.row.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatDual(er.row.expenseType, er.row.expenseTypeEn)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{er.row.description}</div>
                    </div>
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() => onDeletePropertyExpense(er.row.id)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-md border border-slate-200 cursor-pointer"
                        title="የወጪ መስመር ሰርዝ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        {selectedMonth === 'ANNUAL' ? 'ዓመታዊ ወጪ (-ብር)' : `${selectedMonth} ወጪ (-ብር)`}
                      </label>
                      {selectedMonth === 'ANNUAL' ? (
                        <div className="min-h-[40px] px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-md font-mono tabular-nums font-bold text-rose-700 text-sm flex items-center justify-end">
                          {er.totalExpense > 0 ? `-${formatETB(er.totalExpense)}` : '0'} ብር
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={er.totalExpense === 0 ? '' : er.totalExpense}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateExpenseAmount(
                              er.row.id,
                              selectedMonth,
                              Math.abs(parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-full min-h-[40px] text-right px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-rose-600 rounded-md font-mono tabular-nums font-bold text-rose-700 text-sm focus:outline-none"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        የክፍፍል ድርሻ (Split Rule)
                      </label>
                      <select
                        value={matchedCode}
                        onChange={(e) =>
                          handleSplitSelectChange(
                            er.row.id,
                            'EXPENSE',
                            e.target.value,
                            er.row.mesfinRatio
                          )
                        }
                        className="w-full min-h-[40px] bg-white border border-slate-200 focus:border-emerald-700 rounded-md px-2.5 py-2 text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                      >
                        {expenseRules.map((r) => (
                          <option key={r.id} value={r.code}>
                            {r.code === '50_50' ? 'የጋራ (50% - 50%)' : r.labelAm}
                          </option>
                        ))}
                        {matchedCode === 'CUSTOM_INLINE' && (
                          <option value="CUSTOM_INLINE">
                            {er.row.splitLabel} ({Math.round(er.row.mesfinRatio * 100)}% / {Math.round(er.row.zewdneshRatio * 100)}%)
                          </option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                    <div>
                      <span className="font-sans text-[11px] text-blue-700 block">መስፍን ወጪ</span>
                      <span className="font-bold text-slate-700">
                        {er.mesfinExpense > 0 ? `-${formatETB(er.mesfinExpense)}` : '0'}
                      </span>
                    </div>
                    <div>
                      <span className="font-sans text-[11px] text-purple-700 block">ዘውድነሽ ወጪ</span>
                      <span className="font-bold text-slate-700">
                        {er.zewdneshExpense > 0 ? `-${formatETB(er.zewdneshExpense)}` : '0'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-sans text-[11px] text-slate-500 block">ዓመታዊ ወጪ</span>
                      <span className="font-bold text-rose-700">
                        {er.annualExpense > 0 ? `-${formatETB(er.annualExpense)}` : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="p-4 bg-rose-50/40 flex items-center justify-between text-xs font-mono tabular-nums font-bold text-rose-900">
              <span className="font-sans">ጠቅላላ ወርሃዊ ወጪ:</span>
              <span className="text-sm">
                {calc.totalExpenses > 0 ? `-${formatETB(calc.totalExpenses)} ብር` : '0 ብር'}
              </span>
            </div>
          </div>
        )}

        <div className={`${mobileShowFullTable ? 'block' : 'hidden md:block'} overflow-x-auto`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                <th className="py-2.5 px-4 font-semibold sticky left-0 z-10 bg-slate-50">የወጪ አይነት</th>
                <th className="py-2.5 px-4 font-semibold">ዝርዝር</th>
                <th className="py-2.5 px-4 font-semibold">የክፍፍል ድርሻ</th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  {selectedMonth === 'ANNUAL' ? 'ጠቅላላ' : `${selectedMonth} ጠቅላላ`}
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  {selectedMonth === 'ANNUAL' ? 'መስፍን' : `${selectedMonth} መስፍን`}
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">
                  {selectedMonth === 'ANNUAL' ? 'ዘውድነሽ' : `${selectedMonth} ዘውድነሽ`}
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">ዓመታዊ ድምር</th>
                <th className="py-2.5 px-4 font-semibold text-right">መስፍን ዓመታዊ</th>
                <th className="py-2.5 px-4 font-semibold text-right">ዘውድነሽ ዓመታዊ</th>
                <th className="py-2.5 px-3 font-semibold text-center no-print w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredExpenseRows.map((er) => {
                const matchedCode = getMatchingRuleCodeForRow(
                  er.row.splitType,
                  er.row.mesfinRatio,
                  er.row.zewdneshRatio,
                  expenseRules
                );
                return (
                  <tr key={er.row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap sticky left-0 z-10 bg-white">
                      {formatDual(er.row.expenseType, er.row.expenseTypeEn)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {er.row.description}
                    </td>
                    <td className="py-2 px-4 text-slate-700 whitespace-nowrap">
                      {editingCustomRowId === er.row.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">መስፍን %:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={customMesfinPct}
                            onChange={(e) => setCustomMesfinPct(e.target.value)}
                            className="w-14 px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyInlineCustomRatio(er.row.id, 'EXPENSE')}
                            className="px-2 py-0.5 text-[11px] bg-emerald-700 text-white rounded hover:bg-emerald-800 cursor-pointer"
                          >
                            አጽድቅ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCustomRowId(null)}
                            className="px-1.5 py-0.5 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            ተው
                          </button>
                        </div>
                      ) : (
                        <select
                          value={matchedCode}
                          onChange={(e) =>
                            handleSplitSelectChange(
                              er.row.id,
                              'EXPENSE',
                              e.target.value,
                              er.row.mesfinRatio
                            )
                          }
                          className="bg-transparent border border-transparent hover:border-slate-300 focus:border-emerald-700 rounded px-1.5 py-0.5 text-xs text-slate-700 focus:outline-none cursor-pointer"
                        >
                          {expenseRules.map((r) => (
                            <option key={r.id} value={r.code}>
                              {r.code === '50_50' ? 'የጋራ (50% - 50%)' : r.labelAm}
                            </option>
                          ))}
                          {matchedCode === 'CUSTOM_INLINE' && (
                            <option value="CUSTOM_INLINE">
                              {er.row.splitLabel} ({Math.round(er.row.mesfinRatio * 100)}% / {Math.round(er.row.zewdneshRatio * 100)}%)
                            </option>
                          )}
                          <option value="CUSTOM_INLINE">ብጁ መቶኛ (Custom %...)</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums">
                      {selectedMonth === 'ANNUAL' ? (
                        <span className="font-semibold text-rose-700">
                          {er.totalExpense > 0 ? `-${formatETB(er.totalExpense)}` : '0'}
                        </span>
                      ) : (
                        <div className="inline-flex items-center">
                          <span className="text-rose-700 mr-1 font-bold">-</span>
                          <input
                            type="number"
                            min="0"
                            value={er.totalExpense === 0 ? '' : er.totalExpense}
                            placeholder="0"
                            onChange={(e) =>
                              onUpdateExpenseAmount(
                                er.row.id,
                                selectedMonth,
                                Math.abs(parseFloat(e.target.value) || 0)
                              )
                            }
                            className="w-20 text-right px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-700 rounded font-mono tabular-nums font-semibold text-rose-700 focus:outline-none"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {er.mesfinExpense > 0 ? `-${formatETB(er.mesfinExpense)}` : '0'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {er.zewdneshExpense > 0 ? `-${formatETB(er.zewdneshExpense)}` : '0'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-rose-700">
                      {er.annualExpense > 0 ? `-${formatETB(er.annualExpense)}` : '0'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                      {er.annualMesfinExpense > 0 ? `-${formatETB(er.annualMesfinExpense)}` : '0'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                      {er.annualZewdneshExpense > 0 ? `-${formatETB(er.annualZewdneshExpense)}` : '0'}
                    </td>
                    <td className="py-2.5 px-3 text-center no-print">
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => onDeletePropertyExpense(er.row.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                          title="የወጪ መስመር ሰርዝ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Expense Total Row */}
              <tr className="bg-rose-50/40 font-bold text-rose-900 border-t-2 border-slate-300">
                <td className="py-2.5 px-4">ጠቅላላ ወርሃዊ ወጪ</td>
                <td className="py-2.5 px-4"></td>
                <td className="py-2.5 px-4">ጠቅላላ ወጪ</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {calc.totalExpenses > 0 ? `-${formatETB(calc.totalExpenses)}` : '0'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {calc.mesfinExpenses > 0 ? `-${formatETB(calc.mesfinExpenses)}` : '0'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {calc.zewdneshExpenses > 0 ? `-${formatETB(calc.zewdneshExpenses)}` : '0'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  {calc.annualTotalExpenses > 0 ? `-${formatETB(calc.annualTotalExpenses)}` : '0'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  -{formatETB(calc.expenseRows.reduce((s, r) => s + r.annualMesfinExpense, 0))}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                  -{formatETB(calc.expenseRows.reduce((s, r) => s + r.annualZewdneshExpense, 0))}
                </td>
                <td className="no-print"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      </fieldset>

      {/* Section 3: የተጣራ ገቢ (Net Income & Partner Reconciliation Table) */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            የተጣራ ገቢ እና የክፍፍል ማረጋገጫ {bilingual && '· Net Income & Reconciliation'}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                <th className="py-2.5 px-4 font-semibold">ርዕስ</th>
                <th className="py-2.5 px-4 font-semibold">ዝርዝር</th>
                <th className="py-2.5 px-4 font-semibold">ድርሻ</th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">ጠቅላላ (+)</th>
                <th className="py-2.5 px-4 font-semibold text-right text-blue-700">መስፍን</th>
                <th className="py-2.5 px-4 font-semibold text-right text-purple-700">ዘውድነሽ</th>
                <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">ዓመታዊ ድምር (+)</th>
                <th className="py-2.5 px-4 font-semibold text-right text-blue-700">መስፍን ዓመታዊ</th>
                <th className="py-2.5 px-4 font-semibold text-right text-purple-700">ዘውድነሽ ዓመታዊ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              <tr className="font-bold text-slate-900 bg-slate-50/60">
                <td className="py-3 px-4">የተጣራ ወርሃዊ ገቢ</td>
                <td className="py-3 px-4 text-slate-600 font-normal">የተጣራ የገንዘብ ፍሰት</td>
                <td className="py-3 px-4 text-slate-600 font-normal">ጠቅላላ የተጣራ</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatETB(calc.netIncome)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-700">
                  {formatETB(calc.mesfinNetShare)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-purple-700">
                  {formatETB(calc.zewdneshNetShare)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700">
                  +{formatETB(calc.annualNetIncome)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-700">
                  {formatETB(calc.annualMesfinNet)}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-purple-700">
                  {formatETB(calc.annualZewdneshNet)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-blue-900">መስፍን</td>
                <td className="py-2.5 px-4 text-slate-600">የመስፍን የተጣራ ፍሰት</td>
                <td className="py-2.5 px-4 text-slate-500">የተጣራ ድርሻ (Blue)</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                  +{formatETB(calc.mesfinNetShare)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                  {formatETB(calc.mesfinNetShare)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">0</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                  +{formatETB(calc.annualMesfinNet)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                  {formatETB(calc.annualMesfinNet)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">0</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-purple-900">ዘውድነሽ</td>
                <td className="py-2.5 px-4 text-slate-600">የዘውድነሽ የተጣራ ፍሰት</td>
                <td className="py-2.5 px-4 text-slate-500">የተጣራ ድርሻ (Purple)</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                  +{formatETB(calc.zewdneshNetShare)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">0</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-purple-700">
                  {formatETB(calc.zewdneshNetShare)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                  +{formatETB(calc.annualZewdneshNet)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-400">0</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-purple-700">
                  {formatETB(calc.annualZewdneshNet)}
                </td>
              </tr>
              <tr className="bg-emerald-50/30">
                <td className="py-2.5 px-4 font-semibold text-slate-900">ማረጋገጫ</td>
                <td className="py-2.5 px-4 text-slate-600">የክፍፍል ማረጋገጫ</td>
                <td className="py-2.5 px-4 text-slate-600">የተጣራ = መስፍን + ዘውድነሽ</td>
                <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                  {calc.isReconciled ? 'ትክክል' : 'ልዩነት'}
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                  {calc.isReconciled ? 'ትክክል' : 'ልዩነት'}
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                  {calc.isReconciled ? 'ትክክል' : 'ልዩነት'}
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                  {calc.isReconciled ? 'ትክክል' : 'ልዩነት'}
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                  {calc.isReconciled ? 'ትክክል' : 'ልዩነት'}
                </td>
                <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">
                  {calc.isReconciled ? 'ትክክል' : 'ልዩነት'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-900">ምጣኔ</td>
                <td className="py-2.5 px-4 text-slate-600">የባለቤቶች የተጣራ መቶኛ ክፍፍል</td>
                <td className="py-2.5 px-4 text-slate-600">የመስፍን % / የዘውድነሽ %</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                  {calc.mesfinNetPercent.toFixed(1)}% / {calc.zewdneshNetPercent.toFixed(1)}%
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                  {calc.mesfinNetPercent.toFixed(1)}%
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-purple-700">
                  {calc.zewdneshNetPercent.toFixed(1)}%
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                  {calc.mesfinNetPercent.toFixed(1)}% / {calc.zewdneshNetPercent.toFixed(1)}%
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                  {calc.mesfinNetPercent.toFixed(1)}%
                </td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-purple-700">
                  {calc.zewdneshNetPercent.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
