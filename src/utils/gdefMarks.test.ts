import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer } from './fontBuild';

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
const box = (x: number, y: number, w: number, h: number) => ({
  id: `c${x}${y}`, closed: true, nodes: [nd('a', x, y), nd('b', x + w, y), nd('c', x + w, y + h), nd('d', x, y + h)],
});

const PY = `
import json, sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
cls = f['GDEF'].table.GlyphClassDef.classDefs if 'GDEF' in f and f['GDEF'].table.GlyphClassDef else None
print(json.dumps({'gdef': 'GDEF' in f, 'classes': cls}))
`;
const probe = spawnSync('python3', ['-I', '-c', 'import fontTools'], { encoding: 'utf8' });
const SKIP = !probe.error && probe.status === 0 ? false : 'python3 أو fontTools غير متوفرة';

async function classes(withKerning: boolean, withAnchors: boolean) {
  const p = createProject('G', 'D', '');
  const beh = createGlyph({ char: 'ب', name: 'beh', unicode: 'U+0628', category: 'letter' });
  beh.advanceWidth = 600; beh.contours = [box(50, 100, 500, 200)];
  const fatha = createGlyph({ char: 'َ', name: 'fatha', unicode: 'U+064E', category: 'diacritic' });
  fatha.advanceWidth = 0; fatha.contours = [box(-100, 800, 200, 60)];
  if (withAnchors) {
    beh.anchors = [{ id: 'a1', name: 'top', x: 300, y: 360 }];
    fatha.anchors = [{ id: 'a2', name: 'top', x: 0, y: 800 }];
  }
  p.glyphs = [beh, fatha];
  if (withKerning) p.kerning = [{ id: 'k', left: 'beh', right: 'beh', value: -40 }] as typeof p.kerning;
  const dir = mkdtempSync(join(tmpdir(), 'gdef-'));
  const file = join(dir, 'f.otf');
  writeFileSync(file, Buffer.from(await buildFontBuffer(p)));
  const r = spawnSync('python3', ['-I', '-c', PY, file], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout) as { gdef: boolean; classes: Record<string, number> | null };
}

for (const [k, a] of [[false, false], [true, false], [false, true]] as const) {
  test(`mark glyphs are class 3 in GDEF (kerning=${k}, anchors=${a})`, { skip: SKIP }, async () => {
    const r = await classes(k, a);
    assert.ok(r.gdef, 'GDEF missing');
    assert.equal(r.classes!.fatha, 3);
    assert.equal(r.classes!.beh, 1);
  });
}
