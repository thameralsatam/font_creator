# الملف ١ — التنظيف والأساس البصري

## قواعد عامة (تنطبق على كل الملفات القادمة)

- نفّذ الأوامر حرفياً وبالترتيب. لا تضف ولا تحذف ولا تحسّن أي شيء غير مذكور.
- عندما يقول الأمر "استبدل الملف بالكامل" انسخ المحتوى كما هو بالضبط.
- لا تلمس أي ملف غير مذكور في الأمر.
- إذا ظهر خطأ غير متوقع أو كان أمر غير ممكن: توقف واكتب الخطأ كما هو. لا تجتهد ولا تصلح شيئاً من عندك.
- لا تصلح أي مشكلة أخرى تراها في المشروع. هذا الملف يغطي ما هو مكتوب فقط.
- في النهاية نفّذ قسم "التحقق" وأرسل نتيجته فقط، بدون شرح.

---

## الأمر ١: حذف الملفات الميتة

الملفات الستة التالية لم تعد مستخدمة. قبل الحذف ابحث داخل مجلد `src` عن اسم كل ملف للتأكد أنه غير مستورد من أي ملف **خارج** هذه الستة. إذا وجدت استيراداً من ملف آخر، توقف وبلّغ.

احذف:

```
src/components/Header.tsx
src/components/GlyphEditor.tsx
src/components/LayerPanel.tsx
src/components/GlyphMatrix.tsx
src/components/TypeTester.tsx
src/components/CodeWorkbench.tsx
```

لا تحذف أي ملف آخر.

---

## الأمر ٢: tsconfig.json

في الملف `tsconfig.json` غيّر هذا السطر فقط:

```
    "types": ["vite/client"],
```

ليصبح:

```
    "types": ["vite/client", "node"],
```

لا تغيّر أي سطر آخر.

---

## الأمر ٣: package.json

داخل `scripts` أضف سطراً جديداً بعد سطر `"lint": "tsc --noEmit"` (انتبه للفاصلة بعد سطر lint):

```
    "lint": "tsc --noEmit",
    "test": "tsx --test src/utils/*.test.ts"
```

لا تغيّر أي شيء آخر في الملف، ولا تضف ولا تحذف أي مكتبة.

---

## الأمر ٤: index.html

استبدل الملف `index.html` بالكامل بهذا:

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#EDE6D8" />
    <title>محرر وهندسة الخطوط الطباعية</title>
    <meta name="description" content="منصة احترافية هادئة لتصميم وهندسة وبرمجة الخطوط والمحارف العربية واللاتينية مع منطق الطبقات والمقاييس." />
    <meta property="og:title" content="محرر وهندسة الخطوط الطباعية" />
    <meta property="og:description" content="منصة احترافية هادئة لتصميم وهندسة وبرمجة الخطوط والمحارف العربية واللاتينية مع منطق الطبقات والمقاييس." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@100;200;300;400&family=Kufam:wght@400&family=JetBrains+Mono:wght@300;400&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## الأمر ٥: src/index.css

استبدل الملف `src/index.css` بالكامل بهذا:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'IBM Plex Sans Arabic', system-ui, sans-serif;
  --font-heading: 'Kufam', 'IBM Plex Sans Arabic', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --color-paper: #EDE6D8;
  --color-paper-deep: #E3DAC9;
  --color-surface: #F6F2EB;
  --color-ink: #183630;
  --color-ink-light: #254A43;
  --color-sand: #E5C690;
  --color-sand-deep: #CCA86B;
}

:root {
  /* وزن النص 200. لتجربة الأرفع غيّر هذا السطر فقط إلى 100 */
  --weight-text: 200;
  /* كوفام أرفع وزن فيه هو 400 */
  --weight-heading: 400;
  --ease-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --line: color-mix(in srgb, var(--color-ink) 18%, transparent);
  --line-strong: color-mix(in srgb, var(--color-ink) 32%, transparent);
  --wash: color-mix(in srgb, var(--color-sand) 32%, transparent);
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
  background: rgba(24, 54, 48, 0.18);
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

  .btn:disabled,
  .btn.is-soon {
    opacity: 0.38;
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
    color: color-mix(in srgb, var(--color-ink) 40%, transparent);
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
    opacity: 0.38;
    cursor: not-allowed;
  }
}

/* ===== الأسطح الزجاجية ===== */
.glass-panel {
  background-color: rgba(246, 242, 235, 0.78);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(24, 54, 48, 0.12);
}

.glass-dropdown {
  background-color: rgba(248, 245, 240, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(24, 54, 48, 0.15);
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

## الأمر ٦: مكوّن الزر الموحّد

أنشئ ملفاً جديداً `src/components/ui/Button.tsx` (أنشئ المجلد `ui` إن لم يكن موجوداً) بهذا المحتوى:

```tsx
import React from 'react';

/*
  قواعد استعمال الزر في كل المشروع:
  1. primary   : زر رئيسي واحد فقط في كل شاشة.
  2. secondary : الإجراءات الجانبية.
  3. quiet     : الأدوات والأيقونات.
  4. icon      : زر مربع للأيقونة فقط، ويجب أن يحمل title.
  5. active    : للأدوات القابلة للتبديل (مختارة / غير مختارة).
  6. soon      : أداة لم تُبرمج بعد. تظهر باهتة ومعطلة.
                 عند إنهاء برمجة الأداة احذف soon فقط وتعود ملوّنة.
*/

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: boolean;
  active?: boolean;
  soon?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      icon = false,
      active,
      soon = false,
      className = '',
      title,
      disabled,
      type = 'button',
      children,
      ...rest
    },
    ref
  ) => {
    const classes = [
      'btn',
      `btn-${variant}`,
      icon ? 'btn-icon' : '',
      active ? 'is-active' : '',
      soon ? 'is-soon' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || soon}
        aria-pressed={active}
        title={soon ? (title ? `${title} (قريباً)` : 'قريباً') : title}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

## التحقق (آخر خطوة)

1. شغّل `npm run build`. يجب أن ينجح بدون أخطاء.
2. شغّل `npm run dev` وافتح الصفحة. يجب أن تفتح قائمة المشاريع بدون أخطاء حمراء في الـ console.
3. تأكد أن العناوين بخط كوفام وأن النصوص بخط IBM Plex Sans Arabic.
4. أرسل لي فقط: نجح البناء أم لا، ونص أي خطأ ظهر.

ملاحظة: أي مظهر قديم يبقى كما هو في بقية الشاشات طبيعي. سنعيد بناءها في الملفات القادمة. لا تصلح شيئاً منها الآن.
