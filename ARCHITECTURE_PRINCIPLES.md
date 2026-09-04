# Akıllı Emlak Asistanı — Mimari Prensipler

## 1. Ana İlke

> Önce dayanıklı mesaj kabulü, sonra AI zekâsı.

WhatsApp veya başka bir kanaldan gelen mesaj, önce güvenli biçimde kaydedilmelidir.

AI analizi, müşteri güncellemesi, eşleştirme ve aksiyon üretimi daha sonra çalışır.

Mesaj kabulü hiçbir zaman AI servisinin hızına, hatasına veya erişilebilirliğine bağlı olmamalıdır.

---

## 2. Mesaj Kaybolmamalı

Sistem bir mesaj aldığında ilk görevi:

- mesajı doğrulamak,
- benzersiz kimliğini kontrol etmek,
- ham içeriği saklamak,
- işlenmek üzere işaretlemek

olmalıdır.

AI servisi geçici olarak çalışmasa bile mesaj kaybolmamalıdır.

---

## 3. Idempotency

Aynı webhook veya mesaj birden fazla kez gelirse sistem aynı işlemi tekrar üretmemelidir.

Her dış mesaj için benzersiz sağlayıcı mesaj kimliği tutulmalıdır.

Örnek:

provider_message_id = WhatsApp message id

Bu alan benzersiz olmalıdır.

Aynı mesaj ikinci kez gelirse yeni müşteri, yeni talep veya yeni aksiyon oluşturulmamalıdır.

---

## 4. Ağır İşler Webhook İçinde Yapılmaz

Webhook isteği geldiğinde:

1. İstek doğrulanır.
2. Mesaj kaydedilir.
3. İşlenecek olarak işaretlenir.
4. Meta'ya hızlı cevap dönülür.

Şunlar webhook request'i içinde tamamlanmaya zorlanmaz:

- AI analizi
- müşteri profil güncellemesi
- eşleştirme motoru
- fırsat puanlama
- otomatik aksiyon üretimi

Bunlar arka planda işlenir.

---

## 5. Kuyruk Mantığı

Mesaj işleme sistemi yük altında kendisini korumalıdır.

Durumlar örneğin:

- pending
- processing
- completed
- failed
- retry

şeklinde izlenebilmelidir.

Talep arttığında mesajlar kaybolmak yerine sıraya girmelidir.

---

## 6. Retry ve Backoff

Geçici hata yaşayan dış servisler için kontrollü tekrar deneme uygulanır.

Örnek servisler:

- Meta WhatsApp API
- AI API
- harici entegrasyonlar

Tekrar deneme:

- sınırsız olmamalı,
- aynı işlemi çoğaltmamalı,
- artan bekleme süresiyle yapılmalı,
- kalıcı hata durumunda failed durumuna düşmelidir.

---

## 7. AI Son Karar Otoritesi Değildir

AI'nın görevi konuşmayı anlamlandırmak ve yapılandırılmış veri önermektir.

AI çıktısı doğrudan kontrolsüz şekilde kritik veriyi ezmemelidir.

Özellikle:

- bütçe,
- bölge,
- oda sayısı,
- müşteri niyeti,
- red tercihleri

gibi bilgiler kaynak ve güven bilgisiyle işlenmelidir.

Belirsiz durumda kullanıcı doğrulaması istenebilir.

---

## 8. Mevcut Match Engine Korunur

WhatsApp tarafı ikinci bir eşleştirme motoru oluşturmaz.

Akış:

WhatsApp
→ Talep çıkarımı
→ Müşteri profili
→ Mevcut Match Engine
→ Fırsat
→ Aksiyon

şeklinde ilerler.

Müşteri → ilan ve ilan → müşteri karar otoritesi tek kalır.

---

## 9. Olay Tabanlı Yapıya Geçiş

Asistan zamanla aşağıdaki olayları anlayabilmelidir:

- WHATSAPP_MESAJI_GELDI
- MUSTERI_TALEBI_DEGISTI
- YENI_ILAN_EKLENDI
- ILAN_FIYATI_DEGISTI
- ILAN_GOSTERILDI
- TEKLIF_EDILDI
- MUSTERI_CEVAP_VERDI
- RANDEVU_OLUSTU
- RANDEVU_TAMAMLANDI
- TAKIP_ZAMANI_GELDI
- MUSTERI_UZUN_SURE_ARANMADI

Bu olaylar fırsat ve aksiyon motorlarını tetikleyebilir.

---

## 10. Eşleşme Puanı ile Fırsat Puanı Ayrıdır

Match Score:

> Bu müşteri bu ilana ne kadar uygun?

Opportunity Score:

> Bu müşteriye bugün aksiyon almak ne kadar değerli?

Aynı kavram değildir.

Örneğin:

%98 eşleşmiş ama dün iletişim kurulmuş müşteri bekleyebilir.

%88 eşleşmiş fakat 18 gündür unutulmuş sıcak müşteri daha yüksek fırsat puanı alabilir.

Mevcut Match Engine korunur.

Fırsat Motoru onun üzerine eklenir.

---

## 11. Kanal Bağımsız Çekirdek

WhatsApp önemli bir kanaldır fakat ürünün kendisi değildir.

Hedef mimari:

WhatsApp
Web Form
Telefon Kaydı
Manuel Giriş
İleride Instagram / Portal Lead

↓

Ortak Olay Katmanı

↓

Müşteri Hafızası

↓

Match Engine

↓

Fırsat Motoru

↓

Aksiyon Motoru

↓

Bugün Ne Yapmalısın?

Bir kanal çalışmaz hale gelse bile ürün çekirdeği yaşamaya devam etmelidir.

---

## 12. Gözlemlenebilirlik

Sistemde en azından şu metrikler izlenebilmelidir:

- gelen mesaj sayısı,
- işlenen mesaj sayısı,
- başarısız mesaj sayısı,
- retry sayısı,
- ortalama işleme süresi,
- AI hata oranı,
- eşleşme üretim süresi,
- oluşturulan aksiyon sayısı.

Kullanıcı veya yönetici sistemin sağlığını anlayabilmelidir.

---

## 13. Yük Testi

Production kapasitesi varsayımla belirlenmez.

Gerçek müşteri trafiği büyümeden önce kontrollü testler yapılır.

Örnek:

- 100 webhook
- 500 webhook
- 1.000 webhook

Aynı anda veya kısa sürede gönderilerek sistem davranışı ölçülür.

Amaç:

> Trafik arttığında veri kaybetmeden yavaşlamak.

Sistem hata verip mesaj kaybetmemelidir.

---

## 14. Güvenlik

Her mesaj ve işlem ofis_id ile ilişkilendirilmelidir.

RLS korunmalıdır.

Başka ofisin:

- müşterisi,
- mesajı,
- ilanı,
- fırsatı,
- aksiyonu

başka kullanıcıya görünmemelidir.

Webhook doğrulaması ve mümkün olduğunda imza doğrulaması yapılmalıdır.

Secret ve token değerleri kaynak koduna yazılmaz.

---

## 15. İnsan Kontrolü

İlk ticari sürümlerde kritik müşteri mesajlarının tamamen kontrolsüz AI tarafından gönderilmesi zorunlu değildir.

Başlangıç yaklaşımı:

AI mesajı hazırlar
→ danışman görür
→ onaylar
→ gönderilir

Güven seviyesi ve saha verisi yükseldikçe otomasyon artırılabilir.

---

## 16. Ticari Dayanıklılık

Tek bir harici servise bağımlılık ürünün tamamını değersiz hale getirmemelidir.

Meta, AI sağlayıcısı veya başka bir entegrasyon geçici olarak çalışmasa bile:

- mevcut CRM verisi,
- Match Engine,
- fırsat kayıtları,
- aksiyonlar,
- müşteri geçmişi

çalışmaya devam etmelidir.

---

# Son Teknik Kontrol Sorusu

Her yeni entegrasyon veya servis öncesinde:

> Bu servis bugün çalışmazsa ürünümüz yine değer üretmeye devam ediyor mu?

Cevap hayırsa mimari yeniden değerlendirilir.
