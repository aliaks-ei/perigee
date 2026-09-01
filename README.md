# Perigee

Perigee is a cinematic desktop sky simulator. Choose a viewpoint, bring a
planet or famous star impossibly close, and see its apparent size calculated
from real geometry rather than hand-tuned for the frame.

The experience combines a live Three.js scene with a minimal Nuxt interface.
Rooftop, Hilltop, Lakeside, and Cabo da Roca viewpoints each respond to the
selected object; planetary surfaces use attributed source maps, stars use
procedural shaders, and absurd scenarios stay explicit about their
consequences.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Nuxt. Perigee targets desktop browsers with
WebGL2 at 1280 × 720 and larger.

## Quality checks

```bash
npm run verify
```

This runs strict Nuxt type checking, unit tests for scientific/display
contracts, and the production build.

## Architecture

- Nuxt 3 SPA shell with semantic Vue controls
- Framework-independent scene engine under `src/perigee/`
- Layered sky and ground scenes in raw Three.js
- GSAP choreography with reduced-motion fallbacks
- Object-appropriate distance ladders with exact angular-size math
- Static output suitable for CDN hosting

The next product direction, release sequence, decision gates, and scientific
content rules live in [`product-expansion-plan.md`](product-expansion-plan.md).
Runtime asset licensing is recorded in `public/assets/ATTRIBUTIONS.md`.

## License

Source code is available under the MIT License. Runtime texture assets retain
their CC BY 4.0 attribution and are not relicensed by this repository.
