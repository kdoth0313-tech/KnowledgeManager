import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import FlexSearch from 'flexsearch'
import type { KnowledgeItem, SearchResult } from '@/types'
import {
  getNotes,
  addNote as dbAddNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  getTagCounts,
  migrateFromIdbKeyval,
} from '@/services/db'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

export const useKnowledgeStore = defineStore('knowledge', () => {
  const items = ref<KnowledgeItem[]>([])
  const tagCounts = ref<Record<string, number>>({})
  const isLoaded = ref(false)

  // FlexSearch index
  const searchIndex = new FlexSearch.Document<{
    id: string
    title: string
    summary: string
    content: string
    keywords: string
    tags: string
  }>({
    document: {
      id: 'id',
      store: ['title', 'content'],
      index: [
        { field: 'title', encode: false, tokenize: 'full' },
        { field: 'summary', encode: false, tokenize: 'full' },
        { field: 'content', encode: false, tokenize: 'forward' },
        { field: 'keywords', encode: false, tokenize: 'full' },
        { field: 'tags', encode: false, tokenize: 'full' },
      ],
    },
  })

  // Pre-built FlexSearch index (populated during init)
  // function rebuildIndex is kept for potential future use — manually re-index all items
  /*
  function rebuildIndex(): void {
    // FlexSearch doesn't have a clear-all, so we recreate by removing all known
    items.value.forEach((item) => {
      try {
        searchIndex.remove(item.id)
      } catch {
        // Item may not be indexed yet
      }
    })
    items.value.forEach((item) => {
      searchIndex.add({
        id: item.id,
        title: item.title,
        summary: item.summary,
        content: item.content,
        keywords: item.keywords.join(' '),
        tags: item.tags.join(' '),
      })
    })
  }
  */

  // Initialize — load from IndexedDB with migration
  const initPromise = (async () => {
    try {
      // Attempt migration from idb-keyval first
      await migrateFromIdbKeyval()
      // Load notes
      items.value = await getNotes()
      // Load tag counts
      tagCounts.value = await getTagCounts()
      // Build FlexSearch index
      items.value.forEach((item) => {
        searchIndex.add({
          id: item.id,
          title: item.title,
          summary: item.summary,
          content: item.content,
          keywords: item.keywords.join(' '),
          tags: item.tags.join(' '),
        })
      })
    } catch (err) {
      console.warn('Failed to load notes from IndexedDB:', err)
    } finally {
      isLoaded.value = true
    }
  })()

  // Global selected tag filter
  const selectedTag = ref<string | null>(null)

  function selectTag(tag: string | null): void {
    selectedTag.value = selectedTag.value === tag ? null : tag
  }

  function clearTagFilter(): void {
    selectedTag.value = null
  }

  // Global selected subject filter
  const selectedSubject = ref<string | null>(null)

  function selectSubject(subject: string | null): void {
    selectedSubject.value = selectedSubject.value === subject ? null : subject
  }

  function clearSubjectFilter(): void {
    selectedSubject.value = null
  }

  // Note count per subject id (derived from in-memory items)
  const subjectCounts = computed<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const item of items.value) {
      const s = item.subject || ''
      if (!s) continue
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  })

  const tagList = computed<string[]>(() => {
    // Derive from in-memory tagCounts for O(1) read
    return Object.keys(tagCounts.value).sort()
  })

  // ---- mutations ----

  async function addItem(
    title: string,
    content: string,
    summary: string,
    keywords: string[],
    tags: string[],
    subject = '',
  ): Promise<string> {
    const now = Date.now()
    const id = generateId()
    const item: KnowledgeItem = { id, title, content, summary, keywords, tags, subject, createdAt: now, updatedAt: now }

    try {
      await dbAddNote(item)
    } catch (err) {
      console.warn('Failed to persist new note:', err)
    }

    items.value.unshift(item)
    searchIndex.add({ id, title, summary, content, keywords: keywords.join(' '), tags: tags.join(' ') })

    // Update in-memory tag counts
    for (const tag of tags) {
      tagCounts.value = { ...tagCounts.value, [tag]: (tagCounts.value[tag] || 0) + 1 }
    }

    return id
  }

  async function updateItem(
    id: string,
    patch: Partial<Pick<KnowledgeItem, 'title' | 'content' | 'summary' | 'keywords' | 'tags' | 'subject'>>,
  ): Promise<boolean> {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx === -1) return false

    const old = items.value[idx]

    try {
      await dbUpdateNote(id, patch)
    } catch (err) {
      console.warn('Failed to persist note update:', err)
    }

    const updated: KnowledgeItem = {
      ...old,
      ...patch,
      updatedAt: Date.now(),
    }
    items.value[idx] = updated

    // Update tag counts if tags changed
    if (patch.tags) {
      const newCounts = { ...tagCounts.value }
      // Decrement old tags
      for (const tag of old.tags) {
        if (!patch.tags.includes(tag)) {
          newCounts[tag] = (newCounts[tag] || 1) - 1
          if (newCounts[tag] <= 0) delete newCounts[tag]
        }
      }
      // Increment new tags
      for (const tag of patch.tags) {
        if (!old.tags.includes(tag)) {
          newCounts[tag] = (newCounts[tag] || 0) + 1
        }
      }
      tagCounts.value = newCounts
    }

    // Re-index
    searchIndex.remove(id)
    searchIndex.add({
      id,
      title: updated.title,
      summary: updated.summary,
      content: updated.content,
      keywords: updated.keywords.join(' '),
      tags: updated.tags.join(' '),
    })

    return true
  }

  async function removeItem(id: string): Promise<boolean> {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx === -1) return false

    const item = items.value[idx]

    try {
      await dbDeleteNote(id)
    } catch (err) {
      console.warn('Failed to delete note from IndexedDB:', err)
    }

    items.value.splice(idx, 1)
    searchIndex.remove(id)

    // Update tag counts
    const newCounts = { ...tagCounts.value }
    for (const tag of item.tags) {
      newCounts[tag] = (newCounts[tag] || 1) - 1
      if (newCounts[tag] <= 0) delete newCounts[tag]
    }
    tagCounts.value = newCounts

    return true
  }

  function getItemById(id: string): KnowledgeItem | undefined {
    return items.value.find((i) => i.id === id)
  }

  function getRelatedNotes(
    currentId: string,
    maxCount = 5,
  ): KnowledgeItem[] {
    const current = items.value.find((i) => i.id === currentId)
    if (!current || current.tags.length === 0) {
      // No tags — return most recent notes (excluding current)
      return items.value
        .filter((i) => i.id !== currentId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, maxCount)
    }

    const currentTags = new Set(current.tags)

    // Score other notes by shared tag count
    const scored = items.value
      .filter((i) => i.id !== currentId)
      .map((item) => {
        let shared = 0
        for (const tag of item.tags) {
          if (currentTags.has(tag)) shared++
        }
        return { item, shared }
      })

    // Sort: highest shared count first, then most recent
    scored.sort((a, b) => {
      if (b.shared !== a.shared) return b.shared - a.shared
      return b.item.createdAt - a.item.createdAt
    })

    const related = scored.filter((s) => s.shared > 0)
    if (related.length >= maxCount) {
      return related.slice(0, maxCount).map((s) => s.item)
    }

    // Fill remaining slots with recent notes that aren't already included
    const includedIds = new Set(related.map((s) => s.item.id))
    const recent = items.value
      .filter((i) => i.id !== currentId && !includedIds.has(i.id))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, maxCount - related.length)

    return [...related.map((s) => s.item), ...recent]
  }

  function search(query: string): SearchResult[] {
    const results = searchIndex.search(query, { limit: 50, enrich: true })
    const seen = new Set<string>()
    const merged: SearchResult[] = []

    for (const group of results) {
      if (!group.result) continue
      for (const match of group.result) {
        // With enrich:true and store, match is { id: string, doc: { title, content, ... } }
        const id = (match as unknown as { id: string }).id
        const stored = (match as unknown as { doc?: { title?: string; content?: string } }).doc
        if (!id || seen.has(id)) continue
        seen.add(id)
        const score = typeof (match as unknown as { score?: number }).score === 'number' ? (match as unknown as { score: number }).score : 0
        merged.push({
          id,
          title: stored?.title ?? '',
          excerpt: (stored?.content ?? '').slice(0, 200),
          score,
        })
      }
    }

    // Sort by score descending (higher = more relevant)
    merged.sort((a, b) => b.score - a.score)
    return merged
  }

  /**
   * Combined advanced search with tag filter and date range.
   * All conditions are ANDed together.
   */
  const searchQuery = ref('')
  const dateRangeStart = ref<string>('') // YYYY-MM-DD or empty
  const dateRangeEnd = ref<string>('')   // YYYY-MM-DD or empty

  function advancedSearch(opts: {
    query?: string
    tag?: string | null
    subject?: string | null
    dateStart?: string
    dateEnd?: string
  }): KnowledgeItem[] {
    let results: KnowledgeItem[]

    const q = opts.query?.trim()
    if (q) {
      // Use FlexSearch for text search
      const searchResults = search(q)
      results = searchResults
        .map((r) => getItemById(r.id))
        .filter((item): item is KnowledgeItem => item != null)
    } else {
      results = [...items.value]
    }

    // Filter by tag
    if (opts.tag) {
      const tagFilter = opts.tag
      results = results.filter((item) => item.tags.includes(tagFilter))
    }

    // Filter by subject
    if (opts.subject) {
      const subjectFilter = opts.subject
      results = results.filter((item) => item.subject === subjectFilter)
    }

    // Filter by date range
    const startTs = opts.dateStart ? new Date(opts.dateStart).getTime() : 0
    const endTs = opts.dateEnd ? new Date(opts.dateEnd + 'T23:59:59').getTime() : Infinity

    if (startTs > 0 || endTs < Infinity) {
      results = results.filter((item) => {
        const created = item.createdAt
        return created >= startTs && created <= endTs
      })
    }

    // Sort by score if search was used, otherwise by createdAt desc
    if (!q) {
      results.sort((a, b) => b.createdAt - a.createdAt)
    }

    return results
  }

  return {
    items,
    tagList,
    tagCounts,
    selectedTag,
    selectedSubject,
    subjectCounts,
    searchQuery,
    dateRangeStart,
    dateRangeEnd,
    isLoaded,
    initPromise,
    addItem,
    updateItem,
    removeItem,
    getItemById,
    search,
    advancedSearch,
    selectTag,
    clearTagFilter,
    selectSubject,
    clearSubjectFilter,
    getRelatedNotes,
  }
})
