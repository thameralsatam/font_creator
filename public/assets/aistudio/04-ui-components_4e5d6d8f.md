# الملف ٤ — مكونات الواجهة المشتركة

هذا الملف يضيف القائمة المنسدلة والنافذة المنبثقة وصورة المحرف المصغّرة، ويصلح سلوك الزر النشط. **لا تشغّل `npm run build` ولا `npm run lint` في هذا الملف.**

## قواعد عامة (تنطبق على كل الملفات)

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- انسخ المحتوى داخل كل كتلة كود كما هو بالضبط، بدون تغيير حرف واحد وبدون تعليقات إضافية.
- الأمر "أنشئ الملف" يعني: أنشئه، وإن كان موجوداً مسبقاً استبدل محتواه بالكامل. أنشئ المجلدات الناقصة.
- لا تلمس أي ملف غير مذكور. لا تحذف ولا تنقل ولا تعيد تسمية أي ملف إلا إذا طُلب صراحة.
- إذا ظهر خطأ غير متوقع أو تعذّر أمر: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- لا تصلح أي خطأ يظهر في ملفات قديمة غير مذكورة هنا. سنحذفها في ملف لاحق.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر 1: إصلاح الزر النشط في `src/index.css`

في الملف `src/index.css` ابحث عن هذه الكتلة (تظهر مرة واحدة فقط):

```css
  .btn.is-active {
    background-color: var(--color-ink);
    border-color: var(--color-ink);
    color: var(--color-paper);
  }
```

واستبدلها بهذه الكتلة:

```css
  .btn.is-active {
    background-color: var(--color-ink);
    border-color: var(--color-ink);
    color: var(--color-paper);
  }
  .btn.is-active:hover:not(:disabled) {
    background-color: var(--color-ink-light);
    border-color: var(--color-ink-light);
  }
```

لا تغيّر أي شيء آخر في الملف. السبب: الزر النشط كان يختفي نصه عند تمرير الفأرة عليه.

---

## الأمر 2: `src/components/ui/Dropdown.tsx`

القائمة المنسدلة الموحّدة: كل مجموعة أدوات تعيش داخل زر يفتح قائمة.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
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
```

---

## الأمر 3: `src/components/ui/Modal.tsx`

النافذة المنبثقة الموحّدة.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
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
  size?: 'sm' | 'md' | 'lg';
  onClose: () => void;
  children: React.ReactNode;
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' } as const;

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
              {subtitle && <p className="mt-0.5 text-xs opacity-75">{subtitle}</p>}
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
```

---

## الأمر 4: `src/components/GlyphThumb.tsx`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
import React from 'react';
import { type FontMetrics, type Glyph } from '../types/font';
import { contourToPath } from '../utils/pathGeometry';

interface GlyphThumbProps {
  glyph: Glyph;
  metrics: FontMetrics;
  className?: string;
}

/**
 * صورة مصغّرة لرسم المحرف الفعلي من مساراته.
 * إن كان المحرف فارغاً يظهر الحرف المقصود بلون باهت كتلميح.
 */
export const GlyphThumb: React.FC<GlyphThumbProps> = ({ glyph, metrics, className = '' }) => {
  const pad = 40;
  const width = Math.max(glyph.advanceWidth, 100);
  const top = metrics.ascender + pad;
  const height = metrics.ascender - metrics.descender + pad * 2;

  return (
    <svg
      viewBox={`${-pad} ${-top} ${width + pad * 2} ${height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {glyph.contours.length > 0 ? (
        <g transform="scale(1 -1)">
          {glyph.contours.map((c) => (
            <path
              key={c.id}
              d={contourToPath(c)}
              className="fill-ink"
              fillRule="nonzero"
            />
          ))}
        </g>
      ) : (
        <text
          x={width / 2}
          y={0}
          textAnchor="middle"
          fontSize={metrics.upm * 0.6}
          className="fill-ink/25 font-heading"
        >
          {glyph.char}
        </text>
      )}
    </svg>
  );
};
```

---

## الأمر 5: `src/components/AnimatedCounter.tsx`

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1400,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    if (endValue === 0) {
      setDisplayValue(0);
      return;
    }

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 4);
      const current = Math.round(startValue + (endValue - startValue) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return (
    <span dir="ltr" className={`inline-block ${className}`}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};
```

---

## التحقق (آخر خطوة)

1. تأكد أن هذه الملفات موجودة: `src/components/ui/Dropdown.tsx` و`src/components/ui/Modal.tsx` و`src/components/GlyphThumb.tsx` و`src/components/AnimatedCounter.tsx`.
2. تأكد أن `src/index.css` يحوي الكتلة `.btn.is-active:hover:not(:disabled)`.
3. أرسل لي فقط: تمّ، أو نص أي خطأ.
