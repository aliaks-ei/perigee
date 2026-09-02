<script setup lang="ts">
import { PhCaretUp, PhSpeakerHigh, PhSpeakerSlash } from '@phosphor-icons/vue'

const { currentViewpointId } = usePerigee()
const { status, volume, toggle, setVolume } = useAmbientSound(currentViewpointId)
const root = ref<HTMLElement | null>(null)
const disclosure = ref<HTMLButtonElement | null>(null)
const volumeOpen = ref(false)
const audible = computed(() => status.value === 'starting' || status.value === 'playing')
const buttonLabel = computed(() => audible.value ? 'Turn ambient sound off' : 'Turn ambient sound on')
const statusLabel = computed(() => {
  if (status.value === 'starting') return 'Starting ambient sound'
  if (status.value === 'unavailable') return 'Ambient sound unavailable'
  if (status.value === 'suspended') return 'Ambient sound paused'
  return audible.value ? 'Ambient sound on' : 'Ambient sound off'
})

watch(audible, (isAudible) => {
  if (!isAudible) volumeOpen.value = false
})

onMounted(() => {
  document.addEventListener('pointerdown', handleOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutside)
  document.removeEventListener('keydown', handleKeydown)
})

function handleOutside(event: PointerEvent): void {
  if (!volumeOpen.value || root.value?.contains(event.target as Node)) return
  volumeOpen.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !volumeOpen.value) return
  volumeOpen.value = false
  nextTick(() => disclosure.value?.focus({ preventScroll: true }))
  event.preventDefault()
}

function handleVolume(event: Event): void {
  setVolume(Number((event.target as HTMLInputElement).value) / 100)
}
</script>

<template>
  <Transition name="chrome">
    <div
      ref="root"
      class="ambient-sound pointer-events-auto absolute z-encounter flex items-center"
      :class="{ audible, unavailable: status === 'unavailable' }"
    >
      <Transition name="dock">
        <div
          v-if="volumeOpen"
          id="ambient-volume-panel"
          class="ambient-volume-panel absolute"
        >
          <label class="flex items-center justify-between gap-8" for="ambient-volume">
            <span>Ambient volume</span>
            <output :for="'ambient-volume'">{{ Math.round(volume * 100) }}%</output>
          </label>
          <input
            id="ambient-volume"
            type="range"
            min="0"
            max="100"
            step="1"
            :value="Math.round(volume * 100)"
            @input="handleVolume"
          >
        </div>
      </Transition>

      <button
        type="button"
        class="ambient-toggle grid place-items-center rounded-full"
        :aria-label="buttonLabel"
        :aria-pressed="audible"
        :title="statusLabel"
        @click="toggle"
      >
        <Transition name="fade" mode="out-in">
          <PhSpeakerHigh v-if="audible" key="on" :size="17" weight="regular" aria-hidden="true" />
          <PhSpeakerSlash v-else key="off" :size="17" weight="regular" aria-hidden="true" />
        </Transition>
      </button>

      <Transition name="fade">
        <button
          v-if="audible"
          ref="disclosure"
          type="button"
          class="ambient-volume-trigger grid place-items-center"
          aria-label="Adjust ambient sound volume"
          :aria-expanded="volumeOpen"
          aria-controls="ambient-volume-panel"
          @click="volumeOpen = !volumeOpen"
        >
          <PhCaretUp :size="10" weight="bold" aria-hidden="true" :class="{ rotated: volumeOpen }" />
        </button>
      </Transition>
    </div>
  </Transition>
</template>
