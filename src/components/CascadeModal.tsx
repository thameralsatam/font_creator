import React, { useMemo, useState } from 'react';
import { Minus, MoveDown, Plus, Trash2 } from 'lucide-react';
import { type CascadeRule, type FontProject, type Glyph } from '../types/font';
import { uid } from '../utils/fontLogic';
import { resolveAll } from '../utils/composites';
import { glyphFillPath } from '../utils/pathGeometry';
import { MAX_CASCADE_SPAN } from '../utils/gpos';
import { t } from '../i18n';
import { Button } from './ui/Button';
import { Modal, ModalActions } from './ui/Modal';

export const MAX_CASCADES = 60;

/** كلمة تجريبية بترتيب الكتابة العربية (الأول على اليمين): حرف قبل المحرِّك، المحرِّك، ثم الحروف التي بعده بعد الإزاحة. */
const WordPreview: React.FC<{ seq: Glyph[]; dy: number; span: number; asc: number; desc: number; label: string }> = ({ seq, dy, span, asc, desc, label }) => {
  if (seq.length < 2) return <div className="h-24 rounded-2xl border border-dashed border-ink/20" />;
  const pad = 80;
  const total = seq.reduce((s, g) => s + g.advanceWidth, 0) || 1;
  const reach = span === 0 ? MAX_CASCADE_SPAN : span;
  let used = 0;
  const parts = seq.map((g, i) => {
    used += g.advanceWidth;
    // الأول على اليمين: يُحسب الموضع من اليمين
    const x = total - used;
    const shifted = i >= 2 && i - 1 <= reach;
    return { g, x, y: shifted ? dy : 0, i };
  });
  const low = Math.min(0, dy);
  return (
    <figure className="m-0 space-y-1">
      <figcaption className="text-[11px] text-ink-soft">{label}</figcaption>
      <svg
        viewBox={`${-pad} ${-asc - pad} ${total + pad * 2} ${asc - desc - low + pad * 2}`}
        className="h-28 w-full rounded-2xl border border-ink/15 bg-paper"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <line x1={-pad} x2={total + pad} y1={0} y2={0} className="stroke-ink" strokeOpacity="0.2" />
        {parts.map((p) => (
          <path
            key={p.i}
            d={glyphFillPath(p.g.contours)}
            transform={`translate(${p.x},${-p.y}) scale(1,-1)`}
            className="fill-ink"
            fillOpacity={p.i === 1 ? 1 : 0.7}
          />
        ))}
      </svg>
    </figure>
  );
};

/** إزاحة الحروف اللاحقة: حين يأتي محرف معيّن في كلمة تُزاح الحروف بعده رأسياً (كما في خط النسخ بعد الحاء والجيم). */
export const CascadeModal: React.FC<{
  project: FontProject;
  onSave: (cascades: CascadeRule[]) => void;
  onClose: () => void;
}> = ({ project, onSave, onClose }) => {
  const list = project.cascades ?? [];
  const viewGlyphs = useMemo(() => resolveAll(project), [project.glyphs]);
  const letters = useMemo(() => viewGlyphs.filter((g) => g.category === 'letter' || g.category === 'ligature'), [viewGlyphs]);
  const byName = useMemo(() => new Map(viewGlyphs.map((g) => [g.name, g])), [viewGlyphs]);
  const first = list[0];
  const [glyph, setGlyph] = useState(first?.glyph ?? letters[0]?.name ?? '');
  const [dy, setDy] = useState(first?.dy ?? -60);
  const [span, setSpan] = useState(first?.span ?? 0);
  const existing = list.find((r) => r.glyph === glyph);
  const full = !existing && list.length >= MAX_CASCADES;
  const m = project.metrics;
  const range = Math.round(m.upm / 2);

  const save = () => {
    if (!glyph || dy === 0 || full) return;
    if (existing) onSave(list.map((r) => (r.id === existing.id ? { ...r, dy, span } : r)));
    else onSave([...list, { id: uid('casc'), glyph, dy, span }]);
  };
  const remove = (id: string) => onSave(list.filter((r) => r.id !== id));
  const pick = (r: CascadeRule) => {
    setGlyph(r.glyph);
    setDy(r.dy);
    setSpan(r.span);
  };

  // حروف العينة بعد المحرِّك: أول حروف المشروع غير المحرِّك، مع حرف قبله
  const sample = useMemo(() => {
    const trig = byName.get(glyph);
    if (!trig) return [];
    const others = letters.filter((g) => g.name !== glyph && g.advanceWidth > 0);
    const pool = others.length ? others : [trig];
    const pick4 = [0, 1, 2, 3].map((i) => pool[i % pool.length]);
    return [pool[0], trig, ...pick4];
  }, [byName, glyph, letters]);

  return (
    <Modal
      title={t('إزاحة الحروف اللاحقة')}
      subtitle={t('حين يأتي حرف معيّن في كلمة تنزل أو ترتفع الحروف بعده')}
      icon={<MoveDown className="h-4 w-4 stroke-[1.5]" />}
      size="lg"
      onClose={onClose}
    >
      {project.source?.useOriginal && (
        <p className="mt-3 rounded-2xl border border-ink/20 bg-sand/25 p-3 text-xs leading-6">
          {t('هذا الخط مستورد وجداوله الأصلية مفعّلة، فتُدمج الإزاحة في جدول التموضع الأصلي دون المساس به. علامات التشكيل المربوطة في الخط الأصلي تبقى على ارتفاعها الأصلي ولا تنزل مع الحرف.')}
        </p>
      )}
      {letters.length === 0 ? (
        <p className="mt-3 text-sm leading-7 text-ink-soft">{t('أضف حرفاً واحداً على الأقل ليظهر ضبط الإزاحة.')}</p>
      ) : (
        <div className="mt-3 space-y-4 text-sm">
          <p className="text-xs leading-6 text-ink-soft">
            {t('اختر المحرف بالشكل الذي يكون عليه في الكلمة (مثل الحاء في الوسط). الحروف التي بعده في الكلمة نفسها تُزاح، وتتوقف الإزاحة عند الفراغ أو علامة الترقيم. تتبع علامات التشكيل حروفها إن كان لها نقاط ارتكاز.')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-ink-soft">{t('المحرف المُحرِّك')}</span>
              <select className="field" value={glyph} onChange={(e) => setGlyph(e.target.value)}>
                {letters.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-ink-soft">{t('عدد الحروف المتأثرة بعده')}</span>
              <select className="field" value={span} onChange={(e) => setSpan(Number(e.target.value))}>
                <option value={0}>{t('كل ما بعده في الكلمة (حتى {n})', { n: MAX_CASCADE_SPAN })}</option>
                {Array.from({ length: MAX_CASCADE_SPAN }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-soft">{t('الإزاحة الرأسية (وحدات الخط، السالب ينزل)')}</span>
            <Button variant="secondary" icon title={t('إنزال أكثر')} onClick={() => setDy((v) => Math.max(-range, v - 10))}>
              <Minus className="h-4 w-4 stroke-[1.5]" />
            </Button>
            <input
              dir="ltr"
              inputMode="numeric"
              className="field w-24 text-center font-mono"
              value={dy}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setDy(Math.max(-range, Math.min(range, Math.round(n))));
              }}
              aria-label={t('قيمة الإزاحة')}
            />
            <Button variant="secondary" icon title={t('رفع أكثر')} onClick={() => setDy((v) => Math.min(range, v + 10))}>
              <Plus className="h-4 w-4 stroke-[1.5]" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <WordPreview seq={sample} dy={0} span={span} asc={m.ascender} desc={m.descender} label={t('بدون إزاحة')} />
            <WordPreview seq={sample} dy={dy} span={span} asc={m.ascender} desc={m.descender} label={t('بعد الإزاحة')} />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" disabled={!glyph || dy === 0 || full} onClick={save}>
              {existing ? t('تحديث القاعدة') : t('إضافة القاعدة')}
            </Button>
            {full && <span className="text-xs text-ink-soft">{t('بلغت الحد الأقصى ({n} قاعدة).', { n: MAX_CASCADES })}</span>}
            {dy === 0 && <span className="text-xs text-ink-soft">{t('القيمة صفر لا تغيّر شيئاً.')}</span>}
          </div>

          <div>
            <div className="mb-1 text-xs text-ink-soft">{t('القواعد ({n})', { n: list.length })}</div>
            {list.length === 0 ? (
              <p className="text-xs leading-6 text-ink-soft">{t('لا قواعد بعد.')}</p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {list.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 rounded-xl border border-ink/10 px-2 py-1">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-xs" onClick={() => pick(r)}>
                      <span dir="ltr" className="truncate font-mono">{r.glyph}</span>
                      <span className="text-ink-soft">{r.span === 0 ? t('كل ما بعده') : t('{n} بعده', { n: r.span })}</span>
                      <span dir="ltr" className="ms-auto rounded-full bg-ink/10 px-2 font-mono">{r.dy}</span>
                    </button>
                    <Button variant="quiet" icon title={t('حذف القاعدة')} onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 stroke-[1.5]" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs leading-6 text-ink-soft">
            {t('إن تعدّد المحرِّكون في كلمة واحدة حكم أقربهم إلى الحرف، ولا تتراكم الإزاحات.')}
          </p>
        </div>
      )}
      <ModalActions>
        <Button variant="primary" onClick={onClose}>{t('تم')}</Button>
      </ModalActions>
    </Modal>
  );
};
