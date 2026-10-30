import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleHelp,
  Copy,
  Eye,
  FlipHorizontal2,
  FlipVertical2,
  Hand,
  Maximize,
  MousePointer2,
  Move,
  PenTool,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Settings2,
  Shapes,
  Spline,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { type FontProject, type Glyph } from '../../types/font';
import { boundsOf } from '../../utils/pathEdit';
import { FORM_LABEL } from '../../utils/labels';
import { HelpProvider, useHelp } from '../help/HelpContext';
import { HelpBook } from '../help/HelpBook';
import { HelpPanel } from '../help/HelpPanel';
import { Button } from '../ui/Button';
import { BarDivider, DragScroll } from '../ui/DragScroll';
import { Dropdown, MenuDivider, MenuItem, MenuLabel } from '../ui/Dropdown';
import { GlyphThumb } from '../GlyphThumb';
import { StudioCanvas, type ViewOptions } from './StudioCanvas';
import { useStudioEditor, type ToolId } from './useStudioEditor';
import { useViewport } from './useViewport';

interface StudioScreenProps {
  project: FontProject;
  glyph: Glyph;
  onSelectGlyph: (glyphId: string) => void;
  onUpdateGlyph: (updater: (g: Glyph) => Glyph) => void;
  onBack: () => void;
}

const GRID_STEPS = [10, 25, 50, 100];
const ZOOM_PRESETS = [25, 50, 100, 200];

const icon = 'h-4 w-4 stroke-[1.5]';

const TOOLS: Array<{ id: ToolId; label: string; key: string; Icon: typeof PenTool }> = [
  { id: 'select', label: 'تحديد', key: 'V', Icon: MousePointer2 },
  { id: 'move', label: 'تحريك', key: 'M', Icon: Move },
  { id: 'pen', label: 'قلم', key: 'P', Icon: PenTool },
  { id: 'hand', label: 'اللوحة', key: 'H', Icon: Hand },
];

/** حقل رقمي داخل القائمة: يُطبَّق عند Enter أو مغادرة الحقل، وإن كانت القيمة غير صالحة يرجع القديم. */
const NumberRow: React.FC<{
  label: string;
  value: number | null;
  helpId: string;
  onCommit: (n: number) => void;
}> = ({ label, value, helpId, onCommit }) => {
  const help = useHelp();
  return (
  <label
    className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-xs"
    onPointerDown={help.on ? () => help.show(helpId) : undefined}
  >
    <span>{label}</span>
    <input
      readOnly={help.on}
      key={value ?? 'none'}
      dir="ltr"
      inputMode="numeric"
      disabled={value === null}
      defaultValue={value ?? ''}
      style={{ width: 96, height: 32 }}
      className="field text-center font-mono"
      onBlur={(e) => {
        if (help.on) return;
        const raw = e.currentTarget.value.trim();
        const n = Number(raw);
        if (value !== null && raw !== '' && Number.isFinite(n) && n !== value) onCommit(n);
        else e.currentTarget.value = value === null ? '' : String(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  </label>
  );
};

/*
  ترتيب الاستوديو:
  - الشريط العلوي: التنقل ثم الأدوات ثم مجموعات الميزات (كل مجموعة داخل زر منسدل).
  - اللوحة في الوسط.
  - الشريط السفلي: التكبير ثم التراجع ثم حالة المحرف.
  كل شريط بسطر واحد قابل للسحب، والقوائم تنزل من الزر نفسه.
*/
const StudioInner: React.FC<StudioScreenProps> = ({
  project,
  glyph,
  onSelectGlyph,
  onUpdateGlyph,
  onBack,
}) => {
  const { metrics } = project;
  const help = useHelp();
  const [showBook, setShowBook] = useState(false);

  // Esc في وضع التعليمات: يغلق الشرح أولاً ثم يطفئ الوضع
  useEffect(() => {
    if (!help.on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || showBook) return;
      if (document.querySelector('[role="menu"]')) return;
      if (help.topicId) help.show(null);
      else help.setOn(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [help, showBook]);

  const [options, setOptions] = useState<ViewOptions>({
    grid: true,
    metrics: true,
    nodes: true,
    anchors: true,
    direction: false,
  });
  const toggle = (key: keyof ViewOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  // الصندوق الذي تُحسب منه الملاءمة: العرض الكامل أفقياً والمقاييس رأسياً
  const bounds = useMemo(() => boundsOf(glyph.contours), [glyph.contours]);
  const fitBox = useMemo(
    () => ({
      xMin: Math.min(0, bounds?.xMin ?? 0),
      xMax: Math.max(glyph.advanceWidth, bounds?.xMax ?? 0),
      yMin: metrics.descender,
      yMax: metrics.ascender,
    }),
    [bounds, glyph.advanceWidth, metrics.ascender, metrics.descender]
  );

  // من يملك المؤشر الواحد: اللوحة (تحريك) أم الأداة. يضبطه الكانفاس عند كل ضغطة.
  const panMode = useRef(false);
  const viewport = useViewport({ fitBox, fitKey: glyph.id, shouldPan: () => panMode.current });
  const editor = useStudioEditor({
    glyph,
    metrics,
    scale: viewport.view.scale,
    enabled: !help.on,
    onUpdateGlyph,
  });

  const nodeCount = glyph.contours.reduce((sum, c) => sum + c.nodes.length, 0);
  const pathState =
    glyph.contours.length === 0 ? '—' : glyph.contours.every((c) => c.closed) ? 'مغلق' : 'مفتوح';

  const hasSelection = editor.selection.size > 0;
  const hasDrawing = glyph.contours.length > 0;
  const lsb = bounds ? Math.round(bounds.xMin) : null;
  const rsb = bounds ? glyph.advanceWidth - Math.round(bounds.xMax) : null;
  const target = hasSelection ? 'على المسارات المحددة كاملة' : 'على المحرف كله';

  return (
    <div className="fixed inset-0 z-40 flex flex-col gap-2 bg-paper-deep p-2 sm:gap-3 sm:p-3">
      {/* الشريط العلوي */}
      <DragScroll label="الشريط العلوي" className="glass-panel shrink-0 rounded-2xl">
        <Button variant="quiet" icon helpId="back" title="الرجوع إلى المشروع" onClick={onBack}>
          <ArrowRight className={icon} />
        </Button>

        <Dropdown
          label={glyph.name}
          labelOnMobile
          width={340}
          placement="bottom"
          helpId="glyphPicker"
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
                      if (help.on) {
                        help.show('glyphItem');
                        return;
                      }
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

        {TOOLS.map(({ id, label, key, Icon }) => (
          <Button
            key={id}
            variant="quiet"
            active={editor.tool === id}
            helpId={`tool.${id}`}
            title={`${label} (${key})`}
            onClick={() => editor.setTool(id)}
          >
            <Icon className={icon} />
            <span className="hidden md:inline">{label}</span>
          </Button>
        ))}

        <BarDivider />

        <Button
          variant="quiet"
          icon
          helpId="delete"
          title="حذف المحدد (Delete)"
          disabled={!hasSelection}
          onClick={editor.deleteSelection}
        >
          <Trash2 className={icon} />
        </Button>
        {editor.penContourId && (
          <Button variant="secondary" helpId="finishPen" title="إنهاء المسار (Enter)" onClick={editor.finishPen}>
            <Check className={icon} />
            <span>إنهاء المسار</span>
          </Button>
        )}

        <BarDivider />

        <Dropdown label="عرض" helpId="view" icon={<Eye className={icon} />} placement="bottom">
          {() => (
            <>
              <MenuLabel>إظهار على اللوحة</MenuLabel>
              <MenuItem label="الشبكة" helpId="view.grid" active={options.grid} onClick={() => toggle('grid')} />
              <MenuItem label="خطوط المقاييس" helpId="view.metrics" active={options.metrics} onClick={() => toggle('metrics')} />
              <MenuItem label="النقاط والمقابض" helpId="view.nodes" active={options.nodes} onClick={() => toggle('nodes')} />
              <MenuItem label="نقاط الارتكاز" helpId="view.anchors" active={options.anchors} onClick={() => toggle('anchors')} />
              <MenuItem label="أسهم اتجاه المسارات" helpId="view.direction" active={options.direction} onClick={() => toggle('direction')} />
            </>
          )}
        </Dropdown>

        <Dropdown label="المقاييس" helpId="metrics" icon={<Ruler className={icon} />} placement="bottom" width={300}>
          {(close) => (
            <>
              <MenuLabel>العرض والعارضان (بوحدات الخط)</MenuLabel>
              <NumberRow label="العرض الكامل" helpId="metrics.advance" value={glyph.advanceWidth} onCommit={editor.setAdvance} />
              <NumberRow label="العارض الأيسر" helpId="metrics.lsb" value={lsb} onCommit={editor.changeLsb} />
              <NumberRow label="العارض الأيمن" helpId="metrics.rsb" value={rsb} onCommit={editor.changeRsb} />
              <MenuDivider />
              <MenuItem
                label="توسيط الرسم داخل العرض"
                helpId="metrics.center"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.centerGlyph();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Dropdown label="تحويل" helpId="transform" icon={<Shapes className={icon} />} placement="bottom">
          {(close) => (
            <>
              <MenuLabel>يُطبَّق {target}</MenuLabel>
              <MenuItem
                label="قلب أفقي"
                helpId="t.flipH"
                icon={<FlipHorizontal2 className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.flip('h');
                  close();
                }}
              />
              <MenuItem
                label="قلب رأسي"
                helpId="t.flipV"
                icon={<FlipVertical2 className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.flip('v');
                  close();
                }}
              />
              <MenuItem
                label="تدوير 90° يميناً"
                helpId="t.rot90r"
                icon={<RotateCw className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.rotate(-90);
                  close();
                }}
              />
              <MenuItem
                label="تدوير 90° يساراً"
                helpId="t.rot90l"
                icon={<RotateCcw className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.rotate(90);
                  close();
                }}
              />
              <MenuDivider />
              <MenuItem
                label="تكبير 10%"
                helpId="t.scaleUp"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.scaleBy(1.1);
                  close();
                }}
              />
              <MenuItem
                label="تصغير 10%"
                helpId="t.scaleDown"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.scaleBy(1 / 1.1);
                  close();
                }}
              />
              <MenuDivider />
              <MenuItem
                label="تكرار"
                helpId="t.duplicate"
                hint="Ctrl+D"
                icon={<Copy className="h-4 w-4 stroke-[1.5]" />}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.duplicate();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Dropdown label="المسار" helpId="path" icon={<Spline className={icon} />} placement="bottom">
          {(close) => (
            <>
              <MenuLabel>نوع النقطة (للمحدد)</MenuLabel>
              <MenuItem
                label="ربط المقابض (ناعمة)"
                helpId="p.smooth"
                disabled={!hasSelection}
                onClick={() => {
                  editor.smooth();
                  close();
                }}
              />
              <MenuItem
                label="كسر المقابض (زاوية)"
                helpId="p.corner"
                disabled={!hasSelection}
                onClick={() => {
                  editor.corner();
                  close();
                }}
              />
              <MenuItem
                label="تنعيم تلقائي"
                helpId="p.auto"
                disabled={!hasSelection}
                onClick={() => {
                  editor.autoSmooth();
                  close();
                }}
              />
              <MenuDivider />
              <MenuLabel>الإغلاق والاتجاه</MenuLabel>
              <MenuItem
                label="إغلاق المسار"
                helpId="p.close"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.closeSelected();
                  close();
                }}
              />
              <MenuItem
                label="فتح المسار عند النقطة المحددة"
                helpId="p.open"
                disabled={!hasSelection}
                onClick={() => {
                  editor.openAtSelected();
                  close();
                }}
              />
              <MenuItem
                label="ضبط الاتجاه تلقائياً"
                helpId="p.fixDir"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.autoDirection();
                  close();
                }}
              />
              <MenuItem
                label="عكس اتجاه المسار"
                helpId="p.reverse"
                hint={hasSelection ? 'المحدد' : 'الكل'}
                disabled={!hasDrawing}
                onClick={() => {
                  editor.reverse();
                  close();
                }}
              />
              <MenuItem
                label="تحديد الكل"
                helpId="p.selectAll"
                hint="Ctrl+A"
                disabled={!hasDrawing}
                onClick={() => {
                  editor.selectAll();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Dropdown label="الإعدادات" helpId="settings" icon={<Settings2 className={icon} />} placement="bottom">
          {() => (
            <>
              <MenuLabel>حجم الشبكة (وحدة خط)</MenuLabel>
              {GRID_STEPS.map((step) => (
                <MenuItem
                  key={step}
                  label={String(step)}
                  helpId="settings.gridSize"
                  active={editor.settings.gridStep === step}
                  onClick={() => editor.setGridStep(step)}
                />
              ))}
              <MenuDivider />
              <MenuItem
                label="الالتصاق بالشبكة"
                helpId="settings.snapGrid"
                active={editor.settings.snapGrid}
                onClick={() => editor.setSnapGrid(!editor.settings.snapGrid)}
              />
              <MenuItem
                label="الالتصاق بالنقاط والمقاييس"
                helpId="settings.snapPoints"
                active={editor.settings.snapPoints}
                onClick={() => editor.setSnapPoints(!editor.settings.snapPoints)}
              />
              <MenuLabel>Shift لتقييد الاتجاه، وAlt لتعطيل الالتصاق مؤقتاً.</MenuLabel>
            </>
          )}
        </Dropdown>

        <BarDivider />

        <Button
          variant="quiet"
          active={help.on}
          title="وضع التعليمات"
          onClick={() => help.setOn(!help.on)}
        >
          <CircleHelp className={icon} />
          <span className="hidden md:inline">تعليمات</span>
        </Button>
      </DragScroll>

      {/* اللوحة */}
      <main className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-ink/25 bg-canvas shadow-sm">
        <StudioCanvas
          glyph={glyph}
          metrics={metrics}
          viewport={viewport}
          options={options}
          editor={editor}
          panMode={panMode}
          onHelp={help.on ? () => help.show('canvas') : undefined}
        />
        <HelpPanel onOpenBook={() => setShowBook(true)} />
        {editor.notice && (
          <div
            role="status"
            className="glass-panel pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto w-fit max-w-[90%] rounded-xl px-4 py-2 text-xs"
          >
            {editor.notice}
          </div>
        )}
      </main>

      {/* الشريط السفلي */}
      <DragScroll label="الشريط السفلي" className="glass-panel shrink-0 rounded-2xl">
        <Button variant="quiet" icon helpId="zoomOut" title="تصغير" onClick={viewport.zoomOut}>
          <ZoomOut className={icon} />
        </Button>

        <Dropdown label={`${viewport.percent}%`} helpId="zoomMenu" labelOnMobile width={180} placement="top">
          {(close) => (
            <>
              <MenuLabel>مستوى التكبير</MenuLabel>
              {ZOOM_PRESETS.map((p) => (
                <MenuItem
                  key={p}
                  label={`${p}%`}
                  helpId="zoomPreset"
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
                helpId="fit"
                onClick={() => {
                  viewport.fit();
                  close();
                }}
              />
            </>
          )}
        </Dropdown>

        <Button variant="quiet" icon helpId="zoomIn" title="تكبير" onClick={viewport.zoomIn}>
          <ZoomIn className={icon} />
        </Button>
        <Button variant="quiet" icon helpId="fit" title="ملاءمة المحرف للشاشة" onClick={viewport.fit}>
          <Maximize className={icon} />
        </Button>

        <BarDivider />

        <Button variant="quiet" icon helpId="undo" title="تراجع (Ctrl+Z)" disabled={!editor.canUndo} onClick={editor.undo}>
          <Undo2 className={icon} />
        </Button>
        <Button variant="quiet" icon helpId="redo" title="إعادة (Ctrl+Shift+Z)" disabled={!editor.canRedo} onClick={editor.redo}>
          <Redo2 className={icon} />
        </Button>

        <BarDivider />

        <div
          className="flex shrink-0 items-center gap-3 whitespace-nowrap px-2 text-xs text-ink-soft"
          onPointerDown={help.on ? () => help.show('status') : undefined}
        >
          <span>
            نقاط <span className="font-mono text-ink">{nodeCount}</span>
          </span>
          <span>
            محدد <span className="font-mono text-ink">{editor.selection.size}</span>
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
      {showBook && <HelpBook onClose={() => setShowBook(false)} />}
    </div>
  );
};

/** المزوّد هنا لا في App: مغادرة الاستوديو تفكّه فينتهي وضع التعليمات تلقائياً. */
export const StudioScreen: React.FC<StudioScreenProps> = (props) => (
  <HelpProvider>
    <StudioInner {...props} />
  </HelpProvider>
);
