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

/** خط دليل للمساعدة فقط، لا يدخل في الخط الناتج. axis=h أفقي عند ارتفاع pos، وv رأسي عند موضع pos. */
export interface Guide {
  id: string;
  axis: 'h' | 'v';
  pos: number;
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
  /** خطوط دليل خاصة بهذا المحرف (اختياري). */
  guides?: Guide[];
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
  /** ضبط المسافة بين أزواج المحارف (كيرننغ). */
  kerning?: KernPair[];
  /** إزاحة الحروف اللاحقة */
  cascades?: CascadeRule[];
  /** يوجد فقط للمشاريع المستوردة من ملف خط. */
  source?: SourceLayout;
  /** قيم OS/2 الأصلية للخط المستورد (الوزن وfsSelection) مع اسم نمطه وقت الاستيراد، لتبقى كما هي ما لم يغيّر المستخدم النمط. */
  os2Origin?: {
    weight: number;
    fsSelection: number;
    subfamily: string;
    /** مقاييس Win الأصلية، وascender/descender وقت الاستيراد لمعرفة هل غيّرها المستخدم. */
    win?: [number, number];
    metrics?: [number, number];
    /** صفحات الرموز وبصمة الناشر وصلاحيات التضمين الأصلية. */
    codePage?: [number, number];
    vendor?: string;
    fsType?: number;
  };
  /** سجلات جدول الأسماء التي لا يديرها المحرر (اسم الميزات 256+، رابط الناشر، العلامة التجارية…) تُعاد كما هي عند التصدير. */
  nameExtras?: Record<string, Record<string, string>>;
  /** المحرف الافتراضي .notdef الأصلي: عرضه ومساره (أوامر M/L/C/Z بإحداثيات الخط)، فارغ إن كان بلا رسم. */
  notdef?: { advance: number; path: Array<['M' | 'L' | 'C' | 'Z', ...number[]]> };
}

/**
 * ضبط مسافة زوج محارف بأسمائها. left هو الأول في ترتيب الكتابة (الأيمن في العربية)، و right الذي يليه.
 * القيمة تغيّر تقدّم الأول: السالب يقرّب الثاني منه.
 */
export interface KernPair {
  id: string;
  left: string;
  right: string;
  value: number;
}

/**
 * إزاحة الحروف اللاحقة (الحركة التتابعية): حين يأتي المحرف `glyph` في كلمة تُزاح الحروف التي بعده رأسياً بمقدار `dy`.
 * `span` عدد الحروف المتأثرة بعده (من 1 إلى 12)، والصفر يعني كل ما بقي من الكلمة (حتى 12 حرفاً).
 * الحالة تُحدَّد باسم المحرف نفسه (مثل hah.medi للحاء في الوسط).
 */
export interface CascadeRule {
  id: string;
  glyph: string;
  dy: number;
  span: number;
}

/**
 * مخطط الخط المستورد: مكان كل محرف في الملف الأصلي (رقمه = موضعه في المصفوفة) والجداول الأصلية التي تشير إلى تلك الأرقام.
 * عند التصدير مع تفعيل «الجداول الأصلية» يبقى ترتيب المحارف كما كان، وتُكتب الجداول كما هي بلا فقد.
 */
export interface SourceLayout {
  slots: Array<{ id: string | null; name: string; advance: number }>;
  /** جداول خام مرمّزة base64 (GSUB وGPOS وGDEF). */
  tables: { GSUB?: string; GPOS?: string; GDEF?: string };
  useOriginal: boolean;
  /** اسم نقطة الارتكاز لكل فئة علامات في كل جدول علامة-قاعدة أصلي (top وbottom أو markN) بترتيب الجدول الأصلي. */
  markClasses?: string[][];
}

export interface Connector {
  id: string;
  name: string;
  contours: Contour[];
}
