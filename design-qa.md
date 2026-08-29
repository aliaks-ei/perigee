# Perigee design QA

## Reference and implementation

- Source visual truth: `/Users/aliakseimazheika/Downloads/concept-observatory-glass.png`
- Browser-rendered implementation: `tmp/design-qa/perigee-cinematic-desktop-final.jpg`
- Full-view comparison: `tmp/design-qa/perigee-cinematic-comparison.jpg`
- Celestial focused comparison: `tmp/design-qa/perigee-saturn-focused-comparison.jpg`
- Parallax state comparison: `tmp/design-qa/perigee-parallax-comparison.jpg`
- Mobile implementation: `tmp/design-qa/perigee-cinematic-mobile-final.jpg`
- Compact controls, closed: `tmp/design-qa/perigee-menu-closed-final.jpg`
- Compact controls, open: `tmp/design-qa/perigee-menu-open-final.jpg`
- Compact controls, mobile open: `tmp/design-qa/perigee-menu-mobile-open-final.jpg`
- Menu/reference comparison: `tmp/design-qa/reference-vs-menu-final.jpg`
- Desktop source pixels: 1586 × 992
- Desktop menu implementation pixels/CSS viewport: 1584 × 992 at density 1
- Mobile implementation pixels/CSS viewport: 390 × 844 at density 1
- State: Rooftop, Saturn, Moon swap, object browser closed, pointer centered unless named otherwise

## Findings

- No actionable P0, P1, or P2 findings remain.
- The implemented rooftop occupies less vertical space than the supplied reference by design. This follows the latest brief to make the landscape secondary while preserving the reference's low city, open sky, lower-left identity, and glass control rail.
- The celestial render remains scientifically sized, so Saturn's body is slightly smaller than the concept artwork while retaining the same dominant top-right composition.
- The former persistent rail is now a 54 px floating summary dock. Object and distance controls occupy the scene only while explicitly opened, then dismiss immediately after selection.

## Required fidelity surfaces

- Fonts and typography: passed. Self-hosted Space Grotesk gives the object name a subtle astronomical character without novelty lettering; its reduced 38–66 px scale, tracked wordmark, subdued metadata, and quiet control labels preserve the reference hierarchy without wrapping or clipping.
- Spacing and layout rhythm: passed. The sparse header, upper-right celestial body, lower-left identity, low horizon, and centered floating dock align to the source composition. The intentionally reduced landscape and collapsed controls leave more negative sky per the latest brief.
- Colors and visual tokens: passed. Near-black/navy surfaces, cool atmospheric blue, tiny warm city lights, hairline glass borders, and object-linked accents remain restrained. Emissive stars add soft object-coloured sky glow without a contour shell.
- Image quality and asset fidelity: passed. Rooftop, hilltop, and lakeside use seamless 3172 × 1984 environment plates inside the Three.js sky pass. Saturn uses a lighting-neutral 4096 × 2048 atmosphere map; the other planets retain 4K maps and the ring retains its 8K source. No visible SVG/CSS landscape approximation or hard image boundary remains.
- Copy and content: passed. Object, apparent angle, distance, preset, and hazard copy remain concise and scientifically oriented.
- Icons and controls: passed. The supplied Phosphor icon set remains consistent. The compact summary dock clearly exposes the current object and distance; the glass picker adds selected, expanded, hover, and focus states without ornamental chrome.
- Responsiveness and accessibility: passed. The 390 × 844 capture keeps the dramatic object crop, title, metadata, viewpoint switcher, compact dock, horizontally scrollable objects, and distances usable. Radio/listbox semantics, keyboard focus return, accessible names, outside-click dismissal, Escape, and reduced-motion behavior remain intact.

## Interaction and runtime verification

- Verified Rooftop, Hilltop, and Lakeside transitions.
- Verified object browser open/closed state and Jupiter/Betelgeuse selection.
- Verified distance selection and animated apparent-size changes.
- Verified brand reset returns Saturn, Moon swap, Rooftop, and centered camera.
- Verified ambient pointer parallax and drag camera motion move the object, stars, haze, horizon, and foreground coherently. Reduced-motion users do not receive ambient hover motion.
- Verified desktop and mobile crops.
- Verified the compact dock opens from the selected object/distance summary, focuses the current object, supports arrow-key traversal, closes on Escape/outside click/selection, and returns focus to its trigger.
- Verified menu bounds at 390 × 844: 10 px side margins, no document horizontal overflow, and an 11 px bottom inset for the trigger.
- Clean-browser console errors: none.
- Clean-browser console warnings: none beyond Nuxt's informational Suspense notice.
- `npm run verify`: passed (typecheck, 15 tests, production build).

## Comparison history

- P1 resolved: transparent SVG foregrounds looked synthetic and did not visually share the camera. Replaced them with full-frame high-resolution environment plates rendered and crossfaded inside the Three.js sky pass.
- P1 resolved: landscape motion previously updated only during drag and stopped independently of the scene. Added damped ambient pointer look plus camera-derived environment UV movement with overscan.
- P1 resolved: the original environment approach exposed a visible sky/landscape compositing edge. Sky, atmosphere, haze, horizon, and foreground are now authored in one continuous plate.
- P2 resolved: the landscape occupied too much of the frame. New assets keep terrain and city detail within the lower quarter, with hilltop lower still.
- P2 resolved: Saturn's former diffuse map was smooth and pale beside the source. A 4096 × 2048 lighting-neutral atmosphere texture restores fine cloud turbulence and stronger natural banding while runtime shaders retain directional light.
- P2 resolved: star scenes lacked environmental light response. Emissive objects now receive stronger bloom and a soft lower-sky tint without reintroducing contour geometry.
- P2 resolved: hot updates could observe a stale canvas after async initialization. The mounted hook now retains and validates the initialized canvas before attaching the resize observer.
- P2 resolved: the persistent object and distance rail consumed the full lower 112 px of every scene. It is now a compact glass dock with a focused, transient picker.
- P2 resolved: the object name competed with the celestial render. Space Grotesk and a tighter responsive type scale preserve the cinematic uppercase identity at a quieter size.

## Follow-up polish

- P3: Saturn's ring opacity and particle scattering remain a stylized real-time approximation; a later scientific rendering pass could add wavelength-dependent transmission without changing the interface.

## Final result

passed
