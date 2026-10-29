import { Glyph, Layer, FontProject, FontMetrics } from '../types/font';

/**
 * Toggles visibility for a specific layer.
 */
export function toggleLayerVisibility(layers: Layer[], layerId: string): Layer[] {
  return layers.map((layer) =>
    layer.id === layerId ? { ...layer, isVisible: !layer.isVisible } : layer
  );
}

/**
 * Toggles locked status for a specific layer.
 */
export function toggleLayerLock(layers: Layer[], layerId: string): Layer[] {
  return layers.map((layer) =>
    layer.id === layerId ? { ...layer, isLocked: !layer.isLocked } : layer
  );
}

/**
 * Updates a layer's opacity between 0.1 and 1.0.
 */
export function updateLayerOpacity(layers: Layer[], layerId: string, opacity: number): Layer[] {
  const clamped = Math.max(0.1, Math.min(1.0, opacity));
  return layers.map((layer) =>
    layer.id === layerId ? { ...layer, opacity: clamped } : layer
  );
}

/**
 * Updates sidebearings (LSB or RSB) and computes total advance width.
 */
export function updateGlyphBearings(
  glyph: Glyph,
  changes: { lsb?: number; rsb?: number; advanceWidth?: number }
): Glyph {
  const newLsb = changes.lsb !== undefined ? Math.max(0, changes.lsb) : glyph.lsb;
  const newRsb = changes.rsb !== undefined ? Math.max(0, changes.rsb) : glyph.rsb;
  const newAdvance = changes.advanceWidth !== undefined
    ? Math.max(50, changes.advanceWidth)
    : Math.max(50, glyph.advanceWidth + (newLsb - glyph.lsb) + (newRsb - glyph.rsb));

  return {
    ...glyph,
    lsb: newLsb,
    rsb: newRsb,
    advanceWidth: newAdvance,
  };
}

/**
 * Formats OpenType FEA file content for Adobe / AFDKO font compilers.
 */
export function generateOpenTypeFea(project: FontProject): string {
  const header = `# --------------------------------------------------
# OpenType Feature File
# Font: ${project.name}
# Designer: ${project.designer || 'Font Foundry Studio'}
# Version: ${project.version}
# UPM: ${project.metrics.upm}
# Generated: ${new Date().toISOString().split('T')[0]}
# --------------------------------------------------

languagesystem DFLT dflt;
languagesystem arab dflt;
languagesystem latn dflt;

`;

  const features = project.features
    .filter((f) => f.enabled)
    .map((f) => {
      return `feature ${f.tag} {
    # ${f.name}
${f.code.split('\n').map((line) => `    ${line}`).join('\n')}
} ${f.tag};`;
    })
    .join('\n\n');

  return header + features;
}

/**
 * Validates font metrics consistency (Ascender > CapHeight > Baseline > Descender).
 */
export function validateMetrics(metrics: FontMetrics): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (metrics.upm < 100 || metrics.upm > 4096) {
    errors.push('مقياس UPM يجب أن يكون بين 100 و 4096 وحدة.');
  }
  if (metrics.ascender <= metrics.baseline) {
    errors.push('ارتفاع الصاعد (Ascender) يجب أن يكون أعلى من خط الأساس (0).');
  }
  if (metrics.descender >= metrics.baseline) {
    errors.push('عمق الهابط (Descender) يجب أن يكون قيمة سالبة تحت خط الأساس.');
  }
  if (metrics.capHeight > metrics.ascender) {
    errors.push('ارتفاع الحروف الكبيرة لا يتجاوز الصاعد.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Renames an existing font project in the collection.
 */
export function renameProject(projects: FontProject[], projectId: string, newName: string): FontProject[] {
  const trimmed = newName.trim();
  if (!trimmed) return projects;
  return projects.map((p) =>
    p.id === projectId
      ? { ...p, name: trimmed, updatedAt: new Date().toISOString() }
      : p
  );
}

/**
 * Deletes a project from the collection.
 */
export function deleteProject(projects: FontProject[], projectId: string): FontProject[] {
  return projects.filter((p) => p.id !== projectId);
}

/**
 * Duplicates a project with a new ID and updated title.
 */
export function duplicateProject(projects: FontProject[], projectId: string): FontProject[] {
  const target = projects.find((p) => p.id === projectId);
  if (!target) return projects;

  const copy: FontProject = {
    ...target,
    id: `project-${Date.now()}`,
    name: `${target.name} (نسخة)`,
    updatedAt: new Date().toISOString(),
  };

  return [copy, ...projects];
}

/**
 * Exports font project metadata to clean JSON format.
 */
export function exportProjectJSON(project: FontProject): string {
  return JSON.stringify(project, null, 2);
}
