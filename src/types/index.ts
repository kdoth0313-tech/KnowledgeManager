export interface KnowledgeItem {
  id: string
  title: string
  content: string
  summary: string
  keywords: string[]
  tags: string[]
  /** Subject (学科) category id — see constants/subjects.ts. Empty string = uncategorized. */
  subject: string
  createdAt: number
  updatedAt: number
}

export interface SearchResult {
  id: string
  title: string
  excerpt: string
  score: number
}

export interface DraftState {
  content: string
  title: string
  tags: string[]
  subject: string
  lastSaved: number
}

export interface TagRecord {
  name: string
  count: number
}

export interface KnowledgeDBSchema {
  notes: {
    key: string
    value: KnowledgeItem
    indexes: { createdAt: number; updatedAt: number; subject: string }
  }
  tags: {
    key: string
    value: TagRecord
  }
  settings: {
    key: string
    value: unknown
  }
}
