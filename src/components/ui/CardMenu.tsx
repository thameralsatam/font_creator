import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

/** قائمة إجراءات البطاقة بثلاث نقاط معزولة وبدون مربعات تحديد أو حدود بارزة. */
export const CardMenu: React.FC<{
  label: string;
  className?: string;
  children: ((close: () => void) => React.ReactNode) | React.ReactNode;
}> = ({ label, className = '', children }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const compute = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const w = 190;
    const rtl = getComputedStyle(btn).direction === 'rtl';
    let left = rtl ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    setPos({
      left,
      top: r.bottom + 4,
    });
  }, []);

  useEffect(() => {
    if (open) compute();
  }, [open, compute]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className={className} onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink focus:outline-none"
      >
        <MoreHorizontal className="h-4 w-4 stroke-[1.5]" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            dir="rtl"
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              width: 190,
            }}
            className="glass-dropdown animate-dropdown-slide z-[80] overflow-y-auto rounded-2xl p-1.5 shadow-xl"
          >
            {typeof children === 'function' ? children(close) : children}
          </div>,
          document.body
        )}
    </span>
  );
};
