import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, Shuffle, ChevronLeft, ChevronRight, Info, LayoutGrid, List,
  Share2, Ruler, Play, Pause, Download, ExternalLink, Sparkles, Pointer,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import AnimatedAvatarViewer from './AnimatedAvatarViewer'

const REGISTRY_BASE = 'https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data'
const PROJECTS_URL = `${REGISTRY_BASE}/projects.json`
const PAGE_SIZE_OPTIONS = [8, 16, 32]
const ANIMATION_BASE_URL = 'https://www.opensourceavatars.com/animations'
// File names follow the PascalCase convention used by opensourceavatars.com's
// own /animations/*.fbx files (confirmed via Cross Jumps -> CrossJumps.fbx and
// Fight Idle -> FightIdle.fbx). T-Pose has no file: it just clears playback.
const ANIMATION_FILE_MAP = {
  'Bored': 'Bored.fbx',
  'Cross Jumps': 'CrossJumps.fbx',
  'Fight Idle': 'FightIdle.fbx',
  'Jumping Rope': 'JumpingRope.fbx',
  'Looking': 'Looking.fbx',
  'Looking Around': 'LookingAround.fbx',
  'Magic Spell Casting': 'MagicSpellCasting.fbx',
  'Offensive Idle': 'OffensiveIdle.fbx',
  'Searching Files High': 'SearchingFilesHigh.fbx',
  'Standing Magic Attack': 'StandingMagicAttack.fbx',
  'Texting While Standing': 'TextingWhileStanding.fbx',
}
const ANIMATION_PRESETS = [
  'T-Pose (Default)',
  'Bored',
  'Cross Jumps',
  'Fight Idle',
  'Jumping Rope',
  'Looking',
  'Looking Around',
  'Magic Spell Casting',
  'Offensive Idle',
  'Searching Files High',
  'Standing Magic Attack',
  'Texting While Standing',
]
const FALLBACK_AVATARS = [
  {
    id: 'fallback-health-01',
    name: 'Health Explorer',
    collectionName: 'Local fallback',
    license: 'Generated preview',
    format: 'PNG',
    thumbnail_url: 'https://ui-avatars.com/api/?name=Health+Explorer&background=00b8cc&color=fff&size=512&bold=true&rounded=true',
    model_file_url: '',
  },
  {
    id: 'fallback-vrm-02',
    name: 'VRM Pilot',
    collectionName: 'Local fallback',
    license: 'Generated preview',
    format: 'PNG',
    thumbnail_url: 'https://ui-avatars.com/api/?name=VRM+Pilot&background=6b3fd4&color=fff&size=512&bold=true&rounded=true',
    model_file_url: '',
  },
]

const valueOf = (item, keys, fallback = '') => {
  for (const key of keys) {
    const value = item?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

function normalizeAvatar(item, project) {
  const id = valueOf(item, ['id', 'token_id', 'name'], `${project?.id || 'avatar'}-${Math.random().toString(36).slice(2)}`)
  const name = valueOf(item, ['name', 'title', 'display_name'], `Avatar ${id}`)
  const thumbnail = valueOf(item, ['thumbnail_url', 'preview_image_url', 'image_url', 'image', 'thumbnail', 'preview'])
  const modelUrl = valueOf(item, ['model_file_url', 'vrm_url', 'download_url', 'model_url', 'file_url'])
  return {
    ...item,
    id,
    name,
    thumbnail_url: thumbnail,
    model_file_url: modelUrl,
    format: valueOf(item, ['format'], 'VRM'),
    description: valueOf(item, ['description']),
    metadata: item?.metadata && typeof item.metadata === 'object' ? item.metadata : null,
    collectionId: project?.id || '',
    collectionName: project?.name || 'Open Source Avatars',
    license: project?.license || item?.license || 'Open license',
    author: project?.creator_id || '',
  }
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

function avatarFinderSlug(avatar) {
  return String(avatar?.name || avatar?.id || 'froggy')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'froggy'
}

// Real formats derived from the avatar's own record — the primary
// model_file_url plus whatever ToxSam/open-source-avatars actually lists
// under metadata.alternateModels. Nothing here is invented: a format button
// only appears if the dataset provides a URL for it.
function getFormatOptions(avatar) {
  if (!avatar) return []
  const options = []
  const primaryLabel = (avatar.format || 'VRM').toUpperCase()
  if (avatar.model_file_url) {
    options.push({ key: 'primary', label: primaryLabel, url: avatar.model_file_url, kind: primaryLabel.includes('FBX') ? 'fbx' : 'gltf' })
  }
  const alt = avatar.metadata?.alternateModels || {}
  if (alt.fbx) options.push({ key: 'fbx', label: 'FBX', url: alt.fbx, kind: 'fbx' })
  if (alt.voxel_vrm) options.push({ key: 'voxel_vrm', label: 'Voxel VRM', url: alt.voxel_vrm, kind: 'gltf' })
  if (alt.voxel_fbx) options.push({ key: 'voxel_fbx', label: 'Voxel FBX', url: alt.voxel_fbx, kind: 'fbx' })
  const seen = new Set()
  return options.filter((option) => (seen.has(option.label) ? false : (seen.add(option.label), true)))
}

function licenseUsageNote(license, vi) {
  const normalized = (license || '').toUpperCase()
  if (normalized.includes('CC0')) return vi ? 'Mọi người (miễn phí bản quyền)' : 'Everyone (public domain)'
  if (normalized.includes('CC-BY') || normalized.includes('CC BY')) return vi ? 'Mọi người (cần ghi công)' : 'Everyone (attribution required)'
  if (!license) return vi ? 'Chưa rõ' : 'Unspecified'
  return license
}

export default function AvatarCreatorPanel() {
  const { user, updateProfile } = useAuth()
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const vi = lang === 'vi'

  const [projects, setProjects] = useState([])
  const [avatars, setAvatars] = useState([])
  const [selectedCollection, setSelectedCollection] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState(8)
  const [currentPage, setCurrentPage] = useState(1)
  const [browseView, setBrowseView] = useState('grid') // 'grid' | 'list'
  const [selectedFormatKey, setSelectedFormatKey] = useState('primary')
  const [modelStats, setModelStats] = useState(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [showMeasureGrid, setShowMeasureGrid] = useState(true)
  const [showInfoOverlay, setShowInfoOverlay] = useState(true)
  const [shareStatus, setShareStatus] = useState('')
  const [selectedAnimation, setSelectedAnimation] = useState('Fight Idle')
  const [animationLoadStatus, setAnimationLoadStatus] = useState('')
  const [animationBlobUrl, setAnimationBlobUrl] = useState('')
  const [status, setStatus] = useState(vi ? 'Đang tải danh sách chủ đề avatar...' : 'Loading avatar themes...')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveNote, setSaveNote] = useState('')
  const [modelViewerReady, setModelViewerReady] = useState(
    typeof window !== 'undefined' && !!window.customElements?.get('model-viewer')
  )

  // ---- Load Google's <model-viewer> web component from a CDN, once. ----
  // This is a genuine custom element with its own WebGL renderer — not an
  // <iframe> — so embedding it never triggers the source site's CSP
  // frame-ancestors restriction. It also ships a built-in drag-to-rotate
  // "interaction prompt" (the finger/hand hint), which we lean on for the
  // "Khung render 3D" panel at the bottom of the page instead of hand-rolling it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.customElements?.get('model-viewer')) {
      setModelViewerReady(true)
      return
    }
    const existingScript = document.querySelector('script[data-avatar-model-viewer]')
    if (existingScript) {
      existingScript.addEventListener('load', () => setModelViewerReady(true), { once: true })
      return
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js'
    script.dataset.avatarModelViewer = 'true'
    script.addEventListener('load', () => setModelViewerReady(true), { once: true })
    document.head.appendChild(script)
  }, [])

  useEffect(() => () => {
    if (animationBlobUrl) URL.revokeObjectURL(animationBlobUrl)
  }, [animationBlobUrl])

  // ---- Load the theme/category list from projects.json (drives the combobox) ----
  useEffect(() => {
    let cancelled = false
    async function loadProjects() {
      setStatus(vi ? 'Đang tải danh sách chủ đề avatar từ projects.json...' : 'Loading avatar themes from projects.json...')
      setError('')
      try {
        const registryProjects = await fetchJson(PROJECTS_URL)
        const publicProjects = registryProjects.filter((project) => project?.is_public !== false && (project.avatar_data_file || project.avatarDataFile))
        if (cancelled) return
        setProjects(publicProjects)
        setSelectedCollection((current) => current || publicProjects[0]?.id || '')
        if (!publicProjects.length) {
          setAvatars(FALLBACK_AVATARS)
          setSelectedAvatar(FALLBACK_AVATARS[0])
          setStatus(vi ? 'Không có chủ đề public, đang dùng avatar dự phòng.' : 'No public themes were found, using fallback avatars.')
        }
      } catch (err) {
        if (cancelled) return
        setProjects([])
        setAvatars(FALLBACK_AVATARS)
        setSelectedAvatar(FALLBACK_AVATARS[0])
        setError(vi ? `Không tải được projects.json: ${err.message}` : `Could not load projects.json: ${err.message}`)
        setStatus(vi ? 'Bạn vẫn có thể dùng avatar dự phòng để cập nhật hồ sơ.' : 'You can still use a fallback avatar to update your profile.')
      }
    }
    loadProjects()
    return () => { cancelled = true }
  }, [vi])

  // ---- Load avatars for whichever theme is selected in the combobox ----
  useEffect(() => {
    const selectedProject = projects.find((project) => project.id === selectedCollection)
    if (!selectedProject) return
    let cancelled = false
    async function loadThemeAvatars() {
      setStatus(vi ? `Đang tải avatar chủ đề ${selectedProject.name}...` : `Loading ${selectedProject.name} avatars...`)
      setError('')
      setAvatars([])
      setSelectedAvatar(null)
      try {
        const dataFile = selectedProject.avatar_data_file || selectedProject.avatarDataFile
        const data = await fetchJson(`${REGISTRY_BASE}/${dataFile}`)
        const list = Array.isArray(data) ? data : (Array.isArray(data?.avatars) ? data.avatars : [])
        const nextAvatars = list.map((item) => normalizeAvatar(item, selectedProject)).filter((item) => item.thumbnail_url || item.model_file_url)
        if (cancelled) return
        setAvatars(nextAvatars.length ? nextAvatars : FALLBACK_AVATARS)
        setSelectedAvatar(nextAvatars[0] || FALLBACK_AVATARS[0])
        setCurrentPage(1)
        setStatus(nextAvatars.length
          ? (vi ? `Đã tải ${nextAvatars.length} avatar trong chủ đề ${selectedProject.name}.` : `Loaded ${nextAvatars.length} avatars in ${selectedProject.name}.`)
          : (vi ? 'Chủ đề này chưa có ảnh xem trước, đang dùng avatar dự phòng.' : 'This theme has no preview images, using fallback avatars.'))
      } catch (err) {
        if (cancelled) return
        setAvatars(FALLBACK_AVATARS)
        setSelectedAvatar(FALLBACK_AVATARS[0])
        setCurrentPage(1)
        setError(vi ? `Không tải được chủ đề ${selectedProject.name}: ${err.message}` : `Could not load ${selectedProject.name}: ${err.message}`)
        setStatus(vi ? 'Bạn vẫn có thể dùng avatar dự phòng để cập nhật hồ sơ.' : 'You can still use a fallback avatar to update your profile.')
      }
    }
    loadThemeAvatars()
    return () => { cancelled = true }
  }, [projects, selectedCollection, vi])

  const filteredAvatars = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return avatars.filter((avatar) => !normalizedQuery || `${avatar.name} ${avatar.collectionName} ${avatar.license}`.toLowerCase().includes(normalizedQuery))
  }, [avatars, query])

  useEffect(() => { setCurrentPage(1) }, [query, pageSize, selectedCollection])

  // Reset the format/model-stats whenever the selected avatar changes, so we
  // never show stale triangle/material counts from a previously loaded model.
  useEffect(() => {
    setSelectedFormatKey('primary')
    setModelStats(null)
  }, [selectedAvatar?.id])

  const totalPages = Math.max(1, Math.ceil(filteredAvatars.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pagedAvatars = filteredAvatars.slice((safePage - 1) * pageSize, safePage * pageSize)

  const formatOptions = useMemo(() => getFormatOptions(selectedAvatar), [selectedAvatar])
  const activeFormat = formatOptions.find((option) => option.key === selectedFormatKey) || formatOptions[0] || null
  const activeModelUrl = activeFormat?.url || ''
  const activeModelKind = activeFormat?.kind || 'gltf'
  // model-viewer only understands glTF/GLB (which VRM files are) — never FBX.
  const modelViewerModelUrl = activeModelKind === 'fbx' ? '' : activeModelUrl

  // ---- "Khung render 3D" virtual-finger drag demo ----
  // A recurring onboarding gesture: a finger icon glides left/right over the
  // model-viewer, and the model's own camera orbit rotates in lockstep with
  // it, so it's immediately obvious that dragging on the model spins it
  // around. It replays every 6s while the user hasn't touched the model yet,
  // and stops for good the instant they drag for real.
  const modelViewerRef = useRef(null)
  const [showModelViewerHint, setShowModelViewerHint] = useState(false)
  const [fingerRatio, setFingerRatio] = useState(0.5)
  const [demoCycle, setDemoCycle] = useState(0)

  useEffect(() => {
    setShowModelViewerHint(false)
    setFingerRatio(0.5)
  }, [modelViewerModelUrl])

  useEffect(() => {
    if (!modelViewerModelUrl || !modelViewerReady) return
    const mv = modelViewerRef.current
    if (!mv) return

    let cancelled = false // effect torn down (unmount / model or readiness change)
    let interacted = false // user dragged for real — stop the demo permanently
    let rafId = 0
    let repeatTimer = 0

    const stopForever = () => {
      if (interacted) return
      interacted = true
      if (rafId) cancelAnimationFrame(rafId)
      if (repeatTimer) clearTimeout(repeatTimer)
      setShowModelViewerHint(false)
      mv.autoRotate = true
      mv.removeEventListener('pointerdown', stopForever)
      mv.removeEventListener('touchstart', stopForever)
    }
    mv.addEventListener('pointerdown', stopForever)
    mv.addEventListener('touchstart', stopForever, { passive: true })

    const playDemo = () => {
      if (cancelled || interacted) return
      setDemoCycle((n) => n + 1)
      setShowModelViewerHint(true)
      mv.autoRotate = false
      const baseOrbit = mv.getCameraOrbit ? mv.getCameraOrbit() : null
      const startTheta = baseOrbit ? (baseOrbit.theta * 180) / Math.PI : 0
      const polarDeg = baseOrbit ? ((baseOrbit.phi * 180) / Math.PI).toFixed(2) : '75'
      const radius = baseOrbit ? `${baseOrbit.radius.toFixed(2)}m` : '105%'
      const duration = 2400
      const amplitude = 24
      const start = performance.now()

      const frame = (now) => {
        if (cancelled || interacted) return
        const t = Math.min(1, (now - start) / duration)
        const swing = Math.sin(t * Math.PI * 2.4) * amplitude * (1 - t * 0.2)
        mv.cameraOrbit = `${(startTheta + swing).toFixed(2)}deg ${polarDeg}deg ${radius}`
        setFingerRatio(Math.min(0.86, Math.max(0.14, 0.5 + swing / (amplitude * 2.2))))
        if (t < 1) {
          rafId = requestAnimationFrame(frame)
        } else {
          // One cycle done: restore auto-rotate, hide the finger, and — if the
          // user still hasn't touched the model — queue up another cycle.
          mv.autoRotate = true
          setShowModelViewerHint(false)
          if (!cancelled && !interacted) {
            repeatTimer = setTimeout(playDemo, 6000)
          }
        }
      }
      rafId = requestAnimationFrame(frame)
    }

    if (mv.loaded) {
      playDemo()
    } else {
      mv.addEventListener('load', playDemo, { once: true })
    }

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      if (repeatTimer) clearTimeout(repeatTimer)
      mv.removeEventListener('pointerdown', stopForever)
      mv.removeEventListener('touchstart', stopForever)
      mv.removeEventListener('load', playDemo)
    }
  }, [modelViewerModelUrl, modelViewerReady])

  const loadAnimationFile = async (animation) => {
    setSelectedAnimation(animation)
    const fileName = ANIMATION_FILE_MAP[animation]
    if (!fileName) {
      // T-Pose (Default): drop the current clip reference so the viewer's
      // mixer action gets stopped next time an animation blob effect re-runs.
      if (animationBlobUrl) URL.revokeObjectURL(animationBlobUrl)
      setAnimationBlobUrl('')
      setAnimationLoadStatus('')
      return
    }

    const animationUrl = `${ANIMATION_BASE_URL}/${fileName}`
    setAnimationLoadStatus(vi ? `Đang tải ${fileName}...` : `Loading ${fileName}...`)

    try {
      // Real network fetch — nothing here is a canned number.
      const response = await fetch(animationUrl, { headers: { Accept: 'application/octet-stream,*/*' } })
      if (!response.ok && response.status !== 304) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const nextBlobUrl = URL.createObjectURL(blob)
      if (animationBlobUrl) URL.revokeObjectURL(animationBlobUrl)
      setAnimationBlobUrl(nextBlobUrl)
    } catch (err) {
      console.warn(`Animation load failed for ${fileName}`, err)
      setAnimationLoadStatus(vi ? `Không tải được ${fileName}: ${err.message}` : `Could not load ${fileName}: ${err.message}`)
    }
  }

  const handleUseAvatar = async () => {
    if (!selectedAvatar) return
    setSaving(true)
    const previewUrl = selectedAvatar.thumbnail_url || selectedAvatar.image_url || selectedAvatar.model_file_url
    updateProfile({
      avatar: previewUrl,
      avatarCustomized: true,
      openSourceAvatar: {
        id: selectedAvatar.id,
        name: selectedAvatar.name,
        collectionId: selectedAvatar.collectionId,
        collectionName: selectedAvatar.collectionName,
        license: selectedAvatar.license,
        thumbnailUrl: selectedAvatar.thumbnail_url || '',
        modelFileUrl: selectedAvatar.model_file_url || '',
        source: 'ToxSam/open-source-avatars',
      },
    })
    setSaveNote(vi ? 'Đã lưu làm avatar hồ sơ!' : 'Saved as profile avatar!')
    window.setTimeout(() => setSaving(false), 350)
    window.setTimeout(() => setSaveNote(''), 2400)
  }

  const handleRandomAvatar = () => {
    if (!filteredAvatars.length) return
    const pick = filteredAvatars[Math.floor(Math.random() * filteredAvatars.length)]
    setSelectedAvatar(pick)
    const idx = filteredAvatars.indexOf(pick)
    setCurrentPage(Math.floor(idx / pageSize) + 1)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(selectedAvatarFinderUrl)
      setShareStatus(vi ? 'Đã copy link!' : 'Link copied!')
    } catch {
      setShareStatus(vi ? 'Không copy được link' : 'Could not copy link')
    }
    window.setTimeout(() => setShareStatus(''), 2200)
  }

  const selectedAvatarFinderUrl = selectedAvatar
    ? `https://www.opensourceavatars.com/en/finder?avatar=${encodeURIComponent(avatarFinderSlug(selectedAvatar))}`
    : 'https://www.opensourceavatars.com/en/finder?avatar=froggy'

  const palette = {
    text: isDark ? '#e8f0f8' : '#172033',
    text2: isDark ? 'rgba(232,240,248,0.66)' : '#526071',
    text3: isDark ? 'rgba(232,240,248,0.44)' : '#7b8794',
    card: isDark ? 'rgba(255,255,255,0.055)' : '#fff',
    card2: isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc',
    border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)',
    accent: '#00b8cc',
  }

  const iconBtnStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 10,
    border: `1px solid ${active ? palette.accent : palette.border}`,
    background: active ? 'rgba(0,184,204,0.14)' : palette.card,
    color: active ? palette.accent : palette.text2,
    cursor: 'pointer',
  })

  const metadata = selectedAvatar?.metadata
  const nftAttributes = Array.isArray(metadata?.attributes) ? metadata.attributes.slice(0, 4) : []

  return (
    <div style={{ padding: 24, color: palette.text, maxWidth: 1440, margin: '0 auto' }}>
      <style>{`
        .osa-select, .osa-input { border:1px solid ${palette.border}; background:${palette.card}; color:${palette.text}; border-radius:12px; padding:10px 12px; font-family:inherit; font-size:13px; }
        .osa-card { border:1px solid ${palette.border}; border-radius:18px; background:${palette.card2}; }
        .osa-label { font-size:10px; font-weight:900; letter-spacing:.09em; text-transform:uppercase; color:${palette.text3}; }
        .osa-thumb-btn { text-align:left; border-radius:16px; overflow:hidden; padding:0; cursor:pointer; transition: transform .12s ease, box-shadow .12s ease; }
        .osa-thumb-btn:hover { transform: translateY(-2px); }
        .osa-layout { display:grid; grid-template-columns: minmax(230px,290px) minmax(230px,270px) minmax(360px,1fr) minmax(190px,220px); gap:16px; align-items:start; }
        .osa-scroll::-webkit-scrollbar { width:6px; }
        .osa-scroll::-webkit-scrollbar-thumb { background:${palette.border}; border-radius:6px; }
        @media (max-width: 1360px) {
          .osa-layout { grid-template-columns: 1fr 1fr; }
          .osa-browse-col { order:1; }
          .osa-detail-col { order:2; }
          .osa-viewer-col { order:3; grid-column: 1 / -1; }
          .osa-anim-col { order:4; grid-column: 1 / -1; }
        }
        @media (max-width: 760px) {
          .osa-layout { grid-template-columns: 1fr; }
          .osa-browse-col, .osa-detail-col, .osa-viewer-col, .osa-anim-col { grid-column: 1 / -1; }
        }
      `}</style>

      <section className="osa-card" style={{ overflow: 'hidden', boxShadow: isDark ? '0 18px 55px rgba(0,0,0,0.28)' : '0 18px 55px rgba(15,23,42,0.08)' }}>
        {/* ---- Header, styled after opensourceavatars.com's top bar ---- */}
        <div style={{ padding: '18px 22px', background: 'linear-gradient(135deg, rgba(0,229,255,0.16), rgba(156,111,255,0.18))', borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '.02em' }}>OSA</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: palette.accent, letterSpacing: '.12em', textTransform: 'uppercase' }}>Open Source Avatars</span>
              </div>
              <nav style={{ display: 'flex', gap: 6 }}>
                {['Home', 'Avatars', 'Finder', 'Inspector'].map((tab) => (
                  <span key={tab} style={{
                    fontSize: 11, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase',
                    padding: '6px 10px', borderRadius: 999,
                    color: tab === 'Avatars' ? '#001018' : palette.text3,
                    background: tab === 'Avatars' ? palette.accent : 'transparent',
                  }}>{tab}</span>
                ))}
              </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={user?.avatar || selectedAvatar?.thumbnail_url || FALLBACK_AVATARS[0].thumbnail_url} alt="Current user avatar" style={{ width: 44, height: 44, borderRadius: 14, objectFit: 'cover', border: `2px solid ${palette.accent}` }} />
              <div>
                <div style={{ fontWeight: 900, fontSize: 13 }}>{user?.name || (vi ? 'Người dùng' : 'User')}</div>
                <div style={{ color: palette.text3, fontSize: 11 }}>{user?.email || user?.uuid || 'guest'}</div>
              </div>
            </div>
          </div>
          <p style={{ margin: '10px 0 0', color: palette.text2, maxWidth: 760, lineHeight: 1.6, fontSize: 13 }}>
            {vi
              ? 'Chọn chủ đề từ projects.json của ToxSam/open-source-avatars, duyệt & phân trang danh sách avatar, xem 3D thật và lưu làm avatar hồ sơ.'
              : 'Pick a theme from ToxSam/open-source-avatars projects.json, browse the paginated list, view a real 3D model, and save it as the profile avatar.'}
          </p>
        </div>

        <div style={{ padding: 18 }}>
          <div className="osa-layout">

            {/* ============ Column 1: Browse / search / theme combobox / grid ============ */}
            <div className="osa-browse-col osa-card" style={{ padding: 14 }}>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: palette.text3 }} />
                <input
                  className="osa-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={vi ? 'Tìm avatar...' : 'Search avatars...'}
                  style={{ width: '100%', paddingLeft: 30, boxSizing: 'border-box' }}
                />
              </div>

              <div className="osa-label" style={{ marginBottom: 6 }}>{vi ? 'Chủ đề (projects.json)' : 'Theme (projects.json)'}</div>
              <select
                className="osa-select"
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                style={{ width: '100%', marginBottom: 10, boxSizing: 'border-box' }}
              >
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.license}</option>)}
                {!projects.length && <option value="">{vi ? 'Avatar dự phòng' : 'Fallback avatars'}</option>}
              </select>

              <button type="button" onClick={handleRandomAvatar} className="osa-card" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px', marginBottom: 12, cursor: 'pointer', fontWeight: 900, fontSize: 12, color: palette.text }}>
                <Shuffle size={14} /> {vi ? 'Avatar ngẫu nhiên' : 'Random Avatar'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
                <span style={{ color: palette.text3, fontSize: 11 }}>
                  {vi ? `${filteredAvatars.length} avatar` : `${filteredAvatars.length} avatars`}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => setBrowseView('grid')} style={iconBtnStyle(browseView === 'grid')} title={vi ? 'Xem dạng lưới' : 'Grid view'}><LayoutGrid size={14} /></button>
                  <button type="button" onClick={() => setBrowseView('list')} style={iconBtnStyle(browseView === 'list')} title={vi ? 'Xem dạng danh sách' : 'List view'}><List size={14} /></button>
                </div>
              </div>

              <div className="osa-scroll" style={{ maxHeight: 480, overflowY: 'auto', display: browseView === 'grid' ? 'grid' : 'flex', gridTemplateColumns: browseView === 'grid' ? 'repeat(2, 1fr)' : undefined, flexDirection: browseView === 'list' ? 'column' : undefined, gap: 8 }}>
                {pagedAvatars.map((avatar) => {
                  const active = selectedAvatar?.id === avatar.id
                  if (browseView === 'list') {
                    return (
                      <button key={`${avatar.collectionId}-${avatar.id}`} type="button" onClick={() => setSelectedAvatar(avatar)} className="osa-thumb-btn" style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${active ? palette.accent : palette.border}`, background: active ? 'rgba(0,184,204,0.10)' : palette.card, padding: 6 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(0,0,0,0.08)', display: 'grid', placeItems: 'center' }}>
                          {avatar.thumbnail_url ? <img src={avatar.thumbnail_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>🧑‍🚀</span>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{avatar.name}</div>
                          <div style={{ fontSize: 10, color: palette.text3 }}>{avatar.format}</div>
                        </div>
                      </button>
                    )
                  }
                  return (
                    <button key={`${avatar.collectionId}-${avatar.id}`} type="button" onClick={() => setSelectedAvatar(avatar)} className="osa-thumb-btn" style={{ border: `1px solid ${active ? palette.accent : palette.border}`, background: active ? 'rgba(0,184,204,0.10)' : palette.card, boxShadow: active ? `0 0 0 3px rgba(0,184,204,0.15)` : 'none' }}>
                      <div style={{ aspectRatio: '1 / 1', background: 'rgba(0,0,0,0.08)', display: 'grid', placeItems: 'center' }}>
                        {avatar.thumbnail_url ? <img src={avatar.thumbnail_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>🧑‍🚀</span>}
                      </div>
                      <div style={{ padding: 7 }}>
                        <div style={{ fontSize: 11, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{avatar.name}</div>
                        <div style={{ fontSize: 9, color: palette.accent, fontWeight: 800, marginTop: 2 }}>{avatar.format}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8 }}>
                <select className="osa-select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} aria-label={vi ? 'Số avatar mỗi trang' : 'Avatars per page'} style={{ padding: '7px 8px', fontSize: 11 }}>
                  {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} / {vi ? 'trang' : 'page'}</option>)}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage <= 1} style={iconBtnStyle(false)}><ChevronLeft size={14} /></button>
                  <span style={{ fontSize: 11, color: palette.text2 }}>{safePage}/{totalPages}</span>
                  <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safePage >= totalPages} style={iconBtnStyle(false)}><ChevronRight size={14} /></button>
                </div>
              </div>
            </div>

            {/* ============ Column 2: Selected avatar detail / technical panels ============ */}
            <div className="osa-detail-col osa-card" style={{ padding: 14 }}>
              <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg,#0f172a,#312e81)', border: `1px solid ${palette.border}`, display: 'grid', placeItems: 'center' }}>
                {selectedAvatar?.thumbnail_url
                  ? <img src={selectedAvatar.thumbnail_url} alt={selectedAvatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 56 }}>🧑‍🚀</span>}
                <span style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 9, fontWeight: 900 }}>{selectedAvatar?.collectionName}</span>
                <span style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 999, background: palette.accent, color: '#001018', fontSize: 9, fontWeight: 900 }}>{selectedAvatar?.license}</span>
              </div>

              <h2 style={{ margin: '12px 0 2px', fontSize: 18 }}>{selectedAvatar?.name || (vi ? 'Chọn avatar' : 'Select an avatar')}</h2>
              {selectedAvatar?.description && <div style={{ color: palette.text3, fontSize: 11, marginBottom: 10 }}>{selectedAvatar.description}</div>}

              <div className="osa-label" style={{ margin: '10px 0 6px' }}>{vi ? 'Chi tiết kỹ thuật' : 'Technical Details'}</div>
              <div style={{ fontSize: 12, lineHeight: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.text3 }}>{vi ? 'Định dạng' : 'Format'}</span><strong>{activeFormat?.label || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.text3 }}>{vi ? 'Tam giác' : 'Triangles'}</span><strong>{modelStats ? modelStats.triangles.toLocaleString() : (activeModelUrl ? (vi ? 'Đang tính...' : 'Calculating...') : '—')}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.text3 }}>{vi ? 'Vật liệu' : 'Materials'}</span><strong>{modelStats ? modelStats.materials : '—'}</strong></div>
              </div>

              <div className="osa-label" style={{ margin: '12px 0 6px' }}>{vi ? 'Giấy phép' : 'License'}</div>
              <div style={{ fontSize: 12, lineHeight: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.text3 }}>{vi ? 'Dự án' : 'Project'}</span><strong>{selectedAvatar?.collectionName || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.text3 }}>{vi ? 'Giấy phép' : 'License'}</span><strong>{selectedAvatar?.license || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.text3 }}>{vi ? 'Tác giả' : 'Author'}</span><strong>{selectedAvatar?.author || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.text3 }}>{vi ? 'Đối tượng dùng' : 'Allowed Users'}</span><strong>{licenseUsageNote(selectedAvatar?.license, vi)}</strong></div>
              </div>

              {(metadata?.series || metadata?.number || nftAttributes.length > 0) && (
                <>
                  <div className="osa-label" style={{ margin: '12px 0 6px' }}>{vi ? 'Siêu dữ liệu' : 'Metadata'}</div>
                  <div style={{ fontSize: 12, lineHeight: 1.9 }}>
                    {metadata?.series && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: palette.text3 }}>Series</span><strong>{metadata.series}{metadata.number ? ` · #${metadata.number}` : ''}</strong></div>}
                    {nftAttributes.map((attr, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: palette.text3 }}>{attr.trait_type}</span><strong>{attr.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <a href={selectedAvatarFinderUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, color: palette.accent, fontSize: 11, fontWeight: 800, textDecoration: 'none' }}>
                {vi ? 'Mở trong Finder' : 'Open in Finder'} <ExternalLink size={11} />
              </a>

              <button type="button" onClick={handleUseAvatar} disabled={!selectedAvatar || saving} style={{ marginTop: 12, width: '100%', border: 'none', borderRadius: 12, padding: '11px 14px', cursor: saving ? 'wait' : 'pointer', fontWeight: 900, fontSize: 12, color: '#001018', background: 'linear-gradient(135deg,#00e5ff,#00e676)' }}>
                {saving ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Dùng làm avatar hồ sơ' : 'Use as profile avatar')}
              </button>
              {saveNote && <div style={{ marginTop: 6, color: '#00b874', fontSize: 11, fontWeight: 800 }}>{saveNote}</div>}
            </div>

            {/* ============ Column 3: 3D render frame ============ */}
            <div className="osa-viewer-col osa-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: `1px solid ${palette.border}`, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => setShowInfoOverlay((v) => !v)} style={iconBtnStyle(showInfoOverlay)} title={vi ? 'Hiện thông tin' : 'Toggle info'}><Info size={15} /></button>
                  <button type="button" onClick={handleShare} style={iconBtnStyle(false)} title={vi ? 'Copy link' : 'Share'}><Share2 size={15} /></button>
                  <button type="button" onClick={() => setShowMeasureGrid((v) => !v)} style={iconBtnStyle(showMeasureGrid)} title={vi ? 'Lưới đo' : 'Measurement grid'}><Ruler size={15} /></button>
                  <button type="button" onClick={() => setAutoRotate((v) => !v)} style={iconBtnStyle(autoRotate)} title={vi ? 'Tự xoay' : 'Auto-rotate'}>{autoRotate ? <Pause size={15} /> : <Play size={15} />}</button>
                </div>
                <span style={{ padding: '4px 8px', borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)', color: palette.text2, fontSize: 10, fontWeight: 900 }}>
                  {shareStatus || 'VRM Inspector'}
                </span>
              </div>

              <div style={{ position: 'relative', minHeight: 420, background: isDark ? 'linear-gradient(180deg,#0b1220,#050816)' : 'linear-gradient(180deg,#f4f0e8,#e8e1d7)' }}>
                {showInfoOverlay && selectedAvatar && (
                  <div style={{ position: 'absolute', zIndex: 3, top: 10, left: 10, padding: '6px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 800, maxWidth: 220 }}>
                    {selectedAvatar.name} · {activeFormat?.label || selectedAvatar.format}
                  </div>
                )}
                {activeModelUrl ? (
                  <div style={{ width: '100%', height: 420 }}>
                    <AnimatedAvatarViewer
                      modelUrl={activeModelUrl}
                      modelKind={activeModelKind}
                      animationBlobUrl={animationBlobUrl}
                      animationLabel={selectedAnimation}
                      isDark={isDark}
                      autoRotate={autoRotate}
                      showGrid={showMeasureGrid}
                      onStatusChange={(update) => {
                        if (update.error) {
                          setAnimationLoadStatus(vi ? `Lỗi: ${update.error}` : `Error: ${update.error}`)
                        } else if (update.stats) {
                          setModelStats(update.stats)
                        } else if (typeof update.trackCount === 'number') {
                          setAnimationLoadStatus(vi
                            ? `${selectedAnimation} đã tải xong · ${update.trackCount} tracks`
                            : `${selectedAnimation} loaded · ${update.trackCount} tracks`)
                        } else if (update.timedOut) {
                          setAnimationLoadStatus(vi ? 'Đã ép tắt loading (safety timeout)' : 'Loading indicator forced off (safety timeout)')
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ height: 420, display: 'grid', placeItems: 'center' }}>
                    {selectedAvatar?.thumbnail_url
                      ? <img src={selectedAvatar.thumbnail_url} alt={selectedAvatar.name} style={{ maxHeight: '80%', borderRadius: 16 }} />
                      : <span style={{ fontSize: 72 }}>🧑‍🚀</span>}
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 14px', borderTop: `1px solid ${palette.border}` }}>
                <div className="osa-label" style={{ marginBottom: 8 }}>{vi ? 'Định dạng' : 'Format'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {formatOptions.length ? formatOptions.map((option) => (
                    <button key={option.key} type="button" onClick={() => setSelectedFormatKey(option.key)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${option.key === (activeFormat?.key) ? palette.accent : palette.border}`, background: option.key === (activeFormat?.key) ? 'rgba(0,184,204,0.14)' : palette.card, color: palette.text, fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                      {option.label}
                    </button>
                  )) : <span style={{ color: palette.text3, fontSize: 12 }}>{vi ? 'Không có file model.' : 'No model file available.'}</span>}
                </div>
                <a
                  href={activeModelUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                  download
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', borderRadius: 12, padding: '11px 14px',
                    fontWeight: 900, fontSize: 13, textDecoration: 'none',
                    color: activeModelUrl ? '#001018' : palette.text3,
                    background: activeModelUrl ? 'linear-gradient(135deg,#00e5ff,#9c6fff)' : palette.card,
                    border: activeModelUrl ? 'none' : `1px solid ${palette.border}`,
                    pointerEvents: activeModelUrl ? 'auto' : 'none',
                  }}
                >
                  <Download size={15} /> {vi ? 'Tải xuống' : 'Download'}
                </a>
              </div>

              <p style={{ padding: '0 14px 14px', color: error ? '#ff6b6b' : palette.text3, fontSize: 11, lineHeight: 1.5, margin: 0 }}>{error || status}</p>
            </div>

            {/* ============ Column 4: Animations ============ */}
            <div className="osa-anim-col osa-card" style={{ padding: 14 }}>
              <div className="osa-label" style={{ marginBottom: 4 }}>{vi ? 'Hoạt ảnh' : 'Animations'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Sparkles size={12} style={{ color: palette.accent }} />
                <span style={{ fontSize: 11, color: palette.text3 }}>{selectedAnimation}</span>
              </div>
              <div className="osa-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 480, overflowY: 'auto' }}>
                {ANIMATION_PRESETS.map((animation) => {
                  const active = selectedAnimation === animation
                  return (
                    <button key={animation} type="button" onClick={() => loadAnimationFile(animation)} style={{ textAlign: 'left', border: `1px solid ${active ? palette.accent : 'transparent'}`, borderLeft: active ? `3px solid ${palette.accent}` : '3px solid transparent', background: active ? (isDark ? 'rgba(0,184,204,0.14)' : '#fff') : 'transparent', color: palette.text, borderRadius: 8, padding: '9px 8px', cursor: 'pointer', fontSize: 12, fontWeight: active ? 900 : 600 }}>
                      {animation}
                    </button>
                  )
                })}
              </div>
              {animationLoadStatus && (
                <div style={{ marginTop: 10, padding: '8px 9px', borderRadius: 8, background: isDark ? 'rgba(0,229,255,0.10)' : 'rgba(0,184,204,0.10)', color: palette.accent, fontSize: 11, fontWeight: 800, lineHeight: 1.35 }}>
                  {animationLoadStatus}
                </div>
              )}
              <div style={{ marginTop: 10, color: palette.text3, fontSize: 10, lineHeight: 1.45 }}>
                {vi
                  ? 'Fetch file .fbx thật từ opensourceavatars.com, parse bằng THREE.FBXLoader, phát trên skeleton qua THREE.AnimationMixer.'
                  : 'Fetches the real .fbx from opensourceavatars.com, parses it with THREE.FBXLoader, and plays it via a genuine THREE.AnimationMixer.'}
              </div>
            </div>

          </div>

          {/* ============ Full-width 3D preview, below the whole grid ============ */}
          <div className="osa-card" style={{ marginTop: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${palette.border}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.01em', color: palette.text }}>
                    {vi ? 'Trình xem 3D & Animation' : '3D & Animation Viewer'}
                  </div>
                  <div style={{ fontSize: 12, color: palette.text3, marginTop: 2 }}>
                    opensourceavatars.com/finder
                  </div>
                </div>
                <a
                  href={selectedAvatarFinderUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: palette.accent, fontSize: 13, fontWeight: 900, textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  {vi ? 'Mở 3D' : 'Open 3D'} <ExternalLink size={14} />
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                {selectedAvatar ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: palette.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedAvatar.name} · {activeFormat?.label || selectedAvatar.format} · {selectedAnimation}
                  </span>
                ) : <span />}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => setShowMeasureGrid((v) => !v)} style={iconBtnStyle(showMeasureGrid)} title={vi ? 'Lưới đo' : 'Measurement grid'}><Ruler size={15} /></button>
                  <button type="button" onClick={() => setAutoRotate((v) => !v)} style={iconBtnStyle(autoRotate)} title={vi ? 'Tự xoay' : 'Auto-rotate'}>{autoRotate ? <Pause size={15} /> : <Play size={15} />}</button>
                  <button type="button" onClick={handleShare} style={iconBtnStyle(false)} title={vi ? 'Copy link' : 'Share'}><Share2 size={15} /></button>
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', height: 620, background: isDark ? 'radial-gradient(120% 90% at 50% 20%, #142032 0%, #050816 72%)' : 'linear-gradient(180deg,#f4f0e8,#e8e1d7)' }}>
              {activeModelUrl ? (
                <AnimatedAvatarViewer
                  modelUrl={activeModelUrl}
                  modelKind={activeModelKind}
                  animationBlobUrl={animationBlobUrl}
                  animationLabel={selectedAnimation}
                  isDark={isDark}
                  autoRotate={autoRotate}
                  showGrid={showMeasureGrid}
                  showDragHint
                  onStatusChange={(update) => {
                    if (update.error) {
                      setAnimationLoadStatus(vi ? `Lỗi: ${update.error}` : `Error: ${update.error}`)
                    } else if (update.stats) {
                      setModelStats(update.stats)
                    } else if (typeof update.trackCount === 'number') {
                      setAnimationLoadStatus(vi
                        ? `${selectedAnimation} đã tải xong · ${update.trackCount} tracks`
                        : `${selectedAnimation} loaded · ${update.trackCount} tracks`)
                    } else if (update.timedOut) {
                      setAnimationLoadStatus(vi ? 'Đã ép tắt loading (safety timeout)' : 'Loading indicator forced off (safety timeout)')
                    }
                  }}
                />
              ) : (
                <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
                  {selectedAvatar?.thumbnail_url
                    ? <img src={selectedAvatar.thumbnail_url} alt={selectedAvatar.name} style={{ maxHeight: '70%', borderRadius: 16 }} />
                    : <span style={{ fontSize: 96 }}>🧑‍🚀</span>}
                </div>
              )}
            </div>

            <div style={{ padding: '10px 16px', borderTop: `1px solid ${palette.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ color: palette.text3, fontSize: 11 }}>
                {vi
                  ? 'Render 3D nội bộ bằng THREE.js/WebGL (canvas thật, không dùng iframe) nên không dính lỗi CSP frame-ancestors của trang nguồn. Kéo để xoay.'
                  : 'Rendered internally with THREE.js/WebGL (a real canvas, no iframe), so it never hits the source site\'s CSP frame-ancestors restriction. Drag to rotate.'}
              </span>
              {modelStats && (
                <span style={{ color: palette.text3, fontSize: 11, fontWeight: 800 }}>
                  {modelStats.vertices ? `${modelStats.vertices.toLocaleString()} ${vi ? 'đỉnh' : 'verts'}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* ============ "Khung render 3D" — genuine <model-viewer> web component ============ */}
          {/* No <iframe> anywhere: this is Google's model-viewer custom element, which owns
              its own WebGL canvas, so it can never trigger the source site's CSP
              frame-ancestors restriction. Its built-in `interaction-prompt` is the
              hand/finger drag hint (slides + fades) shown until the user first drags. */}
          <div className="osa-card" style={{ marginTop: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 14px', borderBottom: `1px solid ${palette.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.01em', color: palette.text }}>
                  {vi ? 'Khung render 3D' : '3D Render Frame'}
                </div>
                <div style={{ fontSize: 12, color: palette.text3, marginTop: 2 }}>
                  opensourceavatars.com/finder
                </div>
              </div>
              <a
                href={selectedAvatarFinderUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: palette.accent, fontSize: 13, fontWeight: 900, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                {vi ? 'Mở 3D' : 'Open 3D'} <ExternalLink size={14} />
              </a>
            </div>

            <div style={{ position: 'relative', height: 560, overflow: 'hidden', background: isDark ? 'radial-gradient(circle at 50% 24%, rgba(0,229,255,0.16), transparent 42%), linear-gradient(180deg,#0b1220,#050816)' : 'radial-gradient(circle at 50% 24%, rgba(0,184,204,0.14), transparent 44%), linear-gradient(180deg,#f4f0e8,#e8e1d7)' }}>
              {/* Decorative ground ring + light beam, matching opensourceavatars.com's viewer chrome */}
              <div style={{ position: 'absolute', left: '50%', bottom: 46, width: '62%', maxWidth: 420, height: 92, transform: 'translateX(-50%) perspective(420px) rotateX(66deg)', borderRadius: '50%', border: `1px solid ${isDark ? 'rgba(148,163,184,0.28)' : 'rgba(71,85,105,0.22)'}`, background: isDark ? 'repeating-radial-gradient(circle, rgba(148,163,184,0.22) 0 1px, transparent 1px 26px)' : 'repeating-radial-gradient(circle, rgba(71,85,105,0.2) 0 1px, transparent 1px 26px)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: '50%', bottom: 70, width: 2, height: 320, transform: 'translateX(-50%)', background: isDark ? 'linear-gradient(transparent,rgba(0,229,255,0.32),transparent)' : 'linear-gradient(transparent,rgba(0,184,204,0.28),transparent)', pointerEvents: 'none' }} />

              {modelViewerModelUrl ? (
                <model-viewer
                  ref={modelViewerRef}
                  src={modelViewerModelUrl}
                  alt={selectedAvatar ? `${selectedAvatar.name} VRM model` : 'Selected avatar VRM model'}
                  camera-controls="true"
                  auto-rotate="true"
                  interaction-prompt="none"
                  exposure="1"
                  shadow-intensity="0.7"
                  style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'block', background: 'transparent' }}
                />
              ) : (
                <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'grid', placeItems: 'center' }}>
                  {selectedAvatar?.thumbnail_url
                    ? <img src={selectedAvatar.thumbnail_url} alt={selectedAvatar.name} style={{ maxHeight: '60%', borderRadius: 16 }} />
                    : <span style={{ fontSize: 88 }}>🧑‍🚀</span>}
                </div>
              )}

              {/* Virtual finger drag demo — plays once per freshly loaded model.
                  The finger's left/right glide is mirrored 1:1 by cameraOrbit
                  set in the effect above, so the avatar visibly turns with it. */}
              {modelViewerModelUrl && showModelViewerHint && (
                <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
                  <style>{`
                    @keyframes osaFingerPulse {
                      0%   { transform: scale(0.85); opacity: 0.55; }
                      70%  { transform: scale(1.4); opacity: 0; }
                      100% { transform: scale(1.4); opacity: 0; }
                    }
                    @keyframes osaHintFade {
                      0%   { opacity: 0; }
                      12%  { opacity: 1; }
                      88%  { opacity: 1; }
                      100% { opacity: 0; }
                    }
                  `}</style>
                  <div key={demoCycle} style={{ position: 'absolute', inset: 0, animation: 'osaHintFade 2.4s ease-in-out 1' }}>
                    <div style={{ position: 'absolute', top: '58%', left: `${fingerRatio * 100}%`, transform: 'translate(-50%, -50%)' }}>
                      <span style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,229,255,0.35)', animation: 'osaFingerPulse 1.4s ease-out infinite' }} />
                        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', background: 'rgba(20,26,38,0.85)', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }}>
                          <Pointer size={17} color="#ffffff" strokeWidth={2.25} />
                        </span>
                      </span>
                    </div>
                    <div style={{ position: 'absolute', left: '50%', bottom: 26, transform: 'translateX(-50%)', padding: '6px 12px', borderRadius: 999, background: 'rgba(15,23,42,0.62)', color: '#fff', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {vi ? 'Kéo để xoay mô hình' : 'Drag to rotate'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '10px 16px', borderTop: `1px solid ${palette.border}` }}>
              <span style={{ color: palette.text3, fontSize: 11, lineHeight: 1.5 }}>
                {modelViewerModelUrl
                  ? (vi
                    ? 'Render 3D nội bộ bằng model-viewer, không dùng iframe nên tránh lỗi CSP frame-ancestors.'
                    : 'Rendered locally with model-viewer — no iframe, so it avoids the source site\'s CSP frame-ancestors errors.')
                  : (activeModelKind === 'fbx'
                    ? (vi ? 'Định dạng FBX đang chọn không được model-viewer hỗ trợ trực tiếp — chọn định dạng VRM ở trên để xem tại đây.' : 'model-viewer can\'t load the selected FBX format directly — pick the VRM format above to preview it here.')
                    : (vi ? 'Avatar này chưa có model URL, đang hiển thị ảnh preview.' : 'This avatar has no model URL yet, so a static preview image is shown.'))}
                {' '}
                {vi
                  ? 'Animation Mixamo đã retarget nằm ở khung "Trình xem 3D & Animation" phía trên.'
                  : 'The retargeted Mixamo animations live in the "3D & Animation Viewer" panel above.'}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
