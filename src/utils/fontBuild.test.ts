import test from 'node:test';
import assert from 'node:assert/strict';
import { type Contour, type FontProject } from '../types/font';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, commandsToContours, importFontBuffer } from './fontBuild';

const rect = (id: string, x: number, y: number, w: number, h: number): Contour => ({
  id,
  closed: true,
  nodes: [
    { id: id + '1', x, y, kind: 'corner', handleIn: null, handleOut: null },
    { id: id + '2', x: x + w, y, kind: 'corner', handleIn: null, handleOut: null },
    { id: id + '3', x: x + w, y: y + h, kind: 'corner', handleIn: null, handleOut: null },
    { id: id + '4', x, y: y + h, kind: 'corner', handleIn: null, handleOut: null },
  ],
});

function sample(): FontProject {
  const p = createProject('My Font', 'Designer', '');
  const g = createGlyph({ char: 'a', name: 'a', unicode: 'U+0061', category: 'letter', advanceWidth: 500 });
  g.contours = [rect('a1', 0, 0, 100, 200)];
  p.glyphs.push(g);
  return p;
}

test('features and OS/2 heights are written into the font', async () => {
  const p = sample();
  p.metrics = { ...p.metrics, capHeight: 650, xHeight: 430 };
  const init = createGlyph({ char: 'a', name: 'a.init', unicode: '', category: 'letter', form: 'initial', advanceWidth: 500 });
  init.contours = [rect('z', 0, 0, 100, 100)];
  p.glyphs.push(init);
  const buf = await buildFontBuffer(p);
  const ot = (await import('opentype.js')) as unknown as { default?: typeof import('opentype.js') } & typeof import('opentype.js');
  const font = (ot.default ?? ot).parse(buf);
  const os2 = font.tables.os2 as unknown as { sCapHeight: number; sxHeight: number };
  assert.equal(os2.sCapHeight, 650);
  assert.equal(os2.sxHeight, 430);
  const tags = (font.tables.gsub as unknown as { features: Array<{ tag: string }> }).features.map((f) => f.tag);
  assert.ok(tags.includes('init'));
  const back = await importFontBuffer(buf, 'm.otf');
  assert.equal(back.project.metrics.capHeight, 650);
  assert.equal(back.project.metrics.xHeight, 430);
});

test('commandsToContours converts commands properly', () => {
  const contours = commandsToContours([
    { type: 'M', x: 0, y: 0 },
    { type: 'L', x: 100, y: 0 },
    { type: 'L', x: 100, y: 100 },
    { type: 'L', x: 0, y: 100 },
    { type: 'Z' },
  ]);
  assert.equal(contours.length, 1);
  assert.equal(contours[0].closed, true);
  assert.equal(contours[0].nodes.length, 4);
});
