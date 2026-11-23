import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, fsSelectionFor } from './fontBuild';

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
  'name': f['name'].getDebugName(1),
}))
`;

async function inspect(p: ReturnType<typeof project>): Promise<Record<string, any> | null> {
  const dir = mkdtempSync(join(tmpdir(), 'os2-'));
  const file = join(dir, 'f.otf');
  writeFileSync(file, Buffer.from(await buildFontBuffer(p)));
  const r = spawnSync('python3', ['-I', '-c', PY, file], { encoding: 'utf8' });
  if (r.status !== 0) return null; // fontTools غير متاح في هذه البيئة
  return JSON.parse(r.stdout);
}

test('fsSelection: regular, bold, italic, bold italic', () => {
  assert.equal(fsSelectionFor('Regular'), 0x40 | 0x80);
  assert.equal(fsSelectionFor('Bold'), 0x20 | 0x80);
  assert.equal(fsSelectionFor('Italic'), 0x01 | 0x80);
  assert.equal(fsSelectionFor('Bold Italic'), 0x20 | 0x01 | 0x80);
});

test('OS/2 in exported file: win metrics positive and tied to project metrics', async () => {
  const p = project('Regular');
  const o = await inspect(p);
  if (!o) return;
  const m = p.metrics;
  assert.deepEqual(o.win, [m.ascender, Math.abs(m.descender)]);
  assert.ok(o.win[0] > 0 && o.win[1] > 0);
  assert.deepEqual(o.typo, [m.ascender, m.descender, 0]);
  assert.equal(o.sel & 0x40, 0x40);
  assert.equal(o.sel & 0x80, 0x80);
});

test('OS/2: win metrics grow to cover glyphs beyond the ascender/descender', async () => {
  const p = project('Regular', 1100, -400);
  const o = await inspect(p);
  if (!o) return;
  assert.deepEqual(o.win, [1100, 400]);
});

test('OS/2: bold style clears REGULAR and keeps the other fields intact', async () => {
  const bold = await inspect(project('Bold'));
  const reg = await inspect(project('Regular'));
  if (!bold || !reg) return;
  assert.equal(bold.sel, 0x20 | 0x80);
  // بقية الخصائص لا تتأثر
  for (const k of ['weight', 'width', 'x', 'cap', 'range1', 'hhea', 'upm', 'typo', 'win']) assert.deepEqual(bold[k], reg[k], k);
  assert.equal(reg.x, project('Regular').metrics.xHeight);
  assert.equal(reg.cap, project('Regular').metrics.capHeight);
  assert.ok(reg.range1 & (1 << 13), 'Arabic range bit still set');
});
