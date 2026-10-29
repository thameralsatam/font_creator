import React, { useState } from 'react';
import {
  PenTool,
  Plus,
  Search,
  FolderPlus,
  Edit3,
  Copy,
  Trash2,
  ArrowLeft,
  X,
  Check,
} from 'lucide-react';
import { FontProject } from '../types/font';
import { AnimatedCounter } from './AnimatedCounter';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // New Project Form
  const [newName, setNewName] = useState('');
  const [newDesigner, setNewDesigner] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const hasProjects = projects.length > 0;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateProject(newName.trim(), newDesigner.trim() || 'المصمم', newDesc.trim());
    setNewName('');
    setNewDesigner('');
    setNewDesc('');
    setShowCreateModal(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject && editingProject.name.trim()) {
      onRenameProject(editingProject.id, editingProject.name.trim());
      setEditingProject(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner - Clean and without button duplication */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#183630]/20 bg-[#E5C690]/35 text-[#183630]">
              <PenTool className="h-3.5 w-3.5 stroke-[1.5]" />
            </span>
            <span className="text-xs font-light tracking-wide text-[#183630]/85">
              استوديو هندسة وتصميم الخطوط الطباعية
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-normal text-[#183630]">
            مشاريع الخطوط
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-light text-[#183630]/80 max-w-xl leading-relaxed">
            مساحة هادئة لرسم المحارف وضبط المقاييس والشواهد وبرمجة قواعد التبديل السياقي.
          </p>
        </div>

        {/* Button shown ONLY when projects exist, preventing any duplication with empty state */}
        {hasProjects && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="self-start md:self-auto flex items-center gap-2 rounded-xl border border-[#183630] bg-[#183630] px-4 py-2.5 text-xs font-light text-[#EDE6D8] shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4 stroke-[1.5]" />
            <span>مشروع خط جديد</span>
          </button>
        )}
      </div>

      {/* Projects List View */}
      {hasProjects ? (
        <>
          {/* Integrated, Harmonious Search & Stats Bar */}
          <div className="glass-panel rounded-2xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-[1.5] text-[#183630]/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث في المشاريع باسم الخط أو الوصف..."
                className="w-full rounded-xl border border-[#183630]/15 bg-[#EDE6D8]/60 pr-9 pl-4 py-2 text-xs font-light text-[#183630] placeholder-[#183630]/45 focus:outline-none focus:border-[#183630]/40 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-light text-[#183630]/80 px-1">
              <span>إجمالي المشاريع:</span>
              <AnimatedCounter
                value={projects.length}
                duration={1400}
                className="font-mono font-medium text-[#183630] text-sm"
              />
            </div>
          </div>

          {/* Projects Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                className="glass-panel group rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:border-[#183630]/45 hover:-translate-y-1 hover:shadow-md"
              >
                <div>
                  {/* Header inside Card */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex-1">
                      <h2 className="font-heading text-lg font-normal text-[#183630] transition-colors">
                        {project.name}
                      </h2>
                      <p className="text-[11px] font-light text-[#183630]/75 mt-0.5">
                        المصمم: {project.designer || 'المصمم'} • إصدار v{project.version}
                      </p>
                    </div>

                    <span className="rounded-lg border border-[#183630]/15 bg-[#E5C690]/35 px-2 py-0.5 text-[10px] font-mono font-medium text-[#183630]">
                      <AnimatedCounter value={project.metrics.upm} duration={1400} suffix=" UPM" />
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs font-light text-[#183630]/80 line-clamp-2 min-h-[34px] leading-relaxed mb-3.5">
                    {project.description || 'مشروع خط عربي طباعي قيد التطوير والرسم الهندسي.'}
                  </p>

                  {/* Glyphs Ribbon Preview */}
                  <div className="flex items-center gap-1.5 p-2.5 rounded-xl border border-[#183630]/15 bg-[#E5C690]/20 mb-4 min-h-[46px]">
                    {project.glyphs.length > 0 ? (
                      <div className="flex items-center gap-2 overflow-hidden px-1">
                        {project.glyphs.slice(0, 6).map((g) => (
                          <span
                            key={g.id}
                            className="font-heading text-xl font-normal text-[#183630] min-w-[22px] text-center"
                          >
                            {g.char}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] font-light text-[#183630]/65 px-1">
                        لا توجد محارف مرسومة بعد
                      </span>
                    )}
                    <span className="mr-auto text-[11px] font-light text-[#183630]/75 whitespace-nowrap">
                      <AnimatedCounter value={project.glyphs.length} duration={1200} suffix=" محرف" />
                    </span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-[#183630]/10 text-xs">
                  {/* Project Management Action Icons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProject({ id: project.id, name: project.name });
                      }}
                      className="p-1.5 rounded-lg text-[#183630]/75 hover:text-[#183630] hover:bg-[#E5C690]/35 transition-colors"
                      title="إعادة تسمية المشروع"
                      aria-label={`إعادة تسمية ${project.name}`}
                    >
                      <Edit3 className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateProject(project.id);
                      }}
                      className="p-1.5 rounded-lg text-[#183630]/75 hover:text-[#183630] hover:bg-[#E5C690]/35 transition-colors"
                      title="تكرار المشروع كنسخة"
                      aria-label={`تكرار مشروع ${project.name}`}
                    >
                      <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(project.id);
                      }}
                      className="p-1.5 rounded-lg text-[#183630]/65 hover:text-[#183630] hover:bg-[#E5C690]/35 transition-colors"
                      title="حذف المشروع"
                      aria-label={`حذف مشروع ${project.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                    </button>
                  </div>

                  {/* Open Project CTA */}
                  <span className="flex items-center gap-1.5 rounded-xl border border-[#183630]/20 bg-[#EDE6D8] px-3 py-1.5 font-light text-[#183630] group-hover:border-[#183630] group-hover:bg-[#183630] group-hover:text-[#EDE6D8] transition-all">
                    <span>فتح الخط</span>
                    <ArrowLeft className="h-3.5 w-3.5 stroke-[1.5]" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Peaceful, Uncluttered Empty State with ONLY ONE clean action button */
        <div className="glass-panel rounded-2xl p-10 sm:p-14 flex flex-col items-center justify-center text-center shadow-xs max-w-lg mx-auto w-full my-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#183630]/20 bg-[#E5C690]/35 text-[#183630] mb-4">
            <FolderPlus className="h-6 w-6 stroke-[1.5]" />
          </div>

          <h2 className="font-heading text-xl font-normal text-[#183630] mb-2">
            لا توجد مشاريع خطوط حتى الآن
          </h2>
          <p className="text-xs sm:text-sm font-light text-[#183630]/75 max-w-md leading-relaxed mb-6">
            ابدأ مشروع خطك الطباعي الأول برسم المحارف وضبط المقاييس وشواهد التشكيل وقواعد التبديل.
          </p>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-[#183630] px-5 py-2.5 text-xs font-light text-[#EDE6D8] shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4 stroke-[1.5]" />
            <span>إنشاء مشروع خط جديد</span>
          </button>
        </div>
      )}

      {/* Modal: Create New Project with Smooth Animations */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183630]/35 backdrop-blur-sm p-4 animate-backdrop-fade">
          <div className="w-full max-w-md rounded-3xl border border-[#183630]/20 bg-[#EDE6D8] p-6 shadow-2xl animate-modal-enter">
            <div className="flex items-center justify-between pb-3 border-b border-[#183630]/15">
              <h3 className="font-heading text-base font-normal text-[#183630]">
                إنشاء مشروع خط جديد
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[#183630]/60 hover:text-[#183630] hover:bg-[#E5C690]/30 transition-colors"
              >
                <X className="h-4 w-4 stroke-[1.5]" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-light text-[#183630]/85 mb-1">
                  اسم الخط:
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: خط الياقوت العربي"
                  className="w-full rounded-xl border border-[#183630]/25 bg-transparent px-3 py-2 text-xs font-light text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/85 mb-1">
                  اسم المصمم / الاستوديو:
                </label>
                <input
                  type="text"
                  value={newDesigner}
                  onChange={(e) => setNewDesigner(e.target.value)}
                  placeholder="المصمم"
                  className="w-full rounded-xl border border-[#183630]/25 bg-transparent px-3 py-2 text-xs font-light text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/85 mb-1">
                  وصف مختصر عن طبيعة واستخدام الخط:
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="خط نصي وعناوين بهندسة متزنة..."
                  className="w-full rounded-xl border border-[#183630]/25 bg-transparent px-3 py-2 text-xs font-light text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#183630]/15">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-[#183630]/20 px-3.5 py-1.5 text-xs font-light text-[#183630] hover:bg-[#E5C690]/25 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-[#183630] px-4 py-1.5 text-xs font-light text-[#EDE6D8] hover:opacity-90 transition-opacity"
                >
                  <Check className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>بدء المشروع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename Project */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183630]/35 backdrop-blur-sm p-4 animate-backdrop-fade">
          <div className="w-full max-w-sm rounded-3xl border border-[#183630]/20 bg-[#EDE6D8] p-5 shadow-2xl animate-modal-enter">
            <h3 className="font-heading text-sm font-normal text-[#183630] mb-3">
              إعادة تسمية المشروع
            </h3>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <input
                type="text"
                required
                value={editingProject.name}
                onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                className="w-full rounded-xl border border-[#183630]/25 bg-transparent px-3 py-2 text-xs font-light text-[#183630] focus:outline-none focus:border-[#183630]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="rounded-xl border border-[#183630]/20 px-3 py-1.5 text-xs font-light text-[#183630]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#183630] px-4 py-1.5 text-xs font-light text-[#EDE6D8]"
                >
                  حفظ الاسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183630]/35 backdrop-blur-sm p-4 animate-backdrop-fade">
          <div className="w-full max-w-sm rounded-3xl border border-[#183630]/20 bg-[#EDE6D8] p-5 shadow-2xl animate-modal-enter">
            <h3 className="font-heading text-sm font-normal text-[#183630] mb-2">
              تأكيد حذف المشروع
            </h3>
            <p className="text-xs font-light text-[#183630]/80 leading-relaxed mb-4">
              هل أنت متأكد من حذف هذا المشروع نهائياً؟ لن يمكن استرجاع مسارات المحارف المحذوفة.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="rounded-xl border border-[#183630]/20 px-3 py-1.5 text-xs font-light text-[#183630]"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="rounded-xl bg-[#183630] px-4 py-1.5 text-xs font-light text-[#EDE6D8]"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
