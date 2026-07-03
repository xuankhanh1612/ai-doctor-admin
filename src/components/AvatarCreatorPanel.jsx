import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const REGISTRY_BASE = 'https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data'
const PROJECTS_URL = `${REGISTRY_BASE}/projects.json`
const PAGE_SIZE_OPTIONS = [8, 16, 32]
const FALLBACK_AVATARS = [
  {
    id: 'fallback-health-01',
    name: 'Health Explorer',
    collectionName: 'Local fallback',
    license: 'Generated preview',
    thumbnail_url: 'https://ui-avatars.com/api/?name=Health+Explorer&background=00b8cc&color=fff&size=512&bold=true&rounded=true',
    model_file_url: '',
  },
  {
    id: 'fallback-vrm-02',
    name: 'VRM Pilot',
    collectionName: 'Local fallback',
    license: 'Generated preview',
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
    collectionId: project?.id || '',
    collectionName: project?.name || 'Open Source Avatars',
    license: project?.license || item?.license || 'Open license',
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
  const [status, setStatus] = useState(vi ? 'Đang tải danh sách chủ đề avatar...' : 'Loading avatar themes...')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadProjects() {
      setStatus(vi ? 'Đang tải danh sách chủ đề avatar từ projects.json...' : 'Loading avatar themes from projects.json...')
      setError('')
      try {
        const registryProjects = await fetchJson(PROJECTS_URL)
        const publicProjects = registryProjects.filter(project => project?.is_public !== false && (project.avatar_data_file || project.avatarDataFile))
        if (cancelled) return
        setProjects(publicProjects)
        setSelectedCollection(current => current || publicProjects[0]?.id || '')
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

  useEffect(() => {
    const selectedProject = projects.find(project => project.id === selectedCollection)
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
        const nextAvatars = list.map(item => normalizeAvatar(item, selectedProject)).filter(item => item.thumbnail_url || item.model_file_url)
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
    return avatars.filter(avatar => !normalizedQuery || `${avatar.name} ${avatar.collectionName} ${avatar.license}`.toLowerCase().includes(normalizedQuery))
  }, [avatars, query])

  useEffect(() => { setCurrentPage(1) }, [query, pageSize, selectedCollection])

  const totalPages = Math.max(1, Math.ceil(filteredAvatars.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pagedAvatars = filteredAvatars.slice((safePage - 1) * pageSize, safePage * pageSize)

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
    window.setTimeout(() => setSaving(false), 350)
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
  }

  return (
    <div style={{ padding: 24, color: palette.text, maxWidth: 1180, margin: '0 auto' }}>
      <section style={{ border: `1px solid ${palette.border}`, borderRadius: 24, overflow: 'hidden', background: palette.card, boxShadow: isDark ? '0 18px 55px rgba(0,0,0,0.28)' : '0 18px 55px rgba(15,23,42,0.08)' }}>
        <div style={{ padding: 24, background: 'linear-gradient(135deg, rgba(0,229,255,0.16), rgba(156,111,255,0.18))', borderBottom: `1px solid ${palette.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#00b8cc', letterSpacing: '.12em', textTransform: 'uppercase' }}>Open Source Avatars</div>
              <h1 style={{ margin: '6px 0 8px', fontSize: 30, lineHeight: 1.12 }}>{vi ? 'Tạo avatar cho user' : 'Create user avatar'}</h1>
              <p style={{ margin: 0, color: palette.text2, maxWidth: 720, lineHeight: 1.6 }}>
                {vi
                  ? 'Chọn chủ đề avatar từ projects.json của ToxSam/open-source-avatars, phân trang danh sách và lưu ảnh preview làm avatar hồ sơ của user.'
                  : 'Choose an avatar theme from ToxSam/open-source-avatars projects.json, paginate the list, and save its preview as the user profile avatar.'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 250 }}>
              <img src={user?.avatar || selectedAvatar?.thumbnail_url || FALLBACK_AVATARS[0].thumbnail_url} alt="Current user avatar" style={{ width: 72, height: 72, borderRadius: 22, objectFit: 'cover', border: '3px solid rgba(0,184,204,0.55)' }} />
              <div>
                <div style={{ fontWeight: 900 }}>{user?.name || (vi ? 'Người dùng' : 'User')}</div>
                <div style={{ color: palette.text3, fontSize: 12 }}>{user?.email || user?.uuid || 'guest'}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 18 }}>
          <aside style={{ border: `1px solid ${palette.border}`, borderRadius: 20, padding: 16, background: palette.card2, alignSelf: 'start' }}>
            <div style={{ aspectRatio: '1 / 1', borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg,#0f172a,#312e81)', border: `1px solid ${palette.border}`, display: 'grid', placeItems: 'center' }}>
              {selectedAvatar?.thumbnail_url
                ? <img src={selectedAvatar.thumbnail_url} alt={selectedAvatar.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 64 }}>🧑‍🚀</span>}
            </div>
            <h2 style={{ margin: '14px 0 4px', fontSize: 22 }}>{selectedAvatar?.name || (vi ? 'Chọn avatar' : 'Select an avatar')}</h2>
            <div style={{ color: palette.text2, fontSize: 13, lineHeight: 1.5 }}>
              {selectedAvatar?.collectionName} · {selectedAvatar?.license}
            </div>
            {selectedAvatar?.model_file_url && (
              <a href={selectedAvatar.model_file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginTop: 10, color: '#00b8cc', fontSize: 12, fontWeight: 800 }}>
                {vi ? 'Mở file VRM gốc ↗' : 'Open source VRM ↗'}
              </a>
            )}
            <button type="button" onClick={handleUseAvatar} disabled={!selectedAvatar || saving} style={{ marginTop: 16, width: '100%', border: 'none', borderRadius: 14, padding: '12px 14px', cursor: saving ? 'wait' : 'pointer', fontWeight: 900, color: '#001018', background: 'linear-gradient(135deg,#00e5ff,#00e676)' }}>
              {saving ? (vi ? 'Đang lưu...' : 'Saving...') : (vi ? 'Dùng làm avatar hồ sơ' : 'Use as profile avatar')}
            </button>

            <div style={{ marginTop: 16, border: `1px solid ${palette.border}`, borderRadius: 18, overflow: 'hidden', background: isDark ? '#070b16' : '#f8fafc' }}>
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottom: `1px solid ${palette.border}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900 }}>{vi ? 'Khung render 3D' : '3D render frame'}</div>
                  <div style={{ fontSize: 10, color: palette.text3, marginTop: 2 }}>opensourceavatars.com/finder</div>
                </div>
                <a href={selectedAvatarFinderUrl} target="_blank" rel="noreferrer" style={{ color: '#00b8cc', fontSize: 11, fontWeight: 900, textDecoration: 'none' }}>
                  {vi ? 'Mở 3D ↗' : 'Open 3D ↗'}
                </a>
              </div>
              <div style={{ position: 'relative', minHeight: 260, background: isDark ? 'radial-gradient(circle at 50% 25%, rgba(0,229,255,0.14), transparent 42%), linear-gradient(180deg,#0b1220,#050816)' : 'linear-gradient(180deg,#f8fafc,#e5e7eb)' }}>
                <iframe
                  title={selectedAvatar ? `${selectedAvatar.name} 3D preview` : 'Open Source Avatars 3D preview'}
                  src={selectedAvatarFinderUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: 260, border: 0, display: 'block', background: 'transparent' }}
                />
              </div>
              <div style={{ padding: '9px 12px', color: palette.text3, fontSize: 11, lineHeight: 1.45 }}>
                {vi
                  ? 'Nếu trình duyệt chặn iframe, bấm “Mở 3D” để xem model VRM trên trang Finder giống mẫu.'
                  : 'If the browser blocks the iframe, click “Open 3D” to inspect the VRM model on the Finder page.'}
              </div>
            </div>

            <p style={{ color: error ? '#ff6b6b' : palette.text3, fontSize: 12, lineHeight: 1.5, margin: '12px 0 0' }}>{error || status}</p>
          </aside>

          <main>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 1fr) minmax(130px, 160px)', gap: 10, marginBottom: 14 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={vi ? 'Tìm avatar, license...' : 'Search avatar, license...'} style={{ border: `1px solid ${palette.border}`, background: palette.card, color: palette.text, borderRadius: 12, padding: '11px 12px', fontFamily: 'inherit' }} />
              <select value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)} style={{ border: `1px solid ${palette.border}`, background: palette.card, color: palette.text, borderRadius: 12, padding: '11px 12px', fontFamily: 'inherit' }}>
                {projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project.license}</option>)}
                {!projects.length && <option value="">{vi ? 'Avatar dự phòng' : 'Fallback avatars'}</option>}
              </select>
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} style={{ border: `1px solid ${palette.border}`, background: palette.card, color: palette.text, borderRadius: 12, padding: '11px 12px', fontFamily: 'inherit' }} aria-label={vi ? 'Số avatar mỗi trang' : 'Avatars per page'}>
                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} / {vi ? 'trang' : 'page'}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, color: palette.text3, fontSize: 12, flexWrap: 'wrap' }}>
              <span>{vi ? `Hiển thị ${pagedAvatars.length}/${filteredAvatars.length} avatar` : `Showing ${pagedAvatars.length}/${filteredAvatars.length} avatars`}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={safePage <= 1} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: '7px 10px', background: palette.card, color: safePage <= 1 ? palette.text3 : palette.text, cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>‹</button>
                <span>{vi ? 'Trang' : 'Page'} {safePage}/{totalPages}</span>
                <button type="button" onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={safePage >= totalPages} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: '7px 10px', background: palette.card, color: safePage >= totalPages ? palette.text3 : palette.text, cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>›</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(154px, 1fr))', gap: 12 }}>
              {pagedAvatars.map(avatar => {
                const active = selectedAvatar?.id === avatar.id
                return (
                  <button key={`${avatar.collectionId}-${avatar.id}`} type="button" onClick={() => setSelectedAvatar(avatar)} style={{ textAlign: 'left', border: `1px solid ${active ? '#00e5ff' : palette.border}`, borderRadius: 18, overflow: 'hidden', padding: 0, background: active ? 'rgba(0,229,255,0.12)' : palette.card, color: palette.text, cursor: 'pointer', boxShadow: active ? '0 0 0 3px rgba(0,229,255,0.12)' : 'none' }}>
                    <div style={{ aspectRatio: '1 / 1', background: 'rgba(0,0,0,0.08)', display: 'grid', placeItems: 'center' }}>
                      {avatar.thumbnail_url ? <img src={avatar.thumbnail_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 42 }}>🧑‍🚀</span>}
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{avatar.name}</div>
                      <div style={{ color: palette.text3, fontSize: 11, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{avatar.collectionName}</div>
                      <div style={{ color: '#00b8cc', fontSize: 10, fontWeight: 900, marginTop: 6 }}>{avatar.license}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </main>
        </div>
      </section>
    </div>
  )
}
