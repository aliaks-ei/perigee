<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { PhWarningDiamond, PhX } from '@phosphor-icons/vue'
import { discoveries, scienceSources } from '~/data/editorial'
import { analytics } from '~/utils/analytics'
import { resolveDiscovery } from '~/utils/discoveryCalculations'
import { formatAngularDiameter, formatDistance } from '~/utils/formatters'

const {
  currentObject,
  currentPreset,
  angularDiameter,
  hazardCopy,
  busy,
  hasInteracted,
  availableEncounter,
  inviteEncounter,
} = usePerigee()
const { capture, capturing } = useCapture()

const discoveryOpen = ref(false)
const freeDiscovery = computed(() => {
  const discovery = discoveries.find((candidate) =>
    candidate.scope.objectId === currentObject.value.id
      && (!candidate.scope.presetId || candidate.scope.presetId === currentPreset.value.id),
  )
  return discovery ? resolveDiscovery(discovery) : null
})
const discoverySources = computed(() => freeDiscovery.value?.sourceIds.map((id) =>
  scienceSources.find((source) => source.id === id),
).filter((source) => source !== undefined) ?? [])

watch([currentObject, currentPreset], () => { discoveryOpen.value = false })

async function openDiscovery(): Promise<void> {
  if (!freeDiscovery.value) return
  discoveryOpen.value = true
  analytics.track('discovery_open', { discoveryId: freeDiscovery.value.id })
      await nextTick()
      document.querySelector<HTMLButtonElement>('[data-discovery-close]')?.focus()
    }

    async function closeDiscovery(): Promise<void> {
      discoveryOpen.value = false
      await nextTick()
      document.querySelector<HTMLButtonElement>('[data-discovery-trigger]')?.focus()
    }
    </script>

<template>
  <section
    class="object-identity pointer-events-none absolute z-identity"
    :class="{ transitioning: busy }"
    aria-live="polite"
    aria-atomic="true"
  >
    <p class="identity-kicker text-shadow items-center gap-2 font-semibold uppercase">
      <span class="kicker-dot" aria-hidden="true" />
      {{ currentObject.kind === 'star' ? 'Star' : currentObject.kind === 'galaxy' ? 'Spiral galaxy' : currentObject.kind === 'moon' ? 'Natural satellite' : 'Planet' }}
    </p>

    <h1 class="font-display">{{ currentObject.label }}</h1>

    <p class="object-metadata text-shadow flex flex-wrap items-center gap-3">
      <span class="metadata-lead">{{ formatAngularDiameter(angularDiameter) }}</span>
      <span aria-hidden="true" class="metadata-rule" />
      <span>{{ formatDistance(currentPreset.distanceKm) }}</span>
      <span aria-hidden="true" class="metadata-rule" />
      <span>{{ currentPreset.metadataLabel ?? currentPreset.label }}</span>
    </p>

    <div class="identity-actions pointer-events-auto flex items-center gap-5 lt-sm:gap-3.5 lt-sm:overflow-x-auto">
      <button
        v-if="availableEncounter"
        type="button"
        class="encounter-invite text-shadow font-semibold uppercase lt-sm:whitespace-nowrap"
        data-encounter-invite
        @click="inviteEncounter()"
      >
        Guided encounter · {{ availableEncounter.estimatedMinutes }} min
      </button>
      <button
        v-if="freeDiscovery && !discoveryOpen"
        type="button"
        class="encounter-invite text-shadow font-semibold uppercase lt-sm:whitespace-nowrap"
        data-discovery-trigger
        @click="openDiscovery"
      >
        Discover this view
      </button>
      <!-- Held back until the viewer has composed a sky of their own, so the
           resting first frame keeps to two actions. -->
      <button
        v-if="hasInteracted"
        type="button"
        class="encounter-invite text-shadow font-semibold uppercase lt-sm:whitespace-nowrap"
        data-capture-trigger
        :disabled="capturing || busy"
        @click="capture"
      >
        {{ capturing ? 'Capturing…' : 'Capture this sky' }}
      </button>
    </div>

    <!-- The identity block is anchored to its bottom edge, so this note changes
         the height of everything above it. `collapse` animates that height. -->
    <Transition name="collapse">
      <div v-if="discoveryOpen && freeDiscovery" class="collapsible">
        <div>
          <aside class="free-discovery text-shadow pointer-events-auto relative">
            <button
              class="absolute right-0 top-2 grid h-8 w-8 place-items-center text-ink-tertiary"
              data-discovery-close
              type="button"
              aria-label="Close discovery"
              @click="closeDiscovery"
            >
              <PhX :size="13" weight="bold" aria-hidden="true" />
            </button>
            <p>{{ freeDiscovery.glance }}</p>
            <p>{{ freeDiscovery.detail }}</p>
            <span>{{ freeDiscovery.boundary === 'calculated' ? 'Calculated by Perigee' : 'Rendered, not physically simulated' }}</span>
            <a
              v-for="source in discoverySources"
              :key="source.id"
              :href="source.url"
              target="_blank"
              rel="noreferrer"
            >{{ source.publisher }} · reviewed {{ source.reviewedOn }}</a>
          </aside>
        </div>
      </div>
    </Transition>

    <Transition name="collapse">
      <div v-if="hazardCopy" class="collapsible">
        <div>
          <p class="hazard-notice text-shadow inline-flex items-center">
            <PhWarningDiamond :size="15" weight="fill" aria-hidden="true" />
            <span>{{ hazardCopy }}</span>
          </p>
        </div>
      </div>
    </Transition>
  </section>
</template>
