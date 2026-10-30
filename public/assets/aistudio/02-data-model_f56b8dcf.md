# الملف ٢ — نموذج البيانات والمنطق

هذا الملف يضيف نموذج البيانات الجديد (المسار هو مصدر الحقيقة الوحيد) ومنطق المشاريع والمحارف والمقاييس. لا يغيّر أي شاشة بعد. **لا تشغّل `npm run build` ولا `npm run lint` في هذا الملف.** الشاشات القديمة ستظهر فيها أخطاء طبيعية حتى الملف ٨.

## قواعد عامة (تنطبق على كل الملفات)

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- انسخ المحتوى داخل كل كتلة كود كما هو بالضبط، بدون تغيير حرف واحد وبدون تعليقات إضافية.
- الأمر "أنشئ الملف" يعني: أنشئه، وإن كان موجوداً مسبقاً استبدل محتواه بالكامل. أنشئ المجلدات الناقصة.
- لا تلمس أي ملف غير مذكور. لا تحذف ولا تنقل ولا تعيد تسمية أي ملف إلا إذا طُلب صراحة.
- إذا ظهر خطأ غير متوقع أو تعذّر أمر: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- لا تصلح أي خطأ يظهر في ملفات قديمة غير مذكورة هنا. سنحذفها في ملف لاحق.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر 1: تثبيت المكتبات

شغّل هذا الأمر في مجلد المشروع:

```
npm install -D tsx @types/node
```

ثم شغّل `npm ls lucide-react`. إذا ظهر أن المكتبة غير مثبّتة شغّل `npm install lucide-react`. إذا كانت مثبّتة لا تفعل شيئاً.

---

## الأمر 2: `src/types/font.ts`

هذا ملف الأنواع الجديد. يعيش بجانب أي ملف أنواع قديم دون أن يتعارض معه. لا تحذف القديم.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
export interface Vec {
  x: number;
  y: number;
}

export type NodeKind = 'corner' | 'smooth';

/**
 * نقطة على المسار. المقبضان مخزّنان كإزاحة نسبة إلى موضع النقطة،
 * فعند تحريك النقطة يتحرك مقبضاها تلقائياً. القيمة null تعني بلا مقبض.
 */
export interface PathNode {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  handleIn: Vec | null;
  handleOut: Vec | null;
}

/** مسار واحد. هذا هو المصدر الوحيد للحقيقة، ونص SVG يُولَّد منه عند العرض فقط. */
export interface Contour {
  id: string;
  closed: boolean;
  nodes: PathNode[];
}

export interface AnchorPoint {
  id: string;
  name: string; // top, bottom, entry, exit
  x: number;
  y: number;
}

export type GlyphCategory = 'letter' | 'diacritic' | 'number' | 'symbol' | 'ligature';
export type GlyphForm = 'isolated' | 'initial' | 'medial' | 'final';

/**
 * ملاحظة: العارضان الأيمن والأيسر لا يُخزَّنان. يُحسبان دائماً من حدود المسارات
 * ومن العرض الكامل، حتى لا يختلف رقم مخزّن عن الرسم الفعلي.
 */
export interface Glyph {
  id: string;
  name: string;
  unicode: string; // مثل U+0627، أو نص فارغ للأشكال غير المرمّزة
  char: string;
  category: GlyphCategory;
  form: GlyphForm;
  advanceWidth: number;
  contours: Contour[];
  anchors: AnchorPoint[];
}

export interface NewGlyphData {
  char: string;
  name: string;
  unicode: string;
  category: GlyphCategory;
}

/** خط الأساس ثابت عند 0 ولذلك لا يُخزَّن. */
export interface FontMetrics {
  upm: number;
  ascender: number;
  capHeight: number;
  xHeight: number;
  descender: number;
}

export interface OpenTypeFeature {
  tag: string;
  name: string;
  enabled: boolean;
  code: string;
}

export interface FontProject {
  id: string;
  name: string;
  designer: string;
  version: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  metrics: FontMetrics;
  glyphs: Glyph[];
  features: OpenTypeFeature[];
}
```

---

## الأمر 3: `src/utils/fontLogic.ts`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
import { type FontMetrics, type FontProject, type Glyph, type NewGlyphData } from '../types/font';

export const DEFAULT_METRICS: FontMetrics = {
  upm: 1000,
  ascender: 800,
  capHeight: 700,
  xHeight: 500,
  descender: -200,
};

/** معرّف فريد. لا يتكرر حتى لو أُنشئ أكثر من عنصر في نفس الجزء من الثانية. */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProject(
  name: string,
  designer: string,
  description: string
): FontProject {
  const now = new Date().toISOString();
  return {
    id: uid('font'),
    name: name.trim(),
    designer: designer.trim() || 'المصمم',
    version: '1.0.0',
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
    metrics: { ...DEFAULT_METRICS },
    glyphs: [],
    features: [],
  };
}

export function createGlyph(data: NewGlyphData): Glyph {
  return {
    id: uid('glyph'),
    char: data.char,
    name: data.name,
    unicode: data.unicode,
    category: data.category,
    form: 'isolated',
    advanceWidth: 500,
    contours: [],
    anchors: [],
  };
}

/** اسم المحرف المقترح بحسب نقطة اليونيكود، مثل uni0628. */
export function defaultGlyphName(char: string): string {
  const cp = Array.from(char)[0]?.codePointAt(0);
  if (cp === undefined) return '';
  return `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

export function defaultUnicode(char: string): string {
  const cp = Array.from(char)[0]?.codePointAt(0);
  if (cp === undefined) return '';
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** يعيد نص الخطأ بالعربية، أو null إذا كانت البيانات صالحة. */
export function validateNewGlyph(
  existing: Glyph[],
  data: NewGlyphData
): string | null {
  if (!data.char.trim()) return 'اكتب المحرف أو الرمز.';
  if (!/^[A-Za-z_][A-Za-z0-9._-]*$/.test(data.name)) {
    return 'اسم المحرف يبدأ بحرف لاتيني ويحوي حروفاً لاتينية وأرقاماً ونقطة وشرطة فقط.';
  }
  if (data.unicode && !/^U\+[0-9A-F]{4,6}$/i.test(data.unicode)) {
    return 'صيغة اليونيكود غير صحيحة. مثال صحيح: U+0628';
  }
  if (existing.some((g) => g.name === data.name)) {
    return 'يوجد محرف بنفس الاسم في هذا المشروع.';
  }
  if (
    data.unicode &&
    existing.some((g) => g.unicode.toUpperCase() === data.unicode.toUpperCase())
  ) {
    return 'يوجد محرف بنفس نقطة اليونيكود في هذا المشروع.';
  }
  return null;
}

/** تحقق من تناسق المقاييس. خط الأساس ثابت عند 0. */
export function validateMetrics(metrics: FontMetrics): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (metrics.upm < 100 || metrics.upm > 4096) {
    errors.push('مقياس UPM يجب أن يكون بين 100 و 4096 وحدة.');
  }
  if (metrics.ascender <= 0) {
    errors.push('ارتفاع الصاعد يجب أن يكون أعلى من خط الأساس.');
  }
  if (metrics.descender >= 0) {
    errors.push('عمق الهابط يجب أن يكون قيمة سالبة تحت خط الأساس.');
  }
  if (metrics.capHeight > metrics.ascender) {
    errors.push('ارتفاع الحروف الكبيرة لا يتجاوز الصاعد.');
  }
  if (metrics.xHeight > metrics.capHeight) {
    errors.push('ارتفاع الحروف الصغيرة لا يتجاوز ارتفاع الحروف الكبيرة.');
  }

  return { isValid: errors.length === 0, errors };
}

export function renameProject(
  projects: FontProject[],
  projectId: string,
  newName: string
): FontProject[] {
  const trimmed = newName.trim();
  if (!trimmed) return projects;
  return projects.map((p) =>
    p.id === projectId
      ? { ...p, name: trimmed, updatedAt: new Date().toISOString() }
      : p
  );
}

export function deleteProject(
  projects: FontProject[],
  projectId: string
): FontProject[] {
  return projects.filter((p) => p.id !== projectId);
}

/** نسخة مستقلة تماماً: معرّف جديد ونسخة عميقة من كل البيانات. */
export function duplicateProject(
  projects: FontProject[],
  projectId: string
): FontProject[] {
  const target = projects.find((p) => p.id === projectId);
  if (!target) return projects;

  const now = new Date().toISOString();
  const copy: FontProject = {
    ...structuredClone(target),
    id: uid('font'),
    name: `${target.name} (نسخة)`,
    createdAt: now,
    updatedAt: now,
  };

  return [copy, ...projects];
}

/** يطبّق تعديلاً على مشروع واحد ويحدّث تاريخ التعديل. */
export function updateProjectById(
  projects: FontProject[],
  projectId: string,
  updater: (project: FontProject) => FontProject
): FontProject[] {
  return projects.map((p) =>
    p.id === projectId
      ? { ...updater(p), updatedAt: new Date().toISOString() }
      : p
  );
}

/** يصيغ ملف ميزات الأوبن تايب (FEA) لمترجمات الخطوط. */
export function generateOpenTypeFea(project: FontProject): string {
  const header = `# --------------------------------------------------
# OpenType Feature File
# Font: ${project.name}
# Designer: ${project.designer || 'Font Foundry Studio'}
# Version: ${project.version}
# UPM: ${project.metrics.upm}
# Generated: ${new Date().toISOString().split('T')[0]}
# --------------------------------------------------

languagesystem DFLT dflt;
languagesystem arab dflt;
languagesystem latn dflt;

`;

  const features = project.features
    .filter((f) => f.enabled)
    .map((f) => {
      return `feature ${f.tag} {
    # ${f.name}
${f.code.split('\n').map((line) => `    ${line}`).join('\n')}
} ${f.tag};`;
    })
    .join('\n\n');

  return header + features;
}

export function exportProjectJSON(project: FontProject): string {
  return JSON.stringify(project, null, 2);
}
```

---

## الأمر 4: `src/utils/fontLogic.test.ts`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
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
```

---

## التحقق (آخر خطوة)

1. شغّل `npm test`. يجب أن ينجح 11 اختباراً وتفشل صفر.
2. أرسل لي فقط: عدد الاختبارات الناجحة، ونص أي خطأ ظهر.
