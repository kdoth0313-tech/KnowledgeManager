import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useKnowledgeStore } from '@/stores/knowledge'
import NoteList from '@/components/notes/NoteList.vue'

function createWrapper() {
  return mount(NoteList, {
    global: {
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
          props: ['to'],
        },
      },
    },
  })
}

describe('NoteList', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    // Wait for store init
    const store = useKnowledgeStore()
    await store.initPromise
  })

  it('renders search bar', () => {
    const wrapper = createWrapper()
    const input = wrapper.find('.search-input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toContain('搜索')
  })

  it('shows empty state when no notes exist', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有笔记')
  })

  it('displays note cards when items exist', async () => {
    const store = useKnowledgeStore()
    await store.addItem('Test Note', '<p>content</p>', 'summary', ['kw1'], ['tag1'])

    const wrapper = createWrapper()

    // The item should appear
    expect(wrapper.find('.note-card').exists()).toBe(true)
    // Title should be visible — need to wait for reactivity
    await wrapper.vm.$nextTick()
    const titleEl = wrapper.find('.note-title')
    expect(titleEl.exists()).toBe(true)
  })

  it('shows "no results" when search finds nothing', async () => {
    const store = useKnowledgeStore()
    await store.addItem('Test', 'content', '', [], [])

    const wrapper = createWrapper()

    const input = wrapper.find('.search-input')
    await input.setValue('zzznonexistent')

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 400))

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('没有匹配的笔记')
  })

  it('has export button when items exist', async () => {
    const store = useKnowledgeStore()
    await store.addItem('T', '', '', [], [])

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.btn-export-all').exists()).toBe(true)
  })
})
