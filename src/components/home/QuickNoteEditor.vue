<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { watchDebounced, useIntervalFn, useStorage } from '@vueuse/core'
import { useDraftStore } from '@/stores/draft'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'
import MarkdownPreview from '@/components/editor/MarkdownPreview.vue'

const draftStore = useDraftStore()
const expanded = useStorage('km-quick-note-expanded', false)
const promotedNoteId = ref<string | null>(null)

function toggleExpanded(): void {
  expanded.value = !expanded.value
}

// Debounced save on content change (3 seconds) — only when actual changes exist
watchDebounced(
  () => draftStore.draftContent,
  () => {
    if (draftStore.draftContent.trim() && draftStore.hasChanges) {
      draftStore.saveDraft()
    }
  },
  { debounce: 3000, maxWait: 5000 },
)

// Periodic save every 30 seconds — only when actual changes exist
const { pause: pauseInterval, resume: resumeInterval } = useIntervalFn(
  () => {
    if (draftStore.draftContent.trim() && draftStore.hasChanges) {
      draftStore.saveDraft()
    }
  },
  30_000,
  { immediate: false },
)

// Pause interval when collapsed to avoid unnecessary writes
watchDebounced(
  expanded,
  (val) => {
    if (val) {
      resumeInterval()
    } else {
      pauseInterval()
    }
  },
  { debounce: 100 },
)

onMounted(() => {
  if (expanded.value) {
    resumeInterval()
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  pauseInterval()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

function handleBeforeUnload(): void {
  if (draftStore.draftContent.trim()) {
    // Synchronous best-effort — IndexedDB write will be attempted
    draftStore.saveDraft()
  }
}

function confirmClear(): void {
  if (confirm('清空当前草稿？')) {
    draftStore.clearDraft()
    promotedNoteId.value = null
  }
}

async function promoteToNote(): Promise<void> {
  const id = await draftStore.promoteToNote()
  if (id) {
    promotedNoteId.value = id
    setTimeout(() => {
      promotedNoteId.value = null
    }, 5000)
  }
}

function formatLastSaved(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
</script>

<template>
  <div class="quick-note">
    <!-- Header bar -->
    <div class="quick-note-header" @click="toggleExpanded" role="button" tabindex="0" @keydown.enter="toggleExpanded" @keydown.space.prevent="toggleExpanded">
      <span class="quick-note-title">📝 快速记录</span>
      <span class="quick-note-indicator">{{ expanded ? '收起 ▲' : '展开 ▼' }}</span>
    </div>

    <!-- Expandable content -->
    <div v-show="expanded" class="quick-note-body">
      <!-- Action bar -->
      <div class="quick-note-actions">
        <button class="btn-promote" :disabled="!draftStore.draftContent.trim() && !draftStore.draftTitle.trim()" @click="promoteToNote">
          保存为笔记
        </button>
        <button class="btn-clear-draft" :disabled="!draftStore.draftContent.trim() && !draftStore.draftTitle.trim()" @click="confirmClear">
          清空
        </button>
        <span v-if="draftStore.lastSaved" class="last-saved-indicator">
          ✓ 已自动保存 {{ formatLastSaved(draftStore.lastSaved) }}
        </span>
        <span v-if="promotedNoteId" class="promoted-indicator">
          ✓ 已保存为笔记！
          <RouterLink :to="{ name: 'editor', params: { id: promotedNoteId } }" class="promoted-link">查看</RouterLink>
        </span>
      </div>

      <!-- Dual-pane layout -->
      <div class="dual-pane">
        <div class="pane pane-editor">
          <input
            v-model="draftStore.draftTitle"
            type="text"
            class="draft-title-input"
            placeholder="标题（可选）..."
          />
          <div class="editor-area">
            <MarkdownEditor v-model="draftStore.draftContent" placeholder="快速记录想法..." />
          </div>
        </div>
        <div class="pane pane-preview">
          <div class="pane-label">预览</div>
          <div class="preview-area">
            <MarkdownPreview :content="draftStore.draftContent" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quick-note {
  margin-bottom: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.quick-note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.quick-note-header:hover {
  background: #f8f8fb;
}

.quick-note-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e1e2e;
}

.quick-note-indicator {
  font-size: 0.8rem;
  color: #999;
}

.quick-note-body {
  border-top: 1px solid #f0f0f0;
}

/* Action bar */
.quick-note-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #f0f0f0;
}

.btn-promote {
  background: #5865f2;
  color: #fff;
  border: none;
  padding: 0.35rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.15s;
}

.btn-promote:hover:not(:disabled) {
  background: #4752c4;
}

.btn-promote:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-clear-draft {
  background: transparent;
  color: #999;
  border: 1px solid #ddd;
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.btn-clear-draft:hover:not(:disabled) {
  color: #e53935;
  border-color: #e53935;
}

.btn-clear-draft:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.last-saved-indicator {
  font-size: 0.8rem;
  color: #4caf50;
  margin-left: auto;
}

.promoted-indicator {
  font-size: 0.8rem;
  color: #4caf50;
  margin-left: auto;
}

.promoted-link {
  color: #5865f2;
  text-decoration: underline;
  margin-left: 0.25rem;
  font-weight: 600;
}

/* Dual-pane layout */
.dual-pane {
  display: flex;
  height: 400px;
}

.pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pane-editor {
  border-right: 1px solid #e0e0e0;
}

.pane-preview {
  background: #fafafa;
}

.pane-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.5rem 1rem 0.25rem;
}

.editor-area {
  flex: 1;
  min-height: 0;
  padding: 0 0.75rem 0.75rem;
}

.editor-area :deep(.tiptap-wrapper) {
  border: none;
  border-radius: 0;
  height: 100%;
}

.editor-area :deep(.tiptap-content) {
  padding: 0.25rem;
}

.preview-area {
  flex: 1;
  min-height: 0;
  padding: 0 0.75rem 0.75rem;
}

.preview-area :deep(.preview-wrapper) {
  border: none;
  border-radius: 0;
  height: 100%;
}

.preview-area :deep(.preview-content) {
  padding: 0.25rem;
}

.draft-title-input {
  width: 100%;
  font-size: 1.15rem;
  font-weight: 600;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  outline: none;
  background: transparent;
  color: #1e1e2e;
  padding: 0.75rem 1rem;
}

.draft-title-input::placeholder {
  color: #ccc;
}

/* Responsive: stack panes on narrow screens */
@media (max-width: 640px) {
  .quick-note-header {
    padding: 0.65rem 1rem;
  }

  .quick-note-title {
    font-size: 0.9rem;
  }

  .quick-note-actions {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }

  .btn-promote,
  .btn-clear-draft {
    font-size: 0.8rem;
    padding: 0.3rem 0.7rem;
  }

  .last-saved-indicator {
    font-size: 0.72rem;
    width: 100%;
    margin-left: 0;
    padding-top: 0.25rem;
  }

  .dual-pane {
    flex-direction: column;
    height: auto;
  }

  .pane-editor {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .editor-area,
  .preview-area {
    min-height: 250px;
  }
}
</style>
