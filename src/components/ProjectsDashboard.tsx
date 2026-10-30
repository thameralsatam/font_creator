import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit3,
  FolderPlus,
  PenTool,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { type FontProject } from '../types/font';
import { AnimatedCounter } from './AnimatedCounter';
import { GlyphThumb } from './GlyphThumb';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface ProjectsDashboardProps {
  projects: FontProject[];
  onOpenProject: (projectId: string) => void;
  onCreateProject: (name: string, designer: string, description: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onRenameProject,
  onDuplicateProject,
  onDeleteProject,
}) => {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
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

  const submitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (renaming && renaming.name.trim()) {
      onRenameProject(renaming.id, renaming.name);
      setRenaming(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* اللافتة العلوية */}
      <div className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-6 sm:p-8 md:flex-row md:items-center">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs opacity-85">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-ink/20 bg-sand/35">
              <PenTool className="h-3.5 w-3.5 stroke-[1.5]" />
            </span>
            <span>استوديو هندسة وتصميم الخطوط الطباعية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl">مشاريع الخطوط</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed opacity-80 sm:text-sm">
            مساحة هادئة لرسم المحارف وضبط المقاييس وبرمجة قواعد التبديل السياقي.
          </p>
        </div>

        {/* لا يظهر هنا عند عدم وجود مشاريع حتى لا يتكرر مع الحالة الفارغة */}
        {hasProjects && (
          <Button variant="primary" className="self-start md:self-auto" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 stroke-[1.5]" />
            <span>مشروع خط جديد</span>
          </Button>
        )}
      </div>

      {hasProjects ? (
        <>
          <div className="glass-panel flex flex-col justify-between gap-3 rounded-2xl p-3 px-4 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute end-auto start-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[1.5] opacity-50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم الخط أو المصمم أو الوصف"
                aria-label="بحث في المشاريع"
                className="field ps-9"
              />
            </div>
            <div className="flex items-center gap-2 px-1 text-xs opacity-85">
              <span>إجمالي المشاريع:</span>
              <AnimatedCounter value={projects.length} duration={900} className="font-mono text-sm" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm opacity-70">لا توجد مشاريع تطابق بحثك.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project) => (
                <article
                  key={project.id}
                  onClick={() => onOpenProject(project.id)}
                  className="glass-panel group flex cursor-pointer flex-col justify-between rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-ink/45 hover:shadow-md"
                >
                  <div>
                    <div className="mb-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg">{project.name}</h2>
                        <p className="mt-0.5 text-[11px] opacity-75">
                          المصمم: {project.designer} · الإصدار {project.version}
                        </p>
                      </div>
                      <span className="rounded-lg border border-ink/15 bg-sand/35 px-2 py-0.5 font-mono text-[10px]">
                        {project.metrics.upm} UPM
                      </span>
                    </div>

                    <p className="mb-3.5 line-clamp-2 min-h-[34px] text-xs leading-relaxed opacity-80">
                      {project.description || 'مشروع خط عربي طباعي قيد التطوير.'}
                    </p>

                    <div className="mb-4 flex min-h-[54px] items-center gap-2 rounded-xl border border-ink/15 bg-sand/20 p-2.5">
                      {project.glyphs.length > 0 ? (
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {project.glyphs.slice(0, 6).map((g) => (
                            <GlyphThumb key={g.id} glyph={g} metrics={project.metrics} className="h-8 w-8 shrink-0" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] opacity-65">لا توجد محارف مرسومة بعد</span>
                      )}
                      <span className="ms-auto whitespace-nowrap text-[11px] opacity-75">
                        {project.glyphs.length} محرف
                      </span>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between border-t border-ink/10 pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="quiet"
                        icon
                        title="إعادة تسمية المشروع"
                        onClick={() => setRenaming({ id: project.id, name: project.name })}
                      >
                        <Edit3 className="h-3.5 w-3.5 stroke-[1.5]" />
                      </Button>
                      <Button variant="quiet" icon title="تكرار المشروع كنسخة" onClick={() => onDuplicateProject(project.id)}>
                        <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
                      </Button>
                      <Button variant="quiet" icon title="حذف المشروع" onClick={() => setDeleting(project)}>
                        <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                      </Button>
                    </div>

                    <Button variant="secondary" onClick={() => onOpenProject(project.id)}>
                      <span>فتح الخط</span>
                      <ArrowLeft className="h-3.5 w-3.5 stroke-[1.5]" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel mx-auto my-6 flex w-full max-w-lg flex-col items-center rounded-2xl p-10 text-center sm:p-14">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/20 bg-sand/35">
            <FolderPlus className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h2 className="mb-2 text-xl">لا توجد مشاريع خطوط حتى الآن</h2>
          <p className="mb-6 max-w-md text-xs leading-relaxed opacity-75 sm:text-sm">
            ابدأ مشروع خطك الأول، ثم ارسم المحارف واضبط المقاييس وابنِ منها خطاً حقيقياً.
          </p>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 stroke-[1.5]" />
            <span>إنشاء مشروع خط جديد</span>
          </Button>
        </div>
      )}

      {showCreate && (
        <Modal title="إنشاء مشروع خط جديد" onClose={closeCreate}>
          <form onSubmit={submitCreate} className="space-y-3.5">
            <div>
              <label htmlFor="new-name" className="mb-1 block text-xs opacity-85">اسم الخط</label>
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
              <label htmlFor="new-designer" className="mb-1 block text-xs opacity-85">المصمم أو الاستوديو</label>
              <input
                id="new-designer"
                value={newDesigner}
                onChange={(e) => setNewDesigner(e.target.value)}
                placeholder="المصمم"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="new-desc" className="mb-1 block text-xs opacity-85">وصف مختصر</label>
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

      {renaming && (
        <Modal title="إعادة تسمية المشروع" size="sm" onClose={() => setRenaming(null)}>
          <form onSubmit={submitRename}>
            <input
              autoFocus
              required
              aria-label="الاسم الجديد"
              value={renaming.name}
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              className="field"
            />
            <ModalActions>
              <Button onClick={() => setRenaming(null)}>إلغاء</Button>
              <Button type="submit" variant="primary">حفظ الاسم</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="تأكيد حذف المشروع" size="sm" onClose={() => setDeleting(null)}>
          <p className="text-xs leading-relaxed opacity-85">
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
