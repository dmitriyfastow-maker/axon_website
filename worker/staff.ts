// Team access to the HQ (CRM): the owner invites people by email and gives each a role and the sections they see.
// Sign-in by a one-time code sent to the email (no passwords to remember or lose). The ADMIN_TOKEN key still works as
// the owner's master key. Every /api/admin request is checked against the person's sections.
import type { DB } from './partner.js';
import { mailReady, sendMail } from './mail.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
async function sha(s: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** HQ sections (tabs). "team" (access management) is the owner's only. */
export const SECTIONS = ['today', 'chats', 'leads', 'claude', 'work', 'stats', 'team', 'pay', 'fin', 'cartoon', 'auto', 'links'] as const;
export const SECTION_NAMES: Record<string, string> = { today: 'Обзор', chats: 'Переписки', leads: 'Заявки', claude: 'Claude', work: 'Работа Claude', stats: 'Аналитика', team: 'Партнёры и менеджеры', pay: 'Выплаты', fin: 'Финансы', cartoon: 'Мультик', auto: 'Автопилот', links: 'Ссылки' };
/** Ready-made roles: a role is just a set of sections; the owner can tick sections by hand too. */
export const ROLES: Record<string, { name: string; sections: string[]; write: boolean }> = {
  owner: { name: 'Владелец', sections: [...SECTIONS, 'access'], write: true },
  admin: { name: 'Администратор', sections: [...SECTIONS], write: true },
  manager: { name: 'Менеджер по клиентам', sections: ['today', 'chats', 'leads', 'work'], write: true },
  finance: { name: 'Финансы / бухгалтер', sections: ['today', 'fin', 'pay'], write: true },
  marketing: { name: 'Маркетинг и соцсети', sections: ['today', 'stats', 'work', 'cartoon', 'links'], write: true },
  viewer: { name: 'Только просмотр', sections: ['today', 'stats'], write: false },
};

export type Me = { id: number | null; email: string; name: string; role: string; sections: string[]; write: boolean };
export const OWNER_KEY: Me = { id: null, email: '', name: 'Владелец (ключ)', role: 'owner', sections: ROLES.owner.sections, write: true };

type Row = { id: number; email: string; name: string | null; role: string; sections: string | null; can_write: number; active: number };
const toMe = (r: Row): Me => {
  let sections = (ROLES[r.role] || ROLES.viewer).sections;
  try { if (r.sections) sections = (JSON.parse(r.sections) as string[]).filter((s) => (SECTIONS as readonly string[]).includes(s)); } catch {}
  if (!sections.includes('today')) sections = ['today', ...sections];
  if (r.role === 'owner') sections = ROLES.owner.sections;
  return { id: r.id, email: r.email, name: r.name || r.email, role: r.role, sections, write: r.role === 'owner' || !!r.can_write };
};

/** Bearer value → the signed-in person (a staff session), or null. */
export async function staffFromToken(db: DB, bearer: string): Promise<Me | null> {
  if (!/^s_[a-f0-9]{48}$/.test(bearer)) return null;
  const r = await db.prepare(`SELECT s.id, s.email, s.name, s.role, s.sections, s.can_write, s.active FROM staff_sessions x JOIN staff s ON s.id = x.staff_id
    WHERE x.token = ? AND s.active = 1 AND x.created_at > datetime('now', '-30 days')`).bind(await sha(bearer)).first<Row>();
  return r ? toMe(r) : null;
}

/** Which section an /api/admin path belongs to ('' = the overview everyone sees). */
export function sectionOf(path: string): string {
  const p = path.split('/')[0];
  const map: Record<string, string> = {
    '': 'today', pulse: 'today', me: 'today', analytics: 'stats', autopilot: 'auto', 'test-lead': 'auto', digest: 'auto', 'terms-notice': 'auto',
    work: 'work', claude: 'claude', invoice: 'fin', finance: 'fin', payout: 'pay', lead: 'leads', partner: 'team', staff: 'access',
  };
  return map[p] ?? 'access';
}

/** Public: POST /api/staff/code {email} → a 6-digit code by email; POST /api/staff/login {email, code} → {token}. */
export async function handleStaffLogin(db: DB, request: Request, path: string): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 200) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { ok: false, error: 'email' });
  const staff = await db.prepare('SELECT id, active FROM staff WHERE email = ?').bind(email).first<{ id: number; active: number }>();
  if (path === 'code') {
    // Same answer whether or not the email is invited: nobody can probe who has access.
    if (staff?.active && mailReady()) {
      const recent = await db.prepare(`SELECT 1 FROM staff_codes WHERE email = ? AND sent_at > datetime('now', '-60 seconds')`).bind(email).first();
      if (!recent) {
        const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
        await db.prepare(`INSERT INTO staff_codes (email, code_hash, expires_at, tries, sent_at) VALUES (?, ?, datetime('now', '+15 minutes'), 0, datetime('now'))
          ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, tries = 0, sent_at = excluded.sent_at`).bind(email, await sha(`vaxo-hq:${email}:${code}`)).run();
        await sendMail(email, `Vaxo CRM: код для входа ${code}`, `Ваш код для входа в Vaxo CRM: ${code}\n\nОн действует 15 минут. Если вы не входили — просто проигнорируйте это письмо.`);
      }
    }
    return json(200, { ok: true, mail: mailReady() });
  }
  if (path === 'login') {
    const code = typeof b.code === 'string' ? b.code.replace(/\D/g, '') : '';
    const row = await db.prepare(`SELECT code_hash, tries, expires_at > datetime('now') AS fresh FROM staff_codes WHERE email = ?`).bind(email).first<{ code_hash: string; tries: number; fresh: number }>();
    if (!staff?.active || !row || !row.fresh || row.tries >= 5) return json(401, { ok: false });
    if ((await sha(`vaxo-hq:${email}:${code}`)) !== row.code_hash) {
      await db.prepare('UPDATE staff_codes SET tries = tries + 1 WHERE email = ?').bind(email).run();
      return json(401, { ok: false });
    }
    await db.prepare('DELETE FROM staff_codes WHERE email = ?').bind(email).run();
    const token = 's_' + hex(24);
    await db.prepare('INSERT INTO staff_sessions (token, staff_id) VALUES (?, ?)').bind(await sha(token), staff.id).run();
    await db.prepare(`UPDATE staff SET last_login = datetime('now') WHERE id = ?`).bind(staff.id).run();
    return json(200, { ok: true, token });
  }
  return json(404, { ok: false });
}

/** Owner only: GET /api/admin/staff → people + roles; POST staff {email, name, role, sections, write} → invite / update;
 * POST staff/<id>/off → revoke access (sessions end). */
export async function handleStaffAdmin(db: DB, request: Request, path: string, me: Me, origin: string): Promise<Response> {
  if (me.role !== 'owner') return json(403, { ok: false });
  if (request.method === 'GET') {
    const { results } = await db.prepare('SELECT id, email, name, role, sections, can_write, active, created_at, last_login FROM staff ORDER BY active DESC, id').all();
    return json(200, { ok: true, staff: results, roles: ROLES, sections: SECTIONS, names: SECTION_NAMES, mail: mailReady() });
  }
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const off = path.match(/^(\d+)\/off$/);
  if (off) {
    const id = Number(off[1]);
    const t = await db.prepare('SELECT role FROM staff WHERE id = ?').bind(id).first<{ role: string }>();
    if (!t || (t.role === 'owner' && me.id === id)) return json(400, { ok: false, error: 'self' });
    await db.prepare('UPDATE staff SET active = 0 WHERE id = ?').bind(id).run();
    await db.prepare('DELETE FROM staff_sessions WHERE staff_id = ?').bind(id).run();
    return json(200, { ok: true });
  }
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 200) : '';
  const role = typeof b.role === 'string' && ROLES[b.role] ? b.role : 'viewer';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { ok: false, error: 'email' });
  const sections = Array.isArray(b.sections) ? (b.sections as unknown[]).map(String).filter((s) => (SECTIONS as readonly string[]).includes(s)) : ROLES[role].sections;
  const name = typeof b.name === 'string' ? b.name.trim().slice(0, 100) : '';
  await db.prepare(`INSERT INTO staff (email, name, role, sections, can_write, active, invited_by) VALUES (?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT (email) DO UPDATE SET name = excluded.name, role = excluded.role, sections = excluded.sections, can_write = excluded.can_write, active = 1`)
    .bind(email, name || null, role, JSON.stringify(sections), b.write === false ? 0 : 1, me.email || 'owner').run();
  if (b.notify !== false && mailReady()) {
    await sendMail(email, 'Вас пригласили в Vaxo CRM', `Здравствуйте${name ? ', ' + name : ''}!\n\nВам открыт доступ к Vaxo CRM (роль: ${ROLES[role].name}).\nВход: ${origin}/admin/ → «Войти по почте» → введите этот адрес, на него придёт код.\n\nПароль не нужен.`);
  }
  return json(200, { ok: true });
}
