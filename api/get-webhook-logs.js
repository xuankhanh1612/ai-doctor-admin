// api/get-webhook-logs.js
import { connectToDatabase } from './_lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();

    // Truy vấn 50 sự kiện đối tác mới nhất từ MongoDB Atlas
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