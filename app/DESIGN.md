# Design System

> Source of truth for tokens, voice, and component patterns.
> Tokens here mirror `src/app/globals.css`. Update both in the same PR.

---

## 1. Brand Voice

**Personality**: TODO — 한 줄로 정의 (예: "차분, 기술적, 자신감 있게; 호들갑 없이")

**Tone**:
- 직설적이고 짧게.
- 한국어 우선. 영문 카피는 브랜드가 영어 우선일 때만.

**Do / Don't**:

| ✅ Do | ❌ Don't |
|------|---------|
| "저장" | "저장 완료되었습니다!" |
| "게시물을 불러오지 못했습니다" | "이런! 뭔가 잘못됐어요 😢" |
| "12개 중 3개" | "12개 중에 단 3개만" |

---

## 2. Color System

`oklch()` 좌표계 사용. 좌측이 Tailwind 토큰명.

### Light

| Token | oklch | 용도 |
|-------|-------|-----|
| `background` | `oklch(1 0 0)` | 페이지 배경 |
| `foreground` | `oklch(0.145 0 0)` | 본문 |
| `card` | `oklch(1 0 0)` | 카드 표면 |
| `primary` | `oklch(0.205 0 0)` | 주요 CTA |
| `primary-foreground` | `oklch(0.985 0 0)` | primary 위 텍스트 |
| `muted` | `oklch(0.97 0 0)` | 보조 배경 |
| `muted-foreground` | `oklch(0.556 0 0)` | 보조 텍스트 |
| `destructive` | `oklch(0.577 0.245 27.325)` | 에러/위험 |
| `border` | `oklch(0.922 0 0)` | 기본 테두리 |
| `ring` | `oklch(0.708 0 0)` | 포커스 링 |

### Dark

| Token | oklch |
|-------|-------|
| `background` | `oklch(0.145 0 0)` |
| `foreground` | `oklch(0.985 0 0)` |
| `card` | `oklch(0.205 0 0)` |
| `primary` | `oklch(0.922 0 0)` |
| `muted` | `oklch(0.269 0 0)` |
| `border` | `oklch(1 0 0 / 10%)` |

---

## 3. Typography

**기본 글꼴: Pretendard Variable** (한·영 혼용에 최적화된 가변 폰트)

- Sans (기본): `Pretendard Variable`, `Pretendard`, `-apple-system`, `BlinkMacSystemFont`, `system-ui`, `Segoe UI`, `Apple SD Gothic Neo`, `Noto Sans KR`, `Malgun Gothic`, sans-serif
- Mono: `ui-monospace`, `SFMono-Regular`, `Menlo`, `Consolas`, monospace

설치 위치: `node_modules/pretendard` → `src/app/layout.tsx`에서 `pretendardvariable-dynamic-subset.css` import.
폰트 변경하려면 globals.css의 `--font-sans` 토큰만 수정.

**Scale**:

| Token | Size | Line height | 용도 |
|-------|------|-------------|-----|
| `text-xs` | 0.75rem | 1rem | 캡션, 메타 |
| `text-sm` | 0.875rem | 1.25rem | 라벨, 보조 본문 |
| `text-base` | 1rem | 1.5rem | 본문 |
| `text-lg` | 1.125rem | 1.75rem | 리드 문단 |
| `text-xl` | 1.25rem | 1.75rem | 카드 타이틀 |
| `text-2xl` | 1.5rem | 2rem | 섹션 헤드 |
| `text-3xl` | 1.875rem | 2.25rem | 페이지 헤드 |
| `text-4xl` | 2.25rem | 2.5rem | 히어로 |

**Weight**: Pretendard Variable이 100~900 전 영역 지원. 디자인 기본은 400/500/600/700. 800/900은 Display 한정.

**권장 letter-spacing**: 한국어 본문 `-0.011em`, 헤딩 `-0.02em`. 필요 시 `tracking-tight`.

---

## 4. Spacing & Radius

Spacing: Tailwind 기본 0.25rem. 일반 스케일 사용 (`gap-2`, `p-4`, `mt-6`).

Radius (`--radius: 0.625rem`):

| Token | Value | 용도 |
|-------|-------|-----|
| `--radius-sm` | `var(--radius) * 0.6` | input/badge |
| `--radius-md` | `var(--radius) * 0.8` | button |
| `--radius-lg` | `var(--radius)` | card/dialog |
| `--radius-xl` | `var(--radius) * 1.4` | modal |

---

## 5. Components

### Button
- Primary: `bg-primary text-primary-foreground`
- Outline: `border border-input bg-background`
- Ghost: `hover:bg-accent`
- Destructive: `bg-destructive text-white`
- Sizes: `sm` (h-8), default (h-9), `lg` (h-10), `icon` (h-9 w-9)

### Input
- 기본: `border border-input bg-background h-9 px-3 rounded-md`
- 에러: `border-destructive` 추가
- 포커스: `focus-visible:ring-2 focus-visible:ring-ring`

### Card
- `bg-card text-card-foreground border rounded-lg shadow-sm`
- 패딩: header/content `p-6`, compact `p-4`

### Dialog
- 백드롭: `bg-black/50 backdrop-blur-sm`
- 콘텐츠: `bg-card rounded-lg shadow-xl max-w-lg p-6`
- 모션: 150ms ease-out fade + 4px slide-up

---

## 6. Motion

Duration: 150ms (micro), 200ms (default), 300ms (modal/page)
Easing: `ease-out` (enter), `ease-in` (exit), `ease-in-out` (state)
`prefers-reduced-motion`: `globals.css`에서 글로벌 처리됨.

---

## 7. Iconography

- 라이브러리: `lucide-react`
- 기본 사이즈: 버튼 내 `h-4 w-4`, 단독 `h-5 w-5`, 큰 `h-6 w-6`
- 색상: `text-current` (부모 상속)

---

## 8. Accessibility

- 본문 명도비 ≥ 4.5:1 (WCAG AA)
- 포커스 링 항상 보이게 (`focus-visible:ring-2`)
- form `<input>`에 `<label htmlFor>` 필수
- 모바일 터치 타겟 ≥ 44×44px
- 색만으로 정보 전달 금지

---

## 9. Imagery

- 포맷: AVIF → WebP → JPEG (next/image 자동)
- 비율: 히어로 16:9, 아바타 1:1, 카드 4:3
- 라운드: 카드 `rounded-lg`, 아바타 `rounded-full`
- LCP만 `priority`, 그 외 lazy

---

## 10. Microcopy

| Context | Copy |
|---------|------|
| Empty | "아직 게시물이 없습니다. 첫 글을 작성하세요." |
| Loading | "불러오는 중…" |
| Error | "불러오지 못했습니다. [다시 시도]" |
| Success toast | "저장됨." |
| Destructive confirm | "삭제하시겠습니까? 되돌릴 수 없습니다." |
| CTA | "시작하기" |

---

## 11. Open Questions / TODO

- [ ] 브랜드 컬러 확정
- [ ] Display 폰트 결정
- [ ] 차트 팔레트 정의
- [ ] 아이콘 surface별 사용 규칙

---

**Last updated**: 2026-05-08
