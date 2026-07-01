<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import QuickNoteEditor from '@/components/home/QuickNoteEditor.vue'
import NoteList from '@/components/notes/NoteList.vue'
import NoteCreateModal from '@/components/notes/NoteCreateModal.vue'

const router = useRouter()
const showCreateModal = ref(false)

function onNoteSaved(id: string): void {
  showCreateModal.value = false
  // Navigate to the new note's editor page
  router.push({ name: 'editor', params: { id } })
}
</script>

<template>
  <div class="home-page">
    <header class="page-header">
      <h1>知识库</h1>
      <button class="btn-primary" @click="showCreateModal = true">+ 新建笔记</button>
    </header>

    <QuickNoteEditor />

    <NoteList />

    <NoteCreateModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @saved="onNoteSaved"
    />
  </div>
</template>

<style scoped>
.home-page {
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--color-text, #1e1e2e);
  letter-spacing: -0.01em;
  position: relative;
  padding-left: 0.85rem;
}

.page-header h1::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 1.4rem;
  border-radius: var(--radius-pill, 999px);
  background: linear-gradient(180deg, #5865f2, #7c5cff);
}

.btn-primary {
  background: linear-gradient(135deg, #5865f2 0%, #7c5cff 100%);
  color: #fff;
  border: none;
  padding: 0.55rem 1.35rem;
  border-radius: var(--radius-sm, 6px);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--ease, 0.18s), box-shadow var(--ease, 0.18s);
  font-family: inherit;
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(88, 101, 242, 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}
</style>
