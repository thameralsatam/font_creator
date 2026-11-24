import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, importFontBuffer } from './fontBuild';
import type { FontProject, Glyph } from '../types/font';

/* التشكيل فوق محارف أُضيفت بعد استيراد خط احترافي: الخط الأجنبي يُبنى بمكتبة fontTools (feaLib)
   بثلاث فئات علامات وبترتيب فئات مخالف للافتراض (الفئة 0 هي «تحت»). */

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
function glyph(name: string, ch: string, unicode: string, y0: number, y1: number, category: Glyph['category'] = 'letter'): Glyph {
  const g = createGlyph({ char: ch, name, unicode, category });
  g.advanceWidth = category === 'diacritic' ? 0 : 600;
  g.contours = [{ id: 'c' + name, closed: true, nodes: [nd('a', 100, y0), nd('b', 500, y0), nd('c', 500, y1), nd('d', 100, y1)] }];
  return g;
}

const FEA = `
languagesystem DFLT dflt;
languagesystem arab dflt;
markClass kasra <anchor 50 -150> @MC_bottom;
markClass fatha <anchor 50 0> @MC_top;
markClass dot <anchor 50 0> @MC_mid;
feature mark {
  position base beh <anchor 300 900> mark @MC_top <anchor 300 -300> mark @MC_bottom <anchor 300 350> mark @MC_mid;
} mark;
`;
const MAKE = `
import sys
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
f = TTFont(sys.argv[1])
addOpenTypeFeaturesFromString(f, open(sys.argv[3]).read())
f.save(sys.argv[2])
`;
const SHAPE = `
import sys, json
import uharfbuzz as hb
font = hb.Font(hb.Face(hb.Blob.from_file_path(sys.argv[1])))
out = {}
for t in sys.argv[2:]:
    b = hb.Buffer(); b.add_str(t); b.guess_segment_properties(); hb.shape(font, b, {})
    out[t] = [[font.glyph_to_string(i.codepoint), p.x_advance, p.x_offset, p.y_offset] for i, p in zip(b.glyph_infos, b.glyph_positions)]
print(json.dumps(out, ensure_ascii=False))
`;

const probe = spawnSync('python3', ['-I', '-c', 'import fontTools.feaLib, uharfbuzz'], { encoding: 'utf8' });
const SKIP = !probe.error && probe.status === 0 ? false : 'python3 أو fontTools أو uharfbuzz غير متوفرة';
const tmp = () => mkdtempSync(join(tmpdir(), 'mk-'));
function run(code: string, ...args: string[]): string {
  const r = spawnSync('python3', ['-I', '-c', code, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, `فشل بايثون:\n${r.stderr}`);
  return r.stdout;
}
const shape = (file: string, ...texts: string[]) => JSON.parse(run(SHAPE, file, ...texts)) as Record<string, Array<[string, number, number, number]>>;
const toAB = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

async function foreignFont(): Promise<ArrayBuffer> {
  const dir = tmp();
  const p = createProject('Mark Src', 'D', '');
  p.glyphs = [
    glyph('beh', 'ب', 'U+0628', 0, 600),
    glyph('fatha', '', 'U+064E', 100, 200, 'diacritic'),
    glyph('kasra', '', 'U+064D', -300, -200, 'diacritic'),
    glyph('dot', '', 'U+06DB', -50, 50, 'diacritic'),
    glyph('space', ' ', 'U+0020', 0, 0),
  ];
  const a = join(dir, 'a.otf');
  writeFileSync(a, Buffer.from(await buildFontBuffer(p)));
  writeFileSync(join(dir, 'm.fea'), FEA);
  const b = join(dir, 'b.otf');
  run(MAKE, a, b, join(dir, 'm.fea'));
  return toAB(readFileSync(b));
}

async function exportFile(p: FontProject): Promise<string> {
  const f = join(tmp(), 'out.otf');
  writeFileSync(f, Buffer.from(await buildFontBuffer(p)));
  return f;
}
const anchor = (name: string, x: number, y: number) => ({ id: 'an' + name, name, x, y });

test('import: mark classes are named by geometry (not by class number) and all classes are read', { skip: SKIP }, async () => {
  const p = (await importFontBuffer(await foreignFont(), 'x.otf')).project;
  const beh = p.glyphs.find((g) => g.name === 'beh')!;
  const at = (n: string) => beh.anchors.find((a) => a.name === n);
  assert.deepEqual(p.source?.markClasses, [['bottom', 'top', 'mark2']]); // الفئة 0 هنا «تحت»
  assert.deepEqual([at('top')?.x, at('top')?.y], [300, 900]);
  assert.deepEqual([at('bottom')?.x, at('bottom')?.y], [300, -300]);
  assert.deepEqual([at('mark2')?.x, at('mark2')?.y], [300, 350]);
  assert.equal(p.glyphs.find((g) => g.name === 'fatha')!.anchors[0].name, 'top');
  assert.equal(p.glyphs.find((g) => g.name === 'kasra')!.anchors[0].name, 'bottom');
});

test('export: original marks attach to a glyph added after import, at the new glyph anchors', { skip: SKIP }, async () => {
  const p = (await importFontBuffer(await foreignFont(), 'x.otf')).project;
  assert.equal(p.source?.useOriginal, true);
  const before = shape(await exportFile(p), 'بَ', 'بٍ', 'بۛ');
  const teh = glyph('teh', 'ت', 'U+062A', 0, 600);
  teh.anchors = [anchor('top', 350, 930), anchor('bottom', 330, -310), anchor('mark2', 300, 360)];
  p.glyphs.push(teh);
  const file = await exportFile(p);
  const after = shape(file, 'بَ', 'بٍ', 'بۛ', 'تَ', 'تٍ', 'تۛ');
  // الأصلي لم يتأثر
  for (const t of ['بَ', 'بٍ', 'بۛ']) assert.deepEqual(after[t], before[t], t);
  // الإزاحة الجديدة = الأصلية + فرق نقطة الارتكاز (x،y)
  const off = (t: string) => after[t].find((g) => g[1] === 0)!.slice(2) as number[];
  const delta = (a: string, b: string) => [off(a)[0] - off(b)[0], off(a)[1] - off(b)[1]];
  assert.deepEqual(delta('تَ', 'بَ'), [50, 30]);
  assert.deepEqual(delta('تٍ', 'بٍ'), [30, -10]);
  assert.deepEqual(delta('تۛ', 'بۛ'), [0, 10]);
});

test('export: a glyph added without anchors gets no mark attachment (no wrong positioning)', { skip: SKIP }, async () => {
  const p = (await importFontBuffer(await foreignFont(), 'x.otf')).project;
  p.glyphs.push(glyph('teh', 'ت', 'U+062A', 0, 600));
  const s = shape(await exportFile(p), 'تَ');
  assert.deepEqual(s['تَ'].find((g) => g[1] === 0)!.slice(2), [0, 0]);
});
