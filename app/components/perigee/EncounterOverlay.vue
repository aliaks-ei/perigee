<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { PhArrowRight, PhPause, PhPlay, PhX } from '@phosphor-icons/vue'
import { scienceSources } from '~/data/editorial'
import { analytics } from '~/utils/analytics'

const {
  currentEncounter,
  currentEncounterBeat,
  currentDiscovery,
  currentPrediction,
  predictionResponse,
  encounterStatus,
  encounterBeatIndex,
  encounterTransitioning,
  encounterBeatRevealed,
  startEncounter,
  answerPrediction,
  nextEncounter,
  previousEncounter,
  toggleEncounterPause,
  replayEncounter,
  exitEncounter,
} = usePerigee()
const { capture, capturing } = useCapture()

const overlay = ref<HTMLElement | null>(null)
const observation = ref<HTMLElement | null>(null)
const sourceOpen = ref(false)
const sources = computed(() => currentDiscovery.value?.sourceIds.map((id) =>
  scienceSources.find((source) => source.id === id),
).filter((source) => source !== undefined) ?? [])
const progress = computed(() => {
  const count = currentEncounter.value?.beats.length ?? 1
  return ((encounterBeatIndex.value + 1) / count) * 100
})
const isLastBeat = computed(() => encounterBeatIndex.value === (currentEncounter.value?.beats.length ?? 1) - 1)
const isCaboEncounter = computed(() => currentEncounter.value?.id === 'saturn-edge-of-world')
const showLocator = computed(() => Boolean(
  currentEncounterBeat.value?.locatorLabel
  && encounterBeatRevealed.value
  && !encounterTransitioning.value
  && encounterStatus.value === 'active',
))

watch(encounterStatus, async () => {
  sourceOpen.value = false
  await nextTick()
  if (encounterStatus.value === 'invited') {
    overlay.value?.querySelector<HTMLButtonElement>('.encounter-play')?.focus({ preventScroll: true })
  }
})

watch(encounterBeatRevealed, async (revealed) => {
  if (!revealed) return
  await nextTick()
  observation.value?.focus({ preventScroll: true })
})

function leaveEncounter(): void {
  exitEncounter()
  nextTick(() => document.querySelector<HTMLButtonElement>('[data-encounter-invite]')?.focus())
}

function toggleSource(): void {
  sourceOpen.value = !sourceOpen.value
  if (sourceOpen.value && currentDiscovery.value) {
    analytics.track('discovery_open', { discoveryId: currentDiscovery.value.id })
  }
}
</script>

<template>
  <section
    v-if="currentEncounter"
    ref="overlay"
    class="encounter-overlay pointer-events-none absolute inset-0 z-encounter"
    :class="`status-${encounterStatus}`"
    :aria-label="currentEncounter.title"
  >
    <template v-if="encounterStatus === 'invited'">
      <div class="encounter-invitation text-shadow absolute flex flex-col items-center text-center">
        <p class="font-semibold uppercase">A Perigee encounter</p>
        <h2 class="font-display">{{ currentEncounter.invitation }}</h2>
        <button
          class="encounter-play inline-flex flex-col items-center gap-2.5 font-semibold"
          type="button"
          @click="startEncounter"
        >
          <span class="grid place-items-center rounded-full">
            <PhPlay :size="22" weight="fill" aria-hidden="true" />
          </span>
          Begin · {{ currentEncounter.estimatedMinutes }} min
        </button>
        <button class="encounter-dismiss" type="button" @click="leaveEncounter">Not now</button>
      </div>
    </template>

    <template v-else-if="encounterStatus === 'active' || encounterStatus === 'paused'">
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
          v-else-if="encounterBeatRevealed && !sourceOpen"
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
          <p
            v-if="predictionResponse"
            class="prediction-response"
          >
            {{ predictionResponse }}
          </p>
          <p :class="{ 'sm:!text-2xl': isCaboEncounter }">{{ currentEncounterBeat?.observation }}</p>
          <div
            v-if="currentPrediction"
            class="encounter-prediction flex flex-wrap items-baseline"
            :class="isCaboEncounter ? 'justify-start' : 'justify-center'"
          >
            <p class="prediction-question">{{ currentPrediction.question }}</p>
            <button
              v-for="option in currentPrediction.options"
              :key="option.id"
              class="prediction-option"
              type="button"
              :disabled="encounterStatus === 'paused' || encounterTransitioning"
              @click="answerPrediction(option.id)"
            >
              {{ option.label }}
            </button>
          </div>
          <div
            class="encounter-beat-actions flex flex-wrap items-center"
            :class="isCaboEncounter ? 'justify-start' : 'justify-center'"
          >
            <button
              data-encounter-primary
              class="encounter-primary-action inline-flex items-center gap-2.5 font-semibold"
              type="button"
              :disabled="encounterStatus === 'paused'"
              @click="nextEncounter"
            >
              {{ currentEncounterBeat?.actionLabel }}
              <PhArrowRight :size="15" weight="bold" aria-hidden="true" />
            </button>
            <button
              v-if="currentDiscovery"
              type="button"
              :aria-expanded="sourceOpen"
              aria-controls="encounter-discovery"
              @click="toggleSource"
            >
              How we know
            </button>
            <button
              v-if="isLastBeat"
              type="button"
              data-capture-trigger
              :disabled="capturing"
              @click="capture"
            >
              {{ capturing ? 'Capturing…' : 'Capture this sky' }}
            </button>
            <button v-if="isLastBeat" type="button" @click="replayEncounter">Replay encounter</button>
          </div>
        </div>
      </Transition>

      <Transition name="encounter-title">
        <aside
          v-if="sourceOpen && currentDiscovery"
          id="encounter-discovery"
          class="encounter-discovery pointer-events-auto absolute lt-sm:overflow-y-auto"
        >
          <button class="discovery-close float-right" type="button" @click="sourceOpen = false">Close note</button>
          <p class="discovery-glance">{{ currentDiscovery.glance }}</p>
          <p>{{ currentDiscovery.detail }}</p>
          <p class="discovery-boundary">
            {{ currentDiscovery.boundary === 'calculated' ? 'Calculated by Perigee' : currentDiscovery.boundary === 'rendered' ? 'Rendered, not physically simulated' : 'Described, not simulated' }}
          </p>
          <a
            v-for="source in sources"
            :key="source.id"
            :href="source.url"
            target="_blank"
            rel="noreferrer"
          >
            {{ source.publisher }} · reviewed {{ source.reviewedOn }}
          </a>
        </aside>
      </Transition>

      <nav class="encounter-transport absolute grid items-center" aria-label="Encounter progress">
        <span class="encounter-progress absolute overflow-hidden" aria-hidden="true"><i :style="{ width: `${progress}%` }" /></span>
        <span class="encounter-count lt-sm:hidden">{{ encounterBeatIndex + 1 }} of {{ currentEncounter.beats.length }}</span>
        <button
          class="inline-flex items-center gap-1.5"
          type="button"
          :disabled="encounterBeatIndex === 0 || encounterTransitioning"
          @click="previousEncounter"
        >
          Previous
        </button>
        <button
          class="inline-flex items-center gap-1.5"
          type="button"
          :disabled="encounterTransitioning"
          @click="toggleEncounterPause"
        >
          <PhPlay v-if="encounterStatus === 'paused'" :size="13" weight="fill" aria-hidden="true" />
          <PhPause v-else :size="13" weight="fill" aria-hidden="true" />
          {{ encounterStatus === 'paused' ? 'Resume' : 'Pause' }}
        </button>
      </nav>
    </template>
  </section>
</template>
