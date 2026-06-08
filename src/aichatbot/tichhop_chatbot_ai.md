# **Giải Pháp Tích Hợp Chatbot Cơ Sở Chạy Trực Tiếp Trên Trình Duyệt Bằng Transformers.js Cho Hệ Thống AI Doctor Admin**

## **Kiến trúc tổng quan và bối cảnh tích hợp hệ thống**

Sự phát triển của trí tuệ nhân tạo biên (Edge AI) đã mở ra khả năng triển khai các mô hình học máy trực tiếp trên môi trường trình duyệt của người dùng cuối.1 Đối với nền tảng quản trị y tế trực tuyến https://ai-doctor-admin.vercel.app/, việc thiết lập một chatbot hoạt động hoàn toàn ở phía client-side bằng công nghệ Transformers.js mang lại những giá trị chiến lược vượt trội về mặt bảo mật, chi phí vận hành và tính sẵn sàng của hệ thống.1  
Bản đồ kiến trúc và luồng xử lý chẩn đoán của hệ thống AI Doctor được phân chia thành nhiều tầng nghiệp vụ phức tạp. Lớp xác thực người dùng được liên kết chặt chẽ thông qua các giải pháp như Google OAuth, Apple Sign In và Supabase Auth. Lớp dữ liệu lâm sàng cho phép tải lên các tệp bệnh án điện tử, hình ảnh X-quang, CT, MRI lên hệ thống lưu trữ Supabase Storage được bảo vệ nghiêm ngặt bằng chính sách bảo mật cấp hàng (Row Level Security \- RLS). Ở các tác vụ phân tích chuyên sâu thuộc tầng chẩn đoán định hướng AI, hệ thống sử dụng các mô hình ngôn ngữ lớn điện toán đám mây như Claude API để thực thi cơ chế đồng thuận của bốn tác nhân AI chuyên khoa bao gồm Chẩn đoán hình ảnh (Radiology), Ung bướu (Oncology), Đa khoa (GP) và Vật lý trị liệu (PT), kết hợp phân tích mô hình di truyền gia đình (Family pattern AI).  
Trong bối cảnh hệ thống hiện tại đang phụ thuộc lớn vào hạ tầng API đám mây cho các tác vụ phân tích chuyên sâu, sự xuất hiện của một chatbot cục bộ chạy bằng Transformers.js đóng vai trò như một lớp đệm hỗ trợ đa năng. Chatbot này giải quyết các nhiệm vụ hướng dẫn bệnh nhân thực hiện quy trình chẩn đoán lâm sàng, gợi ý các loại xét nghiệm cần tải lên tiếp theo, giải thích các thuật ngữ y khoa cơ bản và hướng dẫn người dùng tương tác với biểu đồ cây phả hệ (Family tree view). Việc phân tách tác vụ này giúp tối ưu hóa đáng kể tài nguyên máy chủ:

                  \[ Giao diện Người dùng chính \]  
                               |  
            \+------------------+------------------+  
            |                                     |  
    (Tác vụ Ngoại tuyến / Triage)        (Tác vụ Chẩn đoán Chuyên sâu)  
            |                                     |  
                  \[ Claude API & Consensus \]  
    \- Chạy trực tiếp qua WASM/WebGPU      \- Xử lý Đa tác nhân (Radiology, GP...)  
    \- Phản hồi tức thời (\<200ms)          \- Phân tích di truyền Phả hệ  
    \- Bảo mật dữ liệu cá nhân tuyệt đối  \- Truy vấn Cơ sở dữ liệu Supabase

Cơ chế thực thi này đảm bảo rằng các cuộc hội thoại mang tính tư vấn tổng quát không cần phải gửi về máy chủ trung tâm, giúp bảo vệ quyền riêng tư y tế tuyệt đối cho bệnh nhân do dữ liệu hội thoại không rời khỏi thiết bị cá nhân.1 Đồng thời, giải pháp này triệt tiêu hoàn toàn chi phí duy trì tài nguyên GPU đám mây cho các cuộc trò chuyện thông thường, tạo điều kiện cho hệ thống duy trì hoạt động mượt mà ngay cả khi thiết bị mất kết nối Internet.1

## **Phân tích và lựa chọn mô hình ngôn ngữ nhỏ tối ưu**

Môi trường trình duyệt web áp đặt các giới hạn rất khắt khe về mặt phân bổ bộ nhớ vật lý (RAM) và băng thông mạng.1 Việc tải xuống một mô hình quá lớn sẽ kéo dài thời gian chờ đợi ban đầu của người dùng (Cold-start Latency) và tăng nguy cơ sập tab trình duyệt do cạn kiệt bộ nhớ.4 Do đó, hệ thống bắt buộc phải áp dụng các mô hình ngôn ngữ nhỏ (Small Language Models \- SLM) đã được định dạng hóa sang cấu trúc ONNX và trải qua quá trình lượng tử hóa (Quantization) để giảm thiểu dung lượng vật lý.1  
Dưới đây là bảng đối sánh kỹ thuật giữa các mô hình ngôn ngữ nhỏ tương thích với trình duyệt phù hợp cho chatbot y tế:

| Tên Mô hình | Dung lượng Tải (dtype: q4) | Kiến trúc Gốc | Khả năng Hiểu Tiếng Việt | Ưu điểm Chính | Nhược điểm |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Qwen2.5-0.5B-Instruct** | \~350 MB 7 | Transformer (490M) | Xuất sắc | Hiểu ngữ cảnh tiếng Việt rất tốt, phản hồi tự nhiên, hỗ trợ tốt định dạng hội thoại y tế cơ bản.7 | Giới hạn về khả năng suy luận đa tầng phức tạp. |
| **SmolLM2-360M-Instruct** | \~260 MB 8 | Transformer (360M) | Trung bình | Dung lượng cực kỳ nhẹ, tốc độ khởi động và sinh văn bản rất nhanh trên thiết bị di động.8 | Thường xuyên gặp lỗi dịch nghĩa hoặc diễn đạt thiếu tự nhiên đối với tiếng Việt. |
| **Gemma-4-E2B-it-ONNX** | \~1.1 GB 9 | Transformer (2B) | Khá | Khả năng suy luận logic mạnh mẽ, hỗ trợ ra quyết định phức tạp.9 | Dung lượng tải quá lớn gây thời gian chờ ban đầu lâu, dễ bị trình duyệt di động cưỡng chế đóng tab do quá tải RAM.4 |

Sự lựa chọn tối ưu nhất cho trang web ai-doctor-admin là **onnx-community/Qwen2.5-0.5B-Instruct** phiên bản lượng tử hóa 4-bit (q4).7 Lượng tử hóa 4-bit chuyển đổi các trọng số của mô hình từ định dạng số thực dấu phẩy động 32-bit (fp32) sang các biểu diễn số nguyên 4-bit gọn nhẹ.1 Quá trình này giúp nén dung lượng lưu trữ của mô hình từ hơn 1.8 GB xuống chỉ còn khoảng 350 MB mà vẫn bảo toàn được phần lớn năng lực hiểu và phản hồi ngôn ngữ tự nhiên bằng tiếng Việt.1

## **Phân tích hiệu năng: WebGPU đối sánh với WebAssembly**

Hiệu năng tính toán của chatbot chạy trên trình duyệt phụ thuộc trực tiếp vào backend thực thi được cấu hình cho ONNX Runtime Web.1 Transformers.js hỗ trợ hai hạ tầng tính toán chính bao gồm WebAssembly (WASM) và WebGPU.1  
Hạ tầng WebAssembly (WASM) chuyển dịch mã nguồn C++ của công cụ tính toán ONNX Runtime sang định dạng nhị phân có thể chạy trực tiếp trên CPU của trình duyệt.10 Cơ chế này sử dụng các luồng ngầm (WASM Threads) thông qua SharedArrayBuffer kết hợp với các tập lệnh chỉ thị đơn, đa dữ liệu (SIMD128) để song song hóa các phép tính số học.10 Tuy nhiên, do giới hạn vật lý của kiến trúc CPU, tốc độ sinh chuỗi ký tự thường bị giới hạn từ 5 đến 15 tokens mỗi giây tùy thuộc vào xung nhịp vi xử lý của người dùng cuối.  
Ngược lại, hạ tầng WebGPU thiết lập giao tiếp trực tiếp giữa trình duyệt và bộ xử lý đồ họa (GPU) của thiết bị đầu cuối mà không cần thông qua lớp trung gian đồ họa truyền thống như WebGL.2 Sự khác biệt về hiệu năng xử lý toán học giữa hai backend này có thể được biểu diễn thông qua công thức tính thời gian xử lý một khối lượng tính toán ma trận tương tự:  
![][image1]  
Trong đó, ![][image2] đại diện cho tổng số phép tính dấu phẩy động cần thiết để xử lý một lượt suy luận của mạng thần kinh, ![][image3] là số lượng đơn vị xử lý song song (ALU), ![][image4] là tần số hoạt động của chip xử lý, và ![][image5] là độ trễ truyền dữ liệu giữa bộ nhớ hệ thống và bộ nhớ đồ họa. Đối với GPU, số lượng đơn vị xử lý song song ![][image6] lớn hơn CPU từ hàng trăm đến hàng nghìn lần, giúp giảm thiểu đáng kể thời gian tính toán thực tế bất chấp sự tồn tại của độ trễ truyền dữ liệu bộ nhớ ![][image5].  
Bảng so sánh chi tiết giữa hai môi trường thực thi:

| Đặc tính Kỹ thuật | WebAssembly (WASM) | WebGPU |
| :---- | :---- | :---- |
| **Phần cứng hoạt động** | CPU (Bộ vi xử lý trung tâm) 1 | GPU (Bộ xử lý đồ họa tích hợp hoặc rời) 2 |
| **Tốc độ sinh văn bản thực tế** | Khoảng 5 \- 15 tokens/giây | Khoảng 30 \- 90 tokens/giây (Nhanh gấp 10-100 lần) 2 |
| **Độ tương thích trình duyệt** | Gần như tuyệt đối trên mọi thiết bị và nền tảng 1 | Đạt khoảng 70% thị phần thiết bị hiện nay 12 |
| **Mức độ tiêu thụ năng lượng** | Gây tải cao liên tục cho CPU, dễ sinh nhiệt lớn | Tối ưu hóa năng lượng tốt hơn nhờ kiến trúc xử lý ma trận chuyên dụng |
| **Định dạng dữ liệu khuyến nghị** | q8 hoặc q4 (Số nguyên lượng tử hóa) 1 | q4f16 hoặc fp16 (Số thực nửa chính xác) 1 |

Mặc dù WebGPU mang lại tốc độ phản hồi vượt trội, nhà phát triển không nên loại bỏ hoàn toàn hệ thống WASM.1 Giải pháp tối ưu là thiết kế một cơ chế dự phòng tự động (Graceful Fallback): Chatbot sẽ cố gắng khởi tạo môi trường thực thi bằng WebGPU để đạt hiệu năng tối đa, và nếu trình duyệt hoặc phần cứng của người dùng không hỗ trợ, hệ thống sẽ tự động hạ cấp xuống WebAssembly để đảm bảo dịch vụ tư vấn y tế không bị gián đoạn.1

## **Khắc phục các lỗi lập trình và tái cấu trúc mã nguồn**

Trong thiết kế kỹ thuật ban đầu của chatbot, có một số lỗi lập trình nghiêm trọng về mặt cú pháp và cơ chế điều phối luồng xử lý cần phải được khắc phục để đảm bảo ứng dụng có thể biên dịch và vận hành ổn định trong môi trường thực tế.

### **Lỗi khai báo trạng thái React (React State Initialization)**

Trong tầng giao diện của thành phần GeneralChatbot, các dòng khai báo React State gặp lỗi nghiêm trọng do thiếu tên biến gán và thiếu giá trị khởi tạo mặc định:

JavaScript  
const \[messages, setMessages\] \= useState();  
const \= useState(0);  
const \= useState(false);

Việc không khởi tạo giá trị mặc định cho messages sẽ dẫn đến lỗi runtime ngay lập tức khi component cố gắng thực thi bộ lọc messages.filter(...) trên một đối tượng undefined. Đồng thời, cú pháp khai báo thiếu tên biến sẽ khiến trình biên dịch JavaScript ngưng hoạt động.  
*Giải pháp khắc phục*: Khai báo đầy đủ danh định cho các biến trạng thái và gán mảng rỗng làm giá trị mặc định cho lịch sử tin nhắn:

JavaScript  
const \[messages, setMessages\] \= useState();  
const \= useState(0);  
const \= useState(false);

### **Lỗi tham số sự kiện của TextStreamer (TextStreamer API Mismatch)**

Trong mã nguồn của tệp chat.worker.js, việc sử dụng sự kiện on\_token\_callback để truyền mã ký tự đơn lẻ về luồng giao diện chính là hoàn toàn sai lệch so với đặc tả kỹ thuật của Transformers.js v3 14:

JavaScript  
const streamer \= new TextStreamer(generator.tokenizer, {  
    on\_token\_callback: (token) \=\> {... }  
});

Trong phiên bản hiện hành của Transformers.js, lớp TextStreamer không sở hữu tham số cấu hình mang tên on\_token\_callback.14 Khi cấu hình sai tham số này, luồng sinh ký tự sẽ chạy âm thầm mà không gửi bất kỳ phản hồi nào về giao diện người dùng, tạo cảm giác hệ thống bị treo.14  
*Giải pháp khắc phục*: Sử dụng thuộc tính callback\_function để hứng các đoạn văn bản đã được giải mã thô một cách chính xác.14 Thuộc tính này tự động kích hoạt mỗi khi bộ giải mã hoàn tất việc chuyển đổi một nhóm token thành các ký tự văn bản có nghĩa.14

### **Sự bất tương thích về cấu hình Bundler giữa Next.js và Vite**

Mã nguồn thiết lập ban đầu cung cấp cấu hình next.config.js để can thiệp vào quá trình đóng gói Webpack:

JavaScript  
const nextConfig \= {  
  webpack: (config) \=\> {  
    config.resolve.alias \= {...config.resolve.alias, sharp$: false, "onnxruntime-node$": false };  
    return config;  
  }  
};

Tuy nhiên, bản đồ công nghệ thực tế của dự án ai-doctor-admin (thể hiện rõ trong sơ đồ Tech Stack của ảnh hệ thống) khẳng định rằng dự án được xây dựng trên nền tảng **React \+ Vite**, không sử dụng Next.js. Do đó, việc cấu hình webpack hay nỗ lực can thiệp vào bí danh liên kết của Next.js là hoàn toàn vô nghĩa và không thể giải quyết bài toán đóng gói của dự án.  
Đối với môi trường React \+ Vite, vấn đề cốt lõi phát sinh khi Vite cố gắng phân tích và tối ưu hóa các gói phụ thuộc (Dependency Pre-bundling).5 Tiến trình này sẽ làm hỏng các đường dẫn tương đối của tệp WebAssembly (.wasm) và các tệp phụ trợ của ONNX Runtime Web.5  
*Giải pháp khắc phục*: Can thiệp trực tiếp vào tệp vite.config.ts, đưa các gói thư viện chạy AI ra khỏi danh sách tối ưu hóa bằng chỉ thị optimizeDeps.exclude để bảo toàn tính toàn vẹn của đường dẫn tài nguyên tĩnh ở chế độ chạy runtime.5

## **Tác động của chính sách bảo mật trình duyệt đối với luồng xác thực và lưu trữ**

Việc sử dụng các luồng tính toán ngầm đa luồng (Multi-threading) của WebAssembly đòi hỏi trang web phải kích hoạt trạng thái cô lập nguồn chéo (Cross-Origin Isolated) bằng cách gửi về các tiêu đề phản hồi HTTP phù hợp từ máy chủ Vercel.11 Tiêu chuẩn thiết lập truyền thống yêu cầu cấu hình các tiêu đề sau trong tệp vercel.json 11:

JSON  
{  
  "key": "Cross-Origin-Embedder-Policy",  
  "value": "require-corp"  
}

Mặc dù cấu hình này kích hoạt thành công đối tượng bộ nhớ dùng chung SharedArrayBuffer cần thiết cho các tiến trình đa luồng, nó lại đặt ra một rào cản bảo mật cực kỳ lớn đối với các thành phần còn lại trong hệ thống AI Doctor.5  
Khi tiêu đề Cross-Origin-Embedder-Policy được thiết lập ở mức độ require-corp, trình duyệt sẽ từ chối tải bất kỳ tài nguyên ngoại vi nào (hình ảnh, mã kịch bản, phông chữ từ nguồn khác) trừ khi máy chủ lưu trữ tài nguyên đó trả về tiêu đề phản hồi Cross-Origin-Resource-Policy (CORP) được đặt ở trạng thái cross-origin hoặc cho phép thông qua CORS.5  
Điều này tác động tiêu cực trực tiếp đến các tính năng hiện hữu của ứng dụng y tế ai-doctor-admin đã được định hình trong sơ đồ kiến trúc:

* **Xác thực người dùng qua bên thứ ba (Google OAuth / Apple Sign In)**: Tiến trình xác thực mở ra các cửa sổ bật lên (Popups) và tải các tập lệnh xác thực từ máy chủ của Google và Apple.18 Chính sách require-corp nghiêm ngặt sẽ ngăn cản quá trình trao đổi dữ liệu nguồn chéo này, khiến người dùng không thể đăng nhập vào tài khoản bệnh nhân.18  
* **Hiển thị hồ sơ bệnh nhân**: Hình ảnh ảnh đại diện của người dùng được liên kết trực tiếp từ tài khoản Google hoặc Apple sẽ bị chặn hoàn toàn, gây lỗi vỡ giao diện ảnh thẻ đại diện.  
* **Quản lý lưu trữ tệp tin (Supabase Storage)**: Bệnh nhân thực hiện tải các tệp hồ sơ y tế, hình ảnh X-quang, phim chụp CT/MRI lên các phân vùng lưu trữ chuyên biệt (per-user bucket) được bảo vệ bằng chính sách RLS. Khi tải ngược lại các hình ảnh này về trình duyệt để hiển thị trong giao diện dòng thời gian lịch sử (Timeline view), trình duyệt sẽ chặn đứng dòng hiển thị của tệp ảnh do máy chủ lưu trữ của Supabase mặc định không đính kèm các tiêu đề CORP tương thích.15

Để giải quyết triệt để rào cản bảo mật này mà vẫn bảo toàn năng lực tính toán đa luồng cho chatbot AI, hệ thống cần thay thế giá trị require-corp bằng giá trị **credentialless**.15  
Tiêu chuẩn credentialless cho phép trình duyệt tải tự do các tài nguyên từ nguồn chéo mà không yêu cầu máy chủ đích phải cung cấp tiêu đề CORP.17 Đổi lại, các yêu cầu này sẽ được gửi đi trong trạng thái loại bỏ hoàn toàn các thông tin xác thực nhạy cảm như cookie lưu trữ, mã nhận diện cá nhân hoặc chứng thư ủy quyền.17 Điều này vừa bảo toàn khả năng vận hành của SharedArrayBuffer cho mô hình AI, vừa giải phóng các liên kết hình ảnh từ Supabase Storage và dòng đăng nhập của Google OAuth khỏi tình trạng lỗi chặn bảo mật.15

## **Giải pháp xử lý triệt để lỗi hiển thị tiếng Việt khi truyền luồng dữ liệu**

Trong quá trình sinh văn bản tự hồi quy (Autoregressive Generation), mô hình ngôn ngữ lớn hoạt động bằng cách dự đoán phân phối xác suất của token tiếp theo dựa trên chuỗi ngữ cảnh đã có và thực hiện giải mã token đó thành chuỗi ký tự hiển thị.20 Ngôn ngữ Tiếng Việt sử dụng hệ thống bảng chữ cái Latinh mở rộng với nhiều dấu thanh và ký tự đặc biệt, được biểu diễn trong không gian mã hóa UTF-8 dưới dạng các chuỗi byte đa phần tử (Multi-byte Characters, thông thường chiếm từ 2 đến 4 bytes cho mỗi ký tự có dấu).  
Ranh giới phân tách của các token trong bộ từ vựng của mô hình (Token Boundaries) thường không trùng khớp với ranh giới biểu diễn byte của ký tự UTF-8.20 Điều này dẫn đến hiện tượng một token đơn lẻ được sinh ra chỉ chứa một phần byte (ví dụ: byte đầu tiên của chữ "á").20  
Nếu hệ thống thực hiện giải mã thô byte khuyết này và lập tức truyền tải chuỗi giải mã đó về luồng giao diện chính để hiển thị, trình duyệt sẽ không thể nhận diện được mảnh byte khuyết danh này và sẽ hiển thị các ký tự lỗi cục bộ có dạng chấm hỏi trong khối kim cương đen \`\` hoặc các ô vuông trống lỗi phông chữ.20 Chỉ đến khi token tiếp theo chứa byte còn lại được nạp và giải mã độc lập, ký tự tiếp theo mới xuất hiện nhưng lúc này lỗi hiển thị đã xảy ra và không thể tự động sửa chữa trên giao diện.

Mô hình sinh:     \---\>  Giải mã thô ngay  \---\> Hiển thị: "" (Lỗi hiển thị)  
                  \---\>  Giải mã thô ngay  \---\> Hiển thị: "" (Lỗi hiển thị)  
                  \---\>  Giải mã thô ngay  \---\> Hiển thị: "" (Lỗi hiển thị)  
                                                                    (Kết quả mong muốn: Chữ "ớ")

Để ngăn chặn hoàn toàn hiện tượng lỗi hiển thị này, hệ thống bắt buộc phải duy trì một bộ đệm byte giải mã (Decoding Byte Buffer) tại luồng Web Worker ngầm trước khi phát dữ liệu về luồng chính.14 Lớp TextStreamer của Transformers.js đã được tích hợp sẵn cơ chế xử lý thông minh này 14:

1. Mỗi khi mô hình sinh ra một ID token mới, ID này được nạp vào bộ đệm của bộ giải mã (Tokenizer Decoder).14  
2. Bộ giải mã sẽ kiểm tra xem chuỗi byte tích lũy có tạo thành các ký tự UTF-8 hoàn chỉnh hay chưa.14  
3. Nếu chuỗi byte chưa hoàn chỉnh (vẫn đang nằm giữa một ký tự tiếng Việt có dấu), bộ giải mã sẽ giữ lại các byte này trong hàng đợi nội bộ và không kích hoạt sự kiện trả về văn bản.14  
4. Khi token tiếp theo chứa các mảnh byte còn lại được nạp vào, bộ giải mã sẽ ghép nối chuỗi byte, thực hiện giải mã an toàn sang ký tự UTF-8 hoàn chỉnh và kích hoạt hàm callback trả dữ liệu văn bản hoàn thiện về cho luồng giao diện.14

Do đó, việc cấu hình chính xác thuộc tính callback\_function trong bộ khởi tạo TextStreamer và chuyển giao quyền giải mã hoàn toàn cho Transformers.js là phương án tối ưu nhất để hiển thị văn bản tư vấn y tế tiếng Việt mượt mà, chính xác.14

## **Triển khai thực tế mã nguồn hệ thống sau khi tối ưu hóa**

Dưới đây là toàn bộ mã nguồn của các thành phần cấu hình và lập trình đã được hiệu chỉnh và tối ưu hóa để sẵn sàng vận hành trên nền tảng React \+ Vite và máy chủ Vercel.

### **Tệp cấu hình phân phối máy chủ: vercel.json**

Tệp cấu hình này được đặt tại thư mục gốc của dự án để thiết lập các tiêu đề bảo mật hỗ trợ đa luồng mà không gây ảnh hưởng đến luồng đăng nhập và hiển thị ảnh từ Supabase Storage.15

JSON  
{  
  "$schema": "https://openapi.vercel.sh/vercel.json",  
  "headers": \[  
    {  
      "source": "/(.\*)",  
      "headers": \[  
        {  
          "key": "Cross-Origin-Opener-Policy",  
          "value": "same-origin"  
        },  
        {  
          "key": "Cross-Origin-Embedder-Policy",  
          "value": "credentialless"  
        }  
      \]  
    }  
  \]  
}

### **Tệp cấu hình đóng gói phát triển: vite.config.ts**

Cấu hình này loại bỏ rủi ro phá vỡ đường dẫn của các tệp nhị phân ONNX và WASM khi Vite thực hiện biên dịch sản phẩm cuối.5

TypeScript  
import { defineConfig } from 'vite';  
import react from '@vitejs/plugin-react';

export default defineConfig({  
  plugins: \[react()\],  
  optimizeDeps: {  
    exclude: \['@huggingface/transformers'\]  
  },  
  worker: {  
    format: 'es'  
  }  
});

### **Tệp mã nguồn luồng ngầm Web Worker: src/chat.worker.js**

Đoạn mã này sử dụng mô thức Singleton để đảm bảo mô hình chỉ nạp một lần vào bộ đệm của trình duyệt 9, tích hợp tiến trình theo dõi tiến độ tải về và sử dụng giải pháp truyền chuỗi ký tự UTF-8 an toàn thông qua TextStreamer.14

JavaScript  
import { pipeline, TextStreamer, env } from "@huggingface/transformers";

// Cấu hình bắt buộc để mô hình tải trực tiếp từ máy chủ đám mây và lưu trữ cục bộ  
env.allowLocalModels \= false;  
env.useBrowserCache \= true;

class ChatbotPipelineSingleton {  
    static task \= "text-generation";  
    static model \= "onnx-community/Qwen2.5-0.5B-Instruct";  
    static instance \= null;

    static async getInstance(progress\_callback \= null) {  
        if (this.instance \=== null) {  
            this.instance \= await pipeline(this.task, this.model, {  
                device: "wasm", // Sử dụng WASM làm nền tảng mặc định cho mọi trình duyệt  
                dtype: "q4",    // Lượng tử hóa 4-bit giúp giảm dung lượng còn \~350MB  
                progress\_callback,  
            });  
        }  
        return this.instance;  
    }  
}

self.addEventListener("message", async (event) \=\> {  
    const { messages } \= event.data;  
    if (\!messages) return;

    try {  
        const generator \= await ChatbotPipelineSingleton.getInstance((progress) \=\> {  
            if (progress.status \=== "progress") {  
                self.postMessage({  
                    type: "DOWNLOAD\_PROGRESS",  
                    percentage: progress.percentage,  
                    file: progress.file  
                });  
            }  
        });

        self.postMessage({ type: "START\_GENERATION" });

        let responseText \= "";  
          
        // Khởi tạo TextStreamer với bộ giải mã an toàn UTF-8 tiếng Việt  
        const streamer \= new TextStreamer(generator.tokenizer, {  
            skip\_prompt: true,  
            skip\_special\_tokens: true,  
            callback\_function: (decodedText) \=\> {  
                responseText \+= decodedText;  
                self.postMessage({  
                    type: "STREAM\_TOKEN",  
                    token: decodedText,  
                    fullText: responseText  
                });  
            }  
        });

        // Kích hoạt tiến trình suy luận sinh câu trả lời tự hồi quy  
        await generator(messages, {  
            max\_new\_tokens: 512,  
            temperature: 0.6,  
            top\_p: 0.9,  
            streamer: streamer  
        });

        self.postMessage({  
            type: "GENERATION\_COMPLETE",  
            result: responseText  
        });

    } catch (error) {  
        self.postMessage({  
            type: "ERROR",  
            error: error.message  
        });  
    }  
});

### **Tệp thành phần giao diện React: src/components/GeneralChatbot.jsx**

Giao diện người dùng hoàn thiện được tối ưu hóa khả năng phản hồi trực quan, khắc phục triệt để các lỗi trạng thái rỗng và rò rỉ bộ nhớ của luồng Worker khi đóng mở thành phần giao diện.24

JavaScript  
import React, { useState, useEffect, useRef } from 'react';

export default function GeneralChatbot() {  
    const \[messages, setMessages\] \= useState();  
    const \[input, setInput\] \= useState("");  
    const \[loading, setLoading\] \= useState(false);  
    const \= useState(0);  
    const \= useState(false);  
    const worker \= useRef(null);  
    const scrollContainerRef \= useRef(null);

    // Tự động cuộn xuống đáy hộp thoại khi có dữ liệu tin nhắn mới hoặc đang stream  
    useEffect(() \=\> {  
        if (scrollContainerRef.current) {  
            scrollContainerRef.current.scrollTop \= scrollContainerRef.current.scrollHeight;  
        }  
    }, \[messages\]);

    useEffect(() \=\> {  
        // Khởi tạo luồng Worker ngầm bằng đường dẫn tài nguyên an toàn của Vite  
        worker.current \= new Worker(  
            new URL('../chat.worker.js', import.meta.url),  
            { type: 'module' }  
        );

        const handleMessageFromWorker \= (event) \=\> {  
            const { type, percentage, fullText, error } \= event.data;

            if (type \=== "DOWNLOAD\_PROGRESS") {  
                setIsDownloading(true);  
                setDownloadProgress(percentage);  
            } else if (type \=== "START\_GENERATION") {  
                setIsDownloading(false);  
                setLoading(true);  
                // Tạo một bong bóng tin nhắn trống cho chatbot để chuẩn bị nhận luồng text  
                setMessages(prev \=\> \[...prev, { role: "assistant", content: "" }\]);  
            } else if (type \=== "STREAM\_TOKEN") {  
                setMessages(prev \=\> {  
                    const updated \= \[...prev\];  
                    const lastIdx \= updated.length \- 1;  
                    if (lastIdx \>= 0 && updated\[lastIdx\].role \=== "assistant") {  
                        updated\[lastIdx\].content \= fullText;  
                    }  
                    return updated;  
                });  
            } else if (type \=== "GENERATION\_COMPLETE") {  
                setLoading(false);  
            } else if (type \=== "ERROR") {  
                console.error("Lỗi suy luận AI cục bộ:", error);  
                setLoading(false);  
                setIsDownloading(false);  
            }  
        };

        worker.current.addEventListener('message', handleMessageFromWorker);

        // Hủy luồng Worker khi đóng chatbot để trả lại RAM cho hệ thống  
        return () \=\> {  
            if (worker.current) {  
                worker.current.removeEventListener('message', handleMessageFromWorker);  
                worker.current.terminate();  
            }  
        };  
    },);

    const handleSendMessage \= () \=\> {  
        if (\!input.trim() || loading || isDownloading) return;

        const newUserMessage \= { role: "user", content: input };  
        const updatedHistory \= \[...messages, newUserMessage\];  
          
        setMessages(updatedHistory);  
        setInput("");  
          
        worker.current.postMessage({  
            messages: updatedHistory  
        });  
    };

    return (  
        \<div className\="fixed bottom-5 right-5 w-96 h-\[550px\] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 font-sans"\>  
            \<div className\="bg-blue-600 text-white p-4 flex items-center justify-between"\>  
                \<div className\="flex items-center gap-2"\>  
                    \<span className\="text-xl"\>🤖\</span\>  
                    \<div\>  
                        \<h3 className\="font-semibold text-sm"\>Trợ lý y khoa AI Doctor\</h3\>  
                        \<p className\="text-xs text-blue-100"\>Xử lý cục bộ & Bảo mật thông tin\</p\>  
                    \</div\>  
                \</div\>  
            \</div\>

            {isDownloading && (  
                \<div className\="bg-slate-100 p-3 text-xs text-slate-600 border-b border-slate-200"\>  
                    \<div className\="flex justify-between mb-1"\>  
                        \<span\>Đang cấu hình dữ liệu trí tuệ nhân tạo (chỉ nạp lần đầu)...\</span\>  
                        \<span className\="font-bold"\>{Math.round(downloadProgress)}%\</span\>  
                    \</div\>  
                    \<div className\="w-full bg-slate-200 h-2 rounded-full overflow-hidden"\>  
                        \<div className\="bg-blue-600 h-full transition-all duration-300" style\={{ width: \`${downloadProgress}%\` }}\>\</div\>  
                    \</div\>  
                \</div\>  
            )}

            \<div   
                ref\={scrollContainerRef}  
                className\="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50"  
            \>  
                {messages.length \=== 0 && (  
                    \<div className\="text-center text-slate-400 text-xs py-10"\>  
                        Hệ thống đã sẵn sàng. Hãy đặt câu hỏi để nhận tư vấn sức khỏe bảo mật.  
                    \</div\>  
                )}  
                {messages.filter(msg \=\> msg.role\!== 'system').map((msg, index) \=\> (  
                    \<div key\={index} className\={\`flex ${msg.role \=== 'user'? 'justify-end' : 'justify-start'}\`}\>  
                        \<div className\={\`max-w-\[85%\] rounded-2xl px-4 py-2.5 text-sm ${  
                            msg.role \=== 'user'   
                              ? 'bg-blue-600 text-white rounded-br-none'   
                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'  
                        }\`}\>  
                            {msg.content || (loading && index \=== messages.length \- 1? "Đang suy nghĩ..." : "")}  
                        \</div\>  
                    \</div\>  
                ))}  
            \</div\>

            \<div className\="p-3 bg-white border-t border-slate-200 flex gap-2"\>  
                \<input   
                    type\="text"   
                    value\={input}   
                    onChange\={(e) \=\> setInput(e.target.value)}   
                    onKeyDown={(e) \=\> e.key \=== 'Enter' && handleSendMessage()}   
                    placeholder="Hỏi về bệnh án hoặc triệu chứng..."   
                    className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"   
                    disabled={isDownloading}   
                /\>  
                \<button   
                    onClick\={handleSendMessage}   
                    className\="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2.5 flex items-center justify-center transition-all disabled:opacity-30"   
                    disabled\={isDownloading || loading ||\!input.trim()}  
                \>  
                    ➔  
                \</button\>  
            \</div\>  
        \</div\>  
    );  
}

## **Kết luận và khuyến nghị tối ưu hóa vận hành**

Giải pháp tích hợp chatbot chạy trực tiếp trên trình duyệt bằng công nghệ Transformers.js tạo ra một bước tiến quan trọng về mặt công nghệ cho hệ thống ai-doctor-admin.1 Để hệ thống vận hành với sự ổn định cao nhất, việc triển khai cần tuân thủ các nguyên tắc cốt lõi sau:

* **Duy trì cơ chế lưu trữ bền vững (IndexedDB Cache)**: Gán thuộc tính env.useBrowserCache \= true để đảm bảo trình duyệt người dùng không phải tải lại tập tin mô hình nặng ở các phiên truy cập tiếp theo.6 Việc này biến chi phí băng thông thành một khoản phân phối một lần duy nhất.2  
* **Áp dụng cơ chế cô lập nguồn chéo an toàn**: Tránh tuyệt đối việc sử dụng cấu hình tiêu đề require-corp truyền thống trên nền tảng Vercel để ngăn chặn hiện tượng phá vỡ tính năng đăng nhập Google/Apple OAuth và hiển thị ảnh bệnh án từ Supabase Storage.15 Giải pháp thay thế bằng Cross-Origin-Embedder-Policy: credentialless là bắt buộc.15  
* **Quản lý giải phóng tài nguyên hệ thống**: Bản chất việc suy luận mô hình AI trực tiếp trong môi trường trình duyệt tiêu tốn lượng RAM rất lớn.4 Lập trình viên bắt buộc phải xử lý sự kiện đóng/hủy của React component để gọi hàm worker.terminate(), giải phóng hoàn toàn vùng nhớ mà ONNX Runtime Web đang chiếm dụng, ngăn ngừa tuyệt đối nguy cơ trình duyệt tự động tắt tab ứng dụng của bệnh nhân do tràn RAM.9

#### **Works cited**

1. Run AI Models Directly in the Browser with Transformers.js \- OpenReplay Blog, accessed June 8, 2026, [https://blog.openreplay.com/run-ai-models-browser-transformers-js/](https://blog.openreplay.com/run-ai-models-browser-transformers-js/)  
2. Transformers.js: Make the User's Laptop Pay for Compute | by Aparna Pradhan \- Medium, accessed June 8, 2026, [https://medium.com/@ap3617180/transformers-js-make-the-users-laptop-pay-for-compute-80492a56ecfb](https://medium.com/@ap3617180/transformers-js-make-the-users-laptop-pay-for-compute-80492a56ecfb)  
3. Speech Recognition in the Browser with Transformers.js, accessed June 8, 2026, [https://blog.rasc.ch/2025/01/transformers-js-speech.html](https://blog.rasc.ch/2025/01/transformers-js-speech.html)  
4. Running LLMs in-browser via WebGPU, Transformers.js, and Chrome's Prompt API—no Ollama, no server : r/LocalLLaMA \- Reddit, accessed June 8, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1qyemhf/running\_llms\_inbrowser\_via\_webgpu\_transformersjs/](https://www.reddit.com/r/LocalLLaMA/comments/1qyemhf/running_llms_inbrowser_via_webgpu_transformersjs/)  
5. RunAnywhere Web SDK \- NPM, accessed June 8, 2026, [https://www.npmjs.com/package/@runanywhere/web](https://www.npmjs.com/package/@runanywhere/web)  
6. Practical NLP in the Browser with Transformers.js \- KDnuggets, accessed June 8, 2026, [https://www.kdnuggets.com/practical-nlp-in-the-browser-with-transformers-js](https://www.kdnuggets.com/practical-nlp-in-the-browser-with-transformers-js)  
7. Transformers.js v3: WebGPU Support, New Models & Tasks, and More… \- Hugging Face, accessed June 8, 2026, [https://huggingface.co/blog/transformersjs-v3](https://huggingface.co/blog/transformersjs-v3)  
8. Transformers.js LLM Hello World Streaming \- p5.js Web Editor, accessed June 8, 2026, [https://editor.p5js.org/a2zitp/sketches/lQ1Hfa0Nm](https://editor.p5js.org/a2zitp/sketches/lQ1Hfa0Nm)  
9. How to Use Transformers.js in a Chrome Extension \- Hugging Face, accessed June 8, 2026, [https://huggingface.co/blog/transformersjs-chrome-extension](https://huggingface.co/blog/transformersjs-chrome-extension)  
10. ONNX Runtime Web—running your machine learning model in browser, accessed June 8, 2026, [https://opensource.microsoft.com/blog/2021/09/02/onnx-runtime-web-running-your-machine-learning-model-in-browser/](https://opensource.microsoft.com/blog/2021/09/02/onnx-runtime-web-running-your-machine-learning-model-in-browser/)  
11. SharedArrayBuffer \- Video SDK \- Zoom Developer Docs, accessed June 8, 2026, [https://developers.zoom.us/docs/video-sdk/web/sharedarraybuffer/](https://developers.zoom.us/docs/video-sdk/web/sharedarraybuffer/)  
12. Transformers.js: Run AI Models Directly in the Browser \- Developers Digest, accessed June 8, 2026, [https://www.developersdigest.tech/blog/transformers-js-guide](https://www.developersdigest.tech/blog/transformers-js-guide)  
13. How complete is the TransformersJS Gemma4 Multimodal support? · Issue \#1636 · huggingface/transformers.js \- GitHub, accessed June 8, 2026, [https://github.com/huggingface/transformers.js/issues/1636](https://github.com/huggingface/transformers.js/issues/1636)  
14. generation/streamers \- .TextStreamer \- Hugging Face, accessed June 8, 2026, [https://huggingface.co/docs/transformers.js/api/generation/streamers](https://huggingface.co/docs/transformers.js/api/generation/streamers)  
15. Installation \- RunAnywhere Documentation, accessed June 8, 2026, [https://docs.runanywhere.ai/web/installation](https://docs.runanywhere.ai/web/installation)  
16. How can I fix SharedArrayBuffer is not defined? | Vercel Knowledge Base, accessed June 8, 2026, [https://vercel.com/kb/guide/fix-shared-array-buffer-not-defined-nextjs-react](https://vercel.com/kb/guide/fix-shared-array-buffer-not-defined-nextjs-react)  
17. Cross-Origin-Embedder-Policy \- Expert Guide to HTTP headers, accessed June 8, 2026, [https://http.dev/cross-origin-embedder-policy](https://http.dev/cross-origin-embedder-policy)  
18. Making your website "cross-origin isolated" using COOP and COEP | Articles \- web.dev, accessed June 8, 2026, [https://web.dev/articles/coop-coep](https://web.dev/articles/coop-coep)  
19. Get Started | Scandit Developer Documentation, accessed June 8, 2026, [https://docs.scandit.com/next/sdks/web/matrixscan/get-started/](https://docs.scandit.com/next/sdks/web/matrixscan/get-started/)  
20. MAP-Neo: A Fully Open-Source and Transparent Bilingual LLM Suite that Achieves Superior Performance to Close the Gap with Closed-Source Models \- MarkTechPost, accessed June 8, 2026, [https://www.marktechpost.com/2024/05/31/map-neo-a-fully-open-source-and-transparent-bilingual-llm-suite-that-achieves-superior-performance-to-close-the-gap-with-closed-source-models/](https://www.marktechpost.com/2024/05/31/map-neo-a-fully-open-source-and-transparent-bilingual-llm-suite-that-achieves-superior-performance-to-close-the-gap-with-closed-source-models/)  
21. Become a LLM creator with OpenVINO | by Fabio Matricardi | Artificial INTEL-ligence Playground | Medium, accessed June 8, 2026, [https://medium.com/artificial-intel-ligence-playground/become-a-llm-creator-with-openvino-cd48d7c9bd71](https://medium.com/artificial-intel-ligence-playground/become-a-llm-creator-with-openvino-cd48d7c9bd71)  
22. TextIteratorStreamer compatibility with batch processing \- Hugging Face Forums, accessed June 8, 2026, [https://discuss.huggingface.co/t/textiteratorstreamer-compatibility-with-batch-processing/46763](https://discuss.huggingface.co/t/textiteratorstreamer-compatibility-with-batch-processing/46763)  
23. The Browser That Speaks 200 Languages: Building an AI Translator Without APIs, accessed June 8, 2026, [https://alexop.dev/posts/building-client-side-ai-translator-vue/](https://alexop.dev/posts/building-client-side-ai-translator-vue/)  
24. Building a React application \- transformers.js \- GitHub, accessed June 8, 2026, [https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/tutorials/react.md](https://github.com/huggingface/transformers.js/blob/main/packages/transformers/docs/source/tutorials/react.md)  
25. Unlock AI Power in Your Hybrid Mobile App: Local Embedding of HuggingFace Model with Transformers.js | by MPyK | The Web Tub | Medium, accessed June 8, 2026, [https://medium.com/the-web-tub/unlock-ai-power-in-your-hybrid-mobile-app-local-embedding-of-huggingface-model-with-transformers-js-9805a400c924](https://medium.com/the-web-tub/unlock-ai-power-in-your-hybrid-mobile-app-local-embedding-of-huggingface-model-with-transformers-js-9805a400c924)

[image1]: <data:image/png;base64,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>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF8AAAAaCAYAAADR2YAqAAADaElEQVR4Xu2YS8hNURTH/3mlvAYmSolCIQwoz+Q1MEDKgJmRiQEKKSll8ikJkUcMvhgoImaIASMUAwMh9X0hTLwiebP+rb2/u++6Z59978W5A/tXq3vP+q99zt7r7LNfQCaTyfzXLBI7KbbLCv+IiWLHxVYEvq3B/0q5KvarSbM8FPuI+pi3YqvDoAiPxF6IzXTXTAbL3+iLqGct9N7+OV/d9Tuxn853ty+6kYHQuBNiw8UWQMvsFPsQxHWEWILJWbFv1hnAcmxYM8yAxsdeELWL1hkQqyeTS/8bKziozbdOqH+HdVZJf2gl7ljBMQzxHjkdWnafFQqYDI3dYIWAmyhOrodarCPEXkw3iv2Efr64jsExj5VYZvyD3e8Isd2hEHAOWpafcoqyxHk4DDBuihWEUVCtywqOWPJjfhLzV8Z7NFaCn+J49589Y0ighZQ1LOQ6NG6h8VsOQuM2W0E4AtWGWkHYBNX2WwG1OjbzdVaOTeAkc10G41K9mdhnxHgCjVtlBcTvMRbq5wsuYi9qZb0dq4voEH68L7IUfgzfYwXDGGgcV0Ypyp7tNX6pnFg/uWuumqYGcUVsRGP7HtdFdIDt0IqsDHzToGN5itR4v9z9+uHidKAVwbkllnw/3p+yQhssRfw5lcI1rq3EeujQkyLVgCvu10+ifNFl3IfGLbYCdGNEbZwVEsSWtOwIZXWvhFQCy2C5H9bpuIbaxDgBGsudbAxO6IzpsYKjnXryay6auMk2tH6/v8ogaAVuW6EJuDNlWa5OLOy5tmGp5FErm7hT5YvgjveCdTrYafykOwd6b07Y3Ot8cf4BYt/Ftoi9dj7CeZL+82KH0F7+cAD60DVWaIJb0LIjAx8rdcn5ee8Qv51fZ/y+x98z/pB50JgzVkjgX5hdmjJp9khhLmov97D75TXbRLi34NGE94d7oJY6BRvBh/NshG+U5yOfxY6GQRF6oecq7Dm+cd54xMDey1VIEaOhcSzrd7Iv0ZgcDztFWE+ulli22R3pc7F+0PbxWf5sqDuI8cyGrppCGPvM2Suozo2oTba9zrQIk99rfEVJXYJGv73OtAiHtqfG1yM2K7jmASNhsv3Xx2V2Tv4fwMT7oc0OmVyhcdh6EPg43vNFXYYedefkd5Cc/A7hV0mcMzKZTCaT6eM3vdQXTiq596EAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAaCAYAAAC+aNwHAAAApElEQVR4XmNgGAXoYAIQfwTi/1D8HYjfoYmtgqvGA2CK0YE8A0R8F7oEOgApOo4uCAW4DIeDCAaIAnd0CSDgZCDCgGsMuBWsZ4DIBaBLIANcNjgyQMQnokugA5gBH4D4PRD/gPIvA7EwkjqsAOb/JHQJYsFNBuzOJxrg8j/RAKT5DrogsaCaAWJAOroEITAZiD8zQEIclO6/AvE/FBWjYBTQGgAA/GAxOhsgBN4AAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAbCAYAAABIpm7EAAAAnElEQVR4XmNgGP7gExBfBOJX6BLYwB0gPgbEf4H4P5ocVgBSFAHEFUDsjyaHAVQYIBqY0SVwgXYGIp1xmAGiEB0TBCBFIE8TDUAaatAFcQFOBogGaXQJXMCUgUh3w8B0BhI1fGMgUQNI8U50QXwApMEZXRAX0GYg0jkgRaCkPBuI36LJYQUgDaCUCaI50OSwAk0gXgvE7OgSowAIAMQSJOQzncYvAAAAAElFTkSuQmCC>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAAZCAYAAACGqvb0AAAB+0lEQVR4Xu2YPUtcURCGxwga8R8EjPgHAils/AOmslQRFMTCIoSkUBDFNCkUFCxEC5tELAS/unQJoqBELATFLwQhCZpK/Cj8QFDfYc5kZ8e7ehtF794HHpzznrOXM3vv2VWJUlJSHBewxIf5QCe8hnt+Ih/gxtUiN5doPsEvsJuk+d3s6WTDDduaLTRZYmmBfWbcS9L8uskSi73rit79RFMLh3wIBkmaX/ITSeKuu5vr7s9TdP6seAdHfWj4StLkDz9B8Zu/8sFTIU4Due5+VBZF3HWPShWc9mEEMyQN+LW2qWX4AS7AkZC9pMwbx46HnDmD7fASFsD6sGYSrsBZ+Ov/auE3HCY5crx3PXq6j++h3gnjO7Ebi6vFjk9NzXmxG1tO4NtQV1Nms02UvdbW2/B9qDtgT6ib4X6ode5eXtPtxuI4wC8O+KZa4WLI+fqKX8fjv0adb4BbusjkWr8wY4uu+5iVPjB+c9ow1+VujtEPVv9mKHVwzYz99XP9tslv+GeSY/Fo6OZqTK15BcmZ1jFzHn5OwLZQM/xIM41w0+T2mj/hmBnbR72UZG2ZyR6UY3hAmbM+C//BDVhJ8oGmTJE8zq9M1kXyfwNtgh/5Q5JrrpK8nuujMM98C/kfkym5nqbEwsdAjwL/JZpX9JN8rc75iXzhjQ9SUqK5AYmNofOmU9AFAAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAaCAYAAADIUm6MAAABvElEQVR4Xu2WTSsGURTHD7KwUbJQFij5ADb2FrJRLBSxs2GliIV8B5F8CYqyURayUBZKea0nlmwkL8lLeT3/zr2c5zx3Zp7yYMr86l9z/ufM3DMz994ZooyM/8Us65b17vTIujLe4md1CvFNWhpJ/HWbSAtobtuajqib+nP6SRrrtAmmilLc+DFFN7ZCkuuxiTQQ9UTbSfw5m0gLvvEb1jXrycUHrFpV56lj1au4Wh3/Gn5+D9lEgAGS2j5WDWuTNc0adfkJ1parWWDNs3ZZZy4P8PbuVY1nw3lryoslR+FpYhmkcN0FfTUOWqiwDt+BFxWvUmENCHmRRM1vC2o6rEmyDpIaHzceGn9TsceeFwuKT61paKD4izar41Dje6xzFaNx/QY89rxIMD9RPGwThi4q/qK+8X3WoTseyauQLfbVeCBxDCyaO5IdBP8lWCyhV+cpJ7lopfKmWM8kOxDObXN+6IlblihcE7qZb4OBZqxJ4o+puJjGJylcc2KNUoC9GoNhD9fAS1qcIVBToeJeVpOKSwqmzBHrgbVM8sHC4H6N7JBMv0uXa3V+iDKSaYp9G7/Q3fnpjIyMjJ/mA7tCfGFC3R3IAAAAAElFTkSuQmCC>