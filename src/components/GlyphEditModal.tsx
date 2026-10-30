import React, { useState } from 'react';
import { type Glyph, type GlyphCategory, type GlyphForm } from '../types/font';
import { type GlyphMeta, validateGlyphEdit } from '../utils/glyphLogic';
import { CATEGORY_LABEL, FORM_LABEL } from '../utils/labels';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

interface GlyphEditModalProps {
  glyph: Glyph;
  glyphs: Glyph[];
  onSave: (meta: GlyphMeta) => void;
  onClose: () => void;
}

/** تعديل بيانات المحرف (الاسم والرمز والتصنيف والشكل). الرسم لا يتغير. */
export const GlyphEditModal: React.FC<GlyphEditModalProps> = ({ glyph, glyphs, onSave, onClose }) => {
  const [char, setChar] = useState(glyph.char);
  const [name, setName] = useState(glyph.name);
  const [unicode, setUnicode] = useState(glyph.unicode);
  const [category, setCategory] = useState<GlyphCategory>(glyph.category);
  const [form, setForm] = useState<GlyphForm>(glyph.form);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const meta: GlyphMeta = {
      // نحذف الفراغات الزائدة، لكن محرف الفراغ نفسه (مسافة فقط) يبقى كما هو
      char: char.trim() === '' ? char : char.trim(),
      name: name.trim(),
      unicode: unicode.trim().toUpperCase(),
      category,
      form,
    };
    const problem = validateGlyphEdit(glyphs, glyph.id, meta);
    if (problem) {
      setError(problem);
      return;
    }
    onSave(meta);
    onClose();
  };

  const clear = () => setError(null);

  return (
    <Modal title="تعديل المحرف" subtitle="الرسم لا يتغير، فقط بياناته" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label htmlFor="e-char" className="mb-1 block text-xs text-ink-soft">المحرف أو الرمز</label>
          <input
            id="e-char"
            autoFocus
            required
            maxLength={4}
            value={char}
            onChange={(e) => {
              setChar(e.target.value);
              clear();
            }}
            className="field font-heading text-base"
          />
        </div>
        <div>
          <label htmlFor="e-name" className="mb-1 block text-xs text-ink-soft">اسم المحرف في الخط</label>
          <input
            id="e-name"
            dir="ltr"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clear();
            }}
            className="field font-mono"
          />
        </div>
        <div>
          <label htmlFor="e-unicode" className="mb-1 block text-xs text-ink-soft">
            نقطة اليونيكود (اتركها فارغة للأشكال غير المرمّزة)
          </label>
          <input
            id="e-unicode"
            dir="ltr"
            value={unicode}
            onChange={(e) => {
              setUnicode(e.target.value);
              clear();
            }}
            placeholder="U+0641"
            className="field font-mono"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="e-cat" className="mb-1 block text-xs text-ink-soft">التصنيف</label>
            <select
              id="e-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as GlyphCategory)}
              className="field"
            >
              {(Object.keys(CATEGORY_LABEL) as GlyphCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="e-form" className="mb-1 block text-xs text-ink-soft">الشكل</label>
            <select
              id="e-form"
              value={form}
              onChange={(e) => setForm(e.target.value as GlyphForm)}
              className="field"
            >
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
          <Button type="submit" variant="primary">حفظ</Button>
        </ModalActions>
      </form>
    </Modal>
  );
};
