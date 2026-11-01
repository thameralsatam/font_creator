import { useCallback, useEffect, useRef, useState } from 'react';
import { type FontProject, type Glyph, type NewGlyphData } from '../types/font';
import { loadProjectsAsync, requestPersistence, saveProjectsAsync } from '../utils/storage';
import * as logic from '../utils/fontLogic';

const SAVE_DELAY_MS = 400;

/**
 * مخزن المشاريع الوحيد في التطبيق.
 * كل تعديل يمر من هنا، والحفظ المحلي تلقائي (مؤجَّل 400 مللي ثانية).
 */
export function useProjects() {
  const [projects, setProjects] = useState<FontProject[]>([]);
  const [ready, setReady] = useState(false);
  const latest = useRef(projects);
  latest.current = projects;
  const readyRef = useRef(false);
  readyRef.current = ready;

  // التحميل الأول من IndexedDB (والترحيل من التخزين القديم إن لزم)
  useEffect(() => {
    let alive = true;
    void loadProjectsAsync().then((list) => {
      if (!alive) return;
      setProjects(list);
      setReady(true);
      void requestPersistence();
    });
    return () => {
      alive = false;
    };
  }, []);

  // حفظ مؤجَّل بعد كل تغيير (لا يُحفظ شيء قبل اكتمال التحميل حتى لا تُمحى المشاريع بقائمة فارغة)
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => void saveProjectsAsync(projects), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [projects, ready]);

  // حفظ فوري عند إغلاق الصفحة أو إخفائها
  useEffect(() => {
    const flush = () => {
      if (readyRef.current) void saveProjectsAsync(latest.current);
    };
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

  /** يضيف مشروعاً جاهزاً (مستورداً من ملف خط). */
  const importProject = useCallback((project: FontProject) => {
    setProjects((prev) => [project, ...prev]);
  }, []);

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

  /** يضيف عدة محارف دفعة واحدة (مجموعة جاهزة أو نسخة). */
  const addGlyphs = useCallback((projectId: string, glyphs: Glyph[]) => {
    if (glyphs.length === 0) return;
    setProjects((prev) =>
      logic.updateProjectById(prev, projectId, (p) => ({ ...p, glyphs: [...p.glyphs, ...glyphs] }))
    );
  }, []);

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

  const removeGlyphs = useCallback((projectId: string, glyphIds: string[]) => {
    const drop = new Set(glyphIds);
    setProjects((prev) =>
      logic.updateProjectById(prev, projectId, (p) => ({
        ...p,
        glyphs: p.glyphs.filter((g) => !drop.has(g.id)),
      }))
    );
  }, []);

  return {
    projects,
    ready,
    createProject,
    importProject,
    renameProject,
    duplicateProject,
    deleteProject,
    updateProject,
    addGlyph,
    addGlyphs,
    updateGlyph,
    removeGlyph,
    removeGlyphs,
  };
}
