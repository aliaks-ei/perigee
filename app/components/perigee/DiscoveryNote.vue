<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { scienceSources } from '~/data/editorial'

/**
 * The editorial note for the view at rest. It opens as its own layer where
 * the capture card also lands, so it never changes the height of the title
 * block beneath it. Escape closes it and hands focus back to its trigger, the
 * way every other panel does.
 */
const { freeDiscovery, discoveryOpen, closeDiscovery } = usePerigee()

const sources = computed(() => freeDiscovery.value?.sourceIds.map((id) =>
  scienceSources.find((source) => source.id === id),
).filter((source) => source !== undefined) ?? [])

function dismiss(): void {
  closeDiscovery()
  nextTick(() => document.querySelector<HTMLButtonElement>('[data-discovery-trigger]')?.focus({ preventScroll: true }))
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !discoveryOpen.value) return
  event.stopPropagation()
  dismiss()
}

onMounted(() => window.addEventListener('keydown', handleKeydown, true))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown, true))
</script>

<template>
  <Transition name="hint">
    <aside
      v-if="discoveryOpen && freeDiscovery"
      class="free-discovery pointer-events-auto absolute z-notice"
      aria-label="About this view"
    >
      <button
        class="discovery-close absolute right-2 top-2 grid h-11 w-11 place-items-center"
        data-discovery-close
        type="button"
        aria-label="Close discovery"
        @click="dismiss"
      >
        <PhX :size="13" weight="bold" aria-hidden="true" />
      </button>
      <p class="discovery-glance">{{ freeDiscovery.glance }}</p>
      <p>{{ freeDiscovery.detail }}</p>
      <span class="discovery-boundary block font-semibold uppercase">
        {{ freeDiscovery.boundary === 'calculated' ? 'Calculated by Perigee' : freeDiscovery.boundary === 'rendered' ? 'Rendered, not physically simulated' : 'Described, not simulated' }}
      </span>
      <a
        v-for="source in sources"
        :key="source.id"
        :href="source.url"
        target="_blank"
        rel="noreferrer"
      >{{ source.publisher }} · reviewed {{ source.reviewedOn }}</a>
    </aside>
  </Transition>
</template>
