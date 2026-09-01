import { useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Ilan, IlanInput } from '@/lib/supabase';
import { generateLocalAiForListing } from '@/lib/ai';

const CSV_HEADERS = ['baslik', 'tur', 'fiyat', 'il', 'ilce', 'mahalle', 'oda_sayisi', 'metrekare', 'bina_yasi', 'bulundugu_kat', 'toplam_kat', 'isitma_tipi', 'esyali', 'aciklama', 'fotograflar', 'durum'];

type ImportRow = IlanInput & { rowNumber: number; error?: string };
type BulkListingImportProps = { onClose: () => void; onImported: () => Promise<void>; existingListings: Ilan[] };

const normalizeHeader = (value: string) => value.trim().toLocaleLowerCase('tr-TR').replace(/[ıİ]/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '');
const aliases: Record<string, string> = {
  baslik: 'baslik', ilanbasligi: 'baslik', title: 'baslik',
  tur: 'tur', tip: 'tur', type: 'tur',
  fiyat: 'fiyat', price: 'fiyat',
  il: 'il', city: 'il',
  ilce: 'ilce', district: 'ilce',
  mahalle: 'mahalle', neighbourhood: 'mahalle', neighborhood: 'mahalle',
  odasayisi: 'oda_sayisi', rooms: 'oda_sayisi',
  metrekare: 'metrekare', m2: 'metrekare', area: 'metrekare',
  binayasi: 'bina_yasi', age: 'bina_yasi',
  bulundugukat: 'bulundugu_kat', floor: 'bulundugu_kat',
  toplamkat: 'toplam_kat', floors: 'toplam_kat',
  isitmatipi: 'isitma_tipi', heating: 'isitma_tipi',
  esyali: 'esyali', furnished: 'esyali',
  aciklama: 'aciklama', description: 'aciklama',
  fotograflar: 'fotograflar', photos: 'fotograflar', photo: 'fotograflar',
  durum: 'durum', status: 'durum',
};

const listingKey = (listing: Pick<IlanInput, 'baslik' | 'tur' | 'il' | 'ilce' | 'mahalle'>) =>
  [listing.baslik, listing.tur, listing.il, listing.ilce, listing.mahalle].map((value) => String(value).trim().toLocaleLowerCase('tr-TR')).join('|');

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = '';
    } else cell += character;
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

function parseNumber(value: string) {
  const cleaned = value.replace(/[^0-9.,\s-]/g, '').replace(/\s/g, '');
  if (!cleaned) return 0;
  const lastSeparatorIndex = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  const tail = lastSeparatorIndex === -1 ? '' : cleaned.slice(lastSeparatorIndex + 1);
  // Son ayirac 1-2 rakamla bitiyorsa ondalik kabul edilir; aksi halde tum nokta/virguller binlik ayiracidir.
  const normalized = /^\d{1,2}$/.test(tail)
    ? `${cleaned.slice(0, lastSeparatorIndex).replace(/[.,]/g, '')}.${tail}`
    : cleaned.replace(/[.,]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRow(headers: string[], values: string[], rowNumber: number): ImportRow {
  const source: Record<string, string> = {};
  headers.forEach((header, index) => { source[aliases[normalizeHeader(header)] || normalizeHeader(header)] = values[index] || ''; });
  const tur = source.tur === 'kiralik' || source.tur === 'kiralık' ? 'kiralik' : 'satilik';
  const durum = ['pasif', 'satildi', 'kiralandi'].includes(source.durum) ? source.durum : 'aktif';
  const row: ImportRow = {
    rowNumber, baslik: source.baslik || '', tur, fiyat: parseNumber(source.fiyat), il: source.il || '', ilce: source.ilce || '', mahalle: source.mahalle || '',
    oda_sayisi: source.oda_sayisi || '', metrekare: parseNumber(source.metrekare), bina_yasi: parseNumber(source.bina_yasi), bulundugu_kat: source.bulundugu_kat || '', toplam_kat: parseNumber(source.toplam_kat),
    isitma_tipi: source.isitma_tipi || '', esyali: ['true', '1', 'evet', 'yes'].includes((source.esyali || '').toLocaleLowerCase('tr-TR')), aciklama: source.aciklama || '',
    fotograflar: (source.fotograflar || '').split('|').map((photo) => photo.trim()).filter(Boolean), durum: durum as IlanInput['durum'],
    error: !source.baslik ? 'Başlık eksik' : !source.il ? 'İl eksik' : undefined,
  };
  return row;
}

function downloadTemplate() {
  const example = ['Tepebaşı 3+1 Aile Dairesi', 'satilik', '3500000', 'Eskişehir', 'Tepebaşı', 'Çamlıca', '3+1', '145', '3', '2. Kat', '8', 'Doğalgaz Kombi', 'hayır', 'Parka yakın bakımlı daire', '', 'aktif'];
  const csv = `${CSV_HEADERS.join(',')}\n${example.map((value) => `"${value.replace(/"/g, '""')}"`).join(',')}\n`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'reis-emlak-ilan-sablonu.csv'; link.click(); URL.revokeObjectURL(url);
}

export default function BulkListingImport({ onClose, onImported, existingListings }: BulkListingImportProps) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name); setMessage(null);
    let parsed: string[][];
    if (/\.xlsx?$/i.test(file.name)) {
      const xlsxUrl = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
      const { read, utils } = await import(/* @vite-ignore */ xlsxUrl);
      const workbook = read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetRows = firstSheet
        ? utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: true, defval: '' })
        : [];
      // raw:true TL/m² gibi hucre bicimlendirmelerini atlar; toRow'a girmeden guvenli metne cevrilir.
      parsed = sheetRows.map((sheetRow) => sheetRow.map((value) => String(value ?? '')));
    } else {
      parsed = parseCsv(await file.text());
    }
    if (parsed.length < 2) { setRows([]); setMessage('Dosyada başlık ve en az bir ilan satırı bulunmalı.'); return; }
    const seen = new Set(existingListings.map(listingKey));
    const importedRows = parsed.slice(1).map((values, index) => toRow(parsed[0], values, index + 2));
    setRows(importedRows.map((row) => {
      const key = listingKey(row);
      if (row.error || !key) return row;
      if (seen.has(key)) return { ...row, error: 'Mevcut ilanla çakışıyor' };
      seen.add(key);
      return row;
    }));
  };

  const validRows = rows.filter((row) => !row.error);
  const handleImport = async () => {
    if (!validRows.length) return;
    setSaving(true); setMessage(null);
    const { data, error } = await supabase.from('ilanlar').insert(validRows.map(({ rowNumber, error: rowError, ...listing }) => { void rowNumber; void rowError; return listing; })).select('id');
    if (error) setMessage(error.message);
    else {
      for (const listing of data || []) void generateLocalAiForListing(listing.id);
      await onImported();
      setMessage(`${validRows.length} ilan başarıyla aktarıldı.`);
      setRows([]);
    }
    setSaving(false);
  };

  return <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 sm:pt-16">
    <div className="w-full max-w-5xl rounded-xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><div className="flex items-center gap-3"><FileSpreadsheet className="h-6 w-6 text-teal-600" /><h2 className="text-lg font-bold text-slate-800">Toplu İlan Aktar</h2></div><button type="button" onClick={onClose} aria-label="Kapat" className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
      <div className="space-y-5 px-6 py-5">
        <div className="flex flex-col gap-3 rounded-lg border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">CSV dosyanızı yükleyin</p><p className="mt-1 text-teal-800">İlk satır sütun başlıkları olmalı. Fotoğrafları aynı hücrede | işaretiyle ayırın.</p></div><button type="button" onClick={downloadTemplate} className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-semibold text-teal-700"><Download className="h-4 w-4" /> Şablon indir</button></div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-8 text-sm font-semibold text-gray-600 hover:border-teal-400 hover:bg-teal-50"><Upload className="h-5 w-5 text-teal-600" />{fileName || 'CSV veya Excel dosyası seçin'}<input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} /></label>
        {message && <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{message}</div>}
        {rows.length > 0 && <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="min-w-full text-left text-xs"><thead className="bg-gray-50"><tr><th className="px-3 py-2">Satır</th><th className="px-3 py-2">Başlık</th><th className="px-3 py-2">Tür</th><th className="px-3 py-2">Fiyat</th><th className="px-3 py-2">Konum</th><th className="px-3 py-2">Durum</th></tr></thead><tbody>{rows.slice(0, 100).map((row) => <tr key={row.rowNumber} className="border-t border-gray-100"><td className="px-3 py-2">{row.rowNumber}</td><td className="px-3 py-2 font-medium">{row.baslik || '-'}</td><td className="px-3 py-2">{row.tur}</td><td className="px-3 py-2">{row.fiyat.toLocaleString('tr-TR')} TL</td><td className="px-3 py-2">{[row.ilce, row.mahalle].filter(Boolean).join(' / ') || '-'}</td><td className={`px-3 py-2 ${row.error ? 'text-red-600' : 'text-emerald-600'}`}>{row.error || <CheckCircle2 className="h-4 w-4" />}</td></tr>)}</tbody></table>{rows.length > 100 && <p className="p-3 text-xs text-gray-500">İlk 100 satır önizleniyor, toplam {rows.length} satır aktarılacak.</p>}</div>}
      </div>
      <div className="flex gap-3 border-t border-gray-100 px-6 py-4"><button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700">İptal</button><button type="button" onClick={() => void handleImport()} disabled={saving || validRows.length === 0} className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Aktarılıyor...' : `${validRows.length} İlanı Aktar`}</button></div>
    </div>
  </div>;
}
