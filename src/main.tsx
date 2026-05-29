import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AppProvider } from './context/AppContext';
import './index.css';

// Desktop (.exe/.dmg) "online rejim": Tauri ichida ishlayotgan bo'lsa va
// VITE_API_BASE (Vercel manzili) berilgan bo'lsa — to'g'ridan-to'g'ri o'sha
// jonli saytni yuklaymiz. Shunda Vercel'ga yangi deploy qilinsa, o'rnatilgan
// ilova qayta ochilganda avtomatik yangi versiyani ko'rsatadi (qayta tarqatish shart emas).
// Internet bo'lmasa — bundle'dagi (offline) versiya ishlaydi.
(() => {
  try {
    const remote = (import.meta as any).env?.VITE_API_BASE as string | undefined;
    const inTauri = typeof window !== 'undefined' &&
      ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
    if (
      inTauri &&
      remote &&
      navigator.onLine &&
      !window.location.href.startsWith(remote)
    ) {
      window.location.replace(remote);
    }
  } catch {
    // jim — bundle versiyasida davom etamiz
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: '12px', background: '#0f172a', color: '#fff' },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
