import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, fsSelectionFor, importFontBuffer, weightClassFor } from './fontBuild';
import { SUBFAMILIES, SUBFAMILY_STYLES } from './fontInfo';

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });

function project(subfamily: string, tallest = 600, lowest = 0) {
  const p = createProject('Os2 Test', 'D', '');
  p.info = { ...p.info, subfamily } as typeof p.info;
  const g = createGlyph({ char: 'ب', name: 'beh', unicode: 'U+0628', category: 'letter' });
  g.advanceWidth = 600;
  g.contours = [{ id: 'c', closed: true, nodes: [nd('a', 50, lowest), nd('b', 550, lowest), nd('c', 550, tallest), nd('d', 50, tallest)] }];
  p.glyphs = [g];
  return p;
}

const PY = `
import json, sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
o = f['OS/2']
print(json.dumps({
  'win': [o.usWinAscent, o.usWinDescent], 'typo': [o.sTypoAscender, o.sTypoDescender, o.sTypoLineGap],
  'sel': o.fsSelection, 'weight': o.usWeightClass, 'width': o.usWidthClass,
  'x': o.sxHeight, 'cap': o.sCapHeight, 'range1': o.ulUnicodeRange1,
  'hhea': [f['hhea'].ascent, f['hhea'].descent], 'upm': f['head'].unitsPerEm,
  'family': f['name'].getDebugName(1), 'style': f['name'].getDebugName(2),
}))
`;

/** هل python3 ومكتبة fontTools متاحتان فعلاً؟ هذا وحده سبب التخطي. */
const probe = spawnSync('python3', ['-I', '-c', 'import fontTools'], { encoding: 'utf8' });
const HAS_FONTTOOLS = !probe.error && probe.status === 0;
const SKIP = HAS_FONTTOOLS ? false : 'python3 أو fontTools غير متوفرة';

async function inspect(p: ReturnType<typeof project>): Promise<Record<string, any>> {
  const dir = mkdtempSync(join(tmpdir(), 'os2-'));
  const file = join(dir, 'f.otf');
  writeFileSync(file, Buffer.from(await buildFontBuffer(p)));
  const r = spawnSync('python3', ['-I', '-c', PY, file], { encoding: 'utf8' });
  // أي فشل هنا (تحليل الملف أو غيره) يُفشل الاختبار ويعرض السبب
  assert.equal(r.status, 0, `فحص fontTools فشل:\n${r.stderr}${r.error ? String(r.error) : ''}`);
  return JSON.parse(r.stdout);
}

const EXPECTED: Record<string, { weight: number; sel: number }> = {
  Regular: { weight: 400, sel: 0x40 | 0x80 },
  Bold: { weight: 700, sel: 0x20 | 0x80 },
  Italic: { weight: 400, sel: 0x01 | 0x80 },
  'Bold Italic': { weight: 700, sel: 0x20 | 0x01 | 0x80 },
  Light: { weight: 300, sel: 0x40 | 0x80 },
  Medium: { weight: 500, sel: 0x40 | 0x80 },
  SemiBold: { weight: 600, sel: 0x40 | 0x80 },
  ExtraBold: { weight: 800, sel: 0x40 | 0x80 },
  Thin: { weight: 100, sel: 0x40 | 0x80 },
  Black: { weight: 900, sel: 0x40 | 0x80 },
};

test('SUBFAMILIES: the ten styles are all classified explicitly', () => {
  assert.equal(SUBFAMILIES.length, 10);
  assert.deepEqual([...SUBFAMILIES].sort(), Object.keys(EXPECTED).sort());
  for (const s of SUBFAMILIES) {
    assert.equal(weightClassFor(s), EXPECTED[s].weight, s);
    assert.equal(fsSelectionFor(s), EXPECTED[s].sel, s);
    assert.equal(SUBFAMILY_STYLES[s].weight, EXPECTED[s].weight, s);
  }
});

test('unknown or free-text style is not guessed to be Regular or Bold', () => {
  for (const s of ['', 'Condensed Display', 'Heavy']) {
    assert.equal(fsSelectionFor(s), 0x80, s || '(empty)'); // USE_TYPO_METRICS فقط
    assert.equal(weightClassFor(s), 400, s || '(empty)');
  }
  // مطابقة لا تتأثر بالحالة أو المسافات الطرفية
  assert.equal(fsSelectionFor('  bold italic '), EXPECTED['Bold Italic'].sel);
});

for (const style of Object.keys(EXPECTED)) {
  test(`OS/2 in exported file: ${style}`, { skip: SKIP }, async () => {
    const p = project(style);
    const o = await inspect(p);
    const m = p.metrics;
    assert.equal(o.weight, EXPECTED[style].weight, 'usWeightClass');
    assert.equal(o.width, 5, 'usWidthClass');
    assert.equal(o.sel, EXPECTED[style].sel, 'fsSelection');
    assert.deepEqual(o.win, [m.ascender, Math.abs(m.descender)], 'win metrics');
    assert.ok(o.win[0] > 0 && o.win[1] > 0);
    assert.deepEqual(o.typo, [m.ascender, m.descender, 0], 'typo metrics');
    assert.equal(o.x, m.xHeight, 'sxHeight');
    assert.equal(o.cap, m.capHeight, 'sCapHeight');
    assert.equal(o.upm, m.upm);
    assert.deepEqual(o.hhea, [m.ascender, m.descender]);
    assert.ok(o.range1 & (1 << 13), 'Arabic unicode range bit');
  });
}

test('OS/2: win metrics grow to cover glyphs beyond the ascender/descender', { skip: SKIP }, async () => {
  const o = await inspect(project('Regular', 1100, -400));
  assert.deepEqual(o.win, [1100, 400]);
});

test('OS/2: style does not change the other shared fields', { skip: SKIP }, async () => {
  const base = await inspect(project('Regular'));
  for (const s of SUBFAMILIES) {
    const o = await inspect(project(s));
    for (const k of ['width', 'x', 'cap', 'range1', 'hhea', 'upm', 'typo', 'win']) assert.deepEqual(o[k], base[k], `${s}.${k}`);
  }
});

test('font parse failure fails the test with the reason (not a silent skip)', async () => {
  if (!HAS_FONTTOOLS) return;
  const dir = mkdtempSync(join(tmpdir(), 'os2-bad-'));
  const file = join(dir, 'bad.otf');
  writeFileSync(file, Buffer.from('not a font'));
  const r = spawnSync('python3', ['-I', '-c', PY, file], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /TTLibError|Error/);
});

/* ---- خط مستورد: القيم الأصلية تبقى ما لم يغيّر المستخدم النمط ---- */

const PATCH = `
import sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
f['OS/2'].usWeightClass = int(sys.argv[3])
f['OS/2'].fsSelection = int(sys.argv[4])
for r in f['name'].names:
    if r.nameID == 2: r.string = sys.argv[5]
f.save(sys.argv[2])
`;

/** يبني خطاً ثم يعدّل OS/2 واسم النمط فيه بقيم أصلية مختارة، كأنه خط من برنامج آخر. */
async function foreignFont(weight: number, sel: number, style: string): Promise<ArrayBuffer> {
  const dir = mkdtempSync(join(tmpdir(), 'os2-imp-'));
  const a = join(dir, 'a.otf');
  const b = join(dir, 'b.otf');
  writeFileSync(a, Buffer.from(await buildFontBuffer(project('Regular'))));
  const r = spawnSync('python3', ['-I', '-c', PATCH, a, b, String(weight), String(sel), style], { encoding: 'utf8' });
  assert.equal(r.status, 0, `تعديل الخط فشل:\n${r.stderr}`);
  const { readFileSync } = await import('node:fs');
  const buf = readFileSync(b);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const CASES: Array<[string, number, number, string]> = [
  // [وصف, وزن أصلي, fsSelection أصلي, نمط]
  ['known style with non-default marks (Bold, no typo-metrics bit)', 700, 0x20, 'Bold'],
  ['known style with odd weight (Light 350 + WWS)', 350, 0x40 | 0x100, 'Light'],
  ['unknown free-text style', 650, 0x40 | 0x100, 'Display'],
];

for (const [label, weight, sel, style] of CASES) {
  test(`imported font keeps original usWeightClass and fsSelection: ${label}`, { skip: SKIP }, async () => {
    const imported = (await importFontBuffer(await foreignFont(weight, sel, style), 'x.otf')).project;
    assert.equal(imported.info?.subfamily, style);
    // إعادة التصدير دون تغيير النمط
    const o = await inspect(imported);
    assert.equal(o.weight, weight, 'usWeightClass');
    assert.equal(o.sel, sel, 'fsSelection');
    // بقية إصلاحات OS/2 تعمل كما هي
    assert.ok(o.win[0] > 0 && o.win[1] > 0);
    assert.equal(o.width, 5);
  });
}

test('imported font: changing the style explicitly recomputes weight and fsSelection', { skip: SKIP }, async () => {
  const imported = (await importFontBuffer(await foreignFont(350, 0x40 | 0x100, 'Light'), 'x.otf')).project;
  imported.info = { ...imported.info, subfamily: 'Bold' } as typeof imported.info;
  const o = await inspect(imported);
  assert.equal(o.weight, 700);
  assert.equal(o.sel, 0x20 | 0x80);
});
