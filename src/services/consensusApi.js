/**
 * consensusApi.js
 * ─────────────────────────────────────────────────────────────────
 * Thin client for the FastAPI Consensus Engine
 * Base URL: http://127.0.0.1:8000  (override via VITE_CONSENSUS_API_URL)
 *
 * Exports:
 *   agentsToPayload(agents)                         ← AGENTS[] → API schema
 *   runConsensus(patientId, predictions, method?)   → ConsensusResponse
 *   compareAllMethods(patientId, predictions)       → ConsensusResponse (all_results)
 *   fetchMethods()
 *   healthCheck()
 */

const BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONSENSUS_API_URL)
    ? import.meta.env.VITE_CONSENSUS_API_URL
    : 'http://127.0.0.1:8000'

async function _post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

async function _get(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Convert AGENTS array (mockData.js format) → FastAPI AgentPrediction[]
 * AGENT shape: { id, confidence (0-100), output.summary, output.keyFindings, vote }
 */
export function agentsToPayload(agents) {
  return agents.map(a => ({
    agent_id:   a.id,
    specialty:  a.id,
    diagnosis:  (a.output?.summary || a.role || '').slice(0, 140),
    confidence: +(a.confidence / 100).toFixed(4),
    metadata: {
      key_findings:   a.output?.keyFindings   || [],
      recommendation: a.output?.recommendation || '',
      vote:           a.vote || 'agree',
    },
  }))
}

export async function runConsensus(patientId, predictions, method = 'bayesian') {
  return _post('/api/v1/consensus', {
    patient_id:  patientId,
    session_id:  `SESS-${Date.now()}`,
    method,
    run_all:     false,
    predictions,
  })
}

export async function compareAllMethods(patientId, predictions) {
  return _post('/api/v1/consensus/compare', {
    patient_id:  patientId,
    session_id:  `SESS-${Date.now()}`,
    method:      'bayesian',
    run_all:     true,
    predictions,
  })
}

export async function fetchMethods() {
  return _get('/api/v1/consensus/methods')
}

export async function healthCheck() {
  return _get('/health')
}
