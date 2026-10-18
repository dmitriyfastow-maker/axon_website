// Partner academy (cabinet): short lessons, each with steps, a free way, a maximum way and the prompts to use.
// `prompts` are ids from ai-toolkit.ts PROMPTS. Translations: academy-ua.ts, academy-ru.ts.
import type { Lang } from '../i18n';
import { CHECKLIST_RU, LESSONS_RU } from './academy-ru';
import { CHECKLIST_UA, LESSONS_UA } from './academy-ua';

export type Lesson = {
  id: string;
  icon: string;
  title: string;
  time: string;
  goal: string;
  steps: string[];
  free: string;
  max: string;
  prompts: string[];
  tip?: string;
};

export type Check = { id: string; text: string; tab: string; lesson?: string };

const LESSONS_EN: Lesson[] = [
  {
    id: 'start',
    icon: '🚀',
    title: 'Start here',
    time: '5 min',
    goal: 'Understand how you earn and do your first 3 actions today.',
    steps: [
      'How it works: a person clicks your link → leaves a request or buys → our team does the work → you get your commission every week.',
      'Clients stay yours for life: the first link they clicked is saved, even if they buy months later.',
      'Pick one main channel to start (most people: short videos). Do not try everything at once.',
      'Make a separate link for that channel in the “Links” tab — so you see what works.',
      'Today: set up your profile (lesson 2), make your first video (lesson 1), write to 5 businesses (lesson 3).',
    ],
    free: 'Everything in this academy works with free tools. You can start today with just your phone.',
    max: 'When you see the first results, Claude Pro saves hours: it remembers your offer and style and does a week of work in one chat.',
    prompts: [],
  },
  {
    id: 'eyes',
    icon: '🧠',
    title: 'Entrepreneur’s eyes: see money everywhere',
    time: '15 min + a habit for life',
    goal: 'Stop waiting for “clients” — learn to notice problems that people would gladly pay to fix.',
    steps: [
      'Every business you pass or follow — ask 3 questions: How do customers find them? What happens when someone writes at night? Do they ask happy customers for reviews? Every “no” is a real problem — and a real sale.',
      'Listen for complaints, not for “clients”. “I have no time”, “clients don’t pay on time”, “nobody finds us online” — each phrase points to a service, a template or a partner offer.',
      'One conversation — four incomes. A salon owner may need an AI chat (service), a price-list template (template), use a partner tool (offer) — and her friend may want to earn with you (team). Always think about all four.',
      'Look where others don’t: your relatives’ jobs, your gym, your old school, local Facebook groups, people who complain in Google reviews.',
      'Test small and fast: one idea, one action today, measure in the “Links” tab, double down on what works. Ideas without action are worth zero.',
      'Every Sunday — 15 minutes: write 10 opportunities you noticed this week, pick 1, act on Monday.',
    ],
    free: 'A notebook (or notes app) and the “Find hidden opportunities” prompt below.',
    max: 'Claude Pro remembers your situation in a Project — every week ask it to review your opportunity list and pick the strongest.',
    prompts: ['opportunities'],
    tip: 'Honesty is your edge: recommend only what really solves the problem. One happy client brings three more.',
  },
  {
    id: 'niche',
    icon: '💎',
    title: 'Your niche — your goldmine',
    time: '20 min',
    goal: 'Become “the person who knows” one type of business — people trust experts, not generalists.',
    steps: [
      'Pick a niche you understand: where you worked, what you love, where you spend time (beauty, cleaning, gyms, dentists, car repair, cafés…).',
      'Learn their day: how they get clients, what eats their time, what they hate doing. Talk to 3 owners just to listen.',
      'Speak their language in your content: “3 things every salon loses money on” beats “AI for business”.',
      'Owners in one niche know each other: one happy client opens the door to the whole street — and to new partners for your team.',
      'Once the niche works — repeat the same playbook in the next one.',
    ],
    free: 'The “Find my niche goldmine” prompt + 3 honest conversations.',
    max: 'With Claude Pro build a full niche playbook: pains, scripts, 30 content ideas and replies to every objection.',
    prompts: ['niche'],
  },
  {
    id: 'video',
    icon: '🎬',
    title: 'Video factory',
    time: '20 min to set up, then 30–60 min a day',
    goal: 'Post unique short videos every day that keep bringing people to your link.',
    steps: [
      'Open the “Content factory — set it up once” prompt below in Claude (or ChatGPT / Gemini). Fill in the [brackets]: platforms, videos per day, how you record.',
      'Standard minimum: 3 unique videos a day. There is no maximum — the more unique videos you post, the more reach you get and the higher your chance to earn.',
      'Record: your phone, vertical. Screen recordings of a chatbot or website work great and need no face.',
      'Edit in CapCut: auto-captions on, cut pauses, add music from its library. Keep it 15–40 seconds.',
      'Post on TikTok, Reels and Shorts. Put your link in the bio and say “link in bio”.',
      'Every day write “next batch [N]” in the same chat — you get N new scripts that never repeat.',
      'After 7 days check the “Links” tab: which platform brings clicks and leads? Do more there.',
    ],
    free: 'Free Claude / ChatGPT / Gemini have daily limits — ask for batches of 3–5 scripts. CapCut free is enough for editing.',
    max: 'Claude Pro: create a Project, paste the factory prompt and your offer once — then every day “next batch 10”. Add CapCut Pro and ElevenLabs voice-over to make 10+ videos a day without showing your face.',
    prompts: ['factory', 'next-batch', 'ideas', 'script'],
    tip: 'Never post the same video twice or on many copies of one account — platforms hide it. Change the hook, example and format every time.',
  },
  {
    id: 'posts',
    icon: '✍️',
    title: 'Posts & your profile',
    time: '15 min',
    goal: 'A profile that makes people click, and a simple weekly posting plan.',
    steps: [
      'Profile photo: a clear photo of you or a simple logo. Name: your name + what you help with.',
      'Bio: who you help, what result, “link below”. Use the bio prompt.',
      'Pin one post that explains what you do in simple words.',
      'Make a 7-day plan with the plan prompt and post once a day: Instagram, Facebook, LinkedIn, Threads or your Telegram channel.',
      'Answer every comment — it brings more reach and trust.',
    ],
    free: 'Free AI + Canva for covers and carousels.',
    max: 'Claude Pro writes a month of posts in your style at once; Canva Pro for brand kit and quick resizing for every platform.',
    prompts: ['bio', 'caption', 'plan'],
  },
  {
    id: 'outreach',
    icon: '✉️',
    title: 'Personal messages to businesses',
    time: '30 min a day',
    goal: 'Write to business owners personally — the fastest way to the first client.',
    steps: [
      'Find businesses with the “Where to find clients” prompt: Google Maps, Instagram, Facebook groups, local directories.',
      'Before writing, look at their site, reviews and posts. Paste it into the “Check a business” prompt — AI finds the problem and a compliment.',
      'Write one personal message per business with the “Personal first message” prompt. No link in the first message.',
      '10–20 personal messages a day is a strong pace. Quality beats quantity.',
      'No reply in 3 days? One or two polite follow-ups, then stop.',
      'When they answer with interest — go to the “When a client answers” lesson.',
      'Keep a simple list (a Google Sheet is enough): business, date, status — sent / replied / interested.',
    ],
    free: 'Free AI is enough: one chat per business.',
    max: 'Claude Pro can check 10 businesses in one go and write 10 personal messages from what you paste — much faster.',
    prompts: ['find', 'research', 'message', 'followup'],
    tip: 'Not allowed: mass emails or copy-paste messages to lists, buying contact lists, messaging people who said no. Mass email to strangers breaks US law (CAN-SPAM) and our rules. Personal, one-to-one only.',
  },
  {
    id: 'community',
    icon: '💬',
    title: 'Communities & groups',
    time: '15 min a day',
    goal: 'Become the helpful person in groups where business owners ask questions.',
    steps: [
      'Join 5–10 groups where small business owners talk: Facebook groups, Reddit (r/smallbusiness, r/Entrepreneur), Discord and Telegram chats in your niche.',
      'Read each group’s rules. Many forbid links — respect that.',
      'Answer real questions with real help (use the “Helpful answer” prompt). No selling, no links in answers.',
      'People who like your answers will look at your profile — where your link is.',
    ],
    free: 'Free AI to draft answers, you add your own words.',
    max: 'Claude Pro: paste 10 questions from a group and get 10 helpful answers in minutes.',
    prompts: ['help'],
  },
  {
    id: 'client',
    icon: '🤝',
    title: 'When a client answers',
    time: '5 min',
    goal: 'Hand the client to us the right way — we do the rest.',
    steps: [
      'Thank them and answer simply. Use the “Answer a client question” prompt.',
      'Send them your link and ask them to leave a request — it takes a minute. The request is saved to your name.',
      'Our team replies, prepares the proposal and does the work. You see the lead in your cabinet.',
      'Price question or “I’ll think about it”? Use the objection prompt. Never promise what is not on our site.',
    ],
    free: 'One free AI chat is enough.',
    max: 'Claude Pro: paste the whole conversation and get the best next reply every time.',
    prompts: ['reply', 'objection'],
  },
  {
    id: 'team',
    icon: '👥',
    title: 'Build your team',
    time: '10 min',
    goal: `Invite people who want to earn too — and get +10% of their earnings on top.`,
    steps: [
      'Copy your invite link in the “Team” tab.',
      'Invite friends and followers who make content or want extra income. Use the invite prompt.',
      'Be honest: the program is free, earnings depend only on real sales.',
      'Help your team start: share this academy and your best working videos.',
    ],
    free: 'Your invite link and the prompt are all you need.',
    max: 'Make a short video about how you work with Vaxo — the most convincing invite.',
    prompts: ['invite'],
  },
];

/** "Start here" checklist on the Home tab: each item jumps to a tab (and lesson). */
const CHECKLIST_EN: Check[] = [
  { id: 'lesson', text: 'Read “Start here” (5 min)', tab: 'academy', lesson: 'start' },
  { id: 'link', text: 'Make a link for your first channel', tab: 'links' },
  { id: 'bio', text: 'Set up your profile bio with your link', tab: 'academy', lesson: 'posts' },
  { id: 'factory', text: 'Set up your content factory and post your first video', tab: 'academy', lesson: 'video' },
  { id: 'messages', text: 'Write 5 personal messages to businesses', tab: 'academy', lesson: 'outreach' },
  { id: 'invite', text: 'Invite one friend to your team', tab: 'team' },
];

export const LESSONS: Record<Lang, Lesson[]> = { en: LESSONS_EN, ua: LESSONS_UA, ru: LESSONS_RU };
export const CHECKLIST: Record<Lang, Check[]> = { en: CHECKLIST_EN, ua: CHECKLIST_UA, ru: CHECKLIST_RU };
