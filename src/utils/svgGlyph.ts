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

/* ---------------- المصفوفات والتحويلات ---------------- */

type Mat = [number, number, number, number, number, number];
const ID: Mat = [1, 0, 0, 1, 0, 0];

/** حاصل ضرب P ثم C: تُطبَّق C أولاً ثم P. */
const mul = (p: Mat, c: Mat): Mat => [
  p[0] * c[0] + p[2] * c[1],
  p[1] * c[0] + p[3] * c[1],
  p[0] * c[2] + p[2] * c[3],
  p[1] * c[2] + p[3] * c[3],
  p[0] * c[4] + p[2] * c[5] + p[4],
  p[1] * c[4] + p[3] * c[5] + p[5],
];

const NUM = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const nums = (s: string) => (s.match(NUM) ?? []).map(Number);

function parseTransform(s: string | null): Mat {
  let m: Mat = ID;
  if (!s) return m;
  for (const t of s.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)) {
    const a = nums(t[2]);
    let n: Mat = ID;
    if (t[1] === 'matrix' && a.length >= 6) n = [a[0], a[1], a[2], a[3], a[4], a[5]];
    else if (t[1] === 'translate') n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
    else if (t[1] === 'scale') n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (t[1] === 'skewX') n = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
    else if (t[1] === 'skewY') n = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
    else if (t[1] === 'rotate') {
      const r = ((a[0] ?? 0) * Math.PI) / 180;
      const rot: Mat = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
      const cx = a[1] ?? 0;
      const cy = a[2] ?? 0;
      n = mul(mul([1, 0, 0, 1, cx, cy], rot), [1, 0, 0, 1, -cx, -cy]);
    }
    m = mul(m, n);
  }
  return m;
}

/* ---------------- المسارات ---------------- */

type Cmd = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

/** قوس بيضاوي إلى منحنيات تكعيبية (قطعة لكل ربع دورة). */
function arcToCubics(x0: number, y0: number, rxIn: number, ryIn: number, phiDeg: number, fa: number, fs: number, x: number, y: number): Cmd[] {
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0 || (x0 === x && y0 === y)) return [{ type: 'L', x, y }];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x0 - x) / 2;
  const dy = (y0 - y) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    const s = Math.sqrt(lam);
    rx *= s;
    ry *= s;
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x0 + x) / 2;
  const cy = sin * cxp + cos * cyp + (y0 + y) / 2;
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;
  const theta1 = Math.atan2(uy, ux);
  let dtheta = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!fs && dtheta > 0) dtheta -= 2 * Math.PI;
  if (fs && dtheta < 0) dtheta += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dtheta) / (Math.PI / 2) - 1e-9));
  const delta = dtheta / n;
  const k = (4 / 3) * Math.tan(delta / 4);
  const map = (px: number, py: number) => ({
    x: cx + rx * px * cos - ry * py * sin,
    y: cy + rx * px * sin + ry * py * cos,
  });
  const out: Cmd[] = [];
  for (let i = 0; i < n; i++) {
    const a1 = theta1 + i * delta;
    const a2 = a1 + delta;
    const p1 = map(Math.cos(a1) - k * Math.sin(a1), Math.sin(a1) + k * Math.cos(a1));
    const p2 = map(Math.cos(a2) + k * Math.sin(a2), Math.sin(a2) - k * Math.cos(a2));
    const p3 = i === n - 1 ? { x, y } : map(Math.cos(a2), Math.sin(a2));
    out.push({ type: 'C', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p3.x, y: p3.y });
  }
  return out;
}

/** نص d في SVG إلى أوامر مطلقة (M L C Q Z). الأقواس تتحول إلى منحنيات. */
function parseD(d: string): Cmd[] {
  const out: Cmd[] = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let lastC: { x: number; y: number } | null = null;
  let lastQ: { x: number; y: number } | null = null;
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const up = m[1].toUpperCase();
    const rel = m[1] !== up;
    const v = nums(m[2]);
    const n = ARGS[up];
    if (up === 'Z') {
      out.push({ type: 'Z' });
      cx = sx; cy = sy; lastC = lastQ = null;
      continue;
    }
    for (let i = 0; i + n <= v.length; i += n) {
      const a = v.slice(i, i + n);
      const ox = rel ? cx : 0;
      const oy = rel ? cy : 0;
      if (up === 'M') {
        cx = a[0] + ox; cy = a[1] + oy;
        if (i === 0) { sx = cx; sy = cy; out.push({ type: 'M', x: cx, y: cy }); }
        else out.push({ type: 'L', x: cx, y: cy });
        lastC = lastQ = null;
      } else if (up === 'L' || up === 'H' || up === 'V') {
        if (up === 'L') { cx = a[0] + ox; cy = a[1] + oy; }
        else if (up === 'H') cx = a[0] + ox;
        else cy = a[0] + oy;
        out.push({ type: 'L', x: cx, y: cy });
        lastC = lastQ = null;
      } else if (up === 'C' || up === 'S') {
        let x1: number, y1: number, k = 0;
        if (up === 'C') { x1 = a[0] + ox; y1 = a[1] + oy; k = 2; }
        else { x1 = lastC ? 2 * cx - lastC.x : cx; y1 = lastC ? 2 * cy - lastC.y : cy; }
        const x2 = a[k] + ox, y2 = a[k + 1] + oy, x = a[k + 2] + ox, y = a[k + 3] + oy;
        out.push({ type: 'C', x1, y1, x2, y2, x, y });
        lastC = { x: x2, y: y2 }; lastQ = null; cx = x; cy = y;
      } else if (up === 'Q' || up === 'T') {
        let x1: number, y1: number, k = 0;
        if (up === 'Q') { x1 = a[0] + ox; y1 = a[1] + oy; k = 2; }
        else { x1 = lastQ ? 2 * cx - lastQ.x : cx; y1 = lastQ ? 2 * cy - lastQ.y : cy; }
        const x = a[k] + ox, y = a[k + 1] + oy;
        out.push({ type: 'Q', x1, y1, x, y });
        lastQ = { x: x1, y: y1 }; lastC = null; cx = x; cy = y;
      } else {
        const x = a[5] + ox, y = a[6] + oy;
        out.push(...arcToCubics(cx, cy, a[0], a[1], a[2], a[3] ? 1 : 0, a[4] ? 1 : 0, x, y));
        cx = x; cy = y; lastC = lastQ = null;
      }
    }
  }
  return out;
}

function applyMat(c: Cmd, m: Mat): Cmd {
  const t: Cmd = { type: c.type };
  const p = (x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  if (c.x !== undefined && c.y !== undefined) [t.x, t.y] = p(c.x, c.y);
  if (c.x1 !== undefined && c.y1 !== undefined) [t.x1, t.y1] = p(c.x1, c.y1);
  if (c.x2 !== undefined && c.y2 !== undefined) [t.x2, t.y2] = p(c.x2, c.y2);
  return t;
}

/* ---------------- قراءة الملف ---------------- */

const attr = (src: string, name: string): string | null => {
  const m = src.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`));
  return m ? (m[1] ?? m[2] ?? '') : null;
};
const num = (src: string, name: string): number => Number(attr(src, name)) || 0;
const CONTAINERS = new Set(['svg', 'g', 'defs', 'clipPath', 'mask', 'symbol', 'pattern', 'marker', 'a', 'switch']);
const HIDDEN = new Set(['defs', 'clipPath', 'mask', 'symbol', 'pattern', 'marker']);

/** الأشكال الأساسية إلى نص مسار. */
function shapeToD(name: string, a: string): string | null {
  if (name === 'path') return attr(a, 'd');
  if (name === 'rect') {
    const x = num(a, 'x'), y = num(a, 'y'), w = num(a, 'width'), h = num(a, 'height');
    let rx = num(a, 'rx'), ry = num(a, 'ry');
    if (!(w > 0 && h > 0)) return null;
    if (rx && !ry) ry = rx;
    if (ry && !rx) rx = ry;
    rx = Math.min(rx, w / 2);
    ry = Math.min(ry, h / 2);
    if (!rx || !ry) return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
    return (
      `M ${x + rx} ${y} L ${x + w - rx} ${y} A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry} L ${x + w} ${y + h - ry} ` +
      `A ${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} L ${x + rx} ${y + h} A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} ` +
      `L ${x} ${y + ry} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`
    );
  }
  if (name === 'circle' || name === 'ellipse') {
    const cx = num(a, 'cx'), cy = num(a, 'cy');
    const rx = name === 'circle' ? num(a, 'r') : num(a, 'rx');
    const ry = name === 'circle' ? rx : num(a, 'ry');
    if (!(rx > 0 && ry > 0)) return null;
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
  }
  if (name === 'polygon' || name === 'polyline') {
    const p = nums(attr(a, 'points') ?? '');
    if (p.length < 6) return null;
    let d = `M ${p[0]} ${p[1]}`;
    for (let i = 2; i + 1 < p.length; i += 2) d += ` L ${p[i]} ${p[i + 1]}`;
    return d + ' Z';
  }
  return null;
}

export type SvgImportResult =
  | { ok: true; contours: Contour[]; advanceWidth: number }
  | { ok: false; error: string };

/**
 * يقرأ ملف SVG ويحوّله إلى مسارات محرف.
 * يُقاس الرسم بحيث يملأ ارتفاع صندوق الـ viewBox ارتفاع الخط (الصاعد + النازل)، وتبقى النسبة محفوظة.
 * المدعوم: path وrect وcircle وellipse وpolygon وpolyline، مع التحويلات (حتى داخل المجموعات)
 * وكل أوامر المسار بما فيها الأقواس. الألوان تُتجاهل، والأشكال بلا تعبئة (fill="none") تُتجاوز.
 */
export function svgToGlyph(text: string, m: FontMetrics): SvgImportResult {
  if (!/<svg[\s>]/i.test(text)) return { ok: false, error: 'الملف ليس SVG صالحاً.' };
  let vb = text.match(/viewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*["']/i)?.slice(1).map(Number);
  if (!vb) {
    const w = Number(text.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i)?.[1]);
    const h = Number(text.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i)?.[1]);
    if (w > 0 && h > 0) vb = [0, 0, w, h];
  }
  if (!vb || !(vb[2] > 0) || !(vb[3] > 0)) return { ok: false, error: 'لم أجد مقاس الرسم (viewBox) في الملف.' };
  const [vx, vy, vw, vh] = vb;
  const s = (m.ascender - m.descender) / vh;
  const toFont: Mat = [s, 0, 0, -s, -vx * s, m.ascender + vy * s];

  // الأشكال المعرَّفة بمعرّف (id) لتُستدعى بعنصر use
  const byId = new Map<string, { name: string; a: string }>();
  for (const t of text.matchAll(/<([a-zA-Z][\w:-]*)([^>]*?)\/?>/g)) {
    const id = attr(t[2], 'id');
    if (id && !CONTAINERS.has(t[1])) byId.set(id, { name: t[1], a: t[2] });
  }

  const stack: Array<{ name: string; m: Mat; hidden: boolean }> = [{ name: '#root', m: ID, hidden: false }];
  const cmds: Cmd[] = [];
  let shapes = 0;

  for (const t of text.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const closing = t[1] === '/';
    const name = t[2];
    const a = t[3];
    const selfClose = t[4] === '/';
    if (CONTAINERS.has(name)) {
      if (closing) {
        if (stack.length > 1) stack.pop();
      } else if (!selfClose) {
        const top = stack[stack.length - 1];
        stack.push({
          name,
          m: mul(top.m, parseTransform(attr(a, 'transform'))),
          hidden: top.hidden || HIDDEN.has(name) || attr(a, 'display') === 'none',
        });
      }
      continue;
    }
    if (closing) continue;
    const top = stack[stack.length - 1];
    if (top.hidden) continue;
    const noFill = (x: string) => attr(x, 'fill') === 'none' || /fill\s*:\s*none/.test(attr(x, 'style') ?? '');
    if (noFill(a)) continue;
    let shapeName = name;
    let shapeAttrs = a;
    let own = parseTransform(attr(a, 'transform'));
    if (name === 'use') {
      const ref = (attr(a, 'href') ?? attr(a, 'xlink:href') ?? '').replace(/^#/, '');
      const target = byId.get(ref);
      if (!target || noFill(target.a)) continue;
      shapeName = target.name;
      shapeAttrs = target.a;
      own = mul(mul(own, [1, 0, 0, 1, num(a, 'x'), num(a, 'y')]), parseTransform(attr(target.a, 'transform')));
    }
    const d = shapeToD(shapeName, shapeAttrs);
    if (!d) continue;
    shapes++;
    const mat = mul(toFont, mul(top.m, own));
    for (const c of parseD(d)) cmds.push(applyMat(c, mat));
  }

  if (shapes === 0) return { ok: false, error: 'لا توجد أشكال قابلة للقراءة في الملف. المدعوم: path وrect وcircle وellipse وpolygon، وuse إذا أشار إلى واحد منها (المجموعات المستدعاة غير مدعومة).' };
  const raw = commandsToContours(cmds).map((c) => ({ ...c, closed: true }));
  if (raw.length === 0) return { ok: false, error: 'لم أجد في الملف مساراً صالحاً.' };
  if (raw.length > LIMITS.maxContours) return { ok: false, error: `عدد المسارات ${raw.length} يتجاوز الحد (${LIMITS.maxContours}).` };
  const nodes = countNodes(raw);
  if (nodes > LIMITS.maxNodes) return { ok: false, error: `عدد النقاط ${nodes} يتجاوز الحد (${LIMITS.maxNodes}). بسّط الرسم في برنامج الرسم.` };
  return { ok: true, contours: fixDirections(raw), advanceWidth: Math.max(100, Math.round(vw * s)) };
}
