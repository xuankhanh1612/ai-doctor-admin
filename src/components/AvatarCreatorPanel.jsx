import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const REGISTRY_BASE = 'https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data'
const PROJECTS_URL = `${REGISTRY_BASE}/projects.json`
const MAX_COLLECTIONS_TO_LOAD = 3
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

export default function AvatarCreatorPanel() {
  const { user, updateProfile } = useAuth()
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const vi = lang === 'vi'

  const [projects, setProjects] = useState([])
  const [avatars, setAvatars] = useState([])
  const [selectedCollection, setSelectedCollection] = useState('all')
  const [selectedAvatar, setSelectedAvatar] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(vi ? 'Đang tải registry avatar mã nguồn mở...' : 'Loading open-source avatar registry...')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadRegistry() {
      setStatus(vi ? 'Đang tải registry avatar mã nguồn mở...' : 'Loading open-source avatar registry...')
      setError('')
      try {
        const registryProjects = await fetchJson(PROJECTS_URL)
        const publicProjects = registryProjects.filter(project => project?.is_public !== false)
        const loadedGroups = await Promise.all(
          publicProjects.slice(0, MAX_COLLECTIONS_TO_LOAD).map(async project => {
            const dataFile = project.avatar_data_file || project.avatarDataFile
            if (!dataFile) return []
            const data = await fetchJson(`${REGISTRY_BASE}/${dataFile}`)
            const list = Array.isArray(data) ? data : (Array.isArray(data?.avatars) ? data.avatars : [])
            return list.map(item => normalizeAvatar(item, project)).filter(item => item.thumbnail_url || item.model_file_url)
          })
        )
        if (cancelled) return
        const nextAvatars = loadedGroups.flat()
        setProjects(publicProjects)
        setAvatars(nextAvatars.length ? nextAvatars : FALLBACK_AVATARS)
        setSelectedAvatar(nextAvatars[0] || FALLBACK_AVATARS[0])
        setStatus(nextAvatars.length
          ? (vi ? `Đã tải ${nextAvatars.length} avatar từ Open Source Avatars.` : `Loaded ${nextAvatars.length} avatars from Open Source Avatars.`)
          : (vi ? 'Dùng avatar dự phòng vì registry chưa có ảnh xem trước.' : 'Using fallback avatars because the registry has no preview images.'))
      } catch (err) {
        if (cancelled) return
        setProjects([])
        setAvatars(FALLBACK_AVATARS)
        setSelectedAvatar(FALLBACK_AVATARS[0])
        setError(vi ? `Không tải được registry: ${err.message}` : `Could not load registry: ${err.message}`)
        setStatus(vi ? 'Bạn vẫn có thể dùng avatar dự phòng để cập nhật hồ sơ.' : 'You can still use a fallback avatar to update your profile.')
      }
    }
    loadRegistry()
    return () => { cancelled = true }
  }, [vi])

  const filteredAvatars = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return avatars.filter(avatar => {
      const matchesCollection = selectedCollection === 'all' || avatar.collectionId === selectedCollection
      const matchesQuery = !normalizedQuery || `${avatar.name} ${avatar.collectionName} ${avatar.license}`.toLowerCase().includes(normalizedQuery)
      return matchesCollection && matchesQuery
    })
  }, [avatars, query, selectedCollection])

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
                  ? 'Chọn avatar VRM/3D từ registry ToxSam/open-source-avatars, xem license và lưu ảnh preview làm avatar hồ sơ của user.'
                  : 'Pick a VRM/3D avatar from the ToxSam/open-source-avatars registry, review the license, and save its preview as the user profile avatar.'}
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
            <p style={{ color: error ? '#ff6b6b' : palette.text3, fontSize: 12, lineHeight: 1.5, margin: '12px 0 0' }}>{error || status}</p>
          </aside>

          <main>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 1fr)', gap: 10, marginBottom: 14 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder={vi ? 'Tìm avatar, license, collection...' : 'Search avatar, license, collection...'} style={{ border: `1px solid ${palette.border}`, background: palette.card, color: palette.text, borderRadius: 12, padding: '11px 12px', fontFamily: 'inherit' }} />
              <select value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)} style={{ border: `1px solid ${palette.border}`, background: palette.card, color: palette.text, borderRadius: 12, padding: '11px 12px', fontFamily: 'inherit' }}>
                <option value="all">{vi ? 'Tất cả collection đã tải' : 'All loaded collections'}</option>
                {projects.slice(0, MAX_COLLECTIONS_TO_LOAD).map(project => <option key={project.id} value={project.id}>{project.name} · {project.license}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(154px, 1fr))', gap: 12 }}>
              {filteredAvatars.map(avatar => {
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
