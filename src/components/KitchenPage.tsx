import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ChefHat } from 'lucide-react';
import { isRtl, t } from '../i18n';
import { type FontProject, type FontMetrics, type NewGlyphData } from '../types/font';
import { ModalEmbed } from './ui/Modal';
import { Button } from './ui/Button';
import { FontPreview } from './FontTestPanel';
import { FeaturesModal } from './FeaturesModal';
import { KerningModal } from './KerningModal';
import { CascadeModal } from './CascadeModal';
import { MetricsModal } from './MetricsModal';
import { FontInfoModal } from './FontInfoModal';
import { ConnectorsModal } from './ConnectorsModal';

/*
  مطبخ الخط: كل ما يضبط سلوك الخط في نافذة واحدة بأقسام ثابتة على جانبها.
  المجموعة الأولى هي ما يُكتب في ملف الخط ويعمل في كل برنامج (ميزات الأوبن تايب):
    - الأشكال والربط: استبدال شكل الحرف بحسب موقعه في الكلمة (بداية ووسط ونهاية وترابطات) وهي جداول التبديل.
    - المسافات والإزاحة: تحريك الحروف أفقياً أو رأسياً بعد الصياغة وهي جداول التموضع.
  والثانية معلومات وقياسات تُكتب في الخط لكنها ليست ميزات. والثالثة مساعدات للرسم لا تدخل الخط.
*/

const SAMPLE = 'الخط العربي جميل ومتناسق'; // i18n-keep

export type KitchenSection = 'features' | 'kerning' | 'cascade' | 'metrics' | 'info' | 'connectors';

interface KitchenPageProps {
  project: FontProject;
  initial?: KitchenSection;
  onClose: () => void;
  onUpdateProject: (patch: Partial<FontProject>) => void;
  onSaveMetrics: (updates: { metrics: FontMetrics }) => void;
  onUpdateInfo: React.ComponentProps<typeof FontInfoModal>['onSave'];
  onAddGlyphs: (items: NewGlyphData[]) => void;
  onOpenGlyph: (id: string) => void;
}

export const KitchenPage: React.FC<KitchenPageProps> = (props) => {
  const { project, onClose } = props;
  const [section, setSection] = useState<KitchenSection>(props.initial ?? 'features');

  const groups: Array<{ title: string; hint: string; items: Array<{ id: KitchenSection; label: string; count?: number }> }> = [
    {
      title: t('يُكتب في الخط (ميزات الأوبن تايب)'),
      hint: t('تعمل في أي برنامج يفتح الخط'),
      items: [
        { id: 'features', label: t('الأشكال والربط') },
        { id: 'kerning', label: t('المسافة بين الأزواج'), count: project.kerning?.length },
        { id: 'cascade', label: t('إزاحة الحروف اللاحقة'), count: project.cascades?.length },
      ],
    },
    {
      title: t('بيانات الخط'),
      hint: t('تُكتب في الخط وليست ميزات'),
      items: [
        { id: 'metrics', label: t('المقاييس') },
        { id: 'info', label: t('معلومات الخط') },
      ],
    },
    {
      title: t('مساعدات الاستوديو'),
      hint: t('لا تدخل الخط'),
      items: [{ id: 'connectors', label: t('الوصلات'), count: project.connectors?.length }],
    },
  ];

  const body = (() => {
    switch (section) {
      case 'features':
        return (
          <FeaturesModal
            project={project}
            onAddGlyphs={props.onAddGlyphs}
            onOpenGlyph={(id) => {
              onClose();
              props.onOpenGlyph(id);
            }}
            onSaveCustomFea={(fea) => props.onUpdateProject({ customFea: fea })}
            onSetOriginal={(use) => project.source && props.onUpdateProject({ source: { ...project.source, useOriginal: use } })}
            onClose={onClose}
          />
        );
      case 'kerning':
        return <KerningModal project={project} onSave={(kerning) => props.onUpdateProject({ kerning })} onClose={onClose} />;
      case 'cascade':
        return <CascadeModal project={project} onSave={(cascades) => props.onUpdateProject({ cascades })} onClose={onClose} />;
      case 'metrics':
        return <MetricsModal isOpen project={project} onSave={props.onSaveMetrics} onClose={onClose} />;
      case 'info':
        return <FontInfoModal project={project} onSave={props.onUpdateInfo} onClose={onClose} />;
      case 'connectors':
        return <ConnectorsModal project={project} onSave={(connectors) => props.onUpdateProject({ connectors })} onClose={onClose} />;
    }
  })();

  const Back = isRtl() ? ArrowRight : ArrowLeft;
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <header className="capsule flex items-center gap-3 p-3 sm:p-4">
        <Button variant="quiet" icon title={t('الرجوع إلى المشروع')} onClick={onClose}>
          <Back className="h-4 w-4 stroke-[1.5]" />
        </Button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink/20 bg-sand/35">
          <ChefHat className="h-4 w-4 stroke-[1.5]" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base sm:text-xl">{t('مطبخ الخط')}</h1>
          <p className="truncate text-xs text-ink-soft">{project.name} · {t('كل ما يضبط سلوك الخط في مكان واحد')}</p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,25rem)] lg:items-start lg:gap-5">
        <nav className="flex flex-col gap-3 lg:sticky lg:top-6" aria-label={t('أقسام المطبخ')}>
          {groups.map((g) => (
            <div key={g.title} className="flex flex-col gap-0.5">
              <p className="px-2 text-xs text-ink">{g.title}</p>
              <p className="px-2 pb-1 text-[11px] text-ink-soft">{g.hint}</p>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSection(it.id)}
                  aria-current={section === it.id ? 'page' : undefined}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-start text-sm transition-colors ${
                    section === it.id ? 'bg-ink text-paper' : 'hover:bg-sand/40'
                  }`}
                >
                  <span>{it.label}</span>
                  {it.count ? <span className="font-mono text-xs opacity-70">{it.count}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className="capsule min-w-0 p-4 sm:p-5">
          <ModalEmbed key={section}>{body}</ModalEmbed>
        </section>

        <aside className="capsule min-w-0 overflow-hidden lg:sticky lg:top-6" aria-label={t('معاينة مباشرة')}>
          <p className="px-4 pt-4 text-sm">{t('معاينة مباشرة')}</p>
          <p className="px-4 pb-1 text-[11px] text-ink-soft">{t('تتحدث تلقائياً بعد كل تعديل')}</p>
          <FontPreview project={project} auto initialText={SAMPLE} />
        </aside>
      </div>
    </div>
  );
};
