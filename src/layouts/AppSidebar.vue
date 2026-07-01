<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import { SUBJECTS } from '@/constants/subjects'

const route = useRoute()
const router = useRouter()
const store = useKnowledgeStore()
const { tagList, selectedTag, tagCounts, selectedSubject, subjectCounts } = storeToRefs(store)

const sidebarOpen = ref(false)

const links = computed(() => [
  { to: { name: 'home' }, label: '首页', icon: '🏠' },
  { to: { name: 'editor' }, label: '新建笔记', icon: '✏️' },
  { to: { name: 'search' }, label: '搜索', icon: '🔍' },
])

// Subjects that have at least one note, in preset order
const activeSubjects = computed(() =>
  SUBJECTS.filter((s) => (subjectCounts.value[s.id] || 0) > 0),
)

function onSubjectClick(id: string): void {
  store.selectSubject(id)
  sidebarOpen.value = false
  if (route.name !== 'home') {
    router.push({ name: 'home' })
  }
}

function onTagClick(tag: string): void {
  store.selectTag(tag)
  sidebarOpen.value = false
  if (route.name !== 'home') {
    router.push({ name: 'home' })
  }
}

function onNavClick(): void {
  sidebarOpen.value = false
}
</script>

<template>
  <!-- Hamburger button (visible on mobile) -->
  <button class="hamburger" @click="sidebarOpen = !sidebarOpen" aria-label="Toggle menu">
    <span class="hamburger-line" :class="{ open: sidebarOpen }"></span>
    <span class="hamburger-line" :class="{ open: sidebarOpen }"></span>
    <span class="hamburger-line" :class="{ open: sidebarOpen }"></span>
  </button>

  <!-- Mobile backdrop -->
  <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

  <aside class="sidebar" :class="{ open: sidebarOpen }">
    <div class="sidebar-brand">
      <span class="brand-icon">📚</span>
      <span class="brand-text">KnowledgeManager</span>
    </div>

    <nav class="sidebar-nav">
      <RouterLink
        v-for="link in links"
        :key="link.label"
        :to="link.to"
        class="nav-item"
        :class="{ active: route.name === link.to.name }"
        @click="onNavClick"
      >
        <span class="nav-icon">{{ link.icon }}</span>
        <span class="nav-label">{{ link.label }}</span>
      </RouterLink>
    </nav>

    <!-- Subject navigation -->
    <div v-if="activeSubjects.length > 0" class="sidebar-subjects">
      <div class="sidebar-section-title">学科分类</div>
      <div class="subject-nav-list">
        <button
          v-for="s in activeSubjects"
          :key="s.id"
          :class="['subject-nav-item', { active: selectedSubject === s.id }]"
          :style="{ '--sc': s.color }"
          @click="onSubjectClick(s.id)"
        >
          <span class="subject-nav-icon">{{ s.icon }}</span>
          <span class="subject-nav-name">{{ s.name }}</span>
          <span class="subject-nav-count">{{ subjectCounts[s.id] }}</span>
        </button>
      </div>
    </div>

    <!-- Tag cloud -->
    <div v-if="tagList.length > 0" class="sidebar-tags">
      <div class="sidebar-tags-header">
        <span class="sidebar-tags-title">标签</span>
        <span class="sidebar-tags-count">{{ tagList.length }}</span>
      </div>
      <div class="sidebar-tags-list">
        <button
          v-for="tag in tagList"
          :key="tag"
          :class="['tag-pill', { active: selectedTag === tag }]"
          @click="onTagClick(tag)"
        >
          <span class="tag-pill-name">{{ tag }}</span>
          <span class="tag-pill-count">{{ tagCounts[tag] || 0 }}</span>
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <span class="footer-text">Vue 3 + TypeScript</span>
    </div>
  </aside>
</template>

<style scoped>
/* ── Hamburger button ── */
.hamburger {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1100;
  width: 36px;
  height: 36px;
  background: #1e1e2e;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
}

.hamburger-line {
  display: block;
  width: 18px;
  height: 2px;
  background: #cdd6f4;
  border-radius: 1px;
  transition: all 0.2s ease;
}

.hamburger-line.open:nth-child(1) {
  transform: translateY(6px) rotate(45deg);
}

.hamburger-line.open:nth-child(2) {
  opacity: 0;
}

.hamburger-line.open:nth-child(3) {
  transform: translateY(-6px) rotate(-45deg);
}

/* ── Mobile backdrop ── */
.sidebar-backdrop {
  display: none;
}

/* ── Sidebar ── */
.sidebar {
  width: 240px;
  height: 100vh;
  background: linear-gradient(180deg, #1e1e2e 0%, #181825 100%);
  color: #cdd6f4;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  user-select: none;
  border-right: 1px solid #11111b;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1.35rem 1.15rem;
  border-bottom: 1px solid #313244;
}

.brand-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 2px 4px rgba(88, 101, 242, 0.4));
}

.brand-text {
  font-size: 1.02rem;
  font-weight: 700;
  color: #f5f5f5;
  letter-spacing: 0.01em;
}

.sidebar-nav {
  padding: 0.85rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.8rem;
  color: #a6adc8;
  text-decoration: none;
  font-size: 0.92rem;
  transition: background var(--ease), color var(--ease), transform var(--ease);
  border-radius: 8px;
}

.nav-item:hover {
  background: #313244;
  color: #f5f5f5;
}

.nav-item.active {
  background: linear-gradient(135deg, #5865f2 0%, #7c5cff 100%);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.35);
}

.nav-icon {
  font-size: 1.15rem;
  width: 1.5rem;
  text-align: center;
}

/* Subject navigation section */
.sidebar-subjects {
  border-top: 1px solid #313244;
  padding: 0.75rem 0;
}

.sidebar-section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #a6adc8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.4rem 1.25rem 0.5rem;
}

.subject-nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0.75rem;
}

.subject-nav-item {
  --sc: #7f8c8d;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  background: none;
  border: none;
  color: #a6adc8;
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
  text-align: left;
  font-family: inherit;
  border-left: 3px solid transparent;
}

.subject-nav-item:hover {
  background: #313244;
  color: #f5f5f5;
}

.subject-nav-item.active {
  background: #313244;
  color: #fff;
  font-weight: 600;
  border-left-color: var(--sc);
}

.subject-nav-icon {
  font-size: 1rem;
  line-height: 1;
  width: 1.2rem;
  text-align: center;
}

.subject-nav-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subject-nav-count {
  font-size: 0.7rem;
  background: #45475a;
  color: #cdd6f4;
  padding: 0.05rem 0.4rem;
  border-radius: 8px;
  flex-shrink: 0;
}

/* Tag cloud section */
.sidebar-tags {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-top: 1px solid #313244;
  padding: 0.75rem 0;
}.sidebar-tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 1.25rem 0.5rem;
}

.sidebar-tags-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #a6adc8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sidebar-tags-count {
  font-size: 0.7rem;
  color: #585b70;
  background: #313244;
  padding: 0.1rem 0.45rem;
  border-radius: 8px;
}

.sidebar-tags-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tag-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: none;
  border: none;
  color: #a6adc8;
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  font-size: 0.83rem;
  cursor: pointer;
  transition: all 0.15s;
  width: 100%;
  text-align: left;
  font-family: inherit;
}

.tag-pill:hover {
  background: #313244;
  color: #f5f5f5;
}

.tag-pill.active {
  background: linear-gradient(135deg, #5865f2 0%, #7c5cff 100%);
  color: #fff;
}

.tag-pill.active .tag-pill-count {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.tag-pill-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-pill-count {
  font-size: 0.7rem;
  background: #313244;
  color: #585b70;
  padding: 0.05rem 0.4rem;
  border-radius: 8px;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.sidebar-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid #313244;
}

.footer-text {
  font-size: 0.75rem;
  color: #585b70;
}

/* ── Responsive: Tablet & Mobile ── */
@media (max-width: 900px) {
  .hamburger {
    display: flex;
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1040;
    background: rgba(0, 0, 0, 0.4);
    animation: fadeIn 0.15s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1050;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
  }

  .sidebar.open {
    transform: translateX(0);
  }
}
</style>
