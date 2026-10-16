// Partner AI toolkit (cabinet): offers to promote, prompt templates and recommended AI tools.
// In prompts, {offer} becomes the chosen offer's description and {link} the partner's main link.

export const OFFERS = [
  {
    id: 'start',
    name: 'Starter packages ($149–$249)',
    target: '/start/',
    text: 'Vaxo starter packages for small businesses: an AI chat assistant that answers customers 24/7 ($249), a one-page website ($199) or one business automation ($149). Delivered within 7 days, the Vaxo team does all the work.',
  },
  {
    id: 'shop',
    name: 'Templates for small business ($9–$67)',
    target: '/shop/',
    text: 'Vaxo ready-made templates for small businesses ($9–$67): AI prompt pack, client tracker, customer message templates, pricing calculator, review request kit, booking checklists and more. Instant download.',
  },
  {
    id: 'partners',
    name: 'Invite partners (your team)',
    target: '/partners/',
    text: 'The free Vaxo partner program: people 18+ recommend AI services and templates for small businesses and earn up to 30% on services and up to 50% on products, with weekly payouts. No income is guaranteed — earnings depend only on real sales.',
  },
];

export const PROMPTS = [
  {
    title: '10 short-video ideas',
    text: `Give me 10 different short-video ideas (TikTok, Reels, Shorts) for this offer: {offer}
Mix formats: before/after, myth vs fact, "3 mistakes", screen recording, a typical client's story, a question to the viewer. One line per idea plus the first sentence of the video. Plain spoken English, no hype, no income promises.`,
  },
  {
    title: '30-second video script + 5 hooks',
    text: `You are a short-video scriptwriter. Write a 30-second vertical video script for small business owners about this offer: {offer}
Structure: hook in the first 2 seconds, one real problem, how the offer solves it, call to action "link in bio". Add on-screen text for each scene. Then give 5 alternative hooks I can test. No hype, no income promises.`,
  },
  {
    title: 'Post caption + hashtags',
    text: `Write 3 versions of a short social media caption (max 60 words) for this offer: {offer}
One funny, one practical, one story-style. End each with a soft call to action and this link: {link}
Add 5 relevant hashtags. No fake claims.`,
  },
  {
    title: 'Personal message to a business',
    text: `Here is a business: [name, website or Instagram, city]. Here is what I noticed about them: [paste what you saw: their site, reviews, posts].
Write a short, friendly message (max 70 words) to the owner. Mention one specific thing I noticed, one way this could help them: {offer}
Ask a simple yes/no question. No pressure, no fake claims. Do not include a link in the first message.`,
  },
  {
    title: 'Follow-up when there is no reply',
    text: `I messaged a business owner 3 days ago about this: {offer}
They did not reply. Write 3 very short, polite follow-up messages (max 40 words each) that add something useful (a tip or an example), not just "just checking in". Never pushy.`,
  },
  {
    title: 'Answer to "too expensive" and other objections',
    text: `A potential client said: [paste what they said, e.g. "too expensive", "I'll think about it", "I don't need AI"].
The offer: {offer}
Write a short, honest reply that respects their point, gives one useful fact, and suggests a small next step. Match their tone. Then explain in one line why this reply works.`,
  },
  {
    title: '7-day content plan',
    text: `Make a 7-day content plan to promote this offer: {offer}
For each day: platform, format (video, carousel, story, post), topic, the first sentence, and the call to action with this link: {link}
Every day must be different. Mix useful tips, humor and real examples.`,
  },
  {
    title: 'Where to find clients',
    text: `I promote this offer: {offer}
List 20 types of small businesses that need it most and, for each, one reason why and where to find them online (Google Maps, Instagram, Facebook groups, Reddit, local directories). Then give me a simple daily routine of 30 minutes to find and contact 5 of them honestly.`,
  },
];

/** Best tools by task. Claude first: it gives the strongest results for writing and planning. */
export const TOOLS = [
  { task: 'Ideas, scripts, messages', free: 'Claude (free plan), ChatGPT, Gemini', paid: 'Claude Pro — the best for writing and strategy' },
  { task: 'Video editing & subtitles', free: 'CapCut, YouTube Shorts editor', paid: 'CapCut Pro' },
  { task: 'Images & covers', free: 'Canva, Gemini, ChatGPT images', paid: 'Canva Pro, Midjourney' },
  { task: 'Voice-over', free: 'CapCut text-to-speech, your own voice', paid: 'ElevenLabs' },
  { task: 'Screen recording (no face needed)', free: 'Phone screen recorder, OBS Studio', paid: '—' },
];
