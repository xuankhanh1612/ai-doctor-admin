/**
 * useConsensus.js  v2 — API-connected, drop-in compatible
 * ─────────────────────────────────────────────────────────────────
 * Same public API as v1:
 *   { phase, agentStates, consensusResult, run, reset }
 *
 * New additions (non-breaking — ConsensusPanel works unchanged):
 *   apiStatus        'idle' | 'loading' | 'success' | 'error'
 *   apiError         error string when call fails
 *   apiResult        raw ConsensusResponse from backend
 *   fusionMethod     selected method string
 *   setFusionMethod  setter
 *   allMethodResults populated after compareAll()
 *   compareAll()     runs all 4 methods and sets allMethodResults
 *
 * Behaviour:
 *   1. Agent animation runs exactly as before (staggered thinking steps).
 *   2. API call fires in parallel.
 *   3. consensusResult is set only when BOTH animation AND API finish.
 *   4. If the API is unreachable, consensusResult falls back to the CONSENSUS
 *      mock — the UI never breaks. apiError carries the reason.
 */

import { useState, useCallback, useRef } from 'react'
import { AGENTS, CONSENSUS } from '../data/mockData.js'
import {
  runConsensus,
  compareAllMethods,
  agentsToPayload,
} from '../services/consensusApi.js'

const PATIENT_ID = 'LXK-2024'

const RISK_COLORS = {
  low:      'var(--green)',
  moderate: 'var(--amber)',
  high:     '#ff9800',
  critical: 'var(--pink)',
}

/** Merge real API numbers into the existing mock consensus shape */
function mergeResult(apiResp, mockConsensus) {
  if (!apiResp?.result) return mockConsensus
  const r = apiResp.result
  return {
    ...mockConsensus,
    // Override with live numbers
    agreementScore:       +(r.agreement_score * 100).toFixed(1),
    fusedConfidence:      +(r.fused_confidence * 100).toFixed(1),
    riskLevel:            apiResp.risk_level,
    riskColor:            RISK_COLORS[apiResp.risk_level] || 'var(--cyan)',
    requiresDoctorReview: apiResp.requires_doctor_review,
    fusionMethod:         r.method,
    dominantAgent:        r.dominant_agent,
    apiDiagnosis:         r.diagnosis,
    apiRecommendation:    r.recommendation,
    timestamp:            apiResp.timestamp,
    agentWeights: Object.fromEntries(
      (r.agent_weights || []).map(w => [
        w.agent_id,
        { weight: w.weight, contribution: w.contribution, apiConfidence: w.confidence },
      ])
    ),
  }
}

export function useConsensus() {
  // ── Original state (names unchanged) ──────────────────────────────────
  const [phase,           setPhase]           = useState('idle')
  const [agentStates,     setAgentStates]     = useState({})
  const [consensusResult, setConsensusResult] = useState(null)
  const timers = useRef([])

  // ── New API state ──────────────────────────────────────────────────────
  const [apiStatus,        setApiStatus]        = useState('idle')
  const [apiError,         setApiError]         = useState(null)
  const [apiResult,        setApiResult]        = useState(null)
  const [fusionMethod,     setFusionMethod]     = useState('bayesian')
  const [allMethodResults, setAllMethodResults] = useState(null)

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // ── Shared animation runner ────────────────────────────────────────────
  function animate(onAllDone) {
    const initial = {}
    AGENTS.forEach(a => {
      initial[a.id] = { status: 'waiting', thinkingStep: -1, output: null }
    })
    setAgentStates(initial)

    AGENTS.forEach((agent, idx) => {
      const start = idx * 600

      timers.current.push(
        setTimeout(() =>
          setAgentStates(prev => ({
            ...prev,
            [agent.id]: { status: 'thinking', thinkingStep: 0, output: null },
          })), start)
      )

      agent.thinking.forEach((_, stepIdx) => {
        if (stepIdx === 0) return
        timers.current.push(
          setTimeout(() =>
            setAgentStates(prev => ({
              ...prev,
              [agent.id]: { ...prev[agent.id], thinkingStep: stepIdx },
            })), start + stepIdx * 480)
        )
      })

      timers.current.push(
        setTimeout(() =>
          setAgentStates(prev => ({
            ...prev,
            [agent.id]: { status: 'done', thinkingStep: agent.thinking.length - 1, output: agent.output },
          })), start + agent.thinking.length * 480 + 300)
      )
    })

    const maxDelay = AGENTS.reduce((m, a, i) =>
      Math.max(m, i * 600 + a.thinking.length * 480 + 300), 0)

    timers.current.push(setTimeout(onAllDone, maxDelay + 800))
  }

  // ── run() ──────────────────────────────────────────────────────────────
  const run = useCallback(() => {
    clearTimers()
    setPhase('thinking')
    setConsensusResult(null)
    setApiResult(null)
    setApiError(null)
    setApiStatus('loading')
    setAllMethodResults(null)

    let animDone    = false
    let fetchedData = null   // null means API hasn't responded yet

    function tryFinish() {
      // Wait until both animation and fetch are settled
      if (!animDone || fetchedData === undefined) return
      const merged = mergeResult(fetchedData, CONSENSUS)
      setConsensusResult(merged)
      setPhase('done')
    }

    // Start animation — signal with undefined sentinel before fetch resolves
    fetchedData = undefined
    animate(() => {
      animDone = true
      tryFinish()
    })

    // Fire API call in parallel
    runConsensus(PATIENT_ID, agentsToPayload(AGENTS), fusionMethod)
      .then(data => {
        setApiResult(data)
        setApiStatus('success')
        fetchedData = data
        tryFinish()
      })
      .catch(err => {
        console.warn('[useConsensus] API unreachable — using mock data:', err.message)
        setApiError(err.message)
        setApiStatus('error')
        fetchedData = null   // null → mergeResult returns CONSENSUS mock
        tryFinish()
      })
  }, [fusionMethod])

  // ── compareAll() ───────────────────────────────────────────────────────
  const compareAll = useCallback(async () => {
    setApiStatus('loading')
    setApiError(null)
    try {
      const data = await compareAllMethods(PATIENT_ID, agentsToPayload(AGENTS))
      setAllMethodResults(data.all_results || null)
      setApiStatus('success')
      return data
    } catch (err) {
      setApiError(err.message)
      setApiStatus('error')
      return null
    }
  }, [])

  // ── reset() ────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setAgentStates({})
    setConsensusResult(null)
    setApiResult(null)
    setApiError(null)
    setApiStatus('idle')
    setAllMethodResults(null)
  }, [])

  return {
    // ── original (ConsensusPanel needs these, unchanged) ──
    phase, agentStates, consensusResult, run, reset,
    // ── new ───────────────────────────────────────────────
    apiStatus, apiError, apiResult,
    fusionMethod, setFusionMethod,
    allMethodResults, compareAll,
  }
}
