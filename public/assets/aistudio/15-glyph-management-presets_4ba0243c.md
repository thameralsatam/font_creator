# الدفعة 15: تعديل وحذف وتكرار المحارف + المجموعات الجاهزة

يضيف أزرار تعديل وتكرار وحذف تحت كل محرف، ومجموعات جاهزة (الحروف العربية والتشكيل والأرقام والترقيم) بأسمائها ورموزها الصحيحة. ملاحظة: الخطوات التي تنشئ ملفات جديدة تأتي في الآخر، فنفّذ كل الخطوات بترتيبها.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: في الملف `src/types/font.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  unicode: string;
  category: GlyphCategory;
}

/** خط الأساس
```

**النص الجديد:**
```
  unicode: string;
  category: GlyphCategory;
  /** اختياري: عرض ابتدائي للمحرف (تستعمله المجموعات الجاهزة). */
  advanceWidth?: number;
}

/** خط الأساس
```

## الخطوة 2: في الملف `src/utils/fontLogic.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    advanceWidth: 500,
```

**النص الجديد:**
```
    advanceWidth: data.advanceWidth ?? 500,
```

## الخطوة 3: في الملف `src/state/useProjects.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const updateGlyph = useCallback(
```

**النص الجديد:**
```
  /** يضيف عدة محارف دفعة واحدة (مجموعة جاهزة أو نسخة). */
  const addGlyphs = useCallback((projectId: string, glyphs: Glyph[]) => {
    if (glyphs.length === 0) return;
    setProjects((prev) =>
      logic.updateProjectById(prev, projectId, (p) => ({ ...p, glyphs: [...p.glyphs, ...glyphs] }))
    );
  }, []);

  const updateGlyph = useCallback(
```

## الخطوة 4: في الملف `src/state/useProjects.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    addGlyph,
    updateGlyph,
```

**النص الجديد:**
```
    addGlyph,
    addGlyphs,
    updateGlyph,
```

## الخطوة 5: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const handleEnterStudio =
```

**النص الجديد:**
```
  const handleEditGlyph = (glyphId: string, meta: GlyphMeta) => {
    if (!activeProject) return;
    store.updateGlyph(activeProject.id, glyphId, (g) => applyGlyphMeta(g, meta));
  };

  const handleDeleteGlyph = (glyphId: string) => {
    if (!activeProject) return;
    store.removeGlyph(activeProject.id, glyphId);
    if (selectedGlyphId === glyphId) setSelectedGlyphId(null);
  };

  const handleDuplicateGlyph = (glyphId: string) => {
    if (!activeProject) return;
    const copy = duplicateGlyph(activeProject.glyphs, glyphId);
    if (copy) store.addGlyphs(activeProject.id, [copy]);
  };

  const handleAddPreset = (items: NewGlyphData[]) => {
    if (!activeProject) return;
    store.addGlyphs(activeProject.id, items.map(createGlyph));
  };

  const handleEnterStudio =
```

## الخطوة 6: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
            onAddNewGlyph={handleAddGlyph}

```

**النص الجديد:**
```
            onAddNewGlyph={handleAddGlyph}
            onAddPreset={handleAddPreset}
            onEditGlyph={handleEditGlyph}
            onDeleteGlyph={handleDeleteGlyph}
            onDuplicateGlyph={handleDuplicateGlyph}

```

## الخطوة 7: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { type FontMetrics, type NewGlyphData } from './types/font';
```

**النص الجديد:**
```
import { type FontMetrics, type NewGlyphData } from './types/font';
import { createGlyph } from './utils/fontLogic';
import { applyGlyphMeta, duplicateGlyph, type GlyphMeta } from './utils/glyphLogic';
```

## الخطوة 8: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { ArrowRight, Download, PenTool, Plus, Sliders } from 'lucide-react';
```

**النص الجديد:**
```
import { ArrowRight, Copy, Download, Layers, Pencil, PenTool, Plus, Sliders, Trash2 } from 'lucide-react';
```

## الخطوة 9: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { type FontProject, type GlyphCategory, type NewGlyphData } from '../types/font';
```

**النص الجديد:**
```
import { type FontProject, type GlyphCategory, type NewGlyphData } from '../types/font';
import { type GlyphMeta } from '../utils/glyphLogic';
```

## الخطوة 10: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { GlyphThumb } from './GlyphThumb';
```

**النص الجديد:**
```
import { GlyphEditModal } from './GlyphEditModal';
import { GlyphThumb } from './GlyphThumb';
import { PresetModal } from './PresetModal';
```

## الخطوة 11: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  onAddNewGlyph: (glyphData: NewGlyphData) => void;
}
```

**النص الجديد:**
```
  onAddNewGlyph: (glyphData: NewGlyphData) => void;
  onAddPreset: (items: NewGlyphData[]) => void;
  onEditGlyph: (glyphId: string, meta: GlyphMeta) => void;
  onDeleteGlyph: (glyphId: string) => void;
  onDuplicateGlyph: (glyphId: string) => void;
}
```

## الخطوة 12: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  onAddNewGlyph,
}) => {
  const [showAdd, setShowAdd] = useState(false);
```

**النص الجديد:**
```
  onAddNewGlyph,
  onAddPreset,
  onEditGlyph,
  onDeleteGlyph,
  onDuplicateGlyph,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [showPreset, setShowPreset] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
```

## الخطوة 13: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        {!isEmpty && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>إضافة محرف</span>
          </Button>
        )}
      </div>
```

**النص الجديد:**
```
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowPreset(true)}>
            <Layers className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>مجموعات جاهزة</span>
          </Button>
          {!isEmpty && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>إضافة محرف</span>
            </Button>
          )}
        </div>
      </div>
```

## الخطوة 14: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
          {glyphs.map((glyph) => (
            <button
              key={glyph.id}
              type="button"
              onClick={() => onEnterStudio(glyph.id)}
              className="glass-panel group flex flex-col items-stretch rounded-2xl p-4 text-start transition-all hover:-translate-y-1 hover:border-ink/45 hover:shadow-md"
            >
```

**النص الجديد:**
```
          {glyphs.map((glyph) => (
            <div
              key={glyph.id}
              className="glass-panel group flex flex-col items-stretch rounded-2xl p-4 transition-all hover:-translate-y-1 hover:border-ink/45 hover:shadow-md"
            >
            <button
              type="button"
              onClick={() => onEnterStudio(glyph.id)}
              className="flex flex-col items-stretch text-start"
              title="فتح المحرف في الاستوديو"
            >
```

## الخطوة 15: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
                <span className="font-mono text-[10px] text-ink-soft">{glyph.advanceWidth}u</span>
              </div>
            </button>
          ))}
```

**النص الجديد:**
```
                <span className="font-mono text-[10px] text-ink-soft">{glyph.advanceWidth}u</span>
              </div>
            </button>
            <div className="mt-2 flex items-center justify-end gap-1 border-t border-ink/10 pt-2">
              <Button variant="quiet" icon title="تعديل بيانات المحرف" onClick={() => setEditingId(glyph.id)}>
                <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
              </Button>
              <Button variant="quiet" icon title="تكرار المحرف" onClick={() => onDuplicateGlyph(glyph.id)}>
                <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
              </Button>
              <Button variant="quiet" icon title="حذف المحرف" onClick={() => setDeletingId(glyph.id)}>
                <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
              </Button>
            </div>
            </div>
          ))}
```

## الخطوة 16: في الملف `src/components/ProjectOverview.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      {showAdd && (
        <Modal title="إضافة محرف جديد" onClose={closeAdd}>
```

**النص الجديد:**
```
      {showPreset && (
        <PresetModal existing={glyphs} onAdd={onAddPreset} onClose={() => setShowPreset(false)} />
      )}

      {editingId && glyphs.find((g) => g.id === editingId) && (
        <GlyphEditModal
          key={editingId}
          glyph={glyphs.find((g) => g.id === editingId)!}
          glyphs={glyphs}
          onSave={(meta) => onEditGlyph(editingId, meta)}
          onClose={() => setEditingId(null)}
        />
      )}

      {deletingId && glyphs.find((g) => g.id === deletingId) && (
        <Modal title="حذف المحرف" size="sm" onClose={() => setDeletingId(null)}>
          <p className="text-sm leading-7">
            سيُحذف المحرف <span className="font-mono">{glyphs.find((g) => g.id === deletingId)!.name}</span> مع
            رسمه نهائياً ولا يمكن التراجع.
          </p>
          <ModalActions>
            <Button onClick={() => setDeletingId(null)}>إلغاء</Button>
            <Button
              variant="primary"
              onClick={() => {
                onDeleteGlyph(deletingId);
                setDeletingId(null);
              }}
            >
              حذف
            </Button>
          </ModalActions>
        </Modal>
      )}

      {showAdd && (
        <Modal title="إضافة محرف جديد" onClose={closeAdd}>
```

## الخطوة 17: في الملف `src/help/helpBook.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
{ h: 'الشكل', p: 'للحرف العربي أشكال: منفرد وأول ووسط وآخر. كل شكل محرف مستقل له رسمه.' },
```

**النص الجديد:**
```
{ h: 'الشكل', p: 'للحرف العربي أشكال: منفرد وبداية ووسط ونهاية. كل شكل محرف مستقل له رسمه، ويُختار شكله من نافذة التعديل. الأشكال غير المنفردة تُترك بلا رمز يونيكود.' },
      { h: 'تعديل المحرف وحذفه وتكراره', p: 'تحت كل بطاقة ثلاثة أزرار: القلم يعدّل الاسم والرمز والتصنيف والشكل دون المساس بالرسم، والنسخ يكرر المحرف برسمه باسم جديد، والسلة تحذفه بعد تأكيد.' },
      { h: 'المجموعات الجاهزة', p: 'زر مجموعات جاهزة يضيف الحروف العربية والتشكيل والأرقام والفراغ وعلامات الترقيم فارغة الرسم وبأسمائها ورموزها الصحيحة. الموجود منها لا يتكرر.' },
```

## الخطوة 18: في الملف `src/utils/fontLogic.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  if (!data.char.trim()) return 'اكتب المحرف أو الرمز.';
```

**النص الجديد:**
```
  // الفراغ محرف صالح، فلا نرفض النص المكوّن من مسافة فقط
  if (!data.char) return 'اكتب المحرف أو الرمز.';
```

## الخطوة 19: أنشئ الملف `src/utils/glyphLogic.ts` (أو استبدل محتواه كاملاً)

```ts
import { type Glyph, type GlyphCategory, type GlyphForm } from '../types/font';
import { uid, validateNewGlyph } from './fontLogic';

/** بيانات المحرف القابلة للتعديل من نافذة التعديل. الرسم والعرض لا يمسّهما. */
export interface GlyphMeta {
  char: string;
  name: string;
  unicode: string;
  category: GlyphCategory;
  form: GlyphForm;
}

/** نص الخطأ بالعربية أو null. يتجاهل المحرف نفسه عند فحص التكرار. */
export function validateGlyphEdit(all: Glyph[], glyphId: string, data: GlyphMeta): string | null {
  return validateNewGlyph(
    all.filter((g) => g.id !== glyphId),
    data
  );
}

export function applyGlyphMeta(glyph: Glyph, data: GlyphMeta): Glyph {
  return {
    ...glyph,
    char: data.char,
    name: data.name.trim(),
    unicode: data.unicode.trim().toUpperCase(),
    category: data.category,
    form: data.form,
  };
}

/** اسم غير مستعمل بصيغة name.copy ثم name.copy2 وهكذا. */
export function uniqueCopyName(all: Glyph[], base: string): string {
  const taken = new Set(all.map((g) => g.name));
  let name = `${base}.copy`;
  for (let i = 2; taken.has(name); i++) name = `${base}.copy${i}`;
  return name;
}

/** نسخة من المحرف برسم مستقل (معرّفات جديدة). اليونيكود يُترك فارغاً لأنه لا يتكرر. */
export function duplicateGlyph(all: Glyph[], glyphId: string): Glyph | null {
  const src = all.find((g) => g.id === glyphId);
  if (!src) return null;
  return {
    ...src,
    id: uid('glyph'),
    name: uniqueCopyName(all, src.name),
    unicode: '',
    contours: src.contours.map((c) => ({
      ...c,
      id: uid('contour'),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: uid('node'),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    })),
    anchors: src.anchors.map((a) => ({ ...a, id: uid('anchor') })),
  };
}

```

## الخطوة 20: أنشئ الملف `src/utils/glyphLogic.test.ts` (أو استبدل محتواه كاملاً)

```ts
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

```

## الخطوة 21: أنشئ الملف `src/utils/presets.ts` (أو استبدل محتواه كاملاً)

```ts
import { type Glyph, type GlyphCategory, type NewGlyphData } from '../types/font';

/*
  مجموعات محارف جاهزة. تُنشأ فارغة (بلا رسم) بأسماء ورموز يونيكود صحيحة،
  وتُتجاهل أي محارف موجودة سلفاً (بالاسم أو برمز اليونيكود).
*/

export interface PresetSet {
  id: string;
  label: string;
  description: string;
  items: NewGlyphData[];
}

type Row = [number, string];

const item = (cp: number, name: string, category: GlyphCategory, advanceWidth?: number): NewGlyphData => ({
  char: String.fromCodePoint(cp),
  name,
  unicode: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
  category,
  ...(advanceWidth !== undefined ? { advanceWidth } : {}),
});

const LETTERS: Row[] = [
  [0x0621, 'hamza'], [0x0622, 'alefMadda'], [0x0623, 'alefHamzaAbove'], [0x0624, 'wawHamza'],
  [0x0625, 'alefHamzaBelow'], [0x0626, 'yehHamza'], [0x0627, 'alef'], [0x0628, 'beh'],
  [0x0629, 'tehMarbuta'], [0x062a, 'teh'], [0x062b, 'theh'], [0x062c, 'jeem'],
  [0x062d, 'hah'], [0x062e, 'khah'], [0x062f, 'dal'], [0x0630, 'thal'],
  [0x0631, 'reh'], [0x0632, 'zain'], [0x0633, 'seen'], [0x0634, 'sheen'],
  [0x0635, 'sad'], [0x0636, 'dad'], [0x0637, 'tah'], [0x0638, 'zah'],
  [0x0639, 'ain'], [0x063a, 'ghain'], [0x0641, 'feh'], [0x0642, 'qaf'],
  [0x0643, 'kaf'], [0x0644, 'lam'], [0x0645, 'meem'], [0x0646, 'noon'],
  [0x0647, 'heh'], [0x0648, 'waw'], [0x0649, 'alefMaksura'], [0x064a, 'yeh'],
];

const MARKS: Row[] = [
  [0x064b, 'fathatan'], [0x064c, 'dammatan'], [0x064d, 'kasratan'], [0x064e, 'fatha'],
  [0x064f, 'damma'], [0x0650, 'kasra'], [0x0651, 'shadda'], [0x0652, 'sukun'],
];

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export const PRESETS: PresetSet[] = [
  {
    id: 'letters',
    label: 'الحروف العربية',
    description: 'الحروف الهجائية وأشكال الهمزة والتاء المربوطة والألف المقصورة (36 محرفاً).',
    items: LETTERS.map(([cp, n]) => item(cp, n, 'letter', 600)),
  },
  {
    id: 'marks',
    label: 'علامات التشكيل',
    description: 'الفتحة والضمة والكسرة والشدة والسكون والتنوين (8 علامات، عرضها صفر).',
    items: MARKS.map(([cp, n]) => item(cp, n, 'diacritic', 0)),
  },
  {
    id: 'arabicDigits',
    label: 'الأرقام العربية',
    description: 'الأرقام الشرقية من ٠ إلى ٩.',
    items: WORDS.map((w, i) => item(0x0660 + i, `${w}.ar`, 'number', 560)),
  },
  {
    id: 'latinDigits',
    label: 'الأرقام اللاتينية',
    description: 'الأرقام من 0 إلى 9.',
    items: WORDS.map((w, i) => item(0x0030 + i, w, 'number', 560)),
  },
  {
    id: 'punct',
    label: 'الفراغ وعلامات الترقيم',
    description: 'الفراغ والنقطة والفاصلة والفاصلة العربية وعلامة الاستفهام العربية والشرطة والنقطتان.',
    items: [
      item(0x0020, 'space', 'symbol', 250),
      item(0x002e, 'period', 'symbol', 260),
      item(0x002c, 'comma', 'symbol', 260),
      item(0x060c, 'comma.ar', 'symbol', 260),
      item(0x061b, 'semicolon.ar', 'symbol', 280),
      item(0x061f, 'question.ar', 'symbol', 500),
      item(0x002d, 'hyphen', 'symbol', 360),
      item(0x003a, 'colon', 'symbol', 260),
    ],
  },
];

/** ما لم يكن موجوداً في المشروع من عناصر المجموعة. */
export function missingOf(existing: Glyph[], items: NewGlyphData[]): NewGlyphData[] {
  const names = new Set(existing.map((g) => g.name));
  const codes = new Set(existing.map((g) => g.unicode.toUpperCase()).filter(Boolean));
  return items.filter((i) => !names.has(i.name) && !codes.has(i.unicode.toUpperCase()));
}

```

## الخطوة 22: أنشئ الملف `src/utils/presets.test.ts` (أو استبدل محتواه كاملاً)

```ts
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

```

## الخطوة 23: أنشئ الملف `src/components/GlyphEditModal.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useState } from 'react';
import { type Glyph, type GlyphCategory, type GlyphForm } from '../types/font';
import { type GlyphMeta, validateGlyphEdit } from '../utils/glyphLogic';
import { CATEGORY_LABEL, FORM_LABEL } from '../utils/labels';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface GlyphEditModalProps {
  glyph: Glyph;
  glyphs: Glyph[];
  onSave: (meta: GlyphMeta) => void;
  onClose: () => void;
}

/** تعديل بيانات المحرف (الاسم والرمز والتصنيف والشكل). الرسم لا يتغير. */
export const GlyphEditModal: React.FC<GlyphEditModalProps> = ({ glyph, glyphs, onSave, onClose }) => {
  const [char, setChar] = useState(glyph.char);
  const [name, setName] = useState(glyph.name);
  const [unicode, setUnicode] = useState(glyph.unicode);
  const [category, setCategory] = useState<GlyphCategory>(glyph.category);
  const [form, setForm] = useState<GlyphForm>(glyph.form);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const meta: GlyphMeta = {
      // نحذف الفراغات الزائدة، لكن محرف الفراغ نفسه (مسافة فقط) يبقى كما هو
      char: char.trim() === '' ? char : char.trim(),
      name: name.trim(),
      unicode: unicode.trim().toUpperCase(),
      category,
      form,
    };
    const problem = validateGlyphEdit(glyphs, glyph.id, meta);
    if (problem) {
      setError(problem);
      return;
    }
    onSave(meta);
    onClose();
  };

  const clear = () => setError(null);

  return (
    <Modal title="تعديل المحرف" subtitle="الرسم لا يتغير، فقط بياناته" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label htmlFor="e-char" className="mb-1 block text-xs text-ink-soft">المحرف أو الرمز</label>
          <input
            id="e-char"
            autoFocus
            required
            maxLength={4}
            value={char}
            onChange={(e) => {
              setChar(e.target.value);
              clear();
            }}
            className="field font-heading text-base"
          />
        </div>
        <div>
          <label htmlFor="e-name" className="mb-1 block text-xs text-ink-soft">اسم المحرف في الخط</label>
          <input
            id="e-name"
            dir="ltr"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clear();
            }}
            className="field font-mono"
          />
        </div>
        <div>
          <label htmlFor="e-unicode" className="mb-1 block text-xs text-ink-soft">
            نقطة اليونيكود (اتركها فارغة للأشكال غير المرمّزة)
          </label>
          <input
            id="e-unicode"
            dir="ltr"
            value={unicode}
            onChange={(e) => {
              setUnicode(e.target.value);
              clear();
            }}
            placeholder="U+0641"
            className="field font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="e-cat" className="mb-1 block text-xs text-ink-soft">التصنيف</label>
            <select
              id="e-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as GlyphCategory)}
              className="field"
            >
              {(Object.keys(CATEGORY_LABEL) as GlyphCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="e-form" className="mb-1 block text-xs text-ink-soft">الشكل</label>
            <select
              id="e-form"
              value={form}
              onChange={(e) => setForm(e.target.value as GlyphForm)}
              className="field"
            >
              {(Object.keys(FORM_LABEL) as GlyphForm[]).map((k) => (
                <option key={k} value={k}>{FORM_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-ink/20 bg-sand/30 p-2.5 text-xs">{error}</p>
        )}

        <ModalActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary">حفظ</Button>
        </ModalActions>
      </form>
    </Modal>
  );
};

```

## الخطوة 24: أنشئ الملف `src/components/PresetModal.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { type Glyph, type NewGlyphData } from '../types/font';
import { PRESETS, missingOf } from '../utils/presets';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface PresetModalProps {
  existing: Glyph[];
  onAdd: (items: NewGlyphData[]) => void;
  onClose: () => void;
}

/** إضافة مجموعات محارف جاهزة (فارغة الرسم) بأسماء ورموز صحيحة. الموجود منها لا يتكرر. */
export const PresetModal: React.FC<PresetModalProps> = ({ existing, onAdd, onClose }) => {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  const rows = useMemo(
    () => PRESETS.map((p) => ({ preset: p, fresh: missingOf(existing, p.items) })),
    [existing]
  );
  const total = rows.reduce((n, r) => n + (picked.has(r.preset.id) ? r.fresh.length : 0), 0);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = () => {
    const items = rows.filter((r) => picked.has(r.preset.id)).flatMap((r) => r.fresh);
    if (items.length === 0) return;
    onAdd(items);
    onClose();
  };

  return (
    <Modal
      title="مجموعات جاهزة"
      subtitle="تُضاف فارغة لترسمها، والموجود منها لا يتكرر"
      icon={<Layers className="h-4 w-4 stroke-[1.5]" />}
      onClose={onClose}
    >
      <div className="space-y-2">
        {rows.map(({ preset, fresh }) => {
          const done = fresh.length === 0;
          return (
            <label
              key={preset.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/15 p-3 ${
                done ? 'opacity-50' : 'hover:bg-sand/30'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                disabled={done}
                checked={picked.has(preset.id)}
                onChange={() => toggle(preset.id)}
              />
              <span className="flex-1">
                <span className="flex items-center justify-between text-sm">
                  <span>{preset.label}</span>
                  <span className="font-mono text-xs text-ink-soft">
                    {done ? 'مضافة كاملة' : `${fresh.length} محرف`}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-6 text-ink-soft">{preset.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      <ModalActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="primary" disabled={total === 0} onClick={submit}>
          {total === 0 ? 'إضافة' : `إضافة ${total} محرف`}
        </Button>
      </ModalActions>
    </Modal>
  );
};

```

## الخطوة 25: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
