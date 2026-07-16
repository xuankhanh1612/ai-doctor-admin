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
    // PHÒNG THỦ 1: Tự động ép kiểu Object nếu payload truyền tới ở dạng string thô
    let payload = req.body;
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }

    // In log chẩn đoán lên Vercel để ông theo dõi trực tiếp luồng đi
    console.log("=== ALCHEMY WEBHOOK RECEIVED ===");
    console.log("Webhook ID:", payload?.webhookId);
    
    const block = payload?.event?.data?.block; 

    if (block && block.logs) {
      console.log(`Block số [${block.number}] đang chứa: ${block.logs.length} logs sự kiện.`);

      // Nếu mảng logs có chứa dữ liệu thực tế khớp filter contract
      if (block.logs.length > 0) {
        const mongoClient = await clientPromise;
        const db = mongoClient.db("ai-doctor-db"); 
        const collection = db.collection("webhook_logs"); 

        const logsToInsert = [];

        for (const log of block.logs) {
          const txHash = log.transaction?.hash;
          // Lấy địa chỉ ví gửi giao dịch (from) hoặc địa chỉ tài khoản sinh log
          const fromWallet = log.transaction?.from?.address || log.account?.address;
          
          logsToInsert.push({
            txHash: txHash || "0xUnknown",
            wallet: fromWallet || "0xUnknown",
            type: payload.webhookId || 'alchemy_webhook_event',
            createdAt: new Date(),
            rawLog: log 
          });
        }

        if (logsToInsert.length > 0) {
          const result = await collection.insertMany(logsToInsert);
          console.log(`🎉 Đã lưu thành công ${result.insertedCount} logs giao dịch thực tế vào MongoDB!`);
          return res.status(200).json({ success: true, insertedCount: result.insertedCount });
        }
      } else {
        // Trường hợp Alchemy gửi ping block trống định kỳ
        console.log(`Nhận ping block trống từ Alchemy (Block ${block.number} không có giao dịch nào khớp hợp đồng).`);
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: "Webhook processed successfully (No matching logs in this block)." 
    });

  } catch (error) {
    console.error("LỖI HỆ THỐNG WEBHOOK:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}