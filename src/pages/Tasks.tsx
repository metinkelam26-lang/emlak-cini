import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  Plus,
  ListTodo,
  Edit2,
  Trash2,
  Clock,
  User,
  Building2,
  Filter,
  X,
  CheckCircle2,
  Circle,
  AlertTriangle,
  PhoneCall,
  CalendarClock,
  StickyNote,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { GorevWithRelations, GorevInput, Musteri, Ilan } from '@/lib/supabase';
import {
  GOREV_DURUM_LABELS,
  GOREV_DURUM_COLORS,
  GOREV_ONCELIK_LABELS,
  GOREV_ONCELIK_COLORS,
  formatDateShort,
  getLocalTodayISO,
} from '@/lib/constants';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Page } from '@/components/Layout';

const emptyForm: GorevInput = {
  baslik: '',
  aciklama: '',
  son_tarih: getLocalTodayISO(),
  saat: '',
  oncelik: 'orta',
  durum: 'acik',
  musteri_id: null,
  ilan_id: null,
};

// "+ Ekle" seçim ekranındaki görev türleri; gorevler tablosunda karşılığı yoktur, sadece varsayılan alan ataması içindir.
type TaskKind = 'takip' | 'not';

type TasksProps = {
  onNavigate: (page: Page) => void;
  /** Layout'taki + Ekle düğmesinden tek seferlik picker açma sinyali. */
  autoOpenPicker?: boolean;
  onAutoOpenHandled?: () => void;
};

export default function Tasks({ onNavigate, autoOpenPicker, onAutoOpenHandled }: TasksProps) {
  const [gorevler, setGorevler] = useState<GorevWithRelations[]>([]);
  const [musteriler, setMusteriler] = useState<Musteri[]>([]);
  const [ilanlar, setIlanlar] = useState<Ilan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDurum, setFilterDurum] = useState('');
  const [filterOncelik, setFilterOncelik] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [taskKind, setTaskKind] = useState<TaskKind | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<GorevInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadGorevler = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('gorevler')
      .select('*, musteri:musteriler(*), ilan:ilanlar(*)')
      .order('son_tarih', { ascending: true })
      .order('saat', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setGorevler(data || []);
    }
    setLoading(false);
  }, []);

  const loadOptions = useCallback(async () => {
    const [musteriRes, ilanRes] = await Promise.all([
      supabase.from('musteriler').select('*').order('ad_soyad', { ascending: true }),
      supabase.from('ilanlar').select('*').order('baslik', { ascending: true }),
    ]);
    const failedResult = [musteriRes, ilanRes].find((result) => result.error);
    if (failedResult?.error) {
      setError(failedResult.error.message);
      return;
    }
    setMusteriler(musteriRes.data || []);
    setIlanlar(ilanRes.data || []);
  }, []);

  useEffect(() => {
    loadGorevler();
    loadOptions();
  }, [loadGorevler, loadOptions]);

  const today = getLocalTodayISO();

  const filteredGorevler = gorevler.filter((g) => {
    const matchesDurum = !filterDurum || g.durum === filterDurum;
    const matchesOncelik = !filterOncelik || g.oncelik === filterOncelik;
    return matchesDurum && matchesOncelik;
  });

  const geciken = filteredGorevler.filter((g) => g.durum === 'acik' && g.son_tarih < today);
  const bugun = filteredGorevler.filter((g) => g.durum === 'acik' && g.son_tarih === today);
  const yaklasan = filteredGorevler.filter((g) => g.durum === 'acik' && g.son_tarih > today);
  const kapanan = filteredGorevler.filter((g) => g.durum !== 'acik');

  const handleOpenAdd = () => {
    setPickerOpen(true);
  };

  useEffect(() => {
    if (!autoOpenPicker) return;
    handleOpenAdd();
    onAutoOpenHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenPicker]);

  const handleSelectKind = (kind: TaskKind) => {
    setForm({
      ...emptyForm,
      son_tarih: getLocalTodayISO(),
      oncelik: kind === 'takip' ? 'orta' : 'dusuk',
    });
    setTaskKind(kind);
    setEditId(null);
    setFormError(null);
    setPickerOpen(false);
    setModalOpen(true);
  };

  const handleSelectRandevu = () => {
    setPickerOpen(false);
    onNavigate('randevular');
  };

  const applyQuickTemplate = (template: string) => {
    setForm((current) => ({
      ...current,
      baslik: template,
    }));
  };

  const handleOpenEdit = (g: GorevWithRelations) => {
    setForm({
      baslik: g.baslik,
      aciklama: g.aciklama,
      son_tarih: g.son_tarih,
      saat: g.saat,
      oncelik: g.oncelik,
      durum: g.durum,
      musteri_id: g.musteri_id,
      ilan_id: g.ilan_id,
    });
    setTaskKind(null);
    setEditId(g.id);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.baslik.trim()) {
      setFormError('Görev başlığı zorunludur.');
      return;
    }
    if (!form.son_tarih) {
      setFormError('Son tarih zorunludur.');
      return;
    }
    if (taskKind === 'takip' && !form.musteri_id) {
      setFormError('Müşteri zorunludur.');
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload: GorevInput = {
      ...form,
      baslik: form.baslik.trim(),
      aciklama: form.aciklama.trim(),
    };

    const duplicate = gorevler.some(
      (task) =>
        task.id !== editId &&
        task.baslik.trim().toLowerCase() === payload.baslik.toLowerCase() &&
        task.son_tarih === payload.son_tarih &&
        task.musteri_id === payload.musteri_id &&
        task.ilan_id === payload.ilan_id,
    );

    if (duplicate && (editId || taskKind !== 'takip')) {
      setSaving(false);
      setFormError('Aynı görev daha önce kaydedilmiş. Lütfen farklı bir başlık veya tarih seçin.');
      return;
    }

    try {
      if (editId) {
        const { error } = await supabase.from('gorevler').update(payload).eq('id', editId);
        if (error) throw error;
      } else if (taskKind === 'takip') {
        const { error } = await supabase.rpc('takip_olustur', {
          p_musteri_id: form.musteri_id,
          p_sonraki_aksiyon: form.baslik.trim(),
          p_son_tarih: form.son_tarih,
          p_aciklama: form.aciklama.trim(),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('gorevler').insert(payload);
        if (error) throw error;
      }
      setModalOpen(false);
      if (taskKind === 'takip') setForm({ ...emptyForm, son_tarih: getLocalTodayISO() });
      await loadGorevler();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('gorevler').delete().eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      await loadGorevler();
    }
  };

  const handleToggleComplete = async (g: GorevWithRelations) => {
    const nextDurum = g.durum === 'acik' ? 'tamamlandi' : 'acik';
    const { error } = await supabase.from('gorevler').update({ durum: nextDurum }).eq('id', g.id);
    if (error) {
      setError(error.message);
    } else {
      await loadGorevler();
    }
  };

  const hasActiveFilters = filterDurum || filterOncelik;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Görevler</h1>
          <p className="text-gray-500 text-sm mt-1">
            {geciken.length} geciken · {bugun.length} bugün · {gorevler.length} toplam
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          + Ekle
        </button>
      </div>

      <button
        type="button"
        onClick={handleOpenAdd}
        className="fixed bottom-5 right-5 z-[120] flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(16,185,129,0.38)] ring-4 ring-white/90 transition-all duration-200 hover:scale-105 hover:shadow-[0_20px_40px_rgba(16,185,129,0.45)] active:scale-95"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
          <Plus className="w-4 h-4" />
        </span>
        <span>+ Ekle</span>
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtrele
              {hasActiveFilters ? <span className="w-2 h-2 rounded-full bg-teal-500" /> : null}
            </button>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterDurum('');
                  setFilterOncelik('');
                }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Temizle
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-gray-100">
            <select
              value={filterDurum}
              onChange={(e) => setFilterDurum(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Tüm Durumlar</option>
              <option value="acik">Açık</option>
              <option value="tamamlandi">Tamamlandı</option>
              <option value="iptal">İptal</option>
            </select>
            <select
              value={filterOncelik}
              onChange={(e) => setFilterOncelik(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Tüm Öncelikler</option>
              <option value="yuksek">Yüksek</option>
              <option value="orta">Orta</option>
              <option value="dusuk">Düşük</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
      ) : (
        <>
          <GorevSection
            title="Geciken"
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            items={geciken}
            empty="Geciken görev yok"
            onEdit={handleOpenEdit}
            onDelete={setDeleteId}
            onToggle={handleToggleComplete}
          />
          <GorevSection
            title="Bugün"
            icon={<ListTodo className="w-5 h-5 text-amber-500" />}
            items={bugun}
            empty="Bugün için görev yok"
            onEdit={handleOpenEdit}
            onDelete={setDeleteId}
            onToggle={handleToggleComplete}
          />
          <GorevSection
            title="Yaklaşan"
            icon={<Clock className="w-5 h-5 text-teal-500" />}
            items={yaklasan}
            empty="Yaklaşan görev yok"
            onEdit={handleOpenEdit}
            onDelete={setDeleteId}
            onToggle={handleToggleComplete}
          />
          {kapanan.length > 0 && (
            <GorevSection
              title="Tamamlanan / İptal"
              icon={<CheckCircle2 className="w-5 h-5 text-gray-400" />}
              items={kapanan}
              empty=""
              onEdit={handleOpenEdit}
              onDelete={setDeleteId}
              onToggle={handleToggleComplete}
            />
          )}
        </>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Ne eklemek istiyorsun?" size="sm">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleSelectKind('takip')}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-teal-300 hover:bg-teal-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
              <PhoneCall className="w-5 h-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">Takip oluştur</span>
              <span className="block text-xs text-gray-500">Müşteri veya ilan için hatırlatma görevi</span>
            </span>
          </button>

          <button
            type="button"
            onClick={handleSelectRandevu}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-teal-300 hover:bg-teal-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <CalendarClock className="w-5 h-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">Randevu oluştur</span>
              <span className="block text-xs text-gray-500">Randevular sayfasına yönlendirir</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectKind('not')}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-4 text-left transition-colors hover:border-teal-300 hover:bg-teal-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <StickyNote className="w-5 h-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">Not / iş hatırlatması oluştur</span>
              <span className="block text-xs text-gray-500">Bağımsız hatırlatma notu</span>
            </span>
          </button>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editId
            ? 'Görevi Düzenle'
            : taskKind === 'takip'
              ? 'Takip oluştur'
              : taskKind === 'not'
                ? 'Not / iş hatırlatması oluştur'
                : 'Yeni Görev'
        }
        size="md"
      >
        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.baslik}
              onChange={(e) => setForm({ ...form, baslik: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Örn. Ahmet Bey'i ara"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {['Geri arama', 'Teklif hazırlama', 'Randevu planlama', 'İlan görüntüleme'].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => applyQuickTemplate(template)}
                  className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-100 transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Son tarih <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.son_tarih}
                onChange={(e) => setForm({ ...form, son_tarih: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saat</label>
              <input
                type="time"
                value={form.saat}
                onChange={(e) => setForm({ ...form, saat: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
              <select
                value={form.oncelik}
                onChange={(e) =>
                  setForm({ ...form, oncelik: e.target.value as GorevInput['oncelik'] })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="dusuk">Düşük</option>
                <option value="orta">Orta</option>
                <option value="yuksek">Yüksek</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={form.durum}
                onChange={(e) => setForm({ ...form, durum: e.target.value as GorevInput['durum'] })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="acik">Açık</option>
                <option value="tamamlandi">Tamamlandı</option>
                <option value="iptal">İptal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
            <select
              value={form.musteri_id || ''}
              onChange={(e) => {
                const selectedId = e.target.value || null;
                const selectedCustomer = musteriler.find((m) => m.id === selectedId);
                setForm((current) => ({
                  ...current,
                  musteri_id: selectedId,
                  baslik: current.baslik.trim() || (selectedCustomer ? `${selectedCustomer.ad_soyad} için takip` : current.baslik),
                }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Müşteri seçiniz</option>
              {musteriler.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.ad_soyad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İlan</label>
            <select
              value={form.ilan_id || ''}
              onChange={(e) => {
                const selectedId = e.target.value || null;
                const selectedListing = ilanlar.find((i) => i.id === selectedId);
                setForm((current) => ({
                  ...current,
                  ilan_id: selectedId,
                  baslik: current.baslik.trim() || (selectedListing ? `${selectedListing.baslik} için takip` : current.baslik),
                }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">İlan seçiniz</option>
              {ilanlar.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.baslik}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
              placeholder="Hatırlatma notu..."
            />
          </div>
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

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Görevi Sil"
        message="Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
      />
    </div>
  );
}

function GorevSection({
  title,
  icon,
  items,
  empty,
  onEdit,
  onDelete,
  onToggle,
}: {
  title: string;
  icon: ReactNode;
  items: GorevWithRelations[];
  empty: string;
  onEdit: (g: GorevWithRelations) => void;
  onDelete: (id: string) => void;
  onToggle: (g: GorevWithRelations) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
        {icon}
        {title}
        <span className="text-sm font-medium text-gray-400">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        empty ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <ListTodo className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">{empty}</p>
          </div>
        ) : null
      ) : (
        <div className="space-y-3">
          {items.map((g) => (
            <GorevCard
              key={g.id}
              gorev={g}
              onEdit={() => onEdit(g)}
              onDelete={() => onDelete(g.id)}
              onToggle={() => onToggle(g)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GorevCard({
  gorev,
  onEdit,
  onDelete,
  onToggle,
}: {
  gorev: GorevWithRelations;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const done = gorev.durum === 'tamamlandi';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggle}
          className={`flex-shrink-0 rounded-full p-1 ${
            done ? 'text-emerald-600' : 'text-gray-300 hover:text-teal-600'
          }`}
          aria-label={done ? 'Açık olarak işaretle' : 'Tamamlandı olarak işaretle'}
        >
          {done ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className={`text-sm font-medium ${done ? 'text-gray-400 line-through' : 'text-slate-800'}`}>
              {gorev.baslik}
            </p>
            <Badge label={GOREV_ONCELIK_LABELS[gorev.oncelik]} className={GOREV_ONCELIK_COLORS[gorev.oncelik]} />
            <Badge label={GOREV_DURUM_LABELS[gorev.durum]} className={GOREV_DURUM_COLORS[gorev.durum]} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
            <span>{formatDateShort(gorev.son_tarih)}</span>
            {gorev.saat && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {gorev.saat}
              </span>
            )}
            {gorev.musteri?.ad_soyad && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {gorev.musteri.ad_soyad}
              </span>
            )}
            {gorev.ilan?.baslik && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {gorev.ilan.baslik}
              </span>
            )}
          </div>
          {gorev.aciklama && <p className="text-xs text-gray-400 mt-1">{gorev.aciklama}</p>}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg text-gray-400 hover:bg-teal-50 hover:text-teal-600 transition-colors"
            aria-label="Düzenle"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            aria-label="Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
