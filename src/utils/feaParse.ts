import { type Glyph } from '../types/font';
import { type Rule, computeFeatures } from './features';

export interface FeaError {
  line: number;
  message: string;
}

interface Tok {
  text: string;
  line: number;
}

/** يقسّم النص إلى رموز: كلمات و { و } و ; مع رقم السطر. التعليقات (#) تُهمل. */
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let line = 1;
  let word = '';
  const flush = () => {
    if (word) out.push({ text: word, line });
    word = '';
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '#') {
      flush();
      while (i < src.length && src[i] !== '\n') i++;
      line++;
    } else if (ch === '\n') {
      flush();
      line++;
    } else if (ch === '{' || ch === '}' || ch === ';') {
      flush();
      out.push({ text: ch, line });
    } else if (/\s/.test(ch)) {
      flush();
    } else {
      word += ch;
    }
  }
  flush();
  return out;
}

/**
 * يقرأ مجموعة جزئية من FEA: كتل feature فيها سطور
 *   sub أ by ب;          (استبدال مفرد)
 *   sub أ ب by ج;        (دمج حرفين أو أكثر في محرف واحد)
 * وسطور languagesystem تُتجاهل. كل ما عدا ذلك يُبلَّغ كخطأ برقم السطر.
 */
export function parseFea(text: string, names: ReadonlySet<string>): { rules: Rule[]; errors: FeaError[] } {
  const toks = tokenize(text);
  const rules: Rule[] = [];
  const errors: FeaError[] = [];
  const seen = new Set<string>();
  let i = 0;

  const skipStatement = () => {
    while (i < toks.length && toks[i].text !== ';') i++;
    i++;
  };

  while (i < toks.length) {
    const t = toks[i];
    if (t.text === 'languagesystem') {
      skipStatement();
      continue;
    }
    if (t.text !== 'feature') {
      errors.push({ line: t.line, message: `«${t.text}» غير مدعومة. المدعوم: كتل feature وأوامر sub فقط.` });
      skipStatement();
      continue;
    }
    const tag = toks[i + 1];
    const open = toks[i + 2];
    if (!tag || !/^[A-Za-z0-9]{4}$/.test(tag.text)) {
      errors.push({ line: t.line, message: 'وسم الميزة يجب أن يكون أربعة أحرف، مثل init أو rlig.' });
      i++;
      continue;
    }
    if (!open || open.text !== '{') {
      errors.push({ line: tag.line, message: 'بعد وسم الميزة يجب أن تأتي { .' });
      i += 2;
      continue;
    }
    i += 3;
    let closed = false;
    while (i < toks.length) {
      if (toks[i].text === '}') {
        closed = true;
        i++;
        break;
      }
      // عبارة حتى الفاصلة المنقوطة
      const start = toks[i];
      const words: string[] = [];
      while (i < toks.length && toks[i].text !== ';' && toks[i].text !== '}') words.push(toks[i++].text);
      if (toks[i]?.text === ';') i++;
      else {
        errors.push({ line: start.line, message: 'ينقص ; في نهاية العبارة.' });
        continue;
      }
      if (words[0] !== 'sub') {
        errors.push({ line: start.line, message: `«${words[0]}» غير مدعومة داخل الميزة. المدعوم: sub فقط.` });
        continue;
      }
      const by = words.indexOf('by');
      const from = words.slice(1, by);
      const to = words.slice(by + 1);
      if (by < 2 || to.length !== 1) {
        errors.push({ line: start.line, message: 'الصيغة: sub أ by ب;   أو   sub أ ب by ج;' });
        continue;
      }
      if ([...from, ...to].some((n) => /[[\]']/.test(n))) {
        errors.push({ line: start.line, message: 'الأقواس والمجموعات غير مدعومة بعد. اكتب أسماء المحارف مباشرة.' });
        continue;
      }
      const missing = [...from, ...to].find((n) => !names.has(n));
      if (missing) {
        errors.push({ line: start.line, message: `المحرف «${missing}» غير موجود في المشروع.` });
        continue;
      }
      const key = `${tag.text}|${from.join(' ')}`;
      if (seen.has(key)) {
        errors.push({ line: start.line, message: 'قاعدة مكررة لنفس المصدر في هذه الميزة.' });
        continue;
      }
      seen.add(key);
      rules.push({ feature: tag.text, kind: from.length === 1 ? 'single' : 'ligature', from, to: to[0] });
    }
    if (!closed) errors.push({ line: tag.line, message: 'الكتلة غير مغلقة: ينقص } .' });
    else if (toks[i] && toks[i].text === tag.text) {
      i++;
      if (toks[i]?.text === ';') i++;
      else errors.push({ line: tag.line, message: 'ينقص ; بعد اسم الميزة الختامي.' });
    } else {
      errors.push({ line: tag.line, message: `بعد } يجب أن يأتي وسم الميزة نفسه (${tag.text}) ثم ; .` });
    }
  }
  return { rules, errors };
}

/**
 * كل قواعد المشروع: التلقائية من أسماء المحارف + قواعد المستخدم.
 * قاعدة المستخدم تحلّ محل التلقائية إن تطابقت الميزة والمصدر.
 */
export function projectRules(project: { glyphs: Glyph[]; customFea?: string }): { rules: Rule[]; errors: FeaError[] } {
  const auto = computeFeatures(project.glyphs).rules;
  const names = new Set(project.glyphs.map((g) => g.name));
  const custom = parseFea(project.customFea ?? '', names);
  const key = (r: Rule) => `${r.feature}|${r.from.join(' ')}`;
  const own = new Set(custom.rules.map(key));
  return { rules: [...auto.filter((r) => !own.has(key(r))), ...custom.rules], errors: custom.errors };
}
