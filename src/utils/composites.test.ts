import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, checkProject, importFontBuffer } from './fontBuild';
import { dependentsOf, detachComponents, removeWithDetach, resolveGlyph, wouldCycle } from './composites';
import { glyphToSvg } from './svgGlyph';
import type { FontProject, Glyph } from '../types/font';

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
const curve = (id: string, x: number, y: number) => ({ id, x, y, kind: 'smooth' as const, handleIn: { x: x - 20, y }, handleOut: { x: x + 20, y } });
const box = (id: string, x: number, y: number, w: number, h: number) => ({
  id, closed: true, nodes: [nd(id + 'a', x, y), nd(id + 'b', x + w, y), nd(id + 'c', x + w, y + h), nd(id + 'd', x, y + h)],
});
const blob = (id: string, x: number, y: number) => ({
  id, closed: true, nodes: [curve(id + 'a', x, y), nd(id + 'b', x + 100, y), curve(id + 'c', x + 100, y + 100), nd(id + 'd', x, y + 100)],
});

const probe = spawnSync('python3', ['-I', '-c', 'import fontTools'], { encoding: 'utf8' });
const SKIP = !probe.error && probe.status === 0 ? false : 'python3 أو fontTools غير متوفرة';

const PY = `
import json, sys
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
f = TTFont(sys.argv[1]); gs = f.getGlyphSet(); cmap = f.getBestCmap()
out = {}
for n in f.getGlyphOrder():
    p = RecordingPen(); gs[n].draw(p)
    out[n] = [[op, [list(map(float, pt)) for pt in args]] for op, args in p.value]
print(json.dumps({'glyphs': out, 'order': f.getGlyphOrder(), 'cmap': {str(k): v for k, v in cmap.items()}}))
`;
async function dump(p: FontProject) {
  const file = join(mkdtempSync(join(tmpdir(), 'comp-')), 'f.otf');
  writeFileSync(file, Buffer.from(await buildFontBuffer(p)));
  const r = spawnSync('python3', ['-I', '-c', PY, file], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout) as { glyphs: Record<string, unknown>; order: string[]; cmap: Record<string, string> };
}

/** بـ (جسم + نقطة بمكوّن) مقابل نسخة مرسومة يدوياً، ومعها حرف عادي لا يتأثر. */
function projects() {
  const dot = createGlyph({ char: '.', name: 'dot', unicode: '', category: 'symbol' });
  dot.advanceWidth = 0; dot.contours = [blob('d', 0, 0)];
  const body = createGlyph({ char: 'ب', name: 'beh', unicode: 'U+0628', category: 'letter' });
  body.advanceWidth = 600; body.contours = [box('b', 50, 100, 500, 200)];
  const teh = createGlyph({ char: 'ت', name: 'teh', unicode: 'U+062A', category: 'letter' });
  teh.advanceWidth = 600; teh.contours = [box('b', 50, 100, 500, 200)];
  teh.components = [{ id: 'k1', ref: dot.id, dx: 250, dy: 400 }];
  const alef = createGlyph({ char: 'ا', name: 'alef', unicode: 'U+0627', category: 'letter' });
  alef.advanceWidth = 300; alef.contours = [box('a', 100, 0, 100, 700)];
  const composite = createProject('C', 'D', '');
  composite.glyphs = [alef, body, teh, dot];

  const dot2 = createGlyph({ char: '.', name: 'dot', unicode: '', category: 'symbol' });
  dot2.advanceWidth = 0; dot2.contours = [blob('d', 0, 0)];
  const teh2 = createGlyph({ char: 'ت', name: 'teh', unicode: 'U+062A', category: 'letter' });
  teh2.advanceWidth = 600; teh2.contours = [box('b', 50, 100, 500, 200), blob('d', 250, 400)];
  const manual = createProject('C', 'D', '');
  manual.glyphs = [{ ...alef }, { ...body }, teh2, dot2];
  return { composite, manual, dot, teh };
}

test('resolveGlyph: بلا مكوّنات يعيد المحرف نفسه، ومعها يضيف المسارات مزاحة بالمقابض', () => {
  const { composite } = projects();
  const alef = composite.glyphs[0];
  assert.equal(resolveGlyph(composite, alef), alef);
  const r = resolveGlyph(composite, composite.glyphs[2]);
  assert.equal(r.contours.length, 2);
  assert.equal(r.contours[1].nodes[0].x, 250);
  assert.equal(r.contours[1].nodes[0].y, 400);
  assert.deepEqual(r.contours[1].nodes[0].handleOut, { x: 270, y: 400 });
  assert.equal(composite.glyphs[2].contours.length, 1, 'الأصل لا يتغير');
});

test('مرجع معلّق أو دائري لا يُسقط الحل', () => {
  const { composite, teh, dot } = projects();
  teh.components = [{ id: 'x', ref: 'missing', dx: 0, dy: 0 }];
  assert.equal(resolveGlyph(composite, teh).contours.length, 1);
  dot.components = [{ id: 'y', ref: teh.id, dx: 0, dy: 0 }];
  teh.components = [{ id: 'z', ref: dot.id, dx: 0, dy: 0 }];
  assert.ok(resolveGlyph(composite, teh).contours.length >= 1);
  assert.ok(wouldCycle(composite, teh.id, teh.id));
  assert.ok(wouldCycle(composite, dot.id, teh.id));
});

test('مكوّن داخل مكوّن يتراكم بإزاحتيه', () => {
  const { composite, teh, dot } = projects();
  const outer = createGlyph({ char: 'ث', name: 'theh', unicode: 'U+062B', category: 'letter' });
  outer.components = [{ id: 'o', ref: teh.id, dx: 10, dy: 20 }];
  composite.glyphs.push(outer);
  const r = resolveGlyph(composite, outer);
  assert.equal(r.contours.length, 2);
  assert.equal(r.contours[1].nodes[0].x, 10 + 250);
  assert.equal(r.contours[1].nodes[0].y, 20 + 400);
  assert.ok(dot);
});

test('التصدير: محرف بمكوّن يطابق نقطة بنقطة محرفاً مرسوماً يدوياً، والمساعد الداخلي لا يُصدَّر', { skip: SKIP }, async () => {
  const { composite, manual } = projects();
  const a = await dump(composite);
  const b = await dump(manual);
  assert.deepEqual(a.glyphs.teh, b.glyphs.teh);
  assert.deepEqual(a.glyphs.beh, b.glyphs.beh);
  assert.deepEqual(a.glyphs.alef, b.glyphs.alef);
  assert.ok(!a.order.includes('dot'), 'النقطة بلا رمز ولا استعمال مستقل: مساعد داخلي لا يُصدَّر');
  assert.ok(b.order.includes('dot'));
  assert.equal(a.cmap['1578'], 'teh');
});

test('المحرف المصدر يبقى في الخط إن كان له رمز أو استعمال مستقل', { skip: SKIP }, async () => {
  const withCode = projects().composite;
  withCode.glyphs[3].unicode = 'U+002E';
  assert.ok((await dump(withCode)).order.includes('dot'));
  const withKern = projects().composite;
  withKern.kerning = [{ id: 'k', left: 'dot', right: 'alef', value: -20 }] as typeof withKern.kerning;
  assert.ok((await dump(withKern)).order.includes('dot'));
});

test('فك الارتباط يحفظ الشكل تماماً، ومعرّفاته جديدة', () => {
  const { composite, teh } = projects();
  const before = resolveGlyph(composite, teh);
  const d = detachComponents(composite, teh);
  assert.equal(d.components, undefined);
  const strip = (g: Glyph) => g.contours.map((c) => c.nodes.map((n) => [n.x, n.y, n.handleIn, n.handleOut, n.kind]));
  assert.deepEqual(strip(d), strip(before));
  const ids = new Set(composite.glyphs.flatMap((g) => g.contours.flatMap((c) => [c.id, ...c.nodes.map((n) => n.id)])));
  assert.ok(!d.contours[1].nodes.some((n) => ids.has(n.id)) && !ids.has(d.contours[1].id));
});

test('حذف المصدر: تُفك المحارف المعتمدة عليه فيبقى شكلها كما هو', { skip: SKIP }, async () => {
  const { composite, teh, dot } = projects();
  assert.deepEqual(dependentsOf(composite, dot.id).map((g) => g.name), ['teh']);
  const before = (await dump(composite)).glyphs.teh;
  const { glyphs, detached } = removeWithDetach(composite, [dot.id]);
  assert.deepEqual(detached.map((g) => g.name), ['teh']);
  assert.ok(!glyphs.some((g) => g.id === dot.id));
  const after = await dump({ ...composite, glyphs });
  assert.deepEqual(after.glyphs.teh, before);
  assert.ok(teh);
});

test('الفحص لا يحذّر من المساعد الداخلي بلا رمز، ويحذّر من محرف عادي بلا رمز', () => {
  const { composite } = projects();
  const w = checkProject(composite).warnings.join('\n');
  assert.ok(!w.includes('dot'), w);
  const loose = createGlyph({ char: 'x', name: 'loose', unicode: '', category: 'symbol' });
  loose.contours = [box('l', 0, 0, 50, 50)];
  composite.glyphs.push(loose);
  assert.ok(checkProject(composite).warnings.join('\n').includes('loose'));
});

test('SVG يتضمن المكوّنات عند حله', () => {
  const { composite, teh } = projects();
  const own = glyphToSvg(teh, composite.metrics);
  const full = glyphToSvg(resolveGlyph(composite, teh), composite.metrics);
  assert.ok(full.length > own.length);
});

test('تصدير ثم استيراد: يعود محرفاً عادياً بالرسم المسطّح بلا مكوّنات', { skip: SKIP }, async () => {
  const { composite } = projects();
  const buf = await buildFontBuffer(composite);
  const back = (await importFontBuffer(buf, 'c.otf')).project;
  const teh = back.glyphs.find((g) => g.name === 'teh')!;
  assert.equal(teh.components, undefined);
  assert.equal(teh.contours.length, 2);
  const again = await dump(back);
  const orig = await dump(composite);
  assert.deepEqual(again.glyphs.teh, orig.glyphs.teh);
  assert.deepEqual(again.glyphs.alef, orig.glyphs.alef);
});
