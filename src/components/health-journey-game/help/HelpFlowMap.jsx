import React from 'react'
import { NAV_FLOW, findScreenById } from './helpContent'

// Layout constants for the SVG diagram (viewBox units)
const COLS = NAV_FLOW.length
const VB_W = 1000
const VB_H = 430
const COL_GAP = VB_W / (COLS + 1)
const NAV_Y = 46
const SCREEN_Y = 168
const DETAIL_Y = 320

function colX(i) {
  return COL_GAP * (i + 1)
}

/**
 * Curved connector from the nav pill down to its screen card.
 * Slight "S" bend so it reads as a deliberate route, like the
 * reference mock-ups, instead of a plain straight line.
 */
function ConnectorPath({ x, y1, y2, color, id }) {
  const mid = y1 + (y2 - y1) * 0.5
  const d = `M ${x} ${y1} C ${x} ${mid}, ${x} ${mid}, ${x} ${y2}`
  return (
    <g>
      <path d={d} className="hj-flow-arrow-glow" stroke={color} />
      <path id={id} d={d} className="hj-flow-arrow" stroke={color} markerEnd={`url(#arrowhead-${id})`} />
      <circle r="4" fill={color} className="hj-flow-pulse">
        <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
      </circle>
      <defs>
        <marker id={`arrowhead-${id}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={color} />
        </marker>
      </defs>
    </g>
  )
}

function ShortConnector({ x, y1, y2, color, id }) {
  const d = `M ${x} ${y1} L ${x} ${y2}`
  return (
    <g>
      <path d={d} className="hj-flow-arrow-glow hj-flow-arrow-short" stroke={color} />
      <path id={id} d={d} className="hj-flow-arrow hj-flow-arrow-short" stroke={color} markerEnd={`url(#arrowhead-${id})`} />
      <defs>
        <marker id={`arrowhead-${id}`} markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill={color} />
        </marker>
      </defs>
    </g>
  )
}

export default function HelpFlowMap({ onJumpToScreen, onJumpToDetail, flipped = false }) {
  // When flipped: nav sits at bottom, screen in middle, detail at top.
  // dirSign drives offsets that point "toward the center" from each row.
  const NAV_Y    = flipped ? VB_H - 46  : 46
  const SCREEN_Y = flipped ? VB_H - 168 : 168
  const DETAIL_Y = flipped ? VB_H - 320 : 320

  // Connector anchors: edges of circles/cards closest to next row
  // Non-flipped: nav bottom (NAV_Y+26) → screen top (SCREEN_Y-30)
  // Flipped:     nav top   (NAV_Y-26) → screen bottom (SCREEN_Y+30)
  const navToScreenY1   = flipped ? NAV_Y - 26    : NAV_Y + 26
  const navToScreenY2   = flipped ? SCREEN_Y + 30 : SCREEN_Y - 30
  const screenToDetailY1 = flipped ? SCREEN_Y - 34 : SCREEN_Y + 34
  const screenToDetailY2 = flipped ? DETAIL_Y + 26 : DETAIL_Y - 26

  // Nav label: below circle normally, above circle when flipped
  const navLabelY = flipped ? -34 : 42

  // Screen card top-left Y (card is 64px tall, centred on SCREEN_Y)
  const screenCardY = flipped ? SCREEN_Y - 34 : SCREEN_Y - 30

  // Detail badge top-left Y
  const detailBadgeY = flipped ? DETAIL_Y - 14 : DETAIL_Y - 26

  return (
    <div className="hj-flow-map-wrap">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="hj-flow-svg" preserveAspectRatio="xMidYMid meet">
        {/* connectors: nav -> screen */}
        {NAV_FLOW.map((nav, i) => (
          <ConnectorPath
            key={`c-${nav.id}`}
            id={`nav-${nav.id}`}
            x={colX(i)}
            y1={navToScreenY1}
            y2={navToScreenY2}
            color={nav.color}
          />
        ))}

        {/* connectors: screen -> detail (only where a detail tab exists) */}
        {NAV_FLOW.map((nav, i) => {
          if (!nav.detailId) return null
          return (
            <ShortConnector
              key={`d-${nav.id}`}
              id={`detail-${nav.id}`}
              x={colX(i) - (nav.detailId2 ? 22 : 0)}
              y1={screenToDetailY1}
              y2={screenToDetailY2}
              color={nav.color}
            />
          )
        })}
        {NAV_FLOW.map((nav, i) => {
          if (!nav.detailId2) return null
          return (
            <ShortConnector
              key={`d2-${nav.id}`}
              id={`detail2-${nav.id}`}
              x={colX(i) + 22}
              y1={screenToDetailY1}
              y2={screenToDetailY2}
              color={nav.color}
            />
          )
        })}

        {/* nav row */}
        {NAV_FLOW.map((nav, i) => (
          <g
            key={nav.id}
            transform={`translate(${colX(i)}, ${NAV_Y})`}
            className="hj-flow-node hj-flow-node-nav"
            onClick={() => onJumpToScreen?.(nav.id)}
          >
            <circle r={nav.isCenter ? 27 : 23} className="hj-flow-nav-circle" stroke={nav.color} />
            <text textAnchor="middle" dy="7" className="hj-flow-nav-icon">{nav.icon}</text>
            <text textAnchor="middle" y={navLabelY} className="hj-flow-node-label" fill={nav.color}>{nav.label}</text>
          </g>
        ))}

        {/* screen row */}
        {NAV_FLOW.map((nav, i) => (
          <g
            key={`s-${nav.id}`}
            transform={`translate(${colX(i) - 46}, ${screenCardY})`}
            className="hj-flow-node hj-flow-node-screen"
            onClick={() => onJumpToScreen?.(nav.id)}
          >
            <rect width="92" height="64" rx="10" className="hj-flow-card" stroke={nav.color} />
            <text x="46" y="26" textAnchor="middle" className="hj-flow-card-icon">{nav.icon}</text>
            <text x="46" y="46" textAnchor="middle" className="hj-flow-card-label" fill={nav.color}>{nav.label}</text>
          </g>
        ))}

        {/* detail badges row */}
        {NAV_FLOW.map((nav, i) => {
          const badges = [nav.detailId, nav.detailId2].filter(Boolean)
          if (badges.length === 0) return null
          return badges.map((detailId, bi) => {
            const screen = findScreenById(detailId)
            if (!screen) return null
            const offsetX = badges.length > 1 ? (bi === 0 ? -22 : 22) : 0
            return (
              <g
                key={detailId}
                transform={`translate(${colX(i) + offsetX - 40}, ${detailBadgeY})`}
                className="hj-flow-node hj-flow-node-detail"
                onClick={() => onJumpToDetail?.(detailId)}
              >
                <rect width="80" height="40" rx="8" className="hj-flow-badge" stroke={nav.color} />
                <text x="40" y="17" textAnchor="middle" className="hj-flow-badge-num" fill={nav.color}>{screen.num}</text>
                <text x="40" y="31" textAnchor="middle" className="hj-flow-badge-label">{screen.icon} {screen.name}</text>
              </g>
            )
          })
        })}
      </svg>

      <p className="hj-flow-hint">
        💡 Chạm vào một nút bất kỳ trên sơ đồ để xem nhanh, hoặc dùng các tab phía trên để xem từng màn hình phóng to.
      </p>
    </div>
  )
}
