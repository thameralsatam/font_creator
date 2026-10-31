import React from 'react';

/** رقم الإصدار: كبسولة موحّدة. */
export const VersionPill: React.FC<{ version: string; className?: string }> = ({ version, className = '' }) => (
  <span dir="ltr" title={`الإصدار ${version}`} className={`chip chip-solid font-mono ${className}`}>
    v{version}
  </span>
);

/** عدّاد صغير بجانب عنوان قسم. */
export const CountChip: React.FC<{ value: number }> = ({ value }) => (
  <span className="chip font-mono">{value}</span>
);

/** شريط تقدّم: مسار واضح وتعبئة داكنة ونسبة مئوية في كبسولة. */
export const Progress: React.FC<{ value: number; max: number; className?: string }> = ({ value, max, className = '' }) => {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 flex-1 overflow-hidden rounded-full border border-ink/25 bg-sand/25 p-px"
      >
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-500"
          style={{ width: `${pct}%`, minWidth: pct > 0 ? '0.5rem' : 0 }}
        />
      </div>
      <span dir="ltr" className="chip font-mono">{pct}%</span>
    </div>
  );
};
