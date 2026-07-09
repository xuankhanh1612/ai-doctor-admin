// src/data/organs.js
// ============================================================================
// Danh sách nội tạng dùng CHUNG cho ChooseUserRolePanel ("Chọn Vai Trò Anh
// Hùng") và DonationHeroPanel ("Anh Hùng Hiến Tặng") — để tên + emoji hiển
// thị của 1 cơ quan luôn khớp nhau giữa 2 màn hình, dù người dùng chọn ở
// đâu. `id` phải khớp với giá trị lưu vào IndexedDB (useHeroSelection.js).
// Mặc định ban đầu khi chưa ai chọn gì là 'gan' (Gan/Liver).
// ============================================================================

export const DEFAULT_ORGAN_ID = 'gan';

const ORGANS = [
  { id: 'gan', vi: 'Gan', en: 'Liver', emoji: '🫘', anatomyAnnotationId: 'liver' },
  { id: 'mauhiem', vi: 'Máu Hiếm/Hiến máu nhân đạo', en: 'Rare Blood / Blood Donation', emoji: '🩸', anatomyAnnotationId: 'blood-vessels' },
  { id: 'tim', vi: 'Tim', en: 'Heart', emoji: '❤️', anatomyAnnotationId: 'heart' },
  { id: 'phoi', vi: 'Phổi', en: 'Lungs', emoji: '🫁', anatomyAnnotationId: 'lungs' },
  { id: 'than', vi: 'Thận', en: 'Kidney', emoji: '🟤', anatomyAnnotationId: 'kidneys' },
  { id: 'giacmac', vi: 'Giác mạc', en: 'Cornea', emoji: '👁️', anatomyAnnotationId: 'cornea' },
  { id: 'xuong', vi: 'Xương', en: 'Bone', emoji: '🦴', anatomyAnnotationId: 'bone' },
  { id: 'da', vi: 'Da', en: 'Skin', emoji: '🧴', anatomyAnnotationId: 'skin' },
  { id: 'tuy', vi: 'Tụy', en: 'Pancreas', emoji: '🟠', anatomyAnnotationId: 'pancreas' },
  { id: 'ruot', vi: 'Ruột', en: 'Intestine', emoji: '🌀', anatomyAnnotationId: 'small-intestine' },
];

export default ORGANS;

// Trả về organ object theo id; nếu không tìm thấy (id lạ/rỗng) trả về organ
// mặc định (gan) để trang sau luôn có tên + hình hợp lệ để hiển thị.
export function getOrganById(id) {
  return ORGANS.find((o) => o.id === id) || ORGANS.find((o) => o.id === DEFAULT_ORGAN_ID);
}

// Danh sách rút gọn { id, label, emoji } theo đúng ngôn ngữ đang chọn — dùng
// để render lưới "Chọn nhanh cơ quan" trong ChooseUserRolePanel.
export function buildOrganLabels(isEn) {
  return ORGANS.map((o) => ({
    id: o.id,
    label: isEn ? o.en : o.vi,
    emoji: o.emoji,
    anatomyAnnotationId: o.anatomyAnnotationId,
  }));
}

export function getOrganAnatomyAnnotationId(id) {
  return getOrganById(id)?.anatomyAnnotationId || null;
}

// Viết hoa chữ cái đầu -> thường, để ghép organ label vào giữa câu (vd.
// "hỗ trợ bạn về hiến tặng gan" thay vì "...hiến tặng Gan").
export function lowerFirst(str = '') {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}
