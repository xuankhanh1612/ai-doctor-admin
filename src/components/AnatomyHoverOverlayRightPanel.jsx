import React, { useEffect, useMemo, useState } from 'react';

const ANATOMY_ANNOTATIONS = [
  { id: 'brain', top: '11%', left: '50%', label: 'Não bộ', en: 'Brain', info: 'Điều phối thần kinh, trí nhớ, tập trung và tín hiệu vận động.', food: 'Omega-3, việt quất, hạt óc chó', color: '#8b5cf6' },
  { id: 'lungs', top: '27%', left: '50%', label: 'Phổi', en: 'Lungs', info: 'Trao đổi oxy và CO₂, hỗ trợ sức bền hô hấp.', food: 'Rau xanh đậm, tỏi, thực phẩm giàu vitamin C', color: '#06b6d4' },
  { id: 'heart', top: '32%', left: '52%', label: 'Tim mạch', en: 'Heart', info: 'Bơm máu, nuôi dưỡng mô và duy trì tuần hoàn ổn định.', food: 'Yến mạch, cá béo, dầu oliu, rau lá xanh', color: '#ef4444' },
  { id: 'liver', top: '37%', left: '45%', label: 'Gan', en: 'Liver', info: 'Chuyển hoá dinh dưỡng, xử lý độc chất và hỗ trợ tiêu hoá chất béo.', food: 'Bông cải xanh, nghệ, trà xanh, rau đắng', color: '#f59e0b' },
  { id: 'stomach', top: '37%', left: '56%', label: 'Dạ dày', en: 'Stomach', info: 'Nghiền, trộn và tiêu hoá thức ăn trước khi chuyển xuống ruột non.', food: 'Yến mạch, bí đỏ, đậu hũ non, thực phẩm mềm', color: '#10b981' },
  { id: 'kidneys', top: '43%', left: '49%', label: 'Thận', en: 'Kidneys', info: 'Lọc máu, cân bằng nước - điện giải và tạo nước tiểu.', food: 'Dưa leo, măng tây, nước lọc, giảm muối', color: '#3b82f6' },
  { id: 'small-intestine', top: '50%', left: '55%', label: 'Ruột non', en: 'Small intestine', info: 'Hấp thu phần lớn vitamin, khoáng chất, amino acid và năng lượng.', food: 'Chất xơ hoà tan, probiotic, rau củ nấu chín', color: '#22c55e' },
  { id: 'bone', top: '64%', left: '56%', label: 'Xương', en: 'Bone', info: 'Nâng đỡ cơ thể, bảo vệ nội tạng và dự trữ khoáng chất.', food: 'Canxi, vitamin D, protein nạc, vận động chịu lực', color: '#64748b' },
];

export default function AnatomyHoverOverlayRightPanel({
  imageSrc = '/assets/anatomy/anatomy-human.jpg',
  title = 'Bản đồ nội tạng & dinh dưỡng',
  subtitle = 'Di chuyển chuột hoặc chạm vào từng điểm để xem cơ quan, chức năng và gợi ý thực phẩm hỗ trợ.',
  isDark = false,
}) {
  const [activeId, setActiveId] = useState('liver');
  const active = useMemo(
    () => ANATOMY_ANNOTATIONS.find((item) => item.id === activeId) || ANATOMY_ANNOTATIONS[0],
    [activeId]
  );

  useEffect(() => {
    if (ANATOMY_ANNOTATIONS.some((item) => item.id === activeId)) return;
    setActiveId('liver');
  }, [activeId]);

  const surface = isDark ? '#0f172a' : '#ffffff';
  const border = isDark ? 'rgba(148,163,184,0.18)' : '#e2e8f0';
  const text = isDark ? '#e2e8f0' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';

  return (
    <section style={{ width: '100%', background: isDark ? '#0a0d1a' : '#f8fafc', padding: 'clamp(18px,3vw,32px) clamp(12px,3vw,24px) 28px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: active.color, fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
              Interactive anatomy nutrition map
            </div>
            <h3 style={{ margin: 0, color: text, fontSize: 'clamp(20px,3vw,32px)', fontWeight: 950, letterSpacing: '-0.03em' }}>{title}</h3>
            <p style={{ margin: '8px 0 0', color: muted, fontSize: 13.5, lineHeight: 1.65, maxWidth: 720 }}>{subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ANATOMY_ANNOTATIONS.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                style={{
                  border: `1px solid ${activeId === item.id ? item.color : border}`,
                  background: activeId === item.id ? `${item.color}18` : surface,
                  color: activeId === item.id ? item.color : muted,
                  borderRadius: 999,
                  padding: '7px 11px',
                  fontSize: 11,
                  fontWeight: 850,
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.05fr) minmax(280px, 0.95fr)', gap: 18, alignItems: 'stretch' }} className="anatomy-right-panel-grid">
          <div style={{ position: 'relative', minHeight: 520, borderRadius: 28, overflow: 'hidden', border: `1px solid ${border}`, background: '#020617', boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.45)' : '0 24px 70px rgba(15,23,42,0.12)' }}>
            <img src={imageSrc} alt="Human anatomy nutrition map" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} draggable={false} />
            {ANATOMY_ANNOTATIONS.map((item) => {
              const selected = item.id === active.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveId(item.id)}
                  onFocus={() => setActiveId(item.id)}
                  onClick={() => setActiveId(item.id)}
                  aria-label={`Xem ${item.label}`}
                  style={{
                    position: 'absolute',
                    top: item.top,
                    left: item.left,
                    width: selected ? 26 : 20,
                    height: selected ? 26 : 20,
                    marginLeft: selected ? -13 : -10,
                    marginTop: selected ? -13 : -10,
                    borderRadius: '50%',
                    border: '2px solid #fff',
                    background: item.color,
                    boxShadow: `0 0 0 ${selected ? 10 : 5}px ${item.color}24, 0 0 24px ${item.color}`,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    zIndex: selected ? 3 : 2,
                  }}
                />
              );
            })}
          </div>

          <div style={{ borderRadius: 28, border: `1px solid ${border}`, background: surface, padding: 'clamp(18px,2.4vw,28px)', boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.32)' : '0 24px 70px rgba(15,23,42,0.10)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 64, height: 64, borderRadius: 22, display: 'grid', placeItems: 'center', background: `${active.color}18`, border: `1px solid ${active.color}44`, color: active.color, fontWeight: 950, fontSize: 22 }}>
                {active.label.slice(0, 1)}
              </div>
              <div>
                <div style={{ color: active.color, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 950 }}>{active.en}</div>
                <h4 style={{ margin: '3px 0 0', color: text, fontSize: 28, fontWeight: 950 }}>{active.label}</h4>
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 18, background: isDark ? 'rgba(15,23,42,0.72)' : '#f8fafc', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Chức năng chính</div>
              <p style={{ margin: 0, color: text, fontSize: 15, lineHeight: 1.75 }}>{active.info}</p>
            </div>

            <div style={{ padding: 16, borderRadius: 18, background: `${active.color}12`, border: `1px solid ${active.color}33` }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: active.color, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Gợi ý thực phẩm hỗ trợ</div>
              <p style={{ margin: 0, color: text, fontSize: 15, lineHeight: 1.75, fontWeight: 750 }}>{active.food}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 'auto' }}>
              {ANATOMY_ANNOTATIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveId(item.id)}
                  onFocus={() => setActiveId(item.id)}
                  onClick={() => setActiveId(item.id)}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${activeId === item.id ? item.color : border}`,
                    background: activeId === item.id ? `${item.color}18` : (isDark ? 'rgba(255,255,255,0.03)' : '#fff'),
                    color: activeId === item.id ? item.color : text,
                    borderRadius: 14,
                    padding: '10px 11px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 850,
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: item.color, marginRight: 7 }} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .anatomy-right-panel-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}
