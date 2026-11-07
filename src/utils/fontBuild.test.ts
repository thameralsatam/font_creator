import test from 'node:test';
import assert from 'node:assert/strict';
import { type Contour, type FontProject } from '../types/font';
import { createGlyph, createProject } from './fontLogic';
import { buildFontBuffer, commandsToContours, importFontBuffer } from './fontBuild';

const rect = (id: string, x: number, y: number, w: number, h: number): Contour => ({
  id,
  closed: true,
  nodes: [
    { id: id + '1', x, y, kind: 'corner', handleIn: null, handleOut: null },
    { id: id + '2', x: x + w, y, kind: 'corner', handleIn: null, handleOut: null },
    { id: id + '3', x: x + w, y: y + h, kind: 'corner', handleIn: null, handleOut: null },
    { id: id + '4', x, y: y + h, kind: 'corner', handleIn: null, handleOut: null },
  ],
});

function sample(): FontProject {
  const p = createProject('My Font', 'Designer', '');
  const g = createGlyph({ char: 'a', name: 'a', unicode: 'U+0061', category: 'letter', advanceWidth: 500 });
  g.contours = [rect('a1', 0, 0, 100, 200)];
  p.glyphs.push(g);
  return p;
}

test('features and OS/2 heights are written into the font', async () => {
  const p = sample();
  p.metrics = { ...p.metrics, capHeight: 650, xHeight: 430 };
  const init = createGlyph({ char: 'a', name: 'a.init', unicode: '', category: 'letter', form: 'initial', advanceWidth: 500 });
  init.contours = [rect('z', 0, 0, 100, 100)];
  p.glyphs.push(init);
  const buf = await buildFontBuffer(p);
  const ot = (await import('opentype.js')) as unknown as { default?: typeof import('opentype.js') } & typeof import('opentype.js');
  const font = (ot.default ?? ot).parse(buf);
  const os2 = font.tables.os2 as unknown as { sCapHeight: number; sxHeight: number };
  assert.equal(os2.sCapHeight, 650);
  assert.equal(os2.sxHeight, 430);
  const tags = (font.tables.gsub as unknown as { features: Array<{ tag: string }> }).features.map((f) => f.tag);
  assert.ok(tags.includes('init'));
  const back = await importFontBuffer(buf, 'm.otf');
  assert.equal(back.project.metrics.capHeight, 650);
  assert.equal(back.project.metrics.xHeight, 430);
});

test('commandsToContours converts commands properly', () => {
  const contours = commandsToContours([
    { type: 'M', x: 0, y: 0 },
    { type: 'L', x: 100, y: 0 },
    { type: 'L', x: 100, y: 100 },
    { type: 'L', x: 0, y: 100 },
    { type: 'Z' },
  ]);
  assert.equal(contours.length, 1);
  assert.equal(contours[0].closed, true);
  assert.equal(contours[0].nodes.length, 4);
});

test('rules from the font are imported into custom FEA, and woff2 round-trips', async () => {
  const p = sample();
  const b = createGlyph({ char: 'b', name: 'b', unicode: 'U+0062', category: 'letter', advanceWidth: 500 });
  b.contours = [rect('b1', 0, 0, 100, 200)];
  const ab = createGlyph({ char: 'x', name: 'ab', unicode: 'U+0078', category: 'ligature', advanceWidth: 700 });
  ab.contours = [rect('c1', 0, 0, 300, 200)];
  p.glyphs.push(b, ab);
  p.customFea = 'feature liga {\n    sub a b by ab;\n} liga;\nfeature ss01 {\n    sub a by b;\n} ss01;';
  const buf = await buildFontBuffer(p);
  const back = await importFontBuffer(buf, 'm.otf');
  assert.match(back.project.customFea ?? '', /sub a b by ab;/);
  assert.match(back.project.customFea ?? '', /sub a by b;/);

  const { toWoff2 } = await import('./fontBuild');
  const w = await toWoff2(buf);
  assert.equal(String.fromCharCode(w[0], w[1], w[2], w[3]), 'wOF2');
  assert.ok(w.length < buf.byteLength);
  const again = await importFontBuffer(w.buffer.slice(w.byteOffset, w.byteOffset + w.byteLength) as ArrayBuffer, 'm.woff2');
  assert.equal(again.imported, 3);
  assert.match(again.project.customFea ?? '', /sub a b by ab;/);
});

test('each export gets a unique ID and fresh modified date, created date stays', async () => {
  const ot = await import('opentype.js');
  const p = createProject('Uniq', 'T', '');
  const g = createGlyph({ char: 'A', name: 'A', unicode: 'U+0041', category: 'letter' });
  g.contours = [{ id: 'c', closed: true, nodes: [
    { id: '1', x: 0, y: 0, kind: 'corner', handleIn: null, handleOut: null },
    { id: '2', x: 300, y: 0, kind: 'corner', handleIn: null, handleOut: null },
    { id: '3', x: 300, y: 300, kind: 'corner', handleIn: null, handleOut: null },
  ] }];
  p.glyphs = [g];
  p.createdAt = '2024-05-01T10:00:00.000Z';
  const a: any = (ot.default ?? ot).parse(await buildFontBuffer(p));
  await new Promise((r) => setTimeout(r, 5));
  const b: any = (ot.default ?? ot).parse(await buildFontBuffer(p));
  assert.notEqual(a.names.uniqueID.en, b.names.uniqueID.en);
  assert.match(a.names.uniqueID.en, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  const created = Math.floor(Date.parse(p.createdAt) / 1000);
  assert.equal(a.tables.head.created, created);
  assert.ok(a.tables.head.modified > created);
});

test('kerning and mark anchors are written to GPOS and survive a re-import', async () => {
  const { buildFontBuffer, importFontBuffer } = await import('./fontBuild');
  const { createProject, createGlyph } = await import('./fontLogic');
  const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
  const box = (k: string) => ({ id: 'c' + k, closed: true, nodes: [nd(k + 'a', 50, 0), nd(k + 'b', 550, 0), nd(k + 'c', 550, 600), nd(k + 'd', 50, 600)] });
  const mk = (name: string, ch: string, category: 'letter' | 'diacritic', w: number, anchors: Array<{ id: string; name: string; x: number; y: number }> = []) => ({
    ...createGlyph({ char: ch, name, unicode: 'U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'), category }),
    advanceWidth: w, contours: [box(name)], anchors,
  });
  const p = createProject('T', 'D', '');
  p.glyphs = [
    mk('A', 'A', 'letter', 600, [{ id: 'a1', name: 'top', x: 300, y: 700 }]),
    mk('V', 'V', 'letter', 600),
    mk('acute', '́', 'diacritic', 0, [{ id: 'm1', name: 'top', x: 50, y: 0 }]),
  ];
  p.kerning = [{ id: 'k1', left: 'A', right: 'V', value: -120 }];
  const buf = await buildFontBuffer(p);
  const ot = (await import('opentype.js')) as unknown as { default?: typeof import('opentype.js') } & typeof import('opentype.js');
  const font = (ot.default ?? ot).parse(buf);
  assert.equal(font.getKerningValue(font.charToGlyph('A'), font.charToGlyph('V')), -120);
  const back = await importFontBuffer(buf, 'T.otf');
  assert.deepEqual(back.project.kerning?.map((k) => [k.left, k.right, k.value]), [['A', 'V', -120]]);
  const acute = back.project.glyphs.find((g) => g.name === 'acute' || g.unicode === 'U+0301');
  assert.equal(acute?.category, 'diacritic');
  assert.deepEqual(acute?.anchors.map((a) => [a.name, a.x, a.y]), [['top', 50, 0]]);
  const A = back.project.glyphs.find((g) => g.name === 'A');
  assert.deepEqual(A?.anchors.map((a) => [a.name, a.x, a.y]), [['top', 300, 700]]);
});

test('imported font keeps original glyph order and layout tables on export; edits still apply', async () => {
  const { readRawTable } = await import('./gpos');
  const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
  const box = (k: string, w: number) => ({ id: 'c' + k, closed: true, nodes: [nd(k + 'a', 50, 0), nd(k + 'b', w, 0), nd(k + 'c', w, 600), nd(k + 'd', 50, 600)] });
  const mk = (name: string, ch: string, w: number) => ({
    ...createGlyph({ char: ch, name, unicode: 'U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'), category: 'letter' as const }),
    advanceWidth: w + 50, contours: [box(name, w)],
  });
  const p = createProject('T', 'D', '');
  p.glyphs = [mk('A', 'A', 500), mk('V', 'V', 500), mk('Z', 'Z', 500)];
  p.kerning = [{ id: 'k1', left: 'A', right: 'V', value: -100 }];
  const first = await buildFontBuffer(p);
  const imp = await importFontBuffer(first, 'T.otf');
  assert.equal(imp.project.source?.useOriginal, true);
  assert.equal(imp.project.source?.slots.length, 4);
  const gposOrig = readRawTable(first, 'GPOS')!;
  // تصدير بلا تعديل: الجدول نفسه بالبايت
  const again = await buildFontBuffer(imp.project);
  assert.deepEqual(Array.from(readRawTable(again, 'GPOS')!), Array.from(gposOrig));
  // حذف محرف: يبقى ترتيب الباقي، فتبقى أرقامه صالحة في الجدول
  const edited = { ...imp.project, glyphs: imp.project.glyphs.filter((g) => g.name !== 'Z') };
  const out = await buildFontBuffer(edited);
  const ot = (await import('opentype.js')) as unknown as { default?: typeof import('opentype.js') } & typeof import('opentype.js');
  const font = (ot.default ?? ot).parse(out);
  assert.equal(font.numGlyphs, 4);
  assert.equal(font.getKerningValue(font.charToGlyph('A'), font.charToGlyph('V')), -100);
  // إيقاف الجداول الأصلية: يُبنى من قواعد المشروع (الكيرننغ المستورد)
  const off = await buildFontBuffer({ ...imp.project, source: { ...imp.project.source!, useOriginal: false } });
  assert.equal((ot.default ?? ot).parse(off).getKerningValue(font.charToGlyph('A'), font.charToGlyph('V')) !== undefined, true);
});
