// ─── Patient ───────────────────────────────────────────────────────────────
export const PATIENT = {
  id: 'LXK-2024',
  name: 'Lê Xuân Khánh',
  age: 47,
  location: 'Ho Chi Minh City, VN',
  aqi: 128,
  bmi: 24.2,
  smoker: 'Ex-smoker · 8yr quit',
  exercise: 'Moderate',
  currentDrug: 'Erlotinib 150mg/day · Cycle 4',
  familyHistory: { father: 'Lung Ca.', mother: 'Hypertension', sibling: 'Healthy' },
  genomics: { egfr: 'Mutant (Exon 19 del)', t790m: 'Detected', kras: 'Wild-type', brca: 'Negative' },
  symptoms: ['Persistent cough', 'Fatigue', 'Mild dyspnea', 'Night sweats'],
  symptomDuration: '6 weeks',
  symptomSeverity: '6/10',
  biomarkers: { cea: '18.4 ng/mL', ctdna: '0.8%', immuneScore: 71, liverFat: 35, lungCapacity: 68, drugResponse: 82 },
  lesions: [
    { id: 'L1', size: '2.3cm', change: -18, type: 'Primary',   status: 'Responding' },
    { id: 'L2', size: '1.1cm', change:  +8, type: 'Secondary', status: 'Watch'      },
  ],
  diagnosis: 'NSCLC · Stage IIA',
  scanTimeline: ['T−12 Mo', 'T−9 Mo', 'T−6 Mo', 'T−3 Mo', 'NOW'],
}

// ─── Agents ────────────────────────────────────────────────────────────────
export const AGENTS = [
  {
    id: 'radiology',
    name: 'Radiology AI',
    abbr: 'RX',
    role: 'Imaging analysis · Lesion detection',
    color: 'cyan',
    confidence: 92,
    vote: 'agree',
    thinking: [
      'Loading DICOM series LXK-2024…',
      'Running lesion segmentation model…',
      'Comparing against T−3Mo baseline…',
      'Generating heatmap overlay…',
      'Calculating volumetric delta…',
    ],
    output: {
      summary: 'L1 shows 18% volumetric reduction consistent with treatment response. L2 demonstrates marginal 8% growth — below threshold for re-staging but warrants active monitoring. No new lesions detected.',
      keyFindings: ['L1 regression confirmed (−18%)', 'L2 marginal growth (+8%)', 'No hilar lymphadenopathy', 'Pleural effusion absent'],
      recommendation: 'Continue Scenario B. Add ctDNA liquid biopsy as interim sensitivity marker given L2 trend.',
      confidence: 92,
    },
  },
  {
    id: 'oncology',
    name: 'Oncology AI',
    abbr: 'ON',
    role: 'Staging · Treatment protocol',
    color: 'violet',
    confidence: 87,
    vote: 'agree',
    thinking: [
      'Parsing EGFR mutation profile…',
      'Cross-referencing T790M resistance risk…',
      'Evaluating NCCN guideline match…',
      'Simulating protocol outcomes…',
      'Ranking treatment scenarios…',
    ],
    output: {
      summary: 'EGFR Exon 19 deletion with T790M co-mutation is a high-risk profile. Erlotinib maintains partial response at Cycle 4. Recommend continuing Scenario B with bevacizumab addition contingent on L2 biopsy at Week 8.',
      keyFindings: ['EGFR Exon 19 del confirmed sensitive to TKI', 'T790M signals emerging resistance risk', 'Scenario B optimal among 3 protocols', 'Bevacizumab addition at Wk8 if L2 positive'],
      recommendation: 'Scenario B — Erlotinib 150mg/day. Schedule bevacizumab review at Week 8.',
      confidence: 87,
    },
  },
  {
    id: 'pathology',
    name: 'Pathology AI',
    abbr: 'PT',
    role: 'Tissue markers · Resistance flags',
    color: 'pink',
    confidence: 78,
    vote: 'flag',
    thinking: [
      'Analyzing ctDNA fragment pattern…',
      'Checking T790M allele frequency…',
      'Cross-referencing resistance mutation DB…',
      'Flagging anomalous L2 signal…',
      'Generating dissent annotation…',
    ],
    output: {
      summary: 'T790M allele frequency at 0.8% ctDNA is rising. L2 secondary lesion shows histological pattern inconsistent with simple satellite growth — possible clonal divergence. Dissenting: biopsy required before committing to maintenance protocol.',
      keyFindings: ['T790M ctDNA rising trend detected', 'L2 clonal divergence suspected', 'CEA 18.4 — elevated, monitor', 'Biopsy L2 before maintenance lock-in'],
      recommendation: 'FLAG: Do not finalize maintenance protocol without L2 biopsy confirmation at Week 8.',
      confidence: 78,
    },
  },
  {
    id: 'gp',
    name: 'GenPractice AI',
    abbr: 'GP',
    role: 'Holistic care · Quality of life',
    color: 'green',
    confidence: 95,
    vote: 'agree',
    thinking: [
      'Integrating lifestyle data feed…',
      'Assessing HCMC environmental load…',
      'Evaluating stress-immune interaction…',
      'Reviewing QoL impact of protocols…',
      'Synthesizing holistic recommendation…',
    ],
    output: {
      summary: 'Patient stress level (6/10) combined with HCMC AQI 128 creates compounding oxidative burden. Structured psychological intervention (MBSR) recommended alongside pharmacological plan. Sleep quality data suggests cortisol elevation — beta-blocker adjunct warrants discussion.',
      keyFindings: ['Stress × AQI compounding effect identified', 'Sleep disruption → cortisol elevation', 'MBSR shown effective in NSCLC cohorts', 'Propranolol adjunct — evidence-based'],
      recommendation: 'Add MBSR program. Discuss propranolol 40mg/day as stress-pathway adjunct. Monitor sleep quality weekly.',
      confidence: 95,
    },
  },
]

// ─── Consensus ─────────────────────────────────────────────────────────────
export const CONSENSUS = {
  agreementScore: 87.5,
  recommendedScenario: 'B',
  primaryDrug: 'Erlotinib 150mg/day',
  nextCheckpoint: 'PET-CT at Week 6',
  conditionalAction: 'L2 biopsy at Week 8',
  summary: 'Three of four specialist agents recommend Scenario B continuation. Pathology AI dissent is preserved as a conditional gate: proceed with Erlotinib maintenance, but require L2 biopsy confirmation before committing to the full bevacizumab addition protocol. Stress-pathway intervention added from GP recommendation.',
  dissentNote: 'Pathology AI (78% conf) flags T790M allele frequency rise and suspected L2 clonal divergence. Consensus incorporates this as a mandatory biopsy gate rather than overriding it.',
  tags: ['Scenario B', '87.5% confidence', 'L2 watch', 'MBSR adjunct'],
}

// ─── Simulation scenarios ───────────────────────────────────────────────────
export const SCENARIOS = {
  A: { label: 'Chemo (CBDCA+PEM)', reduction: 52, risk: 'high',   color: '#ff5252', months: { 3:62, 6:52, 9:48, 12:44 } },
  B: { label: 'Targeted (Erlotinib)', reduction: 18, risk: 'low', color: '#00e5ff', months: { 3:28, 6:18, 9:12, 12:8  } },
  C: { label: 'Combined therapy',    reduction: 10, risk: 'low',  color: '#00e676', months: { 3:22, 6:10, 9:6,  12:4  } },
}
