// A small Markdown view for Canvas documents: headings, lists, tables, code, bold. Everything is escaped first,
// so text from the model can never become markup.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const href = (u: string) => u.replace(/&#38;/g, '&').replace(/"/g, '%22');
// Links: [text](https://…) and bare https://… become safe anchors (the text is already escaped).
const links = (s: string) => s
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t, u) => `<a href="${href(u)}" target="_blank" rel="noopener">${t}</a>`)
  .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_m, pre, u) => `${pre}<a href="${href(u)}" target="_blank" rel="noopener">${u}</a>`);
const inline = (s: string) => links(esc(s)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
/** Chat replies are joined with blank lines; a table split that way is put back together first. */
const LIST = String.raw`\s*(?:[-*•]|\d+[.)])\s`;
const joinList = (t: string) => t.replace(new RegExp(`(^|\\n)(${LIST}[^\\n]*)\\n\\n(?=${LIST})`, 'g'), '$1$2\n');
export const chatMd = (text: string) => md(joinList(joinList(text)).replace(/(^|\n)(\s*\|[^\n]*)\n\n(?=\s*\|)/g, '$1$2\n').replace(/(^|\n)(\s*\|[^\n]*)\n\n(?=\s*\|)/g, '$1$2\n'));
const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export function md(text: string): string {
  const lines = text.replace(/\r/g, '').split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('```')) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
    } else if (/^#{1,4}\s/.test(l)) {
      const n = Math.min(3, l.match(/^#+/)![0].length);
      out.push(`<h${n}>${inline(l.replace(/^#+\s*/, ''))}</h${n}>`);
    } else if (/^\s*\|/.test(l) && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1] || '')) {
      const head = cells(l).map((c) => `<th>${inline(c)}</th>`).join('');
      const rows: string[] = [];
      for (i += 2; i < lines.length && /^\s*\|/.test(lines[i]); i++) rows.push(`<tr>${cells(lines[i]).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`);
      i--;
      out.push(`<div class="tbl"><table><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`);
    } else if (/^\s*([-*•]|\d+[.)])\s/.test(l)) {
      const ordered = /^\s*\d/.test(l), items: string[] = [];
      for (; i < lines.length && /^\s*([-*•]|\d+[.)])\s/.test(lines[i]); i++) items.push(`<li>${inline(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>`);
      i--;
      // A numbered list broken by a paragraph goes on with its own number (2., 3.), not from 1 again.
      const start = ordered ? parseInt(l, 10) : 1;
      out.push(ordered ? `<ol${start > 1 ? ` start="${start}"` : ''}>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
    } else if (l.trim()) out.push(`<p>${inline(l)}</p>`);
  }
  return out.join('');
}
