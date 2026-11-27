import React, { useMemo, useState } from 'react';
import { t } from '../i18n';
import type { Glyph } from '../types/font';
import { defaultGlyphName, defaultUnicode } from '../utils/fontLogic';
import { familyOf, planDerive } from '../utils/derive';
import { FORM_LABEL } from '../utils/labels';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

/**
 * اشتق من…: محرف جديد (أو أشكال عائلة كاملة) يُبنى من محرف مصدر دون المساس به.
 * يمكن ربطه بالمصدر (يتبع تعديلاته) أو نسخه رسماً مستقلاً، وإضافة جزء فوقه كالنقطتين.
 */
export const DeriveModal: React.FC<{
  glyphs: Glyph[];
  sourceId: string;
  onDerive: (glyphs: Glyph[]) => void;
  onClose: () => void;
}> = ({ glyphs, sourceId, onDerive, onClose }) => {
  const [src, setSrc] = useState(sourceId);
  const [char, setChar] = useState('');
  const [name, setName] = useState('');
  const [unicode, setUnicode] = useState('');
  const [auto, setAuto] = useState(true);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [link, setLink] = useState(true);
  const [partId, setPartId] = useState('');
  const [dx, setDx] = useState('0');
  const [dy, setDy] = useState('0');

  const source = glyphs.find((g) => g.id === src) ?? glyphs[0];
  const fam = useMemo(() => familyOf(glyphs, source), [glyphs, source]);
  const suffixes = picked ?? fam.members.map((m) => m.suffix);
  const num = (v: string) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Math.round(Number(v)) : 0);

  const plan = useMemo(
    () =>
      planDerive(glyphs, {
        sourceId: source.id,
        name,
        char,
        unicode,
        suffixes,
        link,
        extra: partId ? { refId: partId, dx: num(dx), dy: num(dy) } : undefined,
      }),
    [glyphs, source.id, name, char, unicode, suffixes.join('|'), link, partId, dx, dy]
  );
  const ready = !!char.trim() && suffixes.length > 0 && !plan.error && plan.glyphs.length > 0;

  const onChar = (v: string) => {
    setChar(v);
    if (auto) {
      setName(defaultGlyphName(v));
      setUnicode(defaultUnicode(v));
    }
  };

  return (
    <Modal title={t('اشتق من محرف')} onClose={onClose}>
      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) {
            onDerive(plan.glyphs);
            onClose();
          }
        }}
      >
        <div>
          <label htmlFor="d-src" className="mb-1 block text-xs text-ink-soft">{t('المحرف المصدر')}</label>
          <select
            id="d-src"
            value={source.id}
            onChange={(e) => {
              setSrc(e.target.value);
              setPicked(null);
            }}
            className="field font-mono"
            dir="ltr"
          >
            {glyphs.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {fam.members.length > 1 && (
          <fieldset>
            <legend className="mb-1 text-xs text-ink-soft">{t('الأشكال المطلوبة من عائلة المصدر')}</legend>
            <div className="flex flex-wrap gap-3">
              {fam.members.map((m) => (
                <label key={m.suffix} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={suffixes.includes(m.suffix)}
                    onChange={(e) => setPicked(e.target.checked ? [...suffixes, m.suffix] : suffixes.filter((s) => s !== m.suffix))}
                  />
                  {FORM_LABEL[m.glyph.form]}
                  <span dir="ltr" className="font-mono text-xs text-ink-soft">{m.glyph.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="d-char" className="mb-1 block text-xs text-ink-soft">{t('المحرف الجديد')}</label>
            <input id="d-char" autoFocus maxLength={4} value={char} onChange={(e) => onChar(e.target.value)} className="field font-heading text-base" />
          </div>
          <div>
            <label htmlFor="d-name" className="mb-1 block text-xs text-ink-soft">{t('الاسم الأساسي')}</label>
            <input id="d-name" dir="ltr" value={name} onChange={(e) => { setName(e.target.value); setAuto(false); }} className="field font-mono" />
          </div>
          <div>
            <label htmlFor="d-uni" className="mb-1 block text-xs text-ink-soft">{t('نقطة اليونيكود')}</label>
            <input id="d-uni" dir="ltr" value={unicode} onChange={(e) => { setUnicode(e.target.value); setAuto(false); }} className="field font-mono" />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3">
          <div>
            <label htmlFor="d-part" className="mb-1 block text-xs text-ink-soft">{t('جزء يُضاف فوق الجسم (اختياري، مثل النقطتين)')}</label>
            <select id="d-part" value={partId} onChange={(e) => setPartId(e.target.value)} className="field font-mono" dir="ltr">
              <option value="">{t('بلا')}</option>
              {glyphs.filter((g) => g.id !== source.id).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <input aria-label="X" dir="ltr" disabled={!partId} value={dx} onChange={(e) => setDx(e.target.value)} className="field w-20 text-center font-mono" />
          <input aria-label="Y" dir="ltr" disabled={!partId} value={dy} onChange={(e) => setDy(e.target.value)} className="field w-20 text-center font-mono" />
        </div>

        <label className="flex items-start gap-2 text-sm leading-6">
          <input type="checkbox" checked={link} onChange={(e) => setLink(e.target.checked)} className="mt-1.5" />
          <span>{link ? t('ربط بالمصدر: يتبع تعديلاته ويرث ارتكازاته. تستطيع تعديل مكوّناته أو فك ارتباطه لاحقاً.') : t('نسخة مستقلة: رسم ومسارات خاصة بمعرّفات جديدة لا تتأثر بالمصدر.')}</span>
        </label>

        <p className="text-xs leading-6 text-ink-soft" data-testid="derive-preview">
          {plan.error ? (
            <span role="alert" className="block rounded-xl border border-ink/20 bg-sand/30 p-2.5 text-sm text-ink">{plan.error}</span>
          ) : plan.glyphs.length > 0 && char.trim() ? (
            <>
              {t('سيُنشأ:')} <span dir="ltr" className="font-mono">{plan.glyphs.map((g) => g.name).join(', ')}</span>
              {' — '}
              {t('المصدر لا يتغير.')}
            </>
          ) : (
            t('اكتب المحرف الجديد واختر الأشكال.')
          )}
        </p>
        <ModalActions>
          <Button onClick={onClose}>{t('إلغاء')}</Button>
          <Button type="submit" variant="primary" disabled={!ready}>{t('اشتقاق')}</Button>
        </ModalActions>
      </form>
    </Modal>
  );
};
