import test from 'node:test';
import assert from 'node:assert/strict';
import { zoomAt, computeFit, MAX_SCALE, MIN_SCALE } from './viewportMath';

test('zoomAt keeps the anchor point fixed', () => {
  const v = { scale: 0.5, ox: 100, oy: 300 };
  const px = 240;
  const py = 180;
  // نقطة الخط تحت المؤشر قبل التكبير وبعده
  const fx = (px - v.ox) / v.scale;
  const fy = (v.oy - py) / v.scale;
  const z = zoomAt(v, px, py, 1.2);
  assert.ok(Math.abs((px - z.ox) / z.scale - fx) < 1e-9);
  assert.ok(Math.abs((z.oy - py) / z.scale - fy) < 1e-9);
});

test('zoomAt clamps to limits', () => {
  const v = { scale: 1, ox: 0, oy: 0 };
  assert.equal(zoomAt(v, 0, 0, 1000).scale, MAX_SCALE);
  assert.equal(zoomAt(v, 0, 0, 0.00001).scale, MIN_SCALE);
});

test('computeFit centers the box and keeps it inside', () => {
  const box = { xMin: 0, xMax: 500, yMin: -200, yMax: 800 };
  const v = computeFit(800, 600, box);
  const left = v.ox + box.xMin * v.scale;
  const right = v.ox + box.xMax * v.scale;
  const top = v.oy - box.yMax * v.scale;
  const bottom = v.oy - box.yMin * v.scale;
  assert.ok(left >= 0 && right <= 800 && top >= 0 && bottom <= 600);
  assert.ok(Math.abs((left + right) / 2 - 400) < 1e-6);
  assert.ok(Math.abs((top + bottom) / 2 - 300) < 1e-6);
});
