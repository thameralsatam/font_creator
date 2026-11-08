import test from 'node:test';
import assert from 'node:assert/strict';
import de from './de';
import { __setLangForTest, detectLang, t, tn } from './index';
import { scanSource } from './scan';

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('اللغة الأولى: العربية فقط للمتصفح العربي', () => {
  assert.equal(detectLang(['ar']), 'ar');
  assert.equal(detectLang(['ar-SA', 'en']), 'ar');
  assert.equal(detectLang(['en-US', 'ar']), 'de');
  assert.equal(detectLang(['de-DE']), 'de');
  assert.equal(detectLang(['tr']), 'de');
  assert.equal(detectLang([]), 'de');
  assert.equal(detectLang(undefined), 'de');
});

test('t و tn بالعربية والألمانية', () => {
  __setLangForTest('ar');
  assert.equal(t('حفظ'), 'حفظ');
  assert.equal(t('حُذف {n} محرف', { n: 3 }), 'حُذف 3 محرف');
  __setLangForTest('de', de);
  assert.equal(t('حفظ'), 'Speichern');
  assert.equal(t('حُذف {n} محرف', { n: 3 }), '3 Glyphe(n) gelöscht');
  assert.equal(t('نص غير موجود'), 'نص غير موجود');
  assert.equal(tn(1, 'x {n}', { one: '{n} Glyphe', other: '{n} Glyphen' }), '1 Glyphe');
  assert.equal(tn(4, 'x {n}', { one: '{n} Glyphe', other: '{n} Glyphen' }), '4 Glyphen');
  __setLangForTest('ar');
});

test('كل نص عربي في الشيفرة ملفوف بدالة الترجمة', () => {
  const { findings } = scanSource('src');
  assert.deepEqual(findings.map((f) => `${f.file}:${f.line} ${f.kind} ${f.text}`), []);
});

test('القاموس الألماني يطابق المفاتيح المستعملة بالضبط', () => {
  const { keys } = scanSource('src');
  const missing = [...keys.keys()].filter((k) => !(k in de));
  const stale = Object.keys(de).filter((k) => !keys.has(k));
  assert.deepEqual(missing, [], 'مفاتيح بلا ترجمة');
  assert.deepEqual(stale, [], 'مفاتيح في القاموس لا تُستعمل');
});

test('الترجمات سليمة: بلا عربية وبنفس المتغيرات وغير فارغة', () => {
  const bad: string[] = [];
  for (const [k, v] of Object.entries(de)) {
    if (!v.trim()) bad.push(`فارغة: ${k}`);
    else if (ARABIC.test(v.replace(/[\u0660-\u0669]/g, ''))) bad.push(`عربية في الألمانية: ${k}`);
    else if (placeholders(k) !== placeholders(v)) bad.push(`متغيرات مختلفة: ${k}`);
  }
  assert.deepEqual(bad, []);
});
