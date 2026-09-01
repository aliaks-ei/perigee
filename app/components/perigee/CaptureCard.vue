<script setup lang="ts">
import { nextTick, onBeforeUnmount, watch } from 'vue'
import { PhX } from '@phosphor-icons/vue'

const {
  captureOpen,
  captionEnabled,
  previewUrl,
  caption,
  shareMessage,
  share,
  download,
  copyLink,
  setCaption,
  close,
} = useCapture()

const card = ref<HTMLElement | null>(null)

watch(captureOpen, async (open) => {
  if (!open) return
  await nextTick()
  card.value?.querySelector<HTMLButtonElement>('[data-capture-primary]')?.focus({ preventScroll: true })
})

function dismiss(): void {
  close()
  nextTick(() => document.querySelector<HTMLButtonElement>('[data-capture-trigger]')?.focus())
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
      class="capture-card pointer-events-auto absolute z-notice"
      aria-label="Your captured sky"
    >
      <button
        class="capture-close absolute right-2 top-2 grid h-8 w-8 place-items-center"
        type="button"
        aria-label="Close capture"
        @click="dismiss"
      >
        <PhX :size="13" weight="bold" aria-hidden="true" />
      </button>

      <img
        v-if="previewUrl"
        class="capture-preview block w-full"
        :src="previewUrl"
        :alt="caption ? `${caption[0]}. ${caption[1]}.` : 'The captured sky'"
      >

      <p v-if="caption" class="capture-caption">{{ caption[0] }} · {{ caption[1] }}</p>

      <div class="capture-actions flex flex-wrap items-center">
        <button data-capture-primary type="button" class="capture-primary" @click="share">
          Share
        </button>
        <button type="button" @click="download">Save image</button>
        <button type="button" @click="copyLink">Copy link</button>
      </div>

      <label class="capture-toggle flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          :checked="captionEnabled"
          @change="setCaption(($event.target as HTMLInputElement).checked)"
        >
        Caption on the image
      </label>

      <p class="capture-message" role="status">{{ shareMessage }}</p>
    </aside>
  </Transition>
</template>
