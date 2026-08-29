# Akıllı Emlak CRM — Proje Durumu

## Ürün Amacı

Emlakçının müşteriyi, portföyü ve geri dönüşü unutmasını önleyen en basit emlak asistanı.

## Sistemin Kalbi

“Bugün kimi ararsan para kazanma ihtimalin daha yüksek?”

## Çalışma Düzeni

- Codex ürün koordinatörü, planlayıcı ve denetleyicidir.
- Aider yalnızca Codex tarafından verilen dar kod görevlerini uygular.
- Büyük değişiklik yapılmaz.
- Her küçük değişiklik test edilir ve ayrı Git commit’i olarak kaydedilir.

## Tamamlanan Çalışmalar

- `PROJE_KARARLARI.md` oluşturuldu.
- Bozuk `Listings.tsx` çalışan sürüme döndürüldü.
- “Bugün kimi aramalısın?” bölümü oluşturuldu.
- Yeni müşteriler, randevular ve müşteri bağlantılı görevler listeye bağlandı.
- Ara ve WhatsApp düğmeleri eklendi.
- “Sonuç gir” akışı oluşturuldu.
- Sonuç seçenekleri:
  - Ulaşamadım
  - Görüştüm
  - Randevu oluştu
  - İlgilenmiyor
- Takip tarihi seçenekleri:
  - Yarın
  - 3 gün sonra
  - 1 hafta sonra
  - Tarih seç
- Takip sonucu mevcut `gorevler` tablosuna müşteri bağlantılı açık görev olarak kaydediliyor.
- Türkiye saat dilimindeki “Yarın” hesaplama hatası düzeltildi.
- Aynı müşterinin birden fazla kez görünmesi engellendi.
- Gerçek testte 31.08.2026 tarihli görev doğru biçimde “Yaklaşan” bölümüne düştü.

## Doğrulanan Testler

- TypeScript: başarılı
- Dashboard ESLint: başarılı
- Production build: başarılı
- Gerçek görev oluşturma: başarılı
- Müşteri bağlantısı: başarılı
- Yerel tarih hesabı: başarılı
- Müşteri tekilleştirme: başarılı

## Bilinen Sorunlar

- Görevler ekranındaki çöp kutusu çalışmıyor.
- Başarı mesajı “Code” başlıklı tarayıcı penceresinde gösteriliyor; uygulama içi bildirime çevrilmeli.
- Genel ESLint kontrolünde önceden bulunan iki hata var:
  - Customers.tsx kullanılmayan fonksiyon
  - Supabase AI fonksiyonunda `@ts-nocheck`
- Test verileri mevcut:
  - Test Müşteri Portföyü
  - Tamamlanmış yanlış tarihli test görevi
  - 31.08.2026 tarihli yaklaşan test görevi
- Son değişiklikler henüz Vercel’e yayınlanmadı.
- Storage/RLS güvenlik aşaması daha sonra yapılacak; geniş `anon` erişimi unutulmamalı.
- Instagram altyapısı korunacak ve ana iş akışının içinde kullanılacak.

## Öncelik Matematiği

1. Yeni müşteri: 100
2. Yeni portföyle güçlü eşleşme: 90
3. Randevu sonrası geri dönüş: 80
4. Gecikmiş sıcak müşteri: 70
5. Bugünkü takip: 60
6. Soğuk müşteri: 20

Ek puanlar:

- İlk 2 saatteki yeni talep: +30
- Sıcak/yüksek potansiyelli müşteri: +20
- Güçlü portföy eşleşmesi: +20
- Her geciken gün: +5
- Bugünkü randevu: +15

Puan kullanıcıya gösterilmeyecek; yalnızca doğru işi üst sıraya taşımak için kullanılacak.

## Bildirim İlkesi

- Bugün ekranı günlük çalışma masasıdır.
- Görevler bölümü arkadaki takip motorudur.
- Emlakçı her sabah Görevler’e bakmak zorunda kalmamalıdır.
- Bildirim yalnızca emniyet kemeridir.
- Gece yarısında bildirim gönderilmez.
- Saatli randevu yaklaşınca uyarı verilir.
- Uygulama uzun süre açılmazsa bekleyen işler hatırlatılır.

## Git Kayıtları

- `f167505` — Proje kararları
- `1c841be` — İlanlar sayfasının çalışan sürümü
- `acfc11c` — Bugün kimi aramalısın bölümü
- `9077247` — Telefon ikonları
- `02cc7e1` — Müşteri takip ve hatırlatma döngüsü

## Sonraki Kesin Adımlar

1. Üç kontrollü TEST müşterisi oluştur.
2. Öncelik sıralamasını gerçek verilerle test et.
3. Görev silme düğmesini düzelt.
4. “Code” mesajını uygulama içi bildirime dönüştür.
5. Öncelik puanlama motorunu uygula.
6. Tam doğrulama yap.
7. Kullanıcı onayından sonra Vercel’e yayınla.

## Devam Komutu

Yeni oturumda:

“Akıllı Emlak CRM’e devam et. Önce PROJE_KARARLARI.md ve PROJE_DURUMU.md dosyalarını, ardından son Git kayıtlarını incele.”