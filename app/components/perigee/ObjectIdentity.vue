<script setup lang="ts">
import { PhWarningDiamond } from '@phosphor-icons/vue'
import { formatAngularDiameter, formatDistance } from '~/utils/formatters'

const {
  currentObject,
  currentPreset,
  angularDiameter,
  hazardCopy,
  busy,
} = usePerigee()
</script>

<template>
  <section class="object-identity" :class="{ transitioning: busy }" aria-live="polite" aria-atomic="true">
    <p class="identity-kicker">
      <span class="kicker-dot" aria-hidden="true" />
      {{ currentObject.kind === 'star' ? 'Star' : currentObject.kind === 'moon' ? 'Natural satellite' : 'Planet' }}
    </p>

    <h1>{{ currentObject.label }}</h1>

    <p class="object-metadata">
      <span class="metadata-lead">{{ formatAngularDiameter(angularDiameter) }}</span>
      <span aria-hidden="true" class="metadata-rule" />
      <span>{{ formatDistance(currentPreset.distanceKm) }}</span>
      <span aria-hidden="true" class="metadata-rule" />
      <span>{{ currentPreset.metadataLabel ?? currentPreset.label }}</span>
    </p>

    <Transition name="hazard">
      <p v-if="hazardCopy" class="hazard-notice">
        <PhWarningDiamond :size="15" weight="fill" aria-hidden="true" />
        <span>{{ hazardCopy }}</span>
      </p>
    </Transition>
  </section>
</template>
