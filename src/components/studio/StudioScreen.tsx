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
