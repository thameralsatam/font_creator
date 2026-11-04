import React, { useRef } from 'react';
import { type FontMetrics, type Glyph } from '../../types/font';
import { type Trace } from './DrawingAids';
import { contourToPath, glyphFillPath } from '../../utils/pathGeometry';
import { contourArrow, effectiveGridStep } from '../../utils/pathEdit';
import { type PointerInfo, type StudioEditor } from './useStudioEditor';
import { useViewport } from './useViewport';

export interface ViewOptions {
  grid: boolean;
  metrics: boolean;
  nodes: boolean;
  anchors: boolean;
  /** أسهم تبيّن اتجاه كل مسار. */
  direction: boolean;
}

interface StudioCanvasProps {
  glyph: Glyph;
  metrics: FontMetrics;
  viewport: ReturnType<typeof useViewport>;
  options: ViewOptions;
  editor: StudioEditor;
  /** يضبطه الكانفاس: هل المؤشر الحالي يحرّك اللوحة بدل الأداة؟ يقرؤه useViewport. */
  panMode: React.MutableRefObject<boolean>;
  /** في وضع التعليمات: الضغط على اللوحة يشرحها بدل أن يرسم. */
  onHelp?: () => void;
  /** محرفان جاران يُرسمان باهتين، وصورة تتبع خلف الرسم. */
  neighbors?: { left: Glyph | null; right: Glyph | null };
  trace?: Trace | null;
}

/**
 * لوحة الرسم. كل شيء يُرسم بإحداثيات الشاشة (بكسل) ما عدا مسارات المحرف
 * التي تُرسم داخل مجموعة واحدة بوحدات الخط، فتبقى الحواف حادة عند أي تكبير.
 *
 * من يملك المؤشر؟
 * - أداة اليد، أو مفتاح المسافة، أو الزر الأوسط: تحريك اللوحة.
 * - إصبعان: تكبير وتحريك، وتُلغى أي إيماءة أداة جارية.
 * - غير ذلك: الأداة الحالية.
 */
export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  glyph,
  metrics,
  viewport,
  options,
  editor,
  panMode,
  onHelp,
  neighbors,
  trace,
}) => {
  const { ref, bind, size, view, gesturing: quiet } = viewport;
  const { scale: s, ox, oy } = view;

  const sx = (x: number) => ox + x * s;
  const sy = (y: number) => oy - y * s;

  const touches = useRef(new Set<number>());
  const multi = useRef(false);

  // الرسم والالتصاق يستعملان نفس خطوة الشبكة المعروضة
  const step = effectiveGridStep(editor.settings.gridStep, s);
  const tile = step * s;

  const metricLines = [
    { v: metrics.ascender, label: 'الصاعد', strong: false },
    { v: metrics.capHeight, label: 'ارتفاع الحروف الكبيرة', strong: false },
    { v: metrics.xHeight, label: 'ارتفاع الحروف الصغيرة', strong: false },
    { v: 0, label: 'خط الأساس', strong: true },
    { v: metrics.descender, label: 'الهابط', strong: false },
  ];
  const showLabels = s >= 0.15;

  /* ---------- المؤشر ---------- */
  const toInfo = (e: React.PointerEvent<SVGSVGElement>): PointerInfo => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    return {
      world: { x: (px - ox) / s, y: (oy - py) / s },
      screen: { x: px, y: py },
      shift: e.shiftKey,
      alt: e.altKey,
      touch: e.pointerType !== 'mouse',
    };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    bind.onPointerDown(e);
    if (e.pointerType === 'touch') {
      touches.current.add(e.pointerId);
      if (touches.current.size > 1) {
        multi.current = true;
        panMode.current = false;
        editor.cancelGesture();
        return;
      }
    }
    const wantPan = editor.tool === 'hand' || editor.spaceHeld || e.button === 1;
    panMode.current = wantPan;
    if (wantPan || e.button !== 0) return;
    multi.current = false;
    if (onHelp) {
      onHelp();
      return;
    }
    editor.pointerDown(toInfo(e));
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    bind.onPointerMove(e);
    if (panMode.current || multi.current) return;
    editor.pointerMove(toInfo(e));
  };

  const release = (e: React.PointerEvent<SVGSVGElement>) => {
    touches.current.delete(e.pointerId);
    if (touches.current.size === 0) multi.current = false;
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    bind.onPointerUp(e);
    const ignore = panMode.current || multi.current;
    release(e);
    if (!ignore) editor.pointerUp(toInfo(e));
    if (touches.current.size === 0) panMode.current = false;
  };

  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    bind.onPointerCancel(e);
    release(e);
    editor.cancelGesture();
    panMode.current = false;
  };

  /* ---------- المؤشر المرئي ---------- */
  let cursor = 'cursor-default';
  if (editor.tool === 'hand' || editor.spaceHeld) cursor = 'cursor-grab';
  else if (editor.tool === 'pen' || editor.tool === 'ruler') cursor = 'cursor-crosshair';
  else if (editor.hover) cursor = editor.tool === 'move' ? 'cursor-move' : 'cursor-pointer';

  const hoverContourId = editor.hover?.kind === 'contour' ? editor.hover.id : null;
  const hoverNodeId =
    editor.hover &&
    (editor.hover.kind === 'first' ||
      editor.hover.kind === 'end' ||
      editor.hover.kind === 'node' ||
      editor.hover.kind === 'remove')
      ? editor.hover.id
      : null;
  const removing = editor.hover?.kind === 'remove';
  const insertAt =
    editor.hover?.kind === 'insert'
      ? (() => {
          const parts = editor.hover.id.split(':');
          return { x: Number(parts[parts.length - 2]), y: Number(parts[parts.length - 1]) };
        })()
      : null;

  const pv = editor.preview;
  const pvPath = pv
    ? pv.fromHandle
      ? `M ${sx(pv.from.x)} ${sy(pv.from.y)} C ${sx(pv.from.x + pv.fromHandle.x)} ${sy(pv.from.y + pv.fromHandle.y)} ${sx(pv.to.x)} ${sy(pv.to.y)} ${sx(pv.to.x)} ${sy(pv.to.y)}`
      : `M ${sx(pv.from.x)} ${sy(pv.from.y)} L ${sx(pv.to.x)} ${sy(pv.to.y)}`
    : '';

  const mark = editor.snapMark;
  const mq = editor.marquee;

  return (
    <svg
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={editor.pointerLeave}
      width="100%"
      height="100%"
      className={`block h-full w-full touch-none select-none ${cursor}`}
      style={{ direction: 'ltr' }}
      role="img"
      aria-label={`لوحة رسم المحرف ${glyph.name}`}
    >
      <defs>
        <pattern id="studio-grid" x={ox} y={oy} width={tile} height={tile} patternUnits="userSpaceOnUse">
          <path
            d={`M ${tile} 0 L 0 0 L 0 ${tile}`}
            fill="none"
            className="stroke-ink"
            strokeOpacity="0.14"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {options.grid && !quiet && size.w > 0 && <rect width={size.w} height={size.h} fill="url(#studio-grid)" />}

      {options.metrics && !quiet && (
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
                <text x={size.w - 10} y={sy(line.v) - 5} textAnchor="end" fontSize="12" className="fill-ink-soft">
                  {line.v}
                </text>
              )}
            </g>
          ))}

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
            <text x={sx(glyph.advanceWidth) - 6} y={16} textAnchor="end" fontSize="12" className="fill-ink-soft">
              {glyph.advanceWidth}
            </text>
          )}
        </g>
      )}

      {trace && (() => {
        const hh = (metrics.ascender - metrics.descender) * (trace.scale / 100);
        const ww = (hh * trace.w) / trace.h;
        const cx = glyph.advanceWidth / 2 + trace.dx;
        const cy = (metrics.ascender + metrics.descender) / 2 + trace.dy;
        return (
          <image
            href={trace.url}
            x={sx(cx - ww / 2)}
            y={sy(cy + hh / 2)}
            width={ww * s}
            height={hh * s}
            preserveAspectRatio="none"
            opacity={trace.opacity / 100}
            className="pointer-events-none"
          />
        );
      })()}

      {neighbors &&
        ([
          [neighbors.left, -(neighbors.left?.advanceWidth ?? 0)],
          [neighbors.right, glyph.advanceWidth],
        ] as Array<[Glyph | null, number]>).map(
          ([g, off], i) =>
            g && (
              <g key={i} transform={`translate(${ox + off * s} ${oy}) scale(${s} ${-s})`} className="pointer-events-none">
                <path d={glyphFillPath(g.contours)} fillRule="nonzero" className="fill-ink" fillOpacity="0.16" />
              </g>
            )
        )}

      {/* مسارات المحرف بوحدات الخط */}
      <g transform={`translate(${ox} ${oy}) scale(${s} ${-s})`}>
        <path
          d={glyphFillPath(glyph.contours)}
          fillRule="nonzero"
          className="fill-ink/90 stroke-ink"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
        {glyph.contours
          .filter((c) => !c.closed)
          .map((c) => (
            <path
              key={c.id}
              d={contourToPath(c)}
              className="fill-none stroke-ink"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {glyph.contours
          .filter((c) => c.id === hoverContourId)
          .map((c) => (
            <path
              key={c.id}
              d={contourToPath(c)}
              className="fill-none stroke-sand-deep"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
          ))}
      </g>

      {/* معاينة القطعة القادمة في القلم */}
      {pv && (
        <path
          d={pvPath}
          fill="none"
          className="stroke-sand-deep"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
      )}

      {/* النقاط والمقابض بحجم ثابت على الشاشة */}
      {options.nodes && !quiet &&
        glyph.contours.map((c) => (
          <g key={c.id}>
            {c.nodes.map((n) => {
              const selected = editor.selection.has(n.id);
              const showHandles = editor.handleNodeIds.has(n.id);
              const target = n.id === hoverNodeId;
              const size2 = selected || target ? 9 : 7;
              return (
                <g key={n.id}>
                  {showHandles &&
                    [n.handleIn, n.handleOut].map(
                      (h, i) =>
                        h && (
                          <g key={i}>
                            <line
                              x1={sx(n.x)}
                              y1={sy(n.y)}
                              x2={sx(n.x + h.x)}
                              y2={sy(n.y + h.y)}
                              className="stroke-ink"
                              strokeOpacity="0.6"
                            />
                            <circle
                              cx={sx(n.x + h.x)}
                              cy={sy(n.y + h.y)}
                              r="4"
                              className="fill-sand-deep stroke-ink"
                            />
                          </g>
                        )
                    )}
                  {n.kind === 'locked' ? (
                    <polygon
                      points={`${sx(n.x)},${sy(n.y) - size2 * 0.62} ${sx(n.x) + size2 * 0.62},${sy(n.y) + size2 * 0.5} ${sx(n.x) - size2 * 0.62},${sy(n.y) + size2 * 0.5}`}
                      className={selected ? 'fill-sand-deep stroke-ink' : 'fill-paper stroke-ink'}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <rect
                      x={sx(n.x) - size2 / 2}
                      y={sy(n.y) - size2 / 2}
                      width={size2}
                      height={size2}
                      rx={n.kind === 'smooth' ? size2 / 2 : 1}
                      transform={n.kind === 'mirror' ? `rotate(45 ${sx(n.x)} ${sy(n.y)})` : undefined}
                      className={selected ? 'fill-sand-deep stroke-ink' : 'fill-paper stroke-ink'}
                      strokeWidth="1.5"
                    />
                  )}
                  {target && (
                    <circle cx={sx(n.x)} cy={sy(n.y)} r="12" fill="none" className="stroke-sand-deep" strokeWidth="2" />
                  )}
                  {target && removing && (
                    <path
                      d={`M ${sx(n.x) - 5} ${sy(n.y) - 5} L ${sx(n.x) + 5} ${sy(n.y) + 5} M ${sx(n.x) + 5} ${sy(n.y) - 5} L ${sx(n.x) - 5} ${sy(n.y) + 5}`}
                      className="stroke-ink"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            })}
          </g>
        ))}

      {/* أسهم الاتجاه */}
      {options.direction && !quiet &&
        glyph.contours.map((c) => {
          const ar = contourArrow(c);
          if (!ar) return null;
          const x = sx(ar.at.x);
          const y = sy(ar.at.y);
          const dx = ar.dir.x;
          const dy = -ar.dir.y;
          const nx = -dy;
          const ny = dx;
          return (
            <path
              key={c.id}
              d={`M ${x + dx * 7} ${y + dy * 7} L ${x - dx * 5 + nx * 5} ${y - dy * 5 + ny * 5} L ${x - dx * 5 - nx * 5} ${y - dy * 5 - ny * 5} Z`}
              className="fill-sand-deep stroke-ink"
              strokeWidth="1"
            />
          );
        })}

      {insertAt && (
        <g className="pointer-events-none">
          <circle cx={sx(insertAt.x)} cy={sy(insertAt.y)} r="7" className="fill-sand-deep/60 stroke-ink" strokeWidth="1.5" />
          <path
            d={`M ${sx(insertAt.x) - 3} ${sy(insertAt.y)} H ${sx(insertAt.x) + 3} M ${sx(insertAt.x)} ${sy(insertAt.y) - 3} V ${sy(insertAt.y) + 3}`}
            className="stroke-ink"
            strokeWidth="1.2"
          />
        </g>
      )}

      {options.anchors && !quiet &&
        glyph.anchors.map((a) => (
          <g key={a.id}>
            <circle cx={sx(a.x)} cy={sy(a.y)} r="6" className="fill-sand/60 stroke-ink" strokeWidth="1.5" />
            <text x={sx(a.x) + 10} y={sy(a.y) - 8} fontSize="12" className="fill-ink">
              {a.name}
            </text>
          </g>
        ))}

      {/* مؤشرات الالتصاق */}
      {!quiet && mark && mark.guideX !== undefined && (
        <line x1={sx(mark.guideX)} x2={sx(mark.guideX)} y1={0} y2={size.h} className="stroke-sand-deep" strokeWidth="1" />
      )}
      {!quiet && mark && mark.guideY !== undefined && (
        <line x1={0} x2={size.w} y1={sy(mark.guideY)} y2={sy(mark.guideY)} className="stroke-sand-deep" strokeWidth="1" />
      )}
      {!quiet && mark && mark.kind === 'point' && (
        <circle cx={sx(mark.x)} cy={sy(mark.y)} r="10" fill="none" className="stroke-sand-deep" strokeWidth="2" />
      )}

      {/* مربع التحديد */}
      {!quiet && mq && (
        <rect
          x={sx(Math.min(mq.a.x, mq.b.x))}
          y={sy(Math.max(mq.a.y, mq.b.y))}
          width={Math.abs(mq.a.x - mq.b.x) * s}
          height={Math.abs(mq.a.y - mq.b.y) * s}
          className="fill-sand/30 stroke-ink"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      )}

      {!quiet && editor.measure && (() => {
        const { a, b } = editor.measure;
        const dx = Math.round(b.x - a.x);
        const dy = Math.round(b.y - a.y);
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        const mx = (sx(a.x) + sx(b.x)) / 2;
        const my = (sy(a.y) + sy(b.y)) / 2;
        const t1 = Math.round(d).toString();
        // علامة الاتجاه (U+200E) تمنع الاتجاه العربي من قلب الأرقام والإشارات
        const t2 = `س \u200E${dx}   ص \u200E${dy}   \u200E${ang.toFixed(1)}°`;
        const w = Math.max(t2.length * 6.6, 70) + 16;
        return (
          <g className="pointer-events-none">
            <line x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} className="stroke-ink" strokeWidth="1.5" />
            <line x1={sx(a.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(a.y)} className="stroke-ink-soft" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={sx(b.x)} y1={sy(a.y)} x2={sx(b.x)} y2={sy(b.y)} className="stroke-ink-soft" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={sx(a.x)} cy={sy(a.y)} r="3.5" className="fill-ink" />
            <circle cx={sx(b.x)} cy={sy(b.y)} r="3.5" className="fill-ink" />
            <rect x={mx - w / 2} y={my - 34} width={w} height="32" rx="8" className="fill-paper stroke-ink/30" strokeWidth="1" />
            <text x={mx} y={my - 20} textAnchor="middle" fontSize="13" className="fill-ink font-mono">{t1}</text>
            <text x={mx} y={my - 7} textAnchor="middle" fontSize="10.5" className="fill-ink-soft">{t2}</text>
          </g>
        );
      })()}

      {glyph.contours.length === 0 && size.w > 0 && editor.tool !== 'pen' && (
        <text
          x={size.w / 2}
          y={sy(metrics.xHeight / 2)}
          textAnchor="middle"
          fontSize="14"
          className="pointer-events-none fill-ink-soft"
        >
          اختر أداة القلم وارسم أول نقطة.
        </text>
      )}
    </svg>
  );
};
