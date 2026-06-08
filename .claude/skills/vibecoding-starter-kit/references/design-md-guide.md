# design.md Guide

`design.md` lives at the **repo root** and is the single source of truth for the design system. Components never hardcode design values — they reference Tailwind tokens defined in `globals.css`, which mirror `design.md`.

## Workflow

```
1. Author/edit design.md       (human-readable spec)
   ↓
2. Mirror tokens in globals.css under @theme inline
   ↓
3. Components use Tailwind classes (bg-primary, text-muted-foreground, etc.)
   ↓
4. Visual review against design.md
```

When a designer hands over Figma tokens, update `design.md` first, then sync `globals.css`. **Never** edit `globals.css` without also updating `design.md`.

## Required Sections in design.md

Every `design.md` must contain these sections:

1. **Brand Voice** — tone, personality, do/don't language
2. **Color System** — primary, semantic, neutrals (with both Tailwind name + raw value)
3. **Typography** — font families, scale, weights
4. **Spacing & Radius** — base unit, scale, border radii
5. **Components** — base button, input, card, dialog patterns
6. **Motion** — duration, easing, when to animate
7. **Iconography** — icon set, sizing, stroke
8. **Accessibility** — contrast targets, focus rings, semantic HTML

A starter `design.md` template is in `assets/design.md`.

## Token Mirroring (design.md ↔ globals.css)

Each color in `design.md` maps to a CSS variable in `globals.css`:

**design.md:**
```markdown
### Primary
- Tailwind: `primary` / `primary-foreground`
- Light: `oklch(0.205 0 0)` (near-black)
- Dark: `oklch(0.985 0 0)` (near-white)
- Use for: primary CTAs, brand accents
```

**globals.css:**
```css
@theme inline {
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
}

:root {
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
}

.dark {
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
}
```

**Component:**
```tsx
<button className="bg-primary text-primary-foreground">Save</button>
```

## Color Format: oklch

Use `oklch()` for all color tokens. Reasons:
- Perceptually uniform (linear lightness)
- Wide gamut support
- Easier to generate accessible variants
- shadcn/ui new-york style uses oklch by default

Convert HEX to oklch via [oklch.com](https://oklch.com) when migrating from a Figma palette.

## Typography Scale

Recommended scale (matches Tailwind defaults, customize in design.md):

| Token | Size | Line Height | Use |
|-------|------|-------------|-----|
| `text-xs` | 0.75rem | 1rem | Captions, badges |
| `text-sm` | 0.875rem | 1.25rem | Body small, labels |
| `text-base` | 1rem | 1.5rem | Body |
| `text-lg` | 1.125rem | 1.75rem | Lead paragraphs |
| `text-xl` | 1.25rem | 1.75rem | Card titles |
| `text-2xl` | 1.5rem | 2rem | Section heads |
| `text-3xl` | 1.875rem | 2.25rem | Page heads |
| `text-4xl` | 2.25rem | 2.5rem | Hero |

Document any custom font families in design.md and load via `next/font` in `app/layout.tsx`.

## Spacing & Radius

Tailwind 4 uses a 0.25rem base unit. Stick with the default scale unless design.md overrides it. For radius:

```css
:root {
  --radius: 0.625rem; /* 10px - default for "new-york" style */
}

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

## Dark Mode

Always define both `:root` (light) and `.dark` blocks. Toggle via `next-themes`:

```bash
pnpm add next-themes
```

```tsx
// src/app/layout.tsx
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

## Updating design.md (Process)

1. **Propose** — open a branch, edit `design.md` with the new token / pattern.
2. **Mirror** — sync `globals.css` so Tailwind classes resolve correctly.
3. **Visualize** — run `pnpm dev`, scan key pages (login, dashboard, empty states).
4. **Review** — eyeball contrast (WCAG AA minimum), spacing rhythm, type hierarchy.
5. **Commit** both files in the same PR.

## Anti-Patterns

- ❌ Hardcoded colors in components: `bg-[#C6FF00]`, `text-[oklch(0.5_0.2_240)]`
- ❌ Editing shadcn/ui component files for theming
- ❌ Adding tokens to `globals.css` without documenting in `design.md`
- ❌ Inline `style={{}}` props with design values
- ❌ Mixing oklch + hex + rgb in the same token set

## Reference

Starter template: `assets/design.md` — copy and customize for the project's brand.
