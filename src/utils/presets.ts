import { type Glyph, type GlyphCategory, type GlyphForm, type NewGlyphData } from '../types/font';
import { JOINING, formsFor } from './features';

/*
  مجموعات محارف جاهزة. تُنشأ فارغة (بلا رسم) بأسماء ورموز يونيكود صحيحة،
  وتُتجاهل أي محارف موجودة سلفاً (بالاسم أو برمز اليونيكود).
*/

export interface PresetSet {
  id: string;
  label: string;
  description: string;
  items: NewGlyphData[];
}

type Row = [number, string];

const FORM_FOR: Record<string, GlyphForm> = { init: 'initial', medi: 'medial', fina: 'final' };

const item = (cp: number, name: string, category: GlyphCategory, advanceWidth?: number): NewGlyphData => ({
  char: String.fromCodePoint(cp),
  name,
  unicode: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
  category,
  ...(advanceWidth !== undefined ? { advanceWidth } : {}),
});

const LETTERS: Row[] = [
  [0x0621, 'hamza'], [0x0622, 'alefMadda'], [0x0623, 'alefHamzaAbove'], [0x0624, 'wawHamza'],
  [0x0625, 'alefHamzaBelow'], [0x0626, 'yehHamza'], [0x0627, 'alef'], [0x0628, 'beh'],
  [0x0629, 'tehMarbuta'], [0x062a, 'teh'], [0x062b, 'theh'], [0x062c, 'jeem'],
  [0x062d, 'hah'], [0x062e, 'khah'], [0x062f, 'dal'], [0x0630, 'thal'],
  [0x0631, 'reh'], [0x0632, 'zain'], [0x0633, 'seen'], [0x0634, 'sheen'],
  [0x0635, 'sad'], [0x0636, 'dad'], [0x0637, 'tah'], [0x0638, 'zah'],
  [0x0639, 'ain'], [0x063a, 'ghain'], [0x0641, 'feh'], [0x0642, 'qaf'],
  [0x0643, 'kaf'], [0x0644, 'lam'], [0x0645, 'meem'], [0x0646, 'noon'],
  [0x0647, 'heh'], [0x0648, 'waw'], [0x0649, 'alefMaksura'], [0x064a, 'yeh'],
];

const MARKS: Row[] = [
  [0x064b, 'fathatan'], [0x064c, 'dammatan'], [0x064d, 'kasratan'], [0x064e, 'fatha'],
  [0x064f, 'damma'], [0x0650, 'kasra'], [0x0651, 'shadda'], [0x0652, 'sukun'],
];

/** أشكال البداية والوسط والنهاية لكل حرف بحسب نوع اتصاله (بلا رمز يونيكود، تُفعَّل بالميزات). */
const FORMS: NewGlyphData[] = LETTERS.flatMap(([cp, name]) =>
  formsFor(JOINING[name] ?? 'U').map((s) => ({
    char: String.fromCodePoint(cp),
    name: `${name}.${s}`,
    unicode: '',
    category: 'letter' as const,
    form: FORM_FOR[s],
    advanceWidth: 600,
  }))
);

/** لام ألف بأنواعها: المنفصل/البداية بلا اتصال، و.fina حين يتصل بحرف قبله. */
const LAM_ALEF: Array<[number, number, string, string]> = [
  [0xfefb, 0xfefc, 'lam_alef', 'ل\u0627'],
  [0xfef7, 0xfef8, 'lam_alefHamzaAbove', 'ل\u0623'],
  [0xfef9, 0xfefa, 'lam_alefHamzaBelow', 'ل\u0625'],
  [0xfef5, 0xfef6, 'lam_alefMadda', 'ل\u0622'],
];
const LIGATURES: NewGlyphData[] = LAM_ALEF.flatMap(([iso, fin, name, chars]) => [
  { ...item(iso, name, 'ligature', 650), char: chars },
  { ...item(fin, `${name}.fina`, 'ligature', 650), char: chars, form: 'final' as const },
]);

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export const PRESETS: PresetSet[] = [
  {
    id: 'letters',
    label: 'الحروف العربية',
    description: 'الحروف الهجائية وأشكال الهمزة والتاء المربوطة والألف المقصورة (36 محرفاً).',
    items: LETTERS.map(([cp, n]) => item(cp, n, 'letter', 600)),
  },
  {
    id: 'forms',
    label: 'أشكال الحروف (بداية ووسط ونهاية)',
    description: 'الأشكال التي يحتاجها كل حرف بحسب اتصاله: ثلاثة للمتصل من الجهتين وواحد للمتصل بما قبله فقط. تُفعَّل تلقائياً بميزات init وmedi وfina (81 محرفاً).',
    items: FORMS,
  },
  {
    id: 'ligatures',
    label: 'لام ألف (ترابط)',
    description: 'أربعة ترابطات للام مع الألف وأنواعها، ولكل منها شكل متصل بما قبله. تعمل بميزة rlig وتحتاج أشكال اللام والألف أولاً (8 محارف).',
    items: LIGATURES,
  },
  {
    id: 'marks',
    label: 'علامات التشكيل',
    description: 'الفتحة والضمة والكسرة والشدة والسكون والتنوين (8 علامات، عرضها صفر).',
    items: MARKS.map(([cp, n]) => item(cp, n, 'diacritic', 0)),
  },
  {
    id: 'arabicDigits',
    label: 'الأرقام العربية',
    description: 'الأرقام الشرقية من ٠ إلى ٩.',
    items: WORDS.map((w, i) => item(0x0660 + i, `${w}.ar`, 'number', 560)),
  },
  {
    id: 'latinDigits',
    label: 'الأرقام اللاتينية',
    description: 'الأرقام من 0 إلى 9.',
    items: WORDS.map((w, i) => item(0x0030 + i, w, 'number', 560)),
  },
  {
    id: 'punct',
    label: 'الفراغ وعلامات الترقيم',
    description: 'الفراغ والنقطة والفاصلة والفاصلة العربية وعلامة الاستفهام العربية والشرطة والنقطتان.',
    items: [
      item(0x0020, 'space', 'symbol', 250),
      item(0x002e, 'period', 'symbol', 260),
      item(0x002c, 'comma', 'symbol', 260),
      item(0x060c, 'comma.ar', 'symbol', 260),
      item(0x061b, 'semicolon.ar', 'symbol', 280),
      item(0x061f, 'question.ar', 'symbol', 500),
      item(0x002d, 'hyphen', 'symbol', 360),
      item(0x003a, 'colon', 'symbol', 260),
    ],
  },
];

/** ما لم يكن موجوداً في المشروع من عناصر المجموعة. */
export function missingOf(existing: Glyph[], items: NewGlyphData[]): NewGlyphData[] {
  const names = new Set(existing.map((g) => g.name));
  const codes = new Set(existing.map((g) => g.unicode.toUpperCase()).filter(Boolean));
  return items.filter((i) => !names.has(i.name) && !codes.has(i.unicode.toUpperCase()));
}
