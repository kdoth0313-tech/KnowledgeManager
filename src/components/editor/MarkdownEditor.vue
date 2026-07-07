<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { BubbleMenu } from '@tiptap/extension-bubble-menu'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    editable?: boolean
    enableImageUpload?: boolean
  }>(),
  {
    placeholder: '开始写作...',
    editable: true,
    enableImageUpload: true,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const toolbarEl = ref<HTMLElement | null>(null)

const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      link: {
        openOnClick: false,
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    Image,
    BubbleMenu.configure({
      pluginKey: 'bubbleMenu',
      element: null as unknown as HTMLElement, // set after mount via watcher below
      shouldShow: ({ editor: ed, state }) => {
        const { from, to } = state.selection
        if (from === to && !(state.selection.constructor.name === 'NodeSelection')) return false
        return ed.isEditable
      },
    }),
  ],
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  },
})

// Inject the toolbar element into the BubbleMenu extension after editor is created.
// Tiptap v3 stores options on the extension instance, accessible via extensionManager.
watch(
  () => editor.value,
  (ed) => {
    if (!ed || !toolbarEl.value) return
    const ext = ed.extensionManager.extensions.find(
      (e) => e.name === 'bubbleMenu',
    )
    if (ext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(ext as any).options.element = toolbarEl.value
    }
  },
  { immediate: true },
)

// Sync external modelValue changes back into the editor
watch(
  () => props.modelValue,
  (newVal) => {
    if (editor.value && editor.value.getHTML() !== newVal) {
      editor.value.commands.setContent(newVal, { emitUpdate: false })
    }
  },
)

// ── Image upload helpers ──────────────────────────────────────

const imageInput = ref<HTMLInputElement | null>(null)

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function insertImageAsBase64(file: File): Promise<void> {
  if (!editor.value) return
  try {
    const dataUrl = await readImageFile(file)
    editor.value.chain().focus().setImage({ src: dataUrl }).run()
  } catch (err) {
    console.warn('Failed to insert image:', err)
  }
}

function triggerImageUpload(): void {
  imageInput.value?.click()
}

async function onImageFileSelected(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  await insertImageAsBase64(file)
  input.value = ''
}

async function handleImagePaste(e: ClipboardEvent): Promise<void> {
  if (!props.enableImageUpload || !editor.value) return
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (!file) continue
      await insertImageAsBase64(file)
    }
  }
}

async function handleImageDrop(e: DragEvent): Promise<void> {
  if (!props.enableImageUpload || !editor.value) return
  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const imageFiles: File[] = []
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      imageFiles.push(file)
    }
  }
  if (imageFiles.length === 0) return

  e.preventDefault()
  const coordinates = editor.value.view.posAtCoords({
    left: e.clientX,
    top: e.clientY,
  })
  const pos = coordinates?.pos ?? editor.value.state.selection.from

  for (const file of imageFiles) {
    try {
      const dataUrl = await readImageFile(file)
      editor.value
        .chain()
        .focus()
        .setTextSelection(pos)
        .setImage({ src: dataUrl })
        .run()
    } catch (err) {
      console.warn('Failed to drop image:', err)
    }
  }
}

// ── Link helper ───────────────────────────────────────────────

function setLink(): void {
  if (!editor.value) return
  const previousUrl = editor.value.getAttributes('link').href || ''
  const url = prompt('输入链接URL:', previousUrl)
  if (url === null) return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

// ── DOM listeners ─────────────────────────────────────────────

const editorEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!editor.value) return
  const el = editor.value.view.dom
  editorEl.value = el
  el.addEventListener('paste', handleImagePaste as unknown as EventListener)
  el.addEventListener('drop', handleImageDrop as unknown as EventListener)
  el.addEventListener('dragover', (e: DragEvent) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault()
    }
  })
})

onBeforeUnmount(() => {
  if (!editorEl.value) return
  editorEl.value.removeEventListener('paste', handleImagePaste as unknown as EventListener)
  editorEl.value.removeEventListener('drop', handleImageDrop as unknown as EventListener)
})
</script>

<template>
  <div class="tiptap-wrapper">
    <!-- Bubble formatting toolbar -->
    <div ref="toolbarEl" class="bubble-menu">
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('bold') }"
        title="粗体"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <strong>B</strong>
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('italic') }"
        title="斜体"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <em>I</em>
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('strike') }"
        title="删除线"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <s>S</s>
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('code') }"
        title="行内代码"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        &lt;/&gt;
      </button>
      <span class="bubble-divider"></span>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
        title="标题1"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        H1
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
        title="标题2"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
        title="标题3"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <span class="bubble-divider"></span>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('bulletList') }"
        title="无序列表"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        •≡
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('orderedList') }"
        title="有序列表"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        1.
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('blockquote') }"
        title="引用"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        ❝
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('codeBlock') }"
        title="代码块"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        { }
      </button>
      <span class="bubble-divider"></span>
      <button
        class="bubble-btn"
        title="水平线"
        @click="editor?.chain().focus().setHorizontalRule().run()"
      >
        —
      </button>
      <button
        class="bubble-btn"
        :class="{ 'is-active': editor?.isActive('link') }"
        title="链接"
        @click="setLink"
      >
        🔗
      </button>
      <button
        v-if="enableImageUpload"
        class="bubble-btn"
        title="插入图片"
        @click="triggerImageUpload"
      >
        🖼
      </button>
    </div>

    <!-- Hidden file input for image upload -->
    <input
      v-if="enableImageUpload"
      ref="imageInput"
      type="file"
      accept="image/*"
      class="image-input-hidden"
      @change="onImageFileSelected"
    />

    <!-- Persistent formatting toolbar -->
    <div class="editor-toolbar">
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('bold') }"
        title="粗体 (Ctrl+B)"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <strong>B</strong>
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('italic') }"
        title="斜体 (Ctrl+I)"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <em>I</em>
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('strike') }"
        title="删除线"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <s>S</s>
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('code') }"
        title="行内代码"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        &lt;/&gt;
      </button>
      <span class="toolbar-divider"></span>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
        title="标题1"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
      >
        H1
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
        title="标题2"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
        title="标题3"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <span class="toolbar-divider"></span>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('bulletList') }"
        title="无序列表"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        •≡
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('orderedList') }"
        title="有序列表"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        1.
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('blockquote') }"
        title="引用"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        ❝
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('codeBlock') }"
        title="代码块"
        @click="editor?.chain().focus().toggleCodeBlock().run()"
      >
        { }
      </button>
      <span class="toolbar-divider"></span>
      <button
        class="toolbar-btn"
        title="水平线"
        @click="editor?.chain().focus().setHorizontalRule().run()"
      >
        —
      </button>
      <button
        class="toolbar-btn"
        :class="{ 'is-active': editor?.isActive('link') }"
        title="插入链接"
        @click="setLink"
      >
        🔗
      </button>
      <button
        v-if="enableImageUpload"
        class="toolbar-btn toolbar-btn-upload"
        title="上传图片"
        @click="triggerImageUpload"
      >
        🖼 图片
      </button>
    </div>

    <EditorContent :editor="editor" class="tiptap-content" />
  </div>
</template>

<style scoped>
.tiptap-wrapper {
  width: 100%;
  height: 100%;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-glass);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  position: relative;
  display: flex;
  flex-direction: column;
}

.tiptap-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
}

.image-input-hidden {
  display: none;
}

/* ── Persistent editor toolbar ── */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--color-glass-border);
  flex-wrap: nowrap;
  overflow-x: auto;
  flex-shrink: 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.editor-toolbar::-webkit-scrollbar {
  height: 3px;
}

.editor-toolbar::-webkit-scrollbar-thumb {
  background: var(--color-border-strong);
  border-radius: 3px;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.toolbar-btn:hover {
  background: var(--color-glass-hover);
  color: var(--color-text);
}

.toolbar-btn.is-active {
  background: var(--color-primary);
  color: #fff;
}

.toolbar-btn-upload {
  color: var(--color-accent);
  font-weight: 600;
  gap: 3px;
}

.toolbar-btn-upload:hover {
  background: var(--color-primary);
  color: #fff;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--color-glass-border);
  margin: 0 4px;
}

/* ── Bubble menu toolbar ── */
.bubble-menu {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #1e1e2e;
  border-radius: 8px;
  padding: 4px 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  flex-wrap: wrap;
  position: absolute;
  z-index: 50;
}

.bubble-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 5px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #cdd6f4;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s ease;
  white-space: nowrap;
}

.bubble-btn:hover {
  background: #45475a;
  color: #fff;
}

.bubble-btn.is-active {
  background: #5865f2;
  color: #fff;
}

.bubble-divider {
  width: 1px;
  height: 18px;
  background: #45475a;
  margin: 0 3px;
}

/* ── Tiptap editor inner styles ── */
:deep(.tiptap) {
  min-height: 300px;
  outline: none;
  font-size: 16px;
  line-height: 1.7;
  color: var(--color-text);
}

:deep(.tiptap h1) {
  font-size: 1.8em;
  font-weight: 700;
  margin: 1em 0 0.5em;
  color: var(--color-text);
}

:deep(.tiptap h2) {
  font-size: 1.4em;
  font-weight: 600;
  margin: 0.8em 0 0.4em;
  color: var(--color-text);
}

:deep(.tiptap h3) {
  font-size: 1.2em;
  font-weight: 600;
  margin: 0.6em 0 0.3em;
  color: var(--color-text);
}

:deep(.tiptap p) {
  margin: 0.5em 0;
}

:deep(.tiptap ul),
:deep(.tiptap ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

:deep(.tiptap blockquote) {
  border-left: 3px solid var(--color-primary);
  padding-left: 1em;
  color: var(--color-text-muted);
  margin: 0.5em 0;
}

:deep(.tiptap pre) {
  background: rgba(0, 0, 0, 0.25);
  border-radius: var(--radius-sm);
  padding: 0.75em 1em;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9em;
  overflow-x: auto;
  border: 1px solid var(--color-glass-border);
}

:deep(.tiptap code) {
  background: rgba(108, 92, 231, 0.15);
  color: #a78bfa;
  padding: 0.15em 0.4em;
  border-radius: var(--radius-sm);
  font-size: 0.9em;
}

:deep(.tiptap pre code) {
  background: none;
  padding: 0;
  color: var(--color-text);
}

:deep(.tiptap img) {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
}

:deep(.tiptap hr) {
  border: none;
  border-top: 1px solid var(--color-glass-border);
  margin: 1.5em 0;
}

:deep(.tiptap a) {
  color: var(--color-primary);
  text-decoration: underline;
  cursor: pointer;
}

:deep(.tiptap p.is-editor-empty:first-child::before) {
  color: var(--color-text-faint);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
