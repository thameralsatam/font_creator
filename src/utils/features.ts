import { type Glyph, type GlyphForm, type NewGlyphData } from '../types/font';

/*
  ميزات الأوبن تايب الأساسية للخط العربي، تُستخرج تلقائياً من أسماء المحارف:
    beh        الشكل المنفصل (الأساسي، له رمز يونيكود)
    beh.init   شكل البداية   → ميزة init
    beh.medi   شكل الوسط    → ميزة medi
    beh.fina   شكل النهاية   → ميزة fina
    beh.isol   منفصل بديل    → ميزة isol
    lam_alef        ترابط لام وألف في أول الكلمة       → ميزة rlig
    lam_alef.fina   ترابط لام وألف متصل بما قبله       → ميزة rlig
  لا حاجة لكتابة أي كود: يكفي اتباع هذه التسمية.
*/

export type FormSuffix = 'init' | 'medi' | 'fina' | 'isol';
export type FeatureTag = FormSuffix | 'rlig';

export const FEATURE_INFO: Record<FeatureTag, { label: string; description: string }> = {
  isol: { label: 'المنفصل', description: 'يُستعمل الحرف حين لا يتصل بما قبله ولا بما بعده.' },
  init: { label: 'البداية', description: 'يُستعمل الحرف في أول الكلمة متصلاً بما بعده.' },
  medi: { label: 'الوسط', description: 'يُستعمل الحرف في وسط الكلمة متصلاً من الجهتين.' },
  fina: { label: 'النهاية', description: 'يُستعمل الحرف في آخر الكلمة متصلاً بما قبله.' },
  rlig: { label: 'الروابط', description: 'يستبدل حرفين متتاليين بمحرف واحد مثل لام وألف.' },
};

export const FEATURE_ORDER: FeatureTag[] = ['isol', 'fina', 'medi', 'init', 'rlig'];

const SUFFIXES: readonly string[] = ['init', 'medi', 'fina', 'isol'];
const FORM_OF: Record<FormSuffix, GlyphForm> = {
  init: 'initial',
  medi: 'medial',
  fina: 'final',
  isol: 'isolated',
};

export function splitName(name: string): { base: string; suffix: FormSuffix | null } {
  const i = name.lastIndexOf('.');
  if (i > 0 && SUFFIXES.includes(name.slice(i + 1))) {
    return { base: name.slice(0, i), suffix: name.slice(i + 1) as FormSuffix };
  }
  return { base: name, suffix: null };
}

/** نوع الاتصال: D يتصل من الجهتين، R يتصل بما قبله فقط، U لا يتصل. */
export type Joining = 'D' | 'R' | 'U';

export const JOINING: Record<string, Joining> = {
  hamza: 'U',
  alefMadda: 'R', alefHamzaAbove: 'R', wawHamza: 'R', alefHamzaBelow: 'R', alef: 'R',
  yehHamza: 'D', beh: 'D', tehMarbuta: 'R', teh: 'D', theh: 'D', jeem: 'D', hah: 'D', khah: 'D',
  dal: 'R', thal: 'R', reh: 'R', zain: 'R', seen: 'D', sheen: 'D', sad: 'D', dad: 'D',
  tah: 'D', zah: 'D', ain: 'D', ghain: 'D', feh: 'D', qaf: 'D', kaf: 'D', lam: 'D', meem: 'D',
  noon: 'D', heh: 'D', waw: 'R', alefMaksura: 'R', yeh: 'D',
};

export function formsFor(j: Joining): FormSuffix[] {
  return j === 'D' ? ['init', 'medi', 'fina'] : j === 'R' ? ['fina'] : [];
}

/**
 * رموز يونيكود للأشكال المعزولة والمتصلة من كتلة أشكال العرض أ/ب (Presentation Forms A/B).
 * القيمة الأساسية هي الشكل المنفصل (isol)، وتُحسب البقية بإضافة الإزاحة:
 * isol: 0, fina: 1, init: 2, medi: 3 (حسب ترتيب اليونيكود القياسي).
 */
export const PRESENTATION: Record<string, number> = {
  hamza: 0xfe80,
  alefMadda: 0xfe81, // isol, fina
  alefHamzaAbove: 0xfe83, // isol, fina
  wawHamza: 0xfe85, // isol, fina
  alefHamzaBelow: 0xfe87, // isol, fina
  alef: 0xfe8d, // isol, fina
  yehHamza: 0xfe89, // isol, fina, init, medi
  beh: 0xfe8f,
  tehMarbuta: 0xfe93, // isol, fina
  teh: 0xfe95,
  theh: 0xfe99,
  jeem: 0xfe9d,
  hah: 0xfea1,
  khah: 0xfea5,
  dal: 0xfea9, // isol, fina
  thal: 0xfeab, // isol, fina
  reh: 0xfead, // isol, fina
  zain: 0xfeaf, // isol, fina
  seen: 0xfeb1,
  sheen: 0xfeb5,
  sad: 0xfeb9,
  dad: 0xfebd,
  tah: 0xfec1,
  zah: 0xfec5,
  ain: 0xfec9,
  ghain: 0xfecd,
  feh: 0xfed1,
  qaf: 0xfed5,
  kaf: 0xfed9,
  lam: 0xfedd,
  meem: 0xfee1,
  noon: 0xfee5,
  heh: 0xfee9,
  waw: 0xfeed, // isol, fina
  alefMaksura: 0xfeef, // isol, fina
  yeh: 0xfef1,
};

const OFFSET: Record<FormSuffix, number> = {
  isol: 0,
  fina: 1,
  init: 2,
  medi: 3,
};

/** يُرجع رمز يونيكود لشكل الحرف (مثل U+FE90 لـ beh.fina) أو نصاً فارغاً إن لم يوجد. */
export function formUnicode(base: string, suffix: FormSuffix): string {
  const baseCode = PRESENTATION[base];
  if (baseCode === undefined) return '';
  const code = baseCode + OFFSET[suffix];
  return `U+${code.toString(16).toUpperCase()}`;
}

export interface Rule {
  feature: FeatureTag;
  kind: 'single' | 'ligature';
  from: string[];
  to: string;
}

export interface FeatureReport {
  rules: Rule[];
  /** مشكلات: محرف ينقصه ما يلزم ليعمل. */
  gaps: Array<{ glyph: string; message: string }>;
  /** محارف شكلها المختار لا يطابق لاحقة اسمها. */
  mismatches: string[];
}

function isLigature(g: Glyph): boolean {
  return g.category === 'ligature' && splitName(g.name).base.includes('_');
}

export function computeFeatures(glyphs: Glyph[]): FeatureReport {
  const names = new Set(glyphs.map((g) => g.name));
  const rules: Rule[] = [];
  const gaps: FeatureReport['gaps'] = [];
  const mismatches: string[] = [];

  for (const g of glyphs) {
    const { base, suffix } = splitName(g.name);

    if (isLigature(g)) {
      const parts = base.split('_');
      const firstForm: FormSuffix = suffix === 'fina' ? 'medi' : 'init';
      const need = parts.map((p, i) => `${p}.${i === 0 ? firstForm : i === parts.length - 1 ? 'fina' : 'medi'}`);
      const missing = need.filter((n) => !names.has(n));
      if (missing.length) {
        gaps.push({ glyph: g.name, message: `ينقص: ${missing.join('، ')}` });
      } else {
        rules.push({ feature: 'rlig', kind: 'ligature', from: need, to: g.name });
      }
      continue;
    }

    if (suffix) {
      // إن كان المحرف هو المنفصل beh.isol، فهو نفسه الأصل لباقي الأشكال إن لم يوجد beh
      if (suffix === 'isol') {
        if (names.has(base)) {
          rules.push({ feature: 'isol', kind: 'single', from: [base], to: g.name });
        }
        if (g.form !== 'isolated') mismatches.push(g.name);
        continue;
      }

      // الأشكال الأخرى (init, medi, fina) تبحث عن base أو base.isol كأصل
      const source = names.has(base) ? base : names.has(`${base}.isol`) ? `${base}.isol` : null;
      if (!source) {
        gaps.push({ glyph: g.name, message: `لا يوجد المحرف الأساسي ${base}` });
        continue;
      }
      rules.push({ feature: suffix, kind: 'single', from: [source], to: g.name });
      if (g.form !== FORM_OF[suffix]) mismatches.push(g.name);
    } else if (g.form !== 'isolated') {
      mismatches.push(g.name);
    }
  }

  rules.sort(
    (a, b) =>
      FEATURE_ORDER.indexOf(a.feature) - FEATURE_ORDER.indexOf(b.feature) || a.to.localeCompare(b.to)
  );
  return { rules, gaps, mismatches };
}

/** الأشكال الناقصة لكل حرف موجود في المشروع بحسب نوع اتصاله. */
export function missingForms(glyphs: Glyph[]): NewGlyphData[] {
  const names = new Set(glyphs.map((g) => g.name));
  const out: NewGlyphData[] = [];
  const handled = new Set<string>();
  for (const g of glyphs) {
    const { base, suffix } = splitName(g.name);
    // نتجاهل الأشكال المشتقة عدا المنفصل (beh.isol يصلح أصلاً كالحرف المجرد)
    if (suffix && suffix !== 'isol') continue;
    if (handled.has(base)) continue;
    handled.add(base);
    const j = JOINING[base];
    if (!j) continue;
    for (const s of formsFor(j)) {
      const name = `${base}.${s}`;
      if (names.has(name)) continue;
      out.push({
        char: g.char,
        name,
        unicode: formUnicode(base, s),
        category: 'letter',
        form: FORM_OF[s],
        advanceWidth: g.advanceWidth,
      });
    }
  }
  return out;
}

export function ruleToFea(r: Rule): string {
  return r.kind === 'single' ? `sub ${r.from[0]} by ${r.to};` : `sub ${r.from.join(' ')} by ${r.to};`;
}

/** كود FEA للقواعد المستخرجة. */
export function rulesToFea(report: FeatureReport): string {
  const blocks: string[] = [];
  for (const tag of FEATURE_ORDER) {
    const rs = report.rules.filter((r) => r.feature === tag);
    if (rs.length === 0) continue;
    blocks.push(`feature ${tag} {\n${rs.map((r) => `    ${ruleToFea(r)}`).join('\n')}\n} ${tag};`);
  }
  return blocks.join('\n\n');
}

/** ترتيب الإضافة في opentype.js: أبجدي للوسوم. */
export function rulesForBuild(report: FeatureReport): Rule[] {
  return [...report.rules].sort(
    (a, b) => a.feature.localeCompare(b.feature) || (a.kind === b.kind ? 0 : a.kind === 'single' ? -1 : 1)
  );
}
