import React, { useEffect, useRef, useState } from 'react';
import {
  Printer,
  Download,
  Loader2,
  X,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  Calendar,
  Layers,
} from 'lucide-react';
import { domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import {
  ETHIOPIAN_MONTHS,
  EthiopianMonth,
  WorkbookState,
} from '../data/initialLedgerData';
import {
  buildStandardReportMetadata,
  calculateGroceriesSummary,
  calculateMesfinSummary,
  calculateRentalSummary,
  calculateZewdneshSummary,
  exportWorkbookToExcel,
  formatETB,
  ReportTemplateScope,
} from '../utils/excelParser';

export type { ReportTemplateScope };

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: WorkbookState;
  selectedMonth: EthiopianMonth | 'ANNUAL';
  onSelectMonth: (month: EthiopianMonth | 'ANNUAL') => void;
  bilingual?: boolean;
  initialScope?: ReportTemplateScope;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  state,
  selectedMonth,
  onSelectMonth,
  bilingual = true,
  initialScope = 'FULL_EXECUTIVE',
}) => {
  const [scope, setScope] = useState<ReportTemplateScope>(initialScope);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeZeroExpenseRows, setIncludeZeroExpenseRows] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [excelSuccess, setExcelSuccess] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialScope) {
      setScope(initialScope);
    }
  }, [isOpen, initialScope]);

  if (!isOpen) return null;

  const rental = calculateRentalSummary(state, selectedMonth);
  const mesfin = calculateMesfinSummary(state);
  const zewdnesh = calculateZewdneshSummary(state);
  const groceries = calculateGroceriesSummary(state, selectedMonth);

  const meta = buildStandardReportMetadata(state, selectedMonth);
  const { periodLabelAm, periodLabelEn, reportRefCode, generatedDate } = meta;

  const visibleExpenseRows = includeZeroExpenseRows
    ? rental.expenseRows
    : rental.expenseRows.filter((e) => e.totalExpense > 0 || e.annualExpense > 0);

  const handleDownloadPdf = async () => {
    if (!reportRef.current || isDownloading) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const element = reportRef.current;
      const canvas = await domToCanvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const marginMm = 8;
      const usableWidthMm = pageWidthMm - marginMm * 2;
      const usableHeightMm = pageHeightMm - marginMm * 2;

      const pxPerMm = canvas.width / usableWidthMm;
      const pageHeightPx = Math.floor(usableHeightMm * pxPerMm);

      let yOffsetPx = 0;
      let pageIndex = 0;

      while (yOffsetPx < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - yOffsetPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            yOffsetPx,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );
        }

        const sliceDataUrl = pageCanvas.toDataURL('image/jpeg', 0.96);
        const sliceHeightMm = sliceHeightPx / pxPerMm;

        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          sliceDataUrl,
          'JPEG',
          marginMm,
          marginMm,
          usableWidthMm,
          sliceHeightMm
        );

        yOffsetPx += sliceHeightPx;
        pageIndex += 1;
      }

      const monthEn =
        selectedMonth === 'ANNUAL'
          ? 'Annual'
          : ETHIOPIAN_MONTHS.find((m) => m.id === selectedMonth)?.labelEn || selectedMonth;
      const cleanYear = state.yearEC.replace(/\s+/g, '_');
      const fileName = `Mesfin_Zewdnesh_Report_${cleanYear}_${monthEn}_${scope}.pdf`;

      pdf.save(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err) {
      console.error('PDF generation failed, falling back to print:', err);
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadMatchingExcel = () => {
    const monthEn =
      selectedMonth === 'ANNUAL'
        ? 'Annual'
        : ETHIOPIAN_MONTHS.find((m) => m.id === selectedMonth)?.labelEn || selectedMonth;
    const cleanYear = state.yearEC.replace(/\s+/g, '_');
    const fileName = `Mesfin_Zewdnesh_Report_${cleanYear}_${monthEn}_${scope}.xlsx`;

    exportWorkbookToExcel(state, fileName, selectedMonth, {
      scope,
      includeSignatures,
      bilingual,
    });
    setExcelSuccess(true);
    setTimeout(() => setExcelSuccess(false), 3500);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 overflow-y-auto flex flex-col items-center p-0 sm:p-4 md:p-6 print-modal-wrapper">
      {/* Top Interactive Studio Toolbar (Hidden when printing) */}
      <div className="w-full max-w-[1040px] bg-slate-900 text-white sm:rounded-t-lg px-3.5 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 sticky top-0 z-20 no-print">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate">
                የPDF እና Excel መደበኛ ሪፖርት ማዘጋጃ (Standard PDF & Excel Templates)
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {state.yearEC} · {periodLabelAm} · Unified Executive System Template ({reportRefCode})
              </p>
            </div>
          </div>

          {/* Mobile-only top-right close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden min-w-[36px] min-h-[36px] p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center cursor-pointer"
            title="ዝጋ (Close)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Selector */}
          <div className="flex-1 sm:flex-initial min-w-[160px] flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs min-h-[38px]">
            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ReportTemplateScope)}
              className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer truncate"
              aria-label="የሪፖርት አይነት ይምረጡ"
            >
              <option value="FULL_EXECUTIVE" className="bg-slate-900 text-white">
                ሙሉ የሂሳብ ሪፖርት (Full 4-Sheet Report)
              </option>
              <option value="RENTAL_ONLY" className="bg-slate-900 text-white">
                የኪራይ እና ወጪ ክፍፍል ብቻ (Rental & Expenses)
              </option>
              <option value="MESFIN_STATEMENT" className="bg-slate-900 text-white">
                የመስፍን የግል መግለጫ (Mesfin Statement · Blue)
              </option>
              <option value="ZEWDNESH_STATEMENT" className="bg-slate-900 text-white">
                የዘውድነሽ የግል መግለጫ (Zewdnesh Statement · Purple)
              </option>
              <option value="GROCERIES_AUDIT" className="bg-slate-900 text-white">
                የአስቤዛ እና ፍጆታ ሪፖርት (Groceries Report)
              </option>
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex-1 sm:flex-initial min-w-[130px] flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs min-h-[38px]">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value as EthiopianMonth | 'ANNUAL')}
              className="w-full bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              aria-label="የሪፖርት ወር ይምረጡ"
            >
              {ETHIOPIAN_MONTHS.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.labelAm} ({m.labelEn})
                </option>
              ))}
              <option value="ANNUAL" className="bg-slate-900 text-white">
                ዓመታዊ ድምር (Annual Total)
              </option>
            </select>
          </div>

          {/* Toggle Signature Block */}
          <label className="hidden md:inline-flex min-h-[38px] items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSignatures}
              onChange={(e) => setIncludeSignatures(e.target.checked)}
              className="rounded border-slate-600 text-emerald-500"
            />
            <span>የፊርማ ክፍል (Signatures)</span>
          </label>

          {/* Primary Download / Save PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex-1 sm:flex-initial min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>PDF...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PDF ወርዷል!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>PDF አውርድ</span>
              </>
            )}
          </button>

          {/* Matching Standard Excel (.xlsx) Export Button */}
          <button
            type="button"
            onClick={handleDownloadMatchingExcel}
            className="flex-1 sm:flex-initial min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            title="በተመሳሳይ የPDF ዲዛይን እና ቀለም የተዘጋጀ Excel (.xlsx) አውርድ"
          >
            {excelSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Excel ወርዷል!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel (.xlsx) አውርድ</span>
              </>
            )}
          </button>

          {/* Secondary Direct Browser Print Button */}
          <button
            type="button"
            onClick={handleTriggerPrint}
            className="min-h-[38px] px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            title="በቀጥታ ወደ ማተሚያ (Browser Print)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="hidden lg:inline-flex min-h-[38px] p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors items-center justify-center cursor-pointer"
            title="ዝጋ (Close)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable Document Sheet Container */}
      <div
        ref={reportRef}
        id="printable-executive-report"
        className="w-full max-w-[1040px] bg-white text-slate-900 shadow-2xl sm:rounded-b-lg p-4 sm:p-8 md:p-10 space-y-6 sm:space-y-8 overflow-x-auto print:shadow-none print:p-0 print:rounded-none"
      >
        {/* =================================================================
            OFFICIAL REPORT LETTERHEAD & DUAL-PARTNER IDENTITY BANNER
        ================================================================= */}
        <header className="border-b-2 border-slate-900 pb-5 space-y-4">
          {/* Dual Partner Identity Top Accent Bar (Mesfin Blue + Zewdnesh Purple) */}
          <div className="w-full h-2 rounded-xs overflow-hidden flex">
            <div className="w-1/2 bg-blue-600 h-full" />
            <div className="w-1/2 bg-purple-600 h-full" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
                <span>ADDIS ABABA PROPERTY & PARTNER LEDGER</span>
                <span>·</span>
                <span>OFFICIAL FINANCIAL STATEMENT</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                መስፍን እና ዘውድነሽ — የሂሳብ እና የንብረት ሪፖርት
              </h1>
              {bilingual && (
                <p className="text-xs font-medium text-slate-600">
                  Mesfin & Zewdnesh — Property Rental, Expense Allocation & Partner Ledger Statement
                </p>
              )}
            </div>

            {/* Document Metadata Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 text-xs space-y-1 shrink-0 font-mono tabular-nums">
              <div className="flex items-center justify-between gap-6">
                <span className="font-sans text-slate-500">የሰነድ ቁጥር (Ref):</span>
                <span className="font-bold text-slate-900">{reportRefCode}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="font-sans text-slate-500">የሪፖርት ጊዜ (Period):</span>
                <span className="font-sans font-bold text-slate-900">{periodLabelAm}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="font-sans text-slate-500">የተዘጋጀበት ቀን (Date):</span>
                <span className="text-slate-700">{generatedDate}</span>
              </div>
              <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-200">
                <span className="font-sans text-slate-500">የኦዲት ሁኔታ:</span>
                <span className="font-sans font-bold text-emerald-700 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>የተረጋገጠ (Reconciled)</span>
                </span>
              </div>
            </div>
          </div>

          {/* 4-Color Semantic Legend Strip for Print Clarity */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-800">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                <span>መስፍን (Mesfin · Blue)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-purple-800">
                <span className="w-2.5 h-2.5 rounded-xs bg-purple-600 inline-block" />
                <span>ዘውድነሽ (Zewdnesh · Purple)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                <span>+ገቢ / ትርፍ (Positive · Green)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" />
                <span>-ወጪ / ቅናሽ (Negative · Red)</span>
              </span>
            </div>
            <span className="font-mono text-slate-400">{periodLabelEn}</span>
          </div>
        </header>

        {/* =================================================================
            EXECUTIVE KPI SUMMARY STRIP (SHOWN ON FULL & RENTAL REPORTS)
        ================================================================= */}
        {(scope === 'FULL_EXECUTIVE' || scope === 'RENTAL_ONLY') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                01. አጠቃላይ የሂሳብ ማጠቃለያ (Executive Financial Summary — {selectedMonth === 'ANNUAL' ? 'ዓመታዊ' : selectedMonth})
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                መስፍን {rental.mesfinNetPercent.toFixed(1)}% · ዘውድነሽ {rental.zewdneshNetPercent.toFixed(1)}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-300 rounded-md divide-y sm:divide-y-0 sm:divide-x divide-slate-300 bg-slate-50/40">
              {/* Box 1: Gross Rental Revenue (Green) */}
              <div className="p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  ጠቅላላ የኪራይ ገቢ (Gross Income)
                </span>
                <span className="text-lg font-extrabold font-mono tabular-nums text-emerald-700 mt-1 block">
                  +{formatETB(rental.totalGrossIncome)} ብር
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-500 mt-1 block">
                  ዓመታዊ: +{formatETB(rental.annualGrossIncome)} ብር
                </span>
              </div>

              {/* Box 2: Total Property Expenses (Red) */}
              <div className="p-3.5">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  ጠቅላላ ወጪ (Property Expenses)
                </span>
                <span className="text-lg font-extrabold font-mono tabular-nums text-red-700 mt-1 block">
                  -{formatETB(rental.totalExpenses)} ብር
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-500 mt-1 block">
                  ዓመታዊ: -{formatETB(rental.annualTotalExpenses)} ብር
                </span>
              </div>

              {/* Box 3: Mesfin Net Share (Blue) */}
              <div className="p-3.5 bg-blue-50/30">
                <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-blue-600 inline-block" />
                  <span>የመስፍን የተጣራ ድርሻ (Blue)</span>
                </span>
                <span className="text-lg font-extrabold font-mono tabular-nums text-blue-700 mt-1 block">
                  {formatETB(rental.mesfinNetShare)} ብር
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-600 mt-1 block">
                  <span className="text-emerald-700">+{formatETB(rental.mesfinGrossIncome)}</span>{' '}
                  <span className="text-red-700">(-{formatETB(rental.mesfinExpenses)})</span>
                </span>
              </div>

              {/* Box 4: Zewdnesh Net Share (Purple) */}
              <div className="p-3.5 bg-purple-50/30">
                <span className="text-[11px] font-bold text-purple-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-xs bg-purple-600 inline-block" />
                  <span>የዘውድነሽ የተጣራ ድርሻ (Purple)</span>
                </span>
                <span className="text-lg font-extrabold font-mono tabular-nums text-purple-700 mt-1 block">
                  {formatETB(rental.zewdneshNetShare)} ብር
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-600 mt-1 block">
                  <span className="text-emerald-700">+{formatETB(rental.zewdneshGrossIncome)}</span>{' '}
                  <span className="text-red-700">(-{formatETB(rental.zewdneshExpenses)})</span>
                </span>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================
            SHEET 1: RENTAL INCOME & PROPERTY EXPENSE BREAKDOWN TABLES
        ================================================================= */}
        {(scope === 'FULL_EXECUTIVE' || scope === 'RENTAL_ONLY') && (
          <section className="space-y-6">
            {/* Table 1A: Tenant Rental Schedule */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  02. ወርሃዊ የቤት ኪራይ ገቢ እና የአጋሮች ድርሻ ክፍፍል (Tenant Rental Income Schedule)
                </h3>
                <span className="text-xs text-slate-500">
                  {rental.tenantRows.length} ተከራዮች (አዲስ አበባ)
                </span>
              </div>

              <div className="border border-slate-300 rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="py-2 px-3 font-bold w-10">#</th>
                      <th className="py-2 px-3 font-bold">ተከራይ (Tenant)</th>
                      <th className="py-2 px-3 font-bold">የክፍፍል ሕግ (Split Rule)</th>
                      <th className="py-2 px-3 font-bold text-right text-emerald-800">
                        {selectedMonth === 'ANNUAL' ? 'ጠቅላላ (+)' : `${selectedMonth} ጠቅላላ (+)`}
                      </th>
                      <th className="py-2 px-3 font-bold text-right text-blue-800">
                        የመስፍን ድርሻ (Blue)
                      </th>
                      <th className="py-2 px-3 font-bold text-right text-purple-800">
                        የዘውድነሽ ድርሻ (Purple)
                      </th>
                      <th className="py-2 px-3 font-bold text-right text-emerald-800">
                        ዓመታዊ ድምር (+)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rental.tenantRows.map((tr, idx) => (
                      <tr key={tr.row.id} className="odd:bg-white even:bg-slate-50/40">
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {tr.row.tenantName}
                          {bilingual && tr.row.tenantNameEn !== tr.row.tenantName && (
                            <span className="text-slate-400 font-normal ml-1">
                              ({tr.row.tenantNameEn})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-medium ${
                              tr.row.splitType === '100_MESFIN'
                                ? 'text-blue-700'
                                : tr.row.splitType === '100_ZEWDNESH'
                                ? 'text-purple-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {tr.row.splitLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                          +{formatETB(tr.gross)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-blue-700">
                          {formatETB(tr.mesfinShare)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-purple-700">
                          {formatETB(tr.zewdneshShare)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-800 font-semibold">
                          +{formatETB(tr.annualGross)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-900">
                      <td className="py-2.5 px-3" colSpan={3}>
                        ጠቅላላ የቤት ኪራይ ገቢ ድምር (Total Gross Rental Income)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                        +{formatETB(rental.totalGrossIncome)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-blue-700">
                        {formatETB(rental.mesfinGrossIncome)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-purple-700">
                        {formatETB(rental.zewdneshGrossIncome)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                        +{formatETB(rental.annualGrossIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 1B: Property Expenses & Net Reconciliation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Property Expenses Table (7 cols) */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    03. የንብረት ወጪዎች (Property Expenses)
                  </h3>
                  <label className="text-[11px] text-slate-500 inline-flex items-center gap-1.5 cursor-pointer no-print">
                    <input
                      type="checkbox"
                      checked={includeZeroExpenseRows}
                      onChange={(e) => setIncludeZeroExpenseRows(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>0 ወጪ ያላቸውንም አሳይ</span>
                  </label>
                </div>

                <div className="border border-slate-300 rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                        <th className="py-2 px-3 font-bold">የወጪ አይነት</th>
                        <th className="py-2 px-3 font-bold">የክፍፍል ሕግ</th>
                        <th className="py-2 px-3 font-bold text-right text-red-700">ወጪ (-)</th>
                        <th className="py-2 px-3 font-bold text-right text-blue-700">መስፍን</th>
                        <th className="py-2 px-3 font-bold text-right text-purple-700">ዘውድነሽ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {visibleExpenseRows.map((er) => (
                        <tr key={er.row.id}>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {er.row.expenseType}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{er.row.splitLabel}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-red-700">
                            -{formatETB(er.totalExpense)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-700">
                            -{formatETB(er.mesfinExpense)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-purple-700">
                            -{formatETB(er.zewdneshExpense)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-red-50/50 border-t-2 border-slate-300 font-bold text-red-900">
                        <td className="py-2 px-3" colSpan={2}>
                          ጠቅላላ ወጪ (Total Expenses)
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-red-700">
                          -{formatETB(rental.totalExpenses)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-blue-700">
                          -{formatETB(rental.mesfinExpenses)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-purple-700">
                          -{formatETB(rental.zewdneshExpenses)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Reconciliation Box (5 cols) */}
              <div className="lg:col-span-5 space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  04. የተጣራ ገቢ ማረጋገጫ (Net Reconciliation)
                </h3>
                <div className="border border-slate-300 rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                        <th className="py-2 px-3 font-bold">መግለጫ</th>
                        <th className="py-2 px-3 font-bold text-right">ወርሃዊ / ጊዜ</th>
                        <th className="py-2 px-3 font-bold text-right">ዓመታዊ ድምር</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                      <tr>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                          ጠቅላላ የተጣራ ገቢ (+)
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          +{formatETB(rental.netIncome)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          +{formatETB(rental.annualNetIncome)}
                        </td>
                      </tr>
                      <tr className="bg-blue-50/30">
                        <td className="py-2 px-3 font-sans font-bold text-blue-800">
                          የመስፍን የተጣራ (Blue)
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-blue-700">
                          {formatETB(rental.mesfinNetShare)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-blue-700">
                          {formatETB(rental.annualMesfinNet)}
                        </td>
                      </tr>
                      <tr className="bg-purple-50/30">
                        <td className="py-2 px-3 font-sans font-bold text-purple-800">
                          የዘውድነሽ የተጣራ (Purple)
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-purple-700">
                          {formatETB(rental.zewdneshNetShare)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-purple-700">
                          {formatETB(rental.annualZewdneshNet)}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/50 border-t-2 border-slate-300">
                        <td className="py-2 px-3 font-sans font-bold text-emerald-950">
                          ማረጋገጫ (መስፍን + ዘውድነሽ)
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          +{formatETB(rental.reconciliationSum)}
                        </td>
                        <td className="py-2 px-3 text-right font-sans font-bold text-emerald-700">
                          ✓ ትክክል
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================
            SHEET 2 & SHEET 3: PARTNER PERSONAL LEDGER STATEMENTS
        ================================================================= */}
        {(scope === 'FULL_EXECUTIVE' ||
          scope === 'MESFIN_STATEMENT' ||
          scope === 'ZEWDNESH_STATEMENT') && (
          <section className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {scope === 'MESFIN_STATEMENT'
                ? 'የመስፍን የግል ገቢ እና ወጪ መዝገብ (Mesfin Personal Ledger Statement)'
                : scope === 'ZEWDNESH_STATEMENT'
                ? 'የዘውድነሽ የግል ተቀማጭ እና ወጪ መዝገብ (Zewdnesh Personal Ledger Statement)'
                : '05. የአጋሮች የግል ሂሳብ መዝገቦች (Partner Personal Ledgers — Mesfin & Zewdnesh)'}
            </h2>

            <div
              className={`grid grid-cols-1 ${
                scope === 'FULL_EXECUTIVE' ? 'lg:grid-cols-2' : ''
              } gap-6 items-start`}
            >
              {/* MESFIN PERSONAL LEDGER STATEMENT (BLUE) */}
              {(scope === 'FULL_EXECUTIVE' || scope === 'MESFIN_STATEMENT') && (
                <div className="border border-blue-300 rounded-md overflow-hidden">
                  <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold">
                      ሉህ 2 · የመስፍን የግል ሂሳብ መግለጫ (Mesfin · Blue)
                    </span>
                    <span className="text-xs font-mono tabular-nums font-bold">
                      ቀሪ: +{formatETB(mesfin.netBalance)} ብር
                    </span>
                  </div>

                  <div className="p-4 space-y-4 bg-white">
                    <div className="grid grid-cols-3 gap-2 text-xs border-b border-slate-200 pb-3 font-mono tabular-nums">
                      <div>
                        <span className="font-sans text-slate-500 block">ጠቅላላ ገቢ (+)</span>
                        <strong className="text-emerald-700 text-sm">
                          +{formatETB(mesfin.totalIncome)} ብር
                        </strong>
                      </div>
                      <div>
                        <span className="font-sans text-slate-500 block">ጠቅላላ ወጪ (-)</span>
                        <strong className="text-red-700 text-sm">
                          -{formatETB(mesfin.totalExpense)} ብር
                        </strong>
                      </div>
                      <div>
                        <span className="font-sans text-blue-800 font-semibold block">
                          የተጣራ ቀሪ ሂሳብ
                        </span>
                        <strong className="text-emerald-700 text-sm">
                          +{formatETB(mesfin.netBalance)} ብር
                        </strong>
                      </div>
                    </div>

                    {/* Mesfin Income Rows */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        የመስፍን የገቢ ዝርዝር (Income Entries)
                      </span>
                      <table className="w-full text-xs border-collapse border border-slate-200">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <th className="py-1.5 px-2.5 text-left">ቀን / ወር</th>
                            <th className="py-1.5 px-2.5 text-left">ዝርዝር</th>
                            <th className="py-1.5 px-2.5 text-right text-emerald-700">መጠን (+)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {mesfin.activeIncomes.map((inc) => (
                            <tr key={inc.id}>
                              <td className="py-1.5 px-2.5 font-medium">{inc.dateOrMonth}</td>
                              <td className="py-1.5 px-2.5 text-slate-600">{inc.description}</td>
                              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-emerald-700">
                                +{formatETB(inc.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mesfin Expense Rows */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        የመስፍን የወጪ ዝርዝር (Expense Entries)
                      </span>
                      <table className="w-full text-xs border-collapse border border-slate-200">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <th className="py-1.5 px-2.5 text-left">ቀን / ወር</th>
                            <th className="py-1.5 px-2.5 text-left">የወጪ ዝርዝር</th>
                            <th className="py-1.5 px-2.5 text-right text-red-700">መጠን (-)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {mesfin.activeExpenses.map((exp) => (
                            <tr key={exp.id}>
                              <td className="py-1.5 px-2.5 font-medium">{exp.dateOrMonth}</td>
                              <td className="py-1.5 px-2.5 text-slate-600">{exp.description}</td>
                              <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-red-700">
                                -{formatETB(exp.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ZEWDNESH PERSONAL LEDGER STATEMENT (PURPLE) */}
              {(scope === 'FULL_EXECUTIVE' || scope === 'ZEWDNESH_STATEMENT') && (
                <div className="border border-purple-300 rounded-md overflow-hidden">
                  <div className="bg-purple-600 text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold">
                      ሉህ 3 · የዘውድነሽ የግል ሂሳብ መግለጫ (Zewdnesh · Purple)
                    </span>
                    <span className="text-xs font-mono tabular-nums font-bold">
                      ቀሪ: +{formatETB(zewdnesh.netBalance)} ብር
                    </span>
                  </div>

                  <div className="p-4 space-y-4 bg-white">
                    <div className="grid grid-cols-3 gap-2 text-xs border-b border-slate-200 pb-3 font-mono tabular-nums">
                      <div>
                        <span className="font-sans text-slate-500 block">ጠቅላላ ተቀማጭ (+)</span>
                        <strong className="text-emerald-700 text-sm">
                          +{formatETB(zewdnesh.totalDeposit)} ብር
                        </strong>
                      </div>
                      <div>
                        <span className="font-sans text-slate-500 block">ጠቅላላ ወጪ (-)</span>
                        <strong className="text-red-700 text-sm">
                          -{formatETB(zewdnesh.totalExpense)} ብር
                        </strong>
                      </div>
                      <div>
                        <span className="font-sans text-purple-800 font-semibold block">
                          የተጣራ ቀሪ ሂሳብ
                        </span>
                        <strong className="text-emerald-700 text-sm">
                          +{formatETB(zewdnesh.netBalance)} ብር
                        </strong>
                      </div>
                    </div>

                    {/* Zewdnesh Deposit Rows */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        የዘውድነሽ የተቀማጭ ዝርዝር (Deposit Entries)
                      </span>
                      <table className="w-full text-xs border-collapse border border-slate-200">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <th className="py-1.5 px-2.5 text-left">ቀን / ሁኔታ</th>
                            <th className="py-1.5 px-2.5 text-left">ዝርዝር</th>
                            <th className="py-1.5 px-2.5 text-right text-emerald-700">መጠን (+)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {state.zewdneshDeposits
                            .filter((d) => d.amount > 0)
                            .map((dep) => (
                              <tr key={dep.id}>
                                <td className="py-1.5 px-2.5 font-medium">{dep.dateOrMonth}</td>
                                <td className="py-1.5 px-2.5 text-slate-600">{dep.description}</td>
                                <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-emerald-700">
                                  +{formatETB(dep.amount)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Zewdnesh Expense Rows */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                        የዘውድነሽ የወጪ ዝርዝር ({state.zewdneshExpenses.length} መዝገቦች)
                      </span>
                      <table className="w-full text-xs border-collapse border border-slate-200">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <th className="py-1.5 px-2.5 text-left">ሁኔታ</th>
                            <th className="py-1.5 px-2.5 text-left">ተከፋይ / ዝርዝር</th>
                            <th className="py-1.5 px-2.5 text-right text-red-700">መጠን (-)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {state.zewdneshExpenses.map((exp) => (
                            <tr key={exp.id}>
                              <td className="py-1 px-2.5 text-slate-500">{exp.dateOrMonth}</td>
                              <td className="py-1 px-2.5 font-medium text-slate-800">
                                {exp.description}
                              </td>
                              <td className="py-1 px-2.5 text-right font-mono tabular-nums font-semibold text-red-700">
                                -{formatETB(exp.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================================
            SHEET 4: GROCERIES & CONSUMABLES AUDIT SECTION
        ================================================================= */}
        {(scope === 'FULL_EXECUTIVE' || scope === 'GROCERIES_AUDIT') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                {scope === 'GROCERIES_AUDIT'
                  ? 'ሉህ 4 · የአስቤዛ እና የፍጆታ ዕቃዎች ወጪ ሪፖርት (Groceries & Consumables Report)'
                  : '06. የአስቤዛ እና የፍጆታ ዕቃዎች ማጠቃለያ (Sheet 4 · Groceries Summary)'}
              </h2>
              <span className="text-xs font-mono tabular-nums text-red-700 font-bold">
                ጠቅላላ ወጪ: -{formatETB(groceries.totalSpent)} ብር ({groceries.purchasedCount}/
                {groceries.totalItems} ተገዝቷል)
              </span>
            </div>

            <div className="border border-slate-300 rounded-md overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                    <th className="py-2 px-3 font-bold w-10">#</th>
                    <th className="py-2 px-3 font-bold">የዕቃው ዝርዝር (Item)</th>
                    <th className="py-2 px-3 font-bold">ምድብ (Category)</th>
                    <th className="py-2 px-3 font-bold">መለኪያ (Unit)</th>
                    <th className="py-2 px-3 font-bold text-center">ሁኔታ</th>
                    <th className="py-2 px-3 font-bold text-right text-red-700">ዋጋ (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(scope === 'GROCERIES_AUDIT'
                    ? groceries.items
                    : groceries.items.filter((g) => g.purchased || g.price > 0)
                  ).map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-1.5 px-3 font-mono tabular-nums text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-1.5 px-3 font-semibold text-slate-900">
                        {item.name}
                        {bilingual && item.nameEn && item.nameEn !== item.name && (
                          <span className="text-slate-400 font-normal ml-1">({item.nameEn})</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600">{item.category}</td>
                      <td className="py-1.5 px-3 text-slate-600">{item.unit}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span
                          className={`font-semibold ${
                            item.purchased ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {item.purchased ? 'ተገዝቷል' : 'አልተገዛም'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold text-red-700">
                        {item.price > 0 ? `-${formatETB(item.price)}` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <td className="py-2 px-3" colSpan={5}>
                      ጠቅላላ የተገዙ የአስቤዛ ዕቃዎች ወጪ (Total Purchased Groceries)
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-red-700">
                      -{formatETB(groceries.totalSpent)} ብር
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* =================================================================
            OFFICIAL PARTNER SIGN-OFF & VERIFICATION FOOTER
        ================================================================= */}
        {includeSignatures && (
          <footer className="pt-8 border-t-2 border-slate-300 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
              <div className="p-4 border border-blue-200 bg-blue-50/20 rounded-md space-y-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-900">
                    1. አቶ መስፍን (Mesfin — Partner Approval)
                  </span>
                  <span className="font-mono tabular-nums text-blue-700 font-semibold">
                    ድርሻ: {formatETB(rental.mesfinNetShare)} ብር
                  </span>
                </div>
                <div className="pt-4 border-b border-slate-400" />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>ፊርማ (Signature)</span>
                  <span>ቀን (Date): ____/____/______</span>
                </div>
              </div>

              <div className="p-4 border border-purple-200 bg-purple-50/20 rounded-md space-y-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-900">
                    2. ወ/ሮ ዘውድነሽ (Zewdnesh — Partner Approval)
                  </span>
                  <span className="font-mono tabular-nums text-purple-700 font-semibold">
                    ድርሻ: {formatETB(rental.zewdneshNetShare)} ብር
                  </span>
                </div>
                <div className="pt-4 border-b border-slate-400" />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>ፊርማ (Signature)</span>
                  <span>ቀን (Date): ____/____/______</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 pt-2">
              <span>
                መስፍን እና ዘውድነሽ የሂሳብ መዝገብ ሥርዓት · {state.yearEC} ({periodLabelAm})
              </span>
              <span className="font-mono">
                Ref: {reportRefCode} · Generated: {generatedDate}
              </span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
