/** أحرف نص الاختبار التي لا محرف لها في المشروع. المتصفح يرسمها بخط آخر فتبدو كأنها من خطك. */
export function missingChars(text: string, glyphs: ReadonlyArray<{ unicode?: string }>): string[] {
  const have = new Set<number>();
  for (const g of glyphs) {
    const m = /^U\+([0-9A-Fa-f]{4,6})$/.exec(g.unicode ?? '');
    if (m) have.add(parseInt(m[1], 16));
  }
  const out: string[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (/\s/.test(ch) || cp === 0x200c || cp === 0x200d || have.has(cp) || out.includes(ch)) continue;
    out.push(ch);
  }
  return out;
}
