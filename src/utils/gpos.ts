import { type FontProject } from '../types/font';

/**
 * كتابة جداول الموضع (GPOS) وتصنيف المحارف (GDEF) وحقنها في ملف الخط.
 * المكتبة التي تبني الخط لا تكتب هذه الجداول، فنكتبها هنا بأنفسنا:
 * - ضبط المسافة بين زوج محارف (كيرننغ): نوع 2 صيغة 1.
 * - تموضع علامات التشكيل على الحروف بنقاط الارتكاز: نوع 4 صيغة 1.
 */

export interface PairAdjust {
  first: number;
  second: number;
  /** تغيير تقدّم المحرف الأول، بوحدات الخط. سالب يقرّب التالي. */
  value: number;
}

export interface MarkAnchors {
  /** صف الفئات: الفئة 0 «فوق» والفئة 1 «تحت». */
  marks: Array<{ gid: number; cls: 0 | 1; x: number; y: number }>;
  bases: Array<{ gid: number; anchors: [Anchor | null, Anchor | null] }>;
}
export interface Anchor {
  x: number;
  y: number;
}

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

  const ba = new W().u16(bases.length);
  let k = 0;
  const anchorBytes: Uint8Array[] = [];
  bases.forEach((b) => {
    b.anchors.forEach((a) => {
      if (!a) return void ba.u16(0);
      ba.u16(2 + 2 * 2 * bases.length + 6 * k++);
      anchorBytes.push(anchor(a.x, a.y));
    });
  });
  anchorBytes.forEach((a) => ba.bytes(a));
  const baseArray = ba.done();

  const markCovOff = 12;
  const baseCovOff = markCovOff + markCov.length;
  const markArrOff = baseCovOff + baseCov.length;
  const baseArrOff = markArrOff + markArray.length;
  return new W()
    .u16(1).u16(markCovOff).u16(baseCovOff).u16(2).u16(markArrOff).u16(baseArrOff)
    .bytes(markCov).bytes(baseCov).bytes(markArray).bytes(baseArray)
    .done();
}

interface Lookup {
  type: number;
  subtables: Uint8Array[];
  feature: string;
}

function lookupBytes(l: Lookup): Uint8Array {
  const n = l.subtables.length;
  const head = 6 + 2 * n;
  const w = new W().u16(l.type).u16(0).u16(n);
  let off = head;
  l.subtables.forEach((s) => {
    w.u16(off);
    off += s.length;
  });
  l.subtables.forEach((s) => w.bytes(s));
  return w.done();
}

/** يبني جدول GPOS كاملاً، أو null إن لم يوجد ما يُكتب. */
export function buildGpos(pairs: PairAdjust[], marks: MarkAnchors | null): Uint8Array | null {
  const lookups: Lookup[] = [];
  const pairTables = pairs.length > 0 ? pairSubtables(pairs) : [];
  if (pairTables.length) lookups.push({ type: 2, subtables: pairTables, feature: 'kern' });
  if (marks && marks.marks.length > 0 && marks.bases.length > 0) {
    lookups.push({ type: 4, subtables: [markBaseSubtable(marks)], feature: 'mark' });
  }
  if (lookups.length === 0) return null;

  // قائمة الميزات مرتبة بالاسم، وكل ميزة تشير إلى بحثها
  const feats = lookups
    .map((l, i) => ({ tag: l.feature, idx: i }))
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
  return { pairs, marks: marks.marks.length && marks.bases.length ? marks : null, markGids };
}

/* ============================================================
   قراءة جدول GPOS من خط مستورد (ما نكتبه نحن، وما يشبهه)
   ============================================================ */

export interface ReadGpos {
  pairs: PairAdjust[];
  marks: Array<{ gid: number; cls: number; x: number; y: number }>;
  bases: Array<{ gid: number; anchors: Array<Anchor | null> }>;
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
    const out: ReadGpos = { pairs: [], marks: [], bases: [], skipped: 0 };
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
        } else if (type === 4 && fmt === 1 && dv.getUint16(so + 6) === 2) {
          const markGids = cov(so + dv.getUint16(so + 2));
          const baseGids = cov(so + dv.getUint16(so + 4));
          const ma = so + dv.getUint16(so + 8);
          const ba = so + dv.getUint16(so + 10);
          markGids.forEach((gid, i) => {
            const a = anchorAt(ma + dv.getUint16(ma + 2 + 4 * i + 2));
            out.marks.push({ gid, cls: dv.getUint16(ma + 2 + 4 * i), x: a.x, y: a.y });
          });
          baseGids.forEach((gid, i) => {
            const anchors = [0, 1].map((c) => {
              const off = dv.getUint16(ba + 2 + 4 * i + 2 * c);
              return off ? anchorAt(ba + off) : null;
            });
            out.bases.push({ gid, anchors });
          });
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
