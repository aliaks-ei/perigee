# Asset Attributions

## Planetary surface textures

- Source: [Solar System Scope textures](https://edu.solarsystemscope.com/textures/)
- Author: INOVE / Solar System Scope
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Files: `moon.jpg`, `mars.jpg`, `jupiter.jpg`, `saturn.jpg`, `saturn-ring.png`, `neptune.jpg`, `star-surface.jpg`
- Modifications: Moon and Mars resampled to 4096×2048; Jupiter and Saturn retained at 4096×2048; Saturn's ring retained at 8192×500. Runtime treatment adds color-managed lighting, fine-detail recovery, restrained surface response, and slow rotation.
- Downloaded: 2026-08-28

The source pack is based on NASA elevation and imagery data. Some unmapped
areas are reconstructed by the asset author, and the maps are intended for
visualization rather than scientific analysis.

### Saturn atmosphere enhancement

- Source: Original AI-assisted texture generated for Perigee with OpenAI image generation, art-directed from the supplied Cassini-style reference
- File: `saturn-atmosphere-v2.webp`
- Modifications: Generated as a lighting-neutral 1774×887 equirectangular diffuse map, resampled to 4096×2048, and exported as high-quality WebP. Directional lighting, limb falloff, and highlights remain runtime shader effects rather than baked into the asset.
- Created: 2026-08-29

## Viewpoint landscapes

- Source: Original AI-assisted project artwork, generated for Perigee with OpenAI image generation
- Files: `rooftop-cinematic-4k.webp`, `hilltop-cinematic-4k.webp`, `lakeside-cinematic-4k.webp`
- Modifications: Generated 1586×992 masters were resampled to 3172×1984 and exported as high-quality WebP. Each plate contains a continuous sky, atmospheric horizon, and low foreground with no celestial object or interface content.
- Purpose: Seamless full-frame environment layers rendered inside the Three.js sky pass. Camera-linked UV motion, overscan, crossfades, and object-aware tinting keep the horizon and celestial render visually coherent.
- Created: 2026-08-29
