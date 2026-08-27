export const ILAN_DURUM_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  pasif: 'Pasif',
  satildi: 'Satıldı',
  kiralandi: 'Kiralandı',
};

export const ILAN_DURUM_COLORS: Record<string, string> = {
  aktif: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pasif: 'bg-gray-100 text-gray-600 border-gray-200',
  satildi: 'bg-blue-100 text-blue-700 border-blue-200',
  kiralandi: 'bg-purple-100 text-purple-700 border-purple-200',
};

export const TUR_LABELS: Record<string, string> = {
  satilik: 'Satılık',
  kiralik: 'Kiralık',
};

export const TUR_COLORS: Record<string, string> = {
  satilik: 'bg-teal-100 text-teal-700 border-teal-200',
  kiralik: 'bg-sky-100 text-sky-700 border-sky-200',
};

export const MUSTERI_TIP_LABELS: Record<string, string> = {
  alici: 'Alıcı',
  kiraci: 'Kiracı',
  satici: 'Satıcı',
  ev_sahibi: 'Ev Sahibi',
};

export const MUSTERI_TIP_COLORS: Record<string, string> = {
  alici: 'bg-blue-100 text-blue-700 border-blue-200',
  kiraci: 'bg-teal-100 text-teal-700 border-teal-200',
  satici: 'bg-amber-100 text-amber-700 border-amber-200',
  ev_sahibi: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

export const MUSTERI_DURUM_LABELS: Record<string, string> = {
  yeni: 'Yeni',
  aktif: 'Aktif',
  beklemede: 'Beklemede',
  tamamlandi: 'Tamamlandı',
};

export const MUSTERI_DURUM_COLORS: Record<string, string> = {
  yeni: 'bg-sky-100 text-sky-700 border-sky-200',
  aktif: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  beklemede: 'bg-amber-100 text-amber-700 border-amber-200',
  tamamlandi: 'bg-gray-100 text-gray-600 border-gray-200',
};

export const RANDEVU_DURUM_LABELS: Record<string, string> = {
  planlandi: 'Planlandı',
  gerceklesti: 'Gerçekleşti',
  iptal: 'İptal',
};

export const RANDEVU_DURUM_COLORS: Record<string, string> = {
  planlandi: 'bg-sky-100 text-sky-700 border-sky-200',
  gerceklesti: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  iptal: 'bg-red-100 text-red-700 border-red-200',
};

export const GOREV_DURUM_LABELS: Record<string, string> = {
  acik: 'Açık',
  tamamlandi: 'Tamamlandı',
  iptal: 'İptal',
};

export const GOREV_DURUM_COLORS: Record<string, string> = {
  acik: 'bg-sky-100 text-sky-700 border-sky-200',
  tamamlandi: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  iptal: 'bg-red-100 text-red-700 border-red-200',
};

export const GOREV_ONCELIK_LABELS: Record<string, string> = {
  dusuk: 'Düşük',
  orta: 'Orta',
  yuksek: 'Yüksek',
};

export const GOREV_ONCELIK_COLORS: Record<string, string> = {
  dusuk: 'bg-gray-100 text-gray-600 border-gray-200',
  orta: 'bg-amber-100 text-amber-700 border-amber-200',
  yuksek: 'bg-red-100 text-red-700 border-red-200',
};

export const ODA_SECENEKLERI = [
  '1+0',
  '1+1',
  '2+0',
  '2+1',
  '3+1',
  '3+2',
  '4+1',
  '4+2',
  '5+1',
  '5+2',
  '6+',
];

export const ISITMA_TIPLERI = [
  'Doğalgaz Kombi',
  'Merkezi Sistem',
  'Klima',
  'Soba',
  'Yerden Isıtma',
  'Elektrikli Radyatör',
  'Yok',
];

export const KAT_SECENEKLERI = [
  'Giriş Katı',
  'Bodrum Kat',
  'Yüksek Giriş',
  '1. Kat',
  '2. Kat',
  '3. Kat',
  '4. Kat',
  '5. Kat',
  '6. Kat',
  '7. Kat',
  '8. Kat',
  '9. Kat',
  '10. Kat',
  'Teras Katı',
  'Çatı Katı',
];

export function normalizeSearchText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('tr-TR') : '';
}

/** Date input values are calendar dates, so derive them in the user's local time zone. */
export function getLocalTodayISO(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTL(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
