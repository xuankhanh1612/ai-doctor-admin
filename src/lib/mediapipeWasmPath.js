/**
 * Resolve đường dẫn WASM của MediaPipe trực tiếp từ node_modules.
 *
 * @mediapipe/tasks-vision export các WASM files qua:
 *   "@mediapipe/tasks-vision/vision_wasm_internal.wasm"  (không có /wasm/ prefix)
 *
 * Dùng ?url import: Vite sẽ copy file vào dist/ lúc build và trả về URL đúng.
 * Dev mode: serve trực tiếp từ node_modules. Không cần public/wasm.
 */
import wasmUrl from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'

// FilesetResolver.forVisionTasks() cần URL của thư mục chứa WASM files.
// Ta lấy URL của một file rồi cắt phần tên file để lấy thư mục.
export const MEDIAPIPE_VISION_WASM_URL = wasmUrl.substring(0, wasmUrl.lastIndexOf('/'))
