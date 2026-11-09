/*
  فحص الترجمة: يمرّ على الشيفرة ويجد كل نص عربي غير ملفوف بـ t أو tx أو tn،
  ويجمع المفاتيح المستعملة لمقارنتها بالقاموس الألماني. يُستعمل في الاختبار وفي سطر الأوامر:
  npx tsx src/i18n/scan.ts
*/
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
// typescript 7 بلا واجهة برمجية، لذا نستعمل نسخة 5 باسم مستعار للتحليل فقط
import ts from 'ts-parser';

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
export const KEEP = 'i18n-keep';

export interface Finding {
  file: string;
  line: number;
  text: string;
  kind: 'untranslated' | 'dynamic-key' | 'template-key';
}

export interface ScanResult {
  keys: Map<string, { file: string; line: number }[]>;
  findings: Finding[];
}

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'vendor' || p.endsWith(join('i18n', 'de'))) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !p.endsWith(join('i18n', 'scan.ts')) && !p.endsWith(join('i18n', 'index.ts'))) out.push(p);
  }
  return out;
}

const T_FUNCS = new Set(['t', 'tx', 'tn']);

export function scanSource(root = 'src'): ScanResult {
  const keys: ScanResult['keys'] = new Map();
  const findings: Finding[] = [];
  for (const file of walk(root, [])) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line;
    const kept = (n: ts.Node) => {
      const l = lineOf(n);
      const end = sf.getLineAndCharacterOfPosition(n.getEnd()).line;
      for (let i = Math.max(0, l - 1); i <= end; i++) if (lines[i]?.includes(KEEP)) return true;
      return false;
    };
    const addKey = (k: string, n: ts.Node) => {
      const arr = keys.get(k) ?? [];
      arr.push({ file, line: lineOf(n) + 1 });
      keys.set(k, arr);
    };
    const flag = (n: ts.Node, s: string, kind: Finding['kind']) =>
      findings.push({ file, line: lineOf(n) + 1, text: s.trim().slice(0, 60), kind });

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && T_FUNCS.has(node.expression.text)) {
        const fn = node.expression.text;
        const idx = fn === 'tn' ? 1 : 0;
        const arg = node.arguments[idx];
        if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
          addKey(arg.text, arg);
        } else if (arg && ts.isTemplateExpression(arg)) {
          flag(arg, arg.getText(sf), 'template-key');
        } else if (arg && !kept(node)) {
          flag(arg, arg.getText(sf), 'dynamic-key');
        }
        node.arguments.forEach((a, i) => {
          if (i === idx && arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) return;
          visit(a);
        });
        return;
      }
      if (
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) &&
        ARABIC.test(node.text)
      ) {
        const s = node.text.trim();
        const inImport = ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent);
        const single = [...s].filter((c) => ARABIC.test(c)).length <= 1 && s.length <= 2;
        if (!inImport && !single && !kept(node)) flag(node, s, 'untranslated');
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return { keys, findings };
}

if (process.argv[1]?.endsWith('scan.ts')) {
  const dictP = (await import('./de/index')).default as Record<string, string>;
  const { keys, findings } = scanSource();
  const per = new Map<string, number>();
  for (const f of findings) per.set(f.file, (per.get(f.file) ?? 0) + 1);
  for (const [f, n] of [...per].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), f);
  console.log('غير مترجم:', findings.length, '| مفاتيح:', keys.size);
  const ki = process.argv.indexOf('--keys');
  if (ki > 0) {
    const frag = process.argv[ki + 1] ?? '';
    for (const [k, w] of keys) if (w.some((x) => x.file.includes(frag))) console.log(JSON.stringify(k));
  }
  const mi = process.argv.indexOf('--missing');
  if (mi > 0) {
    const frag = process.argv[mi + 1] ?? '';
    for (const [k, w] of keys) if (!(k in dictP) && w.some((x) => x.file.includes(frag))) console.log(JSON.stringify(k));
  }
  if (process.argv.includes('--list')) for (const f of findings) console.log(`${f.file}:${f.line} [${f.kind}] ${f.text}`);
}
