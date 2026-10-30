import { useState } from 'react';
import { ProjectsDashboard } from './components/ProjectsDashboard';
import { ProjectOverview } from './components/ProjectOverview';
import { StudioScreen } from './components/studio/StudioScreen';
import { MetricsModal } from './components/MetricsModal';
import { ExportModal } from './components/ExportModal';
import { useProjects } from './state/useProjects';
import { type FontMetrics, type NewGlyphData } from './types/font';

export type AppView = 'dashboard' | 'overview' | 'studio';

export default function App() {
  const store = useProjects();
  const { projects } = store;

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selectedGlyphId, setSelectedGlyphId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('dashboard');
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // لا يوجد مشروع افتراضي بديل: إن لم يوجد المشروع المطلوب نبقى في القائمة
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const activeGlyph = activeProject
    ? activeProject.glyphs.find((g) => g.id === selectedGlyphId) ??
      activeProject.glyphs[0] ??
      null
    : null;

  // الشاشة الفعلية: لا نعرض الاستوديو بدون محرف ولا التفاصيل بدون مشروع
  const screen: AppView = !activeProject
    ? 'dashboard'
    : view === 'studio' && !activeGlyph
      ? 'overview'
      : view;

  const handleOpenProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setSelectedGlyphId(null);
    setView('overview');
  };

  const handleCreateProject = (
    name: string,
    designer: string,
    description: string
  ) => {
    const project = store.createProject(name, designer, description);
    handleOpenProject(project.id);
  };

  const handleDeleteProject = (projectId: string) => {
    store.deleteProject(projectId);
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      setSelectedGlyphId(null);
      setIsMetricsOpen(false);
      setIsExportOpen(false);
      setView('dashboard');
    }
  };

  const handleAddGlyph = (data: NewGlyphData) => {
    if (!activeProject) return;
    const glyph = store.addGlyph(activeProject.id, data);
    setSelectedGlyphId(glyph.id);
  };

  const handleEnterStudio = (glyphId?: string) => {
    if (glyphId) setSelectedGlyphId(glyphId);
    setView('studio');
  };

  const handleSaveMetrics = (updates: {
    name: string;
    designer: string;
    version: string;
    metrics: FontMetrics;
  }) => {
    if (!activeProject) return;
    store.updateProject(activeProject.id, updates);
  };

  return (
    <div className="min-h-screen bg-paper text-ink antialiased flex flex-col">
      {screen === 'dashboard' && (
        <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:py-8 md:px-8 animate-view-fade">
          <ProjectsDashboard
            projects={projects}
            onOpenProject={handleOpenProject}
            onCreateProject={handleCreateProject}
            onRenameProject={store.renameProject}
            onDuplicateProject={store.duplicateProject}
            onDeleteProject={handleDeleteProject}
          />
        </div>
      )}

      {screen === 'overview' && activeProject && (
        <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:py-8 md:px-8 animate-view-fade">
          <ProjectOverview
            project={activeProject}
            onBackToProjects={() => setView('dashboard')}
            onEnterStudio={handleEnterStudio}
            onOpenMetrics={() => setIsMetricsOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onAddNewGlyph={handleAddGlyph}
          />
        </div>
      )}

      {screen === 'studio' && activeProject && activeGlyph && (
        <StudioScreen
          project={activeProject}
          glyph={activeGlyph}
          onSelectGlyph={setSelectedGlyphId}
          onBack={() => setView('overview')}
        />
      )}

      {/* تُركَّب النوافذ فقط عند فتحها حتى تبدأ كل مرة بقيم المشروع الحالية */}
      {isMetricsOpen && activeProject && (
        <MetricsModal
          key={activeProject.id}
          isOpen
          onClose={() => setIsMetricsOpen(false)}
          project={activeProject}
          onSave={handleSaveMetrics}
        />
      )}

      {isExportOpen && activeProject && (
        <ExportModal
          isOpen
          onClose={() => setIsExportOpen(false)}
          project={activeProject}
        />
      )}
    </div>
  );
}
