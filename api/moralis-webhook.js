// api/moralis-webhook.js
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Xác thực chữ ký bảo mật (X-Signature) chống giả mạo gói tin Webhook
  const signature = req.headers['x-signature'];
  const moralisSecret = process.env.MORALIS_STREAM_SECRET; // Cấu hình Key này trên Vercel Dashboard

  if (moralisSecret && signature) {
    const computedSignature = crypto
      .createHmac('sha256', moralisSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== computedSignature) {
      return res.status(401).json({ error: 'X-Signature verification failed.' });
    }
  }

  const { logs, confirmed, chainId } = req.body;

  // Moralis sẽ bắn một gói tin rỗng khi bồ bấm kích hoạt kiểm tra webhook đầu tiên
  if (!logs || logs.length === 0) {
    return res.status(200).json({ status: 'Moralis Stream Hook Active!' });
  }

  try {
    // 2. Vòng lặp bóc tách Logs giao dịch thu được từ Block
    for (const log of logs) {
      // Sử dụng tính năng Tự động giải mã cấu trúc Log (Auto-decoded event logs) của Moralis
      if (log.decodedEvent) {
        const eventName = log.decodedEvent.eventName;
        const params = log.decodedEvent.params;

        if (eventName === 'PartnerRegistered') {
          const partnerAddress = params.partner;
          const referrerAddress = params.referrer;

          console.log(`[HMNV REAL-TIME EVENT] Phát hiện tình nguyện viên mới: ${partnerAddress} - Người giới thiệu: ${referrerAddress} | Khối confirmed: ${confirmed}`);

          // =========================================================================
          // TODO: BỒ CHÈN LOGIC CẬP NHẬT DATABASE PRODUCTION (MongoDB/Postgres) TẠI ĐÂY
          // Ví dụ: await db.collection('referrals').insertOne({ partner, referrer, chainId });
          // =========================================================================
        }
      }
    }

    return res.status(200).json({ success: true, processedLogs: logs.length });
  } catch (error) {
    console.error('[HMNV Stream System Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}