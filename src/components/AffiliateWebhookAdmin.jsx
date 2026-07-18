import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Copy, ExternalLink, Activity, Check, Terminal, Settings, Layers,
  Play, RefreshCw, Cpu, Wifi, Code, Filter, Clock, X, ChevronDown, RotateCcw,
  ChevronLeft, ChevronRight, ArrowRightLeft, Database, ArrowRight, Wallet,
  AlertTriangle, FileCode
} from 'lucide-react';

// NHẬP KHẨU SERVICE LAYER ĐÃ ĐƯỢC TÁCH FILE
import { fetchUnifiedHistory } from '../services/moralisService';

// =========================================================================
// HẠ TẦNG CƠ SỞ DỮ LIỆU INDEXEDDB ENGINE
// =========================================================================
const DB_NAME = 'HMNV_Developer_Logs_DB';
const DB_VERSION = 1;
const STORE_NAME = 'request_logs';

const initIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
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
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(logEntry);
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Lỗi ghi dữ liệu vào IndexedDB:", error);
  }
};

const getAllLogsFromIndexedDB = async () => {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = (event) => {
        const logs = event.target.result || [];
        logs.sort((a, b) => b.timestamp - a.timestamp);
        resolve(logs);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu từ IndexedDB:", error);
    return [];
  }
};

const clearAllLogsFromIndexedDB = async () => {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    console.error("Lỗi xóa sạch dữ liệu IndexedDB:", error);
  }
};

const shortenAddress = (addr) => {
  if (!addr) return '0x...';
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

const generateCurlCommand = (log) => {
  if (!log) return '';
  if (log.method.startsWith('moralis_')) {
    return `curl "${log.requestBody?.targetUrl || ''}" \\\n  -X GET \\\n  -H "accept: application/json" \\\n  -H "X-API-Key: YOUR_MORALIS_API_KEY"`;
  }
  return `curl https://bnb-testnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY \\\n  -X POST \\\n  -H "accept: application/json" \\\n  -H "content-type: application/json" \\\n  --data '${JSON.stringify(log.requestBody)}'`;
};

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copiedType, setCopiedType] = useState(''); 
  const [copiedText, setCopiedText] = useState('');
  
  const [dataEngine, setDataEngine] = useState('alchemy'); 
  const [moralisApiKey, setMoralisApiKey] = useState('vM7xza5AGzWH4ugv4vDQsXrPAYuP9gred2lNE7BJnKwB4D2QNuNs2Eso6Zk5pUMT');
  const [customAddress, setCustomAddress] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c');

  // State Sandbox RPC
  const [selectedRpcMethod, setSelectedRpcMethod] = useState('alchemy_getAssetTransfers');
  const [blockParam, setBlockParam] = useState('0x7226a16'); 
  const [txFrom, setTxFrom] = useState('0x60d492288df05122a47421b91cd94df5016c2b9d');
  const [txTo, setTxTo] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c'); 
  const [txValue, setTxValue] = useState('0x0');
  const [feeBlockCount, setFeeBlockCount] = useState('0x5');
  const [feeNewestBlock, setFeeNewestBlock] = useState('latest');
  const [feePercentiles, setFeePercentiles] = useState('20, 30');
  
  const [logsFromBlock, setLogsFromBlock] = useState('0x137d3c2');
  const [logsToBlock, setLogsToBlock] = useState('0x137d3cb'); 
  const [logsAddress, setLogsAddress] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c');
  const [logsTopics, setLogsTopics] = useState('');

  const [isLoadingRpc, setIsLoadingRpc] = useState(false);
  const [rawRpcResponse, setRawRpcResponse] = useState(null);
  const [latestLiveBlock, setLatestBlock] = useState('0x0');
  const [requestLogs, setRequestLogs] = useState([]);
  const [selectedRequestLog, setSelectedRequestLog] = useState(null);

  // State Filters & Pagination
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('hour'); 
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [selectedHttpCodes, setSelectedHttpCodes] = useState([]);
  const [selectedResponseTimes, setSelectedResponseTimes] = useState([]); 
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 
  
  const dropdownRef = useRef(null);
  const ALCHEMY_RPC_URL = "https://bnb-testnet.g.alchemy.com/v2/3P6Sj-7RXbrD7znG4t8f8";
  const targetEndpoint = "https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook";

  const webhookData = {
    affiliate: { id: 'wh_pqra43npyunzk8w7', contract: '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c', dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_pqra43npyunzk8w7' },
    paymaster: { id: 'wh_ck5mia12huh25nvp', contract: '0x177858e3450ff286E7d301100363567A555E435f', dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_ck5mia12huh25nvp' }
  };

  const timeFilterOptions = [
    { key: '5min', label: 'Last 5 minutes' },
    { key: 'hour', label: 'Last hour' },
    { key: 'day', label: 'Last day' },
    { key: '7days', label: 'Last 7 days' }
  ];

  useEffect(() => {
    const loadPersistentLogs = async () => {
      const persistedLogs = await getAllLogsFromIndexedDB();
      if (persistedLogs && persistedLogs.length > 0) {
        setRequestLogs(persistedLogs);
        setSelectedRequestLog(persistedLogs[0]);
      }
    };
    loadPersistentLogs();
  }, []);

  useEffect(() => {
    if (dataEngine === 'moralis') {
      setSelectedRpcMethod('moralis_getUnifiedHistory');
    } else {
      setSelectedRpcMethod('alchemy_getAssetTransfers');
    }
    setRawRpcResponse(null);
  }, [dataEngine]);

  useEffect(() => {
    const currentContract = webhookData[activeWebhookTab].contract;
    setCustomAddress(currentContract);
    setLogsAddress(currentContract);
    setTxTo(currentContract);
  }, [activeWebhookTab]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExecuteDataEngineCall = async () => {
    setIsLoadingRpc(true);
    setRawRpcResponse(null);
    const startTime = performance.now();
    const targetQueryAddress = customAddress.trim() || webhookData[activeWebhookTab].contract;
    let newLogEntry = null;

    // NHÁNH 1: GỌI SERVICE MORALIS (ĐÃ ĐƯỢC THU GỌN)
    if (dataEngine === 'moralis') {
      try {
        const unifiedResult = await fetchUnifiedHistory(targetQueryAddress, moralisApiKey);
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        setRawRpcResponse(unifiedResult); 

        newLogEntry = {
          id: `log_${Math.random().toString(36).substr(2, 7)}`,
          method: selectedRpcMethod,
          app: "Khánh's First App",
          httpStatus: 200,
          errorCode: "-",
          errorMessage: "-",
          responseTime: `${duration} ms`,
          timeSent: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp: Date.now(),
          requestBody: { engine: "moralis_playground_unified", wallet: targetQueryAddress, targetUrl: `https://deep-index.moralis.io/api/v2/${targetQueryAddress}` },
          responseBody: unifiedResult
        };
      } catch (error) {
        setRawRpcResponse({ error: "Lỗi kết nối liên hợp Moralis API", details: error.message });
      }
    } 
    // NHÁNH 2: ALCHEMY JSON-RPC NODE ENGINE
    else {
      const rpcBody = { jsonrpc: "2.0", id: 1, method: selectedRpcMethod };
      if (selectedRpcMethod === 'alchemy_getAssetTransfers') {
        rpcBody.params = [{ fromBlock: "0x0", toBlock: "latest", toAddress: targetQueryAddress, category: ["external", "erc20"], excludeZeroValue: false, withMetadata: true }];
      } else if (selectedRpcMethod === 'eth_getLogs') {
        const filterObj = { fromBlock: logsFromBlock, toBlock: logsToBlock };
        if (targetQueryAddress.toLowerCase() === webhookData.paymaster.contract.toLowerCase() && !logsTopics.trim()) {
          filterObj.topics = ["0x49628e100ac341d24a3e6da50b589cffa6a6c42aabf49b9d4abcb32e65c9535b", null, "0x" + targetQueryAddress.replace("0x", "").toLowerCase().padStart(64, '0')];
        } else {
          filterObj.address = targetQueryAddress;
          if (logsTopics.trim()) filterObj.topics = logsTopics.split(',').map(t => t.trim());
        }
        rpcBody.params = [filterObj];
      } else if (selectedRpcMethod === 'eth_getBlockReceipts') rpcBody.params = [blockParam];
      else if (selectedRpcMethod === 'eth_estimateGas') rpcBody.params = [{ from: txFrom, to: targetQueryAddress, value: txValue }];
      else if (selectedRpcMethod === 'eth_feeHistory') rpcBody.params = [feeBlockCount, feeNewestBlock, feePercentiles.split(',').map(p => parseFloat(p.trim()))];
      else if (selectedRpcMethod === 'eth_blockNumber') rpcBody.params = [];

      try {
        const response = await fetch(ALCHEMY_RPC_URL, {
          method: 'POST',
          headers: { 'accept': 'application/json', 'content-type': 'application/json' },
          body: JSON.stringify(rpcBody)
        });
        const resData = await response.json();
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        setRawRpcResponse(resData);
        if (selectedRpcMethod === 'eth_blockNumber' && resData.result) setLatestBlock(resData.result);

        newLogEntry = {
          id: `log_${Math.random().toString(36).substr(2, 7)}`,
          method: selectedRpcMethod,
          app: "Khánh's First App",
          httpStatus: response.status,
          errorCode: resData.error ? String(resData.error.code) : "-",
          errorMessage: resData.error ? resData.error.message : "-",
          responseTime: `${duration} ms`,
          timeSent: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp: Date.now(),
          requestBody: rpcBody,
          responseBody: resData
        };
      } catch (error) {
        setRawRpcResponse({ error: "Lỗi kết nối RPC Node Alchemy", details: error.message });
      }
    }

    // ĐỒNG BỘ PERSISTENT DỮ LIỆU LOG VÀO INDEXEDDB
    if (newLogEntry) {
      await saveLogToIndexedDB(newLogEntry);
      setRequestLogs(prev => [newLogEntry, ...prev]);
      setSelectedRequestLog(newLogEntry);
      setCurrentPage(1);
    }
    setIsLoadingRpc(false);
  };

  const handleClearTerminalHistory = async () => {
    if(window.confirm("Bồ có chắc chắn muốn xoá sạch toàn bộ lịch sử lưu trữ logs trong IndexedDB không?")) {
      await clearAllLogsFromIndexedDB();
      setRequestLogs([]);
      setSelectedRequestLog(null);
    }
  };

  const toggleFilter = (item, list, setList) => {
    setCurrentPage(1);
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  const filteredRequestLogs = requestLogs.filter(log => {
    const diffMs = Date.now() - log.timestamp;
    if (selectedTimeFilter === '5min' && diffMs > 5 * 60 * 1000) return false;
    if (selectedTimeFilter === 'hour' && diffMs > 60 * 60 * 1000) return false;
    if (selectedTimeFilter === 'day' && diffMs > 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === '7days' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;

    if (selectedMethods.length > 0 && !selectedMethods.includes(log.method)) return false;
    if (selectedHttpCodes.length > 0) {
      const isSuccess = log.httpStatus === 200;
      if (selectedHttpCodes.includes('200') && !isSuccess) return false;
      if (selectedHttpCodes.includes('error') && isSuccess) return false;
    }
    if (selectedResponseTimes.length > 0) {
      const timeNum = parseInt(log.responseTime) || 0;
      let cat = '';
      if (timeNum < 200) cat = 'light';
      else if (timeNum <= 2000) cat = 'medium';
      else cat = 'heavy';
      if (!selectedResponseTimes.includes(cat)) return false;
    }
    return true;
  });

  const totalItems = filteredRequestLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPagedLogs = filteredRequestLogs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleResetFilters = () => {
    setSelectedTimeFilter('hour');
    setSelectedMethods([]);
    setSelectedHttpCodes([]);
    setSelectedResponseTimes([]);
    setCurrentPage(1);
  };

  const handleCopyClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setCopiedText(text);
    setTimeout(() => { setCopiedType(''); setCopiedText(''); }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      {/* Main Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-emerald-500 w-7 h-7" /> Hệ Thống Quản Trị On-Chain & Phân Tích Dữ Liệu Contract
        </h1>
      </div>

      {/* KHU VỰC CẤU HÌNH WEBHOOK PRODUCTION INFO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button onClick={() => setActiveWebhookTab('affiliate')} className={`text-left p-5 rounded-xl border transition-all ${activeWebhookTab === 'affiliate' ? 'bg-slate-950/80 border-emerald-500 ring-1 ring-emerald-500/30 font-bold' : 'bg-slate-950/20 border-slate-800 text-slate-400'}`}>
            <span className="text-sm font-bold tracking-wide block mb-1">AFFILIATE TRACKER WEBHOOK</span>
            <span className="text-xs font-mono text-slate-500 block truncate">{webhookData.affiliate.contract}</span>
          </button>
          <button onClick={() => setActiveWebhookTab('paymaster')} className={`text-left p-5 rounded-xl border transition-all ${activeWebhookTab === 'paymaster' ? 'bg-slate-950/80 border-emerald-500 ring-1 ring-emerald-500/30 font-bold' : 'bg-slate-950/20 border-slate-800 text-slate-400'}`}>
            <span className="text-sm font-bold tracking-wide block mb-1">HIENMAUPAYMASTERCONTRACT</span>
            <span className="text-xs font-mono text-slate-500 block truncate">{webhookData.paymaster.contract}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vercel Production Endpoint URL:</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-300 overflow-x-auto flex items-center">{targetEndpoint}</div>
              <button onClick={() => handleCopyClipboard(targetEndpoint, 'endpoint')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors">
                {copiedType === 'endpoint' ? 'Đã lưu!' : 'Sao chép'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alchemy Configuration Panel:</span>
            <a href={webhookData[activeWebhookTab].dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline font-mono">
              <span>Mở Alchemy App Webhooks Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Custom Target Search Address</p>
          <p className="text-xs font-mono text-emerald-400 mt-2 truncate select-all">{customAddress}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">IndexedDB Engine Status</p>
          <p className="text-sm font-bold text-blue-400 mt-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> PERSISTENT LOGS ACTIVE ({requestLogs.length} Records)
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Moralis Cloud Playground Engine</p>
          <p className="text-sm font-bold text-purple-400 mt-1.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span> Deep-Index API Active
          </p>
        </div>
      </div>

      {/* WORKSPACE 1: DUAL ENGINE SANDBOX & BSCSCAN VISUALIZER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <Code className="w-4 h-4 text-blue-400" /> Sandbox Studio - Trình phân tích chuỗi khối liên hợp
          </h2>
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button onClick={() => setDataEngine('alchemy')} className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${dataEngine === 'alchemy' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Alchemy RPC Node
            </button>
            <button onClick={() => setDataEngine('moralis')} className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${dataEngine === 'moralis' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              Moralis Playground API
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Select Engine Method</label>
            {dataEngine === 'moralis' ? (
              <select value={selectedRpcMethod} onChange={(e) => { setSelectedRpcMethod(e.target.value); setRawRpcResponse(null); }} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-purple-400 font-mono focus:outline-none focus:border-purple-500">
                <option value="moralis_getUnifiedHistory">moralis_getUnifiedHistory - Quét lịch sử ví (BscScan Mode)</option>
              </select>
            ) : (
              <select value={selectedRpcMethod} onChange={(e) => { setSelectedRpcMethod(e.target.value); setRawRpcResponse(null); }} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-blue-500">
                <option value="alchemy_getAssetTransfers">alchemy_getAssetTransfers - Quét lịch sử ví (Alchemy Enhanced)</option>
                <option value="eth_getLogs">eth_getLogs - Tra cứu Event Logs (Phòng vệ 10 blocks)</option>
                <option value="eth_getBlockReceipts">eth_getBlockReceipts - Lấy biên lai khối</option>
                <option value="eth_estimateGas">eth_estimateGas - Ước tính Gas giao dịch</option>
                <option value="eth_feeHistory">eth_feeHistory - Xem cấu trúc phí</option>
                <option value="eth_blockNumber">eth_blockNumber - Số khối mới nhất</option>
              </select>
            )}
          </div>

          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-slate-400" /> Wallet / Contract Target Address
            </label>
            <input 
              type="text" 
              value={customAddress} 
              onChange={(e) => setCustomAddress(e.target.value)} 
              placeholder="Nhập địa chỉ ví 0x... để tra cứu"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              {dataEngine === 'moralis' ? 'Moralis Web3 API Key' : 'Block Param (Hex)'}
            </label>
            {dataEngine === 'moralis' ? (
              <input type="password" value={moralisApiKey} onChange={(e) => setMoralisApiKey(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-purple-400 font-mono focus:outline-none" />
            ) : (
              <input type="text" value={blockParam} onChange={(e) => setBlockParam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none" />
            )}
          </div>

          <div className="lg:col-span-2">
            <button onClick={handleExecuteDataEngineCall} disabled={isLoadingRpc} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all h-[38px] ${dataEngine === 'moralis' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
              <Play className={`w-4 h-4 ${isLoadingRpc ? 'animate-spin' : ''}`} /> Get History
            </button>
          </div>
        </div>

        {selectedRpcMethod === 'eth_getLogs' && dataEngine === 'alchemy' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl animate-fadeIn">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">fromBlock</label>
              <input type="text" value={logsFromBlock} onChange={(e) => setLogsFromBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">toBlock (Phạm vi 10 khối Free)</label>
              <input type="text" value={logsToBlock} onChange={(e) => setLogsToBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">address</label>
              <input type="text" value={customAddress} disabled className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">topics</label>
              <input type="text" value={logsTopics} onChange={(e) => setLogsTopics(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
          </div>
        )}

        {/* BSCSCAN VISUALIZER DISPLAY GRID */}
        <div className="border border-slate-800 bg-slate-950 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Database className="w-4 h-4 text-purple-400" /> BscScan Testnet Tracker Engine Output
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Quét thực tế địa chỉ: <span className="text-emerald-400 font-mono">{shortenAddress(customAddress)}</span></span>
          </div>

          <div className="p-0 overflow-x-auto min-h-[180px]">
            {dataEngine === 'moralis' && Array.isArray(rawRpcResponse) ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/20 text-slate-400 font-semibold">
                    <th className="p-3">Parent Transaction Hash</th>
                    <th className="p-3">Block</th>
                    <th className="p-3">Age/Time</th>
                    <th className="p-3">From</th>
                    <th className="p-3 text-center">Dir</th>
                    <th className="p-3">To</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-[13px]">
                  {rawRpcResponse.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <a href={`https://testnet.bscscan.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">
                            {shortenAddress(tx.hash)}
                          </a>
                          <button onClick={() => handleCopyClipboard(tx.hash, `tx_${idx}`)} className="text-slate-600 hover:text-slate-400">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 font-mono">
                        <a href={`https://testnet.bscscan.com/block/${tx.block}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                          {tx.block}
                        </a>
                      </td>
                      <td className="p-3 text-slate-400 text-xs">{tx.date ? new Date(tx.date).toLocaleTimeString() : 'N/A'}</td>
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={tx.from.toLowerCase() === customAddress.toLowerCase() ? "text-emerald-400 font-semibold" : "text-slate-300"}>{shortenAddress(tx.from)}</span>
                          <button onClick={() => handleCopyClipboard(tx.from, `from_${idx}`)} className="text-slate-600 hover:text-slate-400"><Copy className="w-3 h-3" /></button>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold ${tx.type === 'received' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {tx.type === 'received' ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">{shortenAddress(tx.to)}</span>
                          <button onClick={() => handleCopyClipboard(tx.to, `to_${idx}`)} className="text-slate-600 hover:text-slate-400"><Copy className="w-3 h-3" /></button>
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-100">{tx.valueEth} <span className="text-xs text-slate-400 font-bold uppercase">{tx.name}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : dataEngine === 'alchemy' && selectedRpcMethod === 'alchemy_getAssetTransfers' && Array.isArray(rawRpcResponse?.result?.transfers) ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/20 text-slate-400 font-semibold">
                    <th className="p-3">Transaction Hash</th>
                    <th className="p-3">Asset</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-[13px]">
                  {rawRpcResponse.result.transfers.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-3 font-mono text-blue-400">{tx.hash}</td>
                      <td className="p-3 text-slate-200 uppercase font-bold text-xs">{tx.asset}</td>
                      <td className="p-3 text-purple-400 uppercase text-[11px]">[{tx.category}]</td>
                      <td className="p-3 text-right font-bold text-slate-100">{tx.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-slate-600 text-center py-12 flex flex-col items-center justify-center gap-2">
                <Terminal className="w-8 h-8 text-slate-700 animate-pulse" />
                <span className="text-xs font-medium">Nhập địa chỉ ví đích mong muốn và nhấn nút "Get History" để bắt đầu kết nối.</span>
              </div>
            )}
          </div>
          
          {rawRpcResponse && (
            <details className="border-t border-slate-800 bg-slate-950/60">
              <summary className="px-4 py-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 cursor-pointer select-none">➔ View raw JSON Response payload</summary>
              <div className="p-4 max-h-40 overflow-y-auto font-mono text-[11px] text-blue-400 border-t border-slate-900"><pre>{JSON.stringify(rawRpcResponse, null, 2)}</pre></div>
            </details>
          )}
        </div>
      </div>

      {/* WORKSPACE 2: PERSISTENT REQUEST LOGGER PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative" ref={dropdownRef}>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Clock className="text-purple-400 w-5 h-5" /> Request Logs Lịch Sử (IndexedDB Layer)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Nhật ký dữ liệu lưu trữ persistent an toàn trên trình duyệt.</p>
          </div>
          <button onClick={handleClearTerminalHistory} className="px-3 py-1.5 bg-rose-950/40 border border-rose-900/60 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Clear DB Logs History</button>
        </div>

        {/* COMPONENT FILTER BAR */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 relative z-20">
          <span className="text-xs font-semibold text-slate-400 px-1">Filters</span>
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium">
              Time: <span className="text-blue-400">{timeFilterOptions.find(o => o.key === selectedTimeFilter)?.label || 'Last hour'}</span><ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'time' && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-0.5 z-30">
                {timeFilterOptions.map(option => (
                  <button key={option.key} onClick={() => { setSelectedTimeFilter(option.key); setActiveDropdown(null); setCurrentPage(1); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${selectedTimeFilter === option.key ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>{option.label}</button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'methods' ? null : 'methods')} className={`px-3 py-1.5 border text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium ${selectedMethods.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}>Methods {selectedMethods.length > 0 && `(${selectedMethods.length})`}<ChevronDown className="w-3 h-3 text-slate-500" /></button>
            {activeDropdown === 'methods' && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1 z-30">
                {['alchemy_getAssetTransfers', 'moralis_getUnifiedHistory', 'eth_getLogs', 'eth_getBlockReceipts', 'eth_feeHistory', 'eth_estimateGas', 'eth_blockNumber'].map(method => (
                  <label key={method} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-mono text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={selectedMethods.includes(method)} onChange={() => toggleFilter(method, selectedMethods, setSelectedMethods)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />{method}
                  </label>
                ))}
              </div>
            )}
          </div>

          {(selectedTimeFilter !== 'hour' || selectedMethods.length > 0 || selectedHttpCodes.length > 0 || selectedResponseTimes.length > 0) && (
            <button onClick={handleResetFilters} className="ml-auto p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg"><RotateCcw className="w-4 h-4" /></button>
          )}
        </div>

        {/* LOG MANAGER RENDER SYSTEM */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative z-10">
          <div className="lg:col-span-2 flex flex-col border border-slate-800/80 rounded-xl bg-slate-950/20 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/40">
                  <th className="p-3">Method</th>
                  <th className="p-3">App</th>
                  <th className="p-3">HTTP</th>
                  <th className="p-3 text-right">Response time</th>
                  <th className="p-3 text-right">Time sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {currentPagedLogs.map((log) => (
                  <tr key={log.id} onClick={() => setSelectedRequestLog(log)} className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${selectedRequestLog?.id === log.id ? 'bg-slate-900/80 border-l-2 border-l-blue-500' : ''}`}>
                    <td className="p-3 font-mono text-slate-200">{log.method}</td>
                    <td className="p-3 text-slate-400">{log.app}</td>
                    <td className="p-3"><span className={`text-emerald-400 font-medium`}>{log.httpStatus}</span></td>
                    <td className="p-3 text-right text-emerald-400">{log.responseTime}</td>
                    <td className="p-3 text-right text-slate-500">{log.timeSent}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalItems === 0 && <div className="text-center py-12 text-slate-600 font-medium bg-slate-950/20">Không tìm thấy bản ghi log.</div>}

            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800/80 bg-slate-950/40 gap-4 text-xs text-slate-400">
              <div className="font-medium">Showing <span className="text-slate-200">{totalItems > 0 ? startIndex + 1 : 0}</span> to <span className="text-slate-200">{endIndex}</span> of <span className="text-slate-200">{totalItems}</span> entries</div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* REQUEST & RESPONSE DETAILED SIDEBAR */}
          <div className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1"><FileCode className="w-4 h-4 text-emerald-400" /> Request Log Details</h3>
            </div>

            {selectedRequestLog ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-400">➔ Request Payload</span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => {
                          if (selectedRequestLog.method.startsWith('moralis_')) setDataEngine('moralis');
                          else setDataEngine('alchemy');
                          setSelectedRpcMethod(selectedRequestLog.method);
                          if (selectedRequestLog.requestBody?.wallet) setCustomAddress(selectedRequestLog.requestBody.wallet);
                          window.scrollTo({ top: 320, behavior: 'smooth' });
                        }} 
                        className="text-[10px] bg-slate-900 border border-slate-800 text-blue-400 font-semibold px-2 py-1 rounded"
                      >Retry in Sandbox</button>
                      <button onClick={() => handleCopyClipboard(JSON.stringify(selectedRequestLog.requestBody, null, 2), 'req')} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-1 rounded">Copy</button>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 max-h-44 overflow-auto font-mono text-[11px] text-pink-400"><pre>{JSON.stringify(selectedRequestLog.requestBody, null, 2)}</pre></div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wide block">cURL Terminal Command</span>
                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre">{generateCurlCommand(selectedRequestLog)}</div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-400">⬇ Response Output</span>
                    <button onClick={() => handleCopyClipboard(JSON.stringify(selectedRequestLog.responseBody, null, 2), 'res')} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 px-2 py-1 rounded">Copy</button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 max-h-48 overflow-auto font-mono text-[11px] text-blue-400"><pre>{JSON.stringify(selectedRequestLog.responseBody, null, 2)}</pre></div>
                </div>
              </div>
            ) : <div className="text-center py-16 text-slate-600">Chọn một bản ghi log để kiểm tra cấu trúc.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}