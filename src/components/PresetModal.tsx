import React, { useMemo, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { type Glyph, type NewGlyphData } from '../types/font';
import { PRESETS, missingOf } from '../utils/presets';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface PresetModalProps {
  existing: Glyph[];
  onAdd: (items: NewGlyphData[]) => void;
  onClose: () => void;
}

/** اختيار محارف جاهزة: مجموعة كاملة بنقرة، أو محارف بعينها بعد فتح المجموعة. الموجود لا يتكرر. */
export const PresetModal: React.FC<PresetModalProps> = ({ existing, onAdd, onClose }) => {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () => PRESETS.map((p) => ({ preset: p, fresh: missingOf(existing, p.items) })),
    [existing]
  );

  const flip = (names: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      names.forEach((n) => (on ? next.add(n) : next.delete(n)));
      return next;
    });

  const submit = () => {
    const byName = new Map<string, NewGlyphData>();
    rows.forEach((r) => r.fresh.forEach((g) => picked.has(g.name) && byName.set(g.name, g)));
    if (byName.size === 0) return;
    onAdd([...byName.values()]);
    onClose();
  };

  return (
    <Modal
      title="محارف جاهزة"
      subtitle="اختر مجموعة كاملة أو افتحها واختر محارف بعينها. تُضاف فارغة لترسمها"
      icon={<Layers className="h-4 w-4 stroke-[1.5]" />}
      size="lg"
      onClose={onClose}
    >
      <div className="space-y-2">
        {rows.map(({ preset, fresh }) => {
          const done = fresh.length === 0;
          const chosen = fresh.filter((g) => picked.has(g.name)).length;
          const all = !done && chosen === fresh.length;
          const open = openId === preset.id;
          return (
            <div key={preset.id} className={`rounded-2xl border border-ink/15 ${done ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 p-2.5">
                <button
                  type="button"
                  disabled={done}
                  onClick={() => setOpenId(open ? null : preset.id)}
                  aria-expanded={open}
                  className="flex min-w-0 flex-1 items-center gap-2 text-start"
                >
                  <ChevronDown className={`h-4 w-4 shrink-0 stroke-[1.5] transition-transform ${open ? 'rotate-180' : ''}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{preset.label}</span>
                    <span className="block truncate text-[11px] text-ink-soft">{preset.description}</span>
                  </span>
                </button>
                <span className="chip chip-ghost shrink-0 font-mono">
                  {done ? 'مضافة' : `${chosen}/${fresh.length}`}
                </span>
                {!done && (
                  <Button
                    variant={all ? 'primary' : 'secondary'}
                    onClick={() => flip(fresh.map((g) => g.name), !all)}
                  >
                    {all ? 'إلغاء الكل' : 'الكل'}
                  </Button>
                )}
              </div>
              {open && !done && (
                <div className="grid grid-cols-4 gap-1.5 border-t border-ink/10 p-2.5 sm:grid-cols-6">
                  {fresh.map((g) => {
                    const on = picked.has(g.name);
                    return (
                      <button
                        key={g.name}
                        type="button"
                        aria-pressed={on}
                        onClick={() => flip([g.name], !on)}
                        title={g.name}
                        className={`flex flex-col items-center gap-0.5 rounded-xl border py-1.5 transition-colors ${
                          on ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:bg-sand/30'
                        }`}
                      >
                        <span className="font-heading text-lg leading-tight">{g.char || '·'}</span>
                        <span dir="ltr" className="w-full truncate px-1 text-center font-mono text-[9px] opacity-70">
                          {g.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <ModalActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="primary" disabled={picked.size === 0} onClick={submit}>
          {picked.size === 0 ? 'إضافة' : `إضافة ${picked.size} محرف`}
        </Button>
      </ModalActions>
    </Modal>
  );
};
