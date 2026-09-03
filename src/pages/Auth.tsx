import { useState } from 'react';
import { Building2, Loader2, LogIn, Sparkles, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

      if (result.error) {
        if (result.error.message.includes('Email not confirmed') || result.error.message.includes('email not confirmed')) {
          setError('E-posta doğrulaması yapılmadı. Gelen maile tıklayıp hesabınızı onaylayın.');
        } else {
          setError(result.error.message);
        }
        return;
      }

      if (mode === 'signup' && !result.data.session) {
        setMessage('Kayıt oluşturuldu. Gelen e-postadaki onay linkine tıklayıp hesabınızı aktif edin. Sonrasında giriş yapabilirsiniz.');
      }
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'İşlem sırasında bir hata oluştu.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
    <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl sm:p-8">
      <div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#f0a83a]"><Building2 className="h-7 w-7 text-[#211a2d]" /></div><h1 className="text-2xl font-bold text-[#211a2d]">Trend Emlak Asistanı</h1><p className="mt-1 text-sm text-gray-500">Hesabınıza giriş yapın</p></div>
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-gray-100 p-1"><button type="button" onClick={() => setMode('login')} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>Giriş yap</button><button type="button" onClick={() => setMode('signup')} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'}`}>Hesap oluştur</button></div>
      <form onSubmit={submit} className="space-y-4"><div><label htmlFor="auth-email" className="mb-1 block text-sm font-medium text-gray-700">E-posta</label><input id="auth-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div><div><label htmlFor="auth-password" className="mb-1 block text-sm font-medium text-gray-700">Şifre</label><input id="auth-password" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" /></div>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-700">{message}</p>}<button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}</button></form>
      <div className="mt-6 rounded-lg border border-dashed border-teal-300 bg-teal-50/60 p-4 text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#211a2d]"><Sparkles className="h-4 w-4 text-teal-600" />Kendi markanı 30 saniyede gör</p>
        <p className="mt-1 text-xs text-gray-500">Kartvizitini veya logonu yükle; asistanını kendi renklerinle ve telefon önizlemesiyle gör.</p>
        <button type="button" onClick={() => { window.location.href = '/kendi-markani-gor'; }} className="mt-3 inline-flex items-center justify-center rounded-lg border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100">Kendi markanı gör</button>
      </div>
    </section>
  </main>;
}
