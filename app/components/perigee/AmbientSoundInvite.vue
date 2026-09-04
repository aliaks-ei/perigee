<script setup lang="ts">
import { PhMusicNotesSimple, PhX } from '@phosphor-icons/vue'

/**
 * The one time the music is offered. No browser will start audio before the
 * viewer has done something, so it cannot simply play; and a modal asking
 * permission on arrival would be exactly the interruption the rest of this
 * interface avoids.
 *
 * So it waits. The offer appears at `explore`, once the viewer has changed
 * something and proved they are here for the sky rather than passing through,
 * and it takes the slot the drag and rail hints have already vacated. It reads
 * as one more quiet line of guidance, and it is answered by ignoring it.
 *
 * Either answer is recorded, including the silent one: after sixteen seconds
 * the offer withdraws itself and counts as a no. Asking again on every visit
 * would be the nagging this is trying not to be, and the sound row in the
 * "more" sheet is there for anyone who changes their mind.
 *
 * A viewer who has turned the sound on before is never shown this at all.
 * `useAmbientSound` starts their music under the first gesture of the session.
 */
const OFFER_LIFETIME_MS = 16_000
/**
 * Long enough for the rail hint to finish leaving the slot this takes over,
 * and for the change the viewer just made to have landed. An offer that
 * appears on the same frame as the action reads as a reaction to it.
 */
const OFFER_DELAY_MS = 1_500

const {
  currentViewpointId,
  loading,
  capabilityError,
  objectBrowserOpen,
  moreOpen,
  encounterStatus,
  hintVisible,
  revealed,
} = usePerigee()
const { status, undecided, toggle, decline } = useAmbientSound(currentViewpointId)

const withdrawn = ref(false)
const armed = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let armTimer: ReturnType<typeof setTimeout> | null = null

watch(() => revealed('explore') && !hintVisible.value, (ready) => {
  if (!ready || armed.value || armTimer) return
  armTimer = setTimeout(() => { armed.value = true }, OFFER_DELAY_MS)
}, { immediate: true })

// It shares the slot with the drag hint and the rail hint, and waits for both:
// a shared link starts at `explore`, so the offer is otherwise ready before the
// drag hint has even been shown, and the two land on top of each other.
const offered = computed(() =>
  armed.value && undecided.value && !withdrawn.value && status.value === 'off'
  && encounterStatus.value === 'idle' && !hintVisible.value
  && !loading.value && !capabilityError.value && !objectBrowserOpen.value && !moreOpen.value)

// The clock only runs while the offer is actually on screen: opening the
// "more" sheet or the object browser hides it, and it should not expire behind
// them without ever having been read.
watch(offered, (visible) => {
  if (timer) clearTimeout(timer)
  timer = null
  if (!visible) return
  timer = setTimeout(() => {
    withdrawn.value = true
    decline()
  }, OFFER_LIFETIME_MS)
}, { immediate: true })

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  if (armTimer) clearTimeout(armTimer)
})

function accept(): void {
  withdrawn.value = true
  void toggle()
}

function dismiss(): void {
  withdrawn.value = true
  decline()
}
</script>

<template>
  <Transition name="hint">
    <div v-if="offered" class="sound-invite absolute z-identity flex items-center">
      <button type="button" class="sound-invite-accept flex items-center gap-2 font-semibold uppercase" @click="accept">
        <PhMusicNotesSimple :size="14" weight="regular" aria-hidden="true" />
        <span>Play music for this sky</span>
      </button>
      <button
        type="button"
        class="sound-invite-dismiss grid place-items-center rounded-full"
        aria-label="No music"
        @click="dismiss"
      >
        <PhX :size="12" weight="bold" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>
