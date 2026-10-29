import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toggleLayerVisibility,
  toggleLayerLock,
  updateLayerOpacity,
  updateGlyphBearings,
  validateMetrics,
  generateOpenTypeFea,
  renameProject,
  deleteProject,
  duplicateProject,
} from './fontLogic';
import { Layer, Glyph, FontProject } from '../types/font';

test('layer visibility toggling works accurately', () => {
  const layers: Layer[] = [
    { id: 'l1', name: 'Contour', description: 'desc', isVisible: true, isLocked: false, color: '#183630', opacity: 1 },
    { id: 'l2', name: 'Guides', description: 'desc', isVisible: false, isLocked: false, color: '#E5C690', opacity: 1 },
  ];

  const updated = toggleLayerVisibility(layers, 'l1');
  assert.equal(updated[0].isVisible, false);
  assert.equal(updated[1].isVisible, false);

  const toggledBack = toggleLayerVisibility(updated, 'l1');
  assert.equal(toggledBack[0].isVisible, true);
});

test('layer lock toggling preserves other layer properties', () => {
  const layers: Layer[] = [
    { id: 'l1', name: 'Contour', description: 'desc', isVisible: true, isLocked: false, color: '#183630', opacity: 0.8 },
  ];

  const locked = toggleLayerLock(layers, 'l1');
  assert.equal(locked[0].isLocked, true);
  assert.equal(locked[0].opacity, 0.8);
  assert.equal(locked[0].name, 'Contour');
});

test('opacity clamps between 0.1 and 1.0', () => {
  const layers: Layer[] = [
    { id: 'l1', name: 'Contour', description: 'desc', isVisible: true, isLocked: false, color: '#183630', opacity: 1 },
  ];

  const overClamped = updateLayerOpacity(layers, 'l1', 1.5);
  assert.equal(overClamped[0].opacity, 1.0);

  const underClamped = updateLayerOpacity(layers, 'l1', -0.2);
  assert.equal(underClamped[0].opacity, 0.1);
});

test('glyph bearings update correctly', () => {
  const sampleGlyph: Glyph = {
    id: 'alif',
    name: 'alif',
    unicode: 'U+0627',
    char: 'ا',
    category: 'letter',
    advanceWidth: 320,
    lsb: 60,
    rsb: 60,
    contours: [],
    anchors: [],
  };

  const updated = updateGlyphBearings(sampleGlyph, { lsb: 80 });
  assert.equal(updated.lsb, 80);
  assert.equal(updated.rsb, 60);
  assert.equal(updated.advanceWidth, 340);
});

test('font metrics validation detects valid and invalid configurations', () => {
  const validMetrics = {
    upm: 1000,
    ascender: 800,
    capHeight: 700,
    xHeight: 500,
    baseline: 0,
    descender: -200,
  };
  assert.equal(validateMetrics(validMetrics).isValid, true);

  const invalidMetrics = {
    upm: 50, // too small
    ascender: -100, // below baseline
    capHeight: 700,
    xHeight: 500,
    baseline: 0,
    descender: 50, // above baseline
  };
  const result = validateMetrics(invalidMetrics);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.length >= 3);
});

test('generateOpenTypeFea produces clean feature file syntax', () => {
  const mockProject: FontProject = {
    id: 'p1',
    name: 'Tareeq',
    designer: 'Type Designer',
    version: '1.0',
    metrics: { upm: 1000, ascender: 800, capHeight: 700, xHeight: 500, baseline: 0, descender: -200 },
    glyphs: [],
    layers: [],
    features: [
      {
        tag: 'init',
        name: 'Initial Forms',
        enabled: true,
        code: 'sub uni0628 by uni0628.init;',
      },
      {
        tag: 'liga',
        name: 'Standard Ligatures',
        enabled: false,
        code: 'sub uni0644 uni0627 by uniFEFB;',
      },
    ],
  };

  const fea = generateOpenTypeFea(mockProject);
  assert.ok(fea.includes('languagesystem arab dflt;'));
  assert.ok(fea.includes('feature init {'));
  assert.ok(fea.includes('sub uni0628 by uni0628.init;'));
  // Disabled feature 'liga' should not be present
  assert.ok(!fea.includes('feature liga'));
});

test('renameProject updates project name accurately', () => {
  const projects: FontProject[] = [
    { id: '1', name: 'خط أ', designer: 'x', version: '1', metrics: {} as any, glyphs: [], layers: [], features: [] },
    { id: '2', name: 'خط ب', designer: 'x', version: '1', metrics: {} as any, glyphs: [], layers: [], features: [] },
  ];

  const renamed = renameProject(projects, '1', 'خط رقيم');
  assert.equal(renamed[0].name, 'خط رقيم');
  assert.equal(renamed[1].name, 'خط ب');
});

test('deleteProject removes specified project while preserving others', () => {
  const projects: FontProject[] = [
    { id: '1', name: 'خط أ', designer: 'x', version: '1', metrics: {} as any, glyphs: [], layers: [], features: [] },
    { id: '2', name: 'خط ب', designer: 'x', version: '1', metrics: {} as any, glyphs: [], layers: [], features: [] },
  ];

  const deleted = deleteProject(projects, '1');
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].id, '2');

  const empty = deleteProject(deleted, '2');
  assert.equal(empty.length, 0);
});

test('duplicateProject creates an independent copy with (نسخة) suffix', () => {
  const projects: FontProject[] = [
    { id: '1', name: 'خط أندلسي', designer: 'x', version: '1', metrics: {} as any, glyphs: [], layers: [], features: [] },
  ];

  const duplicated = duplicateProject(projects, '1');
  assert.equal(duplicated.length, 2);
  assert.equal(duplicated[0].name, 'خط أندلسي (نسخة)');
  assert.notEqual(duplicated[0].id, '1');
});

