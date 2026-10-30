/** ينزّل نصاً كملف. اسم الملف يُنظَّف من الفراغات والرموز غير المسموحة. */
export function downloadTextFile(content: string, filename: string, mime: string): void {
  const safeName = filename.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** ينسخ نصاً إلى الحافظة. يعيد false إن لم يكن النسخ متاحاً. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
