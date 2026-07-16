// File: api/alchemy-webhook.js

export default async function handler(req, res) {
  // Webhook của Alchemy luôn gửi qua phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Chỉ chấp nhận phương thức POST' });
  }

  try {
    // 1. Lấy dữ liệu payload từ Alchemy gửi sang
    const payload = req.body;
    
    // In ra console để debug (nếu chạy trên Vercel, bạn có thể xem trong tab Logs)
    console.log("Nhận được webhook từ Alchemy:", JSON.stringify(payload, null, 2));

    // 2. Bóc tách dữ liệu theo đúng cấu trúc GraphQL bạn đã setup
    const block = payload?.event?.data?.block; 
    // Lưu ý: Cấu trúc thực tế Alchemy bọc event trong payload.event.data, hãy log ra để check chính xác
    
    if (block && block.logs) {
      const logs = block.logs;
      
      for (const log of logs) {
        const txHash = log.transaction?.hash;
        const from = log.transaction?.from?.address;
        const value = log.transaction?.value;
        
        console.log(`Có biến động từ ví: ${from}, TxHash: ${txHash}`);
        
        // ==========================================
        // 3. THỰC HIỆN LOGIC CỦA BẠN TẠI ĐÂY
        // ==========================================
        // - Lưu lịch sử giao dịch vào Database (MongoDB/PostgreSQL/...)
        // - Hoặc cộng điểm/thưởng token cho user trong hệ thống Affiliate
      }
    }

    // 4. Bắt buộc phải trả về status 200 để báo cho Alchemy biết là đã nhận thành công
    // Nếu không, Alchemy sẽ spam gửi lại (retry) liên tục
    return res.status(200).json({ success: true, message: "Webhook received successfully" });

  } catch (error) {
    console.error("Lỗi xử lý webhook:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}