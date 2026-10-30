import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Search,
  Copy,
  RotateCcw,
  Droplets,
  FileText,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  WaterRecordItem,
  WorkbookState,
  YearInitMode,
} from '../data/initialLedgerData';
import {
  calculateWaterSummary,
  formatETB,
  ComputedWaterRow,
} from '../utils/excelParser';
import { translateTextForMode, useLanguage } from '../utils/i18n';
import { ViewEditRoleToggle } from './ViewEditRoleToggle';

interface WaterTrackerSheetProps {
  state: WorkbookState;
  selectedMonth: EthiopianMonth | 'ANNUAL';
  onSelectMonth: (month: EthiopianMonth | 'ANNUAL') => void;
  selectedYear: string;
  yearsList: string[];
  onSelectYear: (year: string) => void;
  onAddYear?: (newYearEC: string, initMode: YearInitMode, sourceYearEC: string) => void;
  onOpenSettings?: () => void;
  bilingual: boolean;
  onUpdateWaterRate: (newRate: number) => void;
  onUpdateWaterRecord: (
    id: string,
    field: 'name' | 'week1' | 'week2' | 'week3' | 'week4' | 'amountPaid' | 'depositOverride',
    value: string | number | null,
    targetMonth?: EthiopianMonth
  ) => void;
  onAddWaterMember: (
    item: Omit<WaterRecordItem, 'id' | 'index'>,
    targetMonth?: EthiopianMonth
  ) => void;
  onDeleteWaterMember: (id: string, targetMonth?: EthiopianMonth) => void;
  onResetMonthWater?: (targetMonth: EthiopianMonth) => void;
  onCopyMonthWater?: (fromMonth: EthiopianMonth, toMonth: EthiopianMonth) => void;
  onSyncWaterToExpense?: (targetMonth?: EthiopianMonth | 'ANNUAL') => void;
  isViewOnly?: boolean;
  onToggleViewOnly?: () => void;
  isMonthClosed?: boolean;
  onOpenWaterReceipt?: (row: ComputedWaterRow, month: EthiopianMonth, rate: number) => void;
}

export const WaterTrackerSheet: React.FC<WaterTrackerSheetProps> = ({
  state,
  selectedMonth,
  onSelectMonth,
  selectedYear,
  yearsList,
  onSelectYear,
  onAddYear,
  onOpenSettings,
  bilingual,
  onUpdateWaterRate,
  onUpdateWaterRecord,
  onAddWaterMember,
  onDeleteWaterMember,
  onResetMonthWater,
  onCopyMonthWater,
  onSyncWaterToExpense,
  isViewOnly = true,
  onToggleViewOnly,
  isMonthClosed = false,
  onOpenWaterReceipt,
}) => {
  const effectiveViewOnly = isViewOnly || isMonthClosed;
  const { langMode, tr } = useLanguage();
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'CREDIT' | 'OWING'>('ALL');
  const [annualViewMode, setAnnualViewMode] = useState<'MEMBER_MATRIX' | 'MONTHLY_SUMMARY'>(
    'MEMBER_MATRIX'
  );
  const [annualMatrixMetric, setAnnualMatrixMetric] = useState<
    'USAGE' | 'DUE' | 'PAID' | 'BALANCE'
  >('USAGE');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState<EthiopianMonth>('መስከረም');

  // New Member Form State
  const [newName, setNewName] = useState('');
  const [newWeek1, setNewWeek1] = useState('');
  const [newWeek2, setNewWeek2] = useState('');
  const [newWeek3, setNewWeek3] = useState('');
  const [newWeek4, setNewWeek4] = useState('');
  const [newAmountPaid, setNewAmountPaid] = useState('');

  const activeEditMonth: EthiopianMonth =
    selectedMonth === 'ANNUAL' ? 'መስከረም' : selectedMonth;

  const summary = calculateWaterSummary(state, selectedMonth);

  const selectedMonthIdx =
    selectedMonth === 'ANNUAL'
      ? -1
      : ETHIOPIAN_MONTHS.findIndex((m) => m.id === selectedMonth);
  const previousMonthObj =
    selectedMonthIdx > 0 ? ETHIOPIAN_MONTHS[selectedMonthIdx - 1] : null;

  const filteredRows = summary.rows.filter((row) => {
    if (balanceFilter === 'CREDIT' && row.nextMonthBalance < 0) return false;
    if (balanceFilter === 'OWING' && row.nextMonthBalance >= 0) return false;
    if (
      searchQuery &&
      !row.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !row.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredAnnualMemberRows = summary.annualMemberRows.filter((row) => {
    if (balanceFilter === 'CREDIT' && row.yearEndBalance < 0) return false;
    if (balanceFilter === 'OWING' && row.yearEndBalance >= 0) return false;
    if (
      searchQuery &&
      !row.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !row.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddWaterMember(
      {
        name: newName.trim(),
        nameEn: newName.trim(),
        week1: parseFloat(newWeek1) || 0,
        week2: parseFloat(newWeek2) || 0,
        week3: parseFloat(newWeek3) || 0,
        week4: parseFloat(newWeek4) || 0,
        amountPaid: parseFloat(newAmountPaid) || 0,
        depositOverride: null,
      },
      activeEditMonth
    );
    setNewName('');
    setNewWeek1('');
    setNewWeek2('');
    setNewWeek3('');
    setNewWeek4('');
    setNewAmountPaid('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Header, Standard Rate & Month Selector Bar */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Droplets className="w-5 h-5 text-sky-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              {tr(
                `የውሃ ፍጆታ እና ክፍያ (${
                  selectedMonth === 'ANNUAL' ? 'ዓመታዊ ድምር' : selectedMonth
                } · ${selectedYear})`,
                `Water Tracker (${
                  selectedMonth === 'ANNUAL' ? 'Annual' : selectedMonth
                } · ${selectedYear})`,
                `የውሃ ክፍያ / Water (${
                  selectedMonth === 'ANNUAL' ? 'ዓመታዊ' : selectedMonth
                } · ${selectedYear})`
              )}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            {isMonthClosed && selectedMonth !== 'ANNUAL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                {tr('ወሩ ተዘግቷል (Closed)', 'Month Reconciled')}
              </span>
            )}
            {onToggleViewOnly && (
              <ViewEditRoleToggle isViewOnly={effectiveViewOnly} onToggle={onToggleViewOnly} />
            )}

            {/* Compact Rate Input */}
            <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 rounded-md px-2.5 py-1 text-xs">
              <span className="font-semibold text-sky-950 whitespace-nowrap">
                {tr('ታሪፍ:', 'Rate:', 'ታሪፍ / Rate:')}
              </span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                disabled={effectiveViewOnly}
                readOnly={effectiveViewOnly}
                value={summary.ratePerUnit}
                onChange={(e) => {
                  if (effectiveViewOnly) return;
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) {
                    onUpdateWaterRate(val);
                  }
                }}
                aria-label="Standard Rate per Total Unit"
                className="w-12 px-1 py-0.5 text-xs font-mono tabular-nums font-bold text-center bg-white border border-sky-300 rounded text-sky-950 focus:outline-none focus:border-sky-600 disabled:bg-transparent disabled:border-transparent disabled:cursor-default"
              />
              <span className="font-semibold text-sky-900 whitespace-nowrap">
                {tr('ብር/ዙር', 'ETB/Unit', 'ብር/ዙር')}
              </span>
            </div>

            {!effectiveViewOnly && (
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('ተጠቃሚ ጨምር', 'Add Member', 'ተጠቃሚ ጨምር / Add')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Month Selector Bar (12 Ethiopian Months + Annual Summary Bar: መስከረም – ነሐሴ | ዓመታዊ ድምር) */}
        <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar no-print">
          {ETHIOPIAN_MONTHS.map((m) => {
            const monthSeriesItem = summary.monthlySeries.find((ms) => ms.month === m.id);
            const monthHasData = Boolean(monthSeriesItem?.hasActivity);
            const isSelected = selectedMonth === m.id;
            return (
              <button
                key={m.id}
                type="button"
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
            type="button"
            onClick={() => onSelectMonth('ANNUAL')}
            className={`min-h-[38px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedMonth === 'ANNUAL'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            ዓመታዊ ድምር
          </button>
        </div>

        {/* 5-Column Summary Strip (Left-Aligned, Concise, Zero Duplication) */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-3.5 flex flex-col items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {tr('ጠቅላላ ዙር', 'Total Usage', 'ጠቅላላ ዙር / Usage')}
            </span>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {formatETB(summary.totalUsage)}{' '}
              <span className="text-xs font-normal text-slate-500">
                {tr('ዙር', 'Units', 'ዙር')}
              </span>
            </div>
          </div>

          <div className="p-3.5 flex flex-col items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {tr('ጠቅላላ ክፍያ', 'Payment Due', 'ጠቅላላ ክፍያ / Due')}
            </span>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {formatETB(summary.totalPaymentDue)}{' '}
              <span className="text-xs font-normal text-slate-500">
                {tr('ብር', 'ETB', 'ብር')}
              </span>
            </div>
          </div>

          <div className="p-3.5 flex flex-col items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {tr('የተቀመጠ ክፍያ', 'Deposit', 'የተቀመጠ ክፍያ / Deposit')}
            </span>
            <div
              className={`text-lg font-mono tabular-nums font-bold mt-1 ${
                summary.totalInstallmentDeposit < 0 ? 'text-rose-700' : 'text-sky-800'
              }`}
            >
              {formatETB(summary.totalInstallmentDeposit, true)}{' '}
              <span className="text-xs font-normal text-slate-500">
                {tr('ብር', 'ETB', 'ብር')}
              </span>
            </div>
          </div>

          <div className="p-3.5 flex flex-col items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {tr('የተከፈለው ገንዘብ', 'Amount Paid', 'የተከፈለው ገንዘብ / Paid')}
            </span>
            <div className="text-lg font-mono tabular-nums font-bold text-emerald-800 mt-1">
              {formatETB(summary.totalAmountPaid)}{' '}
              <span className="text-xs font-normal text-slate-500">
                {tr('ብር', 'ETB', 'ብር')}
              </span>
            </div>
          </div>

          <div className="p-3.5 col-span-2 sm:col-span-1 flex flex-col items-start justify-between bg-slate-50/60">
            <span className="text-xs font-semibold text-slate-600">
              {tr('ለሚቀጥለው ወር ቀሪ', 'Next Month Balance', 'ለሚቀጥለው ወር ቀሪ / Balance')}
            </span>
            <div
              className={`text-lg font-mono tabular-nums font-bold mt-1 ${
                summary.totalNextMonthBalance < 0
                  ? 'text-rose-700'
                  : summary.totalNextMonthBalance > 0
                  ? 'text-emerald-800'
                  : 'text-slate-900'
              }`}
            >
              {formatETB(summary.totalNextMonthBalance, summary.totalNextMonthBalance > 0)}{' '}
              <span className="text-xs font-normal text-slate-500">
                {tr('ብር', 'ETB', 'ብር')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Monthly Water Table OR Annual View */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Filter & Action Toolbar */}
        <div className="p-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 no-print">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            {/* Annual View Mode Switcher (Member Matrix vs 12-Month Breakdown) */}
            {selectedMonth === 'ANNUAL' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setAnnualViewMode('MEMBER_MATRIX')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    annualViewMode === 'MEMBER_MATRIX'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tr('በተጠቃሚ', 'By Member', 'በተጠቃሚ / Members')}
                </button>
                <button
                  type="button"
                  onClick={() => setAnnualViewMode('MONTHLY_SUMMARY')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                    annualViewMode === 'MONTHLY_SUMMARY'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tr('በወር (12 ወራት)', 'By Month (12M)', 'በወር / 12 Months')}
                </button>
              </div>
            )}

            {/* Balance Status Segmented Filter */}
            {(selectedMonth !== 'ANNUAL' || annualViewMode === 'MEMBER_MATRIX') && (
              <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setBalanceFilter('ALL')}
                  className={`min-h-[34px] sm:min-h-0 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    balanceFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tr('ሁሉም', 'All', 'ሁሉም')} ({summary.totalMembers})
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('CREDIT')}
                  className={`min-h-[34px] sm:min-h-0 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    balanceFilter === 'CREDIT'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tr('ትርፍ (+ / 0)', 'Credit (+ / 0)', 'ትርፍ (+ / 0)')}
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('OWING')}
                  className={`min-h-[34px] sm:min-h-0 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    balanceFilter === 'OWING'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tr('ዕዳ (-)', 'Owing (-)', 'ዕዳ (-)')}
                </button>
              </div>
            )}

            {/* Annual Matrix Metric Selector (when in ANNUAL Member Matrix view) */}
            {selectedMonth === 'ANNUAL' && annualViewMode === 'MEMBER_MATRIX' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                {(
                  [
                    ['USAGE', tr('ዙር', 'Usage', 'ዙር')],
                    ['DUE', tr('ክፍያ', 'Due', 'ክፍያ')],
                    ['PAID', tr('የተከፈለ', 'Paid', 'የተከፈለ')],
                    ['BALANCE', tr('ቀሪ', 'Balance', 'ቀሪ')],
                  ] as const
                ).map(([mKey, mLabel]) => (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => setAnnualMatrixMetric(mKey)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                      annualMatrixMetric === mKey
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mLabel}
                  </button>
                ))}
              </div>
            )}

            {/* Per-Month Quick Actions: Copy from Month & Reset Month as New */}
            {selectedMonth !== 'ANNUAL' && !isViewOnly && (
              <div className="flex flex-wrap items-center gap-1.5">
                {onCopyMonthWater && (
                  <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-1 gap-1.5">
                    <select
                      value={copySourceMonth}
                      onChange={(e) => setCopySourceMonth(e.target.value as EthiopianMonth)}
                      aria-label="ከየትኛው ወር ይቀዳ"
                      className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                    >
                      {ETHIOPIAN_MONTHS.filter((m) => m.id !== selectedMonth).map((m) => (
                        <option key={m.id} value={m.id}>
                          ከ{m.labelAm}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onCopyMonthWater(copySourceMonth, selectedMonth)}
                      className="px-2 py-0.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                      title={`የ${copySourceMonth} ሳምንታዊ ዙሮችን ወደ ${selectedMonth} ቅዳ`}
                    >
                      <Copy className="w-3 h-3" />
                      <span>{tr('ቅዳ', 'Copy', 'ቅዳ')}</span>
                    </button>
                  </div>
                )}

                {onResetMonthWater && (
                  <button
                    type="button"
                    onClick={() => onResetMonthWater(selectedMonth)}
                    className="min-h-[34px] sm:min-h-0 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                    title={`የ${selectedMonth} ወርን እንደ አዲስ አጽዳ`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{tr('አጽዳ', 'Reset', 'አጽዳ')}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {(selectedMonth !== 'ANNUAL' || annualViewMode === 'MEMBER_MATRIX') && (
            <div className="relative w-full lg:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr('ስም ፈልግ...', 'Search name...', 'ስም ፈልግ / Search...')}
                className="w-full min-h-[36px] sm:min-h-0 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-emerald-700"
              />
            </div>
          )}
        </div>

        {/* Inline Add Member Form */}
        {showAddForm && !isViewOnly && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-7 gap-2.5 items-end no-print"
          >
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                ስም / Name ({activeEditMonth})
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ምሳሌ፡ በላይነሽ"
                className="w-full px-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ሳምንት 1</label>
              <input
                type="number"
                min="0"
                value={newWeek1}
                onChange={(e) => setNewWeek1(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ሳምንት 2</label>
              <input
                type="number"
                min="0"
                value={newWeek2}
                onChange={(e) => setNewWeek2(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ሳምንት 3</label>
              <input
                type="number"
                min="0"
                value={newWeek3}
                onChange={(e) => setNewWeek3(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ሳምንት 4</label>
              <input
                type="number"
                min="0"
                value={newWeek4}
                onChange={(e) => setNewWeek4(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700 mb-1">የተከፈለ</label>
                <input
                  type="number"
                  min="0"
                  value={newAmountPaid}
                  onChange={(e) => setNewAmountPaid(e.target.value)}
                  placeholder="0"
                  className="w-full px-2.5 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="min-h-[34px] px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 cursor-pointer shrink-0"
              >
                መዝግብ
              </button>
            </div>
          </form>
        )}

        {/* VIEW A: Annual Consolidated View (either Member Matrix or 12-Month Breakdown) */}
        {selectedMonth === 'ANNUAL' ? (
          annualViewMode === 'MONTHLY_SUMMARY' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                    <th className="py-2.5 px-3 font-semibold w-10">#</th>
                    <th className="py-2.5 px-3 font-semibold">
                      {tr('ወር', 'Month', 'ወር / Month')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      {tr('ሳምንት 1', 'Week 1', 'ሳምንት 1')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      {tr('ሳምንት 2', 'Week 2', 'ሳምንት 2')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      {tr('ሳምንት 3', 'Week 3', 'ሳምንት 3')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      {tr('ሳምንት 4', 'Week 4', 'ሳምንት 4')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-slate-900">
                      {tr('ጠቅላላ ዙር', 'Total Usage', 'ጠቅላላ ዙር')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-slate-900">
                      {tr('ጠቅላላ ክፍያ', 'Payment Due', 'ጠቅላላ ክፍያ')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-sky-800">
                      {tr('የተቀመጠ ክፍያ', 'Deposit', 'የተቀመጠ ክፍያ')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right text-emerald-800">
                      {tr('የተከፈለው ገንዘብ', 'Amount Paid', 'የተከፈለው ገንዘብ')}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      {tr('ለሚቀጥለው ወር ቀሪ', 'Balance', 'ለሚቀጥለው ወር ቀሪ')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.monthlySeries.map((ms, idx) => (
                    <tr
                      key={ms.month}
                      onClick={() => onSelectMonth(ms.month)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        ms.hasActivity ? 'bg-emerald-50/10' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 hover:text-emerald-700">
                        {ms.labelAm}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {ms.totalWeek1}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {ms.totalWeek2}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {ms.totalWeek3}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {ms.totalWeek4}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatETB(ms.totalUsage)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatETB(ms.totalPaymentDue)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                          ms.totalInstallmentDeposit < 0 ? 'text-rose-700' : 'text-sky-800'
                        }`}
                      >
                        {formatETB(ms.totalInstallmentDeposit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                        {formatETB(ms.totalAmountPaid)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                          ms.totalNextMonthBalance < 0
                            ? 'text-rose-700'
                            : ms.totalNextMonthBalance > 0
                            ? 'text-emerald-800'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatETB(ms.totalNextMonthBalance)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-3" colSpan={2}>
                      {tr('ጠቅላላ', 'Total', 'ጠቅላላ / Total')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {summary.annualTotalWeek1}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {summary.annualTotalWeek2}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {summary.annualTotalWeek3}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {summary.annualTotalWeek4}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                      {formatETB(summary.annualTotalUsage)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                      {formatETB(summary.annualTotalPaymentDue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-sky-800">
                      {formatETB(summary.annualInitialDeposit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-800">
                      {formatETB(summary.annualTotalAmountPaid)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono tabular-nums ${
                        summary.annualYearEndBalance < 0 ? 'text-rose-700' : 'text-emerald-800'
                      }`}
                    >
                      {formatETB(summary.annualYearEndBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-3 font-semibold w-10 sticky left-0 bg-slate-50 z-10">
                      #
                    </th>
                    <th className="py-2.5 px-3 font-semibold sticky left-10 bg-slate-50 z-10 min-w-[130px]">
                      {tr('ስም', 'Name', 'ስም / Name')}
                    </th>
                    {ETHIOPIAN_MONTHS.map((m) => (
                      <th
                        key={m.id}
                        onClick={() => onSelectMonth(m.id)}
                        className="py-2.5 px-2.5 font-semibold text-right cursor-pointer hover:text-emerald-700 whitespace-nowrap"
                        title={`${m.labelAm} ወርን ክፈት`}
                      >
                        {m.labelAm}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 font-bold text-right text-slate-900 bg-slate-100/70 whitespace-nowrap">
                      {tr('ጠቅላላ ዙር', 'Total Usage', 'ጠቅላላ ዙር')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right text-slate-900 bg-slate-100/70 whitespace-nowrap">
                      {tr('ጠቅላላ ክፍያ', 'Payment Due', 'ጠቅላላ ክፍያ')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right text-emerald-800 bg-emerald-50/40 whitespace-nowrap">
                      {tr('የተከፈለ', 'Paid', 'የተከፈለ')}
                    </th>
                    <th className="py-2.5 px-3.5 font-bold text-right text-sky-900 bg-sky-50/40 whitespace-nowrap">
                      {tr('የዓመቱ መጨረሻ ቀሪ', 'Year-End Balance', 'የዓመቱ መጨረሻ ቀሪ')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAnnualMemberRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400 sticky left-0 bg-white z-10">
                        {row.index || idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 sticky left-10 bg-white z-10 whitespace-nowrap">
                        {row.name}
                      </td>
                      {ETHIOPIAN_MONTHS.map((m) => {
                        const val =
                          annualMatrixMetric === 'USAGE'
                            ? row.monthlyUsage[m.id]
                            : annualMatrixMetric === 'DUE'
                            ? row.monthlyDue[m.id]
                            : annualMatrixMetric === 'PAID'
                            ? row.monthlyPaid[m.id]
                            : row.monthlyBalance[m.id];
                        return (
                          <td
                            key={m.id}
                            onClick={() => onSelectMonth(m.id)}
                            className={`py-2 px-2.5 text-right font-mono tabular-nums cursor-pointer hover:bg-slate-100 ${
                              annualMatrixMetric === 'BALANCE'
                                ? val < 0
                                  ? 'text-rose-700 font-semibold'
                                  : val > 0
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-slate-400'
                                : val > 0
                                ? 'text-slate-900 font-medium'
                                : 'text-slate-400'
                            }`}
                          >
                            {formatETB(val)}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50/60">
                        {formatETB(row.annualTotalUsage)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50/60">
                        {formatETB(row.annualTotalPaymentDue)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-800 bg-emerald-50/20">
                        {formatETB(row.annualTotalAmountPaid)}
                      </td>
                      <td
                        className={`py-2.5 px-3.5 text-right font-mono tabular-nums font-bold bg-sky-50/20 ${
                          row.yearEndBalance < 0 ? 'text-rose-700' : 'text-emerald-800'
                        }`}
                      >
                        {formatETB(row.yearEndBalance)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-3 sticky left-0 bg-slate-50 z-10" colSpan={2}>
                      {tr('ጠቅላላ', 'Total', 'ጠቅላላ / Total')}
                    </td>
                    {summary.monthlySeries.map((ms) => {
                      const colTotal =
                        annualMatrixMetric === 'USAGE'
                          ? ms.totalUsage
                          : annualMatrixMetric === 'DUE'
                          ? ms.totalPaymentDue
                          : annualMatrixMetric === 'PAID'
                          ? ms.totalAmountPaid
                          : ms.totalNextMonthBalance;
                      return (
                        <td
                          key={ms.month}
                          className={`py-3 px-2.5 text-right font-mono tabular-nums ${
                            colTotal < 0 ? 'text-rose-700' : 'text-slate-900'
                          }`}
                        >
                          {formatETB(colTotal)}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatETB(summary.annualTotalUsage)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {formatETB(summary.annualTotalPaymentDue)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-800">
                      {formatETB(summary.annualTotalAmountPaid)}
                    </td>
                    <td
                      className={`py-3 px-3.5 text-right font-mono tabular-nums ${
                        summary.annualYearEndBalance < 0 ? 'text-rose-700' : 'text-emerald-800'
                      }`}
                    >
                      {formatETB(summary.annualYearEndBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* VIEW B: Single Selected Month Interactive Table (መስከረም .. ነሐሴ) */
          <fieldset disabled={effectiveViewOnly} className="contents">
            {/* Mobile Interactive Cards (< 768px) */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredRows.map((row, idx) => (
                <div key={row.id} className="p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-mono tabular-nums font-bold text-slate-400">
                        #{row.index || idx + 1}
                      </span>
                      <input
                        type="text"
                        readOnly={effectiveViewOnly}
                        value={row.name}
                        onChange={(e) =>
                          onUpdateWaterRecord(row.id, 'name', e.target.value, selectedMonth)
                        }
                        className="w-full bg-transparent border border-transparent focus:border-emerald-700 focus:bg-white rounded px-1.5 py-0.5 text-sm font-bold text-slate-900 focus:outline-none disabled:cursor-default"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onOpenWaterReceipt && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            onOpenWaterReceipt(row, selectedMonth, summary.ratePerUnit)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              onOpenWaterReceipt(row, selectedMonth, summary.ratePerUnit);
                            }
                          }}
                          className="min-h-[34px] px-2.5 flex items-center justify-center gap-1 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-md border border-sky-200 cursor-pointer"
                          title={tr('የውሃ ክፍያ ደረሰኝ', 'Water Payment Slip')}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{tr('ደረሰኝ', 'Slip')}</span>
                        </span>
                      )}
                      {!effectiveViewOnly && (
                        <button
                          type="button"
                          onClick={() => onDeleteWaterMember(row.id, selectedMonth)}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-md border border-slate-200 shrink-0 cursor-pointer"
                          title="ሰርዝ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4 Weekly Inputs */}
                  <div className="grid grid-cols-4 gap-2">
                    {(['week1', 'week2', 'week3', 'week4'] as const).map((wKey, wIdx) => (
                      <div key={wKey}>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          ሳምንት {wIdx + 1}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={row[wKey] === 0 ? '' : row[wKey]}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateWaterRecord(
                              row.id,
                              wKey,
                              parseFloat(e.target.value) || 0,
                              selectedMonth
                            )
                          }
                          className="w-full px-2 py-1.5 text-right text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-700 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Totals & Payment Inputs */}
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="bg-slate-50 rounded p-2 flex items-center justify-between">
                      <span className="text-slate-500">ጠቅላላ ዙር:</span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {formatETB(row.totalUsage)}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded p-2 flex items-center justify-between">
                      <span className="text-slate-500">ክፍያ (×{summary.ratePerUnit}):</span>
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {formatETB(row.totalPaymentDue)} ብር
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-sky-800 mb-0.5">
                        የተቀመጠ ክፍያ (Deposit)
                      </label>
                      <input
                        type="number"
                        value={row.installmentDeposit}
                        onChange={(e) => {
                          const raw = e.target.value;
                          onUpdateWaterRecord(
                            row.id,
                            'depositOverride',
                            raw === '' ? null : parseFloat(raw) || 0,
                            selectedMonth
                          );
                        }}
                        className="w-full px-2 py-1.5 text-right text-xs font-mono tabular-nums bg-sky-50/60 border border-sky-200 rounded text-sky-950 font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-emerald-800 mb-0.5">
                        የተከፈለው ገንዘብ (Paid)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={row.amountPaid === 0 ? '' : row.amountPaid}
                        placeholder="0"
                        onChange={(e) =>
                          onUpdateWaterRecord(
                            row.id,
                            'amountPaid',
                            parseFloat(e.target.value) || 0,
                            selectedMonth
                          )
                        }
                        className="w-full px-2 py-1.5 text-right text-xs font-mono tabular-nums bg-emerald-50/50 border border-emerald-200 rounded text-emerald-950 font-semibold focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-600">
                      ለሚቀጥለው ወር የሚሸጋገር ቀሪ:
                    </span>
                    <span
                      className={`font-mono tabular-nums font-bold text-sm ${
                        row.nextMonthBalance < 0
                          ? 'text-rose-700'
                          : row.nextMonthBalance > 0
                          ? 'text-emerald-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {formatETB(row.nextMonthBalance)} ብር
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Full Table (>= 768px) — Clean Single-Line Headers */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                    <th className="py-2.5 px-3 font-semibold w-10">#</th>
                    <th className="py-2.5 px-3 font-semibold min-w-[130px] whitespace-nowrap">
                      {tr('ስም', 'Name', 'ስም / Name')}
                    </th>
                    <th className="py-2.5 px-2.5 font-semibold text-right whitespace-nowrap">
                      {tr('ሳምንት 1', 'Week 1', 'ሳምንት 1 / W1')}
                    </th>
                    <th className="py-2.5 px-2.5 font-semibold text-right whitespace-nowrap">
                      {tr('ሳምንት 2', 'Week 2', 'ሳምንት 2 / W2')}
                    </th>
                    <th className="py-2.5 px-2.5 font-semibold text-right whitespace-nowrap">
                      {tr('ሳምንት 3', 'Week 3', 'ሳምንት 3 / W3')}
                    </th>
                    <th className="py-2.5 px-2.5 font-semibold text-right whitespace-nowrap">
                      {tr('ሳምንት 4', 'Week 4', 'ሳምንት 4 / W4')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right text-slate-900 bg-slate-100/70 whitespace-nowrap">
                      {tr('ጠቅላላ ዙር', 'Total Usage', 'ጠቅላላ ዙር / Usage')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right text-slate-900 bg-slate-100/70 whitespace-nowrap">
                      {tr('ጠቅላላ ክፍያ', 'Payment Due', 'ጠቅላላ ክፍያ / Due')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right text-sky-900 bg-sky-50/50 whitespace-nowrap">
                      {tr('የተቀመጠ ክፍያ', 'Deposit', 'የተቀመጠ ክፍያ / Deposit')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-right text-emerald-900 bg-emerald-50/50 whitespace-nowrap">
                      {tr('የተከፈለው ገንዘብ', 'Amount Paid', 'የተከፈለው ገንዘብ / Paid')}
                    </th>
                    <th className="py-2.5 px-3.5 font-bold text-right text-slate-900 bg-slate-100/70 whitespace-nowrap">
                      {tr('ለሚቀጥለው ወር ቀሪ', 'Next Month Balance', 'ለሚቀጥለው ወር ቀሪ / Balance')}
                    </th>
                    <th className="py-2.5 px-2.5 font-semibold text-center w-10 no-print"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-400">
                        {row.index || idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) =>
                            onUpdateWaterRecord(
                              row.id,
                              'name',
                              e.target.value,
                              selectedMonth
                            )
                          }
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-700 focus:bg-white rounded px-1.5 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                        />
                        {langMode !== 'AM' && (
                          <span className="text-[11px] font-normal text-slate-400 px-1.5 block">
                            {row.nameEn && row.nameEn !== row.name
                              ? row.nameEn
                              : translateTextForMode(row.name, 'EN')}
                          </span>
                        )}
                      </td>

                      {/* Week 1 .. Week 4 */}
                      {(['week1', 'week2', 'week3', 'week4'] as const).map((wKey) => (
                        <td key={wKey} className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={row[wKey] === 0 ? '' : row[wKey]}
                            placeholder="0"
                            onChange={(e) =>
                              onUpdateWaterRecord(
                                row.id,
                                wKey,
                                parseFloat(e.target.value) || 0,
                                selectedMonth
                              )
                            }
                            className="w-18 text-right bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-700 rounded px-2 py-1 text-xs font-mono tabular-nums font-semibold text-slate-900 focus:outline-none"
                          />
                        </td>
                      ))}

                      {/* Total Usage (ጠቅላላ ዙር) */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50/50">
                        {formatETB(row.totalUsage)}
                      </td>

                      {/* Total Payment Due (ጠቅላላ ክፍያ = ዙር × [ 2 ብር ]) */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900 bg-slate-50/50">
                        {formatETB(row.totalPaymentDue)}
                      </td>

                      {/* Installment Deposit (የተቀመጠ ክፍያ) */}
                      <td className="py-2 px-3 text-right bg-sky-50/20">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={row.installmentDeposit}
                            onChange={(e) => {
                              const raw = e.target.value;
                              onUpdateWaterRecord(
                                row.id,
                                'depositOverride',
                                raw === '' ? null : parseFloat(raw) || 0,
                                selectedMonth
                              );
                            }}
                            title={
                              selectedMonthIdx > 0
                                ? `ከ${previousMonthObj?.labelAm} የተሸጋገረ: ${row.carriedOverDeposit} ብር`
                                : 'የወሩ መነሻ ተቀማጭ ክፍያ'
                            }
                            className={`w-20 text-right border rounded px-2 py-1 text-xs font-mono tabular-nums font-semibold focus:outline-none ${
                              row.installmentDeposit < 0
                                ? 'bg-rose-50/60 border-rose-200 text-rose-700'
                                : 'bg-sky-50/60 border-sky-200 text-sky-900 focus:bg-white focus:border-sky-600'
                            }`}
                          />
                          {row.hasCustomDeposit && selectedMonthIdx > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateWaterRecord(
                                  row.id,
                                  'depositOverride',
                                  null,
                                  selectedMonth
                                )
                              }
                              title={`ወደ ራስ-ሰር የተሸጋገረ ዋጋ (${row.carriedOverDeposit}) መልስ`}
                              className="text-[10px] text-sky-700 hover:text-sky-950 underline cursor-pointer"
                            >
                              auto
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Amount Paid (የተከፈለው ገንዘብ) */}
                      <td className="py-2 px-3 text-right bg-emerald-50/20">
                        <div className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            value={row.amountPaid === 0 ? '' : row.amountPaid}
                            placeholder="0"
                            onChange={(e) =>
                              onUpdateWaterRecord(
                                row.id,
                                'amountPaid',
                                parseFloat(e.target.value) || 0,
                                selectedMonth
                              )
                            }
                            className="w-20 text-right bg-white border border-emerald-200 focus:border-emerald-700 rounded px-2 py-1 text-xs font-mono tabular-nums font-bold text-emerald-900 focus:outline-none"
                          />
                          {!effectiveViewOnly && row.nextMonthBalance < 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateWaterRecord(
                                  row.id,
                                  'amountPaid',
                                  Math.max(0, row.totalPaymentDue - row.installmentDeposit),
                                  selectedMonth
                                )
                              }
                              title={tr(
                                `ሙሉ እዳ (${formatETB(Math.max(0, row.totalPaymentDue - row.installmentDeposit))} ብር) ክፈል`,
                                'Settle full balance due'
                              )}
                              className="px-1.5 py-1 rounded bg-emerald-700 text-white text-[10px] font-bold hover:bg-emerald-800 cursor-pointer flex items-center gap-0.5 shrink-0"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{tr('ክፈል', 'Pay')}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Next Month Deposit / Balance (ለሚቀጥለው ወር የሚሸጋገር ቀሪ) */}
                      <td
                        className={`py-2 px-3.5 text-right font-mono tabular-nums font-bold bg-slate-50/50 ${
                          row.nextMonthBalance < 0
                            ? 'text-rose-700'
                            : row.nextMonthBalance > 0
                            ? 'text-emerald-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {formatETB(row.nextMonthBalance)}
                      </td>

                      <td className="py-2 px-2.5 text-center no-print">
                        <div className="inline-flex items-center justify-center gap-1">
                          {onOpenWaterReceipt && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                onOpenWaterReceipt(row, selectedMonth, summary.ratePerUnit)
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  onOpenWaterReceipt(row, selectedMonth, summary.ratePerUnit);
                                }
                              }}
                              className="text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded px-1.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title={tr('የውሃ ክፍያ ደረሰኝ አውጣ', 'Print / Share Water Slip')}
                            >
                              <FileText className="w-3 h-3" />
                              <span>{tr('ደረሰኝ', 'Slip')}</span>
                            </span>
                          )}
                          {!effectiveViewOnly && (
                            <button
                              type="button"
                              onClick={() => onDeleteWaterMember(row.id, selectedMonth)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                              title="ሰርዝ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Total / ጠቅላላ Row */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-3" colSpan={2}>
                      {tr('ጠቅላላ', 'Total', 'ጠቅላላ / Total')}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {formatETB(summary.totalWeek1)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {formatETB(summary.totalWeek2)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {formatETB(summary.totalWeek3)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono tabular-nums">
                      {formatETB(summary.totalWeek4)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums bg-slate-200/60">
                      {formatETB(summary.totalUsage)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums bg-slate-200/60">
                      {formatETB(summary.totalPaymentDue)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono tabular-nums ${
                        summary.totalInstallmentDeposit < 0 ? 'text-rose-700' : 'text-sky-900'
                      }`}
                    >
                      {formatETB(summary.totalInstallmentDeposit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-800">
                      {formatETB(summary.totalAmountPaid)}
                    </td>
                    <td
                      className={`py-3 px-3.5 text-right font-mono tabular-nums bg-slate-200/60 ${
                        summary.totalNextMonthBalance < 0
                          ? 'text-rose-700'
                          : summary.totalNextMonthBalance > 0
                          ? 'text-emerald-800'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatETB(summary.totalNextMonthBalance)}
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </fieldset>
        )}
      </section>
    </div>
  );
};
