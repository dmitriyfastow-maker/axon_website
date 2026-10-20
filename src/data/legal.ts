// Legal pages: Terms of Service (with payment and refund rules), Privacy Policy, Partner Terms. EN / RU / UA.
// The English version prevails. Numbers (hold days, rates) come from the partner program file, so pages never disagree.
import type { Lang } from '../i18n';
import { RATES } from './partners';

export type Doc = 'terms' | 'privacy' | 'partner';
type Section = [string, string[]];
type Page = { title: string; desc: string; updated: string; note: string; sections: Section[] };

const r = RATES;
const UPDATED = { en: 'Last updated: 20 October 2026', ru: 'Обновлено: 20 октября 2026', ua: 'Оновлено: 20 жовтня 2026' };
const NOTE = {
  en: 'Written in plain words on purpose. If something is unclear, ask in your chat with us before paying.',
  ru: 'Написано простыми словами специально. Если что-то непонятно — спросите в чате до оплаты. При расхождении действует английская версия.',
  ua: 'Написано простими словами навмисно. Якщо щось незрозуміло — запитайте в чаті до оплати. У разі розбіжностей діє англійська версія.',
};

export const LEGAL: Record<Doc, Record<Lang, Page>> = {
  terms: {
    en: { title: 'Terms of Service and Refunds', desc: 'How ordering, payment, delivery and refunds work at Vaxo.', updated: UPDATED.en, note: NOTE.en, sections: [
      ['1. Who we are', ['Vaxo is a digital studio (vaxogroup.com). Legal details of the seller are shown on every invoice. Contact: hello@vaxogroup.com or your project chat.']],
      ['2. AI in our work', ['We use AI tools to build, write and communicate. Vax, the manager in your chat, is an AI assistant; a human joins on request. All work is checked before delivery.']],
      ['3. Order and price', ['Every order has a written scope, price and delivery date in your project chat or invoice. Work outside that scope is quoted separately before we do it.']],
      ['4. Payment', ['Starter packages and products are paid 100% in advance. Projects from $1,000 are paid 50% before start and 50% before launch, unless the invoice says otherwise. Monthly services are paid in advance for each month. Work starts after payment arrives.']],
      ['5. Delivery and acceptance', ['We send a preview and include the number of revision rounds stated in your order (usually 2). You accept the work by approving it in the chat, or automatically 7 days after delivery if you send no specific remarks.']],
      ['6. Refunds', [
        'Until work starts: full refund, minus payment-provider fees. Work starts as soon as the payment arrives — the "In progress" status appears in your project chat at that moment. If you want time to think, simply do not pay yet: the quote stays valid for 14 days.',
        'After work starts: the payment is not refundable. The only exception is our fault: if we miss the agreed date by more than 14 days for reasons on our side, you may cancel and get back the money for the part not yet delivered.',
        'After acceptance: no refunds.',
        'Monthly services: cancel any time; the current paid month is not refunded.',
        'Digital products (templates, kits): no refunds after download; if a file is broken we replace it.',
        'Chargebacks without first contacting us are treated as a breach; we stop all work and access until it is resolved.',
      ]],
      ['7. EU and UK consumers', ['By law, private consumers in the EU and UK may withdraw within 14 days. When you pay, you ask us to start at once, so if you withdraw you pay for the work already done, and the right ends when the service is fully performed. Digital content: the right ends when the download starts. Business clients do not have this right.']],
      ['8. Your content and accounts', ['You confirm you have the rights to the texts, photos and logos you give us. Domains, hosting, app store and ad accounts are registered in your name and stay yours; we help you set them up.']],
      ['9. Ownership', ['After full payment you own the final work we made for you. We may show it in our portfolio unless you ask us not to. Third-party tools, fonts and stock assets keep their own licenses.']],
      ['10. No guarantees of results', ['We do our best, but we do not guarantee sales, leads, rankings, views or ad results: they depend on your market, budget and offer.']],
      ['11. Liability', ['Our total liability for any claim is limited to the amount you paid for the affected order in the last 3 months. We are not liable for indirect losses or for third-party services (hosting, platforms, payment providers) going down.']],
      ['12. Conduct', ['We do not work on illegal, deceptive or adult content, and we may stop a project that breaks this. Abusive behaviour in the chat may end the cooperation; paid, completed work stays paid.']],
      ['13. Changes and disputes', ['We may update these terms; the version on the day of your payment applies to that order. We solve disputes by talking first in your chat; if that fails, by the law stated on the invoice.']],
    ] },
    ru: { title: 'Условия работы и возвраты', desc: 'Как в Vaxo работают заказ, оплата, сдача и возвраты.', updated: UPDATED.ru, note: NOTE.ru, sections: [
      ['1. Кто мы', ['Vaxo — digital-студия (vaxogroup.com). Реквизиты продавца указаны в каждом счёте. Связь: hello@vaxogroup.com или чат вашего проекта.']],
      ['2. ИИ в работе', ['Мы используем ИИ для разработки, текстов и общения. Vax, менеджер в вашем чате, — ИИ-ассистент; человек подключается по просьбе. Вся работа проверяется перед сдачей.']],
      ['3. Заказ и цена', ['У каждого заказа есть письменный объём, цена и срок — в чате проекта или в счёте. Работа сверх объёма оценивается отдельно до начала.']],
      ['4. Оплата', ['Стартовые пакеты и продукты — 100% предоплата. Проекты от $1 000 — 50% до старта и 50% перед запуском, если в счёте не указано иное. Ежемесячные услуги — предоплата за каждый месяц. Работа начинается после поступления оплаты.']],
      ['5. Сдача и приёмка', ['Мы присылаем превью и делаем столько кругов правок, сколько указано в заказе (обычно 2). Работа принята, когда вы подтвердили её в чате, или автоматически через 7 дней после сдачи, если не было конкретных замечаний.']],
      ['6. Возвраты', [
        'Пока работа не началась: полный возврат за вычетом комиссии платёжной системы. Работа начинается сразу после поступления оплаты — в этот момент в чате проекта появляется статус «В работе». Хотите подумать — просто не оплачивайте: предложение действует 14 дней.',
        'После начала работ: оплата не возвращается. Единственное исключение — наша вина: если мы просрочили согласованный срок больше чем на 14 дней по своей причине, вы можете отказаться и получить деньги за ещё не сданную часть.',
        'После приёмки: возврата нет.',
        'Ежемесячные услуги: можно отменить в любой момент; текущий оплаченный месяц не возвращается.',
        'Цифровые продукты (шаблоны, наборы): после скачивания возврата нет; если файл повреждён — заменим.',
        'Оспаривание платежа в банке без обращения к нам считается нарушением: работа и доступы приостанавливаются до решения.',
      ]],
      ['7. Потребители из ЕС и Великобритании', ['По закону частные потребители из ЕС и Великобритании могут отказаться в течение 14 дней. Оплачивая, вы просите начать сразу, поэтому при отказе вы оплачиваете уже сделанную работу, а право заканчивается, когда услуга полностью выполнена. Цифровой контент: право заканчивается с началом скачивания. У бизнес-клиентов этого права нет.']],
      ['8. Ваши материалы и аккаунты', ['Вы подтверждаете права на тексты, фото и логотипы, которые даёте. Домены, хостинг, аккаунты магазинов приложений и рекламы оформляются на вас и остаются вашими; мы помогаем их настроить.']],
      ['9. Права на работу', ['После полной оплаты итоговая работа ваша. Мы можем показать её в портфолио, если вы не против. Сторонние сервисы, шрифты и стоки — по их лицензиям.']],
      ['10. Без гарантий результата', ['Мы делаем максимум, но не гарантируем продажи, заявки, позиции, просмотры или результаты рекламы — они зависят от рынка, бюджета и предложения.']],
      ['11. Ответственность', ['Наша общая ответственность ограничена суммой, оплаченной за соответствующий заказ за последние 3 месяца. Мы не отвечаем за косвенные убытки и сбои сторонних сервисов (хостинг, платформы, платёжные системы).']],
      ['12. Поведение', ['Мы не берём незаконные, обманные и взрослые проекты и можем остановить проект, который это нарушает. Оскорбления в чате могут прекратить сотрудничество; оплаченная выполненная работа остаётся оплаченной.']],
      ['13. Изменения и споры', ['Мы можем обновлять условия; к заказу применяется версия на день оплаты. Споры решаем сначала переговорами в чате, затем — по праву, указанному в счёте.']],
    ] },
    ua: { title: 'Умови роботи та повернення', desc: 'Як у Vaxo працюють замовлення, оплата, здача та повернення.', updated: UPDATED.ua, note: NOTE.ua, sections: [
      ['1. Хто ми', ['Vaxo — digital-студія (vaxogroup.com). Реквізити продавця вказані в кожному рахунку. Звʼязок: hello@vaxogroup.com або чат вашого проєкту.']],
      ['2. ШІ в роботі', ['Ми використовуємо ШІ для розробки, текстів і спілкування. Vax, менеджер у вашому чаті, — ШІ-асистент; людина підключається на прохання. Уся робота перевіряється перед здачею.']],
      ['3. Замовлення і ціна', ['Кожне замовлення має письмовий обсяг, ціну і строк — у чаті проєкту або в рахунку. Робота понад обсяг оцінюється окремо до початку.']],
      ['4. Оплата', ['Стартові пакети і продукти — 100% передоплата. Проєкти від $1 000 — 50% до старту і 50% перед запуском, якщо в рахунку не вказано інше. Щомісячні послуги — передоплата за кожен місяць. Робота починається після надходження оплати.']],
      ['5. Здача і приймання', ['Ми надсилаємо превʼю і робимо стільки кіл правок, скільки вказано в замовленні (зазвичай 2). Роботу прийнято, коли ви підтвердили її в чаті, або автоматично через 7 днів після здачі, якщо не було конкретних зауважень.']],
      ['6. Повернення', [
        'Поки робота не почалася: повне повернення за вирахуванням комісії платіжної системи. Робота починається одразу після надходження оплати — у цей момент у чаті проєкту зʼявляється статус «В роботі». Хочете подумати — просто не оплачуйте: пропозиція діє 14 днів.',
        'Після початку робіт: оплата не повертається. Єдиний виняток — наша вина: якщо ми прострочили погоджений строк більш ніж на 14 днів з власної причини, ви можете відмовитися й отримати гроші за ще не здану частину.',
        'Після приймання: повернення немає.',
        'Щомісячні послуги: можна скасувати будь-коли; поточний оплачений місяць не повертається.',
        'Цифрові продукти (шаблони, набори): після завантаження повернення немає; якщо файл пошкоджений — замінимо.',
        'Оскарження платежу в банку без звернення до нас вважається порушенням: роботу і доступи призупиняємо до вирішення.',
      ]],
      ['7. Споживачі з ЄС і Великої Британії', ['За законом приватні споживачі з ЄС і Великої Британії можуть відмовитися протягом 14 днів. Оплачуючи, ви просите почати одразу, тому при відмові ви оплачуєте вже зроблену роботу, а право закінчується, коли послугу повністю виконано. Цифровий контент: право закінчується з початком завантаження. У бізнес-клієнтів цього права немає.']],
      ['8. Ваші матеріали й акаунти', ['Ви підтверджуєте права на тексти, фото і логотипи, які надаєте. Домени, хостинг, акаунти магазинів застосунків і реклами оформлюються на вас і залишаються вашими; ми допомагаємо їх налаштувати.']],
      ['9. Права на роботу', ['Після повної оплати підсумкова робота ваша. Ми можемо показати її в портфоліо, якщо ви не проти. Сторонні сервіси, шрифти й стоки — за їхніми ліцензіями.']],
      ['10. Без гарантій результату', ['Ми робимо максимум, але не гарантуємо продажі, заявки, позиції, перегляди чи результати реклами — вони залежать від ринку, бюджету і пропозиції.']],
      ['11. Відповідальність', ['Наша загальна відповідальність обмежена сумою, сплаченою за відповідне замовлення за останні 3 місяці. Ми не відповідаємо за непрямі збитки і збої сторонніх сервісів.']],
      ['12. Поведінка', ['Ми не беремо незаконні, оманливі й дорослі проєкти і можемо зупинити проєкт, що це порушує. Образи в чаті можуть припинити співпрацю; оплачена виконана робота залишається оплаченою.']],
      ['13. Зміни і спори', ['Ми можемо оновлювати умови; до замовлення застосовується версія на день оплати. Спори вирішуємо спершу переговорами в чаті, далі — за правом, указаним у рахунку.']],
    ] },
  },
  privacy: {
    en: { title: 'Privacy Policy', desc: 'What data Vaxo collects and why.', updated: UPDATED.en, note: NOTE.en, sections: [
      ['What we collect', ['Only what you send us: your name, contact (email, phone or messenger), messages in your project chat and the details of your order. For page statistics we count visits without cookies and without storing your IP address.']],
      ['Why', ['To answer you, do the work you ordered, pay partners their commission and improve the site. We never sell your data.']],
      ['AI', ['Your messages are processed by AI models running on Cloudflare to write answers and summaries. They are not used to train public models by us.']],
      ['Who else sees it', ['Services that run our work: Cloudflare (site, database, AI), Telegram and WhatsApp (if you write there), our email provider, and payment providers. A manager who takes your project sees your messages and contact only to work on your order, and must talk to you only through Vaxo channels.']],
      ['How long', ['As long as we work together and up to 3 years after, unless the law asks for longer (invoices).']],
      ['Your rights', ['Ask us at hello@vaxogroup.com to see, correct or delete your data. We answer within 30 days.']],
      ['Age', ['Our services and partner program are for people aged 18 and over.']],
    ] },
    ru: { title: 'Политика конфиденциальности', desc: 'Какие данные собирает Vaxo и зачем.', updated: UPDATED.ru, note: NOTE.ru, sections: [
      ['Что мы собираем', ['Только то, что вы присылаете: имя, контакт (почта, телефон или мессенджер), сообщения в чате проекта и детали заказа. Для статистики считаем посещения без cookies и без сохранения IP-адреса.']],
      ['Зачем', ['Чтобы ответить вам, выполнить заказ, выплатить партнёрам их процент и улучшать сайт. Мы никогда не продаём ваши данные.']],
      ['ИИ', ['Ваши сообщения обрабатываются ИИ-моделями на серверах Cloudflare, чтобы писать ответы и сводки. Мы не используем их для обучения публичных моделей.']],
      ['Кто ещё видит', ['Сервисы, на которых мы работаем: Cloudflare (сайт, база, ИИ), Telegram и WhatsApp (если пишете туда), почтовый сервис, платёжные системы. Менеджер, который ведёт ваш проект, видит сообщения и контакт только для работы над заказом и обязан общаться с вами только через каналы Vaxo.']],
      ['Сколько храним', ['Пока работаем вместе и до 3 лет после, если закон не требует дольше (счета).']],
      ['Ваши права', ['Напишите на hello@vaxogroup.com, чтобы посмотреть, исправить или удалить свои данные. Отвечаем в течение 30 дней.']],
      ['Возраст', ['Наши услуги и партнёрская программа — только для людей от 18 лет.']],
    ] },
    ua: { title: 'Політика конфіденційності', desc: 'Які дані збирає Vaxo і навіщо.', updated: UPDATED.ua, note: NOTE.ua, sections: [
      ['Що ми збираємо', ['Лише те, що ви надсилаєте: імʼя, контакт (пошта, телефон або месенджер), повідомлення в чаті проєкту і деталі замовлення. Для статистики рахуємо відвідування без cookies і без збереження IP-адреси.']],
      ['Навіщо', ['Щоб відповісти вам, виконати замовлення, виплатити партнерам їхній відсоток і покращувати сайт. Ми ніколи не продаємо ваші дані.']],
      ['ШІ', ['Ваші повідомлення обробляються ШІ-моделями на серверах Cloudflare, щоб писати відповіді та зведення. Ми не використовуємо їх для навчання публічних моделей.']],
      ['Хто ще бачить', ['Сервіси, на яких ми працюємо: Cloudflare (сайт, база, ШІ), Telegram і WhatsApp (якщо пишете туди), поштовий сервіс, платіжні системи. Менеджер, який веде ваш проєкт, бачить повідомлення і контакт лише для роботи над замовленням і зобовʼязаний спілкуватися з вами тільки через канали Vaxo.']],
      ['Скільки зберігаємо', ['Поки працюємо разом і до 3 років після, якщо закон не вимагає довше (рахунки).']],
      ['Ваші права', ['Напишіть на hello@vaxogroup.com, щоб переглянути, виправити або видалити свої дані. Відповідаємо протягом 30 днів.']],
      ['Вік', ['Наші послуги і партнерська програма — лише для людей від 18 років.']],
    ] },
  },
  partner: {
    en: { title: 'Partner Terms', desc: 'Rules of the Vaxo partner program: rates, payouts, what is allowed.', updated: UPDATED.en, note: NOTE.en, sections: [
      ['Who can join', ['Adults (18+) anywhere in the world. Joining is free. You are an independent partner, not an employee of Vaxo, and you pay your own taxes.']],
      ['Rates', [`Recommending a client: ${r.agencyOwn}% of the first payment + ${r.agencyRenewal}% of every later payment for life.`, `You brought the client AND closed the deal on a call: ${r.fullCycle}% + ${r.agencyRenewal}% for life.`, `Closing a warm lead from Vaxo: ${r.agencyGiven}% of that deal + ${r.agencyRenewal}% of its renewals, only while you stay an active manager. A new deal with the same client is not assigned to you automatically.`, `Content partners choose: ${r.clipFirst}% of the first sale, or ${r.clipLife}% of every sale for life. We do not pay for views or posts.`, `Templates: ${r.products}%. Team bonus: +${r.team}% of what partners you invited earn, paid by Vaxo on top.`]],
      ['When you get paid', [`Commission is counted only on money the client actually paid, and becomes payable ${r.holdDays} days after the payment — the time banks need to settle and disputes to surface. If the client still gets money back (our missed deadline or a bank chargeback), that commission is cancelled, or deducted from your future payouts if it was already paid.`]],
      ['Allowed', ['Personal recommendations, your own content and channels, honest reviews of real work. Every paid or affiliate post is marked #ad or "Vaxo partner".']],
      ['Not allowed', ['Spam, bulk cold email, bots, fake accounts or reviews, buying contact lists, messaging minors, bidding on the "Vaxo" brand in ads, pretending to be a Vaxo employee, promising results or income, buying through your own link. Breaking these rules cancels unpaid commission and may close your account.']],
      ['Clients belong to Vaxo', ['All communication and payments go through Vaxo channels. Taking a client to private contacts or private payments is blocked and ends the partnership. When a manager is paused or rated 2★ or lower, their clients and future renewals move to another manager.']],
      ['Vax, your AI coach', ['The coach in your cabinet answers up to 20 questions a day about Vaxo work and gives you prompts to use in your own AI tools.']],
      ['Changes', ['We may change rates for future sales with 14 days notice; commission already earned stays.']],
    ] },
    ru: { title: 'Условия партнёрской программы', desc: 'Правила партнёрки Vaxo: ставки, выплаты, что можно и нельзя.', updated: UPDATED.ru, note: NOTE.ru, sections: [
      ['Кто может участвовать', ['Взрослые (18+) из любой страны. Участие бесплатное. Вы — независимый партнёр, а не сотрудник Vaxo, и сами платите свои налоги.']],
      ['Ставки', [`Рекомендовали клиента: ${r.agencyOwn}% первой оплаты + ${r.agencyRenewal}% с каждой следующей оплаты пожизненно.`, `Сами привели клиента И сами закрыли сделку на созвоне: ${r.fullCycle}% + ${r.agencyRenewal}% пожизненно.`, `Закрыли тёплого клиента от Vaxo: ${r.agencyGiven}% этой сделки + ${r.agencyRenewal}% с её продлений, пока вы активный менеджер. Новая сделка того же клиента не закрепляется за вами автоматически.`, `Авторы контента выбирают: ${r.clipFirst}% с первой продажи или ${r.clipLife}% с каждой продажи пожизненно. За просмотры и посты мы не платим.`, `Шаблоны: ${r.products}%. Командный бонус: +${r.team}% от заработка приглашённых вами партнёров, сверху от Vaxo.`]],
      ['Когда выплата', [`Процент считается только с денег, которые клиент реально оплатил, и становится доступен через ${r.holdDays} дней после оплаты — за это время банк проводит платёж и всплывают споры. Если клиент всё же вернул деньги (наша просрочка или оспаривание в банке), процент отменяется, а если уже выплачен — вычитается из ваших будущих выплат.`]],
      ['Можно', ['Личные рекомендации, свой контент и каналы, честные отзывы о реальной работе. Каждый рекламный или партнёрский пост помечается #ad или «партнёр Vaxo».']],
      ['Нельзя', ['Спам, массовые холодные рассылки, боты, фейковые аккаунты и отзывы, покупка баз контактов, переписка с несовершеннолетними, реклама по слову «Vaxo», выдавать себя за сотрудника Vaxo, обещать результаты или доход, покупать по своей ссылке. Нарушение отменяет невыплаченные проценты и может закрыть аккаунт.']],
      ['Клиенты — клиенты Vaxo', ['Всё общение и оплаты идут через каналы Vaxo. Увод клиента в личные контакты или на личную оплату блокируется и прекращает партнёрство. Если менеджер на паузе или с рейтингом 2★ и ниже, его клиенты и будущие продления переходят другому менеджеру.']],
      ['Vax, ваш ИИ-помощник', ['Помощник в кабинете отвечает до 20 вопросов в день по работе с Vaxo и даёт промпты для ваших собственных ИИ.']],
      ['Изменения', ['Мы можем менять ставки для будущих продаж, предупредив за 14 дней; уже заработанное остаётся.']],
    ] },
    ua: { title: 'Умови партнерської програми', desc: 'Правила партнерки Vaxo: ставки, виплати, що можна й не можна.', updated: UPDATED.ua, note: NOTE.ua, sections: [
      ['Хто може брати участь', ['Дорослі (18+) з будь-якої країни. Участь безкоштовна. Ви — незалежний партнер, а не співробітник Vaxo, і самі сплачуєте свої податки.']],
      ['Ставки', [`Порекомендували клієнта: ${r.agencyOwn}% першої оплати + ${r.agencyRenewal}% з кожної наступної оплати довічно.`, `Самі привели клієнта І самі закрили угоду на дзвінку: ${r.fullCycle}% + ${r.agencyRenewal}% довічно.`, `Закрили теплого клієнта від Vaxo: ${r.agencyGiven}% цієї угоди + ${r.agencyRenewal}% з її продовжень, поки ви активний менеджер. Нова угода того ж клієнта не закріплюється за вами автоматично.`, `Автори контенту обирають: ${r.clipFirst}% з першого продажу або ${r.clipLife}% з кожного продажу довічно. За перегляди і пости ми не платимо.`, `Шаблони: ${r.products}%. Командний бонус: +${r.team}% від заробітку запрошених вами партнерів, зверху від Vaxo.`]],
      ['Коли виплата', [`Відсоток рахується лише з грошей, які клієнт реально сплатив, і стає доступним через ${r.holdDays} днів після оплати — за цей час банк проводить платіж і спливають спори. Якщо клієнт усе ж повернув гроші (наше прострочення або оскарження в банку), відсоток скасовується, а якщо вже виплачений — віднімається з ваших майбутніх виплат.`]],
      ['Можна', ['Особисті рекомендації, свій контент і канали, чесні відгуки про реальну роботу. Кожен рекламний чи партнерський пост позначається #ad або «партнер Vaxo».']],
      ['Не можна', ['Спам, масові холодні розсилки, боти, фейкові акаунти й відгуки, купівля баз контактів, листування з неповнолітніми, реклама за словом «Vaxo», видавати себе за співробітника Vaxo, обіцяти результати чи дохід, купувати за своїм посиланням. Порушення скасовує невиплачені відсотки і може закрити акаунт.']],
      ['Клієнти — клієнти Vaxo', ['Усе спілкування й оплати йдуть через канали Vaxo. Виведення клієнта в особисті контакти чи на особисту оплату блокується і припиняє партнерство. Якщо менеджер на паузі або з рейтингом 2★ і нижче, його клієнти й майбутні продовження переходять іншому менеджеру.']],
      ['Vax, ваш ШІ-помічник', ['Помічник у кабінеті відповідає до 20 питань на день щодо роботи з Vaxo і дає промпти для ваших власних ШІ.']],
      ['Зміни', ['Ми можемо змінювати ставки для майбутніх продажів, попередивши за 14 днів; уже зароблене залишається.']],
    ] },
  },
};
