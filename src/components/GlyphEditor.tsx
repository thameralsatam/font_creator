import React, { useState, useRef } from 'react';
import {
  MousePointer,
  PenTool,
  Ruler,
  Anchor,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Glyph, Layer, FontMetrics, AnchorPoint } from '../types/font';
import { LayerPanel } from './LayerPanel';

interface GlyphEditorProps {
  glyph: Glyph;
  allGlyphs: Glyph[];
  onSelectGlyph: (glyphId: string) => void;
  metrics: FontMetrics;
  layers: Layer[];
  onToggleLayerVisibility: (id: string) => void;
  onToggleLayerLock: (id: string) => void;
  onUpdateGlyphBearings: (changes: { lsb?: number; rsb?: number; advanceWidth?: number }) => void;
  onAddAnchor: (anchor: Omit<AnchorPoint, 'id'>) => void;
  onRemoveAnchor: (anchorId: string) => void;
}

export type ToolMode = 'select' | 'pen' | 'ruler' | 'anchor';

export const GlyphEditor: React.FC<GlyphEditorProps> = ({
  glyph,
  allGlyphs,
  onSelectGlyph,
  metrics,
  layers,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onUpdateGlyphBearings,
  onAddAnchor,
  onRemoveAnchor,
}) => {
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [zoom, setZoom] = useState<number>(0.65);
  const [selectedAnchorId, setSelectedAnchorId] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const contourLayer = layers.find((l) => l.id === 'layer-contours');
  const anchorLayer = layers.find((l) => l.id === 'layer-anchors');
  const metricLayer = layers.find((l) => l.id === 'layer-metrics');
  const gridLayer = layers.find((l) => l.id === 'layer-grid');

  // Navigate between glyphs
  const currentIndex = allGlyphs.findIndex((g) => g.id === glyph.id);
  const handlePrevGlyph = () => {
    if (currentIndex > 0) {
      onSelectGlyph(allGlyphs[currentIndex - 1].id);
    }
  };
  const handleNextGlyph = () => {
    if (currentIndex < allGlyphs.length - 1) {
      onSelectGlyph(allGlyphs[currentIndex + 1].id);
    }
  };

  const showNotification = (msg: string) => {
    setInfoMessage(msg);
    setTimeout(() => setInfoMessage(null), 2500);
  };

  // Dynamic glyph centering inside viewBox
  const viewBoxWidth = 1000;
  const viewBoxHeight = 1200;
  const baselineY = 850;
  const glyphOriginX = Math.round((viewBoxWidth - glyph.advanceWidth) / 2);

  // In font units: Y goes upwards from baseline. In SVG: Y goes downwards.
  const toSvgY = (fontY: number) => baselineY - fontY;

  return (
    <div className="flex flex-col gap-4">
      {/* Editor Sub-header: Quick Glyph Selector & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-[#183630]/15 bg-[#E3DAC9] p-2.5">
        {/* Glyph Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handlePrevGlyph}
            disabled={currentIndex <= 0}
            className="rounded p-1 text-[#183630] transition-colors hover:bg-[#E5C690]/30 disabled:opacity-30"
            title="المحرف السابق"
            aria-label="المحرف السابق"
          >
            <ChevronRight className="h-4 w-4 stroke-[1.5]" />
          </button>

          <div className="flex items-center gap-2 px-1">
            <span className="font-heading text-xl text-[#183630] font-normal min-w-[28px] text-center">
              {glyph.char}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-medium text-[#183630]">
                {glyph.name}
              </span>
              <span className="text-[10px] font-mono text-[#183630]/60">
                {glyph.unicode}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextGlyph}
            disabled={currentIndex >= allGlyphs.length - 1}
            className="rounded p-1 text-[#183630] transition-colors hover:bg-[#E5C690]/30 disabled:opacity-30"
            title="المحرف التالي"
            aria-label="المحرف التالي"
          >
            <ChevronLeft className="h-4 w-4 stroke-[1.5]" />
          </button>

          {/* Quick Glyphs strip */}
          <div className="hidden md:flex items-center gap-1 border-r border-[#183630]/15 pr-3 mr-1">
            {allGlyphs.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onSelectGlyph(g.id)}
                className={`h-7 w-7 rounded text-xs transition-colors font-heading ${
                  g.id === glyph.id
                    ? 'border border-[#183630] bg-[#183630] text-[#E3DAC9]'
                    : 'text-[#183630] hover:bg-[#E5C690]/35 border border-transparent'
                }`}
                title={`${g.char} (${g.name})`}
              >
                {g.char}
              </button>
            ))}
          </div>
        </div>

        {/* Vector Tools */}
        <div className="flex items-center gap-1 rounded border border-[#183630]/15 bg-[#E5C690]/15 p-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveTool('select');
              showNotification('أداة التحديد والتحريك مفعلة');
            }}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-light transition-colors ${
              activeTool === 'select'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/40'
            }`}
            title="أداة التحديد"
            aria-label="أداة التحديد"
          >
            <MousePointer className="h-3.5 w-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">تحديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('pen');
              showNotification('أداة المسارات والمنحنيات');
            }}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-light transition-colors ${
              activeTool === 'pen'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/40'
            }`}
            title="أداة القلم والمنحنيات"
            aria-label="أداة القلم والمنحنيات"
          >
            <PenTool className="h-3.5 w-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">قلم</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('ruler');
              showNotification('أداة القياس بين النقاط');
            }}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-light transition-colors ${
              activeTool === 'ruler'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/40'
            }`}
            title="أداة المسطرة والقياس"
            aria-label="أداة المسطرة والقياس"
          >
            <Ruler className="h-3.5 w-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">مسطرة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTool('anchor');
              showNotification('أداة شواهد الحركات');
            }}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-light transition-colors ${
              activeTool === 'anchor'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/40'
            }`}
            title="شواهد التشكيل"
            aria-label="شواهد التشكيل"
          >
            <Anchor className="h-3.5 w-3.5 stroke-[1.5]" />
            <span className="hidden sm:inline">شاهد</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-xs font-light text-[#183630]">
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
            className="rounded p-1 hover:bg-[#E5C690]/30 transition-colors"
            title="تصغير"
            aria-label="تصغير"
          >
            <ZoomOut className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
          <span className="font-mono text-[11px] w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(1.5, Number((prev + 0.1).toFixed(2))))}
            className="rounded p-1 hover:bg-[#E5C690]/30 transition-colors"
            title="تكبير"
            aria-label="تكبير"
          >
            <ZoomIn className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.65)}
            className="rounded p-1 hover:bg-[#E5C690]/30 transition-colors ml-1 text-[#183630]/70"
            title="إعادة ضبط الحجم"
            aria-label="إعادة ضبط الحجم"
          >
            <RotateCcw className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
        </div>
      </div>

      {/* Main Workspace: Canvas + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* SVG Drawing Canvas Area */}
        <div className="lg:col-span-3 flex flex-col rounded-md border border-[#183630]/20 bg-[#E3DAC9] overflow-hidden relative shadow-xs">
          {/* Subtle status notice */}
          {infoMessage && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded border border-[#183630]/25 bg-[#E3DAC9] px-3 py-1.5 text-xs text-[#183630] shadow-sm">
              <Info className="h-3.5 w-3.5 stroke-[1.5] text-[#183630]" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Coordinate Canvas */}
          <div className="w-full h-[520px] overflow-auto flex items-center justify-center p-4 bg-[#E3DAC9]/60 select-none">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
              className="border border-[#183630]/15 bg-[#E3DAC9] shadow-xs"
            >
              <svg
                width={viewBoxWidth}
                height={viewBoxHeight}
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                className="overflow-visible"
              >
                <defs>
                  {/* Subtle Grid Pattern for layer-grid */}
                  <pattern
                    id="metric-grid"
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

                {/* 1. Metric Grid Layer */}
                {gridLayer?.isVisible && (
                  <rect
                    width={viewBoxWidth}
                    height={viewBoxHeight}
                    fill="url(#metric-grid)"
                    opacity={gridLayer.opacity}
                  />
                )}

                {/* 2. Metrics & Guidelines Layer */}
                {metricLayer?.isVisible && (
                  <g opacity={metricLayer.opacity}>
                    {/* Ascender line */}
                    <line
                      x1="0"
                      y1={toSvgY(metrics.ascender)}
                      x2={viewBoxWidth}
                      y2={toSvgY(metrics.ascender)}
                      stroke="#183630"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x="20"
                      y={toSvgY(metrics.ascender) - 6}
                      fill="#183630"
                      fontSize="12"
                      fontFamily="JetBrains Mono"
                      className="font-light"
                    >
                      الصاعد Ascender ({metrics.ascender})
                    </text>

                    {/* Cap Height line */}
                    <line
                      x1="0"
                      y1={toSvgY(metrics.capHeight)}
                      x2={viewBoxWidth}
                      y2={toSvgY(metrics.capHeight)}
                      stroke="#183630"
                      strokeDasharray="2 3"
                      strokeWidth="0.8"
                    />
                    <text
                      x="20"
                      y={toSvgY(metrics.capHeight) - 6}
                      fill="#183630"
                      fontSize="11"
                      fontFamily="JetBrains Mono"
                      className="font-light"
                    >
                      التاج Cap Height ({metrics.capHeight})
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
                      y1={toSvgY(metrics.descender)}
                      x2={viewBoxWidth}
                      y2={toSvgY(metrics.descender)}
                      stroke="#183630"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x="20"
                      y={toSvgY(metrics.descender) + 16}
                      fill="#183630"
                      fontSize="12"
                      fontFamily="JetBrains Mono"
                      className="font-light"
                    >
                      الهابط Descender ({metrics.descender})
                    </text>

                    {/* Left Bearing (LSB) Guide line */}
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

                    {/* Advance Width Boundary Line */}
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

                {/* 3. Base Glyph Contour Layer */}
                {contourLayer?.isVisible && (
                  <g
                    transform={`translate(${glyphOriginX}, ${baselineY}) scale(1, -1)`}
                    opacity={contourLayer.opacity}
                  >
                    {glyph.contours.map((contour) => (
                      <g key={contour.id}>
                        {/* Contour outline path */}
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

                        {/* If in edit/pen mode and layer is not locked: show contour anchor nodes */}
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

                {/* 4. Diacritic Anchors Layer (Rendered in normal coordinates for crisp upright text) */}
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
                            anchorLayer.isLocked
                              ? 'cursor-default'
                              : 'cursor-pointer'
                          }
                          onClick={() => {
                            if (!anchorLayer.isLocked) {
                              setSelectedAnchorId(anchor.id);
                              showNotification(`تم تحديد الشاهد: ${anchor.name}`);
                            }
                          }}
                        >
                          {/* Outer anchor halo */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isSelected ? '10' : '7'}
                            fill={isSelected ? '#183630' : '#E5C690'}
                            fillOpacity="0.4"
                            stroke="#183630"
                            strokeWidth="1.5"
                          />
                          {/* Anchor core */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r="3"
                            fill="#183630"
                          />
                          {/* Anchor text label (rendered naturally upright) */}
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

          {/* Canvas Bottom Information Strip */}
          <div className="flex flex-wrap items-center justify-between border-t border-[#183630]/15 bg-[#E5C690]/20 px-3 py-2 text-xs font-light text-[#183630]">
            <div className="flex items-center gap-3">
              <span>
                رمز المحرف: <strong className="font-mono">{glyph.unicode}</strong>
              </span>
              <span>
                المسارات: <strong className="font-mono">{glyph.contours.length}</strong>
              </span>
              <span>
                شواهد الحركات: <strong className="font-mono">{glyph.anchors.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-extralight text-[#183630]/80">
              {contourLayer?.isLocked && (
                <span className="rounded bg-[#183630]/10 px-1.5 py-0.5">
                  طبقة المسار مقفلة
                </span>
              )}
              <span>{glyph.notes || 'جاهز للتحرير والإنتاج'}</span>
            </div>
          </div>
        </div>

        {/* Side Panel: Layer & Metrics Control */}
        <div className="lg:col-span-1">
          <LayerPanel
            layers={layers}
            onToggleVisibility={onToggleLayerVisibility}
            onToggleLock={onToggleLayerLock}
            glyph={glyph}
            metrics={metrics}
            onUpdateBearings={onUpdateGlyphBearings}
            onAddAnchor={onAddAnchor}
            onRemoveAnchor={onRemoveAnchor}
          />
        </div>
      </div>
    </div>
  );
};
