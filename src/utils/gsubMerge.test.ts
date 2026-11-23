import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, importFontBuffer } from './fontBuild';
import type { FontProject, Glyph, GlyphForm } from '../types/font';

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
const box = (k: string, w: number) => ({ id: 'c' + k, closed: true, nodes: [nd(k + 'a', 50, 0), nd(k + 'b', w - 50, 0), nd(k + 'c', w - 50, 600), nd(k + 'd', 50, 600)] });

function glyph(name: string, ch: string, unicode: string, category: Glyph['category'], form?: GlyphForm, w = 600): Glyph {
  const g = createGlyph({ char: ch, name, unicode, category, ...(form ? { form } : {}) });
  g.advanceWidth = w;
  g.contours = [box(name, w)];
  return g;
}
const FORM: Record<string, GlyphForm> = { init: 'initial', medi: 'medial', fina: 'final' };
function letter(base: string, ch: string, code: number, forms: Record<string, number>): Glyph[] {
  const hex = (n: number) => 'U+' + n.toString(16).toUpperCase().padStart(4, '0');
  return [
    glyph(base, ch, hex(code), 'letter'),
    ...Object.entries(forms).map(([s, c]) => glyph(`${base}.${s}`, '', hex(c), 'letter', FORM[s])),
  ];
}

/** خط أصلي: beh وalef وlam بأشكالها، مع حرف مركّب lam_alef. */
function baseProject(): FontProject {
  const p = createProject('Merge Test', 'D', '');
  p.glyphs = [
    ...letter('beh', 'ب', 0x628, { init: 0xfe91, medi: 0xfe92, fina: 0xfe90 }),
    ...letter('alef', 'ا', 0x627, { fina: 0xfe8e }),
    ...letter('lam', 'ل', 0x644, { init: 0xfedf, medi: 0xfee0, fina: 0xfede }),
    glyph('lam_alef', '', 'U+FEFB', 'ligature', 'isolated', 700),
    glyph('space', ' ', 'U+0020', 'symbol', undefined, 300),
  ];
  return p;
}

const SHAPE = `
import sys, json
import uharfbuzz as hb
font = hb.Font(hb.Face(hb.Blob.from_file_path(sys.argv[1])))
out = {}
for t in sys.argv[2:]:
    b = hb.Buffer(); b.add_str(t); b.guess_segment_properties(); hb.shape(font, b, {})
    out[t] = [font.glyph_to_string(i.codepoint) for i in b.glyph_infos]
print(json.dumps(out, ensure_ascii=False))
`;
const LAYOUT = `
import sys, json
from fontTools.ttLib import TTFont
g = TTFont(sys.argv[1])['GSUB'].table
print(json.dumps({
  'lookups': g.LookupList.LookupCount,
  'features': [[r.FeatureTag, list(r.Feature.LookupListIndex)] for r in g.FeatureList.FeatureRecord],
  'scripts': [r.ScriptTag for r in g.ScriptList.ScriptRecord],
}))
`;

const probe = spawnSync('python3', ['-I', '-c', 'import fontTools, uharfbuzz'], { encoding: 'utf8' });
const SKIP = !probe.error && probe.status === 0 ? false : 'python3 أو fontTools أو uharfbuzz غير متوفرة';

function py(code: string, file: string, ...args: string[]): any {
  const r = spawnSync('python3', ['-I', '-c', code, file, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, `فشل فحص بايثون:\n${r.stderr}`);
  return JSON.parse(r.stdout);
}

async function write(p: FontProject): Promise<string> {
  const file = join(mkdtempSync(join(tmpdir(), 'gsub-')), 'f.otf');
  writeFileSync(file, Buffer.from(await buildFontBuffer(p)));
  return file;
}

async function imported(p: FontProject): Promise<FontProject> {
  const buf = await buildFontBuffer(p);
  const q = (await importFontBuffer(buf, 'x.otf')).project;
  assert.equal(q.source?.useOriginal, true, 'الخط المستورد يحتفظ بجداوله الأصلية');
  return q;
}

test('imported font keeps its tables: new Arabic letter with forms and a ligature connects (HarfBuzz)', { skip: SKIP }, async () => {
  const before = await write(baseProject());
  const orig = py(LAYOUT, before);

  const q = await imported(baseProject());
  q.glyphs.push(
    ...letter('peh', 'پ', 0x67e, { init: 0xfb58, medi: 0xfb59, fina: 0xfb57 }),
    glyph('peh_alef', '', 'U+E000', 'ligature', 'isolated', 700)
  );
  const file = await write(q);
  const s = py(SHAPE, file, 'پپپ', 'بپ', 'پب', 'پا', 'ببب', 'لا', 'الله'.replace('ه', 'ل'), 'پ');

  // الحرف الجديد يتصل بأشكاله (العرض بترتيب المخرجات: من اليمين)
  assert.deepEqual(s['پپپ'], ['peh.fina', 'peh.medi', 'peh.init']);
  // وصل مختلط: الجديد مع الأصلي في الاتجاهين
  assert.deepEqual(s['بپ'], ['peh.fina', 'beh.init']);
  assert.deepEqual(s['پب'], ['beh.fina', 'peh.init']);
  // الحرف المركّب الجديد
  assert.deepEqual(s['پا'], ['peh_alef']);
  // المنفصل يبقى كما هو
  assert.deepEqual(s['پ'], ['peh']);
  // قواعد الخط الأصلي لم تتأثر
  assert.deepEqual(s['ببب'], ['beh.fina', 'beh.medi', 'beh.init']);
  assert.deepEqual(s['لا'], ['lam_alef']);

  // البنية: البحوث الأصلية في أماكنها وبترقيمها، والميزات الأصلية تشير إليها، ولا ميزات مكررة في arab
  const after = py(LAYOUT, file);
  assert.ok(after.lookups > orig.lookups);
  for (const [tag, idx] of orig.features) {
    const f = after.features.find((x: [string, number[]]) => x[0] === tag);
    assert.ok(f, `الميزة ${tag} باقية`);
    for (const i of idx) assert.ok(f[1].includes(i), `${tag} ما زالت تستدعي البحث ${i}`);
  }
  const tags: string[] = after.features.map((f: [string, unknown]) => f[0]);
  assert.equal(new Set(tags).size, tags.length, 'لا ميزات بوسم مكرر');
  assert.deepEqual(tags, [...tags].sort());
});

test('imported font with no original GSUB (kerning only): new forms still connect', { skip: SKIP }, async () => {
  const p = createProject('Kern Only', 'D', '');
  p.glyphs = [glyph('beh', 'ب', 'U+0628', 'letter'), glyph('alef', 'ا', 'U+0627', 'letter')];
  p.kerning = [{ id: 'k', left: 'beh', right: 'alef', value: -30 }] as FontProject['kerning'];
  const q = await imported(p);
  assert.equal(q.source?.tables.GSUB, undefined);
  q.glyphs.push(glyph('beh.init', '', 'U+FE91', 'letter', 'initial'), glyph('beh.fina', '', 'U+FE90', 'letter', 'final'));
  const s = py(SHAPE, await write(q), 'بب');
  assert.deepEqual(s['بب'], ['beh.fina', 'beh.init']);
});

test('imported font: without new glyphs the GSUB table is written exactly as the original', { skip: SKIP }, async () => {
  const q = await imported(baseProject());
  const a = py(LAYOUT, await write(q));
  const b = py(LAYOUT, await write(await imported(baseProject())));
  assert.deepEqual(a, b);
  assert.equal(a.lookups, py(LAYOUT, await write(baseProject())).lookups);
});
