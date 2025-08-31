# Styling & Tailwind v4

This project uses Tailwind CSS v4 with a CSS‑first configuration, system dark mode, and shadcn/ui components.

## Tailwind v4 Setup

- Vite plugin: `@tailwindcss/vite` is enabled in `vite.config.ts`.
- Global CSS: `src/index.css` imports Tailwind and defines design tokens.

```css
/* src/index.css */
@import 'tailwindcss';
@plugin "tailwindcss-animate";
@custom-variant dark (&:is(.dark *));
```

## Design Tokens

Tokens are plain CSS variables declared in `:root` (light) and overridden in `.dark`:

- Base variables: `--background`, `--foreground`, `--primary`, `--radius`, etc.
- Dark overrides mirror the same names under `.dark`.
- Tailwind theme maps variables via `@theme inline` to `--color-*` and `--radius-*` for utilities like `bg-background`, `text-foreground`, `rounded-lg`, etc.

Where to edit:

- Light mode: `src/index.css :root`
- Dark mode: `src/index.css .dark`
- Theme mapping: `src/index.css @theme inline`

Example utilities in components:

- Background/foreground: `bg-background text-foreground`
- Borders: `border-border`
- Primary button: `bg-primary text-primary-foreground`

## Dark Mode

- Dark mode is class-based using `.dark` on `<html>`.
- Variant configured with `@custom-variant dark` for Tailwind v4 selectors.
- Theme switching is handled by `ThemeProvider` and `ThemeToggle`:
  - Provider: `src/components/theme/theme-provider.tsx`
  - Toggle: `src/components/theme/theme-toggle.tsx`
- Modes: `light`, `dark`, `system` (respects `prefers-color-scheme`).

Usage tips:

- To apply dark-only styles: `dark:bg-muted`
- Avoid hard-coded colors; rely on tokens so both themes stay in sync.

## shadcn/ui

- Components live in `src/components/ui/*` and are styled with Tailwind + tokens.
- Use the generator to add components:

```bash
bunx --bun shadcn@latest add button card tabs
```

Customization:

- Use existing tokens (e.g., `--radius`, `--color-*`) instead of static values.
- Prefer `variant` and `size` props on shadcn components to keep styles consistent.
- If a component needs new tokens, add them to `:root` and `.dark`, then map in `@theme inline`.

## Animations

- `tailwindcss-animate` is enabled via `@plugin` in `src/index.css`.
- Use classes like `animate-in fade-in zoom-in` for subtle UI motion.

## Patterns & Conventions

- Keep styles semantic: `bg-card`, `text-muted-foreground`, `border-border`.
- Co-locate feature-specific styles with the component when possible.
- Global styles belong in `src/index.css` only when they are truly shared.
- Accessibility: ensure contrast meets WCAG; tokens are tuned for readability in both themes.

## Troubleshooting

- Utility not reflecting theme? Confirm it maps via `@theme inline` to a `--color-*` variable.
- Dark styles not applying? Ensure `<html>` gets `.dark` via the `ThemeProvider` and the `@custom-variant` line exists.
- Newly added token not working? Define it in both `:root` and `.dark`, then map it in `@theme inline`.
