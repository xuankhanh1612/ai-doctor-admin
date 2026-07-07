import React, { useState } from 'react';
import { UserPlus, ShieldCheck, Mic, HeartHandshake, BookOpen, Lock, Leaf, Sparkles, Award, Star } from 'lucide-react';

// ============================================================================
// DonationHeroPanel — màn hình chào mừng cho tính năng "Anh Hùng Hiến Tặng"
// (hỗ trợ tìm hiểu & đăng ký hiến tặng gan). Dựng theo bản thiết kế tham
// khảo: avatar trợ lý ở giữa, 3 lối vào nhanh (Hiến tặng ngay / Nhấn để nói
// / Nâng cao kiến thức), và "Hành trình Siêu Anh Hùng" gồm 5 cấp độ để
// khuyến khích người dùng quay lại tìm hiểu dần từng bước.
//
// Đây là màn hình ĐỘC LẬP với theme sáng/tối chung của app (giống cách
// MedicalAssetStorePanel tự giữ bảng màu riêng) — chủ đề "hiến tặng gan"
// dùng tông kem/mint nhẹ nhàng, thân thiện, khác hẳn phần còn lại của app.
// ============================================================================

const JOURNEY_LEVELS = [
  { level: 1, title: 'Người Tìm Hiểu', icon: '🥷', ring: 'from-emerald-400 to-emerald-600', badge: 'bg-emerald-500' },
  { level: 2, title: 'Người Quan Tâm', icon: '💚', ring: 'from-emerald-300 to-emerald-500', badge: 'bg-emerald-400' },
  { level: 3, title: 'Người Có Kiến Thức', icon: '📖', ring: 'from-sky-300 to-sky-500', badge: 'bg-sky-500' },
  { level: 4, title: 'Người Sẵn Sàng', icon: '🌱', ring: 'from-violet-300 to-violet-500', badge: 'bg-violet-500' },
  { level: 5, title: 'Đại Sứ Hiến Tặng', icon: '🛡️', ring: 'from-amber-300 to-amber-500', badge: 'bg-amber-500' },
];

export default function DonationHeroPanel({ mode = 'guest', onEnterAction, onMicPress }) {
  const [currentLevel] = useState(1);
  const isGuest = mode === 'guest';
  // guest (chưa đăng nhập): bấm Tạo tài khoản / Hiến tặng ngay / Nâng cao
  // kiến thức đều dẫn sang trang Login (onEnterAction do App.jsx truyền
  // xuống). member (đã đăng nhập, vào từ menu Sidebar): ẩn nút Tạo tài
  // khoản vì đã có tài khoản rồi; 2 nút hành động tạm chưa có trang đích
  // riêng nên không gắn onClick (không cần đưa người đã đăng nhập quay lại
  // Login), chỉ nút mic vẫn hoạt động như nhau ở cả 2 chế độ.
  const handleEnterAction = isGuest ? onEnterAction : undefined;

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-[#f6faf7] to-[#eef7f1] text-[#16241c] px-5 py-8 md:px-10 md:py-10">
      <div className="max-w-2xl mx-auto">

        {/* Tạo tài khoản — chỉ hiện với khách chưa đăng nhập */}
        {isGuest && (
          <div className="flex justify-end mb-8">
            <div className="text-right">
              <button
                onClick={onEnterAction}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
              >
                <UserPlus size={16} />
                Tạo tài khoản
              </button>
              <p className="mt-2 text-xs text-gray-500 leading-snug max-w-[190px] ml-auto">
                Để lưu hành trình học tập<br />và nâng cấp siêu anh hùng
              </p>
            </div>
          </div>
        )}

        {/* Avatar trợ lý */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-40 h-40 mb-6">
            <Sparkles className="absolute -top-2 -left-6 text-emerald-400" size={22} />
            <Sparkles className="absolute -bottom-1 -right-5 text-emerald-400" size={16} />
            <div className="absolute inset-0 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.9),0_0_28px_rgba(16,185,129,0.35)]" />
            <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-slate-800 via-indigo-700 to-slate-900 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-40" style={{
                backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,180,80,0.5), transparent 55%), radial-gradient(circle at 70% 70%, rgba(56,189,248,0.5), transparent 55%)'
              }} />
              <span className="text-5xl relative">🧑‍⚕️</span>
            </div>
          </div>

          <p className="text-lg text-gray-600">Xin chào! Tôi ở đây để</p>
          <h1 className="text-2xl md:text-[28px] font-extrabold leading-snug text-[#16241c] mb-5">
            hỗ trợ bạn về <span className="text-emerald-600">hiến tặng gan</span>.
          </h1>

          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-emerald-100 shadow-sm px-4 py-2 text-sm text-gray-600">
            <ShieldCheck size={16} className="text-emerald-600" />
            Bạn đang là <span className="font-bold text-emerald-700">siêu anh hùng cấp độ {currentLevel}</span> 💚
          </div>
        </div>

        {/* 3 lối vào nhanh: trái = Hiến tặng ngay, giữa = mic, phải = Nâng cao kiến thức */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 items-stretch">
          <button
            onClick={handleEnterAction}
            className="group text-left rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <HeartHandshake className="text-emerald-600" size={26} />
            </div>
            <div className="font-bold text-emerald-700">Hiến tặng ngay</div>
            <div className="text-sm text-gray-500 mt-1">Tôi muốn đăng ký hiến tặng gan</div>
          </button>

          {/* Mic: nói chuyện ngay với Global Chatbot (mở widget chat chung ở
          góc màn hình + tự bật ghi âm) — lịch sử hội thoại tự đồng bộ với
          menu "Lịch sử Chat với AI" vì cả 2 dùng chung 1 kho lưu trữ
          (globalChatbotStorage.js), không cần xử lý gì thêm ở đây. */}
          <button
            onClick={onMicPress}
            className="flex flex-col items-center justify-center gap-3 py-4"
          >
            <span className="relative w-24 h-24 rounded-full border-2 border-emerald-500 bg-white flex items-center justify-center hover:bg-emerald-50 transition-colors">
              <Mic className="text-emerald-600" size={30} />
            </span>
            <span className="font-bold text-[#16241c]">Nhấn để nói</span>
          </button>

          <button
            onClick={handleEnterAction}
            className="group text-left rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <BookOpen className="text-sky-600" size={26} />
            </div>
            <div className="font-bold text-sky-700">Nâng cao kiến thức</div>
            <div className="text-sm text-gray-500 mt-1">Tôi muốn tìm hiểu về hiến tặng gan</div>
          </button>
        </div>

        {/* Hành trình siêu anh hùng */}
        <div className="mt-14">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="h-px w-8 bg-gray-300" />
            <h2 className="text-xs font-bold tracking-[0.15em] text-gray-500 uppercase">Hành trình Siêu Anh Hùng</h2>
            <span className="h-px w-8 bg-gray-300" />
          </div>

          <div className="flex flex-wrap justify-center gap-x-2 gap-y-8 sm:gap-x-4">
            {JOURNEY_LEVELS.map((lvl) => {
              const unlocked = lvl.level <= currentLevel;
              const isCurrent = lvl.level === currentLevel;
              return (
                <div key={lvl.level} className="flex flex-col items-center w-[150px] text-center">
                  <div className="relative mb-3">
                    <div
                      className={`w-16 h-16 flex items-center justify-center text-2xl bg-gradient-to-br ${unlocked ? lvl.ring : 'from-gray-200 to-gray-300'} shadow-sm`}
                      style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }}
                    >
                      <span className={unlocked ? '' : 'opacity-40 grayscale'}>{lvl.icon}</span>
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-[11px] font-bold text-white flex items-center justify-center border-2 border-white ${unlocked ? lvl.badge : 'bg-gray-400'}`}>
                      {lvl.level}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-[#16241c]">Cấp {lvl.level}</div>
                  <div className="text-xs text-gray-500 mb-2">{lvl.title}</div>
                  {isCurrent ? (
                    <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      Đang ở đây
                    </span>
                  ) : unlocked ? (
                    <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 inline-flex items-center gap-1">
                      <Star size={11} /> Đã mở khoá
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                      Chưa mở khoá <Lock size={11} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ghi chú quyền riêng tư */}
        <div className="mt-12 flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white/70 px-5 py-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Lock className="text-emerald-600" size={18} />
          </div>
          <p className="text-sm text-gray-600 leading-snug">
            Mọi dữ liệu bạn cung cấp đều nằm ở máy của bạn, không bao giờ lưu vào server của chúng tôi.{' '}
            <span className="font-bold text-[#16241c]">Quyền là của bạn.</span>
          </p>
          <Leaf className="text-emerald-500 ml-auto flex-shrink-0 hidden sm:block" size={22} />
        </div>

        <div className="flex items-center gap-1.5 justify-center mt-6 text-[11px] text-gray-400">
          <Award size={12} />
          Anh Hùng Hiến Tặng · Cùng nhau lan toả sự sống
        </div>
      </div>
    </div>
  );
}
