import type { Lang } from './types';

type Dict = Record<string, { uz: string; ru: string }>;

const dict: Dict = {
  // Nav
  'nav.dashboard': { uz: 'Boshqaruv paneli', ru: 'Главная панель' },
  'nav.pipeline': { uz: 'Pipeline (Kanban)', ru: 'Pipeline (Канбан)' },
  'nav.tickets': { uz: 'Murojaatlar', ru: 'Обращения' },
  'nav.knowledge': { uz: 'Bilim bazasi', ru: 'База знаний' },
  'nav.users': { uz: 'Xodimlar', ru: 'Сотрудники' },
  'nav.stages': { uz: 'Bosqichlar', ru: 'Этапы' },
  'nav.categories': { uz: 'Murojaat turlari', ru: 'Типы обращений' },
  'nav.settings': { uz: 'Sozlamalar', ru: 'Настройки' },
  'nav.admin': { uz: 'Administrator', ru: 'Администратор' },

  // Common
  'common.new': { uz: 'Yangi', ru: 'Новый' },
  'common.save': { uz: 'Saqlash', ru: 'Сохранить' },
  'common.cancel': { uz: 'Bekor qilish', ru: 'Отмена' },
  'common.delete': { uz: "O'chirish", ru: 'Удалить' },
  'common.edit': { uz: 'Tahrirlash', ru: 'Редактировать' },
  'common.search': { uz: 'Qidirish...', ru: 'Поиск...' },
  'common.all': { uz: 'Barchasi', ru: 'Все' },
  'common.loading': { uz: 'Yuklanmoqda...', ru: 'Загрузка...' },
  'common.logout': { uz: 'Chiqish', ru: 'Выход' },
  'common.theme.light': { uz: 'Yorug‘', ru: 'Светлая' },
  'common.theme.dark': { uz: 'Qorong‘i', ru: 'Тёмная' },
  'common.lang': { uz: 'Til', ru: 'Язык' },
  'common.required': { uz: 'majburiy', ru: 'обязательно' },
  'common.export': { uz: 'Excel/CSV eksport', ru: 'Экспорт CSV' },

  // Login
  'login.title': { uz: 'iPOST CRM', ru: 'iPOST CRM' },
  'login.subtitle': { uz: 'Call Center Virtual Control Room', ru: 'Call Center Виртуальная Диспетчерская' },
  'login.username': { uz: 'Foydalanuvchi nomi', ru: 'Имя пользователя' },
  'login.password': { uz: 'Parol', ru: 'Пароль' },
  'login.submit': { uz: 'Kirish', ru: 'Войти' },
  'login.demo': { uz: 'Demo hisoblar', ru: 'Демо-аккаунты' },
  'login.wrong': { uz: "Login yoki parol noto'g'ri", ru: 'Неверный логин или пароль' },

  // Tickets
  'ticket.new': { uz: 'Yangi murojaat', ru: 'Новое обращение' },
  'ticket.tracking': { uz: 'Trek raqami', ru: 'Трек номер' },
  'ticket.customer': { uz: 'Mijoz', ru: 'Клиент' },
  'ticket.phone': { uz: 'Telefon', ru: 'Телефон' },
  'ticket.stage': { uz: 'Bosqich', ru: 'Этап' },
  'ticket.status': { uz: 'Status', ru: 'Статус' },
  'ticket.category': { uz: 'Murojaat turi', ru: 'Тип обращения' },
  'ticket.priority': { uz: 'Muhimlik', ru: 'Приоритет' },
  'ticket.channel': { uz: 'Aloqa kanali', ru: 'Канал связи' },
  'ticket.assignee': { uz: "Mas'ul operator", ru: 'Ответственный оператор' },
  'ticket.pending': { uz: 'Kutilmoqda', ru: 'В ожидании' },
  'ticket.resolved': { uz: 'Hal etildi', ru: 'Решено' },
  'ticket.history': { uz: 'Tarix', ru: 'История' },
  'ticket.resolve': { uz: 'Hal etildi deb belgilash', ru: 'Отметить как решённое' },
  'ticket.attachments': { uz: 'Biriktirilgan fayllar', ru: 'Прикреплённые файлы' },
  'ticket.attach': { uz: 'Fayl biriktirish', ru: 'Прикрепить файл' },
  'ticket.notes.internal': { uz: 'Ichki izohlar (faqat operatorlar)', ru: 'Внутренние заметки (только операторы)' },
  'ticket.notes.public': { uz: 'Ommaviy izohlar (mijoz ko‘radi)', ru: 'Публичные комментарии (видит клиент)' },
  'ticket.notes.add': { uz: 'Izoh qo‘shish', ru: 'Добавить заметку' },
  'ticket.duplicate': { uz: 'Bu trek raqami bilan murojaat allaqachon mavjud', ru: 'Обращение с этим трек номером уже существует' },
  'ticket.sla': { uz: 'SLA muddati', ru: 'Срок SLA' },
  'ticket.sla.overdue': { uz: 'Kechikkan', ru: 'Просрочено' },
  'ticket.customer.history': { uz: 'Mijozning oldingi murojaatlari', ru: 'Прошлые обращения клиента' },

  // Priority
  'priority.low': { uz: 'Past', ru: 'Низкий' },
  'priority.normal': { uz: 'Oddiy', ru: 'Обычный' },
  'priority.high': { uz: 'Yuqori', ru: 'Высокий' },
  'priority.urgent': { uz: 'Shoshilinch', ru: 'Срочный' },

  // Search
  'search.global': { uz: 'Global qidiruv (Ctrl+K)', ru: 'Глобальный поиск (Ctrl+K)' },
  'search.placeholder': { uz: 'Trek, ism, telefon...', ru: 'Трек, имя, телефон...' },
  'search.no_results': { uz: 'Hech narsa topilmadi', ru: 'Ничего не найдено' },

  // Tracking page
  'track.title': { uz: 'Murojaat holatini tekshirish', ru: 'Проверка статуса обращения' },
  'track.subtitle': { uz: 'Trek raqami va telefon orqali murojaat holatini bilib oling', ru: 'Узнайте статус обращения по трек-номеру и телефону' },
  'track.lookup': { uz: 'Tekshirish', ru: 'Проверить' },
  'track.notfound': { uz: 'Murojaat topilmadi', ru: 'Обращение не найдено' },
  'track.rate': { uz: 'Xizmatimizni baholang', ru: 'Оцените наш сервис' },
  'track.thanks': { uz: 'Bahoyingiz uchun rahmat!', ru: 'Спасибо за вашу оценку!' },

  // Settings
  'settings.title': { uz: 'Tizim sozlamalari', ru: 'Настройки системы' },
  'settings.autoassign': { uz: 'Avtomatik biriktirish', ru: 'Автоназначение' },
  'settings.autoassign.off': { uz: 'O‘chirilgan', ru: 'Отключено' },
  'settings.autoassign.rr': { uz: 'Aylanma navbat (round-robin)', ru: 'По очереди (round-robin)' },
  'settings.autoassign.lb': { uz: 'Eng kam bandlik', ru: 'Наименее загруженный' },
  'settings.sla': { uz: 'SLA (daqiqalarda)', ru: 'SLA (в минутах)' },
};

export function t(key: string, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] ?? entry.uz;
}

export function tFn(lang: Lang) {
  return (key: string) => t(key, lang);
}
