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

/** أسماء نقاط الارتكاز الجاهزة: المفتاح المخزَّن ثم الاسم المعروض. */
export const ANCHOR_LABEL: Record<string, string> = {
  top: 'فوق',
  bottom: 'تحت',
  entry: 'دخول',
  exit: 'خروج',
};

/** أسماء عربية لوسوم ميزات الأوبن تايب الشائعة. */
export const OT_FEATURE_LABEL: Record<string, string> = {
  aalt: 'بدائل الشكل',
  calt: 'بدائل سياقية',
  ccmp: 'تركيب وتفكيك المحارف',
  clig: 'ترابط سياقي',
  curs: 'اتصال الحروف',
  dlig: 'ترابط اختياري',
  fina: 'شكل النهاية',
  init: 'شكل البداية',
  isol: 'الشكل المنفصل',
  kern: 'التقارب بين الأزواج',
  liga: 'الترابط العادي',
  locl: 'خصائص حسب اللغة',
  mark: 'تموضع التشكيل على الحروف',
  medi: 'شكل الوسط',
  mkmk: 'تموضع التشكيل على التشكيل',
  rclt: 'بدائل سياقية إلزامية',
  rlig: 'ترابط إلزامي',
  salt: 'بدائل أسلوبية',
  swsh: 'زخارف',
  zero: 'صفر مشطوب',
};

export function otFeatureLabel(tag: string): string {
  if (OT_FEATURE_LABEL[tag]) return OT_FEATURE_LABEL[tag];
  if (/^ss\d\d$/.test(tag)) return `مجموعة أسلوب ${Number(tag.slice(2))}`;
  if (/^cv\d\d$/.test(tag)) return `تنويع حرف ${Number(tag.slice(2))}`;
  return 'ميزة إضافية';
}

/** ميزات يفعّلها المتصفح تلقائياً. الباقي اختياري ويبدأ مطفأً في المعاينة. */
export const OT_DEFAULT_ON = new Set(['ccmp', 'locl', 'rlig', 'calt', 'rclt', 'liga', 'clig', 'init', 'medi', 'fina', 'isol', 'kern', 'mark', 'mkmk', 'curs', 'rvrn']);
