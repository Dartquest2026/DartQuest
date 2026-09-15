const DB_NAME = 'dartquest-camera-dataset'
// Metadata and image are committed/deleted in one transaction. Listing never loads image blobs.
export function createDatasetStore(factory = globalThis.indexedDB, name = DB_NAME) {
  async function open() {
    if (!factory) throw new Error('Lokaler Bildspeicher ist in diesem Browser nicht verfügbar.')
    return new Promise((resolve, reject) => {
      const request = factory.open(name, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        db.createObjectStore('metadata', { keyPath: 'id' })
        db.createObjectStore('images')
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Bildspeicher blockiert. Andere DartQuest-Tabs schließen.'))
      request.onsuccess = () => resolve(request.result)
    })
  }
  async function transaction(stores, mode, action) {
    const db = await open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode)
      let result
      tx.oncomplete = () => { db.close(); resolve(result?.result) }
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Bildspeicher konnte nicht aktualisiert werden.')) }
      try { result = action(tx) } catch (error) { tx.abort(); reject(error) }
    })
  }
  return {
    list: () => transaction(['metadata'], 'readonly', (tx) => tx.objectStore('metadata').getAll()),
    getImage: (id) => transaction(['images'], 'readonly', (tx) => tx.objectStore('images').get(id)),
    save: ({ metadata, blob }) => transaction(['metadata', 'images'], 'readwrite', (tx) => {
      if (!metadata?.id || !blob?.size) throw new Error('Unvollständige Aufnahme.')
      tx.objectStore('metadata').add(metadata); tx.objectStore('images').add(blob, metadata.id)
    }),
    remove: (id) => transaction(['metadata', 'images'], 'readwrite', (tx) => {
      tx.objectStore('metadata').delete(id); tx.objectStore('images').delete(id)
    }),
  }
}
export const datasetStore = createDatasetStore()
export function summarizeDataset(records) {
  const categories = {}
  let bytes = 0
  for (const item of records) { categories[item.category] = (categories[item.category] ?? 0) + 1; bytes += item.byteSize }
  return { total: records.length, bytes, categories }
}
