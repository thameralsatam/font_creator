import React, { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { BOOK } from '../../help/helpBook';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

/** كتاب التعليمات لكامل الموقع: أقسام وبحث. */
export const HelpBook: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [section, setSection] = useState(BOOK[0].id);
  const [query, setQuery] = useState('');
  const q = query.trim();

  const results = useMemo(() => {
    if (!q) return null;
    return BOOK.flatMap((s) =>
      s.items.filter((i) => i.h.includes(q) || i.p.includes(q)).map((i) => ({ ...i, section: s.title }))
    );
  }, [q]);

  const current = BOOK.find((s) => s.id === section) ?? BOOK[0];

  return (
    <Modal
      title="كتاب التعليمات"
      subtitle="شرح مختصر لكل ما في الموقع"
      icon={<BookOpen className="h-4 w-4 stroke-[1.5]" />}
      size="xl"
      onClose={onClose}
    >
      <div className="mt-4 space-y-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-ink-soft" />
          <input
            className="field w-full pr-9"
            placeholder="ابحث في الكتاب"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {!results && (
          <div className="flex flex-wrap gap-1.5">
            {BOOK.map((s) => (
              <Button
                key={s.id}
                variant="quiet"
                active={s.id === current.id}
                onClick={() => setSection(s.id)}
              >
                {s.title}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {results
            ? results.length === 0
              ? <p className="text-sm text-ink-soft">لا نتائج لهذا البحث.</p>
              : results.map((i) => (
                  <article key={i.section + i.h}>
                    <p className="text-[11px] text-ink-soft">{i.section}</p>
                    <h3 className="text-sm">{i.h}</h3>
                    <p className="mt-1 text-sm leading-7 text-ink-soft">{i.p}</p>
                  </article>
                ))
            : current.items.map((i) => (
                <article key={i.h}>
                  <h3 className="text-sm">{i.h}</h3>
                  <p className="mt-1 text-sm leading-7 text-ink-soft">{i.p}</p>
                </article>
              ))}
        </div>
      </div>
    </Modal>
  );
};

/** زر يفتح كتاب التعليمات. يُوضع في رأس أي صفحة. */
export const HelpBookButton: React.FC<{ variant?: 'secondary' | 'quiet'; iconOnly?: boolean }> = ({
  variant = 'secondary',
  iconOnly = false,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} icon={iconOnly} title="كتاب التعليمات" onClick={() => setOpen(true)}>
        <BookOpen className="h-3.5 w-3.5 stroke-[1.5]" />
        {!iconOnly && <span>كتاب التعليمات</span>}
      </Button>
      {open && <HelpBook onClose={() => setOpen(false)} />}
    </>
  );
};
