// Partner roadmap ("Vax's road"): 6 levels from rookie to legend, 4 missions each.
// A mission is done automatically from real numbers (`auto`) or by the partner's own tick (saved in the browser).
// Level 1 reuses the old "Start here" checklist ids, so earlier ticks still count.
import type { Lang } from '../i18n';

export type Metric = 'links' | 'clicks' | 'leads' | 'sales' | 'team' | 'channels';
export type Mission = { id: string; auto?: [Metric, number]; tab: string; lesson?: string; text: Record<Lang, string>; hint: Record<Lang, string> };
export type Level = { face: 'front' | 'happy' | 'smug' | 'shocked'; name: Record<Lang, string>; say: Record<Lang, string>; missions: Mission[] };

const m = (id: string, tab: string, lesson: string | undefined, auto: [Metric, number] | undefined, en: [string, string], ua: [string, string], ru: [string, string]): Mission => ({
  id, tab, lesson, auto, text: { en: en[0], ua: ua[0], ru: ru[0] }, hint: { en: en[1], ua: ua[1], ru: ru[1] },
});

export const LEVELS: Level[] = [
  {
    face: 'front',
    name: { en: 'Rookie raccoon', ua: 'Єнот-новачок', ru: 'Енот-новичок' },
    say: { en: '“Everyone starts here. Four small steps — and you are on the road.”', ua: '«Усі починають звідси. Чотири маленькі кроки — і ви в дорозі.»', ru: '«Все начинают отсюда. Четыре маленьких шага — и вы в пути.»' },
    missions: [
      m('lesson', 'academy', 'start', undefined, ['Read “Start here” (5 min)', 'Understand how a click becomes your money — then everything else makes sense.'], ['Прочитати «З чого почати» (5 хв)', 'Зрозумійте, як клік стає вашими грошима, — тоді все інше стане логічним.'], ['Прочитать «С чего начать» (5 мин)', 'Поймите, как клик превращается в ваши деньги, — тогда всё остальное станет логичным.']),
      m('link', 'links', undefined, ['links', 1], ['Make a link for your first channel', 'One link per channel (TikTok, Instagram, messages) — so you see what works.'], ['Створити посилання для першого каналу', 'Окреме посилання на кожен канал (TikTok, Instagram, повідомлення) — так видно, що працює.'], ['Создать ссылку для первого канала', 'Отдельная ссылка на каждый канал (TikTok, Instagram, сообщения) — так видно, что работает.']),
      m('bio', 'academy', 'posts', undefined, ['Set up your profile with your link', 'Bio = who you help + what result + “link below”. Use the bio prompt.'], ['Оформити профіль із посиланням', 'Біо = кому допомагаєте + який результат + «посилання нижче». Скористайтеся промптом для біо.'], ['Оформить профиль со ссылкой', 'Био = кому помогаете + какой результат + «ссылка ниже». Используйте промпт для био.']),
      m('eyes', 'academy', 'eyes', undefined, ['Write down 10 opportunities around you', 'Lesson “Entrepreneur’s eyes”: businesses you know, complaints you hear, people who want extra income.'], ['Записати 10 можливостей навколо себе', 'Урок «Очі підприємця»: бізнеси, які ви знаєте, скарги, які чуєте, люди, які хочуть додатковий дохід.'], ['Записать 10 возможностей вокруг себя', 'Урок «Глаза предпринимателя»: бизнесы, которые вы знаете, жалобы, которые слышите, люди, которые хотят доп. доход.']),
    ],
  },
  {
    face: 'happy',
    name: { en: 'Scout', ua: 'Розвідник', ru: 'Разведчик' },
    say: { en: '“Now let the world see you. First signals are coming.”', ua: '«Тепер нехай світ вас побачить. Перші сигнали вже близько.»', ru: '«Теперь пусть мир вас увидит. Первые сигналы уже близко.»' },
    missions: [
      m('factory', 'academy', 'video', undefined, ['Post your first video', 'Screen recording + your voice is enough. 15–40 seconds, a hook in the first 2 seconds.'], ['Опублікувати перше відео', 'Запису екрана й вашого голосу достатньо. 15–40 секунд, гачок у перші 2 секунди.'], ['Опубликовать первое видео', 'Записи экрана и вашего голоса достаточно. 15–40 секунд, крючок в первые 2 секунды.']),
      m('messages', 'academy', 'outreach', undefined, ['Write 5 personal messages to businesses', 'Not copy-paste: notice one real thing about each business first.'], ['Написати 5 особистих повідомлень бізнесам', 'Не копіпаст: спершу помітьте одну справжню річ про кожен бізнес.'], ['Написать 5 личных сообщений бизнесам', 'Не копипаст: сначала заметьте одну настоящую вещь о каждом бизнесе.']),
      m('clicks10', 'links', undefined, ['clicks', 10], ['Get 10 clicks on your links', 'Link in bio + say “link in bio” in every video. Check which channel clicks more.'], ['Отримати 10 переходів за посиланнями', 'Посилання в біо + кажіть «посилання в біо» в кожному відео. Дивіться, який канал дає більше.'], ['Получить 10 переходов по ссылкам', 'Ссылка в био + говорите «ссылка в био» в каждом видео. Смотрите, какой канал даёт больше.']),
      m('niche', 'academy', 'niche', undefined, ['Choose your niche', 'Pick one type of business you understand — experts get trusted faster.'], ['Обрати свою нішу', 'Оберіть один тип бізнесу, який розумієте, — експертам довіряють швидше.'], ['Выбрать свою нишу', 'Выберите один тип бизнеса, который понимаете, — экспертам доверяют быстрее.']),
    ],
  },
  {
    face: 'happy',
    name: { en: 'Lead hunter', ua: 'Мисливець за заявками', ru: 'Охотник за заявками' },
    say: { en: '“People are clicking. Time to turn attention into requests.”', ua: '«Люди клікають. Час перетворити увагу на заявки.»', ru: '«Люди кликают. Пора превращать внимание в заявки.»' },
    missions: [
      m('lead1', 'links', undefined, ['leads', 1], ['Get your first request', 'Answer every comment and DM fast — the first lead usually comes from a conversation.'], ['Отримати першу заявку', 'Відповідайте на кожен коментар і повідомлення швидко — перша заявка зазвичай з розмови.'], ['Получить первую заявку', 'Отвечайте на каждый комментарий и сообщение быстро — первая заявка обычно приходит из разговора.']),
      m('clicks100', 'links', undefined, ['clicks', 100], ['Reach 100 clicks', 'Do more of what already works: copy the format of your best video, not someone else’s.'], ['Досягти 100 переходів', 'Робіть більше того, що вже працює: повторюйте формат свого найкращого відео.'], ['Набрать 100 переходов', 'Делайте больше того, что уже работает: повторяйте формат своего лучшего видео.']),
      m('community', 'academy', 'community', undefined, ['Help 5 people in business groups', 'Real help, no links. People who like your answer will open your profile.'], ['Допомогти 5 людям у бізнес-групах', 'Справжня допомога, без посилань. Ті, кому сподобається відповідь, відкриють ваш профіль.'], ['Помочь 5 людям в бизнес-группах', 'Настоящая помощь, без ссылок. Те, кому понравится ответ, откроют ваш профиль.']),
      m('invite', 'team', undefined, ['team', 1], ['Invite 1 friend to your team', 'Someone who makes content or wants extra income. You get +10% of their earnings on top.'], ['Запросити 1 друга в команду', 'Того, хто робить контент або хоче додатковий дохід. Ви отримуєте +10% зверху від його заробітку.'], ['Пригласить 1 друга в команду', 'Того, кто делает контент или хочет доп. доход. Вы получаете +10% сверху от его заработка.']),
    ],
  },
  {
    face: 'smug',
    name: { en: 'Deal baker', ua: 'Пекар угод', ru: 'Пекарь сделок' },
    say: { en: '“Your first money is close. Consistency beats talent.”', ua: '«Перші гроші вже поруч. Регулярність перемагає талант.»', ru: '«Первые деньги уже рядом. Регулярность побеждает талант.»' },
    missions: [
      m('sale1', 'links', undefined, ['sales', 1], ['Make your first sale', 'Stuck at “I’ll think about it”? Use the objection prompt — and never promise what’s not on our site.'], ['Зробити перший продаж', 'Застрягли на «я подумаю»? Скористайтеся промптом для заперечень — і не обіцяйте того, чого немає на сайті.'], ['Сделать первую продажу', 'Застряли на «я подумаю»? Используйте промпт для возражений — и не обещайте того, чего нет на сайте.']),
      m('leads3', 'links', undefined, ['leads', 3], ['Get 3 requests', 'One client — four incomes: offer a template too, ask who else might need this.'], ['Отримати 3 заявки', 'Один клієнт — чотири доходи: запропонуйте ще й шаблон, запитайте, кому ще це потрібно.'], ['Получить 3 заявки', 'Один клиент — четыре дохода: предложите ещё и шаблон, спросите, кому ещё это нужно.']),
      m('streak', 'academy', 'video', undefined, ['Post content 7 days in a row', 'Batch: write 7 scripts on Sunday with the factory prompt, record in one go.'], ['Публікувати контент 7 днів поспіль', 'Пакетом: у неділю напишіть 7 сценаріїв промптом-заводом, запишіть за один раз.'], ['Публиковать контент 7 дней подряд', 'Пакетом: в воскресенье напишите 7 сценариев промптом-заводом, запишите за один раз.']),
      m('weekly', 'academy', 'eyes', undefined, ['3 Sundays of the opportunity list', '15 minutes: 10 opportunities → pick 1 → act on Monday. This habit compounds.'], ['3 неділі зі списком можливостей', '15 хвилин: 10 можливостей → оберіть 1 → дійте в понеділок. Ця звичка накопичується.'], ['3 воскресенья со списком возможностей', '15 минут: 10 возможностей → выберите 1 → действуйте в понедельник. Эта привычка накапливается.']),
    ],
  },
  {
    face: 'smug',
    name: { en: 'Master raccoon', ua: 'Майстер-єнот', ru: 'Мастер-енот' },
    say: { en: '“You have a system now. Let’s scale it.”', ua: '«Тепер у вас є система. Масштабуймо її.»', ru: '«Теперь у вас есть система. Масштабируем её.»' },
    missions: [
      m('sales5', 'links', undefined, ['sales', 5], ['Reach 5 sales', 'Ask every happy client for one referral — owners know other owners.'], ['Досягти 5 продажів', 'Попросіть кожного задоволеного клієнта про одну рекомендацію — власники знають інших власників.'], ['Достичь 5 продаж', 'Попросите каждого довольного клиента об одной рекомендации — владельцы знают других владельцев.']),
      m('team3', 'team', undefined, ['team', 3], ['Grow your team to 3', 'Share this academy and your best working video with each new partner.'], ['Збільшити команду до 3', 'Діліться цим навчанням і своїм найкращим відео з кожним новим партнером.'], ['Увеличить команду до 3', 'Делитесь этим обучением и своим лучшим видео с каждым новым партнёром.']),
      m('channels', 'links', undefined, ['channels', 2], ['Get requests from 2 different channels', 'Don’t depend on one platform: add a second channel that already brings clicks.'], ['Отримати заявки з 2 різних каналів', 'Не залежте від однієї платформи: додайте другий канал, який уже дає переходи.'], ['Получить заявки из 2 разных каналов', 'Не зависьте от одной платформы: добавьте второй канал, который уже даёт переходы.']),
      m('case', 'academy', 'posts', undefined, ['Turn a happy client into a story', 'Ask for a short review and post the result (with permission). Real stories sell best.'], ['Перетворити задоволеного клієнта на історію', 'Попросіть короткий відгук і опублікуйте результат (з дозволу). Справжні історії продають найкраще.'], ['Превратить довольного клиента в историю', 'Попросите короткий отзыв и опубликуйте результат (с разрешения). Настоящие истории продают лучше всего.']),
    ],
  },
  {
    face: 'shocked',
    name: { en: 'Vaxo legend', ua: 'Легенда Vaxo', ru: 'Легенда Vaxo' },
    say: { en: '“Legend status. Now you teach others — and earn from it.”', ua: '«Статус легенди. Тепер ви вчите інших — і заробляєте на цьому.»', ru: '«Статус легенды. Теперь вы учите других — и зарабатываете на этом.»' },
    missions: [
      m('sales20', 'links', undefined, ['sales', 20], ['Reach 20 sales', 'At this level write to us — we’ll help with bigger clients and projects from $800.'], ['Досягти 20 продажів', 'На цьому рівні напишіть нам — допоможемо з більшими клієнтами і проєктами від $800.'], ['Достичь 20 продаж', 'На этом уровне напишите нам — поможем с крупными клиентами и проектами от $800.']),
      m('team5', 'team', undefined, ['team', 5], ['Grow your team to 5', 'Your team’s success is your +10%: run a short weekly call with them.'], ['Збільшити команду до 5', 'Успіх команди — це ваші +10%: проводьте з нею короткий щотижневий дзвінок.'], ['Увеличить команду до 5', 'Успех команды — это ваши +10%: проводите с ней короткий еженедельный созвон.']),
      m('mentor', 'team', undefined, undefined, ['Help a team member get their first request', 'Review their profile and first video — your experience saves them weeks.'], ['Допомогти учаснику команди отримати першу заявку', 'Перегляньте їхній профіль і перше відео — ваш досвід заощадить їм тижні.'], ['Помочь участнику команды получить первую заявку', 'Посмотрите его профиль и первое видео — ваш опыт сэкономит ему недели.']),
      m('goal', 'rules', undefined, undefined, ['Set a big goal for next month', 'Write it down and tell us — we’ll help you plan it. Active partners will be the first to try new offers.'], ['Поставити велику ціль на наступний місяць', 'Запишіть її та розкажіть нам — допоможемо спланувати. Активні партнери першими пробуватимуть нові офери.'], ['Поставить большую цель на следующий месяц', 'Запишите её и расскажите нам — поможем спланировать. Активные партнёры первыми будут пробовать новые офферы.']),
    ],
  },
];
