import React, { useState } from 'react';
import { type FontProject, type GlyphCategory, type GlyphForm, type NewGlyphData } from '../types/font';
import { defaultGlyphName, defaultUnicode, validateNewGlyph } from '../utils/fontLogic';
import { CATEGORY_LABEL, FORM_LABEL } from '../utils/labels';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

/** إضافة محرف واحد. الاسم والرمز يُملآن تلقائياً من المحرف ما لم تعدّلهما يدوياً. */
export const GlyphAddModal: React.FC<{
  glyphs: FontProject['glyphs'];
  onAdd: (data: NewGlyphData) => void;
  onClose: () => void;
}> = ({ glyphs, onAdd, onClose }) => {
  const [char, setChar] = useState('');
  const [name, setName] = useState('');
  const [unicode, setUnicode] = useState('');
  const [category, setCategory] = useState<GlyphCategory>('letter');
  const [form, setForm] = useState<GlyphForm>('isolated');
  const [auto, setAuto] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onChar = (v: string) => {
    setChar(v);
    setError(null);
    if (auto) {
      setName(defaultGlyphName(v));
      setUnicode(defaultUnicode(v));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: NewGlyphData = {
      char: char.trim(),
      name: name.trim(),
      unicode: unicode.trim().toUpperCase(),
      category,
      form,
    };
    const problem = validateNewGlyph(glyphs, data);
    if (problem) {
      setError(problem);
      return;
    }
    onAdd(data);
    onClose();
  };

  return (
    <Modal title="إضافة محرف جديد" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label htmlFor="g-char" className="mb-1 block text-xs text-ink-soft">المحرف أو الرمز</label>
          <input
            id="g-char"
            autoFocus
            required
            maxLength={4}
            value={char}
            onChange={(e) => onChar(e.target.value)}
            placeholder="مثال: ف"
            className="field font-heading text-base"
          />
        </div>
        <div>
          <label htmlFor="g-name" className="mb-1 block text-xs text-ink-soft">اسم المحرف في الخط</label>
          <input
            id="g-name"
            dir="ltr"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setAuto(false);
              setError(null);
            }}
            placeholder="feh"
            className="field font-mono"
          />
        </div>
        <div>
          <label htmlFor="g-unicode" className="mb-1 block text-xs text-ink-soft">نقطة اليونيكود</label>
          <input
            id="g-unicode"
            dir="ltr"
            value={unicode}
            onChange={(e) => {
              setUnicode(e.target.value);
              setAuto(false);
              setError(null);
            }}
            placeholder="U+0641"
            className="field font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="g-cat" className="mb-1 block text-xs text-ink-soft">التصنيف</label>
            <select id="g-cat" value={category} onChange={(e) => setCategory(e.target.value as GlyphCategory)} className="field">
              {(Object.keys(CATEGORY_LABEL) as GlyphCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="g-form" className="mb-1 block text-xs text-ink-soft">الشكل</label>
            <select id="g-form" value={form} onChange={(e) => setForm(e.target.value as GlyphForm)} className="field">
              {(Object.keys(FORM_LABEL) as GlyphForm[]).map((k) => (
                <option key={k} value={k}>{FORM_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-ink/20 bg-sand/30 p-2.5 text-xs">{error}</p>
        )}
        <ModalActions>
          <Button onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="primary">إضافة</Button>
        </ModalActions>
      </form>
    </Modal>
  );
};
