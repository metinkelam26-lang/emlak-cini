import type { Ilan, Musteri } from './supabase';

export type MatchReason = { label: string; met: boolean };

export type MatchResult = {
  ilan: Ilan;
  score: number;
  reasons: MatchReason[];
  /** Internal deterministic tie-break values; lower is a closer fit. */
  budgetDistance: number;
  areaDistance: number;
};

const WEIGHTS = { tur: 20, butce: 30, konum: 25, oda: 15, metrekare: 10 } as const;

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const normaliseText = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLocaleLowerCase('tr-TR') : '';

const textMatches = (actual: unknown, desired: unknown) => {
  const actualText = normaliseText(actual);
  const desiredText = normaliseText(desired);
  return Boolean(actualText && desiredText && actualText === desiredText);
};

const distanceToRange = (value: number, min?: number, max?: number) => {
  if (min !== undefined && value < min) return min - value;
  if (max !== undefined && value > max) return value - max;
  return 0;
};

/** Returns null when a listing fails a non-negotiable criterion. */
export function calculateMatch(musteri: Musteri, ilan: Ilan): MatchResult | null {
  const customer = musteri as Partial<Musteri>;
  const listing = ilan as Partial<Ilan>;
  const reasons: MatchReason[] = [];

  const preferredType = customer.ilan_tercihi;
  if (listing.durum !== 'aktif' || !preferredType || listing.tur !== preferredType) return null;

  const budgetMin = isPositiveNumber(customer.butce_min) ? customer.butce_min : undefined;
  const budgetMax = isPositiveNumber(customer.butce_max) ? customer.butce_max : undefined;
  const price = isPositiveNumber(listing.fiyat) ? listing.fiyat : undefined;
  if (budgetMax !== undefined && (price === undefined || price > budgetMax)) return null;

  const areaMin = isPositiveNumber(customer.min_metrekare) ? customer.min_metrekare : undefined;
  const areaMax = isPositiveNumber(customer.max_metrekare) ? customer.max_metrekare : undefined;
  const area = isPositiveNumber(listing.metrekare) ? listing.metrekare : undefined;
  if (
    area !== undefined &&
    ((areaMin !== undefined && area < areaMin) || (areaMax !== undefined && area > areaMax))
  ) return null;
  if ((areaMin !== undefined || areaMax !== undefined) && area === undefined) return null;

  let earned = 0;
  let available = 0;
  const addCriterion = (weight: number, points: number) => {
    available += weight;
    earned += points;
  };

  addCriterion(WEIGHTS.tur, WEIGHTS.tur);
  reasons.push({ label: 'İlan türü tercihle eşleşiyor', met: true });

  let budgetDistance = Number.POSITIVE_INFINITY;
  if (price !== undefined && (budgetMin !== undefined || budgetMax !== undefined)) {
    budgetDistance = distanceToRange(price, budgetMin, budgetMax);
    const reference = Math.max(budgetMin ?? budgetMax ?? price, budgetMax ?? 0, 1);
    const closeness = Math.max(0, 1 - budgetDistance / reference);
    addCriterion(WEIGHTS.butce, WEIGHTS.butce * closeness);
    reasons.push(
      budgetDistance === 0
        ? { label: 'Fiyat bütçe aralığında', met: true }
        : { label: 'Fiyat bütçeye yakın', met: closeness > 0 },
    );
  }

  const district = normaliseText(customer.istenen_ilce);
  const neighbourhood = normaliseText(customer.istenen_mahalle);
  if (district || neighbourhood) {
    let locationPoints = 0;
    if (district) {
      const matches = textMatches(listing.ilce, district);
      locationPoints += matches ? WEIGHTS.konum / 2 : 0;
      reasons.push({ label: matches ? 'İlçe eşleşiyor' : 'İlçe farklı', met: matches });
    }
    if (neighbourhood) {
      const matches = textMatches(listing.mahalle, neighbourhood);
      locationPoints += matches ? WEIGHTS.konum / 2 : 0;
      reasons.push({ label: matches ? 'Mahalle eşleşiyor' : 'Mahalle farklı', met: matches });
    }
    addCriterion(WEIGHTS.konum, locationPoints * (district && neighbourhood ? 1 : 2));
  }

  const rooms = normaliseText(customer.istenen_oda_sayisi);
  if (rooms) {
    const matches = textMatches(listing.oda_sayisi, rooms);
    addCriterion(WEIGHTS.oda, matches ? WEIGHTS.oda : 0);
    reasons.push({ label: matches ? 'Oda sayısı eşleşiyor' : 'Oda sayısı farklı', met: matches });
  }

  let areaDistance = Number.POSITIVE_INFINITY;
  if (area !== undefined && (areaMin !== undefined || areaMax !== undefined)) {
    areaDistance = distanceToRange(area, areaMin, areaMax);
    addCriterion(WEIGHTS.metrekare, WEIGHTS.metrekare);
    reasons.push({
      label: areaMin !== undefined && areaMax !== undefined ? 'Metrekare aralığında' : 'Metrekare kriterini karşılıyor',
      met: true,
    });
  }

  return {
    ilan,
    score: available > 0 ? Math.round((earned / available) * 100) : 0,
    reasons,
    budgetDistance,
    areaDistance,
  };
}

export function getMatches(musteri: Musteri, ilanlar: Ilan[]): MatchResult[] {
  return ilanlar
    .map((ilan) => calculateMatch(musteri, ilan))
    .filter((result): result is MatchResult => result !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.budgetDistance - b.budgetDistance ||
        a.areaDistance - b.areaDistance ||
        a.ilan.id.localeCompare(b.ilan.id),
    );
}

export function getMatchLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: 'Çok Uygun', color: 'text-emerald-700', bg: 'bg-emerald-500' };
  if (score >= 70) return { label: 'Uygun', color: 'text-teal-700', bg: 'bg-teal-500' };
  if (score >= 50) return { label: 'Kısmen Uygun', color: 'text-amber-700', bg: 'bg-amber-500' };
  return { label: 'Az Uygun', color: 'text-gray-500', bg: 'bg-gray-400' };
}

export function getMatchBadgeClass(score: number): string {
  if (score >= 90) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score >= 70) return 'bg-teal-100 text-teal-700 border-teal-200';
  if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-500 border-gray-200';
}
