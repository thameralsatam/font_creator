import React, { useMemo, useState } from 'react';
import { AlertTriangle, Download, Type } from 'lucide-react';
import { type FontProject } from '../types/font';
import { downloadBlob } from '../utils/download';
import { buildFontBuffer, checkProject, fontFileName } from '../utils/fontBuild';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ExportModalProps {
  isOpen?: boolean;
  onClose: () => void;
  project: FontProject;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, project }) => {
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const report = useMemo(() => checkProject(project), [project]);
  const fileName = useMemo(() => fontFileName(project), [project]);

  const downloadFont = async () => {
    setBuilding(true);
    setBuildError(null);
    try {
      const buf = await buildFontBuffer(project);
      downloadBlob(new Blob([buf], { type: 'font/otf' }), fileName);
      onClose();
    } catch {
      setBuildError('تعذّر بناء ملف الخط. راجع المحارف وحاول من جديد.');
    } finally {
      setBuilding(false);
    }
  };

  const hasErrors = report.errors.length > 0;

  return (
    <Modal
      title="تصدير الخط"
      icon={<Download className="h-4 w-4 stroke-[1.5]" />}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* بطاقة معلومات الملف */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/20 bg-sand/30 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink/20 bg-paper">
              <Type className="h-5 w-5 stroke-[1.5]" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-mono text-sm font-bold text-ink">{fileName}</h3>
              <p className="text-xs text-ink-soft">
                ملف خط OpenType حقيقي (OTF) جاهز للتثبيت والاستعمال في أي برنامج
              </p>
            </div>
          </div>
        </div>

        {/* تنبيهات وأخطاء الفحص */}
        {(hasErrors || report.warnings.length > 0 || buildError) && (
          <div role="alert" className="space-y-2 rounded-2xl border border-ink/20 bg-paper p-3.5 text-xs leading-relaxed">
            {[...report.errors, ...(buildError ? [buildError] : [])].map((t) => (
              <p key={t} className="flex items-start gap-2 text-rose-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                <span>{t}</span>
              </p>
            ))}
            {report.warnings.map((t) => (
              <p key={t} className="flex items-start gap-2 text-ink-soft">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
                <span>{t}</span>
              </p>
            ))}
          </div>
        )}

        {/* زر التصدير */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="quiet" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            disabled={building || hasErrors}
            onClick={downloadFont}
          >
            <Download className="h-4 w-4 stroke-[1.5]" />
            <span>{building ? 'جارٍ بناء الخط...' : 'تصدير الخط'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
