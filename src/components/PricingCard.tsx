import { Check, Crown, Sparkles } from 'lucide-react';

type PricingCardProps = { onExploreIntegration: () => void };

const features = [
  'Sınırsız ilan ve müşteri kartı',
  'Excel/CSV toplu portföy aktarımı',
  'Yerel AI ilan metni üretimi',
  'Akıllı müşteri-ilan eşleştirmesi',
  'Randevu, görev ve teklif geçmişi',
  'Supabase bulut veri altyapısı',
];

export default function PricingCard({ onExploreIntegration }: PricingCardProps) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#6b4b1f] bg-[#211a2d] p-6 text-white shadow-2xl sm:p-8">
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full border-[18px] border-[#f0a83a]/20" />
      <div className="relative">
        <div className="flex items-center justify-between gap-4"><span className="inline-flex items-center gap-2 rounded-full bg-[#f0a83a] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#211a2d]"><Crown className="h-3.5 w-3.5" /> Arayüzlü paket</span><Sparkles className="h-5 w-5 text-[#f0a83a]" /></div>
        <p className="mt-7 text-sm font-semibold text-[#d5c9df]">Trend Emlak Asistanı</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Portföyünü büyüt, takibi kaçırma.</h2>
        <div className="mt-7 flex items-end gap-2"><strong className="text-5xl font-bold text-[#f0a83a]">1.150</strong><span className="mb-2 text-sm text-[#d5c9df]">TL / ay</span></div>
        <p className="mt-2 text-sm text-[#bdaeca]">KDV ve ödeme koşulları teklif aşamasında netleştirilir.</p>
        <div className="my-7 h-px bg-[#453457]" />
        <ul className="space-y-3">{features.map((feature) => <li key={feature} className="flex items-start gap-3 text-sm text-[#f8f2e8]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f0a83a]" />{feature}</li>)}</ul>
        <button type="button" onClick={onExploreIntegration} className="mt-8 flex w-full items-center justify-center rounded-lg bg-[#f0a83a] px-4 py-3 text-sm font-bold text-[#211a2d] transition hover:bg-[#ffc968]">Entegrasyonu incele</button>
        <p className="mt-4 text-center text-xs text-[#bdaeca]">Demo aktarımı açıkça örnek veri olarak belirtilir; resmi XML/API erişimi ayrıca gerekir.</p>
      </div>
    </article>
  );
}
