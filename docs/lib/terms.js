/*
 * terms.js — pull the numbers that decide what a contract costs you.
 *
 * A clause can be rewritten from "월 임대료는 1,200,000원으로 한다" to "월
 * 임대료는 1,350,000원으로 하며, 연체 시 연 12%의 지연이자를 가산한다" and a
 * word diff only shows ink. What changed is 150,000원 a month and a new 12%.
 * This module reads amounts (Korean 만/억 multipliers included), percentages,
 * periods and dates out of each clause so the comparison can put them in a
 * table with the delta and the yearly cost.
 */

import { trigrams, jaccard } from './align.js';

export const KIND = { MONEY: 'money', PERCENT: 'percent', DURATION: 'duration', DATE: 'date' };

const CONTEXT = 34;

const MULT = { 천: 1e3, 만: 1e4, 억: 1e8, 조: 1e12 };
const CUR_BY_UNIT = {
  원: 'KRW', krw: 'KRW', '₩': 'KRW',
  '$': 'USD', usd: 'USD', 달러: 'USD', dollar: 'USD', dollars: 'USD',
  '€': 'EUR', eur: 'EUR', 유로: 'EUR', euro: 'EUR', euros: 'EUR',
  '£': 'GBP', gbp: 'GBP',
};

const num = (s) => Number(String(s).replace(/,/g, ''));

function pushTerm(list, term) {
  if (!Number.isFinite(term.value)) return;
  term.context = term.context || '';
  // Drop a candidate that sits inside an already accepted, longer match.
  for (const t of list) {
    if (term.start < t.end && t.start < term.end) {
      if (t.end - t.start >= term.end - term.start) return;
    }
  }
  list.push(term);
}

/** All amounts, percentages, periods and dates in one piece of text. */
export function extractTerms(text) {
  const src = String(text || '');
  const out = [];

  // 1) Symbol before the number: $1,200 · €1,000 · ₩900,000
  const symbolRe = /([$€£₩])\s?([0-9][0-9,]*(?:\.[0-9]+)?)/g;
  for (const m of src.matchAll(symbolRe)) {
    pushTerm(out, {
      kind: KIND.MONEY, value: num(m[2]), currency: CUR_BY_UNIT[m[1]] || 'USD',
      raw: m[0], start: m.index, end: m.index + m[0].length, multiplier: 1,
    });
  }

  // 2) Number with a Korean multiplier and/or a currency word: 120만 원, 1,200,000원, 1,000 USD
  const suffixRe = /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(만|억|천|조)?\s*(원|KRW|USD|EUR|GBP|달러|유로|dollars?|euros?)/gi;
  for (const m of src.matchAll(suffixRe)) {
    const unit = m[3].toLowerCase();
    const mult = m[2] ? MULT[m[2]] : 1;
    // "1,000 USD" is not 1,000 dollars-and-a-multiplier; the multiplier only
    // exists for Korean units, where it is written before 원.
    const currency = CUR_BY_UNIT[unit] || (unit.startsWith('dollar') ? 'USD' : unit.startsWith('euro') ? 'EUR' : null);
    if (!currency) continue;
    pushTerm(out, {
      kind: KIND.MONEY, value: num(m[1]) * mult, currency, raw: m[0],
      start: m.index, end: m.index + m[0].length, multiplier: mult,
    });
  }

  // 3) Currency word before the number: USD 1,200 / KRW 1,200,000
  const prefixRe = /\b(KRW|USD|EUR|GBP)\s?([0-9][0-9,]*(?:\.[0-9]+)?)/gi;
  for (const m of src.matchAll(prefixRe)) {
    pushTerm(out, {
      kind: KIND.MONEY, value: num(m[2]), currency: m[1].toUpperCase(), raw: m[0],
      start: m.index, end: m.index + m[0].length, multiplier: 1,
    });
  }

  // 4) Percentages
  const pctRe = /([0-9]+(?:\.[0-9]+)?)\s*(?:%|퍼센트|percent(?:age)?\b)/gi;
  for (const m of src.matchAll(pctRe)) {
    pushTerm(out, {
      kind: KIND.PERCENT, value: Number(m[1]), unit: '%', raw: m[0],
      start: m.index, end: m.index + m[0].length,
    });
  }

  // 5) Periods
  const durRe = /([0-9]+)\s*(영업일|business\s+days?|개월|months?|주일|weeks?|주|일|days?|년|years?)/gi;
  for (const m of src.matchAll(durRe)) {
    const unitRaw = m[2].toLowerCase().replace(/\s+/g, ' ');
    const n = Number(m[1]);
    let days = n;
    if (/영업일|business/.test(unitRaw)) days = Math.round(n * 1.4);
    else if (/개월|month/.test(unitRaw)) days = n * 30;
    else if (/주|week/.test(unitRaw)) days = n * 7;
    else if (/년|year/.test(unitRaw)) days = n * 365;
    pushTerm(out, {
      kind: KIND.DURATION, value: days, unit: unitRaw, count: n, raw: m[0],
      start: m.index, end: m.index + m[0].length,
    });
  }

  // 6) Dates (Korean and ISO order only — month names are handled below)
  const dateRe = /((?:19|20)\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})\s*일?/g;
  for (const m of src.matchAll(dateRe)) {
    const iso = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    pushTerm(out, {
      kind: KIND.DATE, value: Date.parse(iso + 'T00:00:00Z'), unit: 'date', raw: m[0],
      iso, start: m.index, end: m.index + m[0].length,
    });
  }

  for (const t of out) {
    t.context = src.slice(Math.max(0, t.start - CONTEXT), Math.min(src.length, t.end + CONTEXT));
  }
  return out.sort((a, b) => a.start - b.start);
}

/** True when the clause is about something the signer pays or owes. */
const COST_WORDS = /(보증금|임대료|월세|차임|위약금|수수료|연체|지연이자|벌금|비용|대금|청구|결제|급여|임금|deposit|rent|fee|penalt|charge|price|cost|payment|interest|liabilit|bill|invoice|hourly|rate)/i;
export function isCostClause(text) {
  return COST_WORDS.test(String(text || ''));
}

export function formatMoney(value, currency = 'KRW') {
  const digits = currency === 'KRW' ? 0 : 2;
  const body = value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
  if (currency === 'KRW') return `₩${body}`;
  if (currency === 'USD') return `$${body}`;
  if (currency === 'EUR') return `€${body}`;
  if (currency === 'GBP') return `£${body}`;
  return `${body} ${currency}`;
}

export function formatTerm(t) {
  if (!t) return '—';
  if (t.kind === KIND.MONEY) return formatMoney(t.value, t.currency);
  if (t.kind === KIND.PERCENT) return `${t.value}%`;
  if (t.kind === KIND.DURATION) return t.raw.replace(/\s+/g, ' ');
  if (t.kind === KIND.DATE) return t.iso || t.raw;
  return t.raw;
}

/**
 * Match the terms of two versions of the same clause, in reading order.
 * @returns {Array<{kind, before, after, deltaPct, currency, unit}>}
 */
export function pairTerms(aTerms, bTerms, kinds = [KIND.MONEY, KIND.PERCENT, KIND.DURATION, KIND.DATE]) {
  const rows = [];
  for (const kind of kinds) {
    const A = aTerms.filter((t) => t.kind === kind);
    const B = bTerms.filter((t) => t.kind === kind);
    if (!A.length && !B.length) continue;

    // What surrounds a number is what identifies it. The rent is the number
    // near "월 차임", the penalty the one near "위약금" — so two versions of a
    // clause are paired on context, not on the order the numbers happen to
    // appear in.
    const score = (a, b) => {
      const sameValue = a.value === b.value && (a.currency || '') === (b.currency || '')
        && (a.unit || '') === (b.unit || '');
      const ctx = jaccard(trigrams(a.context || ''), trigrams(b.context || ''));
      return (sameValue ? 0.35 : 0) + 0.65 * ctx;
    };

    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
    const back = Array.from({ length: n + 1 }, () => new Int8Array(m + 1));
    const GAP = -0.35;
    for (let i = 1; i <= n; i++) { dp[i][0] = dp[i - 1][0] + GAP; back[i][0] = 1; }
    for (let j = 1; j <= m; j++) { dp[0][j] = dp[0][j - 1] + GAP; back[0][j] = 2; }
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const sc = score(A[i - 1], B[j - 1]);
        const diag = dp[i - 1][j - 1] + (sc >= 0.15 ? sc : sc - 1);
        const up = dp[i - 1][j] + GAP;
        const left = dp[i][j - 1] + GAP;
        let best = diag, dir = 0;
        if (up > best) { best = up; dir = 1; }
        if (left > best) { best = left; dir = 2; }
        dp[i][j] = best; back[i][j] = dir;
      }
    }

    const pairs = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      const dir = i === 0 ? 2 : j === 0 ? 1 : back[i][j];
      if (dir === 0) { pairs.push([A[i - 1], B[j - 1]]); i--; j--; }
      else if (dir === 1) { pairs.push([A[i - 1], null]); i--; }
      else { pairs.push([null, B[j - 1]]); j--; }
    }
    pairs.reverse();

    for (const [before, after] of pairs) {
      if (before && after && before.value === after.value
        && (before.currency || '') === (after.currency || '')
        && (before.unit || '') === (after.unit || '')) continue;
      const base = before ? before.value : after ? after.value : 0;
      const delta = (after ? after.value : 0) - (before ? before.value : 0);
      rows.push({
        kind, before, after,
        delta,
        deltaPct: base ? delta / Math.abs(base) : null,
        currency: (after && after.currency) || (before && before.currency) || null,
      });
    }
  }
  return rows;
}
