<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const {
  skyObjects,
  currentObjectId,
  objectBrowserOpen,
  transitioning,
  selectObject,
  toggleObjectBrowser,
} = usePerigee()
const itemRefs = ref<HTMLButtonElement[]>([])

watch(objectBrowserOpen, async (open) => {
  if (!open) return
  await nextTick()
  const selectedIndex = skyObjects.findIndex((object) => object.id === currentObjectId.value)
  itemRefs.value[selectedIndex]?.focus({ preventScroll: true })
})

function setItemRef(element: unknown): void {
  if (element instanceof HTMLButtonElement && !itemRefs.value.includes(element)) {
    itemRefs.value.push(element)
  }
}

function onKeydown(event: KeyboardEvent, index: number): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    toggleObjectBrowser(false)
    document.querySelector<HTMLButtonElement>('[data-object-trigger]')?.focus()
    return
  }
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
  const nextIndex = (index + direction + skyObjects.length) % skyObjects.length
  itemRefs.value[nextIndex]?.focus()
}
</script>

<template>
  <Transition name="browser">
    <div
      v-if="objectBrowserOpen"
      id="object-browser"
      class="object-browser"
      role="listbox"
      aria-label="Celestial objects"
      :aria-busy="transitioning"
    >
      <p class="browser-kicker">Choose an object</p>
      <div class="browser-track">
        <button
          v-for="(object, index) in skyObjects"
          :key="object.id"
          :ref="setItemRef"
          type="button"
          role="option"
          :aria-selected="currentObjectId === object.id"
          :disabled="transitioning"
          :class="['object-option', `object-${object.id}`, { selected: currentObjectId === object.id }]"
          :style="{ '--option-accent': object.shot.accent }"
          @click="selectObject(object.id)"
          @keydown="onKeydown($event, index)"
        >
          <span class="object-thumbnail" aria-hidden="true">
            <img :src="object.thumbnail" alt="">
          </span>
          <span class="object-name">{{ object.label }}</span>
          <span class="object-kind">{{ object.kind === 'star' ? 'Star' : object.kind === 'moon' ? 'Moon' : 'Planet' }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>
