import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Headphones,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Settings2,
  Sun,
  Tags,
  Ticket as TicketIcon,
  Users,
  Database,
  Cloud,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { tFn } from '../i18n';

export default function Layout() {
  const { currentUser, logout, backend, lang, setLang, theme, setTheme } = useApp();
  const t = tFn(lang);
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sahifa o'zgarsa drawer yopiladi
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Drawer ochiq paytda scroll lock
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const links = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/pipeline', label: t('nav.pipeline'), icon: KanbanSquare },
    { to: '/tickets', label: t('nav.tickets'), icon: TicketIcon },
    { to: '/knowledge', label: t('nav.knowledge'), icon: BookOpen },
  ];
  const adminLinks = [
    { to: '/users', label: t('nav.users'), icon: Users },
    { to: '/stages', label: t('nav.stages'), icon: Settings2 },
    { to: '/categories', label: t('nav.categories'), icon: Tags },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  function triggerSearch() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  }

  const sidebarContent = (
    <>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
        <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center">
          <Headphones className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-white leading-tight">iPOST CRM</div>
          <div className="text-xs text-slate-400">Virtual Control Room</div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scroll-thin">
        {links.map((l) => (
          <NavItem key={l.to} {...l} />
        ))}
        {currentUser?.role === 'admin' && (
          <>
            <div className="px-3 mt-5 mb-2 text-[11px] uppercase tracking-wider text-slate-500">
              {t('nav.admin')}
            </div>
            {adminLinks.map((l) => (
              <NavItem key={l.to} {...l} />
            ))}
          </>
        )}

        <div className="mt-5 px-3 space-y-2">
          <button
            onClick={triggerSearch}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-200 bg-white/5 hover:bg-white/10"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{t('search.global')}</span>
            <kbd className="text-[10px] border border-white/20 rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-slate-200"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              {theme === 'dark' ? t('common.theme.light') : t('common.theme.dark')}
            </button>
            <div className="flex bg-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => setLang('uz')}
                className={`px-2 py-1.5 text-xs font-semibold ${
                  lang === 'uz' ? 'bg-brand-500 text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                UZ
              </button>
              <button
                onClick={() => setLang('ru')}
                className={`px-2 py-1.5 text-xs font-semibold ${
                  lang === 'ru' ? 'bg-brand-500 text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                RU
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-300 px-2">
          {backend === 'firebase' ? (
            <>
              <Cloud className="h-3.5 w-3.5 text-emerald-400" /> Firebase real-time
            </>
          ) : (
            <>
              <Database className="h-3.5 w-3.5 text-amber-400" /> Demo (localStorage)
            </>
          )}
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold">
            {currentUser?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate text-white">
              {currentUser?.fullName ?? currentUser?.username}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-slate-300">
              {currentUser?.role}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            title="Chiqish"
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 dark:bg-[#020409] text-slate-200 border-r border-transparent dark:border-slate-800/50">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] flex flex-col bg-slate-900 dark:bg-[#020409] text-slate-200 z-50 shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-slate-900 dark:bg-[#020409] text-white border-b border-white/5 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <Headphones className="h-4 w-4 text-white" />
            </div>
            <div className="font-bold leading-tight truncate">iPOST CRM</div>
          </div>
          <button
            onClick={triggerSearch}
            className="p-2 rounded-lg hover:bg-white/10"
            title="Qidiruv"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-white/10"
            title="Tema"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-100 dark:bg-[#05070d] transition-colors duration-300">
          <Outlet />
        </main>

        {/* Mobile bottom nav (asosiy 4 ta link) */}
        <nav className="md:hidden flex items-center justify-around bg-slate-900 dark:bg-[#020409] text-slate-200 border-t border-white/5 px-2 pb-safe">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 rounded-lg text-[10px] font-semibold ${
                  isActive
                    ? 'text-brand-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <l.icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                  <span className="truncate max-w-full">{l.label.split(' ')[0]}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Headphones;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-900/40 translate-x-0.5'
            : 'text-slate-200 hover:bg-white/10 hover:text-white hover:translate-x-1'
        }`
      }
    >
      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
      <span>{label}</span>
    </NavLink>
  );
}
