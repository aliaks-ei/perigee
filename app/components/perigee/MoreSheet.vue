<script setup lang="ts">
import { PhCamera, PhDotsThree, PhX } from '@phosphor-icons/vue'
import { encountersById, featuredEncounters } from '~/data/editorial'
import type { FeaturedEncounterDefinition } from '~/types/editorial'
import { analytics } from '~/utils/analytics'
import { featureArchive, featureForMonth, formatFeatureMonth } from '~/utils/monthlyFeatures'

/**
 * One home for everything that is not the sky: the featured skies, ambient
 * sound, capture and share, and the keyboard shortcuts. A single control at
 * the top right, so a later feature has somewhere to go without claiming
 * another corner.
 *
 * The featured skies lead. They are the only thing in here a viewer opens the
 * menu looking for; sound and capture act on the sky already on screen and can
 * wait until the eye has passed the list.
 */
const {
  moreOpen,
  objectBrowserOpen,
  busy,
  toggleMore,
  inviteEncounter,
} = usePerigee()
const { capture, capturing } = useCapture()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const now = new Date()
const currentFeature = featureForMonth(featuredEncounters, now)
const archivedFeatures = featureArchive(featuredEncounters, now)
const currentEncounter = currentFeature ? encountersById[currentFeature.encounterId] : null
/**
 * Not staged. The control shares the header row with the wordmark, so it rises
 * with the rest of the interface; a header that grows a button later is a worse
 * first impression than one that is simply complete. It steps aside only for
 * the object browser, which owns the whole screen.
 */
const available = computed(() => !objectBrowserOpen.value)

const shortcuts = [
  { keys: ['Drag'], action: 'Look around' },
  { keys: ['←', '→'], action: 'Step the distance' },
  { keys: ['Esc'], action: 'Close' },
]

watch(moreOpen, (open) => {
  if (open) {
    analytics.track('more_open', { hasCurrent: Boolean(currentFeature) })
    nextTick(() => root.value?.querySelector<HTMLButtonElement>('.more-item')?.focus({ preventScroll: true }))
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', handleOutside)
  window.addEventListener('keydown', handleKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutside)
  window.removeEventListener('keydown', handleKeydown, true)
})

function close(restoreFocus = true): void {
  if (!moreOpen.value) return
  toggleMore(false)
  if (restoreFocus) nextTick(() => trigger.value?.focus({ preventScroll: true }))
}

function handleOutside(event: PointerEvent): void {
  if (!moreOpen.value || root.value?.contains(event.target as Node)) return
  close(false)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !moreOpen.value) return
  event.stopPropagation()
  event.preventDefault()
  close()
}

async function captureSky(): Promise<void> {
  close(false)
  await capture()
}

function selectFeature(feature: FeaturedEncounterDefinition, placement: 'current' | 'archive'): void {
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
  <Transition name="chrome">
    <div v-if="available" ref="root" class="more-control pointer-events-auto absolute z-encounter">
      <Transition name="dock">
        <section
          v-if="moreOpen"
          id="more-sheet"
          class="more-sheet absolute lt-sm:overflow-y-auto"
          aria-label="More"
        >
          <!-- The list's own label doubles as the sheet's header row. A "More"
               title above it would put two micro-caps labels back to back and
               spend a row saying what the control that opened the sheet says. -->
          <div class="more-heading flex items-center justify-between">
            <p class="more-label font-semibold uppercase">Featured skies</p>
            <button
              class="more-close inline-grid place-items-center rounded-full"
              type="button"
              aria-label="Close"
              @click="close()"
            >
              <PhX :size="15" weight="bold" aria-hidden="true" />
            </button>
          </div>

          <div class="more-lead">
            <button
              v-if="currentFeature && currentEncounter"
              type="button"
              class="more-item flex w-full items-center justify-between gap-4 text-left"
              @click="selectFeature(currentFeature, 'current')"
            >
              <span class="more-feature-title min-w-0 flex-1">{{ currentEncounter.title }}</span>
              <span class="more-state font-semibold uppercase">{{ formatFeatureMonth(currentFeature.month, 'short') }}</span>
            </button>
            <ol v-if="archivedFeatures.length" class="feature-archive">
              <li v-for="feature in archivedFeatures" :key="feature.id">
                <button type="button" class="more-item flex w-full items-center justify-between gap-4 text-left" @click="selectFeature(feature, 'archive')">
                  <span class="more-feature-title min-w-0 flex-1">{{ encountersById[feature.encounterId]?.title }}</span>
                  <span class="more-state font-semibold uppercase">{{ formatFeatureMonth(feature.month, 'short') }}</span>
                </button>
              </li>
            </ol>
          </div>

          <div class="more-section">
            <PerigeeAmbientSoundControl />

            <button
              type="button"
              class="more-item flex w-full items-center justify-between gap-4 text-left"
              data-capture-trigger
              :disabled="capturing || busy"
              @click="captureSky"
            >
              <span class="flex items-center gap-3">
                <PhCamera :size="16" weight="regular" aria-hidden="true" />
                {{ capturing ? 'Capturing…' : 'Capture this sky' }}
              </span>
            </button>
          </div>

          <div class="more-section shortcut-section">
            <p class="more-label font-semibold uppercase">Keyboard</p>
            <ul class="shortcut-list">
              <li v-for="shortcut in shortcuts" :key="shortcut.action + shortcut.keys.join()" class="flex items-center justify-between gap-4">
                <span>{{ shortcut.action }}</span>
                <span class="flex items-center gap-1">
                  <kbd v-for="key in shortcut.keys" :key="key">{{ key }}</kbd>
                </span>
              </li>
            </ul>
          </div>

        </section>
      </Transition>

      <button
        ref="trigger"
        type="button"
        class="more-trigger grid place-items-center rounded-full"
        data-more-trigger
        aria-label="More: sound, capture and featured skies"
        aria-controls="more-sheet"
        :aria-expanded="moreOpen"
        @click="toggleMore()"
      >
        <PhDotsThree :size="20" weight="bold" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>
