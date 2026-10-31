# الدفعة 19: إصلاح النوافذ، تسمية المنفصل isol، رموز الأشكال، تخفيف الصفحة، تبسيط التصدير

يشمل: إغلاق النافذة بالنقر لا يمرّر النقرة لما تحتها، المنفصل صار name.isol، رموز يونيكود لكل أشكال الحروف من كتلة أشكال العرض، بطاقات محارف خفيفة (بلا تمويه ومع رسم كسول) لتخفيف الصفحة، تصدير الخط OTF فقط، وشرح كود FEA داخل نافذة الميزات. الخطوات التي تنشئ ملفات (GlyphCard وExportModal) تأتي في الآخر وتستبدل الموجود. تنبيه: ملف ProjectOverview لا يُعدَّل هنا، وستأتي الدفعة 20 بنسخة كاملة جديدة منه.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: في الملف `src/components/ui/Modal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import React, { useEffect, useId } from 'react';
```

**النص الجديد:**
```
import React, { useEffect, useId, useRef } from 'react';
```

## الخطوة 2: في الملف `src/components/ui/Modal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const titleId = useId();

```

**النص الجديد:**
```
  const titleId = useId();
  // الإغلاق عند النقر لا عند الضغط: لو أُغلقت النافذة عند الضغط لوصلت بقية النقرة للعنصر الذي تحتها
  const downOnBackdrop = useRef(false);

```

## الخطوة 3: في الملف `src/components/ui/Modal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
```

**النص الجديد:**
```
      onPointerDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
        downOnBackdrop.current = false;
      }}
```

## الخطوة 4: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  labelOnMobile?: boolean;

```

**النص الجديد:**
```
  labelOnMobile?: boolean;
  /** رمز فقط بلا نص على أي شاشة (النص يبقى في title). */
  iconOnly?: boolean;

```

## الخطوة 5: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  labelOnMobile = false,

```

**النص الجديد:**
```
  labelOnMobile = false,
  iconOnly = false,

```

## الخطوة 6: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        <span className={labelOnMobile ? '' : 'hidden md:inline'}>{label}</span>
```

**النص الجديد:**
```
        {!iconOnly && <span className={labelOnMobile ? '' : 'hidden md:inline'}>{label}</span>}
```

## الخطوة 7: في الملف `src/utils/features.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
export interface Rule {
```

**النص الجديد:**
```
/** رمز الشكل المنفصل في كتلة أشكال العرض (FExx). الأشكال الأخرى بعده: نهاية +1، بداية +2، وسط +3. */
export const PRESENTATION: Record<string, number> = {
  hamza: 0xfe80, alefMadda: 0xfe81, alefHamzaAbove: 0xfe83, wawHamza: 0xfe85, alefHamzaBelow: 0xfe87,
  yehHamza: 0xfe89, alef: 0xfe8d, beh: 0xfe8f, tehMarbuta: 0xfe93, teh: 0xfe95, theh: 0xfe99,
  jeem: 0xfe9d, hah: 0xfea1, khah: 0xfea5, dal: 0xfea9, thal: 0xfeab, reh: 0xfead, zain: 0xfeaf,
  seen: 0xfeb1, sheen: 0xfeb5, sad: 0xfeb9, dad: 0xfebd, tah: 0xfec1, zah: 0xfec5, ain: 0xfec9,
  ghain: 0xfecd, feh: 0xfed1, qaf: 0xfed5, kaf: 0xfed9, lam: 0xfedd, meem: 0xfee1, noon: 0xfee5,
  heh: 0xfee9, waw: 0xfeed, alefMaksura: 0xfeef, yeh: 0xfef1,
};

const OFFSET: Record<FormSuffix, number> = { isol: 0, fina: 1, init: 2, medi: 3 };

/** رمز يونيكود لشكل حرف، مثل U+FE91 لـ beh.init. فارغ إن لم يكن للحرف رمز عرض. */
export function formUnicode(base: string, suffix: FormSuffix): string {
  const start = PRESENTATION[base];
  if (start === undefined) return '';
  return `U+${(start + OFFSET[suffix]).toString(16).toUpperCase().padStart(4, '0')}`;
}

export interface Rule {
```

## الخطوة 8: في الملف `src/utils/features.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    if (suffix) {
      if (!names.has(base)) {
        gaps.push({ glyph: g.name, message: `لا يوجد المحرف الأساسي ${base}` });
        continue;
      }
      rules.push({ feature: suffix, kind: 'single', from: [base], to: g.name });
      if (g.form !== FORM_OF[suffix]) mismatches.push(g.name);
    } else if
```

**النص الجديد:**
```
    if (suffix) {
      if (g.form !== FORM_OF[suffix]) mismatches.push(g.name);
      if (suffix === 'isol') {
        // beh.isol هو الأساس نفسه إن لم يوجد beh، وإلا فهو بديل تستدعيه ميزة isol
        if (names.has(base)) rules.push({ feature: 'isol', kind: 'single', from: [base], to: g.name });
        continue;
      }
      const source = names.has(base) ? base : names.has(`${base}.isol`) ? `${base}.isol` : null;
      if (!source) {
        gaps.push({ glyph: g.name, message: `لا يوجد المحرف الأساسي ${base} أو ${base}.isol` });
        continue;
      }
      rules.push({ feature: suffix, kind: 'single', from: [source], to: g.name });
    } else if
```

## الخطوة 9: في الملف `src/utils/features.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
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
```

**النص الجديد:**
```
  const names = new Set(glyphs.map((g) => g.name));
  const codes = new Set(glyphs.map((g) => g.unicode.toUpperCase()).filter(Boolean));
  const seen = new Set<string>();
  const out: NewGlyphData[] = [];
  for (const g of glyphs) {
    const { base, suffix } = splitName(g.name);
    if (suffix && suffix !== 'isol') continue;
    const j = JOINING[base];
    if (!j || seen.has(base)) continue;
    seen.add(base);
    for (const s of formsFor(j)) {
      const name = `${base}.${s}`;
      if (names.has(name)) continue;
      const code = formUnicode(base, s);
      out.push({
        char: g.char,
        name,
        unicode: code && !codes.has(code) ? code : '',
```

## الخطوة 10: في الملف `src/utils/presets.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { JOINING, formsFor } from './features';
```

**النص الجديد:**
```
import { JOINING, formUnicode, formsFor, type FormSuffix } from './features';
```

## الخطوة 11: في الملف `src/utils/presets.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    name: `${name}.${s}`,
    unicode: '',
    category: 'letter' as const,
    form: FORM_FOR[s],
```

**النص الجديد:**
```
    name: `${name}.${s}`,
    unicode: formUnicode(name, s as FormSuffix),
    category: 'letter' as const,
    form: FORM_FOR[s],
```

## الخطوة 12: في الملف `src/utils/presets.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    description: 'الحروف الهجائية وأشكال الهمزة والتاء المربوطة والألف المقصورة (36 محرفاً).',
    items: LETTERS.map(([cp, n]) => item(cp, n, 'letter', 600)),
```

**النص الجديد:**
```
    description: 'الحروف الهجائية وأشكال الهمزة والتاء المربوطة والألف المقصورة (36 محرفاً). الشكل المنفصل لكل حرف اسمه مثل beh.isol ورمزه الأصلي U+0628.',
    items: LETTERS.map(([cp, n]) => item(cp, `${n}.isol`, 'letter', 600)),
```

## الخطوة 13: في الملف `src/utils/presets.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    description: 'الأشكال التي يحتاجها كل حرف بحسب اتصاله: ثلاثة للمتصل من الجهتين وواحد للمتصل بما قبله فقط. تُفعَّل تلقائياً بميزات init وmedi وfina (81 محرفاً).',
```

**النص الجديد:**
```
    description: 'الأشكال التي يحتاجها كل حرف بحسب اتصاله: ثلاثة للمتصل من الجهتين وواحد للمتصل بما قبله فقط، لكل منها رمز يونيكود من كتلة أشكال العرض. تُفعَّل تلقائياً بميزات init وmedi وfina (81 محرفاً).',
```

## الخطوة 14: في الملف `src/utils/presets.test.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
assert.ok(forms.every((f) => !f.unicode && f.form && f.form !== 'isolated'));
```

**النص الجديد:**
```
assert.ok(forms.every((f) => /^U\+FE[0-9A-F]{2}$/.test(f.unicode) && f.form && f.form !== 'isolated'));
  assert.equal(letters[0].name, 'hamza.isol');
```

## الخطوة 15: في الملف `src/utils/features.test.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
test('fea output groups by feature'
```

**النص الجديد:**
```
test('isol naming: beh.isol is the source of the other forms', () => {
  const r = computeFeatures([g('beh.isol'), g('beh.init', 'initial'), g('beh.fina', 'final')]);
  assert.deepEqual(
    r.rules.map((x) => `${x.feature}:${x.from[0]}>${x.to}`),
    ['fina:beh.isol>beh.fina', 'init:beh.isol>beh.init']
  );
  assert.equal(r.gaps.length, 0);
  assert.equal(r.mismatches.length, 0);
  const both = computeFeatures([g('beh'), g('beh.isol')]);
  assert.deepEqual(both.rules.map((x) => `${x.feature}:${x.from[0]}>${x.to}`), ['isol:beh>beh.isol']);
});

test('missingForms gives presentation-form codes and works from beh.isol', () => {
  const m = missingForms([g('beh.isol')]);
  assert.deepEqual(m.map((x) => `${x.name}=${x.unicode}`).sort(), ['beh.fina=U+FE90', 'beh.init=U+FE91', 'beh.medi=U+FE92']);
  assert.equal(formUnicode('alef', 'fina'), 'U+FE8E');
  assert.equal(formUnicode('nothing', 'init'), '');
});

test('fea output groups by feature'
```

## الخطوة 16: في الملف `src/utils/features.test.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { computeFeatures, missingForms, rulesToFea, splitName } from './features';
```

**النص الجديد:**
```
import { computeFeatures, formUnicode, missingForms, rulesToFea, splitName } from './features';
```

## الخطوة 17: في الملف `src/components/GlyphThumb.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
export const GlyphThumb: React.FC<GlyphThumbProps> = ({ glyph, metrics, className = '' }) => {
```

**النص الجديد:**
```
const GlyphThumbBase: React.FC<GlyphThumbProps> = ({ glyph, metrics, className = '' }) => {
```

## الخطوة 18: أضف الكود التالي في آخر الملف `src/components/GlyphThumb.tsx` (بعد آخر سطر، دون حذف شيء)

```

/** لا يُعاد رسمها إلا إذا تغيّر المحرف أو المقاييس. مهم حين تكثر المحارف في الصفحة. */
export const GlyphThumb = React.memo(GlyphThumbBase);
```

## الخطوة 19: في الملف `src/index.css`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
.glass-dropdown {
```

**النص الجديد:**
```
.card-flat {
  background-color: rgb(255, 253, 248);
  border: 1px solid rgba(18, 48, 42, 0.2);
  /* العناصر خارج الشاشة لا تُرسم، فتخف الصفحة مع مئات المحارف */
  content-visibility: auto;
  contain-intrinsic-size: auto 220px;
}

.glass-dropdown {
```

## الخطوة 20: في الملف `src/utils/fontBuild.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
export async function buildFontBuffer(
```

**النص الجديد:**
```
/** اسم ملف الخط المصدَّر. */
export function fontFileName(project: FontProject): string {
  return `${safePsName(project.name)}-Regular.otf`;
}

export async function buildFontBuffer(
```

## الخطوة 21: في الملف `src/help/helpBook.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
{ h: 'ملف الخط', p: 'زر تحميل الأول في نافذة التصدير يبني ملف خط حقيقي بصيغة OTF تثبّته على جهازك وتستعمله في أي برنامج. قبل البناء تظهر لك الأخطاء التي تمنعه
```

**النص الجديد:**
```
{ h: 'ملف الخط', p: 'زر التصدير يبني ملف خط حقيقي بصيغة OTF تثبّته على جهازك وتستعمله في أي برنامج، وهو الصيغة الوحيدة للتصدير. قبل البناء تظهر لك الأخطاء التي تمنعه
```

## الخطوة 22: في الملف `src/help/helpBook.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      { h: 'ملفات أخرى', p: 'ملف المشروع (نسخة احتياطية كاملة بمساراتها)، وملف ميزات الخط للمترجمات.' },

```

**النص الجديد:**
```

```

## الخطوة 23: في الملف `src/components/FeaturesModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
            <p className="text-xs text-ink-soft">كود FEA المستخرج. يُضمَّن في ملف الميزات عند التصدير، وهو مكتوب أيضاً داخل الخط.</p>
```

**النص الجديد:**
```
            <div className="space-y-1.5 rounded-2xl border border-ink/15 bg-sand/20 p-3 text-xs leading-6 text-ink-soft">
              <p>
                <span className="text-ink">ما هذا الكود؟</span> لغة قواعد يفهمها كل برنامج كتابة. تُقرأ كالتالي: كل كتلة{' '}
                <span dir="ltr" className="font-mono">feature init {'{ ... }'}</span> تخص ميزة واحدة، وكل سطر داخلها قاعدة.
              </p>
              <p>
                القاعدة <span dir="ltr" className="font-mono">sub beh.isol by beh.init;</span> تعني: حين تحتاج الكلمة بداية
                متصلة، استبدل الباء المنفصلة بباء البداية.
              </p>
              <p>
                القاعدة <span dir="ltr" className="font-mono">sub lam.init alef.fina by lam_alef;</span> تعني: إذا جاءت لام
                بداية ثم ألف نهاية فاعرضهما محرفاً واحداً هو لام ألف.
              </p>
              <p>لا تكتب شيئاً منها: الموقع يستخرجها من أسماء محارفك ويكتبها داخل ملف الخط عند التصدير. هذا العرض للاطلاع والنسخ فقط.</p>
            </div>
```

## الخطوة 24: أنشئ الملف `src/components/GlyphCard.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { type FontMetrics, type Glyph } from '../types/font';
import { isReady } from '../utils/glyphLogic';
import { CATEGORY_LABEL, FORM_LABEL } from '../utils/labels';
import { GlyphThumb } from './GlyphThumb';
import { Button } from './ui/Button';

interface GlyphCardProps {
  glyph: Glyph;
  metrics: FontMetrics;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

/** بطاقة محرف خفيفة. لا تُعاد رسمها إلا إن تغيّر المحرف أو المقاييس (الدوال المرسلة ثابتة). */
const GlyphCardBase: React.FC<GlyphCardProps> = ({ glyph, metrics, onOpen, onEdit, onDuplicate, onDelete }) => {
  const ready = isReady(glyph);
  return (
    <div className="card-flat group flex flex-col rounded-2xl p-3.5 transition-shadow hover:border-ink/45 hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen(glyph.id)}
        className="flex flex-col items-stretch text-start"
        title="فتح المحرف في الاستوديو"
      >
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-ink-soft">
          <span>{glyph.unicode || '—'}</span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-ink' : 'border border-ink/40'}`}
            title={ready ? 'مرسوم' : 'لم يُرسم بعد'}
          />
        </div>
        <div className="my-2.5 flex h-20 items-center justify-center">
          <GlyphThumb glyph={glyph} metrics={metrics} className="h-full w-full" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-2 text-xs">
          <span dir="ltr" className="truncate font-mono">{glyph.name}</span>
          <span className="shrink-0 font-mono text-[10px] text-ink-soft">{glyph.advanceWidth}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-ink-soft">
          <span>{CATEGORY_LABEL[glyph.category]}</span>
          {glyph.form !== 'isolated' && <span>{FORM_LABEL[glyph.form]}</span>}
        </div>
      </button>
      <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-ink/10 pt-2">
        <Button variant="quiet" icon title="تعديل بيانات المحرف" onClick={() => onEdit(glyph.id)}>
          <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
        </Button>
        <Button variant="quiet" icon title="تكرار المحرف" onClick={() => onDuplicate(glyph.id)}>
          <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
        </Button>
        <Button variant="quiet" icon title="حذف المحرف" onClick={() => onDelete(glyph.id)}>
          <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
        </Button>
      </div>
    </div>
  );
};

export const GlyphCard = React.memo(GlyphCardBase);

```

## الخطوة 25: أنشئ الملف `src/components/ExportModal.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, Type } from 'lucide-react';
import { type FontProject } from '../types/font';
import { downloadBlob } from '../utils/download';
import { buildFontBuffer, checkProject, fontFileName } from '../utils/fontBuild';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
}

/** تصدير الخط كملف OTF عادي. التنبيهات تظهر قبل التحميل. */
export const ExportModal: React.FC<ExportModalProps> = ({ onClose, project }) => {
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const report = useMemo(() => checkProject(project), [project]);
  const file = fontFileName(project);

  const download = async () => {
    setBuilding(true);
    setBuildError(null);
    try {
      const buf = await buildFontBuffer(project);
      downloadBlob(new Blob([buf], { type: 'font/otf' }), file);
    } catch {
      setBuildError('تعذّر بناء ملف الخط. راجع المحارف وحاول من جديد.');
    } finally {
      setBuilding(false);
    }
  };

  const problems = [...report.errors, ...(buildError ? [buildError] : [])];

  return (
    <Modal
      title="تصدير الخط"
      subtitle="ملف خط عادي تثبّته وتستعمله في أي برنامج"
      icon={<Download className="h-4 w-4 stroke-[1.5]" />}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/25 bg-sand/25 p-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Type className="h-5 w-5 shrink-0 stroke-[1.5]" />
            <div className="min-w-0">
              <h3 dir="ltr" className="truncate text-start font-mono text-xs">{file}</h3>
              <p className="text-[11px] text-ink-soft">{project.glyphs.length} محرف</p>
            </div>
          </div>
          <Button variant="primary" disabled={building || report.errors.length > 0} onClick={download}>
            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>{building ? 'جارٍ البناء' : 'تحميل'}</span>
          </Button>
        </div>

        {(problems.length > 0 || report.warnings.length > 0) && (
          <div role="alert" className="space-y-1.5 rounded-2xl border border-ink/20 bg-paper p-3 text-xs leading-6">
            {problems.map((t) => (
              <p key={t} className="flex gap-2">
                <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                {t}
              </p>
            ))}
            {report.warnings.map((t) => (
              <p key={t} className="flex gap-2 text-ink-soft">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
                {t}
              </p>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

```

## الخطوة 26: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
