import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type Glyph } from '../types/font';
import { commandsToContours } from './fontBuild';
import { getContourBounds } from './pathGeometry';
import { glyphToSvg, svgToGlyph } from './svgGlyph';

const m = { upm: 1000, ascender: 800, descender: -200, xHeight: 500, capHeight: 700, baseline: 0 } as never;
const box = (r: ReturnType<typeof svgToGlyph>) => {
  if (!r.ok) throw new Error(r.error);
  const b = getContourBounds(r.contours[0])!;
  return [b.xMin, b.yMin, b.xMax, b.yMax];
};

test('svg export then import keeps the shape', () => {
  const contours = commandsToContours([
    { type: 'M', x: 100, y: 0 }, { type: 'L', x: 400, y: 0 }, { type: 'L', x: 400, y: 600 }, { type: 'L', x: 100, y: 600 }, { type: 'Z' },
  ]);
  const g = { name: 'a', advanceWidth: 500, contours } as unknown as Glyph;
  const r = svgToGlyph(glyphToSvg(g, m), m);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.advanceWidth, 500);
  assert.deepEqual(box(r), [100, 0, 400, 600]);
});

test('group transforms are applied (translate then scale)', () => {
  const svg = '<svg viewBox="0 0 500 1000"><g transform="translate(100 200)"><g transform="scale(2)"><path d="M0 0 L100 0 L100 100 L0 100 Z"/></g></g></svg>';
  // المربع بعد التحويل: x من 100 إلى 300، y (للأسفل) من 200 إلى 400 → في الخط y من 600 إلى 400
  assert.deepEqual(box(svgToGlyph(svg, m)), [100, 400, 300, 600]);
});

test('circle and arc commands become curves with the right extent', () => {
  const r = svgToGlyph('<svg viewBox="0 0 1000 1000"><circle cx="500" cy="500" r="200"/></svg>', m);
  const [x0, y0, x1, y1] = box(r);
  assert.ok(Math.abs(x0 - 300) <= 1 && Math.abs(x1 - 700) <= 1);
  assert.ok(Math.abs(y0 - 100) <= 1 && Math.abs(y1 - 500) <= 1);
  const a = svgToGlyph('<svg viewBox="0 0 1000 1000"><path d="M300 500 A200 200 0 1 0 700 500 A200 200 0 1 0 300 500 Z"/></svg>', m);
  assert.ok(a.ok);
});

test('use pointing to a path in defs is rendered with its transform', () => {
  const svg = '<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd"><svg viewBox="0 0 1920 1920" xmlns:xlink="http://www.w3.org/1999/xlink"><use transform="matrix(1,0,0,1,900,900) scale(0.5,0.5)" xlink:href="#s" x="0" y="0"/><defs><path d="m-500-100l1000 0 0 200 -1000 0z" id="s"/></defs></svg>';
  const r = svgToGlyph(svg, m);
  if (!r.ok) throw new Error(r.error);
  assert.equal(r.contours.length, 1);
});

test('rect, defs and fill none are handled', () => {
  const svg = '<svg viewBox="0 0 1000 1000"><defs><path d="M0 0 L9 0 L9 9 Z"/></defs><path fill="none" d="M0 0 L5 0 L5 5 Z"/><rect x="100" y="100" width="300" height="200"/></svg>';
  const r = svgToGlyph(svg, m);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.contours.length, 1);
  assert.equal(svgToGlyph('<svg viewBox="0 0 10 10"></svg>', m).ok, false);
});
