import { useEffect, useState } from 'react';
import {
  Building2,
  Tag,
  KeyRound,
  Users,
  CalendarDays,
  TrendingUp,
  ChevronRight,
  MessageSquare,
  Sparkles,
  PhoneCall,
  Phone,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Ilan } from '@/lib/supabase';
import { generateLocalAiForListing, getLocalAiAnalyses, getLocalAiAnalysis, type LocalAiAnalysis } from '@/lib/ai';
import {
  TUR_LABELS,
  TUR_COLORS,
  ILAN_DURUM_LABELS,
  ILAN_DURUM_COLORS,
  formatTL,
  formatDateShort,
  getLocalTodayISO,
} from '@/lib/constants';
import type { Page } from '@/components/Layout';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';

type DashboardProps = {
  onNavigate: (page: Page) => void;
};

type ActionItem = {
  aksiyon_id: string;
  aksiyon_tipi: 'takip' | 'randevu' | 'randevu_sonucu';
  musteri_id: string | null;
  randevu_id: string | null;
  ad_soyad: string;
  telefon: string;
  baslik: string;
  neden: string;
  aksiyon_tarihi: string | null;
  aksiyon_saati: string | null;
  puan: number;
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    totalIlan: 0,
    satilikIlan: 0,
    kiralikIlan: 0,
    totalMusteri: 0,
    bugunRandevu: 0,
    loading: true,
  });
  const [recentIlanlar, setRecentIlanlar] = useState<Ilan[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentAiAnalyses, setRecentAiAnalyses] = useState<LocalAiAnalysis[]>(() => getLocalAiAnalyses().slice(0, 4));
  const [generatingListingId, setGeneratingListingId] = useState<string | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpCall, setFollowUpCall] = useState<{ id: string; ad: string; telefon: string; neden: string; musteriId?: string } | null>(null);
  const [followUpResult, setFollowUpResult] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpCustomDate, setFollowUpCustomDate] = useState('');
  const [followUpAppointmentDate, setFollowUpAppointmentDate] = useState('');
  const [followUpAppointmentTime, setFollowUpAppointmentTime] = useState('');
  const [appointmentActionSaving, setAppointmentActionSaving] = useState<string | null>(null);
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [postponeAppointmentId, setPostponeAppointmentId] = useState<string | null>(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');

  useEffect(() => {
    loadDashboard();
    const refreshLocalAi = () => setRecentAiAnalyses(getLocalAiAnalyses().slice(0, 4));
    window.addEventListener('ai-analysis-created', refreshLocalAi);
    return () => window.removeEventListener('ai-analysis-created', refreshLocalAi);
  }, []);

  const loadDashboard = async () => {
    setStats((s) => ({ ...s, loading: true }));

    try {
      const today = getLocalTodayISO();

      const [
        ilanRes,
        satilikRes,
        kiralikRes,
        musteriRes,
        bugunRes,
        recentIlanRes,
      ] = await Promise.all([
          supabase.from('ilanlar').select('*', { count: 'exact', head: true }),
          supabase
            .from('ilanlar')
            .select('*', { count: 'exact', head: true })
            .eq('tur', 'satilik'),
          supabase
            .from('ilanlar')
            .select('*', { count: 'exact', head: true })
            .eq('tur', 'kiralik'),
          supabase.from('musteriler').select('*', { count: 'exact', head: true }),
          supabase
            .from('randevular')
            .select('*', { count: 'exact', head: true })
            .eq('tarih', today),
          supabase
            .from('ilanlar')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

      const coreResults = [ilanRes, satilikRes, kiralikRes, musteriRes, bugunRes, recentIlanRes];
      const failedResult = coreResults.find((result) => result.error);
      if (failedResult?.error) throw failedResult.error;

      setStats({
        totalIlan: ilanRes.count || 0,
        satilikIlan: satilikRes.count || 0,
        kiralikIlan: kiralikRes.count || 0,
        totalMusteri: musteriRes.count || 0,
        bugunRandevu: bugunRes.count || 0,
        loading: false,
      });

      setRecentIlanlar(recentIlanRes.data || []);

      // Aksiyon Bekleyenler RPC
      const { data: actionData, error: actionError } = await supabase.rpc('aksiyon_bekleyenler', {
        p_limit: 30,
      });

      if (actionError) throw actionError;

      setActionItems((actionData || []) as ActionItem[]);

    } catch {
      setStats((s) => ({
        ...s,
        loading: false,
      }));
    }
  };

  // Milyarlık maliyetleri yok eden Sihirli WhatsApp Link Oluşturucu
  const openWhatsAppFollowUp = (telefon: string, musteriAdi: string, detay: string, customerId?: string) => {
    if (!telefon) return;
    
    // Telefon numarasını temizle (Boşlukları siler, başındaki 0'ı kaldırır, 90 ekler)
    const temizTel = "90" + telefon.replace(/\s+/g, '').replace(/^0/, '').replace(/^\+90/, '');
    
    const localAnalysis = customerId ? getLocalAiAnalysis('customer', customerId) : undefined;
    const mesaj = localAnalysis?.icerik || `Merhaba ${musteriAdi} Bey/Hanım, gayrimenkul randevumuzu hatırlatmak istedim. Detay: ${detay}. Görüşmek üzere!`;
      
    const urlUyumluMesaj = encodeURIComponent(mesaj);
    const link = `https://wa.me/${temizTel}?text=${urlUyumluMesaj}`;
    
    // Mevcut sayfada açarak pop-up engeline takılmayı önler
    window.open(link, '_blank');
  };

  const handleGenerateListingText = async (id: string) => {
    setGeneratingListingId(id);
    await generateLocalAiForListing(id);
    setRecentAiAnalyses(getLocalAiAnalyses().slice(0, 4));
    setGeneratingListingId(null);
  };

  const handleAppointmentAction = async (
    randevuId: string,
    action: 'gorusuldu' | 'iptal'
  ) => {
    setAppointmentActionSaving(randevuId);
    try {
      const { error } = await supabase.rpc('randevu_aksiyonu_uygula', {
        p_randevu_id: randevuId,
        p_aksiyon: action,
        p_yeni_tarih: null,
        p_yeni_saat: null,
      });
      if (error) {
        alert(`Randevu aksiyonu uygulanamadı: ${error.message}`);
        return;
      }
      await loadDashboard();
    } finally {
      setAppointmentActionSaving(null);
    }
  };

  const handlePostponeSave = async () => {
    if (!postponeAppointmentId) return;
    if (!postponeDate) {
      alert('Lütfen yeni tarihi seçin');
      return;
    }
    if (!postponeTime) {
      alert('Lütfen yeni saati seçin');
      return;
    }
    setAppointmentActionSaving(postponeAppointmentId);
    try {
      const { error } = await supabase.rpc('randevu_aksiyonu_uygula', {
        p_randevu_id: postponeAppointmentId,
        p_aksiyon: 'ertele',
        p_yeni_tarih: postponeDate,
        p_yeni_saat: postponeTime,
      });
      if (error) {
        alert(`Randevu ertelenemedi: ${error.message}`);
        return;
      }
      setPostponeOpen(false);
      setPostponeAppointmentId(null);
      setPostponeDate('');
      setPostponeTime('');
      await loadDashboard();
    } finally {
      setAppointmentActionSaving(null);
    }
  };

  const handleFollowUpSave = async () => {
    if (!followUpCall) return;
    if (!followUpResult) {
      alert('Lütfen sonuç seçin');
      return;
    }
    let sonTarih = '';
    if (followUpDate === 'yarin') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      sonTarih = getLocalTodayISO(d);
    } else if (followUpDate === '3gun') {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      sonTarih = getLocalTodayISO(d);
    } else if (followUpDate === '1hafta') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      sonTarih = getLocalTodayISO(d);
    } else if (followUpDate === 'ozel') {
      if (!followUpCustomDate) {
        alert('Lütfen tarih seçin');
        return;
      }
      sonTarih = followUpCustomDate;
    } else {
      alert('Lütfen takip tarihi seçin');
      return;
    }

    if (!followUpCall.musteriId) {
      alert('Müşteri ID bulunamadı. Takip sonucu kaydedilemedi.');
      return;
    }

    if (followUpResult === 'Randevu oluştu') {
      if (!followUpAppointmentDate) {
        alert('Lütfen randevu tarihi seçin');
        return;
      }
      if (!followUpAppointmentTime) {
        alert('Lütfen randevu saati seçin');
        return;
      }
    }

    const { error } = await supabase.rpc('takip_sonucu_kaydet', {
      p_musteri_id: followUpCall.musteriId,
      p_sonuc: followUpResult,
      p_son_tarih: sonTarih,
      p_randevu_tarihi:
        followUpResult === 'Randevu oluştu'
          ? followUpAppointmentDate
          : null,
      p_randevu_saat:
        followUpResult === 'Randevu oluştu'
          ? followUpAppointmentTime
          : null,
    });

    if (error) {
      alert(`Takip sonucu kaydedilemedi: ${error.message}`);
      return;
    }

    alert('Takip sonucu kaydedildi');
    setFollowUpOpen(false);
    setFollowUpCall(null);
    setFollowUpResult('');
    setFollowUpDate('');
    setFollowUpCustomDate('');
    setFollowUpAppointmentDate('');
    setFollowUpAppointmentTime('');
    await loadDashboard();
  };

  const statCards = [
    {
      label: 'Toplam İlan',
      value: stats.totalIlan,
      icon: Building2,
      color: 'bg-teal-500',
      bg: 'bg-teal-50',
      textColor: 'text-teal-600',
    },
    {
      label: 'Satılık İlan',
      value: stats.satilikIlan,
      icon: Tag,
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Kiralık İlan',
      value: stats.kiralikIlan,
      icon: KeyRound,
      color: 'bg-sky-500',
      bg: 'bg-sky-50',
      textColor: 'text-sky-600',
    },
    {
      label: 'Toplam Müşteri',
      value: stats.totalMusteri,
      icon: Users,
      color: 'bg-indigo-500',
      bg: 'bg-indigo-50',
      textColor: 'text-indigo-600',
    },
    {
      label: 'Bugünkü Randevular',
      value: stats.bugunRandevu,
      icon: CalendarDays,
      color: 'bg-amber-500',
      bg: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Aksiyon Bekleyenler */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-teal-500" />
            <h2 className="font-bold text-slate-800">Aksiyon Bekleyenler</h2>
          </div>
          <span className="text-xs text-gray-400">{actionItems.length} kayıt</span>
        </div>
        <div className="p-4 space-y-3">
          {actionItems.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aksiyon bekleyen kayıt yok</p>
          ) : (
            actionItems.map((item) => {
              const isTakip = item.aksiyon_tipi === 'takip';
              const isRandevu = item.aksiyon_tipi === 'randevu';
              const isRandevuSonucu = item.aksiyon_tipi === 'randevu_sonucu';
              const call = {
                id: item.aksiyon_id,
                ad: item.ad_soyad,
                telefon: item.telefon,
                neden: item.neden,
                musteriId: item.musteri_id ?? undefined,
              };
              return (
                <div key={item.aksiyon_id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.ad_soyad}</p>
                      {isRandevu && <Badge label="Randevu" className="bg-sky-50 text-sky-700 border-sky-200" />}
                      {isRandevuSonucu && <Badge label="Sonuç bekliyor" className="bg-amber-50 text-amber-700 border-amber-200" />}
                    </div>
                    <p className="text-xs text-gray-500">{item.telefon}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.baslik}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.neden}</p>
                    {(item.aksiyon_tarihi || item.aksiyon_saati) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.aksiyon_tarihi ? formatDateShort(item.aksiyon_tarihi) : ''}
                        {item.aksiyon_saati ? ` · ${item.aksiyon_saati}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${item.telefon}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                    >
                      <Phone className="w-4 h-4" /> Ara
                    </a>
                    <button
                      type="button"
                      disabled={!item.telefon}
                      onClick={() => openWhatsAppFollowUp(item.telefon, item.ad_soyad, item.neden, item.musteri_id ?? undefined)}
                      title={item.telefon ? 'WhatsApp mesajı aç' : 'Telefon numarası yok'}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <MessageSquare className="w-4 h-4" /> WhatsApp
                    </button>
                    {isTakip && (
                      <button
                        type="button"
                        onClick={() => {
                          setFollowUpCall(call);
                          setFollowUpOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
                      >
                        Sonuç gir
                      </button>
                    )}
                    {(isRandevu || isRandevuSonucu) && (
                      <>
                        <button
                          type="button"
                          disabled={!item.randevu_id || appointmentActionSaving === item.randevu_id}
                          onClick={() => item.randevu_id && handleAppointmentAction(item.randevu_id, 'gorusuldu')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          Görüşüldü
                        </button>
                        <button
                          type="button"
                          disabled={!item.randevu_id || appointmentActionSaving === item.randevu_id}
                          onClick={() => {
                            if (!item.randevu_id) return;
                            setPostponeAppointmentId(item.randevu_id);
                            setPostponeDate(item.aksiyon_tarihi || '');
                            setPostponeTime(item.aksiyon_saati || '');
                            setPostponeOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          Ertele
                        </button>
                        <button
                          type="button"
                          disabled={!item.randevu_id || appointmentActionSaving === item.randevu_id}
                          onClick={() => item.randevu_id && handleAppointmentAction(item.randevu_id, 'iptal')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          İptal
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ana Sayfa</h1>
        <p className="text-gray-500 text-sm mt-1">Emlak ofisinizin genel durumuna hızlı bakış</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {stats.loading ? '...' : card.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Listings & Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Listings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-500" />
              <h2 className="font-bold text-slate-800">Son Eklenen İlanlar</h2>
            </div>
            <button
              onClick={() => onNavigate('ilanlar')}
              className="text-teal-600 text-sm font-medium hover:text-teal-700 flex items-center gap-1"
            >
              Tümü <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {recentIlanlar.length === 0 && !stats.loading ? (
              <p className="text-gray-400 text-sm text-center py-8">Henüz ilan eklenmedi</p>
            ) : (
              recentIlanlar.map((ilan) => (
                <div
                  key={ilan.id}
                  className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{ilan.baslik}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ilan.mahalle} Mhl, {ilan.ilce}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-teal-600">{formatTL(ilan.fiyat)}</p>
                    <div className="mt-1 flex gap-1 justify-end">
                      <Badge label={TUR_LABELS[ilan.tur]} className={TUR_COLORS[ilan.tur]} />
                      <Badge label={ILAN_DURUM_LABELS[ilan.durum]} className={ILAN_DURUM_COLORS[ilan.durum]} />
                    </div>
                    <button type="button" onClick={() => void handleGenerateListingText(ilan.id)} disabled={generatingListingId === ilan.id} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      {generatingListingId === ilan.id ? 'Üretiliyor...' : 'İlan Metni Üret'}
                    </button>
                  </div>
                </div>
              )))}
          </div>
        </div>

        {/* Yaklaşan Randevular paneli kaldırıldı */}
      </div>

      {recentAiAnalyses.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800">Son AI Çıktıları</h2>
            </div>
            <button onClick={() => onNavigate('ai-otopilot')} className="text-teal-600 text-sm font-medium hover:text-teal-700 flex items-center gap-1">
              Otopilot <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentAiAnalyses.map((analysis) => (
              <article key={analysis.id} className="rounded-lg border border-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-800 truncate">{analysis.baslik}</h3>
                  <Badge label={analysis.kaynak_tipi === 'listing' ? 'İlan' : 'Müşteri'} className="bg-indigo-50 text-indigo-700 border-indigo-200" />
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-3">{analysis.icerik}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={postponeOpen}
        onClose={() => setPostponeOpen(false)}
        title="Randevuyu Ertele"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni tarih</label>
            <input
              type="date"
              value={postponeDate}
              onChange={(e) => setPostponeDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yeni saat</label>
            <input
              type="time"
              value={postponeTime}
              onChange={(e) => setPostponeTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPostponeOpen(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handlePostponeSave}
              disabled={appointmentActionSaving === postponeAppointmentId}
              className="flex-1 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Kaydet
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        title="Takip Sonucu"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sonuç</label>
            <select
              value={followUpResult}
              onChange={(e) => setFollowUpResult(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Seçiniz</option>
              <option value="Ulaşamadım">Ulaşamadım</option>
              <option value="Görüştüm">Görüştüm</option>
              <option value="Randevu oluştu">Randevu oluştu</option>
              <option value="İlgilenmiyor">İlgilenmiyor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Takip tarihi</label>
            <select
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="">Seçiniz</option>
              <option value="yarin">Yarın</option>
              <option value="3gun">3 gün sonra</option>
              <option value="1hafta">1 hafta sonra</option>
              <option value="ozel">Tarih seç</option>
            </select>
          </div>
          {followUpDate === 'ozel' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
              <input
                type="date"
                value={followUpCustomDate}
                onChange={(e) => setFollowUpCustomDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          )}
          {followUpResult === 'Randevu oluştu' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Randevu tarihi</label>
                <input
                  type="date"
                  value={followUpAppointmentDate}
                  onChange={(e) => setFollowUpAppointmentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Randevu saati</label>
                <input
                  type="time"
                  value={followUpAppointmentTime}
                  onChange={(e) => setFollowUpAppointmentTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFollowUpOpen(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleFollowUpSave}
              className="flex-1 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
            >
              Kaydet
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
