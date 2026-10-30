# الدفعة 14: الثقوب، الطبقات، نافذة التعليمات، أنماط التحديد، أزرار التحريك

إصلاح سبب بقاء الثقب مملوءاً (كل مسار كان يُرسم في عنصر منفصل)، وجعل النوافذ تظهر فوق كل شيء، وإصلاح بطاقة الشرح، وأنماط التحديد الثلاثة، وأزرار التحريك، وأرقام المقاييس بدل الكلمات.

نفّذ بالحرف. لا تشغّل المشروع قبل إنهاء كل الخطوات.

## الخطوة 1: أضف الكود التالي في آخر الملف `src/utils/pathGeometry.ts` (بعد آخر سطر، دون حذف شيء)

```

/**
 * مسار واحد لكل المسارات المغلقة. هذا ضروري: قاعدة الملء (nonzero) لا تصنع ثقوباً
 * إلا إذا كان المساران داخل عنصر path واحد، أما رسمهما في عنصرين فيملأ كلاً منهما على حدة.
 */
export function glyphFillPath(contours: Contour[]): string {
  return contours
    .filter((c) => c.closed && c.nodes.length > 1)
    .map(contourToPath)
    .join(' ');
}
```

## الخطوة 2: في الملف `src/components/studio/StudioCanvas.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { contourToPath } from '../../utils/pathGeometry';
```

**النص الجديد:**
```
import { contourToPath, glyphFillPath } from '../../utils/pathGeometry';
```

## الخطوة 3: في الملف `src/components/studio/StudioCanvas.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        {glyph.contours.map((c) => (
          <path
            key={c.id}
            d={contourToPath(c)}
            fillRule="nonzero"
            className={c.closed ? 'fill-ink/90 stroke-ink' : 'fill-none stroke-ink'}
            strokeWidth={c.id === hoverContourId ? 3 : 1.2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
```

**النص الجديد:**
```
        <path
          d={glyphFillPath(glyph.contours)}
          fillRule="nonzero"
          className="fill-ink/90 stroke-ink"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
        {glyph.contours
          .filter((c) => !c.closed)
          .map((c) => (
            <path
              key={c.id}
              d={contourToPath(c)}
              className="fill-none stroke-ink"
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {glyph.contours
          .filter((c) => c.id === hoverContourId)
          .map((c) => (
            <path
              key={c.id}
              d={contourToPath(c)}
              className="fill-none stroke-sand-deep"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
          ))}
```

## الخطوة 4: في الملف `src/components/studio/StudioCanvas.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
{line.label} ({line.v})
```

**النص الجديد:**
```
{line.v}
```

## الخطوة 5: في الملف `src/components/studio/StudioCanvas.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
              العرض الكامل ({glyph.advanceWidth})
```

**النص الجديد:**
```
              {glyph.advanceWidth}
```

## الخطوة 6: في الملف `src/components/GlyphThumb.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { contourToPath } from '../utils/pathGeometry';
```

**النص الجديد:**
```
import { glyphFillPath } from '../utils/pathGeometry';
```

## الخطوة 7: في الملف `src/components/GlyphThumb.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
          {glyph.contours.map((c) => (
            <path
              key={c.id}
              d={contourToPath(c)}
              className="fill-ink"
              fillRule="nonzero"
            />
          ))}
```

**النص الجديد:**
```
          <path d={glyphFillPath(glyph.contours)} className="fill-ink" fillRule="nonzero" />
```

## الخطوة 8: في الملف `src/components/ui/Modal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { X } from 'lucide-react';
```

**النص الجديد:**
```
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
```

## الخطوة 9: في الملف `src/components/ui/Modal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  return (
    <div
      className="animate-backdrop-fade fixed
```

**النص الجديد:**
```
  // تُرسم خارج أي حاوية ذات تأثير زجاجي أو تحويل حتى لا تُقصّ أو تنزل تحت طبقات أخرى
  return createPortal(
    <div
      className="animate-backdrop-fade fixed
```

## الخطوة 10: في الملف `src/components/ui/Modal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
};
```

**النص الجديد:**
```
        <div className="pt-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};
```

## الخطوة 11: في الملف `src/components/ui/Modal.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
className="animate-backdrop-fade fixed inset-0 z-50
```

**النص الجديد:**
```
className="animate-backdrop-fade fixed inset-0 z-[90]
```

## الخطوة 12: في الملف `src/components/help/HelpContext.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      setOn: (v) => {
        setOnState(v);
        setTopicId(null);
      },
```

**النص الجديد:**
```
      setOn: (v) => {
        setOnState(v);
        setTopicId(v ? 'intro' : null);
      },
```

## الخطوة 13: في الملف `src/components/help/HelpPanel.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  if (!help.on) return null;
  const topic = STUDIO_HELP[help.topicId ?? 'intro'] ?? STUDIO_HELP.intro;
```

**النص الجديد:**
```
  // topicId فارغ = أُغلقت البطاقة والوضع ما زال شغالاً
  if (!help.on || !help.topicId) return null;
  const topic = STUDIO_HELP[help.topicId] ?? STUDIO_HELP.intro;
```

## الخطوة 14: في الملف `src/components/help/HelpPanel.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
className="glass-panel animate-dropdown-slide absolute inset-x-3 bottom-3 z-20 mx-auto max-h-[45%] w-full max-w-xl overflow-y-auto rounded-2xl p-4 shadow-xl"
```

**النص الجديد:**
```
className="glass-panel animate-dropdown-slide absolute inset-x-3 bottom-3 z-20 mx-auto max-h-[55%] max-w-xl overflow-y-auto rounded-2xl p-4 shadow-xl"
```

## الخطوة 15: في الملف `src/components/help/HelpPanel.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
          className="btn btn-quiet btn-icon shrink-0"
          onClick={() => help.show(null)}
```

**النص الجديد:**
```
          className="btn btn-quiet btn-icon relative z-10 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => help.show(null)}
```

## الخطوة 16: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  helpId?: string;
  children: (close
```

**النص الجديد:**
```
  helpId?: string;
  /** يظهر الزر مضيئاً حتى والقائمة مغلقة (مثل أداة مختارة). */
  active?: boolean;
  /** يُستدعى عند فتح القائمة بنقرة عادية (ليس في وضع التعليمات). */
  onOpen?: () => void;
  children: (close
```

## الخطوة 17: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  helpId,
  children,
}) => {
  const help = useHelp();
```

**النص الجديد:**
```
  helpId,
  active = false,
  onOpen,
  children,
}) => {
  const help = useHelp();
```

## الخطوة 18: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        active={open}

```

**النص الجديد:**
```
        active={open || active}

```

## الخطوة 19: في الملف `src/components/ui/Dropdown.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
          setOpen((v) => !v);
        }}
```

**النص الجديد:**
```
          if (!help.on && !open) onOpen?.();
          setOpen((v) => !v);
        }}
```

## الخطوة 20: في الملف `src/components/studio/useStudioEditor.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
export type ToolId = 'select' | 'move' | 'pen' | 'hand';
```

**النص الجديد:**
```
export type ToolId = 'select' | 'move' | 'pen' | 'hand';

/** replace = تحديد جديد، add = جمع إلى ما سبق، subtract = طرح مما سبق. */
export type SelectMode = 'replace' | 'add' | 'subtract';
```

## الخطوة 21: في الملف `src/components/studio/useStudioEditor.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      startScreen: Vec;
      additive: boolean;
      initial: ReadonlySet<string>;
```

**النص الجديد:**
```
      startScreen: Vec;
      selMode: SelectMode;
      initial: ReadonlySet<string>;
```

## الخطوة 22: في الملف `src/components/studio/useStudioEditor.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const lastDown = useRef<{ at: number; x: number; y: number } | null>(null);

```

**النص الجديد:**
```
  const lastDown = useRef<{ at: number; x: number; y: number } | null>(null);
  const [selectMode, setSelectModeState] = useState<SelectMode>('replace');
  const modeRef = useRef<SelectMode>('replace');
  const setSelectMode = (m: SelectMode) => {
    modeRef.current = m;
    setSelectModeState(m);
  };

```

## الخطوة 23: في الملف `src/components/studio/useStudioEditor.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        let ids: ReadonlySet<string> = sel;
        let toggleId: string | null = null;
        if (info.shift) {
          if (sel.has(hn.nodeId)) toggleId = hn.nodeId;
          else ids = new Set([...sel, hn.nodeId]);
        } else if (!sel.has(hn.nodeId)) {
          ids = new Set([hn.nodeId]);
        }
```

**النص الجديد:**
```
        const mode = modeRef.current;
        if (mode === 'subtract') {
          const rest = new Set(sel);
          rest.delete(hn.nodeId);
          setSelection(rest);
          return;
        }
        let ids: ReadonlySet<string> = sel;
        let toggleId: string | null = null;
        if (mode === 'add') {
          ids = new Set([...sel, hn.nodeId]);
        } else if (info.shift) {
          if (sel.has(hn.nodeId)) toggleId = hn.nodeId;
          else ids = new Set([...sel, hn.nodeId]);
        } else if (!sel.has(hn.nodeId)) {
          ids = new Set([hn.nodeId]);
        }
```

## الخطوة 24: في الملف `src/components/studio/useStudioEditor.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      const initial = info.shift ? sel : EMPTY;
      if (!info.shift) setSelection(EMPTY);
      gesture.current = {
        kind: 'marquee',
        pre,
        start: info.world,
        startScreen: info.screen,
        additive: info.shift,
```

**النص الجديد:**
```
      const mode = modeRef.current;
      const selMode: SelectMode = mode === 'replace' && info.shift ? 'add' : mode;
      const initial = selMode === 'replace' ? EMPTY : sel;
      if (selMode === 'replace') setSelection(EMPTY);
      gesture.current = {
        kind: 'marquee',
        pre,
        start: info.world,
        startScreen: info.screen,
        selMode,
```

## الخطوة 25: في الملف `src/components/studio/useStudioEditor.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
      setSelection(new Set([...(g.additive ? g.initial : EMPTY), ...inside]));
```

**النص الجديد:**
```
      const insideSet = new Set(inside);
      if (g.selMode === 'subtract') {
        setSelection(new Set([...g.initial].filter((id) => !insideSet.has(id))));
      } else {
        setSelection(new Set([...(g.selMode === 'add' ? g.initial : EMPTY), ...inside]));
      }
```

## الخطوة 26: في الملف `src/components/studio/useStudioEditor.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    reverse,
    autoDirection,
```

**النص الجديد:**
```
    nudge,
    selectMode,
    setSelectMode,
    reverse,
    autoDirection,
```

## الخطوة 27: في الملف `src/components/studio/StudioScreen.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  ArrowRight,
  Check,
```

**النص الجديد:**
```
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
```

## الخطوة 28: في الملف `src/components/studio/StudioScreen.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
import { useStudioEditor, type ToolId } from './useStudioEditor';
```

**النص الجديد:**
```
import { useStudioEditor, type SelectMode, type ToolId } from './useStudioEditor';
```

## الخطوة 29: في الملف `src/components/studio/StudioScreen.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
const ZOOM_PRESETS = [25, 50, 100, 200];
```

**النص الجديد:**
```
const ZOOM_PRESETS = [25, 50, 100, 200];
const NUDGE_STEPS = [1, 5, 10, 50];

const SELECT_MODES: Array<{ id: SelectMode; label: string; hint: string }> = [
  { id: 'replace', label: 'تحديد عادي', hint: 'كل تحديد جديد يستبدل السابق' },
  { id: 'add', label: 'جمع إلى المحدد', hint: 'يبقى السابق ويُضاف الجديد' },
  { id: 'subtract', label: 'طرح من المحدد', hint: 'ما تحدده يُزال من المحدد' },
];
```

## الخطوة 30: في الملف `src/components/studio/StudioScreen.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  const [showBook, setShowBook] = useState(false);

```

**النص الجديد:**
```
  const [showBook, setShowBook] = useState(false);
  const [nudgeStep, setNudgeStep] = useState(10);

```

## الخطوة 31: في الملف `src/components/studio/StudioScreen.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
        {TOOLS.map(({ id, label, key, Icon }) => (
          <Button
            key={id}
            variant="quiet"
            active={editor.tool === id}
            helpId={`tool.${id}`}
            title={`${label} (${key})`}
            onClick={() => editor.setTool(id)}
          >
            <Icon className={icon} />
            <span className="hidden md:inline">{label}</span>
          </Button>
        ))}
```

**النص الجديد:**
```
        {TOOLS.map(({ id, label, key, Icon }) =>
          id === 'select' ? (
            <Dropdown
              key={id}
              label={label}
              helpId="tool.select"
              placement="bottom"
              width={270}
              active={editor.tool === 'select'}
              onOpen={() => editor.setTool('select')}
              icon={<Icon className={icon} />}
            >
              {(close) => (
                <>
                  <MenuLabel>طريقة التحديد</MenuLabel>
                  {SELECT_MODES.map((m) => (
                    <MenuItem
                      key={m.id}
                      label={m.label}
                      hint={m.hint}
                      helpId={`sel.${m.id}`}
                      active={editor.selectMode === m.id}
                      onClick={() => {
                        editor.setSelectMode(m.id);
                        editor.setTool('select');
                        close();
                      }}
                    />
                  ))}
                </>
              )}
            </Dropdown>
          ) : (
            <Button
              key={id}
              variant="quiet"
              active={editor.tool === id}
              helpId={`tool.${id}`}
              title={`${label} (${key})`}
              onClick={() => editor.setTool(id)}
            >
              <Icon className={icon} />
              <span className="hidden md:inline">{label}</span>
            </Button>
          )
        )}
```

## الخطوة 32: في الملف `src/components/studio/StudioScreen.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
              <MenuLabel>Shift لتقييد الاتجاه، وAlt لتعطيل الالتصاق مؤقتاً.</MenuLabel>
```

**النص الجديد:**
```
              <MenuDivider />
              <MenuLabel>خطوة أزرار التحريك (وحدة خط)</MenuLabel>
              {NUDGE_STEPS.map((n) => (
                <MenuItem
                  key={n}
                  label={String(n)}
                  helpId="settings.nudge"
                  active={nudgeStep === n}
                  onClick={() => setNudgeStep(n)}
                />
              ))}
              <MenuLabel>Shift لتقييد الاتجاه، وAlt لتعطيل الالتصاق مؤقتاً.</MenuLabel>
```

## الخطوة 33: في الملف `src/components/studio/StudioScreen.tsx`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
          <Redo2 className={icon} />
        </Button>

        <BarDivider />

```

**النص الجديد:**
```
          <Redo2 className={icon} />
        </Button>

        <BarDivider />

        {(
          [
            ['up', ArrowUp, 0, 1, 'للأعلى'],
            ['down', ArrowDown, 0, -1, 'للأسفل'],
            ['left', ArrowLeft, -1, 0, 'لليسار'],
            ['right', ArrowRight, 1, 0, 'لليمين'],
          ] as const
        ).map(([k, Ico, dx, dy, name]) => (
          <Button
            key={k}
            variant="quiet"
            icon
            helpId="nudge"
            title={`تحريك المحدد ${name} (${nudgeStep})`}
            disabled={!hasSelection}
            onClick={() => editor.nudge(dx * nudgeStep, dy * nudgeStep)}
          >
            <Ico className={icon} />
          </Button>
        ))}

        <BarDivider />

```

## الخطوة 34: في الملف `src/help/studioHelp.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
  'tool.move': {
```

**النص الجديد:**
```
  'sel.replace': {
    title: 'تحديد عادي',
    body: ['كل نقرة أو سحب مربع يستبدل التحديد السابق بالجديد. Shift يضيف إلى التحديد مؤقتاً.'],
  },
  'sel.add': {
    title: 'جمع إلى المحدد',
    body: ['كل ما حددته من قبل يبقى، وما تحدده بعد ذلك يُضاف إليه، سواء بالنقر على نقطة أو بسحب مربع. مفيد لتجميع نقاط متفرقة ثم تحريكها معاً.'],
  },
  'sel.subtract': {
    title: 'طرح من المحدد',
    body: ['ما تنقر عليه أو تسحب مربعاً حوله يُزال من التحديد ويبقى الباقي. مفيد لاستثناء نقاط من تحديد كبير.'],
  },
  nudge: {
    title: 'أزرار التحريك',
    body: ['تحرّك النقاط أو المسار المحدد بخطوة ثابتة للأعلى أو الأسفل أو اليسار أو اليمين. حجم الخطوة من قائمة الإعدادات. فعّالة بعد تحديد نقطة بأداة التحديد أو مسار بأداة التحريك.'],
  },
  'settings.nudge': {
    title: 'خطوة أزرار التحريك',
    body: ['مقدار حركة النقطة في كل ضغطة على أزرار الأسهم في الشريط السفلي، بوحدات الخط.'],
  },
  'tool.move': {
```

## الخطوة 35: في الملف `src/help/studioHelp.ts`
ابحث عن النص التالي (يظهر مرة واحدة بالضبط) واستبدله بالكامل بالنص الذي بعده.

**النص القديم:**
```
    body: ['تُظهر خط الأساس وارتفاع الحروف الصغيرة والكبيرة والصاعد والهابط وحدّي العرض. تغيير قيمها من نافذة المقاييس في صفحة المشروع.'],
```

**النص الجديد:**
```
    body: [
      'تُظهر خطوطاً أفقية بأرقام على طرفها الأيمن: الخط الأقوى هو خط الأساس (0)، وفوقه بالترتيب ارتفاع الحروف الصغيرة ثم الكبيرة ثم الصاعد، وتحته الهابط بقيمة سالبة.',
      'الخطان العموديان هما بداية العرض الكامل ونهايته، ورقم العرض الكامل مكتوب أعلى الخط الأيمن. تغيير القيم من نافذة المقاييس في صفحة المشروع.',
    ],
```

## الخطوة 36: الفحص

نفّذ `npm test` ثم `npm run lint` ثم `npm run build`، ويجب أن تنجح الثلاثة.
