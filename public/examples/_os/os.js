// Vaxo OS — the owner's command center shared by all reference demos (/examples/eco-*).
// One platform, every demo: overview ("all-seeing eye"), all chats with the AI manager, auto review replies,
// ads & marketing, content & brand, deals, team roles & access, and a personal AI assistant for everyone.
// Usage: VaxoOS.mount(el, {lang:'en'|'ru'|'ua', niche:'clinic'|'shop'|'biz', accent:'#hex'}); VaxoOS.lang('ru').
(() => {
  const LI = { en: 0, ru: 1, ua: 2 };
  let L = 0, root = null, o = {}, st = {}, feedTimer = null;
  const t = (a) => (Array.isArray(a) ? (a[L] ?? a[0]) : a);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = (a) => esc(t(a));

  // ---------- interface words ----------
  const U = {
    os: ['Owner command center', 'Пульт владельца', 'Пульт власника'],
    viewAs: ['View as', 'Смотреть как', 'Дивитися як'],
    asBanner: ['You are seeing what this role sees. Change rights in “Team & access”.', 'Вы видите то, что видит эта роль. Права меняются в «Команда и доступы».', 'Ви бачите те, що бачить ця роль. Права змінюються в «Команда і доступи».'],
    sec: {
      overview: ['Overview', 'Обзор', 'Огляд'], inbox: ['All chats', 'Все чаты', 'Усі чати'], reviews: ['Reviews', 'Отзывы', 'Відгуки'],
      marketing: ['Ads & marketing', 'Реклама и маркетинг', 'Реклама і маркетинг'], content: ['Content & design', 'Контент и дизайн', 'Контент і дизайн'],
      deals: ['Sales (CRM)', 'Продажи (CRM)', 'Продажі (CRM)'], team: ['Team & access', 'Команда и доступы', 'Команда і доступи'], assistant: ['AI assistant', 'ИИ-помощник', 'ШІ-помічник'],
    },
    roles: {
      owner: ['Owner', 'Владелец', 'Власник'], manager: ['Manager', 'Управляющий', 'Керуючий'], admin: ['Administrator', 'Администратор', 'Адміністратор'],
      marketer: ['Marketer', 'Маркетолог', 'Маркетолог'], spec: ['Specialist', 'Специалист', 'Спеціаліст'],
    },
    hello: ['Good morning, Alex', 'Доброе утро, Алекс', 'Доброго ранку, Алексе'],
    helloP: ['Here is everything happening in the business right now — in one place.', 'Вот всё, что происходит в бизнесе прямо сейчас, — в одном месте.', 'Ось усе, що відбувається в бізнесі просто зараз, — в одному місці.'],
    eye: ['The all-seeing eye', 'Всевидящий глаз', 'Всевидюче око'],
    areas: [['Sales', 'Продажи', 'Продажі'], ['Marketing', 'Маркетинг', 'Маркетинг'], ['Service', 'Сервис', 'Сервіс'], ['Team', 'Команда', 'Команда']],
    brief: ['✦ AI morning briefing', '✦ Утренний брифинг ИИ', '✦ Ранковий брифінг ШІ'],
    live: ['Live — what is happening', 'Сейчас в бизнесе', 'Зараз у бізнесі'],
    rev30: ['Revenue, 30 days', 'Выручка за 30 дней', 'Виручка за 30 днів'],
    doIt: ['Do it', 'Сделать', 'Зробити'], done: ['Done', 'Готово', 'Готово'],
    inboxStat: ['Today: {a} conversations · AI closed {b} ({p}%) · avg. reply {s} sec · {w} need you', 'Сегодня: {a} диалогов · ИИ закрыл {b} ({p}%) · ответ в среднем за {s} сек · {w} ждут вас', 'Сьогодні: {a} діалогів · ШІ закрив {b} ({p}%) · відповідь у середньому за {s} с · {w} чекають на вас'],
    all: ['All', 'Все', 'Усі'], needYou: ['Needs you', 'Нужны вы', 'Потрібні ви'],
    stAi: ['AI is handling', 'Ведёт ИИ', 'Веде ШІ'], stYou: ['You', 'Вы', 'Ви'], stNeed: ['Needs you', 'Нужны вы', 'Потрібні ви'], stDone: ['Closed', 'Закрыт', 'Закрито'],
    aiOn: ['AI manager replies automatically', 'ИИ-менеджер отвечает автоматически', 'ШІ-менеджер відповідає автоматично'],
    take: ['Take over', 'Забрать себе', 'Забрати собі'], back: ['Return to AI', 'Вернуть ИИ', 'Повернути ШІ'],
    paused: ['AI paused in this chat while you are here.', 'ИИ на паузе в этом чате, пока вы ведёте его.', 'ШІ на паузі в цьому чаті, поки ви його ведете.'],
    asOwner: ['Reply as you', 'Ответить от себя', 'Відповісти від себе'], asClient: ['Test: write as a client', 'Тест: написать как клиент', 'Тест: написати як клієнт'],
    phOwner: ['Type your reply — the client sees it from the business account', 'Ваш ответ — клиент увидит его от имени бизнеса', 'Ваша відповідь — клієнт побачить її від імені бізнесу'],
    phClient: ['Write as a client — the AI manager answers live', 'Напишите как клиент — ИИ-менеджер ответит вживую', 'Напишіть як клієнт — ШІ-менеджер відповість наживо'],
    send: ['Send', 'Отправить', 'Надіслати'], you: ['You', 'Вы', 'Ви'], ai: ['AI manager', 'ИИ-менеджер', 'ШІ-менеджер'],
    sum: ['✦ AI summary', '✦ Кратко от ИИ', '✦ Коротко від ШІ'], back2: ['← Chats', '← Чаты', '← Чати'],
    aiBusy: ['The AI is busy — try again in a moment.', 'ИИ занят — попробуйте через минуту.', 'ШІ зайнятий — спробуйте за хвилину.'],
    rvMode: ['Review replies', 'Ответы на отзывы', 'Відповіді на відгуки'],
    rvModes: [['Automatic', 'Автоматически', 'Автоматично'], ['Draft for approval', 'Черновик на одобрение', 'Чернетка на схвалення'], ['Off', 'Выкл', 'Вимк']],
    rvStat: ['Rating {r} · {n} reviews this month · AI replied to all in {m} min on average', 'Рейтинг {r} · {n} отзывов за месяц · ИИ ответил на все, в среднем за {m} мин', 'Рейтинг {r} · {n} відгуків за місяць · ШІ відповів на всі, в середньому за {m} хв'],
    rvAuto: ['AI replied in {m} min', 'ИИ ответил за {m} мин', 'ШІ відповів за {m} хв'],
    rvNeg: ['Negative — AI replied gently and alerted you in Telegram', 'Негатив — ИИ ответил мягко и сообщил вам в Telegram', 'Негатив — ШІ відповів м’яко й повідомив вам у Telegram'],
    rvTest: ['A new review arrives (test)', 'Пришёл новый отзыв (тест)', 'Надійшов новий відгук (тест)'],
    rvPh: ['Write any review, good or bad — watch the AI answer it', 'Напишите любой отзыв, хороший или плохой, — ИИ ответит', 'Напишіть будь-який відгук, добрий чи поганий, — ШІ відповість'],
    rvGo: ['Publish review', 'Опубликовать отзыв', 'Опублікувати відгук'], rvNew: ['just now', 'только что', 'щойно'],
    call: ['Call the client', 'Позвонить клиенту', 'Зателефонувати клієнту'], edit: ['Edit reply', 'Изменить ответ', 'Змінити відповідь'], approve: ['Approve & publish', 'Одобрить и опубликовать', 'Схвалити й опублікувати'],
    mk: [['Budget, month', 'Бюджет за месяц', 'Бюджет за місяць'], ['Leads', 'Заявки', 'Заявки'], ['Cost per lead', 'Цена заявки', 'Ціна заявки'], ['Return on ads', 'Окупаемость рекламы', 'Окупність реклами']],
    mkCols: [['Channel', 'Канал', 'Канал'], ['Spend', 'Расход', 'Витрати'], ['Leads', 'Заявки', 'Заявки'], ['Lead', 'Заявка', 'Заявка'], ['Sales', 'Продажи', 'Продажі'], ['Return', 'Окупаемость', 'Окупність']],
    mkAi: ['✦ AI recommendations for the budget', '✦ Рекомендации ИИ по бюджету', '✦ Рекомендації ШІ щодо бюджету'],
    apply: ['Apply', 'Применить', 'Застосувати'], applied: ['Applied', 'Применено', 'Застосовано'],
    autopilot: ['Budget autopilot: AI moves money to what sells, within limits you set', 'Автопилот бюджета: ИИ переносит деньги туда, где продаёт, в рамках ваших лимитов', 'Автопілот бюджету: ШІ переносить гроші туди, де продає, у межах ваших лімітів'],
    share: ['Where leads come from', 'Откуда заявки', 'Звідки заявки'],
    week: ['Content plan for the week', 'Контент-план на неделю', 'Контент-план на тиждень'],
    days: [['Mon', 'Пн', 'Пн'], ['Tue', 'Вт', 'Вт'], ['Wed', 'Ср', 'Ср'], ['Thu', 'Чт', 'Чт'], ['Fri', 'Пт', 'Пт'], ['Sat', 'Сб', 'Сб'], ['Sun', 'Вс', 'Нд']],
    cst: { pub: ['Published', 'Опубликовано', 'Опубліковано'], wait: ['Waiting for your OK', 'Ждёт вашего «да»', 'Чекає вашого «так»'], ai: ['AI draft', 'Черновик ИИ', 'Чернетка ШІ'], plan: ['Scheduled', 'Запланировано', 'Заплановано'] },
    gen: ['✦ AI writes a post', '✦ ИИ пишет пост', '✦ ШІ пише пост'], genPh: ['Topic, e.g. “a weekend offer”', 'Тема, например «предложение на выходные»', 'Тема, наприклад «пропозиція на вихідні»'], genGo: ['Write', 'Написать', 'Написати'],
    kit: ['Brand kit — every post and ad stays on-brand', 'Бренд-кит — каждый пост и реклама в одном стиле', 'Бренд-кіт — кожен пост і реклама в одному стилі'],
    kitF: ['Fonts', 'Шрифты', 'Шрифти'], kitV: ['Tone of voice', 'Голос бренда', 'Голос бренду'],
    stage: ['New stage', 'Новый этап', 'Новий етап'], add: ['Add', 'Добавить', 'Додати'], dealHint: ['Drag a card (or tap it) to move it — automations fire on each move.', 'Перетащите карточку (или нажмите), чтобы сдвинуть, — на каждый шаг срабатывают автоматизации.', 'Перетягніть картку (або натисніть), щоб пересунути, — на кожен крок спрацьовують автоматизації.'],
    next: ['✦ next step', '✦ следующий шаг', '✦ наступний крок'],
    team: ['People', 'Люди', 'Люди'], rights: ['Who sees what', 'Кто что видит', 'Хто що бачить'], log: ['Activity log', 'Журнал действий', 'Журнал дій'],
    invite: ['Invite by email', 'Пригласить по почте', 'Запросити поштою'], invPh: ['name@company.com', 'name@company.com', 'name@company.com'], invited: ['Invitation sent', 'Приглашение отправлено', 'Запрошення надіслано'], pending: ['invited', 'приглашён', 'запрошено'],
    money: ['See money & revenue', 'Видит деньги и выручку', 'Бачить гроші й виручку'],
    asTitle: ['A personal AI assistant for everyone on the team', 'Личный ИИ-помощник для каждого в команде', 'Особистий ШІ-помічник для кожного в команді'],
    asP: ['It knows the business and the role: says what to do today, prepares it — and does it in one tap.', 'Знает бизнес и роль человека: подсказывает, что сделать сегодня, готовит это — и делает в одно нажатие.', 'Знає бізнес і роль людини: підказує, що зробити сьогодні, готує це — і робить в одне натискання.'],
    askPh: ['Ask, e.g. “what should I do today to grow revenue?”', 'Спросите, например: «что сделать сегодня, чтобы выросла выручка?»', 'Запитайте, наприклад: «що зробити сьогодні, щоб зросла виручка?»'],
    ask: ['Ask', 'Спросить', 'Запитати'], locked: ['Hidden for this role', 'Скрыто для этой роли', 'Приховано для цієї ролі'],
    ch: { ig: 'Instagram', wa: 'WhatsApp', tg: 'Telegram', site: ['Website chat', 'Чат на сайте', 'Чат на сайті'], fb: 'Facebook', gg: 'Google', tt: 'TikTok', mail: 'Email' },
  };
  const SECS = ['overview', 'inbox', 'reviews', 'marketing', 'content', 'deals', 'team', 'assistant'];
  const ICON = {
    overview: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>',
    inbox: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    reviews: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    marketing: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>',
    content: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    deals: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6 6 0 0 0-4-5.6"/>',
    assistant: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/>',
  };
  const PERM0 = {
    owner: SECS.slice(),
    manager: ['overview', 'inbox', 'reviews', 'marketing', 'content', 'deals', 'team', 'assistant'],
    admin: ['inbox', 'reviews', 'deals', 'assistant'],
    marketer: ['overview', 'reviews', 'marketing', 'content', 'assistant'],
    spec: ['deals', 'assistant'],
  };
  const MONEY0 = { owner: true, manager: true, admin: false, marketer: false, spec: false };

  // ---------- niche data ----------
  const N = {
    clinic: {
      brand: 'Aurelia Skin Clinic', who: 'clinic',
      items: [['hydra', 'HydraFacial — glow, cleansing, 60 min, $180'], ['peel', 'Chemical peel — dark spots, acne marks, 45 min, $140'], ['laser', 'Laser resurfacing — fine lines, texture, $420'], ['botox', 'Wrinkle relaxers — forehead lines, consultation first, from $300'], ['calm', 'Calm facial — red sensitive skin, 50 min, $120'], ['consult', 'Free 15-min skin consultation']],
      kpi: [[['Revenue, month', 'Выручка за месяц', 'Виручка за місяць'], '$86,400', '+14%'], [['Bookings', 'Записи', 'Записи'], '412', '+9%'], [['No-shows', 'Неявки', 'Неявки'], '3.1%', '−66%'], [['Chats by AI', 'Чатов закрыл ИИ', 'Чатів закрив ШІ'], '86%', '+12 pp'], [['Rating', 'Рейтинг', 'Рейтинг'], '4.9', '+0.2'], [['Ad return', 'Окупаемость рекламы', 'Окупність реклами'], '5.8×', '+1.1×']],
      health: [['good', ['412 bookings, plan 103%', '412 записей, план 103%', '412 записів, план 103%']], ['warn', ['TikTok leads cost 2.4× more than Google', 'Заявка из TikTok в 2,4 раза дороже, чем из Google', 'Заявка з TikTok у 2,4 раза дорожча, ніж з Google']], ['good', ['All 38 reviews answered, rating 4.9', 'На все 38 отзывов ответили, рейтинг 4,9', 'На всі 38 відгуків відповіли, рейтинг 4,9']], ['bad', ['Dr. Lane is booked 96% — add evening slots', 'Д-р Лейн загружена на 96% — добавьте вечерние слоты', 'Д-р Лейн завантажена на 96% — додайте вечірні слоти']]],
      brief: [['2 clients at risk of no-show at 15:00 and 17:30 — AI prepared a personal message.', '2 клиента могут не прийти в 15:00 и 17:30 — ИИ подготовил личное сообщение.', '2 клієнти можуть не прийти о 15:00 і 17:30 — ШІ підготував особисте повідомлення.'], ['14 clients finished a peel course 3 months ago — offer a maintenance visit.', '14 клиентов закончили курс пилинга 3 месяца назад — предложить поддерживающий визит.', '14 клієнтів закінчили курс пілінгу 3 місяці тому — запропонувати підтримувальний візит.'], ['Move $300 from TikTok to Google Search: the lead is 2.4× cheaper there.', 'Перенести $300 из TikTok в поиск Google: заявка там в 2,4 раза дешевле.', 'Перенести $300 з TikTok у пошук Google: заявка там у 2,4 раза дешевша.']],
      feed: [['💬', ['AI booked Emma for HydraFacial, Thu 11:30 (Instagram)', 'ИИ записал Эмму на HydraFacial, чт 11:30 (Instagram)', 'ШІ записав Емму на HydraFacial, чт 11:30 (Instagram)']], ['⭐', ['New 5★ review on Google — AI replied', 'Новый отзыв 5★ в Google — ИИ ответил', 'Новий відгук 5★ у Google — ШІ відповів']], ['💳', ['Prepayment $40 received — Mia K.', 'Получена предоплата $40 — Мия К.', 'Отримано передоплату $40 — Мія К.']], ['📅', ['Reminder confirmed: 4 of 5 visits tomorrow', 'Напоминание подтвердили: 4 из 5 визитов на завтра', 'Нагадування підтвердили: 4 з 5 візитів на завтра']], ['📣', ['Google Ads: 3 new leads in the last hour', 'Google Ads: 3 новые заявки за час', 'Google Ads: 3 нові заявки за годину']], ['🤝', ['Referral: Anna brought a friend — 500 points credited', 'Рекомендация: Анна привела подругу — начислено 500 баллов', 'Рекомендація: Анна привела подругу — нараховано 500 балів']]],
      chats: [
        { n: 'Emma Ross', ch: 'ig', s: 'ai', v: '$180', m: [['c', ['Hi! My skin looks dull after summer, what would you suggest?', 'Привет! После лета кожа тусклая, что посоветуете?', 'Привіт! Після літа шкіра тьмяна, що порадите?']], ['a', ['Hi Emma! For dullness clients love our HydraFacial — 60 min, instant glow, $180. Would Thursday 11:30 work?', 'Здравствуйте, Эмма! От тусклости отлично работает HydraFacial — 60 минут, сияние сразу, $180. Удобно в четверг в 11:30?', 'Вітаю, Еммо! Від тьмяності чудово працює HydraFacial — 60 хвилин, сяйво одразу, $180. Зручно в четвер об 11:30?']], ['c', ['Yes, perfect', 'Да, отлично', 'Так, чудово']], ['a', ['Booked ✨ Thu 11:30 with Dr. Lane. I’ll remind you the day before.', 'Записала ✨ Чт 11:30 к д-ру Лейн. Напомню за день.', 'Записала ✨ Чт 11:30 до д-ра Лейн. Нагадаю за день.']]], sum: ['Booked HydraFacial Thu 11:30. Interested in a peel course later.', 'Записана на HydraFacial чт 11:30. Позже интересуется курсом пилинга.', 'Записана на HydraFacial чт 11:30. Пізніше цікавиться курсом пілінгу.'] },
        { n: 'Julia M.', ch: 'wa', s: 'need', v: '$420', m: [['c', ['After the laser my cheek is still red on day 3, is that normal??', 'После лазера щека красная уже 3-й день, это нормально??', 'Після лазера щока червона вже 3-й день, це нормально??']], ['a', ['Julia, thank you for writing — I’ve passed this to Dr. Lane right now, she’ll call you within 15 minutes. Please don’t apply anything new until then.', 'Юлия, спасибо, что написали, — я сразу передала это д-ру Лейн, она перезвонит в течение 15 минут. Пока не наносите ничего нового.', 'Юліє, дякую, що написали, — я одразу передала це д-ру Лейн, вона зателефонує протягом 15 хвилин. Поки не наносьте нічого нового.']]], sum: ['Medical question after laser — AI did not advise, escalated to the doctor.', 'Медицинский вопрос после лазера — ИИ не советовал сам, передал врачу.', 'Медичне питання після лазера — ШІ не радив сам, передав лікарю.'] },
        { n: 'Sofia K.', ch: 'site', s: 'ai', v: '$140', m: [['c', ['How much is a peel and does it hurt?', 'Сколько стоит пилинг и это больно?', 'Скільки коштує пілінг і чи це боляче?']], ['a', ['A chemical peel is $140, 45 min — most clients feel light tingling, not pain. Want me to find a time this week?', 'Химический пилинг — $140, 45 минут. Большинство чувствует лёгкое покалывание, не боль. Подобрать время на этой неделе?', 'Хімічний пілінг — $140, 45 хвилин. Більшість відчуває легке поколювання, не біль. Підібрати час цього тижня?']]], sum: ['Price question, warm lead. AI offered a slot.', 'Вопрос о цене, тёплая заявка. ИИ предложил время.', 'Питання про ціну, тепла заявка. ШІ запропонував час.'] },
        { n: 'Daniel P.', ch: 'tg', s: 'owner', v: '$900', m: [['c', ['Can I buy a gift certificate for my wife, around $900?', 'Можно купить жене сертификат примерно на $900?', 'Можна купити дружині сертифікат приблизно на $900?']], ['a', ['Of course! I can prepare a personal certificate — do you want a fixed amount or a treatment plan?', 'Конечно! Подготовлю именной сертификат — на сумму или на план процедур?', 'Звісно! Підготую іменний сертифікат — на суму чи на план процедур?']], ['o', ['Daniel, this is Alex, the owner — for a $900 certificate we add a free consultation and a gift box. Shall I send it to you tomorrow?', 'Даниэль, это Алекс, владелец, — к сертификату на $900 добавим бесплатную консультацию и подарочную коробку. Отправить вам завтра?', 'Даніеле, це Алекс, власник, — до сертифіката на $900 додамо безкоштовну консультацію й подарункову коробку. Надіслати вам завтра?']]], sum: ['Big gift order — owner took over personally.', 'Крупный подарочный заказ — владелец подключился сам.', 'Велике подарункове замовлення — власник підключився сам.'] },
        { n: 'Lena V.', ch: 'fb', s: 'done', v: '$120', m: [['c', ['Do you have anything for sensitive red skin?', 'Есть что-то для чувствительной красной кожи?', 'Є щось для чутливої червоної шкіри?']], ['a', ['Yes — our Calm facial, 50 min, $120: soothing mask, LED and barrier repair. Booked you for Saturday 10:00 as you asked 🌿', 'Да — успокаивающая процедура Calm, 50 минут, $120: маска, LED и восстановление барьера. Записала на субботу 10:00, как вы просили 🌿', 'Так — заспокійлива процедура Calm, 50 хвилин, $120: маска, LED і відновлення бар’єра. Записала на суботу 10:00, як ви просили 🌿']]], sum: ['Booked, paid deposit. Closed by AI.', 'Записана, внесла предоплату. Закрыл ИИ.', 'Записана, внесла передоплату. Закрив ШІ.'] },
      ],
      reviews: [[5, 'gg', 'Anna B.', ['Gentle doctors and no pressure to buy extra. Results after the 2nd session!', 'Бережные врачи и никто не навязывает лишнего. Результат после 2-го сеанса!', 'Дбайливі лікарі й ніхто не нав’язує зайвого. Результат після 2-го сеансу!'], ['Anna, thank you! We’re so glad the results show already — see you at session three ✨', 'Анна, спасибо! Очень рады, что результат уже виден, — ждём на третьем сеансе ✨', 'Анно, дякуємо! Дуже раді, що результат уже видно, — чекаємо на третьому сеансі ✨'], 1], [2, 'gg', 'Mark T.', ['Waited 25 minutes past my time. Treatment was fine.', 'Ждал 25 минут сверх времени. Сама процедура нормальная.', 'Чекав 25 хвилин понад час. Сама процедура нормальна.'], ['Mark, you’re right — 25 minutes is too long, and we’re sorry. We’ve added buffer time between visits, and your next treatment is on us.', 'Марк, вы правы — 25 минут это слишком долго, нам жаль. Мы добавили запас времени между визитами, а следующая процедура — за наш счёт.', 'Марку, ви праві — 25 хвилин це надто довго, нам шкода. Ми додали запас часу між візитами, а наступна процедура — за наш рахунок.'], 2], [5, 'ig', 'Kate L.', ['Best HydraFacial in town 💛', 'Лучший HydraFacial в городе 💛', 'Найкращий HydraFacial у місті 💛'], ['Kate, that made our day 💛 Your skin is glowing!', 'Кейт, вы сделали нам день 💛 Кожа сияет!', 'Кейт, ви зробили нам день 💛 Шкіра сяє!'], 1], [4, 'site', 'Olga S.', ['Very nice, would love more evening slots.', 'Очень понравилось, хотелось бы больше вечерних окон.', 'Дуже сподобалося, хотілося б більше вечірніх вікон.'], ['Olga, thank you — we heard you: from November we’re open until 21:00 on Tue and Thu.', 'Ольга, спасибо — услышали: с ноября работаем до 21:00 по вторникам и четвергам.', 'Ольго, дякуємо — почули: з листопада працюємо до 21:00 у вівторок і четвер.'], 3]],
      rating: '4.9', rcount: 38,
      chan: [['Google Search', 1200, 96, 41, 7.4], ['Instagram Ads', 900, 58, 22, 5.1], ['TikTok Ads', 700, 22, 7, 2.2], [['Referrals', 'Рекомендации', 'Рекомендації'], 0, 31, 19, 0], [['Instagram (organic)', 'Instagram (органика)', 'Instagram (органіка)'], 0, 44, 15, 0]],
      mkRecs: [['TikTok leads cost $32 vs $12.5 on Google. Move $300 to Google Search “HydraFacial near me”.', 'Заявка из TikTok — $32, из Google — $12,5. Перенести $300 в поиск Google «HydraFacial рядом».', 'Заявка з TikTok — $32, з Google — $12,5. Перенести $300 у пошук Google «HydraFacial поруч».'], ['Referrals bring 19 sales for $0. Raise the referral reward from 500 to 800 points.', 'Рекомендации дают 19 продаж за $0. Поднять награду за друга с 500 до 800 баллов.', 'Рекомендації дають 19 продажів за $0. Підняти нагороду за друга з 500 до 800 балів.']],
      posts: [['ig', ['Before/after: 3 peel sessions', 'До/после: 3 сеанса пилинга', 'До/після: 3 сеанси пілінгу'], 'pub'], ['tt', ['Doctor answers: is laser painful?', 'Врач отвечает: больно ли от лазера?', 'Лікар відповідає: чи боляче від лазера?'], 'pub'], ['ig', ['5 mistakes in autumn skincare', '5 ошибок осеннего ухода за кожей', '5 помилок осіннього догляду за шкірою'], 'wait'], ['fb', ['Gift certificates for the holidays', 'Подарочные сертификаты к праздникам', 'Подарункові сертифікати до свят'], 'plan'], ['ig', ['Meet Dr. Lane', 'Знакомьтесь: д-р Лейн', 'Знайомтеся: д-р Лейн'], 'ai'], ['tt', ['Glow in 60 minutes', 'Сияние за 60 минут', 'Сяйво за 60 хвилин'], 'ai'], ['ig', ['Client story: Anna', 'История клиентки: Анна', 'Історія клієнтки: Анна'], 'plan']],
      kit: { colors: ['#23362E', '#B9785B', '#DCE3DA', '#F3F2EE'], fonts: 'Instrument Serif · Manrope', voice: ['Calm, caring, expert. No pressure, no miracle promises.', 'Спокойно, заботливо, экспертно. Без давления и обещаний чудес.', 'Спокійно, дбайливо, експертно. Без тиску й обіцянок див.'] },
      stages: [['New request', 'Новая заявка', 'Нова заявка'], ['Consultation', 'Консультация', 'Консультація'], ['Booked', 'Записан', 'Записаний'], ['Treatment plan', 'План процедур', 'План процедур']],
      deals: [['Emma Ross', 180, 2, ['remind 24h before', 'напомнить за 24 ч', 'нагадати за 24 год']], ['Sofia K.', 140, 0, ['offer Thu slot', 'предложить чт', 'запропонувати чт']], ['Daniel P.', 900, 1, ['send certificate', 'отправить сертификат', 'надіслати сертифікат']], ['Lena V.', 120, 2, ['aftercare tips', 'советы после процедуры', 'поради після процедури']], ['Mia K.', 1080, 3, ['session 4 of 6', 'сеанс 4 из 6', 'сеанс 4 з 6']], ['Julia M.', 420, 3, ['doctor call', 'звонок врача', 'дзвінок лікаря']], ['Nora W.', 300, 1, ['send prices', 'отправить цены', 'надіслати ціни']]],
      team: [['Alex', 'owner'], ['Marco', 'manager'], ['Olivia', 'admin'], ['Sara', 'marketer'], ['Dr. Lane', 'spec']],
      log: [['Olivia', ['confirmed 5 visits for tomorrow', 'подтвердила 5 визитов на завтра', 'підтвердила 5 візитів на завтра'], '10:42'], ['AI', ['moved 2 visits at clients’ request', 'перенёс 2 визита по просьбе клиентов', 'переніс 2 візити на прохання клієнтів'], '10:15'], ['Sara', ['approved 3 posts for the week', 'одобрила 3 поста на неделю', 'схвалила 3 пости на тиждень'], '09:58'], ['Dr. Lane', ['added notes to Mia K.’s plan', 'добавила заметки в план Мии К.', 'додала нотатки в план Мії К.'], '09:30']],
      tips: {
        owner: [['Approve evening slots Tue/Thu — 31 clients asked for them, ≈ +$6,200/month.', 'Одобрить вечерние окна вт/чт — их просил 31 клиент, ≈ +$6 200 в месяц.', 'Схвалити вечірні вікна вт/чт — їх просив 31 клієнт, ≈ +$6 200 на місяць.'], ['Call Julia M. back yourself — post-laser question, high-value client.', 'Перезвонить Юлии М. лично — вопрос после лазера, ценная клиентка.', 'Передзвонити Юлії М. особисто — питання після лазера, цінна клієнтка.'], ['Move $300 from TikTok to Google Search.', 'Перенести $300 из TikTok в поиск Google.', 'Перенести $300 з TikTok у пошук Google.']],
        manager: [['Dr. Lane is 96% booked: open 6 evening slots for Dr. Reyes.', 'Д-р Лейн загружена на 96%: открыть 6 вечерних окон у д-ра Рейес.', 'Д-р Лейн завантажена на 96%: відкрити 6 вечірніх вікон у д-ра Рейес.'], ['Weekly team report is ready — send it to everyone.', 'Недельный отчёт команды готов — разослать всем.', 'Тижневий звіт команди готовий — розіслати всім.']],
        admin: [['3 clients haven’t confirmed tomorrow — send a reminder.', '3 клиента не подтвердили визит на завтра — отправить напоминание.', '3 клієнти не підтвердили візит на завтра — надіслати нагадування.'], ['Mark T. left a 2★ review — call and offer a free treatment.', 'Марк Т. оставил отзыв 2★ — позвонить и предложить бесплатную процедуру.', 'Марк Т. залишив відгук 2★ — зателефонувати й запропонувати безкоштовну процедуру.']],
        marketer: [['Post “5 autumn mistakes” is waiting for the owner — remind him.', 'Пост «5 осенних ошибок» ждёт одобрения владельца — напомнить.', 'Пост «5 осінніх помилок» чекає схвалення власника — нагадати.'], ['Make 3 Reels from Anna’s before/after — AI prepared the script.', 'Сделать 3 Reels из «до/после» Анны — ИИ подготовил сценарий.', 'Зробити 3 Reels із «до/після» Анни — ШІ підготував сценарій.']],
        spec: [['Mia K. — session 4 of 6 today; AI prepared notes from last time.', 'Мия К. — сегодня сеанс 4 из 6; ИИ подготовил заметки с прошлого раза.', 'Мія К. — сьогодні сеанс 4 з 6; ШІ підготував нотатки з минулого разу.'], ['Send aftercare tips to 4 clients from yesterday.', 'Отправить советы после процедуры 4 клиентам со вчера.', 'Надіслати поради після процедури 4 клієнтам від учора.']],
      },
      rev: [52, 58, 55, 61, 66, 63, 70, 74, 69, 77, 81, 79, 86, 90, 88, 94, 97, 92, 101, 105, 99, 108, 112, 109, 116, 121, 118, 124, 129, 133],
    },
    shop: {
      brand: 'Ostra Parfums', who: 'store',
      items: [['n01', 'Fig & Cedar candle — warm, woody, cosy, $58'], ['n02', 'Salt Air eau de parfum — fresh, marine, $142'], ['n03', 'Black Tea diffuser — smoky, calm, $74'], ['n04', 'Rose Smoke candle — floral, evening, $64'], ['n05', 'Discovery set — 6 mini perfumes, $38'], ['n06', 'Refill pouch — eco refill for diffusers, $29']],
      kpi: [[['Revenue, month', 'Выручка за месяц', 'Виручка за місяць'], '$48,920', '+18%'], [['Orders', 'Заказы', 'Замовлення'], '612', '+11%'], [['Repeat buyers', 'Повторные покупки', 'Повторні покупки'], '41%', '+6 pp'], [['Chats by AI', 'Чатов закрыл ИИ', 'Чатів закрив ШІ'], '89%', '+9 pp'], [['Rating', 'Рейтинг', 'Рейтинг'], '4.8', '+0.1'], [['Ad return', 'Окупаемость рекламы', 'Окупність реклами'], '4.6×', '+0.8×']],
      health: [['good', ['612 orders, average check $80', '612 заказов, средний чек $80', '612 замовлень, середній чек $80']], ['good', ['Meta Ads return 5.2× — best channel', 'Meta Ads окупаются в 5,2 раза — лучший канал', 'Meta Ads окупаються в 5,2 раза — найкращий канал']], ['warn', ['7 orders delayed by the courier — AI warned clients', '7 заказов задерживает курьер — ИИ предупредил клиентов', '7 замовлень затримує кур’єр — ШІ попередив клієнтів']], ['good', ['Packing: 0 orders older than 24 h', 'Склад: нет заказов старше 24 ч', 'Склад: немає замовлень старших за 24 год']]],
      brief: [['“Fig & Cedar” sells out in 6 days at this pace — reorder 120 pcs.', '«Fig & Cedar» закончится через 6 дней при таком темпе — дозаказать 120 шт.', '«Fig & Cedar» закінчиться за 6 днів при такому темпі — дозамовити 120 шт.'], ['86 carts abandoned this week ($6,900) — AI prepared a gentle reminder.', '86 брошенных корзин за неделю ($6 900) — ИИ подготовил мягкое напоминание.', '86 покинутих кошиків за тиждень ($6 900) — ШІ підготував м’яке нагадування.'], ['Customers who bought a candle 60+ days ago — offer a refill, ≈ +$2,100.', 'Клиентам, купившим свечу 60+ дней назад, — предложить refill, ≈ +$2 100.', 'Клієнтам, що купили свічку 60+ днів тому, — запропонувати refill, ≈ +$2 100.']],
      feed: [['🛍', ['New order #4821 — $142, Salt Air', 'Новый заказ #4821 — $142, Salt Air', 'Нове замовлення #4821 — $142, Salt Air']], ['💬', ['AI helped Liam pick a gift and sent a cart link', 'ИИ помог Лиаму выбрать подарок и прислал ссылку на корзину', 'ШІ допоміг Ліаму вибрати подарунок і надіслав посилання на кошик']], ['⭐', ['5★ review on the site — AI replied', 'Отзыв 5★ на сайте — ИИ ответил', 'Відгук 5★ на сайті — ШІ відповів']], ['🔁', ['Abandoned cart recovered — $96', 'Брошенная корзина вернулась — $96', 'Покинутий кошик повернувся — $96']], ['📦', ['12 orders handed to the courier', '12 заказов переданы курьеру', '12 замовлень передано кур’єру']], ['🤝', ['Affiliate @nora.scents: 3 sales today', 'Партнёр @nora.scents: 3 продажи сегодня', 'Партнер @nora.scents: 3 продажі сьогодні']]],
      chats: [
        { n: 'Liam H.', ch: 'ig', s: 'ai', v: '$96', m: [['c', ['Need a gift for my mom, she loves cosy evenings, budget ~$100', 'Нужен подарок маме, она любит уютные вечера, бюджет около $100', 'Потрібен подарунок мамі, вона любить затишні вечори, бюджет близько $100']], ['a', ['Lovely! Fig & Cedar candle ($58) + Discovery set ($38) = $96 — warm, woody and a little journey. Gift wrap is free 🎁', 'Чудесно! Свеча Fig & Cedar ($58) + набор Discovery ($38) = $96: тёплый древесный аромат и маленькое путешествие. Упаковка бесплатно 🎁', 'Чудово! Свічка Fig & Cedar ($58) + набір Discovery ($38) = $96: теплий деревний аромат і маленька подорож. Пакування безкоштовне 🎁']], ['c', ['Perfect, how do I order?', 'Идеально, как заказать?', 'Ідеально, як замовити?']], ['a', ['Here’s your ready cart with gift wrap — 2 taps to pay 💛', 'Вот готовая корзина с упаковкой — оплата в 2 нажатия 💛', 'Ось готовий кошик із пакуванням — оплата у 2 натискання 💛']]], sum: ['Gift, $96, cart link sent. Likely to buy today.', 'Подарок, $96, ссылка на корзину отправлена. Скорее всего купит сегодня.', 'Подарунок, $96, посилання на кошик надіслано. Найімовірніше купить сьогодні.'] },
        { n: 'Chloe R.', ch: 'mail', s: 'need', v: '$142', m: [['c', ['My order arrived with a broken bottle 😞', 'Заказ пришёл с разбитым флаконом 😞', 'Замовлення прийшло з розбитим флаконом 😞']], ['a', ['Chloe, I’m so sorry! We’re sending a new bottle today at no cost, no need to return anything. The owner has been notified too.', 'Хлоя, очень жаль! Сегодня же отправим новый флакон бесплатно, ничего возвращать не нужно. Владельцу тоже сообщили.', 'Хлоє, дуже шкода! Сьогодні ж надішлемо новий флакон безкоштовно, нічого повертати не треба. Власнику теж повідомили.']]], sum: ['Damaged delivery. AI promised a replacement (within the rules), owner alerted.', 'Повреждённая доставка. ИИ пообещал замену (по правилам), владелец уведомлён.', 'Пошкоджена доставка. ШІ пообіцяв заміну (за правилами), власника повідомлено.'] },
        { n: 'Ava S.', ch: 'site', s: 'ai', v: '$74', m: [['c', ['Something calm for the bedroom, not too sweet', 'Что-то спокойное для спальни, не слишком сладкое', 'Щось спокійне для спальні, не надто солодке']], ['a', ['Black Tea diffuser ($74) — smoky, calm, lasts 3 months. Want me to add a refill so you never run out?', 'Диффузор Black Tea ($74) — дымный, спокойный, хватает на 3 месяца. Добавить refill, чтобы не закончился?', 'Дифузор Black Tea ($74) — димний, спокійний, вистачає на 3 місяці. Додати refill, щоб не закінчився?']]], sum: ['Choosing for the bedroom, AI suggested a refill subscription.', 'Выбирает для спальни, ИИ предложил подписку на refill.', 'Вибирає для спальні, ШІ запропонував підписку на refill.'] },
        { n: 'Hotel Mira', ch: 'wa', s: 'owner', v: '$4,800', m: [['c', ['We want our signature scent for 40 rooms, wholesale?', 'Хотим свой аромат для 40 номеров, есть опт?', 'Хочемо свій аромат для 40 номерів, є опт?']], ['a', ['Yes, we do hotel scents! How many rooms and which mood — fresh or warm?', 'Да, делаем ароматы для отелей! Сколько номеров и какое настроение — свежее или тёплое?', 'Так, робимо аромати для готелів! Скільки номерів і який настрій — свіжий чи теплий?']], ['o', ['Hi, this is Alex, the founder. For 40 rooms I’ll prepare 3 samples and a quote by Friday — what’s the best address?', 'Здравствуйте, это Алекс, основатель. Для 40 номеров подготовлю 3 пробника и расчёт к пятнице — на какой адрес отправить?', 'Вітаю, це Алекс, засновник. Для 40 номерів підготую 3 пробники й розрахунок до п’ятниці — на яку адресу надіслати?']]], sum: ['B2B lead, ~$4,800. Owner leads personally.', 'Оптовый клиент, около $4 800. Владелец ведёт сам.', 'Гуртовий клієнт, близько $4 800. Власник веде сам.'] },
        { n: 'Noah B.', ch: 'tg', s: 'done', v: '$29', m: [['c', ['Where is my refill?', 'Где мой refill?', 'Де мій refill?']], ['a', ['It’s on its way — arrives tomorrow before 14:00. Tracking link: sent ✔', 'Уже в пути — привезут завтра до 14:00. Ссылку на отслеживание отправила ✔', 'Уже в дорозі — привезуть завтра до 14:00. Посилання на відстеження надіслала ✔']]], sum: ['Delivery status — answered by AI.', 'Статус доставки — ответил ИИ.', 'Статус доставки — відповів ШІ.'] },
      ],
      reviews: [[5, 'site', 'Grace P.', ['Fig & Cedar smells like a cabin in the woods. Already my third!', 'Fig & Cedar пахнет как домик в лесу. Уже третья!', 'Fig & Cedar пахне як будиночок у лісі. Уже третя!'], ['Grace, a cabin in the woods is exactly what we were going for 🌲 Thank you for coming back!', 'Грейс, домик в лесу — именно то, что мы хотели 🌲 Спасибо, что возвращаетесь!', 'Грейс, будиночок у лісі — саме те, чого ми хотіли 🌲 Дякуємо, що повертаєтеся!'], 1], [1, 'gg', 'Tom W.', ['Delivery took 9 days. Not ok.', 'Доставка шла 9 дней. Так нельзя.', 'Доставка йшла 9 днів. Так не можна.'], ['Tom, you’re right, 9 days is not ok — we’re sorry. We’ve refunded the shipping and changed the courier for your city.', 'Том, вы правы, 9 дней — это не нормально, простите. Вернули стоимость доставки и сменили курьера для вашего города.', 'Томе, ви праві, 9 днів — це не нормально, вибачте. Повернули вартість доставки й змінили кур’єра для вашого міста.'], 2], [5, 'ig', 'Mila D.', ['The packaging is a gift itself 😍', 'Упаковка — уже подарок 😍', 'Пакування — уже подарунок 😍'], ['Mila, thank you! We wrap every order by hand 💛', 'Мила, спасибо! Мы упаковываем каждый заказ вручную 💛', 'Міло, дякуємо! Ми пакуємо кожне замовлення вручну 💛'], 1], [4, 'site', 'Ben C.', ['Great scent, wish the candle burned longer.', 'Отличный аромат, хотелось бы, чтобы свеча горела дольше.', 'Чудовий аромат, хотілося б, щоб свічка горіла довше.'], ['Ben, thanks for the honest note — tip: trim the wick to 5 mm each time, it adds ~10 hours. A bigger 3-wick size is coming in December.', 'Бен, спасибо за честность. Совет: подрезайте фитиль до 5 мм — это +10 часов. В декабре выйдет большая свеча с 3 фитилями.', 'Бене, дякуємо за чесність. Порада: підрізайте гніт до 5 мм — це +10 годин. У грудні вийде велика свічка з 3 ґнотами.'], 3]],
      rating: '4.8', rcount: 64,
      chan: [['Meta Ads', 1600, 210, 118, 5.2], ['Google Shopping', 1100, 140, 76, 4.9], ['TikTok Ads', 800, 95, 31, 2.6], [['Affiliates', 'Партнёры', 'Партнери'], 420, 88, 52, 6.1], [['Email & SMS (own base)', 'Письма и SMS (своя база)', 'Листи й SMS (своя база)'], 60, 70, 44, 0]],
      mkRecs: [['Affiliates return 6.1× — invite 10 more micro-creators, AI found 24 candidates.', 'Партнёры окупаются в 6,1 раза — пригласить ещё 10 микроблогеров, ИИ нашёл 24 кандидата.', 'Партнери окупаються в 6,1 раза — запросити ще 10 мікроблогерів, ШІ знайшов 24 кандидатів.'], ['TikTok return is 2.6× — keep the best 2 videos, pause the other 5.', 'TikTok окупается в 2,6 раза — оставить 2 лучших ролика, остальные 5 остановить.', 'TikTok окупається в 2,6 раза — залишити 2 найкращі ролики, решту 5 зупинити.']],
      posts: [['ig', ['New: Rose Smoke candle', 'Новинка: свеча Rose Smoke', 'Новинка: свічка Rose Smoke'], 'pub'], ['tt', ['How we pour candles by hand', 'Как мы льём свечи вручную', 'Як ми ллємо свічки вручну'], 'pub'], ['ig', ['Gift guide under $100', 'Подарки до $100', 'Подарунки до $100'], 'wait'], ['fb', ['Refill = −40% plastic', 'Refill = −40% пластика', 'Refill = −40% пластику'], 'plan'], ['tt', ['Scent quiz: which one are you?', 'Тест: какой вы аромат?', 'Тест: який ви аромат?'], 'ai'], ['ig', ['Behind the scenes: packing', 'За кулисами: упаковка', 'За лаштунками: пакування'], 'ai'], ['ig', ['Customer photos of the week', 'Фото покупателей недели', 'Фото покупців тижня'], 'plan']],
      kit: { colors: ['#6E2F22', '#B88A57', '#F4EFE8', '#1D1915'], fonts: 'Cormorant Garamond · Jost', voice: ['Quiet luxury, sensory words, short sentences.', 'Тихая роскошь, чувственные слова, короткие фразы.', 'Тиха розкіш, чуттєві слова, короткі фрази.'] },
      stages: [['New order', 'Новый заказ', 'Нове замовлення'], ['Paid', 'Оплачен', 'Оплачено'], ['Packed', 'Собран', 'Зібрано'], ['Delivered', 'Доставлен', 'Доставлено']],
      deals: [['#4821 Liam H.', 96, 0, ['send cart reminder', 'напомнить о корзине', 'нагадати про кошик']], ['#4819 Ava S.', 74, 1, ['add refill offer', 'предложить refill', 'запропонувати refill']], ['#4815 Hotel Mira', 4800, 0, ['samples by Fri', 'пробники к пт', 'пробники до пт']], ['#4812 Grace P.', 58, 2, ['hand to courier', 'передать курьеру', 'передати кур’єру']], ['#4808 Chloe R.', 142, 3, ['replacement sent', 'замена отправлена', 'заміну надіслано']], ['#4806 Noah B.', 29, 3, ['ask for review', 'попросить отзыв', 'попросити відгук']], ['#4803 Mila D.', 116, 2, ['gift wrap', 'подарочная упаковка', 'подарункове пакування']]],
      team: [['Alex', 'owner'], ['Nina', 'manager'], ['Tom', 'admin'], ['Eva', 'marketer'], ['Leo', 'spec']],
      log: [['Tom', ['packed 18 orders', 'собрал 18 заказов', 'зібрав 18 замовлень'], '11:05'], ['AI', ['answered 37 chats, 4 sales', 'ответил в 37 чатах, 4 продажи', 'відповів у 37 чатах, 4 продажі'], '10:30'], ['Eva', ['launched the gift guide ad', 'запустила рекламу подарков', 'запустила рекламу подарунків'], '10:02'], ['Nina', ['ordered 120 Fig & Cedar', 'заказала 120 Fig & Cedar', 'замовила 120 Fig & Cedar'], '09:40']],
      tips: {
        owner: [['Approve the reorder of 120 “Fig & Cedar” — sells out in 6 days.', 'Одобрить дозаказ 120 «Fig & Cedar» — закончится через 6 дней.', 'Схвалити дозамовлення 120 «Fig & Cedar» — закінчиться за 6 днів.'], ['Hotel Mira wholesale ($4,800) — AI prepared a quote, check and send.', 'Опт для Hotel Mira ($4 800) — ИИ подготовил расчёт, проверьте и отправьте.', 'Гурт для Hotel Mira ($4 800) — ШІ підготував розрахунок, перевірте й надішліть.'], ['Turn on cart reminders — ≈ +$1,400/week.', 'Включить напоминания о корзине — ≈ +$1 400 в неделю.', 'Увімкнути нагадування про кошик — ≈ +$1 400 на тиждень.']],
        manager: [['7 orders delayed by courier — AI drafted apologies with a 10% code.', '7 заказов задерживает курьер — ИИ написал извинения с кодом −10%.', '7 замовлень затримує кур’єр — ШІ написав вибачення з кодом −10%.'], ['Stock check: 3 items below 20 pcs.', 'Склад: 3 товара меньше 20 шт.', 'Склад: 3 товари менше 20 шт.']],
        admin: [['Pack 14 orders — 3 with gift wrap.', 'Собрать 14 заказов — 3 с подарочной упаковкой.', 'Зібрати 14 замовлень — 3 з подарунковим пакуванням.'], ['Chloe R. — send the replacement bottle today.', 'Хлоя Р. — сегодня отправить новый флакон.', 'Хлоя Р. — сьогодні надіслати новий флакон.']],
        marketer: [['Gift guide post waits for approval — ask the owner.', 'Пост «Подарки до $100» ждёт одобрения — напомнить владельцу.', 'Пост «Подарунки до $100» чекає схвалення — нагадати власнику.'], ['Pause 5 weak TikTok videos, keep the 2 best.', 'Остановить 5 слабых роликов TikTok, оставить 2 лучших.', 'Зупинити 5 слабких роликів TikTok, залишити 2 найкращі.']],
        spec: [['Pour 60 Fig & Cedar candles — the reorder is approved.', 'Залить 60 свечей Fig & Cedar — дозаказ одобрен.', 'Залити 60 свічок Fig & Cedar — дозамовлення схвалене.'], ['Label 20 refill pouches.', 'Наклеить этикетки на 20 refill.', 'Наклеїти етикетки на 20 refill.']],
      },
      rev: [31, 34, 30, 36, 39, 37, 42, 40, 45, 48, 44, 50, 53, 49, 55, 58, 61, 57, 63, 66, 62, 69, 72, 68, 74, 78, 75, 81, 84, 88],
    },
    biz: {
      brand: 'Pipeline Studio', who: 'agency',
      items: [['site', 'Website + online booking, from $1,500'], ['crm', 'Custom CRM with AI, from $2,000'], ['ads', 'Ads management, from $400/month'], ['smm', 'Social media, from $350/month'], ['brand', 'Logo & brand identity, from $600'], ['call', 'Free 20-min strategy call']],
      kpi: [[['Revenue, month', 'Выручка за месяц', 'Виручка за місяць'], '$23,100', '+21%'], [['Deals in work', 'Сделок в работе', 'Угод у роботі'], '17', '+4'], [['Win rate', 'Конверсия в продажу', 'Конверсія в продаж'], '31%', '+7 pp'], [['Chats by AI', 'Чатов закрыл ИИ', 'Чатів закрив ШІ'], '72%', '+15 pp'], [['Rating', 'Рейтинг', 'Рейтинг'], '5.0', '—'], [['Ad return', 'Окупаемость рекламы', 'Окупність реклами'], '6.4×', '+1.9×']],
      health: [['good', ['$61,200 in the pipeline, 17 deals', '$61 200 в воронке, 17 сделок', '$61 200 у воронці, 17 угод']], ['good', ['LinkedIn leads +40% this month', 'Заявки из LinkedIn +40% за месяц', 'Заявки з LinkedIn +40% за місяць']], ['warn', ['2 clients waiting for a reply > 4 h', '2 клиента ждут ответа больше 4 ч', '2 клієнти чекають відповіді понад 4 год']], ['good', ['Team load 78% — healthy', 'Загрузка команды 78% — норма', 'Завантаження команди 78% — норма']]],
      brief: [['Nordic Bakery hasn’t answered the proposal for 5 days — AI drafted a soft follow-up.', 'Nordic Bakery 5 дней молчит после КП — ИИ написал мягкое напоминание.', 'Nordic Bakery 5 днів мовчить після КП — ШІ написав м’яке нагадування.'], ['Bloom Florist paid — AI prepared the kick-off plan and the client cabinet.', 'Bloom Florist оплатил — ИИ подготовил план старта и кабинет клиента.', 'Bloom Florist оплатив — ШІ підготував план старту й кабінет клієнта.'], ['3 past clients are a fit for an upsell (ads) — ≈ +$1,200/month.', '3 бывших клиента подходят для допродажи рекламы — ≈ +$1 200 в месяц.', '3 колишні клієнти підходять для допродажу реклами — ≈ +$1 200 на місяць.']],
      feed: [['💬', ['AI qualified a lead from LinkedIn: dental clinic, budget $3k', 'ИИ квалифицировал заявку из LinkedIn: стоматология, бюджет $3k', 'ШІ кваліфікував заявку з LinkedIn: стоматологія, бюджет $3k']], ['📄', ['Proposal opened by Hello Dental (2nd time)', 'Hello Dental открыл КП (второй раз)', 'Hello Dental відкрив КП (вдруге)']], ['💳', ['Invoice paid — Bloom Florist, $2,400', 'Счёт оплачен — Bloom Florist, $2 400', 'Рахунок оплачено — Bloom Florist, $2 400']], ['📅', ['Call booked by AI: Atlas Garage, Thu 15:00', 'ИИ назначил созвон: Atlas Garage, чт 15:00', 'ШІ призначив дзвінок: Atlas Garage, чт 15:00']], ['⭐', ['Google review 5★ — AI replied', 'Отзыв 5★ в Google — ИИ ответил', 'Відгук 5★ у Google — ШІ відповів']], ['✅', ['Task done: Pixel Gym landing — sent for review', 'Задача готова: лендинг Pixel Gym — отправлен на проверку', 'Задачу виконано: лендинг Pixel Gym — надіслано на перевірку']]],
      chats: [
        { n: 'Hello Dental', ch: 'site', s: 'ai', v: '$3,000', m: [['c', ['We need a new site with online booking, how much?', 'Нужен новый сайт с онлайн-записью, сколько стоит?', 'Потрібен новий сайт з онлайн-записом, скільки коштує?']], ['a', ['A site with booking starts at $1,500; with a CRM and AI chat — around $3,000. How many doctors and do you take prepayments?', 'Сайт с записью — от $1 500; вместе с CRM и ИИ-чатом — около $3 000. Сколько у вас врачей и берёте ли предоплату?', 'Сайт із записом — від $1 500; разом із CRM і ШІ-чатом — близько $3 000. Скільки у вас лікарів і чи берете передоплату?']], ['c', ['4 doctors, yes prepayment', '4 врача, предоплата да', '4 лікарі, передоплата так']], ['a', ['Great — I booked a 20-min call with our lead on Thu 15:00 and sent a short brief. 🙌', 'Отлично — записала вас на 20-минутный созвон с руководителем в чт 15:00 и отправила короткий бриф. 🙌', 'Чудово — записала вас на 20-хвилинний дзвінок із керівником у чт 15:00 і надіслала короткий бриф. 🙌']]], sum: ['Qualified: 4 doctors, prepayment, ~$3,000. Call Thu 15:00.', 'Квалифицирован: 4 врача, предоплата, ~$3 000. Созвон чт 15:00.', 'Кваліфіковано: 4 лікарі, передоплата, ~$3 000. Дзвінок чт 15:00.'] },
        { n: 'Nordic Bakery', ch: 'mail', s: 'need', v: '$4,200', m: [['c', ['The price is a bit high for us, can you do it cheaper?', 'Для нас дороговато, можно дешевле?', 'Для нас дорогувато, можна дешевше?']], ['a', ['I understand. I can’t change prices myself — I’ve passed this to the owner, who will offer options today.', 'Понимаю. Цены сама менять не могу — передала владельцу, он сегодня предложит варианты.', 'Розумію. Ціни сама змінювати не можу — передала власнику, він сьогодні запропонує варіанти.']]], sum: ['Price objection. AI does not give discounts — waiting for the owner.', 'Возражение по цене. ИИ скидки не даёт — ждёт владельца.', 'Заперечення щодо ціни. ШІ знижок не дає — чекає власника.'] },
        { n: 'Atlas Garage', ch: 'wa', s: 'ai', v: '$1,800', m: [['c', ['Can you run our Google ads?', 'Можете вести нашу рекламу в Google?', 'Можете вести нашу рекламу в Google?']], ['a', ['Yes! Ads management is from $400/month plus a one-time setup. What’s your monthly ad budget?', 'Да! Ведение рекламы — от $400 в месяц плюс разовая настройка. Какой у вас бюджет на рекламу в месяц?', 'Так! Ведення реклами — від $400 на місяць плюс разове налаштування. Який у вас бюджет на рекламу на місяць?']]], sum: ['Ads lead, asking about budget.', 'Заявка на рекламу, уточняет бюджет.', 'Заявка на рекламу, уточнює бюджет.'] },
        { n: 'Bloom Florist', ch: 'tg', s: 'owner', v: '$2,400', m: [['c', ['Paid! When do we start?', 'Оплатили! Когда стартуем?', 'Оплатили! Коли стартуємо?']], ['o', ['Thank you! Kick-off on Monday 10:00 — the plan and your client cabinet are already in your email.', 'Спасибо! Старт в понедельник в 10:00 — план и ваш кабинет клиента уже на почте.', 'Дякуємо! Старт у понеділок о 10:00 — план і ваш кабінет клієнта вже на пошті.']]], sum: ['Paid client, kick-off Monday.', 'Оплативший клиент, старт в понедельник.', 'Клієнт оплатив, старт у понеділок.'] },
        { n: 'Pixel Gym', ch: 'ig', s: 'done', v: '$1,500', m: [['c', ['Got the landing, looks amazing 🔥', 'Получили лендинг, выглядит супер 🔥', 'Отримали лендинг, виглядає супер 🔥']], ['a', ['So happy you like it! Would you mind leaving a short Google review? It helps us a lot 🙏', 'Очень рады! Оставите короткий отзыв в Google? Нам это очень помогает 🙏', 'Дуже раді! Залишите короткий відгук у Google? Нам це дуже допомагає 🙏']]], sum: ['Project delivered, review requested.', 'Проект сдан, попросили отзыв.', 'Проєкт здано, попросили відгук.'] },
      ],
      reviews: [[5, 'gg', 'Pixel Gym', ['Landing in 9 days and the leads started right away.', 'Лендинг за 9 дней, и заявки пошли сразу.', 'Лендинг за 9 днів, і заявки пішли одразу.'], ['Thank you! It was a pleasure — let’s grow those leads together 💪', 'Спасибо! Было приятно работать — дальше растим заявки вместе 💪', 'Дякуємо! Було приємно працювати — далі ростимо заявки разом 💪'], 1], [5, 'gg', 'Bloom Florist', ['Clear process, everything visible in the client cabinet.', 'Понятный процесс, всё видно в кабинете клиента.', 'Зрозумілий процес, усе видно в кабінеті клієнта.'], ['Thank you! Transparency is our favourite feature too 🌸', 'Спасибо! Прозрачность — наша любимая функция тоже 🌸', 'Дякуємо! Прозорість — і наша улюблена функція 🌸'], 2], [3, 'site', 'Kora Studio', ['Good result, but one revision took a week.', 'Результат хороший, но одна правка заняла неделю.', 'Результат добрий, але одна правка зайняла тиждень.'], ['Kora, thank you for the honesty — that’s too long. We now commit to 48 h per revision, and it’s in your cabinet.', 'Kora, спасибо за честность — это слишком долго. Теперь правка — максимум 48 ч, это закреплено в вашем кабинете.', 'Kora, дякуємо за чесність — це надто довго. Тепер правка — максимум 48 год, це закріплено у вашому кабінеті.'], 3]],
      rating: '5.0', rcount: 12,
      chan: [['LinkedIn', 300, 21, 6, 8.2], ['Google Search', 600, 18, 5, 6.1], ['Meta Ads', 500, 14, 3, 3.4], [['Referrals', 'Рекомендации', 'Рекомендації'], 0, 9, 5, 0], [['Partners', 'Партнёры', 'Партнери'], 240, 7, 3, 7.5]],
      mkRecs: [['LinkedIn brings the best clients — AI wrote 20 personal messages to clinic owners. Send?', 'LinkedIn даёт лучших клиентов — ИИ написал 20 личных сообщений владельцам клиник. Отправить?', 'LinkedIn дає найкращих клієнтів — ШІ написав 20 особистих повідомлень власникам клінік. Надіслати?'], ['Meta Ads return 3.4× — switch to retargeting site visitors only.', 'Meta Ads окупается в 3,4 раза — оставить только ретаргетинг на посетителей сайта.', 'Meta Ads окупається в 3,4 раза — залишити лише ретаргетинг на відвідувачів сайту.']],
      posts: [['in', ['Case: +38% bookings for a clinic', 'Кейс: +38% записей для клиники', 'Кейс: +38% записів для клініки'], 'pub'], ['ig', ['How we build a site in 9 days', 'Как мы делаем сайт за 9 дней', 'Як ми робимо сайт за 9 днів'], 'pub'], ['in', ['3 signs your CRM is costing you money', '3 признака, что CRM теряет ваши деньги', '3 ознаки, що CRM втрачає ваші гроші'], 'wait'], ['tt', ['Before/after: Pixel Gym', 'До/после: Pixel Gym', 'До/після: Pixel Gym'], 'plan'], ['in', ['AI manager: a week of real chats', 'ИИ-менеджер: неделя реальных чатов', 'ШІ-менеджер: тиждень реальних чатів'], 'ai'], ['ig', ['Team behind the scenes', 'Команда за кулисами', 'Команда за лаштунками'], 'ai'], ['in', ['Client review: Bloom', 'Отзыв клиента: Bloom', 'Відгук клієнта: Bloom'], 'plan']],
      kit: { colors: ['#3B4FD6', '#E4A93F', '#16181D', '#F3F2EF'], fonts: 'Inter Tight · Inter', voice: ['Direct, friendly, numbers instead of promises.', 'Прямо, дружелюбно, цифры вместо обещаний.', 'Прямо, дружньо, цифри замість обіцянок.'] },
      stages: [['New lead', 'Новая заявка', 'Нова заявка'], ['Brief', 'Бриф', 'Бриф'], ['Proposal', 'КП отправлено', 'КП надіслано'], ['In work', 'В работе', 'У роботі'], ['Paid', 'Оплачено', 'Оплачено']],
      deals: [['Atlas Garage', 1800, 0, ['ask budget', 'уточнить бюджет', 'уточнити бюджет']], ['Hello Dental', 3000, 1, ['call Thu 15:00', 'созвон чт 15:00', 'дзвінок чт 15:00']], ['Nordic Bakery', 4200, 2, ['soft follow-up', 'мягкое напоминание', 'м’яке нагадування']], ['Kora Studio', 1900, 3, ['revision in 48 h', 'правка за 48 ч', 'правка за 48 год']], ['Pixel Gym', 1500, 4, ['ask for referral', 'попросить рекомендацию', 'попросити рекомендацію']], ['Bloom Florist', 2400, 4, ['kick-off Mon', 'старт в пн', 'старт у пн']]],
      team: [['Alex', 'owner'], ['Kate', 'manager'], ['Ivan', 'admin'], ['Mia', 'marketer'], ['Leo', 'spec']],
      log: [['Kate', ['sent the proposal to Hello Dental', 'отправила КП Hello Dental', 'надіслала КП Hello Dental'], '11:20'], ['AI', ['qualified 6 leads, booked 2 calls', 'квалифицировал 6 заявок, назначил 2 созвона', 'кваліфікував 6 заявок, призначив 2 дзвінки'], '10:45'], ['Leo', ['finished Pixel Gym landing', 'закончил лендинг Pixel Gym', 'закінчив лендинг Pixel Gym'], '10:10'], ['Mia', ['scheduled 4 LinkedIn posts', 'запланировала 4 поста в LinkedIn', 'запланувала 4 пости в LinkedIn'], '09:35']],
      tips: {
        owner: [['Answer Nordic Bakery ($4,200): AI suggests a smaller first stage instead of a discount.', 'Ответить Nordic Bakery ($4 200): ИИ предлагает меньший первый этап вместо скидки.', 'Відповісти Nordic Bakery ($4 200): ШІ пропонує менший перший етап замість знижки.'], ['Send 20 LinkedIn messages to clinic owners — AI wrote them.', 'Отправить 20 сообщений в LinkedIn владельцам клиник — ИИ их написал.', 'Надіслати 20 повідомлень у LinkedIn власникам клінік — ШІ їх написав.'], ['Offer ads to 3 past clients — ≈ +$1,200/month.', 'Предложить рекламу 3 бывшим клиентам — ≈ +$1 200 в месяц.', 'Запропонувати рекламу 3 колишнім клієнтам — ≈ +$1 200 на місяць.']],
        manager: [['2 clients wait > 4 h — reassign to Ivan.', '2 клиента ждут больше 4 ч — передать Ивану.', '2 клієнти чекають понад 4 год — передати Івану.'], ['Prepare Thu call with Hello Dental — AI made a one-page brief.', 'Подготовиться к созвону с Hello Dental в чт — ИИ сделал бриф на страницу.', 'Підготуватися до дзвінка з Hello Dental у чт — ШІ зробив бриф на сторінку.']],
        admin: [['Send the contract to Bloom Florist for e-signature.', 'Отправить договор Bloom Florist на электронную подпись.', 'Надіслати договір Bloom Florist на електронний підпис.'], ['Invoice Kora Studio for stage 2.', 'Выставить счёт Kora Studio за 2-й этап.', 'Виставити рахунок Kora Studio за 2-й етап.']],
        marketer: [['Post “3 signs your CRM costs you money” — waiting for approval.', 'Пост «3 признака, что CRM теряет деньги» ждёт одобрения.', 'Пост «3 ознаки, що CRM втрачає гроші» чекає схвалення.'], ['Turn the Pixel Gym case into a carousel — AI drafted 7 slides.', 'Сделать карусель из кейса Pixel Gym — ИИ набросал 7 слайдов.', 'Зробити карусель із кейсу Pixel Gym — ШІ накидав 7 слайдів.']],
        spec: [['Kora Studio revision — due in 48 h, 3 small fixes.', 'Правка Kora Studio — срок 48 ч, 3 мелочи.', 'Правка Kora Studio — термін 48 год, 3 дрібниці.'], ['Bloom Florist kick-off: AI prepared the task list.', 'Старт Bloom Florist: ИИ подготовил список задач.', 'Старт Bloom Florist: ШІ підготував список задач.']],
      },
      rev: [12, 14, 13, 15, 16, 15, 17, 18, 17, 19, 18, 20, 21, 19, 22, 21, 23, 22, 24, 23, 25, 24, 26, 25, 27, 26, 28, 27, 29, 31],
    },
  };

  // ---------- styles ----------
  const CSS = `
.vos{--a:#3b4fd6;--a2:#e4a93f;--o-bg:#f4f4f1;--o-card:#fff;--o-ink:#15171c;--o-mut:#6b7079;--o-line:#e6e5e0;--o-side:#0f1115;--o-ok:#1f9d6b;--o-warn:#e0942b;--o-bad:#e05656;
  font:14.5px/1.5 'Manrope','Inter',system-ui,-apple-system,sans-serif;color:var(--o-ink);display:grid;grid-template-columns:232px 1fr;min-height:760px;background:var(--o-bg);border-radius:24px;overflow:hidden;border:1px solid var(--o-line);box-shadow:0 40px 80px -50px rgba(0,0,0,.45);text-align:left}
.vos *{box-sizing:border-box}.vos button,.vos input,.vos select,.vos textarea{font:inherit;color:inherit}.vos button{cursor:pointer}
.vos h2,.vos h3,.vos h4{font-family:inherit;letter-spacing:-.01em}
.vos .side{background:var(--o-side);color:#c8ccd4;padding:18px 12px;display:flex;flex-direction:column;gap:4px;position:relative;overflow:hidden}
.vos .side::before{content:"";position:absolute;inset:auto -60px -80px -60px;height:260px;background:radial-gradient(closest-side,color-mix(in srgb,var(--a) 55%,transparent),transparent);opacity:.55;pointer-events:none}
.vos .brand{display:flex;align-items:center;gap:10px;padding:4px 8px 16px;color:#fff;font-weight:700;font-size:15px}
.vos .brand i{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,var(--a),var(--a2));display:grid;place-items:center;font-style:normal;font-size:15px}
.vos .brand small{display:block;font-weight:500;color:#8b919c;font-size:11.5px}
.vos .nav{display:flex;flex-direction:column;gap:2px;position:relative}
.vos .nav button{display:flex;align-items:center;gap:10px;background:none;border:0;color:#aeb4be;padding:9px 10px;border-radius:10px;text-align:left;font-weight:600;font-size:13.5px;transition:.2s}
.vos .nav button:hover{background:#1b1e25;color:#fff}
.vos .nav button[aria-current=true]{background:linear-gradient(90deg,color-mix(in srgb,var(--a) 70%,#000),color-mix(in srgb,var(--a) 25%,transparent));color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
.vos .nav svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.vos .nav .cnt{margin-left:auto;background:var(--o-bad);color:#fff;border-radius:99px;font-size:11px;padding:0 7px;line-height:18px}
.vos .viewas{margin-top:auto;position:relative;background:#1b1e25;border-radius:14px;padding:10px}
.vos .viewas label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8b919c;display:block;margin-bottom:6px}
.vos .viewas select{width:100%;background:#0f1115;border:1px solid #2a2e37;border-radius:9px;padding:7px 8px;color:#fff}
.vos .main{padding:24px 26px 30px;min-width:0;overflow:hidden}
.vos .head{display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:18px}
.vos .head h2{margin:0;font-size:26px;line-height:1.15}.vos .head p{margin:4px 0 0;color:var(--o-mut)}
.vos .asb{background:color-mix(in srgb,var(--a2) 18%,#fff);border:1px solid color-mix(in srgb,var(--a2) 45%,#fff);border-radius:12px;padding:8px 12px;font-size:13px;margin-bottom:14px}
.vos .g{display:grid;gap:14px}.vos .g2{grid-template-columns:1fr 1fr}.vos .g3{grid-template-columns:repeat(3,1fr)}.vos .g4{grid-template-columns:repeat(4,1fr)}.vos .g6{grid-template-columns:repeat(6,1fr)}.vos .g21{grid-template-columns:1.6fr 1fr}
.vos .c{background:var(--o-card);border:1px solid var(--o-line);border-radius:18px;padding:16px;min-width:0}
.vos .c h3{margin:0 0 10px;font-size:15px}
.vos .kpi small{color:var(--o-mut);font-size:12.5px;display:block}.vos .kpi b{font-size:24px;display:block;letter-spacing:-.02em;margin-top:2px}.vos .kpi em{font-style:normal;font-size:12px;font-weight:700;color:var(--o-ok)}
.vos .kpi svg{width:100%;height:26px;margin-top:6px}
.vos .lock{filter:blur(6px);user-select:none}
.vos .area{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:14px;background:var(--o-bg)}
.vos .dot{width:10px;height:10px;border-radius:50%;flex:none;margin-top:5px;box-shadow:0 0 0 4px color-mix(in srgb,currentColor 18%,transparent);background:currentColor}
.vos .good,.vos .dot.good{color:var(--o-ok)}.vos .warn,.vos .dot.warn{color:var(--o-warn)}.vos .bad,.vos .dot.bad{color:var(--o-bad)}
.vos .area b{display:block;font-size:13px;color:var(--o-ink)}.vos .area span{font-size:13px;color:var(--o-mut)}
.vos .aic{background:linear-gradient(135deg,color-mix(in srgb,var(--a) 92%,#000),color-mix(in srgb,var(--a) 55%,var(--a2)));color:#fff;border:0}
.vos .aic h3{color:#fff}
.vos .act{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid rgba(255,255,255,.16)}
.vos .act:first-of-type{border-top:0}.vos .act p{margin:0;flex:1;font-size:13.5px}
.vos .bt{border:0;border-radius:99px;padding:7px 14px;font-weight:700;font-size:13px;background:var(--o-ink);color:#fff;white-space:nowrap;transition:.2s}
.vos .bt:hover{transform:translateY(-1px)}.vos .bt.w{background:#fff;color:var(--o-ink)}.vos .bt.g{background:var(--o-bg);color:var(--o-ink);border:1px solid var(--o-line)}.vos .bt.a{background:var(--a);color:#fff}
.vos .bt[disabled]{opacity:.55;cursor:default;transform:none}
.vos .feed{display:flex;flex-direction:column;gap:2px;max-height:300px;overflow:hidden}
.vos .fi{display:flex;gap:10px;align-items:center;padding:8px 6px;border-radius:10px;font-size:13.5px;animation:vosIn .5s}
.vos .fi span{font-size:17px}.vos .fi time{margin-left:auto;color:var(--o-mut);font-size:12px;white-space:nowrap}
@keyframes vosIn{from{opacity:0;transform:translateY(-8px);background:color-mix(in srgb,var(--a) 10%,#fff)}to{opacity:1}}
.vos .live{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--o-ok);font-weight:700}.vos .live::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;animation:vosP 1.6s infinite}
@keyframes vosP{50%{opacity:.25}}
.vos .chart{width:100%;height:170px}
.vos .strip{background:var(--o-card);border:1px solid var(--o-line);border-radius:14px;padding:10px 14px;font-size:13.5px;margin-bottom:12px}
.vos .chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.vos .chip{border:1px solid var(--o-line);background:var(--o-card);border-radius:99px;padding:5px 12px;font-size:13px;font-weight:600}
.vos .chip[aria-pressed=true]{background:var(--o-ink);color:#fff;border-color:var(--o-ink)}
.vos .inbox{display:grid;grid-template-columns:300px 1fr;background:var(--o-card);border:1px solid var(--o-line);border-radius:18px;overflow:hidden;height:560px}
.vos .list{border-right:1px solid var(--o-line);overflow:auto}
.vos .cv{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--o-line);cursor:pointer;width:100%;text-align:left;background:none;border-left:0;border-right:0;border-top:0}
.vos .cv[aria-current=true]{background:color-mix(in srgb,var(--a) 8%,#fff)}
.vos .av{width:38px;height:38px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:700;color:#fff;position:relative;font-size:14px}
.vos .av i{position:absolute;right:-3px;bottom:-3px;width:17px;height:17px;border-radius:50%;border:2px solid #fff;font-style:normal;font-size:9px;display:grid;place-items:center;color:#fff}
.vos .cv b{font-size:13.5px;display:flex;gap:6px;align-items:center}.vos .cv p{margin:2px 0 0;font-size:12.5px;color:var(--o-mut);display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.vos .pill{font-size:10.5px;font-weight:700;border-radius:99px;padding:1px 7px;white-space:nowrap}
.vos .p-ai{background:#e3f5ec;color:#16784f}.vos .p-need{background:#fde6e6;color:#c03b3b}.vos .p-owner{background:color-mix(in srgb,var(--a) 14%,#fff);color:var(--a)}.vos .p-done{background:#eceae5;color:#77736b}
.vos .p-pub{background:#e3f5ec;color:#16784f}.vos .p-wait{background:#fff1dc;color:#a8660f}.vos .p-plan{background:#e8ecfb;color:#3747b5}
.vos .conv{display:flex;flex-direction:column;min-width:0}
.vos .ch{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--o-line);flex-wrap:wrap}
.vos .ch b{font-size:15px}.vos .ch small{color:var(--o-mut)}
.vos .tg{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-left:auto}
.vos .sw{position:relative;width:38px;height:22px;border-radius:99px;border:0;background:#cfd2d8;flex:none;transition:.2s}
.vos .sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.2s}
.vos .sw[aria-pressed=true]{background:var(--o-ok)}.vos .sw[aria-pressed=true]::after{left:19px}
.vos .sumx{margin:10px 16px 0;background:color-mix(in srgb,var(--a) 8%,#fff);border-radius:12px;padding:8px 12px;font-size:13px}
.vos .msgs{flex:1;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.vos .m{max-width:78%;padding:9px 13px;border-radius:16px;font-size:14px;line-height:1.45}
.vos .m small{display:block;font-size:11px;font-weight:700;opacity:.75;margin-bottom:2px}
.vos .m.c{background:var(--o-bg);align-self:flex-start;border-bottom-left-radius:5px}
.vos .m.a{background:linear-gradient(135deg,var(--a),color-mix(in srgb,var(--a) 70%,var(--a2)));color:#fff;align-self:flex-end;border-bottom-right-radius:5px}
.vos .m.o{background:var(--o-ink);color:#fff;align-self:flex-end;border-bottom-right-radius:5px}
.vos .m.sys{align-self:center;background:none;color:var(--o-mut);font-size:12px;padding:2px}
.vos .typing{align-self:flex-end;display:flex;gap:4px;padding:12px 14px;background:color-mix(in srgb,var(--a) 15%,#fff);border-radius:16px}.vos .typing i{width:6px;height:6px;border-radius:50%;background:var(--a);animation:vosP 1s infinite}.vos .typing i:nth-child(2){animation-delay:.2s}.vos .typing i:nth-child(3){animation-delay:.4s}
.vos .comp{border-top:1px solid var(--o-line);padding:10px 12px}
.vos .seg{display:inline-flex;background:var(--o-bg);border-radius:99px;padding:3px;margin-bottom:8px;gap:2px;flex-wrap:wrap}.vos .seg button{border:0;background:none;border-radius:99px;padding:5px 11px;font-size:12.5px;font-weight:600;color:var(--o-mut)}.vos .seg button[aria-pressed=true]{background:#fff;color:var(--o-ink);box-shadow:0 1px 4px rgba(0,0,0,.08)}
.vos .row{display:flex;gap:8px}.vos .row input,.vos .row textarea,.vos .in{flex:1;min-width:0;border:1px solid var(--o-line);border-radius:12px;padding:9px 12px;background:#fff}
.vos .rv{display:flex;flex-direction:column;gap:8px}
.vos .rv .top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.vos .stars{color:#f0a500;letter-spacing:1px}
.vos .rv .q{margin:0}.vos .rv .ans{background:var(--o-bg);border-radius:12px;padding:10px 12px;font-size:13.5px;border-left:3px solid var(--a)}
.vos .rv .ans small{display:block;font-weight:700;font-size:11.5px;color:var(--a);margin-bottom:3px}
.vos .rv.neg{border-color:color-mix(in srgb,var(--o-bad) 40%,#fff)}.vos .flag{font-size:12.5px;font-weight:700;color:var(--o-bad)}
.vos table{width:100%;border-collapse:collapse;font-size:13.5px}.vos th{text-align:left;color:var(--o-mut);font-weight:600;font-size:12px;padding:6px 8px;border-bottom:1px solid var(--o-line)}.vos td{padding:9px 8px;border-bottom:1px solid var(--o-line)}
.vos .roas{font-weight:700}.vos .bar{height:6px;border-radius:9px;background:var(--o-bg);overflow:hidden;margin-top:4px}.vos .bar i{display:block;height:100%;background:linear-gradient(90deg,var(--a),var(--a2))}
.vos .donut{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.vos .donut svg{width:130px;height:130px}.vos .lg{display:flex;flex-direction:column;gap:5px;font-size:13px}.vos .lg span{display:flex;gap:7px;align-items:center}.vos .lg i{width:10px;height:10px;border-radius:3px}
.vos .cal{display:grid;grid-template-columns:repeat(7,minmax(118px,1fr));gap:8px;overflow-x:auto;padding-bottom:4px}
.vos .post{background:var(--o-card);border:1px solid var(--o-line);border-radius:14px;overflow:hidden;font-size:12.5px}
.vos .post .ph{height:76px;position:relative;display:flex;align-items:flex-end;padding:6px 8px;color:#fff;font-weight:700;font-size:11px}
.vos .post .bd{padding:8px}.vos .post b{display:block;font-size:12.5px;line-height:1.3;margin-bottom:6px}
.vos .sw8{display:flex;gap:8px}.vos .sw8 i{width:44px;height:44px;border-radius:12px;border:1px solid rgba(0,0,0,.08)}
.vos .kan{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(190px,1fr);gap:10px;overflow-x:auto;padding-bottom:6px}
.vos .col{background:color-mix(in srgb,var(--o-line) 55%,var(--o-bg));border-radius:14px;padding:8px;min-height:260px}
.vos .col h4{margin:2px 4px 8px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--o-mut);display:flex;justify-content:space-between}
.vos .deal{background:#fff;border:1px solid var(--o-line);border-radius:11px;padding:9px 11px;margin-bottom:7px;cursor:grab;font-size:13.5px}
.vos .deal.sel{outline:2px solid var(--a)}.vos .deal b{display:block}.vos .deal small{color:var(--a);font-weight:600;font-size:12px}
.vos .col.over{outline:2px dashed var(--a)}
.vos .mem{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--o-line)}.vos .mem:last-child{border:0}
.vos .mem select{margin-left:auto;border:1px solid var(--o-line);border-radius:9px;padding:5px 8px;background:#fff;font-size:13px}
.vos .perm td,.vos .perm th{text-align:center;padding:6px 4px}.vos .perm td:first-child,.vos .perm th:first-child{text-align:left}
.vos .perm input{width:17px;height:17px;accent-color:var(--a)}
.vos .who{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.vos .who button{display:flex;gap:8px;align-items:center;border:1px solid var(--o-line);background:#fff;border-radius:99px;padding:4px 12px 4px 4px;font-weight:600;font-size:13px}
.vos .who button[aria-pressed=true]{border-color:var(--a);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 20%,transparent)}
.vos .who .av{width:28px;height:28px;font-size:12px}
.vos .tip{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid var(--o-line);border-radius:14px;background:#fff}
.vos .tip p{margin:0;flex:1}.vos .tip.ok{background:#eef8f2;border-color:#cdebd9}
.vos .ans2:empty{display:none}.vos .ans2{background:var(--o-bg);border-radius:14px;padding:12px 14px;margin-top:10px;white-space:pre-wrap;min-height:20px}
.vos .toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:var(--o-ink);color:#fff;padding:10px 18px;border-radius:99px;z-index:999;opacity:0;transition:.3s;pointer-events:none;font-size:14px}
.vos .toast.on{opacity:1;transform:translateX(-50%)}
.vos .back{display:none}
@media(max-width:980px){.vos .g4,.vos .g6{grid-template-columns:repeat(2,1fr)}.vos .g21,.vos .g2,.vos .g3{grid-template-columns:1fr}}
@media(max-width:760px){
  .vos{grid-template-columns:1fr;border-radius:18px;min-height:0}
  .vos .side{padding:10px;flex-direction:row;align-items:center;gap:8px;overflow-x:auto}
  .vos .side::before{display:none}.vos .brand{padding:0 6px 0 0}.vos .brand small{display:none}
  .vos .nav{flex-direction:row}.vos .nav button{white-space:nowrap;padding:8px 10px}
  .vos .viewas{margin:0;padding:6px 8px;flex:none}.vos .viewas label{display:none}
  .vos .main{padding:16px 14px 22px}.vos .head h2{font-size:21px}
  .vos .inbox{grid-template-columns:1fr;height:600px}.vos .inbox .conv{display:none}.vos .inbox.open .list{display:none}.vos .inbox.open .conv{display:flex}.vos .back{display:inline-flex}
  .vos .m{max-width:90%}
}`;

  // ---------- helpers ----------
  const COL = ['#e0795b', '#3b82c4', '#7a5cc7', '#1f9d6b', '#d4a02a', '#c4517a', '#3aa3a0'];
  const chColor = { ig: '#d6249f', wa: '#25d366', tg: '#229ed9', site: '#15171c', fb: '#1877f2', gg: '#ea4335', tt: '#111', mail: '#6b7079', in: '#0a66c2' };
  const chIcon = { ig: '◎', wa: '✆', tg: '➤', site: '◐', fb: 'f', gg: 'G', tt: '♪', mail: '@', in: 'in' };
  const chName = (k) => (k === 'in' ? 'LinkedIn' : t(U.ch[k]));
  const av = (name, i, ch) => `<span class="av" style="background:${COL[i % COL.length]}">${esc(name[0])}${ch ? `<i style="background:${chColor[ch]}">${chIcon[ch]}</i>` : ''}</span>`;
  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const fill = (s, m) => s.replace(/\{(\w)\}/g, (_, k) => m[k]);
  function spark(arr, color) {
    const w = 120, h = 26, max = Math.max(...arr), min = Math.min(...arr);
    const p = arr.map((v, i) => `${(i / (arr.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${p}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  function area(arr) {
    const w = 600, h = 170, max = Math.max(...arr) * 1.1;
    const pts = arr.map((v, i) => [(i / (arr.length - 1)) * w, h - (v / max) * h]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="vosg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--a)" stop-opacity=".35"/><stop offset="1" stop-color="var(--a)" stop-opacity="0"/></linearGradient></defs><path d="${d} L${w} ${h} L0 ${h}Z" fill="url(#vosg)"/><path d="${d}" fill="none" stroke="var(--a)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
  }
  function toast(msg) {
    const el = root.querySelector('.toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2400);
  }
  async function ai(body) {
    const r = await fetch('/api/demo/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: o.lang, brand: D().brand, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) throw new Error('ai');
    return j;
  }
  const D = () => N[st.niche];
  const allowed = (sec) => st.perm[st.role].includes(sec);
  const seesMoney = () => st.money[st.role];

  // ---------- sections ----------
  function vOverview() {
    const d = D(), money = seesMoney();
    const k = d.kpi.map((x, i) => {
      const isMoney = i === 0 || i === 5;
      const series = d.rev.map((v, j) => v * (1 + (i % 3) * 0.05) + Math.sin(j + i) * 4);
      return `<div class="c kpi"><small>${T(x[0])}</small><b class="${isMoney && !money ? 'lock' : ''}">${x[1]}</b><em>${x[2]}</em>${spark(series, i % 2 ? 'var(--a2)' : 'var(--a)')}</div>`;
    }).join('');
    const areas = d.health.map((h, i) => `<div class="area"><span class="dot ${h[0]}"></span><div><b>${T(U.areas[i])}</b><span>${T(h[1])}</span></div></div>`).join('');
    const brief = d.brief.map((b, i) => `<div class="act"><p>${T(b)}</p><button class="bt w" data-do="b${i}">${T(U.doIt)}</button></div>`).join('');
    return `<div class="head"><div><h2>${T(U.hello)} 👋</h2><p>${T(U.helloP)}</p></div></div>
      <div class="g g6" style="margin-bottom:14px">${k}</div>
      <div class="g g21" style="margin-bottom:14px">
        <div class="c"><h3>👁 ${T(U.eye)}</h3><div class="g g2">${areas}</div></div>
        <div class="c aic"><h3>${T(U.brief)}</h3>${brief}</div>
      </div>
      <div class="g g21"><div class="c"><h3>${T(U.rev30)}</h3><div class="${money ? '' : 'lock'}">${area(d.rev)}</div></div>
      <div class="c"><h3 style="display:flex;justify-content:space-between">${T(U.live)} <span class="live">LIVE</span></h3><div class="feed" data-feed></div></div></div>`;
  }
  function startFeed() {
    clearInterval(feedTimer);
    const box = root.querySelector('[data-feed]'); if (!box) return;
    const d = D(); let i = 0, min = 0;
    const push = () => {
      const f = d.feed[i % d.feed.length]; i++;
      const el = document.createElement('div'); el.className = 'fi';
      el.innerHTML = `<span>${f[0]}</span><div>${T(f[1])}</div><time>${min === 0 ? t(U.rvNew) : min + ' min'}</time>`;
      box.prepend(el); while (box.children.length > 7) box.lastChild.remove();
    };
    for (let j = 0; j < 4; j++) { min = (4 - j) * 3; push(); }
    min = 0;
    feedTimer = setInterval(() => { if (!root.isConnected || st.sec !== 'overview') return clearInterval(feedTimer); push(); }, 3800);
  }

  function vInbox() {
    const d = D();
    const f = st.filter;
    const list = d.chats.map((c, i) => ({ c, i })).filter(({ c }) => f === 'all' || (f === 'need' ? c.s === 'need' : c.ch === f));
    const need = d.chats.filter((c) => c.s === 'need').length;
    const tot = { clinic: 64, shop: 83, biz: 25 }[st.niche], cl = Math.round(tot * parseInt(d.kpi[3][1]) / 100);
    const chs = [...new Set(d.chats.map((c) => c.ch))];
    const chips = [['all', t(U.all)], ['need', t(U.needYou) + ' · ' + need], ...chs.map((k) => [k, chName(k)])].map(([k, l]) => `<button class="chip" data-f="${k}" aria-pressed="${f === k}">${esc(l)}</button>`).join('');
    const items = list.map(({ c, i }) => `<button class="cv" data-c="${i}" aria-current="${st.chat === i}">${av(c.n, i, c.ch)}<div style="min-width:0;flex:1"><b>${esc(c.n)} <span class="pill p-${c.s}">${T({ ai: U.stAi, need: U.stNeed, owner: U.stYou, done: U.stDone }[c.s])}</span></b><p>${T(c.m[c.m.length - 1][1])}</p></div></button>`).join('');
    const c = d.chats[st.chat];
    const lbl = { c: c.n, a: '✦ ' + t(U.ai), o: t(U.you) };
    const msgs = c.m.map((m) => m[0] === 'sys' ? `<div class="m sys">${T(m[1])}</div>` : `<div class="m ${m[0]}"><small>${esc(lbl[m[0]])}</small>${T(m[1])}</div>`).join('');
    const aiOn = c.s !== 'owner';
    return `<div class="head"><div><h2>${T(U.sec.inbox)}</h2><p>Instagram · WhatsApp · Telegram · Facebook · ${esc(chName('site'))} · Email</p></div></div>
      <div class="strip">${esc(fill(t(U.inboxStat), { a: tot, b: cl, p: d.kpi[3][1].replace('%', ''), s: 9, w: need }))}</div>
      <div class="chips">${chips}</div>
      <div class="inbox ${st.open ? 'open' : ''}"><div class="list">${items}</div>
      <div class="conv"><div class="ch"><button class="bt g back" data-back>${T(U.back2)}</button>${av(c.n, st.chat, c.ch)}<div><b>${esc(c.n)}</b><br><small>${esc(chName(c.ch))} · ${esc(c.v)}</small></div>
        <div class="tg">${T(U.aiOn)} <button class="sw" data-aisw aria-pressed="${aiOn}"></button></div>
        <button class="bt ${aiOn ? '' : 'g'}" data-take>${T(aiOn ? U.take : U.back)}</button></div>
        <div class="sumx"><b>${T(U.sum)}:</b> ${T(c.sum)}</div>
        <div class="msgs" data-msgs>${msgs}${aiOn ? '' : `<div class="m sys">${T(U.paused)}</div>`}</div>
        <form class="comp" data-comp><div class="seg"><button type="button" data-as="o" aria-pressed="${st.as === 'o'}">${T(U.asOwner)}</button><button type="button" data-as="c" aria-pressed="${st.as === 'c'}">${T(U.asClient)}</button></div>
        <div class="row"><input data-msg placeholder="${esc(t(st.as === 'o' ? U.phOwner : U.phClient))}" maxlength="300"><button class="bt a">${T(U.send)}</button></div></form>
      </div></div>`;
  }
  async function sendMsg(text) {
    const d = D(), c = d.chats[st.chat];
    if (st.as === 'o') {
      c.m.push(['o', [text, text, text]]); c.s = 'owner'; render(); return;
    }
    c.m.push(['c', [text, text, text]]);
    if (c.s === 'owner') { render(); return; }
    if (c.s === 'done') c.s = 'ai';
    render();
    const box = root.querySelector('[data-msgs]');
    box.insertAdjacentHTML('beforeend', '<div class="typing"><i></i><i></i><i></i></div>'); box.scrollTop = 1e6;
    try {
      const r = await ai({ mode: 'chat', role: `the AI manager of ${d.brand} answering a client in ${chName(c.ch)}. Warm, short, sells and books. Never gives discounts or medical advice; for complaints, medical or big orders say you are passing it to the owner right now`, items: d.items.map(([id, tt]) => ({ id, t: tt })), q: text, history: c.m.slice(0, -1).filter((m) => m[0] !== 'sys').map((m) => ({ role: m[0] === 'c' ? 'u' : 'a', text: t(m[1]) })) });
      c.m.push(['a', [r.text, r.text, r.text]]);
    } catch { c.m.push(['sys', U.aiBusy]); }
    if (st.sec === 'inbox') render();
  }

  function vReviews() {
    const d = D();
    const modes = U.rvModes.map((m, i) => `<button type="button" data-rm="${i}" aria-pressed="${st.rmode === i}">${T(m)}</button>`).join('');
    const cards = st.reviews.map((r, i) => {
      const neg = r[0] <= 2, draft = st.rmode === 1 && !r.ok, off = st.rmode === 2 && !r.ok;
      return `<div class="c rv ${neg ? 'neg' : ''}"><div class="top">${av(r[2], i, r[1])}<b>${esc(r[2])}</b><span class="stars">${'★'.repeat(r[0])}${'☆'.repeat(5 - r[0])}</span><small style="color:var(--o-mut)">${esc(chName(r[1]))}</small>${neg ? `<span class="flag">⚠ ${T(U.rvNeg)}</span>` : ''}</div>
        <p class="q">${T(r[3])}</p>${off ? '' : `<div class="ans"><small>${draft ? '✦ ' + T(U.cst.ai) : '✦ ' + esc(fill(t(U.rvAuto), { m: r[5] }))}</small>${T(r[4])}</div>`}
        ${neg || draft ? `<div class="row" style="flex-wrap:wrap">${draft ? `<button class="bt a" data-appr="${i}">${T(U.approve)}</button>` : ''}${neg ? `<button class="bt g" data-tst="${esc(t(U.done))}">${T(U.call)}</button>` : ''}<button class="bt g" data-tst="${esc(t(U.done))}">${T(U.edit)}</button></div>` : ''}</div>`;
    }).join('');
    return `<div class="head"><div><h2>${T(U.sec.reviews)}</h2><p>${esc(fill(t(U.rvStat), { r: d.rating, n: d.rcount, m: 2 }))}</p></div></div>
      <div class="c" style="margin-bottom:14px"><h3>${T(U.rvMode)}</h3><div class="seg">${modes}</div>
      <h3 style="margin-top:6px">✦ ${T(U.rvTest)}</h3><form class="row" data-rvf style="flex-wrap:wrap"><select class="in" data-rvs style="flex:none;width:auto">${[5, 4, 3, 2, 1].map((s) => `<option value="${s}">${'★'.repeat(s)}</option>`).join('')}</select><input data-rvt placeholder="${esc(t(U.rvPh))}" maxlength="300"><button class="bt a">${T(U.rvGo)}</button></form></div>
      <div class="g">${cards}</div>`;
  }
  async function newReview(stars, text) {
    const d = D();
    const r = [stars, 'gg', t(['Guest', 'Гость', 'Гість']), [text, text, text], ['…', '…', '…'], 1];
    st.reviews.unshift(r); render();
    try {
      const j = await ai({ mode: 'chat', role: `${d.brand}'s manager replying publicly to a ${stars}-star review: warm, specific, professional, 2-3 sentences; for a problem apologise honestly and offer to fix it, never argue. Put the reply in "text"; put "neg" in ids if the review is negative, else "pos"`, items: [{ id: 'neg', t: 'negative review' }, { id: 'pos', t: 'positive review' }], q: 'Review: ' + text });
      r[4] = [j.text, j.text, j.text]; if (j.ids.includes('neg') && r[0] > 2) r[0] = 2;
    } catch { r[4] = U.aiBusy; }
    if (st.sec === 'reviews') render();
  }

  function vMarketing() {
    const d = D(), m = st.mk;
    const spend = m.reduce((s, c) => s + c[1], 0), leads = m.reduce((s, c) => s + c[2], 0), sales = m.reduce((s, c) => s + c[3], 0);
    const avgCheck = { clinic: 210, shop: 80, biz: 2100 }[st.niche];
    const roas = spend ? (sales * avgCheck) / spend : 0;
    const k = [fmt(spend), leads, fmt(spend / leads), roas.toFixed(1) + '×'].map((v, i) => `<div class="c kpi"><small>${T(U.mk[i])}</small><b>${v}</b></div>`).join('');
    const maxL = Math.max(...m.map((c) => c[2]));
    const rows = m.map((c) => `<tr><td><b>${T(c[0])}</b><div class="bar"><i style="width:${(c[2] / maxL) * 100}%"></i></div></td><td>${fmt(c[1])}</td><td>${c[2]}</td><td>${c[1] ? fmt(c[1] / c[2]) : '$0'}</td><td>${c[3]}</td><td class="roas ${c[4] >= 5 || !c[1] ? 'good' : c[4] >= 3 ? 'warn' : 'bad'}">${c[1] ? c[4].toFixed(1) + '×' : '∞'}</td></tr>`).join('');
    let acc = 0; const tot = leads;
    const arcs = m.map((c, i) => { const a0 = acc / tot, a1 = (acc += c[2]) / tot; const large = a1 - a0 > 0.5 ? 1 : 0; const p = (a) => [60 + 50 * Math.sin(a * 2 * Math.PI), 60 - 50 * Math.cos(a * 2 * Math.PI)]; const [x0, y0] = p(a0), [x1, y1] = p(a1 - 0.002); return `<path d="M${x0} ${y0} A50 50 0 ${large} 1 ${x1} ${y1}" stroke="${COL[i]}" stroke-width="18" fill="none"/>`; }).join('');
    const lg = m.map((c, i) => `<span><i style="background:${COL[i]}"></i>${T(c[0])} — ${Math.round((c[2] / tot) * 100)}%</span>`).join('');
    const recs = d.mkRecs.map((r, i) => `<div class="act"><p>${T(r)}</p><button class="bt w" data-rec="${i}" ${st.recDone[i] ? 'disabled' : ''}>${T(st.recDone[i] ? U.applied : U.apply)}</button></div>`).join('');
    return `<div class="head"><div><h2>${T(U.sec.marketing)}</h2><p>Meta · Google · TikTok · LinkedIn · ${T(['referrals & affiliates', 'рекомендации и партнёры', 'рекомендації та партнери'])}</p></div></div>
      <div class="g g4" style="margin-bottom:14px">${k}</div>
      <div class="g g21" style="margin-bottom:14px"><div class="c" style="overflow-x:auto"><table><tr>${U.mkCols.map((c) => `<th>${T(c)}</th>`).join('')}</tr>${rows}</table></div>
      <div class="c"><h3>${T(U.share)}</h3><div class="donut"><svg viewBox="0 0 120 120">${arcs}<text x="60" y="58" text-anchor="middle" font-size="20" font-weight="700" fill="currentColor">${leads}</text><text x="60" y="76" text-anchor="middle" font-size="10" fill="#888">${T(U.mk[1])}</text></svg><div class="lg">${lg}</div></div></div></div>
      <div class="c aic"><h3>${T(U.mkAi)}</h3>${recs}<div class="act"><p>${T(U.autopilot)}</p><button class="sw" data-ap aria-pressed="${st.autopilot}"></button></div></div>`;
  }

  function vContent() {
    const d = D();
    const grads = ['linear-gradient(135deg,#f6a26b,#d1495b)', 'linear-gradient(135deg,#5f72ff,#9a4dff)', 'linear-gradient(135deg,#2bc0a0,#1d7f9c)', 'linear-gradient(135deg,#f7c548,#f08a24)', 'linear-gradient(135deg,#ff6fb5,#8f5cff)', 'linear-gradient(135deg,#3a3f4b,#111)', 'linear-gradient(135deg,#9ad06a,#2f8f5b)'];
    const cal = st.posts.map((p, i) => `<div><div style="font-size:12px;font-weight:700;color:var(--o-mut);margin-bottom:6px">${T(U.days[i % 7])}</div><div class="post"><div class="ph" style="background:${grads[i % grads.length]}">${esc(chName(p[0]))}</div><div class="bd"><b>${T(p[1])}</b><span class="pill p-${p[2]}">${T(U.cst[p[2]])}</span>${p[2] === 'wait' || p[2] === 'ai' ? `<div style="margin-top:6px"><button class="bt a" style="padding:4px 10px;font-size:12px" data-ok="${i}">✓ ${T(U.approve).split(' ')[0]}</button></div>` : ''}</div></div></div>`).join('');
    const k = d.kit;
    return `<div class="head"><div><h2>${T(U.sec.content)}</h2><p>${T(['AI plans, writes and designs posts in your brand style — you only approve.', 'ИИ планирует, пишет и оформляет посты в стиле бренда — вы только одобряете.', 'ШІ планує, пише й оформлює пости в стилі бренду — ви лише схвалюєте.'])}</p></div></div>
      <div class="c" style="margin-bottom:14px"><h3>${T(U.week)}</h3><div class="cal">${cal}</div></div>
      <div class="g g2"><div class="c"><h3>${T(U.gen)}</h3><form class="row" data-genf><input data-gent placeholder="${esc(t(U.genPh))}" maxlength="120"><button class="bt a">${T(U.genGo)}</button></form><div class="ans2" data-geno></div></div>
      <div class="c"><h3>🎨 ${T(U.kit)}</h3><div class="sw8">${k.colors.map((c) => `<i style="background:${c}" title="${c}"></i>`).join('')}</div><p style="margin:12px 0 4px"><b>${T(U.kitF)}:</b> ${esc(k.fonts)}</p><p style="margin:0"><b>${T(U.kitV)}:</b> ${T(k.voice)}</p></div></div>`;
  }

  function vDeals() {
    const d = D();
    const cols = st.stages.map((s, si) => {
      const ds = st.deals.map((x, i) => ({ x, i })).filter(({ x }) => x[2] === si);
      const sum = ds.reduce((a, { x }) => a + x[1], 0);
      return `<div class="col" data-col="${si}"><h4><span>${T(s)}</span><span>${seesMoney() ? fmt(sum) : ds.length}</span></h4>${ds.map(({ x, i }) => `<div class="deal ${st.sel === i ? 'sel' : ''}" draggable="true" data-d="${i}"><b>${esc(x[0])}</b>${seesMoney() ? fmt(x[1]) + ' · ' : ''}<small>${T(U.next)}: ${T(x[3])}</small></div>`).join('')}</div>`;
    }).join('');
    return `<div class="head"><div><h2>${T(U.sec.deals)}</h2><p>${T(U.dealHint)}</p></div>
      <form class="row" data-stf style="margin-left:auto"><input data-stn placeholder="${esc(t(U.stage))}" maxlength="30" style="width:170px"><button class="bt g">+ ${T(U.add)}</button></form></div>
      <div class="kan">${cols}</div><div class="c" style="margin-top:12px"><h3>${T(U.log)}</h3><div data-dlog style="font-size:13px;color:var(--o-mut)">—</div></div>`;
  }
  function moveDeal(i, si) {
    const x = st.deals[i]; if (x[2] === si) return;
    x[2] = si; st.sel = null; render();
    const msg = `${x[0]} → ${t(st.stages[si])}: ${t(['client notified, task created, owner sees it', 'клиент уведомлён, задача создана, владелец видит', 'клієнта повідомлено, задачу створено, власник бачить'])}`;
    st.dlog.unshift(msg); toast('⚡ ' + msg);
    const el = root.querySelector('[data-dlog]'); if (el) el.innerHTML = st.dlog.slice(0, 5).map(esc).join('<br>');
  }

  function vTeam() {
    const d = D();
    const roles = Object.keys(U.roles);
    const mem = st.team.map((m, i) => `<div class="mem">${av(m[0], i + 2)}<div><b>${esc(m[0])}</b>${m[2] ? ` <span class="pill p-wait">${T(U.pending)}</span>` : ''}<br><small style="color:var(--o-mut)">${T(U.roles[m[1]])}</small></div>${m[1] === 'owner' ? '' : `<select data-mr="${i}">${roles.filter((r) => r !== 'owner').map((r) => `<option value="${r}" ${r === m[1] ? 'selected' : ''}>${T(U.roles[r])}</option>`).join('')}</select>`}</div>`).join('');
    const perm = `<table class="perm"><tr><th></th>${roles.map((r) => `<th>${T(U.roles[r])}</th>`).join('')}</tr>${SECS.map((s) => `<tr><td>${T(U.sec[s])}</td>${roles.map((r) => `<td><input type="checkbox" data-p="${r}:${s}" ${st.perm[r].includes(s) ? 'checked' : ''} ${r === 'owner' ? 'disabled' : ''}></td>`).join('')}</tr>`).join('')}<tr><td>💰 ${T(U.money)}</td>${roles.map((r) => `<td><input type="checkbox" data-pm="${r}" ${st.money[r] ? 'checked' : ''} ${r === 'owner' ? 'disabled' : ''}></td>`).join('')}</tr></table>`;
    const log = d.log.map((l) => `<div class="fi"><span>${l[0] === 'AI' ? '✦' : '•'}</span><div><b>${esc(l[0] === 'AI' ? t(U.ai) : l[0])}</b> ${T(l[1])}</div><time>${l[2]}</time></div>`).join('');
    return `<div class="head"><div><h2>${T(U.sec.team)}</h2><p>${T(['Each person sees only what they need. Try “View as” at the bottom left.', 'Каждый видит только то, что ему нужно. Попробуйте «Смотреть как» слева внизу.', 'Кожен бачить лише те, що йому потрібно. Спробуйте «Дивитися як» ліворуч унизу.'])}</p></div></div>
      <div class="g g21" style="margin-bottom:14px"><div class="c" style="overflow-x:auto"><h3>🔐 ${T(U.rights)}</h3>${perm}</div>
      <div class="c"><h3>${T(U.team)}</h3>${mem}<form class="row" data-inv style="margin-top:10px"><input type="email" data-ie placeholder="${esc(t(U.invPh))}" required><button class="bt a">${T(U.invite)}</button></form></div></div>
      <div class="c"><h3>${T(U.log)}</h3>${log}</div>`;
  }

  function vAssistant() {
    const d = D();
    const ppl = st.team.filter((m) => !m[2]);
    const cur = ppl[st.who] || ppl[0];
    const who = ppl.map((m, i) => `<button data-who="${i}" aria-pressed="${i === st.who}">${av(m[0], i + 2)}${esc(m[0])} · ${T(U.roles[m[1]])}</button>`).join('');
    const tips = (d.tips[cur[1]] || []).map((tp, i) => { const key = cur[0] + i; const ok = st.tipDone[key]; return `<div class="tip ${ok ? 'ok' : ''}"><span style="font-size:20px">${ok ? '✅' : '✦'}</span><p>${T(tp)}</p><button class="bt ${ok ? 'g' : 'a'}" data-tip="${key}" ${ok ? 'disabled' : ''}>${T(ok ? U.done : U.doIt)}</button></div>`; }).join('');
    return `<div class="head"><div><h2>${T(U.asTitle)}</h2><p>${T(U.asP)}</p></div></div>
      <div class="who">${who}</div><div class="g" style="margin-bottom:14px">${tips}</div>
      <div class="c"><h3>✦ ${T(['Ask your assistant', 'Спросите помощника', 'Запитайте помічника'])} — ${esc(cur[0])}</h3><form class="row" data-askf><input data-askq placeholder="${esc(t(U.askPh))}" maxlength="300"><button class="bt a">${T(U.ask)}</button></form><div class="ans2" data-askout></div></div>`;
  }

  const VIEWS = { overview: vOverview, inbox: vInbox, reviews: vReviews, marketing: vMarketing, content: vContent, deals: vDeals, team: vTeam, assistant: vAssistant };

  // ---------- render ----------
  function render() {
    L = LI[o.lang] ?? 0;
    if (!allowed(st.sec)) st.sec = st.perm[st.role][0] || 'assistant';
    const d = D();
    const need = d.chats.filter((c) => c.s === 'need').length;
    const nav = SECS.filter(allowed).map((s) => `<button data-sec="${s}" aria-current="${st.sec === s}"><svg viewBox="0 0 24 24">${ICON[s]}</svg>${T(U.sec[s])}${s === 'inbox' && need ? `<span class="cnt">${need}</span>` : ''}</button>`).join('');
    const roles = Object.keys(U.roles).map((r) => `<option value="${r}" ${r === st.role ? 'selected' : ''}>${T(U.roles[r])}</option>`).join('');
    root.innerHTML = `<aside class="side"><div class="brand"><i>✦</i><div>${esc(d.brand)}<small>${T(U.os)}</small></div></div><nav class="nav">${nav}</nav>
      <div class="viewas"><label>${T(U.viewAs)}</label><select data-role>${roles}</select></div></aside>
      <section class="main">${st.role !== 'owner' ? `<div class="asb">👁 ${T(U.roles[st.role])}: ${T(U.asBanner)}</div>` : ''}${VIEWS[st.sec]()}</section><div class="toast"></div>`;
    if (st.sec === 'overview') startFeed();
    const msgs = root.querySelector('[data-msgs]'); if (msgs) msgs.scrollTop = 1e6;
    const dl = root.querySelector('[data-dlog]'); if (dl && st.dlog.length) dl.innerHTML = st.dlog.slice(0, 5).map(esc).join('<br>');
  }

  function bind() {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
      const ds = b.dataset;
      if (ds.sec) { st.sec = ds.sec; st.open = false; render(); root.getRootNode().host.scrollIntoView({ block: 'nearest' }); }
      else if (ds.do) { b.disabled = true; b.textContent = '✓ ' + t(U.done); toast('✦ ' + t(U.done)); }
      else if (ds.f) { st.filter = ds.f; render(); }
      else if (ds.c) { st.chat = +ds.c; st.open = true; render(); }
      else if (ds.back !== undefined) { st.open = false; render(); }
      else if (ds.as) { st.as = ds.as; render(); root.querySelector('[data-msg]').focus(); }
      else if (ds.aisw !== undefined || ds.take !== undefined) { const c = D().chats[st.chat]; c.s = c.s === 'owner' ? 'ai' : 'owner'; render(); }
      else if (ds.rm) { st.rmode = +ds.rm; render(); }
      else if (ds.appr) { st.reviews[+ds.appr].ok = true; render(); toast('✓ ' + t(U.done)); }
      else if (ds.tst) toast('✓ ' + ds.tst);
      else if (ds.rec) { const i = +ds.rec; st.recDone[i] = true; const m = st.mk; if (i === 0) { m[0][1] += 300; m[0][2] += 24; m[0][3] += 9; m[2][1] = Math.max(0, m[2][1] - 300); m[2][2] = Math.max(1, m[2][2] - 9); } else { m[3][2] += 6; m[3][3] += 4; } render(); toast('✦ ' + t(U.applied)); }
      else if (ds.ap !== undefined) { st.autopilot = !st.autopilot; render(); }
      else if (ds.ok) { st.posts[+ds.ok][2] = 'plan'; render(); toast('✓ ' + t(U.cst.plan)); }
      else if (ds.who) { st.who = +ds.who; render(); }
      else if (ds.tip) { st.tipDone[ds.tip] = true; render(); toast('✦ ' + t(U.done)); }
    });
    root.addEventListener('click', (e) => { if (e.target.closest('button')) return; const dl = e.target.closest('[data-d]'); if (dl && (st.sel == null || st.sel === +dl.dataset.d)) { st.sel = st.sel == null ? +dl.dataset.d : null; render(); return; } const col = e.target.closest('[data-col]'); if (col && st.sel != null) moveDeal(st.sel, +col.dataset.col); });
    root.addEventListener('change', (e) => {
      const el = e.target;
      if (el.matches('[data-role]')) { st.role = el.value; render(); }
      else if (el.dataset.mr) { st.team[+el.dataset.mr][1] = el.value; render(); }
      else if (el.dataset.p) { const [r, s] = el.dataset.p.split(':'); const arr = st.perm[r]; if (el.checked) { if (!arr.includes(s)) arr.push(s); arr.sort((a, b) => SECS.indexOf(a) - SECS.indexOf(b)); } else st.perm[r] = arr.filter((x) => x !== s); toast('🔐 ' + t(U.roles[r]) + ': ' + t(U.sec[s]) + (el.checked ? ' ✓' : ' ✕')); }
      else if (el.dataset.pm) { st.money[el.dataset.pm] = el.checked; }
    });
    root.addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target;
      if (f.matches('[data-comp]')) { const i = f.querySelector('[data-msg]'); const v = i.value.trim(); if (v) { i.value = ''; sendMsg(v); } }
      else if (f.matches('[data-rvf]')) { const v = f.querySelector('[data-rvt]').value.trim(); if (v) newReview(+f.querySelector('[data-rvs]').value, v); }
      else if (f.matches('[data-stf]')) { const v = f.querySelector('[data-stn]').value.trim(); if (v) { st.stages.push([v, v, v]); render(); } }
      else if (f.matches('[data-inv]')) { const v = f.querySelector('[data-ie]').value.trim(); st.team.push([v.split('@')[0], 'admin', 1]); render(); toast('✉ ' + t(U.invited)); }
      else if (f.matches('[data-genf]')) {
        const v = f.querySelector('[data-gent]').value.trim(); if (!v) return; const out = root.querySelector('[data-geno]'); out.textContent = '…';
        try { const j = await ai({ mode: 'chat', role: `the social media copywriter of ${D().brand}. Brand voice: ${D().kit.voice[0]} Write one ready Instagram post: hook line, 2-3 short lines, a soft call to action, 3 hashtags. Put the whole post in "text", ids empty`, items: D().items.map(([id, tt]) => ({ id, t: tt })), q: 'Topic: ' + v }); out.textContent = j.text; st.posts.splice(4, 1, ['ig', [v, v, v], 'ai']); } catch { out.textContent = t(U.aiBusy); }
      }
      else if (f.matches('[data-askf]')) {
        const v = f.querySelector('[data-askq]').value.trim(); if (!v) return; const out = root.querySelector('[data-askout]'); out.textContent = '…';
        const ppl = st.team.filter((m) => !m[2]); const cur = ppl[st.who] || ppl[0]; const d = D();
        const ctx = [...d.brief.map((b) => b[0]), ...(d.tips[cur[1]] || []).map((x) => x[0]), ...d.health.map((h) => h[1][0])].map((x, i) => ({ id: 'f' + i, t: x }));
        try { const j = await ai({ mode: 'chat', role: `the personal AI assistant of ${cur[0]} (${U.roles[cur[1]][0]}) at ${d.brand}. The catalog lines are today's real facts about the business. Give concrete, practical advice in 2-4 short sentences based on those facts; ids empty`, items: ctx, q: v }); out.textContent = j.text; } catch { out.textContent = t(U.aiBusy); }
      }
    });
    root.addEventListener('dragstart', (e) => { const d = e.target.closest('[data-d]'); if (d) { e.dataTransfer.setData('text/plain', d.dataset.d); d.style.opacity = '.5'; } });
    root.addEventListener('dragover', (e) => { const c = e.target.closest('[data-col]'); if (c) { e.preventDefault(); c.classList.add('over'); } });
    root.addEventListener('dragleave', (e) => { const c = e.target.closest('[data-col]'); if (c) c.classList.remove('over'); });
    root.addEventListener('drop', (e) => { const c = e.target.closest('[data-col]'); if (c) { e.preventDefault(); moveDeal(+e.dataTransfer.getData('text/plain'), +c.dataset.col); } });
  }

  function reset(niche) {
    const d = N[niche];
    st = {
      niche, sec: st.sec || 'overview', role: 'owner', filter: 'all', chat: 0, open: false, as: 'c', rmode: 0, autopilot: false, recDone: {}, tipDone: {}, sel: null, who: 0, dlog: [],
      perm: JSON.parse(JSON.stringify(PERM0)), money: { ...MONEY0 },
      reviews: d.reviews.map((r) => r.slice()), mk: d.chan.map((c) => c.slice()), posts: d.posts.map((p) => p.slice()), stages: d.stages.slice(), deals: d.deals.map((x) => x.slice()), team: d.team.map((m) => m.slice()),
    };
    d.chats.forEach((c) => { c.m0 = c.m0 || JSON.parse(JSON.stringify(c.m)); c.s0 = c.s0 || c.s; c.m = JSON.parse(JSON.stringify(c.m0)); c.s = c.s0; });
  }

  window.VaxoOS = {
    mount(el, opts) {
      o = { lang: 'en', niche: 'clinic', ...opts };
      // Shadow DOM: the host demo's CSS and ours never collide.
      const sh = el.shadowRoot || el.attachShadow({ mode: 'open' });
      sh.innerHTML = `<style>:host{display:block}${CSS}</style>`;
      root = document.createElement('div'); root.className = 'vos'; sh.appendChild(root);
      if (o.accent) root.style.setProperty('--a', o.accent);
      if (o.accent2) root.style.setProperty('--a2', o.accent2);
      reset(o.niche); bind(); render();
    },
    lang(l) { o.lang = l; if (root) render(); },
    niche(n, accent, accent2) { o.niche = n; if (accent) root.style.setProperty('--a', accent); if (accent2) root.style.setProperty('--a2', accent2); reset(n); render(); },
    go(sec) { st.sec = sec; render(); },
  };
})();
