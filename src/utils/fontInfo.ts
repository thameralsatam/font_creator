import { type FontInfo, type FontProject } from '../types/font';

/** اسم PostScript: حروف لاتينية وأرقام وشرطة فقط، بحد 63 حرفاً. */
export function safePsName(name: string): string {
  const s = name.replace(/[^A-Za-z0-9-]/g, '').slice(0, 63);
  return s || 'FontStudio';
}

export const SUBFAMILIES = ['Regular', 'Bold', 'Italic', 'Bold Italic', 'Light', 'Medium', 'SemiBold', 'ExtraBold', 'Thin', 'Black'];

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
  if (!f.name.trim()) errors.push('اسم العائلة مطلوب.');
  if (f.info.postScriptName.trim() && !/^[A-Za-z0-9-]{1,63}$/.test(f.info.postScriptName.trim())) {
    errors.push('اسم PostScript حروف لاتينية وأرقام وشرطة فقط، وبحد أقصى 63 حرفاً.');
  }
  if (f.version.trim() && !/^\d+(\.\d+){0,2}$/.test(f.version.trim())) {
    errors.push('الإصدار أرقام تفصلها نقاط، مثل 1.0 أو 2.1.3.');
  }
  for (const [label, v] of [['رابط الترخيص', f.info.licenseUrl], ['رابط المصمم', f.info.designerUrl]] as const) {
    if (v.trim() && !/^https?:\/\/\S+$/i.test(v.trim())) errors.push(`${label} يبدأ بـ http:// أو https://`);
  }
  return errors;
}

/** يستخرج رقم الإصدار من نص مثل "Version 1.002". */
export function parseVersion(raw: string | undefined): string {
  const m = /(\d+(?:\.\d+){0,2})/.exec(raw ?? '');
  return m ? m[1] : '1.0.0';
}
