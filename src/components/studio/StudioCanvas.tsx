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
            strokeOpacity="0.1"
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
                strokeOpacity={line.strong ? 0.55 : 0.25}
                strokeWidth={line.strong ? 1.5 : 1}
                strokeDasharray={line.strong ? undefined : '4 4'}
              />
              {showLabels && (
                <text
                  x={size.w - 10}
                  y={sy(line.v) - 5}
                  textAnchor="end"
                  fontSize="11"
                  className="fill-ink/60"
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
              strokeOpacity="0.35"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}
          {showLabels && (
            <text
              x={sx(glyph.advanceWidth) - 6}
              y={16}
              textAnchor="end"
              fontSize="11"
              className="fill-ink/60"
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
            <text x={sx(a.x) + 10} y={sy(a.y) - 8} fontSize="11" className="fill-ink">
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
          className="pointer-events-none fill-ink/45"
        >
          لا يوجد رسم بعد. أدوات الرسم قيد البناء.
        </text>
      )}
    </svg>
  );
};
