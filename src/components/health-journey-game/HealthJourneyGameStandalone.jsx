import { useEffect, useRef } from 'react'
import htmlContent from './health-journey-game.html?raw'

const STYLE_ID = 'health-journey-inline-style'

export default function HealthJourneyGameStandalone() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')

    const styleTag = doc.querySelector('style')

    if (styleTag && !document.getElementById(STYLE_ID)) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = styleTag.textContent || ''
      document.head.appendChild(style)
    }

    container.innerHTML = doc.body.innerHTML

    const scripts = Array.from(
      container.querySelectorAll('script')
    )

    scripts.forEach((oldScript) => {
      const script = document.createElement('script')

      Array.from(oldScript.attributes).forEach((attr) => {
        script.setAttribute(attr.name, attr.value)
      })

      script.textContent = oldScript.textContent || ''

      oldScript.parentNode?.replaceChild(
        script,
        oldScript
      )
    })

    return () => {
      container.innerHTML = ''
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="health-journey-standalone-container"
    />
  )
}
