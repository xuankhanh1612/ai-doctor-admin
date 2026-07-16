import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Chỉ chấp nhận GET' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("ai-doctor-db");
    
    // Lấy 50 giao dịch mới nhất
    const logs = await db.collection("webhook_logs")
                         .find({})
                         .sort({ createdAt: -1 })
                         .limit(50)
                         .toArray();

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu webhook:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}