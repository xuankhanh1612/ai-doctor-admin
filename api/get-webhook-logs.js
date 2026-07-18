import { connectToDatabase } from '../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { db } = await connectToDatabase();
    
    // Lấy 50 log mới nhất xếp từ trên xuống dưới
    const logs = await db.collection('webhook_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}