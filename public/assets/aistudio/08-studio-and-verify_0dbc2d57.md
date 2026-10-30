# الملف ٨ — شاشة الاستوديو والتحقق الشامل

هذا الملف يضيف شاشة الاستوديو نفسها، ثم يشغّل التحقق الشامل لكل الدفعة.

## قواعد عامة (تنطبق على كل الملفات)

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- انسخ المحتوى داخل كل كتلة كود كما هو بالضبط، بدون تغيير حرف واحد وبدون تعليقات إضافية.
- الأمر "أنشئ الملف" يعني: أنشئه، وإن كان موجوداً مسبقاً استبدل محتواه بالكامل. أنشئ المجلدات الناقصة.
- لا تلمس أي ملف غير مذكور. لا تحذف ولا تنقل ولا تعيد تسمية أي ملف إلا إذا طُلب صراحة.
- إذا ظهر خطأ غير متوقع أو تعذّر أمر: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- لا تصلح أي خطأ يظهر في ملفات قديمة غير مذكورة هنا. سنحذفها في ملف لاحق.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر 1: `src/components/MetricsModal.tsx`

نافذة الإعدادات والمقاييس.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
import React, { useState } from 'react';
import { AlertCircle, Sliders } from 'lucide-react';
import { type FontMetrics, type FontProject } from '../types/font';
import { validateMetrics } from '../utils/fontLogic';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface MetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  onSave: (updates: {
    name: string;
    designer: string;
    version: string;
    metrics: FontMetrics;
  }) => void;
}

const FIELDS: Array<{ key: keyof FontMetrics; label: string }> = [
  { key: 'ascender', label: 'الصاعد' },
  { key: 'capHeight', label: 'ارتفاع الحروف الكبيرة' },
  { key: 'xHeight', label: 'ارتفاع الحروف الصغيرة' },
  { key: 'descender', label: 'الهابط' },
  { key: 'upm', label: 'مقياس مربع الخط (UPM)' },
];

export const MetricsModal: React.FC<MetricsModalProps> = ({ onClose, project, onSave }) => {
  const [name, setName] = useState(project.name);
  const [designer, setDesigner] = useState(project.designer);
  const [version, setVersion] = useState(project.version);
  // نحتفظ بالقيم نصاً أثناء الكتابة حتى لا يتحول الحقل الفارغ إلى صفر
  const [draft, setDraft] = useState<Record<keyof FontMetrics, string>>({
    upm: String(project.metrics.upm),
    ascender: String(project.metrics.ascender),
    capHeight: String(project.metrics.capHeight),
    xHeight: String(project.metrics.xHeight),
    descender: String(project.metrics.descender),
  });

  const parsed: FontMetrics = {
    upm: Number(draft.upm),
    ascender: Number(draft.ascender),
    capHeight: Number(draft.capHeight),
    xHeight: Number(draft.xHeight),
    descender: Number(draft.descender),
  };

  const hasBadNumber = Object.values(parsed).some(
    (v) => !Number.isFinite(v) || !Number.isInteger(v)
  );
  const validation = validateMetrics(parsed);
  const errors = hasBadNumber
    ? ['كل المقاييس يجب أن تكون أعداداً صحيحة.']
    : validation.errors;
  const canSave = !hasBadNumber && validation.isValid && name.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      name: name.trim(),
      designer: designer.trim() || 'المصمم',
      version: version.trim() || project.version,
      metrics: parsed,
    });
    onClose();
  };

  return (
    <Modal
      title="إعدادات ومقاييس الخط"
      subtitle="بيانات الخط والأبعاد الرأسية لمربع الخط"
      icon={<Sliders className="h-4 w-4 stroke-[1.5]" />}
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="m-name" className="mb-1 block text-[11px] opacity-80">اسم عائلة الخط</label>
            <input id="m-name" required value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="m-designer" className="mb-1 block text-[11px] opacity-80">المصمم</label>
            <input id="m-designer" value={designer} onChange={(e) => setDesigner(e.target.value)} className="field" />
          </div>
          <div>
            <label htmlFor="m-version" className="mb-1 block text-[11px] opacity-80">الإصدار</label>
            <input id="m-version" value={version} onChange={(e) => setVersion(e.target.value)} className="field font-mono" />
          </div>
        </div>

        <div className="border-t border-ink/10 pt-4">
          <h3 className="mb-3 text-xs">المقاييس الرأسية</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="rounded-2xl border border-ink/15 bg-sand/20 p-2.5">
                <label htmlFor={`m-${key}`} className="block text-[11px] opacity-80">{label}</label>
                <input
                  id={`m-${key}`}
                  inputMode="numeric"
                  dir="ltr"
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="mt-1 w-full border-b border-ink/30 bg-transparent py-0.5 font-mono text-xs focus:border-ink focus:outline-none"
                />
              </div>
            ))}
            <div className="rounded-2xl border border-ink/10 bg-ink/5 p-2.5">
              <span className="block text-[11px] opacity-60">خط الأساس</span>
              <span className="mt-1 block py-0.5 font-mono text-xs opacity-60">0 (ثابت)</span>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div role="alert" className="space-y-1 rounded-2xl border border-ink/20 bg-sand/30 p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>يرجى مراجعة تناسق المقاييس:</span>
            </div>
            <ul className="list-inside list-disc space-y-0.5 text-[11px]">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <ModalActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary" disabled={!canSave}>
            حفظ المقاييس
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
};
```

---

## الأمر 2: `src/components/studio/StudioScreen.tsx`

شاشة الاستوديو: شريط علوي بأدوات في أزرار منسدلة، لوحة، وشريط سفلي. أدوات الرسم باهتة لأنها لم تُبرمج بعد.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Eye,
  Maximize,
  MousePointer2,
  Move,
  PenTool,
  Redo2,
  Ruler,
  Settings2,
  Spline,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { type FontProject, type Glyph } from '../../types/font';
import { getGlyphBounds } from '../../utils/pathGeometry';
import { FORM_LABEL } from '../../utils/labels';
import { Button } from '../ui/Button';
import { Dropdown, MenuDivider, MenuItem, MenuLabel } from '../ui/Dropdown';
import { GlyphThumb } from '../GlyphThumb';
import { StudioCanvas, type ViewOptions } from './StudioCanvas';
import { useViewport } from './useViewport';

interface StudioScreenProps {
  project: FontProject;
  glyph: Glyph;
  onSelectGlyph: (glyphId: string) => void;
  onBack: () => void;
}

const GRID_STEPS = [25, 50, 100];

export const StudioScreen: React.FC<StudioScreenProps> = ({
  project,
  glyph,
  onSelectGlyph,
  onBack,
}) => {
  const { metrics } = project;

  const [options, setOptions] = useState<ViewOptions>({
    grid: true,
    metrics: true,
    nodes: true,
    anchors: true,
  });
  const [gridStep, setGridStep] = useState(50);

  const toggle = (key: keyof ViewOptions) =>
    setOptions((o) => ({ ...o, [key]: !o[key] }));

  // الصندوق الذي تُحسب منه الملاءمة: العرض الكامل أفقياً والمقاييس رأسياً
  const fitBox = useMemo(() => {
    const b = getGlyphBounds(glyph);
    return {
      xMin: Math.min(0, b?.xMin ?? 0),
      xMax: Math.max(glyph.advanceWidth, b?.xMax ?? 0),
      yMin: metrics.descender,
      yMax: metrics.ascender,
    };
  }, [glyph, metrics.ascender, metrics.descender]);

  const viewport = useViewport({ fitBox, fitKey: glyph.id });

  const nodeCount = glyph.contours.reduce((sum, c) => sum + c.nodes.length, 0);
  const pathState =
    glyph.contours.length === 0
      ? '—'
      : glyph.contours.every((c) => c.closed)
        ? 'مغلق ✓'
        : 'مفتوح';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper-deep">
      {/* الشريط العلوي: التنقل ثم الأدوات ثم مجموعات الميزات */}
      <header className="flex flex-wrap items-center gap-2 border-b border-ink/10 bg-paper px-3 py-2">
        <Button variant="quiet" icon title="الرجوع إلى المشروع" onClick={onBack}>
          <ArrowRight className="h-4 w-4 stroke-[1.5]" />
        </Button>

        <Dropdown
          label={glyph.name}
          labelOnMobile
          icon={<span className="font-heading text-lg leading-none">{glyph.char}</span>}
          panelClassName="sm:w-80"
        >
          {(close) => (
            <>
              <MenuLabel>اختر المحرف</MenuLabel>
              <div className="grid grid-cols-4 gap-1 p-1">
                {project.glyphs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    title={g.name}
                    onClick={() => {
                      onSelectGlyph(g.id);
                      close();
                    }}
                    className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-colors ${
                      g.id === glyph.id ? 'bg-sand/50 ring-1 ring-ink' : 'hover:bg-sand/30'
                    }`}
                  >
                    <GlyphThumb
                      glyph={g}
                      metrics={metrics}
                      className="h-10 w-full"
                    />
                    <span className="max-w-full truncate font-mono text-[10px]">{g.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Dropdown>

        <span className="mx-1 hidden h-5 w-px bg-ink/15 sm:block" />

        <div className="flex items-center gap-1" role="toolbar" aria-label="أدوات الرسم">
          <Button variant="quiet" soon title="أداة التحديد">
            <MousePointer2 className="h-4 w-4 stroke-[1.5]" />
            <span className="hidden md:inline">تحديد</span>
          </Button>
          <Button variant="quiet" soon title="أداة التحريك">
            <Move className="h-4 w-4 stroke-[1.5]" />
            <span className="hidden md:inline">تحريك</span>
          </Button>
          <Button variant="quiet" soon title="أداة القلم">
            <PenTool className="h-4 w-4 stroke-[1.5]" />
            <span className="hidden md:inline">قلم</span>
          </Button>
        </div>

        <div className="ms-auto flex items-center gap-1">
          <Dropdown label="عرض" icon={<Eye className="h-4 w-4 stroke-[1.5]" />} align="end">
            {() => (
              <>
                <MenuLabel>إظهار على اللوحة</MenuLabel>
                <MenuItem label="الشبكة" active={options.grid} onClick={() => toggle('grid')} />
                <MenuItem label="خطوط المقاييس" active={options.metrics} onClick={() => toggle('metrics')} />
                <MenuItem label="نقاط المسار ومقابضها" active={options.nodes} onClick={() => toggle('nodes')} />
                <MenuItem label="نقاط الارتكاز" active={options.anchors} onClick={() => toggle('anchors')} />
              </>
            )}
          </Dropdown>

          <Dropdown label="المقاييس" icon={<Ruler className="h-4 w-4 stroke-[1.5]" />} align="end">
            {() => (
              <>
                <MenuItem label="العرض الكامل" soon />
                <MenuItem label="العارضان الأيمن والأيسر" soon />
                <MenuItem label="توسيط تلقائي" soon />
              </>
            )}
          </Dropdown>

          <Dropdown label="المسار" icon={<Spline className="h-4 w-4 stroke-[1.5]" />} align="end">
            {() => (
              <>
                <MenuItem label="ربط المقابض" soon />
                <MenuItem label="كسر المقابض" soon />
                <MenuItem label="تنعيم المسار" soon />
                <MenuItem label="عكس اتجاه المسار" soon />
              </>
            )}
          </Dropdown>

          <Dropdown label="الإعدادات" icon={<Settings2 className="h-4 w-4 stroke-[1.5]" />} align="end">
            {() => (
              <>
                <MenuLabel>حجم الشبكة (وحدة خط)</MenuLabel>
                {GRID_STEPS.map((step) => (
                  <MenuItem
                    key={step}
                    label={String(step)}
                    active={gridStep === step}
                    onClick={() => setGridStep(step)}
                  />
                ))}
                <MenuDivider />
                <MenuItem label="الالتصاق بالشبكة" soon />
                <MenuItem label="الالتصاق بالنقاط" soon />
              </>
            )}
          </Dropdown>
        </div>
      </header>

      {/* منطقة الرسم */}
      <main className="relative min-h-0 flex-1">
        <StudioCanvas
          glyph={glyph}
          metrics={metrics}
          viewport={viewport}
          options={options}
          gridStep={gridStep}
        />
      </main>

      {/* الشريط السفلي: الحالة ثم المحرف ثم التكبير */}
      <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-ink/10 bg-paper px-3 py-2 text-xs">
        <div className="flex items-center gap-1">
          <Button variant="quiet" icon soon title="تراجع">
            <Undo2 className="h-4 w-4 stroke-[1.5]" />
          </Button>
          <Button variant="quiet" icon soon title="إعادة">
            <Redo2 className="h-4 w-4 stroke-[1.5]" />
          </Button>
          <span className="hidden whitespace-nowrap pe-1 ps-2 opacity-75 sm:inline">
            نقاط: <span className="font-mono">{nodeCount}</span> · مسارات:{' '}
            <span className="font-mono">{glyph.contours.length}</span> · الحالة: {pathState}
          </span>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <span className="font-mono">{glyph.name}</span>
          <span className="opacity-60">·</span>
          <span>{FORM_LABEL[glyph.form]}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="quiet" icon title="تكبير" onClick={viewport.zoomIn}>
            <ZoomIn className="h-4 w-4 stroke-[1.5]" />
          </Button>
          <Button variant="quiet" icon title="تصغير" onClick={viewport.zoomOut}>
            <ZoomOut className="h-4 w-4 stroke-[1.5]" />
          </Button>
          <Button variant="quiet" icon title="ملاءمة المحرف للشاشة" onClick={viewport.fit}>
            <Maximize className="h-4 w-4 stroke-[1.5]" />
          </Button>
          <Button variant="quiet" title="الحجم الفعلي 100%" onClick={viewport.zoomActual}>
            <span className="font-mono">{viewport.percent}%</span>
          </Button>
        </div>
      </footer>
    </div>
  );
};
```

---

## التحقق (آخر خطوة)

هذا هو الملف الأخير في هذه الدفعة، وهنا فقط يُشغَّل البناء.

1. شغّل `npm test`. يجب أن ينجح 21 اختباراً.
2. شغّل `npm run build`. يجب أن ينجح بدون أخطاء. إن فشل أرسل لي النص الكامل للخطأ.
3. شغّل `npm run lint` (فحص الأنواع). **لا تصلح شيئاً منه.** انسخ لي كل الأخطاء كما هي. أي خطأ في ملف قديم غير مذكور في الملفات ١ إلى ٨ سنحذفه أو نصلحه في الدفعة القادمة.
4. شغّل `npm run dev` وجرّب بنفسك هذا التسلسل بالضبط، وأخبرني بأي خطوة فشلت:
   - أنشئ مشروعاً جديداً. يجب أن تفتح صفحة المشروع.
   - اضغط "إضافة أول محرف" واكتب الحرف `ب`. يجب أن يظهر الاسم `uni0628` ونقطة اليونيكود `U+0628` تلقائياً. اضغط إضافة.
   - اضغط على بطاقة المحرف. يجب أن يفتح الاستوديو، وتظهر الشبكة وخطوط المقاييس.
   - في الاستوديو اضغط "عرض" ثم ألغِ خيار الشبكة. يجب أن تختفي الشبكة. اضغط خارج القائمة. يجب أن تُغلق.
   - اسحب اللوحة بالفأرة وكبّر بالعجلة. يجب أن تتحرك وتكبر بسلاسة. اضغط زر الملاءمة. يجب أن ترجع.
   - حدّث الصفحة. يجب أن يبقى المشروع والمحرف.
   - صغّر نافذة المتصفح إلى عرض الجوال (حوالي 390 بكسل). يجب ألا يظهر تمرير أفقي، وأن تتحول القوائم إلى ورقة سفلية.
5. شغّل هذا الأمر وانسخ لي ناتجه كاملاً: `find src -type f | sort`
6. أرسل لي: نتيجة الخطوات ١ إلى ٥ فقط، بدون شرح.
