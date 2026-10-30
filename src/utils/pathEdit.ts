import {
  type Contour,
  type FontMetrics,
  type PathNode,
  type Vec,
} from '../types/font';
import { getContourBounds, type Bounds } from './pathGeometry';
import { uid } from './fontLogic';

/* ============================================================
   حدود المحرف. أي عملية رسم أو تحويل تحترمها، وتُرفض إن تجاوزتها.
   ============================================================ */

export const LIMITS = { maxNodes: 400, maxContours: 24 } as const;

export function coordRange(m: FontMetrics) {
  return {
    xMin: -m.upm,
    xMax: m.upm * 2,
    yMin: m.descender - m.upm / 2,
    yMax: m.ascender + m.upm / 2,
  };
}

export function maxAdvance(m: FontMetrics): number {
  return m.upm * 2;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** مثل clamp لكن يعيد 0 إن كان المجال مقلوباً (عناصر أوسع من الحد). */
function clampRange(v: number, lo: number, hi: number): number {
  return lo > hi ? 0 : clamp(v, lo, hi);
}

export function clampPoint(p: Vec, m: FontMetrics): Vec {
  const r = coordRange(m);
  return {
    x: clamp(Math.round(p.x), r.xMin, r.xMax),
    y: clamp(Math.round(p.y), r.yMin, r.yMax),
  };
}

/** طول المقبض لا يتجاوز مربع الخط كاملاً. */
export function clampHandle(h: Vec, m: FontMetrics): Vec {
  const len = Math.hypot(h.x, h.y);
  if (len > m.upm) {
    const k = m.upm / len;
    return { x: Math.round(h.x * k), y: Math.round(h.y * k) };
  }
  return { x: Math.round(h.x), y: Math.round(h.y) };
}

/* ============================================================
   الالتصاق
   ============================================================ */

/** خطوة الشبكة المعروضة فعلاً: تتضاعف عند التصغير. الرسم والالتصاق يستعملان نفس القيمة. */
export function effectiveGridStep(step: number, scale: number): number {
  let s = step;
  while (s * scale < 10) s *= 2;
  return s;
}

export interface SnapContext {
  metrics: FontMetrics;
  advanceWidth: number;
  scale: number;
  gridStep: number;
  snapGrid: boolean;
  snapPoints: boolean;
  /** نقاط موجودة يمكن الالتصاق بها (بدون النقاط التي تُسحب الآن). */
  points: Vec[];
}

export interface SnapResult {
  x: number;
  y: number;
  kind: 'none' | 'grid' | 'point' | 'metric';
  guideX?: number;
  guideY?: number;
}

const SNAP_PX = 8;

function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}

/** أقرب قيمة من القائمة ضمن العتبة، أو undefined. */
function nearest(v: number, list: number[], thr: number): number | undefined {
  let best: number | undefined;
  let bd = thr;
  for (const c of list) {
    const d = Math.abs(c - v);
    if (d <= bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

/**
 * يحوّل نقطة حرة إلى نقطة ملتصقة. الأولوية: نقطة موجودة، ثم خط مقياس، ثم الشبكة.
 * النتيجة دائماً أعداد صحيحة وداخل حدود المحرف. disable = تعطيل الالتصاق (مفتاح Alt).
 */
export function snapPoint(p: Vec, ctx: SnapContext, disable = false): SnapResult {
  const fin = (r: SnapResult): SnapResult => {
    const c = clampPoint(r, ctx.metrics);
    return { ...r, x: c.x, y: c.y };
  };

  if (disable) return fin({ x: p.x, y: p.y, kind: 'none' });

  const thr = SNAP_PX / ctx.scale;
  const step = effectiveGridStep(ctx.gridStep, ctx.scale);

  if (ctx.snapPoints) {
    let best: Vec | null = null;
    let bd = thr;
    for (const q of ctx.points) {
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d <= bd) {
        bd = d;
        best = q;
      }
    }
    if (best) {
      return fin({ x: best.x, y: best.y, kind: 'point', guideX: best.x, guideY: best.y });
    }

    const m = ctx.metrics;
    const gy = nearest(p.y, [0, m.xHeight, m.capHeight, m.ascender, m.descender], thr);
    const gx = nearest(p.x, [0, ctx.advanceWidth], thr);
    if (gx !== undefined || gy !== undefined) {
      return fin({
        x: gx ?? (ctx.snapGrid ? roundTo(p.x, step) : p.x),
        y: gy ?? (ctx.snapGrid ? roundTo(p.y, step) : p.y),
        kind: 'metric',
        guideX: gx,
        guideY: gy,
      });
    }
  }

  if (ctx.snapGrid) {
    return fin({ x: roundTo(p.x, step), y: roundTo(p.y, step), kind: 'grid' });
  }
  return fin({ x: p.x, y: p.y, kind: 'none' });
}

/** تقييد الاتجاه (مفتاح Shift): أفقي أو رأسي أو قطري 45 درجة بالنسبة لنقطة الأصل. */
export function constrainAngle(origin: Vec, p: Vec): Vec {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax === 0 && ay === 0) return p;
  const angle = Math.atan2(ay, ax);
  if (angle < Math.PI / 8) return { x: p.x, y: origin.y };
  if (angle > (3 * Math.PI) / 8) return { x: origin.x, y: p.y };
  const d = Math.round((ax + ay) / 2);
  return { x: origin.x + Math.sign(dx) * d, y: origin.y + Math.sign(dy) * d };
}

/* ============================================================
   قراءة البنية
   ============================================================ */

export function allNodeIds(contours: Contour[]): Set<string> {
  const ids = new Set<string>();
  for (const c of contours) for (const n of c.nodes) ids.add(n.id);
  return ids;
}

export function countNodes(contours: Contour[]): number {
  return contours.reduce((sum, c) => sum + c.nodes.length, 0);
}

export function nodePositions(contours: Contour[], exclude?: ReadonlySet<string>): Vec[] {
  const out: Vec[] = [];
  for (const c of contours) {
    for (const n of c.nodes) {
      if (!exclude || !exclude.has(n.id)) out.push({ x: n.x, y: n.y });
    }
  }
  return out;
}

export function nodesInRect(contours: Contour[], a: Vec, b: Vec): string[] {
  const x1 = Math.min(a.x, b.x);
  const x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const y2 = Math.max(a.y, b.y);
  const out: string[] = [];
  for (const c of contours) {
    for (const n of c.nodes) {
      if (n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2) out.push(n.id);
    }
  }
  return out;
}

/** حدود مجموعة نقاط (مواضع النقاط فقط). عند غياب ids تُحسب حدود المنحنيات كلها بدقة. */
export function boundsOf(contours: Contour[], ids?: ReadonlySet<string>): Bounds | null {
  if (!ids || ids.size === 0) {
    let r: Bounds | null = null;
    for (const c of contours) {
      const b = getContourBounds(c);
      if (!b) continue;
      r = r
        ? {
            xMin: Math.min(r.xMin, b.xMin),
            yMin: Math.min(r.yMin, b.yMin),
            xMax: Math.max(r.xMax, b.xMax),
            yMax: Math.max(r.yMax, b.yMax),
          }
        : b;
    }
    return r;
  }
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  for (const c of contours) {
    for (const n of c.nodes) {
      if (!ids.has(n.id)) continue;
      xMin = Math.min(xMin, n.x);
      xMax = Math.max(xMax, n.x);
      yMin = Math.min(yMin, n.y);
      yMax = Math.max(yMax, n.y);
    }
  }
  return xMin === Infinity ? null : { xMin, yMin, xMax, yMax };
}

/* ============================================================
   اختبار الإصابة (hit testing) بوحدات الخط
   ============================================================ */

function segs(c: Contour): Array<[PathNode, PathNode]> {
  const out: Array<[PathNode, PathNode]> = [];
  for (let i = 1; i < c.nodes.length; i++) out.push([c.nodes[i - 1], c.nodes[i]]);
  if (c.closed && c.nodes.length > 1) out.push([c.nodes[c.nodes.length - 1], c.nodes[0]]);
  return out;
}

function bez(a: PathNode, b: PathNode, t: number): Vec {
  const c1 = { x: a.x + (a.handleOut?.x ?? 0), y: a.y + (a.handleOut?.y ?? 0) };
  const c2 = { x: b.x + (b.handleIn?.x ?? 0), y: b.y + (b.handleIn?.y ?? 0) };
  const m = 1 - t;
  const f = (p0: number, p1: number, p2: number, p3: number) =>
    m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3;
  return { x: f(a.x, c1.x, c2.x, b.x), y: f(a.y, c1.y, c2.y, b.y) };
}

/** تقسيم المسار إلى نقاط متتالية لحساب المسافة والاحتواء. */
export function flattenContour(c: Contour, steps = 16): Vec[] {
  if (c.nodes.length === 0) return [];
  const pts: Vec[] = [{ x: c.nodes[0].x, y: c.nodes[0].y }];
  for (const [a, b] of segs(c)) {
    if (!a.handleOut && !b.handleIn) {
      pts.push({ x: b.x, y: b.y });
    } else {
      for (let i = 1; i <= steps; i++) pts.push(bez(a, b, i / steps));
    }
  }
  if (c.closed && pts.length > 1) {
    const f = pts[0];
    const l = pts[pts.length - 1];
    if (f.x === l.x && f.y === l.y) pts.pop();
  }
  return pts;
}

function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distToPolyline(p: Vec, pts: Vec[], closed: boolean): number {
  if (pts.length === 0) return Infinity;
  if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, distToSegment(p, pts[i - 1], pts[i]));
  if (closed) best = Math.min(best, distToSegment(p, pts[pts.length - 1], pts[0]));
  return best;
}

export function pointInPolygon(p: Vec, pts: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function hitNode(
  contours: Contour[],
  p: Vec,
  radius: number
): { contourId: string; nodeId: string } | null {
  let best: { contourId: string; nodeId: string } | null = null;
  let bd = radius;
  for (let ci = contours.length - 1; ci >= 0; ci--) {
    const c = contours[ci];
    for (const n of c.nodes) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d <= bd) {
        bd = d;
        best = { contourId: c.id, nodeId: n.id };
      }
    }
  }
  return best;
}

export function hitHandle(
  contours: Contour[],
  ids: ReadonlySet<string>,
  p: Vec,
  radius: number
): { nodeId: string; which: 'in' | 'out' } | null {
  let best: { nodeId: string; which: 'in' | 'out' } | null = null;
  let bd = radius;
  for (const c of contours) {
    for (const n of c.nodes) {
      if (!ids.has(n.id)) continue;
      for (const which of ['in', 'out'] as const) {
        const h = which === 'in' ? n.handleIn : n.handleOut;
        if (!h) continue;
        const d = Math.hypot(n.x + h.x - p.x, n.y + h.y - p.y);
        if (d <= bd) {
          bd = d;
          best = { nodeId: n.id, which };
        }
      }
    }
  }
  return best;
}

/** المسار تحت النقطة: أقرب حافة ضمن التسامح، وإلا المسار المغلق الذي يحتويها. */
export function hitContour(contours: Contour[], p: Vec, tolerance: number): string | null {
  let best: string | null = null;
  let bd = tolerance;
  for (let i = contours.length - 1; i >= 0; i--) {
    const c = contours[i];
    const d = distToPolyline(p, flattenContour(c), c.closed);
    if (d <= bd) {
      bd = d;
      best = c.id;
    }
  }
  if (best) return best;
  for (let i = contours.length - 1; i >= 0; i--) {
    const c = contours[i];
    if (c.closed && pointInPolygon(p, flattenContour(c))) return c.id;
  }
  return null;
}

/** طرف مسار مفتوح قريب من النقطة (لمتابعة الرسم منه). */
export function hitEndpoint(
  contours: Contour[],
  p: Vec,
  radius: number
): { contourId: string; end: 'first' | 'last'; nodeId: string } | null {
  for (let i = contours.length - 1; i >= 0; i--) {
    const c = contours[i];
    if (c.closed || c.nodes.length === 0) continue;
    const last = c.nodes[c.nodes.length - 1];
    if (Math.hypot(last.x - p.x, last.y - p.y) <= radius) {
      return { contourId: c.id, end: 'last', nodeId: last.id };
    }
    const first = c.nodes[0];
    if (c.nodes.length > 1 && Math.hypot(first.x - p.x, first.y - p.y) <= radius) {
      return { contourId: c.id, end: 'first', nodeId: first.id };
    }
  }
  return null;
}

/* ============================================================
   عمليات التعديل (تعيد مصفوفة جديدة ولا تعدّل الأصل)
   ============================================================ */

function mapNodesIn(
  contours: Contour[],
  ids: ReadonlySet<string>,
  fn: (n: PathNode, c: Contour, i: number) => PathNode
): Contour[] {
  return contours.map((c) =>
    c.nodes.some((n) => ids.has(n.id))
      ? { ...c, nodes: c.nodes.map((n, i) => (ids.has(n.id) ? fn(n, c, i) : n)) }
      : c
  );
}

/** تحريك نقاط. الإزاحة تُقصّ تلقائياً حتى لا تخرج أي نقطة عن حدود المحرف. */
export function moveNodes(
  contours: Contour[],
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
  m: FontMetrics
): Contour[] {
  const r = coordRange(m);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of contours) {
    for (const n of c.nodes) {
      if (!ids.has(n.id)) continue;
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    }
  }
  if (minX === Infinity) return contours;
  const cdx = clampRange(Math.round(dx), r.xMin - minX, r.xMax - maxX);
  const cdy = clampRange(Math.round(dy), r.yMin - minY, r.yMax - maxY);
  if (cdx === 0 && cdy === 0) return contours;
  return mapNodesIn(contours, ids, (n) => ({ ...n, x: n.x + cdx, y: n.y + cdy }));
}

export function translateAll(contours: Contour[], dx: number, dy: number): Contour[] {
  if (dx === 0 && dy === 0) return contours;
  return contours.map((c) => ({
    ...c,
    nodes: c.nodes.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy })),
  }));
}

/** حذف نقاط. مسار أقل من نقطتين يُحذف، ومسار مغلق أقل من ثلاث نقاط يصير مفتوحاً. */
export function deleteNodes(contours: Contour[], ids: ReadonlySet<string>): Contour[] {
  const out: Contour[] = [];
  for (const c of contours) {
    const nodes = c.nodes.filter((n) => !ids.has(n.id));
    if (nodes.length === c.nodes.length) {
      out.push(c);
      continue;
    }
    if (nodes.length < 2) continue;
    out.push({ ...c, nodes, closed: c.closed && nodes.length >= 3 });
  }
  return out;
}

/** ضبط مقبض نقطة. النقطة الناعمة تُبقي المقبض المقابل على نفس الخط. */
export function setHandle(
  contours: Contour[],
  nodeId: string,
  which: 'in' | 'out',
  rel: Vec,
  m: FontMetrics
): Contour[] {
  const h = clampHandle(rel, m);
  const zero = h.x === 0 && h.y === 0;
  return contours.map((c) => {
    const i = c.nodes.findIndex((n) => n.id === nodeId);
    if (i < 0) return c;
    const n = c.nodes[i];
    const own = zero ? null : h;
    let next: PathNode = which === 'in' ? { ...n, handleIn: own } : { ...n, handleOut: own };
    const other = which === 'in' ? n.handleOut : n.handleIn;
    if (n.kind === 'smooth' && !zero && other) {
      const k = -Math.hypot(other.x, other.y) / Math.hypot(h.x, h.y);
      const opp = { x: Math.round(h.x * k), y: Math.round(h.y * k) };
      next = which === 'in' ? { ...next, handleOut: opp } : { ...next, handleIn: opp };
    }
    const nodes = [...c.nodes];
    nodes[i] = next;
    return { ...c, nodes };
  });
}

/** مقبضان متماثلان (سحب القلم): الخارج في اتجاه السحب والداخل عكسه. */
export function setSymmetricHandles(
  contours: Contour[],
  nodeId: string,
  out: Vec,
  m: FontMetrics
): Contour[] {
  const h = clampHandle(out, m);
  const zero = h.x === 0 && h.y === 0;
  return contours.map((c) => {
    const i = c.nodes.findIndex((n) => n.id === nodeId);
    if (i < 0) return c;
    const nodes = [...c.nodes];
    nodes[i] = {
      ...nodes[i],
      kind: zero ? 'corner' : 'smooth',
      handleOut: zero ? null : h,
      handleIn: zero ? null : { x: -h.x, y: -h.y },
    };
    return { ...c, nodes };
  });
}

export function newNode(x: number, y: number): PathNode {
  return { id: uid('node'), x, y, kind: 'corner', handleIn: null, handleOut: null };
}

export function addContourWithNode(
  contours: Contour[],
  node: PathNode
): { contours: Contour[]; contourId: string } {
  const contourId = uid('contour');
  return {
    contours: [...contours, { id: contourId, closed: false, nodes: [node] }],
    contourId,
  };
}

export function appendNode(contours: Contour[], contourId: string, node: PathNode): Contour[] {
  return contours.map((c) => (c.id === contourId ? { ...c, nodes: [...c.nodes, node] } : c));
}

export function closeContour(contours: Contour[], contourId: string): Contour[] {
  return contours.map((c) =>
    c.id === contourId && c.nodes.length >= 3 ? { ...c, closed: true } : c
  );
}

export function removeContour(contours: Contour[], contourId: string): Contour[] {
  return contours.filter((c) => c.id !== contourId);
}

export function reverseContour(c: Contour): Contour {
  return {
    ...c,
    nodes: [...c.nodes].reverse().map((n) => ({ ...n, handleIn: n.handleOut, handleOut: n.handleIn })),
  };
}

/** عكس اتجاه المسارات التي فيها نقاط محددة، أو كلها عند غياب التحديد. */
export function reverseContours(contours: Contour[], ids: ReadonlySet<string>): Contour[] {
  return contours.map((c) =>
    ids.size === 0 || c.nodes.some((n) => ids.has(n.id)) ? reverseContour(c) : c
  );
}

/* ---------- تحويلات ---------- */

export const flipHFn = (cx: number) => (p: Vec): Vec => ({ x: 2 * cx - p.x, y: p.y });
export const flipVFn = (cy: number) => (p: Vec): Vec => ({ x: p.x, y: 2 * cy - p.y });
export const scaleFn = (cx: number, cy: number, k: number) => (p: Vec): Vec => ({
  x: cx + (p.x - cx) * k,
  y: cy + (p.y - cy) * k,
});
/** deg موجبة = عكس عقارب الساعة. */
export const rotateFn = (cx: number, cy: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return (p: Vec): Vec => ({
    x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
    y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
  });
};

/**
 * تطبيق تحويل على نقاط محددة ومقابضها. يعيد null إن خرج أي شيء عن الحدود.
 * mirrored = التحويل قلب (يعكس الاتجاه)، فالمسار الكامل يُعكس ترتيبه ليحافظ على اتجاه التعبئة.
 */
export function transformNodes(
  contours: Contour[],
  ids: ReadonlySet<string>,
  fn: (p: Vec) => Vec,
  mirrored: boolean,
  m: FontMetrics
): Contour[] | null {
  const r = coordRange(m);
  let ok = true;
  const out = contours.map((c) => {
    if (!c.nodes.some((n) => ids.has(n.id))) return c;
    const full = c.nodes.every((n) => ids.has(n.id));
    const nodes = c.nodes.map((n) => {
      if (!ids.has(n.id)) return n;
      const p = fn({ x: n.x, y: n.y });
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      if (x < r.xMin || x > r.xMax || y < r.yMin || y > r.yMax) ok = false;
      const th = (h: Vec | null): Vec | null => {
        if (!h) return null;
        const q = fn({ x: n.x + h.x, y: n.y + h.y });
        const v = clampHandle({ x: q.x - p.x, y: q.y - p.y }, m);
        return v.x === 0 && v.y === 0 ? null : v;
      };
      return { ...n, x, y, handleIn: th(n.handleIn), handleOut: th(n.handleOut) };
    });
    const next = { ...c, nodes };
    return mirrored && full ? reverseContour(next) : next;
  });
  return ok ? out : null;
}

/* ---------- نوع النقطة ---------- */

function neighbors(c: Contour, i: number) {
  return { hasPrev: i > 0 || c.closed, hasNext: i < c.nodes.length - 1 || c.closed };
}

/** ربط المقابض: تصير النقطة ناعمة ومقبضاها على خط واحد. */
export function smoothNodes(contours: Contour[], ids: ReadonlySet<string>): Contour[] {
  return mapNodesIn(contours, ids, (n, c, i) => {
    const { hasPrev, hasNext } = neighbors(c, i);
    const out = n.handleOut;
    const inn = n.handleIn;
    if (out && inn) {
      const lo = Math.hypot(out.x, out.y);
      const li = Math.hypot(inn.x, inn.y);
      if (lo === 0) return { ...n, kind: 'smooth' as const };
      const k = -li / lo;
      return {
        ...n,
        kind: 'smooth' as const,
        handleIn: { x: Math.round(out.x * k), y: Math.round(out.y * k) },
      };
    }
    if (out && hasPrev) {
      return { ...n, kind: 'smooth' as const, handleIn: { x: -out.x, y: -out.y } };
    }
    if (inn && hasNext) {
      return { ...n, kind: 'smooth' as const, handleOut: { x: -inn.x, y: -inn.y } };
    }
    return { ...n, kind: 'smooth' as const };
  });
}

/** كسر المقابض: تصير النقطة زاوية ومقبضاها مستقلان. */
export function cornerNodes(contours: Contour[], ids: ReadonlySet<string>): Contour[] {
  return mapNodesIn(contours, ids, (n) => ({ ...n, kind: 'corner' as const }));
}

/** تنعيم تلقائي: مقابض من اتجاه الجارتين (Catmull-Rom). للنقاط التي لها جارتان فقط. */
export function autoSmoothNodes(
  contours: Contour[],
  ids: ReadonlySet<string>,
  m: FontMetrics
): Contour[] {
  return mapNodesIn(contours, ids, (n, c, i) => {
    const { hasPrev, hasNext } = neighbors(c, i);
    if (!hasPrev || !hasNext) return n;
    const L = c.nodes.length;
    const prev = c.nodes[(i - 1 + L) % L];
    const next = c.nodes[(i + 1) % L];
    const out = clampHandle({ x: (next.x - prev.x) / 6, y: (next.y - prev.y) / 6 }, m);
    if (out.x === 0 && out.y === 0) return n;
    return { ...n, kind: 'smooth' as const, handleOut: out, handleIn: { x: -out.x, y: -out.y } };
  });
}

/* ============================================================
   المقاييس: العرض الكامل والعارضان
   ============================================================ */

export interface Snapshot {
  contours: Contour[];
  advanceWidth: number;
}

export function clampAdvance(v: number, m: FontMetrics): number {
  return clamp(Math.round(v), 0, maxAdvance(m));
}

/** العارض الأيسر = بُعد أقصى يسار الرسم عن الأصل. تغييره يزيح الرسم ويبقي العارض الأيمن كما هو. */
export function setLsb(s: Snapshot, lsb: number, m: FontMetrics): Snapshot | null {
  const b = boundsOf(s.contours);
  if (!b) return null;
  const dx = Math.round(lsb) - Math.round(b.xMin);
  const advanceWidth = s.advanceWidth + dx;
  const r = coordRange(m);
  if (advanceWidth < 0 || advanceWidth > maxAdvance(m)) return null;
  if (b.xMin + dx < r.xMin || b.xMax + dx > r.xMax) return null;
  return { contours: translateAll(s.contours, dx, 0), advanceWidth };
}

/** العارض الأيمن = المسافة بين أقصى يمين الرسم ونهاية العرض الكامل. تغييره يغيّر العرض فقط. */
export function setRsb(s: Snapshot, rsb: number, m: FontMetrics): Snapshot | null {
  const b = boundsOf(s.contours);
  if (!b) return null;
  const advanceWidth = Math.round(b.xMax) + Math.round(rsb);
  if (advanceWidth < 0 || advanceWidth > maxAdvance(m)) return null;
  return { contours: s.contours, advanceWidth };
}

/** توسيط الرسم داخل العرض الكامل دون تغيير العرض. */
export function centerInAdvance(s: Snapshot, m: FontMetrics): Snapshot | null {
  const b = boundsOf(s.contours);
  if (!b) return null;
  const dx = Math.round((s.advanceWidth - (b.xMin + b.xMax)) / 2);
  const r = coordRange(m);
  if (b.xMin + dx < r.xMin || b.xMax + dx > r.xMax) return null;
  return { contours: translateAll(s.contours, dx, 0), advanceWidth: s.advanceWidth };
}

/* ============================================================
   الدفعة 13: مسارات كاملة، اتجاه، إدراج نقطة، تكرار
   ============================================================ */

/** كل نقاط المسارات التي فيها نقطة واحدة محددة على الأقل (التحويلات تعمل على مسارات كاملة دائماً). */
export function wholeContourIds(contours: Contour[], ids: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  for (const c of contours) {
    if (c.nodes.some((n) => ids.has(n.id))) c.nodes.forEach((n) => out.add(n.id));
  }
  return out;
}

/** حدود المسارات التي فيها المحدد (أو كلها إن لم يكن هناك تحديد)، بدقة المنحنيات. */
export function boundsOfTouched(contours: Contour[], ids: ReadonlySet<string>): Bounds | null {
  const touched = ids.size === 0 ? contours : contours.filter((c) => c.nodes.some((n) => ids.has(n.id)));
  return boundsOf(touched);
}

/** المساحة الموقّعة: موجبة = عكس عقارب الساعة (والمحور الرأسي للأعلى). */
export function signedArea(c: Contour): number {
  const p = flattenContour(c);
  let a = 0;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    a += p[j].x * p[i].y - p[i].x * p[j].y;
  }
  return a / 2;
}

export function isCounterClockwise(c: Contour): boolean {
  return signedArea(c) > 0;
}

/** عدد المسارات المغلقة الأخرى التي تحتوي هذا المسار. 0 = خارجي، 1 = ثقب، وهكذا. */
export function containmentDepth(contours: Contour[], c: Contour): number {
  if (c.nodes.length === 0) return 0;
  const probe = { x: c.nodes[0].x, y: c.nodes[0].y };
  let d = 0;
  for (const o of contours) {
    if (o.id === c.id || !o.closed || o.nodes.length < 3) continue;
    if (pointInPolygon(probe, flattenContour(o))) d++;
  }
  return d;
}

/** الاتجاه الصحيح: الخارجي عكس عقارب الساعة والثقوب مع عقاربها. يعيد المصفوفة نفسها إن كان كله صحيحاً. */
export function fixDirections(contours: Contour[]): Contour[] {
  let changed = false;
  const out = contours.map((c) => {
    if (!c.closed || c.nodes.length < 3) return c;
    const area = signedArea(c);
    if (area === 0) return c;
    const wantCcw = containmentDepth(contours, c) % 2 === 0;
    if (area > 0 === wantCcw) return c;
    changed = true;
    return reverseContour(c);
  });
  return changed ? out : contours;
}

/** كم مساراً مغلقاً اتجاهه خطأ. */
export function wrongDirectionCount(contours: Contour[]): number {
  const fixed = fixDirections(contours);
  return fixed === contours ? 0 : fixed.filter((c, i) => c !== contours[i]).length;
}

export interface SegmentHit {
  contourId: string;
  /** رقم النقطة التي يبدأ منها المقطع. المقطع الأخير في المغلق يعود للنقطة الأولى. */
  index: number;
  t: number;
  point: Vec;
  distance: number;
}

/** أقرب مقطع (خط أو منحنى) إلى نقطة، ضمن tolerance. */
export function nearestOnContours(contours: Contour[], p: Vec, tolerance: number): SegmentHit | null {
  let best: SegmentHit | null = null;
  for (const c of contours) {
    const n = c.nodes.length;
    const count = c.closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const a = c.nodes[i];
      const b = c.nodes[(i + 1) % n];
      const straight = !a.handleOut && !b.handleIn;
      let t: number;
      if (straight) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        t = len2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
      } else {
        const N = 32;
        let bt = 0;
        let bd = Infinity;
        for (let k = 0; k <= N; k++) {
          const q = bez(a, b, k / N);
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < bd) {
            bd = d;
            bt = k / N;
          }
        }
        let lo = Math.max(0, bt - 1 / N);
        let hi = Math.min(1, bt + 1 / N);
        for (let k = 0; k < 12; k++) {
          const m1 = lo + (hi - lo) / 3;
          const m2 = hi - (hi - lo) / 3;
          const q1 = bez(a, b, m1);
          const q2 = bez(a, b, m2);
          if (Math.hypot(p.x - q1.x, p.y - q1.y) < Math.hypot(p.x - q2.x, p.y - q2.y)) hi = m2;
          else lo = m1;
        }
        t = (lo + hi) / 2;
      }
      const q = bez(a, b, t);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d <= tolerance && (!best || d < best.distance)) {
        best = { contourId: c.id, index: i, t, point: q, distance: d };
      }
    }
  }
  return best;
}

const lerp = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const rv = (h: Vec): Vec | null => {
  const v = { x: Math.round(h.x), y: Math.round(h.y) };
  return v.x === 0 && v.y === 0 ? null : v;
};

/** إدراج نقطة على مقطع دون تغيير شكله (de Casteljau). يعيد null عند بلوغ حد النقاط. */
export function insertNodeOnSegment(
  contours: Contour[],
  contourId: string,
  index: number,
  t: number
): { contours: Contour[]; nodeId: string } | null {
  if (countNodes(contours) >= LIMITS.maxNodes) return null;
  const c = contours.find((x) => x.id === contourId);
  if (!c) return null;
  const n = c.nodes.length;
  const a = c.nodes[index];
  const b = c.nodes[(index + 1) % n];
  if (!a || !b || (!c.closed && index >= n - 1)) return null;

  const tt = clamp(t, 0.02, 0.98);
  const id = uid('node');
  let fresh: PathNode;
  let na: PathNode = a;
  let nb: PathNode = b;

  if (!a.handleOut && !b.handleIn) {
    const p = lerp(a, b, tt);
    fresh = { id, x: Math.round(p.x), y: Math.round(p.y), kind: 'corner', handleIn: null, handleOut: null };
  } else {
    const p0 = { x: a.x, y: a.y };
    const p1 = { x: a.x + (a.handleOut?.x ?? 0), y: a.y + (a.handleOut?.y ?? 0) };
    const p2 = { x: b.x + (b.handleIn?.x ?? 0), y: b.y + (b.handleIn?.y ?? 0) };
    const p3 = { x: b.x, y: b.y };
    const q0 = lerp(p0, p1, tt);
    const q1 = lerp(p1, p2, tt);
    const q2 = lerp(p2, p3, tt);
    const r0 = lerp(q0, q1, tt);
    const r1 = lerp(q1, q2, tt);
    const s = lerp(r0, r1, tt);
    const sx = Math.round(s.x);
    const sy = Math.round(s.y);
    fresh = {
      id,
      x: sx,
      y: sy,
      kind: 'smooth',
      handleIn: rv({ x: r0.x - sx, y: r0.y - sy }),
      handleOut: rv({ x: r1.x - sx, y: r1.y - sy }),
    };
    na = { ...a, handleOut: rv({ x: q0.x - a.x, y: q0.y - a.y }) };
    nb = { ...b, handleIn: rv({ x: q2.x - b.x, y: q2.y - b.y }) };
  }

  const nodes = c.nodes.map((x) => (x.id === a.id ? na : x.id === b.id ? nb : x));
  const at = index + 1;
  nodes.splice(at, 0, fresh);
  return {
    contours: contours.map((x) => (x.id === contourId ? { ...x, nodes } : x)),
    nodeId: id,
  };
}

/** يفتح مسار مغلق عند نقطة (تصير طرفاً). */
export function openContourAt(contours: Contour[], nodeId: string): Contour[] {
  return contours.map((c) => {
    if (!c.closed) return c;
    const i = c.nodes.findIndex((n) => n.id === nodeId);
    if (i < 0) return c;
    return { ...c, closed: false, nodes: [...c.nodes.slice(i + 1), ...c.nodes.slice(0, i + 1)] };
  });
}

/** يغلق كل مسار مفتوح فيه نقطة محددة (أو كل المفتوحة إن لم يكن هناك تحديد). */
export function closeContours(contours: Contour[], ids: ReadonlySet<string>): Contour[] {
  return contours.map((c) =>
    !c.closed && c.nodes.length >= 3 && (ids.size === 0 || c.nodes.some((n) => ids.has(n.id)))
      ? { ...c, closed: true }
      : c
  );
}

export function hasClosable(contours: Contour[], ids: ReadonlySet<string>): boolean {
  return closeContours(contours, ids).some((c, i) => c !== contours[i]);
}

/** نسخ المسارات المحددة (أو كلها) بإزاحة. يعيد null إن تجاوز الحدود. */
export function duplicateContours(
  contours: Contour[],
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
  m: FontMetrics
): { contours: Contour[]; newIds: Set<string> } | null {
  const src = ids.size === 0 ? contours : contours.filter((c) => c.nodes.some((n) => ids.has(n.id)));
  if (src.length === 0) return null;
  if (contours.length + src.length > LIMITS.maxContours) return null;
  if (countNodes(contours) + countNodes(src) > LIMITS.maxNodes) return null;
  const r = coordRange(m);
  const newIds = new Set<string>();
  const copies: Contour[] = [];
  for (const c of src) {
    const nodes = c.nodes.map((n) => {
      const nid = uid('node');
      newIds.add(nid);
      return { ...n, id: nid, x: n.x + dx, y: n.y + dy };
    });
    if (nodes.some((n) => n.x < r.xMin || n.x > r.xMax || n.y < r.yMin || n.y > r.yMax)) return null;
    copies.push({ ...c, id: uid('contour'), nodes });
  }
  return { contours: [...contours, ...copies], newIds };
}

/** موضع واتجاه سهم يدل على اتجاه المسار (منتصف أول مقطع). */
export function contourArrow(c: Contour): { at: Vec; dir: Vec } | null {
  if (c.nodes.length < 2) return null;
  const a = c.nodes[0];
  const b = c.nodes[1];
  const p = bez(a, b, 0.5);
  const q = bez(a, b, 0.56);
  const len = Math.hypot(q.x - p.x, q.y - p.y);
  if (len === 0) return null;
  return { at: p, dir: { x: (q.x - p.x) / len, y: (q.y - p.y) / len } };
}
