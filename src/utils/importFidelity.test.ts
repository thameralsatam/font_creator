import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, importFontBuffer } from './fontBuild';
import type { FontProject, Glyph } from '../types/font';

/* اختبارات «أمانة الاستيراد»: خط يأتي من برنامج آخر يجب أن يخرج بخصائصه، وخط جديد يخرج صحيحاً.
   تُبنى الخطوط هنا بلا أي ملف خارجي، وتُعدَّل بمكتبة fontTools لتحاكي خطاً احترافياً. */

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
function glyph(name: string, ch: string, unicode: string, w = 600): Glyph {
  const g = createGlyph({ char: ch, name, unicode, category: 'letter' });
  g.advanceWidth = w;
  g.contours = [{ id: 'c' + name, closed: true, nodes: [nd('a', 80, 0), nd('b', w - 40, 0), nd('c', w - 40, 700), nd('d', 80, 700)] }];
  return g;
}
const ARABIC_CORE = [...Array(0x63a - 0x621 + 1).keys()].map((i) => 0x621 + i).concat([...Array(0x64a - 0x641 + 1).keys()].map((i) => 0x641 + i));
function arabicProject(): FontProject {
  const p = createProject('Fidelity', 'D', '');
  p.glyphs = ARABIC_CORE.map((c) => glyph('u' + c.toString(16), String.fromCodePoint(c), 'U+' + c.toString(16).toUpperCase().padStart(4, '0')));
  p.glyphs.push(glyph('space', ' ', 'U+0020', 300));
  return p;
}

const probe = spawnSync('python3', ['-I', '-c', 'import fontTools'], { encoding: 'utf8' });
const SKIP = !probe.error && probe.status === 0 ? false : 'python3 أو fontTools غير متوفرة';
function py(code: string, ...args: string[]): any {
  const r = spawnSync('python3', ['-I', '-c', code, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, `فشل بايثون:\n${r.stderr}`);
  return JSON.parse(r.stdout);
}
const tmp = () => mkdtempSync(join(tmpdir(), 'fid-'));
const toAB = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

/** يحاكي خطاً أجنبياً: قيم OS/2 وأسماء إضافية و.notdef مخصص. */
const PATCH = `
import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.t2CharStringPen import T2CharStringPen
src, dst, notdef = sys.argv[1], sys.argv[2], sys.argv[3]
f = TTFont(src)
o = f['OS/2']
o.usWinAscent, o.usWinDescent = 1500, 500
o.ulCodePageRange1, o.ulCodePageRange2 = 0x20000153, 0
o.achVendID = 'ABCD'
o.fsType = 4
n = f['name']
n.setName('example.com', 11, 3, 1, 0x409)
n.setName('Stylistic Set One', 256, 3, 1, 0x409)
n.setName('A trademark', 7, 3, 1, 0x409)
cff = f['CFF '].cff; top = cff.topDictIndex[0]; cs = top.CharStrings
pen = T2CharStringPen(500, None)
if notdef == 'box':
    pen.moveTo((100, 0)); pen.lineTo((100, 900)); pen.lineTo((400, 900)); pen.lineTo((400, 0)); pen.closePath()
cs['.notdef'] = pen.getCharString(private=top.Private, globalSubrs=cff.GlobalSubrs)
f.save(dst)
`;
const INSPECT = `
import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
f = TTFont(sys.argv[1]); o = f['OS/2']; gs = f.getGlyphSet()
names = {r.nameID: r.toUnicode() for r in f['name'].names if r.platformID == 3}
lsb = {}
for g in f.getGlyphOrder():
    bp = BoundsPen(gs); gs[g].draw(bp)
    if bp.bounds: lsb[g] = [f['hmtx'][g][1], round(bp.bounds[0])]
nb = BoundsPen(gs); gs['.notdef'].draw(nb)
print(json.dumps({'win': [o.usWinAscent, o.usWinDescent], 'cp': [o.ulCodePageRange1, o.ulCodePageRange2], 'vendor': o.achVendID,
  'fsType': o.fsType, 'names': names, 'lsb': lsb, 'notdef': nb.bounds, 'ascent': f['hhea'].ascent}))
`;

async function build(p: FontProject): Promise<string> {
  const file = join(tmp(), 'f.otf');
  writeFileSync(file, Buffer.from(await buildFontBuffer(p)));
  return file;
}
async function foreign(notdef: 'empty' | 'box'): Promise<ArrayBuffer> {
  const a = await build(arabicProject());
  const b = join(tmp(), 'foreign.otf');
  const r = spawnSync('python3', ['-I', '-c', PATCH, a, b, notdef], { encoding: 'utf8' });
  assert.equal(r.status, 0, `تعديل الخط فشل:\n${r.stderr}`);
  return toAB(readFileSync(b));
}
const reimport = async (ab: ArrayBuffer) => (await importFontBuffer(ab, 'x.otf')).project;

test('hmtx: left side bearing equals the glyph xMin (CFF)', { skip: SKIP }, async () => {
  const o = py(INSPECT, await build(arabicProject()));
  const bad = Object.entries(o.lsb as Record<string, [number, number]>).filter(([, [lsb, xmin]]) => lsb !== xmin);
  assert.deepEqual(bad.slice(0, 5), [], `lsb يخالف xMin في ${bad.length} محرفاً`);
});

test('OS/2 code pages: a font with Arabic letters declares Arabic (1256), computed from its cmap', { skip: SKIP }, async () => {
  const o = py(INSPECT, await build(arabicProject()));
  assert.ok(o.cp[0] & (1 << 6), 'ARABIC code page bit');
  const few = arabicProject();
  few.glyphs = few.glyphs.slice(0, 3);
  assert.equal(py(INSPECT, await build(few)).cp[0] & (1 << 6), 0, 'three letters do not claim the Arabic code page');
});

test('name table: no blank placeholder records in a new font', { skip: SKIP }, async () => {
  const o = py(INSPECT, await build(arabicProject()));
  const blank = Object.entries(o.names as Record<string, string>).filter(([, v]) => v.trim() === '');
  assert.deepEqual(blank, []);
});

test('import → export keeps unmanaged name records (feature names, vendor URL, trademark)', { skip: SKIP }, async () => {
  const p = await reimport(await foreign('empty'));
  const o = py(INSPECT, await build(p));
  assert.equal(o.names['11'], 'example.com');
  assert.equal(o.names['256'], 'Stylistic Set One');
  assert.equal(o.names['7'], 'A trademark');
});

test('import → export keeps designer OS/2 values (win metrics, code pages, vendor, embedding flags)', { skip: SKIP }, async () => {
  const p = await reimport(await foreign('empty'));
  const o = py(INSPECT, await build(p));
  assert.deepEqual(o.win, [1500, 500]);
  assert.deepEqual(o.cp, [0x20000153, 0]);
  assert.equal(o.vendor, 'ABCD');
  assert.equal(o.fsType, 4);
});

test('changing the project metrics explicitly recomputes the win metrics', { skip: SKIP }, async () => {
  const p = await reimport(await foreign('empty'));
  p.metrics = { ...p.metrics, ascender: p.metrics.ascender + 300 };
  const o = py(INSPECT, await build(p));
  assert.ok(o.win[0] >= p.metrics.ascender, `${o.win[0]} < ${p.metrics.ascender}`);
});

test('import → export keeps the original .notdef (empty stays empty, custom stays custom)', { skip: SKIP }, async () => {
  const empty = py(INSPECT, await build(await reimport(await foreign('empty'))));
  assert.equal(empty.notdef, null, 'empty .notdef stays empty');
  const box = py(INSPECT, await build(await reimport(await foreign('box'))));
  assert.deepEqual(box.notdef, [100, 0, 400, 900]);
});
