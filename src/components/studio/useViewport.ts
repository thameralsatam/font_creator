import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Viewport, type FitBox, zoomAt, computeFit } from '../../utils/viewportMath';

export type { Viewport, FitBox };

const ZOOM_STEP = 1.25;

interface Options {
  fitBox: FitBox;
  /** يتغير عند الانتقال لمحرف آخر لإعادة الملاءمة تلقائياً. */
  fitKey: string;
  /** هل يحرّك المؤشر الواحد اللوحة الآن؟ تُقرأ لحظة الحركة. الافتراضي: نعم. */
  shouldPan?: () => boolean;
}

/**
 * التحريك والتكبير للكانفاس:
 * عجلة الفأرة للتكبير، السحب للتحريك، وإصبعان للتكبير والتحريك معاً على الجوال.
 */
export function useViewport({ fitBox, fitKey, shouldPan }: Options) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<Viewport>({ scale: 0.4, ox: 0, oy: 0 });

  const fitBoxRef = useRef(fitBox);
  fitBoxRef.current = fitBox;

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  // قياس حجم الكانفاس
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasSize = size.w > 0 && size.h > 0;

  // ملاءمة تلقائية عند أول قياس وعند تغيّر المحرف
  useEffect(() => {
    if (!hasSize) return;
    setView(computeFit(size.w, size.h, fitBoxRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSize, fitKey]);

  // عجلة الفأرة: لا بد من مستمع غير سلبي لمنع تمرير الصفحة
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      setView((v) => zoomAt(v, e.clientX - r.left, e.clientY - r.top, v.scale * factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const local = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const measure = () => {
    const [a, b] = Array.from(pointers.current.values());
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) pinch.current = measure();
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = local(e);
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size === 1 && (shouldPan ? shouldPan() : true)) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      setView((v) => ({ ...v, ox: v.ox + dx, oy: v.oy + dy }));
    } else if (pointers.current.size === 2 && pinch.current) {
      const m = measure();
      const g = pinch.current;
      const factor = m.dist / g.dist;
      setView((v) => {
        const z = zoomAt(v, g.cx, g.cy, v.scale * factor);
        return { ...z, ox: z.ox + (m.cx - g.cx), oy: z.oy + (m.cy - g.cy) };
      });
      pinch.current = m;
    }
  };

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const zoomBy = useCallback(
    (factor: number) =>
      setView((v) => zoomAt(v, size.w / 2, size.h / 2, v.scale * factor)),
    [size.w, size.h]
  );

  return {
    ref,
    size,
    view,
    percent: Math.round(view.scale * 100),
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
    },
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(1 / ZOOM_STEP),
    zoomTo: (percent: number) =>
      setView((v) => zoomAt(v, size.w / 2, size.h / 2, percent / 100)),
    fit: () => {
      if (hasSize) setView(computeFit(size.w, size.h, fitBoxRef.current));
    },
  };
}
