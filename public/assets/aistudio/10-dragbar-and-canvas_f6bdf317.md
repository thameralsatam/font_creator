# الملف ١٠ — الشريط القابل للسحب واللوحة

هذا الملف يضيف الشريط القابل للسحب، ويحدّث التكبير واللوحة. **لا تشغّل البناء في هذا الملف.**

## قواعد عامة (تنطبق على كل الملفات)

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- انسخ المحتوى داخل كل كتلة كود كما هو بالضبط، بدون تغيير حرف واحد وبدون تعليقات إضافية.
- الأمر "أنشئ الملف" يعني: أنشئه، وإن كان موجوداً مسبقاً استبدل محتواه بالكامل.
- لا تلمس أي ملف غير مذكور. لا تحذف ولا تنقل ولا تعيد تسمية أي ملف إلا إذا طُلب صراحة.
- إذا ظهر خطأ غير متوقع أو تعذّر أمر: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر 1: `src/components/ui/DragScroll.tsx`

شريط أفقي بسطر واحد قابل للسحب بالفأرة وباللمس، مع حافة متلاشية عند وجود أزرار مخفية.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
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
```

---

## الأمر 2: `src/components/studio/useViewport.ts`

أُضيفت الدالة `zoomTo` لاختيار نسبة تكبير محددة.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Viewport, type FitBox, zoomAt, computeFit } from '../../utils/viewportMath';

export type { Viewport, FitBox };

const ZOOM_STEP = 1.25;

interface Options {
  fitBox: FitBox;
  /** يتغير عند الانتقال لمحرف آخر لإعادة الملاءمة تلقائياً. */
  fitKey: string;
  /** السحب بإصبع أو مؤشر واحد يحرّك الكانفاس. يُعطَّل عند تفعيل أدوات الرسم. */
  singlePointerPan?: boolean;
}

/**
 * التحريك والتكبير للكانفاس:
 * عجلة الفأرة للتكبير، السحب للتحريك، وإصبعان للتكبير والتحريك معاً على الجوال.
 */
export function useViewport({ fitBox, fitKey, singlePointerPan = true }: Options) {
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

    if (pointers.current.size === 1 && singlePointerPan) {
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
```

---

## الأمر 3: `src/components/studio/StudioCanvas.tsx`

تباين أعلى لخطوط المقاييس والتسميات.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
import React from 'react';
import { type FontMetrics, type Glyph } from '../../types/font';
import { contourToPath } from '../../utils/pathGeometry';
import { useViewport } from './useViewport';

export interface ViewOptions {
  grid: boolean;
  metrics: boolean;
  nodes: boolean;
  anchors: boolean;
}

interface StudioCanvasProps {
  glyph: Glyph;
  metrics: FontMetrics;
  viewport: ReturnType<typeof useViewport>;
  options: ViewOptions;
  gridStep: number;
}

/**
 * لوحة الرسم. كل شيء يُرسم بإحداثيات الشاشة (بكسل) ما عدا مسارات المحرف
 * التي تُرسم داخل مجموعة واحدة بوحدات الخط، فتبقى الحواف حادة عند أي تكبير.
 */
export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  glyph,
  metrics,
  viewport,
  options,
  gridStep,
}) => {
  const { ref, bind, size, view } = viewport;
  const { scale: s, ox, oy } = view;

  const sx = (x: number) => ox + x * s;
  const sy = (y: number) => oy - y * s;

  // خطوة الشبكة تتضاعف تلقائياً عند التصغير حتى لا تزدحم الخطوط
  let step = gridStep;
  while (step * s < 10) step *= 2;
  const tile = step * s;

  const metricLines = [
    { v: metrics.ascender, label: 'الصاعد', strong: false },
    { v: metrics.capHeight, label: 'ارتفاع الحروف الكبيرة', strong: false },
    { v: metrics.xHeight, label: 'ارتفاع الحروف الصغيرة', strong: false },
    { v: 0, label: 'خط الأساس', strong: true },
    { v: metrics.descender, label: 'الهابط', strong: false },
  ];

  const showLabels = s >= 0.15;

  return (
    <svg
      ref={ref}
      {...bind}
      width="100%"
      height="100%"
      className="block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      style={{ direction: 'ltr' }}
      role="img"
      aria-label={`لوحة رسم المحرف ${glyph.name}`}
    >
      <defs>
        <pattern
          id="studio-grid"
          x={ox}
          y={oy}
          width={tile}
          height={tile}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${tile} 0 L 0 0 L 0 ${tile}`}
            fill="none"
            className="stroke-ink"
            strokeOpacity="0.14"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {options.grid && size.w > 0 && (
        <rect width={size.w} height={size.h} fill="url(#studio-grid)" />
      )}

      {options.metrics && (
        <g>
          {metricLines.map((line) => (
            <g key={line.label}>
              <line
                x1={0}
                x2={size.w}
                y1={sy(line.v)}
                y2={sy(line.v)}
                className="stroke-ink"
                strokeOpacity={line.strong ? 0.8 : 0.4}
                strokeWidth={line.strong ? 1.5 : 1}
                strokeDasharray={line.strong ? undefined : '4 4'}
              />
              {showLabels && (
                <text
                  x={size.w - 10}
                  y={sy(line.v) - 5}
                  textAnchor="end"
                  fontSize="12"
                  className="fill-ink-soft"
                >
                  {line.label} ({line.v})
                </text>
              )}
            </g>
          ))}

          {/* حدّا العرض الكامل: نقطة الأصل ونهاية العرض */}
          {[0, glyph.advanceWidth].map((x, i) => (
            <line
              key={i}
              x1={sx(x)}
              x2={sx(x)}
              y1={0}
              y2={size.h}
              className="stroke-ink"
              strokeOpacity="0.5"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}
          {showLabels && (
            <text
              x={sx(glyph.advanceWidth) - 6}
              y={16}
              textAnchor="end"
              fontSize="12"
              className="fill-ink-soft"
            >
              العرض الكامل ({glyph.advanceWidth})
            </text>
          )}
        </g>
      )}

      {/* مسارات المحرف بوحدات الخط */}
      <g transform={`translate(${ox} ${oy}) scale(${s} ${-s})`}>
        {glyph.contours.map((c) => (
          <path
            key={c.id}
            d={contourToPath(c)}
            fillRule="nonzero"
            className={c.closed ? 'fill-ink/90 stroke-ink' : 'fill-none stroke-ink'}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* النقاط والمقابض بحجم ثابت على الشاشة */}
      {options.nodes &&
        glyph.contours.map((c) => (
          <g key={c.id}>
            {c.nodes.map((n) => (
              <g key={n.id}>
                {[n.handleIn, n.handleOut].map(
                  (h, i) =>
                    h && (
                      <g key={i}>
                        <line
                          x1={sx(n.x)}
                          y1={sy(n.y)}
                          x2={sx(n.x + h.x)}
                          y2={sy(n.y + h.y)}
                          className="stroke-ink"
                          strokeOpacity="0.5"
                        />
                        <circle
                          cx={sx(n.x + h.x)}
                          cy={sy(n.y + h.y)}
                          r="2.5"
                          className="fill-sand-deep stroke-ink"
                        />
                      </g>
                    )
                )}
                <rect
                  x={sx(n.x) - 3.5}
                  y={sy(n.y) - 3.5}
                  width="7"
                  height="7"
                  rx={n.kind === 'smooth' ? 3.5 : 1}
                  className="fill-paper stroke-ink"
                  strokeWidth="1.5"
                />
              </g>
            ))}
          </g>
        ))}

      {options.anchors &&
        glyph.anchors.map((a) => (
          <g key={a.id}>
            <circle
              cx={sx(a.x)}
              cy={sy(a.y)}
              r="6"
              className="fill-sand/60 stroke-ink"
              strokeWidth="1.5"
            />
            <text x={sx(a.x) + 10} y={sy(a.y) - 8} fontSize="12" className="fill-ink">
              {a.name}
            </text>
          </g>
        ))}

      {glyph.contours.length === 0 && size.w > 0 && (
        <text
          x={size.w / 2}
          y={sy(metrics.xHeight / 2)}
          textAnchor="middle"
          fontSize="14"
          className="pointer-events-none fill-ink-soft"
        >
          لا يوجد رسم بعد. أدوات الرسم قيد البناء.
        </text>
      )}
    </svg>
  );
};
```

---

## التحقق (آخر خطوة)

1. تأكد أن الملف `src/components/ui/DragScroll.tsx` موجود.
2. أرسل لي فقط: تمّ، أو نص أي خطأ.
