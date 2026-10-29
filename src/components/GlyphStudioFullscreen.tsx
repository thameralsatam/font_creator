import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  MousePointer,
  PenTool,
  Ruler,
  Anchor,
  Layers,
  Compass,
  Sliders,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Info,
  Check,
} from 'lucide-react';
import { Glyph, Layer, FontMetrics, AnchorPoint, FontProject } from '../types/font';

interface GlyphStudioFullscreenProps {
  project: FontProject;
  glyph: Glyph;
  onSelectGlyph: (glyphId: string) => void;
  onBackToProject: () => void;
  layers: Layer[];
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onUpdateGlyphBearings: (changes: { lsb?: number; rsb?: number; advanceWidth?: number }) => void;
  onAddAnchor: (anchor: Omit<AnchorPoint, 'id'>) => void;
  onRemoveAnchor: (anchorId: string) => void;
  onOpenExport: () => void;
}

export type StudioTool = 'select' | 'pen' | 'ruler' | 'anchor';

export const GlyphStudioFullscreen: React.FC<GlyphStudioFullscreenProps> = ({
  project,
  glyph,
  onSelectGlyph,
  onBackToProject,
  layers,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onUpdateGlyphBearings,
  onAddAnchor,
  onRemoveAnchor,
  onOpenExport,
}) => {
  const [activeTool, setActiveTool] = useState<StudioTool>('select');
  const [zoom, setZoom] = useState<number>(0.75);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<'layers' | 'metrics' | 'anchors' | 'preview' | 'glyphs' | null>(null);
  const [quickPreviewText, setQuickPreviewText] = useState('كتابة الخط العربي فن وهندسة');
  const [notice, setNotice] = useState<string | null>(null);

  // New anchor form
  const [newAnchorName, setNewAnchorName] = useState('top');

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const contourLayer = layers.find((l) => l.id === 'layer-contours');
  const anchorLayer = layers.find((l) => l.id === 'layer-anchors');
  const metricLayer = layers.find((l) => l.id === 'layer-metrics');
  const gridLayer = layers.find((l) => l.id === 'layer-grid');

  const currentIndex = project.glyphs.findIndex((g) => g.id === glyph.id);
  const handlePrev = () => {
    if (currentIndex > 0) onSelectGlyph(project.glyphs[currentIndex - 1].id);
  };
  const handleNext = () => {
    if (currentIndex < project.glyphs.length - 1) onSelectGlyph(project.glyphs[currentIndex + 1].id);
  };

  // SVG Geometry
  const viewBoxWidth = 1000;
  const viewBoxHeight = 1200;
  const baselineY = 850;
  const glyphOriginX = Math.round((viewBoxWidth - glyph.advanceWidth) / 2);
  const toSvgY = (fontY: number) => baselineY - fontY;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-40 bg-[#E3DAC9] flex flex-col overflow-hidden select-none"
    >
      {/* 1. Floating Modern Top Bar */}
      <div className="absolute top-3 inset-x-3 sm:top-5 sm:inset-x-6 max-w-5xl mx-auto z-50">
        <div className="glass-dropdown rounded-2xl p-2 px-3 sm:px-4 shadow-md flex items-center justify-between gap-2">
          {/* Right Section (RTL Start): Back & Glyph Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onBackToProject}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[#183630] hover:bg-[#E5C690]/35 transition-colors"
              title="الرجوع لصفحة تفاصيل المشروع"
              aria-label="الرجوع لتفاصيل المشروع"
            >
              <ArrowRight className="h-4 w-4 stroke-[1.5]" />
            </button>

            {/* Glyph dropdown button */}
            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={() =>
                  setActiveDropdown(activeDropdown === 'glyphs' ? null : 'glyphs')
                }
                className="flex items-center gap-1.5 rounded-xl border border-[#183630]/20 bg-[#E5C690]/25 px-2.5 py-1.5 text-xs text-[#183630] hover:bg-[#E5C690]/40 transition-colors"
              >
                <span className="font-heading text-lg font-normal leading-none">{glyph.char}</span>
                <span className="text-[11px] font-mono">{glyph.name}</span>
                <ChevronDown className="h-3 w-3 stroke-[1.5] text-[#183630]/60" />
              </button>

              {/* Glyphs Dropdown Menu */}
              {activeDropdown === 'glyphs' && (
                <div className="absolute top-full mt-2 right-0 z-50 w-64 rounded-2xl glass-dropdown p-2.5 shadow-xl border border-[#183630]/20 max-h-72 overflow-y-auto">
                  <div className="text-[10px] font-light text-[#183630]/60 px-2 py-1 mb-1 border-b border-[#183630]/10">
                    اختر المحرف المراد تعديله:
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {project.glyphs.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          onSelectGlyph(g.id);
                          setActiveDropdown(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                          g.id === glyph.id
                            ? 'bg-[#183630] text-[#E3DAC9]'
                            : 'hover:bg-[#E5C690]/30 text-[#183630]'
                        }`}
                      >
                        <span className="font-heading text-xl">{g.char}</span>
                        <span className="text-[9px] font-mono mt-0.5">{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prev/Next arrows */}
            <div className="hidden sm:flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-[#183630] hover:bg-[#E5C690]/30 disabled:opacity-25"
                title="المحرف السابق"
              >
                <ChevronRight className="h-3.5 w-3.5 stroke-[1.5]" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= project.glyphs.length - 1}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-[#183630] hover:bg-[#E5C690]/30 disabled:opacity-25"
                title="المحرف التالي"
              >
                <ChevronLeft className="h-3.5 w-3.5 stroke-[1.5]" />
              </button>
            </div>
          </div>

          {/* Center Section: Modern Vector Tools Pill */}
          <div className="flex items-center gap-0.5 rounded-xl border border-[#183630]/15 bg-[#E5C690]/20 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTool('select');
                triggerNotice('أداة التحديد والتحريك مفعلة');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                activeTool === 'select'
                  ? 'bg-[#183630] text-[#E3DAC9]'
                  : 'text-[#183630] hover:bg-[#E5C690]/35'
              }`}
              title="أداة التحديد"
            >
              <MousePointer className="h-3.5 w-3.5 stroke-[1.5]" />
              <span className="hidden sm:inline">تحديد</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('pen');
                triggerNotice('أداة القلم والمنحنيات مفعلة');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                activeTool === 'pen'
                  ? 'bg-[#183630] text-[#E3DAC9]'
                  : 'text-[#183630] hover:bg-[#E5C690]/35'
              }`}
              title="أداة القلم"
            >
              <PenTool className="h-3.5 w-3.5 stroke-[1.5]" />
              <span className="hidden sm:inline">قلم</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('ruler');
                triggerNotice('مسطرة قياس الأبعاد');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                activeTool === 'ruler'
                  ? 'bg-[#183630] text-[#E3DAC9]'
                  : 'text-[#183630] hover:bg-[#E5C690]/35'
              }`}
              title="مسطرة القياس"
            >
              <Ruler className="h-3.5 w-3.5 stroke-[1.5]" />
              <span className="hidden sm:inline">مسطرة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTool('anchor');
                triggerNotice('أداة شواهد الحركات');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors ${
                activeTool === 'anchor'
                  ? 'bg-[#183630] text-[#E3DAC9]'
                  : 'text-[#183630] hover:bg-[#E5C690]/35'
              }`}
              title="شواهد التشكيل"
            >
              <Anchor className="h-3.5 w-3.5 stroke-[1.5]" />
              <span className="hidden sm:inline">شاهد</span>
            </button>
          </div>

          {/* Left Section: Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-[#183630] hover:bg-[#E5C690]/30 transition-colors"
              title="تصغير"
            >
              <ZoomOut className="h-3.5 w-3.5 stroke-[1.5]" />
            </button>
            <span className="font-mono text-[11px] w-8 text-center text-[#183630]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(1.6, Number((prev + 0.1).toFixed(2))))}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-[#183630] hover:bg-[#E5C690]/30 transition-colors"
              title="تكبير"
            >
              <ZoomIn className="h-3.5 w-3.5 stroke-[1.5]" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(0.75)}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-[#183630]/65 hover:text-[#183630] hover:bg-[#E5C690]/30 transition-colors ml-1"
              title="إعادة ضبط المقياس"
            >
              <RotateCcw className="h-3.5 w-3.5 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Notice Toast */}
      {notice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl glass-dropdown px-4 py-2 text-xs text-[#183630] shadow-lg border border-[#183630]/20 animate-fade-in">
          <Info className="h-3.5 w-3.5 stroke-[1.5]" />
          <span>{notice}</span>
        </div>
      )}

      {/* 2. Central Full-Screen Infinite SVG Canvas (occupies entire screen) */}
      <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.12s ease-out',
          }}
          className="rounded-3xl border border-[#183630]/15 bg-[#E3DAC9] shadow-md p-2"
        >
          <svg
            width={viewBoxWidth}
            height={viewBoxHeight}
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
            className="overflow-visible"
          >
            <defs>
              <pattern
                id="studio-metric-grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#183630"
                  strokeWidth="0.5"
                  strokeOpacity="0.08"
                />
              </pattern>
            </defs>

            {/* Grid */}
            {gridLayer?.isVisible && (
              <rect
                width={viewBoxWidth}
                height={viewBoxHeight}
                fill="url(#studio-metric-grid)"
                opacity={gridLayer.opacity}
              />
            )}

            {/* Metrics guidelines */}
            {metricLayer?.isVisible && (
              <g opacity={metricLayer.opacity}>
                {/* Ascender line */}
                <line
                  x1="0"
                  y1={toSvgY(project.metrics.ascender)}
                  x2={viewBoxWidth}
                  y2={toSvgY(project.metrics.ascender)}
                  stroke="#183630"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x="20"
                  y={toSvgY(project.metrics.ascender) - 6}
                  fill="#183630"
                  fontSize="12"
                  fontFamily="JetBrains Mono"
                  className="font-light"
                >
                  الصاعد Ascender ({project.metrics.ascender})
                </text>

                {/* Cap Height line */}
                <line
                  x1="0"
                  y1={toSvgY(project.metrics.capHeight)}
                  x2={viewBoxWidth}
                  y2={toSvgY(project.metrics.capHeight)}
                  stroke="#183630"
                  strokeDasharray="2 3"
                  strokeWidth="0.8"
                />
                <text
                  x="20"
                  y={toSvgY(project.metrics.capHeight) - 6}
                  fill="#183630"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                  className="font-light"
                >
                  التاج Cap Height ({project.metrics.capHeight})
                </text>

                {/* Baseline line */}
                <line
                  x1="0"
                  y1={toSvgY(0)}
                  x2={viewBoxWidth}
                  y2={toSvgY(0)}
                  stroke="#183630"
                  strokeWidth="1.5"
                />
                <text
                  x="20"
                  y={toSvgY(0) - 6}
                  fill="#183630"
                  fontSize="12"
                  fontFamily="JetBrains Mono"
                  className="font-medium"
                >
                  خط الأساس Baseline (0)
                </text>

                {/* Descender line */}
                <line
                  x1="0"
                  y1={toSvgY(project.metrics.descender)}
                  x2={viewBoxWidth}
                  y2={toSvgY(project.metrics.descender)}
                  stroke="#183630"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x="20"
                  y={toSvgY(project.metrics.descender) + 16}
                  fill="#183630"
                  fontSize="12"
                  fontFamily="JetBrains Mono"
                  className="font-light"
                >
                  الهابط Descender ({project.metrics.descender})
                </text>

                {/* Left Sidebearing (LSB) */}
                <line
                  x1={glyphOriginX + glyph.lsb}
                  y1="50"
                  x2={glyphOriginX + glyph.lsb}
                  y2={viewBoxHeight - 50}
                  stroke="#E5C690"
                  strokeWidth="1.2"
                />
                <text
                  x={glyphOriginX + glyph.lsb + 8}
                  y="140"
                  fill="#183630"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                >
                  LSB ({glyph.lsb})
                </text>

                {/* Advance Width */}
                <line
                  x1={glyphOriginX + glyph.advanceWidth}
                  y1="50"
                  x2={glyphOriginX + glyph.advanceWidth}
                  y2={viewBoxHeight - 50}
                  stroke="#183630"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                />
                <text
                  x={glyphOriginX + glyph.advanceWidth + 8}
                  y="140"
                  fill="#183630"
                  fontSize="11"
                  fontFamily="JetBrains Mono"
                >
                  العرض Width ({glyph.advanceWidth})
                </text>
              </g>
            )}

            {/* Glyph Contour */}
            {contourLayer?.isVisible && (
              <g
                transform={`translate(${glyphOriginX}, ${baselineY}) scale(1, -1)`}
                opacity={contourLayer.opacity}
              >
                {glyph.contours.map((contour) => (
                  <g key={contour.id}>
                    <path
                      d={contour.svgPath}
                      fill={contourLayer.color}
                      fillOpacity="0.9"
                      stroke={contourLayer.color}
                      strokeWidth="1.5"
                      className={
                        contourLayer.isLocked
                          ? 'cursor-default'
                          : 'cursor-pointer hover:fill-opacity-100'
                      }
                    />

                    {/* Nodes if pen or select */}
                    {!contourLayer.isLocked &&
                      activeTool !== 'select' &&
                      contour.points.map((pt) => (
                        <circle
                          key={pt.id}
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill="#E5C690"
                          stroke="#183630"
                          strokeWidth="1.5"
                          className="cursor-move"
                        />
                      ))}
                  </g>
                ))}
              </g>
            )}

            {/* Anchors Layer (Upright text coordinates) */}
            {anchorLayer?.isVisible && (
              <g opacity={anchorLayer.opacity}>
                {glyph.anchors.map((anchor) => {
                  const isSelected = selectedAnchorId === anchor.id;
                  const cx = glyphOriginX + anchor.x;
                  const cy = toSvgY(anchor.y);
                  return (
                    <g
                      key={anchor.id}
                      className={
                        anchorLayer.isLocked ? 'cursor-default' : 'cursor-pointer'
                      }
                      onClick={() => {
                        if (!anchorLayer.isLocked) {
                          setSelectedAnchorId(anchor.id);
                          triggerNotice(`تم تحديد الشاهد: ${anchor.name}`);
                        }
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? '10' : '7'}
                        fill={isSelected ? '#183630' : '#E5C690'}
                        fillOpacity="0.4"
                        stroke="#183630"
                        strokeWidth="1.5"
                      />
                      <circle cx={cx} cy={cy} r="3" fill="#183630" />
                      <text
                        x={cx + 10}
                        y={cy - 8}
                        fill="#183630"
                        fontSize="11"
                        fontFamily="JetBrains Mono"
                        className="select-none font-medium"
                      >
                        {anchor.name} ({anchor.x}, {anchor.y})
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* 3. Floating Modern Bottom Bar with Grouped Tools & Dropdowns */}
      <div className="absolute bottom-3 inset-x-3 sm:bottom-5 sm:inset-x-6 max-w-4xl mx-auto z-50">
        <div className="glass-dropdown rounded-2xl p-2 px-3 sm:px-5 shadow-lg flex items-center justify-between gap-2 relative">
          {/* Group 1: Layers Button */}
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'layers' ? null : 'layers')
              }
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors ${
                activeDropdown === 'layers'
                  ? 'bg-[#183630] text-[#E3DAC9]'
                  : 'text-[#183630] hover:bg-[#E5C690]/35'
              }`}
            >
              <Layers className="h-4 w-4 stroke-[1.5]" />
              <span>الطبقات</span>
              <ChevronDown className="h-3 w-3 stroke-[1.5]" />
            </button>

            {/* Layers Dropdown Popover */}
            {activeDropdown === 'layers' && (
              <div className="absolute bottom-full mb-3 right-0 z-50 w-72 rounded-2xl glass-dropdown p-3.5 shadow-xl border border-[#183630]/20 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#183630]/15">
                  <span className="text-xs font-normal text-[#183630]">
                    طبقات الرسم والهندسة:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(null)}
                    className="p-1 text-[#183630]/60 hover:text-[#183630]"
                  >
                    <X className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {layers.map((layer) => (
                    <div
                      key={layer.id}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
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
                        <span className="text-xs text-[#183630]">{layer.name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleLayerVisibility(layer.id)}
                          className="p-1 rounded-lg hover:bg-[#E5C690]/35 text-[#183630]"
                          title={layer.isVisible ? 'إخفاء' : 'إظهار'}
                        >
                          {layer.isVisible ? (
                            <Eye className="h-3.5 w-3.5 stroke-[1.5]" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 stroke-[1.5]" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleLayerLock(layer.id)}
                          className={`p-1 rounded-lg ${
                            layer.isLocked ? 'bg-[#183630]/15' : 'hover:bg-[#E5C690]/35'
                          } text-[#183630]`}
                          title={layer.isLocked ? 'إلغاء القفل' : 'قفل'}
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
          </div>

          {/* Group 2: Bearings & Dimensions Button */}
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'metrics' ? null : 'metrics')
              }
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors ${
                activeDropdown === 'metrics'
                  ? 'bg-[#183630] text-[#E3DAC9]'
                  : 'text-[#183630] hover:bg-[#E5C690]/35'
              }`}
            >
              <Compass className="h-4 w-4 stroke-[1.5]" />
              <span>العوارض ({glyph.advanceWidth}u)</span>
              <ChevronDown className="h-3 w-3 stroke-[1.5]" />
            </button>

            {/* Metrics Popover */}
            {activeDropdown === 'metrics' && (
              <div className="absolute bottom-full mb-3 right-1/2 translate-x-1/2 z-50 w-72 rounded-2xl glass-dropdown p-4 shadow-xl border border-[#183630]/20 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#183630]/15">
                  <span className="text-xs font-normal text-[#183630]">
                    عوارض المحرف والتباعد الأفقي:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(null)}
                    className="p-1 text-[#183630]/60 hover:text-[#183630]"
                  >
                    <X className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-xl border border-[#183630]/15 bg-[#E5C690]/20">
                    <label className="block text-[10px] text-[#183630]/70">LSB</label>
                    <input
                      type="number"
                      value={glyph.lsb}
                      onChange={(e) =>
                        onUpdateGlyphBearings({ lsb: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full mt-1 bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none"
                    />
                  </div>

                  <div className="p-2 rounded-xl border border-[#183630]/20 bg-[#E3DAC9]">
                    <label className="block text-[10px] text-[#183630]/70">Width</label>
                    <input
                      type="number"
                      value={glyph.advanceWidth}
                      onChange={(e) =>
                        onUpdateGlyphBearings({
                          advanceWidth: parseInt(e.target.value, 10) || 100,
                        })
                      }
                      className="w-full mt-1 bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none"
                    />
                  </div>

                  <div className="p-2 rounded-xl border border-[#183630]/15 bg-[#E5C690]/20">
                    <label className="block text-[10px] text-[#183630]/70">RSB</label>
                    <input
                      type="number"
                      value={glyph.rsb}
                      onChange={(e) =>
                        onUpdateGlyphBearings({ rsb: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full mt-1 bg-transparent border-b border-[#183630]/30 py-0.5 text-xs font-mono font-medium text-[#183630] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Group 3: Anchors Button */}
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'anchors' ? null : 'anchors')
              }
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors ${
                activeDropdown === 'anchors'
                  ? 'bg-[#183630] text-[#E3DAC9]'
                  : 'text-[#183630] hover:bg-[#E5C690]/35'
              }`}
            >
              <Anchor className="h-4 w-4 stroke-[1.5]" />
              <span>الشواهد ({glyph.anchors.length})</span>
              <ChevronDown className="h-3 w-3 stroke-[1.5]" />
            </button>

            {/* Anchors Popover */}
            {activeDropdown === 'anchors' && (
              <div className="absolute bottom-full mb-3 left-0 sm:left-auto sm:right-1/2 sm:translate-x-1/2 z-50 w-72 rounded-2xl glass-dropdown p-4 shadow-xl border border-[#183630]/20 space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#183630]/15">
                  <span className="text-xs font-normal text-[#183630]">
                    شواهد التشكيل ونقاط الاتصال:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(null)}
                    className="p-1 text-[#183630]/60 hover:text-[#183630]"
                  >
                    <X className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                </div>

                <div className="flex gap-1.5">
                  <select
                    value={newAnchorName}
                    onChange={(e) => setNewAnchorName(e.target.value)}
                    className="flex-1 rounded-xl border border-[#183630]/20 bg-transparent px-2.5 py-1 text-xs text-[#183630] focus:outline-none"
                  >
                    <option value="top">شاهد علوي (top)</option>
                    <option value="bottom">شاهد سفلي (bottom)</option>
                    <option value="entry">نقطة دخول (entry)</option>
                    <option value="exit">نقطة خروج (exit)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      onAddAnchor({
                        name: newAnchorName,
                        x: Math.round(glyph.advanceWidth / 2),
                        y: newAnchorName === 'bottom' ? -150 : project.metrics.capHeight + 50,
                      })
                    }
                    className="flex items-center gap-1 rounded-xl bg-[#183630] px-2.5 py-1 text-xs text-[#E3DAC9]"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
                    <span>إضافة</span>
                  </button>
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {glyph.anchors.length === 0 ? (
                    <p className="text-[11px] text-[#183630]/60 text-center py-2">
                      لا توجد نقاط ارتكاز
                    </p>
                  ) : (
                    glyph.anchors.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-[#183630]/15 bg-[#E3DAC9] text-xs"
                      >
                        <span className="font-mono">{a.name} ({a.x}, {a.y})</span>
                        <button
                          type="button"
                          onClick={() => onRemoveAnchor(a.id)}
                          className="p-1 text-[#183630]/50 hover:text-[#183630]"
                        >
                          <Trash2 className="h-3 w-3 stroke-[1.5]" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Group 4: Quick In-Studio Live Proofing */}
          <div className="relative dropdown-container">
            <button
              type="button"
              onClick={() =>
                setActiveDropdown(activeDropdown === 'preview' ? null : 'preview')
              }
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors ${
                activeDropdown === 'preview'
                  ? 'bg-[#183630] text-[#E3DAC9]'
                  : 'text-[#183630] hover:bg-[#E5C690]/35'
              }`}
            >
              <Type className="h-4 w-4 stroke-[1.5]" />
              <span>معاينة نصية</span>
              <ChevronDown className="h-3 w-3 stroke-[1.5]" />
            </button>

            {/* Quick Preview Popover */}
            {activeDropdown === 'preview' && (
              <div className="absolute bottom-full mb-3 left-0 z-50 w-80 rounded-2xl glass-dropdown p-4 shadow-xl border border-[#183630]/20 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#183630]/15">
                  <span className="text-xs font-normal text-[#183630]">
                    معاينة فورية للمحرف وسط الكلمات:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(null)}
                    className="p-1 text-[#183630]/60 hover:text-[#183630]"
                  >
                    <X className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                </div>

                <input
                  type="text"
                  value={quickPreviewText}
                  onChange={(e) => setQuickPreviewText(e.target.value)}
                  className="w-full rounded-xl border border-[#183630]/20 bg-transparent px-3 py-1.5 text-xs text-[#183630] focus:outline-none"
                  placeholder="اكتب لتجربة الحرف..."
                />

                <div className="p-3 rounded-xl border border-[#183630]/15 bg-[#E5C690]/15 text-center min-h-[50px] flex items-center justify-center">
                  <span className="font-heading text-2xl text-[#183630]">
                    {quickPreviewText}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
