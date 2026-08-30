<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { PhCircleNotch } from '@phosphor-icons/vue'
import type { SkyObjectId } from '~/types/perigee'

const {
  skyObjects,
  currentObjectId,
  objectBrowserOpen,
  busy,
  pendingObjectId,
  selectObject,
  toggleObjectBrowser,
} = usePerigee()

/**
 * One tab stop for the whole list, moved with the arrow keys. The refs are
 * index-keyed because the panel is removed from the DOM when it closes, and a
 * push-based list keeps handing out detached buttons after the second open.
 */
const itemRefs = ref<Array<HTMLButtonElement | null>>([])
const activeIndex = ref(Math.max(skyObjects.findIndex((object) => object.id === currentObjectId.value), 0))

function setItemRef(element: unknown, index: number): void {
  itemRefs.value[index] = element instanceof HTMLButtonElement ? element : null
}

async function focusActive(): Promise<void> {
  await nextTick()
  itemRefs.value[activeIndex.value]?.focus({ preventScroll: true })
}

function syncActiveToSelection(): void {
  activeIndex.value = Math.max(skyObjects.findIndex((object) => object.id === currentObjectId.value), 0)
  void focusActive()
}

// The panel is mounted by the open state, so mounting is the open event.
onMounted(syncActiveToSelection)
watch(objectBrowserOpen, (open) => {
  if (open) syncActiveToSelection()
})

function onKeydown(event: KeyboardEvent, index: number): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    toggleObjectBrowser(false)
    document.querySelector<HTMLButtonElement>('[data-object-trigger]')?.focus()
    return
  }
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()

  if (event.key === 'Home') activeIndex.value = 0
  else if (event.key === 'End') activeIndex.value = skyObjects.length - 1
  else {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
    activeIndex.value = (index + direction + skyObjects.length) % skyObjects.length
  }
  void focusActive()
}

async function selectObjectAndRestoreFocus(objectId: SkyObjectId): Promise<void> {
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
    :aria-busy="busy"
  >
    <p class="browser-kicker">Objects</p>
    <div class="browser-track">
      <button
        v-for="(object, index) in skyObjects"
        :key="object.id"
        :ref="(element) => setItemRef(element, index)"
        type="button"
        role="option"
        :tabindex="index === activeIndex ? 0 : -1"
        :aria-selected="currentObjectId === object.id"
        :class="['object-option', `object-${object.id}`, {
          selected: currentObjectId === object.id,
          pending: pendingObjectId === object.id,
        }]"
        :style="{ '--option-accent': object.shot.accent }"
        @click="selectObjectAndRestoreFocus(object.id)"
        @keydown="onKeydown($event, index)"
      >
        <span class="object-thumbnail" aria-hidden="true">
          <img :src="object.thumbnail" alt="" width="160" height="160" decoding="async">
          <PhCircleNotch
            v-if="pendingObjectId === object.id"
            :size="18"
            weight="bold"
            class="spin thumbnail-spinner"
          />
        </span>
        <span class="object-name">{{ object.label }}</span>
        <span class="object-kind">{{ object.kind === 'star' ? 'Star' : object.kind === 'moon' ? 'Moon' : 'Planet' }}</span>
      </button>
    </div>
  </div>
</template>
