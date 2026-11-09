/*
  نظام الترجمة: المفتاح هو النص العربي نفسه، والقاموس الألماني يطابقه حرفياً.
  اللغة تُحدَّد عند أول فتح من لغة المتصفح ثم تُحفظ، وتبديلها يعيد تحميل الصفحة
  (المشاريع تُحفظ قبل الإغلاق) حتى لا يبقى أي نص قديم بلغة مختلفة.
*/
import { createElement, Fragment, type ReactNode } from 'react';

export type Lang = 'ar' | 'de';

export const LANG_KEY = 'font-studio:lang';

/** اللغة الأولى: العربية فقط إن كانت لغة المتصفح الأولى عربية، وإلا الألمانية. */
export function detectLang(languages: readonly string[] | undefined): Lang {
  const first = (languages?.[0] ?? '').toLowerCase();
  return first === 'ar' || first.startsWith('ar-') ? 'ar' : 'de';
}

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'ar' || v === 'de' ? v : null;
  } catch {
    return null;
  }
}

function writeStored(l: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* التخزين غير متاح: تبقى اللغة لهذه الجلسة فقط */
  }
}

let current: Lang = 'ar';
let dict: Record<string, string> = {};

/** يُستدعى مرة واحدة قبل رسم الواجهة. */
export async function initLang(): Promise<Lang> {
  const stored = readStored();
  const nav = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  current = stored ?? detectLang(nav);
  if (!stored) writeStored(current);
  if (current === 'de') dict = (await import('./de')).default;
  applyDocument();
  return current;
}

export function getLang(): Lang {
  return current;
}

export function isRtl(): boolean {
  return current === 'ar';
}

/** تبديل اللغة: يحفظ ثم يعيد التحميل. */
export function switchLang(next: Lang): void {
  if (next === current) return;
  writeStored(next);
  window.location.reload();
}

/** تُستخدم في الاختبارات فقط. */
export function __setLangForTest(l: Lang, d: Record<string, string> = {}): void {
  current = l;
  dict = d;
}

const META: Record<Lang, { title: string; description: string }> = {
  ar: {
    title: 'محرر وهندسة الخطوط الطباعية',
    description: 'منصة احترافية هادئة لتصميم وهندسة وبرمجة الخطوط والمحارف العربية واللاتينية مع منطق الطبقات والمقاييس.',
  },
  de: {
    title: 'Editor und Konstruktion für Schriften',
    description: 'Eine ruhige, professionelle Plattform zum Entwerfen und Konstruieren arabischer und lateinischer Schriften mit Glyphen, Metriken und OpenType-Funktionen.',
  },
};

function applyDocument(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = current;
  root.dir = isRtl() ? 'rtl' : 'ltr';
  document.title = META[current].title;
  const set = (sel: string, v: string) => document.querySelector(sel)?.setAttribute('content', v);
  set('meta[name="description"]', META[current].description);
  set('meta[property="og:title"]', META[current].title);
  set('meta[property="og:description"]', META[current].description);
}

type Params = Record<string, string | number>;

function fill(s: string, params?: Params): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** يترجم نصاً عربياً. العناصر المتغيرة تُكتب {اسم} وتُمرَّر في params. */
export function t(ar: string, params?: Params): string {
  return fill(current === 'ar' ? ar : (dict[ar] ?? ar), params);
}

/** مثل t لكن القيم قد تكون عناصر واجهة (روابط، وسوم) فتُرجع عناصر. */
export function tx(ar: string, params: Record<string, ReactNode>): ReactNode {
  const src = current === 'ar' ? ar : (dict[ar] ?? ar);
  const parts = src.split(/(\{\w+\})/g);
  return createElement(
    Fragment,
    null,
    ...parts.map((p, i) => {
      const m = /^\{(\w+)\}$/.exec(p);
      if (m && m[1] in params) return createElement(Fragment, { key: i }, params[m[1]]);
      return p ? createElement(Fragment, { key: i }, p) : null;
    }),
  );
}

/** ترجمة بحسب العدد: one لما يساوي 1 وإلا other (الألمانية). العربية تأخذ الصيغة العربية الجاهزة. */
export function tn(n: number, ar: string, de: { one: string; other: string }): string {
  return current === 'ar' ? fill(ar, { n }) : fill(n === 1 ? de.one : de.other, { n });
}

/** لغة التنسيق للأرقام والتواريخ. */
export function locale(): string {
  return current === 'ar' ? 'ar' : 'de-DE';
}
