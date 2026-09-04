/**
 * The interface arrives in four steps, each unlocked by what the viewer has
 * done, with a time fallback so a passive viewer still gets there.
 *
 * 1. `arrive`: the scene, the object's name and the brand. Nothing to operate.
 * 2. `orient`: the metadata line and the control pill, after the first drag,
 *    tap or key, or once the viewer has looked for a while.
 * 3. `explore`: the discovery note, the hazard line and the landscape chooser,
 *    after the first change of object, distance or landscape.
 * 4. `deepen`: nothing new to show. The interface is complete, so the chrome
 *    may now step back when the viewer is idle.
 *
 * The ladder only climbs. A viewer never loses a control they have seen.
 */
export const DISCLOSURE_STAGES = ['arrive', 'orient', 'explore', 'deepen'] as const

export type DisclosureStage = (typeof DISCLOSURE_STAGES)[number]

/** Milliseconds a passive viewer waits at each stage before the next opens. */
export const STAGE_FALLBACK_MS: Record<Exclude<DisclosureStage, 'deepen'>, number> = {
  arrive: 4_000,
  orient: 12_000,
  explore: 20_000,
}

/** Milliseconds without pointer or key activity before the chrome steps back. */
export const IDLE_AFTER_MS = 15_000

/** How long the scene settles before the drag hint is offered. */
export const HINT_DELAY_MS = 2_000

/** How long the drag hint stays if the viewer never touches the sky. */
export const HINT_LIFETIME_MS = 8_000

export function stageIndex(stage: DisclosureStage): number {
  return DISCLOSURE_STAGES.indexOf(stage)
}

export function stageAtLeast(current: DisclosureStage, required: DisclosureStage): boolean {
  return stageIndex(current) >= stageIndex(required)
}

/** The later of the two, so a request to climb never steps back down. */
export function advanceStage(current: DisclosureStage, target: DisclosureStage): DisclosureStage {
  return stageAtLeast(current, target) ? current : target
}

export function nextStage(current: DisclosureStage): DisclosureStage | null {
  return DISCLOSURE_STAGES[stageIndex(current) + 1] ?? null
}

/**
 * Where a session starts. A shared link or a curated encounter route brought
 * the viewer for a specific view, so they skip the orientation steps.
 */
export function initialStage(options: { sharedView: boolean, encounter: boolean }): DisclosureStage {
  return options.sharedView || options.encounter ? 'explore' : 'arrive'
}

/**
 * The stage a viewer action unlocks. Looking around proves they have found
 * the sky; changing the view proves they have found the controls; a second
 * change, or starting an encounter, proves they are settled in.
 */
export function stageForAction(
  action: 'look' | 'change' | 'encounter',
  changesSoFar: number,
): DisclosureStage {
  if (action === 'look') return 'orient'
  if (action === 'encounter') return 'deepen'
  return changesSoFar >= 2 ? 'deepen' : 'explore'
}
