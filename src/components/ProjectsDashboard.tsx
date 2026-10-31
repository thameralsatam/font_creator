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
