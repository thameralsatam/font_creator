import { type FontMetrics, type FontProject, type Glyph, type NewGlyphData } from '../types/font';

export const DEFAULT_METRICS: FontMetrics = {
  upm: 1000,
  ascender: 800,
  capHeight: 700,
  xHeight: 500,
  descender: -200,
};

/** معرّف فريد. لا يتكرر حتى لو أُنشئ أكثر من عنصر في نفس الجزء من الثانية. */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createProject(
  name: string,
  designer: string,
  description: string
): FontProject {
  const now = new Date().toISOString();
  return {
    id: uid('font'),
    name: name.trim(),
    designer: designer.trim() || 'المصمم',
    version: '1.0.0',
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
    metrics: { ...DEFAULT_METRICS },
    glyphs: [],
    features: [],
  };
}

export function createGlyph(data: NewGlyphData): Glyph {
  return {
    id: uid('glyph'),
    char: data.char,
    name: data.name,
    unicode: data.unicode,
    category: data.category,
    form: 'isolated',
    advanceWidth: data.advanceWidth ?? 500,
    contours: [],
    anchors: [],
  };
}

/** اسم المحرف المقترح بحسب نقطة اليونيكود، مثل uni0628. */
export function defaultGlyphName(char: string): string {
  const cp = Array.from(char)[0]?.codePointAt(0);
  if (cp === undefined) return '';
  return `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

export function defaultUnicode(char: string): string {
  const cp = Array.from(char)[0]?.codePointAt(0);
  if (cp === undefined) return '';
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** يعيد نص الخطأ بالعربية، أو null إذا كانت البيانات صالحة. */
export function validateNewGlyph(
  existing: Glyph[],
  data: NewGlyphData
): string | null {
  // الفراغ محرف صالح، فلا نرفض النص المكوّن من مسافة فقط
  if (!data.char) return 'اكتب المحرف أو الرمز.';
  if (!/^[A-Za-z_][A-Za-z0-9._-]*$/.test(data.name)) {
    return 'اسم المحرف يبدأ بحرف لاتيني ويحوي حروفاً لاتينية وأرقاماً ونقطة وشرطة فقط.';
  }
  if (data.unicode && !/^U\+[0-9A-F]{4,6}$/i.test(data.unicode)) {
    return 'صيغة اليونيكود غير صحيحة. مثال صحيح: U+0628';
  }
  if (existing.some((g) => g.name === data.name)) {
    return 'يوجد محرف بنفس الاسم في هذا المشروع.';
  }
  if (
    data.unicode &&
    existing.some((g) => g.unicode.toUpperCase() === data.unicode.toUpperCase())
  ) {
    return 'يوجد محرف بنفس نقطة اليونيكود في هذا المشروع.';
  }
  return null;
}

/** تحقق من تناسق المقاييس. خط الأساس ثابت عند 0. */
export function validateMetrics(metrics: FontMetrics): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (metrics.upm < 100 || metrics.upm > 4096) {
    errors.push('مقياس UPM يجب أن يكون بين 100 و 4096 وحدة.');
  }
  if (metrics.ascender <= 0) {
    errors.push('ارتفاع الصاعد يجب أن يكون أعلى من خط الأساس.');
  }
  if (metrics.descender >= 0) {
    errors.push('عمق الهابط يجب أن يكون قيمة سالبة تحت خط الأساس.');
  }
  if (metrics.capHeight > metrics.ascender) {
    errors.push('ارتفاع الحروف الكبيرة لا يتجاوز الصاعد.');
  }
  if (metrics.xHeight > metrics.capHeight) {
    errors.push('ارتفاع الحروف الصغيرة لا يتجاوز ارتفاع الحروف الكبيرة.');
  }

  return { isValid: errors.length === 0, errors };
}

export function renameProject(
  projects: FontProject[],
  projectId: string,
  newName: string
): FontProject[] {
  const trimmed = newName.trim();
  if (!trimmed) return projects;
  return projects.map((p) =>
    p.id === projectId
      ? { ...p, name: trimmed, updatedAt: new Date().toISOString() }
      : p
  );
}

export function deleteProject(
  projects: FontProject[],
  projectId: string
): FontProject[] {
  return projects.filter((p) => p.id !== projectId);
}

/** نسخة مستقلة تماماً: معرّف جديد ونسخة عميقة من كل البيانات. */
export function duplicateProject(
  projects: FontProject[],
  projectId: string
): FontProject[] {
  const target = projects.find((p) => p.id === projectId);
  if (!target) return projects;

  const now = new Date().toISOString();
  const copy: FontProject = {
    ...structuredClone(target),
    id: uid('font'),
    name: `${target.name} (نسخة)`,
    createdAt: now,
    updatedAt: now,
  };

  return [copy, ...projects];
}

/** يطبّق تعديلاً على مشروع واحد ويحدّث تاريخ التعديل. */
export function updateProjectById(
  projects: FontProject[],
  projectId: string,
  updater: (project: FontProject) => FontProject
): FontProject[] {
  return projects.map((p) =>
    p.id === projectId
      ? { ...updater(p), updatedAt: new Date().toISOString() }
      : p
  );
}

/** يصيغ ملف ميزات الأوبن تايب (FEA) لمترجمات الخطوط. */
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

export function exportProjectJSON(project: FontProject): string {
  return JSON.stringify(project, null, 2);
}
