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
