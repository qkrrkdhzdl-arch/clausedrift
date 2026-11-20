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

export const KIND = { MONEY: 'money', PERCENT: 'percent', DURATION: 'duration', DATE: 'date' };

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
    const n = Math.max(A.length, B.length);
    for (let k = 0; k < n; k++) {
      const before = A[k] || null;
      const after = B[k] || null;
      if (!before && !after) continue;
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
