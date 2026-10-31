# Home page in plain words (31.10.2026, Claude's own rebuild after Dmitry: "people must understand everything without
# questions and see the benefit"). Creation price depends on complexity (ranges, not one number from a chat), or free
# with a 12-month plan; the value lives in the monthly plan. Supersedes pricing-2026-10-31b.py texts.
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
dec = json.JSONDecoder()

def put(src, key, value):
    m = re.search(r'\n  "%s": ' % re.escape(key), src)
    _, end = dec.raw_decode(src, m.end())
    return src[:m.end()] + json.dumps(value, ensure_ascii=False, indent=2).replace('\n', '\n  ') + src[end:]

def get(src, key):
    m = re.search(r'\n  "%s": ' % re.escape(key), src)
    return dec.raw_decode(src, m.end())[0]

T = {
 'en': dict(
  h1='A website and an AI employee for your business — we do everything for you',
  sub='We build your website, connect an AI that answers your clients and books them by itself, and give you an app where you see every request and every dollar. You don’t need to understand any of it.',
  cta1='Try it free', cta2='See examples', cta3='How much does it cost',
  tags=['Answers in seconds, 24/7', 'Price in a minute in the chat', 'Cancel the plan any time'],
  time=['ready in days', '24/7', 'all in one app'],
  layers=[
   {'n': '01 / Website', 't': 'A website people find', 'd': 'Beautiful on a phone, found on Google, with full statistics of who comes and why.'},
   {'n': '02 / AI employee', 't': 'Answers clients for you', 'd': 'In Instagram, WhatsApp, Telegram and on the site — day and night. Books, sells, and calls you only when needed.'},
   {'n': '03 / Your app', 't': 'You see and control everything', 'd': 'Requests, chats, money, ads and your team — on one screen in your phone. Change anything with one message.'}],
  title='How much it costs', sub2='Two parts. Creating the system — once, depends on how complex it is. Then a monthly plan: we keep everything working and growing.',
  labels=dict(investment='Creation, once', rangeNote='Exact price from Vax in a minute. Or creation for free with a 12-month Growth or Pro plan.', recommended='MOST CHOSEN'),
  prices=['$150–400', '$400–1,000', 'from $1,000'],
  tiers=[
   dict(tag='Simple', problem='Website for a small business', solution='A page or a small site about you, with an AI employee in the chat.', result='Clients find you and get an answer right away.', strategyTitle='Ready in 3–7 days', strategy=[], items=['Website for phones and computers', 'AI employee trained on your services and prices', 'Google, SEO and full statistics', 'Your app with every request'], referral='', cta='Try it free'),
   dict(tag='Popular', problem='Website with booking or a catalog', solution='Clients book or order and pay by themselves.', result='Fewer calls and messages for you, more paid orders.', strategyTitle='Ready in 7–14 days', strategy=[], items=['Everything from the simple website', 'Online booking or a catalog with payment', 'AI employee in all your chats', 'Reminders that bring clients back'], referral='', cta='Try it free'),
   dict(tag='Big', problem='Store, app or platform', solution='An online store, a client app, a CRM for your team or a partner program.', result='A whole system that does the work of several employees.', strategyTitle='Ready in 2–6 weeks', strategy=[], items=['Store, app or platform', 'Team roles + an AI assistant for every employee', 'Partner program for your clients', 'Payments, delivery and accounting connected'], referral='', cta='Discuss my project')],
  compare=dict(eyebrow='Why it pays off', h='Compare: what you pay elsewhere', cols=['Hire staff', 'Agency', 'AI builder (Wix and others)', 'Vaxo'],
   rows=[['Price per month', 'from $3,300 for one administrator', 'from $1,500', '$17–40 + your time', 'from $39'],
         ['Who does the work', 'you hire and control', 'the agency, slowly', 'you, yourself', 'we and the AI — you just watch'],
         ['Answers clients 24/7', 'no', 'no', 'you set it up yourself', 'yes, from day one'],
         ['Site + ads + social + CRM together', 'different people', 'separate contracts', 'no', 'yes, in one place'],
         ['You see everything', 'by asking', 'a report once a month', 'only site visits', 'live, in one app']],
   note='Market prices 2026: administrator salary in the US — Salary.com, Jooble; agency retainers — SearchLab; Wix plans — WebsiteBuilderExpert.')),
 'ru': dict(
  h1='Сайт и ИИ-сотрудник для вашего бизнеса — мы всё делаем за вас',
  sub='Мы делаем вам сайт, подключаем ИИ, который сам отвечает клиентам и записывает их, и даём приложение, где вы видите каждую заявку и каждый доллар. Разбираться ни в чём не нужно.',
  cta1='Попробовать бесплатно', cta2='Посмотреть примеры', cta3='Сколько стоит',
  tags=['Ответ за секунды, 24/7', 'Цена — за минуту в чате', 'Подписку можно отменить в любой момент'],
  time=['готов за дни', '24/7', 'всё в одном приложении'],
  layers=[
   {'n': '01 / Сайт', 't': 'Сайт, который находят', 'd': 'Красивый на телефоне, его находят в Google, и видно, кто приходит и зачем.'},
   {'n': '02 / ИИ-сотрудник', 't': 'Отвечает клиентам за вас', 'd': 'В Instagram, WhatsApp, Telegram и на сайте — днём и ночью. Записывает, продаёт и зовёт вас, только когда нужно.'},
   {'n': '03 / Ваше приложение', 't': 'Вы видите всё и управляете', 'd': 'Заявки, переписки, деньги, реклама и команда — на одном экране в телефоне. Любое изменение — одним сообщением.'}],
  title='Сколько стоит', sub2='Две части. Создание системы — один раз, цена зависит от сложности. Дальше подписка: мы держим всё в работе и растим.',
  labels=dict(investment='Создание, один раз', rangeNote='Точную цену Vax назовёт за минуту. Или создание бесплатно при подписке Growth или Pro на 12 месяцев.', recommended='ВЫБИРАЮТ ЧАЩЕ'),
  prices=['$150–400', '$400–1 000', 'от $1 000'],
  tiers=[
   dict(tag='Простой', problem='Сайт для небольшого бизнеса', solution='Страница или небольшой сайт о вас — с ИИ-сотрудником в чате.', result='Вас находят, и каждый клиент сразу получает ответ.', strategyTitle='Готово за 3–7 дней', strategy=[], items=['Сайт для телефона и компьютера', 'ИИ-сотрудник, обученный на ваших услугах и ценах', 'Google, SEO и полная статистика', 'Ваше приложение со всеми заявками'], referral='', cta='Попробовать бесплатно'),
   dict(tag='Популярный', problem='Сайт с записью или каталогом', solution='Клиенты сами записываются или заказывают и платят.', result='Меньше звонков и переписки у вас, больше оплаченных заказов.', strategyTitle='Готово за 7–14 дней', strategy=[], items=['Всё, что в простом сайте', 'Онлайн-запись или каталог с оплатой', 'ИИ-сотрудник во всех ваших чатах', 'Напоминания, которые возвращают клиентов'], referral='', cta='Попробовать бесплатно'),
   dict(tag='Большой', problem='Магазин, приложение или платформа', solution='Интернет-магазин, приложение для клиентов, CRM для команды или партнёрская программа.', result='Целая система, которая делает работу нескольких сотрудников.', strategyTitle='Готово за 2–6 недель', strategy=[], items=['Магазин, приложение или платформа', 'Роли для команды + ИИ-помощник у каждого сотрудника', 'Партнёрская программа для ваших клиентов', 'Подключены оплаты, доставка и учёт'], referral='', cta='Обсудить проект')],
  compare=dict(eyebrow='Почему это выгодно', h='Сравните, сколько это стоит в другом месте', cols=['Нанять сотрудников', 'Агентство', 'ИИ-конструктор (Wix и др.)', 'Vaxo'],
   rows=[['Цена в месяц', 'от $3 300 за одного администратора', 'от $1 500', '$17–40 + ваше время', 'от $39'],
         ['Кто делает работу', 'вы нанимаете и контролируете', 'агентство, медленно', 'вы сами', 'мы и ИИ — вы только смотрите'],
         ['Отвечают клиентам 24/7', 'нет', 'нет', 'настраиваете сами', 'да, с первого дня'],
         ['Сайт + реклама + соцсети + CRM вместе', 'разные люди', 'отдельные договоры', 'нет', 'да, в одном месте'],
         ['Вы видите всё', 'когда спросите', 'отчёт раз в месяц', 'только посещения сайта', 'вживую, в одном приложении']],
   note='Цены рынка 2026: зарплата администратора в США — Salary.com, Jooble; агентства — SearchLab; тарифы Wix — WebsiteBuilderExpert.')),
 'ua': dict(
  h1='Сайт і ШІ-працівник для вашого бізнесу — ми все робимо за вас',
  sub='Ми робимо вам сайт, підключаємо ШІ, який сам відповідає клієнтам і записує їх, і даємо застосунок, де ви бачите кожну заявку й кожен долар. Розбиратися ні в чому не треба.',
  cta1='Спробувати безкоштовно', cta2='Подивитися приклади', cta3='Скільки коштує',
  tags=['Відповідь за секунди, 24/7', 'Ціна — за хвилину в чаті', 'Підписку можна скасувати будь-коли'],
  time=['готовий за дні', '24/7', 'усе в одному застосунку'],
  layers=[
   {'n': '01 / Сайт', 't': 'Сайт, який знаходять', 'd': 'Гарний на телефоні, його знаходять у Google, і видно, хто приходить і навіщо.'},
   {'n': '02 / ШІ-працівник', 't': 'Відповідає клієнтам за вас', 'd': 'В Instagram, WhatsApp, Telegram і на сайті — вдень і вночі. Записує, продає й кличе вас, лише коли треба.'},
   {'n': '03 / Ваш застосунок', 't': 'Ви бачите все й керуєте', 'd': 'Заявки, листування, гроші, реклама й команда — на одному екрані в телефоні. Будь-яка зміна — одним повідомленням.'}],
  title='Скільки коштує', sub2='Дві частини. Створення системи — один раз, ціна залежить від складності. Далі підписка: ми тримаємо все в роботі й ростимо.',
  labels=dict(investment='Створення, один раз', rangeNote='Точну ціну Vax назве за хвилину. Або створення безкоштовно при підписці Growth чи Pro на 12 місяців.', recommended='ОБИРАЮТЬ ЧАСТІШЕ'),
  prices=['$150–400', '$400–1 000', 'від $1 000'],
  tiers=[
   dict(tag='Простий', problem='Сайт для невеликого бізнесу', solution='Сторінка або невеликий сайт про вас — із ШІ-працівником у чаті.', result='Вас знаходять, і кожен клієнт одразу отримує відповідь.', strategyTitle='Готово за 3–7 днів', strategy=[], items=['Сайт для телефона й комп’ютера', 'ШІ-працівник, навчений на ваших послугах і цінах', 'Google, SEO й повна статистика', 'Ваш застосунок з усіма заявками'], referral='', cta='Спробувати безкоштовно'),
   dict(tag='Популярний', problem='Сайт із записом або каталогом', solution='Клієнти самі записуються чи замовляють і платять.', result='Менше дзвінків і листування у вас, більше оплачених замовлень.', strategyTitle='Готово за 7–14 днів', strategy=[], items=['Усе, що в простому сайті', 'Онлайн-запис або каталог з оплатою', 'ШІ-працівник в усіх ваших чатах', 'Нагадування, що повертають клієнтів'], referral='', cta='Спробувати безкоштовно'),
   dict(tag='Великий', problem='Магазин, застосунок чи платформа', solution='Інтернет-магазин, застосунок для клієнтів, CRM для команди або партнерська програма.', result='Ціла система, що робить роботу кількох працівників.', strategyTitle='Готово за 2–6 тижнів', strategy=[], items=['Магазин, застосунок або платформа', 'Ролі для команди + ШІ-помічник у кожного працівника', 'Партнерська програма для ваших клієнтів', 'Підключені оплати, доставка й облік'], referral='', cta='Обговорити проєкт')],
  compare=dict(eyebrow='Чому це вигідно', h='Порівняйте, скільки це коштує деінде', cols=['Найняти працівників', 'Агенція', 'ШІ-конструктор (Wix та ін.)', 'Vaxo'],
   rows=[['Ціна на місяць', 'від $3 300 за одного адміністратора', 'від $1 500', '$17–40 + ваш час', 'від $39'],
         ['Хто робить роботу', 'ви наймаєте й контролюєте', 'агенція, повільно', 'ви самі', 'ми й ШІ — ви лише дивитеся'],
         ['Відповідають клієнтам 24/7', 'ні', 'ні', 'налаштовуєте самі', 'так, з першого дня'],
         ['Сайт + реклама + соцмережі + CRM разом', 'різні люди', 'окремі договори', 'ні', 'так, в одному місці'],
         ['Ви бачите все', 'коли спитаєте', 'звіт раз на місяць', 'лише відвідування сайту', 'наживо, в одному застосунку']],
   note='Ціни ринку 2026: зарплата адміністратора в США — Salary.com, Jooble; агенції — SearchLab; тарифи Wix — WebsiteBuilderExpert.')),
}

FAQ = {
 'en': [['How much does it cost?', 'Two parts. Creating it — once, depending on complexity: a simple website $150–400, a site with booking or a catalog $400–1,000, a store or app from $1,000. Or creation for free with a 12-month Growth or Pro plan. Then a monthly plan: Care $39, Growth $129 or Pro $299 — the first month is free.'], ['What do I actually get?', 'A working system, not just a page: a website people find on Google, an AI employee that answers your clients 24/7 in your chats and books them, and an app where you see every request, chat and payment. Try it yourself: tap the raccoon in the corner, or open vaxogroup.com/examples.']],
 'ru': [['Сколько это стоит?', 'Две части. Создание — один раз, по сложности: простой сайт $150–400, сайт с записью или каталогом $400–1 000, магазин или приложение от $1 000. Или создание бесплатно при подписке Growth или Pro на 12 месяцев. Дальше подписка: Care $39, Growth $129 или Pro $299 в месяц — первый месяц бесплатно.'], ['Что я на самом деле получу?', 'Работающую систему, а не просто страницу: сайт, который находят в Google, ИИ-сотрудника, который отвечает вашим клиентам 24/7 в ваших чатах и записывает их, и приложение, где вы видите каждую заявку, переписку и оплату. Попробуйте сами: нажмите на енота в углу или откройте vaxogroup.com/examples.']],
 'ua': [['Скільки це коштує?', 'Дві частини. Створення — один раз, за складністю: простий сайт $150–400, сайт із записом чи каталогом $400–1 000, магазин або застосунок від $1 000. Або створення безкоштовно при підписці Growth чи Pro на 12 місяців. Далі підписка: Care $39, Growth $129 або Pro $299 на місяць — перший місяць безкоштовно.'], ['Що я насправді отримаю?', 'Робочу систему, а не просто сторінку: сайт, який знаходять у Google, ШІ-працівника, що відповідає вашим клієнтам 24/7 у ваших чатах і записує їх, і застосунок, де ви бачите кожну заявку, листування й оплату. Спробуйте самі: натисніть на єнота в куті або відкрийте vaxogroup.com/examples.']],
}

for lang, v in T.items():
    p = ROOT / 'src/i18n' / f'{lang}.ts'
    s = p.read_text()
    for k, key in (('h1', 'h1'), ('sub', 'sub'), ('cta1', 'cta1'), ('cta2', 'cta2'), ('cta3', 'cta3'), ('tags', 'heroTags'), ('time', 'time'), ('layers', 'layers'), ('title', 'tiersTitle'), ('sub2', 'tiersSub')):
        s = put(s, key, v[k])
    for i, tr in enumerate(v['tiers']): tr['price'] = v['prices'][i]
    s = put(s, 'tiers', v['tiers'])
    lab = get(s, 'labels'); lab.update(v['labels']); s = put(s, 'labels', lab)
    faq = get(s, 'faq')
    faq = [f for f in faq if f['q'] not in (FAQ[lang][0][0], FAQ[lang][1][0]) and not f['q'].startswith(('What exactly do I get', 'Что именно я получу', 'Що саме я отримаю'))]
    faq = [{'q': q, 'a': a} for q, a in FAQ[lang]] + faq
    s = put(s, 'faq', faq)
    p.write_text(s)
    (ROOT / 'src/data' / f'compare.{lang}.json').write_text(json.dumps(v['compare'], ensure_ascii=False, indent=1))

raw = ROOT / 'src/data/raw.json'
d = json.loads(raw.read_text())
d['TIER_NAMES'] = ['Simple site', 'Site + booking', 'Store / app']
d['PRICES'] = ['$150–400', '$400–1,000', '$1,000+']
d['SVC_PRICES'][2][0] = '$150 – $1,500'; d['SVC_PRICES'][2][1] = '$400 – $3,500'; d['SVC_PRICES'][2][2] = '$1,000 – $5,000'
raw.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('ok')
