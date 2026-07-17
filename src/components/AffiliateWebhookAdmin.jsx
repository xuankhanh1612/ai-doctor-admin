import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  ExternalLink, 
  Activity, 
  Check, 
  Terminal, 
  Settings, 
  Layers,
  Play,
  RefreshCw,
  Cpu,
  Wifi,
  Code
} from 'lucide-react';

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copied, setCopied] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [selectedWebhookLog, setSelectedWebhookLog] = useState(null);
  
  // State quản lý phần tương tác Node RPC Sandbox thực tế
  const [selectedRpcMethod, setSelectedRpcMethod] = useState('eth_blockNumber');
  const [blockParam, setBlockParam] = useState('0x7225208'); 
  
  // State mới cho các tham số ước tính Gas (eth_estimateGas)
  const [txFrom, setTxFrom] = useState('0x60d492288df05122a47421b91cd94df5016c2b9d');
  const [txTo, setTxTo] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c'); // Mặc định ví Contract Affiliate
  const [txValue, setTxValue] = useState('0x0');

  const [isLoadingRpc, setIsLoadingRpc] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [rawRpcResponse, setRawRpcResponse] = useState(null);
  const [latestLiveBlock, setLatestBlock] = useState('0x0');
  const [rpcStatus, setRpcStatus] = useState('connecting');

  const ALCHEMY_RPC_URL = "https://bnb-testnet.g.alchemy.com/v2/3P6Sj-7RXbrD7znG4t8f8";
  const targetEndpoint = "https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook";

  const webhookData = {
    affiliate: {
      name: 'AFFILIATE TRACKER WEBHOOK',
      id: 'wh_pqra43npyunzk8w7',
      contract: '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_pqra43npyunzk8w7',
      query: `{
  block {
    hash, number, timestamp,
    logs(filter: {addresses: ["0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c"]}) { 
      data, topics, index,
      account { address },
      transaction { hash, nonce, index, from { address }, to { address }, value, status, gasUsed }
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
      transaction { hash, nonce, index, from { address }, to { address }, value, status, gasUsed }
    }
  }
}`
    }
  };

  // Hàm gọi RPC chạy thật: Tự động đóng gói cấu trúc mảng Params tương ứng với từng Method
  const handleCallAlchemyRpc = async () => {
    setIsLoadingRpc(true);
    setRawRpcResponse(null);
    
    const rpcBody = {
      jsonrpc: "2.0",
      id: 1,
      method: selectedRpcMethod
    };

    // Điều hướng tham số động dựa trên phương thức được chọn
    if (selectedRpcMethod === 'eth_getBlockReceipts') {
      const formattedBlock = blockParam.startsWith('0x') ? blockParam : `0x${blockParam}`;
      rpcBody.params = [formattedBlock];
    } else if (selectedRpcMethod === 'eth_estimateGas') {
      rpcBody.params = [{
        from: txFrom,
        to: txTo,
        value: txValue
      }];
    }

    try {
      const response = await fetch(ALCHEMY_RPC_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rpcBody)
      });
      
      const resData = await response.json();
      setRawRpcResponse(resData);
      
      if (selectedRpcMethod === 'eth_blockNumber' && resData.result) {
        setLatestBlock(resData.result);
        setRpcStatus('connected');
      }
    } catch (error) {
      setRawRpcResponse({ 
        error: "Lỗi kết nối mạng lưới", 
        message: "Yêu cầu không thể thực thi. Hãy kiểm tra gói tin.",
        details: error.message 
      });
      setRpcStatus('error');
    } finally {
      setIsLoadingRpc(false);
    }
  };

  const handleFetchLiveWebhookLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch('/api/get-webhook-logs');
      const data = await response.json();
      if (Array.isArray(data)) {
        setWebhookLogs(data);
        if(data.length > 0) setSelectedWebhookLog(data[0]);
      }
    } catch (error) {
      console.error("Không thể kết nối API nội bộ:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (selectedRpcMethod === 'eth_blockNumber') {
      handleCallAlchemyRpc();
    }
    handleFetchLiveWebhookLogs();
  }, [activeWebhookTab]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-8 border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-emerald-500 w-7 h-7 animate-spin-slow" />
          Quản Trị Hệ Thống & Kết Nối On-Chain Real-Time
        </h1>
      </div>

      {/* TỔNG QUAN TRẠNG THÁI NODE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Alchemy RPC Endpoint URL</p>
          <p className="text-xs font-mono text-slate-500 mt-2 truncate select-all">{ALCHEMY_RPC_URL}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Latest Hex Block (Live)</p>
          <p className="text-xl font-mono font-bold text-blue-400 mt-1 select-all">{latestLiveBlock}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase">Alchemy Node Status</p>
            <p className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${rpcStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`w-2 h-2 rounded-full ${rpcStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              {rpcStatus === 'connected' ? 'CONNECTED (BSC TESTNET)' : rpcStatus === 'connecting' ? 'CONNECTING...' : 'NODE DISCONNECTED'}
            </p>
          </div>
        </div>
      </div>

      {/* KHU VỰC 1: TRÌNH THÁM MÃ ĐỘNG - ALCHEMY SANDBOX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <Code className="w-4 h-4 text-blue-400" />
            Màn hình tương tác Alchemy Sandbox (Chạy thật 100%)
          </h2>
        </div>
        
        {/* Form lựa chọn Method */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Method</label>
            <select 
              value={selectedRpcMethod} 
              onChange={(e) => setSelectedRpcMethod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-blue-500"
            >
              <option value="eth_blockNumber">eth_blockNumber - Lấy số khối mới nhất</option>
              <option value="eth_getBlockReceipts">eth_getBlockReceipts - Lấy biên lai khối</option>
              <option value="eth_estimateGas">eth_estimateGas - Ước tính Gas tiêu thụ</option>
            </select>
          </div>

          {/* Ô nhập block: Chỉ sáng lên khi chọn eth_getBlockReceipts */}
          <div className={selectedRpcMethod === 'eth_getBlockReceipts' ? 'md:col-span-1 block' : 'md:col-span-1 opacity-25 pointer-events-none'}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Block Number (Hex)</label>
            <input 
              type="text" 
              value={blockParam}
              onChange={(e) => setBlockParam(e.target.value)}
              placeholder="0x7225208"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-1">
            <button
              onClick={handleCallAlchemyRpc}
              disabled={isLoadingRpc}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 h-[38px]"
            >
              <Play className={`w-4 h-4 ${isLoadingRpc ? 'animate-spin' : ''}`} />
              {isLoadingRpc ? 'Đang gọi RPC...' : 'Send Request'}
            </button>
          </div>
        </div>

        {/* Khung tham số mở rộng: Chỉ xuất hiện khi chọn cấu hình eth_estimateGas */}
        {selectedRpcMethod === 'eth_estimateGas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl animate-fadeIn">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Transaction "from" Address</label>
              <input 
                type="text" 
                value={txFrom} 
                onChange={(e) => setTxFrom(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Transaction "to" Address</label>
              <input 
                type="text" 
                value={txTo} 
                onChange={(e) => setTxTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Transaction "value" (Hex Wei)</label>
              <input 
                type="text" 
                value={txValue} 
                onChange={(e) => setTxValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Khung Console hiển thị log kết quả JSON */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs max-h-64 overflow-y-auto custom-scrollbar">
          {rawRpcResponse ? (
            <pre className="text-emerald-400 whitespace-pre">{JSON.stringify(rawRpcResponse, null, 2)}</pre>
          ) : (
            <span className="text-slate-600">Cấu hình tham số và bấm "Send Request" để nhận kết quả JSON-RPC trả về từ chuỗi khối...</span>
          )}
        </div>
      </div>

      {/* KHU VỰC 2: CẤU HÌNH WEBHOOK WEB */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setActiveWebhookTab('affiliate')}
            className={`text-left p-5 rounded-xl border transition-all ${
              activeWebhookTab === 'affiliate' ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30' : 'bg-slate-950/40 border-slate-800'
            }`}
          >
            <span className="text-sm font-bold tracking-wide text-slate-200 block mb-1">AFFILIATE TRACKER WEBHOOK</span>
            <span className="text-xs font-mono text-slate-500">{webhookData.affiliate.id}</span>
          </button>

          <button 
            onClick={() => setActiveWebhookTab('paymaster')}
            className={`text-left p-5 rounded-xl border transition-all ${
              activeWebhookTab === 'paymaster' ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30' : 'bg-slate-950/40 border-slate-800'
            }`}
          >
            <span className="text-sm font-bold tracking-wide text-slate-200 block mb-1">HIENMAUPAYMASTERCONTRACT</span>
            <span className="text-xs font-mono text-slate-500">{webhookData.paymaster.id}</span>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Vercel Production Endpoint URL (Target URL cấu hình trên Alchemy Dashboard):
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-300 overflow-x-auto">
                {targetEndpoint}
              </div>
              <button onClick={() => handleCopy(targetEndpoint)} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium">
                {copied ? 'Đã lưu!' : 'Sao chép'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Link quản lý trực tiếp trên Alchemy Dashboard:
            </label>
            <a href={webhookData[activeWebhookTab].dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-sm rounded-xl">
              <span>{webhookData[activeWebhookTab].dashboardUrl}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* KHU VỰC 3: LIVE WEBHOOK LOGS RECEIVER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Webhook nhận từ Production (Live)
            </h4>
            <button onClick={handleFetchLiveWebhookLogs} className="text-[10px] text-blue-400 hover:underline">F5 Tải lại</button>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {webhookLogs.filter(log => log.webhookId === webhookData[activeWebhookTab].id).map((log) => (
              <div 
                key={log.id}
                onClick={() => setSelectedWebhookLog(log)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedWebhookLog?.id === log.id ? 'bg-slate-800 border-blue-500/50' : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-blue-400">Block #{log.event?.block?.number}</span>
                  <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate">ID: {log.id}</p>
              </div>
            ))}
            {webhookLogs.filter(log => log.webhookId === webhookData[activeWebhookTab].id).length === 0 && (
              <div className="text-center py-12 text-slate-600 text-xs">
                Chưa bắt được tín hiệu webhook thực tế nào bắn về API Vercel của tab này.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[350px]">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 pb-2 border-b border-slate-800 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Cấu trúc Alchemy Webhook Payload thực tế đổ bộ (JSON)
          </h4>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 overflow-auto custom-scrollbar font-mono text-xs">
            {selectedWebhookLog ? (
              <pre className="text-slate-300">{JSON.stringify(selectedWebhookLog, null, 2)}</pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm">
                Hãy cấu hình Endpoint lên Alchemy Dashboard, đợi mạng lưới phát sinh giao dịch hoặc chọn danh sách bên trái.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}