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

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF line endings, two-space indentation, final newlines, and no trailing whitespace. TypeScript is strict; preserve explicit types at public boundaries and handle unchecked indexed access. Match the existing style: single quotes, no semicolons, `PascalCase` for Vue components and scene classes, `camelCase` for functions and composables, and descriptive filenames such as `angularSize.ts`. There is no standalone lint or formatter command, so keep diffs consistent with nearby code.

## Testing Guidelines

Vitest runs in the Node environment and discovers `tests/**/*.test.ts`. Name tests after the behavior or module, and cover scientific calculations, preset contracts, formatters, and director logic with deterministic assertions. Coverage targets `src/perigee/math/` and `app/utils/`, but no minimum threshold is configured. Add regression tests whenever changing these contracts.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects and keep each commit focused; recent history uses Conventional Commit prefixes (`feat:`, `fix:`). Pull requests should explain user-visible and architectural effects, link relevant issues, include screenshots or recordings for visual changes, note scientific or asset-source changes, and confirm `npm run verify` passes.

## Styling

The stylesheet order, the Tailwind-first rule, the token mirroring, the breakpoints, the named
transitions and the hover/focus contract live in `app/CLAUDE.md`, "Styling". That file holds the
single copy; read it before touching `assets/css/` or a component template.

## UI, Assets & Configuration

Keep the experience cinematic and minimal: prioritize the current object, distance, and viewpoint; progressively disclose secondary controls. Preserve reduced-motion and keyboard behavior. Never commit `.env` files or generated `.nuxt/`, `.output/`, `dist`, or `coverage/` content. Record any new runtime asset license in `public/assets/ATTRIBUTIONS.md`.
