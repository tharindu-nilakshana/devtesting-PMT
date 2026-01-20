/**
 * Dynamic Layout Configuration Database
 * 
 * Contains metadata for all 43 grid layouts, enabling dynamic rendering.
 * Each layout is defined by its areas and split configurations.
 */

import { LayoutConfig } from '../types/layouts';

export const LAYOUT_CONFIGS: Record<string, LayoutConfig> = {
  // Special layouts
  'free-floating': {
    id: 'free-floating',
    name: 'free-floating',
    cells: 0, // Special case - no grid cells
    structure: {
      areas: [], // No grid areas
      splits: [] // No splits
    }
  },

  // 1-cell layouts
  'g11': {
    id: 'g11',
    name: '1-grid',
    cells: 1,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } }
      ],
      splits: []
    }
  },

  // 2-cell layouts
  'g21': {
    id: 'g21',
    name: '2-grid-vertical',
    cells: 2,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1', 'area-2'] }
      ]
    }
  },

  'g22': {
    id: 'g22',
    name: '2-grid-horizontal',
    cells: 2,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1', 'area-2'] }
      ]
    }
  },

  // 3-cell layouts
  'g31': {
    id: 'g31',
    name: '3-grid-rows',
    cells: 3,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-1', 'area-2', 'area-3'] }
      ]
    }
  },

  'g32': {
    id: 'g32',
    name: '3-grid-columns',
    cells: 3,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [33, 33, 34], areas: ['area-1', 'area-2', 'area-3'] }
      ]
    }
  },

  'g33': {
    id: 'g33',
    name: '3-grid-bottom-large',
    cells: 3,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 1 }, size: { width: 2, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1,area-2', 'area-3'] },
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1', 'area-2'] }
      ]
    }
  },

  'g34': {
    id: 'g34',
    name: '3-grid-left-large',
    cells: 3,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 2 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1', 'area-2,area-3'] },
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-2', 'area-3'] }
      ]
    }
  },

  'g35': {
    id: 'g35',
    name: '3-grid-top-large',
    cells: 3,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 2, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1', 'area-2,area-3'] },
        { direction: 'vertical', ratio: [50, 50], areas: ['area-2', 'area-3'] }
      ]
    }
  },

  'g36': {
    id: 'g36',
    name: '3-grid-right-large',
    cells: 3,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 0 }, size: { width: 1, height: 2 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1,area-2', 'area-3'] },
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1', 'area-2'] }
      ]
    }
  },

  // 4-cell layouts
  'g41': {
    id: 'g41',
    name: '4-grid',
    cells: 4,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1,area-3', 'area-2,area-4'] },
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1,area-2', 'area-3,area-4'] }
      ]
    }
  },

  'g42': {
    id: 'g42',
    name: '4-grid-columns',
    cells: 4,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 3, y: 0 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [25, 25, 25, 25], areas: ['area-1', 'area-2', 'area-3', 'area-4'] }
      ]
    }
  },

  'g43': {
    id: 'g43',
    name: '4-grid-rows',
    cells: 4,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 0, y: 3 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: ['area-1', 'area-2', 'area-3', 'area-4'] }
      ]
    }
  },

  'g44': {
    id: 'g44',
    name: '4-grid-top-large',
    cells: 4,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 2, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 0, y: 2 }, size: { width: 2, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-1', 'area-2,area-3', 'area-4'] },
        { direction: 'vertical', ratio: [50, 50], areas: ['area-2', 'area-3'] }
      ]
    }
  },

  'g45': {
    id: 'g45',
    name: '4-grid-left-large',
    cells: 4,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 3 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1', 'area-2,area-3,area-4'] },
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-2', 'area-3', 'area-4'] }
      ]
    }
  },

  'g46': {
    id: 'g46',
    name: '4-grid-right-large',
    cells: 4,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 0 }, size: { width: 1, height: 3 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1,area-2,area-3', 'area-4'] },
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-1', 'area-2', 'area-3'] }
      ]
    }
  },

  'g47': {
    id: 'g47',
    name: '4-grid-bottom-large',
    cells: 4,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 3, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 2, y: 1 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1', 'area-2,area-3,area-4'] },
        { direction: 'vertical', ratio: [33, 33, 34], areas: ['area-2', 'area-3', 'area-4'] }
      ]
    }
  },

  // 5-cell layouts
  'g51': {
    id: 'g51',
    name: '5-grid-rows',
    cells: 5,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 0, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 0, y: 4 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [20, 20, 20, 20, 20], areas: ['area-1', 'area-2', 'area-3', 'area-4', 'area-5'] }
      ]
    }
  },

  'g52': {
    id: 'g52',
    name: '5-grid-columns',
    cells: 5,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 3, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 4, y: 0 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [20, 20, 20, 20, 20], areas: ['area-1', 'area-2', 'area-3', 'area-4', 'area-5'] }
      ]
    }
  },

  'g53': {
    id: 'g53',
    name: '5-grid-complex',
    cells: 5,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 2, height: 1 } },
        { id: 'area-2', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 2, y: 1 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1', 'area-2'] },
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1,area-2', 'area-3,area-4,area-5'] },
        { direction: 'vertical', ratio: [33, 33, 34], areas: ['area-3', 'area-4', 'area-5'] }
      ]
    }
  },


  // 6-cell layouts
  'g61': {
    id: 'g61',
    name: '6-grid-2x3',
    cells: 6,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 2, y: 1 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1,area-2,area-3', 'area-4,area-5,area-6'] },
        { direction: 'vertical', ratio: [33, 33, 34], areas: ['area-1,area-4', 'area-2,area-5', 'area-3,area-6'] }
      ]
    }
  },

  'g62': {
    id: 'g62',
    name: '6-grid-3x2',
    cells: 6,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1,area-3,area-5', 'area-2,area-4,area-6'] },
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-1,area-2', 'area-3,area-4', 'area-5,area-6'] }
      ]
    }
  },

  'g63': {
    id: 'g63',
    name: '6-grid-rows',
    cells: 6,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 0, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 0, y: 4 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 0, y: 5 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [16, 16, 17, 17, 17, 17], areas: ['area-1', 'area-2', 'area-3', 'area-4', 'area-5', 'area-6'] }
      ]
    }
  },

  'g64': {
    id: 'g64',
    name: '6-grid-left-large',
    cells: 6,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 1, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 1, y: 4 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1', 'area-2,area-3,area-4,area-5,area-6'] },
        { direction: 'horizontal', ratio: [20, 20, 20, 20, 20], areas: ['area-2', 'area-3', 'area-4', 'area-5', 'area-6'] }
      ]
    }
  },

  // 7-cell layouts
  'g71': {
    id: 'g71',
    name: '7-grid-complex1',
    cells: 7,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 3 } },
        { id: 'area-2', position: { x: 0, y: 3 }, size: { width: 1, height: 3 } },
        { id: 'area-3', position: { x: 0, y: 6 }, size: { width: 1, height: 3 } },
        { id: 'area-4', position: { x: 0, y: 9 }, size: { width: 1, height: 3 } },
        { id: 'area-5', position: { x: 1, y: 0 }, size: { width: 1, height: 4 } },
        { id: 'area-6', position: { x: 1, y: 4 }, size: { width: 1, height: 4 } },
        { id: 'area-7', position: { x: 1, y: 8 }, size: { width: 1, height: 4 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1,area-2,area-3,area-4', 'area-5,area-6,area-7'] },
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: ['area-1', 'area-2', 'area-3', 'area-4'] },
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-5', 'area-6', 'area-7'] }
      ]
    }
  },

  'g72': {
    id: 'g72',
    name: '7-grid-complex2',
    cells: 7,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 6 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 1, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 1, y: 4 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 1, y: 5 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1', 'area-2,area-3,area-4,area-5,area-6,area-7'] },
        { direction: 'horizontal', ratio: [16, 16, 17, 17, 17, 17], areas: ['area-2', 'area-3', 'area-4', 'area-5', 'area-6', 'area-7'] }
      ]
    }
  },

  'g73': {
    id: 'g73',
    name: '7-grid-left',
    cells: 7,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 3 } },
        { id: 'area-2', position: { x: 0, y: 3 }, size: { width: 1, height: 3 } },
        { id: 'area-3', position: { x: 0, y: 6 }, size: { width: 1, height: 3 } },
        { id: 'area-4', position: { x: 0, y: 9 }, size: { width: 1, height: 3 } },
        { id: 'area-5', position: { x: 1, y: 0 }, size: { width: 1, height: 4 } },
        { id: 'area-6', position: { x: 1, y: 4 }, size: { width: 1, height: 4 } },
        { id: 'area-7', position: { x: 1, y: 8 }, size: { width: 1, height: 4 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1,area-2,area-3,area-4', 'area-5,area-6,area-7'] },
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: ['area-1', 'area-2', 'area-3', 'area-4'] },
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-5', 'area-6', 'area-7'] }
      ]
    }
  },

  'g74': {
    id: 'g74',
    name: '7-grid-large',
    cells: 7,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 6 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 1, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 1, y: 4 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 1, y: 5 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1', 'area-2,area-3,area-4,area-5,area-6,area-7'] },
        { direction: 'horizontal', ratio: [16, 16, 17, 17, 17, 17], areas: ['area-2', 'area-3', 'area-4', 'area-5', 'area-6', 'area-7'] }
      ]
    }
  },

  // 8-cell layouts
  'g81': {
    id: 'g81',
    name: '8-grid-2x4',
    cells: 8,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 0, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-8', position: { x: 1, y: 3 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [50, 50], areas: ['area-1,area-3,area-5,area-7', 'area-2,area-4,area-6,area-8'] },
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: ['area-1,area-2', 'area-3,area-4', 'area-5,area-6', 'area-7,area-8'] }
      ]
    }
  },

  'g82': {
    id: 'g82',
    name: '8-grid-4x2',
    cells: 8,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 3, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 2, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-8', position: { x: 3, y: 1 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [25, 25, 25, 25], areas: ['area-1,area-5', 'area-2,area-6', 'area-3,area-7', 'area-4,area-8'] },
        { direction: 'horizontal', ratio: [50, 50], areas: ['area-1,area-2,area-3,area-4', 'area-5,area-6,area-7,area-8'] }
      ]
    }
  },

  'g83': {
    id: 'g83',
    name: '8-grid-columns',
    cells: 8,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 3, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 4, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 5, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 6, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-8', position: { x: 7, y: 0 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [12, 12, 13, 13, 13, 13, 12, 12], areas: ['area-1', 'area-2', 'area-3', 'area-4', 'area-5', 'area-6', 'area-7', 'area-8'] }
      ]
    }
  },

  'g84': {
    id: 'g84',
    name: '8-grid-rows',
    cells: 8,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 0, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 0, y: 4 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 0, y: 5 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 0, y: 6 }, size: { width: 1, height: 1 } },
        { id: 'area-8', position: { x: 0, y: 7 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [12, 12, 13, 13, 13, 13, 12, 12], areas: ['area-1', 'area-2', 'area-3', 'area-4', 'area-5', 'area-6', 'area-7', 'area-8'] }
      ]
    }
  },

  // 9-cell layouts
  'g91': {
    id: 'g91',
    name: '9-grid',
    cells: 9,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 2, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-8', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-9', position: { x: 2, y: 2 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [33, 33, 34], areas: ['area-1,area-4,area-7', 'area-2,area-5,area-8', 'area-3,area-6,area-9'] },
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-1,area-2,area-3', 'area-4,area-5,area-6', 'area-7,area-8,area-9'] }
      ]
    }
  },

  // 12-cell layouts
  'g121': {
    id: 'g121',
    name: '12-grid-3x4',
    cells: 12,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 3, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 2, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-8', position: { x: 3, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-9', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-10', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-11', position: { x: 2, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-12', position: { x: 3, y: 2 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'horizontal', ratio: [33, 33, 34], areas: ['area-1,area-2,area-3,area-4', 'area-5,area-6,area-7,area-8', 'area-9,area-10,area-11,area-12'] },
        { direction: 'vertical', ratio: [25, 25, 25, 25], areas: ['area-1,area-5,area-9', 'area-2,area-6,area-10', 'area-3,area-7,area-11', 'area-4,area-8,area-12'] }
      ]
    }
  },

  'g122': {
    id: 'g122',
    name: '12-grid-4x3',
    cells: 12,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 2, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-8', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-9', position: { x: 2, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-10', position: { x: 0, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-11', position: { x: 1, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-12', position: { x: 2, y: 3 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [33, 33, 34], areas: ['area-1,area-4,area-7,area-10', 'area-2,area-5,area-8,area-11', 'area-3,area-6,area-9,area-12'] },
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: ['area-1,area-2,area-3', 'area-4,area-5,area-6', 'area-7,area-8,area-9', 'area-10,area-11,area-12'] }
      ]
    }
  },

  // 16-cell layouts
  'g161': {
    id: 'g161',
    name: '16-grid',
    cells: 16,
    structure: {
      areas: [
        { id: 'area-1', position: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-2', position: { x: 1, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-3', position: { x: 2, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-4', position: { x: 3, y: 0 }, size: { width: 1, height: 1 } },
        { id: 'area-5', position: { x: 0, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-6', position: { x: 1, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-7', position: { x: 2, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-8', position: { x: 3, y: 1 }, size: { width: 1, height: 1 } },
        { id: 'area-9', position: { x: 0, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-10', position: { x: 1, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-11', position: { x: 2, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-12', position: { x: 3, y: 2 }, size: { width: 1, height: 1 } },
        { id: 'area-13', position: { x: 0, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-14', position: { x: 1, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-15', position: { x: 2, y: 3 }, size: { width: 1, height: 1 } },
        { id: 'area-16', position: { x: 3, y: 3 }, size: { width: 1, height: 1 } }
      ],
      splits: [
        { direction: 'vertical', ratio: [25, 25, 25, 25], areas: ['area-1,area-5,area-9,area-13', 'area-2,area-6,area-10,area-14', 'area-3,area-7,area-11,area-15', 'area-4,area-8,area-12,area-16'] },
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: ['area-1,area-2,area-3,area-4', 'area-5,area-6,area-7,area-8', 'area-9,area-10,area-11,area-12', 'area-13,area-14,area-15,area-16'] }
      ]
    }
  },

  // 24-cell layouts
  'g241': {
    id: 'g241',
    name: '24-grid-4x6',
    cells: 24,
    structure: {
      areas: Array.from({ length: 24 }, (_, i) => ({
        id: `area-${i + 1}`,
        position: { x: i % 4, y: Math.floor(i / 4) },
        size: { width: 1, height: 1 }
      })),
      splits: [
        { direction: 'vertical', ratio: [25, 25, 25, 25], areas: Array.from({ length: 4 }, (_, i) => 
          Array.from({ length: 6 }, (_, j) => `area-${i * 6 + j + 1}`).join(',')
        ) },
        { direction: 'horizontal', ratio: [16, 16, 17, 17, 17, 17], areas: Array.from({ length: 6 }, (_, i) => 
          Array.from({ length: 4 }, (_, j) => `area-${i * 4 + j + 1}`).join(',')
        ) }
      ]
    }
  },

  'g242': {
    id: 'g242',
    name: '24-grid-6x4',
    cells: 24,
    structure: {
      areas: Array.from({ length: 24 }, (_, i) => ({
        id: `area-${i + 1}`,
        position: { x: i % 6, y: Math.floor(i / 6) },
        size: { width: 1, height: 1 }
      })),
      splits: [
        { direction: 'vertical', ratio: [16, 16, 17, 17, 17, 17], areas: Array.from({ length: 6 }, (_, i) => 
          Array.from({ length: 4 }, (_, j) => `area-${i * 4 + j + 1}`).join(',')
        ) },
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: Array.from({ length: 4 }, (_, i) => 
          Array.from({ length: 6 }, (_, j) => `area-${i * 6 + j + 1}`).join(',')
        ) }
      ]
    }
  },

  'g243': {
    id: 'g243',
    name: '24-grid-3x8',
    cells: 24,
    structure: {
      areas: Array.from({ length: 24 }, (_, i) => ({
        id: `area-${i + 1}`,
        position: { x: i % 3, y: Math.floor(i / 3) },
        size: { width: 1, height: 1 }
      })),
      splits: [
        { direction: 'vertical', ratio: [33, 33, 34], areas: Array.from({ length: 3 }, (_, i) => 
          Array.from({ length: 8 }, (_, j) => `area-${i * 8 + j + 1}`).join(',')
        ) },
        { direction: 'horizontal', ratio: [12, 12, 13, 13, 13, 13, 12, 12], areas: Array.from({ length: 8 }, (_, i) => 
          Array.from({ length: 3 }, (_, j) => `area-${i * 3 + j + 1}`).join(',')
        ) }
      ]
    }
  },

  'g244': {
    id: 'g244',
    name: '24-grid-8x3',
    cells: 24,
    structure: {
      areas: Array.from({ length: 24 }, (_, i) => ({
        id: `area-${i + 1}`,
        position: { x: i % 8, y: Math.floor(i / 8) },
        size: { width: 1, height: 1 }
      })),
      splits: [
        { direction: 'vertical', ratio: [12, 12, 13, 13, 13, 13, 12, 12], areas: Array.from({ length: 8 }, (_, i) => 
          Array.from({ length: 3 }, (_, j) => `area-${i * 3 + j + 1}`).join(',')
        ) },
        { direction: 'horizontal', ratio: [33, 33, 34], areas: Array.from({ length: 3 }, (_, i) => 
          Array.from({ length: 8 }, (_, j) => `area-${i * 8 + j + 1}`).join(',')
        ) }
      ]
    }
  },

  // 28-cell layouts
  'g281': {
    id: 'g281',
    name: '28-grid-4x7',
    cells: 28,
    structure: {
      areas: Array.from({ length: 28 }, (_, i) => ({
        id: `area-${i + 1}`,
        position: { x: i % 4, y: Math.floor(i / 4) },
        size: { width: 1, height: 1 }
      })),
      splits: [
        { direction: 'vertical', ratio: [25, 25, 25, 25], areas: Array.from({ length: 4 }, (_, i) => 
          Array.from({ length: 7 }, (_, j) => `area-${i * 7 + j + 1}`).join(',')
        ) },
        { direction: 'horizontal', ratio: [14, 14, 14, 14, 14, 15, 15], areas: Array.from({ length: 7 }, (_, i) => 
          Array.from({ length: 4 }, (_, j) => `area-${i * 4 + j + 1}`).join(',')
        ) }
      ]
    }
  },

  'g282': {
    id: 'g282',
    name: '28-grid-7x4',
    cells: 28,
    structure: {
      areas: Array.from({ length: 28 }, (_, i) => ({
        id: `area-${i + 1}`,
        position: { x: i % 7, y: Math.floor(i / 7) },
        size: { width: 1, height: 1 }
      })),
      splits: [
        { direction: 'vertical', ratio: [14, 14, 14, 14, 14, 15, 15], areas: Array.from({ length: 7 }, (_, i) => 
          Array.from({ length: 4 }, (_, j) => `area-${i * 4 + j + 1}`).join(',')
        ) },
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: Array.from({ length: 4 }, (_, i) => 
          Array.from({ length: 7 }, (_, j) => `area-${i * 7 + j + 1}`).join(',')
        ) }
      ]
    }
  },

  // 32-cell layouts
  'g321': {
    id: 'g321',
    name: '32-grid-4x8',
    cells: 32,
    structure: {
      areas: Array.from({ length: 32 }, (_, i) => ({
        id: `area-${i + 1}`,
        position: { x: i % 4, y: Math.floor(i / 4) },
        size: { width: 1, height: 1 }
      })),
      splits: [
        { direction: 'vertical', ratio: [25, 25, 25, 25], areas: Array.from({ length: 4 }, (_, i) => 
          Array.from({ length: 8 }, (_, j) => `area-${i * 8 + j + 1}`).join(',')
        ) },
        { direction: 'horizontal', ratio: [12, 12, 13, 13, 13, 13, 12, 12], areas: Array.from({ length: 8 }, (_, i) => 
          Array.from({ length: 4 }, (_, j) => `area-${i * 4 + j + 1}`).join(',')
        ) }
      ]
    }
  },

  'g322': {
    id: 'g322',
    name: '32-grid-8x4',
    cells: 32,
    structure: {
      areas: Array.from({ length: 32 }, (_, i) => ({
        id: `area-${i + 1}`,
        position: { x: i % 8, y: Math.floor(i / 8) },
        size: { width: 1, height: 1 }
      })),
      splits: [
        { direction: 'vertical', ratio: [12, 12, 13, 13, 13, 13, 12, 12], areas: Array.from({ length: 8 }, (_, i) => 
          Array.from({ length: 4 }, (_, j) => `area-${i * 4 + j + 1}`).join(',')
        ) },
        { direction: 'horizontal', ratio: [25, 25, 25, 25], areas: Array.from({ length: 4 }, (_, i) => 
          Array.from({ length: 8 }, (_, j) => `area-${i * 8 + j + 1}`).join(',')
        ) }
      ]
    }
  }
};

/**
 * Get layout configuration by ID
 */
export function getLayoutConfig(layoutId: string): LayoutConfig | null {
  return LAYOUT_CONFIGS[layoutId] || null;
}

/**
 * Get all available layout configurations
 */
export function getAllLayoutConfigs(): LayoutConfig[] {
  return Object.values(LAYOUT_CONFIGS);
}

/**
 * Get layout configuration by frontend name
 */
export function getLayoutConfigByName(layoutName: string): LayoutConfig | null {
  return Object.values(LAYOUT_CONFIGS).find(config => config.name === layoutName) || null;
}
