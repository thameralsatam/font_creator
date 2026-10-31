import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject } from './fontLogic';
import { EMPTY_INFO, parseVersion, resolveInfo, safePsName, validateInfo } from './fontInfo';

test('resolveInfo fills full and PostScript names automatically', () => {
  const p = createProject('My Font', 'Sam', '');
  const r = resolveInfo(p);
  assert.equal(r.fullName, 'My Font Regular');
  assert.equal(r.postScriptName, 'MyFont-Regular');
  const q = { ...p, info: { subfamily: 'Bold Italic', fullName: 'Custom Name' } };
  const s = resolveInfo(q);
  assert.equal(s.fullName, 'Custom Name');
  assert.equal(s.postScriptName, 'MyFont-BoldItalic');
  assert.equal(resolveInfo(createProject('خط رقيم', '', '')).postScriptName, 'FontStudio-Regular');
});

test('validateInfo rejects bad values', () => {
  const ok = { name: 'x', version: '1.0.0', info: { ...EMPTY_INFO } };
  assert.deepEqual(validateInfo(ok), []);
  assert.equal(validateInfo({ ...ok, name: ' ' }).length, 1);
  assert.equal(validateInfo({ ...ok, version: 'v1' }).length, 1);
  assert.equal(validateInfo({ ...ok, info: { ...EMPTY_INFO, postScriptName: 'bad name' } }).length, 1);
  assert.equal(validateInfo({ ...ok, info: { ...EMPTY_INFO, licenseUrl: 'ftp://a' } }).length, 1);
  assert.deepEqual(validateInfo({ ...ok, info: { ...EMPTY_INFO, licenseUrl: 'https://a.b/c' } }), []);
});

test('parseVersion and safePsName', () => {
  assert.equal(parseVersion('Version 1.002'), '1.002');
  assert.equal(parseVersion(undefined), '1.0.0');
  assert.equal(safePsName('a b!'), 'ab');
});
