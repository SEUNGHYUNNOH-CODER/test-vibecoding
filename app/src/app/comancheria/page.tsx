import { GameMap } from "@/components/comancheria/GameMap";

export default function ComancheriaPage() {
  return (
    <div className="flex h-dvh w-full flex-col">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Comancheria</h1>
        <span className="text-xs text-muted-foreground">지도 프로토타입 (1차 초안)</span>
      </header>
      <main className="min-h-0 flex-1">
        <GameMap />
      </main>
    </div>
  );
}
