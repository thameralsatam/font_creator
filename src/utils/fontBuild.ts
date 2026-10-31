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
import { computeFeatures, rulesForBuild } from './features';
import { infoOf, parseVersion, resolveInfo, safePsName } from './fontInfo';
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
  const feats = computeFeatures(glyphs);
  const unnamed = noCode.filter((g) => !feats.rules.some((r) => r.to === g.name));
  if (unnamed.length && noCode.length < glyphs.length) {
    warnings.push(`محارف بلا رمز يونيكود ولا ميزة تستدعيها فلن تظهر أبداً: ${list(unnamed.map((g) => g.name))}. سمِّها بلاحقة .init أو .medi أو .fina.`);
  }
  if (feats.gaps.length) warnings.push(`ميزات ناقصة: ${list(feats.gaps.map((x) => `${x.glyph} (${x.message})`))}.`);
  if (feats.mismatches.length) warnings.push(`شكل المحرف لا يطابق لاحقة اسمه: ${list(feats.mismatches)}.`);
  return { errors, warnings };
}

/* ============================================================
   من المشروع إلى ملف
   ============================================================ */

export { safePsName };

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

/** اسم ملف الخط المقترح للتصدير (مثل MyFont-Regular.otf). */
export function fontFileName(project: FontProject): string {
  return `${resolveInfo(project).postScriptName}.otf`;
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

  const info = resolveInfo(project);
  const font = new ot.Font({
    familyName: info.family,
    styleName: info.subfamily,
    unitsPerEm: m.upm,
    ascender: m.ascender,
    descender: m.descender,
    designer: info.designer,
    description: info.description,
    version: `Version ${info.version}`,
    glyphs,
  });
  // جدول الأسماء: كل معلومات الخط تُكتب فيه، والفارغ منها لا يُكتب
  const names = font.names as unknown as Record<string, Record<string, string>>;
  names.fullName = { en: info.fullName };
  names.postScriptName = { en: info.postScriptName };
  const optional: Array<[string, string]> = [
    ['copyright', info.copyright],
    ['license', info.license],
    ['licenseURL', info.licenseUrl],
    ['manufacturer', info.manufacturer],
    ['designerURL', info.designerUrl],
  ];
  for (const [key, value] of optional) if (value.trim()) names[key] = { en: value.trim() };
  // ارتفاعا الحروف الصغيرة والكبيرة يُكتبان كما ضبطتهما، وإلا خمّنتهما المكتبة من حروف لاتينية
  (font.tables as unknown as Record<string, unknown>).os2 = {
    sxHeight: m.xHeight,
    sCapHeight: m.capHeight,
    sTypoAscender: m.ascender,
    sTypoDescender: m.descender,
  };

  // ميزات الأوبن تايب المستخرجة من أسماء المحارف (init وmedi وfina وisol وrlig)
  const sub = font.substitution as unknown as {
    addSingle(f: string, s: { sub: number; by: number }, script: string, lang: string): void;
    addLigature(f: string, s: { sub: number[]; by: number }, script: string, lang: string): void;
  };
  const index = new Map(glyphs.map((gl, i) => [gl.name, i]));
  for (const r of rulesForBuild(computeFeatures(project.glyphs))) {
    const ids = r.from.map((n) => index.get(n));
    const by = index.get(r.to);
    if (by === undefined || ids.some((x) => x === undefined)) continue;
    if (r.kind === 'single') {
      sub.addSingle(r.feature, { sub: ids[0] as number, by }, 'arab', 'dflt');
    } else {
      sub.addLigature(r.feature, { sub: ids as number[], by }, 'arab', 'dflt');
    }
  }

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
  project.version = parseVersion(pick('version'));
  project.info = {
    ...infoOf(project),
    subfamily: pick('fontSubfamily') || 'Regular',
    fullName: pick('fullName') ?? '',
    postScriptName: /^[A-Za-z0-9-]{1,63}$/.test(pick('postScriptName') ?? '') ? pick('postScriptName')! : '',
    copyright: pick('copyright') ?? '',
    license: pick('license') ?? '',
    licenseUrl: pick('licenseURL') ?? '',
    manufacturer: pick('manufacturer') ?? '',
    designerUrl: pick('designerURL') ?? '',
  };

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
