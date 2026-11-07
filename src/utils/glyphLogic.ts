import { type Glyph, type GlyphCategory, type GlyphForm } from '../types/font';
import { uid, validateNewGlyph } from './fontLogic';
import { CATEGORY_LABEL, FORM_LABEL } from './labels';

/** بيانات المحرف القابلة للتعديل من نافذة التعديل. الرسم والعرض لا يمسّهما. */
/** أقصى عدد وصلات في المشروع. */
export const MAX_CONNECTORS = 12;

export interface GlyphMeta {
  char: string;
  name: string;
  unicode: string;
  category: GlyphCategory;
  form: GlyphForm;
}

/** نص الخطأ بالعربية أو null. يتجاهل المحرف نفسه عند فحص التكرار. */
export function validateGlyphEdit(all: Glyph[], glyphId: string, data: GlyphMeta): string | null {
  return validateNewGlyph(
    all.filter((g) => g.id !== glyphId),
    data
  );
}

export function applyGlyphMeta(glyph: Glyph, data: GlyphMeta): Glyph {
  return {
    ...glyph,
    char: data.char,
    name: data.name.trim(),
    unicode: data.unicode.trim().toUpperCase(),
    category: data.category,
    form: data.form,
  };
}

/** اسم غير مستعمل بصيغة name.copy ثم name.copy2 وهكذا. */
export function uniqueCopyName(all: Glyph[], base: string): string {
  const taken = new Set(all.map((g) => g.name));
  let name = `${base}.copy`;
  for (let i = 2; taken.has(name); i++) name = `${base}.copy${i}`;
  return name;
}

/** نسخة من المحرف برسم مستقل (معرّفات جديدة). اليونيكود يُترك فارغاً لأنه لا يتكرر. */
export function duplicateGlyph(all: Glyph[], glyphId: string): Glyph | null {
  const src = all.find((g) => g.id === glyphId);
  if (!src) return null;
  return {
    ...src,
    id: uid('glyph'),
    name: uniqueCopyName(all, src.name),
    unicode: '',
    contours: src.contours.map((c) => ({
      ...c,
      id: uid('contour'),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: uid('node'),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    })),
    anchors: src.anchors.map((a) => ({ ...a, id: uid('anchor') })),
  };
}

/** نسخة كاملة بمعرّفات جديدة تحتفظ بالاسم والرمز (للنسخ بين المشاريع). */
export function cloneGlyphFresh(src: Glyph): Glyph {
  return {
    ...src,
    id: uid('glyph'),
    contours: src.contours.map((c) => ({
      ...c,
      id: uid('contour'),
      nodes: c.nodes.map((n) => ({
        ...n,
        id: uid('node'),
        handleIn: n.handleIn ? { ...n.handleIn } : null,
        handleOut: n.handleOut ? { ...n.handleOut } : null,
      })),
    })),
    anchors: src.anchors.map((a) => ({ ...a, id: uid('anchor') })),
  };
}

export interface CopyResult {
  glyphs: Glyph[];
  added: number;
  replaced: number;
  skipped: number;
}

/** ينسخ محارف إلى قائمة محارف مشروع آخر. المطابقة بالاسم: إما يستبدل الموجود أو يتخطاه. */
export function copyGlyphsInto(target: Glyph[], src: Glyph[], replace: boolean): CopyResult {
  const next = [...target];
  let added = 0;
  let replaced = 0;
  let skipped = 0;
  for (const g of src) {
    const i = next.findIndex((t) => t.name === g.name);
    if (i === -1) {
      next.push(cloneGlyphFresh(g));
      added++;
    } else if (replace) {
      next[i] = { ...cloneGlyphFresh(g), id: next[i].id };
      replaced++;
    } else skipped++;
  }
  return { glyphs: next, added, replaced, skipped };
}

/** هل المحرف جاهز؟ له مسار مغلق واحد على الأقل، أو هو فراغ بطبيعته. */
export function isReady(g: Glyph): boolean {
  if (g.contours.some((c) => c.closed && c.nodes.length >= 3)) return true;
  return g.unicode.toUpperCase() === 'U+0020' || g.name === 'space';
}

export type SortMode = 'ready' | 'added' | 'code';

const codeOf = (g: Glyph): number => {
  const m = /^U\+([0-9A-F]+)$/i.exec(g.unicode);
  return m ? parseInt(m[1], 16) : Number.MAX_SAFE_INTEGER;
};

/** ترتيب العرض: الجاهزة أولاً، أو بترتيب الإضافة، أو بترتيب اليونيكود. لا يغيّر المصفوفة الأصلية. */
export function sortGlyphs(glyphs: Glyph[], mode: SortMode): Glyph[] {
  const list = [...glyphs];
  if (mode === 'ready') {
    return list
      .map((g, i) => ({ g, i, r: isReady(g) ? 0 : 1 }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.g);
  }
  if (mode === 'code') {
    return list
      .map((g, i) => ({ g, i }))
      .sort((a, b) => codeOf(a.g) - codeOf(b.g) || a.i - b.i)
      .map((x) => x.g);
  }
  return list;
}

export interface GlyphFilter {
  query: string;
  status: 'all' | 'ready' | 'empty';
  category: 'all' | GlyphCategory;
  form: 'all' | GlyphForm;
}

export const NO_FILTER: GlyphFilter = { query: '', status: 'all', category: 'all', form: 'all' };

export const isFiltering = (f: GlyphFilter): boolean =>
  f.query.trim() !== '' || f.status !== 'all' || f.category !== 'all' || f.form !== 'all';

/** يصفّي المحارف: النص يُطابق الاسم أو الحرف أو الرمز أو اسم التصنيف أو الشكل. */
export function filterGlyphs(glyphs: Glyph[], f: GlyphFilter): Glyph[] {
  const q = f.query.trim().toLowerCase();
  return glyphs.filter((g) => {
    if (f.status === 'ready' && !isReady(g)) return false;
    if (f.status === 'empty' && isReady(g)) return false;
    if (f.category !== 'all' && g.category !== f.category) return false;
    if (f.form !== 'all' && g.form !== f.form) return false;
    if (!q) return true;
    return [g.name, g.char, g.unicode, CATEGORY_LABEL[g.category], FORM_LABEL[g.form]].some((v) =>
      v.toLowerCase().includes(q)
    );
  });
}
