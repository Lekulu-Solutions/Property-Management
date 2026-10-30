import React, { useState } from 'react';
import {
  LogIn,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { LanguageSelector, useLanguage } from '../utils/i18n';

interface LoginPageProps {
  onGoogleLogin: () => Promise<void>;
  onContinueLocal: () => void;
  yearEC: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onGoogleLogin,
  onContinueLocal,
  yearEC,
}) => {
  const { tr } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLoginClick = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onGoogleLogin();
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? tr(
              'የGoogle መግቢያ መስኮቱ ተዘግቷል። እባክዎ እንደገና ይሞክሩ።',
              'Google sign-in popup was closed. Please try again.',
              'የGoogle መግቢያ መስኮቱ ተዘግቷል (Google sign-in popup closed. Please try again).'
            )
          : tr(
              'በGoogle መለያ መግባት አልተቻለም። እባክዎ እንደገና ይሞክሩ።',
              'Could not sign in with Google. Please try again.',
              'በGoogle መለያ መግባት አልተቻለም (Could not sign in with Google. Please try again).'
            );
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedYear = tr(
    `የሂሳብ ዓመት ${yearEC.replace(' EC', ' ዓ.ም')}`,
    `Fiscal Year ${yearEC}`,
    `የሂሳብ ዓመት ${yearEC.replace(' EC', ' ዓ.ም')} (Fiscal Year ${yearEC})`
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center overflow-hidden rounded-xs shrink-0">
              <span className="w-2 h-3.5 bg-blue-600" />
              <span className="w-2 h-3.5 bg-purple-600" />
            </span>
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
              {tr(
                'መስፍን እና ዘውድነሽ · የሂሳብ መዝገብ',
                'Mesfin & Zewdnesh · Financial Ledger',
                'መስፍን እና ዘውድነሽ · የሂሳብ መዝገብ (Mesfin & Zewdnesh Ledger)'
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSelector variant="select" />

            <button
              onClick={handleLoginClick}
              disabled={isSubmitting}
              className="min-h-[38px] px-3.5 sm:px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {tr('በGoogle ይግቡ', 'Sign in with Google', 'በGoogle ይግቡ (Sign in)')}
            </button>
          </div>
        </div>
      </header>

      {/* Main 2-Column Split Viewport */}
      <main className="flex-1 flex items-center justify-center px-3.5 sm:px-6 py-6 sm:py-12">
        <div className="max-w-[1000px] w-full grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-lg overflow-hidden items-stretch shadow-xs">
          {/* Left 7 Columns: Clean System Summary */}
          <div className="order-2 lg:order-1 lg:col-span-7 p-6 sm:p-8 bg-slate-900 text-white flex flex-col justify-between">
            <div className="space-y-5">
              <div className="text-xs text-slate-400">{formattedYear}</div>

              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                  {tr(
                    'መስፍን እና ዘውድነሽ — የሂሳብ መዝገብ ሲስተም',
                    'Mesfin & Zewdnesh — Financial Ledger System',
                    'መስፍን እና ዘውድነሽ — የሂሳብ መዝገብ ሲስተም (Financial Ledger System)'
                  )}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
                  {tr(
                    'የኪራይ ገቢ፣ የወጪ ክፍፍል፣ የግል መዝገቦች እና የአስቤዛ መከታተያ።',
                    'Rental income, expense allocation, personal ledgers, and groceries tracker.',
                    'የኪራይ ገቢ፣ የወጪ ክፍፍል፣ የግል መዝገቦች እና የአስቤዛ መከታተያ (Rental, Expenses, Personal Ledgers & Groceries).'
                  )}
                </p>
              </div>

              {/* 4 Core System Modules (Clean & Concise) */}
              <div className="pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 border border-slate-800 rounded-md">
                  <span className="text-emerald-400 font-mono text-[11px]">01</span>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {tr(
                      'የኪራይ እና ወጪ ክፍፍል',
                      'Rental & Expense Split',
                      'የኪራይ እና ወጪ ክፍፍል (Rental & Expense Split)'
                    )}
                  </div>
                </div>

                <div className="p-3.5 border border-slate-800 rounded-md">
                  <span className="text-blue-400 font-mono text-[11px]">02</span>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {tr(
                      'የመስፍን የግል መዝገብ',
                      "Mesfin's Personal Ledger",
                      'የመስፍን የግል መዝገብ (Mesfin Personal Ledger)'
                    )}
                  </div>
                </div>

                <div className="p-3.5 border border-slate-800 rounded-md">
                  <span className="text-purple-400 font-mono text-[11px]">03</span>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {tr(
                      'የዘውድነሽ የግል መዝገብ',
                      "Zewdnesh's Personal Ledger",
                      'የዘውድነሽ የግል መዝገብ (Zewdnesh Personal Ledger)'
                    )}
                  </div>
                </div>

                <div className="p-3.5 border border-slate-800 rounded-md">
                  <span className="text-amber-400 font-mono text-[11px]">04</span>
                  <div className="text-sm font-semibold text-white mt-0.5">
                    {tr(
                      'የአስቤዛ መከታተያ',
                      'Groceries Tracker',
                      'የአስቤዛ መከታተያ (Groceries Tracker)'
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{tr('የክላውድ ግንኙነት', 'Cloud Sync', 'የክላውድ ግንኙነት (Cloud Sync)')}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {tr('የExcel እና PDF ሪፖርት', 'Excel & PDF Reports', 'Excel & PDF ሪፖርት')}
                </span>
              </span>
            </div>
          </div>

          {/* Right 5 Columns: Sign-In Controls */}
          <div className="order-1 lg:order-2 lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white border-b lg:border-b-0 border-slate-200">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    {tr('መግቢያ', 'Sign In', 'መግቢያ (Sign In)')}
                  </p>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {tr('ወደ ሲስተሙ ይግቡ', 'Sign in to the System', 'ወደ ሲስተሙ ይግቡ (Sign In)')}
                  </h2>
                </div>
              </div>

              {/* 3-Option Language Switcher right on the Login Card */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-medium text-slate-500">
                  {tr('ቋንቋ ይምረጡ:', 'Select Language:', 'ቋንቋ / Language:')}
                </span>
                <LanguageSelector variant="segmented" className="w-full justify-between" />
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={onContinueLocal}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <span>{tr('ቀጥታ ወደ ሲስተሙ ይግቡ (Local Mode)', 'Enter System Directly (Local Mode)', 'ቀጥታ ወደ ሲስተሙ ይግቡ (Local Mode)')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleLoginClick}
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? tr('በመግባት ላይ...', 'Signing in...', 'በመግባት ላይ... (Signing in...)')
                      : tr(
                          'በGoogle መለያ ይግቡ',
                          'Sign in with Google',
                          'በGoogle መለያ ይግቡ (Sign in with Google)'
                        )}
                  </span>
                </button>

                <div className="relative py-1 flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] text-slate-400 whitespace-nowrap">
                    {tr('ወይም', 'Or', 'ወይም (Or)')}
                  </span>
                  <div className="border-t border-slate-200 w-full" />
                </div>

                <button
                  type="button"
                  onClick={onContinueLocal}
                  className="w-full min-h-[42px] py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {tr(
                      'ያለ ኢንተርኔት ይቀጥሉ',
                      'Continue in Offline Mode',
                      'በLocal Mode ይቀጥሉ (Offline Mode)'
                    )}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  {tr(
                    'የተጠበቀ የግል መዝገብ',
                    'Private Cloud Sync',
                    'የተጠበቀ የግል መዝገብ (Private Cloud Sync)'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
