import React from 'react';

const ExploreButton = ({ onClick, text = "Khám phá", className = "" }) => {
  return (
    <button 
      onClick={onClick}
      className={`relative group inline-flex items-center justify-center ${className}`}
    >
      {/* 1. Lớp ánh sáng phát quang (Glow Effect) phía sau nút */}
      {/* Khi hover (group-hover), lớp này sẽ sáng rực lên và rõ nét hơn */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-xl blur-md opacity-40 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse group-hover:animate-none"></div>

      {/* 2. Phần thân nút (Nằm đè lên lớp ánh sáng) */}
      <div className="relative px-8 py-4 bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-xl flex items-center gap-3 transition-all duration-300 group-hover:bg-slate-900 group-hover:scale-[0.98]">
        
        {/* Biểu tượng (Icon) */}
        <svg 
          className="w-5 h-5 text-cyan-400 group-hover:text-white transition-colors duration-300 group-hover:animate-bounce-x" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          ></path>
        </svg>

        {/* Chữ */}
        <span className="text-slate-200 font-semibold tracking-wide uppercase text-sm group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-blue-500 transition-all duration-300">
          {text}
        </span>
      </div>

      {/* 3. Hiệu ứng tia chớp/quét ngang (Tùy chọn - làm nút trông xịn hơn) */}
      <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-45deg] group-hover:animate-shine"></div>
      </div>
    </button>
  );
};

export default ExploreButton;