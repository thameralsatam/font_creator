# الملف ١١ — تخطيط الاستوديو والتحقق

هذا الملف يعيد ترتيب الاستوديو، ثم يشغّل التحقق الشامل للدفعة.

## قواعد عامة (تنطبق على كل الملفات)

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- انسخ المحتوى داخل كل كتلة كود كما هو بالضبط، بدون تغيير حرف واحد وبدون تعليقات إضافية.
- الأمر "أنشئ الملف" يعني: أنشئه، وإن كان موجوداً مسبقاً استبدل محتواه بالكامل.
- لا تلمس أي ملف غير مذكور. لا تحذف ولا تنقل ولا تعيد تسمية أي ملف إلا إذا طُلب صراحة.
- إذا ظهر خطأ غير متوقع أو تعذّر أمر: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر 1: `src/components/studio/StudioScreen.tsx`

الاستوديو بشريطين: علوي وسفلي، كل واحد بسطر واحد قابل للسحب، والقوائم تنزل من أزرارها.

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
import { BarDivider, DragScroll } from '../ui/DragScroll';
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
const ZOOM_PRESETS = [25, 50, 100, 200];

const icon = 'h-4 w-4 stroke-[1.5]';

/*
  ترتيب الاستوديو:
  - الشريط العلوي: التنقل ثم الأدوات ثم مجموعات الميزات (كل مجموعة داخل زر منسدل).
  - اللوحة في الوسط.
  - الشريط السفلي: التكبير ثم التراجع ثم حالة المحرف.
  كل شريط بسطر واحد قابل للسحب، والقوائم تنزل من الزر نفسه.
*/
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
        ? 'مغلق'
        : 'مفتوح';

  return (
    <div className="fixed inset-0 z-40 flex flex-col gap-2 bg-paper-deep p-2 sm:gap-3 sm:p-3">
      {/* الشريط العلوي */}
      <DragScroll label="الشريط العلوي" className="glass-panel shrink-0 rounded-2xl">
        <Button variant="quiet" icon title="الرجوع إلى المشروع" onClick={onBack}>
          <ArrowRight className={icon} />
        </Button>

        <Dropdown
          label={glyph.name}
          labelOnMobile
          width={340}
          placement="bottom"
          icon={<span className="font-heading text-lg leading-none">{glyph.char}</span>}
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
                      g.id === glyph.id ? 'bg-sand/60 ring-1 ring-ink' : 'hover:bg-sand/40'
                    }`}
                  >
                    <GlyphThumb glyph={g} metrics={metrics} className="h-10 w-full" />
                    <span className="max-w-full truncate font-mono text-[10px]">{g.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Dropdown>

        <BarDivider />

        <Button variant="quiet" soon title="أداة التحديد">
          <MousePointer2 className={icon} />
          <span className="hidden md:inline">تحديد</span>
        </Button>
        <Button variant="quiet" soon title="أداة التحريك">
          <Move className={icon} />
          <span className="hidden md:inline">تحريك</span>
        </Button>
        <Button variant="quiet" soon title="أداة القلم">
          <PenTool className={icon} />
          <span className="hidden md:inline">قلم</span>
        </Button>

        <BarDivider />

        <Dropdown label="عرض" icon={<Eye className={icon} />} placement="bottom">
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

        <Dropdown label="المقاييس" icon={<Ruler className={icon} />} placement="bottom">
          {() => (
            <>
              <MenuItem label="العرض الكامل" soon />
              <MenuItem label="العارضان الأيمن والأيسر" soon />
              <MenuItem label="توسيط تلقائي" soon />
            </>
          )}
        </Dropdown>

        <Dropdown label="المسار" icon={<Spline className={icon} />} placement="bottom">
          {() => (
            <>
              <MenuItem label="ربط المقابض" soon />
              <MenuItem label="كسر المقابض" soon />
              <MenuItem label="تنعيم المسار" soon />
              <MenuItem label="عكس اتجاه المسار" soon />
            </>
          )}
        </Dropdown>

        <Dropdown label="الإعدادات" icon={<Settings2 className={icon} />} placement="bottom">
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
      </DragScroll>

      {/* اللوحة */}
      <main className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink/25 bg-canvas shadow-sm">
        <StudioCanvas
          glyph={glyph}
          metrics={metrics}
          viewport={viewport}
          options={options}
          gridStep={gridStep}
        />
      </main>

      {/* الشريط السفلي */}
      <DragScroll label="الشريط السفلي" className="glass-panel shrink-0 rounded-2xl">
        <Button variant="quiet" icon title="تصغير" onClick={viewport.zoomOut}>
          <ZoomOut className={icon} />
        </Button>

        <Dropdown
          label={`${viewport.percent}%`}
          labelOnMobile
          width={180}
          placement="top"
        >
          {(close) => (
            <>
              <MenuLabel>مستوى التكبير</MenuLabel>
              {ZOOM_PRESETS.map((p) => (
                <MenuItem
                  key={p}
                  label={`${p}%`}
                  active={viewport.percent === p}
                  onClick={() => {
                    viewport.zoomTo(p);
                    close();
                  }}
                />
              ))}
              <MenuDivider />
              <MenuItem
                label="ملاءمة المحرف للشاشة"
                onClick={() => {
                  viewport.fit();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Button variant="quiet" icon title="تكبير" onClick={viewport.zoomIn}>
          <ZoomIn className={icon} />
        </Button>
        <Button variant="quiet" icon title="ملاءمة المحرف للشاشة" onClick={viewport.fit}>
          <Maximize className={icon} />
        </Button>

        <BarDivider />

        <Button variant="quiet" icon soon title="تراجع">
          <Undo2 className={icon} />
        </Button>
        <Button variant="quiet" icon soon title="إعادة">
          <Redo2 className={icon} />
        </Button>

        <BarDivider />

        <div className="flex shrink-0 items-center gap-3 whitespace-nowrap px-2 text-xs text-ink-soft">
          <span>
            نقاط <span className="font-mono text-ink">{nodeCount}</span>
          </span>
          <span>
            مسارات <span className="font-mono text-ink">{glyph.contours.length}</span>
          </span>
          <span>
            الحالة <span className="text-ink">{pathState}</span>
          </span>
          <span className="h-4 w-px bg-ink/20" />
          <span className="font-mono text-ink">{glyph.name}</span>
          <span>{FORM_LABEL[glyph.form]}</span>
        </div>
      </DragScroll>
    </div>
  );
};
```

---

## التحقق (آخر خطوة)

1. شغّل `npm test`. يجب أن ينجح 21 اختباراً.
2. شغّل `npm run build`. يجب أن ينجح بدون أخطاء.
3. شغّل `npm run lint`. يجب ألا يظهر أي خطأ. إن ظهر شيء انسخه لي كما هو ولا تصلحه.
4. شغّل `npm run dev` وافتح استوديو محرف، وجرّب:
   - الشريط العلوي والسفلي كل واحد بسطر واحد فقط، بدون التفاف.
   - على عرض الجوال (حوالي 390 بكسل): اسحب الشريط العلوي بالفأرة أو بإصبعك. يجب أن يتحرك أفقياً، وتظهر حافة متلاشية في الجهة التي فيها أزرار مخفية.
   - اضغط "عرض" في الشريط العلوي. يجب أن تنزل القائمة تحت الزر مباشرة. اضغط نسبة التكبير في الشريط السفلي. يجب أن تفتح القائمة فوق الزر مباشرة.
   - مرّر الشريط العلوي ثم افتح قائمة. يجب أن تبقى ملتصقة بزرها.
   - اضغط خارج القائمة أو Escape. يجب أن تُغلق.
   - لا يظهر تمرير أفقي للصفحة على الجوال.
5. أرسل لي: نتيجة الخطوات ١ إلى ٣ فقط، وأي خطوة فشلت من الخطوة ٤.
