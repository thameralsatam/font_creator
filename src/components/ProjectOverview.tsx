import React, { useState } from 'react';
import {
  ArrowRight,
  PenTool,
  Sliders,
  Download,
  Plus,
  Type,
  AlignRight,
  AlignCenter,
  AlignLeft,
} from 'lucide-react';
import { FontProject, Glyph } from '../types/font';
import { AnimatedCounter } from './AnimatedCounter';

interface ProjectOverviewProps {
  project: FontProject;
  onBackToProjects: () => void;
  onEnterStudio: (glyphId?: string) => void;
  onOpenMetrics: () => void;
  onOpenExport: () => void;
  onAddNewGlyph: (glyphData: { char: string; name: string; unicode: string; category: Glyph['category'] }) => void;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  onBackToProjects,
  onEnterStudio,
  onOpenMetrics,
  onOpenExport,
  onAddNewGlyph,
}) => {
  const [proofText, setProofText] = useState(
    'صَفَا نَبْعُ مَاءٍ عَذْبٍ رَقَّتْ جَدَاوِلُهُ، يَسْتَبْشِرُ الْخَطَّاطُ بِحِبْرٍ نَقِيٍّ وَرِيشَةٍ تَسْطُرُ جَمَالَ الْحُرُوفِ.'
  );
  const [fontSize, setFontSize] = useState<number>(34);
  const [textAlign, setTextAlign] = useState<'right' | 'center' | 'left'>('right');
  const [showAddGlyphModal, setShowAddGlyphModal] = useState(false);

  // New Glyph Modal form
  const [newChar, setNewChar] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnicode, setNewUnicode] = useState('');
  const [newCat, setNewCat] = useState<Glyph['category']>('letter');

  const handleCreateGlyph = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChar) return;
    onAddNewGlyph({
      char: newChar,
      name: newName || `uni${newChar.charCodeAt(0).toString(16).toUpperCase()}`,
      unicode: newUnicode || `U+${newChar.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
      category: newCat,
    });
    setNewChar('');
    setNewName('');
    setNewUnicode('');
    setShowAddGlyphModal(false);
  };

  const activeFeaturesCount = project.features.filter((f) => f.enabled).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Card with Back Button & Direct Studio Entry */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToProjects}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#183630]/20 bg-[#E5C690]/30 text-[#183630] hover:bg-[#E5C690]/55 transition-colors"
            title="الرجوع لقائمة المشاريع"
            aria-label="الرجوع لقائمة المشاريع"
          >
            <ArrowRight className="h-4 w-4 stroke-[1.5]" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-xl sm:text-2xl font-normal text-[#183630]">
                {project.name}
              </h1>
              <span className="rounded-md border border-[#183630]/15 bg-[#E5C690]/35 px-2 py-0.5 text-[10px] font-mono text-[#183630] font-medium">
                v{project.version}
              </span>
            </div>
            <p className="text-xs font-light text-[#183630]/85 mt-0.5">
              المصمم: {project.designer} • مقياس {project.metrics.upm} UPM • {project.glyphs.length} محرف
            </p>
          </div>
        </div>

        {/* Primary CTA: Enter Studio */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={onOpenMetrics}
            className="flex items-center gap-1.5 rounded-xl border border-[#183630]/20 bg-[#EDE6D8] px-3 py-2 text-xs font-light text-[#183630] hover:bg-[#E5C690]/30 transition-colors"
          >
            <Sliders className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>المقاييس</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 rounded-xl border border-[#183630]/20 bg-[#EDE6D8] px-3 py-2 text-xs font-light text-[#183630] hover:bg-[#E5C690]/30 transition-colors"
          >
            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>تصدير</span>
          </button>

          <button
            type="button"
            onClick={() => onEnterStudio()}
            className="flex items-center gap-2 rounded-xl bg-[#183630] px-4 py-2 text-xs font-light text-[#EDE6D8] shadow-sm hover:opacity-90 transition-opacity"
          >
            <PenTool className="h-4 w-4 stroke-[1.5]" />
            <span>دخول استوديو الرسم</span>
          </button>
        </div>
      </div>

      {/* Font Vertical Metrics Strip with Animated Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <div className="glass-panel rounded-xl p-3">
          <span className="block text-[11px] font-light text-[#183630]/75">مقياس UPM</span>
          <AnimatedCounter
            value={project.metrics.upm}
            duration={800}
            className="font-mono text-sm font-semibold text-[#183630]"
          />
        </div>
        <div className="glass-panel rounded-xl p-3">
          <span className="block text-[11px] font-light text-[#183630]/75">الصاعد Ascender</span>
          <AnimatedCounter
            value={project.metrics.ascender}
            duration={800}
            prefix="+"
            className="font-mono text-sm font-semibold text-[#183630]"
          />
        </div>
        <div className="glass-panel rounded-xl p-3">
          <span className="block text-[11px] font-light text-[#183630]/75">التاج Cap Height</span>
          <AnimatedCounter
            value={project.metrics.capHeight}
            duration={800}
            prefix="+"
            className="font-mono text-sm font-semibold text-[#183630]"
          />
        </div>
        <div className="glass-panel rounded-xl p-3">
          <span className="block text-[11px] font-light text-[#183630]/75">ارتفاع x-Height</span>
          <AnimatedCounter
            value={project.metrics.xHeight}
            duration={800}
            prefix="+"
            className="font-mono text-sm font-semibold text-[#183630]"
          />
        </div>
        <div className="glass-panel rounded-xl p-3">
          <span className="block text-[11px] font-light text-[#183630]/75">الهابط Descender</span>
          <AnimatedCounter
            value={project.metrics.descender}
            duration={800}
            className="font-mono text-sm font-semibold text-[#183630]"
          />
        </div>
        <div className="glass-panel rounded-xl p-3">
          <span className="block text-[11px] font-light text-[#183630]/75">ميزات OpenType</span>
          <AnimatedCounter
            value={activeFeaturesCount}
            duration={700}
            suffix=" نشطة"
            className="font-mono text-sm font-semibold text-[#183630]"
          />
        </div>
      </div>

      {/* Live Text Proofing / Tester inside Project Overview */}
      <div className="glass-panel rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#183630]/12">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 stroke-[1.5] text-[#183630]" />
            <h2 className="font-heading text-base font-normal text-[#183630]">
              معاينة حية للمحارف والنص المطبوع
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Alignment */}
            <div className="flex items-center gap-1 rounded-lg border border-[#183630]/15 bg-[#E5C690]/25 p-0.5">
              <button
                type="button"
                onClick={() => setTextAlign('right')}
                className={`p-1 rounded ${textAlign === 'right' ? 'bg-[#183630] text-[#EDE6D8]' : 'text-[#183630]'}`}
                aria-label="محاذاة يمين"
              >
                <AlignRight className="h-3 w-3 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={() => setTextAlign('center')}
                className={`p-1 rounded ${textAlign === 'center' ? 'bg-[#183630] text-[#EDE6D8]' : 'text-[#183630]'}`}
                aria-label="محاذاة وسط"
              >
                <AlignCenter className="h-3 w-3 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={() => setTextAlign('left')}
                className={`p-1 rounded ${textAlign === 'left' ? 'bg-[#183630] text-[#EDE6D8]' : 'text-[#183630]'}`}
                aria-label="محاذاة يسار"
              >
                <AlignLeft className="h-3 w-3 stroke-[1.5]" />
              </button>
            </div>

            {/* Size Slider */}
            <div className="flex items-center gap-2 text-xs font-light text-[#183630]">
              <span className="text-[11px] text-[#183630]/75">الحجم:</span>
              <input
                type="range"
                min="18"
                max="64"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-20 accent-[#183630] cursor-pointer"
              />
              <span className="font-mono text-[11px] w-7 font-medium">{fontSize}px</span>
            </div>
          </div>
        </div>

        {/* Live Text Area */}
        <textarea
          value={proofText}
          onChange={(e) => setProofText(e.target.value)}
          rows={3}
          dir="rtl"
          style={{ fontSize: `${fontSize}px`, textAlign: textAlign, lineHeight: 1.7 }}
          className="w-full bg-transparent text-[#183630] font-heading font-normal resize-none focus:outline-none border-b border-[#183630]/10 pb-3"
          placeholder="اكتب هنا لمعاينة رسم الحروف وانسجامها في الجمل..."
        />

        <div className="flex items-center justify-between text-xs font-light text-[#183630]/75">
          <span>اختبر تناسق المسافات والارتفاعات في السياق الفعلي</span>
          <button
            type="button"
            onClick={() => setProofText('أَبْجَدْ هَوَّزْ حُطِّي كَلَمُنْ صَعْفَصْ قَرَشَتْ ثَخَذْ ضَظَغْ.')}
            className="text-[11px] text-[#183630] hover:underline underline-offset-4 font-normal"
          >
            نص الحروف الأبجدية كاملة
          </button>
        </div>
      </div>

      {/* Glyphs Gallery Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-lg font-normal text-[#183630]">
            المحارف المرسومة
          </h2>
          <span className="rounded-md border border-[#183630]/15 bg-[#E5C690]/30 px-2 py-0.5 text-xs font-mono font-medium text-[#183630]">
            <AnimatedCounter value={project.glyphs.length} duration={1200} />
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAddGlyphModal(true)}
          className="flex items-center gap-1.5 rounded-xl border border-[#183630]/20 bg-[#E5C690]/30 px-3 py-1.5 text-xs font-light text-[#183630] hover:bg-[#E5C690]/50 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
          <span>إضافة محرف</span>
        </button>
      </div>

      {/* Glyphs Gallery Grid or Empty State */}
      {project.glyphs.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {project.glyphs.map((glyph) => (
            <div
              key={glyph.id}
              onClick={() => onEnterStudio(glyph.id)}
              className="glass-panel group rounded-2xl p-4 flex flex-col items-center justify-between cursor-pointer transition-all hover:border-[#183630]/45 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="w-full flex items-center justify-between text-[10px] font-mono text-[#183630]/70">
                <span>{glyph.unicode}</span>
                <span className="text-[9px] uppercase tracking-wider">{glyph.category}</span>
              </div>

              <div className="my-4 flex items-center justify-center h-16 w-full">
                <span className="font-heading text-4xl text-[#183630] transition-transform group-hover:scale-110">
                  {glyph.char}
                </span>
              </div>

              <div className="w-full flex items-center justify-between pt-2 border-t border-[#183630]/10 text-xs text-[#183630]">
                <span className="font-mono text-xs">{glyph.name}</span>
                <span className="text-[10px] font-mono text-[#183630]/75">{glyph.advanceWidth}u</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center shadow-xs">
          <p className="font-heading text-base font-normal text-[#183630] mb-1">
            لا توجد محارف مرسومة في هذا المشروع حتى الآن
          </p>
          <p className="text-xs font-light text-[#183630]/75 max-w-sm mb-4 leading-relaxed">
            المشروع فارغ ومستعد للبدء. أضف محرفك الأول ثم ادخل استوديو الرسم لتشكيل منحنياته.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddGlyphModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#183630] px-4 py-2 text-xs font-light text-[#EDE6D8] shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>إضافة أول محرف</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onAddNewGlyph({ char: 'ا', name: 'alif', unicode: 'U+0627', category: 'letter' });
                onEnterStudio();
              }}
              className="rounded-xl border border-[#183630]/20 bg-[#E5C690]/25 px-4 py-2 text-xs font-light text-[#183630] hover:bg-[#E5C690]/40 transition-colors"
            >
              البدء بحرف الألف
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Glyph */}
      {showAddGlyphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183630]/35 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#183630]/20 bg-[#EDE6D8] p-6 shadow-xl">
            <h3 className="font-heading text-base font-normal text-[#183630] mb-3">
              إضافة محرف جديد للمشروع
            </h3>
            <form onSubmit={handleCreateGlyph} className="space-y-3.5">
              <div>
                <label className="block text-xs font-light text-[#183630]/85 mb-1">
                  المحرف أو الرمز:
                </label>
                <input
                  type="text"
                  maxLength={2}
                  required
                  value={newChar}
                  onChange={(e) => {
                    const c = e.target.value;
                    setNewChar(c);
                    if (c && !newName) {
                      setNewName(`uni${c.charCodeAt(0).toString(16).toUpperCase()}`);
                      setNewUnicode(`U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
                    }
                  }}
                  placeholder="مثال: ف"
                  className="w-full rounded-xl border border-[#183630]/25 bg-transparent px-3 py-2 text-sm font-heading text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/85 mb-1">
                  اسم المحرف (PostScript Glyph Name):
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="feh"
                  className="w-full rounded-xl border border-[#183630]/25 bg-transparent px-3 py-2 text-xs font-mono text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/85 mb-1">
                  نقطة اليونيكود (Unicode):
                </label>
                <input
                  type="text"
                  value={newUnicode}
                  onChange={(e) => setNewUnicode(e.target.value)}
                  placeholder="U+0641"
                  className="w-full rounded-xl border border-[#183630]/25 bg-transparent px-3 py-2 text-xs font-mono text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#183630]/15">
                <button
                  type="button"
                  onClick={() => setShowAddGlyphModal(false)}
                  className="rounded-xl border border-[#183630]/20 px-3.5 py-1.5 text-xs font-light text-[#183630]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#183630] px-4 py-1.5 text-xs font-light text-[#EDE6D8]"
                >
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
