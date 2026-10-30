# الدفعة 16: تصدير الخط الحقيقي (OTF) واستيراد الخطوط

أولاً وقبل كل خطوة: نفّذ في الطرفية داخل مجلد المشروع الأمر التالي حرفياً (العلامة الأخيرة ضرورية بسبب تعارض قديم في إصدارات الأدوات لا علاقة له بالمكتبة):

```
npm install opentype.js@1.3.4 @types/opentype.js@1.3.10 --legacy-peer-deps
```

ثم نفّذ الخطوات التالية. ملاحظة: الخطوات التي تنشئ ملفات جديدة تأتي في الآخر.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: أضف الكود التالي في آخر الملف `src/utils/download.ts` (بعد آخر سطر، دون حذف شيء)

```

/** ينزّل ملفاً ثنائياً (مثل ملف الخط). */
export function downloadBlob(blob: Blob, filename: string): void {
  const safeName = filename.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

## الخطوة 2: في الملف `src/components/ExportModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { Check, Copy, Download, FileCode, FileJson } from 'lucide-react';
```

**النص الجديد:**
```
import { AlertTriangle, Check, Copy, Download, FileCode, FileJson, Type } from 'lucide-react';
```

## الخطوة 3: في الملف `src/components/ExportModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { copyText, downloadTextFile } from '../utils/download';
```

**النص الجديد:**
```
import { copyText, downloadBlob, downloadTextFile } from '../utils/download';
import { buildFontBuffer, checkProject, safePsName } from '../utils/fontBuild';
```

## الخطوة 4: في الملف `src/components/ExportModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const [copyFailed, setCopyFailed] = useState(false);

```

**النص الجديد:**
```
  const [copyFailed, setCopyFailed] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const report = useMemo(() => checkProject(project), [project]);

  const downloadFont = async () => {
    setBuilding(true);
    setBuildError(null);
    try {
      const buf = await buildFontBuffer(project);
      downloadBlob(new Blob([buf], { type: 'font/otf' }), `${safePsName(project.name)}-Regular.otf`);
    } catch {
      setBuildError('تعذّر بناء ملف الخط. راجع المحارف وحاول من جديد.');
    } finally {
      setBuilding(false);
    }
  };

```

## الخطوة 5: في الملف `src/components/ExportModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import React, { useState } from 'react';
```

**النص الجديد:**
```
import React, { useMemo, useState } from 'react';
```

## الخطوة 6: في الملف `src/components/ExportModal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      <div className="space-y-3">
        {items.map((item) => (
```

**النص الجديد:**
```
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/30 bg-sand/30 p-3.5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5"><Type className="h-5 w-5 stroke-[1.5]" /></span>
            <div className="min-w-0">
              <h3 className="truncate font-mono text-xs">{safePsName(project.name)}-Regular.otf</h3>
              <p className="text-[11px] leading-relaxed text-ink-soft">
                ملف الخط الحقيقي، يُثبَّت ويُستعمل في أي برنامج
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            title="بناء الخط وتحميله"
            disabled={building || report.errors.length > 0}
            onClick={downloadFont}
          >
            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>{building ? 'جارٍ البناء' : 'تحميل'}</span>
          </Button>
        </div>

        {(report.errors.length > 0 || report.warnings.length > 0 || buildError) && (
          <div role="alert" className="space-y-1.5 rounded-2xl border border-ink/20 bg-paper p-3 text-xs leading-6">
            {[...report.errors, ...(buildError ? [buildError] : [])].map((t) => (
              <p key={t} className="flex gap-2"><AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />{t}</p>
            ))}
            {report.warnings.map((t) => (
              <p key={t} className="flex gap-2 text-ink-soft"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />{t}</p>
            ))}
          </div>
        )}

        {items.map((item) => (
```

## الخطوة 7: في الملف `src/components/ProjectsDashboard.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { HelpBookButton } from './help/HelpBook';
```

**النص الجديد:**
```
import { HelpBookButton } from './help/HelpBook';
import { ImportFontButton } from './ImportFontButton';
```

## الخطوة 8: في الملف `src/components/ProjectsDashboard.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  onDeleteProject: (projectId: string) => void;
}
```

**النص الجديد:**
```
  onDeleteProject: (projectId: string) => void;
  onImportProject: (project: FontProject) => void;
}
```

## الخطوة 9: في الملف `src/components/ProjectsDashboard.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  onDeleteProject,
}) => {
```

**النص الجديد:**
```
  onDeleteProject,
  onImportProject,
}) => {
```

## الخطوة 10: في الملف `src/components/ProjectsDashboard.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        <HelpBookButton />
        {hasProjects && (
```

**النص الجديد:**
```
        <div className="flex flex-wrap items-center gap-2">
          <ImportFontButton onImport={onImportProject} />
          <HelpBookButton />
        </div>
        {hasProjects && (
```

## الخطوة 11: في الملف `src/state/useProjects.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const renameProject = useCallback(
```

**النص الجديد:**
```
  /** يضيف مشروعاً جاهزاً (مستورداً من ملف خط). */
  const importProject = useCallback((project: FontProject) => {
    setProjects((prev) => [project, ...prev]);
  }, []);

  const renameProject = useCallback(
```

## الخطوة 12: في الملف `src/state/useProjects.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    createProject,
    renameProject,
```

**النص الجديد:**
```
    createProject,
    importProject,
    renameProject,
```

## الخطوة 13: في الملف `src/App.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
            onDeleteProject={handleDeleteProject}

```

**النص الجديد:**
```
            onDeleteProject={handleDeleteProject}
            onImportProject={store.importProject}

```

## الخطوة 14: في الملف `src/help/helpBook.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
{ h: 'ما يمكن تصديره', p: 'ملف المشروع (نسخة احتياطية تعيد فتحها لاحقاً)، وملف ميزات الخط. ملف الخط نفسه يضاف في تحديث قادم.' },
```

**النص الجديد:**
```
{ h: 'ملف الخط', p: 'زر تحميل الأول في نافذة التصدير يبني ملف خط حقيقي بصيغة OTF تثبّته على جهازك وتستعمله في أي برنامج. قبل البناء تظهر لك الأخطاء التي تمنعه (مثل عدم وجود محارف برمز يونيكود) والتنبيهات (مسارات مفتوحة أو ثقوب باتجاه خاطئ أو محارف بلا رسم).' },
      { h: 'ملفات أخرى', p: 'ملف المشروع (نسخة احتياطية كاملة بمساراتها)، وملف ميزات الخط للمترجمات.' },
      { h: 'استيراد خط', p: 'زر استيراد خط في صفحة المشاريع يقرأ ملف OTF أو TTF وينشئ منه مشروعاً جديداً بمحارفه ومقاييسه. المحارف الأكبر من حدود الموقع تُتجاوز ويُذكر لك عددها. قواعد التبديل داخل الخط لا تُستورد.' },
```

## الخطوة 15: في الملف `src/help/helpBook.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
{ h: 'نصيحة قبل التصدير', p: 'راجع أن المسارات مغلقة، وأن الثقوب بالاتجاه الصحيح، وأن العرض الكامل مناسب لكل محرف.' },
```

**النص الجديد:**
```
{ h: 'نصيحة قبل التصدير', p: 'راجع أن المسارات مغلقة، وأن الثقوب بالاتجاه الصحيح، وأن العرض الكامل مناسب لكل محرف. الخط يحتاج محرفاً واحداً على الأقل برمز يونيكود.' },
      { h: 'تجربة الخط', p: 'بعد التحميل افتح الملف وثبّته، ثم اكتب به في أي برنامج. تجده باسم المشروع.' },
```

## الخطوة 16: أنشئ الملف `src/utils/fontBuild.ts` (أو استبدل محتواه كاملاً)

```ts
import type OpenType from 'opentype.js';
import {
  type Contour,
  type FontMetrics,
  type FontProject,
  type Glyph,
  type GlyphCategory,
  type PathNode,
} from '../types/font';
import { createGlyph, createProject, uid, validateMetrics } from './fontLogic';
import { LIMITS, coordRange, fixDirections, wrongDirectionCount } from './pathEdit';

/*
  بناء ملف خط حقيقي (OTF) من المشروع واستيراد خط موجود إلى مشروع.
  المكتبة تُحمَّل عند أول استعمال فقط حتى لا تثقل بقية الموقع.
*/

type OT = typeof OpenType;

async function loadOpenType(): Promise<OT> {
  const mod = (await import('opentype.js')) as unknown as { default?: OT } & OT;
  return mod.default ?? mod;
}

export const MAX_IMPORT_GLYPHS = 800;

/* ============================================================
   فحص المشروع قبل التصدير
   ============================================================ */

export interface BuildReport {
  /** تمنع التصدير. */
  errors: string[];
  /** تنبيهات لا تمنع. */
  warnings: string[];
}

export function parseUnicode(u: string): number | null {
  const m = /^U\+([0-9A-F]{4,6})$/i.exec(u.trim());
  if (!m) return null;
  const cp = parseInt(m[1], 16);
  return cp <= 0x10ffff ? cp : null;
}

const list = (names: string[]) =>
  names.length <= 4 ? names.join('، ') : `${names.slice(0, 4).join('، ')} و${names.length - 4} أخرى`;

export function checkProject(project: FontProject): BuildReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const glyphs = project.glyphs;

  if (glyphs.length === 0) errors.push('لا توجد محارف في المشروع.');
  else if (!glyphs.some((g) => parseUnicode(g.unicode) !== null)) {
    errors.push('لا يوجد أي محرف له رمز يونيكود، فلن يُظهر الخط شيئاً عند الكتابة.');
  }
  const m = validateMetrics(project.metrics);
  if (!m.isValid) errors.push(...m.errors);

  const open = glyphs.filter((g) => g.contours.some((c) => !c.closed));
  if (open.length) warnings.push(`مسارات مفتوحة ستُغلق بخط مستقيم عند التصدير في: ${list(open.map((g) => g.name))}.`);

  const wrong = glyphs.filter((g) => wrongDirectionCount(g.contours) > 0);
  if (wrong.length) warnings.push(`اتجاه مسارات خاطئ (ثقوب قد تظهر مملوءة) في: ${list(wrong.map((g) => g.name))}. استعمل ضبط الاتجاه تلقائياً.`);

  const empty = glyphs.filter(
    (g) => g.contours.length === 0 && g.advanceWidth > 0 && g.name !== 'space' && parseUnicode(g.unicode) !== 0x20
  );
  if (empty.length) warnings.push(`محارف بلا رسم: ${list(empty.map((g) => g.name))}.`);

  const noCode = glyphs.filter((g) => parseUnicode(g.unicode) === null);
  if (noCode.length && noCode.length < glyphs.length) {
    warnings.push(`محارف بلا رمز يونيكود لن تُكتب مباشرة (تحتاج قواعد تبديل): ${list(noCode.map((g) => g.name))}.`);
  }
  return { errors, warnings };
}

/* ============================================================
   من المشروع إلى ملف
   ============================================================ */

/** اسم PostScript: حروف لاتينية وأرقام وشرطة فقط، بحد 63 حرفاً. */
export function safePsName(name: string): string {
  const s = name.replace(/[^A-Za-z0-9-]/g, '').slice(0, 63);
  return s || 'FontStudio';
}

function contourToOT(ot: OT, path: InstanceType<OT['Path']>, c: Contour): void {
  const n = c.nodes;
  if (n.length < 2) return;
  const pt = (a: PathNode, b: PathNode) => {
    const h1 = a.handleOut;
    const h2 = b.handleIn;
    if (h1 || h2) {
      path.curveTo(
        a.x + (h1?.x ?? 0), a.y + (h1?.y ?? 0),
        b.x + (h2?.x ?? 0), b.y + (h2?.y ?? 0),
        b.x, b.y
      );
    } else {
      path.lineTo(b.x, b.y);
    }
  };
  path.moveTo(n[0].x, n[0].y);
  for (let i = 1; i < n.length; i++) pt(n[i - 1], n[i]);
  // المقطع الأخير نحو البداية يلزم رسمه فقط إن كان منحنياً، والإغلاق يرسم الخط المستقيم
  if (c.closed && (n[n.length - 1].handleOut || n[0].handleIn)) pt(n[n.length - 1], n[0]);
  path.close();
  void ot;
}

function notdefPath(ot: OT, m: FontMetrics) {
  const p = new ot.Path();
  const w = Math.round(m.upm * 0.55);
  const t = Math.round(m.upm * 0.06);
  const h = m.capHeight;
  // مربع خارجي عكس عقارب الساعة وداخله فراغ مع عقاربها
  p.moveTo(t, 0); p.lineTo(w - t, 0); p.lineTo(w - t, h); p.lineTo(t, h); p.close();
  p.moveTo(t * 2, t); p.lineTo(t * 2, h - t); p.lineTo(w - t * 2, h - t); p.lineTo(w - t * 2, t); p.close();
  return { path: p, advance: w };
}

export function glyphToOT(ot: OT, g: Glyph) {
  const path = new ot.Path();
  for (const c of fixDirections(g.contours)) contourToOT(ot, path, c);
  const cp = parseUnicode(g.unicode);
  return new ot.Glyph({
    name: g.name,
    unicode: cp ?? undefined,
    advanceWidth: Math.max(0, Math.round(g.advanceWidth)),
    path,
  });
}

export async function buildFontBuffer(project: FontProject): Promise<ArrayBuffer> {
  const ot = await loadOpenType();
  const m = project.metrics;
  const nd = notdefPath(ot, m);
  const notdef = new ot.Glyph({ name: '.notdef', unicode: 0, advanceWidth: nd.advance, path: nd.path });
  // نرتب المحارف: ذوات الرمز أولاً بترتيب الرمز، ثم الباقي بترتيب المشروع
  const withCode = project.glyphs
    .filter((g) => parseUnicode(g.unicode) !== null)
    .sort((a, b) => (parseUnicode(a.unicode) ?? 0) - (parseUnicode(b.unicode) ?? 0));
  const without = project.glyphs.filter((g) => parseUnicode(g.unicode) === null);
  const glyphs = [notdef, ...[...withCode, ...without].map((g) => glyphToOT(ot, g))];

  const family = project.name.trim() || 'Font Studio';
  const font = new ot.Font({
    familyName: family,
    styleName: 'Regular',
    unitsPerEm: m.upm,
    ascender: m.ascender,
    descender: m.descender,
    designer: project.designer,
    description: project.description,
    version: `Version ${project.version}`,
    glyphs,
  });
  (font.names as unknown as Record<string, Record<string, string>>).postScriptName = {
    en: safePsName(family) + '-Regular',
  };
  return font.toArrayBuffer();
}

/* ============================================================
   من ملف إلى مشروع
   ============================================================ */

interface Cmd {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

const nz = (v: { x: number; y: number }) => (v.x === 0 && v.y === 0 ? null : v);

/** هل المقبضان على خط واحد تقريباً (نقطة ناعمة)؟ */
function collinear(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const la = Math.hypot(a.x, a.y);
  const lb = Math.hypot(b.x, b.y);
  if (la === 0 || lb === 0) return false;
  const cross = Math.abs(a.x * b.y - a.y * b.x) / (la * lb);
  const dot = a.x * b.x + a.y * b.y;
  return cross < 0.02 && dot < 0;
}

/** أوامر المسار (M L C Q Z) إلى مسارات المشروع. المنحنيات التربيعية تُحوَّل إلى تكعيبية. */
export function commandsToContours(cmds: Cmd[]): Contour[] {
  const out: Contour[] = [];
  let cur: PathNode[] | null = null;

  const finish = (closed: boolean) => {
    if (!cur) return;
    let nodes = cur;
    if (closed && nodes.length > 1) {
      const f = nodes[0];
      const l = nodes[nodes.length - 1];
      if (f.x === l.x && f.y === l.y) {
        nodes[0] = { ...f, handleIn: l.handleIn };
        nodes = nodes.slice(0, -1);
      }
    }
    nodes = nodes.map((n) => ({
      ...n,
      kind: n.handleIn && n.handleOut && collinear(n.handleIn, n.handleOut) ? ('smooth' as const) : ('corner' as const),
    }));
    if (nodes.length >= 2) out.push({ id: uid('contour'), closed, nodes });
    cur = null;
  };
  const mk = (x: number, y: number): PathNode => ({
    id: uid('node'), x: Math.round(x), y: Math.round(y), kind: 'corner', handleIn: null, handleOut: null,
  });

  for (const c of cmds) {
    if (c.type === 'M') {
      finish(false);
      cur = [mk(c.x ?? 0, c.y ?? 0)];
    } else if (!cur) {
      continue;
    } else if (c.type === 'L') {
      cur.push(mk(c.x ?? 0, c.y ?? 0));
    } else if (c.type === 'C' || c.type === 'Q') {
      const prev = cur[cur.length - 1];
      let c1x: number, c1y: number, c2x: number, c2y: number;
      const x = c.x ?? 0;
      const y = c.y ?? 0;
      if (c.type === 'C') {
        c1x = c.x1 ?? 0; c1y = c.y1 ?? 0; c2x = c.x2 ?? 0; c2y = c.y2 ?? 0;
      } else {
        const qx = c.x1 ?? 0;
        const qy = c.y1 ?? 0;
        c1x = prev.x + ((qx - prev.x) * 2) / 3; c1y = prev.y + ((qy - prev.y) * 2) / 3;
        c2x = x + ((qx - x) * 2) / 3; c2y = y + ((qy - y) * 2) / 3;
      }
      const node = mk(x, y);
      prev.handleOut = nz({ x: Math.round(c1x - prev.x), y: Math.round(c1y - prev.y) });
      node.handleIn = nz({ x: Math.round(c2x - node.x), y: Math.round(c2y - node.y) });
      cur.push(node);
    } else if (c.type === 'Z') {
      finish(true);
    }
  }
  finish(false);
  return out;
}

function categoryOf(cp: number | null): GlyphCategory {
  if (cp === null) return 'letter';
  if ((cp >= 0x064b && cp <= 0x065f) || cp === 0x0670) return 'diacritic';
  const ch = String.fromCodePoint(cp);
  if (/\p{N}/u.test(ch)) return 'number';
  if (/\p{L}/u.test(ch)) return 'letter';
  return 'symbol';
}

function cleanName(raw: string | undefined, cp: number | null, taken: Set<string>, index: number): string {
  let n = (raw ?? '').replace(/[^A-Za-z0-9._-]/g, '');
  if (!/^[A-Za-z_]/.test(n)) n = '';
  if (!n) n = cp !== null ? `uni${cp.toString(16).toUpperCase().padStart(4, '0')}` : `glyph${index}`;
  let name = n;
  for (let i = 2; taken.has(name); i++) name = `${n}.${i}`;
  taken.add(name);
  return name;
}

export interface ImportResult {
  project: FontProject;
  notes: string[];
  imported: number;
}

export function fontToProject(font: OpenType.Font, fileName: string): ImportResult {
  const notes: string[] = [];
  const upm = font.unitsPerEm;
  if (!(upm >= 100 && upm <= 4096)) throw new Error('مقياس الخط (وحدات المربع) خارج المدى المدعوم من 100 إلى 4096.');

  const names = font.names as unknown as Record<string, Record<string, string> | undefined>;
  const pick = (key: string) => {
    const v = names[key];
    return v ? v.en ?? v.ar ?? Object.values(v)[0] : undefined;
  };
  const familyName = pick('fontFamily') || fileName.replace(/\.[^.]+$/, '') || 'خط مستورد';
  const project = createProject(familyName, pick('designer') ?? '', pick('description') ?? '');

  const os2 = (font.tables as unknown as { os2?: { sCapHeight?: number; sxHeight?: number } }).os2;
  const metrics: FontMetrics = {
    upm,
    ascender: Math.round(font.ascender) > 0 ? Math.round(font.ascender) : Math.round(upm * 0.8),
    descender: Math.round(font.descender) < 0 ? Math.round(font.descender) : -Math.round(upm * 0.2),
    capHeight: os2?.sCapHeight ? Math.round(os2.sCapHeight) : Math.round(upm * 0.7),
    xHeight: os2?.sxHeight ? Math.round(os2.sxHeight) : Math.round(upm * 0.5),
  };
  metrics.capHeight = Math.min(metrics.capHeight, metrics.ascender);
  metrics.xHeight = Math.min(metrics.xHeight, metrics.capHeight);
  project.metrics = metrics;

  const range = coordRange(metrics);
  const taken = new Set<string>();
  const codes = new Set<number>();
  const glyphs: Glyph[] = [];
  let skippedLimits = 0;
  let skippedRange = 0;
  let skippedCap = 0;

  for (let i = 0; i < font.glyphs.length; i++) {
    const g = font.glyphs.get(i);
    if (i === 0 || g.name === '.notdef') continue;
    if (glyphs.length >= MAX_IMPORT_GLYPHS) {
      skippedCap++;
      continue;
    }
    const cp = typeof g.unicode === 'number' && g.unicode > 0 && !codes.has(g.unicode) ? g.unicode : null;
    let contours = commandsToContours(g.path.commands as unknown as Cmd[]);
    const nodeCount = contours.reduce((s, c) => s + c.nodes.length, 0);
    if (contours.length > LIMITS.maxContours || nodeCount > LIMITS.maxNodes) {
      skippedLimits++;
      continue;
    }
    const outside = contours.some((c) =>
      c.nodes.some((n) => n.x < range.xMin || n.x > range.xMax || n.y < range.yMin || n.y > range.yMax)
    );
    if (outside) {
      skippedRange++;
      continue;
    }
    contours = fixDirections(contours);
    if (cp !== null) codes.add(cp);
    const name = cleanName(g.name ?? undefined, cp, taken, i);
    const glyph = createGlyph({
      char: cp !== null ? String.fromCodePoint(cp) : name,
      name,
      unicode: cp !== null ? `U+${cp.toString(16).toUpperCase().padStart(4, '0')}` : '',
      category: categoryOf(cp),
      advanceWidth: Math.min(Math.max(0, Math.round(g.advanceWidth ?? 0)), upm * 2),
    });
    glyphs.push({ ...glyph, contours });
  }

  if (skippedLimits) notes.push(`${skippedLimits} محرف تجاوز حد النقاط (${LIMITS.maxNodes}) أو المسارات (${LIMITS.maxContours}) فلم يُستورد.`);
  if (skippedRange) notes.push(`${skippedRange} محرف خارج المجال المسموح للإحداثيات فلم يُستورد.`);
  if (skippedCap) notes.push(`${skippedCap} محرف زائد عن الحد الأقصى (${MAX_IMPORT_GLYPHS}) فلم يُستورد.`);
  if (!validateMetrics(metrics).isValid) notes.push('مقاييس الخط المستورد غير متناسقة، راجعها من نافذة المقاييس.');
  notes.push('قواعد الخط (ميزات التبديل) لا تُستورد، وتُضاف داخل المشروع لاحقاً.');

  project.glyphs = glyphs;
  return { project, notes, imported: glyphs.length };
}

export async function importFontBuffer(buf: ArrayBuffer, fileName: string): Promise<ImportResult> {
  const ot = await loadOpenType();
  let font: OpenType.Font;
  try {
    font = ot.parse(buf);
  } catch {
    throw new Error('تعذّرت قراءة الملف. المدعوم هو OTF وTTF فقط، وهذا الملف تالف أو بصيغة أخرى.');
  }
  return fontToProject(font, fileName);
}

```

## الخطوة 17: أنشئ الملف `src/components/ImportFontButton.tsx` (أو استبدل محتواه كاملاً)

```tsx
import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { type FontProject } from '../types/font';
import { importFontBuffer } from '../utils/fontBuild';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

const MAX_BYTES = 8 * 1024 * 1024;

/** استيراد خط OTF أو TTF كمشروع جديد. */
export const ImportFontButton: React.FC<{ onImport: (project: FontProject) => void }> = ({ onImport }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ title: string; lines: string[] } | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setResult({ title: 'ملف كبير', lines: ['حجم الملف أكبر من 8 ميغابايت، وهو أكبر مما يتسع له التخزين المحلي.'] });
      return;
    }
    setBusy(true);
    try {
      const r = await importFontBuffer(await file.arrayBuffer(), file.name);
      if (r.imported === 0) {
        setResult({ title: 'لم يُستورد شيء', lines: ['لا توجد محارف صالحة في هذا الخط.', ...r.notes] });
      } else {
        onImport(r.project);
        setResult({ title: `تم استيراد ${r.imported} محرف`, lines: r.notes });
      }
    } catch (e) {
      setResult({ title: 'تعذّر الاستيراد', lines: [e instanceof Error ? e.message : 'خطأ غير معروف.'] });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".otf,.ttf"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <Button title="استيراد خط OTF أو TTF كمشروع جديد" disabled={busy} onClick={() => input.current?.click()}>
        <Upload className="h-3.5 w-3.5 stroke-[1.5]" />
        <span>{busy ? 'جارٍ القراءة' : 'استيراد خط'}</span>
      </Button>
      {result && (
        <Modal title={result.title} size="sm" onClose={() => setResult(null)}>
          <ul className="space-y-1.5 text-xs leading-6 text-ink-soft">
            {result.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <ModalActions>
            <Button variant="primary" onClick={() => setResult(null)}>حسناً</Button>
          </ModalActions>
        </Modal>
      )}
    </>
  );
};

```

## الخطوة 18: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
