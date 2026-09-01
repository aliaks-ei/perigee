# Monthly featured encounters

The monthly feature is a manually curated doorway into an existing approved
encounter. It does not create a second encounter catalogue or publish a stale
entry as if it were current.

## Editorial checklist

1. Choose one approved encounter whose scene, copy, discoveries, and sources
   have already passed live review.
2. Add one record to `featuredEncounters` in `app/data/editorial.ts` with a
   unique ID and UTC `YYYY-MM` month. There may be only one record per month.
3. Keep `shortTitle` useful at 390 px and keep `summary` to one sentence. Do not
   add a fact that is absent from the reviewed encounter content.
4. Confirm the referenced `/e/<slug>` route is prerendered and its 1200 x 630
   social image exists in `public/assets/encounters/`.
5. Run `npm run verify`.
6. Preview the closed entry point, open feature, archive, Escape close, and
   encounter handoff at 1440 x 900 and 390 x 844. Repeat with reduced motion.
7. Check keyboard order, visible focus, exact viewport/document widths, browser
   errors, and that the live sky remains the dominant visual.

## Missing-month behavior

The current feature uses an exact UTC month match. If no approved entry exists
for the month, the interface says `Featured skies` and exposes only the past
archive. It never carries the most recent record forward under `This month`.

## September 2026 preview

- Current: `The galaxy hiding in our sky`.
- Archive: `Saturn at the edge of the world` from August 2026.
- Current and archived selections open the existing encounter invitation; they
  do not duplicate encounter state, metadata, sources, or share assets.
