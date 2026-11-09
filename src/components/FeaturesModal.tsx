import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Copy, Plus, Sparkles } from 'lucide-react';
import { type FontProject, type NewGlyphData } from '../types/font';
import { parseFea, projectRules } from '../utils/feaParse';
import { copyText } from '../utils/download';
import {
  FEATURE_INFO,
  FEATURE_ORDER,
  computeFeatures,
  missingForms,
  rulesToFea,
  type FeatureTag,
} from '../utils/features';
import { isReady } from '../utils/glyphLogic';
import { base64ToBytes, featureTags, lookupTypes } from '../utils/gpos';
import { GlyphThumb } from './GlyphThumb';
import { isRtl, t, tx } from '../i18n';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface FeaturesModalProps {
  project: FontProject;
  onAddGlyphs: (items: NewGlyphData[]) => void;
  onOpenGlyph: (glyphId: string) => void;
  onSaveCustomFea: (text: string) => void;
  onSetOriginal: (use: boolean) => void;
  onClose: () => void;
}

type Tab = 'overview' | FeatureTag | 'missing' | 'code';

const TAB_LABEL: Record<'overview' | 'missing' | 'code', string> = {
  overview: t('نظرة عامة'),
  missing: t('الناقص'),
  code: t('الكود'),
};

const GSUB_KIND: Record<number, string> = { 1: t('تبديل مفرد'), 2: t('تبديل متعدد'), 3: t('بدائل'), 4: t('ترابط'), 5: t('سياقي'), 6: t('سياقي متسلسل'), 7: t('امتداد'), 8: t('عكسي') };
const GPOS_KIND: Record<number, string> = { 1: t('مفرد'), 2: t('أزواج'), 3: t('اتصال'), 4: t('تشكيل على حرف'), 5: t('تشكيل على ترابط'), 6: t('تشكيل على تشكيل'), 7: t('سياقي'), 8: t('سياقي متسلسل'), 9: t('امتداد') };

function kinds(types: number[], names: Record<number, string>): string {
  const c = new Map<number, number>();
  types.forEach((ty) => c.set(ty, (c.get(ty) ?? 0) + 1));
  return [...c.entries()].map(([ty, n]) => `${names[ty] ?? t('نوع {n}', { n: ty })} (${n})`).join(isRtl() ? '، ' : ', ');
}

function summarizeOriginal(tables: { GSUB?: string; GPOS?: string }) {
  const g = tables.GSUB ? base64ToBytes(tables.GSUB) : null;
  const p = tables.GPOS ? base64ToBytes(tables.GPOS) : null;
  return {
    gsub: g ? featureTags(g) : [],
    gpos: p ? featureTags(p) : [],
    gsubKinds: g ? kinds(lookupTypes(g), GSUB_KIND) : '',
    gposKinds: p ? kinds(lookupTypes(p), GPOS_KIND) : '',
  };
}

/** مكان ميزات الأوبن تايب: ما يعمل منها، وما ينقص، وكودها، واختبارها بالخط الحقيقي. */
export const FeaturesModal: React.FC<FeaturesModalProps> = ({ project, onAddGlyphs, onOpenGlyph, onSaveCustomFea, onSetOriginal, onClose }) => {
  const original = project.source?.useOriginal ?? false;
  const orig = useMemo(() => (project.source ? summarizeOriginal(project.source.tables) : null), [project.source]);
  const [tab, setTab] = useState<Tab>('overview');
  const report = useMemo(() => computeFeatures(project.glyphs), [project.glyphs]);
  const missing = useMemo(() => missingForms(project.glyphs), [project.glyphs]);
  const fea = useMemo(() => rulesToFea(report), [report]);
  const byName = useMemo(() => new Map(project.glyphs.map((g) => [g.name, g])), [project.glyphs]);
  const rules = useMemo(() => projectRules(project).rules, [project]);

  const count = (t: FeatureTag) => rules.filter((r) => r.feature === t).length;
  const tabs: Tab[] = ['overview', ...FEATURE_ORDER, 'missing', 'code'];
  const label = (t: Tab) => (t in TAB_LABEL ? TAB_LABEL[t as keyof typeof TAB_LABEL] : FEATURE_INFO[t as FeatureTag].label);

  return (
    <Modal
      title={t('ميزات الأوبن تايب')}
      subtitle={t('تُستخرج تلقائياً من أسماء المحارف وتُكتب داخل ملف الخط')}
      icon={<Sparkles className="h-4 w-4 stroke-[1.5]" />}
      size="xl"
      onClose={onClose}
    >
      <div className="mt-4 space-y-4">
        {project.source && orig && (
          <div className="space-y-2 rounded-2xl border border-ink/20 bg-sand/25 p-3 text-xs leading-6">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm font-normal">{t('الجداول الأصلية للخط المستورد')}</strong>
              <span className="flex-1" />
              <Button variant={original ? 'primary' : 'secondary'} onClick={() => onSetOriginal(!original)}>
                {original ? t('مفعّلة: اضغط للإيقاف') : t('متوقفة: اضغط للتفعيل')}
              </Button>
            </div>
            <p className="text-ink-soft">
              {original
                ? t('يُصدَّر الخط بجداول الصياغة التي استوردتها كما هي (الأشكال السياقية، تموضع التشكيل، التقارب بالفئات...) فلا يضيع منها شيء، ويبقى ترتيب المحارف الأصلي. تعديل الرسم والعرض يعمل كالعادة، أما القواعد والتقارب وارتكازات التشكيل التي تحرّرها هنا فلا تؤثر ما دامت مفعّلة.')
                : t('الجداول الأصلية متوقفة: يُبنى الخط من قواعدك ومن أسماء المحارف فقط، وما لا يفهمه الموقع من قواعد الخط الأصلي (السياقية والتشكيل بأكثر من فئتين والتقارب بالفئات) لن يُكتب.')}
            </p>
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {orig.gsub.map((t) => <span key={`s${t}`} className="rounded-full border border-ink/20 px-2 font-mono text-[11px]">{t}</span>)}
              {orig.gpos.map((t) => <span key={`p${t}`} className="rounded-full border border-ink/20 bg-paper px-2 font-mono text-[11px]">{t}</span>)}
            </div>
            <p className="text-ink-soft">
              {t('الاستبدال والترابط: {a}. الموضع: {b}.', { a: orig.gsubKinds || t('لا شيء'), b: orig.gposKinds || t('لا شيء') })}
            </p>
          </div>
        )}
        {original ? null : (<>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <Button key={t} variant="quiet" active={tab === t} onClick={() => setTab(t)}>
              {label(t)}
              {t in FEATURE_INFO && <span className="font-mono text-[10px] text-ink-soft">{count(t as FeatureTag)}</span>}
              {t === 'missing' && missing.length > 0 && (
                <span className="font-mono text-[10px] text-ink-soft">{missing.length}</span>
              )}
            </Button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-3 text-sm leading-7">
            <p className="text-ink-soft">
              {tx('سمِّ الشكل بلاحقة تدل عليه وتعمل الميزة وحدها: {a} للبداية، {b} للوسط، {c} للنهاية، {d} للترابط. أضف الأشكال من المجموعات الجاهزة أو من تبويب الناقص.', {
                a: <span dir="ltr" className="font-mono">beh.init</span>,
                b: <span dir="ltr" className="font-mono">beh.medi</span>,
                c: <span dir="ltr" className="font-mono">beh.fina</span>,
                d: <span dir="ltr" className="font-mono">lam_alef</span>,
              })}
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {FEATURE_ORDER.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className="glass-panel rounded-xl p-3 text-start hover:border-ink/45"
                >
                  <span className="block text-[11px] text-ink-soft">{FEATURE_INFO[t].label}</span>
                  <span className="font-mono text-lg">{count(t)}</span>
                  <span dir="ltr" className="block font-mono text-[10px] text-ink-soft">{t}</span>
                </button>
              ))}
            </div>
            {(report.gaps.length > 0 || report.mismatches.length > 0) && (
              <div className="space-y-1 rounded-2xl border border-ink/20 p-3 text-xs">
                {report.gaps.map((g) => (
                  <p key={g.glyph} className="flex gap-2">
                    <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                    <span><span dir="ltr" className="font-mono">{g.glyph}</span>: {g.message}</span>
                  </p>
                ))}
                {report.mismatches.map((n) => (
                  <p key={n} className="flex gap-2">
                    <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                    <span>{tx('{n}: شكله المختار لا يطابق لاحقة اسمه. عدّله من زر تعديل المحرف.', { n: <span dir="ltr" className="font-mono">{n}</span> })}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {tab in FEATURE_INFO && (
          <div className="space-y-3">
            <p className="text-xs leading-6 text-ink-soft">{FEATURE_INFO[tab as FeatureTag].description}</p>
            {count(tab as FeatureTag) === 0 ? (
              <p className="text-sm text-ink-soft">{t('لا توجد قواعد لهذه الميزة بعد.')}</p>
            ) : (
              <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/15">
                {rules
                  .filter((r) => r.feature === tab)
                  .map((r) => {
                    const target = byName.get(r.to);
                    const sources = r.from.map((n) => byName.get(n)).filter((g) => !!g);
                    return (
                      <li key={r.to} className="flex items-center gap-3 p-2.5">
                        <div className="flex shrink-0 items-center gap-1">
                          {sources.map((s) => (
                            <GlyphThumb key={s!.id} glyph={s!} metrics={project.metrics} className="h-10 w-10" />
                          ))}
                          <span className="px-1 text-ink-soft">{isRtl() ? '←' : '→'}</span>
                          {target && <GlyphThumb glyph={target} metrics={project.metrics} className="h-10 w-10" />}
                        </div>
                        <div dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">
                          {r.from.join(' + ')} → {r.to}
                        </div>
                        <span className="shrink-0 text-[11px] text-ink-soft">
                          {target && isReady(target) ? t('مرسوم') : t('فارغ')}
                        </span>
                        {target && (
                          <Button variant="quiet" onClick={() => onOpenGlyph(target.id)}>
                            {t('رسم')}
                          </Button>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        )}

        {tab === 'missing' && (
          <div className="space-y-3">
            {missing.length === 0 ? (
              <p className="text-sm text-ink-soft">{t('كل أشكال الحروف الموجودة في المشروع مكتملة.')}</p>
            ) : (
              <>
                <p className="text-xs leading-6 text-ink-soft">
                  {t('هذه الأشكال يحتاجها كل حرف بحسب نوع اتصاله (المتصل من الجهتين يحتاج بداية ووسطاً ونهاية، والمتصل بما قبله فقط يحتاج نهاية).')}
                </p>
                <Button
                  variant="primary"
                  onClick={() => onAddGlyphs(missing)}
                >
                  <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>{t('إضافة الكل ({n})', { n: missing.length })}</span>
                </Button>
                <div dir="ltr" className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                  {missing.map((m) => (
                    <span key={m.name} className="rounded-md border border-ink/15 bg-sand/30 px-2 py-0.5">{m.name}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'code' && <CodePane project={project} auto={fea} onSave={onSaveCustomFea} />}
        </>)}
      </div>
    </Modal>
  );
};

/** كود FEA: القواعد التلقائية للقراءة والنسخ، وصندوق قواعدك للتعديل والإضافة. */
const CodePane: React.FC<{ project: FontProject; auto: string; onSave: (t: string) => void }> = ({ project, auto, onSave }) => {
  const saved = project.customFea ?? '';
  const [draft, setDraft] = useState(saved);
  const [copied, setCopied] = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const names = useMemo(() => new Set(project.glyphs.map((g) => g.name)), [project.glyphs]);
  const parsed = useMemo(() => parseFea(draft, names), [draft, names]);
  const dirty = draft !== saved;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink/10 bg-sand/25 p-3 text-xs leading-relaxed text-ink-soft">
        <p className="font-heading text-ink">{t('كيف تعمل القواعد؟')}</p>
        <p className="mt-1">
          {t('التطبيق يكتب القواعد تلقائياً من أسماء المحارف (الأول)، وأنت تضيف قواعدك أو تعدّلها (الثاني). الاثنان يُدمجان عند التصدير. وإن كتبت قاعدة لنفس الميزة والمصدر فقاعدتك تحلّ محل التلقائية.')}
        </p>
        <p className="mt-1">
          {tx('المدعوم: {a} للاستبدال، و{b} للدمج، داخل {c}. قواعد المواضع (GPOS) غير مدعومة بعد.', {
            // i18n-keep
            a: <span dir="ltr" className="font-mono">sub أ by ب;</span>,
            // i18n-keep
            b: <span dir="ltr" className="font-mono">sub أ ب by ج;</span>,
            c: <span dir="ltr" className="font-mono">feature xxxx {'{ ... }'} xxxx;</span>,
          })}
        </p>
      </div>

      <div className="rounded-2xl border border-ink/15">
        <div className="flex items-center gap-2 p-2.5">
          <button
            type="button"
            onClick={() => setShowAuto((v) => !v)}
            aria-expanded={showAuto}
            className="flex min-w-0 flex-1 items-center gap-2 text-start text-sm"
          >
            <ChevronDown className={`h-4 w-4 shrink-0 stroke-[1.5] transition-transform ${showAuto ? 'rotate-180' : ''}`} />
            <span>{t('القواعد التلقائية')}</span>
            <span className="chip chip-ghost font-mono">{auto ? auto.split('\n').filter((l) => l.includes(' by ')).length : 0}</span>
          </button>
          {showAuto && (
            <>
              <Button
                variant="quiet"
                disabled={!auto}
                title={t('يضيف القواعد التلقائية إلى صندوق قواعدك لتعدّلها')}
                onClick={() => setDraft((d) => (d.trim() ? `${d.trimEnd()}\n\n${auto}\n` : `${auto}\n`))}
              >
                <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
                <span>{t('نقل للتعديل')}</span>
              </Button>
              <Button
                variant="quiet"
                icon
                title={t('نسخ')}
                onClick={async () => {
                  const ok = await copyText(auto);
                  setCopied(ok);
                  window.setTimeout(() => setCopied(false), 1800);
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5 stroke-[1.5]" /> : <Copy className="h-3.5 w-3.5 stroke-[1.5]" />}
              </Button>
            </>
          )}
        </div>
        {showAuto && (
          <textarea
            readOnly
            dir="ltr"
            value={auto || t('# لا توجد قواعد تلقائية بعد')}
            className="field w-full resize-y rounded-t-none border-0 border-t border-ink/10 bg-sand/10 font-mono text-xs"
            style={{ height: 150 }}
          />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('قواعدك')}</span>
          <span className="font-mono text-[11px] text-ink-soft">{parsed.rules.length}</span>
        </div>
        <textarea
          dir="ltr"
          spellCheck={false}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={'feature init {\n    sub beh.isol by beh.init;\n} init;'}
          className="field w-full resize-y font-mono text-xs"
          style={{ height: 170 }}
        />
        {parsed.errors.length > 0 && (
          <ul className="space-y-1 rounded-2xl border border-ink/20 p-3 text-xs">
            {parsed.errors.map((e, i) => (
              <li key={i} className="flex gap-2">
                <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                <span>
                  {tx('السطر {n}: {m}', { n: <span className="font-mono">{e.line}</span>, m: e.message })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <Button variant="quiet" onClick={() => setDraft(saved)}>
              {t('تراجع')}
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!dirty || parsed.errors.length > 0}
            title={parsed.errors.length > 0 ? t('أصلح الأخطاء أولاً') : undefined}
            onClick={() => onSave(draft)}
          >
            {t('حفظ القواعد')}
          </Button>
        </div>
      </div>
    </div>
  );
};
