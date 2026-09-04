<script setup lang="ts">
import { PhMusicNotesSimple } from '@phosphor-icons/vue'

/**
 * The music, as a single control that rests where every immersive site keeps
 * its sound toggle: the top corner, beside "more". The offer to start it is
 * made once, on the loading screen; after that this is the only sign of it
 * over the sky. The volume lives in the "more" sheet.
 */
const { currentViewpointId } = usePerigee()
const { status, toggle } = useAmbientSound(currentViewpointId)
const audible = computed(() => status.value === 'starting' || status.value === 'playing')
const label = computed(() => {
  if (status.value === 'unavailable') return 'Music unavailable'
  return audible.value ? 'Turn the music off' : 'Play music for this sky'
})
</script>

<template>
  <button
    type="button"
    class="sound-toggle grid place-items-center rounded-full"
    :class="{ audible }"
    :aria-pressed="audible"
    :aria-label="label"
    :title="label"
    :disabled="status === 'unavailable'"
    @click="toggle"
  >
    <PhMusicNotesSimple :size="17" weight="regular" aria-hidden="true" />
    <span v-if="audible" class="sound-toggle-pulse" aria-hidden="true" />
  </button>
</template>
