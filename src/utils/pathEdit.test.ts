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
