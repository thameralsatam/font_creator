import { type GlyphCategory, type GlyphForm } from '../types/font';
import { t } from '../i18n';

export const CATEGORY_LABEL: Record<GlyphCategory, string> = {
  letter: t('حرف هجائي'),
  ligature: t('تركيب أو مدة'),
  diacritic: t('علامة تشكيل'),
  number: t('رقم'),
  symbol: t('رمز'),
};

export const FORM_LABEL: Record<GlyphForm, string> = {
  isolated: t('منفصل'),
  initial: t('بداية'),
  medial: t('وسط'),
  final: t('نهاية'),
};

/** أسماء نقاط الارتكاز الجاهزة: المفتاح المخزَّن ثم الاسم المعروض. */
export const ANCHOR_LABEL: Record<string, string> = {
  top: t('فوق'),
  bottom: t('تحت'),
  entry: t('دخول'),
  exit: t('خروج'),
};

/** أسماء عربية لوسوم ميزات الأوبن تايب الشائعة. */
export const OT_FEATURE_LABEL: Record<string, string> = {
  aalt: t('بدائل الشكل'),
  calt: t('بدائل سياقية'),
  ccmp: t('تركيب وتفكيك المحارف'),
  clig: t('ترابط سياقي'),
  curs: t('اتصال الحروف'),
  dlig: t('ترابط اختياري'),
  fina: t('شكل النهاية'),
  init: t('شكل البداية'),
  isol: t('الشكل المنفصل'),
  kern: t('التقارب بين الأزواج'),
  liga: t('الترابط العادي'),
  locl: t('خصائص حسب اللغة'),
  mark: t('تموضع التشكيل على الحروف'),
  medi: t('شكل الوسط'),
  mkmk: t('تموضع التشكيل على التشكيل'),
  rclt: t('بدائل سياقية إلزامية'),
  rlig: t('ترابط إلزامي'),
  salt: t('بدائل أسلوبية'),
  swsh: t('زخارف'),
  zero: t('صفر مشطوب'),
};

export function otFeatureLabel(tag: string): string {
  if (OT_FEATURE_LABEL[tag]) return OT_FEATURE_LABEL[tag];
  if (/^ss\d\d$/.test(tag)) return t('مجموعة أسلوب {n}', { n: Number(tag.slice(2)) });
  if (/^cv\d\d$/.test(tag)) return t('تنويع حرف {n}', { n: Number(tag.slice(2)) });
  return t('ميزة إضافية');
}

/** ميزات يفعّلها المتصفح تلقائياً. الباقي اختياري ويبدأ مطفأً في المعاينة. */
export const OT_DEFAULT_ON = new Set(['ccmp', 'locl', 'rlig', 'calt', 'rclt', 'liga', 'clig', 'init', 'medi', 'fina', 'isol', 'kern', 'mark', 'mkmk', 'curs', 'rvrn']);
