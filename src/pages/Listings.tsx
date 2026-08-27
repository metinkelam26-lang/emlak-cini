import { useEffect, useState, useCallback } from 'react';
import {
    
       

  Plus,
  Search,
  Building2,
  Edit2,
  Trash2,
  Eye,
  MapPin,
  Maximize,
  BedDouble,
  Calendar,
  Layers,
  Flame,
  Filter,
  X,
  Sparkles,
  Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Ilan, IlanInput } from '@/lib/supabase';
import { generateLocalAiForListing } from '@/lib/ai';
import {
  TUR_LABELS,
  TUR_COLORS,
  ILAN_DURUM_LABELS,
  ILAN_DURUM_COLORS,
  ODA_SECENEKLERI,
  ISITMA_TIPLERI,
  KAT_SECENEKLERI,
  formatTL,
  formatDate,
  normalizeSearchText,
} from '@/lib/constants';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import PhotoUpload from '@/components/PhotoUpload';
import BulkListingImport from '@/components/BulkListingImport';

const emptyForm: IlanInput = {
  baslik: '',
  tur: 'satilik',
  fiyat: 0,
  il: '',
  ilce: '',
  mahalle: '',
  oda_sayisi: '',
  metrekare: 0,
  bina_yasi: 0,
  bulundugu_kat: '',
  toplam_kat: 0,
  isitma_tipi: '',
  esyali: false,
  aciklama: '',
  fotograflar: [],
  durum: 'aktif',
};

export default function Listings() {
  const [ilanlar, setIlanlar] = useState<Ilan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTur, setFilterTur] = useState('');
  const [filterDurum, setFilterDurum] = useState('');
  const [filterIl, setFilterIl] = useState('');
  const [filterOda, setFilterOda] = useState('');
  const [filterFiyatMin, setFilterFiyatMin] = useState('');
  const [filterFiyatMax, setFilterFiyatMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewIlan, setViewIlan] = useState<Ilan | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<IlanInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [generatingListingId, setGeneratingListingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadIlanlar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('ilanlar')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setIlanlar(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadIlanlar();
  }, [loadIlanlar]);

  const filteredIlanlar = ilanlar.filter((ilan) => {
    const searchLower = normalizeSearchText(search);
    const matchesSearch =
      !search ||
      normalizeSearchText(ilan.baslik).includes(searchLower) ||
      normalizeSearchText(ilan.il).includes(searchLower) ||
      normalizeSearchText(ilan.ilce).includes(searchLower) ||
      normalizeSearchText(ilan.mahalle).includes(searchLower);
    const matchesTur = !filterTur || ilan.tur === filterTur;
    const matchesDurum = !filterDurum || ilan.durum === filterDurum;
    const matchesIl = !filterIl || normalizeSearchText(ilan.il).includes(normalizeSearchText(filterIl));
    const matchesOda = !filterOda || ilan.oda_sayisi === filterOda;
    const matchesFiyatMin = !filterFiyatMin || ilan.fiyat >= Number(filterFiyatMin);
    const matchesFiyatMax = !filterFiyatMax || ilan.fiyat <= Number(filterFiyatMax);
    return (
      matchesSearch &&
      matchesTur &&
      matchesDurum &&
      matchesIl &&
      matchesOda &&
      matchesFiyatMin &&
      matchesFiyatMax
    );
  });

  const handleOpenAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (ilan: Ilan) => {
    const { id, created_at, updated_at, ...rest } = ilan;
    void id;
    void created_at;
    void updated_at;
    setForm(rest);
    setEditId(ilan.id);
    setFormError(null);
    setModalOpen(true);
  };

  const handleView = (ilan: Ilan) => {
    setViewIlan(ilan);
    setViewModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.baslik.trim()) {
      setFormError('İlan başlığı zorunludur.');
      return;
    }
    if (!form.il.trim()) {
      setFormError('İl alanı zorunludur.');
      return;
    }
    if (form.fiyat < 0 || form.metrekare < 0 || form.bina_yasi < 0 || form.toplam_kat < 0) {
      setFormError('Fiyat, metrekare, bina yaşı ve toplam kat negatif olamaz.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editId) {
        const { error } = await supabase.from('ilanlar').update(form).eq('id', editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('ilanlar').insert(form).select().single();
        if (error) throw error;
        void generateLocalAiForListing(data.id);
      }
      setModalOpen(false);
      await loadIlanlar();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('ilanlar').delete().eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      await loadIlanlar();
    }
  };

  const handleGenerateListingText = async (id: string) => {
    setGeneratingListingId(id);
    await generateLocalAiForListing(id);
    setGeneratingListingId(null);
  };

  const clearFilters = () => {
    setFilterTur('');
    setFilterDurum('');
    setFilterIl('');
    setFilterOda('');
    setFilterFiyatMin('');
    setFilterFiyatMax('');
    setSearch('');
  };

  const hasActiveFilters =
    filterTur || filterDurum || filterIl || filterOda || filterFiyatMin || filterFiyatMax;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">İlanlar</h1>
          <p className="text-gray-500 text-sm mt-1">
            Toplam {ilanlar.length} ilan kayıtlı
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={() => setImportOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-teal-200 bg-teal-50 text-teal-700 rounded-lg font-medium text-sm hover:bg-teal-100 transition-colors">
            <Upload className="w-5 h-5" />
            Toplu Aktar
          </button>
          <button type="button" onClick={handleOpenAdd} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 transition-colors shadow-sm">
            <Plus className="w-5 h-5" />
            Yeni İlan Ekle
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Başlık, il, ilçe veya mahalle ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-teal-50 border-teal-200 text-teal-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtreler
            {hasActiveFilters ? (
              <span className="w-2 h-2 rounded-full bg-teal-500" />
            ) : null}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
            <select
              value={filterTur}
              onChange={(e) => setFilterTur(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Tüm Türler</option>
              <option value="satilik">Satılık</option>
              <option value="kiralik">Kiralık</option>
            </select>
            <select
              value={filterDurum}
              onChange={(e) => setFilterDurum(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Tüm Durumlar</option>
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
              <option value="satildi">Satıldı</option>
              <option value="kiralandi">Kiralandı</option>
            </select>
            <input
              type="text"
              placeholder="İl"
              value={filterIl}
              onChange={(e) => setFilterIl(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <select
              value={filterOda}
              onChange={(e) => setFilterOda(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Tüm Oda Sayıları</option>
              {ODA_SECENEKLERI.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Min Fiyat (TL)"
              value={filterFiyatMin}
              onChange={(e) => setFilterFiyatMin(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <input
              type="number"
              placeholder="Maks Fiyat (TL)"
              value={filterFiyatMax}
              onChange={(e) => setFilterFiyatMax(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Filtreleri Temizle
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-400">Yükleniyor...</div>
        </div>
      ) : filteredIlanlar.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {hasActiveFilters || search
              ? 'Arama kriterlerine uygun ilan bulunamadı'
              : 'Henüz ilan eklenmedi'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {hasActiveFilters || search
              ? 'Filtreleri değiştirmeyi deneyin'
              : 'Yeni ilan eklemek için yukarıdaki butonu kullanın'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIlanlar.map((ilan) => (
            <div
              key={ilan.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Photo */}
              <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                {ilan.fotograflar.length > 0 ? (
                  <img
                    src={ilan.fotograflar[0]}
                    alt={ilan.baslik}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  <Badge label={TUR_LABELS[ilan.tur]} className={TUR_COLORS[ilan.tur]} />
                </div>
                <div className="absolute top-2 right-2">
                  <Badge
                    label={ILAN_DURUM_LABELS[ilan.durum]}
                    className={ILAN_DURUM_COLORS[ilan.durum]}
                  />
                </div>
                {ilan.fotograflar.length > 1 && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-medium">
                    {ilan.fotograflar.length} fotoğraf
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-slate-800 text-base truncate">{ilan.baslik}</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {ilan.il} / {ilan.ilce} / {ilan.mahalle}
                  </span>
                </p>

                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  {ilan.oda_sayisi && (
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" />
                      {ilan.oda_sayisi}
                    </span>
                  )}
                  {ilan.metrekare > 0 && (
                    <span className="flex items-center gap-1">
                      <Maximize className="w-3.5 h-3.5" />
                      {ilan.metrekare} m²
                    </span>
                  )}
                  {ilan.bina_yasi > 0 && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {ilan.bina_yasi} yaş
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
                  <p className="text-lg font-bold text-teal-600">{formatTL(ilan.fiyat)}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleGenerateListingText(ilan.id)}
                      disabled={generatingListingId === ilan.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {generatingListingId === ilan.id ? 'Üretiliyor...' : 'İlan Metni Üret'}
                    </button>
                    <button
                      onClick={() => handleView(ilan)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      aria-label="Görüntüle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(ilan)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                      aria-label="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(ilan.id)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'İlan Düzenle' : 'Yeni İlan Ekle'}
        size="xl"
      >
        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İlan Başlığı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.baslik}
              onChange={(e) => setForm({ ...form, baslik: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Örn: Tepebaşı'nda 3+1 lüks daire"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
              <select
                value={form.tur}
                onChange={(e) => setForm({ ...form, tur: e.target.value as 'satilik' | 'kiralik' })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="satilik">Satılık</option>
                <option value="kiralik">Kiralık</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={form.durum}
                onChange={(e) =>
                  setForm({ ...form, durum: e.target.value as IlanInput['durum'] })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
                <option value="satildi">Satıldı</option>
                <option value="kiralandi">Kiralandı</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (TL)</label>
            <input
              type="number"
              value={form.fiyat || ''}
              onChange={(e) => setForm({ ...form, fiyat: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Örn: 5000000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İl <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.il}
                onChange={(e) => setForm({ ...form, il: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: Eskişehir"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
              <input
                type="text"
                value={form.ilce}
                onChange={(e) => setForm({ ...form, ilce: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: Tepebaşı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mahalle</label>
              <input
                type="text"
                value={form.mahalle}
                onChange={(e) => setForm({ ...form, mahalle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: Esatpaşa"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Oda Sayısı</label>
              <select
                value={form.oda_sayisi}
                onChange={(e) => setForm({ ...form, oda_sayisi: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">Seçiniz</option>
                {ODA_SECENEKLERI.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metrekare (m²)</label>
              <input
                type="number"
                value={form.metrekare || ''}
                onChange={(e) => setForm({ ...form, metrekare: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: 120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bina Yaşı</label>
              <input
                type="number"
                value={form.bina_yasi || ''}
                onChange={(e) => setForm({ ...form, bina_yasi: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Kat</label>
              <input
                type="number"
                value={form.toplam_kat || ''}
                onChange={(e) => setForm({ ...form, toplam_kat: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: 8"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bulunduğu Kat</label>
              <select
                value={form.bulundugu_kat}
                onChange={(e) => setForm({ ...form, bulundugu_kat: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">Seçiniz</option>
                {KAT_SECENEKLERI.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Isıtma Tipi</label>
              <select
                value={form.isitma_tipi}
                onChange={(e) => setForm({ ...form, isitma_tipi: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">Seçiniz</option>
                {ISITMA_TIPLERI.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eşya Durumu</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="esyali"
                  checked={form.esyali}
                  onChange={() => setForm({ ...form, esyali: true })}
                  className="text-teal-500 focus:ring-teal-400"
                />
                <span className="text-sm text-gray-700">Eşyalı</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="esyali"
                  checked={!form.esyali}
                  onChange={() => setForm({ ...form, esyali: false })}
                  className="text-teal-500 focus:ring-teal-400"
                />
                <span className="text-sm text-gray-700">Eşyasız</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="İlan hakkında ek bilgiler..."
            />
          </div>

          <PhotoUpload
            photos={form.fotograflar}
            onChange={(fotograflar) => setForm({ ...form, fotograflar })}
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row">
          {editId && (
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setDeleteId(editId);
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors sm:flex-1"
            >
              Sil
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors sm:flex-1"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 sm:flex-1"
          >
            {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="İlan Detayı"
        size="lg"
      >
        {viewIlan && (
          <div className="space-y-4">
            {viewIlan.fotograflar.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {viewIlan.fotograflar.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-lg overflow-hidden border border-gray-200"
                  >
                    <img src={url} alt={`Fotoğraf ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Badge label={TUR_LABELS[viewIlan.tur]} className={TUR_COLORS[viewIlan.tur]} />
              <Badge
                label={ILAN_DURUM_LABELS[viewIlan.durum]}
                className={ILAN_DURUM_COLORS[viewIlan.durum]}
              />
            </div>

            <h3 className="text-xl font-bold text-slate-800">{viewIlan.baslik}</h3>
            <p className="text-2xl font-bold text-teal-600">{formatTL(viewIlan.fiyat)}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <DetailItem icon={MapPin} label="Konum" value={`${viewIlan.il} / ${viewIlan.ilce} / ${viewIlan.mahalle}`} />
              <DetailItem icon={BedDouble} label="Oda Sayısı" value={viewIlan.oda_sayisi || '-'} />
              <DetailItem icon={Maximize} label="Metrekare" value={`${viewIlan.metrekare} m²`} />
              <DetailItem icon={Calendar} label="Bina Yaşı" value={`${viewIlan.bina_yasi} yıl`} />
              <DetailItem icon={Layers} label="Bulunduğu Kat" value={viewIlan.bulundugu_kat || '-'} />
              <DetailItem icon={Layers} label="Toplam Kat" value={`${viewIlan.toplam_kat}`} />
              <DetailItem icon={Flame} label="Isıtma" value={viewIlan.isitma_tipi || '-'} />
              <DetailItem
                label="Eşya Durumu"
                value={viewIlan.esyali ? 'Eşyalı' : 'Eşyasız'}
              />
            </div>

            {viewIlan.aciklama && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Açıklama</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{viewIlan.aciklama}</p>
              </div>
            )}

            <p className="text-xs text-gray-400">Eklenme tarihi: {formatDate(viewIlan.created_at)}</p>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="İlanı Sil"
        message="Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />
      {importOpen && <BulkListingImport onClose={() => setImportOpen(false)} onImported={loadIlanlar} existingListings={ilanlar} />}
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-3 bg-gray-50 rounded-lg">
      <span className="text-xs text-gray-400 flex items-center gap-1">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}
