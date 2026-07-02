// src/components/MyRewardHealthPanel.jsx
// "My Reward Health" — Medical Cell Engine: a Conway's-Game-of-Life-inspired
// reward mini-game. Every real habit (mission) you complete, and every item
// you buy with Gems, changes the cellular world running behind the scenes.
//
// Design references (see uploaded docs in the project):
//   - Living_Medical_World_Engine_Design.md
//   - Health_Journey_V2_Medical_Cell_Engine_Proposal.md
//   - research-infinite-gameoflife-Conway.md / -C4.md
// The simulation loop is *inspired by* the classic Conway "Game of Life"
// (as popularised by projects like https://copy.sh/life and
// https://github.com/copy/life) — cells are born/survive/die based on
// their neighbours — extended here with medical states (Immune, Infected,
// Stem, Repair, Cancer) as described in the design docs. This is an
// original implementation written for this app, not a copy of any
// third-party source code.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import NavButtons from './NavButtons.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../context/AuthContext'
import { getSetting, setSetting } from '../lib/anonDB.js'
import { DEFAULT_FAMILY_MEMBERS, RELATION_META, loadFamilyMembers } from './family/familyData.js'

const FAMILY_TREE_PATIENT_ID = 'LXK-2024'

/* ────────────────────────────────────────────────────────────────────── */
/*  Constants                                                             */
/* ────────────────────────────────────────────────────────────────────── */

const DB_KEY = 'my_reward_health_engine_db_v1'
const GRID_W = 44
const GRID_H = 22
const CELL_PX = 12

const S = { DEAD: 0, HEALTHY: 1, STEM: 2, IMMUNE: 3, REPAIR: 4, INFECTED: 5, CANCER: 6 }

const CELL_META = {
  [S.DEAD]:     { color: '#3a4256', label: 'Dead Cell',     labelVi: 'Tế bào chết' },
  [S.HEALTHY]:  { color: '#00e676', label: 'Healthy Cell',  labelVi: 'Tế bào khỏe mạnh' },
  [S.STEM]:     { color: '#9c6fff', label: 'Stem Cell',     labelVi: 'Tế bào gốc' },
  [S.IMMUNE]:   { color: '#29b6f6', label: 'Immune Cell',   labelVi: 'Tế bào miễn dịch' },
  [S.REPAIR]:   { color: '#ffb74d', label: 'Repair Cell',   labelVi: 'Tế bào phục hồi' },
  [S.INFECTED]: { color: '#ff5252', label: 'Infected Cell', labelVi: 'Tế bào nhiễm bệnh' },
  [S.CANCER]:   { color: '#e040fb', label: 'Mutant Cell',   labelVi: 'Tế bào đột biến' },
}

const ZONES = [
  { id: 'wholebody', name: 'Whole Body',   nameVi: 'Toàn Cơ Thể', icon: '🧍' },
  { id: 'liver',   name: 'Liver Region',   nameVi: 'Gan',        icon: '🫀' },
  { id: 'heart',   name: 'Heart Region',   nameVi: 'Tim',        icon: '❤️' },
  { id: 'lung',    name: 'Lung Region',    nameVi: 'Phổi',       icon: '🫁' },
  { id: 'brain',   name: 'Brain Region',   nameVi: 'Não',        icon: '🧠' },
  { id: 'kidney',  name: 'Kidney Region',  nameVi: 'Thận',       icon: '🧬' },
  { id: 'stomach', name: 'Stomach Region', nameVi: 'Dạ Dày',     icon: '🍽️' },
]

const BOSSES = [
  { id: 'flu',        name: 'Influenza',   nameVi: 'Cúm mùa',        maxHp: 8000,  icon: '🦠' },
  { id: 'covid',       name: 'COVID',       nameVi: 'COVID',          maxHp: 12000, icon: '🧫' },
  { id: 'fattyliver',  name: 'Fatty Liver', nameVi: 'Gan nhiễm mỡ',   maxHp: 16000, icon: '🫀' },
  { id: 'diabetes',    name: 'Diabetes',    nameVi: 'Tiểu đường',     maxHp: 20000, icon: '🍬' },
  { id: 'hypertension',name: 'Hypertension',nameVi: 'Cao huyết áp',   maxHp: 24000, icon: '💢' },
  { id: 'cancer',      name: 'Cancer',      nameVi: 'Ung thư',        maxHp: 30000, icon: '☠️' },
]

const TICK_SCHEDULE = [
  { label: '1 giây',  sub: 'Animation',      icon: '▶️' },
  { label: '5 giây',  sub: 'Cell Update',    icon: '🟢' },
  { label: '30 giây', sub: 'Immune AI',      icon: '🛡️' },
  { label: '1 phút',  sub: 'Conway Update',  icon: '🔷' },
  { label: '5 phút',  sub: 'Disease Spread', icon: '🦠' },
  { label: '1 ngày',  sub: 'Daily Quest',    icon: '📅' },
]

const DAILY_MISSIONS = [
  { id: 'water',    label: 'Uống 2 lít nước',   icon: '💧', gems: 40, effect: { atp: 10, virusLoad: -3 } },
  { id: 'walk',     label: 'Đi bộ 30 phút',     icon: '🚶', gems: 60, effect: { atp: 8, immunePower: 6 } },
  { id: 'sleep',    label: 'Ngủ đủ 7 tiếng',    icon: '🛌', gems: 60, effect: { stress: -12, dna: 5 } },
  { id: 'veggie',   label: 'Ăn đủ rau xanh',    icon: '🥦', gems: 40, effect: { immunePower: 8, mutation: -3 } },
  { id: 'meditate', label: 'Thiền 10 phút',     icon: '🧘', gems: 50, effect: { stress: -15 } },
]

// category -> shop items (icon, cost, effect applied once when bought)
const SHOP_CATEGORIES = [
  {
    id: 'nutrition', label: 'Nutrition', icon: '🥗',
    items: [
      { id: 'vitc',   name: 'Vitamin C',  icon: '🍊', cost: 100, effect: { immunePower: 5 } },
      { id: 'omega3', name: 'Omega 3',    icon: '🐟', cost: 150, effect: { dna: 4 } },
      { id: 'water',  name: 'Water Bottle', icon: '💧', cost: 50,  effect: { atp: 6 } },
      { id: 'fiber',  name: 'Fiber',      icon: '🌾', cost: 90,  effect: { stress: -4 } },
    ],
  },
  {
    id: 'medicine', label: 'Medicine', icon: '💊',
    items: [
      { id: 'antibiotic', name: 'Antibiotic', icon: '💊', cost: 300, effect: { virusLoad: -18 }, killInfected: 25 },
      { id: 'antiviral',  name: 'Antiviral',  icon: '🧪', cost: 300, effect: { virusLoad: -18 }, killInfected: 25 },
      { id: 'painkiller', name: 'Painkiller', icon: '💉', cost: 150, effect: { stress: -20 } },
      { id: 'probiotic',  name: 'Probiotic',  icon: '🧫', cost: 200, effect: { immunePower: 6 } },
      { id: 'insulin',    name: 'Insulin',    icon: '💉', cost: 400, effect: { atp: 10, virusLoad: -5 } },
    ],
  },
  {
    id: 'dna', label: 'DNA', icon: '🧬',
    items: [
      { id: 'dnarepair',  name: 'DNA Repair Kit', icon: '🧬', cost: 500,  effect: { mutation: -20 }, spawnCancerToRepair: 20 },
      { id: 'genome',     name: 'Genome Crystal', icon: '💎', cost: 700,  effect: { dna: 15 } },
      { id: 'longevity',  name: 'Longevity Gene', icon: '🌟', cost: 1000, effect: { dna: 20, mutation: -10 } },
      { id: 'stemcell',   name: 'Stem Cell',      icon: '🔷', cost: 800,  effect: { dna: 8 }, spawnStem: 8 },
    ],
  },
  {
    id: 'cell', label: 'Cell', icon: '🟢',
    items: [
      { id: 'atpbooster', name: 'ATP Booster',   icon: '⚡', cost: 200,  effect: { atp: 18 } },
      { id: 'mitopack',   name: 'Mito Pack',     icon: '🔋', cost: 250,  effect: { atp: 22 } },
      { id: 'repairgel',  name: 'Cell Repair Gel', icon: '🧴', cost: 350, effect: {}, reviveDead: 30 },
      { id: 'regenpack',  name: 'Regeneration Pack', icon: '♻️', cost: 450, effect: { atp: 10 }, reviveDead: 20 },
    ],
  },
  {
    id: 'immune', label: 'Immune', icon: '🛡️',
    items: [
      { id: 'tcell', name: 'T Cell Booster', icon: '🛡️', cost: 300, effect: { immunePower: 14 }, spawnImmune: 12 },
      { id: 'nk',    name: 'NK Booster',     icon: '⚔️', cost: 250, effect: { immunePower: 10 }, spawnImmune: 8 },
      { id: 'shield',name: 'Immune Shield',  icon: '🔰', cost: 500, effect: { immunePower: 20 }, spawnImmune: 20 },
    ],
  },
  {
    id: 'research', label: 'Research', icon: '🔬',
    items: [
      { id: 'microscope', name: 'Microscope',   icon: '🔬', cost: 600, effect: {}, coach: true },
      { id: 'scanner',    name: 'Genome Scanner', icon: '📡', cost: 600, effect: {}, coach: true },
      { id: 'aidiagnosis',name: 'AI Diagnosis',  icon: '🤖', cost: 900, effect: {}, coach: true },
    ],
  },
]

const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v))
const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Simulation engine (Conway-inspired, extended w/ medical states)       */
/* ────────────────────────────────────────────────────────────────────── */

function makeInitialGrid() {
  const grid = new Array(GRID_W * GRID_H).fill(S.DEAD)
  for (let i = 0; i < grid.length; i++) {
    const r = Math.random()
    if (r < 0.42) grid[i] = S.HEALTHY
    else if (r < 0.46) grid[i] = S.IMMUNE
    else if (r < 0.48) grid[i] = S.STEM
    else if (r < 0.51) grid[i] = S.INFECTED
  }
  return grid
}

function idx(x, y) { return ((y + GRID_H) % GRID_H) * GRID_W + ((x + GRID_W) % GRID_W) }

/* ────────────────────────────────────────────────────────────────────── */
/*  Per-organ pixel-art shapes, driven by each family member's pathology  */
/* ────────────────────────────────────────────────────────────────────── */

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const inEllipse = (x, y, cx, cy, rx, ry) => {
  const dx = (x - cx) / rx
  const dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1
}

// Regex per organ zone — matches Vietnamese/English condition names recorded
// on a family member's medical record (see familyData.js CONDITION_COLORS).
const ZONE_CONDITION_PATTERNS = {
  liver:   /gan|liver|xơ gan|cirrhosis/i,
  heart:   /tim|heart|huyết áp|hypertension/i,
  lung:    /phổi|lung/i,
  brain:   /não|brain|đột quỵ|stroke/i,
  kidney:  /thận|kidney/i,
  stomach: /dạ dày|stomach|đại tràng|colon/i,
}

// Boolean "is inside the organ silhouette" mask, built once per zone with
// simple ellipse geometry — a stylised pixel-art outline, not an anatomy
// reference, sized to fit the GRID_W x GRID_H cell world.
function buildOrganMask(zoneId) {
  const cx = GRID_W / 2
  const cy = GRID_H / 2
  const mask = new Array(GRID_W * GRID_H).fill(false)
  const paint = (predicate) => {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (predicate(x + 0.5, y + 0.5)) mask[idx(x, y)] = true
      }
    }
  }

  switch (zoneId) {
    case 'liver':
      // Large right lobe + smaller left lobe, notch cut near the top (falciform ligament).
      paint((x, y) => (
        (inEllipse(x, y, cx + 4, cy, 12, 7) || inEllipse(x, y, cx - 8, cy + 2, 6, 4.5)) &&
        !inEllipse(x, y, cx + 1, cy - 6, 5, 3)
      ))
      break
    case 'heart':
      // Classic parametric heart curve ((x²+y²-1)³ - x²y³ ≤ 0), scaled to the grid.
      paint((x, y) => {
        const hx = (x - cx) / 9
        const hy = -(y - (cy + 2)) / 8.2
        const v = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * Math.pow(hy, 3)
        return v <= 0
      })
      break
    case 'lung':
      // Two bean-shaped lobes with a bite taken out of the inner edge, gap for the trachea.
      paint((x, y) => (
        (inEllipse(x, y, cx - 8, cy, 7, 9) && !inEllipse(x, y, cx - 3.5, cy, 3.4, 9)) ||
        (inEllipse(x, y, cx + 8, cy, 7, 9) && !inEllipse(x, y, cx + 3.5, cy, 3.4, 9))
      ))
      break
    case 'brain':
      // Rounded shape split down the middle into two hemispheres.
      paint((x, y) => (
        inEllipse(x, y, cx, cy, 13, 8) && Math.abs(x - cx) > 0.6
      ))
      break
    case 'kidney':
      // Bean shape: an ellipse with a concave bite on the inner side.
      paint((x, y) => (
        inEllipse(x, y, cx, cy, 9, 7) && !inEllipse(x, y, cx + 4, cy, 5, 4)
      ))
      break
    case 'stomach':
      // J-shaped pouch with a narrow esophagus tube at the top.
      paint((x, y) => (
        inEllipse(x, y, cx + 2, cy + 2, 10, 6) ||
        (x > cx - 3 && x < cx + 1 && y > cy - 8 && y < cy - 1)
      ))
      break
    default:
      return null // 'wholebody' has no fixed silhouette — see buildWholeBodyGrid
  }
  return mask
}

const ORGAN_MASK_CACHE = {}
function getOrganMask(zoneId) {
  if (!(zoneId in ORGAN_MASK_CACHE)) ORGAN_MASK_CACHE[zoneId] = buildOrganMask(zoneId)
  return ORGAN_MASK_CACHE[zoneId]
}

// null for 'wholebody' (stats drift over the whole grid); an organ mask otherwise.
function getTissueMaskForZone(zoneId) {
  return zoneId === 'wholebody' ? null : getOrganMask(zoneId)
}

// Pull the non-trivial condition names off a family member's record
// (skips "Khỏe mạnh" / "Chưa rõ tiền sử" style placeholders).
function memberConditionList(member) {
  const raw = member?.conditions ?? member?.medicalRecord?.conditions ?? []
  const list = Array.isArray(raw) ? raw : String(raw || '').split(',')
  return list
    .map(c => String(c || '').trim())
    .filter(Boolean)
    .filter(c => !/^(khỏe mạnh|healthy|chưa rõ tiền sử|unknown history)$/i.test(c))
}

// How much of an organ's silhouette should turn cancerous, based on how many
// (and how severe) of the member's recorded conditions relate to that organ.
function computeOrganCancerRatio(zoneId, member) {
  const pattern = ZONE_CONDITION_PATTERNS[zoneId]
  if (!pattern) return 0
  const matches = memberConditionList(member).filter(c => pattern.test(c))
  if (!matches.length) return 0
  const hasCancerTerm = matches.some(c => /ung thư|cancer/i.test(c))
  const base = hasCancerTerm ? 0.28 : 0.14
  const extra = Math.min(matches.length - 1, 3) * 0.06
  return Math.min(0.6, base + extra)
}

// Fisher-Yates shuffle (used to scatter cancer/immune cells randomly inside a shape).
function shuffledIndices(indices) {
  const arr = indices.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Organ-shaped world: the whole silhouette starts HEALTHY, then a portion is
// turned to Mutant/Cancer cells (with a defending ring of Immune cells) if the
// member has a related condition on file. Everything outside the shape is DEAD.
function buildOrganGrid(zoneId, member) {
  const mask = getOrganMask(zoneId)
  if (!mask) return buildWholeBodyGrid(member)

  const grid = new Array(GRID_W * GRID_H).fill(S.DEAD)
  const insideIdx = []
  for (let i = 0; i < grid.length; i++) {
    if (mask[i]) { grid[i] = S.HEALTHY; insideIdx.push(i) }
  }

  const cancerRatio = computeOrganCancerRatio(zoneId, member)
  if (cancerRatio > 0 && insideIdx.length) {
    const order = shuffledIndices(insideIdx)
    const cancerCount = Math.max(1, Math.round(insideIdx.length * cancerRatio))
    const immuneCount = Math.min(order.length - cancerCount, Math.round(cancerCount * 0.4))
    for (let n = 0; n < cancerCount; n++) grid[order[n]] = S.CANCER
    for (let n = cancerCount; n < cancerCount + immuneCount; n++) grid[order[n]] = S.IMMUNE
  }
  return grid
}

// "Toàn Cơ Thể" (Whole Body): no fixed silhouette — cells are scattered across
// the *entire* grid, with the mix of Healthy/Cancer/Infected/Immune driven by
// the member's overall pathology ratio (how many conditions, how severe).
function buildWholeBodyGrid(member) {
  const conditions = memberConditionList(member)
  const cancerCount = conditions.filter(c => /ung thư|cancer/i.test(c)).length
  const otherCount = Math.max(0, conditions.length - cancerCount)

  const cancer = clamp01(cancerCount * 0.09)
  const infected = otherCount > 0 ? clamp01(0.02 + otherCount * 0.04) : 0
  const immune = clamp01(0.04 + (cancerCount + otherCount) * 0.015)
  const stem = 0.02
  const healthy = clamp01(0.42 - cancer * 0.8 - infected * 0.5)
  const deadFloor = clamp01(1 - (healthy + immune + stem + infected + cancer))

  const grid = new Array(GRID_W * GRID_H).fill(S.DEAD)
  for (let i = 0; i < grid.length; i++) {
    const r = Math.random()
    let acc = healthy
    if (r < acc) { grid[i] = S.HEALTHY; continue }
    acc += immune
    if (r < acc) { grid[i] = S.IMMUNE; continue }
    acc += stem
    if (r < acc) { grid[i] = S.STEM; continue }
    acc += infected
    if (r < acc) { grid[i] = S.INFECTED; continue }
    acc += cancer
    if (r < acc) { grid[i] = S.CANCER; continue }
    void deadFloor // remainder stays S.DEAD
  }
  return grid
}

// Single entry point used to (re)generate a member's cell world for a zone.
function buildZoneGrid(zoneId, member) {
  if (zoneId === 'wholebody') return buildWholeBodyGrid(member)
  return buildOrganGrid(zoneId, member)
}

function countNeighbors(grid, x, y) {
  const counts = { [S.DEAD]: 0, [S.HEALTHY]: 0, [S.STEM]: 0, [S.IMMUNE]: 0, [S.REPAIR]: 0, [S.INFECTED]: 0, [S.CANCER]: 0 }
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      counts[grid[idx(x + dx, y + dy)]]++
    }
  }
  return counts
}

// One simulation tick — Conway-style neighbour rules extended with
// medical stats (ATP / DNA / mutation / virus load / immune power).
// `tissueMask` marks which cells count as living tissue for the *stats*
// calculation below (an organ's silhouette, or null for "Toàn Cơ Thể" =
// the whole grid) — without this, the permanent black background outside
// an organ shape would dominate the ratios and crash every stat to 0.
function stepSimulation(grid, stats, tissueMask) {
  const next = new Array(grid.length)
  const atpFactor = stats.atp / 100
  const immuneFactor = stats.immunePower / 100
  const dnaFactor = stats.dna / 100
  const mutationFactor = stats.mutation / 100
  const virusFactor = stats.virusLoad / 100

  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const i = idx(x, y)
      const cell = grid[i]
      const n = countNeighbors(grid, x, y)
      let out = cell

      switch (cell) {
        case S.DEAD: {
          // Cells outside an organ's silhouette (permanent background) never
          // revive — this keeps the pixel-art shape recognisable long-term
          // instead of slowly bleeding outward. Only applies to organ zones;
          // "Toàn Cơ Thể" has no fixed silhouette (tissueMask is null there).
          if (tissueMask && !tissueMask[i]) break
          const repairPower = n[S.REPAIR] + n[S.STEM]
          if (repairPower >= 2 && Math.random() < 0.12 + dnaFactor * 0.25) out = S.HEALTHY
          break
        }
        case S.HEALTHY: {
          // Disease only spreads from an existing Cancer/Infected neighbour — a
          // healthy pixel with no sick neighbours essentially never turns bad,
          // so a fully-healthy organ stays visually stable for a long time.
          const cancerNeighbors = n[S.CANCER]
          const infectedNeighbors = n[S.INFECTED]
          const cancerSpreadChance = cancerNeighbors > 0
            ? cancerNeighbors * (0.01 + mutationFactor * 0.05) * (1 - immuneFactor * 0.6) * (1 - dnaFactor * 0.3)
            : 0
          const infectionChance = infectedNeighbors > 0
            ? infectedNeighbors * (0.015 + virusFactor * 0.05) * (1 - immuneFactor * 0.6)
            : 0
          // Cells only die from neglect (very low ATP) — never from crowding.
          const neglectDeathChance = atpFactor < 0.3 ? (0.3 - atpFactor) * 0.15 : 0
          if (Math.random() < cancerSpreadChance) out = S.CANCER
          else if (Math.random() < infectionChance) out = S.INFECTED
          else if (Math.random() < neglectDeathChance) out = S.DEAD
          else if (n[S.IMMUNE] >= 2 && Math.random() < 0.04 * immuneFactor) out = S.IMMUNE
          else if (Math.random() < 0.004 * dnaFactor) out = S.STEM
          break
        }
        case S.INFECTED: {
          const killChance = n[S.IMMUNE] * (0.12 + immuneFactor * 0.22)
          const mutateChance = Math.max(0, 0.015 + mutationFactor * 0.06 - dnaFactor * 0.03)
          if (Math.random() < killChance) out = S.DEAD
          else if (Math.random() < mutateChance) out = S.CANCER
          break
        }
        case S.CANCER: {
          // Untreated (low immune power / high mutation), cancer mostly persists
          // and slowly recruits neighbours (see the HEALTHY case above). Good
          // stats (high immune power + DNA repair, low mutation) let the body
          // fight it back down — either killed outright or shrunk to Repair.
          const killChance = n[S.IMMUNE] * (0.04 + immuneFactor * 0.12)
          const shrinkChance = (dnaFactor > 0.7 && mutationFactor < 0.2) ? 0.01 * dnaFactor : 0
          if (Math.random() < killChance) out = S.DEAD
          else if (Math.random() < shrinkChance) out = S.REPAIR
          break
        }
        case S.IMMUNE: {
          const target = n[S.INFECTED] + n[S.CANCER]
          if (target === 0 && Math.random() < 0.05) out = S.HEALTHY
          break
        }
        case S.STEM: {
          if (Math.random() < 0.03) out = S.HEALTHY
          break
        }
        case S.REPAIR: {
          if (Math.random() < 0.06) out = S.HEALTHY
          break
        }
        default:
          out = cell
      }
      next[i] = out
    }
  }

  // Aggregate population ratios -> drift global stats
  const total = next.length
  const pop = { [S.DEAD]: 0, [S.HEALTHY]: 0, [S.STEM]: 0, [S.IMMUNE]: 0, [S.REPAIR]: 0, [S.INFECTED]: 0, [S.CANCER]: 0 }
  for (let i = 0; i < total; i++) pop[next[i]]++

  let statsPop = pop
  let statsArea = total
  if (tissueMask) {
    statsPop = { [S.DEAD]: 0, [S.HEALTHY]: 0, [S.STEM]: 0, [S.IMMUNE]: 0, [S.REPAIR]: 0, [S.INFECTED]: 0, [S.CANCER]: 0 }
    statsArea = 0
    for (let i = 0; i < total; i++) {
      if (!tissueMask[i]) continue
      statsPop[next[i]]++
      statsArea++
    }
  }
  const r = (t) => (statsArea > 0 ? statsPop[t] / statsArea : 0)

  const nextStats = {
    atp: clamp(stats.atp + (r(S.HEALTHY) * 40 - stats.atp * 0.05) * 0.5),
    dna: clamp(stats.dna + r(S.STEM) * 60 - r(S.CANCER) * 20 - (stats.dna - 60) * 0.01),
    mutation: clamp(stats.mutation + r(S.CANCER) * 18 + r(S.INFECTED) * 6 - stats.dna * 0.02 - stats.immunePower * 0.015 - 0.1),
    virusLoad: clamp(stats.virusLoad + r(S.INFECTED) * 20 - stats.immunePower * 0.05 - r(S.IMMUNE) * 10 - 0.1),
    stress: clamp(stats.stress + r(S.DEAD) * 8 - r(S.HEALTHY) * 4 - (stats.stress - 25) * 0.02),
    immunePower: clamp(stats.immunePower + r(S.IMMUNE) * 25 + (r(S.CANCER) + r(S.INFECTED)) * 8 - (stats.immunePower - 40) * 0.015),
  }

  return { grid: next, stats: nextStats, pop, total }
}

function defaultUserState(zoneId = 'liver', member = null) {
  const zone = zoneId || 'liver'
  return {
    version: 2,
    grid: buildZoneGrid(zone, member),
    stats: { atp: 62, dna: 70, mutation: 12, virusLoad: 8, stress: 25, immunePower: 55 },
    gems: 600,
    lastTick: Date.now(),
    missionsDate: todayKey(),
    missionsDone: {},
    bossIndex: 0,
    bossHp: BOSSES[0].maxHp,
    zone,
    coachNote: null,
    ticks: 0,
  }
}

// `uuid` là field nhận diện thống nhất cho mọi loại user (guest hay đã đăng nhập) —
// dùng làm khóa lưu trữ trong IndexedDB, giống pattern của healthJourneyStorage.js,
// để dữ liệu Medical Cell Engine của mỗi người được tách riêng và lưu lâu dài
// (IndexedDB không có giới hạn ~5MB như localStorage, và không bị mất khi dọn cache trình duyệt
// aggressively như localStorage đôi khi bị).
const makeUserId = (user) => {
  const raw = user?.uuid || 'guest'
  return raw.toString().trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-') || 'guest'
}

// ─── In-memory cache + IndexedDB persistence ─────────────────────────────────
// IndexedDB chỉ có API bất đồng bộ, nhưng component cần đọc/ghi state đồng bộ
// trong tick loop (setInterval mỗi 2.2s) và trong các onClick (mua item, hoàn
// thành nhiệm vụ). Giải pháp: giữ 1 bản cache trong RAM (`memDb`) làm "nguồn sự
// thật" trong lúc trang đang chạy, đọc/ghi cache này luôn đồng bộ, còn việc ghi
// xuống IndexedDB chạy nền (fire-and-forget) qua persist(). Khi panel vừa mount,
// cache được "hydrate" (nạp) từ IndexedDB một lần bằng hydrate().
let memDb = null
let hydrated = false
let hydratePromise = null

function hydrate() {
  if (hydratePromise) return hydratePromise
  hydratePromise = (async () => {
    try {
      const stored = await getSetting(DB_KEY)
      memDb = (stored && typeof stored === 'object' && stored.users) ? stored : { users: {} }
    } catch {
      memDb = { users: {} }
    }
    hydrated = true
    return memDb
  })()
  return hydratePromise
}

function persist() {
  // Tránh ghi đè dữ liệu thật bằng dữ liệu mặc định tạm khi chưa hydrate xong
  // (cùng loại bug đã gặp và fix ở healthJourneyStorage.js).
  if (!hydrated || !memDb) return
  setSetting(DB_KEY, memDb).catch((e) => console.warn('[MyRewardHealth] IndexedDB write failed', e))
}

// `compositeKey` is `${userId}::${familyMemberId}` so every family member gets
// their own separate cell world (grid, boss, gems, missions...). `legacyUserId`
// lets a member's *own* pre-existing world (saved before this feature existed,
// under the plain userId key) carry over instead of being silently reset.
function getUserState(compositeKey, zoneId, member, legacyUserId) {
  if (!memDb) memDb = { users: {} }
  const existing = memDb.users[compositeKey]
  if (existing?.grid?.length === GRID_W * GRID_H) return existing

  const legacy = legacyUserId ? memDb.users[legacyUserId] : null
  if (member?.relation === 'self' && legacy?.grid?.length === GRID_W * GRID_H) {
    const migrated = { ...legacy, zone: zoneId || legacy.zone || 'liver' }
    memDb.users[compositeKey] = migrated
    return migrated
  }

  const fresh = defaultUserState(zoneId, member)
  memDb.users[compositeKey] = fresh
  return fresh
}

function saveUserState(compositeKey, state) {
  if (!memDb) memDb = { users: {} }
  memDb.users[compositeKey] = state
  persist()
}

function formatElapsed(seconds) {
  if (seconds < 60) return `${Math.round(seconds)} giây`
  if (seconds < 3600) return `${Math.round(seconds / 60)} phút`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} giờ`
  return `${(seconds / 86400).toFixed(1)} ngày`
}

function buildCoachNote(stats, pop, total, bossName) {
  const healthyPct = Math.round((pop?.[S.HEALTHY] || 0) / total * 100)
  const lines = []
  lines.push(`Cơ thể bạn hiện có ${healthyPct}% tế bào khỏe mạnh, ATP ở mức ${Math.round(stats.atp)}%.`)
  if (stats.mutation > 45) lines.push(`⚠️ Tỉ lệ đột biến đang cao (${Math.round(stats.mutation)}%) — hãy dùng DNA Repair Kit hoặc hoàn thành nhiệm vụ "Ăn đủ rau xanh".`)
  else if (stats.virusLoad > 45) lines.push(`⚠️ Tải lượng virus cao (${Math.round(stats.virusLoad)}%) — nên dùng Antiviral/Antibiotic để hỗ trợ tế bào miễn dịch.`)
  else if (stats.stress > 55) lines.push(`😮‍💨 Mức stress khá cao (${Math.round(stats.stress)}%) — thử nhiệm vụ "Thiền 10 phút" hoặc "Ngủ đủ 7 tiếng".`)
  else lines.push(`✅ Các chỉ số đang ổn định. Tiếp tục duy trì thói quen lành mạnh để đẩy lùi ${bossName}.`)
  return lines.join(' ')
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Component                                                             */
/* ────────────────────────────────────────────────────────────────────── */

export default function MyRewardHealthPanel({ onNext, nextLabel, onPrev, prevLabel }) {
  const { theme } = useApp()
  const { user } = useAuth()
  const isDark = theme !== 'light'
  const userId = useMemo(() => makeUserId(user), [user])

  const [ready, setReady] = useState(false)
  const [state, setState] = useState(() => defaultUserState())
  const [running, setRunning] = useState(true)
  const [activeShopTab, setActiveShopTab] = useState('nutrition')
  const [offlineSummary, setOfflineSummary] = useState(null)
  const [toast, setToast] = useState(null)
  const canvasRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  /* ── Family member viewer (banner combobox) ──────────────────────────
     Each family member gets their own cell world: grid shape (organ
     silhouette or whole-body distribution), boss, gems, missions — all
     keyed by `${userId}::${familyMemberId}` below. */
  const familyOwnerId = user?.uuid || 'guest'
  const familyMembers = useMemo(
    () => (loadFamilyMembers(FAMILY_TREE_PATIENT_ID, familyOwnerId) || DEFAULT_FAMILY_MEMBERS),
    [familyOwnerId]
  )
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState('')
  useEffect(() => {
    if (!familyMembers.some(m => m.id === selectedFamilyMemberId)) {
      const selfMember = familyMembers.find(m => m.relation === 'self')
      setSelectedFamilyMemberId(selfMember?.id || familyMembers[0]?.id || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyMembers])
  const selectedMember = familyMembers.find(m => m.id === selectedFamilyMemberId) || null
  const storageKey = selectedFamilyMemberId ? `${userId}::${selectedFamilyMemberId}` : ''
  const storageKeyRef = useRef(storageKey)
  storageKeyRef.current = storageKey

  const boss = BOSSES[state.bossIndex % BOSSES.length]

  /* Hydrate from IndexedDB (per user UUID + family member), then run offline fast-forward */
  useEffect(() => {
    if (!storageKey) return undefined
    let cancelled = false
    setReady(false)
    setOfflineSummary(null)
    hydrate().then(() => {
      if (cancelled) return
      const loaded = getUserState(storageKey, 'liver', selectedMember, userId)
      const elapsedSec = (Date.now() - (loaded.lastTick || Date.now())) / 1000

      if (elapsedSec > 20) {
        const cappedSec = Math.min(elapsedSec, 14 * 86400) // cap at 14 days
        const simTicks = Math.min(Math.floor(cappedSec / 20), 400) // ~1 tick per 20s offline, capped
        let grid = loaded.grid
        let stats = loaded.stats
        let pop = null
        let total = grid.length
        const tissueMask = getTissueMaskForZone(loaded.zone)
        const beforeHealthy = grid.filter(c => c === S.HEALTHY).length
        for (let t = 0; t < simTicks; t++) {
          const res = stepSimulation(grid, stats, tissueMask)
          grid = res.grid; stats = res.stats; pop = res.pop; total = res.total
        }
        const afterHealthy = pop ? pop[S.HEALTHY] : beforeHealthy
        const recovered = Math.max(0, afterHealthy - beforeHealthy) * 2341 // scale to feel "millions of cells" like the design doc
        const summary = {
          elapsedLabel: formatElapsed(elapsedSec),
          recovered,
          atpDelta: Math.round(stats.atp - loaded.stats.atp),
          mutationDelta: Math.round(stats.mutation - loaded.stats.mutation),
          immuneDelta: Math.round(stats.immunePower - loaded.stats.immunePower),
        }
        const newState = { ...loaded, grid, stats, lastTick: Date.now(), ticks: (loaded.ticks || 0) + simTicks }
        setState(newState)
        saveUserState(storageKey, newState)
        setOfflineSummary(summary)
      } else {
        setState(loaded)
      }
      setReady(true)
    })
    return () => { cancelled = true }
  }, [storageKey])

  /* Reset daily missions if the day rolled over */
  useEffect(() => {
    if (!ready) return
    if (state.missionsDate !== todayKey()) {
      setState(prev => {
        const next = { ...prev, missionsDate: todayKey(), missionsDone: {} }
        saveUserState(storageKeyRef.current, next)
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  /* Main tick loop — "Conway Update" */
  useEffect(() => {
    if (!running || !ready) return undefined
    const id = setInterval(() => {
      setState(prev => {
        const { grid, stats, pop, total } = stepSimulation(prev.grid, prev.stats, getTissueMaskForZone(prev.zone))
        const bossDmg = Math.round((pop[S.IMMUNE] * 1.2) + (prev.stats.atp > 60 ? 4 : 0))
        let bossHp = prev.bossHp - bossDmg
        let bossIndex = prev.bossIndex
        let gems = prev.gems + 1
        let toastMsg = null
        if (bossHp <= 0) {
          gems += 300
          bossIndex = (prev.bossIndex + 1) % BOSSES.length
          bossHp = BOSSES[bossIndex].maxHp
          toastMsg = `🏆 Đã đẩy lùi ${BOSSES[(prev.bossIndex) % BOSSES.length].nameVi}! +300 Gem`
        }
        const next = {
          ...prev, grid, stats, gems, bossHp, bossIndex,
          lastTick: Date.now(), ticks: (prev.ticks || 0) + 1,
        }
        saveUserState(storageKeyRef.current, next)
        if (toastMsg) setToast(toastMsg)
        return next
      })
    }, 2200)
    return () => clearInterval(id)
  }, [running, ready])

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  /* Draw canvas whenever grid changes */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const cell = state.grid[idx(x, y)]
        if (cell === S.DEAD) continue
        ctx.fillStyle = CELL_META[cell].color
        ctx.fillRect(x * CELL_PX + 1, y * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2)
      }
    }
  }, [state.grid])

  const popCounts = useMemo(() => {
    const c = { [S.DEAD]: 0, [S.HEALTHY]: 0, [S.STEM]: 0, [S.IMMUNE]: 0, [S.REPAIR]: 0, [S.INFECTED]: 0, [S.CANCER]: 0 }
    state.grid.forEach(v => { c[v]++ })
    return c
  }, [state.grid])
  const totalCells = state.grid.length
  const pct = (t) => Math.round((popCounts[t] / totalCells) * 100)

  const coachNote = useMemo(
    () => buildCoachNote(state.stats, popCounts, totalCells, boss.nameVi),
    [state.stats, popCounts, totalCells, boss.nameVi]
  )

  const applyEffect = useCallback((effect = {}) => {
    setState(prev => {
      const stats = { ...prev.stats }
      Object.entries(effect).forEach(([k, v]) => { stats[k] = clamp(stats[k] + v) })
      return { ...prev, stats }
    })
  }, [])

  const completeMission = useCallback((mission) => {
    setState(prev => {
      if (prev.missionsDone[mission.id]) return prev
      const stats = { ...prev.stats }
      Object.entries(mission.effect || {}).forEach(([k, v]) => { stats[k] = clamp(stats[k] + v) })
      const next = {
        ...prev,
        stats,
        gems: prev.gems + mission.gems,
        missionsDone: { ...prev.missionsDone, [mission.id]: true },
      }
      saveUserState(storageKeyRef.current, next)
      return next
    })
    setToast(`✅ ${mission.label} · +${mission.gems} Gem`)
  }, [])

  const buyItem = useCallback((item) => {
    setState(prev => {
      if (prev.gems < item.cost) return prev
      let grid = prev.grid
      const stats = { ...prev.stats }
      Object.entries(item.effect || {}).forEach(([k, v]) => { stats[k] = clamp(stats[k] + v) })

      const replaceRandom = (fromPredicate, toState, count) => {
        const candidates = []
        grid.forEach((c, i) => { if (fromPredicate(c)) candidates.push(i) })
        for (let n = 0; n < count && candidates.length; n++) {
          const pick = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0]
          grid = grid.slice()
          grid[pick] = toState
        }
      }

      if (item.killInfected) replaceRandom(c => c === S.INFECTED, S.DEAD, item.killInfected)
      if (item.reviveDead) replaceRandom(c => c === S.DEAD, S.HEALTHY, item.reviveDead)
      if (item.spawnImmune) replaceRandom(c => c === S.HEALTHY || c === S.DEAD, S.IMMUNE, item.spawnImmune)
      if (item.spawnStem) replaceRandom(c => c === S.DEAD, S.STEM, item.spawnStem)
      if (item.spawnCancerToRepair) replaceRandom(c => c === S.CANCER, S.REPAIR, item.spawnCancerToRepair)

      const next = {
        ...prev,
        grid,
        stats,
        gems: prev.gems - item.cost,
        coachNote: item.coach ? buildCoachNote(stats, prev.pop, totalCells, boss.nameVi) : prev.coachNote,
      }
      saveUserState(storageKeyRef.current, next)
      return next
    })
    setToast(`🛒 Đã dùng ${item.name}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boss.nameVi, totalCells])

  // Switching zone reshapes the current member's cell world into that organ's
  // pixel-art silhouette (or the whole-body distribution), based on their
  // recorded pathology — boss/gems/missions carry over unchanged.
  const setZone = (id) => setState(prev => {
    if (prev.zone === id) return prev
    const grid = buildZoneGrid(id, selectedMember)
    const next = { ...prev, zone: id, grid }
    saveUserState(storageKeyRef.current, next)
    return next
  })

  /* ── Theme tokens (mirrors Sidebar.jsx palette) ─────────────────────── */
  const bg      = isDark ? 'rgba(10,14,26,0.9)'    : 'rgba(255,255,255,0.95)'
  const card    = isDark ? 'rgba(255,255,255,0.03)': 'rgba(0,0,0,0.02)'
  const border  = isDark ? 'rgba(255,255,255,0.08)': 'rgba(0,0,0,0.08)'
  const text    = isDark ? '#e8f0f8' : '#1a2035'
  const text2   = isDark ? 'rgba(232,240,248,0.6)' : '#666'
  const cyan    = '#00e5ff'
  const gold    = '#ffb74d'

  const cardStyle = { background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }

  if (!ready) {
    return (
      <div className="animate-fade" style={{ padding: '60px 20px', maxWidth: 1180, margin: '0 auto', color: text, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🧬</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.1em', color: cyan }}>ĐANG NẠP THẾ GIỚI TẾ BÀO TỪ INDEXEDDB...</div>
      </div>
    )
  }

  return (
    <div className="animate-fade" style={{ padding: '20px 20px 40px', maxWidth: 1180, margin: '0 auto', color: text, fontFamily: 'inherit' }}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(0,229,255,0.10), rgba(156,111,255,0.08))', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', color: cyan, fontFamily: 'monospace', fontWeight: 700 }}>MY REWARD HEALTH · MEDICAL CELL ENGINE</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>Thế giới tế bào của bạn chạy 24/7</div>
            <div style={{ fontSize: 13, color: text2, marginTop: 4, maxWidth: 560 }}>
              Mô phỏng lấy cảm hứng từ Conway's Game of Life (như copy.sh/life) — mỗi thói quen lành mạnh bạn hoàn thành sẽ thay đổi thế giới tế bào bên trong cơ thể bạn.
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10,
              padding: '8px 12px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: 10, maxWidth: 560,
            }}>
              <span style={{ fontSize: 14 }}>🌳</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: cyan }}>Từ Gia phả</span>
              <span style={{ fontSize: 12, color: text2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Đang xem hồ sơ thành viên gia đình:
                <select
                  value={selectedFamilyMemberId}
                  onChange={e => setSelectedFamilyMemberId(e.target.value)}
                  style={{
                    padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(0,229,255,0.3)',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: cyan,
                    fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  {familyMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{RELATION_META[m.relation]?.label?.vi ? ` (${RELATION_META[m.relation].label.vi})` : ''}
                    </option>
                  ))}
                </select>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ textAlign: 'center', padding: '8px 14px', background: card, border: `1px solid ${border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: gold }}>💎 {state.gems}</div>
              <div style={{ fontSize: 9, color: text2, letterSpacing: '0.1em' }}>GEM</div>
            </div>
            <button
              onClick={() => setRunning(r => !r)}
              style={{
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 12,
                border: `1px solid ${running ? 'rgba(0,230,118,0.4)' : border}`,
                background: running ? 'rgba(0,230,118,0.12)' : card,
                color: running ? '#00e676' : text2,
              }}
            >
              {running ? '⏸ Tạm dừng Engine' : '▶ Chạy Engine'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Offline fast-forward summary ────────────────────────────── */}
      {offlineSummary && (
        <div style={{ ...cardStyle, borderColor: 'rgba(0,229,255,0.35)', marginBottom: 16, position: 'relative' }}>
          <button onClick={() => setOfflineSummary(null)} aria-label="Đóng" style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: text2, cursor: 'pointer', fontSize: 16 }}>✕</button>
          <div style={{ fontWeight: 800, color: cyan, marginBottom: 8 }}>🕓 Mô phỏng khi bạn offline {offlineSummary.elapsedLabel}</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: text2, lineHeight: 1.9 }}>
            <li>{offlineSummary.recovered.toLocaleString('vi-VN')} tế bào đã phục hồi</li>
            <li>ATP {offlineSummary.atpDelta >= 0 ? '+' : ''}{offlineSummary.atpDelta}%</li>
            <li>Miễn dịch {offlineSummary.immuneDelta >= 0 ? '+' : ''}{offlineSummary.immuneDelta}%</li>
            <li>Đột biến {offlineSummary.mutationDelta >= 0 ? '+' : ''}{offlineSummary.mutationDelta}%</li>
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16 }} className="myrh-grid">
        <style>{`
          @media (max-width: 900px) { .myrh-grid { grid-template-columns: 1fr !important; } }
        `}</style>

        {/* ── Left column: world map + tick engine ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontWeight: 800 }}>🌍 Thế giới tế bào (Conway Medical Engine)</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {ZONES.map(z => (
                  <button key={z.id} onClick={() => setZone(z.id)} style={{
                    fontSize: 11, padding: '5px 9px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${state.zone === z.id ? 'rgba(0,229,255,0.5)' : border}`,
                    background: state.zone === z.id ? 'rgba(0,229,255,0.12)' : 'transparent',
                    color: state.zone === z.id ? cyan : text2, fontWeight: 600,
                  }}>{z.icon} {z.nameVi}</button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${border}`, background: '#05070f' }}>
              <canvas ref={canvasRef} width={GRID_W * CELL_PX} height={GRID_H * CELL_PX} style={{ display: 'block', width: '100%', height: 'auto', imageRendering: 'pixelated' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 11, color: text2 }}>
              {Object.entries(CELL_META).filter(([k]) => k !== String(S.DEAD)).map(([k, meta]) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: meta.color, display: 'inline-block' }} />
                  {meta.labelVi} {pct(Number(k))}%
                </span>
              ))}
            </div>
          </div>

          {/* Boss / threat bar */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800 }}>{boss.icon} BOSS: {boss.nameVi}</div>
              <div style={{ fontSize: 12, color: text2, fontFamily: 'monospace' }}>{Math.max(0, state.bossHp).toLocaleString('vi-VN')} / {boss.maxHp.toLocaleString('vi-VN')}</div>
            </div>
            <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${clamp((state.bossHp / boss.maxHp) * 100)}%`, background: 'linear-gradient(90deg, #ff5252, #e040fb)', transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 11, color: text2, marginTop: 6 }}>Tế bào miễn dịch của bạn tự động tấn công boss mỗi lượt Conway Update. Mua thêm Immune items để tăng sát thương.</div>
          </div>

          {/* Tick schedule */}
          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>⏱️ Tick Engine — Chu kỳ xử lý</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: 8 }}>
              {TICK_SCHEDULE.map(t => (
                <div key={t.sub} style={{ textAlign: 'center', padding: '10px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 16 }}>{t.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: text2 }}>{t.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: text2, marginTop: 10 }}>
              Engine mô phỏng khoảng 2.2 giây/lượt khi bạn mở màn hình này, và tự "tua nhanh" (fast-forward) khi bạn quay lại sau khi offline — giống mô tả trong Living Medical World Engine.
            </div>
          </div>
        </div>

        {/* ── Right column: stats, AI coach, missions, shop ──────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stats HUD */}
          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>📊 Chỉ số sinh học</div>
            <StatBar label="ATP" value={state.stats.atp} color="#00e676" text2={text2} border={border} />
            <StatBar label="DNA Integrity" value={state.stats.dna} color="#29b6f6" text2={text2} border={border} />
            <StatBar label="Immune Power" value={state.stats.immunePower} color="#9c6fff" text2={text2} border={border} />
            <StatBar label="Mutation" value={state.stats.mutation} color="#e040fb" text2={text2} border={border} inverse />
            <StatBar label="Virus Load" value={state.stats.virusLoad} color="#ff5252" text2={text2} border={border} inverse />
            <StatBar label="Stress" value={state.stats.stress} color="#ffb74d" text2={text2} border={border} inverse />
          </div>

          {/* AI Coach */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,229,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
              <div style={{ fontWeight: 800 }}>AI Coach</div>
            </div>
            <div style={{ fontSize: 13, color: text2, lineHeight: 1.7 }}>{state.coachNote || coachNote}</div>
          </div>

          {/* Daily missions */}
          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>✅ Nhiệm vụ hôm nay</div>
            {DAILY_MISSIONS.map(m => {
              const done = !!state.missionsDone[m.id]
              return (
                <button
                  key={m.id}
                  disabled={done}
                  onClick={() => completeMission(m)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 10px', marginBottom: 6, borderRadius: 10, cursor: done ? 'default' : 'pointer',
                    border: `1px solid ${done ? 'rgba(0,230,118,0.35)' : border}`,
                    background: done ? 'rgba(0,230,118,0.08)' : 'rgba(255,255,255,0.02)',
                    color: text, textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{done ? '✅' : m.icon}</span>
                  <span style={{ flex: 1, fontSize: 12.5 }}>{m.label}</span>
                  <span style={{ fontSize: 11, color: gold, fontWeight: 700 }}>+{m.gems} 💎</span>
                </button>
              )
            })}
          </div>

          {/* Shop */}
          <div style={cardStyle}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>🛒 Medical Shop</div>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', marginBottom: 10, paddingBottom: 4 }}>
              {SHOP_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveShopTab(cat.id)} style={{
                  flexShrink: 0, fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
                  border: `1px solid ${activeShopTab === cat.id ? 'rgba(0,229,255,0.5)' : border}`,
                  background: activeShopTab === cat.id ? 'rgba(0,229,255,0.12)' : 'transparent',
                  color: activeShopTab === cat.id ? cyan : text2,
                }}>{cat.icon} {cat.label}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {SHOP_CATEGORIES.find(c => c.id === activeShopTab)?.items.map(item => {
                const affordable = state.gems >= item.cost
                return (
                  <button
                    key={item.id}
                    disabled={!affordable}
                    onClick={() => buyItem(item)}
                    title={item.name}
                    style={{
                      padding: 10, borderRadius: 10, textAlign: 'left', cursor: affordable ? 'pointer' : 'not-allowed',
                      border: `1px solid ${border}`, background: 'rgba(255,255,255,0.02)', opacity: affordable ? 1 : 0.45,
                      color: text, fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: 20 }}>{item.icon}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: gold, marginTop: 2 }}>💎 {item.cost}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 400,
          padding: '10px 18px', borderRadius: 99, background: isDark ? 'rgba(10,14,26,0.95)' : '#1a2035',
          color: '#fff', fontSize: 13, fontWeight: 600, border: `1px solid ${border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        }}>{toast}</div>
      )}

      <NavButtons onNext={onNext} nextLabel={nextLabel} onPrev={onPrev} prevLabel={prevLabel} style={{ marginTop: 24 }} />
    </div>
  )
}

function StatBar({ label, value, color, text2, border, inverse }) {
  const v = Math.round(value)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
        <span style={{ color: text2 }}>{label}{inverse ? ' (thấp = tốt)' : ''}</span>
        <span style={{ fontWeight: 700 }}>{v}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${v}%`, background: color, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}
