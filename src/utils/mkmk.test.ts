import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer } from './fontBuild';
import type { Glyph } from '../types/font';

/* علامتان متراكبتان على حرف واحد (شدة ثم فتحة، كسرة ثم همزة تحت): الثانية تتعلق بنقطة «فوق العلامة»
   أو «تحت العلامة» في الأولى (MarkToMark)، لا بالحرف نفسه فتتراكب العلامتان. */

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
type A = Record<string, [number, number]>;
function glyph(name: string, unicode: string, category: Glyph['category'], y0: number, y1: number, anchors: A): Glyph {
  const g = createGlyph({ char: String.fromCodePoint(parseInt(unicode.slice(2), 16)), name, unicode, category });
  g.advanceWidth = category === 'diacritic' ? 0 : 600;
  const x0 = category === 'diacritic' ? -100 : 100;
  const x1 = category === 'diacritic' ? 100 : 500;
  g.contours = [{ id: 'c' + name, closed: true, nodes: [nd('a', x0, y0), nd('b', x1, y0), nd('c', x1, y1), nd('d', x0, y1)] }];
  g.anchors = Object.entries(anchors).map(([n, [x, y]], i) => ({ id: `${name}${i}`, name: n, x, y }));
  return g;
}

const GL = {
  beh: glyph('beh', 'U+0628', 'letter', 100, 400, { top: [300, 500], bottom: [300, -100] }),
  shadda: glyph('shadda', 'U+0651', 'diacritic', 800, 860, { top: [0, 800], markTop: [0, 960] }),
  fatha: glyph('fatha', 'U+064E', 'diacritic', 800, 860, { top: [0, 800] }),
  kasra: glyph('kasra', 'U+0650', 'diacritic', -300, -240, { bottom: [0, -240], markBottom: [0, -360] }),
  hamzaBelow: glyph('hamzaBelow', 'U+0655', 'diacritic', -300, -240, { bottom: [0, -240], markBottom: [0, -400] }),
};

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
const TABLES = `
import sys, json
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
g = f['GPOS'].table
print(json.dumps({'features': [r.FeatureTag for r in g.FeatureList.FeatureRecord], 'types': [l.LookupType for l in g.LookupList.Lookup]}))
`;
const probe = spawnSync('python3', ['-I', '-c', 'import fontTools, uharfbuzz'], { encoding: 'utf8' });
const SKIP = !probe.error && probe.status === 0 ? false : 'python3 أو fontTools أو uharfbuzz غير متوفرة';
const py = (code: string, ...args: string[]) => {
  const r = spawnSync('python3', ['-I', '-c', code, ...args], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

async function exported(names: Array<keyof typeof GL>) {
  const p = createProject('M', 'D', '');
  p.glyphs = names.map((n) => structuredClone(GL[n]));
  const file = join(mkdtempSync(join(tmpdir(), 'mkmk-')), 'f.otf');
  writeFileSync(file, Buffer.from(await buildFontBuffer(p)));
  return file;
}

/** إزاحة العلامة المتوقعة: بداية الحامل (الحرف أو العلامة السابقة) + نقطة الاستقبال − نقطة تعلّقها. */
function expected(glyphs: Record<string, Glyph>, base: string, marks: string[], anchor: 'top' | 'bottom') {
  const at = (n: string, a: string) => glyphs[n].anchors.find((x) => x.name === a)!;
  const stack = anchor === 'top' ? 'markTop' : 'markBottom';
  const out: Record<string, [number, number]> = {};
  let carrier = base;
  let off: [number, number] = [0, 0];
  for (const m of marks) {
    const recv = at(carrier, carrier === base ? anchor : stack);
    off = [off[0] + recv.x - at(m, anchor).x, off[1] + recv.y - at(m, anchor).y];
    out[m] = off;
    carrier = m;
  }
  return out;
}

test('mkmk: the second top mark sits on the first mark, not on the base', { skip: SKIP }, async () => {
  const file = await exported(['beh', 'shadda', 'fatha']);
  const r = py(SHAPE, file, 'بَّ')['بَّ'] as Array<[string, number, number, number]>;
  const logical = [...r].reverse();
  assert.deepEqual(logical.map((x) => x[0]), ['beh', 'shadda', 'fatha']);
  const want = expected(GL, 'beh', ['shadda', 'fatha'], 'top');
  assert.deepEqual([logical[1][2], logical[1][3]], want.shadda);
  assert.deepEqual([logical[2][2], logical[2][3]], want.fatha, 'fatha must stack above shadda');
});

test('mkmk: stacking below works the same way, in whatever order the shaper puts the marks', { skip: SKIP }, async () => {
  const file = await exported(['beh', 'kasra', 'hamzaBelow']);
  const r = py(SHAPE, file, 'ب\u0650\u0655')['ب\u0650\u0655'] as Array<[string, number, number, number]>;
  const logical = [...r].reverse();
  assert.equal(logical[0][0], 'beh');
  assert.deepEqual(logical.slice(1).map((x) => x[0]).sort(), ['hamzaBelow', 'kasra']);
  const want = expected(GL, 'beh', logical.slice(1).map((x) => x[0]), 'bottom');
  logical.slice(1).forEach((x) => assert.deepEqual([x[2], x[3]], want[x[0]], x[0]));
  assert.notDeepEqual([logical[1][2], logical[1][3]], [logical[2][2], logical[2][3]], 'the two marks must not overlap');
});

test('mkmk: written as a type 6 lookup under the mkmk feature, and only when a mark offers a stacking point', { skip: SKIP }, async () => {
  const withStack = py(TABLES, await exported(['beh', 'shadda', 'fatha']));
  assert.ok(withStack.features.includes('mkmk'));
  assert.ok(withStack.types.includes(6));
  const p = structuredClone(GL);
  const plain = await exported(['beh', 'fatha']);
  const t = py(TABLES, plain);
  assert.ok(!t.features.includes('mkmk') && !t.types.includes(6));
  assert.ok(p.beh);
});
