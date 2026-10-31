import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, importFontBuffer } from './fontBuild';

test('font info survives export and import', async () => {
  const p = createProject('Ruqaa Test', 'Sam', 'وصف الخط');
  p.version = '2.1';
  p.info = {
    subfamily: 'Bold',
    fullName: 'Ruqaa Test Bold',
    copyright: '© 2026 Sam',
    license: 'OFL',
    licenseUrl: 'https://scripts.sil.org/OFL',
    manufacturer: 'Sam Studio',
    designerUrl: 'https://example.com',
  };
  const a = createGlyph({ char: 'a', name: 'a', unicode: 'U+0061', category: 'letter' });
  a.contours = [
    { id: 'c', closed: true, nodes: [0, 1, 2].map((i) => ({ id: 'n' + i, x: i * 100, y: (i % 2) * 100, kind: 'corner' as const, handleIn: null, handleOut: null })) },
  ];
  p.glyphs = [a];
  const r = await importFontBuffer(await buildFontBuffer(p), 'x.otf');
  const q = r.project;
  assert.equal(q.name, 'Ruqaa Test');
  assert.equal(q.designer, 'Sam');
  assert.equal(q.version, '2.1');
  assert.equal(q.info?.subfamily, 'Bold');
  assert.equal(q.info?.fullName, 'Ruqaa Test Bold');
  assert.equal(q.info?.postScriptName, 'RuqaaTest-Bold');
  assert.equal(q.info?.copyright, '© 2026 Sam');
  assert.equal(q.info?.license, 'OFL');
  assert.equal(q.info?.licenseUrl, 'https://scripts.sil.org/OFL');
  assert.equal(q.info?.manufacturer, 'Sam Studio');
  assert.equal(q.info?.designerUrl, 'https://example.com');
});
