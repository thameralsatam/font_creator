import React, { useState } from 'react';
import { AlignRight, AlignCenter, AlignLeft, RotateCcw, Copy, Check } from 'lucide-react';

export const TypeTester: React.FC = () => {
  const [sampleText, setSampleText] = useState(
    'صَفَا نَبْعُ مَاءٍ عَذْبٍ رَقَّتْ جَدَاوِلُهُ، وَأَشْرَقَتْ شَمْسُ الصَّبَاحِ فِي رِحَابِ الْأَنْدَلُسِ، يَسْتَبْشِرُ الْخَطَّاطُ بِحِبْرٍ نَقِيٍّ وَرِيشَةٍ تَسْطُرُ جَمَالَ الْحُرُوفِ.'
  );
  const [fontSize, setFontSize] = useState<number>(36);
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [textAlign, setTextAlign] = useState<'right' | 'center' | 'left'>('right');
  const [copied, setCopied] = useState(false);

  const presets = [
    {
      title: 'نص الترويسة والعنوان',
      text: 'رِقَّةُ الْخَطِّ نَزْهَةُ الْعُيُونِ وَبَهْجَةُ النُّفُوسِ',
    },
    {
      title: 'شامل كل الحروف (Pangram)',
      text: 'نَصٌّ حَكِيمٌ لَهُ سِرٌّ قَاطِعٌ وَذُو شَأْنٍ عَظِيمٍ يَحْوِي كُلَّ حُرُوفِ الْهِجَاءِ.',
    },
    {
      title: 'الفقرة المتصلة',
      text: 'الخط هندسة روحانية ظهرت بآلة جسمانية، تقوى بالرياضة وتضعف بالترك، وهو فن الإتقان والصفاء.',
    },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#183630]/15 bg-[#E3DAC9] p-3">
        {/* Preset selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-light text-[#183630]/70 ml-1">نماذج الفحص:</span>
          {presets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSampleText(preset.text)}
              className="rounded border border-[#183630]/15 bg-[#E5C690]/20 px-2 py-1 text-xs font-light text-[#183630] transition-colors hover:bg-[#E5C690]/40"
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 rounded border border-[#183630]/15 bg-[#E5C690]/15 p-0.5">
          <button
            type="button"
            onClick={() => setTextAlign('right')}
            className={`p-1.5 rounded transition-colors ${
              textAlign === 'right' ? 'bg-[#183630] text-[#E3DAC9]' : 'text-[#183630] hover:bg-[#E5C690]/30'
            }`}
            title="محاذاة يمين"
            aria-label="محاذاة يمين"
          >
            <AlignRight className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('center')}
            className={`p-1.5 rounded transition-colors ${
              textAlign === 'center' ? 'bg-[#183630] text-[#E3DAC9]' : 'text-[#183630] hover:bg-[#E5C690]/30'
            }`}
            title="محاذاة وسط"
            aria-label="محاذاة وسط"
          >
            <AlignCenter className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('left')}
            className={`p-1.5 rounded transition-colors ${
              textAlign === 'left' ? 'bg-[#183630] text-[#E3DAC9]' : 'text-[#183630] hover:bg-[#E5C690]/30'
            }`}
            title="محاذاة يسار"
            aria-label="محاذاة يسار"
          >
            <AlignLeft className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
        </div>

        {/* Slider Controls */}
        <div className="flex items-center gap-4 text-xs font-light text-[#183630]">
          {/* Size */}
          <div className="flex items-center gap-2">
            <label htmlFor="font-size-slider" className="text-[11px] text-[#183630]/70">الحجم:</label>
            <input
              id="font-size-slider"
              type="range"
              min="14"
              max="84"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-20 accent-[#183630] cursor-pointer"
            />
            <span className="font-mono text-[11px] w-6">{fontSize}px</span>
          </div>

          {/* Line Height */}
          <div className="flex items-center gap-2">
            <label htmlFor="line-height-slider" className="text-[11px] text-[#183630]/70">السطر:</label>
            <input
              id="line-height-slider"
              type="range"
              min="1.2"
              max="2.6"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="w-16 accent-[#183630] cursor-pointer"
            />
            <span className="font-mono text-[11px] w-6">{lineHeight}</span>
          </div>
        </div>
      </div>

      {/* Proofing Workspace / Live Preview */}
      <div className="rounded-md border border-[#183630]/20 bg-[#E3DAC9] p-6 shadow-xs min-h-[380px] flex flex-col justify-between">
        <textarea
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
          rows={6}
          dir="rtl"
          aria-label="مساحة فحص وتجربة النص"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
            letterSpacing: `${letterSpacing}px`,
            textAlign: textAlign,
          }}
          className="w-full bg-transparent text-[#183630] font-heading font-normal resize-none focus:outline-none border-b border-[#183630]/10 pb-4 transition-all"
          placeholder="اكتب هنا لتجربة الخط مباشرة..."
        />

        {/* Info & Action Footer */}
        <div className="flex items-center justify-between pt-4 text-xs font-light text-[#183630]/70">
          <div className="flex items-center gap-3">
            <span>عدد الحروف: <strong className="font-mono">{sampleText.length}</strong></span>
            <span>عدد الكلمات: <strong className="font-mono">{sampleText.trim() ? sampleText.trim().split(/\s+/).length : 0}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded border border-[#183630]/20 px-2.5 py-1 text-xs text-[#183630] hover:bg-[#E5C690]/25 transition-colors"
            >
              {copied ? <Check className="h-3 w-3 stroke-[1.5]" /> : <Copy className="h-3 w-3 stroke-[1.5]" />}
              <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFontSize(36);
                setLineHeight(1.8);
                setTextAlign('right');
              }}
              className="rounded p-1 text-[#183630]/60 hover:text-[#183630] hover:bg-[#E5C690]/25 transition-colors"
              title="إعادة ضبط المقاييس"
              aria-label="إعادة ضبط المقاييس"
            >
              <RotateCcw className="h-3.5 w-3.5 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
