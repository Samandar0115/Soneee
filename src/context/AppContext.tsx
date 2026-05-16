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
import type { Category, Stage, Ticket, TicketHistoryEntry, TicketStatus, User } from '../types';
import { db, FIREBASE_ENABLED } from '../firebase';
import { seedCategories, seedStages, seedUsers } from '../api/seed';
import { handleFirestoreError } from '../utils/errors';
import { generateTrackingNumber, randomId } from '../utils/format';

interface AppState {
  ready: boolean;
  backend: 'firebase' | 'local';
  currentUser: User | null;
  users: User[];
  stages: Stage[];
  tickets: Ticket[];
  categories: Category[];
  login: (username: string, password: string) => User | null;
  logout: () => void;
  createTicket: (data: Omit<Ticket, 'id' | 'trackingNumber' | 'history' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<Ticket>;
  updateTicket: (id: string, patch: Partial<Ticket>, note?: string) => Promise<void>;
  moveTicket: (id: string, stageId: string) => Promise<void>;
  resolveTicket: (id: string, resolution: string) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  saveUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  saveStage: (stage: Stage) => Promise<void>;
  deleteStage: (id: string) => Promise<void>;
  saveCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  runTestScenario: () => Promise<Ticket | null>;
}

const AppContext = createContext<AppState | null>(null);

const STORAGE_KEYS = {
  users: 'soneee.users',
  stages: 'soneee.stages',
  tickets: 'soneee.tickets',
  categories: 'soneee.categories',
  session: 'soneee.session',
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
    return () => {
      unsubUsers();
      unsubStages();
      unsubTickets();
      unsubCategories();
    };
  }, [backend]);

  /* ---------------- Local mode initial load ---------------- */
  useEffect(() => {
    if (backend !== 'local') return;
    setUsers(loadLocal<User[]>(STORAGE_KEYS.users, seedUsers));
    setStages(loadLocal<Stage[]>(STORAGE_KEYS.stages, seedStages));
    setTickets(loadLocal<Ticket[]>(STORAGE_KEYS.tickets, []));
    setCategories(loadLocal<Category[]>(STORAGE_KEYS.categories, seedCategories));
    if (!localStorage.getItem(STORAGE_KEYS.users)) saveLocal(STORAGE_KEYS.users, seedUsers);
    if (!localStorage.getItem(STORAGE_KEYS.stages)) saveLocal(STORAGE_KEYS.stages, seedStages);
    if (!localStorage.getItem(STORAGE_KEYS.categories)) saveLocal(STORAGE_KEYS.categories, seedCategories);
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

  /* ---------------- Session restore ---------------- */
  useEffect(() => {
    if (!ready) return;
    const sessionId = localStorage.getItem(STORAGE_KEYS.session);
    if (sessionId) {
      const u = users.find((x) => x.id === sessionId);
      if (u) setCurrentUser(u);
    }
  }, [ready, users]);

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
      const ticket: Ticket = {
        id,
        trackingNumber: generateTrackingNumber(),
        status: 'pending' as TicketStatus,
        stageId: data.stageId || firstStage,
        categoryId: data.categoryId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        channel: data.channel,
        priority: data.priority ?? 'normal',
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
        assigneeId: data.assigneeId,
        details: data.details ?? {},
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
    [stages, currentUser, writeDoc]
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
      login,
      logout,
      createTicket,
      updateTicket,
      moveTicket,
      resolveTicket,
      deleteTicket,
      saveUser,
      deleteUser,
      saveStage,
      deleteStage,
      saveCategory,
      deleteCategory,
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
      login,
      logout,
      createTicket,
      updateTicket,
      moveTicket,
      resolveTicket,
      deleteTicket,
      saveUser,
      deleteUser,
      saveStage,
      deleteStage,
      saveCategory,
      deleteCategory,
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
