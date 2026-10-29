import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Plus, CheckCircle, Circle } from 'lucide-react';
import { FontProject, OpenTypeFeature } from '../types/font';
import { generateOpenTypeFea } from '../utils/fontLogic';

interface CodeWorkbenchProps {
  project: FontProject;
  onUpdateFeature: (tag: string, changes: Partial<OpenTypeFeature>) => void;
  onAddFeature: (feature: OpenTypeFeature) => void;
}

export const CodeWorkbench: React.FC<CodeWorkbenchProps> = ({
  project,
  onUpdateFeature,
  onAddFeature,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>(project.features[0]?.tag || 'init');
  const [copied, setCopied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');

  const currentFeature = project.features.find((f) => f.tag === selectedTag);
  const fullFea = generateOpenTypeFea(project);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullFea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFea = () => {
    const blob = new Blob([fullFea], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '_')}_features.fea`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag) return;
    onAddFeature({
      tag: newTag.toLowerCase().trim(),
      name: newName || newTag,
      enabled: true,
      code: newCode || `# قواعد الميزة ${newTag}\n`,
    });
    setSelectedTag(newTag.toLowerCase().trim());
    setNewTag('');
    setNewName('');
    setNewCode('');
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#183630]/15 bg-[#E3DAC9] p-3">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 stroke-[1.5] text-[#183630]" />
          <div>
            <h2 className="text-sm font-normal font-heading text-[#183630]">
              برمجة ميزات الخط الطباعي (OpenType FEA Syntax)
            </h2>
            <p className="text-[11px] font-extralight text-[#183630]/70">
              قواعد تبديل الأشكال السياقية، التراكيب، ومواقع التشكيل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded border border-[#183630]/20 bg-transparent px-3 py-1.5 text-xs font-light text-[#183630] hover:bg-[#E5C690]/25 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 stroke-[1.5]" /> : <Copy className="h-3.5 w-3.5 stroke-[1.5]" />}
            <span>{copied ? 'تم النسخ' : 'نسخ ملف FEA الكامل'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadFea}
            className="flex items-center gap-1.5 rounded bg-[#183630] px-3 py-1.5 text-xs font-light text-[#E3DAC9] hover:opacity-90 transition-opacity"
          >
            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>تحميل features.fea</span>
          </button>
        </div>
      </div>

      {/* Editor Grid: Feature List & Code Pane */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Features Sidebar */}
        <div className="rounded-md border border-[#183630]/15 bg-[#E3DAC9] p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#183630]/10">
            <span className="text-xs font-light text-[#183630]/75">جدول الميزات:</span>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-[11px] font-light text-[#183630] hover:bg-[#E5C690]/30 px-1.5 py-0.5 rounded transition-colors"
            >
              <Plus className="h-3 w-3 stroke-[1.5]" />
              <span>ميزة جديدة</span>
            </button>
          </div>

          <div className="space-y-1">
            {project.features.map((feature) => {
              const isSelected = feature.tag === selectedTag;
              return (
                <div
                  key={feature.tag}
                  className={`flex items-center justify-between p-2 rounded transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#183630] text-[#E3DAC9]'
                      : 'hover:bg-[#E5C690]/25 text-[#183630]'
                  }`}
                  onClick={() => setSelectedTag(feature.tag)}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateFeature(feature.tag, { enabled: !feature.enabled });
                      }}
                      className="p-0.5"
                      title={feature.enabled ? 'تعطيل الميزة' : 'تفعيل الميزة'}
                    >
                      {feature.enabled ? (
                        <CheckCircle className={`h-3.5 w-3.5 stroke-[1.5] ${isSelected ? 'text-[#E5C690]' : 'text-[#183630]'}`} />
                      ) : (
                        <Circle className={`h-3.5 w-3.5 stroke-[1.5] ${isSelected ? 'text-[#E3DAC9]/40' : 'text-[#183630]/40'}`} />
                      )}
                    </button>
                    <div>
                      <span className="font-mono text-xs font-semibold">{feature.tag}</span>
                      <p className={`text-[10px] font-extralight ${isSelected ? 'text-[#E3DAC9]/75' : 'text-[#183630]/65'}`}>
                        {feature.name}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono ${isSelected ? 'text-[#E3DAC9]/70' : 'text-[#183630]/50'}`}>
                    {feature.enabled ? 'نشطة' : 'معطلة'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Code Editor Pane */}
        <div className="md:col-span-2 rounded-md border border-[#183630]/15 bg-[#E3DAC9] p-4 flex flex-col justify-between">
          {currentFeature ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#183630]/10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#183630]">
                      feature {currentFeature.tag}
                    </span>
                    <span className="text-[11px] font-light text-[#183630]/70">
                      ({currentFeature.name})
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-xs font-light text-[#183630] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentFeature.enabled}
                    onChange={(e) => onUpdateFeature(currentFeature.tag, { enabled: e.target.checked })}
                    className="accent-[#183630]"
                  />
                  <span>تضمين في مخرجات التصدير</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-light text-[#183630]/70 mb-1">
                  شفرة المنطق البرمجي (OpenType Syntax):
                </label>
                <textarea
                  value={currentFeature.code}
                  onChange={(e) => onUpdateFeature(currentFeature.tag, { code: e.target.value })}
                  rows={14}
                  dir="ltr"
                  aria-label="محرر كود ميزات الخط"
                  className="w-full rounded border border-[#183630]/20 bg-[#E5C690]/15 p-3 font-mono text-xs text-[#183630] focus:outline-none focus:border-[#183630] selection:bg-[#183630]/20"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-xs font-light text-[#183630]/50">
              اختر ميزة من القائمة لعرض وتعديل كودها
            </div>
          )}
        </div>
      </div>

      {/* Add Feature Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183630]/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-md border border-[#183630]/20 bg-[#E3DAC9] p-5 shadow-lg">
            <h3 className="font-heading text-base font-normal text-[#183630] mb-3">
              إضافة ميزة OpenType جديدة
            </h3>
            <form onSubmit={handleCreateFeature} className="space-y-3">
              <div>
                <label className="block text-xs font-light text-[#183630]/80 mb-1">
                  رمز الميزة (4-letter Tag):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="مثال: calt أو kern أو rlig"
                  className="w-full rounded border border-[#183630]/20 bg-transparent px-3 py-1.5 text-xs font-mono text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/80 mb-1">
                  اسم الميزة الوصفي:
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: البدائل السياقية"
                  className="w-full rounded border border-[#183630]/20 bg-transparent px-3 py-1.5 text-xs font-light text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/80 mb-1">
                  الكود المبدئي:
                </label>
                <textarea
                  rows={4}
                  dir="ltr"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="sub ... by ...;"
                  className="w-full rounded border border-[#183630]/20 bg-transparent px-3 py-1.5 text-xs font-mono text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#183630]/15">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded border border-[#183630]/20 px-3 py-1.5 text-xs font-light text-[#183630] hover:bg-[#E5C690]/25"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded bg-[#183630] px-4 py-1.5 text-xs font-light text-[#E3DAC9] hover:opacity-90"
                >
                  إضافة الميزة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
