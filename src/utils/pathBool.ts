import { type Contour, type PathNode } from '../types/font';
import { uid } from './fontLogic';

export type BoolOp = 'unite' | 'subtract' | 'intersect';

const r2 = (n: number) => Math.round(n * 100) / 100 + 0;

/**
 * عمليات منطقية على مسارات مغلقة (دمج، طرح، تقاطع) تحافظ على المنحنيات.
 * المسار الأول في الترتيب هو الأساس، والباقي يُدمج معه أو يُطرح منه أو يُقاطَع. كل مسار يُعامل شكلاً مستقلاً.
 * المكتبة تُحمَّل عند أول استعمال فقط.
 * يعيد null إن فشلت العملية أو خرجت بلا نتيجة.
 */
export async function booleanContours(shapes: Contour[], op: BoolOp): Promise<Contour[] | null> {
  if (shapes.length < 2) return null;
  const mod = await import('paper/dist/paper-core.js');
  const paper = (mod as unknown as { default: typeof import('paper') }).default ?? (mod as unknown as typeof import('paper'));
  const scope = new paper.PaperScope();
  scope.setup(new paper.Size(10, 10));
  const toPath = (c: Contour) =>
    new scope.Path({
      segments: c.nodes.map((n) => new scope.Segment(
        new scope.Point(n.x, n.y),
        n.handleIn ? new scope.Point(n.handleIn.x, n.handleIn.y) : undefined,
        n.handleOut ? new scope.Point(n.handleOut.x, n.handleOut.y) : undefined
      )),
      closed: true,
      insert: false,
    });
  try {
    let acc: paper.PathItem = toPath(shapes[0]);
    for (const s of shapes.slice(1)) {
      const p = toPath(s);
      acc = op === 'unite' ? acc.unite(p, { insert: false }) : op === 'subtract' ? acc.subtract(p, { insert: false }) : acc.intersect(p, { insert: false });
    }
    const paths: paper.Path[] =
      acc instanceof scope.CompoundPath ? (acc.children as paper.Path[]) : acc instanceof scope.Path ? [acc] : [];
    const out: Contour[] = paths
      .filter((p) => p.segments.length >= 3 && Math.abs(p.area) > 1)
      .map((p) => ({
        id: uid('contour'),
        closed: true,
        nodes: p.segments.map((sg): PathNode => ({
          id: uid('node'),
          x: r2(sg.point.x),
          y: r2(sg.point.y),
          kind: 'corner',
          handleIn: sg.handleIn.length > 0.01 ? { x: r2(sg.handleIn.x), y: r2(sg.handleIn.y) } : null,
          handleOut: sg.handleOut.length > 0.01 ? { x: r2(sg.handleOut.x), y: r2(sg.handleOut.y) } : null,
        })),
      }));
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}
