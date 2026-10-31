# One-off: the new offer model (31.10.2026, Dmitry: "decide yourself") — launch once + "we run everything for you"
# subscription. Rewrites tiers, hero/method layers and pricing labels in en/ru/ua, prices in raw.json.
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
dec = json.JSONDecoder()

def put(src: str, key: str, value) -> str:
    m = re.search(r'\n  "%s": ' % re.escape(key), src)
    assert m, key
    start = m.end()
    _, end = dec.raw_decode(src, start)
    txt = json.dumps(value, ensure_ascii=False, indent=2).replace('\n', '\n  ')
    return src[:start] + txt + src[end:]

def get(src: str, key: str):
    m = re.search(r'\n  "%s": ' % re.escape(key), src)
    return dec.raw_decode(src, m.end())[0]

T = {
 'en': dict(
  title='Launch once. Then we run it for you.',
  sub='We build the system in days — site, AI manager, owner command center — and then keep it working, answering and growing every month. You run the business; the rest is ours.',
  time=['days', 'days', 'days'],
  layers=[
   {'n': '01 / Start', 't': 'Launch in days', 'd': 'A site or landing page, an AI manager answering clients 24/7 and your owner command center — live in 7–14 days.'},
   {'n': '02 / Business', 't': 'The business on autopilot', 'd': 'Every channel in one inbox, CRM and roles for your team, auto review replies, bookings, payments and ads with AI advice.'},
   {'n': '03 / Scale', 't': 'Scale and new markets', 'd': 'Online store or app, partner program, integrations and launch in the EU, UK, US or UAE.'}],
  labels=dict(investment='Launch', mo='one-time', rangeNote='Exact price after a free review. Then it runs on a plan from $39/month — we keep everything working for you.', recommended='MOST CHOSEN', strategy='What you get', strategicDetails='What is included', details='What is included'),
  tiers=[
   dict(tag='Package 01', problem='Clients write at night and on weekends — and nobody answers. No proper site.', solution='A site that sells + an AI manager in chat + your command center.', result='Every inquiry gets an answer in seconds and lands in one place. You see everything from your phone.', strategyTitle='Free review + 3-month growth plan', strategy=['What to launch first and why', 'Which channels bring clients in your niche', 'Numbers to aim for in 90 days'], items=['Landing page or small site, mobile-first, basic SEO and Google profile', 'AI manager trained on your services, prices and FAQ', 'Owner command center: leads, chats, simple analytics', 'First month of the Growth plan — free'], referral='', cta='Start with Start'),
   dict(tag='Package 02', problem='Inquiries come from 5 places, the team loses them, reviews go unanswered.', solution='The whole business in one system: all chats, CRM, roles, automations, ads.', result='No lost clients, the team knows what to do every day, the owner sees every number.', strategyTitle='Growth strategy for 6 months', strategy=['Funnel and offer for each audience segment', 'Ad plan with budget and target cost per lead', 'Which processes the AI takes over'], items=['Multi-page site or booking/catalog, payments', 'AI manager in Instagram, WhatsApp, Telegram, site; auto review replies', 'CRM with roles and access for staff + AI assistant for each person', 'Automations: reminders, follow-ups, win-back', 'Ads setup (Meta/Google) with AI budget advice', 'First month of the Growth plan — free'], referral='Referral program for your clients — included.', cta='Choose Business'),
   dict(tag='Package 03', problem='The system works, but growth needs its own product, partners or new countries.', solution='Store, app or platform + partner program + new markets.', result='A new sales channel and partners who bring clients for a commission.', strategyTitle='12-month scale plan', strategy=['Product and market entry plan', 'Partner program economics', 'Integrations and data'], items=['Online store, client app or SaaS platform', 'Partner program: links, levels, payouts, AI coach for partners', 'Integrations (payments, delivery, accounting, any CRM)', 'Localization and launch in new markets', 'First month of the Pro plan — free'], referral='Multi-level partner program — included.', cta='Discuss Scale')]),
 'ru': dict(
  title='Запускаем один раз. Дальше ведём всё за вас.',
  sub='За несколько дней собираем систему — сайт, ИИ-менеджера и пульт владельца, — а потом каждый месяц держим её в работе, отвечаем клиентам и растим. Вы занимаетесь бизнесом, остальное — наше.',
  time=['дней', 'дней', 'дней'],
  layers=[
   {'n': '01 / Start', 't': 'Запуск за дни', 'd': 'Сайт или лендинг, ИИ-менеджер, который отвечает клиентам 24/7, и ваш пульт владельца — работают через 7–14 дней.'},
   {'n': '02 / Business', 't': 'Бизнес на автопилоте', 'd': 'Все каналы в одном окне, CRM и роли для команды, автоответы на отзывы, запись, оплаты и реклама с советами ИИ.'},
   {'n': '03 / Scale', 't': 'Масштаб и новые рынки', 'd': 'Интернет-магазин или приложение, партнёрская программа, интеграции и выход в ЕС, Великобританию, США или ОАЭ.'}],
  labels=dict(investment='Запуск', mo='разово', rangeNote='Точную цену называем после бесплатного разбора. Дальше система работает на подписке от $39/мес — мы ведём всё за вас.', recommended='ВЫБИРАЮТ ЧАЩЕ', strategy='Что вы получаете', strategicDetails='Что входит', details='Что входит'),
  tiers=[
   dict(tag='Пакет 01', problem='Клиенты пишут ночью и в выходные — и им никто не отвечает. Нормального сайта нет.', solution='Сайт, который продаёт, + ИИ-менеджер в чате + ваш пульт.', result='Каждая заявка получает ответ за секунды и попадает в одно место. Вы видите всё с телефона.', strategyTitle='Бесплатный разбор + план роста на 3 месяца', strategy=['Что запускать первым и почему', 'Какие каналы приводят клиентов в вашей нише', 'Цифры, к которым идём за 90 дней'], items=['Лендинг или небольшой сайт: под телефон, базовое SEO и Google-карточка', 'ИИ-менеджер, обученный на ваших услугах, ценах и частых вопросах', 'Пульт владельца: заявки, чаты, простая аналитика', 'Первый месяц подписки Growth — в подарок'], referral='', cta='Начать со Start'),
   dict(tag='Пакет 02', problem='Заявки приходят из пяти мест, команда их теряет, отзывы висят без ответа.', solution='Весь бизнес в одной системе: все чаты, CRM, роли, автоматизации, реклама.', result='Клиенты не теряются, команда знает, что делать каждый день, владелец видит каждую цифру.', strategyTitle='Стратегия роста на 6 месяцев', strategy=['Воронка и предложение для каждого сегмента', 'План рекламы с бюджетом и целевой ценой заявки', 'Какие процессы забирает ИИ'], items=['Многостраничный сайт или запись/каталог, оплаты', 'ИИ-менеджер в Instagram, WhatsApp, Telegram и на сайте; автоответы на отзывы', 'CRM с ролями и доступами + ИИ-помощник у каждого сотрудника', 'Автоматизации: напоминания, дожимы, возврат клиентов', 'Настройка рекламы (Meta/Google) с советами ИИ по бюджету', 'Первый месяц подписки Growth — в подарок'], referral='Реферальная программа для ваших клиентов — включена.', cta='Выбрать Business'),
   dict(tag='Пакет 03', problem='Система работает, но для роста нужен свой продукт, партнёры или новые страны.', solution='Магазин, приложение или платформа + партнёрская программа + новые рынки.', result='Новый канал продаж и партнёры, которые приводят клиентов за комиссию.', strategyTitle='План масштабирования на 12 месяцев', strategy=['Продукт и план выхода на рынок', 'Экономика партнёрской программы', 'Интеграции и данные'], items=['Интернет-магазин, приложение для клиентов или SaaS-платформа', 'Партнёрская программа: ссылки, уровни, выплаты, ИИ-тренер для партнёров', 'Интеграции (оплаты, доставка, учёт, любая CRM)', 'Локализация и запуск на новых рынках', 'Первый месяц подписки Pro — в подарок'], referral='Многоуровневая партнёрская программа — включена.', cta='Обсудить Scale')]),
 'ua': dict(
  title='Запускаємо один раз. Далі ведемо все за вас.',
  sub='За кілька днів збираємо систему — сайт, ШІ-менеджера і пульт власника, — а потім щомісяця тримаємо її в роботі, відповідаємо клієнтам і ростимо. Ви займаєтесь бізнесом, решта — наше.',
  time=['днів', 'днів', 'днів'],
  layers=[
   {'n': '01 / Start', 't': 'Запуск за дні', 'd': 'Сайт або лендинг, ШІ-менеджер, що відповідає клієнтам 24/7, і ваш пульт власника — працюють за 7–14 днів.'},
   {'n': '02 / Business', 't': 'Бізнес на автопілоті', 'd': 'Усі канали в одному вікні, CRM і ролі для команди, автовідповіді на відгуки, запис, оплати й реклама з порадами ШІ.'},
   {'n': '03 / Scale', 't': 'Масштаб і нові ринки', 'd': 'Інтернет-магазин або застосунок, партнерська програма, інтеграції та вихід у ЄС, Велику Британію, США чи ОАЕ.'}],
  labels=dict(investment='Запуск', mo='разово', rangeNote='Точну ціну називаємо після безкоштовного розбору. Далі система працює на підписці від $39/міс — ми ведемо все за вас.', recommended='ОБИРАЮТЬ ЧАСТІШЕ', strategy='Що ви отримуєте', strategicDetails='Що входить', details='Що входить'),
  tiers=[
   dict(tag='Пакет 01', problem='Клієнти пишуть уночі й у вихідні — і їм ніхто не відповідає. Нормального сайту немає.', solution='Сайт, що продає, + ШІ-менеджер у чаті + ваш пульт.', result='Кожна заявка отримує відповідь за секунди й потрапляє в одне місце. Ви бачите все з телефона.', strategyTitle='Безкоштовний розбір + план зростання на 3 місяці', strategy=['Що запускати першим і чому', 'Які канали приводять клієнтів у вашій ніші', 'Цифри, до яких ідемо за 90 днів'], items=['Лендинг або невеликий сайт: під телефон, базове SEO і Google-картка', 'ШІ-менеджер, навчений на ваших послугах, цінах і частих питаннях', 'Пульт власника: заявки, чати, проста аналітика', 'Перший місяць підписки Growth — у подарунок'], referral='', cta='Почати зі Start'),
   dict(tag='Пакет 02', problem='Заявки приходять із п’яти місць, команда їх губить, відгуки висять без відповіді.', solution='Весь бізнес в одній системі: усі чати, CRM, ролі, автоматизації, реклама.', result='Клієнти не губляться, команда знає, що робити щодня, власник бачить кожну цифру.', strategyTitle='Стратегія зростання на 6 місяців', strategy=['Воронка й пропозиція для кожного сегмента', 'План реклами з бюджетом і цільовою ціною заявки', 'Які процеси забирає ШІ'], items=['Багатосторінковий сайт або запис/каталог, оплати', 'ШІ-менеджер в Instagram, WhatsApp, Telegram і на сайті; автовідповіді на відгуки', 'CRM з ролями й доступами + ШІ-помічник у кожного працівника', 'Автоматизації: нагадування, дотиснення, повернення клієнтів', 'Налаштування реклами (Meta/Google) з порадами ШІ щодо бюджету', 'Перший місяць підписки Growth — у подарунок'], referral='Реферальна програма для ваших клієнтів — включена.', cta='Обрати Business'),
   dict(tag='Пакет 03', problem='Система працює, але для зростання потрібен свій продукт, партнери чи нові країни.', solution='Магазин, застосунок чи платформа + партнерська програма + нові ринки.', result='Новий канал продажів і партнери, які приводять клієнтів за комісію.', strategyTitle='План масштабування на 12 місяців', strategy=['Продукт і план виходу на ринок', 'Економіка партнерської програми', 'Інтеграції та дані'], items=['Інтернет-магазин, застосунок для клієнтів або SaaS-платформа', 'Партнерська програма: посилання, рівні, виплати, ШІ-тренер для партнерів', 'Інтеграції (оплати, доставка, облік, будь-яка CRM)', 'Локалізація й запуск на нових ринках', 'Перший місяць підписки Pro — у подарунок'], referral='Багаторівнева партнерська програма — включена.', cta='Обговорити Scale')]),
}

for lang, v in T.items():
    p = ROOT / 'src/i18n' / f'{lang}.ts'
    s = p.read_text()
    s = put(s, 'tiersTitle', v['title'])
    s = put(s, 'tiersSub', v['sub'])
    s = put(s, 'time', v['time'])
    s = put(s, 'layers', v['layers'])
    s = put(s, 'tiers', v['tiers'])
    lab = get(s, 'labels'); lab.update(v['labels']); s = put(s, 'labels', lab)
    p.write_text(s)

raw = ROOT / 'src/data/raw.json'
d = json.loads(raw.read_text())
d['TIER_NAMES'] = ['Start', 'Business', 'Scale']
d['PRICES'] = ['$590', '$1,490', '$3,900']  # shown as «from $590 one-time»
d['TIMES'] = ['7–14', '14–30', '30–90']
# Catalog: premium where it was priced like a freelance marketplace (Decision 27, table)
svc = d['SVC_PRICES']
svc[2][0] = '$500 – $2,000'; svc[2][2] = '$2,000 – $8,000'
svc[5][0] = '$300 – $1,200'
svc[6] = ['$40 – $120 / 500 words', '$20 – $60 / 500 words']
raw.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('ok')

# FAQ and referral copy for the new model
FAQ = {
 'en': [
  ['How much does it cost?', 'Launch is one-time: Start from $590, Business from $1,490, Scale from $3,900. Then the system runs on a plan: Care $39, Growth $129 or Pro $299 a month. The first month of the plan is included in every launch.'],
  ['Why a monthly plan?', 'A site with an AI manager is a living system: it answers clients every day, needs hosting, security, updates and improvements. On the plan we do all of it for you — you never hire a developer or a marketer for small things.'],
  ['What if I want to stop the plan?', 'You can stop any time. The design and content are yours; we help move the site to your own hosting. The AI manager, command center and our support work only while the plan is active.'],
  ['How fast?', 'Start — 7–14 days, Business — 14–30 days, Scale — 30–90 days. Small tasks — from minutes to a couple of days.'],
  ['Do I need a call to start?', 'No. Tell Vax in the chat what you need — he gives a price range in a minute and a manager continues in writing. A call only if you want one.'],
  ['How do I pay?', 'Launch: 50% to start, 50% after you approve the result (from $3,000 — in 3 stages). Plans — monthly in advance, by card. Pay a year at once — 2 months free.'],
  ['Who will be in touch?', 'One personal manager plus Vax, our AI manager, 24/7. Everything — progress, files, payments — in your client cabinet.'],
  ['Do you work with my country and niche?', 'Yes — worldwide, in English, Ukrainian and Russian, any niche: local services, clinics, online stores, SaaS, apps.'],
 ],
 'ru': [
  ['Сколько это стоит?', 'Запуск — разово: Start от $590, Business от $1 490, Scale от $3 900. Дальше система работает на подписке: Care $39, Growth $129 или Pro $299 в месяц. Первый месяц подписки входит в каждый запуск.'],
  ['Зачем подписка?', 'Сайт с ИИ-менеджером — живая система: каждый день отвечает клиентам, ей нужны хостинг, защита, обновления и улучшения. На подписке всё это делаем мы — вам не нужно искать разработчика или маркетолога ради мелочей.'],
  ['А если я захочу отключить подписку?', 'Можно в любой момент. Дизайн и тексты — ваши, поможем перенести сайт на ваш хостинг. ИИ-менеджер, пульт владельца и наша поддержка работают, пока подписка активна.'],
  ['Какие сроки?', 'Start — 7–14 дней, Business — 14–30 дней, Scale — 30–90 дней. Небольшие задачи — от минут до пары дней.'],
  ['Нужен ли созвон, чтобы начать?', 'Нет. Напишите Vax в чат, что нужно, — он за минуту назовёт вилку цены, дальше менеджер продолжит письменно. Созвон — только если вы хотите.'],
  ['Как оплатить?', 'Запуск: 50% на старт и 50% после того, как вы одобрите результат (от $3 000 — в 3 этапа). Подписка — помесячно наперёд, картой. Оплата за год — 2 месяца в подарок.'],
  ['Кто будет на связи?', 'Один личный менеджер и Vax — наш ИИ-менеджер 24/7. Всё — ход работы, файлы, платежи — в вашем кабинете клиента.'],
  ['Работаете с моей страной и нишей?', 'Да — по всему миру, на английском, украинском и русском, с любой нишей: местные услуги, клиники, интернет-магазины, SaaS, приложения.'],
 ],
 'ua': [
  ['Скільки це коштує?', 'Запуск — разово: Start від $590, Business від $1 490, Scale від $3 900. Далі система працює на підписці: Care $39, Growth $129 або Pro $299 на місяць. Перший місяць підписки входить у кожен запуск.'],
  ['Навіщо підписка?', 'Сайт із ШІ-менеджером — жива система: щодня відповідає клієнтам, їй потрібні хостинг, захист, оновлення й покращення. На підписці все це робимо ми — вам не треба шукати розробника чи маркетолога заради дрібниць.'],
  ['А якщо я захочу вимкнути підписку?', 'Можна будь-коли. Дизайн і тексти — ваші, допоможемо перенести сайт на ваш хостинг. ШІ-менеджер, пульт власника й наша підтримка працюють, поки підписка активна.'],
  ['Які терміни?', 'Start — 7–14 днів, Business — 14–30 днів, Scale — 30–90 днів. Невеликі задачі — від хвилин до пари днів.'],
  ['Чи потрібен дзвінок, щоб почати?', 'Ні. Напишіть Vax у чат, що потрібно, — він за хвилину назве вилку ціни, далі менеджер продовжить письмово. Дзвінок — лише якщо ви хочете.'],
  ['Як оплатити?', 'Запуск: 50% на старт і 50% після того, як ви схвалите результат (від $3 000 — у 3 етапи). Підписка — щомісяця наперед, карткою. Оплата за рік — 2 місяці в подарунок.'],
  ['Хто буде на зв’язку?', 'Один особистий менеджер і Vax — наш ШІ-менеджер 24/7. Усе — хід роботи, файли, платежі — у вашому кабінеті клієнта.'],
  ['Працюєте з моєю країною та нішею?', 'Так — по всьому світу, англійською, українською та російською, з будь-якою нішею: місцеві послуги, клініки, інтернет-магазини, SaaS, застосунки.'],
 ],
}
for lang, rows in FAQ.items():
    p = ROOT / 'src/i18n' / f'{lang}.ts'
    s = p.read_text()
    s = put(s, 'faq', [{'q': q, 'a': a} for q, a in rows])
    s = s.replace('"tier": "Foundation"', '"tier": "Start"').replace('"tier": "Growth"', '"tier": "Business"')
    s = s.replace('Growth и Scale', 'Business и Scale').replace('Growth і Scale', 'Business і Scale').replace('Growth and Scale', 'Business and Scale')
    p.write_text(s)
print('faq ok')
