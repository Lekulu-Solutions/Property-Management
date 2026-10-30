import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Search,
  Copy,
  RotateCcw,
} from 'lucide-react';
import {
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  GroceryItem,
  WorkbookState,
  YearInitMode,
} from '../data/initialLedgerData';
import {
  calculateGroceriesSummary,
  formatETB,
} from '../utils/excelParser';
import { translateTextForMode, useLanguage } from '../utils/i18n';
import { ViewEditRoleToggle } from './ViewEditRoleToggle';

interface GroceriesTrackerSheetProps {
  state: WorkbookState;
  selectedMonth: EthiopianMonth | 'ANNUAL';
  onSelectMonth: (month: EthiopianMonth | 'ANNUAL') => void;
  selectedYear: string;
  yearsList: string[];
  onSelectYear: (year: string) => void;
  onAddYear?: (newYearEC: string, initMode: YearInitMode, sourceYearEC: string) => void;
  onOpenSettings?: () => void;
  bilingual: boolean;
  onUpdateGrocery: (
    id: string,
    field: 'name' | 'category' | 'unit' | 'price' | 'purchased',
    value: string | number | boolean,
    targetMonth?: EthiopianMonth
  ) => void;
  onAddGrocery: (item: Omit<GroceryItem, 'id' | 'index'>, targetMonth?: EthiopianMonth) => void;
  onDeleteGrocery: (id: string, targetMonth?: EthiopianMonth) => void;
  onResetMonthGroceries?: (targetMonth: EthiopianMonth) => void;
  onCopyMonthGroceries?: (fromMonth: EthiopianMonth, toMonth: EthiopianMonth) => void;
  onSyncGroceriesToExpense: (targetMonth?: EthiopianMonth | 'ANNUAL') => void;
  isViewOnly?: boolean;
  onToggleViewOnly?: () => void;
}

const GROCERY_CATEGORIES = [
  'መሰረታዊ ፍጆታ',
  'አትክልት',
  'ጥራጥሬ',
  'ቅመማቅመም',
  'እህልና እህላማ',
  'የዱቄት ውጤቶች',
  'የጓሮ እንክብካቤ',
];

export const GroceriesTrackerSheet: React.FC<GroceriesTrackerSheetProps> = ({
  state,
  selectedMonth,
  onSelectMonth,
  selectedYear,
  yearsList,
  onSelectYear,
  onAddYear,
  onOpenSettings,
  bilingual,
  onUpdateGrocery,
  onAddGrocery,
  onDeleteGrocery,
  onResetMonthGroceries,
  onCopyMonthGroceries,
  onSyncGroceriesToExpense,
  isViewOnly = true,
  onToggleViewOnly,
}) => {
  const { langMode, tr } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PURCHASED' | 'PENDING'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState<EthiopianMonth>('ጥቅምት');

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('መሰረታዊ ፍጆታ');
  const [newUnit, setNewUnit] = useState('ኪሎግራም');
  const [newPrice, setNewPrice] = useState('');
  const [newPurchased, setNewPurchased] = useState(false);

  const activeEditMonth: EthiopianMonth =
    selectedMonth === 'ANNUAL' ? 'ጥቅምት' : selectedMonth;

  const summary = calculateGroceriesSummary(state, selectedMonth);

  const annualSpentById = React.useMemo(() => {
    const map: Record<string, { annualSpent: number; purchasedMonths: number }> = {};
    summary.annualItemRows.forEach((row) => {
      map[row.id] = {
        annualSpent: row.annualSpent,
        purchasedMonths: row.purchasedMonthsCount,
      };
    });
    return map;
  }, [summary.annualItemRows]);

  const filteredItems = summary.items.filter((item) => {
    if (statusFilter === 'PURCHASED' && !item.purchased) return false;
    if (statusFilter === 'PENDING' && item.purchased) return false;
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (
      searchQuery &&
      !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.category.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredAnnualItemRows = summary.annualItemRows.filter((row) => {
    if (statusFilter === 'PURCHASED' && row.purchasedMonthsCount === 0) return false;
    if (statusFilter === 'PENDING' && row.purchasedMonthsCount > 0) return false;
    if (categoryFilter !== 'ALL' && row.category !== categoryFilter) return false;
    if (
      searchQuery &&
      !row.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !row.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !row.category.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const priceVal = parseFloat(newPrice) || 0;
    onAddGrocery(
      {
        name: newName.trim(),
        nameEn: newName.trim(),
        category: newCategory,
        unit: newUnit.trim() || 'ኪሎግራም',
        price: priceVal,
        purchased: newPurchased || priceVal > 0,
      },
      activeEditMonth
    );
    setNewName('');
    setNewPrice('');
    setNewPurchased(false);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Header & Month Selector Bar */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              {tr(
                `የአስቤዛ መከታተያ (${
                  selectedMonth === 'ANNUAL' ? 'ዓመታዊ ድምር' : selectedMonth
                } · ${selectedYear})`,
                `Groceries Tracker (${
                  selectedMonth === 'ANNUAL' ? 'Annual' : selectedMonth
                } · ${selectedYear})`,
                `የአስቤዛ መከታተያ (${
                  selectedMonth === 'ANNUAL' ? 'ዓመታዊ' : selectedMonth
                } · ${selectedYear})`
              )}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            {onToggleViewOnly && (
              <ViewEditRoleToggle isViewOnly={isViewOnly} onToggle={onToggleViewOnly} />
            )}

            {!isViewOnly && (
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{tr('ዕቃ ጨምር', 'Add Item', 'ዕቃ ጨምር')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Month Selector Bar (12 Ethiopian Months + Annual — Exact match to የኪራይ እና ወጪ ክፍፍል) */}
        <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar no-print">
          {ETHIOPIAN_MONTHS.map((m) => {
            const monthSeriesItem = summary.monthlySeries.find((ms) => ms.month === m.id);
            const monthHasData =
              (monthSeriesItem?.totalSpent || 0) > 0 ||
              (monthSeriesItem?.purchasedCount || 0) > 0;
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

        {/* Responsive 4-Column Summary Grid (Left-Aligned) */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-3.5 flex flex-col items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {selectedMonth === 'ANNUAL' ? 'ዓመታዊ ጠቅላላ ወጪ' : 'የወሩ ጠቅላላ ወጪ'}
            </span>
            <div className="text-lg font-mono tabular-nums font-bold text-emerald-800 mt-1">
              {formatETB(summary.totalSpent)}{' '}
              <span className="text-xs font-normal text-slate-500">ብር</span>
            </div>
          </div>

          <div className="p-3.5 flex flex-col items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">የተገዙ ዕቃዎች</span>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {summary.purchasedCount} / {summary.totalItems}
            </div>
          </div>

          <div className="p-3.5 flex flex-col items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">ያልተገዙ / ቀሪ</span>
            <div className="text-lg font-mono tabular-nums font-bold text-amber-800 mt-1">
              {summary.unpurchasedCount}{' '}
              <span className="text-xs font-normal text-slate-500">ቀሪ</span>
            </div>
          </div>

          <div className="p-3.5 flex flex-col items-start justify-between bg-slate-50/60">
            <span className="text-xs font-semibold text-slate-600">ዓመታዊ ድምር (12 ወራት)</span>
            <div className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
              {formatETB(summary.annualTotalSpent)}{' '}
              <span className="text-xs font-normal text-slate-500">ብር</span>
            </div>
          </div>
        </div>
      </section>

      {/* ANNUAL SUMMARY VIEW: 12-Month Breakdown Table when selectedMonth === 'ANNUAL' */}
      {selectedMonth === 'ANNUAL' && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ወርሃዊ የአስቤዛ ወጪ ማጠቃለያ — 12 ወራት ({state.yearEC})
              </h2>
              <p className="text-xs text-slate-500">
                እያንዳንዱ ወር የራሱ አዲስ የአስቤዛ መዝገብ አለው። ወሩን በመጫን የወሩን ዝርዝር ይክፈቱ።
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-bold text-emerald-800">
              ዓመታዊ ድምር: {formatETB(summary.annualTotalSpent)} ብር
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-4 font-semibold w-12">#</th>
                  <th className="py-2.5 px-4 font-semibold">ወር (Month)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">ጠቅላላ ዕቃዎች</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">የተገዙ</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-amber-700">ያልተገዙ</th>
                  <th className="py-2.5 px-4 font-semibold text-right">የወሩ አስቤዛ ወጪ (ብር)</th>
                  <th className="py-2.5 px-4 font-semibold text-center no-print">ድርጊት</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summary.monthlySeries.map((ms, idx) => (
                  <tr
                    key={ms.month}
                    className={`hover:bg-slate-50 transition-colors ${
                      ms.totalSpent > 0 ? 'bg-emerald-50/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => onSelectMonth(ms.month)}
                        className="hover:text-emerald-700 hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{ms.labelAm}</span>
                        {bilingual && (
                          <span className="text-[11px] font-normal text-slate-400">
                            ({ms.labelEn})
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {ms.totalItems}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      {ms.purchasedCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-amber-700">
                      {ms.unpurchasedCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {ms.totalSpent > 0 ? `${formatETB(ms.totalSpent)} ብር` : '0'}
                    </td>
                    <td className="py-2 px-4 text-center no-print">
                      <button
                        type="button"
                        onClick={() => onSelectMonth(ms.month)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        ወሩን ክፈት
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3 px-4" colSpan={2}>
                    ዓመታዊ ጠቅላላ ድምር ({state.yearEC})
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {summary.annualTotalItems}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                    {summary.annualPurchasedCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-800">
                    {summary.annualTotalItems - summary.annualPurchasedCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                    {formatETB(summary.annualTotalSpent)} ብር
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Filter Bar & Monthly / Annual Item Table */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            {/* Status Segmented Filter */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 sm:py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ሁሉም ({summary.totalItems})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PURCHASED')}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 sm:py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'PURCHASED'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ተገዝቷል ({summary.purchasedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`min-h-[36px] sm:min-h-0 px-3 py-1.5 sm:py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'PENDING'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                አልተገዛም ({summary.unpurchasedCount})
              </button>
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-h-[40px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              <option value="ALL">ሁሉም ምድቦች (All Categories)</option>
              {GROCERY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Per-Month Quick Actions: Copy from Month & Reset Month as New */}
            {selectedMonth !== 'ANNUAL' && !isViewOnly && (
              <div className="flex flex-wrap items-center gap-1.5">
                {onCopyMonthGroceries && (
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
                      onClick={() => onCopyMonthGroceries(copySourceMonth, selectedMonth)}
                      className="px-2 py-0.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                      title={`የ${copySourceMonth} ዝርዝርን ወደ ${selectedMonth} ቅዳ`}
                    >
                      <Copy className="w-3 h-3" />
                      <span>ቅዳ</span>
                    </button>
                  </div>
                )}

                {onResetMonthGroceries && (
                  <button
                    type="button"
                    onClick={() => onResetMonthGroceries(selectedMonth)}
                    className="min-h-[36px] sm:min-h-0 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                    title={`የ${selectedMonth} ወርን እንደ አዲስ (0 ብር / አልተገዛም) አጽዳ`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>እንደ አዲስ አጽዳ</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="relative w-full lg:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="የዕቃ ስም ወይም ምድብ ፈልግ..."
              className="w-full min-h-[40px] sm:min-h-0 pl-8 pr-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        {showAddForm && !isViewOnly && (
          <form
            onSubmit={handleAddSubmit}
            className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end no-print"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                የዕቃው ዝርዝር ({activeEditMonth})
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="ምሳሌ፡ ቡና"
                className="w-full px-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ምድብ</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              >
                {GROCERY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">መለኪያ</label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="ኪሎግራም"
                className="w-full px-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ዋጋ (ብር)</label>
              <input
                type="number"
                min="0"
                value={newPrice}
                onChange={(e) => {
                  setNewPrice(e.target.value);
                  if (parseFloat(e.target.value) > 0) setNewPurchased(true);
                }}
                placeholder="0"
                className="w-full px-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-initial min-h-[38px] sm:min-h-0 px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 cursor-pointer"
              >
                መዝግብ
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 sm:flex-initial min-h-[38px] sm:min-h-0 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                ሰርዝ
              </button>
            </div>
          </form>
        )}

        {/* VIEW A: 12-Month Matrix when selectedMonth === 'ANNUAL' */}
        {selectedMonth === 'ANNUAL' ? (
          <fieldset disabled={isViewOnly} className="contents">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-3 font-semibold w-10 sticky left-0 bg-slate-50 z-10">
                      ተ.ቁ
                    </th>
                    <th className="py-2.5 px-3 font-semibold sticky left-10 bg-slate-50 z-10 min-w-[140px]">
                      የዕቃው ዝርዝር
                    </th>
                    <th className="py-2.5 px-3 font-semibold">ምድብ</th>
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
                    <th className="py-2.5 px-3.5 font-bold text-right text-emerald-800 bg-emerald-50/40 whitespace-nowrap">
                      ዓመታዊ ድምር
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAnnualItemRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        row.annualSpent > 0 ? 'bg-emerald-50/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-mono tabular-nums text-slate-400 sticky left-0 bg-white z-10">
                        {row.index || idx + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 sticky left-10 bg-white z-10 whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{row.category}</td>
                      {ETHIOPIAN_MONTHS.map((m) => {
                        const isBought = row.monthlyPurchased[m.id];
                        const priceVal = row.monthlyPrices[m.id] || 0;
                        return (
                          <td
                            key={m.id}
                            className="py-1.5 px-2 text-right font-mono tabular-nums"
                          >
                            <input
                              type="number"
                              min="0"
                              value={isBought && priceVal > 0 ? priceVal : ''}
                              placeholder="-"
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                onUpdateGrocery(row.id, 'price', val, m.id);
                                onUpdateGrocery(row.id, 'purchased', val > 0, m.id);
                              }}
                              className={`w-18 text-right px-1.5 py-1 rounded border text-xs font-mono tabular-nums focus:outline-none ${
                                isBought && priceVal > 0
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 font-semibold'
                                  : 'bg-slate-50/60 border-slate-200 text-slate-500 hover:bg-white focus:bg-white focus:border-emerald-700'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="py-2 px-3.5 text-right font-mono tabular-nums font-bold text-emerald-800 bg-emerald-50/20 whitespace-nowrap">
                        {row.annualSpent > 0 ? formatETB(row.annualSpent) : '0'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-3 sticky left-0 bg-slate-50 z-10" colSpan={3}>
                      ወርሃዊ እና ዓመታዊ ጠቅላላ ድምር ({state.yearEC})
                    </td>
                    {summary.monthlySeries.map((ms) => (
                      <td
                        key={ms.month}
                        className="py-3 px-2 text-right font-mono tabular-nums text-emerald-800"
                      >
                        {ms.totalSpent > 0 ? formatETB(ms.totalSpent) : '0'}
                      </td>
                    ))}
                    <td className="py-3 px-3.5 text-right font-mono tabular-nums text-emerald-900 bg-emerald-100/50">
                      {formatETB(summary.annualTotalSpent)} ብር
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </fieldset>
        ) : (
          /* VIEW B: Single Selected Month Checklist (መስከረም .. ነሐሴ) */
          <fieldset disabled={isViewOnly} className="contents">
            {/* Mobile Interactive Touch Cards (< 768px) */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredItems.map((item, idx) => {
                const itemAnnual = annualSpentById[item.id]?.annualSpent || 0;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 space-y-2.5 transition-colors ${
                      item.purchased ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGrocery(
                              item.id,
                              'purchased',
                              !item.purchased,
                              selectedMonth
                            )
                          }
                          aria-label={item.purchased ? 'ተገዝቷል' : 'አልተገዛም'}
                          className={`min-h-[42px] min-w-[42px] rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            item.purchased
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-slate-300 text-slate-400'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono tabular-nums text-slate-400">
                              #{item.index || idx + 1}
                            </span>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                onUpdateGrocery(
                                  item.id,
                                  'name',
                                  e.target.value,
                                  selectedMonth
                                )
                              }
                              className="w-full bg-transparent border border-transparent focus:border-emerald-700 focus:bg-white rounded px-1.5 py-0.5 text-sm font-bold text-slate-900 focus:outline-none"
                            />
                          </div>
                          {langMode !== 'AM' && (
                            <span className="text-[11px] text-slate-400 px-1.5 block truncate">
                              {item.nameEn && item.nameEn !== item.name
                                ? item.nameEn
                                : translateTextForMode(item.name, 'EN')}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => onDeleteGrocery(item.id, selectedMonth)}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-md border border-slate-200 shrink-0 cursor-pointer"
                          title="ሰርዝ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center pt-1">
                      <select
                        value={item.category}
                        onChange={(e) =>
                          onUpdateGrocery(
                            item.id,
                            'category',
                            e.target.value,
                            selectedMonth
                          )
                        }
                        className="col-span-5 min-h-[38px] bg-white border border-slate-200 focus:border-emerald-700 rounded-md px-2 py-1.5 text-xs text-slate-700 focus:outline-none cursor-pointer"
                      >
                        {GROCERY_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          onUpdateGrocery(item.id, 'unit', e.target.value, selectedMonth)
                        }
                        className="col-span-3 min-h-[38px] bg-white border border-slate-200 focus:border-emerald-700 rounded-md px-2 py-1.5 text-xs text-slate-600 focus:outline-none"
                      />

                      <div className="col-span-4 relative">
                        <input
                          type="number"
                          min="0"
                          value={item.price === 0 ? '' : item.price}
                          placeholder="ዋጋ (0)"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            onUpdateGrocery(item.id, 'price', val, selectedMonth);
                            if (val > 0 && !item.purchased) {
                              onUpdateGrocery(item.id, 'purchased', true, selectedMonth);
                            }
                          }}
                          className="w-full min-h-[38px] text-right px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-700 rounded-md font-mono tabular-nums font-bold text-xs text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    {itemAnnual > 0 && (
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>ዓመታዊ ድምር ({state.yearEC}):</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-700">
                          {formatETB(itemAnnual)} ብር
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="p-4 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-900">
                <span>
                  የ{selectedMonth} ጠቅላላ ወጪ ({summary.purchasedCount} ተገዝቷል):
                </span>
                <span className="font-mono tabular-nums text-emerald-800 text-sm">
                  {formatETB(summary.totalSpent)} ብር
                </span>
              </div>
            </div>

            {/* Tablet & Desktop Full Table (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-4 font-semibold w-14">ተ.ቁ</th>
                    <th className="py-2.5 px-4 font-semibold">የዕቃው ዝርዝር</th>
                    <th className="py-2.5 px-4 font-semibold">ምድብ</th>
                    <th className="py-2.5 px-4 font-semibold">መለኪያ</th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      {selectedMonth} ዋጋ (ብር)
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-center">
                      {selectedMonth} ሁኔታ
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">
                      ዓመታዊ ድምር ({state.yearEC})
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center no-print w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredItems.map((item, idx) => {
                    const itemAnnual = annualSpentById[item.id]?.annualSpent || 0;
                    const itemMonths = annualSpentById[item.id]?.purchasedMonths || 0;
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          item.purchased ? 'bg-emerald-50/15' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500">
                          {item.index || idx + 1}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                onUpdateGrocery(
                                  item.id,
                                  'name',
                                  e.target.value,
                                  selectedMonth
                                )
                              }
                              className="bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-700 focus:bg-white rounded px-1.5 py-1 font-semibold text-slate-900 focus:outline-none"
                            />
                            {langMode !== 'AM' && (
                              <span className="text-slate-400">
                                ·{' '}
                                {item.nameEn && item.nameEn !== item.name
                                  ? item.nameEn
                                  : translateTextForMode(item.name, 'EN')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-slate-600">
                          <select
                            value={item.category}
                            onChange={(e) =>
                              onUpdateGrocery(
                                item.id,
                                'category',
                                e.target.value,
                                selectedMonth
                              )
                            }
                            className="bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-700 rounded px-1.5 py-1 text-slate-700 focus:outline-none cursor-pointer"
                          >
                            {GROCERY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) =>
                                onUpdateGrocery(
                                  item.id,
                                  'unit',
                                  e.target.value,
                                  selectedMonth
                                )
                              }
                              className="w-20 bg-transparent border border-transparent hover:border-slate-200 focus:border-emerald-700 focus:bg-white rounded px-1.5 py-1 text-slate-600 focus:outline-none"
                            />
                            {langMode !== 'AM' && (
                              <span className="text-[11px] text-slate-400">
                                ({translateTextForMode(item.unit, 'EN')})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums">
                          <input
                            type="number"
                            min="0"
                            value={item.price === 0 ? '' : item.price}
                            placeholder="-"
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateGrocery(item.id, 'price', val, selectedMonth);
                              if (val > 0 && !item.purchased) {
                                onUpdateGrocery(item.id, 'purchased', true, selectedMonth);
                              }
                            }}
                            className="w-24 text-right px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-700 rounded font-mono tabular-nums font-semibold text-slate-900 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateGrocery(
                                item.id,
                                'purchased',
                                !item.purchased,
                                selectedMonth
                              )
                            }
                            className={`px-3 py-1 text-xs font-medium rounded border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                              item.purchased
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {item.purchased && (
                              <Check className="w-3 h-3 text-emerald-700" />
                            )}
                            <span>{item.purchased ? 'ተገዝቷል' : 'አልተገዛም'}</span>
                          </button>
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600">
                          {itemAnnual > 0 ? (
                            <span className="font-semibold text-slate-900">
                              {formatETB(itemAnnual)}{' '}
                              <span className="text-[11px] font-normal text-slate-400">
                                ({itemMonths} ወር)
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center no-print">
                          {!isViewOnly && (
                            <button
                              type="button"
                              onClick={() => onDeleteGrocery(item.id, selectedMonth)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                              title="ሰርዝ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-4" colSpan={4}>
                      የ{selectedMonth} ጠቅላላ ድምር (Monthly Purchased Expenditure)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                      {formatETB(summary.totalSpent)} ብር
                    </td>
                    <td className="py-3 px-4 text-center font-normal text-slate-600">
                      {summary.purchasedCount} ተገዝቷል · {summary.unpurchasedCount} አልተገዛም
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {formatETB(summary.annualTotalSpent)} ብር
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
