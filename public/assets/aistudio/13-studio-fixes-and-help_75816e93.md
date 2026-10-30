# الدفعة 13: إصلاحات الاستوديو + وضع التعليمات + كتاب التعليمات

نفّذ بالحرف. لكل ملف في الأسفل: أنشئ الملف أو استبدل محتواه كاملاً بالكود الموجود تحت اسمه، ثم نفّذ الخطوة الأخيرة (إضافة في آخر ملف pathEdit.ts).
لا تشغّل المشروع قبل إنهاء كل الملفات.

## الخطوة 1: أضف هذا الكود في آخر الملف src/utils/pathEdit.ts (بعد آخر سطر فيه، دون حذف شيء)

```ts
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
```

## الخطوة 2: الملف src/utils/pathEdit2.test.ts (استبدل محتواه كاملاً أو أنشئه)

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { type Contour, type FontMetrics, type PathNode } from '../types/font';
import {
  boundsOf,
  boundsOfTouched,
  closeContours,
  containmentDepth,
  distToPolyline,
  duplicateContours,
  fixDirections,
  flattenContour,
  flipHFn,
  flipVFn,
  insertNodeOnSegment,
  isCounterClockwise,
  nearestOnContours,
  openContourAt,
  pointInPolygon,
  rotateFn,
  signedArea,
  transformNodes,
  wholeContourIds,
  wrongDirectionCount,
} from './pathEdit';

const M: FontMetrics = { upm: 1000, ascender: 800, capHeight: 700, xHeight: 500, descender: -200 };
const node = (
  id: string, x: number, y: number,
  handleIn: PathNode['handleIn'] = null, handleOut: PathNode['handleOut'] = null,
  kind: PathNode['kind'] = 'corner'
): PathNode => ({ id, x, y, kind, handleIn, handleOut });

// دائرة تقريبية بأربع نقاط ناعمة، عكس عقارب الساعة
const blob = (id = 'blob', ox = 0, oy = 0, r = 200): Contour => {
  const k = Math.round(r * 0.552);
  return {
    id,
    closed: true,
    nodes: [
      node(id + 'r', ox + r, oy, { x: 0, y: -k }, { x: 0, y: k }, 'smooth'),
      node(id + 't', ox, oy + r, { x: k, y: 0 }, { x: -k, y: 0 }, 'smooth'),
      node(id + 'l', ox - r, oy, { x: 0, y: k }, { x: 0, y: -k }, 'smooth'),
      node(id + 'b', ox, oy - r, { x: -k, y: 0 }, { x: k, y: 0 }, 'smooth'),
    ],
  };
};
// شكل غير متماثل ببعض المنحنيات
const odd = (): Contour => ({
  id: 'odd',
  closed: true,
  nodes: [
    node('a', 100, 0),
    node('b', 400, 0, null, { x: 80, y: 40 }),
    node('c', 420, 300, { x: 0, y: -90 }, null),
    node('d', 250, 520),
    node('e', 100, 300, null, null),
  ],
});

test('flip keeps the shape: sample points map and area sign is preserved', () => {
  for (const [name, fn] of [['v', flipVFn(260)], ['h', flipHFn(260)]] as const) {
    const c = odd();
    const ids = wholeContourIds([c], new Set(['a']));
    assert.equal(ids.size, 5, name);
    const r = transformNodes([c], ids, fn, true, M);
    assert.ok(r, name);
    const poly = flattenContour(c);
    const flipped = flattenContour(r[0]);
    for (const p of [{ x: 250, y: 200 }, { x: 300, y: 100 }, { x: 150, y: 150 }]) {
      assert.equal(pointInPolygon(p, poly), true);
      assert.equal(pointInPolygon(fn(p), flipped), true, name);
    }
    assert.equal(pointInPolygon(fn({ x: 600, y: 600 }), flipped), false, name);
    assert.ok(Math.abs(Math.abs(signedArea(r[0])) - Math.abs(signedArea(c))) < 400, name);
    assert.equal(isCounterClockwise(r[0]), isCounterClockwise(c), name);
    const b0 = boundsOf([c])!;
    const b1 = boundsOf(r)!;
    if (name === 'v') {
      assert.ok(Math.abs(b1.yMin - (520 - b0.yMax)) <= 2);
    } else {
      assert.ok(Math.abs(b1.xMin - (520 - b0.xMax)) <= 2);
    }
  }
});

test('flip twice gives back the original geometry (curves)', () => {
  const c = blob();
  const f1 = transformNodes([c], wholeContourIds([c], new Set(['blobr'])), flipVFn(0), true, M)!;
  const f2 = transformNodes(f1, wholeContourIds(f1, new Set(['blobr'])), flipVFn(0), true, M)!;
  const a = flattenContour(c);
  const b = flattenContour(f2[0]);
  assert.equal(a.length, b.length);
  const near = (p: { x: number; y: number }) => Math.min(...b.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
  assert.ok(a.every((p) => near(p) < 1.5));
});

test('rotate 90 on a whole curved contour keeps size and area', () => {
  const c = odd();
  const b0 = boundsOfTouched([c], new Set(['a']))!;
  const cx = (b0.xMin + b0.xMax) / 2;
  const cy = (b0.yMin + b0.yMax) / 2;
  const r = transformNodes([c], wholeContourIds([c], new Set(['a'])), rotateFn(cx, cy, 90), false, M)!;
  assert.ok(Math.abs(Math.abs(signedArea(r[0])) - Math.abs(signedArea(c))) < 600);
  assert.equal(isCounterClockwise(r[0]), isCounterClockwise(c));
});

test('direction: outer CCW, hole CW, fixDirections repairs', () => {
  const outer = blob('o', 0, 0, 300);
  const hole = blob('h', 0, 0, 100);
  assert.equal(isCounterClockwise(outer), true);
  assert.equal(containmentDepth([outer, hole], hole), 1);
  assert.equal(containmentDepth([outer, hole], outer), 0);
  assert.equal(wrongDirectionCount([outer, hole]), 1); // الثقب بنفس اتجاه الخارجي
  const fixed = fixDirections([outer, hole]);
  assert.equal(isCounterClockwise(fixed[0]), true);
  assert.equal(isCounterClockwise(fixed[1]), false);
  assert.equal(fixDirections(fixed), fixed);
  assert.equal(wrongDirectionCount(fixed), 0);
});

test('insertNodeOnSegment keeps the curve and the line identical, also on the closing segment', () => {
  const c = odd();
  const before = flattenContour(c, 64);
  const near = (pts: { x: number; y: number }[], p: { x: number; y: number }) =>
    distToPolyline(p, pts, true);
  for (const index of [0, 1, 4]) {
    const res = insertNodeOnSegment([c], 'odd', index, 0.5)!;
    assert.ok(res);
    assert.equal(res.contours[0].nodes.length, 6);
    assert.equal(res.contours[0].nodes[index + 1].id, res.nodeId);
    const after = flattenContour(res.contours[0], 64);
    assert.ok(after.every((p) => near(before, p) < 3), `index ${index}`);
    assert.ok(before.every((p) => near(after, p) < 3), `index ${index}`);
  }
  const open: Contour = { id: 'op', closed: false, nodes: [node('a', 0, 0), node('b', 100, 0)] };
  assert.ok(insertNodeOnSegment([open], 'op', 0, 0.5));
  assert.equal(insertNodeOnSegment([open], 'op', 1, 0.5), null);
});

test('nearestOnContours finds segment and parameter, including closing segment', () => {
  const c = odd();
  const hit = nearestOnContours([c], { x: 100, y: 150 }, 10)!;
  assert.ok(hit);
  assert.equal(hit.index, 4); // e→a
  assert.ok(hit.t > 0.2 && hit.t < 0.8);
  assert.equal(nearestOnContours([c], { x: 900, y: 900 }, 10), null);
  const curve = nearestOnContours([c], { x: 480, y: 120 }, 80)!;
  assert.ok(curve && curve.index === 1);
});

test('close, open and duplicate', () => {
  const open: Contour = { id: 'o', closed: false, nodes: [node('a', 0, 0), node('b', 100, 0), node('c', 100, 100)] };
  const closed = closeContours([open], new Set(['b']));
  assert.equal(closed[0].closed, true);
  assert.equal(closeContours([open], new Set(['zzz']))[0].closed, false);
  const reopened = openContourAt(closed, 'b');
  assert.equal(reopened[0].closed, false);
  assert.deepEqual(reopened[0].nodes.map((n) => n.id), ['c', 'a', 'b']);

  const d = duplicateContours([open], new Set(), 40, -40, M)!;
  assert.equal(d.contours.length, 2);
  assert.equal(d.newIds.size, 3);
  assert.notEqual(d.contours[1].id, 'o');
  assert.equal(d.contours[1].nodes[0].x, 40);
  assert.equal(duplicateContours([open], new Set(), 99999, 0, M), null);
});

```

## الخطوة 3: الملف src/components/help/HelpContext.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React, { createContext, useContext, useMemo, useState } from 'react';

/*
  حالة وضع التعليمات. تعيش داخل الاستوديو فقط (المزوّد يُركَّب في StudioScreen)،
  فإذا غادر المستخدم الاستوديو زالت الحالة كلها وانتهى الوضع تلقائياً.
  خارج المزوّد تكون القيمة الافتراضية "مطفأ" فلا يتأثر أي زر آخر في الموقع.
*/

export interface HelpState {
  on: boolean;
  topicId: string | null;
  setOn: (v: boolean) => void;
  show: (id: string | null) => void;
}

const OFF: HelpState = { on: false, topicId: null, setOn: () => {}, show: () => {} };

const HelpContext = createContext<HelpState>(OFF);

export const useHelp = () => useContext(HelpContext);

export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [on, setOnState] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(null);

  const value = useMemo<HelpState>(
    () => ({
      on,
      topicId,
      setOn: (v) => {
        setOnState(v);
        setTopicId(null);
      },
      show: (id) => setTopicId(id),
    }),
    [on, topicId]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
};

```

## الخطوة 4: الملف src/components/help/HelpBook.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React, { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { BOOK } from '../../help/helpBook';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

/** كتاب التعليمات لكامل الموقع: أقسام وبحث. */
export const HelpBook: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [section, setSection] = useState(BOOK[0].id);
  const [query, setQuery] = useState('');
  const q = query.trim();

  const results = useMemo(() => {
    if (!q) return null;
    return BOOK.flatMap((s) =>
      s.items.filter((i) => i.h.includes(q) || i.p.includes(q)).map((i) => ({ ...i, section: s.title }))
    );
  }, [q]);

  const current = BOOK.find((s) => s.id === section) ?? BOOK[0];

  return (
    <Modal
      title="كتاب التعليمات"
      subtitle="شرح مختصر لكل ما في الموقع"
      icon={<BookOpen className="h-4 w-4 stroke-[1.5]" />}
      size="xl"
      onClose={onClose}
    >
      <div className="mt-4 space-y-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-ink-soft" />
          <input
            className="field w-full pr-9"
            placeholder="ابحث في الكتاب"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {!results && (
          <div className="flex flex-wrap gap-1.5">
            {BOOK.map((s) => (
              <Button
                key={s.id}
                variant="quiet"
                active={s.id === current.id}
                onClick={() => setSection(s.id)}
              >
                {s.title}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {results
            ? results.length === 0
              ? <p className="text-sm text-ink-soft">لا نتائج لهذا البحث.</p>
              : results.map((i) => (
                  <article key={i.section + i.h}>
                    <p className="text-[11px] text-ink-soft">{i.section}</p>
                    <h3 className="text-sm">{i.h}</h3>
                    <p className="mt-1 text-sm leading-7 text-ink-soft">{i.p}</p>
                  </article>
                ))
            : current.items.map((i) => (
                <article key={i.h}>
                  <h3 className="text-sm">{i.h}</h3>
                  <p className="mt-1 text-sm leading-7 text-ink-soft">{i.p}</p>
                </article>
              ))}
        </div>
      </div>
    </Modal>
  );
};

/** زر يفتح كتاب التعليمات. يُوضع في رأس أي صفحة. */
export const HelpBookButton: React.FC<{ variant?: 'secondary' | 'quiet' }> = ({ variant = 'secondary' }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} title="كتاب التعليمات" onClick={() => setOpen(true)}>
        <BookOpen className="h-3.5 w-3.5 stroke-[1.5]" />
        <span>كتاب التعليمات</span>
      </Button>
      {open && <HelpBook onClose={() => setOpen(false)} />}
    </>
  );
};

```

## الخطوة 5: الملف src/components/help/HelpPanel.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { STUDIO_HELP } from '../../help/studioHelp';
import { useHelp } from './HelpContext';

/** بطاقة الشرح العائمة في وضع التعليمات. */
export const HelpPanel: React.FC<{ onOpenBook: () => void }> = ({ onOpenBook }) => {
  const help = useHelp();
  if (!help.on) return null;
  const topic = STUDIO_HELP[help.topicId ?? 'intro'] ?? STUDIO_HELP.intro;

  return (
    <div
      data-help-panel
      role="status"
      className="glass-panel animate-dropdown-slide absolute inset-x-3 bottom-3 z-20 mx-auto max-h-[45%] w-full max-w-xl overflow-y-auto rounded-2xl p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm">{topic.title}</h3>
        <button
          type="button"
          title="إغلاق الشرح"
          className="btn btn-quiet btn-icon shrink-0"
          onClick={() => help.show(null)}
        >
          <X className="h-4 w-4 stroke-[1.5]" />
        </button>
      </div>
      <div className="mt-2 space-y-2 text-xs leading-6 text-ink-soft">
        {topic.body.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      {topic.keys && (
        <p className="mt-2 text-[11px] text-ink-soft">
          الاختصار: <span dir="ltr" className="font-mono text-ink">{topic.keys}</span>
        </p>
      )}
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
        onClick={onOpenBook}
      >
        <BookOpen className="h-3.5 w-3.5 stroke-[1.5]" />
        افتح كتاب التعليمات
      </button>
    </div>
  );
};

```

## الخطوة 6: الملف src/help/studioHelp.ts (استبدل محتواه كاملاً أو أنشئه)

```ts
/*
  شروح وضع التعليمات في الاستوديو. المفتاح هو helpId الموضوع على الزر أو العنصر.
  لإضافة شرح لزر جديد: ضع helpId عليه وأضف سطراً هنا.
*/

export interface HelpTopic {
  title: string;
  body: string[];
  keys?: string;
}

export const STUDIO_HELP: Record<string, HelpTopic> = {
  intro: {
    title: 'وضع التعليمات',
    body: [
      'اضغط أي زر أو عنصر في الاستوديو ليشرح نفسه بدل أن ينفّذ. لا يتغير شيء في المحرف.',
      'الأزرار التي تفتح قوائم: الضغطة الأولى تشرحها، والثانية تفتح قائمتها، ثم اضغط أي عنصر فيها لتقرأ تعليماته.',
      'عملك الجاري محفوظ كما هو: المسار الذي ترسمه بالقلم والتحديد والأداة المختارة. عند إطفاء الوضع تكمل من حيث توقفت.',
      'يُطفأ الوضع تلقائياً عند مغادرة الاستوديو.',
    ],
  },
  helpToggle: {
    title: 'زر التعليمات',
    body: ['يشغّل وضع التعليمات ويطفئه. اضغطه الآن لتعود إلى العمل العادي.'],
    keys: 'Esc يغلق الشرح ثم يطفئ الوضع',
  },
  canvas: {
    title: 'لوحة الرسم',
    body: [
      'هنا ترسم المحرف. الخطوط المتقطعة هي خطوط المقاييس: خط الأساس والارتفاعات والصاعد والهابط، والخطان العموديان يحدّان عرض المحرف.',
      'الشبكة والنقاط تلتصق بها النقاط الجديدة. اضغط Alt أثناء الرسم لتعطيل الالتصاق مؤقتاً، وShift لتقييد الاتجاه أفقياً أو رأسياً أو بزاوية 45 درجة.',
      'التكبير بعجلة الفأرة أو بإصبعين. لتحريك اللوحة: أداة اللوحة، أو مفتاح المسافة، أو الزر الأوسط للفأرة.',
    ],
  },
  back: {
    title: 'الرجوع إلى المشروع',
    body: ['يغادر الاستوديو ويعود إلى صفحة المشروع. رسمك محفوظ تلقائياً.'],
  },
  glyphPicker: {
    title: 'اختيار المحرف',
    body: ['يفتح شبكة بكل محارف المشروع. اختر محرفاً لتنتقل إلى رسمه. سجل التراجع خاص بكل محرف ويبدأ من جديد عند الانتقال.'],
  },
  glyphItem: {
    title: 'محرف في القائمة',
    body: ['الضغط عليه (خارج وضع التعليمات) ينقلك إلى رسمه.'],
  },
  'tool.select': {
    title: 'أداة التحديد',
    body: [
      'اضغط نقطة لتحديدها واسحبها لتحريكها. اسحب في الفراغ لرسم مربع يحدد كل النقاط داخله. Shift يضيف إلى التحديد أو يزيل منه.',
      'عند تحديد نقطة تظهر مقابضها: اسحب المقبض لتغيير انحناء المقطع.',
      'نقر مزدوج على مقطع يدرج نقطة عليه دون تغيير شكله. نقر مزدوج على نقطة يبدّلها بين ناعمة وزاوية.',
    ],
    keys: 'V',
  },
  'tool.move': {
    title: 'أداة التحريك',
    body: ['اسحب أي مسار من جسمه أو حافته ليتحرك كله مرة واحدة، بخطوات الشبكة. Shift يقيّد الاتجاه.'],
    keys: 'M',
  },
  'tool.pen': {
    title: 'أداة القلم',
    body: [
      'اضغط لوضع نقطة. اسحب بعد الضغط لتصنع منحنى ناعماً بمقبضين متماثلين.',
      'لإغلاق المسار اضغط على نقطته الأولى. لإنهائه مفتوحاً اضغط Enter أو زر إنهاء المسار.',
      'على مسار موجود (مغلقاً كان أو مفتوحاً): الضغط على مقطع منه يدرج نقطة، والضغط على نقطة يحذفها، والضغط على طرف مسار مفتوح يكمل الرسم منه.',
      'المسار الداخلي الذي تغلقه داخل مسار آخر يصير ثقباً تلقائياً (يُضبط اتجاهه).',
    ],
    keys: 'P',
  },
  'tool.hand': {
    title: 'أداة اللوحة',
    body: ['اسحب لتحريك اللوحة دون أن تغيّر الرسم. يمكنك دائماً الإمساك بمفتاح المسافة مؤقتاً بدلها.'],
    keys: 'H أو المسافة',
  },
  delete: {
    title: 'حذف المحدد',
    body: ['يحذف النقاط المحددة. إن بقيت نقطتان فقط يصير المسار مفتوحاً، وإن بقيت نقطة واحدة يُحذف المسار. معطل إن لم يكن هناك تحديد.'],
    keys: 'Delete',
  },
  finishPen: {
    title: 'إنهاء المسار',
    body: ['يترك المسار الذي ترسمه بالقلم مفتوحاً كما هو ويتيح لك بدء مسار جديد. يظهر فقط أثناء الرسم بالقلم.'],
    keys: 'Enter',
  },

  view: {
    title: 'قائمة العرض',
    body: ['تتحكم بما يظهر على اللوحة فقط. لا تغيّر المحرف ولا ما يُصدَّر.'],
  },
  'view.grid': { title: 'الشبكة', body: ['تُظهر الشبكة أو تخفيها. حجمها من قائمة الإعدادات.'] },
  'view.metrics': {
    title: 'خطوط المقاييس',
    body: ['تُظهر خط الأساس وارتفاع الحروف الصغيرة والكبيرة والصاعد والهابط وحدّي العرض. تغيير قيمها من نافذة المقاييس في صفحة المشروع.'],
  },
  'view.nodes': { title: 'النقاط والمقابض', body: ['تُظهر نقاط المسارات أو تخفيها لترى الشكل نظيفاً. المربع زاوية والدائرة ناعمة.'] },
  'view.anchors': { title: 'نقاط الارتكاز', body: ['تُظهر نقاط الارتكاز الخاصة بالمحرف (تُستعمل لوضع علامات التشكيل) وأسماءها.'] },
  'view.direction': {
    title: 'أسهم الاتجاه',
    body: [
      'تعرض سهماً صغيراً على كل مسار يدل على اتجاهه. الاتجاه مهم لأن الخط يملأ المناطق حسب اتجاه الدوران.',
      'القاعدة: المسار الخارجي عكس عقارب الساعة، والثقب (مسار داخل مسار) مع عقارب الساعة. لو كان الثقب بنفس اتجاه الخارجي فسيظهر مملوءاً.',
    ],
  },

  metrics: {
    title: 'قائمة المقاييس',
    body: ['تضبط عرض هذا المحرف وفراغاته الجانبية بوحدات الخط. القيم تُقبل بـ Enter أو بمغادرة الحقل، وترجع للقديمة إن كانت غير صالحة.'],
  },
  'metrics.advance': {
    title: 'العرض الكامل',
    body: ['المسافة التي يتقدمها المؤشر بعد كتابة المحرف. تشمل الفراغين الجانبيين وعرض الرسم. الحد الأقصى ضعف وحدات الخط.'],
  },
  'metrics.lsb': {
    title: 'العارض الأيسر',
    body: ['الفراغ بين بداية العرض وأول نقطة من الرسم من اليسار. تغييره يزيح الرسم ويعدّل العرض الكامل ليبقى العارض الأيمن كما هو.'],
  },
  'metrics.rsb': {
    title: 'العارض الأيمن',
    body: ['الفراغ بين آخر الرسم ونهاية العرض الكامل. تغييره يغيّر العرض الكامل فقط دون تحريك الرسم.'],
  },
  'metrics.center': {
    title: 'توسيط الرسم داخل العرض',
    body: ['يزيح الرسم أفقياً حتى يتساوى العارضان الأيسر والأيمن. معطل إن لم يكن في المحرف رسم.'],
  },

  transform: {
    title: 'قائمة التحويل',
    body: [
      'تعمل على المسارات التي فيها نقاط محددة كاملة، أو على المحرف كله إن لم تحدد شيئاً. لا تُحرّف الشكل أبداً لأنها لا تحوّل نقطة وحدها.',
      'إن كان التحويل سيُخرج الرسم عن الحدود المسموحة يُرفض مع تنبيه ولا يتغير شيء.',
    ],
  },
  't.flipH': { title: 'قلب أفقي', body: ['يعكس الرسم يميناً ويساراً حول مركزه. يُصحَّح اتجاه المسار تلقائياً ليبقى الملء سليماً.'] },
  't.flipV': { title: 'قلب رأسي', body: ['يعكس الرسم أعلى وأسفل حول مركزه، ويحافظ على الشكل والاتجاه.'] },
  't.rot90r': { title: 'تدوير 90° يميناً', body: ['يدير الرسم ربع دورة مع عقارب الساعة حول مركزه.'] },
  't.rot90l': { title: 'تدوير 90° يساراً', body: ['يدير الرسم ربع دورة عكس عقارب الساعة حول مركزه.'] },
  't.scaleUp': { title: 'تكبير 10%', body: ['يكبّر الرسم عشرة بالمئة حول مركزه. يُرفض إن تجاوز الحدود.'] },
  't.scaleDown': { title: 'تصغير 10%', body: ['يصغّر الرسم نحو عشرة بالمئة حول مركزه. التكبير ثم التصغير قد لا يعيدان الأرقام تماماً بسبب التقريب إلى أعداد صحيحة.'] },
  't.duplicate': {
    title: 'تكرار',
    body: ['ينسخ المسارات المحددة (أو كلها) ويزيحها قليلاً ويحدد النسخة. يُرفض إن تجاوز حدود النقاط أو المسارات.'],
    keys: 'Ctrl+D',
  },

  path: {
    title: 'قائمة المسار',
    body: ['أوامر نوع النقطة والإغلاق والاتجاه. أوامر النقاط تعمل على النقاط المحددة.'],
  },
  'p.smooth': {
    title: 'ربط المقابض (ناعمة)',
    body: ['تجعل النقطة ناعمة: مقبضاها على خط واحد فلا تظهر زاوية عندها.'],
  },
  'p.corner': {
    title: 'كسر المقابض (زاوية)',
    body: ['تجعل النقطة زاوية: يتحرك كل مقبض باستقلال فيمكن أن يكون عندها انكسار حاد.'],
  },
  'p.auto': {
    title: 'تنعيم تلقائي',
    body: ['يحسب مقبضين مناسبين للنقطة من موضع جارتيها فيصير المنحنى سلساً دون أن تضبطه يدوياً. لا يؤثر على أطراف المسار المفتوح.'],
  },
  'p.close': {
    title: 'إغلاق المسار',
    body: ['يغلق المسار المفتوح (الذي فيه تحديد، أو كل المفتوحة إن لم تحدد شيئاً) بوصل آخر نقطة بأولى. يلزم ثلاث نقاط. يُضبط اتجاهه تلقائياً.'],
  },
  'p.open': {
    title: 'فتح المسار عند النقطة',
    body: ['حدد نقطة واحدة على مسار مغلق ثم اضغط هذا الأمر: يُقطع المسار عندها فتصير طرفاً مفتوحاً.'],
  },
  'p.reverse': {
    title: 'عكس اتجاه المسار',
    body: [
      'لكل مسار اتجاه: ترتيب نقاطه حين تمشي عليه. العكس يقلب هذا الترتيب فقط ولا يغيّر الشكل المرسوم لمسار وحيد.',
      'فائدته مع الثقوب: الثقب يجب أن يدور عكس المسار الخارجي. إن رأيت الثقب مملوءاً فاعكس اتجاهه. فعّل أسهم الاتجاه من قائمة العرض لترى النتيجة.',
    ],
  },
  'p.fixDir': {
    title: 'ضبط الاتجاه تلقائياً',
    body: ['يفحص كل المسارات المغلقة ويعكس الخاطئ منها: الخارجي عكس عقارب الساعة والثقب مع عقاربها. ينبهك بعدد ما صُحّح.'],
  },
  'p.selectAll': { title: 'تحديد الكل', body: ['يحدد كل نقاط المحرف.'], keys: 'Ctrl+A' },

  settings: { title: 'قائمة الإعدادات', body: ['حجم الشبكة وخيارات الالتصاق. تنطبق على الرسم والتحريك كليهما.'] },
  'settings.gridSize': {
    title: 'حجم الشبكة',
    body: ['المسافة بين خطوط الشبكة بوحدات الخط. عند التصغير الشديد تتضاعف المسافة المعروضة والملتصق بها معاً حتى لا تتزاحم الخطوط.'],
  },
  'settings.snapGrid': { title: 'الالتصاق بالشبكة', body: ['تقع النقاط الجديدة والمنقولة على تقاطعات الشبكة.'] },
  'settings.snapPoints': {
    title: 'الالتصاق بالنقاط والمقاييس',
    body: ['تلتصق النقطة بالنقاط الأخرى وبخطوط المقاييس وحدّي العرض عند اقترابها منها، ويظهر خط إرشاد. له الأولوية على الشبكة.'],
  },

  zoomOut: { title: 'تصغير', body: ['يصغّر عرض اللوحة. لا يغير المحرف.'] },
  zoomIn: { title: 'تكبير', body: ['يكبّر عرض اللوحة. لا يغير المحرف.'] },
  zoomMenu: { title: 'مستوى التكبير', body: ['يعرض النسبة الحالية، ومنها تختار نسبة جاهزة أو الملاءمة.'] },
  zoomPreset: { title: 'نسبة جاهزة', body: ['تضبط التكبير على هذه النسبة.'] },
  fit: { title: 'ملاءمة المحرف للشاشة', body: ['يضبط التكبير والموضع ليظهر العرض الكامل والمقاييس كلها في اللوحة.'] },
  undo: { title: 'تراجع', body: ['يلغي آخر تعديل في هذا المحرف. حتى مئة خطوة. معطل إن لم يكن هناك ما يُلغى.'], keys: 'Ctrl+Z' },
  redo: { title: 'إعادة', body: ['يعيد آخر تعديل تراجعت عنه. يتوقف بعد أي تعديل جديد.'], keys: 'Ctrl+Shift+Z' },
  status: {
    title: 'شريط الحالة',
    body: ['عدد النقاط والمسارات والمحدد، وهل المسارات كلها مغلقة. الحد الأقصى 400 نقطة و24 مساراً لكل محرف.'],
  },
};

```

## الخطوة 7: الملف src/help/helpBook.ts (استبدل محتواه كاملاً أو أنشئه)

```ts
/*
  كتاب التعليمات لكامل الموقع. لإضافة قسم: أضف كائناً إلى BOOK.
  كل قسم له عنوان ومواضيع، ولكل موضوع عنوان ونص.
*/

export interface BookItem {
  h: string;
  p: string;
}

export interface BookSection {
  id: string;
  title: string;
  items: BookItem[];
}

export const BOOK: BookSection[] = [
  {
    id: 'start',
    title: 'البداية',
    items: [
      {
        h: 'ما هذا الموقع؟',
        p: 'استوديو لصناعة الخطوط: ترسم المحارف بنفسك على لوحة، فيجمعها الموقع في مشروع خط واحد. كل شيء يعمل داخل متصفحك ولا يُرسل شيء إلى أي خادم.',
      },
      {
        h: 'أين تُحفظ أعمالي؟',
        p: 'تُحفظ تلقائياً في متصفحك على هذا الجهاز. إن مسحت بيانات المتصفح أو غيّرت الجهاز فلن تجدها، لذلك صدّر نسخة من مشروعك (ملف المشروع) بين وقت وآخر كنسخة احتياطية.',
      },
      {
        h: 'خطوات سريعة',
        p: '1) أنشئ مشروع خط. 2) أضف المحارف التي تريد رسمها. 3) افتح استوديو الرسم وارسم كل محرف. 4) اضبط المقاييس. 5) صدّر.',
      },
    ],
  },
  {
    id: 'projects',
    title: 'صفحة المشاريع',
    items: [
      { h: 'إنشاء مشروع', p: 'زر مشروع خط جديد يطلب اسم الخط واسم المصمم ووصفاً اختيارياً. الاسم مطلوب.' },
      { h: 'البحث', p: 'ابحث باسم الخط أو المصمم أو الوصف، وتتصفّى القائمة أثناء الكتابة.' },
      { h: 'بطاقة المشروع', p: 'تعرض الاسم وعدد المحارف ومعاينة. من البطاقة تفتح المشروع، وتعيد تسميته، وتكرره كنسخة، أو تحذفه بعد تأكيد.' },
      { h: 'الحذف', p: 'حذف المشروع نهائي ولا تراجع عنه، فصدّر نسخة قبل الحذف إن كنت تحتاجها.' },
    ],
  },
  {
    id: 'overview',
    title: 'صفحة المشروع',
    items: [
      { h: 'شبكة المحارف', p: 'كل بطاقة محرف تعرض رسمه. اضغط بطاقة لتفتح الاستوديو على ذلك المحرف.' },
      { h: 'إضافة محرف', p: 'تكتب الحرف نفسه ويُقترح اسمه ورمزه (يونيكود) تلقائياً. اسم المحرف ورمزه لا يتكرران في المشروع الواحد، والرمز صيغته U+0041 وما شابه.' },
      { h: 'الشكل', p: 'للحرف العربي أشكال: منفرد وأول ووسط وآخر. كل شكل محرف مستقل له رسمه.' },
      { h: 'دخول استوديو الرسم', p: 'يفتح الاستوديو على أول محرف أو على آخر ما اشتغلت عليه.' },
    ],
  },
  {
    id: 'metrics',
    title: 'المقاييس',
    items: [
      { h: 'وحدات الخط', p: 'كل أبعاد الخط تُقاس بوحدات صحيحة داخل مربع الخط. القيمة المعتادة 1000 وحدة لمربع الخط (الارتفاع الكلي).' },
      { h: 'خط الأساس', p: 'الخط الذي تقف عليه الحروف، وقيمته صفر دائماً. ما فوقه موجب وما تحته سالب.' },
      { h: 'ارتفاع الحروف الصغيرة والكبيرة', p: 'ارتفاع الحروف المنخفضة، وارتفاع الحروف العالية. يلتصق بهما الرسم في الاستوديو.' },
      { h: 'الصاعد والهابط', p: 'الصاعد أقصى ارتفاع يبلغه أي حرف، والهابط (سالب) أقصى نزول تحت خط الأساس. يحددان ارتفاع سطر النص.' },
      { h: 'تناسق المقاييس', p: 'يجب أن يكون الهابط تحت الصفر، والصاعد فوق ارتفاع الحروف الكبيرة، وهذه فوق ارتفاع الحروف الصغيرة. يحذرك الموقع إن اختل ذلك.' },
    ],
  },
  {
    id: 'studio',
    title: 'استوديو الرسم',
    items: [
      { h: 'ترتيب الشاشة', p: 'شريط علوي فيه الرجوع واختيار المحرف والأدوات والقوائم، واللوحة في الوسط، وشريط سفلي للتكبير والتراجع والحالة. الشريطان يُسحبان أفقياً على الشاشات الصغيرة.' },
      { h: 'الأدوات', p: 'التحديد (V) للنقاط والمقابض، التحريك (M) للمسار كله، القلم (P) للرسم، اللوحة (H) لتحريك العرض.' },
      { h: 'الرسم بالقلم', p: 'اضغط لوضع نقطة، واسحب لعمل منحنى. أغلق المسار بالضغط على نقطته الأولى. القلم على مسار موجود يدرج نقطة على المقطع أو يحذف النقطة أو يكمل من طرف مفتوح.' },
      { h: 'النقاط الناعمة والزوايا', p: 'النقطة الناعمة مقبضاها على خط واحد فينساب المنحنى. الزاوية مقبضاها مستقلان. النقر المزدوج على نقطة بأداة التحديد يبدّل بينهما.' },
      { h: 'الالتصاق', p: 'تلتصق النقاط بالنقاط الأخرى ثم بخطوط المقاييس ثم بالشبكة. اضغط Alt لتعطيل الالتصاق مؤقتاً، وShift لتقييد الاتجاه.' },
      { h: 'التحويلات', p: 'القلب والتدوير والتكبير تعمل على مسارات كاملة (المحددة أو كلها)، فلا يتشوه الشكل. التكرار Ctrl+D.' },
      { h: 'الحدود', p: 'لكل محرف حتى 400 نقطة و24 مساراً، وللإحداثيات مجال محدد. إن تجاوزت عملية الحد يُرفض ويظهر تنبيه ولا يتغير شيء.' },
      { h: 'التراجع', p: 'Ctrl+Z وCtrl+Shift+Z، حتى مئة خطوة لكل محرف. ينتهي السجل عند الانتقال لمحرف آخر.' },
      { h: 'اختصارات لوحة المفاتيح', p: 'V تحديد، M تحريك، P قلم، H لوحة، المسافة تحريك مؤقت، Delete حذف، Enter إنهاء المسار، Esc إلغاء التحديد، الأسهم تحريك نقطة (مع Shift عشر وحدات)، Ctrl+A تحديد الكل، Ctrl+D تكرار.' },
      { h: 'وضع التعليمات', p: 'زر التعليمات في الشريط العلوي يشغّل وضعاً يشرح كل زر عند الضغط عليه دون تنفيذه. عملك الجاري يبقى كما هو، وينتهي الوضع بمغادرة الاستوديو.' },
    ],
  },
  {
    id: 'concepts',
    title: 'مفاهيم الخط',
    items: [
      { h: 'العرض الكامل والعارضان', p: 'العرض الكامل مسافة تقدم المؤشر بعد المحرف. العارض الأيسر والأيمن فراغان على جانبي الرسم، ومجموع الثلاثة يساوي العرض الكامل.' },
      { h: 'اتجاه المسار', p: 'لكل مسار مغلق اتجاه دوران. القاعدة: الخارجي عكس عقارب الساعة والثقب مع عقاربها. إن خالف الثقب ذلك امتلأ بدل أن يفرغ. أمر ضبط الاتجاه تلقائياً يصحح الكل، والمسار المغلق الجديد يُضبط من تلقاء نفسه.' },
      { h: 'الثقوب', p: 'ارسم مساراً داخل مسار آخر ليصير ثقباً، كما في حرف الواو أو الفاء.' },
      { h: 'المسار المفتوح والمغلق', p: 'المسار المفتوح لا يُملأ ولا ينفع في الخط النهائي. أغلق كل مساراتك قبل التصدير.' },
    ],
  },
  {
    id: 'export',
    title: 'التصدير',
    items: [
      { h: 'ما يمكن تصديره', p: 'ملف المشروع (نسخة احتياطية تعيد فتحها لاحقاً)، وملف ميزات الخط. ملف الخط نفسه يضاف في تحديث قادم.' },
      { h: 'نصيحة قبل التصدير', p: 'راجع أن المسارات مغلقة، وأن الثقوب بالاتجاه الصحيح، وأن العرض الكامل مناسب لكل محرف.' },
    ],
  },
  {
    id: 'faq',
    title: 'أسئلة شائعة',
    items: [
      { h: 'لم أستطع إضافة نقطة', p: 'ربما وصلت لحد النقاط أو المسارات، أو أن النقطة خارج المجال المسموح. اقرأ التنبيه الذي يظهر أعلى اللوحة.' },
      { h: 'الثقب ظهر مملوءاً', p: 'اتجاهه مثل اتجاه المسار الخارجي. استعمل أمر ضبط الاتجاه تلقائياً من قائمة المسار.' },
      { h: 'اختفت لوحتي أثناء الرسم', p: 'اضغط زر ملاءمة المحرف للشاشة في الشريط السفلي.' },
    ],
  },
];

```

## الخطوة 8: الملف src/components/ui/Button.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React from 'react';
import { useHelp } from '../help/HelpContext';

/*
  قواعد استعمال الزر في كل المشروع:
  1. primary   : زر رئيسي واحد فقط في كل شاشة.
  2. secondary : الإجراءات الجانبية.
  3. quiet     : الأدوات والأيقونات.
  4. icon      : زر مربع للأيقونة فقط، ويجب أن يحمل title.
  5. active    : للأدوات القابلة للتبديل (مختارة / غير مختارة).
  6. soon      : أداة لم تُبرمج بعد. تظهر باهتة ومعطلة.
                 عند إنهاء برمجة الأداة احذف soon فقط وتعود ملوّنة.
*/

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: boolean;
  active?: boolean;
  soon?: boolean;
  /** معرّف الشرح في وضع التعليمات: الضغط يشرح الزر بدل أن ينفّذ. */
  helpId?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      icon = false,
      active,
      soon = false,
      className = '',
      title,
      disabled,
      type = 'button',
      children,
      helpId,
      onClick,
      ...rest
    },
    ref
  ) => {
    const help = useHelp();
    const helping = help.on && !!helpId;
    const classes = [
      'btn',
      `btn-${variant}`,
      icon ? 'btn-icon' : '',
      active ? 'is-active' : '',
      soon ? 'is-soon' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={(disabled && !helping) || (soon && !helping)}
        onClick={helping ? () => help.show(helpId!) : onClick}
        aria-pressed={active}
        title={soon ? (title ? `${title} (قريباً)` : 'قريباً') : title}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

```

## الخطوة 9: الملف src/components/ui/Dropdown.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { useHelp } from '../help/HelpContext';

/*
  القائمة المنسدلة الموحّدة. كل مجموعة أدوات تعيش داخل زر واحد يفتح قائمة.
  - القائمة تنزل من الزر نفسه على كل الشاشات، ولا تتحول إلى ورقة سفلية.
  - تُرسم خارج الشريط (portal) حتى لا يقصّها تمرير الشريط الأفقي.
  - تقلب لأعلى تلقائياً إن لم تتسع أسفل الزر، وتبقى داخل حدود الشاشة.
  - تُغلق بالنقر خارجها أو بمفتاح Escape.
*/

interface DropdownProps {
  label: string;
  icon?: React.ReactNode;
  /** إظهار نص الزر على الشاشات الصغيرة أيضاً. افتراضياً تظهر الأيقونة وحدها. */
  labelOnMobile?: boolean;
  /** auto = أسفل الزر، وتنقلب لأعلى إن ضاق المكان. */
  placement?: 'auto' | 'top' | 'bottom';
  /** start = تُحاذي القائمة حافة الزر الأولى (اليمنى في الواجهة العربية). */
  align?: 'start' | 'end';
  /** عرض القائمة بالبكسل. يقلّ تلقائياً إن كانت الشاشة أضيق منه. */
  width?: number;
  soon?: boolean;
  /** في وضع التعليمات: الضغطة الأولى تشرح الزر، والثانية تفتح القائمة. */
  helpId?: string;
  children: (close: () => void) => React.ReactNode;
}

interface Position {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
  up: boolean;
}

const MARGIN = 8;
const GAP = 6;

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  icon,
  labelOnMobile = false,
  placement = 'auto',
  align = 'start',
  width = 256,
  soon = false,
  helpId,
  children,
}) => {
  const help = useHelp();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // عند إطفاء وضع التعليمات تُغلق القوائم المفتوحة
  useEffect(() => {
    if (!help.on) setOpen(false);
  }, [help.on]);

  const compute = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(width, vw - MARGIN * 2);
    const rtl = getComputedStyle(trigger).direction === 'rtl';

    const alignRight = (align === 'start') === rtl;
    let left = alignRight ? r.right - w : r.left;
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));

    const below = vh - r.bottom - MARGIN - GAP;
    const above = r.top - MARGIN - GAP;
    const up =
      placement === 'top'
        ? true
        : placement === 'bottom'
          ? false
          : below < 240 && above > below;
    const space = up ? above : below;

    setPos({
      left,
      width: w,
      up,
      maxHeight: Math.max(140, Math.min(space, vh * 0.7)),
      top: up ? undefined : r.bottom + GAP,
      bottom: up ? vh - r.top + GAP : undefined,
    });
  }, [width, align, placement]);

  // الموضع يُحسب قبل الرسم حتى لا تومض القائمة في مكان خاطئ
  useLayoutEffect(() => {
    if (open) compute();
    else setPos(null);
  }, [open, compute]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-help-panel]')) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', compute);
    // التقاط أي تمرير، ومنه تمرير الشريط الأفقي، لتبقى القائمة ملتصقة بالزر
    window.addEventListener('scroll', compute, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, compute]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="quiet"
        soon={soon}
        active={open}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="shrink-0"
        onClick={() => {
          if (help.on && helpId && help.topicId !== helpId) {
            help.show(helpId);
            return;
          }
          setOpen((v) => !v);
        }}
      >
        {icon}
        <span className={labelOnMobile ? '' : 'hidden md:inline'}>{label}</span>
        <ChevronDown
          className={`h-3 w-3 stroke-[1.5] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            dir="rtl"
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: pos.width,
              maxHeight: pos.maxHeight,
              transformOrigin: pos.up ? 'bottom' : 'top',
            }}
            className="glass-dropdown animate-dropdown-slide z-[70] overflow-y-auto rounded-2xl p-1.5 shadow-xl"
          >
            {children(close)}
          </div>,
          document.body
        )}
    </>
  );
};

interface MenuItemProps {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  /** عند تمريرها (true أو false) تظهر علامة اختيار عند true. */
  active?: boolean;
  soon?: boolean;
  /** معرّف الشرح في وضع التعليمات. */
  helpId?: string;
  /** معطّل مؤقتاً لعدم انطباق الأمر الآن (ليس "قريباً"). */
  disabled?: boolean;
  onClick?: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  label,
  icon,
  hint,
  active,
  soon = false,
  disabled = false,
  helpId,
  onClick,
}) => {
  const help = useHelp();
  return (
  <button
    type="button"
    role="menuitem"
    className={`menu-item ${soon ? 'is-soon' : ''}`}
    disabled={!help.on && (soon || disabled)}
    title={soon ? `${label} (قريباً)` : undefined}
    onClick={help.on ? () => help.show(helpId ?? null) : onClick}
  >
    {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
    <span className="flex-1">{label}</span>
    {hint && <span className="font-mono text-[11px] text-ink-soft">{hint}</span>}
    {active !== undefined && (
      <Check className={`h-3.5 w-3.5 stroke-[1.5] ${active ? 'opacity-100' : 'opacity-0'}`} />
    )}
  </button>
  );
};

export const MenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-2 pb-1 pt-2 text-[11px] text-ink-soft">{children}</div>
);

export const MenuDivider: React.FC = () => <div className="my-1 h-px bg-ink/15" />;

```

## الخطوة 10: الملف src/components/ui/Modal.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

/*
  النافذة المنبثقة الموحّدة. تُركَّب فقط عند فتحها، فتبدأ كل مرة بحالة نظيفة.
  تُغلق بمفتاح Escape أو بالنقر على الخلفية، وتمنع تمرير الصفحة خلفها.
*/

interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClose: () => void;
  children: React.ReactNode;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' } as const;

export const Modal: React.FC<ModalProps> = ({
  title,
  subtitle,
  icon,
  size = 'md',
  onClose,
  children,
}) => {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="animate-backdrop-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`animate-modal-enter w-full ${SIZES[size]} max-h-[90dvh] overflow-y-auto rounded-3xl border border-ink/15 bg-paper p-5 shadow-2xl sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-ink/20 bg-sand/35">
                {icon}
              </span>
            )}
            <div>
              <h2 id={titleId} className="text-base">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
            </div>
          </div>
          <Button variant="quiet" icon title="إغلاق" onClick={onClose}>
            <X className="h-4 w-4 stroke-[1.5]" />
          </Button>
        </div>

        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
};

/** صف الأزرار أسفل النافذة. */
export const ModalActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-5 flex justify-end gap-2 border-t border-ink/10 pt-4">{children}</div>
);

```

## الخطوة 11: الملف src/components/studio/useStudioEditor.ts (استبدل محتواه كاملاً أو أنشئه)

```ts
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Contour, type FontMetrics, type Glyph, type Vec } from '../../types/font';
import {
  LIMITS,
  addContourWithNode,
  allNodeIds,
  appendNode,
  autoSmoothNodes,
  boundsOfTouched,
  centerInAdvance,
  clampAdvance,
  closeContour,
  closeContours,
  constrainAngle,
  cornerNodes,
  countNodes,
  deleteNodes,
  duplicateContours,
  fixDirections,
  flipHFn,
  flipVFn,
  hitContour,
  hitEndpoint,
  hitHandle,
  hitNode,
  insertNodeOnSegment,
  moveNodes,
  nearestOnContours,
  openContourAt,
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
  signedArea,
  smoothNodes,
  snapPoint,
  transformNodes,
  wholeContourIds,
  wrongDirectionCount,
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
  kind: 'node' | 'handle' | 'contour' | 'first' | 'end' | 'remove' | 'insert';
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
  /** false أثناء وضع التعليمات: لا يستجيب المحرر لأي مؤشر أو مفتاح، وتبقى حالته كما هي. */
  enabled?: boolean;
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
  noOpenPath: 'لا يوجد مسار مفتوح بثلاث نقاط أو أكثر ليُغلق.',
  needOneClosed: 'حدد نقطة واحدة على مسار مغلق لفتحه عندها.',
  dirsOk: 'اتجاه كل المسارات صحيح، لا حاجة لتغيير.',
  cannotDuplicate: 'التكرار يتجاوز حدود النقاط أو المسارات أو مساحة المحرف.',
} as const;

/**
 * محرك التحرير: الأدوات والتحديد والالتصاق والتراجع والإعادة.
 * مصدر الحقيقة الوحيد للرسم هو glyph.contours. هذا المحرك يحتفظ بنسخة عمل متزامنة (work)
 * حتى لا تُقرأ قيمة قديمة بين حدثين متتاليين قبل إعادة الرسم.
 */
export function useStudioEditor({ glyph, metrics, scale, enabled = true, onUpdateGlyph }: Options) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
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
  const lastDown = useRef<{ at: number; x: number; y: number } | null>(null);

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
    if (!enabledRef.current) return;
    const t = toolRef.current;
    if (t === 'hand') return;
    const contours = work.current.contours;
    const pre = work.current;

    if (t === 'pen') return penDown(info);

    if (t === 'select') {
      const now = Date.now();
      const prev = lastDown.current;
      lastDown.current = { at: now, x: info.screen.x, y: info.screen.y };
      if (prev && now - prev.at < 380 && Math.hypot(info.screen.x - prev.x, info.screen.y - prev.y) < 8) {
        lastDown.current = null;
        if (doubleClick(info)) return;
      }
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
        const closed = closeContour(contours, pen.id);
        const fixed = fixDirections(closed);
        const mine = fixed.find((c) => c.id === pen.id);
        commit({ contours: closed.map((c) => (c.id === pen.id && mine ? mine : c)) });
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
    if (!ep) {
      // مسار موجود (مغلق أو مفتوح): نقطة = حذفها، مقطع = إدراج نقطة عليه
      const hn = hitNode(contours, info.world, rEnd);
      if (hn) {
        commit({ contours: deleteNodes(contours, new Set([hn.nodeId])) });
        setSelection(EMPTY);
        return;
      }
      const seg = nearestOnContours(contours, info.world, hitRadius(info.touch, 8, 14));
      if (seg) {
        insertAt(seg.contourId, seg.index, seg.t, pre, info);
        return;
      }
    }
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

  /** يدرج نقطة على مقطع ويبدأ سحبها فوراً. */
  const insertAt = (contourId: string, index: number, t: number, pre: Snapshot, info: PointerInfo): boolean => {
    const res = insertNodeOnSegment(work.current.contours, contourId, index, t);
    if (!res) {
      flash(MSG.maxNodes);
      return false;
    }
    apply({ contours: res.contours });
    setSelection(new Set([res.nodeId]));
    const n = res.contours.flatMap((c) => c.nodes).find((x) => x.id === res.nodeId)!;
    gesture.current = {
      kind: 'drag',
      pre,
      base: work.current.contours,
      ids: new Set([res.nodeId]),
      startWorld: info.world,
      startScreen: info.screen,
      grab: { x: n.x, y: n.y },
      mode: 'point',
      toggleId: null,
      moved: false,
    };
    return true;
  };

  /** نقر مزدوج بأداة التحديد: على نقطة يبدّل ناعمة/زاوية، وعلى مقطع يدرج نقطة. */
  const doubleClick = (info: PointerInfo): boolean => {
    const contours = work.current.contours;
    const pre = work.current;
    const hn = hitNode(contours, info.world, hitRadius(info.touch, 9, 16));
    if (hn) {
      const node = contours.flatMap((c) => c.nodes).find((x) => x.id === hn.nodeId)!;
      const ids = new Set([hn.nodeId]);
      const next =
        node.kind === 'smooth'
          ? cornerNodes(contours, ids)
          : node.handleIn || node.handleOut
            ? smoothNodes(contours, ids)
            : autoSmoothNodes(contours, ids, metricsRef.current);
      commit({ contours: next });
      setSelection(ids);
      return true;
    }
    const seg = nearestOnContours(contours, info.world, hitRadius(info.touch, 8, 14));
    if (seg) {
      gesture.current = { kind: 'none' };
      return insertAt(seg.contourId, seg.index, seg.t, pre, info);
    }
    return false;
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
        const hn = hitNode(contours, info.world, rEnd);
        if (hn) return { kind: 'remove', id: hn.nodeId };
        const seg = nearestOnContours(contours, info.world, hitRadius(info.touch, 8, 14));
        if (seg) return { kind: 'insert', id: `${seg.contourId}:${seg.index}:${Math.round(seg.point.x)}:${Math.round(seg.point.y)}` };
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
    if (!enabledRef.current) return;
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
    if (!enabledRef.current && gesture.current.kind === 'none') return;
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
  /** التحويلات تعمل دائماً على مسارات كاملة: المسارات التي فيها تحديد، أو المحرف كله. */
  const targetIds = (): ReadonlySet<string> => {
    const sel = liveSelection();
    return sel.size > 0 ? wholeContourIds(work.current.contours, sel) : allNodeIds(work.current.contours);
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
    const b = boundsOfTouched(work.current.contours, liveSelection());
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
    const before = work.current.contours;
    if (before.length === 0) return flash(MSG.noDrawing);
    const next = reverseContours(before, liveSelection());
    commit({ contours: next });
    const n = next.filter((c, i) => c !== before[i]).length;
    const one = next.find((c, i) => c !== before[i]);
    flash(
      n === 1 && one && one.closed && one.nodes.length >= 3
        ? `انعكس اتجاه المسار، وهو الآن ${signedArea(one) > 0 ? 'عكس' : 'مع'} عقارب الساعة.`
        : `انعكس اتجاه ${n} مسار.`
    );
  };

  const autoDirection = () => {
    const before = work.current.contours;
    if (before.length === 0) return flash(MSG.noDrawing);
    const n = wrongDirectionCount(before);
    if (n === 0) return flash(MSG.dirsOk);
    commit({ contours: fixDirections(before) });
    flash(`صُحّح اتجاه ${n} مسار: الخارجي عكس عقارب الساعة والثقوب معها.`);
  };

  const closeSelected = () => {
    const before = work.current.contours;
    const closed = closeContours(before, liveSelection());
    if (!closed.some((c, i) => c !== before[i])) return flash(MSG.noOpenPath);
    const fixed = fixDirections(closed);
    // الاتجاه يُصحَّح للمسارات التي أُغلقت الآن فقط
    const next = closed.map((c, i) => (c !== before[i] ? fixed[i] : c));
    commit({ contours: next });
    if (penRef.current && !penContour()) setPenId(null);
    if (penContour()?.closed) {
      setPenId(null);
      setPreview(null);
    }
  };

  const openAtSelected = () => {
    const sel = liveSelection();
    const c = sel.size === 1 ? work.current.contours.find((x) => x.closed && x.nodes.some((n) => sel.has(n.id))) : null;
    if (!c) return flash(MSG.needOneClosed);
    commit({ contours: openContourAt(work.current.contours, [...sel][0]) });
  };

  const duplicate = () => {
    const res = duplicateContours(work.current.contours, liveSelection(), 40, -40, metricsRef.current);
    if (!res) return flash(MSG.cannotDuplicate);
    commit({ contours: res.contours });
    setSelection(res.newIds);
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
    undo, redo, selectAll, clearSelection, deleteSelection, nudge, setTool, finishPen, duplicate,
  });
  latest.current = { undo, redo, selectAll, clearSelection, deleteSelection, nudge, setTool, finishPen, duplicate };

  useEffect(() => {
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const onButton = (t: EventTarget | null) => t instanceof HTMLElement && t.tagName === 'BUTTON';

    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (!enabledRef.current) return;
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
        } else if (e.code === 'KeyD') {
          e.preventDefault();
          L.duplicate();
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
    autoDirection,
    closeSelected,
    openAtSelected,
    duplicate,
    setAdvance,
    changeLsb,
    changeRsb,
    centerGlyph,
  };
}

export type StudioEditor = ReturnType<typeof useStudioEditor>;

```

## الخطوة 12: الملف src/components/studio/StudioCanvas.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React, { useRef } from 'react';
import { type FontMetrics, type Glyph } from '../../types/font';
import { contourToPath } from '../../utils/pathGeometry';
import { contourArrow, effectiveGridStep } from '../../utils/pathEdit';
import { type PointerInfo, type StudioEditor } from './useStudioEditor';
import { useViewport } from './useViewport';

export interface ViewOptions {
  grid: boolean;
  metrics: boolean;
  nodes: boolean;
  anchors: boolean;
  /** أسهم تبيّن اتجاه كل مسار. */
  direction: boolean;
}

interface StudioCanvasProps {
  glyph: Glyph;
  metrics: FontMetrics;
  viewport: ReturnType<typeof useViewport>;
  options: ViewOptions;
  editor: StudioEditor;
  /** يضبطه الكانفاس: هل المؤشر الحالي يحرّك اللوحة بدل الأداة؟ يقرؤه useViewport. */
  panMode: React.MutableRefObject<boolean>;
  /** في وضع التعليمات: الضغط على اللوحة يشرحها بدل أن يرسم. */
  onHelp?: () => void;
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
  onHelp,
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
    if (onHelp) {
      onHelp();
      return;
    }
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
    editor.hover &&
    (editor.hover.kind === 'first' ||
      editor.hover.kind === 'end' ||
      editor.hover.kind === 'node' ||
      editor.hover.kind === 'remove')
      ? editor.hover.id
      : null;
  const removing = editor.hover?.kind === 'remove';
  const insertAt =
    editor.hover?.kind === 'insert'
      ? (() => {
          const parts = editor.hover.id.split(':');
          return { x: Number(parts[parts.length - 2]), y: Number(parts[parts.length - 1]) };
        })()
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
                  {target && removing && (
                    <path
                      d={`M ${sx(n.x) - 5} ${sy(n.y) - 5} L ${sx(n.x) + 5} ${sy(n.y) + 5} M ${sx(n.x) + 5} ${sy(n.y) - 5} L ${sx(n.x) - 5} ${sy(n.y) + 5}`}
                      className="stroke-ink"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            })}
          </g>
        ))}

      {/* أسهم الاتجاه */}
      {options.direction &&
        glyph.contours.map((c) => {
          const ar = contourArrow(c);
          if (!ar) return null;
          const x = sx(ar.at.x);
          const y = sy(ar.at.y);
          const dx = ar.dir.x;
          const dy = -ar.dir.y;
          const nx = -dy;
          const ny = dx;
          return (
            <path
              key={c.id}
              d={`M ${x + dx * 7} ${y + dy * 7} L ${x - dx * 5 + nx * 5} ${y - dy * 5 + ny * 5} L ${x - dx * 5 - nx * 5} ${y - dy * 5 - ny * 5} Z`}
              className="fill-sand-deep stroke-ink"
              strokeWidth="1"
            />
          );
        })}

      {insertAt && (
        <g className="pointer-events-none">
          <circle cx={sx(insertAt.x)} cy={sy(insertAt.y)} r="7" className="fill-sand-deep/60 stroke-ink" strokeWidth="1.5" />
          <path
            d={`M ${sx(insertAt.x) - 3} ${sy(insertAt.y)} H ${sx(insertAt.x) + 3} M ${sx(insertAt.x)} ${sy(insertAt.y) - 3} V ${sy(insertAt.y) + 3}`}
            className="stroke-ink"
            strokeWidth="1.2"
          />
        </g>
      )}

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

## الخطوة 13: الملف src/components/studio/StudioScreen.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleHelp,
  Copy,
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
import { HelpProvider, useHelp } from '../help/HelpContext';
import { HelpBook } from '../help/HelpBook';
import { HelpPanel } from '../help/HelpPanel';
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
  helpId: string;
  onCommit: (n: number) => void;
}> = ({ label, value, helpId, onCommit }) => {
  const help = useHelp();
  return (
  <label
    className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-xs"
    onPointerDown={help.on ? () => help.show(helpId) : undefined}
  >
    <span>{label}</span>
    <input
      readOnly={help.on}
      key={value ?? 'none'}
      dir="ltr"
      inputMode="numeric"
      disabled={value === null}
      defaultValue={value ?? ''}
      style={{ width: 96, height: 32 }}
      className="field text-center font-mono"
      onBlur={(e) => {
        if (help.on) return;
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
};

/*
  ترتيب الاستوديو:
  - الشريط العلوي: التنقل ثم الأدوات ثم مجموعات الميزات (كل مجموعة داخل زر منسدل).
  - اللوحة في الوسط.
  - الشريط السفلي: التكبير ثم التراجع ثم حالة المحرف.
  كل شريط بسطر واحد قابل للسحب، والقوائم تنزل من الزر نفسه.
*/
const StudioInner: React.FC<StudioScreenProps> = ({
  project,
  glyph,
  onSelectGlyph,
  onUpdateGlyph,
  onBack,
}) => {
  const { metrics } = project;
  const help = useHelp();
  const [showBook, setShowBook] = useState(false);

  // Esc في وضع التعليمات: يغلق الشرح أولاً ثم يطفئ الوضع
  useEffect(() => {
    if (!help.on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || showBook) return;
      if (document.querySelector('[role="menu"]')) return;
      if (help.topicId) help.show(null);
      else help.setOn(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [help, showBook]);

  const [options, setOptions] = useState<ViewOptions>({
    grid: true,
    metrics: true,
    nodes: true,
    anchors: true,
    direction: false,
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
    enabled: !help.on,
    onUpdateGlyph,
  });

  const nodeCount = glyph.contours.reduce((sum, c) => sum + c.nodes.length, 0);
  const pathState =
    glyph.contours.length === 0 ? '—' : glyph.contours.every((c) => c.closed) ? 'مغلق' : 'مفتوح';

  const hasSelection = editor.selection.size > 0;
  const hasDrawing = glyph.contours.length > 0;
  const lsb = bounds ? Math.round(bounds.xMin) : null;
  const rsb = bounds ? glyph.advanceWidth - Math.round(bounds.xMax) : null;
  const target = hasSelection ? 'على المسارات المحددة كاملة' : 'على المحرف كله';

  return (
    <div className="fixed inset-0 z-40 flex flex-col gap-2 bg-paper-deep p-2 sm:gap-3 sm:p-3">
      {/* الشريط العلوي */}
      <DragScroll label="الشريط العلوي" className="glass-panel shrink-0 rounded-2xl">
        <Button variant="quiet" icon helpId="back" title="الرجوع إلى المشروع" onClick={onBack}>
          <ArrowRight className={icon} />
        </Button>

        <Dropdown
          label={glyph.name}
          labelOnMobile
          width={340}
          placement="bottom"
          helpId="glyphPicker"
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
                      if (help.on) {
                        help.show('glyphItem');
                        return;
                      }
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
            helpId={`tool.${id}`}
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
          helpId="delete"
          title="حذف المحدد (Delete)"
          disabled={!hasSelection}
          onClick={editor.deleteSelection}
        >
          <Trash2 className={icon} />
        </Button>
        {editor.penContourId && (
          <Button variant="secondary" helpId="finishPen" title="إنهاء المسار (Enter)" onClick={editor.finishPen}>
            <Check className={icon} />
            <span>إنهاء المسار</span>
          </Button>
        )}

        <BarDivider />

        <Dropdown label="عرض" helpId="view" icon={<Eye className={icon} />} placement="bottom">
          {() => (
            <>
              <MenuLabel>إظهار على اللوحة</MenuLabel>
              <MenuItem label="الشبكة" helpId="view.grid" active={options.grid} onClick={() => toggle('grid')} />
              <MenuItem label="خطوط المقاييس" helpId="view.metrics" active={options.metrics} onClick={() => toggle('metrics')} />
              <MenuItem label="النقاط والمقابض" helpId="view.nodes" active={options.nodes} onClick={() => toggle('nodes')} />
              <MenuItem label="نقاط الارتكاز" helpId="view.anchors" active={options.anchors} onClick={() => toggle('anchors')} />
              <MenuItem label="أسهم اتجاه المسارات" helpId="view.direction" active={options.direction} onClick={() => toggle('direction')} />
            </>
          )}
        </Dropdown>

        <Dropdown label="المقاييس" helpId="metrics" icon={<Ruler className={icon} />} placement="bottom" width={300}>
          {(close) => (
            <>
              <MenuLabel>العرض والعارضان (بوحدات الخط)</MenuLabel>
              <NumberRow label="العرض الكامل" helpId="metrics.advance" value={glyph.advanceWidth} onCommit={editor.setAdvance} />
              <NumberRow label="العارض الأيسر" helpId="metrics.lsb" value={lsb} onCommit={editor.changeLsb} />
              <NumberRow label="العارض الأيمن" helpId="metrics.rsb" value={rsb} onCommit={editor.changeRsb} />
              <MenuDivider />
              <MenuItem
                label="توسيط الرسم داخل العرض"
                helpId="metrics.center"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.centerGlyph();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Dropdown label="تحويل" helpId="transform" icon={<Shapes className={icon} />} placement="bottom">
          {(close) => (
            <>
              <MenuLabel>يُطبَّق {target}</MenuLabel>
              <MenuItem
                label="قلب أفقي"
                helpId="t.flipH"
                icon={<FlipHorizontal2 className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.flip('h');
                  close();
                }}
              />
              <MenuItem
                label="قلب رأسي"
                helpId="t.flipV"
                icon={<FlipVertical2 className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.flip('v');
                  close();
                }}
              />
              <MenuItem
                label="تدوير 90° يميناً"
                helpId="t.rot90r"
                icon={<RotateCw className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.rotate(-90);
                  close();
                }}
              />
              <MenuItem
                label="تدوير 90° يساراً"
                helpId="t.rot90l"
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
                helpId="t.scaleUp"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.scaleBy(1.1);
                  close();
                }}
              />
              <MenuItem
                label="تصغير 10%"
                helpId="t.scaleDown"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.scaleBy(1 / 1.1);
                  close();
                }}
              />
              <MenuDivider />
              <MenuItem
                label="تكرار"
                helpId="t.duplicate"
                hint="Ctrl+D"
                icon={<Copy className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.duplicate();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Dropdown label="المسار" helpId="path" icon={<Spline className={icon} />} placement="bottom">
          {(close) => (
            <>
              <MenuLabel>نوع النقطة (للمحدد)</MenuLabel>
              <MenuItem
                label="ربط المقابض (ناعمة)"
                helpId="p.smooth"
                disabled={!hasSelection}
                onClick={() => {
                  editor.smooth();
                  close();
                }}
              />
              <MenuItem
                label="كسر المقابض (زاوية)"
                helpId="p.corner"
                disabled={!hasSelection}
                onClick={() => {
                  editor.corner();
                  close();
                }}
              />
              <MenuItem
                label="تنعيم تلقائي"
                helpId="p.auto"
                disabled={!hasSelection}
                onClick={() => {
                  editor.autoSmooth();
                  close();
                }}
              />
              <MenuDivider />
              <MenuLabel>الإغلاق والاتجاه</MenuLabel>
              <MenuItem
                label="إغلاق المسار"
                helpId="p.close"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.closeSelected();
                  close();
                }}
              />
              <MenuItem
                label="فتح المسار عند النقطة المحددة"
                helpId="p.open"
                disabled={!hasSelection}
                onClick={() => {
                  editor.openAtSelected();
                  close();
                }}
              />
              <MenuItem
                label="ضبط الاتجاه تلقائياً"
                helpId="p.fixDir"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.autoDirection();
                  close();
                }}
              />
              <MenuItem
                label="عكس اتجاه المسار"
                helpId="p.reverse"
                hint={hasSelection ? 'المحدد' : 'الكل'}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.reverse();
                  close();
                }}
              />
              <MenuItem
                label="تحديد الكل"
                helpId="p.selectAll"
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

        <Dropdown label="الإعدادات" helpId="settings" icon={<Settings2 className={icon} />} placement="bottom">
          {() => (
            <>
              <MenuLabel>حجم الشبكة (وحدة خط)</MenuLabel>
              {GRID_STEPS.map((step) => (
                <MenuItem
                  key={step}
                  label={String(step)}
                  helpId="settings.gridSize"
                  active={editor.settings.gridStep === step}
                  onClick={() => editor.setGridStep(step)}
                />
              ))}
              <MenuDivider />
              <MenuItem
                label="الالتصاق بالشبكة"
                helpId="settings.snapGrid"
                active={editor.settings.snapGrid}
                onClick={() => editor.setSnapGrid(!editor.settings.snapGrid)}
              />
              <MenuItem
                label="الالتصاق بالنقاط والمقاييس"
                helpId="settings.snapPoints"
                active={editor.settings.snapPoints}
                onClick={() => editor.setSnapPoints(!editor.settings.snapPoints)}
              />
              <MenuLabel>Shift لتقييد الاتجاه، وAlt لتعطيل الالتصاق مؤقتاً.</MenuLabel>
            </>
          )}
        </Dropdown>

        <BarDivider />

        <Button
          variant="quiet"
          active={help.on}
          title="وضع التعليمات"
          onClick={() => help.setOn(!help.on)}
        >
          <CircleHelp className={icon} />
          <span className="hidden md:inline">تعليمات</span>
        </Button>
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
          onHelp={help.on ? () => help.show('canvas') : undefined}
        />
        <HelpPanel onOpenBook={() => setShowBook(true)} />
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
        <Button variant="quiet" icon helpId="zoomOut" title="تصغير" onClick={viewport.zoomOut}>
          <ZoomOut className={icon} />
        </Button>

        <Dropdown label={`${viewport.percent}%`} helpId="zoomMenu" labelOnMobile width={180} placement="top">
          {(close) => (
            <>
              <MenuLabel>مستوى التكبير</MenuLabel>
              {ZOOM_PRESETS.map((p) => (
                <MenuItem
                  key={p}
                  label={`${p}%`}
                  helpId="zoomPreset"
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
                helpId="fit"
                onClick={() => {
                  viewport.fit();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Button variant="quiet" icon helpId="zoomIn" title="تكبير" onClick={viewport.zoomIn}>
          <ZoomIn className={icon} />
        </Button>
        <Button variant="quiet" icon helpId="fit" title="ملاءمة المحرف للشاشة" onClick={viewport.fit}>
          <Maximize className={icon} />
        </Button>

        <BarDivider />

        <Button variant="quiet" icon helpId="undo" title="تراجع (Ctrl+Z)" disabled={!editor.canUndo} onClick={editor.undo}>
          <Undo2 className={icon} />
        </Button>
        <Button variant="quiet" icon helpId="redo" title="إعادة (Ctrl+Shift+Z)" disabled={!editor.canRedo} onClick={editor.redo}>
          <Redo2 className={icon} />
        </Button>

        <BarDivider />

        <div
          className="flex shrink-0 items-center gap-3 whitespace-nowrap px-2 text-xs text-ink-soft"
          onPointerDown={help.on ? () => help.show('status') : undefined}
        >
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
      {showBook && <HelpBook onClose={() => setShowBook(false)} />}
    </div>
  );
};

/** المزوّد هنا لا في App: مغادرة الاستوديو تفكّه فينتهي وضع التعليمات تلقائياً. */
export const StudioScreen: React.FC<StudioScreenProps> = (props) => (
  <HelpProvider>
    <StudioInner {...props} />
  </HelpProvider>
);

```

## الخطوة 14: الملف src/components/ProjectsDashboard.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit3,
  FolderPlus,
  PenTool,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { type FontProject } from '../types/font';
import { AnimatedCounter } from './AnimatedCounter';
import { GlyphThumb } from './GlyphThumb';
import { HelpBookButton } from './help/HelpBook';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface ProjectsDashboardProps {
  projects: FontProject[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: (name: string, designer: string, description: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<FontProject | null>(null);

  const [newName, setNewName] = useState('');
  const [newDesigner, setNewDesigner] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const hasProjects = projects.length > 0;
  const q = query.trim().toLowerCase();
  const filtered = projects.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.designer.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );

  const closeCreate = () => {
    setShowCreate(false);
    setNewName('');
    setNewDesigner('');
    setNewDesc('');
  };

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateProject(newName, newDesigner, newDesc);
    closeCreate();
  };

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renaming && renaming.name.trim()) {
      onRenameProject(renaming.id, renaming.name);
      setRenaming(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* اللافتة العلوية */}
      <div className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-6 sm:p-8 md:flex-row md:items-center">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs text-ink-soft">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-ink/20 bg-sand/35">
              <PenTool className="h-3.5 w-3.5 stroke-[1.5]" />
            </span>
            <span>استوديو هندسة وتصميم الخطوط الطباعية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl">مشاريع الخطوط</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-soft sm:text-sm">
            مساحة هادئة لرسم المحارف وضبط المقاييس وبرمجة قواعد التبديل السياقي.
          </p>
        </div>

        {/* لا يظهر هنا عند عدم وجود مشاريع حتى لا يتكرر مع الحالة الفارغة */}
        <HelpBookButton />
        {hasProjects && (
          <Button variant="primary" className="self-start md:self-auto" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 stroke-[1.5]" />
            <span>مشروع خط جديد</span>
          </Button>
        )}
      </div>

      {hasProjects ? (
        <>
          <div className="glass-panel flex flex-col justify-between gap-3 rounded-2xl p-3 px-4 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute end-auto start-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[1.5] opacity-50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم الخط أو المصمم أو الوصف"
                aria-label="بحث في المشاريع"
                className="field ps-9"
              />
            </div>
            <div className="flex items-center gap-2 px-1 text-xs text-ink-soft">
              <span>إجمالي المشاريع:</span>
              <AnimatedCounter value={projects.length} duration={900} className="font-mono text-sm" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">لا توجد مشاريع تطابق بحثك.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project) => (
                <article
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="glass-panel group flex cursor-pointer flex-col justify-between rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-ink/45 hover:shadow-md"
                >
                  <div>
                    <div className="mb-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg">{project.name}</h2>
                        <p className="mt-0.5 text-[11px] text-ink-soft">
                          المصمم: {project.designer} · الإصدار {project.version}
                        </p>
                      </div>
                      <span className="rounded-lg border border-ink/15 bg-sand/35 px-2 py-0.5 font-mono text-[10px]">
                        {project.metrics.upm} UPM
                      </span>
                    </div>

                    <p className="mb-3.5 line-clamp-2 min-h-[34px] text-xs leading-relaxed text-ink-soft">
                      {project.description || 'مشروع خط عربي طباعي قيد التطوير.'}
                    </p>

                    <div className="mb-4 flex min-h-[54px] items-center gap-2 rounded-xl border border-ink/15 bg-sand/20 p-2.5">
                      {project.glyphs.length > 0 ? (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {project.glyphs.slice(0, 6).map((g) => (
                            <GlyphThumb key={g.id} glyph={g} metrics={project.metrics} className="h-8 w-8 shrink-0" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-ink-soft">لا توجد محارف مرسومة بعد</span>
                      )}
                      <span className="ms-auto whitespace-nowrap text-[11px] text-ink-soft">
                        {project.glyphs.length} محرف
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between border-t border-ink/10 pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="quiet"
                        icon
                        title="إعادة تسمية المشروع"
                        onClick={() => setRenaming({ id: project.id, name: project.name })}
                      >
                        <Edit3 className="h-3.5 w-3.5 stroke-[1.5]" />
                      </Button>
                      <Button variant="quiet" icon title="تكرار المشروع كنسخة" onClick={() => onDuplicateProject(project.id)}>
                        <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
                      </Button>
                      <Button variant="quiet" icon title="حذف المشروع" onClick={() => setDeleting(project)}>
                        <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                      </Button>
                    </div>

                    <Button variant="secondary" onClick={() => onOpenProject(project.id)}>
                      <span>فتح الخط</span>
                      <ArrowLeft className="h-3.5 w-3.5 stroke-[1.5]" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel mx-auto my-6 flex w-full max-w-lg flex-col items-center rounded-2xl p-10 text-center sm:p-14">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/20 bg-sand/35">
            <FolderPlus className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h2 className="mb-2 text-xl">لا توجد مشاريع خطوط حتى الآن</h2>
          <p className="mb-6 max-w-md text-xs leading-relaxed text-ink-soft sm:text-sm">
            ابدأ مشروع خطك الأول، ثم ارسم المحارف واضبط المقاييس وابنِ منها خطاً حقيقياً.
          </p>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 stroke-[1.5]" />
            <span>إنشاء مشروع خط جديد</span>
          </Button>
        </div>
      )}

      {showCreate && (
        <Modal title="إنشاء مشروع خط جديد" onClose={closeCreate}>
          <form onSubmit={submitCreate} className="space-y-3.5">
            <div>
              <label htmlFor="new-name" className="mb-1 block text-xs text-ink-soft">اسم الخط</label>
              <input
                id="new-name"
                autoFocus
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: خط الياقوت"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="new-designer" className="mb-1 block text-xs text-ink-soft">المصمم أو الاستوديو</label>
              <input
                id="new-designer"
                value={newDesigner}
                onChange={(e) => setNewDesigner(e.target.value)}
                placeholder="المصمم"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="new-desc" className="mb-1 block text-xs text-ink-soft">وصف مختصر</label>
              <textarea
                id="new-desc"
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="خط نصي وعناوين بهندسة متزنة"
                className="field"
              />
            </div>
            <ModalActions>
              <Button onClick={closeCreate}>إلغاء</Button>
              <Button type="submit" variant="primary">بدء المشروع</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {renaming && (
        <Modal title="إعادة تسمية المشروع" size="sm" onClose={() => setRenaming(null)}>
          <form onSubmit={submitRename}>
            <input
              autoFocus
              required
              aria-label="الاسم الجديد"
              value={renaming.name}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              className="field"
            />
            <ModalActions>
              <Button onClick={() => setRenaming(null)}>إلغاء</Button>
              <Button type="submit" variant="primary">حفظ الاسم</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="تأكيد حذف المشروع" size="sm" onClose={() => setDeleting(null)}>
          <p className="text-xs leading-relaxed text-ink-soft">
            سيُحذف «{deleting.name}» نهائياً مع كل ما رُسم فيه من محارف، ولا يمكن استرجاعه.
          </p>
          <ModalActions>
            <Button onClick={() => setDeleting(null)}>تراجع</Button>
            <Button
              variant="primary"
              onClick={() => {
                onDeleteProject(deleting.id);
                setDeleting(null);
              }}
            >
              تأكيد الحذف
            </Button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
};

```

## الخطوة 15: الملف src/components/ProjectOverview.tsx (استبدل محتواه كاملاً أو أنشئه)

```tsx
import React, { useState } from 'react';
import { ArrowRight, Download, PenTool, Plus, Sliders } from 'lucide-react';
import { type FontProject, type GlyphCategory, type NewGlyphData } from '../types/font';
import { defaultGlyphName, defaultUnicode, validateNewGlyph } from '../utils/fontLogic';
import { CATEGORY_LABEL } from '../utils/labels';
import { AnimatedCounter } from './AnimatedCounter';
import { GlyphThumb } from './GlyphThumb';
import { HelpBookButton } from './help/HelpBook';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface ProjectOverviewProps {
  project: FontProject;
  onBackToProjects: () => void;
  onEnterStudio: (glyphId?: string) => void;
  onOpenMetrics: () => void;
  onOpenExport: () => void;
  onAddNewGlyph: (glyphData: NewGlyphData) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  onBackToProjects,
  onEnterStudio,
  onOpenMetrics,
  onOpenExport,
  onAddNewGlyph,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [char, setChar] = useState('');
  const [name, setName] = useState('');
  const [unicode, setUnicode] = useState('');
  const [category, setCategory] = useState<GlyphCategory>('letter');
  // ما دام المستخدم لم يعدّل الاسم أو اليونيكود يدوياً نملؤهما تلقائياً من المحرف
  const [autoFill, setAutoFill] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { metrics, glyphs } = project;
  const activeFeatures = project.features.filter((f) => f.enabled).length;
  const isEmpty = glyphs.length === 0;

  const closeAdd = () => {
    setShowAdd(false);
    setChar('');
    setName('');
    setUnicode('');
    setCategory('letter');
    setAutoFill(true);
    setError(null);
  };

  const handleCharChange = (value: string) => {
    setChar(value);
    setError(null);
    if (autoFill) {
      setName(defaultGlyphName(value));
      setUnicode(defaultUnicode(value));
    }
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const data: NewGlyphData = {
      char: char.trim(),
      name: name.trim(),
      unicode: unicode.trim().toUpperCase(),
      category,
    };
    const problem = validateNewGlyph(glyphs, data);
    if (problem) {
      setError(problem);
      return;
    }
    onAddNewGlyph(data);
    closeAdd();
  };

  const stats: Array<{ label: string; value: number; prefix?: string }> = [
    { label: 'مقياس UPM', value: metrics.upm },
    { label: 'الصاعد', value: metrics.ascender, prefix: '+' },
    { label: 'ارتفاع الحروف الكبيرة', value: metrics.capHeight, prefix: '+' },
    { label: 'ارتفاع الحروف الصغيرة', value: metrics.xHeight, prefix: '+' },
    { label: 'الهابط', value: metrics.descender },
    { label: 'ميزات الأوبن تايب النشطة', value: activeFeatures },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* الترويسة */}
      <div className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-5 sm:p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon title="الرجوع إلى قائمة المشاريع" onClick={onBackToProjects}>
            <ArrowRight className="h-4 w-4 stroke-[1.5]" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl sm:text-2xl">{project.name}</h1>
              <span className="rounded-md border border-ink/15 bg-sand/35 px-2 py-0.5 font-mono text-[10px]">
                v{project.version}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">
              المصمم: {project.designer} · {glyphs.length} محرف
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HelpBookButton />
          <Button onClick={onOpenMetrics}>
            <Sliders className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>المقاييس</span>
          </Button>
          <Button onClick={onOpenExport}>
            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>تصدير</span>
          </Button>
          <Button
            variant="primary"
            disabled={isEmpty}
            title={isEmpty ? 'أضف محرفاً أولاً' : undefined}
            onClick={() => onEnterStudio()}
          >
            <PenTool className="h-4 w-4 stroke-[1.5]" />
            <span>دخول استوديو الرسم</span>
          </Button>
        </div>
      </div>

      {/* المقاييس */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="glass-panel rounded-xl p-3">
            <span className="block text-[11px] text-ink-soft">{s.label}</span>
            <AnimatedCounter
              value={s.value}
              duration={700}
              prefix={s.prefix}
              className="font-mono text-sm"
            />
          </div>
        ))}
      </div>

      {/* المحارف */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg">المحارف المرسومة</h2>
          <span className="rounded-md border border-ink/15 bg-sand/30 px-2 py-0.5 font-mono text-xs">
            {glyphs.length}
          </span>
        </div>
        {!isEmpty && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>إضافة محرف</span>
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="glass-panel flex flex-col items-center rounded-2xl p-8 text-center sm:p-10">
          <p className="mb-1 text-base">لا توجد محارف في هذا المشروع حتى الآن</p>
          <p className="mb-4 max-w-sm text-xs leading-relaxed text-ink-soft">
            أضف محرفك الأول، ثم ادخل استوديو الرسم لتشكيل منحنياته.
          </p>
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>إضافة أول محرف</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {glyphs.map((glyph) => (
            <button
              key={glyph.id}
              type="button"
              onClick={() => onEnterStudio(glyph.id)}
              className="glass-panel group flex flex-col items-stretch rounded-2xl p-4 text-start transition-all hover:-translate-y-1 hover:border-ink/45 hover:shadow-md"
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-ink-soft">
                <span>{glyph.unicode || '—'}</span>
                <span className="font-sans">{CATEGORY_LABEL[glyph.category]}</span>
              </div>
              <div className="my-3 flex h-20 items-center justify-center">
                <GlyphThumb
                  glyph={glyph}
                  metrics={metrics}
                  className="h-full w-full transition-transform group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between border-t border-ink/10 pt-2 text-xs">
                <span className="font-mono">{glyph.name}</span>
                <span className="font-mono text-[10px] text-ink-soft">{glyph.advanceWidth}u</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="إضافة محرف جديد" onClose={closeAdd}>
          <form onSubmit={submitAdd} className="space-y-3.5">
            <div>
              <label htmlFor="g-char" className="mb-1 block text-xs text-ink-soft">المحرف أو الرمز</label>
              <input
                id="g-char"
                autoFocus
                required
                maxLength={4}
                value={char}
                onChange={(e) => handleCharChange(e.target.value)}
                placeholder="مثال: ف"
                className="field font-heading text-base"
              />
            </div>
            <div>
              <label htmlFor="g-name" className="mb-1 block text-xs text-ink-soft">اسم المحرف في الخط</label>
              <input
                id="g-name"
                dir="ltr"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setAutoFill(false);
                  setError(null);
                }}
                placeholder="feh"
                className="field font-mono"
              />
            </div>
            <div>
              <label htmlFor="g-unicode" className="mb-1 block text-xs text-ink-soft">نقطة اليونيكود</label>
              <input
                id="g-unicode"
                dir="ltr"
                value={unicode}
                onChange={(e) => {
                  setUnicode(e.target.value);
                  setAutoFill(false);
                  setError(null);
                }}
                placeholder="U+0641"
                className="field font-mono"
              />
            </div>
            <div>
              <label htmlFor="g-cat" className="mb-1 block text-xs text-ink-soft">التصنيف</label>
              <select
                id="g-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as GlyphCategory)}
                className="field"
              >
                {(Object.keys(CATEGORY_LABEL) as GlyphCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABEL[key]}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-ink/20 bg-sand/30 p-2.5 text-xs">
                {error}
              </p>
            )}

            <ModalActions>
              <Button onClick={closeAdd}>إلغاء</Button>
              <Button type="submit" variant="primary">إضافة</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
};

```

## الخطوة 16: الاختبار والتشغيل

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`. يجب أن تنجح الثلاثة. بعدها شغّل `npm run dev`.
