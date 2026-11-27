import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer } from './fontBuild';
import { resolveGlyph } from './composites';
import { familyOf, planDerive } from './derive';
import type { Glyph, GlyphForm } from '../types/font';

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
const box = (id: string, x: number, y: number, w: number, h: number) => ({ id, closed: true, nodes: [nd(id + 'a', x, y), nd(id + 'b', x + w, y), nd(id + 'c', x + w, y + h), nd(id + 'd', x, y + h)] });
const pts = (g: Glyph) => g.contours.flatMap((c) => c.nodes.map((n) => `${n.x},${n.y}`)).sort();

function beh() {
  const mk = (suffix: string, form: GlyphForm, w: number, x: number) => {
    const g = createGlyph({ char: 'ب', name: 'beh.' + suffix, unicode: suffix === 'isol' ? 'U+0628' : '', category: 'letter', form });
    g.advanceWidth = w; g.contours = [box('c' + suffix, x, 100, 400, 200)];
    g.anchors = [{ id: 'a' + suffix, name: 'top', x: x + 200, y: 420 }];
    return g;
  };
  const dots = createGlyph({ char: '٭', name: 'dots2', unicode: '', category: 'symbol' });
  dots.advanceWidth = 0; dots.contours = [box('dd', 0, 0, 120, 60)];
  const other = createGlyph({ char: 'ا', name: 'alef.isol', unicode: 'U+0627', category: 'letter' });
  const p = createProject('D', 'D', '');
  p.glyphs = [mk('isol', 'isolated', 600, 50), mk('init', 'initial', 500, 0), mk('medi', 'medial', 500, 0), mk('fina', 'final', 600, 50), dots, other];
  return p;
}
const base = { name: 'teh', char: 'ت', unicode: 'U+062A' };

test('عائلة المصدر: كل الأشكال بترتيبها، والمحرف بلا لاحقة فرد واحد', () => {
  const p = beh();
  assert.deepEqual(familyOf(p.glyphs, p.glyphs[1]).members.map((m) => m.suffix), ['isol', 'init', 'medi', 'fina']);
  assert.equal(familyOf(p.glyphs, p.glyphs[4]).members.length, 1);
  assert.equal(familyOf(p.glyphs, p.glyphs[5]).base, 'alef');
  assert.equal(familyOf(p.glyphs, p.glyphs[5]).members.length, 1, 'alef.isol وحده في عائلته');
});

test('اشتقاق بالربط: محارف جديدة بأسماء الأشكال، الرمز للمنفرد وحده، والمصدر لا يتغير', () => {
  const p = beh();
  const before = JSON.stringify(p.glyphs);
  const plan = planDerive(p.glyphs, { ...base, sourceId: p.glyphs[1].id, suffixes: ['isol', 'init', 'medi', 'fina'], link: true, extra: { refId: p.glyphs[4].id, dx: 240, dy: -150 } });
  assert.equal(plan.error, null);
  assert.deepEqual(plan.glyphs.map((g) => g.name), ['teh.isol', 'teh.init', 'teh.medi', 'teh.fina']);
  assert.deepEqual(plan.glyphs.map((g) => g.unicode), ['U+062A', '', '', '']);
  assert.deepEqual(plan.glyphs.map((g) => g.form), ['isolated', 'initial', 'medial', 'final']);
  assert.deepEqual(plan.glyphs.map((g) => g.advanceWidth), [600, 500, 500, 600]);
  assert.equal(JSON.stringify(p.glyphs), before, 'لا شيء من المشروع تغيّر');
  const init = plan.glyphs[1];
  assert.equal(init.components![0].ref, p.glyphs[1].id);
  assert.deepEqual([init.components![1].dx, init.components![1].dy], [240, -150]);
  const all = { glyphs: [...p.glyphs, ...plan.glyphs] };
  const r = resolveGlyph(all, init);
  assert.equal(r.contours.length, 2);
  assert.equal(r.anchors.find((a) => a.name === 'top')!.x, 200, 'ورث ارتكاز الجسم');
});

test('تعديل مكوّنات المحرف المشتق لا يمس المصدر، وتعديل المصدر يصل المشتق', () => {
  const p = beh();
  const plan = planDerive(p.glyphs, { ...base, sourceId: p.glyphs[1].id, suffixes: ['init'], link: true, extra: { refId: p.glyphs[4].id, dx: 0, dy: 0 } });
  const g = plan.glyphs[0];
  const src = JSON.stringify(p.glyphs[1]);
  g.components![1].dx = 300; // تحريك الجزء في المشتق فقط
  assert.equal(JSON.stringify(p.glyphs[1]), src);
  assert.equal(JSON.stringify(p.glyphs[4].contours), JSON.stringify(beh().glyphs[4].contours));
  const all = { glyphs: [...p.glyphs, g] };
  p.glyphs[1].contours[0].nodes[1].x += 50; // تعديل المصدر
  assert.ok(pts(resolveGlyph(all, g)).includes('450,100'), 'تبع المشتق تعديل المصدر');
});

test('نسخة مستقلة: نفس الشكل تماماً بمعرّفات جديدة وارتكازات مثبّتة وبلا مكوّنات', () => {
  const p = beh();
  const opt = { ...base, sourceId: p.glyphs[1].id, suffixes: ['init'], extra: { refId: p.glyphs[4].id, dx: 10, dy: 20 } };
  const linked = planDerive(p.glyphs, { ...opt, link: true }).glyphs[0];
  const copy = planDerive(p.glyphs, { ...opt, link: false }).glyphs[0];
  assert.equal(copy.components, undefined);
  assert.deepEqual(pts(copy), pts(resolveGlyph({ glyphs: [...p.glyphs, linked] }, linked)));
  assert.deepEqual(copy.anchors.map((a) => [a.name, a.x, a.y]), [['top', 200, 420]]);
  const used = new Set(p.glyphs.flatMap((g) => g.contours.flatMap((c) => [c.id, ...c.nodes.map((n) => n.id)])));
  assert.ok(!copy.contours.some((c) => used.has(c.id) || c.nodes.some((n) => used.has(n.id))));
  // تعديل المصدر لا يصل النسخة
  p.glyphs[1].contours[0].nodes[1].x += 50;
  assert.ok(!pts(copy).includes('450,100'));
});

test('أخطاء آمنة: اسم أو رمز مكرر أو اسم غير صالح لا يُنشئ شيئاً', () => {
  const p = beh();
  const o = { ...base, sourceId: p.glyphs[1].id, suffixes: ['isol', 'init'], link: true };
  assert.match(planDerive(p.glyphs, { ...o, unicode: 'U+0628' }).error!, /teh\.isol/);
  assert.notEqual(planDerive(p.glyphs, { ...o, name: 'beh' }).error, null);
  assert.notEqual(planDerive(p.glyphs, { ...o, name: '1bad' }).error, null);
  assert.equal(planDerive(p.glyphs, { ...o, name: 'beh' }).glyphs.length, 0);
  assert.equal(planDerive(p.glyphs, { ...o, char: '' }).error !== null, true);
});

test('اشتقاق من مشتق (تسلسل): الوراثة والرسم يتراكمان', () => {
  const p = beh();
  const a = planDerive(p.glyphs, { ...base, sourceId: p.glyphs[1].id, suffixes: ['init'], link: true }).glyphs;
  const all = [...p.glyphs, ...a];
  const b = planDerive(all, { name: 'theh', char: 'ث', unicode: '', sourceId: a[0].id, suffixes: ['init'], link: true, extra: { refId: p.glyphs[4].id, dx: 0, dy: 0 } });
  assert.equal(b.error, null);
  const r = resolveGlyph({ glyphs: [...all, ...b.glyphs] }, b.glyphs[0]);
  assert.equal(r.contours.length, 2);
  assert.equal(r.anchors.length, 1);
});

const probe = spawnSync('python3', ['-I', '-c', 'import fontTools'], { encoding: 'utf8' });
const SKIP = !probe.error && probe.status === 0 ? false : 'fontTools غير متوفرة';
test('التصدير: المشتق (ربطاً) يطابق المشتق نسخةً مستقلة نقطة بنقطة، والمصدر كما كان', { skip: SKIP }, async () => {
  const dump = async (glyphs: Glyph[]) => {
    const pr = beh(); pr.glyphs = glyphs;
    const file = join(mkdtempSync(join(tmpdir(), 'dv-')), 'f.otf');
    writeFileSync(file, Buffer.from(await buildFontBuffer(pr)));
    const py = `import sys,json
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
f=TTFont(sys.argv[1]);gs=f.getGlyphSet();o={}
for n in f.getGlyphOrder():
    p=RecordingPen();gs[n].draw(p);o[n]=p.value
print(json.dumps(o))`;
    const r = spawnSync('python3', ['-I', '-c', py, file], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout) as Record<string, unknown>;
  };
  const p = beh();
  const opt = { ...base, sourceId: p.glyphs[1].id, suffixes: ['isol', 'init', 'medi', 'fina'], extra: { refId: p.glyphs[4].id, dx: 240, dy: -150 } };
  const linked = planDerive(p.glyphs, { ...opt, link: true }).glyphs;
  const copy = planDerive(p.glyphs, { ...opt, link: false }).glyphs;
  const a = await dump([...p.glyphs, ...linked]);
  const b = await dump([...p.glyphs, ...copy]);
  const plain = await dump(p.glyphs);
  for (const n of ['teh.isol', 'teh.init', 'teh.medi', 'teh.fina']) assert.deepEqual(a[n], b[n], n);
  for (const n of ['beh.isol', 'beh.init', 'beh.medi', 'beh.fina', 'alef.isol']) assert.deepEqual(a[n], plain[n], 'المصدر ' + n);
});
