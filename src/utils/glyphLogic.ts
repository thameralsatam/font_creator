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
