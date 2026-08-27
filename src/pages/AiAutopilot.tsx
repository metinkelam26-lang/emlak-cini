import { useEffect, useMemo, useState } from 'react';
import { Bot, MessageSquare, Sparkles } from 'lucide-react';
import { supabase, type Ilan, type Musteri } from '@/lib/supabase';
import { getMatchLabel, getMatches } from '@/lib/matching';

function getWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0090')) return digits.slice(2);
  if (digits.startsWith('90')) return digits;
  return `90${digits.replace(/^0/, '')}`;
}

export default function AiAutopilot() {
  const [ilanlar, setIlanlar] = useState<Ilan[]>([]);
  const [musteriler, setMusteriler] = useState<Musteri[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      const [ilanResult, musteriResult] = await Promise.all([
        supabase.from('ilanlar').select('*').eq('durum', 'aktif').order('created_at', { ascending: false }),
        supabase.from('musteriler').select('*').order('created_at', { ascending: false }),
      ]);
      const failed = ilanResult.error || musteriResult.error;
      if (failed) {
        setError(failed.message);
      } else {
        const activeListings = ilanResult.data || [];
        setIlanlar(activeListings);
        setMusteriler(musteriResult.data || []);
        setSelectedPropertyId((current) => current || activeListings[0]?.id || '');
      }
      setLoading(false);
    };

    void loadData();
  }, []);

  const selectedProperty = ilanlar.find((ilan) => ilan.id === selectedPropertyId);
  const suggestions = useMemo(
    () =>
      selectedProperty
        ? musteriler
            .map((customer) => ({ customer, match: getMatches(customer, [selectedProperty])[0] }))
            .filter((suggestion) => suggestion.match)
            .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0))
        : [],
    [musteriler, selectedProperty],
  );

  const openFollowUp = (name: string, phone: string) => {
    const number = getWhatsAppNumber(phone);
    if (!number) return;
    const message = `Merhaba ${name}, kriterlerinize uygun olduğunu düşündüğümüz ${selectedProperty?.baslik || 'ilanımız'} hakkında size bilgi vermek istedim.`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center"><Bot className="w-6 h-6 text-indigo-600" /></div>
          <div><h1 className="text-2xl font-bold text-slate-800">Akıllı Eşleştirme ve Takip</h1><p className="text-gray-500 text-sm mt-1">Yerel kriter eşleştirmesiyle uygun müşterileri hızlıca takip edin.</p></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <label htmlFor="autopilot-property" className="block text-sm font-semibold text-gray-700 mb-2">Takip edilecek ilan</label>
        <select id="autopilot-property" value={selectedPropertyId} onChange={(event) => setSelectedPropertyId(event.target.value)} disabled={loading || ilanlar.length === 0} className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60">
          {ilanlar.length === 0 ? <option value="">Aktif ilan bulunamadı</option> : ilanlar.map((ilan) => <option key={ilan.id} value={ilan.id}>{ilan.baslik}</option>)}
        </select>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-bold text-slate-800"><Sparkles className="w-5 h-5 text-indigo-500" /> Uygun müşteri önerileri</h2>
        {loading ? <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-400">AI önerileri hazırlanıyor...</div> : suggestions.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">Seçilen ilan için uygun müşteri bulunamadı.</div> : suggestions.map(({ customer, match }) => (
          <div key={customer.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div><div className="flex items-center gap-2"><h3 className="font-bold text-slate-800">{customer.ad_soyad}</h3><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getMatchLabel(match.score).color}`}>{match.score}% {getMatchLabel(match.score).label}</span></div><p className="text-sm text-gray-500 mt-1">İlgilenebileceği ilan: {match.ilan.baslik}</p></div>
            <button type="button" onClick={() => openFollowUp(customer.ad_soyad, customer.telefon)} disabled={!customer.telefon} title={customer.telefon ? 'WhatsApp takip mesajı aç' : 'Telefon numarası yok'} className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"><MessageSquare className="w-4 h-4" /> WhatsApp takip mesajı</button>
          </div>
        ))}
      </div>
    </div>
  );
}
