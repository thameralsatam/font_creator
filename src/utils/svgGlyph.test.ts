import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Glyph } from '../types/font';
import { commandsToContours } from './fontBuild';
import { getContourBounds } from './pathGeometry';
import { glyphToSvg, svgToGlyph } from './svgGlyph';

const m = { upm: 1000, ascender: 800, descender: -200, xHeight: 500, capHeight: 700, baseline: 0 } as never;

test('svg export then import keeps the shape', () => {
  const contours = commandsToContours([
    { type: 'M', x: 100, y: 0 }, { type: 'L', x: 400, y: 0 }, { type: 'L', x: 400, y: 600 }, { type: 'L', x: 100, y: 600 }, { type: 'Z' },
  ]);
  const g = { name: 'a', advanceWidth: 500, contours } as unknown as Glyph;
  const r = svgToGlyph(glyphToSvg(g, m), m);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.advanceWidth, 500);
  const b = getContourBounds(r.contours[0])!;
  assert.deepEqual([b.xMin, b.yMin, b.xMax, b.yMax], [100, 0, 400, 600]);
});

test('svg import rejects transforms, arcs and empty files', () => {
  assert.equal(svgToGlyph('<svg viewBox="0 0 10 10"><path transform="x" d="M0 0"/></svg>', m).ok, false);
  assert.equal(svgToGlyph('<svg viewBox="0 0 10 10"><path d="M0 0 A5 5 0 0 1 10 10"/></svg>', m).ok, false);
  assert.equal(svgToGlyph('<svg viewBox="0 0 10 10"></svg>', m).ok, false);
});
