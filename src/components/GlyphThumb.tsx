import React from 'react';
import { type FontMetrics, type Glyph } from '../types/font';
import { glyphFillPath } from '../utils/pathGeometry';

interface GlyphThumbProps {
  glyph: Glyph;
  metrics: FontMetrics;
  className?: string;
}

/**
 * صورة مصغّرة لرسم المحرف الفعلي من مساراته.
 * إن كان المحرف فارغاً يظهر الحرف المقصود بلون باهت كتلميح.
 */
const GlyphThumbBase: React.FC<GlyphThumbProps> = ({ glyph, metrics, className = '' }) => {
  const pad = 40;
  const width = Math.max(glyph.advanceWidth, 100);
  const top = metrics.ascender + pad;
  const height = metrics.ascender - metrics.descender + pad * 2;

  return (
    <svg
      viewBox={`${-pad} ${-top} ${width + pad * 2} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {glyph.contours.length > 0 ? (
        <g transform="scale(1 -1)">
          <path d={glyphFillPath(glyph.contours)} className="fill-ink" fillRule="nonzero" />
        </g>
      ) : (
        <text
          x={width / 2}
          y={0}
          textAnchor="middle"
          fontSize={metrics.upm * 0.6}
          className="fill-ink/35 font-heading"
        >
          {glyph.char}
        </text>
      )}
    </svg>
  );
};

export const GlyphThumb = React.memo(GlyphThumbBase);

