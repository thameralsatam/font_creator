import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFea } from './feaParse';

const names = new Set(['beh.isol', 'beh.init', 'lam.init', 'alef.fina', 'lam_alef']);

test('parseFea reads single and ligature rules', () => {
  const r = parseFea(
    `languagesystem arab dflt;\n# تعليق\nfeature init {\n sub beh.isol by beh.init;\n} init;\nfeature rlig { sub lam.init alef.fina by lam_alef; } rlig;`,
    names
  );
  assert.deepEqual(r.errors, []);
  assert.equal(r.rules.length, 2);
  assert.equal(r.rules[0].kind, 'single');
  assert.equal(r.rules[1].kind, 'ligature');
  assert.deepEqual(r.rules[1].from, ['lam.init', 'alef.fina']);
});

test('parseFea reports unknown glyph, bad syntax and missing closing, with lines', () => {
  const r = parseFea(`feature init {\n sub nope by beh.init;\n sub beh.isol beh.init;\n} init;\nfeature fina {\n sub beh.isol by beh.init;`, names);
  assert.equal(r.rules.length, 1);
  assert.deepEqual(r.errors.map((e) => e.line), [2, 3, 5]);
});
