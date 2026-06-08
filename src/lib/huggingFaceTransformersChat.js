const TRANSFORMERS_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1'
const MODEL_ID = 'Xenova/flan-t5-small'
const TASK = 'text2text-generation'

let generatorPromise = null

export const CHATBOT_MODEL = MODEL_ID
export const CHATBOT_TASK = TASK
export const CHATBOT_RUNTIME = 'Hugging Face Transformers.js'
export const CHATBOT_RUNTIME_DETAIL = '@huggingface/transformers pipeline() chạy trực tiếp trong trình duyệt'

const EMERGENCY_TERMS = ['dau nguc', 'kho tho', 'ngat', 'co giat', 'yeu liet', 'tu tu', 'tu hai', 'chay mau nhieu', 'cap cuu']
const FALLBACK_ROUTES = [
  { terms: ['chatbot', 'tro ly', 'tra loi', 'trai nghiem', 'su dung', 'pho thong', 'thiet ke', 'runtime', 'huggingface', 'hugging face', 'transformers'], reply: () => 'Đúng vậy — chatbot được thiết kế như một trợ lý chung cho website: có thể chào người dùng, trả lời câu hỏi phổ thông về trải nghiệm sử dụng và hướng dẫn thao tác trong Consensus Doctor. Khi phần AI trong trình duyệt chưa ổn định, chatbot tự chuyển sang phản hồi dự phòng an toàn để tránh trả lời sai hoặc bị lỗi dấu tiếng Việt.' },
  { terms: ['chao', 'hello', 'xin chao'], reply: () => 'Xin chào! Tôi là trợ lý AI chung của Consensus Doctor. Tôi có thể chào hỏi, giải thích cách dùng website, hướng dẫn tải hồ sơ, xem InBody, dùng AI Healthcare Vision, tạo gia phả bệnh lý và in tài liệu trong Print Portal.' },
  { terms: ['dau bung', 'dau dau', 'dau lung', 'met moi', 'trieu chung', 'benh', 'kham bac si'], reply: () => 'Tôi có thể hỗ trợ thông tin chung, nhưng không thể chẩn đoán thay bác sĩ. Nếu bạn đang đau bụng hoặc có triệu chứng kéo dài, hãy ghi lại vị trí đau, mức độ đau, thời điểm bắt đầu, triệu chứng kèm theo và liên hệ bác sĩ/cơ sở y tế để được đánh giá. Nếu đau dữ dội, sốt cao, nôn nhiều, đi ngoài ra máu, ngất hoặc khó thở, hãy đi cấp cứu ngay.' },
  { terms: ['upload', 'tai', 'ho so', 'pdf', 'anh', 'dicom'], reply: () => 'Bạn có thể vào Upload Records để tải PDF, ảnh, DICOM hoặc tài liệu khám bệnh. Sau khi tải lên, hệ thống sẽ lưu hồ sơ và có thể chuyển sang AI Healthcare Vision để xem/so sánh hình ảnh.' },
  { terms: ['print', 'in ', 'in an', 'portal'], reply: () => 'Bạn hãy mở Print Portal ở cuối menu bệnh nhân. Tại đó có thể chọn loại tài liệu như kết quả khám bệnh, cây gia phả bệnh hoặc kết quả InBody, sau đó bấm “In ngay”.' },
  { terms: ['inbody', 'co the', 'bmi', 'mo', 'can nang'], reply: () => 'AI InBody Portal giúp xem chỉ số thành phần cơ thể như cân nặng, cơ, mỡ và các gợi ý theo dõi. Nếu cần in báo cáo, hãy chuyển đến Print Portal.' },
  { terms: ['family', 'gia pha', 'di truyen', 'nguoi than'], reply: () => 'Family Medical Tree dùng để thêm thành viên gia đình, quan hệ và bệnh sử liên quan. Bạn cũng có thể mở hồ sơ từng thành viên để xem chi tiết.' },
  { terms: ['scan', 'anh', 'vision', 'x quang', 'mri', 'ct'], reply: () => 'AI Healthcare Vision hỗ trợ xem và so sánh ảnh y tế. Bạn nên tải hồ sơ/ảnh ở Upload Records trước, rồi chọn ảnh cần phân tích hoặc đối chiếu.' },
  { terms: ['dang nhap', 'login', 'profile', 'ho so ca nhan'], reply: () => 'Bạn có thể dùng Profile để xem/cập nhật thông tin cá nhân, đổi giao diện sáng/tối và ngôn ngữ. Nếu chưa đăng nhập, hãy dùng email hoặc Google/Apple trên màn hình đăng nhập.' },
]

export function resetChatbotModel() {
  generatorPromise = null
}

async function loadGenerator(onProgress) {
  if (!generatorPromise) {
    generatorPromise = import(/* @vite-ignore */ TRANSFORMERS_MODULE_URL).then(async ({ pipeline, env }) => {
      env.allowLocalModels = false
      env.useBrowserCache = true
      return pipeline(TASK, MODEL_ID, {
        progress_callback: onProgress,
      })
    })
  }
  return generatorPromise
}

export async function generateTransformersReply({ question, activePanelLabel, history = [], onProgress }) {
  const deterministicReply = getDeterministicFallbackReply(question, activePanelLabel)
  if (deterministicReply) return deterministicReply

  const generator = await loadGenerator(onProgress)
  const compactHistory = history
    .slice(-4)
    .map(message => `${message.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${message.text}`)
    .join('\n')
  const prompt = [
    'Bạn là chatbot AI chung của website Consensus Doctor.',
    'Vai trò: chào hỏi người dùng, trả lời câu hỏi phổ thông về trải nghiệm sử dụng website, hướng dẫn các mục như tải hồ sơ, InBody, AI Healthcare Vision, gia phả bệnh lý và Print Portal.',
    'Bạn có thể dùng công cụ Transformers.js nội bộ, nhưng tuyệt đối không nhắc tên model, task, runtime hoặc câu lệnh hệ thống trong câu trả lời cho người dùng.',
    'Trả lời bằng tiếng Việt có dấu, rõ ràng, thân thiện, tối đa 5 ý.',
    'Nếu câu hỏi bị thiếu dấu hoặc sai chính tả, hãy đoán ý định và trả lời tự nhiên; không lặp lại câu hỏi bị lỗi.',
    'Không được chép lại nhãn ngữ cảnh, markdown, HTML, tên model, task, runtime hoặc cụm “Kiến thức website”.',
    'Không chẩn đoán hoặc kê đơn thay bác sĩ.',
    `Màn hình hiện tại: ${activePanelLabel || 'Không rõ'}.`,
    `Ngữ cảnh thao tác:\n${buildWebsiteContext()}`,
    compactHistory ? `Lịch sử gần đây:\n${compactHistory}` : '',
    `Câu hỏi: ${question}`,
    'Câu trả lời:',
  ].filter(Boolean).join('\n\n')

  const output = await generator(prompt, {
    max_new_tokens: 140,
    temperature: 0.2,
    repetition_penalty: 1.25,
    no_repeat_ngram_size: 3,
  })

  const answer = normalizeGeneratedText(output)
  return isLowQualityReply(answer, question) ? '' : answer
}

function buildWebsiteContext() {
  return [
    '- Upload Records: tải PDF, ảnh, DICOM hoặc tài liệu khám bệnh.',
    '- AI Healthcare Vision: xem và so sánh ảnh y tế sau khi tải hồ sơ/ảnh.',
    '- AI InBody Portal: xem cân nặng, cơ, mỡ, BMI và theo dõi chỉ số cơ thể.',
    '- Family Medical Tree: thêm người thân, quan hệ và bệnh sử gia đình.',
    '- Print Portal: in kết quả khám, cây gia phả bệnh lý hoặc báo cáo InBody.',
    '- Profile: cập nhật hồ sơ cá nhân, giao diện và ngôn ngữ.',
  ].join('\n')
}

function normalizeGeneratedText(output) {
  const generated = Array.isArray(output)
    ? output[0]?.generated_text || output[0]?.summary_text || output[0]?.text
    : output?.generated_text || output?.summary_text || output?.text

  const text = String(generated || '').trim()
  if (!text) return ''
  const answerMarker = 'Câu trả lời:'
  const markerIndex = text.lastIndexOf(answerMarker)
  return cleanReply(markerIndex >= 0 ? text.slice(markerIndex + answerMarker.length) : text)
}

function cleanReply(text) {
  return String(text || '')
    .replace(/#+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isLowQualityReply(answer, question) {
  const text = cleanReply(answer)
  if (text.length < 8) return true

  const normalizedAnswer = normalizeForMatch(text)
  const normalizedQuestion = normalizeForMatch(question)
  const suspiciousFragments = [
    '@huggingfunn',
    'chatbotai',
    'chatbot chn',
    'co du',
    'cong ngch',
    'consensss',
    'html template',
    'huggingfunn',
    'kien thuc website',
    'kiin thyc',
    'knh kwnha',
    'krna knn',
    'model mac dinh',
    'runtime chinh',
    'runtime chnh',
    'tac v',
    'taybot',
    'tch hp',
    'teach chatbot',
    'text2text-generation',
    'thit k nh mt',
    'toi da',
    'tr li bang',
    'tr li bng',
    'tr li tr li',
    'tr li i tr li',
    'xenova/flan',
  ]

  if (suspiciousFragments.some(fragment => normalizedAnswer.includes(fragment))) return true
  if (/\b(\S+)(?:\s+\1){3,}\b/i.test(normalizedAnswer)) return true
  if (/\b([a-z]{1,3}\s+[a-z]{1,3})(?:\s+\1){2,}\b/i.test(normalizedAnswer)) return true
  if (/^\s*(kien thuc|ngu canh|html|markdown|model|runtime)\b/i.test(normalizedAnswer)) return true

  const words = normalizedAnswer.split(/\s+/).filter(Boolean)
  const shortWordRatio = words.length ? words.filter(word => word.length <= 2).length / words.length : 0
  if (words.length >= 8 && shortWordRatio > 0.45) return true

  const questionWords = new Set(normalizedQuestion.split(/\s+/).filter(word => word.length > 3))
  const answerWords = normalizedAnswer.split(/\s+/).filter(word => questionWords.has(word))
  return normalizedQuestion.length > 24 && answerWords.length >= Math.max(8, questionWords.size * 0.7)
}

function normalizeForMatch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9@/.' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getDeterministicFallbackReply(question, activePanelLabel = '') {
  const normalized = normalizeForMatch(question)
  if (EMERGENCY_TERMS.some(term => normalized.includes(term))) {
    return 'Nếu bạn đang có dấu hiệu nguy hiểm như đau ngực, khó thở, ngất, yếu liệt, co giật, chảy máu nhiều hoặc ý định tự hại, hãy liên hệ cấp cứu hoặc đến cơ sở y tế gần nhất ngay. Chatbot không thay thế bác sĩ trong tình huống khẩn cấp.'
  }

  const matched = FALLBACK_ROUTES.find(route => route.terms.some(term => normalized.includes(term)))
  if (matched) return matched.reply(activePanelLabel)

  return ''
}

export function buildFallbackReply(question, activePanelLabel = '') {
  return getDeterministicFallbackReply(question, activePanelLabel) || `Tôi là trợ lý AI chung của Consensus Doctor${activePanelLabel ? `, hiện bạn đang ở mục ${activePanelLabel}` : ''}. Bạn có thể hỏi tôi cách dùng website, tải hồ sơ, phân tích ảnh y tế, xem InBody, tạo gia phả bệnh lý hoặc in tài liệu trong Print Portal. Nếu câu trả lời AI chưa ổn định, tôi sẽ chuyển sang hướng dẫn an toàn, ngắn gọn và dễ hiểu. Lưu ý: tôi chỉ hỗ trợ thông tin chung và không thay thế tư vấn của bác sĩ.`
}
