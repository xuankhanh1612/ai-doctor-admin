import { useState, useCallback, useRef } from 'react'
import { AGENTS, CONSENSUS } from '../data/mockData.js'

export function useConsensus() {
  const [phase, setPhase] = useState('idle') // idle | thinking | done
  const [agentStates, setAgentStates] = useState({})
  const [consensusResult, setConsensusResult] = useState(null)
  const timers = useRef([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const run = useCallback(() => {
    clearTimers()
    setPhase('thinking')
    setConsensusResult(null)

    const initial = {}
    AGENTS.forEach(a => {
      initial[a.id] = { status: 'waiting', thinkingStep: -1, output: null }
    })
    setAgentStates(initial)

    // Stagger agent starts
    AGENTS.forEach((agent, agentIdx) => {
      const startDelay = agentIdx * 600

      // Start thinking
      const t0 = setTimeout(() => {
        setAgentStates(prev => ({
          ...prev,
          [agent.id]: { status: 'thinking', thinkingStep: 0, output: null }
        }))
      }, startDelay)
      timers.current.push(t0)

      // Advance thinking steps
      agent.thinking.forEach((_, stepIdx) => {
        if (stepIdx === 0) return
        const t = setTimeout(() => {
          setAgentStates(prev => ({
            ...prev,
            [agent.id]: { ...prev[agent.id], thinkingStep: stepIdx }
          }))
        }, startDelay + stepIdx * 480)
        timers.current.push(t)
      })

      // Done
      const doneDelay = startDelay + agent.thinking.length * 480 + 300
      const tDone = setTimeout(() => {
        setAgentStates(prev => ({
          ...prev,
          [agent.id]: { status: 'done', thinkingStep: agent.thinking.length - 1, output: agent.output }
        }))
      }, doneDelay)
      timers.current.push(tDone)
    })

    // Consensus after all agents done
    const maxDelay = AGENTS.reduce((max, a, i) => {
      const d = i * 600 + a.thinking.length * 480 + 300
      return Math.max(max, d)
    }, 0)

    const tConsensus = setTimeout(() => {
      setPhase('done')
      setConsensusResult(CONSENSUS)
    }, maxDelay + 800)
    timers.current.push(tConsensus)
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setPhase('idle')
    setAgentStates({})
    setConsensusResult(null)
  }, [])

  return { phase, agentStates, consensusResult, run, reset }
}
