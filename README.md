# Clause Drift

**You were sent a revised contract. Here is what changed, and what it costs.**

Drop the two versions you were sent. Clause Drift reads both in your browser, matches them clause by clause, and puts the amounts, periods and new obligations side by side. Nothing is uploaded; there is no server, no account, no analytics.

Live: **https://qkrrkdhzdl-arch.github.io/clausedrift/** · Tests: **/tests.html**

---

## The problem

A revision arrives as `계약서_수정_최종.docx` or "small changes, nothing major". The document is twelve pages. Two numbers moved, one clause was added, and one sentence that protected you is gone. Reading it again from the top is how people miss exactly that: the eye reads what it expects to read.

A line diff is not much better. Inserting a clause at #4 renumbers everything below it, so a naive diff reports the rest of the document as rewritten — and the number that actually changed (the rent) is buried in a red block.

## What it does

**1. It cuts the contract into clauses, not lines.** Korean `제3조`, English `Article 3`, bare numbered items, bracketed headings. If a document has no headings it falls back to paragraphs, and says so.

**2. It matches clauses by what they say, not by their number.** Character-trigram similarity with a dynamic-programming alignment allows gaps on both sides, so a clause inserted at #4 leaves #5–#12 matched to their previous selves instead of "changed".

**3. It reads the numbers out of both versions.** Korean amounts with `만`/`억` multipliers, dollar and euro amounts, percentages, notice periods, dates. Different amounts in the same clause become a row: **₩650,000 → ₩720,000 (+10.8%)**, **14 days → 7 days**, **2% → 12%**.

**4. It flags the clauses that change what you are exposed to.** Arbitration, class-action waiver, auto-renewal, unilateral changes, penalties, late fees, data sharing, non-compete, indemnity, deposit forfeiture, distant jurisdiction, no early termination, automatic charging, liability caps — each with a plain-language "why it matters" and the question to send back. When the same clause exists in both versions but got stricter (2% → 12%), it is reported as *stricter*, not as new.

**5. It notices what disappeared.** If the earlier version promised a refund, a notice period or the return of the deposit, and the revision does not, that is a finding. So is a "protection" that survives only in negated form: `non-refundable` does not count as a refund clause.

**6. It leaves you a receipt.** Both files are hashed (SHA-256) in the tab; the report can be copied, downloaded as JSON, or printed to PDF with the timestamps and hashes on it.

## Screens

| | |
|---|---|
| The two inputs | `docs/shots/01-input.png` |
| Verdict, amounts that moved | `docs/shots/02-verdict.png` |
| New obligations, with the question to ask | `docs/shots/03-risks.png` |
| Clause by clause (green = added, struck = removed) | `docs/shots/04-redline.png` |
| Korean interface | `docs/shots/05-korean.png` |

## How it works

| File | What it does |
| --- | --- |
| `docs/lib/segment.js` | Heading detection (KR/EN) and clause cutting, with paragraph and line fallbacks |
| `docs/lib/align.js` | Trigram similarity, Needleman–Wunsch alignment, word-level diff, change ratio |
| `docs/lib/terms.js` | Amounts (`1,200,000원`, `120만 원`, `$4,800`), percentages, periods, dates; delta pairing |
| `docs/lib/risk.js` | 14 bilingual risk rules with severity, explanation and the question to ask; 5 protection rules with negation vetoes |
| `docs/lib/analyze.js` | The whole comparison as one function — the page and the tests use the same path |
| `docs/lib/textract.js`, `zip.js`, `hash.js` | PDF / DOCX / HWPX / ODT text extraction and SHA-256, no dependencies |
| `docs/app.js` | The page: inputs, drag-and-drop, rendering, export |

Everything runs on the client. The only network requests are the page's own assets; `tools/smoke.py` asserts that after load.

## Privacy

A contract is one of the most personal documents a person holds. There is no upload endpoint because there is no endpoint: `fetch` is never called with document content, the files are read with the File API, the hashes use `crypto.subtle`, and reloading the page forgets everything.

## Limits (stated, not hidden)

- PDF extraction is best-effort. A scanned PDF has no text layer, and the page says so and asks for the text instead. It is not OCR.
- The risk rules are patterns, not a lawyer. They catch a phrase and explain why it matters; they cannot tell you whether a clause would be enforced, and Korean law (민법, 주택임대차보호법, 개인정보보호법, 약관의 규제에 관한 법률) is cited as context, not as an opinion.
- Amount matching inside a clause is positional: the first amount of one version is compared with the first amount of the other. A clause that reorders its amounts can produce a misleading pair — the clause text is always shown next to the number so it can be checked.
- Only Korean and English patterns are covered.

Clause Drift is a reading aid. For a deposit, a lease or a job, have a professional read the original.

## Run it

```bash
python3 -m http.server 8772 --directory docs
# then open http://127.0.0.1:8772/
```

Tests (needs Playwright's Chromium):

```bash
python3 tools/run_tests.py        # 87 assertions in a real browser
python3 tools/run_tests_node.mjs  # same suite without a browser, for quick loops
```

## Credits

No third-party libraries. Built at LaunchPad Hacks 2026 (and shown at Silicon Valley Buildathon) — a single-file-per-module, dependency-free build by Gaon Park.
