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
