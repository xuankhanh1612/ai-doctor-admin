// src/components/RSSPortalPanel.jsx
// Healthy RSS Portal — Trung tâm video sức khỏe tổng hợp từ Facebook, TikTok, YouTube
// và các kênh yêu thích. Giao diện được thiết kế theo layout "4 cạnh + video trung tâm"
// mô tả trong tài liệu nghiên cứu RSS Portal (deep-research-RSS-Portal.md).
//
// NOTE: Đây là bản demo với dữ liệu mock (chưa nối YouTube Data API / Facebook Graph API /
// TikTok Display API thật — xem tài liệu nghiên cứu để biết hướng tích hợp backend).

import React, { useState, useRef, useCallback, useEffect } from 'react'
import NavButtons from './NavButtons.jsx'

// ─── Mock data (chủ đề sức khỏe, tiếng Việt) ───────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#0ea5e9,#2563eb)',
  'linear-gradient(135deg,#f97316,#dc2626)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#a855f7,#6d28d9)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#eab308,#ca8a04)',
  'linear-gradient(135deg,#14b8a6,#0f766e)',
  'linear-gradient(135deg,#64748b,#334155)',
]

// Real Facebook video (Reel) embedded via Facebook's public Video Plugin —
// no API key / app review needed, works for any public video or reel URL.
const FB_REEL_URL = 'https://www.facebook.com/reel/809720335534900'
const FB_REEL_EMBED = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(FB_REEL_URL)}&show_text=false`

// AIPunkstudio — nhúng cả danh sách video/reels công khai của trang (không chỉ 1 video)
// bằng Facebook Page Plugin (plugins/page.php, tabs=timeline). Không cần App ID / SDK,
// dùng chung kỹ thuật iframe trực tiếp như FB_REEL_EMBED ở trên.
const FB_AIPUNK_REELS_URL = 'https://www.facebook.com/AIPunkstudio/reels/'
const FB_AIPUNK_PAGE_URL = 'https://www.facebook.com/AIPunkstudio'
const FB_AIPUNK_EMBED = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FB_AIPUNK_PAGE_URL)}&tabs=timeline&width=360&height=700&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false`

const FACEBOOK_ITEMS = [
  { id: 'fb_aipunk', icon: '🎬', title: 'AIPunkstudio · Danh sách Reels', duration: '', time: 'Trang thật · danh sách video', url: FB_AIPUNK_REELS_URL, embedUrl: FB_AIPUNK_EMBED, aspectRatio: '9/16' },
  { id: 'fb0', icon: '🎬', title: 'Video Facebook Reel', duration: '', time: 'Mới · reel thật', url: FB_REEL_URL, embedUrl: FB_REEL_EMBED, aspectRatio: '9/16' },
  { id: 'fb1', icon: '💧', title: '5 dấu hiệu cơ thể đang thiếu nước', duration: '04:35', time: '2 giờ trước' },
  { id: 'fb2', icon: '🥤', title: 'Công thức nước ép detox giảm cân', duration: '06:12', time: '5 giờ trước' },
  { id: 'fb3', icon: '🩺', title: 'Bài học từ một bệnh nhân tiểu đường', duration: '08:47', time: '1 ngày trước' },
  { id: 'fb4', icon: '🍽️', title: 'Thực đơn giảm cân 7 ngày khoa học', duration: '05:33', time: '1 ngày trước' },
  { id: 'fb5', icon: '🧘', title: 'Yoga thư giãn buổi tối trước khi ngủ', duration: '07:21', time: '2 ngày trước' },
  { id: 'fb6', icon: '🏃', title: 'Bài tập giảm mỡ bụng tại nhà', duration: '06:05', time: '2 ngày trước' },
  { id: 'fb7', icon: '💆', title: 'Massage giảm đau lưng đơn giản', duration: '04:18', time: '3 ngày trước' },
]

// xuankhanhsupertech — nhúng cả danh sách video của kênh bằng TikTok Creator Profile
// Embed chính thức (blockquote + embed.js, data-embed-type="creator"), không cần API key.
// Widget hiển thị tối đa 10 video gần nhất của kênh, xếp dọc theo đúng tỉ lệ 9:16 gốc của TikTok.
const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/@xuankhanhsupertech'

// Bộ sưu tập (collection) thật của @xuankhanhsupertech — "Trị Ung Thư với Xuân Khánh".
// TikTok chưa có API/oEmbed công khai để liệt kê từng video bên trong một collection cụ thể
// (Display API cần OAuth + app review), nên ta dùng chung TikTok Creator Profile Embed chính
// thức (đã dùng cho tt0) để hiển thị — đây là widget "danh sách video" thật duy nhất mà TikTok
// cho phép nhúng không cần API key. Đường link thật tới đúng collection vẫn được giữ lại
// (tiktokListUrl) để người dùng bấm sang xem trọn bộ sưu tập gốc trên TikTok.
const TIKTOK_COLLECTION_URL = 'https://www.tiktok.com/@xuankhanhsupertech/collection/Tr%E1%BB%8B%20Ung%20Th%C6%B0%20v%E1%BB%9Bi%20Xu%C3%A2n%20Kh%C3%A1nh-7623472867921578773'
const TIKTOK_COLLECTION_TITLE = 'Bộ sưu tập: Trị Ung Thư với Xuân Khánh'

const TIKTOK_ITEMS = [
  { id: 'tt0', icon: '🎵', title: '@xuankhanhsupertech · Danh sách video', duration: '', likes: '', url: TIKTOK_PROFILE_URL, tiktokProfile: true },
  { id: 'tt_collection', icon: '🗂️', title: TIKTOK_COLLECTION_TITLE, duration: '', likes: '', url: TIKTOK_PROFILE_URL, tiktokListUrl: TIKTOK_COLLECTION_URL, tiktokProfile: true, isList: true },
  { id: 'tt1', icon: '🤒', title: 'Mẹo hạ sốt nhanh tại nhà', duration: '00:15', likes: '12.4K' },
  { id: 'tt2', icon: '🧼', title: 'Cách rửa tay đúng cách', duration: '00:21', likes: '8.7K' },
  { id: 'tt3', icon: '🧴', title: 'Skincare cho da nhạy cảm', duration: '00:18', likes: '15.3K' },
  { id: 'tt4', icon: '🤸', title: '5 phút thể dục buổi sáng', duration: '00:20', likes: '11.1K' },
  { id: 'tt5', icon: '🤱', title: 'Món ăn lợi sữa cho mẹ bỉm', duration: '00:17', likes: '9.8K' },
  { id: 'tt6', icon: '😮\u200d💨', title: 'Bài tập thở giảm căng thẳng', duration: '00:16', likes: '13.2K' },
  { id: 'tt7', icon: '🍵', title: 'Trà thảo mộc tốt cho gan', duration: '00:19', likes: '7.1K' },
  { id: 'tt8', icon: '😴', title: 'Ngủ đủ giấc - bí quyết khỏe mạnh', duration: '00:14', likes: '6.3K' },
].map(item => ({ ...item, aspectRatio: '9/16' }))

const ORGAN_STORY_PLAYLIST_ID = 'PLKAAOJr1Akjvvi6IjW3v-cpZhE7Y0bbJN'
// videoseries + list (no explicit video id) makes YouTube render its native playlist
// panel alongside the player, so people can see every video in the list and jump to
// any of them with one click — no extra API/backend needed.
const ORGAN_STORY_EMBED = `https://www.youtube.com/embed/videoseries?list=${ORGAN_STORY_PLAYLIST_ID}`

const FEATURED_PLAYLIST_ID = 'PLhPgpmsoyA4GrZ5mGrOPyf1wb1Ke1Zw8p'
const FEATURED_PLAYLIST_EMBED = `https://www.youtube.com/embed/videoseries?list=${FEATURED_PLAYLIST_ID}`

// ─── YouTube IFrame Player API loader (singleton, no API key needed) ───────
// We use the real IFrame Player API (not just a videoseries embed) so we can:
//  1) read the actual ordered list of video IDs in the playlist (getPlaylist())
//  2) jump to any of them on click (playVideoAt())
//  3) look up each video's real title via the public oEmbed endpoint (no key)
let ytApiPromise = null
function loadYouTubeIframeAPI() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    const prevCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevCallback === 'function') prevCallback()
      resolve(window.YT)
    }
    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api-script'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  })
  return ytApiPromise
}

// Public oEmbed endpoint — returns { title, author_name, thumbnail_url, ... }
// for any public YouTube video, no API key required.
async function fetchYouTubeTitle(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.title || null
  } catch {
    return null
  }
}

const YOUTUBE_ITEMS = [
  { id: 'yt0', icon: '▶', title: 'Playlist sức khỏe nổi bật', channel: 'YouTube Playlist', views: 'Playlist', time: 'youtube.com/watch?v=LHkE3loNxJ4', url: 'https://www.youtube.com/watch?v=LHkE3loNxJ4&list=PLhPgpmsoyA4GrZ5mGrOPyf1wb1Ke1Zw8p', embedUrl: FEATURED_PLAYLIST_EMBED, playlistId: FEATURED_PLAYLIST_ID },
  { id: 'yt1', icon: '🫀', title: 'The Organ Story - Khám phá cơ thể qua hoạt hình khoa học', channel: 'The Organ Story', views: 'Playlist chính thức', time: 'youtube.com/@TheOrganStory', url: 'https://www.youtube.com/@TheOrganStory', embedUrl: ORGAN_STORY_EMBED, playlistId: ORGAN_STORY_PLAYLIST_ID },
  { id: 'yt2', icon: '🥗', title: '7 ngày detox cùng chuyên gia dinh dưỡng', channel: 'Dinh Dưỡng Việt', views: '860K lượt xem', time: '2 ngày trước' },
  { id: 'yt3', icon: '❤️', title: 'Hướng dẫn đo huyết áp tại nhà đúng chuẩn', channel: 'Sức Khỏe TV', views: '560K lượt xem', time: '3 ngày trước' },
  { id: 'yt4', icon: '🍚', title: 'Chế độ ăn cho người tiểu đường', channel: 'BS. Gia Hân', views: '720K lượt xem', time: '4 ngày trước' },
  { id: 'yt5', icon: '🌙', title: 'Cách ngủ ngon không cần thuốc', channel: 'Sleep Well VN', views: '410K lượt xem', time: '5 ngày trước' },
  { id: 'yt6', icon: '⚖️', title: 'Review máy đo InBody 2024', channel: 'Fitness Review', views: '930K lượt xem', time: '6 ngày trước' },
  { id: 'yt7', icon: '🧘\u200d♀️', title: '10 bài tập yoga giảm đau lưng', channel: 'Yoga Cùng Mai', views: '1.5M lượt xem', time: '1 tuần trước' },
]

const FAVORITE_CHANNELS = [
  { id: 'ch1', icon: '🫀', name: 'The Organ Story', subs: 'Kênh chính thức', url: 'https://www.youtube.com/@TheOrganStory',
    title: 'The Organ Story - Khám phá cơ thể qua hoạt hình khoa học', channel: 'The Organ Story', views: 'Playlist chính thức', time: 'youtube.com/@TheOrganStory', embedUrl: ORGAN_STORY_EMBED, playlistId: ORGAN_STORY_PLAYLIST_ID },
  // ── Các mục RSS "thật" khác (đã có link/nhúng thật trong Facebook/TikTok/YouTube RSS
  // phía trên) được thêm vào đây để có thể mở nhanh từ khu Kênh yêu thích. ──
  { id: 'ch_yt_featured', icon: '▶', name: 'Playlist sức khỏe nổi bật', subs: 'Playlist YouTube thật',
    url: 'https://www.youtube.com/watch?v=LHkE3loNxJ4&list=PLhPgpmsoyA4GrZ5mGrOPyf1wb1Ke1Zw8p',
    title: 'Playlist sức khỏe nổi bật', channel: 'YouTube Playlist', views: 'Playlist', time: 'youtube.com/watch?v=LHkE3loNxJ4',
    embedUrl: FEATURED_PLAYLIST_EMBED, playlistId: FEATURED_PLAYLIST_ID },
  { id: 'ch_fb_aipunk', icon: '🎬', name: 'AIPunkstudio', subs: 'Trang Facebook thật', url: FB_AIPUNK_REELS_URL,
    title: 'AIPunkstudio · Danh sách Reels', channel: 'AIPunkstudio', views: 'Trang thật · danh sách video', time: 'facebook.com/AIPunkstudio',
    embedUrl: FB_AIPUNK_EMBED, aspectRatio: '9/16' },
  { id: 'ch_fb_reel', icon: '🎬', name: 'Facebook Reel', subs: 'Reel Facebook thật', url: FB_REEL_URL,
    title: 'Video Facebook Reel', channel: 'Facebook Reel', views: 'Reel thật', time: 'facebook.com/reel',
    embedUrl: FB_REEL_EMBED, aspectRatio: '9/16' },
  { id: 'ch_tt_profile', icon: '🎵', name: '@xuankhanhsupertech', subs: 'Kênh TikTok thật', url: TIKTOK_PROFILE_URL,
    title: '@xuankhanhsupertech · Danh sách video', channel: 'TikTok · xuankhanhsupertech', views: 'Danh sách video thật', time: TIKTOK_PROFILE_URL,
    tiktokProfile: true, aspectRatio: '9/16' },
  { id: 'ch_tt_collection', icon: '🗂️', name: 'Trị Ung Thư (Bộ sưu tập)', subs: 'Bộ sưu tập TikTok thật', url: TIKTOK_PROFILE_URL,
    tiktokListUrl: TIKTOK_COLLECTION_URL, title: TIKTOK_COLLECTION_TITLE, channel: 'TikTok · Bộ sưu tập', views: 'Bộ sưu tập thật',
    time: TIKTOK_COLLECTION_URL, tiktokProfile: true, isList: true, aspectRatio: '9/16' },
  { id: 'ch2', icon: '🥗', name: 'Dinh Dưỡng Việt', subs: '1.6M subscribers' },
  { id: 'ch3', icon: '🧘', name: 'Yoga Cùng Mai', subs: '1.4M subscribers' },
  { id: 'ch4', icon: '❤️', name: 'Sức Khỏe TV', subs: '3.7M subscribers' },
  { id: 'ch5', icon: '⚕️', name: 'Consensus Doctor', subs: '1.1M subscribers' },
  { id: 'ch6', icon: '🍲', name: 'Ăn Gì Hôm Nay', subs: '2.2M subscribers' },
  { id: 'ch7', icon: '🐱', name: 'Bé Mèo Nước', subs: '5.4M subscribers' },
  { id: 'ch8', icon: '⚖️', name: 'InBody Việt', subs: '1.8M subscribers' },
]

const gradFor = (id) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % GRADIENTS.length
  return GRADIENTS[h]
}

const DEMO_VIDEO_SRC = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

// ─── Thumbnail card ─────────────────────────────────────────────────────────
function ThumbCard({ item, active, onClick, orientation, border, surface, text, text2 }) {
  const isRow = orientation === 'row'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', textAlign: 'left', cursor: 'pointer',
        width: isRow ? 128 : '100%', flexShrink: 0, padding: 0,
        background: active ? 'rgba(0,229,255,0.08)' : surface,
        border: `1px solid ${active ? '#00e5ff' : border}`,
        borderRadius: 10, overflow: 'hidden', fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', aspectRatio: isRow ? '9/16' : '16/10',
        background: gradFor(item.id), display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: isRow ? 26 : 22 }}>{item.icon}</span>
        {item.url ? (
          <span style={{
            position: 'absolute', bottom: 4, right: 4, fontSize: 9, fontWeight: 800,
            background: 'rgba(0,229,255,0.85)', color: '#04060f', padding: '1px 6px', borderRadius: 4,
          }}>🔗 Kênh thật</span>
        ) : (
          <span style={{
            position: 'absolute', bottom: 4, right: 4, fontSize: 9, fontWeight: 700,
            background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '1px 5px', borderRadius: 4,
          }}>{item.duration}</span>
        )}
      </div>
      <div style={{ padding: '7px 8px 9px' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: text, lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{item.title}</div>
        <div style={{ fontSize: 10, color: text2, marginTop: 4 }}>
          {item.channel ? `${item.channel} · ` : ''}{item.views || item.time || item.likes}
        </div>
      </div>
    </button>
  )
}

// ─── TikTok Creator Profile Embed (real widget, no API key) ───────────────
// Uses TikTok's official embed.js (blockquote data-embed-type="creator") which renders
// a scrollable, vertical (9:16) list of the creator's most recent public videos.
function TikTokCreatorEmbed({ url, linkUrl }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !url) return
    const username = (url.match(/@([\w.-]+)/) || [])[1] || ''
    // cite/data-unique-id follow TikTok's official creator-embed format (profile URL), while
    // the fallback link can point at a more specific real URL (e.g. a collection) when given.
    const fallbackHref = linkUrl || `${url}?refer=creator_embed`
    container.innerHTML = `
      <blockquote class="tiktok-embed" cite="${url}" data-unique-id="${username}" data-embed-type="creator" style="max-width:720px;min-width:288px;margin:0;">
        <section><a target="_blank" rel="noopener noreferrer" href="${fallbackHref}">@${username}</a></section>
      </blockquote>`
    // Cache-bust so TikTok's embed.js re-scans the page and (re)renders this blockquote
    // even if the script had already been loaded for a previous selection.
    const script = document.createElement('script')
    script.src = `https://www.tiktok.com/embed.js?t=${Date.now()}`
    script.async = true
    document.body.appendChild(script)
    return () => { script.remove() }
  }, [url])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height: '100%', overflowY: 'auto', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center', background: '#000', padding: '10px 0',
      }}
    />
  )
}

function SourceHeader({ icon, iconBg, iconColor, title, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8, background: iconBg, color: iconColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
      }}>{icon}</div>
      <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.4, color: text, textTransform: 'uppercase' }}>{title}</span>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function RSSPortalPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const [current, setCurrent] = useState(FACEBOOK_ITEMS[0])
  const [currentKind, setCurrentKind] = useState('facebook')
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mobileTab, setMobileTab] = useState('player')
  const videoRef = useRef(null)

  // ── Real playlist video list (Organ Story) ──
  const ytPlayerRef = useRef(null)
  const ytContainerRef = useRef(null)
  const [organVideos, setOrganVideos] = useState([])
  const [organActiveId, setOrganActiveId] = useState(null)
  const [organLoading, setOrganLoading] = useState(false)

  const select = useCallback((item, kind) => {
    setCurrent(item)
    setCurrentKind(kind)
    setPlaying(false)
    setLiked(false)
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
  }, [])

  const togglePlay = () => {
    if (current.playlistId) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo()
      }
      setPlaying(true)
      return
    }
    if (current.embedUrl) { setPlaying(true); return }
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  const playOrganVideoAt = (index) => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideoAt === 'function') {
      ytPlayerRef.current.playVideoAt(index)
      setPlaying(true)
    }
  }

  // Build (or destroy) a real YT.Player when the selected item is a playlist item.
  useEffect(() => {
    if (!current.playlistId) {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy()
        ytPlayerRef.current = null
      }
      setOrganVideos([])
      setOrganActiveId(null)
      return
    }

    let cancelled = false
    setOrganLoading(true)
    setOrganVideos([])
    setOrganActiveId(null)

    loadYouTubeIframeAPI().then((YT) => {
      if (cancelled || !YT || !ytContainerRef.current) return
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy()
        ytPlayerRef.current = null
      }
      ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
        width: '100%',
        height: '100%',
        playerVars: { listType: 'playlist', list: current.playlistId, rel: 0 },
        events: {
          onReady: (e) => {
            if (cancelled) return
            const ids = e.target.getPlaylist ? (e.target.getPlaylist() || []) : []
            const idx = e.target.getPlaylistIndex ? e.target.getPlaylistIndex() : 0
            setOrganActiveId(ids[idx] || ids[0] || null)
            setOrganVideos(ids.map((id, i) => ({ id, title: `Video ${i + 1}` })))
            setOrganLoading(false)
            // Fill in real titles progressively via oEmbed (no API key needed).
            ids.forEach(async (id) => {
              const title = await fetchYouTubeTitle(id)
              if (cancelled || !title) return
              setOrganVideos(prev => prev.map(v => (v.id === id ? { ...v, title } : v)))
            })
          },
          onStateChange: (e) => {
            if (cancelled) return
            const ids = e.target.getPlaylist ? (e.target.getPlaylist() || []) : []
            const idx = e.target.getPlaylistIndex ? e.target.getPlaylistIndex() : -1
            if (idx >= 0 && ids[idx]) setOrganActiveId(ids[idx])
            if (e.data === 1) setPlaying(true)
            if (e.data === 2) setPlaying(false)
          },
        },
      })
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id, current.playlistId])

  // Destroy the player on unmount.
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current) { ytPlayerRef.current.destroy(); ytPlayerRef.current = null }
    }
  }, [])

  // ── Theme (portal has its own dark, media-hub aesthetic) ──
  const bg      = '#04060f'
  const surface = 'rgba(255,255,255,0.035)'
  const border  = 'rgba(255,255,255,0.09)'
  const text    = '#e8f0f8'
  const text2   = 'rgba(232,240,248,0.55)'
  const text3   = 'rgba(232,240,248,0.35)'
  const accent  = '#00e5ff'

  const kindMeta = {
    facebook: { label: 'Facebook RSS', icon: 'f', iconBg: 'rgba(24,119,242,0.18)', iconColor: '#1877f2' },
    tiktok:   { label: 'TikTok RSS',   icon: '♪', iconBg: 'rgba(255,255,255,0.1)', iconColor: '#ff2d55' },
    youtube:  { label: 'YouTube RSS',  icon: '▶', iconBg: 'rgba(255,0,0,0.16)', iconColor: '#ff0000' },
    channel:  { label: 'Kênh yêu thích', icon: '★', iconBg: 'rgba(168,85,247,0.16)', iconColor: '#a855f7' },
  }
  const meta = kindMeta[currentKind]

  const panelCard = { background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 14 }

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '20px 16px 120px', boxSizing: 'border-box', color: text }}>
      <style>{`
        .rss-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
        .rss-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .rss-mobile-tabs { display: none; }
        @media (max-width: 980px) {
          .rss-grid { display: flex !important; flex-direction: column; }
          .rss-side-col { display: none !important; }
          .rss-side-col.rss-active { display: flex !important; flex-direction: row !important; overflow-x: auto !important; gap: 10px; }
          .rss-mobile-tabs { display: flex !important; }
          .rss-top-row { order: -1; }
          .rss-player-block { display: none !important; }
          .rss-player-block.rss-active { display: block !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#00e5ff,#0284c7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>📡</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, letterSpacing: '-0.02em' }}>
              Healthy{' '}
              <span style={{ background: 'linear-gradient(135deg,#00e5ff,#0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                RSS Portal
              </span>
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: text2 }}>
              Trung tâm video sức khỏe của bạn · tổng hợp từ Facebook, TikTok, YouTube &amp; kênh yêu thích
            </p>
          </div>
        </div>

        {/* ── Mobile tab switcher ── */}
        <div className="rss-mobile-tabs" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            ['player', '▶ Video'],
            ['facebook', 'f Facebook'],
            ['tiktok', '♪ TikTok'],
            ['youtube', '▶ YouTube'],
            ['favorite', '★ Yêu thích'],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMobileTab(id)} style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${mobileTab === id ? accent : border}`,
              background: mobileTab === id ? 'rgba(0,229,255,0.12)' : 'transparent',
              color: mobileTab === id ? accent : text2, fontFamily: 'inherit',
            }}>{label}</button>
          ))}
        </div>

        {/* ── Grid layout: left / center / right ── */}
        <div className="rss-grid" style={{
          display: 'grid',
          gridTemplateColumns: '230px 1fr 230px',
          gridTemplateRows: 'auto auto auto',
          gap: 14,
        }}>
          {/* Right: Facebook RSS (spans all 3 rows) */}
          <div
            className={`rss-side-col ${mobileTab === 'facebook' ? 'rss-active' : ''}`}
            style={{ ...panelCard, gridColumn: 3, gridRow: '1 / span 3', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 780 }}
          >
            <SourceHeader icon="f" iconBg="rgba(24,119,242,0.18)" iconColor="#1877f2" title="Facebook RSS" text={text} />
            {FACEBOOK_ITEMS.map(item => (
              <ThumbCard key={item.id} item={item} orientation="col" active={current.id === item.id}
                onClick={() => select(item, 'facebook')} border={border} surface={surface} text={text} text2={text2} />
            ))}
          </div>

          {/* Top-center: TikTok RSS (horizontal strip) */}
          <div
            className={`rss-top-row rss-side-col ${mobileTab === 'tiktok' ? 'rss-active' : ''}`}
            style={{ ...panelCard, gridColumn: 2, gridRow: 1, display: 'flex', flexDirection: 'column' }}
          >
            <SourceHeader icon="♪" iconBg="rgba(255,255,255,0.1)" iconColor="#ff2d55" title="TikTok RSS" text={text} />
            <div className="rss-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {TIKTOK_ITEMS.map(item => (
                <ThumbCard key={item.id} item={item} orientation="row" active={current.id === item.id}
                  onClick={() => select(item, 'tiktok')} border={border} surface={surface} text={text} text2={text2} />
              ))}
            </div>
          </div>

          {/* Center: Video player */}
          <div
            className={`rss-player-block ${mobileTab === 'player' ? 'rss-active' : ''}`}
            style={{ ...panelCard, gridColumn: 2, gridRow: 2, padding: 0, overflow: 'hidden' }}
          >
            <div style={{
              position: 'relative', width: '100%', background: '#000',
              ...(current.aspectRatio === '9/16'
                ? { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'min(72vh, 640px)' }
                : { aspectRatio: current.aspectRatio || '16/9' }),
            }}>
              <div style={{
                position: 'relative', background: '#000',
                ...(current.aspectRatio === '9/16'
                  ? { height: '100%', aspectRatio: '9/16' }
                  : { width: '100%', height: '100%' }),
              }}>
                {/* YT.Player container: kept permanently mounted (no key, never removed by
                    React) so the YouTube IFrame API always owns a stable DOM node. Switching
                    away just hides it — the player itself is destroyed/recreated inside the
                    effect via ytPlayerRef.current.destroy(), never by React's own unmount,
                    which is what previously caused "removeChild" crashes when jumping
                    between videos. */}
                <div
                  ref={ytContainerRef}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    display: current.playlistId ? 'block' : 'none',
                  }}
                />
                {current.playlistId && (
                  <span style={{
                    position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 800, pointerEvents: 'none',
                    background: 'rgba(0,229,255,0.9)', color: '#04060f', padding: '3px 9px', borderRadius: 999,
                  }}>🔗 Video/Playlist thật</span>
                )}
                {!current.playlistId && current.tiktokProfile ? (
                  <>
                    <TikTokCreatorEmbed key={current.id} url={current.url} linkUrl={current.tiktokListUrl || current.url} />
                    <span style={{
                      position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 800, pointerEvents: 'none',
                      background: 'rgba(0,229,255,0.9)', color: '#04060f', padding: '3px 9px', borderRadius: 999,
                    }}>🔗 Danh sách video thật</span>
                  </>
                ) : !current.playlistId && current.embedUrl ? (
                  <>
                    <iframe
                      key={current.id}
                      src={current.embedUrl}
                      title={current.title}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                    <span style={{
                      position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 800, pointerEvents: 'none',
                      background: 'rgba(0,229,255,0.9)', color: '#04060f', padding: '3px 9px', borderRadius: 999,
                    }}>🔗 Video/Playlist thật</span>
                  </>
                ) : !current.playlistId ? (
                  <>
                    <video
                      ref={videoRef}
                      src={DEMO_VIDEO_SRC}
                      poster=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: playing ? 'block' : 'none' }}
                      onPause={() => setPlaying(false)}
                      onPlay={() => setPlaying(true)}
                      onEnded={() => setPlaying(false)}
                      controls={playing}
                    />
                    {!playing && (
                      <div
                        onClick={togglePlay}
                        style={{
                          position: 'absolute', inset: 0, background: gradFor(current.id),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 46, marginRight: 8 }}>{current.icon}</span>
                        <div style={{
                          width: 62, height: 62, borderRadius: '50%', background: 'rgba(0,0,0,0.45)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 12,
                          border: '2px solid rgba(255,255,255,0.85)',
                        }}>
                          <span style={{ fontSize: 22, color: '#fff', marginLeft: 3 }}>▶</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>

            <div style={{ padding: '16px 18px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase',
                  color: meta.iconColor, background: meta.iconBg, borderRadius: 6, padding: '2px 8px',
                }}>{meta.label}</span>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>{current.title}</h2>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: gradFor(current.id + 'ch'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
                  }}>{current.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{current.channel || 'Kênh sức khỏe'}</div>
                    <div style={{ fontSize: 10, color: text3 }}>{current.views || current.time || `${current.likes || ''} lượt thích`}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setLiked(l => !l)} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20,
                    border: `1px solid ${liked ? accent : border}`, background: liked ? 'rgba(0,229,255,0.1)' : 'transparent',
                    color: liked ? accent : text2, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{liked ? '👍' : '👍🏻'} Thích</button>
                  <button type="button" style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20,
                    border: `1px solid ${border}`, background: 'transparent', color: text2,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>↗ Chia sẻ</button>
                  <button type="button" onClick={() => setSaved(s => !s)} style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20,
                    border: `1px solid ${saved ? accent : border}`, background: saved ? 'rgba(0,229,255,0.1)' : 'transparent',
                    color: saved ? accent : text2, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{saved ? '🔖' : '📑'} Lưu</button>
                </div>
              </div>

              {current.playlistId ? (
                <div style={{ marginTop: 14, borderTop: `1px solid ${border}`, paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: text2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Danh sách video trong playlist{organVideos.length > 0 ? ` (${organVideos.length})` : ''}
                    </span>
                    {organLoading && <span style={{ fontSize: 10, color: text3 }}>Đang tải…</span>}
                  </div>
                  <div className="rss-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                    {organVideos.map((v, i) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => playOrganVideoAt(i)}
                        title={v.title}
                        style={{
                          display: 'flex', flexDirection: 'column', width: 150, flexShrink: 0, textAlign: 'left',
                          background: organActiveId === v.id ? 'rgba(0,229,255,0.08)' : surface,
                          border: `1px solid ${organActiveId === v.id ? accent : border}`,
                          borderRadius: 10, overflow: 'hidden', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                        }}
                      >
                        <img
                          src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                          alt={v.title}
                          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', background: '#111' }}
                        />
                        <div style={{
                          padding: '6px 8px 8px', fontSize: 11, fontWeight: 700, lineHeight: 1.3,
                          color: organActiveId === v.id ? accent : text,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {v.title}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p style={{ margin: '10px 0 0', fontSize: 10, color: text3, lineHeight: 1.5 }}>
                    Danh sách lấy trực tiếp từ playlist YouTube thật (YouTube IFrame Player API) — tiêu đề từng
                    video được tra qua oEmbed công khai, không cần API key.
                  </p>
                </div>
              ) : current.tiktokProfile ? (
                <div style={{ marginTop: 14, borderTop: `1px solid ${border}`, paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: text2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {current.isList ? 'Danh sách video trong bộ sưu tập' : 'Danh sách video của kênh'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: text2, lineHeight: 1.6 }}>
                    {current.isList
                      ? 'Hiển thị bằng TikTok Creator Profile Embed chính thức (widget thật, không cần API key) — TikTok chưa cung cấp API/oEmbed công khai để liệt kê từng video riêng trong một bộ sưu tập cụ thể, nên danh sách bên trên là các video công khai gần nhất của kênh.'
                      : 'Danh sách video thật lấy trực tiếp từ TikTok Creator Profile Embed chính thức (không cần API key), hiển thị tối đa 10 video gần nhất của kênh.'}
                  </p>
                  <a
                    href={current.tiktokListUrl || current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 8, fontSize: 12, fontWeight: 700, color: accent }}
                  >
                    ↗ Xem trọn bộ {current.isList ? 'bộ sưu tập' : 'kênh'} gốc trên TikTok
                  </a>
                </div>
              ) : (
                <p style={{ margin: '14px 0 0', fontSize: 13, color: text2, lineHeight: 1.6, borderTop: `1px solid ${border}`, paddingTop: 12 }}>
                  Video được tổng hợp tự động từ nguồn {meta.label}. Trong bản triển khai đầy đủ, nội dung này sẽ
                  được lấy trực tiếp qua YouTube Data API, Facebook Graph API hoặc TikTok Display API và phát bằng
                  trình phát nhúng gốc của từng nền tảng (xem tài liệu nghiên cứu RSS Portal để biết chi tiết kiến trúc).
                </p>
              )}
            </div>
          </div>

          {/* Bottom-center: Favorite channels */}
          <div
            className={`rss-side-col ${mobileTab === 'favorite' ? 'rss-active' : ''}`}
            style={{ ...panelCard, gridColumn: 2, gridRow: 3, display: 'flex', flexDirection: 'column' }}
          >
            <SourceHeader icon="★" iconBg="rgba(168,85,247,0.16)" iconColor="#a855f7" title="Kênh yêu thích" text={text} />
            <div className="rss-scroll" style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {FAVORITE_CHANNELS.map(ch => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => { if (ch.embedUrl || ch.tiktokProfile) { select(ch, 'channel') } else if (ch.url) { window.open(ch.url, '_blank', 'noopener,noreferrer') } }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', width: 84, flexShrink: 0,
                    textAlign: 'center', background: 'transparent', border: 'none', padding: 0,
                    cursor: ch.url ? 'pointer' : 'default', fontFamily: 'inherit',
                  }}
                >
                  <div style={{
                    position: 'relative', width: 52, height: 52, borderRadius: '50%', background: gradFor(ch.id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 6,
                    border: `2px solid ${ch.url ? '#00e5ff' : border}`,
                  }}>
                    {ch.icon}
                    {ch.url && (
                      <span style={{
                        position: 'absolute', bottom: -2, right: -2, fontSize: 9, background: '#00e5ff',
                        color: '#04060f', borderRadius: '50%', width: 16, height: 16, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontWeight: 900,
                      }}>🔗</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: text }}>{ch.name}</div>
                  <div style={{ fontSize: 9, color: text3, marginTop: 2 }}>{ch.subs}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Left: YouTube RSS (spans all 3 rows) */}
          <div
            className={`rss-side-col ${mobileTab === 'youtube' ? 'rss-active' : ''}`}
            style={{ ...panelCard, gridColumn: 1, gridRow: '1 / span 3', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 780 }}
          >
            <SourceHeader icon="▶" iconBg="rgba(255,0,0,0.16)" iconColor="#ff0000" title="YouTube RSS" text={text} />
            {YOUTUBE_ITEMS.map(item => (
              <ThumbCard key={item.id} item={item} orientation="col" active={current.id === item.id}
                onClick={() => select(item, 'youtube')} border={border} surface={surface} text={text} text2={text2} />
            ))}
          </div>
        </div>

        <p style={{ margin: '16px 2px 0', fontSize: 10, color: text3 }}>
          Demo video: “Flower” (CC0, MDN interactive examples) — dùng để minh họa trình phát trung tâm.
        </p>

        <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} style={{ marginTop: 24 }} />
      </div>
    </div>
  )
}
