import React, { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { Download, HardDrive, ShieldCheck, Upload } from 'lucide-react';
import { type FontProject } from '../types/font';
import { type StorageInfo, backupJson, formatBytes, getStorageInfo, markBackupDone, parseBackup, projectsSize, requestPersistence } from '../utils/storage';
import { downloadTextFile } from '../utils/download';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Progress } from './ui/Pill';

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="text-ink-soft">{label}</span>
    <span dir="ltr" className="font-mono text-xs">{value}</span>
  </div>
);

/** ينزّل ملف نسخة احتياطية بكل المشاريع ويسجّل وقتها. */
export function downloadBackup(projects: FontProject[]): void {
  downloadTextFile(backupJson(projects), `font-studio-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  markBackupDone();
}

/** حالة التخزين: كم تستهلك مشاريعك، وكم المتاح، وهل بياناتك محمية من المسح التلقائي. */
export const StorageModal: React.FC<{ projects: FontProject[]; onRestore: (list: FontProject[]) => void; onClose: () => void }> = ({ projects, onRestore, onClose }) => {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const restore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const list = parseBackup(await f.text());
    if (!list) return setMsg(t('الملف ليس نسخة احتياطية صالحة.'));
    onRestore(list);
    setMsg(t('أُضيف {n} مشروع من النسخة (كنسخ جديدة، ولم يُستبدل شيء).', { n: list.length }));
  };
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
      title={t('التخزين')}
      subtitle={t('أين تُحفظ مشاريعك وكم تستهلك')}
      icon={<HardDrive className="h-4 w-4 stroke-[1.5]" />}
      size="sm"
      onClose={onClose}
    >
      <div className="mt-3 space-y-3 text-sm">
        <div className="plate p-3.5">
          <Row label={t('مشاريعك')} value={formatBytes(mine)} />
          <Row label={t('كل بيانات الموقع')} value={info?.usage != null ? formatBytes(info.usage) : '—'} />
          <Row label={t('الحد المسموح')} value={info?.quota != null ? formatBytes(info.quota) : '—'} />
          {ratio !== null && <Progress value={Math.round(ratio * 1000)} max={1000} className="mt-2" />}
        </div>

        {ratio !== null && ratio > 0.8 && (
          <p className="rounded-2xl border border-ink/20 p-3 text-xs leading-6">
            {t('المساحة قاربت على الامتلاء. صدّر خطوطك واحذف ما لا تحتاجه.')}
          </p>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-ink/15 p-3">
          <ShieldCheck className="h-4 w-4 shrink-0 stroke-[1.5]" />
          <span className="min-w-0 flex-1 text-xs leading-6">
            {info?.persisted === true
              ? t('بياناتك محمية: المتصفح لن يمسحها تلقائياً.')
              : info?.persisted === false
                ? t('بياناتك غير محمية من المسح التلقائي عند ضيق مساحة جهازك.')
                : t('متصفحك لا يخبرنا بحالة الحماية.')}
          </span>
          {info?.persisted === false && (
            <Button onClick={() => void protect()}>{t('طلب الحماية')}</Button>
          )}
        </div>

        <div className="rounded-2xl border border-ink/15 p-3">
          <p className="mb-2 text-xs leading-6">{t('النسخة الاحتياطية ملف واحد يحمل كل مشاريعك. احتفظ به خارج المتصفح.')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={projects.length === 0} onClick={() => { downloadBackup(projects); setMsg(t('نُزّلت النسخة الاحتياطية.')); }}>
              <Download className="h-4 w-4 stroke-[1.5]" />
              <span>{t('تنزيل نسخة احتياطية')}</span>
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 stroke-[1.5]" />
              <span>{t('استعادة من نسخة')}</span>
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void restore(e)} />
          {msg && <p role="status" className="mt-2 text-xs leading-6 text-ink-soft">{msg}</p>}
        </div>

        <p className="text-xs leading-6 text-ink-soft">
          {t('المشاريع تُحفظ داخل متصفحك فقط. مسح بيانات الموقع من إعدادات المتصفح يحذفها. للأمان صدّر خطك من وقت لآخر، فملف الخط يحمل رسمك وقواعدك ويمكن استيراده لاحقاً.')}
        </p>
      </div>
    </Modal>
  );
};
