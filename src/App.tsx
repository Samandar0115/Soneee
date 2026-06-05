import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Tickets from './pages/Tickets';
import Knowledge from './pages/Knowledge';
import UsersPage from './pages/Users';
import StagesPage from './pages/Stages';
import CategoriesPage from './pages/Categories';
import SettingsPage from './pages/Settings';
import Analytics from './pages/Analytics';
import TemplatesPage from './pages/Templates';
import CallLogsPage from './pages/CallLogs';
import CargoPage from './pages/Cargo';
import WarehousePage from './pages/Warehouse';
import LeadsPage from './pages/Leads';
import LearnPage from './pages/Learn';
import CurriculumPage from './pages/Curriculum';
import ProfilePage from './pages/Profile';
import RolesPage from './pages/Roles';
import TrashPage from './pages/Trash';
import MisrouteDailyPage from './pages/MisrouteDaily';
import TrekRequestsPage from './pages/TrekRequests';
import ComplaintsPage from './pages/Complaints';
import Track from './pages/Track';
import Check from './pages/Check';
import GlobalSearch from './components/GlobalSearch';
import KeyboardShortcuts from './components/KeyboardShortcuts';

import type { PageKey } from './types';

const PAGE_ROUTE: Partial<Record<PageKey, string>> = {
  dashboard: '/', leads: '/leads', pipeline: '/pipeline', tickets: '/tickets',
  calls: '/calls', cargo: '/cargo', warehouse: '/warehouse', knowledge: '/knowledge',
  learn: '/learn', analytics: '/analytics', users: '/users', stages: '/stages',
  categories: '/categories', templates: '/templates', curriculum: '/curriculum',
  roles: '/roles', settings: '/settings',
};

// Rolga qarab birinchi ochiq sahifa (kirish manzili)
export function landingPath(perms: { manage: boolean; pages: PageKey[] }): string {
  if (perms.manage || perms.pages.includes('dashboard')) return '/';
  for (const p of perms.pages) {
    if (PAGE_ROUTE[p]) return PAGE_ROUTE[p]!;
  }
  return '/profile';
}

function Protected({ children }: { children: JSX.Element }) {
  const { currentUser, ready } = useApp();
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Yuklanmoqda…
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

// Admin darajasidagi sahifalar (xodimlar, rollar, sozlamalar...)
function RequireManage({ children }: { children: JSX.Element }) {
  const { perms } = useApp();
  if (!perms.manage) return <Navigate to={landingPath(perms)} replace />;
  return children;
}

// Bo'limga kirish — rol ruxsatiga qarab
function RequirePage({ page, children }: { page: PageKey; children: JSX.Element }) {
  const { perms } = useApp();
  if (!perms.manage && !perms.pages.includes(page)) {
    return <Navigate to={landingPath(perms)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <GlobalSearch />
      <KeyboardShortcuts />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/track" element={<Track />} />
        <Route path="/check" element={<Check />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<RequirePage page="dashboard"><Dashboard /></RequirePage>} />
          <Route path="leads" element={<RequirePage page="leads"><LeadsPage /></RequirePage>} />
          <Route path="pipeline" element={<RequirePage page="pipeline"><Pipeline /></RequirePage>} />
          <Route path="tickets" element={<RequirePage page="tickets"><Tickets /></RequirePage>} />
          <Route path="calls" element={<RequirePage page="calls"><CallLogsPage /></RequirePage>} />
          <Route path="cargo" element={<RequirePage page="cargo"><CargoPage /></RequirePage>} />
          <Route path="warehouse" element={<RequirePage page="warehouse"><WarehousePage /></RequirePage>} />
          <Route path="knowledge" element={<RequirePage page="knowledge"><Knowledge /></RequirePage>} />
          <Route path="learn" element={<RequirePage page="learn"><LearnPage /></RequirePage>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="users" element={<RequireManage><UsersPage /></RequireManage>} />
          <Route path="roles" element={<RequireManage><RolesPage /></RequireManage>} />
          <Route path="trash" element={<RequireManage><TrashPage /></RequireManage>} />
          <Route path="misroute-daily" element={<RequireManage><MisrouteDailyPage /></RequireManage>} />
          <Route path="complaints" element={<RequireManage><ComplaintsPage /></RequireManage>} />
          <Route path="trek-requests" element={<Protected><TrekRequestsPage /></Protected>} />
          <Route path="stages" element={<RequireManage><StagesPage /></RequireManage>} />
          <Route path="categories" element={<RequireManage><CategoriesPage /></RequireManage>} />
          <Route path="settings" element={<RequireManage><SettingsPage /></RequireManage>} />
          <Route path="analytics" element={<RequireManage><Analytics /></RequireManage>} />
          <Route path="templates" element={<RequireManage><TemplatesPage /></RequireManage>} />
          <Route path="curriculum" element={<RequireManage><CurriculumPage /></RequireManage>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
