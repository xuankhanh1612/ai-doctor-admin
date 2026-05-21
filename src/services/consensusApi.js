/**
 * consensusApi.js
 * ──────────────────────────────────────────────────────────────────
 * Thin client for the FastAPI Consensus Engine
 * Base URL: http://127.0.0.1:8000  (override via VITE_CONSENSUS_API_URL)
 *
 * Exports:
 *   runConsensus(patientId, agentPredictions, method?)
 *   compareAllMethods(patientId, agentPredictions)
 *   fetchMethods()
 *   healthCheck()
 *   agentsToPayload(agents)   ← converts AGENTS mock format → API schema
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
 * Convert AGENTS array (from mockData.js) into the API payload format.
 * Each AGENT has: { id, confidence (0-100), output.summary, output.keyFindings, vote }
 */
export function agentsToPayload(agents) {
  return agents.map(a => ({
    agent_id:   a.id,
    specialty:  a.id,
    diagnosis:  a.output?.summary?.slice(0, 140) || a.role,
    confidence: +(a.confidence / 100).toFixed(4),
    metadata: {
      key_findings:   a.output?.keyFindings  || [],
      recommendation: a.output?.recommendation || '',
      vote:           a.vote || 'agree',
    },
  }))
}

/**
 * Run consensus with one method.
 * @param {string} patientId
 * @param {Array}  agentPredictions  - use agentsToPayload(AGENTS) to build this
 * @param {'bayesian'|'weighted'|'majority'|'graph'} method
 */
export async function runConsensus(patientId, agentPredictions, method = 'bayesian') {
  return _post('/api/v1/consensus', {
    patient_id:  patientId,
    session_id:  `SESS-${Date.now()}`,
    method,
    run_all:     false,
    predictions: agentPredictions,
  })
}

/**
 * Run all 4 methods and return side-by-side comparison (all_results populated).
 */
export async function compareAllMethods(patientId, agentPredictions) {
  return _post('/api/v1/consensus/compare', {
    patient_id:  patientId,
    session_id:  `SESS-${Date.now()}`,
    method:      'bayesian',
    run_all:     true,
    predictions: agentPredictions,
  })
}

export async function fetchMethods() {
  return _get('/api/v1/consensus/methods')
}

export async function healthCheck() {
  return _get('/health')
}
