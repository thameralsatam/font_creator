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
import { type Contour, type FontProject, type NewGlyphData } from '../types/font';
import { downloadTextFile } from '../utils/download';
import { projectRules } from '../utils/feaParse';
import { resolveInfo } from '../utils/fontInfo';
import { glyphToSvg, svgToGlyph } from '../utils/svgGlyph';
import { type GlyphMeta, type SortMode, isReady, sortGlyphs } from '../utils/glyphLogic';
import { FeaturesModal } from './FeaturesModal';
import { FontTestPanel } from './FontTestPanel';
import { FontInfoModal, type InfoPatch } from './FontInfoModal';
import { GlyphAddModal } from './GlyphAddModal';
import { GlyphCard } from './GlyphCard';
import { GlyphEditModal } from './GlyphEditModal';
import { PresetModal } from './PresetModal';
import { HelpBookButton } from './help/HelpBook';
import { Button } from './ui/Button';
import { Dropdown, MenuItem, MenuLabel } from './ui/Dropdown';
import { Modal, ModalActions } from './ui/Modal';
import { CountChip, VersionPill } from './ui/Pill';

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
  onUpdateProject: (patch: Partial<FontProject>) => void;
  onSetGlyphSvg: (glyphId: string, contours: Contour[], advanceWidth: number) => void;
}

const PAGE = 60;
const icon = 'h-4 w-4 stroke-[1.5]';

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: 'ready', label: 'الجاهزة أولاً' },
  { id: 'added', label: 'حسب الإضافة' },
  { id: 'code', label: 'حسب اليونيكود' },
];

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
  const [svgError, setSvgError] = useState<string | null>(null);
  const [svgPending, setSvgPending] = useState<{ id: string; contours: Contour[]; advanceWidth: number } | null>(null);
  const svgInput = useRef<HTMLInputElement>(null);
  const svgTarget = useRef<string | null>(null);

  // الدوال المرسلة للبطاقات ثابتة حتى لا تُعاد رسم مئات البطاقات مع كل تغيير
  const latest = useRef(props);
  latest.current = props;
  const open = useCallback((id: string) => latest.current.onEnterStudio(id), []);
  const duplicate = useCallback((id: string) => latest.current.onDuplicateGlyph(id), []);
  const exportSvg = useCallback((id: string) => {
    const { project: p } = latest.current;
    const g = p.glyphs.find((x) => x.id === id);
    if (g) downloadTextFile(glyphToSvg(g, p.metrics), `${g.name}.svg`, 'image/svg+xml');
  }, []);
  const importSvg = useCallback((id: string) => {
    svgTarget.current = id;
    svgInput.current?.click();
  }, []);

  const onSvgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const id = svgTarget.current;
    if (!file || !id) return;
    const res = svgToGlyph(await file.text(), metrics);
    if (!res.ok) {
      setSvgError(res.error);
      return;
    }
    const target = glyphs.find((g) => g.id === id);
    if (target && target.contours.length > 0) setSvgPending({ id, contours: res.contours, advanceWidth: res.advanceWidth });
    else props.onSetGlyphSvg(id, res.contours, res.advanceWidth);
  };

  const info = resolveInfo(project);
  const shown = useMemo(() => sortGlyphs(glyphs, sort), [glyphs, sort]);
  const notReadyIds = useMemo(() => glyphs.filter((g) => !isReady(g)).map((g) => g.id), [glyphs]);
  const ready = glyphs.length - notReadyIds.length;
  const rules = useMemo(() => projectRules({ glyphs, customFea: project.customFea }).rules.length, [glyphs, project.customFea]);
  const editing = glyphs.find((g) => g.id === editingId) ?? null;
  const deleting = glyphs.find((g) => g.id === deletingId) ?? null;
  const isEmpty = glyphs.length === 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* الترويسة */}
      <header className="capsule flex flex-col gap-2.5 p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Button variant="quiet" icon title="الرجوع إلى قائمة المشاريع" onClick={onBackToProjects}>
            <ArrowRight className={icon} />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-base sm:text-xl" title={project.name}>{project.name}</h1>
          <Dropdown label="الإعدادات" iconOnly icon={<Settings2 className={icon} />} placement="bottom" width={230}>
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
          <HelpBookButton iconOnly />
          <Button variant="primary" icon onClick={onOpenExport} title="تصدير الخط">
            <Download className={icon} />
          </Button>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
          <VersionPill version={project.version} />
          <span dir="ltr" className="chip chip-ghost font-mono">{info.subfamily}</span>
          <span className="chip chip-ghost min-w-0 max-w-full truncate" title={project.designer}>{project.designer}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'مكتمل', value: ready },
            { label: 'ناقص', value: notReadyIds.length },
            { label: 'قاعدة', value: rules },
          ].map((t) => (
            <div key={t.label} className="plate flex flex-col items-center gap-0.5 py-1.5 sm:py-2">
              <span className="font-mono text-base sm:text-lg leading-none">{t.value}</span>
              <span className="text-[10px] sm:text-[11px] text-ink-soft">{t.label}</span>
            </div>
          ))}
        </div>
      </header>

      <FontTestPanel project={project} />

      {/* المحارف */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2.5 px-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="text-base sm:text-lg">المحارف</h2>
            <CountChip value={glyphs.length} />
          </div>
          {!isEmpty && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Dropdown label="ترتيب وتنظيف" iconOnly framed icon={<ArrowUpDown className={icon} />} placement="bottom" width={210}>
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
                    {notReadyIds.length > 0 && (
                      <>
                        <MenuLabel>تنظيف</MenuLabel>
                        <MenuItem
                          label="حذف المحارف الفارغة"
                          icon={<Eraser className={icon} />}
                          hint={String(notReadyIds.length)}
                          onClick={() => {
                            close();
                            setConfirmEmpty(true);
                          }}
                        />
                      </>
                    )}
                  </>
                )}
              </Dropdown>
              <Button variant="secondary" icon title="مجموعات جاهزة" onClick={() => setShowPreset(true)}>
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
            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
              {shown.slice(0, limit).map((g) => (
                <GlyphCard
                  key={g.id}
                  glyph={g}
                  metrics={metrics}
                  onOpen={open}
                  onEdit={setEditingId}
                  onDuplicate={duplicate}
                  onDelete={setDeletingId}
                  onExportSvg={exportSvg}
                  onImportSvg={importSvg}
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
          onSaveCustomFea={(t) => props.onUpdateProject({ customFea: t })}
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

      <input ref={svgInput} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={(e) => void onSvgFile(e)} />

      {svgError && (
        <Modal title="تعذّر استيراد SVG" size="sm" onClose={() => setSvgError(null)}>
          <p className="text-sm leading-7">{svgError}</p>
          <ModalActions>
            <Button variant="primary" onClick={() => setSvgError(null)}>حسناً</Button>
          </ModalActions>
        </Modal>
      )}

      {svgPending && (
        <Modal title="استبدال الرسم" size="sm" onClose={() => setSvgPending(null)}>
          <p className="text-sm leading-7">هذا المحرف مرسوم أصلاً. سيُستبدل رسمه بمحتوى الملف ولا يمكن التراجع.</p>
          <ModalActions>
            <Button onClick={() => setSvgPending(null)}>إلغاء</Button>
            <Button
              variant="primary"
              onClick={() => {
                props.onSetGlyphSvg(svgPending.id, svgPending.contours, svgPending.advanceWidth);
                setSvgPending(null);
              }}
            >
              استبدال
            </Button>
          </ModalActions>
        </Modal>
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
