# الملف ٩ — الألوان والقائمة المنسدلة

هذا الملف يفتّح الألوان ويزيد وضوح النص، ويعيد كتابة القائمة المنسدلة لتنزل من الزر نفسه. **لا تشغّل البناء في هذا الملف.**

## قواعد عامة (تنطبق على كل الملفات)

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- انسخ المحتوى داخل كل كتلة كود كما هو بالضبط، بدون تغيير حرف واحد وبدون تعليقات إضافية.
- الأمر "أنشئ الملف" يعني: أنشئه، وإن كان موجوداً مسبقاً استبدل محتواه بالكامل.
- لا تلمس أي ملف غير مذكور. لا تحذف ولا تنقل ولا تعيد تسمية أي ملف إلا إذا طُلب صراحة.
- إذا ظهر خطأ غير متوقع أو تعذّر أمر: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر 1: حذف ملفين ميتين

الملفان التاليان غير مستوردين من أي مكان. احذفهما:

```
src/components/GlyphStudioFullscreen.tsx
src/data/initialFont.ts
```

---

## الأمر 2: توضيح النصوص الباهتة

النصوص الثانوية كانت تُخفَّف بالشفافية فتصير ضعيفة التباين. شغّل هذا الأمر الواحد في مجلد المشروع. يستبدل كلاسات الشفافية بلون نص ثابت واضح في الملفات المذكورة فقط:

```
sed -i -E 's/opacity-(60|65|70|75|80|85)/text-ink-soft/g' src/components/ExportModal.tsx src/components/ui/Modal.tsx src/components/ui/Dropdown.tsx src/components/ProjectOverview.tsx src/components/studio/StudioScreen.tsx src/components/ProjectsDashboard.tsx src/components/MetricsModal.tsx
```

ثم شغّل هذا الأمر لتخفيف لون الحرف التلميحي في المحارف الفارغة:

```
sed -i 's/fill-ink\/25/fill-ink\/35/' src/components/GlyphThumb.tsx
```

ثم شغّل هذا الأمر لتوحيد لون شريط المتصفح مع الخلفية الجديدة:

```
sed -i 's/#EDE6D8/#F8F4EA/' index.html
```

---

## الأمر 3: `src/index.css`

لوحة ألوان أفتح وأوضح، ووزن نص 300 بدل 200، وحدود أقوى. لا تغيّر أسماء الكلاسات.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'IBM Plex Sans Arabic', system-ui, sans-serif;
  --font-heading: 'Kufam', 'IBM Plex Sans Arabic', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --color-paper: #F8F4EA;
  --color-paper-deep: #ECE4D2;
  --color-surface: #FFFDF8;
  --color-canvas: #FCFAF4;
  --color-ink: #12302A;
  --color-ink-light: #1F4A42;
  --color-ink-soft: #3A524B;
  --color-sand: #E8CD9A;
  --color-sand-deep: #B98F45;
}

:root {
  /* وزن النص 300 لوضوح أفضل. للأنحف غيّر هذا السطر فقط إلى 200 أو 100 */
  --weight-text: 300;
  /* كوفام أرفع وزن فيه هو 400 */
  --weight-heading: 400;
  --ease-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --line: color-mix(in srgb, var(--color-ink) 24%, transparent);
  --line-strong: color-mix(in srgb, var(--color-ink) 45%, transparent);
  --wash: color-mix(in srgb, var(--color-sand) 45%, transparent);
}

@layer base {
  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    min-height: 100vh;
    min-height: 100dvh;
    overflow-x: hidden;
    background-color: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-weight: var(--weight-text);
    direction: rtl;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, h5, h6, .font-heading {
    font-family: var(--font-heading);
    font-weight: var(--weight-heading);
  }

  code, kbd, pre, .font-mono {
    font-family: var(--font-mono);
    font-weight: 300;
  }

  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }

  ::selection {
    background: color-mix(in srgb, var(--color-sand) 55%, transparent);
  }
}

/* ===== أشرطة التمرير ===== */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(18, 48, 42, 0.25);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(24, 54, 48, 0.35);
}
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* ===== المكونات المشتركة ===== */
@layer components {
  /* --- نظام الأزرار ---
     primary   : الإجراء الرئيسي الوحيد في الشاشة
     secondary : الإجراءات الجانبية
     quiet     : الأدوات والأيقونات (بدون إطار)
     الحالة النشطة: الصنف is-active
     الأداة غير المبرمجة بعد: الصنف is-soon (باهتة ومعطلة) */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 2.25rem;
    padding: 0 0.9rem;
    border: 1px solid transparent;
    border-radius: 0.75rem;
    font-size: 0.8125rem;
    line-height: 1;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.18s ease, color 0.18s ease,
      border-color 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
  }
  .btn:focus-visible {
    outline: 2px solid var(--color-sand-deep);
    outline-offset: 2px;
  }
  .btn:active:not(:disabled) {
    transform: translateY(1px);
  }
  .btn-icon {
    width: 2.25rem;
    padding: 0;
  }

  .btn-primary {
    background-color: var(--color-ink);
    color: var(--color-paper);
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--color-ink-light);
  }

  .btn-secondary {
    background-color: var(--color-surface);
    border-color: var(--line-strong);
    color: var(--color-ink);
  }
  .btn-secondary:hover:not(:disabled) {
    background-color: var(--wash);
  }

  .btn-quiet {
    background-color: transparent;
    color: var(--color-ink);
  }
  .btn-quiet:hover:not(:disabled) {
    background-color: var(--wash);
  }

  .btn.is-active {
    background-color: var(--color-ink);
    border-color: var(--color-ink);
    color: var(--color-paper);
  }
  .btn.is-active:hover:not(:disabled) {
    background-color: var(--color-ink-light);
    border-color: var(--color-ink-light);
  }

  .btn:disabled,
  .btn.is-soon {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* --- حقول الإدخال --- */
  .field {
    width: 100%;
    height: 2.25rem;
    padding: 0 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: 0.75rem;
    background-color: color-mix(in srgb, var(--color-surface) 70%, transparent);
    color: var(--color-ink);
    font-size: 0.8125rem;
    transition: border-color 0.18s ease;
  }
  .field:focus {
    outline: none;
    border-color: var(--color-ink);
  }
  .field::placeholder {
    color: color-mix(in srgb, var(--color-ink) 55%, transparent);
  }
  textarea.field {
    height: auto;
    padding: 0.6rem 0.75rem;
  }

  /* --- عناصر القوائم المنسدلة --- */
  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    min-height: 2.25rem;
    padding: 0 0.6rem;
    border: 0;
    border-radius: 0.6rem;
    background: transparent;
    font-size: 0.8125rem;
    text-align: start;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .menu-item:hover:not(:disabled) {
    background-color: var(--wash);
  }
  .menu-item:disabled,
  .menu-item.is-soon {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

/* ===== الأسطح الزجاجية ===== */
.glass-panel {
  background-color: rgba(255, 253, 248, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(18, 48, 42, 0.2);
}

.glass-dropdown {
  background-color: rgba(255, 253, 248, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(18, 48, 42, 0.24);
}

/* ===== الحركات ===== */
@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.96) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes backdropFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes viewFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes dropdownSlide {
  from { opacity: 0; transform: scale(0.97) translateY(-6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-modal-enter { animation: modalEnter 0.28s var(--ease-soft) forwards; }
.animate-backdrop-fade { animation: backdropFade 0.25s ease-out forwards; }
.animate-view-fade { animation: viewFadeIn 0.35s var(--ease-soft) forwards; }
.animate-dropdown-slide { animation: dropdownSlide 0.2s var(--ease-soft) forwards; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }

/* ===== شاشات اللمس ===== */
@media (pointer: coarse) {
  .btn { height: 2.75rem; }
  .btn-icon { width: 2.75rem; }
  .field { height: 2.75rem; }
  .menu-item { min-height: 2.75rem; }
}

/* ===== تقليل الحركة ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## الأمر 4: `src/components/ui/Dropdown.tsx`

القائمة المنسدلة تنزل الآن من الزر نفسه على كل الشاشات، وتُرسم خارج الشريط حتى لا يقصّها التمرير.

أنشئ هذا الملف (وإن كان موجوداً استبدله بالكامل) بهذا المحتوى:

```tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from './Button';

/*
  القائمة المنسدلة الموحّدة. كل مجموعة أدوات تعيش داخل زر واحد يفتح قائمة.
  - القائمة تنزل من الزر نفسه على كل الشاشات، ولا تتحول إلى ورقة سفلية.
  - تُرسم خارج الشريط (portal) حتى لا يقصّها تمرير الشريط الأفقي.
  - تقلب لأعلى تلقائياً إن لم تتسع أسفل الزر، وتبقى داخل حدود الشاشة.
  - تُغلق بالنقر خارجها أو بمفتاح Escape.
*/

interface DropdownProps {
  label: string;
  icon?: React.ReactNode;
  /** إظهار نص الزر على الشاشات الصغيرة أيضاً. افتراضياً تظهر الأيقونة وحدها. */
  labelOnMobile?: boolean;
  /** auto = أسفل الزر، وتنقلب لأعلى إن ضاق المكان. */
  placement?: 'auto' | 'top' | 'bottom';
  /** start = تُحاذي القائمة حافة الزر الأولى (اليمنى في الواجهة العربية). */
  align?: 'start' | 'end';
  /** عرض القائمة بالبكسل. يقلّ تلقائياً إن كانت الشاشة أضيق منه. */
  width?: number;
  soon?: boolean;
  children: (close: () => void) => React.ReactNode;
}

interface Position {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
  up: boolean;
}

const MARGIN = 8;
const GAP = 6;

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  icon,
  labelOnMobile = false,
  placement = 'auto',
  align = 'start',
  width = 256,
  soon = false,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const compute = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(width, vw - MARGIN * 2);
    const rtl = getComputedStyle(trigger).direction === 'rtl';

    const alignRight = (align === 'start') === rtl;
    let left = alignRight ? r.right - w : r.left;
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));

    const below = vh - r.bottom - MARGIN - GAP;
    const above = r.top - MARGIN - GAP;
    const up =
      placement === 'top'
        ? true
        : placement === 'bottom'
          ? false
          : below < 240 && above > below;
    const space = up ? above : below;

    setPos({
      left,
      width: w,
      up,
      maxHeight: Math.max(140, Math.min(space, vh * 0.7)),
      top: up ? undefined : r.bottom + GAP,
      bottom: up ? vh - r.top + GAP : undefined,
    });
  }, [width, align, placement]);

  // الموضع يُحسب قبل الرسم حتى لا تومض القائمة في مكان خاطئ
  useLayoutEffect(() => {
    if (open) compute();
    else setPos(null);
  }, [open, compute]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', compute);
    // التقاط أي تمرير، ومنه تمرير الشريط الأفقي، لتبقى القائمة ملتصقة بالزر
    window.addEventListener('scroll', compute, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, compute]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="quiet"
        soon={soon}
        active={open}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="shrink-0"
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className={labelOnMobile ? '' : 'hidden md:inline'}>{label}</span>
        <ChevronDown
          className={`h-3 w-3 stroke-[1.5] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </Button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            dir="rtl"
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: pos.width,
              maxHeight: pos.maxHeight,
              transformOrigin: pos.up ? 'bottom' : 'top',
            }}
            className="glass-dropdown animate-dropdown-slide z-[70] overflow-y-auto rounded-2xl p-1.5 shadow-xl"
          >
            {children(close)}
          </div>,
          document.body
        )}
    </>
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
    {hint && <span className="font-mono text-[11px] text-ink-soft">{hint}</span>}
    {active !== undefined && (
      <Check className={`h-3.5 w-3.5 stroke-[1.5] ${active ? 'opacity-100' : 'opacity-0'}`} />
    )}
  </button>
);

export const MenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-2 pb-1 pt-2 text-[11px] text-ink-soft">{children}</div>
);

export const MenuDivider: React.FC = () => <div className="my-1 h-px bg-ink/15" />;
```

---

## التحقق (آخر خطوة)

1. تأكد أن الملفين `src/components/GlyphStudioFullscreen.tsx` و`src/data/initialFont.ts` لم يعودا موجودين.
2. أرسل لي فقط: تمّ، أو نص أي خطأ.
