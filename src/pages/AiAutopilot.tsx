import { useEffect, useState } from 'react';
import { Bot, MessageSquare, Sparkles } from 'lucide-react';
import { supabase, type Ilan } from '@/lib/supabase';
import { getMatchLabel } from '@/lib/matching';

type CustomerSuggestion = {
  musteri_id: string;
  ad_soyad: string;
  telefon: string;
  eslesme_puani: number;
  profil_guveni: number;
  eslesme_nedenleri: string[];
};

function getWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0090')) return digits.slice(2);
  if (digits.startsWith('90')) return digits;
  return `90${digits.replace(/^0/, '')}`;
}

export default function AiAutopilot() {
  const [ilanlar, setIlanlar] = useState<Ilan[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      setError(null);

      const { data, error: listingError } = await supabase
        .from('ilanlar')
        .select('*')
        .eq('durum', 'aktif')
        .order('created_at', { ascending: false });

      if (listingError) {
        setError(listingError.message);
        setIlanlar([]);
      } else {
        const activeListings = data || [];
        setIlanlar(activeListings);
        setSelectedPropertyId((current) => current || activeListings[0]?.id || '');
      }

      setLoading(false);
    };

    void loadListings();
  }, []);

  useEffect(() => {
    if (!selectedPropertyId) {
      setSuggestions([]);
      return;
    }

    const loadSuggestions = async () => {
      setSuggestionLoading(true);
      setError(null);

      const { data, error: matchError } = await supabase.rpc(
        'ilana_uygun_musteriler',
        {
          p_ilan_id: selectedPropertyId,
          p_limit: 20,
        },
      );

      if (matchError) {
        setError(matchError.message);
        setSuggestions([]);
      } else {
        setSuggestions((data || []) as CustomerSuggestion[]);
      }

      setSuggestionLoading(false);
    };

    void loadSuggestions();
  }, [selectedPropertyId]);

  const selectedProperty = ilanlar.find(
    (ilan) => ilan.id === selectedPropertyId,
  );

  const openFollowUp = (name: string, phone: string) => {
    const number = getWhatsAppNumber(phone);
    if (!number) return;

    const listingTitle = selectedProperty?.baslik || 'ilanımız';

    const message =
      `Merhaba ${name}, kriterlerinize uygun olduğunu düşündüğümüz ` +
      `${listingTitle} hakkında size bilgi vermek istedim.`;

    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Bot className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Akıllı Eşleştirme ve Takip
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Seçilen ilan için en uygun müşterileri bulun ve hızlıca takip edin.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <label
          htmlFor="autopilot-property"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Takip edilecek ilan
        </label>

        <select
          id="autopilot-property"
          value={selectedPropertyId}
          onChange={(event) => setSelectedPropertyId(event.target.value)}
          disabled={loading || ilanlar.length === 0}
          className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
        >
          {ilanlar.length === 0 ? (
            <option value="">Aktif ilan bulunamadı</option>
          ) : (
            ilanlar.map((ilan) => (
              <option key={ilan.id} value={ilan.id}>
                {ilan.baslik}
              </option>
            ))
          )}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="flex items-center gap-2 font-bold text-slate-800">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Uygun müşteri önerileri
        </h2>

        {loading || suggestionLoading ? (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-400">
            Eşleşmeler hazırlanıyor...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
            Seçilen ilan için uygun müşteri bulunamadı.
          </div>
        ) : (
          suggestions.map((suggestion) => {
            const matchLabel = getMatchLabel(suggestion.eslesme_puani);

            return (
              <div
                key={suggestion.musteri_id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-800">
                      {suggestion.ad_soyad}
                    </h3>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${matchLabel.color}`}
                    >
                      {suggestion.eslesme_puani}% {matchLabel.label}
                    </span>

                    <span className="text-xs text-gray-400">
                      Profil güveni %{suggestion.profil_guveni}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    {suggestion.eslesme_nedenleri.join(' · ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openFollowUp(
                      suggestion.ad_soyad,
                      suggestion.telefon,
                    )
                  }
                  disabled={!suggestion.telefon}
                  title={
                    suggestion.telefon
                      ? 'WhatsApp takip mesajı aç'
                      : 'Telefon numarası yok'
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp takip mesajı
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
