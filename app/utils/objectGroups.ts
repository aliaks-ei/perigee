import type { SkyObjectDefinition } from '~/types/perigee'

export interface ObjectGroup {
  id: 'solar-system' | 'stars' | 'deep-sky'
  label: string
  objects: SkyObjectDefinition[]
}

const GROUPS: ReadonlyArray<{ id: ObjectGroup['id'], label: string, kinds: ReadonlyArray<SkyObjectDefinition['kind']> }> = [
  { id: 'solar-system', label: 'Solar System', kinds: ['moon', 'planet'] },
  { id: 'stars', label: 'Stars', kinds: ['star'] },
  { id: 'deep-sky', label: 'Deep sky', kinds: ['galaxy'] },
]

/**
 * The object browser shows the catalogue in three groups rather than one flat
 * row, so a viewer knows what lies beyond the edge of a phone-width track and
 * a tenth object joins its family instead of splitting the row. Groups keep
 * the catalogue's own order inside them, and an empty group is left out.
 */
export function groupObjects(objects: readonly SkyObjectDefinition[]): ObjectGroup[] {
  return GROUPS
    .map((group) => ({
      id: group.id,
      label: group.label,
      objects: objects.filter((object) => group.kinds.includes(object.kind)),
    }))
    .filter((group) => group.objects.length > 0)
}
