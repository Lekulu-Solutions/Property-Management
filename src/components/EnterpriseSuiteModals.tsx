import React, { useState } from 'react';
import {
  History,
  RotateCcw,
  ShieldCheck,
  Lock,
  Unlock,
  BookmarkCheck,
  Trash2,
  Printer,
  Copy,
  Check,
  X,
  AlertTriangle,
  KeyRound,
  CalendarCheck,
  FileCheck2,
} from 'lucide-react';
import {
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  TenantRentalRow,
  WorkbookState,
} from '../data/initialLedgerData';
import { formatETB, ComputedWaterRow } from '../utils/excelParser';
import { useLanguage } from '../utils/i18n';

export type EditableSheetKey = 'rental' | 'mesfin' | 'zewdnesh' | 'groceries' | 'water';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  isoTime: string;
  yearEC: string;
  sheet: EditableSheetKey;
  month?: string;
  actor: string;
  summaryAm: string;
  summaryEn: string;
  isAnomaly?: boolean;
  previousState: WorkbookState;
}

export interface WorkbookSnapshot {
  id: string;
  label: string;
  createdAt: string;
  yearEC: string;
  actor: string;
  isAuto?: boolean;
  state: WorkbookState;
}

export type ReceiptDataPayload =
  | {
      type: 'RENT';
      yearEC: string;
      month: EthiopianMonth;
      tenant: TenantRentalRow;
      amountPaid: number;
      mesfinShare: number;
      zewdneshShare: number;
    }
  | {
      type: 'WATER';
      yearEC: string;
      month: EthiopianMonth;
      ratePerUnit: number;
      row: ComputedWaterRow;
    };

interface AuditAndSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: string;
  auditLogs: AuditLogEntry[];
  onUndoAudit: (entry: AuditLogEntry) => void;
  onClearAuditLogs: () => void;
  snapshots: WorkbookSnapshot[];
  onCreateSnapshot: (label: string) => void;
  onRestoreSnapshot: (snapshot: WorkbookSnapshot) => void;
  onDeleteSnapshot: (id: string) => void;
  closedMonths: EthiopianMonth[];
  onToggleClosedMonth: (month: EthiopianMonth) => void;
  adminPin: string | null;
  onUpdateAdminPin: (newPin: string | null) => void;
  sheetViewOnly: Record<EditableSheetKey, boolean>;
  onLockAllSheets: () => void;
  onUnlockAllSheets: () => void;
}

const SHEET_NAMES: Record<EditableSheetKey, { am: string; en: string }> = {
  rental: { am: 'የኪራይ እና ወጪ ክፍፍል', en: 'Rental & Expense Split' },
  mesfin: { am: 'የመስፍን መዝገብ', en: "Mesfin's Ledger" },
  zewdnesh: { am: 'የዘውድነሽ መዝገብ', en: "Zewdnesh's Ledger" },
  groceries: { am: 'የአስቤዛ መከታተያ', en: 'Groceries Tracker' },
  water: { am: 'ውሃ', en: 'Water Tracker' },
};

export const AuditAndSecurityModal: React.FC<AuditAndSecurityModalProps> = ({
  isOpen,
  onClose,
  selectedYear,
  auditLogs,
  onUndoAudit,
  onClearAuditLogs,
  snapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  closedMonths,
  onToggleClosedMonth,
  adminPin,
  onUpdateAdminPin,
  sheetViewOnly,
  onLockAllSheets,
  onUnlockAllSheets,
}) => {
  const { tr } = useLanguage();
  const [activeSection, setActiveSection] = useState<'AUDIT' | 'SECURITY' | 'SNAPSHOTS'>('AUDIT');
  const [sheetFilter, setSheetFilter] = useState<'ALL' | EditableSheetKey>('ALL');
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [pinInput, setPinInput] = useState(adminPin || '');
  const [pinSavedMsg, setPinSavedMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredLogs = auditLogs.filter((log) =>
    sheetFilter === 'ALL' ? true : log.sheet === sheetFilter
  );

  const lockedCount = Object.values(sheetViewOnly).filter(Boolean).length;

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinInput.trim();
    if (!cleaned) {
      onUpdateAdminPin(null);
      setPinSavedMsg(tr('የPIN ጥበቃ ተነስቷል።', 'PIN protection disabled.'));
      return;
    }
    if (cleaned.length < 4) {
      setPinSavedMsg(tr('እባክዎ ቢያንስ 4 አሃዞች ያስገቡ።', 'Please enter at least 4 digits.'));
      return;
    }
    onUpdateAdminPin(cleaned);
    setPinSavedMsg(tr('የአርትዖት PIN ተቀምጧል!', 'Admin Edit PIN saved!'));
    setTimeout(() => setPinSavedMsg(null), 3000);
  };

  const handleCreateManualSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      snapshotLabel.trim() ||
      `${selectedYear} — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    onCreateSnapshot(label);
    setSnapshotLabel('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 no-print">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {tr(
                  `የኦዲት ታሪክ፣ የወር መዝጊያ እና ደህንነት (${selectedYear})`,
                  `Audit Log, Period Closing & Security (${selectedYear})`
                )}
              </h2>
              <p className="text-xs text-slate-500">
                {tr(
                  'ሁሉንም ለውጦች ይመልከቱ፣ በአንድ 클릭 ወደ ኋላ ይመልሱ (Undo)፣ ወራትን ይቆልፉ ወይም ቅጂዎችን ይመልሱ።',
                  'Track all edits with 1-click Undo, lock reconciled months, and manage PIN & snapshots.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveSection('AUDIT')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeSection === 'AUDIT'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{tr(`የለውጥ ታሪክ (${auditLogs.length})`, `Audit Log (${auditLogs.length})`)}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('SECURITY')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeSection === 'SECURITY'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {tr(
                  `የወር መዝጊያ እና PIN (${closedMonths.length}/12)`,
                  `Period Lock & PIN (${closedMonths.length}/12)`
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('SNAPSHOTS')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeSection === 'SNAPSHOTS'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>
                {tr(`ቅጂዎች (${snapshots.length})`, `Snapshots (${snapshots.length})`)}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLockAllSheets}
              disabled={lockedCount === 5}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 cursor-pointer flex items-center gap-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{tr('5ቱንም ቆልፍ (View Only)', 'Lock All 5 Sheets')}</span>
            </button>
            <button
              type="button"
              onClick={onUnlockAllSheets}
              disabled={lockedCount === 0}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer flex items-center gap-1"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{tr('5ቱንም ክፈት (Edit All)', 'Unlock All 5 Sheets')}</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeSection === 'AUDIT' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
                  {(
                    [
                      ['ALL', tr('ሁሉም', 'All')],
                      ['rental', tr('ኪራይ', 'Rental')],
                      ['mesfin', tr('መስፍን', 'Mesfin')],
                      ['zewdnesh', tr('ዘውድነሽ', 'Zewdnesh')],
                      ['groceries', tr('አስቤዛ', 'Groceries')],
                      ['water', tr('ውሃ', 'Water')],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSheetFilter(key)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                        sheetFilter === key
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {auditLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearAuditLogs}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{tr('ታሪክ አጽዳ', 'Clear History')}</span>
                  </button>
                )}
              </div>

              {filteredLogs.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-500 text-xs">
                  {tr(
                    'ምንም የተመዘገበ የለውጥ ታሪክ የለም። ማንኛውም ማስተካከያ ሲደረግ እዚህ በራስ-ሰር ይመዘገባል።',
                    'No audit history recorded yet. Any edits made in Edit Mode will automatically appear here with 1-click Undo.'
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 ${
                        log.isAnomaly ? 'bg-amber-50/40' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {tr(SHEET_NAMES[log.sheet].am, SHEET_NAMES[log.sheet].en)}
                          </span>
                          {log.month && (
                            <>
                              <span>·</span>
                              <span className="font-medium text-slate-700">{log.month}</span>
                            </>
                          )}
                          <span>·</span>
                          <span className="font-mono">{log.timestamp}</span>
                          <span>·</span>
                          <span>{log.actor}</span>
                          {log.isAnomaly && (
                            <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {tr('ከፍተኛ ቁጥር ማስጠንቀቂያ', 'High-Value Alert')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-900">
                          {tr(log.summaryAm, log.summaryEn)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onUndoAudit(log)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{tr('ወደ ነበረበት መልስ (Undo)', 'Undo Change')}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'SECURITY' && (
            <div className="space-y-6">
              {/* Period Closing / Lock Reconciled Months */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {tr(
                        `የወር ሂሳብ መዝጊያ (Period Closing — ${selectedYear})`,
                        `Monthly Period Closing (${selectedYear})`
                      )}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {tr(
                      'የተዘጋ ወር በEdit Mode ውስጥ እንኳን አይቀየርም',
                      'Closed months are frozen against accidental edits'
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {ETHIOPIAN_MONTHS.map((m) => {
                    const isClosed = closedMonths.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onToggleClosedMonth(m.id)}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                          isClosed
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{tr(m.labelAm, m.labelEn)}</span>
                        {isClosed ? (
                          <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin PIN Protection (Default: 8998) */}
              <form
                onSubmit={handleSavePin}
                className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {tr(
                        'የአርትዖት ሚና መክፈቻ PIN (Admin Edit PIN Protection — Active)',
                        'Admin Edit PIN Protection (Active)'
                      )}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">
                    {tr('🔒 በPIN የተጠበቀ', '🔒 PIN Protected')}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {tr(
                    'ማንኛውንም ገጽ ከ"እይታ ብቻ (🔒)" ወደ "አርትዕ (✏️)" ለመቀየር የይለፍ PIN (8998) ማስገባት ግዴታ ነው።',
                    'Unlocking any sheet from View-Only Lock (🔒) to Edit Mode (✏️) requires the Admin PIN.'
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••"
                    className="bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono w-56 focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    {tr('PIN ቀይር / አስቀምጥ', 'Update PIN')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinInput('8998');
                      onUpdateAdminPin('8998');
                      setPinSavedMsg(
                        tr('መደበኛው PIN (8998) ተመልሷል።', 'Reset to default PIN (8998).')
                      );
                    }}
                    className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    {tr('ወደ መደበኛ PIN (8998) መልስ', 'Reset to 8998')}
                  </button>
                </div>
                {pinSavedMsg && (
                  <p className="text-xs font-semibold text-emerald-700">{pinSavedMsg}</p>
                )}
              </form>
            </div>
          )}

          {activeSection === 'SNAPSHOTS' && (
            <div className="space-y-4">
              <form
                onSubmit={handleCreateManualSnapshot}
                className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200"
              >
                <input
                  type="text"
                  value={snapshotLabel}
                  onChange={(e) => setSnapshotLabel(e.target.value)}
                  placeholder={tr(
                    'የቅጂ ስም (ለምሳሌ፦ ከጥቅምት ክፍያ በፊት)...',
                    'Snapshot label (e.g. Before Tikimt settlement)...'
                  )}
                  className="flex-1 min-w-[220px] bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer flex items-center gap-1.5"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>{tr('+ የአሁኑን ቅጂ አስቀምጥ', '+ Save Current Snapshot')}</span>
                </button>
              </form>

              {snapshots.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-500 text-xs">
                  {tr(
                    'ምንም የተቀመጠ ቅጂ የለም። ወር እንደ አዲስ ሲጀመር ወይም እዚህ ሲያስቀምጡ ይመዘገባል።',
                    'No snapshots saved yet. Create a manual restore point above or automatic snapshots will be saved before bulk resets.'
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {snap.label}
                          </span>
                          {snap.isAuto && (
                            <span className="text-[11px] text-slate-500">
                              ({tr('ራስ-ሰር ቅጂ', 'Auto-Backup')})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          {snap.yearEC} · {snap.createdAt} · {snap.actor}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRestoreSnapshot(snap)}
                          className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{tr('ይህን ቅጂ መልስ', 'Restore')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSnapshot(snap.id)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PinPromptModalProps {
  isOpen: boolean;
  sheetLabel: string;
  expectedPin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PinPromptModal: React.FC<PinPromptModalProps> = ({
  isOpen,
  sheetLabel,
  expectedPin,
  onSuccess,
  onCancel,
}) => {
  const { tr } = useLanguage();
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entered.trim() === expectedPin) {
      setEntered('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {tr('የአርትዖት PIN ያስገቡ', 'Enter Admin Edit PIN')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600">
          {tr(
            `"${sheetLabel}"ን ከእይታ ብቻ (🔒) ወደ አርትዕ (✏️) ለመቀየር የይለፍ PIN ያስገቡ፦`,
            `Enter your Admin PIN to unlock "${sheetLabel}" for editing:`
          )}
        </p>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={entered}
          onChange={(e) => {
            setEntered(e.target.value);
            setError(false);
          }}
          placeholder="••••"
          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-center text-base font-mono tracking-widest focus:outline-none focus:border-slate-900"
        />

        {error && (
          <p className="text-xs font-semibold text-rose-600 text-center">
            {tr('የተሳሳተ PIN ነው። እንደገና ይሞክሩ።', 'Incorrect PIN. Please try again.')}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            {tr('ተው', 'Cancel')}
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-md bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
          >
            {tr('ክፈት (Unlock)', 'Unlock Edit Mode')}
          </button>
        </div>
      </form>
    </div>
  );
};

interface PaymentReceiptModalProps {
  receipt: ReceiptDataPayload | null;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({ receipt, onClose }) => {
  const { tr } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const receiptNumber =
    receipt.type === 'RENT'
      ? `MZ-RENT-${receipt.yearEC.replace(/\s+/g, '')}-${receipt.month}-${receipt.tenant.id.slice(-4).toUpperCase()}`
      : `MZ-WTR-${receipt.yearEC.replace(/\s+/g, '')}-${receipt.month}-${receipt.row.index}`;

  const dateStr = new Date().toLocaleDateString();

  const buildShareText = () => {
    if (receipt.type === 'RENT') {
      return [
        `🧾 የቤት ኪራይ ክፍያ ደረሰኝ / Rent Payment Receipt`,
        `ደረሰኝ ቁጥር / No: ${receiptNumber}`,
        `ወር / Period: ${receipt.month} (${receipt.yearEC})`,
        `ተከራይ / Tenant: ${receipt.tenant.tenantName}`,
        `ዝርዝር / Description: ${receipt.tenant.description}`,
        `የተከፈለ የወር ኪራይ / Amount Paid: ${formatETB(receipt.amountPaid)} ብር (ETB)`,
        `የመስፍን ድርሻ / Mesfin Share: ${formatETB(receipt.mesfinShare)} ብር`,
        `የዘውድነሽ ድርሻ / Zewdnesh Share: ${formatETB(receipt.zewdneshShare)} ብር`,
        `ቀን / Date: ${dateStr}`,
      ].join('\n');
    } else {
      const r = receipt.row;
      return [
        `💧 የውሃ ፍጆታ እና ክፍያ ደረሰኝ / Water Usage & Payment Slip`,
        `ደረሰኝ ቁጥር / No: ${receiptNumber}`,
        `ወር / Period: ${receipt.month} (${receipt.yearEC})`,
        `ተጠቃሚ / Name: ${r.name}`,
        `ሳምንታዊ ፍጆታ / Weekly: W1=${r.week1}, W2=${r.week2}, W3=${r.week3}, W4=${r.week4}`,
        `ጠቅላላ ዙር / Total Usage: ${r.totalUsage} ዙር (× ${receipt.ratePerUnit} ብር)`,
        `የወሩ ክፍያ / Total Due: ${formatETB(r.totalPaymentDue)} ብር`,
        `ካለፈው ወር ተቀማጭ / Previous Balance: ${r.installmentDeposit >= 0 ? '+' : ''}${formatETB(r.installmentDeposit)} ብር`,
        `የተከፈለ ገንዘብ / Amount Paid: ${formatETB(r.amountPaid)} ብር`,
        `ወደ ቀጣይ ወር የሚሸጋገር ቀሪ / Next Month Balance: ${r.nextMonthBalance >= 0 ? '+' : ''}${formatETB(r.nextMonthBalance)} ብር`,
        `ቀን / Date: ${dateStr}`,
      ].join('\n');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Top Action Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold">
              {receipt.type === 'RENT'
                ? tr('የቤት ኪራይ ክፍያ ደረሰኝ', 'Official Rent Payment Receipt')
                : tr('የውሃ ፍጆታ እና ክፍያ ደረሰኝ', 'Official Water Payment Slip')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Card */}
        <div className="p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                መስፍን እና ዘውድነሽ · የሂሳብ መዝገብ
              </p>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                {receipt.type === 'RENT'
                  ? tr('የወርሃዊ ቤት ኪራይ ደረሰኝ', 'Monthly Rent Receipt')
                  : tr('የወርሃዊ ውሃ ክፍያ ደረሰኝ', 'Monthly Water Bill & Slip')}
              </h3>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              <div className="font-bold text-slate-800">{receiptNumber}</div>
              <div>
                {receipt.month} · {receipt.yearEC}
              </div>
              <div>{dateStr}</div>
            </div>
          </div>

          {receipt.type === 'RENT' ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">{tr('የተከራይ ስም', 'Tenant Name')}</span>
                <span className="font-bold text-slate-900 text-sm">
                  {receipt.tenant.tenantName}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">{tr('ዝርዝር', 'Description')}</span>
                <span className="font-semibold text-slate-800">
                  {receipt.tenant.description}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">{tr('የክፍፍል ደንብ', 'Split Rule')}</span>
                <span className="font-semibold text-slate-700">{receipt.tenant.splitLabel}</span>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 flex items-center justify-between">
                <span className="font-bold text-emerald-950">
                  {tr(`የተከፈለ ኪራይ (${receipt.month})`, `Rent Paid (${receipt.month})`)}
                </span>
                <span className="text-lg font-mono font-extrabold text-emerald-800">
                  {formatETB(receipt.amountPaid)} ብር
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
                  <div className="text-[11px] text-slate-500">
                    {tr('የመስፍን ድርሻ', 'Mesfin Share')}
                  </div>
                  <div className="font-mono font-bold text-blue-700 mt-0.5">
                    {formatETB(receipt.mesfinShare)} ብር
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5">
                  <div className="text-[11px] text-slate-500">
                    {tr('የዘውድነሽ ድርሻ', 'Zewdnesh Share')}
                  </div>
                  <div className="font-mono font-bold text-purple-700 mt-0.5">
                    {formatETB(receipt.zewdneshShare)} ብር
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">{tr('የተጠቃሚ ስም', 'Member Name')}</span>
                <span className="font-bold text-slate-900 text-sm">{receipt.row.name}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <div className="text-[10px] text-slate-500">ሳምንት 1</div>
                  <div className="font-mono font-bold text-slate-800">{receipt.row.week1}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">ሳምንት 2</div>
                  <div className="font-mono font-bold text-slate-800">{receipt.row.week2}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">ሳምንት 3</div>
                  <div className="font-mono font-bold text-slate-800">{receipt.row.week3}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">ሳምንት 4</div>
                  <div className="font-mono font-bold text-slate-800">{receipt.row.week4}</div>
                </div>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">
                  {tr('ጠቅላላ ዙር × ታሪፍ', 'Total Units × Rate')}
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {receipt.row.totalUsage} ዙር × {receipt.ratePerUnit} ብር ={' '}
                  {formatETB(receipt.row.totalPaymentDue)} ብር
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">
                  {tr('ካለፈው ወር የተቀመጠ ክፍያ', 'Carried-Over Deposit')}
                </span>
                <span className="font-mono font-bold text-sky-700">
                  {receipt.row.installmentDeposit >= 0 ? '+' : ''}
                  {formatETB(receipt.row.installmentDeposit)} ብር
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{tr('በዚህ ወር የተከፈለ', 'Amount Paid')}</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatETB(receipt.row.amountPaid)} ብር
                </span>
              </div>
              <div
                className={`rounded-lg p-3 flex items-center justify-between border ${
                  receipt.row.nextMonthBalance >= 0
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <span className="font-bold">
                  {tr('ወደ ቀጣይ ወር የሚሸጋገር ቀሪ', 'Next Month Carry-Over Balance')}
                </span>
                <span className="text-base font-mono font-extrabold">
                  {receipt.row.nextMonthBalance >= 0 ? '+' : ''}
                  {formatETB(receipt.row.nextMonthBalance)} ብር
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 no-print">
          <button
            type="button"
            onClick={handleCopyText}
            className="px-3.5 py-2 rounded-md border border-slate-300 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">
                  {tr('ተቀድቷል! (Telegram/WhatsApp)', 'Copied for WhatsApp/Telegram!')}
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{tr('ጽሑፍ ቅዳ (Share)', 'Copy Receipt Text')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{tr('አትም (Print)', 'Print Receipt')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
