import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || String(error),
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isQuotaError = this.state.errorMessage.includes('Quota exceeded');

    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-rose-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h1 className="text-base font-bold text-slate-900">
              {isQuotaError
                ? 'የFirebase የዕለት ገደብ ተጠናቋል (Firestore Quota Exceeded)'
                : 'የሲስተም ወይም የዳታቤዝ ስህተት አጋጥሟል'}
            </h1>
          </div>

          {isQuotaError ? (
            <p className="text-xs text-slate-600 leading-relaxed">
              የነፃው የFirestore የዕለት አጠቃቀም ገደብ ስለተጠናቀቀ ነገ በድጋሚ ይጀምራል። ዝርዝር መረጃ በFirebase Spark Plan ገጽ ላይ ማግኘት ይችላሉ።
            </p>
          ) : (
            <pre className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">
              {this.state.errorMessage}
            </pre>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ገጹን እንደገና አስጀምር (Reload)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
