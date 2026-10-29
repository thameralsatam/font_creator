import React from 'react';
import { PenTool, Grid3X3, Type, Code2, Download, Sliders, Layers } from 'lucide-react';

export type ActiveTab = 'editor' | 'matrix' | 'tester' | 'code';

interface HeaderProps {
  projectName: string;
  version: string;
  upm: number;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  activeGlyphChar: string;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  version,
  upm,
  activeTab,
  onTabChange,
  onOpenSettings,
  onOpenExport,
  activeGlyphChar,
}) => {
  return (
    <header className="border-b border-[#183630]/15 bg-[#E3DAC9] px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-[#183630]/20 bg-[#E5C690]/25 text-[#183630]">
            <PenTool className="h-4 w-4 stroke-[1.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-lg font-normal tracking-wide text-[#183630]">
                {projectName}
              </h1>
              <span className="rounded border border-[#183630]/15 bg-[#E5C690]/30 px-1.5 py-0.5 text-[11px] font-light text-[#183630]">
                v{version}
              </span>
            </div>
            <p className="text-[12px] font-extralight text-[#183630]/75">
              مقياس {upm} UPM • الحرف النشط: <span className="font-normal text-[#183630]">{activeGlyphChar}</span>
            </p>
          </div>
        </div>

        {/* View Switcher / Tabs */}
        <nav
          className="order-3 sm:order-2 w-full sm:w-auto flex items-center overflow-x-auto rounded-md border border-[#183630]/15 bg-[#E3DAC9] p-0.5 no-scrollbar"
          aria-label="أقسام العمل"
        >
          <button
            type="button"
            onClick={() => onTabChange('editor')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded px-2.5 sm:px-3 py-1.5 text-xs font-light transition-colors whitespace-nowrap ${
              activeTab === 'editor'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/30'
            }`}
            aria-current={activeTab === 'editor' ? 'page' : undefined}
          >
            <PenTool className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>محرر المتجه</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('matrix')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded px-2.5 sm:px-3 py-1.5 text-xs font-light transition-colors whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/30'
            }`}
            aria-current={activeTab === 'matrix' ? 'page' : undefined}
          >
            <Grid3X3 className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>شبكة المحارف</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('tester')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded px-2.5 sm:px-3 py-1.5 text-xs font-light transition-colors whitespace-nowrap ${
              activeTab === 'tester'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/30'
            }`}
            aria-current={activeTab === 'tester' ? 'page' : undefined}
          >
            <Type className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>فاحص النص</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('code')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded px-2.5 sm:px-3 py-1.5 text-xs font-light transition-colors whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/30'
            }`}
            aria-current={activeTab === 'code' ? 'page' : undefined}
          >
            <Code2 className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>برمجة الخط FEA</span>
          </button>
        </nav>

        {/* Global Action Buttons */}
        <div className="order-2 sm:order-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded border border-[#183630]/20 bg-transparent px-2.5 py-1.5 text-xs font-light text-[#183630] transition-colors hover:border-[#183630]/40 hover:bg-[#E5C690]/25"
            aria-label="إعدادات المقاييس"
          >
            <Sliders className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>المقاييس</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 rounded border border-[#183630] bg-[#183630] px-3 py-1.5 text-xs font-light text-[#E3DAC9] transition-opacity hover:opacity-90"
            aria-label="تصدير ملفات الخط"
          >
            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>تصدير</span>
          </button>
        </div>
      </div>
    </header>
  );
};
