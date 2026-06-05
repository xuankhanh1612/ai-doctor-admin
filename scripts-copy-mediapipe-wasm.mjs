import fs from 'fs'
import path from 'path'

const packages = [
  '@mediapipe/tasks-audio',
  '@mediapipe/tasks-vision',
  '@mediapipe/tasks-text',
]

const destDir = path.join('public', 'wasm')
fs.mkdirSync(destDir, { recursive: true })

for (const packageName of packages) {
  const candidates = [
    path.join('node_modules', packageName, 'wasm'),
    path.join('src', 'mediapipe-khanh', 'node_modules', packageName, 'wasm'),
  ]
  const srcDir = candidates.find((candidate) => fs.existsSync(candidate))
  if (!srcDir) {
    console.warn(`Skipping missing MediaPipe WASM directory for ${packageName}`)
    continue
  }

  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.join(srcDir, file)
    const destFile = path.join(destDir, file)
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile)
      console.log(`Copied ${srcFile} -> ${destFile}`)
    }
  }
}
