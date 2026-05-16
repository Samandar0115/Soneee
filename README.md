# Soneee CRM — Call Center Virtual Control Room

Zamonaviy CRM tizimi — call center va mijoz murojaatlarini real vaqt rejimida
boshqarish, tahlil qilish va nazorat qilish uchun mo'ljallangan.

## Texnologik stek

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **Animatsiyalar:** Framer Motion
- **Backend:** Firebase Firestore (real-time `onSnapshot`)
- **Auth:** Firebase Anonymous Auth (Firestore qoidalari uchun)
- **Vizualizatsiya:** Recharts
- **Deploy:** Vercel

> Firebase sozlamalari berilmasa, ilova avtomatik **DEMO rejimga** (localStorage)
> o'tadi va lokal qurilmada to'liq ishlaydi.

## Funksionallik

- Real-time pipeline (Kanban) — drag & drop bilan bosqichlarni o'zgartirish
- Ticket boshqaruvi — yaratish, tahrirlash, hal qilish, tarix (history)
- Dinamik bosqich maydonlari (`fields`) — har bir bosqich uchun moslab olinadi
- Foydalanuvchi rollari: **Admin** (to'liq huquq) va **Operator**
- KPI dashboard, 7 kunlik trendlar, operator samaradorligi
- **Zap (Test Scenario)** — bitta tugma bilan to'liq ticket lifecycle simulyatsiyasi
- `handleFirestoreError` — batafsil JSON xato loglari

## Lokal ishga tushirish

```bash
npm install
npm run dev
```

Dastur `http://localhost:5173` da ochiladi.

### Demo kirish ma'lumotlari

| Rol | Username | Parol |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Operator | `operator1` | `operator123` |
| Operator | `operator2` | `operator123` |

## Firebase ulanishi (ixtiyoriy)

1. [Firebase Console](https://console.firebase.google.com) da yangi loyiha yarating.
2. Firestore Database'ni yoqing.
3. Authentication → Sign-in method → **Anonymous** ni yoqing.
4. Web App ni qo'shing va konfiguratsiyani oling.
5. Lokal uchun `.env` fayl yarating (namuna: `.env.example`):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

6. Birinchi ishga tushirishda boshlang'ich seed ma'lumotlar Firestore'ga
   avtomatik yuklanadi.

### Firestore qoidalari (namuna)

`firestore.rules` fayliga qarang.

## Vercel'ga deploy qilish

1. Repozitoriyani GitHub'ga push qiling (allaqachon: `samandar0115/soneee`).
2. [vercel.com/new](https://vercel.com/new) → ushbu repodan import qiling.
3. **Framework Preset:** Vite (avtomatik aniqlanadi).
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. Environment Variables bo'limida `VITE_FIREBASE_*` o'zgaruvchilarni qo'shing
   (yoki bo'sh qoldiring — demo rejim ishlaydi).
7. Deploy.

`vercel.json` allaqachon SPA fallback bilan sozlangan.

## Loyiha tuzilmasi

```
src/
  api/            — boshlang'ich seed data
  components/     — Layout, Modal, TicketModal, StatCard, PageHeader
  context/        — AppContext (Firestore + localStorage hybrid)
  pages/          — Login, Dashboard, Pipeline, Tickets, Reports, Users, Stages
  utils/          — formatlash, xato handler
  firebase.ts     — Firebase init (env bor bo'lsa)
  types.ts        — TypeScript modellari
```
