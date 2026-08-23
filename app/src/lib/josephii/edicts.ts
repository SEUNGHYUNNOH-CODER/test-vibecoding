/**
 * §10 칙령 28개 (7영역 × 4단계). P/T/F 는 §10.2~§10.8 표, 이해충돌도는 같은
 * 절의 서술을 계층 기본값 + 세력 예외로 옮긴 것이다.
 *
 * 도달률 기여값에는 rules.ts 의 GAIN_SCALE 이 곱해진다 — 여기 적힌 값은
 * 사양서 원값 그대로다.
 */
import type { Axes, Edict } from "./types.ts";

export const AREA_LABEL: Record<number, string> = {
  1: "종교",
  2: "신민 지위",
  3: "법",
  4: "국가 파악",
  5: "지방 행정",
  6: "조세",
  7: "언어·교육",
};

export const AREA_NOTE: Record<number, string> = {
  1: "건수는 가장 많고 파급도 크다. 단계4는 함정이다 — 얻는 도달률이 거의 없는데 농민까지 적대시한다.",
  2: "단계1~3은 인구 도달만 올리고 세수는 건드리지 못한다.",
  3: "단계4는 조세 균등화 다음으로 광범위한 적을 만든다. 법 앞의 평등이 곧 신분 특권 폐지이기 때문이다.",
  4: "측정은 통제의 전제이고, 측정 자체가 저항을 부른다.",
  5: "단계4가 게임 최대의 도달률 획득처이자 최대 위험이다.",
  6: "건수는 가장 적고 파급은 가장 크다.",
  7: "단계3이 이 게임의 시그니처 트레이드오프다.",
};

const A = (p: number, t: number, f: number): Axes => ({ p, t, f });

export const EDICTS: Edict[] = [
  // ── §10.2 영역 1 · 종교
  {
    id: "toleranz", labelKo: "관용령", year: "1781.10", area: 1, tier: 1, gain: A(6, 1, 0),
    noteKo: "개신교·정교 신자에게 제한적 신앙의 자유를 준다. 개신교 성직자에게는 결정적 수혜다.",
    conflict: { byFaction: { "cath-clergy": 2, "tirol-peasant": 2, "hu-noble": -1, "luth-clergy": -3, "calv-clergy": -3, "unit-clergy": -3, "ortho-clergy": -3, "gcath-clergy": -1 } },
  },
  {
    id: "monastery", labelKo: "수도원 해산", year: "1782.1", area: 1, tier: 2, gain: A(2, 5, 7),
    noteKo: "관상 수도회를 해산하고 재산을 국고로 넘긴다. 이 재원이 단계3의 교구 신설을 떠받친다.",
    conflict: { byEstate: { noble: 1, burgher: -1 }, byFaction: { "cath-clergy": 3 } },
  },
  {
    id: "parish", labelKo: "교구 재편 + 총신학교", year: "1783", area: 1, tier: 3, gain: A(7, 5, 1),
    noteKo: "1,700개 새 교구를 세우고 성직자 양성을 국가가 쥔다.",
    conflict: { byEstate: { clergy: 1, peasant: -1 }, byFaction: { "cath-clergy": 2 } },
  },
  {
    id: "burial", labelKo: "예배·매장 규정", year: "1784~85", area: 1, tier: 4, gain: A(-4, 3, 1),
    noteKo: "예배 형식과 매장 절차까지 규정한다. 관 재사용령은 6개월 만에 철회되었다.",
    conflict: { byEstate: { noble: 1, burgher: 1, peasant: 2 }, byFaction: { "cath-clergy": 2 } },
  },
  // ── §10.3 영역 2 · 신민 지위
  {
    id: "serfdom-cz", labelKo: "농노제 칙령 (보헤미아)", year: "1781.11", area: 2, tier: 1, gain: A(8, 2, 0),
    noteKo: "영주의 혼인·이주·직업 통제권을 폐지한다. 금전 부담과 부역은 그대로 남는다.",
    conflict: { byEstate: { noble: 1, peasant: -1 }, byFaction: { "cz-noble": 3, "de-noble": 2, "cz-peasant": -3 } },
  },
  {
    id: "marriage", labelKo: "혼인 특허", year: "1783", area: 2, tier: 2, gain: A(5, 3, 0),
    noteKo: "혼인을 교회 성사가 아닌 민사 계약으로 규정한다.",
    conflict: { byEstate: { peasant: -1 }, byFaction: { "cath-clergy": 3, "jew-clergy": 2, "luth-clergy": 1, "calv-clergy": 1, "unit-clergy": 1, "ortho-clergy": 1, "gcath-clergy": 1 } },
  },
  {
    id: "serfdom-hu", labelKo: "농노제 확대 (헝가리)", year: "1785", area: 2, tier: 3, gain: A(9, 3, 1),
    noteKo: "보헤미아 칙령을 헝가리로 확대한다. 부군 귀족의 정면 이해와 충돌한다.",
    conflict: { byEstate: { noble: 1 }, byFaction: { "hu-noble": 3, "hr-noble": 3, "pl-noble": 1, "hu-peasant": -3, "sk-peasant": -3, "ro-peasant": -3, "ru-peasant": -3 } },
  },
  {
    id: "manorial-courts", labelKo: "영주 재판권 제한", year: "1787~", area: 2, tier: 4, gain: A(7, 6, 2),
    noteKo: "영주가 농민을 재판하던 권한에 국가가 상소심을 끼워 넣는다.",
    conflict: { byEstate: { noble: 3, clergy: 1, peasant: -3 } },
  },
  // ── §10.4 영역 3 · 법
  {
    id: "censorship", labelKo: "검열 완화", year: "1781", area: 3, tier: 1, gain: A(3, 1, 0),
    noteKo: "검열을 교회에서 국가로 옮기고 범위를 좁힌다.",
    conflict: { byEstate: { burgher: -2 }, byFaction: { "cath-clergy": 2 } },
  },
  {
    id: "penal-code", labelKo: "형법전 (사형 폐지)", year: "1787", area: 3, tier: 2, gain: A(4, 5, 0),
    conflict: { byEstate: { noble: 1, clergy: 1, peasant: -1 } },
  },
  {
    id: "civil-code", labelKo: "민법전 1부", year: "1786", area: 3, tier: 3, gain: A(3, 6, 1),
    conflict: { byEstate: { noble: 2, burgher: 1, peasant: -1 } },
  },
  {
    id: "abolish-estate-courts", labelKo: "신분별 법정 폐지", year: "1786~88", area: 3, tier: 4, gain: A(4, 9, 2),
    noteKo: "법 앞의 평등이 곧 신분 특권 폐지다.",
    conflict: { byEstate: { noble: 3, clergy: 3, burgher: 2, peasant: -2 }, byFaction: { "jew-burgher": -1 } },
  },
  // ── §10.5 영역 4 · 국가 파악
  {
    id: "house-numbers", labelKo: "가옥 번호 부여", year: "1781~", area: 4, tier: 1, gain: A(2, 4, 1),
    conflict: { byEstate: { noble: 1, peasant: 1 } },
  },
  {
    id: "census", labelKo: "인구조사", year: "1784~87", area: 4, tier: 2, gain: A(5, 6, 3),
    noteKo: "유일하게 농민까지 적대시하는 측정 칙령이다. 징병과 연결될 것을 두려워했다.",
    conflict: { byEstate: { noble: 2, clergy: 1, burgher: 1, peasant: 2 }, byFaction: { "hu-noble": 3 } },
  },
  {
    id: "cadastre", labelKo: "토지 측량", year: "1785~", area: 4, tier: 3, gain: A(2, 5, 9),
    noteKo: "1789년 조세 칙령의 근거가 된 측량이다.",
    conflict: { byEstate: { noble: 3, clergy: 3, burgher: 1, peasant: -1 } },
  },
  {
    id: "civil-service", labelKo: "관료 근무·평가 규정", year: "1783~", area: 4, tier: 4, gain: A(1, 7, 3),
    conflict: { byEstate: { noble: 2, burgher: -1 } },
  },
  // ── §10.6 영역 5 · 지방 행정
  {
    id: "kreis-reform", labelKo: "크라이스 개편", year: "1782~", area: 5, tier: 1, gain: A(1, 5, 2),
    conflict: { byFaction: { "de-noble": 1, "cz-noble": 1 } },
  },
  {
    id: "buda-move", labelKo: "총독부 부다 이전", year: "1784", area: 5, tier: 2, gain: A(2, 4, 1),
    conflict: { byFaction: { "hu-noble": 2 } },
  },
  {
    id: "city-admin", labelKo: "도시 행정 개편", year: "1785~86", area: 5, tier: 3, gain: A(0, 5, 3),
    noteKo: "두 번째 함정이다. 도시민을 적대시하면서 자유왕령도시의 우회로를 스스로 좁힌다 — 반포하면 도시성 보정이 절반으로 줄어든다.",
    conflict: { byEstate: { burgher: 3 }, byFaction: { "jew-burgher": 0 } },
  },
  {
    id: "suspend-varmegye", labelKo: "부군 자치 정지 + 10관구", year: "1785", area: 5, tier: 4, gain: A(3, 12, 6),
    noteKo: "게임 최대의 영역 도달 획득처이자 최대 위험. 요제프가 1790년 1월에 가장 먼저 철회한 항목이다.",
    conflict: { byEstate: { noble: 2 }, byFaction: { "hu-noble": 3, "hr-noble": 3, "hu-burgher": -1 } },
  },
  // ── §10.7 영역 6 · 조세
  {
    id: "tariff", labelKo: "관세 조정", year: "1782~", area: 6, tier: 1, gain: A(0, 1, 4),
    conflict: { byEstate: { burgher: 2 }, byFaction: { "hu-noble": 1 } },
  },
  {
    id: "monopoly", labelKo: "국가 전매 확대", year: "1783~", area: 6, tier: 2, gain: A(-1, 2, 6),
    conflict: { byEstate: { burgher: 3, peasant: 1, noble: 1 } },
  },
  {
    id: "city-tax", labelKo: "도시 과세 강화", year: "1785~", area: 6, tier: 3, gain: A(0, 2, 7),
    conflict: { byEstate: { burgher: 3 }, byFaction: { "jew-burgher": 2 } },
  },
  {
    id: "tax-robot", labelKo: "조세·부역 칙령", year: "1789.11", area: 6, tier: 4, gain: A(4, 3, 18),
    noteKo: "게임 유일의 전 세력 동시 적대 항목. 세수 도달 +18은 다른 어느 칙령의 3배다.",
    conflict: { byEstate: { noble: 3, clergy: 3, burgher: 2, peasant: -3 } },
  },
  // ── §10.8 영역 7 · 언어·교육
  {
    id: "primary-school", labelKo: "초등학교 확대", year: "1781~", area: 7, tier: 1, gain: A(5, 2, 0),
    conflict: { byEstate: { peasant: -1 }, byFaction: { "cath-clergy": 1 } },
  },
  {
    id: "university", labelKo: "대학 개편", year: "1782~", area: 7, tier: 2, gain: A(2, 3, 0),
    conflict: { byEstate: { noble: 1, burgher: -1 }, byFaction: { "cath-clergy": 2 } },
  },
  {
    id: "german-admin", labelKo: "독일어 행정어", year: "1784.5", area: 7, tier: 3, gain: A(-9, 10, 3),
    noteKo: "영역 도달을 크게 올리면서 인구 도달을 크게 깎는다. 기하평균 공식에서는 순손실이 될 수 있다.",
    conflict: {
      byFaction: {
        "hu-noble": 3, "be-noble": 3, "be-burgher": 3, "it-noble": 3, "it-burgher": 3, "it-peasant": 3,
        "pl-noble": 2, "cz-noble": 1, "hu-burgher": 1,
        "de-noble": -1, "de-burgher": -1, "de-peasant": -1, "tirol-peasant": -1,
      },
    },
  },
  {
    id: "german-university", labelKo: "대학 교육어 독일어화", year: "1784~", area: 7, tier: 4, gain: A(-3, 4, 0),
    conflict: {
      byFaction: {
        "hu-noble": 2, "hu-burgher": 2, "it-burgher": 2, "be-burgher": 2,
        "de-noble": -1, "de-burgher": -1, "de-peasant": -1, "tirol-peasant": -1,
      },
    },
  },
];

export const EDICT_BY_ID: Record<string, Edict> = Object.fromEntries(
  EDICTS.map((e) => [e.id, e]),
);

/** §2.5 적대 전환 — 이 칙령이 관철되면 도시성 보정이 절반으로 줄어든다 */
export const URBANITY_PENALTY_EDICT = "city-admin";

/** §9.3 검산 시나리오 — 헝가리 지향 개혁 8개 */
export const HUNGARY_SCENARIO: string[] = [
  "serfdom-hu", "suspend-varmegye", "cadastre", "manorial-courts",
  "tax-robot", "german-admin", "census", "abolish-estate-courts",
];
