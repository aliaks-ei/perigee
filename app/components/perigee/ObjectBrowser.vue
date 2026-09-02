<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { PhCircleNotch } from '@phosphor-icons/vue'
import type { SkyObjectId } from '~/types/perigee'
import { groupObjects } from '~/utils/objectGroups'

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
 * Three groups rather than one flat row, so a viewer knows what lies beyond
 * the edge of a phone-width track and a new object joins its family. The
 * keyboard still walks one flat list across the groups.
 */
const groups = groupObjects(skyObjects)
const indexOf = (objectId: SkyObjectId): number => skyObjects.findIndex((object) => object.id === objectId)

/**
 * One tab stop for the whole list, moved with the arrow keys. The refs are
 * index-keyed because the panel is removed from the DOM when it closes, and a
 * push-based list keeps handing out detached buttons after the second open.
 */
const itemRefs = ref<Array<HTMLButtonElement | null>>([])
const activeIndex = ref(Math.max(indexOf(currentObjectId.value), 0))

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
  activeIndex.value = Math.max(indexOf(currentObjectId.value), 0)
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
    <div class="browser-track flex items-start lt-md:overflow-x-auto lt-md:overscroll-x-contain">
      <section
        v-for="group in groups"
        :key="group.id"
        class="browser-group flex shrink-0 flex-col"
        :aria-label="group.label"
      >
        <p class="browser-kicker block font-semibold uppercase">{{ group.label }}</p>
        <div class="group-tiles flex items-start">
          <button
            v-for="object in group.objects"
            :key="object.id"
            :ref="(element) => setItemRef(element, indexOf(object.id))"
            type="button"
            role="option"
            :tabindex="indexOf(object.id) === activeIndex ? 0 : -1"
            :aria-selected="currentObjectId === object.id"
            :class="['object-option relative flex min-w-0 shrink-0 flex-col items-center gap-2', `object-${object.id}`, {
              selected: currentObjectId === object.id,
              pending: pendingObjectId === object.id,
            }]"
            :style="{ '--option-accent': object.shot.accent }"
            @click="selectObjectAndRestoreFocus(object.id)"
            @keydown="onKeydown($event, indexOf(object.id))"
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
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
