<script setup lang="ts">
import { PhPlay, PhWarningDiamond } from '@phosphor-icons/vue'
import { formatAngularDiameter, formatDistance } from '~/utils/formatters'

/**
 * The name of what is in the sky, and the one thing to do about it.
 *
 * The block is anchored to its bottom edge, so everything that can appear
 * later sits in a slot that is already there: the metadata line, the action
 * row and the hazard line each hold their height whether or not they have
 * anything to show. Nothing that arrives moves the title or a button the
 * viewer has already aimed at.
 */
const {
  currentObject,
  currentPreset,
  angularDiameter,
  hazardCopy,
  busy,
  freeDiscovery,
  discoveryOpen,
  availableEncounter,
  revealed,
  inviteEncounter,
  openDiscovery,
} = usePerigee()

const kind = computed(() => {
  switch (currentObject.value.kind) {
    case 'star': return 'Star'
    case 'galaxy': return 'Spiral galaxy'
    case 'moon': return 'Natural satellite'
    default: return 'Planet'
  }
})
const discoverySeen = ref(false)

watch(() => currentObject.value.id, () => {
  discoverySeen.value = false
})

async function open(): Promise<void> {
  discoverySeen.value = true
  openDiscovery()
  await nextTick()
  document.querySelector<HTMLButtonElement>('[data-discovery-close]')?.focus({ preventScroll: true })
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
      {{ kind }}
    </p>

    <h1 class="font-display">{{ currentObject.label }}</h1>

    <div class="identity-metadata-slot">
      <Transition name="hint">
        <p v-if="revealed('orient')" class="object-metadata text-shadow flex flex-wrap items-center gap-3">
          <span class="metadata-lead">{{ formatAngularDiameter(angularDiameter) }}</span>
          <span aria-hidden="true" class="metadata-rule" />
          <span>{{ formatDistance(currentPreset.distanceKm) }}</span>
          <span aria-hidden="true" class="metadata-rule metadata-detail-rule" />
          <span class="metadata-detail">{{ currentPreset.metadataLabel ?? currentPreset.label }}</span>
        </p>
      </Transition>
    </div>

    <div class="hazard-slot">
      <Transition name="hazard">
        <p v-if="hazardCopy && revealed('explore')" class="hazard-notice text-shadow inline-flex items-center">
          <PhWarningDiamond :size="15" weight="fill" aria-hidden="true" />
          <span>{{ hazardCopy }}</span>
        </p>
      </Transition>
    </div>

    <!-- One contextual action, chosen by stage. The note for this view comes
         first; the guided encounter, a two-minute commitment, waits until the
         viewer has settled in and then arrives as a small card. -->
    <div
      class="identity-actions pointer-events-auto flex items-center gap-5 lt-sm:flex-col lt-sm:items-start lt-sm:gap-1.5"
      :class="{ 'has-discovery': Boolean(freeDiscovery), 'discovery-seen': discoverySeen }"
    >
      <Transition name="hint">
        <button
          v-if="revealed('deepen') && availableEncounter"
          type="button"
          class="encounter-card flex items-center gap-3 text-left"
          data-encounter-invite
          @click="inviteEncounter()"
        >
          <span class="encounter-card-play grid place-items-center rounded-full" aria-hidden="true">
            <PhPlay :size="11" weight="fill" />
          </span>
          <span class="flex flex-col gap-0.5">
            <span class="encounter-card-kicker font-semibold uppercase">Guided encounter · {{ availableEncounter.estimatedMinutes }} min</span>
            <span class="encounter-card-title">{{ availableEncounter.title }}</span>
          </span>
        </button>
      </Transition>
      <Transition name="hint">
        <button
          v-if="revealed('explore') && freeDiscovery && !discoveryOpen"
          type="button"
          class="encounter-invite text-shadow font-semibold uppercase lt-sm:whitespace-nowrap"
          data-discovery-trigger
          @click="open"
        >
          Discover this view
        </button>
      </Transition>
    </div>
  </section>
</template>
