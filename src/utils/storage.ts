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

/* ============================================================
   IndexedDB: المخزن الأساسي (مساحة كبيرة). التخزين المحلي القديم يُقرأ مرة للترحيل فقط.
   ============================================================ */

const DB_NAME = 'font-studio';
const STORE = 'kv';
const KEY = 'projects';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no indexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** يقرأ المشاريع من IndexedDB. إن لم يوجد شيء بعد يرحّل ما في التخزين المحلي القديم (مرة واحدة). */
export async function loadProjectsAsync(): Promise<FontProject[]> {
  try {
    const db = await openDb();
    const data = await idbGet(db);
    if (Array.isArray(data)) return data.filter(looksLikeProject);
    const legacy = loadProjects();
    if (legacy.length > 0) await idbPut(db, legacy);
    return legacy;
  } catch {
    return loadProjects();
  }
}

/** يحفظ في IndexedDB، وإن تعذّر يعود للتخزين المحلي. يعيد false عند الفشل الكامل. */
export async function saveProjectsAsync(projects: FontProject[]): Promise<boolean> {
  try {
    const db = await openDb();
    await idbPut(db, projects);
    return true;
  } catch {
    return saveProjects(projects);
  }
}

export interface StorageInfo {
  /** ما يستعمله الموقع كله (بايت)، أو null إن لم يدعم المتصفح التقدير. */
  usage: number | null;
  /** الحد الذي يسمح به المتصفح لهذا الموقع. */
  quota: number | null;
  /** هل طلب المتصفح حماية البيانات من المسح التلقائي وقبلها؟ */
  persisted: boolean | null;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  try {
    const est = s?.estimate ? await s.estimate() : undefined;
    const persisted = s?.persisted ? await s.persisted() : null;
    return { usage: est?.usage ?? null, quota: est?.quota ?? null, persisted };
  } catch {
    return { usage: null, quota: null, persisted: null };
  }
}

/** يطلب من المتصفح عدم مسح بيانات الموقع تلقائياً عند ضيق المساحة. */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export function projectsSize(projects: FontProject[]): number {
  try {
    return new Blob([JSON.stringify(projects)]).size;
  } catch {
    return 0;
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ك.ب`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} م.ب`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} ج.ب`;
}
