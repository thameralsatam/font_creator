import { Languages } from 'lucide-react';
import { getLang, switchLang, t } from '../../i18n';
import { Button } from './Button';

/** زر تبديل اللغة: يعرض اسم اللغة الأخرى بلغتها هي، فيفهمه من لا يقرأ الحالية. */
export function LangButton() {
  const next = getLang() === 'ar' ? 'de' : 'ar';
  return (
    <Button
      variant="secondary"
      title={t('تغيير اللغة')}
      onClick={() => switchLang(next)}
      className="gap-1.5"
    >
      <Languages className="h-4 w-4 stroke-[1.5]" />
      {/* i18n-keep: اسما اللغتين ثابتان */}
      <span lang={next}>{next === 'de' ? 'Deutsch' : 'العربية'}</span>
    </Button>
  );
}
