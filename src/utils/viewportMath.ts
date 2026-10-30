/**
 * نقطة الأصل (ox, oy) هي موضع نقطة (0,0) من وحدات الخط على الشاشة بالبكسل،
 * و scale هو عدد البكسلات لكل وحدة خط. فيكون:
 *   شاشة.x = ox + x × scale
 *   شاشة.y = oy − y × scale
 */
export interface Viewport {
  scale: number;
  ox: number;
  oy: number;
}

export interface FitBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 8;
const FIT_FILL = 0.82;

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** يكبّر أو يصغّر مع إبقاء النقطة (px, py) ثابتة تحت المؤشر. */
export function zoomAt(v: Viewport, px: number, py: number, nextScale: number): Viewport {
  const scale = clampScale(nextScale);
  const k = scale / v.scale;
  return { scale, ox: px - (px - v.ox) * k, oy: py - (py - v.oy) * k };
}

export function computeFit(w: number, h: number, box: FitBox): Viewport {
  const bw = Math.max(box.xMax - box.xMin, 1);
  const bh = Math.max(box.yMax - box.yMin, 1);
  const scale = clampScale(Math.min((w * FIT_FILL) / bw, (h * FIT_FILL) / bh));
  return {
    scale,
    ox: w / 2 - ((box.xMin + box.xMax) / 2) * scale,
    oy: h / 2 + ((box.yMin + box.yMax) / 2) * scale,
  };
}
