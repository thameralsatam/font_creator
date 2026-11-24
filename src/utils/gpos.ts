import { type FontProject } from '../types/font';

/**
 * كتابة جداول الموضع (GPOS) وتصنيف المحارف (GDEF) وحقنها في ملف الخط.
 * المكتبة التي تبني الخط لا تكتب هذه الجداول، فنكتبها هنا بأنفسنا:
 * - ضبط المسافة بين زوج محارف (كيرننغ): نوع 2 صيغة 1.
 * - تموضع علامات التشكيل على الحروف بنقاط الارتكاز: نوع 4 صيغة 1.
 * - إزاحة الحروف اللاحقة (حركة تتابعية): سياق متسلسل نوع 8 صيغة 3 يستدعي إزاحة مفردة نوع 1.
 */

export interface PairAdjust {
  first: number;
  second: number;
  /** تغيير تقدّم المحرف الأول، بوحدات الخط. سالب يقرّب التالي. */
  value: number;
}

export interface MarkAnchors {
  /** صف الفئات: الفئة 0 «فوق» والفئة 1 «تحت» ما لم يُحدَّد classCount (خط مستورد بفئاته الأصلية). */
  marks: Array<{ gid: number; cls: number; x: number; y: number }>;
  bases: Array<{ gid: number; anchors: Array<Anchor | null> }>;
  /** عدد الفئات؛ 2 افتراضياً. */
  classCount?: number;
}
export interface Anchor {
  x: number;
  y: number;
}

export interface CascadeAdjust {
  /** أرقام المحارف التي تبدأ بها الإزاحة (لها الإزاحة والمدى نفسهما). */
  triggers: number[];
  dy: number;
  /** عدد الحروف المتأثرة بعد المحرف (1 إلى MAX_CASCADE_SPAN). */
  span: number;
}
export interface CascadeData {
  rules: CascadeAdjust[];
  /** أرقام الحروف التي تُحسب ضمن الكلمة وتُزاح (الفراغ وعلامات الترقيم وعلامات التشكيل خارجها). */
  letters: number[];
}
export const MAX_CASCADE_SPAN = 12;

class W {
  private b: number[] = [];
  u16(n: number) {
    this.b.push((n >> 8) & 255, n & 255);
    return this;
  }
  i16(n: number) {
    return this.u16(n & 0xffff);
  }
  u32(n: number) {
    this.b.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
    return this;
  }
  tag(t: string) {
    for (let i = 0; i < 4; i++) this.b.push(t.charCodeAt(i) & 255);
    return this;
  }
  bytes(a: ArrayLike<number>) {
    for (let i = 0; i < a.length; i++) this.b.push(a[i]);
    return this;
  }
  get length() {
    return this.b.length;
  }
  done() {
    return Uint8Array.from(this.b);
  }
}

const clamp16 = (n: number) => Math.max(-32768, Math.min(32767, Math.round(n)));

function coverage(gids: number[]): Uint8Array {
  const w = new W().u16(1).u16(gids.length);
  gids.forEach((g) => w.u16(g));
  return w.done();
}

/** صيغة 1: مجموعات أزواج لكل محرف أول. تُقسَّم إلى جداول فرعية حتى لا تتجاوز 64 كيلوبايت. */
function pairSubtables(pairs: PairAdjust[]): Uint8Array[] {
  const byFirst = new Map<number, Map<number, number>>();
  for (const p of pairs) {
    if (!byFirst.has(p.first)) byFirst.set(p.first, new Map());
    byFirst.get(p.first)!.set(p.second, clamp16(p.value));
  }
  const firsts = [...byFirst.keys()].sort((a, b) => a - b);
  const out: Uint8Array[] = [];
  let chunk: number[] = [];
  let size = 0;
  const flush = () => {
    if (chunk.length === 0) return;
    out.push(buildPairSubtable(chunk, byFirst));
    chunk = [];
    size = 0;
  };
  for (const f of firsts) {
    const add = 2 + 4 * byFirst.get(f)!.size + 4;
    if (size + add > 50000) flush();
    chunk.push(f);
    size += add;
  }
  flush();
  return out;
}

function buildPairSubtable(firsts: number[], byFirst: Map<number, Map<number, number>>): Uint8Array {
  const n = firsts.length;
  const cov = coverage(firsts);
  const sets = firsts.map((f) => {
    const m = byFirst.get(f)!;
    const seconds = [...m.keys()].sort((a, b) => a - b);
    const w = new W().u16(seconds.length);
    seconds.forEach((s) => w.u16(s).i16(m.get(s)!));
    return w.done();
  });
  const headerLen = 10 + 2 * n;
  const covOff = headerLen;
  let off = covOff + cov.length;
  const w = new W().u16(1).u16(covOff).u16(0x0004).u16(0).u16(n);
  sets.forEach((s) => {
    w.u16(off);
    off += s.length;
  });
  w.bytes(cov);
  sets.forEach((s) => w.bytes(s));
  return w.done();
}

function markBaseSubtable(m: MarkAnchors): Uint8Array {
  const marks = [...m.marks].sort((a, b) => a.gid - b.gid);
  const bases = [...m.bases].sort((a, b) => a.gid - b.gid);
  const markCov = coverage(marks.map((x) => x.gid));
  const baseCov = coverage(bases.map((x) => x.gid));
  const anchor = (x: number, y: number) => new W().u16(1).i16(clamp16(x)).i16(clamp16(y)).done();

  const ma = new W().u16(marks.length);
  marks.forEach((mk, i) => ma.u16(mk.cls).u16(2 + 4 * marks.length + 6 * i));
  marks.forEach((mk) => ma.bytes(anchor(mk.x, mk.y)));
  const markArray = ma.done();

  const cc = m.classCount ?? 2;
  const ba = new W().u16(bases.length);
  let k = 0;
  const anchorBytes: Uint8Array[] = [];
  bases.forEach((b) => {
    for (let c = 0; c < cc; c++) {
      const a = b.anchors[c];
      if (!a) {
        ba.u16(0);
        continue;
      }
      ba.u16(2 + 2 * cc * bases.length + 6 * k++);
      anchorBytes.push(anchor(a.x, a.y));
    }
  });
  anchorBytes.forEach((a) => ba.bytes(a));
  const baseArray = ba.done();

  const markCovOff = 12;
  const baseCovOff = markCovOff + markCov.length;
  const markArrOff = baseCovOff + baseCov.length;
  const baseArrOff = markArrOff + markArray.length;
  return new W()
    .u16(1).u16(markCovOff).u16(baseCovOff).u16(cc).u16(markArrOff).u16(baseArrOff)
    .bytes(markCov).bytes(baseCov).bytes(markArray).bytes(baseArray)
    .done();
}

interface Lookup {
  type: number;
  subtables: Uint8Array[];
  feature: string;
  /** هل تُدرج في قائمة ميزة؟ (الإزاحات المفردة تُستدعى من السياق فقط). */
  inFeature?: boolean;
  /** علم البحث، مثل 8 لتجاهل العلامات. */
  flag?: number;
}

function lookupBytes(l: Lookup): Uint8Array {
  const n = l.subtables.length;
  const head = 6 + 2 * n;
  const w = new W().u16(l.type).u16(l.flag ?? 0).u16(n);
  let off = head;
  l.subtables.forEach((s) => {
    w.u16(off);
    off += s.length;
  });
  l.subtables.forEach((s) => w.bytes(s));
  return w.done();
}

/** إزاحة مفردة رأسية: نوع 1 صيغة 1، قيمة YPlacement فقط. */
function singleYSubtable(gids: number[], dy: number): Uint8Array {
  const cov = coverage(gids);
  return new W().u16(1).u16(6 + 2).u16(0x0002).i16(clamp16(dy)).bytes(cov).done();
}

/** سياق متسلسل صيغة 3: خلف المدخل `backs` (الأقرب أولاً)، والمدخل واحد، ثم يستدعي بحثاً واحداً. */
function chainSubtable(backs: Uint8Array[], input: Uint8Array, lookupIndex: number): Uint8Array {
  const n = backs.length;
  const head = 2 + 2 + 2 * n + 2 + 2 + 2 + 2 + 4;
  const w = new W().u16(3).u16(n);
  let off = head;
  const covOffs: number[] = [];
  for (const b of backs) {
    covOffs.push(off);
    off += b.length;
  }
  covOffs.forEach((o) => w.u16(o));
  const inOff = off;
  w.u16(1).u16(inOff);
  off += input.length;
  w.u16(0); // لا نظر للأمام
  w.u16(1).u16(0).u16(lookupIndex);
  backs.forEach((b) => w.bytes(b));
  w.bytes(input);
  return w.done();
}

/**
 * تحويل قواعد الإزاحة التتابعية إلى بحوث: إزاحة مفردة لكل قيمة، وبحث سياقي واحد.
 * قاعدة (محرف م، المسافة k) تعني: المحرف م ثم k حرفاً ثم حرف مُدخل ← يُزاح المُدخل.
 * ترتيب القواعد بحسب k تصاعدياً فيحكم أقرب محرف مُحفِّز، ولا تتراكم الإزاحات.
 */
function cascadeLookups(c: CascadeData, firstIndex: number): Lookup[] {
  const rules = c.rules.filter((r) => r.triggers.length && r.dy !== 0 && c.letters.length);
  if (!rules.length) return [];
  const dys = [...new Set(rules.map((r) => Math.round(r.dy)))];
  const singles: Lookup[] = dys.map((dy) => ({ type: 1, subtables: [singleYSubtable(c.letters, dy)], feature: 'dist', inFeature: false }));
  const lettersCov = coverage(c.letters);
  const subs: Array<{ k: number; bytes: Uint8Array }> = [];
  for (const r of rules) {
    const li = firstIndex + dys.indexOf(Math.round(r.dy));
    const trig = coverage([...new Set(r.triggers)].sort((a, b) => a - b));
    const span = Math.max(1, Math.min(MAX_CASCADE_SPAN, r.span || MAX_CASCADE_SPAN));
    for (let k = 0; k < span; k++) {
      const backs = [...Array(k).fill(lettersCov), trig] as Uint8Array[];
      subs.push({ k, bytes: chainSubtable(backs, lettersCov, li) });
    }
  }
  subs.sort((a, b) => a.k - b.k);
  const chain: Lookup = { type: 8, subtables: subs.map((s) => s.bytes), feature: 'dist', flag: 0x0008 };
  return [...singles, chain];
}

/** يبني جدول GPOS كاملاً، أو null إن لم يوجد ما يُكتب. */
export function buildGpos(pairs: PairAdjust[], marks: MarkAnchors | null, cascade: CascadeData | null = null): Uint8Array | null {
  const lookups: Lookup[] = [];
  // الإزاحة التتابعية أولاً: التشكيل يُوضَع بعدها فيتبع الحرف بعد إزاحته
  if (cascade) lookups.push(...cascadeLookups(cascade, 0));
  const pairTables = pairs.length > 0 ? pairSubtables(pairs) : [];
  if (pairTables.length) lookups.push({ type: 2, subtables: pairTables, feature: 'kern' });
  if (marks && marks.marks.length > 0 && marks.bases.length > 0) {
    lookups.push({ type: 4, subtables: [markBaseSubtable(marks)], feature: 'mark' });
  }
  if (lookups.length === 0) return null;

  // قائمة الميزات مرتبة بالاسم، وكل ميزة تشير إلى بحثها
  const feats = lookups
    .map((l, i) => ({ tag: l.feature, idx: i, inFeature: l.inFeature !== false }))
    .filter((f) => f.inFeature)
    .sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const featureTables = feats.map((f) => new W().u16(0).u16(1).u16(f.idx).done());
  const fl = new W().u16(feats.length);
  let off = 2 + 6 * feats.length;
  feats.forEach((f, i) => {
    fl.tag(f.tag).u16(off);
    off += featureTables[i].length;
  });
  featureTables.forEach((t) => fl.bytes(t));
  const featureList = fl.done();

  // كل الخطوط (DFLT وarab وlatn) تستعمل كل الميزات
  const langSys = new W().u16(0).u16(0xffff).u16(feats.length);
  feats.forEach((_, i) => langSys.u16(i));
  const ls = langSys.done();
  const scriptTable = new W().u16(4).u16(0).bytes(ls).done();
  const scripts = ['DFLT', 'arab', 'latn'];
  const sl = new W().u16(scripts.length);
  const scriptHead = 2 + 6 * scripts.length;
  scripts.forEach((s, i) => sl.tag(s).u16(scriptHead + i * scriptTable.length));
  scripts.forEach(() => sl.bytes(scriptTable));
  const scriptList = sl.done();

  const lks = lookups.map(lookupBytes);
  const ll = new W().u16(lks.length);
  let lo = 2 + 2 * lks.length;
  lks.forEach((b) => {
    ll.u16(lo);
    lo += b.length;
  });
  lks.forEach((b) => ll.bytes(b));
  const lookupList = ll.done();

  const scriptOff = 10;
  const featureOff = scriptOff + scriptList.length;
  const lookupOff = featureOff + featureList.length;
  return new W()
    .u16(1).u16(0).u16(scriptOff).u16(featureOff).u16(lookupOff)
    .bytes(scriptList).bytes(featureList).bytes(lookupList)
    .done();
}


interface LayoutPlan {
  lookups: Lookup[];
  /** ميزات جديدة تستدعي بحوثاً بأرقامها المطلقة في القائمة الجديدة. */
  features: Array<{ tag: string; lookups: number[] }>;
}
interface MergeOpts {
  /** الخطوط (scripts) التي تُوصَل بها الميزات الجديدة؛ null لكلها. يُنشأ الخط إن لم يوجد. */
  scripts: string[] | null;
  /** إن وُجدت في اللغة ميزة بالوسم نفسه تُضاف البحوث إليها بدل إنشاء ميزة مكررة (المشكّل يأخذ أول ميزة بالوسم). */
  reuse: boolean;
}

/**
 * يدمج بحوثاً وميزات جديدة في جدول GSUB أو GPOS أصلي دون المساس ببحوثه: الجديدة تُلحق بعد الأصلية (فلا يتغير ترقيم شيء)،
 * وتُوصَل الميزات بلغات الخطوط المطلوبة. يعيد null إن تعذّر (جدول غير مفهوم أو تجاوز حدود الإزاحات).
 * المخرج: الأقسام الجديدة ثم نسخة كاملة من الجدول الأصلي تبقى بحوثه فيها كما هي.
 */
function mergeLayout(orig: Uint8Array, plan: (firstIndex: number) => LayoutPlan, opts: MergeOpts): Uint8Array | null {
  const dv = new DataView(orig.buffer, orig.byteOffset, orig.byteLength);
  const u16 = (o: number) => (o + 2 <= orig.length ? dv.getUint16(o) : -1);
  if (orig.length < 10 || u16(0) !== 1) return null;
  if (u16(2) === 1 && orig.length >= 14 && dv.getUint32(10) !== 0) return null; // تغيّرات ميزات: غير مدعومة
  const scriptOff = u16(4);
  const featOff = u16(6);
  const lookOff = u16(8);
  if (scriptOff <= 0 || featOff <= 0 || lookOff <= 0) return null;

  // قائمة البحوث الأصلية
  const n = u16(lookOff);
  if (n < 0) return null;
  const oldLookups: number[] = [];
  for (let i = 0; i < n; i++) {
    const o = u16(lookOff + 2 + 2 * i);
    if (o < 0) return null;
    oldLookups.push(lookOff + o); // موضع مطلق في الجدول الأصلي
  }
  const { lookups: added, features: extra } = plan(n);
  if (!added.length || !extra.length) return null;

  // قائمة الميزات: نسخها ثم إدخال الجديدة بحسب الترتيب الأبجدي
  const fc = u16(featOff);
  if (fc < 0) return null;
  type Feat = { tag: string; lookups: number[]; old: number };
  const feats: Feat[] = [];
  for (let i = 0; i < fc; i++) {
    const r = featOff + 2 + 6 * i;
    if (r + 6 > orig.length) return null;
    const tag = String.fromCharCode(orig[r], orig[r + 1], orig[r + 2], orig[r + 3]);
    const ft = featOff + u16(r + 4);
    const cnt = u16(ft + 2);
    if (cnt < 0) return null;
    const lookups: number[] = [];
    for (let j = 0; j < cnt; j++) {
      const v = u16(ft + 4 + 2 * j);
      if (v < 0) return null;
      lookups.push(v);
    }
    feats.push({ tag, lookups, old: i });
  }
  const fresh: Feat[] = extra.map((e) => ({ tag: e.tag, lookups: [...e.lookups], old: -1 }));
  // الجديدة بعد كل ما يساويها أو يسبقها أبجدياً (الفرز مستقر)
  let order: Feat[] = [...feats, ...fresh].sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  const newIndexOf = (oldIdx: number) => order.findIndex((f) => f.old === oldIdx);
  const freshIdx = (tag: string) => order.findIndex((f) => f.old === -1 && f.tag === tag);

  // قائمة الخطوط: إعادة كتابة كل لغة مع إضافة الميزات الجديدة للخطوط المطلوبة
  const sc = u16(scriptOff);
  if (sc < 0) return null;
  const langBytes = (idx: number[], req: number) => {
    idx.sort((a, b) => a - b);
    const w = new W().u16(0).u16(req).u16(idx.length);
    idx.forEach((v) => w.u16(v));
    return w.done();
  };
  /** يضيف الميزات الجديدة إلى فهارس لغة هدف: يعيد استعمال ميزة بالوسم نفسه إن وُجدت وإلا يصل الميزة الجديدة. */
  const usedFresh = new Set<string>();
  const wire = (idx: number[]) => {
    for (const e of fresh) {
      const hit = opts.reuse ? idx.find((i) => order[i].tag === e.tag && order[i].old !== -1) : undefined;
      if (hit !== undefined) {
        for (const l of e.lookups) if (!order[hit].lookups.includes(l)) order[hit].lookups.push(l);
      } else {
        usedFresh.add(e.tag);
        if (!idx.includes(freshIdx(e.tag))) idx.push(freshIdx(e.tag));
      }
    }
  };
  const langSysBytes = (at: number, target: boolean): Uint8Array | null => {
    const req = u16(at + 2);
    const cnt = u16(at + 4);
    if (req < 0 || cnt < 0) return null;
    const idx: number[] = [];
    for (let i = 0; i < cnt; i++) {
      const v = u16(at + 6 + 2 * i);
      if (v < 0 || v >= fc) return null;
      idx.push(newIndexOf(v));
    }
    if (target) wire(idx);
    return langBytes(idx, req === 0xffff ? 0xffff : newIndexOf(req));
  };
  const isTarget = (tag: string) => opts.scripts === null || opts.scripts.includes(tag);
  const buildScripts = (): Array<{ tag: string; bytes: Uint8Array }> | null => {
  const scriptTables: Array<{ tag: string; bytes: Uint8Array }> = [];
  for (let i = 0; i < sc; i++) {
    const r = scriptOff + 2 + 6 * i;
    if (r + 6 > orig.length) return null;
    const tag = String.fromCharCode(orig[r], orig[r + 1], orig[r + 2], orig[r + 3]);
    const target = isTarget(tag);
    const st = scriptOff + u16(r + 4);
    const defOff = u16(st);
    const lc = u16(st + 2);
    if (defOff < 0 || lc < 0) return null;
    const langs: Array<{ tag: string; bytes: Uint8Array }> = [];
    for (let j = 0; j < lc; j++) {
      const lr = st + 4 + 6 * j;
      const lt = String.fromCharCode(orig[lr], orig[lr + 1], orig[lr + 2], orig[lr + 3]);
      const b = langSysBytes(st + u16(lr + 4), target);
      if (!b) return null;
      langs.push({ tag: lt, bytes: b });
    }
    let def: Uint8Array | null = null;
    if (defOff !== 0) {
      def = langSysBytes(st + defOff, target);
      if (!def) return null;
    } else if (langs.length === 0 && target) {
      const idx: number[] = [];
      wire(idx);
      def = langBytes(idx, 0xffff);
    }
    const head = 4 + 6 * langs.length;
    const w = new W().u16(def ? head : 0).u16(langs.length);
    let off = head + (def ? def.length : 0);
    langs.forEach((l) => {
      w.tag(l.tag).u16(off);
      off += l.bytes.length;
    });
    if (def) w.bytes(def);
    langs.forEach((l) => w.bytes(l.bytes));
    scriptTables.push({ tag, bytes: w.done() });
  }
  // خط مطلوب غير موجود في الجدول الأصلي: يُنشأ بلغة افتراضية تحمل الميزات الجديدة
  for (const tag of opts.scripts ?? []) {
    if (scriptTables.some((t) => t.tag === tag)) continue;
    const idx: number[] = [];
    wire(idx);
    const def = langBytes(idx, 0xffff);
    scriptTables.push({ tag, bytes: new W().u16(4).u16(0).bytes(def).done() });
  }
  scriptTables.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
  return scriptTables;
  };
  let scriptTables = buildScripts();
  if (!scriptTables) return null;
  // ميزات جديدة لم يستعملها أحد (دُمجت بحوثها في ميزات موجودة) لا تُكتب؛ ثم تُعاد كتابة الخطوط بالفهارس الجديدة
  if (fresh.some((e) => !usedFresh.has(e.tag))) {
    order = order.filter((f) => f.old !== -1 || usedFresh.has(f.tag));
    scriptTables = buildScripts();
    if (!scriptTables) return null;
  }
  const sl = new W().u16(scriptTables.length);
  let so = 2 + 6 * scriptTables.length;
  scriptTables.forEach((t) => {
    sl.tag(t.tag).u16(so);
    so += t.bytes.length;
  });
  scriptTables.forEach((t) => sl.bytes(t.bytes));
  const scriptList = sl.done();

  const featTables = order.map((f) => {
    const w = new W().u16(0).u16(f.lookups.length);
    f.lookups.forEach((v) => w.u16(v));
    return w.done();
  });
  const fl = new W().u16(order.length);
  let fo = 2 + 6 * order.length;
  order.forEach((f, i) => {
    fl.tag(f.tag).u16(fo);
    fo += featTables[i].length;
  });
  featTables.forEach((t) => fl.bytes(t));
  const featureList = fl.done();

  // قائمة البحوث الجديدة: القديمة تشير إلى النسخة الأصلية المحفوظة آخر الجدول
  const addedBytes = added.map(lookupBytes);
  const listLen = 2 + 2 * (n + added.length);
  const addedLen = addedBytes.reduce((a, b) => a + b.length, 0);
  const head = 10;
  const total = head + scriptList.length + featureList.length + listLen + addedLen;
  const origStart = total; // بداية نسخة الجدول الأصلي داخل المخرج
  const listStartAbs = head + scriptList.length + featureList.length;
  const ll = new W().u16(n + added.length);
  for (const abs of oldLookups) {
    const rel = origStart + abs - listStartAbs;
    if (rel > 0xffff) return null;
    ll.u16(rel);
  }
  let ao = listLen;
  addedBytes.forEach((b) => {
    ll.u16(ao);
    ao += b.length;
  });
  const out = new W()
    .u16(1).u16(0).u16(head).u16(head + scriptList.length).u16(listStartAbs)
    .bytes(scriptList).bytes(featureList).bytes(ll.done());
  addedBytes.forEach((b) => out.bytes(b));
  out.bytes(orig);
  return out.done();
}

/** يدمج الإزاحة التتابعية في جدول GPOS أصلي (ميزة dist لكل لغة في كل خط). */
export function mergeCascadeIntoGpos(orig: Uint8Array, cascade: CascadeData): Uint8Array | null {
  return mergeLayout(
    orig,
    (n) => {
      const added = cascadeLookups(cascade, n);
      return { lookups: added, features: added.length ? [{ tag: 'dist', lookups: [n + added.length - 1] }] : [] };
    },
    { scripts: null, reuse: false }
  );
}

/**
 * يدمج قواعد علامة-قاعدة جديدة (محارف أُضيفت بعد الاستيراد) في GPOS أصلي بفئات العلامات الأصلية نفسها،
 * فتتموضع علامات الخط الأصلية فوق المحارف الجديدة. تُضاف إلى ميزة mark الموجودة في كل لغة.
 */
export function mergeMarkBasesIntoGpos(orig: Uint8Array, lookups: MarkAnchors[]): Uint8Array | null {
  if (!lookups.length) return null;
  return mergeLayout(
    orig,
    (n) => ({
      lookups: lookups.map((m) => ({ type: 4, feature: 'mark', subtables: [markBaseSubtable(m)] })),
      features: [{ tag: 'mark', lookups: lookups.map((_, i) => n + i) }],
    }),
    { scripts: null, reuse: true }
  );
}

export interface GsubAdditions {
  singles: Array<{ feature: string; from: number; to: number }>;
  ligatures: Array<{ feature: string; from: number[]; to: number }>;
}

/** استبدال مفرد: نوع 1 صيغة 2 (قائمة بدائل بترتيب التغطية). */
function singleSubstSubtable(pairs: Array<{ from: number; to: number }>): Uint8Array {
  const sorted = [...pairs].sort((a, b) => a.from - b.from);
  const w = new W().u16(2).u16(6 + 2 * sorted.length).u16(sorted.length);
  sorted.forEach((p) => w.u16(p.to));
  w.bytes(coverage(sorted.map((p) => p.from)));
  return w.done();
}

/** استبدال بحرف مركّب: نوع 4 صيغة 1، مجموعة لكل محرف أول، والأطول أولاً داخل المجموعة. */
function ligatureSubstSubtable(ligs: Array<{ from: number[]; to: number }>): Uint8Array {
  const byFirst = new Map<number, Array<{ rest: number[]; to: number }>>();
  for (const l of ligs) byFirst.set(l.from[0], [...(byFirst.get(l.from[0]) ?? []), { rest: l.from.slice(1), to: l.to }]);
  const firsts = [...byFirst.keys()].sort((a, b) => a - b);
  const sets = firsts.map((f) => {
    const items = byFirst.get(f)!.sort((a, b) => b.rest.length - a.rest.length);
    const tables = items.map((it) => {
      const w = new W().u16(it.to).u16(it.rest.length + 1);
      it.rest.forEach((g) => w.u16(g));
      return w.done();
    });
    const w = new W().u16(tables.length);
    let off = 2 + 2 * tables.length;
    tables.forEach((t) => {
      w.u16(off);
      off += t.length;
    });
    tables.forEach((t) => w.bytes(t));
    return w.done();
  });
  const cov = coverage(firsts);
  const head = 6 + 2 * sets.length;
  const w = new W().u16(1).u16(head).u16(sets.length);
  let off = head + cov.length;
  sets.forEach((s) => {
    w.u16(off);
    off += s.length;
  });
  w.bytes(cov);
  sets.forEach((s) => w.bytes(s));
  return w.done();
}

/**
 * يدمج قواعد استبدال جديدة (أشكال الحروف والحروف المركّبة) في جدول GSUB أصلي دون تغيير بحوثه.
 * الميزة الموجودة أصلاً بالوسم نفسه في لغة الخط arab تُضاف إليها البحوث الجديدة، وغير الموجودة تُنشأ.
 */
export function mergeRulesIntoGsub(orig: Uint8Array, add: GsubAdditions): Uint8Array | null {
  // لا جدول أصلي: نبدأ من جدول فارغ صالح (قوائم الخطوط والميزات والبحوث فارغة)
  const base = orig.length ? orig : Uint8Array.from([0, 1, 0, 0, 0, 10, 0, 12, 0, 14, 0, 0, 0, 0, 0, 0]);
  return mergeLayout(
    base,
    (n) => {
      const lookups: Lookup[] = [];
      const features: Array<{ tag: string; lookups: number[] }> = [];
      const tags = [...new Set([...add.singles.map((r) => r.feature), ...add.ligatures.map((r) => r.feature)])].sort();
      for (const tag of tags) {
        const idxs: number[] = [];
        const seen = new Set<number>();
        const singles = add.singles.filter((r) => r.feature === tag && !seen.has(r.from) && seen.add(r.from));
        if (singles.length) {
          idxs.push(n + lookups.length);
          lookups.push({ type: 1, feature: tag, subtables: [singleSubstSubtable(singles)] });
        }
        const ligs = add.ligatures.filter((r) => r.feature === tag);
        if (ligs.length) {
          idxs.push(n + lookups.length);
          lookups.push({ type: 4, feature: tag, subtables: [ligatureSubstSubtable(ligs)] });
        }
        features.push({ tag, lookups: idxs });
      }
      return { lookups, features };
    },
    { scripts: ['arab'], reuse: true }
  );
}

/** جدول GDEF يصنّف المحارف: علامات التشكيل فئة 3، وغيرها أساس (فئة 1). */
export function buildGdef(markGids: number[], totalGlyphs: number): Uint8Array | null {
  if (markGids.length === 0) return null;
  const marks = new Set(markGids);
  const ranges: Array<[number, number, number]> = [];
  for (let g = 1; g < totalGlyphs; g++) {
    const cls = marks.has(g) ? 3 : 1;
    const last = ranges[ranges.length - 1];
    if (last && last[2] === cls && last[1] === g - 1) last[1] = g;
    else ranges.push([g, g, cls]);
  }
  const w = new W().u16(2).u16(ranges.length);
  ranges.forEach(([s, e, c]) => w.u16(s).u16(e).u16(c));
  const classDef = w.done();
  return new W().u16(1).u16(0).u16(12).u16(0).u16(0).u16(0).bytes(classDef).done();
}

/* ============================================================
   حقن الجداول في ملف الخط
   ============================================================ */

function checksum(data: Uint8Array): number {
  let sum = 0;
  const padded = data.length % 4 === 0 ? data : Uint8Array.from([...data, ...new Array(4 - (data.length % 4)).fill(0)]);
  const dv = new DataView(padded.buffer, padded.byteOffset, padded.byteLength);
  for (let i = 0; i < padded.length; i += 4) sum = (sum + dv.getUint32(i)) >>> 0;
  return sum;
}

/** يضيف جداول (أو يستبدلها) إلى ملف sfnt ويعيد بناء الدليل وأرقام التحقق. */
export function injectTables(buf: ArrayBuffer, extra: Record<string, Uint8Array>): ArrayBuffer {
  const src = new Uint8Array(buf);
  const dv = new DataView(buf);
  const n = dv.getUint16(4);
  const tables = new Map<string, Uint8Array>();
  for (let i = 0; i < n; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(src[rec], src[rec + 1], src[rec + 2], src[rec + 3]);
    const off = dv.getUint32(rec + 8);
    const len = dv.getUint32(rec + 12);
    tables.set(tag, src.slice(off, off + len));
  }
  for (const [tag, data] of Object.entries(extra)) tables.set(tag, data);
  const tags = [...tables.keys()].sort();
  const count = tags.length;
  const pow = 2 ** Math.floor(Math.log2(count));
  const head = tables.get('head');
  if (head && head.length >= 12) head.set([0, 0, 0, 0], 8);

  const dirLen = 12 + 16 * count;
  let total = dirLen;
  const layout = tags.map((t) => {
    const data = tables.get(t)!;
    const off = total;
    total += Math.ceil(data.length / 4) * 4;
    return { t, data, off };
  });
  const out = new Uint8Array(total);
  const odv = new DataView(out.buffer);
  out.set(src.slice(0, 4), 0);
  odv.setUint16(4, count);
  odv.setUint16(6, pow * 16);
  odv.setUint16(8, Math.log2(pow));
  odv.setUint16(10, count * 16 - pow * 16);
  layout.forEach(({ t, data, off }, i) => {
    const rec = 12 + i * 16;
    for (let k = 0; k < 4; k++) out[rec + k] = t.charCodeAt(k);
    odv.setUint32(rec + 4, checksum(data));
    odv.setUint32(rec + 8, off);
    odv.setUint32(rec + 12, data.length);
    out.set(data, off);
  });
  const adj = (0xb1b0afba - checksum(out)) >>> 0;
  const headEntry = layout.find((l) => l.t === 'head');
  if (headEntry) odv.setUint32(headEntry.off + 8, adj);
  return out.buffer;
}

/* ============================================================
   من المشروع إلى بيانات الموضع
   ============================================================ */

export interface Positioning {
  pairs: PairAdjust[];
  marks: MarkAnchors | null;
  markGids: number[];
  cascade: CascadeData | null;
}

/**
 * يجمع من المشروع أزواج الكيرننغ وارتكازات التشكيل. `gidOf` يعطي رقم المحرف في الملف بالاسم.
 * علامة التشكيل: محرف من فئة «علامة» له ارتكاز «فوق» أو «تحت» (نقطة تعلّقه). الأساس: أي محرف آخر له الارتكاز نفسه (موضع الاستقبال).
 */
export function collectPositioning(project: FontProject, gidOf: (name: string) => number | undefined): Positioning {
  const pairs: PairAdjust[] = [];
  for (const k of project.kerning ?? []) {
    const a = gidOf(k.left);
    const b = gidOf(k.right);
    if (a !== undefined && b !== undefined && k.value !== 0) pairs.push({ first: a, second: b, value: k.value });
  }
  const marks: MarkAnchors = { marks: [], bases: [] };
  const markGids: number[] = [];
  for (const g of project.glyphs) {
    const gid = gidOf(g.name);
    if (gid === undefined) continue;
    const top = g.anchors.find((a) => a.name === 'top');
    const bottom = g.anchors.find((a) => a.name === 'bottom');
    if (g.category === 'diacritic') {
      markGids.push(gid);
      const a = top ?? bottom;
      if (a) marks.marks.push({ gid, cls: top ? 0 : 1, x: a.x, y: a.y });
    } else if (top || bottom) {
      marks.bases.push({ gid, anchors: [top ? { x: top.x, y: top.y } : null, bottom ? { x: bottom.x, y: bottom.y } : null] });
    }
  }
  // الحروف الداخلة في الكلمة: الحروف والروابط فقط
  const letters: number[] = [];
  for (const g of project.glyphs) {
    const gid = gidOf(g.name);
    if (gid !== undefined && (g.category === 'letter' || g.category === 'ligature')) letters.push(gid);
  }
  letters.sort((a, b) => a - b);
  const rules: CascadeAdjust[] = [];
  for (const r of project.cascades ?? []) {
    const gid = gidOf(r.glyph);
    if (gid === undefined || r.dy === 0 || !letters.includes(gid)) continue;
    const same = rules.find((x) => x.dy === r.dy && x.span === r.span);
    if (same) same.triggers.push(gid);
    else rules.push({ triggers: [gid], dy: r.dy, span: r.span });
  }
  return {
    pairs,
    marks: marks.marks.length && marks.bases.length ? marks : null,
    markGids,
    cascade: rules.length ? { rules, letters } : null,
  };
}

/* ============================================================
   قراءة جدول GPOS من خط مستورد (ما نكتبه نحن، وما يشبهه)
   ============================================================ */

/** جدول تموضع تشكيل واحد (نوع 4 صيغة 1) بفئاته الأصلية. */
export interface ReadMarkLookup {
  classCount: number;
  marks: Array<{ gid: number; cls: number; x: number; y: number }>;
  bases: Array<{ gid: number; anchors: Array<Anchor | null> }>;
}

export interface ReadGpos {
  pairs: PairAdjust[];
  /** جداول العلامة-القاعدة بترتيبها في الجدول، لكل منها عدد فئاته. */
  markLookups: ReadMarkLookup[];
  /** عدد جداول الأزواج بالصيغة الصفية التي لم تُقرأ. */
  skipped: number;
}

const MAX_READ_PAIRS = 20000;

/** يقرأ الأزواج (نوع 2 صيغة 1) وتموضع التشكيل (نوع 4 صيغة 1 بفئتين). غير المدعوم يُتخطى بلا خطأ. */
export function readGpos(buf: ArrayBuffer): ReadGpos | null {
  try {
    const dv = new DataView(buf);
    const n = dv.getUint16(4);
    let gpos = -1;
    for (let i = 0; i < n; i++) {
      const rec = 12 + i * 16;
      if (dv.getUint32(rec) === 0x47504f53) gpos = dv.getUint32(rec + 8); // 'GPOS'
    }
    if (gpos < 0) return null;
    return readGposAt(dv, gpos);
  } catch {
    return null;
  }
}

/** يقرأ جدول GPOS خاماً (بايتات الجدول وحدها، كما تُحفظ في المشروع). */
export function readGposTable(table: Uint8Array): ReadGpos | null {
  try {
    return readGposAt(new DataView(table.buffer, table.byteOffset, table.byteLength), 0);
  } catch {
    return null;
  }
}

function readGposAt(dv: DataView, gpos: number): ReadGpos | null {
  try {
    const out: ReadGpos = { pairs: [], markLookups: [], skipped: 0 };
    const lookupList = gpos + dv.getUint16(gpos + 8);
    const lookupCount = dv.getUint16(lookupList);
    const cov = (o: number): number[] => {
      const fmt = dv.getUint16(o);
      const cnt = dv.getUint16(o + 2);
      const r: number[] = [];
      if (fmt === 1) for (let i = 0; i < cnt; i++) r.push(dv.getUint16(o + 4 + 2 * i));
      else for (let i = 0; i < cnt; i++) {
        const s = dv.getUint16(o + 4 + 6 * i);
        const e = dv.getUint16(o + 6 + 6 * i);
        for (let g = s; g <= e && r.length < 70000; g++) r.push(g);
      }
      return r;
    };
    const anchorAt = (o: number): Anchor => ({ x: dv.getInt16(o + 2), y: dv.getInt16(o + 4) });
    for (let li = 0; li < lookupCount; li++) {
      const lo = lookupList + dv.getUint16(lookupList + 2 + 2 * li);
      let type = dv.getUint16(lo);
      const subCount = dv.getUint16(lo + 4);
      for (let si = 0; si < subCount; si++) {
        let so = lo + dv.getUint16(lo + 6 + 2 * si);
        if (type === 9) {
          const real = dv.getUint16(so + 2);
          so += dv.getUint32(so + 4);
          type = real;
        }
        const fmt = dv.getUint16(so);
        if (type === 2 && fmt === 1) {
          const vf1 = dv.getUint16(so + 4);
          const vf2 = dv.getUint16(so + 6);
          const bits = (v: number) => v.toString(2).split('1').length - 1;
          const rec = 2 + 2 * bits(vf1) + 2 * bits(vf2);
          const xAdv = vf1 & 0x4 ? 2 * bits(vf1 & 0x3) : -1;
          const firsts = cov(so + dv.getUint16(so + 2));
          const setCount = dv.getUint16(so + 8);
          for (let i = 0; i < setCount && xAdv >= 0; i++) {
            const ps = so + dv.getUint16(so + 10 + 2 * i);
            const cnt = dv.getUint16(ps);
            for (let k = 0; k < cnt && out.pairs.length < MAX_READ_PAIRS; k++) {
              const r = ps + 2 + k * rec;
              const v = dv.getInt16(r + 2 + xAdv);
              if (v !== 0) out.pairs.push({ first: firsts[i], second: dv.getUint16(r), value: v });
            }
          }
        } else if (type === 2 && fmt === 2) {
          out.skipped++;
        } else if (type === 4 && fmt === 1) {
          const cc = dv.getUint16(so + 6);
          if (cc < 1 || cc > 32) continue;
          const markGids = cov(so + dv.getUint16(so + 2));
          const baseGids = cov(so + dv.getUint16(so + 4));
          const ma = so + dv.getUint16(so + 8);
          const ba = so + dv.getUint16(so + 10);
          const ml: ReadMarkLookup = { classCount: cc, marks: [], bases: [] };
          markGids.forEach((gid, i) => {
            const a = anchorAt(ma + dv.getUint16(ma + 2 + 4 * i + 2));
            ml.marks.push({ gid, cls: dv.getUint16(ma + 2 + 4 * i), x: a.x, y: a.y });
          });
          baseGids.forEach((gid, i) => {
            const anchors = Array.from({ length: cc }, (_, c) => {
              const off = dv.getUint16(ba + 2 + 2 * cc * i + 2 * c);
              return off ? anchorAt(ba + off) : null;
            });
            ml.bases.push({ gid, anchors });
          });
          out.markLookups.push(ml);
        }
      }
    }
    return out;
  } catch {
    return null;
  }
}

/* ============================================================
   الجداول الأصلية للخط المستورد: حفظ وإعادة كتابة كما هي
   ============================================================ */

/** يقرأ جدولاً خاماً من ملف sfnt بوسمه، أو null إن لم يوجد. */
export function readRawTable(buf: ArrayBuffer, tag: string): Uint8Array | null {
  const dv = new DataView(buf);
  const n = dv.getUint16(4);
  for (let i = 0; i < n; i++) {
    const rec = 12 + i * 16;
    const t = String.fromCharCode(dv.getUint8(rec), dv.getUint8(rec + 1), dv.getUint8(rec + 2), dv.getUint8(rec + 3));
    if (t === tag) {
      const off = dv.getUint32(rec + 8);
      const len = dv.getUint32(rec + 12);
      return new Uint8Array(buf.slice(off, off + len));
    }
  }
  return null;
}

export function bytesToBase64(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

export function base64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** وسوم الميزات الموجودة في جدول GSUB أو GPOS (الرأس نفسه في الاثنين). */
export function featureTags(table: Uint8Array): string[] {
  try {
    const dv = new DataView(table.buffer, table.byteOffset, table.byteLength);
    const fl = dv.getUint16(6);
    const n = dv.getUint16(fl);
    const tags = new Set<string>();
    for (let i = 0; i < n; i++) {
      const o = fl + 2 + i * 6;
      tags.add(String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3)));
    }
    return [...tags].sort();
  } catch {
    return [];
  }
}

/** عدد البحوث (lookups) في الجدول وأنواعها. */
export function lookupTypes(table: Uint8Array): number[] {
  try {
    const dv = new DataView(table.buffer, table.byteOffset, table.byteLength);
    const ll = dv.getUint16(8);
    const n = dv.getUint16(ll);
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(dv.getUint16(ll + dv.getUint16(ll + 2 + 2 * i)));
    return out;
  } catch {
    return [];
  }
}
