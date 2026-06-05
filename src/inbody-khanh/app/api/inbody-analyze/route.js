// app/api/inbody-analyze/route.js
// Next.js App Router API route

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

export async function POST(request) {
  try {
    const body = await request.json();
    const { image, mediaType, previousRecord } = body;

    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    // Build message content
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
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    // Parse JSON response from Claude
    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let analysis;
    try {
      // Strip markdown code fences if present
      const cleaned = rawText.replace(/```json\n?|```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      // Fallback if not valid JSON
      analysis = {
        summary: rawText,
        metrics: {},
        tags: [{ label: 'Đã phân tích', type: 'info' }],
        recommendations: [],
        xp_earned: 50,
      };
    }

    return Response.json({ analysis });
  } catch (error) {
    console.error('InBody analyze error:', error);
    return Response.json(
      { error: 'Lỗi phân tích. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
