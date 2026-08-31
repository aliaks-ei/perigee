# Editorial and science content

Perigee keeps educational content in `app/data/editorial.ts`. Vue components may
resolve and display these records, but should not contain launch facts or
consequence claims directly.

## Review states

- `draft`: authored but not ready to publish;
- `scientifically-checked`: calculations, wording, and sources have been checked;
- `approved`: ready for the public encounter.

Promote a record only after checking every referenced preset against
`app/data/objects.ts`, opening every source URL, and recording the review date.
Physical-consequence wording needs its own record and review; do not hide it in
an encounter observation.

## Simulation boundaries

- `rendered`: an authored visual treatment produced by the scene;
- `calculated`: a deterministic value using the same object and distance data as
  the scene;
- `described-not-simulated`: a sourced physical effect that Perigee does not
  model.

The discovery source disclosure must show this label in plain language.

## Calculated copy

Calculated discoveries use one `{{value}}` token and a typed calculation. Add
new deterministic calculations to `app/utils/discoveryCalculations.ts` with
regression tests. Do not paste a precomputed number into display copy.

The current reference constants are:

- speed of light: exactly 299,792.458 km/s, sourced to BIPM;
- astronomical unit: exactly 149,597,870.7 km, sourced to IAU Resolution B2;
- familiar Moon comparison distance: 384,400 km.

## Adding content

1. Add or reuse a source record and review date.
2. Add the discovery with the narrowest useful scope.
3. Attach it to at most one authored beat unless reuse is intentional.
4. Run `npm test` and `npm run typecheck`.
5. Review the final line at desktop and mobile widths before approval.
