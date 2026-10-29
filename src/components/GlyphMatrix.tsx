import React, { useState } from 'react';
import { Search, Plus, Filter, ArrowUpRight } from 'lucide-react';
import { Glyph } from '../types/font';

interface GlyphMatrixProps {
  glyphs: Glyph[];
  selectedGlyphId: string;
  onSelectGlyph: (glyphId: string) => void;
  onAddNewGlyph: (newGlyph: { char: string; name: string; unicode: string; category: Glyph['category'] }) => void;
}

export const GlyphMatrix: React.FC<GlyphMatrixProps> = ({
  glyphs,
  selectedGlyphId,
  onSelectGlyph,
  onAddNewGlyph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new glyph
  const [newChar, setNewChar] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnicode, setNewUnicode] = useState('');
  const [newCat, setNewCat] = useState<Glyph['category']>('letter');

  const filteredGlyphs = glyphs.filter((g) => {
    const matchesSearch =
      g.char.includes(searchQuery) ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.unicode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || g.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCreateGlyph = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChar) return;
    onAddNewGlyph({
      char: newChar,
      name: newName || `uni${newChar.charCodeAt(0).toString(16).toUpperCase()}`,
      unicode: newUnicode || `U+${newChar.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
      category: newCat,
    });
    setNewChar('');
    setNewName('');
    setNewUnicode('');
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#183630]/15 bg-[#E3DAC9] p-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-[1.5] text-[#183630]/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالحرف، الاسم أو رمز اليونيكود..."
            className="w-full rounded border border-[#183630]/20 bg-transparent pr-8 pl-3 py-1.5 text-xs font-light text-[#183630] placeholder-[#183630]/40 focus:outline-none focus:border-[#183630]"
          />
        </div>

        {/* Categories Filter */}
        <div className="flex items-center gap-1 rounded border border-[#183630]/15 bg-[#E5C690]/15 p-0.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded px-2.5 py-1 text-xs font-light transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/35'
            }`}
          >
            الكل ({glyphs.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('letter')}
            className={`rounded px-2.5 py-1 text-xs font-light transition-colors ${
              selectedCategory === 'letter'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/35'
            }`}
          >
            حروف
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('ligature')}
            className={`rounded px-2.5 py-1 text-xs font-light transition-colors ${
              selectedCategory === 'ligature'
                ? 'bg-[#183630] text-[#E3DAC9]'
                : 'text-[#183630] hover:bg-[#E5C690]/35'
            }`}
          >
            تراكيب
          </button>
        </div>

        {/* Add New Glyph Button */}
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded bg-[#183630] px-3 py-1.5 text-xs font-light text-[#E3DAC9] transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
          <span>محرف جديد</span>
        </button>
      </div>

      {/* Glyphs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredGlyphs.map((glyph) => {
          const isSelected = glyph.id === selectedGlyphId;
          return (
            <div
              key={glyph.id}
              onClick={() => onSelectGlyph(glyph.id)}
              className={`group flex flex-col items-center justify-between p-4 rounded-md border cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#183630] bg-[#E5C690]/25 shadow-xs'
                  : 'border-[#183630]/15 bg-[#E3DAC9] hover:border-[#183630]/35 hover:bg-[#E5C690]/15'
              }`}
            >
              {/* Top metadata */}
              <div className="w-full flex items-center justify-between text-[10px] font-mono text-[#183630]/60">
                <span>{glyph.unicode}</span>
                <span className="text-[9px] uppercase tracking-wider">{glyph.category}</span>
              </div>

              {/* Glyph display */}
              <div className="my-4 flex items-center justify-center h-16 w-full">
                <span className="font-heading text-4xl text-[#183630] transition-transform group-hover:scale-105">
                  {glyph.char}
                </span>
              </div>

              {/* Bottom metadata */}
              <div className="w-full flex items-center justify-between pt-2 border-t border-[#183630]/10 text-[11px] text-[#183630]">
                <span className="font-mono text-xs">{glyph.name}</span>
                <span className="text-[10px] font-light text-[#183630]/70 flex items-center gap-0.5">
                  <span>{glyph.advanceWidth}u</span>
                  <ArrowUpRight className="h-3 w-3 stroke-[1.5] opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Glyph Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183630]/30 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-md border border-[#183630]/20 bg-[#E3DAC9] p-5 shadow-lg">
            <h3 className="font-heading text-base font-normal text-[#183630] mb-3">
              إضافة محرف جديد إلى جدول الخط
            </h3>
            <form onSubmit={handleCreateGlyph} className="space-y-3">
              <div>
                <label className="block text-xs font-light text-[#183630]/80 mb-1">
                  المحرف أو الرمز:
                </label>
                <input
                  type="text"
                  maxLength={2}
                  required
                  value={newChar}
                  onChange={(e) => {
                    const c = e.target.value;
                    setNewChar(c);
                    if (c && !newName) {
                      setNewName(`uni${c.charCodeAt(0).toString(16).toUpperCase()}`);
                      setNewUnicode(`U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
                    }
                  }}
                  placeholder="مثال: ق"
                  className="w-full rounded border border-[#183630]/20 bg-transparent px-3 py-1.5 text-sm font-heading text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/80 mb-1">
                  اسم المحرف (PostScript Glyph Name):
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="مثال: qaf"
                  className="w-full rounded border border-[#183630]/20 bg-transparent px-3 py-1.5 text-xs font-mono text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/80 mb-1">
                  نقطة اليونيكود (Unicode):
                </label>
                <input
                  type="text"
                  value={newUnicode}
                  onChange={(e) => setNewUnicode(e.target.value)}
                  placeholder="مثال: U+0642"
                  className="w-full rounded border border-[#183630]/20 bg-transparent px-3 py-1.5 text-xs font-mono text-[#183630] focus:outline-none focus:border-[#183630]"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-[#183630]/80 mb-1">
                  التصنيف:
                </label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as Glyph['category'])}
                  className="w-full rounded border border-[#183630]/20 bg-transparent px-3 py-1.5 text-xs font-light text-[#183630] focus:outline-none"
                >
                  <option value="letter">حرف هجائي</option>
                  <option value="ligature">تركيب / مدة</option>
                  <option value="diacritic">علامة تشكيل</option>
                  <option value="number">رقم</option>
                  <option value="symbol">رمز</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#183630]/15">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded border border-[#183630]/20 px-3 py-1.5 text-xs font-light text-[#183630] hover:bg-[#E5C690]/25"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded bg-[#183630] px-4 py-1.5 text-xs font-light text-[#E3DAC9] hover:opacity-90"
                >
                  إضافة للمشروع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
