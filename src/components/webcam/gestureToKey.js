// gestureToKey.js — phân loại cử chỉ bàn tay (21 landmark của MediaPipe Hand
// Landmarker) thành 1 trong 5 phím điều khiển của "User 1" (Player 1) trong
// mini-game "Hành Trình Bảo Vệ Cơ Thể" (bao-ve-co-the-PvP-PvE-Co-op.html):
//
//   👆 Ngón trỏ chỉ thẳng lên            -> 'w'  (Nhảy)
//   👈 Ngón trỏ chỉ thẳng sang trái       -> 'a'  (Trái)
//   🖐 Xoè từ 3 ngón trở lên (kể cả 4/5)  -> 's'  (Khiên)
//   👉 Ngón trỏ chỉ thẳng sang phải       -> 'd'  (Phải)
//   ✊ Nắm chặt bàn tay (0 ngón duỗi)     -> 'e'  (Bắn Lợi Khuẩn)
//
// Không dùng bất kỳ trục x/y tuyệt đối nào để suy luận "ngón duỗi" (chỉ so
// khoảng cách từ cổ tay tới đầu ngón so với khoảng cách cổ tay tới đốt giữa)
// -> chịu được việc bàn tay xoay/nghiêng trước camera thay vì bắt buộc phải
// giơ tay thẳng đứng.

const FINGER_JOINTS = {
  index: { pip: 6, tip: 8, mcp: 5 },
  middle: { pip: 10, tip: 12, mcp: 9 },
  ring: { pip: 14, tip: 16, mcp: 13 },
  pinky: { pip: 18, tip: 20, mcp: 17 },
}

// Ngưỡng: đầu ngón phải xa cổ tay hơn đốt PIP ít nhất 15% mới tính là "duỗi
// thẳng" — tránh nhận nhầm khi ngón hơi cong tự nhiên.
const EXTEND_RATIO = 1.15

function dist(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function isFingerExtended(hand, wrist, joints) {
  const pip = hand[joints.pip]
  const tip = hand[joints.tip]
  if (!pip || !tip) return false
  return dist(wrist, tip) > dist(wrist, pip) * EXTEND_RATIO
}

/**
 * classifyGestureKey(hand, opts) -> 'w' | 'a' | 's' | 'd' | 'e' | null
 * @param {Array<{x:number,y:number,z:number}>} hand - 21 landmark của 1 bàn tay (toạ độ chuẩn hoá 0..1, gốc video THẬT — chưa mirror bằng CSS).
 * @param {{ mirrored?: boolean }} opts - mirrored: true nếu preview đang hiển thị lật gương (camera trước/selfie) — cần đảo trục X khi suy luận trái/phải cho đúng với những gì người dùng NHÌN THẤY trên màn hình.
 */
export function classifyGestureKey(hand, { mirrored = true } = {}) {
  if (!hand || hand.length < 21) return null
  const wrist = hand[0]
  if (!wrist) return null

  const extended = {
    index: isFingerExtended(hand, wrist, FINGER_JOINTS.index),
    middle: isFingerExtended(hand, wrist, FINGER_JOINTS.middle),
    ring: isFingerExtended(hand, wrist, FINGER_JOINTS.ring),
    pinky: isFingerExtended(hand, wrist, FINGER_JOINTS.pinky),
  }
  const extendedCount = Object.values(extended).filter(Boolean).length

  // ✊ Nắm chặt nắm đấm (0 ngón duỗi) -> E (Bắn Lợi Khuẩn)
  if (extendedCount === 0) return 'e'

  // 🖐 Xoè từ 3 ngón trở lên (kể cả xoè cả 4-5 ngón) -> S (Khiên)
  if (extendedCount >= 3) return 's'

  // 👆👈👉 Chỉ 1 ngón trỏ duỗi thẳng, các ngón còn lại co lại -> xác định hướng chỉ
  if (extendedCount === 1 && extended.index) {
    const mcp = hand[FINGER_JOINTS.index.mcp]
    const tip = hand[FINGER_JOINTS.index.tip]
    if (!mcp || !tip) return null

    let dx = tip.x - mcp.x
    const dy = tip.y - mcp.y
    // Đảo trục X nếu camera đang hiển thị lật gương, để "trái/phải" khớp với
    // hướng người dùng nhìn thấy trên preview (giống soi gương) thay vì
    // hướng thật của cảm biến camera.
    if (mirrored) dx = -dx

    const isMoreVertical = Math.abs(dy) > Math.abs(dx) * 1.3
    if (isMoreVertical && dy < 0) return 'w' // chỉ lên trên khung hình -> Nhảy

    const isMoreHorizontal = Math.abs(dx) > Math.abs(dy) * 0.8
    if (isMoreHorizontal) return dx < 0 ? 'a' : 'd' // chỉ trái / chỉ phải
  }

  return null
}

// Nhãn hiển thị cho UI (chú thích + badge cử chỉ đang nhận diện).
export const GESTURE_KEY_LABELS = {
  w: { icon: '👆', text: 'Ngón trỏ chỉ lên', action: 'Nhảy' },
  a: { icon: '👈', text: 'Ngón trỏ chỉ trái', action: 'Trái' },
  s: { icon: '🖐️', text: 'Xoè ≥3 ngón / cả bàn tay', action: 'Khiên' },
  d: { icon: '👉', text: 'Ngón trỏ chỉ phải', action: 'Phải' },
  e: { icon: '✊', text: 'Nắm chặt nắm đấm', action: 'Bắn Lợi Khuẩn' },
}

export const GESTURE_KEY_ORDER = ['w', 'a', 's', 'd', 'e']
