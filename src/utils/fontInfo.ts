import { type FontInfo, type FontProject } from '../types/font';
import { t } from '../i18n';

/** اسم PostScript: حروف لاتينية وأرقام وشرطة فقط، بحد 63 حرفاً. */
export function safePsName(name: string): string {
  const s = name.replace(/[^A-Za-z0-9-]/g, '').slice(0, 63);
  return s || 'FontStudio';
}

/**
 * تصنيف صريح لكل نمط: الوزن (usWeightClass) وعلامتا BOLD وITALIC في fsSelection.
 * علامة BOLD لنمطي Bold وBold Italic فقط؛ الأوزان الأخرى (Light وBlack…) ليست عريضة بمعنى RIBBI.
 */
export const SUBFAMILY_STYLES = {
  Regular: { weight: 400, bold: false, italic: false },
  Bold: { weight: 700, bold: true, italic: false },
  Italic: { weight: 400, bold: false, italic: true },
  'Bold Italic': { weight: 700, bold: true, italic: true },
  Light: { weight: 300, bold: false, italic: false },
  Medium: { weight: 500, bold: false, italic: false },
  SemiBold: { weight: 600, bold: false, italic: false },
  ExtraBold: { weight: 800, bold: false, italic: false },
  Thin: { weight: 100, bold: false, italic: false },
  Black: { weight: 900, bold: false, italic: false },
} as const;

export type KnownSubfamily = keyof typeof SUBFAMILY_STYLES;
export const SUBFAMILIES = Object.keys(SUBFAMILY_STYLES) as KnownSubfamily[];

/** تصنيف النمط، أو null إن كان اسماً حراً لا يطابق أحد الأنماط المعروفة (بلا تخمين). */
export function styleOf(subfamily: string): (typeof SUBFAMILY_STYLES)[KnownSubfamily] | null {
  const key = subfamily.trim().toLowerCase();
  const hit = SUBFAMILIES.find((s) => s.toLowerCase() === key);
  return hit ? SUBFAMILY_STYLES[hit] : null;
}

export const EMPTY_INFO: FontInfo = {
  subfamily: 'Regular',
  fullName: '',
  postScriptName: '',
  copyright: '',
  license: '',
  licenseUrl: '',
  manufacturer: '',
  designerUrl: '',
};

export function infoOf(p: Pick<FontProject, 'info'>): FontInfo {
  return { ...EMPTY_INFO, ...p.info };
}

export interface ResolvedInfo extends FontInfo {
  family: string;
  version: string;
  designer: string;
  description: string;
}

/** كل المعلومات بعد ملء الفارغ تلقائياً: الاسم الكامل واسم PostScript. */
export function resolveInfo(p: FontProject): ResolvedInfo {
  const i = infoOf(p);
  const family = p.name.trim() || 'Font Studio';
  const subfamily = i.subfamily.trim() || 'Regular';
  return {
    ...i,
    family,
    subfamily,
    fullName: i.fullName.trim() || `${family} ${subfamily}`,
    postScriptName: i.postScriptName.trim() || `${safePsName(family)}-${safePsName(subfamily)}`,
    version: p.version.trim() || '1.0.0',
    designer: p.designer.trim(),
    description: p.description.trim(),
  };
}

export interface InfoForm {
  name: string;
  version: string;
  info: FontInfo;
}

/** أخطاء بالعربية، أو قائمة فارغة إن كانت القيم صالحة. */
export function validateInfo(f: InfoForm): string[] {
  const errors: string[] = [];
  if (!f.name.trim()) errors.push(t('اسم العائلة مطلوب.'));
  if (f.info.postScriptName.trim() && !/^[A-Za-z0-9-]{1,63}$/.test(f.info.postScriptName.trim())) {
    errors.push(t('اسم PostScript حروف لاتينية وأرقام وشرطة فقط، وبحد أقصى 63 حرفاً.'));
  }
  if (f.version.trim() && !/^\d+(\.\d+){0,2}$/.test(f.version.trim())) {
    errors.push(t('الإصدار أرقام تفصلها نقاط، مثل 1.0 أو 2.1.3.'));
  }
  for (const [label, v] of [[t('رابط الترخيص'), f.info.licenseUrl], [t('رابط المصمم'), f.info.designerUrl]] as const) {
    if (v.trim() && !/^https?:\/\/\S+$/i.test(v.trim())) errors.push(t('{label} يبدأ بـ http:// أو https://', { label }));
  }
  return errors;
}

/** يستخرج رقم الإصدار من نص مثل "Version 1.002". */
export function parseVersion(raw: string | undefined): string {
  const m = /(\d+(?:\.\d+){0,2})/.exec(raw ?? '');
  return m ? m[1] : '1.0.0';
}
