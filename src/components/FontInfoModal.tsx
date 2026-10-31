import React, { useState } from 'react';
import { AlertCircle, FileText } from 'lucide-react';
import { type FontInfo, type FontProject } from '../types/font';
import { SUBFAMILIES, infoOf, resolveInfo, validateInfo } from '../utils/fontInfo';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

export interface InfoPatch {
  name: string;
  designer: string;
  version: string;
  description: string;
  info: FontInfo;
}

interface FontInfoModalProps {
  project: FontProject;
  onSave: (patch: InfoPatch) => void;
  onClose: () => void;
}

const Field: React.FC<{
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ id, label, hint, children }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-[11px] text-ink-soft">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[10px] text-ink-soft">{hint}</p>}
  </div>
);

/** كل معلومات الخط. تُكتب في جدول الأسماء عند التصدير وتُقرأ منه عند الاستيراد. */
export const FontInfoModal: React.FC<FontInfoModalProps> = ({ project, onSave, onClose }) => {
  const auto = resolveInfo(project);
  const [name, setName] = useState(project.name);
  const [designer, setDesigner] = useState(project.designer);
  const [version, setVersion] = useState(project.version);
  const [description, setDescription] = useState(project.description);
  const [info, setInfo] = useState<FontInfo>(infoOf(project));
  const set = (k: keyof FontInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInfo((i) => ({ ...i, [k]: e.target.value }));

  const errors = validateInfo({ name, version, info });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length) return;
    onSave({
      name: name.trim(),
      designer: designer.trim() || 'المصمم',
      version: version.trim() || '1.0.0',
      description: description.trim(),
      info: Object.fromEntries(Object.entries(info).map(([k, v]) => [k, v.trim()])) as unknown as FontInfo,
    });
    onClose();
  };

  // القيم المحسوبة تلقائياً تظهر كتلميح داخل الحقل الفارغ
  const fullAuto = `${name.trim() || auto.family} ${info.subfamily.trim() || 'Regular'}`;

  return (
    <Modal
      title="معلومات الخط"
      subtitle="تظهر في ملف الخط عند التصدير، وتُقرأ منه عند الاستيراد"
      icon={<FileText className="h-4 w-4 stroke-[1.5]" />}
      size="xl"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="i-name" label="اسم العائلة" hint="الاسم الذي يراه المستخدم في قائمة الخطوط.">
            <input id="i-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </Field>
          <Field id="i-sub" label="النمط" hint="مثل Regular أو Bold. للخط العادي اتركه Regular.">
            <input
              id="i-sub"
              dir="ltr"
              list="i-sub-list"
              value={info.subfamily}
              onChange={set('subfamily')}
              className="field font-mono"
            />
            <datalist id="i-sub-list">
              {SUBFAMILIES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field id="i-full" label="الاسم الكامل" hint="يُحسب تلقائياً إن تركته فارغاً.">
            <input
              id="i-full"
              dir="ltr"
              value={info.fullName}
              onChange={set('fullName')}
              placeholder={fullAuto}
              className="field font-mono"
            />
          </Field>
          <Field id="i-ps" label="اسم PostScript" hint="حروف لاتينية وأرقام وشرطة فقط. يُحسب تلقائياً إن تركته فارغاً.">
            <input
              id="i-ps"
              dir="ltr"
              value={info.postScriptName}
              onChange={set('postScriptName')}
              placeholder={auto.postScriptName}
              className="field font-mono"
            />
          </Field>
          <Field id="i-ver" label="الإصدار">
            <input id="i-ver" dir="ltr" value={version} onChange={(e) => setVersion(e.target.value)} className="field font-mono" />
          </Field>
          <Field id="i-designer" label="المصمم">
            <input id="i-designer" value={designer} onChange={(e) => setDesigner(e.target.value)} className="field" />
          </Field>
        </section>

        <section className="grid grid-cols-1 gap-3 border-t border-ink/10 pt-4 sm:grid-cols-2">
          <Field id="i-copy" label="حقوق النشر" hint="مثل: © 2026 اسمك.">
            <input id="i-copy" value={info.copyright} onChange={set('copyright')} className="field" />
          </Field>
          <Field id="i-manu" label="الجهة المصنِّعة">
            <input id="i-manu" value={info.manufacturer} onChange={set('manufacturer')} className="field" />
          </Field>
          <Field id="i-lic" label="الترخيص" hint="مثل: SIL Open Font License 1.1.">
            <input id="i-lic" value={info.license} onChange={set('license')} className="field" />
          </Field>
          <Field id="i-licurl" label="رابط الترخيص">
            <input id="i-licurl" dir="ltr" value={info.licenseUrl} onChange={set('licenseUrl')} placeholder="https://" className="field font-mono" />
          </Field>
          <Field id="i-durl" label="رابط المصمم">
            <input id="i-durl" dir="ltr" value={info.designerUrl} onChange={set('designerUrl')} placeholder="https://" className="field font-mono" />
          </Field>
          <div className="sm:col-span-2">
            <Field id="i-desc" label="الوصف">
              <textarea id="i-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="field" />
            </Field>
          </div>
        </section>

        {errors.length > 0 && (
          <div role="alert" className="space-y-1 rounded-2xl border border-ink/20 bg-sand/30 p-3 text-xs">
            {errors.map((t) => (
              <p key={t} className="flex gap-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[1.5]" />
                {t}
              </p>
            ))}
          </div>
        )}

        <ModalActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary" disabled={errors.length > 0}>حفظ</Button>
        </ModalActions>
      </form>
    </Modal>
  );
};
