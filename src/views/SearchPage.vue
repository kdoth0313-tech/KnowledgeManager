<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { SearchResult } from '@/types'

const store = useKnowledgeStore()

const query = ref('')
const results = ref<SearchResult[]>([])
const hasSearched = ref(false)

function doSearch() {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    hasSearched.value = false
    return
  }
  results.value = store.search(q)
  hasSearched.value = true
}

watch(query, () => {
  doSearch()
})

const groupedTags = computed(() => store.tagList)
</script>

<template>
  <div class="search-page">
    <header class="search-header">
      <h1>搜索笔记</h1>
    </header>

    <div class="search-bar">
      <input
        v-model="query"
        type="text"
        class="search-input"
        placeholder="输入关键词搜索..."
        autofocus
      />
    </div>

    <!-- Tag cloud -->
    <div v-if="groupedTags.length > 0" class="tag-cloud">
      <span class="tag-cloud-label">所有标签:</span>
      <button
        v-for="tag in groupedTags"
        :key="tag"
        class="tag-pill"
        @click="query = tag"
      >
        {{ tag }}
      </button>
    </div>

    <!-- Results -->
    <section v-if="hasSearched" class="search-results">
      <p class="result-count">找到 {{ results.length }} 条结果</p>

      <article
        v-for="item in results"
        :key="item.id"
        class="result-card"
      >
        <RouterLink :to="{ name: 'editor', params: { id: item.id } }" class="result-link">
          <h3 class="result-title">{{ item.title || '无标题' }}</h3>
          <p class="result-excerpt">{{ item.excerpt }}</p>
        </RouterLink>
      </article>

      <div v-if="results.length === 0" class="empty-results">
        <p>没有匹配的结果。</p>
      </div>
    </section>

    <section v-else class="search-hint">
      <p>输入关键词后自动搜索。也支持按标签过滤。</p>
    </section>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 800px;
  margin: 0 auto;
}

.search-header h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1e1e2e;
  margin-bottom: 1.5rem;
}

.search-bar {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
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

.tag-cloud {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.tag-cloud-label {
  font-size: 0.85rem;
  color: #999;
  margin-right: 0.25rem;
}

.tag-pill {
  background: #e8e8f0;
  color: #5865f2;
  border: none;
  padding: 0.2rem 0.7rem;
  border-radius: 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}

.tag-pill:hover {
  background: #5865f2;
  color: #fff;
}

.search-results {
  margin-top: 0.5rem;
}

.result-count {
  font-size: 0.85rem;
  color: #999;
  margin-bottom: 1rem;
}

.result-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 0.75rem;
  transition: box-shadow 0.15s;
}

.result-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.result-link {
  display: block;
  padding: 1rem 1.25rem;
  text-decoration: none;
  color: inherit;
}

.result-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1e1e2e;
  margin-bottom: 0.3rem;
}

.result-excerpt {
  font-size: 0.85rem;
  color: #666;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-results,
.search-hint {
  text-align: center;
  padding: 3rem 2rem;
  color: #999;
}
</style>
