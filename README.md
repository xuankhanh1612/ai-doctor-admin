# Consensus Doctor v2.0 — Full Source Code

## Tính năng mới / New Features

### 🔐 Authentication
- Đăng nhập / Đăng ký bằng Google (demo), Apple (demo), Email
- Admin account: khanhlegood1@gmail.com / password: admin123
- Tự động lưu session, logout sạch
- Avatar tự động từ email (DiceBear API)

### 🌙 Dark / Light Mode
- Toggle góc phải topbar (☀️/🌙)
- Lưu trạng thái vào localStorage
- Tất cả component đều responsive theo theme

### 🌐 Đa ngôn ngữ (i18n)
- Tiếng Việt (mặc định) / English
- Toggle 🇻🇳/🇬🇧 trong topbar
- Lưu preference vào localStorage

### 📤 Upload Hồ sơ y tế
- Drag & drop hoặc click để chọn file
- Hỗ trợ: DICOM, PDF, JPEG, PNG, DOCX
- Phân loại: Hình ảnh, Xét nghiệm, Báo cáo, Đơn thuốc
- Gợi ý AI xét nghiệm thêm (ví dụ: PET-CT toàn thân tìm ổ gốc ung thư)
- Lưu vào localStorage theo patient

### 🧬 Gia phả bệnh lý
- Hiển thị cây gia phả theo 4 thế hệ
- Thêm thành viên với quan hệ, tuổi, bệnh lý
- AI phân tích nguy cơ di truyền
- Gợi ý tầm soát cho gia đình

### 🛡️ Admin Dashboard (khanhlegood1@gmail.com)
- Xem tất cả người dùng
- Xem tất cả hồ sơ y tế
- Nhật ký hoạt động
- Thống kê tổng quan

## Setup

\`\`\`bash
npm install
npm run dev
\`\`\`

## Cấu trúc thư mục
\`\`\`
src/
├── context/
│   ├── AuthContext.jsx    # Authentication (Google/Apple/Email)
│   └── AppContext.jsx     # Theme + i18n
├── pages/
│   └── LoginPage.jsx      # Login/Register UI
├── components/
│   ├── admin/
│   │   └── AdminPanel.jsx # Admin dashboard
│   ├── family/
│   │   └── FamilyTreePanel.jsx # Gia phả bệnh lý
│   ├── upload/
│   │   └── UploadPanel.jsx # Upload hồ sơ + AI gợi ý
│   ├── Topbar.jsx         # Header + theme/lang toggle
│   ├── Sidebar.jsx        # Navigation
│   ├── ImagingPanel.jsx   # Chẩn đoán hình ảnh
│   ├── CheckinPanel.jsx   # Triệu chứng
│   ├── TwinPanel.jsx      # Digital Twin
│   ├── SimulationPanel.jsx # Mô phỏng điều trị
│   └── ConsensusPanel.jsx  # AI Consensus
├── data/
│   └── mockData.js
└── App.jsx

\`\`\`

## Production Notes
- Thay thế localStorage bằng Supabase/Firebase cho production
- Google OAuth: dùng Firebase Auth hoặc NextAuth.js
- Apple Sign In: dùng Firebase Auth
- File upload: dùng Supabase Storage hoặc AWS S3

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Zep Memory Integration

This project now includes:
- Long-term AI memory
- Multi-agent medical memory
- Temporal patient graph concepts
- AI consensus memory
- Example API route for Zep integration

### Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```
