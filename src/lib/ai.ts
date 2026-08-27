import { supabase } from '@/lib/supabase';

export type LocalAiAnalysis = {
  id: string;
  kaynak_tipi: 'listing' | 'customer';
  kaynak_id: string;
  baslik: string;
  icerik: string;
  sonuc: Record<string, unknown>;
  created_at: string;
};

const LOCAL_AI_KEY = 'emlak-crm-ai-analizler';

function saveLocalAnalysis(analysis: LocalAiAnalysis) {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_AI_KEY) || '[]') as LocalAiAnalysis[];
    const withoutPrevious = saved.filter(
      (item) => !(item.kaynak_tipi === analysis.kaynak_tipi && item.kaynak_id === analysis.kaynak_id),
    );
    localStorage.setItem(LOCAL_AI_KEY, JSON.stringify([analysis, ...withoutPrevious].slice(0, 20)));
    window.dispatchEvent(new CustomEvent('ai-analysis-created'));
  } catch {
    console.error('AI sonucu yerel hafızaya yazılamadı.');
  }
}

async function saveCloudAnalysis(analysis: LocalAiAnalysis) {
  const { error } = await supabase.from('ai_analizler').upsert(
    {
      kaynak_tipi: analysis.kaynak_tipi,
      kaynak_id: analysis.kaynak_id,
      baslik: analysis.baslik,
      icerik: analysis.icerik,
      sonuc: analysis.sonuc,
      model: analysis.sonuc.fallback ? 'local-template' : 'gpt-4o-mini',
    },
    { onConflict: 'kaynak_tipi,kaynak_id' },
  );
  if (error) console.warn('AI sonucu buluta yazılamadı:', error.message);
}

function saveAnalysis(analysis: LocalAiAnalysis) {
  saveLocalAnalysis(analysis);
  void saveCloudAnalysis(analysis);
}

async function generateAi(type: LocalAiAnalysis['kaynak_tipi'], id: string) {
  const { data, error } = await supabase.functions.invoke('ai-property-assistant', {
    body: { type, id },
  });
  if (error) {
    console.warn('AI servisi kullanılamadı, yerel metin oluşturuluyor:', error.message);
    await generateLocalFallback(type, id);
    return;
  }
  if (!error && data?.result) {
    saveAnalysis({
      id: `${type}-${id}-${Date.now()}`,
      kaynak_tipi: type,
      kaynak_id: id,
      baslik: data.result.baslik || (type === 'listing' ? 'AI ilan metni' : 'AI müşteri analizi'),
      icerik: data.result.icerik || '',
      sonuc: data.result,
      created_at: new Date().toISOString(),
    });
  }
}

async function generateLocalFallback(type: LocalAiAnalysis['kaynak_tipi'], id: string) {
  if (type === 'listing') {
    const { data: listing } = await supabase.from('ilanlar').select('*').eq('id', id).single();
    if (!listing) return;
    const location = [listing.ilce, listing.mahalle].filter(Boolean).join(' / ');
    const details = [listing.oda_sayisi, listing.metrekare > 0 ? `${listing.metrekare} m²` : '']
      .filter(Boolean)
      .join(', ');
    saveAnalysis({
      id: `listing-${id}-${Date.now()}`,
      kaynak_tipi: 'listing',
      kaynak_id: id,
      baslik: listing.baslik,
      icerik: `${listing.baslik}, ${location || 'merkezi konumda'} ${details ? `${details} özellikleriyle ` : ''}sizleri bekliyor. Detaylı bilgi ve randevu için bizimle iletişime geçebilirsiniz.`,
      sonuc: { fallback: true },
      created_at: new Date().toISOString(),
    });
    return;
  }

  const { data: customer } = await supabase.from('musteriler').select('*').eq('id', id).single();
  if (!customer) return;
  const preferences = [
    customer.ilan_tercihi === 'kiralik' ? 'kiralık' : 'satılık',
    customer.istenen_ilce,
    customer.istenen_mahalle,
    customer.istenen_oda_sayisi,
  ].filter(Boolean).join(', ');
  saveAnalysis({
    id: `customer-${id}-${Date.now()}`,
    kaynak_tipi: 'customer',
    kaynak_id: id,
    baslik: `${customer.ad_soyad} müşteri analizi`,
    icerik: `${customer.ad_soyad} için tercih edilen kriterler: ${preferences || 'Belirtilmemiş'}. Uygun ilanlar bütçe, konum ve konut özelliklerine göre değerlendirilebilir.`,
    sonuc: { fallback: true },
    created_at: new Date().toISOString(),
  });
}

export function generateLocalAiForListing(id: string) {
  return generateLocalFallback('listing', id);
}

export function generateLocalAiForCustomer(id: string) {
  return generateLocalFallback('customer', id);
}

export function generateAiForNewListing(id: string) {
  return generateAi('listing', id);
}

export function generateAiForNewCustomer(id: string) {
  return generateAi('customer', id);
}

export function getLocalAiAnalyses() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_AI_KEY) || '[]') as LocalAiAnalysis[];
    const unique = new Map<string, LocalAiAnalysis>();
    for (const analysis of saved) {
      const key = `${analysis.kaynak_tipi}:${analysis.kaynak_id}`;
      if (!unique.has(key)) unique.set(key, analysis);
    }
    const analyses = [...unique.values()];
    localStorage.setItem(LOCAL_AI_KEY, JSON.stringify(analyses));
    return analyses;
  } catch {
    return [];
  }
}

export function getLocalAiAnalysis(type: LocalAiAnalysis['kaynak_tipi'], kaynakId: string) {
  return getLocalAiAnalyses().find((analysis) => analysis.kaynak_tipi === type && analysis.kaynak_id === kaynakId);
}
