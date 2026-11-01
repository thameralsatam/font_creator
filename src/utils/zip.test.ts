import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crc32, zipStore } from './zip';

test('crc32 matches the known value', () => {
  assert.equal(crc32(new TextEncoder().encode('hello')), 0x3610a686);
});

test('zipStore writes entries and the end record', () => {
  const z = zipStore([
    { name: 'a.svg', data: new TextEncoder().encode('<svg/>') },
    { name: 'b.svg', data: new TextEncoder().encode('<svg></svg>') },
  ]);
  const v = new DataView(z.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(z.length - 22, true), 0x06054b50);
  assert.equal(v.getUint16(z.length - 22 + 10, true), 2);
});
