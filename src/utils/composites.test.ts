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

/* ---------------- المرحلة 2: عمليات الواجهة والعرض ---------------- */
import { addComponent, moveComponent, detachOne, resolveAll } from './composites';
import { buildFontBuffer as build } from './fontBuild';

const pts = (g: Glyph) => g.contours.flatMap((c) => c.nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`)).sort();

test('addComponent: يضيف بإزاحة صفر، ويرفض الدورة والمرجع المجهول، ولا يغيّر المصدر', () => {
  const { composite, teh, dot } = projects();
  const alef = composite.glyphs[0];
  const g = addComponent(composite, alef, dot.id)!;
  assert.equal(g.components!.length, 1);
  assert.deepEqual([g.components![0].dx, g.components![0].dy], [0, 0]);
  assert.equal(addComponent(composite, alef, 'nope'), null);
  assert.equal(addComponent(composite, dot, teh.id), null, 'teh يعتمد على dot، فإضافة teh إلى dot دورة');
  assert.equal(addComponent(composite, dot, dot.id), null, 'المحرف لا يعتمد على نفسه');
  assert.equal(dot.contours.length, 1);
});

test('moveComponent: الإزاحة نسبية وتتراكم، والمحرف المرجعي لا يتحرك', () => {
  const { composite, teh, dot } = projects();
  const before = JSON.stringify(dot.contours);
  let g = moveComponent(teh, 'k1', 10, 0);
  g = moveComponent(g, 'k1', 0, -30);
  assert.deepEqual([g.components![0].dx, g.components![0].dy], [260, 370]);
  const r = resolveGlyph({ glyphs: [dot, g] }, g);
  assert.equal(r.contours[1].nodes[0].x, 260);
  assert.equal(r.contours[1].nodes[0].y, 370);
  assert.equal(JSON.stringify(dot.contours), before);
  assert.ok(composite);
});

test('detachOne: يفك مكوّناً واحداً بالشكل نفسه ويبقي الآخر', () => {
  const { composite, teh, dot } = projects();
  teh.components = [...teh.components!, { id: 'k2', ref: dot.id, dx: 100, dy: 400 }];
  const before = pts(resolveGlyph(composite, teh));
  const d = detachOne(composite, teh, 'k1');
  assert.deepEqual(d.components!.map((c) => c.id), ['k2']);
  assert.equal(d.contours.length, 2);
  assert.deepEqual(pts(resolveGlyph({ glyphs: composite.glyphs.map((x) => (x.id === d.id ? d : x)) }, d)), before);
  const all = detachOne(composite, d, 'k2');
  assert.equal(all.components, undefined);
  assert.deepEqual(pts(all), before);
});

test('الحذف: التراجع يعيد المكوّنات الأصلية (relink) والحذف لا يغيّر شكل المعتمد', () => {
  const { composite, teh, dot } = projects();
  const shapeBefore = pts(resolveGlyph(composite, teh));
  const { glyphs } = removeWithDetach(composite, [dot.id]);
  const detached = glyphs.find((g) => g.id === teh.id)!;
  assert.equal(detached.components, undefined);
  assert.deepEqual(pts(detached), shapeBefore);
  // المحارف العادية لم تُمس (الكائن نفسه)
  assert.equal(glyphs.find((g) => g.name === 'alef'), composite.glyphs[0]);
});

test('العرض = التصدير: نقاط resolveAll تطابق نقاط الخط المصدَّر لكل محرف (عادي ومركّب)', { skip: SKIP }, async () => {
  const { composite } = projects();
  const outl = await dump(composite);
  for (const g of resolveAll(composite)) {
    if (g.name === 'dot') continue; // مساعد داخلي لا يُصدَّر
    const shown = new Set(pts(g).map((s) => s));
    const fo = (outl.glyphs[g.name] as Array<[string, number[][]]>).flatMap(([, a]) => a.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`));
    // كل نقطة مرسومة على الشاشة موجودة في الملف، والعكس للنقاط على المنحنى
    for (const s of shown) assert.ok(fo.includes(s), `${g.name}: ${s} غائبة من الملف`);
  }
  const reimported = (await importFontBuffer(await build(composite), 'c.otf')).project;
  assert.equal(reimported.glyphs.find((g) => g.name === 'teh')!.contours.length, 2);
});

/* ---------------- المرحلة 3: وراثة الارتكاز ---------------- */
import { inheritedAnchors, glyphsForCopy } from './composites';
import { copyGlyphsInto } from './glyphLogic';
import { exportAnchorChecks } from './exportChecks';

const anc = (name: string, x: number, y: number) => ({ id: 'a-' + name + x, name, x, y });

/** بـ بجسمها (ارتكازا top وbottom) وت تشتق منه بمكوّن الجسم أولاً ثم نقطتين. */
function anchored() {
  const base = createGlyph({ char: 'ب', name: 'beh', unicode: 'U+0628', category: 'letter' });
  base.advanceWidth = 600; base.contours = [box('b', 50, 100, 500, 200)];
  base.anchors = [anc('top', 300, 420), anc('bottom', 300, -60)];
  const dots = createGlyph({ char: '.', name: 'dots', unicode: '', category: 'symbol' });
  dots.advanceWidth = 0; dots.contours = [blob('d', 0, 0)];
  dots.anchors = [anc('top', 5, 5)]; // ارتكاز في الجزء الثاني لا يجب أن يُورَّث
  const teh = createGlyph({ char: 'ت', name: 'teh', unicode: 'U+062A', category: 'letter' });
  teh.advanceWidth = 600;
  teh.components = [
    { id: 'c1', ref: base.id, dx: 20, dy: 0 },
    { id: 'c2', ref: dots.id, dx: 250, dy: 400 },
  ];
  const fatha = createGlyph({ char: 'َ', name: 'fatha', unicode: 'U+064E', category: 'diacritic' });
  fatha.advanceWidth = 0; fatha.contours = [box('f', -100, 800, 200, 60)];
  fatha.anchors = [anc('top', 0, 800)];
  const pr = createProject('A', 'D', ''); pr.glyphs = [base, dots, teh, fatha];
  return { pr, base, dots, teh, fatha };
}

test('وراثة الارتكاز: من أول مكوّن فقط، مزاحاً بإزاحته، وبمعرّفات مشتقة', () => {
  const { pr, teh } = anchored();
  const r = resolveGlyph(pr, teh);
  assert.deepEqual(r.anchors.map((a) => [a.name, a.x, a.y]).sort(), [['bottom', 320, -60], ['top', 320, 420]]);
  assert.ok(r.anchors.every((a) => a.id.startsWith('c1:')));
  assert.deepEqual(inheritedAnchors(pr, teh).length, 2);
  assert.equal(teh.anchors.length, 0, 'المحرف نفسه لا يتغير');
});

test('الارتكاز الخاص بالاسم يتغلب على الموروث، ويبقى الباقي موروثاً', () => {
  const { pr, teh } = anchored();
  teh.anchors = [anc('top', 300, 650)];
  const r = resolveGlyph(pr, teh);
  const by = Object.fromEntries(r.anchors.map((a) => [a.name, [a.x, a.y]]));
  assert.deepEqual(by.top, [300, 650]);
  assert.deepEqual(by.bottom, [320, -60]);
  assert.equal(r.anchors.filter((a) => a.name === 'top').length, 1);
  assert.deepEqual(inheritedAnchors(pr, teh).map((a) => a.name), ['bottom']);
});

test('الوراثة متسلسلة، والدورة والمرجع المعلّق لا يكسران', () => {
  const { pr, base, teh } = anchored();
  const theh = createGlyph({ char: 'ث', name: 'theh', unicode: 'U+062B', category: 'letter' });
  theh.components = [{ id: 'z', ref: teh.id, dx: 10, dy: 5 }];
  pr.glyphs.push(theh);
  const top = resolveGlyph(pr, theh).anchors.find((a) => a.name === 'top')!;
  assert.deepEqual([top.x, top.y], [330, 425]);
  base.components = [{ id: 'cyc', ref: theh.id, dx: 0, dy: 0 }];
  assert.ok(resolveGlyph(pr, theh).anchors.length >= 0);
  teh.components = [{ id: 'm', ref: 'missing', dx: 0, dy: 0 }];
  assert.deepEqual(resolveGlyph(pr, teh).anchors, []);
});

test('المحرف العادي: ارتكازاته كما هي (الكائن نفسه) بلا وراثة', () => {
  const { pr, base } = anchored();
  assert.equal(resolveGlyph(pr, base), base);
  assert.equal(resolveAll(pr)[0], base);
});

test('فك أول مكوّن يثبّت الارتكازات الموروثة، وفك الثاني لا يمسها', () => {
  const { pr, teh } = anchored();
  const before = resolveGlyph(pr, teh).anchors.map((a) => [a.name, a.x, a.y]).sort();
  const second = detachOne(pr, teh, 'c2');
  assert.deepEqual(second.anchors, [], 'ما زال الوارث الأول، والارتكازات تأتي منه');
  assert.deepEqual(resolveGlyph(pr, second).anchors.map((a) => [a.name, a.x, a.y]).sort(), before);
  const first = detachOne(pr, teh, 'c1');
  assert.deepEqual(first.anchors.map((a) => [a.name, a.x, a.y]).sort(), before, 'ثُبّتت ارتكازاتٍ خاصة');
  const all = detachComponents(pr, teh);
  assert.deepEqual(all.anchors.map((a) => [a.name, a.x, a.y]).sort(), before);
  // حذف المصدر يفك المعتمدين فلا تضيع علامات التشكيل
  const { glyphs } = removeWithDetach(pr, [pr.glyphs[0].id]);
  const t2 = glyphs.find((g) => g.id === teh.id)!;
  assert.deepEqual(resolveGlyph({ glyphs }, t2).anchors.map((a) => [a.name, a.x, a.y]).sort(), before);
});

test('فحص ما قبل التصدير يرى الارتكاز الموروث، وبدونه يحذّر', () => {
  const { pr, teh } = anchored();
  const okMsgs = exportAnchorChecks(pr).join('\n');
  assert.ok(!okMsgs.includes('teh'), okMsgs);
  // كسر الوراثة (مكوّن أول بلا ارتكاز) يُظهر التحذير
  pr.glyphs[0].anchors = [];
  const msgs = exportAnchorChecks(pr).join('\n');
  assert.ok(msgs.includes('teh') && msgs.includes('beh'), msgs);
  assert.ok(teh);
});

test('التصدير والتموضع: الفتحة تقف فوق «ت» المركّبة بارتكازها الموروث كما لو رُسمت يدوياً', { skip: SKIP }, async () => {
  const { pr, teh } = anchored();
  const manual = structuredClone(pr);
  const mt = manual.glyphs.find((g) => g.name === 'teh')!;
  mt.contours = [box('b', 70, 100, 500, 200), blob('d', 250, 400)];
  mt.components = undefined;
  mt.anchors = [anc('top', 320, 420), anc('bottom', 320, -60)];
  const SHAPE = `
import sys,json,uharfbuzz as hb
d=open(sys.argv[1],'rb').read();f=hb.Font(hb.Face(d))
b=hb.Buffer();b.add_str('\\u062a\\u064e');b.guess_segment_properties();hb.shape(f,b,{'mark':True,'mkmk':True})
print(json.dumps([[i.codepoint,p.x_advance,p.x_offset,p.y_offset] for i,p in zip(b.glyph_infos,b.glyph_positions)]))`;
  const shape = async (p: FontProject) => {
    const file = join(mkdtempSync(join(tmpdir(), 'anc-')), 'f.otf');
    writeFileSync(file, Buffer.from(await buildFontBuffer(p)));
    const r = spawnSync('python3', ['-I', '-c', SHAPE, file], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout);
  };
  const a = await shape(pr);
  const b = await shape(manual);
  assert.deepEqual(a, b);
  assert.ok(a.some((g: number[]) => g[2] !== 0 || g[3] !== 0), 'العلامة تحركت فعلاً: ' + JSON.stringify(a));
  assert.ok(teh);
});

test('النسخ إلى مشروع آخر: المحرف المركّب يصل بشكله الكامل وارتكازاته، بلا مراجع معلّقة', () => {
  const { pr, teh } = anchored();
  teh.contours = [box('own', 0, 0, 10, 10)];
  const other = createProject('O', 'D', '');
  const res = copyGlyphsInto(other.glyphs, glyphsForCopy(pr, [teh.id]), false);
  const got = res.glyphs.find((g) => g.name === 'teh')!;
  assert.equal(got.components, undefined);
  assert.equal(got.contours.length, 1 + 1 + 1, 'خاص + جسم + نقاط');
  assert.deepEqual(got.anchors.map((a) => a.name).sort(), ['bottom', 'top']);
  assert.deepEqual(pts(got), pts(resolveGlyph(pr, teh)));
  // قبل الإصلاح: النسخ الخام يترك مرجعاً معلّقاً فيضيع الرسم المكوَّن
  const raw = copyGlyphsInto(createProject('O2', 'D', '').glyphs, [teh], false).glyphs.find((g) => g.name === 'teh')!;
  assert.equal(resolveGlyph({ glyphs: [raw] }, raw).contours.length, 1);
});
