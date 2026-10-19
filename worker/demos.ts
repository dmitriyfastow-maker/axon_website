// Personal demo assistants for outreach: vaxogroup.com/demo/chat/?b=<slug>.
// Facts come from public listings (research/leads/); anything not listed is "the owner will confirm".

export interface Demo {
  name: string;
  city: string;
  kind: string;
  facts: string;
}

export const DEMOS: Record<string, Demo> = {
  'complete-heating': { name: 'Complete Heating & Sheet Metal', city: 'Spokane, WA', kind: 'heating, furnace and HVAC repair', facts: 'Family team, about 30 years in Spokane. Furnace repair, heating installation, sheet metal work, scheduled service. Phone 509-533-9528, website completeheatingspokane.com.' },
  'rc-auto': { name: 'RC Auto Specialists', city: 'Tulsa, OK', kind: 'auto repair shop', facts: 'Since 2007. Diesel and Ford engine specialists, general auto repair. Phone 918-872-8115, website rcautospecialists.com.' },
  'art-of-the-earth': { name: 'Art of the Earth Landscaping', city: 'Boise / Garden City, ID', kind: 'landscaping', facts: 'Owner Kody. Paver patios, water features, landscape design and installation. 9777 W Chinden Blvd, Garden City, ID. Free estimates.' },
  kingdaddy: { name: 'Kingdaddy Auto & Fleet Repair', city: 'Tulsa, OK', kind: 'auto and fleet repair', facts: 'Auto repair and fleet maintenance for business vehicles. Customers praise the honest owner.' },
  'top-notch': { name: 'Top Notch Professional Cleaning Services', city: 'Wichita, KS', kind: 'house cleaning', facts: 'Family-owned. 128 N Santa Fe St, Wichita. Phone 316-992-3736. Weekly, bi-weekly and monthly cleaning, one-time deep cleaning.' },
  titus: { name: 'Titus Cleaning', city: 'Wichita, KS', kind: 'house cleaning', facts: 'Family-owned since 2023, veteran-owned. Discounts for veterans and seniors. Residential cleaning.' },
  cesars: { name: 'Cesars All Out Cleaning Service', city: 'Wichita, KS', kind: 'residential and commercial cleaning', facts: 'Family-owned since 2021. Homes and commercial clients, including senior living facilities.' },
  'crawford-dds': { name: 'Eric Crawford DDS Family Dentistry', city: 'Amarillo, TX', kind: 'family dentist', facts: 'Family dentistry since 1997. Phone 806-353-1502, website ericcrawforddentist.com. For emergencies after hours the assistant takes name, phone and the problem so the office calls back first thing; for severe pain, swelling or bleeding it advises calling 911 or going to the ER.' },
  'cinderella-castle': { name: 'Cinderella Castle Cleaning', city: 'Des Moines, IA', kind: 'house cleaning', facts: 'Family-owned since 1981, 3814 36th St, Des Moines. 4.6 stars from 125 reviews on HomeAdvisor. The same cleaner every time. Gift certificates available.' },
  maraja: { name: 'Maraja Family Cleaning', city: 'Des Moines / Urbandale, IA', kind: 'house cleaning', facts: 'Family-owned since 2015. Residential cleaning, regular and one-time.' },
  'maid-gracy': { name: 'Maid Gracy', city: 'Omaha, NE', kind: 'house cleaning', facts: 'Family team of 3, 8 years in business. Residential cleaning.' },
  'triple-j': { name: 'Triple J Cleaning of Omaha', city: 'Omaha, NE', kind: 'house cleaning', facts: 'Family-owned, eco-friendly cleaning products. Residential cleaning.' },
};

export function demoPrompt(d: Demo): string {
  return `You are the friendly AI assistant on the website of ${d.name} (${d.kind}, ${d.city}). This is a live demo built by Vaxo.
Answer in the visitor's language, 1–3 short sentences, warm and professional, like the best front-desk person.
Goal: answer questions, then collect what the business needs to call back: name, phone or email, address or area, what they need and when. Confirm you'll pass it on and the team will reach out.
Known facts (use only these): ${d.facts}
Never invent prices, availability, licenses or guarantees: say "the team will confirm the exact price/time when they call you" and ask for contact details.
If asked who built you: "Vaxo (vaxogroup.com) — the same assistant can work on this business's website 24/7."`;
}
