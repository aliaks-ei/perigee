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

## Object pages

`app/data/objectEditorial.ts` holds the prose for the indexable object pages at
`/o/<id>`. One record per object, with the same review states.

The gate is the review state. `indexableRoutes` in `app/utils/seo.ts` skips any
record that is not `approved`, so it is neither prerendered nor listed in the
sitemap, and `app/pages/o/[object].vue` returns a 404 on the same condition.
Unreviewed copy therefore cannot ship, and promoting a record is the act that
publishes the page.

Three rules specific to these records:

- **No numbers in the copy.** Every figure an object page shows is derived at
  render time from `app/data/objects.ts`. A number typed into `summary` or
  `whatYouSee` drifts the moment a preset changes. `tests/seo.test.ts` fails on
  any digit in the prose.
- **`questions` are the page's `h2` headings, and they are the search queries.**
  Write the sentence a person would actually type, not a label. They are
  authored rather than derived because "How big would Moon look at familiar
  distance?" is not a question anybody asks.
- **`subject` is the object's name inside a sentence** — "the Moon", "Mars",
  "the Andromeda Galaxy". The page uses it in running prose, so it needs its
  article.

Before promoting a record to `approved`:

1. Open every source URL and record the review date.
2. Check the rendered figures against the live scene at each of the five rungs.
3. Add the 1200x630 social card at `public/assets/objects/social/<id>.jpg`;
   `tests/seo.test.ts` requires one for every approved object.
4. Run `npm run verify`.

## Adding content

1. Add or reuse a source record and review date.
2. Add the discovery with the narrowest useful scope.
3. Attach it to at most one authored beat unless reuse is intentional.
4. Run `npm test` and `npm run typecheck`.
5. Review the final line at desktop and mobile widths before approval.
