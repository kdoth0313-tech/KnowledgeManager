<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'
import SubjectPicker from '@/components/common/SubjectPicker.vue'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', id: string): void
}>()

const store = useKnowledgeStore()

const title = ref('')
const content = ref('')
const summary = ref('')
const subject = ref('')
const keywordInput = ref('')
const keywords = ref<string[]>([])
const tagInput = ref('')
const tags = ref<string[]>([])
const isSaving = ref(false)
const subjectError = ref(false)

const canSave = computed(() => title.value.trim() || content.value.trim())

const summaryLength = computed(() => summary.value.length)

// Clear subject error when user selects a subject
watch(subject, (val) => {
  if (val) subjectError.value = false
})

function addKeyword(): void {
  const k = keywordInput.value.trim()
  if (k && !keywords.value.includes(k)) {
    keywords.value.push(k)
    keywordInput.value = ''
  }
}

function removeKeyword(keyword: string): void {
  keywords.value = keywords.value.filter((k) => k !== keyword)
}

function addTag(): void {
  const t = tagInput.value.trim()
  if (t && !tags.value.includes(t)) {
    tags.value.push(t)
    tagInput.value = ''
  }
}

function removeTag(tag: string): void {
  tags.value = tags.value.filter((t) => t !== tag)
}

async function save(): Promise<void> {
  if (!canSave.value) return
  if (!subject.value) {
    subjectError.value = true
    return
  }
  isSaving.value = true
  const finalTitle = title.value.trim() || '未命名笔记'
  const id = await store.addItem(
    finalTitle,
    content.value,
    summary.value.trim(),
    [...keywords.value],
    [...tags.value],
    subject.value,
  )
  emit('saved', id)
  emit('close')
}

function close(): void {
  if (title.value.trim() || content.value.trim() || summary.value.trim()) {
    if (!confirm('放弃未保存的内容？')) {
      return
    }
  }
  emit('close')
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    save()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="close">
      <div class="modal-container">
        <!-- Header -->
        <div class="modal-header">
          <h2>新建笔记</h2>
          <button class="modal-close-btn" title="关闭 (Esc)" @click="close">&times;</button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <input
            v-model="title"
            type="text"
            class="modal-title-input"
            placeholder="输入标题..."
            autofocus
          />

          <!-- Subject selector -->
          <div class="modal-field">
            <label class="field-label">
              学科分类
              <span v-if="subjectError" class="subject-error-msg">请选择学科分类</span>
            </label>
            <SubjectPicker v-model="subject" :class="{ 'subject-error': subjectError }" />
          </div>

          <!-- Summary input -->
          <div class="modal-field">
            <label class="field-label">
              摘要
              <span class="field-hint">（50-100字简短描述）</span>
              <span
                :class="[
                  'field-count',
                  { 'count-warn': summaryLength > 0 && summaryLength < 10 },
                  { 'count-ok': summaryLength >= 10 && summaryLength <= 100 },
                  { 'count-over': summaryLength > 100 },
                ]"
              >
                {{ summaryLength }}/100
              </span>
            </label>
            <textarea
              v-model="summary"
              class="summary-textarea"
              rows="2"
              maxlength="120"
              placeholder="输入笔记的简短摘要..."
            ></textarea>
          </div>

          <!-- Keywords input -->
          <div class="modal-field">
            <label class="field-label">
              关键词
              <span class="field-hint">（逗号或回车分隔）</span>
            </label>
            <div class="chip-input-row">
              <span v-for="kw in keywords" :key="kw" class="chip">
                {{ kw }}
                <button class="chip-remove" @click="removeKeyword(kw)">&times;</button>
              </span>
              <input
                v-model="keywordInput"
                type="text"
                class="chip-input"
                placeholder="如：机器学习, 深度学习..."
                @keydown.enter.prevent="addKeyword"
                @keydown.,.prevent="addKeyword"
              />
            </div>
          </div>

          <!-- Tag input row -->
          <div class="chip-input-row">
            <span v-for="tag in tags" :key="tag" class="chip">
              {{ tag }}
              <button class="chip-remove" @click="removeTag(tag)">&times;</button>
            </span>
            <input
              v-model="tagInput"
              type="text"
              class="chip-input"
              placeholder="添加标签后按回车..."
              @keydown.enter.prevent="addTag"
              @keydown.,.prevent="addTag"
            />
          </div>

          <!-- Editor -->
          <div class="modal-editor">
            <MarkdownEditor v-model="content" placeholder="开始写作..." />
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <span class="modal-hint">Ctrl+Enter 保存 · Esc 关闭</span>
          <div class="modal-footer-actions">
            <button class="btn-cancel" @click="close">取消</button>
            <button class="btn-save" :disabled="!canSave || isSaving" @click="save">
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Container */
.modal-container {
  background: rgba(20, 20, 35, 0.97);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), var(--shadow-glow);
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-glass-border);
}

.modal-header h2 {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text);
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-faint);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}

.modal-close-btn:hover {
  background: var(--color-glass-hover);
  color: var(--color-text);
}

/* Body */
.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 1.25rem 1.5rem 0;
  overflow-y: auto;
}

.modal-title-input {
  width: 100%;
  font-size: 1.3rem;
  font-weight: 700;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text);
  padding: 0.25rem 0;
  margin-bottom: 0.75rem;
}

.modal-title-input::placeholder {
  color: var(--color-text-faint);
}

/* Form fields */
.modal-field {
  margin-bottom: 0.75rem;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.3rem;
}

.field-hint {
  font-weight: 400;
  color: var(--color-text-faint);
}

.subject-error-msg {
  color: var(--color-danger);
  font-size: 0.72rem;
  font-weight: 500;
  animation: shake 0.3s ease;
}

:deep(.subject-error) .subject-chip:not(.active) {
  border-color: rgba(255, 118, 117, 0.4);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); }
}

.field-count {
  margin-left: auto;
  font-size: 0.72rem;
  font-weight: 500;
  color: #bbb;
}

.field-count.count-ok {
  color: #4caf50;
}

.field-count.count-warn {
  color: var(--color-warning);
}

.field-count.count-over {
  color: var(--color-danger);
}

.summary-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--color-glass);
  color: var(--color-text);
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.summary-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-tint);
}

.summary-textarea::placeholder {
  color: var(--color-text-faint);
}

/* Chip input row (shared by keywords & tags) */
.chip-input-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-sm);
  background: var(--color-glass);
  min-height: 2.4rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.chip-input-row:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-tint);
}

.chip {
  background: rgba(108, 92, 231, 0.15);
  color: #a78bfa;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.chip-remove {
  background: none;
  border: none;
  color: var(--color-text-faint);
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  line-height: 1;
}

.chip-remove:hover {
  color: var(--color-danger);
}

.chip-input {
  border: none;
  outline: none;
  padding: 0.15rem 0.2rem;
  font-size: 0.8rem;
  min-width: 120px;
  flex: 1;
  background: transparent;
  color: var(--color-text);
  font-family: inherit;
}

.chip-input::placeholder {
  color: var(--color-text-faint);
}

/* Editor area */
.modal-editor {
  flex: 1;
  min-height: 0;
  margin-bottom: 0;
}

.modal-editor :deep(.tiptap-wrapper) {
  border: none;
}

.modal-editor :deep(.tiptap) {
  min-height: 200px;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.modal-hint {
  font-size: 0.75rem;
  color: var(--color-text-faint);
}

.modal-footer-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-cancel {
  background: var(--color-glass);
  color: var(--color-text-muted);
  border: 1px solid var(--color-glass-border);
  padding: 0.5rem 1.25rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: var(--color-glass-hover);
  color: var(--color-text);
}

.btn-save {
  background: linear-gradient(135deg, #6c5ce7, #a855f7);
  color: #fff;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all var(--ease);
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(108, 92, 231, 0.4);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 600px) {
  .modal-overlay {
    padding: 0;
    align-items: stretch;
  }

  .modal-container {
    border-radius: 0;
    max-height: 100vh;
    max-width: 100%;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-body {
    padding: 0.75rem 1rem 0;
  }

  .modal-title-input {
    font-size: 1.1rem;
  }

  .summary-textarea {
    font-size: 0.82rem;
  }

  .chip-input-row {
    padding: 0.3rem 0.4rem;
  }

  .modal-editor :deep(.tiptap) {
    min-height: 150px;
  }

  .modal-footer {
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .modal-hint {
    display: none;
  }

  .modal-footer-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .btn-cancel,
  .btn-save {
    font-size: 0.85rem;
    padding: 0.45rem 1rem;
  }
}
</style>
