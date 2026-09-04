/**
 * Fetches and decodes each track once for the life of the session.
 *
 * Decoded audio is the expensive part: a two-minute stereo track is about
 * 40 MB of float samples, against 1.8 MB on the wire. The cache is therefore
 * deliberately releasable — the engine drops the previous viewpoint's track
 * once its crossfade has finished — rather than growing to hold all four.
 */
export interface AudioLoaderOptions {
  context: AudioContext
  /** Injectable so tests never touch the network. */
  fetchBytes?: (url: string) => Promise<ArrayBuffer>
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('AMBIENT_ASSET_UNAVAILABLE')
  return response.arrayBuffer()
}

export class AudioLoader {
  private readonly context: AudioContext
  private readonly fetchBytes: (url: string) => Promise<ArrayBuffer>
  private readonly buffers = new Map<string, Promise<AudioBuffer>>()

  constructor(options: AudioLoaderOptions) {
    this.context = options.context
    this.fetchBytes = options.fetchBytes ?? fetchArrayBuffer
  }

  load(url: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(url)
    if (cached) return cached
    const pending = this.decode(url)
    this.buffers.set(url, pending)
    // A rejected promise is evicted rather than cached, so a track that failed
    // on a dropped connection can succeed the next time the viewer tries.
    pending.catch(() => this.buffers.delete(url))
    return pending
  }

  has(url: string): boolean {
    return this.buffers.has(url)
  }

  release(url: string): void {
    this.buffers.delete(url)
  }

  clear(): void {
    this.buffers.clear()
  }

  private async decode(url: string): Promise<AudioBuffer> {
    const bytes = await this.fetchBytes(url)
    // Safari detaches the ArrayBuffer it decodes, which breaks a later retry
    // from the same bytes, so decoding always gets its own copy.
    return this.context.decodeAudioData(bytes.slice(0))
  }
}
