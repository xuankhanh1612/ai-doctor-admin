import React, { useState, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { getAllRecords } from '../lib/medicalStorage.js'
import { useApp } from '../context/AppContext'
import { PATIENT } from '../data/mockData.js'
import NavButtons from './NavButtons.jsx'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

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

export default function ImagingPanel({ onNext, onPrev, prevLabel, compareImage, uploadedImages = [], onSelectCompareImage }) {
  const { t } = useApp()
  const [activeSlice, setActiveSlice] = useState(4)
  const [galleryImages, setGalleryImages] = useState([])
  const [selectedPdf, setSelectedPdf] = useState(null)

  useEffect(() => {
  async function syncGallery() {
    const records = await getAllRecords()

    const merged = [...records, ...(uploadedImages || [])]

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
}, [uploadedImages])

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
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

        {selectedPdf && (
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
            <Document file={selectedPdf.dataUrl}>
              <Page pageNumber={1} width={1000} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          </div>
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
{galleryImages.length > 0 && (
  <Card title="Uploaded Scan Library">
    <div
      style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 4,
      }}
    >
      {galleryImages.map((img, index) => {
        const isPdf =
          img?.mimeType?.includes('pdf') ||
          img?.filename?.toLowerCase()?.endsWith('.pdf')

        const active =
          (!isPdf && compareImage === img.dataUrl) ||
          (isPdf && selectedPdf?.id === img.id)

        return (
          <button
            key={img.id || index}
            onClick={() => {
              if (isPdf) {
                setSelectedPdf(img)
                onSelectCompareImage?.(null)
              } else {
                setSelectedPdf(null)
                onSelectCompareImage?.(img.dataUrl)

// giữ thumbnail library
setGalleryImages(prev => [...prev])
              }
            }}
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
            {isPdf ? (
              <div
                style={{
                  width: '100%',
                  height: 80,
                  background:
                    'linear-gradient(180deg,#1b2235,#101522)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: 34,
                    opacity: 0.95,
                  }}
                >
                  📄
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    fontSize: 8,
                    padding: '2px 5px',
                    borderRadius: 4,
                    background: 'rgba(255,255,255,.08)',
                    color: '#cfe8ff',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  PDF
                </div>
              </div>
            ) : (
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
            )}

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
        <Card title="{t('lesionTracking')}">
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
        <Card title="{t('aiFinding')}">
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
      <Card title="{t('scanTimeline')}">
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

      <NavButtons onNext={onNext} nextLabel={t('continueCheckin')} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
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

function NextBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '12px 22px', borderRadius: 10, cursor: 'pointer',
      background: 'linear-gradient(135deg, var(--cyan2), var(--violet2))',
      color: '#fff', fontSize: 13, fontWeight: 600,
      border: 'none', fontFamily: 'var(--font-display)',
      alignSelf: 'flex-start', transition: 'opacity 0.2s',
    }}
    onMouseEnter={e => e.target.style.opacity = '0.82'}
    onMouseLeave={e => e.target.style.opacity = '1'}
    >{children}</button>
  )
}
