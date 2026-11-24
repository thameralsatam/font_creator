import test from 'node:test';
import assert from 'node:assert/strict';
import { missingChars } from './testText';

const g = (unicode: string) => ({ unicode });

test('characters without a glyph are reported once, in order', () => {
  assert.deepEqual(missingChars('بخطط ب', [g('U+0628')]), ['خ', 'ط']);
});

test('spaces, line breaks and joiners never count; a glyph with a space is not required', () => {
  assert.deepEqual(missingChars('ب\n ب‍‌\t', [g('U+0628')]), []);
});

test('astral characters are handled as one character', () => {
  assert.deepEqual(missingChars('😀', []), ['😀']);
});

test('glyphs with an empty or malformed unicode value are ignored', () => {
  assert.deepEqual(missingChars('ا', [g(''), g('xx'), g('U+0627')]), []);
});
