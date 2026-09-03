<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { PhCircleNotch } from '@phosphor-icons/vue'
import type { SkyObjectId } from '~/types/perigee'
import { groupObjects, type ObjectGroup } from '~/utils/objectGroups'

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
 * Three groups rather than one flat row. Desktop shows the complete catalogue;
 * narrow layouts expose the groups as tabs so no family is hidden beyond an
 * ambiguous horizontal edge.
 */
const groups = groupObjects(skyObjects)
const indexOf = (objectId: SkyObjectId): number => skyObjects.findIndex((object) => object.id === objectId)
const groupFor = (objectId: SkyObjectId): ObjectGroup =>
  groups.find((group) => group.objects.some((object) => object.id === objectId)) ?? groups[0]!

/**
 * One tab stop for the whole list, moved with the arrow keys. The refs are
 * index-keyed because the panel is removed from the DOM when it closes, and a
 * push-based list keeps handing out detached buttons after the second open.
 */
const itemRefs = ref<Array<HTMLButtonElement | null>>([])
const activeIndex = ref(Math.max(indexOf(currentObjectId.value), 0))
const activeGroupId = ref<ObjectGroup['id']>(groupFor(currentObjectId.value).id)
const track = ref<HTMLElement | null>(null)

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
  activeGroupId.value = groupFor(currentObjectId.value).id
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

  const narrow = window.matchMedia('(max-width: 900px)').matches
  const visibleObjects = narrow
    ? groups.find((group) => group.id === activeGroupId.value)?.objects ?? skyObjects
    : skyObjects
  const visibleIndex = visibleObjects.findIndex((object) => object.id === skyObjects[index]?.id)

  if (event.key === 'Home') activeIndex.value = indexOf(visibleObjects[0]!.id)
  else if (event.key === 'End') activeIndex.value = indexOf(visibleObjects[visibleObjects.length - 1]!.id)
  else {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = (visibleIndex + direction + visibleObjects.length) % visibleObjects.length
    activeIndex.value = indexOf(visibleObjects[nextIndex]!.id)
  }
  void focusActive()
}

async function selectGroup(groupId: ObjectGroup['id']): Promise<void> {
  activeGroupId.value = groupId
  const group = groups.find((candidate) => candidate.id === groupId)
  if (!group) return
  const selectedInGroup = group.objects.find((object) => object.id === currentObjectId.value)
  activeIndex.value = indexOf((selectedInGroup ?? group.objects[0]!).id)
  await nextTick()
  if (track.value) track.value.scrollLeft = 0
}

function onGroupKeydown(event: KeyboardEvent, index: number): void {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? groups.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length
  const next = groups[nextIndex]
  if (!next) return
  void selectGroup(next.id)
  document.querySelector<HTMLButtonElement>(`[data-browser-tab="${next.id}"]`)?.focus({ preventScroll: true })
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
  >
    <div class="browser-tabs hidden items-center lt-md:flex" role="tablist" aria-label="Object category">
      <button
        v-for="(group, index) in groups"
        :key="group.id"
        type="button"
        role="tab"
        :aria-selected="activeGroupId === group.id"
        :tabindex="activeGroupId === group.id ? 0 : -1"
        :class="{ selected: activeGroupId === group.id }"
        :data-browser-tab="group.id"
        @click="selectGroup(group.id)"
        @keydown="onGroupKeydown($event, index)"
      >
        {{ group.label }}
      </button>
    </div>
    <div
      ref="track"
      role="listbox"
      aria-label="Celestial objects"
      :aria-busy="busy"
      class="browser-track flex items-start lt-md:overflow-x-auto lt-md:overscroll-x-contain"
    >
      <section
        v-for="group in groups"
        :key="group.id"
        role="group"
        class="browser-group flex shrink-0 flex-col"
        :class="{ 'mobile-active': activeGroupId === group.id }"
        :aria-label="group.label"
      >
        <p class="browser-kicker block font-semibold uppercase" aria-hidden="true">{{ group.label }}</p>
        <div role="presentation" class="group-tiles flex items-start">
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
