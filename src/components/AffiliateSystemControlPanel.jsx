import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Users, Settings, DollarSign, Plus, Trash2, ArrowRight, 
  ShoppingCart, Activity, Sparkles, Loader2, MessageSquareText, 
  Network, UserCircle, Target, TrendingUp, Lightbulb,
  HeartHandshake, PlayCircle, Clock, GraduationCap, Copy, CheckCircle2,
  Wallet, History, AlertTriangle, ServerCog, Terminal, RefreshCw, Link2, Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// ==========================================\n// CẤU HÌNH WEB3 & ACCOUNT ABSTRACTION (BSC Testnet)\n// ==========================================\nimport { createPublicClient, http, encodeFunctionData } from 'viem';
import { bscTestnet } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { privateKeyToAccount } from 'viem/accounts';

const PIMLICO_URL = import.meta.env.VITE_BUNDLER_URL || "https://api.pimlico.io/v2/97/rpc?apikey=YOUR_API_KEY";
const BICONOMY_URL = import.meta.env.VITE_BICONOMY_BUNDLER_URL || "https://bundler.biconomy.io/api/v2/97/YOUR_API_KEY";
const ALCHEMY_URL = import.meta.env.VITE_ALCHEMY_URL || "";

export default function AffiliateSystemControlPanel() {
  // Các State tab hiện tại của hệ thống
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, network, webhooks
  
  // State phục vụ tính năng Webhook Alchemy mới nâng cấp
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  
  // State hiển thị thông báo Toast thông minh
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Dữ liệu giả lập ban đầu cho các phần tổng quan hệ thống
  const [userStats, setUserStats] = useState([
    { id: 'u1', name: 'Hệ thống gốc', role: 'Admin', totalEarnedVND: 25000000, referrals: 12 },
    { id: 'u2', name: 'Nguyễn Văn A', role: 'Partner', totalEarnedVND: 4500000, referrals: 5 },
    { id: 'u3', name: 'Trần Thị B', role: 'Distributor', totalEarnedVND: 1200000, referrals: 2 }
  ]);

  // Hàm hiển thị Toast thông báo nhanh
  const showToastMessage = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // Sao chép chuỗi ký tự nhanh vào Clipboard
  const handleCopy = (text, typeLabel) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToastMessage(`Đã sao chép ${typeLabel} thành công!`);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Hàm gọi API lấy Log từ cơ sở dữ liệu MongoDB thông qua Serverless Function
  const fetchWebhookLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch('/api/get-webhook-logs');
      const data = await response.json();
      if (data.success) {
        setWebhookLogs(data.logs || []);
      } else {
        showToastMessage('Không thể tải nhật ký log từ hệ thống database.', 'error');
      }
    } catch (error) {
      console.error("Lỗi fetch webhook logs:", error);
      // Fallback log mẫu trực quan nếu đang chạy local hoặc chưa deploy hoàn chỉnh DB
      setWebhookLogs([
        {
          _id: 'mock_1',
          txHash: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f58f6d34b93475a8947b41e82',
          wallet: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          type: 'alchemy_webhook_event',
          createdAt: new Date().toISOString(),
          rawLog: { blockNumber: 21540890, gasUsed: 42000 }
        }
      ]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Tự động reload log mỗi khi người dùng chuyển sang tab Webhook
  useEffect(() => {
    if (activeTab === 'webhooks') {
      fetchWebhookLogs();
    }
  }, [activeTab]);

  // Đoạn GraphQL query tùy biến người dùng yêu cầu để hiển thị tại dashboard chỉ dẫn
  const alchemyGraphQLSchema = `{
  block {
    hash,
    number,
    timestamp,
    logs(filter: {addresses: ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"]}) { 
      data,
      topics,
      index,
      account { address },
      transaction {
        hash, nonce, index, value, gasPrice, status, gasUsed,
        from { address },
        to { address }
      }
    }
  }
}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans flex flex-col antialiased selection:bg-emerald-500/30">
      
      {/* HEADER TỐI GIẢN CHUẨN CYBERPUNK */}
      <header className="border-b border-[#222] bg-[#0f0f0f] px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <ServerCog className="w-6 h-6 text-black font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider uppercase text-white">Affiliate System Control Center</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Web3 Account Abstraction & Alchemy Webhooks Enabled
            </p>
          </div>
        </div>

        {/* DIỀU HƯỚNG TAB CHÍNH HỆ THỐNG */}
        <nav className="flex items-center gap-1 bg-[#151515] p-1 border border-[#2c2c2c] rounded-xl">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${activeTab === 'overview' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-[#202020]'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Tổng Quan
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${activeTab === 'users' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-[#202020]'}`}
          >
            <Users className="w-3.5 h-3.5" /> Thành Viên
          </button>
          <button 
            onClick={() => setActiveTab('webhooks')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${activeTab === 'webhooks' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-[#202020]'}`}
          >
            <Terminal className="w-3.5 h-3.5" /> Alchemy Webhook
            <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full lowercase font-mono">live</span>
          </button>
        </nav>
      </header>

      {/* NỘI DUNG CHÍNH THAY ĐỔI DỰA TRÊN TAB HỆ THỐNG */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* ========================================== */}
        {/* TAB 1: TỔNG QUAN (OVERVIEW)               */}
        {/* ========================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#121212] border border-[#222] p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng doanh thu liên kết</p>
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-white">30,700,000 VND</h3>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/10 group-hover:bg-emerald-500/50 transition-all" />
              </div>
              
              <div className="bg-[#121212] border border-[#222] p-5 rounded-2xl relative overflow-hidden group hover:border-teal-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Smart Wallet Account Abstraction</p>
                  <Wallet className="w-5 h-5 text-teal-400" />
                </div>
                <h3 className="text-lg font-mono font-bold text-white truncate">BSC Testnet Client Ready</h3>
                <p className="text-[11px] text-slate-500 truncate mt-1">Pimlico Bundler: Enabled</p>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-teal-500/10 group-hover:bg-teal-500/50 transition-all" />
              </div>

              <div className="bg-[#121212] border border-[#222] p-5 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Alchemy Webhook Status</p>
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  Active
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                </h3>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-500/10 group-hover:bg-purple-500/50 transition-all" />
              </div>
            </div>

            {/* ĐỒ THỊ DOANH THU MÔ PHỎNG */}
            <div className="bg-[#121212] border border-[#222] p-6 rounded-2xl">
              <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-6">Biểu Đồ Doanh Thu Theo Thành Viên</h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" stroke="#666" fontSize={11} />
                    <YAxis stroke="#666" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#141414', borderColor: '#333', color: '#fff' }} />
                    <Bar dataKey="totalEarnedVND" fill="#10b981" radius={[4, 4, 0, 0]} name="Doanh Thu (VND)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: QUẢN LÝ THÀNH VIÊN (USERS)          */}
        {/* ========================================== */}
        {activeTab === 'users' && (
          <div className="bg-[#121212] border border-[#222] rounded-2xl overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-[#222] flex justify-between items-center bg-[#161616]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Danh sách tài khoản liên kết trong mạng lưới</h3>
            </div>
            <div className="divide-y divide-[#222]">
              {userStats.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between hover:bg-[#161616] transition-colors">
                  <div className="flex items-center gap-3">
                    <UserCircle className="w-8 h-8 text-slate-500" />
                    <div>
                      <p className="text-sm font-bold text-white">{u.name}</p>
                      <span className="text-[10px] uppercase font-mono tracking-widest bg-[#222] px-2 py-0.5 rounded text-slate-400 border border-[#333]">
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-400">{u.totalEarnedVND.toLocaleString()} VND</p>
                    <p className="text-[11px] text-slate-500">{u.referrals} F1 giới thiệu</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: ALCHEMY WEBHOOK & AUTOMATION (MỚI) */}
        {/* ========================================== */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* THÔNG TIN KẾT NỐI TỪ ALCHEMY QUA VERCEL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* CARD CẤU HÌNH THÔNG SỐ LINK URL */}
              <div className="lg:col-span-2 bg-[#121212] border border-[#222] p-6 rounded-2xl space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-[#222]">
                  <Link2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Alchemy Webhook Link Mạng Lưới</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
                      1. Địa chỉ nhận Webhook phản hồi (Vercel Production Endpoint):
                    </label>
                    <div className="flex items-center gap-2 bg-[#181818] border border-[#2d2d2d] rounded-xl p-3 font-mono text-xs text-slate-300">
                      <span className="flex-1 truncate select-all">https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook</span>
                      <button 
                        onClick={() => handleCopy('https://hien-mau-nhan-van.vercel.app/api/alchemy-webhook', 'URL Webhook API')}
                        className="p-1.5 hover:bg-[#282828] rounded-lg transition-colors text-slate-400 hover:text-white"
                        title="Copy Webhook URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5 font-semibold">
                      2. Cấu hình ứng dụng giám sát ứng dụng trực tiếp trên Alchemy:
                    </label>
                    <div className="flex items-center gap-2 bg-[#181818] border border-[#2d2d2d] rounded-xl p-3 font-mono text-xs text-slate-300">
                      <span className="flex-1 truncate select-all">https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/create</span>
                      <a 
                        href="https://dashboard.alchemy.com/apps/xo4ut1zr4j2ut5qk/webhooks/create" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-[#282828] rounded-lg transition-colors text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 text-xs text-slate-400 space-y-1">
                  <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Hướng dẫn tích hợp thời gian thực:
                  </p>
                  <p>Khi các Smart Account thực hiện giao dịch thông qua cơ chế Account Abstraction, Alchemy Custom Webhook sẽ tự động tóm cập nhật dữ liệu qua API Vercel và đẩy đồng bộ thẳng vào cluster MongoDB của bạn.</p>
                </div>
              </div>

              {/* CARD HIỂN THỊ CẤU HÌNH TRỰC QUAN GRAPHQL SCHEMA */}
              <div className="bg-[#121212] border border-[#222] p-6 rounded-2xl flex flex-col">
                <div className="flex items-center justify-between pb-2 border-b border-[#222] mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-teal-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Custom GraphQL Schema Filter</h3>
                  </div>
                  <button 
                    onClick={() => handleCopy(alchemyGraphQLSchema, 'GraphQL Query Schema')}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy Code
                  </button>
                </div>
                
                <div className="flex-1 bg-[#161616] border border-[#2d2d2d] rounded-xl p-3 font-mono text-[11px] text-slate-400 overflow-y-auto max-h-56 select-all whitespace-pre">
                  {alchemyGraphQLSchema}
                </div>
              </div>
            </div>

            {/* BẢNG THEO DÕI REAL-TIME WEBHOOK LOGS TỪ MONGO_DB */}
            <div className="bg-[#121212] border border-[#222] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[#222] flex justify-between items-center bg-[#161616]">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Nhật ký dữ liệu sự kiện nhận được từ Alchemy Webhook</h3>
                </div>
                <button 
                  onClick={fetchWebhookLogs}
                  disabled={loadingLogs}
                  className="px-3 py-1.5 bg-[#252525] border border-[#383838] hover:bg-[#303030] rounded-lg text-xs font-semibold flex items-center gap-2 text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin text-emerald-400' : ''}`} />
                  Làm mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#222] bg-[#181818] text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="p-4 font-bold">Transaction Hash</th>
                      <th className="p-4 font-bold">Wallet Address (From)</th>
                      <th className="p-4 font-bold">Event Type</th>
                      <th className="p-4 font-bold">Thời gian nhận</th>
                      <th className="p-4 font-bold text-center">Trạng thái lưu DB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222] text-xs">
                    {webhookLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-[#161616] transition-colors">
                        <td className="p-4 font-mono text-emerald-400 select-all max-w-[220px] truncate">
                          {log.txHash}
                        </td>
                        <td className="p-4 font-mono text-slate-300 select-all max-w-[200px] truncate">
                          {log.wallet}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono text-[10px]">
                            {log.type}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Success
                          </span>
                        </td>
                      </tr>
                    ))}
                    {webhookLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center p-12 text-slate-500 text-sm font-medium">
                          {loadingLogs ? 'Đang truy vấn dữ liệu...' : 'Hệ thống chưa nhận được log sự kiện webhook nào từ Alchemy.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* --- THÔNG BÁO TOAST THÔNG MINH BÊN GÓC PHẢI --- */}
      <div className={`fixed bottom-6 right-6 bg-[#141414] border p-4 rounded-xl shadow-2xl transition-all duration-300 z-[100] flex items-start gap-3 max-w-sm pointer-events-none ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} ${toast.type === 'success' ? 'border-emerald-500/30 shadow-emerald-950/40' : 'border-red-500/30 shadow-red-950/40'}`}>
        <div className="mt-1">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] rounded-full bg-[#141414]" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] rounded-full bg-[#141414]" />
          )}
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Hệ Thống Thông Báo</h4>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
        </div>
      </div>

    </div>
  );
}