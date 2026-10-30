import React, { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import { type Glyph, type NewGlyphData } from '../types/font';
import { PRESETS, missingOf } from '../utils/presets';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface PresetModalProps {
  existing: Glyph[];
  onAdd: (items: NewGlyphData[]) => void;
  onClose: () => void;
}

/** إضافة مجموعات محارف جاهزة (فارغة الرسم) بأسماء ورموز صحيحة. الموجود منها لا يتكرر. */
export const PresetModal: React.FC<PresetModalProps> = ({ existing, onAdd, onClose }) => {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  const rows = useMemo(
    () => PRESETS.map((p) => ({ preset: p, fresh: missingOf(existing, p.items) })),
    [existing]
  );
  const total = rows.reduce((n, r) => n + (picked.has(r.preset.id) ? r.fresh.length : 0), 0);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = () => {
    const items = rows.filter((r) => picked.has(r.preset.id)).flatMap((r) => r.fresh);
    if (items.length === 0) return;
    onAdd(items);
    onClose();
  };

  return (
    <Modal
      title="مجموعات جاهزة"
      subtitle="تُضاف فارغة لترسمها، والموجود منها لا يتكرر"
      icon={<Layers className="h-4 w-4 stroke-[1.5]" />}
      onClose={onClose}
    >
      <div className="space-y-2">
        {rows.map(({ preset, fresh }) => {
          const done = fresh.length === 0;
          return (
            <label
              key={preset.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border border-ink/15 p-3 ${
                done ? 'opacity-50' : 'hover:bg-sand/30'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                disabled={done}
                checked={picked.has(preset.id)}
                onChange={() => toggle(preset.id)}
              />
              <span className="flex-1">
                <span className="flex items-center justify-between text-sm">
                  <span>{preset.label}</span>
                  <span className="font-mono text-xs text-ink-soft">
                    {done ? 'مضافة كاملة' : `${fresh.length} محرف`}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-6 text-ink-soft">{preset.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      <ModalActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="primary" disabled={total === 0} onClick={submit}>
          {total === 0 ? 'إضافة' : `إضافة ${total} محرف`}
        </Button>
      </ModalActions>
    </Modal>
  );
};
