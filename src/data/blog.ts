// Blog posts (English, for search and AI assistants). Plain, useful answers to questions our clients really ask.
// Prices match the price list in worker/chat.ts FACTS; never add numbers we cannot back up.
export type Post = { slug: string; title: string; desc: string; date: string; body: [string, string[]][] };

export const POSTS: Post[] = [
  {
    slug: 'website-cost-2026',
    title: 'How much does a website cost in 2026? Honest price ranges',
    desc: 'Real price ranges for a one-page site, a landing page, a business website and an online store — and what changes the price.',
    date: '2026-10-20',
    body: [
      ['The short answer', ['A simple one-page site can cost under $200; a professional landing page usually costs $1,000–5,000; a multi-page business website $2,000–10,000; an online store $3,000–20,000. These are the ranges we work with at Vaxo.']],
      ['What changes the price', ['Number of pages and unique designs.', 'Who writes the texts and makes the photos.', 'Features: booking, payments, accounts, integrations with your CRM.', 'Languages and markets.', 'Speed: a rushed deadline costs more.']],
      ['Costs people forget', ['Domain: about $10–15 a year.', 'Hosting: from free to $20+ a month depending on traffic.', 'Support and updates after launch.', 'Traffic: a site without ads, SEO or social media gets few visitors.']],
      ['How to spend less without losing quality', ['Start with one page that does one job (calls, bookings or requests) and grow later. At Vaxo a one-page website is a $199 starter package, delivered in 7 days, and its price is credited if you continue with a bigger project within 30 days.']],
      ['Questions to ask any studio', ['Is the price fixed? How many revision rounds are included? Who owns the domain and the code? What happens if the deadline is missed? What are the refund rules? Good studios answer all five in writing before you pay.']],
    ],
  },
  {
    slug: 'what-is-a-domain',
    title: 'What is a domain name and how do you get one? A plain-English guide',
    desc: 'What a domain is, where to buy it, how much it costs and how to give a web studio access without giving away your account.',
    date: '2026-10-20',
    body: [
      ['A domain is your address', ['A domain is the name people type to find your site, like yourbusiness.com. You rent it by the year from a registrar. Without a domain your website has no address of its own.']],
      ['Where to buy', ['Popular registrars include Cloudflare, Namecheap and GoDaddy. A .com usually costs about $10–15 a year. Watch for a cheap first year and a much higher renewal price.']],
      ['How to choose a name', ['Short, easy to say and spell, no hyphens if possible. Check that the same name is free on Instagram and TikTok. A local ending (.de, .co.uk, .com.ua) can help if you only sell in one country.']],
      ['Keep it in your name', ['Always register the domain on your own account and email. A studio should get access to set it up, not own it. If a studio insists on registering it in their name, ask why.']],
      ['How to give access safely', ['Most registrars let you invite a team member or change the DNS records yourself while we tell you exactly what to paste. You never need to send your password.']],
      ['Not sure? Ask', ['If this is your first website, our AI manager Vax explains each step in your chat, or we buy and set up the domain for you in your name.']],
    ],
  },
  {
    slug: 'ai-chat-assistant-small-business',
    title: 'AI chat assistant for a small business: what it does and what it costs',
    desc: 'What a website AI chat can and cannot do, how it gets you more requests, and what it costs.',
    date: '2026-10-20',
    body: [
      ['What it does', ['An AI chat on your website answers common questions 24/7 — prices, hours, services, booking — and collects the name and contact of people who are ready to buy. It replies in seconds, in the visitor’s language.']],
      ['Why it brings more clients', ['Many visitors leave when they cannot get a quick answer, especially at night or on weekends. A chat that answers at once and asks for a contact turns some of them into requests you can call back.']],
      ['What it should not do', ['Promise prices or results you do not offer, ask for card details, or pretend to be a human. A good assistant says it is an AI and hands over to you when the question is complex.']],
      ['What it costs', ['At Vaxo an AI chat assistant for your website is a $249 starter package, trained on your services, prices and FAQ, with new requests sent to your email or Telegram, ready in 7 days. You can try ours — Vax, the raccoon on our site — before you decide.']],
      ['How to get the most from it', ['Give it your real prices and answers to the 20 questions customers ask most. Read the conversations once a week and add what it did not know.']],
    ],
  },
];
