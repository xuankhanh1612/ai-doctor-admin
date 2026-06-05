# InBody Gamification Module
## Tích hợp vào AI Clinic Doctor (Next.js)

### Cấu trúc files

```
inbody-gamification/
├── components/
│   └── InBodyDashboard.jsx     # Component chính
├── app/
│   └── api/
│       └── inbody-analyze/
│           └── route.js        # API route phân tích ảnh
└── lib/
    └── inbody-db.js            # Gamification engine + DB helpers
```

---

### 1. Cài đặt dependencies

```bash
npm install @anthropic-ai/sdk recharts react-chartjs-2 chart.js
# Nếu dùng Prisma:
npm install @prisma/client prisma
```

---

### 2. Biến môi trường (.env.local)

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
```

---

### 3. Thêm vào app/page.jsx (hoặc bất kỳ page nào)

```jsx
import InBodyDashboard from '@/components/InBodyDashboard';

// Lấy records từ DB
const records = await prisma.inBodyRecord.findMany({
  where: { userId: session.user.id },
  orderBy: { date: 'asc' },
});

export default function Page() {
  return (
    <div>
      <InBodyDashboard
        userId={session.user.id}
        initialRecords={records}
      />
    </div>
  );
}
```

---

### 4. Luồng hoạt động

```
Bệnh nhân upload ảnh InBody
         ↓
/api/inbody-analyze  (Next.js route)
         ↓
Claude Vision (claude-opus-4-5) phân tích
         ↓
Trả về: metrics + summary + tags + XP
         ↓
Lưu InBodyRecord vào DB
         ↓
Cập nhật UserGameProfile (level, XP, achievements)
         ↓
Dashboard hiển thị: Hero card, quests, badges
```

---

### 5. Các loại file InBody hỗ trợ

| File | Cách xử lý |
|------|-----------|
| JPG/PNG (ảnh chụp) | Claude Vision đọc trực tiếp |
| PDF (từ LookinBody) | Claude Vision đọc PDF |
| CSV (export LookinBody) | Parse CSV, không cần Vision |

Với CSV, thêm parser:
```js
// lib/inbody-csv-parser.js
export function parseInBodyCSV(csvText) {
  const lines = csvText.split('\n');
  // Headers thường là: Date, Weight, SMM, PBF, TBW, BMI, Score...
  // Map column names sang schema của bạn
}
```

---

### 6. Gamification design

| Hành động | XP |
|-----------|-----|
| Scan InBody lần đầu | +50 XP |
| Mỗi lần scan | +50 XP |
| Tăng 1kg cơ | +100 XP |
| Giảm 1% mỡ | +80 XP |
| InBody Score tăng 1 điểm | +10 XP |
| Hoàn thành quest | +80–200 XP |

Level thresholds: 0 → 100 → 250 → 500 → 900 → 1400 → 2000 → ...

---

### 7. Tích hợp với AI Doctor agents

Module InBody có thể gửi data cho AI Doctor để tư vấn:

```js
// Trong AI Doctor conversation context
const inbodyContext = {
  latestRecord: records[records.length - 1],
  trend: {
    muscleGain: latest.muscle - first.muscle,
    fatLoss: first.fat - latest.fat,
  },
  level: calcLevel(totalXP),
};

// Pass vào system prompt của AI Doctor
const systemPrompt = `
Bệnh nhân có dữ liệu InBody: ${JSON.stringify(inbodyContext)}
Hãy đưa ra tư vấn sức khỏe phù hợp với thành phần cơ thể hiện tại.
`;
```
