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

/** بطاقة محرف خفيفة. لا تُعاد رسمها إلا إن تغيّر المحرف أو المقاييس (الدوال المرسلة ثابتة). */
const GlyphCardBase: React.FC<GlyphCardProps> = ({ glyph, metrics, onOpen, onEdit, onDuplicate, onDelete }) => {
  const ready = isReady(glyph);
  return (
    <div className="card-flat group flex flex-col rounded-2xl p-3.5 transition-shadow hover:border-ink/45 hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen(glyph.id)}
        className="flex flex-col items-stretch text-start"
        title="فتح المحرف في الاستوديو"
      >
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-ink-soft">
          <span>{glyph.unicode || '—'}</span>
          <span
            className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-ink' : 'border border-ink/40'}`}
            title={ready ? 'مرسوم' : 'لم يُرسم بعد'}
          />
        </div>
        <div className="my-2.5 flex h-20 items-center justify-center">
          <GlyphThumb glyph={glyph} metrics={metrics} className="h-full w-full" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-ink/10 pt-2 text-xs">
          <span dir="ltr" className="truncate font-mono">{glyph.name}</span>
          <span className="shrink-0 font-mono text-[10px] text-ink-soft">{glyph.advanceWidth}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-ink-soft">
          <span>{CATEGORY_LABEL[glyph.category]}</span>
          {glyph.form !== 'isolated' && <span>{FORM_LABEL[glyph.form]}</span>}
        </div>
      </button>
      <div className="mt-2 flex items-center justify-end gap-0.5 border-t border-ink/10 pt-2">
        <Button variant="quiet" icon title="تعديل بيانات المحرف" onClick={() => onEdit(glyph.id)}>
          <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
        </Button>
        <Button variant="quiet" icon title="تكرار المحرف" onClick={() => onDuplicate(glyph.id)}>
          <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
        </Button>
        <Button variant="quiet" icon title="حذف المحرف" onClick={() => onDelete(glyph.id)}>
          <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
        </Button>
      </div>
    </div>
  );
};

export const GlyphCard = React.memo(GlyphCardBase);
