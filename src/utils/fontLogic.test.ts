import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, createGlyph, defaultGlyphName, defaultUnicode, validateNewGlyph, validateMetrics, generateOpenTypeFea, renameProject, deleteProject, duplicateProject, updateProjectById, uid } from './fontLogic';
import { type FontProject } from '../types/font';

test('uid never repeats', () => {
  const ids = new Set(Array.from({ length: 500 }, () => uid('x')));
  assert.equal(ids.size, 500);
});

test('createProject builds a clean empty project', () => {
  const p = createProject('  خط رقيم ', '', ' وصف ');
  assert.equal(p.name, 'خط رقيم');
  assert.equal(p.designer, 'المصمم');
  assert.equal(p.description, 'وصف');
  assert.equal(p.glyphs.length, 0);
  assert.equal(p.metrics.upm, 1000);
});

test('createGlyph starts empty with isolated form', () => {
  const g = createGlyph({ char: 'ب', name: 'beh', unicode: 'U+0628', category: 'letter' });
  assert.equal(g.contours.length, 0);
  assert.equal(g.form, 'isolated');
  assert.equal(g.advanceWidth, 500);
});

test('default glyph name and unicode derive from the character', () => {
  assert.equal(defaultGlyphName('ب'), 'uni0628');
  assert.equal(defaultUnicode('ب'), 'U+0628');
  assert.equal(defaultGlyphName(''), '');
});

test('validateNewGlyph rejects bad and duplicate input', () => {
  const g = createGlyph({ char: 'ب', name: 'beh', unicode: 'U+0628', category: 'letter' });
  const ok = { char: 'ت', name: 'teh', unicode: 'U+062A', category: 'letter' as const };
  assert.equal(validateNewGlyph([g], ok), null);
  assert.ok(validateNewGlyph([g], { ...ok, char: '' }));
  assert.ok(validateNewGlyph([g], { ...ok, name: '9bad' }));
  assert.ok(validateNewGlyph([g], { ...ok, unicode: '0628' }));
  assert.ok(validateNewGlyph([g], { ...ok, name: 'beh' }));
  assert.ok(validateNewGlyph([g], { ...ok, unicode: 'u+0628' }));
  assert.equal(validateNewGlyph([g], { ...ok, unicode: '' }), null);
});

test('metrics validation detects valid and invalid configurations', () => {
  const valid = { upm: 1000, ascender: 800, capHeight: 700, xHeight: 500, descender: -200 };
  assert.equal(validateMetrics(valid).isValid, true);

  const invalid = { upm: 50, ascender: -100, capHeight: 700, xHeight: 900, descender: 50 };
  const result = validateMetrics(invalid);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.length >= 4);
});

test('generateOpenTypeFea skips disabled features', () => {
  const p = createProject('Tareeq', 'Type Designer', '');
  p.features = [
    { tag: 'init', name: 'Initial Forms', enabled: true, code: 'sub uni0628 by uni0628.init;' },
    { tag: 'liga', name: 'Ligatures', enabled: false, code: 'sub uni0644 uni0627 by uniFEFB;' },
  ];
  const fea = generateOpenTypeFea(p);
  assert.ok(fea.includes('languagesystem arab dflt;'));
  assert.ok(fea.includes('feature init {'));
  assert.ok(!fea.includes('feature liga'));
});

function sample(): FontProject[] {
  return [createProject('خط أ', 'x', ''), createProject('خط ب', 'x', '')];
}

test('renameProject changes only the target and ignores blank names', () => {
  const list = sample();
  const renamed = renameProject(list, list[0].id, 'خط رقيم');
  assert.equal(renamed[0].name, 'خط رقيم');
  assert.equal(renamed[1].name, 'خط ب');
  assert.equal(renameProject(list, list[0].id, '   '), list);
});

test('deleteProject removes only the target', () => {
  const list = sample();
  const result = deleteProject(list, list[0].id);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, list[1].id);
});

test('duplicateProject is fully independent', () => {
  const list = sample();
  list[0].glyphs.push(createGlyph({ char: 'ا', name: 'alif', unicode: 'U+0627', category: 'letter' }));
  const result = duplicateProject(list, list[0].id);
  assert.equal(result.length, 3);
  assert.equal(result[0].name, 'خط أ (نسخة)');
  assert.notEqual(result[0].id, list[0].id);
  result[0].glyphs[0].name = 'changed';
  assert.equal(list[0].glyphs[0].name, 'alif');
});

test('updateProjectById touches only the target', () => {
  const list = sample();
  const result = updateProjectById(list, list[1].id, (p) => ({ ...p, version: '2.0.0' }));
  assert.equal(result[0].version, '1.0.0');
  assert.equal(result[1].version, '2.0.0');
});
