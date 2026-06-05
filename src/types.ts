// Rol — tizim rollari ('admin'|'operator'|'learner') yoki admin yaratgan maxsus rol id si
export type Role = string;

// Bo'lim kalitlari — rolga qaysi sahifalar ochilishini belgilash uchun
export type PageKey =
  | 'dashboard' | 'leads' | 'pipeline' | 'tickets' | 'calls' | 'cargo'
  | 'warehouse' | 'knowledge' | 'learn' | 'analytics' | 'users' | 'stages'
  | 'categories' | 'templates' | 'curriculum' | 'roles' | 'settings';

// Rol ta'rifi — admin nimalar qila olishini belgilaydi
export interface RoleDef {
  id: string;
  name: string;
  manage: boolean;      // admin darajasi: xodimlar, rollar, sozlamalar, bosqichlar va h.k.
  canEdit: boolean;     // mavjud yozuvlarni tahrirlash
  canDelete: boolean;   // yozuvlarni o'chirish
  pages: PageKey[];     // kirish mumkin bo'lgan bo'limlar
  isSystem: boolean;    // tizim roli — o'chirib bo'lmaydi
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  active: boolean;
  fields?: StageField[];   // shu toifa tanlanganda murojaatda chiqadigan maydonlar
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
  faceDescriptor?: number[];        // asosiy namuna (orqaga moslik uchun)
  faceDescriptors?: number[][];     // ko'p namuna (turli sharoit: yorug'/qorong'i, soqolli/soqolsiz)
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
  acceptedAt?: number;        // mas'ul "qabul qildim" bosgan vaqt
  acceptedBy?: string;        // qaysi xodim qabul qildi
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
  roles?: RoleDef[];
  trash?: TrashItem[];
  tripRoutes?: TripRoute[];
  trekRequests?: TrekRequest[];
  complaints?: Complaint[];
}

// Shikoyat — xodimlar profilidan yuboriladi
export type ComplaintDirection = 'IT' | 'Logistika' | 'Xitoy ombor' | 'UZB ombor' | 'Moliya' | 'Sifat nazorati' | 'Boshqa';
export type ComplaintStatus = 'pending' | 'done' | 'cancelled';

// Default ichki turlar — sozlamalardan topilmasa shu ishlatiladi
export const DEFAULT_COMPLAINT_SUBTYPES: Record<ComplaintDirection, string[]> = {
  'IT': ["To'lov", 'Status', 'Manzil'],
  'Logistika': ['Hududiy ombor', 'Filial', 'Xitoyda kelish', 'Shuttle'],
  'UZB ombor': ["Vozvrat bo'lgan", "To'lovi qilingan"],
  'Xitoy ombor': ['Chiqarilmagan', 'Summasi xato hisoblangan', 'Trekni karobkali jonatish kerak'],
  'Moliya': ['Qoplab berish', 'Qayta tashlab berish', "Summasini o'zgartirib berish"],
  'Sifat nazorati': ['Mijoz muammosi qaror talab qiladi'],
  'Boshqa': [],
};
export interface Complaint {
  id: string;
  direction: ComplaintDirection;
  subtype?: string;            // ichki tur (admin sozlamalardan boshqaradi)
  trek?: string;
  note: string;
  status: ComplaintStatus;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  doneAt?: number;
  doneBy?: string;
  doneByName?: string;
}

// Trek uzish / boshqa Mijoz ID ga birkitirish so'rovi
export type TrekRequestType = 'detach' | 'attach';
export type TrekRequestStatus = 'pending' | 'done' | 'cancelled';
export interface TrekRequest {
  id: string;
  type: TrekRequestType;
  treks: string[];              // trek raqamlari ro'yxati
  wrongCustomerId?: string;     // (attach uchun) noto'g'ri ulangan Mijoz ID
  correctCustomerId?: string;   // (attach uchun) to'g'ri ulanishi kerak ID
  notes?: string;
  status: TrekRequestStatus;
  assignedAdminId?: string;     // mas'ul admin (kim hal qilishi kerak)
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  doneAt?: number;
  doneBy?: string;
  doneByName?: string;
}

// Reys (yo'nalish) — qaysi yo'nalishdan yuk necha kunda keladi va oxirgisi qachon keldi
export interface TripRoute {
  id: string;
  name: string;              // "Guanchjou → Toshkent (aviadan)"
  durationDays: number;      // o'rtacha necha kunda keladi
  lastArrivedDate?: string;  // YYYY-MM-DD — oxirgi partiya kelgan sana
  notes?: string;
  order: number;
  active: boolean;
  createdAt: number;
}

// O'chirilgan yozuvlar — hech narsa butunlay yo'qolmaydi. Admin tiklaydi yoki
// Excel/CSV qilib yuklab, keyin bazadan butunlay o'chiradi.
export type TrashType =
  | 'ticket'
  | 'lead'
  | 'cargo'
  | 'callLog'
  | 'user'
  | 'category'
  | 'stage'
  | 'announcement'
  | 'branch'
  | 'template'
  | 'tripRoute'
  | 'complaint'
  | 'trekRequest';
export interface TrashItem {
  id: string;
  type: TrashType;
  label: string;          // ko'rsatish uchun (trek / ism / raqam)
  data: unknown;          // asl obyekt — tiklash uchun
  deletedAt: number;
  deletedBy?: string;
  deletedByName?: string;
}

// Xodim o'z profilini (rasm/parol) o'zgartirganda admin ko'rishi uchun jurnal
export interface ProfileChange {
  id: string;
  userId: string;
  userName?: string;
  field: 'photo' | 'password' | 'name' | 'phone' | 'username';
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
  telegram?: TelegramConfig;
  orderers?: Orderer[];   // zayavka beruvchi shaxslar ro'yxati (Buvajonov, ...)
  complaintSubtypes?: Partial<Record<ComplaintDirection, string[]>>; // har yo'nalish uchun ichki turlar
  chineseAddress?: ChineseAddressTemplate; // /check sahifasi uchun "to'g'ri" Xitoy manzil shabloni
  updatedAt: number;
}

// Xitoy ombor manzili — mijoz screen shot bilan tekshirishi uchun standart
// Maydonlar ichida {ID} placeholder bo'lishi mumkin — mijoz o'z ID sini kiritganda
// avtomatik almashtiriladi. Masalan: "号门 077库房/{ID}号"
export interface ChineseAddressTemplate {
  recipientName: string;       // 收件人 — qabul qiluvchi (mas: "号门 077库房/{ID}号")
  phone: string;               // 手机号 — telefon
  province: string;            // 省
  city: string;                // 市
  district: string;            // 区
  detailedAddress: string;     // 详细地址 — to'liq manzil (mas: "苏溪苏福路255号主楼5号门 077库房/{ID}号")
  postalCode: string;          // 邮编 — pochta indeksi
  customerIdHint: string;      // "kichik izoh — mijoz ID qayerga yozilishi kerak"
  notes?: string;              // qo'shimcha ko'rsatma
}
export const ADDRESS_ID_PLACEHOLDER = '{ID}';

// Telegram bot sozlamalari — kunlik hisobotlar va misroute eksport uchun
export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  defaultChatId: string;   // standart kanal/guruh/chat id
  emuChatId?: string;       // EMU yo'nalishi uchun alohida
  btsChatId?: string;       // BTS yo'nalishi uchun alohida
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

export type ResponsibleCompany = 'EMU' | 'BTS' | 'OTHER';

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
  orderedByPhone?: string;        // tanlangan zayavka beruvchining telefoni
  responsibleCompany?: ResponsibleCompany;  // EMU / BTS / Boshqa — qaysi shablon
  trekList?: string;              // bir nechta trek bo'lsa — chiziqlangan ro'yxat
  customerIdList?: string;        // bir nechta ID bo'lsa
  destinationPhone?: string;      // BTS / IPOST filial tel raqami
  destinationCode?: string;       // BTS kod yoki shunga o'xshash
  notes?: string;
}

// Zayavka beruvchi — sozlamadan tanlanadi, telefoni avto to'ldiriladi
export interface Orderer {
  id: string;
  name: string;     // "Buvajonov Hamidjon"
  phone: string;    // "+998990280848"
}

