import React, { useState } from 'react';
import { X, Check, Sliders, AlertCircle, Compass } from 'lucide-react';
import { FontMetrics, FontProject } from '../types/font';
import { validateMetrics } from '../utils/fontLogic';

interface MetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
  onSave: (updates: { name: string; designer: string; version: string; metrics: FontMetrics }) => void;
}

export const MetricsModal: React.FC<MetricsModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
}) => {
  const [name, setName] = useState(project.name);
  const [designer, setDesigner] = useState(project.designer);
  const [version, setVersion] = useState(project.version);
  const [metrics, setMetrics] = useState<FontMetrics>({ ...project.metrics });

  if (!isOpen) return null;

  const validation = validateMetrics(metrics);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;
    onSave({ name, designer, version, metrics });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183630]/35 backdrop-blur-md p-4 animate-backdrop-fade">
      <div className="w-full max-w-xl rounded-3xl border border-[#183630]/15 bg-[#EDE6D8] p-6 sm:p-8 shadow-2xl animate-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#183630]/12">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#183630]/20 bg-[#E5C690]/35 text-[#183630]">
              <Sliders className="h-4 w-4 stroke-[1.5]" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-normal text-[#183630]">
                إعدادات ومقاييس الخط الطباعي
              </h3>
              <p className="text-xs font-light text-[#183630]/75">
                تعديل بيانات الخط والأبعاد الرأسية لمربع الـ EM
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#183630]/65 hover:text-[#183630] hover:bg-[#E5C690]/35 transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4 stroke-[1.5]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Section 1: General Info */}
          <div>
            <h4 className="text-xs font-heading font-normal text-[#183630] mb-2.5 flex items-center gap-1.5">
              <span>بيانات الخط والتعريف</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-light text-[#183630]/80 mb-1">
                  اسم عائلة الخط:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#183630]/15 bg-[#E5C690]/15 px-3 py-2 text-xs font-light text-[#183630] focus:outline-none focus:border-[#183630]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-light text-[#183630]/80 mb-1">
                  المصمم:
                </label>
                <input
                  type="text"
                  value={designer}
                  onChange={(e) => setDesigner(e.target.value)}
                  className="w-full rounded-xl border border-[#183630]/15 bg-[#E5C690]/15 px-3 py-2 text-xs font-light text-[#183630] focus:outline-none focus:border-[#183630]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-light text-[#183630]/80 mb-1">
                  الإصدار:
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full rounded-xl border border-[#183630]/15 bg-[#E5C690]/15 px-3 py-2 text-xs font-light text-[#183630] focus:outline-none focus:border-[#183630]/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Vertical Metrics */}
          <div className="pt-4 border-t border-[#183630]/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-heading font-normal text-[#183630] flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 stroke-[1.5]" />
                <span>المقاييس الرأسية للـ EM</span>
              </h4>
              <span className="text-[11px] font-mono text-[#183630]/70">
                مقياس UPM: {metrics.upm} وحدة
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-2xl border border-[#183630]/15 bg-[#E5C690]/20">
                <label className="block text-[11px] font-light text-[#183630]/75">
                  الصاعد (Ascender)
                </label>
                <div className="mt-1 flex items-center gap-1">
                  <span className="font-mono text-xs text-[#183630]/60">+</span>
                  <input
                    type="number"
                    value={metrics.ascender}
                    onChange={(e) => setMetrics({ ...metrics, ascender: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none focus:border-[#183630]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-2xl border border-[#183630]/15 bg-[#E5C690]/20">
                <label className="block text-[11px] font-light text-[#183630]/75">
                  التاج (Cap Height)
                </label>
                <div className="mt-1 flex items-center gap-1">
                  <span className="font-mono text-xs text-[#183630]/60">+</span>
                  <input
                    type="number"
                    value={metrics.capHeight}
                    onChange={(e) => setMetrics({ ...metrics, capHeight: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none focus:border-[#183630]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-2xl border border-[#183630]/15 bg-[#E5C690]/20">
                <label className="block text-[11px] font-light text-[#183630]/75">
                  ارتفاع x-Height
                </label>
                <div className="mt-1 flex items-center gap-1">
                  <span className="font-mono text-xs text-[#183630]/60">+</span>
                  <input
                    type="number"
                    value={metrics.xHeight}
                    onChange={(e) => setMetrics({ ...metrics, xHeight: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none focus:border-[#183630]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-2xl border border-[#183630]/15 bg-[#E5C690]/20">
                <label className="block text-[11px] font-light text-[#183630]/75">
                  الهابط (Descender)
                </label>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    value={metrics.descender}
                    onChange={(e) => setMetrics({ ...metrics, descender: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none focus:border-[#183630]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-2xl border border-[#183630]/15 bg-[#E5C690]/20">
                <label className="block text-[11px] font-light text-[#183630]/75">
                  مقياس EM الكلي (UPM)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    value={metrics.upm}
                    onChange={(e) => setMetrics({ ...metrics, upm: parseInt(e.target.value, 10) || 1000 })}
                    className="w-full bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none focus:border-[#183630]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-2xl border border-[#183630]/10 bg-[#183630]/5">
                <label className="block text-[11px] font-light text-[#183630]/60">
                  خط الأساس (Baseline)
                </label>
                <div className="mt-1 font-mono text-xs text-[#183630]/50 py-0.5">
                  0 (ثابت)
                </div>
              </div>
            </div>
          </div>

          {/* Validation Feedback */}
          {!validation.isValid && (
            <div className="rounded-2xl border border-[#183630]/20 bg-[#E5C690]/30 p-3 text-xs text-[#183630] space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="h-3.5 w-3.5 stroke-[1.5]" />
                <span>يرجى مراجعة تناسق المقاييس:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] font-light space-y-0.5">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#183630]/12">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#183630]/20 px-4 py-2 text-xs font-light text-[#183630] hover:bg-[#E5C690]/25 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!validation.isValid}
              className="flex items-center gap-1.5 rounded-xl bg-[#183630] px-5 py-2 text-xs font-light text-[#EDE6D8] hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <Check className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>حفظ المقاييس</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
