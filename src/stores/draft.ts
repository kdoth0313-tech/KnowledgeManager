import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DraftState } from '@/types'
import { useKnowledgeStore } from '@/stores/knowledge'
import { getDraft, saveDraft, deleteDraft } from '@/services/db'

export const useDraftStore = defineStore('draft', () => {
  const draftContent = ref('')
  const draftTitle = ref('')
  const draftTags = ref<string[]>([])
  const draftSubject = ref('')
  const lastSaved = ref<number | null>(null)
  const isLoaded = ref(false)

  async function loadDraft(): Promise<void> {
    try {
      const stored = await getDraft()
      if (stored) {
        draftContent.value = stored.content ?? ''
        draftTitle.value = stored.title ?? ''
        draftTags.value = stored.tags ?? []
        draftSubject.value = stored.subject ?? ''
        lastSaved.value = stored.lastSaved ?? null
      }
    } catch (err) {
      console.warn('Failed to load draft from IndexedDB:', err)
    } finally {
      isLoaded.value = true
    }
  }

  async function persist(): Promise<void> {
    const now = Date.now()
    const state: DraftState = {
      content: draftContent.value,
      title: draftTitle.value,
      tags: draftTags.value,
      subject: draftSubject.value,
      lastSaved: now,
    }
    try {
      await saveDraft(state)
      lastSaved.value = now
    } catch (err) {
      console.warn('Failed to save draft to IndexedDB:', err)
    }
  }

  async function clearDraft(): Promise<void> {
    draftContent.value = ''
    draftTitle.value = ''
    draftTags.value = []
    draftSubject.value = ''
    lastSaved.value = null
    try {
      await deleteDraft()
    } catch (err) {
      console.warn('Failed to delete draft from IndexedDB:', err)
    }
  }

  function promoteToNote(): string | null {
    if (!draftContent.value.trim() && !draftTitle.value.trim()) {
      return null
    }
    const knowledgeStore = useKnowledgeStore()
    const finalTitle = draftTitle.value.trim() || '未命名笔记'
    const finalTags = [...draftTags.value]
    const id = knowledgeStore.addItem(finalTitle, draftContent.value, '', [], finalTags, draftSubject.value)
    clearDraft()
    return id
  }

  return {
    draftContent,
    draftTitle,
    draftTags,
    draftSubject,
    lastSaved,
    isLoaded,
    loadDraft,
    saveDraft: persist,
    clearDraft,
    promoteToNote,
  }
})
