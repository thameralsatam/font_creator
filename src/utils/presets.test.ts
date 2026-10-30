import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlyph, validateNewGlyph } from './fontLogic';
import { PRESETS, missingOf } from './presets';

test('every preset item is valid and unique across all presets', () => {
  const all = PRESETS.flatMap((p) => p.items);
  const names = new Set(all.map((i) => i.name));
  const codes = new Set(all.map((i) => i.unicode));
  assert.equal(names.size, all.length);
  assert.equal(codes.size, all.length);
  let acc: ReturnType<typeof createGlyph>[] = [];
  for (const i of all) {
    assert.equal(validateNewGlyph(acc, i), null, i.name);
    acc = [...acc, createGlyph(i)];
  }
});

test('missingOf skips glyphs already present by name or code', () => {
  const letters = PRESETS[0].items;
  assert.equal(letters.length, 36);
  const have = [createGlyph({ char: 'ب', name: 'myBeh', unicode: 'U+0628', category: 'letter' })];
  const rest = missingOf(have, letters);
  assert.equal(rest.length, 35);
  assert.ok(!rest.some((r) => r.unicode === 'U+0628'));
});

test('createGlyph honours a preset advance width, including zero', () => {
  const g = createGlyph({ char: 'a', name: 'a', unicode: 'U+0061', category: 'letter', advanceWidth: 0 });
  assert.equal(g.advanceWidth, 0);
  const h = createGlyph({ char: 'a', name: 'a', unicode: 'U+0061', category: 'letter' });
  assert.equal(h.advanceWidth, 500);
});
