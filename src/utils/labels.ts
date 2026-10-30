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
