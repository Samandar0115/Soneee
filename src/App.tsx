import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GlobalSearch from './components/GlobalSearch';
import KeyboardShortcuts from './components/KeyboardShortcuts';

// Code splitting — sahifalar talab qilinganda yuklanadi (initial bundle 2.5 MB → ~700 KB)
const Pipeline = lazy(() => import('./pages/Pipeline'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const UsersPage = lazy(() => import('./pages/Users'));
const StagesPage = lazy(() => import('./pages/Stages'));
const CategoriesPage = lazy(() => import('./pages/Categories'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const TemplatesPage = lazy(() => import('./pages/Templates'));
const CallLogsPage = lazy(() => import('./pages/CallLogs'));
const CargoPage = lazy(() => import('./pages/Cargo'));
const WarehousePage = lazy(() => import('./pages/Warehouse'));
const Track = lazy(() => import('./pages/Track'));

function PageFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin" />
        <div className="text-xs">Yuklanmoqda…</div>
      </div>
    </div>
  );
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
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </>
  );
}
