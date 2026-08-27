import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock, Edit2, MessageSquare, Plus, Search, Trash2, User, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Ilan, Musteri, RandevuInput, RandevuWithRelations } from '@/lib/supabase';
import { formatDateShort, getLocalTodayISO, RANDEVU_DURUM_COLORS, RANDEVU_DURUM_LABELS } from '@/lib/constants';
import Modal from '@/components/Modal';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';

const emptyForm: RandevuInput = {
	musteri_id: null,
	ilan_id: null,
	tarih: getLocalTodayISO(),
	saat: '',
	randevu_notu: '',
	durum: 'planlandi',
};

function getWhatsAppNumber(phone: string) {
	const digits = phone.replace(/\D/g, '');
	if (!digits) return '';
	if (digits.startsWith('0090')) return digits.slice(2);
	if (digits.startsWith('90')) return digits;
	return `90${digits.replace(/^0/, '')}`;
}

export default function Appointments() {
	const [randevular, setRandevular] = useState<RandevuWithRelations[]>([]);
	const [musteriler, setMusteriler] = useState<Musteri[]>([]);
	const [ilanlar, setIlanlar] = useState<Ilan[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [filterDurum, setFilterDurum] = useState('');
	const [modalOpen, setModalOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState<RandevuInput>(emptyForm);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const loadRandevular = useCallback(async () => {
		setLoading(true);
		setError(null);
		const { data, error: loadError } = await supabase
			.from('randevular')
			.select('*, musteri:musteriler(*), ilan:ilanlar(*)')
			.order('tarih', { ascending: true })
			.order('saat', { ascending: true });
		if (loadError) setError(loadError.message);
		else setRandevular(data || []);
		setLoading(false);
	}, []);

	const loadOptions = useCallback(async () => {
		const [musteriResult, ilanResult] = await Promise.all([
			supabase.from('musteriler').select('*').order('ad_soyad', { ascending: true }),
			supabase.from('ilanlar').select('*').order('baslik', { ascending: true }),
		]);
		const failed = [musteriResult, ilanResult].find((result) => result.error);
		if (failed?.error) setError(failed.error.message);
		else {
			setMusteriler(musteriResult.data || []);
			setIlanlar(ilanResult.data || []);
		}
	}, []);

	useEffect(() => {
		void loadRandevular();
		void loadOptions();
	}, [loadOptions, loadRandevular]);

	const filteredRandevular = randevular.filter((randevu) => {
		const term = search.trim().toLocaleLowerCase('tr-TR');
		const matchesSearch = !term || randevu.musteri?.ad_soyad.toLocaleLowerCase('tr-TR').includes(term) || randevu.ilan?.baslik.toLocaleLowerCase('tr-TR').includes(term) || randevu.randevu_notu.toLocaleLowerCase('tr-TR').includes(term);
		return matchesSearch && (!filterDurum || randevu.durum === filterDurum);
	});

	const handleOpenAdd = () => {
		setForm({ ...emptyForm, tarih: getLocalTodayISO() });
		setEditId(null);
		setFormError(null);
		setModalOpen(true);
	};

	const handleOpenEdit = (randevu: RandevuWithRelations) => {
		setForm({ musteri_id: randevu.musteri_id, ilan_id: randevu.ilan_id, tarih: randevu.tarih, saat: randevu.saat, randevu_notu: randevu.randevu_notu, durum: randevu.durum });
		setEditId(randevu.id);
		setFormError(null);
		setModalOpen(true);
	};

	const handleSave = async () => {
		if (!form.tarih) {
			setFormError('Tarih zorunludur.');
			return;
		}
		const payload = { ...form, saat: form.saat.trim(), randevu_notu: form.randevu_notu.trim() };

		const conflict = payload.saat && randevular.some(
			(randevu) =>
				randevu.id !== editId &&
				randevu.durum === 'planlandi' &&
				randevu.tarih === payload.tarih &&
				randevu.saat === payload.saat,
		);
		if (conflict) {
			setFormError('Bu tarih ve saatte planlanmış başka bir randevu var. Lütfen farklı bir saat seçin.');
			return;
		}

		setSaving(true);
		setFormError(null);
		try {
			const result = editId
				? await supabase.from('randevular').update(payload).eq('id', editId)
				: await supabase.from('randevular').insert(payload);
			if (result.error) throw result.error;
			setModalOpen(false);
			await loadRandevular();
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Randevu kaydedilemedi.');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: string) => {
		const { error: deleteError } = await supabase.from('randevular').delete().eq('id', id);
		if (deleteError) setError(deleteError.message);
		else await loadRandevular();
	};

	const openWhatsApp = (randevu: RandevuWithRelations) => {
		const customer = randevu.musteri;
		const number = getWhatsAppNumber(customer?.telefon || '');
		if (!number) return;
		const detail = randevu.ilan?.baslik || randevu.randevu_notu || 'gayrimenkul randevumuz';
		const message = `Merhaba ${customer?.ad_soyad || 'müşterimiz'}, ${formatDateShort(randevu.tarih)} tarihinde${randevu.saat ? ` saat ${randevu.saat}` : ''} ${detail} için randevumuzu hatırlatmak istedim. Görüşmek üzere!`;
		window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div><h1 className="text-2xl font-bold text-slate-800">Randevular</h1><p className="text-gray-500 text-sm mt-1">Toplam {randevular.length} randevu kayıtlı</p></div>
				<button type="button" onClick={handleOpenAdd} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg font-medium text-sm hover:bg-teal-700 transition-colors shadow-sm"><Plus className="w-5 h-5" /> Yeni Randevu</button>
			</div>
			{error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
				<div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Müşteri, ilan veya not ara..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>
				<select value={filterDurum} onChange={(event) => setFilterDurum(event.target.value)} className="px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"><option value="">Tüm Durumlar</option><option value="planlandi">Planlandı</option><option value="gerceklesti">Gerçekleşti</option><option value="iptal">İptal</option></select>
			</div>
			{loading ? <div className="text-center py-20 text-gray-400">Randevular yükleniyor...</div> : filteredRandevular.length === 0 ? <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center"><CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">Randevu bulunamadı.</p></div> : <div className="space-y-3">{filteredRandevular.map((randevu) => <div key={randevu.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-4"><div className="w-11 h-11 rounded-lg bg-sky-50 flex items-center justify-center shrink-0"><CalendarDays className="w-5 h-5 text-sky-600" /></div><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-800">{randevu.musteri?.ad_soyad || 'Müşteri belirtilmemiş'}</h2><Badge label={RANDEVU_DURUM_LABELS[randevu.durum]} className={RANDEVU_DURUM_COLORS[randevu.durum]} /></div><div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500"><span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDateShort(randevu.tarih)} {randevu.saat && `· ${randevu.saat}`}</span>{randevu.ilan && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{randevu.ilan.baslik}</span>}{randevu.musteri && <span className="flex items-center gap-1"><User className="w-4 h-4" />{randevu.musteri.telefon || 'Telefon yok'}</span>}</div>{randevu.randevu_notu && <p className="text-sm text-gray-400 mt-1 truncate">{randevu.randevu_notu}</p>}</div><div className="flex items-center gap-2"><button type="button" disabled={!randevu.musteri?.telefon} onClick={() => openWhatsApp(randevu)} title={randevu.musteri?.telefon ? 'WhatsApp takip mesajı aç' : 'Telefon numarası yok'} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"><MessageSquare className="w-4 h-4" /> WhatsApp</button><button type="button" onClick={() => handleOpenEdit(randevu)} aria-label="Randevuyu düzenle" className="p-2 rounded-lg text-gray-400 hover:bg-teal-50 hover:text-teal-600"><Edit2 className="w-4 h-4" /></button><button type="button" onClick={() => setDeleteId(randevu.id)} aria-label="Randevuyu sil" className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div></div>)}</div>}

			<Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Randevu Düzenle' : 'Yeni Randevu'} size="md">
				{formError && <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{formError}</div>}
				<div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label><select value={form.musteri_id || ''} onChange={(event) => setForm({ ...form, musteri_id: event.target.value || null })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"><option value="">Müşteri seçin</option>{musteriler.map((musteri) => <option key={musteri.id} value={musteri.id}>{musteri.ad_soyad} {musteri.telefon && `(${musteri.telefon})`}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">İlan</label><select value={form.ilan_id || ''} onChange={(event) => setForm({ ...form, ilan_id: event.target.value || null })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"><option value="">İlan seçin</option>{ilanlar.map((ilan) => <option key={ilan.id} value={ilan.id}>{ilan.baslik}</option>)}</select></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label><input type="date" value={form.tarih} onChange={(event) => setForm({ ...form, tarih: event.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Saat</label><input type="time" value={form.saat} onChange={(event) => setForm({ ...form, saat: event.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" /></div></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Durum</label><select value={form.durum} onChange={(event) => setForm({ ...form, durum: event.target.value as RandevuInput['durum'] })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"><option value="planlandi">Planlandı</option><option value="gerceklesti">Gerçekleşti</option><option value="iptal">İptal</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Randevu Notu</label><textarea rows={3} value={form.randevu_notu} onChange={(event) => setForm({ ...form, randevu_notu: event.target.value })} placeholder="Randevu ile ilgili not..." className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none" /></div></div>
				<div className="flex flex-col-reverse gap-3 mt-6 pt-4 border-t border-gray-100 sm:flex-row">{editId && <button type="button" onClick={() => { setModalOpen(false); setDeleteId(editId); }} className="flex-1 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">Sil</button>}<button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium">İptal</button><button type="button" onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50">{saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Kaydet'}</button></div>
			</Modal>
			<ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && handleDelete(deleteId)} title="Randevuyu Sil" message="Bu randevuyu silmek istediğinize emin misiniz?" />
		</div>
	);
}
