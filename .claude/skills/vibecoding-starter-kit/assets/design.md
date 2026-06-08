# Design System

> Source of truth for tokens, voice, and component patterns.
> Tokens here must mirror `src/app/globals.css`. Update both in the same PR.

---

## 1. Brand Voice

**Personality**: [TODO — e.g. "calm, technical, confident; never breathless"]

**Tone**:
- Direct over flowery. Short over long.
- Use second person ("you") when addressing the user.
- Korean for user-facing copy unless the brand is English-first.

**Do / Don't language**:

| ✅ Do | ❌ Don't |
|------|---------|
| "Save" | "Save your changes!" |
| "Couldn't load posts" | "Oops! Something went wrong 😢" |
| "3 of 12" | "Just 3 out of 12" |

---

## 2. Color System

All colors use `oklch()` for perceptual uniformity. Each entry maps to a Tailwind utility name (left column).

### Semantic Tokens (Light)

| Token | oklch | Use |
|-------|-------|-----|
| `background` | `oklch(1 0 0)` | Page background |
| `foreground` | `oklch(0.145 0 0)` | Body text |
| `card` | `oklch(1 0 0)` | Card surfaces |
| `card-foreground` | `oklch(0.145 0 0)` | Card text |
| `primary` | `oklch(0.205 0 0)` | Primary CTAs, brand accents |
| `primary-foreground` | `oklch(0.985 0 0)` | Text on primary |
| `secondary` | `oklch(0.97 0 0)` | Secondary surfaces |
| `secondary-foreground` | `oklch(0.205 0 0)` | Text on secondary |
| `muted` | `oklch(0.97 0 0)` | Muted backgrounds |
| `muted-foreground` | `oklch(0.556 0 0)` | Muted text, captions |
| `accent` | `oklch(0.97 0 0)` | Hover states, accents |
| `destructive` | `oklch(0.577 0.245 27.325)` | Errors, destructive actions |
| `border` | `oklch(0.922 0 0)` | Default borders |
| `input` | `oklch(0.922 0 0)` | Input borders |
| `ring` | `oklch(0.708 0 0)` | Focus rings |

### Semantic Tokens (Dark)

| Token | oklch |
|-------|-------|
| `background` | `oklch(0.145 0 0)` |
| `foreground` | `oklch(0.985 0 0)` |
| `card` | `oklch(0.205 0 0)` |
| `primary` | `oklch(0.985 0 0)` |
| `primary-foreground` | `oklch(0.205 0 0)` |
| `muted` | `oklch(0.269 0 0)` |
| `muted-foreground` | `oklch(0.708 0 0)` |
| `destructive` | `oklch(0.704 0.191 22.216)` |
| `border` | `oklch(1 0 0 / 10%)` |

### Brand Accent (Customize)

Replace this block with the brand's signature color. Example for a lime accent:

```
--brand: oklch(0.91 0.21 130);   /* #C6FF00 */
--brand-foreground: oklch(0.145 0 0);
```

---

## 3. Typography

**Font families** (loaded via `next/font` in `app/layout.tsx`):

- Sans: **Geist Sans** (`--font-geist-sans`)
- Mono: **Geist Mono** (`--font-geist-mono`)
- Display: [TODO — optional, e.g. Noto Serif KR for headlines]

**Scale**:

| Token | Size | Line height | Use |
|-------|------|-------------|-----|
| `text-xs` | 0.75rem | 1rem | Captions, metadata |
| `text-sm` | 0.875rem | 1.25rem | Labels, body small |
| `text-base` | 1rem | 1.5rem | Body |
| `text-lg` | 1.125rem | 1.75rem | Lead paragraphs |
| `text-xl` | 1.25rem | 1.75rem | Card titles |
| `text-2xl` | 1.5rem | 2rem | Section heads |
| `text-3xl` | 1.875rem | 2.25rem | Page heads |
| `text-4xl` | 2.25rem | 2.5rem | Hero |

**Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold). Avoid 900 except for display.

---

## 4. Spacing & Radius

**Spacing**: Tailwind default 0.25rem base unit. Stick with the standard scale (`gap-2`, `p-4`, `mt-6`...).

**Radius scale**:

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `calc(var(--radius) - 4px)` | Inputs, badges |
| `--radius-md` | `calc(var(--radius) - 2px)` | Buttons |
| `--radius-lg` | `var(--radius)` (`0.625rem`) | Cards, dialogs |
| `--radius-xl` | `calc(var(--radius) + 4px)` | Modals |

---

## 5. Components

### Button

- Primary: `bg-primary text-primary-foreground`
- Secondary: `bg-secondary text-secondary-foreground`
- Outline: `border border-input bg-background`
- Ghost: `hover:bg-accent`
- Destructive: `bg-destructive text-white`

Sizes: `sm` (h-8), `default` (h-9), `lg` (h-10), `icon` (square h-9 w-9).

### Input

- Default: `border border-input bg-background h-9 px-3 rounded-md`
- Error: add `border-destructive`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-ring`

### Card

- `bg-card text-card-foreground border rounded-lg shadow-sm`
- Internal padding: `p-6` for header/content, `p-4` for compact cards.

### Dialog

- Backdrop: `bg-black/50 backdrop-blur-sm`
- Content: `bg-card rounded-lg shadow-xl max-w-lg p-6`
- Animation: 150ms ease-out fade + 4px slide-up.

---

## 6. Motion

**Durations**: 150ms (micro), 200ms (default), 300ms (modal/page).
**Easing**: `ease-out` for enter, `ease-in` for exit, `ease-in-out` for state transitions.

**When to animate**:
- ✅ Modal/dialog enter & exit
- ✅ Accordion expand/collapse
- ✅ Hover state on interactive elements (color/opacity, ≤200ms)
- ❌ Page transitions (let Next.js handle)
- ❌ Loading skeletons need no animation beyond a subtle pulse

Respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 7. Iconography

- **Library**: `lucide-react` (already installed)
- **Default size**: `h-4 w-4` (in buttons), `h-5 w-5` (standalone), `h-6 w-6` (large)
- **Stroke**: 2px (lucide default)
- **Color**: inherit from parent (`text-current`)

Common patterns:
```tsx
<Plus className="mr-2 h-4 w-4" />          // in button before label
<Loader2 className="h-4 w-4 animate-spin" /> // loading
```

---

## 8. Accessibility

- **Contrast**: All text ≥ WCAG AA (4.5:1 for body, 3:1 for large text)
- **Focus rings**: Always visible (`focus-visible:ring-2 focus-visible:ring-ring`)
- **Semantic HTML**: `<button>` for actions, `<a>` for navigation, headings in order
- **Form labels**: every input has a `<label htmlFor>` or `aria-label`
- **Touch targets**: minimum 44×44 px on mobile (use `h-11 w-11` for icon-only buttons)
- **Color independence**: never rely on color alone (pair with icon or text)

---

## 9. Imagery

- **Format**: AVIF → WebP → JPEG fallback (Next.js `next/image` handles this)
- **Aspect ratios**: 16:9 for hero, 1:1 for avatars, 4:3 for cards
- **Border radius**: match component radius (`rounded-lg` on cards, `rounded-full` on avatars)
- **Loading**: `loading="lazy"` for below-fold; `priority` for LCP image only

---

## 10. Voice in Microcopy

| Context | Copy |
|---------|------|
| Empty state | "No posts yet. Create your first one." |
| Loading | "Loading…" (with spinner). No "Just a moment, please!" |
| Error | "Couldn't load posts. [Try again]" |
| Success toast | "Saved." (period, no exclamation) |
| Destructive confirm | "Delete this post? This cannot be undone." |
| Sign-up CTA | "Get started" — never "Sign up now!" |

---

## 11. Open Questions / TODO

- [ ] Confirm primary brand color with stakeholders
- [ ] Decide on display font for headlines
- [ ] Define data viz palette (charts in Recharts)
- [ ] Document icon usage rules per surface

---

**Last updated**: [TODO]
