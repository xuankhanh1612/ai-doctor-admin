// api/inbody-analyze.js
// Vercel Serverless Function

import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích kết quả InBody (máy đo thành phần cơ thể).
Khi nhận ảnh/PDF kết quả InBody, hãy:
1. Trích xuất chính xác các chỉ số: Cân nặng, Cơ bắp (SMM), Mỡ cơ thể (%), Nước (%), BMI, InBody Score, Mỡ nội tạng (nếu có), Protein, Khoáng chất
2. Đưa ra nhận xét ngắn gọn về tình trạng sức khỏe
3. Gợi ý cải thiện cụ thể (tập luyện, dinh dưỡng)
4. Tính XP gamification dựa trên thay đổi (nếu có dữ liệu trước đó)

Luôn trả lời bằng JSON với cấu trúc sau:
{
  "summary": "Nhận xét tổng quan 2-3 câu",
  "metrics": {
    "Cân nặng": "68.4",
    "Cơ bắp": "29.8",
    "Mỡ (%)": "22.1",
    "Nước (%)": "54.3",
    "BMI": "23.1",
    "InBody Score": "72"
  },
  "tags": [
    { "label": "Cơ bắp tốt ▲", "type": "ok" },
    { "label": "Mỡ cần cải thiện", "type": "warn" },
    { "label": "BMI bình thường", "type": "info" }
  ],
  "recommendations": ["Tập resistance training 3x/tuần", "Giảm carb buổi tối"],
  "xp_earned": 80,
  "inbody_score": 72
}`;

// Helper: parse raw body thành JSON (Vercel không tự parse)
function parseBody(req) {
  return new Promise((resolve, reject) => {
    // Nếu body đã được parse sẵn (Vercel thường tự parse JSON)
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Kiểm tra API key trước
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error: missing API key' });
  }

  try {
    const body = await parseBody(req);
    const { image, mediaType, previousRecord } = body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType || 'image/jpeg',
          data: image,
        },
      },
      {
        type: 'text',
        text: previousRecord
          ? `Đây là kết quả InBody mới nhất. Kết quả lần trước: ${JSON.stringify(previousRecord)}. Hãy phân tích và so sánh.`
          : 'Đây là kết quả InBody. Hãy phân tích chi tiết.',
      },
    ];

    const response = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let analysis;
    try {
      const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        summary: rawText,
        metrics: {},
        tags: [{ label: 'Đã phân tích', type: 'info' }],
        recommendations: [],
        xp_earned: 50,
      };
    }

    return res.status(200).json({ analysis });
  } catch (error) {
    console.error('InBody analyze error:', error?.message || error);
    return res.status(500).json({
      error: 'Lỗi phân tích. Vui lòng thử lại.',
      detail: error?.message,
    });
  }
}
