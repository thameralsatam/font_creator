import { useState } from 'react';
import { ProjectsDashboard } from './components/ProjectsDashboard';
import { ProjectOverview } from './components/ProjectOverview';
import { StudioScreen } from './components/studio/StudioScreen';
import { MetricsModal } from './components/MetricsModal';
import { ExportModal } from './components/ExportModal';
import { useProjects } from './state/useProjects';
import { type FontMetrics, type NewGlyphData } from './types/font';
import { createGlyph } from './utils/fontLogic';
import { applyGlyphMeta, duplicateGlyph, type GlyphMeta } from './utils/glyphLogic';

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

  const handleEditGlyph = (glyphId: string, meta: GlyphMeta) => {
    if (!activeProject) return;
    store.updateGlyph(activeProject.id, glyphId, (g) => applyGlyphMeta(g, meta));
  };

  const handleDeleteGlyph = (glyphId: string) => {
    if (!activeProject) return;
    store.removeGlyph(activeProject.id, glyphId);
    if (selectedGlyphId === glyphId) setSelectedGlyphId(null);
  };

  const handleDeleteGlyphs = (ids: string[]) => {
    if (!activeProject) return;
    store.removeGlyphs(activeProject.id, ids);
    if (selectedGlyphId && ids.includes(selectedGlyphId)) setSelectedGlyphId(null);
  };

  const handleDuplicateGlyph = (glyphId: string) => {
    if (!activeProject) return;
    const copy = duplicateGlyph(activeProject.glyphs, glyphId);
    if (copy) store.addGlyphs(activeProject.id, [copy]);
  };

  const handleAddPreset = (items: NewGlyphData[]) => {
    if (!activeProject) return;
    store.addGlyphs(activeProject.id, items.map(createGlyph));
  };

  const handleEnterStudio = (glyphId?: string) => {
    if (glyphId) setSelectedGlyphId(glyphId);
    setView('studio');
  };

  const handleSaveMetrics = (updates: { metrics: FontMetrics }) => {
    if (!activeProject) return;
    store.updateProject(activeProject.id, updates);
  };

  return (
    <div className="min-h-screen bg-paper text-ink antialiased flex flex-col">
      {screen === 'dashboard' && (
        <div className="flex-1 mx-auto w-full max-w-7xl px-2.5 py-3 sm:px-4 sm:py-6 md:px-8 animate-view-fade">
          <ProjectsDashboard
            projects={projects}
            onOpenProject={handleOpenProject}
            onCreateProject={handleCreateProject}
            onUpdateProject={(id, patch) => store.updateProject(id, patch)}
            onDuplicateProject={store.duplicateProject}
            onDeleteProject={handleDeleteProject}
            onImportProject={store.importProject}
          />
        </div>
      )}

      {screen === 'overview' && activeProject && (
        <div className="flex-1 mx-auto w-full max-w-7xl px-2.5 py-3 sm:px-4 sm:py-6 md:px-8 animate-view-fade">
          <ProjectOverview
            project={activeProject}
            onBackToProjects={() => setView('dashboard')}
            onEnterStudio={handleEnterStudio}
            onOpenMetrics={() => setIsMetricsOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onAddNewGlyph={handleAddGlyph}
            onAddPreset={handleAddPreset}
            onUpdateInfo={(patch) => store.updateProject(activeProject.id, patch)}
            onEditGlyph={handleEditGlyph}
            onDeleteGlyph={handleDeleteGlyph}
            onDeleteGlyphs={handleDeleteGlyphs}
            onDuplicateGlyph={handleDuplicateGlyph}
          />
        </div>
      )}

      {screen === 'studio' && activeProject && activeGlyph && (
        <StudioScreen
          project={activeProject}
          glyph={activeGlyph}
          onSelectGlyph={setSelectedGlyphId}
          onUpdateGlyph={(updater) => store.updateGlyph(activeProject.id, activeGlyph.id, updater)}
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
