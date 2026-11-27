import type { Contour, FontProject, Glyph, GlyphComponent } from '../types/font';
import { uid } from './fontLogic';
import { parseUnicode } from './fontBuild';
import { projectRules } from './feaParse';

/**
 * المحارف المركّبة: محرف يشير إلى محارف أخرى بالمعرّف مع إزاحة. هذا الملف هو المكان الوحيد
 * الذي يعرف كيف يُطبَّق التحويل، فإضافة التحجيم أو الدوران لاحقاً تقتصر على transformContour.
 */

type Lookup = (id: string) => Glyph | undefined;

function transformContour(c: Contour, comp: GlyphComponent, id: (old: string) => string): Contour {
  const { dx, dy } = comp;
  const mv = (v: { x: number; y: number } | null) => (v ? { x: v.x + dx, y: v.y + dy } : null);
  return {
    id: id(c.id),
    closed: c.closed,
    nodes: c.nodes.map((n) => ({ ...n, id: id(n.id), x: n.x + dx, y: n.y + dy, handleIn: mv(n.handleIn), handleOut: mv(n.handleOut) })),
  };
}

function resolveContours(g: Glyph, lookup: Lookup, id: (comp: GlyphComponent, old: string) => string, seen: Set<string>): Contour[] {
  const out = [...g.contours];
  if (!g.components?.length || seen.has(g.id)) return out;
  const next = new Set(seen).add(g.id);
  for (const comp of g.components) {
    const src = lookup(comp.ref);
    if (!src || next.has(src.id)) continue; // مرجع معلّق أو دائري: يُتجاهل
    // مسارات المصدر الفعلية (بمكوّناته هو) ثم إزاحتها
    for (const c of resolveContours(src, lookup, id, next)) out.push(transformContour(c, comp, (o) => id(comp, o)));
  }
  return out;
}

const lookupOf = (project: Pick<FontProject, 'glyphs'>): Lookup => {
  const map = new Map(project.glyphs.map((g) => [g.id, g]));
  return (i) => map.get(i);
};

/** كل محارف المشروع بمساراتها الفعلية. المحارف بلا مكوّنات تبقى الكائن نفسه فلا تُعاد رسم بطاقاتها. */
export function resolveAll(project: Pick<FontProject, 'glyphs'>): Glyph[] {
  return project.glyphs.some(hasComponents) ? project.glyphs.map((g) => resolveGlyph(project, g)) : project.glyphs;
}

export const hasComponents = (g: Glyph): boolean => !!g.components?.length;

/** المحرف بمساراته الفعلية (الخاصة + المكوّنات). المحرف بلا مكوّنات يُعاد كما هو. */
export function resolveGlyph(project: Pick<FontProject, 'glyphs'>, g: Glyph): Glyph {
  if (!hasComponents(g)) return g;
  const contours = resolveContours(g, lookupOf(project), (comp, old) => `${comp.id}:${old}`, new Set());
  return { ...g, contours, components: undefined };
}

/** يمنع إضافة مكوّن يُنشئ دورة (المحرف يرجع إلى نفسه مباشرة أو عبر غيره). */
export function wouldCycle(project: Pick<FontProject, 'glyphs'>, glyphId: string, refId: string): boolean {
  if (glyphId === refId) return true;
  const look = lookupOf(project);
  const stack = [refId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === glyphId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const c of look(cur)?.components ?? []) stack.push(c.ref);
  }
  return false;
}

/** معرّفات المحارف التي تستعمل هذا المحرف مكوّناً مباشراً. */
export function dependentsOf(project: Pick<FontProject, 'glyphs'>, glyphId: string): Glyph[] {
  return project.glyphs.filter((g) => g.components?.some((c) => c.ref === glyphId));
}

/**
 * فك الارتباط: يحوّل الرسم الناتج إلى مسارات مستقلة بمعرّفات جديدة ويزيل المكوّنات.
 * الشكل بعد الفك مطابق نقطة بنقطة للشكل قبله. بلا `only` يُفك كل المكوّنات، ومعه يُفك ما يشير إلى المعرّفات المعطاة فقط.
 */
export function detachComponents(project: Pick<FontProject, 'glyphs'>, g: Glyph, only?: Set<string>): Glyph {
  if (!hasComponents(g)) return g;
  const look = lookupOf(project);
  const keep: GlyphComponent[] = [];
  const out = [...g.contours];
  for (const comp of g.components!) {
    if (only && !only.has(comp.ref)) { keep.push(comp); continue; }
    const src = look(comp.ref);
    if (!src || src.id === g.id) continue;
    const flat = resolveGlyph(project, src);
    for (const c of flat.contours) out.push(transformContour(c, comp, () => uid('id')));
  }
  return { ...g, contours: out, components: keep.length ? keep : undefined };
}

/** يفك ارتباط مكوّن واحد (بمعرّفه) ويبقي بقية المكوّنات: يُضاف رسمه الناتج إلى مسارات المحرف بالشكل نفسه. */
export function detachOne(project: Pick<FontProject, 'glyphs'>, g: Glyph, compId: string): Glyph {
  const target = g.components?.find((c) => c.id === compId);
  if (!target) return g;
  const d = detachComponents(project, { ...g, components: [target] });
  const rest = g.components!.filter((c) => c.id !== compId);
  return { ...d, components: rest.length ? rest : undefined };
}

/** يضيف مكوّناً بإزاحة صفر. يعيد null إن كان يُنشئ دورة أو كان المرجع غير موجود. */
export function addComponent(project: Pick<FontProject, 'glyphs'>, g: Glyph, refId: string): Glyph | null {
  if (!project.glyphs.some((x) => x.id === refId) || wouldCycle(project, g.id, refId)) return null;
  return { ...g, components: [...(g.components ?? []), { id: uid('comp'), ref: refId, dx: 0, dy: 0 }] };
}

/** يحرّك مكوّناً بإزاحة نسبية (dx, dy). لا يلمس المحرف المرجعي. */
export function moveComponent(g: Glyph, compId: string, dx: number, dy: number): Glyph {
  return { ...g, components: g.components?.map((c) => (c.id === compId ? { ...c, dx: c.dx + dx, dy: c.dy + dy } : c)) };
}

/**
 * حذف محارف: يفك ارتباط كل محرف يعتمد عليها (يبقى شكله كما هو) ثم يحذفها.
 * يُرجع قائمة المحارف الجديدة، والمحارف التي فُك ارتباطها لعرضها في التحذير.
 */
export function removeWithDetach(project: Pick<FontProject, 'glyphs'>, ids: string[]): { glyphs: Glyph[]; detached: Glyph[] } {
  const gone = new Set(ids);
  const detached: Glyph[] = [];
  const glyphs: Glyph[] = [];
  for (const g of project.glyphs) {
    if (gone.has(g.id)) continue;
    if (g.components?.some((c) => gone.has(c.ref))) {
      // الفك يتم على المشروع الأصلي قبل الحذف حتى تتوفر مصادره
      const d = detachComponents(project, g, gone);
      detached.push(d);
      glyphs.push(d);
    } else glyphs.push(g);
  }
  return { glyphs, detached };
}

/**
 * مشروع جاهز للبناء: كل محرف بمساراته الفعلية بلا مراجع، والمحارف المساعدة الداخلية البحتة
 * (بلا رمز ولا قاعدة ولا تقارب ولا إزاحة تتتالي، وتُستعمل مكوّناً فقط) لا تُصدَّر.
 */
export function flattenForExport(project: FontProject): FontProject {
  if (!project.glyphs.some(hasComponents)) return project;
  const used = new Set<string>();
  for (const g of project.glyphs) for (const c of g.components ?? []) used.add(c.ref);
  const rules = projectRules(project).rules;
  const named = new Set<string>();
  for (const r of rules) { r.from.forEach((n) => named.add(n)); named.add(r.to); }
  for (const k of project.kerning ?? []) { named.add(k.left); named.add(k.right); }
  for (const r of project.cascades ?? []) named.add(r.glyph);
  const isHelper = (g: Glyph) => used.has(g.id) && parseUnicode(g.unicode) === null && !named.has(g.name);
  const glyphs = project.glyphs.filter((g) => !isHelper(g) || project.source?.useOriginal).map((g) => resolveGlyph(project, g));
  return { ...project, glyphs };
}
