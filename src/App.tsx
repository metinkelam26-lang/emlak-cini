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
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [workspaceReady, setWorkspaceReady] = useState(false);
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

      try {
        const { error } = await supabase.rpc('baslat_ofis');

        if (error) {
          console.error('Ofis başlatılamadı, uygulama sorunsuz şekilde açılacak:', error.message);
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

  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Trend Emlak Asistanı yükleniyor...</div>;
  if (!session) return <Auth />;
  if (!workspaceReady) return <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">Ofis alanınız hazırlanıyor...</div>;

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
  );
}
