# Perigee product expansion plan

Status: living plan

Last updated: 2026-09-01

Scope: product depth, portfolio impact, audience growth, and selective educational value

## 1. Product decision

Perigee will remain a cinematic experience first. It will not become a general
planetarium, a catalogue-heavy astronomy reference, or a classroom product.

The next version should make visitors feel that they have entered a series of
impossible but visually honest cosmic encounters:

> Stand somewhere meaningful. Bring the universe close. Feel the scale, then
> understand one remarkable thing about what you saw.

The primary audience is:

- curious adults;
- children and families exploring together;
- visually driven casual visitors.

The primary product goal is a remarkable portfolio experience with a light,
credible educational layer. The first growth goal is to deepen the initial
visit beyond the present five-to-seven-minute exploration. The second is to
turn the most memorable views into an acquisition loop through sharing and
curated public pages.

## 2. Confirmed product choices

| Decision | Direction |
| --- | --- |
| Experience | Meditative and cinematic |
| Education | Optional, contextual, concise, and sourced |
| Play | Lightweight prediction and reveal moments; no game shell |
| Consequences | Introduce gradually and only when they clarify the current scene |
| Content operations | Mostly static, with optional monthly curation |
| First signature place | Cabo da Roca, Portugal |
| Accounts | Not required for the planned releases |
| Scientific boundary | Preserve visual science; label described effects that are not simulated |

## 3. Current product baseline

Perigee currently offers:

- eight celestial objects;
- five distance states per object;
- Rooftop, Hilltop, Lakeside, and Cabo da Roca viewpoints;
- exact apparent-angular-size calculation;
- free camera movement and cinematic transitions;
- four guided encounters with state-aware contextual discoveries;
- scene capture with native share, download, and copy-link fallbacks;
- shareable selection state in the URL, plus four prerendered curated
  encounter routes carrying their own titles and social cards;
- responsive, keyboard, reduced-motion, and WebGL fallback behavior.

The loop as it stood before Release 1 was:

1. Select an object.
2. Change its distance.
3. Change the viewpoint.
4. Repeat until the available combinations feel exhausted.

That loop created a strong first reaction but had no explicit sense of
progression, discovery, completion, preservation, or return. More objects alone
would have lengthened the same loop without changing it. Releases 0 to 2 were
scoped against that problem, and the loop now reads:

1. Arrive in free exploration, or open a curated encounter link directly.
2. Follow a guided encounter, or select an object, distance, and viewpoint.
3. Open the discovery attached to the current state.
4. Capture the view, share it, or return to free exploration.

Progression, discovery, and preservation are now present. Return is not:
nothing brings a visitor back beyond the link somebody sent them. That is the
gap Releases 3 and 4 address.

## 4. Product principles

### 4.1 Awe before explanation

Let the scene land emotionally before displaying educational material. No fact
panel should appear during the first cinematic beat of an encounter.

### 4.2 One meaningful idea at a time

Show the single observation that best explains the current object and distance.
Defer secondary information behind an explicit action.

### 4.3 Discovery, not instruction

Invite visitors to predict, manipulate, and reveal. Avoid quizzes, scores,
lessons, badges, streaks, and language that feels like school.

### 4.4 Honest simulation boundaries

Every piece of consequence copy must distinguish among:

- what Perigee renders;
- what Perigee calculates;
- what is described from an external scientific source but not simulated.

### 4.5 Curated breadth

Every new object and place must add a new visual or narrative experience. Do
not add catalogue entries merely to increase the count.

### 4.6 The sky stays dominant

New controls and content must remain transient. The resting state is always the
scene, not a dashboard, library, or article.

### 4.7 Family-readable, never childish

Primary copy should be understandable to an engaged child reading with an
adult. Deeper explanations may use precise terms, with plain-language context.

## 5. Target experience

The expanded journey should support four connected loops.

| Loop | Desired visitor response | Product mechanism |
| --- | --- | --- |
| Experience | “I saw something astonishing.” | Live scene and cinematic transition |
| Understand | “Now I understand why it looks that way.” | Contextual discovery and guided encounter |
| Preserve | “I want to keep or show this.” | Capture, share, and deep link |
| Return | “There is another encounter worth seeing.” | Curated monthly feature and later observatory log |

The free-exploration mode remains available at all times. Guided content is an
invitation, not a required onboarding funnel.

## 6. Core product additions

### 6.1 Guided Encounters

Guided Encounters are optional cinematic sequences lasting approximately 90
seconds to three minutes. They use the existing scene engine, objects,
distances, and viewpoints to create a question-and-reveal arc.

Each encounter contains:

1. A short question or invitation.
2. Three to five authored scene beats.
3. One observation or comparison per beat.
4. At most one physical-consequence reveal.
5. A quiet final view with replay, free-explore, and capture actions.

Interaction rules:

- The visitor can pause, skip a beat, exit, or take control at any time.
- Copy appears after the scene transition, never over the main reveal.
- Reduced-motion mode uses cuts or short fades without losing information.
- The sequence must not introduce a second permanent navigation system.
- Completion is meaningful but is not rewarded with points or badges.

Launch encounters:

#### Encounter A — Saturn at the Moon's distance

- Starts with Saturn at its real distance.
- Asks how large it would appear if it replaced the Moon.
- Moves to the Moon-swap state.
- Compares its apparent width with the familiar Moon.
- Ends in free exploration on the full Saturn view.

Purpose: clearest expression of Perigee's core promise using the strongest
existing visual.

#### Encounter B — When Betelgeuse takes the sky

- Starts with Betelgeuse as a point-like real-distance star.
- Crosses selected distance thresholds.
- Reveals the stellar surface and changing environmental light.
- Introduces one sourced survivability consequence at the closest state.

Purpose: strongest escalation, reveal, and emotional contrast.

#### Encounter C — The Moon approaches

- Begins with the familiar real Moon.
- Asks the visitor to predict how quickly it will grow.
- Demonstrates that apparent size changes nonlinearly with distance.
- Ends with a simple comparison between distance and angular size.

Purpose: family-friendly learning through a familiar object and lightweight
prediction.

### 6.2 Contextual Discoveries

A discovery is a single, state-aware observation attached to an object,
distance, encounter beat, or viewpoint. It is not a general fact carousel.

Examples:

- “Saturn now spans roughly N full Moons across your sky.”
- “Light from this distance would reach you in N seconds.”
- “At this apparent size, Jupiter's main cloud bands would be visible without a telescope.”
- “The view is rendered; the heat and tidal effects described here are not simulated.”

Information layers:

1. **Glance:** one sentence, no more than two lines at the target viewport.
2. **Discover:** a short explanation, comparison, or small visual.
3. **Source:** source name, URL, review date, and simulation-boundary note.

Content requirements:

- Every numeric claim has a source or deterministic calculation.
- Calculated values use the same object and distance definitions as the scene.
- Consequence copy is reviewed separately from display copy.
- Interesting-but-irrelevant facts do not appear in the live scene.
- A discovery may be withheld when the view itself is more powerful.

Initial content scope is limited to the three launch encounters and no more
than two optional discoveries for each existing object.

### 6.3 Cabo da Roca signature viewpoint

Cabo da Roca becomes Perigee's first named real-world observation site and the
visual centerpiece of the expansion.

Why it fits:

- an open Atlantic horizon leaves space for the celestial subject;
- cliffs around 140 metres above the sea provide dramatic scale;
- the lighthouse offers a recognizable human anchor;
- its identity as the westernmost point of mainland Europe supports a poetic
  “edge of the world” narrative;
- wind, mist, ocean reflection, and the lighthouse beam can deepen the scene
  without adding interface.

The first signature composition is provisionally titled:

> Saturn at the edge of the world

Visual requirements:

- Preserve the Atlantic horizon and cliff silhouette as secondary anchors.
- Use the lighthouse as a recognizable but non-dominant scale reference.
- Keep the foreground contemporary and believable rather than picturesque.
- Treat mist, moving cloud, ocean highlights, grass movement, and an optional
  lighthouse sweep as performance-budgeted atmosphere.
- Avoid tourism-poster saturation and excessive city-like lighting.
- Verify asset licensing and record every source in `public/assets/ATTRIBUTIONS.md`.

Before implementation, create and approve visual targets for:

1. the resting Cabo da Roca scene;
2. the Saturn signature reveal;
3. the encounter-copy state on top of that reveal.

The viewpoint should be named `Cabo da Roca` in the interface. Short narrative
copy may reference “where land ends and sea begins,” with clear cultural and
source attribution if the Camões wording is used directly.

### 6.4 Capture and share

Every completed encounter and freely composed view should offer a restrained
`Capture this sky` action.

First-release behavior:

- Capture a clean scene image without controls.
- Offer an optional restrained caption containing object, distance, and place.
- Include a small Perigee mark, never a large promotional watermark.
- Share the image and current deep link when native file sharing is supported.
- Fall back to image download and link copying.
- Preserve the current query-based object, distance, and viewpoint state.

Static-hosting constraint:

- Arbitrary user states will not receive dynamically generated social cards in
  the first release.
- Curated encounters receive pre-generated Open Graph images and stable routes.

Sharing must be a natural ending to a memorable view, not a modal interruption
or repeated prompt.

### 6.5 Lightweight prediction and reveal

Challenges are short questions embedded inside selected encounters:

- “Will Saturn look wider or narrower than the Moon?”
- “Which step will make Betelgeuse cover half the sky?”
- “If the Moon moves twice as close, does it look twice as wide?”

Rules:

- Answering is optional.
- The scene provides the reveal immediately.
- No scores, timers, failure states, leaderboards, or permanent challenge UI.
- Copy should encourage shared family discussion before tapping the answer.
- A wrong prediction should still feel like an interesting discovery.

### 6.6 Selective object expansion

Do not expand the object browser until Guided Encounters and Contextual
Discoveries work with the existing catalogue.

The first new object should introduce a different visual grammar. The current
recommendation is the Andromeda Galaxy because it expands Perigee beyond
spherical planets and stars while enabling a surprising real-angular-size
story. Before commitment, compare it with two alternatives:

- the Sun, as the familiar apparent-size and danger anchor;
- a comet, for motion and time-dependent form.

Selection gate:

- distinctive scene at both real and impossible distance;
- scientifically explainable visual model;
- high-quality and licensable source material;
- acceptable mobile and balanced-tier performance;
- at least one strong guided encounter unavailable with the existing objects.

Black holes and supernovae remain later candidates. Both promise substantial
wow value but require a higher scientific-art-direction burden than the first
expansion should carry.

### 6.7 Ambient sound, later and optional

An understated sound layer could materially deepen the portfolio experience:
Atlantic wind at Cabo da Roca, distant surf, subtle environmental transitions,
and restrained musical texture.

It is deferred until the encounter loop is validated. If introduced:

- start muted or only after explicit visitor interaction;
- provide a persistent mute control;
- never imply that space itself transmits the presented sound;
- preserve reduced-motion and sensory-comfort considerations;
- license and attribute every asset.

### 6.8 Observatory Log, later

A local, account-free Observatory Log may eventually preserve:

- completed encounters;
- favorite views;
- captured postcards;
- discoveries opened;
- monthly featured encounters visited.

This is not required to solve the first-visit problem and should follow the
sharing release. If implemented, it should look like a sparse field notebook,
not a gamified progress dashboard.

## 7. Release sequence

### Release 0 — Baseline and content foundation

Goal: make the expansion measurable and scientifically maintainable before
adding visible features.

#### R0.1 Editorial and source model

Dependencies: none

Tasks:

- Define typed records for encounters, beats, discoveries, sources, review
  dates, and simulation-boundary labels.
- Add deterministic helpers for comparison values such as Moon widths and
  light-travel time.
- Establish content review states: draft, scientifically checked, approved.
- Add regression tests for calculated copy inputs.

Acceptance:

- No launch discovery is stored as unstructured copy inside a Vue component.
- Every numeric or consequence claim can be traced to a calculation or source.
- Content can be extended without changing the Three.js scene API.

Excludes: content-management system, remote database, AI-generated live facts.

#### R0.2 Engagement event contract

Dependencies: none

Tasks:

- Define privacy-conscious events for first scene ready, first interaction,
  object change, distance change, viewpoint change, encounter start/beat/exit/
  complete, discovery open, capture, share attempt, and share completion.
- Separate active time from background-tab time.
- Add a provider-neutral analytics adapter; do not provision a vendor until an
  implementation decision explicitly selects one.
- Record no free-form personal data, precise location, or persistent identity.

Acceptance:

- Events and properties are documented and unit-testable.
- Analytics failure cannot block or delay the scene.
- Consent requirements are evaluated before a provider is enabled.
- A development mode can inspect events without sending them externally.

Excludes: dashboards, experimentation platform, accounts, personalization.

### Release 1 — Perigee Encounters

Goal: extend the first visit using the existing objects and viewpoints.

#### R1.1 Encounter interaction design

Dependencies: R0.1

Tasks:

- Produce three visual directions for encounter invitation, active beat, and
  final state using the existing Perigee visual system.
- Select one direction before implementation.
- Validate desktop and mobile composition, focus order, reduced motion, skip,
  exit, and return-to-free-explore behavior.

Acceptance:

- The selected target leaves the live sky visually dominant.
- A visitor can ignore the feature and use Perigee exactly as before.
- Copy remains legible without a permanent large panel.

#### R1.2 Encounter director

Dependencies: R1.1, R0.1

Tasks:

- Add a framework-independent encounter state machine.
- Reuse existing object, distance, viewpoint, and camera actions.
- Support pause, next, previous where appropriate, exit, replay, and completion.
- Protect against stale transitions and rapid visitor input.
- Expose semantic progress and status to assistive technology.

Acceptance:

- An encounter never duplicates scene math or asset-loading logic.
- Exiting restores a coherent free-exploration state.
- Direct links can open a named encounter at its first beat.
- Keyboard and reduced-motion paths complete all three encounters.

#### R1.3 Three launch encounters

Dependencies: R1.2

Tasks:

- Author and implement the Saturn, Betelgeuse, and Moon encounters.
- Add their minimum required discoveries and sources.
- Test every authored beat against the object preset contracts.
- Produce curated stable URLs and metadata for each encounter.

Acceptance:

- Each encounter has a distinct emotional and educational arc.
- Each completes in no more than three minutes without visitor detours.
- No beat displays more than one primary idea.
- Free exploration remains available after completion.

#### R1.4 Contextual discovery layer

Dependencies: R0.1, R1.1

Tasks:

- Add the glance, discover, and source disclosure levels.
- Surface only the discovery attached to the current state.
- Add optional non-encounter discoveries for existing objects.

Acceptance:

- Closing a discovery returns focus predictably.
- Long content does not cover the hero object at supported viewports.
- Source and simulation-boundary information is always reachable.
- No object has more than two optional free-explore discoveries at launch.

Release 1 success signal: visitors who start an encounter reach at least ten
minutes of engaged exploration at the median, without worsening first-frame or
interaction performance. This is a hypothesis to validate, not a launch claim.

### Release 2 — Cabo da Roca and sharing

Goal: create the portfolio-defining visual and turn it into an acquisition loop.

#### R2.1 Cabo da Roca visual research and target

Dependencies: R1.1 visual language

Tasks:

- Collect authoritative geographic, architectural, and cultural references.
- Decide the exact viewpoint, horizon bearing, time of night, weather, and
  lighthouse visibility.
- Resolve the asset-production and licensing approach.
- Produce and select the three required visual targets.

Acceptance:

- Cabo da Roca is identifiable without a label.
- The result still reads as Perigee rather than a travel advertisement.
- The intended camera and crop work at desktop and mobile aspect ratios.
- Licensing and attribution paths are known before runtime assets are made.

#### R2.2 Cabo da Roca runtime viewpoint

Dependencies: R2.1

Tasks:

- Add the viewpoint data, environment asset, transitions, and quality hooks.
- Add performance-budgeted atmosphere and optional lighthouse motion.
- Create `Saturn at the edge of the world` as its signature encounter.
- Preserve URL restoration and fallback behavior.

Acceptance:

- The new viewpoint meets existing quality tiers and memory budgets.
- No visible plate boundary, stretched landmark, or implausible parallax occurs.
- The lighthouse and cliffs remain subordinate to the celestial subject.
- Attribution is complete.

#### R2.3 Capture and share

Dependencies: R1.3; R2.2 for the signature launch campaign

Tasks:

- Add clean scene capture with optional caption treatment.
- Add native file/link sharing with download and copy fallbacks.
- Add pre-generated social images for curated encounter routes.
- Verify that shared URLs restore the intended view.

Acceptance:

- Captures exclude controls, focus rings, notices, and loading states.
- Exported images preserve the rendered aspect ratio and visual quality.
- Sharing works on at least one supported desktop and one supported mobile path;
  fallbacks work everywhere else.
- Share cancellation is not presented as an error.

Release 2 success signals:

- share attempts and completions are observable;
- incoming visitors from curated shared links reach the intended scene;
- Cabo da Roca becomes the lead visual in portfolio and launch material.

### Release 3 — Selective expansion

Goal: add replay value only after the deeper loop is proven.

#### R3.1 Prediction and reveal beats

Dependencies: R1.2

Tasks:

- Add one optional prediction to each launch encounter.
- Test family-readable phrasing and immediate visual reveal.
- Compare encounter completion and exits with and without the prompt.

Acceptance:

- Predictions add no score, timer, failure state, or permanent UI.
- Skipping never blocks the encounter.
- Incorrect answers receive a neutral, curiosity-supporting response.

#### R3.2 First new object class

Dependencies: R1 metrics and concept-selection gate

Tasks:

- Prototype Andromeda, the Sun, and a comet at comparable fidelity.
- Select one using distinctiveness, science confidence, performance, licensing,
  and narrative value.
- Add one guided encounter before exposing it in free exploration.

Acceptance:

- The selected object adds a visual behavior absent from the current catalogue.
- Its real-distance state and impossible-distance states remain intelligible.
- Scientific and rendering assumptions are documented and tested.

#### R3.3 Monthly featured encounter

Dependencies: stable encounter content model and curated routes

Tasks:

- Add a single unobtrusive monthly feature entry point.
- Reuse existing objects, places, and encounter beats wherever possible.
- Archive previous features as a small curated collection.
- Define a manual editorial checklist and preview process.

Acceptance:

- Missing a month does not leave broken or falsely fresh content.
- Archive size does not turn the primary controls into a content browser.
- Every feature has reviewed copy, sources, metadata, and a share image.

### Release 4 — Return value, only if justified

Goal: support repeat visits without introducing accounts or obligation.

#### R4.1 Local Observatory Log

Dependencies: evidence of repeat or save intent from Releases 1–3

Tasks:

- Save encounter completion, favorites, and captures locally.
- Provide clear reset/export behavior.
- Design the log as a secondary, dismissible surface.

Acceptance:

- Perigee remains fully useful when storage is unavailable or cleared.
- No login or cloud synchronization is required.
- The log does not expose scores, streaks, or completion pressure.

Decision gate: do not build Release 4 unless sharing, repeat visits, or direct
visitor feedback shows a real desire to preserve progress.

## 8. Distribution and marketing plan

### 8.1 Product-led sharing

- Lead launch material with the Cabo da Roca signature view.
- End curated encounters with capture/share, never with a generic signup.
- Preserve deep links so a recipient lands in the shared state.
- Use concise captions built around a question: “What if Saturn rose over Cabo
  da Roca at the Moon's distance?”

### 8.2 Curated search pages

Create a small number of indexable encounter pages with original interactive
value, reviewed copy, sources, and clear titles:

- Saturn at the Moon's distance;
- What Betelgeuse would look like close to Earth;
- Why the Moon grows so quickly as it approaches;
- Saturn over Cabo da Roca.

Do not generate hundreds of thin object-distance-location combinations.

### 8.3 Portfolio presentation

The portfolio story should demonstrate:

- the emotional premise;
- exact apparent-size geometry;
- cinematic art direction and performant Three.js rendering;
- family-readable interaction design;
- Cabo da Roca visual development;
- the capture/share growth loop.

### 8.4 Monthly content

Monthly curation may respond to a relevant astronomical or cultural moment, but
Perigee does not need live ephemeris data or daily publishing. A missed month is
preferable to a weak encounter.

### 8.5 Later distribution options

Only after the public encounter pages are stable, evaluate:

- lightweight embeds for articles and personal sites;
- partnerships with science and design publications;
- museum-display or exhibition mode;
- downloadable high-resolution encounter stills.

Teacher tools, lesson plans, accounts, social feeds, and a general astronomy
news section are outside the current strategy.

## 9. Measurement

### North-star measure

**Meaningful encounters completed per engaged visit.**

An encounter is meaningful when the visitor reaches its final authored beat;
passive time on the page does not count.

### Supporting measures

- scene-ready to first meaningful interaction;
- engaged time, excluding hidden tabs and long inactivity;
- distinct objects, distances, viewpoints, and encounters explored;
- encounter start, completion, replay, skip, and exit rates;
- discovery open and source-view rates;
- prediction answer rate and option split, against encounter completion;
- capture and share attempts/completions;
- visits arriving through shared or curated encounter links;
- return within 30 days, as a secondary measure when the selected privacy model
  can support it without collecting personal data.

### Provisional product hypotheses

- Visitors who start a Guided Encounter reach at least ten minutes of median
  engaged time.
- At least half of started launch encounters reach their final beat.
- Capture/share becomes the most common intentional action after encounter
  completion.

These are hypotheses. Establish a baseline before treating them as targets, and
do not optimize session length by adding friction or mandatory content.

## 10. Quality guardrails

Every release must preserve:

- exact apparent-size calculations;
- current scene quality and supported performance tiers;
- lazy loading and responsive WebGL behavior;
- keyboard access and visible focus;
- reduced-motion equivalents;
- readable mobile composition;
- failure recovery for assets and capabilities;
- source and license records for new runtime assets;
- the minimal resting interface.

Relevant verification should include:

- unit tests for content contracts, calculations, and encounter direction;
- `npm run verify` for implementation chunks;
- desktop and mobile browser checks for every authored encounter beat;
- reduced-motion and keyboard-only completion;
- capture/share fallback checks;
- visual comparison against approved targets;
- performance comparison with the current production baseline.

## 11. Explicit non-goals

The current roadmap does not include:

- a complete Solar System or star catalogue;
- telescope planning or real-time night-sky guidance;
- accurate gravity, tides, climate, or orbital simulation;
- accounts, cloud saves, or social profiles;
- points, streaks, badges, leaderboards, or competitive play;
- daily publishing;
- a large CMS or backend;
- teacher dashboards, curricula, or assessment;
- dynamically generated SEO pages for every possible combination;
- VR, multiplayer, or free flight through space.

## 12. Decision gates

| Gate | Status | Decision | Evidence required or completed |
| --- | --- | --- | --- |
| G1 | Passed | Encounter UI direction | Three visual targets reviewed; Direction B, `Celestial Cut`, selected and verified in the live scene at desktop and 390 × 844 |
| G2 | Passed | Analytics provider | Umami selected and implemented. It was the only candidate offering custom event properties on a free tier, which every event in the R0.2 contract requires. It sets no cookie and no persistent identifier, so the consent requirement is met without a banner, and the MIT self-hosted path preserves data ownership. Plausible gates properties behind its Business tier, Cloudflare Web Analytics has no custom events at all, Fathom has neither a free tier nor custom dimensions, and PostHog needs a consent banner by default |
| G3 | Passed | Cabo production approach | Option 1 and its four final targets approved; exact camera, licensed source, landscape/portrait plate strategy, and performance estimate documented in `docs/design/cabo-da-roca/` |
| G4 | Passed | First new object class | Andromeda's realistic visible-light direction was approved after live review. The procedural galaxy, quality tiers, 390 x 844 composition, object-browser exposure, four-beat guided encounter, curated route, source disclosure, final free-exploration handoff, and social card are verified; assumptions are documented in `docs/design/andromeda/` |
| G5 | Deferred | Observatory Log | Observed repeat/save intent or direct visitor evidence |
| G6 | Deferred | Sound layer | Demonstrated improvement to the encounter without sensory or performance harm |

## 13. Recommended next implementation chunk

No unconditional product implementation chunk remains. Release 0, Release 1,
Release 2, and Release 3 are complete in the local working tree.

G2 is now decided and implemented, so production measurement is live. The
remaining actions are evidence-gated: operate the manual monthly curation
process, and revisit R4.1 only if G5 receives evidence of real save or return
intent. G6 stays deferred until the encounter loop justifies a sound layer.

## 14. Research basis

- Science-museum visitor research found engagement, awe, appreciation of
  beauty, and reflection to be defining dimensions, with awe an important
  precursor to learning and wellbeing outcomes:
  <https://onlinelibrary.wiley.com/doi/full/10.1111/cura.70048>
- Research on gamification reports mixed effects and supports designing for
  autonomy, competence, and relatedness rather than relying on points and
  rewards:
  <https://link.springer.com/article/10.1007/s11423-023-10337-7>
- SpaceEngine demonstrates the breadth end of the category through catalogues,
  free movement, time control, saved locations, and a built-in wiki:
  <https://spaceengine.org/>
- NASA Eyes demonstrates the live-data end through time-based Solar System,
  asteroid, Earth, and exoplanet exploration:
  <https://www.nasa.gov/interactives/>
- Google recommends useful, original, people-first content rather than large
  volumes of search-first pages:
  <https://developers.google.com/search/docs/fundamentals/creating-helpful-content>
- The Web Share API supports sharing links and supported files through native
  share targets, with capability detection required:
  <https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API>
- Turismo de Portugal describes Cabo da Roca as the westernmost point of
  mainland Europe, around 140 metres above the sea, with panoramic coast and
  Sintra views:
  <https://www.visitportugal.com/en/content/cabo-da-roca>
- Parques de Sintra documents the lighthouse, Atlantic setting, operating
  history, and cultural significance:
  <https://www.parquesdesintra.pt/en/parks-monuments/cabo-da-roca-lighthouse/>

## 15. Completion record

Update this section when a release chunk is completed.

| Chunk | Status | Completion evidence | Commit |
| --- | --- | --- | --- |
| R0.1 | Complete | Typed editorial/source contracts and deterministic science helpers; included in the verified 29-test production suite | Local working tree |
| R0.2 | Complete | Provider-neutral typed events, active-time clock, in-memory inspection, failure isolation, and tests | Local working tree |
| R1.1 | Complete | Direction B selected; invitation, active beat, completion, desktop and 390 × 844 compositions verified with no horizontal overflow | Local working tree |
| R1.2 | Complete | Framework-independent director with pause, previous, next, exit, replay, completion, stale-transition protection, semantic progress, keyboard exit, and direct links | Local working tree |
| R1.3 | Complete | Saturn, Betelgeuse, and Moon encounters completed end to end; Saturn now uses a tracked locator and a verified real → close → Moon-swap reveal; reviewed sources, stable query URLs, reactive metadata, and preset-contract tests verified | Local working tree |
| R1.4 | Complete | State-aware glance, detail, source, and simulation-boundary disclosures in encounters and free exploration, with predictable close focus | Local working tree |
| R2.1 | Complete | Option 1 approved; resting, silent reveal, encounter-copy, and mobile-crop targets plus camera, licensing, and performance decisions documented in `docs/design/cabo-da-roca/` | Local working tree |
| R2.2 | Complete | Responsive Cabo landscape/portrait plates selected by quality tier; signature Saturn encounter, camera framing, URL restoration and invalid-view fallback, attribution, desktop/mobile target comparisons, and the verified 33-test production build | Local working tree |
| R2.3 | Complete | Clean scene capture with optional caption, native share with download and copy fallbacks, cancellation reported separately from failure; pre-generated 1200 × 630 social cards for all four curated routes; curated routes corrected to real prerendered HTML after a global `ssr: false` was found to override the route rule, verified in the generated static build (title, description, Open Graph image, crawler fallback body, and a shared link opening its encounter at beat 1); verified 45-test production build | Local working tree |
| R3.1 | Complete | One optional prediction on each of the three launch encounters (Saturn rooftop, Betelgeuse, Moon); the Cabo signature stays clean. Answering records the choice and runs the next beat, so the scene is the reveal; the answered option's neutral response opens the following beat. No score, timer, failure state, or permanent surface, and the beat's own action remains the skip path. Prediction contract test added; verified 46-test production build and the Saturn encounter checked in the live scene | Local working tree |
| R3.2 | Complete | Approved realistic Andromeda renderer with M31 photometry, optical D25 silhouette, scale-aware detail, Local-Group ladder, two sourced discoveries, synchronized thumbnail, and mobile-safe object-browser exposure. `The galaxy hiding in our sky` adds a four-beat real → 500 kly → 250 kly → 150 kly reveal at Hilltop, a stable curated route and 1200 × 630 social card, a clear simulation boundary, and a final free-exploration handoff. Desktop and 390 × 844 keyboard paths, balanced/safe tiers, route restoration, disclosure, and the verified 50-test production build pass | Local working tree |
| R3.3 | Complete | One quiet date-aware feature entry point beside the wordmark; September 2026 opens the approved Andromeda encounter and the collapsed archive retains August's Cabo encounter. Exact UTC-month matching prevents stale content from appearing current; every feature references an approved curated route and existing social card. Escape/outside dismissal, focus restoration, analytics events, the manual editorial checklist, 1440 × 900 and 390 × 844 composition and handoff checks, no-overflow/no-browser-error checks, and the verified 54-test production build pass | `0475404` |
| G2 | Complete | Umami wired through the existing provider-neutral adapter. The provider attaches after the deferred script loads and replays the events already buffered, so `scene_ready` survives a late script; active time is bucketed because Umami bills each stored property as an event and groups its dashboard by exact value. Measurement is opt-in per environment, so development, tests and preview builds make no third-party call, and `createAnalytics` now also contains a tracker that throws synchronously. Verified in a real build: the website id reaches the client config and the absolute Open Graph URLs resolve against the production domain. 59-test suite passes | `36c60fa` |
| Deploy | Complete | `perigee.observer` registered; Cloudflare Workers Static Assets configured with no `main` entry, the existing `public/_headers` cache rules preserved, and `not_found_handling` left at its default so an unknown encounter slug returns a real 404 rather than a soft 404 | `36c60fa` |
| R4.1 | Deferred | Requires evidence at G5 | — |
