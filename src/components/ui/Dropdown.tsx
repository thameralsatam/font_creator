import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from './Button';

/*
  القائمة المنسدلة الموحّدة. كل مجموعة أدوات أو ميزات تعيش داخل زر واحد يفتح قائمة.
  - على الحاسوب: تنفتح تحت الزر أو فوقه (placement).
  - على الجوال: تنفتح كورقة سفلية بعرض الشاشة حتى لا تخرج من حدودها.
  - تُغلق بالنقر خارجها أو بمفتاح Escape.
*/

interface DropdownProps {
  label: string;
  icon?: React.ReactNode;
  /** إظهار نص الزر على الجوال أيضاً. افتراضياً تظهر الأيقونة وحدها. */
  labelOnMobile?: boolean;
  placement?: 'top' | 'bottom';
  /** start = حافة الزر اليمنى (واجهة عربية). end = حافته اليسرى. */
  align?: 'start' | 'end';
  panelClassName?: string;
  soon?: boolean;
  children: (close: () => void) => React.ReactNode;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  icon,
  labelOnMobile = false,
  placement = 'bottom',
  align = 'start',
  panelClassName = 'sm:w-64',
  soon = false,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const side = placement === 'top' ? 'sm:bottom-full sm:mb-2' : 'sm:top-full sm:mt-2';
  const edge = align === 'start' ? 'sm:start-0' : 'sm:end-0';

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={triggerRef}
        variant="quiet"
        soon={soon}
        active={open}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className={labelOnMobile ? '' : 'hidden sm:inline'}>{label}</span>
        <ChevronDown
          className={`h-3 w-3 stroke-[1.5] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>

      {open && (
        <div
          role="menu"
          className={[
            'glass-dropdown animate-dropdown-slide z-[60] rounded-2xl p-1.5 shadow-xl',
            'max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:max-h-[70dvh] max-sm:overflow-y-auto',
            'sm:absolute',
            side,
            edge,
            panelClassName,
          ].join(' ')}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

interface MenuItemProps {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  /** عند تمريرها (true أو false) تظهر علامة اختيار عند true. */
  active?: boolean;
  soon?: boolean;
  onClick?: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  label,
  icon,
  hint,
  active,
  soon = false,
  onClick,
}) => (
  <button
    type="button"
    role="menuitem"
    className={`menu-item ${soon ? 'is-soon' : ''}`}
    disabled={soon}
    title={soon ? `${label} (قريباً)` : undefined}
    onClick={onClick}
  >
    {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
    <span className="flex-1">{label}</span>
    {hint && <span className="font-mono text-[11px] opacity-60">{hint}</span>}
    {active !== undefined && (
      <Check className={`h-3.5 w-3.5 stroke-[1.5] ${active ? 'opacity-100' : 'opacity-0'}`} />
    )}
  </button>
);

export const MenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-2 pb-1 pt-2 text-[11px] opacity-60">{children}</div>
);

export const MenuDivider: React.FC = () => <div className="my-1 h-px bg-ink/10" />;
