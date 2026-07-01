<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { useExportPdf } from '@/composables/useExportPdf'
import { highlightText } from '@/composables/useHighlight'
import { SUBJECTS, getSubject } from '@/constants/subjects'

const store = useKnowledgeStore()
const { selectedTag, selectedSubject, subjectCounts } = storeToRefs(store)
const { exportNotes } = useExportPdf()

// Search state
const searchQuery = ref('')
const activeTag = ref<string | null>(null)
const dateStart = ref('')
const dateEnd = ref('')

// Debounced search
const debouncedQuery = ref('')
watchDebounced(
  searchQuery,
  (val) => {
    debouncedQuery.value = val.trim()
  },
  { debounce: 300 },
)

// Two-way sync: store.selectedTag ↔ local activeTag
watch(selectedTag, (tag) => {
  activeTag.value = tag
  if (tag) {
    searchQuery.value = ''
  }
})

watch(activeTag, (tag) => {
  if (store.selectedTag !== tag) {
    store.selectedTag = tag
  }
})

// All tags from the store
const allTags = computed(() => store.tagList)

// Use advancedSearch for combined filtering
const displayedItems = computed(() => {
  return store.advancedSearch({
    query: debouncedQuery.value || undefined,
    tag: activeTag.value,
    subject: selectedSubject.value,
    dateStart: dateStart.value || undefined,
    dateEnd: dateEnd.value || undefined,
  })
})

// Subjects that actually have notes, in preset order
const availableSubjects = computed(() =>
  SUBJECTS.filter((s) => (subjectCounts.value[s.id] || 0) > 0),
)

function toggleSubject(id: string): void {
  store.selectSubject(id)
}

// Tags present in the currently displayed items (for filter pills)
const displayedTags = computed(() => {
  const tagSet = new Set<string>()
  displayedItems.value.forEach((item) => item.tags.forEach((t) => tagSet.add(t)))
  return [...tagSet].sort()
})

// Toggle tag filter
function toggleTag(tag: string): void {
  activeTag.value = activeTag.value === tag ? null : tag
}

function handleExportAll(): void {
  exportNotes(displayedItems.value)
}

// Clear all filters
function clearAllFilters(): void {
  searchQuery.value = ''
  activeTag.value = null
  store.clearSubjectFilter()
  dateStart.value = ''
  dateEnd.value = ''
}

// Delete
function deleteNote(id: string, title: string): void {
  if (confirm(`确定要删除「${title || '无标题'}」吗？此操作不可撤销。`)) {
    store.removeItem(id)
  }
}

// Helpers
function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getExcerpt(item: { summary: string; content: string }): string {
  if (item.summary) return item.summary
  return item.content.replace(/<[^>]+>/g, '').slice(0, 150)
}

// Whether any combined filter is active
const hasAnyFilter = computed(
  () => !!(
    debouncedQuery.value ||
    activeTag.value ||
    selectedSubject.value ||
    dateStart.value ||
    dateEnd.value
  ),
)

const hasNotes = computed(() => store.items.length > 0)
const hasSearchResults = computed(() => displayedItems.value.length > 0)
</script>

<template>
  <div class="note-list-root">
    <!-- Search bar -->
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索笔记标题、内容或标签..."
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
      </div>

      <!-- Date range -->
      <div class="date-range">
        <input
          v-model="dateStart"
          type="date"
          class="date-input"
          title="开始日期"
        />
        <span class="date-sep">—</span>
        <input
          v-model="dateEnd"
          type="date"
          class="date-input"
          title="结束日期"
        />
      </div>

      <span v-if="hasAnyFilter" class="search-count">
        找到 {{ displayedItems.length }} 条结果
      </span>
      <span v-else class="search-count">
        共 {{ store.items.length }} 条笔记
      </span>

      <button
        v-if="store.items.length > 0"
        class="btn-export-all"
        title="导出全部为PDF"
        @click="handleExportAll"
      >
        📄 导出
      </button>
    </div>

    <!-- Subject filter bar -->
    <div v-if="availableSubjects.length > 0" class="subject-filter-bar">
      <span class="subject-filter-label">学科:</span>
      <button
        v-for="s in availableSubjects"
        :key="s.id"
        :class="['subject-filter-pill', { active: selectedSubject === s.id }]"
        :style="selectedSubject === s.id ? { background: s.color, borderColor: s.color } : { '--sc': s.color }"
        @click="toggleSubject(s.id)"
      >
        <span class="subject-filter-icon">{{ s.icon }}</span>
        {{ s.name }}
        <span class="subject-filter-count">{{ subjectCounts[s.id] }}</span>
      </button>
      <button v-if="selectedSubject" class="tag-filter-clear" @click="store.clearSubjectFilter()">
        清除
      </button>
    </div>

    <!-- Tag filter pills -->
    <div v-if="displayedTags.length > 0" class="tag-filter-bar">
      <span class="tag-filter-label">标签筛选:</span>
      <button
        v-for="tag in displayedTags"
        :key="tag"
        :class="['tag-filter-pill', { active: activeTag === tag }]"
        @click="toggleTag(tag)"
      >
        {{ tag }}
      </button>
      <button v-if="activeTag" class="tag-filter-clear" @click="activeTag = null">
        清除
      </button>
    </div>

    <!-- Active filter summary -->
    <div v-if="hasAnyFilter" class="filter-summary">
      <span class="filter-summary-label">当前筛选：</span>
      <span v-if="debouncedQuery" class="filter-chip">
        搜索: {{ debouncedQuery }}
        <button @click="searchQuery = ''">✕</button>
      </span>
      <span v-if="activeTag" class="filter-chip">
        标签: {{ activeTag }}
        <button @click="activeTag = null">✕</button>
      </span>
      <span v-if="selectedSubject" class="filter-chip">
        学科: {{ getSubject(selectedSubject)?.name }}
        <button @click="store.clearSubjectFilter()">✕</button>
      </span>
      <span v-if="dateStart || dateEnd" class="filter-chip">
        日期: {{ dateStart || '最早' }} — {{ dateEnd || '最新' }}
        <button @click="dateStart = ''; dateEnd = ''">✕</button>
      </span>
      <button class="btn-clear-all-filters" @click="clearAllFilters">
        清除全部
      </button>
    </div>

    <!-- Note cards -->
    <section v-if="hasNotes && hasSearchResults" class="note-grid">
      <article v-for="item in displayedItems" :key="item.id" class="note-card">
        <div class="note-card-body">
          <RouterLink :to="{ name: 'editor', params: { id: item.id } }" class="note-link">
            <span
              v-if="getSubject(item.subject)"
              class="note-subject-badge"
              :style="{ background: getSubject(item.subject)!.color }"
            >
              {{ getSubject(item.subject)!.icon }} {{ getSubject(item.subject)!.name }}
            </span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <h3
              class="note-title"
              v-html="debouncedQuery ? highlightText(item.title || '无标题', debouncedQuery) : (item.title || '无标题')"
            ></h3>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p
              class="note-excerpt"
              v-html="debouncedQuery ? highlightText(getExcerpt(item) || '暂无内容', debouncedQuery) : (getExcerpt(item) || '暂无内容')"
            ></p>
          </RouterLink>

          <div class="note-meta">
            <span class="note-date">{{ formatDate(item.updatedAt) }}</span>
            <div class="note-actions">
              <RouterLink
                :to="{ name: 'editor', params: { id: item.id } }"
                class="btn-action btn-edit"
                title="编辑"
              >
                ✏️ 编辑
              </RouterLink>
              <button
                class="btn-action btn-delete"
                title="删除"
                @click="deleteNote(item.id, item.title)"
              >
                🗑️ 删除
              </button>
            </div>
          </div>

          <div v-if="item.tags.length" class="note-tags">
            <span v-for="tag in item.tags" :key="tag" class="tag-badge">{{ tag }}</span>
          </div>
          <div v-if="item.keywords?.length" class="note-keywords">
            <span class="keywords-label">关键词:</span>
            <span v-for="kw in item.keywords" :key="kw" class="keyword-badge">{{ kw }}</span>
          </div>
        </div>
      </article>
    </section>

    <!-- Empty: no notes at all -->
    <section v-else-if="!hasNotes" class="empty-state">
      <div class="empty-icon">📝</div>
      <p>还没有笔记，点击上方按钮开始创建。</p>
    </section>

    <!-- Empty: search returned nothing -->
    <section v-else-if="hasAnyFilter && !hasSearchResults" class="empty-state">
      <div class="empty-icon">🔍</div>
      <p>没有匹配的笔记。</p>
      <button class="btn-clear-search" @click="clearAllFilters">清除筛选条件</button>
    </section>
  </div>
</template>

<style scoped>
.note-list-root {
  /* container */
}

/* Search bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.search-input-wrap {
  flex: 1;
  min-width: 200px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.6rem 2rem 0.6rem 2.25rem;
  font-size: 0.9rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  outline: none;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input:focus {
  border-color: #5865f2;
  box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.1);
}

.search-input::placeholder {
  color: #bbb;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.25rem;
  line-height: 1;
}

.search-clear:hover {
  color: #333;
}

/* Date range filter */
.date-range {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.date-input {
  padding: 0.5rem 0.4rem;
  font-size: 0.78rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  outline: none;
  background: #fff;
  width: 130px;
  color: #333;
  font-family: inherit;
  transition: border-color 0.15s;
}

.date-input:focus {
  border-color: #5865f2;
}

.date-sep {
  font-size: 0.75rem;
  color: #bbb;
}

.search-count {
  font-size: 0.8rem;
  color: #999;
  white-space: nowrap;
}

.btn-export-all {
  background: #f5f5f5;
  color: #666;
  border: 1px solid #e0e0e0;
  padding: 0.5rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  white-space: nowrap;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-export-all:hover {
  background: #5865f2;
  color: #fff;
  border-color: #5865f2;
}

/* Tag filter bar */
.tag-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

/* Subject filter bar */
.subject-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.subject-filter-label {
  font-size: 0.8rem;
  color: #999;
  margin-right: 0.25rem;
}

.subject-filter-pill {
  --sc: #7f8c8d;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: #fff;
  color: #555;
  border: 1px solid #e0e0e0;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.subject-filter-pill:hover {
  border-color: var(--sc);
  color: var(--sc);
}

.subject-filter-pill.active {
  color: #fff;
  font-weight: 600;
}

.subject-filter-icon {
  line-height: 1;
}

.subject-filter-count {
  font-size: 0.68rem;
  background: rgba(0, 0, 0, 0.08);
  padding: 0.02rem 0.35rem;
  border-radius: 8px;
}

.subject-filter-pill.active .subject-filter-count {
  background: rgba(255, 255, 255, 0.25);
}

/* Subject badge on cards */
.note-subject-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}.tag-filter-label {
  font-size: 0.8rem;
  color: #999;
  margin-right: 0.25rem;
}

.tag-filter-pill {
  background: #f0f0f5;
  color: #666;
  border: none;
  padding: 0.2rem 0.65rem;
  border-radius: 12px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}

.tag-filter-pill:hover {
  background: #e0e0f0;
  color: #5865f2;
}

.tag-filter-pill.active {
  background: #5865f2;
  color: #fff;
}

.tag-filter-clear {
  background: none;
  border: none;
  color: #999;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

.tag-filter-clear:hover {
  color: #e53935;
}

/* Filter summary bar */
.filter-summary {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.6rem;
  margin-bottom: 0.75rem;
  background: #f8f8fb;
  border-radius: 6px;
  font-size: 0.78rem;
}

.filter-summary-label {
  color: #999;
  font-weight: 600;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #5865f2;
  color: #fff;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.72rem;
}

.filter-chip button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
  line-height: 1;
}

.filter-chip button:hover {
  color: #fff;
}

.btn-clear-all-filters {
  background: none;
  border: 1px solid #ddd;
  color: #999;
  padding: 0.15rem 0.55rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.72rem;
  margin-left: auto;
  font-family: inherit;
}

.btn-clear-all-filters:hover {
  border-color: #e53935;
  color: #e53935;
}

/* Keyword highlighting */
:deep(mark) {
  background: #fff3a8;
  color: #333;
  padding: 0.05em 0.15em;
  border-radius: 2px;
}

/* Note grid */
.note-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

/* Responsive grid */
@media (max-width: 640px) {
  .note-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .note-card-body {
    padding: 1rem;
  }

  .note-title {
    font-size: 0.95rem;
  }

  .note-excerpt {
    font-size: 0.78rem;
  }
}

/* Note card */
.note-card {
  background: var(--color-surface, #fff);
  border: 1px solid var(--color-border, #e6e6ef);
  border-radius: var(--radius-md, 10px);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(16, 24, 40, 0.05));
  transition: box-shadow var(--ease, 0.18s), transform var(--ease, 0.18s), border-color var(--ease, 0.18s);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.note-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(180deg, #5865f2, #7c5cff);
  opacity: 0;
  transition: opacity var(--ease, 0.18s);
}

.note-card:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(16, 24, 40, 0.08));
  transform: translateY(-2px);
  border-color: var(--color-border-strong, #d4d4e0);
}

.note-card:hover::before {
  opacity: 1;
}

.note-card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.note-link {
  display: block;
  text-decoration: none;
  color: inherit;
  flex: 1;
}

.note-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: #1e1e2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-excerpt {
  font-size: 0.83rem;
  color: #666;
  line-height: 1.5;
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Meta row */
.note-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 0.5rem;
}

.note-date {
  flex-shrink: 0;
}

.note-actions {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.btn-action {
  background: none;
  border: 1px solid transparent;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: none;
  color: #666;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-edit:hover {
  background: #e8e8f0;
  color: #5865f2;
}

.btn-delete {
  color: #999;
}

.btn-delete:hover {
  background: #fde8e8;
  color: #e53935;
  border-color: #f5c6c6;
}

/* Tags */
.note-tags {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.tag-badge {
  background: #e8e8f0;
  color: #5865f2;
  padding: 0.12rem 0.55rem;
  border-radius: 10px;
  font-size: 0.7rem;
}

/* Keywords */
.note-keywords {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.35rem;
}

.keywords-label {
  font-size: 0.7rem;
  color: #bbb;
  margin-right: 0.1rem;
}

.keyword-badge {
  background: #fff3e0;
  color: #e65100;
  padding: 0.12rem 0.55rem;
  border-radius: 10px;
  font-size: 0.7rem;
}

/* Empty states */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #999;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.btn-clear-search {
  margin-top: 0.75rem;
  background: none;
  border: 1px solid #ddd;
  color: #666;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.btn-clear-search:hover {
  border-color: #5865f2;
  color: #5865f2;
}

/* Responsive */
@media (max-width: 600px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .date-range {
    flex-direction: row;
    width: 100%;
  }

  .date-input {
    flex: 1;
  }

  .note-actions {
    gap: 0;
  }
}
</style>
