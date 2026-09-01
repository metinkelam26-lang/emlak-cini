# Akıllı Emlak CRM — Güncel Referans
## Ürün Tanımı
- Klasik CRM değil; emlakçının günlük satış asistanı.
- Ana soru: “Bugün kiminle ilgilenirsem satış ihtimalim daha yüksek?”
- Kullanıcıya az veri girişi ve 1–2 dokunuşta sonuç hedefi.
- İlk faz deterministik; AI sonraki faz.

## Ana Kullanıcı Deneyimi
- Ana ekran: “Bugün ne yapmalısın?” / Aksiyon Bekleyenler.
- Kullanıcı çoğunlukla sonuç işaretler: ulaşamadım, görüştüm, randevu oluştu, görüşüldü, ertelendi, iptal, ilan gösterildi.
- Görevler teknik altyapıdır; ürün görev yöneticisi gibi görünmemeli.
- Müşteri, ilan, randevu ve takip bağlamı mümkün olduğunca korunmalı; tekrar veri istenmemeli.

## Doğrulanmış Çekirdek
- Aksiyon Bekleyenler takip ve randevu kaynaklarından çalışıyor.
- Takip sonucu kaydı, tek açık takip, randevu erteleme ve Görüşüldü hızlı aksiyonu çalışıyor.
- `takip_sonucu_kaydet` → sonraki takip/randevu → `aksiyon_bekleyenler` döngüsü otomatik.
- Production build başarılı.
- Canlı adres: https://trendemlakasistan.vercel.app
- Son kod commit'i: `49a4b2b feat: ekleme akışını sadeleştir`
- `+ Ekle` seçimi Takip / Randevu / Not akışını başlatıyor.
- Supabase e-posta doğrulaması geçici olarak kapatıldı; gerçek pilot öncesi yeniden açılmalı.

## Eşleştirme Gerçeği
- İki ayrı eşleştirme motoru var: `matching.ts` ve `musteriye_uygun_ilanlar()`.
- Puanlamaları farklı; tek otorite değiller.
- Güçlü eşleşmeler şu an `aksiyon_bekleyenler()` içine girmiyor.
- Yeni müşteri veya ilan kaydı eşleşmeden otomatik aksiyon üretmiyor.
- Önce tek server-side eşleştirme kuralı, resmi güçlü eşleşme eşiği ve tekrar göstermeyi engelleyen etkileşim kaydı kurulmalı.

## Sıradaki Öncelik Sırası
1. Randevu oluşturmayı `+ Ekle` içinden doğrudan başlat; ikinci sayfa/tıklama olmasın.
2. Tek eşleştirme motoru ve güçlü eşleşme eşiği.
3. Güçlü eşleşmeyi Aksiyon Bekleyenler'e, tekrar göstermeme kuralıyla ekle.
4. Kontrollü sahte veriyle uçtan uca test.
5. Menü ve ekranları günlük satış asistanı yaklaşımına sadeleştir.
6. Gerçek pilot öncesi e-posta doğrulaması ve güvenlik ayarlarını yeniden kontrol et.

## Çalışma Kuralları
- Supabase şema, RLS, Storage ve migration değişiklikleri analiz edilmeden yapılmaz.
- Eski migration değiştirilmez.
- Büyük refactor yalnızca ölçülebilir faydayla yapılır.
- Her kod değişikliğinden sonra build çalıştırılır.
- Aider kullanılmayacak; Windows Uygulama Denetimi `_ctypes` DLL yüklemesini engelliyor.

3. `PROJE_KARARLARI.md` dosyasının en üstüne şu kısa notu ekle:
> Arşiv notu — 01.09.2026’den itibaren tek güncel referans `PROJE_REFERANSI.md` dosyasıdır. Bu dosya eski kararları korur.

