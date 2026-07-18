// api/moralis-webhook.js
import crypto from 'crypto';
import { connectToDatabase } from './_lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Xác thực chữ ký bảo mật bảo vệ webhook
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
    return res.status(200).json({ status: 'HMNV Webhook Active & Secured!' });
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

        // Ghi dữ liệu trực tiếp lên Atlas Cloud
        await db.collection('webhook_logs').insertOne(logEntry);
      }
    }

    return res.status(200).json({ success: true, count: logs.length });
  } catch (error) {
    console.error('[Webhook Write Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}