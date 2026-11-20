/*
 * samples.js — two document pairs a visitor can open without having a contract
 * of their own. Both are synthetic; the names, amounts and addresses are made
 * up, and the changes between version 1 and version 2 are the kind that
 * actually show up when a landlord or a client sends a "minor revision".
 */

export const SAMPLES = {
  lease: {
    name: { en: 'Studio lease · Busan', ko: '원룸 임대차계약 · 부산' },
    a: { name: 'lease_v1.txt', text: `주택임대차계약서 (초안)

임대인: 김○○ (부산광역시 부산진구 양정동)
임차인: 이○○ (부산광역시 부산진구 양정동)
목적물: 부산광역시 부산진구 진연로9번길 27, 602호 (전용면적 29.7㎡)

제1조 (목적)
이 계약은 임대인이 위 목적물을 임차인에게 임대하고, 임차인이 이를 임차하여 사용·수익하는 것에 관하여 필요한 사항을 정함을 목적으로 한다.

제2조 (임대차 기간)
임대차 기간은 2026년 12월 1일부터 2028년 11월 30일까지 24개월로 한다. 계약 만료 30일 전까지 어느 일방의 통지가 없으면 동일 조건으로 갱신한다.

제3조 (보증금 및 차임)
보증금은 금 10,000,000원으로 하며, 계약 체결 시 계좌이체로 지급한다.
월 차임은 금 650,000원으로 하고, 매월 25일에 임대인이 지정한 계좌로 지급한다.
관리비는 월 70,000원으로 하며 별도로 정산한다.

제4조 (보증금의 반환)
임대차 종료 시 임대인은 목적물을 인도받은 날부터 14일 이내에 보증금을 임차인에게 반환한다. 다만 임차인의 귀책사유로 발생한 실제 손해가 있는 경우 그 금액을 증빙과 함께 공제할 수 있다.

제5조 (수선 및 유지)
목적물의 주요 시설(보일러, 배관, 창호)의 수선은 임대인이 부담하고, 임차인의 고의·과실로 인한 파손은 임차인이 부담한다.

제6조 (계약의 해지)
임차인이 3개월 이상 차임을 연체한 경우 임대인은 계약을 해지할 수 있다. 임차인은 임대인에게 30일 전에 통지하고 계약을 해지할 수 있으며, 이 경우 위약금은 월 차임 1개월분으로 한다.

제7조 (분쟁의 해결)
이 계약에 관한 분쟁은 부산지방법원의 관할로 한다.

제8조 (특약)
반려동물 사육은 금지한다. 전입신고 및 확정일자는 임차인이 직접 진행한다.` },
    b: { name: 'lease_v2_revised.txt', text: `주택임대차계약서 (수정안)

임대인: 김○○ (부산광역시 부산진구 양정동)
임차인: 이○○ (부산광역시 부산진구 양정동)
목적물: 부산광역시 부산진구 진연로9번길 27, 602호 (전용면적 29.7㎡)

제1조 (목적)
이 계약은 임대인이 위 목적물을 임차인에게 임대하고, 임차인이 이를 임차하여 사용·수익하는 것에 관하여 필요한 사항을 정함을 목적으로 한다.

제2조 (임대차 기간)
임대차 기간은 2026년 12월 1일부터 2028년 11월 30일까지 24개월로 한다. 계약 만료 30일 전까지 어느 일방의 통지가 없으면 동일 조건으로 갱신한다.

제3조 (보증금 및 차임)
보증금은 금 12,000,000원으로 하며, 계약 체결 시 계좌이체로 지급한다.
월 차임은 금 720,000원으로 하고, 매월 25일에 임대인이 지정한 계좌로 지급한다.
관리비는 월 70,000원으로 하며 별도로 정산한다.

제4조 (차임 연체)
차임을 기일 내에 지급하지 않은 경우 연체 금액에 대하여 연 12%의 지연이자를 가산하여 지급한다.

제5조 (수선 및 유지)
목적물의 주요 시설(보일러, 배관, 창호)의 수선은 임대인이 부담하고, 임차인의 고의·과실로 인한 파손은 임차인이 부담한다.

제6조 (계약의 해지)
임차인이 2회 이상 차임을 연체한 경우 임대인은 즉시 계약을 해지할 수 있다. 임차인은 임대인에게 30일 전에 통지하고 계약을 해지할 수 있으며, 이 경우 위약금은 월 차임 2개월분으로 한다.

제7조 (보증금의 공제)
임대차 종료 시 임대인은 보증금에서 청소비, 도배비, 원상복구비를 공제한 후 반환한다. 공제 항목과 금액은 임대인이 정한다.

제8조 (분쟁의 해결)
이 계약에 관한 분쟁은 대한상사중재원의 중재로 해결하며, 중재 비용은 임차인이 부담한다.

제9조 (특약)
반려동물 사육은 금지한다. 전입신고 및 확정일자는 임차인이 직접 진행한다.
임차인은 계약 기간 중 임대인의 사전 서면 동의 없이 전대할 수 없다.` },
  },

  freelance: {
    name: { en: 'Design contract · client revision', ko: '디자인 외주계약 · 수정안' },
    a: { name: 'contract_v1.txt', text: `DESIGN SERVICES AGREEMENT

Client: Northwind Studio Ltd.
Contractor: Gaon Park
Project: Brand identity and a five-page marketing site.

1. Scope of work
The Contractor will deliver a logo system, a colour and type sheet, and a five-page responsive website. Two rounds of revision are included. Additional rounds are billed at $90 per hour.

2. Fees and payment
The total fee is $4,800, payable in two instalments: $2,400 on signature and $2,400 on delivery. Invoices are due within 14 days. Late payments carry interest of 2% per month.

3. Schedule
Work starts on 1 December 2026 and the final files are due on 15 January 2027. Delays caused by the Client extend the schedule by the same number of days.

4. Ownership
On receipt of the final payment the Contractor assigns all rights in the delivered work to the Client. The Contractor may show the work in a portfolio after publication.

5. Termination
Either party may terminate with 14 days written notice. The Client pays for work completed up to the termination date. The Contractor returns any unused deposit within 7 days.

6. Confidentiality
Both parties keep the other's non-public information confidential for two years after the project ends.

7. Governing law
This agreement is governed by the laws of the Republic of Korea, and the courts of Busan have exclusive jurisdiction.` },
    b: { name: 'contract_v2_revised.txt', text: `DESIGN SERVICES AGREEMENT (REVISED)

Client: Northwind Studio Ltd.
Contractor: Gaon Park
Project: Brand identity and a five-page marketing site.

1. Scope of work
The Contractor will deliver a logo system, a colour and type sheet, and a five-page responsive website. One round of revision is included. Additional rounds are billed at $120 per hour.

2. Fees and payment
The total fee is $4,800, payable in two instalments: $2,400 on signature and $2,400 on delivery. Invoices are due within 30 days. Late payments carry interest of 2% per month. The Client may set off any amount it considers disputed.

3. Schedule
Work starts on 1 December 2026 and the final files are due on 15 January 2027. Delays caused by the Client extend the schedule by the same number of days.

4. Ownership
On receipt of the final payment the Contractor assigns all rights in the delivered work to the Client. The Client may use the work in any media now known or later developed, worldwide, in perpetuity.

5. Termination
Either party may terminate with 7 days written notice. If the Client terminates, it pays only for work delivered in the current milestone. Any deposit paid is non-refundable.

6. Confidentiality
Both parties keep the other's non-public information confidential for two years after the project ends. The Contractor will not work for any competing studio for 12 months after the project.

7. Independent contractor
The Contractor is an independent contractor and waives any claim to employee benefits.

8. Dispute resolution
Any dispute arising out of this agreement shall be resolved by binding arbitration administered by the Korean Commercial Arbitration Board. The parties waive any right to participate in a class action.

9. Governing law
This agreement is governed by the laws of the Republic of Korea, and the courts of Busan have exclusive jurisdiction.` },
  },
};

export function sampleText(key, side) {
  const s = SAMPLES[key];
  if (!s) return '';
  return side === 'a' ? s.a.text : s.b.text;
}
