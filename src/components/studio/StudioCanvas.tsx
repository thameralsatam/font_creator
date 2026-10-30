import React, { useRef } from 'react';
import { type FontMetrics, type Glyph } from '../../types/font';
import { contourToPath } from '../../utils/pathGeometry';
import { effectiveGridStep } from '../../utils/pathEdit';
import { type PointerInfo, type StudioEditor } from './useStudioEditor';
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
  editor: StudioEditor;
  /** يضبطه الكانفاس: هل المؤشر الحالي يحرّك اللوحة بدل الأداة؟ يقرؤه useViewport. */
  panMode: React.MutableRefObject<boolean>;
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
}) => {
  const { ref, bind, size, view } = viewport;
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
  else if (editor.tool === 'pen') cursor = 'cursor-crosshair';
  else if (editor.hover) cursor = editor.tool === 'move' ? 'cursor-move' : 'cursor-pointer';

  const hoverContourId = editor.hover?.kind === 'contour' ? editor.hover.id : null;
  const hoverNodeId =
    editor.hover && (editor.hover.kind === 'first' || editor.hover.kind === 'end' || editor.hover.kind === 'node')
      ? editor.hover.id
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

      {options.grid && size.w > 0 && <rect width={size.w} height={size.h} fill="url(#studio-grid)" />}

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
                <text x={size.w - 10} y={sy(line.v) - 5} textAnchor="end" fontSize="12" className="fill-ink-soft">
                  {line.label} ({line.v})
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
            strokeWidth={c.id === hoverContourId ? 3 : 1.2}
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
      {options.nodes &&
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
                  <rect
                    x={sx(n.x) - size2 / 2}
                    y={sy(n.y) - size2 / 2}
                    width={size2}
                    height={size2}
                    rx={n.kind === 'smooth' ? size2 / 2 : 1}
                    className={selected ? 'fill-sand-deep stroke-ink' : 'fill-paper stroke-ink'}
                    strokeWidth="1.5"
                  />
                  {target && (
                    <circle cx={sx(n.x)} cy={sy(n.y)} r="12" fill="none" className="stroke-sand-deep" strokeWidth="2" />
                  )}
                </g>
              );
            })}
          </g>
        ))}

      {options.anchors &&
        glyph.anchors.map((a) => (
          <g key={a.id}>
            <circle cx={sx(a.x)} cy={sy(a.y)} r="6" className="fill-sand/60 stroke-ink" strokeWidth="1.5" />
            <text x={sx(a.x) + 10} y={sy(a.y) - 8} fontSize="12" className="fill-ink">
              {a.name}
            </text>
          </g>
        ))}

      {/* مؤشرات الالتصاق */}
      {mark && mark.guideX !== undefined && (
        <line x1={sx(mark.guideX)} x2={sx(mark.guideX)} y1={0} y2={size.h} className="stroke-sand-deep" strokeWidth="1" />
      )}
      {mark && mark.guideY !== undefined && (
        <line x1={0} x2={size.w} y1={sy(mark.guideY)} y2={sy(mark.guideY)} className="stroke-sand-deep" strokeWidth="1" />
      )}
      {mark && mark.kind === 'point' && (
        <circle cx={sx(mark.x)} cy={sy(mark.y)} r="10" fill="none" className="stroke-sand-deep" strokeWidth="2" />
      )}

      {/* مربع التحديد */}
      {mq && (
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
