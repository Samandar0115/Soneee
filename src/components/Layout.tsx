import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Headphones,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Settings2,
  Tags,
  Ticket as TicketIcon,
  Users,
  Database,
  Cloud,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { currentUser, logout, backend } = useApp();
  const nav = useNavigate();

  const links = [
    { to: '/', label: 'Boshqaruv paneli', icon: LayoutDashboard, end: true },
    { to: '/pipeline', label: 'Pipeline (Kanban)', icon: KanbanSquare },
    { to: '/tickets', label: 'Murojaatlar', icon: TicketIcon },
    { to: '/reports', label: 'Hisobotlar', icon: BarChart3 },
  ];
  const adminLinks = [
    { to: '/users', label: 'Xodimlar', icon: Users },
    { to: '/stages', label: 'Bosqichlar', icon: Settings2 },
    { to: '/categories', label: 'Murojaat turlari', icon: Tags },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-200">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
          <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center">
            <Headphones className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white leading-tight">Soneee CRM</div>
            <div className="text-xs text-slate-400">Virtual Control Room</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scroll-thin">
          {links.map((l) => (
            <NavItem key={l.to} {...l} />
          ))}
          {currentUser?.role === 'admin' && (
            <>
              <div className="px-3 mt-5 mb-2 text-[11px] uppercase tracking-wider text-slate-500">
                Administrator
              </div>
              {adminLinks.map((l) => (
                <NavItem key={l.to} {...l} />
              ))}
            </>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
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
              <div className="text-[11px] uppercase tracking-wider text-slate-400">
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
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-100">
        <Outlet />
      </main>
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
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
          isActive
            ? 'bg-brand-500 text-white shadow-soft'
            : 'text-slate-300 hover:bg-white/5'
        }`
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  );
}
