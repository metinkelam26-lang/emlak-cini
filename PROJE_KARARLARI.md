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
- Aksiyon Bekleyenler takip, randevu ve güçlü eşleşme kaynaklarından çalışıyor.
- Takip sonucu kaydı, tek açık takip, randevu erteleme ve Görüşüldü hızlı aksiyonu çalışıyor.
- `takip_sonucu_kaydet` → sonraki takip/randevu → `aksiyon_bekleyenler` döngüsü otomatik.
- `+ Ekle → Randevu oluştur` artık Randevular sayfasına geçip formu ikinci tıklama olmadan doğrudan açıyor.
- Production build başarılı.
- Canlı adres: https://trendemlakasistan.vercel.app
- Son kod commit'i: `5e9dd07 fix: guclu eslesme kurallarini sertlestir`
- Supabase e-posta doğrulaması geçici olarak kapatıldı; gerçek pilot öncesi yeniden açılmalı.

## Eşleştirme Gerçeği
- Ana aksiyon kuyruğunun eşleştirme otoritesi server-side `musteriye_uygun_ilanlar()`; güçlü eşleşme eşiği 70.
- Kapsam: yalnız yeni/aktif alıcı-kiracı müşteriler ve aktif ilanlar.
- Her müşteri için en güçlü, daha önce gösterilmemiş tek ilan gösteriliyor.
- `İlanı gösterdim` kaydı aynı müşteri-ilan çiftinin tekrar çıkmasını engelliyor.
- Hard filter: bütçe, ilçe, oda sayısı, metrekare (girilmişse); mahalle esnek puan kriteri olarak kaldı.
- Güçlü eşleşmeler artık `aksiyon_bekleyenler()` kuyruğuna giriyor.
- `matching.ts` / `AiAutopilot.tsx` eski bağımsız client motoru olarak teknik borç; ana aksiyon kuyruğunun otoritesi değil.

## Kontrollü Canlı Test Sonuçları
- Toplu CSV ile 7 ilan başarıyla aktarıldı.
- İlan A 100 puanla ilk sıraya geldi.
- "İlanı gösterdim" sonrası tekrar çıkmadı.
- İlan B 90 puanla sıradaki eşleşme oldu.
- Oda/metrekare uyumsuz ilan 80 puanla yanlış pozitif olarak yakalandı.
- Yeni hard filtre migration'ı sonrası uygunsuz eşleşme kuyruktan kayboldu.
- Takip aksiyonu etkilenmeden çalışmaya devam etti.
- Production build başarılı ve canlı adres aynı.

## Sıradaki Öncelik Sırası
1. Randevu Ertele ve İptal aksiyonlarını canlıda son kez doğrula.
2. Menü ve ekranları günlük satış asistanı yaklaşımına sadeleştir.
3. Legacy client-side eşleştirme motorunu server-side otoriteye bağla veya kaldır.
4. Mobil kullanım ve hata bildirimlerini iyileştir.
5. Pilot öncesi e-posta doğrulamasını yeniden açıp güvenlik kontrolü yap.

## Çalışma Kuralları
- Supabase şema, RLS, Storage ve migration değişiklikleri analiz edilmeden yapılmaz.
- Eski migration değiştirilmez.
- Büyük refactor yalnızca ölçülebilir faydayla yapılır.
- Her kod değişikliğinden sonra build çalıştırılır.
- Aider kullanılmayacak; Windows Uygulama Denetimi `_ctypes` DLL yüklemesini engelliyor.


