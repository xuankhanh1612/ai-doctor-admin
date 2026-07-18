import React, { useState, useEffect, useRef } from 'react';
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
  Code,
  Filter,
  Clock,
  X,
  ChevronDown,
  RotateCcw
} from 'lucide-react';

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copiedType, setCopiedType] = useState(''); // 'endpoint', 'req', 'res'
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [selectedWebhookLog, setSelectedWebhookLog] = useState(null);
  
  // State quản lý phần tương tác Node RPC Sandbox thực tế
  const [selectedRpcMethod, setSelectedRpcMethod] = useState('eth_blockNumber');
  const [blockParam, setBlockParam] = useState('0x7226a16'); 
  
  // State cho tham số ước tính Gas (eth_estimateGas)
  const [txFrom, setTxFrom] = useState('0x60d492288df05122a47421b91cd94df5016c2b9d');
  const [txTo, setTxTo] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c'); 
  const [txValue, setTxValue] = useState('0x0');

  // State cho tham số lịch sử phí (eth_feeHistory)
  const [feeBlockCount, setFeeBlockCount] = useState('0x5');
  const [feeNewestBlock, setFeeNewestBlock] = useState('latest');
  const [feePercentiles, setFeePercentiles] = useState('20, 30');

  // State cho tham số truy vấn Logs (eth_getLogs)
  const [logsFromBlock, setLogsFromBlock] = useState('0x137d3c2');
  const [logsToBlock, setLogsToBlock] = useState('0x137d3c3');
  const [logsAddress, setLogsAddress] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c');
  const [logsTopics, setLogsTopics] = useState('');

  const [isLoadingRpc, setIsLoadingRpc] = useState(false);
  const [rawRpcResponse, setRawRpcResponse] = useState(null);
  const [latestLiveBlock, setLatestBlock] = useState('0x0');
  const [rpcStatus, setRpcStatus] = useState('connecting');

  // STATE BỘ LỌC ĐỘNG (FILTERS STATE)
  const [activeDropdown, setActiveDropdown] = useState(null); // 'time', 'methods', 'http', 'errors'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('hour'); // Mặc định 'hour' như hình
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [selectedHttpCodes, setSelectedHttpCodes] = useState([]);
  const [selectedErrorCodes, setSelectedErrorCodes] = useState([]);
  
  const dropdownRef = useRef(null);

  const ALCHEMY_RPC_URL = "https://bnb-testnet.g.alchemy.com/v2/3P6Sj-7RXbrD7znG4t8f8";
  const targetEndpoint = "https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook";

  // Mốc thời gian hệ thống hiện tại để tính tương đối cho các logs mẫu
  const baseTime = new Date("2026-07-18T11:35:52").getTime();

  // Danh sách Request Logs gốc hệ thống bổ sung thuộc tính timestamp thực tế để bộ lọc quét qua
  const [requestLogs, setRequestLogs] = useState([
    {
      id: "log_01",
      method: "eth_getLogs",
      app: "Khánh's First App",
      httpStatus: 200,
      errorCode: "-",
      errorMessage: "-",
      responseTime: "3 ms",
      timeSent: "11:33 AM",
      timestamp: baseTime - 2 * 60 * 1000, // 2 phút trước (Khớp: 5min, hour, day, 7days, month)
      requestBody: { jsonrpc: "2.0", id: 1, method: "eth_getLogs", params: [{ fromBlock: "0x137d3c2", toBlock: "0x137d3c3", address: "0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c", topics: [] }] },
      responseBody: { jsonrpc: "2.0", id: 1, result: [] }
    },
    {
      id: "log_02",
      method: "eth_feeHistory",
      app: "Khánh's First App",
      httpStatus: 200,
      errorCode: "-",
      errorMessage: "-",
      responseTime: "3 ms",
      timeSent: "11:10 AM",
      timestamp: baseTime - 25 * 60 * 1000, // 25 phút trước (Khớp: hour, day, 7days, month)
      requestBody: { jsonrpc: "2.0", id: 1, method: "eth_feeHistory", params: ["0x5", "latest", [20, 30]] },
      responseBody: { jsonrpc: "2.0", id: 1, result: { oldestBlock: "0x7225c77", baseFeePerGas: ["0x0", "0x0"] } }
    },
    {
      id: "log_03",
      method: "eth_getBlockReceipts",
      app: "Khánh's First App",
      httpStatus: 200,
      errorCode: "-",
      errorMessage: "-",
      responseTime: "2 ms",
      timeSent: "09:15 AM",
      timestamp: baseTime - 140 * 60 * 1000, // 2.3 tiếng trước (Khớp: day, 7days, month)
      requestBody: { jsonrpc: "2.0", id: 1, method: "eth_getBlockReceipts", params: ["0x7226a16"] },
      responseBody: { jsonrpc: "2.0", id: 1, result: [] }
    },
    {
      id: "log_04",
      method: "eth_blockNumber",
      app: "Khánh's First App",
      httpStatus: 200,
      errorCode: "-",
      errorMessage: "-",
      responseTime: "1 ms",
      timeSent: "Hôm qua",
      timestamp: baseTime - 30 * 60 * 60 * 1000, // 30 tiếng trước (Khớp: 7days, month)
      requestBody: { jsonrpc: "2.0", id: 1, method: "eth_blockNumber" },
      responseBody: { jsonrpc: "2.0", id: 1, result: "0x7226a16" }
    },
    {
      id: "log_05",
      method: "eth_getBlockReceipts",
      app: "Khánh's First App",
      httpStatus: 200,
      errorCode: "-32602",
      errorMessage: "invalid argument 0: hex string \"0x\"",
      responseTime: "2 ms",
      timeSent: "4 ngày trước",
      timestamp: baseTime - 4 * 24 * 60 * 60 * 1000, // 4 ngày trước (Khớp: 7days, month)
      requestBody: { jsonrpc: "2.0", id: 1, method: "eth_getBlockReceipts", params: ["0x"] },
      responseBody: { jsonrpc: "2.0", id: 1, error: { code: -32602, message: "invalid argument 0: hex string \"0x\"" } }
    },
    {
      id: "log_06",
      method: "eth_estimateGas",
      app: "Khánh's First App",
      httpStatus: 400,
      errorCode: "-32016",
      errorMessage: "execution reverted: 0x",
      responseTime: "4 ms",
      timeSent: "15 ngày trước",
      timestamp: baseTime - 15 * 24 * 60 * 60 * 1000, // 15 ngày trước (Khớp: month)
      requestBody: { jsonrpc: "2.0", id: 1, method: "eth_estimateGas", params: [{ from: "0x60d4...", to: "0x44f7...", value: "0x0" }] },
      responseBody: { jsonrpc: "2.0", id: 1, error: { code: -32016, message: "execution reverted: 0x" } }
    }
  ]);
  const [selectedRequestLog, setSelectedRequestLog] = useState(requestLogs[0]);

  const webhookData = {
    affiliate: {
      name: 'AFFILIATE TRACKER WEBHOOK',
      id: 'wh_pqra43npyunzk8w7',
      contract: '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_pqra43npyunzk8w7',
      query: `{ block { hash, number, timestamp, logs(filter: {addresses: ["0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c"]}) { data, topics, index, account { address }, transaction { hash, nonce, index, from { address }, to { address }, value, status, gasUsed } } } }`
    },
    paymaster: {
      name: 'HIENMAUPAYMASTERCONTRACT',
      id: 'wh_ck5mia12huh25nvp',
      contract: '0x177858e3450ff286E7d301100363567A555E435f',
      description: 'Giám sát luồng phí giao dịch tài trợ gas (Gas Sponsorship) và các log phát sinh từ Paymaster Smart Contract.',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_ck5mia12huh25nvp',
      query: `{ block { hash, number, timestamp, logs(filter: {addresses: ["0x177858e3450ff286E7d301100363567A555E435f"]}) { data, topics, index, account { address }, transaction { hash, nonce, index, from { address }, to { address }, value, status, gasUsed } } } }`
    }
  };

  const timeFilterOptions = [
    { key: '5min', label: 'Last 5 minutes' },
    { key: 'hour', label: 'Last hour' },
    { key: 'day', label: 'Last day' },
    { key: '7days', label: 'Last 7 days' },
    { key: 'month', label: 'Last month' },
    { key: 'custom', label: 'Custom' }
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
        setSearchQuery('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCallAlchemyRpc = async () => {
    setIsLoadingRpc(true);
    setRawRpcResponse(null);
    const startTime = performance.now();
    
    const rpcBody = { jsonrpc: "2.0", id: 1, method: selectedRpcMethod };

    if (selectedRpcMethod === 'eth_getBlockReceipts') {
      const formattedBlock = blockParam.startsWith('0x') ? blockParam : `0x${blockParam}`;
      rpcBody.params = [formattedBlock];
    } else if (selectedRpcMethod === 'eth_estimateGas') {
      rpcBody.params = [{ from: txFrom, to: txTo, value: txValue }];
    } else if (selectedRpcMethod === 'eth_feeHistory') {
      const percentileArray = feePercentiles.split(',').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
      rpcBody.params = [feeBlockCount, feeNewestBlock, percentileArray];
    } else if (selectedRpcMethod === 'eth_getLogs') {
      const topicsArray = logsTopics.trim() ? logsTopics.split(',').map(t => t.trim()) : [];
      rpcBody.params = [{ fromBlock: logsFromBlock, toBlock: logsToBlock, address: logsAddress, topics: topicsArray }];
    }

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
      
      if (selectedRpcMethod === 'eth_blockNumber' && resData.result) {
        setLatestBlock(resData.result);
        setRpcStatus('connected');
      }

      const currentTimeStamp = Date.now();
      const newLogEntry = {
        id: `log_${Math.random().toString(36).substr(2, 5)}`,
        method: selectedRpcMethod,
        app: "Khánh's First App",
        httpStatus: response.status,
        errorCode: resData.error ? String(resData.error.code) : "-",
        errorMessage: resData.error ? resData.error.message : "-",
        responseTime: `${duration} ms`,
        timeSent: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: currentTimeStamp,
        requestBody: rpcBody,
        responseBody: resData
      };
      setRequestLogs(prev => [newLogEntry, ...prev]);

    } catch (error) {
      setRawRpcResponse({ error: "Lỗi kết nối RPC mạng lưới", details: error.message });
      setRpcStatus('error');
    } relativeFinally: {
      setIsLoadingRpc(false);
    }
  };

  const handleFetchLiveWebhookLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch('/api/get-webhook-logs');
      const data = await response.json();
      if (Array.isArray(data)) setWebhookLogs(data);
    } catch (error) {
      console.error("Không thể kết nối API nội bộ:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRetryInSandbox = (log) => {
    setSelectedRpcMethod(log.method);
    if (log.requestBody.params && log.requestBody.params.length > 0) {
      const firstParam = log.requestBody.params[0];
      if (log.method === 'eth_getBlockReceipts') {
        setBlockParam(firstParam);
      } else if (log.method === 'eth_estimateGas') {
        setTxFrom(firstParam.from || '');
        setTxTo(firstParam.to || '');
        setTxValue(firstParam.value || '0x0');
      } else if (log.method === 'eth_feeHistory') {
        setFeeBlockCount(log.requestBody.params[0]);
        setFeeNewestBlock(log.requestBody.params[1]);
        setFeePercentiles(log.requestBody.params[2]?.join(', ') || '');
      } else if (log.method === 'eth_getLogs') {
        setLogsFromBlock(firstParam.fromBlock || '');
        setLogsToBlock(firstParam.toBlock || '');
        setLogsAddress(firstParam.address || '');
        setLogsTopics(firstParam.topics?.join(', ') || '');
      }
    }
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSelectedTimeFilter('hour');
    setSelectedMethods([]);
    setSelectedHttpCodes([]);
    setSelectedErrorCodes([]);
    setSearchQuery('');
  };

  const toggleFilter = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // LOGIC PHÂN TÍCH VÀ LỌC LOG THEO THỜI GIAN VÀ THAM SỐ ĐỘNG
  const filteredRequestLogs = requestLogs.filter(log => {
    // 1. Xử lý logic lọc thời gian
    const diffMs = Date.now() - log.timestamp;
    if (selectedTimeFilter === '5min' && diffMs > 5 * 60 * 1000) return false;
    if (selectedTimeFilter === 'hour' && diffMs > 60 * 60 * 1000) return false;
    if (selectedTimeFilter === 'day' && diffMs > 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === '7days' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === 'month' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;

    // 2. Lọc theo Method
    if (selectedMethods.length > 0 && !selectedMethods.includes(log.method)) return false;
    
    // 3. Lọc theo HTTP code
    if (selectedHttpCodes.length > 0) {
      const isSuccess = log.httpStatus === 200;
      if (selectedHttpCodes.includes('200') && !isSuccess) return false;
      if (selectedHttpCodes.includes('error') && isSuccess) return false;
    }

    // 4. Lọc theo Error code
    if (selectedErrorCodes.length > 0 && !selectedErrorCodes.includes(log.errorCode)) return false;

    return true;
  });

  const getFilteredTransactions = () => {
    if (!rawRpcResponse || !rawRpcResponse.result || !Array.isArray(rawRpcResponse.result)) return [];
    const targetContractLower = webhookData[activeWebhookTab].contract.toLowerCase();
    return rawRpcResponse.result.filter(receipt => {
      const directMatch = receipt.to && receipt.to.toLowerCase() === targetContractLower;
      const logMatch = receipt.logs && receipt.logs.some(log => log.address && log.address.toLowerCase() === targetContractLower);
      return directMatch || logMatch;
    });
  };

  const handleCopyClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(''), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-emerald-500 w-7 h-7 animate-spin-slow" />
          Quản Trị Hệ Thống & Kết Nối On-Chain Real-Time
        </h1>
      </div>

      {/* TỔNG QUAN TRẠNG THÁI NODE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Alchemy RPC Endpoint URL</p>
          <p className="text-xs font-mono text-slate-500 mt-2 truncate select-all">{ALCHEMY_RPC_URL}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Latest Hex Block (Live)</p>
          <p className="text-xl font-mono font-bold text-blue-400 mt-1 select-all">{latestLiveBlock}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Alchemy Node Status</p>
          <p className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${rpcStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`w-2 h-2 rounded-full ${rpcStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
            {rpcStatus === 'connected' ? 'CONNECTED (BSC TESTNET)' : 'NODE DISCONNECTED'}
          </p>
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
              <option value="eth_feeHistory">eth_feeHistory - Xem lịch sử cấu trúc phí</option>
              <option value="eth_getLogs">eth_getLogs - Truy vấn bộ lọc nhật ký Event Logs</option>
            </select>
          </div>

          <div className={selectedRpcMethod === 'eth_getBlockReceipts' ? 'md:col-span-1 block' : 'md:col-span-1 opacity-25 pointer-events-none'}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Block Number (Hex)</label>
            <input type="text" value={blockParam} onChange={(e) => setBlockParam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none focus:border-blue-500" />
          </div>

          <div className="md:col-span-1">
            <button onClick={handleCallAlchemyRpc} disabled={isLoadingRpc} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all h-[38px]">
              <Play className={`w-4 h-4 ${isLoadingRpc ? 'animate-spin' : ''}`} />
              Send Request
            </button>
          </div>
        </div>

        {selectedRpcMethod === 'eth_estimateGas' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Transaction "from" Address</label>
              <input type="text" value={txFrom} onChange={(e) => setTxFrom(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Transaction "to" Address (Auto-sync)</label>
              <input type="text" value={txTo} onChange={(e) => setTxTo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-400" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Transaction "value" (Hex Wei)</label>
              <input type="text" value={txValue} onChange={(e) => setTxValue(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
          </div>
        )}

        {selectedRpcMethod === 'eth_feeHistory' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Block Count</label>
              <input type="text" value={feeBlockCount} onChange={(e) => setFeeBlockCount(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Newest Block</label>
              <input type="text" value={feeNewestBlock} onChange={(e) => setFeeNewestBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">Reward Percentiles</label>
              <input type="text" value={feePercentiles} onChange={(e) => setFeePercentiles(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
          </div>
        )}

        {selectedRpcMethod === 'eth_getLogs' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">fromBlock</label>
              <input type="text" value={logsFromBlock} onChange={(e) => setLogsFromBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">toBlock</label>
              <input type="text" value={logsToBlock} onChange={(e) => setLogsToBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">address (Auto-sync Contract)</label>
              <input type="text" value={logsAddress} onChange={(e) => setLogsAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-400" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">topics</label>
              <input type="text" value={logsTopics} onChange={(e) => setLogsTopics(e.target.value)} placeholder="Để trống nếu lấy tất cả" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Phản hồi thô JSON-RPC từ Node:</div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs h-48 overflow-y-auto custom-scrollbar">
              {rawRpcResponse ? <pre className="text-blue-400 whitespace-pre">{JSON.stringify(rawRpcResponse, null, 2)}</pre> : <span className="text-slate-600">Bấm "Send Request" để gọi mạng lưới...</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Thám mã lọc riêng cho Contract:
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-48 overflow-y-auto custom-scrollbar text-xs">
              {selectedRpcMethod === 'eth_getBlockReceipts' && rawRpcResponse?.result ? (
                <div className="space-y-2">
                  {getFilteredTransactions().map((tx, i) => (
                    <div key={i} className="p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px]">
                      <div className="text-slate-300 truncate">Tx: {tx.transactionHash}</div>
                      <div className="text-slate-500">Events: {tx.logs?.length || 0} logs found</div>
                    </div>
                  ))}
                  {getFilteredTransactions().length === 0 && <div className="text-slate-600 text-center pt-8">Khối này không chứa giao dịch của contract đang chọn.</div>}
                </div>
              ) : <div className="text-slate-600 text-center pt-8">Chọn "eth_getBlockReceipts" để thám mã.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC 2: MÀN HÌNH THỐNG KÊ REQUEST LOGS VÀ CÁC INTERACTIVE FILTERS NÂNG CẤP */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative" ref={dropdownRef}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="text-purple-400 w-5 h-5" /> Request Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Inspect recent request activity for this app.</p>
        </div>

        {/* CỤM THANH BỘ LỌC HOÀN CHỈNH ĐỦ TIÊU CHUẨN ALCHEMY (CẬP NHẬT FILTER TIME ĐỘNG) */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 relative z-20">
          <span className="text-xs font-semibold text-slate-400 px-1">Filters</span>
          
          {/* 1. Bộ lọc Thời gian nâng cấp (Kèm Last day, Last 7 days, Last month) */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium transition-all"
            >
              Time: <span className="text-blue-400">{timeFilterOptions.find(o => o.key === selectedTimeFilter)?.label}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'time' && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-0.5 z-30 animate-fadeIn">
                {timeFilterOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={() => {
                      setSelectedTimeFilter(option.key);
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      selectedTimeFilter === option.key 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Bộ lọc Phương thức (Methods Multi-Select) */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'methods' ? null : 'methods')}
              className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${selectedMethods.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}
            >
              Methods {selectedMethods.length > 0 && `(${selectedMethods.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'methods' && (
              <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30 animate-fadeIn">
                <input type="text" placeholder="Search methods..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-300 mb-1 focus:outline-none" />
                {['eth_blockNumber', 'eth_estimateGas', 'eth_feeHistory', 'eth_getBlockReceipts', 'eth_getLogs'].filter(m => m.toLowerCase().includes(searchQuery.toLowerCase())).map(method => (
                  <label key={method} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-mono text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={selectedMethods.includes(method)} onChange={() => toggleFilter(method, selectedMethods, setSelectedMethods)} className="rounded border-slate-800 text-blue-500 focus:ring-0 bg-slate-950" />
                    {method}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 3. Bộ lọc Mạng lưới */}
          <div className="relative">
            <button className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium">
              Networks: <span className="text-amber-500">BSC Testnet</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
          </div>

          {/* 4. Bộ lọc Mã trạng thái HTTP codes */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'http' ? null : 'http')}
              className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${selectedHttpCodes.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}
            >
              HTTP codes {selectedHttpCodes.length > 0 && `(${selectedHttpCodes.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'http' && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30 animate-fadeIn">
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={selectedHttpCodes.includes('200')} onChange={() => toggleFilter('200', selectedHttpCodes, setSelectedHttpCodes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                  Success (200)
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={selectedHttpCodes.includes('error')} onChange={() => toggleFilter('error', selectedHttpCodes, setSelectedHttpCodes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                  Failures / Errors
                </label>
              </div>
            )}
          </div>

          {/* 5. Bộ lọc Mã lỗi On-chain Error codes */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'errors' ? null : 'errors')}
              className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${selectedErrorCodes.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}
            >
              Error codes {selectedErrorCodes.length > 0 && `(${selectedErrorCodes.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'errors' && (
              <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30 animate-fadeIn">
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={selectedErrorCodes.includes('-')} onChange={() => toggleFilter('-', selectedErrorCodes, setSelectedErrorCodes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                  No Error (-)
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={selectedErrorCodes.includes('-32602')} onChange={() => toggleFilter('-32602', selectedErrorCodes, setSelectedErrorCodes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                  Invalid Argument (-32602)
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={selectedErrorCodes.includes('-32016')} onChange={() => toggleFilter('-32016', selectedErrorCodes, setSelectedErrorCodes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                  Execution Reverted (-32016)
                </label>
              </div>
            )}
          </div>

          {/* Nút Khôi phục bộ lọc (Clear Filters) */}
          {(selectedTimeFilter !== 'hour' || selectedMethods.length > 0 || selectedHttpCodes.length > 0 || selectedErrorCodes.length > 0) && (
            <button 
              onClick={handleResetFilters}
              className="ml-auto p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
              title="Clear all active filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Layout Hai Phân Vùng Bản Ghi */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative z-10">
          {/* Bảng Logs đã qua bộ lọc thời gian & tham số */}
          <div className="lg:col-span-2 overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/20">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/40">
                  <th className="p-3">Method</th>
                  <th className="p-3">App</th>
                  <th className="p-3">Network</th>
                  <th className="p-3">HTTP</th>
                  <th className="p-3">Error code</th>
                  <th className="p-3 text-right">Response time</th>
                  <th className="p-3 text-right">Time sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredRequestLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedRequestLog(log)}
                    className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${selectedRequestLog?.id === log.id ? 'bg-slate-900/80 border-l-2 border-l-blue-500' : ''}`}
                  >
                    <td className="p-3 font-mono font-medium text-slate-200">{log.method}</td>
                    <td className="p-3 text-slate-400">{log.app}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-[11px] border border-amber-500/20">
                        BSC Testnet
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${log.httpStatus !== 200 ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
                        <span className={log.httpStatus !== 200 ? 'text-rose-400' : 'text-emerald-400'}>{log.httpStatus}</span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-500">{log.errorCode}</td>
                    <td className="p-3 text-right text-emerald-400 font-medium">{log.responseTime}</td>
                    <td className="p-3 text-right text-slate-500">{log.timeSent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRequestLogs.length === 0 && (
              <div className="text-center py-12 text-slate-600 font-medium bg-slate-950/20">
                Không tìm thấy dữ liệu log lịch sử khớp với bộ lọc thời gian hoặc điều kiện của bồ.
              </div>
            )}
          </div>

          {/* Thanh Chi Tiết Request Log Details */}
          <div className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Request Log Details</h3>
              {selectedRequestLog && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedRequestLog.httpStatus !== 200 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  HTTP {selectedRequestLog.httpStatus}
                </span>
              )}
            </div>

            {selectedRequestLog ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-y-2 text-slate-400 border-b border-slate-900 pb-3">
                  <div>Method:</div><div className="font-mono text-slate-200 text-right">{selectedRequestLog.method}</div>
                  <div>Response Time:</div><div className="text-emerald-400 text-right font-semibold">{selectedRequestLog.responseTime}</div>
                  <div>Time Sent:</div><div className="text-slate-500 text-right">{selectedRequestLog.timeSent}</div>
                  {selectedRequestLog.errorCode !== '-' && (
                    <>
                      <div className="text-rose-400">Error Msg:</div>
                      <div className="text-rose-400 font-mono text-right truncate" title={selectedRequestLog.errorMessage}>
                        {selectedRequestLog.errorMessage}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">➔ Request</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleRetryInSandbox(selectedRequestLog)} className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 px-2 py-1 rounded text-blue-400 font-medium transition-all">
                        Retry in Sandbox
                      </button>
                      <button onClick={() => handleCopyClipboard(JSON.stringify(selectedRequestLog.requestBody, null, 2), 'req')} className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 px-2 py-1 rounded text-slate-300">
                        {copiedType === 'req' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 max-h-32 overflow-auto custom-scrollbar font-mono text-[11px] text-slate-400">
                    <pre>{JSON.stringify(selectedRequestLog.requestBody, null, 2)}</pre>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">🠔 Response</span>
                    <button onClick={() => handleCopyClipboard(JSON.stringify(selectedRequestLog.responseBody, null, 2), 'res')} className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 px-2 py-1 rounded text-slate-300">
                      {copiedType === 'res' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 max-h-32 overflow-auto custom-scrollbar font-mono text-[11px] text-slate-400">
                    <pre className={selectedRequestLog.httpStatus !== 200 || selectedRequestLog.errorCode !== '-' ? 'text-rose-400/90' : 'text-emerald-400/90'}>
                      {JSON.stringify(selectedRequestLog.responseBody, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-600">Chọn một hàng trong bảng để thám mã chi tiết.</div>
            )}
          </div>
        </div>
      </div>

      {/* KHU VỰC 3: CẤU HÌNH WEBHOOK WEB */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button onClick={() => setActiveWebhookTab('affiliate')} className={`text-left p-5 rounded-xl border transition-all ${activeWebhookTab === 'affiliate' ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30' : 'bg-slate-950/40 border-slate-800'}`}>
            <span className="text-sm font-bold tracking-wide text-slate-200 block mb-1">AFFILIATE TRACKER WEBHOOK</span>
          </button>
          <button onClick={() => setActiveWebhookTab('paymaster')} className={`text-left p-5 rounded-xl border transition-all ${activeWebhookTab === 'paymaster' ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/30' : 'bg-slate-950/40 border-slate-800'}`}>
            <span className="text-sm font-bold tracking-wide text-slate-200 block mb-1">HIENMAUPAYMASTERCONTRACT</span>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Vercel Production Endpoint URL:</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-slate-300 overflow-x-auto">{targetEndpoint}</div>
              <button onClick={() => handleCopyClipboard(targetEndpoint, 'endpoint')} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium">
                {copiedType === 'endpoint' ? 'Đã lưu!' : 'Sao chép'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Link quản lý trực tiếp trên Alchemy Dashboard:</label>
            <a href={webhookData[activeWebhookTab].dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-sm rounded-xl">
              <span>{webhookData[activeWebhookTab].dashboardUrl}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* KHU VỰC 4: LIVE WEBHOOK LOGS RECEIVER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Webhook từ Production (Live)</h4>
            <button onClick={handleFetchLiveWebhookLogs} className="text-[10px] text-blue-400 hover:underline">F5 Tải lại</button>
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            {webhookLogs.filter(log => log.webhookId === webhookData[activeWebhookTab].id).map((log) => (
              <div key={log.id} onClick={() => setSelectedWebhookLog(log)} className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedWebhookLog?.id === log.id ? 'bg-slate-800 border-blue-500/50' : 'bg-slate-950/40 border-slate-800'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-blue-400">Block #{log.event?.block?.number}</span>
                  <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs font-mono text-slate-400 truncate">ID: {log.id}</p>
              </div>
            ))}
            {webhookLogs.filter(log => log.webhookId === webhookData[activeWebhookTab].id).length === 0 && (
              <div className="text-center py-12 text-slate-600 text-xs">Chưa bắt được tín hiệu webhook thực tế nào bắn về API Vercel của tab này.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[350px]">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4 pb-2 border-b border-slate-800 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-blue-400" /> Cấu trúc Alchemy Webhook Payload thực tế (JSON)</h4>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 overflow-auto custom-scrollbar font-mono text-xs">
            {selectedWebhookLog ? <pre className="text-slate-300">{JSON.stringify(selectedWebhookLog, null, 2)}</pre> : <div className="h-full flex items-center justify-center text-slate-600 text-sm">Chọn danh sách bên trái.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}