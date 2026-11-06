import { roundCorners, removeRedundant } from '../../utils/pathOps';
import { booleanContours, type BoolOp } from '../../utils/pathBool';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Contour, type FontMetrics, type Glyph, type Vec } from '../../types/font';
import {
  LIMITS,
  addContourWithNode,
  allNodeIds,
  appendNode,
  autoSmoothNodes,
  boundsOfTouched,
  centerInAdvance,
  clampAdvance,
  closeContour,
  closeContours,
  constrainAngle,
  cornerNodes,
  countNodes,
  deleteNodes,
  duplicateContours,
  fixDirections,
  flipHFn,
  flipVFn,
  hitContour,
  hitEndpoint,
  hitHandle,
  hitNode,
  insertNodeOnSegment,
  moveNodes,
  nearestOnContours,
  openContourAt,
  newNode,
  nodePositions,
  nodesInRect,
  removeContour,
  reverseContour,
  reverseContours,
  rotateFn,
  scaleFn,
  setHandle,
  setLsb,
  setRsb,
  setSymmetricHandles,
  signedArea,
  smoothNodes,
  mirrorNodes,
  lockNodes,
  plainNodes,
  rulerSnap,
  alignContours,
  distributeContours,
  type AlignMode,
  cloneContours,
  boundsOf,
  contoursWithNodes,
  translateAll,
  coordRange,
  snapPoint,
  transformNodes,
  wholeContourIds,
  wrongDirectionCount,
  effectiveGridStep,
  gridNudgeDelta,
  type Snapshot,
  type SnapContext,
  type SnapResult,
} from '../../utils/pathEdit';

export type ToolId = 'select' | 'move' | 'pen' | 'hand' | 'ruler';

export interface Measure {
  a: Vec;
  b: Vec;
}

/** replace = تحديد جديد، add = جمع إلى ما سبق، subtract = طرح مما سبق. */
export type SelectMode = 'replace' | 'add' | 'subtract';

export interface PointerInfo {
  world: Vec;
  screen: Vec;
  shift: boolean;
  alt: boolean;
  touch: boolean;
}

export interface Rect {
  a: Vec;
  b: Vec;
}

export interface HoverTarget {
  kind: 'node' | 'handle' | 'contour' | 'first' | 'end' | 'remove' | 'insert';
  id: string;
}

export interface PenPreview {
  from: Vec;
  fromHandle: Vec | null;
  to: Vec;
}

interface Options {
  glyph: Glyph;
  metrics: FontMetrics;
  /** مقياس العرض الحالي (بكسل لكل وحدة خط). */
  scale: number;
  /** false أثناء وضع التعليمات: لا يستجيب المحرر لأي مؤشر أو مفتاح، وتبقى حالته كما هي. */
  enabled?: boolean;
  onUpdateGlyph: (updater: (g: Glyph) => Glyph) => void;
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'measure'; pre: Snapshot; start: Vec }
  | {
      kind: 'drag';
      pre: Snapshot;
      base: Contour[];
      ids: ReadonlySet<string>;
      startWorld: Vec;
      startScreen: Vec;
      grab: Vec;
      mode: 'point' | 'delta';
      toggleId: string | null;
      moved: boolean;
    }
  | {
      kind: 'handle';
      pre: Snapshot;
      base: Contour[];
      nodeId: string;
      which: 'in' | 'out';
      origin: Vec;
      moved: boolean;
    }
  | {
      kind: 'marquee';
      pre: Snapshot;
      start: Vec;
      startScreen: Vec;
      selMode: SelectMode;
      initial: ReadonlySet<string>;
      moved: boolean;
    }
  | {
      kind: 'pen';
      pre: Snapshot;
      base: Contour[];
      nodeId: string;
      origin: Vec;
      startScreen: Vec;
      moved: boolean;
    };

const EMPTY: ReadonlySet<string> = new Set();
const HISTORY_MAX = 100;
const NUDGE_COALESCE_MS = 700;
const DRAG_PX = 3;
const PEN_DRAG_PX = 5;

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export const MSG = {
  maxNodes: `وصل المحرف إلى الحد الأقصى من النقاط (${LIMITS.maxNodes}).`,
  maxContours: `وصل المحرف إلى الحد الأقصى من المسارات (${LIMITS.maxContours}).`,
  needThree: 'يلزم ثلاث نقاط على الأقل لإغلاق المسار.',
  needSelection: 'حدد نقطة أو أكثر أولاً.',
  outOfRange: 'التحويل سيُخرج الرسم عن الحدود المسموحة للمحرف.',
  noDrawing: 'لا يوجد رسم في هذا المحرف.',
  badMetric: 'القيمة تُخرج الرسم أو العرض عن الحدود المسموحة.',
  noOpenPath: 'لا يوجد مسار مفتوح بثلاث نقاط أو أكثر ليُغلق.',
  needOneClosed: 'حدد نقطة واحدة على مسار مغلق لفتحه عندها.',
  dirsOk: 'اتجاه كل المسارات صحيح، لا حاجة لتغيير.',
  alignFail: 'لا مسارات للمحاذاة، أو ستخرج عن حدود المحرف.',
  distributeFail: 'التوزيع يحتاج ثلاثة مسارات على الأقل، أو يُخرج الرسم عن الحدود.',
  badValue: 'أدخل أرقاماً صالحة: النسبة أكبر من صفر.',
  cannotDuplicate: 'التكرار يتجاوز حدود النقاط أو المسارات أو مساحة المحرف.',
} as const;

/**
 * محرك التحرير: الأدوات والتحديد والالتصاق والتراجع والإعادة.
 * مصدر الحقيقة الوحيد للرسم هو glyph.contours. هذا المحرك يحتفظ بنسخة عمل متزامنة (work)
 * حتى لا تُقرأ قيمة قديمة بين حدثين متتاليين قبل إعادة الرسم.
 */
export function useStudioEditor({ glyph, metrics, scale, enabled = true, onUpdateGlyph }: Options) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const updateRef = useRef(onUpdateGlyph);
  updateRef.current = onUpdateGlyph;
  const guidesRef = useRef(glyph.guides);
  guidesRef.current = glyph.guides;

  /* ---------- نسخة العمل ---------- */
  const work = useRef<Snapshot>({ contours: glyph.contours, advanceWidth: glyph.advanceWidth });
  const applied = useRef<Snapshot>(work.current);
  if (
    applied.current.contours !== glyph.contours ||
    applied.current.advanceWidth !== glyph.advanceWidth
  ) {
    // تغيير خارجي (مثل تبديل المحرف): نتبنّاه
    work.current = { contours: glyph.contours, advanceWidth: glyph.advanceWidth };
    applied.current = work.current;
  }

  /* ---------- الحالة ---------- */
  const [tool, setToolState] = useState<ToolId>('select');
  const toolRef = useRef<ToolId>('select');
  const [selection, setSelectionState] = useState<ReadonlySet<string>>(EMPTY);
  const selRef = useRef<ReadonlySet<string>>(EMPTY);
  const [penId, setPenIdState] = useState<string | null>(null);
  const penRef = useRef<string | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [measure, setMeasureState] = useState<Measure | null>(null);
  const measureRef = useRef<Measure | null>(null);
  const setMeasure = (m: Measure | null) => {
    measureRef.current = m;
    setMeasureState(m);
  };
  const [preview, setPreview] = useState<PenPreview | null>(null);
  const [snapMark, setSnapMark] = useState<SnapResult | null>(null);
  const [hover, setHoverState] = useState<HoverTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [gridStep, setGridStep] = useState(50);
  const [snapGrid, setSnapGrid] = useState(true);
  const [snapPoints, setSnapPoints] = useState(true);
  const settings = useRef({ gridStep, snapGrid, snapPoints });
  settings.current = { gridStep, snapGrid, snapPoints };

  const gesture = useRef<Gesture>({ kind: 'none' });
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const [counts, setCounts] = useState({ past: 0, future: 0 });
  const noticeTimer = useRef<number | undefined>(undefined);
  const hoverRef = useRef<HoverTarget | null>(null);
  const lastDown = useRef<{ at: number; x: number; y: number; count: number } | null>(null);
  const [selectMode, setSelectModeState] = useState<SelectMode>('replace');
  const modeRef = useRef<SelectMode>('replace');
  const setSelectMode = (m: SelectMode) => {
    modeRef.current = m;
    setSelectModeState(m);
  };

  const setSelection = (ids: ReadonlySet<string>) => {
    selRef.current = ids;
    setSelectionState(ids);
  };
  const setPenId = (id: string | null) => {
    penRef.current = id;
    setPenIdState(id);
  };
  const setHover = (h: HoverTarget | null) => {
    const a = hoverRef.current;
    if (a?.kind === h?.kind && a?.id === h?.id) return;
    hoverRef.current = h;
    setHoverState(h);
  };
  const flash = (msg: string) => {
    setNotice(msg);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600);
  };
  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  /* ---------- تطبيق وتسجيل ---------- */
  const apply = (patch: Partial<Snapshot>) => {
    const next: Snapshot = { ...work.current, ...patch };
    work.current = next;
    applied.current = next;
    updateRef.current((g) => ({ ...g, contours: next.contours, advanceWidth: next.advanceWidth }));
  };

  const syncCounts = () =>
    setCounts({ past: past.current.length, future: future.current.length });

  const pushHistory = (snap: Snapshot, key?: string) => {
    const now = Date.now();
    if (key && lastKey.current?.key === key && now - lastKey.current.at < NUDGE_COALESCE_MS) {
      lastKey.current.at = now;
      return;
    }
    lastKey.current = key ? { key, at: now } : null;
    past.current.push(snap);
    if (past.current.length > HISTORY_MAX) past.current.shift();
    future.current = [];
    syncCounts();
  };

  /** تعديل مسجّل في التراجع. */
  const commit = (patch: Partial<Snapshot>, key?: string) => {
    pushHistory(work.current, key);
    apply(patch);
  };

  /** تحديد صالح: يستبعد نقاطاً حُذفت أو اختفت بالتراجع. */
  const liveSelection = (): ReadonlySet<string> => {
    const live = allNodeIds(work.current.contours);
    const out = new Set<string>();
    selRef.current.forEach((id) => {
      if (live.has(id)) out.add(id);
    });
    return out;
  };

  const penContour = (): Contour | null => {
    const id = penRef.current;
    return (id && work.current.contours.find((c) => c.id === id)) || null;
  };

  const snapCtx = (exclude?: ReadonlySet<string>): SnapContext => ({
    metrics: metricsRef.current,
    advanceWidth: work.current.advanceWidth,
    scale: scaleRef.current,
    gridStep: settings.current.gridStep,
    snapGrid: settings.current.snapGrid,
    snapPoints: settings.current.snapPoints,
    points: nodePositions(work.current.contours, exclude),
    guidesX: guidesRef.current?.filter((g) => g.axis === 'v').map((g) => g.pos),
    guidesY: guidesRef.current?.filter((g) => g.axis === 'h').map((g) => g.pos),
  });

  /* ---------- القلم ---------- */
  const finishPen = () => {
    const c = penContour();
    if (c && c.nodes.length < 2) {
      commit({ contours: removeContour(work.current.contours, c.id) });
    }
    setPenId(null);
    setPreview(null);
  };

  const setTool = (t: ToolId) => {
    if (t === toolRef.current) return;
    cancelGesture();
    finishPen();
    toolRef.current = t;
    setToolState(t);
    setMeasure(null);
    setMarquee(null);
    setSnapMark(null);
    setHover(null);
  };

  /* ---------- الإيماءات ---------- */
  const cancelGesture = () => {
    const g = gesture.current;
    if (g.kind !== 'none') {
      if (work.current.contours !== g.pre.contours || work.current.advanceWidth !== g.pre.advanceWidth) {
        apply(g.pre);
      }
      gesture.current = { kind: 'none' };
    }
    setMarquee(null);
    setSnapMark(null);
  };

  const hitRadius = (touch: boolean, mouse: number, fingers: number) =>
    (touch ? fingers : mouse) / scaleRef.current;

  /** نقطة المسطرة: التصاق بالنقاط والمقابض وحواف الشكل، ثم بخطوط المقاييس. Alt يعطّل الالتصاق. */
  const rulerPoint = (info: PointerInfo, from?: Vec): Vec => {
    if (!info.alt) {
      const hit = rulerSnap(work.current.contours, info.world, hitRadius(info.touch, 10, 16));
      if (hit) {
        setSnapMark({ x: hit.x, y: hit.y, kind: 'point' });
        return { x: hit.x, y: hit.y };
      }
    }
    // الشبكة والمقاييس حسب إعداد الالتصاق، ثم يستقيم الخط أفقياً أو رأسياً إن اقترب منهما
    const s = snapPoint(info.world, snapCtx(), info.alt);
    const pt = { x: s.x, y: s.y };
    if (from && !info.alt) {
      const thr = 6 / scaleRef.current;
      if (Math.abs(pt.x - from.x) < thr) pt.x = from.x;
      if (Math.abs(pt.y - from.y) < thr) pt.y = from.y;
    }
    setSnapMark(s.kind === 'point' || s.kind === 'metric' ? s : null);
    return pt;
  };

  const pointerDown = (info: PointerInfo) => {
    if (!enabledRef.current) return;
    const t = toolRef.current;
    if (t === 'hand') return;
    const contours = work.current.contours;
    const pre = work.current;

    if (t === 'pen') return penDown(info);

    if (t === 'ruler') {
      const start = rulerPoint(info);
      gesture.current = { kind: 'measure', pre, start };
      setMeasure({ a: start, b: start });
      return;
    }

    if (t === 'select') {
      const now = Date.now();
      const prev = lastDown.current;
      const fast = prev && now - prev.at < 380 && Math.hypot(info.screen.x - prev.x, info.screen.y - prev.y) < 8;
      const count = fast ? prev.count + 1 : 1;
      lastDown.current = { at: now, x: info.screen.x, y: info.screen.y, count };
      // مرتان على نقطة: عادية أو ناعمة. ثلاث مرات على المحيط: نقطة جديدة بين نقطتين.
      if (count === 2 && doubleClick(info, false)) return;
      if (count === 3) {
        lastDown.current = null;
        if (doubleClick(info, true)) return;
      }
      const sel = liveSelection();
      const hh = hitHandle(contours, sel, info.world, hitRadius(info.touch, 8, 14));
      if (hh) {
        const n = contours.flatMap((c) => c.nodes).find((x) => x.id === hh.nodeId);
        if (n) {
          gesture.current = {
            kind: 'handle',
            pre,
            base: contours,
            nodeId: hh.nodeId,
            which: hh.which,
            origin: { x: n.x, y: n.y },
            moved: false,
          };
          return;
        }
      }
      const hn = hitNode(contours, info.world, hitRadius(info.touch, 9, 16));
      if (hn) {
        const node = contours.flatMap((c) => c.nodes).find((x) => x.id === hn.nodeId)!;
        const mode = modeRef.current;
        if (mode === 'subtract') {
          const rest = new Set(sel);
          rest.delete(hn.nodeId);
          setSelection(rest);
          return;
        }
        let ids: ReadonlySet<string> = sel;
        let toggleId: string | null = null;
        if (mode === 'add') {
          ids = new Set([...sel, hn.nodeId]);
        } else if (info.shift) {
          if (sel.has(hn.nodeId)) toggleId = hn.nodeId;
          else ids = new Set([...sel, hn.nodeId]);
        } else if (!sel.has(hn.nodeId)) {
          ids = new Set([hn.nodeId]);
        }
        setSelection(ids);
        gesture.current = {
          kind: 'drag',
          pre,
          base: contours,
          ids,
          startWorld: info.world,
          startScreen: info.screen,
          grab: { x: node.x, y: node.y },
          mode: 'point',
          toggleId,
          moved: false,
        };
        return;
      }
      const mode = modeRef.current;
      const selMode: SelectMode = mode === 'replace' && info.shift ? 'add' : mode;
      const initial = selMode === 'replace' ? EMPTY : sel;
      if (selMode === 'replace') setSelection(EMPTY);
      gesture.current = {
        kind: 'marquee',
        pre,
        start: info.world,
        startScreen: info.screen,
        selMode,
        initial,
        moved: false,
      };
      return;
    }

    // أداة التحريك: تمسك المسار كله من جسمه
    const hc = hitContour(contours, info.world, hitRadius(info.touch, 8, 14));
    if (!hc) {
      if (!info.shift) setSelection(EMPTY);
      return;
    }
    const c = contours.find((x) => x.id === hc)!;
    const ids = new Set(c.nodes.map((n) => n.id));
    if (info.shift) liveSelection().forEach((id) => ids.add(id));
    setSelection(ids);
    gesture.current = {
      kind: 'drag',
      pre,
      base: contours,
      ids,
      startWorld: info.world,
      startScreen: info.screen,
      grab: info.world,
      mode: 'delta',
      toggleId: null,
      moved: false,
    };
  };

  const penDown = (info: PointerInfo) => {
    const m = metricsRef.current;
    const pre = work.current;
    const contours = pre.contours;
    const rEnd = hitRadius(info.touch, 10, 18);
    const pen = penContour();
    const snapped = (anchor?: Vec): Vec => {
      const s = snapPoint(info.world, snapCtx(), info.alt);
      return info.shift && anchor ? constrainAngle(anchor, s) : s;
    };

    if (pen) {
      const first = pen.nodes[0];
      if (dist(info.world, first) <= rEnd) {
        if (pen.nodes.length < 3) {
          flash(MSG.needThree);
          return;
        }
        const closed = closeContour(contours, pen.id);
        const fixed = fixDirections(closed);
        const mine = fixed.find((c) => c.id === pen.id);
        commit({ contours: closed.map((c) => (c.id === pen.id && mine ? mine : c)) });
        setPenId(null);
        setPreview(null);
        setSelection(EMPTY);
        return;
      }
      if (countNodes(contours) >= LIMITS.maxNodes) {
        flash(MSG.maxNodes);
        return;
      }
      const last = pen.nodes[pen.nodes.length - 1];
      const p = snapped(last);
      if (dist(p, last) < 1) return;
      const node = newNode(p.x, p.y);
      apply({ contours: appendNode(contours, pen.id, node) });
      setSelection(new Set([node.id]));
      gesture.current = {
        kind: 'pen',
        pre,
        base: work.current.contours,
        nodeId: node.id,
        origin: p,
        startScreen: info.screen,
        moved: false,
      };
      return;
    }

    const ep = hitEndpoint(contours, info.world, rEnd);
    if (!ep) {
      // مسار موجود (مغلق أو مفتوح): نقطة = حذفها، مقطع = إدراج نقطة عليه
      const hn = hitNode(contours, info.world, rEnd);
      if (hn) {
        commit({ contours: deleteNodes(contours, new Set([hn.nodeId])) });
        setSelection(EMPTY);
        return;
      }
      const seg = nearestOnContours(contours, info.world, hitRadius(info.touch, 8, 14));
      if (seg) {
        insertAt(seg.contourId, seg.index, seg.t, pre, info);
        return;
      }
    }
    if (ep) {
      if (ep.end === 'first') {
        apply({
          contours: contours.map((c) => (c.id === ep.contourId ? reverseContour(c) : c)),
        });
      }
      setPenId(ep.contourId);
      setSelection(new Set([ep.nodeId]));
      return;
    }

    if (contours.length >= LIMITS.maxContours) {
      flash(MSG.maxContours);
      return;
    }
    if (countNodes(contours) >= LIMITS.maxNodes) {
      flash(MSG.maxNodes);
      return;
    }
    const p = snapped();
    const node = newNode(p.x, p.y);
    const added = addContourWithNode(contours, node);
    apply({ contours: added.contours });
    setPenId(added.contourId);
    setSelection(new Set([node.id]));
    void m;
    gesture.current = {
      kind: 'pen',
      pre,
      base: work.current.contours,
      nodeId: node.id,
      origin: p,
      startScreen: info.screen,
      moved: false,
    };
  };

  /** يدرج نقطة على مقطع ويبدأ سحبها فوراً. */
  const insertAt = (contourId: string, index: number, t: number, pre: Snapshot, info: PointerInfo): boolean => {
    const res = insertNodeOnSegment(work.current.contours, contourId, index, t);
    if (!res) {
      flash(MSG.maxNodes);
      return false;
    }
    apply({ contours: res.contours });
    setSelection(new Set([res.nodeId]));
    const n = res.contours.flatMap((c) => c.nodes).find((x) => x.id === res.nodeId)!;
    gesture.current = {
      kind: 'drag',
      pre,
      base: work.current.contours,
      ids: new Set([res.nodeId]),
      startWorld: info.world,
      startScreen: info.screen,
      grab: { x: n.x, y: n.y },
      mode: 'point',
      toggleId: null,
      moved: false,
    };
    return true;
  };

  /** نقر مزدوج بأداة التحديد: على نقطة يبدّل ناعمة/زاوية، وعلى مقطع يدرج نقطة. */
  const doubleClick = (info: PointerInfo, segment: boolean): boolean => {
    const contours = work.current.contours;
    const pre = work.current;
    const hn = hitNode(contours, info.world, hitRadius(info.touch, 9, 16));
    if (hn && segment) return false;
    if (hn) {
      const node = contours.flatMap((c) => c.nodes).find((x) => x.id === hn.nodeId)!;
      const ids = new Set([hn.nodeId]);
      // له مقبضان: يرجع نقطة عادية. بلا مقبضين: يصير ناعماً تلقائياً.
      const next =
        node.handleIn || node.handleOut
          ? plainNodes(contours, ids)
          : autoSmoothNodes(contours, ids, metricsRef.current);
      commit({ contours: next });
      setSelection(ids);
      return true;
    }
    if (!segment) return false;
    const seg = nearestOnContours(contours, info.world, hitRadius(info.touch, 8, 14));
    if (seg) {
      gesture.current = { kind: 'none' };
      return insertAt(seg.contourId, seg.index, seg.t, pre, info);
    }
    return false;
  };

  const resolveHover = (info: PointerInfo): HoverTarget | null => {
    const t = toolRef.current;
    const contours = work.current.contours;
    if (t === 'pen') {
      const pen = penContour();
      const rEnd = hitRadius(info.touch, 10, 18);
      if (pen && pen.nodes.length >= 3 && dist(info.world, pen.nodes[0]) <= rEnd) {
        return { kind: 'first', id: pen.nodes[0].id };
      }
      if (!pen) {
        const ep = hitEndpoint(contours, info.world, rEnd);
        if (ep) return { kind: 'end', id: ep.nodeId };
        const hn = hitNode(contours, info.world, rEnd);
        if (hn) return { kind: 'remove', id: hn.nodeId };
        const seg = nearestOnContours(contours, info.world, hitRadius(info.touch, 8, 14));
        if (seg) return { kind: 'insert', id: `${seg.contourId}:${seg.index}:${Math.round(seg.point.x)}:${Math.round(seg.point.y)}` };
      }
      return null;
    }
    if (t === 'select') {
      const hh = hitHandle(contours, liveSelection(), info.world, hitRadius(info.touch, 8, 14));
      if (hh) return { kind: 'handle', id: `${hh.nodeId}:${hh.which}` };
      const hn = hitNode(contours, info.world, hitRadius(info.touch, 9, 16));
      return hn ? { kind: 'node', id: hn.nodeId } : null;
    }
    if (t === 'move') {
      const hc = hitContour(contours, info.world, hitRadius(info.touch, 8, 14));
      return hc ? { kind: 'contour', id: hc } : null;
    }
    return null;
  };

  const pointerMove = (info: PointerInfo) => {
    if (!enabledRef.current) return;
    const g = gesture.current;
    const m = metricsRef.current;

    if (g.kind === 'none') {
      if (info.touch) return;
      setHover(resolveHover(info));
      if (toolRef.current === 'ruler') {
        rulerPoint(info);
        return;
      }
      if (toolRef.current === 'pen') {
        const pen = penContour();
        const last = pen?.nodes[pen.nodes.length - 1];
        const s = snapPoint(info.world, snapCtx(), info.alt);
        setSnapMark(s.kind === 'point' || s.kind === 'metric' ? s : null);
        setPreview(
          pen && last
            ? {
                from: { x: last.x, y: last.y },
                fromHandle: last.handleOut,
                to: info.shift ? constrainAngle(last, s) : s,
              }
            : null
        );
      }
      return;
    }

    if (g.kind === 'measure') {
      const s = rulerPoint(info, g.start);
      const t = info.shift ? constrainAngle(g.start, s) : s;
      setMeasure({ a: g.start, b: { x: t.x, y: t.y } });
      return;
    }

    if (g.kind === 'drag') {
      if (!g.moved && dist(info.screen, g.startScreen) < DRAG_PX) return;
      g.moved = true;
      let dx: number;
      let dy: number;
      if (g.mode === 'point') {
        let target: Vec = {
          x: g.grab.x + (info.world.x - g.startWorld.x),
          y: g.grab.y + (info.world.y - g.startWorld.y),
        };
        if (info.shift) target = constrainAngle(g.grab, target);
        const s = snapPoint(target, snapCtx(g.ids), info.alt);
        const fin = info.shift ? constrainAngle(g.grab, s) : s;
        dx = fin.x - g.grab.x;
        dy = fin.y - g.grab.y;
        setSnapMark(s.kind === 'point' || s.kind === 'metric' ? s : null);
      } else {
        let v: Vec = { x: info.world.x - g.startWorld.x, y: info.world.y - g.startWorld.y };
        if (info.shift) v = constrainAngle({ x: 0, y: 0 }, v);
        const step = effectiveGridStep(settings.current.gridStep, scaleRef.current);
        const useGrid = settings.current.snapGrid && !info.alt;
        dx = useGrid ? Math.round(v.x / step) * step : Math.round(v.x);
        dy = useGrid ? Math.round(v.y / step) * step : Math.round(v.y);
      }
      apply({ contours: moveNodes(g.base, g.ids, dx, dy, m) });
      return;
    }

    if (g.kind === 'handle') {
      let target = info.world;
      const s = snapPoint(target, snapCtx(), info.alt);
      target = info.shift ? constrainAngle(g.origin, s) : s;
      g.moved = true;
      apply({
        contours: setHandle(g.base, g.nodeId, g.which, { x: target.x - g.origin.x, y: target.y - g.origin.y }, m),
      });
      setSnapMark(s.kind === 'point' || s.kind === 'metric' ? s : null);
      return;
    }

    if (g.kind === 'marquee') {
      if (!g.moved && dist(info.screen, g.startScreen) < DRAG_PX) return;
      g.moved = true;
      setMarquee({ a: g.start, b: info.world });
      const inside = nodesInRect(work.current.contours, g.start, info.world);
      const insideSet = new Set(inside);
      if (g.selMode === 'subtract') {
        setSelection(new Set([...g.initial].filter((id) => !insideSet.has(id))));
      } else {
        setSelection(new Set([...(g.selMode === 'add' ? g.initial : EMPTY), ...inside]));
      }
      return;
    }

    // القلم: سحب بعد الإضافة يصنع مقبضين متماثلين
    if (!g.moved && dist(info.screen, g.startScreen) < PEN_DRAG_PX) return;
    g.moved = true;
    const s = snapPoint(info.world, snapCtx(), info.alt);
    const t = info.shift ? constrainAngle(g.origin, s) : s;
    apply({
      contours: setSymmetricHandles(g.base, g.nodeId, { x: t.x - g.origin.x, y: t.y - g.origin.y }, m),
    });
  };

  const pointerUp = (info: PointerInfo) => {
    if (!enabledRef.current && gesture.current.kind === 'none') return;
    const g = gesture.current;
    if (g.kind === 'none') return;
    gesture.current = { kind: 'none' };
    setMarquee(null);
    setSnapMark(null);

    if (g.kind === 'measure') {
      const m = measureRef.current;
      if (m && dist(m.a, m.b) < 1) setMeasure(null);
      return;
    }
    if (g.kind === 'drag' && !g.moved && g.toggleId) {
      const next = new Set(selRef.current);
      next.delete(g.toggleId);
      setSelection(next);
    }
    const changed =
      work.current.contours !== g.pre.contours || work.current.advanceWidth !== g.pre.advanceWidth;
    if (changed) pushHistory(g.pre);
    void info;
  };

  const pointerLeave = () => {
    if (gesture.current.kind !== 'none') return;
    setHover(null);
    setPreview(null);
    setSnapMark(null);
  };

  /* ---------- تراجع وإعادة ---------- */
  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    cancelGesture();
    future.current.push(work.current);
    lastKey.current = null;
    apply(prev);
    setPenId(null);
    setPreview(null);
    setSelection(liveSelection());
    syncCounts();
  };

  /** يتراجع عدة خطوات دفعة واحدة (أو كل الخطوات المتاحة إن كان العدد أكبر). */
  const undoMany = (n: number) => {
    for (let i = 0; i < n && past.current.length > 0; i++) undo();
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    cancelGesture();
    past.current.push(work.current);
    lastKey.current = null;
    apply(next);
    setPenId(null);
    setPreview(null);
    setSelection(liveSelection());
    syncCounts();
  };

  /* ---------- أوامر ---------- */
  /** التحويلات تعمل دائماً على مسارات كاملة: المسارات التي فيها تحديد، أو المحرف كله. */
  const targetIds = (): ReadonlySet<string> => {
    const sel = liveSelection();
    return sel.size > 0 ? wholeContourIds(work.current.contours, sel) : allNodeIds(work.current.contours);
  };

  const selectAll = () => {
    setSelection(allNodeIds(work.current.contours));
  };

  const clearSelection = () => setSelection(EMPTY);
  const hasMeasure = () => measureRef.current !== null;
  const clearMeasure = () => setMeasure(null);

  /** المسارات التي فيها تحديد (لحفظها وصلة). */
  const selectedContours = (): Contour[] => contoursWithNodes(work.current.contours, liveSelection());

  /** يدرج وصلة (مراكزها عند الأصل) في وسط المحرف ويحددها لتحريكها. */
  const insertConnector = (incoming: Contour[]) => {
    if (incoming.length === 0) return;
    const m = metricsRef.current;
    const at = { x: Math.round(work.current.advanceWidth / 2), y: Math.round(m.xHeight / 2) };
    const placed = cloneContours(translateAll(incoming, at.x, at.y));
    const b = boundsOf(placed);
    const r = coordRange(m);
    if (b && (b.xMin < r.xMin || b.xMax > r.xMax || b.yMin < r.yMin || b.yMax > r.yMax)) return flash(MSG.outOfRange);
    const next = [...work.current.contours, ...placed];
    if (next.length > LIMITS.maxContours) return flash(MSG.maxContours);
    if (countNodes(next) > LIMITS.maxNodes) return flash(MSG.maxNodes);
    commit({ contours: fixDirections(next) });
    setSelection(allNodeIds(placed));
  };

  const deleteSelection = () => {
    const sel = liveSelection();
    if (sel.size === 0) {
      flash(MSG.needSelection);
      return;
    }
    const wasPen = penContour();
    commit({ contours: deleteNodes(work.current.contours, sel) });
    if (wasPen && !penContour()) setPenId(null);
    setSelection(EMPTY);
  };

  const nudge = (dx: number, dy: number) => {
    const sel = liveSelection();
    if (sel.size === 0) return;
    const next = moveNodes(work.current.contours, sel, dx, dy, metricsRef.current);
    if (next === work.current.contours) return;
    commit({ contours: next }, 'nudge');
  };

  /**
   * تحريك باتجاه. مع الالتصاق بالشبكة: خطوة واحدة إلى أقرب خط شبكة في الاتجاه (Shift خمس خطوات)
   * مهما كانت قيمة الخطوة. بلا التصاق: free وحدة.
   */
  const nudgeDir = (ux: number, uy: number, free: number, big = false) => {
    const sel = liveSelection();
    if (sel.size === 0) return;
    if (!settings.current.snapGrid) return nudge(ux * free, uy * free);
    const b = boundsOf(work.current.contours, sel);
    if (!b) return;
    const g = effectiveGridStep(settings.current.gridStep, scaleRef.current);
    const extra = big ? g * 4 : 0;
    const dx = ux ? gridNudgeDelta((b.xMin + b.xMax) / 2, ux > 0 ? 1 : -1, g) + Math.sign(ux) * extra : 0;
    const dy = uy ? gridNudgeDelta((b.yMin + b.yMax) / 2, uy > 0 ? 1 : -1, g) + Math.sign(uy) * extra : 0;
    nudge(dx, dy);
  };

  const runTransform = (fn: (p: Vec) => Vec, mirrored: boolean) => {
    const ids = targetIds();
    if (ids.size === 0) {
      flash(MSG.noDrawing);
      return;
    }
    const next = transformNodes(work.current.contours, ids, fn, mirrored, metricsRef.current);
    if (!next) {
      flash(MSG.outOfRange);
      return;
    }
    commit({ contours: next });
  };

  const center = () => {
    const b = boundsOfTouched(work.current.contours, liveSelection());
    return b ? { cx: (b.xMin + b.xMax) / 2, cy: (b.yMin + b.yMax) / 2 } : null;
  };

  const flip = (axis: 'h' | 'v') => {
    const c = center();
    if (!c) return flash(MSG.noDrawing);
    runTransform(axis === 'h' ? flipHFn(c.cx) : flipVFn(c.cy), true);
  };

  /** deg موجبة = عكس عقارب الساعة. */
  const rotate = (deg: number) => {
    const c = center();
    if (!c) return flash(MSG.noDrawing);
    runTransform(rotateFn(c.cx, c.cy, deg), false);
  };

  const scaleBy = (k: number) => {
    // مع الالتصاق بالشبكة يثبت الركن السفلي الأيسر فيبقى الرسم على تقاطعات الشبكة
    const b = boundsOfTouched(work.current.contours, liveSelection());
    const c = b && settings.current.snapGrid ? { cx: b.xMin, cy: b.yMin } : center();
    if (!c) return flash(MSG.noDrawing);
    runTransform(scaleFn(c.cx, c.cy, k), false);
  };

  const nodeOp = (fn: (c: Contour[], ids: ReadonlySet<string>) => Contour[]) => {
    const sel = liveSelection();
    if (sel.size === 0) return flash(MSG.needSelection);
    commit({ contours: fn(work.current.contours, sel) });
  };

  const smooth = () => nodeOp(smoothNodes);
  const mirror = () => nodeOp(mirrorNodes);
  const lock = () => nodeOp(lockNodes);
  const plain = () => nodeOp(plainNodes);

  const align = (mode: AlignMode) => {
    const m = metricsRef.current;
    const box = { xMin: 0, xMax: work.current.advanceWidth, yMin: m.descender, yMax: m.ascender };
    const next = alignContours(work.current.contours, liveSelection(), mode, box, m);
    if (!next) return flash(MSG.alignFail);
    commit({ contours: next });
  };

  const distribute = (axis: 'h' | 'v') => {
    const next = distributeContours(work.current.contours, liveSelection(), axis, metricsRef.current);
    if (!next) return flash(MSG.distributeFail);
    commit({ contours: next });
  };

  /** تدوير وتحجيم بقيم دقيقة حول نقطة ارتكاز من صندوق المحدد (ix من اليسار 0 إلى اليمين 2، iy من الأسفل 0 إلى الأعلى 2). */
  const transformPrecise = (o: { rotate: number; scaleX: number; scaleY: number; ix: number; iy: number }) => {
    const { rotate: deg, scaleX, scaleY, ix, iy } = o;
    if (![deg, scaleX, scaleY].every(Number.isFinite) || scaleX <= 0 || scaleY <= 0) return flash(MSG.badValue);
    const b = boundsOfTouched(work.current.contours, liveSelection());
    if (!b) return flash(MSG.noDrawing);
    const px = b.xMin + ((b.xMax - b.xMin) * ix) / 2;
    const py = b.yMin + ((b.yMax - b.yMin) * iy) / 2;
    const kx = scaleX / 100;
    const ky = scaleY / 100;
    const a = (deg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    runTransform((p) => {
      const x = (p.x - px) * kx;
      const y = (p.y - py) * ky;
      return { x: px + x * cos - y * sin, y: py + x * sin + y * cos };
    }, false);
  };
  const corner = () => nodeOp(cornerNodes);
  const autoSmooth = () => nodeOp((c, ids) => autoSmoothNodes(c, ids, metricsRef.current));

  const reverse = () => {
    const before = work.current.contours;
    if (before.length === 0) return flash(MSG.noDrawing);
    const next = reverseContours(before, liveSelection());
    commit({ contours: next });
    const n = next.filter((c, i) => c !== before[i]).length;
    const one = next.find((c, i) => c !== before[i]);
    flash(
      n === 1 && one && one.closed && one.nodes.length >= 3
        ? `انعكس اتجاه المسار، وهو الآن ${signedArea(one) > 0 ? 'عكس' : 'مع'} عقارب الساعة.`
        : `انعكس اتجاه ${n} مسار.`
    );
  };

  /** تقريب الزوايا الحادة في المحدد بنصف قطر معطى. */
  const roundSelected = (radius: number) => {
    const sel = liveSelection();
    if (sel.size === 0) return flash('حدّد الزوايا التي تريد تقريبها أولاً.');
    const r = roundCorners(work.current.contours, sel, Math.max(1, radius));
    if (r.count === 0) return flash('لا توجد في التحديد زاوية حادة ضلعاها مستقيمان.');
    if (countNodes(r.contours) > LIMITS.maxNodes) return flash(MSG.maxNodes);
    commit({ contours: r.contours });
    setSelection(new Set(r.newIds));
    flash(`قُرّبت ${r.count} زاوية.`);
  };

  /** حذف النقاط الزائدة في المحدد (أو في المحرف كله إن لم يوجد تحديد). */
  const simplifyPaths = () => {
    const r = removeRedundant(work.current.contours, liveSelection());
    if (r.removed === 0) return flash('لا توجد نقاط زائدة.');
    commit({ contours: r.contours });
    flash(`حُذفت ${r.removed} نقطة زائدة.`);
  };

  /** دمج أو طرح أو تقاطع المسارات المغلقة المحددة. الأول في الترتيب هو الأساس. */
  const booleanOp = async (op: BoolOp) => {
    const before = work.current.contours;
    const picked = new Set(selectedContours().map((c) => c.id));
    const shapes = before.filter((c) => picked.has(c.id) && c.closed && c.nodes.length >= 3);
    if (shapes.length < 2) return flash('حدّد مسارين مغلقين على الأقل (بنقطة من كل واحد).');
    flash('جارٍ التنفيذ...');
    const res = await booleanContours(shapes, op);
    if (work.current.contours !== before) return flash('تغيّر الرسم أثناء العملية، أعد المحاولة.');
    if (!res) return flash(op === 'intersect' ? 'لا يوجد تقاطع بين المسارات.' : 'تعذّرت العملية على هذه المسارات.');
    const at = before.findIndex((c) => picked.has(c.id) && shapes.includes(c));
    const rest = before.filter((c) => !shapes.includes(c));
    const next = [...rest.slice(0, at), ...res, ...rest.slice(at)];
    if (next.length > LIMITS.maxContours) return flash(MSG.maxContours);
    if (countNodes(next) > LIMITS.maxNodes) return flash(MSG.maxNodes);
    commit({ contours: fixDirections(next) });
    setSelection(allNodeIds(res));
    flash(op === 'unite' ? 'تم الدمج.' : op === 'subtract' ? 'تم الطرح.' : 'تم أخذ التقاطع.');
  };

  const autoDirection = () => {
    const before = work.current.contours;
    if (before.length === 0) return flash(MSG.noDrawing);
    const n = wrongDirectionCount(before);
    if (n === 0) return flash(MSG.dirsOk);
    commit({ contours: fixDirections(before) });
    flash(`صُحّح اتجاه ${n} مسار: الخارجي عكس عقارب الساعة والثقوب معها.`);
  };

  const closeSelected = () => {
    const before = work.current.contours;
    const closed = closeContours(before, liveSelection());
    if (!closed.some((c, i) => c !== before[i])) return flash(MSG.noOpenPath);
    const fixed = fixDirections(closed);
    // الاتجاه يُصحَّح للمسارات التي أُغلقت الآن فقط
    const next = closed.map((c, i) => (c !== before[i] ? fixed[i] : c));
    commit({ contours: next });
    if (penRef.current && !penContour()) setPenId(null);
    if (penContour()?.closed) {
      setPenId(null);
      setPreview(null);
    }
  };

  const openAtSelected = () => {
    const sel = liveSelection();
    const c = sel.size === 1 ? work.current.contours.find((x) => x.closed && x.nodes.some((n) => sel.has(n.id))) : null;
    if (!c) return flash(MSG.needOneClosed);
    commit({ contours: openContourAt(work.current.contours, [...sel][0]) });
  };

  const duplicate = () => {
    const res = duplicateContours(work.current.contours, liveSelection(), 40, -40, metricsRef.current);
    if (!res) return flash(MSG.cannotDuplicate);
    commit({ contours: res.contours });
    setSelection(res.newIds);
  };

  /** يضيف مسارات (من ملف SVG مثلاً) إلى الرسم أو يستبدله بها. يُسجَّل في التراجع. */
  const importContours = (incoming: Contour[], advanceWidth: number, replace: boolean) => {
    const base = replace ? [] : work.current.contours;
    const next = [...base, ...incoming];
    if (next.length > LIMITS.maxContours) return flash(MSG.maxContours);
    if (countNodes(next) > LIMITS.maxNodes) return flash(MSG.maxNodes);
    const fixed = fixDirections(next);
    const patch: Partial<Snapshot> = { contours: fixed };
    if (replace || base.length === 0) patch.advanceWidth = clampAdvance(advanceWidth, metricsRef.current);
    commit(patch);
    setSelection(allNodeIds(incoming.length ? fixed.filter((c) => incoming.some((i) => i.id === c.id)) : []));
  };

  const setAdvance = (v: number) => {
    const next = clampAdvance(v, metricsRef.current);
    if (next === work.current.advanceWidth) return;
    commit({ advanceWidth: next });
  };

  const applySnapshot = (s: Snapshot | null) => {
    if (!s) return flash(MSG.badMetric);
    commit(s);
  };
  const changeLsb = (v: number) => applySnapshot(setLsb(work.current, v, metricsRef.current));
  const changeRsb = (v: number) => applySnapshot(setRsb(work.current, v, metricsRef.current));
  const centerGlyph = () => applySnapshot(centerInAdvance(work.current, metricsRef.current));

  /* ---------- تبديل المحرف ---------- */
  useEffect(() => {
    past.current = [];
    future.current = [];
    lastKey.current = null;
    gesture.current = { kind: 'none' };
    penRef.current = null;
    selRef.current = EMPTY;
    setPenIdState(null);
    setMeasure(null);
    setSelectionState(EMPTY);
    setPreview(null);
    setMarquee(null);
    setSnapMark(null);
    setHover(null);
    setCounts({ past: 0, future: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glyph.id]);

  /* ---------- لوحة المفاتيح ---------- */
  const latest = useRef({
    undo, redo, selectAll, clearSelection, deleteSelection, nudge, setTool, finishPen, duplicate, hasMeasure, clearMeasure, nudgeDir,
  });
  latest.current = { undo, redo, selectAll, clearSelection, deleteSelection, nudge, setTool, finishPen, duplicate, hasMeasure, clearMeasure, nudgeDir };

  useEffect(() => {
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const onButton = (t: EventTarget | null) => t instanceof HTMLElement && t.tagName === 'BUTTON';

    const down = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (!enabledRef.current) return;
      const L = latest.current;
      const mod = e.ctrlKey || e.metaKey;

      if (mod) {
        if (e.code === 'KeyZ') {
          e.preventDefault();
          if (e.shiftKey) L.redo();
          else L.undo();
        } else if (e.code === 'KeyY') {
          e.preventDefault();
          L.redo();
        } else if (e.code === 'KeyA') {
          e.preventDefault();
          L.selectAll();
        } else if (e.code === 'KeyD') {
          e.preventDefault();
          L.duplicate();
        }
        return;
      }
      if (e.altKey) return;

      switch (e.code) {
        case 'Space':
          if (!onButton(e.target)) {
            e.preventDefault();
            setSpaceHeld(true);
          }
          return;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          L.deleteSelection();
          return;
        case 'Escape':
          if (document.querySelector('[role="menu"]')) return;
          if (penRef.current) L.finishPen();
          else if (L.hasMeasure()) L.clearMeasure();
          else L.clearSelection();
          return;
        case 'Enter':
          if (!onButton(e.target) && penRef.current) L.finishPen();
          return;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          const step = e.shiftKey ? 10 : 1;
          const dx = e.code === 'ArrowLeft' ? -step : e.code === 'ArrowRight' ? step : 0;
          const dy = e.code === 'ArrowDown' ? -step : e.code === 'ArrowUp' ? step : 0;
          e.preventDefault();
          L.nudgeDir(Math.sign(dx), Math.sign(dy), step, e.shiftKey);
          return;
        }
        case 'KeyV':
          L.setTool('select');
          return;
        case 'KeyM':
          L.setTool('move');
          return;
        case 'KeyP':
          L.setTool('pen');
          return;
        case 'KeyH':
          L.setTool('hand');
          return;
        case 'KeyR':
          L.setTool('ruler');
          return;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    const blur = () => setSpaceHeld(false);

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  /* ---------- قيم للواجهة ---------- */
  const liveIds = useMemo(() => allNodeIds(glyph.contours), [glyph.contours]);
  const shownSelection = useMemo(() => {
    const out = new Set<string>();
    selection.forEach((id) => {
      if (liveIds.has(id)) out.add(id);
    });
    return out as ReadonlySet<string>;
  }, [selection, liveIds]);

  const activePen = penId ? glyph.contours.find((c) => c.id === penId) ?? null : null;
  const handleNodeIds = useMemo(() => {
    const out = new Set<string>(shownSelection);
    if (activePen) out.add(activePen.nodes[activePen.nodes.length - 1].id);
    return out as ReadonlySet<string>;
  }, [shownSelection, activePen]);

  return {
    tool,
    setTool,
    selection: shownSelection,
    handleNodeIds,
    penContourId: activePen ? activePen.id : null,
    marquee,
    preview,
    snapMark,
    hover,
    notice,
    notify: flash,
    spaceHeld,
    canUndo: counts.past > 0,
    canRedo: counts.future > 0,
    settings: { gridStep, snapGrid, snapPoints },
    setGridStep,
    setSnapGrid,
    setSnapPoints,
    pointerDown,
    pointerMove,
    pointerUp,
    pointerLeave,
    cancelGesture,
    undo,
    redo,
    selectAll,
    clearSelection,
    deleteSelection,
    finishPen,
    flip,
    rotate,
    scaleBy,
    smooth,
    corner,
    autoSmooth,
    nudge,
    selectMode,
    setSelectMode,
    reverse,
    autoDirection,
    undoMany,
    roundSelected,
    simplifyPaths,
    booleanOp,
    closeSelected,
    openAtSelected,
    duplicate,
    importContours,
    insertConnector,
    selectedContours,
    measure,
    clearMeasure,
    mirror,
    lock,
    plain,
    align,
    distribute,
    transformPrecise,
    nudgeDir,
    setAdvance,
    changeLsb,
    changeRsb,
    centerGlyph,
  };
}

export type StudioEditor = ReturnType<typeof useStudioEditor>;
