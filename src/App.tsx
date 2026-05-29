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
import Track from './pages/Track';
import GlobalSearch from './components/GlobalSearch';
import KeyboardShortcuts from './components/KeyboardShortcuts';

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

function AdminOnly({ children }: { children: JSX.Element }) {
  const { currentUser } = useApp();
  if (currentUser?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

// O'quvchi faqat O'quv markazidan foydalanadi — CRM sahifalariga kira olmaydi
function NonLearner({ children }: { children: JSX.Element }) {
  const { currentUser } = useApp();
  if (currentUser?.role === 'learner') return <Navigate to="/learn" replace />;
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
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<NonLearner><Dashboard /></NonLearner>} />
          <Route path="leads" element={<NonLearner><LeadsPage /></NonLearner>} />
          <Route path="pipeline" element={<NonLearner><Pipeline /></NonLearner>} />
          <Route path="tickets" element={<NonLearner><Tickets /></NonLearner>} />
          <Route path="calls" element={<NonLearner><CallLogsPage /></NonLearner>} />
          <Route path="cargo" element={<NonLearner><CargoPage /></NonLearner>} />
          <Route path="warehouse" element={<NonLearner><WarehousePage /></NonLearner>} />
          <Route path="knowledge" element={<NonLearner><Knowledge /></NonLearner>} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route
            path="users"
            element={
              <AdminOnly>
                <UsersPage />
              </AdminOnly>
            }
          />
          <Route
            path="stages"
            element={
              <AdminOnly>
                <StagesPage />
              </AdminOnly>
            }
          />
          <Route
            path="categories"
            element={
              <AdminOnly>
                <CategoriesPage />
              </AdminOnly>
            }
          />
          <Route
            path="settings"
            element={
              <AdminOnly>
                <SettingsPage />
              </AdminOnly>
            }
          />
          <Route
            path="analytics"
            element={
              <AdminOnly>
                <Analytics />
              </AdminOnly>
            }
          />
          <Route
            path="templates"
            element={
              <AdminOnly>
                <TemplatesPage />
              </AdminOnly>
            }
          />
          <Route
            path="curriculum"
            element={
              <AdminOnly>
                <CurriculumPage />
              </AdminOnly>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
