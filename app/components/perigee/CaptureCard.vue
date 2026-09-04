<script setup lang="ts">
import { nextTick, onBeforeUnmount, watch } from 'vue'
import { PhDownloadSimple, PhLink, PhX } from '@phosphor-icons/vue'

const {
  captureOpen,
  previewUrl,
  caption,
  actionFeedback,
  download,
  copyLink,
  close,
} = useCapture()

const card = ref<HTMLElement | null>(null)

watch(captureOpen, async (open) => {
  if (!open) return
  await nextTick()
  card.value?.querySelector<HTMLButtonElement>('[data-capture-close]')?.focus({ preventScroll: true })
})

/**
 * Focus goes back to whatever opened the card: the capture item while the
 * "more" sheet is still open, an encounter's capture button, or else the
 * "more" control the sheet closed behind.
 */
function dismiss(): void {
  close()
  nextTick(() => {
    const target = document.querySelector<HTMLButtonElement>('[data-capture-trigger]')
      ?? document.querySelector<HTMLButtonElement>('[data-more-trigger]')
    target?.focus({ preventScroll: true })
  })
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !captureOpen.value) return
  event.stopPropagation()
  dismiss()
}

onMounted(() => window.addEventListener('keydown', handleKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown, true))
</script>

<template>
  <Transition name="hint">
    <aside
      v-if="captureOpen"
      ref="card"
      class="capture-card pointer-events-auto absolute z-notice flex flex-col"
      role="dialog"
      aria-labelledby="capture-title"
    >
      <div class="capture-heading flex shrink-0 items-center justify-between gap-4">
        <h2 id="capture-title">Captured sky</h2>
        <button
          class="capture-close grid shrink-0 place-items-center rounded-full"
          data-capture-close
          type="button"
          aria-label="Close captured sky"
          @click="dismiss"
        >
          <PhX :size="15" weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div class="capture-body overflow-y-auto">
        <img
          v-if="previewUrl"
          class="capture-preview block w-full"
          :src="previewUrl"
          :alt="caption ? `${caption[0]}. ${caption[1]}.` : 'The captured sky'"
        >

        <p v-if="caption" class="capture-caption">{{ caption[0] }} · {{ caption[1] }}</p>

        <div class="capture-actions flex flex-col">
          <button type="button" class="flex w-full items-center gap-3 text-left" @click="download">
            <PhDownloadSimple :size="16" aria-hidden="true" />
            <span class="flex-1">Save image</span>
            <span v-if="actionFeedback?.action === 'download'" class="capture-action-feedback" role="status">
              {{ actionFeedback.message }}
            </span>
          </button>
          <button type="button" class="flex w-full items-center gap-3 text-left" @click="copyLink">
            <PhLink :size="16" aria-hidden="true" />
            <span class="flex-1">Copy link</span>
            <span v-if="actionFeedback?.action === 'copy'" class="capture-action-feedback" role="status">
              {{ actionFeedback.message }}
            </span>
          </button>
        </div>
      </div>
    </aside>
  </Transition>
</template>
