import { describe, expect, it, vi } from 'vitest'
import { TileStream, type StreamLease } from '../src/perigee/streaming/TileStream'

const settle = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve() }

describe('bounded tile ownership', () => {
  it('limits requests, drops superseded late results, and releases each lease once', async () => {
    const requests: { key: string, signal: AbortSignal, resolve: (lease: StreamLease<string>) => void }[] = []
    const changed = vi.fn()
    const stream = new TileStream<string>((key, signal) => new Promise((resolve) => requests.push({ key, signal, resolve })), changed)
    stream.setWanted(['a', 'b', 'c', 'd'], 3)
    expect(requests.map((r) => r.key)).toEqual(['a', 'b'])
    const a = vi.fn(), b = vi.fn(), c = vi.fn()
    stream.setWanted(['c'], 1)
    expect(requests[0]!.signal.aborted).toBe(true)
    requests[0]!.resolve({ value: 'a', release: a })
    requests[1]!.resolve({ value: 'b', release: b })
    await settle()
    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledOnce()
    expect(requests.map((r) => r.key)).toEqual(['a', 'b', 'c'])
    requests[2]!.resolve({ value: 'c', release: c })
    await settle()
    expect(stream.get('c')).toBe('c')
    expect(changed).toHaveBeenCalledOnce()
    stream.dispose()
    stream.dispose()
    expect(c).toHaveBeenCalledOnce()
  })
  it('keeps a failed tile absent and backs off without retry storms', async () => {
    const loader = vi.fn(async () => { throw new Error('404') })
    const stream = new TileStream(loader, vi.fn())
    stream.setWanted(['missing'], 1)
    await settle()
    for (let i = 0; i < 100; i += 1) stream.setWanted(['missing'], 1)
    await settle()
    expect(loader).toHaveBeenCalledOnce()
    expect(stream.get('missing')).toBeUndefined()
    stream.dispose()
  })
  it('releases a decode that finishes after disposal and never starts queued work', async () => {
    let resolve!: (lease: StreamLease<number>) => void
    const load = vi.fn(() => new Promise<StreamLease<number>>((done) => { resolve = done }))
    const stream = new TileStream(load, vi.fn(), 1)
    stream.setWanted(['a', 'b'], 2)
    stream.dispose()
    const release = vi.fn()
    resolve({ value: 1, release })
    await settle()
    expect(release).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledOnce()
  })
})
