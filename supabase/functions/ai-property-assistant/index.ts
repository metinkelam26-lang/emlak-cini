// @ts-nocheck Supabase Edge Functions use the Deno runtime and remote imports.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!openAiKey) throw new Error('OPENAI_API_KEY secret eksik.');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase function ayarları eksik.');

    const { type, id } = await request.json();
    if (!['listing', 'customer'].includes(type) || typeof id !== 'string') throw new Error('Geçersiz AI isteği.');

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const table = type === 'listing' ? 'ilanlar' : 'musteriler';
    const { data: record, error: recordError } = await admin.from(table).select('*').eq('id', id).single();
    if (recordError || !record) throw recordError || new Error('AI kaynağı bulunamadı.');

    let prompt = '';
    if (type === 'listing') {
      prompt = `Bir emlak danışmanı için aşağıdaki ilanı Türkçe, güven veren ve satış odaklı profesyonel bir ilan metnine dönüştür. Abartılı veya doğrulanmamış bilgi ekleme. JSON döndür: {"baslik": string, "icerik": string}. İlan: ${JSON.stringify(record)}`;
    } else {
      const { data: listings, error: listingsError } = await admin.from('ilanlar').select('id, baslik, tur, fiyat, il, ilce, mahalle, oda_sayisi, metrekare, aciklama').eq('durum', 'aktif').limit(100);
      if (listingsError) throw listingsError;
      prompt = `Bir emlak CRM için yeni müşterinin aktif ilanlarla uyum analizini yap. Türkçe JSON döndür: {"baslik": string, "icerik": string, "skor": number, "firsatlar": [{"ilan_id": string, "skor": number, "gerekce": string}]}. Skor 0-100 arası olsun. Yalnızca verilen müşteri ve ilan bilgilerini kullan, veri uydurma. Müşteri: ${JSON.stringify(record)} Aktif ilanlar: ${JSON.stringify(listings || [])}`;
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.7, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Sen Türkçe konuşan, deneyimli ve dürüst bir gayrimenkul danışmanı asistanısın.' }, { role: 'user', content: prompt }] }),
    });
    if (!openAiResponse.ok) {
      const errorBody = await openAiResponse.json().catch(() => null);
      const detail = errorBody?.error?.message;
      throw new Error(detail ? `OpenAI ${openAiResponse.status}: ${detail}` : `OpenAI isteği başarısız: ${openAiResponse.status}`);
    }
    const completion = await openAiResponse.json();
    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('OpenAI boş yanıt döndürdü.');
    const result = JSON.parse(content);
    if (typeof result.icerik !== 'string' || !result.icerik.trim()) throw new Error('OpenAI geçerli bir metin döndürmedi.');

    return new Response(JSON.stringify({ ok: true, result }), { headers: jsonHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI işlemi başarısız.';
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: jsonHeaders });
  }
});
