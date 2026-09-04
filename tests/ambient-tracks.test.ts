import { describe, expect, it } from 'vitest'
import { ambientTracks } from '../src/perigee/audio/AudioManifest'
import { viewpoints } from '../app/data/viewpoints'

/**
 * Lazy on purpose: the keys alone answer every question here, and eager-loading
 * four MP3s would pull seven megabytes into the test run to read their names.
 */
const shipped = Object.keys(import.meta.glob('../public/assets/audio/*.mp3'))
  .map((path) => `/assets/audio/${path.split('/').pop()}`)
  .sort()

describe('ambient tracks', () => {
  it('ships one track for every viewpoint and nothing else', () => {
    expect(Object.keys(ambientTracks).sort())
      .toEqual(viewpoints.map((viewpoint) => viewpoint.id).sort())
  })

  it('matches the manifest to the files in public, in both directions', () => {
    // The filename carries the file's own content hash, so a manifest that has
    // drifted from what was encoded cannot still point at a file that exists.
    expect(Object.values(ambientTracks).map((track) => track.url).sort()).toEqual(shipped)
  })

  it('names every file by its content so /assets/* can stay immutable', () => {
    for (const [id, track] of Object.entries(ambientTracks)) {
      expect(track.url).toMatch(new RegExp(`^/assets/audio/${id}-[0-9a-f]{8}\\.mp3$`))
    }
  })

  it('keeps each track inside the wire and memory budgets', () => {
    for (const track of Object.values(ambientTracks)) {
      // Nothing here is on the first load, but a phone on a slow connection
      // still waits for it between the toggle and the first note.
      expect(track.bytes).toBeLessThan(2_400_000)
      expect(track.seconds).toBeGreaterThan(90)
      // The ceiling is memory, not taste: decoded stereo at 44.1 kHz costs
      // about 350 KB a second, and two are decoded at once mid-crossfade.
      expect(track.seconds).toBeLessThan(150)
    }
  })
})
