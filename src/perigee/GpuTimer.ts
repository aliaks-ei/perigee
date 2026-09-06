interface TimerExtension { TIME_ELAPSED_EXT: number, GPU_DISJOINT_EXT: number }

/** Non-blocking measurements of submitted scene/composer work. Never waits for the GPU. */
export class GpuTimer {
  private readonly extension: TimerExtension | null
  private pending: WebGLQuery[] = []
  private active: WebGLQuery | null = null

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.extension = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null
  }
  get supported(): boolean { return this.extension !== null }

  begin(): void {
    if (!this.extension || this.active || this.pending.length >= 4 || this.gl.isContextLost()) return
    const query = this.gl.createQuery()
    if (!query) return
    this.active = query
    this.gl.beginQuery(this.extension.TIME_ELAPSED_EXT, query)
  }
  end(): void {
    if (!this.extension || !this.active) return
    this.gl.endQuery(this.extension.TIME_ELAPSED_EXT)
    this.pending.push(this.active)
    this.active = null
  }
  poll(): number | null {
    if (!this.extension || this.gl.isContextLost()) return null
    if (this.gl.getParameter(this.extension.GPU_DISJOINT_EXT)) { this.clear(); return null }
    const query = this.pending[0]
    if (!query || !this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE)) return null
    this.pending.shift()
    const nanoseconds = Number(this.gl.getQueryParameter(query, this.gl.QUERY_RESULT))
    this.gl.deleteQuery(query)
    return Number.isFinite(nanoseconds) && nanoseconds > 0 ? nanoseconds / 1e6 : null
  }
  clear(): void {
    if (this.active && this.extension && !this.gl.isContextLost()) this.gl.endQuery(this.extension.TIME_ELAPSED_EXT)
    if (this.active) this.gl.deleteQuery(this.active)
    for (const query of this.pending) this.gl.deleteQuery(query)
    this.pending = []
    this.active = null
  }
}
