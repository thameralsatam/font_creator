# الدفعة 20: معلومات الخط الكاملة (الاسم والنمط والحقوق والترخيص...)

يضيف نموذج معلومات الخط ونافذة تعديلها، ويكتبها في ملف الخط عند التصدير ويقرؤها عند الاستيراد، ويجعل نافذة المقاييس للمقاييس فقط. هذه الدفعة لا تغيّر شكل صفحة المشروع (تأتي الدفعة 21)، لذلك لن ترى زراً جديداً بعد، وكل شيء يعمل كما كان. الخطوات التي تنشئ ملفات جديدة تأتي في الآخر.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: في الملف `src/types/font.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
export interface FontProject {
```

**النص الجديد:**
```
/** معلومات الخط الإضافية. الحقول الفارغة تُحسب تلقائياً من اسم الخط. */
export interface FontInfo {
  subfamily: string;
  fullName: string;
  postScriptName: string;
  copyright: string;
  license: string;
  licenseUrl: string;
  manufacturer: string;
  designerUrl: string;
}

export interface FontProject {
```

## الخطوة 2: في الملف `src/types/font.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  features: OpenTypeFeature[];
}
```

**النص الجديد:**
```
  features: OpenTypeFeature[];
  /** اختيارية: المشاريع القديمة لا تحملها وتُعامل كفارغة. */
  info?: Partial<FontInfo>;
}
```

## الخطوة 3: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { computeFeatures, rulesForBuild } from './features';
```

**النص الجديد:**
```
import { computeFeatures, rulesForBuild } from './features';
import { infoOf, parseVersion, resolveInfo, safePsName } from './fontInfo';
```

## الخطوة 4: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
/** اسم PostScript: حروف لاتينية وأرقام وشرطة فقط، بحد 63 حرفاً. */
export function safePsName(name: string): string {
  const s = name.replace(/[^A-Za-z0-9-]/g, '').slice(0, 63);
  return s || 'FontStudio';
}
```

**النص الجديد:**
```
export { safePsName };
```

## الخطوة 5: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const family = project.name.trim() || 'Font Studio';
  const font = new ot.Font({
    familyName: family,
    styleName: 'Regular',
    unitsPerEm: m.upm,
    ascender: m.ascender,
    descender: m.descender,
    designer: project.designer,
    description: project.description,
    version: `Version ${project.version}`,
    glyphs,
  });
```

**النص الجديد:**
```
  const info = resolveInfo(project);
  const font = new ot.Font({
    familyName: info.family,
    styleName: info.subfamily,
    unitsPerEm: m.upm,
    ascender: m.ascender,
    descender: m.descender,
    designer: info.designer,
    description: info.description,
    version: `Version ${info.version}`,
    glyphs,
  });
  // جدول الأسماء: كل معلومات الخط تُكتب فيه، والفارغ منها لا يُكتب
  const names = font.names as unknown as Record<string, Record<string, string>>;
  names.fullName = { en: info.fullName };
  names.postScriptName = { en: info.postScriptName };
  const optional: Array<[string, string]> = [
    ['copyright', info.copyright],
    ['license', info.license],
    ['licenseURL', info.licenseUrl],
    ['manufacturer', info.manufacturer],
    ['designerURL', info.designerUrl],
  ];
  for (const [key, value] of optional) if (value.trim()) names[key] = { en: value.trim() };
```

## الخطوة 6: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  (font.names as unknown as Record<string, Record<string, string>>).postScriptName = {
    en: safePsName(family) + '-Regular',
  };
  return font.toArrayBuffer();
```

**النص الجديد:**
```
  return font.toArrayBuffer();
```

## الخطوة 7: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
export function fontFileName(project: FontProject): string {
  return `${safePsName(project.name)}-Regular.otf`;
```

**النص الجديد:**
```
export function fontFileName(project: FontProject): string {
  return `${resolveInfo(project).postScriptName}.otf`;
```

## الخطوة 8: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const project = createProject(familyName, pick('designer') ?? '', pick('description') ?? '');

```

**النص الجديد:**
```
  const project = createProject(familyName, pick('designer') ?? '', pick('description') ?? '');
  project.version = parseVersion(pick('version'));
  project.info = {
    ...infoOf(project),
    subfamily: pick('fontSubfamily') || 'Regular',
    fullName: pick('fullName') ?? '',
    postScriptName: /^[A-Za-z0-9-]{1,63}$/.test(pick('postScriptName') ?? '') ? pick('postScriptName')! : '',
    copyright: pick('copyright') ?? '',
    license: pick('license') ?? '',
    licenseUrl: pick('licenseURL') ?? '',
    manufacturer: pick('manufacturer') ?? '',
    designerUrl: pick('designerURL') ?? '',
  };

```

## الخطوة 9: في الملف `src/components/MetricsModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  onSave: (updates: {
    name: string;
    designer: string;
    version: string;
    metrics: FontMetrics;
  }) => void;
```

**النص الجديد:**
```
  onSave: (updates: { metrics: FontMetrics }) => void;
```

## الخطوة 10: في الملف `src/components/MetricsModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const [name, setName] = useState(project.name);
  const [designer, setDesigner] = useState(project.designer);
  const [version, setVersion] = useState(project.version);

```

**النص الجديد:**
```

```

## الخطوة 11: في الملف `src/components/MetricsModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const canSave = !hasBadNumber && validation.isValid && name.trim().length > 0;
```

**النص الجديد:**
```
  const canSave = !hasBadNumber && validation.isValid;
```

## الخطوة 12: في الملف `src/components/MetricsModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    onSave({
      name: name.trim(),
      designer: designer.trim() || 'المصمم',
      version: version.trim() || project.version,
      metrics: parsed,
    });
```

**النص الجديد:**
```
    onSave({ metrics: parsed });
```

## الخطوة 13: في الملف `src/components/MetricsModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      title="إعدادات ومقاييس الخط"
      subtitle="بيانات الخط والأبعاد الرأسية لمربع الخط"
```

**النص الجديد:**
```
      title="مقاييس الخط"
      subtitle="الأبعاد الرأسية لمربع الخط"
```

## الخطوة 14: في الملف `src/components/MetricsModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="m-name" className="mb-1 block text-[11px] text-ink-soft">اسم عائلة الخط</label>
            <input id="m-name" required value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="m-designer" className="mb-1 block text-[11px] text-ink-soft">المصمم</label>
            <input id="m-designer" value={designer} onChange={(e) => setDesigner(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="m-version" className="mb-1 block text-[11px] text-ink-soft">الإصدار</label>
            <input id="m-version" value={version} onChange={(e) => setVersion(e.target.value)} className="field font-mono" />
          </div>
        </div>

        <div className="border-t border-ink/10 pt-4">
          <h3 className="mb-3 text-xs">المقاييس الرأسية</h3>
```

**النص الجديد:**
```
        <div>
```

## الخطوة 15: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const handleSaveMetrics = (updates: {
    name: string;
    designer: string;
    version: string;
    metrics: FontMetrics;
  }) => {
```

**النص الجديد:**
```
  const handleSaveMetrics = (updates: { metrics: FontMetrics }) => {
```

## الخطوة 16: أنشئ الملف `src/utils/fontInfo.ts` (أو استبدل محتواه كاملاً)

```ts
import { type FontInfo, type FontProject } from '../types/font';

/** اسم PostScript: حروف لاتينية وأرقام وشرطة فقط، بحد 63 حرفاً. */
export function safePsName(name: string): string {
  const s = name.replace(/[^A-Za-z0-9-]/g, '').slice(0, 63);
  return s || 'FontStudio';
}

export const SUBFAMILIES = ['Regular', 'Bold', 'Italic', 'Bold Italic', 'Light', 'Medium', 'SemiBold', 'ExtraBold', 'Thin', 'Black'];

export const EMPTY_INFO: FontInfo = {
  subfamily: 'Regular',
  fullName: '',
  postScriptName: '',
  copyright: '',
  license: '',
  licenseUrl: '',
  manufacturer: '',
  designerUrl: '',
};

export function infoOf(p: Pick<FontProject, 'info'>): FontInfo {
  return { ...EMPTY_INFO, ...p.info };
}

export interface ResolvedInfo extends FontInfo {
  family: string;
  version: string;
  designer: string;
  description: string;
}

/** كل المعلومات بعد ملء الفارغ تلقائياً: الاسم الكامل واسم PostScript. */
export function resolveInfo(p: FontProject): ResolvedInfo {
  const i = infoOf(p);
  const family = p.name.trim() || 'Font Studio';
  const subfamily = i.subfamily.trim() || 'Regular';
  return {
    ...i,
    family,
    subfamily,
    fullName: i.fullName.trim() || `${family} ${subfamily}`,
    postScriptName: i.postScriptName.trim() || `${safePsName(family)}-${safePsName(subfamily)}`,
    version: p.version.trim() || '1.0.0',
    designer: p.designer.trim(),
    description: p.description.trim(),
  };
}

export interface InfoForm {
  name: string;
  version: string;
  info: FontInfo;
}

/** أخطاء بالعربية، أو قائمة فارغة إن كانت القيم صالحة. */
export function validateInfo(f: InfoForm): string[] {
  const errors: string[] = [];
  if (!f.name.trim()) errors.push('اسم العائلة مطلوب.');
  if (f.info.postScriptName.trim() && !/^[A-Za-z0-9-]{1,63}$/.test(f.info.postScriptName.trim())) {
    errors.push('اسم PostScript حروف لاتينية وأرقام وشرطة فقط، وبحد أقصى 63 حرفاً.');
  }
  if (f.version.trim() && !/^\d+(\.\d+){0,2}$/.test(f.version.trim())) {
    errors.push('الإصدار أرقام تفصلها نقاط، مثل 1.0 أو 2.1.3.');
  }
  for (const [label, v] of [['رابط الترخيص', f.info.licenseUrl], ['رابط المصمم', f.info.designerUrl]] as const) {
    if (v.trim() && !/^https?:\/\/\S+$/i.test(v.trim())) errors.push(`${label} يبدأ بـ http:// أو https://`);
  }
  return errors;
}

/** يستخرج رقم الإصدار من نص مثل "Version 1.002". */
export function parseVersion(raw: string | undefined): string {
  const m = /(\d+(?:\.\d+){0,2})/.exec(raw ?? '');
  return m ? m[1] : '1.0.0';
}

```

## الخطوة 17: أنشئ الملف `src/utils/fontInfo.test.ts` (أو استبدل محتواه كاملاً)

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from './fontLogic';
import { EMPTY_INFO, parseVersion, resolveInfo, safePsName, validateInfo } from './fontInfo';

test('resolveInfo fills full and PostScript names automatically', () => {
  const p = createProject('My Font', 'Sam', '');
  const r = resolveInfo(p);
  assert.equal(r.fullName, 'My Font Regular');
  assert.equal(r.postScriptName, 'MyFont-Regular');
  const q = { ...p, info: { subfamily: 'Bold Italic', fullName: 'Custom Name' } };
  const s = resolveInfo(q);
  assert.equal(s.fullName, 'Custom Name');
  assert.equal(s.postScriptName, 'MyFont-BoldItalic');
  assert.equal(resolveInfo(createProject('خط رقيم', '', '')).postScriptName, 'FontStudio-Regular');
});

test('validateInfo rejects bad values', () => {
  const ok = { name: 'x', version: '1.0.0', info: { ...EMPTY_INFO } };
  assert.deepEqual(validateInfo(ok), []);
  assert.equal(validateInfo({ ...ok, name: ' ' }).length, 1);
  assert.equal(validateInfo({ ...ok, version: 'v1' }).length, 1);
  assert.equal(validateInfo({ ...ok, info: { ...EMPTY_INFO, postScriptName: 'bad name' } }).length, 1);
  assert.equal(validateInfo({ ...ok, info: { ...EMPTY_INFO, licenseUrl: 'ftp://a' } }).length, 1);
  assert.deepEqual(validateInfo({ ...ok, info: { ...EMPTY_INFO, licenseUrl: 'https://a.b/c' } }), []);
});

test('parseVersion and safePsName', () => {
  assert.equal(parseVersion('Version 1.002'), '1.002');
  assert.equal(parseVersion(undefined), '1.0.0');
  assert.equal(safePsName('a b!'), 'ab');
});

```

## الخطوة 18: أنشئ الملف `src/utils/fontInfoBuild.test.ts` (أو استبدل محتواه كاملاً)

```ts
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

```

## الخطوة 19: أنشئ الملف `src/components/FontInfoModal.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useState } from 'react';
import { AlertCircle, FileText } from 'lucide-react';
import { type FontInfo, type FontProject } from '../types/font';
import { SUBFAMILIES, infoOf, resolveInfo, validateInfo } from '../utils/fontInfo';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

export interface InfoPatch {
  name: string;
  designer: string;
  version: string;
  description: string;
  info: FontInfo;
}

interface FontInfoModalProps {
  project: FontProject;
  onSave: (patch: InfoPatch) => void;
  onClose: () => void;
}

const Field: React.FC<{
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-[11px] text-ink-soft">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[10px] text-ink-soft">{hint}</p>}
  </div>
);

/** كل معلومات الخط. تُكتب في جدول الأسماء عند التصدير وتُقرأ منه عند الاستيراد. */
export const FontInfoModal: React.FC<FontInfoModalProps> = ({ project, onSave, onClose }) => {
  const auto = resolveInfo(project);
  const [name, setName] = useState(project.name);
  const [designer, setDesigner] = useState(project.designer);
  const [version, setVersion] = useState(project.version);
  const [description, setDescription] = useState(project.description);
  const [info, setInfo] = useState<FontInfo>(infoOf(project));
  const set = (k: keyof FontInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInfo((i) => ({ ...i, [k]: e.target.value }));

  const errors = validateInfo({ name, version, info });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length) return;
    onSave({
      name: name.trim(),
      designer: designer.trim() || 'المصمم',
      version: version.trim() || '1.0.0',
      description: description.trim(),
      info: Object.fromEntries(Object.entries(info).map(([k, v]) => [k, v.trim()])) as unknown as FontInfo,
    });
    onClose();
  };

  // القيم المحسوبة تلقائياً تظهر كتلميح داخل الحقل الفارغ
  const fullAuto = `${name.trim() || auto.family} ${info.subfamily.trim() || 'Regular'}`;

  return (
    <Modal
      title="معلومات الخط"
      subtitle="تظهر في ملف الخط عند التصدير، وتُقرأ منه عند الاستيراد"
      icon={<FileText className="h-4 w-4 stroke-[1.5]" />}
      size="xl"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="i-name" label="اسم العائلة" hint="الاسم الذي يراه المستخدم في قائمة الخطوط.">
            <input id="i-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </Field>
          <Field id="i-sub" label="النمط" hint="مثل Regular أو Bold. للخط العادي اتركه Regular.">
            <input
              id="i-sub"
              dir="ltr"
              list="i-sub-list"
              value={info.subfamily}
              onChange={set('subfamily')}
              className="field font-mono"
            />
            <datalist id="i-sub-list">
              {SUBFAMILIES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field id="i-full" label="الاسم الكامل" hint="يُحسب تلقائياً إن تركته فارغاً.">
            <input
              id="i-full"
              dir="ltr"
              value={info.fullName}
              onChange={set('fullName')}
              placeholder={fullAuto}
              className="field font-mono"
            />
          </Field>
          <Field id="i-ps" label="اسم PostScript" hint="حروف لاتينية وأرقام وشرطة فقط. يُحسب تلقائياً إن تركته فارغاً.">
            <input
              id="i-ps"
              dir="ltr"
              value={info.postScriptName}
              onChange={set('postScriptName')}
              placeholder={auto.postScriptName}
              className="field font-mono"
            />
          </Field>
          <Field id="i-ver" label="الإصدار">
            <input id="i-ver" dir="ltr" value={version} onChange={(e) => setVersion(e.target.value)} className="field font-mono" />
          </Field>
          <Field id="i-designer" label="المصمم">
            <input id="i-designer" value={designer} onChange={(e) => setDesigner(e.target.value)} className="field" />
          </Field>
        </section>

        <section className="grid grid-cols-1 gap-3 border-t border-ink/10 pt-4 sm:grid-cols-2">
          <Field id="i-copy" label="حقوق النشر" hint="مثل: © 2026 اسمك.">
            <input id="i-copy" value={info.copyright} onChange={set('copyright')} className="field" />
          </Field>
          <Field id="i-manu" label="الجهة المصنِّعة">
            <input id="i-manu" value={info.manufacturer} onChange={set('manufacturer')} className="field" />
          </Field>
          <Field id="i-lic" label="الترخيص" hint="مثل: SIL Open Font License 1.1.">
            <input id="i-lic" value={info.license} onChange={set('license')} className="field" />
          </Field>
          <Field id="i-licurl" label="رابط الترخيص">
            <input id="i-licurl" dir="ltr" value={info.licenseUrl} onChange={set('licenseUrl')} placeholder="https://" className="field font-mono" />
          </Field>
          <Field id="i-durl" label="رابط المصمم">
            <input id="i-durl" dir="ltr" value={info.designerUrl} onChange={set('designerUrl')} placeholder="https://" className="field font-mono" />
          </Field>
          <div className="sm:col-span-2">
            <Field id="i-desc" label="الوصف">
              <textarea id="i-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="field" />
            </Field>
          </div>
        </section>

        {errors.length > 0 && (
          <div role="alert" className="space-y-1 rounded-2xl border border-ink/20 bg-sand/30 p-3 text-xs">
            {errors.map((t) => (
              <p key={t} className="flex gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                {t}
              </p>
            ))}
          </div>
        )}

        <ModalActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary" disabled={errors.length > 0}>حفظ</Button>
        </ModalActions>
      </form>
    </Modal>
  );
};

```

## الخطوة 20: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
