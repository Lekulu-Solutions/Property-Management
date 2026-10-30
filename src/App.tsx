import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Settings,
  BarChart3,
  Building2,
  UserCheck,
  Wallet,
  ShoppingBasket,
  Droplets,
  WifiOff,
  Lock,
  Pencil,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import {
  AVAILABLE_YEARS,
  createBlankMonthGroceries,
  createBlankMonthWater,
  createWorkbookForYear,
  DEFAULT_SHARE_RULES,
  DEFAULT_WATER_RATE,
  ensureMonthlyGroceries,
  ensureMonthlyWater,
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  getGroceriesForMonth,
  getWaterForMonth,
  GroceryItem,
  INITIAL_WORKBOOK_STATE,
  LedgerEntry,
  PropertyExpenseRow,
  ShareRuleConfig,
  SplitType,
  TenantRentalRow,
  WaterRecordItem,
  WorkbookState,
  YearInitMode,
} from './data/initialLedgerData';
import {
  calculateGroceriesSummary,
  calculateRentalSummary,
  calculateWaterSummary,
  exportWorkbookToExcel,
  formatETB,
  ReportTemplateScope,
} from './utils/excelParser';
import {
  auth,
  logOutFirebase,
  signInWithGoogle,
  syncCloudSessionToApkServer,
} from './firebase';
import {
  ensureAndSeedWorkbookInFirestore,
  flushPendingFirestoreWrites,
  fsCreateGroceryItem,
  fsCreateLedgerEntry,
  fsCreatePropertyExpense,
  fsCreateTenant,
  fsCreateWaterRecord,
  fsDeleteGroceryItem,
  fsDeleteLedgerEntry,
  fsDeletePropertyExpense,
  fsDeleteTenant,
  fsDeleteWaterRecord,
  fsSaveMonthGroceriesBatch,
  fsSaveMonthWaterBatch,
  fsUpdateExpenseMonth,
  fsUpdateExpenseSplit,
  fsUpdateGroceryItem,
  fsUpdateLedgerEntry,
  fsUpdateTenantMonth,
  fsUpdateTenantSplit,
  fsUpdateWaterRecord,
  subscribeToWorkbook,
  uploadFullWorkbookToFirestore,
} from './services/firestoreSync';
import { VisualAnalytics } from './components/VisualAnalytics';
import { RentalSplitSheet } from './components/RentalSplitSheet';
import { PersonalLedgerSheet } from './components/PersonalLedgerSheet';
import { GroceriesTrackerSheet } from './components/GroceriesTrackerSheet';
import { WaterTrackerSheet } from './components/WaterTrackerSheet';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsAndBackupCenter } from './components/SettingsAndBackupCenter';
import { LoginPage } from './components/LoginPage';
import { PdfReportModal } from './components/PdfReportModal';
import { MobileAppModal } from './components/MobileAppModal';
import {
  AuditAndSecurityModal,
  AuditLogEntry,
  PaymentReceiptModal,
  PinPromptModal,
  ReceiptDataPayload,
  WorkbookSnapshot,
} from './components/EnterpriseSuiteModals';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { LanguageSelector, useLanguage } from './utils/i18n';

type ActiveTab =
  | 'analytics'
  | 'rental'
  | 'mesfin'
  | 'zewdnesh'
  | 'groceries'
  | 'water'
  | 'settings';

type EditableSheetId = 'rental' | 'mesfin' | 'zewdnesh' | 'groceries' | 'water';

const STORAGE_MAP_KEY = 'mesfin_zewdnesh_workbooks_by_year_v2';
const LEGACY_STORAGE_KEY = 'mesfin_zewdnesh_ledger_v1';
const YEARS_LIST_STORAGE_KEY = 'mesfin_zewdnesh_years_list_v1';
const SHARE_RULES_STORAGE_KEY = 'mesfin_zewdnesh_share_rules_v1';
const AUDIT_LOGS_STORAGE_KEY = 'mesfin_zewdnesh_audit_logs_v1';
const SNAPSHOTS_STORAGE_KEY = 'mesfin_zewdnesh_snapshots_v1';
const CLOSED_MONTHS_STORAGE_KEY = 'mesfin_zewdnesh_closed_months_v1';
const ADMIN_PIN_STORAGE_KEY = 'mesfin_zewdnesh_admin_pin_v1';

const DEFAULT_SHEET_VIEW_ONLY: Record<EditableSheetId, boolean> = {
  rental: true,
  mesfin: true,
  zewdnesh: true,
  groceries: true,
  water: true,
};

export default function App() {
  const [yearsList, setYearsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(YEARS_LIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [...AVAILABLE_YEARS];
  });

  const [shareRules, setShareRules] = useState<ShareRuleConfig[]>(() => {
    try {
      const saved = localStorage.getItem(SHARE_RULES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_SHARE_RULES;
  });

  const [selectedYear, setSelectedYear] = useState<string>('2019 EC');

  const [workbooksByYear, setWorkbooksByYear] = useState<Record<string, WorkbookState>>(() => {
    try {
      const savedMap = localStorage.getItem(STORAGE_MAP_KEY);
      if (savedMap) {
        const parsedMap = JSON.parse(savedMap);
        if (parsedMap && typeof parsedMap === 'object' && parsedMap['2019 EC']) {
          return parsedMap;
        }
      }
      const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacySaved) {
        const parsedLegacy = JSON.parse(legacySaved);
        if (parsedLegacy && Array.isArray(parsedLegacy.tenants)) {
          return {
            '2019 EC': { ...parsedLegacy, yearEC: '2019 EC' },
          };
        }
      }
    } catch {
      // fallback to initial
    }
    return {
      '2019 EC': INITIAL_WORKBOOK_STATE,
    };
  });

  const state: WorkbookState =
    workbooksByYear[selectedYear] || createWorkbookForYear(selectedYear);

  const updateCurrentYearState = (
    updater: (prev: WorkbookState) => WorkbookState
  ) => {
    setWorkbooksByYear((prevMap) => {
      const currentWb = prevMap[selectedYear] || createWorkbookForYear(selectedYear);
      const nextWb = updater(currentWb);
      return {
        ...prevMap,
        [selectedYear]: {
          ...nextWb,
          yearEC: selectedYear,
        },
      };
    });
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('analytics');
  const [selectedMonth, setSelectedMonth] = useState<EthiopianMonth | 'ANNUAL'>('ጥቅምት');
  const { langMode, setLangMode, bilingual } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState<boolean>(false);
  const [pdfReportScope, setPdfReportScope] = useState<ReportTemplateScope>('FULL_EXECUTIVE');
  const [isMobileAppModalOpen, setIsMobileAppModalOpen] = useState<boolean>(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const { isOnline } = useOnlineStatus();

  const [sheetViewOnly, setSheetViewOnly] = useState<Record<EditableSheetId, boolean>>(() => ({
    ...DEFAULT_SHEET_VIEW_ONLY,
  }));

  // Enterprise Suite States: Audit Log, Snapshots, Closed Months, Admin PIN, Receipt Modal
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptDataPayload | null>(null);
  const [pendingPinTarget, setPendingPinTarget] = useState<EditableSheetId | 'ALL' | null>(null);
  const [lastUndoableEntry, setLastUndoableEntry] = useState<AuditLogEntry | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 60);
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [snapshots, setSnapshots] = useState<WorkbookSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 25);
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [closedMonthsByYear, setClosedMonthsByYear] = useState<Record<string, EthiopianMonth[]>>(
    () => {
      try {
        const saved = localStorage.getItem(CLOSED_MONTHS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch {
        // ignore
      }
      return {};
    }
  );

  const [adminPin, setAdminPin] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_PIN_STORAGE_KEY);
      if (saved && saved.trim().length >= 4) {
        return saved.trim();
      }
    } catch {
      // ignore
    }
    return '8998';
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(auditLogs.slice(0, 60)));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots.slice(0, 25)));
    } catch {
      // ignore
    }
  }, [snapshots]);

  useEffect(() => {
    try {
      localStorage.setItem(CLOSED_MONTHS_STORAGE_KEY, JSON.stringify(closedMonthsByYear));
    } catch {
      // ignore
    }
  }, [closedMonthsByYear]);

  // Firebase Auth & Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isLocalModeBypass, setIsLocalModeBypass] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (window.location.protocol === 'file:') return true;
    const saved = localStorage.getItem('mz_local_mode_bypass');
    if (saved !== null) return saved === '1';
    // Default to true on localhost so user is never blocked from entering the system
    return true;
  });

  const updateLocalModeBypass = (enabled: boolean) => {
    setIsLocalModeBypass(enabled);
    try {
      localStorage.setItem('mz_local_mode_bypass', enabled ? '1' : '0');
    } catch {
      // ignore
    }
  };
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<Error | null>(null);

  if (runtimeError) {
    throw runtimeError;
  }

  const workbooksRef = useRef(workbooksByYear);
  workbooksRef.current = workbooksByYear;
  const isRemoteBroadcastRef = useRef(false);

  // Instant cross-window / mobile-web BroadcastChannel sync
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('mz_ledger_realtime_sync_v1');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'WORKBOOKS_UPDATED' && event.data.payload) {
        isRemoteBroadcastRef.current = true;
        setWorkbooksByYear((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(event.data.payload)) return prev;
          return event.data.payload;
        });
        setLastSyncedTime(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_MAP_KEY, JSON.stringify(workbooksByYear));
        if (!isRemoteBroadcastRef.current && typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('mz_ledger_realtime_sync_v1');
          channel.postMessage({ type: 'WORKBOOKS_UPDATED', payload: workbooksByYear });
          channel.close();
        }
        isRemoteBroadcastRef.current = false;
        syncCloudSessionToApkServer().catch(() => {});
      } catch {
        // ignore storage quota errors
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [workbooksByYear]);

  useEffect(() => {
    const handleVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingFirestoreWrites().catch(() => {});
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityOrUnload);
    window.addEventListener('beforeunload', () => {
      flushPendingFirestoreWrites().catch(() => {});
    });
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrUnload);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(YEARS_LIST_STORAGE_KEY, JSON.stringify(yearsList));
    } catch {
      // ignore
    }
  }, [yearsList]);

  useEffect(() => {
    try {
      localStorage.setItem(SHARE_RULES_STORAGE_KEY, JSON.stringify(shareRules));
    } catch {
      // ignore
    }
  }, [shareRules]);

  const showToast = (msg: string) => {
    setToastText(msg);
    setTimeout(() => {
      setToastText((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Monitor Firebase Auth State (with fast offline fallback for Android APK)
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsAuthReady(true);
    }, 1000);
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      clearTimeout(fallbackTimer);
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => {
      clearTimeout(fallbackTimer);
      unsubAuth();
    };
  }, []);

  // Attach Firestore listeners for the active selectedYear when Auth is ready and user is signed in
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    let unsubFirestore: (() => void) | null = null;
    let isCancelled = false;
    const activeUid = currentUser.uid;
    const activeYear = selectedYear;
    const initialWbForYear =
      workbooksRef.current[activeYear] || createWorkbookForYear(activeYear);

    const initFirestoreSync = async () => {
      setIsCloudSyncing(true);
      try {
        await ensureAndSeedWorkbookInFirestore(
          activeUid,
          activeYear,
          initialWbForYear
        );
        if (isCancelled) return;

        unsubFirestore = subscribeToWorkbook(
          activeUid,
          activeYear,
          (partial) => {
            setWorkbooksByYear((prevMap) => {
              const baseWb =
                prevMap[activeYear] || createWorkbookForYear(activeYear);
              const nextWb: WorkbookState = {
                ...baseWb,
                ...partial,
                yearEC: activeYear,
              };
              if (JSON.stringify(baseWb) === JSON.stringify(nextWb)) {
                return prevMap;
              }
              setLastSyncedTime(
                new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              );
              return {
                ...prevMap,
                [activeYear]: nextWb,
              };
            });
          }
        );
      } catch (err) {
        if (!isCancelled) {
          setRuntimeError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!isCancelled) {
          setIsCloudSyncing(false);
        }
      }
    };

    initFirestoreSync();

    return () => {
      isCancelled = true;
      flushPendingFirestoreWrites().catch(() => {});
      if (unsubFirestore) unsubFirestore();
    };
  }, [isAuthReady, currentUser?.uid, selectedYear]);

  const handleSelectYear = (newYear: string) => {
    setWorkbooksByYear((prevMap) => {
      if (prevMap[newYear]) return prevMap;
      return {
        ...prevMap,
        [newYear]: createWorkbookForYear(newYear),
      };
    });
    setSelectedYear(newYear);
    if (newYear === '2018 EC') {
      setSelectedMonth('ሐምሌ');
    } else {
      setSelectedMonth('ጥቅምት');
    }
    showToast(`የሂሳብ ዓመት ወደ ${newYear} ተቀይሯል።`);
  };

  const handleAddYear = (
    newYearEC: string,
    initMode: YearInitMode,
    sourceYearEC: string
  ) => {
    const sourceWb = workbooksByYear[sourceYearEC] || state;
    const createdWb = createWorkbookForYear(newYearEC, sourceWb, initMode);

    setYearsList((prev) => {
      if (prev.includes(newYearEC)) return prev;
      return [...prev, newYearEC].sort();
    });
    setWorkbooksByYear((prevMap) => ({
      ...prevMap,
      [newYearEC]: createdWb,
    }));
    setSelectedYear(newYearEC);
    setSelectedMonth('ጥቅምት');
    showToast(`አዲስ የሂሳብ ዓመት (${newYearEC}) ተፈጥሯል!`);
  };

  const handleDeleteYear = (yearToDelete: string) => {
    if (yearToDelete === '2019 EC' || yearsList.length <= 1) return;
    const nextYears = yearsList.filter((y) => y !== yearToDelete);
    setYearsList(nextYears);
    if (selectedYear === yearToDelete) {
      setSelectedYear(nextYears.includes('2019 EC') ? '2019 EC' : nextYears[0]);
    }
    showToast(`የሂሳብ ዓመት (${yearToDelete}) ተወግዷል።`);
  };

  const handleResetYear = async (yearToReset: string) => {
    const fresh = createWorkbookForYear(yearToReset);
    setWorkbooksByYear((prevMap) => ({
      ...prevMap,
      [yearToReset]: fresh,
    }));
    if (currentUser) {
      try {
        await uploadFullWorkbookToFirestore(currentUser.uid, yearToReset, fresh, true);
      } catch (err) {
        setRuntimeError(err instanceof Error ? err : new Error(String(err)));
      }
    }
    showToast(`የ${yearToReset} መረጃ ወደ መነሻ ቅርጸት ተመልሷል።`);
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await signInWithGoogle();
      updateLocalModeBypass(true);
      showToast(
        `ከFirebase Cloud (${res.user.email || 'Account'}) እና Google Workspace ጋር በተሳካ ሁኔታ ተገናኝቷል!`
      );
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('APK_NEEDS_CLOUD_KEY') || msg.includes('INVALID_SYNC_CREDENTIAL')) {
        setIsMobileAppModalOpen(true);
        showToast(
          'በአንድሮይድ APK ውስጥ ከጋራ ዳታቤዝ ጋር ለማገናኘት የCloud Sync Code እዚህ ያስገቡ (Paste Cloud Sync Key)!'
        );
        return;
      }
      throw err;
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logOutFirebase();
      updateLocalModeBypass(true);
      showToast('ከFirebase ወጥተዋል። ወደ Local Mode ተመልሰዋል።');
    } catch {
      // ignore
    }
  };

  const handleForceCloudPush = async () => {
    if (!currentUser) return;
    setIsCloudSyncing(true);
    try {
      await flushPendingFirestoreWrites();
      await uploadFullWorkbookToFirestore(
        currentUser.uid,
        selectedYear,
        state,
        true
      );
      setLastSyncedTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      showToast(`የ${selectedYear} 4 ሉሆች ወደ Firebase Firestore ተመሳክረዋል!`);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsCloudSyncing(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600">
            የሂሳብ መዝገብ በመጫን ላይ (Loading Financial Ledger...)
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser && !isLocalModeBypass) {
    return (
      <LoginPage
        onGoogleLogin={handleGoogleLogin}
        onContinueLocal={() => {
          updateLocalModeBypass(true);
          showToast('ወደ ሲስተሙ በLocal Mode ገብተዋል።');
        }}
        yearEC={selectedYear}
      />
    );
  }

  const SHEET_LABELS_AM: Record<EditableSheetId, string> = {
    rental: 'የኪራይ እና ወጪ ክፍፍል',
    mesfin: 'የመስፍን መዝገብ',
    zewdnesh: 'የዘውድነሽ መዝገብ',
    groceries: 'የአስቤዛ መከታተያ',
    water: 'ውሃ',
  };

  const currentYearClosedMonths: EthiopianMonth[] = closedMonthsByYear[selectedYear] || [];
  const isSelectedMonthClosed =
    selectedMonth !== 'ANNUAL' && currentYearClosedMonths.includes(selectedMonth);

  const isMonthClosed = (m?: EthiopianMonth) => {
    if (!m) return false;
    return currentYearClosedMonths.includes(m);
  };

  const actorLabel = currentUser?.email || currentUser?.displayName || 'Local Admin';

  const recordAudit = (
    sheet: EditableSheetId,
    summaryAm: string,
    summaryEn: string,
    month?: string,
    isAnomaly?: boolean
  ) => {
    const snapshotBefore: WorkbookState = JSON.parse(JSON.stringify(state));
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      isoTime: new Date().toISOString(),
      yearEC: selectedYear,
      sheet,
      month,
      actor: actorLabel,
      summaryAm,
      summaryEn,
      isAnomaly,
      previousState: snapshotBefore,
    };
    setAuditLogs((prev) => [entry, ...prev].slice(0, 60));
    setLastUndoableEntry(entry);
    if (isAnomaly) {
      showToast(`⚠️ ከፍተኛ ቁጥር ማስጠንቀቂያ: ${summaryAm} — ስህተት ከሆነ "መልስ (Undo)" ይጫኑ።`);
    }
  };

  const createSnapshot = (label: string, isAuto = false) => {
    const snap: WorkbookSnapshot = {
      id: `snap_${Date.now()}`,
      label,
      createdAt: new Date().toLocaleString(),
      yearEC: selectedYear,
      actor: actorLabel,
      isAuto,
      state: JSON.parse(JSON.stringify(state)),
    };
    setSnapshots((prev) => [snap, ...prev].slice(0, 25));
    if (!isAuto) {
      showToast(`📸 የመጠባበቂያ ቅጂ "${label}" ተቀምጧል።`);
    }
  };

  const handleUndoAudit = (entry: AuditLogEntry) => {
    setWorkbooksByYear((prev) => ({
      ...prev,
      [entry.yearEC]: entry.previousState,
    }));
    setAuditLogs((prev) => prev.filter((item) => item.id !== entry.id));
    if (lastUndoableEntry?.id === entry.id) {
      setLastUndoableEntry(null);
    }
    if (currentUser) {
      uploadFullWorkbookToFirestore(
        currentUser.uid,
        entry.yearEC,
        entry.previousState,
        true
      ).catch(() => {});
    }
    showToast(`↩️ ለውጡ ወደ ነበረበት ተመልሷል (Undone: ${entry.summaryAm})`);
  };

  const handleRestoreSnapshot = (snap: WorkbookSnapshot) => {
    createSnapshot(`ከመመለሱ በፊት (${snap.yearEC})`, true);
    setWorkbooksByYear((prev) => ({
      ...prev,
      [snap.yearEC]: snap.state,
    }));
    if (currentUser) {
      uploadFullWorkbookToFirestore(currentUser.uid, snap.yearEC, snap.state, true).catch(() => {});
    }
    showToast(`✅ ቅጂ "${snap.label}" ተመልሷል!`);
  };

  const handleToggleClosedMonth = (month: EthiopianMonth) => {
    setClosedMonthsByYear((prev) => {
      const list = prev[selectedYear] || [];
      const exists = list.includes(month);
      const nextList = exists ? list.filter((m) => m !== month) : [...list, month];
      showToast(
        exists
          ? `🔓 የ${month} (${selectedYear}) ሂሳብ ለማስተካከያ ተከፍቷል።`
          : `🔒 የ${month} (${selectedYear}) ሂሳብ ተዘግቷል (Reconciled & Locked)።`
      );
      return {
        ...prev,
        [selectedYear]: nextList,
      };
    });
  };

  const handleUpdateAdminPin = (newPin: string | null) => {
    setAdminPin(newPin);
    try {
      if (newPin) {
        localStorage.setItem(ADMIN_PIN_STORAGE_KEY, newPin);
      } else {
        localStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  };

  const applyUnlockSheet = (sheet: EditableSheetId, nextLocked: boolean) => {
    setSheetViewOnly((prev) => {
      showToast(
        nextLocked
          ? `🔒 ${SHEET_LABELS_AM[sheet]} ወደ እይታ ብቻ (View Only - Locked) ተቀይሯል።`
          : `✏️ ${SHEET_LABELS_AM[sheet]} ወደ አርትዕ (Edit Mode) ተቀይሯል።`
      );
      return { ...prev, [sheet]: nextLocked };
    });
  };

  const toggleSheetViewOnly = (sheet: EditableSheetId, nextLocked?: boolean) => {
    const currentlyLocked = sheetViewOnly[sheet];
    const targetVal = typeof nextLocked === 'boolean' ? nextLocked : !currentlyLocked;
    // If unlocking (targetVal === false) and Admin PIN is enabled, prompt for PIN
    if (!targetVal && adminPin) {
      setPendingPinTarget(sheet);
      return;
    }
    applyUnlockSheet(sheet, targetVal);
  };

  // Handlers for Sheet 1: Rental & Expenses
  const handleUpdateTenantAmount = (tenantId: string, month: EthiopianMonth, value: number) => {
    if (sheetViewOnly.rental || isMonthClosed(month)) return;
    const targetTenant = state.tenants.find((t) => t.id === tenantId);
    const oldVal = targetTenant?.monthlyAmounts[month] || 0;
    if (oldVal === value) return;
    recordAudit(
      'rental',
      `${targetTenant?.tenantName || 'ተከራይ'} የ${month} ኪራይ ከ${formatETB(oldVal)} ወደ ${formatETB(value)} ብር ተቀየረ`,
      `${targetTenant?.tenantName || 'Tenant'} ${month} rent changed from ${formatETB(oldVal)} to ${formatETB(value)} ETB`,
      month,
      value > 150000
    );
    updateCurrentYearState((prev) => ({
      ...prev,
      tenants: prev.tenants.map((t) =>
        t.id === tenantId
          ? {
              ...t,
              monthlyAmounts: {
                ...t.monthlyAmounts,
                [month]: value,
              },
            }
          : t
      ),
    }));
    if (currentUser) {
      fsUpdateTenantMonth(currentUser.uid, selectedYear, tenantId, month, value).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
  };

  const handleUpdateTenantSplit = (
    tenantId: string,
    splitType: SplitType,
    mRatio: number,
    zRatio: number,
    label: string
  ) => {
    if (sheetViewOnly.rental && activeTab === 'rental') return;
    updateCurrentYearState((prev) => ({
      ...prev,
      tenants: prev.tenants.map((t) =>
        t.id === tenantId
          ? {
              ...t,
              splitType,
              mesfinRatio: mRatio,
              zewdneshRatio: zRatio,
              splitLabel: label,
            }
          : t
      ),
    }));
    if (currentUser) {
      fsUpdateTenantSplit(
        currentUser.uid,
        selectedYear,
        tenantId,
        splitType,
        mRatio,
        zRatio,
        label
      ).catch((err) => setRuntimeError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleAddTenant = (newTenant: Omit<TenantRentalRow, 'id'>) => {
    if (sheetViewOnly.rental) return;
    const created: TenantRentalRow = {
      ...newTenant,
      id: `t_${Date.now()}`,
    };
    const nextOrder = state.tenants.length;
    updateCurrentYearState((prev) => ({
      ...prev,
      tenants: [...prev.tenants, created],
    }));
    if (currentUser) {
      fsCreateTenant(currentUser.uid, selectedYear, created, nextOrder).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast(`አዲስ ተከራይ (${newTenant.tenantName}) ተጨምሯል።`);
  };

  const handleDeleteTenant = (tenantId: string) => {
    if (sheetViewOnly.rental) return;
    updateCurrentYearState((prev) => ({
      ...prev,
      tenants: prev.tenants.filter((t) => t.id !== tenantId),
    }));
    if (currentUser) {
      fsDeleteTenant(currentUser.uid, selectedYear, tenantId).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast('ተከራይ ተሰርዟል።');
  };

  const handleUpdateExpenseAmount = (
    expenseId: string,
    month: EthiopianMonth,
    value: number
  ) => {
    if (sheetViewOnly.rental || isMonthClosed(month)) return;
    const targetExp = state.propertyExpenses.find((e) => e.id === expenseId);
    const oldVal = targetExp?.monthlyAmounts[month] || 0;
    if (oldVal !== value) {
      recordAudit(
        'rental',
        `${targetExp?.expenseType || 'ወጪ'} (${month}) ከ${formatETB(oldVal)} ወደ ${formatETB(value)} ብር ተቀየረ`,
        `${targetExp?.expenseType || 'Expense'} (${month}) changed from ${formatETB(oldVal)} to ${formatETB(value)} ETB`,
        month,
        value > 100000
      );
    }
    updateCurrentYearState((prev) => ({
      ...prev,
      propertyExpenses: prev.propertyExpenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              monthlyAmounts: {
                ...e.monthlyAmounts,
                [month]: value,
              },
            }
          : e
      ),
    }));
    if (currentUser) {
      fsUpdateExpenseMonth(currentUser.uid, selectedYear, expenseId, month, value).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
  };

  const handleUpdateExpenseSplit = (
    expenseId: string,
    splitType: SplitType,
    mRatio: number,
    zRatio: number,
    label: string
  ) => {
    if (sheetViewOnly.rental && activeTab === 'rental') return;
    updateCurrentYearState((prev) => ({
      ...prev,
      propertyExpenses: prev.propertyExpenses.map((e) =>
        e.id === expenseId
          ? {
              ...e,
              splitType,
              mesfinRatio: mRatio,
              zewdneshRatio: zRatio,
              splitLabel: label,
            }
          : e
      ),
    }));
    if (currentUser) {
      fsUpdateExpenseSplit(
        currentUser.uid,
        selectedYear,
        expenseId,
        splitType,
        mRatio,
        zRatio,
        label
      ).catch((err) => setRuntimeError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleAddPropertyExpense = (exp: Omit<PropertyExpenseRow, 'id'>) => {
    if (sheetViewOnly.rental) return;
    const created: PropertyExpenseRow = {
      ...exp,
      id: `exp_${Date.now()}`,
    };
    const nextOrder = state.propertyExpenses.length;
    updateCurrentYearState((prev) => ({
      ...prev,
      propertyExpenses: [...prev.propertyExpenses, created],
    }));
    if (currentUser) {
      fsCreatePropertyExpense(currentUser.uid, selectedYear, created, nextOrder).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast(`አዲስ የወጪ መስመር (${exp.expenseType}) ተጨምሯል።`);
  };

  const handleDeletePropertyExpense = (expenseId: string) => {
    if (sheetViewOnly.rental) return;
    updateCurrentYearState((prev) => ({
      ...prev,
      propertyExpenses: prev.propertyExpenses.filter((e) => e.id !== expenseId),
    }));
    if (currentUser) {
      fsDeletePropertyExpense(currentUser.uid, selectedYear, expenseId).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast('የወጪ መስመር ተሰርዟል።');
  };

  // Handlers for Sheet 2 & Sheet 3: Personal Ledgers
  const handleUpdateLedgerEntry = (
    target: 'mesfinIncome' | 'mesfinExpenses' | 'zewdneshDeposits' | 'zewdneshExpenses',
    id: string,
    field: 'dateOrMonth' | 'description' | 'amount',
    value: string | number
  ) => {
    const isMesfinTarget = target === 'mesfinIncome' || target === 'mesfinExpenses';
    if (isMesfinTarget && sheetViewOnly.mesfin) return;
    if (!isMesfinTarget && sheetViewOnly.zewdnesh) return;
    const sheetKey: EditableSheetId = isMesfinTarget ? 'mesfin' : 'zewdnesh';
    const existing = state[target].find((e) => e.id === id);
    if (existing && existing[field] !== value) {
      recordAudit(
        sheetKey,
        `${existing.description || 'መዝገብ'} (${field}) ወደ ${value} ተቀየረ`,
        `${existing.description || 'Ledger entry'} (${field}) updated to ${value}`,
        undefined,
        field === 'amount' && Number(value) > 150000
      );
    }

    updateCurrentYearState((prev) => ({
      ...prev,
      [target]: prev[target].map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
    if (currentUser) {
      fsUpdateLedgerEntry(currentUser.uid, selectedYear, id, field, value).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
  };

  const handleAddLedgerEntry = (
    target: 'mesfinIncome' | 'mesfinExpenses' | 'zewdneshDeposits' | 'zewdneshExpenses',
    entry: Omit<LedgerEntry, 'id'>
  ) => {
    const isMesfinTarget = target === 'mesfinIncome' || target === 'mesfinExpenses';
    if (isMesfinTarget && sheetViewOnly.mesfin) return;
    if (!isMesfinTarget && sheetViewOnly.zewdnesh) return;

    const created: LedgerEntry = {
      ...entry,
      id: `${target}_${Date.now()}`,
    };
    const nextOrder = state[target].length;
    updateCurrentYearState((prev) => ({
      ...prev,
      [target]: [...prev[target], created],
    }));
    if (currentUser) {
      fsCreateLedgerEntry(currentUser.uid, selectedYear, target, created, nextOrder).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast(`አዲስ መዝገብ (${entry.description}) ተጨምሯል።`);
  };

  const handleDeleteLedgerEntry = (
    target: 'mesfinIncome' | 'mesfinExpenses' | 'zewdneshDeposits' | 'zewdneshExpenses',
    id: string
  ) => {
    const isMesfinTarget = target === 'mesfinIncome' || target === 'mesfinExpenses';
    if (isMesfinTarget && sheetViewOnly.mesfin) return;
    if (!isMesfinTarget && sheetViewOnly.zewdnesh) return;

    updateCurrentYearState((prev) => ({
      ...prev,
      [target]: prev[target].filter((entry) => entry.id !== id),
    }));
    if (currentUser) {
      fsDeleteLedgerEntry(currentUser.uid, selectedYear, id).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast('መዝገቡ ተሰርዟል።');
  };

  // Handlers for Sheet 4: Groceries Tracker (Monthly & Yearly)
  const handleUpdateGrocery = (
    id: string,
    field: 'name' | 'category' | 'unit' | 'price' | 'purchased',
    value: string | number | boolean,
    targetMonth?: EthiopianMonth
  ) => {
    const activeMonth: EthiopianMonth =
      targetMonth || (selectedMonth === 'ANNUAL' ? 'ጥቅምት' : selectedMonth);
    if (sheetViewOnly.groceries || isMonthClosed(activeMonth)) return;
    const currentMonthList = getGroceriesForMonth(state, activeMonth);
    const targetItem = currentMonthList.find((g) => g.id === id);
    if (targetItem && targetItem[field] !== value) {
      recordAudit(
        'groceries',
        `አስቤዛ (${targetItem.name}) ${field} ወደ ${String(value)} ተቀየረ`,
        `Grocery (${targetItem.name}) ${field} updated to ${String(value)}`,
        activeMonth,
        field === 'price' && Number(value) > 30000
      );
    }

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyGroceries(prev);
      const updatedMonthItems = (monthlyMap[activeMonth] || []).map((g) =>
        g.id === id ? { ...g, [field]: value } : g
      );
      const nextMonthlyMap = {
        ...monthlyMap,
        [activeMonth]: updatedMonthItems,
      };
      return {
        ...prev,
        monthlyGroceries: nextMonthlyMap,
        groceries: activeMonth === 'ጥቅምት' ? updatedMonthItems : prev.groceries,
      };
    });

    if (currentUser) {
      fsUpdateGroceryItem(
        currentUser.uid,
        selectedYear,
        id,
        field,
        value,
        activeMonth,
        targetItem
      ).catch((err) => setRuntimeError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleAddGrocery = (
    item: Omit<GroceryItem, 'id' | 'index'>,
    targetMonth?: EthiopianMonth
  ) => {
    if (sheetViewOnly.groceries) return;
    const activeMonth: EthiopianMonth =
      targetMonth || (selectedMonth === 'ANNUAL' ? 'ጥቅምት' : selectedMonth);
    const currentMonthList = getGroceriesForMonth(state, activeMonth);
    const created: GroceryItem = {
      ...item,
      id: `g_${Date.now()}`,
      index: currentMonthList.length + 1,
    };

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyGroceries(prev);
      const nextMonthlyMap = {} as Record<EthiopianMonth, GroceryItem[]>;
      ETHIOPIAN_MONTHS.forEach((m) => {
        const list = monthlyMap[m.id] || [];
        if (m.id === activeMonth) {
          nextMonthlyMap[m.id] = [...list, { ...created, index: list.length + 1 }];
        } else {
          nextMonthlyMap[m.id] = [
            ...list,
            { ...created, index: list.length + 1, price: 0, purchased: false },
          ];
        }
      });
      return {
        ...prev,
        monthlyGroceries: nextMonthlyMap,
        groceries: nextMonthlyMap['ጥቅምት'],
      };
    });

    if (currentUser) {
      fsCreateGroceryItem(currentUser.uid, selectedYear, created, activeMonth).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast(`አዲስ የአስቤዛ ዕቃ (${item.name}) በ${activeMonth} (${selectedYear}) ተጨምሯል።`);
  };

  const handleDeleteGrocery = (id: string, targetMonth?: EthiopianMonth) => {
    if (sheetViewOnly.groceries) return;
    const activeMonth: EthiopianMonth =
      targetMonth || (selectedMonth === 'ANNUAL' ? 'ጥቅምት' : selectedMonth);

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyGroceries(prev);
      const updatedMonthItems = (monthlyMap[activeMonth] || [])
        .filter((g) => g.id !== id)
        .map((g, idx) => ({ ...g, index: idx + 1 }));
      const nextMonthlyMap = {
        ...monthlyMap,
        [activeMonth]: updatedMonthItems,
      };
      return {
        ...prev,
        monthlyGroceries: nextMonthlyMap,
        groceries: activeMonth === 'ጥቅምት' ? updatedMonthItems : prev.groceries,
      };
    });

    if (currentUser) {
      fsDeleteGroceryItem(currentUser.uid, selectedYear, id, activeMonth).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast(`ዕቃው ከ${activeMonth} ዝርዝር ተሰርዟል።`);
  };

  const handleResetMonthGroceries = (targetMonth: EthiopianMonth) => {
    if (sheetViewOnly.groceries || isMonthClosed(targetMonth)) return;
    createSnapshot(`ከ${targetMonth} አስቤዛ ዳግም ማስጀመር በፊት`, true);
    recordAudit(
      'groceries',
      `የ${targetMonth} የአስቤዛ ዝርዝር እንደ አዲስ ተዘጋጀ`,
      `${targetMonth} groceries checklist reset as new`,
      targetMonth
    );
    const currentList = getGroceriesForMonth(state, targetMonth);
    const freshList = createBlankMonthGroceries(currentList);

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyGroceries(prev);
      const nextMonthlyMap = {
        ...monthlyMap,
        [targetMonth]: freshList,
      };
      return {
        ...prev,
        monthlyGroceries: nextMonthlyMap,
        groceries: targetMonth === 'ጥቅምት' ? freshList : prev.groceries,
      };
    });

    if (currentUser) {
      fsSaveMonthGroceriesBatch(currentUser.uid, selectedYear, targetMonth, freshList).catch(
        (err) => setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast(`የ${targetMonth} (${selectedYear}) የአስቤዛ ዝርዝር እንደ አዲስ ተዘጋጅቷል።`);
  };

  const handleCopyMonthGroceries = (fromMonth: EthiopianMonth, toMonth: EthiopianMonth) => {
    if (sheetViewOnly.groceries || isMonthClosed(toMonth)) return;
    createSnapshot(`ከ${fromMonth} ወደ ${toMonth} አስቤዛ ከመቀዳቱ በፊት`, true);
    recordAudit(
      'groceries',
      `የ${fromMonth} አስቤዛ ወደ ${toMonth} ተቀዳ`,
      `Copied groceries from ${fromMonth} to ${toMonth}`,
      toMonth
    );
    const sourceItems = getGroceriesForMonth(state, fromMonth).map((g, idx) => ({
      ...g,
      index: idx + 1,
    }));

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyGroceries(prev);
      const nextMonthlyMap = {
        ...monthlyMap,
        [toMonth]: sourceItems,
      };
      return {
        ...prev,
        monthlyGroceries: nextMonthlyMap,
        groceries: toMonth === 'ጥቅምት' ? sourceItems : prev.groceries,
      };
    });

    if (currentUser) {
      fsSaveMonthGroceriesBatch(currentUser.uid, selectedYear, toMonth, sourceItems).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast(`የ${fromMonth} የአስቤዛ ዝርዝር ወደ ${toMonth} (${selectedYear}) ተቀድቷል።`);
  };

  // Automated Cross-Sheet Sync Actions
  const handleSyncMesfinTikimt = () => {
    const targetMonth: EthiopianMonth = selectedMonth === 'ANNUAL' ? 'ጥቅምት' : selectedMonth;
    const calc = calculateRentalSummary(state, targetMonth);
    const yrDigits = selectedYear.replace(/\s*EC$/i, '').trim();
    const labelToMatch = `${targetMonth} ${yrDigits}`;

    const existingItem = state.mesfinIncome.find((i) => i.dateOrMonth.includes(targetMonth));
    if (existingItem) {
      handleUpdateLedgerEntry('mesfinIncome', existingItem.id, 'amount', calc.mesfinNetShare);
    } else {
      handleAddLedgerEntry('mesfinIncome', {
        dateOrMonth: labelToMatch,
        description: 'የቤት ኪራይ ገቢ',
        category: 'የቤት ኪራይ',
        amount: calc.mesfinNetShare,
        isPlaceholder: false,
      });
    }

    showToast(
      `የ${targetMonth} (${selectedYear}) የመስፍን የተጣራ ድርሻ (${formatETB(calc.mesfinNetShare)} ብር) ወደ መስፍን የግል መዝገብ ተመሳክሯል።`
    );
  };

  const handleSyncGroceriesToExpense = (monthOverride?: EthiopianMonth | 'ANNUAL') => {
    const effectivePeriod = monthOverride || selectedMonth;
    const asbezaRow = state.propertyExpenses.find((e) => e.expenseType === 'አስቤዛ');
    if (!asbezaRow) return;

    if (effectivePeriod === 'ANNUAL') {
      const grocSummary = calculateGroceriesSummary(state, 'ANNUAL');
      grocSummary.monthlySeries.forEach((ms) => {
        handleUpdateExpenseAmount(asbezaRow.id, ms.month, ms.totalSpent);
      });
      showToast(
        `የ12 ወራት የአስቤዛ ወጪ (ዓመታዊ ድምር ${formatETB(grocSummary.annualTotalSpent)} ብር) ወደ ${selectedYear} የወጪ ሰንጠረዥ ተመሳክሯል።`
      );
      return;
    }

    const grocSummary = calculateGroceriesSummary(state, effectivePeriod);
    handleUpdateExpenseAmount(asbezaRow.id, effectivePeriod, grocSummary.totalSpent);

    showToast(
      `የ${effectivePeriod} የአስቤዛ ወጪ (${formatETB(grocSummary.totalSpent)} ብር) ወደ ${effectivePeriod} (${selectedYear}) የወጪ ሰንጠረዥ ተመሳክሯል።`
    );
  };

  // Handlers for Sheet 5: Water Recording & Payment Tracking (Monthly & Yearly)
  const handleUpdateWaterRate = (newRate: number) => {
    if (sheetViewOnly.water) return;
    const safeRate = newRate > 0 ? newRate : DEFAULT_WATER_RATE;
    updateCurrentYearState((prev) => ({
      ...prev,
      waterRatePerUnit: safeRate,
    }));
    if (currentUser) {
      const activeMonth: EthiopianMonth =
        selectedMonth === 'ANNUAL' ? 'መስከረም' : selectedMonth;
      const monthItems = getWaterForMonth(state, activeMonth);
      fsSaveMonthWaterBatch(
        currentUser.uid,
        selectedYear,
        activeMonth,
        monthItems,
        safeRate
      ).catch((err) => setRuntimeError(err instanceof Error ? err : new Error(String(err))));
    }
    showToast(`የውሃ ታሪፍ ወደ ${safeRate} ብር በዙር ተቀይሯል።`);
  };

  const handleUpdateWaterRecord = (
    id: string,
    field: 'name' | 'week1' | 'week2' | 'week3' | 'week4' | 'amountPaid' | 'depositOverride',
    value: string | number | null,
    targetMonth?: EthiopianMonth
  ) => {
    const activeMonth: EthiopianMonth =
      targetMonth || (selectedMonth === 'ANNUAL' ? 'መስከረም' : selectedMonth);
    if (sheetViewOnly.water || isMonthClosed(activeMonth)) return;
    const currentMonthList = getWaterForMonth(state, activeMonth);
    const targetItem = currentMonthList.find((w) => w.id === id);
    if (targetItem) {
      recordAudit(
        'water',
        `ውሃ (${targetItem.name} · ${activeMonth}) ${field} ወደ ${value ?? 'auto'} ተቀየረ`,
        `Water (${targetItem.name} · ${activeMonth}) ${field} updated to ${value ?? 'auto'}`,
        activeMonth,
        typeof value === 'number' && value > 5000
      );
    }
    const currentRate = Number(state.waterRatePerUnit) > 0 ? Number(state.waterRatePerUnit) : DEFAULT_WATER_RATE;

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyWater(prev);
      const nextMonthlyMap = { ...monthlyMap };

      if (field === 'name') {
        const cleanName = String(value || '');
        ETHIOPIAN_MONTHS.forEach((m) => {
          nextMonthlyMap[m.id] = (monthlyMap[m.id] || []).map((w) =>
            w.id === id ? { ...w, name: cleanName, nameEn: cleanName } : w
          );
        });
      } else {
        nextMonthlyMap[activeMonth] = (monthlyMap[activeMonth] || []).map((w) =>
          w.id === id ? { ...w, [field]: value } : w
        );
      }

      return {
        ...prev,
        monthlyWater: nextMonthlyMap,
        waterRecords: nextMonthlyMap['መስከረም'],
      };
    });

    if (currentUser) {
      fsUpdateWaterRecord(
        currentUser.uid,
        selectedYear,
        id,
        field,
        value,
        activeMonth,
        targetItem,
        currentRate
      ).catch((err) => setRuntimeError(err instanceof Error ? err : new Error(String(err))));
    }
  };

  const handleAddWaterMember = (
    item: Omit<WaterRecordItem, 'id' | 'index'>,
    targetMonth?: EthiopianMonth
  ) => {
    if (sheetViewOnly.water) return;
    const activeMonth: EthiopianMonth =
      targetMonth || (selectedMonth === 'ANNUAL' ? 'መስከረም' : selectedMonth);
    const currentMonthList = getWaterForMonth(state, activeMonth);
    const created: WaterRecordItem = {
      ...item,
      id: `w_${Date.now()}`,
      index: currentMonthList.length + 1,
    };
    const currentRate =
      Number(state.waterRatePerUnit) > 0 ? Number(state.waterRatePerUnit) : DEFAULT_WATER_RATE;

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyWater(prev);
      const nextMonthlyMap = {} as Record<EthiopianMonth, WaterRecordItem[]>;
      ETHIOPIAN_MONTHS.forEach((m) => {
        const list = monthlyMap[m.id] || [];
        if (m.id === activeMonth) {
          nextMonthlyMap[m.id] = [...list, { ...created, index: list.length + 1 }];
        } else {
          nextMonthlyMap[m.id] = [
            ...list,
            {
              ...created,
              index: list.length + 1,
              week1: 0,
              week2: 0,
              week3: 0,
              week4: 0,
              amountPaid: 0,
              depositOverride: null,
            },
          ];
        }
      });
      return {
        ...prev,
        monthlyWater: nextMonthlyMap,
        waterRecords: nextMonthlyMap['መስከረም'],
      };
    });

    if (currentUser) {
      fsCreateWaterRecord(
        currentUser.uid,
        selectedYear,
        created,
        activeMonth,
        currentRate
      ).catch((err) => setRuntimeError(err instanceof Error ? err : new Error(String(err))));
    }
    showToast(`አዲስ የውሃ ተጠቃሚ (${item.name}) በ${activeMonth} (${selectedYear}) ተጨምሯል።`);
  };

  const handleDeleteWaterMember = (id: string, targetMonth?: EthiopianMonth) => {
    if (sheetViewOnly.water) return;
    const activeMonth: EthiopianMonth =
      targetMonth || (selectedMonth === 'ANNUAL' ? 'መስከረም' : selectedMonth);

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyWater(prev);
      const nextMonthlyMap = {} as Record<EthiopianMonth, WaterRecordItem[]>;
      ETHIOPIAN_MONTHS.forEach((m) => {
        nextMonthlyMap[m.id] = (monthlyMap[m.id] || [])
          .filter((w) => w.id !== id)
          .map((w, idx) => ({ ...w, index: idx + 1 }));
      });
      return {
        ...prev,
        monthlyWater: nextMonthlyMap,
        waterRecords: nextMonthlyMap['መስከረም'],
      };
    });

    if (currentUser) {
      fsDeleteWaterRecord(currentUser.uid, selectedYear, id, activeMonth).catch((err) =>
        setRuntimeError(err instanceof Error ? err : new Error(String(err)))
      );
    }
    showToast('የውሃ ተጠቃሚው ተሰርዟል።');
  };

  const handleResetMonthWater = (targetMonth: EthiopianMonth) => {
    if (sheetViewOnly.water || isMonthClosed(targetMonth)) return;
    createSnapshot(`ከ${targetMonth} ውሃ ዳግም ማስጀመር በፊት`, true);
    recordAudit(
      'water',
      `የ${targetMonth} የውሃ መዝገብ እንደ አዲስ ተዘጋጀ`,
      `${targetMonth} water records reset as new`,
      targetMonth
    );
    const currentList = getWaterForMonth(state, targetMonth);
    const freshList = createBlankMonthWater(currentList);
    const currentRate =
      Number(state.waterRatePerUnit) > 0 ? Number(state.waterRatePerUnit) : DEFAULT_WATER_RATE;

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyWater(prev);
      const nextMonthlyMap = {
        ...monthlyMap,
        [targetMonth]: freshList,
      };
      return {
        ...prev,
        monthlyWater: nextMonthlyMap,
        waterRecords: targetMonth === 'መስከረም' ? freshList : prev.waterRecords,
      };
    });

    if (currentUser) {
      fsSaveMonthWaterBatch(
        currentUser.uid,
        selectedYear,
        targetMonth,
        freshList,
        currentRate
      ).catch((err) => setRuntimeError(err instanceof Error ? err : new Error(String(err))));
    }
    showToast(`የ${targetMonth} (${selectedYear}) የውሃ ፍጆታ መዝገብ እንደ አዲስ ተዘጋጅቷል።`);
  };

  const handleCopyMonthWater = (fromMonth: EthiopianMonth, toMonth: EthiopianMonth) => {
    if (sheetViewOnly.water || isMonthClosed(toMonth)) return;
    createSnapshot(`ከ${fromMonth} ወደ ${toMonth} ውሃ ከመቀዳቱ በፊት`, true);
    recordAudit(
      'water',
      `የ${fromMonth} የውሃ ፍጆታ ወደ ${toMonth} ተቀዳ`,
      `Copied water usage from ${fromMonth} to ${toMonth}`,
      toMonth
    );
    const sourceItems = getWaterForMonth(state, fromMonth).map((w, idx) => ({
      ...w,
      index: idx + 1,
      depositOverride: null,
    }));
    const currentRate =
      Number(state.waterRatePerUnit) > 0 ? Number(state.waterRatePerUnit) : DEFAULT_WATER_RATE;

    updateCurrentYearState((prev) => {
      const monthlyMap = ensureMonthlyWater(prev);
      const nextMonthlyMap = {
        ...monthlyMap,
        [toMonth]: sourceItems,
      };
      return {
        ...prev,
        monthlyWater: nextMonthlyMap,
        waterRecords: toMonth === 'መስከረም' ? sourceItems : prev.waterRecords,
      };
    });

    if (currentUser) {
      fsSaveMonthWaterBatch(
        currentUser.uid,
        selectedYear,
        toMonth,
        sourceItems,
        currentRate
      ).catch((err) => setRuntimeError(err instanceof Error ? err : new Error(String(err))));
    }
    showToast(`የ${fromMonth} የውሃ ፍጆታ ወደ ${toMonth} (${selectedYear}) ተቀድቷል።`);
  };

  const handleSyncWaterToExpense = (monthOverride?: EthiopianMonth | 'ANNUAL') => {
    const effectivePeriod = monthOverride || selectedMonth;
    const waterExpRow = state.propertyExpenses.find((e) => e.expenseType === 'የውሃ ክፍያ');
    if (!waterExpRow) return;

    if (effectivePeriod === 'ANNUAL') {
      const waterSummary = calculateWaterSummary(state, 'ANNUAL');
      waterSummary.monthlySeries.forEach((ms) => {
        handleUpdateExpenseAmount(waterExpRow.id, ms.month, ms.totalPaymentDue);
      });
      showToast(
        `የ12 ወራት የውሃ ክፍያ (ዓመታዊ ድምር ${formatETB(waterSummary.annualTotalPaymentDue)} ብር) ወደ ${selectedYear} የወጪ ሰንጠረዥ ተመሳክሯል።`
      );
      return;
    }

    const waterSummary = calculateWaterSummary(state, effectivePeriod);
    handleUpdateExpenseAmount(waterExpRow.id, effectivePeriod, waterSummary.totalPaymentDue);

    showToast(
      `የ${effectivePeriod} የውሃ ክፍያ (${formatETB(waterSummary.totalPaymentDue)} ብር) ወደ ${effectivePeriod} (${selectedYear}) የወጪ ሰንጠረዥ ተመሳክሯል።`
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strictly Compliant 3-Zone Top Bar Contract (Compact 52px on Mobile, Full on Desktop) */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="max-w-[1400px] mx-auto px-3.5 sm:px-6 h-13 sm:h-15 flex items-center justify-between gap-3 sm:gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('analytics');
            }}
            className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate sm:whitespace-nowrap shrink min-w-0"
          >
            መስፍን እና ዘውድነሽ · የሂሳብ መዝገብ
          </a>

          {/* Zone 2: Navigation links with per-sheet View/Edit role icons (Desktop lg+) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === 'analytics'
                  ? 'border-emerald-700 text-slate-900 font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              ትንታኔ እና ሪፖርት
            </button>
            {(
              [
                ['rental', 'የኪራይ እና ወጪ ክፍፍል', 'border-emerald-700 text-slate-900'],
                ['mesfin', 'የመስፍን መዝገብ', 'border-blue-600 text-blue-950'],
                ['zewdnesh', 'የዘውድነሽ መዝገብ', 'border-purple-600 text-purple-950'],
                ['groceries', 'የአስቤዛ መከታተያ', 'border-emerald-700 text-slate-900'],
                ['water', 'ውሃ', 'border-sky-600 text-sky-950'],
              ] as [EditableSheetId, string, string][]
            ).map(([tabId, label, activeClasses]) => {
              const isLocked = sheetViewOnly[tabId];
              return (
                <div
                  key={tabId}
                  className={`flex items-center gap-1.5 py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    activeTab === tabId
                      ? `${activeClasses} font-semibold`
                      : 'border-transparent hover:text-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(tabId)}
                    className="cursor-pointer py-0.5"
                  >
                    {label}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSheetViewOnly(tabId);
                    }}
                    title={
                      isLocked
                        ? `${label}: እይታ ብቻ / View Only (Locked) — ለማስተካከል ይጫኑ`
                        : `${label}: አርትዕ / Edit Mode — ለመቆለፍ ይጫኑ`
                    }
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      isLocked
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Pencil className="w-3 h-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Zone 3: Language Switcher, Quick Year Indicator & Touch-Ergonomic Settings Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSelector variant="select" />

            <select
              value={selectedYear}
              onChange={(e) => handleSelectYear(e.target.value)}
              aria-label="የሂሳብ ዓመት ምረጥ"
              className="bg-slate-50 border border-slate-200 rounded-md px-2 sm:px-2.5 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer min-h-[38px] sm:min-h-0"
            >
              {yearsList.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              title="የኦዲት ታሪክ፣ Undo፣ የወር መዝጊያ እና PIN ደህንነት (Audit & Security)"
              className="min-h-[42px] sm:min-h-0 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">ኦዲት & ጥበቃ</span>
              {auditLogs.length > 0 && (
                <span className="font-mono text-[11px] text-slate-500">
                  ({auditLogs.length})
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              title="ቅንብሮች፣ የስሌት ሕጎች፣ ዓመታት እና መጠባበቂያ (Settings)"
              aria-label="ቅንብሮች (Settings)"
              className={`min-h-[42px] min-w-[42px] sm:min-h-0 sm:min-w-0 sm:p-2 rounded-md border transition-colors shrink-0 cursor-pointer flex items-center justify-center ${
                activeTab === 'settings'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isOnline && (
          <div className="bg-amber-500/95 text-slate-950 px-4 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              ኢንተርኔት ተቋርጧል (Offline Mode) — የሚያስገቡት መረጃ በስልክዎ ዳታቤዝ ተቀምጦ ኢንተርኔት ሲመለስ በራስ-ሰር ይመሳከራል።
            </span>
          </div>
        )}

        {/* Tablet-Only Segmented Navigation Bar (768px - 1024px) */}
        <div className="hidden md:flex lg:hidden border-t border-slate-200 bg-slate-50/90 px-6 py-2 items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            {(
              [
                ['analytics', 'ትንታኔ እና ሪፖርት'],
                ['rental', 'የኪራይ እና ወጪ ክፍፍል'],
                ['mesfin', 'የመስፍን መዝገብ'],
                ['zewdnesh', 'የዘውድነሽ መዝገብ'],
                ['groceries', 'የአስቤዛ መከታተያ'],
                ['water', 'ውሃ'],
                ['settings', 'ቅንብሮች & እገዛ'],
              ] as [ActiveTab, string][]
            ).map(([tabId, label]) => {
              const isEditableSheet =
                tabId === 'rental' ||
                tabId === 'mesfin' ||
                tabId === 'zewdnesh' ||
                tabId === 'groceries' ||
                tabId === 'water';
              const isLocked = isEditableSheet ? sheetViewOnly[tabId as EditableSheetId] : false;
              return (
                <div
                  key={tabId}
                  className={`min-h-[38px] px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors ${
                    activeTab === tabId
                      ? tabId === 'mesfin'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : tabId === 'zewdnesh'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : tabId === 'water'
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab(tabId)}
                    className="cursor-pointer py-0.5"
                  >
                    {label}
                  </button>
                  {isEditableSheet && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSheetViewOnly(tabId as EditableSheetId);
                      }}
                      title={isLocked ? 'እይታ ብቻ (Locked)' : 'አርትዕ (Edit)'}
                      className={`p-1 rounded cursor-pointer ${
                        activeTab === tabId
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : isLocked
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isLocked ? <Lock className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Toast Notification with Instant 1-Click Undo when applicable */}
      {toastText && (
        <div className="fixed bottom-20 md:bottom-5 left-3.5 right-3.5 sm:left-auto sm:right-5 z-40 bg-slate-900 text-white px-4 py-3 sm:py-2.5 rounded-lg sm:rounded-md shadow-lg text-xs font-medium flex items-center justify-between gap-3 no-print">
          <span>{toastText}</span>
          {lastUndoableEntry && (
            <button
              type="button"
              onClick={() => handleUndoAudit(lastUndoableEntry)}
              className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 cursor-pointer flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>መልስ (Undo)</span>
            </button>
          )}
        </div>
      )}

      {/* Main Content Viewport (Responsive Padding + Bottom Clearance for Mobile Tab Bar) */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-7 pb-24 md:pb-10">
        {activeTab === 'analytics' && (
          <VisualAnalytics
            state={state}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            bilingual={bilingual}
            workbooksByYear={workbooksByYear}
            yearsList={yearsList}
            onNavigateTab={setActiveTab}
            onSyncMesfinTikimt={handleSyncMesfinTikimt}
            onSyncGroceriesToExpense={handleSyncGroceriesToExpense}
            onExportExcel={() => {
              exportWorkbookToExcel(state, undefined, selectedMonth);
              showToast(`በመደበኛው የPDF/Excel ዲዛይን የተዘጋጀው የ${selectedYear} Excel (.xlsx) ወርዷል!`);
            }}
            onOpenPdfReport={() => {
              setPdfReportScope('FULL_EXECUTIVE');
              setIsPdfReportOpen(true);
            }}
          />
        )}

        {activeTab === 'rental' && (
          <RentalSplitSheet
            state={state}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            bilingual={bilingual}
            isViewOnly={sheetViewOnly.rental}
            isMonthClosed={isSelectedMonthClosed}
            onToggleViewOnly={() => toggleSheetViewOnly('rental')}
            onOpenRentReceipt={(tenant, month, gross, mesfinShare, zewdneshShare) =>
              setActiveReceipt({
                type: 'RENT',
                yearEC: selectedYear,
                month,
                tenant,
                amountPaid: gross,
                mesfinShare,
                zewdneshShare,
              })
            }
            shareRules={shareRules}
            onOpenSettings={() => setActiveTab('settings')}
            onUpdateTenantAmount={handleUpdateTenantAmount}
            onUpdateTenantSplit={handleUpdateTenantSplit}
            onAddTenant={handleAddTenant}
            onDeleteTenant={handleDeleteTenant}
            onUpdateExpenseAmount={handleUpdateExpenseAmount}
            onUpdateExpenseSplit={handleUpdateExpenseSplit}
            onAddPropertyExpense={handleAddPropertyExpense}
            onDeletePropertyExpense={handleDeletePropertyExpense}
            onSyncMesfinTikimt={handleSyncMesfinTikimt}
          />
        )}

        {activeTab === 'mesfin' && (
          <PersonalLedgerSheet
            owner="MESFIN"
            state={state}
            bilingual={bilingual}
            isViewOnly={sheetViewOnly.mesfin}
            onToggleViewOnly={() => toggleSheetViewOnly('mesfin')}
            onUpdateEntry={handleUpdateLedgerEntry}
            onAddEntry={handleAddLedgerEntry}
            onDeleteEntry={handleDeleteLedgerEntry}
            onSyncMesfinTikimt={handleSyncMesfinTikimt}
          />
        )}

        {activeTab === 'zewdnesh' && (
          <PersonalLedgerSheet
            owner="ZEWDNESH"
            state={state}
            bilingual={bilingual}
            isViewOnly={sheetViewOnly.zewdnesh}
            onToggleViewOnly={() => toggleSheetViewOnly('zewdnesh')}
            onUpdateEntry={handleUpdateLedgerEntry}
            onAddEntry={handleAddLedgerEntry}
            onDeleteEntry={handleDeleteLedgerEntry}
            onSyncMesfinTikimt={handleSyncMesfinTikimt}
          />
        )}

        {activeTab === 'groceries' && (
          <GroceriesTrackerSheet
            state={state}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            selectedYear={selectedYear}
            yearsList={yearsList}
            onSelectYear={handleSelectYear}
            onAddYear={handleAddYear}
            onOpenSettings={() => setActiveTab('settings')}
            bilingual={bilingual}
            isViewOnly={sheetViewOnly.groceries || isSelectedMonthClosed}
            onToggleViewOnly={() => toggleSheetViewOnly('groceries')}
            onUpdateGrocery={handleUpdateGrocery}
            onAddGrocery={handleAddGrocery}
            onDeleteGrocery={handleDeleteGrocery}
            onResetMonthGroceries={handleResetMonthGroceries}
            onCopyMonthGroceries={handleCopyMonthGroceries}
            onSyncGroceriesToExpense={handleSyncGroceriesToExpense}
          />
        )}

        {activeTab === 'water' && (
          <WaterTrackerSheet
            state={state}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            selectedYear={selectedYear}
            yearsList={yearsList}
            onSelectYear={handleSelectYear}
            onAddYear={handleAddYear}
            onOpenSettings={() => setActiveTab('settings')}
            bilingual={bilingual}
            isViewOnly={sheetViewOnly.water}
            isMonthClosed={isSelectedMonthClosed}
            onToggleViewOnly={() => toggleSheetViewOnly('water')}
            onOpenWaterReceipt={(row, month, ratePerUnit) =>
              setActiveReceipt({
                type: 'WATER',
                yearEC: selectedYear,
                month,
                ratePerUnit,
                row,
              })
            }
            onUpdateWaterRate={handleUpdateWaterRate}
            onUpdateWaterRecord={handleUpdateWaterRecord}
            onAddWaterMember={handleAddWaterMember}
            onDeleteWaterMember={handleDeleteWaterMember}
            onResetMonthWater={handleResetMonthWater}
            onCopyMonthWater={handleCopyMonthWater}
            onSyncWaterToExpense={handleSyncWaterToExpense}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsAndBackupCenter
            state={state}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            yearsList={yearsList}
            workbooksByYear={workbooksByYear}
            shareRules={shareRules}
            bilingual={bilingual}
            onToggleBilingual={() =>
              setLangMode(langMode === 'AM' ? 'EN' : langMode === 'EN' ? 'BOTH' : 'AM')
            }
            userEmail={currentUser?.email || currentUser?.displayName || null}
            isAuthenticated={Boolean(currentUser)}
            isCloudSyncing={isCloudSyncing}
            onForceCloudPush={handleForceCloudPush}
            onGoogleLogin={() => {
              handleGoogleLogin().catch(() =>
                showToast('Google Sign-In አልተሳካም። እባክዎ እንደገና ይሞክሩ።')
              );
            }}
            onGoogleLogout={handleGoogleLogout}
            onOpenLoginScreen={() => updateLocalModeBypass(false)}
            onOpenImportExportModal={() => setIsModalOpen(true)}
            onOpenMobileAppModal={() => setIsMobileAppModalOpen(true)}
            onSelectYear={handleSelectYear}
            onAddYear={handleAddYear}
            onDeleteYear={handleDeleteYear}
            onResetYear={handleResetYear}
            onUpdateShareRules={setShareRules}
            onUpdateTenantSplit={handleUpdateTenantSplit}
            onUpdateExpenseSplit={handleUpdateExpenseSplit}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Thumb-Zone Tab Bar (< 768px) */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe no-print"
      >
        <div className="grid grid-cols-6 items-center h-16 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              activeTab === 'analytics'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">ትንታኔ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rental')}
            className={`relative min-h-[48px] flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              activeTab === 'rental'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">ኪራይ ክፍፍል</span>
            {sheetViewOnly.rental && (
              <Lock className="w-2.5 h-2.5 text-amber-600 absolute top-1 right-2" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mesfin')}
            className={`relative min-h-[48px] flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              activeTab === 'mesfin'
                ? 'text-blue-600 font-bold bg-blue-50/70'
                : 'text-slate-500 hover:text-blue-700'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">መስፍን</span>
            {sheetViewOnly.mesfin && (
              <Lock className="w-2.5 h-2.5 text-amber-600 absolute top-1 right-2" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('zewdnesh')}
            className={`relative min-h-[48px] flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              activeTab === 'zewdnesh'
                ? 'text-purple-600 font-bold bg-purple-50/70'
                : 'text-slate-500 hover:text-purple-700'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">ዘውድነሽ</span>
            {sheetViewOnly.zewdnesh && (
              <Lock className="w-2.5 h-2.5 text-amber-600 absolute top-1 right-2" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groceries')}
            className={`relative min-h-[48px] flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              activeTab === 'groceries'
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingBasket className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">አስቤዛ</span>
            {sheetViewOnly.groceries && (
              <Lock className="w-2.5 h-2.5 text-amber-600 absolute top-1 right-2" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('water')}
            className={`relative min-h-[48px] flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              activeTab === 'water'
                ? 'text-sky-600 font-bold bg-sky-50/70'
                : 'text-slate-500 hover:text-sky-700'
            }`}
          >
            <Droplets className="w-5 h-5" />
            <span className="text-[10px] tracking-tight mt-1">ውሃ</span>
            {sheetViewOnly.water && (
              <Lock className="w-2.5 h-2.5 text-amber-600 absolute top-1 right-2" />
            )}
          </button>
        </div>
      </nav>

      {/* Clean Quiet Footer (Hidden on small mobile where Bottom Nav is anchored, visible on tablet/desktop) */}
      <footer className="hidden md:block bg-white border-t border-slate-200 mt-12 no-print">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            መስፍን እና ዘውድነሽ — የኪራይ ንብረት፣ የግል ሂሳብ እና የአስቤዛ ወጪ መከታተያ ({selectedYear})
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setActiveTab('settings')}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              Google Sheets ማመሳከሪያ & የስሌት ሕጎች
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => {
                exportWorkbookToExcel(state, undefined, selectedMonth);
                showToast(`በመደበኛው የPDF/Excel ዲዛይን የተዘጋጀው የ${selectedYear} Excel (.xlsx) ወርዷል!`);
              }}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              Excel ሪፖርት አውርድ (.xlsx)
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsMobileAppModalOpen(true)}
              className="hover:text-emerald-800 font-semibold text-emerald-700 underline cursor-pointer"
            >
              📱 የሞባይል መተግበሪያ አውርድ (Mobile App)
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => {
                setPdfReportScope('FULL_EXECUTIVE');
                setIsPdfReportOpen(true);
              }}
              className="hover:text-slate-900 underline cursor-pointer"
            >
              PDF / Excel ህትመት
            </button>
          </div>
        </div>
      </footer>

      {/* Downloadable Mobile App & Shared Database Auto-Sync Modal */}
      <MobileAppModal
        isOpen={isMobileAppModalOpen}
        onClose={() => setIsMobileAppModalOpen(false)}
        selectedYear={selectedYear}
        userEmail={currentUser?.email || currentUser?.displayName || null}
        userUid={currentUser?.uid || null}
        isAuthenticated={Boolean(currentUser)}
        isCloudSyncing={isCloudSyncing}
        lastSyncedTime={lastSyncedTime}
        onForceCloudPush={handleForceCloudPush}
        onGoogleLogin={() => {
          handleGoogleLogin().catch(() =>
            showToast('Google Sign-In አልተሳካም። እባክዎ እንደገና ይሞክሩ።')
          );
        }}
        onShowToast={showToast}
      />

      {/* Executive PDF & Excel Report Studio & Print Template Modal */}
      <PdfReportModal
        isOpen={isPdfReportOpen}
        onClose={() => setIsPdfReportOpen(false)}
        state={state}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        bilingual={bilingual}
        initialScope={pdfReportScope}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        state={state}
        selectedMonth={selectedMonth}
        onOpenBackupCenter={() => setActiveTab('settings')}
        onOpenPdfReport={(scope) => {
          setPdfReportScope(scope || 'FULL_EXECUTIVE');
          setIsPdfReportOpen(true);
        }}
        onImportState={async (newState) => {
          const withYear = { ...newState, yearEC: selectedYear };
          setWorkbooksByYear((prevMap) => ({
            ...prevMap,
            [selectedYear]: withYear,
          }));
          if (currentUser) {
            setIsCloudSyncing(true);
            try {
              await uploadFullWorkbookToFirestore(
                currentUser.uid,
                selectedYear,
                withYear,
                true
              );
              showToast(`የExcel መረጃው ለ${selectedYear} ተጭኖ ወደ Firebase Cloud ተመሳክሯል!`);
            } catch (err) {
              setRuntimeError(err instanceof Error ? err : new Error(String(err)));
            } finally {
              setIsCloudSyncing(false);
            }
          } else {
            showToast(`የExcel መረጃው ለ${selectedYear} በተሳካ ሁኔታ ተጭኗል።`);
          }
        }}
      />

      {/* Enterprise Audit Trail, Period Closing, Admin PIN & Snapshot Restore Modal */}
      <AuditAndSecurityModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        selectedYear={selectedYear}
        auditLogs={auditLogs}
        onUndoAudit={handleUndoAudit}
        onClearAuditLogs={() => setAuditLogs([])}
        snapshots={snapshots}
        onCreateSnapshot={(lbl) => createSnapshot(lbl, false)}
        onRestoreSnapshot={handleRestoreSnapshot}
        onDeleteSnapshot={(id) => setSnapshots((prev) => prev.filter((s) => s.id !== id))}
        closedMonths={currentYearClosedMonths}
        onToggleClosedMonth={handleToggleClosedMonth}
        adminPin={adminPin}
        onUpdateAdminPin={handleUpdateAdminPin}
        sheetViewOnly={sheetViewOnly}
        onLockAllSheets={() => {
          setSheetViewOnly({ ...DEFAULT_SHEET_VIEW_ONLY });
          showToast('🔒 ሁሉም 5 የመረጃ ገጾች ወደ እይታ ብቻ (Strict View-Only Lock) ተቆልፈዋል።');
        }}
        onUnlockAllSheets={() => {
          if (adminPin) {
            setPendingPinTarget('ALL');
            return;
          }
          setSheetViewOnly({
            rental: false,
            mesfin: false,
            zewdnesh: false,
            groceries: false,
            water: false,
          });
          showToast('✏️ ሁሉም 5 የመረጃ ገጾች ለአርትዖት (Edit Mode) ተከፍተዋል።');
        }}
      />

      {/* Admin Edit PIN Prompt Modal */}
      <PinPromptModal
        isOpen={Boolean(pendingPinTarget && adminPin)}
        sheetLabel={
          pendingPinTarget === 'ALL'
            ? 'ሁሉም 5 ገጾች (All 5 Sheets)'
            : pendingPinTarget
            ? SHEET_LABELS_AM[pendingPinTarget]
            : ''
        }
        expectedPin={adminPin || ''}
        onCancel={() => setPendingPinTarget(null)}
        onSuccess={() => {
          if (pendingPinTarget === 'ALL') {
            setSheetViewOnly({
              rental: false,
              mesfin: false,
              zewdnesh: false,
              groceries: false,
              water: false,
            });
            showToast('✏️ ሁሉም 5 የመረጃ ገጾች ለአርትዖት (Edit Mode) ተከፍተዋል።');
          } else if (pendingPinTarget) {
            applyUnlockSheet(pendingPinTarget, false);
          }
          setPendingPinTarget(null);
        }}
      />

      {/* Official Printable & Shareable Rent / Water Receipt Modal */}
      <PaymentReceiptModal
        receipt={activeReceipt}
        onClose={() => setActiveReceipt(null)}
      />
    </div>
  );
}
