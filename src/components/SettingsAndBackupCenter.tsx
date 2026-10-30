import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Calendar,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Download,
  Edit3,
  RotateCcw,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  Globe,
  Palette,
  HelpCircle,
  BookOpen,
  Calculator,
  Layers,
  Smartphone,
} from 'lucide-react';
import {
  EthiopianMonth,
  ShareRuleConfig,
  SplitType,
  WorkbookState,
  YearInitMode,
} from '../data/initialLedgerData';
import {
  calculateRentalSummary,
  exportMultiYearArchiveToExcel,
  exportWorkbookToExcel,
  formatETB,
  ReportTemplateScope,
  saveWorkbookToDesignatedLocalFile,
} from '../utils/excelParser';
import {
  createAndSyncGoogleSheet,
  DriveSpreadsheetItem,
  GoogleSheetConnectionInfo,
  listAppGoogleSheets,
  syncToExistingGoogleSheet,
} from '../services/googleSheetsSync';
import {
  getCachedWorkspaceAccessToken,
  requestWorkspaceAccessToken,
} from '../firebase';
import { LanguageSelector } from '../utils/i18n';

interface SettingsAndBackupCenterProps {
  state: WorkbookState;
  selectedYear: string;
  selectedMonth: EthiopianMonth | 'ANNUAL';
  yearsList: string[];
  workbooksByYear: Record<string, WorkbookState>;
  shareRules: ShareRuleConfig[];
  bilingual: boolean;
  onToggleBilingual: () => void;
  userEmail: string | null;
  isAuthenticated: boolean;
  isCloudSyncing: boolean;
  onForceCloudPush: () => void;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onOpenLoginScreen: () => void;
  onOpenImportExportModal: () => void;
  onOpenMobileAppModal?: () => void;
  onSelectYear: (yearEC: string) => void;
  onAddYear: (newYearEC: string, initMode: YearInitMode, sourceYearEC: string) => void;
  onDeleteYear: (yearEC: string) => void;
  onResetYear: (yearEC: string) => void;
  onUpdateShareRules: (nextRules: ShareRuleConfig[]) => void;
  onUpdateTenantSplit: (
    tenantId: string,
    splitType: SplitType,
    mRatio: number,
    zRatio: number,
    label: string
  ) => void;
  onUpdateExpenseSplit: (
    expenseId: string,
    splitType: SplitType,
    mRatio: number,
    zRatio: number,
    label: string
  ) => void;
  onShowToast: (msg: string) => void;
}

const SHEET_CONN_STORAGE_KEY = 'mesfin_zewdnesh_gsheet_connections_v1';

export const SettingsAndBackupCenter: React.FC<SettingsAndBackupCenterProps> = ({
  state,
  selectedYear,
  selectedMonth,
  yearsList,
  workbooksByYear,
  shareRules,
  bilingual,
  onToggleBilingual,
  userEmail,
  isAuthenticated,
  isCloudSyncing,
  onForceCloudPush,
  onGoogleLogin,
  onGoogleLogout,
  onOpenLoginScreen,
  onOpenImportExportModal,
  onOpenMobileAppModal,
  onSelectYear,
  onAddYear,
  onDeleteYear,
  onResetYear,
  onUpdateShareRules,
  onUpdateTenantSplit,
  onUpdateExpenseSplit,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'BACKUP' | 'RULES' | 'YEARS' | 'HELP'>('BACKUP');
  const [helpCategory, setHelpCategory] = useState<
    'ALL' | 'COLORS' | 'SHEETS' | 'FORMULAS' | 'SYNC' | 'YEARS' | 'BACKUP'
  >('ALL');

  // --- Share Calculation Rules State ---
  const [newRuleLabelAm, setNewRuleLabelAm] = useState('');
  const [newRuleLabelEn, setNewRuleLabelEn] = useState('');
  const [newRuleMesfinPct, setNewRuleMesfinPct] = useState<number>(50);
  const [newRuleAppliesTo, setNewRuleAppliesTo] = useState<'BOTH' | 'INCOME' | 'EXPENSE'>('BOTH');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleLabelAm, setEditRuleLabelAm] = useState('');
  const [editRuleMesfinPct, setEditRuleMesfinPct] = useState<number>(50);
  const [editRuleAppliesTo, setEditRuleAppliesTo] = useState<'BOTH' | 'INCOME' | 'EXPENSE'>('BOTH');

  // --- Multi-Year Management State ---
  const [newYearInput, setNewYearInput] = useState('2023 EC');
  const [newYearInitMode, setNewYearInitMode] = useState<YearInitMode>('TEMPLATE_RENTS');
  const [newYearSource, setNewYearSource] = useState<string>(selectedYear);
  const [confirmDeleteYear, setConfirmDeleteYear] = useState<string | null>(null);

  // --- Option A: Google Sheets Real-Time / On-Demand Sync State ---
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(() =>
    getCachedWorkspaceAccessToken()
  );
  const [sheetConnections, setSheetConnections] = useState<
    Record<string, GoogleSheetConnectionInfo>
  >(() => {
    try {
      const saved = localStorage.getItem(SHEET_CONN_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [driveSheets, setDriveSheets] = useState<DriveSpreadsheetItem[]>([]);
  const [isLoadingDriveSheets, setIsLoadingDriveSheets] = useState(false);
  const [customSheetTitle, setCustomSheetTitle] = useState(
    `መስፍን እና ዘውድነሽ - የኪራይ ንብረት እና ወጪ (${selectedYear})`
  );
  const [manualSpreadsheetIdInput, setManualSpreadsheetIdInput] = useState('');
  const [enableExternalReadOnlyLink, setEnableExternalReadOnlyLink] = useState(true);
  const [isSyncingGoogleSheet, setIsSyncingGoogleSheet] = useState(false);
  const [googleSheetStatus, setGoogleSheetStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Mandatory User Confirmation Modal State before mutating/overwriting Google Sheet data
  const [pendingGoogleSheetAction, setPendingGoogleSheetAction] = useState<{
    mode: 'CREATE_NEW' | 'SYNC_EXISTING';
    targetSpreadsheetId?: string;
    targetTitle: string;
  } | null>(null);

  // --- Option B: Local Excel Export State ---
  const [localTemplateScope, setLocalTemplateScope] = useState<ReportTemplateScope>('FULL_EXECUTIVE');
  const [localFileName, setLocalFileName] = useState(
    `Mesfin_Zewdnesh_Report_${selectedYear.replace(/\s+/g, '_')}.xlsx`
  );
  const [localFolderHandle, setLocalFolderHandle] = useState<any | null>(null);
  const [lastLocalSavedPath, setLastLocalSavedPath] = useState<string | null>(null);
  const [isExportingLocal, setIsExportingLocal] = useState(false);

  useEffect(() => {
    setCustomSheetTitle(`መስፍን እና ዘውድነሽ - የኪራይ ንብረት እና ወጪ (${selectedYear})`);
    const scopeSuffix = localTemplateScope === 'FULL_EXECUTIVE' ? '' : `_${localTemplateScope}`;
    setLocalFileName(`Mesfin_Zewdnesh_Report_${selectedYear.replace(/\s+/g, '_')}${scopeSuffix}.xlsx`);
    setNewYearSource(selectedYear);
  }, [selectedYear, localTemplateScope]);

  useEffect(() => {
    try {
      localStorage.setItem(SHEET_CONN_STORAGE_KEY, JSON.stringify(sheetConnections));
    } catch {
      // ignore
    }
  }, [sheetConnections]);

  const activeConnection = sheetConnections[selectedYear] || null;
  const activeMonthForExport: EthiopianMonth =
    selectedMonth === 'ANNUAL' ? 'ጥቅምት' : selectedMonth;

  // Fetch existing app-created Google Sheets when Workspace token is available
  useEffect(() => {
    if (!workspaceToken) return;
    let cancelled = false;
    setIsLoadingDriveSheets(true);
    listAppGoogleSheets(workspaceToken)
      .then((files) => {
        if (!cancelled) setDriveSheets(files);
      })
      .catch(() => {
        // Token may have expired
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDriveSheets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceToken]);

  useEffect(() => {
    const token = getCachedWorkspaceAccessToken();
    if (token && token !== workspaceToken) {
      setWorkspaceToken(token);
    }
    try {
      const saved = localStorage.getItem(SHEET_CONN_STORAGE_KEY);
      if (saved) {
        setSheetConnections(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [isAuthenticated, userEmail]);

  const handleConnectGoogleWorkspace = async () => {
    setGoogleSheetStatus(null);
    try {
      const { accessToken } = await requestWorkspaceAccessToken();
      setWorkspaceToken(accessToken);
      onShowToast('Google Sheets እና Google Drive በተሳካ ሁኔታ ተገናኝተዋል!');
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('APK_WORKSPACE_TOKEN_NEEDED') || msg.includes('APK_NEEDS_CLOUD_KEY')) {
        if (onOpenMobileAppModal) {
          onOpenMobileAppModal();
        }
        onShowToast('በአንድሮይድ APK ውስጥ የGoogle Sheets ፈቃድ ለማገናኘት የCloud Sync Key ያስገቡ።');
        return;
      }
      setGoogleSheetStatus({
        type: 'error',
        text: 'Google Sheets ፈቃድ ማግኘት አልተቻለም። እባክዎ የGoogle መግቢያ ሳጥኑን ይፍቀዱ።',
      });
    }
  };

  const extractSpreadsheetId = (rawInput: string): string => {
    const trimmed = rawInput.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    return trimmed;
  };

  const executeConfirmedGoogleSheetSync = async () => {
    if (!pendingGoogleSheetAction) return;
    const action = pendingGoogleSheetAction;
    setPendingGoogleSheetAction(null);
    setIsSyncingGoogleSheet(true);
    setGoogleSheetStatus(null);

    try {
      let token = workspaceToken || getCachedWorkspaceAccessToken();
      if (!token) {
        const authRes = await requestWorkspaceAccessToken();
        token = authRes.accessToken;
        setWorkspaceToken(token);
      }

      const ownerEmail = userEmail || '';
      let connInfo: GoogleSheetConnectionInfo;

      if (action.mode === 'CREATE_NEW') {
        connInfo = await createAndSyncGoogleSheet(
          token,
          state,
          activeMonthForExport,
          ownerEmail,
          {
            customTitle: action.targetTitle,
            enableExternalReadOnlyLink,
          }
        );
      } else {
        const targetId = action.targetSpreadsheetId!;
        connInfo = await syncToExistingGoogleSheet(
          token,
          targetId,
          state,
          activeMonthForExport,
          ownerEmail,
          {
            spreadsheetTitle: action.targetTitle,
            enableExternalReadOnlyLink,
          }
        );
      }

      setSheetConnections((prev) => ({
        ...prev,
        [selectedYear]: connInfo,
      }));

      // Refresh list of sheets
      listAppGoogleSheets(token)
        .then(setDriveSheets)
        .catch(() => {});

      setGoogleSheetStatus({
        type: 'success',
        text: `4ቱም ሉሆች ወደ Google Sheet ("${connInfo.spreadsheetTitle}") ተመሳክረዋል! የውጭ ተጠቃሚዎች ማንበብ ብቻ (Read-Only) እንዲችሉ ተቆልፏል።`,
      });
      onShowToast(`Google Sheet (${selectedYear}) በተሳካ ሁኔታ ተዘምኗል እና ተቆልፏል!`);
    } catch (err: any) {
      setGoogleSheetStatus({
        type: 'error',
        text: `Google Sheet ማመሳከር አልተቻለም: ${err?.message || 'Unknown error'}`,
      });
    } finally {
      setIsSyncingGoogleSheet(false);
    }
  };

  // --- Option B: Local Excel Export Handlers ---
  const handleSaveToDesignatedFolder = async (useExistingHandle: boolean) => {
    setIsExportingLocal(true);
    try {
      const res = await saveWorkbookToDesignatedLocalFile(state, {
        customFileName: localFileName,
        activeMonth: selectedMonth,
        existingHandle: useExistingHandle ? localFolderHandle : null,
        scope: localTemplateScope,
        includeSignatures: true,
      });
      if (res.fileHandle) {
        setLocalFolderHandle(res.fileHandle);
      }
      setLastLocalSavedPath(res.savedPathLabel);
      onShowToast(`መደበኛ የExcel ሪፖርት (${res.savedPathLabel}) በተሳካ ሁኔታ ተቀምጧል!`);
    } catch (err: any) {
      if (err?.message !== 'USER_CANCELLED') {
        exportWorkbookToExcel(state, localFileName, selectedMonth, {
          scope: localTemplateScope,
          includeSignatures: true,
        });
        setLastLocalSavedPath(`Downloads/${localFileName}`);
        onShowToast(`መደበኛ የExcel ሪፖርት (${localFileName}) ወርዷል።`);
      }
    } finally {
      setIsExportingLocal(false);
    }
  };

  // --- Share Calculation Rules Handlers ---
  const handleAddShareRule = (e: React.FormEvent) => {
    e.preventDefault();
    const mPct = Math.min(Math.max(0, Math.round(newRuleMesfinPct)), 100);
    const zPct = 100 - mPct;
    const mRatio = mPct / 100;
    const zRatio = zPct / 100;
    const defaultLabelAm = `${mPct}% መስፍን / ${zPct}% ዘውድነሽ`;
    const defaultLabelEn = `${mPct}% Mesfin / ${zPct}% Zewdnesh`;

    const splitType: SplitType =
      mPct === 50
        ? '50_50'
        : mPct === 100
        ? '100_MESFIN'
        : mPct === 0
        ? '100_ZEWDNESH'
        : 'CUSTOM_RATIO';

    const newRule: ShareRuleConfig = {
      id: `rule_${Date.now()}`,
      code: `CUSTOM_${mPct}_${zPct}_${Date.now().toString().slice(-4)}`,
      labelAm: newRuleLabelAm.trim() || defaultLabelAm,
      labelEn: newRuleLabelEn.trim() || defaultLabelEn,
      splitType,
      mesfinRatio: mRatio,
      zewdneshRatio: zRatio,
      appliesTo: newRuleAppliesTo,
      isSystemDefault: false,
    };

    onUpdateShareRules([...shareRules, newRule]);
    setNewRuleLabelAm('');
    setNewRuleLabelEn('');
    setNewRuleMesfinPct(50);
    onShowToast(`አዲስ የድርሻ ስሌት ሕግ (${newRule.labelAm}) ተፈጥሯል።`);
  };

  const handleSaveEditedRule = (rule: ShareRuleConfig) => {
    const mPct = Math.min(Math.max(0, Math.round(editRuleMesfinPct)), 100);
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
    const updatedLabel = editRuleLabelAm.trim() || `${mPct}% መስፍን / ${zPct}% ዘውድነሽ`;

    const nextRules = shareRules.map((r) =>
      r.id === rule.id
        ? {
            ...r,
            labelAm: updatedLabel,
            splitType: sType,
            mesfinRatio: mRatio,
            zewdneshRatio: zRatio,
            appliesTo: editRuleAppliesTo,
          }
        : r
    );
    onUpdateShareRules(nextRules);
    setEditingRuleId(null);
    onShowToast(`የስሌት ሕጉ (${updatedLabel}) ተዘምኗል።`);
  };

  const handleDeleteRule = (ruleId: string) => {
    const target = shareRules.find((r) => r.id === ruleId);
    if (!target || target.isSystemDefault) return;
    onUpdateShareRules(shareRules.filter((r) => r.id !== ruleId));
    onShowToast(`የስሌት ሕጉ (${target.labelAm}) ተሰርዟል።`);
  };

  const handlePropagateRuleToAll = (
    rule: ShareRuleConfig,
    targetGroup: 'TENANTS' | 'EXPENSES'
  ) => {
    if (targetGroup === 'TENANTS') {
      state.tenants.forEach((t) => {
        onUpdateTenantSplit(
          t.id,
          rule.splitType,
          rule.mesfinRatio,
          rule.zewdneshRatio,
          rule.labelAm
        );
      });
      onShowToast(`ሕጉ (${rule.labelAm}) ለሁሉም ተከራዮች ተተግብሯል።`);
    } else {
      state.propertyExpenses.forEach((e) => {
        onUpdateExpenseSplit(
          e.id,
          rule.splitType,
          rule.mesfinRatio,
          rule.zewdneshRatio,
          rule.labelAm
        );
      });
      onShowToast(`ሕጉ (${rule.labelAm}) ለሁሉም የወጪ መስመሮች ተተግብሯል።`);
    }
  };

  // --- Multi-Year Management Handlers ---
  const handleCreateFiscalYear = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newYearInput.trim();
    if (!cleaned) return;
    const normalized = cleaned.toUpperCase().endsWith('EC')
      ? cleaned.replace(/\s+/g, ' ')
      : `${cleaned} EC`;
    onAddYear(normalized, newYearInitMode, newYearSource);
    setNewYearInput('');
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ቅንብሮች፣ ሕጎች፣ መጠባበቂያ እና የእገዛ ማዕከል
          </h1>
        </div>

        {/* Sub-navigation Tabs (Touch Scrollable on Mobile) */}
        <div className="w-full md:w-auto flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('BACKUP')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'BACKUP'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>መጠባበቂያ (Backup & Sync)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('RULES')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'RULES'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-blue-700" />
            <span>የስሌት ሕጎች (Rules)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('YEARS')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'YEARS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            <span>የሂሳብ ዓመታት ({yearsList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('HELP')}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'HELP'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-700" />
            <span>የእገዛ ማዕከል (Help Center)</span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          COMPACT WORKSPACE CONTROLS BAR
      ===================================================================== */}
      <section
        aria-label="Workspace Controls"
        className="bg-white border border-slate-200 rounded-lg p-4 sm:px-5 sm:py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5"
      >
        {/* Left: Cloud Sync & Account Controls */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 text-xs">
          <span className="font-bold text-slate-900">የክላውድ ግንኙነት:</span>
          {isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold">
                <Cloud className="w-4 h-4 text-emerald-700" />
                <span className="truncate max-w-[180px] sm:max-w-none">
                  {isCloudSyncing
                    ? 'በማመሳከር ላይ (Syncing...)'
                    : `Synced (${userEmail || 'User'})`}
                </span>
              </span>
              <button
                type="button"
                onClick={onForceCloudPush}
                disabled={isCloudSyncing}
                className="min-h-[36px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>Cloud አዘምን</span>
              </button>
              <button
                type="button"
                onClick={onGoogleLogout}
                className="min-h-[36px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>ውጣ</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                <CloudOff className="w-4 h-4" />
                <span>Local Mode</span>
              </span>
              <button
                type="button"
                onClick={onOpenLoginScreen}
                className="min-h-[36px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                መግቢያ ገጽ
              </button>
              <button
                type="button"
                onClick={onGoogleLogin}
                className="min-h-[36px] px-3 py-1.5 bg-emerald-700 text-white rounded text-xs font-medium hover:bg-emerald-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>በGoogle ይግቡ</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Active Fiscal Year Selector, Bilingual Toggle, Import/Export */}
        <div className="pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex flex-wrap items-center justify-between sm:justify-start gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <span className="text-slate-600 font-semibold whitespace-nowrap">ንቁ ዓመት:</span>
            <select
              value={selectedYear}
              onChange={(e) => onSelectYear(e.target.value)}
              aria-label="የሂሳብ ዓመት ምረጥ"
              className="flex-1 sm:flex-initial min-h-[36px] bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              {yearsList.map((yr) => {
                const numOnly = yr.replace(' EC', '');
                return (
                  <option key={yr} value={yr}>
                    {yr === '2019 EC'
                      ? `${numOnly} ዓ.ም (2019 EC · Active)`
                      : `${numOnly} ዓ.ም (${yr})`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <LanguageSelector variant="select" className="flex-1 sm:flex-initial" />

            {onOpenMobileAppModal && (
              <button
                type="button"
                onClick={onOpenMobileAppModal}
                className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 bg-emerald-700 text-white rounded text-xs font-semibold hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android .APK አውርድ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenImportExportModal}
              className="flex-1 sm:flex-initial min-h-[36px] px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>ፋይል አስገባ / አውርድ</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SUB-TAB 1: DUAL-MODE BACKUP & EXPORT SYSTEM (OPTION A & OPTION B)
      ===================================================================== */}
      {activeSubTab === 'BACKUP' && (
        <div className="space-y-6">
          {/* Downloadable Mobile App & Shared Database Auto-Sync Banner */}
          {onOpenMobileAppModal && (
            <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    የአንድሮይድ ስልክ መተግበሪያ (Android .APK)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    1. APK አውርድ → 2. በስልክ ጫን (Install) → 3. ከክላውድ ጋር አመሳክር (Sync Cloud)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenMobileAppModal}
                className="min-h-[38px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Android .APK አውርድ</span>
              </button>
            </div>
          )}

          {/* Two-Column Dual-Mode Backup Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* OPTION A: REAL-TIME / ON-DEMAND GOOGLE SHEETS SYNC */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800">
                      አማራጭ A · Option A
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      Google Sheets ቀጥታ ማመሳከሪያ (On-Demand Sync)
                    </h2>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
                </div>

                {/* Google Account Connection Bar */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-slate-800 block">
                      የGoogle Workspace ግንኙነት ሁኔታ
                    </span>
                    <span className="text-xs text-slate-500">
                      {workspaceToken
                        ? `ተገናኝቷል (${userEmail || 'Active Google Account'}) · Sheets & Drive API Ready`
                        : userEmail
                        ? `መለያ: ${userEmail} · ለGoogle Sheets ፈቃድ ያረጋግጡ`
                        : 'ከGoogle መለያ ጋር አልተገናኘም'}
                    </span>
                  </div>

                  {/* Official Google Sign-In / Connect Button */}
                  <button
                    type="button"
                    onClick={handleConnectGoogleWorkspace}
                    className="px-3.5 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-semibold text-slate-800 shadow-2xs cursor-pointer"
                  >
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      className="w-4 h-4 shrink-0"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                    <span>
                      {workspaceToken ? 'Google Sheets ፈቃድ አድስ' : 'Connect Google Sheets'}
                    </span>
                  </button>
                </div>

                {/* Permission Lock Policy Toggle */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-md flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableExternalReadOnlyLink}
                      onChange={(e) => setEnableExternalReadOnlyLink(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>
                      የውጭ ተጠቃሚዎች ማንበብ ብቻ እንዲችሉ ቆልፍ (Read-Only Lock)
                    </span>
                  </label>
                  <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                </div>

                {/* Connected Sheet Info if exists for active year */}
                {activeConnection && (
                  <div className="p-3.5 bg-white border border-slate-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        ተያይዟል: {activeConnection.spreadsheetTitle}
                      </span>
                      <a
                        href={activeConnection.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Google Sheet ክፈት</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 font-mono tabular-nums">
                      <span>ID: {activeConnection.spreadsheetId.slice(0, 18)}...</span>
                      <span>·</span>
                      <span>መጨረሻ የተመሳከረው: {activeConnection.lastSyncedAt}</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-sans font-semibold">
                        Read-Only Locked
                      </span>
                    </div>
                  </div>
                )}

                {/* Sheet Title & Existing Sheet Selector */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      የGoogle Sheet ፋይል ስም (Spreadsheet Title for {selectedYear})
                    </label>
                    <input
                      type="text"
                      value={customSheetTitle}
                      onChange={(e) => setCustomSheetTitle(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  {/* Connect to an existing Google Sheet by ID/URL or Drive list */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      ወይም ነባር የGoogle Sheet URL / ID ያስገቡ (Optional Existing Sheet)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={manualSpreadsheetIdInput}
                        onChange={(e) => setManualSpreadsheetIdInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/... ወይም Spreadsheet ID"
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 font-mono focus:outline-none focus:border-emerald-700"
                      />
                      {manualSpreadsheetIdInput.trim() && (
                        <button
                          type="button"
                          disabled={isSyncingGoogleSheet}
                          onClick={() => {
                            const extractedId = extractSpreadsheetId(manualSpreadsheetIdInput);
                            setPendingGoogleSheetAction({
                              mode: 'SYNC_EXISTING',
                              targetSpreadsheetId: extractedId,
                              targetTitle: customSheetTitle,
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          ወደዚህ Sheet አመሳክር
                        </button>
                      )}
                    </div>
                  </div>

                  {driveSheets.length > 0 && (
                    <div>
                      <span className="block text-[11px] font-medium text-slate-500 mb-1">
                        በዚህ መተግበሪያ የተፈጠሩ የGoogle Sheets ፋይሎች:
                      </span>
                      <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                        {driveSheets.map((ds) => (
                          <div
                            key={ds.id}
                            className="px-3 py-1.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50"
                          >
                            <span className="truncate text-slate-800 font-medium">{ds.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingGoogleSheetAction({
                                    mode: 'SYNC_EXISTING',
                                    targetSpreadsheetId: ds.id,
                                    targetTitle: ds.name,
                                  })
                                }
                                className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                              >
                                አዘምን (Sync)
                              </button>
                              <a
                                href={ds.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-slate-700"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {googleSheetStatus && (
                  <div
                    className={`p-3 rounded-md border text-xs flex items-start gap-2 ${
                      googleSheetStatus.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {googleSheetStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <span>{googleSheetStatus.text}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons for Option A */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
                {activeConnection ? (
                  <>
                    <button
                      type="button"
                      disabled={isSyncingGoogleSheet}
                      onClick={() =>
                        setPendingGoogleSheetAction({
                          mode: 'SYNC_EXISTING',
                          targetSpreadsheetId: activeConnection.spreadsheetId,
                          targetTitle: activeConnection.spreadsheetTitle,
                        })
                      }
                      className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`}
                      />
                      <span>
                        {isSyncingGoogleSheet
                          ? 'በማመሳከር ላይ (Syncing...)'
                          : 'አሁን ወደ Google Sheet አመሳክር (Instant Sync)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={isSyncingGoogleSheet}
                      onClick={() =>
                        setPendingGoogleSheetAction({
                          mode: 'CREATE_NEW',
                          targetTitle: customSheetTitle,
                        })
                      }
                      className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>አዲስ Google Sheet ፍጠር</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSyncingGoogleSheet}
                    onClick={() =>
                      setPendingGoogleSheetAction({
                        mode: 'CREATE_NEW',
                        targetTitle: customSheetTitle,
                      })
                    }
                    className="w-full sm:w-auto min-h-[40px] px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isSyncingGoogleSheet ? 'animate-spin' : ''}`}
                    />
                    <span>
                      {isSyncingGoogleSheet
                        ? 'Google Sheet በመፍጠር እና በማመሳከር ላይ...'
                        : 'Google Sheet ፍጠር እና አሁን አመሳክር (Create & Sync Locked Sheet)'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* OPTION B: LOCAL EXCEL EXPORT (.XLSX) TO DESIGNATED FOLDER / PATH */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-sky-800">
                      አማራጭ B · Option B
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                      የአካባቢ Excel (.xlsx) መጠባበቂያ ማውረጃ
                    </h2>
                  </div>
                  <FolderOpen className="w-6 h-6 text-sky-700 shrink-0" />
                </div>

                {/* File Name & Target Path Configuration */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      የሪፖርት ዲዛይን ቴምፕሌት (Standard Excel & PDF System Template)
                    </label>
                    <select
                      value={localTemplateScope}
                      onChange={(e) => setLocalTemplateScope(e.target.value as ReportTemplateScope)}
                      className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer"
                    >
                      <option value="FULL_EXECUTIVE">
                        ሙሉ የሂሳብ ሪፖርት — 4 ሉሆች በሙሉ (Full 4-Sheet Executive Template)
                      </option>
                      <option value="RENTAL_ONLY">
                        ሉህ 1 ብቻ · የኪራይ ንብረት እና ወጪ ክፍፍል (Sheet 1 · Rental & Expenses)
                      </option>
                      <option value="MESFIN_STATEMENT">
                        ሉህ 2 ብቻ · የመስፍን የግል መግለጫ (Sheet 2 · Mesfin Statement · Blue)
                      </option>
                      <option value="ZEWDNESH_STATEMENT">
                        ሉህ 3 ብቻ · የዘውድነሽ የግል መግለጫ (Sheet 3 · Zewdnesh Statement · Purple)
                      </option>
                      <option value="GROCERIES_AUDIT">
                        ሉህ 4 ብቻ · የአስቤዛ እና ፍጆታ ሪፖርት (Sheet 4 · Groceries Audit)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      የExcel መጠባበቂያ ፋይል ስም (Target .xlsx File Name)
                    </label>
                    <input
                      type="text"
                      value={localFileName}
                      onChange={(e) => setLocalFileName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md font-mono text-slate-900 focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  {lastLocalSavedPath && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>
                          መጨረሻ የተቀመጠበት ፋይል: <strong className="font-mono">{lastLocalSavedPath}</strong>
                        </span>
                      </div>
                      {localFolderHandle && (
                        <button
                          type="button"
                          onClick={() => handleSaveToDesignatedFolder(true)}
                          className="text-xs font-semibold text-emerald-800 underline cursor-pointer shrink-0"
                        >
                          በድጋሚ አስቀምጥ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons for Option B */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isExportingLocal}
                    onClick={() => handleSaveToDesignatedFolder(false)}
                    className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>
                      አቃፊ ምረጥ እና Excel አስቀምጥ (Choose Folder & Save .xlsx)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportWorkbookToExcel(state, localFileName, selectedMonth, {
                        scope: localTemplateScope,
                        includeSignatures: true,
                      });
                      setLastLocalSavedPath(`Downloads/${localFileName}`);
                      onShowToast(`የ${selectedYear} መደበኛ Excel ፋይል (${localFileName}) ወርዷል።`);
                    }}
                    className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ቀጥታ አውርድ (Direct Download .xlsx)</span>
                  </button>
                </div>

                {/* Complete Multi-Year Excel Archive Button */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500">
                  <span>ሁሉንም {yearsList.length} የሂሳብ ዓመታት በአንድ የExcel ፋይል ማውረድ ይፈልጋሉ?</span>
                  <button
                    type="button"
                    onClick={() => {
                      exportMultiYearArchiveToExcel(workbooksByYear, yearsList);
                      onShowToast(`የሁሉም ዓመታት (${yearsList.length} Years) የExcel መጠባበቂያ ወርዷል!`);
                    }}
                    className="font-semibold text-sky-800 hover:underline cursor-pointer self-start sm:self-auto"
                  >
                    የሁሉም ዓመታት Excel አውርድ (.xlsx)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: SHARE CALCULATION RULES & SPLIT CONFIGURATION
      ===================================================================== */}
      {activeSubTab === 'RULES' && (
        <div className="space-y-6">
          {/* Create New Share Calculation Rule */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              አዲስ የድርሻ ስሌት ሕግ ፍጠር (Create Share Rule)
            </h2>

            <form
              onSubmit={handleAddShareRule}
              className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end pt-2"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  የሕጉ ስም (በአማርኛ)
                </label>
                <input
                  type="text"
                  value={newRuleLabelAm}
                  onChange={(e) => setNewRuleLabelAm(e.target.value)}
                  placeholder={`${newRuleMesfinPct}% መስፍን / ${100 - newRuleMesfinPct}% ዘውድነሽ`}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  የሕጉ ስም (English Optional)
                </label>
                <input
                  type="text"
                  value={newRuleLabelEn}
                  onChange={(e) => setNewRuleLabelEn(e.target.value)}
                  placeholder={`${newRuleMesfinPct}% Mesfin / ${100 - newRuleMesfinPct}% Zewdnesh`}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  የመስፍን ድርሻ % (ዘውድነሽ = {100 - newRuleMesfinPct}%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={newRuleMesfinPct}
                    onChange={(e) => setNewRuleMesfinPct(Number(e.target.value))}
                    className="flex-1 accent-emerald-700 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRuleMesfinPct}
                    onChange={(e) =>
                      setNewRuleMesfinPct(
                        Math.min(Math.max(0, Number(e.target.value) || 0), 100)
                      )
                    }
                    className="w-16 px-2 py-1 text-xs bg-white border border-slate-300 rounded-md font-mono tabular-nums text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  የሚያገለግለው (Scope)
                </label>
                <select
                  value={newRuleAppliesTo}
                  onChange={(e) =>
                    setNewRuleAppliesTo(e.target.value as 'BOTH' | 'INCOME' | 'EXPENSE')
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="BOTH">ለኪራይ ገቢ እና ለወጪ (Both)</option>
                  <option value="INCOME">ለኪራይ ገቢ ብቻ (Income Only)</option>
                  <option value="EXPENSE">ለወጪ ብቻ (Expense Only)</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ሕግ ጨምር (Add Rule)</span>
                </button>
              </div>
            </form>
          </div>

          {/* Configured Share Calculation Rules Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                የተዋቀሩ የድርሻ ስሌት ሕጎች ዝርዝር (Configured Share Rules)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-4 font-semibold">የሕጉ መጠሪያ (Rule Label)</th>
                    <th className="py-2.5 px-4 font-semibold">የሚያገለግለው</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-blue-700">የመስፍን ድርሻ % (Blue)</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-purple-700">የዘውድነሽ ድርሻ % (Purple)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">ፈጣን ተግባር (Bulk Apply)</th>
                    <th className="py-2.5 px-4 font-semibold text-center w-24">ድርጊት</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {shareRules.map((rule) => {
                    const isEditing = editingRuleId === rule.id;
                    const mPct = Math.round(rule.mesfinRatio * 100);
                    const zPct = Math.round(rule.zewdneshRatio * 100);

                    return (
                      <tr key={rule.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editRuleLabelAm}
                              onChange={(e) => setEditRuleLabelAm(e.target.value)}
                              className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded w-64"
                            />
                          ) : (
                            <div>
                              <span>{rule.labelAm}</span>
                              {bilingual && rule.labelEn && (
                                <span className="text-slate-400 font-normal ml-1.5">
                                  · {rule.labelEn}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {isEditing ? (
                            <select
                              value={editRuleAppliesTo}
                              onChange={(e) =>
                                setEditRuleAppliesTo(
                                  e.target.value as 'BOTH' | 'INCOME' | 'EXPENSE'
                                )
                              }
                              className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                            >
                              <option value="BOTH">ገቢ እና ወጪ</option>
                              <option value="INCOME">ገቢ ብቻ</option>
                              <option value="EXPENSE">ወጪ ብቻ</option>
                            </select>
                          ) : rule.appliesTo === 'BOTH' ? (
                            'ለኪራይ ገቢ እና ወጪ'
                          ) : rule.appliesTo === 'INCOME' ? (
                            'ለኪራይ ገቢ ብቻ'
                          ) : (
                            'ለወጪ ብቻ'
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-blue-700">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editRuleMesfinPct}
                              onChange={(e) =>
                                setEditRuleMesfinPct(
                                  Math.min(Math.max(0, Number(e.target.value) || 0), 100)
                                )
                              }
                              className="w-16 px-2 py-1 text-right bg-white border border-slate-300 rounded font-mono"
                            />
                          ) : (
                            `${mPct}%`
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-purple-700">
                          {isEditing ? `${100 - editRuleMesfinPct}%` : `${zPct}%`}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {(rule.appliesTo === 'BOTH' || rule.appliesTo === 'INCOME') && (
                              <button
                                type="button"
                                onClick={() => handlePropagateRuleToAll(rule, 'TENANTS')}
                                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                ለሁሉም ተከራዮች ተግብር
                              </button>
                            )}
                            {(rule.appliesTo === 'BOTH' || rule.appliesTo === 'EXPENSE') && (
                              <button
                                type="button"
                                onClick={() => handlePropagateRuleToAll(rule, 'EXPENSES')}
                                className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                ለሁሉም ወጪዎች ተግብር
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveEditedRule(rule)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 rounded hover:bg-emerald-800 cursor-pointer"
                              >
                                አስቀምጥ
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRuleId(null)}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                ተው
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRuleId(rule.id);
                                  setEditRuleLabelAm(rule.labelAm);
                                  setEditRuleMesfinPct(Math.round(rule.mesfinRatio * 100));
                                  setEditRuleAppliesTo(rule.appliesTo);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-800 rounded cursor-pointer"
                                title="ሕግ አስተካክል"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {!rule.isSystemDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="ሕግ ሰርዝ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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

      {/* =====================================================================
          SUB-TAB 3: MULTI-YEAR / FISCAL PERIOD MANAGEMENT
      ===================================================================== */}
      {activeSubTab === 'YEARS' && (
        <div className="space-y-6">
          {/* Add New Fiscal Year / Period Card */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              አዲስ የሂሳብ ዓመት / የበጀት ዘመን ጨምር (Add Fiscal Year)
            </h2>

            <form
              onSubmit={handleCreateFiscalYear}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-2"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  የሂሳብ ዓመት መጠሪያ (Year / Fiscal Period)
                </label>
                <input
                  type="text"
                  required
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="ምሳሌ፡ 2023 EC ወይም 2016 EC"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  የመነሻ ዓመት ምንጭ (Source Template Year)
                </label>
                <select
                  value={newYearSource}
                  onChange={(e) => setNewYearSource(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {yearsList.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  የመረጃ አጀማመር ሁኔታ (Initialization Mode)
                </label>
                <select
                  value={newYearInitMode}
                  onChange={(e) => setNewYearInitMode(e.target.value as YearInitMode)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="TEMPLATE_RENTS">
                    ተከራዮች፣ የስሌት ሕጎች እና መደበኛ የኪራይ መጠን (Standard Template)
                  </option>
                  <option value="ZERO_AMOUNTS">
                    ተከራዮች እና የስሌት ሕጎች ብቻ — ባዶ (0) መጠን (Zero Amounts)
                  </option>
                  <option value="CLONE_SOURCE">
                    ከተመረጠው ዓመት ሙሉ መረጃ ቅዳ (Clone Full Data)
                  </option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ዓመት ፍጠር እና ክፈት</span>
                </button>
              </div>
            </form>
          </div>

          {/* All Configured Years Overview Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                ሁሉም የሂሳብ ዓመታት (Configured Fiscal Years)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-4 font-semibold">የሂሳብ ዓመት (Fiscal Year)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">ተከራዮች</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-emerald-700">ዓመታዊ ጠቅላላ ገቢ (+)</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-red-700">ዓመታዊ ወጪ (-)</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-blue-700">የመስፍን ዓመታዊ የተጣራ</th>
                    <th className="py-2.5 px-4 font-semibold text-right text-purple-700">የዘውድነሽ ዓመታዊ የተጣራ</th>
                    <th className="py-2.5 px-4 font-semibold text-center">ድርጊት</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {yearsList.map((yr) => {
                    const yrState = workbooksByYear[yr];
                    const yrCalc = yrState
                      ? calculateRentalSummary(yrState, 'ANNUAL')
                      : null;
                    const isCurrent = yr === selectedYear;

                    return (
                      <tr
                        key={yr}
                        className={`transition-colors ${
                          isCurrent ? 'bg-emerald-50/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <span>{yr}</span>
                          {isCurrent && (
                            <span className="ml-2 text-[11px] font-semibold text-emerald-800">
                              · ንቁ (Active)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {yrState ? yrState.tenants.length : 9}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {yrCalc ? `+${formatETB(yrCalc.annualGrossIncome)} ብር` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-red-700">
                          {yrCalc && yrCalc.annualTotalExpenses > 0
                            ? `-${formatETB(yrCalc.annualTotalExpenses)} ብር`
                            : '0 ብር'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-blue-700">
                          {yrCalc ? `${formatETB(yrCalc.annualMesfinNet)} ብር` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-purple-700">
                          {yrCalc ? `${formatETB(yrCalc.annualZewdneshNet)} ብር` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => onSelectYear(yr)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 cursor-pointer"
                              >
                                ምረጥ (Switch)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (yrState) {
                                  exportWorkbookToExcel(
                                    yrState,
                                    `Rental_Property_Expense_${yr.replace(/\s+/g, '_')}.xlsx`,
                                    yr === '2018 EC' ? 'ሐምሌ' : 'ጥቅምት'
                                  );
                                  onShowToast(`የ${yr} Excel ፋይል ወርዷል።`);
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                              title="Excel አውርድ"
                            >
                              .xlsx አውርድ
                            </button>
                            <button
                              type="button"
                              onClick={() => onResetYear(yr)}
                              className="p-1 text-slate-400 hover:text-amber-700 rounded cursor-pointer"
                              title="ዓመቱን ወደ መነሻ ዳታ መልስ (Reset Year)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            {yr !== '2019 EC' && yearsList.length > 1 && (
                              <>
                                {confirmDeleteYear === yr ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteYear(yr);
                                        setConfirmDeleteYear(null);
                                      }}
                                      className="px-2 py-0.5 text-[11px] bg-rose-700 text-white rounded cursor-pointer"
                                    >
                                      አረጋግጥ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteYear(null)}
                                      className="px-1.5 py-0.5 text-[11px] text-slate-500 cursor-pointer"
                                    >
                                      ተው
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteYear(yr)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="ዓመት ሰርዝ"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
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

      {/* =====================================================================
          SUB-TAB 4: CATEGORIZED HELP CENTER & SYSTEM DOCUMENTATION
      ===================================================================== */}
      {activeSubTab === 'HELP' && (
        <div className="space-y-6">
          {/* Help Center Header & Category Filter Strip */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-purple-700 shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    የእገዛ ማዕከል እና የሥርዓቱ ዝርዝር መመሪያ (System Help Center)
                  </h2>
                  <p className="text-xs text-slate-500">
                    የመተግበሪያው የቀለም ሕጎች፣ የ4ቱ ሉሆች አወቃቀር፣ የድርሻ ስሌት ቀመሮች እና የመጠባበቂያ አሠራር በምድብ ተከፋፍለው ቀርበዋል።
                  </p>
                </div>
              </div>
            </div>

            {/* Category Selector Buttons (Horizontally Scrollable on Mobile) */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  ['ALL', 'ሁሉም ምድቦች (All Categories)'],
                  ['COLORS', '1. የቀለም መለያ ሥርዓት (Color System)'],
                  ['SHEETS', '2. 4ቱ የExcel ሉሆች (4 Sheets Schema)'],
                  ['FORMULAS', '3. የድርሻ ስሌት ቀመሮች (Formulas & Rules)'],
                  ['SYNC', '4. የሉሆች ማመሳከሪያ (Cross-Sheet Audit)'],
                  ['YEARS', '5. የብዙ ዓመታት አስተዳደር (Multi-Year)'],
                  ['BACKUP', '6. Google Sheets መቆለፊያ & Excel Backup'],
                ] as [typeof helpCategory, string][]
              ).map(([catId, label]) => (
                <button
                  key={catId}
                  type="button"
                  onClick={() => setHelpCategory(catId)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    helpCategory === catId
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* CATEGORY 1: 4-COLOR SEMANTIC SYSTEM */}
            {(helpCategory === 'ALL' || helpCategory === 'COLORS') && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <Palette className="w-4 h-4 text-blue-600 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900">
                    ምድብ 1 · የቀለም መለያ ሥርዓት (4-Color Semantic System)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  በመተግበሪያው ውስጥ ያሉ ሁሉም ቻርቶች፣ ሰንጠረዦች እና የሂሳብ አመልካቾች የአጋሮችን ማንነት ከገንዘብ ፍሰት አቅጣጫ (ገቢ/ወጪ) ለመለየት 4 ቋሚ ቀለሞችን ይጠቀማሉ፦
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-md flex items-start gap-3">
                    <span className="w-3.5 h-3.5 rounded-xs bg-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-blue-900 block">መስፍን (Mesfin) — ሰማያዊ (Blue · #2563EB)</strong>
                      <span className="text-slate-600">
                        የመስፍን የኪራይ ገቢ ድርሻ፣ የወጪ ድርሻ፣ የቻርት ክፍሎች እና የመስፍን የግል ሂሳብ መዝገብ (ሉህ 2) ሁልጊዜ በሰማያዊ ቀለም ይወከላሉ።
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-md flex items-start gap-3">
                    <span className="w-3.5 h-3.5 rounded-xs bg-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-purple-900 block">ዘውድነሽ (Zewdnesh) — ወይንጠጅ (Purple · #7C3AED)</strong>
                      <span className="text-slate-600">
                        የዘውድነሽ የኪራይ ገቢ ድርሻ፣ የወጪ ድርሻ፣ የቻርት ክፍሎች እና የዘውድነሽ የግል ተቀማጭና ወጪ መዝገብ (ሉህ 3) ሁልጊዜ በወይንጠጅ ቀለም ይወከላሉ።
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-md flex items-start gap-3">
                    <span className="w-3.5 h-3.5 rounded-xs bg-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 block">አዎንታዊ እሴቶች (+ገቢ / ትርፍ) — አረንጓዴ (Green · #059669)</strong>
                      <span className="text-slate-600">
                        ጠቅላላ የቤት ኪራይ ገቢ፣ የግል ተቀማጭ ገንዘብ እና አዎንታዊ የተጣራ ቀሪ ሂሳብ (&gt; 0) በአረንጓዴ (+) ይጻፋሉ።
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-red-50/50 border border-red-200 rounded-md flex items-start gap-3">
                    <span className="w-3.5 h-3.5 rounded-xs bg-red-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-red-900 block">አሉታዊ እሴቶች (-ወጪ / ቅናሽ) — ቀይ (Red · #DC2626)</strong>
                      <span className="text-slate-600">
                        የንብረት ወጪዎች፣ ተቀናሾች፣ የግል ወጪዎች፣ የአስቤዛ ወጪ እና ጉድለት (&lt; 0) በቀይ (-) ይጻፋሉ።
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 2: 4 LINKED SHEETS & SOURCE EXCEL SCHEMA */}
            {(helpCategory === 'ALL' || helpCategory === 'SHEETS') && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <Layers className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900">
                    ምድብ 2 · 4ቱ የተያያዙ ሉሆች እና የExcel ቅርጸት (4 Linked Sheets Schema)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  መተግበሪያው ከኦሪጅናል የExcel ፋይልዎ (<span className="font-mono text-slate-800">Rental_Property_Expense_683e5269.xlsx</span>) ጋር 100% ተመሳሳይ የሆኑ 4 የተያያዙ ሉሆችን ይይዛል፦
                </p>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <strong className="text-slate-900 block">1. የኪራይ_እና_ወጪ (Sheet 1 · Rental & Property Expenses)</strong>
                    <span className="text-slate-600">
                      የአዲስ አበባ {state.tenants.length} ተከራዮች ወርሃዊ ኪራይ (ከመስከረም እስከ ነሐሴ)፣ {state.propertyExpenses.length} የንብረት ወጪ መስመሮች (ጥበቃ፣ መብራት፣ እቁብ፣ እድር፣ አስቤዛ፣ ጥገና፣ ግብር፣ ውሃ፣ ማዘጋጃ)፣ የማጠቃለያ ሰንጠረዥ እና የተጣራ ገቢ ማረጋገጫን ያካትታል።
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <strong className="text-blue-900 block">2. የመስፍን_መዝገብ (Sheet 2 · Mesfin's Personal Ledger)</strong>
                    <span className="text-slate-600">
                      የመስፍን ወርሃዊ የቤት ኪራይ ድርሻ ገቢዎች፣ የግል ወጪዎች (የቤት ጥገና፣ የውሃና መብራት፣ የንብረት ግብር) እና የተጣራ ቀሪ ሂሳብ መከታተያ።
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <strong className="text-purple-900 block">3. የዘውድነሽ_መዝገብ (Sheet 3 · Zewdnesh's Personal Ledger)</strong>
                    <span className="text-slate-600">
                      የዘውድነሽ የመጀመሪያ እና ተጨማሪ ተቀማጭ ገንዘብ፣ ለተለያዩ ተከፋዮች የተደረጉ ክፍያዎች (ምሳሌ፡ ጋሻው፣ ወሰኔ፣ ማማ፣ ፋार्माሲ፣ ዶሮና እንቁላል) እና ቀሪ ተቀማጭ ሂሳብ።
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                    <strong className="text-emerald-900 block">4. የአስቤዛ_መከታተያ (Sheet 4 · Groceries & Consumables Tracker)</strong>
                    <span className="text-slate-600">
                      በ7 ምድቦች የተከፋፈሉ {state.groceries.length} የቤት ውስጥ የፍጆታ ዕቃዎች ዝርዝር፣ መለኪያ፣ ዋጋ እና የግዢ ሁኔታ (ተገዝቷል / አልተገዛም) መከታተያ።
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 3: SHARE CALCULATION RULES & FORMULAS */}
            {(helpCategory === 'ALL' || helpCategory === 'FORMULAS') && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <Calculator className="w-4 h-4 text-sky-700 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900">
                    ምድብ 3 · የድርሻ ስሌት ሕጎች እና የሂሳብ ቀመሮች (Calculation Formulas)
                  </h3>
                </div>
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <strong className="text-slate-900 block">1. የተከራይ ኪራይ ክፍፍል (Tenant Income Split Rules)</strong>
                    <p className="text-slate-600">
                      እያንዳንዱ ተከራይ የራሱ የክፍፍል ሕግ አለው፦ <strong>50% መስፍን / 50% ዘውድነሽ</strong>፣ <strong>100% መስፍን ብቻ</strong>፣ <strong>100% ዘውድነሽ ብቻ</strong> ወይም በ«የስሌት ሕጎች» ትር ውስጥ የሚፈጥሩት ማንኛውም ብጁ መቶኛ (ምሳሌ፡ 60%/40%)።
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <strong className="text-slate-900 block">2. የወጪ ክፍፍል (Property Expense Split Rules)</strong>
                    <p className="text-slate-600">
                      ወርሃዊ ወጪዎች እንደ ሕጉ በጋራ (50% - 50%) ወይም በተናጠል ለአንዱ አጋር ይከፈላሉ።
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1 font-mono text-[11px]">
                    <strong className="font-sans text-xs text-slate-900 block">3. የተጣራ ገቢ እና ማረጋገጫ ቀመር (Net & Reconciliation Formula)</strong>
                    <div className="text-emerald-800">• ጠቅላላ የተጣራ ገቢ = ጠቅላላ የኪራይ ገቢ (+) - ጠቅላላ ወጪ (-)</div>
                    <div className="text-blue-800">• የመስፍን የተጣራ ድርሻ = የመስፍን ጠቅላላ ገቢ - የመስፍን ወጪ</div>
                    <div className="text-purple-800">• የዘውድነሽ የተጣራ ድርሻ = የዘውድነሽ ጠቅላላ ገቢ - የዘውድነሽ ወጪ</div>
                    <div className="text-slate-800">• ማረጋገጫ (Audit Check): የተጣራ ገቢ === (የመስፍን የተጣራ + የዘውድነሽ የተጣራ)</div>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 4: CROSS-SHEET SYNCHRONIZATION & AUDIT */}
            {(helpCategory === 'ALL' || helpCategory === 'SYNC') && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <RefreshCw className="w-4 h-4 text-blue-700 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900">
                    ምድብ 4 · የሉሆች እርስ-በርስ ማመሳከሪያ (Cross-Sheet Synchronization)
                  </h3>
                </div>
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <strong className="text-slate-900 block">
                      ከሉህ 1 (የኪራይ ክፍፍል) → ወደ ሉህ 2 (የመስፍን የግል መዝገብ)
                    </strong>
                    <p>
                      በሉህ 1 ላይ የመስፍን ወርሃዊ የተጣራ የኪራይ ድርሻ ሲሰላ፣ «ወደ መስፍን መዝገብ አመሳክር» የሚለውን ቁልፍ በመጫን በቀጥታ ወደ መስፍን የግል የገቢ ሰንጠረዥ እንዲገባ ማድረግ ይቻላል።
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <strong className="text-slate-900 block">
                      ከሉህ 4 (የአስቤዛ መከታተያ) → ወደ ሉህ 1 (ወርሃዊ የወጪ ሰንጠረዥ)
                    </strong>
                    <p>
                      በሉህ 4 ላይ የተገዙ የአስቤዛ ዕቃዎች ጠቅላላ ወጪ ሲደመር፣ «ወደ ወርሃዊ ወጪ ሰንጠረዥ አመሳክር» የሚለውን ቁልፍ በመጫን በሉህ 1 የወጪ ሰንጠረዥ ውስጥ ባለው «አስቤዛ» መስመር ላይ በራሱ እንዲሞላ ያደርጋል።
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CATEGORY 5: MULTI-YEAR / FISCAL PERIOD MANAGEMENT */}
            {(helpCategory === 'ALL' || helpCategory === 'YEARS') && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900">
                    ምድብ 5 · የብዙ ዓመታት የበጀት ዘመን አስተዳደር (Multi-Year Management)
                  </h3>
                </div>
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    እያንዳንዱ የኢትዮጵያ የሂሳብ ዓመት (ምሳሌ፡ 2017 EC፣ 2018 EC፣ 2019 EC፣ 2020 EC...) ራሱን የቻለ 4 ሉሆች ያሉት ሲሆን፣ አዲስ ዓመት ሲፈጥሩ 3 የመረጃ አጀማመር አማራጮች አሉዎት፦
                  </p>
                  <ul className="space-y-2 list-disc list-inside text-slate-700">
                    <li>
                      <strong>Standard Template:</strong> የተከራዮችን ስም፣ የድርሻ ሕጎችን እና መደበኛ የኪራይ መጠን ይይዛል።
                    </li>
                    <li>
                      <strong>Zero Amounts (ባዶ መጠን):</strong> የተከራዮችን ስም እና የድርሻ ሕጎችን ብቻ ወስዶ ሁሉንም ቁጥሮች በዜሮ (0) ይጀምራል።
                    </li>
                    <li>
                      <strong>Clone Full Data (ሙሉ ቅጂ):</strong> ከመረጡት ነባር ዓመት ሙሉውን መረጃ እንዳለ ይቀዳል።
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* CATEGORY 6: CLOUD SYNC, GOOGLE SHEETS LOCK & LOCAL EXCEL BACKUP */}
            {(helpCategory === 'ALL' || helpCategory === 'BACKUP') && (
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h3 className="text-base font-bold text-slate-900">
                    ምድብ 6 · Google Sheets መቆለፊያ እና የExcel መጠባበቂያ (Backup & Security)
                  </h3>
                </div>
                <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <strong className="text-emerald-900 block">
                      አማራጭ A · Google Sheets ቀጥታ ማመሳከሪያ እና Read-Only Lock
                    </strong>
                    <p>
                      ከGoogle መለያዎ ጋር ተገናኝቶ 4ቱንም ሉሆች በGoogle Driveዎ ላይ ይፈጥራል/ያዘምናል። ሁሉም 4 ሉሆች በ<strong>ProtectedRange</strong> ይቆለፋሉ፤ የውጭ ተጠቃሚዎች ማንበብ ብቻ (Read-Only) እንዲችሉ ተደርጎ የማስተካከል (Edit) መብት ለዚህ መተግበሪያ እና ለባለቤቱ ብቻ ይገደባል።
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                    <strong className="text-sky-900 block">
                      አማራጭ B · የአካባቢ Excel (.xlsx) መጠባበቂያ
                    </strong>
                    <p>
                      «አቃፊ ምረጥ እና Excel አስቀምጥ» የሚለውን በመጠቀም በኮምፒውተርዎ ላይ ወደ መረጡት ፎልደር ወይም በቀጥታ ማውረጃ (Direct Download) የአንድን ዓመት ወይም የሁሉንም ዓመታት ሙሉ የExcel (.xlsx) ፋይል ማውረድ ይችላሉ።
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MANDATORY USER CONFIRMATION DIALOG FOR GOOGLE SHEETS MUTATION
      ===================================================================== */}
      {pendingGoogleSheetAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  የGoogle Sheet ማመሳከሪያ እና የፈቃድ መቆለፊያ ማረጋገጫ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm Google Sheets Data Synchronization & Read-Only Permission Lock
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 space-y-2">
              <p>
                <strong>ተግባር:</strong>{' '}
                {pendingGoogleSheetAction.mode === 'CREATE_NEW'
                  ? `አዲስ Google Sheet ("${pendingGoogleSheetAction.targetTitle}") በGoogle Driveዎ ላይ ይፈጠራል እና 4ቱም ሉሆች ይሞላሉ።`
                  : `ነባሩ Google Sheet ("${pendingGoogleSheetAction.targetTitle}") በ${selectedYear} ወቅታዊ መረጃ ይዘምናል (Overwrite/Update)።`}
              </p>
              <p>
                <strong>የሚዘምኑ 4 ሉሆች:</strong> የኪራይ_እና_ወጪ፣ የመስፍን_መዝገብ፣ የዘውድነሽ_መዝገብ፣ የአስቤዛ_መከታተያ
              </p>
              <p>
                <strong>የፈቃድ መቆለፊያ:</strong> የውጭ ተጠቃሚዎች ማንበብ ብቻ (Read-Only) እንዲችሉ ይቆለፋል፤ የማስተካከል መብት ለዚህ መተግበሪያ ብቻ የተገደበ ይሆናል።
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingGoogleSheetAction(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
              >
                ይቅር (Cancel)
              </button>
              <button
                type="button"
                onClick={executeConfirmedGoogleSheetSync}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 cursor-pointer"
              >
                አረጋግጥ እና አመሳክር (Confirm & Sync)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
