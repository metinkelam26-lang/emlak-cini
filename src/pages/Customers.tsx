import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  BedDouble,
  Maximize,
  Wallet,
  Filter,
  X,
  Building2,
  Sparkles,
  Check,
  XCircle,
  Send,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Musteri, MusteriInput, Ilan, MusteriIlanEtkilesimi } from '@/lib/supabase';
import { generateLocalAiForCustomer, generateAiForNewCustomer } from '@/lib/ai';
import {
  MUSTERI_TIP_LABELS,
  MUSTERI_TIP_COLORS,
  MUSTERI_DURUM_LABELS,
  MUSTERI_DURUM_COLORS,
  ODA_SECENEKLERI,
  formatTL,
  formatDate,
  normalizeSearchText,
} from '@/lib/constants';
import { getMatchLabel, getMatchBadgeClass } from '@/lib/matching';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';

const emptyForm: MusteriInput = {
  ad_soyad: '',
  telefon: '',
  eposta: '',
  tip: 'alici',
  butce_min: 0,
  butce_max: 0,
  istenen_ilce: '',
  istenen_mahalle: '',
  istenen_oda_sayisi: '',
  min_metrekare: 0,
  max_metrekare: 0,
  ilan_tercihi: 'satilik',
  notlar: '',
  durum: 'yeni',
};

export default function Customers() {
  const [musteriler, setMusteriler] = useState<Musteri[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterTip, setFilterTip] = useState('');
  const [filterDurum, setFilterDurum] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewMusteri, setViewMusteri] = useState<Musteri | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MusteriInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Matching state
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchMusteri, setMatchMusteri] = useState<Musteri | null>(null);
  const [allIlanlar, setAllIlanlar] = useState<Ilan[]>([]);
  const [rpcMatchResults, setRpcMatchResults] = useState<Array<{
    ilan_id: string;
    eslesme_puani: number;
    eslesme_nedenleri: string[];
  }>>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [interactionSaving, setInteractionSaving] = useState<string | null>(null);
  const [interactionMessage, setInteractionMessage] = useState<string | null>(null);
  const [customerHistory, setCustomerHistory] = useState<(MusteriIlanEtkilesimi & { ilan?: { baslik: string } | null })[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadMusteriler = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('musteriler')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setMusteriler(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMusteriler();
  }, [loadMusteriler]);

  const filteredMusteriler = musteriler.filter((m) => {
    const searchLower = normalizeSearchText(search);
    const matchesSearch =
      !search ||
      normalizeSearchText(m.ad_soyad).includes(searchLower) ||
      m.telefon.includes(search) ||
      normalizeSearchText(m.eposta).includes(searchLower);
    const matchesTip = !filterTip || m.tip === filterTip;
    const matchesDurum = !filterDurum || m.durum === filterDurum;
    return matchesSearch && matchesTip && matchesDurum;
  });

  const handleOpenAdd = () => {
    setForm({ ...emptyForm });
    setEditId(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (m: Musteri) => {
    const { id, created_at, updated_at, ...rest } = m;
    void id;
    void created_at;
    void updated_at;
    setForm(rest);
    setEditId(m.id);
    setFormError(null);
    setModalOpen(true);
  };

  const handleView = (m: Musteri) => {
    setViewMusteri(m);
    setHistoryLoading(true);
    void supabase.from('musteri_ilan_etkilesimleri').select('*, ilan:ilanlar(baslik)').eq('musteri_id', m.id).order('created_at', { ascending: false }).then(({ data, error: historyError }) => {
      if (historyError) setError(historyError.message);
      setCustomerHistory(data || []);
      setHistoryLoading(false);
    });
    setViewModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.ad_soyad.trim()) {
      setFormError('Ad soyad zorunludur.');
      return;
    }
    if ([form.butce_min, form.butce_max, form.min_metrekare, form.max_metrekare].some((value) => value < 0)) {
      setFormError('Bütçe ve metrekare değerleri negatif olamaz.');
      return;
    }
    if (form.butce_min > 0 && form.butce_max > 0 && form.butce_min > form.butce_max) {
      setFormError('Minimum bütçe maksimum bütçeden büyük olamaz.');
      return;
    }
    if (form.min_metrekare > 0 && form.max_metrekare > 0 && form.min_metrekare > form.max_metrekare) {
      setFormError('Minimum metrekare maksimum metrekareden büyük olamaz.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload = {
        ...form,
        ad_soyad: form.ad_soyad.trim(),
        telefon: form.telefon.trim(),
        eposta: form.eposta.trim(),
      };
      if (editId) {
        const { error } = await supabase.from('musteriler').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('musteriler').insert(payload).select().single();
        if (error) throw error;
        void generateLocalAiForCustomer(data.id);
      }
      setModalOpen(false);
      await loadMusteriler();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('musteriler').delete().eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      await loadMusteriler();
    }
  };

  const handleShowMatches = async (m: Musteri) => {
    setMatchMusteri(m);
    setMatchModalOpen(true);
    setMatchLoading(true);
    const { data: rpcData, error: rpcError } = await supabase.rpc('musteriye_uygun_ilanlar', {
      p_musteri_id: m.id,
      p_limit: 20,
    });
    if (rpcError) {
      setError(rpcError.message);
      setAllIlanlar([]);
      setRpcMatchResults([]);
      setMatchLoading(false);
      return;
    }

    if (!rpcData || rpcData.length === 0) {
      setAllIlanlar([]);
      setRpcMatchResults([]);
      setMatchLoading(false);
      return;
    }

    // RPC sonucundaki ilan_id'leri topla
    const ilanIds = rpcData.map((row: { ilan_id: string }) => row.ilan_id);

    // İlanları tam kayıt olarak çek
    const { data: ilanlarData, error: ilanlarError } = await supabase
      .from('ilanlar')
      .select('*')
      .in('id', ilanIds);

    if (ilanlarError) {
      setError(ilanlarError.message);
      setAllIlanlar([]);
      setRpcMatchResults([]);
      setMatchLoading(false);
      return;
    }

    // Map ile eşleştir
    const ilanMap = new Map<string, Ilan>();
    (ilanlarData || []).forEach((ilan) => {
      ilanMap.set(ilan.id, ilan);
    });

    // RPC sıralamasını koru
    const matchedIlanlar: Ilan[] = rpcData
      .map((row: { ilan_id: string }) => ilanMap.get(row.ilan_id))
      .filter((ilan): ilan is Ilan => ilan !== undefined);

    setAllIlanlar(matchedIlanlar);
    setRpcMatchResults(rpcData);
    setMatchLoading(false);
  };

  const matchResults = matchMusteri
    ? allIlanlar.map((ilan) => {
        const rpcRow = rpcMatchResults.find((row) => row.ilan_id === ilan.id);
        const score = rpcRow?.eslesme_puani ?? 0;
        const reasons = (rpcRow?.eslesme_nedenleri ?? []).map((label: string) => ({
          label,
          met: true,
        }));
        return {
          ilan,
          score,
          reasons,
          budgetDistance: 0,
          areaDistance: 0,
        };
      })
    : [];

  const recordInteraction = async (ilanId: string, aksiyon: 'gosterildi' | 'teklif_edildi') => {
    if (!matchMusteri) return;
    const key = `${ilanId}:${aksiyon}`;
    setInteractionSaving(key);
    setInteractionMessage(null);
    const { error: interactionError } = await supabase.from('musteri_ilan_etkilesimleri').insert({
      musteri_id: matchMusteri.id,
      ilan_id: ilanId,
      aksiyon,
    });
    if (interactionError) setInteractionMessage(interactionError.message);
    else setInteractionMessage(aksiyon === 'gosterildi' ? 'İlan gösterimi geçmişe kaydedildi.' : 'Teklif geçmişe kaydedildi.');
    setInteractionSaving(null);
  };

  const clearFilters = () => {
    setFilterTip('');
    setFilterDurum('');
    setSearch('');
  };

  const hasActiveFilters = filterTip || filterDurum;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Müşteriler</h1>
          <p className="text-gray-500 text-sm mt-1">
            Toplam {musteriler.length} müşteri kayıtlı
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Yeni Müşteri Ekle
        </button>
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
              placeholder="Ad, telefon veya e-posta ara..."
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
            {hasActiveFilters ? <span className="w-2 h-2 rounded-full bg-teal-500" /> : null}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <select
              value={filterTip}
              onChange={(e) => setFilterTip(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Tüm Müşteri Tipleri</option>
              <option value="alici">Alıcı</option>
              <option value="kiraci">Kiracı</option>
              <option value="satici">Satıcı</option>
              <option value="ev_sahibi">Ev Sahibi</option>
            </select>
            <select
              value={filterDurum}
              onChange={(e) => setFilterDurum(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Tüm Durumlar</option>
              <option value="yeni">Yeni</option>
              <option value="aktif">Aktif</option>
              <option value="beklemede">Beklemede</option>
              <option value="tamamlandi">Tamamlandı</option>
            </select>
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

      {/* Customer Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-400">Yükleniyor...</div>
        </div>
      ) : filteredMusteriler.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {hasActiveFilters || search
              ? 'Arama kriterlerine uygun müşteri bulunamadı'
              : 'Henüz müşteri eklenmedi'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {hasActiveFilters || search
              ? 'Filtreleri değiştirmeyi deneyin'
              : 'Yeni müşteri eklemek için yukarıdaki butonu kullanın'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMusteriler.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-teal-700 font-bold text-sm">
                      {m.ad_soyad.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{m.ad_soyad}</h3>
                    <p className="text-xs text-gray-400">{m.telefon}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge label={MUSTERI_TIP_LABELS[m.tip]} className={MUSTERI_TIP_COLORS[m.tip]} />
                <Badge
                  label={m.ilan_tercihi === 'satilik' ? 'Satılık' : 'Kiralık'}
                  className={m.ilan_tercihi === 'satilik' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-sky-50 text-sky-700 border-sky-200'}
                />
                <Badge
                  label={MUSTERI_DURUM_LABELS[m.durum]}
                  className={MUSTERI_DURUM_COLORS[m.durum]}
                />
              </div>

              <div className="space-y-1.5 text-xs text-gray-500">
                {m.butce_max > 0 && (
                  <p className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5" />
                    {formatTL(m.butce_min)} - {formatTL(m.butce_max)}
                  </p>
                )}
                {m.istenen_ilce && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {m.istenen_ilce}
                    {m.istenen_mahalle ? ` / ${m.istenen_mahalle}` : ''}
                  </p>
                )}
                {m.istenen_oda_sayisi && (
                  <p className="flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5" />
                    {m.istenen_oda_sayisi}
                  </p>
                )}
                {m.min_metrekare > 0 && (
                  <p className="flex items-center gap-1.5">
                    <Maximize className="w-3.5 h-3.5" />
                    {m.min_metrekare}
                    {m.max_metrekare > 0 ? ` - ${m.max_metrekare}` : ''} m²
                  </p>
                )}
              </div>

              <div className="flex gap-1 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleShowMatches(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-teal-50 text-teal-600 text-xs font-medium hover:bg-teal-100 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Eşleşen İlanlar
                </button>
                <button
                  onClick={() => handleView(m)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="Görüntüle"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEdit(m)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
                  aria-label="Düzenle"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(m.id)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  aria-label="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
        size="lg"
      >
        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Soyad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.ad_soyad}
              onChange={(e) => setForm({ ...form, ad_soyad: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Örn: Ahmet Yılmaz"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="text"
                value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: 0555 123 45 67"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                value={form.eposta}
                onChange={(e) => setForm({ ...form, eposta: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: ahmet@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Tipi</label>
              <select
                value={form.tip}
                onChange={(e) => setForm({ ...form, tip: e.target.value as MusteriInput['tip'] })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="alici">Alıcı</option>
                <option value="kiraci">Kiracı</option>
                <option value="satici">Satıcı</option>
                <option value="ev_sahibi">Ev Sahibi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İlan Tercihi</label>
              <select
                value={form.ilan_tercihi}
                onChange={(e) =>
                  setForm({ ...form, ilan_tercihi: e.target.value as MusteriInput['ilan_tercihi'] })
                }
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
                  setForm({ ...form, durum: e.target.value as MusteriInput['durum'] })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="yeni">Yeni</option>
                <option value="aktif">Aktif</option>
                <option value="beklemede">Beklemede</option>
                <option value="tamamlandi">Tamamlandı</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bütçe Minimum (TL)
              </label>
              <input
                type="number"
                value={form.butce_min || ''}
                onChange={(e) => setForm({ ...form, butce_min: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: 2000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bütçe Maksimum (TL)
              </label>
              <input
                type="number"
                value={form.butce_max || ''}
                onChange={(e) => setForm({ ...form, butce_max: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: 5000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İstediği İlçe</label>
              <input
                type="text"
                value={form.istenen_ilce}
                onChange={(e) => setForm({ ...form, istenen_ilce: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: Tepebaşı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İstediği Mahalle</label>
              <input
                type="text"
                value={form.istenen_mahalle}
                onChange={(e) => setForm({ ...form, istenen_mahalle: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: Esatpaşa"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İstediği Oda Sayısı
              </label>
              <select
                value={form.istenen_oda_sayisi}
                onChange={(e) => setForm({ ...form, istenen_oda_sayisi: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Metrekare (m²)
              </label>
              <input
                type="number"
                value={form.min_metrekare || ''}
                onChange={(e) => setForm({ ...form, min_metrekare: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: 100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maksimum Metrekare (m²)
              </label>
              <input
                type="number"
                value={form.max_metrekare || ''}
                onChange={(e) => setForm({ ...form, max_metrekare: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Örn: 200"
              />
            </div>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar/Talep</label>
            <textarea
              value={form.notlar}
              onChange={(e) => setForm({ ...form, notlar: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="Müşteri hakkında ek bilgiler..."
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 mt-6 pt-4 border-t border-gray-100 sm:flex-row">
          {editId && (
            <button
              onClick={() => {
                setModalOpen(false);
                setDeleteId(editId);
              }}
              className="flex-1 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Sil
            </button>
          )}
          <button
            onClick={() => setModalOpen(false)}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Müşteri Detayı"
        size="lg"
      >
        {viewMusteri && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center">
                <span className="text-teal-700 font-bold text-xl">
                  {viewMusteri.ad_soyad.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{viewMusteri.ad_soyad}</h3>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge
                    label={MUSTERI_TIP_LABELS[viewMusteri.tip]}
                    className={MUSTERI_TIP_COLORS[viewMusteri.tip]}
                  />
                  <Badge
                    label={viewMusteri.ilan_tercihi === 'satilik' ? 'Satılık' : 'Kiralık'}
                    className={viewMusteri.ilan_tercihi === 'satilik' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-sky-50 text-sky-700 border-sky-200'}
                  />
                  <Badge
                    label={MUSTERI_DURUM_LABELS[viewMusteri.durum]}
                    className={MUSTERI_DURUM_COLORS[viewMusteri.durum]}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {viewMusteri.telefon && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-slate-700">{viewMusteri.telefon}</span>
                </div>
              )}
              {viewMusteri.eposta && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-slate-700 truncate">{viewMusteri.eposta}</span>
                </div>
              )}
              {viewMusteri.butce_max > 0 && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <span className="text-slate-700">
                    {formatTL(viewMusteri.butce_min)} - {formatTL(viewMusteri.butce_max)}
                  </span>
                </div>
              )}
              {viewMusteri.istenen_ilce && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-slate-700">
                    {viewMusteri.istenen_ilce}
                    {viewMusteri.istenen_mahalle ? ` / ${viewMusteri.istenen_mahalle}` : ''}
                  </span>
                </div>
              )}
              {viewMusteri.istenen_oda_sayisi && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <BedDouble className="w-4 h-4 text-gray-400" />
                  <span className="text-slate-700">{viewMusteri.istenen_oda_sayisi}</span>
                </div>
              )}
              {viewMusteri.min_metrekare > 0 && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Maximize className="w-4 h-4 text-gray-400" />
                  <span className="text-slate-700">
                    {viewMusteri.min_metrekare}
                    {viewMusteri.max_metrekare > 0 ? ` - ${viewMusteri.max_metrekare}` : ''} m²
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-slate-700">
                  İlan Tercihi: {viewMusteri.ilan_tercihi === 'satilik' ? 'Satılık' : 'Kiralık'}
                </span>
              </div>
            </div>

            {viewMusteri.notlar && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Notlar</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap p-3 bg-gray-50 rounded-lg">
                  {viewMusteri.notlar}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Eklenme tarihi: {formatDate(viewMusteri.created_at)}
            </p>

            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">İlan gösterim ve teklif geçmişi</h4>
              {historyLoading ? <p className="text-sm text-gray-400">Geçmiş yükleniyor...</p> : customerHistory.length === 0 ? <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Henüz gösterim veya teklif kaydı yok.</p> : <div className="space-y-2">{customerHistory.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm"><div><p className="font-medium text-slate-700">{item.ilan?.baslik || 'İlan silinmiş'}</p><p className="text-xs text-gray-400">{formatDate(item.created_at)}</p></div><Badge label={item.aksiyon === 'teklif_edildi' ? 'Teklif edildi' : 'Gösterildi'} className={item.aksiyon === 'teklif_edildi' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-100 text-gray-600 border-gray-200'} /></div>)}</div>}
            </div>

            <button
              onClick={() => {
                setViewModalOpen(false);
                handleShowMatches(viewMusteri);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Eşleşen İlanları Göster
            </button>
          </div>
        )}
      </Modal>

      {/* Matching Modal */}
      <Modal
        open={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        title="Eşleşen İlanlar"
        size="xl"
      >
        {matchMusteri && (
          <div className="space-y-4">
            <div className="bg-teal-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-slate-800">{matchMusteri.ad_soyad}</span> için
                uygunluk analizi
              </p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                {matchMusteri.butce_max > 0 && (
                  <span>Bütçe: {formatTL(matchMusteri.butce_min)} - {formatTL(matchMusteri.butce_max)}</span>
                )}
                {matchMusteri.istenen_ilce && <span>İlçe: {matchMusteri.istenen_ilce}</span>}
                {matchMusteri.istenen_mahalle && (
                  <span>Mahalle: {matchMusteri.istenen_mahalle}</span>
                )}
                {matchMusteri.istenen_oda_sayisi && (
                  <span>Oda: {matchMusteri.istenen_oda_sayisi}</span>
                )}
                {matchMusteri.min_metrekare > 0 && (
                  <span>
                    m²: {matchMusteri.min_metrekare}
                    {matchMusteri.max_metrekare > 0 ? ` - ${matchMusteri.max_metrekare}` : ''}
                  </span>
                )}
                <span>Tercih: {matchMusteri.ilan_tercihi === 'satilik' ? 'Satılık' : 'Kiralık'}</span>
              </div>
            </div>

            {matchLoading ? (
              <div className="text-center py-8 text-gray-400">İlanlar yükleniyor...</div>
            ) : matchResults.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Uygun ilan bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {interactionMessage && <div className="rounded-lg bg-teal-50 p-3 text-sm text-teal-700">{interactionMessage}</div>}
                {matchResults.map((result) => {
                  const matchLabel = getMatchLabel(result.score);
                  return (
                    <div
                      key={result.ilan.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {result.ilan.fotograflar.length > 0 ? (
                            <img
                              src={result.ilan.fotograflar[0]}
                              alt={result.ilan.baslik}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-800 text-sm truncate">
                            {result.ilan.baslik}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {result.ilan.il} / {result.ilan.ilce} / {result.ilan.mahalle}
                          </p>
                          <p className="text-sm font-bold text-teal-600 mt-1">
                            {formatTL(result.ilan.fiyat)}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full ${matchLabel.bg} transition-all`}
                                style={{ width: `${result.score}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold ${matchLabel.color}`}>
                              %{result.score}
                            </span>
                          </div>
                          <Badge
                            label={matchLabel.label}
                            className={getMatchBadgeClass(result.score)}
                          />
                        </div>
                      </div>

                      {/* Match reasons */}
                      {result.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                          {result.reasons.map((reason, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                reason.met
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-red-50 text-red-500'
                              }`}
                            >
                              {reason.met ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {reason.label}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button type="button" onClick={() => void recordInteraction(result.ilan.id, 'gosterildi')} disabled={interactionSaving !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Check className="w-3.5 h-3.5" /> Gösterildi</button>
                        <button type="button" onClick={() => void recordInteraction(result.ilan.id, 'teklif_edildi')} disabled={interactionSaving !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"><Send className="w-3.5 h-3.5" /> Teklif edildi</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Müşteriyi Sil"
        message="Bu müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />
    </div>
  );
}
