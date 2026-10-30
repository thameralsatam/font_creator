import { type Contour, type Glyph, type PathNode, type Vec } from '../types/font';

export interface Bounds {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

const round2 = (n: number) => Number(n.toFixed(2));

/** نقاط التحكم الأربع للقطعة بين نقطتين متجاورتين، أو null إن كانت مستقيمة. */
function segmentControls(a: PathNode, b: PathNode): [Vec, Vec] | null {
  if (!a.handleOut && !b.handleIn) return null;
  return [
    { x: a.x + (a.handleOut?.x ?? 0), y: a.y + (a.handleOut?.y ?? 0) },
    { x: b.x + (b.handleIn?.x ?? 0), y: b.y + (b.handleIn?.y ?? 0) },
  ];
}

/** القطع المتتالية للمسار، وتشمل قطعة الإغلاق إن كان المسار مغلقاً. */
function segments(contour: Contour): Array<[PathNode, PathNode]> {
  const { nodes, closed } = contour;
  const out: Array<[PathNode, PathNode]> = [];
  for (let i = 1; i < nodes.length; i++) out.push([nodes[i - 1], nodes[i]]);
  if (closed && nodes.length > 1) out.push([nodes[nodes.length - 1], nodes[0]]);
  return out;
}

/** يولّد نص مسار SVG بوحدات الخط (المحور الرأسي للأعلى). */
export function contourToPath(contour: Contour): string {
  const { nodes, closed } = contour;
  if (nodes.length === 0) return '';

  let d = `M ${round2(nodes[0].x)} ${round2(nodes[0].y)}`;
  for (const [a, b] of segments(contour)) {
    const ctrl = segmentControls(a, b);
    if (!ctrl) {
      d += ` L ${round2(b.x)} ${round2(b.y)}`;
    } else {
      d +=
        ` C ${round2(ctrl[0].x)} ${round2(ctrl[0].y)}` +
        ` ${round2(ctrl[1].x)} ${round2(ctrl[1].y)}` +
        ` ${round2(b.x)} ${round2(b.y)}`;
    }
  }
  if (closed && nodes.length > 1) d += ' Z';
  return d;
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const m = 1 - t;
  return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3;
}

/** قيم t الواقعة بين 0 و1 التي تنعدم عندها مشتقة المنحنى (القيم القصوى). */
function cubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  const roots: number[] = [];

  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) > 1e-9) roots.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      roots.push((-b + s) / (2 * a), (-b - s) / (2 * a));
    }
  }
  return roots.filter((t) => t > 0 && t < 1);
}

/** الحدود الدقيقة للمسار (تشمل القيم القصوى للمنحنيات)، أو null إن كان فارغاً. */
export function getContourBounds(contour: Contour): Bounds | null {
  if (contour.nodes.length === 0) return null;

  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  const include = (x: number, y: number) => {
    xMin = Math.min(xMin, x);
    xMax = Math.max(xMax, x);
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  };

  for (const n of contour.nodes) include(n.x, n.y);

  for (const [a, b] of segments(contour)) {
    const ctrl = segmentControls(a, b);
    if (!ctrl) continue;
    const [c1, c2] = ctrl;
    const ts = [
      ...cubicExtrema(a.x, c1.x, c2.x, b.x),
      ...cubicExtrema(a.y, c1.y, c2.y, b.y),
    ];
    for (const t of ts) {
      include(
        cubicAt(a.x, c1.x, c2.x, b.x, t),
        cubicAt(a.y, c1.y, c2.y, b.y, t)
      );
    }
  }

  return { xMin, yMin, xMax, yMax };
}

export function getGlyphBounds(glyph: Glyph): Bounds | null {
  let result: Bounds | null = null;
  for (const contour of glyph.contours) {
    const b = getContourBounds(contour);
    if (!b) continue;
    result = result
      ? {
          xMin: Math.min(result.xMin, b.xMin),
          yMin: Math.min(result.yMin, b.yMin),
          xMax: Math.max(result.xMax, b.xMax),
          yMax: Math.max(result.yMax, b.yMax),
        }
      : b;
  }
  return result;
}

/** هل المسار مغلق ويصلح للتعبئة؟ (ثلاث نقاط على الأقل) */
export function isContourFillable(contour: Contour): boolean {
  return contour.closed && contour.nodes.length >= 3;
}
