export type Role = 'admin' | 'operator';

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  active: boolean;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  fullName?: string;
  phone?: string;
  createdAt: number;
  photo?: string;
  faceDescriptor?: number[];
}

export type StageFieldType = 'text' | 'textarea' | 'number' | 'phone' | 'select';

export interface StageField {
  key: string;
  label: string;
  type: StageFieldType;
  required?: boolean;
  options?: string[];
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  fields: StageField[];
}

export type TicketStatus = 'pending' | 'resolved';

export interface TicketHistoryEntry {
  id: string;
  timestamp: number;
  actorId: string;
  actorName?: string;
  action: string;
  stageId?: string;
  note?: string;
}

export interface Ticket {
  id: string;
  trackingNumber: string;
  status: TicketStatus;
  stageId: string;
  categoryId?: string;
  customerName: string;
  customerPhone: string;
  channel?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  assigneeId?: string;
  details: Record<string, string>;
  history: TicketHistoryEntry[];
  attachments?: Attachment[];
  internalNotes?: TicketNote[];
  publicComments?: TicketNote[];
  rating?: CustomerRating;
  slaDueAt?: number;
  firstResponseAt?: number;
}

export interface AppDataSnapshot {
  users: User[];
  stages: Stage[];
  tickets: Ticket[];
  categories: Category[];
  announcements: Announcement[];
  branches: Branch[];
  tariff: TariffSettings;
}

export type AnnouncementCategory =
  | 'china-uzb'
  | 'uzb-cargo'
  | 'payment'
  | 'general';

export interface Announcement {
  id: string;
  category: AnnouncementCategory;
  title: string;
  content: string;
  pinned: boolean;
  active: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export type Region =
  | 'tashkent-city'
  | 'tashkent-region'
  | 'andijan'
  | 'bukhara'
  | 'fergana'
  | 'jizzakh'
  | 'khorezm'
  | 'namangan'
  | 'navoi'
  | 'kashkadarya'
  | 'karakalpakstan'
  | 'samarkand'
  | 'syrdarya'
  | 'surkhandarya';

export interface Branch {
  id: string;
  name: string;
  region: Region;
  city?: string;
  address: string;
  phone: string;
  workingHours?: string;
  lat?: number;
  lng?: number;
  isNew: boolean;
  order: number;
  active: boolean;
}

export interface TariffSettings {
  id: 'main';
  pricePerM3: number;
  kgPerM3: number;
  currency: string;
  notes: string;
  updatedAt: number;
}

export type Lang = 'uz' | 'ru';

export interface AppSettings {
  id: 'main';
  autoAssign: 'off' | 'round-robin' | 'least-busy';
  slaMinutes: Record<NonNullable<Ticket['priority']>, number>;
  defaultLang: Lang;
  updatedAt: number;
}

export interface ResponseTemplate {
  id: string;
  title: string;
  body: string;
  category?: string;
  order: number;
  active: boolean;
  createdAt: number;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: number;
}

export interface TicketNote {
  id: string;
  text: string;
  authorId: string;
  authorName?: string;
  createdAt: number;
}

export interface CustomerRating {
  score: number;
  feedback?: string;
  ratedAt: number;
}
