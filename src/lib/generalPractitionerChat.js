export const QUICK_PROMPTS = {
  vi: [
    'Tôi sốt, ho, đau họng và mệt mỏi trong 3 ngày.',
    'Tôi đau bụng, buồn nôn và ăn uống kém từ hôm qua.',
    'Tôi mất ngủ, lo lắng và tim đập nhanh nhiều ngày.',
  ],
  en: [
    'I have fever, cough, sore throat, and fatigue for 3 days.',
    'I have stomach pain, nausea, and poor appetite since yesterday.',
    'I have insomnia, anxiety, and a racing heart for several days.',
  ],
}

export const EMOTIONAL_QUICK_PROMPTS = {
  vi: [
    'Hôm nay tôi thấy lo lắng và muốn tâm sự một chút.',
    'Tôi đang mệt vì điều trị và cần một bài thở thư giãn.',
    'Tôi mất ngủ, suy nghĩ nhiều và cần được trấn an.',
  ],
  en: [
    'I feel anxious today and would like to talk for a moment.',
    'Treatment is exhausting me and I need a calming breathing exercise.',
    'I cannot sleep, I am overthinking, and I need reassurance.',
  ],
}

export const GP_CHAT_STORAGE_KEY = 'cdoc_gp_chat_history'
export const LEGACY_PSYCH_CHAT_STORAGE_KEY = 'cdoc_psych_chat_history'

export const createChatMessage = (role, text) => ({
  id: `gp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  createdAt: new Date().toISOString(),
})

export const createInitialAgentMessage = (lang) => createChatMessage(
  'agent',
  lang === 'en'
    ? 'Hello, I am your virtual General Practitioner AI. Tell me your symptoms, how you are feeling, when it started, severity, current medicines, allergies, and what makes things better or worse.'
    : 'Xin chào, tôi là AI Bác sĩ đa khoa ảo. Bạn có thể mô tả triệu chứng hoặc tâm sự cảm xúc hiện tại, bắt đầu từ khi nào, mức độ nặng, thuốc đang dùng, dị ứng và điều gì làm bạn dễ chịu hơn hoặc khó chịu hơn.'
)

export function loadStoredChatMessages(lang) {
  if (typeof window === 'undefined') return [createInitialAgentMessage(lang)]

  try {
    const raw = localStorage.getItem(GP_CHAT_STORAGE_KEY) || localStorage.getItem(LEGACY_PSYCH_CHAT_STORAGE_KEY)
    if (!raw) return [createInitialAgentMessage(lang)]

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return [createInitialAgentMessage(lang)]

    return parsed
      .filter(message => message?.role && message?.text)
      .map((message, index) => ({
        id: message.id || `gp_saved_${index}_${Date.now()}`,
        role: message.role,
        text: message.text,
        createdAt: message.createdAt || new Date().toISOString(),
      }))
  } catch {
    return [createInitialAgentMessage(lang)]
  }
}

export function buildGeneralPractitionerReply(prompt, lang) {
  const text = prompt.toLowerCase()
  const emergencyKeywords = [
    'đau ngực', 'khó thở nặng', 'liệt', 'méo miệng', 'co giật', 'ngất', 'chảy máu', 'sốc phản vệ',
    'chest pain', 'severe shortness of breath', 'stroke', 'seizure', 'fainting', 'uncontrolled bleeding', 'anaphylaxis',
  ]
  const crisisKeywords = ['tự tử', 'tự sát', 'muốn chết', 'hại bản thân', 'suicide', 'kill myself', 'self harm', 'self-harm']
  const feverKeywords = ['sốt', 'fever', 'ớn lạnh', 'chills']
  const respiratoryKeywords = ['ho', 'khó thở', 'đau họng', 'sổ mũi', 'cough', 'shortness of breath', 'sore throat', 'runny nose']
  const painKeywords = ['đau', 'nhức', 'pain', 'ache', 'headache', 'đau đầu']
  const digestionKeywords = ['đau bụng', 'buồn nôn', 'nôn', 'tiêu chảy', 'táo bón', 'stomach', 'nausea', 'vomit', 'diarrhea', 'constipation']
  const sleepMoodKeywords = ['mất ngủ', 'lo lắng', 'buồn', 'stress', 'insomnia', 'anxiety', 'sad', 'depress', 'panic']

  const hasEmergency = emergencyKeywords.some(k => text.includes(k))
  const hasCrisis = crisisKeywords.some(k => text.includes(k))
  const topics = []
  if (feverKeywords.some(k => text.includes(k))) topics.push(lang === 'en' ? 'fever/infection symptoms' : 'sốt/dấu hiệu nhiễm trùng')
  if (respiratoryKeywords.some(k => text.includes(k))) topics.push(lang === 'en' ? 'respiratory symptoms' : 'triệu chứng hô hấp')
  if (painKeywords.some(k => text.includes(k))) topics.push(lang === 'en' ? 'pain symptoms' : 'triệu chứng đau')
  if (digestionKeywords.some(k => text.includes(k))) topics.push(lang === 'en' ? 'digestive symptoms' : 'triệu chứng tiêu hóa')
  if (sleepMoodKeywords.some(k => text.includes(k))) topics.push(lang === 'en' ? 'sleep/mood/stress symptoms' : 'giấc ngủ/tâm trạng/stress')

  if (lang === 'en') {
    if (hasEmergency || hasCrisis) {
      return 'Some symptoms you mentioned may need urgent support. Please call emergency services or seek urgent care if symptoms worsen, or if there is chest pain, severe shortness of breath, stroke signs, seizure, severe allergy, uncontrolled bleeding, confusion, or risk of self-harm.'
    }

    const focus = topics.length ? topics.join(', ') : 'your current symptoms and feelings'
    return `I hear you describing ${focus}. As a virtual General Practitioner and emotional companion, I recommend documenting: onset, duration, severity (0–10), temperature/vitals if available, medications taken, allergies, medical history, exposures, and what improves or worsens symptoms. For the emotional load, try one minute of slow breathing, unclench your jaw and shoulders, and name one small thing you need right now. Please book a clinician visit if symptoms persist, worsen, recur, or affect daily activities.`
  }

  if (hasEmergency || hasCrisis) {
    return 'Một số triệu chứng bạn nêu có thể cần hỗ trợ khẩn cấp. Hãy gọi cấp cứu hoặc đi khám khẩn nếu triệu chứng nặng lên, đau ngực, khó thở nhiều, dấu hiệu đột quỵ, co giật, dị ứng nặng, chảy máu không cầm, lú lẫn hoặc có nguy cơ tự hại.'
  }

  const focus = topics.length ? topics.join(', ') : 'triệu chứng và cảm xúc hiện tại'
  return `Tôi ghi nhận bạn đang mô tả ${focus}. Với vai trò AI Bác sĩ đa khoa kiêm người đồng hành để tâm sự, tôi gợi ý bạn khai báo thêm: bắt đầu khi nào, kéo dài bao lâu, mức độ 0–10, nhiệt độ/chỉ số nếu có, thuốc đã dùng, dị ứng, bệnh nền, yếu tố tiếp xúc và điều gì làm triệu chứng/cảm xúc tăng hoặc giảm. Trước mắt hãy thở chậm 1 phút, thả lỏng vai-hàm, uống nước và không tự dùng kháng sinh hoặc thuốc giảm đau mạnh nếu chưa được kê đơn. Nếu triệu chứng kéo dài, nặng lên, tái phát hoặc ảnh hưởng sinh hoạt, bạn nên đặt lịch khám bác sĩ.`
}
