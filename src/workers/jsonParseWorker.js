// ============================================================================
// jsonParseWorker.js
// Worker CHỈ làm đúng 1 việc: nhận text JSON thô, chạy JSON.parse, trả về
// kết quả (hoặc lỗi) qua postMessage. Mục đích: các file dataset ngoài
// (text_captions_cap3d.json, gobjaverse_index_to_objaverse.json, các
// *_map.json...) có thể tới hàng trăm nghìn dòng — JSON.parse những file
// này trên main thread có thể chặn UI vài trăm ms đến vài giây khi mở
// theme/popup lần đầu. Chạy trong Worker giải phóng main thread trong lúc
// parse, React vẫn phản hồi bình thường (loading spinner, thao tác khác...).
//
// Không đụng gì tới DOM/React ở đây — chỉ nhận text, trả object.
// requestId dùng để tương quan nhiều request chạy song song (vd mở theme
// mới trong khi popup đang tra caption của theme cũ).
// ============================================================================
self.onmessage = (event) => {
  const { requestId, text } = event.data || {};
  try {
    const data = JSON.parse(text);
    self.postMessage({ requestId, ok: true, data });
  } catch (error) {
    self.postMessage({ requestId, ok: false, error: error?.message || 'JSON.parse lỗi' });
  }
};
