import type { FontMetrics } from '../types/font';

export interface InkBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * موضع ابتدائي لنقطة ارتكاز جاهزة. يُحسب من رسم المحرف نفسه حتى لا تطفو العلامة بعيداً عن الحرف:
 * - حرف عادي: «فوق» و«تحت» خارج الحبر بمسافة قصيرة، عند مركزه أفقياً.
 * - علامة تشكيل: نقطتها على الحافة التي تلامس الحرف (حافتها السفلى لـ«فوق»، العليا لـ«تحت»).
 * - «دخول» و«خروج» عند حافتي العرض.
 * بلا رسم يبقى الوضع القديم المبني على المقاييس.
 */
export function defaultAnchorPos(name: string, isMark: boolean, advance: number, m: FontMetrics, ink: InkBox | null): [number, number] {
  const mid = Math.round(advance / 2);
  if (name === 'entry') return [advance, Math.round(m.xHeight / 2)];
  if (name === 'exit') return [0, Math.round(m.xHeight / 2)];
  if (name === 'markTop' || name === 'markBottom') {
    if (!ink) return [mid, name === 'markTop' ? m.ascender : m.descender];
    const g = Math.round(m.upm * 0.06);
    return [Math.round((ink.xMin + ink.xMax) / 2), Math.round(name === 'markTop' ? ink.yMax + g : ink.yMin - g)];
  }
  if (name !== 'top' && name !== 'bottom') return [mid, 0];
  if (!ink) return [mid, name === 'top' ? m.ascender : m.descender];
  const cx = Math.round((ink.xMin + ink.xMax) / 2);
  const gap = Math.round(m.upm * 0.06);
  if (isMark) return [cx, Math.round(name === 'top' ? ink.yMin : ink.yMax)];
  return [cx, Math.round(name === 'top' ? ink.yMax + gap : ink.yMin - gap)];
}
