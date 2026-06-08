# shadcn/ui + Tailwind CSS 4

The Vibecoding stack uses **shadcn/ui (new-york style)** on top of **Tailwind CSS 4**. This guide covers the parts that differ from older Tailwind 3 / shadcn setups.

## Tailwind 4 Key Differences

| Tailwind 3 | Tailwind 4 |
|-----------|-----------|
| `tailwind.config.ts` | **No config file**. Tokens go in `globals.css` `@theme inline` |
| `darkMode: 'class'` in config | `@custom-variant dark (&:is(.dark *));` in CSS |
| `@tailwind base; @tailwind components;` | `@import "tailwindcss";` |
| JS-based plugins | CSS-based via `@plugin` directive |

## globals.css Skeleton

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* Map design tokens to Tailwind utility names */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@keyframes accordion-down {
  from { height: 0 }
  to { height: var(--radix-accordion-content-height) }
}
@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height) }
  to { height: 0 }
}

* {
  border-color: var(--color-border);
  outline-color: var(--color-ring);
}

body {
  background-color: var(--color-background);
  color: var(--color-foreground);
}
```

## components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## cn() Helper

`src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Usage:
```tsx
<div className={cn(
  'flex items-center gap-2',
  isActive && 'bg-primary text-primary-foreground',
  className,
)} />
```

## Adding Components

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add textarea
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add alert
pnpm dlx shadcn@latest add skeleton
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add separator
pnpm dlx shadcn@latest add popover
pnpm dlx shadcn@latest add accordion
```

Components are copied into `src/components/ui/`. **Edit them directly** if you need behavior changes — but for theming, prefer changing CSS variables in `globals.css`.

## Common Patterns

### Card with semantic tokens
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription className="text-muted-foreground">Subtitle</CardDescription>
  </CardHeader>
  <CardContent>Body</CardContent>
</Card>
```

### Status badge with semantic colors
```tsx
const statusStyles = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  archived: 'bg-muted text-muted-foreground',
} as const;

<Badge className={cn(statusStyles[status])}>{status}</Badge>
```

### Form field with error state
```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    name="email"
    className={cn(errors.email && 'border-destructive')}
  />
  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
</div>
```

### Responsive grid
```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {items.map((item) => <Card key={item.id} ... />)}
</div>
```

### Loading skeleton
```tsx
import { Skeleton } from '@/components/ui/skeleton';

<div className="space-y-4">
  {Array.from({ length: 5 }).map((_, i) => (
    <Skeleton key={i} className="h-16 w-full" />
  ))}
</div>
```

## Icons (lucide-react)

```tsx
import { Plus, Trash2, Loader2 } from 'lucide-react';

<Button>
  <Plus className="mr-2 h-4 w-4" />
  New post
</Button>

<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Saving...
</Button>
```

`optimizePackageImports: ['lucide-react']` in `next.config.ts` ensures only the icons you import are bundled.

## Dark Mode Toggle (next-themes)

```bash
pnpm add next-themes
```

`src/app/layout.tsx`:
```tsx
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

`src/components/theme-toggle.tsx`:
```tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 dark:hidden" />
      <Moon className="hidden h-5 w-5 dark:block" />
    </Button>
  );
}
```

## Anti-Patterns

- ❌ `tailwind.config.js` / `tailwind.config.ts` — Tailwind 4 ignores these.
- ❌ Hardcoded colors (`bg-[#C6FF00]`) — use tokens.
- ❌ Editing `src/components/ui/*` for theming — change CSS variables instead.
- ❌ Mixing utility classes with inline styles for design values.
- ❌ Importing from `tailwindcss/colors` JS — Tailwind 4 is CSS-native.

## Reference

- Tailwind 4 docs: https://tailwindcss.com/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind 4 upgrade guide: https://tailwindcss.com/docs/upgrade-guide
