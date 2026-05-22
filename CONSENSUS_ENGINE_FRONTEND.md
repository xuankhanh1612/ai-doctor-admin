# Consensus Engine — Tích hợp Frontend (ai-doctor-admin)

> Hướng dẫn tích hợp FastAPI Consensus Engine vào React app `ai-doctor-admin`.  
> Stack: React 18 · Vite · JSX · CSS Variables (không dùng Tailwind).

---

## Files được thêm / thay đổi

```
ai-doctor-admin/
├── src/
│   ├── services/
│   │   └── consensusApi.js       ← MỚI: thin client gọi FastAPI
│   ├── hooks/
│   │   └── useConsensus.js       ← THAY: mock data → real API (drop-in)
│   └── components/
│       └── ConsensusPanel.jsx    ← NÂNG CẤP: hiển thị API data
├── vite.config.js                ← THAY: thêm dev proxy → :8000
└── .env.example                  ← MỚI: VITE_CONSENSUS_API_URL
```

Tất cả file khác trong project **không thay đổi**.

---

## Cài đặt & chạy

```bash
cd ai-doctor-admin

# Cài packages
npm install

# (Lần đầu) Copy env file
cp .env.example .env

# Chạy dev server
npm run dev
# → http://localhost:5173
```

**Yêu cầu:** FastAPI backend phải đang chạy ở `http://127.0.0.1:8000` trước khi mở app.  
Nếu backend offline, UI vẫn hoạt động bình thường với mock data — có badge cảnh báo.

---

## Biến môi trường

```bash
# .env
VITE_CONSENSUS_API_URL=http://127.0.0.1:8000
```

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `VITE_CONSENSUS_API_URL` | `http://127.0.0.1:8000` | URL của FastAPI backend |

Khi deploy production, đổi thành URL thật:

```bash
VITE_CONSENSUS_API_URL=https://api.your-domain.com
```

---

## Kiến trúc tích hợp

```
ConsensusPanel.jsx
       │
       ▼
useConsensus.js  (hook)
       │
       ├── Animation layer  (staggered agent thinking — giữ nguyên như v1)
       │
       └── API layer  (song song với animation)
               │
               ▼
       consensusApi.js  (service)
               │
               ▼
       FastAPI  http://127.0.0.1:8000
       POST /api/v1/consensus
       POST /api/v1/consensus/compare
```

---

## `consensusApi.js` — Service layer

File: `src/services/consensusApi.js`

### Hàm export

```js
// Chuyển AGENTS[] từ mockData.js → payload đúng schema API
agentsToPayload(agents)

// Gọi 1 fusion method
runConsensus(patientId, predictions, method = 'bayesian')

// Gọi cả 4 methods, trả về all_results
compareAllMethods(patientId, predictions)

// GET /api/v1/consensus/methods
fetchMethods()

// GET /health
healthCheck()
```

### Ví dụ sử dụng trực tiếp

```js
import { agentsToPayload, runConsensus } from '../services/consensusApi.js'
import { AGENTS } from '../data/mockData.js'

const result = await runConsensus(
  'PAT-LXK-2024',
  agentsToPayload(AGENTS),
  'bayesian'
)

console.log(result.result.fused_confidence)  // 0.8964
console.log(result.risk_level)               // "high"
console.log(result.requires_doctor_review)   // false
```

### `agentsToPayload` — mapping mockData → API schema

AGENTS trong `mockData.js` có shape:
```js
{ id, confidence: 92, output: { summary, keyFindings, recommendation }, vote }
```

`agentsToPayload` chuyển thành:
```js
{
  agent_id:   "radiology",
  specialty:  "radiology",
  diagnosis:  "L1 shows 18% volumetric reduction...",  // output.summary slice(0,140)
  confidence: 0.92,                                    // confidence / 100
  metadata: {
    key_findings:   [...],
    recommendation: "...",
    vote:           "agree"
  }
}
```

---

## `useConsensus.js` — Hook v2

File: `src/hooks/useConsensus.js`

### API công khai (không thay đổi so với v1)

```js
const { phase, agentStates, consensusResult, run, reset } = useConsensus()
```

| Field | Type | Mô tả |
|-------|------|-------|
| `phase` | `'idle' \| 'thinking' \| 'done'` | Trạng thái animation |
| `agentStates` | `Record<agentId, AgentState>` | State từng agent card |
| `consensusResult` | `object \| null` | Merged mock + API result |
| `run()` | `() => void` | Bắt đầu animation + gọi API |
| `reset()` | `() => void` | Reset toàn bộ state |

### API mới (bổ sung, non-breaking)

```js
const {
  apiStatus,        // 'idle' | 'loading' | 'success' | 'error'
  apiError,         // string | null — lỗi nếu API unreachable
  apiResult,        // raw ConsensusResponse từ backend
  fusionMethod,     // 'bayesian' | 'weighted' | 'majority' | 'graph'
  setFusionMethod,  // (method: string) => void
  allMethodResults, // object | null — populated sau compareAll()
  compareAll,       // () => Promise<void>
} = useConsensus()
```

### Cơ chế hoạt động

```
run() được gọi
    │
    ├── setPhase('thinking')
    ├── [Animation] stagger 4 agent cards (600ms × index)
    │       ↓ xong sau ~5s
    │       animDone = true
    │       tryFinish()
    │
    └── [API] runConsensus() gọi FastAPI
            ↓ thường xong sau ~50ms
            fetchedData = apiResponse
            tryFinish()

tryFinish() → chỉ resolve khi CẢ HAI xong
    → setConsensusResult( merge(apiResponse, CONSENSUS_mock) )
    → setPhase('done')
```

Nếu API lỗi: `fetchedData = null` → `merge(null, CONSENSUS_mock)` trả về mock nguyên bản — UI không crash.

### `consensusResult` shape sau merge

```js
{
  // Từ mock CONSENSUS (giữ nguyên)
  recommendedScenario: 'B',
  primaryDrug: 'Erlotinib 150mg/day',
  nextCheckpoint: 'PET-CT at Week 6',
  conditionalAction: 'L2 biopsy at Week 8',
  summary: '...',
  dissentNote: '...',

  // Override bằng API (nếu API thành công)
  agreementScore: 87.5,           // r.agreement_score × 100
  fusedConfidence: 89.6,          // r.fused_confidence × 100
  riskLevel: 'high',              // apiResp.risk_level
  riskColor: 'var(--green)',
  requiresDoctorReview: false,
  fusionMethod: 'bayesian',
  dominantAgent: 'lab-gbm-v2',
  apiDiagnosis: '...',            // r.diagnosis
  apiRecommendation: '...',       // r.recommendation
  timestamp: '2024-05-21T...',
  agentWeights: {                 // keyed by agent_id
    'radiology': { weight, contribution, apiConfidence },
    'lab':       { weight, contribution, apiConfidence },
    ...
  }
}
```

---

## `ConsensusPanel.jsx` — Tính năng mới

### Method selector
Hiển thị trước khi bấm Run. Cho phép chọn 1 trong 4 fusion methods.

```
[ Bayesian ]  [ Weighted ]  [ Majority ]  [ Graph ]
▶ Run Agent Consensus · Bayesian
```

### API status badge
Góc phải header, cập nhật realtime:

| State | Badge |
|-------|-------|
| Đang gọi | `⟳ CALLING API…` (cyan) |
| Thành công | `✓ API CONNECTED` (green) |
| Lỗi | `⚠ API OFFLINE — using mock` (red) |

### Risk level badge
Hiển thị sau khi consensus xong:

```
[ HIGH RISK ]   hoặc   [ HIGH RISK · DOCTOR REVIEW REQUIRED ]
```

### Dual confidence bar
- Bar xanh lá: `agreementScore` (mock / tính từ API)
- Bar cyan nhỏ hơn: `fusedConfidence` từ Bayesian fusion — labeled `API`

### Compare all methods
Button xuất hiện sau khi có kết quả:

```
⊞ Compare all 4 fusion methods
```

Gọi `POST /api/v1/consensus/compare`, hiển thị grid 2×2:

```
┌─────────────┬─────────────┐
│ Bayesian ★  │  Weighted   │
│   89.6%     │   88.3%     │
│ agree 94.4% │ agree 94.4% │
├─────────────┼─────────────┤
│   Majority  │    Graph    │
│   68.0%     │   88.3%     │
│ agree 75.0% │ agree 94.4% │
└─────────────┴─────────────┘
```

---

## Dev proxy (vite.config.js)

Vite proxy giúp tránh CORS khi chạy dev — frontend gọi `/api/*` được tự động forward đến `:8000`:

```js
server: {
  proxy: {
    '/api':    { target: 'http://127.0.0.1:8000', changeOrigin: true },
    '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
  }
}
```

Khi build production, cần cấu hình reverse proxy (nginx / Vercel rewrites) tương đương.

---

## Chạy cả hai cùng lúc

```bash
# Terminal 1 — Backend
cd consensus_engine
uvicorn app.main:app --reload
# → http://127.0.0.1:8000

# Terminal 2 — Frontend
cd ai-doctor-admin
npm run dev
# → http://localhost:5173
```

Mở `http://localhost:5173` → Login → Sidebar **"Đồng thuận AI"** → chọn method → **▶ Run Agent Consensus**.

---

## Troubleshooting

### `⚠ API OFFLINE — using mock`
Backend chưa chạy hoặc sai port. Kiểm tra:
```bash
curl http://127.0.0.1:8000/health
# {"status":"ok","version":"1.0.0","methods":["bayesian","weighted","majority","graph"]}
```

### PostCSS error khi `npm run dev`
```bash
# Tạo file này trong ai-doctor-admin/ để override config của thư mục cha
echo "export default {}" > postcss.config.mjs
npm run dev
```

### CORS error trong browser
Đảm bảo vite proxy đang hoạt động — URL trong code phải là `/api/...` không phải `http://127.0.0.1:8000/api/...`.  
Hoặc đổi `BASE_URL` trong `consensusApi.js` về chuỗi rỗng `''` khi dùng proxy.

### Thay đổi backend URL
```bash
# .env
VITE_CONSENSUS_API_URL=http://your-server:8000
```
Restart `npm run dev` sau khi đổi `.env`.
