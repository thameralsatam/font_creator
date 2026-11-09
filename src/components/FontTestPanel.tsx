import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Type } from 'lucide-react';
import { type FontProject } from '../types/font';
import { buildFontBuffer } from '../utils/fontBuild';
import { featureTags, readRawTable } from '../utils/gpos';
import { OT_DEFAULT_ON, otFeatureLabel } from '../utils/labels';
import { t } from '../i18n';
import { Button } from './ui/Button';

const SAMPLES: Array<{ label: string; text: string }> = [
  { label: t('البسملة'), text: 'بسم الله الرحمن الرحيم' }, // i18n-keep
  { label: t('الأبجدية'), text: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي' }, // i18n-keep
  { label: t('التشكيل'), text: 'مَرْحَبًا بِكُمْ يُؤَكِّدُ ٱلْأَمِيرُ سَّ ضِّ' }, // i18n-keep
  { label: t('لام ألف'), text: 'لا إله إلا الله لأن لإن لآن' }, // i18n-keep
  { label: t('الأرقام'), text: '٠١٢٣٤٥٦٧٨٩ 0123456789' }, // i18n-keep
  { label: t('جملة'), text: 'الخط العربي جميل ومتناسق' }, // i18n-keep
];

/** اختبار الخط بكتابة نص: يُبنى الخط الحقيقي ويُحمَّل في المتصفح فتُطبَّق الميزات مثل أي برنامج. */
const TestBody: React.FC<{ project: FontProject }> = ({ project }) => {
  const [text, setText] = useState('');
  const [size, setSize] = useState(48);
  const [dark, setDark] = useState(false);
  const [ltr, setLtr] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'ready' | 'error'>('idle');
  const [family, setFamily] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const counter = useRef(0);
  const added = useRef<FontFace[]>([]);

  const rebuild = async () => {
    setState('busy');
    try {
      const buf = await buildFontBuffer(project);
      const found = new Set<string>();
      for (const t of ['GSUB', 'GPOS']) {
        const raw = readRawTable(buf, t);
        if (raw) featureTags(raw).forEach((x) => found.add(x));
      }
      const list = [...found].sort();
      setTags(list);
      setOn((prev) => Object.fromEntries(list.map((t) => [t, prev[t] ?? OT_DEFAULT_ON.has(t)])));
      const name = `FSPreview${++counter.current}`;
      const face = new FontFace(name, buf);
      await face.load();
      document.fonts.add(face);
      added.current.push(face);
      setFamily(name);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    void rebuild();
    const faces = added.current;
    return () => faces.forEach((f) => document.fonts.delete(f));
    // يُبنى مرة عند الفتح، ثم عند زر التحديث
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // نرسل للمتصفح فقط ما يخالف الافتراضي
  const settings = tags
    .filter((t) => on[t] !== OT_DEFAULT_ON.has(t))
    .map((t) => `"${t}" ${on[t] ? 1 : 0}`)
    .join(', ');

  return (
    <div className="space-y-3 border-t border-ink/10 p-3.5 sm:p-4">
      <div className="flex flex-wrap gap-1.5">
        {SAMPLES.map((s) => (
          <Button key={s.label} variant="quiet" onClick={() => setText(s.text)}>
            {s.label}
          </Button>
        ))}
      </div>
      <textarea
        className="field min-h-16 w-full resize-y"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={t('نص الاختبار')}
        placeholder={t('اكتب نصاً لتراه بخطك')}
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          {t('الحجم')}
          <input type="range" min={16} max={160} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label={t('حجم الخط')} className="w-28" />
          <span className="font-mono">{size}</span>
        </label>
        <Button active={dark} onClick={() => setDark((v) => !v)}>{t('خلفية داكنة')}</Button>
        <Button active={ltr} onClick={() => setLtr((v) => !v)}>{t('اتجاه من اليسار')}</Button>
        <Button onClick={() => void rebuild()} disabled={state === 'busy'}>
          {state === 'busy' ? t('جارٍ البناء') : t('تحديث')}
        </Button>
      </div>
      {tags.length > 0 && (
        <div>
          <div className="mb-1 text-xs text-ink-soft">{t('ميزات الخط ({n}): اضغط لتفعيلها أو إيقافها في المعاينة', { n: tags.length })}</div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Button key={t} variant="quiet" active={on[t]} title={otFeatureLabel(t)} onClick={() => setOn((o) => ({ ...o, [t]: !o[t] }))}>
                <span className="font-mono text-[11px]" dir="ltr">{t}</span>
                <span className="text-[11px]">{otFeatureLabel(t)}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      <div
        dir={ltr ? 'ltr' : 'rtl'}
        className={`min-h-24 overflow-auto rounded-2xl border border-ink/15 p-4 ${dark ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}
        style={{ fontFamily: family ? `"${family}"` : undefined, fontSize: size, lineHeight: 1.7, fontFeatureSettings: settings || undefined }}
      >
        {state === 'error' ? t('تعذّر بناء الخط. راجع التنبيهات في نافذة التصدير.') : text}
      </div>
      <p className="text-xs leading-6 text-ink-soft">
        {t('الحروف التي لم تُرسم تظهر فراغاً. بعد تعديل رسم أو قاعدة اضغط تحديث.')}
      </p>
    </div>
  );
};

/** كبسولة قابلة للطي. لا يُبنى الخط إلا عند فتحها حتى تبقى الصفحة خفيفة. */
export const FontTestPanel: React.FC<{ project: FontProject }> = ({ project }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className="capsule overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 p-3.5 text-start sm:p-4"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-ink/20 bg-sand/30">
          <Type className="h-4 w-4 stroke-[1.5]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm">{t('اختبار الخط')}</span>
          <span className="block truncate text-[11px] text-ink-soft">{t('اكتب نصاً وشاهده بخطك مع الميزات')}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 stroke-[1.5] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <TestBody project={project} />}
    </section>
  );
};
