import { describe, expect, it } from 'vitest'
import { skyObjects } from '../app/data/objects'
import { groupObjects } from '../app/utils/objectGroups'

describe('object browser groups', () => {
  it('sorts the catalogue into Solar System, Stars and Deep sky in catalogue order', () => {
    const groups = groupObjects(skyObjects)
    expect(groups.map((group) => group.label)).toEqual(['Solar System', 'Stars', 'Deep sky'])
    expect(groups.flatMap((group) => group.objects.map((object) => object.id)))
      .toEqual(skyObjects.map((object) => object.id))
  })

  it('leaves out a group with nothing in it', () => {
    const planetsOnly = skyObjects.filter((object) => object.kind === 'planet')
    expect(groupObjects(planetsOnly).map((group) => group.id)).toEqual(['solar-system'])
  })
})
