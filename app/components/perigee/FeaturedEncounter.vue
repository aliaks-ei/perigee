<script setup lang="ts">
import { PhArrowRight, PhCaretDown } from '@phosphor-icons/vue'
import { encountersById, featuredEncounters } from '~/data/editorial'
import type { FeaturedEncounterDefinition } from '~/types/editorial'
import { analytics } from '~/utils/analytics'
import {
  featureArchive,
  featureForMonth,
  formatFeatureMonth,
} from '~/utils/monthlyFeatures'

const { inviteEncounter, objectBrowserOpen } = usePerigee()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panelOpen = ref(false)
const archiveOpen = ref(false)
const now = new Date()
const currentFeature = featureForMonth(featuredEncounters, now)
const archivedFeatures = featureArchive(featuredEncounters, now)
const currentEncounter = currentFeature
  ? encountersById[currentFeature.encounterId]
  : null

watch(objectBrowserOpen, (open) => {
  if (open) close(false)
})

onMounted(() => {
  document.addEventListener('pointerdown', handleOutside)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutside)
  document.removeEventListener('keydown', handleKeydown)
})

function togglePanel(): void {
  panelOpen.value = !panelOpen.value
  if (!panelOpen.value) archiveOpen.value = false
  if (panelOpen.value) {
    analytics.track('featured_encounter_open', {
      month: currentFeature?.month ?? '',
      hasCurrent: Boolean(currentFeature),
    })
  }
}

function close(restoreFocus = true): void {
  if (!panelOpen.value) return
  panelOpen.value = false
  archiveOpen.value = false
  if (restoreFocus) nextTick(() => trigger.value?.focus({ preventScroll: true }))
}

function handleOutside(event: PointerEvent): void {
  if (!panelOpen.value || root.value?.contains(event.target as Node)) return
  close(false)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !panelOpen.value) return
  close()
  event.preventDefault()
}

function selectFeature(
  feature: FeaturedEncounterDefinition,
  placement: 'current' | 'archive',
): void {
  analytics.track('featured_encounter_select', {
    featureId: feature.id,
    encounterId: feature.encounterId,
    placement,
  })
  close(false)
  inviteEncounter(feature.encounterId)
}
</script>

<template>
  <div ref="root" class="featured-encounter pointer-events-auto relative">
    <button
      ref="trigger"
      type="button"
      class="feature-trigger inline-flex min-h-10 items-center gap-2.5 text-left"
      data-feature-trigger
      :aria-expanded="panelOpen"
      aria-controls="featured-encounter-panel"
      @click="togglePanel"
    >
      <span class="feature-orbit relative block rounded-full" aria-hidden="true"><i /></span>
      <span>
        <span class="feature-kicker block font-semibold uppercase">
          {{ currentFeature ? 'This month' : 'Featured skies' }}
        </span>
        <span class="feature-name block">
          {{ currentFeature?.shortTitle ?? 'Past encounters' }}
        </span>
      </span>
      <PhCaretDown :size="12" weight="bold" aria-hidden="true" :class="{ rotated: panelOpen }" />
    </button>

    <Transition name="dock">
      <section
        v-if="panelOpen"
        id="featured-encounter-panel"
        class="feature-panel absolute"
        aria-label="Featured encounters"
      >
        <template v-if="currentFeature && currentEncounter">
          <p class="feature-month font-semibold uppercase">{{ formatFeatureMonth(currentFeature.month) }}</p>
          <h2 class="font-display">{{ currentEncounter.title }}</h2>
          <p class="feature-summary">{{ currentFeature.summary }}</p>
          <button
            type="button"
            class="feature-primary inline-flex min-h-11 items-center gap-2.5 font-semibold"
            @click="selectFeature(currentFeature, 'current')"
          >
            Begin encounter
            <PhArrowRight :size="14" weight="bold" aria-hidden="true" />
          </button>
        </template>

        <button
          v-if="archivedFeatures.length"
          type="button"
          class="feature-archive-trigger flex min-h-10 items-center gap-2 font-semibold uppercase"
          :aria-expanded="archiveOpen"
          aria-controls="featured-encounter-archive"
          @click="archiveOpen = !archiveOpen"
        >
          Past featured skies
          <PhCaretDown :size="11" weight="bold" aria-hidden="true" :class="{ rotated: archiveOpen }" />
        </button>

        <Transition name="collapse">
          <div v-if="archiveOpen" id="featured-encounter-archive" class="collapsible">
            <div>
              <ol class="feature-archive">
                <li v-for="feature in archivedFeatures" :key="feature.id">
                  <button type="button" @click="selectFeature(feature, 'archive')">
                    <span>{{ formatFeatureMonth(feature.month) }}</span>
                    <strong>{{ encountersById[feature.encounterId]?.title }}</strong>
                  </button>
                </li>
              </ol>
            </div>
          </div>
        </Transition>
      </section>
    </Transition>
  </div>
</template>
