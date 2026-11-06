import { type Contour, type PathNode, type Vec } from '../types/font';
import { uid } from './fontLogic';

const r2 = (n: number) => Math.round(n * 100) / 100 + 0;
const len = (v: Vec) => Math.hypot(v.x, v.y);

export interface RoundResult {
  contours: Contour[];
  /** عدد الزوايا التي قُرِّبت. */
  count: number;
  /** معرّفات النقاط الجديدة (لتحديدها). */
  newIds: string[];
}

/**
 * تقريب الزوايا الحادة المحددة بنصف قطر معطى. تُقرَّب فقط الزوايا التي ضلعاها مستقيمان
 * (بلا مقابض). يُقيَّد نصف القطر بنصف أقصر ضلع حتى لا تتداخل الزوايا المتجاورة.
 */
export function roundCorners(contours: Contour[], ids: ReadonlySet<string>, radius: number): RoundResult {
  let count = 0;
  const newIds: string[] = [];
  const out = contours.map((c) => {
    if (!c.nodes.some((n) => ids.has(n.id))) return c;
    const nodes: PathNode[] = [];
    const total = c.nodes.length;
    let changed = false;
    c.nodes.forEach((n, i) => {
      const edge = !c.closed && (i === 0 || i === total - 1);
      const prev = c.nodes[(i - 1 + total) % total];
      const next = c.nodes[(i + 1) % total];
      const sharp = !n.handleIn && !n.handleOut && !prev.handleOut && !next.handleIn;
      if (!ids.has(n.id) || edge || !sharp || total < 3) return void nodes.push(n);
      const d1 = { x: prev.x - n.x, y: prev.y - n.y };
      const d2 = { x: next.x - n.x, y: next.y - n.y };
      const l1 = len(d1);
      const l2 = len(d2);
      if (l1 < 1e-6 || l2 < 1e-6) return void nodes.push(n);
      const u1 = { x: d1.x / l1, y: d1.y / l1 };
      const u2 = { x: d2.x / l2, y: d2.y / l2 };
      const cos = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
      const theta = Math.acos(cos); // الزاوية الداخلية بين الضلعين
      if (theta < 0.02 || theta > Math.PI - 0.02) return void nodes.push(n); // مستقيمة تقريباً
      let t = radius / Math.tan(theta / 2);
      t = Math.min(t, Math.min(l1, l2) / 2);
      if (t < 0.5) return void nodes.push(n);
      const rEff = t * Math.tan(theta / 2);
      const h = (4 / 3) * Math.tan((Math.PI - theta) / 4) * rEff;
      const a: PathNode = {
        id: uid('node'), kind: 'corner',
        x: r2(n.x + u1.x * t), y: r2(n.y + u1.y * t),
        handleIn: null, handleOut: { x: r2(-u1.x * h), y: r2(-u1.y * h) },
      };
      const b: PathNode = {
        id: uid('node'), kind: 'corner',
        x: r2(n.x + u2.x * t), y: r2(n.y + u2.y * t),
        handleIn: { x: r2(-u2.x * h), y: r2(-u2.y * h) }, handleOut: null,
      };
      nodes.push(a, b);
      newIds.push(a.id, b.id);
      count++;
      changed = true;
    });
    return changed ? { ...c, nodes } : c;
  });
  return { contours: count > 0 ? out : contours, count, newIds };
}

export interface SimplifyResult {
  contours: Contour[];
  removed: number;
}

/** يحذف النقاط الزائدة: المنطبقة على جارتها، والواقعة على خط مستقيم بين جارتيها بلا مقابض. */
export function removeRedundant(contours: Contour[], ids?: ReadonlySet<string>, tol = 0.5): SimplifyResult {
  let removed = 0;
  const out = contours.map((c) => {
    if (ids && ids.size > 0 && !c.nodes.some((n) => ids.has(n.id))) return c;
    let nodes = c.nodes;
    const min = c.closed ? 3 : 2;
    let again = true;
    while (again && nodes.length > min) {
      again = false;
      for (let i = 0; i < nodes.length && nodes.length > min; i++) {
        const n = nodes[i];
        if (ids && ids.size > 0 && !ids.has(n.id)) continue;
        const total = nodes.length;
        if (!c.closed && (i === 0 || i === total - 1)) continue;
        const pi = (i - 1 + total) % total;
        const ni = (i + 1) % total;
        const prev = nodes[pi];
        const next = nodes[ni];
        const same = Math.hypot(n.x - prev.x, n.y - prev.y) < tol;
        if (same) {
          // يُدمج في السابقة: يبقى مقبض خروج النقطة المحذوفة
          const merged = { ...prev, handleOut: n.handleOut };
          nodes = nodes.filter((_, k) => k !== i).map((x) => (x.id === prev.id ? merged : x));
          removed++;
          again = true;
          break;
        }
        const straight = !n.handleIn && !n.handleOut && !prev.handleOut && !next.handleIn;
        if (!straight) continue;
        const ab = { x: next.x - prev.x, y: next.y - prev.y };
        const abLen = len(ab);
        if (abLen < 1e-6) continue;
        const ap = { x: n.x - prev.x, y: n.y - prev.y };
        const dist = Math.abs(ab.x * ap.y - ab.y * ap.x) / abLen;
        const along = (ap.x * ab.x + ap.y * ab.y) / (abLen * abLen);
        if (dist < tol && along > 0 && along < 1) {
          nodes = nodes.filter((_, k) => k !== i);
          removed++;
          again = true;
          break;
        }
      }
    }
    return nodes === c.nodes ? c : { ...c, nodes };
  });
  return { contours: removed > 0 ? out : contours, removed };
}
