import test from 'node:test';
import assert from 'node:assert/strict';
import { type Glyph, type GlyphCategory, type GlyphForm } from '../types/font';
import { createGlyph } from './fontLogic';
import { computeFeatures, formUnicode, missingForms, rulesToFea, splitName } from './features';

const g = (name: string, form: GlyphForm = 'isolated', category: GlyphCategory = 'letter'): Glyph =>
  createGlyph({ char: 'x', name, unicode: '', category, form });

test('splitName only strips known form suffixes', () => {
  assert.deepEqual(splitName('beh.init'), { base: 'beh', suffix: 'init' });
  assert.deepEqual(splitName('comma.ar'), { base: 'comma.ar', suffix: null });
  assert.deepEqual(splitName('beh'), { base: 'beh', suffix: null });
});

test('forms become single substitutions and mismatches are reported', () => {
  const r = computeFeatures([
    g('beh'), g('beh.init', 'initial'), g('beh.fina', 'final'), g('beh.medi', 'isolated'), g('x.init', 'initial'),
  ]);
  assert.deepEqual(
    r.rules.map((x) => `${x.feature}:${x.from[0]}>${x.to}`),
    ['fina:beh>beh.fina', 'medi:beh>beh.medi', 'init:beh>beh.init']
  );
  assert.deepEqual(r.mismatches, ['beh.medi']);
  assert.equal(r.gaps.length, 1);
  assert.equal(r.gaps[0].glyph, 'x.init');
});

test('ligatures use the joined forms of their parts', () => {
  const all = [
    g('lam'), g('alef'), g('lam.init', 'initial'), g('lam.medi', 'medial'), g('alef.fina', 'final'),
    g('lam_alef', 'isolated', 'ligature'), g('lam_alef.fina', 'final', 'ligature'),
  ];
  const r = computeFeatures(all);
  const lig = r.rules.filter((x) => x.feature === 'rlig');
  assert.deepEqual(lig.map((x) => `${x.from.join('+')}>${x.to}`), [
    'lam.init+alef.fina>lam_alef',
    'lam.medi+alef.fina>lam_alef.fina',
  ]);
  assert.equal(r.mismatches.length, 0);
  const noFina = computeFeatures(all.filter((x) => x.name !== 'alef.fina'));
  assert.equal(noFina.gaps.length, 2);
  assert.ok(noFina.gaps[0].message.includes('alef.fina'));
});

test('missingForms follows joining classes', () => {
  const m = missingForms([g('beh'), g('alef'), g('hamza'), g('beh.init', 'initial')]);
  assert.deepEqual(m.map((x) => x.name).sort(), ['alef.fina', 'beh.fina', 'beh.medi']);
  assert.equal(m.find((x) => x.name === 'beh.medi')!.form, 'medial');
});

test('fea output groups by feature', () => {
  const fea = rulesToFea(computeFeatures([g('beh'), g('beh.init', 'initial')]));
  assert.ok(fea.startsWith('feature init {'));
  assert.ok(fea.includes('sub beh by beh.init;'));
});

test('isol naming: beh.isol is the source of the other forms', () => {
  const r = computeFeatures([
    g('beh.isol'),
    g('beh.init', 'initial'),
    g('beh.medi', 'medial'),
    g('beh.fina', 'final'),
  ]);
  assert.deepEqual(
    r.rules.map((x) => `${x.feature}:${x.from[0]}>${x.to}`),
    ['fina:beh.isol>beh.fina', 'medi:beh.isol>beh.medi', 'init:beh.isol>beh.init']
  );
  assert.equal(r.gaps.length, 0);
  assert.equal(r.mismatches.length, 0);
});

test('missingForms gives presentation-form codes and works from beh.isol', () => {
  const m = missingForms([g('beh.isol')]);
  assert.deepEqual(m.map((x) => x.name).sort(), ['beh.fina', 'beh.init', 'beh.medi']);
  assert.equal(m.find((x) => x.name === 'beh.fina')!.unicode, 'U+FE90');
  assert.equal(m.find((x) => x.name === 'beh.init')!.unicode, 'U+FE91');
  assert.equal(m.find((x) => x.name === 'beh.medi')!.unicode, 'U+FE92');
  assert.equal(formUnicode('beh', 'isol'), 'U+FE8F');
  assert.equal(formUnicode('unknown', 'isol'), '');
});

