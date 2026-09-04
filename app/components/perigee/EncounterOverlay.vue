<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { PhArrowRight, PhX } from '@phosphor-icons/vue'

/**
 * A running encounter: one observation, one action, a progress line and a
 * way out. Everything else the sky already says.
 *
 * The last beat's single action hands the viewer to the free interface at
 * that view, where the note for the view and the capture control live. The
 * encounter itself carries neither, so its end is one choice rather than
 * four.
 */
const {
  currentEncounter,
  currentEncounterBeat,
  encounterStatus,
  encounterBeatIndex,
  encounterTransitioning,
  encounterBeatRevealed,
  nextEncounter,
  exitEncounter,
} = usePerigee()

const observation = ref<HTMLElement | null>(null)
const progress = computed(() => {
  const count = currentEncounter.value?.beats.length ?? 1
  return ((encounterBeatIndex.value + 1) / count) * 100
})
const isCaboEncounter = computed(() => currentEncounter.value?.id === 'saturn-edge-of-world')
const showLocator = computed(() => Boolean(
  currentEncounterBeat.value?.locatorLabel
  && encounterBeatRevealed.value
  && !encounterTransitioning.value
  && encounterStatus.value === 'active',
))

watch(encounterBeatRevealed, async (revealed) => {
  if (!revealed) return
  await nextTick()
  observation.value?.focus({ preventScroll: true })
})

function leaveEncounter(): void {
  exitEncounter()
  nextTick(() => document.querySelector<HTMLButtonElement>('[data-more-trigger]')?.focus())
}
</script>

<template>
  <section
    v-if="currentEncounter && encounterStatus === 'active'"
    class="encounter-overlay pointer-events-none absolute inset-0 z-encounter"
    :aria-label="currentEncounter.title"
  >
    <button
      class="encounter-exit absolute inline-flex items-center gap-2 font-semibold uppercase"
      type="button"
      @click="leaveEncounter"
    >
      <PhX :size="14" weight="bold" aria-hidden="true" />
      Exit encounter
    </button>

    <PerigeeCelestialLocator
      :active="showLocator"
      :label="currentEncounterBeat?.locatorLabel ?? ''"
    />

    <Transition name="encounter-title" mode="out-in">
      <div
        v-if="encounterTransitioning"
        key="transitioning"
        class="encounter-transition-state text-shadow absolute flex flex-col items-center gap-3.5 text-center font-semibold uppercase"
        role="status"
      >
        <span class="transition-orbit relative block animate-orbit-turn rounded-full" aria-hidden="true"><i /></span>
        <p>{{ currentEncounterBeat?.transitionLabel ?? 'Changing the view' }}</p>
      </div>
      <div
        v-else-if="encounterBeatRevealed"
        :key="currentEncounterBeat?.id"
        ref="observation"
        class="encounter-observation text-shadow absolute"
        :class="isCaboEncounter
          ? 'right-auto left-4 w-11/12 translate-x-0 text-left sm:left-16 sm:w-full sm:max-w-2xl'
          : 'text-center'"
        tabindex="-1"
        aria-live="polite"
      >
        <span
          v-if="isCaboEncounter"
          class="mb-3 block text-xs font-semibold uppercase tracking-widest text-accent"
        >
          A Perigee encounter
        </span>
        <p :class="{ 'sm:!text-2xl': isCaboEncounter }">{{ currentEncounterBeat?.observation }}</p>
        <div
          class="encounter-beat-actions flex flex-wrap items-center"
          :class="isCaboEncounter ? 'justify-start' : 'justify-center'"
        >
          <button
            data-encounter-primary
            class="encounter-primary-action inline-flex items-center gap-2.5 font-semibold"
            type="button"
            @click="nextEncounter"
          >
            {{ currentEncounterBeat?.actionLabel }}
            <PhArrowRight :size="15" weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Transition>

    <div
      class="encounter-transport absolute"
      role="progressbar"
      aria-label="Encounter progress"
      :aria-valuenow="encounterBeatIndex + 1"
      aria-valuemin="1"
      :aria-valuemax="currentEncounter.beats.length"
    >
      <span class="encounter-progress absolute overflow-hidden" aria-hidden="true"><i :style="{ width: `${progress}%` }" /></span>
    </div>
  </section>
</template>
