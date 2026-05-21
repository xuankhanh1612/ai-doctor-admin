import React from 'react'
import { AGENTS, CONSENSUS } from '../data/mockData.js'
import { useConsensus } from '../hooks/useConsensus.js'

const COLOR_MAP = {
  cyan:   { bg: 'rgba(0,229,255,0.1)',   color: 'var(--cyan)',   border: 'rgba(0,229,255,0.25)'   },
  violet: { bg: 'rgba(156,111,255,0.1)', color: 'var(--violet)', border: 'rgba(156,111,255,0.25)' },
  pink:   { bg: 'rgba(244,143,177,0.1)', color: 'var(--pink)',   border: 'rgba(244,143,177,0.25)' },
  green:  { bg: 'rgba(0,230,118,0.1)',   color: 'var(--green)',  border: 'rgba(0,230,118,0.25)'   },
}

function AgentCard({ agent, state }) {
  const c = COLOR_MAP[agent.color]
  const status = state?.status || 'waiting'
  const step = state?.thinkingStep ?? -1

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
        {/* Vote badge */}
        {status === 'done' && (
          <span style={{
            padding: '3px 9px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600,
            background: agent.vote === 'agree' ? 'rgba(0,230,118,0.12)' : 'rgba(255,183,77,0.12)',
            color: agent.vote === 'agree' ? 'var(--green)' : 'var(--amber)',
            border: `1px solid ${agent.vote === 'agree' ? 'rgba(0,230,118,0.3)' : 'rgba(255,183,77,0.3)'}`,
          }}>
            {agent.vote === 'agree' ? '✓ AGREE' : '⚠ FLAG'}
          </span>
        )}
      </div>

      {/* Thinking state */}
      {status === 'thinking' && (
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: c.color }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, animation: 'pulse-dot 1s infinite' }} />
            Deliberating…
          </div>
          <div style={{ color: 'var(--text3)', fontSize: 10 }}>
            {agent.thinking[step] || agent.thinking[0]}
          </div>
        </div>
      )}

      {/* Done state */}
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
          <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${agent.confidence}%`, height: '100%', background: c.color, borderRadius: 2, animation: 'grow-bar 0.8s ease both' }} />
          </div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: c.color, marginTop: 4, textAlign: 'right' }}>
            {agent.confidence}% confidence
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

export default function ConsensusPanel({ onReset }) {
  const { phase, agentStates, consensusResult, run, reset } = useConsensus()

  return (
    <div className="animate-fade" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Agent Consensus</h2>
          <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>
            4 specialist agents deliberate in parallel · Meta-agent synthesizes unified recommendation
          </p>
        </div>
        {phase === 'done' && (
          <span style={{
            padding: '4px 12px', borderRadius: 5, fontSize: 10, fontFamily: 'var(--font-mono)',
            background: 'rgba(0,230,118,0.1)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.25)',
          }}>CONSENSUS REACHED</span>
        )}
      </div>

      {/* Run button */}
      {phase === 'idle' && (
        <button onClick={run} style={{
          padding: '16px 28px', borderRadius: 12, cursor: 'pointer',
          background: 'linear-gradient(135deg, var(--cyan2), var(--violet2))',
          color: '#fff', fontSize: 15, fontWeight: 700,
          border: 'none', fontFamily: 'var(--font-display)',
          letterSpacing: '0.03em',
        }}>▶ Run Agent Consensus</button>
      )}

      {phase !== 'idle' && (
        <>
          {/* Agent cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {AGENTS.map(agent => (
              <AgentCard key={agent.id} agent={agent} state={agentStates[agent.id]} />
            ))}
          </div>

          {/* Consensus result */}
          {consensusResult && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Agreement meter */}
              <Card title="Consensus Result">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
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

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { reset(); onReset(); }} style={{
                  padding: '11px 20px', borderRadius: 10, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border2)',
                  color: 'var(--cyan)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                }}>← New Scan</button>
                <button onClick={run} style={{
                  flex: 1, padding: '11px 20px', borderRadius: 10, cursor: 'pointer',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                }}>↺ Re-run Consensus</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
