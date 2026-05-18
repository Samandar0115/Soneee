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
  AppSettings,
  Attachment,
  Branch,
  Category,
  CustomerRating,
  Lang,
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
} from '../api/seed';
import { handleFirestoreError } from '../utils/errors';
import { generateTrackingNumber, randomId } from '../utils/format';
import { loadFromKV } from '../utils/vercelKV';

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
    if (backend === 'local' && ready) saveLocal(STORAGE_KEYS.users, users);
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

  /* ---------------- Session restore ---------------- */
  useEffect(() => {
    if (!ready) return;
    const sessionId = localStorage.getItem(STORAGE_KEYS.session);
    if (sessionId) {
      const u = users.find((x) => x.id === sessionId);
      if (u) setCurrentUser(u);
    }
  }, [ready, users]);

  /* ---------------- Vercel KV auto-load (faqat local rejimda, faqat birinchi marta) ---------------- */
  const kvLoadedRef = useRef(false);
  useEffect(() => {
    if (backend !== 'local' || !ready || kvLoadedRef.current) return;
    kvLoadedRef.current = true;
    (async () => {
      try {
        const remote = await loadFromKV();
        if (!remote || !remote.data) return;
        const data = remote.data;
        // Mahalliy ma'lumot bo'sh bo'lsa Vercel'dan tiklab olamiz (yangi qurilma uchun)
        const noLocal =
          tickets.length === 0 &&
          (users.length === 0 || users.every((u) => u.id.startsWith('admin-') || u.id.startsWith('op-')));
        if (noLocal) {
          if (Array.isArray(data.users)) setUsers(data.users);
          if (Array.isArray(data.stages)) setStages(data.stages);
          if (Array.isArray(data.tickets)) setTickets(data.tickets);
          if (Array.isArray(data.categories)) setCategories(data.categories);
          if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
          if (Array.isArray(data.branches)) setBranches(data.branches);
          if (data.tariff) setTariff(data.tariff);
          if (data.settings) setSettings(data.settings);
          if (Array.isArray(data.templates)) setTemplates(data.templates);
        }
      } catch {
        // jim
      }
    })();
  }, [backend, ready, tickets.length, users]);

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
        attachments: [],
        internalNotes: [],
        publicComments: [],
        slaDueAt,
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
      setTickets((prev) => [ticket, ...prev]);
      await writeDoc('tickets', id, ticket);
      return ticket;
    },
    [stages, users, tickets, settings, currentUser, writeDoc]
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
      let updated: Ticket | null = null;
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          let next = { ...t, ...patch, updatedAt: Date.now() } as Ticket;
          if (note) {
            next = appendHistory(next, {
              actorId: currentUser?.id ?? 'system',
              actorName: currentUser?.fullName ?? currentUser?.username,
              action: note,
            });
          }
          updated = next;
          return next;
        })
      );
      if (updated) await writeDoc('tickets', id, updated);
    },
    [currentUser, writeDoc]
  );

  const moveTicket = useCallback<AppState['moveTicket']>(
    async (id, stageId) => {
      let updated: Ticket | null = null;
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const stage = stages.find((s) => s.id === stageId);
          const next = appendHistory(
            { ...t, stageId, updatedAt: Date.now() },
            {
              actorId: currentUser?.id ?? 'system',
              actorName: currentUser?.fullName ?? currentUser?.username,
              action: `Bosqich → ${stage?.name ?? stageId}`,
              stageId,
            }
          );
          updated = next;
          return next;
        })
      );
      if (updated) await writeDoc('tickets', id, updated);
    },
    [currentUser, stages, writeDoc]
  );

  const resolveTicket = useCallback<AppState['resolveTicket']>(
    async (id, resolution) => {
      let updated: Ticket | null = null;
      const resolvedStage = stages.find((s) => /hal|resolved/i.test(s.name)) ?? stages[stages.length - 1];
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const next = appendHistory(
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
          updated = next;
          return next;
        })
      );
      if (updated) await writeDoc('tickets', id, updated);
    },
    [currentUser, stages, writeDoc]
  );

  const deleteTicket = useCallback<AppState['deleteTicket']>(
    async (id) => {
      setTickets((prev) => prev.filter((t) => t.id !== id));
      await removeDoc('tickets', id);
    },
    [removeDoc]
  );

  const saveUser = useCallback<AppState['saveUser']>(
    async (user) => {
      setUsers((prev) => {
        const exists = prev.some((u) => u.id === user.id);
        return exists ? prev.map((u) => (u.id === user.id ? user : u)) : [...prev, user];
      });
      await writeDoc('users', user.id, user);
    },
    [writeDoc]
  );

  const deleteUser = useCallback<AppState['deleteUser']>(
    async (id) => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      await removeDoc('users', id);
    },
    [removeDoc]
  );

  const saveStage = useCallback<AppState['saveStage']>(
    async (stage) => {
      setStages((prev) => {
        const exists = prev.some((s) => s.id === stage.id);
        const next = exists ? prev.map((s) => (s.id === stage.id ? stage : s)) : [...prev, stage];
        return next.sort((a, b) => a.order - b.order);
      });
      await writeDoc('stages', stage.id, stage);
    },
    [writeDoc]
  );

  const deleteStage = useCallback<AppState['deleteStage']>(
    async (id) => {
      setStages((prev) => prev.filter((s) => s.id !== id));
      await removeDoc('stages', id);
    },
    [removeDoc]
  );

  const saveCategory = useCallback<AppState['saveCategory']>(
    async (category) => {
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === category.id);
        const next = exists
          ? prev.map((c) => (c.id === category.id ? category : c))
          : [...prev, category];
        return next.sort((a, b) => a.order - b.order);
      });
      await writeDoc('categories', category.id, category);
    },
    [writeDoc]
  );

  const deleteCategory = useCallback<AppState['deleteCategory']>(
    async (id) => {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      await removeDoc('categories', id);
    },
    [removeDoc]
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
      setBranches((prev) => {
        const exists = prev.some((x) => x.id === b.id);
        const list = exists ? prev.map((x) => (x.id === b.id ? b : x)) : [...prev, b];
        return list.sort((x, y) => x.order - y.order);
      });
      await writeDoc('branches', b.id, b);
    },
    [writeDoc]
  );

  const deleteBranch = useCallback<AppState['deleteBranch']>(
    async (id) => {
      setBranches((prev) => prev.filter((b) => b.id !== id));
      await removeDoc('branches', id);
    },
    [removeDoc]
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
    },
    [backend]
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

  const exportBackup = useCallback<AppState['exportBackup']>(() => {
    return JSON.stringify(
      {
        version: 1,
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
      },
      null,
      2
    );
  }, [users, stages, tickets, categories, announcements, branches, tariff, settings, templates]);

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
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const findByTracking = useCallback<AppState['findByTracking']>(
    (tracking) => tickets.find((t) => t.trackingNumber.toLowerCase() === tracking.toLowerCase().trim()),
    [tickets]
  );

  const findByPhone = useCallback<AppState['findByPhone']>(
    (phone) => {
      const norm = phone.replace(/\D/g, '');
      if (!norm) return [];
      return tickets
        .filter((t) => t.customerPhone.replace(/\D/g, '').includes(norm))
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    [tickets]
  );

  const addAttachment = useCallback<AppState['addAttachment']>(
    async (ticketId, file) => {
      let updated: Ticket | null = null;
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== ticketId) return t;
          const next: Ticket = {
            ...t,
            attachments: [...(t.attachments ?? []), file],
            updatedAt: Date.now(),
          };
          updated = next;
          return next;
        })
      );
      if (updated) await writeDoc('tickets', ticketId, updated);
    },
    [writeDoc]
  );

  const removeAttachment = useCallback<AppState['removeAttachment']>(
    async (ticketId, attachmentId) => {
      let updated: Ticket | null = null;
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== ticketId) return t;
          const next: Ticket = {
            ...t,
            attachments: (t.attachments ?? []).filter((a) => a.id !== attachmentId),
            updatedAt: Date.now(),
          };
          updated = next;
          return next;
        })
      );
      if (updated) await writeDoc('tickets', ticketId, updated);
    },
    [writeDoc]
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
      let updated: Ticket | null = null;
      setTickets((prev) =>
        prev.map((t) => {
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
          updated = next;
          return next;
        })
      );
      if (updated) await writeDoc('tickets', ticketId, updated);
    },
    [currentUser, writeDoc]
  );

  const rateTicket = useCallback<AppState['rateTicket']>(
    async (ticketId, rating) => {
      let updated: Ticket | null = null;
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== ticketId) return t;
          const next: Ticket = { ...t, rating, updatedAt: Date.now() };
          updated = next;
          return next;
        })
      );
      if (updated) await writeDoc('tickets', ticketId, updated);
    },
    [writeDoc]
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
