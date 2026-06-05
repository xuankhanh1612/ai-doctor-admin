import fs from 'fs'
import path from 'path'

const packages = [
  '@mediapipe/tasks-audio',
  '@mediapipe/tasks-vision',
  '@mediapipe/tasks-text',
]

function copyFile(srcFile, destFile) {
  fs.mkdirSync(path.dirname(destFile), { recursive: true })
  fs.copyFileSync(srcFile, destFile)
  console.log(`Copied ${srcFile} -> ${destFile}`)
}

function copyDirectoryFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return

  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    if (file.startsWith('.')) continue

    const srcFile = path.join(srcDir, file)
    const destFile = path.join(destDir, file)
    if (fs.statSync(srcFile).isFile()) {
      copyFile(srcFile, destFile)
    }
  }
}

const wasmDestDir = path.join('public', 'wasm')
fs.mkdirSync(wasmDestDir, { recursive: true })

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

  copyDirectoryFiles(srcDir, wasmDestDir)
}

copyDirectoryFiles(
  path.join('src', 'mediapipe-khanh', 'public'),
  path.join('public', 'src', 'mediapipe-khanh')
)
