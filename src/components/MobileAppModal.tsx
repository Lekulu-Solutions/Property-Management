import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  RefreshCw,
  Copy,
  Check,
  Share2,
  X,
  FileCode2,
  Link2,
  Cloud,
  LogIn,
} from 'lucide-react';
import {
  buildCurrentCloudBootstrapPayload,
  exportCloudSyncPairingCode,
  getSavedCloudSessionInfo,
  signInInsideAndroidApk,
} from '../firebase';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: string;
  userEmail: string | null;
  userUid: string | null;
  isAuthenticated: boolean;
  isCloudSyncing: boolean;
  lastSyncedTime: string | null;
  onForceCloudPush: () => void;
  onGoogleLogin: () => void;
  onShowToast: (msg: string) => void;
}

const APK_FILE_NAME = 'Mesfin_Zewdnesh_Ledger.apk';
const APK_VERSION_QUERY = 'v=4.0.0';
const ANDROID_STUDIO_ZIP_NAME = 'Mesfin_Zewdnesh_Android_Studio_Project.zip';

export const MobileAppModal: React.FC<MobileAppModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  isAuthenticated,
  isCloudSyncing,
  onForceCloudPush,
  onGoogleLogin,
  onShowToast,
}) => {
  const [copiedSyncKey, setCopiedSyncKey] = useState(false);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [isSharingApkFile, setIsSharingApkFile] = useState(false);
  const [isDownloadingSource, setIsDownloadingSource] = useState(false);

  if (!isOpen) return null;

  const isRunningInsideApk =
    typeof window !== 'undefined' && window.location.protocol === 'file:';

  const pairingCode = isAuthenticated ? exportCloudSyncPairingCode() : null;
  const savedCloudSession = getSavedCloudSessionInfo();

  const handleCopyPairingKey = async () => {
    if (!pairingCode) {
      onShowToast('መጀመሪያ በGoogle ይግቡ (Sign in with Google first)።');
      return;
    }
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopiedSyncKey(true);
      onShowToast('የማመሳከሪያ ኮድ ተቀድቷል (Sync Key Copied)!');
      setTimeout(() => setCopiedSyncKey(false), 3000);
    } catch {
      onShowToast('ኮዱን መቅዳት አልተቻለም።');
    }
  };

  const handleApplyPairingKey = async () => {
    if (!pairingCodeInput.trim()) {
      onShowToast('እባክዎ የማመሳከሪያ ኮዱን (MZSYNC1:...) ያስገቡ።');
      return;
    }
    try {
      const res = await signInInsideAndroidApk(pairingCodeInput);
      setPairingCodeInput('');
      onShowToast(`Synced (${res.user.email || 'Cloud'}) ተገናኝቷል!`);
      onClose();
    } catch {
      onShowToast('ኮዱ ትክክል አይደለም። ድጋሚ ኮፒ ያድርጉ።');
    }
  };

  const fetchSyncedApkArrayBuffer = async (): Promise<ArrayBuffer> => {
    const bootstrapPayload = buildCurrentCloudBootstrapPayload();
    if (bootstrapPayload && bootstrapPayload.authUser) {
      try {
        const syncedResp = await fetch('/api/build-synced-apk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bootstrapPayload),
        });
        if (syncedResp.ok) {
          return await syncedResp.arrayBuffer();
        }
      } catch {
        // Fallback to static APK below
      }
    }
    const response = await fetch(`${APK_FILE_NAME}?${APK_VERSION_QUERY}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.arrayBuffer();
  };

  const handleDownloadAndroidApk = async () => {
    if (isRunningInsideApk) {
      onShowToast('አሁን በአንድሮይድ መተግበሪያው ውስጥ ነዎት!');
      return;
    }
    setIsDownloadingApk(true);
    try {
      const arrayBuffer = await fetchSyncedApkArrayBuffer();
      const apkBlob = new Blob([arrayBuffer], {
        type: 'application/vnd.android.package-archive',
      });
      const blobUrl = URL.createObjectURL(apkBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = APK_FILE_NAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      onShowToast('Mesfin_Zewdnesh_Ledger.apk ወርዷል!');
    } catch {
      const a = document.createElement('a');
      a.href = `${APK_FILE_NAME}?${APK_VERSION_QUERY}`;
      a.download = APK_FILE_NAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloadingApk(false);
    }
  };

  const handleShareApkFileDirectly = async () => {
    setIsSharingApkFile(true);
    try {
      const arrayBuffer = await fetchSyncedApkArrayBuffer();
      const apkFile = new File([arrayBuffer], APK_FILE_NAME, {
        type: 'application/vnd.android.package-archive',
      });

      if (
        typeof navigator !== 'undefined' &&
        'canShare' in navigator &&
        navigator.canShare({ files: [apkFile] })
      ) {
        await navigator.share({
          title: 'MZ Ledger Android App (.APK)',
          files: [apkFile],
        });
        onShowToast('የAPK ፋይሉ ተልኳል!');
        return;
      }

      const blobUrl = URL.createObjectURL(apkFile);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = APK_FILE_NAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      onShowToast('Mesfin_Zewdnesh_Ledger.apk ወርዷል!');
    } catch {
      await handleDownloadAndroidApk();
    } finally {
      setIsSharingApkFile(false);
    }
  };

  const handleDownloadAndroidSourceProject = async () => {
    setIsDownloadingSource(true);
    try {
      const a = document.createElement('a');
      a.href = `${ANDROID_STUDIO_ZIP_NAME}?${APK_VERSION_QUERY}`;
      a.download = ANDROID_STUDIO_ZIP_NAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onShowToast('Android Studio (.ZIP) ወርዷል!');
    } finally {
      setIsDownloadingSource(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto no-print">
      <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full shadow-xl overflow-hidden my-auto">
        {/* Clean Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold">
              የአንድሮይድ መተግበሪያ (.APK) መጫኛ ቅደም ተከተል
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ዝጋ (Close)"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simple 3-Step Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Step 1: Download & Install Steps */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="font-bold text-slate-900 text-sm">
              ደረጃ 1፦ መተግበሪያውን በስልክ ላይ ለመጫን (How to Install)
            </div>

            <ol className="space-y-2 text-slate-700">
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  ከታች ባለው ቁልፍ <strong>{APK_FILE_NAME}</strong> ፋይሉን ያውርዱ።
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  የወረደውን <strong>.apk ፋይል</strong> (በTelegram / WhatsApp) ወደ ስልክዎ ይላኩ።
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  በስልክዎ ላይ ከፍተው <strong>«Install» → «Open»</strong> ይበሉት።
                </span>
              </li>
            </ol>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadAndroidApk}
                disabled={isDownloadingApk}
                className="flex-1 min-h-[40px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>{isDownloadingApk ? 'በማውረድ ላይ...' : '1. APK አውርድ (Download .APK)'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareApkFileDirectly}
                disabled={isSharingApkFile}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{isSharingApkFile ? 'በማዘጋጀት ላይ...' : 'ወደ ስልክ ላክ (Send)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadAndroidSourceProject}
                disabled={isDownloadingSource}
                title="Download Android Studio Project (.ZIP)"
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <FileCode2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Source (.ZIP)</span>
              </button>
            </div>
          </div>

          {/* Step 2: Cloud Sync Steps */}
          <div className="bg-slate-900 text-white rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">የክላውድ ግንኙነት:</span>
                {isAuthenticated ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Cloud className="w-4 h-4" />
                    <span>
                      {isCloudSyncing ? 'Syncing...' : `Synced (${userEmail || 'User'})`}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400">Local Mode</span>
                )}
              </div>

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={onForceCloudPush}
                  disabled={isCloudSyncing}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>Cloud አዘምን</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>
                    {savedCloudSession ? `በGoogle ይግቡ (${savedCloudSession.email})` : 'በGoogle ይግቡ'}
                  </span>
                </button>
              )}
            </div>

            <div className="font-bold text-emerald-300 text-xs">
              ደረጃ 2፦ ስልክን ከክላውድ ጋር ለማገናኘት (How to Sync Cloud)
            </div>

            <ol className="space-y-1.5 text-slate-300">
              <li>1. በኮምፒውተር ላይ <strong>«Copy Sync Key»</strong> ይጫኑ።</li>
              <li>2. በስልክዎ APK ውስጥ ኮዱን ለጥፈው <strong>«Link Cloud»</strong> ይጫኑ።</li>
            </ol>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              {isAuthenticated && pairingCode && (
                <button
                  type="button"
                  onClick={handleCopyPairingKey}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  {copiedSyncKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSyncKey ? 'ተቀድቷል (Copied)' : '1. Copy Sync Key'}</span>
                </button>
              )}

              <input
                type="text"
                value={pairingCodeInput}
                onChange={(e) => setPairingCodeInput(e.target.value)}
                placeholder="Sync Key (MZSYNC1:...) እዚህ ይለጥፉ"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />

              <button
                type="button"
                onClick={handleApplyPairingKey}
                className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>2. Link Cloud</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            ዝጋ (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
