import { openDB, type IDBPDatabase } from 'idb'
import type { KnowledgeItem, TagRecord, DraftState } from '@/types'
import type { KnowledgeDBSchema } from '@/types'

// ── Database singleton ────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<KnowledgeDBSchema>> | null = null

function getDB(): Promise<IDBPDatabase<KnowledgeDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<KnowledgeDBSchema>('knowledge-manager', 2, {
      upgrade(db, oldVersion, _newVersion, tx) {
        // notes store
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' })
          notesStore.createIndex('createdAt', 'createdAt')
          notesStore.createIndex('updatedAt', 'updatedAt')
          notesStore.createIndex('subject', 'subject')
        }
        // tags store
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'name' })
        }
        // settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }

        // v1 → v2: add subject index and backfill existing notes with empty subject
        if (oldVersion < 2 && db.objectStoreNames.contains('notes')) {
          const notesStore = tx.objectStore('notes')
          if (!notesStore.indexNames.contains('subject')) {
            notesStore.createIndex('subject', 'subject')
          }
          notesStore.openCursor().then(function backfill(cursor): unknown {
            if (!cursor) return
            const note = cursor.value
            if (note.subject === undefined) {
              cursor.update({ ...note, subject: '' })
            }
            return cursor.continue().then(backfill)
          })
        }
      },
    })
  }
  return dbPromise
}

// ── Notes CRUD ────────────────────────────────────────────────

export async function getNotes(): Promise<KnowledgeItem[]> {
  const db = await getDB()
  const items = await db.getAll('notes')
  // Sort by createdAt descending
  return items.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getNoteById(id: string): Promise<KnowledgeItem | undefined> {
  const db = await getDB()
  return db.get('notes', id)
}

export async function addNote(note: KnowledgeItem): Promise<string> {
  const db = await getDB()
  const tx = db.transaction(['notes', 'tags'], 'readwrite')

  await tx.objectStore('notes').put(note)

  // Update tag counts
  for (const tag of note.tags) {
    const existing = await tx.objectStore('tags').get(tag)
    await tx.objectStore('tags').put({
      name: tag,
      count: (existing?.count ?? 0) + 1,
    })
  }

  await tx.done
  return note.id
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<KnowledgeItem, 'title' | 'content' | 'summary' | 'keywords' | 'tags' | 'subject'>>,
): Promise<KnowledgeItem | null> {
  const db = await getDB()
  const tx = db.transaction(['notes', 'tags'], 'readwrite')

  const existing = await tx.objectStore('notes').get(id)
  if (!existing) return null

  // Detect removed/added tags to adjust counts
  if (patch.tags) {
    const oldTags = new Set(existing.tags)
    const newTags = new Set(patch.tags)

    // Decrement removed tags
    for (const tag of oldTags) {
      if (!newTags.has(tag)) {
        const tagRec = await tx.objectStore('tags').get(tag)
        if (tagRec) {
          const newCount = tagRec.count - 1
          if (newCount <= 0) {
            await tx.objectStore('tags').delete(tag)
          } else {
            await tx.objectStore('tags').put({ name: tag, count: newCount })
          }
        }
      }
    }

    // Increment added tags
    for (const tag of newTags) {
      if (!oldTags.has(tag)) {
        const tagRec = await tx.objectStore('tags').get(tag)
        await tx.objectStore('tags').put({
          name: tag,
          count: (tagRec?.count ?? 0) + 1,
        })
      }
    }
  }

  const updated: KnowledgeItem = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }

  await tx.objectStore('notes').put(updated)
  await tx.done
  return updated
}

export async function deleteNote(id: string): Promise<boolean> {
  const db = await getDB()
  const tx = db.transaction(['notes', 'tags'], 'readwrite')

  const existing = await tx.objectStore('notes').get(id)
  if (!existing) return false

  // Decrement tag counts
  for (const tag of existing.tags) {
    const tagRec = await tx.objectStore('tags').get(tag)
    if (tagRec) {
      const newCount = tagRec.count - 1
      if (newCount <= 0) {
        await tx.objectStore('tags').delete(tag)
      } else {
        await tx.objectStore('tags').put({ name: tag, count: newCount })
      }
    }
  }

  await tx.objectStore('notes').delete(id)
  await tx.done
  return true
}

// ── Tags Queries ──────────────────────────────────────────────

export async function getTags(): Promise<TagRecord[]> {
  const db = await getDB()
  const tags = await db.getAll('tags')
  return tags.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getTagCounts(): Promise<Record<string, number>> {
  const db = await getDB()
  const tags = await db.getAll('tags')
  const counts: Record<string, number> = {}
  for (const t of tags) {
    counts[t.name] = t.count
  }
  return counts
}

// ── Settings (Draft) CRUD ─────────────────────────────────────

const DRAFT_SETTINGS_KEY = 'draft'

export async function getDraft(): Promise<DraftState | undefined> {
  const db = await getDB()
  return db.get('settings', DRAFT_SETTINGS_KEY) as Promise<DraftState | undefined>
}

export async function saveDraft(draft: DraftState): Promise<void> {
  const db = await getDB()
  await db.put('settings', { key: DRAFT_SETTINGS_KEY, ...draft })
}

export async function deleteDraft(): Promise<void> {
  const db = await getDB()
  await db.delete('settings', DRAFT_SETTINGS_KEY)
}

// ── Migration from idb-keyval ─────────────────────────────────

/**
 * Attempts to migrate existing data from idb-keyval's database into
 * the new object stores. Called once on app startup. Returns true if
 * migration was performed.
 */
export async function migrateFromIdbKeyval(): Promise<boolean> {
  try {
    // Check if the old idb-keyval database exists
    const dbs = await indexedDB.databases()
    const oldDB = dbs.find((d) => d.name === 'keyval-store')
    if (!oldDB) return false

    // Also check if we've already migrated (notes store has data)
    const db = await getDB()
    const count = await db.count('notes')
    if (count > 0) {
      // Already have data — clean up old db
      indexedDB.deleteDatabase('keyval-store')
      return false
    }

    // Read data from the old idb-keyval database
    return new Promise((resolve) => {
      const openReq = indexedDB.open('keyval-store', 1)
      openReq.onsuccess = () => {
        const oldDb = openReq.result
        const storeNames = Array.from(oldDb.objectStoreNames)

        // idb-keyval uses two stores: 'keyval' and 'keyval2'
        for (const name of storeNames) {
          try {
            const tx = oldDb.transaction(name, 'readonly')
            const store = tx.objectStore(name)

            // Try to read each known key
            const keysToTry = ['km-knowledge-items', 'km-draft', 'km-draft-old']
            for (const key of keysToTry) {
              try {
                const getReq = store.get(key)
                getReq.onsuccess = () => {
                  if (!getReq.result) {
                    // Check if this store is a simple key-val store of the newer idb-keyval
                    attemptBulkRead(store, key, oldDb)
                  } else {
                    handleMigratedValue(key, getReq.result, oldDb)
                  }
                }
              } catch {
                // key doesn't exist in this store, skip
              }
            }
          } catch {
            // Can't access this store, skip
          }
        }

        // Close and delete after a short delay to let transactions complete
        setTimeout(() => {
          try {
            oldDb.close()
            indexedDB.deleteDatabase('keyval-store')
          } catch {
            // Cleanup failed, non-critical
          }
        }, 500)
        resolve(true)
      }
      openReq.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

async function attemptBulkRead(
  store: IDBObjectStore,
  _key: string,
  _oldDb: IDBDatabase,
): Promise<void> {
  // idb-keyval stores arrays under a single key — try getAll
  // We do the migration work outside this inline function by checking
  // if the store contains array data at the known keys
  try {
    const req = store.getAll()
    req.onsuccess = async () => {
      const all = req.result
      if (!all || all.length === 0) return

      const db = await getDB()
      const tx = db.transaction(['notes', 'tags'], 'readwrite')

      for (const item of all) {
        if (item && typeof item === 'object' && 'id' in item && 'title' in item) {
          // It's a KnowledgeItem
          const ki = item as KnowledgeItem
          await tx.objectStore('notes').put({ ...ki, subject: ki.subject ?? '' })

          // Rebuild tag counts
          if (Array.isArray(item.tags)) {
            for (const tag of item.tags) {
              const existing = await tx.objectStore('tags').get(tag)
              await tx.objectStore('tags').put({
                name: tag,
                count: (existing?.count ?? 0) + 1,
              })
            }
          }
        }
      }

      await tx.done
    }
  } catch {
    // Not a bulk-readable store
  }
}

async function handleMigratedValue(key: string, value: unknown, _oldDb: IDBDatabase): Promise<void> {
  const db = await getDB()

  if (key === 'km-knowledge-items' && Array.isArray(value)) {
    // Migrate notes
    const tx = db.transaction(['notes', 'tags'], 'readwrite')
    const tagCounts: Record<string, number> = {}

    for (const item of value as KnowledgeItem[]) {
      await tx.objectStore('notes').put({ ...item, subject: item.subject ?? '' })
      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      }
    }

    // Write tag records
    for (const [name, count] of Object.entries(tagCounts)) {
      await tx.objectStore('tags').put({ name, count })
    }

    await tx.done
  } else if (key === 'km-draft' && typeof value === 'object' && value !== null) {
    // Migrate draft
    const draft = value as DraftState
    await db.put('settings', { key: DRAFT_SETTINGS_KEY, ...draft })
  }
}
