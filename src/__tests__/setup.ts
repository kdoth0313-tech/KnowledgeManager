/**
 * Test setup: mock IndexedDB and idb for unit tests.
 * fake-indexeddb provides a real implementation in memory.
 */
import 'fake-indexeddb/auto'

// Mock vue-router for component tests
import { vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {},
    name: 'home',
    path: '/',
    query: {},
    hash: '',
    fullPath: '/',
    matched: [],
    meta: {},
    redirectedFrom: undefined,
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  RouterLink: {
    name: 'RouterLink',
    props: ['to'],
    template: '<a :href="to?.name ? `/${to.name}` : to"><slot /></a>',
  },
  createRouter: vi.fn(),
  createWebHistory: vi.fn(),
}))
