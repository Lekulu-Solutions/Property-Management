import React from 'react';
import { Eye, Lock, Pencil } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

interface ViewEditRoleToggleProps {
  isViewOnly: boolean;
  onToggle: () => void;
}

export const ViewEditRoleToggle: React.FC<ViewEditRoleToggleProps> = ({
  isViewOnly,
  onToggle,
}) => {
  const { tr } = useLanguage();

  return (
    <div
      className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md no-print shrink-0"
      role="group"
      aria-label={tr('የእይታ እና የአርትዖት ሚና', 'View and Edit Role', 'እይታ / አርትዕ')}
    >
      <button
        type="button"
        onClick={() => {
          if (!isViewOnly) onToggle();
        }}
        title={tr(
          'እይታ ብቻ — ሁሉም ማስተካከያዎች ተቆልፈዋል',
          'View Only — All edits are locked',
          'እይታ ብቻ (View Only - Locked)'
        )}
        className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
          isViewOnly
            ? 'bg-amber-600 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        {isViewOnly ? (
          <Lock className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Eye className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{tr('እይታ ብቻ', 'View Only', 'እይታ / View')}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (isViewOnly) onToggle();
        }}
        title={tr(
          'አርትዕ — መረጃ መጨመር እና ማስተካከል ይቻላል',
          'Edit Mode — Adding and editing enabled',
          'አርትዕ (Edit Mode)'
        )}
        className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
          !isViewOnly
            ? 'bg-emerald-700 text-white shadow-2xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Pencil className="w-3.5 h-3.5 shrink-0" />
        <span>{tr('አርትዕ', 'Edit', 'አርትዕ / Edit')}</span>
      </button>
    </div>
  );
};
