import React, { useState } from 'react'
import {
  Sparkles, Github, ExternalLink, FileText, Copy, Check,
  UploadCloud, Video, Wand2, Zap, Smartphone, Mic, Terminal, MessageSquareText,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import OpenAvatarChatPanel from './OpenAvatarChatPanel'
import OpenAvatarChatVideoPanel from './OpenAvatarChatVideoPanel'
import LamGeneratePanel from './LamGeneratePanel'
import LhmGeneratePanel from './LhmGeneratePanel'

const LINKS = {
  space: 'https://huggingface.co/spaces/Lingteng/LHMPP',
  spaceEmbed: 'https://lingteng-lhmpp.hf.space',
  github: 'https://github.com/aigc3d/LAM',
  project: 'https://aigc3d.github.io/projects/LAM/',
  paper: 'https://arxiv.org/abs/2502.17796',
  audio2exp: 'https://github.com/aigc3d/LAM_Audio2Expression',
  webRender: 'https://github.com/aigc3d/LAM_WebRender',
  openAvatarChat: 'https://github.com/HumanAIGC-Engineering/OpenAvatarChat',
  // LHM++ — bản kế nhiệm LHM, nhanh hơn đáng kể (Encoder-Decoder Point-Image
  // Transformer), Space HF đang "Running on Zero" (còn sống, khác với
  // 3DAIGC/LHM cũ đang Build error)
  lhmppGithub: 'https://github.com/aigc3d/LHM-plusplus',
  lhmppSpace: 'https://huggingface.co/spaces/Lingteng/LHMPP',
  lhmppProject: 'https://lingtengqiu.github.io/LHM++/',
  // OpenAvatarChat — bản demo CHÍNH THỨC do team tự host trên HF Space
  // (đang "Running"), dùng ngay được, không cần tự host nữa
  openAvatarChatSpace: 'https://huggingface.co/spaces/HumanAIGC-Engineering-Team/open-avatar-chat',
  openAvatarChatSpaceEmbed: 'https://humanaigc-engineering-team-open-avatar-chat.static.hf.space/index.html',
  // Hi3DGen (Stable3DGen) — KHÁC nhóm với LAM/LHM: đây là mesh 3D chất lượng
  // cao cho VẬT THỂ NÓI CHUNG (không chuyên avatar người), dùng normal-map
  // làm cầu nối trung gian giữa ảnh 2D và hình học 3D. Space đang "Running
  // on Zero" tại thời điểm viết.
  stable3dgenGithub: 'https://github.com/Stable-X/Stable3DGen',
  hi3dgenSpace: 'https://huggingface.co/spaces/Stable-X/Hi3DGen',
  hi3dgenSpaceEmbed: 'https://stable-x-hi3dgen.hf.space/?__theme=system',
  hi3dgenProject: 'https://stable-x.github.io/Hi3DGen/',
  // ReconViaGen (ICLR2026, GAP-LAB-CUHK-SZ) — tái dựng 3D vật thể từ NHIỀU
  // ảnh góc chụp khác nhau bằng generation (khác Hi3DGen: 1 ảnh; khác
  // LAM/LHM: không chuyên người). Alpha demo host trên Space của Stable-X,
  // đang "Running on Zero" tại thời điểm viết.
  reconViaGenGithub: 'https://github.com/GAP-LAB-CUHK-SZ/ReconViaGen',
  reconViaGenSpace: 'https://huggingface.co/spaces/Stable-X/ReconViaGen',
  reconViaGenSpaceEmbed: 'https://stable-x-reconviagen.hf.space',
  reconViaGenProject: 'https://jiahao620.github.io/reconviagen/',
}

const OAC_SETUP_CMD = `git clone https://github.com/HumanAIGC-Engineering/OpenAvatarChat.git
cd OpenAvatarChat
git submodule update --init --recursive --depth 1
uv venv --python 3.11.11
uv pip install --editable .
# Config mặc định (chat_with_openai_compatible_edge_tts.yaml) đã dùng RtcClient (WebRTC)
# + LiteAvatar — GIỮ NGUYÊN để có mặt avatar chuyển động thật, không đổi sang WsClient.
python install.py --uv --config config/chat_with_openai_compatible_edge_tts.yaml
bash scripts/download_liteavatar_weights.sh   # tải model khuôn mặt LiteAvatar
python src/demo.py --config config/chat_with_openai_compatible_edge_tts.yaml
# Server (kèm giao diện web gốc có avatar) chạy ở https://<host>:8282
# -> dán địa chỉ đó vào ô "Video avatar thật" bên dưới.
# Nếu client và server không cùng mạng, WebRTC cần thêm TURN server (xem ghi chú notebook Colab).`

const LHM_SETUP_CMD = `# Yêu cầu: Linux + GPU NVIDIA (khuyến nghị >=16GB VRAM cho bản LHM-MINI), CUDA 11.8 hoặc 12.1
git clone https://github.com/aigc3d/LHM.git
cd LHM

# Cách nhanh nhất: dùng Docker image dựng sẵn (khỏi tự cài CUDA/torch)
wget -P ./lhm_cuda_dockers https://virutalbuy-public.oss-cn-hangzhou.aliyuncs.com/share/aigc3d/data/for_lingteng/LHM/LHM_Docker/lhm_cuda121.tar
docker load -i ./lhm_cuda_dockers/lhm_cuda121.tar
docker run -p 7860:7860 -v $(pwd):/workspace -it lhm:cuda_121 /bin/bash

# Trong container: tải bản nhẹ nhất (chạy được trên GPU 16GB)
python -c "from huggingface_hub import snapshot_download; \\
snapshot_download(repo_id='3DAIGC/LHM-MINI', cache_dir='./pretrained_models/huggingface')"

python app.py   # mặc định mở ở http://<host>:7860 (giao diện Gradio)
# -> Trỏ LHM_GRADIO_URL trong .env Vercel về http://<host-cong-khai>:7860
#    (cần expose ra Internet qua ngrok/Cloudflare Tunnel nếu chạy tại nhà,
#    hoặc deploy thẳng container này lên máy chủ GPU có IP public như
#    RunPod/Lambda/AWS/GCP.)`

const CITATION = `@inproceedings{he2025lam,
  title={LAM: Large Avatar Model for One-shot Animatable Gaussian Head},
  author={He, Yisheng and Gu, Xiaodong and Ye, Xiaodan and Xu, Chao and Zhao, Zhengyi and Dong, Yuan and Yuan, Weihao and Dong, Zilong and Bo, Liefeng},
  booktitle={Proceedings of the Special Interest Group on Computer Graphics and Interactive Techniques Conference Conference Papers},
  pages={1--13},
  year={2025}
}`

function FeatureCard({ icon, title, desc, isDark, border, surface, text, text2 }) {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: 14,
      background: surface, border: `1px solid ${border}`, borderRadius: 12,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: isDark ? 'rgba(0,229,255,0.12)' : 'rgba(0,184,204,0.12)',
        color: isDark ? '#00e5ff' : '#00b8cc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: text2, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

function LinkButton({ href, icon, label, primary, isDark }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '9px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 600,
        textDecoration: 'none', cursor: 'pointer', transition: 'all 0.15s',
        border: primary ? '1px solid transparent' : `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'}`,
        background: primary ? 'linear-gradient(135deg, #00b8cc, #6b3fd4)' : 'transparent',
        color: primary ? '#fff' : (isDark ? '#e8f0f8' : '#1a2035'),
      }}
    >
      {icon}{label}
    </a>
  )
}

export default function MyAIAvatarPanel() {
  const { theme, lang } = useApp()
  const isDark = theme === 'dark'
  const vi = lang === 'vi'

  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [oacIframeLoaded, setOacIframeLoaded] = useState(false)
  const [hi3dgenIframeLoaded, setHi3dgenIframeLoaded] = useState(false)
  const [reconViaGenIframeLoaded, setReconViaGenIframeLoaded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedSetup, setCopiedSetup] = useState(false)
  const [copiedLhmSetup, setCopiedLhmSetup] = useState(false)

  const border   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const surface  = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const text     = isDark ? '#e8f0f8' : '#1a2035'
  const text2    = isDark ? 'rgba(232,240,248,0.62)' : '#5a6270'
  const text3    = isDark ? 'rgba(232,240,248,0.4)' : '#8a90a0'

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(CITATION)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { /* clipboard unavailable, ignore */ }
  }

  const copySetupCmd = async () => {
    try {
      await navigator.clipboard.writeText(OAC_SETUP_CMD)
      setCopiedSetup(true)
      setTimeout(() => setCopiedSetup(false), 1800)
    } catch { /* clipboard unavailable, ignore */ }
  }

  const copyLhmSetupCmd = async () => {
    try {
      await navigator.clipboard.writeText(LHM_SETUP_CMD)
      setCopiedLhmSetup(true)
      setTimeout(() => setCopiedLhmSetup(false), 1800)
    } catch { /* clipboard unavailable, ignore */ }
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '4px 4px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{
          width: 46, height: 46, borderRadius: 13, flexShrink: 0,
          background: 'linear-gradient(135deg, #00b8cc, #6b3fd4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={22} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: text }}>My AI Avatar</h2>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: isDark ? 'rgba(107,63,212,0.18)' : 'rgba(107,63,212,0.1)',
              color: '#9c6fff', letterSpacing: 0.4,
            }}>SIGGRAPH 2025 · LAM</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: text2, lineHeight: 1.6, maxWidth: 640 }}>
            {vi
              ? 'Tạo avatar 3D dạng Gaussian Head có thể tạo biểu cảm và chuyển động ngay chỉ từ MỘT tấm ảnh chân dung, dựa trên nghiên cứu LAM (Large Avatar Model) của nhóm 3DAIGC. Khác với "Tạo Avatar" (chọn avatar VRM có sẵn), tính năng này tái tạo avatar 3D trực tiếp từ khuôn mặt thật của bạn.'
              : 'Reconstruct an animatable 3D Gaussian-head avatar from a single portrait photo, powered by the LAM (Large Avatar Model) research from the 3DAIGC team. Unlike "Tạo Avatar" (which picks from ready-made VRM avatars), this feature rebuilds a 3D avatar directly from your own face.'}
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 20 }}>
        <FeatureCard isDark={isDark} border={border} surface={surface} text={text} text2={text2}
          icon={<Zap size={16} />}
          title={vi ? 'Dựng avatar trong ~1 giây' : 'One-shot, ~1 second'}
          desc={vi ? 'Một lượt suy luận duy nhất, không cần quay video hay quét nhiều góc mặt.' : 'A single forward pass — no multi-angle scans or training video required.'} />
        <FeatureCard isDark={isDark} border={border} surface={surface} text={text} text2={text2}
          icon={<Smartphone size={16} />}
          title={vi ? 'Render đa nền tảng, thời gian thực' : 'Cross-platform real-time render'}
          desc={vi ? 'Avatar Gaussian dựng được có thể chạy mượt trên trình duyệt và cả điện thoại.' : 'The reconstructed Gaussian avatar renders smoothly in the browser and even on mobile.'} />
        <FeatureCard isDark={isDark} border={border} surface={surface} text={text} text2={text2}
          icon={<Mic size={16} />}
          title={vi ? 'Biểu cảm theo giọng nói' : 'Audio-driven expressions'}
          desc={vi ? 'Kết hợp LAM_Audio2Expression để avatar nhép miệng và biểu cảm theo âm thanh.' : 'Pair with LAM_Audio2Expression to drive lip-sync and facial expression from audio.'} />
        <FeatureCard isDark={isDark} border={border} surface={surface} text={text} text2={text2}
          icon={<Wand2 size={16} />}
          title={vi ? 'Trợ lý AI có gương mặt riêng' : 'Realtime chatting avatar'}
          desc={vi ? 'SDK OpenAvatarChat cho phép ghép LLM + ASR/TTS + avatar LAM để trò chuyện thời gian thực.' : 'The OpenAvatarChat SDK wires an LLM + ASR/TTS to a LAM avatar for live conversations.'} />
      </div>

      {/* How to use */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 10 }}>
          {vi ? 'Cách sử dụng demo bên dưới' : 'How to use the demo below'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { icon: <UploadCloud size={14} />, t: vi ? '1. Tải ảnh chân dung' : '1. Upload a portrait', d: vi ? 'Ảnh chính diện, đủ sáng, nhìn thẳng camera cho kết quả tốt nhất.' : 'A well-lit, front-facing photo gives the best result.' },
            { icon: <Video size={14} />, t: vi ? '2. Chọn video chuyển động' : '2. Pick a driving video', d: vi ? 'Dùng video mẫu có sẵn hoặc video khuôn mặt để dẫn hướng biểu cảm.' : 'Use a sample motion clip or a face video to drive the expression.' },
            { icon: <Wand2 size={14} />, t: vi ? '3. Nhấn Generate' : '3. Click Generate', d: vi ? 'Mô hình chạy trên GPU của Hugging Face, mất khoảng vài chục giây.' : 'Runs on Hugging Face GPU; takes roughly tens of seconds.' },
          ].map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: text2, lineHeight: 1.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: text, fontWeight: 700, marginBottom: 3 }}>{s.icon}{s.t}</div>
              {s.d}
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 12, fontSize: 11.5, color: text3, borderTop: `1px dashed ${border}`, paddingTop: 10,
        }}>
          {vi
            ? 'Lưu ý: đây là bản demo công khai của nhóm nghiên cứu chạy trên hạ tầng GPU miễn phí của Hugging Face Space, nên có thể vào hàng đợi hoặc thỉnh thoảng báo lỗi runtime khi quá tải. Nếu khung bên dưới không tải được, hãy dùng nút "Mở demo trong tab mới".'
            : 'Note: this is the research team\'s public demo running on Hugging Face\'s free shared GPU tier, so it may queue or occasionally show a runtime error under load. If the frame below fails to load, use the "Open demo in new tab" button.'}
        </div>
      </div>

      {/* Real photo -> 3D avatar generation, calling the actual LAM model server-side */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Zap size={16} color={isDark ? '#00e5ff' : '#00b8cc'} />
          <div style={{ fontSize: 14, fontWeight: 800, color: text }}>
            {vi ? 'Chạy model LAM thật ngay trong app' : 'Run the real LAM model right in this app'}
          </div>
        </div>
        <LamGeneratePanel isDark={isDark} vi={vi} border={border} surface={surface} text={text} text2={text2} text3={text3} />
      </div>

      {/* Alternative: LHM++ (aigc3d/LHM-plusplus), the faster successor to
          LHM whose HF Space is actually alive, unlike the original 3DAIGC/LHM */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Zap size={16} color={isDark ? '#00e5ff' : '#00b8cc'} />
          <div style={{ fontSize: 14, fontWeight: 800, color: text }}>
            {vi ? 'Thay thế: LHM++ (nhanh hơn, Space đang sống)' : 'Alternative: LHM++ (faster, Space is alive)'}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: isDark ? 'rgba(0,230,118,0.15)' : 'rgba(0,230,118,0.1)', color: '#00c46a',
          }}>Lingteng/LHMPP</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: text2, lineHeight: 1.6 }}>
          {vi
            ? 'LHM++ (github.com/aigc3d/LHM-plusplus) là bản kế nhiệm LHM, tái thiết kế kiến trúc (Encoder-Decoder Point-Image Transformer) để nhanh hơn đáng kể, dựng người từ ảnh không cần tư thế chuẩn. Space demo "Lingteng/LHMPP" đang thực sự chạy — khác với 3DAIGC/LAM (lỗi driver GPU) và 3DAIGC/LHM gốc (lỗi build) đã gặp ở trên. (Mirror ModelScope thử trước đó bị chặn theo khu vực, chỉ nhận SĐT Trung Quốc đại lục, nên đã bỏ hướng đó.)'
            : 'LHM++ (github.com/aigc3d/LHM-plusplus) is the successor to LHM, redesigned (Encoder-Decoder Point-Image Transformer architecture) to be substantially faster, reconstructing a person from images without needing a canonical pose. The "Lingteng/LHMPP" demo Space is actually running — unlike 3DAIGC/LAM (GPU driver error) and the original 3DAIGC/LHM (build error) hit earlier. (The ModelScope mirror tried first turned out to be geo-blocked to mainland China phone numbers only, so that route was dropped.)'}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <LinkButton href={LINKS.lhmppGithub} icon={<Github size={13} />} label={vi ? 'Mã nguồn LHM++' : 'LHM++ source'} isDark={isDark} />
          <LinkButton href={LINKS.lhmppSpace} icon={<ExternalLink size={13} />} label={vi ? 'Space demo (Lingteng/LHMPP)' : 'Demo Space (Lingteng/LHMPP)'} isDark={isDark} />
          <LinkButton href={LINKS.lhmppProject} icon={<ExternalLink size={13} />} label={vi ? 'Trang dự án LHM++' : 'LHM++ project page'} isDark={isDark} />
        </div>
        <LhmGeneratePanel isDark={isDark} vi={vi} border={border} surface={surface} text={text} text2={text2} text3={text3} />

        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: text }}>
              <Terminal size={14} /> {vi ? 'Tự host LHM/LHM++ (dự phòng nếu Space công khai lại sập)' : 'Self-host LHM/LHM++ (backup if the public Space goes down again)'}
            </div>
            <button onClick={copyLhmSetupCmd} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600,
              padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${border}`, background: 'transparent', color: text2,
            }}>
              {copiedLhmSetup ? <Check size={13} color="#00e676" /> : <Copy size={13} />}
              {copiedLhmSetup ? (vi ? 'Đã sao chép' : 'Copied') : (vi ? 'Sao chép lệnh' : 'Copy commands')}
            </button>
          </div>
          <pre style={{
            margin: 0, fontSize: 11, lineHeight: 1.65, color: text2, overflowX: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre',
          }}>{LHM_SETUP_CMD}</pre>
          <div style={{ marginTop: 10, fontSize: 11.5, color: text3 }}>
            {vi
              ? 'Panel phía trên giờ gọi thẳng Space "Lingteng/LHMPP" đang sống nên phần lớn trường hợp bạn không cần tự host nữa. Khối lệnh này chỉ để dự phòng nếu Space đó cũng sập hoặc quá tải — tự host xong thì khai báo LHM_GRADIO_URL trỏ tới server riêng của bạn (xem .env.example) để ghi đè, không cần đổi code.'
              : 'The panel above now calls the live "Lingteng/LHMPP" Space directly, so in most cases you no longer need to self-host. Keep this command block as a backup for if that Space also goes down or gets overloaded — once self-hosted, set LHM_GRADIO_URL to your own server (see .env.example) to override, no code change needed.'}
          </div>
        </div>
      </div>

      {/* Embedded live demo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text }}>
            {vi ? 'Demo trực tiếp (LHM++, Hugging Face Space, tham khảo trực quan)' : 'Live demo (LHM++, Hugging Face Space, visual reference)'}
          </div>
          <LinkButton href={LINKS.space} icon={<ExternalLink size={13} />} label={vi ? 'Mở demo trong tab mới' : 'Open demo in new tab'} isDark={isDark} />
        </div>
        <div style={{
          position: 'relative', width: '100%', height: 720, borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${border}`, background: isDark ? '#05070f' : '#f4f6fa',
        }}>
          {!iframeLoaded && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, color: text3, fontSize: 12.5,
            }}>
              <Sparkles size={20} className="spin" />
              {vi ? 'Đang tải demo LHM++ từ Hugging Face...' : 'Loading LHM++ demo from Hugging Face...'}
            </div>
          )}
          <iframe
            title="LHM++ (Lingteng/LHMPP) - Hugging Face Space"
            src={LINKS.spaceEmbed}
            onLoad={() => setIframeLoaded(true)}
            style={{ width: '100%', height: '100%', border: 'none', opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            allow="camera; microphone; fullscreen"
          />
        </div>
      </div>

      {/* Real-time avatar chat powered by OpenAvatarChat */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <MessageSquareText size={16} color={isDark ? '#00e5ff' : '#00b8cc'} />
          <div style={{ fontSize: 14, fontWeight: 800, color: text }}>
            {vi ? 'Trò chuyện thời gian thực với Avatar AI' : 'Real-time AI Avatar conversation'}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: isDark ? 'rgba(0,230,118,0.15)' : 'rgba(0,230,118,0.1)', color: '#00c46a',
          }}>OpenAvatarChat</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: text2, lineHeight: 1.6 }}>
          {vi
            ? 'Dự án mã nguồn mở OpenAvatarChat (ghép LLM + ASR + TTS + Avatar) tự phục vụ MỘT giao diện web đầy đủ, đã vẽ sẵn khuôn mặt avatar chuyển động (LiteAvatar/LAM) qua WebRTC. Vì backend cần GPU và tải model nặng, bạn tự chạy nó (miễn phí, mã nguồn mở) rồi dán URL server vào panel video bên dưới — không có mô phỏng hay dữ liệu giả.'
            : 'The open-source OpenAvatarChat project (LLM + ASR + TTS + Avatar) serves a complete web frontend of its own that already draws the moving avatar face (LiteAvatar/LAM) over WebRTC. Because the backend needs a GPU and heavyweight models, you run it yourself (free, open source) and paste the server URL into the video panel below — nothing here is simulated.'}
        </p>

        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: text }}>
              <Sparkles size={14} /> {vi ? 'Cách nhanh nhất: demo chính thức (không cần tự host)' : 'Fastest option: official demo (no self-hosting needed)'}
            </div>
            <LinkButton href={LINKS.openAvatarChatSpace} icon={<ExternalLink size={13} />} label={vi ? 'Mở trong tab mới' : 'Open in new tab'} isDark={isDark} />
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: text3, lineHeight: 1.6 }}>
            {vi
              ? 'Chính team HumanAIGC-Engineering-Team tự host sẵn một bản demo đầy đủ (chọn được LiteAvatar hoặc LAM) trên Hugging Face Space — dùng thử ngay bên dưới, không cần dựng server riêng.'
              : 'The HumanAIGC-Engineering-Team itself hosts a complete demo (choice of LiteAvatar or LAM) on a Hugging Face Space — try it right below, no need to stand up your own server.'}
          </p>
          <div style={{
            position: 'relative', width: '100%', height: 560, borderRadius: 12, overflow: 'hidden',
            border: `1px solid ${border}`, background: isDark ? '#05070f' : '#f4f6fa',
          }}>
            {!oacIframeLoaded && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8, color: text3, fontSize: 12.5,
              }}>
                <Sparkles size={20} className="spin" />
                {vi ? 'Đang tải demo OpenAvatarChat...' : 'Loading the OpenAvatarChat demo...'}
              </div>
            )}
            <iframe
              title="Open Avatar Chat - Hugging Face Space"
              src={LINKS.openAvatarChatSpaceEmbed}
              onLoad={() => setOacIframeLoaded(true)}
              style={{ width: '100%', height: '100%', border: 'none', opacity: oacIframeLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
              allow="camera; microphone; autoplay; fullscreen"
            />
          </div>
        </div>

        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: text }}>
              <Terminal size={14} /> {vi ? 'Hoặc tự host backend riêng (tuỳ chỉnh được nhiều hơn)' : 'Or self-host your own backend (more customizable)'}
            </div>
            <button onClick={copySetupCmd} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600,
              padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${border}`, background: 'transparent', color: text2,
            }}>
              {copiedSetup ? <Check size={13} color="#00e676" /> : <Copy size={13} />}
              {copiedSetup ? (vi ? 'Đã sao chép' : 'Copied') : (vi ? 'Sao chép lệnh' : 'Copy commands')}
            </button>
          </div>
          <pre style={{
            margin: 0, fontSize: 11, lineHeight: 1.65, color: text2, overflowX: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre',
          }}>{OAC_SETUP_CMD}</pre>
          <div style={{ marginTop: 10, fontSize: 11.5, color: text3 }}>
            {vi
              ? 'Cần: máy có GPU NVIDIA (khuyến nghị), Python 3.11 và uv. Docker + docker-compose.yml có sẵn trong repo nếu bạn muốn chạy container hoá. Yêu cầu API key cho LLM (ví dụ DASHSCOPE_API_KEY) tuỳ theo file config bạn chọn. Không chạy được máy riêng? Dùng notebook Colab đính kèm (chọn AVATAR_MODE = "native_video") để có URL public trong vài phút.'
              : 'Requires: an NVIDIA GPU (recommended), Python 3.11, and uv. A Docker + docker-compose.yml setup ships in the repo if you\'d rather containerize it. You\'ll need an LLM API key (e.g. DASHSCOPE_API_KEY) depending on the config you pick. No spare machine? Use the bundled Colab notebook (set AVATAR_MODE = "native_video") to get a public URL in a few minutes.'}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <OpenAvatarChatVideoPanel
            isDark={isDark} vi={vi} border={border} surface={surface} text={text} text2={text2} text3={text3}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 8px' }}>
          <div style={{ flex: 1, height: 1, background: border }} />
          <span style={{ fontSize: 11, color: text3, whiteSpace: 'nowrap' }}>
            {vi ? 'Hoặc: chế độ nhẹ, chỉ chữ + âm thanh (không có mặt)' : 'Or: lightweight mode, text + audio only (no face)'}
          </span>
          <div style={{ flex: 1, height: 1, background: border }} />
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 11.5, color: text3, lineHeight: 1.55 }}>
          {vi
            ? 'Panel dưới đây là client WebSocket tự viết (không dùng WebRTC, né được vấn đề TURN/NAT) — chỉ hiển thị chữ và phát âm thanh, KHÔNG vẽ mặt avatar. Cần chạy backend ở chế độ AVATAR_MODE = "text_only_legacy" (đổi RtcClient → WsClient) trong notebook Colab để dùng được chế độ này.'
            : 'The panel below is a hand-written WebSocket client (no WebRTC, so no TURN/NAT hassle) — it shows text and plays audio only, it does NOT draw the avatar face. It needs the backend run with AVATAR_MODE = "text_only_legacy" (RtcClient → WsClient) in the Colab notebook.'}
        </p>

        <OpenAvatarChatPanel
          isDark={isDark} vi={vi} border={border} surface={surface} text={text} text2={text2} text3={text3}
        />
      </div>

      {/* Bonus: Hi3DGen (Stable3DGen) — mesh 3D chất lượng cao cho VẬT THỂ
          NÓI CHUNG, khác nhánh với LAM/LHM (chuyên avatar người). Dùng khi
          cần dựng mesh chi tiết từ 1 ảnh cho vật thể bất kỳ, không riêng
          người/mặt. */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Sparkles size={16} color={isDark ? '#00e5ff' : '#00b8cc'} />
          <div style={{ fontSize: 14, fontWeight: 800, color: text }}>
            {vi ? 'Bonus: Hi3DGen / Stable3DGen (mesh 3D vật thể chung)' : 'Bonus: Hi3DGen / Stable3DGen (general-object 3D mesh)'}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: isDark ? 'rgba(0,230,118,0.15)' : 'rgba(0,230,118,0.1)', color: '#00c46a',
          }}>Stable-X/Hi3DGen</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: text2, lineHeight: 1.6 }}>
          {vi
            ? 'Khác nhánh với LAM/LHM ở trên (chuyên avatar người có thể tạo dáng/animate): Hi3DGen (github.com/Stable-X/Stable3DGen) dựng mesh 3D độ chi tiết cao từ MỘT ảnh bất kỳ — dùng normal-map làm cầu nối trung gian giữa ảnh 2D và hình học 3D, cho biên/chi tiết sắc nét hơn các phương pháp đi thẳng ảnh→3D. Phù hợp khi bạn cần mesh (OBJ/GLB/PLY/STL) cho vật thể chung (mô hình giải phẫu, dụng cụ y tế, đồ vật...) chứ không phải avatar người có thể cử động. Space demo đang chạy — nhúng trực tiếp bên dưới.'
            : 'A different branch from LAM/LHM above (which specialize in posable/animatable human avatars): Hi3DGen (github.com/Stable-X/Stable3DGen) builds a high-detail 3D mesh from a single arbitrary image — using a normal map as an intermediate bridge between the 2D image and 3D geometry, giving sharper edges/detail than direct image→3D methods. Good fit when you need a mesh (OBJ/GLB/PLY/STL) for a general object (anatomical models, medical instruments, everyday objects...) rather than a posable human avatar. The demo Space is live — embedded directly below.'}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <LinkButton href={LINKS.stable3dgenGithub} icon={<Github size={13} />} label={vi ? 'Mã nguồn Stable3DGen' : 'Stable3DGen source'} isDark={isDark} />
          <LinkButton href={LINKS.hi3dgenSpace} icon={<ExternalLink size={13} />} label={vi ? 'Space demo (Stable-X/Hi3DGen)' : 'Demo Space (Stable-X/Hi3DGen)'} isDark={isDark} />
          <LinkButton href={LINKS.hi3dgenProject} icon={<ExternalLink size={13} />} label={vi ? 'Trang dự án Hi3DGen' : 'Hi3DGen project page'} isDark={isDark} />
        </div>
        <div style={{
          position: 'relative', width: '100%', height: 640, borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${border}`, background: isDark ? '#05070f' : '#f4f6fa',
        }}>
          {!hi3dgenIframeLoaded && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, color: text3, fontSize: 12.5,
            }}>
              <Sparkles size={20} className="spin" />
              {vi ? 'Đang tải demo Hi3DGen...' : 'Loading the Hi3DGen demo...'}
            </div>
          )}
          <iframe
            title="Hi3DGen (Stable-X) - Hugging Face Space"
            src={LINKS.hi3dgenSpaceEmbed}
            onLoad={() => setHi3dgenIframeLoaded(true)}
            style={{ width: '100%', height: '100%', border: 'none', opacity: hi3dgenIframeLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            allow="fullscreen"
          />
        </div>
      </div>

      {/* Bonus: ReconViaGen (ICLR2026, GAP-LAB-CUHK-SZ) — tái dựng 3D vật
          thể từ NHIỀU ảnh góc chụp khác nhau bằng generation. Khác Hi3DGen
          (1 ảnh) và khác LAM/LHM (không chuyên avatar người). */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Sparkles size={16} color={isDark ? '#00e5ff' : '#00b8cc'} />
          <div style={{ fontSize: 14, fontWeight: 800, color: text }}>
            {vi ? 'Bonus: ReconViaGen (tái dựng 3D từ nhiều ảnh)' : 'Bonus: ReconViaGen (multi-view 3D reconstruction)'}
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: isDark ? 'rgba(0,230,118,0.15)' : 'rgba(0,230,118,0.1)', color: '#00c46a',
          }}>ICLR 2026 · Stable-X/ReconViaGen</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: text2, lineHeight: 1.6 }}>
          {vi
            ? 'ReconViaGen (github.com/GAP-LAB-CUHK-SZ/ReconViaGen, ICLR 2026) khác Hi3DGen ở trên: thay vì dựng mesh từ MỘT ảnh, nó dựng lại vật thể 3D chính xác hơn khi có NHIỀU ảnh chụp từ các góc khác nhau, bằng cách kết hợp reconstruction với generation để lấp đầy phần bị che khuất. Bản v0.5 còn kết hợp với TRELLIS.2 để xuất mesh độ phân giải cao kèm vật liệu PBR. Phù hợp khi bạn có sẵn vài ảnh chụp cùng một vật thể/dụng cụ y tế từ nhiều góc và muốn mesh 3D chính xác hơn so với chỉ dùng 1 ảnh.'
            : 'ReconViaGen (github.com/GAP-LAB-CUHK-SZ/ReconViaGen, ICLR 2026) differs from Hi3DGen above: instead of building a mesh from a single image, it reconstructs the 3D object more accurately when given multiple images from different viewpoints, combining reconstruction with generation to fill in occluded parts. The v0.5 branch also pairs with TRELLIS.2 to export high-resolution meshes with PBR materials. Good fit when you already have several photos of the same object/medical instrument from different angles and want a more accurate mesh than a single image would give.'}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <LinkButton href={LINKS.reconViaGenGithub} icon={<Github size={13} />} label={vi ? 'Mã nguồn ReconViaGen' : 'ReconViaGen source'} isDark={isDark} />
          <LinkButton href={LINKS.reconViaGenSpace} icon={<ExternalLink size={13} />} label={vi ? 'Space demo (Stable-X/ReconViaGen)' : 'Demo Space (Stable-X/ReconViaGen)'} isDark={isDark} />
          <LinkButton href={LINKS.reconViaGenProject} icon={<ExternalLink size={13} />} label={vi ? 'Trang dự án ReconViaGen' : 'ReconViaGen project page'} isDark={isDark} />
        </div>
        <div style={{
          position: 'relative', width: '100%', height: 640, borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${border}`, background: isDark ? '#05070f' : '#f4f6fa',
        }}>
          {!reconViaGenIframeLoaded && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8, color: text3, fontSize: 12.5,
            }}>
              <Sparkles size={20} className="spin" />
              {vi ? 'Đang tải demo ReconViaGen...' : 'Loading the ReconViaGen demo...'}
            </div>
          )}
          <iframe
            title="ReconViaGen (Stable-X) - Hugging Face Space"
            src={LINKS.reconViaGenSpaceEmbed}
            onLoad={() => setReconViaGenIframeLoaded(true)}
            style={{ width: '100%', height: '100%', border: 'none', opacity: reconViaGenIframeLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
            allow="fullscreen"
          />
        </div>
      </div>

      {/* Links & ecosystem */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <LinkButton href={LINKS.github} icon={<Github size={14} />} label={vi ? 'Mã nguồn GitHub' : 'GitHub repo'} isDark={isDark} primary />
        <LinkButton href={LINKS.project} icon={<ExternalLink size={14} />} label={vi ? 'Trang dự án' : 'Project page'} isDark={isDark} />
        <LinkButton href={LINKS.paper} icon={<FileText size={14} />} label={vi ? 'Bài báo (arXiv)' : 'Paper (arXiv)'} isDark={isDark} />
      </div>

      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 8 }}>
          {vi ? 'Hệ sinh thái liên quan từ nhóm 3DAIGC' : 'Related tools from the 3DAIGC ecosystem'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <LinkButton href={LINKS.audio2exp} icon={<Mic size={13} />} label="LAM_Audio2Expression" isDark={isDark} />
          <LinkButton href={LINKS.webRender} icon={<Smartphone size={13} />} label="LAM_WebRender" isDark={isDark} />
          <LinkButton href={LINKS.openAvatarChat} icon={<Wand2 size={13} />} label="OpenAvatarChat SDK" isDark={isDark} />
        </div>
      </div>

      {/* Citation */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{vi ? 'Trích dẫn nghiên cứu' : 'Citation'}</div>
          <button
            onClick={copyCitation}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600,
              padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${border}`, background: 'transparent', color: text2,
            }}
          >
            {copied ? <Check size={13} color="#00e676" /> : <Copy size={13} />}
            {copied ? (vi ? 'Đã sao chép' : 'Copied') : (vi ? 'Sao chép' : 'Copy')}
          </button>
        </div>
        <pre style={{
          margin: 0, fontSize: 11, lineHeight: 1.6, color: text2, overflowX: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre',
        }}>{CITATION}</pre>
      </div>
    </div>
  )
}
