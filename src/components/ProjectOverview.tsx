import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Download,
  Eraser,
  FileText,
  Layers,
  Plus,
  Settings2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { type FontProject, type NewGlyphData } from '../types/font';
import { computeFeatures } from '../utils/features';
import { resolveInfo } from '../utils/fontInfo';
import { type GlyphMeta, type SortMode, isReady, sortGlyphs } from '../utils/glyphLogic';
import { FeaturesModal } from './FeaturesModal';
import { FontInfoModal, type InfoPatch } from './FontInfoModal';
import { GlyphAddModal } from './GlyphAddModal';
import { GlyphCard } from './GlyphCard';
import { GlyphEditModal } from './GlyphEditModal';
import { PresetModal } from './PresetModal';
import { HelpBookButton } from './help/HelpBook';
import { Button } from './ui/Button';
import { Dropdown, MenuItem, MenuLabel } from './ui/Dropdown';
import { Modal, ModalActions } from './ui/Modal';
import { CountChip, Progress, VersionPill } from './ui/Pill';

interface ProjectOverviewProps {
  project: FontProject;
  onBackToProjects: () => void;
  onEnterStudio: (glyphId?: string) => void;
  onOpenMetrics: () => void;
  onOpenExport: () => void;
  onAddNewGlyph: (glyphData: NewGlyphData) => void;
  onAddPreset: (items: NewGlyphData[]) => void;
  onEditGlyph: (glyphId: string, meta: GlyphMeta) => void;
  onDeleteGlyph: (glyphId: string) => void;
  onDeleteGlyphs: (glyphIds: string[]) => void;
  onDuplicateGlyph: (glyphId: string) => void;
  onUpdateInfo: (patch: InfoPatch) => void;
}

const PAGE = 60;
const icon = 'h-4 w-4 stroke-[1.5]';

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: 'ready', label: 'الجاهزة أولاً' },
  { id: 'added', label: 'حسب الإضافة' },
  { id: 'code', label: 'حسب اليونيكود' },
];

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex flex-col items-center gap-0.5 px-1">
    <span className="font-mono text-xl leading-tight sm:text-2xl">{value}</span>
    <span className="text-[11px] text-ink-soft">{label}</span>
  </div>
);

export const ProjectOverview: React.FC<ProjectOverviewProps> = (props) => {
  const { project, onBackToProjects, onEnterStudio, onOpenMetrics, onOpenExport, onUpdateInfo } = props;
  const { glyphs, metrics } = project;

  const [sort, setSort] = useState<SortMode>('ready');
  const [limit, setLimit] = useState(PAGE);
  const [showAdd, setShowAdd] = useState(false);
  const [showPreset, setShowPreset] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // الدوال المرسلة للبطاقات ثابتة حتى لا تُعاد رسم مئات البطاقات مع كل تغيير
  const latest = useRef(props);
  latest.current = props;
  const open = useCallback((id: string) => latest.current.onEnterStudio(id), []);
  const duplicate = useCallback((id: string) => latest.current.onDuplicateGlyph(id), []);

  const info = resolveInfo(project);
  const shown = useMemo(() => sortGlyphs(glyphs, sort), [glyphs, sort]);
  const notReadyIds = useMemo(() => glyphs.filter((g) => !isReady(g)).map((g) => g.id), [glyphs]);
  const ready = glyphs.length - notReadyIds.length;
  const rules = useMemo(() => computeFeatures(glyphs).rules.length, [glyphs]);
  const editing = glyphs.find((g) => g.id === editingId) ?? null;
  const deleting = glyphs.find((g) => g.id === deletingId) ?? null;
  const isEmpty = glyphs.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* الترويسة: صف واحد، كل الأزرار بحجم واحد */}
      <header className="card-flat flex items-center gap-3 rounded-2xl p-3 sm:p-4">
        <Button variant="secondary" icon title="الرجوع إلى قائمة المشاريع" onClick={onBackToProjects}>
          <ArrowRight className={icon} />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight sm:text-2xl">{project.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <VersionPill version={project.version} />
            <span dir="ltr" className="chip chip-ghost font-mono">{info.subfamily}</span>
            <span className="chip chip-ghost max-w-[10rem] truncate">{project.designer}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <HelpBookButton iconOnly />
          <Dropdown label="الإعدادات" iconOnly framed icon={<Settings2 className={icon} />} placement="bottom" width={230}>
            {(close) => (
              <>
                <MenuLabel>إعدادات الخط</MenuLabel>
                <MenuItem
                  label="معلومات الخط"
                  icon={<FileText className={icon} />}
                  onClick={() => {
                    close();
                    setShowInfo(true);
                  }}
                />
                <MenuItem
                  label="المقاييس"
                  icon={<Sliders className={icon} />}
                  onClick={() => {
                    close();
                    onOpenMetrics();
                  }}
                />
                <MenuItem
                  label="ميزات الأوبن تايب"
                  icon={<Sparkles className={icon} />}
                  hint={rules ? String(rules) : undefined}
                  onClick={() => {
                    close();
                    setShowFeatures(true);
                  }}
                />
              </>
            )}
          </Dropdown>
          <Button variant="primary" icon onClick={onOpenExport} title="تصدير الخط">
            <Download className={icon} />
          </Button>
        </div>
      </header>

      {/* الإحصائيات: بطاقة واحدة مرتبة */}
      <section className="card-flat flex flex-col gap-3.5 rounded-2xl p-4">
        <div className="grid grid-cols-4 divide-x divide-x-reverse divide-ink/10 text-center">
          <Stat label="المحارف" value={glyphs.length} />
          <Stat label="المكتمل" value={ready} />
          <Stat label="الناقص" value={notReadyIds.length} />
          <Stat label="القواعد" value={rules} />
        </div>
        <Progress value={ready} max={glyphs.length} />
      </section>

      {/* المحارف */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg">المحارف</h2>
            <CountChip value={glyphs.length} />
          </div>
          {!isEmpty && (
            <div className="flex items-center gap-1.5">
              <Dropdown label="ترتيب المحارف" iconOnly framed icon={<ArrowUpDown className={icon} />} placement="bottom" width={200}>
                {(close) => (
                  <>
                    <MenuLabel>ترتيب العرض</MenuLabel>
                    {SORTS.map((s) => (
                      <MenuItem
                        key={s.id}
                        label={s.label}
                        active={sort === s.id}
                        onClick={() => {
                          setSort(s.id);
                          setLimit(PAGE);
                          close();
                        }}
                      />
                    ))}
                  </>
                )}
              </Dropdown>
              {notReadyIds.length > 0 && (
                <span className="relative inline-flex">
                  <Button icon title={`حذف المحارف الفارغة (${notReadyIds.length})`} onClick={() => setConfirmEmpty(true)}>
                    <Eraser className={icon} />
                  </Button>
                  <span className="chip chip-solid pointer-events-none absolute -end-1.5 -top-2 h-4 min-w-4 justify-center px-1 font-mono text-[9px]">
                    {notReadyIds.length}
                  </span>
                </span>
              )}
              <Button icon title="مجموعات جاهزة" onClick={() => setShowPreset(true)}>
                <Layers className={icon} />
              </Button>
              <Button variant="primary" icon title="إضافة محرف" onClick={() => setShowAdd(true)}>
                <Plus className={icon} />
              </Button>
            </div>
          )}
        </div>

        {isEmpty ? (
          <div className="card-flat flex flex-col items-center rounded-2xl p-8 text-center sm:p-10">
            <p className="mb-1 text-base">لا توجد محارف في هذا المشروع حتى الآن</p>
            <p className="mb-4 max-w-sm text-xs leading-relaxed text-ink-soft">
              أضف محرفك الأول، أو اختر مجموعة جاهزة للبدء مباشرة في رسم خطك.
            </p>
            <div className="flex items-center gap-2.5">
              <Button variant="primary" onClick={() => setShowAdd(true)}>
                <Plus className={icon} />
                <span>إضافة محرف</span>
              </Button>
              <Button onClick={() => setShowPreset(true)}>
                <Layers className={icon} />
                <span>مجموعات جاهزة</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {shown.slice(0, limit).map((g) => (
                <GlyphCard
                  key={g.id}
                  glyph={g}
                  metrics={metrics}
                  onOpen={open}
                  onEdit={setEditingId}
                  onDuplicate={duplicate}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
            {shown.length > limit && (
              <div className="flex justify-center">
                <Button onClick={() => setLimit((n) => n + PAGE)}>
                  عرض المزيد ({shown.length - limit})
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {showAdd && <GlyphAddModal glyphs={glyphs} onAdd={props.onAddNewGlyph} onClose={() => setShowAdd(false)} />}
      {showPreset && <PresetModal existing={glyphs} onAdd={props.onAddPreset} onClose={() => setShowPreset(false)} />}
      {showInfo && <FontInfoModal project={project} onSave={onUpdateInfo} onClose={() => setShowInfo(false)} />}
      {showFeatures && (
        <FeaturesModal
          project={project}
          onAddGlyphs={props.onAddPreset}
          onOpenGlyph={(id) => {
            setShowFeatures(false);
            onEnterStudio(id);
          }}
          onClose={() => setShowFeatures(false)}
        />
      )}
      {editing && (
        <GlyphEditModal
          key={editing.id}
          glyph={editing}
          glyphs={glyphs}
          onSave={(meta) => props.onEditGlyph(editing.id, meta)}
          onClose={() => setEditingId(null)}
        />
      )}

      {deleting && (
        <Modal title="حذف المحرف" size="sm" onClose={() => setDeletingId(null)}>
          <p className="text-sm leading-7">
            سيُحذف المحرف <span dir="ltr" className="font-mono">{deleting.name}</span> مع رسمه نهائياً ولا يمكن التراجع.
          </p>
          <ModalActions>
            <Button onClick={() => setDeletingId(null)}>إلغاء</Button>
            <Button
              variant="primary"
              onClick={() => {
                props.onDeleteGlyph(deleting.id);
                setDeletingId(null);
              }}
            >
              حذف
            </Button>
          </ModalActions>
        </Modal>
      )}

      {confirmEmpty && (
        <Modal title="حذف المحارف غير المرسومة" size="sm" onClose={() => setConfirmEmpty(false)}>
          <p className="text-sm leading-7">
            سيُحذف <span className="font-mono">{notReadyIds.length}</span> محرف لم يُرسم فيه مسار مغلق بعد
            (محرف الفراغ يبقى). لا يمكن التراجع، لكن تستطيع إعادتها من المجموعات الجاهزة.
          </p>
          <ModalActions>
            <Button onClick={() => setConfirmEmpty(false)}>إلغاء</Button>
            <Button
              variant="primary"
              onClick={() => {
                props.onDeleteGlyphs(notReadyIds);
                setConfirmEmpty(false);
              }}
            >
              حذف
            </Button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
};
