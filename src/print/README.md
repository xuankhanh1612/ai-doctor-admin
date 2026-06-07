# 🖨️ Print Module — Consensus Doctor

Bộ in tài liệu y tế gồm 3 template + trang PrintCenter preview.

## Cấu trúc file

```
print/
├── PrintCenter.jsx          ← Trang chính (sidebar + preview + nút in)
├── mockData.js              ← Dữ liệu mẫu cho cả 3 loại
├── usePrint.js              ← Hook in (nếu dùng độc lập)
├── README.md
└── templates/
    ├── ExamResultTemplate.jsx   ← Phiếu kết quả khám bệnh
    ├── PedigreeTemplate.jsx     ← Cây gia phả bệnh
    └── InBodyTemplate.jsx       ← Kết quả đo InBody
```

## Cài đặt vào dự án

### 1. Copy toàn bộ thư mục vào src/
```
src/
└── print/
    ├── PrintCenter.jsx
    ├── mockData.js
    ├── usePrint.js
    └── templates/
        ├── ExamResultTemplate.jsx
        ├── PedigreeTemplate.jsx
        └── InBodyTemplate.jsx
```

### 2. Thêm route vào App.jsx / router
```jsx
// src/App.jsx
import PrintCenter from './print/PrintCenter';

// Thêm vào routes:
{ path: '/print', element: <PrintCenter /> }

// Hoặc với react-router-dom:
<Route path="/print" element={<PrintCenter />} />
```

### 3. Thêm link điều hướng
```jsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
<button onClick={() => navigate('/print')}>🖨️ In tài liệu</button>
```

## Kết nối API thật

Thay mock data bằng API calls thật trong `PrintCenter.jsx`:

```jsx
// Ví dụ fetch kết quả khám theo patientId
const [examData, setExamData] = useState(null);

useEffect(() => {
  fetch(`/api/patients/${patientId}/exam-result`)
    .then(r => r.json())
    .then(setExamData);
}, [patientId]);

// Truyền vào template:
<ExamResultTemplate data={examData} clinic={clinicInfo} />
```

### Cấu trúc data mỗi template

#### ExamResultTemplate — cần object có:
```js
{
  patient: { id, name, dob, gender, phone, address, bhyt },
  visit: { date, time, doctor, specialty, visitCode },
  vitals: { height, weight, bmi, bloodPressure, heartRate, temperature, spO2 },
  chiefComplaint: string,
  diagnosis: [{ icd, name, type }],
  prescriptions: [{ stt, drug, qty, usage }],
  advice: string,
  nextVisit: string,
}
```

#### PedigreeTemplate — cần object có:
```js
{
  patient: { id, name, dob, gender, date, doctor, condition },
  generations: [{
    gen: 'I',
    label: string,
    members: [{ id, label, gender: 'M'|'F', status: 'healthy'|'affected'|'carrier'|'proband', condition, deceased }]
  }],
  riskAssessment: { level, conditions: [], recommendation },
}
```

#### InBodyTemplate — cần object có:
```js
{
  patient: { id, name, dob, age, gender, height },
  measurement: { date, time, device, technicianId },
  composition: {
    weight: { value, unit, min, max, status: 'normal'|'high'|'low' },
    skeletalMuscle, bodyFat, bmi, pbf  // cùng cấu trúc
  },
  segmental: {
    rightArm, leftArm, trunk, rightLeg, leftLeg  // { muscle, fat }
  },
  scores: { inBodyScore, visceralFatLevel, basalMetabolicRate, totalBodyWater },
  history: [{ date, weight, muscle, fat, pbf }],
  recommendation: string,
}
```

## In & Xuất PDF

- **In trực tiếp**: Bấm nút "🖨️ In ngay" → mở cửa sổ in hệ thống → chọn máy in phòng khám
- **Xuất PDF**: Trong hộp thoại in → chọn "Save as PDF" (Chrome/Edge)
- **In cả 3**: Gọi `handlePrint()` từng tab một

## Tùy chỉnh thông tin phòng khám

Sửa trong `mockData.js`:
```js
export const clinicInfo = {
  name: 'Tên phòng khám của bạn',
  address: 'Địa chỉ',
  phone: 'SĐT',
  email: 'email@...',
  website: 'website.vn',
  logo: 'https://...url-logo.png',  // thêm logo
};
```

## Dependencies đã có sẵn
- ✅ React 18
- ✅ Vite
- ✅ react-pdf (có thể dùng để render PDF inline)
- ✅ pdfjs-dist

Không cần cài thêm thư viện gì.
