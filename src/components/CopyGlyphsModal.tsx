import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { type FontProject } from '../types/font';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

/** نسخ المحارف المحددة إلى مشروع آخر. المطابقة بالاسم، ويمكن اختيار الاستبدال أو التخطي. */
export const CopyGlyphsModal: React.FC<{
  count: number;
  targets: FontProject[];
  onCopy: (targetId: string, replace: boolean) => void;
  onClose: () => void;
}> = ({ count, targets, onCopy, onClose }) => {
  const [target, setTarget] = useState(targets[0]?.id ?? '');
  const [replace, setReplace] = useState(false);
  return (
    <Modal
      title="نسخ إلى مشروع آخر"
      subtitle={`${count} محرف محدد بمساراته ونقاط ربطه`}
      icon={<Copy className="h-4 w-4 stroke-[1.5]" />}
      size="sm"
      onClose={onClose}
    >
      {targets.length === 0 ? (
        <p className="mt-3 text-sm leading-7 text-ink-soft">لا يوجد مشروع آخر. أنشئ مشروعًا ثانيًا من قائمة المشاريع ثم أعد المحاولة.</p>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="text-xs text-ink-soft">المشروع الهدف</span>
            <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
              {targets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.glyphs.length})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2 text-xs leading-6">
            <input type="checkbox" className="mt-1.5" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            <span>استبدال المحارف الموجودة بالاسم نفسه في الهدف. بدون ذلك تُتخطى ولا يتغير شيء فيها.</span>
          </label>
        </div>
      )}
      <ModalActions>
        <Button variant="quiet" onClick={onClose}>إلغاء</Button>
        {targets.length > 0 && (
          <Button variant="primary" disabled={!target} onClick={() => onCopy(target, replace)}>نسخ</Button>
        )}
      </ModalActions>
    </Modal>
  );
};
