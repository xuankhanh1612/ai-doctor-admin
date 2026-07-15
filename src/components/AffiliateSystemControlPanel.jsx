import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Settings, DollarSign, Plus, Trash2, ArrowRight, 
  ShoppingCart, Activity, Sparkles, Loader2, MessageSquareText, 
  Network, UserCircle, Target, TrendingUp, Lightbulb,
  HeartHandshake, PlayCircle, Clock, GraduationCap, Copy, CheckCircle2,
  Wallet, History, AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// ==========================================
// CẤU HÌNH WEB3 & ACCOUNT ABSTRACTION (BSC Testnet)
// ==========================================
import { createPublicClient, http, encodeFunctionData } from 'viem';
import { bscTestnet } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { privateKeyToAccount } from 'viem/accounts';

// Lấy từ .env (Đảm bảo file .env của Vite dùng tiền tố VITE_)
const BUNDLER_URL = import.meta.env.VITE_BUNDLER_URL || "https://api.pimlico.io/v2/97/rpc?apikey=YOUR_PIMLICO_API_KEY";
const PAYMASTER_ADDRESS = import.meta.env.VITE_PAYMASTER_ADDRESS || "0x177858e3450ff286E7d301100363567A555E435f";
const AFFILIATE_CONTRACT = import.meta.env.VITE_AFFILIATE_CONTRACT || "0x44f787D670Ff4Ef65334D6637960bb7Fe5E1231c";

const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http("https://data-seed-prebsc-1-s1.binance.org:8545")
});

// --- MOCK DATA BAN ĐẦU ---
const defaultBalances = { VND: 0, VIET: 0, PI: 0, BTC: 0, ETH: 0, BNB: 0, USDT: 0 };

const INITIAL_USERS = [
  { id: 'u1', name: 'Admin (Hệ Thống)', parentId: null, balances: { ...defaultBalances } },
  { id: 'u2', name: 'Nguyễn Văn A', parentId: 'u1', balances: { ...defaultBalances } },
  { id: 'u3', name: 'Trần Thị B', parentId: 'u2', balances: { ...defaultBalances } }, // F1 của A
  { id: 'u4', name: 'Lê Văn C', parentId: 'u3', balances: { ...defaultBalances } }, // F1 của B, F2 của A
  { id: 'u5', name: 'Phạm Thị D', parentId: 'u4', balances: { ...defaultBalances } }, // F1 của C, F3 của A
  { id: 'u6', name: 'Hoàng Văn E', parentId: 'u2', balances: { ...defaultBalances } }, // F1 của A
];

const INITIAL_POLICY = [
  { level: 1, rate: 10 }, // Trực tiếp (F1)
  { level: 2, rate: 5 },  // Gián tiếp (F2)
  { level: 3, rate: 2 },  // Gián tiếp (F3)
];

const INITIAL_TRANSACTIONS = [
  { id: 't1', userId: 'u5', amount: 1000000, date: '2026-07-10', note: 'Quyên góp quỹ nhân văn', type: 'PURCHASE' },
];

const QUIZ_QUESTIONS = [
  {
    question: "Lợi ích tuyệt vời nhất của việc hiến máu đối với người hiến là gì?",
    options: ["Giảm cân nhanh chóng", "Kích thích tạo máu mới & Giảm sắt thừa", "Tăng chiều cao", "Không có lợi ích gì"],
    correct: 1,
    reward: { VIET: 10000, USDT: 0.5 }
  },
  {
    question: "Khoảng cách thời gian an toàn tối thiểu giữa 2 lần hiến máu toàn phần là bao lâu?",
    options: ["1 tuần", "1 tháng", "Khoảng 12 tuần (84 ngày)", "1 năm"],
    correct: 2,
    reward: { VIET: 15000, PI: 0.1 }
  }
];

// --- GEMINI API INTEGRATION ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 
const callGeminiAPI = async (prompt) => {
  if (!apiKey) return "Vui lòng cấu hình VITE_GEMINI_API_KEY trong file .env";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const delays = [1000, 2000, 4000, 8000, 16000];
  
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi từ AI.";
    } catch (err) {
      if (i === 5) throw err;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
  return "Lỗi kết nối AI.";
};

export default function AffiliateSystem() {
  const [activeTab, setActiveTab] = useState('user'); // 'admin' | 'stats' | 'user'
  const [users, setUsers] = useState(INITIAL_USERS);
  const [policy, setPolicy] = useState(INITIAL_POLICY);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [viewingUserId, setViewingUserId] = useState('u2'); // Mặc định xem account u2

  // --- CUSTOM TOAST STATE ---
  const [toast, setToast] = useState({ show: false, title: '', message: '', type: 'success' });

  const showToast = (title, message, type = 'success') => {
    setToast({ show: true, title, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // --- AI STATES ---
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketingCopy, setMarketingCopy] = useState({});
  const [isGeneratingCopy, setIsGeneratingCopy] = useState({});

  // --- EARN SYSTEM STATES ---
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [adCooldowns, setAdCooldowns] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  // --- CLOCK TICKER FOR COOLDOWN ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- ADSENSE TIMER LOGIC ---
  useEffect(() => {
    let interval;
    if (isWatchingAd && adTimer > 0) {
      interval = setInterval(() => setAdTimer(prev => prev - 1), 1000);
    } else if (isWatchingAd && adTimer === 0) {
      handleAdSuccess();
    }
    return () => clearInterval(interval);
  }, [isWatchingAd, adTimer]);

  // --- CORE LOGIC: THUẬT TOÁN TÍNH HOA HỒNG MLM ---
  const commissions = useMemo(() => {
    let result = [];
    
    transactions.forEach(transaction => {
      const buyer = users.find(u => u.id === transaction.userId);
      if (!buyer) return;

      let currentUserId = buyer.parentId; 
      let currentLevel = 1;

      while (currentUserId && currentLevel <= policy.length) {
        const referrer = users.find(u => u.id === currentUserId);
        if (!referrer) break; 

        const levelPolicy = policy.find(p => p.level === currentLevel);
        
        if (levelPolicy && levelPolicy.rate > 0) {
          const commissionAmount = (transaction.amount * levelPolicy.rate) / 100;
          
          result.push({
            id: `comm_${transaction.id}_${referrer.id}`,
            transactionId: transaction.id,
            buyerName: buyer.name,
            referrerId: referrer.id,
            referrerName: referrer.name,
            level: currentLevel,
            rate: levelPolicy.rate,
            amount: commissionAmount,
            date: transaction.date,
            note: transaction.note
          });
        }
        currentUserId = referrer.parentId;
        currentLevel++;
      }
    });
    return result;
  }, [transactions, users, policy]);

  // --- USER BALANCE & STATS CALCULATION ---
  const userStats = useMemo(() => {
    return users.map(user => {
      const userCommissions = commissions.filter(c => c.referrerId === user.id);
      const commissionEarnedVND = userCommissions.reduce((sum, c) => sum + c.amount, 0);
      const directF1 = users.filter(u => u.parentId === user.id);
      
      const realBalances = { ...user.balances };
      realBalances.VND += commissionEarnedVND;

      return {
        ...user,
        realBalances,
        totalEarnedVND: commissionEarnedVND,
        f1Count: directF1.length,
        commissionDetails: userCommissions
      };
    });
  }, [users, commissions]);

  const chartData = userStats
    .filter(u => u.totalEarnedVND > 0 && u.id !== 'u1')
    .map(u => ({
      name: u.name,
      'Hoa hồng (VNĐ)': u.totalEarnedVND
    }));

  const viewingUserStat = userStats.find(u => u.id === viewingUserId);

  // --- HELPER: UPDATE BALANCE ---
  const updateUserBalance = (userId, currency, amount) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          balances: { ...u.balances, [currency]: u.balances[currency] + amount }
        };
      }
      return u;
    }));
  };

  // --- CORE WEB3: GỬI GIAO DỊCH KHÔNG TỐN PHÍ (GASLESS) ---
  const executeGaslessTask = async (userId, functionName, args) => {
    try {
      showToast("Đang xử lý Web3", "Đang đóng gói giao dịch và xin cấp phí Gas...", "success");

      const mockPrivateKey = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"; 
      
      const owner = privateKeyToAccount(mockPrivateKey);
      const smartAccount = await toSimpleSmartAccount({
        client: publicClient,
        owner: owner,
        factoryAddress: "0x9406Cc6185a346906296ED927B7f54229C8f08bd",
        entryPoint: {
          address: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
          version: "0.6"
        }
      });

      const smartAccountClient = createSmartAccountClient({
        account: smartAccount,
        chain: bscTestnet,
        bundlerTransport: http(BUNDLER_URL),
        middleware: {
          sponsorUserOperation: async ({ userOperation }) => ({
            ...userOperation,
            paymasterAndData: PAYMASTER_ADDRESS
          })
        }
      });

      const callData = encodeFunctionData({
        abi: [{ type: "function", name: functionName, inputs: [{ type: "uint256" }] }],
        functionName: functionName,
        args: args,
      });

      const txHash = await smartAccountClient.sendTransaction({
        to: AFFILIATE_CONTRACT,
        data: callData,
        value: 0n,
      });

      showToast("Thành công Web3!", `TxHash: ${txHash.substring(0, 15)}...`, "success");
      return txHash;

    } catch (error) {
      console.error("Web3 Error:", error);
      showToast("Lỗi Web3", error.message || "Giao dịch thất bại", "error");
      return null;
    }
  };

  // --- TASK HANDLERS ---
  const handleStartAd = () => {
    setIsWatchingAd(true);
    setAdTimer(15); 
  };

  const handleAdSuccess = async () => {
    setIsWatchingAd(false);
    
    const txHash = await executeGaslessTask(viewingUserId, "rewardTask", [5000n]);
    
    if (txHash) {
      updateUserBalance(viewingUserId, 'VND', 5000);
      updateUserBalance(viewingUserId, 'PI', 0.1);
      
      setAdCooldowns(prev => ({ ...prev, [viewingUserId]: Date.now() + 14400 * 1000 }));
      
      const newTx = {
        id: txHash, 
        userId: viewingUserId,
        amount: 5000,
        date: new Date().toISOString().split('T')[0],
        note: 'Xem Quảng Cáo AdSense (On-chain Web3)',
        type: 'TASK_AD'
      };
      setTransactions(prev => [...prev, newTx]);
    }
  };

  const handleAnswerQuiz = () => {
    if (selectedAnswer === null) return;
    const currentQuiz = QUIZ_QUESTIONS[currentQuizIndex];
    
    if (selectedAnswer === currentQuiz.correct) {
      Object.entries(currentQuiz.reward).forEach(([currency, amount]) => {
        updateUserBalance(viewingUserId, currency, amount);
      });
      setQuizCompleted(prev => ({ ...prev, [viewingUserId]: true }));
      
      const newTx = {
        id: `t_qz_${Date.now()}`,
        userId: viewingUserId,
        amount: 10000, 
        date: new Date().toISOString().split('T')[0],
        note: 'Hoàn thành khóa học y khoa',
        type: 'TASK_QUIZ'
      };
      setTransactions(prev => [...prev, newTx]);
      
      showToast("Chính xác!", `Bạn nhận được +${currentQuiz.reward.VIET} VIET.`, "success");
    } else {
      showToast("Chưa đúng", "Sai rồi, hãy đọc kỹ lại kiến thức và chọn lại nhé!", "error");
    }
    setSelectedAnswer(null);
  };

  // --- ADMIN HANDLERS ---
  const handleUpdateRate = (level, newRate) => {
    const rate = parseFloat(newRate) || 0;
    setPolicy(policy.map(p => p.level === level ? { ...p, rate } : p));
  };

  const handleAddLevel = () => {
    const nextLevel = policy.length > 0 ? Math.max(...policy.map(p => p.level)) + 1 : 1;
    setPolicy([...policy, { level: nextLevel, rate: 0 }]);
  };

  const handleRemoveLevel = (level) => {
    setPolicy(policy.filter(p => p.level !== level).map((p, index) => ({...p, level: index + 1})));
  };

  const handleSimulatePurchase = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userId = formData.get('userId');
    const amount = parseFloat(formData.get('amount'));
    
    if (userId && amount) {
      const newTx = {
        id: `t${Date.now()}`,
        userId,
        amount,
        date: new Date().toISOString().split('T')[0],
        note: 'Giao dịch quyên góp quỹ',
        type: 'PURCHASE'
      };
      setTransactions([...transactions, newTx]);
      e.currentTarget.reset();
      showToast("Thành công", `Đã giả lập nạp ${amount.toLocaleString()} VNĐ cho ${users.find(u=>u.id===userId).name}`, "success");
    }
  };

  // --- AI HANDLERS ---
  const handleAnalyzeSystem = async () => {
    setIsAnalyzing(true);
    setAiAnalysis('');
    try {
      const prompt = `Hệ thống "Hiến Máu Nhân Văn" có chính sách thưởng MLM: ${JSON.stringify(policy)}. 
      Tổng ${users.length} thành viên. Tổng ngân sách đã chia: ${transactions.reduce((sum, t) => sum + t.amount, 0)} VNĐ.
      Đóng vai chuyên gia, hãy cho 3 nhận xét và 1 lời khuyên ngắn gọn để lan tỏa chiến dịch này. Trình bày dạng text cơ bản.`;
      
      const result = await callGeminiAPI(prompt);
      setAiAnalysis(result);
    } catch (error) {
      showToast("Lỗi AI", "Không thể kết nối máy chủ Gemini", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateMarketingCopy = async (user) => {
    setIsGeneratingCopy(prev => ({ ...prev, [user.id]: true }));
    try {
      const prompt = `Viết 1 đoạn đăng MXH Facebook ngắn (dưới 40 từ) cho "${user.name}" khoe vừa làm nhiệm vụ trên app "Hiến Máu Nhân Văn" và kiếm được hoa hồng. Kêu gọi bạn bè tham gia qua link giới thiệu. Dùng nhiều emoji.`;
      const result = await callGeminiAPI(prompt);
      setMarketingCopy(prev => ({ ...prev, [user.id]: result }));
    } catch (error) {
      showToast("Lỗi AI", "Không thể tạo nội dung", "error");
    } finally {
      setIsGeneratingCopy(prev => ({ ...prev, [user.id]: false }));
    }
  };

  // --- RENDER HELPERS ---
  const getCooldownDisplay = () => {
    const cd = adCooldowns[viewingUserId];
    if (!cd || cd < currentTime) return null;
    const diff = Math.floor((cd - currentTime) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const cooldownStr = getCooldownDisplay();

  const handleCopyLink = () => {
    showToast("Thành công", "Đã sao chép liên kết giới thiệu vào bộ nhớ tạm.", "success");
  };

  // --- UI COMPONENTS ---
  return (
    <div className="min-h-screen font-sans bg-[#0a0a0a] text-slate-200">
      
      {/* Header */}
      <header className="border-b px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm sticky top-0 z-50 gap-4 bg-[#141414] border-[#262626]">
        <div className="flex items-center gap-2">
          <HeartHandshake className="text-red-500 h-8 w-8" />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Hiến Máu Nhân Văn <span className="text-sm font-normal text-slate-500 ml-2">Affiliate Engine Web3</span>
          </h1>
        </div>
        <nav className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <button 
            onClick={() => setActiveTab('user')}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'user' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-[#262626] text-slate-300 hover:bg-[#333]'}`}
          >
            <Wallet className="w-4 h-4" /> Cổng Đại Lý
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'admin' ? 'bg-red-500 text-white shadow-md' : 'bg-[#262626] text-slate-300 hover:bg-[#333]'}`}
          >
            <Settings className="w-4 h-4" /> Quản Trị Hệ Thống
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'stats' ? 'bg-red-500 text-white shadow-md' : 'bg-[#262626] text-slate-300 hover:bg-[#333]'}`}
          >
            <TrendingUp className="w-4 h-4" /> Thống Kê & AI
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* ==========================================
            TAB 1: CỔNG THÀNH VIÊN (USER PORTAL)
            ========================================== */}
        {activeTab === 'user' && viewingUserStat && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Multi-currency Wallet Header */}
            <div className="bg-[#141414] border border-[#262626] p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                  <UserCircle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Đóng vai đại lý</div>
                  <select 
                    value={viewingUserId}
                    onChange={(e) => setViewingUserId(e.target.value)}
                    className="bg-transparent text-lg font-bold text-white focus:outline-none cursor-pointer appearance-none"
                  >
                    {users.filter(u => u.id !== 'u1').map(u => (
                      <option key={`view_${u.id}`} value={u.id} className="bg-slate-800 text-white">{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Wallet Balances */}
              <div className="flex flex-wrap gap-3 justify-end w-full md:w-auto">
                <div className="bg-[#0a0a0a] border border-[#333] px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="text-red-400 font-bold text-xs">VNĐ</span>
                  <span className="text-white font-mono">{viewingUserStat.realBalances.VND.toLocaleString()}</span>
                </div>
                <div className="bg-[#0a0a0a] border border-[#333] px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="text-yellow-400 font-bold text-xs">VIET</span>
                  <span className="text-white font-mono">{viewingUserStat.realBalances.VIET.toLocaleString()}</span>
                </div>
                <div className="bg-[#0a0a0a] border border-[#333] px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="text-purple-400 font-bold text-xs">PI</span>
                  <span className="text-white font-mono">{viewingUserStat.realBalances.PI.toFixed(2)}</span>
                </div>
                <div className="bg-[#0a0a0a] border border-[#333] px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-xs">USDT</span>
                  <span className="text-white font-mono">{viewingUserStat.realBalances.USDT.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* TASKS (Earn) */}
              <div className="space-y-6">
                
                {/* Task 1: AdSense Simulation */}
                <div className="bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] border border-[#262626] rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <PlayCircle className="w-6 h-6 text-emerald-400" /> Xem Quảng Cáo Web3
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">Nhiệm vụ lặp lại mỗi 4 giờ. Giúp duy trì quỹ nhân văn.</p>
                    </div>
                    <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-md text-emerald-400 text-xs font-bold shadow-sm">
                      + 5,000 VNĐ & 0.1 PI
                    </div>
                  </div>

                  <div className="mt-6 relative z-10">
                    {cooldownStr ? (
                      <button disabled className="w-full bg-[#222] text-slate-500 font-bold py-3 rounded-xl border border-[#333] flex justify-center items-center gap-2 cursor-not-allowed">
                        <Clock className="w-5 h-5" /> Trở lại sau {cooldownStr}
                      </button>
                    ) : isWatchingAd ? (
                      <div className="w-full bg-[#111] border border-emerald-500/50 rounded-xl p-4 text-center">
                        <div className="text-emerald-400 text-2xl font-mono font-bold mb-2">00:{adTimer.toString().padStart(2, '0')}</div>
                        <p className="text-xs text-slate-400 animate-pulse mb-4">Đang phát quảng cáo... vui lòng không đóng cửa sổ.</p>
                        
                        <div className="w-full h-[90px] bg-[#0a0a0a] border border-dashed border-[#333] flex items-center justify-center relative overflow-hidden rounded-lg">
                           <span className="text-slate-600 text-xs z-10 absolute pointer-events-none">Ads Container (Insert Google script here)</span>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={handleStartAd}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.2)] flex justify-center items-center gap-2"
                      >
                        <PlayCircle className="w-5 h-5" /> Bắt đầu xem (15s)
                      </button>
                    )}
                  </div>
                </div>

                {/* Task 2: Quiz (Học Tập) */}
                <div className="bg-gradient-to-br from-[#1c1c1c] to-[#0a0a0a] border border-[#262626] rounded-2xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <GraduationCap className="w-6 h-6 text-blue-400" /> Khóa Học Y Khoa
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">Trả lời câu hỏi kiến thức để nhận thưởng ngay.</p>
                    </div>
                    {quizCompleted[viewingUserId] ? (
                      <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Đã hoàn thành
                      </div>
                    ) : (
                      <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-md text-blue-400 text-xs font-bold shadow-sm">
                        + {QUIZ_QUESTIONS[currentQuizIndex].reward.VIET.toLocaleString()} VIET
                      </div>
                    )}
                  </div>

                  <div className="mt-4 relative z-10">
                    {quizCompleted[viewingUserId] ? (
                      <div className="bg-[#111] p-6 rounded-xl border border-[#333] text-center">
                        <div className="text-4xl mb-3">🎉</div>
                        <h4 className="text-white font-bold mb-1">Tuyệt vời - Kiến thức là tài sản lớn nhất.</h4>
                        <p className="text-sm text-slate-400">Bạn đã nhận thưởng. Hãy quay lại vào ngày mai!</p>
                      </div>
                    ) : (
                      <div className="bg-[#161616] border border-[#262626] rounded-xl p-5">
                        <h4 className="text-white font-medium mb-4 leading-relaxed">{QUIZ_QUESTIONS[currentQuizIndex].question}</h4>
                        <div className="space-y-2">
                          {QUIZ_QUESTIONS[currentQuizIndex].options.map((opt, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedAnswer(idx)}
                              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${selectedAnswer === idx ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-[#111] border-[#333] text-slate-300 hover:border-[#555]'}`}
                            >
                              <span className="inline-block w-6 h-6 rounded-full bg-[#222] text-center leading-6 mr-3 text-xs border border-[#444]">{['A', 'B', 'C', 'D'][idx]}</span>
                              {opt}
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={handleAnswerQuiz}
                          disabled={selectedAnswer === null}
                          className="w-full mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-[#333] disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition shadow-sm"
                        >
                          Trả lời & Nhận thưởng
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AFFILIATE NETWORK (Right Column) */}
              <div className="space-y-6">
                
                {/* Invite Box */}
                <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                    <Network className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Xây Dựng Mạng Lưới Lan Tỏa</h3>
                  <p className="text-sm text-slate-400 mb-6 px-4">
                    Nhận ngay hoa hồng lên đến {policy.reduce((a,b)=>a+b.rate,0)}% (đa tầng) mỗi khi tuyến dưới của bạn xem quảng cáo, học tập hoặc đóng góp quỹ.
                  </p>
                  
                  <div className="bg-[#0a0a0a] p-2 rounded-xl flex items-center border border-[#333]">
                    <div className="flex-1 overflow-hidden">
                      <input 
                        type="text" 
                        readOnly 
                        value={`https://hien-mau-nhan-van.vercel.app/r/${viewingUserStat.id}`}
                        className="w-full bg-transparent text-slate-300 text-sm px-3 outline-none"
                      />
                    </div>
                    <button 
                      onClick={handleCopyLink}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" /> Copy
                    </button>
                  </div>
                  
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#262626]">
                      <div className="text-xs text-slate-400 mb-1">Thành viên F1</div>
                      <div className="text-2xl font-bold text-white">{viewingUserStat.f1Count}</div>
                    </div>
                    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-[#262626]">
                      <div className="text-xs text-slate-400 mb-1">Tổng hoa hồng (VNĐ)</div>
                      <div className="text-2xl font-bold text-emerald-400">{viewingUserStat.totalEarnedVND.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Affiliate History Table */}
                <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-red-400" /> Dòng Tiền Thụ Động
                    </h3>
                  </div>
                  <div className="flex-1 max-h-[300px] overflow-y-auto bg-[#0a0a0a]">
                    <div className="space-y-1 p-2">
                      {viewingUserStat.commissionDetails.slice().reverse().map(c => (
                        <div key={c.id} className="p-3 bg-[#141414] hover:bg-[#1a1a1a] border border-[#222] hover:border-[#333] rounded-xl transition flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200">{c.buyerName}</span>
                              <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-500/20">F{c.level}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{c.note}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-400 font-bold text-sm">+{c.amount.toLocaleString()} đ</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Tỷ lệ chiết khấu: {c.rate}%</div>
                          </div>
                        </div>
                      ))}
                      {viewingUserStat.commissionDetails.length === 0 && (
                        <div className="text-center p-8 text-slate-500 text-sm">
                          Chưa có hoa hồng phát sinh từ hệ thống tuyến dưới.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: QUẢN TRỊ ADMIN (DARK MODE)
            ========================================== */}
        {activeTab === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
            <div className="bg-[#141414] p-6 rounded-2xl border border-[#262626]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Target className="w-5 h-5 text-red-500" /> Cấu Hình Hoa Hồng Đa Tầng
                </h2>
                <button 
                  onClick={handleAddLevel}
                  className="flex items-center gap-1 text-sm bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition font-medium"
                >
                  <Plus className="w-4 h-4" /> Thêm Tầng
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {policy.map((levelPolicy) => (
                  <div key={levelPolicy.level} className="flex items-center justify-between bg-[#0a0a0a] p-3 rounded-xl border border-[#333] hover:border-red-500/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="font-bold text-red-400 bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#333]">
                        Tầng F{levelPolicy.level}
                      </span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" min="0" max="100" step="0.1"
                          value={levelPolicy.rate}
                          onChange={(e) => handleUpdateRate(levelPolicy.level, e.target.value)}
                          className="w-20 px-2 py-1.5 border border-[#444] rounded-md focus:ring-1 focus:ring-red-500 outline-none text-center font-medium bg-[#141414] text-white"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveLevel(levelPolicy.level)} className="p-2 text-slate-500 hover:text-red-500 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-xl p-5 border border-[#333]">
                <h3 className="text-md font-bold text-white flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-red-500" /> Cố Vấn Chiến Lược (Gemini AI)
                </h3>
                <button 
                  onClick={handleAnalyzeSystem} disabled={isAnalyzing}
                  className="w-full bg-[#262626] hover:bg-[#333] border border-[#444] text-white px-4 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                  Kiểm Tra Sức Khỏe Hệ Thống
                </button>
                {aiAnalysis && (
                  <div className="mt-4 bg-[#0a0a0a] p-4 rounded-lg border border-[#333] text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {aiAnalysis}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#141414] p-6 rounded-2xl border border-[#262626]">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-white">
                <ShoppingCart className="w-5 h-5 text-red-500" /> Mô Phỏng Đóng Góp Quỹ
              </h2>
              <p className="text-sm text-slate-400 mb-4">Mô phỏng hành động nạp tiền/đóng góp để xem hệ thống chia % cho tuyến trên như thế nào.</p>
              <form onSubmit={handleSimulatePurchase} className="space-y-4 bg-[#0a0a0a] p-5 rounded-xl border border-[#333]">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Ai là người đóng góp?</label>
                  <select name="userId" required className="w-full px-4 py-2.5 bg-[#141414] text-white border border-[#444] rounded-lg focus:ring-1 focus:ring-red-500 outline-none appearance-none">
                    <option value="">-- Chọn thành viên --</option>
                    {users.map(u => (
                      <option key={`opt_${u.id}`} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1.5">Giá trị đóng góp (VNĐ)</label>
                  <input 
                    type="number" name="amount" required min="1000" step="1000" placeholder="VD: 500000"
                    className="w-full px-4 py-2.5 bg-[#141414] text-white border border-[#444] rounded-lg focus:ring-1 focus:ring-red-500 outline-none"
                  />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition shadow-[0_0_15px_rgba(239,68,68,0.2)] mt-2">
                  Tạo Giao Dịch Vào Hệ Thống
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: THỐNG KÊ TỔNG (DARK MODE)
            ========================================== */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
             <div className="lg:col-span-2 bg-[#141414] p-6 rounded-2xl border border-[#262626]">
                 <h2 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                   <BarChart className="w-5 h-5 text-red-500" /> Bảng Xếp Hạng Thu Nhập Leader
                 </h2>
                 <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333"/>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${(value/1000).toLocaleString()}k`} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip 
                        formatter={(value) => [`${value.toLocaleString()} VNĐ`, 'Thu nhập']} 
                        cursor={{fill: '#1a1a1a'}} 
                        contentStyle={{backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '8px', color: '#fff'}}
                      />
                      <Bar dataKey="Hoa hồng (VNĐ)" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-[#141414] rounded-2xl border border-[#262626] p-6 flex flex-col text-slate-200">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                  <MessageSquareText className="w-5 h-5 text-red-400" /> AI Content Generator
                </h2>
                <p className="text-sm text-slate-400 mb-4">Tạo bài PR tự động cho Top Earners đăng MXH.</p>
                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                  {userStats.filter(u => u.totalEarnedVND > 0 && u.id !== 'u1').slice(0, 3).map(user => (
                    <div key={`ai_marketing_${user.id}`} className="p-4 border rounded-xl border-[#333] bg-[#0a0a0a]">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <div className="font-bold text-white">{user.name}</div>
                          <div className="text-xs text-emerald-400 font-mono mt-0.5">{user.totalEarnedVND.toLocaleString()} đ</div>
                        </div>
                        <button
                          onClick={() => handleGenerateMarketingCopy(user)} disabled={isGeneratingCopy[user.id]}
                          className="p-2 bg-[#222] hover:bg-[#333] border border-[#444] text-white rounded-lg transition disabled:opacity-50"
                        >
                          {isGeneratingCopy[user.id] ? <Loader2 className="w-4 h-4 animate-spin text-red-500" /> : <Sparkles className="w-4 h-4 text-red-400" />}
                        </button>
                      </div>
                      {marketingCopy[user.id] && (
                        <div className="p-3 bg-[#141414] border border-[#262626] rounded-lg text-sm text-slate-300 whitespace-pre-wrap">
                          {marketingCopy[user.id]}
                        </div>
                      )}
                    </div>
                  ))}
                  {userStats.filter(u => u.totalEarnedVND > 0 && u.id !== 'u1').length === 0 && (
                    <div className="text-center p-8 text-slate-600 text-sm border border-dashed border-[#333] rounded-xl mt-4">
                      Hệ thống chưa có người đạt doanh thu.
                    </div>
                  )}
                </div>
              </div>
          </div>
        )}

      </main>

      {/* --- CUSTOM TOAST COMPONENT (Thay thế Alert) --- */}
      <div className={`fixed bottom-6 right-6 bg-[#141414] border p-4 rounded-xl shadow-2xl transition-all duration-300 z-[100] flex items-start gap-3 max-w-sm pointer-events-none ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} ${toast.type === 'success' ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
        <div className="mt-1">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] rounded-full bg-[#141414]" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)] rounded-full bg-[#141414]" />
          )}
        </div>
        <div>
          <h4 className="text-white font-bold text-sm mb-1">{toast.title}</h4>
          <p className="text-slate-400 text-xs leading-relaxed">{toast.message}</p>
        </div>
      </div>

    </div>
  );
}
