/*
 * risk.js — clauses that change what you are exposed to, not just what you read.
 *
 * A word diff tells you a sentence is different. It does not tell you that the
 * difference is an arbitration clause, that the late fee went from 2% to 12%,
 * or that the sentence promising your deposit back is simply gone. This module
 * carries a small, auditable rule set (Korean and English phrasings) and reads
 * it across the aligned clauses: what is new, what got stronger, and what
 * protection was removed.
 *
 * Every rule states why it matters and the question to send back before
 * signing — the tool does not give legal advice, it gives you the sentence you
 * would otherwise have missed.
 */

import { extractTerms, KIND } from './terms.js';

export const PROTECTION_WORDS = [
  {
    id: 'refund', ko: '환불·반환', en: 'refund',
    re: /(환불|반환(?:하|된|받)|refund|money back)/i,
    // "non-refundable" is the opposite of a refund promise, so a clause that
    // says it does not count as the protection still being there.
    veto: /(non-?refundable|환불(?:하지\s*않|불가|되지\s*않)|반환하지\s*않|반환되지\s*않)/i,
  },
  {
    id: 'notice', ko: '사전 통지', en: 'advance notice',
    re: /(사전\s*통지|사전에\s*알|미리\s*알|prior\s+(?:written\s+)?notice|advance\s+(?:written\s+)?notice)/i,
  },
  {
    id: 'grace', ko: '유예 기간', en: 'grace period',
    re: /(유예|grace\s+period|cure\s+period)/i,
  },
  {
    id: 'repair', ko: '수선 의무', en: 'repair obligation',
    re: /(수선|수리(?:하|해)|repair|maintain\s+the\s+premises)/i,
  },
  {
    id: 'deposit-return', ko: '보증금 반환', en: 'deposit return',
    re: /(보증금[^.\n]{0,20}반환|반환[^.\n]{0,10}보증금|return\s+of\s+the\s+deposit|deposit\s+(?:shall\s+be|will\s+be)\s+returned|returns?\s+(?:any\s+)?(?:unused\s+)?deposit)/i,
    veto: /(non-?refundable|반환하지\s*않|몰수)/i,
  },
];

export const RISKS = [
  {
    id: 'arbitration', sev: 'high',
    re: /(중재(?:에|로|한다|기관)|arbitrat(?:ion|e|or)|arbitral\s+tribunal)/i,
    en: {
      title: 'Disputes move to arbitration',
      why: 'Arbitration usually means a private process instead of court, often with a fee you pay up front and almost no appeal. You may also be giving up your right to join others in a claim.',
      ask: 'Can we keep ordinary court jurisdiction for disputes, or at least split the arbitration fee?',
    },
    ko: {
      title: '분쟁이 중재로 넘어갑니다',
      why: '중재는 법원 대신 사설 절차로 진행되어, 착수 비용을 먼저 내야 하고 결과에 불복하기도 어렵습니다. 다른 피해자들과 함께 소송할 권리도 포기하게 될 수 있습니다.',
      ask: '분쟁은 일반 법원 관할로 두거나, 최소한 중재 비용을 나눠 주실 수 있을까요?',
    },
  },
  {
    id: 'class-waiver', sev: 'high',
    re: /(집단\s*소송|class\s+action|representative\s+action)/i,
    en: {
      title: 'Class-action waiver',
      why: 'Individually, a small claim often costs more than it recovers. This clause stops you from joining a group claim, which is the only practical route for a small loss.',
      ask: 'Why is a group claim excluded when the individual amount is small?',
    },
    ko: {
      title: '집단소송 포기 조항',
      why: '소액 피해는 개인이 소송하면 비용이 더 큽니다. 이 조항은 여러 명이 함께 청구할 길을 막아, 사실상 권리 행사를 어렵게 만듭니다.',
      ask: '피해 금액이 소액일 때 공동 청구를 막는 이유가 무엇인가요?',
    },
  },
  {
    id: 'auto-renewal', sev: 'medium',
    re: /(자동\s*갱신|자동\s*연장|묵시적\s*갱신|automatically\s+renew|auto-?renew|renew(?:s|ed)?\s+automatically)/i,
    en: {
      title: 'Automatic renewal',
      why: 'The term extends itself unless you cancel inside a narrow window. Miss the window and you owe another full period.',
      ask: 'Can the renewal be opt-in instead of automatic, or at least send a reminder 30 days before?',
    },
    ko: {
      title: '자동 갱신',
      why: '정해진 기간 안에 해지하지 않으면 계약이 그대로 연장됩니다. 통지 시점을 놓치면 한 기간을 더 부담하게 됩니다.',
      ask: '자동 갱신 대신 선택에 의한 갱신으로 바꾸거나, 30일 전 안내를 받을 수 있을까요?',
    },
  },
  {
    id: 'unilateral-change', sev: 'high',
    re: /(일방적(?:으로)?\s*(?:변경|정할|결정)|사전\s*통지\s*없이\s*변경|sole\s+discretion|at\s+any\s+time\s+change|may\s+(?:modify|change)\s+(?:these\s+)?terms)/i,
    en: {
      title: 'They can change the terms alone',
      why: 'One side can rewrite the agreement later, so what you agree to today is not what you are bound by tomorrow.',
      ask: 'Any change that raises my cost or shortens my rights should need my written agreement.',
    },
    ko: {
      title: '상대방이 조건을 일방적으로 바꿀 수 있습니다',
      why: '오늘 동의한 조건이 나중에 상대방에 의해 바뀔 수 있습니다. 비용이나 권리에 영향을 주는 변경은 협의 대상이 되어야 합니다.',
      ask: '비용 인상이나 권리 축소에 해당하는 변경은 제 서면 동의를 받도록 해 주세요.',
    },
  },
  {
    id: 'penalty', sev: 'high',
    re: /(위약금|손해배상(?:액|금)|몰수|penalt(?:y|ies)|liquidated\s+damages|forfeit)/i,
    en: {
      title: 'Penalty if you exit',
      why: 'A penalty clause fixes what you owe for leaving early, whether or not the other side lost that much.',
      ask: 'Can the penalty be capped at one month and waived if I give 30 days notice?',
    },
    ko: {
      title: '중도 해지 시 위약금',
      why: '상대방의 실제 손실과 관계없이 정해진 금액을 물어야 합니다. 해지 사유와 무관하게 부과되면 부담이 커집니다.',
      ask: '위약금을 한 달치로 제한하고, 30일 전 통지 시에는 면제해 주실 수 있나요?',
    },
  },
  {
    id: 'late-fee', sev: 'medium',
    re: /(연체료|지연이자|연체이자|late\s+fee|interest\s+on\s+(?:overdue|late)|overdue\s+interest)/i,
    en: {
      title: 'Late payment interest',
      why: 'Interest on a late payment compounds against you. In Korea the legal ceiling for late-payment interest is 20% a year, and consumer leases sit far below that.',
      ask: 'What is the annual rate, and is it simple interest on the overdue amount only?',
    },
    ko: {
      title: '연체료·지연이자',
      why: '연체가 길어지면 이자가 붙어 부담이 빠르게 커집니다. 상사법정이율 상한(연 20%)과 비교해 과도한지 확인해야 합니다.',
      ask: '연 이율이 얼마이며, 연체된 금액에만 단리로 계산되는지 확인해 주세요.',
    },
  },
  {
    id: 'data-sharing', sev: 'high',
    re: /(개인정보[^.\n]{0,25}(?:제3자|위탁|제공)|제3자에게\s*제공|share\s+(?:your\s+)?personal\s+(?:information|data)|third\s+part(?:y|ies)\s+(?:with|for)\s+(?:marketing|analytics))/i,
    en: {
      title: 'Your data goes to third parties',
      why: 'Personal data passed to third parties is hard to take back and often reused for marketing. Under Korea’s PIPA you can refuse consent to third-party provision, and the service must still work.',
      ask: 'Which companies receive my data, for what purpose, and can I refuse that part only?',
    },
    ko: {
      title: '개인정보 제3자 제공',
      why: '한 번 넘어간 개인정보는 회수하기 어렵고 마케팅에 재사용되기 쉽습니다. 개인정보보호법상 제3자 제공 동의는 거부할 수 있고, 거부를 이유로 서비스 전체를 거절할 수 없습니다.',
      ask: '어떤 회사에 어떤 목적으로 제공되는지 알려 주시고, 해당 항목만 거부할 수 있게 해 주세요.',
    },
  },
  {
    id: 'non-compete', sev: 'medium',
    re: /(경업\s*금지|겸업\s*금지|non-?compet(?:e|ition)|(?:shall|will|may)\s+not\s+(?:engage|work|provide\s+services)\s+(?:for|with|to))/i,
    en: {
      title: 'Non-compete',
      why: 'This limits where you can work or what you can build afterwards. Its scope (time, place, kind of work) decides whether it is enforceable or just intimidating.',
      ask: 'Can the non-compete be limited to 6 months and to the same specific clients?',
    },
    ko: {
      title: '경업 금지',
      why: '이후 활동이나 취업이 제한됩니다. 기간·지역·직무 범위가 지나치게 넓으면 효력이 다투어지지만, 서명 전에 범위를 좁히는 편이 안전합니다.',
      ask: '경업 금지를 6개월, 동일 고객 범위로만 한정할 수 있을까요?',
    },
  },
  {
    id: 'indemnity', sev: 'medium',
    re: /(면책|배상(?:할|하여야)|손해를\s*배상|indemnif(?:y|ication)|hold\s+harmless|not\s+(?:be\s+)?liable)/i,
    en: {
      title: 'You cover their losses',
      why: 'An indemnity clause can make you pay the other side’s legal costs and damages, sometimes for problems you did not cause.',
      ask: 'Can indemnity be limited to losses caused by my own negligence?',
    },
    ko: {
      title: '상대방 손해를 대신 배상',
      why: '내 잘못이 아닌 부분까지 배상 책임이 생길 수 있습니다. 면책·배상 조항은 책임 범위가 어디까지인지가 핵심입니다.',
      ask: '제 과실로 발생한 손해로 배상 범위를 한정해 주실 수 있나요?',
    },
  },
  {
    id: 'deposit-forfeit', sev: 'high',
    re: /(보증금[^.\n]{0,20}(?:몰수|반환하지|공제)|몰수|forfeit\s+(?:the\s+)?deposit|deposit\s+(?:is|shall\s+be)\s+non-?refundable)/i,
    en: {
      title: 'The deposit comes back reduced — or not at all',
      why: 'Deductions decided by the other side turn a small dispute into a total loss: cleaning, repapering, "restoration", a forfeited deposit. Korean housing law lets the landlord keep only actual, evidenced damage; 개인정보 and 약관 rules aside, the burden of proof is on the person making the deduction.',
      ask: 'Can the deposit be returned within 14 days of move-out, with every deduction itemised and evidenced?',
      cost: true,
    },
    ko: {
      title: '보증금이 깎이거나 돌려받지 못할 수 있습니다',
      why: '공제 항목과 금액을 상대방이 정하면 청소비·도배비·원상복구비 명목으로 보증금이 크게 줄 수 있습니다. 주택임대차보호법상 실제로 발생한 손해만 공제할 수 있고, 공제하는 쪽이 이를 증명해야 합니다.',
      ask: '퇴거 후 14일 안에, 항목별 증빙이 있는 실제 손해만 공제하고 반환하도록 바꿀 수 있나요?',
      cost: true,
    },
  },
  {
    id: 'jurisdiction', sev: 'medium',
    re: /(전속\s*관할|관할\s*법원|준거법|exclusive\s+jurisdiction|governing\s+law|venue\s+shall)/i,
    en: {
      title: 'Court fixed far from you',
      why: 'If disputes must be filed in a distant court, the cost of enforcing a small right can exceed the right itself.',
      ask: 'Can jurisdiction be my place of residence, as consumer rules usually allow?',
    },
    ko: {
      title: '관할 법원이 멀리 지정됨',
      why: '먼 곳의 법원에서만 다툴 수 있으면, 소액 권리를 지키는 비용이 권리보다 커집니다. 소비자 계약에서는 소비자 주소지 관할이 원칙입니다.',
      ask: '관할을 제 주소지 법원으로 할 수 있을까요?',
    },
  },
  {
    id: 'no-termination', sev: 'medium',
    re: /(중도\s*해지(?:할\s*수\s*없|불가)|해지할\s*수\s*없|may\s+not\s+terminate|no\s+early\s+termination|non-?cancellable)/i,
    en: {
      title: 'You cannot exit early',
      why: 'With no exit right, you carry the whole remaining term even if the service or the situation changes.',
      ask: 'Can I terminate with 30 days notice, paying only for the period I used?',
    },
    ko: {
      title: '중도 해지 불가',
      why: '해지할 수 없으면 상황이 바뀌어도 남은 기간 전체를 부담해야 합니다. 소비자 계약에서 해지권을 완전히 막는 조항은 효력이 제한될 수 있습니다.',
      ask: '30일 전 통지로 해지하고, 이용한 기간만 정산하는 방식으로 바꿀 수 있나요?',
    },
  },
  {
    id: 'auto-charge', sev: 'medium',
    re: /(자동\s*결제|자동이체|정기\s*결제|automatically\s+(?:charge|bill)|recurring\s+(?:charge|payment))/i,
    en: {
      title: 'Automatic charging',
      why: 'A saved payment method charged on a schedule is convenient until you want it to stop. Know the notice and refund rule before you hand over the card.',
      ask: 'How do I cancel the automatic charge, and is the unused period refunded?',
    },
    ko: {
      title: '자동 결제',
      why: '정기 결제는 편하지만 멈추기 어려울 때가 많습니다. 결제수단을 넘기기 전에 해지 방법과 환불 기준을 확인해야 합니다.',
      ask: '자동 결제 해지 방법과, 남은 기간 환불 기준을 알려 주세요.',
    },
  },
  {
    id: 'liability-cap', sev: 'medium',
    re: /(책임(?:의)?\s*한도|배상\s*한도|총\s*책임|liability\s+(?:shall\s+not\s+exceed|is\s+limited)|in\s+no\s+event\s+be\s+liable)/i,
    en: {
      title: 'Their liability is capped',
      why: 'The other side limits what it will pay if it causes you loss — sometimes to the fee you already paid.',
      ask: 'Is the cap at least the amount I paid in the last 12 months?',
    },
    ko: {
      title: '상대방 배상 책임의 한도',
      why: '상대방이 손해를 입혀도 배상액이 제한됩니다. 한도가 이미 낸 금액보다 작으면 사실상 책임을 지지 않는 것과 같습니다.',
      ask: '한도를 최근 12개월 지급액 이상으로 해 주실 수 있나요?',
    },
  },
];

function maxPercent(text) {
  const re = /([0-9]+(?:\.[0-9]+)?)\s*%/g;
  let best = null;
  for (const m of text.matchAll(re)) {
    const v = Number(m[1]);
    if (best === null || v > best) best = v;
  }
  return best;
}

/**
 * The biggest number of each kind in a clause. A penalty that moves from one
 * month to two is "stricter" even though no percentage appears at all.
 */
function magnitude(text) {
  const terms = extractTerms(text);
  const pick = (kind) => {
    const vals = terms.filter((t) => t.kind === kind).map((t) => t.value);
    return vals.length ? Math.max(...vals) : null;
  };
  return { pct: pick(KIND.PERCENT), money: pick(KIND.MONEY), dur: pick(KIND.DURATION) };
}

/** The sentence(s) the rule actually fires on — a clause can hold several. */
function focusText(text, re) {
  const sentences = String(text || '').split(/(?<=[.。!?])\s+|\n+/).filter(Boolean);
  const hits = sentences.filter((s) => {
    re.lastIndex = 0;
    return re.test(s);
  });
  re.lastIndex = 0;
  return hits.length ? hits.join(' ') : text;
}

/** Prefer the sentence the rule fires on; fall back to the clause if it has
 *  no numbers of its own (headings like "Late fee" carry none). */
function magnitudeOrClause(text, re) {
  const focused = magnitude(focusText(text, re));
  if (focused.pct == null && focused.money == null && focused.dur == null) return magnitude(text);
  return focused;
}

function gotStricter(before, after) {
  if (!before || !after) return false;
  return ['pct', 'money', 'dur'].some((k) => before[k] != null && after[k] != null && after[k] > before[k]);
}

/**
 * Read the aligned clause list for risks.
 * @returns {{flags: Array, protections: Array, counts: object}}
 */
export function riskReport(ops, { sameText } = {}) {
  const flags = [];
  const protections = [];
  const same = sameText || ((op) => op.a && op.b && op.a.text === op.b.text);

  const changed = ops.filter((op) => !same(op) && (op.a || op.b));

  for (const rule of RISKS) {
    const hits = [];
    for (const op of changed) {
      const inB = op.b && rule.re.test(op.b.text);
      const inA = op.a && rule.re.test(op.a.text);
      if (!inB) continue;
      const before = inA ? magnitudeOrClause(op.a.text, rule.re) : null;
      const after = magnitudeOrClause(op.b.text, rule.re);
      let status = inA ? 'strengthened' : 'new';
      if (inA && !gotStricter(before, after)) {
        // Same clause type, but nothing measurable got worse: report only when
        // the wording itself changed inside the rule's neighbourhood.
        status = 'reworded';
      }
      hits.push({ op, status, before, after });
      rule.re.lastIndex = 0;
    }
    if (rule.re.lastIndex) rule.re.lastIndex = 0;
    if (!hits.length) continue;
    const status = hits.some((h) => h.status === 'new')
      ? 'new'
      : hits.some((h) => h.status === 'strengthened') ? 'strengthened' : 'reworded';
    if (status === 'reworded') continue;
    const biggest = hits[0];
    flags.push({
      id: rule.id, sev: rule.sev, status,
      en: rule.en, ko: rule.ko,
      before: biggest.before ? biggest.before.pct : null,
      after: biggest.after ? biggest.after.pct : null,
      clause: biggest.op.b,
      previous: biggest.op.a,
      occurrences: hits.length,
    });
  }

  for (const p of PROTECTION_WORDS) {
    const still = (text) => p.re.test(text) && !(p.veto && p.veto.test(text));
    const lost = changed.filter((op) => op.a && !op.b && still(op.a.text));
    const weakened = changed.filter((op) => {
      if (!op.a || !op.b) return false;
      return still(op.a.text) && !still(op.b.text);
    });
    const hit = lost[0] || weakened[0];
    if (!hit) continue;
    protections.push({ id: p.id, en: p.en, ko: p.ko, clause: hit.a, status: lost.length ? 'removed' : 'weakened' });
  }

  const order = { high: 0, medium: 1 };
  flags.sort((x, y) => order[x.sev] - order[y.sev] || (x.status === 'new' ? -1 : 1));
  return {
    flags,
    protections,
    counts: {
      high: flags.filter((f) => f.sev === 'high').length,
      medium: flags.filter((f) => f.sev === 'medium').length,
      new: flags.filter((f) => f.status === 'new').length,
      protectionsLost: protections.length,
    },
  };
}
