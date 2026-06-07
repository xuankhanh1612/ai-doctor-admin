// mockData.js — Dữ liệu mẫu cho 3 loại tài liệu y tế

export const clinicInfo = {
  name: 'Phòng Khám Đa Khoa Consensus',
  address: '123 Nguyễn Huệ, Q.1, TP.HCM',
  phone: '028 3822 1234',
  email: 'info@consensus-doctor.vn',
  website: 'consensus-doctor.vn',
  logo: null, // thay bằng URL logo thật
};

// ===== 1. KẾT QUẢ KHÁM BỆNH =====
export const mockExamResult = {
  patient: {
    id: 'BN-2025-001847',
    name: 'Nguyễn Thị Minh Châu',
    dob: '15/03/1985',
    gender: 'Nữ',
    phone: '0901 234 567',
    address: '45 Lê Lợi, Q.1, TP.HCM',
    bhyt: 'DN4023456789012',
  },
  visit: {
    date: '07/06/2025',
    time: '09:15',
    doctor: 'BS. Trần Văn Khoa',
    specialty: 'Nội tổng quát',
    visitCode: 'KB-20250607-0312',
  },
  vitals: {
    height: 162,
    weight: 58,
    bmi: 22.1,
    bloodPressure: '118/76',
    heartRate: 74,
    temperature: 36.8,
    spO2: 98,
  },
  chiefComplaint: 'Đau đầu kéo dài 3 ngày, mệt mỏi, khó ngủ',
  diagnosis: [
    { icd: 'G44.2', name: 'Đau đầu căng thẳng (Tension headache)', type: 'Chính' },
    { icd: 'F51.0', name: 'Rối loạn giấc ngủ không thực tổn', type: 'Kèm theo' },
  ],
  prescriptions: [
    { stt: 1, drug: 'Paracetamol 500mg', qty: '20 viên', usage: 'Uống 1 viên × 3 lần/ngày sau ăn' },
    { stt: 2, drug: 'Melatonin 5mg', qty: '10 viên', usage: 'Uống 1 viên trước ngủ 30 phút' },
    { stt: 3, drug: 'Vitamin B Complex', qty: '20 viên', usage: 'Uống 1 viên × 2 lần/ngày' },
  ],
  advice: 'Nghỉ ngơi đầy đủ, hạn chế dùng thiết bị điện tử trước khi ngủ, uống đủ 2L nước/ngày. Tái khám sau 7 ngày hoặc khi có triệu chứng nặng hơn.',
  nextVisit: '14/06/2025',
};

// ===== 2. CÂY GIA PHẢ BỆNH (PEDIGREE) =====
export const mockPedigree = {
  patient: {
    id: 'BN-2025-001847',
    name: 'Nguyễn Thị Minh Châu',
    dob: '15/03/1985',
    gender: 'Nữ',
    date: '07/06/2025',
    doctor: 'BS. Trần Văn Khoa',
    condition: 'Đánh giá nguy cơ di truyền tim mạch',
  },
  legend: [
    { symbol: '■', label: 'Nam mắc bệnh' },
    { symbol: '□', label: 'Nam khỏe mạnh' },
    { symbol: '●', label: 'Nữ mắc bệnh' },
    { symbol: '○', label: 'Nữ khỏe mạnh' },
    { symbol: '◑', label: 'Mang gen (chưa phát bệnh)' },
    { symbol: '†', label: 'Đã mất' },
  ],
  generations: [
    {
      gen: 'I',
      label: 'Thế hệ I (Ông bà nội/ngoại)',
      members: [
        { id: 'I-1', label: 'Ông nội', gender: 'M', status: 'affected', condition: 'THA, NMCT†', deceased: true },
        { id: 'I-2', label: 'Bà nội', gender: 'F', status: 'healthy', condition: '', deceased: true },
        { id: 'I-3', label: 'Ông ngoại', gender: 'M', status: 'affected', condition: 'ĐTĐ type 2†', deceased: true },
        { id: 'I-4', label: 'Bà ngoại', gender: 'F', status: 'carrier', condition: 'THA', deceased: false },
      ],
    },
    {
      gen: 'II',
      label: 'Thế hệ II (Cha mẹ & cô chú dì)',
      members: [
        { id: 'II-1', label: 'Bác trai', gender: 'M', status: 'affected', condition: 'THA, NMCT', deceased: false },
        { id: 'II-2', label: 'Cha', gender: 'M', status: 'affected', condition: 'THA, ĐTĐ', deceased: false },
        { id: 'II-3', label: 'Mẹ', gender: 'F', status: 'carrier', condition: 'THA nhẹ', deceased: false },
        { id: 'II-4', label: 'Dì', gender: 'F', status: 'healthy', condition: '', deceased: false },
      ],
    },
    {
      gen: 'III',
      label: 'Thế hệ III (Bệnh nhân & anh chị em)',
      members: [
        { id: 'III-1', label: 'Anh trai', gender: 'M', status: 'carrier', condition: 'Pre-THA', deceased: false },
        { id: 'III-2', label: 'BN ★', gender: 'F', status: 'proband', condition: 'Đau đầu / nguy cơ THA', deceased: false },
        { id: 'III-3', label: 'Em gái', gender: 'F', status: 'healthy', condition: '', deceased: false },
      ],
    },
    {
      gen: 'IV',
      label: 'Thế hệ IV (Con cái)',
      members: [
        { id: 'IV-1', label: 'Con trai', gender: 'M', status: 'healthy', condition: '8 tuổi', deceased: false },
        { id: 'IV-2', label: 'Con gái', gender: 'F', status: 'healthy', condition: '5 tuổi', deceased: false },
      ],
    },
  ],
  riskAssessment: {
    level: 'Trung bình - Cao',
    conditions: ['Tăng huyết áp (THA)', 'Đái tháo đường type 2 (ĐTĐ)', 'Nhồi máu cơ tim (NMCT)'],
    recommendation: 'Theo dõi huyết áp định kỳ mỗi 3 tháng. Xét nghiệm đường huyết hàng năm. Tư vấn di truyền nếu có kế hoạch sinh con.',
  },
};

// ===== 3. KẾT QUẢ ĐO INBODY =====
export const mockInBody = {
  patient: {
    id: 'BN-2025-001847',
    name: 'Nguyễn Thị Minh Châu',
    dob: '15/03/1985',
    age: 40,
    gender: 'Nữ',
    height: 162,
  },
  measurement: {
    date: '07/06/2025',
    time: '08:45',
    device: 'InBody 770',
    technicianId: 'KTV-023',
  },
  composition: {
    weight: { value: 58.0, unit: 'kg', min: 51.5, max: 69.5, status: 'normal' },
    skeletalMuscle: { value: 22.5, unit: 'kg', min: 18.9, max: 23.1, status: 'normal' },
    bodyFat: { value: 15.3, unit: 'kg', min: 10.8, max: 18.9, status: 'normal' },
    bmi: { value: 22.1, unit: 'kg/m²', min: 18.5, max: 25.0, status: 'normal' },
    pbf: { value: 26.4, unit: '%', min: 18.0, max: 28.0, status: 'normal' },
  },
  segmental: {
    rightArm:  { muscle: 2.08, fat: 0.57 },
    leftArm:   { muscle: 1.97, fat: 0.52 },
    trunk:     { muscle: 21.56, fat: 7.40 },
    rightLeg:  { muscle: 8.84, fat: 2.83 },
    leftLeg:   { muscle: 8.69, fat: 2.92 },
  },
  scores: {
    inBodyScore: 76,
    visceralFatLevel: 4,
    basalMetabolicRate: 1298,
    totalBodyWater: 32.3,
    ecfRatio: 0.382,
  },
  history: [
    { date: '07/03/2025', weight: 59.2, muscle: 22.1, fat: 16.1, pbf: 27.2 },
    { date: '07/04/2025', weight: 58.8, muscle: 22.3, fat: 15.9, pbf: 27.0 },
    { date: '07/05/2025', weight: 58.4, muscle: 22.4, fat: 15.6, pbf: 26.7 },
    { date: '07/06/2025', weight: 58.0, muscle: 22.5, fat: 15.3, pbf: 26.4 },
  ],
  recommendation: 'Cơ thể ở mức cân bằng tốt. Tiếp tục duy trì chế độ tập luyện hiện tại. Tăng cường protein (1.2–1.5g/kg/ngày) để giữ khối cơ. Mục tiêu 3 tháng tới: giảm 0.5kg mỡ, tăng 0.3kg cơ.',
};
