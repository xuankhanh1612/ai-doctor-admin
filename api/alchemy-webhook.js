import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Vui lòng thêm MONGODB_URI vào Environment Variables');
}

// Tối ưu hoá kết nối cho môi trường Serverless
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Chỉ chấp nhận phương thức POST' });
  }

  try {
    const payload = req.body;
    const block = payload?.event?.data?.block; 

    if (block && block.logs) {
      // 1. Kết nối DB
      const mongoClient = await clientPromise;
      const db = mongoClient.db("ai-doctor-db"); // Tên DB của bạn
      const collection = db.collection("webhook_logs"); // Tên bảng (collection)

      const logsToInsert = [];

      // 2. Lặp qua các log giao dịch Alchemy gửi tới
      for (const log of block.logs) {
        const txHash = log.transaction?.hash;
        const from = log.transaction?.from?.address;
        
        logsToInsert.push({
          txHash: txHash,
          wallet: from,
          type: 'alchemy_webhook_event',
          createdAt: new Date(),
          rawLog: log // Lưu cả cục data gốc phòng khi cần phân tích sau
        });
      }

      // 3. Lưu vào MongoDB
      if (logsToInsert.length > 0) {
        await collection.insertMany(logsToInsert);
        console.log(`Đã lưu ${logsToInsert.length} giao dịch vào MongoDB`);
      }
    }

    return res.status(200).json({ success: true, message: "Webhook received and saved successfully" });

  } catch (error) {
    console.error("Lỗi xử lý webhook:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}