import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlyph, createProject } from './fontLogic';
import { checkProject } from './fontBuild';
import type { Glyph, GlyphForm } from '../types/font';

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
type A = Record<string, [number, number]>;
function letter(name: string, form: GlyphForm, x0: number, x1: number, adv = 600, anchors: A = {}): Glyph {
  const g = createGlyph({ char: 'ب', name, unicode: '', category: 'letter' });
  g.form = form;
  g.advanceWidth = adv;
  g.contours = [{ id: 'c' + name, closed: true, nodes: [nd('a', x0, 100), nd('b', x1, 100), nd('c', x1, 200), nd('d', x0, 200)] }];
  g.anchors = Object.entries(anchors).map(([n, [x, y]], i) => ({ id: name + i, name: n, x, y }));
  return g;
}
function mark(name: string, anchors: A): Glyph {
  const g = createGlyph({ char: 'َ', name, unicode: '', category: 'diacritic' });
  g.advanceWidth = 0;
  g.contours = [{ id: 'c' + name, closed: true, nodes: [nd('a', -100, 800), nd('b', 100, 800), nd('c', 100, 860), nd('d', -100, 860)] }];
  g.anchors = Object.entries(anchors).map(([n, [x, y]], i) => ({ id: name + i, name: n, x, y }));
  return g;
}
const warnings = (glyphs: Glyph[]) => {
  const p = createProject('C', 'D', '');
  p.glyphs = glyphs;
  return checkProject(p).warnings;
};
const has = (w: string[], ...needles: string[]) => w.some((x) => needles.every((n) => x.includes(n)));

test('a mark with no anchor at all is reported (it cannot be positioned)', () => {
  const w = warnings([letter('beh', 'isolated', 50, 550, 600, { top: [300, 400] }), mark('fatha', {})]);
  assert.ok(has(w, 'fatha', 'بلا نقطة ارتكاز'), w.join('\n'));
  const ok = warnings([letter('beh', 'isolated', 50, 550, 600, { top: [300, 400] }), mark('fatha', { top: [0, 800] })]);
  assert.ok(!has(ok, 'بلا نقطة ارتكاز'), ok.join('\n'));
});

test('letters without the anchor a mark needs are listed', () => {
  const w = warnings([
    letter('beh', 'isolated', 50, 550, 600, { top: [300, 400] }),
    letter('lam', 'isolated', 50, 550, 600, {}),
    mark('fatha', { top: [0, 800] }),
  ]);
  assert.ok(has(w, 'lam', 'تقابل'), w.join('\n'));
  assert.ok(!has(w, 'beh', 'تقابل'));
});

test('two marks on the same side with no stacking point warn that they will overlap', () => {
  const base = letter('beh', 'isolated', 50, 550, 600, { top: [300, 400] });
  const w = warnings([base, mark('shadda', { top: [0, 800] }), mark('fatha', { top: [0, 800] })]);
  assert.ok(has(w, 'shadda', 'تتراكب'), w.join('\n'));
  const ok = warnings([base, mark('shadda', { top: [0, 800], markTop: [0, 960] }), mark('fatha', { top: [0, 800] })]);
  assert.ok(!has(ok, 'تتراكب'), ok.join('\n'));
});

test('connecting forms must reach the edge of the advance they connect through', () => {
  const w = warnings([
    letter('beh.isol', 'isolated', 100, 500), // منفصل: لا يُفحص
    letter('beh.init', 'initial', 100, 600), // بداية: يتصل يساراً (x=0) ولا يصله
    letter('beh.medi', 'medial', 0, 600), // وسط سليم
    letter('beh.fina', 'final', 0, 500), // نهاية: يتصل يميناً (x=600) ولا يصله
  ]);
  const msg = w.find((x) => x.includes('حافة العرض')) ?? '';
  assert.ok(msg.includes('beh.init') && msg.includes('beh.fina'), w.join('\n'));
  assert.ok(!msg.includes('beh.isol') && !msg.includes('beh.medi'), msg);
});

test('overlapping the edge is fine, and projects that use entry/exit anchors are not judged by edges', () => {
  const ok = warnings([letter('beh.init', 'initial', -20, 600), letter('beh.fina', 'final', 0, 640)]);
  assert.ok(!has(ok, 'حافة العرض'), ok.join('\n'));
  const cursive = warnings([letter('beh.init', 'initial', 100, 600, 600, { exit: [100, 150] })]);
  assert.ok(!has(cursive, 'حافة العرض'), cursive.join('\n'));
});
