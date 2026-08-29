<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'

const {
  skyObjects,
  currentObjectId,
  objectBrowserOpen,
  transitioning,
  selectObject,
  toggleObjectBrowser,
} = usePerigee()
const itemRefs = ref<HTMLButtonElement[]>([])

async function focusSelected(): Promise<void> {
  await nextTick()
  const selectedIndex = skyObjects.findIndex((object) => object.id === currentObjectId.value)
  itemRefs.value[selectedIndex]?.focus({ preventScroll: true })
}

watch(objectBrowserOpen, async (open) => {
  if (!open) return
  await focusSelected()
})

onMounted(focusSelected)

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

async function selectObjectAndRestoreFocus(objectId: (typeof skyObjects)[number]['id']): Promise<void> {
  toggleObjectBrowser(false)
  await nextTick()
  document.querySelector<HTMLButtonElement>('[data-object-trigger]')?.focus()
  await selectObject(objectId)
}
</script>

<template>
  <div
    id="object-browser"
    class="object-browser"
    role="listbox"
    aria-label="Celestial objects"
    :aria-busy="transitioning"
  >
    <p class="browser-kicker">Objects</p>
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
        @click="selectObjectAndRestoreFocus(object.id)"
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
</template>
