import { describe, expect, it, vi } from 'vitest'
import { GpuTimer } from '../src/perigee/GpuTimer'

function context() {
  return {
    QUERY_RESULT_AVAILABLE: 1, QUERY_RESULT: 2,
    getExtension: vi.fn(() => ({ TIME_ELAPSED_EXT: 3, GPU_DISJOINT_EXT: 4 })),
    isContextLost: () => false, getParameter: vi.fn(() => false),
    createQuery: vi.fn(() => ({})), deleteQuery: vi.fn(), beginQuery: vi.fn(), endQuery: vi.fn(),
    getQueryParameter: vi.fn((_query: unknown, property: number): boolean | number => property === 1 ? false : 8_000_000),
  }
}
describe('GPU timing', () => {
  it('does not read a result before availability, then converts nanoseconds', () => {
    const gl = context()
    const timer = new GpuTimer(gl as unknown as WebGL2RenderingContext)
    timer.begin(); timer.end()
    expect(timer.poll()).toBeNull()
    expect(gl.getQueryParameter).toHaveBeenCalledTimes(1)
    gl.getQueryParameter.mockImplementation((_query, property) => property === 1 ? true : 8_000_000)
    expect(timer.poll()).toBe(8)
    expect(gl.deleteQuery).toHaveBeenCalledOnce()
  })
  it('discards disjoint measurements and caps pending queries', () => {
    const gl = context()
    const timer = new GpuTimer(gl as unknown as WebGL2RenderingContext)
    for (let i = 0; i < 20; i++) { timer.begin(); timer.end() }
    expect(gl.createQuery).toHaveBeenCalledTimes(4)
    gl.getParameter.mockReturnValue(true)
    expect(timer.poll()).toBeNull()
    expect(gl.deleteQuery).toHaveBeenCalledTimes(4)
    expect(gl.getQueryParameter).not.toHaveBeenCalled()
  })
})
