/*
 * segment.js — turn a contract into clauses.
 *
 * Contracts are not prose: they are numbered obligations. The hard part of
 * comparing two versions is that the numbering moves — a new clause 5 pushes
 * everything below it down — so a line-by-line diff reports the whole document
 * as changed. This module cuts the text on its own headings (Korean 제N조,
 * English "Article N", bare numbered items, bracketed titles) and keeps the
 * label, the heading, the body and the source line range for each clause.
 *
 * When a document has no headings at all, it falls back to blank-line
 * paragraphs, and if there are none of those either, to single lines. The
 * caller is told which strategy was used so the UI can say so.
 */

/** A heading is only a heading if it starts a line and stays short. */
const MAX_HEADING_LEN = 90;

const PATTERNS = [
  { kind: 'kr-article', re: /^제\s*(\d{1,3})\s*조(?:\s*의\s*(\d{1,2}))?/ },
  { kind: 'en-article', re: /^(article|section|clause)\s+([0-9]{1,3}|[ivxlc]{1,6})\b/i },
  { kind: 'bracket', re: /^[[［(（]\s*([^\]］)）]{2,40})\s*[\]］)）]\s*$/ },
  { kind: 'bullet', re: /^[■◆◈○●※]\s*\S/ },
  { kind: 'roman', re: /^([ivxlc]{1,6})\.\s+\S/i },
  { kind: 'numbered', re: /^(\d{1,2})(\.\d{1,2}){0,3}[.)]\s+\S/ },
  { kind: 'caps', re: /^[A-Z][A-Z0-9 \-&/()'.,]{5,70}$/ },
];

const SUB_HEADING = /^[[［(（]\s*[^\]］)）]{1,40}\s*[\]］)）]\s*$/;
const PAGE_NOISE = /^(?:[-–—]\s*)?(?:page\s*)?\d{1,3}\s*(?:\/\s*\d{1,3})?(?:\s*[-–—])?$/i;

export function normalizeText(text) {
  return String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '');
}

/** Classify one trimmed line. Returns null or {kind, label}. */
export function headingOf(line) {
  const s = line.trim();
  if (!s || s.length > MAX_HEADING_LEN) return null;
  if (PAGE_NOISE.test(s)) return null;
  for (const p of PATTERNS) {
    const m = s.match(p.re);
    if (!m) continue;
    if (p.kind === 'numbered' || p.kind === 'roman' || p.kind === 'en-article') {
      // "1. The parties agree that ..." is a sentence, not a heading. A numbered
      // heading is short and does not end like a full sentence.
      if (s.length > 60) continue;
      if (/[.。]$/.test(s) && s.length > 32) continue;
    }
    if (p.kind === 'caps' && /\s{2,}/.test(s)) continue;
    return { kind: p.kind, label: labelFor(p.kind, s, m) };
  }
  return null;
}

function labelFor(kind, s, m) {
  if (kind === 'kr-article') return `제${m[1]}조${m[2] ? `의${m[2]}` : ''}`;
  if (kind === 'en-article') return `${m[1]} ${m[2]}`.replace(/\s+/g, ' ');
  if (kind === 'numbered') return m[1] + (m[2] ? m[2] : '') + '.';
  if (kind === 'roman') return m[1].toUpperCase() + '.';
  return s.length <= 40 ? s : s.slice(0, 40);
}

/**
 * Cut text into clauses.
 * @returns {{clauses: Array, strategy: string}}
 */
export function segment(rawText) {
  const text = normalizeText(rawText);
  const lines = text.split('\n');

  const clauses = [];
  let cur = null;
  const push = () => {
    if (!cur) return;
    const body = cur.bodyLines.join('\n').trim();
    if (!cur.heading && !body) { cur = null; return; }
    clauses.push({
      index: clauses.length,
      label: cur.label,
      heading: cur.heading,
      body,
      text: (cur.heading + (body ? '\n' + body : '')).trim(),
      from: cur.from,
      to: cur.to,
    });
    cur = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { if (cur) cur.bodyLines.push(''); continue; }
    if (PAGE_NOISE.test(trimmed)) continue;

    const h = headingOf(line);
    if (h) {
      push();
      cur = { label: h.label, heading: trimmed, bodyLines: [], from: i + 1, to: i + 1 };
      // "(임대료)" or "[Deposit]" printed on the line below the article number
      // belongs to the heading, not the body.
      const next = (lines[i + 1] || '').trim();
      if (h.kind === 'kr-article' && SUB_HEADING.test(next)) {
        cur.heading += ' ' + next;
        cur.to = i + 2;
        i += 1;
      }
      continue;
    }

    if (!cur) {
      // Text before the first heading is the preamble (parties, recitals).
      cur = { label: '', heading: '', bodyLines: [], from: i + 1, to: i + 1 };
    }
    cur.bodyLines.push(line);
    cur.to = i + 1;
  }
  push();

  const hasHeadings = clauses.some((c) => c.heading);
  if (clauses.length >= 2 || (hasHeadings && clauses.length === 1)) {
    const preamble = clauses[0];
    if (!preamble.heading && preamble.text.length < 40) clauses.shift();
    clauses.forEach((c, k) => { c.index = k; if (!c.label) c.label = 'P'; });
    return { clauses, strategy: 'headings' };
  }

  // No usable headings: blank-line paragraphs.
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length >= 2) {
    return {
      clauses: paras.map((p, k) => ({
        index: k, label: `P${k + 1}`, heading: '', body: p, text: p, from: 0, to: 0,
      })),
      strategy: 'paragraphs',
    };
  }

  const singles = lines.map((l) => l.trim()).filter(Boolean);
  return {
    clauses: singles.map((l, k) => ({
      index: k, label: `L${k + 1}`, heading: '', body: l, text: l, from: k + 1, to: k + 1,
    })),
    strategy: 'lines',
  };
}

/** Short human label for a clause, used in tables and report rows. */
export function clauseTitle(c, max = 64) {
  const head = (c.heading || c.body.split('\n')[0] || '').replace(/\s+/g, ' ').trim();
  const label = c.label && !/^[PL]\d+$/.test(c.label) ? c.label + ' ' : '';
  const t = (label + head).trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}
