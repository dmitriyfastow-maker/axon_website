// Partner AI toolkit (cabinet): offers to promote, prompt templates by goal and recommended AI tools.
// In prompts, {offer} becomes the chosen offer's description and {link} the partner's link.

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
    text: 'The free Vaxo partner program for people 18+: recommend AI services and templates for small businesses, earn 30% on services and 50% on templates from the first sale, free training and AI tools, weekly payouts. No income is guaranteed — earnings depend only on real sales.',
  },
];

export const CATEGORIES = [
  { id: 'video', name: '🎬 Videos' },
  { id: 'posts', name: '✍️ Posts & profile' },
  { id: 'outreach', name: '✉️ Personal messages' },
  { id: 'community', name: '💬 Communities' },
  { id: 'client', name: '🤝 Talking to clients' },
  { id: 'team', name: '👥 Team' },
];

export type Prompt = { id: string; cat: string; title: string; text: string };

export const PROMPTS: Prompt[] = [
  {
    id: 'factory',
    cat: 'video',
    title: 'Content factory — set it up once (start here)',
    text: `You are my content factory manager for short vertical videos (TikTok, Instagram Reels, YouTube Shorts).
What I promote: {offer}
My link (goes in my bio): {link}
My platforms: [TikTok / Reels / Shorts]
Videos per day: [3] — this is my standard minimum. There is no upper limit: more unique videos = more reach = more chances to earn.
I record with: [my phone, face on camera / screen recordings only / no face, text + voice-over]

Do this:
1. Give me 6 content pillars (types of videos) that fit this offer: e.g. a typical business problem, before/after, myth vs fact, quick tip, a funny situation, a question to the viewer.
2. Write today's batch: [3] complete, unique scripts. For each: the hook (first 2 seconds), scenes with what I say and what is on screen, on-screen text, the call to action ("link in bio"), a caption and 5 hashtags. Each script uses a different pillar and a different hook style.
3. Keep a running list of every hook, example and format you used.
4. From now on, when I write "next batch [N]", give me N new scripts that never repeat a hook, example or format from the list.
Rules: plain spoken English, no hype, no income promises, no fake claims. Every video must be different — platforms hide repeated content.`,
  },
  {
    id: 'next-batch',
    cat: 'video',
    title: 'Content factory — next batch',
    text: `next batch [5]
Remember: all new hooks, examples and formats, nothing repeated from the list. Mix at least 3 pillars. Add one funny one.`,
  },
  {
    id: 'ideas',
    cat: 'video',
    title: '10 short-video ideas',
    text: `Give me 10 different short-video ideas (TikTok, Reels, Shorts) for this offer: {offer}
Mix formats: before/after, myth vs fact, "3 mistakes", screen recording, a typical client's story, a question to the viewer. One line per idea plus the first sentence of the video. Plain spoken English, no hype, no income promises.`,
  },
  {
    id: 'script',
    cat: 'video',
    title: '30-second script + 5 hooks',
    text: `You are a short-video scriptwriter. Write a 30-second vertical video script for small business owners about this offer: {offer}
Structure: hook in the first 2 seconds, one real problem, how the offer solves it, call to action "link in bio". Add on-screen text for each scene. Then give 5 alternative hooks I can test. No hype, no income promises.`,
  },
  {
    id: 'bio',
    cat: 'posts',
    title: 'Profile bio that brings clicks',
    text: `Write 5 versions of a short social media bio (max 150 characters) for my profile. I help small businesses with this: {offer}
Each version: who I help, what result, a reason to click the link. Friendly, clear, no hype. Also suggest a profile name and a short pinned post that explains what I do, ending with: {link}`,
  },
  {
    id: 'caption',
    cat: 'posts',
    title: 'Post caption + hashtags',
    text: `Write 3 versions of a short social media caption (max 60 words) for this offer: {offer}
One funny, one practical, one story-style. End each with a soft call to action and this link: {link}
Add 5 relevant hashtags. No fake claims.`,
  },
  {
    id: 'plan',
    cat: 'posts',
    title: '7-day content plan',
    text: `Make a 7-day content plan to promote this offer: {offer}
For each day: platform, format (video, carousel, story, post), topic, the first sentence, and the call to action with this link: {link}
Every day must be different. Mix useful tips, humor and real examples.`,
  },
  {
    id: 'find',
    cat: 'outreach',
    title: 'Where to find clients',
    text: `I promote this offer: {offer}
List 20 types of small businesses that need it most and, for each, one reason why and where to find them online (Google Maps, Instagram, Facebook groups, Reddit, local directories). Then give me a simple daily routine of 30 minutes to find and contact 5–10 of them honestly and personally.`,
  },
  {
    id: 'research',
    cat: 'outreach',
    title: 'Check a business before writing',
    text: `Here is what I found about a business: [paste their website text, Google reviews, a few posts].
What I can offer: {offer}
Tell me: 1) what they do and who their clients are, 2) the 3 biggest problems you notice (slow replies, no website, bad reviews about waiting, etc.), 3) which one this offer solves best, 4) one specific compliment I can honestly give them.`,
  },
  {
    id: 'message',
    cat: 'outreach',
    title: 'Personal first message',
    text: `Business: [name, city]. What I noticed: [paste the problem and compliment from the check].
Write a short, friendly first message (max 70 words) to the owner for [Instagram DM / Facebook / contact form / WhatsApp they list publicly]. Mention one specific thing I noticed, one way this could help: {offer}
End with a simple yes/no question. No link in the first message, no pressure, no fake claims.`,
  },
  {
    id: 'followup',
    cat: 'outreach',
    title: 'Follow-up when there is no reply',
    text: `I messaged a business owner 3 days ago about this: {offer}
They did not reply. Write 2 very short, polite follow-up messages (max 40 words each) that add something useful (a tip or an example), not just "just checking in". The second one closes politely ("no worries if not now"). Never pushy.`,
  },
  {
    id: 'help',
    cat: 'community',
    title: 'Helpful answer in a group or forum',
    text: `Someone in a group asked: [paste the question].
I know about this: {offer}
Write a genuinely helpful answer (max 120 words) that solves their problem with 2–3 practical steps they can do themselves. Do not sell and do not add a link. If it fits naturally, end with "happy to share more if useful".`,
  },
  {
    id: 'reply',
    cat: 'client',
    title: 'Answer a client question',
    text: `A potential client asked: [paste the question].
Our offer: {offer}
Write a short, honest reply that answers the question, gives one useful detail, and suggests the next step: leave a request here {link} — the Vaxo team will reply with details. Match the client's tone.`,
  },
  {
    id: 'objection',
    cat: 'client',
    title: '"Too expensive", "I\'ll think about it" and other objections',
    text: `A potential client said: [paste what they said, e.g. "too expensive", "I'll think about it", "I don't need AI"].
The offer: {offer}
Write a short, honest reply that respects their point, gives one useful fact, and suggests a small next step. Match their tone. Then explain in one line why this reply works.`,
  },
  {
    id: 'invite',
    cat: 'team',
    title: 'Invite a friend to become a partner',
    text: `Write 3 short, honest messages (max 60 words each) inviting a friend to join a free partner program. About the program: {offer}
My invite link: {link}
One casual, one for someone who wants extra income, one for someone who already makes content. No income promises, no pressure — say clearly it depends on real sales.`,
  },
];

/** Best tools by task. Claude first: it gives the strongest results for writing and planning. */
export const TOOLS = [
  { task: 'Ideas, scripts, messages', free: 'Claude (free plan), ChatGPT, Gemini', paid: 'Claude Pro — remembers your offer in a Project, the strongest texts' },
  { task: 'Video editing & subtitles', free: 'CapCut (auto-captions, templates)', paid: 'CapCut Pro' },
  { task: 'Images & covers', free: 'Canva, Gemini, ChatGPT images', paid: 'Canva Pro, Midjourney' },
  { task: 'Voice-over', free: 'CapCut text-to-speech, your own voice', paid: 'ElevenLabs' },
  { task: 'Screen recording (no face needed)', free: 'Phone screen recorder, OBS Studio', paid: '—' },
];
