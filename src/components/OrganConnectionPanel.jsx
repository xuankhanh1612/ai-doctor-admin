import React, { useMemo } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext'

// @ts-ignore Vite raw HTML import
import organConnectionHtml from '../organ-connection/organ-connection.html?raw'

import organBoyUrl      from '../organ-connection/assets/boy.png'
import organBrainUrl    from '../organ-connection/assets/brain.png'
import organBrainProUrl from '../organ-connection/assets/brainpro.png'
import organFullBodyBoxUrl from '../organ-connection/assets/fullbodybox.png'
import organHeartUrl    from '../organ-connection/assets/heart.png'
import organHeartProUrl from '../organ-connection/assets/heartpro.png'
import organKidneyUrl   from '../organ-connection/assets/kidney.png'
import organKidneyProUrl from '../organ-connection/assets/kidneypro.png'
import organLiverUrl    from '../organ-connection/assets/liver.png'
import organLiverProUrl from '../organ-connection/assets/liverpro.png'
import organLungsUrl    from '../organ-connection/assets/lungs.png'
import organLungsProUrl from '../organ-connection/assets/lungspro.png'
import organStomachUrl  from '../organ-connection/assets/stomach.png'
import organStomachProUrl from '../organ-connection/assets/stomachpro.png'
import organVegetablesUrl from '../organ-connection/assets/vegetables.png'

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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: isDark ? '#0a0d1a' : '#f8fafc',
    }}>
      <NavButtons
        onPrev={onPrev}
        prevLabel={prevLabel}
        onNext={onNext}
        nextLabel={nextLabel}
      />
      <iframe
        srcDoc={html}
        title="Ăn gì hôm nay – Organ Connection"
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
          minHeight: 0,
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads"
      />
    </div>
  )
}
