import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { type FontProject } from '../types/font';
import { importFontBuffer } from '../utils/fontBuild';
import { t, tn } from '../i18n';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

const MAX_BYTES = 8 * 1024 * 1024;

/** استيراد خط OTF أو TTF كمشروع جديد. */
export const ImportFontButton: React.FC<{ onImport: (project: FontProject) => void; iconOnly?: boolean }> = ({
  onImport,
  iconOnly = false,
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ title: string; lines: string[] } | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setResult({ title: t('ملف كبير'), lines: [t('حجم الملف أكبر من 8 ميغابايت، وهو أكبر مما يتسع له التخزين المحلي.')] });
      return;
    }
    setBusy(true);
    try {
      const r = await importFontBuffer(await file.arrayBuffer(), file.name);
      if (r.imported === 0) {
        setResult({ title: t('لم يُستورد شيء'), lines: [t('لا توجد محارف صالحة في هذا الخط.'), ...r.notes] });
      } else {
        onImport(r.project);
        setResult({ title: tn(r.imported, 'تم استيراد {n} محرف', { one: '{n} Glyphe importiert', other: '{n} Glyphen importiert' }), lines: r.notes });
      }
    } catch (e) {
      setResult({ title: t('تعذّر الاستيراد'), lines: [e instanceof Error ? e.message : t('خطأ غير معروف.')] });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".otf,.ttf,.woff,.woff2"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      <Button
        icon={iconOnly}
        title={busy ? t('جارٍ قراءة الخط') : t('استيراد خط OTF أو TTF كمشروع جديد')}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload className="h-3.5 w-3.5 stroke-[1.5]" />
        {!iconOnly && <span>{busy ? t('جارٍ القراءة') : t('استيراد خط')}</span>}
      </Button>
      {result && (
        <Modal title={result.title} size="sm" onClose={() => setResult(null)}>
          <ul className="space-y-1.5 text-xs leading-6 text-ink-soft">
            {result.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <ModalActions>
            <Button variant="primary" onClick={() => setResult(null)}>{t('حسناً')}</Button>
          </ModalActions>
        </Modal>
      )}
    </>
  );
};
