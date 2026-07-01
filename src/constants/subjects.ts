export interface Subject {
  /** Stable identifier persisted on notes */
  id: string
  /** Display name */
  name: string
  /** Emoji icon */
  icon: string
  /** Accent color (hex) used for badges & pills */
  color: string
}

/**
 * Preset subject (学科) categories. Each note may belong to one subject.
 * The `id` is what's persisted on the note; names/icons/colors are for display.
 */
export const SUBJECTS: Subject[] = [
  { id: 'math', name: '数学', icon: '📐', color: '#5b8def' },
  { id: 'physics', name: '物理', icon: '🔭', color: '#7c5cff' },
  { id: 'chemistry', name: '化学', icon: '⚗️', color: '#00b894' },
  { id: 'biology', name: '生物', icon: '🧬', color: '#26a69a' },
  { id: 'cs', name: '计算机', icon: '💻', color: '#5865f2' },
  { id: 'language', name: '语言', icon: '🗣️', color: '#f39c12' },
  { id: 'literature', name: '文学', icon: '📖', color: '#e17055' },
  { id: 'history', name: '历史', icon: '🏛️', color: '#b8860b' },
  { id: 'geography', name: '地理', icon: '🌍', color: '#00a8b5' },
  { id: 'economics', name: '经济', icon: '💹', color: '#16a085' },
  { id: 'philosophy', name: '哲学', icon: '💭', color: '#8e44ad' },
  { id: 'art', name: '艺术', icon: '🎨', color: '#e84393' },
  { id: 'other', name: '其他', icon: '🗂️', color: '#7f8c8d' },
]

const SUBJECT_MAP: Record<string, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s]),
)

/** Look up a subject by id. Returns undefined for empty/unknown ids. */
export function getSubject(id: string | undefined | null): Subject | undefined {
  if (!id) return undefined
  return SUBJECT_MAP[id]
}
