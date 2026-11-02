import React, { useRef, useState } from 'react';
import { FileUp, Trash2 } from 'lucide-react';
import { type Connector, type FontProject } from '../types/font';
import { MAX_CONNECTORS } from '../utils/glyphLogic';
import { uid } from '../utils/fontLogic';
import { centerOnOrigin } from '../utils/pathEdit';
import { svgToGlyph } from '../utils/svgGlyph';
import { ConnectorPreview } from './ConnectorPreview';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

/** إدارة وصلات المشروع: تُعرَّف هنا ثم تُدرج بضغطة من الاستوديو. */
export const ConnectorsModal: React.FC<{
  project: FontProject;
  onSave: (connectors: Connector[]) => void;
  onClose: () => void;
}> = ({ project, onSave, onClose }) => {
  const list = project.connectors ?? [];
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const full = list.length >= MAX_CONNECTORS;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    setError(null);
    const added: Connector[] = [];
    const failed: string[] = [];
    for (const f of files) {
      if (list.length + added.length >= MAX_CONNECTORS) break;
      const res = svgToGlyph(await f.text(), project.metrics);
      if (!res.ok) {
        failed.push(f.name);
        continue;
      }
      added.push({ id: uid('conn'), name: f.name.replace(/\.svg$/i, ''), contours: centerOnOrigin(res.contours) });
    }
    if (added.length) onSave([...list, ...added]);
    if (failed.length) setError(`تعذّر قراءة: ${failed.join('، ')}`);
  };

  return (
    <Modal
      title="الوصلات"
      subtitle={`حتى ${MAX_CONNECTORS} وصلة تظهر في الاستوديو لتدرجها بضغطة`}
      size="md"
      onClose={onClose}
    >
      <div className="mt-4 space-y-3">
        <p className="text-xs leading-6 text-ink-soft">
          أضف الوصلة من ملف SVG هنا، أو من الاستوديو: حدد مساراتها واختر «حفظ المحدد كوصلة» من قائمة الوصلات.
        </p>

        {list.length === 0 ? (
          <p className="plate py-6 text-center text-sm text-ink-soft">لا وصلات بعد.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="plate flex items-center gap-2 p-2">
                <span className="grid h-10 w-14 shrink-0 place-items-center rounded-xl bg-paper text-ink">
                  <ConnectorPreview contours={c.contours} className="h-8 w-12" />
                </span>
                <input
                  className="field min-w-0 flex-1"
                  defaultValue={c.name}
                  maxLength={40}
                  aria-label="اسم الوصلة"
                  onBlur={(e) => {
                    const name = e.target.value.trim() || c.name;
                    if (name !== c.name) onSave(list.map((x) => (x.id === c.id ? { ...x, name } : x)));
                  }}
                />
                <Button
                  variant="quiet"
                  icon
                  title="حذف الوصلة"
                  onClick={() => onSave(list.filter((x) => x.id !== c.id))}
                >
                  <Trash2 className="h-4 w-4 stroke-[1.5]" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-xs text-ink">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-soft">
            <span className="font-mono">{list.length}</span> من <span className="font-mono">{MAX_CONNECTORS}</span>
          </span>
          <Button variant="primary" disabled={full} onClick={() => input.current?.click()}>
            <FileUp className="h-4 w-4 stroke-[1.5]" />
            <span>إضافة من SVG</span>
          </Button>
        </div>
        <input ref={input} type="file" multiple accept=".svg,image/svg+xml" className="hidden" onChange={(e) => void onFile(e)} />
      </div>
    </Modal>
  );
};
