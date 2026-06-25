// src/data/wikiMedVisionCurriculum.js
// Lộ trình 31 ngày "duy trì học hỏi & nghiên cứu sâu" cho Wiki Med Vision Agent.
// Mỗi ngày gợi ý 1 chủ đề y học/sinh học để người dùng bấm và gửi thẳng vào Agent.

export const CURRICULUM_VI = [
  'Giải phẫu tim hoạt động như thế nào?',
  'Tuần hoàn máu lớn và tuần hoàn máu nhỏ khác gì nhau?',
  'Vì sao máu có nhóm A, B, AB, O?',
  'Tế bào hồng cầu vận chuyển oxy như thế nào?',
  'Nhân đôi ADN diễn ra theo cơ chế nào?',
  'ADN khác ARN ở điểm nào?',
  'Phân bào nguyên phân và giảm phân khác nhau ra sao?',
  'Hệ miễn dịch nhận diện và tiêu diệt mầm bệnh thế nào?',
  'Kháng thể và kháng nguyên hoạt động ra sao?',
  'Vì sao vắc-xin tạo được miễn dịch?',
  'Não người xử lý thông tin như thế nào?',
  'Synapse thần kinh truyền tín hiệu ra sao?',
  'Hệ hô hấp trao đổi khí ở phế nang thế nào?',
  'Thận lọc máu và tạo nước tiểu như thế nào?',
  'Gan thực hiện những chức năng chuyển hóa nào?',
  'Hệ tiêu hóa hấp thụ dưỡng chất ra sao?',
  'Insulin điều hòa đường huyết như thế nào?',
  'Vì sao thiếu vitamin gây bệnh?',
  'Cơ chế hình thành khối u và ung thư là gì?',
  'Tế bào gốc khác tế bào thường ở điểm nào?',
  'Hệ xương và quá trình tái tạo xương diễn ra ra sao?',
  'Cơ bắp co duỗi theo cơ chế nào?',
  'Da đóng vai trò gì trong hệ miễn dịch và điều nhiệt?',
  'Hormone tuyến giáp ảnh hưởng đến cơ thể thế nào?',
  'Vì sao huyết áp tăng cao gây hại cho cơ thể?',
  'Cholesterol tốt và xấu khác nhau ra sao?',
  'Vi khuẩn và virus gây bệnh khác nhau thế nào?',
  'Kháng sinh hoạt động ra sao để tiêu diệt vi khuẩn?',
  'Hệ gen người (genome) được giải mã như thế nào?',
  'Đột biến gen ảnh hưởng đến sức khỏe ra sao?',
  'Lão hóa tế bào diễn ra theo cơ chế nào?',
]

export const CURRICULUM_EN = [
  'How does the human heart pump blood?',
  "What's the difference between systemic and pulmonary circulation?",
  'Why do blood types A, B, AB, O exist?',
  'How do red blood cells carry oxygen?',
  'How does DNA replication actually work?',
  'How is DNA different from RNA?',
  'Mitosis vs meiosis — what sets them apart?',
  'How does the immune system recognize and destroy pathogens?',
  'How do antibodies and antigens interact?',
  'Why do vaccines create lasting immunity?',
  'How does the human brain process information?',
  'How do neurons transmit signals across a synapse?',
  'How does gas exchange happen in the alveoli?',
  'How do kidneys filter blood and form urine?',
  'What metabolic functions does the liver perform?',
  'How does the digestive system absorb nutrients?',
  'How does insulin regulate blood sugar?',
  'Why does vitamin deficiency cause disease?',
  'How do tumors and cancer actually form?',
  "What makes stem cells different from regular cells?",
  'How does bone remodeling work?',
  'What is the mechanism behind muscle contraction?',
  "What role does skin play in immunity and temperature control?",
  'How do thyroid hormones affect the whole body?',
  'Why is high blood pressure dangerous?',
  "What's the real difference between good and bad cholesterol?",
  'How are bacteria and viruses different as pathogens?',
  'How do antibiotics work to kill bacteria?',
  'How was the human genome actually sequenced?',
  'How do gene mutations affect health?',
  'What happens at the cellular level when we age?',
]

export function getCurriculum(lang) {
  return lang === 'vi' ? CURRICULUM_VI : CURRICULUM_EN
}

export const CURRICULUM_LENGTH = CURRICULUM_VI.length // 31
