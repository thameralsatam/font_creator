import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Layers, Compass, Plus, Trash2 } from 'lucide-react';
import { Layer, Glyph, FontMetrics, AnchorPoint } from '../types/font';

interface LayerPanelProps {
  layers: Layer[];
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  glyph: Glyph;
  metrics: FontMetrics;
  onUpdateBearings: (changes: { lsb?: number; rsb?: number; advanceWidth?: number }) => void;
  onAddAnchor: (anchor: Omit<AnchorPoint, 'id'>) => void;
  onRemoveAnchor: (id: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  onToggleVisibility,
  onToggleLock,
  glyph,
  metrics,
  onUpdateBearings,
  onAddAnchor,
  onRemoveAnchor,
}) => {
  const [activeSubTab, setActiveSubTab] = React.useState<'layers' | 'metrics' | 'anchors'>('layers');
  const [newAnchorName, setNewAnchorName] = React.useState('top');

  const handleAddAnchor = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAnchor({
      name: newAnchorName,
      x: Math.round(glyph.advanceWidth / 2),
      y: newAnchorName === 'bottom' ? -150 : metrics.capHeight + 50,
    });
  };

  return (
    <aside className="flex flex-col border border-[#183630]/15 bg-[#E3DAC9] rounded-md overflow-hidden">
      {/* Sub-tabs */}
      <div className="flex border-b border-[#183630]/15 bg-[#E5C690]/15 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('layers')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-light rounded transition-colors ${
            activeSubTab === 'layers'
              ? 'bg-[#183630] text-[#E3DAC9]'
              : 'text-[#183630] hover:bg-[#E5C690]/30'
          }`}
        >
          <Layers className="h-3 w-3 stroke-[1.5]" />
          <span>الطبقات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('metrics')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-light rounded transition-colors ${
            activeSubTab === 'metrics'
              ? 'bg-[#183630] text-[#E3DAC9]'
              : 'text-[#183630] hover:bg-[#E5C690]/30'
          }`}
        >
          <Compass className="h-3 w-3 stroke-[1.5]" />
          <span>العوارض</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('anchors')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-light rounded transition-colors ${
            activeSubTab === 'anchors'
              ? 'bg-[#183630] text-[#E3DAC9]'
              : 'text-[#183630] hover:bg-[#E5C690]/30'
          }`}
        >
          <Plus className="h-3 w-3 stroke-[1.5]" />
          <span>الشواهد</span>
        </button>
      </div>

      {/* Tab 1: Layers Logic */}
      {activeSubTab === 'layers' && (
        <div className="p-3 space-y-2">
          <div className="text-[11px] font-extralight text-[#183630]/70 mb-2">
            تحكم بحالة الظهور وقفل التعديل لكل طبقة هندسية:
          </div>

          <div className="space-y-1.5">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center justify-between p-2 rounded border transition-colors ${
                  layer.isVisible
                    ? 'border-[#183630]/20 bg-[#E3DAC9]'
                    : 'border-[#183630]/10 bg-[#183630]/5 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-[#183630]/20"
                    style={{ backgroundColor: layer.color }}
                  />
                  <div>
                    <p className="text-xs font-normal text-[#183630] leading-tight">
                      {layer.name}
                    </p>
                    <p className="text-[10px] font-extralight text-[#183630]/60">
                      {layer.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Visibility Button */}
                  <button
                    type="button"
                    onClick={() => onToggleVisibility(layer.id)}
                    className={`p-1 rounded text-[#183630] transition-colors ${
                      layer.isVisible
                        ? 'hover:bg-[#E5C690]/40 text-[#183630]'
                        : 'bg-[#183630]/10 text-[#183630]/50'
                    }`}
                    title={layer.isVisible ? 'إخفاء الطبقة' : 'إظهار الطبقة'}
                    aria-label={`تبديل رؤية ${layer.name}`}
                  >
                    {layer.isVisible ? (
                      <Eye className="h-3.5 w-3.5 stroke-[1.5]" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 stroke-[1.5]" />
                    )}
                  </button>

                  {/* Lock Button */}
                  <button
                    type="button"
                    onClick={() => onToggleLock(layer.id)}
                    className={`p-1 rounded transition-colors ${
                      layer.isLocked
                        ? 'bg-[#183630]/15 text-[#183630]'
                        : 'hover:bg-[#E5C690]/40 text-[#183630]/50'
                    }`}
                    title={layer.isLocked ? 'إلغاء قفل الطبقة' : 'قفل الطبقة لمنع التعديل'}
                    aria-label={`تبديل قفل ${layer.name}`}
                  >
                    {layer.isLocked ? (
                      <Lock className="h-3.5 w-3.5 stroke-[1.5]" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 stroke-[1.5]" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Metrics / Bearings */}
      {activeSubTab === 'metrics' && (
        <div className="p-3 space-y-3">
          <div className="text-[11px] font-extralight text-[#183630]/70">
            عوارض المحرف وتباعد المسار الأفقي (Sidebearings):
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* LSB */}
            <div className="p-2 border border-[#183630]/15 rounded bg-[#E5C690]/15">
              <label htmlFor="lsb-input" className="block text-[10px] font-light text-[#183630]/70">
                العارض الأيمن LSB
              </label>
              <input
                id="lsb-input"
                type="number"
                value={glyph.lsb}
                onChange={(e) => onUpdateBearings({ lsb: parseInt(e.target.value, 10) || 0 })}
                className="w-full mt-1 bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none focus:border-[#183630]"
              />
            </div>

            {/* Advance Width */}
            <div className="p-2 border border-[#183630]/20 rounded bg-[#E3DAC9]">
              <label htmlFor="advance-input" className="block text-[10px] font-light text-[#183630]/70">
                العرض الكامل Width
              </label>
              <input
                id="advance-input"
                type="number"
                value={glyph.advanceWidth}
                onChange={(e) => onUpdateBearings({ advanceWidth: parseInt(e.target.value, 10) || 100 })}
                className="w-full mt-1 bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none focus:border-[#183630]"
              />
            </div>

            {/* RSB */}
            <div className="p-2 border border-[#183630]/15 rounded bg-[#E5C690]/15">
              <label htmlFor="rsb-input" className="block text-[10px] font-light text-[#183630]/70">
                العارض الأيسر RSB
              </label>
              <input
                id="rsb-input"
                type="number"
                value={glyph.rsb}
                onChange={(e) => onUpdateBearings({ rsb: parseInt(e.target.value, 10) || 0 })}
                className="w-full mt-1 bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none focus:border-[#183630]"
              />
            </div>
          </div>

          <div className="rounded border border-[#183630]/10 bg-[#E5C690]/10 p-2.5 space-y-1 text-[11px] font-light text-[#183630]/80">
            <div className="flex justify-between">
              <span>الصاعد (Ascender):</span>
              <span className="font-mono text-[#183630]">{metrics.ascender}</span>
            </div>
            <div className="flex justify-between">
              <span>ارتفاع التاج (Cap Height):</span>
              <span className="font-mono text-[#183630]">{metrics.capHeight}</span>
            </div>
            <div className="flex justify-between">
              <span>خط الأساس (Baseline):</span>
              <span className="font-mono text-[#183630]">0</span>
            </div>
            <div className="flex justify-between">
              <span>الهابط (Descender):</span>
              <span className="font-mono text-[#183630]">{metrics.descender}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Anchors for diacritics */}
      {activeSubTab === 'anchors' && (
        <div className="p-3 space-y-2.5">
          <div className="text-[11px] font-extralight text-[#183630]/70">
            نقاط الارتكاز لربط حركات التشكيل والنقاط:
          </div>

          <form onSubmit={handleAddAnchor} className="flex gap-1.5">
            <select
              value={newAnchorName}
              onChange={(e) => setNewAnchorName(e.target.value)}
              aria-label="نوع نقطة الارتكاز"
              className="flex-1 rounded border border-[#183630]/20 bg-transparent px-2 py-1 text-xs font-light text-[#183630] focus:outline-none"
            >
              <option value="top">شاهد علوي (top)</option>
              <option value="bottom">شاهد سفلي (bottom)</option>
              <option value="entry">نقطة اتصال دخول (entry)</option>
              <option value="exit">نقطة اتصال خروج (exit)</option>
            </select>
            <button
              type="submit"
              className="rounded bg-[#183630] px-2.5 py-1 text-xs font-light text-[#E3DAC9] transition-opacity hover:opacity-90 flex items-center gap-1"
            >
              <Plus className="h-3 w-3 stroke-[1.5]" />
              <span>إضافة</span>
            </button>
          </form>

          <div className="space-y-1">
            {glyph.anchors.length === 0 ? (
              <p className="text-[11px] font-light text-[#183630]/50 text-center py-3">
                لا توجد نقاط ارتكاز مخصصة بعد
              </p>
            ) : (
              glyph.anchors.map((anchor) => (
                <div
                  key={anchor.id}
                  className="flex items-center justify-between rounded border border-[#183630]/15 bg-[#E3DAC9] px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#E5C690] border border-[#183630]/30" />
                    <span className="text-xs font-mono text-[#183630]">{anchor.name}</span>
                    <span className="text-[10px] font-mono text-[#183630]/60">
                      ({anchor.x}, {anchor.y})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveAnchor(anchor.id)}
                    className="text-[#183630]/50 hover:text-[#183630] p-0.5 transition-colors"
                    title="حذف النقطة"
                    aria-label={`حذف نقطة ${anchor.name}`}
                  >
                    <Trash2 className="h-3 w-3 stroke-[1.5]" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
