# الملف ٣ — الهندسة والتخزين المحلي

هذا الملف يضيف حسابات المسارات والتكبير، والحفظ التلقائي في المتصفح، والمخزن المركزي للمشاريع. **لا تشغّل `npm run build` ولا `npm run lint` في هذا الملف.**

## قواعد عامة (تنطبق على كل الملفات)

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- انسخ المحتوى داخل كل كتلة كود كما هو بالضبط، بدون تغيير حرف واحد وبدون تعليقات إضافية.
- الأمر "أنشئ الملف" يعني: أنشئه، وإن كان موجوداً مسبقاً استبدل محتواه بالكامل. أنشئ المجلدات الناقصة.
- لا تلمس أي ملف غير مذكور. لا تحذف ولا تنقل ولا تعيد تسمية أي ملف إلا إذا طُلب صراحة.
- إذا ظهر خطأ غير متوقع أو تعذّر أمر: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- لا تصلح أي خطأ يظهر في ملفات قديمة غير مذكورة هنا. سنحذفها في ملف لاحق.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر 1: `src/utils/labels.ts`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
import { type GlyphCategory, type GlyphForm } from '../types/font';

export const CATEGORY_LABEL: Record<GlyphCategory, string> = {
  letter: 'حرف هجائي',
  ligature: 'تركيب أو مدة',
  diacritic: 'علامة تشكيل',
  number: 'رقم',
  symbol: 'رمز',
};

export const FORM_LABEL: Record<GlyphForm, string> = {
  isolated: 'منفصل',
  initial: 'بداية',
  medial: 'وسط',
  final: 'نهاية',
};
```

---

## الأمر 2: `src/utils/download.ts`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
/** ينزّل نصاً كملف. اسم الملف يُنظَّف من الفراغات والرموز غير المسموحة. */
export function downloadTextFile(content: string, filename: string, mime: string): void {
  const safeName = filename.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** ينسخ نصاً إلى الحافظة. يعيد false إن لم يكن النسخ متاحاً. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

---

## الأمر 3: `src/utils/storage.ts`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
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
```

---

## الأمر 4: `src/utils/pathGeometry.ts`

هذا الملف يولّد مسار الرسم من النقاط ويحسب حدود المحرف بدقة.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
import { type Contour, type Glyph, type PathNode, type Vec } from '../types/font';

export interface Bounds {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

const round2 = (n: number) => Number(n.toFixed(2));

/** نقاط التحكم الأربع للقطعة بين نقطتين متجاورتين، أو null إن كانت مستقيمة. */
function segmentControls(a: PathNode, b: PathNode): [Vec, Vec] | null {
  if (!a.handleOut && !b.handleIn) return null;
  return [
    { x: a.x + (a.handleOut?.x ?? 0), y: a.y + (a.handleOut?.y ?? 0) },
    { x: b.x + (b.handleIn?.x ?? 0), y: b.y + (b.handleIn?.y ?? 0) },
  ];
}

/** القطع المتتالية للمسار، وتشمل قطعة الإغلاق إن كان المسار مغلقاً. */
function segments(contour: Contour): Array<[PathNode, PathNode]> {
  const { nodes, closed } = contour;
  const out: Array<[PathNode, PathNode]> = [];
  for (let i = 1; i < nodes.length; i++) out.push([nodes[i - 1], nodes[i]]);
  if (closed && nodes.length > 1) out.push([nodes[nodes.length - 1], nodes[0]]);
  return out;
}

/** يولّد نص مسار SVG بوحدات الخط (المحور الرأسي للأعلى). */
export function contourToPath(contour: Contour): string {
  const { nodes, closed } = contour;
  if (nodes.length === 0) return '';

  let d = `M ${round2(nodes[0].x)} ${round2(nodes[0].y)}`;
  for (const [a, b] of segments(contour)) {
    const ctrl = segmentControls(a, b);
    if (!ctrl) {
      d += ` L ${round2(b.x)} ${round2(b.y)}`;
    } else {
      d +=
        ` C ${round2(ctrl[0].x)} ${round2(ctrl[0].y)}` +
        ` ${round2(ctrl[1].x)} ${round2(ctrl[1].y)}` +
        ` ${round2(b.x)} ${round2(b.y)}`;
    }
  }
  if (closed && nodes.length > 1) d += ' Z';
  return d;
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const m = 1 - t;
  return m * m * m * p0 + 3 * m * m * t * p1 + 3 * m * t * t * p2 + t * t * t * p3;
}

/** قيم t الواقعة بين 0 و1 التي تنعدم عندها مشتقة المنحنى (القيم القصوى). */
function cubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = p1 - p0;
  const roots: number[] = [];

  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) > 1e-9) roots.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      roots.push((-b + s) / (2 * a), (-b - s) / (2 * a));
    }
  }
  return roots.filter((t) => t > 0 && t < 1);
}

/** الحدود الدقيقة للمسار (تشمل القيم القصوى للمنحنيات)، أو null إن كان فارغاً. */
export function getContourBounds(contour: Contour): Bounds | null {
  if (contour.nodes.length === 0) return null;

  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  const include = (x: number, y: number) => {
    xMin = Math.min(xMin, x);
    xMax = Math.max(xMax, x);
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  };

  for (const n of contour.nodes) include(n.x, n.y);

  for (const [a, b] of segments(contour)) {
    const ctrl = segmentControls(a, b);
    if (!ctrl) continue;
    const [c1, c2] = ctrl;
    const ts = [
      ...cubicExtrema(a.x, c1.x, c2.x, b.x),
      ...cubicExtrema(a.y, c1.y, c2.y, b.y),
    ];
    for (const t of ts) {
      include(
        cubicAt(a.x, c1.x, c2.x, b.x, t),
        cubicAt(a.y, c1.y, c2.y, b.y, t)
      );
    }
  }

  return { xMin, yMin, xMax, yMax };
}

export function getGlyphBounds(glyph: Glyph): Bounds | null {
  let result: Bounds | null = null;
  for (const contour of glyph.contours) {
    const b = getContourBounds(contour);
    if (!b) continue;
    result = result
      ? {
          xMin: Math.min(result.xMin, b.xMin),
          yMin: Math.min(result.yMin, b.yMin),
          xMax: Math.max(result.xMax, b.xMax),
          yMax: Math.max(result.yMax, b.yMax),
        }
      : b;
  }
  return result;
}

/** هل المسار مغلق ويصلح للتعبئة؟ (ثلاث نقاط على الأقل) */
export function isContourFillable(contour: Contour): boolean {
  return contour.closed && contour.nodes.length >= 3;
}
```

---

## الأمر 5: `src/utils/pathGeometry.test.ts`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { contourToPath, getContourBounds, getGlyphBounds } from './pathGeometry';
import { type Contour, type Glyph, type PathNode } from '../types/font';

const node = (
  id: string,
  x: number,
  y: number,
  handleIn: PathNode['handleIn'] = null,
  handleOut: PathNode['handleOut'] = null
): PathNode => ({ id, x, y, kind: 'corner', handleIn, handleOut });

const square: Contour = {
  id: 'c1',
  closed: true,
  nodes: [node('a', 0, 0), node('b', 100, 0), node('c', 100, 200), node('d', 0, 200)],
};

test('straight contour becomes a closed line path', () => {
  assert.equal(contourToPath(square), 'M 0 0 L 100 0 L 100 200 L 0 200 L 0 0 Z');
});

test('open contour has no closing segment', () => {
  const open: Contour = { ...square, closed: false };
  assert.equal(contourToPath(open), 'M 0 0 L 100 0 L 100 200 L 0 200');
});

test('empty contour produces an empty path', () => {
  assert.equal(contourToPath({ id: 'e', closed: true, nodes: [] }), '');
});

test('curve segment uses relative handles', () => {
  const c: Contour = {
    id: 'c2',
    closed: false,
    nodes: [node('a', 0, 0, null, { x: 0, y: 50 }), node('b', 100, 0, { x: 0, y: 50 }, null)],
  };
  assert.equal(contourToPath(c), 'M 0 0 C 0 50 100 50 100 0');
});

test('bounds of a square are exact', () => {
  assert.deepEqual(getContourBounds(square), { xMin: 0, yMin: 0, xMax: 100, yMax: 200 });
});

test('bounds include the true curve peak, not the handle', () => {
  const c: Contour = {
    id: 'c3',
    closed: false,
    nodes: [node('a', 0, 0, null, { x: 0, y: 100 }), node('b', 100, 0, { x: 0, y: 100 }, null)],
  };
  const b = getContourBounds(c);
  assert.ok(b);
  assert.equal(b.yMax, 75); // الذروة الفعلية 0.75 × ارتفاع المقبض
  assert.equal(b.xMin, 0);
  assert.equal(b.xMax, 100);
});

test('glyph bounds merge all contours and are null when empty', () => {
  const far: Contour = {
    id: 'c4',
    closed: true,
    nodes: [node('a', 300, -50), node('b', 400, -50), node('c', 400, 10)],
  };
  const glyph: Glyph = {
    id: 'g', name: 'g', unicode: '', char: 'x', category: 'letter', form: 'isolated',
    advanceWidth: 500, contours: [square, far], anchors: [],
  };
  assert.deepEqual(getGlyphBounds(glyph), { xMin: 0, yMin: -50, xMax: 400, yMax: 200 });
  assert.equal(getGlyphBounds({ ...glyph, contours: [] }), null);
});
```

---

## الأمر 6: `src/utils/viewportMath.ts`

حسابات التكبير والتحريك والملاءمة، بدون أي اعتماد على واجهة.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
/**
 * نقطة الأصل (ox, oy) هي موضع نقطة (0,0) من وحدات الخط على الشاشة بالبكسل،
 * و scale هو عدد البكسلات لكل وحدة خط. فيكون:
 *   شاشة.x = ox + x × scale
 *   شاشة.y = oy − y × scale
 */
export interface Viewport {
  scale: number;
  ox: number;
  oy: number;
}

export interface FitBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 8;
const FIT_FILL = 0.82;

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** يكبّر أو يصغّر مع إبقاء النقطة (px, py) ثابتة تحت المؤشر. */
export function zoomAt(v: Viewport, px: number, py: number, nextScale: number): Viewport {
  const scale = clampScale(nextScale);
  const k = scale / v.scale;
  return { scale, ox: px - (px - v.ox) * k, oy: py - (py - v.oy) * k };
}

export function computeFit(w: number, h: number, box: FitBox): Viewport {
  const bw = Math.max(box.xMax - box.xMin, 1);
  const bh = Math.max(box.yMax - box.yMin, 1);
  const scale = clampScale(Math.min((w * FIT_FILL) / bw, (h * FIT_FILL) / bh));
  return {
    scale,
    ox: w / 2 - ((box.xMin + box.xMax) / 2) * scale,
    oy: h / 2 + ((box.yMin + box.yMax) / 2) * scale,
  };
}
```

---

## الأمر 7: `src/utils/viewportMath.test.ts`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { zoomAt, computeFit, MAX_SCALE, MIN_SCALE } from './viewportMath';

test('zoomAt keeps the anchor point fixed', () => {
  const v = { scale: 0.5, ox: 100, oy: 300 };
  const px = 240;
  const py = 180;
  // نقطة الخط تحت المؤشر قبل التكبير وبعده
  const fx = (px - v.ox) / v.scale;
  const fy = (v.oy - py) / v.scale;
  const z = zoomAt(v, px, py, 1.2);
  assert.ok(Math.abs((px - z.ox) / z.scale - fx) < 1e-9);
  assert.ok(Math.abs((z.oy - py) / z.scale - fy) < 1e-9);
});

test('zoomAt clamps to limits', () => {
  const v = { scale: 1, ox: 0, oy: 0 };
  assert.equal(zoomAt(v, 0, 0, 1000).scale, MAX_SCALE);
  assert.equal(zoomAt(v, 0, 0, 0.00001).scale, MIN_SCALE);
});

test('computeFit centers the box and keeps it inside', () => {
  const box = { xMin: 0, xMax: 500, yMin: -200, yMax: 800 };
  const v = computeFit(800, 600, box);
  const left = v.ox + box.xMin * v.scale;
  const right = v.ox + box.xMax * v.scale;
  const top = v.oy - box.yMax * v.scale;
  const bottom = v.oy - box.yMin * v.scale;
  assert.ok(left >= 0 && right <= 800 && top >= 0 && bottom <= 600);
  assert.ok(Math.abs((left + right) / 2 - 400) < 1e-6);
  assert.ok(Math.abs((top + bottom) / 2 - 300) < 1e-6);
});
```

---

## الأمر 8: `src/state/useProjects.ts`

المخزن الوحيد للمشاريع. الحفظ المحلي تلقائي.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```ts
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
```

---

## التحقق (آخر خطوة)

1. شغّل `npm test`. يجب أن ينجح 21 اختباراً وتفشل صفر.
2. أرسل لي فقط: عدد الاختبارات الناجحة، ونص أي خطأ ظهر.
