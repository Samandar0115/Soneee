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
        <Route index element={<Dashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="calls" element={<CallLogsPage />} />
        <Route path="cargo" element={<CargoPage />} />
        <Route path="warehouse" element={<WarehousePage />} />
        <Route path="knowledge" element={<Knowledge />} />
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
      </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
