import React from 'react';

/** رقم الإصدار: كبسولة أنيقة بنقطة صغيرة. */
export const VersionPill: React.FC<{ version: string; className?: string }> = ({ version, className = '' }) => (
  <span
    dir="ltr"
    title={`الإصدار ${version}`}
    className={`inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-sand/40 px-2.5 py-0.5 font-mono text-[10px] tracking-wide ${className}`}
  >
    <span className="h-1 w-1 rounded-full bg-ink" />
    v{version}
  </span>
);

/** عدّاد صغير بجانب عنوان قسم. */
export const CountChip: React.FC<{ value: number }> = ({ value }) => (
  <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-ink/20 bg-sand/40 px-2 py-0.5 font-mono text-[11px]">
    {value}
  </span>
);

/** شريط تقدّم رفيع. */
export const Progress: React.FC<{ value: number; max: number; className?: string }> = ({ value, max, className = '' }) => {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 overflow-hidden rounded-full bg-ink/10 ${className}`}
    >
      <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
};
