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
