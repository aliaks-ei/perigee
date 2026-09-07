import { expect, it, vi } from 'vitest'
import { WorkQueue } from '../src/perigee/streaming/WorkQueue'

it('bounds work across owners and removes aborted queued requests', async () => {
  const queue = new WorkQueue(1)
  let finish!: () => void
  const first = queue.run(() => new Promise<void>((resolve) => { finish = resolve }), new AbortController().signal)
  await Promise.resolve()
  const second = vi.fn(async () => 2)
  const abort = new AbortController()
  const cancelled = queue.run(second, abort.signal)
  const rejection = expect(cancelled).rejects.toThrow('WORK_CANCELLED')
  const third = vi.fn(async () => 3)
  const last = queue.run(third, new AbortController().signal)
  abort.abort()
  expect(third).not.toHaveBeenCalled()
  finish()
  await first
  await rejection
  expect(await last).toBe(3)
  expect(second).not.toHaveBeenCalled()
})

it('releases admission after a synchronous exception', async () => {
  const queue = new WorkQueue(1)
  await expect(queue.run(() => { throw new Error('failed') }, new AbortController().signal)).rejects.toThrow('failed')
  expect(await queue.run(async () => 1, new AbortController().signal)).toBe(1)
})
