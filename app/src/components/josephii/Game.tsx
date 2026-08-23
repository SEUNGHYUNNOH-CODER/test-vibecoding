"use client";

import { useEffect, useState } from "react";
import type { GameState } from "@/lib/josephii/types";
import { MONARCHY } from "@/lib/josephii/map";
import {
  TOTAL_ROUNDS,
  type ActionId,
  act,
  advanceRound,
  calendarLabel,
  createGame,
  dismissEffect,
  finalReport,
  promulgate,
  reproclaim,
  suppress,
  withdraw,
} from "@/lib/josephii/engine";
import { StatusBar } from "@/components/josephii/StatusBar";
import { HexMap } from "@/components/josephii/HexMap";
import { HexSheet } from "@/components/josephii/HexSheet";
import { EdictPanel } from "@/components/josephii/EdictPanel";
import { ActivePanel } from "@/components/josephii/ActivePanel";
import { Button } from "@/components/ui/button";

const SAVE_KEY = "josephii-save-v1";
const TABS = [
  { id: "map", labelKo: "지도" },
  { id: "edicts", labelKo: "반포" },
  { id: "active", labelKo: "진행" },
  { id: "log", labelKo: "기록" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function readSave(): { state: GameState; startR: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as { state: GameState; startR: number }) : null;
  } catch {
    return null; // 저장이 깨졌으면 새 게임으로 시작한다
  }
}

export default function Game() {
  // ssr: false 로 실려 클라이언트에서만 렌더되므로 지연 초기화로 바로 읽는다
  const saved = useState(readSave)[0];
  const [state, setState] = useState<GameState | null>(saved?.state ?? null);
  const [startR, setStartR] = useState<number>(saved?.startR ?? 0);
  const [tab, setTab] = useState<TabId>("map");
  const [selectedHex, setSelectedHex] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ state, startR }));
    } catch {
      // 용량 초과 등은 무시 — 저장 실패가 플레이를 막지 않는다
    }
  }, [state, startR]);

  function newGame() {
    const s = createGame(MONARCHY);
    setState(s);
    setStartR(s.startR);
    setTab("map");
  }

  /** 엔진은 상태를 제자리에서 바꾸므로 복제 후 적용한다 */
  function mutate(fn: (s: GameState) => void) {
    setState((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }

  if (!state) {
    return (
      <main className="mx-auto flex h-dvh max-w-lg flex-col justify-center gap-6 p-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">요제프 2세</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            1780년 12월. 마리아 테레지아가 세상을 떠나고 단독 통치가 시작된다. 111개월 뒤
            1790년 2월에 당신도 죽는다. 그 사이에 무엇을 바꿀 수 있는가.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            칙령은 반포하는 즉시 발효된다. 승인 절차는 없다. 문제는 집행이다 — 빈에서
            브뤼셀까지 칙령 하나가 닿는 데 10개월이 걸리고, 닿은 뒤에도 헝가리 부군 총회는
            그것을 공포하지 않을 권리를 갖고 있다.
          </p>
        </div>
        <Button onClick={newGame} size="lg">
          즉위
        </Button>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          축약 25헥스 지도 초안. 실제 설계는 약 190헥스이며 데이터 작성이 남아 있다.
        </p>
      </main>
    );
  }

  const report = state.gameOver ? finalReport(MONARCHY, state, startR) : null;

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <StatusBar state={state} />

      <nav className="flex border-b bg-card">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === t.id
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground"
            }`}
          >
            {t.labelKo}
            {t.id === "active" && state.active.filter((a) => a.inProgress).length > 0 && (
              <span className="ml-1 text-[10px] tabular-nums">
                {state.active.filter((a) => a.inProgress).length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === "map" && (
          <HexMap world={MONARCHY} state={state} onSelect={setSelectedHex} />
        )}
        {tab === "edicts" && (
          <EdictPanel
            world={MONARCHY}
            state={state}
            onPromulgate={(id) => mutate((s) => promulgate(MONARCHY, s, id))}
          />
        )}
        {tab === "active" && (
          <ActivePanel
            world={MONARCHY}
            state={state}
            onReproclaim={(id) => mutate((s) => reproclaim(MONARCHY, s, id))}
            onWithdraw={(id, crownlandId) =>
              mutate((s) => withdraw(MONARCHY, s, id, crownlandId))
            }
            onAct={(id: ActionId, targetId) => mutate((s) => act(MONARCHY, s, id, targetId))}
            onDismiss={(effectId) => mutate((s) => dismissEffect(s, effectId))}
            onSuppress={(revoltId) => mutate((s) => suppress(MONARCHY, s, revoltId))}
          />
        )}
        {tab === "log" && <LogView state={state} />}
      </main>

      <footer className="border-t bg-card p-3">
        {state.gameOver ? (
          <Button onClick={newGame} className="w-full">
            새로 시작
          </Button>
        ) : (
          <Button onClick={() => mutate((s) => advanceRound(MONARCHY, s))} className="w-full">
            다음 달 →
          </Button>
        )}
      </footer>

      <HexSheet
        world={MONARCHY}
        state={state}
        hexId={selectedHex}
        onClose={() => setSelectedHex(null)}
      />

      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6">
          <div className="w-full max-w-sm space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">1790년 2월 20일</p>
              <h2 className="text-2xl font-semibold tracking-tight">{report.gradeKo}</h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{report.verdictKo}</p>
            <dl className="space-y-1 border-y py-3 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">최종 평가 ΔR</dt>
                <dd className="font-medium">
                  {report.delta >= 0 ? "+" : ""}
                  {report.delta.toFixed(1)}
                </dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-muted-foreground">종료 시점 / 누적 평균</dt>
                <dd className="text-muted-foreground">
                  {report.endDelta >= 0 ? "+" : ""}
                  {report.endDelta.toFixed(1)} / {report.meanDelta >= 0 ? "+" : ""}
                  {report.meanDelta.toFixed(1)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">인구 / 영역 / 세수</dt>
                <dd className="font-medium">
                  {report.national.p.toFixed(0)} / {report.national.t.toFixed(0)} /{" "}
                  {report.national.f.toFixed(0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">반포한 칙령</dt>
                <dd className="font-medium">{state.active.length} / 28</dd>
              </div>
            </dl>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              참고: 요제프 2세가 실제로 도달한 지점은 +6 근처로 추정된다.
            </p>
            <Button onClick={newGame} className="w-full">
              새로 시작
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogView({ state }: { state: GameState }) {
  return (
    <div className="divide-y">
      {state.log.map((entry, i) => (
        <div key={i} className="flex gap-3 px-4 py-2">
          <span className="w-20 shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {calendarLabel(entry.round)}
          </span>
          <span
            className={`text-[13px] leading-relaxed ${
              entry.tone === "bad"
                ? "text-destructive"
                : entry.tone === "event"
                  ? "font-medium"
                  : ""
            }`}
          >
            {entry.text}
          </span>
        </div>
      ))}
      {state.round >= TOTAL_ROUNDS && (
        <p className="p-4 text-[11px] text-muted-foreground">재위가 끝났다.</p>
      )}
    </div>
  );
}
