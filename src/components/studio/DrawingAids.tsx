import React, { useRef } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { type Glyph } from '../../types/font';
import { Button } from '../ui/Button';

/** صورة تتبع خلف الرسم. القيم بوحدات الخط، وتبقى في الجلسة فقط ولا تُحفظ مع المشروع. */
export interface Trace {
  url: string;
  w: number;
  h: number;
  opacity: number;
  /** نسبة من ارتفاع المقاييس (الصاعد − الهابط). */
  scale: number;
  dx: number;
  dy: number;
}

export interface Neighbors {
  left: string;
  right: string;
}

/** يبحث عن محرف بالاسم الكامل أو بالحرف نفسه (والمنفصل أولاً). */
export function findGlyph(glyphs: Glyph[], query: string): Glyph | null {
  const q = query.trim();
  if (!q) return null;
  const byName = glyphs.find((g) => g.name === q);
  if (byName) return byName;
  const byChar = glyphs.filter((g) => g.char === q);
  return byChar.find((g) => g.form === 'isolated') ?? byChar[0] ?? null;
}

const Num: React.FC<{ label: string; value: number; onCommit: (n: number) => void }> = ({ label, value, onCommit }) => (
  <label className="flex items-center justify-between gap-2 text-xs">
    <span>{label}</span>
    <input
      key={value}
      dir="ltr"
      inputMode="decimal"
      defaultValue={value}
      className="field w-20 text-center font-mono"
      style={{ height: 30 }}
      onBlur={(e) => {
        const n = Number(e.currentTarget.value);
        if (Number.isFinite(n) && n !== value) onCommit(n);
        else e.currentTarget.value = String(value);
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  </label>
);

/** لوحة عائمة فوق الرسم: جيران المحرف وصورة التتبع. */
export const DrawingAids: React.FC<{
  glyphs: Glyph[];
  neighbors: Neighbors;
  onNeighbors: (n: Neighbors) => void;
  trace: Trace | null;
  onTrace: (t: Trace | null) => void;
  onClose: () => void;
}> = ({ glyphs, neighbors, onNeighbors, trace, onTrace, onClose }) => {
  const file = useRef<HTMLInputElement>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      if (trace) URL.revokeObjectURL(trace.url);
      onTrace({ url, w: img.naturalWidth || 1, h: img.naturalHeight || 1, opacity: 40, scale: 100, dx: 0, dy: 0 });
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const side = (key: keyof Neighbors, label: string) => {
    const g = findGlyph(glyphs, neighbors[key]);
    return (
      <label className="block space-y-1 text-xs">
        <span>{label}</span>
        <input
          className="field w-full"
          style={{ height: 32 }}
          placeholder="حرف أو اسم محرف"
          value={neighbors[key]}
          onChange={(e) => onNeighbors({ ...neighbors, [key]: e.target.value })}
        />
        {neighbors[key].trim() !== '' && (
          <span dir="ltr" className="block text-start font-mono text-[10px] text-ink-soft">
            {g ? g.name : '—'}
          </span>
        )}
      </label>
    );
  };

  return (
    <section
      aria-label="مساعدات الرسم"
      className="glass-panel absolute bottom-3 start-3 z-10 max-h-[calc(100%-1.5rem)] w-[min(17rem,calc(100%-1.5rem))] space-y-3 overflow-y-auto rounded-2xl p-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm">مساعدات الرسم</h3>
        <Button variant="quiet" icon title="إغلاق" onClick={onClose}>
          <X className="h-4 w-4 stroke-[1.5]" />
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-ink-soft">جيران المحرف: يظهران باهتين بجانب رسمك لتقيس المسافة بالعين.</p>
        {side('left', 'على يسار المحرف')}
        {side('right', 'على يمين المحرف')}
      </div>

      <div className="space-y-2 border-t border-ink/10 pt-3">
        <p className="text-xs text-ink-soft">صورة تتبع: ضع صورة حرفك خلف الرسم وارسم فوقها.</p>
        <Button variant="secondary" onClick={() => file.current?.click()}>
          <ImagePlus className="h-4 w-4 stroke-[1.5]" />
          <span>{trace ? 'تغيير الصورة' : 'اختيار صورة'}</span>
        </Button>
        <input ref={file} type="file" accept="image/*" className="hidden" onChange={pick} />
        {trace && (
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-2 text-xs">
              <span>الشفافية</span>
              <input
                type="range"
                min={5}
                max={100}
                value={trace.opacity}
                className="w-28"
                onChange={(e) => onTrace({ ...trace, opacity: Number(e.target.value) })}
              />
            </label>
            <Num label="الحجم %" value={trace.scale} onCommit={(n) => n > 0 && onTrace({ ...trace, scale: n })} />
            <Num label="إزاحة أفقية" value={trace.dx} onCommit={(n) => onTrace({ ...trace, dx: n })} />
            <Num label="إزاحة رأسية" value={trace.dy} onCommit={(n) => onTrace({ ...trace, dy: n })} />
            <div className="flex gap-2">
              <Button variant="quiet" onClick={() => onTrace({ ...trace, scale: 100, dx: 0, dy: 0 })}>
                إعادة الضبط
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  URL.revokeObjectURL(trace.url);
                  onTrace(null);
                }}
              >
                <Trash2 className="h-4 w-4 stroke-[1.5]" />
                <span>إزالة</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
