// api/moralis.js
import crypto from 'crypto';
import { connectToDatabase } from './_lib/mongodb';

export default async function handler(req, res) {
  
  // -------------------------------------------------------------------------
  // KÊNH 1 - ĐỌC DỮ LIỆU (GET): Phục vụ màn hình Admin UI React nạp dữ liệu log
  // -------------------------------------------------------------------------
  if (req.method === 'GET') {
    try {
      const { db } = await connectToDatabase();
      const logs = await db.collection('webhook_logs')
        .find({})
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();
      return res.status(200).json(logs);
    } catch (error) {
      console.error('[Get Webhook Logs Error]:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // -------------------------------------------------------------------------
  // KÊNH 2 - GHI DỮ LIỆU (POST): Tiếp nhận tín hiệu sự kiện live từ Moralis Stream
  // -------------------------------------------------------------------------
  if (req.method === 'POST') {
    const signature = req.headers['x-signature'];
    const moralisSecret = process.env.MORALIS_STREAM_SECRET;

    if (moralisSecret && signature) {
      const computedSignature = crypto
        .createHmac('sha256', moralisSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== computedSignature) {
        return res.status(401).json({ error: 'X-Signature verification failed.' });
      }
    }

    const { logs } = req.body;
    if (!logs || logs.length === 0) {
      return res.status(200).json({ status: 'HMNV Unified Webhook Active!' });
    }

    try {
      const { db } = await connectToDatabase();

      for (const log of logs) {
        if (log.decodedEvent && log.decodedEvent.eventName === 'PartnerRegistered') {
          const params = log.decodedEvent.params;

          const logEntry = {
            eventId: `evt_${Math.random().toString(36).substr(2, 7)}`,
            event: log.decodedEvent.eventName,
            partner: params.partner,
            referrer: params.referrer,
            transactionHash: log.transactionHash,
            blockNumber: parseInt(log.blockNumber),
            timestamp: Date.now(),
            rawPayload: log
          };

          await db.collection('webhook_logs').insertOne(logEntry);
        }
      }

      return res.status(200).json({ success: true, count: logs.length });
    } catch (error) {
      console.error('[Webhook Write Error]:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}