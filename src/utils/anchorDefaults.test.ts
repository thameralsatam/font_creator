import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultAnchorPos } from './anchorDefaults';
import { createProject } from './fontLogic';

const m = createProject('A', 'D', '').metrics;
const box = { xMin: 50, xMax: 550, yMin: -100, yMax: 300 };

test('base glyph: top/bottom anchors sit just outside the drawing, centred on the ink', () => {
  const top = defaultAnchorPos('top', false, 600, m, box);
  const bottom = defaultAnchorPos('bottom', false, 600, m, box);
  assert.equal(top[0], 300);
  assert.ok(top[1] > box.yMax && top[1] - box.yMax <= 120, `top y ${top[1]}`);
  assert.equal(bottom[0], 300);
  assert.ok(bottom[1] < box.yMin && box.yMin - bottom[1] <= 120, `bottom y ${bottom[1]}`);
});

test('mark glyph: its own anchor is on the edge that touches the base', () => {
  const mark = { xMin: -150, xMax: 150, yMin: 800, yMax: 900 };
  assert.deepEqual(defaultAnchorPos('top', true, 0, m, mark), [0, 800]);
  assert.deepEqual(defaultAnchorPos('bottom', true, 0, m, mark), [0, 900]);
});

test('entry/exit stay at the advance edges; empty glyph keeps the metric defaults', () => {
  assert.equal(defaultAnchorPos('entry', false, 600, m, box)[0], 600);
  assert.equal(defaultAnchorPos('exit', false, 600, m, box)[0], 0);
  assert.deepEqual(defaultAnchorPos('top', false, 600, m, null), [300, m.ascender]);
  assert.deepEqual(defaultAnchorPos('bottom', true, 0, m, null), [0, m.descender]);
});
