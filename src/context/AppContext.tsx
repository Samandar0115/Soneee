import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type {
  Announcement,
  AppNotification,
  AppSettings,
  Attachment,
  Branch,
  CallLog,
  CargoShipment,
  Category,
  Lead,
  LeadSource,
  LeadStatus,
  Track,
  Lesson,
  LearnerProgress,
  LessonProgress,
  ProfileChange,
  CustomerRating,
  Lang,
  NotificationType,
  ResponseTemplate,
  Stage,
  TariffSettings,
  Ticket,
  TicketHistoryEntry,
  TicketNote,
  TicketStatus,
  User,
} from '../types';
import { db, FIREBASE_ENABLED } from '../firebase';
import {
  seedAnnouncements,
  seedAppSettings,
  seedBranches,
  seedCategories,
  seedStages,
  seedTariff,
  seedTemplates,
  seedUsers,
  seedLessons,
  seedTracks,
} from '../api/seed';
import { handleFirestoreError } from '../utils/errors';
import { generateTrackingNumber, randomId } from '../utils/format';
import {
  loadFromKV,
  saveToKV,
  checkKVStatus,
  loadMetaFromKV,
  loadCollectionFromKV,
  saveCollectionToKV,
  saveUserToKV,
  deleteUserFromKV,
  apiUrl,
  type CollectionName,
} from '../utils/vercelKV';
import { broadcastChange, onBroadcast } from '../utils/broadcast';
import { saveDailyBackup } from '../utils/backup';

interface AppState {
  ready: boolean;
  backend: 'firebase' | 'local';
  currentUser: User | null;
  users: User[];
  stages: Stage[];
  tickets: Ticket[];
  categories: Category[];
  announcements: Announcement[];
  branches: Branch[];
  tariff: TariffSettings;
  settings: AppSettings;
  templates: ResponseTemplate[];
  notifications: AppNotification[];
  callLogs: CallLog[];
  cargoShipments: CargoShipment[];
  leads: Lead[];
  tracks: Track[];
  lessons: Lesson[];
  learnerProgress: LearnerProgress[];
  profileChanges: ProfileChange[];
  kvConfigured: boolean;
  kvReady: boolean;
  lang: Lang;
  theme: 'light' | 'dark';
  setLang: (l: Lang) => void;
  setTheme: (t: 'light' | 'dark') => void;
  login: (username: string, password: string) => User | null;
  logout: () => void;
  findByTracking: (tracking: string) => Ticket | undefined;
  findByPhone: (phone: string) => Ticket[];
  createTicket: (data: Omit<Ticket, 'id' | 'trackingNumber' | 'history' | 'createdAt' | 'updatedAt' | 'status'> & { trackingNumber?: string }) => Promise<Ticket>;
  updateTicket: (id: string, patch: Partial<Ticket>, note?: string) => Promise<void>;
  moveTicket: (id: string, stageId: string) => Promise<void>;
  resolveTicket: (id: string, resolution: string) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  addAttachment: (ticketId: string, file: Attachment) => Promise<void>;
  removeAttachment: (ticketId: string, attachmentId: string) => Promise<void>;
  addNote: (ticketId: string, kind: 'internal' | 'public', text: string) => Promise<void>;
  rateTicket: (ticketId: string, rating: CustomerRating) => Promise<void>;
  saveUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateOwnProfile: (patch: { photo?: string; password?: string; fullName?: string; phone?: string; username?: string }) => Promise<void>;
  saveStage: (stage: Stage) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  saveCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveAnnouncement: (a: Announcement) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  saveBranch: (b: Branch) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  saveTariff: (t: TariffSettings) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  saveTemplate: (t: ResponseTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  pushNotification: (n: Omit<AppNotification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  notifyCallback: (ticket: Ticket) => void;
  archiveOldResolved: (days: number) => number;
  startCallLog: (data: Omit<CallLog, 'id' | 'startedAt' | 'outcome'>) => CallLog;
  updateCallLog: (id: string, patch: Partial<CallLog>) => void;
  deleteCallLog: (id: string) => void;
  importCargoShipments: (shipments: CargoShipment[]) => void;
  deleteCargoShipment: (id: string) => void;
  clearCargoShipments: () => void;
  addLeads: (phones: string[], source: LeadSource, notes?: string) => number;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  markLeadInfoGiven: (id: string) => void;
  setLeadOutcome: (id: string, status: LeadStatus, note?: string) => void;
  deleteLead: (id: string) => void;
  deleteLeads: (ids: string[]) => void;
  markLeadsInfoGiven: (ids: string[]) => void;
  clearLeads: (status?: LeadStatus) => void;
  saveTrack: (track: Track) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  saveLesson: (lesson: Lesson) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  recordVideoWatched: (lessonId: string) => void;
  recordQuizResult: (lessonId: string, scorePct: number, passScorePct: number, addSeconds?: number) => boolean;
  setLearnerRevoked: (userId: string, revoked: boolean) => void;
  myProgress: () => LearnerProgress | undefined;
  exportBackup: () => string;
  importBackup: (json: string) => boolean;
  runTestScenario: () => Promise<Ticket | null>;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEYS = {
  users: 'ipost.users',
  stages: 'ipost.stages',
  tickets: 'ipost.tickets',
  categories: 'ipost.categories',
  announcements: 'ipost.announcements',
  branches: 'ipost.branches',
  tariff: 'ipost.tariff',
  settings: 'ipost.settings',
  templates: 'ipost.templates',
  notifications: 'ipost.notifications',
  callLogs: 'ipost.callLogs',
  cargoShipments: 'ipost.cargoShipments',
  leads: 'ipost.leads',
  tracks: 'ipost.tracks',
  lessons: 'ipost.lessons',
  learnerProgress: 'ipost.learnerProgress',
  profileChanges: 'ipost.profileChanges',
  userPhotos: 'ipost.userPhotos',
  lang: 'ipost.lang',
  theme: 'ipost.theme',
  session: 'ipost.session',
};

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Foydalanuvchi rasmlari faqat shu kompyuterda saqlanadi — KV'ga yuborilmaydi.
// Bu Vercel KV'da joy egallashni 90%+ kamaytiradi (har bir rasm ~10-40 KB,
// 20 xodimda ~800 KB). Login/parol/role/faceDescriptor esa KV'da bo'ladi —
// shu sababli istalgan PC'dan kirish va Face ID baribir ishlaydi.
function stripUserPhotos(users: User[]): User[] {
  return users.map((u) => {
    if (!u.photo) return u;
    const { photo: _, ...rest } = u;
    return rest as User;
  });
}

function loadLocalUserPhotos(): Record<string, string> {
  return loadLocal<Record<string, string>>('ipost.userPhotos', {});
}

function saveLocalUserPhotos(users: User[]) {
  const map: Record<string, string> = {};
  users.forEach((u) => {
    if (u.photo) map[u.id] = u.photo;
  });
  saveLocal('ipost.userPhotos', map);
}

function hydrateUserPhotos(users: User[]): User[] {
  const photos = loadLocalUserPhotos();
  return users.map((u) => (u.photo || !photos[u.id] ? u : { ...u, photo: photos[u.id] }));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tariff, setTariff] = useState<TariffSettings>(seedTariff);
  const [settings, setSettings] = useState<AppSettings>(seedAppSettings);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [cargoShipments, setCargoShipments] = useState<CargoShipment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [learnerProgress, setLearnerProgress] = useState<LearnerProgress[]>([]);
  const [profileChanges, setProfileChanges] = useState<ProfileChange[]>([]);
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(STORAGE_KEYS.lang) as Lang) || 'uz');
  const [theme, setThemeState] = useState<'light' | 'dark'>(
    () => (localStorage.getItem(STORAGE_KEYS.theme) as 'light' | 'dark') || 'light'
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.lang, lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const setTheme = useCallback((t: 'light' | 'dark') => setThemeState(t), []);
  const seededRef = useRef(false);

  const backend: 'firebase' | 'local' = FIREBASE_ENABLED && db ? 'firebase' : 'local';

  /* ---------------- Firebase subscriptions ---------------- */
  useEffect(() => {
    if (backend !== 'firebase' || !db) return;
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setUsers(snap.docs.map((d) => d.data() as User)),
      (err) => handleFirestoreError('users:onSnapshot', err)
    );
    const unsubStages = onSnapshot(
      collection(db, 'stages'),
      (snap) =>
        setStages(
          snap.docs
            .map((d) => d.data() as Stage)
            .sort((a, b) => a.order - b.order)
        ),
      (err) => handleFirestoreError('stages:onSnapshot', err)
    );
    const unsubTickets = onSnapshot(
      collection(db, 'tickets'),
      (snap) => {
        setTickets(snap.docs.map((d) => d.data() as Ticket));
        setReady(true);
      },
      (err) => handleFirestoreError('tickets:onSnapshot', err)
    );
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snap) =>
        setCategories(
          snap.docs
            .map((d) => d.data() as Category)
            .sort((a, b) => a.order - b.order)
        ),
      (err) => handleFirestoreError('categories:onSnapshot', err)
    );
    const unsubAnn = onSnapshot(
      collection(db, 'announcements'),
      (snap) =>
        setAnnouncements(
          snap.docs.map((d) => d.data() as Announcement).sort((a, b) => b.updatedAt - a.updatedAt)
        ),
      (err) => handleFirestoreError('announcements:onSnapshot', err)
    );
    const unsubBranches = onSnapshot(
      collection(db, 'branches'),
      (snap) =>
        setBranches(
          snap.docs.map((d) => d.data() as Branch).sort((a, b) => a.order - b.order)
        ),
      (err) => handleFirestoreError('branches:onSnapshot', err)
    );
    const unsubTariff = onSnapshot(
      doc(db, 'settings', 'tariff'),
      (snap) => {
        if (snap.exists()) setTariff(snap.data() as TariffSettings);
      },
      (err) => handleFirestoreError('tariff:onSnapshot', err)
    );
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'app'),
      (snap) => {
        if (snap.exists()) setSettings(snap.data() as AppSettings);
      },
      (err) => handleFirestoreError('settings:onSnapshot', err)
    );
    const unsubTemplates = onSnapshot(
      collection(db, 'templates'),
      (snap) =>
        setTemplates(
          snap.docs.map((d) => d.data() as ResponseTemplate).sort((a, b) => a.order - b.order)
        ),
      (err) => handleFirestoreError('templates:onSnapshot', err)
    );
    return () => {
      unsubUsers();
      unsubStages();
      unsubTickets();
      unsubCategories();
      unsubAnn();
      unsubBranches();
      unsubTariff();
      unsubSettings();
      unsubTemplates();
    };
  }, [backend]);

  /* ---------------- Local mode initial load ---------------- */
  useEffect(() => {
    if (backend !== 'local') return;
    setUsers(loadLocal<User[]>(STORAGE_KEYS.users, seedUsers));
    setStages(loadLocal<Stage[]>(STORAGE_KEYS.stages, seedStages));
    setTickets(loadLocal<Ticket[]>(STORAGE_KEYS.tickets, []));
    setCategories(loadLocal<Category[]>(STORAGE_KEYS.categories, seedCategories));
    setAnnouncements(loadLocal<Announcement[]>(STORAGE_KEYS.announcements, seedAnnouncements));
    setBranches(loadLocal<Branch[]>(STORAGE_KEYS.branches, seedBranches));
    const loadedTariff = loadLocal<TariffSettings>(STORAGE_KEYS.tariff, seedTariff);
    // Eski default ($6.40) bo'lsa avto-yangilash
    if (loadedTariff.pricePerM3 === 800 && loadedTariff.kgPerM3 === 125) {
      setTariff(seedTariff);
      saveLocal(STORAGE_KEYS.tariff, seedTariff);
    } else {
      setTariff(loadedTariff);
    }
    setSettings(loadLocal<AppSettings>(STORAGE_KEYS.settings, seedAppSettings));
    setTemplates(loadLocal<ResponseTemplate[]>(STORAGE_KEYS.templates, seedTemplates));
    setNotifications(loadLocal<AppNotification[]>(STORAGE_KEYS.notifications, []));
    setCallLogs(loadLocal<CallLog[]>(STORAGE_KEYS.callLogs, []));
    setCargoShipments(loadLocal<CargoShipment[]>(STORAGE_KEYS.cargoShipments, []));
    setLeads(loadLocal<Lead[]>(STORAGE_KEYS.leads, []));
    setTracks(loadLocal<Track[]>(STORAGE_KEYS.tracks, seedTracks));
    setLessons(loadLocal<Lesson[]>(STORAGE_KEYS.lessons, seedLessons));
    setLearnerProgress(loadLocal<LearnerProgress[]>(STORAGE_KEYS.learnerProgress, []));
    setProfileChanges(loadLocal<ProfileChange[]>(STORAGE_KEYS.profileChanges, []));
    if (!localStorage.getItem(STORAGE_KEYS.tracks)) saveLocal(STORAGE_KEYS.tracks, seedTracks);
    if (!localStorage.getItem(STORAGE_KEYS.lessons)) saveLocal(STORAGE_KEYS.lessons, seedLessons);
    if (!localStorage.getItem(STORAGE_KEYS.users)) saveLocal(STORAGE_KEYS.users, seedUsers);
    if (!localStorage.getItem(STORAGE_KEYS.stages)) saveLocal(STORAGE_KEYS.stages, seedStages);
    if (!localStorage.getItem(STORAGE_KEYS.categories)) saveLocal(STORAGE_KEYS.categories, seedCategories);
    if (!localStorage.getItem(STORAGE_KEYS.announcements)) saveLocal(STORAGE_KEYS.announcements, seedAnnouncements);
    if (!localStorage.getItem(STORAGE_KEYS.branches)) saveLocal(STORAGE_KEYS.branches, seedBranches);
    if (!localStorage.getItem(STORAGE_KEYS.tariff)) saveLocal(STORAGE_KEYS.tariff, seedTariff);
    if (!localStorage.getItem(STORAGE_KEYS.settings)) saveLocal(STORAGE_KEYS.settings, seedAppSettings);
    if (!localStorage.getItem(STORAGE_KEYS.templates)) saveLocal(STORAGE_KEYS.templates, seedTemplates);
    setReady(true);
  }, [backend]);

  /* ---------------- Seed firestore once if empty ---------------- */
  useEffect(() => {
    if (backend !== 'firebase' || !db || !ready || seededRef.current) return;
    if (users.length === 0 && stages.length === 0) {
      seededRef.current = true;
      const fsdb = db;
      (async () => {
        try {
          const batch = writeBatch(fsdb);
          seedUsers.forEach((u) => batch.set(doc(fsdb, 'users', u.id), u));
          seedStages.forEach((s) => batch.set(doc(fsdb, 'stages', s.id), s));
          seedCategories.forEach((c) => batch.set(doc(fsdb, 'categories', c.id), c));
          seedAnnouncements.forEach((a) => batch.set(doc(fsdb, 'announcements', a.id), a));
          seedBranches.forEach((b) => batch.set(doc(fsdb, 'branches', b.id), b));
          batch.set(doc(fsdb, 'settings', 'tariff'), seedTariff);
          batch.set(doc(fsdb, 'settings', 'app'), seedAppSettings);
          seedTemplates.forEach((t) => batch.set(doc(fsdb, 'templates', t.id), t));
          await batch.commit();
        } catch (err) {
          handleFirestoreError('seed:initial', err);
        }
      })();
    }
  }, [backend, ready, users.length, stages.length]);

  /* ---------------- Persist local mode ---------------- */
  useEffect(() => {
    if (backend === 'local' && ready) {
      saveLocal(STORAGE_KEYS.users, users);
      // Rasmlarni alohida lokal mapga ham saqlaymiz — KV'dan kelganda hydrate qilamiz
      saveLocalUserPhotos(users);
    }
  }, [users, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.stages, stages);
  }, [stages, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.tickets, tickets);
  }, [tickets, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.categories, categories);
  }, [categories, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.announcements, announcements);
  }, [announcements, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.branches, branches);
  }, [branches, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.tariff, tariff);
  }, [tariff, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.settings, settings);
  }, [settings, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.templates, templates);
  }, [templates, backend, ready]);
  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.notifications, notifications);
  }, [notifications, backend, ready]);

  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.callLogs, callLogs);
  }, [callLogs, backend, ready]);

  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.cargoShipments, cargoShipments);
  }, [cargoShipments, backend, ready]);

  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.leads, leads);
  }, [leads, backend, ready]);

  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.tracks, tracks);
  }, [tracks, backend, ready]);

  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.lessons, lessons);
  }, [lessons, backend, ready]);

  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.learnerProgress, learnerProgress);
  }, [learnerProgress, backend, ready]);

  useEffect(() => {
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.profileChanges, profileChanges);
  }, [profileChanges, backend, ready]);

  /* ---------------- Session restore ---------------- */
  useEffect(() => {
    if (!ready) return;
    const sessionId = localStorage.getItem(STORAGE_KEYS.session);
    if (sessionId) {
      const u = users.find((x) => x.id === sessionId);
      if (u) setCurrentUser(u);
    }
  }, [ready, users]);

  /* ---------------- Vercel KV: auto-load ---------------- */
  // Har safar ilova ochilganda Vercel KV'dan ma'lumot olib kelamiz (agar
  // konfiguratsiya qilingan bo'lsa). Bu Face ID descriptor'lar va boshqa
  // ma'lumotlarni qurilmalararo sinxronlashtirish uchun kerak.
  const kvLoadedRef = useRef(false);
  const [kvReady, setKvReady] = useState(false);
  const [kvConfigured, setKvConfigured] = useState(false);

  // MUHIM: cheksiz save↔pull↔save siklini to'xtatish uchun.
  // KV'dan kelgan (yoki boshlang'ich yuklangan) ma'lumotni state'ga qo'yganda,
  // shu state o'zgarishi natijasida ishga tushadigan scheduleCollectionSave'ni
  // bir martaga o'tkazib yuboramiz. Aks holda KV'dan o'qilgan data qaytadan
  // KV'ga yozilib, meta yangilanib, keyingi polling uni "yangi" deb qayta o'qiydi —
  // bu Vercel'da 178K+ ortiqcha so'rov va 14 GB trafik keltirib chiqargan.
  const suppressSaveRef = useRef<Record<string, boolean>>({});

  const ALL_COLLECTIONS: CollectionName[] = [
    'users', 'stages', 'tickets', 'categories', 'announcements', 'branches',
    'tariff', 'settings', 'templates', 'notifications', 'callLogs', 'cargoShipments', 'leads',
    'tracks', 'lessons', 'learnerProgress', 'profileChanges',
  ];

  useEffect(() => {
    if (backend !== 'local' || !ready || kvLoadedRef.current) return;
    kvLoadedRef.current = true;
    (async () => {
      try {
        const status = await checkKVStatus();
        setKvConfigured(status.configured);
        if (!status.configured) {
          setKvReady(true);
          return;
        }
        const remote = await loadFromKV();
        if (remote && remote.data) {
          const d = remote.data;
          if (Array.isArray(d.users) && d.users.length > 0) {
            const remote = hydrateUserPhotos(d.users) as User[];
            // Mahalliy localStorage'dagi foydalanuvchilarni yo'qotmaslik uchun merge
            const local = loadLocal<User[]>(STORAGE_KEYS.users, []);
            const map = new Map<string, User>();
            remote.forEach((u) => map.set(u.id, u));
            local.forEach((u) => {
              if (!map.has(u.id)) {
                // Lokal'da bor, KV'da yo'q — saqlash to'liq sinxron bo'lmagan,
                // qaytadan KV'ga yuborish uchun mark qilamiz
                map.set(u.id, u);
              }
            });
            const merged = Array.from(map.values());
            setUsers(merged);
            // Agar mahalliy versiya KV'dan farq qilsa — qaytadan KV'ga sinxronlash
            if (merged.length > remote.length) {
              setTimeout(() => {
                void flushCollectionSave('users', merged);
              }, 1000);
            }
          }
          if (Array.isArray(d.stages) && d.stages.length > 0) setStages(d.stages);
          if (Array.isArray(d.tickets)) setTickets(d.tickets);
          if (Array.isArray(d.categories) && d.categories.length > 0) setCategories(d.categories);
          if (Array.isArray(d.announcements)) setAnnouncements(d.announcements);
          if (Array.isArray(d.branches) && d.branches.length > 0) setBranches(d.branches);
          if (d.tariff) setTariff(d.tariff);
          if (d.settings) setSettings(d.settings);
          if (Array.isArray(d.templates)) setTemplates(d.templates);
          if (Array.isArray(d.notifications)) setNotifications(d.notifications);
          if (Array.isArray(d.callLogs)) setCallLogs(d.callLogs);
          if (Array.isArray(d.cargoShipments)) setCargoShipments(d.cargoShipments);
          if (Array.isArray(d.leads)) setLeads(d.leads);
          if (Array.isArray(d.tracks) && d.tracks.length > 0) setTracks(d.tracks);
          if (Array.isArray(d.lessons) && d.lessons.length > 0) setLessons(d.lessons);
          if (Array.isArray(d.learnerProgress)) setLearnerProgress(d.learnerProgress);
          if (Array.isArray(d.profileChanges)) setProfileChanges(d.profileChanges);
        }
      } catch {
        // jim — fallback localStorage
      } finally {
        // kvReady false→true bo'lganda barcha 13 ta save effekti qayta ishga tushadi.
        // Boshlang'ich yuklangan data'ni qayta KV'ga yozmaslik uchun hammasini suppress qilamiz.
        ALL_COLLECTIONS.forEach((n) => { suppressSaveRef.current[n] = true; });
        setKvReady(true);
      }
    })();
  }, [backend, ready]);

  /* ---------------- Vercel KV: per-collection delta save ---------------- */
  // Har bir kolleksiya o'zgarganda alohida saqlanadi (5-10 MB blob emas, ~10-100 KB).
  // Bir vaqtning o'zida bir nechta kolleksiya o'zgarsa ham hammasi parallel saqlanadi.
  const collectionTimersRef = useRef<Record<string, number>>({});

  // Oxirgi muvaffaqiyatli KV'ga yuborilgan ma'lumotning "barmoq izi" (hash).
  // Agar yangi qiymat aynan shu bo'lsa — tarmoqqa umuman chiqmaymiz.
  // Bu cheksiz siklga MUTLAQ kafolat: bir xil data hech qachon ikki marta yuborilmaydi.
  const lastSentHashRef = useRef<Record<string, string>>({});

  // Tez, yengil hash (djb2) — katta JSON uchun ham O(n), lekin saqlash kamdan-kam bo'ladi
  function cheapHash(s: string): string {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
    return `${s.length}:${h}`;
  }

  // KV'ga yuborilayotgan ma'lumotni filtrlash: foydalanuvchi rasmlari faqat
  // lokal bo'lib qoladi (joy ekonomiyasi uchun)
  function valueForKV(name: CollectionName, value: unknown): unknown {
    if (name === 'users' && Array.isArray(value)) {
      return stripUserPhotos(value as User[]);
    }
    return value;
  }

  function scheduleCollectionSave(name: CollectionName, value: unknown) {
    if (backend !== 'local' || !kvReady || !kvConfigured) return;
    // Agar bu state o'zgarishi KV'dan kelgan (pull/initial) bo'lsa — qayta saqlamaymiz.
    // Bu cheksiz save↔pull siklini uzadi.
    if (suppressSaveRef.current[name]) {
      suppressSaveRef.current[name] = false;
      return;
    }
    const timers = collectionTimersRef.current;
    if (timers[name]) clearTimeout(timers[name]);
    timers[name] = window.setTimeout(() => {
      const payload = valueForKV(name, value);
      const hash = cheapHash(JSON.stringify(payload ?? null));
      // MUTLAQ himoya: bir xil ma'lumot allaqachon yuborilgan bo'lsa — tarmoqqa chiqmaymiz
      if (lastSentHashRef.current[name] === hash) return;
      saveCollectionToKV(name, payload)
        .then((r) => {
          if (r.ok) {
            lastSentHashRef.current[name] = hash;
            broadcastChange(name);
          }
        })
        .catch(() => {});
    }, 700);
  }

  // Darhol KV'ga yozish — debounce'ni bekor qiladi, javobni await qiladi.
  // Saqlash tugmasi bosilganda 100% ishonch uchun ishlatiladi.
  async function flushCollectionSave(name: CollectionName, value: unknown): Promise<boolean> {
    if (backend !== 'local' || !kvReady || !kvConfigured) return true;
    const timers = collectionTimersRef.current;
    if (timers[name]) {
      clearTimeout(timers[name]);
      delete timers[name];
    }
    try {
      const payload = valueForKV(name, value);
      const hash = cheapHash(JSON.stringify(payload ?? null));
      // Bir xil ma'lumot allaqachon yuborilgan bo'lsa — qayta yubormaymiz (lekin ok qaytaramiz)
      if (lastSentHashRef.current[name] === hash) return true;
      const r = await saveCollectionToKV(name, payload);
      if (r.ok) {
        lastSentHashRef.current[name] = hash;
        broadcastChange(name);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Har bir state uchun alohida useEffect — faqat o'sha kolleksiya o'zgarganda yoziladi
  useEffect(() => { scheduleCollectionSave('users', users); }, [users, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('stages', stages); }, [stages, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('tickets', tickets); }, [tickets, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('categories', categories); }, [categories, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('announcements', announcements); }, [announcements, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('branches', branches); }, [branches, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('tariff', tariff); }, [tariff, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('settings', settings); }, [settings, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('templates', templates); }, [templates, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('notifications', notifications); }, [notifications, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('callLogs', callLogs); }, [callLogs, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('cargoShipments', cargoShipments); }, [cargoShipments, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('leads', leads); }, [leads, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('tracks', tracks); }, [tracks, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('lessons', lessons); }, [lessons, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('learnerProgress', learnerProgress); }, [learnerProgress, backend, kvReady, kvConfigured]);
  useEffect(() => { scheduleCollectionSave('profileChanges', profileChanges); }, [profileChanges, backend, kvReady, kvConfigured]);

  useEffect(() => {
    return () => {
      Object.values(collectionTimersRef.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // Sahifa yopilayotganda barcha kutilayotgan debounce'larni darhol KV'ga yozish.
  // Ma'lumot yo'qolmasligi uchun beforeunload va visibilitychange'da flush qilamiz.
  // Pending state'ni ref orqali ushlab boramiz (closure stale bo'lmasligi uchun).
  const pendingStateRef = useRef<Partial<Record<CollectionName, unknown>>>({});
  useEffect(() => { pendingStateRef.current.users = users; }, [users]);
  useEffect(() => { pendingStateRef.current.stages = stages; }, [stages]);
  useEffect(() => { pendingStateRef.current.tickets = tickets; }, [tickets]);
  useEffect(() => { pendingStateRef.current.categories = categories; }, [categories]);
  useEffect(() => { pendingStateRef.current.announcements = announcements; }, [announcements]);
  useEffect(() => { pendingStateRef.current.branches = branches; }, [branches]);
  useEffect(() => { pendingStateRef.current.tariff = tariff; }, [tariff]);
  useEffect(() => { pendingStateRef.current.settings = settings; }, [settings]);
  useEffect(() => { pendingStateRef.current.templates = templates; }, [templates]);
  useEffect(() => { pendingStateRef.current.notifications = notifications; }, [notifications]);
  useEffect(() => { pendingStateRef.current.callLogs = callLogs; }, [callLogs]);
  useEffect(() => { pendingStateRef.current.cargoShipments = cargoShipments; }, [cargoShipments]);
  useEffect(() => { pendingStateRef.current.leads = leads; }, [leads]);
  useEffect(() => { pendingStateRef.current.tracks = tracks; }, [tracks]);
  useEffect(() => { pendingStateRef.current.lessons = lessons; }, [lessons]);
  useEffect(() => { pendingStateRef.current.learnerProgress = learnerProgress; }, [learnerProgress]);
  useEffect(() => { pendingStateRef.current.profileChanges = profileChanges; }, [profileChanges]);

  useEffect(() => {
    if (backend !== 'local' || !kvReady || !kvConfigured) return;
    const flushAllPending = () => {
      const timers = collectionTimersRef.current;
      const names = Object.keys(timers) as CollectionName[];
      if (names.length === 0) return;
      // sendBeacon — sahifa yopilayotganda ham yetkazib beradi
      names.forEach((name) => {
        clearTimeout(timers[name]);
        delete timers[name];
        const data = pendingStateRef.current[name];
        if (data === undefined) return;
        try {
          const payload = JSON.stringify({ data: valueForKV(name, data) });
          const blob = new Blob([payload], { type: 'application/json' });
          if (navigator.sendBeacon) {
            navigator.sendBeacon(
              apiUrl(`/api/state?collection=${encodeURIComponent(name)}`),
              blob
            );
          } else {
            // fallback — keepalive fetch (xatolarni jim ushlaymiz)
            fetch(apiUrl(`/api/state?collection=${encodeURIComponent(name)}`), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
              keepalive: true,
            }).catch(() => {});
          }
        } catch {}
      });
    };
    const onBeforeUnload = () => flushAllPending();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushAllPending();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [backend, kvReady, kvConfigured]);

  /* ---------------- KV polling (meta) + cross-tab broadcast ---------------- */
  // Har bir kolleksiya uchun oxirgi sinxronlash vaqtini eslab boramiz.
  // Polling avval meta'ni oladi (~200 bayt), keyin faqat yangilangan kolleksiyani.
  const lastSyncMetaRef = useRef<Record<string, number>>({});
  const lastLocalChangeRef = useRef<Record<string, number>>({});

  function setterFor(name: CollectionName): (v: any) => void {
    switch (name) {
      case 'users': return (v) => {
        if (!Array.isArray(v) || v.length === 0) return;
        const remote = hydrateUserPhotos(v) as User[];
        // MERGE: mahalliy foydalanuvchini hech qachon yo'qotmaymiz.
        // Agar mahalliyda KV'da yo'q user bo'lsa — bu yaqinda yaratilgan, saqlash
        // hali to'liq sync bo'lmagan. Uni saqlab qolamiz.
        setUsers((prev) => {
          const map = new Map<string, User>();
          remote.forEach((u) => map.set(u.id, u));
          prev.forEach((u) => {
            if (!map.has(u.id)) {
              map.set(u.id, u);
            } else {
              // Ikkalasida ham bor — KV versiyasini olamiz, lekin lokal foto'ni qo'shamiz
              const r = map.get(u.id)!;
              map.set(u.id, { ...r, photo: r.photo ?? u.photo });
            }
          });
          return Array.from(map.values());
        });
      };
      case 'stages': return (v) => Array.isArray(v) && v.length > 0 && setStages(v);
      case 'tickets': return (v) => Array.isArray(v) && setTickets(v);
      case 'categories': return (v) => Array.isArray(v) && v.length > 0 && setCategories(v);
      case 'announcements': return (v) => Array.isArray(v) && setAnnouncements(v);
      case 'branches': return (v) => Array.isArray(v) && v.length > 0 && setBranches(v);
      case 'tariff': return (v) => v && setTariff(v);
      case 'settings': return (v) => v && setSettings(v);
      case 'templates': return (v) => Array.isArray(v) && setTemplates(v);
      case 'notifications': return (v) => Array.isArray(v) && setNotifications(v);
      case 'callLogs': return (v) => Array.isArray(v) && setCallLogs(v);
      case 'cargoShipments': return (v) => Array.isArray(v) && setCargoShipments(v);
      case 'leads': return (v) => Array.isArray(v) && setLeads(v);
      case 'tracks': return (v) => Array.isArray(v) && v.length > 0 && setTracks(v);
      case 'lessons': return (v) => Array.isArray(v) && v.length > 0 && setLessons(v);
      case 'learnerProgress': return (v) => Array.isArray(v) && setLearnerProgress(v);
      case 'profileChanges': return (v) => Array.isArray(v) && setProfileChanges(v);
    }
  }

  async function pullChangedCollections(meta: Record<string, number>) {
    const toFetch: CollectionName[] = [];
    (Object.keys(meta) as CollectionName[]).forEach((name) => {
      const remoteTs = meta[name] || 0;
      const lastSync = lastSyncMetaRef.current[name] || 0;
      const lastLocal = lastLocalChangeRef.current[name] || 0;
      if (remoteTs <= lastSync) return;
      // Mahalliy o'zgartirish 10 sekunddan kam vaqt oldin bo'lgan bo'lsa — o'tkazib yuboramiz.
      // Bu race condition'ni oldini oladi: saqlash 1-2 sek davom etishi mumkin, polling
      // bir vaqtning o'zida KV'dan eski versiyani olib mahalliy state'ni qaytarmasligi uchun.
      if (Date.now() - lastLocal < 10000) return;
      toFetch.push(name);
    });
    if (toFetch.length === 0) return;
    await Promise.all(
      toFetch.map(async (name) => {
        const res = await loadCollectionFromKV(name);
        if (!res) return;
        // KV'dan kelgan data'ni qayta KV'ga yozmaymiz — siklni uzamiz.
        // Hash'ni ham yangilaymiz: aynan shu data hech qachon qaytib yuborilmaydi.
        suppressSaveRef.current[name] = true;
        lastSentHashRef.current[name] = cheapHash(JSON.stringify(valueForKV(name, res.data) ?? null));
        setterFor(name)(res.data);
        lastSyncMetaRef.current[name] = res.updatedAt;
      })
    );
  }

  // Mahalliy o'zgarish vaqti — race avoidance uchun
  useEffect(() => { lastLocalChangeRef.current.users = Date.now(); }, [users]);
  useEffect(() => { lastLocalChangeRef.current.stages = Date.now(); }, [stages]);
  useEffect(() => { lastLocalChangeRef.current.tickets = Date.now(); }, [tickets]);
  useEffect(() => { lastLocalChangeRef.current.categories = Date.now(); }, [categories]);
  useEffect(() => { lastLocalChangeRef.current.announcements = Date.now(); }, [announcements]);
  useEffect(() => { lastLocalChangeRef.current.branches = Date.now(); }, [branches]);
  useEffect(() => { lastLocalChangeRef.current.tariff = Date.now(); }, [tariff]);
  useEffect(() => { lastLocalChangeRef.current.settings = Date.now(); }, [settings]);
  useEffect(() => { lastLocalChangeRef.current.templates = Date.now(); }, [templates]);
  useEffect(() => { lastLocalChangeRef.current.notifications = Date.now(); }, [notifications]);
  useEffect(() => { lastLocalChangeRef.current.callLogs = Date.now(); }, [callLogs]);
  useEffect(() => { lastLocalChangeRef.current.cargoShipments = Date.now(); }, [cargoShipments]);
  useEffect(() => { lastLocalChangeRef.current.leads = Date.now(); }, [leads]);
  useEffect(() => { lastLocalChangeRef.current.tracks = Date.now(); }, [tracks]);
  useEffect(() => { lastLocalChangeRef.current.lessons = Date.now(); }, [lessons]);
  useEffect(() => { lastLocalChangeRef.current.learnerProgress = Date.now(); }, [learnerProgress]);
  useEffect(() => { lastLocalChangeRef.current.profileChanges = Date.now(); }, [profileChanges]);

  // Meta polling — visibility-aware: tab aktiv bo'lganda har 15 sek, yashirin bo'lsa to'xtaydi.
  // Bu Vercel Fast Origin Transfer'ni ~80% kamaytiradi (avval 5s × doimiy edi).
  // Edge cache (s-maxage=3) bilan birgalikda bir nechta operator bitta origin'ga boradi.
  useEffect(() => {
    if (backend !== 'local' || !kvReady || !kvConfigured) return;
    let intervalId: number | null = null;
    const tick = async () => {
      if (document.hidden) return;
      const meta = await loadMetaFromKV();
      if (meta) await pullChangedCollections(meta);
    };
    const start = () => {
      if (intervalId !== null) return;
      tick();
      intervalId = window.setInterval(tick, 15000);
    };
    const stop = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVis);
    start();
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [backend, kvReady, kvConfigured]);

  // BroadcastChannel — boshqa tab'dan o'zgarish kelsa zudlik bilan
  useEffect(() => {
    if (backend !== 'local' || !kvReady || !kvConfigured) return;
    const unsub = onBroadcast(async () => {
      const meta = await loadMetaFromKV();
      if (meta) await pullChangedCollections(meta);
    });
    return unsub;
  }, [backend, kvReady, kvConfigured]);

  // Window fokuslanganda darhol bir marta poll qiladi — foydalanuvchi tab'ga qaytganda yangi data
  useEffect(() => {
    if (backend !== 'local' || !kvReady || !kvConfigured) return;
    const onFocus = async () => {
      const meta = await loadMetaFromKV();
      if (meta) await pullChangedCollections(meta);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [backend, kvReady, kvConfigured]);

  /* ---------------- Avto-backup (har kun bir marta) ---------------- */
  useEffect(() => {
    if (!ready) return;
    // 30 sekund kechikish — boshlang'ich yuklash tugashini kutamiz
    const t = window.setTimeout(() => {
      saveDailyBackup({
        users, stages, tickets, categories, announcements,
        branches, tariff, settings, templates, callLogs, cargoShipments, leads,
      });
    }, 30000);
    return () => clearTimeout(t);
  }, [ready, users, stages, tickets, categories, announcements, branches, tariff, settings, templates, callLogs, cargoShipments, leads]);

  /* ---------------- Auth ---------------- */
  const login = useCallback(
    (username: string, password: string) => {
      const u = users.find(
        (x) => x.username.trim() === username.trim() && x.password === password
      );
      if (u) {
        setCurrentUser(u);
        localStorage.setItem(STORAGE_KEYS.session, u.id);
        return u;
      }
      return null;
    },
    [users]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.session);
  }, []);

  /* ---------------- Mutations ---------------- */
  const writeDoc = useCallback(
    async (col: string, id: string, value: unknown) => {
      if (backend === 'firebase' && db) {
        try {
          await setDoc(doc(db, col, id), value as Record<string, unknown>);
        } catch (err) {
          handleFirestoreError(`${col}:set`, err);
        }
      }
    },
    [backend]
  );

  const removeDoc = useCallback(
    async (col: string, id: string) => {
      if (backend === 'firebase' && db) {
        try {
          await deleteDoc(doc(db, col, id));
        } catch (err) {
          handleFirestoreError(`${col}:delete`, err);
        }
      }
    },
    [backend]
  );

  const createTicket = useCallback<AppState['createTicket']>(
    async (data) => {
      const id = randomId('tkt');
      const now = Date.now();
      const firstStage = stages[0]?.id ?? '';
      const priority = data.priority ?? 'normal';

      // Auto-assignment
      let assigneeId = data.assigneeId;
      if (!assigneeId && settings.autoAssign !== 'off') {
        const operators = users.filter((u) => u.role === 'operator');
        if (operators.length > 0) {
          if (settings.autoAssign === 'least-busy') {
            const loadMap = new Map<string, number>();
            operators.forEach((o) => loadMap.set(o.id, 0));
            tickets.forEach((t) => {
              if (t.status === 'pending' && t.assigneeId && loadMap.has(t.assigneeId)) {
                loadMap.set(t.assigneeId, (loadMap.get(t.assigneeId) ?? 0) + 1);
              }
            });
            assigneeId = [...loadMap.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
          } else {
            const lastAssigned = tickets
              .filter((t) => t.assigneeId && operators.find((o) => o.id === t.assigneeId))
              .sort((a, b) => b.createdAt - a.createdAt)[0]?.assigneeId;
            const idx = operators.findIndex((o) => o.id === lastAssigned);
            assigneeId = operators[(idx + 1) % operators.length].id;
          }
        }
      }

      const slaDueAt = now + (settings.slaMinutes[priority] ?? 480) * 60_000;

      const ticket: Ticket = {
        id,
        trackingNumber: data.trackingNumber || generateTrackingNumber(),
        status: 'pending' as TicketStatus,
        stageId: data.stageId || firstStage,
        categoryId: data.categoryId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        channel: data.channel,
        priority,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
        assigneeId,
        details: data.details ?? {},
        attachments: data.attachments ?? [],
        internalNotes: data.internalNotes ?? [],
        publicComments: data.publicComments ?? [],
        slaDueAt,
        misroute: data.misroute,
        warehouseTracks: data.warehouseTracks,
        history: [
          {
            id: randomId('h'),
            timestamp: now,
            actorId: data.createdBy,
            actorName: currentUser?.fullName ?? currentUser?.username,
            action: 'Ticket yaratildi',
            stageId: data.stageId || firstStage,
          },
        ],
      };
      const nextTickets = [ticket, ...tickets];
      setTickets(nextTickets);
      await writeDoc('tickets', id, ticket);
      // Darhol KV'ga yozish — saqlash 100% kafolatlanadi
      const ok = await flushCollectionSave('tickets', nextTickets);
      if (!ok && backend === 'local' && kvConfigured) {
        throw new Error('Murojaat bazaga saqlanmadi — internetni tekshiring');
      }
      return ticket;
    },
    [stages, users, tickets, settings, currentUser, writeDoc, backend, kvConfigured, kvReady]
  );

  const appendHistory = (ticket: Ticket, entry: Omit<TicketHistoryEntry, 'id' | 'timestamp'>) => {
    const h: TicketHistoryEntry = {
      ...entry,
      id: randomId('h'),
      timestamp: Date.now(),
    };
    return { ...ticket, history: [...ticket.history, h], updatedAt: h.timestamp };
  };

  const updateTicket = useCallback<AppState['updateTicket']>(
    async (id, patch, note) => {
      const nextTickets = tickets.map((t) => {
        if (t.id !== id) return t;
        let next = { ...t, ...patch, updatedAt: Date.now() } as Ticket;
        if (note) {
          next = appendHistory(next, {
            actorId: currentUser?.id ?? 'system',
            actorName: currentUser?.fullName ?? currentUser?.username,
            action: note,
          });
        }
        return next;
      });
      const updated = nextTickets.find((t) => t.id === id) ?? null;
      setTickets(nextTickets);
      if (updated) await writeDoc('tickets', id, updated);
      const ok = await flushCollectionSave('tickets', nextTickets);
      if (!ok && backend === 'local' && kvConfigured) {
        throw new Error('Murojaat bazaga saqlanmadi');
      }
    },
    [tickets, currentUser, writeDoc, backend, kvConfigured, kvReady]
  );

  const moveTicket = useCallback<AppState['moveTicket']>(
    async (id, stageId) => {
      const nextTickets = tickets.map((t) => {
        if (t.id !== id) return t;
        const stage = stages.find((s) => s.id === stageId);
        return appendHistory(
          { ...t, stageId, updatedAt: Date.now() },
          {
            actorId: currentUser?.id ?? 'system',
            actorName: currentUser?.fullName ?? currentUser?.username,
            action: `Bosqich → ${stage?.name ?? stageId}`,
            stageId,
          }
        );
      });
      const updated = nextTickets.find((t) => t.id === id) ?? null;
      setTickets(nextTickets);
      if (updated) await writeDoc('tickets', id, updated);
      await flushCollectionSave('tickets', nextTickets);
    },
    [tickets, currentUser, stages, writeDoc, backend, kvConfigured, kvReady]
  );

  const resolveTicket = useCallback<AppState['resolveTicket']>(
    async (id, resolution) => {
      const resolvedStage = stages.find((s) => /hal|resolved/i.test(s.name)) ?? stages[stages.length - 1];
      const nextTickets = tickets.map((t) => {
        if (t.id !== id) return t;
        return appendHistory(
          {
            ...t,
            status: 'resolved' as TicketStatus,
            stageId: resolvedStage?.id ?? t.stageId,
            resolvedAt: Date.now(),
            details: { ...t.details, resolution },
          },
          {
            actorId: currentUser?.id ?? 'system',
            actorName: currentUser?.fullName ?? currentUser?.username,
            action: 'Hal etildi',
            note: resolution,
          }
        );
      });
      const updated = nextTickets.find((t) => t.id === id) ?? null;
      setTickets(nextTickets);
      if (updated) await writeDoc('tickets', id, updated);
      const ok = await flushCollectionSave('tickets', nextTickets);
      if (!ok && backend === 'local' && kvConfigured) {
        throw new Error('Hal etish bazaga saqlanmadi');
      }
    },
    [tickets, currentUser, stages, writeDoc, backend, kvConfigured, kvReady]
  );

  const deleteTicket = useCallback<AppState['deleteTicket']>(
    async (id) => {
      const next = tickets.filter((t) => t.id !== id);
      setTickets(next);
      await removeDoc('tickets', id);
      await flushCollectionSave('tickets', next);
    },
    [tickets, removeDoc, backend, kvConfigured, kvReady]
  );

  const saveUser = useCallback<AppState['saveUser']>(
    async (user) => {
      // Sinxron belgilash — polling shu zahoti KV'dan eski versiyani olmasligi uchun
      lastLocalChangeRef.current.users = Date.now();
      const exists = users.some((u) => u.id === user.id);
      const next = exists ? users.map((u) => (u.id === user.id ? user : u)) : [...users, user];
      setUsers(next);
      await writeDoc('users', user.id, user);
      // ATOMIK saqlash: faqat bitta user yoziladi (HSET), boshqalarni o'zgartirmaydi.
      // 30+ xodim bo'lganda ham har biri mustaqil va xavfsiz saqlanadi.
      if (backend === 'local' && kvConfigured && kvReady) {
        // Photo strip — KV'ga foto yuborilmaydi
        const stripped = (() => {
          if (!user.photo) return user;
          const { photo: _photo, ...rest } = user;
          return rest as typeof user;
        })();
        const r = await saveUserToKV(stripped as unknown as { id: string } & Record<string, unknown>);
        lastLocalChangeRef.current.users = Date.now();
        lastSyncMetaRef.current.users = Date.now();
        if (!r.ok) {
          throw new Error(r.error || 'Bazaga saqlanmadi — internetni tekshiring');
        }
      } else {
        // Fallback — KV ulanmagan bo'lsa lokal localStorage yetarli
        lastLocalChangeRef.current.users = Date.now();
      }
    },
    [users, writeDoc, backend, kvConfigured, kvReady]
  );

  const deleteUser = useCallback<AppState['deleteUser']>(
    async (id) => {
      lastLocalChangeRef.current.users = Date.now();
      const next = users.filter((u) => u.id !== id);
      setUsers(next);
      await removeDoc('users', id);
      if (backend === 'local' && kvConfigured && kvReady) {
        await deleteUserFromKV(id);
        lastLocalChangeRef.current.users = Date.now();
        lastSyncMetaRef.current.users = Date.now();
      }
    },
    [users, removeDoc, backend, kvConfigured, kvReady]
  );

  // Xodim o'z profilini o'zgartiradi (rasm/parol/ism/telefon) — admin jurnalga yoziladi
  const updateOwnProfile = useCallback<AppState['updateOwnProfile']>(
    async (patch) => {
      if (!currentUser) return;
      const now = Date.now();
      // Login (username) o'zgartirilsa — boshqa xodimda bormasligini tekshiramiz
      if (patch.username !== undefined && patch.username !== currentUser.username) {
        const taken = users.some((u) => u.id !== currentUser.id && u.username.trim().toLowerCase() === patch.username!.trim().toLowerCase());
        if (taken) throw new Error('Bu login band — boshqasini tanlang');
      }
      const fields: Array<['photo' | 'password' | 'fullName' | 'phone' | 'username', ProfileChange['field']]> = [
        ['photo', 'photo'], ['password', 'password'], ['fullName', 'name'], ['phone', 'phone'], ['username', 'username'],
      ];
      const changes: ProfileChange[] = [];
      for (const [key, field] of fields) {
        const v = patch[key];
        if (v !== undefined && v !== (currentUser as unknown as Record<string, unknown>)[key]) {
          changes.push({
            id: randomId('pc'),
            userId: currentUser.id,
            userName: currentUser.fullName ?? currentUser.username,
            field,
            changedAt: now,
          });
        }
      }
      const updated: User = { ...currentUser, ...patch };
      await saveUser(updated);
      setCurrentUser(updated);
      if (changes.length) {
        const next = [...changes, ...profileChanges].slice(0, 3000);
        setProfileChanges(next);
        void flushCollectionSave('profileChanges', next);
      }
    },
    [currentUser, users, saveUser, profileChanges, backend, kvConfigured, kvReady]
  );

  const saveStage = useCallback<AppState['saveStage']>(
    async (stage) => {
      const exists = stages.some((s) => s.id === stage.id);
      const merged = exists ? stages.map((s) => (s.id === stage.id ? stage : s)) : [...stages, stage];
      const next = merged.sort((a, b) => a.order - b.order);
      setStages(next);
      await writeDoc('stages', stage.id, stage);
      const ok = await flushCollectionSave('stages', next);
      if (!ok && backend === 'local' && kvConfigured) throw new Error('Bazaga saqlanmadi');
    },
    [stages, writeDoc, backend, kvConfigured, kvReady]
  );

  const deleteStage = useCallback<AppState['deleteStage']>(
    async (id) => {
      const next = stages.filter((s) => s.id !== id);
      setStages(next);
      await removeDoc('stages', id);
      await flushCollectionSave('stages', next);
    },
    [stages, removeDoc, backend, kvConfigured, kvReady]
  );

  const saveCategory = useCallback<AppState['saveCategory']>(
    async (category) => {
      const exists = categories.some((c) => c.id === category.id);
      const merged = exists
        ? categories.map((c) => (c.id === category.id ? category : c))
        : [...categories, category];
      const next = merged.sort((a, b) => a.order - b.order);
      setCategories(next);
      await writeDoc('categories', category.id, category);
      const ok = await flushCollectionSave('categories', next);
      if (!ok && backend === 'local' && kvConfigured) throw new Error('Bazaga saqlanmadi');
    },
    [categories, writeDoc, backend, kvConfigured, kvReady]
  );

  const deleteCategory = useCallback<AppState['deleteCategory']>(
    async (id) => {
      const next = categories.filter((c) => c.id !== id);
      setCategories(next);
      await removeDoc('categories', id);
      await flushCollectionSave('categories', next);
    },
    [categories, removeDoc, backend, kvConfigured, kvReady]
  );

  const saveAnnouncement = useCallback<AppState['saveAnnouncement']>(
    async (a) => {
      const next: Announcement = { ...a, updatedAt: Date.now() };
      setAnnouncements((prev) => {
        const exists = prev.some((x) => x.id === next.id);
        const list = exists ? prev.map((x) => (x.id === next.id ? next : x)) : [next, ...prev];
        return [...list].sort((x, y) => y.updatedAt - x.updatedAt);
      });
      await writeDoc('announcements', next.id, next);
    },
    [writeDoc]
  );

  const deleteAnnouncement = useCallback<AppState['deleteAnnouncement']>(
    async (id) => {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      await removeDoc('announcements', id);
    },
    [removeDoc]
  );

  const saveBranch = useCallback<AppState['saveBranch']>(
    async (b) => {
      const exists = branches.some((x) => x.id === b.id);
      const merged = exists ? branches.map((x) => (x.id === b.id ? b : x)) : [...branches, b];
      const next = merged.sort((x, y) => x.order - y.order);
      setBranches(next);
      await writeDoc('branches', b.id, b);
      const ok = await flushCollectionSave('branches', next);
      if (!ok && backend === 'local' && kvConfigured) throw new Error('Bazaga saqlanmadi');
    },
    [branches, writeDoc, backend, kvConfigured, kvReady]
  );

  const deleteBranch = useCallback<AppState['deleteBranch']>(
    async (id) => {
      const next = branches.filter((b) => b.id !== id);
      setBranches(next);
      await removeDoc('branches', id);
      await flushCollectionSave('branches', next);
    },
    [branches, removeDoc, backend, kvConfigured, kvReady]
  );

  const saveTariff = useCallback<AppState['saveTariff']>(
    async (t) => {
      const next: TariffSettings = { ...t, id: 'main', updatedAt: Date.now() };
      setTariff(next);
      if (backend === 'firebase' && db) {
        try {
          await setDoc(doc(db, 'settings', 'tariff'), next);
        } catch (err) {
          handleFirestoreError('tariff:set', err);
        }
      }
      // Darhol KV'ga — tarif o'zgarishi ishonchli saqlanadi
      await flushCollectionSave('tariff', next);
    },
    [backend, kvConfigured, kvReady]
  );

  const saveSettings = useCallback<AppState['saveSettings']>(
    async (s) => {
      const next: AppSettings = { ...s, id: 'main', updatedAt: Date.now() };
      setSettings(next);
      if (backend === 'firebase' && db) {
        try {
          await setDoc(doc(db, 'settings', 'app'), next);
        } catch (err) {
          handleFirestoreError('settings:set', err);
        }
      }
    },
    [backend]
  );

  const saveTemplate = useCallback<AppState['saveTemplate']>(
    async (tpl) => {
      setTemplates((prev) => {
        const exists = prev.some((x) => x.id === tpl.id);
        const next = exists ? prev.map((x) => (x.id === tpl.id ? tpl : x)) : [...prev, tpl];
        return next.sort((a, b) => a.order - b.order);
      });
      await writeDoc('templates', tpl.id, tpl);
    },
    [writeDoc]
  );

  const deleteTemplate = useCallback<AppState['deleteTemplate']>(
    async (id) => {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      await removeDoc('templates', id);
    },
    [removeDoc]
  );

  const pushNotification = useCallback<AppState['pushNotification']>((n) => {
    const full: AppNotification = {
      ...n,
      id: randomId('ntf'),
      createdAt: Date.now(),
    };
    setNotifications((prev) => [full, ...prev].slice(0, 200));
  }, []);

  const markNotificationRead = useCallback<AppState['markNotificationRead']>((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: Date.now() } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback<AppState['markAllNotificationsRead']>(() => {
    const now = Date.now();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
  }, []);

  const clearNotifications = useCallback<AppState['clearNotifications']>(() => {
    setNotifications([]);
  }, []);

  // === Call Logs ===
  const startCallLog = useCallback<AppState['startCallLog']>((data) => {
    const log: CallLog = {
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      startedAt: Date.now(),
      outcome: 'pending',
      ...data,
    };
    setCallLogs((prev) => [log, ...prev].slice(0, 5000));
    return log;
  }, []);

  const updateCallLog = useCallback<AppState['updateCallLog']>((id, patch) => {
    setCallLogs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const deleteCallLog = useCallback<AppState['deleteCallLog']>((id) => {
    setCallLogs((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // === Cargo Shipments (admin yuklaydi Excel'dan) ===
  const importCargoShipments = useCallback<AppState['importCargoShipments']>((shipments) => {
    setCargoShipments((prev) => {
      // Trek raqami bo'yicha duplicate'larni yangilash (admin qayta yuklashi mumkin)
      const map = new Map<string, CargoShipment>();
      prev.forEach((s) => map.set(s.trackingNumber, s));
      shipments.forEach((s) => map.set(s.trackingNumber, s));
      return Array.from(map.values()).slice(0, 50000);
    });
  }, []);

  const deleteCargoShipment = useCallback<AppState['deleteCargoShipment']>((id) => {
    setCargoShipments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearCargoShipments = useCallback<AppState['clearCargoShipments']>(() => {
    setCargoShipments([]);
  }, []);

  // === Leads (yangi murojaatlar / qo'ng'iroq navbati) ===
  const addLeads = useCallback<AppState['addLeads']>(
    (phones, source, notes) => {
      if (!currentUser) return 0;
      const now = Date.now();
      const cleaned = phones.map((p) => p.trim()).filter((p) => p.length > 0);
      if (cleaned.length === 0) return 0;
      const newLeads: Lead[] = cleaned.map((phone, i) => ({
        id: `lead-${now}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        phone,
        source,
        status: 'new',
        notes: notes?.trim() || undefined,
        createdAt: now + i,
        createdBy: currentUser.id,
        createdByName: currentUser.fullName ?? currentUser.username,
      }));
      const next = [...newLeads, ...leads].slice(0, 50000);
      setLeads(next);
      // Darhol KV'ga — yangi qabul qilingan raqamlar bir lahzada saqlanadi
      void flushCollectionSave('leads', next);
      return newLeads.length;
    },
    [leads, currentUser, backend, kvConfigured, kvReady]
  );

  const updateLead = useCallback<AppState['updateLead']>(
    (id, patch) => {
      const next = leads.map((l) => (l.id === id ? { ...l, ...patch } : l));
      setLeads(next);
      void flushCollectionSave('leads', next);
    },
    [leads, backend, kvConfigured, kvReady]
  );

  const markLeadInfoGiven = useCallback<AppState['markLeadInfoGiven']>(
    (id) => {
      if (!currentUser) return;
      const now = Date.now();
      const next = leads.map((l) =>
        l.id === id
          ? {
              ...l,
              status: 'info_given' as LeadStatus,
              calledAt: now,
              calledBy: currentUser.id,
              calledByName: currentUser.fullName ?? currentUser.username,
            }
          : l
      );
      setLeads(next);
      void flushCollectionSave('leads', next);
    },
    [leads, currentUser, backend, kvConfigured, kvReady]
  );

  // Qo'ng'iroq natijasi/kategoriya + izoh: info berildi, kechroq bog'lanish, bog'lana olmadi...
  const setLeadOutcome = useCallback<AppState['setLeadOutcome']>(
    (id, status, note) => {
      if (!currentUser) return;
      const now = Date.now();
      const next = leads.map((l) =>
        l.id === id
          ? {
              ...l,
              status,
              notes: note !== undefined ? note : l.notes,
              calledAt: l.calledAt ?? now,
              calledBy: l.calledBy ?? currentUser.id,
              calledByName: l.calledByName ?? (currentUser.fullName ?? currentUser.username),
            }
          : l
      );
      setLeads(next);
      void flushCollectionSave('leads', next);
    },
    [leads, currentUser, backend, kvConfigured, kvReady]
  );

  const deleteLead = useCallback<AppState['deleteLead']>(
    (id) => {
      const next = leads.filter((l) => l.id !== id);
      setLeads(next);
      void flushCollectionSave('leads', next);
    },
    [leads, backend, kvConfigured, kvReady]
  );

  // Ommaviy o'chirish — bittalab emas, belgilangan barchasini bir saqlash bilan
  const deleteLeads = useCallback<AppState['deleteLeads']>(
    (ids) => {
      const idSet = new Set(ids);
      const next = leads.filter((l) => !idSet.has(l.id));
      setLeads(next);
      void flushCollectionSave('leads', next);
    },
    [leads, backend, kvConfigured, kvReady]
  );

  // Ommaviy "Info berildi" belgilash
  const markLeadsInfoGiven = useCallback<AppState['markLeadsInfoGiven']>(
    (ids) => {
      if (!currentUser) return;
      const now = Date.now();
      const idSet = new Set(ids);
      const next = leads.map((l) =>
        idSet.has(l.id)
          ? {
              ...l,
              status: 'info_given' as LeadStatus,
              calledAt: l.calledAt ?? now,
              calledBy: l.calledBy ?? currentUser.id,
              calledByName: l.calledByName ?? (currentUser.fullName ?? currentUser.username),
            }
          : l
      );
      setLeads(next);
      void flushCollectionSave('leads', next);
    },
    [leads, currentUser, backend, kvConfigured, kvReady]
  );

  const clearLeads = useCallback<AppState['clearLeads']>(
    (status) => {
      const next = status ? leads.filter((l) => l.status !== status) : [];
      setLeads(next);
      void flushCollectionSave('leads', next);
    },
    [leads, backend, kvConfigured, kvReady]
  );

  // === LMS — Yo'nalishlar (admin) ===
  const saveTrack = useCallback<AppState['saveTrack']>(
    async (track) => {
      const exists = tracks.some((t) => t.id === track.id);
      const merged = exists ? tracks.map((t) => (t.id === track.id ? track : t)) : [...tracks, track];
      const next = merged.sort((a, b) => a.order - b.order);
      setTracks(next);
      const ok = await flushCollectionSave('tracks', next);
      if (!ok && backend === 'local' && kvConfigured) throw new Error('Yo\'nalish saqlanmadi');
    },
    [tracks, backend, kvConfigured, kvReady]
  );

  const deleteTrack = useCallback<AppState['deleteTrack']>(
    async (id) => {
      const nextTracks = tracks.filter((t) => t.id !== id);
      const nextLessons = lessons.filter((l) => l.trackId !== id);
      setTracks(nextTracks);
      setLessons(nextLessons);
      await flushCollectionSave('tracks', nextTracks);
      await flushCollectionSave('lessons', nextLessons);
    },
    [tracks, lessons, backend, kvConfigured, kvReady]
  );

  // === LMS — Darslar (admin) ===
  const saveLesson = useCallback<AppState['saveLesson']>(
    async (lesson) => {
      const stamped: Lesson = { ...lesson, updatedAt: Date.now() };
      const exists = lessons.some((l) => l.id === stamped.id);
      const merged = exists ? lessons.map((l) => (l.id === stamped.id ? stamped : l)) : [...lessons, stamped];
      const next = merged.sort((a, b) => a.day - b.day);
      setLessons(next);
      const ok = await flushCollectionSave('lessons', next);
      if (!ok && backend === 'local' && kvConfigured) throw new Error('Dars bazaga saqlanmadi');
    },
    [lessons, backend, kvConfigured, kvReady]
  );

  const deleteLesson = useCallback<AppState['deleteLesson']>(
    async (id) => {
      const next = lessons.filter((l) => l.id !== id);
      setLessons(next);
      await flushCollectionSave('lessons', next);
    },
    [lessons, backend, kvConfigured, kvReady]
  );

  // === LMS — O'quvchi progressi ===
  const myProgress = useCallback<AppState['myProgress']>(() => {
    if (!currentUser) return undefined;
    return learnerProgress.find((p) => p.userId === currentUser.id);
  }, [learnerProgress, currentUser]);

  // Joriy foydalanuvchi progressini xavfsiz yangilash (upsert) — bitta saqlash bilan
  const mutateMyProgress = useCallback(
    (fn: (p: LearnerProgress) => LearnerProgress) => {
      if (!currentUser) return;
      const now = Date.now();
      const existing = learnerProgress.find((p) => p.userId === currentUser.id);
      const base: LearnerProgress = existing ?? {
        id: currentUser.id,
        userId: currentUser.id,
        userName: currentUser.fullName ?? currentUser.username,
        lessons: {},
        revoked: false,
        startedAt: now,
        updatedAt: now,
      };
      const updated = { ...fn({ ...base, lessons: { ...base.lessons } }), updatedAt: now };
      const next = existing
        ? learnerProgress.map((p) => (p.userId === currentUser.id ? updated : p))
        : [...learnerProgress, updated];
      setLearnerProgress(next);
      void flushCollectionSave('learnerProgress', next);
    },
    [learnerProgress, currentUser, backend, kvConfigured, kvReady]
  );

  const getLessonProgress = (p: LearnerProgress, lessonId: string): LessonProgress =>
    p.lessons[lessonId] ?? {
      lessonId,
      videoWatched: false,
      quizPassed: false,
      bestScorePct: 0,
      attempts: 0,
      timeSpentSec: 0,
    };

  const recordVideoWatched = useCallback<AppState['recordVideoWatched']>(
    (lessonId) => {
      mutateMyProgress((p) => {
        const lp = getLessonProgress(p, lessonId);
        p.lessons[lessonId] = { ...lp, videoWatched: true };
        return p;
      });
    },
    [mutateMyProgress]
  );

  const recordQuizResult = useCallback<AppState['recordQuizResult']>(
    (lessonId, scorePct, passScorePct, addSeconds = 0) => {
      const passed = scorePct >= passScorePct;
      mutateMyProgress((p) => {
        const lp = getLessonProgress(p, lessonId);
        const best = Math.max(lp.bestScorePct, scorePct);
        const nowPassed = lp.quizPassed || passed;
        p.lessons[lessonId] = {
          ...lp,
          attempts: lp.attempts + 1,
          bestScorePct: best,
          quizPassed: nowPassed,
          timeSpentSec: lp.timeSpentSec + Math.max(0, Math.round(addSeconds)),
          completedAt: nowPassed && lp.videoWatched ? (lp.completedAt ?? Date.now()) : lp.completedAt,
        };
        return p;
      });
      return passed;
    },
    [mutateMyProgress]
  );

  // Admin kill switch — o'quvchining kirishini bekor qilish / qaytarish
  const setLearnerRevoked = useCallback<AppState['setLearnerRevoked']>(
    (userId, revoked) => {
      const now = Date.now();
      const existing = learnerProgress.find((p) => p.userId === userId);
      let next: LearnerProgress[];
      if (existing) {
        next = learnerProgress.map((p) => (p.userId === userId ? { ...p, revoked, updatedAt: now } : p));
      } else {
        const u = users.find((x) => x.id === userId);
        next = [
          ...learnerProgress,
          {
            id: userId,
            userId,
            userName: u?.fullName ?? u?.username,
            lessons: {},
            revoked,
            startedAt: now,
            updatedAt: now,
          },
        ];
      }
      setLearnerProgress(next);
      void flushCollectionSave('learnerProgress', next);
    },
    [learnerProgress, users, backend, kvConfigured, kvReady]
  );

  // Mijoz qayta aloqaga chiqdi — boshqa operatorga eslatma
  const notifyCallback = useCallback<AppState['notifyCallback']>((ticket) => {
    if (!currentUser) return;
    if (!ticket.assigneeId) return;
    if (ticket.assigneeId === currentUser.id) return;
    if (ticket.status === 'resolved') return;

    // Bir xil ticket uchun oxirgi 10 daqiqada eslatma yuborilgan bo'lsa, qaytarmaymiz
    const recent = notifications.find(
      (n) =>
        n.ticketId === ticket.id &&
        n.toUserId === ticket.assigneeId &&
        n.type === 'callback' &&
        Date.now() - n.createdAt < 10 * 60_000
    );
    if (recent) return;

    pushNotification({
      toUserId: ticket.assigneeId,
      fromUserId: currentUser.id,
      fromUserName: currentUser.fullName ?? currentUser.username,
      ticketId: ticket.id,
      trackingNumber: ticket.trackingNumber,
      type: 'callback',
      title: 'Mijoz qayta aloqaga chiqdi',
      body: `${ticket.customerName} (${ticket.customerPhone}) — trek ${ticket.trackingNumber}. ${currentUser.fullName ?? currentUser.username} qabul qildi.`,
    });
  }, [currentUser, notifications, pushNotification]);

  const archiveOldResolved = useCallback<AppState['archiveOldResolved']>(
    (days) => {
      const cutoff = Date.now() - days * 86_400_000;
      let removed = 0;
      setTickets((prev) =>
        prev.filter((t) => {
          if (t.status !== 'resolved') return true;
          if (!t.resolvedAt) return true;
          if (t.resolvedAt < cutoff) {
            removed++;
            return false;
          }
          return true;
        })
      );
      return removed;
    },
    []
  );

  const exportBackup = useCallback<AppState['exportBackup']>(() => {
    return JSON.stringify(
      {
        version: 2,
        exportedAt: new Date().toISOString(),
        users,
        stages,
        tickets,
        categories,
        announcements,
        branches,
        tariff,
        settings,
        templates,
        notifications,
      },
      null,
      2
    );
  }, [users, stages, tickets, categories, announcements, branches, tariff, settings, templates, notifications]);

  const importBackup = useCallback<AppState['importBackup']>(
    (json) => {
      try {
        const data = JSON.parse(json);
        if (!data.version) return false;
        if (Array.isArray(data.users)) setUsers(data.users);
        if (Array.isArray(data.stages)) setStages(data.stages);
        if (Array.isArray(data.tickets)) setTickets(data.tickets);
        if (Array.isArray(data.categories)) setCategories(data.categories);
        if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
        if (Array.isArray(data.branches)) setBranches(data.branches);
        if (data.tariff) setTariff(data.tariff);
        if (data.settings) setSettings(data.settings);
        if (Array.isArray(data.templates)) setTemplates(data.templates);
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        if (Array.isArray(data.callLogs)) setCallLogs(data.callLogs);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // O(1) qidiruv uchun indekslar — har bir o'zgarishda qayta hisoblanadi
  const ticketsByTracking = useMemo(() => {
    const map = new Map<string, Ticket>();
    tickets.forEach((t) => {
      if (t.trackingNumber) map.set(t.trackingNumber.toLowerCase().trim(), t);
    });
    return map;
  }, [tickets]);

  // Telefon bo'yicha indeks: normalizatsiya qilingan telefon → ticket'lar (yaratilish sanasi bo'yicha kamayuvchi)
  const ticketsByPhone = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    const sorted = [...tickets].sort((a, b) => b.createdAt - a.createdAt);
    sorted.forEach((t) => {
      const norm = t.customerPhone.replace(/\D/g, '');
      if (!norm) return;
      const arr = map.get(norm);
      if (arr) arr.push(t);
      else map.set(norm, [t]);
    });
    return map;
  }, [tickets]);

  const findByTracking = useCallback<AppState['findByTracking']>(
    (tracking) => {
      const k = tracking.toLowerCase().trim();
      return ticketsByTracking.get(k);
    },
    [ticketsByTracking]
  );

  const findByPhone = useCallback<AppState['findByPhone']>(
    (phone) => {
      const norm = phone.replace(/\D/g, '');
      if (!norm) return [];
      // Aniq mos kelish — O(1)
      const exact = ticketsByPhone.get(norm);
      if (exact) return exact;
      // Suffiks/prefiks moslashuvi — qisqa qidiruv (oxirgi 9 raqam Uz uchun)
      const tail = norm.slice(-9);
      if (tail !== norm) {
        const t2 = ticketsByPhone.get(tail);
        if (t2) return t2;
      }
      // Fallback — to'liq skan (kam hollarda)
      const result: Ticket[] = [];
      ticketsByPhone.forEach((list, key) => {
        if (key.includes(norm)) result.push(...list);
      });
      return result.sort((a, b) => b.createdAt - a.createdAt);
    },
    [ticketsByPhone]
  );

  const addAttachment = useCallback<AppState['addAttachment']>(
    async (ticketId, file) => {
      const nextTickets = tickets.map((t) => {
        if (t.id !== ticketId) return t;
        return { ...t, attachments: [...(t.attachments ?? []), file], updatedAt: Date.now() };
      });
      const updated = nextTickets.find((t) => t.id === ticketId) ?? null;
      setTickets(nextTickets);
      if (updated) await writeDoc('tickets', ticketId, updated);
      await flushCollectionSave('tickets', nextTickets);
    },
    [tickets, writeDoc, backend, kvConfigured, kvReady]
  );

  const removeAttachment = useCallback<AppState['removeAttachment']>(
    async (ticketId, attachmentId) => {
      const nextTickets = tickets.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          attachments: (t.attachments ?? []).filter((a) => a.id !== attachmentId),
          updatedAt: Date.now(),
        };
      });
      const updated = nextTickets.find((t) => t.id === ticketId) ?? null;
      setTickets(nextTickets);
      if (updated) await writeDoc('tickets', ticketId, updated);
      await flushCollectionSave('tickets', nextTickets);
    },
    [tickets, writeDoc, backend, kvConfigured, kvReady]
  );

  const addNote = useCallback<AppState['addNote']>(
    async (ticketId, kind, text) => {
      if (!text.trim()) return;
      const note: TicketNote = {
        id: randomId('n'),
        text: text.trim(),
        authorId: currentUser?.id ?? 'system',
        authorName: currentUser?.fullName ?? currentUser?.username,
        createdAt: Date.now(),
      };
      const nextTickets = tickets.map((t) => {
        if (t.id !== ticketId) return t;
        const next: Ticket = {
          ...t,
          updatedAt: Date.now(),
          firstResponseAt: t.firstResponseAt ?? Date.now(),
        };
        if (kind === 'internal') {
          next.internalNotes = [...(t.internalNotes ?? []), note];
        } else {
          next.publicComments = [...(t.publicComments ?? []), note];
        }
        return next;
      });
      const updated = nextTickets.find((t) => t.id === ticketId) ?? null;
      setTickets(nextTickets);
      if (updated) await writeDoc('tickets', ticketId, updated);
      await flushCollectionSave('tickets', nextTickets);
    },
    [tickets, currentUser, writeDoc, backend, kvConfigured, kvReady]
  );

  const rateTicket = useCallback<AppState['rateTicket']>(
    async (ticketId, rating) => {
      const nextTickets = tickets.map((t) =>
        t.id === ticketId ? { ...t, rating, updatedAt: Date.now() } : t
      );
      const updated = nextTickets.find((t) => t.id === ticketId) ?? null;
      setTickets(nextTickets);
      if (updated) await writeDoc('tickets', ticketId, updated);
      await flushCollectionSave('tickets', nextTickets);
    },
    [tickets, writeDoc, backend, kvConfigured, kvReady]
  );

  const runTestScenario = useCallback<AppState['runTestScenario']>(async () => {
    if (!currentUser || stages.length === 0) return null;
    const ticket = await createTicket({
      stageId: stages[0].id,
      categoryId: categories[0]?.id,
      customerName: 'Test Mijoz',
      customerPhone: '+998 99 999 99 99',
      channel: 'Telefon',
      priority: 'high',
      createdBy: currentUser.id,
      assigneeId: currentUser.id,
      details: { topic: 'Avtomatik test ssenariysi', note: 'Zap tugmasi orqali yaratildi.' },
    });
    setTimeout(() => {
      updateTicket(ticket.id, {}, 'Operator murojaatni qabul qildi');
    }, 250);
    if (stages[1]) {
      setTimeout(() => moveTicket(ticket.id, stages[1].id), 500);
    }
    return ticket;
  }, [currentUser, stages, categories, createTicket, updateTicket, moveTicket]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      backend,
      currentUser,
      users,
      stages,
      tickets,
      categories,
      announcements,
      branches,
      tariff,
      settings,
      templates,
      notifications,
      kvConfigured,
      kvReady,
      lang,
      theme,
      setLang,
      setTheme,
      login,
      logout,
      findByTracking,
      findByPhone,
      createTicket,
      updateTicket,
      moveTicket,
      resolveTicket,
      deleteTicket,
      addAttachment,
      removeAttachment,
      addNote,
      rateTicket,
      saveUser,
      deleteUser,
      updateOwnProfile,
      saveStage,
      deleteStage,
      saveCategory,
      deleteCategory,
      saveAnnouncement,
      deleteAnnouncement,
      saveBranch,
      deleteBranch,
      saveTariff,
      saveSettings,
      saveTemplate,
      deleteTemplate,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      notifyCallback,
      archiveOldResolved,
      callLogs,
      startCallLog,
      updateCallLog,
      deleteCallLog,
      cargoShipments,
      importCargoShipments,
      deleteCargoShipment,
      clearCargoShipments,
      leads,
      addLeads,
      updateLead,
      markLeadInfoGiven,
      setLeadOutcome,
      deleteLead,
      deleteLeads,
      markLeadsInfoGiven,
      clearLeads,
      tracks,
      lessons,
      learnerProgress,
      profileChanges,
      saveTrack,
      deleteTrack,
      saveLesson,
      deleteLesson,
      recordVideoWatched,
      recordQuizResult,
      setLearnerRevoked,
      myProgress,
      exportBackup,
      importBackup,
      runTestScenario,
    }),
    [
      ready,
      backend,
      currentUser,
      users,
      stages,
      tickets,
      categories,
      announcements,
      branches,
      tariff,
      settings,
      templates,
      notifications,
      kvConfigured,
      kvReady,
      lang,
      theme,
      setLang,
      setTheme,
      login,
      logout,
      findByTracking,
      findByPhone,
      createTicket,
      updateTicket,
      moveTicket,
      resolveTicket,
      deleteTicket,
      addAttachment,
      removeAttachment,
      addNote,
      rateTicket,
      saveUser,
      deleteUser,
      updateOwnProfile,
      saveStage,
      deleteStage,
      saveCategory,
      deleteCategory,
      saveAnnouncement,
      deleteAnnouncement,
      saveBranch,
      deleteBranch,
      saveTariff,
      saveSettings,
      saveTemplate,
      deleteTemplate,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      notifyCallback,
      archiveOldResolved,
      callLogs,
      startCallLog,
      updateCallLog,
      deleteCallLog,
      cargoShipments,
      importCargoShipments,
      deleteCargoShipment,
      clearCargoShipments,
      leads,
      addLeads,
      updateLead,
      markLeadInfoGiven,
      setLeadOutcome,
      deleteLead,
      deleteLeads,
      markLeadsInfoGiven,
      clearLeads,
      tracks,
      lessons,
      learnerProgress,
      profileChanges,
      saveTrack,
      deleteTrack,
      saveLesson,
      deleteLesson,
      recordVideoWatched,
      recordQuizResult,
      setLearnerRevoked,
      myProgress,
      exportBackup,
      importBackup,
      runTestScenario,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
