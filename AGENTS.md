# Repository Guidelines

## Project Structure & Module Organization

Perigee is a Nuxt 3 client-side application. Keep Vue-facing code in `app/`: components live in `app/components/perigee/`, shared state in `app/composables/`, domain records in `app/data/`, and display helpers in `app/utils/`. The framework-independent Three.js scene engine belongs in `src/perigee/`, with materials, scene builders, and scientific math separated into focused modules. Unit tests live in `tests/`. Global styles are in `assets/css/`; browser-served textures and their licensing record are under `public/assets/`.

## Build, Test, and Development Commands

- `npm ci` installs the exact lockfile dependency set (preferred for clean checkouts and CI).
- `npm run dev` starts the Nuxt development server.
- `npm run typecheck` runs strict Nuxt/Vue TypeScript checks.
- `npm test` runs the Vitest suite once; `npm run test:watch` supports local iteration.
- `npm run build` produces the production application; `npm run generate` creates static output.
- `npm run verify` runs type checking, tests, and the production build. Run this before opening a pull request.

Use Node `24.20.0` from `.nvmrc` (the package requires Node `>=24.0.0`).

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF line endings, two-space indentation, final newlines, and no trailing whitespace. TypeScript is strict; preserve explicit types at public boundaries and handle unchecked indexed access. Match the existing style: single quotes, no semicolons, `PascalCase` for Vue components and scene classes, `camelCase` for functions and composables, and descriptive filenames such as `angularSize.ts`. There is no standalone lint or formatter command, so keep diffs consistent with nearby code.

## Testing Guidelines

Vitest runs in the Node environment and discovers `tests/**/*.test.ts`. Name tests after the behavior or module, and cover scientific calculations, preset contracts, formatters, and director logic with deterministic assertions. Coverage targets `src/perigee/math/` and `app/utils/`, but no minimum threshold is configured. Add regression tests whenever changing these contracts.

## Commit & Pull Request Guidelines

History currently contains one concise subject (`v1 implementation`). Use short, imperative commit subjects and keep each commit focused. Pull requests should explain user-visible and architectural effects, link relevant issues, include screenshots or recordings for visual changes, note scientific or asset-source changes, and confirm `npm run verify` passes.

## Styling

Stylesheets load in the order set by `nuxt.config.ts`, and that order is a contract, not a
preference: `tailwind-base.css` (preflight), `tokens.css`, `base.css`, `perigee.css`,
`animations.css`, `tailwind-utilities.css`. Preflight first so component rules override it;
utilities last so a class on a template always beats the component class beside it; and
`animations.css` after `perigee.css` because a transition class such as `.dock-enter-from` ties on
specificity with the component class it lands on and only wins by coming later — move it earlier and
every transition on a positioned element silently stops moving. `@nuxtjs/tailwindcss` runs with
`cssPath: false`, because the directives are split across `tailwind-base.css` and
`tailwind-utilities.css` and the module injects only one file.

Reach for a Tailwind utility before writing CSS. Layout, spacing, flex and grid, `uppercase`, font
weights, `cursor-*`, `pointer-events-*`, `object-cover`, `rounded-full`, `sr-only` and
`animate-spin` belong on the template. `perigee.css` is for what a utility cannot express without an
arbitrary value: `clamp()` layout, layered gradients and glass, `color-mix()`, `backdrop-filter`,
the measured sliding distance indicator, and font sizes — the type scale does not sit on Tailwind's
steps, and `text-*` would impose a line height the design never asked for.

Design tokens live in `assets/css/tokens.css` and are mirrored into `tailwind.config.ts` as
`var(...)` references. Add a token to both files or to neither. Because the colours resolve to
custom properties, the opacity modifier (`text-ink-primary/50`) does not work; pick a token that
already carries the alpha. The responsive variants are `lt-lg` (max 1100px), `lt-md` (max 900px) and
`lt-sm` (max 640px), matching the queries the layout was built against.

Animation stays in CSS, with no animation library: GSAP is for the Three.js scene, not the
interface. `@keyframes` belong in `assets/css/animations.css`, together with the Vue `<Transition>`
classes; `tailwind.config.ts` registers `animation` shorthands on top of them. The reduced-motion
block clamps `animation-duration` globally, so anything new must be CSS-driven or carry its own
`prefers-reduced-motion` guard.

Every state change needs a transition. Reuse a named one — `dock`, `hint`, `hazard`,
`encounter-title`, `collapse`, `fade`, `chrome` — before writing another. Two rules when adding one.
A horizontally centred element declares `--center-x: -50%` and writes
`transform: translateX(var(--center-x))`, because the transition classes compose their movement as
`translate(var(--center-x, 0), …)`; set the transform directly and the element loses its centring
and jumps sideways mid-transition. A block whose appearance changes the height of its neighbours
uses `collapse` rather than a fade — wrap it in `<div class="collapsible"><div>…</div></div>`, a
one-row grid animating between `0fr` and `1fr` — because fading alone leaves the layout snapping at
the end, which reads as no animation at all.

Every interactive element must have a visible hover and focus state. `base.css` supplies the default
for buttons and links on both `:hover` and `:focus-visible`; its specificity (0,3,1) is chosen so it
outranks a component's resting colour rule, and a component that wants a different hover matches the
same `button:not(:disabled):hover` shape. Any component rule that adds a `:hover` adds a
`:focus-visible` alongside it.

## UI, Assets & Configuration

Keep the experience cinematic and minimal: prioritize the current object, distance, and viewpoint; progressively disclose secondary controls. Preserve reduced-motion and keyboard behavior. Never commit `.env` files or generated `.nuxt/`, `.output/`, `dist`, or `coverage/` content. Record any new runtime asset license in `public/assets/ATTRIBUTIONS.md`.
