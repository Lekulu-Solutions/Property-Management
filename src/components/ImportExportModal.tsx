import React, { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderOpen,
  ShieldCheck,
  Layers,
  Printer,
} from 'lucide-react';
import {
  EthiopianMonth,
  WorkbookState,
  INITIAL_WORKBOOK_STATE,
} from '../data/initialLedgerData';
import {
  exportWorkbookToExcel,
  parseMarkdownWorkbook,
  parseUploadedFile,
  ReportTemplateScope,
  saveWorkbookToDesignatedLocalFile,
} from '../utils/excelParser';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: WorkbookState;
  selectedMonth?: EthiopianMonth | 'ANNUAL';
  onImportState: (newState: WorkbookState) => void;
  onOpenBackupCenter?: () => void;
  onOpenPdfReport?: (scope?: ReportTemplateScope) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  state,
  selectedMonth = 'ጥቅምት',
  onImportState,
  onOpenBackupCenter,
  onOpenPdfReport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateScope, setTemplateScope] = useState<ReportTemplateScope>('FULL_EXECUTIVE');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const parsed = await parseUploadedFile(file);
      onImportState(parsed);
      setStatusMessage({
        type: 'success',
        text: `ፋይሉ (${file.name}) በተሳካ ሁኔታ ተነቧል! ${parsed.tenants.length} ተከራዮች እና ${parsed.groceries.length} የአስቤዛ ዕቃዎች ተዘምነዋል።`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'ፋይሉን ማንበብ አልተቻለም። እባክዎ ትክክለኛ .xlsx, .csv, .md ወይም .json ፋይል ይምረጡ።',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReloadAttachedMarkdown = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/assets/aistudio/Rental_Property_Expense_683e5269.md');
      if (res.ok) {
        const md = await res.text();
        const parsed = parseMarkdownWorkbook(md, 'Rental_Property_Expense_683e5269.md');
        onImportState(parsed);
        setStatusMessage({
          type: 'success',
          text: 'ከተያያዘው ኦሪጅናል የExcel መረጃ (Rental_Property_Expense_683e5269) በድጋሚ ተጭኗል።',
        });
      } else {
        onImportState(JSON.parse(JSON.stringify(INITIAL_WORKBOOK_STATE)));
        setStatusMessage({
          type: 'success',
          text: 'ወደ መጀመሪያው የ2019 EC መረጃ ተመልሷል።',
        });
      }
    } catch {
      onImportState(JSON.parse(JSON.stringify(INITIAL_WORKBOOK_STATE)));
      setStatusMessage({
        type: 'success',
        text: 'ወደ መጀመሪያው የ2019 EC መረጃ ተመልሷል።',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToLocalFolder = async () => {
    try {
      const res = await saveWorkbookToDesignatedLocalFile(state, {
        activeMonth: selectedMonth,
        scope: templateScope,
        includeSignatures: true,
      });
      setStatusMessage({
        type: 'success',
        text: `መደበኛ የExcel ሪፖርት (${res.savedPathLabel}) በተሳካ ሁኔታ ተቀምጧል!`,
      });
    } catch (err: any) {
      if (err?.message !== 'USER_CANCELLED') {
        exportWorkbookToExcel(state, undefined, selectedMonth, {
          scope: templateScope,
          includeSignatures: true,
        });
      }
    }
  };

  const handleDirectStyledExcelDownload = () => {
    exportWorkbookToExcel(state, undefined, selectedMonth, {
      scope: templateScope,
      includeSignatures: true,
    });
    setStatusMessage({
      type: 'success',
      text: `በPDF መደበኛ ዲዛይን የተዘጋጀው የExcel (.xlsx) ሪፖርት ወርዷል!`,
    });
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mesfin_Zewdnesh_Backup_${state.yearEC.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-lg max-w-xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-lg my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              የExcel / PDF መደበኛ ሪፖርት እና መረጃ ማስገቢያ ({state.yearEC})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unified Executive System Design Templates for Excel (.xlsx) & PDF
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] text-slate-400 hover:text-slate-700 p-1 rounded flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Standard System Template Selector (Shared by Excel & PDF) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-700" />
              <span>የሪፖርት ዲዛይን ቴምፕሌት ምረጥ (Standard PDF & Excel Template):</span>
            </label>
            <span className="text-[11px] font-mono font-semibold text-emerald-700">
              4-Color Styled
            </span>
          </div>
          <select
            value={templateScope}
            onChange={(e) => setTemplateScope(e.target.value as ReportTemplateScope)}
            className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-emerald-700 cursor-pointer"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleDirectStyledExcelDownload}
              className="min-h-[38px] px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>በዚህ ዲዛይን Excel አውርድ (.xlsx)</span>
            </button>

            {onOpenPdfReport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPdfReport(templateScope);
                }}
                className="min-h-[38px] px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-300" />
                <span>በዚህ ዲዛይን PDF ሪፖርት ክፈት</span>
              </button>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <div className="border border-dashed border-slate-300 rounded-lg p-4 sm:p-5 text-center bg-slate-50/60">
          <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-900">
            አዲስ የExcel ወይም CSV ፋይል ይምረጡ (Import Workbook)
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Supports .xlsx, .xls, .csv, .md, and .json workbook files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.md,.txt,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[40px] px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isLoading ? 'በማንበብ ላይ...' : 'ፋይል ከኮምፒውተር ምረጥ (Browse File)'}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleReloadAttachedMarkdown}
              className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ኦሪጅናል ዳታ መልስ (Reset to Uploaded Excel)</span>
            </button>
          </div>
        </div>

        {/* Dual-Mode Backup & Export Options */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-slate-700">
            የተዘመነውን ሪፖርት አውርድ / አመሳክር (Dual-Mode Backup & Export)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option A: Google Sheets Sync */}
            {onOpenBackupCenter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackupCenter();
                }}
                className="p-3.5 text-left border border-emerald-200 bg-emerald-50/40 rounded-md hover:bg-emerald-50 transition-colors flex items-center justify-between gap-2 cursor-pointer sm:col-span-2"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      አማራጭ A: Google Sheets ቀጥታ ማመሳከሪያ (Read-Only Locked Sync)
                    </span>
                    <span className="text-[11px] text-slate-600">
                      ከGoogle መለያ ጋር አገናኝ፣ 4ቱንም ሉሆች በአንድ ክሊክ አመሳክር እና ፈቃድ ቆልፍ
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-800 shrink-0">ክፈት →</span>
              </button>
            )}

            {/* Option B1: Choose Local Folder & Save (.xlsx) */}
            <button
              type="button"
              onClick={handleSaveToLocalFolder}
              className="p-3.5 text-left border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-5 h-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    አማራጭ B: አቃፊ ምረጥ (.xlsx)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Save Styled Excel Template to Folder
                  </span>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Option B2: JSON Backup */}
            <button
              type="button"
              onClick={handleDownloadJson}
              className="p-3.5 text-left border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-sky-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    የመጠባበቂያ ፋይል (.json)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Full State Backup & Restore
                  </span>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span className="truncate">የአሁኑ ምንጭ: {state.sourceFileName}</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
          >
            ዝጋ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
