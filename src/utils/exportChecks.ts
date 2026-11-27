import type { FontProject, Glyph } from '../types/font';
import { flattenForExport } from './composites';
import { getGlyphBounds } from './pathGeometry';
import { isRtl, t } from '../i18n';

/**
 * فحوص ما قبل التصدير لما يصل إلى الملف بصمت: العلامات التي لن تتموضع، والتشكيل المتراكب،
 * وأشكال الحروف المتصلة التي لا تبلغ حافة العرض. تُرجع تنبيهات لا أخطاء.
 */
const SEP = () => (isRtl() ? '، ' : ', ');
const list = (names: string[]) =>
  names.length <= 4 ? names.join(SEP()) : t('{names} و{n} أخرى', { names: names.slice(0, 4).join(SEP()), n: names.length - 4 });

const has = (g: Glyph, ...names: string[]) => g.anchors.some((a) => names.includes(a.name));
const isMark = (g: Glyph) => g.category === 'diacritic';
const isLetter = (g: Glyph) => g.category === 'letter' || g.category === 'ligature';

/** سماحية الملامسة بوحدات الخط. */
const EDGE_TOLERANCE = 1;

export function exportAnchorChecks(raw: FontProject): string[] {
  const out: string[] = [];
  // الفحص على ما سيُصدَّر فعلاً: مسارات وارتكازات المكوّنات والموروثة داخلة
  const glyphs = flattenForExport(raw).glyphs;
  const marks = glyphs.filter(isMark);

  const noAnchor = marks.filter((g) => !has(g, 'top', 'bottom'));
  if (noAnchor.length) out.push(t('علامات تشكيل بلا نقطة ارتكاز، فلن تتموضع على الحروف: {names}.', { names: list(noAnchor.map((g) => g.name)) }));

  // لكل جهة: حروف بلا الارتكاز المقابل لعلامات تلك الجهة
  const sides = [
    { attach: 'top', stack: 'markTop', label: t('فوق') },
    { attach: 'bottom', stack: 'markBottom', label: t('تحت') },
  ];
  for (const side of sides) {
    const ofSide = marks.filter((g) => (has(g, 'top') ? 'top' : has(g, 'bottom') ? 'bottom' : '') === side.attach);
    if (ofSide.length === 0) continue;
    const missing = glyphs.filter((g) => isLetter(g) && g.contours.length > 0 && !has(g, side.attach));
    if (missing.length)
      out.push(t('حروف بلا نقطة ارتكاز «{side}» تقابل علامات التشكيل، فلن تستقر عليها: {names}.', { side: side.label, names: list(missing.map((g) => g.name)) }));
    if (ofSide.length >= 2 && !ofSide.some((g) => has(g, side.stack)))
      out.push(
        t('علامات تشكيل من جهة «{side}» لا تملك أي منها نقطة «{side} العلامة»، فستتراكب فوق بعضها إذا اجتمعت (كالشدة والفتحة): {names}.', {
          side: side.label,
          names: list(ofSide.map((g) => g.name)),
        })
      );
  }
  return out;
}

export function joinEdgeChecks(raw: FontProject): string[] {
  const project = flattenForExport(raw);
  // مشروع يعتمد نقطتي دخول وخروج يضبط الاتصال بغير الحافة، فلا نحكم عليه بالحافة
  if (project.glyphs.some((g) => has(g, 'entry', 'exit'))) return [];
  const bad: string[] = [];
  for (const g of project.glyphs) {
    if (!isLetter(g) || g.form === 'isolated') continue;
    const b = getGlyphBounds(g);
    if (!b) continue;
    const joinsLeft = g.form === 'initial' || g.form === 'medial';
    const joinsRight = g.form === 'final' || g.form === 'medial';
    if ((joinsLeft && b.xMin > EDGE_TOLERANCE) || (joinsRight && b.xMax < g.advanceWidth - EDGE_TOLERANCE)) bad.push(g.name);
  }
  return bad.length ? [t('أشكال متصلة لا يصل رسمها إلى حافة العرض فيظهر فراغ عند الاتصال بالحرف المجاور: {names}.', { names: list(bad) })] : [];
}
