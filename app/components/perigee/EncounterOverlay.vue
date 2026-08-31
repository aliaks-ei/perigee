<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { PhArrowRight, PhPause, PhPlay, PhX } from '@phosphor-icons/vue'
import { scienceSources } from '~/data/editorial'
import { analytics } from '~/utils/analytics'

const {
  currentEncounter,
  currentEncounterBeat,
  currentDiscovery,
  encounterStatus,
  encounterBeatIndex,
  encounterTransitioning,
  encounterBeatRevealed,
  startEncounter,
  nextEncounter,
  previousEncounter,
  toggleEncounterPause,
  replayEncounter,
  exitEncounter,
  getObjectScreenPosition,
} = usePerigee()

const overlay = ref<HTMLElement | null>(null)
const observation = ref<HTMLElement | null>(null)
const locator = ref<HTMLElement | null>(null)
const sourceOpen = ref(false)
const sources = computed(() => currentDiscovery.value?.sourceIds.map((id) =>
  scienceSources.find((source) => source.id === id),
).filter((source) => source !== undefined) ?? [])
const progress = computed(() => {
  const count = currentEncounter.value?.beats.length ?? 1
  return ((encounterBeatIndex.value + 1) / count) * 100
})
const isLastBeat = computed(() => encounterBeatIndex.value === (currentEncounter.value?.beats.length ?? 1) - 1)
const showLocator = computed(() => Boolean(
  currentEncounterBeat.value?.locatorLabel
  && encounterBeatRevealed.value
  && !encounterTransitioning.value
  && encounterStatus.value === 'active',
))
let locatorFrame: number | null = null

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

watch(showLocator, async (show) => {
  if (locatorFrame !== null) cancelAnimationFrame(locatorFrame)
  locatorFrame = null
  if (!show) return
  await nextTick()
  updateLocator()
})

onBeforeUnmount(() => {
  if (locatorFrame !== null) cancelAnimationFrame(locatorFrame)
})

function updateLocator(): void {
  const element = locator.value
  const point = getObjectScreenPosition()
  if (element && point) {
    const x = Math.min(Math.max(point.x, 0.04), 0.96)
    const y = Math.min(Math.max(point.y, 0.06), 0.78)
    element.style.setProperty('--locator-x', `${x * 100}%`)
    element.style.setProperty('--locator-y', `${y * 100}%`)
    element.classList.toggle('off-screen', !point.onScreen)
    element.classList.toggle('align-left', x > 0.72)
  }
  locatorFrame = requestAnimationFrame(updateLocator)
}

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

      <div
        v-if="showLocator"
        ref="locator"
        class="celestial-locator pointer-events-none absolute z-locator"
        aria-hidden="true"
      >
        <svg class="locator-arrow absolute block" viewBox="0 0 76 40" aria-hidden="true">
          <path d="M70 5C48 8 27 18 9 33" />
          <path d="M10 23L9 33L20 32" />
        </svg>
        <span class="locator-label text-shadow absolute font-semibold uppercase">{{ currentEncounterBeat?.locatorLabel }}</span>
      </div>

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
          class="encounter-observation text-shadow absolute text-center"
          tabindex="-1"
          aria-live="polite"
        >
          <p>{{ currentEncounterBeat?.observation }}</p>
          <div class="encounter-beat-actions flex flex-wrap items-center justify-center">
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
