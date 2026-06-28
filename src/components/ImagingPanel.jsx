import React, { useState, useEffect, useRef } from 'react'
import { getAllRecords } from '../lib/medicalStorage.js'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { PATIENT } from '../data/mockData.js'
import NavButtons from './NavButtons.jsx'


const Tag = ({ children, color = 'cyan' }) => {
  const colors = {
    cyan:   { bg: 'rgba(0,229,255,0.1)',   color: 'var(--cyan)',   border: 'rgba(0,229,255,0.2)'   },
    violet: { bg: 'rgba(156,111,255,0.1)', color: 'var(--violet)', border: 'rgba(156,111,255,0.2)' },
    green:  { bg: 'rgba(0,230,118,0.1)',   color: 'var(--green)',  border: 'rgba(0,230,118,0.2)'   },
    amber:  { bg: 'rgba(255,183,77,0.1)',  color: 'var(--amber)',  border: 'rgba(255,183,77,0.2)'  },
    red:    { bg: 'rgba(255,82,82,0.1)',   color: 'var(--red)',    border: 'rgba(255,82,82,0.2)'   },
  }
  const c = colors[color]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
      borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)',
      letterSpacing: '0.05em', background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>{children}</span>
  )
}

const isPdfRecord = (file) =>
  file?.mimeType?.includes('pdf') ||
  file?.fileType === 'pdf' ||
  file?.type === 'pdf' ||
  file?.filename?.toLowerCase()?.endsWith('.pdf')

export default function ImagingPanel({ onNext, nextLabel, onPrev, prevLabel, compareImage, uploadedImages = [], onSelectCompareImage, scrollTarget, onScrollTargetHandled }) {
  const { t } = useApp()
  const { user } = useAuth()
  const [activeSlice, setActiveSlice] = useState(4)
  const [galleryImages, setGalleryImages] = useState([])
  const topRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    async function syncGallery() {
      const records = await getAllRecords({ ownerUuid: user?.uuid, includeUnowned: !!user?.isAdmin })

      const visibleUploadedImages = (uploadedImages || []).filter(item =>
        item?.ownerUuid === user?.uuid || (!!user?.isAdmin && !item?.ownerUuid)
      )
      const merged = [...records, ...visibleUploadedImages]

      const map = new Map()

      merged.forEach(item => {
        const key =
          item.id ||
          item.filename ||
          item.dataUrl

        if (!map.has(key)) {
          map.set(key, item)
        }
      })

      setGalleryImages(Array.from(map.values()))
    }

    syncGallery()
  }, [uploadedImages, user?.email, user?.isAdmin])

  const uploadedPdfFiles = galleryImages.filter(isPdfRecord)
  const uploadedScanImages = galleryImages.filter(item => !isPdfRecord(item))

  const scrollToTop = (behavior = 'smooth') => {
    topRef.current?.scrollIntoView({ behavior, block: 'start' })
  }

  const scrollToEnd = (behavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior, block: 'end' })
  }

  useEffect(() => {
    if (!scrollTarget?.target) return undefined

    const timer = window.setTimeout(() => {
      if (scrollTarget.target === 'end') {
        scrollToEnd('smooth')
      } else {
        scrollToTop('smooth')
      }
      onScrollTargetHandled?.()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [scrollTarget?.requestedAt, scrollTarget?.target, uploadedPdfFiles.length, onScrollTargetHandled])

  return (
    <div ref={topRef} className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{t('imagingTitle')}</h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>AI-powered lesion detection with heatmap overlay · Patient {PATIENT.id}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag color="cyan">X-RAY</Tag>
          <Tag color="violet">CT</Tag>
        </div>
      </div>

      {/* Viewer */}
      <div style={{
        background: '#000', borderRadius: 14, overflow: 'hidden', position: 'relative',
        aspectRatio: '16/8', border: '1px solid var(--border2)',
      }}>
        {/* Uploaded compare image */}
        {compareImage && (
          <img
            src={compareImage}
            alt="Compare"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: 0.92,
              filter: 'grayscale(100%) contrast(1.1) brightness(0.9)',
            }}
          />
        )}

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,229,255,0.03) 1px,transparent 1px), linear-gradient(90deg,rgba(0,229,255,0.03) 1px,transparent 1px)',
          backgroundSize: '30px 30px',
        }} />

        {/* Chest SVG */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet" aria-label="Chest X-ray visualization" role="img">
          <ellipse cx="400" cy="200" rx="160" ry="175" stroke="rgba(0,229,255,0.18)" strokeWidth="1" fill="none"/>
          <line x1="400" y1="30" x2="400" y2="370" stroke="rgba(0,229,255,0.08)" strokeWidth="1"/>
          <ellipse cx="330" cy="210" rx="60" ry="100" stroke="rgba(0,229,255,0.22)" strokeWidth="1" fill="none"/>
          <ellipse cx="470" cy="210" rx="60" ry="100" stroke="rgba(0,229,255,0.22)" strokeWidth="1" fill="none"/>
          <ellipse cx="400" cy="230" rx="30" ry="50" stroke="rgba(0,229,255,0.12)" strokeWidth="1" fill="none"/>
          {/* Ribs */}
          {[0,1,2,3,4].map(i => (
            <path key={i}
              d={`M 320 ${120+i*35} Q 280 ${110+i*35} 260 ${130+i*35}`}
              stroke="rgba(0,229,255,0.1)" strokeWidth="1" fill="none"/>
          ))}
          {[0,1,2,3,4].map(i => (
            <path key={i}
              d={`M 480 ${120+i*35} Q 520 ${110+i*35} 540 ${130+i*35}`}
              stroke="rgba(0,229,255,0.1)" strokeWidth="1" fill="none"/>
          ))}
        </svg>

        {/* Heatmap */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 18% 16% at 42% 42%, rgba(255,82,82,0.35) 0%, transparent 70%), radial-gradient(ellipse 12% 12% at 62% 58%, rgba(255,183,77,0.22) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Scan line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--cyan), transparent)',
          animation: 'scan-line 3.5s ease-in-out infinite', opacity: 0.5,
        }} />

        {/* Lesion L1 */}
        <div style={{
          position: 'absolute', left: '36%', top: '30%', width: '13%', height: '18%',
          border: '1.5px solid var(--red)', borderRadius: 4,
          animation: 'flicker 4s ease-in-out infinite',
        }}>
          <span style={{
            position: 'absolute', top: -18, left: 0,
            fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--red)', whiteSpace: 'nowrap',
          }}>L1 · 2.3cm</span>
        </div>

        {/* Lesion L2 */}
        <div style={{
          position: 'absolute', left: '57%', top: '47%', width: '10%', height: '14%',
          border: '1.5px solid var(--amber)', borderRadius: 4,
          animation: 'flicker 4s ease-in-out infinite 2s',
        }}>
          <span style={{
            position: 'absolute', top: -18, left: 0,
            fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--amber)', whiteSpace: 'nowrap',
          }}>L2 · 1.1cm</span>
        </div>

        {/* Badge */}
        <div style={{
          position: 'absolute', bottom: 12, left: 14,
          fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(0,229,255,0.5)',
          background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: 4,
        }}>Chest X-ray · {PATIENT.diagnosis}</div>
      </div>

      {/* Uploaded thumbnails */}
      {uploadedScanImages.length > 0 && (
        <Card title="Uploaded Scan Library">
          <div
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {uploadedScanImages.map((img, index) => {
              const active = compareImage === img.dataUrl

              return (
                <button
                  key={img.id || index}
                  onClick={() => onSelectCompareImage?.(img.dataUrl)}
                  style={{
                    minWidth: 110,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: active
                      ? '2px solid var(--cyan)'
                      : '1px solid var(--border)',
                    background: 'var(--bg3)',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={img.dataUrl}
                    alt={img.filename || `scan-${index}`}
                    style={{
                      width: '100%',
                      height: 80,
                      objectFit: 'cover',
                      display: 'block',
                      filter: active
                        ? 'grayscale(0%)'
                        : 'grayscale(100%) contrast(1.05)',
                    }}
                  />

                  <div
                    style={{
                      padding: '6px 8px',
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      color: active
                        ? 'var(--cyan)'
                        : 'var(--text3)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {img.filename || 'Medical Scan'}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      {/* Lesion cards + finding */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title={t('lesionTracking')}>
          {PATIENT.lesions.map(l => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{l.id} · {l.type}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{l.status}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={l.change < 0 ? 'green' : 'amber'}>
                  {l.change < 0 ? '↓' : '↑'} {Math.abs(l.change)}%
                </Tag>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{l.size}</span>
              </div>
            </div>
          ))}
        </Card>
        <Card title={t('aiFinding')}>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
            Bilateral lung nodules detected. L1 shows regression response consistent with Erlotinib sensitivity. L2 warrants active monitoring — marginal growth trend.
          </p>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <Tag color="cyan">STAGE IIA</Tag>
            <Tag color="violet">NSCLC</Tag>
          </div>
        </Card>
      </div>

      {/* Timeline */}
      <Card title={t('scanTimeline')}>
        <div style={{ display: 'flex', gap: 8 }}>
          {PATIENT.scanTimeline.map((t, i) => (
            <button key={t} onClick={() => setActiveSlice(i)} style={{
              width: 52, height: 52, borderRadius: 8,
              background: 'var(--bg3)', border: `2px solid ${activeSlice === i ? 'var(--cyan)' : 'var(--border)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontFamily: 'var(--font-mono)',
              color: activeSlice === i ? 'var(--cyan)' : 'var(--text3)',
              transition: 'all 0.18s', flexShrink: 0,
              textAlign: 'center', lineHeight: 1.3,
            }}>{t}</button>
          ))}
        </div>
      </Card>

      {uploadedPdfFiles.length > 0 && <UploadedPdfPlayer files={uploadedPdfFiles} />}

      <div ref={endRef} />

      <NavButtons onNext={onNext} nextLabel={nextLabel || t('checkin')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}


function UploadedPdfPlayer({ files }) {
  return (
    <Card title="Uploaded PDF Documents">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>PDF Playback Center</div>
            <p style={{ margin: '4px 0 0', color: 'var(--text3)', fontSize: 11, lineHeight: 1.5 }}>
              Các file PDF đã upload được tách riêng tại đây. Bấm Play để tự động chạy qua toàn bộ trang trong từng hồ sơ.
            </p>
          </div>
          <Tag color="violet">{files.length} PDF</Tag>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {files.map((file, index) => (
            <PdfDocumentPlayer key={file.id || file.filename || index} file={file} />
          ))}
        </div>
      </div>
    </Card>
  )
}

function PdfDocumentPlayer({ file }) {
  // Convert base64 dataUrl to object URL so iframe can render reliably.
  // react-pdf / pdfjs worker often fails with base64 strings.
  const [objectUrl, setObjectUrl] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setLoadError(false)
    if (!file?.dataUrl) return
    try {
      const base64 = file.dataUrl.split(',')[1]
      if (!base64) { setLoadError(true); return }
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setObjectUrl(url)
      return () => URL.revokeObjectURL(url)
    } catch {
      setLoadError(true)
    }
  }, [file?.id, file?.dataUrl])

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      background: 'rgba(3, 7, 18, 0.65)',
      boxShadow: '0 18px 50px rgba(0,0,0,0.25)',
    }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.filename || file.name || 'PDF document'}
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 10, fontFamily: 'var(--font-mono)', marginTop: 3 }}>PDF · browser viewer</div>
        </div>
        {objectUrl && (
          <a
            href={objectUrl}
            download={file.filename || 'document.pdf'}
            style={{
              border: '1px solid rgba(0,229,255,0.35)',
              background: 'rgba(0,229,255,0.10)',
              color: 'var(--cyan)',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 11,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >⬇ Tải về</a>
        )}
      </div>

      {/* PDF iframe viewer */}
      <div style={{ background: '#05070c', height: 520, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loadError ? (
          <div style={{ color: 'var(--red)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'center', padding: 24 }}>
            ⚠️ Không thể hiển thị PDF này.<br />
            <span style={{ color: 'var(--text3)', fontSize: 10 }}>File có thể bị hỏng hoặc trình duyệt không hỗ trợ.</span>
          </div>
        ) : !objectUrl ? (
          <div style={{ color: 'var(--cyan)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>Đang tải PDF...</div>
        ) : (
          <iframe
            src={objectUrl}
            title={file.filename || 'PDF'}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
      </div>
    </div>
  )
}

function PdfStatus({ message, tone = 'cyan' }) {
  return (
    <div style={{ color: tone === 'red' ? 'var(--red)' : 'var(--cyan)', fontSize: 11, fontFamily: 'var(--font-mono)', padding: 18 }}>
      {message}
    </div>
  )
}

function ControlButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '8px 10px',
        borderRadius: 9,
        border: '1px solid var(--border)',
        background: disabled ? 'rgba(255,255,255,0.03)' : 'var(--bg3)',
        color: disabled ? 'rgba(255,255,255,0.22)' : 'var(--text2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  )
}

function Card({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}
