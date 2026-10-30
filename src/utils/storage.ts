import { type FontProject } from '../types/font';

const STORAGE_KEY = 'font-studio:projects:v1';

function looksLikeProject(value: unknown): value is FontProject {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.metrics === 'object' &&
    p.metrics !== null &&
    Array.isArray(p.glyphs) &&
    Array.isArray(p.features)
  );
}

export function loadProjects(): FontProject[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(looksLikeProject) : [];
  } catch {
    return [];
  }
}

/** يعيد false عند الفشل (مثل امتلاء مساحة التخزين) ولا يرمي خطأ. */
export function saveProjects(projects: FontProject[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}
