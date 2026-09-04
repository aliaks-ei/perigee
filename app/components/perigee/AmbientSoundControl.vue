<script setup lang="ts">
import { PhSpeakerHigh, PhSpeakerSlash } from '@phosphor-icons/vue'

/**
 * The music as one row of the "more" sheet: a toggle with its state, and the
 * volume beneath it while it is playing. It used to be a lone circle in the
 * corner in the quietest ink, which nobody found.
 *
 * This is the permanent home of the control. `AmbientSoundInvite.vue` is the
 * one-time offer that points a first-time listener at it.
 */
const { currentViewpointId } = usePerigee()
const { status, volume, toggle, setVolume } = useAmbientSound(currentViewpointId)
const audible = computed(() => status.value === 'starting' || status.value === 'playing')
const stateLabel = computed(() => {
  if (status.value === 'starting') return 'Starting'
  if (status.value === 'unavailable') return 'Unavailable'
  if (status.value === 'suspended') return 'Paused'
  return audible.value ? 'On' : 'Off'
})

function handleVolume(event: Event): void {
  setVolume(Number((event.target as HTMLInputElement).value) / 100)
}
</script>

<template>
  <div class="ambient-sound" :class="{ audible, unavailable: status === 'unavailable' }">
    <button
      type="button"
      class="more-item flex w-full items-center justify-between gap-4 text-left"
      :aria-pressed="audible"
      :disabled="status === 'unavailable'"
      @click="toggle"
    >
      <span class="flex items-center gap-3">
        <PhSpeakerHigh v-if="audible" :size="16" weight="regular" aria-hidden="true" />
        <PhSpeakerSlash v-else :size="16" weight="regular" aria-hidden="true" />
        Ambient music
      </span>
      <span class="more-state font-semibold uppercase">{{ stateLabel }}</span>
    </button>

    <Transition name="collapse">
      <div v-if="audible" class="collapsible">
        <div>
          <label class="ambient-volume flex items-center gap-3" for="ambient-volume">
            <span class="sr-only">Music volume</span>
            <input
              id="ambient-volume"
              type="range"
              min="0"
              max="100"
              step="1"
              :value="Math.round(volume * 100)"
              @input="handleVolume"
            >
            <output for="ambient-volume">{{ Math.round(volume * 100) }}%</output>
          </label>
        </div>
      </div>
    </Transition>
  </div>
</template>
