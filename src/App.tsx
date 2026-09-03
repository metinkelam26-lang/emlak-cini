import { useEffect, useState } from 'react';
import Layout, { type Page } from '@/components/Layout';
import AiAutopilot from '@/pages/AiAutopilot';
import Appointments from '@/pages/Appointments';
import Customers from '@/pages/Customers';
import Dashboard from '@/pages/Dashboard';
import Listings from '@/pages/Listings';
import Tasks from '@/pages/Tasks';
import SahibindenIntegration from '@/pages/SahibindenIntegration';
import Pricing from '@/pages/Pricing';
import Auth from '@/pages/Auth';
import BrandPreview from '@/pages/BrandPreview';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [showBrandIntro, setShowBrandIntro] = useState(false);
  const [introBrand, setIntroBrand] = useState<{
    ofis_adi: string;
    ana_renk: string;
    logo_url: string;
  } | null>(null);
  const [autoOpenAppointmentForm, setAutoOpenAppointmentForm] = useState(false);
  const [autoOpenTaskPicker, setAutoOpenTaskPicker] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const preventBrowserBackspace = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' || event.defaultPrevented) return;

      const target = event.target;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (!isEditable) event.preventDefault();
    };

    window.addEventListener('keydown', preventBrowserBackspace);
    return () => window.removeEventListener('keydown', preventBrowserBackspace);
  }, []);

  useEffect(() => {
    if (!session) {
      setWorkspaceReady(false);
      return;
    }

    let isMounted = true;

    const initializeWorkspace = async () => {
      setWorkspaceReady(false);

      const onboardingOfficeName = sessionStorage.getItem('onboarding_ofis_adi');

      try {
        const { error } = onboardingOfficeName
          ? await supabase.rpc('baslat_ofis', { ofis_adi: onboardingOfficeName })
          : await supabase.rpc('baslat_ofis');

        if (error) {
          console.error('Ofis başlatılamadı, uygulama sorunsuz şekilde açılacak:', error.message);
        } else if (onboardingOfficeName) {
          sessionStorage.removeItem('onboarding_ofis_adi');
        }
      } catch (error) {
        console.error('Ofis başlatma akışı hata verdi, uygulama devam ediyor:', error);
      } finally {
        if (isMounted) {
          setWorkspaceReady(true);
        }
      }
    };

    void initializeWorkspace();

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !workspaceReady) return;

    // Marka ayar ekranindayken intro gosterme.
    if (window.location.pathname === '/markam') return;

    let active = true;
    let timer: number | undefined;

    const loadIntroBrand = async () => {
      const { data, error } = await supabase.rpc('marka_profili_getir');

      if (!active) return;

      if (error) {
        console.error('Marka intro bilgileri y?klenemedi:', error.message);
        return;
      }

      const profile = Array.isArray(data) ? data[0] : null;

      // Eski hesaplarda marka kurulumu tamamlanmamissa once /markam.
      // Logo/kartvizit marka kurulumunun tamamlandigini gosteren kriter.
      const hasBrand =
        Boolean(profile?.ofis_adi?.trim()) &&
        Boolean(profile?.logo_url?.trim());

      if (!profile || !hasBrand) {
        window.location.href = '/markam';
        return;
      }

      setIntroBrand({
        ofis_adi: profile.ofis_adi || 'Emlak Ofisi',
        ana_renk: profile.ana_renk || '#c69214',
        logo_url: profile.logo_url || '',
      });

      setShowBrandIntro(true);

      timer = window.setTimeout(() => {
        if (!active) return;
        setShowBrandIntro(false);
      }, 3000);
    };

    void loadIntroBrand();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [session, workspaceReady]);

  if (window.location.pathname === '/kendi-markani-gor') return <BrandPreview />;
  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Trend Emlak Asistanı yükleniyor...</div>;
  if (!session) return <Auth />;
  if (!workspaceReady) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Ofis alanınız hazırlanıyor...</div>;
  if (window.location.pathname === '/markam') return <BrandPreview />;

  const renderPage = () => {
    switch (currentPage) {
      case 'ilanlar':
        return <Listings />;
      case 'musteriler':
        return <Customers />;
      case 'randevular':
        return (
          <Appointments
            autoOpenCreate={autoOpenAppointmentForm}
            onAutoOpenHandled={() => setAutoOpenAppointmentForm(false)}
          />
        );
      case 'gorevler':
        return (
          <Tasks
            autoOpenPicker={autoOpenTaskPicker}
            onAutoOpenHandled={() => setAutoOpenTaskPicker(false)}
            onNavigate={(page) => {
              if (page === 'randevular') setAutoOpenAppointmentForm(true);
              setCurrentPage(page);
            }}
          />
        );
      case 'ai-otopilot':
        return <AiAutopilot />;
      case 'entegrasyon':
        return <SahibindenIntegration />;
      case 'paketler':
        return <Pricing onExploreIntegration={() => setCurrentPage('entegrasyon')} />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
      {showBrandIntro && introBrand && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/35 backdrop-blur-[2px]">
          <div
            className="mt-0 flex min-h-[75vh] w-full flex-col items-center justify-center px-6 py-12 text-center shadow-2xl animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${introBrand.ana_renk}, #211a2d)`,
            }}
          >
            {introBrand.logo_url ? (
              <div className="mb-6 flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl bg-white/95 p-3 shadow-xl sm:h-52 sm:w-52">
                <img
                  src={introBrand.logo_url}
                  alt={introBrand.ofis_adi}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-3xl bg-white/15 text-5xl font-black text-white shadow-xl">
                {introBrand.ofis_adi.slice(0, 2).toUpperCase()}
              </div>
            )}

            <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/70">
              Hoş geldiniz
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              {introBrand.ofis_adi}
            </h1>
            <p className="mt-3 text-sm font-medium text-white/80">
              Markan?z haz?r. G?nl?k sat?? asistan?n?z a??l?yor...
            </p>
          </div>
        </div>
      )}

      <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onOpenAdd={() => {
        setAutoOpenTaskPicker(true);
        setCurrentPage('gorevler');
      }}
      userEmail={session.user.email}
      onSignOut={async () => {
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('Çıkış sırasında hata:', error.message);
          }
        } finally {
          setSession(null);
          setWorkspaceReady(false);
        }
      }}
    >
      {renderPage()}
    </Layout>
    </>
  );
}
