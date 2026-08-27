import { useState } from 'react';
import { CheckCircle2, CloudDownload, Loader2, LockKeyhole, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateLocalAiForListing } from '@/lib/ai';

type DemoRow = { baslik: string; tur: 'satilik' | 'kiralik'; fiyat: number; il: string; ilce: string; mahalle: string; oda_sayisi: string; metrekare: number; aciklama: string };
type Progress = { value: number; label: string } | null;

const demoRows: DemoRow[] = [
  { baslik: 'Bodrum Yalıkavak Deniz Manzaralı Villa', tur: 'satilik', fiyat: 18500000, il: 'Muğla', ilce: 'Bodrum', mahalle: 'Yalıkavak', oda_sayisi: '5+1', metrekare: 320, aciklama: 'Deniz manzaralı, özel havuzlu modern villa.' },
  { baslik: 'Nişantaşı Rezidans 2+1', tur: 'satilik', fiyat: 12900000, il: 'İstanbul', ilce: 'Şişli', mahalle: 'Nişantaşı', oda_sayisi: '2+1', metrekare: 118, aciklama: 'Şehrin merkezinde güvenlikli rezidans yaşamı.' },
  { baslik: 'Çeşme Alaçatı Taş Ev', tur: 'satilik', fiyat: 9800000, il: 'İzmir', ilce: 'Çeşme', mahalle: 'Alaçatı', oda_sayisi: '4+1', metrekare: 210, aciklama: 'Alaçatı ruhunu taşıyan avlulu taş ev.' },
  { baslik: 'Ankara Çankaya Prestij Daire', tur: 'satilik', fiyat: 6750000, il: 'Ankara', ilce: 'Çankaya', mahalle: 'Oran', oda_sayisi: '4+1', metrekare: 185, aciklama: 'Geniş cepheli, otoparklı site içinde.' },
  { baslik: 'Kadıköy Moda Kiralık Daire', tur: 'kiralik', fiyat: 85000, il: 'İstanbul', ilce: 'Kadıköy', mahalle: 'Moda', oda_sayisi: '3+1', metrekare: 145, aciklama: 'Moda sahiline yürüme mesafesinde ferah daire.' },
];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SahibindenIntegration() {
  const [storeId, setStoreId] = useState('');
  const [demoMode, setDemoMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Progress>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = async () => {
    setMessage(null); setError(null);
    if (!demoMode && !storeId.trim()) { setError('Lütfen geçerli bir Kurumsal Mağaza ID giriniz.'); return; }
    if (!demoMode) { setError('Gerçek senkronizasyon için resmi Sahibinden XML/API erişimi gereklidir.'); return; }
    setLoading(true); setProgress({ value: 25, label: 'Demo şablonu doğrulanıyor...' }); await wait(400);
    setProgress({ value: 50, label: 'Premium örnek ilanlar ayrıştırılıyor...' }); await wait(400);
    const listings = demoRows.map((row) => ({ ...row, bina_yasi: 0, bulundugu_kat: '', toplam_kat: 0, isitma_tipi: '', esyali: false, fotograflar: [], durum: 'aktif' as const }));
    const { data: existing, error: existingError } = await supabase.from('ilanlar').select('baslik').in('baslik', listings.map((listing) => listing.baslik));
    if (existingError) { setError(existingError.message); setProgress(null); setLoading(false); return; }
    const existingTitles = new Set((existing || []).map((listing) => listing.baslik));
    const newListings = listings.filter((listing) => !existingTitles.has(listing.baslik));
    const { data, error: insertError } = newListings.length ? await supabase.from('ilanlar').insert(newListings).select('id') : { data: [], error: null };
    if (insertError) { setError(insertError.message); setProgress(null); setLoading(false); return; }
    setProgress({ value: 85, label: 'Yerel ilan metinleri hazırlanıyor...' });
    for (const listing of data || []) void generateLocalAiForListing(listing.id);
    await wait(400); setProgress({ value: 100, label: `${data?.length || 0} yeni demo ilan aktarıldı.` });
    setMessage(newListings.length ? 'Demo aktarımı tamamlandı. Bu kayıtlar gerçek Sahibinden verisi değildir.' : 'Demo ilanları zaten mevcut; tekrar kayıt oluşturulmadı.'); setLoading(false);
  };

  return <div className="mx-auto max-w-4xl space-y-6"><div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f0a83a]"><Store className="h-6 w-6 text-[#211a2d]" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b6d1c]">Kurumsal bağlantı</p><h1 className="text-2xl font-bold text-slate-800">Sahibinden.com Entegrasyonu</h1><p className="mt-1 text-sm text-gray-500">Portföy aktarımını tek merkezden yönetin.</p></div></div>
    <section className="rounded-xl border border-[#e8dcc5] bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-slate-800">Bağlantı ayarları</h2><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="store-id" className="mb-1 block text-sm font-semibold text-gray-700">Kurumsal Mağaza ID</label><input id="store-id" value={demoMode ? 'DEMO_STORE_12345' : storeId} disabled={demoMode} onChange={(event) => setStoreId(event.target.value)} placeholder="Örn: 987654" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm disabled:bg-gray-100" /></div><div><label className="mb-1 block text-sm font-semibold text-gray-700">API Erişim Anahtarı</label><div className="relative"><input type="password" value="************************" readOnly className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2.5 pr-10 text-sm text-gray-400" /><LockKeyhole className="absolute right-3 top-3 h-4 w-4 text-gray-400" /></div><p className="mt-1 text-xs text-gray-400">Token tarayıcıda saklanmaz.</p></div></div><div className="mt-5 flex items-center justify-between rounded-lg bg-[#f7f1e6] p-3"><div><p className="text-sm font-semibold text-[#211a2d]">Demo Modu</p><p className="text-xs text-gray-500">Sunum için örnek aktarım simülasyonu.</p></div><button type="button" role="switch" aria-checked={demoMode} onClick={() => { setDemoMode((value) => !value); setProgress(null); setMessage(null); setError(null); }} className={`relative h-6 w-11 rounded-full ${demoMode ? 'bg-[#f0a83a]' : 'bg-gray-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white ${demoMode ? 'left-6' : 'left-1'}`} /></button></div></section>
    <section className="rounded-xl border border-[#453457] bg-[#211a2d] p-6 text-white shadow-lg"><div className="flex items-start gap-3"><LockKeyhole className="h-5 w-5 text-[#f0a83a]" /><div><h2 className="font-bold">Güvenli ve kontrollü aktarım</h2><p className="mt-1 text-sm text-[#d5c9df]">Demo modu açıkça örnek veri kullanır. Gerçek XML/API erişimi resmi onaydan sonra Edge Function ile bağlanır.</p></div></div><button type="button" onClick={() => void sync()} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#f0a83a] px-4 py-3 text-sm font-bold text-[#211a2d] hover:bg-[#ffc968] disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CloudDownload className="h-5 w-5" />} {loading ? 'Aktarılıyor...' : 'Portföyü Şimdi Çek'}</button></section>
    {progress && <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><div className="mb-2 flex justify-between text-sm font-semibold text-slate-700"><span>{progress.label}</span><span>{progress.value}%</span></div><div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#f0a83a] transition-all duration-500" style={{ width: `${progress.value}%` }} /></div>{progress.value === 100 && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Aktarım tamamlandı</p>}</section>}
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
  </div>;
}
