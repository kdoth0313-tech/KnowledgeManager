<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useKnowledgeStore } from '@/stores/knowledge'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'
import SubjectPicker from '@/components/common/SubjectPicker.vue'
import { useExportPdf } from '@/composables/useExportPdf'
import { useDraggable } from '@/composables/useDraggable'

const route = useRoute()
const router = useRouter()
const store = useKnowledgeStore()
const { exportNote } = useExportPdf()

// Tag collapse on mobile
const tagsExpanded = ref(false)
const TAGS_VISIBLE_DEFAULT = 2
const visibleTags = computed(() =>
  tagsExpanded.value ? tags.value : tags.value.slice(0, TAGS_VISIBLE_DEFAULT),
)

const isNew = computed(() => !route.params.id)
const itemId = computed(() => route.params.id as string | undefined)

// Load existing item
const existing = computed(() => {
  if (!itemId.value) return undefined
  return store.getItemById(itemId.value)
})

const title = ref(existing.value?.title ?? '')
const content = ref(existing.value?.content ?? '')
const summary = ref(existing.value?.summary ?? '')
const subject = ref(existing.value?.subject ?? '')
const keywordInput = ref('')
const keywords = ref<string[]>([...(existing.value?.keywords ?? [])])
const tagInput = ref('')
const tags = ref<string[]>([...(existing.value?.tags ?? [])])
const saved = ref(false)
const leaving = ref(false)
const isFloating = ref(false)
const subjectError = ref(false)
const { x, y, isDragging, onDragStart } = useDraggable()

// Related notes
const relatedNotes = computed(() => {
  if (!itemId.value || isNew.value) return []
  return store.getRelatedNotes(itemId.value, 8)
})

const MAX_RELATED = 8
const relatedNotesDisplay = computed(() => relatedNotes.value.slice(0, MAX_RELATED))

// When navigating between existing items, reset form
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      const item = store.getItemById(newId as string)
      title.value = item?.title ?? ''
      content.value = item?.content ?? ''
      summary.value = item?.summary ?? ''
      subject.value = item?.subject ?? ''
      keywords.value = [...(item?.keywords ?? [])]
      tags.value = [...(item?.tags ?? [])]
    } else {
      title.value = ''
      content.value = ''
      summary.value = ''
      subject.value = ''
      keywords.value = []
      tags.value = []
    }
    saved.value = false
  },
)

function addKeyword() {
  const k = keywordInput.value.trim()
  if (k && !keywords.value.includes(k)) {
    keywords.value.push(k)
    keywordInput.value = ''
  }
}

function removeKeyword(keyword: string) {
  keywords.value = keywords.value.filter((k) => k !== keyword)
}

function addTag() {
  const t = tagInput.value.trim()
  if (t && !tags.value.includes(t)) {
    tags.value.push(t)
    tagInput.value = ''
  }
}

function removeTag(tag: string) {
  tags.value = tags.value.filter((t) => t !== tag)
}

// Clear subject error when user selects a subject
watch(subject, (val) => {
  if (val) subjectError.value = false
})

async function save(autoTitle = false, navigateAfterSave = true) {
  const finalTitle = title.value.trim() || (autoTitle ? '未命名笔记' : '')
  if (!finalTitle && autoTitle) return

  // Require subject selection before saving
  if (!subject.value) {
    subjectError.value = true
    return
  }

  if (isNew.value) {
    const id = await store.addItem(
      finalTitle,
      content.value,
      summary.value.trim(),
      [...keywords.value],
      [...tags.value],
      subject.value,
    )
    // Only navigate when saving manually AND not already leaving the page
    if (navigateAfterSave && !leaving.value) {
      router.replace({ name: 'editor', params: { id } })
    }
  } else if (itemId.value) {
    await store.updateItem(itemId.value, {
      title: finalTitle,
      content: content.value,
      summary: summary.value.trim(),
      keywords: [...keywords.value],
      tags: [...tags.value],
      subject: subject.value,
    })
  }
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}

// Auto-save with debounce
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
watch([title, content, summary, keywords, tags, subject], () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    if (!isNew.value || title.value.trim()) {
      save(title.value.trim().length === 0)
    }
  }, 3000)
})

onBeforeUnmount(() => {
  leaving.value = true
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  // Only auto-save on leave for EXISTING notes (not unsaved new drafts).
  // New notes are saved via auto-save timer (3s) or manual save button.
  if (!isNew.value && (title.value.trim() || content.value.trim())) {
    save(title.value.trim().length === 0, false)
  }
})

// Keyboard shortcut: Ctrl+S to save
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    save(false)
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

function sharedTagCount(itemId: string): number {
  const currentTags = new Set(tags.value)
  const item = store.getItemById(itemId)
  if (!item) return 0
  return item.tags.filter((t) => currentTags.has(t)).length
}

function toggleFloating(): void {
  isFloating.value = !isFloating.value
}

function handleExportPdf(): void {
  const note = {
    id: itemId.value || '',
    title: title.value.trim() || '未命名笔记',
    content: content.value,
    summary: summary.value.trim(),
    keywords: [...keywords.value],
    tags: [...tags.value],
    subject: subject.value,
    createdAt: existing.value?.createdAt ?? Date.now(),
    updatedAt: existing.value?.updatedAt ?? Date.now(),
  }
  exportNote(note)
}
</script>

<template>
  <!-- Floating backdrop (click to dock back) -->
  <div v-if="isFloating" class="floating-backdrop" @click="toggleFloating"></div>

  <div
    class="editor-layout"
    :class="{ floating: isFloating }"
    :style="isFloating ? { left: x + 'px', top: y + 'px' } : undefined"
    @keydown="onKeydown"
  >
    <!-- Main editor column -->
    <div class="editor-main">
      <div class="editor-page">
        <header
          class="editor-header"
          :class="{ 'drag-handle': isFloating, 'is-dragging': isDragging }"
          @mousedown="isFloating ? onDragStart($event) : undefined"
        >
          <input
            v-model="title"
            type="text"
            class="title-input"
            placeholder="输入标题..."
            @mousedown.stop
          />

          <div class="header-actions" @mousedown.stop>
            <span v-if="saved" class="saved-badge">已保存 ✓</span>
            <button
              class="btn-float"
              :title="isFloating ? '还原到页面' : '弹出为浮动窗口'"
              @click="toggleFloating"
            >
              {{ isFloating ? '📌' : '📋' }}
            </button>
            <button
              v-if="!isNew"
              class="btn-export"
              title="导出PDF"
              @click="handleExportPdf"
            >
              📄
            </button>
            <button class="btn-save" @click="save(false)">保存</button>
          </div>
        </header>

        <!-- Subject selector -->
        <div class="meta-field">
          <label class="meta-label">
            学科分类
            <span v-if="subjectError" class="subject-error-msg">请选择学科分类</span>
          </label>
          <SubjectPicker v-model="subject" :class="{ 'subject-error': subjectError }" />
        </div>

        <!-- Summary input -->
        <div class="meta-field">
          <label class="meta-label">摘要</label>
          <textarea
            v-model="summary"
            class="summary-textarea"
            rows="2"
            placeholder="输入笔记的摘要..."
          ></textarea>
        </div>

        <!-- Keywords row -->
        <div class="meta-field">
          <label class="meta-label">关键词</label>
          <div class="chip-input-row">
            <span v-for="kw in keywords" :key="kw" class="chip">
              {{ kw }}
              <button class="chip-remove" @click="removeKeyword(kw)">&times;</button>
            </span>
            <input
              v-model="keywordInput"
              type="text"
              class="chip-inline-input"
              placeholder="如：机器学习, 深度学习..."
              @keydown.enter.prevent="addKeyword"
              @keydown.,.prevent="addKeyword"
            />
          </div>
        </div>

        <div class="tag-bar">
          <span class="tag-label">标签:</span>
          <span v-for="tag in visibleTags" :key="tag" class="tag-chip">
            {{ tag }}
            <button class="tag-remove" @click="removeTag(tag)">&times;</button>
          </span>
          <button
            v-if="tags.length > TAGS_VISIBLE_DEFAULT"
            class="tag-expand-btn"
            @click="tagsExpanded = !tagsExpanded"
          >
            {{ tagsExpanded ? '收起' : `+${tags.length - TAGS_VISIBLE_DEFAULT} 更多` }}
          </button>
          <input
            v-model="tagInput"
            type="text"
            class="tag-input"
            placeholder="添加标签..."
            @keydown.enter.prevent="addTag"
            @keydown.,.prevent="addTag"
          />
        </div>

        <div class="editor-container">
          <MarkdownEditor v-model="content" placeholder="开始写作..." />
        </div>

        <footer class="editor-footer">
          <span>{{ content.length }} 字符 · {{ content.split(/\s+/).filter(Boolean).length }} 词</span>
        </footer>
      </div>
    </div>

    <!-- Related notes sidebar -->
    <aside v-if="!isNew && relatedNotesDisplay.length > 0" class="editor-sidebar">
      <div class="sidebar-panel">
        <h3 class="sidebar-title">相关推荐</h3>
        <ul class="related-list">
          <li v-for="item in relatedNotesDisplay" :key="item.id">
            <RouterLink
              :to="{ name: 'editor', params: { id: item.id } }"
              class="related-card"
            >
              <h4 class="related-title">{{ item.title || '无标题' }}</h4>
              <div class="related-meta">
                <span v-if="item.tags.length && sharedTagCount(item.id) > 0" class="related-overlap">
                  匹配 {{ sharedTagCount(item.id) }} 个标签
                </span>
                <span class="related-date">{{ formatDate(item.updatedAt) }}</span>
              </div>
              <p v-if="item.summary" class="related-summary">{{ item.summary }}</p>
            </RouterLink>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* ── Editor layout: main + sidebar ── */
.editor-layout {
  display: flex;
  height: calc(100vh - 4rem);
  gap: 1.5rem;
  outline: none;
}

.editor-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.editor-page {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* ── Editor sidebar ── */
.editor-sidebar {
  width: 240px;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-panel {
  position: sticky;
  top: 0;
}

.sidebar-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-primary);
}

.related-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.related-card {
  display: block;
  padding: 0.6rem 0.7rem;
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: inherit;
  border: 1px solid var(--color-border);
  transition: box-shadow 0.15s, border-color 0.15s;
}

.related-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.related-title {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.3rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.68rem;
  margin-bottom: 0.2rem;
}

.related-overlap {
  color: #a78bfa;
  font-weight: 600;
}

.related-date {
  color: var(--color-text-faint);
}

.related-summary {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 0.25rem;
}

/* ── Editor header ── */
.editor-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.title-input {
  flex: 1;
  font-size: 1.5rem;
  font-weight: 700;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  padding: 0.5rem 0;
}

.title-input::placeholder {
  color: var(--color-text-faint);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.saved-badge {
  font-size: 0.8rem;
  color: #4caf50;
  font-weight: 600;
}

.btn-save {
  background: var(--color-text);
  color: #fff;
  border: none;
  padding: 0.45rem 1.35rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: transform var(--ease), box-shadow var(--ease);
  box-shadow: var(--shadow-sm);
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-float {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.55rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
  line-height: 1;
}

.btn-float:hover {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* ── Floating window ── */
.floating-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.15);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.editor-layout.floating {
  position: fixed;
  z-index: 1000;
  width: 80vw;
  height: 80vh;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 1rem;
  gap: 0.75rem;
}

.editor-layout.floating .editor-main {
  background: var(--color-surface-2);
  border-radius: var(--radius-md);
  padding: 1rem;
  box-shadow: none;
}

.editor-layout.floating .editor-sidebar {
  display: none;
}

/* Drag handle */
.drag-handle {
  cursor: grab;
  user-select: none;
}

.drag-handle.is-dragging {
  cursor: grabbing;
}

/* Prevent title input from interfering with drag */
.drag-handle .title-input {
  pointer-events: auto;
  cursor: text;
}

.btn-export {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
  line-height: 1;
}

.btn-export:hover {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

/* Meta fields (summary + keywords) */
.meta-field {
  margin-bottom: 0.5rem;
}

.meta-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.subject-error-msg {
  color: var(--color-danger);
  font-size: 0.72rem;
  font-weight: 500;
  animation: shake 0.3s ease;
}

:deep(.subject-error) .subject-chip:not(.active) {
  border-color: #fde8e8;
  animation: shake 0.4s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); }
}

.meta-count {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--color-text-faint);
}

.meta-count.count-ok { color: var(--color-success); }
.meta-count.count-warn { color: var(--color-warning); }
.meta-count.count-over { color: var(--color-danger); }

.summary-textarea {
  width: 100%;
  padding: 0.45rem 0.65rem;
  font-size: 0.88rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--color-surface);
  color: var(--color-text);
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.15s;
}

.summary-textarea:focus {
  border-color: var(--color-primary);
}

.summary-textarea::placeholder {
  color: var(--color-text-faint);
}

.chip-input-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  min-height: 2.2rem;
  transition: border-color 0.15s;
}

.chip-input-row:focus-within {
  border-color: var(--color-primary);
}

.chip {
  background: var(--color-primary-tint);
  color: #a78bfa;
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

.chip-remove {
  background: none;
  border: none;
  color: var(--color-text-faint);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  line-height: 1;
}

.chip-remove:hover {
  color: var(--color-danger);
}

.chip-inline-input {
  border: none;
  outline: none;
  padding: 0.1rem 0.15rem;
  font-size: 0.8rem;
  min-width: 140px;
  flex: 1;
  background: transparent;
  font-family: inherit;
  color: var(--color-text);
}

.chip-inline-input::placeholder {
  color: var(--color-text-faint);
}

.tag-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  padding: 0.5rem 0;
}

.tag-label {
  font-size: 0.85rem;
  color: var(--color-text-faint);
  margin-right: 0.25rem;
}

.tag-chip {
  background: var(--color-primary-tint);
  color: #a78bfa;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.tag-remove {
  background: none;
  border: none;
  color: var(--color-text-faint);
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  line-height: 1;
}

.tag-remove:hover {
  color: var(--color-danger);
}

.tag-expand-btn {
  background: none;
  border: 1px dashed var(--color-border);
  color: var(--color-primary);
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  cursor: pointer;
  font-family: inherit;
}

.tag-expand-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}

.tag-input {
  border: 1px dashed var(--color-border);
  outline: none;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  width: 100px;
  background: transparent;
  color: var(--color-text);
}

.tag-input:focus {
  border-color: var(--color-primary);
}

.editor-container {
  flex: 1;
  min-height: 0;
}

.editor-footer {
  padding-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-faint);
  text-align: right;
}

/* ── Responsive ── */
@media (max-width: 1100px) {
  .editor-sidebar {
    display: none;
  }
}

@media (max-width: 640px) {
  .editor-layout {
    height: calc(100vh - 3.5rem);
    flex-direction: column;
  }

  .editor-layout.floating {
    width: 92vw;
    height: 85vh;
    padding: 0.5rem;
  }

  .title-input {
    font-size: 1.2rem;
  }

  .header-actions {
    gap: 0.4rem;
  }

  .btn-float {
    font-size: 0.85rem;
    padding: 0.3rem 0.45rem;
  }

  .btn-save {
    padding: 0.35rem 0.8rem;
    font-size: 0.8rem;
  }

  .btn-export {
    padding: 0.3rem 0.5rem;
    font-size: 0.9rem;
  }

  .saved-badge {
    display: none;
  }

  .meta-label {
    font-size: 0.75rem;
  }

  .summary-textarea {
    font-size: 0.82rem;
    padding: 0.35rem 0.5rem;
  }

  .chip-input-row {
    padding: 0.25rem 0.4rem;
  }

  .editor-footer {
    font-size: 0.7rem;
    padding-top: 0.5rem;
  }
}
</style>
