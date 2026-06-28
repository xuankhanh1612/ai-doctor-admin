import {
  dateKey,
  daysInMonth,
  getDay,
  saveDay,
  getAllWaterHistory,
  getMessagesForDay,
} from '../lib/beMeoChatStorage.js'

/**
 * beMeoWidget.js
 * Toàn bộ widget "Bé Mèo Nước" dưới dạng ES module thuần.
 * Trước đây nằm trong waterdrink_tracker.html (được import ?raw rồi inject vào Shadow DOM).
 * Giờ được export trực tiếp → WaterDrinkChatBotPanel.jsx gọi mountBeMeoWidget() và nhận
 * cleanup function trả về ngay lập tức — không còn cần window.__beMeoNuocPendingCleanup__ nữa.
 *
 * @param {ShadowRoot} shadow  Shadow root đã được tạo bởi React (host.attachShadow)
 * @param {object}     urls    Object chứa các URL ảnh đã được Vite resolve
 * @param {string|null} userKey  uuid của user hiện tại — field nhận diện thống nhất cho mọi
 *                                loại user (guest hay đã đăng nhập), dùng làm khóa lưu trữ IndexedDB.
 *                                null/undefined = khách chưa có session (nhóm chung vào 'guest').
 * @returns {Function}         cleanup() — gọi khi component unmount
 */
export function mountBeMeoWidget(shadow, {
  meoNhayMatUrl,
  meoBuAiUrl,
  meoNuocAiUrl,
  robotTuThe1Url,
  robotTuThe2Url,
}, userKey = null) {
  // ─── CSS ────────────────────────────────────────────────────────────────────
  const CSS = `
    :host {
      --water: #0ea5e9;
      --aqua: #14b8a6;
      --mint: #ccfbf1;
      --ink: #0f172a;
      --muted: #64748b;
      --card: rgba(255, 255, 255, 0.84);
      --line: rgba(14, 165, 233, 0.2);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 12% 10%, rgba(125, 211, 252, 0.65), transparent 30%),
        radial-gradient(circle at 86% 4%, rgba(153, 246, 228, 0.58), transparent 32%),
        linear-gradient(135deg, #effcff 0%, #ecfeff 48%, #f8fafc 100%);
    }
    * { box-sizing: border-box; }
    .shell { max-width: 1160px; margin: 0 auto; padding: 28px clamp(16px, 3vw, 32px) 36px; }
    .tabs {
      position: sticky; top: 0; z-index: 5;
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px; margin-bottom: 18px; padding: 10px;
      border: 1px solid rgba(255,255,255,0.76); border-radius: 999px;
      background: rgba(240,249,255,0.86);
      box-shadow: 0 18px 45px rgba(14,165,233,0.13);
      backdrop-filter: blur(18px);
    }
    .tab-btn {
      border: none; border-radius: 999px; padding: 13px 16px;
      background: transparent; color: #64748b; font-weight: 950; cursor: pointer;
      transition: transform .16s ease, box-shadow .16s ease, background .16s ease, color .16s ease;
    }
    .tab-btn:hover { transform: translateY(-2px); }
    .tab-btn.active { color:#fff; background:linear-gradient(135deg,var(--water),var(--aqua)); box-shadow:0 16px 32px rgba(14,165,233,.28); }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; animation: fadeIn .24s ease; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .hero { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr); gap:18px; align-items:stretch; }
    .card { background:var(--card); border:1px solid rgba(255,255,255,.76); border-radius:30px; box-shadow:0 24px 70px rgba(14,165,233,.16); backdrop-filter:blur(18px); }
    .intro { position:relative; overflow:hidden; padding:clamp(24px,4vw,42px); }
    .intro::after { content:""; position:absolute; width:240px; height:240px; right:-70px; bottom:-90px; border-radius:50%; background:rgba(14,165,233,.12); }
    .badge { display:inline-flex; align-items:center; gap:8px; border-radius:999px; background:rgba(14,165,233,.12); color:#0369a1; padding:8px 12px; font-size:12px; font-weight:900; letter-spacing:.05em; text-transform:uppercase; }
    h1,h2,h3 { letter-spacing:-.045em; }
    h1 { margin:18px 0 10px; font-size:clamp(34px,6vw,68px); line-height:.92; letter-spacing:-.07em; }
    h2 { margin:0; font-size:28px; }
    h3 { margin:0 0 10px; font-size:21px; }
    .gradient-text { background:linear-gradient(135deg,var(--water),var(--aqua)); -webkit-background-clip:text; background-clip:text; color:transparent; }
    .lead { margin:0; color:var(--muted); line-height:1.7; max-width:680px; font-size:16px; }
    .cat-gallery { position:relative; z-index:1; display:grid; grid-template-columns:1.25fr .75fr; gap:10px; margin-top:22px; max-width:560px; }
    .cat-photo { width:100%; min-height:142px; object-fit:cover; border-radius:26px; border:5px solid rgba(255,255,255,.76); box-shadow:0 18px 36px rgba(14,165,233,.2); background:#e0f2fe; }
    .cat-photo.tall { height:100%; }
    .cat-stack { display:grid; gap:10px; }
    .tracker { padding:24px; display:flex; flex-direction:column; gap:18px; }
    .stats,.actions,.learning-grid,.quiz-layout { display:grid; gap:10px; }
    .stats { grid-template-columns:repeat(3,1fr); }
    .actions { grid-template-columns:repeat(4,1fr); }
    .stat,.mini-card,.answer,.tip-card { border-radius:20px; border:1px solid var(--line); background:rgba(255,255,255,.66); padding:14px; }
    .stat strong { display:block; font-size:22px; color:#0369a1; }
    .stat span { color:var(--muted); font-size:12px; font-weight:800; }
    .bottle { width:150px; height:330px; margin:0 auto; border:5px solid rgba(3,105,161,.28); border-radius:42px 42px 30px 30px; position:relative; overflow:hidden; background:rgba(255,255,255,.56); }
    .bottle::before { content:""; position:absolute; top:-5px; left:44px; width:54px; height:18px; border-radius:10px 10px 4px 4px; background:rgba(3,105,161,.2); }
    .water-fill { position:absolute; left:0; right:0; bottom:0; height:0%; background:linear-gradient(180deg,rgba(125,211,252,.8),rgba(14,165,233,.95)); transition:height .55s ease; }
    .water-fill::before { content:""; position:absolute; top:-14px; left:-10%; width:120%; height:28px; border-radius:50%; background:rgba(255,255,255,.46); animation:wave 2.8s ease-in-out infinite; }
    @keyframes wave { 0%,100%{transform:translateX(-8px)} 50%{transform:translateX(8px)} }
    button { border:none; border-radius:999px; padding:12px 14px; font-weight:900; cursor:pointer; transition:transform .16s ease,box-shadow .16s ease,opacity .16s ease; }
    button:hover { transform:translateY(-2px); }
    .primary { background:linear-gradient(135deg,var(--water),var(--aqua)); color:#fff; box-shadow:0 16px 32px rgba(14,165,233,.28); }
    .ghost { background:rgba(14,165,233,.1); color:#0369a1; }
    .chat-card,.learning-card,.quiz-card { margin-top:18px; padding:18px; }
    .chat-header,.section-header,.quiz-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; }
    .chat-log { height:330px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding:14px; border-radius:24px; background:rgba(240,249,255,.72); border:1px solid var(--line); }
    .msg { max-width:min(78%,680px); padding:13px 16px; border-radius:20px; line-height:1.55; font-size:14px; white-space:pre-wrap; }
    .bot { background:#fff; border:1px solid rgba(14,165,233,.18); border-bottom-left-radius:6px; }
    .user { background:linear-gradient(135deg,var(--water),var(--aqua)); color:#fff; border-bottom-right-radius:6px; }
    .msg-wrap { display:flex; flex-direction:column; gap:3px; max-width:min(78%,680px); }
    .msg-wrap.user { align-self:flex-end; align-items:flex-end; }
    .msg-wrap.bot-wrap { align-self:flex-start; align-items:flex-start; }
    .msg-wrap .msg { max-width:100%; align-self:stretch; }
    .msg-time { font-size:10px; font-weight:700; color:rgba(3,105,161,.5); letter-spacing:.2px; padding:0 5px; }
    .msg-review-btn { display:inline-flex; align-items:center; gap:5px; margin:2px 5px 0; padding:5px 12px; border-radius:8px; border:none; cursor:pointer; font-size:11px; font-weight:800; font-family:inherit; background:linear-gradient(135deg,#0ea5e9,#0284c7); color:#fff; box-shadow:0 3px 10px rgba(14,165,233,.30); transition:opacity .15s; }
    .msg-review-btn:hover { opacity:.85; }
    .msg-review-btn.active { background:linear-gradient(135deg,#7c3aed,#6d28d9); }
    .composer { display:flex; gap:10px; margin-top:12px; }
    input { flex:1; border:1px solid var(--line); border-radius:999px; padding:14px 16px; outline:none; font-size:15px; background:rgba(255,255,255,.9); color:var(--ink); }
    .quick { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
    .quick button { padding:9px 12px; font-size:12px; }
    .learning-grid { grid-template-columns:minmax(280px,.92fr) minmax(320px,1.08fr); }
    .flashcard { min-height:275px; display:grid; place-items:center; text-align:center; border-radius:30px; padding:26px; color:#075985; background:linear-gradient(145deg,#f0f9ff,#ecfeff); border:1px solid rgba(14,165,233,.22); box-shadow:inset 0 -24px 52px rgba(14,165,233,.08); }
    .flashcard .emoji { font-size:48px; display:block; margin-bottom:10px; }
    .flashcard p { margin:8px 0 0; color:#475569; line-height:1.65; font-weight:650; }
    .flash-actions { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:12px; }
    .nutrient-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    .mini-card strong,.tip-card strong { color:#0369a1; display:block; margin-bottom:4px; }
    .mini-card p,.tip-card p { margin:0; color:var(--muted); line-height:1.55; font-size:14px; }
    .water-map { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-top:12px; }
    .water-map div { padding:12px 8px; border-radius:18px; background:#eff6ff; text-align:center; color:#0369a1; font-weight:950; font-size:12px; }
    .hydration-calendar { margin-top:-6px; padding:14px; border:1px solid var(--line); border-radius:24px; background:rgba(240,249,255,.72); }
    .calendar-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:10px; }
    .calendar-head strong { display:block; color:#0369a1; font-size:14px; }
    .calendar-head span { display:block; margin-top:3px; color:var(--muted); font-size:11px; font-weight:800; }
    .calendar-streak { border-radius:999px; padding:7px 10px; background:linear-gradient(135deg,var(--water),var(--aqua)); color:#fff; font-size:12px; font-weight:950; white-space:nowrap; }
    .calendar-nav { display:flex; align-items:center; gap:6px; margin-bottom:10px; }
    .calendar-nav select { border:1px solid var(--line); border-radius:12px; padding:7px 10px; font-size:12.5px; font-weight:850; color:#0369a1; background:rgba(255,255,255,.86); cursor:pointer; }
    .calendar-nav button { padding:7px 11px; font-size:13px; background:rgba(14,165,233,.12); color:#0369a1; }
    .calendar-nav .calendar-today-btn { background:rgba(14,165,233,.12); color:#0369a1; font-size:11px; padding:7px 10px; }
    .calendar-loading { text-align:center; padding:14px; color:#64748b; font-size:12px; font-weight:800; }
    .calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
    .calendar-day { min-height:46px; border:1px solid rgba(14,165,233,.16); border-radius:14px; background:rgba(255,255,255,.74); color:#0f172a; padding:6px 4px; text-align:center; font-weight:950; cursor:pointer; transition:transform .12s ease,box-shadow .12s ease,outline .12s ease; }
    .calendar-day:hover:not(.future) { transform:translateY(-2px); box-shadow:0 6px 16px rgba(14,165,233,.22); }
    .calendar-day small { display:block; margin-top:2px; color:#64748b; font-size:9px; font-weight:800; }
    .calendar-day.active { outline:3px solid rgba(14,165,233,.24); background:#ecfeff; }
    .calendar-day.selected { outline:3px solid #0ea5e9!important; box-shadow:0 0 0 6px rgba(14,165,233,.12),0 6px 20px rgba(14,165,233,.28)!important; transform:translateY(-2px) scale(1.06); z-index:2; position:relative; }
    .calendar-day.done { background:linear-gradient(135deg,rgba(14,165,233,.94),rgba(20,184,166,.94)); color:#fff; }
    .calendar-day.done small { color:rgba(255,255,255,.86); }
    .calendar-day.future { opacity:.48; cursor:default; }
    .day-filter-bar { display:flex; align-items:center; gap:10px; margin-top:12px; padding:10px 14px; border-radius:16px; background:linear-gradient(135deg,rgba(14,165,233,.10),rgba(20,184,166,.08)); border:1px solid rgba(14,165,233,.22); animation:fadeIn .2s ease; }
    .day-filter-bar .day-filter-label { flex:1; font-size:13px; font-weight:900; color:#0369a1; }
    .day-filter-bar .day-filter-water { font-size:13px; font-weight:900; color:#0284c7; background:rgba(14,165,233,.12); border-radius:999px; padding:4px 12px; }
    .day-filter-bar .day-filter-clear { border:none; border-radius:999px; padding:5px 12px; background:rgba(14,165,233,.14); color:#0369a1; font-size:11px; font-weight:900; cursor:pointer; transition:background .14s; }
    .day-filter-bar .day-filter-clear:hover { background:rgba(14,165,233,.28); }
    .chat-filter-notice { text-align:center; padding:8px 14px; border-radius:12px; background:linear-gradient(135deg,rgba(14,165,233,.10),rgba(20,184,166,.08)); border:1px dashed rgba(14,165,233,.30); font-size:12px; font-weight:800; color:#0369a1; margin-bottom:10px; }
    .infographic-section { margin-top:18px; padding-top:18px; border-top:1px solid rgba(14,165,233,.16); display:grid; gap:14px; }
    .infographic-title { margin:0; text-align:center; color:#059669; text-transform:uppercase; letter-spacing:.08em; font-size:13px; font-weight:950; }
    .info-card { background:rgba(255,255,255,.86); border:1px solid rgba(14,165,233,.14); border-top:5px solid #10b981; border-radius:22px; box-shadow:0 12px 30px rgba(14,165,233,.08); padding:16px; }
    .info-card h3 { margin:0 0 6px; font-size:16px; color:#0f172a; }
    .info-card p { margin:0 0 12px; color:var(--muted); line-height:1.6; font-size:14px; }
    .chart-box { position:relative; height:230px; border-radius:20px; background:linear-gradient(180deg,#ffffff,#f8fafc); border:1px solid rgba(148,163,184,.18); padding:10px; }
    .chart-box.small { height:190px; }
    .chart-box.tall { height:270px; }
    .chart-box canvas { width:100%; height:100%; display:block; }
    .info-note { margin-top:10px; padding:12px; border-radius:16px; background:#eff6ff; color:#1e40af; font-size:13px; line-height:1.5; }
    .food-notes,.iron-steps { display:grid; gap:8px; margin-top:10px; }
    .food-notes div,.iron-steps div { padding:11px 12px; border-radius:15px; font-size:13px; line-height:1.5; }
    .food-meat { background:#fffbeb; color:#92400e; }
    .food-plant { background:#ecfdf5; color:#065f46; }
    .food-dairy { background:#eff6ff; color:#1e40af; }
    .iron-red { background:#fff1f2; color:#991b1b; border-left:5px solid #f87171; }
    .iron-orange { background:#fff7ed; color:#9a3412; border-left:5px solid #fb923c; }
    .iron-blue { background:#eff6ff; color:#1e3a8a; border-left:5px solid #60a5fa; }
    .iron-green { background:#ecfdf5; color:#065f46; border-left:5px solid #34d399; }
    .study-image-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:14px; }
    .study-image-grid figure { margin:0; border-radius:22px; overflow:hidden; background:#fff; border:1px solid var(--line); }
    .study-image-grid img { width:100%; height:120px; object-fit:cover; display:block; }
    .study-image-grid figcaption { padding:9px 10px; color:#0369a1; font-size:12px; font-weight:850; }
    .quiz-layout { grid-template-columns:minmax(320px,.8fr) minmax(320px,1.2fr); }
    .quiz-mascot { width:100%; height:430px; object-fit:cover; border-radius:30px; border:6px solid rgba(255,255,255,.8); box-shadow:0 18px 38px rgba(14,165,233,.18); }
    .progress { height:12px; border-radius:999px; background:rgba(14,165,233,.12); overflow:hidden; margin:10px 0 18px; }
    .progress span { display:block; height:100%; width:0%; background:linear-gradient(135deg,var(--water),var(--aqua)); transition:width .22s ease; }
    .answers { display:grid; gap:10px; }
    .answer { width:100%; text-align:left; color:var(--ink); background:#fff; border:2px solid rgba(14,165,233,.16); border-radius:18px; }
    .answer.correct { border-color:#22c55e; background:#f0fdf4; color:#166534; }
    .answer.wrong { border-color:#fb7185; background:#fff1f2; color:#be123c; }
    .answer[disabled] { cursor:default; opacity:.95; }
    .explain { display:none; margin-top:14px; padding:14px; border-radius:20px; background:#f0f9ff; border:1px solid var(--line); color:#075985; line-height:1.6; font-weight:700; }
    .explain.show { display:block; }
    .result { display:none; text-align:center; padding:28px; border-radius:28px; background:rgba(240,253,250,.88); border:1px solid rgba(20,184,166,.24); }
    .result.show { display:block; }
    @media (max-width:880px) {
      .hero,.learning-grid,.quiz-layout { grid-template-columns:1fr; }
      .stats,.actions,.nutrient-list { grid-template-columns:repeat(2,1fr); }
      .study-image-grid { grid-template-columns:repeat(2,1fr); }
      .chart-box,.chart-box.small,.chart-box.tall { height:220px; }
      .msg { max-width:92%; }
      .tabs { border-radius:26px; grid-template-columns:1fr; }
      .quiz-mascot { height:280px; }
    }
  `;

  // ─── HTML ───────────────────────────────────────────────────────────────────
  const HTML = `
    <main class="shell">
      <nav class="tabs" aria-label="Bé Mèo Nước tabs">
        <button class="tab-btn active" data-tab="tracker">Nhật ký &amp; Chat</button>
        <button class="tab-btn" data-tab="study">Học tập ✨</button>
        <button class="tab-btn" data-tab="quiz">Đố vui 🧠</button>
      </nav>

      <section id="tab-tracker" class="tab-panel active">
        <section class="hero">
          <article class="card intro">
            <span class="badge">💧 Hydration companion</span>
            <h1>Bé Mèo Nước<br /><span class="gradient-text">nhắc bạn uống nước</span></h1>
            <p class="lead">Bé Mèo Nước là chatbot theo dõi uống nước thân thiện: ghi nhanh số ml, xem tiến độ trong ngày, nhận lời nhắc nhẹ nhàng và hỏi đáp về thói quen uống nước. Nội dung chỉ mang tính hỗ trợ sức khoẻ hằng ngày, không thay thế tư vấn y khoa.</p>
            <div class="cat-gallery" aria-label="Thư viện Bé Mèo Nước">
              <img class="cat-photo tall" src="${meoNuocAiUrl}" alt="Bé Mèo Nước AI" />
              <div class="cat-stack">
                <img class="cat-photo" src="${meoBuAiUrl}" alt="Bé Mèo Bù Nước AI" />
                <img class="cat-photo" src="${meoNhayMatUrl}" alt="Bé Mèo nháy mắt" />
              </div>
            </div>
          </article>
          <aside class="card tracker" aria-label="Water drink tracker">
            <div class="stats">
              <div class="stat"><strong id="totalMl">0</strong><span>ml hôm nay</span></div>
              <div class="stat"><strong id="goalMl">2000</strong><span>ml mục tiêu</span></div>
              <div class="stat"><strong id="percent">0%</strong><span>hoàn thành</span></div>
            </div>
            <div class="bottle"><div id="waterFill" class="water-fill"></div></div>
            <div class="actions">
              <button class="primary" data-add="150">+150 ml</button>
              <button class="primary" data-add="250">+250 ml</button>
              <button class="primary" data-add="350">+350 ml</button>
              <button class="primary" data-add="500">+500 ml</button>
            </div>
            <div class="actions">
              <button class="ghost" id="setGoal1800">Mục tiêu 1800</button>
              <button class="ghost" id="setGoal2000">Mục tiêu 2000</button>
              <button class="ghost" id="setGoal2500">Mục tiêu 2500</button>
              <button class="ghost" id="resetDay">Reset ngày</button>
            </div>
            <div class="hydration-calendar" aria-label="Calendar 31 ngày duy trì uống nước">
              <div class="calendar-head">
                <div>
                  <strong>📅 Lịch sử uống nước &amp; chat theo Tháng/Năm</strong>
                  <span id="calendarSummary">Theo dõi từng ngày trong tháng</span>
                </div>
                <div class="calendar-streak" id="calendarStreak">0/31</div>
              </div>
              <div class="calendar-nav">
                <button type="button" id="calendarPrevMonth" title="Tháng trước">‹</button>
                <select id="calendarMonthSelect" aria-label="Chọn tháng"></select>
                <select id="calendarYearSelect" aria-label="Chọn năm"></select>
                <button type="button" id="calendarNextMonth" title="Tháng sau">›</button>
                <button type="button" class="calendar-today-btn" id="calendarTodayBtn">Hôm nay</button>
              </div>
              <div class="calendar-grid" id="hydrationCalendar"></div>
              <div id="dayFilterBar" class="day-filter-bar" style="display:none;">
                <span class="day-filter-label" id="dayFilterLabel">📅 Đang xem ngày ...</span>
                <span class="day-filter-water" id="dayFilterWater">💧 0ml</span>
                <button class="day-filter-clear" id="dayFilterClear">✕ Xem tất cả</button>
              </div>
            </div>
          </aside>
        </section>

        <section class="card chat-card" aria-label="Bé Mèo Nước chatbot">
          <div class="chat-header">
            <div><span class="badge">🐾 Chat bot</span><h2>Bé Mèo Nước</h2></div>
            <button class="ghost" id="clearChat">Xoá chat</button>
          </div>
          <div class="chat-log" id="chatLog"></div>
          <div class="quick">
            <button class="ghost" data-prompt="Bé Mèo ơi hôm nay tôi nên uống bao nhiêu nước?">Nên uống bao nhiêu?</button>
            <button class="ghost" data-prompt="Nhắc tôi uống nước nhẹ nhàng nhé">Nhắc uống nước</button>
            <button class="ghost" data-prompt="Tôi vừa uống 250ml">Tôi vừa uống 250ml</button>
            <button class="ghost" data-prompt="Tôi bị quên uống nước thì làm sao?">Hay quên uống nước</button>
          </div>
          <form class="composer" id="chatForm">
            <input id="chatInput" autocomplete="off" placeholder="Nhắn với Bé Mèo Nước... ví dụ: Tôi vừa uống 300ml" />
            <button class="primary" type="submit">Gửi ↑</button>
          </form>
        </section>
      </section>

      <section id="tab-study" class="tab-panel">
        <section class="card learning-card">
          <div class="section-header">
            <div><span class="badge">✨ Học tập</span><h2>Vitamin, khoáng chất &amp; thói quen uống nước</h2></div>
            <button class="ghost" id="flipCard">Lật thẻ</button>
          </div>
          <div class="learning-grid">
            <article>
              <div class="flashcard" id="flashcard" aria-live="polite"></div>
              <div class="flash-actions">
                <button class="ghost" id="prevCard">← Thẻ trước</button>
                <strong id="cardCounter">1 / 25</strong>
                <button class="primary" id="nextCard">Thẻ sau →</button>
              </div>
            </article>
            <article>
              <div class="nutrient-list">
                <div class="mini-card"><strong>💧 Vitamin tan trong nước</strong><p>Nhóm B và C dễ đào thải, nên nạp đều qua bữa ăn, trái cây và đủ nước trong ngày.</p></div>
                <div class="mini-card"><strong>🥑 Vitamin tan trong dầu</strong><p>A, D, E, K hấp thu tốt hơn khi ăn cùng chất béo lành mạnh như bơ, dầu ô-liu, cá béo.</p></div>
                <div class="mini-card"><strong>🌊 Khoáng trong nước</strong><p>Canxi, magie, natri và kali hỗ trợ điện giải, cơ bắp, xương và nhịp tim.</p></div>
                <div class="mini-card"><strong>🩸 Hấp thu sắt</strong><p>Kết hợp thực phẩm giàu sắt với vitamin C như cam, chanh, ổi giúp tăng hấp thu sắt tốt hơn.</p></div>
              </div>
              <div class="water-map" aria-label="Bản đồ khoáng chất trong nước">
                <div>Canxi<br />xương</div><div>Magie<br />cơ</div><div>Natri<br />điện giải</div><div>Kali<br />tim</div><div>Nước<br />vận chuyển</div>
              </div>
              <div class="tip-card" style="margin-top:12px;"><strong>📊 Cẩm nang trực quan</strong><p>Tab Học tập có đủ 25 thẻ ghi nhớ và toàn bộ phần Cẩm Nang Dinh Dưỡng Trực Quan.</p></div>
            </article>
          </div>
          <div class="infographic-section" aria-label="Cẩm Nang Dinh Dưỡng Trực Quan">
            <h3 class="infographic-title">Cẩm Nang Dinh Dưỡng Trực Quan 📊</h3>
            <section class="info-card" style="border-top-color:#3b82f6;">
              <h3>💧 Phân Loại Vitamin Cốt Lõi</h3>
              <p>Vitamins được chia làm nhóm tan trong dầu (A, D, E, K) và nhóm tan trong nước (B, C).</p>
              <div class="chart-box"><canvas id="vitaminDonutChart" aria-label="Biểu đồ phân loại vitamin"></canvas></div>
              <div class="info-note">💡 <strong>Mẹo:</strong> Ăn kèm chất béo lành mạnh để hấp thụ tốt Vitamin A, D, E, K.</div>
            </section>
            <section class="info-card" style="border-top-color:#06b6d4;">
              <h3>🌊 Khoáng Chất Trong Nước</h3>
              <p>Hàm lượng điện giải và vi khoáng trung bình có trong 1 lít nước khoáng tự nhiên.</p>
              <div class="chart-box small"><canvas id="waterMineralsChart" aria-label="Biểu đồ khoáng chất trong nước"></canvas></div>
              <div class="info-note" style="background:#ecfeff;color:#155e75;">💡 <strong>Sự thật:</strong> Nước khoáng chứa Canxi, Magie, Kali hỗ trợ bù điện giải rất nhanh.</div>
            </section>
            <section class="info-card" style="border-top-color:#f59e0b;">
              <h3>🥗 Bản Đồ Khoáng Chất Theo Thực Phẩm</h3>
              <p>Sự phân bổ đa dạng của các khoáng chất thiết yếu trên 3 nhóm thực phẩm tiêu biểu.</p>
              <div class="chart-box tall"><canvas id="foodRadarChart" aria-label="Biểu đồ radar khoáng chất theo thực phẩm"></canvas></div>
              <div class="food-notes">
                <div class="food-meat">🥩 <strong>Thịt &amp; Hải sản:</strong> Giàu Sắt sinh học và Kẽm miễn dịch.</div>
                <div class="food-plant">🥦 <strong>Rau, hạt:</strong> Cung cấp dồi dào Magie thần kinh và Kali.</div>
                <div class="food-dairy">🥛 <strong>Sữa &amp; phô mai:</strong> Nguồn bổ sung Canxi cấu trúc tốt nhất.</div>
              </div>
            </section>
            <section class="info-card" style="border-top-color:#ef4444;">
              <h3>🩸 Hành Trình Chuyển Hóa Sắt</h3>
              <div class="iron-steps">
                <div class="iron-red"><strong>1. Nạp Vào:</strong> Sắt Heme từ động vật dễ hấp thu hơn sắt Non-Heme từ thực vật.</div>
                <div class="iron-orange"><strong>2. Xúc Tác:</strong> Vitamin C (cam, chanh) tăng hấp thu sắt gấp 3 lần.</div>
                <div class="iron-blue"><strong>3. Tổng Hợp:</strong> Sắt được chuyển đến tủy xương sản xuất Hemoglobin.</div>
                <div class="iron-green"><strong>4. Vận Chuyển:</strong> Hồng cầu mang oxy đi nuôi toàn bộ các tế bào.</div>
              </div>
            </section>
          </div>
          <div class="study-image-grid" aria-label="Tất cả hình Bé Mèo Nước">
            <figure><img src="${meoNuocAiUrl}" alt="Mèo nước AI" /><figcaption>Mèo nước AI nhắc uống nước.</figcaption></figure>
            <figure><img src="${meoBuAiUrl}" alt="Mèo bù nước AI" /><figcaption>Mèo bù nước cổ vũ đủ ml.</figcaption></figure>
            <figure><img src="${meoNhayMatUrl}" alt="Mèo nháy mắt" /><figcaption>Mèo nháy mắt tạo động lực.</figcaption></figure>
            <figure><img src="${robotTuThe1Url}" alt="Robot nhắc tư thế 1" /><figcaption>Robot nhắc học đúng tư thế.</figcaption></figure>
            <figure><img src="${robotTuThe2Url}" alt="Robot nhắc tư thế 2" /><figcaption>Robot đồng hành học tập.</figcaption></figure>
          </div>
        </section>
      </section>

      <section id="tab-quiz" class="tab-panel">
        <section class="card quiz-card">
          <div class="section-header">
            <div><span class="badge">🧠 Đố vui</span><h2>Thử tài Bé Mèo Nước</h2></div>
            <button class="ghost" id="restartQuiz">Chơi lại</button>
          </div>
          <div class="quiz-layout">
            <aside>
              <img class="quiz-mascot" src="${robotTuThe2Url}" alt="Robot học tập cùng Bé Mèo Nước" />
              <div class="tip-card" style="margin-top:12px;"><strong>💡 Cách chơi</strong><p>Chọn đáp án, đọc giải thích, rồi bấm câu tiếp theo.</p></div>
            </aside>
            <article>
              <div id="quizPlay">
                <div class="quiz-top">
                  <strong id="quizProgressText">Câu 1 / 25</strong>
                  <button class="ghost" id="showHint">💡 Gợi ý</button>
                </div>
                <div class="progress"><span id="quizProgressBar"></span></div>
                <h3 id="questionText"></h3>
                <div class="answers" id="answers"></div>
                <div class="explain" id="explainBox"></div>
                <div class="quick">
                  <button class="primary" id="nextQuestion" style="display:none;">Câu tiếp theo →</button>
                </div>
              </div>
              <div class="result" id="quizResult">
                <div style="font-size:54px;">🏆</div>
                <h2>Hoàn thành!</h2>
                <p id="scoreText" class="lead" style="margin:10px auto;"></p>
                <button class="primary" id="restartQuizResult">Chơi lại từ đầu</button>
              </div>
            </article>
          </div>
        </section>
      </section>
    </main>
  `;

  // ─── Inject CSS + HTML vào shadow root ──────────────────────────────────────
  shadow.innerHTML = `<style>${CSS}</style>${HTML}`;

  // ─── JS logic (chạy trực tiếp, không qua inject <script>) ──────────────────
  const root = shadow; // Thay thế document.currentScript.getRootNode()

  const SYNC_EVENT = 'be-meo-nuoc:water-added';
  const today = dateKey(); // giờ LOCAL, đúng lịch dương của máy người dùng (không lệch UTC)
  const defaultState = { date: today, total: 0, goal: 2000, history: {} };

  // Tháng/Năm đang hiển thị trên lưới calendar (mặc định = tháng/năm hiện tại).
  const todayDateObj = new Date(`${today}T00:00:00`);
  let viewYear = todayDateObj.getFullYear();
  let viewMonth = todayDateObj.getMonth(); // 0-indexed

  let state = { ...defaultState }; // sẽ được nạp lại ngay từ IndexedDB ở dưới (loadInitialState async)
  let messages = [{ role: 'bot', text: getDayGreeting(), time: new Date().toISOString() }];
  let storageReady = false; // true sau khi đã nạp xong dữ liệu thật từ IndexedDB lần đầu (tránh ghi đè rác)
  let activeCard = 0;
  let cardFlipped = false;
  let activeQuestion = 0;
  let quizScore = 0;
  let answered = false;
  let selectedDay = null; // 'YYYY-MM-DD' đang được chọn để xem lại (null = xem hôm nay/live)

  const flashcards = [
    { icon: '👁️', title: 'Vitamin A', back: 'Duy trì thị lực, tăng cường miễn dịch và bảo vệ da. Có trong cà rốt, gan, bí đỏ.' },
    { icon: '🍊', title: 'Vitamin C', back: 'Chống oxy hóa, tổng hợp collagen và làm lành vết thương. Có trong cam, ổi, ớt chuông.' },
    { icon: '☀️', title: 'Vitamin D', back: 'Hấp thụ canxi duy trì xương chắc khoẻ. Có trong cá hồi, trứng và ánh nắng mặt trời.' },
    { icon: '🥑', title: 'Vitamin E', back: 'Bảo vệ màng tế bào, tốt cho tim mạch. Có trong hạt hướng dương, bơ, dầu ô liu.' },
    { icon: '🥬', title: 'Vitamin K', back: 'Đóng vai trò quan trọng trong đông máu và xương. Có trong rau cải bó xôi, súp lơ xanh.' },
    { icon: '🌾', title: 'Vitamin B1 (Thiamine)', back: 'Chuyển hóa năng lượng và hỗ trợ thần kinh. Có trong ngũ cốc nguyên hạt, thịt lợn.' },
    { icon: '🤰', title: 'Vitamin B9 (Axit Folic)', back: 'Cần thiết cho phân chia tế bào, hình thành DNA. Rất quan trọng cho bà bầu.' },
    { icon: '🩸', title: 'Vitamin B12', back: 'Sản sinh hồng cầu và duy trì hệ thần kinh. Có trong thịt, cá, sữa.' },
    { icon: '🥛', title: 'Canxi (Calcium)', back: 'Cấu tạo xương, răng và hỗ trợ co cơ. Có trong sữa, tôm cua, phô mai.' },
    { icon: '🥩', title: 'Sắt (Iron)', back: 'Thành phần của hemoglobin vận chuyển oxy. Có trong thịt bò, gan, các loại đậu.' },
    { icon: '🦪', title: 'Kẽm (Zinc)', back: 'Hỗ trợ hệ miễn dịch và phát triển vị giác. Có trong hàu, hải sản, thịt đỏ.' },
    { icon: '🍫', title: 'Magie (Magnesium)', back: 'Ổn định thần kinh và cơ bắp. Có trong hạt điều, socola đen, rau xanh.' },
    { icon: '🍌', title: 'Kali (Potassium)', back: 'Điều hòa huyết áp và hoạt động của tim. Có trong chuối, nước dừa, khoai lang.' },
    { icon: '🌊', title: 'I-ốt (Iodine)', back: 'Cần thiết cho tuyến giáp và trí não. Có trong muối i-ốt, rong biển.' },
    { icon: '🥚', title: 'Vitamin B2 (Riboflavin)', back: 'Hỗ trợ sản xuất năng lượng và chức năng tế bào. Có trong trứng, sữa.' },
    { icon: '🐟', title: 'Vitamin B3 (Niacin)', back: 'Tốt cho tiêu hóa và làn da. Có trong ức gà, cá ngừ.' },
    { icon: '🍄', title: 'Vitamin B5', back: 'Giúp cơ thể phân giải chất béo. Có trong nấm, ngũ cốc.' },
    { icon: '🍗', title: 'Vitamin B6', back: 'Cần cho sự phát triển trí não. Có trong chuối, thịt gà.' },
    { icon: '💅', title: 'Vitamin B7 (Biotin)', back: 'Duy trì sức khỏe tóc và móng. Có trong lòng đỏ trứng, quả óc chó.' },
    { icon: '🦴', title: 'Phốt pho', back: 'Hỗ trợ xây dựng xương và lọc chất thải ở thận. Có trong thịt, cá.' },
    { icon: '🧂', title: 'Natri (Sodium)', back: 'Cân bằng chất lỏng cơ thể. Cần bổ sung vừa đủ từ muối ăn.' },
    { icon: '🌰', title: 'Đồng (Copper)', back: 'Giúp cơ thể hấp thụ sắt. Có trong nội tạng động vật, hạt vỏ cứng.' },
    { icon: '🍵', title: 'Mangan', back: 'Hỗ trợ hình thành xương và chuyển hóa. Có trong trà, ngũ cốc.' },
    { icon: '🌰', title: 'Selen', back: 'Chống oxy hóa mạnh mẽ. Có trong quả hạch Brazil, cá ngừ.' },
    { icon: '💧', title: 'Bicarbonate', back: 'Duy trì độ pH ổn định cho máu. Thường có trong nước khoáng tự nhiên.' },
  ];

  const quizQuestions = [
    { q: 'Nhóm vitamin nào tan trong nước và nên được bổ sung đều hơn?', a: ['Vitamin A, D, E, K', 'Vitamin B và C', 'Chỉ vitamin D'], correct: 1, hint: 'Hãy nhớ chữ "nước" gắn với B và C.', explain: 'Vitamin nhóm B và vitamin C tan trong nước, cơ thể không dự trữ nhiều nên cần nạp đều qua ăn uống.' },
    { q: 'Khoáng chất nào thường được nhắc đến khi nói về xương chắc khoẻ?', a: ['Canxi', 'Natri', 'I-ốt'], correct: 0, hint: 'Có nhiều trong sữa và phô mai.', explain: 'Canxi là khoáng chất quan trọng cấu tạo xương và răng, thường đi cùng vitamin D để hấp thu tốt hơn.' },
    { q: 'Uống nước thế nào thường tốt hơn cho thói quen hằng ngày?', a: ['Uống dồn vào buổi tối', 'Chia đều nhiều lần trong ngày', 'Chỉ uống khi rất khát'], correct: 1, hint: 'Bé Mèo thích các ngụm nhỏ đều đặn.', explain: 'Chia nước đều trong ngày giúp cơ thể duy trì cân bằng nước ổn định và tránh quên uống.' },
    { q: 'Vitamin C giúp hấp thu khoáng chất nào tốt hơn?', a: ['Sắt', 'Canxi', 'Natri'], correct: 0, hint: 'Khoáng chất liên quan đến hồng cầu.', explain: 'Vitamin C hỗ trợ tăng hấp thu sắt, đặc biệt là sắt từ nguồn thực vật.' },
    { q: 'Khi học lâu, mẹo nào giúp Bé Mèo nhắc bạn uống nước?', a: ['Để ly nước cạnh bàn', 'Cất nước thật xa', 'Không uống trong giờ học'], correct: 0, hint: 'Thấy ly nước là nhớ uống.', explain: 'Đặt ly nước cạnh bàn là tín hiệu trực quan giúp bạn uống vài ngụm sau mỗi khoảng học tập.' },
    { q: 'Magie và kali thường được xếp vào nhóm hỗ trợ điều gì?', a: ['Điện giải, cơ và tim', 'Chỉ màu da', 'Chỉ chiều cao'], correct: 0, hint: 'Liên quan đến vận động và nhịp cơ thể.', explain: 'Magie và kali là các chất điện giải hỗ trợ hoạt động cơ bắp, thần kinh và nhịp tim.' },
    { q: 'Vitamin D hỗ trợ cơ thể hấp thu khoáng chất nào?', a: ['Canxi', 'Kẽm', 'Natri'], correct: 0, hint: 'Khoáng chất xây xương.', explain: 'Vitamin D giúp cơ thể hấp thu canxi hiệu quả hơn, từ đó hỗ trợ xương và răng chắc khỏe.' },
    { q: 'Vitamin K nổi bật với vai trò nào?', a: ['Hỗ trợ đông máu', 'Tạo vị ngọt', 'Làm nước có ga'], correct: 0, hint: 'Liên quan đến vết thương ngừng chảy máu.', explain: 'Vitamin K tham gia vào quá trình đông máu và cũng góp phần duy trì sức khỏe xương.' },
    { q: 'Thực phẩm nào giàu kali thường được Bé Mèo nhắc đến?', a: ['Chuối', 'Kẹo bông', 'Nước ngọt'], correct: 0, hint: 'Quả màu vàng, dễ mang theo.', explain: 'Chuối, khoai lang và nước dừa là các nguồn kali quen thuộc, hỗ trợ cân bằng điện giải.' },
    { q: 'I-ốt cần thiết nhất cho tuyến nào?', a: ['Tuyến giáp', 'Tuyến mồ hôi', 'Tuyến nước bọt'], correct: 0, hint: 'Tuyến nằm vùng cổ, điều hòa chuyển hóa.', explain: 'I-ốt là nguyên liệu để tuyến giáp tạo hormone, hỗ trợ chuyển hóa và phát triển trí não.' },
    { q: 'Vitamin B12 thường có nhiều trong nhóm thực phẩm nào?', a: ['Thịt, cá, sữa', 'Chỉ trái cây', 'Chỉ nước lọc'], correct: 0, hint: 'Nguồn gốc động vật thường giàu B12.', explain: 'Vitamin B12 có nhiều trong thực phẩm nguồn gốc động vật và cần cho hồng cầu, hệ thần kinh.' },
    { q: 'Chất nào là thành phần của hemoglobin vận chuyển oxy?', a: ['Sắt', 'Bicarbonate', 'Vitamin E'], correct: 0, hint: 'Thiếu chất này dễ mệt và xanh xao.', explain: 'Sắt là thành phần quan trọng của hemoglobin, giúp máu vận chuyển oxy đến các mô.' },
    { q: 'Vitamin E thường được biết đến nhờ tác dụng nào?', a: ['Chống oxy hóa', 'Làm tăng độ mặn', 'Thay thế nước uống'], correct: 0, hint: 'Bảo vệ tế bào trước gốc tự do.', explain: 'Vitamin E là chất chống oxy hóa, hỗ trợ bảo vệ màng tế bào và sức khỏe tim mạch.' },
    { q: 'Canxi có nhiều trong lựa chọn nào?', a: ['Sữa và phô mai', 'Nước ngọt có màu', 'Khoai tây chiên'], correct: 0, hint: 'Nhóm thực phẩm từ sữa.', explain: 'Sữa, phô mai, sữa chua và một số hải sản nhỏ xương là nguồn canxi phổ biến.' },
    { q: 'Kẽm thường hỗ trợ tốt cho hệ nào?', a: ['Miễn dịch', 'Hệ thống loa', 'Màu sắc của ly nước'], correct: 0, hint: 'Cơ thể dùng để phòng vệ.', explain: 'Kẽm hỗ trợ miễn dịch, lành vết thương và cảm nhận vị giác.' },
    { q: 'Nước trong cơ thể giúp việc nào?', a: ['Vận chuyển chất dinh dưỡng', 'Tạo bài kiểm tra khó hơn', 'Làm mất hết khoáng chất'], correct: 0, hint: 'Nước giống "xe chở" trong cơ thể.', explain: 'Nước tham gia vận chuyển chất dinh dưỡng, điều hòa nhiệt độ và hỗ trợ nhiều phản ứng chuyển hóa.' },
    { q: 'Dấu hiệu nào có thể gợi ý bạn nên uống nước?', a: ['Nước tiểu sẫm màu', 'Móng tay dài nhanh trong 1 phút', 'Áo đổi màu ngay lập tức'], correct: 0, hint: 'Quan sát màu nước tiểu.', explain: 'Nước tiểu sẫm màu có thể là tín hiệu cơ thể đang thiếu nước; hãy uống đều và theo nhu cầu cá nhân.' },
    { q: 'Sau khi vận động ra mồ hôi, nên ưu tiên điều gì?', a: ['Bù nước từng ngụm và điện giải phù hợp', 'Nhịn uống cả ngày', 'Chỉ ăn kẹo'], correct: 0, hint: 'Mồ hôi làm mất nước và muối khoáng.', explain: 'Sau vận động, uống từng ngụm nước và chú ý điện giải khi đổ mồ hôi nhiều giúp cơ thể hồi phục tốt hơn.' },
    { q: 'Vitamin A thường liên quan nhiều đến chức năng nào?', a: ['Thị lực', 'Âm lượng loa', 'Độ sáng màn hình máy tính'], correct: 0, hint: 'Cà rốt thường được nhắc với đôi mắt.', explain: 'Vitamin A hỗ trợ thị lực, miễn dịch và sức khỏe da.' },
    { q: 'A, D, E, K thuộc nhóm vitamin nào?', a: ['Tan trong dầu', 'Tan trong nước', 'Không cần thức ăn'], correct: 0, hint: 'Ăn kèm chất béo lành mạnh giúp hấp thu.', explain: 'Vitamin A, D, E, K tan trong dầu nên hấp thu tốt hơn khi bữa ăn có chất béo lành mạnh.' },
    { q: 'Bicarbonate trong nước khoáng thường hỗ trợ điều gì?', a: ['Duy trì cân bằng pH', 'Tạo màu xanh cho nước', 'Thay thế bữa sáng'], correct: 0, hint: 'Liên quan đến độ axit - kiềm.', explain: 'Bicarbonate góp phần vào hệ đệm, giúp duy trì cân bằng pH trong cơ thể.' },
    { q: 'Mẹo nào giúp nhớ uống nước sau khi ngủ dậy?', a: ['Đặt sẵn ly nước ở nơi dễ thấy', 'Giấu bình nước', 'Tắt mọi lời nhắc'], correct: 0, hint: 'Tín hiệu thị giác rất hữu ích.', explain: 'Đặt ly hoặc bình nước ở vị trí dễ thấy giúp tạo thói quen uống vài ngụm đầu ngày.' },
    { q: 'Uống quá nhiều nước dồn trong thời gian rất ngắn có nên không?', a: ['Không nên', 'Luôn luôn nên', 'Chỉ cần uống càng nhanh càng tốt'], correct: 0, hint: 'Bé Mèo thích đều đặn, không dồn ép.', explain: 'Nên uống nước rải đều theo nhu cầu; uống dồn quá nhiều trong thời gian ngắn có thể gây khó chịu.' },
    { q: 'Vitamin B1 còn có tên gọi nào?', a: ['Thiamine', 'Retinol', 'Tocopherol'], correct: 0, hint: 'Tên bắt đầu bằng chữ T.', explain: 'Vitamin B1 là thiamine, tham gia chuyển hóa năng lượng và hỗ trợ hệ thần kinh.' },
    { q: 'Mục tiêu của calendar 31 ngày trong Bé Mèo Nước là gì?', a: ['Theo dõi thói quen uống nước từng ngày', 'Chấm điểm môn toán', 'Đếm số lần mở ứng dụng khác'], correct: 0, hint: 'Nó nằm dưới nút Reset ngày.', explain: 'Calendar 31 ngày giúp bạn nhìn lại lượng nước từng ngày, xem ngày nào đạt mục tiêu và duy trì thói quen.' },
  ];

  const $ = (id) => root.getElementById(id);
  const totalMlEl = $('totalMl');
  const goalMlEl = $('goalMl');
  const percentEl = $('percent');
  const waterFillEl = $('waterFill');
  const chatLog = $('chatLog');
  const chatInput = $('chatInput');
  const flashcardEl = $('flashcard');
  const cardCounterEl = $('cardCounter');
  const questionTextEl = $('questionText');
  const answersEl = $('answers');
  const explainBoxEl = $('explainBox');
  const nextQuestionBtn = $('nextQuestion');
  const quizProgressTextEl = $('quizProgressText');
  const quizProgressBarEl = $('quizProgressBar');
  const quizPlayEl = $('quizPlay');
  const quizResultEl = $('quizResult');
  const scoreTextEl = $('scoreText');
  const hydrationCalendarEl = $('hydrationCalendar');
  const calendarSummaryEl = $('calendarSummary');
  const calendarStreakEl = $('calendarStreak');
  const monthSelectEl = $('calendarMonthSelect');
  const yearSelectEl = $('calendarYearSelect');
  const prevMonthBtn = $('calendarPrevMonth');
  const nextMonthBtn = $('calendarNextMonth');
  const todayBtn = $('calendarTodayBtn');

  // ─── Lưu trữ qua IndexedDB (100% lịch sử, theo user đăng nhập) ───────────────
  // Toàn bộ history Tháng/Năm trong quá khứ được nạp 1 lần vào waterHistoryMap (nhẹ — chỉ
  // {total,goal} mỗi ngày, không phải messages) để vẽ calendar mượt khi đổi tháng/năm.
  let waterHistoryMap = {}; // { 'YYYY-MM-DD': { total, goal } } — TOÀN BỘ lịch sử của user

  async function loadInitialState() {
    const [todayRecord, history] = await Promise.all([
      getDay(userKey, today),
      getAllWaterHistory(userKey),
    ]);
    waterHistoryMap = history || {};
    if (todayRecord) {
      state = { date: today, total: todayRecord.water?.total || 0, goal: todayRecord.water?.goal || 2000, history: waterHistoryMap };
      if (Array.isArray(todayRecord.messages) && todayRecord.messages.length > 0) messages = todayRecord.messages;
    } else {
      state = { ...defaultState, history: waterHistoryMap };
    }
    storageReady = true;
  }

  // Lưu lại NGÀY HÔM NAY (water + messages) vào IndexedDB — gọi sau mỗi thay đổi khi đang ở chế độ live.
  // Tự chặn khi đang xem lại lịch sử ngày cũ (selectedDay khác hôm nay) — tránh ghi nhầm
  // nội dung chat của ngày cũ đè lên dữ liệu thật của hôm nay.
  function persistToday() {
    if (!storageReady) return; // tránh ghi đè bằng dữ liệu rác trước khi load xong lần đầu
    if (selectedDay && selectedDay !== today) return;
    waterHistoryMap[today] = { total: state.total, goal: state.goal };
    saveDay(userKey, today, { messages, water: { total: state.total, goal: state.goal } })
      .catch((e) => console.error('[Bé Mèo Nước] persistToday error:', e));
  }

  function getDayGreeting() {
    const hour = new Date().getHours();
    const greetings = hour < 10
      ? ['Chào buổi sáng! ☀️ Bé Mèo Nước đây~ Uống một ly nước ấm ngay bây giờ nhé, cơ thể mình đang khát sau một đêm dài đó bạn ơi! 🐱💧', 'Meo meo! 🌅 Sáng sớm rồi nè~ Một ly nước trước khi làm gì hết là bí quyết tươi tỉnh cả ngày của Bé Mèo đó! 💧✨']
      : hour < 12
      ? ['Chào buổi sáng! 🌞 Bé Mèo Nước đây~ Buổi sáng năng động cần đủ nước nhé! 💧🐱', 'Meo~ Gần trưa rồi đó! 🕙 Đừng để cơ thể khát mà không hay nha~ 💧✨']
      : hour < 14
      ? ['Buổi trưa rồi nè! 🍱 Bé Mèo nhắc bạn uống nước trước khi ăn cơm nhé~ 💧🐱', 'Meo meo~ Trưa rồi bạn ơi! 🌤️ Nắng nóng thì cơ thể mất nước nhanh hơn đó~ 💧😸']
      : hour < 18
      ? ['Buổi chiều xin chào! 🌤️ Bé Mèo Nước đây~ Uống nước vào thay vì cà phê thử xem, tỉnh lắm đó! 💧🐱', 'Meo~ Chiều rồi nè bạn! Đừng quên uống nước nhé~ 💧✨']
      : ['Buổi tối chào bạn! 🌙 Bé Mèo Nước đây~ Uống thêm một chút nước ấm trước khi ngủ nhé! 🐱💧', 'Meo meo~ Tối rồi đó! ⭐ Nhớ uống nước trước khi ngủ nhé~ 💧😸'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Khoá theo userKey (uuid) — mỗi user/guest có cache proof riêng, không bị lẫn
  // proof của người khác dùng chung máy/trình duyệt.
  const PROOF_MAP_KEY = 'be_meo_nuoc_proof_map_' + (userKey || 'guest');

  function loadProofMap() {
    const result = {};
    try {
      const meta = JSON.parse(localStorage.getItem(PROOF_MAP_KEY + '_meta') || '{}');
      Object.keys(meta).forEach((pid) => {
        const dataUrl = sessionStorage.getItem(PROOF_MAP_KEY + '_' + pid);
        if (dataUrl) result[pid] = dataUrl;
        else if (meta[pid]?.hasProof) result[pid] = '__PENDING__';
      });
    } catch { }
    return result;
  }

  function saveProofMap() {
    try {
      const recent = Object.entries(proofMap).slice(-30);
      const meta = {};
      recent.forEach(([pid, dataUrl]) => {
        if (dataUrl && dataUrl !== '__PENDING__') {
          meta[pid] = { hasProof: true, time: Date.now() };
          try { sessionStorage.setItem(PROOF_MAP_KEY + '_' + pid, dataUrl); } catch { }
        } else if (dataUrl === '__PENDING__') {
          meta[pid] = { hasProof: true, pending: true, time: Date.now() };
        }
      });
      localStorage.setItem(PROOF_MAP_KEY + '_meta', JSON.stringify(meta));
    } catch { }
  }

  function switchTab(tab) {
    root.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    root.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
    if (tab === 'study') window.requestAnimationFrame(drawInfographicCharts);
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function drawInfographicCharts() { drawVitaminDonut(); drawWaterMinerals(); drawFoodRadar(); }

  function drawVitaminDonut() {
    const canvas = $('vitaminDonutChart'); if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const cx = width * 0.34, cy = height * 0.5, radius = Math.min(width, height) * 0.34;
    const data = [{ label: 'Tan trong dầu (A,D,E,K)', value: 4, color: '#f59e0b' }, { label: 'Tan trong nước (B,C)', value: 9, color: '#3b82f6' }];
    const total = data.reduce((s, d) => s + d.value, 0);
    let start = -Math.PI / 2;
    ctx.clearRect(0, 0, width, height);
    data.forEach((item) => {
      const angle = (item.value / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, start, start + angle); ctx.closePath();
      ctx.fillStyle = item.color; ctx.fill(); start += angle;
    });
    ctx.beginPath(); ctx.arc(cx, cy, radius * 0.56, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#0369a1'; ctx.font = '800 18px Inter,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('13', cx, cy - 2); ctx.font = '700 11px Inter,sans-serif'; ctx.fillStyle = '#64748b'; ctx.fillText('vitamin', cx, cy + 15);
    ctx.textAlign = 'left';
    data.forEach((item, i) => {
      const y = cy - 28 + i * 44;
      ctx.fillStyle = item.color; ctx.fillRect(width * 0.62, y - 10, 16, 16);
      ctx.fillStyle = '#334155'; ctx.font = '800 12px Inter,sans-serif'; ctx.fillText(item.label, width * 0.62 + 24, y + 2);
      ctx.fillStyle = '#64748b'; ctx.font = '700 11px Inter,sans-serif'; ctx.fillText(`${item.value} loại`, width * 0.62 + 24, y + 18);
    });
  }

  function drawWaterMinerals() {
    const canvas = $('waterMineralsChart'); if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const labels = ['Canxi', 'Magie', 'Natri', 'Kali', 'Bicarbonate'];
    const values = [85, 45, 30, 15, 95];
    const left = 28, bottom = height - 34, chartHeight = height - 58, barWidth = (width - left - 18) / values.length - 10;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) { const y = bottom - (chartHeight / 3) * i; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - 10, y); ctx.stroke(); }
    values.forEach((value, i) => {
      const x = left + i * (barWidth + 10) + 5, h = (value / 100) * chartHeight;
      const g = ctx.createLinearGradient(0, bottom - h, 0, bottom);
      g.addColorStop(0, '#67e8f9'); g.addColorStop(1, '#06b6d4');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, bottom - h, barWidth, h, 7); ctx.fill();
      ctx.fillStyle = '#0369a1'; ctx.font = '800 11px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(value, x + barWidth / 2, bottom - h - 6);
      ctx.fillStyle = '#64748b'; ctx.font = '700 10px Inter,sans-serif'; ctx.fillText(labels[i], x + barWidth / 2, bottom + 18);
    });
  }

  function drawFoodRadar() {
    const canvas = $('foodRadarChart'); if (!canvas) return;
    const { ctx, width, height } = setupCanvas(canvas);
    const labels = ['Canxi', 'Sắt', 'Kẽm', 'Magie', 'Kali'];
    const datasets = [
      { label: 'Thịt & Hải Sản', data: [20, 95, 90, 40, 60], stroke: '#ef4444', fill: 'rgba(239,68,68,.16)' },
      { label: 'Sữa & Từ Sữa', data: [95, 10, 30, 20, 50], stroke: '#3b82f6', fill: 'rgba(59,130,246,.16)' },
      { label: 'Rau Quả & Hạt', data: [40, 50, 45, 90, 85], stroke: '#10b981', fill: 'rgba(16,185,129,.16)' },
    ];
    const cx = width * 0.5, cy = height * 0.52, radius = Math.min(width, height) * 0.3;
    ctx.clearRect(0, 0, width, height); ctx.textAlign = 'center';
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      labels.forEach((_, i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / labels.length), r = radius * ring / 4; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.closePath(); ctx.strokeStyle = '#e2e8f0'; ctx.stroke();
    }
    labels.forEach((label, i) => {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / labels.length);
      const x = cx + Math.cos(a) * radius, y = cy + Math.sin(a) * radius;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.strokeStyle = '#eef2f7'; ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.font = '800 11px Inter,sans-serif';
      ctx.fillText(label, cx + Math.cos(a) * (radius + 22), cy + Math.sin(a) * (radius + 18));
    });
    datasets.forEach((set) => {
      ctx.beginPath();
      set.data.forEach((value, i) => { const a = -Math.PI / 2 + i * (Math.PI * 2 / labels.length), r = radius * value / 100; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.closePath(); ctx.fillStyle = set.fill; ctx.strokeStyle = set.stroke; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
    });
    datasets.forEach((set, i) => {
      const x = 18 + i * (width / 3);
      ctx.fillStyle = set.stroke; ctx.fillRect(x, 10, 12, 12);
      ctx.fillStyle = '#334155'; ctx.font = '700 10px Inter,sans-serif'; ctx.textAlign = 'left'; ctx.fillText(set.label, x + 17, 20);
    });
  }

  function renderState() {
    const pct = Math.min(100, Math.round((state.total / state.goal) * 100));
    state.date = today; state.history = state.history || {};
    state.history[today] = { total: state.total, goal: state.goal, percent: pct };
    waterHistoryMap[today] = { total: state.total, goal: state.goal };
    updateWaterStats(); renderCalendar(); persistToday();
  }

  // Vẽ lưới calendar cho viewYear/viewMonth đang chọn — số ô = đúng số ngày thật của tháng đó
  // (28/29/30/31, tự đúng năm nhuận), KHÔNG còn cố định 31 ô như trước.
  function renderCalendar() {
    if (!hydrationCalendarEl) return;
    const numDays = daysInMonth(viewYear, viewMonth);
    const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const isViewingCurrentMonth = monthKey === today.slice(0, 7);
    let completed = 0;
    hydrationCalendarEl.innerHTML = '';
    for (let day = 1; day <= numDays; day++) {
      const dayKey = `${monthKey}-${String(day).padStart(2, '0')}`;
      const entry = state.history?.[dayKey];
      const dayGoal = entry?.goal || state.goal, dayTotal = entry?.total || 0;
      const dayPct = Math.min(100, Math.round((dayTotal / dayGoal) * 100));
      const isDone = dayTotal >= dayGoal;
      if (isDone) completed++;
      const isSelected = selectedDay === dayKey;
      const isToday = dayKey === today;
      const isFuture = dayKey > today; // so sánh chuỗi YYYY-MM-DD — đúng thứ tự thời gian
      const cell = document.createElement('div');
      cell.className = `calendar-day${isToday ? ' active' : ''}${isDone ? ' done' : ''}${isFuture ? ' future' : ''}${isSelected ? ' selected' : ''}`;
      cell.title = isFuture ? `Ngày ${day}: chưa tới` : `Ngày ${day}: ${dayTotal}/${dayGoal}ml (${dayPct}%)`;
      cell.innerHTML = `<span>${day}</span><small>${dayTotal}ml</small>`;
      if (!isFuture) cell.addEventListener('click', () => selectDay(dayKey));
      hydrationCalendarEl.appendChild(cell);
    }
    calendarSummaryEl.textContent = selectedDay
      ? (() => { const e = state.history?.[selectedDay]; const t = e?.total || 0, g = e?.goal || state.goal; const [, , dd] = selectedDay.split('-'); return `Ngày ${parseInt(dd, 10)}: ${t}/${g}ml · ${Math.min(100, Math.round((t / g) * 100))}% mục tiêu`; })()
      : isViewingCurrentMonth
        ? `Hôm nay: ${state.total}/${state.goal}ml · ${Math.min(100, Math.round((state.total / state.goal) * 100))}% mục tiêu`
        : `Tháng ${viewMonth + 1}/${viewYear} · ${numDays} ngày`;
    calendarStreakEl.textContent = `${completed}/${numDays}`;
    const dayFilterBar = $('dayFilterBar'), dayFilterLabel = $('dayFilterLabel'), dayFilterWater = $('dayFilterWater');
    if (dayFilterBar) {
      if (selectedDay) {
        const e = state.history?.[selectedDay]; const t = e?.total || 0, g = e?.goal || state.goal;
        const [sy, sm, sd] = selectedDay.split('-');
        dayFilterLabel.textContent = `📅 Đang xem ngày ${parseInt(sd, 10)}/${parseInt(sm, 10)}/${sy}`;
        dayFilterWater.textContent = `💧 ${t}/${g}ml`;
        dayFilterBar.style.display = 'flex';
      } else { dayFilterBar.style.display = 'none'; }
    }
    updateWaterStats();
    syncCalendarNavControls();
  }

  // Đồng bộ 2 dropdown Tháng/Năm + disable nút "Tháng sau" khi đã ở tháng hiện tại (không xem tương lai).
  function syncCalendarNavControls() {
    if (monthSelectEl) monthSelectEl.value = String(viewMonth);
    if (yearSelectEl) yearSelectEl.value = String(viewYear);
    const isCurrentMonth = viewYear === todayDateObj.getFullYear() && viewMonth === todayDateObj.getMonth();
    if (nextMonthBtn) nextMonthBtn.disabled = isCurrentMonth;
  }


  function updateWaterStats() {
    let displayTotal, displayGoal;
    if (selectedDay && selectedDay !== today) { const e = state.history?.[selectedDay]; displayTotal = e?.total || 0; displayGoal = e?.goal || state.goal; }
    else { displayTotal = state.total; displayGoal = state.goal; }
    const pct = Math.min(100, Math.round((displayTotal / displayGoal) * 100));
    if (totalMlEl) totalMlEl.textContent = displayTotal;
    if (goalMlEl) goalMlEl.textContent = displayGoal;
    if (percentEl) percentEl.textContent = pct + '%';
    if (waterFillEl) waterFillEl.style.height = pct + '%';
  }

  const proofMap = loadProofMap();
  let activeReviewProofId = null;

  function renderChat() {
    chatLog.innerHTML = '';
    const isViewingPast = !!selectedDay && selectedDay !== today;
    let displayMessages = messages;
    if (isViewingPast) {
      const [sy, sm, sd] = selectedDay.split('-');
      const notice = document.createElement('div'); notice.className = 'chat-filter-notice';
      const e = state.history?.[selectedDay]; const t = e?.total || 0, g = e?.goal || state.goal;
      notice.innerHTML = `📅 Đang xem chat ngày <b>${parseInt(sd, 10)}/${parseInt(sm, 10)}/${sy}</b> · 💧 <b>${t}/${g}ml</b> · ${displayMessages.length} tin nhắn (100% lịch sử)`;
      chatLog.appendChild(notice);
      if (displayMessages.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'text-align:center;padding:28px 14px;color:#64748b;font-size:13px;font-weight:800;';
        empty.textContent = '🐱 Không có tin nhắn nào trong ngày này.';
        chatLog.appendChild(empty); return;
      }
    }
    displayMessages.forEach((message) => {
      const wrap = document.createElement('div');
      wrap.className = 'msg-wrap ' + (message.role === 'user' ? 'user' : 'bot-wrap');
      if (message.proofId) wrap.dataset.proofId = message.proofId;
      const bubble = document.createElement('div');
      bubble.className = 'msg ' + (message.role === 'user' ? 'user' : 'bot');
      bubble.textContent = message.text; wrap.appendChild(bubble);
      const ts = document.createElement('div'); ts.className = 'msg-time';
      if (message.time) {
        const d = new Date(message.time);
        ts.textContent = `🕐 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} · ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      }
      wrap.appendChild(ts);
      if (message.proofId && proofMap[message.proofId] && proofMap[message.proofId] !== '__PENDING__') {
        const btn = document.createElement('button'); btn.type = 'button';
        btn.className = 'msg-review-btn' + (activeReviewProofId === message.proofId ? ' active' : '');
        const msgTime = message.time ? (() => { const d = new Date(message.time); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; })() : '';
        btn.textContent = activeReviewProofId === message.proofId ? '✕ Đóng xem lại' : ('🔍 Xem lại ảnh đã chụp' + (msgTime ? ' lúc ' + msgTime : ''));
        btn.dataset.pid = message.proofId;
        btn.addEventListener('click', () => {
          const pid = btn.dataset.pid, isActive = activeReviewProofId === pid;
          activeReviewProofId = isActive ? null : pid;
          window.postMessage({ type: isActive ? 'BE_MEO_REVIEW_CLOSE' : 'BE_MEO_REVIEW_REQUEST', proofId: pid, dataUrl: proofMap[pid] || null }, '*');
          renderChat();
        });
        wrap.appendChild(btn);
      }
      chatLog.appendChild(wrap);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
    if (!isViewingPast) persistToday(); // chỉ ghi xuống IndexedDB khi đang ở chat sống (hôm nay)
  }

  // Bấm 1 ô ngày trong calendar (ngày quá khứ đã có dữ liệu) → nạp TOÀN BỘ chat ngày đó từ IndexedDB.
  async function selectDay(dayKey) {
    if (selectedDay === dayKey) { // bấm lại ngày đang chọn → quay về hôm nay (live)
      selectedDay = null;
      messages = (await getMessagesForDay(userKey, today)) || messages;
      if (messages.length === 0) messages = [{ role: 'bot', text: getDayGreeting(), time: new Date().toISOString() }];
      renderCalendar(); renderChat();
      return;
    }
    selectedDay = dayKey;
    if (dayKey === today) {
      messages = (await getMessagesForDay(userKey, today));
      if (messages.length === 0) messages = [{ role: 'bot', text: getDayGreeting(), time: new Date().toISOString() }];
    } else {
      messages = await getMessagesForDay(userKey, dayKey); // 100% lịch sử ngày đó, không cắt bớt
    }
    renderCalendar(); renderChat();
  }


  function onWindowMessage(event) {
    if (event.data?.type === 'BE_MEO_STATE_SYNC') {
      if (typeof event.data.total === 'number') state.total = event.data.total;
      if (typeof event.data.goal === 'number') state.goal = event.data.goal;
      renderState();
    }
    if (event.data?.type === 'BE_MEO_PROOF_SAVED' && event.data.proofId && event.data.dataUrl) {
      proofMap[event.data.proofId] = event.data.dataUrl; saveProofMap();
      renderChat(); // proofMap đã có trong RAM — chỉ cần vẽ lại, không cần đọc lại messages từ storage
    }
    if (event.data?.type === 'BE_MEO_PROOF_BULK_RESTORE' && event.data.proofMapEntries) {
      let changed = false;
      event.data.proofMapEntries.forEach(({ proofId, dataUrl }) => { if (proofId && dataUrl) { proofMap[proofId] = dataUrl; changed = true; } });
      if (Array.isArray(event.data.validProofIds)) {
        const validSet = new Set(event.data.validProofIds);
        Object.keys(proofMap).forEach((pid) => {
          if (!validSet.has(pid)) { delete proofMap[pid]; changed = true; messages = messages.map((m) => m.proofId === pid ? { ...m, proofId: null } : m); }
        });
      }
      if (changed) { saveProofMap(); persistToday(); renderChat(); }
    }
    if (event.data?.type === 'BE_MEO_PROOF_DELETED' && event.data.proofId) {
      const pid = event.data.proofId; delete proofMap[pid];
      if (activeReviewProofId === pid) activeReviewProofId = null;
      try { sessionStorage.removeItem(PROOF_MAP_KEY + '_' + pid); } catch { }
      try { const meta = JSON.parse(localStorage.getItem(PROOF_MAP_KEY + '_meta') || '{}'); delete meta[pid]; localStorage.setItem(PROOF_MAP_KEY + '_meta', JSON.stringify(meta)); } catch { }
      let msgChanged = false;
      messages = messages.map((m) => { if (m.proofId === pid) { msgChanged = true; return { ...m, proofId: null }; } return m; });
      if (msgChanged) persistToday();
      renderChat();
    }
    if (event.data?.type === 'BE_MEO_CAMERA_PROOF' && event.data.proofId) {
      const ml = event.data.ml || 150, total = state.total, goal = state.goal || 2000;
      messages.push({ role: 'bot', text: `📸 Bé Mèo đã ghi nhận ảnh uống nước (+${ml}ml) từ camera AI Healthcare Vision! Hôm nay bạn đang ở ${total}/${goal}ml (${Math.min(100, Math.round((total/goal)*100))}%).`, proofId: event.data.proofId, time: new Date().toISOString() });
      persistToday();
      renderChat();
    }
  }
  window.addEventListener('message', onWindowMessage);

  function addWater(amount, source = 'Bé Mèo Nước') {
    state.total = Math.max(0, state.total + amount); renderState();
    const proofId = 'proof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    window.postMessage({ type: 'BE_MEO_WATER_ADDED', amount, source, total: state.total, goal: state.goal, proofId }, '*');
    const text = state.total >= state.goal
      ? `Giỏi quá meo! Bạn đã đạt ${state.total}/${state.goal}ml hôm nay rồi đó 🏆💧`
      : `Bé Mèo đã ghi +${amount}ml. Hôm nay bạn đang ở ${state.total}/${state.goal}ml (${Math.round((state.total/state.goal)*100)}%).`;
    return { text, proofId };
  }

  function botReply(text) {
    const lower = text.toLowerCase();
    const mlMatch = lower.match(/(\d{2,4})\s*(ml|mili|milliliter)?/);
    if (mlMatch && /(uống|drink|vừa|them|thêm|ghi|add)/i.test(lower)) return addWater(Number(mlMatch[1]), 'Bé Mèo Nước chat');
    if (/(bao nhiêu|mục tiêu|goal|nên uống)/i.test(lower)) return `Mục tiêu mặc định của Bé Mèo là ${state.goal}ml/ngày. Chia thành 6–8 lần uống nhỏ, ưu tiên uống đều trong ngày nhé 💧`;
    if (/(quên|nhắc|remind)/i.test(lower)) return 'Mẹo của Bé Mèo: để ly nước cạnh bàn, uống vài ngụm sau khi thức dậy, trước bữa ăn và sau mỗi 45–60 phút. Uống một ngụm ngay bây giờ nhé! 🐱';
    if (/(reset|xóa|xoá)/i.test(lower)) { state.total = 0; renderState(); return 'Bé Mèo đã reset lượng nước hôm nay về 0ml rồi nha.'; }
    if (/(đạt|tiến độ|progress|hôm nay)/i.test(lower)) return `Tiến độ hôm nay: ${state.total}/${state.goal}ml, tương đương ${Math.min(100, Math.round((state.total/state.goal)*100))}%. Cố lên!`;
    return 'Bé Mèo nghe nè 🐱💧 Bạn có thể nói "Tôi vừa uống 250ml", hỏi "hôm nay nên uống bao nhiêu?", hoặc nhờ Bé Mèo gợi ý cách nhớ uống nước.';
  }

  // Nếu đang xem lịch sử một ngày cũ, thoát ra và nạp lại ĐÚNG nội dung của hôm nay
  // trước khi cho phép thêm tin nhắn/nước mới — tránh trộn lẫn dữ liệu giữa 2 ngày.
  async function exitPastViewIfNeeded() {
    if (!selectedDay || selectedDay === today) return;
    selectedDay = null;
    const todayMsgs = await getMessagesForDay(userKey, today);
    messages = todayMsgs.length > 0 ? todayMsgs : [{ role: 'bot', text: getDayGreeting(), time: new Date().toISOString() }];
  }

  async function sendMessage(text) {
    const trimmed = text.trim(); if (!trimmed) return;
    await exitPastViewIfNeeded();
    messages.push({ role: 'user', text: trimmed, time: new Date().toISOString() });
    const reply = botReply(trimmed);
    messages.push(reply && typeof reply === 'object'
      ? { role: 'bot', text: reply.text, proofId: reply.proofId, time: new Date().toISOString() }
      : { role: 'bot', text: reply, time: new Date().toISOString() });
    renderCalendar(); renderChat();
  }

  async function setGoal(goal) {
    await exitPastViewIfNeeded();
    state.goal = goal; renderState();
    messages.push({ role: 'bot', text: `Bé Mèo đã đặt mục tiêu ${goal}ml/ngày cho bạn rồi nha.`, time: new Date().toISOString() });
    renderCalendar(); renderChat();
  }

  function renderCard() {
    const card = flashcards[activeCard];
    flashcardEl.innerHTML = cardFlipped
      ? `<div><span class="emoji">${card.icon}</span><h3>${card.title}</h3><p>${card.back}</p><small>Nhấn "Lật thẻ" để xem mặt trước</small></div>`
      : `<div><span class="emoji">${card.icon}</span><h3>${card.title}</h3><p>Nhấn "Lật thẻ" để xem giải thích.</p></div>`;
    cardCounterEl.textContent = `${activeCard + 1} / ${flashcards.length}`;
  }

  function renderQuestion() {
    answered = false;
    const cur = quizQuestions[activeQuestion];
    quizProgressTextEl.textContent = `Câu ${activeQuestion + 1} / ${quizQuestions.length}`;
    quizProgressBarEl.style.width = `${((activeQuestion + 1) / quizQuestions.length) * 100}%`;
    questionTextEl.textContent = cur.q;
    answersEl.innerHTML = ''; explainBoxEl.className = 'explain'; explainBoxEl.textContent = ''; nextQuestionBtn.style.display = 'none';
    cur.a.forEach((answer, i) => {
      const btn = document.createElement('button'); btn.className = 'answer'; btn.textContent = answer;
      btn.addEventListener('click', () => chooseAnswer(i)); answersEl.appendChild(btn);
    });
  }

  function chooseAnswer(index) {
    if (answered) return; answered = true;
    const cur = quizQuestions[activeQuestion];
    [...answersEl.children].forEach((btn, i) => {
      btn.disabled = true;
      if (i === cur.correct) btn.classList.add('correct');
      if (i === index && index !== cur.correct) btn.classList.add('wrong');
    });
    if (index === cur.correct) quizScore++;
    explainBoxEl.textContent = cur.explain; explainBoxEl.classList.add('show'); nextQuestionBtn.style.display = 'inline-flex';
  }

  function goNextQuestion() {
    if (activeQuestion < quizQuestions.length - 1) { activeQuestion++; renderQuestion(); return; }
    quizPlayEl.style.display = 'none'; quizResultEl.classList.add('show');
    const feedback = quizScore === quizQuestions.length ? 'Tuyệt cú mèo! Bạn là chuyên gia nước và vi chất của Bé Mèo rồi 🏆'
      : quizScore >= 18 ? 'Rất tốt nha! Ôn thêm vài câu là hoàn hảo ✨'
      : quizScore >= 12 ? 'Khá ổn nè! Học lại flashcard thêm chút rồi thử nâng điểm nhé 💧'
      : 'Không sao cả, học lại tab Học tập rồi thử lần nữa nhé 💧';
    scoreTextEl.textContent = `Bạn đạt ${quizScore}/${quizQuestions.length} điểm. ${feedback}`;
  }

  function restartQuiz() { activeQuestion = 0; quizScore = 0; quizPlayEl.style.display = 'block'; quizResultEl.classList.remove('show'); renderQuestion(); }

  // ─── Event listeners ────────────────────────────────────────────────────────
  root.querySelectorAll('.tab-btn').forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  root.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', async () => {
    await exitPastViewIfNeeded();
    const r = addWater(Number(btn.dataset.add), 'Bé Mèo Nước quick button');
    messages.push({ role: 'bot', text: r.text, proofId: r.proofId, time: new Date().toISOString() });
    renderCalendar(); renderChat();
  }));
  root.querySelectorAll('[data-prompt]').forEach((btn) => btn.addEventListener('click', () => sendMessage(btn.dataset.prompt)));
  $('setGoal1800').addEventListener('click', () => setGoal(1800));
  $('setGoal2000').addEventListener('click', () => setGoal(2000));
  $('setGoal2500').addEventListener('click', () => setGoal(2500));
  $('resetDay').addEventListener('click', () => {
    state.total = 0;
    waterHistoryMap[today] = { total: 0, goal: state.goal };
    renderState();
    messages.push({ role: 'bot', text: 'Bé Mèo đã reset lượng nước hôm nay. Calendar cũng cập nhật về 0ml nha 💧', time: new Date().toISOString() });
    persistToday();
    renderChat();
  });
  $('clearChat').addEventListener('click', () => {
    messages = [{ role: 'bot', text: 'Chat đã được làm mới. Bé Mèo Nước vẫn ở đây để nhắc bạn uống nước nha 🐱💧', time: new Date().toISOString() }];
    persistToday();
    renderChat();
  });
  $('chatForm').addEventListener('submit', (e) => { e.preventDefault(); sendMessage(chatInput.value); chatInput.value = ''; });
  $('dayFilterClear').addEventListener('click', () => { selectedDay = null; renderCalendar(); renderChat(); });

  // ─── Calendar: chọn Tháng/Năm để xem lại lịch sử (lịch dương đúng 28/29/30/31 ngày) ──
  function populateMonthYearSelects() {
    if (!monthSelectEl || !yearSelectEl) return;
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    monthSelectEl.innerHTML = monthNames.map((name, i) => `<option value="${i}">${name}</option>`).join('');
    // Năm: từ (năm hiện tại - 5) đến năm hiện tại — đủ cho lịch sử nhiều năm sử dụng, không cho chọn năm tương lai.
    const curYear = todayDateObj.getFullYear();
    const years = [];
    for (let y = curYear; y >= curYear - 5; y--) years.push(y);
    yearSelectEl.innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join('');
    syncCalendarNavControls();
  }

  // Đổi viewYear/viewMonth rồi vẽ lại lưới — không cho phép đi tới tháng/năm trong tương lai.
  function goToMonth(year, month) {
    let y = year, m = month;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    // Chặn không cho xem tháng ở tương lai so với hôm nay.
    if (y > todayDateObj.getFullYear() || (y === todayDateObj.getFullYear() && m > todayDateObj.getMonth())) {
      y = todayDateObj.getFullYear(); m = todayDateObj.getMonth();
    }
    viewYear = y; viewMonth = m;
    renderCalendar();
  }

  if (monthSelectEl) monthSelectEl.addEventListener('change', () => goToMonth(viewYear, Number(monthSelectEl.value)));
  if (yearSelectEl) yearSelectEl.addEventListener('change', () => goToMonth(Number(yearSelectEl.value), viewMonth));
  if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => goToMonth(viewYear, viewMonth - 1));
  if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => goToMonth(viewYear, viewMonth + 1));
  if (todayBtn) todayBtn.addEventListener('click', () => {
    selectedDay = null;
    goToMonth(todayDateObj.getFullYear(), todayDateObj.getMonth());
    getMessagesForDay(userKey, today).then((msgs) => {
      messages = msgs.length > 0 ? msgs : [{ role: 'bot', text: getDayGreeting(), time: new Date().toISOString() }];
      renderChat();
    });
  });

  // Đồng bộ khi nơi khác (Health Journey Game, Task Detail, AI Vision Webcam...) báo có
  // nước mới được thêm qua syncBeMeoWater() — hàm đó đã TỰ GHI trực tiếp vào IndexedDB rồi
  // (hoạt động đúng dù widget này có đang mount hay không). Ở đây chỉ cần ĐỌC LẠI từ
  // IndexedDB và vẽ lại UI ngay — không tự cộng amount vào RAM để tránh cộng nước 2 lần.
  async function onSyncEvent(event) {
    const detail = event?.detail || {};
    await exitPastViewIfNeeded(); // nếu đang xem lịch sử ngày cũ, quay về hôm nay trước khi đồng bộ
    // Chỉ áp dụng nếu sự kiện này thuộc về đúng user đang đăng nhập trong widget này —
    // tránh trường hợp 2 user khác nhau dùng chung máy/tab gây lẫn dữ liệu.
    if (detail.ownerKey && userKey && detail.ownerKey.toLowerCase() !== userKey.toLowerCase()) { return; }
    const todayRecord = await getDay(userKey, today);
    if (todayRecord) {
      state.total = todayRecord.water?.total ?? state.total;
      state.goal = todayRecord.water?.goal ?? state.goal;
      waterHistoryMap[today] = { total: state.total, goal: state.goal };
      if (Array.isArray(todayRecord.messages)) messages = todayRecord.messages;
    }
    renderState(); renderChat();
  }
  window.addEventListener(SYNC_EVENT, onSyncEvent);
  $('flipCard').addEventListener('click', () => { cardFlipped = !cardFlipped; renderCard(); });
  $('prevCard').addEventListener('click', () => { activeCard = (activeCard - 1 + flashcards.length) % flashcards.length; cardFlipped = false; renderCard(); });
  $('nextCard').addEventListener('click', () => { activeCard = (activeCard + 1) % flashcards.length; cardFlipped = false; renderCard(); });
  $('showHint').addEventListener('click', () => { const cur = quizQuestions[activeQuestion]; explainBoxEl.textContent = `Gợi ý: ${cur.hint}`; explainBoxEl.classList.add('show'); });
  $('nextQuestion').addEventListener('click', goNextQuestion);
  $('restartQuiz').addEventListener('click', restartQuiz);
  $('restartQuizResult').addEventListener('click', restartQuiz);

  // ─── Initial render ─────────────────────────────────────────────────────────
  populateMonthYearSelects();
  renderState(); renderChat(); renderCard(); renderQuestion(); drawInfographicCharts();
  window.addEventListener('resize', drawInfographicCharts);

  // Nạp dữ liệu thật từ IndexedDB (water + chat của hôm nay, và toàn bộ lịch sử ml để vẽ calendar) —
  // chạy async sau lần render đầu (placeholder) để UI hiện ngay, không phải đợi IndexedDB mở xong.
  loadInitialState().then(() => {
    renderState(); renderChat();
  }).catch((e) => console.error('[Bé Mèo Nước] loadInitialState error:', e));

  // ─── Proof restore retry logic ───────────────────────────────────────────────
  let proofRestoreAttempts = 0;
  let proofRestoreTimeoutId = null;
  let destroyed = false;
  const MAX_PROOF_RESTORE_ATTEMPTS = 10;
  function requestPendingProofRestore() {
    if (destroyed) return;
    const stillPending = Object.entries(proofMap).filter(([, v]) => v === '__PENDING__').map(([pid]) => pid);
    if (stillPending.length === 0) return;
    proofRestoreAttempts++;
    window.postMessage({ type: 'BE_MEO_PROOF_RESTORE_REQUEST', pendingProofIds: stillPending }, '*');
    if (proofRestoreAttempts < MAX_PROOF_RESTORE_ATTEMPTS) {
      proofRestoreTimeoutId = setTimeout(requestPendingProofRestore, 500 * proofRestoreAttempts);
    }
  }
  requestPendingProofRestore();

  // ─── Cleanup function — trả về trực tiếp, KHÔNG cần window bridge ───────────
  return function beMeoNuocCleanup() {
    destroyed = true;
    if (proofRestoreTimeoutId) clearTimeout(proofRestoreTimeoutId);
    window.removeEventListener('resize', drawInfographicCharts);
    window.removeEventListener(SYNC_EVENT, onSyncEvent);
    window.removeEventListener('message', onWindowMessage);
  };
}
