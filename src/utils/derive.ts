import type { Glyph, GlyphForm } from '../types/font';
import { detachComponents } from './composites';
import { uid, validateNewGlyph } from './fontLogic';

/** لواحق أشكال الحروف المتصلة كما تسمّيها المجموعات الجاهزة (beh.init مثلاً). */
export const FORM_SUFFIX: Record<GlyphForm, string> = { isolated: 'isol', initial: 'init', medial: 'medi', final: 'fina' };
const SUFFIX_FORM = Object.fromEntries(Object.entries(FORM_SUFFIX).map(([f, s]) => [s, f])) as Record<string, GlyphForm>;

export interface FamilyMember {
  /** اللاحقة بلا نقطة (init)، أو '' لمحرف بلا شكل. */
  suffix: string;
  glyph: Glyph;
}

/** عائلة المحرف: المحارف التي تشارك اسمه الأساسي بلواحق الأشكال. المحرف بلا لاحقة عائلة من فرد واحد. */
export function familyOf(glyphs: Glyph[], source: Glyph): { base: string; members: FamilyMember[] } {
  const dot = source.name.lastIndexOf('.');
  const suffix = dot > 0 ? source.name.slice(dot + 1) : '';
  if (!SUFFIX_FORM[suffix]) return { base: source.name, members: [{ suffix: '', glyph: source }] };
  const base = source.name.slice(0, dot);
  const order = Object.values(FORM_SUFFIX);
  const members = glyphs
    .flatMap((g) => {
      const s = g.name.startsWith(base + '.') ? g.name.slice(base.length + 1) : '';
      return SUFFIX_FORM[s] ? [{ suffix: s, glyph: g }] : [];
    })
    .sort((a, b) => order.indexOf(a.suffix) - order.indexOf(b.suffix));
  return { base, members };
}

export interface DeriveOptions {
  sourceId: string;
  /** الاسم الأساسي للمحرف الجديد (يُضاف إليه .init وغيره عند اشتقاق عدة أشكال). */
  name: string;
  char: string;
  unicode: string;
  /** لواحق الأشكال المطلوبة من عائلة المصدر. */
  suffixes: string[];
  /** true: مكوّنات بالمرجع تتبع المصدر. false: نسخة بمسارات مستقلة (بمعرّفات جديدة). */
  link: boolean;
  /** جزء إضافي اختياري (كالنقطتين) يوضع فوق الجسم بإزاحة واحدة لكل الأشكال. */
  extra?: { refId: string; dx: number; dy: number };
}

export interface DerivePlan {
  glyphs: Glyph[];
  /** نص الخطأ بالعربية أو null. عند الخطأ لا يُنشأ شيء. */
  error: string | null;
}

/**
 * يخطّط الاشتقاق دون أن يمس المشروع: لكل شكل مطلوب محرف جديد بالاسم الجديد.
 * المصدر لا يتغير أبداً؛ المحرف الجديد إما يشير إليه (مكوّن أول فيرث ارتكازه) أو ينسخ رسمه.
 * اليونيكود يُمنح للشكل المنفرد (أو للمحرف بلا شكل) فقط لأنه لا يتكرر.
 */
export function planDerive(all: Glyph[], o: DeriveOptions): DerivePlan {
  const source = all.find((g) => g.id === o.sourceId);
  if (!source) return { glyphs: [], error: null };
  const fam = familyOf(all, source);
  const chosen = fam.members.filter((m) => o.suffixes.includes(m.suffix));
  const extra = o.extra && all.find((g) => g.id === o.extra!.refId);
  const out: Glyph[] = [];
  for (const m of chosen) {
    const name = m.suffix ? `${o.name.trim()}.${m.suffix}` : o.name.trim();
    const takesCode = m.suffix === '' || m.suffix === FORM_SUFFIX.isolated;
    const g: Glyph = {
      id: uid('glyph'),
      char: o.char.trim(),
      name,
      unicode: takesCode ? o.unicode.trim().toUpperCase() : '',
      category: m.glyph.category,
      form: m.glyph.form,
      advanceWidth: m.glyph.advanceWidth,
      contours: [],
      anchors: [],
      components: [
        { id: uid('comp'), ref: m.glyph.id, dx: 0, dy: 0 },
        ...(extra ? [{ id: uid('comp'), ref: extra.id, dx: o.extra!.dx, dy: o.extra!.dy }] : []),
      ],
    };
    const problem = validateNewGlyph([...all, ...out], { char: g.char, name: g.name, unicode: g.unicode, category: g.category, form: g.form });
    if (problem) return { glyphs: [], error: `${name}: ${problem}` };
    out.push(g);
  }
  // النسخة المستقلة: رسم المصدر والجزء بمسارات جديدة وارتكازات مثبّتة، بلا أي ارتباط
  return { glyphs: o.link ? out : out.map((g) => detachComponents({ glyphs: [...all, ...out] }, g)), error: null };
}
