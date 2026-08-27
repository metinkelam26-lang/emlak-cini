/*
# Müşteri tercih alanlarını genişlet

## Amaç
Müşteri kayıtlarına maksimum metrekare ve ilan tercihi bilgilerini ekler.
Mevcut müşteri kayıtları korunur; yeni alanlar güvenli varsayılan değerlerle eklenir.

## Değişiklikler
- `musteriler.max_metrekare`: Müşterinin istediği maksimum konut alanı (m²). Mevcut kayıtlar için 0 atanır; 0 değer girilmemiş anlamındadır.
- `musteriler.ilan_tercihi`: Müşterinin tercih ettiği ilan türü. `satilik` veya `kiralik` olabilir. Mevcut kayıtlar için `satilik` atanır.

## Güvenlik
- Yeni tablo oluşturulmaz ve mevcut RLS politikaları değiştirilmez.
- Var olan müşteri kayıtları silinmez, yeniden yazılmaz veya dönüştürülmez.

## Önemli Notlar
1. Alan ekleme işlemleri idempotent olacak şekilde `IF NOT EXISTS` kullanır.
2. İlan tercihi yalnızca `satilik` veya `kiralik` değerlerini kabul eder.
3. Uygulama yeni alanları ekleme ve düzenleme sırasında kalıcı olarak kaydeder.
*/

ALTER TABLE public.musteriler
  ADD COLUMN IF NOT EXISTS max_metrekare numeric NOT NULL DEFAULT 0;

ALTER TABLE public.musteriler
  ADD COLUMN IF NOT EXISTS ilan_tercihi text NOT NULL DEFAULT 'satilik'
  CHECK (ilan_tercihi IN ('satilik', 'kiralik'));
