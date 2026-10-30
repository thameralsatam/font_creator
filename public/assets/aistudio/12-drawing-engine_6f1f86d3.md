# الملف ١٢ — محرك الرسم والأدوات والمقاييس

هذا الملف يفعّل الاستوديو بالكامل: أدوات القلم والتحديد والتحريك واليد، الالتصاق بالشبكة والنقاط، التراجع والإعادة، التحويلات، المقاييس، وحدود الأمان. لا تشغّل البناء قبل نهاية الملف.

## قواعد عامة

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- انسخ المحتوى داخل كل كتلة كود كما هو بالضبط، بدون تغيير حرف واحد وبدون تعليقات إضافية.
- الأمر "أنشئ الملف" يعني: أنشئه، وإن كان موجوداً مسبقاً استبدل محتواه بالكامل.
- لا تلمس أي ملف غير مذكور. لا تحذف ولا تنقل ولا تعيد تسمية أي ملف.
- إذا ظهر خطأ غير متوقع أو تعذّر أمر: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- الملف طويل. إذا توقفت في المنتصف، أكمل من الأمر التالي مباشرة ولا تعد ما سبق.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر 1: تعديل `src/components/ui/Dropdown.tsx`

يضيف خاصية `disabled` لعنصر القائمة، لتعطيل الأوامر التي لا تنطبق الآن (مثل الحذف بدون تحديد).

نفّذ التعديلات التالية بالترتيب. كل نص قديم يظهر مرة واحدة فقط في الملف، فاستبدله بالنص الجديد حرفياً. لا تغيّر أي شيء آخر في الملف.

**التعديل 1**

النص القديم:

```tsx
  active?: boolean;
  soon?: boolean;
  onClick?: () => void;
}
```

النص الجديد:

```tsx
  active?: boolean;
  soon?: boolean;
  /** معطّل مؤقتاً لعدم انطباق الأمر الآن (ليس "قريباً"). */
  disabled?: boolean;
  onClick?: () => void;
}
```

**التعديل 2**

النص القديم:

```tsx
  soon = false,
  onClick,
}) => (
```

النص الجديد:

```tsx
  soon = false,
  disabled = false,
  onClick,
}) => (
```

**التعديل 3**

النص القديم:

```tsx
    disabled={soon}
```

النص الجديد:

```tsx
    disabled={soon || disabled}
```

---

## الأمر 2: تعديل `src/App.tsx`

يمرّر دالة تعديل المحرف إلى الاستوديو.

نفّذ التعديلات التالية بالترتيب. كل نص قديم يظهر مرة واحدة فقط في الملف، فاستبدله بالنص الجديد حرفياً. لا تغيّر أي شيء آخر في الملف.

**التعديل 1**

النص القديم:

```tsx
          onSelectGlyph={setSelectedGlyphId}
          onBack={() => setView('overview')}
```

النص الجديد:

```tsx
          onSelectGlyph={setSelectedGlyphId}
          onUpdateGlyph={(updater) => store.updateGlyph(activeProject.id, activeGlyph.id, updater)}
          onBack={() => setView('overview')}
```

---

## الأمر 3: تعديل `src/components/studio/useViewport.ts`

المؤشر الواحد صار يحرّك اللوحة فقط حين تقرر اللوحة ذلك (أداة اليد أو المسافة أو الزر الأوسط).

نفّذ التعديلات التالية بالترتيب. كل نص قديم يظهر مرة واحدة فقط في الملف، فاستبدله بالنص الجديد حرفياً. لا تغيّر أي شيء آخر في الملف.

**التعديل 1**

النص القديم:

```ts
  /** السحب بإصبع أو مؤشر واحد يحرّك الكانفاس. يُعطَّل عند تفعيل أدوات الرسم. */
  singlePointerPan?: boolean;
```

النص الجديد:

```ts
  /** هل يحرّك المؤشر الواحد اللوحة الآن؟ تُقرأ لحظة الحركة. الافتراضي: نعم. */
  shouldPan?: () => boolean;
```

**التعديل 2**

النص القديم:

```ts
export function useViewport({ fitBox, fitKey, singlePointerPan = true }: Options) {
```

النص الجديد:

```ts
export function useViewport({ fitBox, fitKey, shouldPan }: Options) {
```

**التعديل 3**

النص القديم:

```ts
if (pointers.current.size === 1 && singlePointerPan) {
```

النص الجديد:

```ts
if (pointers.current.size === 1 && (shouldPan ? shouldPan() : true)) {
```

---

## الأمر 4: `src/utils/pathEdit.ts`

كل منطق التحرير النقي: الالتصاق، الحدود، التحديد، الحذف، التحويلات، المقابض، المقاييس.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
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
```

---

## الأمر 5: `src/utils/pathEdit.test.ts`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { type Contour, type FontMetrics, type PathNode } from '../types/font';
import {
  autoSmoothNodes,
  boundsOf,
  centerInAdvance,
  constrainAngle,
  cornerNodes,
  deleteNodes,
  effectiveGridStep,
  flipHFn,
  hitContour,
  hitEndpoint,
  hitHandle,
  hitNode,
  moveNodes,
  nodesInRect,
  pointInPolygon,
  flattenContour,
  reverseContour,
  rotateFn,
  setHandle,
  setLsb,
  setRsb,
  setSymmetricHandles,
  smoothNodes,
  snapPoint,
  transformNodes,
  type SnapContext,
} from './pathEdit';

const M: FontMetrics = { upm: 1000, ascender: 800, capHeight: 700, xHeight: 500, descender: -200 };

const node = (
  id: string,
  x: number,
  y: number,
  handleIn: PathNode['handleIn'] = null,
  handleOut: PathNode['handleOut'] = null,
  kind: PathNode['kind'] = 'corner'
): PathNode => ({ id, x, y, kind, handleIn, handleOut });

const square = (): Contour => ({
  id: 'sq',
  closed: true,
  nodes: [node('a', 100, 0), node('b', 300, 0), node('c', 300, 200), node('d', 100, 200)],
});

const ctx = (over: Partial<SnapContext> = {}): SnapContext => ({
  metrics: M,
  advanceWidth: 500,
  scale: 1,
  gridStep: 50,
  snapGrid: true,
  snapPoints: true,
  points: [],
  ...over,
});

test('effectiveGridStep doubles until lines are at least 10px apart', () => {
  assert.equal(effectiveGridStep(50, 1), 50);
  assert.equal(effectiveGridStep(10, 0.5), 20);
  assert.equal(effectiveGridStep(10, 0.1), 160);
});

test('snapPoint: grid, point, metric, disabled, clamped', () => {
  assert.deepEqual(snapPoint({ x: 123, y: 262 }, ctx({ snapPoints: false })).kind, 'grid');
  assert.equal(snapPoint({ x: 123, y: 262 }, ctx({ snapPoints: false })).x, 100);
  assert.equal(snapPoint({ x: 123, y: 262 }, ctx({ snapPoints: false })).y, 250);

  const p = snapPoint({ x: 203, y: 207 }, ctx({ points: [{ x: 200, y: 210 }] }));
  assert.equal(p.kind, 'point');
  assert.equal(p.x, 200);
  assert.equal(p.y, 210);

  const m = snapPoint({ x: 177, y: 497 }, ctx({ snapGrid: false }));
  assert.equal(m.kind, 'metric');
  assert.equal(m.y, 500);
  assert.equal(m.guideY, 500);
  assert.equal(m.x, 177);

  const off = snapPoint({ x: 123.4, y: 262.6 }, ctx(), true);
  assert.equal(off.kind, 'none');
  assert.equal(off.x, 123);
  assert.equal(off.y, 263);

  const far = snapPoint({ x: 99999, y: -99999 }, ctx(), true);
  assert.equal(far.x, 2000);
  assert.equal(far.y, -700);
});

test('constrainAngle snaps to horizontal, vertical and diagonal', () => {
  const o = { x: 100, y: 100 };
  assert.deepEqual(constrainAngle(o, { x: 300, y: 110 }), { x: 300, y: 100 });
  assert.deepEqual(constrainAngle(o, { x: 105, y: 400 }), { x: 100, y: 400 });
  assert.deepEqual(constrainAngle(o, { x: 300, y: 280 }), { x: 290, y: 290 });
  assert.deepEqual(constrainAngle(o, o), o);
});

test('moveNodes clamps the offset so nothing leaves the limits', () => {
  const c = [square()];
  const moved = moveNodes(c, new Set(['a', 'b', 'c', 'd']), 50, -30, M);
  assert.equal(moved[0].nodes[0].x, 150);
  assert.equal(moved[0].nodes[0].y, -30);
  const far = moveNodes(c, new Set(['a', 'b', 'c', 'd']), 99999, 0, M);
  assert.equal(Math.max(...far[0].nodes.map((n) => n.x)), 2000);
  assert.equal(moveNodes(c, new Set(), 10, 10, M), c);
  assert.equal(c[0].nodes[0].x, 100);
});

test('deleteNodes follows the contour rules', () => {
  const c = [square()];
  const one = deleteNodes(c, new Set(['d']));
  assert.equal(one[0].nodes.length, 3);
  assert.equal(one[0].closed, true);
  const two = deleteNodes(c, new Set(['c', 'd']));
  assert.equal(two[0].nodes.length, 2);
  assert.equal(two[0].closed, false);
  assert.equal(deleteNodes(c, new Set(['b', 'c', 'd'])).length, 0);
});

test('setHandle keeps a smooth node collinear and retracts at zero', () => {
  const c: Contour[] = [
    {
      id: 'c',
      closed: false,
      nodes: [node('a', 0, 0), node('s', 100, 0, { x: -50, y: 0 }, { x: 50, y: 0 }, 'smooth'), node('b', 200, 0)],
    },
  ];
  const r = setHandle(c, 's', 'out', { x: 0, y: 100 }, M);
  assert.deepEqual(r[0].nodes[1].handleOut, { x: 0, y: 100 });
  assert.deepEqual(r[0].nodes[1].handleIn, { x: -0, y: -50 });
  const z = setHandle(c, 's', 'out', { x: 0, y: 0 }, M);
  assert.equal(z[0].nodes[1].handleOut, null);
  const long = setHandle(c, 's', 'out', { x: 5000, y: 0 }, M);
  assert.equal(long[0].nodes[1].handleOut?.x, 1000);
});

test('setSymmetricHandles creates mirrored handles', () => {
  const c: Contour[] = [{ id: 'c', closed: false, nodes: [node('a', 0, 0)] }];
  const r = setSymmetricHandles(c, 'a', { x: 40, y: 10 }, M);
  assert.equal(r[0].nodes[0].kind, 'smooth');
  assert.deepEqual(r[0].nodes[0].handleOut, { x: 40, y: 10 });
  assert.deepEqual(r[0].nodes[0].handleIn, { x: -40, y: -10 });
  const back = setSymmetricHandles(r, 'a', { x: 0, y: 0 }, M);
  assert.equal(back[0].nodes[0].kind, 'corner');
  assert.equal(back[0].nodes[0].handleOut, null);
});

test('reverseContour swaps order and handles', () => {
  const c: Contour = {
    id: 'c',
    closed: false,
    nodes: [node('a', 0, 0, null, { x: 10, y: 0 }), node('b', 100, 0, { x: -10, y: 0 }, null)],
  };
  const r = reverseContour(c);
  assert.deepEqual(r.nodes.map((n) => n.id), ['b', 'a']);
  assert.deepEqual(r.nodes[0].handleOut, { x: -10, y: 0 });
  assert.deepEqual(r.nodes[1].handleIn, { x: 10, y: 0 });
});

test('transformNodes: flip reverses a fully selected contour, null when out of range', () => {
  const c = [square()];
  const all = new Set(['a', 'b', 'c', 'd']);
  const f = transformNodes(c, all, flipHFn(200), true, M);
  assert.ok(f);
  assert.equal(f[0].nodes[0].id, 'd');
  assert.equal(Math.min(...f[0].nodes.map((n) => n.x)), 100);
  const partial = transformNodes(c, new Set(['a']), flipHFn(200), true, M);
  assert.ok(partial);
  assert.equal(partial[0].nodes[0].id, 'a');
  const r = transformNodes(c, all, rotateFn(200, 100, 90), false, M);
  assert.ok(r);
  const b = boundsOf(r);
  assert.ok(b);
  assert.equal(b.xMax - b.xMin, 200);
  assert.equal(b.yMax - b.yMin, 200);
  assert.equal(transformNodes(c, all, (p) => ({ x: p.x * 100, y: p.y }), false, M), null);
});

test('smooth, corner and auto smooth', () => {
  const c: Contour[] = [
    {
      id: 'c',
      closed: false,
      nodes: [node('a', 0, 0), node('m', 100, 0, { x: -30, y: 0 }, { x: 0, y: 40 }), node('b', 200, 100)],
    },
  ];
  const s = smoothNodes(c, new Set(['m']));
  assert.equal(s[0].nodes[1].kind, 'smooth');
  assert.deepEqual(s[0].nodes[1].handleIn, { x: -0, y: -30 });
  const k = cornerNodes(s, new Set(['m']));
  assert.equal(k[0].nodes[1].kind, 'corner');
  const end = smoothNodes(c, new Set(['a']));
  assert.equal(end[0].nodes[0].handleIn, null);
  const auto = autoSmoothNodes(
    [{ id: 'c', closed: false, nodes: [node('a', 0, 0), node('m', 100, 0), node('b', 200, 60)] }],
    new Set(['m']),
    M
  );
  assert.deepEqual(auto[0].nodes[1].handleOut, { x: 33, y: 10 });
  assert.deepEqual(auto[0].nodes[1].handleIn, { x: -33, y: -10 });
  const ends = autoSmoothNodes(auto, new Set(['a']), M);
  assert.equal(ends[0].nodes[0].handleOut, null);
});

test('metrics: lsb, rsb and centering', () => {
  const s = { contours: [square()], advanceWidth: 500 };
  const l = setLsb(s, 50, M);
  assert.ok(l);
  assert.equal(boundsOf(l.contours)?.xMin, 50);
  assert.equal(l.advanceWidth, 450);
  const r = setRsb(s, 40, M);
  assert.ok(r);
  assert.equal(r.advanceWidth, 340);
  assert.equal(setRsb(s, 5000, M), null);
  assert.equal(setLsb({ contours: [], advanceWidth: 500 }, 10, M), null);
  const ctr = centerInAdvance(s, M);
  assert.ok(ctr);
  const b = boundsOf(ctr.contours);
  assert.ok(b);
  assert.equal(b.xMin, 500 - b.xMax);
});

test('hit testing', () => {
  const c = [square()];
  assert.deepEqual(hitNode(c, { x: 102, y: 3 }, 8), { contourId: 'sq', nodeId: 'a' });
  assert.equal(hitNode(c, { x: 150, y: 100 }, 8), null);
  assert.equal(hitContour(c, { x: 200, y: 100 }, 8), 'sq');
  assert.equal(hitContour(c, { x: 150, y: 3 }, 8), 'sq');
  assert.equal(hitContour(c, { x: 600, y: 600 }, 8), null);

  const h: Contour[] = [
    { id: 'h', closed: false, nodes: [node('p', 0, 0, null, { x: 0, y: 100 }), node('q', 100, 0)] },
  ];
  assert.deepEqual(hitHandle(h, new Set(['p']), { x: 2, y: 98 }, 8), { nodeId: 'p', which: 'out' });
  assert.equal(hitHandle(h, new Set(), { x: 2, y: 98 }, 8), null);

  assert.deepEqual(hitEndpoint(h, { x: 99, y: 2 }, 8), { contourId: 'h', end: 'last', nodeId: 'q' });
  assert.equal(hitEndpoint(c, { x: 100, y: 0 }, 8), null);
});

test('rect selection, polygon containment and flatten', () => {
  const c = [square()];
  assert.deepEqual(nodesInRect(c, { x: 50, y: -10 }, { x: 350, y: 50 }).sort(), ['a', 'b']);
  const poly = flattenContour(c[0]);
  assert.equal(poly.length, 4);
  assert.equal(pointInPolygon({ x: 200, y: 100 }, poly), true);
  assert.equal(pointInPolygon({ x: 400, y: 100 }, poly), false);
});
```

---

## الأمر 6: `src/components/studio/useStudioEditor.ts`

محرك الاستوديو: الأدوات، الإيماءات، التراجع والإعادة، اختصارات لوحة المفاتيح.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Contour, type FontMetrics, type Glyph, type Vec } from '../../types/font';
import {
  LIMITS,
  addContourWithNode,
  allNodeIds,
  appendNode,
  autoSmoothNodes,
  boundsOf,
  centerInAdvance,
  clampAdvance,
  closeContour,
  constrainAngle,
  cornerNodes,
  countNodes,
  deleteNodes,
  flipHFn,
  flipVFn,
  hitContour,
  hitEndpoint,
  hitHandle,
  hitNode,
  moveNodes,
  newNode,
  nodePositions,
  nodesInRect,
  removeContour,
  reverseContour,
  reverseContours,
  rotateFn,
  scaleFn,
  setHandle,
  setLsb,
  setRsb,
  setSymmetricHandles,
  smoothNodes,
  snapPoint,
  transformNodes,
  effectiveGridStep,
  type Snapshot,
  type SnapContext,
  type SnapResult,
} from '../../utils/pathEdit';

export type ToolId = 'select' | 'move' | 'pen' | 'hand';

export interface PointerInfo {
  world: Vec;
  screen: Vec;
  shift: boolean;
  alt: boolean;
  touch: boolean;
}

export interface Rect {
  a: Vec;
  b: Vec;
}

export interface HoverTarget {
  kind: 'node' | 'handle' | 'contour' | 'first' | 'end';
  id: string;
}

export interface PenPreview {
  from: Vec;
  fromHandle: Vec | null;
  to: Vec;
}

interface Options {
  glyph: Glyph;
  metrics: FontMetrics;
  /** مقياس العرض الحالي (بكسل لكل وحدة خط). */
  scale: number;
  onUpdateGlyph: (updater: (g: Glyph) => Glyph) => void;
}

type Gesture =
  | { kind: 'none' }
  | {
      kind: 'drag';
      pre: Snapshot;
      base: Contour[];
      ids: ReadonlySet<string>;
      startWorld: Vec;
      startScreen: Vec;
      grab: Vec;
      mode: 'point' | 'delta';
      toggleId: string | null;
      moved: boolean;
    }
  | {
      kind: 'handle';
      pre: Snapshot;
      base: Contour[];
      nodeId: string;
      which: 'in' | 'out';
      origin: Vec;
      moved: boolean;
    }
  | {
      kind: 'marquee';
      pre: Snapshot;
      start: Vec;
      startScreen: Vec;
      additive: boolean;
      initial: ReadonlySet<string>;
      moved: boolean;
    }
  | {
      kind: 'pen';
      pre: Snapshot;
      base: Contour[];
      nodeId: string;
      origin: Vec;
      startScreen: Vec;
      moved: boolean;
    };

const EMPTY: ReadonlySet<string> = new Set();
const HISTORY_MAX = 100;
const NUDGE_COALESCE_MS = 700;
const DRAG_PX = 3;
const PEN_DRAG_PX = 5;

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export const MSG = {
  maxNodes: `وصل المحرف إلى الحد الأقصى من النقاط (${LIMITS.maxNodes}).`,
  maxContours: `وصل المحرف إلى الحد الأقصى من المسارات (${LIMITS.maxContours}).`,
  needThree: 'يلزم ثلاث نقاط على الأقل لإغلاق المسار.',
  needSelection: 'حدد نقطة أو أكثر أولاً.',
  outOfRange: 'التحويل سيُخرج الرسم عن الحدود المسموحة للمحرف.',
  noDrawing: 'لا يوجد رسم في هذا المحرف.',
  badMetric: 'القيمة تُخرج الرسم أو العرض عن الحدود المسموحة.',
} as const;

/**
 * محرك التحرير: الأدوات والتحديد والالتصاق والتراجع والإعادة.
 * مصدر الحقيقة الوحيد للرسم هو glyph.contours. هذا المحرك يحتفظ بنسخة عمل متزامنة (work)
 * حتى لا تُقرأ قيمة قديمة بين حدثين متتاليين قبل إعادة الرسم.
 */
export function useStudioEditor({ glyph, metrics, scale, onUpdateGlyph }: Options) {
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const updateRef = useRef(onUpdateGlyph);
  updateRef.current = onUpdateGlyph;

  /* ---------- نسخة العمل ---------- */
  const work = useRef<Snapshot>({ contours: glyph.contours, advanceWidth: glyph.advanceWidth });
  const applied = useRef<Snapshot>(work.current);
  if (
    applied.current.contours !== glyph.contours ||
    applied.current.advanceWidth !== glyph.advanceWidth
  ) {
    // تغيير خارجي (مثل تبديل المحرف): نتبنّاه
    work.current = { contours: glyph.contours, advanceWidth: glyph.advanceWidth };
    applied.current = work.current;
  }

  /* ---------- الحالة ---------- */
  const [tool, setToolState] = useState<ToolId>('select');
  const toolRef = useRef<ToolId>('select');
  const [selection, setSelectionState] = useState<ReadonlySet<string>>(EMPTY);
  const selRef = useRef<ReadonlySet<string>>(EMPTY);
  const [penId, setPenIdState] = useState<string | null>(null);
  const penRef = useRef<string | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [preview, setPreview] = useState<PenPreview | null>(null);
  const [snapMark, setSnapMark] = useState<SnapResult | null>(null);
  const [hover, setHoverState] = useState<HoverTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [gridStep, setGridStep] = useState(50);
  const [snapGrid, setSnapGrid] = useState(true);
  const [snapPoints, setSnapPoints] = useState(true);
  const settings = useRef({ gridStep, snapGrid, snapPoints });
  settings.current = { gridStep, snapGrid, snapPoints };

  const gesture = useRef<Gesture>({ kind: 'none' });
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const [counts, setCounts] = useState({ past: 0, future: 0 });
  const noticeTimer = useRef<number | undefined>(undefined);
  const hoverRef = useRef<HoverTarget | null>(null);

  const setSelection = (ids: ReadonlySet<string>) => {
    selRef.current = ids;
    setSelectionState(ids);
  };
  const setPenId = (id: string | null) => {
    penRef.current = id;
    setPenIdState(id);
  };
  const setHover = (h: HoverTarget | null) => {
    const a = hoverRef.current;
    if (a?.kind === h?.kind && a?.id === h?.id) return;
    hoverRef.current = h;
    setHoverState(h);
  };
  const flash = (msg: string) => {
    setNotice(msg);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600);
  };
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  /* ---------- تطبيق وتسجيل ---------- */
  const apply = (patch: Partial<Snapshot>) => {
    const next: Snapshot = { ...work.current, ...patch };
    work.current = next;
    applied.current = next;
    updateRef.current((g) => ({ ...g, contours: next.contours, advanceWidth: next.advanceWidth }));
  };

  const syncCounts = () =>
    setCounts({ past: past.current.length, future: future.current.length });

  const pushHistory = (snap: Snapshot, key?: string) => {
    const now = Date.now();
    if (key && lastKey.current?.key === key && now - lastKey.current.at < NUDGE_COALESCE_MS) {
      lastKey.current.at = now;
      return;
    }
    lastKey.current = key ? { key, at: now } : null;
    past.current.push(snap);
    if (past.current.length > HISTORY_MAX) past.current.shift();
    future.current = [];
    syncCounts();
  };

  /** تعديل مسجّل في التراجع. */
  const commit = (patch: Partial<Snapshot>, key?: string) => {
    pushHistory(work.current, key);
    apply(patch);
  };

  /** تحديد صالح: يستبعد نقاطاً حُذفت أو اختفت بالتراجع. */
  const liveSelection = (): ReadonlySet<string> => {
    const live = allNodeIds(work.current.contours);
    const out = new Set<string>();
    selRef.current.forEach((id) => {
      if (live.has(id)) out.add(id);
    });
    return out;
  };

  const penContour = (): Contour | null => {
    const id = penRef.current;
    return (id && work.current.contours.find((c) => c.id === id)) || null;
  };

  const snapCtx = (exclude?: ReadonlySet<string>): SnapContext => ({
    metrics: metricsRef.current,
    advanceWidth: work.current.advanceWidth,
    scale: scaleRef.current,
    gridStep: settings.current.gridStep,
    snapGrid: settings.current.snapGrid,
    snapPoints: settings.current.snapPoints,
    points: nodePositions(work.current.contours, exclude),
  });

  /* ---------- القلم ---------- */
  const finishPen = () => {
    const c = penContour();
    if (c && c.nodes.length < 2) {
      commit({ contours: removeContour(work.current.contours, c.id) });
    }
    setPenId(null);
    setPreview(null);
  };

  const setTool = (t: ToolId) => {
    if (t === toolRef.current) return;
    cancelGesture();
    finishPen();
    toolRef.current = t;
    setToolState(t);
    setMarquee(null);
    setSnapMark(null);
    setHover(null);
  };

  /* ---------- الإيماءات ---------- */
  const cancelGesture = () => {
    const g = gesture.current;
    if (g.kind !== 'none') {
      if (work.current.contours !== g.pre.contours || work.current.advanceWidth !== g.pre.advanceWidth) {
        apply(g.pre);
      }
      gesture.current = { kind: 'none' };
    }
    setMarquee(null);
    setSnapMark(null);
  };

  const hitRadius = (touch: boolean, mouse: number, fingers: number) =>
    (touch ? fingers : mouse) / scaleRef.current;

  const pointerDown = (info: PointerInfo) => {
    const t = toolRef.current;
    if (t === 'hand') return;
    const contours = work.current.contours;
    const pre = work.current;

    if (t === 'pen') return penDown(info);

    if (t === 'select') {
      const sel = liveSelection();
      const hh = hitHandle(contours, sel, info.world, hitRadius(info.touch, 8, 14));
      if (hh) {
        const n = contours.flatMap((c) => c.nodes).find((x) => x.id === hh.nodeId);
        if (n) {
          gesture.current = {
            kind: 'handle',
            pre,
            base: contours,
            nodeId: hh.nodeId,
            which: hh.which,
            origin: { x: n.x, y: n.y },
            moved: false,
          };
          return;
        }
      }
      const hn = hitNode(contours, info.world, hitRadius(info.touch, 9, 16));
      if (hn) {
        const node = contours.flatMap((c) => c.nodes).find((x) => x.id === hn.nodeId)!;
        let ids: ReadonlySet<string> = sel;
        let toggleId: string | null = null;
        if (info.shift) {
          if (sel.has(hn.nodeId)) toggleId = hn.nodeId;
          else ids = new Set([...sel, hn.nodeId]);
        } else if (!sel.has(hn.nodeId)) {
          ids = new Set([hn.nodeId]);
        }
        setSelection(ids);
        gesture.current = {
          kind: 'drag',
          pre,
          base: contours,
          ids,
          startWorld: info.world,
          startScreen: info.screen,
          grab: { x: node.x, y: node.y },
          mode: 'point',
          toggleId,
          moved: false,
        };
        return;
      }
      const initial = info.shift ? sel : EMPTY;
      if (!info.shift) setSelection(EMPTY);
      gesture.current = {
        kind: 'marquee',
        pre,
        start: info.world,
        startScreen: info.screen,
        additive: info.shift,
        initial,
        moved: false,
      };
      return;
    }

    // أداة التحريك: تمسك المسار كله من جسمه
    const hc = hitContour(contours, info.world, hitRadius(info.touch, 8, 14));
    if (!hc) {
      if (!info.shift) setSelection(EMPTY);
      return;
    }
    const c = contours.find((x) => x.id === hc)!;
    const ids = new Set(c.nodes.map((n) => n.id));
    if (info.shift) liveSelection().forEach((id) => ids.add(id));
    setSelection(ids);
    gesture.current = {
      kind: 'drag',
      pre,
      base: contours,
      ids,
      startWorld: info.world,
      startScreen: info.screen,
      grab: info.world,
      mode: 'delta',
      toggleId: null,
      moved: false,
    };
  };

  const penDown = (info: PointerInfo) => {
    const m = metricsRef.current;
    const pre = work.current;
    const contours = pre.contours;
    const rEnd = hitRadius(info.touch, 10, 18);
    const pen = penContour();
    const snapped = (anchor?: Vec): Vec => {
      const s = snapPoint(info.world, snapCtx(), info.alt);
      return info.shift && anchor ? constrainAngle(anchor, s) : s;
    };

    if (pen) {
      const first = pen.nodes[0];
      if (dist(info.world, first) <= rEnd) {
        if (pen.nodes.length < 3) {
          flash(MSG.needThree);
          return;
        }
        commit({ contours: closeContour(contours, pen.id) });
        setPenId(null);
        setPreview(null);
        setSelection(EMPTY);
        return;
      }
      if (countNodes(contours) >= LIMITS.maxNodes) {
        flash(MSG.maxNodes);
        return;
      }
      const last = pen.nodes[pen.nodes.length - 1];
      const p = snapped(last);
      if (dist(p, last) < 1) return;
      const node = newNode(p.x, p.y);
      apply({ contours: appendNode(contours, pen.id, node) });
      setSelection(new Set([node.id]));
      gesture.current = {
        kind: 'pen',
        pre,
        base: work.current.contours,
        nodeId: node.id,
        origin: p,
        startScreen: info.screen,
        moved: false,
      };
      return;
    }

    const ep = hitEndpoint(contours, info.world, rEnd);
    if (ep) {
      if (ep.end === 'first') {
        apply({
          contours: contours.map((c) => (c.id === ep.contourId ? reverseContour(c) : c)),
        });
      }
      setPenId(ep.contourId);
      setSelection(new Set([ep.nodeId]));
      return;
    }

    if (contours.length >= LIMITS.maxContours) {
      flash(MSG.maxContours);
      return;
    }
    if (countNodes(contours) >= LIMITS.maxNodes) {
      flash(MSG.maxNodes);
      return;
    }
    const p = snapped();
    const node = newNode(p.x, p.y);
    const added = addContourWithNode(contours, node);
    apply({ contours: added.contours });
    setPenId(added.contourId);
    setSelection(new Set([node.id]));
    void m;
    gesture.current = {
      kind: 'pen',
      pre,
      base: work.current.contours,
      nodeId: node.id,
      origin: p,
      startScreen: info.screen,
      moved: false,
    };
  };

  const resolveHover = (info: PointerInfo): HoverTarget | null => {
    const t = toolRef.current;
    const contours = work.current.contours;
    if (t === 'pen') {
      const pen = penContour();
      const rEnd = hitRadius(info.touch, 10, 18);
      if (pen && pen.nodes.length >= 3 && dist(info.world, pen.nodes[0]) <= rEnd) {
        return { kind: 'first', id: pen.nodes[0].id };
      }
      if (!pen) {
        const ep = hitEndpoint(contours, info.world, rEnd);
        if (ep) return { kind: 'end', id: ep.nodeId };
      }
      return null;
    }
    if (t === 'select') {
      const hh = hitHandle(contours, liveSelection(), info.world, hitRadius(info.touch, 8, 14));
      if (hh) return { kind: 'handle', id: `${hh.nodeId}:${hh.which}` };
      const hn = hitNode(contours, info.world, hitRadius(info.touch, 9, 16));
      return hn ? { kind: 'node', id: hn.nodeId } : null;
    }
    if (t === 'move') {
      const hc = hitContour(contours, info.world, hitRadius(info.touch, 8, 14));
      return hc ? { kind: 'contour', id: hc } : null;
    }
    return null;
  };

  const pointerMove = (info: PointerInfo) => {
    const g = gesture.current;
    const m = metricsRef.current;

    if (g.kind === 'none') {
      if (info.touch) return;
      setHover(resolveHover(info));
      if (toolRef.current === 'pen') {
        const pen = penContour();
        const last = pen?.nodes[pen.nodes.length - 1];
        const s = snapPoint(info.world, snapCtx(), info.alt);
        setSnapMark(s.kind === 'point' || s.kind === 'metric' ? s : null);
        setPreview(
          pen && last
            ? {
                from: { x: last.x, y: last.y },
                fromHandle: last.handleOut,
                to: info.shift ? constrainAngle(last, s) : s,
              }
            : null
        );
      }
      return;
    }

    if (g.kind === 'drag') {
      if (!g.moved && dist(info.screen, g.startScreen) < DRAG_PX) return;
      g.moved = true;
      let dx: number;
      let dy: number;
      if (g.mode === 'point') {
        let target: Vec = {
          x: g.grab.x + (info.world.x - g.startWorld.x),
          y: g.grab.y + (info.world.y - g.startWorld.y),
        };
        if (info.shift) target = constrainAngle(g.grab, target);
        const s = snapPoint(target, snapCtx(g.ids), info.alt);
        const fin = info.shift ? constrainAngle(g.grab, s) : s;
        dx = fin.x - g.grab.x;
        dy = fin.y - g.grab.y;
        setSnapMark(s.kind === 'point' || s.kind === 'metric' ? s : null);
      } else {
        let v: Vec = { x: info.world.x - g.startWorld.x, y: info.world.y - g.startWorld.y };
        if (info.shift) v = constrainAngle({ x: 0, y: 0 }, v);
        const step = effectiveGridStep(settings.current.gridStep, scaleRef.current);
        const useGrid = settings.current.snapGrid && !info.alt;
        dx = useGrid ? Math.round(v.x / step) * step : Math.round(v.x);
        dy = useGrid ? Math.round(v.y / step) * step : Math.round(v.y);
      }
      apply({ contours: moveNodes(g.base, g.ids, dx, dy, m) });
      return;
    }

    if (g.kind === 'handle') {
      let target = info.world;
      const s = snapPoint(target, snapCtx(), info.alt);
      target = info.shift ? constrainAngle(g.origin, s) : s;
      g.moved = true;
      apply({
        contours: setHandle(g.base, g.nodeId, g.which, { x: target.x - g.origin.x, y: target.y - g.origin.y }, m),
      });
      setSnapMark(s.kind === 'point' || s.kind === 'metric' ? s : null);
      return;
    }

    if (g.kind === 'marquee') {
      if (!g.moved && dist(info.screen, g.startScreen) < DRAG_PX) return;
      g.moved = true;
      setMarquee({ a: g.start, b: info.world });
      const inside = nodesInRect(work.current.contours, g.start, info.world);
      setSelection(new Set([...(g.additive ? g.initial : EMPTY), ...inside]));
      return;
    }

    // القلم: سحب بعد الإضافة يصنع مقبضين متماثلين
    if (!g.moved && dist(info.screen, g.startScreen) < PEN_DRAG_PX) return;
    g.moved = true;
    const s = snapPoint(info.world, snapCtx(), info.alt);
    const t = info.shift ? constrainAngle(g.origin, s) : s;
    apply({
      contours: setSymmetricHandles(g.base, g.nodeId, { x: t.x - g.origin.x, y: t.y - g.origin.y }, m),
    });
  };

  const pointerUp = (info: PointerInfo) => {
    const g = gesture.current;
    if (g.kind === 'none') return;
    gesture.current = { kind: 'none' };
    setMarquee(null);
    setSnapMark(null);

    if (g.kind === 'drag' && !g.moved && g.toggleId) {
      const next = new Set(selRef.current);
      next.delete(g.toggleId);
      setSelection(next);
    }
    const changed =
      work.current.contours !== g.pre.contours || work.current.advanceWidth !== g.pre.advanceWidth;
    if (changed) pushHistory(g.pre);
    void info;
  };

  const pointerLeave = () => {
    if (gesture.current.kind !== 'none') return;
    setHover(null);
    setPreview(null);
    setSnapMark(null);
  };

  /* ---------- تراجع وإعادة ---------- */
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    cancelGesture();
    future.current.push(work.current);
    lastKey.current = null;
    apply(prev);
    setPenId(null);
    setPreview(null);
    setSelection(liveSelection());
    syncCounts();
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    cancelGesture();
    past.current.push(work.current);
    lastKey.current = null;
    apply(next);
    setPenId(null);
    setPreview(null);
    setSelection(liveSelection());
    syncCounts();
  };

  /* ---------- أوامر ---------- */
  const targetIds = (): ReadonlySet<string> => {
    const sel = liveSelection();
    return sel.size > 0 ? sel : allNodeIds(work.current.contours);
  };

  const selectAll = () => {
    setSelection(allNodeIds(work.current.contours));
  };

  const clearSelection = () => setSelection(EMPTY);

  const deleteSelection = () => {
    const sel = liveSelection();
    if (sel.size === 0) {
      flash(MSG.needSelection);
      return;
    }
    const wasPen = penContour();
    commit({ contours: deleteNodes(work.current.contours, sel) });
    if (wasPen && !penContour()) setPenId(null);
    setSelection(EMPTY);
  };

  const nudge = (dx: number, dy: number) => {
    const sel = liveSelection();
    if (sel.size === 0) return;
    const next = moveNodes(work.current.contours, sel, dx, dy, metricsRef.current);
    if (next === work.current.contours) return;
    commit({ contours: next }, 'nudge');
  };

  const runTransform = (fn: (p: Vec) => Vec, mirrored: boolean) => {
    const ids = targetIds();
    if (ids.size === 0) {
      flash(MSG.noDrawing);
      return;
    }
    const next = transformNodes(work.current.contours, ids, fn, mirrored, metricsRef.current);
    if (!next) {
      flash(MSG.outOfRange);
      return;
    }
    commit({ contours: next });
  };

  const center = () => {
    const b = boundsOf(work.current.contours, liveSelection());
    return b ? { cx: (b.xMin + b.xMax) / 2, cy: (b.yMin + b.yMax) / 2 } : null;
  };

  const flip = (axis: 'h' | 'v') => {
    const c = center();
    if (!c) return flash(MSG.noDrawing);
    runTransform(axis === 'h' ? flipHFn(c.cx) : flipVFn(c.cy), true);
  };

  /** deg موجبة = عكس عقارب الساعة. */
  const rotate = (deg: number) => {
    const c = center();
    if (!c) return flash(MSG.noDrawing);
    runTransform(rotateFn(c.cx, c.cy, deg), false);
  };

  const scaleBy = (k: number) => {
    const c = center();
    if (!c) return flash(MSG.noDrawing);
    runTransform(scaleFn(c.cx, c.cy, k), false);
  };

  const nodeOp = (fn: (c: Contour[], ids: ReadonlySet<string>) => Contour[]) => {
    const sel = liveSelection();
    if (sel.size === 0) return flash(MSG.needSelection);
    commit({ contours: fn(work.current.contours, sel) });
  };

  const smooth = () => nodeOp(smoothNodes);
  const corner = () => nodeOp(cornerNodes);
  const autoSmooth = () => nodeOp((c, ids) => autoSmoothNodes(c, ids, metricsRef.current));

  const reverse = () => {
    if (work.current.contours.length === 0) return flash(MSG.noDrawing);
    commit({ contours: reverseContours(work.current.contours, liveSelection()) });
  };

  const setAdvance = (v: number) => {
    const next = clampAdvance(v, metricsRef.current);
    if (next === work.current.advanceWidth) return;
    commit({ advanceWidth: next });
  };

  const applySnapshot = (s: Snapshot | null) => {
    if (!s) return flash(MSG.badMetric);
    commit(s);
  };
  const changeLsb = (v: number) => applySnapshot(setLsb(work.current, v, metricsRef.current));
  const changeRsb = (v: number) => applySnapshot(setRsb(work.current, v, metricsRef.current));
  const centerGlyph = () => applySnapshot(centerInAdvance(work.current, metricsRef.current));

  /* ---------- تبديل المحرف ---------- */
  useEffect(() => {
    past.current = [];
    future.current = [];
    lastKey.current = null;
    gesture.current = { kind: 'none' };
    penRef.current = null;
    selRef.current = EMPTY;
    setPenIdState(null);
    setSelectionState(EMPTY);
    setPreview(null);
    setMarquee(null);
    setSnapMark(null);
    setHover(null);
    setCounts({ past: 0, future: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph.id]);

  /* ---------- لوحة المفاتيح ---------- */
  const latest = useRef({
    undo, redo, selectAll, clearSelection, deleteSelection, nudge, setTool, finishPen,
  });
  latest.current = { undo, redo, selectAll, clearSelection, deleteSelection, nudge, setTool, finishPen };

  useEffect(() => {
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const onButton = (t: EventTarget | null) => t instanceof HTMLElement && t.tagName === 'BUTTON';

    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const L = latest.current;
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        if (e.code === 'KeyZ') {
          e.preventDefault();
          if (e.shiftKey) L.redo();
          else L.undo();
        } else if (e.code === 'KeyY') {
          e.preventDefault();
          L.redo();
        } else if (e.code === 'KeyA') {
          e.preventDefault();
          L.selectAll();
        }
        return;
      }
      if (e.altKey) return;

      switch (e.code) {
        case 'Space':
          if (!onButton(e.target)) {
            e.preventDefault();
            setSpaceHeld(true);
          }
          return;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          L.deleteSelection();
          return;
        case 'Escape':
          if (document.querySelector('[role="menu"]')) return;
          if (penRef.current) L.finishPen();
          else L.clearSelection();
          return;
        case 'Enter':
          if (!onButton(e.target) && penRef.current) L.finishPen();
          return;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          const step = e.shiftKey ? 10 : 1;
          const dx = e.code === 'ArrowLeft' ? -step : e.code === 'ArrowRight' ? step : 0;
          const dy = e.code === 'ArrowDown' ? -step : e.code === 'ArrowUp' ? step : 0;
          e.preventDefault();
          L.nudge(dx, dy);
          return;
        }
        case 'KeyV':
          L.setTool('select');
          return;
        case 'KeyM':
          L.setTool('move');
          return;
        case 'KeyP':
          L.setTool('pen');
          return;
        case 'KeyH':
          L.setTool('hand');
          return;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    const blur = () => setSpaceHeld(false);

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  /* ---------- قيم للواجهة ---------- */
  const liveIds = useMemo(() => allNodeIds(glyph.contours), [glyph.contours]);
  const shownSelection = useMemo(() => {
    const out = new Set<string>();
    selection.forEach((id) => {
      if (liveIds.has(id)) out.add(id);
    });
    return out as ReadonlySet<string>;
  }, [selection, liveIds]);

  const activePen = penId ? glyph.contours.find((c) => c.id === penId) ?? null : null;
  const handleNodeIds = useMemo(() => {
    const out = new Set<string>(shownSelection);
    if (activePen) out.add(activePen.nodes[activePen.nodes.length - 1].id);
    return out as ReadonlySet<string>;
  }, [shownSelection, activePen]);

  return {
    tool,
    setTool,
    selection: shownSelection,
    handleNodeIds,
    penContourId: activePen ? activePen.id : null,
    marquee,
    preview,
    snapMark,
    hover,
    notice,
    spaceHeld,
    canUndo: counts.past > 0,
    canRedo: counts.future > 0,
    settings: { gridStep, snapGrid, snapPoints },
    setGridStep,
    setSnapGrid,
    setSnapPoints,
    pointerDown,
    pointerMove,
    pointerUp,
    pointerLeave,
    cancelGesture,
    undo,
    redo,
    selectAll,
    clearSelection,
    deleteSelection,
    finishPen,
    flip,
    rotate,
    scaleBy,
    smooth,
    corner,
    autoSmooth,
    reverse,
    setAdvance,
    changeLsb,
    changeRsb,
    centerGlyph,
  };
}

export type StudioEditor = ReturnType<typeof useStudioEditor>;
```

---

## الأمر 7: `src/components/studio/StudioCanvas.tsx`

اللوحة: تحويل أحداث المؤشر إلى أوامر، ورسم التحديد والمقابض ومعاينة القلم ومؤشرات الالتصاق.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
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
```

---

## الأمر 8: `src/components/studio/StudioScreen.tsx`

الشريطان وكل القوائم موصولة بالمحرك. لا يبقى زر باهت في الاستوديو.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Eye,
  FlipHorizontal2,
  FlipVertical2,
  Hand,
  Maximize,
  MousePointer2,
  Move,
  PenTool,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Settings2,
  Shapes,
  Spline,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { type FontProject, type Glyph } from '../../types/font';
import { boundsOf } from '../../utils/pathEdit';
import { FORM_LABEL } from '../../utils/labels';
import { Button } from '../ui/Button';
import { BarDivider, DragScroll } from '../ui/DragScroll';
import { Dropdown, MenuDivider, MenuItem, MenuLabel } from '../ui/Dropdown';
import { GlyphThumb } from '../GlyphThumb';
import { StudioCanvas, type ViewOptions } from './StudioCanvas';
import { useStudioEditor, type ToolId } from './useStudioEditor';
import { useViewport } from './useViewport';

interface StudioScreenProps {
  project: FontProject;
  glyph: Glyph;
  onSelectGlyph: (glyphId: string) => void;
  onUpdateGlyph: (updater: (g: Glyph) => Glyph) => void;
  onBack: () => void;
}

const GRID_STEPS = [10, 25, 50, 100];
const ZOOM_PRESETS = [25, 50, 100, 200];

const icon = 'h-4 w-4 stroke-[1.5]';

const TOOLS: Array<{ id: ToolId; label: string; key: string; Icon: typeof PenTool }> = [
  { id: 'select', label: 'تحديد', key: 'V', Icon: MousePointer2 },
  { id: 'move', label: 'تحريك', key: 'M', Icon: Move },
  { id: 'pen', label: 'قلم', key: 'P', Icon: PenTool },
  { id: 'hand', label: 'اللوحة', key: 'H', Icon: Hand },
];

/** حقل رقمي داخل القائمة: يُطبَّق عند Enter أو مغادرة الحقل، وإن كانت القيمة غير صالحة يرجع القديم. */
const NumberRow: React.FC<{
  label: string;
  value: number | null;
  onCommit: (n: number) => void;
}> = ({ label, value, onCommit }) => (
  <label className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-xs">
    <span>{label}</span>
    <input
      key={value ?? 'none'}
      dir="ltr"
      inputMode="numeric"
      disabled={value === null}
      defaultValue={value ?? ''}
      style={{ width: 96, height: 32 }}
      className="field text-center font-mono"
      onBlur={(e) => {
        const raw = e.currentTarget.value.trim();
        const n = Number(raw);
        if (value !== null && raw !== '' && Number.isFinite(n) && n !== value) onCommit(n);
        else e.currentTarget.value = value === null ? '' : String(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  </label>
);

/*
  ترتيب الاستوديو:
  - الشريط العلوي: التنقل ثم الأدوات ثم مجموعات الميزات (كل مجموعة داخل زر منسدل).
  - اللوحة في الوسط.
  - الشريط السفلي: التكبير ثم التراجع ثم حالة المحرف.
  كل شريط بسطر واحد قابل للسحب، والقوائم تنزل من الزر نفسه.
*/
export const StudioScreen: React.FC<StudioScreenProps> = ({
  project,
  glyph,
  onSelectGlyph,
  onUpdateGlyph,
  onBack,
}) => {
  const { metrics } = project;

  const [options, setOptions] = useState<ViewOptions>({
    grid: true,
    metrics: true,
    nodes: true,
    anchors: true,
  });
  const toggle = (key: keyof ViewOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  // الصندوق الذي تُحسب منه الملاءمة: العرض الكامل أفقياً والمقاييس رأسياً
  const bounds = useMemo(() => boundsOf(glyph.contours), [glyph.contours]);
  const fitBox = useMemo(
    () => ({
      xMin: Math.min(0, bounds?.xMin ?? 0),
      xMax: Math.max(glyph.advanceWidth, bounds?.xMax ?? 0),
      yMin: metrics.descender,
      yMax: metrics.ascender,
    }),
    [bounds, glyph.advanceWidth, metrics.ascender, metrics.descender]
  );

  // من يملك المؤشر الواحد: اللوحة (تحريك) أم الأداة. يضبطه الكانفاس عند كل ضغطة.
  const panMode = useRef(false);
  const viewport = useViewport({ fitBox, fitKey: glyph.id, shouldPan: () => panMode.current });
  const editor = useStudioEditor({
    glyph,
    metrics,
    scale: viewport.view.scale,
    onUpdateGlyph,
  });

  const nodeCount = glyph.contours.reduce((sum, c) => sum + c.nodes.length, 0);
  const pathState =
    glyph.contours.length === 0 ? '—' : glyph.contours.every((c) => c.closed) ? 'مغلق' : 'مفتوح';

  const hasSelection = editor.selection.size > 0;
  const hasDrawing = glyph.contours.length > 0;
  const lsb = bounds ? Math.round(bounds.xMin) : null;
  const rsb = bounds ? glyph.advanceWidth - Math.round(bounds.xMax) : null;
  const target = hasSelection ? 'على المحدد' : 'على المحرف كله';

  return (
    <div className="fixed inset-0 z-40 flex flex-col gap-2 bg-paper-deep p-2 sm:gap-3 sm:p-3">
      {/* الشريط العلوي */}
      <DragScroll label="الشريط العلوي" className="glass-panel shrink-0 rounded-2xl">
        <Button variant="quiet" icon title="الرجوع إلى المشروع" onClick={onBack}>
          <ArrowRight className={icon} />
        </Button>

        <Dropdown
          label={glyph.name}
          labelOnMobile
          width={340}
          placement="bottom"
          icon={<span className="font-heading text-lg leading-none">{glyph.char}</span>}
        >
          {(close) => (
            <>
              <MenuLabel>اختر المحرف</MenuLabel>
              <div className="grid grid-cols-4 gap-1 p-1">
                {project.glyphs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    title={g.name}
                    onClick={() => {
                      onSelectGlyph(g.id);
                      close();
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
                      g.id === glyph.id ? 'bg-sand/60 ring-1 ring-ink' : 'hover:bg-sand/40'
                    }`}
                  >
                    <GlyphThumb glyph={g} metrics={metrics} className="h-10 w-full" />
                    <span className="max-w-full truncate font-mono text-[10px]">{g.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Dropdown>

        <BarDivider />

        {TOOLS.map(({ id, label, key, Icon }) => (
          <Button
            key={id}
            variant="quiet"
            active={editor.tool === id}
            title={`${label} (${key})`}
            onClick={() => editor.setTool(id)}
          >
            <Icon className={icon} />
            <span className="hidden md:inline">{label}</span>
          </Button>
        ))}

        <BarDivider />

        <Button
          variant="quiet"
          icon
          title="حذف المحدد (Delete)"
          disabled={!hasSelection}
          onClick={editor.deleteSelection}
        >
          <Trash2 className={icon} />
        </Button>
        {editor.penContourId && (
          <Button variant="secondary" title="إنهاء المسار (Enter)" onClick={editor.finishPen}>
            <Check className={icon} />
            <span>إنهاء المسار</span>
          </Button>
        )}

        <BarDivider />

        <Dropdown label="عرض" icon={<Eye className={icon} />} placement="bottom">
          {() => (
            <>
              <MenuLabel>إظهار على اللوحة</MenuLabel>
              <MenuItem label="الشبكة" active={options.grid} onClick={() => toggle('grid')} />
              <MenuItem label="خطوط المقاييس" active={options.metrics} onClick={() => toggle('metrics')} />
              <MenuItem label="النقاط والمقابض" active={options.nodes} onClick={() => toggle('nodes')} />
              <MenuItem label="نقاط الارتكاز" active={options.anchors} onClick={() => toggle('anchors')} />
            </>
          )}
        </Dropdown>

        <Dropdown label="المقاييس" icon={<Ruler className={icon} />} placement="bottom" width={300}>
          {(close) => (
            <>
              <MenuLabel>العرض والعارضان (بوحدات الخط)</MenuLabel>
              <NumberRow label="العرض الكامل" value={glyph.advanceWidth} onCommit={editor.setAdvance} />
              <NumberRow label="العارض الأيسر" value={lsb} onCommit={editor.changeLsb} />
              <NumberRow label="العارض الأيمن" value={rsb} onCommit={editor.changeRsb} />
              <MenuDivider />
              <MenuItem
                label="توسيط الرسم داخل العرض"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.centerGlyph();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Dropdown label="تحويل" icon={<Shapes className={icon} />} placement="bottom">
          {(close) => (
            <>
              <MenuLabel>يُطبَّق {target}</MenuLabel>
              <MenuItem
                label="قلب أفقي"
                icon={<FlipHorizontal2 className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.flip('h');
                  close();
                }}
              />
              <MenuItem
                label="قلب رأسي"
                icon={<FlipVertical2 className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.flip('v');
                  close();
                }}
              />
              <MenuItem
                label="تدوير 90° يميناً"
                icon={<RotateCw className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.rotate(-90);
                  close();
                }}
              />
              <MenuItem
                label="تدوير 90° يساراً"
                icon={<RotateCcw className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.rotate(90);
                  close();
                }}
              />
              <MenuDivider />
              <MenuItem
                label="تكبير 10%"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.scaleBy(1.1);
                  close();
                }}
              />
              <MenuItem
                label="تصغير 10%"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.scaleBy(1 / 1.1);
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Dropdown label="المسار" icon={<Spline className={icon} />} placement="bottom">
          {(close) => (
            <>
              <MenuLabel>نوع النقطة (للمحدد)</MenuLabel>
              <MenuItem
                label="ربط المقابض (ناعمة)"
                disabled={!hasSelection}
                onClick={() => {
                  editor.smooth();
                  close();
                }}
              />
              <MenuItem
                label="كسر المقابض (زاوية)"
                disabled={!hasSelection}
                onClick={() => {
                  editor.corner();
                  close();
                }}
              />
              <MenuItem
                label="تنعيم تلقائي"
                disabled={!hasSelection}
                onClick={() => {
                  editor.autoSmooth();
                  close();
                }}
              />
              <MenuDivider />
              <MenuItem
                label="عكس اتجاه المسار"
                hint={hasSelection ? 'المحدد' : 'الكل'}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.reverse();
                  close();
                }}
              />
              <MenuItem
                label="تحديد الكل"
                hint="Ctrl+A"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.selectAll();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Dropdown label="الإعدادات" icon={<Settings2 className={icon} />} placement="bottom">
          {() => (
            <>
              <MenuLabel>حجم الشبكة (وحدة خط)</MenuLabel>
              {GRID_STEPS.map((step) => (
                <MenuItem
                  key={step}
                  label={String(step)}
                  active={editor.settings.gridStep === step}
                  onClick={() => editor.setGridStep(step)}
                />
              ))}
              <MenuDivider />
              <MenuItem
                label="الالتصاق بالشبكة"
                active={editor.settings.snapGrid}
                onClick={() => editor.setSnapGrid(!editor.settings.snapGrid)}
              />
              <MenuItem
                label="الالتصاق بالنقاط والمقاييس"
                active={editor.settings.snapPoints}
                onClick={() => editor.setSnapPoints(!editor.settings.snapPoints)}
              />
              <MenuLabel>Shift لتقييد الاتجاه، وAlt لتعطيل الالتصاق مؤقتاً.</MenuLabel>
            </>
          )}
        </Dropdown>
      </DragScroll>

      {/* اللوحة */}
      <main className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink/25 bg-canvas shadow-sm">
        <StudioCanvas
          glyph={glyph}
          metrics={metrics}
          viewport={viewport}
          options={options}
          editor={editor}
          panMode={panMode}
        />
        {editor.notice && (
          <div
            role="status"
            className="glass-panel pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto w-fit max-w-[90%] rounded-xl px-4 py-2 text-xs"
          >
            {editor.notice}
          </div>
        )}
      </main>

      {/* الشريط السفلي */}
      <DragScroll label="الشريط السفلي" className="glass-panel shrink-0 rounded-2xl">
        <Button variant="quiet" icon title="تصغير" onClick={viewport.zoomOut}>
          <ZoomOut className={icon} />
        </Button>

        <Dropdown label={`${viewport.percent}%`} labelOnMobile width={180} placement="top">
          {(close) => (
            <>
              <MenuLabel>مستوى التكبير</MenuLabel>
              {ZOOM_PRESETS.map((p) => (
                <MenuItem
                  key={p}
                  label={`${p}%`}
                  active={viewport.percent === p}
                  onClick={() => {
                    viewport.zoomTo(p);
                    close();
                  }}
                />
              ))}
              <MenuDivider />
              <MenuItem
                label="ملاءمة المحرف للشاشة"
                onClick={() => {
                  viewport.fit();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Button variant="quiet" icon title="تكبير" onClick={viewport.zoomIn}>
          <ZoomIn className={icon} />
        </Button>
        <Button variant="quiet" icon title="ملاءمة المحرف للشاشة" onClick={viewport.fit}>
          <Maximize className={icon} />
        </Button>

        <BarDivider />

        <Button variant="quiet" icon title="تراجع (Ctrl+Z)" disabled={!editor.canUndo} onClick={editor.undo}>
          <Undo2 className={icon} />
        </Button>
        <Button variant="quiet" icon title="إعادة (Ctrl+Shift+Z)" disabled={!editor.canRedo} onClick={editor.redo}>
          <Redo2 className={icon} />
        </Button>

        <BarDivider />

        <div className="flex shrink-0 items-center gap-3 whitespace-nowrap px-2 text-xs text-ink-soft">
          <span>
            نقاط <span className="font-mono text-ink">{nodeCount}</span>
          </span>
          <span>
            محدد <span className="font-mono text-ink">{editor.selection.size}</span>
          </span>
          <span>
            مسارات <span className="font-mono text-ink">{glyph.contours.length}</span>
          </span>
          <span>
            الحالة <span className="text-ink">{pathState}</span>
          </span>
          <span className="h-4 w-px bg-ink/20" />
          <span className="font-mono text-ink">{glyph.name}</span>
          <span>{FORM_LABEL[glyph.form]}</span>
        </div>
      </DragScroll>
    </div>
  );
};
```

---

## التحقق (آخر خطوة)

1. شغّل `npm test`. يجب أن ينجح 34 اختباراً وتفشل صفر.
2. شغّل `npm run lint`. يجب ألا يظهر أي خطأ. إن ظهر شيء انسخه لي كما هو ولا تصلحه.
3. شغّل `npm run build`. يجب أن ينجح.
4. أرسل لي النتيجة فقط. اختبار الاستوديو باليد أنا من يطلبه منك بعد ذلك، لا تفعله.
