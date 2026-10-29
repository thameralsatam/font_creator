import React, { useState } from 'react';
import { ProjectsDashboard } from './components/ProjectsDashboard';
import { ProjectOverview } from './components/ProjectOverview';
import { GlyphStudioFullscreen } from './components/GlyphStudioFullscreen';
import { MetricsModal } from './components/MetricsModal';
import { ExportModal } from './components/ExportModal';
import { INITIAL_PROJECTS, INITIAL_FONT_PROJECT } from './data/initialFont';
import { FontProject, Glyph, Layer, AnchorPoint, FontMetrics } from './types/font';
import {
  toggleLayerVisibility,
  toggleLayerLock,
  updateGlyphBearings,
  renameProject,
  deleteProject,
  duplicateProject,
} from './utils/fontLogic';

export type AppView = 'dashboard' | 'overview' | 'studio';

export default function App() {
  const [projects, setProjects] = useState<FontProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedGlyphId, setSelectedGlyphId] = useState<string>('glyph-alif');

  // Modals
  const [isMetricsOpen, setIsMetricsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Active Project (if any exists)
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || null;

  // Active Glyph
  const activeGlyph = activeProject
    ? activeProject.glyphs.find((g) => g.id === selectedGlyphId) || activeProject.glyphs[0]
    : null;

  // Project CRUD Actions
  const handleOpenProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setCurrentView('overview');
  };

  const handleCreateProject = (name: string, designer: string, description: string) => {
    const newProj: FontProject = {
      id: `font-custom-${Date.now()}`,
      name,
      designer: designer || 'المصمم',
      description,
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      metrics: {
        upm: 1000,
        ascender: 800,
        capHeight: 700,
        xHeight: 500,
        baseline: 0,
        descender: -200,
      },
      layers: [
        {
          id: 'layer-contours',
          name: 'مسار المحرف (Contour)',
          description: 'المنحنيات والمتجهات الرئيسية لجسم الحرف',
          isVisible: true,
          isLocked: false,
          color: '#183630',
          opacity: 1.0,
        },
        {
          id: 'layer-anchors',
          name: 'نقاط الارتكاز (Anchors)',
          description: 'شواهد تموضع حركات التشكيل والنقاط العلوية والسفلية',
          isVisible: true,
          isLocked: false,
          color: '#E5C690',
          opacity: 1.0,
        },
        {
          id: 'layer-metrics',
          name: 'المقاييس الإرشادية (Metrics)',
          description: 'خطوط الصاعد، الارتفاع، خط الأساس والهابط',
          isVisible: true,
          isLocked: true,
          color: '#183630',
          opacity: 0.35,
        },
        {
          id: 'layer-grid',
          name: 'شبكة الموديول (Metric Grid)',
          description: 'شبكة تقسيم مربعات القياس الدقيقة',
          isVisible: true,
          isLocked: true,
          color: '#183630',
          opacity: 0.12,
        },
      ],
      features: [],
      glyphs: [], // completely empty and zeroed out as requested
    };
    setProjects([newProj, ...projects]);
    setActiveProjectId(newProj.id);
    setCurrentView('overview');
  };

  const handleRenameProject = (projectId: string, newName: string) => {
    setProjects(renameProject(projects, projectId, newName));
  };

  const handleDuplicateProject = (projectId: string) => {
    setProjects(duplicateProject(projects, projectId));
  };

  const handleDeleteProject = (projectId: string) => {
    const updated = deleteProject(projects, projectId);
    setProjects(updated);
    if (activeProjectId === projectId) {
      setActiveProjectId(updated[0]?.id || '');
      if (updated.length === 0) {
        setCurrentView('dashboard');
      }
    }
  };

  // Studio Layer & Bearing Actions
  const handleToggleLayerVisibility = (layerId: string) => {
    if (!activeProject) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? { ...p, layers: toggleLayerVisibility(p.layers, layerId) }
          : p
      )
    );
  };

  const handleToggleLayerLock = (layerId: string) => {
    if (!activeProject) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? { ...p, layers: toggleLayerLock(p.layers, layerId) }
          : p
      )
    );
  };

  const handleUpdateGlyphBearings = (changes: {
    lsb?: number;
    rsb?: number;
    advanceWidth?: number;
  }) => {
    if (!activeProject || !activeGlyph) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              glyphs: p.glyphs.map((g) =>
                g.id === activeGlyph.id ? updateGlyphBearings(g, changes) : g
              ),
            }
          : p
      )
    );
  };

  const handleAddAnchor = (anchorData: Omit<AnchorPoint, 'id'>) => {
    if (!activeProject || !activeGlyph) return;
    const newAnchor: AnchorPoint = {
      ...anchorData,
      id: `anchor-${Date.now()}`,
    };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              glyphs: p.glyphs.map((g) =>
                g.id === activeGlyph.id
                  ? { ...g, anchors: [...g.anchors, newAnchor] }
                  : g
              ),
            }
          : p
      )
    );
  };

  const handleRemoveAnchor = (anchorId: string) => {
    if (!activeProject || !activeGlyph) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              glyphs: p.glyphs.map((g) =>
                g.id === activeGlyph.id
                  ? { ...g, anchors: g.anchors.filter((a) => a.id !== anchorId) }
                  : g
              ),
            }
          : p
      )
    );
  };

  const handleAddNewGlyph = (newGlyphData: {
    char: string;
    name: string;
    unicode: string;
    category: Glyph['category'];
  }) => {
    const newGlyph: Glyph = {
      id: `glyph-${Date.now()}`,
      char: newGlyphData.char,
      name: newGlyphData.name,
      unicode: newGlyphData.unicode,
      category: newGlyphData.category,
      advanceWidth: 480,
      lsb: 40,
      rsb: 40,
      contours: [
        {
          id: `contour-${Date.now()}`,
          closed: true,
          svgPath: 'M 100 0 L 220 0 L 220 500 L 100 500 Z',
          points: [
            { id: 'p1', x: 100, y: 0, type: 'move' },
            { id: 'p2', x: 220, y: 0, type: 'line' },
            { id: 'p3', x: 220, y: 500, type: 'line' },
            { id: 'p4', x: 100, y: 500, type: 'line' },
          ],
        },
      ],
      anchors: [{ id: `a-${Date.now()}`, name: 'top', x: 160, y: 550 }],
    };

    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? { ...p, glyphs: [...p.glyphs, newGlyph] }
          : p
      )
    );
    setSelectedGlyphId(newGlyph.id);
  };

  const handleSaveMetrics = (updates: {
    name: string;
    designer: string;
    version: string;
    metrics: FontMetrics;
  }) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id
          ? {
              ...p,
              name: updates.name,
              designer: updates.designer,
              version: updates.version,
              metrics: updates.metrics,
            }
          : p
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#EDE6D8] text-[#183630] font-sans antialiased flex flex-col">
      {/* View 1: Projects Dashboard */}
      {currentView === 'dashboard' && (
        <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:py-8 md:px-8 animate-view-fade">
          <ProjectsDashboard
            projects={projects}
            onOpenProject={handleOpenProject}
            onCreateProject={handleCreateProject}
            onRenameProject={handleRenameProject}
            onDuplicateProject={handleDuplicateProject}
            onDeleteProject={handleDeleteProject}
          />
        </div>
      )}

      {/* View 2: Project Overview & Proofing */}
      {currentView === 'overview' && activeProject && (
        <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:py-8 md:px-8 animate-view-fade">
          <ProjectOverview
            project={activeProject}
            onBackToProjects={() => setCurrentView('dashboard')}
            onEnterStudio={(glyphId) => {
              if (glyphId) setSelectedGlyphId(glyphId);
              setCurrentView('studio');
            }}
            onOpenMetrics={() => setIsMetricsOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            onAddNewGlyph={handleAddNewGlyph}
          />
        </div>
      )}

      {/* View 3: Full-Screen Drawing Studio */}
      {currentView === 'studio' && activeProject && (
        <div className="animate-view-fade">
          <GlyphStudioFullscreen
            project={activeProject}
            glyph={activeGlyph || {
              id: 'glyph-init',
              char: 'ا',
              name: 'alif',
              unicode: 'U+0627',
              category: 'letter',
              advanceWidth: 300,
              lsb: 40,
              rsb: 40,
              contours: [],
              anchors: [],
            }}
            onSelectGlyph={setSelectedGlyphId}
            onBackToProject={() => setCurrentView('overview')}
            layers={activeProject.layers}
            onToggleLayerVisibility={handleToggleLayerVisibility}
            onToggleLayerLock={handleToggleLayerLock}
            onUpdateGlyphBearings={handleUpdateGlyphBearings}
            onAddAnchor={handleAddAnchor}
            onRemoveAnchor={handleRemoveAnchor}
            onOpenExport={() => setIsExportOpen(true)}
          />
        </div>
      )}

      {/* Modals */}
      {activeProject && (
        <>
          <MetricsModal
            isOpen={isMetricsOpen}
            onClose={() => setIsMetricsOpen(false)}
            project={activeProject}
            onSave={handleSaveMetrics}
          />

          <ExportModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            project={activeProject}
          />
        </>
      )}
    </div>
  );
}
