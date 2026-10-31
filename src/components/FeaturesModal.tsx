import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Plus, Sparkles } from 'lucide-react';
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
import { GlyphThumb } from './GlyphThumb';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface FeaturesModalProps {
  project: FontProject;
  onAddGlyphs: (items: NewGlyphData[]) => void;
  onOpenGlyph: (glyphId: string) => void;
  onSaveCustomFea: (text: string) => void;
  onClose: () => void;
}

type Tab = 'overview' | FeatureTag | 'missing' | 'code';

const TAB_LABEL: Record<'overview' | 'missing' | 'code', string> = {
  overview: 'نظرة عامة',
  missing: 'الناقص',
  code: 'الكود',
};

/** مكان ميزات الأوبن تايب: ما يعمل منها، وما ينقص، وكودها، واختبارها بالخط الحقيقي. */
export const FeaturesModal: React.FC<FeaturesModalProps> = ({ project, onAddGlyphs, onOpenGlyph, onSaveCustomFea, onClose }) => {
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
      title="ميزات الأوبن تايب"
      subtitle="تُستخرج تلقائياً من أسماء المحارف وتُكتب داخل ملف الخط"
      icon={<Sparkles className="h-4 w-4 stroke-[1.5]" />}
      size="xl"
      onClose={onClose}
    >
      <div className="mt-4 space-y-4">
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
              سمِّ الشكل بلاحقة تدل عليه وتعمل الميزة وحدها: <span dir="ltr" className="font-mono">beh.init</span> للبداية،{' '}
              <span dir="ltr" className="font-mono">beh.medi</span> للوسط، <span dir="ltr" className="font-mono">beh.fina</span> للنهاية،{' '}
              <span dir="ltr" className="font-mono">lam_alef</span> للترابط. أضف الأشكال من المجموعات الجاهزة أو من تبويب الناقص.
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
                    <span><span dir="ltr" className="font-mono">{n}</span>: شكله المختار لا يطابق لاحقة اسمه. عدّله من زر تعديل المحرف.</span>
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
              <p className="text-sm text-ink-soft">لا توجد قواعد لهذه الميزة بعد.</p>
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
                          <span className="px-1 text-ink-soft">←</span>
                          {target && <GlyphThumb glyph={target} metrics={project.metrics} className="h-10 w-10" />}
                        </div>
                        <div dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">
                          {r.from.join(' + ')} → {r.to}
                        </div>
                        <span className="shrink-0 text-[11px] text-ink-soft">
                          {target && isReady(target) ? 'مرسوم' : 'فارغ'}
                        </span>
                        {target && (
                          <Button variant="quiet" onClick={() => onOpenGlyph(target.id)}>
                            رسم
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
              <p className="text-sm text-ink-soft">كل أشكال الحروف الموجودة في المشروع مكتملة.</p>
            ) : (
              <>
                <p className="text-xs leading-6 text-ink-soft">
                  هذه الأشكال يحتاجها كل حرف بحسب نوع اتصاله (المتصل من الجهتين يحتاج بداية ووسطاً ونهاية، والمتصل بما قبله فقط يحتاج نهاية).
                </p>
                <Button
                  variant="primary"
                  onClick={() => onAddGlyphs(missing)}
                >
                  <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
                  <span>إضافة الكل ({missing.length})</span>
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
      </div>
    </Modal>
  );
};

/** كود FEA: القواعد التلقائية للقراءة والنسخ، وصندوق قواعدك للتعديل والإضافة. */
const CodePane: React.FC<{ project: FontProject; auto: string; onSave: (t: string) => void }> = ({ project, auto, onSave }) => {
  const saved = project.customFea ?? '';
  const [draft, setDraft] = useState(saved);
  const [copied, setCopied] = useState(false);
  const names = useMemo(() => new Set(project.glyphs.map((g) => g.name)), [project.glyphs]);
  const parsed = useMemo(() => parseFea(draft, names), [draft, names]);
  const dirty = draft !== saved;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink/10 bg-sand/25 p-3 text-xs leading-relaxed text-ink-soft">
        <p className="font-heading text-ink">كيف تعمل القواعد؟</p>
        <p className="mt-1">
          التطبيق يكتب القواعد تلقائياً من أسماء المحارف (الأول)، وأنت تضيف قواعدك أو تعدّلها (الثاني). الاثنان يُدمجان
          عند التصدير. وإن كتبت قاعدة لنفس الميزة والمصدر فقاعدتك تحلّ محل التلقائية.
        </p>
        <p className="mt-1">
          المدعوم: <span dir="ltr" className="font-mono">sub أ by ب;</span> للاستبدال، و{' '}
          <span dir="ltr" className="font-mono">sub أ ب by ج;</span> للدمج، داخل{' '}
          <span dir="ltr" className="font-mono">feature xxxx {'{ ... }'} xxxx;</span>. قواعد المواضع (GPOS) غير مدعومة بعد.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">القواعد التلقائية</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="quiet"
              disabled={!auto}
              title="يضيف القواعد التلقائية إلى صندوق قواعدك لتعدّلها"
              onClick={() => setDraft((d) => (d.trim() ? `${d.trimEnd()}\n\n${auto}\n` : `${auto}\n`))}
            >
              <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>نقل للتعديل</span>
            </Button>
            <Button
              variant="quiet"
              icon
              title="نسخ"
              onClick={async () => {
                const ok = await copyText(auto);
                setCopied(ok);
                window.setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5 stroke-[1.5]" /> : <Copy className="h-3.5 w-3.5 stroke-[1.5]" />}
            </Button>
          </div>
        </div>
        <textarea
          readOnly
          dir="ltr"
          value={auto || '# لا توجد قواعد تلقائية بعد'}
          className="field w-full resize-y bg-sand/10 font-mono text-xs"
          style={{ height: 150 }}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">قواعدك</span>
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
                  السطر <span className="font-mono">{e.line}</span>: {e.message}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <Button variant="quiet" onClick={() => setDraft(saved)}>
              تراجع
            </Button>
          )}
          <Button
            variant="primary"
            disabled={!dirty || parsed.errors.length > 0}
            title={parsed.errors.length > 0 ? 'أصلح الأخطاء أولاً' : undefined}
            onClick={() => onSave(draft)}
          >
            حفظ القواعد
          </Button>
        </div>
      </div>
    </div>
  );
};
