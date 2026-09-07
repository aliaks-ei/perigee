import { computed, readonly, ref, shallowRef } from 'vue'
import { analytics } from '~/utils/analytics'
import {
  browserShareTarget,
  canvasToBlob,
  captureCaption,
  captureFileName,
  captureShareUrl,
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
const exportProgress = ref(0)
const exportBlob = shallowRef<Blob | null>(null)
let exportAbort: AbortController | null = null
const capturing = ref(false)
const captureOpen = ref(false)
const captureError = ref<string | null>(null)
const actionFeedback = ref<CaptureActionFeedback | null>(null)
const previewUrl = ref<string | null>(null)
const subject = shallowRef<CaptureSubject | null>(null)
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

async function exportFile(): Promise<File | null> {
  const current = subject.value
  const blob = exportBlob.value
  return blob && current ? new File([blob], captureFileName(current), { type: 'image/png' }) : null
}

export function useCapture() {
  const { exportStill, currentObject, currentPreset, currentViewpointId, viewpoints, angularDiameter, currentEncounter, encounterStatus } = usePerigee()

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
    exportBlob.value = null
    exportProgress.value = 0
    analytics.track('capture', { outcome: 'attempt' })
    try {
      releasePreview()
      subject.value = describeCurrentView()
      captureOpen.value = true
      exportAbort = new AbortController()
      const blob = await exportStill({ signal: exportAbort.signal,
        onProgress: (value) => { exportProgress.value = value } })
      exportBlob.value = blob
      // Keep the dialog's decoded preview small; download retains the native PNG.
      const bitmap = await createImageBitmap(blob, { resizeWidth: Math.max(1, Math.round(1200 * Math.min(1, window.innerWidth / window.innerHeight))), resizeQuality: 'high' })
      const preview = document.createElement('canvas')
      try {
        preview.width = bitmap.width
        preview.height = bitmap.height
        const context = preview.getContext('2d')
        if (!context) throw new Error('CAPTURE_PREVIEW_UNAVAILABLE')
        context.drawImage(bitmap, 0, 0)
        const previewBlob = await canvasToBlob(preview)
        if (exportAbort.signal.aborted) throw new DOMException('Capture cancelled', 'AbortError')
        previewUrl.value = URL.createObjectURL(previewBlob)
      } finally { bitmap.close(); preview.width = preview.height = 1 }
      analytics.track('capture', { outcome: 'complete' })
      return
    } catch (error) {
      if (exportAbort?.signal.aborted || error instanceof DOMException && error.name === 'AbortError') { captureError.value = 'Capture cancelled.'; return }
      captureError.value = 'This sky could not be captured. Try again in a moment.'
      analytics.track('capture', { outcome: 'failed' })
    } finally {
      capturing.value = false
      exportAbort = null
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
    exportAbort?.abort()
    exportBlob.value = null
    captureOpen.value = false
    releasePreview()
    subject.value = null
    if (messageTimer) clearTimeout(messageTimer)
    actionFeedback.value = null
  }

  return {
    exportProgress: readonly(exportProgress),
    cancelExport: () => exportAbort?.abort(),
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
