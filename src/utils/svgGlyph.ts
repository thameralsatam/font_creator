import { type Contour, type FontMetrics, type Glyph } from '../types/font';
import { commandsToContours } from './fontBuild';
import { LIMITS, countNodes, fixDirections } from './pathEdit';

const r2 = (n: number) => Number(n.toFixed(2));

function contourD(c: Contour, flipY: (y: number) => number): string {
  const n = c.nodes;
  if (n.length === 0) return '';
  const pt = (x: number, y: number) => `${r2(x)} ${r2(flipY(y))}`;
  let d = `M ${pt(n[0].x, n[0].y)}`;
  const seg = (a: (typeof n)[number], b: (typeof n)[number]) => {
    if (!a.handleOut && !b.handleIn) return ` L ${pt(b.x, b.y)}`;
    const c1 = pt(a.x + (a.handleOut?.x ?? 0), a.y + (a.handleOut?.y ?? 0));
    const c2 = pt(b.x + (b.handleIn?.x ?? 0), b.y + (b.handleIn?.y ?? 0));
    return ` C ${c1} ${c2} ${pt(b.x, b.y)}`;
  };
  for (let i = 1; i < n.length; i++) d += seg(n[i - 1], n[i]);
  if (c.closed && n.length > 1) d += seg(n[n.length - 1], n[0]) + ' Z';
  return d;
}

/** ملف SVG لمحرف واحد: صندوقه من أعلى الصاعد إلى أسفل النازل، وعرضه عرض المحرف. */
export function glyphToSvg(glyph: Glyph, m: FontMetrics): string {
  const h = m.ascender - m.descender;
  const d = glyph.contours.map((c) => contourD(c, (y) => m.ascender - y)).join(' ');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${glyph.advanceWidth} ${h}" ` +
    `width="${glyph.advanceWidth}" height="${h}">\n  <path fill="#000" fill-rule="nonzero" d="${d}"/>\n</svg>\n`
  );
}

type Cmd = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };

const NUM = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, Z: 0 };

/** نص d في SVG إلى أوامر مطلقة (M L C Q Z). تُرجع null إن وُجد أمر قوس (A) غير المدعوم. */
function parseD(d: string): Cmd[] | null {
  const out: Cmd[] = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let lastC: { x: number; y: number } | null = null;
  let lastQ: { x: number; y: number } | null = null;
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1];
    const up = cmd.toUpperCase();
    if (up === 'A') return null;
    const rel = cmd !== up;
    const nums = (m[2].match(NUM) ?? []).map(Number);
    const n = ARGS[up];
    if (up === 'Z') {
      out.push({ type: 'Z' });
      cx = sx; cy = sy; lastC = lastQ = null;
      continue;
    }
    for (let i = 0; i + n <= nums.length; i += n) {
      const a = nums.slice(i, i + n);
      const ox = rel ? cx : 0;
      const oy = rel ? cy : 0;
      if (up === 'M') {
        const first = i === 0;
        cx = a[0] + ox; cy = a[1] + oy;
        if (first) { sx = cx; sy = cy; out.push({ type: 'M', x: cx, y: cy }); }
        else out.push({ type: 'L', x: cx, y: cy });
        lastC = lastQ = null;
      } else if (up === 'L' || up === 'H' || up === 'V') {
        if (up === 'L') { cx = a[0] + ox; cy = a[1] + oy; }
        else if (up === 'H') cx = a[0] + ox;
        else cy = a[0] + oy;
        out.push({ type: 'L', x: cx, y: cy });
        lastC = lastQ = null;
      } else if (up === 'C' || up === 'S') {
        let x1: number, y1: number;
        let k = 0;
        if (up === 'C') { x1 = a[0] + ox; y1 = a[1] + oy; k = 2; }
        else { x1 = lastC ? 2 * cx - lastC.x : cx; y1 = lastC ? 2 * cy - lastC.y : cy; }
        const x2 = a[k] + ox, y2 = a[k + 1] + oy, x = a[k + 2] + ox, y = a[k + 3] + oy;
        out.push({ type: 'C', x1, y1, x2, y2, x, y });
        lastC = { x: x2, y: y2 }; lastQ = null; cx = x; cy = y;
      } else {
        let x1: number, y1: number, k = 0;
        if (up === 'Q') { x1 = a[0] + ox; y1 = a[1] + oy; k = 2; }
        else { x1 = lastQ ? 2 * cx - lastQ.x : cx; y1 = lastQ ? 2 * cy - lastQ.y : cy; }
        const x = a[k] + ox, y = a[k + 1] + oy;
        out.push({ type: 'Q', x1, y1, x, y });
        lastQ = { x: x1, y: y1 }; lastC = null; cx = x; cy = y;
      }
    }
  }
  return out;
}

export type SvgImportResult =
  | { ok: true; contours: Contour[]; advanceWidth: number }
  | { ok: false; error: string };

/**
 * يقرأ ملف SVG ويحوّله إلى مسارات محرف.
 * يُقاس الرسم بحيث يملأ ارتفاع صندوق الـ viewBox ارتفاع الخط (الصاعد + النازل)، وتبقى النسبة محفوظة.
 * المدعوم: عناصر path فقط، وأوامر M L H V C S Q T Z (مطلقة ونسبية). الأقواس والتحويلات غير مدعومة.
 */
export function svgToGlyph(text: string, m: FontMetrics): SvgImportResult {
  if (!/<svg[\s>]/i.test(text)) return { ok: false, error: 'الملف ليس SVG صالحاً.' };
  if (/\stransform\s*=/i.test(text)) {
    return { ok: false, error: 'الملف يحوي تحويلات (transform). في برنامج الرسم حوّل الأشكال إلى مسارات وافصل التحويلات ثم أعد التصدير.' };
  }
  let vb = text.match(/viewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*["']/i)?.slice(1).map(Number);
  if (!vb) {
    const w = Number(text.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i)?.[1]);
    const h = Number(text.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i)?.[1]);
    if (w > 0 && h > 0) vb = [0, 0, w, h];
  }
  if (!vb || !(vb[2] > 0) || !(vb[3] > 0)) return { ok: false, error: 'لم أجد مقاس الرسم (viewBox) في الملف.' };
  const [vx, vy, vw, vh] = vb;

  const ds = [...text.matchAll(/<path\b[^>]*?\sd\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((x) => x[1] ?? x[2] ?? '');
  if (ds.length === 0) return { ok: false, error: 'لا توجد مسارات (path) في الملف. حوّل الأشكال إلى مسارات أولاً.' };

  const s = (m.ascender - m.descender) / vh;
  const cmds: Cmd[] = [];
  for (const d of ds) {
    const parsed = parseD(d);
    if (!parsed) return { ok: false, error: 'الملف يستعمل أقواساً (arc) غير مدعومة. حوّلها إلى منحنيات.' };
    for (const c of parsed) {
      const t: Cmd = { type: c.type };
      const fx = (v: number) => (v - vx) * s;
      const fy = (v: number) => m.ascender - (v - vy) * s;
      if (c.x !== undefined) t.x = fx(c.x);
      if (c.y !== undefined) t.y = fy(c.y);
      if (c.x1 !== undefined) t.x1 = fx(c.x1);
      if (c.y1 !== undefined) t.y1 = fy(c.y1);
      if (c.x2 !== undefined) t.x2 = fx(c.x2);
      if (c.y2 !== undefined) t.y2 = fy(c.y2);
      cmds.push(t);
    }
  }
  const raw = commandsToContours(cmds).map((c) => ({ ...c, closed: true }));
  if (raw.length === 0) return { ok: false, error: 'لم أجد في الملف مساراً صالحاً.' };
  if (raw.length > LIMITS.maxContours) return { ok: false, error: `عدد المسارات ${raw.length} يتجاوز الحد (${LIMITS.maxContours}).` };
  const nodes = countNodes(raw);
  if (nodes > LIMITS.maxNodes) return { ok: false, error: `عدد النقاط ${nodes} يتجاوز الحد (${LIMITS.maxNodes}). بسّط الرسم في برنامج الرسم.` };
  return { ok: true, contours: fixDirections(raw), advanceWidth: Math.max(100, Math.round(vw * s)) };
}
