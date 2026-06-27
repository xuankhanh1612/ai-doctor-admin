// ─── HEIC/HEIF → JPEG conversion (shared utility) ──────────────────────────
//
// iPhones (Camera/Photos) save photos as HEIC/HEIF by default. Browsers
// generally cannot decode/display HEIC (only Safari can, partially), and
// vision APIs (Groq, Anthropic Claude) reject the mime type outright
// (400 Bad Request) when it's sent as image data.
//
// This module detects HEIC/HEIF files and transcodes them to JPEG entirely
// client-side (no server round-trip) using `heic2any`, loaded on demand from
// a CDN as an ES module so no build-time dependency / npm install is needed.
//
// Used by:
//   - FullDocumentSummarizationPanel.jsx
//   - upload/MedicalUploader.jsx        (Upload Records)
//   - inbody-khanh/InBodyDashboard.jsx  (AI InBody Portal)
// Any new uploader should import from here too, instead of re-implementing.

let heicLibPromise = null

function loadHeic2Any() {
  if (!heicLibPromise) {
    heicLibPromise = import('https://esm.sh/heic2any@0.0.4')
      .then((mod) => mod.default || mod)
      .catch((err) => {
        heicLibPromise = null // allow retry on next call instead of caching a rejected promise
        throw err
      })
  }
  return heicLibPromise
}

/**
 * Detect whether a File/Blob is a HEIC/HEIF image.
 * Checks both MIME type and file extension because many browsers/OSes
 * report an empty `file.type` for HEIC files.
 */
export function isHeicFile(file) {
  if (!file) return false
  const t = (file.type || '').toLowerCase()
  const n = (file.name || '').toLowerCase()
  return t === 'image/heic' || t === 'image/heif' || n.endsWith('.heic') || n.endsWith('.heif')
}

/**
 * Convert a HEIC/HEIF File into a JPEG File.
 * Throws if the input isn't HEIC or if conversion fails — callers that just
 * want "make this safe to upload/display/send to AI" should use
 * `ensureBrowserSafeImage` instead.
 */
export async function convertHeicToJpeg(file, { quality = 0.85 } = {}) {
  const heic2any = await loadHeic2Any()
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality })
  const outBlob = Array.isArray(result) ? result[0] : result
  const newName = (file.name || 'photo').replace(/\.(heic|heif)$/i, '') + '.jpg'
  return new File([outBlob], newName, { type: 'image/jpeg' })
}

/**
 * Convenience wrapper: returns the original file untouched if it's not
 * HEIC/HEIF, otherwise returns the converted JPEG File. Safe to call on
 * any File — this is what most upload flows should use.
 */
export async function ensureBrowserSafeImage(file) {
  if (!isHeicFile(file)) return file
  return convertHeicToJpeg(file)
}
