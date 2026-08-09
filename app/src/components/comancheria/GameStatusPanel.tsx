"use client";

import { useState } from "react";
import type { GameState } from "@/lib/comancheria/game-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GameStatusPanel({ gameState }: { gameState: GameState }) {
  const [open, setOpen] = useState(false);
  const { generalRecord, drawCup, developmentDeck, rancherias, historyCardId } = gameState;
  const cupTotal = drawCup.success + drawCup.enemyAp2 + drawCup.enemyAp3 + drawCup.enemyAp4;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 overflow-x-auto border-t bg-card px-4 py-2 text-sm"
      >
        <span>
          군사 <b>{generalRecord.militaryPoints}</b>
        </span>
        <span>
          문화 <b>{generalRecord.culturePoints}</b>
        </span>
        <span>
          AP <b>{generalRecord.playerAP}</b>
        </span>
        <span>
          적 AP <b>{generalRecord.enemyAP}</b>
        </span>
        <span>
          개발덱 <b>{developmentDeck.drawPile.length}</b>
        </span>
        <span className="text-muted-foreground">자세히 →</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>게임 현황</DialogTitle>
          </DialogHeader>

          <section className="space-y-1 text-sm">
            <h3 className="font-medium">일반 기록 트랙</h3>
            <p>군사 점수: {generalRecord.militaryPoints}</p>
            <p>문화 점수: {generalRecord.culturePoints}</p>
            <p>플레이어 AP: {generalRecord.playerAP}</p>
            <p>적 AP: {generalRecord.enemyAP}</p>
          </section>

          <section className="space-y-1 text-sm">
            <h3 className="font-medium">히스토리 카드</h3>
            <p>{historyCardId}</p>
          </section>

          <section className="space-y-2 text-sm">
            <h3 className="font-medium">란체리아</h3>
            {rancherias.map((r) => (
              <div key={r.id} className="rounded-md border p-2">
                <p className="font-medium">
                  란체리아 {r.id} — 공간 {r.spaceId}
                </p>
                <p>파라이보 의약 등급: {r.paraiboMedicine}</p>
                <p>마히미아나 의약 등급: {r.mahimianaMedicine}</p>
                <p>밴드 (자원 상자): {r.bands.join(", ") || "없음"}</p>
                <p>말: {r.horses}</p>
                <p>마히미아나 보유: {r.hasMahimiana ? "예" : "아니오"}</p>
              </div>
            ))}
          </section>

          <section className="space-y-1 text-sm">
            <h3 className="font-medium">개발 카드 덱</h3>
            <p>지도 위 (공개): #{developmentDeck.layout.join(", #")}</p>
            <p>드로우 더미: {developmentDeck.drawPile.length}장</p>
            <p>손패: {developmentDeck.hand.length}장</p>
            <p>버림/인플레이: {developmentDeck.discardPile.length + developmentDeck.inPlay.length}장</p>
          </section>

          <section className="space-y-1 text-sm">
            <h3 className="font-medium">Success Check Draw Cup ({cupTotal}개)</h3>
            <p>Success: {drawCup.success}</p>
            <p>적 AP 2개: {drawCup.enemyAp2}</p>
            <p>적 AP 3개: {drawCup.enemyAp3}</p>
            <p>적 AP 4개: {drawCup.enemyAp4}</p>
          </section>

          <Button variant="outline" onClick={() => setOpen(false)} className="w-full">
            닫기
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
