"use client";

import dynamic from "next/dynamic";

// 저장된 게임을 localStorage 에서 바로 읽으므로 프리렌더를 끈다
const Game = dynamic(() => import("@/components/josephii/Game"), { ssr: false });

export default function JosephIIPage() {
  return <Game />;
}
