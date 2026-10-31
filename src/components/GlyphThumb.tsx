import React from 'react';
import { type FontMetrics, type Glyph } from '../types/font';
import { glyphFillPath } from '../utils/pathGeometry';

interface GlyphThumbProps {
  glyph: Glyph;
  metrics: FontMetrics;
  className?: string;
  showGrid?: boolean;
}

/**
 * صورة مصغّرة لرسم المحرف الفعلي مع شبكة الهندسة وخطوط المقاييس الأساسية بوضوح تام.
 */
const GlyphThumbBase: React.FC<GlyphThumbProps> = ({ glyph, metrics, className = '', showGrid = true }) => {
  const pad = 40;
  const width = Math.max(glyph.advanceWidth, 100);
  const top = metrics.ascender + pad;
  const height = metrics.ascender - metrics.descender + pad * 2;

  const minX = -pad;
  const maxX = width + pad;
  const gridStep = Math.max(50, Math.round(metrics.upm / 10));
  const patternId = `grid-${glyph.id}`;

  return (
    <svg
      viewBox={`${minX} ${-top} ${width + pad * 2} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {showGrid && (
        <>
          <defs>
            <pattern
              id={patternId}
              width={gridStep}
              height={gridStep}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridStep} 0 L 0 0 0 ${gridStep}`}
                fill="none"
                stroke="rgba(18, 48, 42, 0.16)"
                strokeWidth="1.2"
              />
            </pattern>
          </defs>

          {/* خلفية الشبكة الهندسية */}
          <rect
            x={minX}
            y={-top}
            width={width + pad * 2}
            height={height}
            fill={`url(#${patternId})`}
          />

          {/* خطوط المقاييس الرأسية والجانبية بوضوح عالي */}
          <g strokeWidth="1.25">
            {/* خط الصاعد */}
            <line x1={minX} y1={-metrics.ascender} x2={maxX} y2={-metrics.ascender} stroke="rgba(18, 48, 42, 0.4)" strokeDasharray="4 3" />
            
            {/* خط ارتفاع الحروف الكبيرة */}
            {metrics.capHeight > 0 && (
              <line x1={minX} y1={-metrics.capHeight} x2={maxX} y2={-metrics.capHeight} stroke="rgba(18, 48, 42, 0.35)" strokeDasharray="3 3" />
            )}
            
            {/* خط ارتفاع الحروف الصغرى */}
            {metrics.xHeight > 0 && (
              <line x1={minX} y1={-metrics.xHeight} x2={maxX} y2={-metrics.xHeight} stroke="rgba(18, 48, 42, 0.35)" strokeDasharray="3 3" />
            )}
            
            {/* خط الهابط */}
            <line x1={minX} y1={-metrics.descender} x2={maxX} y2={-metrics.descender} stroke="rgba(18, 48, 42, 0.4)" strokeDasharray="4 3" />

            {/* خط بداية المحرف (x = 0) */}
            <line x1={0} y1={-top} x2={0} y2={height - top} stroke="rgba(18, 48, 42, 0.45)" strokeDasharray="4 3" />
            
            {/* خط نهاية المحرف (عرض المحرف) */}
            <line x1={glyph.advanceWidth} y1={-top} x2={glyph.advanceWidth} y2={height - top} stroke="rgba(18, 48, 42, 0.45)" strokeDasharray="4 3" />
          </g>

          {/* خط الأساس الرئيسي بارز ووواضح */}
          <line
            x1={minX}
            y1={0}
            x2={maxX}
            y2={0}
            stroke="rgba(18, 48, 42, 0.75)"
            strokeWidth="2"
          />
        </>
      )}

      {/* رسم المحرف الفعلي أو تلميح الحرف إن كان فارغاً */}
      {glyph.contours.length > 0 ? (
        <g transform="scale(1 -1)">
          <path d={glyphFillPath(glyph.contours)} className="fill-ink" fillRule="nonzero" />
        </g>
      ) : (
        <text
          x={width / 2}
          y={-metrics.capHeight / 3 || 0}
          textAnchor="middle"
          fontSize={metrics.upm * 0.45}
          className="fill-ink/30 font-heading"
        >
          {glyph.char}
        </text>
      )}
    </svg>
  );
};

export const GlyphThumb = React.memo(GlyphThumbBase);
