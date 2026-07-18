import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Copy, ExternalLink, Activity, Check, Terminal, Settings, 
  Play, RefreshCw, Cpu, Wifi, Code, Filter, Clock, X, ChevronDown, 
  RotateCcw, ChevronLeft, ChevronRight, Database, AlertTriangle, FileCode, Wallet, Layers
} from 'lucide-react';

// =========================================================================
// INDEXEDDB DATABASE ENGINE (LƯU TRỮ PERSISTENT CHO ALCHEMY HISTORICAL LOGS)
// =========================================================================
const DB_NAME = 'HMNV_Alchemy_Logs_DB';
const DB_VERSION = 1;
const STORE_NAME = 'alchemy_logs';

const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      if (!event.target.result.objectStoreNames.contains(STORE_NAME)) {
        event.target.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

const saveLogToIndexedDB = async (logEntry) => {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const request = transaction.objectStore(STORE_NAME).put(logEntry);
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) { console.error("IndexedDB Save Error:", error); }
};

const getAllLogsFromIndexedDB = async () => {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = (event) => {
        const logs = event.target.result || [];
        resolve(logs.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) { return []; }
};

const clearAllLogsFromIndexedDB = async () => {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const request = transaction.objectStore(STORE_NAME).clear();
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) { console.error("IndexedDB Clear Error:", error); }
};

const shortenAddress = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '0x...';

const generateCurlCommand = (log) => {
  if (!log) return '';
  return `curl https://bnb-testnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY \\\n  -X POST \\\n  -H "accept: application/json" \\\n  -H "content-type: application/json" \\\n  --data '${JSON.stringify(log.requestBody)}'`;
};

// Cấu trúc mẫu UserOperation v0.6 chuẩn của Account Abstraction giống trên Dashboard hình ảnh
const MOCK_USER_OP_V06 = {
  sender: "0x177858e3450ff286E7d301100363567A555E435f",
  nonce: "0x1",
  initCode: "0x",
  callData: "0xabcdef",
  callGasLimit: "0x5208",
  verificationGasLimit: "0x5208",
  preVerificationGas: "0x5208",
  maxFeePerGas: "0x1",
  maxPriorityFeePerGas: "0x1",
  paymasterAndData: "0x",
  signature: "0x"
};

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copiedType, setCopiedType] = useState(''); 
  
  // Quản lý Danh mục Phương thức (standard = RPC Cơ bản | aa = Account Abstraction)
  const [sandboxCategory, setSandboxCategory] = useState('standard');
  const [customAddress, setCustomAddress] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c');

  const [selectedRpcMethod, setSelectedRpcMethod] = useState('alchemy_getAssetTransfers');
  const [blockParam, setBlockParam] = useState('0x7226a16'); 
  const [txFrom, setTxFrom] = useState('0x60d492288df05122a47421b91cd94df5016c2b9d');
  const [txValue, setTxValue] = useState('0x0');
  const [feeBlockCount, setFeeBlockCount] = useState('0x5');
  const [feeNewestBlock, setFeeNewestBlock] = useState('latest');
  const [feePercentiles, setFeePercentiles] = useState('20, 30');
  const [logsFromBlock, setLogsFromBlock] = useState('0x137d3c2');
  const [logsToBlock, setLogsToBlock] = useState('0x137d3cb'); 
  const [logsTopics, setLogsTopics] = useState('');

  // JSON EDITOR STATE
  const [editableJsonInput, setEditableJsonInput] = useState('');

  const [isLoadingRpc, setIsLoadingRpc] = useState(false);
  const [rawRpcResponse, setRawRpcResponse] = useState(null);
  const [requestLogs, setRequestLogs] = useState([]);
  const [selectedRequestLog, setSelectedRequestLog] = useState(null);

  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('hour'); 
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 
  
  const dropdownRef = useRef(null);
  const ALCHEMY_RPC_URL = "https://bnb-testnet.g.alchemy.com/v2/3P6Sj-7RXbrD7znG4t8f8";
  const targetEndpoint = "https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook";

  const webhookData = {
    affiliate: { contract: '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c', dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_pqra43npyunzk8w7' },
    paymaster: { contract: '0x177858e3450ff286E7d301100363567A555E435f', dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_ck5mia12huh25nvp' }
  };

  const timeFilterOptions = [
    { key: '5min', label: 'Last 5 minutes' },
    { key: 'hour', label: 'Last hour' },
    { key: 'day', label: 'Last day' }
  ];

  useEffect(() => {
    const loadLogs = async () => {
      const persistedLogs = await getAllLogsFromIndexedDB();
      if (persistedLogs.length > 0) {
        setRequestLogs(persistedLogs);
        setSelectedRequestLog(persistedLogs[0]);
      }
    };
    loadLogs();
  }, []);

  // Tự động chuyển đổi danh mục phương thức & nạp dữ liệu JSON mẫu tương thích
  useEffect(() => {
    if (sandboxCategory === 'aa') {
      setSelectedRpcMethod('pm_getPaymasterData');
    } else {
      setSelectedRpcMethod('alchemy_getAssetTransfers');
    }
  }, [sandboxCategory]);

  // Sinh cây cấu trúc JSON tự động theo hàm được chọn
  useEffect(() => {
    const targetQueryAddress = customAddress.trim();
    let paramsBody = [];

    if (selectedRpcMethod.startsWith('pm_')) {
      paramsBody = [
        MOCK_USER_OP_V06,
        "0x5FF137D4b0fDCd49DcA30c7CF57E578a026d2789", // EntryPoint v0.6 Address chuẩn EVM
        "0x61", // BSC Testnet hex
        { policyId: "hmnv-gas-policy-2026" }
      ];
    } else if (selectedRpcMethod === 'alchemy_getAssetTransfers') {
      paramsBody = [{ fromBlock: "0x0", toBlock: "latest", toAddress: targetQueryAddress, category: ["external", "erc20"], excludeZeroValue: false, withMetadata: true }];
    } else if (selectedRpcMethod === 'eth_getLogs') {
      paramsBody = [{ fromBlock: logsFromBlock, toBlock: logsToBlock, address: targetQueryAddress }];
    } else if (selectedRpcMethod === 'eth_getBlockReceipts') {
      paramsBody = [blockParam];
    } else {
      paramsBody = [];
    }

    const fullRpcPayload = { jsonrpc: "2.0", id: 1, method: selectedRpcMethod, params: paramsBody };
    setEditableJsonInput(JSON.stringify(fullRpcPayload, null, 2));
  }, [selectedRpcMethod, customAddress, logsFromBlock, logsToBlock, blockParam]);

  useEffect(() => {
    const defaultContract = webhookData[activeWebhookTab].contract;
    setCustomAddress(defaultContract);
    if (activeWebhookTab === 'paymaster') {
      setSandboxCategory('aa');
    } else {
      setSandboxCategory('standard');
    }
  }, [activeWebhookTab]);

  const handleExecuteDataEngineCall = async () => {
    setIsLoadingRpc(true);
    setRawRpcResponse(null);
    const startTime = performance.now();

    let finalPayload;
    try {
      finalPayload = JSON.parse(editableJsonInput);
    } catch (e) {
      setRawRpcResponse({ error: "Lỗi định dạng JSON", details: "Cú pháp JSON trong hộp soạn thảo không hợp lệ." });
      setIsLoadingRpc(false);
      return;
    }

    try {
      const response = await fetch(ALCHEMY_RPC_URL, {
        method: 'POST',
        headers: { 'accept': 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });
      const resData = await response.json();
      const duration = Math.round(performance.now() - startTime);

      setRawRpcResponse(resData);
      
      const newLogEntry = {
        id: `alc_${Math.random().toString(36).substr(2, 7)}`,
        method: finalPayload.method || selectedRpcMethod,
        app: "Khánh's First App",
        httpStatus: response.status,
        errorCode: resData.error ? String(resData.error.code) : "-",
        errorMessage: resData.error ? resData.error.message : "-",
        responseTime: `${duration} ms`,
        timeSent: new Date().toLocaleTimeString(),
        timestamp: Date.now(),
        requestBody: finalPayload,
        responseBody: resData
      };
      
      await saveLogToIndexedDB(newLogEntry);
      setRequestLogs(prev => [newLogEntry, ...prev]);
      setSelectedRequestLog(newLogEntry);
      setCurrentPage(1);
    } catch (error) {
      setRawRpcResponse({ error: "Lỗi kết nối RPC Node Alchemy", details: error.message });
    } finally {
      setIsLoadingRpc(false);
    }
  };

  const handleClearTerminalHistory = async () => {
    if(window.confirm("Bồ có chắc chắn muốn xoá sạch toàn bộ nhật ký lưu trữ trong IndexedDB không?")) {
      await clearAllLogsFromIndexedDB();
      setRequestLogs([]);
      setSelectedRequestLog(null);
    }
  };

  const handleCopyClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(''), 2000);
  };

  const currentPagedLogs = requestLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Main Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-blue-500 w-7 h-7" /> Hệ Thống Quản Trị Webhook & Alchemy Sandbox
        </h1>
      </div>

      {/* KHU VỰC 1: CẤU HÌNH WEBHOOK PRODUCTION INFO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button onClick={() => setActiveWebhookTab('affiliate')} className={`text-left p-5 rounded-xl border transition-all ${activeWebhookTab === 'affiliate' ? 'bg-slate-950/80 border-blue-500 ring-1 ring-blue-500/30 font-bold' : 'bg-slate-950/20 border-slate-800 text-slate-400'}`}>
            <span className="text-sm font-bold tracking-wide block mb-1">AFFILIATE TRACKER WEBHOOK TARGET</span>
            <span className="text-xs font-mono text-slate-500 block truncate">{webhookData.affiliate.contract}</span>
          </button>
          <button onClick={() => setActiveWebhookTab('paymaster')} className={`text-left p-5 rounded-xl border transition-all ${activeWebhookTab === 'paymaster' ? 'bg-slate-950/80 border-blue-500 ring-1 ring-blue-500/30 font-bold' : 'bg-slate-950/20 border-slate-800 text-slate-400'}`}>
            <span className="text-sm font-bold tracking-wide block mb-1">HIENMAUPAYMASTERCONTRACT (ERC-4337)</span>
            <span className="text-xs font-mono text-slate-500 block truncate">{webhookData.paymaster.contract}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vercel Webhook Endpoint Gateway:</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-300 overflow-x-auto flex items-center">{targetEndpoint}</div>
              <button onClick={() => handleCopyClipboard(targetEndpoint, 'endpoint')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors">
                {copiedType === 'endpoint' ? 'Đã lưu!' : 'Sao chép'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alchemy App Production Control:</span>
            <a href={webhookData[activeWebhookTab].dashboardUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline font-mono">
              <span>Mở bảng cấu hình Webhook Dashboard trên Alchemy</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* STATS CONTROL CARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Active Sandbox Target Input</p>
          <p className="text-xs font-mono text-blue-400 mt-2 truncate select-all">{customAddress}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Alchemy IndexedDB Logs History Layer</p>
          <p className="text-sm font-bold text-emerald-400 mt-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> PERSISTENT ENGINE ONLINE ({requestLogs.length} Saved)
          </p>
        </div>
      </div>

      {/* KHU VỰC 2: ALCHEMY SANDBOX STUDIO (BẢNG ĐIỀU KHIỂN ĐA NĂNG ĐÃ NÂNG CẤP) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <Code className="w-4 h-4 text-blue-400" /> Alchemy Integrated Sandbox Console
          </h2>
          
          {/* BỘ CHỌN CATEGORY ĐỂ PHÂN CHIA PHƯƠNG THỨC TRỰC QUAN */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button onClick={() => setSandboxCategory('standard')} className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${sandboxCategory === 'standard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Standard & Enhanced RPC
            </button>
            <button onClick={() => setSandboxCategory('aa')} className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${sandboxCategory === 'aa' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Account Abstraction (ERC-4337)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Method</label>
            {sandboxCategory === 'aa' ? (
              <select value={selectedRpcMethod} onChange={(e) => setSelectedRpcMethod(e.target.value)} className="w-full bg-slate-950 border border-purple-900 rounded-xl px-3 py-2 text-sm text-purple-400 font-mono focus:outline-none focus:border-purple-500">
                <option value="pm_getPaymasterData">pm_getPaymasterData (Xác thực tài trợ Gas)</option>
                <option value="pm_getPaymasterStubData">pm_getPaymasterStubData (Ước tính phí Gas AA)</option>
                <option value="alchemy_requestPaymasterAndData">alchemy_requestPaymasterAndData (Auto Policy Signature)</option>
              </select>
            ) : (
              <select value={selectedRpcMethod} onChange={(e) => setSelectedRpcMethod(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-500">
                <option value="alchemy_getAssetTransfers">alchemy_getAssetTransfers (Quét sâu dòng tiền)</option>
                <option value="eth_getLogs">eth_getLogs (Truy vết Event Logs)</option>
                <option value="eth_getBlockReceipts">eth_getBlockReceipts (Biên lai khối)</option>
                <option value="eth_estimateGas">eth_estimateGas (Ước lượng Gas tiêu thụ)</option>
                <option value="eth_feeHistory">eth_feeHistory (Lịch sử cấu trúc phí)</option>
                <option value="eth_blockNumber">eth_blockNumber (Số khối mới nhất)</option>
              </select>
            )}
          </div>

          <div className="lg:col-span-7">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-slate-500" /> Target Address Payload Param
            </label>
            <input type="text" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} placeholder="0x..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-blue-500" />
          </div>

          <div className="lg:col-span-2">
            <button onClick={handleExecuteDataEngineCall} disabled={isLoadingRpc} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all h-[38px]"><Play className={`w-4 h-4 ${isLoadingRpc ? 'animate-spin' : ''}`} /> Send Request</button>
          </div>
        </div>

        {/* Khung cấu hình khối phụ trợ mở rộng khi bồ chọn eth_getLogs */}
        {selectedRpcMethod === 'eth_getLogs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl animate-fadeIn text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">fromBlock</label>
              <input type="text" value={logsFromBlock} onChange={(e) => setLogsFromBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">toBlock (Phòng vệ tối đa +10 khối Free tier)</label>
              <input type="text" value={logsToBlock} onChange={(e) => setLogsToBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none" />
            </div>
          </div>
        )}

        {/* KHÔNG GIAN SOẠN THẢO JSON EDITOR TRỰC TIẾP GIỐNG ALCHEMY SANDBOX CONSOLE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px] text-slate-500 uppercase font-bold tracking-wider">
              <span>✍ Code Request Editor (JSON-RPC Structure)</span>
              <button onClick={() => handleCopyClipboard(editableJsonInput, 'editor')} className="text-blue-400 text-[10px] hover:underline">{copiedType === 'editor' ? 'Copied!' : 'Copy Body'}</button>
            </div>
            <textarea 
              value={editableJsonInput} 
              onChange={(e) => setEditableJsonInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-pink-400 h-64 focus:outline-none focus:border-blue-500 resize-none custom-scrollbar"
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">➔ Response Execution Output Preview</div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-blue-400 h-64 overflow-y-auto custom-scrollbar">
              {rawRpcResponse ? <pre className="whitespace-pre">{JSON.stringify(rawRpcResponse, null, 2)}</pre> : <span className="text-slate-600 text-center block pt-24">Cấu hình tham số JSON bên trái và bấm "Send Request"...</span>}
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC 3: MÀN HÌNH THEO DÕI LOGS LỊCH SỬ TỪ INDEXEDDB LÊN UI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Clock className="text-blue-400 w-5 h-5" /> Alchemy Request Logs Console Database</h2>
            <p className="text-xs text-slate-400 mt-0.5">Lọc, kiểm tra cấu trúc cURL và gói tin thô trước/sau khi chạy lại.</p>
          </div>
          <button onClick={handleClearTerminalHistory} className="px-3 py-1.5 bg-rose-950/40 border border-rose-900/60 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-rose-900/30 transition-colors"><RotateCcw className="w-3.5 h-3.5" /> Clear Logs History Database</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Bảng Logs danh sách rút gọn phía bên trái */}
          <div className="lg:col-span-2 flex flex-col border border-slate-800/80 rounded-xl bg-slate-950/20 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/40">
                  <th className="p-3">Method</th>
                  <th className="p-3">HTTP</th>
                  <th className="p-3">Error</th>
                  <th className="p-3 text-right">Response Time</th>
                  <th className="p-3 text-right">Time Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {currentPagedLogs.map((log) => (
                  <tr key={log.id} onClick={() => setSelectedRequestLog(log)} className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${selectedRequestLog?.id === log.id ? 'bg-slate-800/50 border-l-2 border-l-blue-500' : ''}`}>
                    <td className="p-3 font-mono text-slate-200">{log.method}</td>
                    <td className="p-3"><span className="text-emerald-400 font-medium">{log.httpStatus}</span></td>
                    <td className="p-3 font-mono text-slate-500">{log.errorCode}</td>
                    <td className="p-3 text-right text-emerald-400">{log.responseTime}</td>
                    <td className="p-3 text-right text-slate-500">{log.timeSent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requestLogs.length === 0 && <div className="text-center py-12 text-slate-600 font-medium bg-slate-950/20">Hệ thống cơ sở dữ liệu logs đang trống rỗng.</div>}
          </div>

          {/* Cụm Panel chi tiết phải: Hiện cURL, Request và Response chuẩn chỉ */}
          <div className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1 border-b border-slate-900 pb-2"><FileCode className="w-4 h-4 text-emerald-400" /> Log Inspector Block</h3>
            
            {selectedRequestLog ? (
              <div className="space-y-4 text-xs">
                {/* 1. Request Block */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase text-slate-400">➔ Request JSON</span>
                    <button 
                      onClick={() => {
                        setSandboxCategory(selectedRequestLog.method.startsWith('pm_') ? 'aa' : 'standard');
                        setSelectedRpcMethod(selectedRequestLog.method);
                        setEditableJsonInput(JSON.stringify(selectedRequestLog.requestBody, null, 2));
                        window.scrollTo({ top: 320, behavior: 'smooth' });
                      }}
                      className="text-[10px] text-blue-400 hover:underline"
                    >
                      Retry in Sandbox
                    </button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-36 overflow-auto font-mono text-[11px] text-pink-400 custom-scrollbar"><pre>{JSON.stringify(selectedRequestLog.requestBody, null, 2)}</pre></div>
                </div>

                {/* 2. cURL Script Generator */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">cURL Shell Command</span>
                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre">{generateCurlCommand(selectedRequestLog)}</div>
                </div>

                {/* 3. Response Block */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">⬇ Response Payload</span>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-40 overflow-auto font-mono text-[11px] text-blue-400 custom-scrollbar"><pre>{JSON.stringify(selectedRequestLog.responseBody, null, 2)}</pre></div>
                </div>
              </div>
            ) : <div className="text-slate-600 text-center py-12">Chọn một hàng để mở hộp kiểm tra gói tin payload.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}