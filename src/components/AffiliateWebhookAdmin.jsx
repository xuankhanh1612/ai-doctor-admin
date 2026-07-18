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
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copiedType, setCopiedType] = useState(''); 
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [selectedWebhookLog, setSelectedWebhookLog] = useState(null);
  
  // State Sandbox RPC 
  const [selectedRpcMethod, setSelectedRpcMethod] = useState('eth_blockNumber');
  const [blockParam, setBlockParam] = useState('0x7226a16'); 
  const [txFrom, setTxFrom] = useState('0x60d492288df05122a47421b91cd94df5016c2b9d');
  const [txTo, setTxTo] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c'); 
  const [txValue, setTxValue] = useState('0x0');
  const [feeBlockCount, setFeeBlockCount] = useState('0x5');
  const [feeNewestBlock, setFeeNewestBlock] = useState('latest');
  const [feePercentiles, setFeePercentiles] = useState('20, 30');
  const [logsFromBlock, setLogsFromBlock] = useState('0x137d3c2');
  const [logsToBlock, setLogsToBlock] = useState('0x137d3c3');
  const [logsAddress, setLogsAddress] = useState('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c');
  const [logsTopics, setLogsTopics] = useState('');

  const [isLoadingRpc, setIsLoadingRpc] = useState(false);
  const [rawRpcResponse, setRawRpcResponse] = useState(null);
  const [latestLiveBlock, setLatestBlock] = useState('0x0');
  const [rpcStatus, setRpcStatus] = useState('connecting');

  // STATE BỘ LỌC ĐỘNG (FILTERS STATE)
  const [activeDropdown, setActiveDropdown] = useState(null); // 'time', 'methods', 'http', 'errors', 'responseTime'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('hour'); 
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [selectedHttpCodes, setSelectedHttpCodes] = useState([]);
  const [selectedErrorCodes, setSelectedErrorCodes] = useState([]);
  const [selectedResponseTimes, setSelectedResponseTimes] = useState([]); // MỚI: Bộ lọc Response time

  // STATE PHÂN TRANG MỚI (PAGINATION STATE)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Mặc định 10 items/trang
  
  const dropdownRef = useRef(null);
  const ALCHEMY_RPC_URL = "https://bnb-testnet.g.alchemy.com/v2/3P6Sj-7RXbrD7znG4t8f8";
  const targetEndpoint = "https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook";
  
  // Lấy mốc thời gian hiện tại làm gốc tính toán tương đối
  const baseTime = Date.now();

  // MOCK DATA REQUEST LOGS DIỆN RỘNG ĐỂ KIỂM TRA PHÂN TRANG VÀ LỌC TỐC ĐỘ
  const [requestLogs, setRequestLogs] = useState([
    { id: "log_01", method: "eth_getLogs", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "3 ms", timeSent: "11:33 AM", timestamp: baseTime - 1 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_getLogs", params: [{ address: "0x44f7..." }] }, responseBody: { jsonrpc: "2.0", result: [] } },
    { id: "log_02", method: "eth_feeHistory", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "250 ms", timeSent: "11:10 AM", timestamp: baseTime - 25 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_feeHistory" }, responseBody: { jsonrpc: "2.0", result: {} } },
    { id: "log_03", method: "eth_getBlockReceipts", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "2 ms", timeSent: "09:15 AM", timestamp: baseTime - 2 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_getBlockReceipts" }, responseBody: { jsonrpc: "2.0", result: [] } },
    { id: "log_04", method: "eth_blockNumber", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "1 ms", timeSent: "Hôm qua", timestamp: baseTime - 28 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_blockNumber" }, responseBody: { jsonrpc: "2.0", result: "0x7226a16" } },
    { id: "log_05", method: "eth_getBlockReceipts", app: "Khánh's First App", httpStatus: 200, errorCode: "-32602", errorMessage: "invalid argument 0: hex string \"0x\"", responseTime: "2450 ms", timeSent: "4 ngày trước", timestamp: baseTime - 4 * 24 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_getBlockReceipts" }, responseBody: { error: { code: -32602 } } },
    { id: "log_06", method: "eth_estimateGas", app: "Khánh's First App", httpStatus: 400, errorCode: "-32016", errorMessage: "execution reverted: 0x", responseTime: "4 ms", timeSent: "15 ngày trước", timestamp: baseTime - 15 * 24 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_estimateGas" }, responseBody: { error: { code: -32016 } } },
    { id: "log_07", method: "eth_getLogs", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "3100 ms", timeSent: "2 tháng trước", timestamp: baseTime - 65 * 24 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_getLogs" }, responseBody: { result: [] } },
    { id: "log_08", method: "eth_feeHistory", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "88 ms", timeSent: "4 tháng trước", timestamp: baseTime - 130 * 24 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_feeHistory" }, responseBody: { result: {} } },
    { id: "log_09", method: "eth_blockNumber", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "12 ms", timeSent: "8 tháng trước", timestamp: baseTime - 250 * 24 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_blockNumber" }, responseBody: { result: "0x12" } },
    { id: "log_10", method: "eth_estimateGas", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "5 ms", timeSent: "11 tháng trước", timestamp: baseTime - 340 * 24 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_estimateGas" }, responseBody: { result: "0x5208" } },
    { id: "log_11", method: "eth_getLogs", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "120 ms", timeSent: "1 năm trước", timestamp: baseTime - 364 * 24 * 60 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "eth_getLogs" }, responseBody: { result: [] } }
  ]);
  const [selectedRequestLog, setSelectedRequestLog] = useState(requestLogs[0]);

  const webhookData = {
    affiliate: {
      name: 'AFFILIATE TRACKER WEBHOOK',
      id: 'wh_pqra43npyunzk8w7',
      contract: '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_pqra43npyunzk8w7',
      query: `{ block { hash } }`
    },
    paymaster: {
      name: 'HIENMAUPAYMASTERCONTRACT',
      id: 'wh_ck5mia12huh25nvp',
      contract: '0x177858e3450ff286E7d301100363567A555E435f',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_ck5mia12huh25nvp',
      query: `{ block { hash } }`
    }
  };

  const timeFilterOptions = [
    { key: '5min', label: 'Last 5 minutes' },
    { key: 'hour', label: 'Last hour' },
    { key: 'day', label: 'Last day' },
    { key: '7days', label: 'Last 7 days' },
    { key: 'month', label: 'Last month' },
    { key: '3months', label: 'Last 3 months' }, // THÊM MỚI
    { key: '6months', label: 'Last 6 months' }, // THÊM MỚI
    { key: 'year', label: 'Last year' }          // THÊM MỚI (ĐÃ XOÁ CUSTOM)
  ];

  // Đóng dropdown khi click ra ngoài vùng bộ lọc
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
    if (selectedRpcMethod === 'eth_getBlockReceipts') rpcBody.params = [blockParam];
    else if (selectedRpcMethod === 'eth_estimateGas') rpcBody.params = [{ from: txFrom, to: txTo, value: txValue }];
    else if (selectedRpcMethod === 'eth_feeHistory') rpcBody.params = [feeBlockCount, feeNewestBlock, [20, 30]];
    else if (selectedRpcMethod === 'eth_getLogs') rpcBody.params = [{ fromBlock: logsFromBlock, toBlock: logsToBlock, address: logsAddress, topics: [] }];

    try {
      const response = await fetch(ALCHEMY_RPC_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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

      const newLogEntry = {
        id: `log_${Math.random().toString(36).substr(2, 5)}`,
        method: selectedRpcMethod,
        app: "Khánh's First App",
        httpStatus: response.status,
        errorCode: resData.error ? String(resData.error.code) : "-",
        errorMessage: resData.error ? resData.error.message : "-",
        responseTime: `${duration} ms`,
        timeSent: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        requestBody: rpcBody,
        responseBody: resData
      };
      setRequestLogs(prev => [newLogEntry, ...prev]);
      setCurrentPage(1); // Reset về trang 1 khi có dữ liệu mới đổ về

    } catch (error) {
      setRawRpcResponse({ error: "Lỗi RPC", details: error.message });
      setRpcStatus('error');
    } finally {
      setIsLoadingRpc(false);
    }
  };

  const handleRetryInSandbox = (log) => {
    setSelectedRpcMethod(log.method);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setSelectedTimeFilter('hour');
    setSelectedMethods([]);
    setSelectedHttpCodes([]);
    setSelectedErrorCodes([]);
    setSelectedResponseTimes([]);
    setCurrentPage(1);
  };

  const toggleFilter = (item, list, setList) => {
    setCurrentPage(1); // Reset trang khi thay đổi filter
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  // TOÀN BỘ LOGIC LỌC DỮ LIỆU ĐỘNG (THỜI GIAN VÀ HIỆU NĂNG RESPONSE TIME)
  const filteredRequestLogs = requestLogs.filter(log => {
    // 1. Lọc thời gian dựa trên timestamp thực tế
    const diffMs = Date.now() - log.timestamp;
    if (selectedTimeFilter === '5min' && diffMs > 5 * 60 * 1000) return false;
    if (selectedTimeFilter === 'hour' && diffMs > 60 * 60 * 1000) return false;
    if (selectedTimeFilter === 'day' && diffMs > 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === '7days' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === 'month' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === '3months' && diffMs > 90 * 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === '6months' && diffMs > 180 * 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === 'year' && diffMs > 365 * 24 * 60 * 60 * 1000) return false;

    // 2. Lọc theo Methods
    if (selectedMethods.length > 0 && !selectedMethods.includes(log.method)) return false;
    
    // 3. Lọc theo HTTP codes
    if (selectedHttpCodes.length > 0) {
      const isSuccess = log.httpStatus === 200;
      if (selectedHttpCodes.includes('200') && !isSuccess) return false;
      if (selectedHttpCodes.includes('error') && isSuccess) return false;
    }

    // 4. Lọc theo Error codes
    if (selectedErrorCodes.length > 0 && !selectedErrorCodes.includes(log.errorCode)) return false;

    // 5. Lọc theo Tốc độ phản hồi (Response time logic mới)
    if (selectedResponseTimes.length > 0) {
      const timeNum = parseInt(log.responseTime) || 0;
      let category = '';
      if (timeNum < 200) category = 'light';
      else if (timeNum <= 2000) category = 'medium';
      else category = 'heavy';

      if (!selectedResponseTimes.includes(category)) return false;
    }

    return true;
  });

  // TÍNH TOÁN DỮ LIỆU PHÂN TRANG (PAGINATION LOGIC)
  const totalItems = filteredRequestLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Điều chỉnh nếu trang hiện tại vượt quá tổng số trang sau khi lọc dữ liệu
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [itemsPerPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPagedLogs = filteredRequestLogs.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getFilteredTransactions = () => {
    if (!rawRpcResponse || !rawRpcResponse.result || !Array.isArray(rawRpcResponse.result)) return [];
    const targetContractLower = webhookData[activeWebhookTab].contract.toLowerCase();
    return rawRpcResponse.result.filter(receipt => {
      const directMatch = receipt.to && receipt.to.toLowerCase() === targetContractLower;
      const logMatch = receipt.logs && receipt.logs.some(log => log.address && log.address.toLowerCase() === targetContractLower);
      return directMatch || logMatch;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-emerald-500 w-7 h-7" /> Quản Trị Hệ Thống & Kết Nối On-Chain Real-Time
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
          <p className="text-xl font-mono font-bold text-blue-400 mt-1">{latestLiveBlock}</p>
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <Code className="w-4 h-4 text-blue-400" /> Màn hình tương tác Alchemy Sandbox
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
            <input type="text" value={blockParam} onChange={(e) => setBlockParam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none" />
          </div>

          <div className="md:col-span-1">
            <button onClick={handleCallAlchemyRpc} disabled={isLoadingRpc} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all h-[38px]">
              <Play className={`w-4 h-4 ${isLoadingRpc ? 'animate-spin' : ''}`} /> Send Request
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Phản hồi thô JSON-RPC từ Node:</div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs h-48 overflow-y-auto custom-scrollbar">
              {rawRpcResponse ? <pre className="text-blue-400 whitespace-pre">{JSON.stringify(rawRpcResponse, null, 2)}</pre> : <span className="text-slate-600">Chưa có kết quả.</span>}
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
                    </div>
                  ))}
                </div>
              ) : <div className="text-slate-600 text-center pt-8">Chọn "eth_getBlockReceipts" để xem giao dịch.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC 2: MÀN HÌNH THỐNG KÊ REQUEST LOGS VÀ BỘ LỌC ĐỘNG NÂNG CẤP */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative" ref={dropdownRef}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="text-purple-400 w-5 h-5" /> Request Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Inspect recent request activity for this app.</p>
        </div>

        {/* CỤM THANH BỘ LỌC CHUẨN ALCHEMY (CẬP NHẬT MỐC THỜI GIAN VÀ RESPONSE TIME MỚI) */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 relative z-20">
          <span className="text-xs font-semibold text-slate-400 px-1">Filters</span>
          
          {/* 1. Bộ lọc Thời gian mới (Xoá Custom) */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium"
            >
              Time: <span className="text-blue-400">{timeFilterOptions.find(o => o.key === selectedTimeFilter)?.label}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'time' && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-0.5 z-30">
                {timeFilterOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={() => {
                      setSelectedTimeFilter(option.key);
                      setActiveDropdown(null);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${selectedTimeFilter === option.key ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Bộ lọc Methods */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'methods' ? null : 'methods')}
              className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium ${selectedMethods.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}
            >
              Methods {selectedMethods.length > 0 && `(${selectedMethods.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'methods' && (
              <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30">
                {['eth_blockNumber', 'eth_estimateGas', 'eth_feeHistory', 'eth_getBlockReceipts', 'eth_getLogs'].map(method => (
                  <label key={method} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-mono text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={selectedMethods.includes(method)} onChange={() => toggleFilter(method, selectedMethods, setSelectedMethods)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                    {method}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 3. Bộ lọc Networks */}
          <div className="relative">
            <button className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium">
              Networks: <span className="text-amber-500">BSC Testnet</span>
            </button>
          </div>

          {/* 4. Bộ lọc HTTP codes */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'http' ? null : 'http')}
              className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium ${selectedHttpCodes.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}
            >
              HTTP codes {selectedHttpCodes.length > 0 && `(${selectedHttpCodes.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'http' && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30">
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

          {/* 5. Bộ lọc Error codes */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'errors' ? null : 'errors')}
              className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium ${selectedErrorCodes.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}
            >
              Error codes {selectedErrorCodes.length > 0 && `(${selectedErrorCodes.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'errors' && (
              <div className="absolute left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30">
                {['-', '-32602', '-32016'].map(code => (
                  <label key={code} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={selectedErrorCodes.includes(code)} onChange={() => toggleFilter(code, selectedErrorCodes, setSelectedErrorCodes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                    {code === '-' ? 'No Error (-)' : `Error (${code})`}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 6. MỚI: KÍCH HOẠT BỘ LỌC RESPONSE TIMES (XOÁ XOÁ CUSTOM) */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'responseTime' ? null : 'responseTime')}
              className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium transition-all ${selectedResponseTimes.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}
            >
              Response times {selectedResponseTimes.length > 0 && `(${selectedResponseTimes.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'responseTime' && (
              <div className="absolute left-0 mt-2 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30 animate-fadeIn">
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={selectedResponseTimes.includes('light')} onChange={() => toggleFilter('light', selectedResponseTimes, setSelectedResponseTimes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                  Light (&lt;200ms)
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={selectedResponseTimes.includes('medium')} onChange={() => toggleFilter('medium', selectedResponseTimes, setSelectedResponseTimes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                  Medium (200 - 2000ms)
                </label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={selectedResponseTimes.includes('heavy')} onChange={() => toggleFilter('heavy', selectedResponseTimes, setSelectedResponseTimes)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                  Heavy (&gt;2000ms)
                </label>
              </div>
            )}
          </div>

          {/* Reset Filters */}
          {(selectedTimeFilter !== 'hour' || selectedMethods.length > 0 || selectedHttpCodes.length > 0 || selectedErrorCodes.length > 0 || selectedResponseTimes.length > 0) && (
            <button onClick={handleResetFilters} className="ml-auto p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Layout Log List + Chi tiết */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative z-10">
          <div className="lg:col-span-2 flex flex-col border border-slate-800/80 rounded-xl bg-slate-950/20 overflow-hidden">
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
                {currentPagedLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedRequestLog(log)}
                    className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${selectedRequestLog?.id === log.id ? 'bg-slate-900/80 border-l-2 border-l-blue-500' : ''}`}
                  >
                    <td className="p-3 font-mono font-medium text-slate-200">{log.method}</td>
                    <td className="p-3 text-slate-400">{log.app}</td>
                    <td className="p-3"><span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-[11px] border border-amber-500/20">BSC Testnet</span></td>
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

            {totalItems === 0 && (
              <div className="text-center py-12 text-slate-600 font-medium bg-slate-950/20">Không có bản ghi nào khớp bộ lọc.</div>
            )}

            {/* MỚI: GIAO DIỆN PHÂN TRANG CHUẨN ĐÚNG CẤU HÌNH BỒ YÊU CẦU */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800/80 bg-slate-950/40 gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>View</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  {[10, 20, 30, 40, 50, 100].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span>items per page</span>
              </div>

              <div className="font-medium">
                Showing <span className="text-slate-200">{totalItems > 0 ? startIndex + 1 : 0}</span> to <span className="text-slate-200">{endIndex}</span> of <span className="text-slate-200">{totalItems}</span> entries
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      currentPage === page 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Chi tiết Request Log Details bên phải */}
          <div className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Request Log Details</h3>
            </div>
            {selectedRequestLog ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-y-2 text-slate-400 border-b border-slate-900 pb-3">
                  <div>Method:</div><div className="font-mono text-slate-200 text-right">{selectedRequestLog.method}</div>
                  <div>Response Time:</div><div className="text-emerald-400 text-right font-semibold">{selectedRequestLog.responseTime}</div>
                  <div>Time Sent:</div><div className="text-slate-500 text-right">{selectedRequestLog.timeSent}</div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wide">➔ Request</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleRetryInSandbox(selectedRequestLog)} className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 px-2 py-1 rounded text-blue-400 font-medium">Retry in Sandbox</button>
                      <button onClick={() => handleCopyClipboard(JSON.stringify(selectedRequestLog.requestBody, null, 2), 'req')} className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 px-2 py-1 rounded text-slate-300">Copy</button>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 max-h-32 overflow-auto font-mono text-[11px] text-slate-400">
                    <pre>{JSON.stringify(selectedRequestLog.requestBody, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ) : <div className="text-center py-16 text-slate-600">Chọn 1 log để xem chi tiết.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}