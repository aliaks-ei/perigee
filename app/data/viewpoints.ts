import type { ViewpointDefinition } from '~/types/perigee'

export const viewpoints: ViewpointDefinition[] = [
  {
    id: 'rooftop',
    label: 'Rooftop',
    description: 'A quiet city roof after dark',
    thumbnail: '/assets/environments/thumbs/rooftop.webp',
  },
  {
    id: 'hilltop',
    label: 'Hilltop',
    description: 'A low meadow at the edge of evening',
    thumbnail: '/assets/environments/thumbs/hilltop.webp',
  },
  {
    id: 'lakeside',
    label: 'Lakeside',
    description: 'Still water beneath an open horizon',
    thumbnail: '/assets/environments/thumbs/lakeside.webp',
  },
  {
    id: 'cabo-da-roca',
    label: 'Cabo da Roca',
    description: 'Atlantic cliffs beneath Portugal\'s western lighthouse',
    thumbnail: '/assets/environments/thumbs/cabo-da-roca.webp',
  },
]
