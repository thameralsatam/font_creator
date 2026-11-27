import React, { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Layers, Link2Off, Trash2 } from 'lucide-react';
import { t } from '../../i18n';
import type { FontProject, Glyph, GlyphComponent } from '../../types/font';
import { addComponent, detachComponents, detachOne, moveComponent, wouldCycle } from '../../utils/composites';
import { Button } from '../ui/Button';
import { Dropdown, MenuDivider, MenuItem, MenuLabel } from '../ui/Dropdown';
import { useHelp } from '../help/HelpContext';
import type { Snapshot } from '../../utils/pathEdit';

const icon = 'h-4 w-4 stroke-[1.5]';
/** خطوة التحريك بالأزرار (وحدات الخط). مع Shift تتضاعف خمس مرات. */
const STEP = 10;

/** حقل رقمي صغير: يُطبَّق عند Enter أو مغادرة الحقل، وغير الصالح يرجع إلى القيمة القديمة. */
const Num: React.FC<{ label: string; value: number; onCommit: (n: number) => void; testId: string }> = ({ label, value, onCommit, testId }) => {
  const help = useHelp();
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-ink-soft">{label}</span>
      <input
        key={value}
        readOnly={help.on}
        dir="ltr"
        inputMode="numeric"
        data-testid={testId}
        aria-label={label}
        defaultValue={value}
        style={{ width: 72, height: 30 }}
        className="field text-center font-mono"
        onBlur={(e) => {
          if (help.on) return;
          const n = Number(e.currentTarget.value.trim());
          if (e.currentTarget.value.trim() !== '' && Number.isFinite(n) && Math.round(n) !== value) onCommit(Math.round(n));
          else e.currentTarget.value = String(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
};

type SetComponents = (fn: (all: GlyphComponent[]) => GlyphComponent[], patch?: Partial<Snapshot>, key?: string) => void;

/**
 * إدارة مكوّنات المحرف: إضافة محرف موجود مكوّناً، وتحديد إزاحته وتحريكه، وفك ارتباطه أو حذفه.
 * التعديل يمس مكوّنات هذا المحرف فقط ولا يلمس المحرف الأصلي. كل خطوة تدخل سجل التراجع.
 */
export const ComponentsMenu: React.FC<{ project: FontProject; glyph: Glyph; setComponents: SetComponents }> = ({ project, glyph, setComponents }) => {
  const [filter, setFilter] = useState('');
  const comps = glyph.components ?? [];
  const byId = new Map(project.glyphs.map((g) => [g.id, g]));
  const candidates = project.glyphs
    .filter((g) => g.id !== glyph.id && !wouldCycle(project, glyph.id, g.id))
    .filter((g) => !filter.trim() || g.name.toLowerCase().includes(filter.trim().toLowerCase()) || g.char === filter.trim());

  const patch = (id: string, change: (c: GlyphComponent) => GlyphComponent, key?: string) =>
    setComponents((all) => all.map((c) => (c.id === id ? change(c) : c)), undefined, key);
  const nudge = (c: GlyphComponent, dx: number, dy: number, big: boolean) => {
    const k = big ? 5 : 1;
    setComponents((all) => moveComponent({ ...glyph, components: all }, c.id, dx * STEP * k, dy * STEP * k).components ?? all, undefined, 'comp-nudge-' + c.id);
  };
  const detach = (c: GlyphComponent) => {
    const d = detachOne(project, glyph, c.id);
    setComponents((all) => all.filter((x) => x.id !== c.id), { contours: d.contours, anchors: d.anchors });
  };
  const detachAll = () => {
    const d = detachComponents(project, glyph);
    setComponents(() => [], { contours: d.contours, anchors: d.anchors });
  };

  return (
    <Dropdown label={t('المكوّنات')} helpId="components" icon={<Layers className={icon} />} placement="bottom" width={340}>
      {() => (
        <div data-testid="components-menu">
          <MenuLabel>{t('مكوّنات هذا المحرف ({n})', { n: comps.length })}</MenuLabel>
          {comps.length === 0 && (
            <p className="px-3 py-2 text-xs leading-6 text-ink-soft">{t('لا مكوّنات. أضف محرفاً موجوداً (مثل النقطة) فيتبع أي تعديل عليه، ويبقى لك رسم مساراتك الخاصة فوقه.')}</p>
          )}
          {comps.map((c) => {
            const src = byId.get(c.ref);
            return (
              <div key={c.id} className="mx-1 mb-1 rounded-xl border border-ink/15 p-2" data-testid="component-row">
                <div className="mb-1.5 flex items-center gap-2">
                  <span dir="ltr" className={`flex-1 truncate font-mono text-xs ${src ? '' : 'text-ink-soft line-through'}`}>
                    {src ? src.name : t('محرف محذوف')}
                  </span>
                  <Button variant="quiet" icon title={t('فك الارتباط: يصير رسمه مساراتٍ خاصة بهذا المحرف')} onClick={() => detach(c)}>
                    <Link2Off className={icon} />
                  </Button>
                  <Button variant="quiet" icon title={t('حذف المكوّن من هذا المحرف')} onClick={() => setComponents((all) => all.filter((x) => x.id !== c.id))}>
                    <Trash2 className={icon} />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Num label="X" testId="comp-dx" value={c.dx} onCommit={(n) => patch(c.id, (x) => ({ ...x, dx: n }))} />
                  <Num label="Y" testId="comp-dy" value={c.dy} onCommit={(n) => patch(c.id, (x) => ({ ...x, dy: n }))} />
                </div>
                <div className="mt-1.5 flex items-center gap-1" title={t('تحريك بخطوة {n} (مع Shift خمسة أضعاف)', { n: STEP })}>
                  {[
                    { k: 'l', I: ArrowLeft, dx: -1, dy: 0, label: t('يسار') },
                    { k: 'r', I: ArrowRight, dx: 1, dy: 0, label: t('يمين') },
                    { k: 'u', I: ArrowUp, dx: 0, dy: 1, label: t('أعلى') },
                    { k: 'd', I: ArrowDown, dx: 0, dy: -1, label: t('أسفل') },
                  ].map(({ k, I, dx, dy, label }) => (
                    <Button key={k} variant="quiet" icon title={label} data-testid={`comp-nudge-${k}`} onClick={(e: React.MouseEvent) => nudge(c, dx, dy, e.shiftKey)}>
                      <I className={icon} />
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
          {comps.length > 0 && <MenuItem label={t('فك كل الارتباطات')} helpId="components.detach" icon={<Link2Off className={icon} />} onClick={detachAll} />}
          <MenuDivider />
          <MenuLabel>{t('إضافة مكوّن')}</MenuLabel>
          <div className="px-2 pb-1">
            <input
              className="field w-full"
              style={{ height: 32 }}
              placeholder={t('ابحث بالاسم أو الحرف')}
              aria-label={t('ابحث بالاسم أو الحرف')}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="max-h-44 overflow-auto" data-testid="component-candidates">
            {candidates.length === 0 && <p className="px-3 py-2 text-xs text-ink-soft">{t('لا محارف مطابقة.')}</p>}
            {candidates.map((g) => (
              <MenuItem
                key={g.id}
                label={`${g.char ? g.char + '  ' : ''}${g.name}`}
                helpId="components.add"
                onClick={() => setComponents((all) => addComponent(project, { ...glyph, components: all }, g.id)?.components ?? all)}
              />
            ))}
          </div>
        </div>
      )}
    </Dropdown>
  );
};
