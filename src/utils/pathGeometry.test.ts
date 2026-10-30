import test from 'node:test';
import assert from 'node:assert/strict';
import { contourToPath, getContourBounds, getGlyphBounds } from './pathGeometry';
import { type Contour, type Glyph, type PathNode } from '../types/font';

const node = (
  id: string,
  x: number,
  y: number,
  handleIn: PathNode['handleIn'] = null,
  handleOut: PathNode['handleOut'] = null
): PathNode => ({ id, x, y, kind: 'corner', handleIn, handleOut });

const square: Contour = {
  id: 'c1',
  closed: true,
  nodes: [node('a', 0, 0), node('b', 100, 0), node('c', 100, 200), node('d', 0, 200)],
};

test('straight contour becomes a closed line path', () => {
  assert.equal(contourToPath(square), 'M 0 0 L 100 0 L 100 200 L 0 200 L 0 0 Z');
});

test('open contour has no closing segment', () => {
  const open: Contour = { ...square, closed: false };
  assert.equal(contourToPath(open), 'M 0 0 L 100 0 L 100 200 L 0 200');
});

test('empty contour produces an empty path', () => {
  assert.equal(contourToPath({ id: 'e', closed: true, nodes: [] }), '');
});

test('curve segment uses relative handles', () => {
  const c: Contour = {
    id: 'c2',
    closed: false,
    nodes: [node('a', 0, 0, null, { x: 0, y: 50 }), node('b', 100, 0, { x: 0, y: 50 }, null)],
  };
  assert.equal(contourToPath(c), 'M 0 0 C 0 50 100 50 100 0');
});

test('bounds of a square are exact', () => {
  assert.deepEqual(getContourBounds(square), { xMin: 0, yMin: 0, xMax: 100, yMax: 200 });
});

test('bounds include the true curve peak, not the handle', () => {
  const c: Contour = {
    id: 'c3',
    closed: false,
    nodes: [node('a', 0, 0, null, { x: 0, y: 100 }), node('b', 100, 0, { x: 0, y: 100 }, null)],
  };
  const b = getContourBounds(c);
  assert.ok(b);
  assert.equal(b.yMax, 75); // الذروة الفعلية 0.75 × ارتفاع المقبض
  assert.equal(b.xMin, 0);
  assert.equal(b.xMax, 100);
});

test('glyph bounds merge all contours and are null when empty', () => {
  const far: Contour = {
    id: 'c4',
    closed: true,
    nodes: [node('a', 300, -50), node('b', 400, -50), node('c', 400, 10)],
  };
  const glyph: Glyph = {
    id: 'g', name: 'g', unicode: '', char: 'x', category: 'letter', form: 'isolated',
    advanceWidth: 500, contours: [square, far], anchors: [],
  };
  assert.deepEqual(getGlyphBounds(glyph), { xMin: 0, yMin: -50, xMax: 400, yMax: 200 });
  assert.equal(getGlyphBounds({ ...glyph, contours: [] }), null);
});
