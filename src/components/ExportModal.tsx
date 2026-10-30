import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, FileCode, FileJson, Type } from 'lucide-react';
import { type FontProject } from '../types/font';
import { exportProjectJSON, generateOpenTypeFea } from '../utils/fontLogic';
import { copyText, downloadBlob, downloadTextFile } from '../utils/download';
import { buildFontBuffer, checkProject, safePsName } from '../utils/fontBuild';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FontProject;
}

export const ExportModal: React.FC<ExportModalProps> = ({ onClose, project }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const report = useMemo(() => checkProject(project), [project]);

  const downloadFont = async () => {
    setBuilding(true);
    setBuildError(null);
    try {
      const buf = await buildFontBuffer(project);
      downloadBlob(new Blob([buf], { type: 'font/otf' }), `${safePsName(project.name)}-Regular.otf`);
    } catch {
      setBuildError('تعذّر بناء ملف الخط. راجع المحارف وحاول من جديد.');
    } finally {
      setBuilding(false);
    }
  };

  const items = [
    {
      id: 'fea',
      icon: <FileCode className="h-5 w-5 stroke-[1.5]" />,
      title: 'features.fea',
      description: 'قواعد تبديل الأشكال والتراكيب لمترجمات الخطوط',
      content: () => generateOpenTypeFea(project),
      filename: `${project.name}.fea`,
      mime: 'text/plain;charset=utf-8',
    },
    {
      id: 'json',
      icon: <FileJson className="h-5 w-5 stroke-[1.5]" />,
      title: 'font_project.json',
      description: 'نسخة احتياطية كاملة من المشروع بمساراته ومقاييسه',
      content: () => exportProjectJSON(project),
      filename: `${project.name}_project.json`,
      mime: 'application/json;charset=utf-8',
    },
  ];

  const handleCopy = async (id: string, text: string) => {
    const ok = await copyText(text);
    setCopyFailed(!ok);
    if (ok) {
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    }
  };

  return (
    <Modal
      title="تصدير ملفات الخط"
      icon={<Download className="h-4 w-4 stroke-[1.5]" />}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink/30 bg-sand/30 p-3.5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5"><Type className="h-5 w-5 stroke-[1.5]" /></span>
            <div className="min-w-0">
              <h3 className="truncate font-mono text-xs">{safePsName(project.name)}-Regular.otf</h3>
              <p className="text-[11px] leading-relaxed text-ink-soft">
                ملف الخط الحقيقي، يُثبَّت ويُستعمل في أي برنامج
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            title="بناء الخط وتحميله"
            disabled={building || report.errors.length > 0}
            onClick={downloadFont}
          >
            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
            <span>{building ? 'جارٍ البناء' : 'تحميل'}</span>
          </Button>
        </div>

        {(report.errors.length > 0 || report.warnings.length > 0 || buildError) && (
          <div role="alert" className="space-y-1.5 rounded-2xl border border-ink/20 bg-paper p-3 text-xs leading-6">
            {[...report.errors, ...(buildError ? [buildError] : [])].map((t) => (
              <p key={t} className="flex gap-2"><AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />{t}</p>
            ))}
            {report.warnings.map((t) => (
              <p key={t} className="flex gap-2 text-ink-soft"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />{t}</p>
            ))}
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-ink/20 bg-sand/15 p-3.5"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5">{item.icon}</span>
              <div className="min-w-0">
                <h3 className="truncate font-mono text-xs">{item.title}</h3>
                <p className="text-[11px] leading-relaxed text-ink-soft">{item.description}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="secondary"
                icon
                title="نسخ المحتوى"
                onClick={() => handleCopy(item.id, item.content())}
              >
                {copied === item.id ? (
                  <Check className="h-3.5 w-3.5 stroke-[1.5]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 stroke-[1.5]" />
                )}
              </Button>
              <Button
                variant="primary"
                title="تحميل الملف"
                onClick={() => downloadTextFile(item.content(), item.filename, item.mime)}
              >
                <Download className="h-3.5 w-3.5 stroke-[1.5]" />
                <span>تحميل</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {copyFailed && (
        <p role="alert" className="mt-3 text-xs text-ink-soft">
          تعذّر النسخ من هذا المتصفح. استعمل زر التحميل بدلاً منه.
        </p>
      )}
    </Modal>
  );
};
