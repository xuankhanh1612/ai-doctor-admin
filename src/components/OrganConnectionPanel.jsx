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

// Topbar height ~56px. Popups inside the iframe use vh units relative to the
// iframe's own viewport, so giving the iframe the full remaining screen height
// (100svh - topbar) makes popups as tall as possible.
// NavButtons are overlaid at the bottom via position:absolute so they don't
// reduce the iframe's height at all.
const TOPBAR_H = 56  // px

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

  const iframeH = `calc(100svh - ${TOPBAR_H}px)`

  return (
    // Outer wrapper: exactly as tall as the iframe, position:relative so
    // NavButtons can be absolutely positioned at the bottom.
    <div style={{
      position: 'relative',
      height: iframeH,
      background: isDark ? '#0a0d1a' : '#f8fafc',
      flexShrink: 0,
    }}>
      <style>{`
        .organ-iframe {
          width: 100%;
          border: none;
          display: block;
          height: 100%;
        }
        /* Tablet */
        @media (max-width: 1024px) {
          .organ-panel-wrap {
            height: clamp(560px, calc(100svh - ${TOPBAR_H}px), 1200px) !important;
          }
        }
        /* Phone */
        @media (max-width: 640px) {
          .organ-panel-wrap {
            height: clamp(480px, calc(100svh - ${TOPBAR_H}px), 900px) !important;
          }
        }
        /* NavButtons overlay */
        .organ-nav-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0 clamp(12px, 3vw, 24px);
          /* subtle backdrop so buttons are readable over iframe content */
          background: linear-gradient(to top,
            ${isDark ? 'rgba(10,13,26,0.92)' : 'rgba(248,250,252,0.92)'} 70%,
            transparent);
          pointer-events: none; /* let clicks through to iframe below */
        }
        .organ-nav-overlay > * {
          pointer-events: auto; /* re-enable for the buttons themselves */
        }
      `}</style>

      {/* ── IFRAME fills the full wrapper height ── */}
      <iframe
        className="organ-iframe"
        srcDoc={html}
        title="Ăn gì hôm nay – Organ Connection"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
      />

      {/* ── NAV BUTTONS overlaid at the bottom ── */}
      <div className="organ-nav-overlay">
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
