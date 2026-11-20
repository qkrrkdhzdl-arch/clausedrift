/*
 * tests.js — the suite, runnable by hand at /tests.html and by
 * tools/run_tests.py in headless Chromium. If a test here fails, the page is
 * lying to someone about their contract, so the bar is not "looks right".
 */

import { segment, headingOf, normalizeText } from './lib/segment.js';
import { alignClauses, jaccard, trigrams, diffWords, changeRatio } from './lib/align.js';
import { extractTerms, pairTerms, formatMoney, formatTerm, isCostClause, KIND } from './lib/terms.js';
import { riskReport, RISKS, PROTECTION_WORDS } from './lib/risk.js';
import { analyse } from './lib/analyze.js';
import { SAMPLES } from './lib/samples.js';
import { STRINGS, LANGS, setLang, t, pick } from './lib/i18n.js';

const results = [];
function ok(name, condition, detail = '') {
  results.push({ name, pass: !!condition, detail: condition ? '' : detail });
}
function eq(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  ok(name, a === b, `expected ${b}, got ${a}`);
}
function near(name, actual, expected, tol = 1e-9) {
  ok(name, typeof actual === 'number' && Math.abs(actual - expected) <= tol, `expected ~${expected}, got ${actual}`);
}

const leaseA = SAMPLES.lease.a.text;
const leaseB = SAMPLES.lease.b.text;
const freeA = SAMPLES.freelance.a.text;
const freeB = SAMPLES.freelance.b.text;

/* ------------------------------------------------------------- segmentation */

eq('normalize strips BOM and CRLF', normalizeText('\uFEFFa\r\nb\rc'), 'a\nb\nc');
ok('heading: 제3조', headingOf('제3조 (보증금 및 차임)')?.label === '제3조', String(headingOf('제3조 (보증금 및 차임)')));
ok('heading: 제3조의2', headingOf('제3조의2 (특약)')?.label === '제3조의2');
ok('heading: Article 4', headingOf('Article 4 — Ownership')?.kind === 'en-article');
ok('heading: numbered 1.', headingOf('1. Scope of work')?.label === '1.');
ok('heading: long sentence is not a heading', headingOf('1. The Contractor will deliver a logo system, a colour and type sheet, and a five-page responsive website.') === null);
ok('heading: page number ignored', headingOf('12') === null && headingOf('- 3 -') === null);
ok('heading: plain sentence is not a heading', headingOf('보증금은 금 10,000,000원으로 한다.') === null);

const segLease = segment(leaseA);
eq('lease: 8 articles', segLease.clauses.filter((c) => c.label.startsWith('제')).length, 8);
eq('lease: strategy headings', segLease.strategy, 'headings');
ok('lease: each clause has body', segLease.clauses.every((c) => c.text.length > 10));
eq('lease: article labels in order', segLease.clauses.filter((c) => c.label.startsWith('제')).map((c) => c.label).slice(0, 3), ['제1조', '제2조', '제3조']);
ok('lease: the parties stay as a preamble clause', segLease.clauses[0].label === 'P');

const segFree = segment(freeA);
eq('freelance: 7 numbered clauses', segFree.clauses.filter((c) => /^\d+\./.test(c.label)).length, 7);
eq('freelance: strategy headings', segFree.strategy, 'headings');

const paragraphs = segment('First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here.');
eq('paragraph fallback', paragraphs.strategy, 'paragraphs');
eq('paragraph count', paragraphs.clauses.length, 3);

const linesOnly = segment('Alpha beta gamma.\nDelta epsilon zeta.');
ok('line fallback returns clauses', linesOnly.clauses.length >= 2);

/* --------------------------------------------------------------------- align */

ok('trigrams of identical text equal', jaccard(trigrams('hello world'), trigrams('hello world')) === 1);
ok('unrelated text is not similar', jaccard(trigrams('rent is 650,000 won'), trigrams('arbitration in Busan')) < 0.2);
ok('empty vs non-empty is 0', jaccard(trigrams(''), trigrams('abc')) === 0);

const sameOps = alignClauses(segment(leaseA).clauses, segment(leaseA).clauses);
ok('identical versions produce only same', sameOps.every((o) => o.type === 'same'), JSON.stringify(sameOps.map((o) => o.type)));

// Renumbering alone must not look like twenty edits.
const renumbered = leaseA.replace(/제(\d)조/g, (m, d) => `제${Number(d) + 1}조`);
const renumOps = alignClauses(segment(leaseA).clauses, segment(renumbered).clauses);
const renumSplit = renumOps.filter((o) => o.type === 'added' || o.type === 'removed').length;
ok('renumbering keeps clauses matched', renumSplit === 0 && renumOps.length === segLease.clauses.length, `split=${renumSplit} of ${renumOps.length}`);

const insertOps = alignClauses(
  segment('1. Alpha content about rent.\n\n2. Beta content about deposit.').clauses,
  segment('1. Alpha content about rent.\n\n2. New clause about arbitration.\n\n3. Beta content about deposit.').clauses,
);
ok('inserted clause is added, neighbours stay matched',
  insertOps.some((o) => o.type === 'added') && insertOps.filter((o) => o.type === 'removed').length === 0,
  JSON.stringify(insertOps.map((o) => o.type)));

const d1 = diffWords('the fee is 4,800 dollars', 'the fee is 5,200 dollars');
ok('diff marks the changed number', d1.some((p) => p.op === 'ins' && p.text.includes('5,200')) && d1.some((p) => p.op === 'del' && p.text.includes('4,800')));
ok('diff marks unchanged words as same', d1.some((p) => p.op === 'same' && p.text.includes('the fee is')));
ok('changeRatio 0 for identical', changeRatio('a b c', 'a b c') === 0);
ok('changeRatio high for rewrite', changeRatio('the rent is six hundred fifty thousand won per month', 'arbitration shall be held in busan by the korean commercial arbitration board') > 0.7);

/* --------------------------------------------------------------------- terms */

const money = (s) => extractTerms(s).filter((x) => x.kind === KIND.MONEY);
eq('1,200,000원', money('보증금은 금 1,200,000원으로 한다').map((x) => [x.value, x.currency]), [[1200000, 'KRW']]);
eq('120만 원', money('월세는 120만 원이다').map((x) => x.value), [1200000]);
eq('1.5억 원', money('보증금 1.5억 원').map((x) => x.value), [150000000]);
eq('$4,800', money('total fee is $4,800').map((x) => [x.value, x.currency]), [[4800, 'USD']]);
eq('€1,000', money('prize of €1,000').map((x) => x.currency), ['EUR']);
eq('1,000 USD is not multiplied', money('a fee of 1,000 USD').map((x) => x.value), [1000]);
eq('KRW prefix', money('KRW 900,000').map((x) => x.value), [900000]);

const pct = extractTerms('연 12%의 지연이자, 2.5 % fee').filter((x) => x.kind === KIND.PERCENT).map((x) => x.value);
eq('percentages', pct, [12, 2.5]);

const dur = (s) => extractTerms(s).filter((x) => x.kind === KIND.DURATION).map((x) => x.value);
eq('30일 → 30 days', dur('30일 전에 통지'), [30]);
eq('2 months → 60 days', dur('2 months notice'), [60]);
eq('2주 → 14 days', dur('2주 이내'), [14]);

const dates = extractTerms('2026년 12월 1일부터 2028-11-30까지').filter((x) => x.kind === KIND.DATE).map((x) => x.iso);
eq('Korean and ISO dates', dates, ['2026-12-01', '2028-11-30']);

eq('formatMoney KRW', formatMoney(1200000, 'KRW'), '₩1,200,000');
eq('formatMoney USD', formatMoney(4800, 'USD'), '$4,800');
eq('formatTerm duration keeps the original unit', formatTerm({ kind: KIND.DURATION, raw: '2 months', value: 60 }), '2 months');

const pair = pairTerms(money('월 차임은 650,000원'), money('월 차임은 720,000원'));
eq('one changed amount', pair.length, 1);
eq('delta is 70,000', pair[0].delta, 70000);
near('deltaPct is 10.77%', pair[0].deltaPct, 70000 / 650000);

eq('unchanged amount produces no row', pairTerms(money('보증금 10,000,000원'), money('보증금 10,000,000원')).length, 0);
ok('isCostClause sees 보증금', isCostClause('보증금은 1,000,000원이다'));
ok('isCostClause ignores neutral text', !isCostClause('반려동물 사육은 금지한다'));

/* ---------------------------------------------------------------------- risk */

const riskIds = (a, b) => riskReport(alignClauses(segment(a).clauses, segment(b).clauses)).flags.map((f) => f.id);

ok('arbitration detected (English)', riskIds('1. Governing law\nCourts of Busan.', '1. Governing law\nBinding arbitration in Seoul.').includes('arbitration'));
ok('중재 detected (Korean)', riskIds('제1조 (분쟁)\n법원의 관할로 한다.', '제1조 (분쟁)\n대한상사중재원의 중재로 해결한다.').includes('arbitration'));
ok('deposit forfeiture detected', riskIds('제1조 (보증금)\n보증금은 반환한다.', '제1조 (보증금)\n보증금은 몰수한다.').includes('deposit-forfeit'));
ok('non-compete detected', riskIds('1. Term\nOne year.', '1. Term\nOne year. The Contractor will not work for a competing studio.').includes('non-compete'));
ok('neutral rewrite is not a risk', riskIds('1. Notice\n30 days notice.', '1. Notice\nThirty days notice.').length === 0);
ok('every rule has both languages', RISKS.every((r) => r.en.title && r.ko.title && r.en.why && r.ko.why && r.en.ask && r.ko.ask));
ok('every protection has both languages', PROTECTION_WORDS.every((p) => p.ko && p.en && p.re instanceof RegExp));

const strengthened = riskReport(alignClauses(
  segment('1. Late fee\nInterest of 2% per month.').clauses,
  segment('1. Late fee\nInterest of 12% per month.').clauses,
));
ok('a stricter percentage is "strengthened"', strengthened.flags.some((f) => f.id === 'late-fee' && f.status === 'strengthened' && f.after === 12));

/* ------------------------------------------------------------- end to end */

const lease = analyse(leaseA, leaseB);
ok('lease: something changed', lease.stats.changed >= 3, JSON.stringify(lease.stats));
const rentRow = lease.termRows.find((r) => r.kind === KIND.MONEY && r.before && r.before.value === 650000);
ok('lease: rent row exists', !!rentRow);
eq('lease: rent after is 720,000', rentRow?.after.value, 720000);
eq('lease: rent delta', rentRow?.delta, 70000);
const depositRow = lease.termRows.find((r) => r.kind === KIND.MONEY && r.before && r.before.value === 10000000);
eq('lease: deposit after is 12,000,000', depositRow?.after.value, 12000000);
ok('lease: late fee is a new obligation', lease.risks.flags.some((f) => f.id === 'late-fee' && f.status === 'new'));
ok('lease: arbitration is a new obligation', lease.risks.flags.some((f) => f.id === 'arbitration' && f.status === 'new'));
ok('lease: penalty is reported', lease.risks.flags.some((f) => f.id === 'penalty'));
ok('lease: deposit return protection reported', lease.risks.protections.some((p) => p.id === 'deposit-return'));
ok('lease: rent increase becomes a question', lease.questions.some((q) => (q.en + q.ko).includes('720,000')));

const freelance = analyse(freeA, freeB);
ok('freelance: revision rate change found', freelance.termRows.some((r) => r.before && r.before.value === 90 && r.after && r.after.value === 120));
ok('freelance: 14 → 30 days invoice term', freelance.termRows.some((r) => r.kind === KIND.DURATION && r.before && r.before.count === 14 && r.after && r.after.count === 30));
ok('freelance: termination notice 14 → 7 days', freelance.termRows.some((r) => r.kind === KIND.DURATION && r.before && r.before.count === 14 && r.after && r.after.count === 7));
ok('freelance: non-compete flagged', freelance.risks.flags.some((f) => f.id === 'non-compete'));
ok('freelance: arbitration flagged', freelance.risks.flags.some((f) => f.id === 'arbitration'));
ok('freelance: class action waiver flagged', freelance.risks.flags.some((f) => f.id === 'class-waiver'));
ok('freelance: non-refundable deposit is a lost protection', freelance.risks.protections.some((p) => p.id === 'refund' || p.id === 'deposit-return'));
ok('freelance: questions are generated', freelance.questions.length >= 2);

const identical = analyse(leaseA, leaseA);
eq('identical documents report no changes', identical.stats.changed + identical.stats.added + identical.stats.removed, 0);
eq('identical documents report no terms', identical.termRows.length, 0);
eq('identical documents report no risks', identical.risks.flags.length, 0);

/* --------------------------------------------------------------------- i18n */

const enKeys = Object.keys(STRINGS.en).sort();
const koKeys = Object.keys(STRINGS.ko).sort();
eq('langs are en and ko', LANGS.sort(), ['en', 'ko']);
eq('translation tables have identical keys', koKeys, enKeys);
ok('no empty translations', Object.entries(STRINGS).every(([, table]) => Object.values(table).every((v) => typeof v === 'string')));

setLang('ko');
ok('Korean lookup works', t('input.analyze') === '두 버전 비교하기');
setLang('en');
ok('English lookup works', t('input.analyze') === 'Compare the two versions');
ok('missing key returns the key, not undefined', t('no.such.key') === 'no.such.key');
ok('pick returns the active language', pick({ en: 'a', ko: '나' }) === 'a');

/* ---------------------------------------------------------------- the page */

ok('samples have both sides', SAMPLES.lease.a.text.length > 500 && SAMPLES.lease.b.text.length > 500);
ok('sample sources are not identical', SAMPLES.lease.a.text !== SAMPLES.lease.b.text && SAMPLES.freelance.a.text !== SAMPLES.freelance.b.text);

/* ------------------------------------------------------------------ report */

if (typeof document === 'undefined') {
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} passed`);
  for (const f of failed) console.log(`FAIL ${f.name} — ${f.detail}`);
  if (failed.length) process.exitCode = 1;
} else {
  reportInPage();
}

function reportInPage() {
const list = document.getElementById('list');
const detail = document.getElementById('detail');
const summary = document.getElementById('summary');
const failed = results.filter((r) => !r.pass);
summary.className = 'summary ' + (failed.length ? 'fail' : 'ok');
summary.textContent = `${results.length - failed.length}/${results.length} passed` + (failed.length ? ` · ${failed.length} failed` : '');
for (const r of results) {
  const li = document.createElement('li');
  li.className = r.pass ? 'pass' : 'fail-item';
  li.textContent = r.name + (r.detail ? ` — ${r.detail}` : '');
  list.append(li);
}
if (failed.length) detail.textContent = failed.map((f) => `${f.name}\n  ${f.detail}`).join('\n\n');
window.__testResults = { total: results.length, failed: failed.length, results };
}

export { results };
