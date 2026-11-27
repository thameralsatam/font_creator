import test from 'node:test';
import assert from 'node:assert/strict';
import { createGlyph, createProject } from './fontLogic';
import { resolveGlyph } from './composites';
import { boundsOf, centerInAdvance, setLsb, setRsb, type Snapshot } from './pathEdit';
import type { Glyph } from '../types/font';

const nd = (id: string, x: number, y: number) => ({ id, x, y, kind: 'corner' as const, handleIn: null, handleOut: null });
const box = (id: string, x: number, y: number, w: number, h: number) => ({
  id, closed: true, nodes: [nd(id + 'a', x, y), nd(id + 'b', x + w, y), nd(id + 'c', x + w, y + h), nd(id + 'd', x, y + h)],
});
const M = createProject('B', 'D', '').metrics;

/** جسم 100..500 ونقطة مكوّنة تمتد إلى 650 (خارج الجسم يميناً). العرض 700. */
function setup(withOwn = true) {
  const dot = createGlyph({ char: '.', name: 'dot', unicode: '', category: 'symbol' });
  dot.advanceWidth = 0; dot.contours = [box('d', 0, 0, 100, 100)];
  const g = createGlyph({ char: 'ب', name: 'beh', unicode: 'U+0628', category: 'letter' });
  g.advanceWidth = 700; g.contours = withOwn ? [box('b', 100, 100, 400, 200)] : [];
  g.components = [{ id: 'k', ref: dot.id, dx: 550, dy: -150 }];
  const p = createProject('B', 'D', ''); p.glyphs = [g, dot];
  const snap = (): Snapshot => ({ contours: g.contours, advanceWidth: g.advanceWidth, anchors: g.anchors, components: g.components });
  const locked = (s: Snapshot) => resolveGlyph(p, { ...g, contours: [], components: s.components }).contours;
  const ink = (s: Snapshot) => boundsOf([...s.contours, ...locked(s)])!;
  return { g, dot, p, snap, locked, ink };
}

test('العارض الأيسر: يحسب من الرسم الفعلي ويزيح المسارات والمكوّنات معاً دون مس المصدر', () => {
  const { dot, snap, locked, ink } = setup();
  const s0 = snap();
  assert.equal(ink(s0).xMin, 100);
  const s1 = setLsb(s0, 160, M, locked(s0))!;
  assert.equal(ink(s1).xMin, 160, 'الحافة الفعلية صارت 160');
  assert.equal(s1.components![0].dx, 610, 'إزاحة المكوّن تبعت الإزاحة');
  assert.equal(s1.contours[0].nodes[0].x, 160);
  assert.equal(s1.advanceWidth, 760, 'العارض الأيمن ثابت فالعرض زاد بالقدر نفسه');
  assert.equal(dot.contours[0].nodes[0].x, 0, 'المحرف المصدر لم يتغير');
  assert.equal(ink(s1).xMax - 160, ink(s0).xMax - 100, 'عرض الرسم نفسه');
});

test('العارض الأيسر عندما تكون الحافة اليسرى للمكوّن لا للمسارات الخاصة', () => {
  const { g, snap, locked, ink } = setup();
  g.components![0].dx = -40; // النقطة عند x=-40 وهي أقصى اليسار
  const s0 = snap();
  assert.equal(ink(s0).xMin, -40);
  const s1 = setLsb(s0, 30, M, locked(s0))!;
  assert.equal(ink(s1).xMin, 30);
  assert.equal(s1.contours[0].nodes[0].x, 170, 'المسارات الخاصة أُزيحت 70 أيضاً');
});

test('العارض الأيمن: يحسب من أقصى يمين الرسم الفعلي (المكوّن) ولا يزيح شيئاً', () => {
  const { snap, locked, ink } = setup();
  const s0 = snap();
  assert.equal(ink(s0).xMax, 650);
  const s1 = setRsb(s0, 25, M, locked(s0))!;
  assert.equal(s1.advanceWidth, 675);
  assert.equal(s1.components![0].dx, 550);
  assert.equal(s1.contours, s0.contours);
});

test('التوسيط: يعتمد على الرسم الفعلي', () => {
  const { snap, locked, ink } = setup();
  const s0 = snap();
  const s1 = centerInAdvance(s0, M, locked(s0))!;
  const b = ink(s1);
  assert.ok(Math.abs(b.xMin - (s1.advanceWidth - b.xMax)) <= 1, `العارضان ${b.xMin} و${s1.advanceWidth - b.xMax}`);
  assert.equal(s1.advanceWidth, 700);
});

test('محرف مكوّنات فقط (بلا مسارات خاصة): تعمل الأوامر الثلاثة بدل أن تُرفض', () => {
  const { snap, locked, ink } = setup(false);
  const s0 = snap();
  assert.equal(ink(s0).xMin, 550);
  assert.ok(setLsb(s0, 20, M, locked(s0)));
  assert.ok(setRsb(s0, 20, M, locked(s0)));
  assert.ok(centerInAdvance(s0, M, locked(s0)));
  assert.equal(setLsb(s0, 20, M), null, 'بلا locked لا رسم خاص: السلوك القديم');
});

test('المحرف العادي: النتيجة مطابقة تماماً بلا locked وبـ locked فارغة، وبلا مفتاح components', () => {
  const g: Glyph = createGlyph({ char: 'ا', name: 'alef', unicode: 'U+0627', category: 'letter' });
  g.advanceWidth = 300; g.contours = [box('a', 100, 0, 100, 700)];
  g.anchors = [{ id: 'an', name: 'top', x: 150, y: 760 }];
  const s: Snapshot = { contours: g.contours, advanceWidth: 300, anchors: g.anchors };
  for (const f of [setLsb, setRsb] as const) {
    const a = f(s, 60, M);
    assert.deepEqual(f(s, 60, M, []), a);
    assert.ok(a && !('components' in a));
  }
  assert.deepEqual(centerInAdvance(s, M, []), centerInAdvance(s, M));
  const l = setLsb(s, 60, M)!;
  assert.equal(l.advanceWidth, 260);
  assert.equal(l.anchors![0].x, 110, 'الارتكاز يتبع الإزاحة');
  assert.equal(setRsb(s, 40, M)!.advanceWidth, 240);
  assert.equal(centerInAdvance(s, M)!.contours[0].nodes[0].x, 100);
});
