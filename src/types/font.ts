export interface Vec {
  x: number;
  y: number;
}

/**
 * نوع النقطة (قفل المقبضين):
 * corner: حران كلياً.
 * smooth: متقابلان على خط واحد وطول كل منهما حر.
 * mirror: متقابلان وبطولين متساويين.
 * locked: مقفلان بوضعهما الحالي، فإذا تحرك أحدهما تحرك الآخر بنفس الدوران والتكبير.
 */
export type NodeKind = 'corner' | 'smooth' | 'mirror' | 'locked';

/**
 * نقطة على المسار. المقبضان مخزّنان كإزاحة نسبة إلى موضع النقطة،
 * فعند تحريك النقطة يتحرك مقبضاها تلقائياً. القيمة null تعني بلا مقبض.
 */
export interface PathNode {
  id: string;
  x: number;
  y: number;
  kind: NodeKind;
  handleIn: Vec | null;
  handleOut: Vec | null;
}

/** مسار واحد. هذا هو المصدر الوحيد للحقيقة، ونص SVG يُولَّد منه عند العرض فقط. */
export interface Contour {
  id: string;
  closed: boolean;
  nodes: PathNode[];
}

export interface AnchorPoint {
  id: string;
  name: string; // top, bottom, entry, exit
  x: number;
  y: number;
}

export type GlyphCategory = 'letter' | 'diacritic' | 'number' | 'symbol' | 'ligature';
export type GlyphForm = 'isolated' | 'initial' | 'medial' | 'final';

/**
 * ملاحظة: العارضان الأيمن والأيسر لا يُخزَّنان. يُحسبان دائماً من حدود المسارات
 * ومن العرض الكامل، حتى لا يختلف رقم مخزّن عن الرسم الفعلي.
 */
export interface Glyph {
  id: string;
  name: string;
  unicode: string; // مثل U+0627، أو نص فارغ للأشكال غير المرمّزة
  char: string;
  category: GlyphCategory;
  form: GlyphForm;
  advanceWidth: number;
  contours: Contour[];
  anchors: AnchorPoint[];
}

export interface NewGlyphData {
  char: string;
  name: string;
  unicode: string;
  category: GlyphCategory;
  /** اختياري: عرض ابتدائي للمحرف (تستعمله المجموعات الجاهزة). */
  advanceWidth?: number;
  /** اختياري: شكل المحرف (الافتراضي منفصل). */
  form?: GlyphForm;
}

/** خط الأساس ثابت عند 0 ولذلك لا يُخزَّن. */
export interface FontMetrics {
  upm: number;
  ascender: number;
  capHeight: number;
  xHeight: number;
  descender: number;
}

export interface OpenTypeFeature {
  tag: string;
  name: string;
  enabled: boolean;
  code: string;
}

/** معلومات الخط الإضافية. الحقول الفارغة تُحسب تلقائياً من اسم الخط. */
export interface FontInfo {
  subfamily: string;
  fullName: string;
  postScriptName: string;
  copyright: string;
  license: string;
  licenseUrl: string;
  manufacturer: string;
  designerUrl: string;
}

export interface FontProject {
  id: string;
  name: string;
  designer: string;
  version: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  metrics: FontMetrics;
  glyphs: Glyph[];
  features: OpenTypeFeature[];
  /** اختيارية: المشاريع القديمة لا تحملها وتُعامل كفارغة. */
  info?: Partial<FontInfo>;
  /** قواعد الأوبن تايب التي كتبها المستخدم بصيغة FEA. تُدمج مع القواعد التلقائية. */
  customFea?: string;
  /** وصلات يعرّفها المستخدم لإدراجها بسرعة في أي محرف. مراكزها عند الأصل. */
  connectors?: Connector[];
}

export interface Connector {
  id: string;
  name: string;
  contours: Contour[];
}
