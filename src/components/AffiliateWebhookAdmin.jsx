import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  ExternalLink, 
  Activity, 
  Check, 
  Terminal, 
  Settings, 
  Users, 
  DollarSign, 
  Layers,
  Play,
  RefreshCw,
  Cpu
} from 'lucide-react';

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Cấu hình siêu dữ liệu Webhook hệ thống
  const webhookData = {
    affiliate: {
      name: 'AFFILIATE TRACKER WEBHOOK',
      id: 'wh_pqra43npyunzk8w7',
      contract: '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c',
      description: 'Giám sát thời gian thực các sự kiện log giao dịch và đăng ký của hệ thống Affiliate giới thiệu hiến máu.',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_pqra43npyunzk8w7',
      query: `{
  block {
    hash, number, timestamp,
    logs(filter: {addresses: ["0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c"]}) { 
      data, topics, index,
      account { address },
      transaction { hash, nonce, index, from { address }, to { address }, value, gasPrice, status, gasUsed }
    }
  }
}`
    },
    paymaster: {
      name: 'HIENMAUPAYMASTERCONTRACT',
      id: 'wh_ck5mia12huh25nvp',
      contract: '0x177858e3450ff286E7d301100363567A555E435f',
      description: 'Giám sát luồng phí giao dịch tài trợ gas (Gas Sponsorship) và các log phát sinh từ Paymaster Smart Contract.',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_ck5mia12huh25nvp',
      query: `{
  block {
    hash, number, timestamp,
    logs(filter: {addresses: ["0x177858e3450ff286E7d301100363567A555E435f"]}) { 
      data, topics, index,
      account { address },
      transaction { hash, nonce, index, from { address }, to { address }, value, gasPrice, status, gasUsed }
    }
  }
}`
    }
  };

  const targetEndpoint = "https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook";

  // Khởi tạo một số log mẫu ban đầu chuẩn cấu trúc Alchemy Custom Webhook
  useEffect(() => {
    const mockInitialLogs = [
      {
        webhookId: "wh_pqra43npyunzk8w7",
        id: "evt_alc_01h5m9x7r4j2ut5qk001",
        createdAt: new Date(Date.now() - 300000).toISOString(),
        type: "GRAPHQL",
        event: {
          block: {
            hash: "0x8fa4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4",
            number: 3410594,
            timestamp: Math.floor(Date.now() / 1000) - 300,
            logs: [
              {
                data: "0x00000000000000000000000011223344556677889900aabbccddeeff00112233",
                topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
                index: 0,
                account: { address: "0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c" },
                transaction: {
                  hash: "0x3b6f2c1a5d4e3f2b1a0c9e8d7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
                  nonce: 42,
                  index: 12,
                  from: { address: "0xaa11bb22cc33dd44ee55ff66gg77hh88ii99jj00" },
                  to: { address: "0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c" },
                  value: "0",
                  gasPrice: "5000000000",
                  status: 1,
                  gasUsed: "65243"
                }
              }
            ]
          }
        }
      }
    ];
    setLogs(mockInitialLogs);
    setSelectedLog(mockInitialLogs[0]);
  }, []);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Hàm giả lập kích hoạt bắn một Webhook data mới từ Alchemy sang Client
  const handleSimulateWebhook = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const activeData = webhookData[activeWebhookTab];
      const randomHex = () => '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
      const currentBlock = Math.floor(3410594 + Math.random() * 100);

      const newPayload = {
        webhookId: activeData.id,
        id: `evt_alc_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        type: "GRAPHQL",
        event: {
          block: {
            hash: randomHex(),
            number: currentBlock,
            timestamp: Math.floor(Date.now() / 1000),
            logs: [
              {
                data: randomHex(),
                topics: [randomHex()],
                index: 0,
                account: { address: activeData.contract },
                transaction: {
                  hash: randomHex(),
                  nonce: Math.floor(Math.random() * 100),
                  index: Math.floor(Math.random() * 50),
                  from: { address: randomHex().substring(0, 42) },
                  to: { address: activeData.contract },
                  value: activeWebhookTab === 'paymaster' ? "25000000000000000" : "0", // Tài trợ gas ví dụ
                  gasPrice: "5000000000",
                  status: 1,
                  gasUsed: activeWebhookTab === 'paymaster' ? "45000" : "72000"
                }
              }
            ]
          }
        }
      };

      setLogs(prev => [newPayload, ...prev]);
      setSelectedLog(newPayload);
      setIsSimulating(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-emerald-500 w-7 h-7 animate-spin-slow" />
          Quản Trị Hệ Thống & Cấu Hình Webhook
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Quản lý vòng đời Smart Contract, phân tích Affiliate Tracker và giám sát cổng kết nối chuỗi khối On-chain.
        </p>
      </div>

      {/* Grid Tổng quan trạng thái hệ thống */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Tổng Đối Tác Affiliate</p>
            <p className="text-2xl font-bold text-white mt-1">1,248</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Gas Tài Trợ (Paymaster)</p>
            <p className="text-2xl font-bold text-white mt-1">4.825 BNB</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-lg">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Tín Hiệu Webhook (24h)</p>
            <p className="text-2xl font-bold text-white mt-1 text-emerald-400">Ổn định (Active)</p>
          </div>
        </div>
      </div>

      {/* Khu vực chính: Cấu hình Webhook */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="text-emerald-400 w-5 h-5" />
            Cấu Hình Kết Nối Alchemy Webhooks
          </h2>
          <span className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Kết nối Live
          </span>
        </div>

        {/* Bộ chọn Tab Webhook */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Tab Affiliate */}
          <button 
            onClick={() => setActiveWebhookTab('affiliate')}
            className={`text-left p-5 rounded-xl border transition-all relative ${
              activeWebhookTab === 'affiliate' 
                ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-bold tracking-wide text-slate-200">AFFILIATE TRACKER WEBHOOK</span>
              <ShieldCheck className="text-emerald-400 w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-slate-400 select-all mb-3">{webhookData.affiliate.id}</p>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {webhookData.affiliate.description}
            </p>
          </button>

          {/* Tab Paymaster */}
          <button 
            onClick={() => setActiveWebhookTab('paymaster')}
            className={`text-left p-5 rounded-xl border transition-all relative ${
              activeWebhookTab === 'paymaster' 
                ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-bold tracking-wide text-slate-200">HIENMAUPAYMASTERCONTRACT</span>
              <ShieldCheck className="text-emerald-400 w-5 h-5" />
            </div>
            <p className="text-xs font-mono text-slate-400 select-all mb-3">{webhookData.paymaster.id}</p>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {webhookData.paymaster.description}
            </p>
          </button>
        </div>

        {/* Nội dung chi tiết của Webhook đang chọn */}
        <div className="border-t border-slate-800/80 pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-sm font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-sm"></span>
              Thông tin kết nối: {webhookData[activeWebhookTab].name}
            </h3>
            
            {/* Nút trigger kích hoạt dữ liệu chạy thử */}
            <button
              onClick={handleSimulateWebhook}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Đang truyền dữ liệu...' : 'Bắn thử Mock Webhook (Test)'}
            </button>
          </div>

          <div className="space-y-6">
            {/* 1. Target URL */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                1. Vercel Production Endpoint URL (Target URL nhận POST Request):
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-300 flex items-center justify-between shadow-inner overflow-x-auto">
                  <span>{targetEndpoint}</span>
                </div>
                <button 
                  onClick={() => handleCopy(targetEndpoint)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center gap-2 border border-slate-700 font-medium text-sm whitespace-nowrap min-w-[110px] justify-center"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Đã lưu!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Direct Admin Link */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                2. Link cấu hình & Quản lý trực tiếp trên Alchemy:
              </label>
              <a 
                href={webhookData[activeWebhookTab].dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl font-mono text-sm transition-all shadow-inner w-full md:w-auto"
              >
                <span>{webhookData[activeWebhookTab].dashboardUrl}</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            </div>

            {/* 3. Contract Address monitored */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                3. Địa chỉ Contract đang giám sát log sự kiện:
              </label>
              <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-3">
                <Terminal className="text-slate-500 w-4 h-4" />
                <span className="font-mono text-sm text-slate-300 select-all">{webhookData[activeWebhookTab].contract}</span>
              </div>
            </div>

            {/* 4. GraphQL Query Schema Template */}
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                4. Cấu trúc GraphQL Schema đăng ký (Query Template):
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner max-h-48 overflow-y-auto">
                <pre className="font-mono text-xs text-slate-400 leading-relaxed whitespace-pre select-all">
                  {webhookData[activeWebhookTab].query}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN MỚI NÂNG CẤP: Bộ giám sát luồng dữ liệu chạy thực (JSON Payload Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Danh sách các sự kiện bắt được */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Lịch sử luồng sự kiện (Live)
            </h4>
            <span className="text-slate-500 font-mono text-xs">{logs.filter(l => l.webhookId === webhookData[activeWebhookTab].id).length} nhận được</span>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {logs.filter(log => log.webhookId === webhookData[activeWebhookTab].id).map((log, idx) => (
              <div 
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedLog?.id === log.id 
                    ? 'bg-slate-800/80 border-emerald-500/50' 
                    : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Block #{log.event.block.number}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate">ID: {log.id}</p>
                <p className="text-[11px] font-mono text-emerald-400/90 truncate mt-1">
                  Tx: {log.event.block.logs[0]?.transaction.hash}
                </p>
              </div>
            ))}
            {logs.filter(log => log.webhookId === webhookData[activeWebhookTab].id).length === 0 && (
              <div className="text-center py-12 text-slate-600 text-sm">
                Chưa có dữ liệu on-chain nào đổ về tab này. Ấn nút "Bắn thử Mock Webhook" phía trên để kích hoạt luồng dữ liệu.
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Trình thám mã JSON Data cấu trúc truyền từ Alchemy */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[450px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              Chi tiết cấu trúc Alchemy Custom Webhook Payload (JSON)
            </h4>
            {selectedLog && (
              <button 
                onClick={() => handleCopy(JSON.stringify(selectedLog, null, 2))}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800"
              >
                <Copy className="w-3 h-3" /> Sao chép JSON
              </button>
            )}
          </div>

          <div className="bg-slate-950 border border-slate-800/60 rounded-xl p-4 flex-1 overflow-auto custom-scrollbar font-mono text-xs text-blue-400 leading-relaxed">
            {selectedLog ? (
              <pre className="whitespace-pre text-slate-300">{JSON.stringify(selectedLog, null, 2)}</pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                Chọn một log sự kiện ở bên trái để thám mã JSON Payload chi tiết.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}