import React, { useMemo } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'

// @ts-ignore Vite raw HTML import
import organConnectionHtml from '../organ-connection/organ-connection.html?raw'

import organBoyUrl        from '../organ-connection/assets/boy.png'
import organBrainUrl      from '../organ-connection/assets/brain.png'
import organBrainProUrl   from '../organ-connection/assets/brainpro.png'
import organFullBodyBoxUrl from '../organ-connection/assets/fullbodybox.png'
import organHeartUrl      from '../organ-connection/assets/heart.png'
import organHeartProUrl   from '../organ-connection/assets/heartpro.png'
import organKidneyUrl     from '../organ-connection/assets/kidney.png'
import organKidneyProUrl  from '../organ-connection/assets/kidneypro.png'
import organLiverUrl      from '../organ-connection/assets/liver.png'
import organLiverProUrl   from '../organ-connection/assets/liverpro.png'
import organLungsUrl      from '../organ-connection/assets/lungs.png'
import organLungsProUrl   from '../organ-connection/assets/lungspro.png'
import organStomachUrl    from '../organ-connection/assets/stomach.png'
import organStomachProUrl from '../organ-connection/assets/stomachpro.png'
import organVegetablesUrl from '../organ-connection/assets/vegetables.png'

// Topbar ~56px, NavButtons row ~76px.
// On laptop/desktop we want the iframe to take all remaining vertical space.
// The GlobalBottomNav is position:fixed so it doesn't affect document flow —
// we don't need to subtract it from the iframe height.
const TOPBAR_H  = 56   // px
const NAV_ROW_H = 76   // px – our NavButtons row

export default function OrganConnectionPanel({ onNext, onPrev, prevLabel, nextLabel }) {
  const { theme } = useApp()
  const isDark = theme === 'dark'

  const html = useMemo(() => organConnectionHtml
    .replaceAll('__ORGAN_BOY__',         organBoyUrl)
    .replaceAll('__ORGAN_BRAIN__',       organBrainUrl)
    .replaceAll('__ORGAN_BRAINPRO__',    organBrainProUrl)
    .replaceAll('__ORGAN_FULLBODYBOX__', organFullBodyBoxUrl)
    .replaceAll('__ORGAN_HEART__',       organHeartUrl)
    .replaceAll('__ORGAN_HEARTPRO__',    organHeartProUrl)
    .replaceAll('__ORGAN_KIDNEY__',      organKidneyUrl)
    .replaceAll('__ORGAN_KIDNEYPRO__',   organKidneyProUrl)
    .replaceAll('__ORGAN_LIVER__',       organLiverUrl)
    .replaceAll('__ORGAN_LIVERPRO__',    organLiverProUrl)
    .replaceAll('__ORGAN_LUNGS__',       organLungsUrl)
    .replaceAll('__ORGAN_LUNGSPRO__',    organLungsProUrl)
    .replaceAll('__ORGAN_STOMACH__',     organStomachUrl)
    .replaceAll('__ORGAN_STOMACHPRO__',  organStomachProUrl)
    .replaceAll('__ORGAN_VEGETABLES__',  organVegetablesUrl)
  , [])

  // Laptop/desktop: fill all space below topbar minus our nav-buttons row
  const iframeH = `calc(100svh - ${TOPBAR_H}px - ${NAV_ROW_H}px)`

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: isDark ? '#0a0d1a' : '#f8fafc',
    }}>
      <style>{`
        .organ-iframe {
          width: 100%;
          border: none;
          display: block;
        }
        /* Tablet */
        @media (max-width: 1024px) {
          .organ-iframe {
            height: clamp(560px, calc(100svh - ${TOPBAR_H}px - ${NAV_ROW_H}px), 1200px) !important;
          }
        }
        /* Phone */
        @media (max-width: 640px) {
          .organ-iframe {
            height: clamp(480px, calc(100svh - ${TOPBAR_H}px - ${NAV_ROW_H + 16}px), 900px) !important;
          }
        }
      `}</style>

      {/* ── IFRAME ── */}
      <iframe
        className="organ-iframe"
        style={{ height: iframeH }}
        srcDoc={html}
        title="Ăn gì hôm nay – Organ Connection"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
      />

      {/* ── NAV BUTTONS – always at the very bottom ── */}
      <div style={{ flexShrink: 0, padding: '0 clamp(12px, 3vw, 24px)' }}>
        <NavButtons
          onPrev={onPrev}
          prevLabel={prevLabel}
          onNext={onNext}
          nextLabel={nextLabel}
        />
      </div>
    </div>
  )
}
