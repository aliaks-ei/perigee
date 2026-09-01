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
 * The widest the desktop track goes before the tiles start to crowd. Anything
 * past it wraps, and the rows are balanced rather than filled: nine objects run
 * as one row of nine, not eight and a stray.
 */
const MAX_COLUMNS = 9
const columns = Math.ceil(skyObjects.length / Math.ceil(skyObjects.length / MAX_COLUMNS))

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
  const item = itemRefs.value[activeIndex.value]
  item?.focus({ preventScroll: true })
  // The mobile track is horizontal. Preventing the focus scroll protects the
  // page position, but it also used to leave a selected ninth object beyond
  // the right edge. Scroll only the nearest overflow container into view.
  item?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
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
    <p class="browser-kicker block font-semibold uppercase">Objects</p>
    <div
      class="browser-track grid lt-md:overflow-x-auto lt-md:overscroll-x-contain"
      :style="{ '--browser-columns': columns }"
    >
      <button
        v-for="(object, index) in skyObjects"
        :key="object.id"
        :ref="(element) => setItemRef(element, index)"
        type="button"
        role="option"
        :tabindex="index === activeIndex ? 0 : -1"
        :aria-selected="currentObjectId === object.id"
        :class="['object-option relative flex min-w-0 flex-col items-center gap-2', `object-${object.id}`, {
          selected: currentObjectId === object.id,
          pending: pendingObjectId === object.id,
        }]"
        :style="{ '--option-accent': object.shot.accent }"
        @click="selectObjectAndRestoreFocus(object.id)"
        @keydown="onKeydown($event, index)"
      >
        <span class="object-thumbnail relative block overflow-hidden rounded-full" aria-hidden="true">
          <img
            class="block h-full w-full object-cover"
            :src="object.thumbnail"
            alt=""
            width="160"
            height="160"
            decoding="async"
          >
          <PhCircleNotch
            v-if="pendingObjectId === object.id"
            :size="18"
            weight="bold"
            class="thumbnail-spinner absolute left-1/2 top-1/2 animate-spin"
          />
        </span>
        <span class="object-name">{{ object.label }}</span>
        <span class="object-kind font-semibold uppercase">{{ object.kind === 'star' ? 'Star' : object.kind === 'galaxy' ? 'Galaxy' : object.kind === 'moon' ? 'Moon' : 'Planet' }}</span>
      </button>
    </div>
  </div>
</template>
