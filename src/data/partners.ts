// Partner program terms — the single source of truth for the landing page (/partners/) and the cabinet.
// Change a number here and every page follows.
import type { Lang } from '../i18n';

export type LevelId = 'start' | 'pro' | 'elite';

/** Paid sales in the last 90 days needed for each level. */
export const LEVELS: { id: LevelId; name: string; minSales: number }[] = [
  { id: 'start', name: 'Start', minSales: 0 },
  { id: 'pro', name: 'Pro', minSales: 5 },
  { id: 'elite', name: 'Elite', minSales: 20 },
];

/** Commission, % — by direction and level. Agency terms are fixed for every level. */
export const RATES = {
  agencyOwn: 30, // client the partner found
  agencyGiven: 20, // warm lead Vaxo hands to the partner to close
  agencyRenewal: 10, // every renewal / monthly payment, for life
  products: { start: 30, pro: 40, elite: 50 } as Record<LevelId, number>,
  offers: { start: 60, pro: 65, elite: 70 } as Record<LevelId, number>, // % of the payout Vaxo receives
  team: 10, // bonus on direct partners' earnings, paid by Vaxo on top
  holdDays: 7,
};

/** Average order values used by the calculator. */
export const CALC = { agencyAvg: 199, productAvg: 20, renewalAvg: 49 };

type Text = {
  meta: { title: string; description: string };
  eyebrow: string;
  h1: string;
  sub: string;
  join: string;
  login: string;
  stats: [string, string][];
  promoteH: string;
  directions: { name: string; rate: string; price: string; what: string; points: string[] }[];
  levelsH: string;
  levelsSub: string;
  levelNeed: (n: number) => string;
  levelPerks: Record<LevelId, string[]>;
  calcH: string;
  calcSub: string;
  calcAgency: string;
  calcProducts: string;
  calcRenewals: string;
  calcLevel: string;
  calcMonth: string;
  calcYear: string;
  calcNote: string;
  stepsH: string;
  steps: [string, string][];
  perksH: string;
  perks: [string, string][];
  aiH: string;
  aiSub: string;
  aiItems: [string, string][];
  faqH: string;
  faq: [string, string][];
  rules: string;
  rulesLink: string;
  finalH: string;
  finalP: string;
  create: string;
};

const r = RATES;

const en: Text = {
  meta: {
    title: 'Vaxo Partners — earn by recommending AI for business',
    description: `Promote AI automation, websites, chatbots and templates for small businesses. Up to ${r.agencyOwn}% on services, up to ${r.products.elite}% on products, lifetime clients, weekly payouts.`,
  },
  eyebrow: 'Partner program',
  h1: 'Earn by recommending AI that businesses actually need.',
  sub: 'Share our services and products with your audience. Get paid for every real sale — every week, for as long as the client stays.',
  join: 'Become a partner →',
  login: 'Log in',
  stats: [
    [`${r.agencyOwn}%`, 'on agency services'],
    [`${r.products.elite}%`, 'max on our products'],
    [`+${r.agencyRenewal}%`, 'on every renewal, for life'],
    ['7 days', 'from sale to payout'],
  ],
  promoteH: 'What you promote — and what you earn',
  directions: [
    {
      name: 'Agency services',
      rate: `${r.agencyGiven}–${r.agencyOwn}%`,
      price: 'deals from $149',
      what: 'Automation, websites and AI chatbots. Our team talks to the client, makes the proposal and does the work.',
      points: [`${r.agencyOwn}% — client you found`, `${r.agencyGiven}% — warm lead we give you to close`, `+${r.agencyRenewal}% — every renewal and monthly payment`],
    },
    {
      name: 'Our digital products',
      rate: `${r.products.start}–${r.products.elite}%`,
      price: '$9 – $67',
      what: 'Ready-made templates and guides for small businesses. A cheap, easy first purchase — great for content.',
      points: [`${r.products.start}% at Start`, `${r.products.pro}% at Pro`, `${r.products.elite}% at Elite`],
    },
    {
      name: 'Partner offers',
      rate: `${r.offers.start}–${r.offers.elite}%`,
      price: 'coming soon',
      what: 'Offers from other companies, checked by us. You get the biggest share of what the company pays us.',
      points: [`${r.offers.start}% of the payout at Start`, `${r.offers.pro}% at Pro`, `${r.offers.elite}% at Elite`],
    },
  ],
  levelsH: 'Grow your level — earn more',
  levelsSub: 'Your level depends on paid sales in the last 90 days. It updates by itself.',
  levelNeed: (n) => (n === 0 ? 'from day one' : `${n}+ sales / 90 days`),
  levelPerks: {
    start: [`${r.products.start}% on products`, `${r.offers.start}% on partner offers`, 'Free training and AI toolkit'],
    pro: [`${r.products.pro}% on products`, `${r.offers.pro}% on partner offers`, `Warm leads from us to close (${r.agencyGiven}%)`],
    elite: [`${r.products.elite}% on products`, `${r.offers.elite}% on partner offers`, 'First access to new offers and leads'],
  },
  calcH: 'Count your income',
  calcSub: 'Move the sliders. This is example math with average prices, not a promise.',
  calcAgency: 'Service clients per month',
  calcProducts: 'Product sales per month',
  calcRenewals: 'Clients paying monthly',
  calcLevel: 'Level',
  calcMonth: 'per month',
  calcYear: 'per year',
  calcNote: `Averages: service deal $${CALC.agencyAvg}, product $${CALC.productAvg}, monthly payment $${CALC.renewalAvg}. Real income depends only on real sales.`,
  stepsH: 'How it works',
  steps: [
    ['Sign up', 'Free, takes a minute. 18+ only.'],
    ['Make your links', 'As many as you want — one per channel, video or audience — to see what works.'],
    ['Share honestly', 'Post, film, recommend. Our AI toolkit writes scripts and messages with you.'],
    ['Get paid weekly', `For real sales, ${r.holdDays} days after the client pays.`],
  ],
  perksH: 'Why partners choose Vaxo',
  perks: [
    ['Clients stay yours for life', 'The first link a client clicks is saved for good. Buys again in a year? Still yours.'],
    ['We do the hard part', 'Calls, proposals, delivery, support — our team handles it. You bring people.'],
    ['Live stats for every link', 'Clicks, leads and your team — right in the cabinet. Turn links on and off any time.'],
    ['Build a team', `Invite partners and get +${r.team}% of their earnings, paid by us on top — never for the invite itself.`],
  ],
  aiH: 'Your AI toolkit — free or paid, your choice',
  aiSub: 'In the cabinet: ready prompts that open in one click in Claude, ChatGPT or Gemini — plus the best free tools for every task.',
  aiItems: [
    ['Scripts & posts', 'Hooks, video scripts, captions, 10 ideas from one offer.'],
    ['Messages to clients', 'Personal first message, follow-ups, answers to objections.'],
    ['Video & images', 'Free tools for editing, voice and visuals — and paid upgrades when you grow.'],
  ],
  faqH: 'Questions',
  faq: [
    ['Does it cost anything?', 'No. Signing up, the cabinet, training and the AI toolkit are free.'],
    ['Do I need experience?', 'No. The training shows step by step how to make content and where to post it.'],
    ['How much will I earn?', 'It depends only on real sales you bring. Use the calculator above to see the math. We never promise income.'],
    ['When and how do I get paid?', `Every week, for money we received and held for ${r.holdDays} days (refund protection). Main method: crypto (USDT).`],
    ['Where can I promote?', 'Anywhere, honestly: social media, video, blogs, communities, your own clients. No spam, no fake reviews, no paid clicks.'],
  ],
  rules: '18+ only. Honest promotion only.',
  rulesLink: 'Read the full partner rules',
  finalH: 'Ready to start?',
  finalP: 'Create your free account and get your first link in a minute.',
  create: 'Create account →',
};

const ua: Text = {
  meta: {
    title: 'Партнерка Vaxo — заробляйте, рекомендуючи ШІ для бізнесу',
    description: `Рекомендуйте автоматизацію, сайти, чат-боти та шаблони для бізнесу. До ${r.agencyOwn}% з послуг, до ${r.products.elite}% з продуктів, клієнти закріплені назавжди, виплати щотижня.`,
  },
  eyebrow: 'Партнерська програма',
  h1: 'Заробляйте, рекомендуючи ШІ, який справді потрібен бізнесу.',
  sub: 'Діліться нашими послугами та продуктами зі своєю аудиторією. Отримуйте гроші за кожен реальний продаж — щотижня, поки клієнт з нами.',
  join: 'Стати партнером →',
  login: 'Увійти',
  stats: [
    [`${r.agencyOwn}%`, 'з послуг агенції'],
    [`${r.products.elite}%`, 'максимум з наших продуктів'],
    [`+${r.agencyRenewal}%`, 'з кожного продовження, назавжди'],
    ['7 днів', 'від продажу до виплати'],
  ],
  promoteH: 'Що рекомендуєте — і скільки заробляєте',
  directions: [
    {
      name: 'Послуги агенції',
      rate: `${r.agencyGiven}–${r.agencyOwn}%`,
      price: 'угоди від $149',
      what: 'Автоматизація, сайти та ШІ-чат-боти. Наша команда спілкується з клієнтом, готує пропозицію та робить роботу.',
      points: [`${r.agencyOwn}% — клієнт, якого знайшли ви`, `${r.agencyGiven}% — теплий клієнт від нас, якого ви закриваєте`, `+${r.agencyRenewal}% — кожне продовження і щомісячна оплата`],
    },
    {
      name: 'Наші цифрові продукти',
      rate: `${r.products.start}–${r.products.elite}%`,
      price: '$9 – $67',
      what: 'Готові шаблони та посібники для малого бізнесу. Дешева і легка перша покупка — ідеально для контенту.',
      points: [`${r.products.start}% на рівні Start`, `${r.products.pro}% на рівні Pro`, `${r.products.elite}% на рівні Elite`],
    },
    {
      name: 'Офери партнерів',
      rate: `${r.offers.start}–${r.offers.elite}%`,
      price: 'скоро',
      what: 'Пропозиції інших компаній, перевірені нами. Ви отримуєте більшу частину того, що компанія платить нам.',
      points: [`${r.offers.start}% від виплати на Start`, `${r.offers.pro}% на Pro`, `${r.offers.elite}% на Elite`],
    },
  ],
  levelsH: 'Ростіть у рівні — заробляйте більше',
  levelsSub: 'Рівень залежить від оплачених продажів за останні 90 днів і оновлюється сам.',
  levelNeed: (n) => (n === 0 ? 'з першого дня' : `${n}+ продажів / 90 днів`),
  levelPerks: {
    start: [`${r.products.start}% з продуктів`, `${r.offers.start}% з оферів партнерів`, 'Безкоштовне навчання та ШІ-набір'],
    pro: [`${r.products.pro}% з продуктів`, `${r.offers.pro}% з оферів партнерів`, `Теплі клієнти від нас (${r.agencyGiven}%)`],
    elite: [`${r.products.elite}% з продуктів`, `${r.offers.elite}% з оферів партнерів`, 'Першим — нові офери та клієнти'],
  },
  calcH: 'Порахуйте свій дохід',
  calcSub: 'Рухайте повзунки. Це приклад розрахунку за середніми цінами, а не обіцянка.',
  calcAgency: 'Клієнтів на послуги за місяць',
  calcProducts: 'Продажів продуктів за місяць',
  calcRenewals: 'Клієнтів зі щомісячною оплатою',
  calcLevel: 'Рівень',
  calcMonth: 'на місяць',
  calcYear: 'на рік',
  calcNote: `Середні: угода на послугу $${CALC.agencyAvg}, продукт $${CALC.productAvg}, щомісячна оплата $${CALC.renewalAvg}. Реальний дохід залежить лише від реальних продажів.`,
  stepsH: 'Як це працює',
  steps: [
    ['Реєстрація', 'Безкоштовно, за хвилину. Лише 18+.'],
    ['Створіть посилання', 'Скільки завгодно — окреме для кожного каналу, відео чи аудиторії.'],
    ['Рекомендуйте чесно', 'Пости, відео, поради. Наш ШІ-набір допоможе зі сценаріями та повідомленнями.'],
    ['Виплати щотижня', `За реальні продажі, через ${r.holdDays} днів після оплати клієнта.`],
  ],
  perksH: 'Чому партнери обирають Vaxo',
  perks: [
    ['Клієнти ваші назавжди', 'Перше посилання, по якому прийшов клієнт, зберігається. Купить ще раз через рік — ваш.'],
    ['Складне робимо ми', 'Дзвінки, пропозиції, виконання, підтримка — на нашій команді. Ви приводите людей.'],
    ['Статистика по кожному посиланню', 'Кліки, заявки, ваша команда — прямо в кабінеті.'],
    ['Будуйте команду', `Запрошуйте партнерів і отримуйте +${r.team}% від їхнього заробітку — понад, від нас. Ніколи за саме запрошення.`],
  ],
  aiH: 'Ваш ШІ-набір — безкоштовно чи платно, на ваш вибір',
  aiSub: 'У кабінеті: готові промпти, що відкриваються в один клік у Claude, ChatGPT чи Gemini, і найкращі безкоштовні інструменти для кожної задачі.',
  aiItems: [
    ['Сценарії та пости', 'Гачки, сценарії відео, підписи, 10 ідей з одного офера.'],
    ['Повідомлення клієнтам', 'Перше персональне повідомлення, нагадування, відповіді на заперечення.'],
    ['Відео та картинки', 'Безкоштовні інструменти для монтажу, голосу і візуалу — і платні, коли зростете.'],
  ],
  faqH: 'Питання',
  faq: [
    ['Це щось коштує?', 'Ні. Реєстрація, кабінет, навчання та ШІ-набір — безкоштовні.'],
    ['Потрібен досвід?', 'Ні. Навчання покроково показує, як робити контент і де його публікувати.'],
    ['Скільки я зароблю?', 'Залежить лише від реальних продажів. Подивіться розрахунок у калькуляторі вище. Ми ніколи не обіцяємо дохід.'],
    ['Коли і як виплати?', `Щотижня, за гроші, які ми отримали і тримали ${r.holdDays} днів (захист від повернень). Основний спосіб — крипта (USDT).`],
    ['Де можна рекламувати?', 'Будь-де, чесно: соцмережі, відео, блоги, спільноти, ваші клієнти. Без спаму, фейкових відгуків і купленого трафіку.'],
  ],
  rules: 'Лише 18+. Лише чесна реклама.',
  rulesLink: 'Повні правила партнерів',
  finalH: 'Готові почати?',
  finalP: 'Створіть безкоштовний акаунт і отримайте перше посилання за хвилину.',
  create: 'Створити акаунт →',
};

const ru: Text = {
  meta: {
    title: 'Партнёрка Vaxo — зарабатывайте, рекомендуя ИИ для бизнеса',
    description: `Рекомендуйте автоматизацию, сайты, чат-боты и шаблоны для бизнеса. До ${r.agencyOwn}% с услуг, до ${r.products.elite}% с продуктов, клиенты закреплены навсегда, выплаты каждую неделю.`,
  },
  eyebrow: 'Партнёрская программа',
  h1: 'Зарабатывайте, рекомендуя ИИ, который реально нужен бизнесу.',
  sub: 'Делитесь нашими услугами и продуктами со своей аудиторией. Получайте деньги за каждую реальную продажу — каждую неделю, пока клиент с нами.',
  join: 'Стать партнёром →',
  login: 'Войти',
  stats: [
    [`${r.agencyOwn}%`, 'с услуг агентства'],
    [`${r.products.elite}%`, 'максимум с наших продуктов'],
    [`+${r.agencyRenewal}%`, 'с каждого продления, навсегда'],
    ['7 дней', 'от продажи до выплаты'],
  ],
  promoteH: 'Что рекомендуете — и сколько зарабатываете',
  directions: [
    {
      name: 'Услуги агентства',
      rate: `${r.agencyGiven}–${r.agencyOwn}%`,
      price: 'сделки от $149',
      what: 'Автоматизация, сайты и ИИ-чат-боты. Наша команда общается с клиентом, готовит предложение и делает работу.',
      points: [`${r.agencyOwn}% — клиент, которого нашли вы`, `${r.agencyGiven}% — тёплый клиент от нас, которого закрываете вы`, `+${r.agencyRenewal}% — каждое продление и ежемесячная оплата`],
    },
    {
      name: 'Наши цифровые продукты',
      rate: `${r.products.start}–${r.products.elite}%`,
      price: '$9 – $67',
      what: 'Готовые шаблоны и руководства для малого бизнеса. Дешёвая и лёгкая первая покупка — идеально для контента.',
      points: [`${r.products.start}% на уровне Start`, `${r.products.pro}% на уровне Pro`, `${r.products.elite}% на уровне Elite`],
    },
    {
      name: 'Офферы партнёров',
      rate: `${r.offers.start}–${r.offers.elite}%`,
      price: 'скоро',
      what: 'Предложения других компаний, проверенные нами. Вы получаете бо́льшую часть того, что компания платит нам.',
      points: [`${r.offers.start}% от выплаты на Start`, `${r.offers.pro}% на Pro`, `${r.offers.elite}% на Elite`],
    },
  ],
  levelsH: 'Растите в уровне — зарабатывайте больше',
  levelsSub: 'Уровень зависит от оплаченных продаж за последние 90 дней и обновляется сам.',
  levelNeed: (n) => (n === 0 ? 'с первого дня' : `${n}+ продаж / 90 дней`),
  levelPerks: {
    start: [`${r.products.start}% с продуктов`, `${r.offers.start}% с офферов партнёров`, 'Бесплатное обучение и ИИ-набор'],
    pro: [`${r.products.pro}% с продуктов`, `${r.offers.pro}% с офферов партнёров`, `Тёплые клиенты от нас (${r.agencyGiven}%)`],
    elite: [`${r.products.elite}% с продуктов`, `${r.offers.elite}% с офферов партнёров`, 'Первым — новые офферы и клиенты'],
  },
  calcH: 'Посчитайте свой доход',
  calcSub: 'Двигайте ползунки. Это пример расчёта по средним ценам, а не обещание.',
  calcAgency: 'Клиентов на услуги в месяц',
  calcProducts: 'Продаж продуктов в месяц',
  calcRenewals: 'Клиентов с ежемесячной оплатой',
  calcLevel: 'Уровень',
  calcMonth: 'в месяц',
  calcYear: 'в год',
  calcNote: `Средние: сделка на услугу $${CALC.agencyAvg}, продукт $${CALC.productAvg}, ежемесячная оплата $${CALC.renewalAvg}. Реальный доход зависит только от реальных продаж.`,
  stepsH: 'Как это работает',
  steps: [
    ['Регистрация', 'Бесплатно, за минуту. Только 18+.'],
    ['Создайте ссылки', 'Сколько угодно — отдельную для каждого канала, видео или аудитории.'],
    ['Рекомендуйте честно', 'Посты, видео, советы. Наш ИИ-набор поможет со сценариями и сообщениями.'],
    ['Выплаты каждую неделю', `За реальные продажи, через ${r.holdDays} дней после оплаты клиента.`],
  ],
  perksH: 'Почему партнёры выбирают Vaxo',
  perks: [
    ['Клиенты ваши навсегда', 'Первая ссылка, по которой пришёл клиент, сохраняется. Купит снова через год — ваш.'],
    ['Сложное делаем мы', 'Созвоны, предложения, выполнение, поддержка — на нашей команде. Вы приводите людей.'],
    ['Статистика по каждой ссылке', 'Клики, заявки, ваша команда — прямо в кабинете.'],
    ['Стройте команду', `Приглашайте партнёров и получайте +${r.team}% от их заработка — сверху, от нас. Никогда за само приглашение.`],
  ],
  aiH: 'Ваш ИИ-набор — бесплатно или платно, на выбор',
  aiSub: 'В кабинете: готовые промпты, которые открываются в один клик в Claude, ChatGPT или Gemini, и лучшие бесплатные инструменты для каждой задачи.',
  aiItems: [
    ['Сценарии и посты', 'Хуки, сценарии видео, подписи, 10 идей из одного оффера.'],
    ['Сообщения клиентам', 'Первое персональное сообщение, напоминания, ответы на возражения.'],
    ['Видео и картинки', 'Бесплатные инструменты для монтажа, голоса и визуала — и платные, когда вырастете.'],
  ],
  faqH: 'Вопросы',
  faq: [
    ['Это что-то стоит?', 'Нет. Регистрация, кабинет, обучение и ИИ-набор — бесплатные.'],
    ['Нужен опыт?', 'Нет. Обучение пошагово показывает, как делать контент и где его публиковать.'],
    ['Сколько я заработаю?', 'Зависит только от реальных продаж. Посмотрите расчёт в калькуляторе выше. Мы никогда не обещаем доход.'],
    ['Когда и как выплаты?', `Каждую неделю, за деньги, которые мы получили и держали ${r.holdDays} дней (защита от возвратов). Основной способ — крипта (USDT).`],
    ['Где можно рекламировать?', 'Где угодно, честно: соцсети, видео, блоги, сообщества, ваши клиенты. Без спама, фейковых отзывов и купленного трафика.'],
  ],
  rules: 'Только 18+. Только честная реклама.',
  rulesLink: 'Полные правила партнёров',
  finalH: 'Готовы начать?',
  finalP: 'Создайте бесплатный аккаунт и получите первую ссылку за минуту.',
  create: 'Создать аккаунт →',
};

export const PARTNERS_TEXT: Record<Lang, Text> = { en, ua, ru };
