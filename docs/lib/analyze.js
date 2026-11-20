/*
 * analyze.js — one function that turns two texts into the whole comparison.
 *
 * The UI and the tests both call this, so what the page shows and what the
 * tests assert are the same code path.
 */

import { segment, clauseTitle } from './segment.js';
import { alignClauses, diffWords, changeRatio, tokenize } from './align.js';
import { extractTerms, pairTerms, KIND, formatTerm, formatMoney, isCostClause } from './terms.js';
import { riskReport } from './risk.js';

const MAX_QUESTIONS = 6;

export function analyse(textA, textB) {
  const A = segment(textA);
  const B = segment(textB);

  const ops = alignClauses(A.clauses, B.clauses).map((op) => {
    if (op.type !== 'changed') return op;
    return {
      ...op,
      diff: diffWords(op.a.text, op.b.text),
      ratio: changeRatio(op.a.text, op.b.text),
      termRows: pairTerms(extractTerms(op.a.text), extractTerms(op.b.text)),
    };
  });

  const stats = {
    total: B.clauses.length,
    changed: ops.filter((o) => o.type === 'changed').length,
    added: ops.filter((o) => o.type === 'added').length,
    removed: ops.filter((o) => o.type === 'removed').length,
    same: ops.filter((o) => o.type === 'same').length,
    wordsA: tokenize(textA).length,
    wordsB: tokenize(textB).length,
  };

  // Amounts: changed clauses first, then amounts introduced by new clauses.
  const termRows = [];
  for (const op of ops) {
    if (op.type === 'changed') {
      for (const row of op.termRows) {
        termRows.push({
          ...row,
          clauseLabel: op.b.label || op.a.label,
          clauseTitle: clauseTitle(op.b),
          cost: isCostClause(op.b.text) || isCostClause(op.a.text),
          source: 'changed',
        });
      }
    } else if (op.type === 'added') {
      for (const term of extractTerms(op.b.text).filter((x) => x.kind === KIND.MONEY || x.kind === KIND.PERCENT)) {
        termRows.push({
          kind: term.kind, before: null, after: term, delta: term.value, deltaPct: null,
          currency: term.currency || null,
          clauseLabel: op.b.label, clauseTitle: clauseTitle(op.b),
          cost: isCostClause(op.b.text), source: 'added',
        });
      }
    }
  }

  const risks = riskReport(ops);

  const questions = buildQuestions(termRows, risks);
  const verdict = buildVerdict(stats, termRows, risks);

  return {
    a: { clauses: A.clauses, strategy: A.strategy, count: A.clauses.length },
    b: { clauses: B.clauses, strategy: B.strategy, count: B.clauses.length },
    ops, stats, termRows, risks, questions, verdict,
  };
}

function fmtRow(row) {
  if (!row.after || !row.before) return `${row.before ? formatTerm(row.before) : '—'} → ${row.after ? formatTerm(row.after) : '—'}`;
  return `${formatTerm(row.before)} → ${formatTerm(row.after)}`;
}

function buildVerdict(stats, termRows, risks) {
  const money = termRows.filter((r) => r.kind === KIND.MONEY).slice(0, 3).map(fmtRow);
  return {
    hasChanges: stats.changed + stats.added + stats.removed > 0,
    moneySummary: money,
    high: risks.counts.high,
    medium: risks.counts.medium,
    protections: risks.counts.protectionsLost,
    termCount: termRows.length,
  };
}

function buildQuestions(termRows, risks) {
  const out = [];
  const seen = new Set();

  // Money that went up is the question people actually want to ask.
  for (const row of termRows) {
    if (row.kind !== KIND.MONEY || !row.before || !row.after) continue;
    if (!(row.delta > 0) || !row.cost) continue;
    const pct = row.deltaPct != null ? ` (${(row.deltaPct * 100).toFixed(1)}%)` : '';
    const q = {
      en: `The amount in ${row.clauseLabel} goes from ${formatMoney(row.before.value, row.before.currency)} to ${formatMoney(row.after.value, row.after.currency)}${pct}. Is the reason and the date it applies documented?`,
      ko: `${row.clauseLabel}의 금액이 ${formatTerm(row.before)}에서 ${formatTerm(row.after)}로 올랐습니다${pct}. 인상 근거와 적용 시점을 서면으로 받을 수 있을까요?`,
      key: `money:${row.clauseLabel}:${row.after.raw}`,
    };
    if (seen.has(q.key)) continue;
    seen.add(q.key);
    out.push(q);
    if (out.length >= 3) break;
  }

  for (const flag of risks.flags) {
    if (out.length >= MAX_QUESTIONS) break;
    const key = `risk:${flag.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ en: flag.en.ask, ko: flag.ko.ask, key });
  }

  for (const p of risks.protections) {
    if (out.length >= MAX_QUESTIONS) break;
    const key = `prot:${p.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      en: `The clause about ${p.en} is gone from the revised version. Why was it removed, and what replaces it?`,
      ko: `${p.ko}에 관한 조항이 수정본에서 빠졌습니다. 왜 삭제되었고, 대신 무엇이 적용되는지 알려 주세요.`,
      key,
    });
  }

  return out;
}

/** Everything the page shows, as one plain report (used by copy / print). */
export function toMarkdown(result, meta, t) {
  const lines = [];
  const st = result.stats;
  lines.push(`# ${t('app.name')} — ${meta.aName} → ${meta.bName}`);
  lines.push('');
  lines.push(`- ${t('summary.count', { changed: st.changed, total: st.total, added: st.added, removed: st.removed })}`);
  lines.push(`- ${t('strategy.headings')}: ${result.a.strategy} / ${result.b.strategy}`);
  if (result.termRows.length) {
    lines.push('');
    lines.push(`## ${t('section.terms')}`);
    lines.push('');
    lines.push(`| ${t('col.clause')} | ${t('col.item')} | ${t('col.before')} | ${t('col.after')} | ${t('col.change')} |`);
    lines.push('| --- | --- | --- | --- | --- |');
    for (const row of result.termRows) {
      const change = row.delta ? `${row.delta > 0 ? '+' : ''}${row.delta.toLocaleString('en-US')}` : '—';
      lines.push(`| ${row.clauseLabel} | ${t('kind.' + row.kind)} | ${row.before ? formatTerm(row.before) : '—'} | ${row.after ? formatTerm(row.after) : '—'} | ${change} |`);
    }
  }
  if (result.risks.flags.length) {
    lines.push('');
    lines.push(`## ${t('section.risks')}`);
    for (const f of result.risks.flags) {
      const loc = meta.lang === 'ko' ? f.ko : f.en;
      lines.push(`- **${loc.title}** (${f.sev}, ${f.status}) — ${f.clause.label}`);
      lines.push(`  - ${loc.why}`);
      lines.push(`  - ${t('terms.asked')}: ${loc.ask}`);
    }
  }
  if (result.risks.protections.length) {
    lines.push('');
    lines.push(`## ${t('section.protections')}`);
    for (const p of result.risks.protections) {
      lines.push(`- ${meta.lang === 'ko' ? p.ko : p.en} — ${p.clause.label}`);
    }
  }
  lines.push('');
  lines.push(`> ${t('disclaimer')}`);
  return lines.join('\n');
}

export { KIND, formatTerm, formatMoney };
