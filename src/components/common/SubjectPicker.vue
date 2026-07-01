<script setup lang="ts">
import { SUBJECTS } from '@/constants/subjects'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function pick(id: string, current: string): void {
  // Toggle off if the same subject is clicked again
  emit('update:modelValue', current === id ? '' : id)
}
</script>

<template>
  <div class="subject-picker">
    <button
      v-for="subject in SUBJECTS"
      :key="subject.id"
      type="button"
      :class="['subject-chip', { active: modelValue === subject.id }]"
      :style="modelValue === subject.id ? { background: subject.color, borderColor: subject.color } : { '--sc': subject.color }"
      @click="pick(subject.id, modelValue)"
    >
      <span class="subject-chip-icon">{{ subject.icon }}</span>
      <span class="subject-chip-name">{{ subject.name }}</span>
    </button>
  </div>
</template>

<style scoped>
.subject-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.subject-chip {
  --sc: #7f8c8d;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 999px;
  background: #fff;
  color: #555;
  font-size: 0.8rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.subject-chip:hover {
  border-color: var(--sc);
  color: var(--sc);
  transform: translateY(-1px);
}

.subject-chip.active {
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.subject-chip-icon {
  font-size: 0.95rem;
  line-height: 1;
}
</style>
