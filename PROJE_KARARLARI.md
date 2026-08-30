PROJE KARARLARI

1. Ürün Kararları

Ürün Amacı

Emlakçının müşteriyi, portföyü ve geri dönüşü unutmasını önleyen; bugün kiminle ilgilenmesi gerektiğini net biçimde söyleyen sade bir emlak CRM/asistanı.

Ana ürün vaadi:

“CRM sana sadece kayıt tutturmuyor; bugün kiminle ilgilenirsen satış ihtimalin daha yüksek, onu söylüyor.”

Sistemin Kalbi

Ana soru:

“Bugün kimi ararsan para kazanma ihtimalin daha yüksek?”

Sistem; müşteri, portföy, randevu, görev ve etkileşim verilerini bu soruya hizmet edecek şekilde düzenler.

Öncelik Motoru

Varsayılan öncelik sırası:

Yeni gelen müşteri

Yeni portföyle eşleşen müşteri

Randevu sonrası geri dönüş bekleyen müşteri

Gecikmiş sıcak müşteri

Soğuk müşteri

Bu sıra başlangıç iş kuralıdır. Gerçek kullanım verisine göre puanlama geliştirilebilir.

Ana Bölümler

Bugün

Müşteriler

Portföyler

Eşleşmeler

Görevler, randevular, AI, WhatsApp ve Instagram ayrı birer ürün gibi büyütülmez; ilgili müşteri veya portföy akışının içinde kullanılır.

Müşteri Merkezli Çalışma

Her müşterinin mümkün olduğunca şu bilgileri net olmalıdır:

mevcut durum

sıcaklık / öncelik

bir sonraki işlem

bir sonraki işlem tarihi

sorumlu kullanıcı / ofis

ilgili portföyler

son görüşme / etkileşim

randevu ve görev geçmişi

“Bugün” ekranı bu bilgilerden üretilmelidir.

Ürün Basitliği

Kullanıcı ilk bakışta şu üç sorunun cevabını görmelidir:

Kimi aramalıyım?

Neden aramalıyım?

Sonraki işlem ne zaman?

Detaylar gerektiğinde açılır.

AI Kullanım Kararı

AI ürünün çekirdeği değil, verimlilik katmanıdır.

Sistem AI olmadan da tam çalışmalıdır.

AI yalnızca ölçülebilir zaman kazancı, karar kalitesi veya satış ihtimali artışı sağladığı akışlarda kullanılmalıdır.

AI şu işlerde kullanılabilir:

müşteri önceliğini açıklama

müşteri–ilan eşleşmesini yorumlama

görüşme / mesaj önerisi üretme

randevu sonrası takip önerisi

ilan veya müşteri analizini özetleme

“neden bugün ara?” açıklaması üretme

AI şu işleri yapmamalıdır:

temel CRM akışını AI’a bağımlı hale getirmemeli

her ekran açılışında otomatik çağrı yapmamalı

aynı veri için tekrar tekrar ücret üretmemeli

frontend içinde gizli API anahtarı bulundurmamalı

AI sonucunu doğrulanmış veri gibi kabul etmemeli

AI maliyet ve operasyon ilkesi:

model/API maliyeti izlenir

Edge Function / backend maliyeti hesaba katılır

timeout, hata ve fallback mekanizması bulunur

uygun sonuçlar cache’lenir

veri değişmediyse tekrar analiz üretilmez

temel sıralama ve eşleştirme mümkün olduğunca SQL/kurallarla yapılır

AI başarısız olduğunda çekirdek CRM çalışmaya devam eder

temel ürün fiyatlandırması AI olmadan da sürdürülebilir olmalıdır

2. Teknik Mimari Kararları

Temel Veri Yapısı

Ana tablolar:

ofisler

ofis_uyeleri

musteriler

ilanlar

randevular

gorevler

musteri_ilan_etkilesimleri

ai_analizler

Temel ilişki:

Ofis → Kullanıcı → Müşteri / Portföy → Randevu / Görev / Etkileşim / AI

Ofis / Tenant İzolasyonu

Her ana iş tablosu ofis bağlamında çalışır.

Kullanıcı yalnızca üyesi olduğu ofislerin verilerine erişebilir.

RLS temel veri güvenliği katmanıdır.

USING (true) / WITH CHECK (true) ile global authenticated erişim bırakılmaz.

Cross-office ilişki kurulmasına izin verilmez.

Normal istemciler tenant sınırını aşamaz.

Auth ve Yetki

Roller:

sahip

yonetici

uye

Kurallar:

görüntüleme ve düzenleme ofis üyeliğine göre

kritik silme/yönetim işlemleri role göre

normal üyeye gereksiz geniş yetki verilmez

SECURITY DEFINER fonksiyonları minimum yetkiyle çalışır

PUBLIC / anon execute yetkileri açık bırakılmaz

Storage

İlan fotoğrafları Supabase Storage kullanabilir.

Public read ürün ihtiyacına göre açık olabilir.

Upload / update / delete yalnızca yetkili authenticated kullanıcıya açık olur.

Başka ofisin ilan fotoğrafı değiştirilemez veya silinemez.

Dosya yolu ilan/ofis ilişkisini doğrulamaya uygun tutulur.

Veri Bütünlüğü

Veritabanı yalnızca veri saklamaz; hatalı ilişkiyi engeller.

Kontrol edilmesi gereken başlıca kurallar:

bütçe min/max mantığı

m² min/max mantığı

geçersiz tarih/saat engeli

geçersiz durum/rol/aksiyon değerleri engeli

cross-office müşteri/ilan/randevu/görev ilişkisi engeli

duplicate kayıtların kontrollü yönetimi

gerekli foreign key, unique ve check constraint’leri

Performans

Indexler gerçek sorgulara göre tasarlanır.

Öncelik:

ofis_id ile başlayan tenant-aware indexler

Bugün ekranı

açık/gecikmiş görevler

yaklaşan randevular

müşteri–ilan eşleşmeleri

müşteri/ilan geçmişi

Gereksiz tek kolon indexleri yerine ihtiyaca göre composite veya partial index tercih edilir.

Migration Stratejisi

Eski uygulanmış migration dosyaları değiştirilmez.

Yeni değişiklikler yeni migration ile yapılır.

Migration veri silmemelidir.

Legacy veri sessizce dönüştürülmez.

Riskli backfill işlemleri kullanıcı çağrılı RPC içine konmaz.

Production’a uygulanmadan önce migration ayrıca gözden geçirilir.

Geliştirme Stratejisi

Varsayılan akış:

Analiz et

Problemi sınıflandır

En küçük güvenli değişikliği seç

Aider’a dar görev ver

TypeScript / ESLint / build çalıştır

Sonucu incele

Sonraki göreve geç

Büyük refactor yasak değildir; yalnızca açık ve ölçülebilir fayda varsa yapılır.

Aider Kullanım Kuralı

Aider:

geniş kapsamlı analiz yapabilir

kod değişikliklerini küçük ve doğrulanabilir adımlarla uygular

eski migration geçmişini yeniden yazmaz

.env, API key, service role key gibi secret’lara dokunmaz

supabase db push, db reset, destructive SQL gibi işlemleri otomatik çalıştırmaz

production etkili komutlarda kullanıcı onayı bekler

Öncelik Seviyeleri

P0 — Güvenlik / Veri Kaybı

tenant/ofis izolasyonu

RLS

Storage yetkileri

SECURITY DEFINER

yanlış ofise veri bağlama

anon erişimi

veri silme riski

P1 — CRM Çekirdeği

Bugün ekranı

sonraki işlem

sonraki işlem tarihi

müşteri öncelik motoru

müşteri–portföy eşleşmesi

randevu sonrası takip

P2 — Veri Kalitesi / Performans

indexler

constraint’ler

duplicate kontrolü

veri tipleri

sorgu optimizasyonu

P3 — Geliştirme / Entegrasyon

AI iyileştirmeleri

WhatsApp

Instagram

ilan paylaşımı

otomasyonlar

Ana Teknik İlke

Mevcut çalışan yapıyı koruyarak mümkün olan en küçük, güvenli ve ölçülebilir değişiklik yapılır.

Güvenlik veya veri bütünlüğü sorunu varsa gerekli Supabase / RLS / Storage / Auth / schema değişiklikleri yapılabilir; ancak önce etkisi analiz edilir ve yeni migration ile uygulanır.