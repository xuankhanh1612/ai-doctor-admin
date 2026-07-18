import crypto from 'crypto';
import { connectToDatabase } from '../lib/db'; // Giả sử bồ có file helper kết nối DB sẵn

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Xác thực bảo mật chữ ký Moralis
  const signature = req.headers['x-signature'];
  const moralisSecret = process.env.MORALIS_STREAM_SECRET;
  if (moralisSecret && signature) {
    const computed = crypto.createHmac('sha256', moralisSecret).update(JSON.stringify(req.body)).digest('hex');
    if (signature !== computed) return res.status(401).json({ error: 'Invalid signature' });
  }

  const { logs } = req.body;
  if (!logs || logs.length === 0) return res.status(200).json({ status: 'Active' });

  try {
    const { db } = await connectToDatabase(); // Kết nối vào ai-doctor-db

    for (const log of logs) {
      if (log.decodedEvent && log.decodedEvent.eventName === 'PartnerRegistered') {
        
        // Tạo object mẫu gói tin chuẩn để lưu trữ
        const logEntry = {
          eventId: `evt_${Math.random().toString(36).substr(2, 9)}`,
          event: log.decodedEvent.eventName,
          partner: log.decodedEvent.params.partner,
          referrer: log.decodedEvent.params.referrer,
          transactionHash: log.transactionHash,
          blockNumber: parseInt(log.blockNumber),
          timestamp: Date.now(),
          rawPayload: log
        };

        // Ghi thẳng vào ví - MongoDB tự tạo collection 'webhook_logs' nếu chưa có
        await db.collection('webhook_logs').insertOne(logEntry);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}