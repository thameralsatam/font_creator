# الدفعة 22: إصلاح تناسق الواجهة (للجوال خصوصاً)

هذه الدفعة تنفَّذ بعد الدفعة 21. توحيد حجم كل الأزرار، كبسولات لبيانات كل محرف، بطاقة المشروع وشريط التقدم من جديد، وإخفاء المجموعات الجاهزة وإضافة محرف في المشروع الفارغ حتى لا تتكرر.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  iconOnly?: boolean;
  /** auto
```

**النص الجديد:**
```
  iconOnly?: boolean;
  /** إطار مثل الأزرار الثانوية، ليتطابق مع الأزرار المجاورة في أشرطة الأدوات. */
  framed?: boolean;
  /** auto
```

## الخطوة 2: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  iconOnly = false,
  placement
```

**النص الجديد:**
```
  iconOnly = false,
  framed = false,
  placement
```

## الخطوة 3: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        variant="quiet"
        soon={soon}
```

**النص الجديد:**
```
        variant={framed ? 'secondary' : 'quiet'}
        icon={iconOnly}
        soon={soon}
```

## الخطوة 4: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        <ChevronDown
          className={`h-3 w-3 stroke-[1.5] transition-transform ${open ? 'rotate-180' : ''}`}
        />
```

**النص الجديد:**
```
        {!iconOnly && (
          <ChevronDown
            className={`h-3 w-3 stroke-[1.5] transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
```

## الخطوة 5: في الملف `src/index.css`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  border: 1px solid rgba(18, 48, 42, 0.2);
  /* العناصر خارج الشاشة لا تُرسم، فتخف الصفحة مع مئات المحارف */
  content-visibility: auto;
  contain-intrinsic-size: auto 220px;
}
```

**النص الجديد:**
```
  border: 1px solid rgba(18, 48, 42, 0.2);
  box-shadow: 0 1px 2px rgba(18, 48, 42, 0.05);
}

/* كبسولة صغيرة موحّدة لكل البيانات الثانوية */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  height: 1.375rem;
  padding: 0 0.55rem;
  border: 1px solid rgba(18, 48, 42, 0.22);
  border-radius: 999px;
  background-color: rgba(232, 205, 154, 0.3);
  font-size: 0.6875rem;
  line-height: 1;
  white-space: nowrap;
}
.chip-solid {
  background-color: var(--color-ink);
  border-color: var(--color-ink);
  color: var(--color-paper);
}
.chip-ghost {
  background-color: transparent;
}
```

## الخطوة 6: أنشئ الملف `src/components/ui/Pill.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React from 'react';

/** رقم الإصدار: كبسولة موحّدة. */
export const VersionPill: React.FC<{ version: string; className?: string }> = ({ version, className = '' }) => (
  <span dir="ltr" title={`الإصدار ${version}`} className={`chip chip-solid font-mono ${className}`}>
    v{version}
  </span>
);

/** عدّاد صغير بجانب عنوان قسم. */
export const CountChip: React.FC<{ value: number }> = ({ value }) => (
  <span className="chip font-mono">{value}</span>
);

/** شريط تقدّم: مسار واضح وتعبئة داكنة ونسبة مئوية في كبسولة. */
export const Progress: React.FC<{ value: number; max: number; className?: string }> = ({ value, max, className = '' }) => {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 flex-1 overflow-hidden rounded-full border border-ink/25 bg-sand/25 p-px"
      >
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-500"
          style={{ width: `${pct}%`, minWidth: pct > 0 ? '0.5rem' : 0 }}
        />
      </div>
      <span dir="ltr" className="chip font-mono">{pct}%</span>
    </div>
  );
};

```

## الخطوة 7: أنشئ الملف `src/components/GlyphCard.tsx` (أو استبدل محتواه كاملاً)

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

const ic = 'h-3.5 w-3.5 stroke-[1.5]';

/** بطاقة محرف: معاينة في الأعلى، ثم الاسم، ثم كبسولات البيانات، ثم أدوات متساوية الحجم. */
const GlyphCardBase: React.FC<GlyphCardProps> = ({ glyph, metrics, onOpen, onEdit, onDuplicate, onDelete }) => {
  const ready = isReady(glyph);
  return (
    <div className="card-flat flex flex-col overflow-hidden rounded-2xl transition-colors hover:border-ink/50">
      <button
        type="button"
        onClick={() => onOpen(glyph.id)}
        className="flex flex-col items-stretch gap-2.5 p-3 text-start"
        title="فتح المحرف في الاستوديو"
      >
        <div className="flex h-20 items-center justify-center rounded-xl border border-ink/10 bg-sand/15">
          <GlyphThumb glyph={glyph} metrics={metrics} className="h-full w-full p-1.5" />
        </div>
        <span dir="ltr" className="truncate text-center font-mono text-xs" title={glyph.name}>
          {glyph.name}
        </span>
        <div className="flex flex-wrap justify-center gap-1">
          <span dir="ltr" className="chip font-mono">{glyph.unicode || '—'}</span>
          <span className={`chip ${ready ? 'chip-solid' : 'chip-ghost'}`}>{ready ? 'مرسوم' : 'فارغ'}</span>
          <span className="chip chip-ghost">{CATEGORY_LABEL[glyph.category]}</span>
          {glyph.form !== 'isolated' && <span className="chip chip-ghost">{FORM_LABEL[glyph.form]}</span>}
          <span dir="ltr" className="chip chip-ghost font-mono">{glyph.advanceWidth}</span>
        </div>
      </button>
      <div className="mt-auto grid grid-cols-3 divide-x divide-x-reverse divide-ink/10 border-t border-ink/10">
        <Button variant="quiet" className="rounded-none" title="تعديل بيانات المحرف" onClick={() => onEdit(glyph.id)}>
          <Pencil className={ic} />
        </Button>
        <Button variant="quiet" className="rounded-none" title="تكرار المحرف" onClick={() => onDuplicate(glyph.id)}>
          <Copy className={ic} />
        </Button>
        <Button variant="quiet" className="rounded-none" title="حذف المحرف" onClick={() => onDelete(glyph.id)}>
          <Trash2 className={ic} />
        </Button>
      </div>
    </div>
  );
};

export const GlyphCard = React.memo(GlyphCardBase);

```

## الخطوة 8: أنشئ الملف `src/components/ProjectOverview.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Download,
  Eraser,
  FileText,
  Layers,
  Plus,
  Settings2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { type FontProject, type NewGlyphData } from '../types/font';
import { computeFeatures } from '../utils/features';
import { resolveInfo } from '../utils/fontInfo';
import { type GlyphMeta, type SortMode, isReady, sortGlyphs } from '../utils/glyphLogic';
import { FeaturesModal } from './FeaturesModal';
import { FontInfoModal, type InfoPatch } from './FontInfoModal';
import { GlyphAddModal } from './GlyphAddModal';
import { GlyphCard } from './GlyphCard';
import { GlyphEditModal } from './GlyphEditModal';
import { PresetModal } from './PresetModal';
import { HelpBookButton } from './help/HelpBook';
import { Button } from './ui/Button';
import { Dropdown, MenuItem, MenuLabel } from './ui/Dropdown';
import { Modal, ModalActions } from './ui/Modal';
import { CountChip, Progress, VersionPill } from './ui/Pill';

interface ProjectOverviewProps {
  project: FontProject;
  onBackToProjects: () => void;
  onEnterStudio: (glyphId?: string) => void;
  onOpenMetrics: () => void;
  onOpenExport: () => void;
  onAddNewGlyph: (glyphData: NewGlyphData) => void;
  onAddPreset: (items: NewGlyphData[]) => void;
  onEditGlyph: (glyphId: string, meta: GlyphMeta) => void;
  onDeleteGlyph: (glyphId: string) => void;
  onDeleteGlyphs: (glyphIds: string[]) => void;
  onDuplicateGlyph: (glyphId: string) => void;
  onUpdateInfo: (patch: InfoPatch) => void;
}

const PAGE = 60;
const icon = 'h-4 w-4 stroke-[1.5]';

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: 'ready', label: 'الجاهزة أولاً' },
  { id: 'added', label: 'حسب الإضافة' },
  { id: 'code', label: 'حسب اليونيكود' },
];

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex flex-col items-center gap-0.5 px-1">
    <span className="font-mono text-xl leading-tight sm:text-2xl">{value}</span>
    <span className="text-[11px] text-ink-soft">{label}</span>
  </div>
);

export const ProjectOverview: React.FC<ProjectOverviewProps> = (props) => {
  const { project, onBackToProjects, onEnterStudio, onOpenMetrics, onOpenExport, onUpdateInfo } = props;
  const { glyphs, metrics } = project;

  const [sort, setSort] = useState<SortMode>('ready');
  const [limit, setLimit] = useState(PAGE);
  const [showAdd, setShowAdd] = useState(false);
  const [showPreset, setShowPreset] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // الدوال المرسلة للبطاقات ثابتة حتى لا تُعاد رسم مئات البطاقات مع كل تغيير
  const latest = useRef(props);
  latest.current = props;
  const open = useCallback((id: string) => latest.current.onEnterStudio(id), []);
  const duplicate = useCallback((id: string) => latest.current.onDuplicateGlyph(id), []);

  const info = resolveInfo(project);
  const shown = useMemo(() => sortGlyphs(glyphs, sort), [glyphs, sort]);
  const notReadyIds = useMemo(() => glyphs.filter((g) => !isReady(g)).map((g) => g.id), [glyphs]);
  const ready = glyphs.length - notReadyIds.length;
  const rules = useMemo(() => computeFeatures(glyphs).rules.length, [glyphs]);
  const editing = glyphs.find((g) => g.id === editingId) ?? null;
  const deleting = glyphs.find((g) => g.id === deletingId) ?? null;
  const isEmpty = glyphs.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* الترويسة: صف واحد، كل الأزرار بحجم واحد */}
      <header className="card-flat flex items-center gap-3 rounded-2xl p-3 sm:p-4">
        <Button variant="secondary" icon title="الرجوع إلى قائمة المشاريع" onClick={onBackToProjects}>
          <ArrowRight className={icon} />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight sm:text-2xl">{project.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <VersionPill version={project.version} />
            <span dir="ltr" className="chip chip-ghost font-mono">{info.subfamily}</span>
            <span className="chip chip-ghost max-w-[10rem] truncate">{project.designer}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <HelpBookButton iconOnly />
          <Dropdown label="الإعدادات" iconOnly framed icon={<Settings2 className={icon} />} placement="bottom" width={230}>
            {(close) => (
              <>
                <MenuLabel>إعدادات الخط</MenuLabel>
                <MenuItem
                  label="معلومات الخط"
                  icon={<FileText className={icon} />}
                  onClick={() => {
                    close();
                    setShowInfo(true);
                  }}
                />
                <MenuItem
                  label="المقاييس"
                  icon={<Sliders className={icon} />}
                  onClick={() => {
                    close();
                    onOpenMetrics();
                  }}
                />
                <MenuItem
                  label="ميزات الأوبن تايب"
                  icon={<Sparkles className={icon} />}
                  hint={rules ? String(rules) : undefined}
                  onClick={() => {
                    close();
                    setShowFeatures(true);
                  }}
                />
              </>
            )}
          </Dropdown>
          <Button variant="primary" icon onClick={onOpenExport} title="تصدير الخط">
            <Download className={icon} />
          </Button>
        </div>
      </header>

      {/* الإحصائيات: بطاقة واحدة مرتبة */}
      <section className="card-flat flex flex-col gap-3.5 rounded-2xl p-4">
        <div className="grid grid-cols-4 divide-x divide-x-reverse divide-ink/10 text-center">
          <Stat label="المحارف" value={glyphs.length} />
          <Stat label="المكتمل" value={ready} />
          <Stat label="الناقص" value={notReadyIds.length} />
          <Stat label="القواعد" value={rules} />
        </div>
        <Progress value={ready} max={glyphs.length} />
      </section>

      {/* المحارف */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg">المحارف</h2>
            <CountChip value={glyphs.length} />
          </div>
          {!isEmpty && (
            <div className="flex items-center gap-1.5">
              <Dropdown label="ترتيب المحارف" iconOnly framed icon={<ArrowUpDown className={icon} />} placement="bottom" width={200}>
                {(close) => (
                  <>
                    <MenuLabel>ترتيب العرض</MenuLabel>
                    {SORTS.map((s) => (
                      <MenuItem
                        key={s.id}
                        label={s.label}
                        active={sort === s.id}
                        onClick={() => {
                          setSort(s.id);
                          setLimit(PAGE);
                          close();
                        }}
                      />
                    ))}
                  </>
                )}
              </Dropdown>
              {notReadyIds.length > 0 && (
                <span className="relative inline-flex">
                  <Button icon title={`حذف المحارف الفارغة (${notReadyIds.length})`} onClick={() => setConfirmEmpty(true)}>
                    <Eraser className={icon} />
                  </Button>
                  <span className="chip chip-solid pointer-events-none absolute -end-1.5 -top-2 h-4 min-w-4 justify-center px-1 font-mono text-[9px]">
                    {notReadyIds.length}
                  </span>
                </span>
              )}
              <Button icon title="مجموعات جاهزة" onClick={() => setShowPreset(true)}>
                <Layers className={icon} />
              </Button>
              <Button variant="primary" icon title="إضافة محرف" onClick={() => setShowAdd(true)}>
                <Plus className={icon} />
              </Button>
            </div>
          )}
        </div>

        {isEmpty ? (
          <div className="card-flat flex flex-col items-center rounded-2xl p-8 text-center sm:p-10">
            <p className="mb-1 text-base">لا توجد محارف في هذا المشروع حتى الآن</p>
            <p className="mb-4 max-w-sm text-xs leading-relaxed text-ink-soft">
              أضف محرفك الأول، أو اختر مجموعة جاهزة للبدء مباشرة في رسم خطك.
            </p>
            <div className="flex items-center gap-2.5">
              <Button variant="primary" onClick={() => setShowAdd(true)}>
                <Plus className={icon} />
                <span>إضافة محرف</span>
              </Button>
              <Button onClick={() => setShowPreset(true)}>
                <Layers className={icon} />
                <span>مجموعات جاهزة</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {shown.slice(0, limit).map((g) => (
                <GlyphCard
                  key={g.id}
                  glyph={g}
                  metrics={metrics}
                  onOpen={open}
                  onEdit={setEditingId}
                  onDuplicate={duplicate}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
            {shown.length > limit && (
              <div className="flex justify-center">
                <Button onClick={() => setLimit((n) => n + PAGE)}>
                  عرض المزيد ({shown.length - limit})
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {showAdd && <GlyphAddModal glyphs={glyphs} onAdd={props.onAddNewGlyph} onClose={() => setShowAdd(false)} />}
      {showPreset && <PresetModal existing={glyphs} onAdd={props.onAddPreset} onClose={() => setShowPreset(false)} />}
      {showInfo && <FontInfoModal project={project} onSave={onUpdateInfo} onClose={() => setShowInfo(false)} />}
      {showFeatures && (
        <FeaturesModal
          project={project}
          onAddGlyphs={props.onAddPreset}
          onOpenGlyph={(id) => {
            setShowFeatures(false);
            onEnterStudio(id);
          }}
          onClose={() => setShowFeatures(false)}
        />
      )}
      {editing && (
        <GlyphEditModal
          key={editing.id}
          glyph={editing}
          glyphs={glyphs}
          onSave={(meta) => props.onEditGlyph(editing.id, meta)}
          onClose={() => setEditingId(null)}
        />
      )}

      {deleting && (
        <Modal title="حذف المحرف" size="sm" onClose={() => setDeletingId(null)}>
          <p className="text-sm leading-7">
            سيُحذف المحرف <span dir="ltr" className="font-mono">{deleting.name}</span> مع رسمه نهائياً ولا يمكن التراجع.
          </p>
          <ModalActions>
            <Button onClick={() => setDeletingId(null)}>إلغاء</Button>
            <Button
              variant="primary"
              onClick={() => {
                props.onDeleteGlyph(deleting.id);
                setDeletingId(null);
              }}
            >
              حذف
            </Button>
          </ModalActions>
        </Modal>
      )}

      {confirmEmpty && (
        <Modal title="حذف المحارف غير المرسومة" size="sm" onClose={() => setConfirmEmpty(false)}>
          <p className="text-sm leading-7">
            سيُحذف <span className="font-mono">{notReadyIds.length}</span> محرف لم يُرسم فيه مسار مغلق بعد
            (محرف الفراغ يبقى). لا يمكن التراجع، لكن تستطيع إعادتها من المجموعات الجاهزة.
          </p>
          <ModalActions>
            <Button onClick={() => setConfirmEmpty(false)}>إلغاء</Button>
            <Button
              variant="primary"
              onClick={() => {
                props.onDeleteGlyphs(notReadyIds);
                setConfirmEmpty(false);
              }}
            >
              حذف
            </Button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
};

```

## الخطوة 9: أنشئ الملف `src/components/ProjectsDashboard.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useMemo, useState } from 'react';
import { Copy, FileText, FolderOpen, FolderPlus, PenTool, Plus, Search, Trash2 } from 'lucide-react';
import { type FontProject } from '../types/font';
import { resolveInfo } from '../utils/fontInfo';
import { isReady } from '../utils/glyphLogic';
import { FontInfoModal, type InfoPatch } from './FontInfoModal';
import { GlyphThumb } from './GlyphThumb';
import { HelpBookButton } from './help/HelpBook';
import { ImportFontButton } from './ImportFontButton';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';
import { CountChip, Progress, VersionPill } from './ui/Pill';

interface ProjectsDashboardProps {
  projects: FontProject[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: (name: string, designer: string, description: string) => void;
  onUpdateProject: (projectId: string, patch: InfoPatch) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onImportProject: (project: FontProject) => void;
}

const icon = 'h-4 w-4 stroke-[1.5]';

const ProjectCard: React.FC<{
  project: FontProject;
  onOpen: (id: string) => void;
  onEdit: (p: FontProject) => void;
  onDuplicate: (id: string) => void;
  onDelete: (p: FontProject) => void;
}> = React.memo(({ project, onOpen, onEdit, onDuplicate, onDelete }) => {
  const info = resolveInfo(project);
  const drawn = useMemo(() => project.glyphs.filter(isReady), [project.glyphs]);
  return (
    <article
      onClick={() => onOpen(project.id)}
      className="card-flat flex cursor-pointer flex-col overflow-hidden rounded-2xl transition-colors hover:border-ink/50"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 flex-1 truncate text-lg">{project.name}</h2>
          <VersionPill version={project.version} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="chip chip-ghost max-w-[9rem] truncate">{project.designer}</span>
          <span dir="ltr" className="chip chip-ghost font-mono">{info.subfamily}</span>
          <span dir="ltr" className="chip chip-ghost font-mono">{project.metrics.upm}</span>
        </div>

        <div className="flex h-14 items-center gap-1.5 overflow-hidden rounded-xl border border-ink/10 bg-sand/15 px-2.5">
          {drawn.length > 0 ? (
            drawn.slice(0, 7).map((g) => (
              <GlyphThumb key={g.id} glyph={g} metrics={project.metrics} className="h-9 w-9 shrink-0" />
            ))
          ) : (
            <span className="text-[11px] text-ink-soft">لم يُرسم أي محرف بعد</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-ink-soft">
            <span>المكتمل</span>
            <span dir="ltr" className="font-mono">{drawn.length} / {project.glyphs.length}</span>
          </div>
          <Progress value={drawn.length} max={project.glyphs.length} />
        </div>
      </div>

      <div
        className="mt-auto grid grid-cols-4 divide-x divide-x-reverse divide-ink/10 border-t border-ink/10"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="quiet" className="rounded-none" title="تعديل معلومات المشروع" onClick={() => onEdit(project)}>
          <FileText className={icon} />
        </Button>
        <Button variant="quiet" className="rounded-none" title="نسخ المشروع" onClick={() => onDuplicate(project.id)}>
          <Copy className={icon} />
        </Button>
        <Button variant="quiet" className="rounded-none" title="حذف المشروع" onClick={() => onDelete(project)}>
          <Trash2 className={icon} />
        </Button>
        <Button variant="quiet" className="rounded-none" title="فتح المشروع" onClick={() => onOpen(project.id)}>
          <FolderOpen className={icon} />
        </Button>
      </div>
    </article>
  );
});
ProjectCard.displayName = 'ProjectCard';

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onUpdateProject,
  onDuplicateProject,
  onDeleteProject,
  onImportProject,
}) => {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<FontProject | null>(null);
  const [deleting, setDeleting] = useState<FontProject | null>(null);

  const [newName, setNewName] = useState('');
  const [newDesigner, setNewDesigner] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const hasProjects = projects.length > 0;
  const q = query.trim().toLowerCase();
  const filtered = projects.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.designer.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );

  const closeCreate = () => {
    setShowCreate(false);
    setNewName('');
    setNewDesigner('');
    setNewDesc('');
  };

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateProject(newName, newDesigner, newDesc);
    closeCreate();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="card-flat flex items-center justify-between gap-3 rounded-2xl p-3.5 sm:p-5">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-ink-soft">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-ink/20 bg-sand/35">
              <PenTool className="h-3.5 w-3.5 stroke-[1.5]" />
            </span>
            <span className="truncate">استوديو هندسة وتصميم الخطوط الطباعية</span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl">مشاريع الخطوط</h1>
            {hasProjects && <CountChip value={projects.length} />}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ImportFontButton onImport={onImportProject} iconOnly />
          <HelpBookButton iconOnly />
          {hasProjects && (
            <Button variant="primary" icon title="مشروع خط جديد" onClick={() => setShowCreate(true)}>
              <Plus className={icon} />
            </Button>
          )}
        </div>
      </div>

      {hasProjects ? (
        <>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[1.5] opacity-50" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الخط أو المصمم أو الوصف"
              aria-label="بحث في المشاريع"
              className="field ps-9"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">لا توجد مشاريع تطابق بحثك.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={onOpenProject}
                  onEdit={setEditing}
                  onDuplicate={onDuplicateProject}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="card-flat mx-auto my-6 flex w-full max-w-lg flex-col items-center rounded-2xl p-10 text-center sm:p-14">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/20 bg-sand/35">
            <FolderPlus className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h2 className="mb-2 text-xl">لا توجد مشاريع خطوط حتى الآن</h2>
          <p className="mb-6 max-w-md text-xs leading-relaxed text-ink-soft sm:text-sm">
            ابدأ مشروع خطك الأول، ثم ارسم المحارف واضبط المقاييس وابنِ منها خطاً حقيقياً.
          </p>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className={icon} />
            <span>إنشاء مشروع خط جديد</span>
          </Button>
        </div>
      )}

      {showCreate && (
        <Modal title="إنشاء مشروع خط جديد" onClose={closeCreate}>
          <form onSubmit={submitCreate} className="space-y-3.5">
            <div>
              <label htmlFor="new-name" className="mb-1 block text-xs text-ink-soft">اسم الخط</label>
              <input
                id="new-name"
                autoFocus
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: خط الياقوت"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="new-designer" className="mb-1 block text-xs text-ink-soft">المصمم أو الاستوديو</label>
              <input
                id="new-designer"
                value={newDesigner}
                onChange={(e) => setNewDesigner(e.target.value)}
                placeholder="المصمم"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="new-desc" className="mb-1 block text-xs text-ink-soft">وصف مختصر</label>
              <textarea
                id="new-desc"
                rows={3}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="خط نصي وعناوين بهندسة متزنة"
                className="field"
              />
            </div>
            <ModalActions>
              <Button onClick={closeCreate}>إلغاء</Button>
              <Button type="submit" variant="primary">بدء المشروع</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {editing && (
        <FontInfoModal
          project={editing}
          onSave={(patch) => onUpdateProject(editing.id, patch)}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <Modal title="تأكيد حذف المشروع" size="sm" onClose={() => setDeleting(null)}>
          <p className="text-xs leading-relaxed text-ink-soft">
            سيُحذف «{deleting.name}» نهائياً مع كل ما رُسم فيه من محارف، ولا يمكن استرجاعه.
          </p>
          <ModalActions>
            <Button onClick={() => setDeleting(null)}>تراجع</Button>
            <Button
              variant="primary"
              onClick={() => {
                onDeleteProject(deleting.id);
                setDeleting(null);
              }}
            >
              تأكيد الحذف
            </Button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
};

```

## الخطوة 10: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
