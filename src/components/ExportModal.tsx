import React, { useState } from 'react';
import { X, Download, Copy, Check, FileJson, FileCode, CheckCircle2 } from 'lucide-react';
import { FontProject } from '../types/font';
import { generateOpenTypeFea, exportProjectJSON } from '../utils/fontLogic';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const feaContent = generateOpenTypeFea(project);
  const jsonContent = exportProjectJSON(project);

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183630]/35 backdrop-blur-md p-4 animate-backdrop-fade">
      <div className="w-full max-w-lg rounded-3xl border border-[#183630]/15 bg-[#EDE6D8] p-6 sm:p-8 shadow-2xl animate-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#183630]/12">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#183630]/20 bg-[#E5C690]/35 text-[#183630]">
              <Download className="h-4 w-4 stroke-[1.5]" />
            </span>
            <h3 className="font-heading text-lg font-normal text-[#183630]">
              تصدير ملفات الخط والبرمجة
            </h3>
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

        {/* Export Options Cards */}
        <div className="mt-4 space-y-3">
          {/* 1. OpenType Feature File */}
          <div className="flex items-center justify-between p-3.5 rounded border border-[#183630]/20 bg-[#E5C690]/15">
            <div className="flex items-start gap-3">
              <FileCode className="h-5 w-5 stroke-[1.5] text-[#183630] mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold font-mono text-[#183630]">
                  features.fea (OpenType Syntax)
                </h4>
                <p className="text-[11px] font-extralight text-[#183630]/75 leading-relaxed">
                  ملف قواعد تبديل الأشكال والتراكيب المتوافق مع FontForge و Glyphs و AFDKO
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(feaContent, 'fea')}
                className="p-1.5 rounded border border-[#183630]/20 text-[#183630] hover:bg-[#E5C690]/35 transition-colors"
                title="نسخ الشفرة"
              >
                {copiedType === 'fea' ? (
                  <Check className="h-3.5 w-3.5 stroke-[1.5]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    feaContent,
                    `${project.name.replace(/\s+/g, '_')}.fea`,
                    'text/plain;charset=utf-8'
                  )
                }
                className="flex items-center gap-1 rounded bg-[#183630] px-2.5 py-1 text-xs font-light text-[#E3DAC9] hover:opacity-90 transition-opacity"
              >
                <Download className="h-3 w-3 stroke-[1.5]" />
                <span>تحميل</span>
              </button>
            </div>
          </div>

          {/* 2. Full Font Project JSON */}
          <div className="flex items-center justify-between p-3.5 rounded border border-[#183630]/20 bg-[#E5C690]/15">
            <div className="flex items-start gap-3">
              <FileJson className="h-5 w-5 stroke-[1.5] text-[#183630] mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold font-mono text-[#183630]">
                  font_project.json (Source Package)
                </h4>
                <p className="text-[11px] font-extralight text-[#183630]/75 leading-relaxed">
                  حزمة المشروع الكاملة متضمنة المسارات، الطبقات، المقاييس، وشواهد التشكيل
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(jsonContent, 'json')}
                className="p-1.5 rounded border border-[#183630]/20 text-[#183630] hover:bg-[#E5C690]/35 transition-colors"
                title="نسخ ملف JSON"
              >
                {copiedType === 'json' ? (
                  <Check className="h-3.5 w-3.5 stroke-[1.5]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    jsonContent,
                    `${project.name.replace(/\s+/g, '_')}_project.json`,
                    'application/json;charset=utf-8'
                  )
                }
                className="flex items-center gap-1 rounded bg-[#183630] px-2.5 py-1 text-xs font-light text-[#E3DAC9] hover:opacity-90 transition-opacity"
              >
                <Download className="h-3 w-3 stroke-[1.5]" />
                <span>تحميل</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-2 border-t border-[#183630]/15">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#183630]/20 px-4 py-1.5 text-xs font-light text-[#183630] hover:bg-[#E5C690]/25 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
