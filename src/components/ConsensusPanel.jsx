/**
 * ConsensusPanel.jsx  v2 — API-connected
 * ─────────────────────────────────────────────────────────────────
 * Fully backward-compatible with v1 UI. New additions:
 *   • Fusion-method selector (Bayesian / Weighted / Majority / Graph)
 *   • Real-time API status badge in header
 *   • API confidence + risk level shown alongside mock agreementScore
 *   • "Compare all methods" button + comparison grid
 *   • Per-agent weight bars from backend
 *   • Graceful fallback: if API is down, mock data is shown with a warning
 */

import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { AGENTS } from '../data/mockData.js'
import { useConsensus } from '../hooks/useConsensus.js'

// ── Color helpers ─────────────────────────────────────────────────────────
const COLOR_MAP = {
  cyan:   { bg: 'rgba(0,229,255,0.1)',   color: 'var(--cyan)',   border: 'rgba(0,229,255,0.25)'   },
  violet: { bg: 'rgba(156,111,255,0.1)', color: 'var(--violet)', border: 'rgba(156,111,255,0.25)' },
  pink:   { bg: 'rgba(244,143,177,0.1)', color: 'var(--pink)',   border: 'rgba(244,143,177,0.25)' },
  green:  { bg: 'rgba(0,230,118,0.1)',   color: 'var(--green)',  border: 'rgba(0,230,118,0.25)'   },
}

const RISK_STYLE = {
  low:      { bg: 'rgba(0,230,118,0.1)',   color: 'var(--green)', label: 'LOW RISK'      },
  moderate: { bg: 'rgba(255,183,77,0.1)',  color: 'var(--amber)', label: 'MODERATE RISK' },
  high:     { bg: 'rgba(255,152,0,0.1)',   color: '#ff9800',      label: 'HIGH RISK'     },
  critical: { bg: 'rgba(244,143,177,0.1)', color: 'var(--pink)',  label: 'CRITICAL'      },
}

const METHOD_LABELS = {
  bayesian: { short: 'BAY',  label: 'Bayesian',  desc: 'Log-odds weighted by specialty prior' },
  weighted: { short: 'WGT',  label: 'Weighted',  desc: 'Confidence × specialty reliability'  },
  majority: { short: 'VOT',  label: 'Majority',  desc: 'Quorum vote with tie-breaking'        },
  graph:    { short: 'GNN',  label: 'Graph',     desc: 'Evidence propagation across specialties' },
}

// ── Sub-components ────────────────────────────────────────────────────────

function AgentCard({ agent, state, apiWeight }) {
  const c = COLOR_MAP[agent.color]
  const status = state?.status || 'waiting'
  const step   = state?.thinkingStep ?? -1
  const apiConf = apiWeight?.apiConfidence

  return (
    <div style={{
      background: status === 'done' ? c.bg : 'var(--surface)',
      border: `1px solid ${status === 'done' ? c.border : 'var(--border)'}`,
      borderRadius: 12, padding: 16, transition: 'all 0.4s',
      opacity: status === 'waiting' ? 0.45 : 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: c.bg, color: c.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0,
        }}>{agent.abbr}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{agent.role}</div>
        </div>
        {status === 'done' && (
          <span style={{
            padding: '3px 9px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
            background: agent.vote === 'agree' ? 'rgba(0,230,118,0.12)' : 'rgba(255,183,77,0.12)',
            color:      agent.vote === 'agree' ? 'var(--green)'          : 'var(--amber)',
            border: `1px solid ${agent.vote === 'agree' ? 'rgba(0,230,118,0.3)' : 'rgba(255,183,77,0.3)'}`,
          }}>
            {agent.vote === 'agree' ? '✓ AGREE' : '⚠ FLAG'}
          </span>
        )}
      </div>

      {/* Thinking */}
      {status === 'thinking' && (
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: c.color }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, animation: 'pulse-dot 1s infinite' }} />
            Deliberating…
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 10 }}>{agent.thinking[step] || agent.thinking[0]}</div>
        </div>
      )}

      {/* Done */}
      {status === 'done' && state?.output && (
        <div className="animate-fade">
          <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 10 }}>
            {state.output.summary}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
            {state.output.keyFindings.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
                <span style={{ color: c.color }}>→</span> {f}
              </div>
            ))}
          </div>
          {/* Confidence bar — API value if available, else mock */}
          <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${apiConf ? Math.round(apiConf * 100) : agent.confidence}%`,
              height: '100%', background: c.color, borderRadius: 2,
              animation: 'grow-bar 0.8s ease both',
            }} />
          </div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: c.color, marginTop: 4, textAlign: 'right' }}>
            {apiConf ? `${Math.round(apiConf * 100)}% · API` : `${agent.confidence}%`} confidence
          </div>
        </div>
      )}

      {status === 'waiting' && (
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>Waiting for broadcast…</div>
      )}
    </div>
  )
}

const Card = ({ title, children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>{title}</div>
    {children}
  </div>
)

function MethodSelector({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {Object.entries(METHOD_LABELS).map(([key, m]) => (
        <button
          key={key}
          disabled={disabled}
          onClick={() => onChange(key)}
          title={m.desc}
          style={{
            padding: '5px 12px', borderRadius: 6, cursor: disabled ? 'default' : 'pointer',
            fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
            border: `1px solid ${value === key ? 'rgba(0,229,255,0.5)' : 'var(--border)'}`,
            background: value === key ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: value === key ? 'var(--cyan)' : 'var(--text3)',
            opacity: disabled ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

function ApiStatusBadge({ status, error }) {
  const cfg = {
    idle:    null,
    loading: { bg: 'rgba(0,229,255,0.08)', color: 'var(--cyan)',  label: '⟳ CALLING API…',  anim: true  },
    success: { bg: 'rgba(0,230,118,0.08)', color: 'var(--green)', label: '✓ API CONNECTED',  anim: false },
    error:   { bg: 'rgba(255,82,82,0.08)', color: '#ff5252',      label: '⚠ API OFFLINE — using mock', anim: false },
  }[status]

  if (!cfg) return null
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 4, fontSize: 9,
      fontFamily: 'var(--font-mono)', fontWeight: 600,
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}33`,
      opacity: cfg.anim ? undefined : 1,
    }}>
      {cfg.label}
    </span>
  )
}

function CompareGrid({ allResults }) {
  if (!allResults) return null
  const entries = Object.entries(allResults)
  const maxConf = Math.max(...entries.map(([, r]) => r.fused_confidence))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {entries.map(([method, r]) => {
        const isWinner = Math.abs(r.fused_confidence - maxConf) < 0.001
        return (
          <div key={method} style={{
            background: isWinner ? 'rgba(0,229,255,0.07)' : 'var(--surface2)',
            border: `1px solid ${isWinner ? 'rgba(0,229,255,0.35)' : 'var(--border)'}`,
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 4, textTransform: 'uppercase' }}>
              {METHOD_LABELS[method]?.label || method}{isWinner ? ' ★' : ''}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isWinner ? 'var(--cyan)' : 'var(--text)' }}>
              {(r.fused_confidence * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              agreement {(r.agreement_score * 100).toFixed(1)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────

export default function ConsensusPanel({ onReset }) {
  const { t } = useApp()
  const {
    phase, agentStates, consensusResult, run, reset,
    apiStatus, apiError,
    fusionMethod, setFusionMethod,
    allMethodResults, compareAll,
  } = useConsensus()

  const [showCompare, setShowCompare] = useState(false)
  const [comparing,  setComparing]   = useState(false)

  const handleCompare = async () => {
    setComparing(true)
    await compareAll()
    setComparing(false)
    setShowCompare(true)
  }

  const riskStyle = consensusResult?.riskLevel
    ? RISK_STYLE[consensusResult.riskLevel]
    : null

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{t('consensusTitle')}</h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>
            4 specialist agents deliberate in parallel · Meta-agent synthesizes unified recommendation
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {phase === 'done' && (
            <span style={{
              padding: '4px 12px', borderRadius: 5, fontSize: 10, fontFamily: 'var(--font-mono)',
              background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.25)',
            }}>{t('consensusReached')}</span>
          )}
          <ApiStatusBadge status={apiStatus} error={apiError} />
        </div>
      </div>

      {/* ── Idle: method selector + run ────────────────────────────────── */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
              Fusion method
            </div>
            <MethodSelector value={fusionMethod} onChange={setFusionMethod} disabled={false} />
          </div>
          <button onClick={run} style={{
            padding: '16px 28px', borderRadius: 12, cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--cyan2), var(--violet2))',
            color: '#fff', fontSize: 15, fontWeight: 700,
            border: 'none', fontFamily: 'var(--font-display)', letterSpacing: '0.03em',
          }}>▶ {t('runConsensus')} · {METHOD_LABELS[fusionMethod]?.label}</button>
        </div>
      )}

      {/* ── Thinking / Done ────────────────────────────────────────────── */}
      {phase !== 'idle' && (
        <>
          {/* Method badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>METHOD</span>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 10,
              fontFamily: 'var(--font-mono)', fontWeight: 600,
              background: 'rgba(0,229,255,0.1)', color: 'var(--cyan)',
              border: '1px solid rgba(0,229,255,0.25)',
            }}>{METHOD_LABELS[fusionMethod]?.label?.toUpperCase() || fusionMethod.toUpperCase()}</span>
          </div>

          {/* Agent cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {AGENTS.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                state={agentStates[agent.id]}
                apiWeight={consensusResult?.agentWeights?.[agent.id]}
              />
            ))}
          </div>

          {/* ── Consensus result ────────────────────────────────────────── */}
          {consensusResult && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <Card title="Consensus Result">
                {/* Risk level badge */}
                {riskStyle && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 5, marginBottom: 14,
                    background: riskStyle.bg, color: riskStyle.color,
                    border: `1px solid ${riskStyle.color}44`,
                    fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                  }}>
                    {riskStyle.label}
                    {consensusResult.requiresDoctorReview && (
                      <span style={{ marginLeft: 8, opacity: 0.7 }}>· DOCTOR REVIEW REQUIRED</span>
                    )}
                  </div>
                )}

                {/* Agreement meter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      width: `${consensusResult.agreementScore}%`, height: '100%',
                      background: 'linear-gradient(90deg, var(--green), var(--cyan))', borderRadius: 4,
                      animation: 'grow-bar 1s ease both',
                    }} />
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)', minWidth: 52 }}>
                    {consensusResult.agreementScore}%
                  </span>
                </div>

                {/* API fused confidence (extra row when API succeeded) */}
                {consensusResult.fusedConfidence !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        width: `${consensusResult.fusedConfidence}%`, height: '100%',
                        background: 'var(--cyan)', borderRadius: 2,
                        animation: 'grow-bar 1s ease both',
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', minWidth: 52 }}>
                      {consensusResult.fusedConfidence}% <span style={{ fontSize: 9, opacity: 0.6 }}>API</span>
                    </span>
                  </div>
                )}

                {/* Dissent box */}
                <div style={{
                  background: 'rgba(255,183,77,0.06)', border: '1px solid rgba(255,183,77,0.2)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 600, marginBottom: 5 }}>
                    ⚠ DISSENT PRESERVED — Pathology AI
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                    {consensusResult.dissentNote}
                  </p>
                </div>

                {/* API diagnosis (if available) */}
                {consensusResult.apiDiagnosis && (
                  <div style={{
                    background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 14,
                  }}>
                    <div style={{ fontSize: 9, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>API DIAGNOSIS</div>
                    <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                      {consensusResult.apiDiagnosis}
                    </p>
                    {consensusResult.apiRecommendation && (
                      <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, marginTop: 6, borderTop: '1px solid rgba(0,229,255,0.1)', paddingTop: 6 }}>
                        {consensusResult.apiRecommendation}
                      </p>
                    )}
                  </div>
                )}

                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 14 }}>
                  {consensusResult.summary}
                </p>

                {/* Output grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { k: 'Recommended plan', v: `Scenario ${consensusResult.recommendedScenario} — Targeted` },
                    { k: 'Primary drug',     v: consensusResult.primaryDrug },
                    { k: 'Next checkpoint',  v: consensusResult.nextCheckpoint },
                    { k: 'Conditional gate', v: consensusResult.conditionalAction },
                  ].map(item => (
                    <div key={item.k} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>{item.k}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── Compare all methods ─────────────────────────────────── */}
              {!showCompare && (
                <button
                  onClick={handleCompare}
                  disabled={comparing}
                  style={{
                    padding: '10px 18px', borderRadius: 8, cursor: comparing ? 'default' : 'pointer',
                    background: 'transparent', border: '1px solid var(--border2)',
                    color: 'var(--cyan)', fontSize: 12, fontWeight: 600,
                    fontFamily: 'var(--font-display)', opacity: comparing ? 0.6 : 1,
                  }}
                >
                  {comparing ? '⟳ Running all methods…' : t('compareAllMethods')}
                </button>
              )}

              {showCompare && allMethodResults && (
                <Card title="All Methods Comparison">
                  <CompareGrid allResults={allMethodResults} />
                </Card>
              )}

              {/* ── Action buttons ───────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { reset(); onReset() }} style={{
                  padding: '11px 20px', borderRadius: 10, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border2)',
                  color: 'var(--cyan)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                }}>{t('newScan')}</button>
                <button onClick={run} style={{
                  flex: 1, padding: '11px 20px', borderRadius: 10, cursor: 'pointer',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                }}>{t('rerunConsensus')}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
