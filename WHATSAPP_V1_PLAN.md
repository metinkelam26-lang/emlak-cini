# Akıllı Emlak Asistanı — WhatsApp V1 Planı

## Ana Hedef

İlk hedef:

> AI'sız, ses özelliği olmadan, deterministik ve gerçekten iş yapan WhatsApp satış asistanı.

Amaç yeni özellik yığmak değil; en kısa sürede satılabilir ve güvenilir bir asistan deneyimi üretmektir.

---

## V1 Temel İlkesi

Akış:

WhatsApp mesajı
→ güvenli mesaj kaydı
→ telefon/müşteri eşleştirme
→ deterministik parser
→ müşteri talebi güncelleme
→ mevcut Match Engine
→ fırsat / aksiyon
→ kontrollü mesaj şablonu

V1'de:

- sesli mesaj işleme yok,
- genel amaçlı AI extraction yok,
- serbest AI cevap üretimi yok,
- ikinci bir eşleştirme motoru yok.

Mevcut Match Engine tek karar otoritesi olarak kalır.

---

## Neden Deterministik V1?

Bu yaklaşım:

- geliştirme süresini kısaltır,
- AI maliyetini ortadan kaldırır,
- halüsinasyon riskini azaltır,
- davranışı test edilebilir hale getirir,
- hata ayıklamayı kolaylaştırır,
- ticari demoya daha hızlı ulaşmamızı sağlar.

AI ve ses ihtiyaç oluştuğunda mevcut mimarinin üzerine eklenir.

---

# 5–7 Günlük Yol Haritası

## Gün 1 — Dayanıklı WhatsApp Mesaj Katmanı

Yapılacaklar:

- WhatsApp mesaj tablosu
- provider message id
- duplicate koruması
- processing status
- raw payload saklama
- ofis_id bağlantısı
- RLS
- webhook iskeleti

Hedef:

> Meta'dan gelen mesaj güvenli biçimde veritabanına düşebilsin.

Mesaj kabulü AI, Match Engine veya başka ağır işlemlere bağlı olmayacaktır.

---

## Gün 2 — Telefon ve Müşteri Eşleştirme

Yapılacaklar:

- telefon normalizasyonu
- +90 / 0 / farklı formatların tek biçime çevrilmesi
- mevcut müşteriyi telefonla bulma
- gerekirse kontrollü yeni müşteri oluşturma
- mesajı doğru müşteriyle ilişkilendirme

Hedef:

> Gelen WhatsApp mesajının kime ait olduğunu güvenilir şekilde bilmek.

---

## Gün 3 — Deterministik Parser V1

İlk desteklenecek müşteri talebi alanları:

- satılık / kiralık
- bütçe minimum
- bütçe maksimum
- ilçe
- mahalle
- oda sayısı
- minimum metrekare
- maksimum metrekare

Örnek:

"Tepebaşı 3+1 4 milyona kadar"

çıktısı:

- ilce = Tepebaşı
- oda = 3+1
- butce_max = 4.000.000

Hedef:

> Yaygın ve açık talepler AI olmadan yapılandırılmış veriye çevrilsin.

---

## Gün 4 — Match Engine Bağlantısı

Talep değiştiğinde:

- müşteri profili güncellenir,
- mevcut `musteriye_uygun_ilanlar` RPC'si çalışır,
- güçlü eşleşmeler belirlenir,
- nedenleri korunur.

Hedef:

> WhatsApp'tan gelen talep birkaç adım içinde gerçek portföy eşleşmesine dönüşsün.

Yeni veya ikinci bir eşleşme algoritması oluşturulmaz.

---

## Gün 5 — İlk Ticari Intentler + Şablon Sistemi

İlk hedef yaklaşık 10–15 yüksek değerli intenttir.

Öncelikli intentler:

1. MUSTERI_TALEBI_OLUSTUR
2. MUSTERI_TALEBI_GUNCELLE
3. BUTCE_GUNCELLE
4. BOLGE_GUNCELLE
5. ODA_GUNCELLE
6. METREKARE_GUNCELLE
7. ILAN_GOSTERILDI
8. TEKLIF_EDILDI
9. TAKIP_OLUSTUR
10. RANDEVU_OLUSTUR
11. GUCLU_ESLESME_BULUNDU
12. ESLESME_YOK
13. EKSIK_BILGI
14. ONAY_GEREKIYOR
15. ANLASILAMADI

Her intent kontrollü şablon ailesine bağlanır.

Hedef:

> Sistem emlakçıyla AI kullanmadan anlamlı ve tutarlı şekilde iletişim kurabilsin.

---

## Gün 6 — Bugün Ekranı ve Aksiyon Akışı

WhatsApp kaynaklı fırsatlar mevcut asistan deneyimine bağlanır.

Örnek:

- yeni güçlü eşleşme,
- takip zamanı,
- müşteri talebi değişti,
- randevu oluşturuldu,
- gösterilen ilana göre sonraki aksiyon.

Hedef:

> WhatsApp ayrı bir ekran veya ayrı bir CRM modülü haline gelmesin.

Ana kullanıcı deneyimi yine:

> Bugün ne yapmalısın?

olacaktır.

---

## Gün 7 — Production Testi ve Ticari Demo

Kontroller:

- webhook duplicate testi
- yanlış / eksik mesaj testi
- müşteri eşleştirme testi
- parser testi
- Match Engine testi
- aksiyon testi
- RLS / ofis izolasyonu
- production E2E
- kontrollü webhook yük testi

İlk yük senaryoları:

- 100 mesaj
- 500 mesaj
- 1.000 mesaj

Hedef:

> İlk gerçek kullanıcıya gösterilebilecek ve kontrollü pilotta kullanılabilecek V1.

---

# V1 Başarı Anı

Canlı demoda aşağıdaki akış güvenilir biçimde çalışmalıdır:

Müşteri WhatsApp:

"Çamlıca'da 3+1 arıyorum, 4 milyona kadar."

↓

Sistem mesajı güvenli şekilde kabul eder.

↓

Müşteriyi bulur veya oluşturur.

↓

Talebi ayrıştırır.

↓

CRM arka planda otomatik güncellenir.

↓

Mevcut Match Engine çalışır.

↓

Örnek çıktı:

"2 güçlü eşleşme bulundu.
En iyi eşleşme %94.
İlanı göndermek ister misiniz?"

Bu noktada V1 ticari olarak gösterilebilir kabul edilir.

---

# V1 Sonrası

Gerçek kullanıcı mesajlarından çözülemeyen durumlar toplanır.

Sonra sırayla:

- parser genişletme,
- 40–50 intent ailesine çıkma,
- daha fazla kontrollü şablon,
- sesli mesaj,
- gerektiğinde AI extraction,
- fırsat motoru,
- sessiz öğrenme,
- fiyat değişikliği fırsatları

eklenebilir.

AI yalnızca deterministik sistemin çözemediği gerçek kullanım problemleri için devreye alınır.

---

# Ticari Filtre

Her yeni özellik öncesinde şu sorular sorulur:

1. Gelire yaklaştırıyor mu?
2. Manuel işi azaltıyor mu?
3. Asistan hissini güçlendiriyor mu?
4. Güvenilirliği bozuyor mu?
5. İlk ücretli müşteriye ulaşmayı geciktiriyor mu?

İlk üç sorudan güçlü "evet" almayan veya son iki soruda risk yaratan özellik ertelenir.

---

# Çalışma Prensibi

Uzun teknik dönemler yerine her gün görünür sonuç üretilecektir.

Beklenen ilerleme:

Bugün mesaj geldi.
Yarın müşteri bulundu.
Sonraki gün talep anlaşıldı.
Sonra eşleşme çıktı.
Sonra aksiyon üretildi.
Sonunda ticari demo çalıştı.

Ana hedef:

> Ürünü bitirmek değil, satılabilir asistan anını üretmek.
