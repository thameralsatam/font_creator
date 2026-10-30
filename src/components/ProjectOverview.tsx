import React, { useState } from 'react';
import { ArrowRight, Download, PenTool, Plus, Sliders } from 'lucide-react';
import { type FontProject, type GlyphCategory, type NewGlyphData } from '../types/font';
import { defaultGlyphName, defaultUnicode, validateNewGlyph } from '../utils/fontLogic';
import { CATEGORY_LABEL } from '../utils/labels';
import { AnimatedCounter } from './AnimatedCounter';
import { GlyphThumb } from './GlyphThumb';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface ProjectOverviewProps {
  project: FontProject;
  onBackToProjects: () => void;
  onEnterStudio: (glyphId?: string) => void;
  onOpenMetrics: () => void;
  onOpenExport: () => void;
  onAddNewGlyph: (glyphData: NewGlyphData) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  onBackToProjects,
  onEnterStudio,
  onOpenMetrics,
  onOpenExport,
  onAddNewGlyph,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [char, setChar] = useState('');
  const [name, setName] = useState('');
  const [unicode, setUnicode] = useState('');
  const [category, setCategory] = useState<GlyphCategory>('letter');
  // ما دام المستخدم لم يعدّل الاسم أو اليونيكود يدوياً نملؤهما تلقائياً من المحرف
  const [autoFill, setAutoFill] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { metrics, glyphs } = project;
  const activeFeatures = project.features.filter((f) => f.enabled).length;
  const isEmpty = glyphs.length === 0;

  const closeAdd = () => {
    setShowAdd(false);
    setChar('');
    setName('');
    setUnicode('');
    setCategory('letter');
    setAutoFill(true);
    setError(null);
  };

  const handleCharChange = (value: string) => {
    setChar(value);
    setError(null);
    if (autoFill) {
      setName(defaultGlyphName(value));
      setUnicode(defaultUnicode(value));
    }
  };

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const data: NewGlyphData = {
      char: char.trim(),
      name: name.trim(),
      unicode: unicode.trim().toUpperCase(),
      category,
    };
    const problem = validateNewGlyph(glyphs, data);
    if (problem) {
      setError(problem);
      return;
    }
    onAddNewGlyph(data);
    closeAdd();
  };

  const stats: Array<{ label: string; value: number; prefix?: string }> = [
    { label: 'مقياس UPM', value: metrics.upm },
    { label: 'الصاعد', value: metrics.ascender, prefix: '+' },
    { label: 'ارتفاع الحروف الكبيرة', value: metrics.capHeight, prefix: '+' },
    { label: 'ارتفاع الحروف الصغيرة', value: metrics.xHeight, prefix: '+' },
    { label: 'الهابط', value: metrics.descender },
    { label: 'ميزات الأوبن تايب النشطة', value: activeFeatures },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* الترويسة */}
      <div className="glass-panel flex flex-col justify-between gap-4 rounded-2xl p-5 sm:p-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon title="الرجوع إلى قائمة المشاريع" onClick={onBackToProjects}>
            <ArrowRight className="h-4 w-4 stroke-[1.5]" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl sm:text-2xl">{project.name}</h1>
              <span className="rounded-md border border-ink/15 bg-sand/35 px-2 py-0.5 font-mono text-[10px]">
                v{project.version}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">
              المصمم: {project.designer} · {glyphs.length} محرف
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onOpenMetrics}>
            <Sliders className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>المقاييس</span>
          </Button>
          <Button onClick={onOpenExport}>
            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>تصدير</span>
          </Button>
          <Button
            variant="primary"
            disabled={isEmpty}
            title={isEmpty ? 'أضف محرفاً أولاً' : undefined}
            onClick={() => onEnterStudio()}
          >
            <PenTool className="h-4 w-4 stroke-[1.5]" />
            <span>دخول استوديو الرسم</span>
          </Button>
        </div>
      </div>

      {/* المقاييس */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="glass-panel rounded-xl p-3">
            <span className="block text-[11px] text-ink-soft">{s.label}</span>
            <AnimatedCounter
              value={s.value}
              duration={700}
              prefix={s.prefix}
              className="font-mono text-sm"
            />
          </div>
        ))}
      </div>

      {/* المحارف */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg">المحارف المرسومة</h2>
          <span className="rounded-md border border-ink/15 bg-sand/30 px-2 py-0.5 font-mono text-xs">
            {glyphs.length}
          </span>
        </div>
        {!isEmpty && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>إضافة محرف</span>
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="glass-panel flex flex-col items-center rounded-2xl p-8 text-center sm:p-10">
          <p className="mb-1 text-base">لا توجد محارف في هذا المشروع حتى الآن</p>
          <p className="mb-4 max-w-sm text-xs leading-relaxed text-ink-soft">
            أضف محرفك الأول، ثم ادخل استوديو الرسم لتشكيل منحنياته.
          </p>
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>إضافة أول محرف</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {glyphs.map((glyph) => (
            <button
              key={glyph.id}
              type="button"
              onClick={() => onEnterStudio(glyph.id)}
              className="glass-panel group flex flex-col items-stretch rounded-2xl p-4 text-start transition-all hover:-translate-y-1 hover:border-ink/45 hover:shadow-md"
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-ink-soft">
                <span>{glyph.unicode || '—'}</span>
                <span className="font-sans">{CATEGORY_LABEL[glyph.category]}</span>
              </div>
              <div className="my-3 flex h-20 items-center justify-center">
                <GlyphThumb
                  glyph={glyph}
                  metrics={metrics}
                  className="h-full w-full transition-transform group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between border-t border-ink/10 pt-2 text-xs">
                <span className="font-mono">{glyph.name}</span>
                <span className="font-mono text-[10px] text-ink-soft">{glyph.advanceWidth}u</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="إضافة محرف جديد" onClose={closeAdd}>
          <form onSubmit={submitAdd} className="space-y-3.5">
            <div>
              <label htmlFor="g-char" className="mb-1 block text-xs text-ink-soft">المحرف أو الرمز</label>
              <input
                id="g-char"
                autoFocus
                required
                maxLength={4}
                value={char}
                onChange={(e) => handleCharChange(e.target.value)}
                placeholder="مثال: ف"
                className="field font-heading text-base"
              />
            </div>
            <div>
              <label htmlFor="g-name" className="mb-1 block text-xs text-ink-soft">اسم المحرف في الخط</label>
              <input
                id="g-name"
                dir="ltr"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setAutoFill(false);
                  setError(null);
                }}
                placeholder="feh"
                className="field font-mono"
              />
            </div>
            <div>
              <label htmlFor="g-unicode" className="mb-1 block text-xs text-ink-soft">نقطة اليونيكود</label>
              <input
                id="g-unicode"
                dir="ltr"
                value={unicode}
                onChange={(e) => {
                  setUnicode(e.target.value);
                  setAutoFill(false);
                  setError(null);
                }}
                placeholder="U+0641"
                className="field font-mono"
              />
            </div>
            <div>
              <label htmlFor="g-cat" className="mb-1 block text-xs text-ink-soft">التصنيف</label>
              <select
                id="g-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as GlyphCategory)}
                className="field"
              >
                {(Object.keys(CATEGORY_LABEL) as GlyphCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABEL[key]}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-ink/20 bg-sand/30 p-2.5 text-xs">
                {error}
              </p>
            )}

            <ModalActions>
              <Button onClick={closeAdd}>إلغاء</Button>
              <Button type="submit" variant="primary">إضافة</Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
};
