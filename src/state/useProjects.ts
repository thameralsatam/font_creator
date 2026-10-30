import { useCallback, useEffect, useRef, useState } from 'react';
import { type FontProject, type Glyph, type NewGlyphData } from '../types/font';
import { loadProjects, saveProjects } from '../utils/storage';
import * as logic from '../utils/fontLogic';

const SAVE_DELAY_MS = 400;

/**
 * مخزن المشاريع الوحيد في التطبيق.
 * كل تعديل يمر من هنا، والحفظ المحلي تلقائي (مؤجَّل 400 مللي ثانية).
 */
export function useProjects() {
  const [projects, setProjects] = useState<FontProject[]>(() => loadProjects());
  const latest = useRef(projects);
  latest.current = projects;

  // حفظ مؤجَّل بعد كل تغيير
  useEffect(() => {
    const timer = window.setTimeout(() => saveProjects(projects), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [projects]);

  // حفظ فوري عند إغلاق الصفحة أو إخفائها
  useEffect(() => {
    const flush = () => saveProjects(latest.current);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const createProject = useCallback(
    (name: string, designer: string, description: string): FontProject => {
      const project = logic.createProject(name, designer, description);
      setProjects((prev) => [project, ...prev]);
      return project;
    },
    []
  );

  const renameProject = useCallback((id: string, name: string) => {
    setProjects((prev) => logic.renameProject(prev, id, name));
  }, []);

  const duplicateProject = useCallback((id: string) => {
    setProjects((prev) => logic.duplicateProject(prev, id));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => logic.deleteProject(prev, id));
  }, []);

  const updateProject = useCallback(
    (id: string, patch: Partial<Omit<FontProject, 'id'>>) => {
      setProjects((prev) =>
        logic.updateProjectById(prev, id, (p) => ({ ...p, ...patch }))
      );
    },
    []
  );

  const addGlyph = useCallback(
    (projectId: string, data: NewGlyphData): Glyph => {
      const glyph = logic.createGlyph(data);
      setProjects((prev) =>
        logic.updateProjectById(prev, projectId, (p) => ({
          ...p,
          glyphs: [...p.glyphs, glyph],
        }))
      );
      return glyph;
    },
    []
  );

  const updateGlyph = useCallback(
    (projectId: string, glyphId: string, updater: (glyph: Glyph) => Glyph) => {
      setProjects((prev) =>
        logic.updateProjectById(prev, projectId, (p) => ({
          ...p,
          glyphs: p.glyphs.map((g) => (g.id === glyphId ? updater(g) : g)),
        }))
      );
    },
    []
  );

  const removeGlyph = useCallback((projectId: string, glyphId: string) => {
    setProjects((prev) =>
      logic.updateProjectById(prev, projectId, (p) => ({
        ...p,
        glyphs: p.glyphs.filter((g) => g.id !== glyphId),
      }))
    );
  }, []);

  return {
    projects,
    createProject,
    renameProject,
    duplicateProject,
    deleteProject,
    updateProject,
    addGlyph,
    updateGlyph,
    removeGlyph,
  };
}
