import React, { useCallback, useEffect, useRef, useState } from 'react';

/*
  شريط أفقي بسطر واحد قابل للسحب.
  - بالفأرة: اسحب الشريط، أو حرّك العجلة.
  - باللمس: تمرير أفقي عادي بالإصبع.
  - حافة متلاشية تدل على وجود أزرار مخفية في ذلك الجانب.
*/

interface DragScrollProps {
  label: string;
  className?: string;
  children: React.ReactNode;
}

const DRAG_THRESHOLD = 5;
const FADE = 28;

export const DragScroll: React.FC<DragScrollProps> = ({ label, className = '', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scroll: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [edges, setEdges] = useState({ left: false, right: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    const rtl = getComputedStyle(el).direction === 'rtl';
    const hiddenAtStart = pos > 2;
    const hiddenAtEnd = max - pos > 2;
    setEdges({
      left: rtl ? hiddenAtEnd : hiddenAtStart,
      right: rtl ? hiddenAtStart : hiddenAtEnd,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [update]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !ref.current) return;
    suppressClick.current = false;
    drag.current = { x: e.clientX, scroll: ref.current.scrollLeft, active: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.active && Math.abs(dx) > DRAG_THRESHOLD) {
      d.active = true;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    }
    if (d.active) el.scrollLeft = d.scroll - dx;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    if (d.active) {
      suppressClick.current = true;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = '';
    }
    drag.current = null;
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollLeft += rtl ? -e.deltaY : e.deltaY;
  };

  const stops = [
    ...(edges.left ? ['transparent 0', `#000 ${FADE}px`] : ['#000 0']),
    ...(edges.right ? [`#000 calc(100% - ${FADE}px)`, 'transparent 100%'] : ['#000 100%']),
  ];
  const mask =
    edges.left || edges.right ? `linear-gradient(to right, ${stops.join(', ')})` : undefined;

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={label}
      className={`no-scrollbar cursor-grab overflow-x-auto overflow-y-hidden ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation();
          e.preventDefault();
          suppressClick.current = false;
        }
      }}
    >
      <div className="flex min-w-max items-center gap-1 p-1.5">{children}</div>
    </div>
  );
};

export const BarDivider: React.FC = () => (
  <span aria-hidden="true" className="mx-1.5 h-6 w-px shrink-0 bg-ink/20" />
);
