import React, { useMemo, useState } from 'react';
import { BookOpen, Copy, FileText, FolderPlus, HardDrive, PenTool, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { type FontProject } from '../types/font';
import { resolveInfo } from '../utils/fontInfo';
import { isReady } from '../utils/glyphLogic';
import { FontInfoModal, type InfoPatch } from './FontInfoModal';
import { GlyphThumb } from './GlyphThumb';
import { HelpBook } from './help/HelpBook';
import { StorageModal } from './StorageModal';
import { ImportFontButton } from './ImportFontButton';
import { Button } from './ui/Button';
import { CardMenu } from './ui/CardMenu';
import { Dropdown, MenuItem, MenuLabel } from './ui/Dropdown';
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
    <article onClick={() => onOpen(project.id)} className="capsule relative flex cursor-pointer flex-col gap-2.5 p-3 sm:p-4">
      <div className="plate flex h-12 sm:h-14 items-center gap-1 overflow-hidden px-2.5">
        {drawn.length > 0 ? (
          drawn.slice(0, 8).map((g) => (
            <GlyphThumb key={g.id} glyph={g} metrics={project.metrics} className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
          ))
        ) : (
          <span className="text-[11px] text-ink-soft">لم يُرسم أي محرف بعد</span>
        )}
      </div>

      <div className="flex items-center gap-2 px-0.5">
        <h2 className="min-w-0 flex-1 truncate text-base sm:text-lg" title={project.name}>{project.name}</h2>
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

      <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
        <VersionPill version={project.version} />
        <span dir="ltr" className="chip chip-ghost font-mono">{info.subfamily}</span>
        <span className="chip chip-ghost min-w-0 max-w-full truncate" title={project.designer}>{project.designer}</span>
      </div>

      <div className="flex items-center gap-1 border-t border-ink/10 pt-2 text-[10px] sm:text-[11px] text-ink-soft">
        <span className="chip"><span className="font-mono">{drawn.length}</span> مكتمل</span>
        <span className="chip chip-ghost"><span className="font-mono">{project.glyphs.length - drawn.length}</span> ناقص</span>
        <span className="chip chip-ghost ms-auto"><span className="font-mono">{project.glyphs.length}</span> محرف</span>
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
  const [showHelp, setShowHelp] = useState(false);
  const [showStorage, setShowStorage] = useState(false);

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
          <Dropdown label="الإعدادات" iconOnly framed icon={<Settings2 className={icon} />} placement="bottom" width={220}>
            {(close) => (
              <>
                <MenuLabel>الموقع</MenuLabel>
                <MenuItem
                  label="كتاب التعليمات"
                  icon={<BookOpen className={icon} />}
                  onClick={() => {
                    close();
                    setShowHelp(true);
                  }}
                />
                <MenuItem
                  label="التخزين"
                  icon={<HardDrive className={icon} />}
                  onClick={() => {
                    close();
                    setShowStorage(true);
                  }}
                />
              </>
            )}
          </Dropdown>
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

      {showHelp && <HelpBook onClose={() => setShowHelp(false)} />}
      {showStorage && <StorageModal projects={projects} onClose={() => setShowStorage(false)} />}

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
