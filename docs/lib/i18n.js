/*
 * i18n.js — the whole interface in English and Korean.
 *
 * Judges and readers outside Korea meet the tool in English; the contracts it
 * is built for are often Korean. Both languages are first-class here, so the
 * strings live in one table and the tests check that the two tables have the
 * same keys — a missing translation is a bug, not a fallback.
 */

export const STRINGS = {
  en: {
    'app.name': 'Clause Drift',
    'hero.h1': 'You were sent a revised contract. <em>Here is what changed</em>, and what it costs.',
    'app.tagline': 'You were sent a revised contract. Here is what changed, and what it costs.',
    'meta.offline': 'Runs entirely in this tab',
    'meta.formats': 'PDF · DOCX · HWPX · TXT, or paste',
    'meta.langs': 'Korean and English contracts',
    'app.lede': 'Drop the two versions you were sent. Clause Drift reads them in your browser, matches clause by clause, and puts the amounts, periods and new obligations side by side — no upload, no account.',
    'input.a.title': '1 · The version you were sent first',
    'input.b.title': '2 · The revised version',
    'input.drop': 'Drop a file, or click to choose',
    'input.or': 'or paste the text',
    'input.paste': 'Paste the contract text here',
    'input.sample': 'Load a sample pair',
    'input.sample.lease': 'Studio lease (Korean)',
    'input.sample.freelance': 'Design contract (English)',
    'input.clear': 'Clear',
    'input.analyze': 'Compare the two versions',
    'input.need': 'Both versions are needed. Drop a file or paste text into each side.',
    'input.reading': 'Reading {name}…',
    'input.ready': '{n} clauses · {chars} characters',
    'input.failed': 'Could not read {name}: {why}',
    'input.partial': 'Text from {name} was only partly readable — a scanned PDF has no text layer. Paste the text if the result looks thin.',

    'run.title': 'Comparing…',
    'summary.none': 'No differences found. The two versions match clause for clause.',
    'summary.count': '{changed} of {total} clauses changed · {added} added · {removed} removed',
    'summary.cost': 'Amounts moved: {list}',
    'summary.risk': '{high} high-risk and {medium} medium-risk new or strengthened terms',
    'summary.protect': '{n} protections removed or weakened',
    'summary.same': 'Nothing that affects money or obligations changed — the edits are wording only.',

    'section.terms': 'Amounts and periods that moved',
    'section.terms.hint': 'Every amount, rate, period and date that differs between the two versions of the same clause.',
    'section.risks': 'New obligations',
    'section.risks.hint': 'Clauses that were not there before, or that became stricter.',
    'section.protections': 'Protections that were removed',
    'section.protections.hint': 'Rights the earlier version gave you that the revised version does not.',
    'section.changes': 'Clause by clause',
    'section.changes.hint': 'Unchanged clauses are folded away. Green is new wording, struck red is what it replaced.',
    'section.questions': 'Ask before you sign',
    'section.receipt': 'Receipt',

    'col.clause': 'Clause',
    'col.item': 'What',
    'col.before': 'Before',
    'col.after': 'After',
    'col.change': 'Change',
    'col.status': 'Status',
    'col.preamble': 'Preamble',
    'unit.days': 'days',

    'kind.money': 'Amount',
    'kind.percent': 'Rate',
    'kind.duration': 'Period',
    'kind.date': 'Date',

    'status.added': 'added',
    'status.removed': 'removed',
    'status.changed': 'changed',
    'status.same': 'unchanged',
    'status.new': 'new',
    'status.strengthened': 'stricter',
    'severity.high': 'high',
    'severity.medium': 'medium',
    'protection.removed': 'removed',
    'protection.weakened': 'weakened',

    'terms.addedNote': 'not in the earlier version',
    'terms.removedNote': 'no longer in the revised version',
    'terms.up': 'up {pct}',
    'terms.down': 'down {pct}',
    'terms.perMonth': 'a month',
    'terms.asked': 'Ask',
    'risks.previous': 'Earlier version had this clause too — the wording got stricter.',
    'risks.newNote': 'This clause was not in the earlier version.',

    'receipt.text': 'Compared in the browser at {time}. Earlier: {a} ({asha}). Revised: {b} ({bsha}). Nothing was uploaded.',
    'receipt.jump': '',

    'actions.copy': 'Copy the report',
    'actions.json': 'Download JSON',
    'actions.print': 'Print / save PDF',
    'actions.copied': 'Copied.',
    'actions.again': 'Compare again',

    'disclaimer': 'Clause Drift is a reading aid, not legal advice. It reads what you give it and does not verify whether a clause is enforceable. For a deposit, a lease or a job, have a professional read the original.',

    'strategy.headings': 'clauses were found from the document’s own headings',
    'strategy.paragraphs': 'no headings were found, so paragraphs were compared',
    'strategy.lines': 'no headings or paragraph breaks were found, so lines were compared',
  },

  ko: {
    'app.name': 'Clause Drift',
    'hero.h1': '수정된 계약서를 받았습니다. <em>무엇이 바뀌었고</em>, 얼마가 달라졌는지 확인하세요.',
    'app.tagline': '수정된 계약서를 받았습니다. 무엇이 바뀌었고, 얼마가 달라졌는지 확인하세요.',
    'meta.offline': '이 탭 안에서만 실행됩니다',
    'meta.formats': 'PDF · DOCX · HWPX · TXT, 또는 붙여넣기',
    'meta.langs': '한국어·영어 계약서 지원',
    'app.lede': '받은 두 버전을 올려 주세요. 브라우저 안에서만 읽고, 조문 단위로 짝지어 금액·기간·새로운 의무를 나란히 보여 드립니다. 업로드도, 가입도 없습니다.',
    'input.a.title': '1 · 처음 받은 버전',
    'input.b.title': '2 · 수정된 버전',
    'input.drop': '파일을 끌어다 놓거나 클릭하세요',
    'input.or': '또는 본문을 붙여넣으세요',
    'input.paste': '계약서 내용을 여기에 붙여넣으세요',
    'input.sample': '예시 계약서 불러오기',
    'input.sample.lease': '원룸 임대차계약 (한국어)',
    'input.sample.freelance': '디자인 외주계약 (영어)',
    'input.clear': '지우기',
    'input.analyze': '두 버전 비교하기',
    'input.need': '두 버전이 모두 필요합니다. 각 칸에 파일을 넣거나 내용을 붙여넣어 주세요.',
    'input.reading': '{name} 읽는 중…',
    'input.ready': '조항 {n}개 · {chars}자',
    'input.failed': '{name}을(를) 읽지 못했습니다: {why}',
    'input.partial': '{name}의 텍스트를 일부만 읽었습니다. 스캔한 PDF는 글자층이 없습니다. 결과가 비어 보이면 본문을 붙여넣어 주세요.',

    'run.title': '비교하는 중…',
    'summary.none': '차이가 없습니다. 두 버전이 조항 단위로 같습니다.',
    'summary.count': '조항 {total}개 중 {changed}개 변경 · 추가 {added} · 삭제 {removed}',
    'summary.cost': '달라진 금액: {list}',
    'summary.risk': '위험도 높은 조항 {high}건, 중간 {medium}건이 새로 생기거나 강화됨',
    'summary.protect': '보호 조항 {n}개가 사라지거나 약화됨',
    'summary.same': '금액과 의무에 영향을 주는 변경은 없습니다. 문구만 다듬어졌습니다.',

    'section.terms': '달라진 금액과 기간',
    'section.terms.hint': '같은 조항의 두 버전에서 값이 달라진 금액·비율·기간·날짜입니다.',
    'section.risks': '새로 생긴 의무',
    'section.risks.hint': '이전 버전에는 없던 조항, 또는 더 엄격해진 조항입니다.',
    'section.protections': '사라진 보호 조항',
    'section.protections.hint': '이전 버전에는 있던 권리가 수정본에서는 없어진 경우입니다.',
    'section.changes': '조항별 비교',
    'section.changes.hint': '바뀌지 않은 조항은 접어 두었습니다. 초록은 새로 들어간 문구, 빨간 취소선은 빠진 문구입니다.',
    'section.questions': '서명 전에 물어볼 것',
    'section.receipt': '확인 기록',

    'col.clause': '조항',
    'col.item': '항목',
    'col.before': '이전',
    'col.after': '수정 후',
    'col.change': '변화',
    'col.status': '상태',
    'col.preamble': '전문',
    'unit.days': '일',

    'kind.money': '금액',
    'kind.percent': '비율',
    'kind.duration': '기간',
    'kind.date': '날짜',

    'status.added': '추가',
    'status.removed': '삭제',
    'status.changed': '변경',
    'status.same': '동일',
    'status.new': '신설',
    'status.strengthened': '강화',
    'severity.high': '높음',
    'severity.medium': '중간',
    'protection.removed': '삭제',
    'protection.weakened': '약화',

    'terms.addedNote': '이전 버전에는 없음',
    'terms.removedNote': '수정본에서 빠짐',
    'terms.up': '{pct} 상승',
    'terms.down': '{pct} 하락',
    'terms.perMonth': '월 기준',
    'terms.asked': '질문',
    'risks.previous': '이전 버전에도 있던 조항인데 문구가 더 엄격해졌습니다.',
    'risks.newNote': '이전 버전에는 없던 조항입니다.',

    'receipt.text': '{time}에 브라우저에서 비교했습니다. 이전: {a} ({asha}) · 수정: {b} ({bsha}). 아무것도 업로드되지 않았습니다.',
    'receipt.jump': '',

    'actions.copy': '보고서 복사',
    'actions.json': 'JSON 내려받기',
    'actions.print': '인쇄 · PDF 저장',
    'actions.copied': '복사했습니다.',
    'actions.again': '다시 비교',

    'disclaimer': 'Clause Drift는 읽기를 돕는 도구이며 법률 자문이 아닙니다. 조항의 효력 유무를 판단하지 않습니다. 보증금·임대차·근로 계약은 원본을 전문가에게 확인받으세요.',

    'strategy.headings': '문서의 조문 표기를 기준으로 조항을 나눴습니다',
    'strategy.paragraphs': '조문 표기가 없어 문단 단위로 비교했습니다',
    'strategy.lines': '조문 표기도 문단 구분도 없어 줄 단위로 비교했습니다',
  },
};

let current = 'en';

export function setLang(lang) { current = STRINGS[lang] ? lang : 'en'; }
export function getLang() { return current; }

export function t(key, vars) {
  const table = STRINGS[current] || STRINGS.en;
  let s = table[key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function pick(obj) {
  if (!obj) return '';
  return obj[current] ?? obj.en ?? '';
}

export const LANGS = Object.keys(STRINGS);
