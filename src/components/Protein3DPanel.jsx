import React from 'react'
import NavButtons from './NavButtons.jsx'

const PROTEIN_3D_URL = 'https://protein3d-lego-khanh.vercel.app/'

export default function Protein3DPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  return (
    <div className="protein3d-page animate-fade">
      <section className="protein3d-hero">
        <div>
          <div className="protein3d-kicker">Protein 3D Workspace</div>
          <h2>Protein 3D</h2>
          <p>
            Không gian mô phỏng protein 3D được nhúng trực tiếp vào Consensus Doctor để xem,
            tương tác và khám phá cấu trúc phân tử trong cùng luồng làm việc y tế.
          </p>
        </div>
        <a className="protein3d-open-link" href={PROTEIN_3D_URL} target="_blank" rel="noreferrer">
          Mở trang gốc ↗
        </a>
      </section>

      <section className="protein3d-frame-card" aria-label="Protein 3D embedded application">
        <iframe
          src={PROTEIN_3D_URL}
          title="Protein 3D"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; web-share"
          allowFullScreen
        />
      </section>

      <NavButtons onNext={onNext} nextLabel={nextLabel || 'AI Healthcare Vision'} onPrev={onPrev} prevLabel={prevLabel} />
    </div>
  )
}
