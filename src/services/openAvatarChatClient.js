// Real client for OpenAvatarChat's WebSocket session port.
// Protocol implemented from the project's own source
// (src/handlers/client/ws_client/{ws_message_protocol.py,ws_input_delegate.py}):
//   - one WebSocket per session: ws(s)://<host>/ws/session/<session_id>
//   - every message is JSON: { header: { name, request_id }, payload }
//   - handshake:  client -> InitializeAvatarSession  /  server -> AvatarSessionInitialized
//   - mic upload: client -> SendHumanAudio (transport: 'base64', format: 'PCM', 16kHz mono Int16)
//   - text chat:  client -> SendHumanText (mode: 'full_text', end_of_speech: true)
//   - server -> EchoHumanText (ASR), EchoAvatarText (LLM), EchoAvatarAudio (TTS, base64 PCM)
//   - keep-alive: client -> TriggerHeartbeat  /  server -> AvatarHeartbeat
//   - barge-in:   client -> Interrupt  /  server -> InterruptAccepted | InterruptNotification
//
// This client only speaks the base64 JSON transport (a first-class transport in the
// server's own code, not a workaround), which keeps it dependency-free in the browser.
// It does not attempt to decode "MotionData" frames: rendering the Gaussian-splat
// avatar itself requires OpenAvatarChat's dedicated WebGL renderer, which ships
// separately and isn't vendored here. This client still gives you the real
// text + speech conversation loop against a live OpenAvatarChat backend.

const MSG = {
  INITIALIZE_AVATAR_SESSION: 'InitializeAvatarSession',
  SEND_HUMAN_AUDIO: 'SendHumanAudio',
  SEND_HUMAN_TEXT: 'SendHumanText',
  TRIGGER_HEARTBEAT: 'TriggerHeartbeat',
  INTERRUPT: 'Interrupt',

  AVATAR_SESSION_INITIALIZED: 'AvatarSessionInitialized',
  ECHO_HUMAN_TEXT: 'EchoHumanText',
  ECHO_AVATAR_TEXT: 'EchoAvatarText',
  ECHO_AVATAR_AUDIO: 'EchoAvatarAudio',
  AVATAR_HEARTBEAT: 'AvatarHeartbeat',
  INTERRUPT_ACCEPTED: 'InterruptAccepted',
  INTERRUPT_NOTIFICATION: 'InterruptNotification',
  ERROR: 'Error',
  MOTION_DATA_WELCOME: 'MotionDataWelcome',
  MOTION_DATA: 'MotionData',
}

const MIC_SAMPLE_RATE = 16000
const HEARTBEAT_MS = 15000

function uuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function makeHeader(name, requestId = uuid()) {
  return { header: { name, request_id: requestId } }
}

function base64FromInt16(int16Array) {
  const bytes = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function bytesFromBase64(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function downsampleTo16k(float32Data, inputSampleRate) {
  if (inputSampleRate === MIC_SAMPLE_RATE) return float32Data
  const ratio = inputSampleRate / MIC_SAMPLE_RATE
  const outLength = Math.round(float32Data.length / ratio)
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    out[i] = float32Data[Math.min(float32Data.length - 1, Math.round(i * ratio))]
  }
  return out
}

function floatToInt16(float32Data) {
  const out = new Int16Array(float32Data.length)
  for (let i = 0; i < float32Data.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Data[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function rms(int16Array) {
  if (!int16Array.length) return 0
  let sum = 0
  for (let i = 0; i < int16Array.length; i++) sum += int16Array[i] * int16Array[i]
  return Math.sqrt(sum / int16Array.length) / 32768
}

export const CONNECTION_STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  INITIALIZING: 'initializing',
  READY: 'ready',
  CLOSED: 'closed',
  ERROR: 'error',
}

export default class OpenAvatarChatClient {
  constructor({
    onStateChange, onHumanText, onAvatarText, onAvatarAudioLevel,
    onMicLevel, onError, onInterrupted,
  } = {}) {
    this.ws = null
    this.sessionId = uuid()
    this.state = CONNECTION_STATE.IDLE
    this.heartbeatTimer = null
    this.textStreamKey = null

    // mic capture
    this.audioContext = null
    this.micStream = null
    this.micSourceNode = null
    this.micProcessorNode = null
    this.micEnabled = false

    // avatar audio playback
    this.playbackContext = null
    this.playbackCursor = 0
    // Streamed PCM16 chunks aren't guaranteed to split on 2-byte (sample) boundaries.
    // A leftover single byte carried over to the next chunk keeps Int16 alignment
    // correct — without this, one misaligned chunk permanently shifts every sample
    // after it, which renders as garbled/pitchy audio that can sound like "no known language".
    this.playbackLeftoverByte = null

    this.onStateChange = onStateChange || (() => {})
    this.onHumanText = onHumanText || (() => {})
    this.onAvatarText = onAvatarText || (() => {})
    this.onAvatarAudioLevel = onAvatarAudioLevel || (() => {})
    this.onMicLevel = onMicLevel || (() => {})
    this.onError = onError || (() => {})
    this.onInterrupted = onInterrupted || (() => {})
  }

  _setState(state) {
    this.state = state
    this.onStateChange(state)
  }

  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      const base = serverUrl.replace(/\/+$/, '')
      const wsUrl = `${base}/ws/session/${this.sessionId}`
      this._setState(CONNECTION_STATE.CONNECTING)

      let ws
      try {
        ws = new WebSocket(wsUrl)
      } catch (err) {
        this._setState(CONNECTION_STATE.ERROR)
        reject(err)
        return
      }
      this.ws = ws

      ws.onopen = () => {
        this._setState(CONNECTION_STATE.INITIALIZING)
        this._send({
          ...makeHeader(MSG.INITIALIZE_AVATAR_SESSION),
          payload: {
            audio: { format: 'PCM', sample_rate: MIC_SAMPLE_RATE, channels: 1 },
            subscriptions: ['human_text', 'avatar_text', 'avatar_audio'],
          },
        })
      }

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return // binary MotionData frames are not decoded here
        let msg
        try { msg = JSON.parse(event.data) } catch { return }
        this._handleMessage(msg, resolve)
      }

      ws.onerror = () => {
        this._setState(CONNECTION_STATE.ERROR)
        this.onError(new Error('WebSocket error — kiểm tra server URL và CORS/SSL.'))
        reject(new Error('WebSocket error'))
      }

      ws.onclose = () => {
        this._stopHeartbeat()
        this._setState(CONNECTION_STATE.CLOSED)
      }
    })
  }

  _handleMessage(msg, resolveConnect) {
    const name = msg?.header?.name
    const payload = msg?.payload || {}
    switch (name) {
      case MSG.AVATAR_SESSION_INITIALIZED:
        this._setState(CONNECTION_STATE.READY)
        this._startHeartbeat()
        resolveConnect?.(true)
        break
      case MSG.ECHO_HUMAN_TEXT:
        this.onHumanText({ text: payload.text, endOfSpeech: !!payload.end_of_speech })
        break
      case MSG.ECHO_AVATAR_TEXT:
        this.onAvatarText({ text: payload.text, mode: payload.mode, endOfSpeech: !!payload.end_of_speech })
        break
      case MSG.ECHO_AVATAR_AUDIO:
        this._playAvatarAudio(payload)
        break
      case MSG.AVATAR_HEARTBEAT:
        break
      case MSG.INTERRUPT_ACCEPTED:
      case MSG.INTERRUPT_NOTIFICATION:
        this.playbackLeftoverByte = null
        this.onInterrupted()
        break
      case MSG.ERROR:
        this.onError(new Error(payload.message || 'Server reported an error'))
        break
      default:
        break // MotionDataWelcome / MotionData / unknown types are ignored by this lightweight client
    }
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj))
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this._send(makeHeader(MSG.TRIGGER_HEARTBEAT))
    }, HEARTBEAT_MS)
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  // ---- Text chat ----
  sendText(text) {
    if (!text || !text.trim()) return
    this.textStreamKey = `client_text_${uuid()}`
    this._send({
      ...makeHeader(MSG.SEND_HUMAN_TEXT),
      payload: {
        stream_key: this.textStreamKey,
        mode: 'full_text',
        text: text.trim(),
        end_of_speech: true,
      },
    })
  }

  interrupt() {
    this._send(makeHeader(MSG.INTERRUPT))
  }

  // ---- Mic capture -> SendHumanAudio (base64 PCM16 @16kHz mono) ----
  async startMic() {
    if (this.micEnabled) return
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: false, autoGainControl: false },
    })
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    this.audioContext = new AudioCtx()
    this.micSourceNode = this.audioContext.createMediaStreamSource(this.micStream)
    // ScriptProcessorNode is deprecated but has no dependency-free universal
    // replacement for raw PCM taps across browsers; buffer size chosen for ~85ms chunks.
    this.micProcessorNode = this.audioContext.createScriptProcessor(4096, 1, 1)
    const inputRate = this.audioContext.sampleRate

    this.micProcessorNode.onaudioprocess = (evt) => {
      if (!this.micEnabled) return
      const input = evt.inputBuffer.getChannelData(0)
      const downsampled = downsampleTo16k(input, inputRate)
      const int16 = floatToInt16(downsampled)
      this.onMicLevel(rms(int16))
      this._send({
        ...makeHeader(MSG.SEND_HUMAN_AUDIO),
        payload: {
          transport: 'base64',
          format: 'PCM',
          data_base64: base64FromInt16(int16),
        },
      })
    }

    this.micSourceNode.connect(this.micProcessorNode)
    this.micProcessorNode.connect(this.audioContext.destination)
    this.micEnabled = true
  }

  stopMic() {
    this.micEnabled = false
    this.onMicLevel(0)
    try { this.micProcessorNode?.disconnect() } catch { /* noop */ }
    try { this.micSourceNode?.disconnect() } catch { /* noop */ }
    try { this.micStream?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    this.micProcessorNode = null
    this.micSourceNode = null
    this.micStream = null
  }

  // ---- Avatar (TTS) audio playback ----
  _playAvatarAudio(payload) {
    if (!payload?.data_base64) return
    if ((payload.format || 'PCM').toUpperCase() !== 'PCM') {
      // OPUS decoding is intentionally out of scope for this lightweight client.
      return
    }
    const sampleRate = payload.sample_rate || 24000
    let bytes = bytesFromBase64(payload.data_base64)

    if (this.playbackLeftoverByte) {
      const merged = new Uint8Array(this.playbackLeftoverByte.length + bytes.length)
      merged.set(this.playbackLeftoverByte, 0)
      merged.set(bytes, this.playbackLeftoverByte.length)
      bytes = merged
      this.playbackLeftoverByte = null
    }
    if (bytes.length % 2 !== 0) {
      this.playbackLeftoverByte = bytes.slice(bytes.length - 1)
      bytes = bytes.slice(0, bytes.length - 1)
    }
    if (payload.end_of_speech) this.playbackLeftoverByte = null // don't carry a stray byte into the next turn
    if (!bytes.length) return

    const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2)
    this.onAvatarAudioLevel(rms(int16))

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!this.playbackContext) {
      this.playbackContext = new AudioCtx()
      this.playbackCursor = this.playbackContext.currentTime
    }
    const ctx = this.playbackContext
    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768
    const buffer = ctx.createBuffer(1, float32.length, sampleRate)
    buffer.copyToChannel(float32, 0)

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    const startAt = Math.max(ctx.currentTime, this.playbackCursor)
    source.start(startAt)
    this.playbackCursor = startAt + buffer.duration

    if (payload.end_of_speech) {
      setTimeout(() => this.onAvatarAudioLevel(0), Math.max(0, (this.playbackCursor - ctx.currentTime) * 1000))
    }
  }

  disconnect() {
    this.stopMic()
    this._stopHeartbeat()
    try { this.ws?.close() } catch { /* noop */ }
    this.ws = null
    this._setState(CONNECTION_STATE.CLOSED)
  }
}
