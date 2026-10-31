# الدفعة 17: أشكال الحروف وميزات الأوبن تايب وترتيب المحارف وإصلاح المقاييس

يضيف: استخراج ميزات isol وinit وmedi وfina وrlig تلقائياً من أسماء المحارف وكتابتها داخل ملف الخط، مجموعتي أشكال الحروف ولام ألف، ترتيب المحارف الجاهزة أولاً، زر حذف غير الجاهزة، كتابة ارتفاعي الحروف الصغيرة والكبيرة صراحة في الخط المصدَّر، وإصلاح خطأ كتابي في fontBuild.ts. الخطوة التي تنشئ ملفات جديدة (features.ts وfeatures.test.ts) تأتي في الآخر.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: في الملف `src/types/font.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  advanceWidth?: number;
}
```

**النص الجديد:**
```
  advanceWidth?: number;
  /** اختياري: شكل المحرف (الافتراضي منفصل). */
  form?: GlyphForm;
}
```

## الخطوة 2: في الملف `src/utils/fontLogic.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    form: 'isolated',
    advanceWidth: data.advanceWidth ?? 500,
```

**النص الجديد:**
```
    form: data.form ?? 'isolated',
    advanceWidth: data.advanceWidth ?? 500,
```

## الخطوة 3: في الملف `src/utils/presets.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { type Glyph, type GlyphCategory, type NewGlyphData } from '../types/font';
```

**النص الجديد:**
```
import { type Glyph, type GlyphCategory, type GlyphForm, type NewGlyphData } from '../types/font';
import { JOINING, formsFor } from './features';
```

## الخطوة 4: في الملف `src/utils/presets.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
const item = (cp: number, name: string, category: GlyphCategory, advanceWidth?: number): NewGlyphData => ({
```

**النص الجديد:**
```
const FORM_FOR: Record<string, GlyphForm> = { init: 'initial', medi: 'medial', fina: 'final' };

const item = (cp: number, name: string, category: GlyphCategory, advanceWidth?: number): NewGlyphData => ({
```

## الخطوة 5: في الملف `src/utils/presets.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
const WORDS = [
```

**النص الجديد:**
```
/** أشكال البداية والوسط والنهاية لكل حرف بحسب نوع اتصاله (بلا رمز يونيكود، تُفعَّل بالميزات). */
const FORMS: NewGlyphData[] = LETTERS.flatMap(([cp, name]) =>
  formsFor(JOINING[name] ?? 'U').map((s) => ({
    char: String.fromCodePoint(cp),
    name: `${name}.${s}`,
    unicode: '',
    category: 'letter' as const,
    form: FORM_FOR[s],
    advanceWidth: 600,
  }))
);

/** لام ألف بأنواعها: المنفصل/البداية بلا اتصال، و.fina حين يتصل بحرف قبله. */
const LAM_ALEF: Array<[number, number, string, string]> = [
  [0xfefb, 0xfefc, 'lam_alef', 'ل\u0627'],
  [0xfef7, 0xfef8, 'lam_alefHamzaAbove', 'ل\u0623'],
  [0xfef9, 0xfefa, 'lam_alefHamzaBelow', 'ل\u0625'],
  [0xfef5, 0xfef6, 'lam_alefMadda', 'ل\u0622'],
];
const LIGATURES: NewGlyphData[] = LAM_ALEF.flatMap(([iso, fin, name, chars]) => [
  { ...item(iso, name, 'ligature', 650), char: chars },
  { ...item(fin, `${name}.fina`, 'ligature', 650), char: chars, form: 'final' as const },
]);

const WORDS = [
```

## الخطوة 6: في الملف `src/utils/presets.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  {
    id: 'marks',
```

**النص الجديد:**
```
  {
    id: 'forms',
    label: 'أشكال الحروف (بداية ووسط ونهاية)',
    description: 'الأشكال التي يحتاجها كل حرف بحسب اتصاله: ثلاثة للمتصل من الجهتين وواحد للمتصل بما قبله فقط. تُفعَّل تلقائياً بميزات init وmedi وfina (81 محرفاً).',
    items: FORMS,
  },
  {
    id: 'ligatures',
    label: 'لام ألف (ترابط)',
    description: 'أربعة ترابطات للام مع الألف وأنواعها، ولكل منها شكل متصل بما قبله. تعمل بميزة rlig وتحتاج أشكال اللام والألف أولاً (8 محارف).',
    items: LIGATURES,
  },
  {
    id: 'marks',
```

## الخطوة 7: في الملف `src/utils/presets.test.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const codes = new Set(all.map((i) => i.unicode));
  assert.equal(names.size, all.length);
  assert.equal(codes.size, all.length);
```

**النص الجديد:**
```
  const coded = all.filter((i) => i.unicode);
  const codes = new Set(coded.map((i) => i.unicode));
  assert.equal(names.size, all.length);
  assert.equal(codes.size, coded.length);
```

## الخطوة 8: في الملف `src/utils/presets.test.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  assert.equal(letters.length, 36);
```

**النص الجديد:**
```
  assert.equal(letters.length, 36);
  const forms = PRESETS.find((p) => p.id === 'forms')!.items;
  assert.equal(forms.length, 81);
  assert.ok(forms.every((f) => !f.unicode && f.form && f.form !== 'isolated'));
```

## الخطوة 9: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
const lb = Math.hypot(b.y, b.y);
```

**النص الجديد:**
```
const lb = Math.hypot(b.x, b.y);
```

## الخطوة 10: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { LIMITS, coordRange, fixDirections, wrongDirectionCount } from './pathEdit';
```

**النص الجديد:**
```
import { computeFeatures, rulesForBuild } from './features';
import { LIMITS, coordRange, fixDirections, wrongDirectionCount } from './pathEdit';
```

## الخطوة 11: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  (font.names as unknown as Record<string, Record<string, string>>).postScriptName = {
```

**النص الجديد:**
```
  // ارتفاعا الحروف الصغيرة والكبيرة يُكتبان كما ضبطتهما، وإلا خمّنتهما المكتبة من حروف لاتينية
  (font.tables as unknown as Record<string, unknown>).os2 = {
    sxHeight: m.xHeight,
    sCapHeight: m.capHeight,
    sTypoAscender: m.ascender,
    sTypoDescender: m.descender,
  };

  // ميزات الأوبن تايب المستخرجة من أسماء المحارف (init وmedi وfina وisol وrlig)
  const index = new Map(glyphs.map((gl, i) => [gl.name, i]));
  for (const r of rulesForBuild(computeFeatures(project.glyphs))) {
    const ids = r.from.map((n) => index.get(n));
    const by = index.get(r.to);
    if (by === undefined || ids.some((x) => x === undefined)) continue;
    if (r.kind === 'single') {
      font.substitution.addSingle(r.feature, { sub: ids[0] as number, by }, 'arab', 'dflt');
    } else {
      font.substitution.addLigature(r.feature, { sub: ids as number[], by }, 'arab', 'dflt');
    }
  }

  (font.names as unknown as Record<string, Record<string, string>>).postScriptName = {
```

## الخطوة 12: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  if (noCode.length && noCode.length < glyphs.length) {
    warnings.push(`محارف بلا رمز يونيكود لن تُكتب مباشرة (تحتاج قواعد تبديل): ${list(noCode.map((g) => g.name))}.`);
  }
```

**النص الجديد:**
```
  const feats = computeFeatures(glyphs);
  const unnamed = noCode.filter((g) => !feats.rules.some((r) => r.to === g.name));
  if (unnamed.length && noCode.length < glyphs.length) {
    warnings.push(`محارف بلا رمز يونيكود ولا ميزة تستدعيها فلن تظهر أبداً: ${list(unnamed.map((g) => g.name))}. سمِّها بلاحقة .init أو .medi أو .fina.`);
  }
  if (feats.gaps.length) warnings.push(`ميزات ناقصة: ${list(feats.gaps.map((x) => `${x.glyph} (${x.message})`))}.`);
  if (feats.mismatches.length) warnings.push(`شكل المحرف لا يطابق لاحقة اسمه: ${list(feats.mismatches)}.`);
```

## الخطوة 13: في الملف `src/utils/fontLogic.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { type FontMetrics, type FontProject, type Glyph, type NewGlyphData } from '../types/font';
```

**النص الجديد:**
```
import { type FontMetrics, type FontProject, type Glyph, type NewGlyphData } from '../types/font';
import { computeFeatures, rulesToFea } from './features';
```

## الخطوة 14: في الملف `src/utils/fontLogic.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  return header + features;
```

**النص الجديد:**
```
  const auto = rulesToFea(computeFeatures(project.glyphs));
  return header + [auto && `# --- مستخرجة تلقائياً من أسماء المحارف ---\n${auto}`, features].filter(Boolean).join('\n\n');
```

## الخطوة 15: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const index = new Map(glyphs.map((gl, i) => [gl.name, i]));
```

**النص الجديد:**
```
  const sub = font.substitution as unknown as {
    addSingle(f: string, s: { sub: number; by: number }, script: string, lang: string): void;
    addLigature(f: string, s: { sub: number[]; by: number }, script: string, lang: string): void;
  };
  const index = new Map(glyphs.map((gl, i) => [gl.name, i]));
```

## الخطوة 16: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      font.substitution.addSingle(r.feature, { sub: ids[0] as number, by }, 'arab', 'dflt');
```

**النص الجديد:**
```
      sub.addSingle(r.feature, { sub: ids[0] as number, by }, 'arab', 'dflt');
```

## الخطوة 17: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      font.substitution.addLigature(r.feature, { sub: ids as number[], by }, 'arab', 'dflt');
```

**النص الجديد:**
```
      sub.addLigature(r.feature, { sub: ids as number[], by }, 'arab', 'dflt');
```

## الخطوة 18: في الملف `src/utils/fontBuild.test.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
test('commandsToContours
```

**النص الجديد:**
```
test('features and OS/2 heights are written into the font', async () => {
  const p = sample();
  p.metrics = { ...p.metrics, capHeight: 650, xHeight: 430 };
  const init = createGlyph({ char: 'a', name: 'a.init', unicode: '', category: 'letter', form: 'initial', advanceWidth: 500 });
  init.contours = [rect('z', 0, 0, 100, 100)];
  p.glyphs.push(init);
  const buf = await buildFontBuffer(p);
  const ot = (await import('opentype.js')) as unknown as { default?: typeof import('opentype.js') } & typeof import('opentype.js');
  const font = (ot.default ?? ot).parse(buf);
  const os2 = font.tables.os2 as { sCapHeight: number; sxHeight: number };
  assert.equal(os2.sCapHeight, 650);
  assert.equal(os2.sxHeight, 430);
  const tags = (font.tables.gsub as { features: Array<{ tag: string }> }).features.map((f) => f.tag);
  assert.ok(tags.includes('init'));
  const back = await importFontBuffer(buf, 'm.otf');
  assert.equal(back.project.metrics.capHeight, 650);
  assert.equal(back.project.metrics.xHeight, 430);
});

test('commandsToContours
```

## الخطوة 19: في الملف `src/utils/fontBuild.test.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
font.tables.os2 as { sCapHeight
```

**النص الجديد:**
```
font.tables.os2 as unknown as { sCapHeight
```

## الخطوة 20: في الملف `src/utils/fontBuild.test.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
(font.tables.gsub as { features
```

**النص الجديد:**
```
(font.tables.gsub as unknown as { features
```

## الخطوة 21: أضف الكود التالي في آخر الملف `src/utils/glyphLogic.ts` (بعد آخر سطر، دون حذف شيء)

```

/** هل المحرف جاهز؟ له مسار مغلق واحد على الأقل، أو هو فراغ بطبيعته. */
export function isReady(g: Glyph): boolean {
  if (g.contours.some((c) => c.closed && c.nodes.length >= 3)) return true;
  return g.unicode.toUpperCase() === 'U+0020' || g.name === 'space';
}

export type SortMode = 'ready' | 'added' | 'code';

const codeOf = (g: Glyph): number => {
  const m = /^U\+([0-9A-F]+)$/i.exec(g.unicode);
  return m ? parseInt(m[1], 16) : Number.MAX_SAFE_INTEGER;
};

/** ترتيب العرض: الجاهزة أولاً، أو بترتيب الإضافة، أو بترتيب اليونيكود. لا يغيّر المصفوفة الأصلية. */
export function sortGlyphs(glyphs: Glyph[], mode: SortMode): Glyph[] {
  const list = [...glyphs];
  if (mode === 'ready') {
    return list
      .map((g, i) => ({ g, i, r: isReady(g) ? 0 : 1 }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.g);
  }
  if (mode === 'code') {
    return list
      .map((g, i) => ({ g, i }))
      .sort((a, b) => codeOf(a.g) - codeOf(b.g) || a.i - b.i)
      .map((x) => x.g);
  }
  return list;
}
```

## الخطوة 22: أضف الكود التالي في آخر الملف `src/utils/glyphLogic.test.ts` (بعد آخر سطر، دون حذف شيء)

```

test('isReady and sortGlyphs', async () => {
  const { isReady, sortGlyphs } = await import('./glyphLogic');
  const empty = mk('e', 'U+0041');
  const drawn = mk('d', 'U+0042');
  drawn.contours = [
    { id: 'c', closed: true, nodes: [1, 2, 3].map((i) => ({ id: 'n' + i, x: i, y: i, kind: 'corner' as const, handleIn: null, handleOut: null })) },
  ];
  const space = createGlyph({ char: ' ', name: 'space', unicode: 'U+0020', category: 'symbol' });
  assert.equal(isReady(empty), false);
  assert.equal(isReady(drawn), true);
  assert.equal(isReady(space), true);
  assert.deepEqual(sortGlyphs([empty, drawn, space], 'ready').map((g) => g.name), ['d', 'space', 'e']);
  assert.deepEqual(sortGlyphs([drawn, space, empty], 'code').map((g) => g.name), ['space', 'e', 'd']);
  assert.deepEqual(sortGlyphs([drawn, space, empty], 'added').map((g) => g.name), ['d', 'space', 'e']);
});
```

## الخطوة 23: في الملف `src/state/useProjects.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  return {
    projects,
```

**النص الجديد:**
```
  const removeGlyphs = useCallback((projectId: string, glyphIds: string[]) => {
    const drop = new Set(glyphIds);
    setProjects((prev) =>
      logic.updateProjectById(prev, projectId, (p) => ({
        ...p,
        glyphs: p.glyphs.filter((g) => !drop.has(g.id)),
      }))
    );
  }, []);

  return {
    projects,
```

## الخطوة 24: في الملف `src/state/useProjects.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    removeGlyph,
  };
```

**النص الجديد:**
```
    removeGlyph,
    removeGlyphs,
  };
```

## الخطوة 25: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const handleDuplicateGlyph =
```

**النص الجديد:**
```
  const handleDeleteGlyphs = (ids: string[]) => {
    if (!activeProject) return;
    store.removeGlyphs(activeProject.id, ids);
    if (selectedGlyphId && ids.includes(selectedGlyphId)) setSelectedGlyphId(null);
  };

  const handleDuplicateGlyph =
```

## الخطوة 26: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
            onDeleteGlyph={handleDeleteGlyph}

```

**النص الجديد:**
```
            onDeleteGlyph={handleDeleteGlyph}
            onDeleteGlyphs={handleDeleteGlyphs}

```

## الخطوة 27: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { type GlyphMeta } from '../utils/glyphLogic';
```

**النص الجديد:**
```
import { type GlyphMeta, type SortMode, isReady, sortGlyphs } from '../utils/glyphLogic';
```

## الخطوة 28: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  onDeleteGlyph: (glyphId: string) => void;
  onDuplicateGlyph
```

**النص الجديد:**
```
  onDeleteGlyph: (glyphId: string) => void;
  onDeleteGlyphs: (glyphIds: string[]) => void;
  onDuplicateGlyph
```

## الخطوة 29: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  onDeleteGlyph,
  onDuplicateGlyph,
}) => {
```

**النص الجديد:**
```
  onDeleteGlyph,
  onDeleteGlyphs,
  onDuplicateGlyph,
}) => {
  const [sort, setSort] = useState<SortMode>('ready');
  const [confirmEmpty, setConfirmEmpty] = useState(false);
```

## الخطوة 30: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const isEmpty = glyphs.length === 0;
```

**النص الجديد:**
```
  const isEmpty = glyphs.length === 0;
  const shown = sortGlyphs(glyphs, sort);
  const notReadyIds = glyphs.filter((g) => !isReady(g)).map((g) => g.id);
```

## الخطوة 31: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => setShowPreset(true)}>
```

**النص الجديد:**
```
        <div className="flex flex-wrap items-center gap-2">
          {!isEmpty && (
            <select
              aria-label="ترتيب المحارف"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="field"
              style={{ width: 'auto', height: 36 }}
            >
              <option value="ready">الجاهزة أولاً</option>
              <option value="added">حسب الإضافة</option>
              <option value="code">حسب اليونيكود</option>
            </select>
          )}
          {notReadyIds.length > 0 && (
            <Button title="حذف كل المحارف التي لم تُرسم بعد" onClick={() => setConfirmEmpty(true)}>
              <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>حذف غير الجاهزة ({notReadyIds.length})</span>
            </Button>
          )}
          <Button onClick={() => setShowPreset(true)}>
```

## الخطوة 32: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
          {glyphs.map((glyph) => (
            <div
```

**النص الجديد:**
```
          {shown.map((glyph) => (
            <div
```

## الخطوة 33: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      {showPreset && (
```

**النص الجديد:**
```
      {confirmEmpty && (
        <Modal title="حذف المحارف غير الجاهزة" size="sm" onClose={() => setConfirmEmpty(false)}>
          <p className="text-sm leading-7">
            سيُحذف <span className="font-mono">{notReadyIds.length}</span> محرف لم يُرسم فيه مسار مغلق بعد
            (محرف الفراغ يبقى). لا يمكن التراجع، لكن يمكنك إعادتها من المجموعات الجاهزة.
          </p>
          <ModalActions>
            <Button onClick={() => setConfirmEmpty(false)}>إلغاء</Button>
            <Button
              variant="primary"
              onClick={() => {
                onDeleteGlyphs(notReadyIds);
                setConfirmEmpty(false);
              }}
            >
              حذف
            </Button>
          </ModalActions>
        </Modal>
      )}

      {showPreset && (
```

## الخطوة 34: أنشئ الملف `src/utils/features.ts` (أو استبدل محتواه كاملاً)

```ts
import { type Glyph, type GlyphForm, type NewGlyphData } from '../types/font';

/*
  ميزات الأوبن تايب الأساسية للخط العربي، تُستخرج تلقائياً من أسماء المحارف:
    beh        الشكل المنفصل (الأساسي، له رمز يونيكود)
    beh.init   شكل البداية   → ميزة init
    beh.medi   شكل الوسط    → ميزة medi
    beh.fina   شكل النهاية   → ميزة fina
    beh.isol   منفصل بديل    → ميزة isol
    lam_alef        ترابط لام وألف في أول الكلمة       → ميزة rlig
    lam_alef.fina   ترابط لام وألف متصل بما قبله       → ميزة rlig
  لا حاجة لكتابة أي كود: يكفي اتباع هذه التسمية.
*/

export type FormSuffix = 'init' | 'medi' | 'fina' | 'isol';
export type FeatureTag = FormSuffix | 'rlig';

export const FEATURE_INFO: Record<FeatureTag, { label: string; description: string }> = {
  isol: { label: 'المنفصل', description: 'يُستعمل الحرف حين لا يتصل بما قبله ولا بما بعده.' },
  init: { label: 'البداية', description: 'يُستعمل الحرف في أول الكلمة متصلاً بما بعده.' },
  medi: { label: 'الوسط', description: 'يُستعمل الحرف في وسط الكلمة متصلاً من الجهتين.' },
  fina: { label: 'النهاية', description: 'يُستعمل الحرف في آخر الكلمة متصلاً بما قبله.' },
  rlig: { label: 'الروابط', description: 'يستبدل حرفين متتاليين بمحرف واحد مثل لام وألف.' },
};

export const FEATURE_ORDER: FeatureTag[] = ['isol', 'fina', 'medi', 'init', 'rlig'];

const SUFFIXES: readonly string[] = ['init', 'medi', 'fina', 'isol'];
const FORM_OF: Record<FormSuffix, GlyphForm> = {
  init: 'initial',
  medi: 'medial',
  fina: 'final',
  isol: 'isolated',
};

export function splitName(name: string): { base: string; suffix: FormSuffix | null } {
  const i = name.lastIndexOf('.');
  if (i > 0 && SUFFIXES.includes(name.slice(i + 1))) {
    return { base: name.slice(0, i), suffix: name.slice(i + 1) as FormSuffix };
  }
  return { base: name, suffix: null };
}

/** نوع الاتصال: D يتصل من الجهتين، R يتصل بما قبله فقط، U لا يتصل. */
export type Joining = 'D' | 'R' | 'U';

export const JOINING: Record<string, Joining> = {
  hamza: 'U',
  alefMadda: 'R', alefHamzaAbove: 'R', wawHamza: 'R', alefHamzaBelow: 'R', alef: 'R',
  yehHamza: 'D', beh: 'D', tehMarbuta: 'R', teh: 'D', theh: 'D', jeem: 'D', hah: 'D', khah: 'D',
  dal: 'R', thal: 'R', reh: 'R', zain: 'R', seen: 'D', sheen: 'D', sad: 'D', dad: 'D',
  tah: 'D', zah: 'D', ain: 'D', ghain: 'D', feh: 'D', qaf: 'D', kaf: 'D', lam: 'D', meem: 'D',
  noon: 'D', heh: 'D', waw: 'R', alefMaksura: 'R', yeh: 'D',
};

export function formsFor(j: Joining): FormSuffix[] {
  return j === 'D' ? ['init', 'medi', 'fina'] : j === 'R' ? ['fina'] : [];
}

export interface Rule {
  feature: FeatureTag;
  kind: 'single' | 'ligature';
  from: string[];
  to: string;
}

export interface FeatureReport {
  rules: Rule[];
  /** مشكلات: محرف ينقصه ما يلزم ليعمل. */
  gaps: Array<{ glyph: string; message: string }>;
  /** محارف شكلها المختار لا يطابق لاحقة اسمها. */
  mismatches: string[];
}

function isLigature(g: Glyph): boolean {
  return g.category === 'ligature' && splitName(g.name).base.includes('_');
}

export function computeFeatures(glyphs: Glyph[]): FeatureReport {
  const names = new Set(glyphs.map((g) => g.name));
  const rules: Rule[] = [];
  const gaps: FeatureReport['gaps'] = [];
  const mismatches: string[] = [];

  for (const g of glyphs) {
    const { base, suffix } = splitName(g.name);

    if (isLigature(g)) {
      const parts = base.split('_');
      const firstForm: FormSuffix = suffix === 'fina' ? 'medi' : 'init';
      const need = parts.map((p, i) => `${p}.${i === 0 ? firstForm : i === parts.length - 1 ? 'fina' : 'medi'}`);
      const missing = need.filter((n) => !names.has(n));
      if (missing.length) {
        gaps.push({ glyph: g.name, message: `ينقص: ${missing.join('، ')}` });
      } else {
        rules.push({ feature: 'rlig', kind: 'ligature', from: need, to: g.name });
      }
      continue;
    }

    if (suffix) {
      if (!names.has(base)) {
        gaps.push({ glyph: g.name, message: `لا يوجد المحرف الأساسي ${base}` });
        continue;
      }
      rules.push({ feature: suffix, kind: 'single', from: [base], to: g.name });
      if (g.form !== FORM_OF[suffix]) mismatches.push(g.name);
    } else if (g.form !== 'isolated') {
      mismatches.push(g.name);
    }
  }

  rules.sort(
    (a, b) =>
      FEATURE_ORDER.indexOf(a.feature) - FEATURE_ORDER.indexOf(b.feature) || a.to.localeCompare(b.to)
  );
  return { rules, gaps, mismatches };
}

/** الأشكال الناقصة لكل حرف موجود في المشروع بحسب نوع اتصاله. */
export function missingForms(glyphs: Glyph[]): NewGlyphData[] {
  const names = new Set(glyphs.map((g) => g.name));
  const out: NewGlyphData[] = [];
  for (const g of glyphs) {
    const { suffix } = splitName(g.name);
    if (suffix) continue;
    const j = JOINING[g.name];
    if (!j) continue;
    for (const s of formsFor(j)) {
      const name = `${g.name}.${s}`;
      if (names.has(name)) continue;
      out.push({
        char: g.char,
        name,
        unicode: '',
        category: 'letter',
        form: FORM_OF[s],
        advanceWidth: g.advanceWidth,
      });
    }
  }
  return out;
}

export function ruleToFea(r: Rule): string {
  return r.kind === 'single' ? `sub ${r.from[0]} by ${r.to};` : `sub ${r.from.join(' ')} by ${r.to};`;
}

/** كود FEA للقواعد المستخرجة. */
export function rulesToFea(report: FeatureReport): string {
  const blocks: string[] = [];
  for (const tag of FEATURE_ORDER) {
    const rs = report.rules.filter((r) => r.feature === tag);
    if (rs.length === 0) continue;
    blocks.push(`feature ${tag} {\n${rs.map((r) => `    ${ruleToFea(r)}`).join('\n')}\n} ${tag};`);
  }
  return blocks.join('\n\n');
}

/** ترتيب الإضافة في opentype.js: أبجدي للوسوم. */
export function rulesForBuild(report: FeatureReport): Rule[] {
  return [...report.rules].sort(
    (a, b) => a.feature.localeCompare(b.feature) || (a.kind === b.kind ? 0 : a.kind === 'single' ? -1 : 1)
  );
}

```

## الخطوة 35: أنشئ الملف `src/utils/features.test.ts` (أو استبدل محتواه كاملاً)

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { type Glyph, type GlyphCategory, type GlyphForm } from '../types/font';
import { createGlyph } from './fontLogic';
import { computeFeatures, missingForms, rulesToFea, splitName } from './features';

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

```

## الخطوة 36: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
