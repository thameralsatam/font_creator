import React, { useEffect, useState } from 'react';
import { HardDrive, ShieldCheck } from 'lucide-react';
import { type FontProject } from '../types/font';
import { type StorageInfo, formatBytes, getStorageInfo, projectsSize, requestPersistence } from '../utils/storage';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Progress } from './ui/Pill';

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="text-ink-soft">{label}</span>
    <span dir="ltr" className="font-mono text-xs">{value}</span>
  </div>
);

/** حالة التخزين: كم تستهلك مشاريعك، وكم المتاح، وهل بياناتك محمية من المسح التلقائي. */
export const StorageModal: React.FC<{ projects: FontProject[]; onClose: () => void }> = ({ projects, onClose }) => {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const mine = projectsSize(projects);

  useEffect(() => {
    let alive = true;
    void getStorageInfo().then((i) => alive && setInfo(i));
    return () => {
      alive = false;
    };
  }, []);

  const ratio = info?.usage != null && info.quota ? info.usage / info.quota : null;
  const protect = async () => {
    await requestPersistence();
    setInfo(await getStorageInfo());
  };

  return (
    <Modal
      title="التخزين"
      subtitle="أين تُحفظ مشاريعك وكم تستهلك"
      icon={<HardDrive className="h-4 w-4 stroke-[1.5]" />}
      size="sm"
      onClose={onClose}
    >
      <div className="mt-3 space-y-3 text-sm">
        <div className="plate p-3.5">
          <Row label="مشاريعك" value={formatBytes(mine)} />
          <Row label="كل بيانات الموقع" value={info?.usage != null ? formatBytes(info.usage) : '—'} />
          <Row label="الحد المسموح" value={info?.quota != null ? formatBytes(info.quota) : '—'} />
          {ratio !== null && <Progress value={Math.round(ratio * 1000)} max={1000} className="mt-2" />}
        </div>

        {ratio !== null && ratio > 0.8 && (
          <p className="rounded-2xl border border-ink/20 p-3 text-xs leading-6">
            المساحة قاربت على الامتلاء. صدّر خطوطك واحذف ما لا تحتاجه.
          </p>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-ink/15 p-3">
          <ShieldCheck className="h-4 w-4 shrink-0 stroke-[1.5]" />
          <span className="min-w-0 flex-1 text-xs leading-6">
            {info?.persisted === true
              ? 'بياناتك محمية: المتصفح لن يمسحها تلقائياً.'
              : info?.persisted === false
                ? 'بياناتك غير محمية من المسح التلقائي عند ضيق مساحة جهازك.'
                : 'متصفحك لا يخبرنا بحالة الحماية.'}
          </span>
          {info?.persisted === false && (
            <Button onClick={() => void protect()}>طلب الحماية</Button>
          )}
        </div>

        <p className="text-xs leading-6 text-ink-soft">
          المشاريع تُحفظ داخل متصفحك فقط. مسح بيانات الموقع من إعدادات المتصفح يحذفها. للأمان صدّر
          خطك من وقت لآخر، فملف الخط يحمل رسمك وقواعدك ويمكن استيراده لاحقاً.
        </p>
      </div>
    </Modal>
  );
};
