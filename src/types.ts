export type Role = 'admin' | 'operator' | 'learner';

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
  sipExtension?: string;   // operatorning shaxsiy SIP raqami (ixtiyoriy)
  sipPassword?: string;    // shaxsiy SIP paroli (ixtiyoriy)
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
  misroute?: MisrouteDetails;
  warehouseTracks?: WarehouseTrack[];
}

// Sklad navbatiga qo'shish sababi
export type WarehouseReason =
  | 'paid'        // To'lovi endi qilindi — chiqarish kerak
  | 'returned'    // Vozvrat bo'lgan — chiqarish kerak
  | 'held'        // Skladda qaysidur sababga ko'ra ushlab qolingan — chiqarish kerak
  | 'other';

export interface WarehouseTrack {
  id: string;
  trackingNumber: string;
  reason: WarehouseReason;    // skladga jo'natish sababi
  reasonNote?: string;        // sababni qo'shimcha izoh (masalan: nima uchun ushlab qolingan)
  amount?: number;            // to'lov summasi (so'm)
  paid: boolean;
  paidAt?: number;
  paidBy?: string;
  paidByName?: string;
  releasedAt?: number;        // ombor mahsulotni chiqarib bergan vaqt
  releasedBy?: string;
  releasedByName?: string;
  notes?: string;
  addedAt: number;
  addedBy: string;
}

export interface AppDataSnapshot {
  users: User[];
  stages: Stage[];
  tickets: Ticket[];
  categories: Category[];
  announcements: Announcement[];
  branches: Branch[];
  tariff: TariffSettings;
  callLogs?: CallLog[];
  cargoShipments?: CargoShipment[];
  leads?: Lead[];
  tracks?: Track[];
  lessons?: Lesson[];
  learnerProgress?: LearnerProgress[];
  profileChanges?: ProfileChange[];
}

// Xodim o'z profilini (rasm/parol) o'zgartirganda admin ko'rishi uchun jurnal
export interface ProfileChange {
  id: string;
  userId: string;
  userName?: string;
  field: 'photo' | 'password' | 'name' | 'phone';
  changedAt: number;
}

/* ===================== LMS — O'quv markazi ===================== */

export type QuizQuestionType = 'single' | 'situational';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
}

// Yo'nalish — darslar guruhi (masalan: "Call Center Operator", "Sklad")
export interface Track {
  id: string;
  name: string;
  description?: string;
  color?: string;
  order: number;
  active: boolean;
  createdAt: number;
}

// O'qitish case'i — vaziyat va to'g'ri/noto'g'ri yondashuv
export interface LessonCase {
  id: string;
  situation: string;       // vaziyat tavsifi
  goodResponse: string;    // to'g'ri yondashuv
  badResponse?: string;    // noto'g'ri yondashuv (taqqoslash uchun)
  note?: string;
}

// Bitta dars/modul — yo'nalish ichida ketma-ket ochiladi
export interface Lesson {
  id: string;
  trackId: string;        // qaysi yo'nalishga tegishli
  day: number;            // ko'rsatiladigan tartib raqami
  order: number;          // yo'nalish ichidagi tartib (qulflash uchun)
  title: string;
  summary?: string;       // qisqa tavsif
  content?: string;       // skript / bilim bazasi matni (ko'p qatorli)
  videoUrl?: string;      // mp4 to'g'ridan-to'g'ri yoki YouTube/embed havola
  videoUploaded?: boolean; // shu qurilmada yuklangan video bormi (IndexedDB)
  videoFileName?: string;
  videoDurationSec?: number;
  tips: string[];         // tip & trick ro'yxati
  cases: LessonCase[];    // o'qitish case'lari
  quiz: QuizQuestion[];
  passScorePct: number;   // o'tish foizi (default 100)
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LessonProgress {
  lessonId: string;
  videoWatched: boolean;
  quizPassed: boolean;
  bestScorePct: number;
  attempts: number;
  timeSpentSec: number;
  completedAt?: number;
}

// Har bir o'quvchi (operator) uchun bitta progress yozuvi. id == userId
export interface LearnerProgress {
  id: string;
  userId: string;
  userName?: string;
  lessons: Record<string, LessonProgress>;
  revoked: boolean;       // Admin "kirishni bekor qilish" tugmasi (kill switch)
  startedAt: number;
  updatedAt: number;
}

export type LeadSource = 'instagram' | 'telegram' | 'phone' | 'missed';
// new — yangi; info_given — info berildi; callback — kechroq bog'lanish kerak;
// unreachable — bog'lana olmadi/gaplasha olmadi; converted — murojaat ochildi
export type LeadStatus = 'new' | 'info_given' | 'callback' | 'unreachable' | 'converted';

export interface Lead {
  id: string;
  phone: string;
  customerName?: string;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  calledAt?: number;
  calledBy?: string;
  calledByName?: string;
  ticketId?: string;
  ticketTracking?: string;
}

export type CargoStatus = 'pending' | 'delivered' | 'returned' | 'in_transit';
export type CargoType = 'BTS' | 'EMU' | 'CHINA-POST' | 'YANTONG' | 'OTHER';

export interface CargoShipment {
  id: string;
  trackingNumber: string;
  type: CargoType;
  branchId?: string;          // qaysi filialga yetib bordi
  branchName?: string;
  arrivedAt?: number;          // filialga yetib borgan sana
  deliveredAt?: number;        // mijozga topshirilgan sana
  returnedAt?: number;         // BTS/EMU vozvrat sanasi
  status: CargoStatus;
  customerName?: string;
  customerPhone?: string;
  weightKg?: number;
  notes?: string;
  importedAt: number;          // tizimga qachon yuklandi
  importedBy: string;
}

export type CallOutcome = 'answered' | 'no_answer' | 'busy' | 'failed' | 'pending';
export type CallDirection = 'outbound' | 'inbound';

export interface CallLog {
  id: string;
  operatorId: string;
  operatorName?: string;
  number: string;
  customerName?: string;
  ticketId?: string;
  trackingNumber?: string;
  direction: CallDirection;
  startedAt: number;
  connectedAt?: number;   // "Bog'landi" bosilgan payt
  endedAt?: number;
  durationSec?: number;   // jami davomiylik (start → end)
  talkSec?: number;       // gaplashish davomiyligi (connected → end)
  outcome: CallOutcome;
  notes?: string;
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
  idleTimeoutMin: number;
  archiveAfterDays: number;
  faceMatchThreshold: number;
  sip?: SipConfig;
  updatedAt: number;
}

// O'rnatilgan SIP telefon liniyasi sozlamalari (WebRTC orqali, dastur ichida)
export interface SipConfig {
  enabled: boolean;
  wsUrl: string;        // wss://pbx.example.com:7443 (SIP-over-WebSocket)
  domain: string;       // pbx.example.com (SIP domen/realm)
  username: string;     // umumiy/standart SIP foydalanuvchi (raqam)
  password: string;     // umumiy/standart SIP parol
  displayName?: string;
  stunUrl?: string;     // masalan stun:stun.l.google.com:19302
  turnUrl?: string;     // masalan turn:turn.example.com:3478
  turnUsername?: string;
  turnPassword?: string;
}

export type NotificationType = 'callback' | 'mention' | 'assigned' | 'sla' | 'system';

export interface AppNotification {
  id: string;
  toUserId: string;
  fromUserId?: string;
  fromUserName?: string;
  ticketId?: string;
  trackingNumber?: string;
  type: NotificationType;
  title: string;
  body?: string;
  createdAt: number;
  readAt?: number;
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

export type TrackingType =
  | 'BTS'
  | 'EMU'
  | 'DOSTAVKA'
  | 'IPOST-FILIAL'
  | 'MIJOZ-UYIDAN'
  | 'MIJOZ-UYIGA'
  | 'OTHER';

export interface MisrouteDetails {
  wrongCustomerName?: string;
  wrongCustomerPhone?: string;
  wrongAddress?: string;
  wrongDeliveryType?: string;
  correctCustomerName?: string;
  correctCustomerPhone?: string;
  correctAddress?: string;
  trackingType?: TrackingType;
  postalId?: string;
  orderedBy?: string;
  notes?: string;
}

