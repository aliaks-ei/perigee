import { computed, readonly, ref, shallowRef } from 'vue'
import { analytics } from '~/utils/analytics'
import {
  browserShareTarget,
  canvasToBlob,
  captureCaption,
  captureFileName,
  captureShareUrl,
  composeCapture,
  type CaptureSubject,
} from '~/utils/sceneCapture'

export type CaptureAction = 'download' | 'copy'

export interface CaptureActionFeedback {
  action: CaptureAction
  message: string
}

/**
 * Module-level, like `usePerigee`: one capture belongs to the session, not to
 * whichever component happened to ask for it.
 */
const capturing = ref(false)
const captureOpen = ref(false)
const captureError = ref<string | null>(null)
const actionFeedback = ref<CaptureActionFeedback | null>(null)
const previewUrl = ref<string | null>(null)
const subject = shallowRef<CaptureSubject | null>(null)
/** The untouched frame, retained until the viewer saves or dismisses it. */
const frame = shallowRef<HTMLCanvasElement | null>(null)
let messageTimer: ReturnType<typeof setTimeout> | null = null

function announce(action: CaptureAction, message: string): void {
  actionFeedback.value = { action, message }
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => { actionFeedback.value = null }, 5_000)
}

function releasePreview(): void {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
}

function composed(): HTMLCanvasElement | null {
  const source = frame.value
  if (!source) return null
  const current = subject.value
  return composeCapture(
    source,
    current ? captureCaption(current) : null,
  )
}

async function refreshPreview(): Promise<void> {
  const canvas = composed()
  if (!canvas) return
  const blob = await canvasToBlob(canvas)
  releasePreview()
  previewUrl.value = URL.createObjectURL(blob)
}

async function exportFile(): Promise<File | null> {
  const canvas = composed()
  const current = subject.value
  if (!canvas || !current) return null
  const blob = await canvasToBlob(canvas)
  return new File([blob], captureFileName(current), { type: blob.type })
}

export function useCapture() {
  const { captureFrame, currentObject, currentPreset, currentViewpointId, viewpoints, angularDiameter, currentEncounter, encounterStatus } = usePerigee()

  const caption = computed(() => subject.value ? captureCaption(subject.value) : null)

  function describeCurrentView(): CaptureSubject {
    const viewpoint = viewpoints.find((candidate) => candidate.id === currentViewpointId.value)
    const encounter = encounterStatus.value === 'idle' ? null : currentEncounter.value
    return {
      objectId: currentObject.value.id,
      objectLabel: currentObject.value.label,
      presetId: currentPreset.value.id,
      presetLabel: currentPreset.value.label,
      viewpointId: currentViewpointId.value,
      viewpointLabel: viewpoint?.label ?? currentViewpointId.value,
      angularDiameterDegrees: angularDiameter.value,
      ...(encounter ? { encounterSlug: encounter.slug, encounterTitle: encounter.title } : {}),
    }
  }

  async function capture(): Promise<void> {
    if (capturing.value) return
    capturing.value = true
    captureError.value = null
    actionFeedback.value = null
    analytics.track('capture', { outcome: 'attempt' })
    try {
      const source = captureFrame()
      if (!source) throw new Error('CAPTURE_UNAVAILABLE')
      frame.value = source
      subject.value = describeCurrentView()
      await refreshPreview()
      captureOpen.value = true
      analytics.track('capture', { outcome: 'complete' })
    } catch {
      captureError.value = 'This sky could not be captured. Try again in a moment.'
      analytics.track('capture', { outcome: 'failed' })
    } finally {
      capturing.value = false
    }
  }

  async function download(): Promise<void> {
    const file = await exportFile()
    if (!file) return
    browserShareTarget().download(file)
    announce('download', 'Saved')
  }

  async function copyLink(): Promise<void> {
    const current = subject.value
    if (!current) return
    analytics.track('share', { outcome: 'attempt' })
    try {
      await browserShareTarget().copyLink(captureShareUrl(current, window.location.origin))
      analytics.track('share', { outcome: 'complete' })
      announce('copy', 'Copied')
    } catch {
      analytics.track('share', { outcome: 'failed' })
      announce('copy', 'Try again')
    }
  }

  function close(): void {
    captureOpen.value = false
    releasePreview()
    frame.value = null
    subject.value = null
    if (messageTimer) clearTimeout(messageTimer)
    actionFeedback.value = null
  }

  return {
    capturing: readonly(capturing),
    captureOpen: readonly(captureOpen),
    captureError: readonly(captureError),
    actionFeedback: readonly(actionFeedback),
    previewUrl: readonly(previewUrl),
    caption,
    capture,
    download,
    copyLink,
    close,
  }
}
