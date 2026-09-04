<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  active: boolean
  label: string
  maxDiameterPixels?: number
}>(), {
  maxDiameterPixels: Number.POSITIVE_INFINITY,
})

const { getObjectScreenPosition, subscribeFrame } = usePerigee()
const locator = ref<HTMLElement | null>(null)
const visible = ref(false)
let unsubscribe: (() => void) | null = null
let locatorX = -1
let locatorY = -1

watch(() => [props.active, props.label, props.maxDiameterPixels], async () => {
  unsubscribe?.()
  unsubscribe = null
  visible.value = false
  if (!props.active) return
  await nextTick()
  locatorX = -1
  locatorY = -1
  updateLocator()
  unsubscribe = subscribeFrame(updateLocator)
}, { immediate: true })

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = null
})

function updateLocator(): void {
  const point = getObjectScreenPosition()
  if (!point) return
  visible.value = point.diameterPixels <= props.maxDiameterPixels
  const element = locator.value
  if (!visible.value || !element) return
  const x = Math.min(Math.max(point.x, 0.04), 0.96)
  const y = Math.min(Math.max(point.y, 0.06), 0.78)
  const threshold = 1 / Math.max(window.innerWidth, 1)
  if (Math.abs(x - locatorX) < threshold && Math.abs(y - locatorY) < threshold) return
  locatorX = x
  locatorY = y
  element.style.setProperty('--locator-x', `${x * 100}%`)
  element.style.setProperty('--locator-y', `${y * 100}%`)
  element.classList.toggle('off-screen', !point.onScreen)
  element.classList.toggle('align-left', x > 0.72)
}
</script>

<template>
  <div
    v-if="visible"
    ref="locator"
    class="celestial-locator pointer-events-none absolute z-locator"
    aria-hidden="true"
  >
    <svg class="locator-arrow absolute block" viewBox="0 0 76 40" aria-hidden="true">
      <path d="M70 5C48 8 27 18 9 33" />
      <path d="M10 23L9 33L20 32" />
    </svg>
    <span class="locator-label text-shadow absolute font-semibold uppercase">{{ label }}</span>
  </div>
</template>
