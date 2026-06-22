import { useEffect, useRef, useState, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { completeHealthJourneyActivity, HEALTH_JOURNEY_EVENT, getTaskSnapshot, XP_TABLE, ACTIVITY_TASK_MAP, checkAndUnlockChapters } from './services/healthJourneyStorage.js'
import { dataUrlToFile, drawAIWaterBottleOverlay, saveWaterProofImage, syncBeMeoWater } from './services/waterProofUpload.js'
import dailyTasksData from './data/daily_tasks.json'
import journeysData from './data/journeys.json'
import TaskDetailPopup from './TaskDetailPopup.jsx'
import JourneyDetailPopup from './JourneyDetailPopup.jsx'
import HelpButton from './help/HelpButton.jsx'
import HelpOverlay from './help/HelpOverlay.jsx'

const MEDIAPIPE_OBJECT_DETECTION_WEBCAM_URL = '/src/mediapipe-khanh/index.html?mode=webcam#/vision/object_detector'

// ─── Helpers to build dynamic content maps from JSON data ───
const UNIT_LABEL_MAP = {
  bottle_photo: 'lần', minutes: 'phút', day: 'ngày', pages: 'trang',
  times: 'lần', entry: 'entry', steps: 'bước', file: 'file',
}

function buildTaskDetailContent(tasks) {
  const map = {}
  tasks.forEach((task) => {
    map[task.taskId] = {
      icon: task.icon,
      title: task.title?.vi || task.title?.en || task.taskId,
      subtitle: task.title?.en || task.taskId,
      reward: `+${task.xp} XP`,
      unitLabel: UNIT_LABEL_MAP[task.unit] || task.unit || 'lần',
      activityType: task.activityType,
      target: task.target,
      requiresProof: task.requiresProof || false,
      camera: task.proofCapture === 'webcam_bottle_photo',
    }
  })
  return map
}

// Mission metadata keyed by activityType (obj.task) — PHẢI khớp với MISSION_META
// trong JourneyDetailPopup.jsx và RELATED_META trong TaskDetailPopup.jsx.
// KHÔNG dùng index vì thứ tự requiredObjectives trong journeys.json có thể đổi.
const CHAPTER_MISSION_META = {
  drink_water:        { key: 'first_step',   icon: '🌅', label: 'First Step' },
  breath_activation:  { key: 'breath',        icon: '🌬', label: 'Breath' },
  walk_10000_steps:   { key: 'stride',        icon: '🚶', label: 'Stride' },
  deep_work_90m:      { key: 'focus',         icon: '🎯', label: 'Focus' },
  read_20_pages:      { key: 'breakthrough',  icon: '📚', label: 'Breakthrough' },
  no_sugar_challenge: { key: 'challenge',     icon: '🚫', label: 'Challenge' },
  cold_shower:        { key: 'flow',          icon: '💧', label: 'Flow' },
  reflection_journal: { key: 'work',          icon: '💼', label: 'Work' },
}

// Build chapter objectives list from journeys.json chapter 1
function buildChapterDetailContent(journeys) {
  const chapter1 = journeys.find((j) => j.chapter === 1)
  if (!chapter1?.requiredObjectives) return {}
  const map = {}
  chapter1.requiredObjectives.forEach((obj, i) => {
    const meta = CHAPTER_MISSION_META[obj.task] || { key: `step_${i}`, icon: '⭐', label: obj.task }
    map[meta.key] = {
      taskId: ACTIVITY_TASK_MAP[obj.task] || obj.task, // 'drink_water' → 'water' (khớp với daily_tasks.json taskId)
      activityType: obj.task,                          // 'drink_water' (khớp với journeyProgress.objectives)
      icon: meta.icon,
      title: `The ${meta.label}`,
      subtitle: obj.title?.vi || obj.title?.en || `Hoàn thành ${obj.target} lần`,
      target: obj.target,
    }
  })
  return map
}

const TASK_DETAIL_CONTENT = buildTaskDetailContent(dailyTasksData.tasks || [])
const CHAPTER_DETAIL_CONTENT = buildChapterDetailContent(journeysData.journeys || [])

function taskPercent(task) {
  if (!task?.target) return 0
  return Math.min(100, Math.round((Number(task.current || 0) / Number(task.target || 1)) * 100))
}

const screenNavMap = {
  'screen-home': 'nav-home',
  'screen-nhiem-vu': 'nav-nhiem-vu',
  'screen-hanh-trinh': 'nav-hanh-trinh',
  'screen-ai-coach': null,
  'screen-cua-hang': 'nav-cua-hang',
  'screen-rewards': 'nav-rewards',
  'screen-profile': 'nav-profile',
}

const styles = String.raw`
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --bg-deep: #050812;
    --bg-card: #0d1528;
    --bg-card2: #111d35;
    --bg-modal: #0a1220;
    --border: rgba(80,160,255,0.18);
    --border2: rgba(100,80,220,0.22);
    --blue: #3b82f6;
    --blue-glow: #60a5fa;
    --purple: #8b5cf6;
    --purple-glow: #a78bfa;
    --cyan: #06b6d4;
    --gold: #f59e0b;
    --gem: #38bdf8;
    --fire: #ef4444;
    --green: #22c55e;
    --orange: #f97316;
    --text: #e2e8f0;
    --text-dim: #94a3b8;
    --text-muted: #64748b;
    --accent: #7c3aed;
  }

  .health-journey-standalone-container * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }

  /* ─── APP SHELL ─── */
  .health-journey-standalone-container #app {
    width:100%; flex:1;
    display:flex; flex-direction:column;
    position: relative;
    background: var(--bg-deep);
    font-family: 'Inter', sans-serif;
    color: var(--text);
    overflow: hidden;
    min-height: 0;
  }

  /* ─── SCREENS ─── */
  .screen {
    display: none;
    flex-direction: column;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 70px;
    background: var(--bg-deep);
  }
  .screen.active { display: flex; }

  /* ─── MODALS / SUB-SCREENS ─── */
  .modal-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0,0,0,0.85);
    flex-direction: column;
    overflow-y: auto;
  }
  .modal-overlay.active { display: flex; }
  .modal-box {
    background: var(--bg-modal);
    border: 1px solid var(--border2);
    border-radius: 16px;
    margin: 60px 12px 80px;
    padding: 16px;
    position: relative;
    flex-shrink: 0;
  }
  .modal-close {
    position: absolute;
    top: 12px; right: 12px;
    width:28px; height:28px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--border);
    border-radius:50%;
    cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-size:14px; color:var(--text-dim);
    z-index:10;
  }

  /* ─── BOTTOM NAV ─── */
  #bottom-nav {
    position:fixed; bottom:0; left:0; right:0;
    height:64px;
    background: rgba(8,14,30,0.97);
    border-top: 1px solid var(--border);
    display:flex; align-items:center;
    z-index:100;
    backdrop-filter: blur(12px);
  }
  .nav-item {
    flex:1; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:3px;
    cursor:pointer; padding:8px 0;
    position:relative;
  }
  .nav-item .nav-icon { font-size:20px; transition:.2s; }
  .nav-item .nav-label { font-size:9px; color:var(--text-muted); font-weight:500; letter-spacing:.3px; }
  .nav-item.active .nav-label { color: var(--blue-glow); }
  .nav-item.active .nav-icon { transform: scale(1.1); }
  .nav-center {
    width:56px; height:56px; border-radius:50%;
    background: linear-gradient(135deg, var(--purple) 0%, var(--blue) 100%);
    display:flex; align-items:center; justify-content:center;
    box-shadow: 0 0 20px rgba(139,92,246,0.5);
    margin-top:-20px;
    font-size:22px;
    cursor:pointer;
  }

  /* ─── TOP HEADER ─── */
  .top-bar {
    display:flex; align-items:center; justify-content:space-between;
    padding: 14px 16px 10px;
    background: linear-gradient(180deg, rgba(10,18,40,0.98) 0%, transparent 100%);
    position: sticky; top:0; z-index:50;
  }
  .top-bar-title {
    font-family:'Rajdhani',sans-serif;
    font-size:18px; font-weight:700;
    background: linear-gradient(90deg, var(--blue-glow), var(--purple-glow));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .currency-row {
    display:flex; align-items:center; gap:8px;
  }
  .currency-badge {
    display:flex; align-items:center; gap:4px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    border-radius:20px; padding:3px 8px;
    font-size:11px; font-weight:600;
  }

  /* ─── CARDS ─── */
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius:12px;
    padding:14px;
    margin: 0 12px 10px;
  }
  .card-title {
    font-family:'Rajdhani',sans-serif;
    font-size:12px; font-weight:600;
    color: var(--text-dim); letter-spacing:1px;
    text-transform:uppercase; margin-bottom:10px;
  }

  /* ─── BUTTONS ─── */
  .btn-primary {
    width:100%; padding:12px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%);
    border:none; border-radius:8px;
    color:#fff; font-family:'Rajdhani',sans-serif;
    font-size:14px; font-weight:700; letter-spacing:.5px;
    cursor:pointer; transition:.15s;
  }
  .btn-primary:active { opacity:.85; transform:scale(.98); }
  .btn-outline {
    padding:8px 16px;
    background: transparent;
    border: 1px solid var(--blue);
    border-radius:8px; color:var(--blue-glow);
    font-size:12px; font-weight:600; cursor:pointer;
  }
  .btn-sm {
    padding:6px 12px; border-radius:6px;
    font-size:11px; font-weight:600;
    cursor:pointer; border:none;
  }

  /* ─── PROGRESS BAR ─── */
  .progress-wrap { background:rgba(255,255,255,0.07); border-radius:99px; overflow:hidden; }
  .progress-bar { height:100%; border-radius:99px; transition:.3s; }


  .mission-proof-card { border:1px solid rgba(56,189,248,.28); border-radius:14px; overflow:hidden; background:#020617; margin-top:12px; }
  .mission-ai-frame { width:100%; min-height:560px; border:0; display:block; background:#020617; }
  .mission-ai-note { padding:10px; border-bottom:1px solid rgba(56,189,248,.18); background:rgba(8,47,73,.34); color:#bae6fd; font-size:12px; line-height:1.45; }
  .mission-camera-stage { height:260px; position:relative; display:grid; place-items:center; color:#bae6fd; text-align:center; overflow:hidden; }
  .mission-camera-stage video, .mission-camera-stage img { width:100%; height:100%; object-fit:cover; display:block; }
  .mission-ai-hud { position:absolute; inset:10px; pointer-events:none; border:1px solid rgba(56,189,248,.34); border-radius:12px; box-shadow:inset 0 0 28px rgba(14,165,233,.18); }
  .mission-ai-hud::before { content:'AI Object Detection · water bottle 0.96'; position:absolute; left:10px; top:10px; padding:5px 8px; border-radius:999px; background:rgba(2,6,23,.78); color:#67e8f9; font-size:10px; font-weight:800; }
  .mission-ai-hud::after { content:''; position:absolute; left:32%; top:18%; width:36%; height:62%; border:2px dashed rgba(34,197,94,.86); border-radius:18px; box-shadow:0 0 18px rgba(34,197,94,.28); }
  .mission-camera-actions { display:flex; gap:8px; padding:10px; background:rgba(2,6,23,.94); }
  .mission-proof-img { width:100%; max-height:320px; object-fit:cover; border-radius:12px; border:1px solid rgba(56,189,248,.28); margin-top:10px; }
  .mission-error { margin-top:10px; padding:10px; border-radius:10px; background:rgba(239,68,68,.16); color:#fecaca; font-size:12px; }

  /* ─── HERO BANNER (Home) ─── */
  .hero-banner {
    margin:0 12px 10px;
    border-radius:14px; overflow:hidden;
    background: linear-gradient(135deg, #0f1a3a 0%, #1a0a3a 50%, #0a1228 100%);
    border: 1px solid var(--border2);
    padding:20px 16px;
    position:relative;
    min-height:180px;
    display:flex; flex-direction:column; justify-content:flex-end;
  }
  .hero-banner::before {
    content:'';
    position:absolute; inset:0;
    background: radial-gradient(circle at 70% 40%, rgba(139,92,246,0.25) 0%, transparent 60%);
    pointer-events: none;
  }
  .hero-avatar {
    position:absolute; right:16px; top:50%; transform:translateY(-50%);
    font-size:64px; opacity:.7;
  }
  .hero-tag {
    font-size:9px; font-weight:700; letter-spacing:2px;
    color:var(--purple-glow); text-transform:uppercase; margin-bottom:6px;
  }
  .hero-name { font-family:'Rajdhani',sans-serif; font-size:22px; font-weight:700; color:#fff; }
  .hero-sub { font-size:11px; color:var(--text-dim); margin: 4px 0 12px; line-height:1.5; }

  /* ─── XP BAR ─── */
  .xp-section { margin: 0 12px 10px; }
  .xp-label { display:flex; justify-content:space-between; font-size:11px; color:var(--text-dim); margin-bottom:4px; }
  .xp-bar-wrap { height:6px; background:rgba(255,255,255,0.07); border-radius:99px; overflow:hidden; }
  .xp-bar { height:6px; width:70%; background:linear-gradient(90deg,var(--purple),var(--blue)); border-radius:99px; }

  /* ─── STAT GRID ─── */
  .stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin:0 12px 10px; }
  .stat-item {
    background:var(--bg-card); border:1px solid var(--border);
    border-radius:10px; padding:10px 8px; text-align:center;
  }
  .stat-value { font-family:'Rajdhani',sans-serif; font-size:22px; font-weight:700; color:var(--blue-glow); }
  .stat-label { font-size:9px; color:var(--text-muted); letter-spacing:.5px; margin-top:2px; }

  /* ─── TASK ITEM ─── */
  .task-item {
    display:flex; align-items:center; gap:10px;
    padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);
  }
  .task-item.clickable { cursor:pointer; border-radius:10px; padding:10px 8px; margin:0 -8px; transition:.16s ease; }
  .task-item.clickable:hover { background:rgba(59,130,246,.10); border-color:rgba(96,165,250,.34); box-shadow:0 0 0 1px rgba(96,165,250,.14), 0 12px 26px rgba(2,6,23,.24); transform:translateY(-1px); }
  .task-item.clickable:active { transform:scale(.99); }
  .task-item:last-child { border-bottom:none; }
  .task-icon { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .task-info { flex:1; min-width:0; }
  .task-name { font-size:13px; font-weight:600; }
  .task-desc { font-size:10px; color:var(--text-dim); margin-top:1px; }
  .task-prog { font-size:10px; font-weight:700; color:var(--blue-glow); }
  .task-check { width:22px; height:22px; border-radius:50%; border:2px solid var(--border); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .task-check.done { background:var(--green); border-color:var(--green); }

  /* ─── CHAPTER ITEM ─── */
  .chapter-item {
    display:flex; align-items:center; gap:12px;
    background:var(--bg-card2); border:1px solid var(--border);
    border-radius:10px; padding:10px 12px; margin-bottom:8px;
    cursor:pointer; transition:.15s;
  }
  .chapter-item:active { opacity:.85; }
  .chapter-thumb { width:44px; height:44px; border-radius:8px; overflow:hidden; font-size:24px; display:flex; align-items:center; justify-content:center; background:rgba(139,92,246,.2); flex-shrink:0; }
  .chapter-info { flex:1; }
  .chapter-num { font-size:9px; color:var(--text-muted); letter-spacing:1px; text-transform:uppercase; }
  .chapter-name { font-family:'Rajdhani',sans-serif; font-size:14px; font-weight:700; }
  .chapter-prog { font-size:10px; color:var(--blue-glow); margin-top:2px; }

  /* ─── AI PULSE ─── */
  .ai-orb {
    width:100px; height:100px; border-radius:50%; margin:0 auto;
    background: radial-gradient(circle, #1e3a6e 0%, #0a1228 70%);
    border: 2px solid var(--blue);
    box-shadow: 0 0 30px rgba(59,130,246,0.4), inset 0 0 20px rgba(59,130,246,0.1);
    display:flex; align-items:center; justify-content:center;
    font-family:'Rajdhani',sans-serif; font-size:26px; font-weight:700;
    color:var(--blue-glow);
    animation: pulse-orb 2s ease-in-out infinite;
  }
  @keyframes pulse-orb { 0%,100%{box-shadow:0 0 30px rgba(59,130,246,0.4)} 50%{box-shadow:0 0 50px rgba(59,130,246,0.7)} }

  /* ─── SHOP ITEM ─── */
  .shop-item {
    background:var(--bg-card2); border:1px solid var(--border);
    border-radius:10px; padding:12px;
    display:flex; align-items:center; gap:10px; margin-bottom:8px;
    cursor:pointer;
  }
  .shop-thumb { width:40px; height:40px; border-radius:8px; font-size:22px; display:flex; align-items:center; justify-content:center; background:rgba(245,158,11,.15); flex-shrink:0; }

  /* ─── LEADERBOARD ─── */
  .lb-item { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
  .lb-rank { width:26px; text-align:center; font-family:'Rajdhani',sans-serif; font-size:16px; font-weight:700; }
  .lb-avatar { width:34px; height:34px; border-radius:50%; background:rgba(139,92,246,.25); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .lb-info { flex:1; }
  .lb-name { font-size:13px; font-weight:600; }
  .lb-level { font-size:10px; color:var(--text-dim); }
  .lb-xp { font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:700; color:var(--gold); }

  /* ─── REWARDS ─── */
  .reward-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); }

  /* ─── DAILY REWARD GRID ─── */
  .day-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
  .day-item { text-align:center; padding:8px 2px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:8px; }
  .day-item.claimed { background:rgba(34,197,94,.1); border-color:var(--green); }
  .day-item.today { background:rgba(245,158,11,.12); border-color:var(--gold); }
  .day-label { font-size:8px; color:var(--text-muted); margin-bottom:4px; }
  .day-check { font-size:14px; }

  /* ─── TABS ─── */
  .tab-row { display:flex; gap:0; margin-bottom:12px; background:rgba(255,255,255,0.04); border-radius:8px; padding:3px; }
  .tab-btn { flex:1; padding:6px; text-align:center; font-size:11px; font-weight:600; color:var(--text-dim); border-radius:6px; cursor:pointer; border:none; background:transparent; }
  .tab-btn.active { background:var(--bg-card2); color:var(--blue-glow); }

  /* ─── NOTIFICATION ─── */
  .notif-item { display:flex; gap:10px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
  .notif-icon { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .notif-body { flex:1; }
  .notif-title { font-size:12px; font-weight:600; }
  .notif-time { font-size:10px; color:var(--text-muted); margin-top:2px; }

  /* ─── SKILL TREE NODE ─── */
  .skill-node {
    text-align:center; cursor:pointer;
  }
  .skill-circle {
    width:56px; height:56px; border-radius:50%;
    border:2px solid var(--border2);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    margin:0 auto 4px; font-size:18px;
    background:var(--bg-card);
  }
  .skill-circle.unlocked { border-color:var(--purple); box-shadow:0 0 12px rgba(139,92,246,.4); }
  .skill-circle.maxed { border-color:var(--gold); box-shadow:0 0 12px rgba(245,158,11,.4); }
  .skill-node-name { font-size:9px; color:var(--text-dim); max-width:60px; margin:0 auto; line-height:1.3; }
  .skill-node-level { font-size:8px; color:var(--text-muted); }

  /* ─── ACHIEVEMENT ─── */
  .ach-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .ach-item { text-align:center; }
  .ach-icon { width:56px; height:56px; border-radius:12px; margin:0 auto 6px; display:flex; align-items:center; justify-content:center; font-size:24px; }
  .ach-icon.locked { background:rgba(255,255,255,0.04); border:1px solid var(--border); filter:grayscale(1) opacity(.4); }
  .ach-icon.unlocked { background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.4); }
  .ach-name { font-size:10px; color:var(--text-dim); line-height:1.3; }

  /* ─── LEVEL UP MODAL ─── */
  .level-badge {
    width:100px; height:100px; border-radius:50%;
    background: conic-gradient(var(--gold) 0%, var(--orange) 50%, var(--gold) 100%);
    box-shadow: 0 0 40px rgba(245,158,11,.6);
    display:flex; align-items:center; justify-content:center;
    margin:0 auto 12px;
    font-family:'Rajdhani',sans-serif; font-size:36px; font-weight:900; color:#fff;
  }

  /* ─── STATS CHART (simple bars) ─── */
  .stat-bar-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .stat-bar-label { font-size:10px; width:80px; flex-shrink:0; }
  .stat-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,.07); border-radius:99px; overflow:hidden; }
  .stat-bar-fill { height:6px; border-radius:99px; }

  /* ─── SECTION HEAD ─── */
  .section-head { display:flex; justify-content:space-between; align-items:center; margin:0 12px 8px; }
  .section-head-title { font-family:'Rajdhani',sans-serif; font-size:14px; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:.5px; }

  /* ─── GLOW DIVIDER ─── */
  .glow-line { height:1px; background:linear-gradient(90deg,transparent,var(--purple),transparent); margin:12px 0; }

  /* ─── FLOATING BADGE ─── */
  .badge { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:600; }
  .badge-blue { background:rgba(59,130,246,.15); border:1px solid rgba(59,130,246,.3); color:var(--blue-glow); }
  .badge-green { background:rgba(34,197,94,.15); border:1px solid rgba(34,197,94,.3); color:#4ade80; }
  .badge-gold { background:rgba(245,158,11,.15); border:1px solid rgba(245,158,11,.3); color:var(--gold); }
  .badge-purple { background:rgba(139,92,246,.15); border:1px solid rgba(139,92,246,.3); color:var(--purple-glow); }

  /* scroll bar */
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(100,120,180,.3); border-radius:99px; }

  /* ─── MISSION SUBPAGE COLORS ─── */
  .icon-bg-purple { background:rgba(139,92,246,.2); }
  .icon-bg-blue   { background:rgba(59,130,246,.2); }
  .icon-bg-green  { background:rgba(34,197,94,.2); }
  .icon-bg-gold   { background:rgba(245,158,11,.2); }
  .icon-bg-cyan   { background:rgba(6,182,212,.2); }

  /* analysis quadrant */
  .ai-quad-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .ai-quad { background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:10px; padding:12px; text-align:center; }
  .ai-quad-icon { font-size:24px; margin-bottom:4px; }
  .ai-quad-label { font-size:10px; color:var(--text-dim); }

  /* profile stats hex */
  .hex-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:0 0 10px; }
  .hex-stat { background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:8px; padding:8px 4px; text-align:center; }
  .hex-stat-val { font-family:'Rajdhani',sans-serif; font-size:20px; font-weight:700; }
  .hex-stat-name { font-size:9px; color:var(--text-dim); }

  /* inbody scan area */
  .scan-area { border:1.5px dashed rgba(59,130,246,.4); border-radius:10px; padding:16px; text-align:center; background:rgba(59,130,246,.04); }
`

export default function HealthJourneyGameStandalone({ onViewMedicalRecord }) {
  const containerRef = useRef(null)
  const { user } = useAuth()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [snapshot, setSnapshot] = useState(() => getTaskSnapshot(user))
  const [selectedTaskKey, setSelectedTaskKey] = useState('deep_work')
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [savingProof, setSavingProof] = useState(false)
  const [lastMissionRecord, setLastMissionRecord] = useState(null)
  // ── Active screen state (replaces DOM class mutation) ──
  const [activeScreen, setActiveScreen] = useState('screen-home')
  // ── Popup state (replaces DOM-based modal-task-detail / modal-chapter-detail) ──
  const [taskPopupKey, setTaskPopupKey] = useState(null)    // taskId | null
  const [journeyPopupKey, setJourneyPopupKey] = useState(null) // chapterKey | 'overview' | null
  // ── Help Center overlay state ──
  // Tự động mở Help Center ngay khi vào trang Health Journey Game (mỗi lần mount lại trang
  // này — vì panel bị unmount/remount mỗi khi chuyển qua trang khác rồi quay lại, theo App.jsx).
  // User bấm nút "✕" trong HelpOverlay (đã có sẵn, gọi onClose) để đóng khi không cần nữa.
  const [helpOpen, setHelpOpen] = useState(true)

  useEffect(() => {
    const refreshSnapshot = () => {
      setSnapshot(getTaskSnapshot(user))
      // Tự động unlock chapter nếu đủ điều kiện
      checkAndUnlockChapters(user, journeysData.journeys || [])
    }
    window.addEventListener(HEALTH_JOURNEY_EVENT, refreshSnapshot)
    return () => window.removeEventListener(HEALTH_JOURNEY_EVENT, refreshSnapshot)
  }, [user])

  useEffect(() => () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop())
  }, [])


  useEffect(() => {
    const onMediaPipeCapture = async (event) => {
      if (event.origin !== window.location.origin) return

      // ✅ "Xem hình tại Medical Records" từ iframe luôn hoạt động, không cần modal mở
      if (event.data?.type === 'AI_CLINIC_OPEN_UPLOAD_RECORDS') {
        if (onViewMedicalRecord) { onViewMedicalRecord() } else { window.dispatchEvent(new CustomEvent('navigate-to-upload')) }
        return
      }

      const isWebcamCapture = event.data?.type === 'AI_CLINIC_MEDIAPIPE_WEBCAM_CAPTURE'
      const isImageCapture  = event.data?.type === 'AI_CLINIC_MEDIAPIPE_IMAGE_CAPTURE'
      if (!isWebcamCapture && !isImageCapture) return

      const taskDetailOpen = getRoot()?.querySelector('#modal-task-detail')?.classList.contains('active')
      if (!taskDetailOpen || !event.data?.dataUrl) return

      const captureKind = isWebcamCapture ? 'webcam' : 'image'
      const task = TASK_DETAIL_CONTENT[selectedTaskKey] || TASK_DETAIL_CONTENT.deep_work
      setSavingProof(true)
      setCameraError('')
      try {
        const xpEarned = XP_TABLE[task.activityType] || 0
        const defaultFilename = isWebcamCapture ? `${selectedTaskKey}_ai_webcam.jpg` : `${selectedTaskKey}_ai_image.jpg`
        const file = dataUrlToFile(event.data.dataUrl, event.data.filename || defaultFilename)
        const record = await saveWaterProofImage(file, user, {
          source: `health-journey-game-task-detail-ai-healthcare-vision-${captureKind}`,
          notesPrefix: `Health Journey Game · Chi tiết Nhiệm Vụ · ${task.title}`,
          activityType: task.activityType,
          taskId: selectedTaskKey,
          xpEarned,
          waterAmountMl: selectedTaskKey === 'water' ? 150 : 0,
          proofType: `ai_healthcare_vision_object_detection_${captureKind}_overlay`,
        })
        completeHealthJourneyActivity({
          user,
          activityType: task.activityType,
          value: 1,
          proofImage: record.uploadPath,
          uploadRecord: record,
          metadata: { source: `health-journey-game-task-detail-ai-healthcare-vision-${captureKind}`, flow: `Chi tiết Nhiệm Vụ -> AI Healthcare Vision Control Object Detection ${captureKind} -> Upload proof` },
        })
        if (selectedTaskKey === 'water') syncBeMeoWater(150, `Health Journey Game · AI Healthcare Vision ${captureKind} proof`)
        setLastMissionRecord(record)
        event.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVED', captureKind, uploadPath: record.uploadPath }, event.origin)
      } catch (error) {
        setCameraError(error?.message || `Không thể lưu ảnh AI Healthcare Vision ${captureKind} proof.`)
        event.source?.postMessage?.({ type: 'AI_CLINIC_MEDIAPIPE_CAPTURE_SAVE_FAILED', captureKind, message: error?.message || String(error) }, event.origin)
      } finally {
        setSavingProof(false)
      }
    }

    window.addEventListener('message', onMediaPipeCapture)
    return () => window.removeEventListener('message', onMediaPipeCapture)
  }, [selectedTaskKey, user, onViewMedicalRecord])

  const todayTask = (taskId) => snapshot.day?.tasks?.find((task) => task.taskId === taskId)
  const journeyObjective = (activityType) => snapshot.journeyUser?.journeyProgress?.objectives?.find((objective) => objective.activityType === activityType)
  const taskProgressLabel = (taskId, fallback) => {
    const task = todayTask(taskId)
    return task ? `${task.current}/${task.target}` : fallback
  }
  const isTaskDone = (taskId) => Boolean(todayTask(taskId)?.completed)
  const waterObjective = journeyObjective('drink_water')
  const journeyProfile = snapshot.journeyUser?.profile || {}
  const selectedTask = TASK_DETAIL_CONTENT[selectedTaskKey] || TASK_DETAIL_CONTENT.deep_work
  const selectedTaskState = todayTask(selectedTaskKey)
  const selectedProof = (lastMissionRecord?.healthJourney?.activityType === selectedTask.activityType ? lastMissionRecord : null)
    || snapshot.journeyUser?.proofImages?.find((proof) => proof.activityType === selectedTask.activityType && proof.capturedAt?.slice(0, 10) === new Date().toISOString().slice(0, 10))
    || snapshot.journeyUser?.proofImages?.find((proof) => proof.activityType === selectedTask.activityType)
  const selectedTaskPct = taskPercent(selectedTaskState)

  // Dynamic lists from JSON data
  const allTasks = dailyTasksData.tasks || []
  const allJourneys = journeysData.journeys || []

  const getRoot = () => containerRef.current

  const goTo = (screenId) => {
    setHelpOpen(false)           // ẩn helper popup khi điều hướng
    setActiveScreen(screenId)
    // Scroll to top of the new screen after render
    setTimeout(() => {
      getRoot()?.querySelector(`#${screenId}`)?.scrollTo?.(0, 0)
    }, 0)
  }

  const openModal = (id) => {
    const modal = getRoot()?.querySelector(`#${id}`)
    if (!modal) return

    modal.classList.add('active')
    modal.scrollTop = 0
  }

  const openTaskDetail = (taskKey) => {
    setSelectedTaskKey(taskKey)
    setCameraError('')
    // FIX: KHÔNG mở modal DOM cũ ('modal-task-detail') nữa.
    // Trước đây mở cả modal cũ + popup React mới cùng lúc khiến CẢ HAI
    // postMessage listener (onMediaPipeCapture ở đây + listener trong
    // TaskDetailPopup.jsx) cùng nhận 1 event capture → completeHealthJourneyActivity
    // bị gọi 2 lần cho 1 lần chụp ảnh → đếm sai / không đồng bộ số lần uống nước.
    setTaskPopupKey(taskKey)          // new React popup — nguồn sự thật duy nhất
  }

  const openChapterMissionDetail = (chapterKey) => {
    const chapter = CHAPTER_DETAIL_CONTENT[chapterKey] || CHAPTER_DETAIL_CONTENT.focus
    closeModal('modal-chapter-detail')
    openTaskDetail(chapter.taskId)
  }

  // New popup openers
  const openTaskPopup = (taskId) => { setTaskPopupKey(taskId) }
  const openJourneyPopup = (chapterKey) => { setJourneyPopupKey(chapterKey || 'overview') }

  // ── Help Center → live app deep-link ──
  // Each HELP_SCREENS entry carries a `target` describing where it lives
  // in the real app: { screen, modal?, taskPopup?, journeyPopup? }
  const handleHelpNavigate = (target) => {
    if (!target) { setHelpOpen(false); return }
    setHelpOpen(false)
    if (target.screen) goTo(target.screen)
    setTimeout(() => {
      if (target.modal) openModal(target.modal)
      if (target.taskPopup) openTaskPopup(selectedTaskKey || 'deep_work')
      if (target.journeyPopup) openJourneyPopup('overview')
    }, 80)
  }

  const startWaterCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch (error) {
      setCameraError(error?.message || 'Không thể mở Webcam. Hãy cấp quyền camera cho trình duyệt.')
    }
  }

  const stopWaterCamera = () => {
    streamRef.current?.getTracks?.().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  const captureWaterProof = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setSavingProof(true)
    setCameraError('')
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      drawAIWaterBottleOverlay(ctx, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const file = dataUrlToFile(dataUrl, 'health_journey_water_bottle.jpg')
      const record = await saveWaterProofImage(file, user, { source: 'health-journey-game-task-detail', notesPrefix: 'Health Journey Game · Chi tiết Nhiệm Vụ · Uống nước' })
      completeHealthJourneyActivity({
        user,
        activityType: 'drink_water',
        value: 1,
        proofImage: record.uploadPath,
        uploadRecord: record,
        metadata: { source: 'health-journey-game-task-detail', flow: 'Chi tiết Nhiệm Vụ -> AI Webcam -> Upload -> Bé Mèo +150ml' },
      })
      syncBeMeoWater(150, 'Health Journey Game · Chụp chai nước')
      setLastMissionRecord(record)
      stopWaterCamera()
    } catch (error) {
      setCameraError(error?.message || 'Không thể lưu ảnh chai nước.')
    } finally {
      setSavingProof(false)
    }
  }

  const closeModal = (id) => {
    getRoot()?.querySelector(`#${id}`)?.classList.remove('active')
    if (id === 'modal-task-detail') stopWaterCamera()
  }

  const showLockedChapter = (name, msg, icon) => {
    const root = getRoot()
    if (!root) return

    const nameEl = root.querySelector('#locked-chapter-name')
    const msgEl = root.querySelector('#locked-chapter-msg')
    const iconEl = root.querySelector('#locked-chapter-icon')

    if (nameEl) nameEl.textContent = name
    if (msgEl) msgEl.textContent = msg
    if (iconEl) iconEl.textContent = icon

    openModal('modal-locked-chapter')
  }

  const switchTab = (btn) => {
    const parent = btn.closest('.tab-row')
    if (!parent) return

    parent.querySelectorAll('.tab-btn').forEach((tabButton) => {
      tabButton.classList.remove('active')
    })
    btn.classList.add('active')
  }

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      event.currentTarget.classList.remove('active')
    }
  }

  return (
    <div ref={containerRef} className="health-journey-standalone-container">
      <style>{styles}</style>
      <div id="app">
        {/* ═══════════════════════════════ SCREEN 1: TRANG CHỦ ═══════════════════════════════ */}
        <div className="screen" style={{display: activeScreen === 'screen-home' ? 'flex' : 'none', flexDirection:'column', flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:'70px', background:'var(--bg-deep)'}} id="screen-home">
          <div className="top-bar">
            <div className="top-bar-title">
              ⚔ NEURO QUEST
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div className="currency-badge">
                🪙 {journeyProfile.xp || 2450}
              </div>
              <div className="currency-badge" style={{ color: "#38bdf8" }}>
                💎 {journeyProfile.energy || 340}
              </div>
              <div className="currency-badge" style={{ color: "#ef4444" }}>
                🔥 {journeyProfile.coins || 6000}
              </div>
              <span onClick={(event) => { openModal('modal-notif'); }} style={{ fontSize: "20px", cursor: "pointer", marginLeft: "4px" }}>
                🔔
              </span>
            </div>
          </div>
          {/* Hero */}
          <div className="hero-banner">
            <div className="hero-avatar">
              🥷
            </div>
            <div className="hero-tag">
              Shadow Warrior · Lv. 12
            </div>
            <div className="hero-name">
              BẮT ĐẦU
              <br />
              HÀNH TRÌNH CHIẾN BINH
            </div>
            <div className="hero-sub">
              Nâng cấp thể chất, tinh thần và trí tuệ
              <br />
              để chinh phục phiên bản tốt nhất.
            </div>
            <button className="btn-primary" onClick={(event) => { goTo('screen-nhiem-vu'); }} style={{ maxWidth: "160px" }}>
              BẮT ĐẦU
            </button>
            <button
              className="btn-primary"
              onClick={() => onViewMedicalRecord ? onViewMedicalRecord() : window.dispatchEvent(new CustomEvent('navigate-to-upload'))}
              style={{ maxWidth: "200px", marginTop: "8px", background: "linear-gradient(135deg,#16a34a,#22c55e)", boxShadow: "0 10px 24px rgba(34,197,94,0.24)", fontSize: "12px" }}
            >
              📷 Xem hình tại Medical Records
            </button>
          </div>
          {/* XP */}
          <div className="xp-section">
            <div className="xp-label">
              <span>
                XP: 4,250 / 6,000
              </span>
              <span>
                Lv. 12 → 13
              </span>
            </div>
            <div className="xp-bar-wrap">
              <div className="xp-bar">
              </div>
            </div>
          </div>
          {/* Quick stats */}
          <div className="stat-grid">
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#60a5fa" }}>
                81
              </div>
              <div className="stat-label">
                FOCUS
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#a78bfa" }}>
                92
              </div>
              <div className="stat-label">
                DISCIPLINE
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#f97316" }}>
                63
              </div>
              <div className="stat-label">
                ENERGY
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#4ade80" }}>
                74
              </div>
              <div className="stat-label">
                HEALTH
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#38bdf8" }}>
                58
              </div>
              <div className="stat-label">
                KNOWLEDGE
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: "#f59e0b" }}>
                46
              </div>
              <div className="stat-label">
                CHARISMA
              </div>
            </div>
          </div>
          {/* Current mission */}
          <div className="card">
            <div className="card-title">
              Nhiệm vụ chính
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "28px" }}>
                ⚔️
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  CHAPTER 1
                </div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "15px", fontWeight: "700" }}>
                  THE AWAKENING
                </div>
                <div className="progress-wrap" style={{ height: "4px", marginTop: "4px", width: "140px" }}>
                  <div className="progress-bar" style={{ width: "66%", background: "linear-gradient(90deg,var(--purple),var(--blue))" }}>
                  </div>
                </div>
              </div>
              <button className="btn-sm" onClick={(event) => { openJourneyPopup('overview') }} style={{ background: "linear-gradient(135deg,var(--purple),var(--blue))", color: "#fff", marginLeft: "auto" }}>
                TIẾP TỤC
              </button>
            </div>
          </div>
          {/* Quick actions */}
          <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div onClick={(event) => { openModal('modal-daily-reward'); }} style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", borderRadius: "10px", padding: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "22px" }}>
                🎁
              </span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--gold)" }}>
                  Daily Reward
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  Nhận thưởng
                </div>
              </div>
            </div>
            <div onClick={(event) => { goTo('screen-rewards'); }} style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.25)", borderRadius: "10px", padding: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "22px" }}>
                🛡
              </span>
              <div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--purple-glow)" }}>
                  Shadow Pass
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  Mở khóa
                </div>
              </div>
            </div>
          </div>
          {/* Quick nav cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", margin: "0 12px 10px" }}>
            <div onClick={(event) => { goTo('screen-ai-coach'); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 6px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "22px" }}>
                🤖
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "4px" }}>
                AI Coach
              </div>
            </div>
            <div onClick={(event) => { goTo('screen-nhiem-vu'); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 6px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "22px" }}>
                📋
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "4px" }}>
                Nhiệm vụ
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-stats'); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 6px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "22px" }}>
                📊
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "4px" }}>
                Thống kê
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-leaderboard'); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 6px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "22px" }}>
                🏆
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "4px" }}>
                Bảng xếp hạng
              </div>
            </div>
          </div>
        </div>
        {/* ═══════════════════════════════ SCREEN 2: NHIỆM VỤ ═══════════════════════════════ */}
        <div className="screen" style={{display: activeScreen === 'screen-nhiem-vu' ? 'flex' : 'none', flexDirection:'column', flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:'70px', background:'var(--bg-deep)'}} id="screen-nhiem-vu">
          <div className="top-bar">
            <div className="top-bar-title">
              📋 NHIỆM VỤ
            </div>
            <div className="currency-badge" style={{ fontSize: "12px" }}>
              {snapshot.day?.xpEarned || 320} / 600 XP
            </div>
          </div>
          {/* Tabs */}
          <div style={{ padding: "0 12px" }}>
            <div className="tab-row">
              <button className="tab-btn active" onClick={(event) => { switchTab(event.currentTarget,'tasks'); }}>
                Hôm nay
              </button>
              <button className="tab-btn" onClick={(event) => { switchTab(event.currentTarget,'tasks'); }}>
                Hàng ngày
              </button>
              <button className="tab-btn" onClick={(event) => { switchTab(event.currentTarget,'tasks'); }}>
                Hàng tuần
              </button>
              <button className="tab-btn" onClick={(event) => { switchTab(event.currentTarget,'tasks'); }}>
                Thành tựu
              </button>
            </div>
          </div>
          {/* Task list - dynamic from daily_tasks.json */}
          <div className="card">
            {allTasks.map((task, idx) => {
              const done = isTaskDone(task.taskId)
              const pct = taskPercent(todayTask(task.taskId))
              const iconBgMap = {
                water: 'icon-bg-blue', breathing: 'icon-bg-cyan', no_sugar: 'icon-bg-gold',
                deep_work: 'icon-bg-blue', cold_shower: 'icon-bg-cyan', read_book: 'icon-bg-purple',
                reflection: 'icon-bg-gold', inbody: 'icon-bg-purple', walk: 'icon-bg-green',
              }
              const iconBg = iconBgMap[task.taskId] || 'icon-bg-blue'
              const proofIcon = task.requiresProof ? '📷' : '○'
              const checkContent = done ? '✓' : proofIcon
              const progressColor = done ? 'var(--green)' : pct > 0 ? 'var(--blue)' : 'transparent'
              return (
                <div
                  key={task.taskId}
                  className="task-item clickable"
                  onClick={(event) => { openTaskPopup(task.taskId) }}
                  style={{
                    borderColor: done ? 'rgba(34,197,94,.34)' : task.requiresProof ? 'rgba(59,130,246,.28)' : undefined,
                    borderBottom: idx === allTasks.length - 1 ? 'none' : undefined,
                  }}
                >
                  <div className={`task-icon ${iconBg}`}>
                    {task.icon}
                  </div>
                  <div className="task-info">
                    <div className="task-name">
                      {task.title?.vi || task.title?.en || task.taskId}
                    </div>
                    <div className="task-desc">
                      {task.activityType} · +{task.xp} XP{task.requiresProof ? ' · cần ảnh proof' : ''}
                    </div>
                    <div style={{ height: "3px", background: "rgba(255,255,255,.07)", borderRadius: "99px", marginTop: "4px", overflow: "hidden" }}>
                      <div style={{ height: "3px", width: `${pct}%`, background: progressColor, borderRadius: "99px" }}>
                      </div>
                    </div>
                  </div>
                  <div className="task-prog" style={{ color: done ? "var(--green)" : pct > 0 ? "var(--blue-glow)" : "var(--text-muted)" }}>
                    {taskProgressLabel(task.taskId, `0/${task.target}`)}
                  </div>
                  <div className={done ? "task-check done" : "task-check"}>
                    {checkContent}
                  </div>
                </div>
              )
            })}
          </div>
          {/* Chest rewards */}
          <div className="card">
            <div className="card-title">
              Điểm nhiệm vụ · 320/600
            </div>
            <div className="progress-wrap" style={{ height: "6px", marginBottom: "12px" }}>
              <div className="progress-bar" style={{ width: "53%", background: "linear-gradient(90deg,var(--blue),var(--purple))" }}>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "28px", opacity: ".5" }}>
                  🎁
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                  🪙 100
                </div>
              </div>
              <div>
                <div style={{ fontSize: "28px", opacity: ".5" }}>
                  🎁
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                  🪙 300
                </div>
              </div>
              <div>
                <div style={{ fontSize: "28px", opacity: ".5" }}>
                  🎁
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                  🪙 600
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: "0 12px 4px" }}>
            <button className="btn-primary" onClick={(event) => { openModal('modal-level-up'); }}>
              NHẬN TẤT CẢ
            </button>
          </div>
          {/* Achievements shortcut */}
          <div className="section-head" style={{ marginTop: "8px" }}>
            <span className="section-head-title">
              Thành tựu gần đây
            </span>
            <span onClick={(event) => { openModal('modal-achievements'); }} style={{ fontSize: "11px", color: "var(--blue-glow)", cursor: "pointer" }}>
              Xem tất cả ›
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", padding: "0 12px 10px", overflowX: "auto" }}>
            <div className="ach-item" style={{ minWidth: "70px" }}>
              <div className="ach-icon unlocked">
                🔥
              </div>
              <div className="ach-name">
                7 Days Streak
              </div>
            </div>
            <div className="ach-item" style={{ minWidth: "70px" }}>
              <div className="ach-icon unlocked">
                🌅
              </div>
              <div className="ach-name">
                Early Bird
              </div>
            </div>
            <div className="ach-item" style={{ minWidth: "70px" }}>
              <div className="ach-icon locked">
                🍬
              </div>
              <div className="ach-name">
                No Sugar 3D
              </div>
            </div>
            <div className="ach-item" style={{ minWidth: "70px" }}>
              <div className="ach-icon locked">
                💼
              </div>
              <div className="ach-name">
                Deep Worker
              </div>
            </div>
          </div>
        </div>
        {/* ═══════════════════════════════ SCREEN 3: HÀNH TRÌNH ═══════════════════════════════ */}
        <div className="screen" style={{display: activeScreen === 'screen-hanh-trinh' ? 'flex' : 'none', flexDirection:'column', flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:'70px', background:'var(--bg-deep)'}} id="screen-hanh-trinh">
          <div className="top-bar">
            <div className="top-bar-title">
              ⚔ HÀNH TRÌNH
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn-sm badge-purple" style={{ border: "none", cursor: "pointer" }}>
                Story Mode
              </button>
              <button className="btn-sm" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-dim)", cursor: "pointer" }}>
                Adventure
              </button>
            </div>
          </div>
          {/* Chapter list - dynamic from journeys.json */}
          {allJourneys.map((journey, idx) => {
            const isChapter1 = journey.chapter === 1
            const isUnlocked = isChapter1 || snapshot.journeyUser?.journeyProgress?.unlockedChapters?.includes(journey.chapter)
            const chapterIcons = ['🌅', '🔥', '⚡', '👑', '⚜️']
            const chapterColors = [
              'rgba(139,92,246,.2)', 'rgba(59,130,246,.2)', 'rgba(239,68,68,.2)',
              'rgba(245,158,11,.2)', 'rgba(139,92,246,.2)',
            ]
            const icon = chapterIcons[idx] || '⭐'
            const bgColor = chapterColors[idx] || chapterColors[0]
            const objectives = journey.requiredObjectives || []
            const totalObjectiveTarget = objectives.reduce((s, o) => s + (o.target || 1), 0)
            const currentObjectiveSum = objectives.reduce((s, o) => {
              const obj = journeyObjective(o.task)
              return s + Math.min(obj?.current || 0, o.target || 1)
            }, 0)
            const chapterPct = totalObjectiveTarget > 0 ? Math.min(100, Math.round(currentObjectiveSum / totalObjectiveTarget * 100)) : 0
            const chapterDone = objectives.length > 0 ? chapterPct >= 100 : isUnlocked

            // Kiểm tra có thể unlock chapter này không
            const prevJourney = idx > 0 ? allJourneys[idx - 1] : null
            const prevDone = prevJourney ? (() => {
              const prevObjs = prevJourney.requiredObjectives || []
              if (prevObjs.length === 0) return snapshot.journeyUser?.journeyProgress?.unlockedChapters?.includes(prevJourney.chapter)
              const prevTgt = prevObjs.reduce((s, o) => s + (o.target || 1), 0)
              const prevCur = prevObjs.reduce((s, o) => {
                const obj = journeyObjective(o.task)
                return s + Math.min(obj?.current || 0, o.target || 1)
              }, 0)
              return prevTgt > 0 && prevCur >= prevTgt
            })() : false
            const canUnlock = !isUnlocked && prevDone

            return (
              <div key={journey.chapter} style={{ margin: '0 12px 8px' }}>
                <div
                  className="chapter-item"
                  onClick={() => {
                    if (isUnlocked) openJourneyPopup(isChapter1 ? 'overview' : `chapter_${journey.chapter}`)
                    else if (canUnlock) checkAndUnlockChapters(user, allJourneys)
                    else showLockedChapter(`Chapter ${journey.chapter}`, `Hoàn thành Chapter ${journey.chapter - 1} để mở khóa`, '🔒')
                  }}
                  style={{
                    margin: 0,
                    borderRadius: canUnlock ? '12px 12px 0 0' : undefined,
                    borderColor: isChapter1 ? 'rgba(139,92,246,.4)' : canUnlock ? 'rgba(245,158,11,.4)' : undefined,
                    borderBottom: canUnlock ? 'none' : undefined,
                    background: isChapter1 ? 'rgba(139,92,246,.07)' : canUnlock ? 'rgba(245,158,11,.07)' : undefined,
                    opacity: isUnlocked || canUnlock ? 1 : idx === 1 ? 0.6 : 0.35,
                  }}
                >
                  <div className="chapter-thumb" style={{ background: bgColor }}>
                    {isUnlocked ? icon : canUnlock ? '🔓' : '🔒'}
                  </div>
                  <div className="chapter-info">
                    <div className="chapter-num">
                      CHAPTER {journey.chapter}
                    </div>
                    <div className="chapter-name">
                      {(journey.title?.en || `CHAPTER ${journey.chapter}`).toUpperCase()}
                    </div>
                    <div className="progress-wrap" style={{ height: "4px", marginTop: "4px" }}>
                      <div className="progress-bar" style={{
                        width: `${isUnlocked ? chapterPct : 0}%`,
                        background: chapterDone ? '#22c55e' : 'linear-gradient(90deg,var(--purple),var(--blue))',
                      }} />
                    </div>
                    <div className="chapter-prog" style={{ color: canUnlock ? '#fbbf24' : isUnlocked ? undefined : 'var(--text-muted)' }}>
                      {isUnlocked
                        ? (chapterDone ? '✓ Hoàn thành' : isChapter1
                            ? (waterObjective ? `Uống nước ${waterObjective.current}/${waterObjective.target} · ${chapterPct}%` : `${chapterPct}% · Tiếp tục`)
                            : `${chapterPct}% · Đang chơi`)
                        : canUnlock ? '✅ Đủ điều kiện · Nhấn để mở khoá!'
                        : `Khóa · Hoàn thành Ch.${journey.chapter - 1}`}
                    </div>
                  </div>
                  <div style={{ color: isUnlocked ? (isChapter1 ? 'var(--blue-glow)' : 'var(--text-muted)') : canUnlock ? '#fbbf24' : 'var(--text-muted)', fontSize: '18px' }}>
                    {isUnlocked ? '›' : canUnlock ? '🔓' : '🔒'}
                  </div>
                </div>
                {/* UNLOCK BUTTON — hiện khi đủ điều kiện */}
                {canUnlock && (
                  <button
                    onClick={() => checkAndUnlockChapters(user, allJourneys)}
                    style={{
                      width: '100%', padding: '9px 16px',
                      borderRadius: '0 0 12px 12px',
                      border: '1px solid rgba(245,158,11,.45)',
                      borderTop: 'none',
                      background: 'linear-gradient(135deg,rgba(245,158,11,.22),rgba(234,88,12,.18))',
                      color: '#fbbf24', fontWeight: 800, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    🔓 MỞ KHOÁ CHAPTER {journey.chapter} · {(journey.title?.en || '').toUpperCase()}
                  </button>
                )}
              </div>
            )
          })}
          <div style={{ padding: "0 12px" }}>
            <button className="btn-outline" onClick={(event) => { openModal('modal-all-chapters'); }} style={{ width: "100%" }}>
              XEM TẤT CẢ CHAPTER
            </button>
          </div>
          {/* Skill Tree shortcut */}
          <div className="section-head" style={{ marginTop: "12px" }}>
            <span className="section-head-title">
              Cây kỹ năng
            </span>
            <span onClick={(event) => { openModal('modal-skill-tree'); }} style={{ fontSize: "11px", color: "var(--blue-glow)", cursor: "pointer" }}>
              Xem ›
            </span>
          </div>
          <div className="card" onClick={(event) => { openModal('modal-skill-tree'); }} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div className="skill-node">
                <div className="skill-circle maxed">
                  ⏰
                </div>
                <div className="skill-node-name">
                  Wake Up Early
                </div>
                <div className="skill-node-level">
                  1/1
                </div>
              </div>
              <div className="skill-node">
                <div className="skill-circle unlocked">
                  🧠
                </div>
                <div className="skill-node-name">
                  Dopamine Detox
                </div>
                <div className="skill-node-level">
                  3/3
                </div>
              </div>
              <div className="skill-node">
                <div className="skill-circle unlocked">
                  💼
                </div>
                <div className="skill-node-name">
                  Deep Work
                </div>
                <div className="skill-node-level">
                  2/3
                </div>
              </div>
              <div className="skill-node">
                <div className="skill-circle">
                  🏆
                </div>
                <div className="skill-node-name">
                  Monk Mode
                </div>
                <div className="skill-node-level">
                  0/3
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* ═══════════════════════════════ SCREEN 4: AI COACH ═══════════════════════════════ */}
        <div className="screen" style={{display: activeScreen === 'screen-ai-coach' ? 'flex' : 'none', flexDirection:'column', flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:'70px', background:'var(--bg-deep)'}} id="screen-ai-coach">
          <div className="top-bar">
            <div className="top-bar-title">
              🤖 AI COACH
            </div>
            <div className="badge badge-purple">
              Đang phân tích...
            </div>
          </div>
          {/* AI Orb */}
          <div style={{ textAlign: "center", padding: "20px 12px 12px" }}>
            <div className="ai-orb">
              AI
            </div>
            <div style={{ marginTop: "12px", fontFamily: "'Rajdhani',sans-serif", fontSize: "16px", fontWeight: "700" }}>
              AI ĐANG PHÂN TÍCH BẠN
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
              Để tạo lộ trình tối ưu
            </div>
          </div>
          {/* Analysis quadrant */}
          <div className="ai-quad-grid" style={{ margin: "0 12px 10px" }}>
            <div className="ai-quad">
              <div className="ai-quad-icon">
                ⚙️
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700", color: "var(--blue-glow)" }}>
                81
              </div>
              <div className="ai-quad-label">
                Thói quen
              </div>
            </div>
            <div className="ai-quad">
              <div className="ai-quad-icon">
                🌙
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700", color: "var(--purple-glow)" }}>
                74
              </div>
              <div className="ai-quad-label">
                Giấc ngủ
              </div>
            </div>
            <div className="ai-quad">
              <div className="ai-quad-icon">
                🎯
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700", color: "var(--gold)" }}>
                92
              </div>
              <div className="ai-quad-label">
                Mục tiêu
              </div>
            </div>
            <div className="ai-quad">
              <div className="ai-quad-icon">
                💼
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700", color: "var(--green)" }}>
                63
              </div>
              <div className="ai-quad-label">
                Công việc
              </div>
            </div>
          </div>
          {/* Emotion + progress */}
          <div className="card" style={{ textAlign: "center" }}>
            <div className="ai-quad-icon" style={{ fontSize: "28px", marginBottom: "6px" }}>
              😊
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "8px" }}>
              Cảm xúc
            </div>
            <div className="progress-wrap" style={{ height: "6px" }}>
              <div className="progress-bar" style={{ width: "66%", background: "linear-gradient(90deg,var(--blue),var(--purple))" }}>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
              Đang phân tích… 66%
            </div>
          </div>
          {/* Suggestions */}
          <div className="section-head">
            <span className="section-head-title">
              Gợi ý hôm nay
            </span>
            <span onClick={(event) => { openModal('modal-ai-suggest'); }} style={{ fontSize: "11px", color: "var(--blue-glow)", cursor: "pointer" }}>
              Chi tiết ›
            </span>
          </div>
          <div className="card">
            <div className="task-item">
              <div className="task-icon icon-bg-blue">
                💧
              </div>
              <div className="task-info">
                <div className="task-name">
                  Uống đủ nước
                </div>
                <div className="task-desc">
                  Tăng năng lượng và tập trung
                </div>
              </div>
              <div className="badge badge-green">
                +100 XP
              </div>
            </div>
            <div className="task-item">
              <div className="task-icon icon-bg-purple">
                😴
              </div>
              <div className="task-info">
                <div className="task-name">
                  Ngủ 7-8 tiếng
                </div>
                <div className="task-desc">
                  Cải thiện phục hồi
                </div>
              </div>
              <div className="badge badge-green">
                +120 XP
              </div>
            </div>
            <div className="task-item">
              <div className="task-icon icon-bg-cyan">
                🧘
              </div>
              <div className="task-info">
                <div className="task-name">
                  Thiền 10 phút
                </div>
                <div className="task-desc">
                  Giảm stress, tăng clarity
                </div>
              </div>
              <div className="badge badge-green">
                +80 XP
              </div>
            </div>
          </div>
          <div style={{ padding: "0 12px 8px", display: "flex", gap: "8px" }}>
            <button className="btn-primary" onClick={(event) => { openModal('modal-ai-suggest'); }}>
              GỢI Ý AI
            </button>
            <button className="btn-outline" onClick={(event) => { openModal('modal-ai-suggest'); }}>
              PHÂN TÍCH
            </button>
          </div>
          {/* Chat box */}
          <div className="card">
            <div className="card-title">
              Nhắn tin với AI Coach
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: "8px", padding: "10px", marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>
                AI Coach
              </div>
              <div style={{ fontSize: "12px", lineHeight: "1.5" }}>
                Bạn đang làm rất tốt! Hãy duy trì những thói quen này để đạt mục tiêu. 💪
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="text" placeholder="Nh\u1eafn tin v\u1edbi AI Coach..." style={{ flex: "1", background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", color: "var(--text)", fontSize: "12px", outline: "none" }} />
              <button style={{ width: "36px", height: "36px", borderRadius: "8px", background: "linear-gradient(135deg,var(--purple),var(--blue))", border: "none", fontSize: "16px", cursor: "pointer" }}>
                🎤
              </button>
            </div>
          </div>
        </div>
        {/* ═══════════════════════════════ SCREEN 5: CỬA HÀNG ═══════════════════════════════ */}
        <div className="screen" style={{display: activeScreen === 'screen-cua-hang' ? 'flex' : 'none', flexDirection:'column', flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:'70px', background:'var(--bg-deep)'}} id="screen-cua-hang">
          <div className="top-bar">
            <div className="top-bar-title">
              🏪 CỬA HÀNG
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <div className="currency-badge">
                🪙 {journeyProfile.xp || 2450}
              </div>
              <div className="currency-badge" style={{ color: "#38bdf8" }}>
                💎 {journeyProfile.energy || 340}
              </div>
            </div>
          </div>
          <div style={{ padding: "0 12px" }}>
            <div className="tab-row">
              <button className="tab-btn active" onClick={(event) => { switchTab(event.currentTarget,'shop'); }}>
                Cửa hàng
              </button>
              <button className="tab-btn" onClick={(event) => { switchTab(event.currentTarget,'shop'); }}>
                Vật phẩm
              </button>
              <button className="tab-btn" onClick={(event) => { switchTab(event.currentTarget,'shop'); }}>
                NFT
              </button>
              <button className="tab-btn" onClick={(event) => { switchTab(event.currentTarget,'shop'); }}>
                Đặc biệt
              </button>
            </div>
          </div>
          {/* Suggested packs */}
          <div className="section-head">
            <span className="section-head-title">
              Gói đề xuất
            </span>
          </div>
          <div className="shop-item" onClick={(event) => { openModal('modal-item-detail'); }} style={{ margin: "0 12px 6px" }}>
            <div className="shop-thumb">
              🎒
            </div>
            <div style={{ flex: "1" }}>
              <div style={{ fontSize: "13px", fontWeight: "600" }}>
                Starter Pack
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                Khởi đầu hành trình
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--gold)" }}>
                🪙 200
              </div>
              <button className="btn-sm" style={{ background: "var(--gold)", color: "#000", marginTop: "4px" }}>
                MUA
              </button>
            </div>
          </div>
          <div className="shop-item" onClick={(event) => { openModal('modal-item-detail'); }} style={{ margin: "0 12px 6px" }}>
            <div className="shop-thumb" style={{ background: "rgba(59,130,246,.15)" }}>
              ⚔️
            </div>
            <div style={{ flex: "1" }}>
              <div style={{ fontSize: "13px", fontWeight: "600" }}>
                Warrior Pack
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                Tăng sức chiến đấu
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--gold)" }}>
                🪙 490
              </div>
              <button className="btn-sm" style={{ background: "var(--blue)", color: "#fff", marginTop: "4px" }}>
                MUA
              </button>
            </div>
          </div>
          <div className="shop-item" onClick={(event) => { openModal('modal-item-detail'); }} style={{ margin: "0 12px 8px" }}>
            <div className="shop-thumb" style={{ background: "rgba(139,92,246,.15)" }}>
              👑
            </div>
            <div style={{ flex: "1" }}>
              <div style={{ fontSize: "13px", fontWeight: "600" }}>
                Master Pack
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                Dành cho chiến binh đỉnh cao
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--gold)" }}>
                🪙 990
              </div>
              <button className="btn-sm" style={{ background: "var(--purple)", color: "#fff", marginTop: "4px" }}>
                MUA
              </button>
            </div>
          </div>
          {/* Items */}
          <div className="section-head">
            <span className="section-head-title">
              Vật phẩm
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", padding: "0 12px 10px" }}>
            <div onClick={(event) => { openModal('modal-item-detail'); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "26px", marginBottom: "4px" }}>
                ⚡
              </div>
              <div style={{ fontSize: "11px", fontWeight: "600" }}>
                Energy Boost
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", margin: "2px 0" }}>
                +100 Energy
              </div>
              <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: "700" }}>
                🪙 200
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-item-detail'); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "26px", marginBottom: "4px" }}>
                🧪
              </div>
              <div style={{ fontSize: "11px", fontWeight: "600" }}>
                Focus Potion
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", margin: "2px 0" }}>
                Tăng Focus 1h
              </div>
              <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: "700" }}>
                🪙 150
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-item-detail'); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "26px", marginBottom: "4px" }}>
                🛡
              </div>
              <div style={{ fontSize: "11px", fontWeight: "600" }}>
                Streak Shield
              </div>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", margin: "2px 0" }}>
                Bảo vệ streak
              </div>
              <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: "700" }}>
                🪙 300
              </div>
            </div>
          </div>
          {/* Mystery chests */}
          <div className="section-head">
            <span className="section-head-title">
              Rương bí ẩn
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", padding: "0 12px 10px" }}>
            <div onClick={(event) => { openModal('modal-item-detail'); }} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>
                📦
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                Common
              </div>
              <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: "700", marginTop: "4px" }}>
                🪙 100
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-item-detail'); }} style={{ background: "var(--bg-card)", border: "1px solid rgba(59,130,246,.3)", borderRadius: "10px", padding: "10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>
                🎁
              </div>
              <div style={{ fontSize: "10px", color: "var(--blue-glow)" }}>
                Rare
              </div>
              <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: "700", marginTop: "4px" }}>
                🪙 250
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-item-detail'); }} style={{ background: "var(--bg-card)", border: "1px solid rgba(139,92,246,.4)", borderRadius: "10px", padding: "10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "28px", marginBottom: "4px" }}>
                💎
              </div>
              <div style={{ fontSize: "10px", color: "var(--purple-glow)" }}>
                Epic
              </div>
              <div style={{ fontSize: "11px", color: "var(--gold)", fontWeight: "700", marginTop: "4px" }}>
                🪙 500
              </div>
            </div>
          </div>
        </div>
        {/* ═══════════════════════════════ SCREEN 6: REWARDS ═══════════════════════════════ */}
        <div className="screen" style={{display: activeScreen === 'screen-rewards' ? 'flex' : 'none', flexDirection:'column', flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:'70px', background:'var(--bg-deep)'}} id="screen-rewards">
          <div className="top-bar">
            <div className="top-bar-title">
              🎁 REWARDS
            </div>
          </div>
          {/* Points big display */}
          <div style={{ textAlign: "center", padding: "20px 12px 12px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "2px", textTransform: "uppercase" }}>
              ĐIỂM REWARDS
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "48px", fontWeight: "900", background: "linear-gradient(90deg,var(--blue-glow),var(--purple-glow))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              2,450
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
              Quy đổi phần thưởng hấp dẫn
            </div>
          </div>
          {/* Tabs */}
          <div style={{ padding: "0 12px 8px" }}>
            <div className="tab-row">
              <button className="tab-btn active" onClick={(event) => { switchTab(event.currentTarget,'rewards'); }}>
                Nhiệm vụ
              </button>
              <button className="tab-btn" onClick={(event) => { switchTab(event.currentTarget,'rewards'); }}>
                Thành tựu
              </button>
              <button className="tab-btn" onClick={(event) => { switchTab(event.currentTarget,'rewards'); }}>
                Sự kiện
              </button>
            </div>
          </div>
          {/* Reward exchange */}
          <div className="section-head">
            <span className="section-head-title">
              Cửa hàng Rewards
            </span>
          </div>
          <div className="card">
            <div className="reward-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>
                  🪙
                </span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600" }}>
                    500 Điểm → 🪙 50
                  </div>
                </div>
              </div>
              <button className="btn-sm" style={{ background: "var(--blue)", color: "#fff" }}>
                Đổi
              </button>
            </div>
            <div className="reward-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>
                  💎
                </span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600" }}>
                    1,000 Điểm → 💎 100
                  </div>
                </div>
              </div>
              <button className="btn-sm" style={{ background: "var(--blue)", color: "#fff" }}>
                Đổi
              </button>
            </div>
            <div className="reward-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>
                  🧪
                </span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600" }}>
                    2,000 Điểm → 💎 200
                  </div>
                </div>
              </div>
              <button className="btn-sm" style={{ background: "var(--blue)", color: "#fff" }}>
                Đổi
              </button>
            </div>
            <div className="reward-row" style={{ borderBottom: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>
                  👑
                </span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600" }}>
                    5,000 Điểm → 💎 500
                  </div>
                </div>
              </div>
              <button className="btn-sm" style={{ background: "linear-gradient(135deg,var(--purple),var(--blue))", color: "#fff" }}>
                Đổi
              </button>
            </div>
          </div>
          {/* History */}
          <div className="section-head">
            <span className="section-head-title">
              Lịch sử nhận thưởng
            </span>
          </div>
          <div className="card">
            <div className="notif-item">
              <div className="notif-icon icon-bg-gold">
                💎
              </div>
              <div className="notif-body">
                <div className="notif-title">
                  Đã đổi 1,000 Điểm lấy 100 Gem
                </div>
                <div className="notif-time">
                  12/05/2024
                </div>
              </div>
            </div>
            <div className="notif-item" style={{ borderBottom: "none" }}>
              <div className="notif-icon icon-bg-blue">
                💎
              </div>
              <div className="notif-body">
                <div className="notif-title">
                  Đã đổi 500 Điểm lấy 50 Gem
                </div>
                <div className="notif-time">
                  10/05/2024
                </div>
              </div>
            </div>
          </div>
          {/* Daily reward shortcut */}
          <div className="card" onClick={(event) => { openModal('modal-daily-reward'); }} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "32px" }}>
                🎁
              </span>
              <div style={{ flex: "1" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "15px", fontWeight: "700" }}>
                  Phần thưởng hàng ngày
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  Nhận thưởng mỗi ngày · 7 ngày liên tiếp
                </div>
              </div>
              <div style={{ color: "var(--blue-glow)" }}>
                ›
              </div>
            </div>
          </div>
          {/* Leaderboard shortcut */}
          <div className="card" onClick={(event) => { openModal('modal-leaderboard'); }} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "32px" }}>
                🏆
              </span>
              <div style={{ flex: "1" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "15px", fontWeight: "700" }}>
                  Bảng xếp hạng
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  Bạn #12 · 7,540 XP
                </div>
              </div>
              <div style={{ color: "var(--blue-glow)" }}>
                ›
              </div>
            </div>
          </div>
        </div>
        {/* ═══════════════════════════════ SCREEN 7: PROFILE ═══════════════════════════════ */}
        <div className="screen" style={{display: activeScreen === 'screen-profile' ? 'flex' : 'none', flexDirection:'column', flex:1, overflowY:'auto', overflowX:'hidden', paddingBottom:'70px', background:'var(--bg-deep)'}} id="screen-profile">
          <div className="top-bar">
            <div className="top-bar-title">
              👤 PROFILE
            </div>
            <button className="btn-sm badge-blue" onClick={(event) => { openModal('modal-edit-profile'); }}>
              Chỉnh sửa
            </button>
          </div>
          {/* Avatar + Name */}
          <div style={{ textAlign: "center", padding: "20px 12px 12px" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.4),rgba(30,40,80,.9))", border: "2px solid var(--purple)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", boxShadow: "0 0 20px rgba(139,92,246,.4)" }}>
              🥷
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700" }}>
              Shadow Warrior
            </div>
            <div className="badge badge-purple" style={{ marginTop: "4px" }}>
              Lv. 12 · Iron Disciples
            </div>
            <div style={{ marginTop: "8px" }}>
              <div className="xp-label">
                <span>
                  4,250 / 6,000 XP
                </span>
              </div>
              <div className="xp-bar-wrap">
                <div className="xp-bar" style={{ width: "70%" }}>
                </div>
              </div>
            </div>
          </div>
          {/* Info */}
          <div className="card">
            <div className="card-title">
              Thông tin
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Ngày tham gia
              </span>
              <span style={{ fontSize: "11px", fontWeight: "600" }}>
                12/05/2024
              </span>
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Nhiệm vụ hoàn thành
              </span>
              <span style={{ fontSize: "11px", fontWeight: "600" }}>
                156
              </span>
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Thành tựu
              </span>
              <span style={{ fontSize: "11px", fontWeight: "600" }}>
                24/48
              </span>
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Cấp độ
              </span>
              <span style={{ fontSize: "11px", fontWeight: "600" }}>
                12
              </span>
            </div>
            <div className="reward-row" style={{ borderBottom: "none" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Chuỗi ngày
              </span>
              <span className="badge badge-gold">
                24 ngày 🔥
              </span>
            </div>
          </div>
          {/* Stats */}
          <div className="card">
            <div className="card-title">
              Chỉ số chính
            </div>
            <div className="hex-stats">
              <div className="hex-stat">
                <div className="hex-stat-val" style={{ color: "#60a5fa" }}>
                  81
                </div>
                <div className="hex-stat-name">
                  Focus
                </div>
              </div>
              <div className="hex-stat">
                <div className="hex-stat-val" style={{ color: "#a78bfa" }}>
                  92
                </div>
                <div className="hex-stat-name">
                  Discipline
                </div>
              </div>
              <div className="hex-stat">
                <div className="hex-stat-val" style={{ color: "#f97316" }}>
                  63
                </div>
                <div className="hex-stat-name">
                  Energy
                </div>
              </div>
              <div className="hex-stat">
                <div className="hex-stat-val" style={{ color: "#4ade80" }}>
                  74
                </div>
                <div className="hex-stat-name">
                  Health
                </div>
              </div>
              <div className="hex-stat">
                <div className="hex-stat-val" style={{ color: "#38bdf8" }}>
                  58
                </div>
                <div className="hex-stat-name">
                  Knowledge
                </div>
              </div>
              <div className="hex-stat">
                <div className="hex-stat-val" style={{ color: "#f59e0b" }}>
                  46
                </div>
                <div className="hex-stat-name">
                  Charisma
                </div>
              </div>
            </div>
          </div>
          {/* ── InBody Section ── */}
          <div style={{ margin: "0 12px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "14px", fontWeight: "700", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".5px" }}>
              📊 KẾT QUẢ INBODY
            </div>
            <button onClick={(event) => { openModal('modal-inbody-detail'); }} style={{ background: "transparent", border: "1px solid var(--blue)", borderRadius: "6px", color: "var(--blue-glow)", fontSize: "10px", fontWeight: "600", padding: "4px 10px", cursor: "pointer" }}>
              Chi tiết ›
            </button>
          </div>
          {/* InBody Score card */}
          <div className="card" onClick={(event) => { openModal('modal-inbody-detail'); }} style={{ background: "linear-gradient(135deg,rgba(13,21,40,1) 0%,rgba(17,29,53,1) 100%)", borderColor: "rgba(139,92,246,0.3)" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {/* Score ring */}
              <div style={{ flexShrink: "0", width: "72px", height: "72px", position: "relative" }}>
                <svg width="72" height="72" viewbox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="6" />
                  <circle cx="36" cy="36" r="30" fill="none" stroke="url(#scoreGrad)" stroke-width="6" stroke-dasharray="188.5" stroke-dashoffset="67.9" stroke-linecap="round" transform="rotate(-90 36 36)" />
                  <defs>
                    <lineargradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#8b5cf6" />
                      <stop offset="100%" stop-color="#3b82f6" />
                    </lineargradient>
                  </defs>
                </svg>
                <div style={{ position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "20px", fontWeight: "900", color: "#fff", lineHeight: "1" }}>
                    64
                  </div>
                  <div style={{ fontSize: "8px", color: "var(--text-dim)" }}>
                    /100
                  </div>
                </div>
              </div>
              {/* Main stats */}
              <div style={{ flex: "1", minWidth: "0" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "15px", fontWeight: "800", color: "#fff", marginBottom: "2px" }}>
                  InBody Score
                </div>
                <div className="badge badge-gold" style={{ fontSize: "9px", marginBottom: "6px" }}>
                  08/05/2026 · 10:58
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "5px 7px" }}>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                      Cân nặng
                    </div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "14px", fontWeight: "700", color: "var(--blue-glow)" }}>
                      74.5
                      <span style={{ fontSize: "9px", color: "var(--text-dim)" }}>
                        kg
                      </span>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "5px 7px" }}>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                      Khối lượng cơ
                    </div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "14px", fontWeight: "700", color: "#a78bfa" }}>
                      27.7
                      <span style={{ fontSize: "9px", color: "var(--text-dim)" }}>
                        kg
                      </span>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "5px 7px" }}>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                      Mỡ cơ thể
                    </div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "14px", fontWeight: "700", color: "#f97316" }}>
                      32.8
                      <span style={{ fontSize: "9px", color: "var(--text-dim)" }}>
                        %
                      </span>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "6px", padding: "5px 7px" }}>
                    <div style={{ fontSize: "8px", color: "var(--text-muted)" }}>
                      BMI
                    </div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "14px", fontWeight: "700", color: "#4ade80" }}>
                      27.4
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* AI Analysis snippet */}
            <div style={{ marginTop: "10px", background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: "8px", padding: "8px 10px" }}>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "3px" }}>
                🤖 Phân tích AI
              </div>
              <div style={{ fontSize: "11px", color: "var(--text)", lineHeight: "1.5" }}>
                Tỷ lệ mỡ
                <b style={{ color: "#f97316" }}>
                  32.8%
                </b>
                đang ở mức cao. Cần tăng cơ và giảm mỡ. Khối lượng cơ
                <b style={{ color: "#a78bfa" }}>
                  27.7kg
                </b>
                — duy trì tập kháng lực 3-4 buổi/tuần.
              </div>
            </div>
            {/* History mini-chart */}
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "5px" }}>
                Lịch sử InBody Score
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "32px" }}>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <div data-val="60" style={{ flex: "1", width: "100%", background: "rgba(139,92,246,0.3)", borderRadius: "2px 2px 0 0", height: "60%" }}>
                  </div>
                  <div style={{ fontSize: "7px", color: "var(--text-muted)" }}>
                    60
                  </div>
                </div>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <div style={{ flex: "1", width: "100%", background: "rgba(139,92,246,0.35)", borderRadius: "2px 2px 0 0" }}>
                  </div>
                  <div style={{ fontSize: "7px", color: "var(--text-muted)" }}>
                    62
                  </div>
                </div>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <div style={{ flex: "1", width: "100%", background: "rgba(139,92,246,0.4)", borderRadius: "2px 2px 0 0" }}>
                  </div>
                  <div style={{ fontSize: "7px", color: "var(--text-muted)" }}>
                    68
                  </div>
                </div>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <div style={{ flex: "1", width: "100%", background: "rgba(139,92,246,0.5)", borderRadius: "2px 2px 0 0" }}>
                  </div>
                  <div style={{ fontSize: "7px", color: "var(--text-muted)" }}>
                    63
                  </div>
                </div>
                <div style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                  <div style={{ flex: "1", width: "100%", background: "linear-gradient(180deg,var(--purple),var(--blue))", borderRadius: "2px 2px 0 0", boxShadow: "0 0 6px rgba(139,92,246,0.5)" }}>
                  </div>
                  <div style={{ fontSize: "7px", color: "var(--purple-glow)", fontWeight: "700" }}>
                    64
                  </div>
                </div>
              </div>
              <div id="inbody-bar-chart">
              </div>
            </div>
            <button className="btn-primary" onClick={(event) => { event.stopPropagation();openModal('modal-inbody-detail'); }} style={{ marginTop: "10px", fontSize: "12px", padding: "9px" }}>
              🤖 AI PHÂN TÍCH CHI TIẾT
            </button>
          </div>
          {/* Quick upload row */}
          <div style={{ display: "flex", gap: "8px", padding: "0 12px 10px" }}>
            <div onClick={(event) => { openModal('modal-inbody-upload'); }} style={{ flex: "1", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "18px" }}>
                📷
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "3px" }}>
                Upload ảnh
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-inbody-history'); }} style={{ flex: "1", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: "18px" }}>
                📈
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "3px" }}>
                Lịch sử
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-stats'); }} style={{ flex: "1", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: "18px" }}>
                📊
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "4px" }}>
                Thống kê
              </div>
            </div>
            <div onClick={(event) => { openModal('modal-achievements'); }} style={{ flex: "1", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: "18px" }}>
                🏅
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "4px" }}>
                Thành tựu
              </div>
            </div>
          </div>
        </div>
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ═══════════════════  MODALS / SUB-SCREENS  ════════════════════ */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MODAL: NOTIFICATIONS */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-notif">
          <div className="modal-box">
            <div className="modal-close" onClick={(event) => { closeModal('modal-notif'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>
              🔔 Thông báo
            </div>
            <div className="tab-row">
              <button className="tab-btn active">
                Hệ thống
              </button>
              <button className="tab-btn">
                Thưởng
              </button>
              <button className="tab-btn">
                Quà
              </button>
            </div>
            <div className="notif-item">
              <div className="notif-icon icon-bg-gold">
                🎁
              </div>
              <div className="notif-body">
                <div className="notif-title">
                  Phần thưởng đăng nhập – 5 phút nữa
                </div>
                <div className="notif-time">
                  Vừa xong
                </div>
              </div>
            </div>
            <div className="notif-item">
              <div className="notif-icon icon-bg-green">
                ✅
              </div>
              <div className="notif-body">
                <div className="notif-title">
                  Nhiệm vụ hoàn thành – 10 phút nữa
                </div>
                <div className="notif-time">
                  5 phút trước
                </div>
              </div>
            </div>
            <div className="notif-item">
              <div className="notif-icon icon-bg-purple">
                ⭐
              </div>
              <div className="notif-body">
                <div className="notif-title">
                  Quà sự kiện đặc biệt – 30 phút nữa
                </div>
                <div className="notif-time">
                  20 phút trước
                </div>
              </div>
            </div>
            <div className="notif-item">
              <div className="notif-icon icon-bg-blue">
                ⚠️
              </div>
              <div className="notif-body">
                <div className="notif-title">
                  Bảo trì máy chủ 05:00 – 07:00
                </div>
                <div className="notif-time">
                  2 giờ trước
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={(event) => { closeModal('modal-notif'); }} style={{ marginTop: "12px" }}>
              NHẬN TẤT CẢ
            </button>
          </div>
        </div>
        {/* MODAL: TASK DETAIL */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-task-detail">
          <div className="modal-box">
            <div className="modal-close" onClick={(event) => { closeModal('modal-task-detail'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>
              {selectedTask.icon} Chi tiết Nhiệm Vụ
            </div>
            <div style={{ fontSize: "14px", color: "var(--text-dim)", marginBottom: "14px" }}>
              {selectedTask.title} · {selectedTask.subtitle}
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Tracking hôm nay
              </span>
              <span style={{ fontSize: "12px", fontWeight: "600" }}>
                {selectedTaskState ? `${selectedTaskState.current}/${selectedTaskState.target} ${selectedTask.unitLabel}` : `0/1 ${selectedTask.unitLabel}`} · {selectedTaskPct}%
              </span>
            </div>
            <div className="progress-wrap" style={{ height: "6px", margin: "8px 0 12px" }}>
              <div className="progress-bar" style={{ width: `${selectedTaskPct}%`, background: selectedTaskPct >= 100 ? "var(--green)" : "linear-gradient(90deg,var(--purple),var(--blue))" }}>
              </div>
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Trạng thái
              </span>
              <span style={{ fontSize: "12px", fontWeight: "700", color: selectedTaskPct >= 100 ? "var(--green)" : "var(--blue-glow)" }}>
                {selectedTaskPct >= 100 ? 'Đã hoàn thành' : 'Đang thực hiện'}
              </span>
            </div>
            <div className="glow-line">
            </div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--blue-glow)", marginBottom: "6px" }}>
              Phần thưởng
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <div className="badge badge-purple">
                {selectedTask.reward}
              </div>
              <div className="badge badge-blue">
                +5 ENERGY
              </div>
              {selectedTaskKey === 'water' && (
                <div className="badge badge-green">
                  Bé Mèo +150ml
                </div>
              )}
            </div>

            <div className="mission-proof-card">
              <div className="mission-ai-note">
                <b>AI Healthcare Vision Control · Object Detection · Webcam</b><br />
                Camera AI thật luôn hiển thị cho mọi nhiệm vụ. Bấm <b>Mở camera</b>, xem lớp phủ nhận diện realtime, rồi bấm <b>Lưu Hình</b> trong Webcam để lưu ảnh kèm lớp phủ AI và cộng thêm lượt hoàn thành (có thể vượt mức tối thiểu như 11/10).
              </div>
              <iframe
                key={selectedTaskKey}
                title={`AI Healthcare Vision Object Detection Webcam - ${selectedTask.title}`}
                src={MEDIAPIPE_OBJECT_DETECTION_WEBCAM_URL}
                className="mission-ai-frame"
                allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            {selectedProof && (
              <div style={{ marginTop: "10px", padding: "10px", borderRadius: "12px", border: "1px solid rgba(34,197,94,.28)", background: "rgba(34,197,94,.10)", color: "#bbf7d0", fontSize: "12px", fontWeight: "700" }}>
                ✓ Đã có ảnh proof AI: hoàn thành {selectedTaskState?.current || 0}/{selectedTaskState?.target || 1} nhiệm vụ ({selectedTaskPct}%). Upload: {selectedProof.uploadPath || (selectedProof.image === '__INDEXED_DB_ONLY__' ? '(ảnh lớn - lưu cloud)' : selectedProof.image) || selectedProof.uploadRecord?.uploadPath}
              </div>
            )}
            {cameraError && <div className="mission-error">{cameraError}</div>}

            <div className="glow-line">
            </div>
            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>
              Nhiệm vụ liên quan trong hành trình
            </div>
            {Object.entries(CHAPTER_DETAIL_CONTENT).map(([chapterKey, chapter]) => {
              const chapterTask = todayTask(chapter.taskId)
              const chapterPct = taskPercent(chapterTask)
              return (
                <div key={chapterKey} className="task-item clickable" onClick={(event) => { openChapterMissionDetail(chapterKey); }} style={{ borderBottom: chapterKey === 'breakthrough' ? "none" : undefined }}>
                  <div className="task-icon icon-bg-cyan" style={{ fontSize: "14px", width: "28px", height: "28px" }}>
                    {chapter.icon}
                  </div>
                  <div className="task-info">
                    <div className="task-name" style={{ fontSize: "12px" }}>
                      {chapter.title}
                    </div>
                    <div className="task-desc">
                      {chapter.subtitle}
                    </div>
                  </div>
                  <div className={chapterPct >= 100 ? "task-check done" : "task-check"} style={{ width: "18px", height: "18px", fontSize: "10px" }}>
                    {chapterPct >= 100 ? '✓' : '›'}
                  </div>
                </div>
              )
            })}
            <button className="btn-primary" onClick={(event) => { closeModal('modal-task-detail'); }} style={{ marginTop: "14px" }}>
              ĐÓNG CHI TIẾT
            </button>
            {/* ✅ "Xem hình tại Medical Records" — luôn hoạt động dù chưa hay đã chụp hình */}
            <button
              className="btn-primary"
              onClick={() => { closeModal('modal-task-detail'); if (onViewMedicalRecord) { onViewMedicalRecord() } else { window.dispatchEvent(new CustomEvent('navigate-to-upload')) } }}
              style={{ marginTop: "8px", background: "linear-gradient(135deg,#16a34a,#22c55e)", boxShadow: "0 10px 24px rgba(34,197,94,0.24)" }}
            >
              📷 Xem hình tại Medical Records
            </button>
          </div>
        </div>
        {/* MODAL: CHAPTER DETAIL (Ch.1) - dynamic from journeys.json */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-chapter-detail">
          {(() => {
            const ch1 = allJourneys.find((j) => j.chapter === 1) || {}
            const chapterKeys = Object.keys(CHAPTER_DETAIL_CONTENT)
            const objectives = ch1.requiredObjectives || []
            const totalTarget = objectives.reduce((s, o) => s + (o.target || 1), 0)
            const currentSum = objectives.reduce((s, o) => {
              const obj = journeyObjective(o.task)
              return s + Math.min(obj?.current || 0, o.target || 1)
            }, 0)
            const ch1Pct = totalTarget > 0 ? Math.min(100, Math.round(currentSum / totalTarget * 100)) : 0
            const firstUnfinishedKey = chapterKeys.find((key) => taskPercent(todayTask(CHAPTER_DETAIL_CONTENT[key]?.taskId)) < 100) || chapterKeys[0]
            return (
              <div className="modal-box">
                <div className="modal-close" onClick={(event) => { closeModal('modal-chapter-detail'); }}>
                  ✕
                </div>
                <div style={{ textAlign: "center", padding: "10px 0 14px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "2px" }}>
                    CHAPTER 1
                  </div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "900" }}>
                    {(ch1.title?.en || 'THE AWAKENING').toUpperCase()}
                  </div>
                  <div style={{ background: "linear-gradient(135deg,rgba(139,92,246,.25),rgba(59,130,246,.15))", borderRadius: "12px", height: "100px", margin: "10px 0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48px" }}>
                    🌅
                  </div>
                  <div className="progress-wrap" style={{ height: "5px" }}>
                    <div className="progress-bar" style={{ width: `${ch1Pct}%`, background: "linear-gradient(90deg,var(--purple),var(--blue))" }}>
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                    Tiến độ: {ch1Pct}%
                  </div>
                </div>
                {/* Sub-lessons from CHAPTER_DETAIL_CONTENT (built from journeys.json objectives) */}
                {chapterKeys.map((key, i) => {
                  const chapter = CHAPTER_DETAIL_CONTENT[key]
                  const pct = taskPercent(todayTask(chapter.taskId))
                  const done = pct >= 100
                  const isActive = !done && chapterKeys.slice(0, i).every((k) => taskPercent(todayTask(CHAPTER_DETAIL_CONTENT[k].taskId)) >= 100)
                  const badgeClass = done ? 'badge-green' : isActive ? 'badge-gold' : 'badge-blue'
                  const badgeText = `${pct}%`
                  return (
                    <div
                      key={key}
                      className="task-item clickable"
                      onClick={(event) => { openChapterMissionDetail(key) }}
                      style={{ borderBottom: i === chapterKeys.length - 1 ? "none" : undefined }}
                    >
                      <div style={{ width: "26px", textAlign: "center", fontSize: "11px", color: isActive ? "var(--blue-glow)" : "var(--text-muted)" }}>
                        1-{i + 1}
                      </div>
                      <div className="task-info">
                        <div className="task-name" style={{ fontSize: "12px" }}>
                          {chapter.title}
                        </div>
                        <div className="task-desc">
                          {chapter.subtitle}
                        </div>
                      </div>
                      {done || isActive ? (
                        <div className={`badge ${badgeClass}`}>
                          {badgeText}
                        </div>
                      ) : (
                        <div style={{ fontSize: "14px" }}>🔒</div>
                      )}
                      <div className={done ? "task-check done" : "task-check"} style={{ width: "18px", height: "18px", fontSize: "10px" }}>
                        {done ? '✓' : isActive ? '›' : ''}
                      </div>
                    </div>
                  )
                })}
                <button className="btn-primary" onClick={(event) => { openChapterMissionDetail(firstUnfinishedKey) }} style={{ marginTop: "14px" }}>
                  MỞ CHI TIẾT NHIỆM VỤ {chapterKeys.indexOf(firstUnfinishedKey) + 1}
                </button>
              </div>
            )
          })()}
        </div>
        {/* MODAL: CHAPTER 2+ (locked) - dynamic from journeys.json */}
        {allJourneys.filter((j) => j.chapter > 1).map((journey) => (
          <div key={journey.chapter} className="modal-overlay" onClick={handleOverlayClick} id={`modal-chapter-detail${journey.chapter}`}>
            <div className="modal-box" style={{ textAlign: "center", padding: "30px 16px" }}>
              <div className="modal-close" onClick={(event) => { closeModal(`modal-chapter-detail${journey.chapter}`) }}>
                ✕
              </div>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>🔒</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "20px", fontWeight: "700" }}>
                {(journey.title?.en || `CHAPTER ${journey.chapter}`).toUpperCase()}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                {journey.title?.vi || `Chapter ${journey.chapter}`}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "6px" }}>
                Hoàn thành Chapter {journey.chapter - 1} để mở khóa
              </div>
              <button className="btn-primary" onClick={(event) => { closeModal(`modal-chapter-detail${journey.chapter}`) }} style={{ marginTop: "20px", maxWidth: "160px" }}>
                OK
              </button>
            </div>
          </div>
        ))}
        {/* MODAL: AI SUGGESTIONS */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-ai-suggest">
          <div className="modal-box">
            <div className="modal-close" onClick={(event) => { closeModal('modal-ai-suggest'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>
              🤖 AI Coach – Gợi ý & Phân tích
            </div>
            <div className="tab-row">
              <button className="tab-btn active">
                Gợi ý
              </button>
              <button className="tab-btn">
                Phân tích
              </button>
              <button className="tab-btn">
                Kế hoạch
              </button>
            </div>
            {/* Radar chart (CSS) */}
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "conic-gradient(rgba(59,130,246,.4) 0%,rgba(139,92,246,.4) 50%,rgba(34,197,94,.3) 100%)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(59,130,246,.3)" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--bg-modal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "14px", fontWeight: "700", color: "var(--blue-glow)" }}>
                    69/100
                  </span>
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "8px" }}>
                Điểm tổng quan
              </div>
            </div>
            <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--blue-glow)", marginBottom: "6px" }}>
              Gợi ý hôm nay từ AI
            </div>
            <div className="task-item">
              <div className="task-icon icon-bg-blue">
                💧
              </div>
              <div className="task-info">
                <div className="task-name">
                  Uống đủ nước
                </div>
                <div className="task-desc">
                  Tối thiểu 2L mỗi ngày
                </div>
              </div>
              <div className="badge badge-green">
                +100 XP
              </div>
            </div>
            <div className="task-item">
              <div className="task-icon icon-bg-purple">
                😴
              </div>
              <div className="task-info">
                <div className="task-name">
                  Ngủ 7-8 tiếng
                </div>
                <div className="task-desc">
                  Ngủ trước 23:00
                </div>
              </div>
              <div className="badge badge-green">
                +120 XP
              </div>
            </div>
            <div className="task-item" style={{ borderBottom: "none" }}>
              <div className="task-icon icon-bg-cyan">
                🧘
              </div>
              <div className="task-info">
                <div className="task-name">
                  Thiền 10 phút
                </div>
                <div className="task-desc">
                  Thiền trước khi ngủ
                </div>
              </div>
              <div className="badge badge-green">
                +80 XP
              </div>
            </div>
            <div style={{ background: "rgba(59,130,246,.07)", border: "1px solid rgba(59,130,246,.2)", borderRadius: "10px", padding: "10px", marginTop: "8px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Tin nhắn từ AI Coach
              </div>
              <div style={{ fontSize: "12px", lineHeight: "1.5" }}>
                Bạn đang làm rất tốt! Hãy duy trì những thói quen này để đạt mục tiêu. Deep Work 90 phút · Không thông báo · Pomodoro 25-5-25-5
              </div>
            </div>
            <button className="btn-primary" onClick={(event) => { closeModal('modal-ai-suggest'); }} style={{ marginTop: "14px" }}>
              CHAT VỚI AI COACH
            </button>
          </div>
        </div>
        {/* MODAL: ITEM DETAIL */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-item-detail">
          <div className="modal-box" style={{ textAlign: "center" }}>
            <div className="modal-close" onClick={(event) => { closeModal('modal-item-detail'); }}>
              ✕
            </div>
            <div style={{ fontSize: "52px", marginBottom: "8px" }}>
              🧪
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "20px", fontWeight: "700" }}>
              Focus Potion
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
              Tăng Focus trong 1 giờ
            </div>
            <div className="glow-line" style={{ margin: "14px 0" }}>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--blue-glow)", marginBottom: "6px" }}>
                Hiệu ứng
              </div>
              <div className="badge badge-blue" style={{ marginBottom: "6px", display: "inline-flex" }}>
                +30% Điểm Focus
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                Thời gian: 60 phút
              </div>
              <div className="reward-row" style={{ marginTop: "10px" }}>
                <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                  Đang sở hữu
                </span>
                <span style={{ fontSize: "12px", fontWeight: "600" }}>
                  2
                </span>
              </div>
            </div>
            <div className="glow-line">
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(255,255,255,.08)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "16px", cursor: "pointer" }}>
                  −
                </button>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700" }}>
                  1
                </span>
                <button style={{ width: "28px", height: "28px", borderRadius: "6px", background: "rgba(255,255,255,.08)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "16px", cursor: "pointer" }}>
                  +
                </button>
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "20px", fontWeight: "700", color: "var(--gold)" }}>
                🪙 150
              </div>
            </div>
            <button className="btn-primary" onClick={(event) => { closeModal('modal-item-detail'); }}>
              MUA NGAY
            </button>
            <button className="btn-outline" onClick={(event) => { closeModal('modal-item-detail'); }} style={{ width: "100%", marginTop: "8px" }}>
              XEM ĐỀ XUẤT
            </button>
          </div>
        </div>
        {/* MODAL: LEADERBOARD */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-leaderboard">
          <div className="modal-box">
            <div className="modal-close" onClick={(event) => { closeModal('modal-leaderboard'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>
              🏆 Bảng xếp hạng
            </div>
            <div className="tab-row">
              <button className="tab-btn active">
                Toàn cầu
              </button>
              <button className="tab-btn">
                Bạn bè
              </button>
            </div>
            <div className="lb-item">
              <div className="lb-rank" style={{ color: "var(--gold)" }}>
                1
              </div>
              <div className="lb-avatar">
                🧊
              </div>
              <div className="lb-info">
                <div className="lb-name">
                  Titan
                </div>
                <div className="lb-level">
                  Lv. 18
                </div>
              </div>
              <div className="lb-xp">
                18,450 XP
              </div>
            </div>
            <div className="lb-item">
              <div className="lb-rank" style={{ color: "#94a3b8" }}>
                2
              </div>
              <div className="lb-avatar">
                🥷
              </div>
              <div className="lb-info">
                <div className="lb-name">
                  Shadow
                </div>
                <div className="lb-level">
                  Lv. 16
                </div>
              </div>
              <div className="lb-xp">
                16,230 XP
              </div>
            </div>
            <div className="lb-item">
              <div className="lb-rank" style={{ color: "#cd7f32" }}>
                3
              </div>
              <div className="lb-avatar">
                🦅
              </div>
              <div className="lb-info">
                <div className="lb-name">
                  Phoenix
                </div>
                <div className="lb-level">
                  Lv. 15
                </div>
              </div>
              <div className="lb-xp">
                14,890 XP
              </div>
            </div>
            <div className="lb-item">
              <div className="lb-rank">
                4
              </div>
              <div className="lb-avatar">
                ⚔️
              </div>
              <div className="lb-info">
                <div className="lb-name">
                  Samurai
                </div>
                <div className="lb-level">
                  Lv. 14
                </div>
              </div>
              <div className="lb-xp">
                13,450 XP
              </div>
            </div>
            <div className="lb-item">
              <div className="lb-rank">
                5
              </div>
              <div className="lb-avatar">
                🐉
              </div>
              <div className="lb-info">
                <div className="lb-name">
                  MonkX
                </div>
                <div className="lb-level">
                  Lv. 14
                </div>
              </div>
              <div className="lb-xp">
                12,980 XP
              </div>
            </div>
            <div className="glow-line">
            </div>
            <div className="lb-item" style={{ background: "rgba(139,92,246,.08)", borderRadius: "8px", padding: "0 8px" }}>
              <div className="lb-rank" style={{ color: "var(--purple-glow)" }}>
                12
              </div>
              <div className="lb-avatar" style={{ background: "rgba(139,92,246,.3)" }}>
                🥷
              </div>
              <div className="lb-info">
                <div className="lb-name" style={{ color: "var(--purple-glow)" }}>
                  You
                </div>
                <div className="lb-level">
                  Lv. 12
                </div>
              </div>
              <div className="lb-xp" style={{ color: "var(--purple-glow)" }}>
                7,540 XP
              </div>
            </div>
            <button className="btn-outline" onClick={(event) => { closeModal('modal-leaderboard'); }} style={{ width: "100%", marginTop: "12px" }}>
              XEM BẢNG XẾP HẠNG ĐẦY ĐỦ
            </button>
          </div>
        </div>
        {/* MODAL: DAILY REWARD */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-daily-reward">
          <div className="modal-box" style={{ textAlign: "center" }}>
            <div className="modal-close" onClick={(event) => { closeModal('modal-daily-reward'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>
              🎁 Phần thưởng hàng ngày
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "14px" }}>
              7 ngày liên tiếp · Hôm nay: Ngày 7
            </div>
            <div className="day-grid" style={{ marginBottom: "16px" }}>
              <div className="day-item claimed">
                <div className="day-label">
                  N1
                </div>
                <div className="day-check">
                  ✅
                </div>
              </div>
              <div className="day-item claimed">
                <div className="day-label">
                  N2
                </div>
                <div className="day-check">
                  ✅
                </div>
              </div>
              <div className="day-item claimed">
                <div className="day-label">
                  N3
                </div>
                <div className="day-check">
                  ✅
                </div>
              </div>
              <div className="day-item claimed">
                <div className="day-label">
                  N4
                </div>
                <div className="day-check">
                  ✅
                </div>
              </div>
              <div className="day-item claimed">
                <div className="day-label">
                  N5
                </div>
                <div className="day-check">
                  ✅
                </div>
              </div>
              <div className="day-item claimed">
                <div className="day-label">
                  N6
                </div>
                <div className="day-check">
                  ✅
                </div>
              </div>
              <div className="day-item today">
                <div className="day-label">
                  N7
                </div>
                <div className="day-check">
                  🎁
                </div>
              </div>
            </div>
            <div style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.3)", borderRadius: "12px", padding: "16px", marginBottom: "14px" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                🎁
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "16px", fontWeight: "700", color: "var(--gold)" }}>
                RƯƠNG HUYỀN THOẠI!
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", margin: "4px 0 10px" }}>
                Chúc mừng! Bạn đã nhận được phần thưởng ngày 7
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                <div className="badge badge-blue">
                  💎 500
                </div>
                <div className="badge badge-gold">
                  🪙 100
                </div>
                <div className="badge badge-purple">
                  ⭐ ×1
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={(event) => { closeModal('modal-daily-reward'); }}>
              NHẬN THƯỞNG
            </button>
          </div>
        </div>
        {/* MODAL: LEVEL UP */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-level-up">
          <div className="modal-box" style={{ textAlign: "center" }}>
            <div className="modal-close" onClick={(event) => { closeModal('modal-level-up'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "28px", fontWeight: "900", letterSpacing: "2px", color: "var(--gold)", marginBottom: "4px" }}>
              LEVEL UP!
            </div>
            <div className="level-badge">
              13
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700" }}>
              Shadow Warrior
            </div>
            <div className="glow-line">
            </div>
            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>
              Phần thưởng
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                XP
              </span>
              <span className="badge badge-gold">
                +850
              </span>
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                ENERGY
              </span>
              <span className="badge badge-blue">
                +50
              </span>
            </div>
            <div className="reward-row">
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                DISCIPLINE
              </span>
              <span className="badge badge-purple">
                +15
              </span>
            </div>
            <div className="reward-row" style={{ borderBottom: "none" }}>
              <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                MYSTERY CHEST
              </span>
              <span className="badge badge-gold">
                ×1
              </span>
            </div>
            <button className="btn-primary" onClick={(event) => { closeModal('modal-level-up'); }} style={{ marginTop: "16px" }}>
              TUYỆT VỜI!
            </button>
          </div>
        </div>
        {/* MODAL: STATS */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-stats">
          <div className="modal-box">
            <div className="modal-close" onClick={(event) => { closeModal('modal-stats'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>
              📊 Thống kê
            </div>
            <div className="tab-row">
              <button className="tab-btn active">
                Tuần
              </button>
              <button className="tab-btn">
                Tháng
              </button>
              <button className="tab-btn">
                Năm
              </button>
            </div>
            {/* Overview */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700", color: "var(--green)" }}>
                  32
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  NV hoàn thành
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700", color: "var(--gold)" }}>
                  8,450
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  XP nhận được
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700", color: "var(--fire)" }}>
                  12
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  Streak dài nhất
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "700", color: "var(--cyan)" }}>
                  21h30
                </div>
                <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>
                  Tgian tập TB
                </div>
              </div>
            </div>
            {/* Stat bars */}
            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px" }}>
              Tiến độ chỉ số
            </div>
            <div className="stat-bar-row">
              <span className="stat-bar-label" style={{ color: "#60a5fa" }}>
                Focus
              </span>
              <div className="stat-bar-wrap">
                <div className="stat-bar-fill" style={{ width: "81%", background: "#60a5fa" }}>
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#60a5fa", marginLeft: "6px" }}>
                81
              </span>
            </div>
            <div className="stat-bar-row">
              <span className="stat-bar-label" style={{ color: "#a78bfa" }}>
                Discipline
              </span>
              <div className="stat-bar-wrap">
                <div className="stat-bar-fill" style={{ width: "92%", background: "#a78bfa" }}>
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#a78bfa", marginLeft: "6px" }}>
                92
              </span>
            </div>
            <div className="stat-bar-row">
              <span className="stat-bar-label" style={{ color: "#f97316" }}>
                Energy
              </span>
              <div className="stat-bar-wrap">
                <div className="stat-bar-fill" style={{ width: "63%", background: "#f97316" }}>
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#f97316", marginLeft: "6px" }}>
                63
              </span>
            </div>
            <div className="stat-bar-row">
              <span className="stat-bar-label" style={{ color: "#4ade80" }}>
                Health
              </span>
              <div className="stat-bar-wrap">
                <div className="stat-bar-fill" style={{ width: "74%", background: "#4ade80" }}>
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#4ade80", marginLeft: "6px" }}>
                74
              </span>
            </div>
            <div className="stat-bar-row">
              <span className="stat-bar-label" style={{ color: "#38bdf8" }}>
                Knowledge
              </span>
              <div className="stat-bar-wrap">
                <div className="stat-bar-fill" style={{ width: "58%", background: "#38bdf8" }}>
                </div>
              </div>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#38bdf8", marginLeft: "6px" }}>
                58
              </span>
            </div>
          </div>
        </div>
        {/* MODAL: ACHIEVEMENTS */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-achievements">
          <div className="modal-box">
            <div className="modal-close" onClick={(event) => { closeModal('modal-achievements'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>
              🏅 Thành tựu
            </div>
            <div className="tab-row">
              <button className="tab-btn active">
                Tất cả
              </button>
              <button className="tab-btn">
                Đã mở
              </button>
              <button className="tab-btn">
                Chưa mở
              </button>
            </div>
            <div className="ach-grid">
              <div className="ach-item">
                <div className="ach-icon unlocked">
                  🔥
                </div>
                <div className="ach-name">
                  7 Days Streak
                </div>
              </div>
              <div className="ach-item">
                <div className="ach-icon unlocked">
                  🌅
                </div>
                <div className="ach-name">
                  Early Bird
                </div>
              </div>
              <div className="ach-item">
                <div className="ach-icon locked">
                  🍬
                </div>
                <div className="ach-name">
                  No Sugar 3 Days
                </div>
              </div>
              <div className="ach-item">
                <div className="ach-icon unlocked">
                  💼
                </div>
                <div className="ach-name">
                  Deep Worker
                </div>
              </div>
              <div className="ach-item">
                <div className="ach-icon locked">
                  📚
                </div>
                <div className="ach-name">
                  Book Worm
                </div>
              </div>
              <div className="ach-item">
                <div className="ach-icon unlocked">
                  🚿
                </div>
                <div className="ach-name">
                  Cold Shower
                </div>
              </div>
              <div className="ach-item">
                <div className="ach-icon locked">
                  🧘
                </div>
                <div className="ach-name">
                  Meditation Master
                </div>
              </div>
              <div className="ach-item">
                <div className="ach-icon locked">
                  ⚡
                </div>
                <div className="ach-name">
                  Consistent
                </div>
              </div>
              <div className="ach-item">
                <div className="ach-icon locked">
                  🦉
                </div>
                <div className="ach-name">
                  Night Owl
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* MODAL: SKILL TREE */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-skill-tree">
          <div className="modal-box">
            <div className="modal-close" onClick={(event) => { closeModal('modal-skill-tree'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "4px" }}>
              🌳 Cây kỹ năng
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "14px" }}>
              DISCIPLINE TREE · Điểm kỹ năng: 2
            </div>
            {/* Tree layout */}
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              {/* Row 1 */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <div className="skill-node">
                  <div className="skill-circle maxed">
                    ⏰
                  </div>
                  <div className="skill-node-name">
                    Wake Up Early
                  </div>
                  <div className="skill-node-level">
                    1/1
                  </div>
                </div>
              </div>
              {/* Connector */}
              <div style={{ width: "2px", height: "16px", background: "rgba(139,92,246,.4)", margin: "0 auto -4px" }}>
              </div>
              {/* Row 2 */}
              <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginBottom: "16px" }}>
                <div className="skill-node">
                  <div className="skill-circle unlocked">
                    🧠
                  </div>
                  <div className="skill-node-name">
                    Dopamine Detox
                  </div>
                  <div className="skill-node-level">
                    3/3
                  </div>
                </div>
                <div className="skill-node">
                  <div className="skill-circle unlocked">
                    💼
                  </div>
                  <div className="skill-node-name">
                    Deep Work
                  </div>
                  <div className="skill-node-level">
                    2/3
                  </div>
                </div>
              </div>
              {/* Row 3 */}
              <div style={{ display: "flex", justifyContent: "center", gap: "32px" }}>
                <div className="skill-node">
                  <div className="skill-circle" style={{ opacity: ".5" }}>
                    🏆
                  </div>
                  <div className="skill-node-name">
                    Consistency
                  </div>
                  <div className="skill-node-level">
                    0/3
                  </div>
                </div>
                <div className="skill-node">
                  <div className="skill-circle" style={{ opacity: ".5" }}>
                    🧙
                  </div>
                  <div className="skill-node-name">
                    Monk Mode
                  </div>
                  <div className="skill-node-level">
                    0/3
                  </div>
                </div>
              </div>
            </div>
            <button className="btn-outline" onClick={(event) => { closeModal('modal-skill-tree'); }} style={{ width: "100%", marginTop: "16px" }}>
              XEM TẤT CẢ CÂY KỸ NĂNG
            </button>
          </div>
        </div>
        {/* MODAL: EDIT PROFILE */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-edit-profile">
          <div className="modal-box">
            <div className="modal-close" onClick={(event) => { closeModal('modal-edit-profile'); }}>
              ✕
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "18px", fontWeight: "700", marginBottom: "14px" }}>
              ✏️ Chỉnh sửa Profile
            </div>
            {/* Avatar */}
            <div style={{ textAlign: "center", marginBottom: "14px" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(139,92,246,.25)", border: "2px solid var(--purple)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px" }}>
                🥷
              </div>
              <button className="btn-sm badge-blue" style={{ border: "none", cursor: "pointer" }}>
                Đổi ảnh đại diện
              </button>
            </div>
            {/* Fields */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>
                Tên hiển thị
              </div>
              <select style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", color: "var(--text)", fontSize: "12px", outline: "none" }}>
                <option>
                  Shadow Warrior
                </option>
                <option>
                  Warrior
                </option>
                <option>
                  Shadow Master
                </option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>
                Ảnh nền
              </div>
              <select style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", color: "var(--text)", fontSize: "12px", outline: "none" }}>
                <option>
                  Chọn ảnh nền
                </option>
                <option>
                  Warrior Realm
                </option>
                <option>
                  Dark Forest
                </option>
              </select>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>
                Khung avatar
              </div>
              <select style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", color: "var(--text)", fontSize: "12px", outline: "none" }}>
                <option>
                  Legend Frame
                </option>
                <option>
                  Default
                </option>
                <option>
                  Golden Frame
                </option>
              </select>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "4px" }}>
                Danh hiệu
              </div>
              <select style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid var(--border)", borderRadius: "8px", padding: "8px 10px", color: "var(--text)", fontSize: "12px", outline: "none" }}>
                <option>
                  No Sugar Champion
                </option>
                <option>
                  Deep Worker
                </option>
                <option>
                  Early Bird
                </option>
              </select>
            </div>
            <button className="btn-primary" onClick={(event) => { closeModal('modal-edit-profile'); }}>
              LƯU THAY ĐỔI
            </button>
          </div>
        </div>
        {/* MODAL: XEM TẤT CẢ CHAPTER - dynamic from journeys.json */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-all-chapters">
          <div className="modal-box" style={{ padding: "0", overflow: "hidden" }}>
            <div className="modal-close" onClick={(event) => { closeModal('modal-all-chapters'); }} style={{ top: "14px", right: "14px", zIndex: "20" }}>
              ✕
            </div>
            <div style={{ background: "linear-gradient(135deg,#0f1a3a 0%,#1a0a3a 60%,#0a1228 100%)", padding: "20px 16px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: "0", background: "radial-gradient(circle at 70% 40%,rgba(139,92,246,0.3) 0%,transparent 65%)", pointerEvents: "none" }}></div>
              <div style={{ fontSize: "10px", color: "var(--purple-glow)", letterSpacing: "2px", fontWeight: "700", textTransform: "uppercase", marginBottom: "4px" }}>
                Hành trình
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "900", color: "#fff", marginBottom: "4px" }}>
                TẤT CẢ CHAPTER
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>
                {allJourneys.length} Chapter · 1 đang mở · 1 đang tiến hành
              </div>
            </div>
            <div style={{ padding: "14px 14px 6px" }}>
              {allJourneys.map((journey, idx) => {
                const isChapter1 = journey.chapter === 1
                const isUnlocked = isChapter1 || snapshot.journeyUser?.journeyProgress?.unlockedChapters?.includes(journey.chapter)
                const chapterIcons = ['🌅', '🔥', '⚡', '👑', '⚜️']
                const icon = chapterIcons[idx] || '⭐'
                const objectives = journey.requiredObjectives || []
                const totalTarget = objectives.reduce((s, o) => s + (o.target || 1), 0)
                const currentSum = objectives.reduce((s, o) => {
                  const obj = journeyObjective(o.task)
                  return s + Math.min(obj?.current || 0, o.target || 1)
                }, 0)
                const chPct = totalTarget > 0 ? Math.min(100, Math.round(currentSum / totalTarget * 100)) : 0
                const chDone = objectives.length > 0 ? chPct >= 100 : isUnlocked

                // canUnlock logic
                const prevJourney = idx > 0 ? allJourneys[idx - 1] : null
                const prevDone = prevJourney ? (() => {
                  const pObjs = prevJourney.requiredObjectives || []
                  if (pObjs.length === 0) return snapshot.journeyUser?.journeyProgress?.unlockedChapters?.includes(prevJourney.chapter)
                  const pTgt = pObjs.reduce((s, o) => s + (o.target || 1), 0)
                  const pCur = pObjs.reduce((s, o) => {
                    const obj = journeyObjective(o.task)
                    return s + Math.min(obj?.current || 0, o.target || 1)
                  }, 0)
                  return pTgt > 0 && pCur >= pTgt
                })() : false
                const canUnlock = !isUnlocked && prevDone

                return (
                  <div key={journey.chapter} style={{ marginBottom: "10px" }}>
                    <div
                      onClick={() => {
                        closeModal('modal-all-chapters')
                        if (canUnlock) { checkAndUnlockChapters(user, allJourneys); return }
                        if (!isUnlocked) { showLockedChapter((journey.title?.en || `Chapter ${journey.chapter}`).toUpperCase(), `Hoàn thành Chapter ${journey.chapter - 1} để mở khóa`, icon); return }
                        if (isChapter1) openJourneyPopup('overview')
                        else openJourneyPopup(`chapter_${journey.chapter}`)
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        background: isChapter1 ? "rgba(139,92,246,0.10)" : canUnlock ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
                        border: isChapter1 ? "1px solid rgba(139,92,246,0.4)" : canUnlock ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: canUnlock ? "12px 12px 0 0" : "12px",
                        borderBottom: canUnlock ? "none" : undefined,
                        padding: "12px", cursor: "pointer",
                        position: "relative", overflow: "hidden",
                        opacity: isUnlocked || canUnlock ? 1 : idx === 1 ? 0.6 : 0.45,
                      }}
                    >
                      {isChapter1 && (
                        <div style={{ position: "absolute", left: "0", top: "0", bottom: "0", width: "3px", background: "linear-gradient(180deg,var(--purple),var(--blue))", borderRadius: "2px 0 0 2px" }}></div>
                      )}
                      <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: isChapter1 ? "rgba(139,92,246,0.25)" : "rgba(59,130,246,0.12)", border: isChapter1 ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: "0" }}>
                        {isUnlocked ? icon : canUnlock ? '🔓' : '🔒'}
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "2px" }}>
                          CHAPTER {journey.chapter}
                        </div>
                        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "16px", fontWeight: "800", color: isUnlocked || canUnlock ? "#fff" : "var(--text-dim)" }}>
                          {(journey.title?.en || `Chapter ${journey.chapter}`).toUpperCase()}
                        </div>
                        {isUnlocked && objectives.length > 0 && (
                          <>
                            <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "99px", margin: "5px 0 3px", overflow: "hidden" }}>
                              <div style={{ height: "4px", width: `${chPct}%`, background: chDone ? "#22c55e" : "linear-gradient(90deg,var(--purple),var(--blue))", borderRadius: "99px" }}></div>
                            </div>
                            <div style={{ fontSize: "10px", color: chDone ? "#86efac" : "var(--blue-glow)" }}>
                              {chDone ? '✓ Hoàn thành' : isChapter1
                                ? (waterObjective ? `Uống nước ${waterObjective.current}/${waterObjective.target} · ${chPct}%` : `${chPct}% · Tiếp tục`)
                                : `${chPct}% · Đang chơi`}
                            </div>
                          </>
                        )}
                        {isUnlocked && objectives.length === 0 && (
                          <div style={{ fontSize: "10px", color: "#86efac", marginTop: "4px" }}>✓ Đã mở khoá</div>
                        )}
                        {!isUnlocked && canUnlock && (
                          <div style={{ fontSize: "10px", color: "#fbbf24", marginTop: "4px" }}>✅ Đủ điều kiện · Nhấn để mở khoá!</div>
                        )}
                        {!isUnlocked && !canUnlock && (
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Hoàn thành Ch.{journey.chapter - 1} để mở khóa
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: "0" }}>
                        {isChapter1 && <div className="badge badge-green" style={{ fontSize: "9px", padding: "2px 6px" }}>Đang chơi</div>}
                        <div style={{ color: canUnlock ? "#fbbf24" : isUnlocked ? (isChapter1 ? "var(--blue-glow)" : "var(--text-muted)") : "var(--text-muted)", fontSize: "18px" }}>
                          {isUnlocked ? '›' : canUnlock ? '🔓' : '🔒'}
                        </div>
                      </div>
                    </div>
                    {/* Unlock button */}
                    {canUnlock && (
                      <button
                        onClick={() => { closeModal('modal-all-chapters'); checkAndUnlockChapters(user, allJourneys) }}
                        style={{
                          width: '100%', padding: '9px 16px',
                          borderRadius: '0 0 12px 12px',
                          border: '1px solid rgba(245,158,11,.4)',
                          borderTop: 'none',
                          background: 'linear-gradient(135deg,rgba(245,158,11,.2),rgba(234,88,12,.15))',
                          color: '#fbbf24', fontWeight: 800, fontSize: 12,
                          cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        🔓 MỞ KHOÁ CHAPTER {journey.chapter} · {(journey.title?.en || '').toUpperCase()}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <button className="btn-primary" onClick={(event) => {
                const currentChapter = snapshot.journeyUser?.journeyProgress?.currentChapter || 1
                closeModal('modal-all-chapters')
                openJourneyPopup('overview')
              }}>
                TIẾP TỤC CHAPTER {snapshot.journeyUser?.journeyProgress?.currentChapter || 1}
              </button>
            </div>
          </div>
        </div>
        {/* MODAL: LOCKED CHAPTER NOTICE */}
        <div className="modal-overlay" onClick={handleOverlayClick} id="modal-locked-chapter">
          <div className="modal-box" style={{ textAlign: "center", padding: "32px 20px 24px", margin: "auto 20px" }}>
            <div className="modal-close" onClick={(event) => { closeModal('modal-locked-chapter'); }}>
              ✕
            </div>
            <div id="locked-chapter-icon" style={{ fontSize: "52px", marginBottom: "12px" }}>
              🔒
            </div>
            <div id="locked-chapter-name" style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: "900", color: "#fff", marginBottom: "8px" }}>
            </div>
            <div id="locked-chapter-msg" style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "20px", lineHeight: "1.5" }}>
            </div>
            <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "10px", padding: "12px", marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Tiến độ hiện tại
              </div>
              <div style={{ fontSize: "12px", color: "var(--blue-glow)", fontWeight: "600" }}>
                {(() => {
                  const currentChapter = snapshot.journeyUser?.journeyProgress?.currentChapter || 1
                  const curJourney = allJourneys.find((j) => j.chapter === currentChapter) || {}
                  const objectives = curJourney.requiredObjectives || []
                  const totalTarget = objectives.reduce((s, o) => s + (o.target || 1), 0)
                  const currentSum = objectives.reduce((s, o) => {
                    const obj = journeyObjective(o.task)
                    return s + Math.min(obj?.current || 0, o.target || 1)
                  }, 0)
                  const curPct = totalTarget > 0 ? Math.min(100, Math.round(currentSum / totalTarget * 100)) : 0
                  return `Chapter ${currentChapter} · ${(curJourney.title?.en || 'THE AWAKENING').toUpperCase()} · ${curPct}%`
                })()}
              </div>
            </div>
            <button className="btn-primary" onClick={(event) => {
              closeModal('modal-locked-chapter')
              closeModal('modal-all-chapters')
              openJourneyPopup('overview')
            }}>
              TIẾP TỤC CHAPTER {snapshot.journeyUser?.journeyProgress?.currentChapter || 1}
            </button>
            <button className="btn-outline" style={{ width: "100%", marginTop: "8px" }} onClick={(event) => { closeModal('modal-locked-chapter'); }}>
              ĐÓNG
            </button>
          </div>
        </div>
        {/* ═══════════════════════════════ BOTTOM NAV ═══════════════════════════════ */}
        <nav id="bottom-nav">
          <div className={`nav-item${activeScreen === 'screen-home' ? ' active' : ''}`} id="nav-home" onClick={(event) => { goTo('screen-home'); }}>
            <span className="nav-icon">
              🏠
            </span>
            <span className="nav-label">
              Trang chủ
            </span>
          </div>
          <div className={`nav-item${activeScreen === 'screen-nhiem-vu' ? ' active' : ''}`} id="nav-nhiem-vu" onClick={(event) => { goTo('screen-nhiem-vu'); }}>
            <span className="nav-icon">
              📋
            </span>
            <span className="nav-label">
              Nhiệm vụ
            </span>
          </div>
          <div className={`nav-item${activeScreen === 'screen-hanh-trinh' ? ' active' : ''}`} id="nav-hanh-trinh" onClick={(event) => { goTo('screen-hanh-trinh'); }} style={{ flex: "1" }}>
            <span className="nav-icon">
              ⚔️
            </span>
            <span className="nav-label">
              Hành trình
            </span>
          </div>
          <div style={{ flex: "0 0 64px", display: "flex", justifyContent: "center" }}>
            <div className="nav-center" onClick={(event) => { goTo('screen-ai-coach'); }}>
              🎤
            </div>
          </div>
          <div className={`nav-item${activeScreen === 'screen-cua-hang' ? ' active' : ''}`} id="nav-cua-hang" onClick={(event) => { goTo('screen-cua-hang'); }}>
            <span className="nav-icon">
              🏪
            </span>
            <span className="nav-label">
              Cửa hàng
            </span>
          </div>
          <div className={`nav-item${activeScreen === 'screen-rewards' ? ' active' : ''}`} id="nav-rewards" onClick={(event) => { goTo('screen-rewards'); }}>
            <span className="nav-icon">
              🎁
            </span>
            <span className="nav-label">
              Rewards
            </span>
          </div>
          <div className={`nav-item${activeScreen === 'screen-profile' ? ' active' : ''}`} id="nav-profile" onClick={(event) => { goTo('screen-profile'); }}>
            <span className="nav-icon">
              👤
            </span>
            <span className="nav-label">
              Profile
            </span>
          </div>
        </nav>

        {/* ── Help Center: floating HELP button + fullscreen guide overlay ── */}
        <HelpButton onClick={() => setHelpOpen(true)} />
        <HelpOverlay
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          onNavigate={handleHelpNavigate}
        />
      </div>

      {/* ── TaskDetailPopup: Chi tiết Nhiệm Vụ (dynamic from daily_tasks.json) ── */}
      {taskPopupKey && (
        <TaskDetailPopup
          taskId={taskPopupKey}
          snapshot={snapshot}
          user={user}
          onClose={() => setTaskPopupKey(null)}
          onViewMedicalRecord={onViewMedicalRecord}
          onOpenJourney={(chapterKey) => {
            setTaskPopupKey(null)
            setJourneyPopupKey(chapterKey || 'overview')
          }}
        />
      )}

      {/* ── JourneyDetailPopup: Chi tiết Journey (dynamic from journeys.json) ── */}
      {journeyPopupKey && (
        <JourneyDetailPopup
          chapterKey={journeyPopupKey === 'overview' ? null : journeyPopupKey}
          snapshot={snapshot}
          onClose={() => setJourneyPopupKey(null)}
          onViewMedicalRecord={onViewMedicalRecord}
          onOpenTask={(taskId) => {
            setJourneyPopupKey(null)
            setTaskPopupKey(taskId)
          }}
        />
      )}
    </div>
  )
}