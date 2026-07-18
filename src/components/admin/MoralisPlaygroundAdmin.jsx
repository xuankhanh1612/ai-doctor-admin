import React, { useState, useEffect } from 'react';
import { Settings, Play, Database, Copy, Clock, RotateCcw, FileCode, Terminal, AlertTriangle, Wallet } from 'lucide-react';
import { fetchUnifiedHistory } from '../../services/moralisService';

// =========================================================================
// INDEXEDDB: MORALIS LOGS ONLY
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
  } catch (error) { console.error(error); }
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
  } catch (error) { console.error(error); }
};

const shortenAddress = (addr) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : '0x...';

export default function MoralisPlaygroundAdmin() {
  const [moralisApiKey, setMoralisApiKey] = useState('vM7xza5AGzWH4ugv4vDQsXrPAYuP9gred2lNE7BJnKwB4D2QNuNs2Eso6Zk5pUMT');
  const [customAddress, setCustomAddress] = useState('0x177858e3450ff286E7d301100363567A555E435f'); // Default Paymaster

  const [isLoading, setIsLoading] = useState(false);
  const [rawRpcResponse, setRawRpcResponse] = useState(null);
  const [requestLogs, setRequestLogs] = useState([]);
  const [selectedRequestLog, setSelectedRequestLog] = useState(null);
  const [copiedType, setCopiedType] = useState('');

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
        app: "Moralis Dashboard",
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
    } catch (error) {
      setRawRpcResponse({ error: "Lỗi kết nối Moralis API", details: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(''), 2000);
  };

  const handleClearLogs = async () => {
    if(window.confirm("Xoá sạch lịch sử quét Moralis?")) {
      await clearAllLogsFromIndexedDB();
      setRequestLogs([]);
      setSelectedRequestLog(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="text-purple-500 w-7 h-7" /> Trình Thám Mã On-Chain & Moralis Playground
        </h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex gap-2 mb-2">
          <button onClick={() => setCustomAddress('0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c')} className="text-[10px] bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-slate-400 hover:text-white">Quick: Affiliate</button>
          <button onClick={() => setCustomAddress('0x177858e3450ff286E7d301100363567A555E435f')} className="text-[10px] bg-slate-950 border border-slate-800 px-3 py-1 rounded-full text-slate-400 hover:text-white">Quick: Paymaster</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2">
            <Wallet className="w-5 h-5 text-slate-500"/>
            <input type="text" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} placeholder="Nhập địa chỉ ví 0x..." className="w-full bg-transparent text-sm text-purple-400 font-mono focus:outline-none" />
          </div>
          <div className="lg:col-span-3">
            <input type="password" value={moralisApiKey} onChange={(e) => setMoralisApiKey(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-500 focus:outline-none" placeholder="Moralis API Key" />
          </div>
          <div className="lg:col-span-2">
            <button onClick={handleExecuteMoralis} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Get History</button>
          </div>
        </div>
      </div>

      <div className="border border-slate-800 bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-950/50 border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase text-slate-300 flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" /> BscScan Tracker Visualizer
        </div>
        <div className="overflow-x-auto min-h-[220px]">
          {Array.isArray(rawRpcResponse) ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                <tr><th className="p-3">Tx Hash</th><th className="p-3">Block</th><th className="p-3">Time</th><th className="p-3">From</th><th className="p-3 text-center">Dir</th><th className="p-3">To</th><th className="p-3 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-[13px]">
                {rawRpcResponse.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50">
                    <td className="p-3 font-mono"><a href={`https://testnet.bscscan.com/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{shortenAddress(tx.hash)}</a></td>
                    <td className="p-3 font-mono text-slate-300">{tx.block}</td>
                    <td className="p-3 text-slate-500 text-xs">{new Date(tx.date).toLocaleString()}</td>
                    <td className="p-3 font-mono text-slate-300">{shortenAddress(tx.from)}</td>
                    <td className="p-3 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tx.type === 'received' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{tx.type === 'received' ? 'IN' : 'OUT'}</span></td>
                    <td className="p-3 font-mono text-slate-300">{shortenAddress(tx.to)}</td>
                    <td className="p-3 text-right font-medium text-slate-100">{tx.valueEth} <span className="text-xs text-slate-400">{tx.name}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16 text-slate-600"><Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" /> Bấm Get History để tải dữ liệu ví.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase">Local Logs (Moralis)</h3>
            <button onClick={handleClearLogs} className="text-[10px] text-rose-400 border border-rose-900/50 px-2 py-1 rounded">Clear</button>
          </div>
          <div className="space-y-2 h-64 overflow-y-auto custom-scrollbar">
            {requestLogs.map(log => (
              <div key={log.id} onClick={() => setSelectedRequestLog(log)} className={`p-2 rounded-lg cursor-pointer text-xs ${selectedRequestLog?.id === log.id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50'}`}>
                <div className="flex justify-between text-slate-300 font-mono mb-1"><span>{shortenAddress(log.requestBody.wallet)}</span><span className="text-emerald-400">{log.httpStatus}</span></div>
                <div className="text-[10px] text-slate-500 text-right">{log.timeSent} - {log.responseTime}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase border-b border-slate-800 pb-2 mb-3">Payload Inspector</h3>
          {selectedRequestLog ? (
            <div className="space-y-3">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-[11px] font-mono text-pink-400 h-32 overflow-auto"><pre>{JSON.stringify(selectedRequestLog.requestBody, null, 2)}</pre></div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-[11px] font-mono text-purple-400 h-48 overflow-auto"><pre>{JSON.stringify(selectedRequestLog.responseBody, null, 2)}</pre></div>
            </div>
          ) : <div className="text-slate-600 text-center py-10 text-xs">Chọn log bên trái để xem chi tiết.</div>}
        </div>
      </div>
    </div>
  );
}