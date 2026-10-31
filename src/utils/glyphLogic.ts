import { type Glyph, type GlyphCategory, type GlyphForm } from '../types/font';
import { uid, validateNewGlyph } from './fontLogic';

/** بيانات المحرف القابلة للتعديل من نافذة التعديل. الرسم والعرض لا يمسّهما. */
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
