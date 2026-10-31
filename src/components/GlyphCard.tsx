import React from 'react';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { type FontMetrics, type Glyph } from '../types/font';
import { isReady } from '../utils/glyphLogic';
import { CATEGORY_LABEL, FORM_LABEL } from '../utils/labels';
import { GlyphThumb } from './GlyphThumb';
import { Button } from './ui/Button';

interface GlyphCardProps {
  glyph: Glyph;
  metrics: FontMetrics;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const ic = 'h-3.5 w-3.5 stroke-[1.5]';

/** بطاقة محرف: معاينة في الأعلى، ثم الاسم، ثم كبسولات البيانات، ثم أدوات متساوية الحجم. */
const GlyphCardBase: React.FC<GlyphCardProps> = ({ glyph, metrics, onOpen, onEdit, onDuplicate, onDelete }) => {
  const ready = isReady(glyph);
  return (
    <div className="card-flat flex flex-col overflow-hidden rounded-2xl transition-colors hover:border-ink/50">
      <button
        type="button"
        onClick={() => onOpen(glyph.id)}
        className="flex flex-col items-stretch gap-2.5 p-3 text-start"
        title="فتح المحرف في الاستوديو"
      >
        <div className="flex h-20 items-center justify-center rounded-xl border border-ink/10 bg-sand/15">
          <GlyphThumb glyph={glyph} metrics={metrics} className="h-full w-full p-1.5" />
        </div>
        <span dir="ltr" className="truncate text-center font-mono text-xs" title={glyph.name}>
          {glyph.name}
        </span>
        <div className="flex flex-wrap justify-center gap-1">
          <span dir="ltr" className="chip font-mono">{glyph.unicode || '—'}</span>
          <span className={`chip ${ready ? 'chip-solid' : 'chip-ghost'}`}>{ready ? 'مرسوم' : 'فارغ'}</span>
          <span className="chip chip-ghost">{CATEGORY_LABEL[glyph.category]}</span>
          {glyph.form !== 'isolated' && <span className="chip chip-ghost">{FORM_LABEL[glyph.form]}</span>}
          <span dir="ltr" className="chip chip-ghost font-mono">{glyph.advanceWidth}</span>
        </div>
      </button>
      <div className="mt-auto grid grid-cols-3 divide-x divide-x-reverse divide-ink/10 border-t border-ink/10">
        <Button variant="quiet" className="rounded-none" title="تعديل بيانات المحرف" onClick={() => onEdit(glyph.id)}>
          <Pencil className={ic} />
        </Button>
        <Button variant="quiet" className="rounded-none" title="تكرار المحرف" onClick={() => onDuplicate(glyph.id)}>
          <Copy className={ic} />
        </Button>
        <Button variant="quiet" className="rounded-none" title="حذف المحرف" onClick={() => onDelete(glyph.id)}>
          <Trash2 className={ic} />
        </Button>
      </div>
    </div>
  );
};

export const GlyphCard = React.memo(GlyphCardBase);
