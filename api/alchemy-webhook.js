import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Vui lòng thêm MONGODB_URI vào Environment Variables');
}

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
    // PHÒNG THỦ 1: Ép kiểu Object an toàn nếu req.body truyền tới ở dạng Chuỗi (String)
    let payload = req.body;
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }

    // Log kiểm tra gói tin thô trên Vercel để phục vụ debug
    console.log("--- WEBHOOK RECEIVED ---");
    console.log("Webhook ID:", payload?.webhookId);
    
    const block = payload?.event?.data?.block; 

    // PHÒNG THỦ 2: Kiểm tra sự tồn tại của block và mảng logs bên trong
    if (block && block.logs && block.logs.length > 0) {
      console.log(`Phát hiện có ${block.logs.length} logs sự kiện khớp điều kiện filter!`);

      const mongoClient = await clientPromise;
      const db = mongoClient.db("ai-doctor-db"); 
      const collection = db.collection("webhook_logs"); 

      const logsToInsert = [];

      for (const log of block.logs) {
        const txHash = log.transaction?.hash;
        const from = log.transaction?.from?.address || log.account?.address;
        
        logsToInsert.push({
          txHash: txHash || "0xUnknown",
          wallet: from || "0xUnknown",
          type: payload.webhookId || 'alchemy_webhook_event',
          createdAt: new Date(),
          rawLog: log 
        });
      }

      if (logsToInsert.length > 0) {
        const result = await collection.insertMany(logsToInsert);
        console.log(`Đã ghi thành công ${result.insertedCount} logs vào MongoDB.`);
        return res.status(200).json({ success: true, insertedCount: result.insertedCount });
      }
    } else {
      // Trường hợp block.logs rỗng (Alchemy quét block định kỳ nhưng không có giao dịch)
      console.log("Gói tin nhận được thành công, nhưng mảng logs trống (Không có Tx nào khớp filter).");
    }

    return res.status(200).json({ 
      success: true, 
      message: "Webhook processed successfully but no matching logs found in this block." 
    });

  } catch (error) {
    console.error("CRITICAL ERROR trong Webhook Handler:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}