import { CircleDollarSign, Check, ShieldCheck, Sparkles } from 'lucide-react';
import PricingCard from '@/components/PricingCard';

type PricingProps = { onExploreIntegration: () => void };
const basicFeatures = ['İlan, müşteri ve randevu kayıtları', 'Arama ve temel ilan filtreleri', 'Görev ve takip modülü', 'Mobil uyumlu kullanım', 'Supabase bulut veri altyapısı'];

export default function Pricing({ onExploreIntegration }: PricingProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9b6d1c]">Trend Emlak Asistanı lansman paketleri</p><h1 className="mt-2 text-3xl font-bold text-[#211a2d]">Ofisinize uyan paketi seçin</h1><p className="mt-2 text-sm leading-6 text-gray-500">Solo danışmandan büyüyen emlak ofisine kadar sade, anlaşılır ve ölçülebilir bir başlangıç.</p></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#e8dcc5] bg-white p-6 shadow-lg sm:p-8"><div className="flex items-center justify-between"><span className="rounded-full bg-[#f1edf5] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#554067]">Temel Paket</span><CircleDollarSign className="h-5 w-5 text-[#9b6d1c]" /></div><h2 className="mt-6 text-2xl font-bold text-[#211a2d]">Dijital ajandanız, tek yerde.</h2><div className="mt-6 flex items-end gap-2"><strong className="text-5xl font-bold text-[#211a2d]">750</strong><span className="mb-2 text-sm text-gray-500">TL / ay</span></div><p className="mt-2 text-sm text-gray-500">5 danışmana kadar ofis lisansı</p><div className="my-6 h-px bg-gray-100" /><ul className="space-y-3">{basicFeatures.map((feature) => <li key={feature} className="flex gap-3 text-sm text-gray-700"><Check className="h-4 w-4 shrink-0 text-emerald-600" />{feature}</li>)}</ul><div className="mt-7 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-semibold text-emerald-800">Yıllık peşin: 7.200 TL, aylık karşılığı 600 TL</div><button type="button" className="mt-6 flex w-full items-center justify-center rounded-lg border border-[#211a2d] px-4 py-3 text-sm font-bold text-[#211a2d] hover:bg-[#f7f1e6]">Temel paketi incele</button><p className="mt-3 text-center text-xs text-gray-400">Sahibinden entegrasyonu ve AI API üretimi bu pakete dahil değildir.</p></article>
        <PricingCard onExploreIntegration={onExploreIntegration} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-[#e8dcc5] bg-white p-5"><Sparkles className="h-5 w-5 text-[#9b6d1c]" /><h2 className="mt-3 font-bold text-[#211a2d]">Hangi paket?</h2><p className="mt-2 text-sm leading-6 text-gray-500">10-15 ilanı olan solo danışmanlar için Temel Paket; toplu aktarım ve operasyon ihtiyacı olan ofisler için Arayüzlü Paket uygundur.</p></div><div className="rounded-xl border border-[#e8dcc5] bg-white p-5"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h2 className="mt-3 font-bold text-[#211a2d]">Şeffaf kapsam</h2><p className="mt-2 text-sm leading-6 text-gray-500">Resmi Sahibinden.com XML/API erişimi ayrıca gereklidir. Demo aktarımı açıkça örnek veri olarak belirtilir.</p></div></div>
    </div>
  );
}
