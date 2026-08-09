import type { WarCard } from "../types";

/**
 * 25-card War deck. Source: French fan translation PDF supplied by the
 * user (Champalaune Christophe). Card numbers (W01-W25) are a best-effort
 * transcription — a couple of duplicate "Surrender Captives" / "Fast-moving
 * column" copies were hard to disambiguate from the source layout, so if the
 * physical deck's numbering differs slightly it doesn't affect gameplay:
 * content, movement values, and the 25-card total/duplicate distribution
 * are all faithful to the source.
 */
export const WAR_CARDS: WarCard[] = [
  { id: "W01", number: 1, movement: { east: 1, west: 2 }, titleKo: "경계 경보 (Alert Pickets)", eventTimingKo: "플레이 중", effectKo: "이 카드가 플레이 중인 동안 Tactics와 Lords of the Plains 문화 카드 효과는 무효화된다." },
  { id: "W02", number: 2, movement: { east: 1, west: 2 }, titleKo: "경계 경보 (Alert Pickets)", eventTimingKo: "플레이 중", effectKo: "이 카드가 플레이 중인 동안 Tactics와 Lords of the Plains 문화 카드 효과는 무효화된다." },
  { id: "W03", number: 3, movement: { east: 1, west: 1, north: 1 }, titleKo: "빠르게 움직이는 종대", eventTimingKo: "공개 시", effectKo: "전쟁 카드를 한 장 더 뽑아 이동 부분만 확인한다. 강도를 줄이는 주사위는 굴리지 않고, 다른 이벤트도 뽑지 않는다." },
  { id: "W04", number: 4, movement: { east: 1, west: 1, north: 1 }, titleKo: "빠르게 움직이는 종대", eventTimingKo: "공개 시", effectKo: "전쟁 카드를 한 장 더 뽑아 이동 부분만 확인한다. 강도를 줄이는 주사위는 굴리지 않고, 다른 이벤트도 뽑지 않는다." },
  { id: "W05", number: 5, movement: { east: 1, west: 1, north: 1 }, titleKo: "말을 훔쳐라! (대책 행동)", eventTimingKo: "대책 행동", effectKo: "War Column과 같은 공간에 밴드 1개가 있을 때 최대 3MP를 소비할 수 있다. 소비한 MP 1당 War Column 강도를 1 줄인다." },
  { id: "W06", number: 6, movement: { east: 1, west: 1, north: 1 }, titleKo: "말을 훔쳐라! (대책 행동)", eventTimingKo: "대책 행동", effectKo: "War Column과 같은 공간에 밴드 1개가 있을 때 최대 3MP를 소비할 수 있다. 소비한 MP 1당 War Column 강도를 1 줄인다." },
  { id: "W07", number: 7, movement: { east: 1, west: 1, north: 1 }, titleKo: "따돌리기 (대책 행동)", eventTimingKo: "대책 행동", effectKo: "War Column에 인접한 공간에서 밴드가 완료 처리된 후, War Column을 그 밴드의 공간으로 이동시키고(점선 연결은 넘지 않음) 밴드는 가장 가까운 란체리아 자원 상자로 옮긴다." },
  { id: "W08", number: 8, movement: { east: 1, west: 1, north: 1 }, titleKo: "따돌리기 (대책 행동)", eventTimingKo: "대책 행동", effectKo: "War Column에 인접한 공간에서 밴드가 완료 처리된 후, War Column을 그 밴드의 공간으로 이동시키고(점선 연결은 넘지 않음) 밴드는 가장 가까운 란체리아 자원 상자로 옮긴다." },
  { id: "W09", number: 9, movement: { south: 2, west: 1 }, titleKo: "기습 공격!", eventTimingKo: "공개 시", effectKo: "란체리아·동맹 부족·밴드와 같은 공간에 있지 않은, 2칸 이내 최강 War Column을(복수면 무작위 선택) 가장 가까운 란체리아/동맹/밴드 공간으로 이동시킨다(우선순위: 란체리아 > 동맹 > 밴드)." },
  { id: "W10", number: 10, movement: { south: 2, west: 1 }, titleKo: "기습 공격!", eventTimingKo: "공개 시", effectKo: "란체리아·동맹 부족·밴드와 같은 공간에 있지 않은, 2칸 이내 최강 War Column을(복수면 무작위 선택) 가장 가까운 란체리아/동맹/밴드 공간으로 이동시킨다(우선순위: 란체리아 > 동맹 > 밴드)." },
  { id: "W11", number: 11, movement: { south: 2, west: 1 }, titleKo: "기습 공격!", eventTimingKo: "공개 시", effectKo: "란체리아·동맹 부족·밴드와 같은 공간에 있지 않은, 2칸 이내 최강 War Column을(복수면 무작위 선택) 가장 가까운 란체리아/동맹/밴드 공간으로 이동시킨다(우선순위: 란체리아 > 동맹 > 밴드)." },
  { id: "W12", number: 12, movement: { south: 1, west: 1, north: 1 }, titleKo: "트라부아(운반틀)!", eventTimingKo: "공개 시 (선택)", effectKo: "2AP를 소비해 란체리아 하나를 인접 공간으로 이동시킬 수 있다(적재 한도 준수, 강제 아님 — FAQ: 사용하려면 공개 즉시 결정해야 함)." },
  { id: "W13", number: 13, movement: { south: 1, west: 1, north: 1 }, titleKo: "트라부아(운반틀)!", eventTimingKo: "공개 시 (선택)", effectKo: "2AP를 소비해 란체리아 하나를 인접 공간으로 이동시킬 수 있다(적재 한도 준수, 강제 아님 — FAQ: 사용하려면 공개 즉시 결정해야 함)." },
  { id: "W14", number: 14, movement: { south: 1, west: 1, north: 1 }, titleKo: "잘못된 정보", eventTimingKo: "공개 시", effectKo: "가장 약한 War Column 강도 +2 (최대 8). 동률로 여러 개면 모두 적용." },
  { id: "W15", number: 15, movement: { south: 1, west: 1, north: 1 }, titleKo: "잘못된 정보", eventTimingKo: "공개 시", effectKo: "가장 약한 War Column 강도 +2 (최대 8). 동률로 여러 개면 모두 적용." },
  { id: "W16", number: 16, movement: { south: 1, west: 1, north: 1 }, titleKo: "탁 트인 공간", eventTimingKo: "공개 시", effectKo: "가장 강한 War Column 강도 -2 (최소 1). 동률로 여러 개면 모두 적용." },
  { id: "W17", number: 17, movement: { east: 2, south: 1 }, titleKo: "탁 트인 공간", eventTimingKo: "공개 시", effectKo: "가장 강한 War Column 강도 -2 (최소 1). 동률로 여러 개면 모두 적용." },
  { id: "W18", number: 18, movement: { east: 2, south: 1 }, titleKo: "포로 반환 (대책 행동)", eventTimingKo: "대책 행동", effectKo: "Captives를 1개 이상 보유한 밴드가 War Space에서 완료 처리된 후, 그 밴드의 Captives를 전부 소비하면 전쟁이 종료된다(같은 공간에 War Column이 2개 이상이면 그중 하나만 종료, 플레이어 선택)." },
  { id: "W19", number: 19, movement: { east: 2, south: 1 }, titleKo: "포로 반환 (대책 행동)", eventTimingKo: "대책 행동", effectKo: "Captives를 1개 이상 보유한 밴드가 War Space에서 완료 처리된 후, 그 밴드의 Captives를 전부 소비하면 전쟁이 종료된다(같은 공간에 War Column이 2개 이상이면 그중 하나만 종료, 플레이어 선택)." },
  { id: "W20", number: 20, movement: { east: 1, south: 1, north: 1 }, titleKo: "포로 반환 (대책 행동)", eventTimingKo: "대책 행동", effectKo: "Captives를 1개 이상 보유한 밴드가 War Space에서 완료 처리된 후, 그 밴드의 Captives를 전부 소비하면 전쟁이 종료된다(같은 공간에 War Column이 2개 이상이면 그중 하나만 종료, 플레이어 선택)." },
  { id: "W21", number: 21, movement: { east: 1, south: 1, north: 1 }, titleKo: "포로 반환 (대책 행동)", eventTimingKo: "대책 행동", effectKo: "Captives를 1개 이상 보유한 밴드가 War Space에서 완료 처리된 후, 그 밴드의 Captives를 전부 소비하면 전쟁이 종료된다(같은 공간에 War Column이 2개 이상이면 그중 하나만 종료, 플레이어 선택)." },
  { id: "W22", number: 22, movement: { east: 1, south: 1, north: 1 }, titleKo: "빠르게 움직이는 종대", eventTimingKo: "공개 시", effectKo: "전쟁 카드를 한 장 더 뽑아 이동 부분만 확인한다. 강도를 줄이는 주사위는 굴리지 않고, 다른 이벤트도 뽑지 않는다." },
  { id: "W23", number: 23, movement: { east: 1, south: 1, north: 1 }, titleKo: "더 큰 판돈", eventTimingKo: "공개 시", effectKo: "이번 턴 Operation Cleanup Phase(3.4) 종료 시, War Column이 1개 이상 있으면 군사 점수 -1, 0개면 군사 점수 +1." },
  { id: "W24", number: 24, movement: { east: 1, south: 1, north: 1 }, titleKo: "성공적인 매복 (대책 행동)", eventTimingKo: "대책 행동", effectKo: "War Space에서 밴드가 완료 처리된 후, 2AP를 소비하면 그 적 War Column과의 전쟁이 종료된다." },
  { id: "W25", number: 25, movement: {}, titleKo: "다시 섞고 다시 뽑아라!", eventTimingKo: "공개 시", effectKo: "War 덱을 다시 섞은 뒤 카드를 한 장 더 뽑아 지도의 War Event 구역에 앞면으로 놓는다." },
];
