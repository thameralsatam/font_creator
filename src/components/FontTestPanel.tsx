import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Type } from 'lucide-react';
import { type FontProject } from '../types/font';
import { buildFontBuffer } from '../utils/fontBuild';
import { Button } from './ui/Button';

/** اختبار الخط بكتابة نص: يُبنى الخط الحقيقي ويُحمَّل في المتصفح فتُطبَّق الميزات مثل أي برنامج. */
const TestBody: React.FC<{ project: FontProject }> = ({ project }) => {
  const [text, setText] = useState('بسم الله الرحمن الرحيم');
  const [size, setSize] = useState(48);
  const [state, setState] = useState<'idle' | 'busy' | 'ready' | 'error'>('idle');
  const [family, setFamily] = useState<string | null>(null);
  const counter = useRef(0);
  const added = useRef<FontFace[]>([]);

  const rebuild = async () => {
    setState('busy');
    try {
      const buf = await buildFontBuffer(project);
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

  return (
    <div className="space-y-3 border-t border-ink/10 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="field min-w-0 flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="نص الاختبار"
        />
        <input
          type="range"
          min={20}
          max={120}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          aria-label="حجم الخط"
          className="w-24"
        />
        <Button onClick={() => void rebuild()} disabled={state === 'busy'}>
          {state === 'busy' ? 'جارٍ البناء' : 'تحديث'}
        </Button>
      </div>
      <div
        dir="rtl"
        className="plate min-h-24 overflow-auto p-4"
        style={{ fontFamily: family ? `"${family}"` : undefined, fontSize: size, lineHeight: 1.6 }}
      >
        {state === 'error' ? 'تعذّر بناء الخط. راجع التنبيهات في نافذة التصدير.' : text}
      </div>
      <p className="text-xs leading-6 text-ink-soft">
        الحروف التي لم تُرسم تظهر فراغاً. بعد تعديل رسم أو قاعدة اضغط تحديث.
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
          <span className="block text-sm">اختبار الخط</span>
          <span className="block truncate text-[11px] text-ink-soft">اكتب نصاً وشاهده بخطك مع الميزات</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 stroke-[1.5] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <TestBody project={project} />}
    </section>
  );
};
