'use client'
// Browser helpers for photos: shrink before upload (faster, smaller, strips camera location data) and upload
// into the maker's own private folder.
import { supabaseBrowser } from './supabase/client'

export const PHOTO_BUCKET = 'maker-photos'

export async function shrinkImage(file, max = 1600, quality = 0.86) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  return blob || file
}

export async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

// folder: 'patterns' | 'makes' | 'stash' | 'snaps'. Returns the storage path.
export async function uploadPhoto(blob, folder) {
  const supabase = supabaseBrowser()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please sign in again.')
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw new Error(error.message)
  return path
}

export async function signedUrl(path, seconds = 3600) {
  if (!path) return null
  const { data } = await supabaseBrowser().storage.from(PHOTO_BUCKET).createSignedUrl(path, seconds)
  return data?.signedUrl || null
}

export async function removePhoto(path) {
  if (!path) return
  await supabaseBrowser().storage.from(PHOTO_BUCKET).remove([path])
}
