const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1'
const MODEL_ID = 'Xenova/flan-t5-small'
const TASK = 'text2text-generation'

let generatorPromise = null

export const CHATBOT_MODEL = MODEL_ID
export const CHATBOT_RUNTIME = 'Hugging Face Transformers.js'

export function resetChatbotModel() {
  generatorPromise = null
}

async function loadGenerator(onProgress) {
  if (!generatorPromise) {
    generatorPromise = import(/* @vite-ignore */ TRANSFORMERS_CDN).then(async ({ pipeline, env }) => {
      env.allowLocalModels = false
      env.useBrowserCache = true
      return pipeline(TASK, MODEL_ID, {
        progress_callback: onProgress,
      })
    })
  }
  return generatorPromise
}

export async function generateTransformersReply({ question, activePanelLabel, knowledgeBase, htmlTemplate, history = [], onProgress }) {
  const generator = await loadGenerator(onProgress)
  const compactHistory = history
    .slice(-4)
    .map(message => `${message.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${message.text}`)
    .join('\n')
  const compactKnowledge = `${knowledgeBase}\n\nHTML template summary:\n${htmlTemplate.slice(0, 1200)}`.slice(0, 3600)
  const prompt = [
    'Bạn là chatbot AI chung của website Consensus Doctor.',
    'Trả lời bằng tiếng Việt thân thiện, tối đa 5 ý.',
    'Ưu tiên hướng dẫn thao tác trong website. Không chẩn đoán hoặc kê đơn thay bác sĩ.',
    `Màn hình hiện tại: ${activePanelLabel || 'Không rõ'}.`,
    `Kiến thức website:\n${compactKnowledge}`,
    compactHistory ? `Lịch sử gần đây:\n${compactHistory}` : '',
    `Câu hỏi: ${question}`,
    'Câu trả lời:',
  ].filter(Boolean).join('\n\n')

  const output = await generator(prompt, {
    max_new_tokens: 180,
    temperature: 0.35,
  })

  return normalizeGeneratedText(output)
}

function normalizeGeneratedText(output) {
  const generated = Array.isArray(output)
    ? output[0]?.generated_text || output[0]?.summary_text || output[0]?.text
    : output?.generated_text || output?.summary_text || output?.text

  const text = String(generated || '').trim()
  if (!text) return ''
  const answerMarker = 'Câu trả lời:'
  const markerIndex = text.lastIndexOf(answerMarker)
  return (markerIndex >= 0 ? text.slice(markerIndex + answerMarker.length) : text).trim()
}

export function buildFallbackReply(question, activePanelLabel = '') {
  const normalized = question.toLowerCase()
  const emergencyTerms = ['đau ngực', 'khó thở', 'ngất', 'co giật', 'yếu liệt', 'tự tử', 'tự hại', 'chảy máu nhiều', 'cấp cứu']
  if (emergencyTerms.some(term => normalized.includes(term))) {
    return 'Nếu bạn đang có dấu hiệu nguy hiểm như đau ngực, khó thở, ngất, yếu liệt, co giật, chảy máu nhiều hoặc ý định tự hại, hãy liên hệ cấp cứu hoặc đến cơ sở y tế gần nhất ngay. Chatbot không thay thế bác sĩ trong tình huống khẩn cấp.'
  }

  const routes = [
    { terms: ['upload', 'tải', 'hồ sơ', 'pdf', 'ảnh', 'dicom'], reply: 'Bạn có thể vào Upload Records để tải PDF, ảnh, DICOM hoặc tài liệu khám bệnh. Sau khi tải lên, hệ thống sẽ lưu hồ sơ và có thể chuyển sang AI Healthcare Vision để xem/so sánh hình ảnh.' },
    { terms: ['print', 'in ', 'in ấn', 'portal'], reply: 'Bạn hãy mở Print Portal ở cuối menu bệnh nhân. Tại đó có thể chọn loại tài liệu như kết quả khám bệnh, cây gia phả bệnh hoặc kết quả InBody, sau đó bấm “In ngay”.' },
    { terms: ['inbody', 'cơ thể', 'bmi', 'mỡ', 'cân nặng'], reply: 'AI InBody Portal giúp xem chỉ số thành phần cơ thể như cân nặng, cơ, mỡ và các gợi ý theo dõi. Nếu cần in báo cáo, hãy chuyển đến Print Portal.' },
    { terms: ['family', 'gia phả', 'di truyền', 'người thân'], reply: 'Family Medical Tree dùng để thêm thành viên gia đình, quan hệ và bệnh sử liên quan. Bạn cũng có thể mở hồ sơ từng thành viên để xem chi tiết.' },
    { terms: ['scan', 'ảnh', 'vision', 'x quang', 'mri', 'ct'], reply: 'AI Healthcare Vision hỗ trợ xem và so sánh ảnh y tế. Bạn nên tải hồ sơ/ảnh ở Upload Records trước, rồi chọn ảnh cần phân tích hoặc đối chiếu.' },
    { terms: ['đăng nhập', 'login', 'profile', 'hồ sơ cá nhân'], reply: 'Bạn có thể dùng Profile để xem/cập nhật thông tin cá nhân, đổi giao diện sáng/tối và ngôn ngữ. Nếu chưa đăng nhập, hãy dùng email hoặc Google/Apple trên màn hình đăng nhập.' },
  ]

  const matched = routes.find(route => route.terms.some(term => normalized.includes(term)))
  if (matched) return matched.reply

  return `Tôi là chatbot chung của Consensus Doctor${activePanelLabel ? `, hiện bạn đang ở mục ${activePanelLabel}` : ''}. Bạn có thể hỏi tôi cách tải hồ sơ, phân tích ảnh y tế, xem InBody, tạo gia phả bệnh lý hoặc in tài liệu trong Print Portal. Lưu ý: tôi chỉ hỗ trợ thông tin chung và không thay thế tư vấn của bác sĩ.`
}
