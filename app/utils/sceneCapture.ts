import { formatDegrees } from './formatters'

/**
 * Everything a capture needs to describe itself. Kept as plain values so the
 * caption, the file name and the share link can be built and tested without a
 * canvas, a renderer or a browser.
 */
export interface CaptureSubject {
  objectId: string
  objectLabel: string
  presetId: string
  presetLabel: string
  viewpointId: string
  viewpointLabel: string
  angularDiameterDegrees: number
  /** Set only while a curated encounter is on screen. */
  encounterSlug?: string
  encounterTitle?: string
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed'

/** Two restrained lines: what it is, then where it was seen and how wide. */
export function captureCaption(subject: CaptureSubject): [string, string] {
  return [
    `${subject.objectLabel} · ${subject.presetLabel}`,
    `${subject.viewpointLabel} · ${formatDegrees(subject.angularDiameterDegrees)} across the sky`,
  ]
}

export function captureFileName(subject: CaptureSubject): string {
  return `perigee-${subject.objectId}-${subject.presetId}-${subject.viewpointId}.png`
}

/**
 * The link that travels with a capture. A curated encounter has a stable route
 * with its own social card; a freely composed sky is described by the query
 * string `usePerigee` already restores on load.
 */
export function captureShareUrl(subject: CaptureSubject, origin: string): string {
  const base = origin.replace(/\/+$/, '')
  if (subject.encounterSlug) return `${base}/e/${subject.encounterSlug}`
  const params = new URLSearchParams({
    object: subject.objectId,
    distance: subject.presetId,
    view: subject.viewpointId,
  })
  return `${base}/?${params.toString()}`
}

export function captureShareText(subject: CaptureSubject): string {
  if (subject.encounterTitle) return `${subject.encounterTitle} — a Perigee encounter`
  const [first, second] = captureCaption(subject)
  return `${first} · ${second}`
}

/**
 * The share targets a browser may or may not offer, injected rather than read
 * off `navigator`, so the fallback order is testable.
 */
export interface ShareTarget {
  canShareFiles?: (files: File[]) => boolean
  share?: (data: { title: string, text: string, url: string, files: File[] }) => Promise<void>
  download: (file: File) => void
  copyLink: (url: string) => Promise<void>
}

export interface SharePayload {
  file: File
  title: string
  text: string
  url: string
}

/**
 * Native sharing first, then download plus a copied link. A viewer who dismisses
 * the system sheet has not failed at anything, so `cancelled` is reported
 * separately and never falls through to a download they did not ask for.
 */
export async function shareCapture(
  payload: SharePayload,
  target: ShareTarget,
): Promise<ShareOutcome> {
  const files = [payload.file]
  if (target.share && target.canShareFiles?.(files)) {
    try {
      await target.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        files,
      })
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled'
      // Anything else means the sheet never opened. Fall through to the files
      // the viewer can still keep.
    }
  }

  try {
    target.download(payload.file)
    await target.copyLink(payload.url)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

/* -------------------------------------------------------------------------- */
/* Canvas composition                                                          */
/* -------------------------------------------------------------------------- */

const CAPTION_INK = 'rgba(245, 243, 238, 0.82)'
const CAPTION_QUIET = 'rgba(220, 227, 237, 0.55)'
const MARK_INK = 'rgba(245, 243, 238, 0.68)'

/**
 * Draws the caption and the Perigee mark onto a copy of the frame. Every
 * measurement is a fraction of the frame height, so a phone export and a
 * desktop export carry the same proportions.
 */
export function composeCapture(
  frame: HTMLCanvasElement,
  caption: [string, string] | null,
): HTMLCanvasElement {
  const composed = document.createElement('canvas')
  composed.width = frame.width
  composed.height = frame.height
  const context = composed.getContext('2d')
  if (!context) return frame
  context.drawImage(frame, 0, 0)

  const unit = composed.height / 1_000
  const inset = 34 * unit
  const size = 15 * unit
  context.textBaseline = 'alphabetic'
  context.font = `600 ${size}px Manrope, ui-sans-serif, system-ui, sans-serif`
  context.letterSpacing = `${size * 0.12}px`
  context.shadowColor = 'rgba(0, 0, 0, 0.72)'
  context.shadowBlur = 22 * unit

  if (caption) {
    const [first, second] = caption
    context.textAlign = 'left'
    context.fillStyle = CAPTION_INK
    context.fillText(first.toUpperCase(), inset, composed.height - inset - size * 1.7)
    context.fillStyle = CAPTION_QUIET
    context.fillText(second.toUpperCase(), inset, composed.height - inset)
  }

  context.textAlign = 'right'
  context.fillStyle = MARK_INK
  context.fillText('PERIGEE', composed.width - inset, composed.height - inset)
  return composed
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('CAPTURE_ENCODE_FAILED')),
      type,
      0.94,
    )
  })
}

/** The browser's own share sheet, when it can carry an image file. */
export function browserShareTarget(): ShareTarget {
  return {
    ...(typeof navigator.canShare === 'function'
      ? { canShareFiles: (files: File[]) => navigator.canShare({ files }) }
      : {}),
    ...(typeof navigator.share === 'function'
      ? { share: (data: ShareData) => navigator.share(data) }
      : {}),
    download: (file: File) => {
      const href = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = href
      link.download = file.name
      link.click()
      // Revoked on the next task, so the download has started reading it.
      setTimeout(() => URL.revokeObjectURL(href), 0)
    },
    copyLink: (url: string) => navigator.clipboard?.writeText(url) ?? Promise.resolve(),
  }
}
