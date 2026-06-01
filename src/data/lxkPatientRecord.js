// Canonical patient record for Lê Xuân Khánh.
export const LXK_PATIENT_RECORD = {
  id: 'LXK-2024',
  name: 'Lê Xuân Khánh',
  age: 43,
  gender: 'M',
  dob: '1982-12-12',
  blood_type: 'O+',
  avatar_initials: 'LK',

  // ── Diseases (từ hồ sơ bệnh án đầy đủ) ──────────────────────────────────
  diseases: [
    { id: 'd1', name: 'NSCLC · Stage IIA (Ung thư phổi không tế bào nhỏ)', icd10: 'C34.1', onset: '2022-06', stage: 'IIA', severity: 'critical', primary_unknown: false },
    { id: 'd2', name: 'Ung thư gan di căn (HCC T3N0M0)',                    icd10: 'C22.0', onset: '2023-08', stage: 'III', severity: 'critical', primary_unknown: false },
    { id: 'd3', name: 'Xơ gan Child-Pugh A',                               icd10: 'K74.6', onset: '2021-02', severity: 'moderate' },
    { id: 'd4', name: 'Viêm gan B mãn tính',                               icd10: 'B18.1', onset: '2009-00', severity: 'mild' },
  ],

  // ── Symptoms ──────────────────────────────────────────────────────────────
  symptoms: [
    { id: 's1', name: 'Ho kéo dài',           severity: 7, onset: '2022-05', active: true  },
    { id: 's2', name: 'Khó thở nhẹ',          severity: 5, onset: '2022-06', active: true  },
    { id: 's3', name: 'Đau hạ sườn phải',     severity: 7, onset: '2023-07', active: true  },
    { id: 's4', name: 'Mệt mỏi kéo dài',      severity: 8, onset: '2022-04', active: true  },
    { id: 's5', name: 'Chán ăn, sụt cân',     severity: 6, onset: '2023-08', active: true  },
    { id: 's6', name: 'Vàng da nhẹ',          severity: 4, onset: '2023-10', active: true  },
    { id: 's7', name: 'Đổ mồ hôi đêm',       severity: 4, onset: '2022-08', active: false },
  ],

  // ── Lab results (toàn bộ + adapt: bỏ các chỉ số đặc thù nữ giới) ────────
  labs: [
    { id: 'l1',  name: 'AFP',       value: 1840, unit: 'ng/mL', ref_high: 10,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l2',  name: 'CEA',       value: 28,   unit: 'ng/mL', ref_high: 5,    date: '2024-01-10', trend: 'stable', critical: false },
    { id: 'l3',  name: 'CA 19-9',   value: 980,  unit: 'U/mL',  ref_high: 37,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l4',  name: 'ALT',       value: 142,  unit: 'U/L',   ref_high: 56,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l5',  name: 'AST',       value: 187,  unit: 'U/L',   ref_high: 40,   date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l6',  name: 'Bilirubin', value: 3.2,  unit: 'mg/dL', ref_high: 1.2,  date: '2024-01-10', trend: 'up',     critical: true  },
    { id: 'l7',  name: 'Hb',        value: 12.1, unit: 'g/dL',  ref_high: 17.5, date: '2024-01-10', trend: 'down',   critical: false },
    { id: 'l8',  name: 'ctDNA',     value: 0.8,  unit: '%',     ref_high: 0.1,  date: '2024-01-08', trend: 'up',     critical: true  },
    { id: 'l9',  name: 'CEA (phổi)',value: 18.4, unit: 'ng/mL', ref_high: 5,    date: '2024-01-08', trend: 'stable', critical: false },
    { id: 'l10', name: 'PSA',       value: 2.1,  unit: 'ng/mL', ref_high: 4.0,  date: '2024-01-08', trend: 'stable', critical: false },
  ],

  // ── Imaging ───────────────────────────────────────────────────────────────
  imaging: [
    { id: 'i1', type: 'MRI Gan',       date: '2024-01-15', modality: 'MRI', ai_confidence: 91,
      findings: 'Khối u thuỳ phải 7.8×6.2cm. 3 tổn thương vệ tinh <2cm.',
      impression: 'HCC T3N0M0 — di căn từ ổ phổi, cần PET-CT toàn thân xác nhận' },
    { id: 'i2', type: 'CT Ngực',       date: '2023-12-20', modality: 'CT',  ai_confidence: 92,
      findings: 'L1: khối 2.3cm thuỳ trên phải, giảm 18% so T-3Mo. L2: 1.1cm tăng 8%.',
      impression: 'NSCLC đáp ứng Erlotinib. L2 cần sinh thiết tuần 8' },
    { id: 'i3', type: 'CT Bụng',       date: '2023-12-20', modality: 'CT',  ai_confidence: 88,
      findings: 'Hạch trung thất 1.2cm. Gan: 3 tổn thương phù hợp di căn.',
      impression: 'Di căn gan từ NSCLC — theo dõi sát' },
    { id: 'i4', type: 'Siêu âm Bụng',  date: '2023-08-05', modality: 'US',  ai_confidence: 85,
      findings: 'Gan to 18cm. Khối 5.1cm thuỳ phải.',
      impression: 'Phù hợp HCC trên nền xơ gan' },
  ],

  // ── Medications ───────────────────────────────────────────────────────────
  medications: [
    { id: 'm1', name: 'Erlotinib',  dose: '150mg', frequency: '1×/ngày',   route: 'PO', start: '2022-09', status: 'active',    category: 'targeted'  },
    { id: 'm2', name: 'Sorafenib',  dose: '400mg', frequency: '2×/ngày',   route: 'PO', start: '2023-09', status: 'active',    category: 'targeted'  },
    { id: 'm3', name: 'Entecavir',  dose: '0.5mg', frequency: '1×/ngày',   route: 'PO', start: '2020-03', status: 'active',    category: 'antiviral' },
    { id: 'm4', name: 'Furosemide', dose: '40mg',  frequency: '1×/ngày',   route: 'PO', start: '2023-12', status: 'active',    category: 'diuretic'  },
    { id: 'm5', name: 'TACE (Doxo)',dose: '50mg',  frequency: '1 đợt',     route: 'IA', start: '2023-10', status: 'completed', category: 'chemo'     },
    { id: 'm6', name: 'Bevacizumab',dose: 'TBD',   frequency: 'Tuần 8 TBD',route: 'IV', start: 'pending', status: 'planned',   category: 'targeted'  },
  ],

  // ── Allergies ─────────────────────────────────────────────────────────────
  allergies: [
    { id: 'a1', substance: 'Penicillin', reaction: 'Mề đay toàn thân',    severity: 'severe',   verified: true  },
    { id: 'a2', substance: 'Ibuprofen',  reaction: 'Xuất huyết tiêu hoá', severity: 'moderate', verified: true  },
  ],

  // ── Genomics (NSCLC + HCC combined) ──────────────────────────────────────
  genomics: [
    { id: 'g1', gene: 'EGFR',   variant: 'Exon 19 del',     effect: 'TKI sensitive',      clinical_sig: 'Pathogenic',        vaf: 0.45 },
    { id: 'g2', gene: 'T790M',  variant: 'p.T790M (EGFR)',  effect: 'TKI resistance risk', clinical_sig: 'Pathogenic',        vaf: 0.08 },
    { id: 'g3', gene: 'TP53',   variant: 'R248W',           effect: 'Gain-of-function',   clinical_sig: 'Pathogenic',        vaf: 0.42 },
    { id: 'g4', gene: 'CTNNB1', variant: 'S45F',            effect: 'Activating',         clinical_sig: 'Likely Pathogenic', vaf: 0.31 },
    { id: 'g5', gene: 'TERT',   variant: 'C228T (promoter)',effect: 'Expression up',      clinical_sig: 'Pathogenic',        vaf: 0.58 },
    { id: 'g6', gene: 'KRAS',   variant: 'Wild-type',       effect: 'No KRAS resistance', clinical_sig: 'Benign',            vaf: null  },
  ],

  // ── Timeline (merged NSCLC + HCC) ────────────────────────────────────────
  timeline: [
    { id: 't1', date: '2009',       event: 'Phát hiện viêm gan B mãn tính',             type: 'diagnosis' },
    { id: 't2', date: '2021-02',    event: 'Chẩn đoán xơ gan Child-Pugh A',             type: 'diagnosis', severity: 'moderate' },
    { id: 't3', date: '2022-06',    event: 'Phát hiện NSCLC Stage IIA — EGFR Exon 19 del', type: 'diagnosis', severity: 'critical' },
    { id: 't4', date: '2022-09',    event: 'Bắt đầu Erlotinib 150mg · Cycle 1',         type: 'treatment' },
    { id: 't5', date: '2023-08',    event: 'Phát hiện tổn thương gan — nghi di căn',    type: 'diagnosis', severity: 'critical' },
    { id: 't6', date: '2023-09',    event: 'Bổ sung Sorafenib cho tổn thương gan',      type: 'treatment' },
    { id: 't7', date: '2023-10',    event: 'TACE lần 1 — đáp ứng một phần',             type: 'procedure' },
    { id: 't8', date: '2023-12-20', event: 'CT: L1 −18%, L2 +8% — theo dõi L2',        type: 'imaging' },
    { id: 't9', date: '2024-01-10', event: 'AFP 1840 ng/mL · CA19-9 980 U/mL · ALT↑',  type: 'lab', severity: 'critical' },
    { id: 't10',date: '2024-01-15', event: 'MRI: khối gan 7.8cm · 3 vệ tinh',           type: 'imaging', severity: 'critical' },
    { id: 't11',date: '2024-01-18', event: 'Hội chẩn — đề xuất PET-CT toàn thân + sinh thiết L2', type: 'consult' },
  ],

  // ── Risk factors (tổng hợp cả 2 bệnh) ───────────────────────────────────
  risk_factors: [
    { id: 'r1', name: 'EGFR Exon 19 del + T790M đồng tồn tại',    weight: 95, category: 'genomic'    },
    { id: 'r2', name: 'Viêm gan B mãn tính (HBsAg+)',              weight: 92, category: 'viral'      },
    { id: 'r3', name: 'Di căn gan từ NSCLC — đa tổn thương',       weight: 90, category: 'structural' },
    { id: 'r4', name: 'AFP 1840 ng/mL liên tục tăng cao',          weight: 85, category: 'biomarker'  },
    { id: 'r5', name: 'Xơ gan nền (Child-Pugh A)',                 weight: 82, category: 'structural' },
    { id: 'r6', name: 'TP53 R248W pathogenic',                     weight: 78, category: 'genomic'    },
    { id: 'r7', name: 'TERT C228T promoter mutation',              weight: 74, category: 'genomic'    },
    { id: 'r8', name: 'Tiền sử gia đình: cha ung thư phổi',        weight: 68, category: 'genetic'    },
    { id: 'r9', name: 'Hút thuốc 8 năm (đã bỏ)',                  weight: 55, category: 'lifestyle'   },
    { id: 'r10',name: 'AQI TPHCM 128 — ô nhiễm không khí',        weight: 48, category: 'environmental'},
  ],
}

