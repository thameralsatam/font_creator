# الدفعة 21: إعادة ترتيب الواجهة (النظرة العامة وقائمة المشاريع)

أزرار برموز فقط، قائمة إعدادات (معلومات الخط، المقاييس، الميزات)، إحصائيات المكتمل والناقص، بطاقات مشاريع احترافية، تعديل المشروع يفتح كل المعلومات، وعرض تدريجي للمحارف.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: في الملف `src/components/help/HelpBook.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
export const HelpBookButton: React.FC<{ variant?: 'secondary' | 'quiet' }> = ({ variant = 'secondary' }) => {
```

**النص الجديد:**
```
export const HelpBookButton: React.FC<{ variant?: 'secondary' | 'quiet'; iconOnly?: boolean }> = ({
  variant = 'secondary',
  iconOnly = false,
}) => {
```

## الخطوة 2: في الملف `src/components/help/HelpBook.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      <Button variant={variant} title="كتاب التعليمات" onClick={() => setOpen(true)}>
        <BookOpen className="h-3.5 w-3.5 stroke-[1.5]" />
        <span>كتاب التعليمات</span>
```

**النص الجديد:**
```
      <Button variant={variant} icon={iconOnly} title="كتاب التعليمات" onClick={() => setOpen(true)}>
        <BookOpen className="h-3.5 w-3.5 stroke-[1.5]" />
        {!iconOnly && <span>كتاب التعليمات</span>}
```

## الخطوة 3: في الملف `src/components/ImportFontButton.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
export const ImportFontButton: React.FC<{ onImport: (project: FontProject) => void }> = ({ onImport }) => {
```

**النص الجديد:**
```
export const ImportFontButton: React.FC<{ onImport: (project: FontProject) => void; iconOnly?: boolean }> = ({
  onImport,
  iconOnly = false,
}) => {
```

## الخطوة 4: في الملف `src/components/ImportFontButton.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      <Button title="استيراد خط OTF أو TTF كمشروع جديد" disabled={busy} onClick={() => input.current?.click()}>
        <Upload className="h-3.5 w-3.5 stroke-[1.5]" />
        <span>{busy ? 'جارٍ القراءة' : 'استيراد خط'}</span>
```

**النص الجديد:**
```
      <Button
        icon={iconOnly}
        title={busy ? 'جارٍ قراءة الخط' : 'استيراد خط OTF أو TTF كمشروع جديد'}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload className="h-3.5 w-3.5 stroke-[1.5]" />
        {!iconOnly && <span>{busy ? 'جارٍ القراءة' : 'استيراد خط'}</span>}
```

## الخطوة 5: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
            onAddPreset={handleAddPreset}

```

**النص الجديد:**
```
            onAddPreset={handleAddPreset}
            onUpdateInfo={(patch) => store.updateProject(activeProject.id, patch)}

```

## الخطوة 6: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
            onRenameProject={store.renameProject}

```

**النص الجديد:**
```
            onUpdateProject={(id, patch) => store.updateProject(id, patch)}

```

## الخطوة 7: أنشئ الملف `src/components/ui/Pill.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React from 'react';

/** رقم الإصدار: كبسولة أنيقة بنقطة صغيرة. */
export const VersionPill: React.FC<{ version: string; className?: string }> = ({ version, className = '' }) => (
  <span
    dir="ltr"
    title={`الإصدار ${version}`}
    className={`inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-sand/40 px-2.5 py-0.5 font-mono text-[10px] tracking-wide ${className}`}
  >
    <span className="h-1 w-1 rounded-full bg-ink" />
    v{version}
  </span>
);

/** عدّاد صغير بجانب عنوان قسم. */
export const CountChip: React.FC<{ value: number }> = ({ value }) => (
  <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-ink/20 bg-sand/40 px-2 py-0.5 font-mono text-[11px]">
    {value}
  </span>
);

/** شريط تقدّم رفيع. */
export const Progress: React.FC<{ value: number; max: number; className?: string }> = ({ value, max, className = '' }) => {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 overflow-hidden rounded-full bg-ink/10 ${className}`}
    >
      <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
};

```

## الخطوة 8: أنشئ الملف `src/components/GlyphAddModal.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useState } from 'react';
import { type FontProject, type GlyphCategory, type GlyphForm, type NewGlyphData } from '../types/font';
import { defaultGlyphName, defaultUnicode, validateNewGlyph } from '../utils/fontLogic';
import { CATEGORY_LABEL, FORM_LABEL } from '../utils/labels';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

/** إضافة محرف واحد. الاسم والرمز يُملآن تلقائياً من المحرف ما لم تعدّلهما يدوياً. */
export const GlyphAddModal: React.FC<{
  glyphs: FontProject['glyphs'];
  onAdd: (data: NewGlyphData) => void;
  onClose: () => void;
}> = ({ glyphs, onAdd, onClose }) => {
  const [char, setChar] = useState('');
  const [name, setName] = useState('');
  const [unicode, setUnicode] = useState('');
  const [category, setCategory] = useState<GlyphCategory>('letter');
  const [form, setForm] = useState<GlyphForm>('isolated');
  const [auto, setAuto] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onChar = (v: string) => {
    setChar(v);
    setError(null);
    if (auto) {
      setName(defaultGlyphName(v));
      setUnicode(defaultUnicode(v));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: NewGlyphData = {
      char: char.trim(),
      name: name.trim(),
      unicode: unicode.trim().toUpperCase(),
      category,
      form,
    };
    const problem = validateNewGlyph(glyphs, data);
    if (problem) {
      setError(problem);
      return;
    }
    onAdd(data);
    onClose();
  };

  return (
    <Modal title="إضافة محرف جديد" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label htmlFor="g-char" className="mb-1 block text-xs text-ink-soft">المحرف أو الرمز</label>
          <input
            id="g-char"
            autoFocus
            required
            maxLength={4}
            value={char}
            onChange={(e) => onChar(e.target.value)}
            placeholder="مثال: ف"
            className="field font-heading text-base"
          />
        </div>
        <div>
          <label htmlFor="g-name" className="mb-1 block text-xs text-ink-soft">اسم المحرف في الخط</label>
          <input
            id="g-name"
            dir="ltr"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setAuto(false);
              setError(null);
            }}
            placeholder="feh"
            className="field font-mono"
          />
        </div>
        <div>
          <label htmlFor="g-unicode" className="mb-1 block text-xs text-ink-soft">نقطة اليونيكود</label>
          <input
            id="g-unicode"
            dir="ltr"
            value={unicode}
            onChange={(e) => {
              setUnicode(e.target.value);
              setAuto(false);
              setError(null);
            }}
            placeholder="U+0641"
            className="field font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="g-cat" className="mb-1 block text-xs text-ink-soft">التصنيف</label>
            <select id="g-cat" value={category} onChange={(e) => setCategory(e.target.value as GlyphCategory)} className="field">
              {(Object.keys(CATEGORY_LABEL) as GlyphCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="g-form" className="mb-1 block text-xs text-ink-soft">الشكل</label>
            <select id="g-form" value={form} onChange={(e) => setForm(e.target.value as GlyphForm)} className="field">
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
          <Button type="submit" variant="primary">إضافة</Button>
        </ModalActions>
      </form>
    </Modal>
  );
};

```

## الخطوة 9: أنشئ الملف `src/components/ProjectOverview.tsx` (أو استبدل محتواه كاملاً)

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

const Stat: React.FC<{ label: string; value: number; hint?: string }> = ({ label, value, hint }) => (
  <div className="card-flat rounded-2xl p-3.5">
    <span className="block text-[11px] text-ink-soft">{label}</span>
    <span className="font-mono text-2xl leading-tight">{value}</span>
    {hint && <span className="block text-[10px] text-ink-soft">{hint}</span>}
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
      {/* الترويسة */}
      <header className="card-flat flex flex-col justify-between gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="secondary" icon title="الرجوع إلى قائمة المشاريع" onClick={onBackToProjects}>
            <ArrowRight className={icon} />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl sm:text-2xl">{project.name}</h1>
              <VersionPill version={project.version} />
            </div>
            <p className="mt-0.5 truncate text-xs text-ink-soft">
              {project.designer} · <span dir="ltr" className="font-mono">{info.subfamily}</span> · {metrics.upm} وحدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <HelpBookButton iconOnly />
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
          <Button variant="primary" onClick={onOpenExport} title="تصدير الخط">
            <Download className={icon} />
            <span>تصدير</span>
          </Button>
        </div>
      </header>

      {/* إحصائيات */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="المحارف" value={glyphs.length} />
        <Stat label="المكتمل" value={ready} hint="فيه رسم مغلق" />
        <Stat label="الناقص" value={notReadyIds.length} hint="موجود وغير مرسوم" />
        <Stat label="قواعد الميزات" value={rules} />
        <div className="card-flat col-span-2 flex items-center gap-3 rounded-2xl p-3.5 lg:col-span-4">
          <Progress value={ready} max={glyphs.length} className="flex-1" />
          <span className="shrink-0 font-mono text-xs text-ink-soft">
            {glyphs.length ? Math.round((ready / glyphs.length) * 100) : 0}%
          </span>
        </div>
      </section>

      {/* المحارف */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg">المحارف</h2>
            <CountChip value={glyphs.length} />
          </div>
          <div className="flex items-center gap-1.5">
            {!isEmpty && (
              <Dropdown label="ترتيب المحارف" iconOnly icon={<ArrowUpDown className={icon} />} placement="bottom" width={200}>
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
            )}
            {notReadyIds.length > 0 && (
              <Button title={`حذف المحارف غير المرسومة (${notReadyIds.length})`} onClick={() => setConfirmEmpty(true)}>
                <Eraser className={icon} />
                <span className="font-mono text-[11px]">{notReadyIds.length}</span>
              </Button>
            )}
            <Button icon title="مجموعات جاهزة" onClick={() => setShowPreset(true)}>
              <Layers className={icon} />
            </Button>
            <Button variant="primary" icon title="إضافة محرف" onClick={() => setShowAdd(true)}>
              <Plus className={icon} />
            </Button>
          </div>
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

## الخطوة 10: أنشئ الملف `src/components/ProjectsDashboard.tsx` (أو استبدل محتواه كاملاً)

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
      className="card-flat group flex cursor-pointer flex-col justify-between rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:border-ink/45"
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg">{project.name}</h2>
            <p className="mt-0.5 truncate text-[11px] text-ink-soft">
              {project.designer} · <span dir="ltr" className="font-mono">{info.subfamily}</span>
            </p>
          </div>
          <VersionPill version={project.version} />
        </div>

        <div className="mb-3.5 flex min-h-[56px] items-center gap-2 rounded-xl border border-ink/15 bg-sand/20 p-2.5">
          {drawn.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-hidden">
              {drawn.slice(0, 7).map((g) => (
                <GlyphThumb key={g.id} glyph={g} metrics={project.metrics} className="h-9 w-9 shrink-0" />
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-ink-soft">لم يُرسم أي محرف بعد</span>
          )}
        </div>

        <div className="mb-1 flex items-center justify-between text-[11px] text-ink-soft">
          <span>
            المكتمل <span className="font-mono">{drawn.length}</span> من <span className="font-mono">{project.glyphs.length}</span>
          </span>
          <span className="font-mono">{project.metrics.upm}</span>
        </div>
        <Progress value={drawn.length} max={project.glyphs.length} />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-0.5">
          <Button variant="quiet" icon title="تعديل معلومات المشروع" onClick={() => onEdit(project)}>
            <FileText className={icon} />
          </Button>
          <Button variant="quiet" icon title="نسخ المشروع" onClick={() => onDuplicate(project.id)}>
            <Copy className={icon} />
          </Button>
          <Button variant="quiet" icon title="حذف المشروع" onClick={() => onDelete(project)}>
            <Trash2 className={icon} />
          </Button>
        </div>
        <Button variant="secondary" onClick={() => onOpen(project.id)}>
          <span>فتح</span>
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
      <div className="card-flat flex items-center justify-between gap-4 rounded-2xl p-4 sm:p-6">
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

## الخطوة 11: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
