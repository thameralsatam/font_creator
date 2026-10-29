export interface Layer {
  id: string;
  name: string;
  description: string;
  isVisible: boolean;
  isLocked: boolean;
  color: string;
  opacity: number;
}

export interface AnchorPoint {
  id: string;
  name: string; // e.g., 'top', 'bottom', 'entry', 'exit'
  x: number;
  y: number;
}

export interface GlyphPoint {
  id: string;
  x: number;
  y: number;
  type: 'move' | 'line' | 'curve';
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
}

export interface GlyphContour {
  id: string;
  points: GlyphPoint[];
  closed: boolean;
  svgPath: string;
}

export interface Glyph {
  id: string;
  name: string;
  unicode: string;
  char: string;
  category: 'letter' | 'diacritic' | 'number' | 'symbol' | 'ligature';
  advanceWidth: number;
  lsb: number; // Left Sidebearing
  rsb: number; // Right Sidebearing
  contours: GlyphContour[];
  anchors: AnchorPoint[];
  position?: 'isolated' | 'initial' | 'medial' | 'final';
  notes?: string;
}

export interface FontMetrics {
  upm: number; // Units Per EM (e.g., 1000)
  ascender: number; // e.g., 800
  capHeight: number; // e.g., 700
  xHeight: number; // e.g., 500
  baseline: number; // 0
  descender: number; // e.g., -200
}

export interface OpenTypeFeature {
  tag: string; // e.g., 'init', 'medi', 'fina', 'liga', 'kern'
  name: string;
  enabled: boolean;
  code: string;
}

export interface FontProject {
  id: string;
  name: string;
  designer: string;
  version: string;
  description?: string;
  updatedAt?: string;
  metrics: FontMetrics;
  glyphs: Glyph[];
  layers: Layer[];
  features: OpenTypeFeature[];
}
