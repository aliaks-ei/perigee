# Ambient sound: approved production direction

Status: approved direction, ready for implementation

Gate: G6, sound layer

Decision date: 2026-09-02

Expansion decision: 2026-09-02

Cosmic direction: 2026-09-02. The environmental layers alone read as a field
recording, not as Perigee. A calm cosmic layer now leads the mix and wind and
surf sit under it. Everything below still holds except where this document
says otherwise.

After the Cabo study, the product direction expanded to all four viewpoints.
Each scene has its own calm environment and transitions smoothly to the next;
there is no app-wide music bed. Explicit visitor activation, mute, volume,
lifecycle, privacy, performance, and sensory-comfort requirements remain
unchanged.

## Decision

Perigee will use a zero-cost, first-party ambient sound engine built with the
native Web Audio API. The first implementation will generate its wind, distant
surf, and restrained tonal field procedurally in the browser. It will make no
third-party request and will require no account, subscription, or external
player.

If the procedural surf does not sound credible after review on phone, laptop,
and headphones, the engine may add exactly one locally hosted natural surf
recording beneath the generated layers. That recording must be CC0 or covered
by a free licence that explicitly permits website and app use, modification,
and embedding. Freesound CC0 is preferred; ZapSplat's attributed free licence
is the fallback. Stock music is not part of this direction.

Spotify is rejected as a delivery mechanism. Its Web Playback SDK would
require visitors to authenticate and hold Premium accounts, and Spotify's
developer policy prohibits synchronizing Spotify recordings with visual media
and mixing them with other audio. A personal Premium account may be used only
for private reference listening.

## Product intent

Sound should deepen the feeling of standing at a terrestrial threshold while
looking into an impossible sky. It supports the cinematic scene but never
becomes a separate player, soundtrack, or required interaction.

The first target is Cabo da Roca:

- Atlantic wind is the dominant environmental layer.
- Distant surf supplies slow physical scale beneath it.
- A calm cosmic layer supplies Perigee's authored identity and leads the mix.
- The result is musical but never a song: no melody, beat, chord progression,
  or dramatic synchronization to encounter steps. One static tonal centre,
  open intervals, and voices that never repeat their arrangement.

The approved starting preset is **cinematic-natural**. It should feel more
authored than a raw field recording and more credible than a fully synthetic
sound effect.

## Experience contract

### First visit

- Sound is off.
- No audio asset is fetched and no `AudioContext` is created during initial
  scene loading.
- One quiet, persistent sound control is visible once the normal scene chrome
  is available.
- Only activating that control may create or resume the audio context.
- An unrelated object, distance, viewpoint, or encounter interaction never
  implies permission to play sound.

### Sound enabled

- Audio fades in over 1.5 seconds.
- The control remains available in free exploration and guided encounters.
- The active state survives internal Nuxt navigation and encounter entry/exit
  without restarting or creating overlapping audio graphs.
- Viewpoint changes smoothly transition between rooftop, hilltop, lakeside,
  and Cabo da Roca ambience without restarting the cosmic theme or audio graph.
- The rooftop suggests distant city air, the hilltop open meadow wind, the
  lakeside quiet shore water, and Cabo Atlantic wind and distant surf.

### Sound disabled

- Audio fades out over 300 milliseconds and then suspends the context.
- The control changes state immediately; the fade is an audio transition, not
  delayed UI feedback.
- Muting stops every generated and recorded layer together.

### Returning visit

- The preference is stored locally as `perigee:ambient-sound` with values
  `on` or `off`.
- A stored `off` preference stays off.
- A stored `on` preference may present the control as previously enabled, but
  audible playback still waits for a fresh user activation when required by
  the browser. The UI must not claim that sound is playing while the context
  is suspended or playback was rejected.
- No sound preference is sent to a server or attached to an identity.

### Page lifecycle

- On `document.visibilityState === 'hidden'`, suspend the audio context and
  record whether playback was active.
- On return to `visible`, resume only when the visitor had enabled sound and
  browser policy permits it.
- Page unload, Nuxt teardown, and fatal-error handling dispose sources and
  timers cleanly.
- Audio failure is isolated: construction, resume, scheduling, and asset-load
  errors must never delay the Three.js scene or break an encounter.

## Interface direction

The sound control is a small piece of persistent scene chrome, not a media
player.

- Use a native `button` with `aria-pressed`.
- The accessible name is state-specific: `Turn ambient sound on` or
  `Turn ambient sound off`.
- The visible treatment may use the existing restrained icon language, but an
  icon is never the only programmatic label.
- Reuse the existing hover and `:focus-visible` behavior in `base.css`.
- Preserve the project's mobile action-size standard.
- Every visual state change uses an existing `chrome` or `fade` transition.
- The persistent surface exposes only on/off. A volume control is progressively
  disclosed from the sound control and is not permanently added to the main
  dock.

The volume control is a labelled native range input. Its exact resting value
is tuned during the three-preset review; the initial engineering default is
35 percent. Mute and volume are independent: restoring sound returns to the
last non-zero volume.

## Accessibility and sensory comfort

Perigee exceeds WCAG 2.2 Success Criterion 1.4.2 by never starting audible
sound automatically. The persistent mute and independent volume controls
remain available even though the criterion only requires them for audio that
autoplays for more than three seconds.

- Sound conveys no information needed to understand or complete the
  experience.
- A reveal, warning, state change, or available action is never indicated by
  sound alone.
- Ambient sound is decorative and therefore needs no transcript. Narration or
  meaningful audio introduced later would require an equivalent visible form.
- `prefers-reduced-motion` is not treated as an audio preference. Sound has its
  own explicit control.
- Avoid sharp transients, alarms, strong sub-bass, audible beating, fast
  amplitude modulation, and automatic left-right movement.
- Do not use binaural effects as the default or make headphones necessary.
- Use smooth gain ramps for every start, stop, and layer change.
- If speech is introduced later, ambience must be independently removable and
  mixed at least 20 dB below the foreground speech, following WCAG guidance for
  low or no background audio.
- Screen-reader announcements are limited to the button's ordinary state
  change. Do not create a repeating live region for audio or scene changes.

## Audio architecture

### Ownership and module boundary

The audio engine is independent of Three.js and Vue rendering. It receives
coarse product state and owns all audio nodes and scheduling.

Suggested modules:

```text
app/
  components/perigee/
    AmbientSoundControl.vue
  composables/
    useAmbientSound.ts
  types/
    ambientSound.ts
src/perigee/audio/
  AmbientSoundEngine.ts
  cosmos.ts
  createNoiseBuffer.ts
  createReverbImpulse.ts
  presets.ts
  soundscapes.ts
tests/
  ambient-sound.test.ts
  ambient-sound-presets.test.ts
```

`AmbientSoundEngine.ts` must not import Vue, Nuxt, DOM components, or the
Three.js scene. Browser interfaces are injected or created behind a narrow
boundary so deterministic behavior can be tested in Node without producing
audio.

### Public state

The composable exposes the smallest useful contract:

```ts
type AmbientSoundStatus =
  | 'off'
  | 'starting'
  | 'playing'
  | 'suspended'
  | 'unavailable'

interface AmbientSoundController {
  status: Readonly<Ref<AmbientSoundStatus>>
  volume: Readonly<Ref<number>>
  toggle(): Promise<void>
  setVolume(value: number): void
}
```

The engine itself supports `start`, `stop`, `suspend`, `resume`, `setVolume`,
and `dispose`. Repeated calls are idempotent. `start` constructs at most one
graph. `dispose` is terminal for that instance.

### Audio graph

```text
wind body ── filter ── layer gain ─┐
wind air ─── filter ── layer gain ─┼─────────────────────────┐
surf ─────── filter ── layer gain ─┘                         │
                                                             │
drone x4 ─ voice gain ─ drone bus ─ low-pass ─┐              ├─ master gain
swell x4 ─ voice gain ─ swell bus ─ low-pass ─┴─ cosmos bus ─┤    ─ compressor
                                                 ├ dry gain ─┤    ─ destination
                                                 ├ pre-delay ─ convolver ─ wet gain
                                                 └ delay L/R ─ panner ─ spread gain
```

All paths are mono or gently stereo-balanced at first. The system does not
move sources with the camera and does not use positional audio in the first
release. This prevents an ambient layer from implying scientific spatial
sound or creating distracting movement.

### Wind body

- Generate a deterministic looping noise buffer in memory.
- Approximate pink noise rather than using unfiltered white noise.
- Pass it through a low-pass `BiquadFilterNode`.
- Modulate filter frequency and layer gain slowly using scheduled
  `AudioParam` ramps.
- Keep the modulation range narrow enough that it does not read as an effect.

### Wind air

- Reuse or independently seed a second noise source.
- Pass it through a band-pass filter at substantially lower gain.
- Use longer silent or near-silent troughs so it suggests intermittent air
  movement rather than constant hiss.

### Distant surf

- Generate a darker brown-noise-style buffer.
- Apply a low-pass filter.
- Schedule overlapping envelopes with gradual rises, short crests, and long
  decays.
- Randomize interval and strength only within the approved preset bounds.
- The layer suggests distant water; it does not attempt to synthesize distinct
  nearby wave breaks.

### Cosmic layer

The layer that carries Perigee's identity. It leads the mix; the wind and surf
gains above are reduced so it can.

**Tonal centre.** One root per scene, between 50 Hz and 120 Hz. No chord
progression and no key change inside a scene. A viewpoint change glides the
root and every voice with it over the same 5.5-second transition, so the piece
stays continuous.

**Drone bed.** Four sine oscillators at 0, 7, 12, and 19 semitones above the
root: root, fifth, octave, octave plus fifth. Open intervals only, no third,
so the bed floats instead of resolving. Each voice drifts by a few cents on
its own slow schedule. Only one oscillator holds each pitch, so drift never
produces audible beating. A shared low-pass filter breathes between two
cutoffs on a 26 to 44 second cycle.

**Swell voices.** Four triangle oscillators at 12, 19, 24, and 26 semitones
above the root, each on its own cycle of 23, 29, 37, or 41 seconds. The cycle
lengths are coprime, so the voices drift apart and their arrangement never
repeats — the tape-loop principle behind *Music for Airports*. Each entry is a
3 to 6 second attack and a 9 to 15 second release, always shorter than the
shortest cycle. Envelopes are scheduled forward from a stored per-voice entry
time and are never cancelled, so re-scheduling cannot truncate a swell that is
already sounding.

**Space.** A `ConvolverNode` with an impulse generated in memory: filtered
noise under a decaying envelope, mono, five seconds, roughly 960 KB decoded.
A 40 ms pre-delay sits in front of it. No impulse-response file is fetched and
no licence applies. Width comes from two fixed taps at 19 ms and 31 ms panned
left and right — fixed, because the sensory-comfort rules forbid automatic
stereo movement.

**Not in this layer.** No shimmer or pitch-shifted reverb; the Web Audio API
has no pitch shifter and a granular workaround is not worth the cost yet. No
sub-bass reinforcement. Pitch is not bound to distance, object, or encounter
beat.

### Master protection

- Route every layer through its own gain node.
- Route those gains through a master `GainNode`.
- Place a conservative `DynamicsCompressorNode` before the destination to
  protect against combined peaks and clipping.
- Never set a gain abruptly while audible. Schedule ramps against
  `AudioContext.currentTime`.
- Do not drive audio parameters from `requestAnimationFrame` or the Three.js
  render loop.

### Randomness

Use a small seeded pseudo-random generator for buffer creation and scheduling.
Each named preset owns a stable seed. This provides natural variation inside a
session while keeping tests, reviews, and defect reproduction deterministic.

## Presets and review

The first prototype exposes three internal presets for review. They are not a
visitor-facing setting.

| Preset | Environmental balance | Cosmic layer | Purpose |
| --- | --- | --- | --- |
| Documentary | Wind and surf forward | Nearly absent | Test whether environmental sound alone is sufficient |
| Cinematic-natural | Wind and surf under the music | Leads, calm and wide | Approved target and expected winner |
| Abstract | Environment reduced further | Louder, longer tail | Establish the upper creative boundary |

All three use the same master loudness target so preference is based on
character, not volume. Final filter ranges, layer gains, envelope timing, and
compressor values are accepted through listening review rather than presented
as scientific facts.

## Optional recorded layer

A recording is added only if the procedural surf fails the review criterion:
listeners consistently describe it as synthetic, electronic, or noise rather
than distant Atlantic water on two or more target playback devices.

If added:

- Use one recording, not stock music.
- Prefer Freesound CC0. CC BY is allowed with exact attribution. Do not use
  CC BY-NC.
- ZapSplat Standard Licence is allowed with the required project credit.
- Pixabay and Mixkit are secondary fallbacks only after the exact asset terms
  are saved and reviewed.
- Remove voices, recognizable music, brands, and private conversations.
- Trim, equalize, crossfade, and layer the recording so it is part of the
  production rather than a raw standalone asset.
- Lazy-load it only after sound activation.
- Serve it locally; the production app makes no request to the source library.
- Prefer Opus with an AAC or MP3 fallback. Do not ship WAV or FLAC at runtime.

## Licensing record

Before an audio asset enters the runtime, record:

- asset title and author;
- original asset URL;
- licence name and canonical licence URL;
- download date;
- a retained copy or screenshot of the licence evidence;
- modifications made by Perigee;
- the exact required credit.

Add the public credit to `public/assets/ATTRIBUTIONS.md`. Keep licence evidence
under the relevant design documentation rather than exposing it as a runtime
download. An asset without complete provenance does not ship.

## Performance budget

- Zero audio network requests before explicit activation.
- No audio dependency added for the first implementation.
- One `AudioContext` and one graph per application lifetime.
- A fixed, small number of long-lived sources, filters, and gains; never create
  nodes continuously per frame.
- Schedule modulation ahead through `AudioParam` automation.
- Generated buffers should remain below 2 MB decoded in aggregate: two 4-second
  mono noise buffers plus the 5-second mono reverb impulse, about 1.7 MB.
- If a recorded layer is approved, target no more than 1 MB transferred for
  the initial Cabo sound and load it after activation.
- Suspend while hidden to avoid background CPU and battery use.
- Balanced and safe scene tiers use the same restrained audio graph unless
  device testing demonstrates a material cost. If reduction is necessary,
  remove the tonal layer before degrading control or safety behavior.

## Analytics and privacy

The sound engine itself does not communicate with Umami or any third party.
If measurement is added, extend the typed provider-neutral event contract with
only these coarse events:

```ts
ambient_sound_change: {
  enabled: boolean
  source: 'control'
}
ambient_sound_unavailable: {
  stage: 'create' | 'resume' | 'asset'
}
```

Do not record volume, audio-device information, browser audio capabilities,
timing modulation, filenames, or error messages. Provider failure remains
isolated from the experience. The unavailable event is optional and should be
added only if it answers a real release question.

## Verification

### Deterministic tests

- Preset definitions are complete, bounded, and stable.
- Seeded randomness produces reproducible sequences.
- `start` is idempotent and constructs one graph.
- Repeated on/off actions do not leak sources or schedules.
- Gain changes use ramps and remain within safe bounds.
- Hidden/visible lifecycle transitions preserve user intent.
- Stored `on`, stored `off`, absent, and invalid preferences resolve safely.
- Construction, resume, and asset failures produce `unavailable` without
  throwing into the scene.
- Disposal cancels schedules and disconnects nodes.

### Browser checks

- Chrome, Safari, and Firefox require explicit activation and then play.
- No audio request or context exists before activation.
- Keyboard-only users can enable, adjust, and disable sound.
- The control has visible hover and focus states at desktop and 390 x 844.
- Screen readers announce the control and its current state without repeated
  live-region noise.
- Internal navigation and encounter transitions never overlap or restart the
  graph.
- Backgrounding suspends sound; returning follows the stored active state.
- Phone speakers do not distort; headphones reveal no clipping, hard seams,
  beating, or distracting stereo movement.
- Sound disabled leaves every encounter understandable and complete.
- Browser console and network logs show no unexpected errors or third-party
  audio requests.

### Listening review

Review documentary, cinematic-natural, and abstract presets through:

1. phone speakers;
2. laptop speakers;
3. ordinary headphones.

Use both free exploration and the full Cabo encounter. Select the direction
that deepens place and awe without drawing attention to itself. Reject any
candidate described as synthetic hiss, nearby storm, dramatic trailer sound,
audible space simulation, a recognisable tune, or anything that asks to be
listened to rather than lived in.

## Delivery sequence

### G6.1 — Procedural study

- Implement the native Web Audio engine and three review presets.
- Add explicit activation, mute, volume, persistence, fades, lifecycle
  suspension, failure isolation, and deterministic tests.
- Keep the engine Cabo-only and free of recorded assets.
- Review the three presets at desktop and 390 x 844 on all target playback
  devices.

### G6.2 — Direction lock

- Record the selected preset and accepted parameter bounds in this document.
- Decide whether procedural surf passes the realism criterion.
- If it passes, remove the unselected review presets from production.
- If it fails, approve one compliant recording and its attribution before
  integrating it.

### G6.3 — Release verification

- Verify accessibility, browser behavior, performance, licensing, and the full
  Cabo encounter.
- Run `npm run verify` on Node 24.20.0.
- Verify the generated production build and deployed site, including external
  HTTP delivery of any approved audio asset.
- Update `product-expansion-plan.md` with completion evidence and the commit.

### G6.4 — Multi-scene ambience

- Add a distinct procedural environment for every viewpoint.
- Morph scene parameters over a slow, multi-second transition while keeping
  one context and one long-lived graph.
- Keep the texture environmental and calm, without an app-wide music bed.
- Keep the existing single control and progressive volume disclosure.

### G6.5 — Cosmic layer

- Add the drone bed, swell voices, and generated reverb to the same graph.
- Reduce and darken wind and surf so the music leads.
- Give every viewpoint its own tonal centre and glide between them.
- Keep one context, one graph, and the existing control and volume disclosure.
- Review on phone, laptop, and headphones. Confirm no beating, no clipping,
  and no recognisable tune.

Shimmer reverb, pitch bound to distance or encounter beat, reactive encounter
scoring, spatial audio, narration, and a general sound-settings panel still
require separate product decisions.

## Sources

Accessed 2026-09-02:

- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN: Advanced techniques, creating and sequencing audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)
- [MDN: Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [MDN: Autoplay guide](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [W3C: Understanding WCAG 1.4.2 Audio Control](https://www.w3.org/WAI/WCAG21/Understanding/audio-control)
- [W3C: Understanding WCAG 1.4.7 Low or No Background Audio](https://www.w3.org/WAI/WCAG22/Understanding/low-or-no-background-audio)
- [Freesound licensing FAQ](https://freesound.org/help/faq/)
- [Creative Commons CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- [ZapSplat Standard Licence](https://zapsplat-assets.s3.amazonaws.com/zapsplat-standard-license.pdf)
- [Pixabay Content Licence](https://pixabay.com/service/license-summary/)
- [Mixkit licences](https://mixkit.co/license/)
- [Spotify Developer Policy](https://developer.spotify.com/policy)
- [Spotify Web Playback SDK guide](https://developer.spotify.com/documentation/web-playback-sdk/howtos/web-app-player/)

Cosmic direction, accessed 2026-09-02:

- [Reverb Machine: Deconstructing Brian Eno's Music for Airports](https://reverbmachine.com/blog/deconstructing-brian-eno-music-for-airports/)
- [Teropa: How Generative Music Works](https://teropa.info/loop/)
- [Splice: How to Make Ambient Music](https://splice.com/blog/how-to-make-ambient-music/)
- [Point Blank: Rich, layered textures in ambient music](https://www.pointblankmusicschool.com/blog/how-to-create-rich-layered-textures-in-ambient-music/)
- [Artists in DSP: Evolving drones and textures](https://artistsindsp.com/ambient-sound-design-7-advanced-techniques-for-evolving-drones-and-textures/)
- [reverbGen: generated impulse responses for the Web Audio API](https://github.com/adelespinasse/reverbGen)
- [gskinner: Making Reverb with the Web Audio API](https://blog.gskinner.com/archives/2019/02/reverb-web-audio-api.html)
- [Alex Bainter: How to host a generative music platform on the web](https://medium.com/@alexbainter/how-to-host-a-generative-music-platform-on-the-web-3c71e25b225a)

Licensing notes in this document are product guidance, not legal advice. The
licence attached to the selected asset at download time remains authoritative.
