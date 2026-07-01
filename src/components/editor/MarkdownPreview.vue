<script setup lang="ts">
defineProps<{
  content: string
}>()
</script>

<template>
  <div class="preview-wrapper">
    <div v-if="content && content.trim()" class="preview-content" v-html="content" />
    <div v-else class="preview-empty">
      开始输入以查看预览...
    </div>
  </div>
</template>

<style scoped>
.preview-wrapper {
  width: 100%;
  height: 100%;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.preview-content {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
  font-size: 16px;
  line-height: 1.7;
  color: #333;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: #adb5bd;
  font-size: 0.95rem;
}

/* Mirrored Tiptap typography styles */
:deep(.preview-content h1) {
  font-size: 1.8em;
  font-weight: 700;
  margin: 1em 0 0.5em;
}

:deep(.preview-content h2) {
  font-size: 1.4em;
  font-weight: 600;
  margin: 0.8em 0 0.4em;
}

:deep(.preview-content h3) {
  font-size: 1.2em;
  font-weight: 600;
  margin: 0.6em 0 0.3em;
}

:deep(.preview-content p) {
  margin: 0.5em 0;
}

:deep(.preview-content ul),
:deep(.preview-content ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

:deep(.preview-content blockquote) {
  border-left: 3px solid #ccc;
  padding-left: 1em;
  color: #666;
  margin: 0.5em 0;
}

:deep(.preview-content pre) {
  background: #f5f5f5;
  border-radius: 4px;
  padding: 0.75em 1em;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9em;
  overflow-x: auto;
}

:deep(.preview-content code) {
  background: #f0f0f0;
  padding: 0.15em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

:deep(.preview-content pre code) {
  background: none;
  padding: 0;
}

:deep(.preview-content img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

:deep(.preview-content hr) {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 1.5em 0;
}

:deep(.preview-content a) {
  color: #5865f2;
  text-decoration: underline;
}
</style>
