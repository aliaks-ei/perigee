import { computed, readonly, ref, shallowRef } from 'vue'
import { resolveObjectPresetId, skyObjects, skyObjectsById } from '~/data/objects'
import { viewpoints } from '~/data/viewpoints'
import {
  discoveries,
  discoveriesById,
  encounters,
  encountersById,
  encountersBySlug,
} from '~/data/editorial'
import { resolveDiscovery } from '~/utils/discoveryCalculations'
import { analytics } from '~/utils/analytics'
import {
  HINT_DELAY_MS,
  HINT_LIFETIME_MS,
  IDLE_AFTER_MS,
  STAGE_FALLBACK_MS,
  advanceStage,
  initialStage,
  nextStage,
  stageAtLeast,
  stageForAction,
  type DisclosureStage,
} from '~/utils/disclosureStages'
import type { EncounterDefinition } from '~/types/editorial'
import type {
  PerigeeController,
  PerigeeSelection,
  SkyObjectDefinition,
  SkyObjectId,
  ViewpointId,
} from '~/types/perigee'
import { angularDiameterDegrees } from '../../src/perigee/math/angularSize'
import {
  EncounterDirector,
  type EncounterSnapshot,
  type EncounterStatus,
} from '../../src/perigee/EncounterDirector'

const currentObjectId = ref<SkyObjectId>('saturn')
const currentPresetId = ref('moon-swap')
const currentViewpointId = ref<ViewpointId>('rooftop')
const objectBrowserOpen = ref(false)
/** The "more" sheet: sound, capture, featured skies, shortcuts. */
const moreOpen = ref(false)
const loading = ref(true)
const loadingProgress = ref(0)
/** A shot is running. Controls stay live; only the object being swapped waits. */
const busy = ref(false)
const pendingObjectId = ref<SkyObjectId | null>(null)
const capabilityError = ref<'webgl2' | 'asset' | null>(null)
const notice = ref<string | null>(null)
/** Offered a beat after the scene settles, never on the first frame. */
const hintVisible = ref(false)
/**
 * How much of the interface has been revealed. See `disclosureStages.ts`. It
 * climbs on what the viewer does and, failing that, on time.
 */
const stage = ref<DisclosureStage>('arrive')
/** No pointer or key activity for a while. Only the last stage acts on it. */
const idle = ref(false)
const hazardReady = ref(false)
/** The free-exploration discovery note, open as its own layer. */
const discoveryOpen = ref(false)
const controller = shallowRef<PerigeeController | null>(null)
const encounterDirector = new EncounterDirector()
const currentEncounter = ref<EncounterDefinition | null>(null)
const encounterStatus = ref<EncounterStatus>('idle')
const encounterBeatIndex = ref(0)
const encounterTransitioning = ref(false)
const encounterBeatRevealed = ref(false)
/** The prediction the viewer answered, kept so the next beat can respond. */
const answeredPrediction = ref<{ beatId: string, optionId: string } | null>(null)
let hazardTimer: ReturnType<typeof setTimeout> | null = null
let hintTimer: ReturnType<typeof setTimeout> | null = null
let noticeTimer: ReturnType<typeof setTimeout> | null = null
let stageTimer: ReturnType<typeof setTimeout> | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null
/** When the idle clock was last restarted, so a drag does not restart it per frame. */
let lastActivityAt = 0
/** Object, distance and landscape changes so far; the ladder counts them. */
let changeCount = 0
/** Identifies the newest shot, so a superseded one cannot clear the lock. */
let shotToken = 0
let encounterToken = 0

const currentObject = computed(() => skyObjectsById[currentObjectId.value])
const currentPreset = computed(() =>
  currentObject.value.presets.find((preset) => preset.id === currentPresetId.value)
    ?? currentObject.value.presets[0]!,
)
const angularDiameter = computed(() =>
  angularDiameterDegrees(currentObject.value.diameterKm, currentPreset.value.distanceKm),
)
const hazardCopy = computed(() => hazardReady.value ? currentPreset.value.hazardCopy : undefined)
const currentEncounterBeat = computed(() => currentEncounter.value?.beats[encounterBeatIndex.value] ?? null)
const currentDiscovery = computed(() => {
  const discoveryId = currentEncounterBeat.value?.discoveryId
  const discovery = discoveryId ? discoveriesById[discoveryId] : undefined
  return discovery ? resolveDiscovery(discovery) : null
})
const currentPrediction = computed(() => currentEncounterBeat.value?.prediction ?? null)
/** The response belongs to the beat after the answered one: the reveal itself. */
const predictionResponse = computed(() => {
  const answer = answeredPrediction.value
  const beats = currentEncounter.value?.beats
  if (!answer || !beats) return null
  const answeredIndex = beats.findIndex((beat) => beat.id === answer.beatId)
  if (answeredIndex < 0 || answeredIndex + 1 !== encounterBeatIndex.value) return null
  return beats[answeredIndex]?.prediction?.options
    .find((option) => option.id === answer.optionId)?.response ?? null
})
/** The editorial note for the view at rest, if the catalogue has one. */
const freeDiscovery = computed(() => {
  const discovery = discoveries.find((candidate) =>
    candidate.scope.objectId === currentObjectId.value
      && (!candidate.scope.presetId || candidate.scope.presetId === currentPresetId.value),
  )
  return discovery ? resolveDiscovery(discovery) : null
})
const availableEncounter = computed(() => {
  const matching = encounters.filter((encounter) =>
    encounter.beats[0]?.selection.objectId === currentObjectId.value,
  )
  return matching.find((encounter) =>
    encounter.beats[0]?.selection.viewpointId === currentViewpointId.value,
  ) ?? matching.find((encounter) =>
    encounter.beats[0]?.selection.viewpointId === 'rooftop',
  ) ?? matching[0] ?? null
})

/**
 * The chrome steps back only once everything has a home (the last stage), and
 * never while a panel is open or a guided encounter is running.
 */
const chromeIdle = computed(() =>
  idle.value
  && stage.value === 'deepen'
  && !objectBrowserOpen.value
  && !moreOpen.value
  && encounterStatus.value === 'idle',
)

function recordInteraction(kind: 'object' | 'distance' | 'viewpoint' | 'encounter'): void {
  analytics.interaction(kind)
  if (kind !== 'encounter') changeCount += 1
  setStage(stageForAction(kind === 'encounter' ? 'encounter' : 'change', changeCount))
}

function setStage(target: DisclosureStage): void {
  const next = advanceStage(stage.value, target)
  if (next === stage.value) return
  stage.value = next
  scheduleStageFallback()
}

/** A passive viewer still gets the whole interface, one step at a time. */
function scheduleStageFallback(): void {
  if (stageTimer) clearTimeout(stageTimer)
  stageTimer = null
  const current = stage.value
  const upcoming = nextStage(current)
  if (!upcoming || current === 'deepen') return
  stageTimer = setTimeout(() => setStage(upcoming), STAGE_FALLBACK_MS[current])
}

/** Any pointer or key activity. Restores the chrome and restarts the idle clock. */
function noteActivity(): void {
  idle.value = false
  // `pointermove` calls this once a frame while the sky is being dragged, and
  // each call is a clearTimeout/setTimeout pair. The idle clock runs for a
  // minute, so restarting it at most once a second changes nothing.
  const now = performance.now()
  if (idleTimer && now - lastActivityAt < 1_000) return
  lastActivityAt = now
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    idleTimer = null
    idle.value = true
  }, IDLE_AFTER_MS)
}

/** The viewer has taken hold of the sky: a drag, a tap, an arrow key. */
function noteLook(): void {
  dismissHint()
  setStage('orient')
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function defaultPresetId(object: SkyObjectDefinition): string {
  const preferred = object.kind === 'star'
    ? 'impossible'
    : object.kind === 'galaxy' ? 'quarter-million' : 'moon-swap'
  return object.presets.find((preset) => preset.id === preferred)?.id ?? object.presets[0]!.id
}

/**
 * Keeps the viewer's relative place on the distance ladder across an object
 * change. Every ladder now runs closest to farthest, so rank is the stable
 * comparison; ids and physical distances deliberately differ by object.
 */
function carriedPresetId(object: SkyObjectDefinition): string {
  const currentIndex = currentObject.value.presets.findIndex(
    (preset) => preset.id === currentPresetId.value,
  )
  return object.presets[Math.min(Math.max(currentIndex, 0), object.presets.length - 1)]?.id
    ?? defaultPresetId(object)
}

function readSelectionFromUrl(): Partial<PerigeeSelection> {
  const params = new URLSearchParams(window.location.search)
  const objectId = params.get('object') as SkyObjectId | null
  const object = objectId && objectId in skyObjectsById ? skyObjectsById[objectId] : null
  const requestedPresetId = params.get('distance')
  const presetId = object && requestedPresetId
    ? resolveObjectPresetId(object, requestedPresetId)
    : null
  const viewpointId = params.get('view') as ViewpointId | null

  return {
    ...(object ? { objectId: object.id } : {}),
    ...(presetId ? { presetId } : {}),
    ...(viewpointId && viewpoints.some((viewpoint) => viewpoint.id === viewpointId)
      ? { viewpointId }
      : {}),
  }
}

/** `replaceState`, so sharing a view never fills the viewer's back button. */
function syncUrl(): void {
  const params = new URLSearchParams(window.location.search)
  params.set('object', currentObjectId.value)
  params.set('distance', currentPresetId.value)
  params.set('view', currentViewpointId.value)
  if (currentEncounter.value && encounterStatus.value !== 'idle') {
    params.set('encounter', currentEncounter.value.slug)
  } else {
    params.delete('encounter')
  }
  window.history.replaceState(null, '', `?${params.toString()}`)
}

function applyEncounterSnapshot(snapshot: EncounterSnapshot): void {
  currentEncounter.value = snapshot.encounter
  encounterStatus.value = snapshot.status
  encounterBeatIndex.value = snapshot.beatIndex
}

function notify(message: string): void {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = null }, 6_000)
}

function dismissNotice(): void {
  if (noticeTimer) clearTimeout(noticeTimer)
  notice.value = null
}

function queueHazard(): void {
  hazardReady.value = false
  if (hazardTimer) clearTimeout(hazardTimer)
  if (!currentPreset.value.hazardCopy) return
  hazardTimer = setTimeout(() => {
    hazardReady.value = true
  }, prefersReducedMotion() ? 180 : 620)
}

function dismissHint(): void {
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = null
  hintVisible.value = false
}

/**
 * `encounterSlug` comes from the curated `/e/<slug>` route. The query string
 * carries the same thing on the SPA route, so both entry points restore an
 * encounter through one path.
 */
async function initialize(canvas: HTMLCanvasElement, encounterSlug?: string): Promise<void> {
  const loadStartedAt = performance.now()
  loading.value = true
  loadingProgress.value = 0
  capabilityError.value = null

  const selection = readSelectionFromUrl()
  const slug = encounterSlug ?? new URLSearchParams(window.location.search).get('encounter')
  const linkedEncounter = slug ? encountersBySlug[slug] : undefined
  // A shared view or a curated route brought the viewer for a specific sky;
  // they skip the orientation steps.
  stage.value = initialStage({
    sharedView: Object.keys(selection).length > 0,
    encounter: Boolean(linkedEncounter),
  })
  if (linkedEncounter) {
    applyEncounterSnapshot(encounterDirector.invite(linkedEncounter))
    applyEncounterSnapshot(encounterDirector.start())
    const firstBeat = linkedEncounter.beats[0]
    if (firstBeat) Object.assign(selection, firstBeat.selection)
  }
  if (selection.objectId) currentObjectId.value = selection.objectId
  currentPresetId.value = selection.presetId ?? defaultPresetId(currentObject.value)
  if (selection.viewpointId) currentViewpointId.value = selection.viewpointId

  try {
    const { PerigeeScene } = await import('../../src/perigee/PerigeeScene')
    const scene = new PerigeeScene()
    controller.value = scene
    await scene.initialize(canvas, {
      selection: {
        objectId: currentObjectId.value,
        presetId: currentPresetId.value,
        viewpointId: currentViewpointId.value,
      },
      onProgress: (ratio) => { loadingProgress.value = ratio },
    })
    loading.value = false
    analytics.clock.start()
    analytics.track('scene_ready', { loadMs: Math.round(performance.now() - loadStartedAt) })
    encounterBeatRevealed.value = Boolean(linkedEncounter)
    syncUrl()
    queueHazard()
    scheduleStageFallback()
    noteActivity()
    // Offered once the scene has settled, and withdrawn on its own: it is the
    // only thing on screen a touch viewer may never dismiss.
    hintTimer = setTimeout(() => {
      hintVisible.value = true
      hintTimer = setTimeout(dismissHint, HINT_LIFETIME_MS)
    }, HINT_DELAY_MS)
  } catch (error) {
    loading.value = false
    capabilityError.value = error instanceof Error && error.message === 'WEBGL2_UNAVAILABLE'
      ? 'webgl2'
      : 'asset'
  }
}

async function selectObject(objectId: SkyObjectId): Promise<void> {
  if (encounterStatus.value !== 'idle') exitEncounter()
  objectBrowserOpen.value = false
  if (objectId === currentObjectId.value) return
  recordInteraction('object')
  analytics.track('object_change', { objectId })

  const object = skyObjectsById[objectId]
  const presetId = carriedPresetId(object)
  const previous = { objectId: currentObjectId.value, presetId: currentPresetId.value }

  // Applied before the shot runs. Waiting until the end left the title, the
  // apparent size and the trigger label a full transition behind the sky.
  currentObjectId.value = objectId
  currentPresetId.value = presetId
  hazardReady.value = false
  discoveryOpen.value = false
  syncUrl()

  const token = ++shotToken
  pendingObjectId.value = objectId
  busy.value = true
  try {
    await controller.value?.setObject(objectId, presetId)
    if (token === shotToken) queueHazard()
  } catch {
    if (token !== shotToken) return
    currentObjectId.value = previous.objectId
    currentPresetId.value = previous.presetId
    syncUrl()
    notify(`${object.label} could not be loaded. Check your connection and try again.`)
  } finally {
    if (token === shotToken) {
      pendingObjectId.value = null
      busy.value = false
    }
  }
}

async function selectDistance(presetId: string): Promise<void> {
  if (encounterStatus.value !== 'idle') exitEncounter()
  if (presetId === currentPresetId.value) return
  recordInteraction('distance')
  analytics.track('distance_change', { objectId: currentObjectId.value, presetId })
  const previousPresetId = currentPresetId.value
  currentPresetId.value = presetId
  hazardReady.value = false
  discoveryOpen.value = false
  syncUrl()

  const token = ++shotToken
  busy.value = true
  try {
    await controller.value?.setDistance(presetId)
    if (token === shotToken) queueHazard()
  } catch {
    if (token !== shotToken) return
    currentPresetId.value = previousPresetId
    syncUrl()
  } finally {
    if (token === shotToken) busy.value = false
  }
}

/** Steps the ladder without opening the panel. Clamped, never wrapped. */
function stepDistance(direction: 1 | -1): void {
  const presets = currentObject.value.presets
  const index = presets.findIndex((preset) => preset.id === currentPresetId.value)
  const next = presets[Math.min(Math.max(index + direction, 0), presets.length - 1)]
  if (next && next.id !== currentPresetId.value) void selectDistance(next.id)
}

async function selectViewpoint(viewpointId: ViewpointId): Promise<void> {
  if (encounterStatus.value !== 'idle') exitEncounter()
  if (viewpointId === currentViewpointId.value) return
  recordInteraction('viewpoint')
  analytics.track('viewpoint_change', { viewpointId })
  const previousViewpointId = currentViewpointId.value
  currentViewpointId.value = viewpointId
  syncUrl()

  const token = ++shotToken
  busy.value = true
  try {
    await controller.value?.setViewpoint(viewpointId)
  } catch {
    if (token !== shotToken) return
    currentViewpointId.value = previousViewpointId
    syncUrl()
    notify('That viewpoint could not be loaded.')
  } finally {
    if (token === shotToken) busy.value = false
  }
}

// One layer at a time. The discovery note closes with them because it owns
// Escape while it is open, and a note left behind a panel eats the key that
// was meant to close the panel.
function toggleObjectBrowser(force?: boolean): void {
  objectBrowserOpen.value = force ?? !objectBrowserOpen.value
  if (objectBrowserOpen.value) {
    moreOpen.value = false
    discoveryOpen.value = false
  }
}

function toggleMore(force?: boolean): void {
  moreOpen.value = force ?? !moreOpen.value
  if (moreOpen.value) {
    objectBrowserOpen.value = false
    discoveryOpen.value = false
  }
}

function openDiscovery(): void {
  if (!freeDiscovery.value) return
  discoveryOpen.value = true
  analytics.track('discovery_open', { discoveryId: freeDiscovery.value.id })
}

function closeDiscovery(): void {
  discoveryOpen.value = false
}

/**
 * One shot, not three. Running the object, distance and viewpoint changes in
 * series meant a single click could hold the interface for four seconds.
 */
async function resetExperience(): Promise<void> {
  exitEncounter(false)
  objectBrowserOpen.value = false
  moreOpen.value = false
  discoveryOpen.value = false
  controller.value?.resetView()

  const shots: Array<Promise<void> | undefined> = []
  if (currentViewpointId.value !== 'rooftop') {
    currentViewpointId.value = 'rooftop'
    shots.push(controller.value?.setViewpoint('rooftop'))
  }
  if (currentObjectId.value !== 'saturn' || currentPresetId.value !== 'moon-swap') {
    currentObjectId.value = 'saturn'
    currentPresetId.value = 'moon-swap'
    shots.push(controller.value?.setObject('saturn', 'moon-swap'))
  }
  if (shots.length === 0) return

  hazardReady.value = false
  syncUrl()
  const token = ++shotToken
  pendingObjectId.value = 'saturn'
  busy.value = true
  try {
    await Promise.all(shots)
    if (token === shotToken) queueHazard()
  } finally {
    if (token === shotToken) {
      pendingObjectId.value = null
      busy.value = false
    }
  }
}

async function runEncounterBeat(): Promise<void> {
  const beat = currentEncounterBeat.value
  if (!beat) return
  const previousObjectId = currentObjectId.value
  const previousPresetId = currentPresetId.value
  const previousViewpointId = currentViewpointId.value
  const token = ++encounterToken
  encounterTransitioning.value = true
  encounterBeatRevealed.value = false
  busy.value = true
  objectBrowserOpen.value = false

  currentObjectId.value = beat.selection.objectId
  currentPresetId.value = beat.selection.presetId
  currentViewpointId.value = beat.selection.viewpointId
  syncUrl()

  try {
    const shots: Array<Promise<void> | undefined> = []
    if (previousObjectId !== beat.selection.objectId) {
      shots.push(controller.value?.setObject(beat.selection.objectId, beat.selection.presetId))
    } else if (previousPresetId !== beat.selection.presetId) {
      shots.push(controller.value?.setDistance(beat.selection.presetId))
    }
    if (previousViewpointId !== beat.selection.viewpointId) {
      shots.push(controller.value?.setViewpoint(beat.selection.viewpointId))
    }
    await Promise.all(shots)
    if (token !== encounterToken) return
    queueHazard()
    encounterBeatRevealed.value = true
    if (currentEncounter.value) {
      analytics.track('encounter_beat', {
        encounterId: currentEncounter.value.id,
        beatIndex: encounterBeatIndex.value,
      })
    }
  } catch {
    if (token !== encounterToken) return
    notify('This encounter beat could not be loaded.')
    exitEncounter()
  } finally {
    if (token === encounterToken) {
      encounterTransitioning.value = false
      busy.value = false
    }
  }
}

function inviteEncounter(encounterId?: string): void {
  const encounter = encounterId ? encountersById[encounterId] : availableEncounter.value
  if (!encounter) return
  objectBrowserOpen.value = false
  moreOpen.value = false
  discoveryOpen.value = false
  applyEncounterSnapshot(encounterDirector.invite(encounter))
  encounterBeatRevealed.value = false
  syncUrl()
}

async function startEncounter(): Promise<void> {
  recordInteraction('encounter')
  applyEncounterSnapshot(encounterDirector.start())
  if (currentEncounter.value) analytics.track('encounter_start', { encounterId: currentEncounter.value.id })
  await runEncounterBeat()
}

/**
 * Answering is optional and never scored. It records the choice and runs the
 * next beat, so the scene delivers the reveal without an extra step.
 */
async function answerPrediction(optionId: string): Promise<void> {
  const beat = currentEncounterBeat.value
  const encounter = currentEncounter.value
  if (!beat?.prediction || !encounter || encounterTransitioning.value) return
  if (!beat.prediction.options.some((option) => option.id === optionId)) return
  answeredPrediction.value = { beatId: beat.id, optionId }
  analytics.track('prediction_answer', {
    encounterId: encounter.id,
    predictionId: beat.prediction.id,
    optionId,
  })
  await nextEncounter()
}

async function nextEncounter(): Promise<void> {
  applyEncounterSnapshot(encounterDirector.next())
  syncUrl()
  if (encounterStatus.value === 'active') await runEncounterBeat()
  else if (encounterStatus.value === 'complete' && currentEncounter.value) {
    analytics.track('encounter_complete', { encounterId: currentEncounter.value.id })
    encounterToken += 1
    applyEncounterSnapshot(encounterDirector.exit())
    encounterTransitioning.value = false
    encounterBeatRevealed.value = false
    answeredPrediction.value = null
    syncUrl()
  }
}

async function previousEncounter(): Promise<void> {
  applyEncounterSnapshot(encounterDirector.previous())
  await runEncounterBeat()
}

async function replayEncounter(): Promise<void> {
  answeredPrediction.value = null
  applyEncounterSnapshot(encounterDirector.replay())
  await runEncounterBeat()
}

function exitEncounter(sync = true): void {
  const exiting = currentEncounter.value
  const exitingBeat = encounterBeatIndex.value
  encounterToken += 1
  applyEncounterSnapshot(encounterDirector.exit())
  encounterTransitioning.value = false
  encounterBeatRevealed.value = false
  answeredPrediction.value = null
  if (sync) syncUrl()
  if (sync && exiting) analytics.track('encounter_exit', { encounterId: exiting.id, beatIndex: exitingBeat })
}

function retry(canvas: HTMLCanvasElement, encounterSlug?: string): Promise<void> {
  controller.value?.dispose()
  controller.value = null
  return initialize(canvas, encounterSlug)
}

function pause(): void {
  analytics.clock.suspend()
  controller.value?.pause()
}

function resume(): void {
  analytics.clock.activity()
  controller.value?.resume()
}

function resize(width: number, height: number, dpr: number): void {
  controller.value?.resize(width, height, dpr)
}

function getObjectScreenPosition(): { x: number, y: number, onScreen: boolean, diameterPixels: number } | null {
  return controller.value?.getObjectScreenPosition() ?? null
}

function subscribeFrame(listener: () => void): () => void {
  return controller.value?.subscribeFrame(listener) ?? (() => undefined)
}

function captureFrame(): HTMLCanvasElement | null {
  return controller.value?.captureFrame() ?? null
}

function dispose(): void {
  if (hazardTimer) clearTimeout(hazardTimer)
  if (hintTimer) clearTimeout(hintTimer)
  if (noticeTimer) clearTimeout(noticeTimer)
  if (stageTimer) clearTimeout(stageTimer)
  if (idleTimer) clearTimeout(idleTimer)
  hintTimer = null
  stageTimer = null
  idleTimer = null
  // The state is a module singleton, so a client-side navigation remounts on
  // whatever the last page left here. A viewer arriving on a fresh mount has
  // made no changes and has nothing open.
  changeCount = 0
  hintVisible.value = false
  objectBrowserOpen.value = false
  moreOpen.value = false
  discoveryOpen.value = false
  idle.value = false
  controller.value?.dispose()
  controller.value = null
  exitEncounter(false)
}

export function usePerigee() {
  return {
    skyObjects,
    viewpoints,
    currentObjectId: readonly(currentObjectId),
    currentPresetId: readonly(currentPresetId),
    currentViewpointId: readonly(currentViewpointId),
    currentObject,
    currentPreset,
    angularDiameter,
    hazardCopy,
    freeDiscovery,
    discoveryOpen: readonly(discoveryOpen),
    encounters,
    availableEncounter,
    currentEncounter: readonly(currentEncounter),
    currentEncounterBeat,
    currentDiscovery,
    currentPrediction,
    predictionResponse,
    encounterStatus: readonly(encounterStatus),
    encounterBeatIndex: readonly(encounterBeatIndex),
    encounterTransitioning: readonly(encounterTransitioning),
    encounterBeatRevealed: readonly(encounterBeatRevealed),
    objectBrowserOpen: readonly(objectBrowserOpen),
    moreOpen: readonly(moreOpen),
    stage: readonly(stage),
    chromeIdle,
    /** Whether the interface has reached `required`. */
    revealed: (required: DisclosureStage): boolean => stageAtLeast(stage.value, required),
    loading: readonly(loading),
    loadingProgress: readonly(loadingProgress),
    busy: readonly(busy),
    pendingObjectId: readonly(pendingObjectId),
    capabilityError: readonly(capabilityError),
    notice: readonly(notice),
    hintVisible: readonly(hintVisible),
    initialize,
    retry,
    selectObject,
    selectDistance,
    stepDistance,
    selectViewpoint,
    toggleObjectBrowser,
    toggleMore,
    openDiscovery,
    closeDiscovery,
    noteActivity,
    noteLook,
    dismissHint,
    dismissNotice,
    resetExperience,
    inviteEncounter,
    startEncounter,
    answerPrediction,
    nextEncounter,
    previousEncounter,
    replayEncounter,
    exitEncounter,
    getObjectScreenPosition,
    subscribeFrame,
    captureFrame,
    pause,
    resume,
    resize,
    dispose,
  }
}
