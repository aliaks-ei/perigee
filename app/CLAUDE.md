Loaded when Claude reads files under `app/`. The root `CLAUDE.md` carries the commands, the
layer boundary and the cross-layer contracts.

## Styling

Six stylesheets, loaded in the order set by `nuxt.config.ts`. **The order is a contract, not a
preference.**

| # | File | Holds |
| --- | --- | --- |
| 1 | `tailwind-base.css` | `@tailwind base` and `@tailwind components` |
| 2 | `tokens.css` | Every design token as a custom property on `:root` |
| 3 | `base.css` | Element defaults, the focus ring, the shared hover, link styling |
| 4 | `perigee.css` | Component rules |
| 5 | `animations.css` | Every `@keyframes` and every Vue `<Transition>` class |
| 6 | `tailwind-utilities.css` | `@tailwind utilities` |

Preflight first, so component rules override it. **`animations.css` must stay after `perigee.css`:**
a transition class such as `.dock-enter-from` ties on specificity with the component class it lands
on (`.control-panel`), so it only wins by coming later. Put it earlier and every transition on a
positioned element silently stops moving — the classes are applied, the computed style never
changes, and nothing looks broken in the markup. Utilities last, so a class in a template always
beats the component class beside it. `@nuxtjs/tailwindcss` runs with `cssPath: false` because it
injects only one file and the directives are split across two.

**Reach for a Tailwind utility first.** Layout, spacing, flex and grid, `uppercase`, font weights,
`cursor-*`, `pointer-events-*`, `object-cover`, `rounded-full`, `sr-only`, `animate-spin` all belong
on the template. If a rule in `perigee.css` starts with `display: flex`, it is in the wrong place.

**What stays in CSS**: the `clamp()` layout, layered gradients and glass, `color-mix()`,
`backdrop-filter`, the measured sliding indicator, and font sizes. Font size is deliberate — the
type scale does not sit on Tailwind's steps, and `text-xs` would also impose a `line-height` the
design never asked for. Do not convert it with arbitrary values.
**A label a viewer reads is at least 11px.** The dense control labels that drop to 10px
(`.more-label`, `.locator-label`, `.stepper-position`) are the exception, not the pattern. Set every
label in `--ink-label` or brighter; the 34% `--ink-quiet` is decoration only, because it vanishes
over a bright sky.

**Tokens are mirrored, not duplicated.** `tokens.css` holds the values; `tailwind.config.ts` maps
them to utilities as `var(...)` references. Two consequences: the opacity modifier
(`text-ink-primary/50`) does not work, so use a token that already carries the alpha; and
`--accent-object`, which `app.vue` rewrites per object, re-tints every `accent` utility for free.
`borderRadius`, `transitionDuration` and `transitionTimingFunction` deliberately shadow the stock
Tailwind scales. Add a new token to both files or to neither.

**Breakpoints.** The layout was built against max-width queries, registered as `lt-lg` (1100px),
`lt-md` (900px) and `lt-sm` (640px). Use those variants on templates; the `@media` blocks in
`perigee.css` are for the clamp geometry and the type scale only.

**Animation stays in CSS.** No animation library — GSAP is for the 3D scene, not the interface. The
`@keyframes` live in `animations.css` because three of them are driven by an ancestor state class
(`.scene-ready`) and Tailwind only emits keyframes an `animate-*` utility names; the config
registers the shorthands on top. The reduced-motion block clamps `animation-duration` globally, so a
new animation must be CSS-driven or carry its own `prefers-reduced-motion` guard.

**Every state change needs a transition.** The named ones, all defined in `animations.css`:

| Name | For |
| --- | --- |
| `dock` | The control panel above the rail |
| `hint` | Small notices that fade up in place — the drag hint, the scene notice |
| `hazard` | Same shape, kept for notices that do not change the layout |
| `encounter-title` | Encounter beat copy and the discovery aside |
| `collapse` | A block that has to take its height with it |
| `fade` | Full-bleed overlays — loading, capability fallback |
| `chrome` | The idle interface stepping aside for a guided encounter |

Three rules when adding one:

- **A centred element declares `--center-x: -50%` and writes `transform: translateX(var(--center-x))`.**
  The transition classes compose their movement as `translate(var(--center-x, 0), …)`. Set the
  transform directly and the element loses its centring the moment the transition starts, so it
  jumps sideways while it moves.
- **A block whose appearance changes the height of its neighbours uses `collapse`, not a fade.**
  Wrap it in `<div class="collapsible"><div>…</div></div>`; the shell is a one-row grid animating
  between `0fr` and `1fr`, and the inner element clips so the content's own margin collapses with
  it. Fading alone leaves the layout snapping at the end of the transition, which reads as no
  animation at all. The volume row in `AmbientSoundControl.vue` is the reference.
- **Nothing moves under the cursor.** `ObjectIdentity.vue` is anchored to its bottom edge, so
  everything that can appear later (metadata, the action, the hazard line) has a slot with a
  `min-height` from the first frame and fades into it. Content that needs more room than a slot
  (the discovery note, the capture card, tonight's sky) opens as its own layer, never inside the
  stack.

## Staged disclosure

The interface arrives in four stages, `arrive → orient → explore → deepen`, defined in
`utils/disclosureStages.ts` and driven by `usePerigee` (`stage`, `revealed(stage)`,
`chromeIdle`). A stage is unlocked by what the viewer does (look, change the view, change it
again) with a time fallback for a passive viewer; a shared link or a curated route starts at
`explore`. The ladder only climbs. Gate a new control on the stage it belongs to:

| Stage | Shows |
| --- | --- |
| `arrive` | Scene, brand, object name. The drag hint after 2 s. |
| `orient` | Metadata line, the pill with the ladder dots, the "step the distance" hint. |
| `explore` | Discovery note trigger, hazard line, landscape chooser and pill segment. |
| `deepen` | Encounter card, the "more" control, tonight's sky card, idle fade after 6 s. |

Every function that is not the sky lives behind the "more" control at the bottom right
(`MoreSheet.vue`): sound, capture, featured skies, shortcuts, credits. A new secondary feature
goes there, not into a new corner.

**Every interactive element needs a visible hover and focus state.** `base.css` gives every
non-disabled button a colour lift and every link an underline treatment, both on `:hover` and
`:focus-visible`. That shared rule is specificity (0,3,1) on purpose, so it outranks the component
rule setting a button's resting colour — a component that needs a different hover must match the
same `button:not(:disabled):hover` shape to win on source order. When a component rule adds a
`:hover`, it adds `:focus-visible` alongside it. An element already at full ink needs another
affordance: see `.brand-word`, which uses opacity.

## Notes

- Component-level styles live in `assets/css/perigee.css`, not in SFC `<style>` blocks.
- `backdrop-filter` blurs composite over a canvas that repaints every frame, so their radius is a
  per-frame cost. Keep them small.
