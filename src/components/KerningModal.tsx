import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Minus, Plus, Trash2 } from 'lucide-react';
import { type FontProject, type Glyph, type KernPair } from '../types/font';
import { uid } from '../utils/fontLogic';
import { glyphFillPath } from '../utils/pathGeometry';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

export const MAX_KERN_PAIRS = 2000;

/** معاينة زوج محارف بترتيب الكتابة العربية: الأول على اليمين، وبعده الثاني بعد تطبيق الضبط. */
const PairPreview: React.FC<{ first: Glyph | undefined; second: Glyph | undefined; value: number; asc: number; desc: number; label: string }> = ({
  first, second, value, asc, desc, label,
}) => {
  if (!first || !second) return <div className="h-24 rounded-2xl border border-dashed border-ink/20" />;
  // الثاني يبدأ من الصفر يساراً، والأول يميناً بعده، والضبط يحرّك الأول نحو الثاني
  const xFirst = second.advanceWidth + value;
  const total = Math.max(xFirst + first.advanceWidth, second.advanceWidth, 1);
  const pad = 80;
  return (
    <figure className="m-0 space-y-1">
      <figcaption className="text-[11px] text-ink-soft">{label}</figcaption>
      <svg
        viewBox={`${-pad} ${-asc - pad} ${total + pad * 2} ${asc - desc + pad * 2}`}
        className="h-24 w-full rounded-2xl border border-ink/15 bg-paper"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <line x1={-pad} x2={total + pad} y1={0} y2={0} className="stroke-ink" strokeOpacity="0.2" />
        <path d={glyphFillPath(second.contours)} transform="scale(1,-1)" className="fill-ink" />
        <path d={glyphFillPath(first.contours)} transform={`translate(${xFirst},0) scale(1,-1)`} className="fill-ink" fillOpacity="0.7" />
      </svg>
    </figure>
  );
};

/** ضبط المسافة بين أزواج محارف محددة. القيمة تغيّر تقدّم المحرف الأول: السالب يقرّب الثاني منه. */
export const KerningModal: React.FC<{
  project: FontProject;
  onSave: (kerning: KernPair[]) => void;
  onClose: () => void;
}> = ({ project, onSave, onClose }) => {
  const list = project.kerning ?? [];
  const glyphs = project.glyphs;
  const byName = useMemo(() => new Map(glyphs.map((g) => [g.name, g])), [glyphs]);
  const [left, setLeft] = useState(list[0]?.left ?? glyphs[0]?.name ?? '');
  const [right, setRight] = useState(list[0]?.right ?? glyphs[1]?.name ?? glyphs[0]?.name ?? '');
  const [value, setValue] = useState(list[0]?.value ?? -50);
  const existing = list.find((k) => k.left === left && k.right === right);
  const full = !existing && list.length >= MAX_KERN_PAIRS;
  const m = project.metrics;

  const save = () => {
    if (!left || !right || value === 0 || full) return;
    if (existing) onSave(list.map((k) => (k.id === existing.id ? { ...k, value } : k)));
    else onSave([...list, { id: uid('kern'), left, right, value }]);
  };
  const remove = (id: string) => onSave(list.filter((k) => k.id !== id));
  const pick = (k: KernPair) => {
    setLeft(k.left);
    setRight(k.right);
    setValue(k.value);
  };
  const options = glyphs.map((g) => (
    <option key={g.id} value={g.name}>
      {g.name}
    </option>
  ));

  return (
    <Modal
      title="المسافة بين الأزواج"
      subtitle="قرّب حرفين أو باعد بينهما بعد الصياغة"
      icon={<ArrowLeftRight className="h-4 w-4 stroke-[1.5]" />}
      size="lg"
      onClose={onClose}
    >
      {glyphs.length < 2 ? (
        <p className="mt-3 text-sm leading-7 text-ink-soft">أضف محرفين على الأقل ليظهر ضبط الأزواج.</p>
      ) : (
        <div className="mt-3 space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-ink-soft">الأول في الكتابة (الأيمن)</span>
              <select className="field" value={left} onChange={(e) => setLeft(e.target.value)}>{options}</select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-ink-soft">الثاني (الأيسر)</span>
              <select className="field" value={right} onChange={(e) => setRight(e.target.value)}>{options}</select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-soft">القيمة (وحدات الخط، السالب يقرّب)</span>
            <Button variant="secondary" icon title="تقريب أكثر" onClick={() => setValue((v) => v - 10)}>
              <Minus className="h-4 w-4 stroke-[1.5]" />
            </Button>
            <input
              dir="ltr"
              inputMode="numeric"
              className="field w-24 text-center font-mono"
              value={value}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setValue(Math.max(-m.upm, Math.min(m.upm, Math.round(n))));
              }}
              aria-label="قيمة الضبط"
            />
            <Button variant="secondary" icon title="تباعد أكثر" onClick={() => setValue((v) => v + 10)}>
              <Plus className="h-4 w-4 stroke-[1.5]" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PairPreview first={byName.get(left)} second={byName.get(right)} value={0} asc={m.ascender} desc={m.descender} label="بدون ضبط" />
            <PairPreview first={byName.get(left)} second={byName.get(right)} value={value} asc={m.ascender} desc={m.descender} label="بعد الضبط" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={!left || !right || value === 0 || full} onClick={save}>
              {existing ? 'تحديث الزوج' : 'إضافة الزوج'}
            </Button>
            {full && <span className="text-xs text-ink-soft">بلغت الحد الأقصى ({MAX_KERN_PAIRS} زوج).</span>}
            {value === 0 && <span className="text-xs text-ink-soft">القيمة صفر لا تغيّر شيئاً.</span>}
          </div>

          <div>
            <div className="mb-1 text-xs text-ink-soft">الأزواج المضبوطة ({list.length})</div>
            {list.length === 0 ? (
              <p className="text-xs leading-6 text-ink-soft">لا أزواج بعد.</p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {list.map((k) => (
                  <li key={k.id} className="flex items-center gap-2 rounded-xl border border-ink/10 px-2 py-1">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-xs" onClick={() => pick(k)}>
                      <span dir="ltr" className="truncate font-mono">{k.left}</span>
                      <span aria-hidden>←</span>
                      <span dir="ltr" className="truncate font-mono">{k.right}</span>
                      <span dir="ltr" className="ms-auto rounded-full bg-ink/10 px-2 font-mono">{k.value}</span>
                    </button>
                    <Button variant="quiet" icon title="حذف الزوج" onClick={() => remove(k.id)}>
                      <Trash2 className="h-4 w-4 stroke-[1.5]" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <ModalActions>
        <Button variant="primary" onClick={onClose}>تم</Button>
      </ModalActions>
    </Modal>
  );
};
