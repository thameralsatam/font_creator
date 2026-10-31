import React from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { type FontMetrics, type Glyph } from '../types/font';
import { isReady } from '../utils/glyphLogic';
import { CATEGORY_LABEL, FORM_LABEL } from '../utils/labels';
import { GlyphThumb } from './GlyphThumb';
import { CardMenu } from './ui/CardMenu';
import { MenuItem } from './ui/Dropdown';

interface GlyphCardProps {
  glyph: Glyph;
  metrics: FontMetrics;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const ic = 'h-4 w-4 stroke-[1.5]';

/**
 * بطاقة محرف احترافية ومنظمة:
 * - معاينة واضحة مع شبكة هندسية دقيقة داخل إطار أبيض ناصع.
 * - زر القائمة الثلاثي موضوع بشكل أنيق في الزاوية دون تداخل.
 */
const GlyphCardBase: React.FC<GlyphCardProps> = ({ glyph, metrics, onOpen, onEdit, onDuplicate, onDelete }) => {
  const ready = isReady(glyph);
  const kind = glyph.form !== 'isolated' ? FORM_LABEL[glyph.form] : CATEGORY_LABEL[glyph.category];
  return (
    <div className="capsule relative flex flex-col justify-between">
      <CardMenu label="إجراءات المحرف" className="absolute top-2 start-2 z-20" />
      <button
        type="button"
        onClick={() => onOpen(glyph.id)}
        className="flex w-full flex-col gap-2.5 p-3 text-start"
        title="فتح المحرف في الاستوديو"
      >
        <div className="plate relative flex h-24 sm:h-28 items-center justify-center p-2 overflow-hidden">
          <GlyphThumb glyph={glyph} metrics={metrics} className="h-full w-full p-1" />
          {!ready && (
            <span className="absolute bottom-2 end-2 rounded-md bg-paper/90 px-1.5 py-0.5 font-mono text-[10px] text-ink-soft shadow-sm">
              فارغ
            </span>
          )}
        </div>

        <div className="min-w-0 space-y-1 px-0.5">
          <div className="flex items-center justify-between gap-2">
            <span dir="ltr" className="truncate font-mono text-xs font-semibold text-ink sm:text-sm" title={glyph.name}>
              {glyph.name}
            </span>
            <span dir="ltr" className="shrink-0 font-mono text-[11px] text-ink-soft">
              {glyph.unicode || '—'}
            </span>
          </div>
          <div className="truncate text-[11px] text-ink-soft" title={kind}>
            {kind}
          </div>
        </div>
      </button>
    </div>
  );
};

export const GlyphCard = React.memo(GlyphCardBase);
