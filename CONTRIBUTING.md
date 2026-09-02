# Contributing to Perigee

Thanks for helping improve Perigee. Start with an issue for substantial changes so the direction can be agreed before implementation.

## Development workflow

1. Fork the repository and create a focused branch from `main`.
2. Install the locked dependency set with `npm ci`.
3. Make the smallest coherent change and add deterministic regression tests where relevant.
4. Run `npm run verify`.
5. Open a pull request using the repository template.

Pull requests must pass the required checks before they can be merged. Direct pushes and force pushes to `main` are blocked.

## Project expectations

- Preserve the cinematic, minimal interface and progressively disclose secondary controls.
- Keep scientific calculations and claims clearly separated from authored visual effects.
- Retain keyboard, focus, reduced-motion, and capability-fallback behavior.
- Include desktop and mobile evidence for visual changes.
- Record the source, licence, and any modifications for runtime assets in `public/assets/ATTRIBUTIONS.md`.
- Do not commit secrets, `.env` files, generated output, or dependency directories.

Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in a public issue.
