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
  'nav.templates': { uz: 'Javob shablonlari', ru: 'Шаблоны ответов' },
  'nav.analytics': { uz: 'Analitika', ru: 'Аналитика' },
  'nav.settings': { uz: 'Sozlamalar', ru: 'Настройки' },
  'nav.admin': { uz: 'Administrator', ru: 'Администратор' },

  // Common
  'common.new': { uz: 'Yangi', ru: 'Новый' },
  'common.save': { uz: 'Saqlash', ru: 'Сохранить' },
  'common.cancel': { uz: 'Bekor qilish', ru: 'Отмена' },
  'common.delete': { uz: "O'chirish", ru: 'Удалить' },
  'common.edit': { uz: 'Tahrirlash', ru: 'Редактировать' },
  'common.search': { uz: 'Qidiruv', ru: 'Поиск' },
  'common.search.placeholder': { uz: 'Qidirish...', ru: 'Поиск...' },
  'common.all': { uz: 'Barchasi', ru: 'Все' },
  'common.loading': { uz: 'Yuklanmoqda...', ru: 'Загрузка...' },
  'common.logout': { uz: 'Chiqish', ru: 'Выход' },
  'common.theme.light': { uz: 'Yorug‘', ru: 'Светлая' },
  'common.theme.dark': { uz: 'Qorong‘i', ru: 'Тёмная' },
  'common.lang': { uz: 'Til', ru: 'Язык' },
  'common.required': { uz: 'majburiy', ru: 'обязательно' },
  'common.export': { uz: 'CSV eksport', ru: 'Экспорт CSV' },
  'common.notfound': { uz: 'Topilmadi', ru: 'Не найдено' },
  'common.yes': { uz: 'Ha', ru: 'Да' },
  'common.no': { uz: "Yo'q", ru: 'Нет' },
  'common.copy': { uz: 'Nusxalash', ru: 'Копировать' },
  'common.copied': { uz: 'Nusxalandi', ru: 'Скопировано' },

  // Login
  'login.title': { uz: 'iPOST CRM', ru: 'iPOST CRM' },
  'login.subtitle': { uz: 'Call Center Virtual Control Room', ru: 'Call Center Виртуальная Диспетчерская' },
  'login.username': { uz: 'Foydalanuvchi nomi', ru: 'Имя пользователя' },
  'login.password': { uz: 'Parol', ru: 'Пароль' },
  'login.submit': { uz: 'Kirish', ru: 'Войти' },
  'login.checking': { uz: 'Tekshirilmoqda…', ru: 'Проверка…' },
  'login.demo': { uz: 'Demo hisoblar', ru: 'Демо-аккаунты' },
  'login.wrong': { uz: "Login yoki parol noto'g'ri", ru: 'Неверный логин или пароль' },
  'login.faceid': { uz: 'Face ID', ru: 'Face ID' },
  'login.welcome': { uz: 'Xush kelibsiz', ru: 'Добро пожаловать' },
  'login.adminInfo': { uz: "Login ma'lumotlarini administratordan oling", ru: 'Получите данные для входа у администратора' },

  // Dashboard
  'dash.hello': { uz: 'Salom', ru: 'Привет' },
  'dash.total': { uz: 'Jami', ru: 'Всего' },
  'dash.pending': { uz: 'Kutilmoqda', ru: 'В ожидании' },
  'dash.resolved': { uz: 'Hal etildi', ru: 'Решено' },
  'dash.today': { uz: 'Bugun', ru: 'Сегодня' },
  'dash.overdue': { uz: 'Kechikkan', ru: 'Просрочено' },
  'dash.stale': { uz: 'Eskirgan', ru: 'Устарело' },
  'dash.urgent_panel': { uz: 'Shoshilinch murojaatlar', ru: 'Срочные обращения' },
  'dash.operator_load': { uz: 'Operator yuklamasi', ru: 'Загрузка операторов' },
  'dash.recent_activity': { uz: "So'nggi harakatlar", ru: 'Последние действия' },
  'dash.stage_distribution': { uz: "Bosqichlar bo'yicha taqsimot", ru: 'Распределение по этапам' },
  'dash.alert_overdue': { uz: 'ta SLA kechikkan murojaat', ru: 'просроченных обращений' },
  'dash.alert_stale': { uz: 'kundan beri yangilanmagan', ru: 'дней без обновления' },
  'dash.view': { uz: "Ko'rish", ru: 'Просмотр' },

  // Tickets
  'tickets.title': { uz: 'Murojaatlar', ru: 'Обращения' },
  'tickets.results': { uz: 'ta natija (jami', ru: 'результатов (всего' },
  'tickets.search': { uz: "Trek, ism, telefon, izoh yoki tafsilot bo'yicha qidirish...", ru: 'Поиск по треку, имени, телефону, заметке...' },
  'tickets.quick.mine': { uz: 'Mening', ru: 'Мои' },
  'tickets.quick.unassigned': { uz: 'Biriktirilmagan', ru: 'Не назначено' },
  'tickets.col.tracking': { uz: 'Trek №', ru: 'Трек №' },
  'tickets.col.customer': { uz: 'Mijoz', ru: 'Клиент' },
  'tickets.col.phone': { uz: 'Telefon', ru: 'Телефон' },
  'tickets.col.category': { uz: 'Murojaat turi', ru: 'Тип обращения' },
  'tickets.col.stage': { uz: 'Bosqich', ru: 'Этап' },
  'tickets.col.status': { uz: 'Status', ru: 'Статус' },
  'tickets.col.priority': { uz: 'Muhim', ru: 'Приоритет' },
  'tickets.col.operator': { uz: 'Operator', ru: 'Оператор' },
  'tickets.col.updated': { uz: 'Yangilangan', ru: 'Обновлено' },
  'tickets.range.today': { uz: 'Bugun', ru: 'Сегодня' },
  'tickets.range.week': { uz: '7 kun', ru: '7 дней' },
  'tickets.range.month': { uz: '30 kun', ru: '30 дней' },
  'tickets.range.all': { uz: 'Hammasi', ru: 'Все' },
  'tickets.notfound': { uz: 'Murojaatlar topilmadi', ru: 'Обращения не найдены' },
  'tickets.bulk.selected': { uz: 'ta tanlangan', ru: 'выбрано' },
  'tickets.bulk.assign': { uz: '→ Operatorga biriktirish', ru: '→ Назначить оператору' },
  'tickets.bulk.stage': { uz: "→ Bosqichga ko'chirish", ru: '→ Переместить на этап' },
  'tickets.bulk.cancel': { uz: 'Tanlovni bekor qilish', ru: 'Отменить выбор' },
  'tickets.per_page': { uz: '/ sahifa', ru: '/ страница' },

  // Ticket
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
  'ticket.notes.public': { uz: "Ommaviy izohlar (mijoz ko'radi)", ru: 'Публичные комментарии (видит клиент)' },
  'ticket.duplicate': { uz: 'Bu trek raqami bilan murojaat allaqachon mavjud', ru: 'Обращение с этим трек номером уже существует' },
  'ticket.sla.overdue': { uz: 'oldin kechikkan', ru: 'назад просрочено' },
  'ticket.sla.remaining': { uz: 'SLA muddatigacha', ru: 'До срока SLA' },
  'ticket.customer.history': { uz: 'Bu mijozning oldingi murojaatlari', ru: 'Прошлые обращения клиента' },
  'ticket.template_pick': { uz: 'Shablon...', ru: 'Шаблон...' },

  // Priority
  'priority.low': { uz: 'Past', ru: 'Низкий' },
  'priority.normal': { uz: 'Oddiy', ru: 'Обычный' },
  'priority.high': { uz: 'Yuqori', ru: 'Высокий' },
  'priority.urgent': { uz: 'Shoshilinch', ru: 'Срочный' },

  // Knowledge
  'kb.title': { uz: 'Bilim bazasi', ru: 'База знаний' },
  'kb.announcements': { uz: "E'lonlar", ru: 'Объявления' },
  'kb.branches': { uz: 'Filiallar', ru: 'Филиалы' },
  'kb.tariff': { uz: 'Tariflar', ru: 'Тарифы' },
  'kb.calc': { uz: 'Yuk kalkulyatori', ru: 'Калькулятор груза' },

  // Settings
  'settings.title': { uz: 'Tizim sozlamalari', ru: 'Настройки системы' },
  'settings.autoassign': { uz: 'Avtomatik biriktirish', ru: 'Автоназначение' },
  'settings.sla': { uz: 'SLA (daqiqalarda)', ru: 'SLA (в минутах)' },
  'settings.lang': { uz: 'Standart til', ru: 'Язык по умолчанию' },
  'settings.portal': { uz: 'Mijoz portali', ru: 'Клиентский портал' },
  'settings.backup': { uz: 'Backup va tiklash', ru: 'Резервная копия' },

  // Search
  'search.global': { uz: 'Global qidiruv', ru: 'Глобальный поиск' },
  'search.placeholder': { uz: 'Trek, ism, telefon...', ru: 'Трек, имя, телефон...' },
  'search.no_results': { uz: 'Hech narsa topilmadi', ru: 'Ничего не найдено' },
  'search.only_mine': { uz: 'Faqat sizning', ru: 'Только ваши' },
  'search.everything': { uz: 'Hammasi', ru: 'Все' },

  // Tracking page
  'track.title': { uz: 'Murojaat holatini tekshirish', ru: 'Проверка статуса обращения' },
  'track.lookup': { uz: 'Tekshirish', ru: 'Проверить' },
  'track.notfound': { uz: 'Murojaat topilmadi', ru: 'Обращение не найдено' },
  'track.rate': { uz: 'Xizmatimizni baholang', ru: 'Оцените наш сервис' },
  'track.thanks': { uz: 'Bahoyingiz uchun rahmat!', ru: 'Спасибо за вашу оценку!' },
};

export function t(key: string, lang: Lang): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] ?? entry.uz;
}

export function tFn(lang: Lang) {
  return (key: string) => t(key, lang);
}
