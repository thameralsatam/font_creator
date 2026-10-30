import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

/*
  النافذة المنبثقة الموحّدة. تُركَّب فقط عند فتحها، فتبدأ كل مرة بحالة نظيفة.
  تُغلق بمفتاح Escape أو بالنقر على الخلفية، وتمنع تمرير الصفحة خلفها.
*/

interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClose: () => void;
  children: React.ReactNode;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' } as const;

export const Modal: React.FC<ModalProps> = ({
  title,
  subtitle,
  icon,
  size = 'md',
  onClose,
  children,
}) => {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="animate-backdrop-fade fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`animate-modal-enter w-full ${SIZES[size]} max-h-[90dvh] overflow-y-auto rounded-3xl border border-ink/15 bg-paper p-5 shadow-2xl sm:p-6`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/10 pb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-ink/20 bg-sand/35">
                {icon}
              </span>
            )}
            <div>
              <h2 id={titleId} className="text-base">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
            </div>
          </div>
          <Button variant="quiet" icon title="إغلاق" onClick={onClose}>
            <X className="h-4 w-4 stroke-[1.5]" />
          </Button>
        </div>

        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
};

/** صف الأزرار أسفل النافذة. */
export const ModalActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-5 flex justify-end gap-2 border-t border-ink/10 pt-4">{children}</div>
);
