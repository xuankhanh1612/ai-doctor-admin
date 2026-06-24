/**
 * Resolve đường dẫn WASM của MediaPipe.
 * WASM files được copy vào public/wasm/ bởi scripts-copy-mediapipe-wasm.mjs
 * (chạy tự động qua predev / prebuild trong package.json).
 * Vercel và dev server đều serve public/ tĩnh → không cần CDN.
 */
export const MEDIAPIPE_VISION_WASM_URL = `${import.meta.env.BASE_URL}wasm`.replace(/\/\//g, '/')
