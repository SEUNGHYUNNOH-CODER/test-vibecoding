"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { MAP_CONNECTIONS, MAP_SPACES } from "@/lib/comancheria/map-data";
import type { MapSpace } from "@/lib/comancheria/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const TERRITORY_COLOR: Record<string, string> = {
  "upper-arkansas": "#8b7aa8",
  "llano-estacado": "#a8555c",
  "red-river": "#c17a3d",
  "lower-arkansas": "#4f8a86",
  "brazos-colorado": "#a68a5f",
  "rio-grande": "#6f9a4a",
};

const CONNECTION_STYLE: Record<string, string> = {
  solid: "#f2ece1",
  dashed: "#f2ece1",
  special: "#4aa8d8",
};

function spaceColor(space: MapSpace) {
  if (space.territory) return TERRITORY_COLOR[space.territory];
  if (space.type === "reservation") return "#8a8478";
  if (space.type === "square") return "#5b8fae";
  return "#e7e2d6"; // hex (Palo Duro)
}

export function GameMap() {
  const [selected, setSelected] = useState<MapSpace | null>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  const byId = Object.fromEntries(MAP_SPACES.map((s) => [s.id, s]));

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-muted">
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md bg-card text-lg font-medium shadow ring-1 ring-border"
          onClick={() => setScale((s) => Math.min(s + 0.25, 3))}
        >
          +
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md bg-card text-lg font-medium shadow ring-1 ring-border"
          onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
        >
          −
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md bg-card text-xs shadow ring-1 ring-border"
          onClick={() => {
            setScale(1);
            setPos({ x: 0, y: 0 });
          }}
        >
          초기화
        </button>
      </div>

      <div
        className="h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="flex h-full w-full origin-center items-center justify-center"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: dragRef.current ? "none" : "transform 100ms ease-out",
          }}
        >
          <div className="relative aspect-[1500/971] max-h-full w-full max-w-4xl">
            <Image
              src="/comancheria/map.jpg"
              alt="Comancheria 지도"
              fill
              className="pointer-events-none select-none object-contain"
              priority
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {MAP_CONNECTIONS.map((c, i) => {
                const from = byId[c.from];
                const to = byId[c.to];
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={CONNECTION_STYLE[c.type]}
                    strokeWidth={c.type === "special" ? 0.35 : 0.25}
                    strokeDasharray={c.type === "dashed" ? "1.2,1" : undefined}
                    opacity={0.85}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {MAP_SPACES.map((s) => (
                <g
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="cursor-pointer"
                  style={{ pointerEvents: "all" }}
                >
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={s.type === "circle" ? 2.1 : s.type === "reservation" ? 3.2 : 1.6}
                    fill={spaceColor(s)}
                    stroke="#2a2118"
                    strokeWidth={0.15}
                    opacity={0.9}
                  />
                  {s.areaValue !== null && (
                    <text
                      x={s.x}
                      y={s.y + 0.7}
                      textAnchor="middle"
                      fontSize={2}
                      fill="#fff"
                      fontWeight={700}
                      style={{ pointerEvents: "none" }}
                    >
                      {s.areaValue}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.label}</DialogTitle>
                <DialogDescription>
                  {selected.territory ? (
                    <Badge variant="secondary">{selected.territory}</Badge>
                  ) : (
                    <Badge variant="outline">{selected.type}</Badge>
                  )}
                  {selected.areaValue !== null && (
                    <span className="ml-2">면적 값: {selected.areaValue}</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                공간 ID: <code>{selected.id}</code>
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
