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
  ChevronRight,
  ArrowRightLeft,
  Database
} from 'lucide-react';

// Hàm định dạng số chuẩn hóa hiển thị giao diện
const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(number ?? 0);
};

export default function AffiliateWebhookAdmin() {
  const [activeWebhookTab, setActiveWebhookTab] = useState('affiliate');
  const [copiedType, setCopiedType] = useState(''); 
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [selectedWebhookLog, setSelectedWebhookLog] = useState(null);
  
  // Quản lý Engine dữ liệu (alchemy = RPC Node | moralis = Cloud Indexer API)
  const [dataEngine, setDataEngine] = useState('alchemy'); 
  // Đã cập nhật Web3 API Key chính xác từ Moralis Playground của bồ
  const [moralisApiKey, setMoralisApiKey] = useState('vM7xza5AGzWH4ugv4vDQsXrPAYuP9gred2lNE7BJnKwB4D2QNuNs2Eso6Zk5pUMT');

  // State Sandbox RPC & Enhanced API
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
  const [rpcStatus, setRpcStatus] = useState('connected');

  // STATE BỘ LỌC ĐỘNG
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('hour'); 
  const [selectedMethods, setSelectedMethods] = useState([]);
  const [selectedHttpCodes, setSelectedHttpCodes] = useState([]);
  const [selectedErrorCodes, setSelectedErrorCodes] = useState([]);
  const [selectedResponseTimes, setSelectedResponseTimes] = useState([]); 

  // STATE PHÂN TRANG
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 
  
  const dropdownRef = useRef(null);
  const ALCHEMY_RPC_URL = "https://bnb-testnet.g.alchemy.com/v2/3P6Sj-7RXbrD7znG4t8f8";
  const targetEndpoint = "https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook";
  
  const baseTime = Date.now();

  const [requestLogs, setRequestLogs] = useState([
    { id: "log_01", method: "alchemy_getAssetTransfers", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "45 ms", timeSent: "11:33 AM", timestamp: baseTime - 1 * 60 * 1000, requestBody: { jsonrpc: "2.0", method: "alchemy_getAssetTransfers" }, responseBody: { jsonrpc: "2.0", result: { transfers: [] } } },
    { id: "log_02", method: "moralis_getUnifiedHistory", app: "Khánh's First App", httpStatus: 200, errorCode: "-", errorMessage: "-", responseTime: "185 ms", timeSent: "11:28 AM", timestamp: baseTime - 4 * 60 * 1000, requestBody: { engine: "moralis_playground_unified", limit: 3 }, responseBody: [] }
  ]);
  const [selectedRequestLog, setSelectedRequestLog] = useState(requestLogs[0]);

  const webhookData = {
    affiliate: {
      id: 'wh_pqra43npyunzk8w7',
      contract: '0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_pqra43npyunzk8w7'
    },
    paymaster: {
      id: 'wh_ck5mia12huh25nvp',
      contract: '0x177858e3450ff286E7d301100363567A555E435f',
      dashboardUrl: 'https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/wh_ck5mia12huh25nvp'
    }
  };

  const timeFilterOptions = [
    { key: '5min', label: 'Last 5 minutes' },
    { key: 'hour', label: 'Last hour' },
    { key: 'day', label: 'Last day' },
    { key: '7days', label: 'Last 7 days' },
    { key: 'month', label: 'Last month' },
    { key: '3months', label: 'Last 3 months' },
    { key: '6months', label: 'Last 6 months' },
    { key: 'year', label: 'Last year' }
  ];

  useEffect(() => {
    if (dataEngine === 'moralis') {
      setSelectedRpcMethod('moralis_getUnifiedHistory');
    } else {
      setSelectedRpcMethod('alchemy_getAssetTransfers');
    }
    setRawRpcResponse(null);
  }, [dataEngine]);

  const handleExecuteDataEngineCall = async () => {
    setIsLoadingRpc(true);
    setRawRpcResponse(null);
    const startTime = performance.now();
    const currentContract = webhookData[activeWebhookTab].contract;

    // NHÁNH XỬ LÝ 1: ENGINE ĐỘC QUYỀN MORALIS PLAYGROUND (QUÉT LIÊN HỢP NATIVE + ERC20 + NFT)
    if (dataEngine === 'moralis') {
      const headers = { accept: 'application/json', 'X-API-Key': moralisApiKey };
      const chain = '0x61'; // BSC Testnet
      
      try {
        // 1. Gọi lịch sử giao dịch Native
        const nativeTransactions = await (await fetch(`https://deep-index.moralis.io/api/v2/${currentContract}?chain=${chain}&limit=3`, { headers })).json();
        
        // 2. Gọi lịch sử chuyển token ERC-20
        const erc20Transactions = await (await fetch(`https://deep-index.moralis.io/api/v2/${currentContract}/erc20/transfers?chain=${chain}&limit=3`, { headers })).json();
        
        // 3. Gọi lịch sử chuyển NFT
        const nftTransactions = await (await fetch(`https://deep-index.moralis.io/api/v2/${currentContract}/nft/transfers?chain=${chain}&limit=3`, { headers })).json();
        
        let unifiedResult = [];
        
        // Xử lý nạp mảng Native
        if (nativeTransactions?.result && Array.isArray(nativeTransactions.result)) {
          nativeTransactions.result.forEach((tx) => {
            const { from_address, to_address, value, hash, block_timestamp } = tx;
            const type = from_address.toLowerCase() === currentContract.toLowerCase() ? 'sent' : 'received';
            unifiedResult.push({
              type,
              from: from_address,
              to: to_address,
              valueEth: String(parseFloat(value) / 10 ** 18), // Quy đổi Wei sang BNB
              hash,
              date: block_timestamp,
              tokenType: 'native',
              name: 'BNB-TESTNET',
              chain,
            });
          });
        }
        
        // Xử lý nạp mảng ERC-20
        if (erc20Transactions?.result && Array.isArray(erc20Transactions.result)) {
          erc20Transactions.result.forEach((tx) => {
            const { from_address, to_address, value, transaction_hash, block_timestamp, address } = tx;
            const type = from_address.toLowerCase() === currentContract.toLowerCase() ? 'sent' : 'received';
            unifiedResult.push({
              type,
              from: from_address,
              to: to_address,
              valueEth: value,
              hash: transaction_hash,
              date: block_timestamp,
              tokenType: 'erc20',
              chain,
              tokenAddress: address,
            });
          });
          
          // Thọc sâu lấy metadata ERC-20 để xử lý Decimals (Sửa lỗi hiển thị số thô)
          const erc20Addresses = [...new Set(erc20Transactions.result.map((r) => r.address))].filter(Boolean);
          if (erc20Addresses.length > 0) {
            const s = '&addresses=' + erc20Addresses.join('&addresses=');
            const erc20Metadata = await (await fetch(`https://deep-index.moralis.io/api/v2/erc20/metadata?chain=${chain}${s}`, { headers })).json();
            
            if (Array.isArray(erc20Metadata)) {
              unifiedResult.forEach((item) => {
                if (item.tokenType === 'erc20') {
                  const meta = erc20Metadata.find((m) => m.address?.toLowerCase() === item.tokenAddress?.toLowerCase());
                  if (meta) {
                    item.name = meta.symbol || 'ERC-20';
                    if (meta.decimals) {
                      item.valueEth = String(formatNumber(parseFloat(item.valueEth) / 10 ** parseInt(meta.decimals)));
                    }
                  }
                }
              });
            }
          }
        }
        
        // Xử lý nạp mảng NFT
        if (nftTransactions?.result && Array.isArray(nftTransactions.result)) {
          for (const tx of nftTransactions.result) {
            const { from_address, to_address, amount, block_timestamp, contract_type, transaction_hash, token_id, token_address } = tx;
            const type = from_address.toLowerCase() === currentContract.toLowerCase() ? 'sent' : 'received';
            
            let resolvedNftName = `${contract_type || 'NFT'} #${token_id}`;
            try {
              const nftMeta = await (await fetch(`https://deep-index.moralis.io/api/v2/nft/${token_address}/${token_id}?chain=${chain}`, { headers })).json();
              if (nftMeta?.name) {
                resolvedNftName = `${nftMeta.name} #${token_id}`;
              }
            } catch (e) {
              console.warn("Bỏ qua lỗi tải NFT Meta lẻ", e);
            }
            
            unifiedResult.push({
              type,
              from: from_address,
              to: to_address,
              valueEth: amount,
              hash: transaction_hash,
              date: block_timestamp,
              tokenType: contract_type?.toLowerCase() || 'nft',
              chain,
              tokenId: token_id,
              tokenAddress: token_address,
              name: resolvedNftName
            });
          }
        }
        
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        setRawRpcResponse(unifiedResult); // Đổ mảng liên hợp chuẩn ra màn hình hiển thị JSON

        // Lưu bản ghi vào hệ thống Request Logs
        const newLogEntry = {
          id: `log_${Math.random().toString(36).substr(2, 5)}`,
          method: selectedRpcMethod,
          app: "Khánh's First App",
          httpStatus: 200,
          errorCode: "-",
          errorMessage: "-",
          responseTime: `${duration} ms`,
          timeSent: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          requestBody: { engine: "moralis_playground_unified", contract: currentContract, limits: "3 per type" },
          responseBody: unifiedResult
        };
        setRequestLogs(prev => [newLogEntry, ...prev]);
        setCurrentPage(1);
        
      } catch (error) {
        setRawRpcResponse({ error: "Lỗi luồng xử lý liên hợp Moralis API", details: error.message });
      } finally {
        setIsLoadingRpc(false);
      }
      return;
    }

    // NHÁNH XỬ LÝ 2: HẠ TẦNG ALCHEMY JSON-RPC NODE
    const rpcBody = { jsonrpc: "2.0", id: 1, method: selectedRpcMethod };

    if (selectedRpcMethod === 'alchemy_getAssetTransfers') {
      rpcBody.params = [{
        fromBlock: "0x0",
        toBlock: "latest",
        toAddress: currentContract,
        category: ["external", "erc20"], 
        excludeZeroValue: false,
        withMetadata: true
      }];
    } 
    else if (selectedRpcMethod === 'eth_getLogs') {
      const filterObj = { fromBlock: logsFromBlock, toBlock: logsToBlock };
      if (activeWebhookTab === 'paymaster' && !logsTopics.trim()) {
        const paddedPaymaster = "0x" + currentContract.replace("0x", "").toLowerCase().padStart(64, '0');
        filterObj.topics = [
          "0x49628e100ac341d24a3e6da50b589cffa6a6c42aabf49b9d4abcb32e65c9535b", 
          null,
          paddedPaymaster 
        ];
      } else {
        filterObj.address = logsAddress;
        if (logsTopics.trim()) filterObj.topics = logsTopics.split(',').map(t => t.trim());
      }
      rpcBody.params = [filterObj];
    } 
    else if (selectedRpcMethod === 'eth_getBlockReceipts') rpcBody.params = [blockParam];
    else if (selectedRpcMethod === 'eth_estimateGas') rpcBody.params = [{ from: txFrom, to: txTo, value: txValue }];
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
      setCurrentPage(1);
    } catch (error) {
      setRawRpcResponse({ error: "Lỗi RPC Endpoint", details: error.message });
    } finally {
      setIsLoadingRpc(false);
    }
  };

  useEffect(() => {
    const currentContract = webhookData[activeWebhookTab].contract;
    setLogsAddress(currentContract);
    setTxTo(currentContract);
    if (selectedRpcMethod === 'eth_blockNumber' || selectedRpcMethod === 'alchemy_getAssetTransfers' || selectedRpcMethod === 'moralis_getUnifiedHistory') {
      handleExecuteDataEngineCall();
    }
  }, [activeWebhookTab]);

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
    if (selectedTimeFilter === 'month' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === '3months' && diffMs > 90 * 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === '6months' && diffMs > 180 * 24 * 60 * 60 * 1000) return false;
    if (selectedTimeFilter === 'year' && diffMs > 365 * 24 * 60 * 60 * 1000) return false;

    if (selectedMethods.length > 0 && !selectedMethods.includes(log.method)) return false;
    if (selectedHttpCodes.length > 0) {
      const isSuccess = log.httpStatus === 200;
      if (selectedHttpCodes.includes('200') && !isSuccess) return false;
      if (selectedHttpCodes.includes('error') && isSuccess) return false;
    }
    if (selectedErrorCodes.length > 0 && !selectedErrorCodes.includes(log.errorCode)) return false;

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
    setSelectedErrorCodes([]);
    setSelectedResponseTimes([]);
    setCurrentPage(1);
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
          <Settings className="text-emerald-500 w-7 h-7" /> Hệ Thống Quản Trị On-Chain & Phân Tích Dữ Liệu Contract
        </h1>
      </div>

      {/* TỔNG QUAN HẠ TẦNG */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Active Contract Target Address</p>
          <p className="text-xs font-mono text-emerald-400 mt-2 truncate select-all">{webhookData[activeWebhookTab].contract}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Alchemy Testnet Node State</p>
          <p className="text-sm font-bold text-blue-400 mt-1.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> Endpoint Active
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium uppercase">Moralis Cloud Playground Engine</p>
          <p className="text-sm font-bold text-purple-400 mt-1.5 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span> Indexer Ready
          </p>
        </div>
      </div>

      {/* KHU VỰC 1: TRÌNH THÁM MÃ ĐỘNG - DUAL ENGINE SANDBOX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
            <Code className="w-4 h-4 text-blue-400" /> Sandbox Studio - Bộ điều khiển gọi dữ liệu
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
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Select Engine Method</label>
            {dataEngine === 'moralis' ? (
              <select value={selectedRpcMethod} onChange={(e) => { setSelectedRpcMethod(e.target.value); setRawRpcResponse(null); }} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-purple-400 font-mono focus:outline-none focus:border-purple-500">
                <option value="moralis_getUnifiedHistory">moralis_getUnifiedHistory - Quét liên hợp lịch sử (Native, ERC-20, NFT)</option>
              </select>
            ) : (
              <select value={selectedRpcMethod} onChange={(e) => { setSelectedRpcMethod(e.target.value); setRawRpcResponse(null); }} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 font-mono focus:outline-none focus:border-blue-500">
                <option value="alchemy_getAssetTransfers">alchemy_getAssetTransfers - Quét lịch sử ví (Alchemy Enhanced API)</option>
                <option value="eth_getLogs">eth_getLogs - Tra cứu Event Logs (Phòng vệ 10 blocks)</option>
                <option value="eth_getBlockReceipts">eth_getBlockReceipts - Lấy toàn bộ biên lai khối</option>
                <option value="eth_estimateGas">eth_estimateGas - Ước tính Gas giao dịch</option>
                <option value="eth_feeHistory">eth_feeHistory - Xem lịch sử cấu trúc phí</option>
                <option value="eth_blockNumber">eth_blockNumber - Lấy số khối mới nhất</option>
              </select>
            )}
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              {dataEngine === 'moralis' ? 'Moralis Web3 API Key' : 'Block Param (Hex)'}
            </label>
            {dataEngine === 'moralis' ? (
              <input type="password" value={moralisApiKey} onChange={(e) => setMoralisApiKey(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-purple-400 font-mono focus:outline-none" />
            ) : (
              <input type="text" value={blockParam} onChange={(e) => setBlockParam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-blue-400 font-mono focus:outline-none" />
            )}
          </div>

          <div className="md:col-span-1">
            <button onClick={handleExecuteDataEngineCall} disabled={isLoadingRpc} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all h-[38px] ${dataEngine === 'moralis' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
              <Play className={`w-4 h-4 ${isLoadingRpc ? 'animate-spin' : ''}`} /> Run Request
            </button>
          </div>
        </div>

        {selectedRpcMethod === 'eth_getLogs' && dataEngine === 'alchemy' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-slate-950/40 border border-slate-800 rounded-xl animate-fadeIn">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">fromBlock</label>
              <input type="text" value={logsFromBlock} onChange={(e) => setLogsFromBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">toBlock (An toàn tối đa +10 khối)</label>
              <input type="text" value={logsToBlock} onChange={(e) => setLogsToBlock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">address</label>
              <input type="text" value={logsAddress} onChange={(e) => setLogsAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-400" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1.5">topics</label>
              <input type="text" value={logsTopics} onChange={(e) => setLogsTopics(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Phản hồi JSON thô trả về:</div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs h-48 overflow-y-auto custom-scrollbar">
              {rawRpcResponse ? <pre className={`${dataEngine === 'moralis' ? 'text-purple-400' : 'text-blue-400'} whitespace-pre`}>{JSON.stringify(rawRpcResponse, null, 2)}</pre> : <span className="text-slate-600">Đang đợi yêu cầu lệnh từ bồ...</span>}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Bảng phân tích thám mã giao dịch thông minh:
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-48 overflow-y-auto custom-scrollbar text-xs font-mono">
              {dataEngine === 'moralis' && Array.isArray(rawRpcResponse) ? (
                <div className="space-y-2">
                  <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-[11px] font-semibold">
                    Moralis Playground Engine bóc tách liên hợp thành công {rawRpcResponse.length} giao dịch.
                  </div>
                  {rawRpcResponse.map((tx, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${tx.type === 'received' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {tx.type === 'received' ? '⬇ Received' : '➔ Sent'}
                        </span>
                        <span className="text-slate-200 font-bold">{tx.valueEth} {tx.name}</span>
                      </div>
                      <div className="text-slate-500 truncate text-[10px]">Hash: {tx.hash}</div>
                      <div className="text-slate-600 text-[10px] text-right">{tx.date ? new Date(tx.date).toLocaleString() : 'N/A'}</div>
                    </div>
                  ))}
                </div>
              ) : dataEngine === 'alchemy' && selectedRpcMethod === 'alchemy_getAssetTransfers' && Array.isArray(rawRpcResponse?.result?.transfers) ? (
                <div className="space-y-2">
                  {rawRpcResponse.result.transfers.map((tx, idx) => (
                    <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[11px] truncate text-slate-300">
                      Tx: {tx.hash} | Value: {tx.value} {tx.asset}
                    </div>
                  ))}
                </div>
              ) : <div className="text-slate-600 text-center pt-12">Chọn phương thức, cấu hình tham số tương thích và khởi chạy dữ liệu Engine.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC 2: MÀN HÌNH THỐNG KÊ REQUEST LOGS VÀ BỘ LỌC ĐỘNG NÂNG CẤP */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative" ref={dropdownRef}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="text-purple-400 w-5 h-5" /> Request Logs Lịch Sử
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Inspect recent request activity for this app.</p>
        </div>

        {/* CỤM FILTERS */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 relative z-20">
          <span className="text-xs font-semibold text-slate-400 px-1">Filters</span>
          
          {/* Lọc Time */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'time' ? null : 'time')} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium">
              Time: <span className="text-blue-400">{timeFilterOptions.find(o => o.key === selectedTimeFilter)?.label}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'time' && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1.5 space-y-0.5 z-30">
                {timeFilterOptions.map(option => (
                  <button key={option.key} onClick={() => { setSelectedTimeFilter(option.key); setActiveDropdown(null); setCurrentPage(1); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${selectedTimeFilter === option.key ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lọc Methods */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'methods' ? null : 'methods')} className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium ${selectedMethods.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}>
              Methods {selectedMethods.length > 0 && `(${selectedMethods.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'methods' && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30">
                {['alchemy_getAssetTransfers', 'moralis_getUnifiedHistory', 'eth_getLogs', 'eth_getBlockReceipts', 'eth_feeHistory', 'eth_estimateGas', 'eth_blockNumber'].map(method => (
                  <label key={method} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-xs font-mono text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={selectedMethods.includes(method)} onChange={() => toggleFilter(method, selectedMethods, setSelectedMethods)} className="rounded border-slate-800 text-blue-500 bg-slate-950" />
                    {method}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Lọc HTTP codes */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'http' ? null : 'http')} className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium ${selectedHttpCodes.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}>
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

          {/* Lọc Response times */}
          <div className="relative">
            <button onClick={() => setActiveDropdown(activeDropdown === 'responseTime' ? null : 'responseTime')} className={`px-3 py-1.5 border hover:border-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 font-medium ${selectedResponseTimes.length > 0 ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-900 border-slate-800'}`}>
              Response times {selectedResponseTimes.length > 0 && `(${selectedResponseTimes.length})`}
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {activeDropdown === 'responseTime' && (
              <div className="absolute left-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 space-y-1 z-30">
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

          {/* Reset button */}
          {(selectedTimeFilter !== 'hour' || selectedMethods.length > 0 || selectedHttpCodes.length > 0 || selectedResponseTimes.length > 0) && (
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
              <div className="text-center py-12 text-slate-600 font-medium bg-slate-950/20">Không tìm thấy bản ghi log nào khớp bộ lọc.</div>
            )}

            {/* THANH BỘ PHÂN TRANG */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800/80 bg-slate-950/40 gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>View</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none"
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
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => handlePageChange(page)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300'}`}>
                    {page}
                  </button>
                ))}
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Chi tiết bên phải */}
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
                      <button 
                        onClick={() => {
                          if (selectedRequestLog.method.startsWith('moralis_')) setDataEngine('moralis');
                          else setDataEngine('alchemy');
                          setSelectedRpcMethod(selectedRequestLog.method);
                          window.scrollTo({ top: 180, behavior: 'smooth' });
                        }} 
                        className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 px-2 py-1 rounded text-blue-400 font-medium"
                      >
                        Retry in Sandbox
                      </button>
                      <button onClick={() => handleCopyClipboard(JSON.stringify(selectedRequestLog.requestBody, null, 2), 'req')} className="text-[10px] bg-slate-900 border border-slate-800 hover:bg-slate-800 px-2 py-1 rounded text-slate-300">Copy</button>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 max-h-40 overflow-auto font-mono text-[11px] text-slate-400">
                    <pre>{JSON.stringify(selectedRequestLog.requestBody, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ) : <div className="text-center py-16 text-slate-600">Chọn một hàng trong bảng để xem chi tiết.</div>}
          </div>
        </div>
      </div>

      {/* KHU VỰC 3: WEBHOOK PRODUCTION INFO */}
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
    </div>
  );
}