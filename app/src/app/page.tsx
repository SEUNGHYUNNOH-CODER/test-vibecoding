const EMAIL = 'steve0827@gmail.com';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Aisa
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight">아이사</h1>

        <p className="mt-4 leading-relaxed text-muted-foreground">
          한국에 정식 발매되지 않은 보드게임과 워게임을 좋아합니다.
        </p>

        <div className="mt-10 space-y-3 font-mono text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="w-16 shrink-0 text-xs uppercase tracking-wider">
              관심사
            </span>
            <span className="text-foreground">보드게임 · 워게임 · 미발매 타이틀</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="w-16 shrink-0 text-xs uppercase tracking-wider">
              이메일
            </span>
            <a
              href={`mailto:${EMAIL}`}
              className="text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              {EMAIL}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
