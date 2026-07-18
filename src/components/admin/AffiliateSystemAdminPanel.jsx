import React from 'react';
import {
  Activity,
  Loader2,
  Plus,
  ShoppingCart,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';

export default function AffiliateSystemAdminPanel({
  aiAnalysis,
  handleAddLevel,
  handleAnalyzeSystem,
  handleRemoveLevel,
  handleSimulatePurchase,
  handleUpdateRate,
  isAnalyzing,
  policy,
  users,
}) {
  return (
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
  );
}
