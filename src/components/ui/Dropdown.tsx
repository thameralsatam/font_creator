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
import { useHelp } from '../help/HelpContext';

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
  /** في وضع التعليمات: الضغطة الأولى تشرح الزر، والثانية تفتح القائمة. */
  helpId?: string;
  /** يظهر الزر مضيئاً حتى والقائمة مغلقة (مثل أداة مختارة). */
  active?: boolean;
  /** يُستدعى عند فتح القائمة بنقرة عادية (ليس في وضع التعليمات). */
  onOpen?: () => void;
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
  helpId,
  active = false,
  onOpen,
  children,
}) => {
  const help = useHelp();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // عند إطفاء وضع التعليمات تُغلق القوائم المفتوحة
  useEffect(() => {
    if (!help.on) setOpen(false);
  }, [help.on]);

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
      if (target instanceof Element && target.closest('[data-help-panel]')) return;
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
        active={open || active}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="shrink-0"
        onClick={() => {
          if (help.on && helpId && help.topicId !== helpId) {
            help.show(helpId);
            return;
          }
          if (!help.on && !open) onOpen?.();
          setOpen((v) => !v);
        }}
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
  /** معرّف الشرح في وضع التعليمات. */
  helpId?: string;
  /** معطّل مؤقتاً لعدم انطباق الأمر الآن (ليس "قريباً"). */
  disabled?: boolean;
  onClick?: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  label,
  icon,
  hint,
  active,
  soon = false,
  disabled = false,
  helpId,
  onClick,
}) => {
  const help = useHelp();
  return (
  <button
    type="button"
    role="menuitem"
    className={`menu-item ${soon ? 'is-soon' : ''}`}
    disabled={!help.on && (soon || disabled)}
    title={soon ? `${label} (قريباً)` : undefined}
    onClick={help.on ? () => help.show(helpId ?? null) : onClick}
  >
    {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
    <span className="flex-1">{label}</span>
    {hint && <span className="font-mono text-[11px] text-ink-soft">{hint}</span>}
    {active !== undefined && (
      <Check className={`h-3.5 w-3.5 stroke-[1.5] ${active ? 'opacity-100' : 'opacity-0'}`} />
    )}
  </button>
  );
};

export const MenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-2 pb-1 pt-2 text-[11px] text-ink-soft">{children}</div>
);

export const MenuDivider: React.FC = () => <div className="my-1 h-px bg-ink/15" />;
