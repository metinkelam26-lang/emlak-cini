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
  Instagram, // Instagram ikonu eklendi
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
  ig_paylasim_durumu: 'bekliyor', // Yeni alanın varsayılan değeri
};

// Instagram durum renkleri ve etiketleri sabitleri
const IG_DURUM_LABELS = {
  bekliyor: 'Sırada Bekliyor',
  isleniyor: 'Gönderiliyor...',
  yayinlandi: 'Instagram\'da Canlı',
  hata: 'Sıra Hatası',
};

const IG_DURUM_COLORS = {
  bekliyor: 'bg-amber-50 text-amber-700 border-amber-200',
  isleniyor: 'bg-blue-50 text-blue-700 border-blue-200',
  yayinlandi: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-transparent shadow-sm',
  hata: 'bg-rose-50 text-rose-700 border-rose-200',
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
  const [igProcessingId, setIgProcessingId] = useState<string | null>(null);

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

  // Manuel olarak ilanı tekrar Instagram sırasına sokma fonksiyonu
  const handleTriggerInstagram = async (id: string) => {
    setIgProcessingId(id);
    try {
      const { error } = await supabase
        .from('ilanlar')
        .update({ ig_paylasim_durumu: 'bekliyor', ig_hata_mesaji: null })
        .eq('id', id);
      
      if (error) throw error;
      await loadIlanlar();
    } catch (err) {
      console.error('Instagram tetikleme hatası:', err);
    } finally {
      setIgProcessingId(null);
    }
  };

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
    setForm(rest as IlanInput);
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
    await loadIlanlar();
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
  Instagram, // Instagram ikonu eklendi
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
  ig_paylasim_durumu: 'bekliyor', // Yeni alanın varsayılan değeri
};

// Instagram durum renkleri ve etiketleri sabitleri
const IG_DURUM_LABELS = {
  bekliyor: 'Sırada Bekliyor',
  isleniyor: 'Gönderiliyor...',
  yayinlandi: 'Instagram\'da Canlı',
  hata: 'Sıra Hatası',
};

const IG_DURUM_COLORS = {
  bekliyor: 'bg-amber-50 text-amber-700 border-amber-200',
  isleniyor: 'bg-blue-50 text-blue-700 border-blue-200',
  yayinlandi: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-transparent shadow-sm',
  hata: 'bg-rose-50 text-rose-700 border-rose-200',
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
  const [igProcessingId, setIgProcessingId] = useState<string | null>(null);

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

  // Manuel olarak ilanı tekrar Instagram sırasına sokma fonksiyonu
  const handleTriggerInstagram = async (id: string) => {
    setIgProcessingId(id);
    try {
      const { error } = await supabase
        .from('ilanlar')
        .update({ ig_paylasim_durumu: 'bekliyor', ig_hata_mesaji: null })
        .eq('id', id);
      
      if (error) throw error;
      await loadIlanlar();
    } catch (err) {
      console.error('Instagram tetikleme hatası:', err);
    } finally {
      setIgProcessingId(null);
    }
  };

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
    setForm(rest as IlanInput);
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
    await loadIlanlar();
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
