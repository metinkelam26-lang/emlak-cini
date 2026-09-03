import { useEffect, useState } from 'react';
import { Home, Building2, Users, CalendarDays, Menu, X, Building, LogOut, Plus, Palette, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type Page = 'dashboard' | 'ilanlar' | 'musteriler' | 'randevular' | 'gorevler' | 'ai-otopilot' | 'entegrasyon' | 'paketler';

type LayoutProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenAdd: () => void;
  children: React.ReactNode;
  userEmail?: string;
  canInstallApp?: boolean;
  onInstallApp?: () => void;
  onSignOut: () => void;
};

// Ana menude yalnizca gunluk satis asistani akisina ait dort sayfa gosterilir; digerlerine + Ekle veya ic navigasyon ile erisilir.
const NAV_ITEMS: { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Bugün', icon: Home },
  { id: 'musteriler', label: 'Müşteriler', icon: Users },
  { id: 'ilanlar', label: 'İlanlar', icon: Building2 },
  { id: 'randevular', label: 'Randevular', icon: CalendarDays },
];

export default function Layout({ currentPage, onNavigate, onOpenAdd, children, userEmail, canInstallApp = false, onInstallApp, onSignOut }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brandName, setBrandName] = useState('Trend Emlak Asistan?');
  const [brandAccent, setBrandAccent] = useState('#f0a83a');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');

  useEffect(() => {
    let active = true;

    const loadBrand = async () => {
      const { data, error } = await supabase.rpc('marka_profili_getir');

      if (!active) return;

      if (error) {
        console.error('Layout marka profili y?klenemedi:', error.message);
        return;
      }

      const profile = Array.isArray(data) ? data[0] : null;
      if (!profile) return;

      if (profile.ofis_adi) setBrandName(profile.ofis_adi);
      if (profile.ana_renk) setBrandAccent(profile.ana_renk);
      if (profile.logo_url) setBrandLogoUrl(profile.logo_url);
    };

    void loadBrand();

    return () => {
      active = false;
    };
  }, []);

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const handleOpenAdd = () => {
    onOpenAdd();
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#fbf8f2]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#211a2d] flex-col z-30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div
            className="w-14 h-14 overflow-hidden rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: brandAccent }}
          >
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building className="w-7 h-7 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight tracking-wide">{brandName}</h1>
            <p className="text-[#bdaeca] text-xs">Akıllı portföy yönetimi</p>
          </div>
        </div>
        <div className="px-3 pt-4">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandAccent }}
          >
            <Plus className="w-5 h-5" />
            + Ekle
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-[#d5c9df] hover:bg-[#30233f] hover:text-white'
                }`}
                style={active ? { backgroundColor: brandAccent } : undefined}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
          <a
            href="/markam"
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[#d5c9df] transition-colors hover:bg-[#30233f] hover:text-white"
          >
            <Palette className="w-5 h-5" />
            Markam
          </a>
        </nav>
        <div className="mt-auto shrink-0 border-t border-slate-700 bg-[#211a2d] px-4 py-4">
          {userEmail && (
            <p className="mb-3 truncate px-2 text-xs text-slate-400" title={userEmail}>
              {userEmail}
            </p>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-600 px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Çıkış yap
          </button>

          <p className="mt-3 px-2 text-xs text-[#8f7ca0]">© 2026 {brandName}</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-[#211a2d] z-30 flex items-center justify-between px-4 py-3 shadow-md">
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 overflow-hidden rounded-lg flex items-center justify-center shadow-sm"
            style={{ backgroundColor: brandAccent }}
          >
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building className="w-6 h-6 text-white" />
            )}
          </div>
          <h1 className="text-white font-bold">{brandName}</h1>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-2 hover:bg-[#30233f] rounded-lg"
          aria-label="Menü"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <nav
            className="absolute top-14 left-0 right-0 bg-[#211a2d] py-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-2">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: brandAccent }}
              >
                <Plus className="w-5 h-5" />
                + Ekle
              </button>
              {canInstallApp && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onInstallApp?.();
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Telefona yükle
                </button>
              )}
            </div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors ${
                    active ? 'text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                  style={active ? { backgroundColor: brandAccent } : undefined}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
            <a
              href="/markam"
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center gap-3 px-6 py-3.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              <Palette className="w-5 h-5" />
              Markam
            </a>

            <div className="mt-2 border-t border-slate-700 px-4 py-3">
              {userEmail && <p className="mb-2 truncate text-xs text-slate-400" title={userEmail}>{userEmail}</p>}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <LogOut className="h-5 w-5" />
                Çıkış yap
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
