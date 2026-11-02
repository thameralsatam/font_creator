import React from 'react';
import { type Contour } from '../types/font';
import { getContourBounds, glyphFillPath } from '../utils/pathGeometry';

/** معاينة صغيرة لوصلة (مسارات مركزها عند الأصل). */
export const ConnectorPreview: React.FC<{ contours: Contour[]; className?: string }> = ({
  contours,
  className = 'h-7 w-10',
}) => {
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const c of contours) {
    const b = getContourBounds(c);
    if (!b) continue;
    xMin = Math.min(xMin, b.xMin);
    yMin = Math.min(yMin, b.yMin);
    xMax = Math.max(xMax, b.xMax);
    yMax = Math.max(yMax, b.yMax);
  }
  if (!isFinite(xMin)) return <span className={className} />;
  const w = Math.max(xMax - xMin, 1);
  const h = Math.max(yMax - yMin, 1);
  const pad = Math.max(w, h) * 0.08;
  return (
    <svg
      viewBox={`${xMin - pad} ${-yMax - pad} ${w + pad * 2} ${h + pad * 2}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <path d={glyphFillPath(contours)} transform="scale(1,-1)" fill="currentColor" fillRule="nonzero" />
    </svg>
  );
};
