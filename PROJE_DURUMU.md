# Akıllı Emlak CRM — Proje Durumu

## Ürün Yönü

Ürün artık klasik CRM değil, emlakçının günlük satış asistanı olarak konumlanıyor.

Ana soru:

> “Şu anda ne yapmalıyım?”

Ana deneyim:

> “Bugün / Aksiyon Bekleyenler”

Çekirdek sistem ilk fazda tamamen deterministik çalışacak.
AI P3 katmanında, daha sonra yorumlama ve kişiselleştirme için kullanılacak.

---

## Tamamlanan P0 Güvenlik Çalışmaları

- Ofis/tenant izolasyonu güçlendirildi.
- `baslat_ofis` legacy veri sahiplenme riski kaldırıldı.
- Kullanıcı MVP'de tek ofisle sınırlandı.
- Duplicate ofis kayıtları kontrollü biçimde birleştirildi.
- Storage upload/update/delete erişimi ofis bazlı hale getirildi.
- İlan fotoğraf yolu `<ofis_id>/ilanlar/...` formatına geçirildi.
- Broad anon write storage policy'leri kaldırıldı.
- Production migration geçmişi Supabase ile hizalandı.

---

## Tamamlanan P1 CRM Çalışmaları

### Müşteri Takibi

`musteriler` tablosuna:

- `sonraki_aksiyon`
- `sonraki_aksiyon_tarihi`
- `oncelik`
- `son_etkilesim_at`

alanları eklendi.

### Bugün Aranacaklar

`bugun_aranacak_musteriler()` RPC oluşturuldu.

Dashboard artık bu RPC üzerinden müşteri sıralaması yapıyor.

### Takip Sonucu

`takip_sonucu_kaydet()` RPC oluşturuldu.

Takip sonucu:

- müşteri kaydını günceller
- sonraki aksiyonu belirler
- takip görevi oluşturur
- işlemleri atomik yürütür

### Randevu Oluşturma

`Randevu oluştu` sonucu artık gerçek `randevular` kaydı oluşturur.

- randevu tarihi alınır
- randevu saati alınır
- aynı ofiste aynı tarih/saat çakışması engellenir
- hata durumunda yarım kayıt bırakılmaz

### Müşteri–Portföy Eşleşmesi

`musteriye_uygun_ilanlar()` RPC oluşturuldu.

Kriterler:

- ilan tipi
- bütçe
- ilçe
- mahalle
- oda sayısı
- metrekare

Kurallar:

- yalnızca aktif ilanlar
- yanlış ilan tipi hard filter
- eksik kriter ücretsiz puan üretmez
- frontend ayrıca puanlama yapmaz
- Customers ekranı backend RPC sonucunu kullanır

Gerçek testte:

`Test Müşteri Portföy`
ile
`Çamlıca Parka Yakın 3+1 Aile Dairesi`

100 puan eşleşti.

---

## Doğrulanan Testler

- Production build başarılı.
- Supabase migration push'ları başarılı.
- Bugün aranacak müşteri RPC çalışıyor.
- Takip sonucu kaydı çalışıyor.
- Müşteri–portföy eşleşme motoru çalışıyor.
- 100 puanlık gerçek eşleşme doğrulandı.
- Randevu tarih/saat çakışması backend tarafından doğru şekilde engelleniyor.
- Storage ofis izolasyonu doğrulandı.
- Git çalışma ağacı ilgili adımlarda temiz doğrulandı.

---

## Bilinen Sorunlar / Teknik Borçlar

- `BulkListingImport.tsx` içinde bilinen TypeScript typecheck hatası var.
- Ana JS bundle yaklaşık 516–517 kB; Vite performans uyarısı veriyor.
- Görevler ekranındaki kalem/çöp aksiyonları kullanıcı açısından sorunlu.
- Browser `alert()` mesajları uygulama içi toast/bildirim sistemine çevrilmeli.
- `kullanici_ofisleri()` SECURITY DEFINER hardening ayrıca ele alınmalı.
- Cross-office FK bütünlüğü daha da güçlendirilmeli.
- Randevu/aksiyon UX'i mobil kullanım açısından sadeleştirilmeli.
- Vercel production yayını henüz yapılmadıysa beklemede.

---

## Yeni Ana Ürün Kararı

Kullanıcı mümkün olduğunca planlama yapmamalı.

Kullanıcı çoğunlukla yalnızca sonucu işaretlemeli:

- Ulaşamadım
- Görüştüm
- Randevu oluştu
- Görüşüldü
- Ertelendi
- İptal
- İlan gösterildi

Sistem sonraki aksiyonu mümkün olduğunca otomatik üretmeli.

Normal işlemlerin çoğu 1–2 dokunuşta tamamlanmalı.

---

## Sıradaki P1 İş

Ana hedef:

`aksiyon_bekleyenler()` mantığını oluşturmak.

Bu kuyruk şu kaynakları birleştirecek:

- yeni müşteriler
- süresi gelen takipler
- yaklaşan randevular
- sonucu girilmemiş geçmiş randevular
- güçlü müşteri–ilan eşleşmeleri
- gecikmiş sıcak müşteriler

İlk fazda yeni event bus / queue sistemi kurulmayacak.

PostgreSQL + RPC yeterli olacak.

---

## Sonraki Kesin Adımlar

1. `Aksiyon Bekleyenler` veri modelini/RPC sözleşmesini tasarla.
2. Yaklaşan ve geçmiş randevu aksiyonlarını kuyruğa ekle.
3. Hızlı randevu aksiyonları ekle:
   - Görüşüldü
   - Ertele
   - İptal
4. Süresi gelen müşteri takiplerini aynı kuyruğa al.
5. Güçlü eşleşmeleri aksiyona dönüştür.
6. Dashboard'u tek aksiyon kuyruğuna bağla.
7. Görevler ekranındaki kalem/çöp problemini düzelt.
8. `alert()` kullanımını uygulama içi bildirime çevir.
9. Mobil kullanım testleri yap.
10. Tam doğrulama sonrası Vercel yayını yap.

---

## Devam Komutu

Yeni oturumda:

> “Akıllı Emlak CRM’e devam et. Önce PROJE_KARARLARI.md ve PROJE_DURUMU.md dosyalarını, sonra son migration ve Git kayıtlarını incele. Aksiyon Bekleyenler P1 çalışmasından devam et.”