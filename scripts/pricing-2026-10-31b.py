# Simple offer for everyone (Dmitry 31.10.2026 after the HK chat): a cheap one-time launch, and all the value
# grows inside the monthly plan. Rewrites hero cards, launch tiers, FAQ and catalog "from" prices in en/ru/ua.
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
  title='What it costs: a small launch, then we run everything',
  sub='You pay once to build it — from $199. Then a monthly plan keeps it working and growing: the more you need, the more we take off your hands.',
  time=['from $199', '24/7', 'one screen'],
  layers=[
   {'n': '01 / Site', 't': 'A site people find — and that sells', 'd': 'Mobile-first, SEO and full analytics from day one: where visitors come from, what they click, where they leave.'},
   {'n': '02 / AI manager', 't': 'Answers your clients 24/7', 'd': 'Instagram, WhatsApp, Telegram and your site: replies in seconds, books, sells and hands you the hard cases.'},
   {'n': '03 / Command center', 't': 'You see everything and steer', 'd': 'Leads, chats, money, ads and team in one place — with an AI assistant for you and every employee.'}],
  labels=dict(investment='One-time launch', mo='', rangeNote='Then a plan from $39/month. The first month is free.', recommended='MOST CHOSEN'),
  tiers=[
   dict(tag='Launch', problem='Landing page', solution='One page that sells, AI manager in chat, your command center, SEO and analytics.', result='Clients find you and get an answer in seconds, day and night.', strategyTitle='Ready in 3–7 days', strategy=['Free review of what you have now'], items=['Mobile-first page with your offer', 'AI manager trained on your services and prices', 'SEO, Google profile and full analytics', 'Command center: every lead and chat'], referral='', cta='Start for $199'),
   dict(tag='Launch', problem='Site with booking or catalog', solution='Several pages, online booking or a catalog, payments — plus everything from the landing page.', result='Clients book and pay by themselves; you only see the result.', strategyTitle='Ready in 7–14 days', strategy=['Free review + growth plan for 3 months'], items=['Pages for every service', 'Online booking or catalog with payments', 'AI manager in all chats', 'Reminders and follow-ups that bring clients back'], referral='', cta='Choose this'),
   dict(tag='Launch', problem='Store, app or platform', solution='Online store, client app, CRM for your team or a partner program — built around your business.', result='A full system that replaces a team of people.', strategyTitle='Ready in 2–6 weeks', strategy=['Free review + growth plan for 6 months'], items=['Online store, app or platform', 'CRM with staff roles and an AI assistant for each person', 'Partner program for your clients', 'Integrations: payments, delivery, accounting'], referral='', cta='Discuss my project')]),
 'ru': dict(
  title='Сколько стоит: небольшой запуск — дальше всё ведём мы',
  sub='Разово платите за создание — от $199. Дальше подписка держит всё в работе и растит: чем больше вам нужно, тем больше мы снимаем с ваших плеч.',
  time=['от $199', '24/7', '1 экран'],
  layers=[
   {'n': '01 / Сайт', 't': 'Сайт, который находят и который продаёт', 'd': 'Под телефон, с SEO и полной аналитикой с первого дня: откуда приходят люди, что нажимают, где уходят.'},
   {'n': '02 / ИИ-менеджер', 't': 'Отвечает вашим клиентам 24/7', 'd': 'Instagram, WhatsApp, Telegram и сайт: отвечает за секунды, записывает, продаёт и передаёт вам сложные случаи.'},
   {'n': '03 / Пульт', 't': 'Вы видите всё и управляете', 'd': 'Заявки, чаты, деньги, реклама и команда в одном месте — и ИИ-помощник у вас и у каждого сотрудника.'}],
  labels=dict(investment='Создание, разово', mo='', rangeNote='Дальше подписка от $39/мес. Первый месяц — бесплатно.', recommended='ВЫБИРАЮТ ЧАЩЕ'),
  tiers=[
   dict(tag='Запуск', problem='Лендинг', solution='Одна продающая страница, ИИ-менеджер в чате, ваш пульт, SEO и аналитика.', result='Вас находят, а каждый клиент получает ответ за секунды — днём и ночью.', strategyTitle='Готово за 3–7 дней', strategy=['Бесплатный разбор того, что у вас есть сейчас'], items=['Страница под телефон с вашим предложением', 'ИИ-менеджер, обученный на ваших услугах и ценах', 'SEO, Google-карточка и полная аналитика', 'Пульт: каждая заявка и каждый чат'], referral='', cta='Запустить за $199'),
   dict(tag='Запуск', problem='Сайт с записью или каталогом', solution='Несколько страниц, онлайн-запись или каталог, оплаты — и всё, что есть в лендинге.', result='Клиенты сами записываются и платят, вы видите только результат.', strategyTitle='Готово за 7–14 дней', strategy=['Бесплатный разбор + план роста на 3 месяца'], items=['Страницы под каждую услугу', 'Онлайн-запись или каталог с оплатой', 'ИИ-менеджер во всех чатах', 'Напоминания и дожимы, которые возвращают клиентов'], referral='', cta='Выбрать'),
   dict(tag='Запуск', problem='Магазин, приложение или платформа', solution='Интернет-магазин, приложение для клиентов, CRM для команды или партнёрская программа — под ваш бизнес.', result='Полноценная система, которая заменяет команду сотрудников.', strategyTitle='Готово за 2–6 недель', strategy=['Бесплатный разбор + план роста на 6 месяцев'], items=['Интернет-магазин, приложение или платформа', 'CRM с ролями сотрудников и ИИ-помощником у каждого', 'Партнёрская программа для ваших клиентов', 'Интеграции: оплаты, доставка, учёт'], referral='', cta='Обсудить проект')]),
 'ua': dict(
  title='Скільки коштує: невеликий запуск — далі все ведемо ми',
  sub='Разово платите за створення — від $199. Далі підписка тримає все в роботі й ростить: що більше вам потрібно, то більше ми знімаємо з ваших пліч.',
  time=['від $199', '24/7', '1 екран'],
  layers=[
   {'n': '01 / Сайт', 't': 'Сайт, який знаходять і який продає', 'd': 'Під телефон, з SEO і повною аналітикою з першого дня: звідки приходять люди, що натискають, де йдуть.'},
   {'n': '02 / ШІ-менеджер', 't': 'Відповідає вашим клієнтам 24/7', 'd': 'Instagram, WhatsApp, Telegram і сайт: відповідає за секунди, записує, продає й передає вам складні випадки.'},
   {'n': '03 / Пульт', 't': 'Ви бачите все й керуєте', 'd': 'Заявки, чати, гроші, реклама й команда в одному місці — і ШІ-помічник у вас і в кожного працівника.'}],
  labels=dict(investment='Створення, разово', mo='', rangeNote='Далі підписка від $39/міс. Перший місяць — безкоштовно.', recommended='ОБИРАЮТЬ ЧАСТІШЕ'),
  tiers=[
   dict(tag='Запуск', problem='Лендинг', solution='Одна сторінка, що продає, ШІ-менеджер у чаті, ваш пульт, SEO й аналітика.', result='Вас знаходять, а кожен клієнт отримує відповідь за секунди — вдень і вночі.', strategyTitle='Готово за 3–7 днів', strategy=['Безкоштовний розбір того, що у вас є зараз'], items=['Сторінка під телефон з вашою пропозицією', 'ШІ-менеджер, навчений на ваших послугах і цінах', 'SEO, Google-картка й повна аналітика', 'Пульт: кожна заявка й кожен чат'], referral='', cta='Запустити за $199'),
   dict(tag='Запуск', problem='Сайт із записом або каталогом', solution='Кілька сторінок, онлайн-запис або каталог, оплати — і все, що є в лендингу.', result='Клієнти самі записуються й платять, ви бачите лише результат.', strategyTitle='Готово за 7–14 днів', strategy=['Безкоштовний розбір + план зростання на 3 місяці'], items=['Сторінки під кожну послугу', 'Онлайн-запис або каталог з оплатою', 'ШІ-менеджер в усіх чатах', 'Нагадування й дотиснення, що повертають клієнтів'], referral='', cta='Обрати'),
   dict(tag='Запуск', problem='Магазин, застосунок чи платформа', solution='Інтернет-магазин, застосунок для клієнтів, CRM для команди або партнерська програма — під ваш бізнес.', result='Повноцінна система, що замінює команду працівників.', strategyTitle='Готово за 2–6 тижнів', strategy=['Безкоштовний розбір + план зростання на 6 місяців'], items=['Інтернет-магазин, застосунок або платформа', 'CRM з ролями працівників і ШІ-помічником у кожного', 'Партнерська програма для ваших клієнтів', 'Інтеграції: оплати, доставка, облік'], referral='', cta='Обговорити проєкт')]),
}

FAQ = {
 'en': [['How much does it cost?', 'Building is one-time: a landing page $199, a site with booking or a catalog $490, a store, app or platform from $990. Then a monthly plan: Care $39, Growth $129 or Pro $299 — the first month is free.'], ['What exactly do I get for $199?', 'Not just a page: a working system. A mobile-first landing page with SEO and full analytics, an AI manager that answers your clients 24/7, and your command center where you see every lead and chat. Try the live demos at vaxogroup.com/examples.']],
 'ru': [['Сколько это стоит?', 'Создание — разово: лендинг $199, сайт с записью или каталогом $490, магазин, приложение или платформа от $990. Дальше подписка: Care $39, Growth $129 или Pro $299 в месяц — первый месяц бесплатно.'], ['Что именно я получу за $199?', 'Не просто страницу, а работающую систему: лендинг под телефон с SEO и полной аналитикой, ИИ-менеджера, который отвечает вашим клиентам 24/7, и пульт, где вы видите каждую заявку и чат. Живые примеры — vaxogroup.com/examples.']],
 'ua': [['Скільки це коштує?', 'Створення — разово: лендинг $199, сайт із записом або каталогом $490, магазин, застосунок чи платформа від $990. Далі підписка: Care $39, Growth $129 або Pro $299 на місяць — перший місяць безкоштовно.'], ['Що саме я отримаю за $199?', 'Не просто сторінку, а робочу систему: лендинг під телефон з SEO й повною аналітикою, ШІ-менеджера, що відповідає вашим клієнтам 24/7, і пульт, де ви бачите кожну заявку й чат. Живі приклади — vaxogroup.com/examples.']],
}

PRICE = {'en': ['$199', '$490', 'from $990'], 'ru': ['$199', '$490', 'от $990'], 'ua': ['$199', '$490', 'від $990']}
for lang, v in T.items():
    for i, tr in enumerate(v['tiers']): tr['price'] = PRICE[lang][i]
    p = ROOT / 'src/i18n' / f'{lang}.ts'
    s = p.read_text()
    for k, key in (('title', 'tiersTitle'), ('sub', 'tiersSub'), ('time', 'time'), ('layers', 'layers'), ('tiers', 'tiers')):
        s = put(s, key, v[k])
    lab = get(s, 'labels'); lab.update(v['labels']); lab['from'] = ''; s = put(s, 'labels', lab)
    faq = get(s, 'faq'); faq[0] = {'q': FAQ[lang][0][0], 'a': FAQ[lang][0][1]}
    faq.insert(1, {'q': FAQ[lang][1][0], 'a': FAQ[lang][1][1]})
    faq = [f for f in faq if 'Какие сроки' not in f['q'] and 'How fast' not in f['q'] and 'Які терміни' not in f['q']]
    s = put(s, 'faq', faq)
    p.write_text(s)

raw = ROOT / 'src/data/raw.json'
d = json.loads(raw.read_text())
d['TIER_NAMES'] = ['Landing', 'Site + booking', 'Store / app']
d['PRICES'] = ['$199', '$490', '$990']
d['TIMES'] = ['', '', '']
d['SVC_PRICES'][2][0] = '$199 – $1,500'; d['SVC_PRICES'][2][1] = '$490 – $3,500'
raw.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('ok')
