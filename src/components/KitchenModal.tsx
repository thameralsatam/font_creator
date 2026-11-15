import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';
import { t } from '../i18n';
import { type FontProject, type FontMetrics, type NewGlyphData } from '../types/font';
import { Modal, ModalEmbed } from './ui/Modal';
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

export type KitchenSection = 'features' | 'kerning' | 'cascade' | 'metrics' | 'info' | 'connectors';

interface KitchenModalProps {
  project: FontProject;
  initial?: KitchenSection;
  onClose: () => void;
  onUpdateProject: (patch: Partial<FontProject>) => void;
  onSaveMetrics: (updates: { metrics: FontMetrics }) => void;
  onUpdateInfo: React.ComponentProps<typeof FontInfoModal>['onSave'];
  onAddGlyphs: (items: NewGlyphData[]) => void;
  onOpenGlyph: (id: string) => void;
}

export const KitchenModal: React.FC<KitchenModalProps> = (props) => {
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

  return (
    <Modal
      title={t('مطبخ الخط')}
      subtitle={t('كل ما يضبط سلوك الخط في مكان واحد')}
      icon={<ChefHat className="h-4 w-4 stroke-[1.5]" />}
      size="2xl"
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 md:flex-row md:gap-5">
        <nav className="flex shrink-0 flex-col gap-3 md:w-52" aria-label={t('أقسام المطبخ')}>
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
        <div className="min-w-0 flex-1 md:border-s md:border-ink/10 md:ps-5">
          <ModalEmbed key={section}>{body}</ModalEmbed>
        </div>
      </div>
    </Modal>
  );
};
