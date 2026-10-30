import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlyph } from './fontLogic';
import { applyGlyphMeta, duplicateGlyph, uniqueCopyName, validateGlyphEdit } from './glyphLogic';

const mk = (name: string, unicode: string) =>
  createGlyph({ char: 'ب', name, unicode, category: 'letter' });

test('edit validation ignores the glyph itself but not others', () => {
  const a = mk('beh', 'U+0628');
  const b = mk('teh', 'U+062A');
  const meta = { char: 'ب', name: 'beh', unicode: 'U+0628', category: 'letter' as const, form: 'isolated' as const };
  assert.equal(validateGlyphEdit([a, b], a.id, meta), null);
  assert.ok(validateGlyphEdit([a, b], a.id, { ...meta, name: 'teh' }));
  assert.ok(validateGlyphEdit([a, b], a.id, { ...meta, unicode: 'U+062A' }));
  assert.ok(validateGlyphEdit([a, b], a.id, { ...meta, unicode: 'bad' }));
});

test('applyGlyphMeta keeps drawing and width', () => {
  const a = { ...mk('beh', 'U+0628'), advanceWidth: 640 };
  const r = applyGlyphMeta(a, { char: 'ت', name: 'teh', unicode: 'u+062a', category: 'letter', form: 'final' });
  assert.equal(r.char, 'ت');
  assert.equal(r.unicode, 'U+062A');
  assert.equal(r.form, 'final');
  assert.equal(r.advanceWidth, 640);
  assert.equal(r.id, a.id);
});

test('duplicateGlyph makes an independent copy with a unique name and no unicode', () => {
  const a = mk('beh', 'U+0628');
  a.contours = [
    { id: 'c1', closed: true, nodes: [{ id: 'n1', x: 1, y: 2, kind: 'smooth', handleIn: { x: 1, y: 1 }, handleOut: null }] },
  ];
  const d = duplicateGlyph([a], a.id)!;
  assert.equal(d.name, 'beh.copy');
  assert.equal(d.unicode, '');
  assert.notEqual(d.id, a.id);
  assert.notEqual(d.contours[0].id, 'c1');
  assert.notEqual(d.contours[0].nodes[0].id, 'n1');
  assert.notEqual(d.contours[0].nodes[0].handleIn, a.contours[0].nodes[0].handleIn);
  assert.equal(uniqueCopyName([a, d], 'beh'), 'beh.copy2');
  assert.equal(duplicateGlyph([a], 'zzz'), null);
});
