import React, { useState } from 'react';
import { AlertCircle, Sliders } from 'lucide-react';
import { type FontMetrics, type FontProject } from '../types/font';
import { validateMetrics } from '../utils/fontLogic';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface MetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  onSave: (updates: { metrics: FontMetrics }) => void;
}

const FIELDS: Array<{ key: keyof FontMetrics; label: string }> = [
  { key: 'ascender', label: 'الصاعد' },
  { key: 'capHeight', label: 'ارتفاع الحروف الكبيرة' },
  { key: 'xHeight', label: 'ارتفاع الحروف الصغيرة' },
  { key: 'descender', label: 'الهابط' },
  { key: 'upm', label: 'مقياس مربع الخط (UPM)' },
];

export const MetricsModal: React.FC<MetricsModalProps> = ({ onClose, project, onSave }) => {
  // نحتفظ بالقيم نصاً أثناء الكتابة حتى لا يتحول الحقل الفارغ إلى صفر
  const [draft, setDraft] = useState<Record<keyof FontMetrics, string>>({
    upm: String(project.metrics.upm),
    ascender: String(project.metrics.ascender),
    capHeight: String(project.metrics.capHeight),
    xHeight: String(project.metrics.xHeight),
    descender: String(project.metrics.descender),
  });

  const parsed: FontMetrics = {
    upm: Number(draft.upm),
    ascender: Number(draft.ascender),
    capHeight: Number(draft.capHeight),
    xHeight: Number(draft.xHeight),
    descender: Number(draft.descender),
  };

  const hasBadNumber = Object.values(parsed).some(
    (v) => !Number.isFinite(v) || !Number.isInteger(v)
  );
  const validation = validateMetrics(parsed);
  const errors = hasBadNumber
    ? ['كل المقاييس يجب أن تكون أعداداً صحيحة.']
    : validation.errors;
  const canSave = !hasBadNumber && validation.isValid;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({ metrics: parsed });
    onClose();
  };

  return (
    <Modal
      title="مقاييس الخط"
      subtitle="الأبعاد الرأسية لمربع الخط"
      icon={<Sliders className="h-4 w-4 stroke-[1.5]" />}
      size="lg"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="rounded-2xl border border-ink/15 bg-sand/20 p-2.5">
                <label htmlFor={`m-${key}`} className="block text-[11px] text-ink-soft">{label}</label>
                <input
                  id={`m-${key}`}
                  inputMode="numeric"
                  dir="ltr"
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="mt-1 w-full border-b border-ink/30 bg-transparent py-0.5 font-mono text-xs focus:border-ink focus:outline-none"
                />
              </div>
            ))}
            <div className="rounded-2xl border border-ink/10 bg-ink/5 p-2.5">
              <span className="block text-[11px] text-ink-soft">خط الأساس</span>
              <span className="mt-1 block py-0.5 font-mono text-xs text-ink-soft">0 (ثابت)</span>
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div role="alert" className="space-y-1 rounded-2xl border border-ink/20 bg-sand/30 p-3 text-xs">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>يرجى مراجعة تناسق المقاييس:</span>
            </div>
            <ul className="list-inside list-disc space-y-0.5 text-[11px]">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <ModalActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary" disabled={!canSave}>
            حفظ المقاييس
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
};
