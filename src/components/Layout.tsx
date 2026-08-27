import { useState } from 'react';
import { Home, Building2, Users, CalendarDays, ListTodo, Menu, X, Building, Sparkles, Settings, CircleDollarSign, LogOut } from 'lucide-react';

export type Page = 'dashboard' | 'ilanlar' | 'musteriler' | 'randevular' | 'gorevler' | 'ai-otopilot' | 'entegrasyon' | 'paketler';

type LayoutProps = {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
  userEmail?: string;
  onSignOut: () => void;
};

const NAV_ITEMS: { id: Page; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Ana Sayfa', icon: Home },
  { id: 'ilanlar', label: 'İlanlar', icon: Building2 },
  { id: 'musteriler', label: 'Müşteriler', icon: Users },
  { id: 'gorevler', label: 'Görevler', icon: ListTodo },
  { id: 'ai-otopilot', label: 'Yapay Zeka Otopilot', icon: Sparkles },
  { id: 'entegrasyon', label: 'Sahibinden Entegrasyonu', icon: Settings },
  { id: 'paketler', label: 'Paketler', icon: CircleDollarSign },
  { id: 'randevular', label: 'Randevular', icon: CalendarDays },
];

export default function Layout({ currentPage, onNavigate, children, userEmail, onSignOut }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#fbf8f2]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#211a2d] flex-col z-30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="w-10 h-10 rounded-lg bg-[#f0a83a] flex items-center justify-center shadow-[0_0_0_4px_rgba(240,168,58,0.14)]">
            <Building className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight tracking-wide">Trend Emlak Asistanı</h1>
            <p className="text-[#bdaeca] text-xs">Akıllı portföy yönetimi</p>
          </div>
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
                    ? 'bg-[#f0a83a] text-[#211a2d]'
                    : 'text-[#d5c9df] hover:bg-[#30233f] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-slate-700">
          {userEmail && <p className="mb-3 truncate text-xs text-slate-400" title={userEmail}>{userEmail}</p>}
          <button type="button" onClick={onSignOut} className="mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"><LogOut className="h-4 w-4" /> Çıkış yap</button>
          <p className="text-[#8f7ca0] text-xs">© 2026 Trend Emlak Asistanı</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-[#211a2d] z-30 flex items-center justify-between px-4 py-3 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#f0a83a] flex items-center justify-center">
            <Building className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-white font-bold">Trend Emlak Asistanı</h1>
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
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors ${
                    active ? 'bg-teal-500 text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
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
