<script setup lang="ts">
import { PhArrowRight } from '@phosphor-icons/vue'
import { encountersById, featuredEncounters } from '~/data/editorial'
import { analytics } from '~/utils/analytics'
import { featureForMonth, formatFeatureMonth, utcMonthKey } from '~/utils/monthlyFeatures'

/**
 * The month's featured encounter, offered once. It arrives after the viewer
 * has settled in, can be dismissed, and does not come back that month on the
 * same browser. The archive lives in the "more" sheet.
 */
const FEATURE_SEEN_KEY = 'perigee:feature-seen'

const { revealed, encounterStatus, objectBrowserOpen, moreOpen, inviteEncounter } = usePerigee()

const now = new Date()
const month = utcMonthKey(now)
const feature = featureForMonth(featuredEncounters, now)
const encounter = feature ? encountersById[feature.encounterId] : null
const dismissed = ref(readSeen() === month)
const visible = computed(() => Boolean(feature && encounter)
  && !dismissed.value
  && revealed('deepen')
  && encounterStatus.value === 'idle'
  && !objectBrowserOpen.value
  && !moreOpen.value)

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(FEATURE_SEEN_KEY)
  } catch {
    return null
  }
}

function markSeen(): void {
  dismissed.value = true
  try {
    window.localStorage.setItem(FEATURE_SEEN_KEY, month)
  } catch {
    // Storage can be unavailable. The card then returns next visit, which is
    // the only harm.
  }
}

watch(visible, (shown) => {
  if (shown) analytics.track('featured_encounter_open', { month, hasCurrent: true })
})

function begin(): void {
  if (!feature) return
  analytics.track('featured_encounter_select', {
    featureId: feature.id,
    encounterId: feature.encounterId,
    placement: 'current',
  })
  markSeen()
  inviteEncounter(feature.encounterId)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !visible.value) return
  markSeen()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Transition name="hint">
    <aside
      v-if="visible && feature && encounter"
      class="tonight-card pointer-events-auto absolute z-header"
      aria-label="Tonight's sky"
    >
      <p class="tonight-kicker font-semibold uppercase">Tonight's sky · {{ formatFeatureMonth(feature.month) }}</p>
      <h2 class="font-display">{{ encounter.title }}</h2>
      <p class="tonight-summary">{{ feature.summary }}</p>
      <div class="flex items-center gap-5">
        <button type="button" class="tonight-primary inline-flex min-h-10 items-center gap-2.5 font-semibold" @click="begin">
          Begin · {{ encounter.estimatedMinutes }} min
          <PhArrowRight :size="14" weight="bold" aria-hidden="true" />
        </button>
        <button type="button" class="tonight-dismiss min-h-10" @click="markSeen">Not now</button>
      </div>
    </aside>
  </Transition>
</template>
