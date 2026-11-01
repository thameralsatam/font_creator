import React, { Suspense, lazy, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '../ui/Button';

// نص الكتاب كبير ويُقرأ نادراً، فيُحمَّل عند أول فتح فقط
const Modal = lazy(() => import('./HelpBookModal').then((m) => ({ default: m.HelpBookModal })));

export const HelpBook: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Suspense fallback={null}>
    <Modal onClose={onClose} />
  </Suspense>
);

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
