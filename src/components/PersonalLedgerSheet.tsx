import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Search,
} from 'lucide-react';
import {
  LedgerEntry,
  WorkbookState,
} from '../data/initialLedgerData';
import {
  calculateMesfinSummary,
  calculateZewdneshSummary,
  formatETB,
} from '../utils/excelParser';
import { translateTextForMode, useLanguage } from '../utils/i18n';
import { ViewEditRoleToggle } from './ViewEditRoleToggle';

interface PersonalLedgerSheetProps {
  owner: 'MESFIN' | 'ZEWDNESH';
  state: WorkbookState;
  bilingual: boolean;
  onUpdateEntry: (
    target: 'mesfinIncome' | 'mesfinExpenses' | 'zewdneshDeposits' | 'zewdneshExpenses',
    id: string,
    field: 'dateOrMonth' | 'description' | 'amount',
    value: string | number
  ) => void;
  onAddEntry: (
    target: 'mesfinIncome' | 'mesfinExpenses' | 'zewdneshDeposits' | 'zewdneshExpenses',
    entry: Omit<LedgerEntry, 'id'>
  ) => void;
  onDeleteEntry: (
    target: 'mesfinIncome' | 'mesfinExpenses' | 'zewdneshDeposits' | 'zewdneshExpenses',
    id: string
  ) => void;
  onSyncMesfinTikimt?: () => void;
  isViewOnly?: boolean;
  onToggleViewOnly?: () => void;
}

export const PersonalLedgerSheet: React.FC<PersonalLedgerSheetProps> = ({
  owner,
  state,
  bilingual,
  onUpdateEntry,
  onAddEntry,
  onDeleteEntry,
  isViewOnly = true,
  onToggleViewOnly,
}) => {
  const { langMode, tr } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [newIncDate, setNewIncDate] = useState('');
  const [newIncDesc, setNewIncDesc] = useState('');
  const [newIncAmount, setNewIncAmount] = useState('');

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpDate, setNewExpDate] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');

  const isMesfin = owner === 'MESFIN';
  const incomeKey = isMesfin ? 'mesfinIncome' : 'zewdneshDeposits';
  const expenseKey = isMesfin ? 'mesfinExpenses' : 'zewdneshExpenses';

  const incomeRows = isMesfin ? state.mesfinIncome : state.zewdneshDeposits;
  const expenseRows = isMesfin ? state.mesfinExpenses : state.zewdneshExpenses;

  const mesfinCalc = calculateMesfinSummary(state);
  const zewdneshCalc = calculateZewdneshSummary(state);

  const totalIn = isMesfin ? mesfinCalc.totalIncome : zewdneshCalc.totalDeposit;
  const totalOut = isMesfin ? mesfinCalc.totalExpense : zewdneshCalc.totalExpense;
  const netBalance = isMesfin ? mesfinCalc.netBalance : zewdneshCalc.netBalance;

  const retainedPct = totalIn > 0 ? Math.max(0, Math.min(100, (netBalance / totalIn) * 100)) : 0;
  const spentPct = totalIn > 0 ? Math.max(0, Math.min(100, (totalOut / totalIn) * 100)) : 0;

  // Partner identity tokens: Mesfin = Blue, Zewdnesh = Purple
  const partnerAccentText = isMesfin ? 'text-blue-700' : 'text-purple-700';
  const partnerAccentBg = isMesfin ? 'bg-blue-600' : 'bg-purple-600';
  const partnerAccentBtn = isMesfin
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-purple-600 hover:bg-purple-700 text-white';
  const partnerFocusBorder = isMesfin
    ? 'focus:border-blue-600'
    : 'focus:border-purple-600';
  const partnerSoftTint = isMesfin
    ? 'bg-blue-50/40 text-blue-950'
    : 'bg-purple-50/40 text-purple-950';

  const filteredIncomes = incomeRows.filter(
    (r) =>
      r.dateOrMonth.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExpenses = expenseRows.filter(
    (r) =>
      r.dateOrMonth.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncDate.trim() && !newIncDesc.trim()) return;
    onAddEntry(incomeKey, {
      dateOrMonth: newIncDate.trim() || (isMesfin ? 'ኅዳር 2019' : 'ተጨማሪ'),
      description: newIncDesc.trim() || (isMesfin ? 'የቤት ኪራይ ገቢ' : 'ተጨማሪ ተቀማጭ'),
      category: isMesfin ? 'የቤት ኪራይ' : 'ተቀማጭ',
      amount: parseFloat(newIncAmount) || 0,
    });
    setNewIncDate('');
    setNewIncDesc('');
    setNewIncAmount('');
    setShowAddIncome(false);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpDesc.trim()) return;
    onAddEntry(expenseKey, {
      dateOrMonth: newExpDate.trim() || (isMesfin ? 'ጥቅምት 2019' : 'የተከፈለ'),
      description: newExpDesc.trim(),
      category: 'ወጪ',
      amount: parseFloat(newExpAmount) || 0,
    });
    setNewExpDate('');
    setNewExpDesc('');
    setNewExpAmount('');
    setShowAddExpense(false);
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Header & Summary Card */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3.5 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-xs inline-block shrink-0 ${partnerAccentBg}`} />
              <span>
                {isMesfin
                  ? tr(
                      'የመስፍን ገቢ እና ወጪ መዝገብ',
                      "Mesfin's Income & Expense Ledger",
                      "የመስፍን ገቢ እና ወጪ መዝገብ (Mesfin's Ledger)"
                    )
                  : tr(
                      'የዘውድነሽ ተቀማጭ እና ወጪ መዝገብ',
                      "Zewdnesh's Deposit & Expense Ledger",
                      "የዘውድነሽ ተቀማጭ እና ወጪ መዝገብ (Zewdnesh's Ledger)"
                    )}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            {onToggleViewOnly && (
              <ViewEditRoleToggle isViewOnly={isViewOnly} onToggle={onToggleViewOnly} />
            )}

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="በቀን ወይም በዝርዝር ፈልግ..."
                className={`w-full min-h-[40px] sm:min-h-0 pl-8 pr-3 py-2 sm:py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none ${partnerFocusBorder}`}
              />
            </div>
          </div>
        </div>

        {/* 3-Column Summary Grid + Utilization Bar (Green = Positive Income/Gain, Red = Negative Expense/Loss) */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            {/* Positive Financial Indicator: Total Income / Deposit (Green) */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-slate-500">
                {isMesfin ? 'ጠቅላላ ገቢ (Total Income)' : 'ጠቅላላ ተቀማጭ (Total Deposit)'}
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                  +{formatETB(totalIn)}
                </span>
                <span className="text-xs text-slate-500">ብር</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                {incomeRows.filter((r) => r.amount > 0).length} ንቁ መዝገቦች · {incomeRows.filter((r) => r.amount === 0).length} ወደፊት የሚሞሉ
              </span>
            </div>

            {/* Negative Financial Indicator: Total Expense (Red) */}
            <div className="p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs font-medium text-slate-500">
                ጠቅላላ ወጪ (Total Expense)
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono tabular-nums text-red-700">
                  -{formatETB(totalOut)}
                </span>
                <span className="text-xs text-slate-500">ብር</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                {expenseRows.length} የወጪ መዝገቦች ({spentPct.toFixed(1)}% ጥቅም ላይ የዋለ)
              </span>
            </div>

            {/* Net Remaining Balance (Partner Identity Tint + Green/Red Financial Sign) */}
            <div className={`p-4 sm:p-5 flex flex-col justify-between ${partnerSoftTint}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">
                  የተጣራ ቀሪ ሂሳብ (Net Remaining Balance)
                </span>
                <span className={`text-[11px] font-bold ${partnerAccentText}`}>
                  {isMesfin ? 'መስፍን (Blue)' : 'ዘውድነሽ (Purple)'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {netBalance >= 0 ? `+${formatETB(netBalance)}` : formatETB(netBalance)}
                </span>
                <span className="text-xs opacity-75">ብር</span>
              </div>
              <span className="text-[11px] opacity-80 mt-2 font-mono tabular-nums">
                ቀሪ ምጣኔ: {retainedPct.toFixed(1)}% (+{formatETB(totalIn)} - {formatETB(totalOut)})
              </span>
            </div>
          </div>

          {/* Visual Utilization vs Remaining Bar */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-4 text-xs">
            <span className="text-slate-500 whitespace-nowrap">የሂሳብ ምጣኔ:</span>
            <div className="flex-1 min-w-[120px] h-2 bg-slate-200 rounded-xs overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-200"
                style={{ width: `${retainedPct}%` }}
                title={`ቀሪ ሂሳብ (+): ${retainedPct.toFixed(1)}%`}
              />
              <div
                className="bg-red-600 h-full transition-all duration-200"
                style={{ width: `${spentPct}%` }}
                title={`ወጪ (-): ${spentPct.toFixed(1)}%`}
              />
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums text-[11px] shrink-0">
              <span className="text-emerald-700 font-semibold">+ቀሪ {retainedPct.toFixed(1)}%</span>
              <span className="text-slate-300">·</span>
              <span className="text-red-700 font-semibold">-ወጪ {spentPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Split for Income/Deposit Table & Expense Table (Stacks on mobile/tablet, side-by-side on xl) */}
      <fieldset disabled={isViewOnly} className="contents">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Left 6 cols: Income / Deposit Ledger (Positive Financial = Green) */}
          <section className="xl:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isMesfin
                    ? 'የገቢ መዝገብ (የኪራይ እና ተጨማሪ ገቢዎች)'
                    : 'የተቀማጭ መዝገብ (የመጀመሪያ ተቀማጭ እና ተጨማሪ ገቢዎች)'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  ድምር: <strong className="font-mono tabular-nums text-emerald-700">+{formatETB(totalIn)} ብር</strong>
                </p>
              </div>
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={() => setShowAddIncome(!showAddIncome)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer no-print ${partnerAccentBtn}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isMesfin ? 'ገቢ ጨምር' : 'ተቀማጭ ጨምር'}</span>
                </button>
              )}
            </div>

            {showAddIncome && !isViewOnly && (
            <form
              onSubmit={handleCreateIncome}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end no-print"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ቀን / ወር</label>
                <input
                  type="text"
                  required
                  value={newIncDate}
                  onChange={(e) => setNewIncDate(e.target.value)}
                  placeholder={isMesfin ? 'ኅዳር 2019' : 'ጥቅምት 2019'}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ዝርዝር</label>
                <input
                  type="text"
                  required
                  value={newIncDesc}
                  onChange={(e) => setNewIncDesc(e.target.value)}
                  placeholder={isMesfin ? 'የቤት ኪራይ ገቢ' : 'ተጨማሪ ተቀማጭ'}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex items-end gap-1.5">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">መጠን (ብር)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newIncAmount}
                    onChange={(e) => setNewIncAmount(e.target.value)}
                    placeholder="25000"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          )}

          {/* Mobile Touch Cards for Income / Deposit (< 640px) */}
          <div className="sm:hidden divide-y divide-slate-200">
            {filteredIncomes.map((item) => (
              <div key={item.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={item.dateOrMonth}
                    onChange={(e) =>
                      onUpdateEntry(incomeKey, item.id, 'dateOrMonth', e.target.value)
                    }
                    className={`flex-1 min-h-[38px] bg-slate-50 border border-slate-200 ${partnerFocusBorder} focus:bg-white rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none`}
                  />
                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(incomeKey, item.id)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-md border border-slate-200 cursor-pointer"
                      title="ሰርዝ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      onUpdateEntry(incomeKey, item.id, 'description', e.target.value)
                    }
                    className={`col-span-7 min-h-[38px] bg-white border border-slate-200 ${partnerFocusBorder} rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none`}
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.amount === 0 ? '' : item.amount}
                    placeholder="ወደፊት"
                    onChange={(e) =>
                      onUpdateEntry(
                        incomeKey,
                        item.id,
                        'amount',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className={`col-span-5 min-h-[38px] text-right px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-700 rounded-md font-mono tabular-nums font-bold text-xs ${
                      item.amount > 0 ? 'text-emerald-700' : 'text-slate-900'
                    } focus:outline-none`}
                  />
                </div>
              </div>
            ))}
            <div className="p-3.5 bg-emerald-50/40 flex items-center justify-between text-xs font-bold text-slate-900">
              <span>{isMesfin ? 'ድምር (ጠቅላላ ገቢ)' : 'ድምር (ጠቅላላ ተቀማጭ)'}</span>
              <span className="font-mono tabular-nums text-emerald-700 text-sm">
                +{formatETB(totalIn)} ብር
              </span>
            </div>
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-4 font-semibold">ቀን / ወር</th>
                  <th className="py-2.5 px-4 font-semibold">
                    {isMesfin ? 'የገቢ አይነት / ዝርዝር' : 'የተቀማጭ አይነት / ዝርዝር'}
                  </th>
                  <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">መጠን (+ብር)</th>
                  <th className="py-2.5 px-2 font-semibold text-center no-print w-9"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredIncomes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.dateOrMonth}
                        onChange={(e) =>
                          onUpdateEntry(incomeKey, item.id, 'dateOrMonth', e.target.value)
                        }
                        className={`w-full bg-transparent border border-transparent hover:border-slate-200 ${partnerFocusBorder} focus:bg-white rounded px-1.5 py-1 font-semibold text-slate-900 focus:outline-none`}
                      />
                      {langMode !== 'AM' && (
                        <span className="block px-1.5 text-[11px] text-slate-400">
                          {translateTextForMode(item.dateOrMonth, 'EN')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          onUpdateEntry(incomeKey, item.id, 'description', e.target.value)
                        }
                        className={`w-full bg-transparent border border-transparent hover:border-slate-200 ${partnerFocusBorder} focus:bg-white rounded px-1.5 py-1 text-slate-700 focus:outline-none`}
                      />
                      {langMode !== 'AM' && (
                        <span className="block px-1.5 text-[11px] text-slate-400">
                          {translateTextForMode(item.description, 'EN')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums">
                      <input
                        type="number"
                        min="0"
                        value={item.amount === 0 ? '' : item.amount}
                        placeholder="ወደፊት የሚሞላ"
                        onChange={(e) =>
                          onUpdateEntry(
                            incomeKey,
                            item.id,
                            'amount',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className={`w-28 text-right px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-700 rounded font-mono tabular-nums font-semibold ${
                          item.amount > 0 ? 'text-emerald-700' : 'text-slate-900'
                        } placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none`}
                      />
                    </td>
                    <td className="py-2 px-2 text-center no-print">
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(incomeKey, item.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                          title="ሰርዝ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/40 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-2.5 px-4">
                    {isMesfin ? 'ድምር (ጠቅላላ ገቢ)' : 'ድምር (ጠቅላላ ተቀማጭ)'}
                  </td>
                  <td className="py-2.5 px-4"></td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700">
                    +{formatETB(totalIn)}
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Right 6 cols: Expense Ledger (Negative Financial = Red) */}
        <section className="xl:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                የወጪ መዝገብ (የግል ወጪዎች፣ ጥገና፣ ግብር እና ማውጣት)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ድምር: <strong className="font-mono tabular-nums text-red-700">-{formatETB(totalOut)} ብር</strong> ({expenseRows.length} መዝገቦች)
              </p>
            </div>
            {!isViewOnly && (
              <button
                type="button"
                onClick={() => setShowAddExpense(!showAddExpense)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 rounded-md hover:bg-red-800 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer no-print"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ወጪ ጨምር</span>
              </button>
            )}
          </div>

          {showAddExpense && !isViewOnly && (
            <form
              onSubmit={handleCreateExpense}
              className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end no-print"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ቀን / ሁኔታ</label>
                <input
                  type="text"
                  required
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  placeholder={isMesfin ? 'ጥቅምት 2019' : 'የተከፈለ'}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">የወጪ ዝርዝር</label>
                <input
                  type="text"
                  required
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  placeholder="ምሳሌ፡ የቤት ጥገና"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex items-end gap-1.5">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-700 mb-1">መጠን (ብር)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    placeholder="2500"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
                >
                  መዝግብ
                </button>
              </div>
            </form>
          )}

          {/* Mobile Touch Cards for Expenses (< 640px) */}
          <div className="sm:hidden divide-y divide-slate-200">
            {filteredExpenses.map((item) => (
              <div key={item.id} className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={item.dateOrMonth}
                    onChange={(e) =>
                      onUpdateEntry(expenseKey, item.id, 'dateOrMonth', e.target.value)
                    }
                    className={`flex-1 min-h-[38px] bg-slate-50 border border-slate-200 ${partnerFocusBorder} focus:bg-white rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none`}
                  />
                  {!isViewOnly && (
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(expenseKey, item.id)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-md border border-slate-200 cursor-pointer"
                      title="ሰርዝ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      onUpdateEntry(expenseKey, item.id, 'description', e.target.value)
                    }
                    className={`col-span-7 min-h-[38px] bg-white border border-slate-200 ${partnerFocusBorder} rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none`}
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.amount === 0 ? '' : item.amount}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateEntry(
                        expenseKey,
                        item.id,
                        'amount',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="col-span-5 min-h-[38px] text-right px-2.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-red-600 rounded-md font-mono tabular-nums font-bold text-xs text-red-700 focus:outline-none"
                  />
                </div>
              </div>
            ))}
            <div className="p-3.5 bg-red-50/40 flex items-center justify-between text-xs font-bold text-slate-900">
              <span>ድምር (ጠቅላላ ወጪ)</span>
              <span className="font-mono tabular-nums text-red-700 text-sm">
                -{formatETB(totalOut)} ብር
              </span>
            </div>
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-4 font-semibold">ቀን / ወር</th>
                  <th className="py-2.5 px-4 font-semibold">የወጪ አይነት / ዝርዝር</th>
                  <th className="py-2.5 px-4 font-semibold text-right text-red-700">መጠን (-ብር)</th>
                  <th className="py-2.5 px-2 font-semibold text-center no-print w-9"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {filteredExpenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.dateOrMonth}
                        onChange={(e) =>
                          onUpdateEntry(expenseKey, item.id, 'dateOrMonth', e.target.value)
                        }
                        className={`w-full bg-transparent border border-transparent hover:border-slate-200 ${partnerFocusBorder} focus:bg-white rounded px-1.5 py-1 font-semibold text-slate-900 focus:outline-none`}
                      />
                      {langMode !== 'AM' && (
                        <span className="block px-1.5 text-[11px] text-slate-400">
                          {translateTextForMode(item.dateOrMonth, 'EN')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          onUpdateEntry(expenseKey, item.id, 'description', e.target.value)
                        }
                        className={`w-full bg-transparent border border-transparent hover:border-slate-200 ${partnerFocusBorder} focus:bg-white rounded px-1.5 py-1 text-slate-700 focus:outline-none`}
                      />
                      {langMode !== 'AM' && (
                        <span className="block px-1.5 text-[11px] text-slate-400">
                          {translateTextForMode(item.description, 'EN')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums">
                      <input
                        type="number"
                        min="0"
                        value={item.amount === 0 ? '' : item.amount}
                        placeholder="0"
                        onChange={(e) =>
                          onUpdateEntry(
                            expenseKey,
                            item.id,
                            'amount',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-28 text-right px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-red-600 rounded font-mono tabular-nums font-semibold text-red-700 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-center no-print">
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(expenseKey, item.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                          title="ሰርዝ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-red-50/40 font-bold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-2.5 px-4">ድምር (ጠቅላላ ወጪ)</td>
                  <td className="py-2.5 px-4"></td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-red-700">
                    -{formatETB(totalOut)}
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      </fieldset>
    </div>
  );
};
