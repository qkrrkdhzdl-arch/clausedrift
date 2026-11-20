/*
 * align.js — match the clauses of two versions, then diff the matched pairs.
 *
 * Clause numbering is not identity: a clause inserted at #5 renumbers all of
 * #5..#20 while their text stays identical. So clauses are matched on content
 * (character trigram similarity) with a Needleman–Wunsch style dynamic program
 * that allows gaps on both sides. A pair above the similarity floor counts as
 * "changed"; below it, the old clause is removed and the new one is added.
 *
 * Word-level diff of a matched pair keeps the reading experience: unchanged
 * words stay plain, new words are underlined green, deleted words struck red.
 */

const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

export function trigrams(text) {
  const s = norm(text).replace(/[^\p{L}\p{N} ]/gu, '');
  const set = new Set();
  if (s.length < 3) { if (s) set.add(s); return set; }
  for (let i = 0; i <= s.length - 3; i++) {
    const g = s.slice(i, i + 3);
    if (g.trim().length) set.add(g);
  }
  return set;
}

export function jaccard(a, b) {
  const A = a instanceof Set ? a : trigrams(a);
  const B = b instanceof Set ? b : trigrams(b);
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * @param {Array} A clauses of the earlier version
 * @param {Array} B clauses of the later version
 * @returns {Array<{type:'same'|'changed'|'added'|'removed', a?:object, b?:object, score:number}>}
 */
export function alignClauses(A, B, { floor = 0.42, sameAt = 0.97 } = {}) {
  const n = A.length, m = B.length;
  const ga = A.map((c) => trigrams(c.text));
  const gb = B.map((c) => trigrams(c.text));

  const MATCH_BONUS = 0.45;
  const GAP = -0.5;

  // dp[i][j]: best score aligning A[0..i) with B[0..j)
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const back = Array.from({ length: n + 1 }, () => new Int8Array(m + 1)); // 0 diag, 1 up(remove), 2 left(add)
  for (let i = 1; i <= n; i++) { dp[i][0] = dp[i - 1][0] + GAP; back[i][0] = 1; }
  for (let j = 1; j <= m; j++) { dp[0][j] = dp[0][j - 1] + GAP; back[0][j] = 2; }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = jaccard(ga[i - 1], gb[j - 1]);
      const diag = dp[i - 1][j - 1] + (s >= floor ? s + MATCH_BONUS : s - 1.2);
      const up = dp[i - 1][j] + GAP;
      const left = dp[i][j - 1] + GAP;
      let best = diag, dir = 0;
      if (up > best) { best = up; dir = 1; }
      if (left > best) { best = left; dir = 2; }
      dp[i][j] = best; back[i][j] = dir;
    }
  }

  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const dir = i === 0 ? 2 : j === 0 ? 1 : back[i][j];
    if (dir === 0) {
      const score = jaccard(ga[i - 1], gb[j - 1]);
      ops.push({ type: score >= floor ? (score >= sameAt ? 'same' : 'changed') : 'removed-then-added', a: A[i - 1], b: B[j - 1], score });
      i--; j--;
    } else if (dir === 1) {
      ops.push({ type: 'removed', a: A[i - 1], score: 0 });
      i--;
    } else {
      ops.push({ type: 'added', b: B[j - 1], score: 0 });
      j--;
    }
  }
  ops.reverse();

  // A low-similarity diagonal is two separate events, not one edit.
  const out = [];
  for (const op of ops) {
    if (op.type === 'removed-then-added') {
      out.push({ type: 'removed', a: op.a, score: op.score });
      out.push({ type: 'added', b: op.b, score: op.score });
    } else out.push(op);
  }
  return out;
}

const WORD = /\d[\d,.'’]*\d|\d|[\p{L}]+(?:['’][\p{L}]+)*|[^\s\p{L}\p{N}]/gu;

export function tokenize(text) {
  return String(text || '').match(WORD) || [];
}

/** LCS word diff. Returns [{op:'same'|'ins'|'del', text}]. */
export function diffWords(before, after) {
  const a = tokenize(before), b = tokenize(after);
  const key = (t) => t.toLowerCase();
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = key(a[i]) === key(b[j])
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts = [];
  const pushPart = (op, token) => {
    const last = parts[parts.length - 1];
    if (last && last.op === op) last.tokens.push(token);
    else parts.push({ op, tokens: [token] });
  };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) { pushPart('same', a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { pushPart('del', a[i]); i++; }
    else { pushPart('ins', b[j]); j++; }
  }
  while (i < n) { pushPart('del', a[i]); i++; }
  while (j < m) { pushPart('ins', b[j]); j++; }
  return parts.map((p) => ({ ...p, text: p.tokens.join(' ') }));
}

const NO_SPACE_BEFORE = new Set([',', '.', ';', ':', '!', '?', ')', ']', '}', '%', "'s"]);
const NO_SPACE_AFTER = new Set(['(', '[', '{', '$', '€', '£', '₩']);

/** Rebuild the diff with typographic spacing (no "word ," or "$ 90"). */
export function renderDiff(parts) {
  const out = [];
  let prevTail = '';
  for (const part of parts) {
    const toks = part.tokens || [];
    let s = '';
    let prev = prevTail;
    for (const tk of toks) {
      const space = prev && !NO_SPACE_BEFORE.has(tk) && !NO_SPACE_AFTER.has(prev)
        && !(tk.startsWith("'") && tk.length === 2);
      s += (space ? ' ' : '') + tk;
      prev = tk;
    }
    if (toks.length) prevTail = toks[toks.length - 1];
    out.push({ op: part.op, text: s });
  }
  return out;
}

/** Share of words that survived, 0..1 — used to rank the biggest rewrites. */
export function changeRatio(before, after) {
  const parts = diffWords(before, after);
  let same = 0, total = 0;
  for (const p of parts) {
    const w = p.text.split(/\s+/).filter(Boolean).length;
    total += w;
    if (p.op === 'same') same += w;
  }
  return total ? 1 - same / total : 0;
}
