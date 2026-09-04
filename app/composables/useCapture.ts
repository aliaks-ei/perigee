import { computed, readonly, ref, shallowRef } from 'vue'
import { analytics } from '~/utils/analytics'
import {
  browserShareTarget,
  canvasToBlob,
  captureCaption,
  captureFileName,
  captureShareText,
  captureShareUrl,
  composeCapture,
  shareCapture,
  type CaptureSubject,
} from '~/utils/sceneCapture'

/**
 * Module-level, like `usePerigee`: one capture belongs to the session, not to
 * whichever component happened to ask for it.
 */
const capturing = ref(false)
const captureOpen = ref(false)
const captionEnabled = ref(true)
const captureError = ref<string | null>(null)
const shareMessage = ref<string | null>(null)
const previewUrl = ref<string | null>(null)
const subject = shallowRef<CaptureSubject | null>(null)
/** The untouched frame, so toggling the caption never re-renders the scene. */
const frame = shallowRef<HTMLCanvasElement | null>(null)
let messageTimer: ReturnType<typeof setTimeout> | null = null

function announce(message: string): void {
  shareMessage.value = message
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => { shareMessage.value = null }, 5_000)
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
    captionEnabled.value && current ? captureCaption(current) : null,
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
    shareMessage.value = null
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

  async function setCaption(enabled: boolean): Promise<void> {
    captionEnabled.value = enabled
    await refreshPreview()
  }

  async function share(): Promise<void> {
    const current = subject.value
    const file = await exportFile()
    if (!file || !current) return
    analytics.track('share', { outcome: 'attempt' })
    const url = captureShareUrl(current, window.location.origin)
    const outcome = await shareCapture(
      {
        file,
        title: current.encounterTitle ?? 'Perigee',
        text: captureShareText(current),
        url,
      },
      browserShareTarget(),
    )

    if (outcome === 'shared') {
      analytics.track('share', { outcome: 'complete' })
      announce('Shared.')
    } else if (outcome === 'downloaded') {
      analytics.track('share', { outcome: 'complete' })
      announce('Image saved and link copied.')
    } else if (outcome === 'cancelled') {
      // Dismissing the system sheet is a choice, not a failure.
      analytics.track('share', { outcome: 'cancelled' })
    } else {
      analytics.track('share', { outcome: 'failed' })
      announce('Sharing is unavailable here. Use Save image instead.')
    }
  }

  async function download(): Promise<void> {
    const file = await exportFile()
    if (!file) return
    browserShareTarget().download(file)
    announce('Image saved.')
  }

  async function copyLink(): Promise<void> {
    const current = subject.value
    if (!current) return
    try {
      await browserShareTarget().copyLink(captureShareUrl(current, window.location.origin))
      announce('Link copied.')
    } catch {
      announce('The link could not be copied.')
    }
  }

  function close(): void {
    captureOpen.value = false
    releasePreview()
    frame.value = null
    subject.value = null
    if (messageTimer) clearTimeout(messageTimer)
    shareMessage.value = null
  }

  return {
    capturing: readonly(capturing),
    captureOpen: readonly(captureOpen),
    captionEnabled: readonly(captionEnabled),
    captureError: readonly(captureError),
    shareMessage: readonly(shareMessage),
    previewUrl: readonly(previewUrl),
    caption,
    capture,
    setCaption,
    share,
    download,
    copyLink,
    close,
  }
}
