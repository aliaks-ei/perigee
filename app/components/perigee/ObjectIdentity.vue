<script setup lang="ts">
import { PhArrowRight, PhWarningDiamond } from '@phosphor-icons/vue'
import { objectEditorialById } from '~/data/objectEditorial'
import { formatAngularDiameter } from '~/utils/formatters'

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
  skyObjects,
  currentObject,
  currentPreset,
  angularDiameter,
  hazardCopy,
  busy,
  freeDiscovery,
  discoveryOpen,
  revealed,
  openDiscovery,
  selectObject,
} = usePerigee()

/** The question the note answers, so the link reads as a thought, not a menu. */
const discoveryPrompt = computed(() => freeDiscovery.value?.prompt ?? 'About this view')
/**
 * The closest rung is the end of the ladder. The one thing left to do there
 * is the same thing with the next object, so the block offers exactly that.
 * `selectObject` carries the rank across, so "this close" is honest.
 */
const atClosestRung = computed(() => currentObject.value.presets[0]?.id === currentPreset.value.id)
const nextObject = computed(() => {
  const index = skyObjects.findIndex((object) => object.id === currentObject.value.id)
  const next = skyObjects[(index + 1) % skyObjects.length]
  if (!next) return null
  return { id: next.id, subject: objectEditorialById[next.id]?.subject ?? next.label }
})

async function open(): Promise<void> {
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
    <h1 class="font-display">{{ currentObject.label }}</h1>

    <div class="identity-metadata-slot">
      <Transition name="hint">
        <p v-if="revealed('orient')" class="object-metadata text-shadow flex items-center gap-3">
          <span class="metadata-lead shrink-0">{{ formatAngularDiameter(angularDiameter) }}</span>
          <span aria-hidden="true" class="metadata-rule metadata-lead-rule shrink-0" />
          <span class="metadata-preset shrink-0">{{ currentPreset.label }}</span>
          <span aria-hidden="true" class="metadata-rule metadata-detail-rule shrink-0" />
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

    <!-- The contextual actions: the question this view's note answers, and at
         the end of the ladder the next object. Neither carries a resting box;
         they borrow the grammar of the metadata line above, so the block reads
         in one voice rather than as a title with buttons under it. The
         underline is the whole of their affordance. A phone shows one at a
         time, the next object winning, because the row has room for one. -->
    <div class="identity-actions pointer-events-auto flex items-center" :class="{ 'has-next': atClosestRung && nextObject }">
      <Transition name="hint">
        <button
          v-if="revealed('explore') && freeDiscovery && !discoveryOpen"
          type="button"
          class="identity-link text-shadow inline-flex items-center whitespace-nowrap font-semibold uppercase"
          data-discovery-trigger
          @click="open"
        >
          {{ discoveryPrompt }}
        </button>
      </Transition>
      <Transition name="hint">
        <button
          v-if="revealed('explore') && atClosestRung && nextObject"
          type="button"
          class="identity-link identity-next text-shadow inline-flex items-center gap-2 whitespace-nowrap font-semibold uppercase"
          :disabled="busy"
          @click="selectObject(nextObject.id)"
        >
          Now see {{ nextObject.subject }} this close
          <PhArrowRight :size="12" weight="bold" aria-hidden="true" />
        </button>
      </Transition>
    </div>
  </section>
</template>
