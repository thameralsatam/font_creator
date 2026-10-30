import React from 'react';
import { BookOpen, X } from 'lucide-react';
import { STUDIO_HELP } from '../../help/studioHelp';
import { useHelp } from './HelpContext';

/** بطاقة الشرح العائمة في وضع التعليمات. */
export const HelpPanel: React.FC<{ onOpenBook: () => void }> = ({ onOpenBook }) => {
  const help = useHelp();
  // topicId فارغ = أُغلقت البطاقة والوضع ما زال شغالاً
  if (!help.on || !help.topicId) return null;
  const topic = STUDIO_HELP[help.topicId] ?? STUDIO_HELP.intro;

  return (
    <div
      data-help-panel
      role="status"
      className="glass-panel animate-dropdown-slide absolute inset-x-3 bottom-3 z-20 mx-auto max-h-[55%] max-w-xl overflow-y-auto rounded-2xl p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm">{topic.title}</h3>
        <button
          type="button"
          title="إغلاق الشرح"
          className="btn btn-quiet btn-icon relative z-10 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => help.show(null)}
        >
          <X className="h-4 w-4 stroke-[1.5]" />
        </button>
      </div>
      <div className="mt-2 space-y-2 text-xs leading-6 text-ink-soft">
        {topic.body.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>
      {topic.keys && (
        <p className="mt-2 text-[11px] text-ink-soft">
          الاختصار: <span dir="ltr" className="font-mono text-ink">{topic.keys}</span>
        </p>
      )}
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
        onClick={onOpenBook}
      >
        <BookOpen className="h-3.5 w-3.5 stroke-[1.5]" />
        افتح كتاب التعليمات
      </button>
    </div>
  );
};
