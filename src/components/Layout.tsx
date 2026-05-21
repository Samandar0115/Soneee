import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Inbox,
  KanbanSquare,
  Package,
  Warehouse,
  Phone,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
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
import { searchShortcutLabel } from '../utils/platform';
import NotificationsButton from './NotificationsButton';
import Softphone from './Softphone';
import toast from 'react-hot-toast';

const COLLAPSE_KEY = 'ipost.sidebar.collapsed';

export default function Layout() {
  const { currentUser, logout, backend, lang, setLang, theme, setTheme, kvConfigured, settings } = useApp();

  // Session timeout — kerakli daqiqalardan keyin avto-logout
  useEffect(() => {
    if (!currentUser) return;
    const limitMin = settings.idleTimeoutMin || 30;
    if (limitMin <= 0) return;
    const limitMs = limitMin * 60_000;
    let lastActivity = Date.now();
    let warned = false;

    const reset = () => {
      lastActivity = Date.now();
      warned = false;
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    const tick = setInterval(() => {
      const idle = Date.now() - lastActivity;
      if (idle > limitMs - 60_000 && !warned && limitMin > 1) {
        warned = true;
        toast('1 daqiqadan keyin avtomatik chiqasiz...', { icon: '⏳', duration: 5000 });
      }
      if (idle > limitMs) {
        logout();
        nav('/login');
        toast('Faollik bo\'lmagani uchun chiqarildi', { icon: '🔒' });
      }
    }, 15000);

    return () => {
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, settings.idleTimeoutMin]);
  const t = tFn(lang);
  const nav = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const links = [
    { to: '/', label: t('nav.dashboard'), icon: LayoutDashboard, end: true },
    { to: '/leads', label: 'Yangi murojaatlar', icon: Inbox },
    { to: '/pipeline', label: t('nav.pipeline'), icon: KanbanSquare },
    { to: '/tickets', label: t('nav.tickets'), icon: TicketIcon },
    { to: '/calls', label: "Qo'ng'iroqlar", icon: Phone },
    { to: '/cargo', label: 'Vozvrat yuklar', icon: Package },
    { to: '/warehouse', label: 'Sklad navbati', icon: Warehouse },
    { to: '/knowledge', label: t('nav.knowledge'), icon: BookOpen },
  ];
  const adminLinks = [
    { to: '/analytics', label: 'Analitika', icon: BarChart3 },
    { to: '/users', label: t('nav.users'), icon: Users },
    { to: '/stages', label: t('nav.stages'), icon: Settings2 },
    { to: '/categories', label: t('nav.categories'), icon: Tags },
    { to: '/templates', label: 'Javob shablonlari', icon: MessageSquare },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  function triggerSearch() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  }

  // Mobile drawer ichida har doim kengaytilgan ko'rinish
  const sidebarContent = (forceExpanded = false) => {
    const isCompact = !forceExpanded && collapsed;
    return (
      <>
        <div className={`flex items-center gap-3 border-b border-white/5 ${isCompact ? 'px-3 py-5 justify-center' : 'px-5 py-5'}`}>
          <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0">
            <Headphones className="h-5 w-5 text-white" />
          </div>
          {!isCompact && (
            <div className="flex-1 min-w-0">
              <div className="font-bold text-white leading-tight">iPOST CRM</div>
              <div className="text-xs text-slate-400 truncate">Virtual Control Room</div>
            </div>
          )}
          {forceExpanded && (
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className={`flex-1 py-4 space-y-1 overflow-y-auto scroll-thin ${isCompact ? 'px-2' : 'px-3'}`}>
          {links.map((l) => (
            <NavItem key={l.to} {...l} compact={isCompact} />
          ))}
          {currentUser?.role === 'admin' && (
            <>
              {isCompact ? (
                <div className="border-t border-white/5 my-3" />
              ) : (
                <div className="px-3 mt-5 mb-2 text-[11px] uppercase tracking-wider text-slate-500">
                  {t('nav.admin')}
                </div>
              )}
              {adminLinks.map((l) => (
                <NavItem key={l.to} {...l} compact={isCompact} />
              ))}
            </>
          )}

          <div className={`mt-5 space-y-2 ${isCompact ? 'px-1' : 'px-3'}`}>
            <div className={isCompact ? '' : 'flex items-center gap-1'}>
              {!isCompact ? (
                <>
                  <button
                    onClick={triggerSearch}
                    title={t('common.search')}
                    className="group flex-1 flex items-center gap-2 rounded-xl text-xs text-slate-200 bg-white/5 hover:bg-orange-400/20 hover:text-orange-200 hover:ring-1 hover:ring-orange-400/40 transition px-3 py-2"
                  >
                    <Search className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1 text-left">{t('common.search')}</span>
                    {searchShortcutLabel() && (
                      <kbd className="text-[10px] border border-white/20 rounded px-1.5 py-0.5">
                        {searchShortcutLabel()}
                      </kbd>
                    )}
                  </button>
                  <NotificationsButton />
                </>
              ) : (
                <>
                  <button
                    onClick={triggerSearch}
                    title={t('common.search')}
                    className="group w-full flex items-center justify-center rounded-xl text-xs text-slate-200 bg-white/5 hover:bg-orange-400/20 hover:text-orange-200 transition h-10 mb-2"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                  <NotificationsButton compact />
                </>
              )}
            </div>
            <div className={`flex items-center gap-1 ${isCompact ? 'flex-col' : ''}`}>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? t('common.theme.light') : t('common.theme.dark')}
                className={`flex items-center justify-center gap-1.5 rounded-xl text-xs bg-white/5 hover:bg-orange-400/20 hover:text-orange-200 hover:ring-1 hover:ring-orange-400/40 text-slate-200 transition ${
                  isCompact ? 'w-full h-10' : 'flex-1 px-2 py-1.5'
                }`}
              >
                {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {!isCompact && (theme === 'dark' ? t('common.theme.light') : t('common.theme.dark'))}
              </button>
              {!isCompact && (
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
              )}
              {isCompact && (
                <button
                  onClick={() => setLang(lang === 'uz' ? 'ru' : 'uz')}
                  title={lang === 'uz' ? 'Ruscha' : "O'zbekcha"}
                  className="w-full h-10 rounded-xl text-xs font-semibold bg-white/5 hover:bg-orange-400/20 hover:text-orange-200 hover:ring-1 hover:ring-orange-400/40 text-slate-200 transition"
                >
                  {lang.toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </nav>

        <div className={`border-t border-white/5 space-y-2 ${isCompact ? 'p-2' : 'px-3 py-3'}`}>
          {!isCompact && (
            <button
              onClick={() => nav('/settings')}
              className="w-full flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-white/5 transition"
            >
              {backend === 'firebase' ? (
                <>
                  <Cloud className="h-3.5 w-3.5 text-emerald-400" /> <span className="text-slate-300">Firebase real-time</span>
                </>
              ) : kvConfigured ? (
                <>
                  <Cloud className="h-3.5 w-3.5 text-emerald-400" /> <span className="text-slate-300">Vercel KV ulangan</span>
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5 text-amber-400" /> <span className="text-amber-300">Mahalliy faqat — KV ulanmagan</span>
                </>
              )}
            </button>
          )}
          <div
            className={`rounded-xl bg-white/5 flex items-center gap-3 ${
              isCompact ? 'flex-col p-2' : 'px-3 py-2'
            }`}
            title={isCompact ? `${currentUser?.fullName ?? currentUser?.username} (${currentUser?.role})` : undefined}
          >
            {currentUser?.photo ? (
              <img
                src={currentUser.photo}
                alt={currentUser.username}
                className="h-9 w-9 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {currentUser?.username?.[0]?.toUpperCase()}
              </div>
            )}
            {!isCompact && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate text-white">
                  {currentUser?.fullName ?? currentUser?.username}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-300">
                  {currentUser?.role}
                </div>
              </div>
            )}
            <button
              onClick={() => {
                logout();
                nav('/login');
              }}
              title="Chiqish"
              className="p-2 rounded-lg hover:bg-white/10 text-slate-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex flex-col bg-slate-900 dark:bg-[#020409] text-slate-200 border-r border-transparent dark:border-slate-800/50 relative"
      >
        {sidebarContent(false)}

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Yoyish' : 'Yig\'ish'}
          className="absolute -right-3 top-20 z-10 w-6 h-6 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shadow-lg shadow-brand-900/40 border-2 border-slate-900 dark:border-[#020409] transition-transform hover:scale-110"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </motion.aside>

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
              {sidebarContent(true)}
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
          <NotificationsButton />
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

        <Softphone />

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex items-center justify-around bg-slate-900 dark:bg-[#020409] text-slate-200 border-t border-white/5 px-2 pb-safe">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 rounded-lg text-[10px] font-semibold transition ${
                  isActive ? 'text-brand-400 bg-brand-500/10' : 'text-slate-400 active:bg-orange-400/20 active:text-orange-200'
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
  compact,
}: {
  to: string;
  label: string;
  icon: typeof Headphones;
  end?: boolean;
  compact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={compact ? label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
          compact ? 'justify-center h-11 w-11 mx-auto' : 'px-3 py-2'
        } text-sm ${
          isActive
            ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-900/40'
            : 'text-slate-200 hover:bg-orange-400/20 hover:text-orange-200 hover:ring-1 hover:ring-orange-400/40'
        }`
      }
    >
      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-125 flex-shrink-0" />
      {!compact && <span className="truncate">{label}</span>}
      {compact && (
        <span className="pointer-events-none absolute left-full ml-3 px-2 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-orange-400/30 z-50">
          {label}
        </span>
      )}
    </NavLink>
  );
}
