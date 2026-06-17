// ════════════════════════════════════════════════════════════════════════
// Help Center — Content data (Neuro Quest / Health Journey Game)
// All text, screen metadata, colors & robot scripts live here so the
// presentational components (HelpTabs, HelpScreenViewer, HelpRobot,
// HelpFlowMap) stay dumb and easy to re-skin.
// ════════════════════════════════════════════════════════════════════════

import imgMainMenu from '../health-journey-game-main-menu.png'
import imgFlowReference from '../health-journey-game-man-hinh-detail.png'

import img01 from './screens/01-trang-chu.png'
import img02 from './screens/02-nhiem-vu.png'
import img03 from './screens/03-hanh-trinh.png'
import img04 from './screens/04-ai-coach.png'
import img05 from './screens/05-cua-hang.png'
import img06 from './screens/06-profile.png'
import img07 from './screens/07-thong-ke.png'
import img08 from './screens/08-chi-tiet-nhiem-vu.png'
import img09 from './screens/09-hanh-trinh-chapter.png'
import img10 from './screens/10-ai-coach-goi-y.png'
import img11 from './screens/11-leaderboard.png'
import img12 from './screens/12-daily-reward.png'

export const HELP_ASSETS = {
  mainMenu: imgMainMenu,
  flowReference: imgFlowReference,
}

// Special, non-screen tabs shown first in the tab bar.
export const INTRO_TABS = [
  { id: 'menu', icon: '🗺️', label: 'Menu chính', color: '#38bdf8' },
  { id: 'flow', icon: '🔗', label: 'Sơ đồ liên kết', color: '#a78bfa' },
]

// The 12 detail screens, in the exact order & naming used in
// health-journey-game-detail-name-all-page.png.
// `target` describes how the live app should react when the user taps
// "Đi đến màn hình này" — it always maps to a real screen/modal id that
// exists in HealthJourneyGameStandalone.jsx.
export const HELP_SCREENS = [
  {
    id: 'home',
    num: '01',
    icon: '🏠',
    name: 'TRANG CHỦ',
    color: '#3b82f6',
    image: img01,
    caption: 'Tổng quan hành trình của bạn: điểm, streak, check-in, lịch sử và thông tin nhanh.',
    robotScript: 'Đây là Trang chủ — nơi đầu tiên bạn nhìn thấy mỗi khi mở Neuro Quest. Mình sẽ tóm tắt điểm XP, năng lượng, streak ngày và đưa bạn vào nút "BẮT ĐẦU" để tiếp tục nhiệm vụ gần nhất.',
    target: { screen: 'screen-home' },
  },
  {
    id: 'nhiem-vu',
    num: '02',
    icon: '📋',
    name: 'NHIỆM VỤ',
    color: '#22c55e',
    image: img02,
    caption: 'Danh sách nhiệm vụ hàng ngày, hàng tuần và thành tựu.',
    robotScript: 'Tab Nhiệm vụ liệt kê mọi việc cần làm hôm nay, theo tuần và theo tháng. Hoàn thành từng dòng để nhận rương thưởng XP — chạm vào một nhiệm vụ để mở Chi tiết nhiệm vụ (tab số 08 ở bên dưới).',
    target: { screen: 'screen-nhiem-vu' },
  },
  {
    id: 'hanh-trinh',
    num: '03',
    icon: '⚔️',
    name: 'HÀNH TRÌNH',
    color: '#f59e0b',
    image: img03,
    caption: 'Theo dõi tiến độ các chương, thử thách và thành tựu lớn.',
    robotScript: 'Hành trình chia thành các Chapter lớn (The Awakening, The Discipline…). Mỗi Chapter có nhiều mốc nhỏ — bấm vào một Chapter để mở trang Hành trình – Chapter (tab số 09) và xem chi tiết từng bước.',
    target: { screen: 'screen-hanh-trinh' },
  },
  {
    id: 'ai-coach',
    num: '04',
    icon: '🎙️',
    name: 'AI COACH',
    color: '#8b5cf6',
    image: img04,
    caption: 'AI phân tích và đưa ra đề xuất, gợi ý hành động cá nhân hoá cho bạn.',
    robotScript: 'Đây chính là mình — AI Coach phiên bản đầy đủ! Mình phân tích thói quen, mục tiêu, giấc ngủ và công việc của bạn để gợi ý hành động phù hợp nhất, xem chi tiết ở tab AI Coach – Gợi ý (tab số 10).',
    target: { screen: 'screen-ai-coach' },
  },
  {
    id: 'cua-hang',
    num: '05',
    icon: '🏪',
    name: 'CỬA HÀNG',
    color: '#ef4444',
    image: img05,
    caption: 'Mua vật phẩm, gói nâng cấp, NFT và các đặc biệt khác.',
    robotScript: 'Cửa hàng dùng Vàng và Kim cương bạn kiếm được để đổi Pack, vật phẩm hỗ trợ tập luyện (Energy Boost, Focus Potion…) và cả rương bí ẩn. Mọi giao dịch đều ảnh hưởng trực tiếp tới chỉ số trong Profile.',
    target: { screen: 'screen-cua-hang' },
  },
  {
    id: 'profile',
    num: '06',
    icon: '👤',
    name: 'PROFILE',
    color: '#06b6d4',
    image: img06,
    caption: 'Thông tin tài khoản, chỉ số chính và nhập kết quả InBody.',
    robotScript: 'Profile lưu toàn bộ thông tin chiến binh của bạn: cấp độ, chỉ số Focus / Discipline / Energy / Health, và cho phép nhập kết quả Scan InBody để Neuro Quest cá nhân hoá lộ trình tốt hơn.',
    target: { screen: 'screen-profile' },
  },
  {
    id: 'thong-ke',
    num: '07',
    icon: '📊',
    name: 'THỐNG KÊ',
    color: '#60a5fa',
    image: img07,
    caption: 'Xem thống kê tổng quan, xu hướng và tiến độ theo từng thời gian.',
    robotScript: 'Mở từ biểu tượng thống kê trên Trang chủ. Biểu đồ này theo dõi Focus, Discipline, Energy, Health theo Tuần / Tháng / Năm để bạn biết mình đang tiến bộ ở đâu.',
    target: { screen: 'screen-home', modal: 'modal-stats' },
  },
  {
    id: 'chi-tiet-nhiem-vu',
    num: '08',
    icon: '📝',
    name: 'CHI TIẾT NHIỆM VỤ',
    color: '#a78bfa',
    image: img08,
    caption: 'Chi tiết nhiệm vụ, thời gian, phần thưởng và lịch sử.',
    robotScript: 'Chạm vào bất kỳ nhiệm vụ nào trong tab Nhiệm vụ sẽ mở trang này — bạn thấy rõ thời gian cần, phần thưởng XP/Energy, và cả lịch sử các lần hoàn thành trước đó.',
    target: { screen: 'screen-nhiem-vu', taskPopup: true },
  },
  {
    id: 'hanh-trinh-chapter',
    num: '09',
    icon: '📖',
    name: 'HÀNH TRÌNH – CHAPTER',
    color: '#fb923c',
    image: img09,
    caption: 'Nội dung chi tiết từng chapter và tiến độ hoàn thành.',
    robotScript: 'Đây là màn hình chi tiết của một Chapter trong Hành trình. Mỗi mốc (1-1, 1-2, 1-3…) hiển thị % hoàn thành, mốc nào đang khoá 🔒 sẽ mở ra khi bạn hoàn thành mốc trước.',
    target: { screen: 'screen-hanh-trinh', journeyPopup: true },
  },
  {
    id: 'ai-coach-goi-y',
    num: '10',
    icon: '💡',
    name: 'AI COACH – GỢI Ý',
    color: '#f472b6',
    image: img10,
    caption: 'Gợi ý hành động, phân tích và thông tin dành riêng cho bạn.',
    robotScript: 'Khi bạn bấm "Phân tích" trong AI Coach, mình sẽ mở bảng gợi ý này: từng hành động kèm số XP thưởng, cộng thêm tin nhắn động viên cá nhân hoá riêng cho bạn.',
    target: { screen: 'screen-ai-coach', modal: 'modal-ai-suggest' },
  },
  {
    id: 'leaderboard',
    num: '11',
    icon: '🏆',
    name: 'LEADERBOARD',
    color: '#f43f5e',
    image: img11,
    caption: 'Bảng xếp hạng cá nhân hoặc bạn bè.',
    robotScript: 'Leaderboard cho thấy bạn đang đứng ở đâu so với chiến binh khác — chuyển qua tab "Bạn bè" để so sánh riêng với nhóm của bạn. Mở từ Trang chủ hoặc từ tab Rewards.',
    target: { screen: 'screen-home', modal: 'modal-leaderboard' },
  },
  {
    id: 'daily-reward',
    num: '12',
    icon: '🎁',
    name: 'DAILY REWARD',
    color: '#f97316',
    image: img12,
    caption: 'Phần thưởng đăng nhập hàng ngày, streak và rương huyền thoại.',
    robotScript: 'Đăng nhập đủ 7 ngày liên tiếp để mở Rương Huyền Thoại! Đừng bỏ lỡ streak — mỗi ngày bỏ lỡ sẽ làm chuỗi của bạn quay lại Day 1. Mở từ Trang chủ hoặc tab Rewards.',
    target: { screen: 'screen-home', modal: 'modal-daily-reward' },
  },
]

// Real bottom-navigation of the live app (7 items) — used to draw the
// Flow Map accurately, independent from the 12 reference screenshots.
export const NAV_FLOW = [
  { id: 'screen-home', icon: '🏠', label: 'Trang chủ', color: '#3b82f6', detailId: 'thong-ke' },
  { id: 'screen-nhiem-vu', icon: '📋', label: 'Nhiệm vụ', color: '#22c55e', detailId: 'chi-tiet-nhiem-vu' },
  { id: 'screen-hanh-trinh', icon: '⚔️', label: 'Hành trình', color: '#f59e0b', detailId: 'hanh-trinh-chapter' },
  { id: 'screen-ai-coach', icon: '🎤', label: 'AI Coach', color: '#8b5cf6', detailId: 'ai-coach-goi-y', isCenter: true },
  { id: 'screen-cua-hang', icon: '🏪', label: 'Cửa hàng', color: '#ef4444', detailId: null },
  { id: 'screen-rewards', icon: '🎁', label: 'Rewards', color: '#f97316', detailId: 'daily-reward', detailId2: 'leaderboard' },
  { id: 'screen-profile', icon: '👤', label: 'Profile', color: '#06b6d4', detailId: null },
]

export const ROBOT_INTRO = {
  menu: 'Chào Chiến binh! 👋 Mình là AI Coach, trợ lý hướng dẫn của Neuro Quest. Đây là Menu chính — 7 khu vực bạn có thể đi tới bất cứ lúc nào từ thanh điều hướng dưới cùng. Cuộn ngang các tab phía trên để mình giải thích từng màn hình nhé!',
  flow: 'Đây là sơ đồ liên kết giữa các màn hình. Mỗi mũi tên neon nối một nút trên thanh điều hướng tới đúng màn hình của nó — một số màn hình còn có trang chi tiết mở rộng, mình đánh dấu bằng node nhỏ phía dưới.',
}

export function findScreenById(id) {
  return HELP_SCREENS.find((s) => s.id === id) || null
}

// Maps a real `screen-*` id (used inside HealthJourneyGameStandalone /
// NAV_FLOW) to the matching Help-Center tab id from HELP_SCREENS, so the
// Flow Map can switch tabs when a node is clicked. `screen-rewards` has
// no dedicated zoomed tab (not present in the reference screenshots),
// so it resolves to `null` and the overlay falls back to the menu tab.
export const NAV_ID_TO_TAB = {
  'screen-home': 'home',
  'screen-nhiem-vu': 'nhiem-vu',
  'screen-hanh-trinh': 'hanh-trinh',
  'screen-ai-coach': 'ai-coach',
  'screen-cua-hang': 'cua-hang',
  'screen-rewards': null,
  'screen-profile': 'profile',
}
