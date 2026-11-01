import React from 'react';
import { createPortal } from 'react-dom';
import { Undo2 } from 'lucide-react';
import { Button } from './Button';

/** شريط صغير أسفل الشاشة مع زر إجراء (مثل التراجع). يُغلق صاحبه بمؤقت. */
export const Toast: React.FC<{ message: string; actionLabel: string; onAction: () => void }> = ({
  message,
  actionLabel,
  onAction,
}) =>
  createPortal(
  <div
    role="status"
    aria-live="polite"
    className="animate-view-fade fixed inset-x-0 bottom-4 z-[95] flex justify-center px-3"
    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
  >
    <div className="capsule flex max-w-md items-center gap-3 py-2 ps-4 pe-2 shadow-xl">
      <span className="min-w-0 truncate text-sm">{message}</span>
      <Button variant="primary" onClick={onAction}>
        <Undo2 className="h-4 w-4 stroke-[1.5]" />
        <span>{actionLabel}</span>
      </Button>
    </div>
  </div>,
  document.body
);
