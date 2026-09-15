import { Zip, ZipPassThrough, strToU8 } from 'fflate'
import { DATASET_VERSION } from './captureFrame.js'
// Bounded batches avoid accumulating an entire large dataset in mobile memory.
export const EXPORT_PART_BYTES = 50 * 1024 * 1024
export function planExport(records, maxBytes = EXPORT_PART_BYTES) {
  const parts = []
  for (const record of [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id))) {
    let part = parts.at(-1)
    if (!part || (part.bytes + record.byteSize > maxBytes && part.records.length)) { part = { bytes: 0, records: [] }; parts.push(part) }
    part.records.push(record); part.bytes += record.byteSize
  }
  return parts
}
export async function exportDatasetPart(records, getImage, { part = 1, totalParts = 1, exportId = crypto.randomUUID() } = {}) {
  const chunks = []
  let failure
  const zip = new Zip((error, data) => { if (error) failure = error; else chunks.push(data) })
  function add(name, bytes) { const file = new ZipPassThrough(name); zip.add(file); file.push(bytes, true); if (failure) throw failure }
  const images = []
  for (const record of records) {
    const blob = await getImage(record.id)
    if (!blob || blob.size !== record.byteSize) throw new Error('Ein Bild fehlt oder wurde verändert. Export erneut vorbereiten.')
    add(record.imagePath, new Uint8Array(await blob.arrayBuffer())); images.push(record)
  }
  add('metadata.json', strToU8(JSON.stringify({ datasetVersion: DATASET_VERSION, exportId, exportedAt: new Date().toISOString(), part, totalParts, images }, null, 2)))
  zip.end()
  if (failure) throw failure
  return new Blob(chunks, { type: 'application/zip' })
}
