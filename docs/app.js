/*
 * app.js — the page.
 *
 * Two inputs, one comparison. Everything happens locally: the files are read
 * with the File API, hashed with WebCrypto, and never leave the tab. The only
 * network request is the page's own assets.
 */

import { extractText, isScannable } from './lib/textract.js';
import { sha256Hex } from './lib/hash.js';
import { segment } from './lib/segment.js';
import { analyse, toMarkdown, KIND, formatTerm, formatMoney } from './lib/analyze.js';
import { renderDiff } from './lib/align.js';
import { setLang, getLang, t, pick } from './lib/i18n.js';
import { SAMPLES } from './lib/samples.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  a: { text: '', name: '', sha: '', bytes: 0, strategy: '', count: 0 },
  b: { text: '', name: '', sha: '', bytes: 0, strategy: '', count: 0 },
  result: null,
  lang: 'en',
};

/* ---------------------------------------------------------------- language */

const STATIC = [
  ['#tagline', 'hero.h1', 'html'],
  ['#lede', 'app.lede', 'text'],
  ['#label-a', 'input.a.title', 'text'],
  ['#label-b', 'input.b.title', 'text'],
  ['#drop-a-title', 'input.drop', 'text'],
  ['#drop-b-title', 'input.drop', 'text'],
  ['#or-a', 'input.or', 'text'],
  ['#or-b', 'input.or', 'text'],
  ['#text-a', 'input.paste', 'placeholder'],
  ['#text-b', 'input.paste', 'placeholder'],
  ['#run', 'input.analyze', 'text'],
  ['#clear', 'input.clear', 'text'],
  ['#disclaimer', 'disclaimer', 'text'],
];

function applyLang(lang) {
  state.lang = lang;
  setLang(lang);
  document.documentElement.lang = lang;
  for (const [sel, key, how] of STATIC) {
    const el = $(sel);
    if (!el) continue;
    const v = t(key);
    if (how === 'html') el.innerHTML = v;
    else if (how === 'placeholder') el.placeholder = v;
    else el.textContent = v;
  }
  $('[data-i18n="meta.offline"]').textContent = t('meta.offline');
  $('[data-i18n="meta.formats"]').textContent = t('meta.formats');
  $('[data-i18n="meta.langs"]').textContent = t('meta.langs');
  document.querySelectorAll('.lang button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
  });
  document.querySelectorAll('[data-sample]').forEach((b) => {
    b.textContent = `${t('input.sample')} · ${pick(SAMPLES[b.dataset.sample].name)}`;
  });
  if (state.result) render(state.result);
  refreshCounts();
}

/* ------------------------------------------------------------------ inputs */

function refreshCounts() {
  for (const side of ['a', 'b']) {
    const s = state[side];
    const el = $(`#drop-${side}-count`);
    const file = $(`#drop-${side}-file`);
    file.textContent = s.name || '';
    if (s.text) {
      const seg = segment(s.text);
      s.count = seg.clauses.length;
      s.strategy = seg.strategy;
      el.textContent = t('input.ready', { n: seg.clauses.length, chars: s.text.length.toLocaleString('en-US') });
    } else {
      el.textContent = '';
    }
  }
  const ready = state.a.text.trim().length > 0 && state.b.text.trim().length > 0;
  $('#run').disabled = !ready;
  $('#status').textContent = ready ? '' : t('input.need');
}

async function setSide(side, { text, name = '', sha = '', bytes = 0 }) {
  if (text && !sha) {
    // A pasted contract still gets a fingerprint, so the receipt says which
    // text was compared even when there is no file to hash.
    const encoded = new TextEncoder().encode(text);
    sha = await sha256Hex(encoded);
    bytes = encoded.length;
  }
  state[side] = { text, name, sha, bytes, strategy: '', count: 0 };
  $(`#text-${side}`).value = text;
  refreshCounts();
}

async function readFile(side, file) {
  if (!file) return;
  const status = $('#status');
  status.textContent = t('input.reading', { name: file.name });
  try {
    if (!isScannable(file.name)) throw new Error('unsupported file type');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { text, partial } = await extractText(file.name, bytes);
    const sha = await sha256Hex(bytes);
    await setSide(side, { text, name: file.name, sha, bytes: bytes.length });
    if (partial) {
      status.textContent = t('input.partial', { name: file.name });
      status.classList.add('warn');
    } else {
      status.textContent = '';
      status.classList.remove('warn');
    }
  } catch (err) {
    status.textContent = t('input.failed', { name: file.name, why: err.message });
    status.classList.add('warn');
  }
}

function wireDrop(side) {
  const drop = $(`#drop-${side}`);
  const input = $(`#file-${side}`);
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', () => readFile(side, input.files[0]));
  for (const ev of ['dragenter', 'dragover']) {
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('hot'); });
  }
  for (const ev of ['dragleave', 'drop']) {
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('hot'); });
  }
  drop.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) readFile(side, file);
  });
  $(`#text-${side}`).addEventListener('input', (e) => {
    const text = e.target.value;
    state[side] = { ...state[side], text, name: state[side].name || '' };
    refreshCounts();
    sha256Hex(new TextEncoder().encode(text)).then((sha) => { state[side].sha = sha; });
  });
}

/* ------------------------------------------------------------------ render */

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function chip(text, tone) {
  return el('span', `chip ${tone || ''}`.trim(), text);
}

function render(result) {
  const body = $('#results-body');
  body.textContent = '';
  const st = result.stats;

  // ---- verdict
  const verdict = el('div', 'verdict' + (result.verdict.hasChanges ? '' : ' none'));
  const h = el('h2');
  if (!result.verdict.hasChanges) {
    h.textContent = t('summary.none');
  } else {
    h.textContent = t('summary.count', {
      changed: st.changed, total: st.total, added: st.added, removed: st.removed,
    });
  }
  verdict.append(h);

  const sub = [];
  if (result.verdict.moneySummary.length) sub.push(`${t('summary.cost', { list: result.verdict.moneySummary.join(' · ') })}`);
  else if (result.verdict.termCount === 0) sub.push(t('summary.same'));
  if (sub.length) verdict.append(el('p', 'sub', sub.join(' ')));

  const chips = el('div', 'chips');
  if (result.verdict.high) chips.append(chip(t('summary.risk', { high: result.verdict.high, medium: result.verdict.medium }), 'red'));
  else if (result.verdict.medium) chips.append(chip(t('summary.risk', { high: 0, medium: result.verdict.medium }), 'amber'));
  if (result.verdict.protections) chips.append(chip(t('summary.protect', { n: result.verdict.protections }), 'red'));
  if (result.verdict.termCount) chips.append(chip(`${result.verdict.termCount} ${t('section.terms').toLowerCase()}`, ''));
  chips.append(chip(t(result.a.strategy === 'headings' && result.b.strategy === 'headings' ? 'strategy.headings' : `strategy.${result.b.strategy}`), 'green'));
  verdict.append(chips);
  body.append(verdict);

  // ---- amounts
  if (result.termRows.length) {
    body.append(el('h3', 'sec', t('section.terms')));
    body.append(el('p', 'sec-hint', t('section.terms.hint')));
    const table = el('table', 'terms');
    const thead = el('thead');
    const hr = el('tr');
    for (const key of ['col.clause', 'col.item', 'col.before', 'col.after', 'col.change']) hr.append(el('th', '', t(key)));
    thead.append(hr);
    const tbody = el('tbody');
    for (const row of result.termRows) {
      const tr = el('tr');
      tr.append(el('td', 'clause', clauseCellText(row)));
      tr.append(el('td', '', t('kind.' + row.kind)));
      tr.append(el('td', 'num', row.before ? formatTerm(row.before) : t('terms.addedNote')));
      tr.append(el('td', 'num', row.after ? formatTerm(row.after) : t('terms.removedNote')));
      const change = el('td', 'num');
      if (row.before && row.after) {
        const pct = row.deltaPct != null ? ` · ${(row.deltaPct * 100).toFixed(1)}%` : '';
        const arrow = row.delta > 0 ? '↑' : row.delta < 0 ? '↓' : '=';
        let label;
        if (row.kind === KIND.MONEY) {
          const abs = formatMoney(Math.abs(row.delta), row.currency || 'KRW');
          label = `${arrow} ${abs}`;
        } else if (row.kind === KIND.PERCENT) {
          label = `${arrow} ${Math.abs(row.delta).toFixed(1)}%p`;
        } else if (row.kind === KIND.DURATION) {
          label = `${arrow} ${Math.abs(row.delta)} ${t('unit.days')}`;
        } else {
          label = arrow;
        }
        change.append(el('span', 'dir', label), document.createTextNode(pct));
      } else {
        change.textContent = row.after ? t('status.added') : t('status.removed');
      }
      tr.append(change);
      tbody.append(tr);
    }
    table.append(thead, tbody);
    body.append(table);
  }

  // ---- risks
  if (result.risks.flags.length) {
    body.append(el('h3', 'sec', t('section.risks')));
    body.append(el('p', 'sec-hint', t('section.risks.hint')));
    for (const f of result.risks.flags) {
      const loc = pick(f);
      const card = el('div', `risk ${f.sev}`);
      const h4 = el('h4', '', loc.title);
      h4.append(el('span', 'tag', `${t('severity.' + f.sev)} · ${t('status.' + f.status)}`));
      card.append(h4);
      card.append(el('p', '', loc.why));
      const ask = el('div', 'ask');
      ask.append(el('b', '', t('terms.asked')));
      ask.append(document.createTextNode(loc.ask));
      card.append(ask);
      card.append(el('p', 'where', `${f.clause.label}${f.status === 'strengthened' ? ' — ' + t('risks.previous') : ' — ' + t('risks.newNote')}`));
      body.append(card);
    }
  }

  // ---- protections
  if (result.risks.protections.length) {
    body.append(el('h3', 'sec', t('section.protections')));
    body.append(el('p', 'sec-hint', t('section.protections.hint')));
    const ul = el('ul', 'protect');
    for (const p of result.risks.protections) {
      const li = el('li');
      li.append(el('b', '', `${pick(p)} · ${t('protection.' + p.status)}`));
      li.append(document.createTextNode(` — ${p.clause.label}`));
      ul.append(li);
    }
    body.append(ul);
  }

  // ---- clause by clause
  body.append(el('h3', 'sec', t('section.changes')));
  body.append(el('p', 'sec-hint', t('section.changes.hint')));

  const changed = result.ops.filter((o) => o.type === 'changed');
  for (const op of changed) {
    const c = el('div', 'clause');
    const head = el('header');
    head.append(el('span', 'label', op.b.label || op.a.label || ''));
    head.append(el('span', 'title', shortTitle(op.b)));
    head.append(chip(t('status.changed'), 'amber'));
    c.append(head);
    const bodyEl = el('div', 'body');
    for (const part of renderDiff(op.diff)) {
      if (part.op === 'same') bodyEl.append(document.createTextNode(part.text));
      else bodyEl.append(el('span', part.op, part.text));
    }
    c.append(bodyEl);
    body.append(c);
  }

  for (const op of result.ops.filter((o) => o.type === 'added')) {
    const c = el('div', 'clause added');
    const head = el('header');
    head.append(el('span', 'label', op.b.label || ''));
    head.append(el('span', 'title', shortTitle(op.b)));
    head.append(chip(t('status.added'), 'green'));
    c.append(head);
    c.append(el('div', 'body', op.b.text));
    body.append(c);
  }

  for (const op of result.ops.filter((o) => o.type === 'removed')) {
    const c = el('div', 'clause removed');
    const head = el('header');
    head.append(el('span', 'label', op.a.label || ''));
    head.append(el('span', 'title', shortTitle(op.a)));
    head.append(chip(t('status.removed'), 'red'));
    c.append(head);
    c.append(el('div', 'body', op.a.text));
    body.append(c);
  }

  const same = result.ops.filter((o) => o.type === 'same');
  if (same.length) {
    const details = el('details', 'folded');
    details.append(el('summary', '', `${same.length} ${t('status.same').toLowerCase()} — ${t('section.changes')}`));
    for (const op of same) {
      const c = el('div', 'clause');
      const head = el('header');
      head.append(el('span', 'label', op.b.label || ''));
      head.append(el('span', 'title', shortTitle(op.b)));
      head.append(chip(t('status.same'), ''));
      c.append(head);
      c.append(el('div', 'body', op.b.text));
      details.append(c);
    }
    body.append(details);
  }

  // ---- questions
  if (result.questions.length) {
    body.append(el('h3', 'sec', t('section.questions')));
    const ol = el('ol', 'questions');
    for (const q of result.questions) ol.append(el('li', '', pick(q)));
    body.append(ol);
  }

  // ---- receipt + actions
  body.append(el('h3', 'sec', t('section.receipt')));
  const rc = el('div', 'receipt');
  const time = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const spanA = state.a.sha ? state.a.sha.slice(0, 12) : '—';
  const spanB = state.b.sha ? state.b.sha.slice(0, 12) : '—';
  rc.innerHTML = '';
  const line = t('receipt.text', {
    time, a: escapeHtml(state.a.name || 'pasted text'), asha: spanA,
    b: escapeHtml(state.b.name || 'pasted text'), bsha: spanB,
  });
  rc.innerHTML = line;

  const actions = el('div', 'actions');
  const copy = el('button', 'btn small', t('actions.copy'));
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    const md = toMarkdown(state.result, { aName: state.a.name || 'A', bName: state.b.name || 'B', lang: state.lang }, t);
    try {
      await navigator.clipboard.writeText(md + `\n\n${line}`);
      toast(t('actions.copied'));
    } catch {
      const ta = document.createElement('textarea');
      ta.value = md;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(t('actions.copied'));
    }
  });
  const json = el('button', 'btn ghost small', t('actions.json'));
  json.type = 'button';
  json.addEventListener('click', () => downloadJson());
  const print = el('button', 'btn ghost small', t('actions.print'));
  print.type = 'button';
  print.addEventListener('click', () => window.print());
  actions.append(copy, json, print);
  body.append(rc, actions);

  $('#results').classList.add('on');
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clauseCellText(row) {
  const label = row.clauseLabel && !/^[PL]\d+$/.test(row.clauseLabel) ? row.clauseLabel : '';
  const title = row.clauseTitle && row.clauseTitle.replace(/^\S+\s*/, '').trim();
  if (!label) return title ? `${t('col.preamble')}: ${title.slice(0, 40)}` : t('col.preamble');
  return title ? `${label} ${title.slice(0, 38)}` : label;
}

function shortTitle(c) {
  let raw = (c.heading || c.body.split('\n')[0] || '').replace(/\s+/g, ' ').trim();
  // The heading usually repeats its own number ("제3조 (보증금 및 차임)"),
  // which the header already shows — do not print it twice.
  if (c.label && raw.startsWith(c.label)) raw = raw.slice(c.label.length).trim();
  return raw.length > 90 ? raw.slice(0, 89) + '…' : raw;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function downloadJson() {
  const r = state.result;
  const payload = {
    schema: 'clausedrift/1',
    generated_at: new Date().toISOString(),
    versions: {
      earlier: { name: state.a.name || 'pasted text', sha256: state.a.sha || null, bytes: state.a.bytes || null, clauses: r.a.count, strategy: r.a.strategy },
      revised: { name: state.b.name || 'pasted text', sha256: state.b.sha || null, bytes: state.b.bytes || null, clauses: r.b.count, strategy: r.b.strategy },
    },
    stats: r.stats,
    terms: r.termRows.map((row) => ({
      clause: row.clauseLabel,
      kind: row.kind,
      before: row.before ? { raw: row.before.raw, value: row.before.value, currency: row.before.currency || null } : null,
      after: row.after ? { raw: row.after.raw, value: row.after.value, currency: row.after.currency || null } : null,
      delta: row.delta,
      delta_pct: row.deltaPct,
    })),
    risks: r.risks.flags.map((f) => ({ id: f.id, severity: f.sev, status: f.status, clause: f.clause.label, before_pct: f.before, after_pct: f.after })),
    protections: r.risks.protections.map((p) => ({ id: p.id, status: p.status, clause: p.clause.label })),
    questions: r.questions.map((q) => pick(q)),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'clause-drift-report.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function toast(msg) {
  const box = $('#toast');
  box.textContent = msg;
  box.classList.add('on');
  setTimeout(() => box.classList.remove('on'), 1800);
}

/* -------------------------------------------------------------------- boot */

function run() {
  if (!state.a.text.trim() || !state.b.text.trim()) return;
  const result = analyse(state.a.text, state.b.text);
  state.result = result;
  render(result);
}

function boot() {
  wireDrop('a');
  wireDrop('b');
  $('#run').addEventListener('click', run);
  $('#clear').addEventListener('click', async () => {
    await setSide('a', { text: '' });
    await setSide('b', { text: '' });
    state.result = null;
    $('#results').classList.remove('on');
    $('#results-body').textContent = '';
    $('#status').classList.remove('warn');
  });
  document.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const s = SAMPLES[btn.dataset.sample];
      await setSide('a', { text: s.a.text, name: s.a.name });
      await setSide('b', { text: s.b.text, name: s.b.name });
      state.result = null;
      $('#status').classList.remove('warn');
    });
  });
  document.querySelectorAll('.lang button').forEach((btn) => {
    btn.addEventListener('click', () => applyLang(btn.dataset.lang));
  });
  applyLang(navigator.language && navigator.language.startsWith('ko') ? 'ko' : 'en');
  refreshCounts();
}

document.addEventListener('DOMContentLoaded', boot);
