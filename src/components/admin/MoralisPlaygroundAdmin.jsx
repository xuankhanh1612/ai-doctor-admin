import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Play, Database, Copy, Clock, RotateCcw, FileCode, 
  Terminal, AlertTriangle, Wallet, ChevronLeft, ChevronRight, ChevronDown 
} from 'lucide-react';
import { fetchUnifiedHistory } from '../../services/moralisService';

// =========================================================================
// INDEXEDDB ENGINE FOR MORALIS LOGS
// =========================================================================
const DB_NAME = 'HMNV_Moralis_Logs_DB';
const DB_VERSION = 1;
const STORE_NAME = 'moralis_logs';

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
  } catch (error) { console.error("Moralis DB Save Error:", error); }
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
  } catch (error) { console.error("Moralis DB Clear Error:", error); }
};

const shortenAddress = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '0x...';

export default function MoralisPlaygroundAdmin() {
  const [moralisApiKey, setMoralisApiKey] = useState('vM7xza5AGzWH4ugv4vDQsXrPAYuP9gred2lNE7BJnKwB4D2QNuNs2Eso6Zk5pUMT');
  const [customAddress, setCustomAddress] = useState('0x177858e3450ff286E7d301100363567A555E435f'); 

  const [isLoading, setIsLoading] = useState(false);
  const [rawRpcResponse, setRawRpcResponse] = useState(null);
  const [requestLogs, setRequestLogs] = useState([]);
  const [selectedRequestLog, setSelectedRequestLog] = useState(null);
  const [copiedType, setCopiedType] = useState('');

  // STATE BỘ LỌC ĐỘNG & PHÂN TRANG CHO HISTORY LOGS
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('hour'); 
  const [selectedHttpCodes, setSelectedHttpCodes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 
  const dropdownRef = useRef(null);

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

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setActiveDropdown(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. HÀM THỰC THI QUÉT API MORALIS
  const handleExecuteMoralis = async () => {
    setIsLoading(true);
    setRawRpcResponse(null);
    const startTime = performance.now();
    const targetQueryAddress = customAddress.trim();

    try {
      const unifiedResult = await fetchUnifiedHistory(targetQueryAddress, moralisApiKey);
      const duration = Math.round(performance.now() - startTime);
      setRawRpcResponse(unifiedResult); 

      const newLogEntry = {
        id: `mor_${Math.random().toString(36).substr(2, 7)}`,
        method: 'moralis_getUnifiedHistory',
        app: "Moralis Core Engine",
        httpStatus: 200,
        responseTime: `${duration} ms`,
        timeSent: new Date().toLocaleTimeString(),
        timestamp: Date.now(),
        requestBody: { engine: "moralis_playground_unified", wallet: targetQueryAddress, targetUrl: `https://deep-index.moralis.io/api/v2/${targetQueryAddress}` },
        responseBody: unifiedResult
      };

      await saveLogToIndexedDB(newLogEntry);
      setRequestLogs(prev => [newLogEntry, ...prev]);
      setSelectedRequestLog(newLogEntry);
      setCurrentPage(1);
    } catch (error) {
      setRawRpcResponse({ error: "Lỗi luồng cổng API Moralis", details: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 2. HÀM TẮT MỞ BỘ LỌC ĐỘNG
  const toggleFilter = (item, list, setList) => {
    setCurrentPage(1);
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  // 3. ĐÃ BỔ SUNG: HÀM CHUYỂN TRANG LOGS
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // 4. ĐÃ BỔ SUNG: HÀM XOÁ SẠCH LỊCH SỬ LOGS
  const handleClearLogs = async () => {
    if (window.confirm("Bồ có chắc chắn muốn xoá sạch lịch sử quét Moralis trong IndexedDB không?")) {
      await clearAllLogsFromIndexedDB();
      setRequestLogs([]);
      setSelectedRequestLog(null);
      setCurrentPage(1);
    }
  };

  // LOGIC COMPUTE FILTER SẠCH SẼ CHO PHẦN LỊCH SỬ
  const filteredRequestLogs = requestLogs.filter(log => {
    const diffMs = Date.now() - log.timestamp;
    if (selectedTimeFilter === '5min' && diffMs > 5 * 60 * 1000) return false;
    if (selectedTimeFilter === 'hour' && diffMs > 60 * 60 * 1000) return false;
    if (selectedTimeFilter === 'day' && diffMs > 24 * 60 * 60 * 1000) return false;

    if (selectedHttpCodes.length > 0) {
      const isSuccess = log.httpStatus === 200;
      if (selectedHttpCodes.includes('200') && !isSuccess) return false;
      if (selectedHttpCodes.includes('error') && isSuccess) return false;
    }
    return true;
  });

  const totalItems = filteredRequestLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPagedLogs = filteredRequestLogs.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="text-purple-500 w-7 h-7" /> Trình Thám Mã On-Chain & Moralis Playground
        </h1>
      </div>

      {/* QUICK SELECT BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setCustomAddress('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c')} className="text-[11px] bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white transition-colors">Target: Affiliate Contract</button>
          <button onClick={() => setCustomAddress('0x177858e3450ff286E7d301100363567A555E435f')} className="text-[11px] bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white transition-colors">Target: Paymaster Contract</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2">
            <Wallet className="w-4 h-4 text-slate-500"/>
            <input type="text" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} placeholder="Nhập địa chỉ ví 0x..." className="w-full bg-transparent text-sm text-purple-400 font-mono focus:outline-none" />
          </div>
          <div className="lg:col-span-3">
            <input type="password" value={moralisApiKey} onChange={(e) => setMoralisApiKey(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-400 font-mono focus:outline-none" placeholder="X-API-Key" />
          </div>
          <div className="lg:col-span-2">
            <button onClick={handleExecuteMoralis} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Get History</button>
          </div>
        </div>
      </div>

      {/* BSCSCAN VISUALIZER DISPLAY GRID */}
      <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-950/50 border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase text-slate-300 flex items-center justify-between">
          <div className="flex items-center gap-2"><Database className="w-4 h-4 text-purple-400" /> BscScan Testnet Real-time Tracker Table</div>
          <span className="text-[11px] text-slate-500 font-mono">Ví đang quét: {shortenAddress(customAddress)}</span>
        </div>
        <div className="overflow-x-auto min-h-[180px]">
          {Array.isArray(rawRpcResponse) ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr><th className="p-3">Parent Transaction Hash</th><th className="p-3">Block</th><th className="p-3">Time</th><th className="p-3">From</th><th className="p-3 text-center">Dir</th><th className="p-3">To</th><th className="p-3 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[13px]">
                {rawRpcResponse.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono"><a href={`https://testnet.bscscan.com/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{shortenAddress(tx.hash)}</a></td>
                    <td className="p-3 font-mono text-slate-300">{tx.block}</td>
                    <td className="p-3 text-slate-500 text-xs">{new Date(tx.date).toLocaleTimeString()}</td>
                    <td className="p-3 font-mono text-slate-300">{shortenAddress(tx.from)}</td>
                    <td className="p-3 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tx.type === 'received' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{tx.type === 'received' ? 'IN' : 'OUT'}</span></td>
                    <td className="p-3 font-mono text-slate-300">{shortenAddress(tx.to)}</td>
                    <td className="p-3 text-right font-medium text-slate-100">{tx.valueEth} <span className="text-xs text-slate-400 uppercase font-bold">{tx.name}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-slate-600 font-medium"><Terminal className="w-8 h-8 mx-auto mb-1 opacity-40 animate-pulse" />Nhập API Key và bấm "Get History" để render bảng điện tử Explorer.</div>
          )}
        </div>
      </div>

      {/* FULL HISTORY LOGS LAYER WITH ALL FILTERS & SIDEBAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative" ref={dropdownRef}>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Clock className="text-purple-400 w-5 h-5" /> Request Logs Lịch Sử (Moralis Cloud Store)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Nhật ký persistent ghi nhận lưu trữ cục bộ độc lập.</p>
          </div>
          <button onClick={handleClearLogs} className="px-3 py-1.5 bg-rose-950/40 border border-rose-900/60 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Clear Moralis DB</button>
        </div>

        {/* FULL FILTER CHUẨN */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 relative z-20">
          <span className="text-xs font-semibold text-slate-400 px-1">Filters</span>
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium">Time: <span className="text-purple-400">{timeFilterOptions.find(o => o.key === selectedTimeFilter)?.label || 'Last hour'}</span><ChevronDown className="w-3 h-3 text-slate-500" /></button>
            {activeDropdown === 'time' && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-0.5 z-30">
                {timeFilterOptions.map(option => (<button key={option.key} onClick={() => { setSelectedTimeFilter(option.key); setActiveDropdown(null); setCurrentPage(1); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${selectedTimeFilter === option.key ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>{option.label}</button>))}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'http' ? null : 'http')} className={`px-3 py-1.5 border text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium ${selectedHttpCodes.length > 0 ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-slate-900 border-slate-800'}`}>HTTP codes {selectedHttpCodes.length > 0 && `(${selectedHttpCodes.length})`}<ChevronDown className="w-3 h-3 text-slate-500" /></button>
            {activeDropdown === 'http' && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1 z-30">
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer"><input type="checkbox" checked={selectedHttpCodes.includes('200')} onChange={() => toggleFilter('200', selectedHttpCodes, setSelectedHttpCodes)} className="rounded text-purple-500 bg-slate-950" /> Success (200)</label>
                <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs text-slate-300 cursor-pointer"><input type="checkbox" checked={selectedHttpCodes.includes('error')} onChange={() => toggleFilter('error', selectedHttpCodes, setSelectedHttpCodes)} className="rounded text-purple-500 bg-slate-950" /> Failures / Errors</label>
              </div>
            )}
          </div>
        </div>

        {/* DATA CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative z-10">
          <div className="lg:col-span-2 flex flex-col border border-slate-800 rounded-xl bg-slate-950/20 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/40">
                  <th className="p-3">Method</th><th className="p-3">App</th><th className="p-3">HTTP</th><th className="p-3 text-right">Response Time</th><th className="p-3 text-right">Time Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {currentPagedLogs.map((log) => (
                  <tr key={log.id} onClick={() => setSelectedRequestLog(log)} className={`hover:bg-slate-900/40 cursor-pointer transition-colors ${selectedRequestLog?.id === log.id ? 'bg-slate-800/50 border-l-2 border-l-purple-500' : ''}`}>
                    <td className="p-3 font-mono text-slate-200">{log.method}</td>
                    <td className="p-3 text-slate-400">{log.app}</td>
                    <td className="p-3"><span className="text-emerald-400 font-medium">{log.httpStatus}</span></td>
                    <td className="p-3 text-right text-emerald-400 font-medium">{log.responseTime}</td>
                    <td className="p-3 text-right text-slate-500">{log.timeSent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalItems === 0 && <div className="text-center py-12 text-slate-600 bg-slate-950/20">Không có nhật ký log nào.</div>}

            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800 bg-slate-950/40 gap-4 text-xs text-slate-400">
              <div>Showing <span className="text-slate-200">{totalItems > 0 ? startIndex + 1 : 0}</span> to <span className="text-slate-200">{endIndex}</span> of <span className="text-slate-200">{totalItems}</span> entries</div>
              <div className="flex items-center gap-1">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* SIDEBAR DETAILED CONSOLE */}
          <div className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 shadow-2xl">
            <h3 className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1 border-b border-slate-900 pb-2"><FileCode className="w-4 h-4 text-purple-400" /> Moralis Payload Inspector</h3>
            {selectedRequestLog ? (
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center"><span className="text-[11px] font-bold uppercase text-slate-400">➔ Request Config Payload</span>
                    <button onClick={() => { if (selectedRequestLog.requestBody?.wallet) setCustomAddress(selectedRequestLog.requestBody.wallet); window.scrollTo({ top: 120, behavior: 'smooth' }); }} className="text-[10px] text-purple-400 hover:underline">Retry in Sandbox</button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-36 overflow-auto font-mono text-[11px] text-pink-400"><pre>{JSON.stringify(selectedRequestLog.requestBody, null, 2)}</pre></div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-500 block">cURL Terminal Target</span>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-slate-400 overflow-x-auto whitespace-pre">curl "{selectedRequestLog.requestBody?.targetUrl}" -H "X-API-Key: YOUR_KEY"</div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">⬇ Response Indexer Results</span>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-40 overflow-auto font-mono text-[11px] text-blue-400 custom-scrollbar"><pre>{JSON.stringify(selectedRequestLog.responseBody, null, 2)}</pre></div>
                </div>
              </div>
            ) : <div className="text-slate-600 text-center py-12">Chọn log bên trái để kiểm tra payload.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}