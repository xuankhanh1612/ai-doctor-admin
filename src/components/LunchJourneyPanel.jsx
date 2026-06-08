import React from 'react'
import HealthJourneyPanel from './HealthJourneyPanel.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function LunchJourneyPanel({ onNext, nextLabel, onPrev, prevLabel, onOpenStressRelief, onOpenInBody, onViewMedicalRecord }) {
  const { t } = useApp()

  return (
    <HealthJourneyPanel
      onNext={onNext}
      nextLabel={nextLabel || t('dinnerJourney')}
      onPrev={onPrev}
      prevLabel={prevLabel}
      onOpenStressRelief={onOpenStressRelief}
      onOpenInBody={onOpenInBody}
      onViewMedicalRecord={onViewMedicalRecord}
    />
  )
}
