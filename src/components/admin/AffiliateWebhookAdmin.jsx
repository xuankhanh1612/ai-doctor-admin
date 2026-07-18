import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, Copy, ExternalLink, Activity, Check, Terminal, Settings, 
  Play, RefreshCw, Cpu, Wifi, Code, Filter, Clock, X, ChevronDown, 
  RotateCcw, ChevronLeft, ChevronRight, Database, AlertTriangle, FileCode, Wallet
} from 'lucide-react';

// =========================================================================
// INDEXEDDB: ALCHEMY LOGS
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

const generateCurlCommand = (log) => {
  if (!log) return '';
  return `curl https://bnb-testnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY \\\n  -X POST \\\n  -H "accept: application/json" \\\n  -H "content-type: application/json" \\\n  --data '${JSON.stringify(log.requestBody)}'`;
};

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copiedType, setCopiedType] = useState(''); 
  
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
    setCustomAddress(webhookData[activeWebhookTab].contract);
  }, [activeWebhookTab]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setActiveDropdown(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExecuteDataEngineCall = async () => {
    setIsLoadingRpc(true);
    setRawRpcResponse(null);
    const startTime = performance.now();
    const targetQueryAddress = customAddress.trim() || webhookData[activeWebhookTab].contract;

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
      const response = await fetch(ALCHEMY_RPC_URL, { method: 'POST', headers: { 'accept': 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(rpcBody) });
      const resData = await response.json();
      const duration = Math.round(performance.now() - startTime);

      setRawRpcResponse(resData);
      const newLogEntry = {
        id: `alc_${Math.random().toString(36).substr(2, 7)}`,
        method: selectedRpcMethod,
        app: "Khánh's First App",
        httpStatus: response.status,
        errorCode: resData.error ? String(resData.error.code) : "-",
        errorMessage: resData.error ? resData.error.message : "-",
        responseTime: `${duration} ms`,
        timeSent: new Date().toLocaleTimeString(),
        timestamp: Date.now(),
        requestBody: rpcBody,
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

  const handleCopyClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(''), 2000);
  };

  const currentPagedLogs = requestLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-blue-500 w-7 h-7" /> Quản Trị Webhook & Alchemy Node
        </h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button onClick={() => setActiveWebhookTab('affiliate')} className={`text-left p-4 rounded-xl border transition-all ${activeWebhookTab === 'affiliate' ? 'bg-slate-950/80 border-blue-500 ring-1 ring-blue-500/30' : 'bg-slate-950/20 border-slate-800'}`}>
            <span className="text-sm font-bold block mb-1">AFFILIATE TRACKER</span>
            <span className="text-xs font-mono text-slate-500">{webhookData.affiliate.contract}</span>
          </button>
          <button onClick={() => setActiveWebhookTab('paymaster')} className={`text-left p-4 rounded-xl border transition-all ${activeWebhookTab === 'paymaster' ? 'bg-slate-950/80 border-blue-500 ring-1 ring-blue-500/30' : 'bg-slate-950/20 border-slate-800'}`}>
            <span className="text-sm font-bold block mb-1">PAYMASTER CONTRACT</span>
            <span className="text-xs font-mono text-slate-500">{webhookData.paymaster.contract}</span>
          </button>
        </div>
        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
          <span className="text-xs font-mono text-slate-300">{targetEndpoint}</span>
          <a href={webhookData[activeWebhookTab].dashboardUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">Mở Alchemy Dashboard <ExternalLink className="w-3 h-3"/></a>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h2 className="text-sm font-bold uppercase text-slate-300 flex items-center gap-1.5 border-b border-slate-800 pb-3"><Code className="w-4 h-4 text-blue-400" /> Alchemy Sandbox Studio</h2>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <select value={selectedRpcMethod} onChange={(e) => setSelectedRpcMethod(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-blue-500">
              <option value="alchemy_getAssetTransfers">alchemy_getAssetTransfers</option>
              <option value="eth_getLogs">eth_getLogs</option>
              <option value="eth_getBlockReceipts">eth_getBlockReceipts</option>
              <option value="eth_estimateGas">eth_estimateGas</option>
              <option value="eth_feeHistory">eth_feeHistory</option>
            </select>
          </div>
          <div className="lg:col-span-6">
            <input type="text" value={customAddress} onChange={(e) => setCustomAddress(e.target.value)} placeholder="Target Wallet / Contract" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none" />
          </div>
          <div className="lg:col-span-2">
            <button onClick={handleExecuteDataEngineCall} disabled={isLoadingRpc} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 text-sm font-semibold flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Gửi Lệnh</button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs bg-slate-950">
            <thead className="bg-slate-900/50 border-b border-slate-800 text-slate-400"><tr className="p-3"><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3 text-right">Time</th></tr></thead>
            <tbody className="divide-y divide-slate-800 cursor-pointer">
              {currentPagedLogs.map(log => (
                <tr key={log.id} onClick={() => setSelectedRequestLog(log)} className={selectedRequestLog?.id === log.id ? 'bg-slate-800/50' : 'hover:bg-slate-900'}>
                  <td className="p-3 font-mono text-slate-200">{log.method}</td>
                  <td className="p-3 text-emerald-400">{log.httpStatus}</td>
                  <td className="p-3 text-right text-slate-500">{log.timeSent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedRequestLog && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">➔ Request Payload</span>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-auto font-mono text-[11px] text-pink-400"><pre>{JSON.stringify(selectedRequestLog.requestBody, null, 2)}</pre></div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 block mb-2">⬇ Response Output</span>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 overflow-auto font-mono text-[11px] text-blue-400 h-40"><pre>{JSON.stringify(selectedRequestLog.responseBody, null, 2)}</pre></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}