# الدفعة 23: واجهة أهدأ وأخف

تُنفَّذ فوق الدفعة 22 (التي نفّذتها). إجراءات كل بطاقة في قائمة واحدة، حذف شريط التقدم، نصوص تُقتطع بثلاث نقاط، أحجام أزرار أصغر.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: في الملف `src/index.css`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  .btn { height: 2.75rem; }
  .btn-icon { width: 2.75rem; }
```

**النص الجديد:**
```
  .btn { height: 2.5rem; }
  .btn-icon { width: 2.5rem; }
```

## الخطوة 2: في الملف `src/index.css`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
.chip-ghost {
  background-color: transparent;
}
```

**النص الجديد:**
```
.chip-ghost {
  background-color: transparent;
}

/* زر القائمة الصغير داخل البطاقات */
.card-menu {
  position: absolute;
  top: 0.4rem;
  inset-inline-start: 0.4rem;
}
```

## الخطوة 3: أنشئ الملف `src/components/ui/CardMenu.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Dropdown } from './Dropdown';

/** قائمة إجراءات البطاقة. النقر عليها لا يفتح البطاقة نفسها. */
export const CardMenu: React.FC<{
  label: string;
  className?: string;
  children: (close: () => void) => React.ReactNode;
}> = ({ label, className = '', children }) => (
  <span className={className} onClick={(e) => e.stopPropagation()}>
    <Dropdown label={label} iconOnly icon={<MoreHorizontal className="h-4 w-4 stroke-[1.5]" />} placement="bottom" align="start" width={190}>
      {children}
    </Dropdown>
  </span>
);

```

## الخطوة 4: أنشئ الملف `src/components/GlyphCard.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { type FontMetrics, type Glyph } from '../types/font';
import { isReady } from '../utils/glyphLogic';
import { CATEGORY_LABEL, FORM_LABEL } from '../utils/labels';
import { GlyphThumb } from './GlyphThumb';
import { CardMenu } from './ui/CardMenu';
import { MenuItem } from './ui/Dropdown';

interface GlyphCardProps {
  glyph: Glyph;
  metrics: FontMetrics;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const ic = 'h-4 w-4 stroke-[1.5]';

/**
 * بطاقة محرف هادئة: معاينة، اسم، سطر واحد خافت.
 * الحالة نقطة صغيرة، والإجراءات كلها في قائمة واحدة.
 * النصوص الطويلة تُقتطع بثلاث نقاط ويظهر النص الكامل عند التمرير أو في نافذة التعديل.
 */
const GlyphCardBase: React.FC<GlyphCardProps> = ({ glyph, metrics, onOpen, onEdit, onDuplicate, onDelete }) => {
  const ready = isReady(glyph);
  const kind = glyph.form !== 'isolated' ? FORM_LABEL[glyph.form] : CATEGORY_LABEL[glyph.category];
  return (
    <div className="card-flat relative rounded-2xl transition-colors hover:border-ink/50">
      <button
        type="button"
        onClick={() => onOpen(glyph.id)}
        className="flex w-full flex-col gap-2 p-2.5 text-start"
        title="فتح المحرف في الاستوديو"
      >
        <div className="relative flex h-24 items-center justify-center rounded-xl bg-sand/15">
          <GlyphThumb glyph={glyph} metrics={metrics} className="h-full w-full p-2" />
          <span
            className={`absolute bottom-1.5 end-1.5 h-2 w-2 rounded-full ${ready ? 'bg-ink' : 'border border-ink/40'}`}
            title={ready ? 'مرسوم' : 'لم يُرسم بعد'}
          />
        </div>
        <div className="min-w-0 px-0.5">
          <span dir="ltr" className="block truncate text-start font-mono text-xs" title={glyph.name}>
            {glyph.name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-ink-soft" title={`${glyph.unicode} · ${kind}`}>
            <span dir="ltr" className="font-mono">{glyph.unicode || '—'}</span> · {kind}
          </span>
        </div>
      </button>
      <CardMenu label="إجراءات المحرف" className="card-menu">
        {(close) => (
          <>
            <MenuItem label="تعديل البيانات" icon={<Pencil className={ic} />} onClick={() => { close(); onEdit(glyph.id); }} />
            <MenuItem label="تكرار" icon={<Copy className={ic} />} onClick={() => { close(); onDuplicate(glyph.id); }} />
            <MenuItem label="حذف" icon={<Trash2 className={ic} />} onClick={() => { close(); onDelete(glyph.id); }} />
          </>
        )}
      </CardMenu>
    </div>
  );
};

export const GlyphCard = React.memo(GlyphCardBase);

```

## الخطوة 5: أنشئ الملف `src/components/ProjectOverview.tsx` (أو استبدل محتواه كاملاً)

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
import { CountChip, VersionPill } from './ui/Pill';

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
      {/* الترويسة */}
      <header className="card-flat flex flex-col gap-3 rounded-2xl p-3.5 sm:p-4">
        <div className="flex items-center gap-2.5">
          <Button variant="quiet" icon title="الرجوع إلى قائمة المشاريع" onClick={onBackToProjects}>
            <ArrowRight className={icon} />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-lg sm:text-2xl" title={project.name}>{project.name}</h1>
          <HelpBookButton iconOnly variant="quiet" />
          <Dropdown label="الإعدادات" iconOnly icon={<Settings2 className={icon} />} placement="bottom" width={230}>
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

        <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-soft">
          <VersionPill version={project.version} />
          <span dir="ltr" className="shrink-0 font-mono">{info.subfamily}</span>
          <span className="shrink-0">·</span>
          <span className="min-w-0 truncate" title={project.designer}>{project.designer}</span>
        </p>

        <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-3 text-xs text-ink-soft">
          <span><b className="font-mono font-normal text-ink">{ready}</b> مكتمل</span>
          <span><b className="font-mono font-normal text-ink">{notReadyIds.length}</b> ناقص</span>
          <span><b className="font-mono font-normal text-ink">{rules}</b> قاعدة</span>
        </div>
      </header>

      {/* المحارف */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg">المحارف</h2>
            <CountChip value={glyphs.length} />
          </div>
          {!isEmpty && (
            <div className="flex items-center gap-1.5">
              <Dropdown label="ترتيب وتنظيف" iconOnly framed icon={<ArrowUpDown className={icon} />} placement="bottom" width={210}>
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
                    {notReadyIds.length > 0 && (
                      <>
                        <MenuLabel>تنظيف</MenuLabel>
                        <MenuItem
                          label="حذف المحارف الفارغة"
                          icon={<Eraser className={icon} />}
                          hint={String(notReadyIds.length)}
                          onClick={() => {
                            close();
                            setConfirmEmpty(true);
                          }}
                        />
                      </>
                    )}
                  </>
                )}
              </Dropdown>
              <Button variant="secondary" icon title="مجموعات جاهزة" onClick={() => setShowPreset(true)}>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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

## الخطوة 6: أنشئ الملف `src/components/ProjectsDashboard.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useMemo, useState } from 'react';
import { Copy, FileText, FolderPlus, PenTool, Plus, Search, Trash2 } from 'lucide-react';
import { type FontProject } from '../types/font';
import { resolveInfo } from '../utils/fontInfo';
import { isReady } from '../utils/glyphLogic';
import { FontInfoModal, type InfoPatch } from './FontInfoModal';
import { GlyphThumb } from './GlyphThumb';
import { HelpBookButton } from './help/HelpBook';
import { ImportFontButton } from './ImportFontButton';
import { Button } from './ui/Button';
import { CardMenu } from './ui/CardMenu';
import { MenuItem } from './ui/Dropdown';
import { Modal, ModalActions } from './ui/Modal';
import { CountChip, VersionPill } from './ui/Pill';

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
      className="card-flat relative flex cursor-pointer flex-col gap-3 rounded-2xl p-4 transition-colors hover:border-ink/50"
    >
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-base sm:text-lg" title={project.name}>{project.name}</h2>
        <VersionPill version={project.version} />
        <CardMenu label="إجراءات المشروع">
          {(close) => (
            <>
              <MenuItem label="تعديل المعلومات" icon={<FileText className={icon} />} onClick={() => { close(); onEdit(project); }} />
              <MenuItem label="نسخ المشروع" icon={<Copy className={icon} />} onClick={() => { close(); onDuplicate(project.id); }} />
              <MenuItem label="حذف المشروع" icon={<Trash2 className={icon} />} onClick={() => { close(); onDelete(project); }} />
            </>
          )}
        </CardMenu>
      </div>

      <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-soft">
        <span className="min-w-0 truncate" title={project.designer}>{project.designer}</span>
        <span className="shrink-0">·</span>
        <span dir="ltr" className="shrink-0 font-mono">{info.subfamily}</span>
      </p>

      <div className="flex h-14 items-center gap-1.5 overflow-hidden rounded-xl bg-sand/15 px-2.5">
        {drawn.length > 0 ? (
          drawn.slice(0, 7).map((g) => (
            <GlyphThumb key={g.id} glyph={g} metrics={project.metrics} className="h-9 w-9 shrink-0" />
          ))
        ) : (
          <span className="text-[11px] text-ink-soft">لم يُرسم أي محرف بعد</span>
        )}
      </div>

      <p className="text-[11px] text-ink-soft">
        <span className="font-mono text-ink">{drawn.length}</span> مكتمل من{' '}
        <span className="font-mono text-ink">{project.glyphs.length}</span> محرف
      </p>
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
      <div className="flex items-center justify-between gap-3 px-0.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink/20 bg-sand/30 sm:flex">
            <PenTool className="h-4 w-4 stroke-[1.5]" />
          </span>
          <h1 className="truncate text-lg sm:text-2xl">مشاريع الخطوط</h1>
          {hasProjects && <CountChip value={projects.length} />}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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

## الخطوة 7: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
