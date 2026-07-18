// scripts/setup-moralis-stream.js
import fetch from 'node-fetch';

const MORALIS_API_KEY = "vM7xza5AGzWH4ugv4vDQsXrPAYuP9gred2lNE7BJnKwB4D2QNuNs2Eso6Zk5pUMT"; 
const WEBHOOK_URL = "https://hien-mau-nhan-van.vercel.app/api/moralis-webhook"; // Thay bằng domain Vercel thật của bồ
const CONTRACT_ADDRESS = "0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c";

// Cấu hình ABI sự kiện để Moralis tự động giải mã hex sang dữ liệu chữ và số
const streamPayload = {
  webhookUrl: WEBHOOK_URL,
  description: "HMNV Real-time Affiliate Tracker Event Stream",
  tag: "HMNV_Affiliate",
  topic0: ["PartnerRegistered(address,address)"],
  includeContractLogs: true,
  abi: [{
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "partner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "referrer", "type": "address" }
    ],
    "name": "PartnerRegistered",
    "type": "event"
  }],
  chains: ["0x61"], // BNB Smart Chain Testnet Hex Code
  includeNativeTxs: false
};

async function createEventStream() {
  try {
    const response = await fetch("https://api.moralis-streams.com/streams/evm", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "x-api-key": MORALIS_API_KEY
      },
      body: JSON.stringify(streamPayload)
    });
    
    const result = await response.json();
    if (response.ok) {
      console.log("✅ Đăng ký Moralis Stream thành công! Stream ID:", result.id);
      console.log("Địa chỉ hợp đồng đang theo dõi:", CONTRACT_ADDRESS);
    } else {
      console.error("❌ Đăng ký thất bại:", result);
    }
  } catch (error) {
    console.error("Lỗi thực thi script setup:", error);
  }
}

createEventStream();