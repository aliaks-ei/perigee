# Asset Attributions

## Planetary surface textures

- Source: [Solar System Scope textures](https://edu.solarsystemscope.com/textures/)
- Author: INOVE / Solar System Scope
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Files: `moon.jpg`, `mars.jpg`, `jupiter.jpg`, `neptune.jpg`, `saturn-ring-2k.webp`, and the derived thumbnails in `thumbs/`
- Modifications: Moon and Mars resampled to 4096×2048; Jupiter retained at 4096×2048. Saturn's ring downsampled from the source 8192×500 to 2048×64 as `saturn-ring-2k.webp`: the shader samples a single row of the strip, so the original's height was never read and its width cost 16 MB of GPU memory. The unmodified `saturn.jpg`, `saturn-ring.png` and `star-surface.jpg` were removed once nothing loaded them — Saturn renders from the enhanced map below, and stars are procedural. Runtime treatment adds color-managed lighting, fine-detail recovery, restrained surface response, and slow rotation.
- Downloaded: 2026-08-28

### Interface thumbnails

- Files: `thumbs/moon.webp`, `thumbs/mars.webp`, `thumbs/jupiter.webp`, `thumbs/saturn.webp`, `thumbs/neptune.webp`, `thumbs/star.webp`
- Modifications: Centre square of each source map, resampled to 160×160 and exported as WebP. The object browser previously rendered the full 4096×2048 maps as thumbnails, which cost 8.3 MB to draw seven 64 px circles. `thumbs/saturn.webp` derives from `saturn-atmosphere-v2.webp` so the thumbnail matches what the renderer shows, and `thumbs/star.webp` derives from the retired `star-surface.jpg`.
- License and attribution follow their sources above.
- Created: 2026-08-30

The source pack is based on NASA elevation and imagery data. Some unmapped
areas are reconstructed by the asset author, and the maps are intended for
visualization rather than scientific analysis.

### Saturn atmosphere enhancement

- Source: Original AI-assisted texture generated for Perigee with OpenAI image generation, art-directed from the supplied Cassini-style reference
- File: `saturn-atmosphere-v2.webp`
- Modifications: Generated as a lighting-neutral 1774×887 equirectangular diffuse map, resampled to 4096×2048, and exported as high-quality WebP. Directional lighting, limb falloff, and highlights remain runtime shader effects rather than baked into the asset.
- Created: 2026-08-29

## Surface normal maps

- Files: `moon-normal.webp`, `mars-normal.webp`
- Sources:
  - Moon: [LRO LOLA LDEM, 16 pixels/degree](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/) — NASA / Goddard Space Flight Center / LOLA science team
  - Mars: [MGS MOLA MEGDR, 16 pixels/degree](https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/) — NASA / JPL / MOLA science team
- License: Public domain (NASA data, distributed through the PDS Geosciences Node)
- Modifications: The 5760×2880 elevation grids were rolled from their 0–360°E layout into the −180–180° layout the albedo maps use, resampled to 2048×1024, and converted to tangent-space normal maps by `scripts/normal-maps.py`. Ground spacing is computed per latitude from each body's radius, so slopes are correct relative to one another; the whole field is then exaggerated by a single factor (Moon 1.8×, Mars 5.2×) because true planetary relief is far too shallow to survive 8-bit encoding. The source elevation files are not kept in this repository.
- Purpose: Perceived surface detail comes from relief that answers to the sun. Deriving it from the albedo instead invents craters in the dark lunar maria and flattens the ones that are really there.
- Downloaded: 2026-08-30

## Viewpoint landscapes

- Source: Original AI-assisted project artwork, generated for Perigee with OpenAI image generation
- Files: `rooftop-cinematic-4k.webp`, `hilltop-cinematic-4k.webp`, `lakeside-cinematic-4k.webp`
- Modifications: Generated 1586×992 masters were resampled to 3172×1984 and exported as high-quality WebP. Each plate contains a continuous sky, atmospheric horizon, and low foreground with no celestial object or interface content.
- Purpose: Seamless full-frame environment layers rendered inside the Three.js sky pass. Camera-linked UV motion, overscan, crossfades, and object-aware tinting keep the horizon and celestial render visually coherent.
- Created: 2026-08-29

### Cabo da Roca viewpoint

- Source: [Cabo da Roca Lighthouse and coastal cliffs, Portugal — May 2025](https://commons.wikimedia.org/wiki/File:Cabo_da_Roca_Lighthouse_and_coastal_cliffs,_Portugal_-_May_2025.jpg)
- Author: LensaCibi
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Files: `cabo-da-roca-landscape-4k.webp`, `cabo-da-roca-landscape-2k.webp`, `cabo-da-roca-landscape-safe.webp`, `cabo-da-roca-portrait-2k.webp`, `cabo-da-roca-portrait-safe.webp`
- Modifications: The licensed geographic and architectural reference was art-directed through OpenAI image generation into clean nighttime environment plates. Interface elements, stars, and celestial objects were excluded so they remain live runtime layers. Separate landscape and portrait masters preserve the lighthouse, Atlantic horizon, and cliffs without stretching; quality-tier variants were then resized and exported as WebP.
- Created: 2026-08-31
