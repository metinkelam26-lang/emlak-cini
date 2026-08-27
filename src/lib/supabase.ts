import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Ilan = {
  id: string;
  baslik: string;
  tur: 'satilik' | 'kiralik';
  fiyat: number;
  il: string;
  ilce: string;
  mahalle: string;
  oda_sayisi: string;
  metrekare: number;
  bina_yasi: number;
  bulundugu_kat: string;
  toplam_kat: number;
  isitma_tipi: string;
  esyali: boolean;
  aciklama: string;
  fotograflar: string[];
  durum: 'aktif' | 'pasif' | 'satildi' | 'kiralandi';
  created_at: string;
  updated_at?: string;
};

export type Musteri = {
  id: string;
  ad_soyad: string;
  telefon: string;
  eposta: string;
  tip: 'alici' | 'kiraci' | 'satici' | 'ev_sahibi';
  butce_min: number;
  butce_max: number;
  istenen_ilce: string;
  istenen_mahalle: string;
  istenen_oda_sayisi: string;
  min_metrekare: number;
  max_metrekare: number;
  ilan_tercihi: 'satilik' | 'kiralik';
  notlar: string;
  durum: 'yeni' | 'aktif' | 'beklemede' | 'tamamlandi';
  created_at: string;
  updated_at?: string;
};

export type Randevu = {
  id: string;
  musteri_id: string | null;
  ilan_id: string | null;
  tarih: string;
  saat: string;
  randevu_notu: string;
  durum: 'planlandi' | 'gerceklesti' | 'iptal';
  created_at: string;
  updated_at?: string;
};

export type Gorev = {
  id: string;
  baslik: string;
  aciklama: string;
  son_tarih: string;
  saat: string;
  oncelik: 'dusuk' | 'orta' | 'yuksek';
  durum: 'acik' | 'tamamlandi' | 'iptal';
  musteri_id: string | null;
  ilan_id: string | null;
  created_at: string;
  updated_at?: string;
};

export type RandevuWithRelations = Randevu & {
  musteri?: Musteri | null;
  ilan?: Ilan | null;
};

export type GorevWithRelations = Gorev & {
  musteri?: Musteri | null;
  ilan?: Ilan | null;
};

export type MusteriIlanEtkilesimi = {
  id: string;
  musteri_id: string;
  ilan_id: string;
  aksiyon: 'gosterildi' | 'teklif_edildi';
  notlar: string;
  created_at: string;
};

export type IlanInput = Omit<Ilan, 'id' | 'created_at' | 'updated_at'>;
export type MusteriInput = Omit<Musteri, 'id' | 'created_at' | 'updated_at'>;
export type RandevuInput = Omit<Randevu, 'id' | 'created_at' | 'updated_at'>;
export type GorevInput = Omit<Gorev, 'id' | 'created_at' | 'updated_at'>;
