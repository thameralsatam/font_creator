import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, checkProject, importFontBuffer } from './fontBuild';
import { presentationForm } from './arabicForms';
import type { Glyph } from '../types/font';

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
function glyph(name: string, unicode: string): Glyph {
  const g = createGlyph({ char: '', name, unicode, category: 'letter' });
  g.advanceWidth = 600;
  g.contours = [{ id: 'c' + name, closed: true, nodes: [nd('a', 80, 0), nd('b', 560, 0), nd('c', 560, 700), nd('d', 80, 700)] }];
  return g;
}

test('presentationForm: Unicode data decides the form of Arabic presentation-form code points', () => {
  assert.equal(presentationForm(0xfe91), 'initial'); // beh initial
  assert.equal(presentationForm(0xfe92), 'medial');
  assert.equal(presentationForm(0xfe90), 'final');
  assert.equal(presentationForm(0xfb58), 'initial'); // peh initial
  assert.equal(presentationForm(0xfe8f), null); // isolated
  assert.equal(presentationForm(0x628), null); // base letter
  assert.equal(presentationForm(0x41), null);
});

test('import: glyph form comes from the name suffix, else from the presentation-form code point, else isolated', async () => {
  const p = createProject('Forms', 'D', '');
  p.glyphs = [
    glyph('beh', 'U+0628'),
    glyph('beh.init', 'U+E001'), // لاحقة فقط (رمز خاص)
    glyph('uniFE92', 'U+FE92'), // رمز شكل تقديمي بلا لاحقة
    glyph('uniFE90', 'U+FE90'),
    glyph('plain', 'U+E002'),
  ];
  const q = (await importFontBuffer(await buildFontBuffer(p), 'x.otf')).project;
  const form = (n: string) => q.glyphs.find((g) => g.name === n)?.form;
  assert.equal(form('beh'), 'isolated');
  assert.equal(form('beh.init'), 'initial');
  assert.equal(form('uniFE92'), 'medial');
  assert.equal(form('uniFE90'), 'final');
  assert.equal(form('plain'), 'isolated');
});

test('imported glyphs are not reported as form mismatches (suffix or Unicode-implied form)', async () => {
  const p = createProject('Forms', 'D', '');
  p.glyphs = [glyph('beh', 'U+0628'), glyph('beh.init', 'U+FE91'), glyph('uniFE92', 'U+FE92'), glyph('beh.fina', 'U+FE90')];
  const q = (await importFontBuffer(await buildFontBuffer(p), 'x.otf')).project;
  q.source = undefined; // وضع الجداول المولَّدة، حيث يُفحص تطابق الشكل
  const warn = checkProject(q).warnings.filter((w) => w.includes('beh.init') || w.includes('uniFE92') || w.includes('beh.fina'));
  assert.deepEqual(warn.filter((w) => w.includes('لا يطابق')), []);
});
