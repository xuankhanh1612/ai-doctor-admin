import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAllRecords, saveRecord, detectFileType, fileToBase64, fileToDataUrl } from '../../lib/medicalStorage.js';
import { notifyUpload } from '../../hooks/useMedicalData.js';
import { buildImageConvertedInBodyRecord, recordsToInBodyCsv } from '../../lib/inbodyCsv.js';
import {
  analyzeInBodyWithAI,
  convertInBodyImageToCsv,
  fileToBase64Promise,
  parseGroqInBodyJson,
  extractPdfTextForInBody,
  pdfPageToImageForInBody,
  INBODY_OCR_SYSTEM_PROMPT,
} from '../../lib/inbodyImageConvert.js';
import { ensureBrowserSafeImage } from '../../lib/heicConvert.js';
import standardInBodyCsv from '../DataInBody/InBody-20260508 3.csv?raw';
import aiClinicInBodyRef from '../DataInBody/AIClinicInBody.PNG';
import inBodyChartRef from '../DataInBody/IMG_2635.PNG';
import khanhInBodyRef from '../DataInBody/KhanhInBody.JPG';
import rankingFriendsRef from '../DataInBody/IMG_2651.PNG';
import rankingConnectRef from '../DataInBody/IMG_2652.PNG';
import rankingWeightRef from '../DataInBody/IMG_2653.PNG';
import rankingTotalRef from '../DataInBody/IMG_2654.PNG';
import rankingDeviceRef from '../DataInBody/IMG_2655.PNG';
import rankingScoreDailyRef from '../DataInBody/IMG_2656.PNG';
import rankingFatDailyRef from '../DataInBody/IMG_2657.PNG';
import challengeRoadMapRef from '../DataInBody/RoadMap.png';
import challengeJourneyRef from '../DataInBody/HanhTrinh3.png';
import inbodyAppHealthTrackerUrl from '../inbody_app_health_tracker.html?url';

const APPLE_HEALTH_STORAGE_KEY = 'ai_doctor_apple_health_days';

// ─── Gamification engine ────────────────────────────────────────────────────
function calcXP(records) {
  let xp = 0;
  records.forEach((r, i) => {
    xp += 50; // base scan XP
    if (i > 0) {
      const prev = records[i - 1];
      if (r.muscle > prev.muscle) xp += Math.round((r.muscle - prev.muscle) * 100);
      if (r.fat < prev.fat) xp += Math.round((prev.fat - r.fat) * 80);
    }
  });
  return xp;
}

function calcLevel(xp) {
  // Level thresholds: 0,100,250,500,900,1400,2000,2800,3800,5000...
  const thresholds = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000, 7000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  const current = thresholds[Math.min(level - 1, thresholds.length - 1)];
  const next = thresholds[Math.min(level, thresholds.length - 1)];
  const progress = next > current ? Math.round(((xp - current) / (next - current)) * 100) : 100;
  return { level, xp, current, next, progress };
}

function getAchievements(records) {
  const latest = records[records.length - 1];
  const first = records[0];
  const muscleGain = latest ? latest.muscle - first.muscle : 0;
  const fatLoss = first ? first.fat - latest.fat : 0;

  return [
    { id: 'first_scan', icon: '🏅', name: 'Scan đầu tiên', unlocked: records.length >= 1 },
    { id: 'muscle_05', icon: '💪', name: '+0.5kg cơ', unlocked: muscleGain >= 0.5 },
    { id: 'fat_1', icon: '🔥', name: 'Giảm 1% mỡ', unlocked: fatLoss >= 1 },
    { id: 'fat_5', icon: '🏆', name: 'Giảm 5% mỡ', unlocked: fatLoss >= 5 },
    { id: 'muscle_5', icon: '⚡', name: 'Cơ 35kg+', unlocked: latest?.muscle >= 35 },
    { id: 'water_60', icon: '🌊', name: 'Nước > 60%', unlocked: latest?.water >= 60 },
    { id: 'level10', icon: '👑', name: 'Level 10', unlocked: calcLevel(calcXP(records)).level >= 10 },
    { id: 'scan10', icon: '🎯', name: '10 lần scan', unlocked: records.length >= 10 },
  ];
}

function getActiveQuests(records) {
  const latest = records[records.length - 1];
  if (!latest) return [];
  const prev = records[records.length - 2];
  return [
    {
      id: 'muscle_quest',
      icon: '🏋️',
      name: 'Tăng 1kg cơ bắp',
      desc: 'Đo InBody lần tiếp theo sau 30 ngày tập',
      progress: prev ? Math.min(100, Math.round(((latest.muscle - prev.muscle) / 1) * 100)) : 0,
      reward: 150,
      color: '#378ADD',
    },
    {
      id: 'fat_quest',
      icon: '🔥',
      name: 'Giảm mỡ xuống 20%',
      desc: `Mỡ hiện tại ${latest.fat}% → mục tiêu 20%`,
      progress: Math.min(100, Math.round(((latest.fat - 20) / (latest.fat - 20 + 5)) * 100)),
      reward: 200,
      color: '#D85A30',
    },
    {
      id: 'water_quest',
      icon: '💧',
      name: 'Duy trì nước > 53%',
      desc: 'Uống đủ nước trong 14 ngày liên tiếp',
      progress: latest.water >= 53 ? 85 : 30,
      reward: 80,
      color: '#1D9E75',
    },
  ];
}

// ─── AI Analysis — imported from shared lib ───────────────────────────────────
// analyzeInBodyWithAI, convertInBodyImageToCsv, extractDateFromInBodyImage,
// parseGroqInBodyJson, INBODY_OCR_SYSTEM_PROMPT are all in ../../lib/inbodyImageConvert.js

const STANDARD_INBODY_FILE = 'InBody-20260508 3.csv';
const INBODY_REFERENCE_IMAGES = [
  { src: aiClinicInBodyRef, label: 'AIClinicInBody.PNG' },
  { src: inBodyChartRef, label: 'IMG_2635.PNG' },
  { src: khanhInBodyRef, label: 'KhanhInBody.JPG' },
];

const RANKING_REFERENCE_IMAGES = [
  { src: rankingFriendsRef, label: 'Bạn bè · IMG_2651.PNG' },
  { src: rankingConnectRef, label: 'Kết bạn · IMG_2652.PNG' },
  { src: rankingWeightRef, label: 'Cân nặng của tôi · IMG_2653.PNG' },
  { src: rankingTotalRef, label: 'Tổng · IMG_2654.PNG' },
  { src: rankingDeviceRef, label: 'Cùng thiết bị · IMG_2655.PNG' },
  { src: rankingScoreDailyRef, label: 'Điểm hằng ngày · IMG_2656.PNG' },
  { src: rankingFatDailyRef, label: 'Tỷ lệ mỡ hằng ngày · IMG_2657.PNG' },
];

const RANKING_GROUPS = [
  {
    id: 'total',
    label: 'Tổng',
    info: 'Dựa trên tất cả các báo cáo sức khỏe của người dùng InBody trên cùng một quốc gia. Bảng xếp hạng tuần cài lại lúc 00:00 thứ hai, hằng ngày cài lại lúc 00:00 mỗi ngày.',
    title: 'Xếp hạng điểm InBody hằng tuần',
    rows: [
      { rank: 1, name: 'Kathy', value: '137Điểm' },
      { rank: 2, name: '4444', value: '119Điểm' },
      { rank: 3, name: '3118', value: '114Điểm' },
      { rank: 4, name: 'jonah5663', value: '111Điểm' },
      { rank: 4, name: '6899', value: '111Điểm' },
      { rank: 6, name: 'FattyBoyz', value: '110Điểm' },
      { rank: 7, name: '0962', value: '109Điểm' },
    ],
  },
  {
    id: 'device',
    label: 'Cùng thiết bị',
    info: 'Dựa trên các báo cáo về sức khỏe của những người dùng cùng loại thiết bị chuyên nghiệp. Nếu chưa có dữ liệu tuần này, hệ thống nhắc người dùng kiểm tra InBody tại cơ sở chuyên nghiệp.',
    title: 'Xếp hạng điểm InBody hằng ngày',
    empty: 'Hôm nay không có kết quả từ cuộc kiểm tra InBody. Hãy đi kiểm tra InBody tại một cơ sở chuyên nghiệp ngay bây giờ và kiểm tra xếp hạng của bạn!',
    rows: [],
  },
  {
    id: 'weight',
    label: 'Cân nặng của tôi',
    info: 'Dựa trên thiết bị chuyên dụng, báo cáo sức khỏe của người dùng có cân nặng giống bạn. Kết quả có thể mất khoảng 10 phút để phản ánh vào bảng xếp hạng.',
    title: 'Xếp hạng điểm InBody hằng tuần',
    rows: [
      { rank: 1, name: 'Kathy', value: '137Điểm' },
      { rank: 2, name: 'JIA', value: '95Điểm', photo: true },
      { rank: 2, name: '8418', value: '95Điểm' },
      { rank: 4, name: '5254', value: '94Điểm' },
      { rank: 4, name: '4396', value: '94Điểm' },
      { rank: 6, name: 'Tim', value: '93Điểm' },
      { rank: 6, name: 'High', value: '93Điểm', photo: true },
    ],
  },
  {
    id: 'friends',
    label: 'Bạn bè',
    info: 'Xếp hạng bạn bè trên InBody có thể đặt riêng tư hoặc công khai. Danh sách hiện có một hồ sơ của bạn và nút Kết bạn để mô phỏng luồng IMG_2651-IMG_2652.',
    title: 'Xếp hạng bạn bè trên InBody',
    friendMode: true,
    rows: [{ rank: 1, name: 'Tôi', value: '64Điểm', photo: true }],
  },
];

const DAILY_SCORE_ROWS = [
  { rank: 1, name: '8418', value: '95Điểm' },
  { rank: 2, name: '6315', value: '91Điểm' },
  { rank: 2, name: '0671', value: '91Điểm' },
  { rank: 2, name: '9844', value: '91Điểm' },
  { rank: 2, name: '7022', value: '91Điểm' },
  { rank: 6, name: '9076', value: '90Điểm' },
  { rank: 6, name: 'Carmen', value: '90Điểm', photo: true },
  { rank: 6, name: 'Subho', value: '90Điểm', photo: true },
  { rank: 10, name: '4142', value: '89Điểm' },
];

const BODY_FAT_ROWS = [
  { rank: 1, name: 'Giri', value: '5.1%' },
  { rank: 2, name: '6100', value: '6.5%' },
  { rank: 3, name: '8418', value: '6.7%' },
  { rank: 4, name: '6588', value: '6.9%' },
  { rank: 5, name: '0591', value: '7.3%' },
  { rank: 6, name: '3195', value: '8%' },
  { rank: 7, name: 'harsh@saa', value: '9.4%', photo: true },
  { rank: 8, name: '8678', value: '10.1%' },
  { rank: 9, name: 'Jerry', value: '10.6%' },
  { rank: 10, name: '3132', value: '11.9%' },
];

const CHALLENGE_PROGRAMS = [
  { icon: '🧬', name: 'Inflammation Control Program', state: 'Đang thực hiện', progress: 63, reward: '5,000 HLT', tag: 'Epic' },
  { icon: '🥗', name: 'Gut Health Optimization', state: 'Chưa bắt đầu', progress: 0, reward: '3,300 HLT', tag: 'Rare' },
  { icon: '💪', name: 'IL-6 Protein Optimization', state: 'Đang mở', progress: 18, reward: '5,000 HLT', tag: 'Epic' },
  { icon: '🌙', name: 'Longevity Support', state: 'Chưa bắt đầu', progress: 0, reward: '4,000 HLT', tag: 'Legendary' },
];

const CHALLENGE_DAILY_TASKS = [
  { icon: '🚶', name: 'Đi bộ 8,000 bước', xp: 300, done: true },
  { icon: '🧘', name: 'Thiền 15 phút', xp: 300, done: true },
  { icon: '💧', name: 'Uống đủ nước', xp: 200, done: true },
  { icon: '📚', name: 'Đọc sách 20 trang', xp: 120, done: false },
  { icon: '🍬', name: 'No Sugar Challenge', xp: 150, done: true },
  { icon: '📝', name: 'Journal Reflection', xp: 100, done: false },
];

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replace(/\ufeff/g, '').replace(',', '.').trim();
  if (!normalized || normalized === '-') return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}


const APPLE_HEALTH_METRICS = {
  HKQuantityTypeIdentifierBodyMass: { key: 'weight', mode: 'latest' },
  HKQuantityTypeIdentifierLeanBodyMass: { key: 'muscle', mode: 'latest' },
  HKQuantityTypeIdentifierBodyFatPercentage: { key: 'fat', mode: 'latest', percent: true },
  HKQuantityTypeIdentifierBodyMassIndex: { key: 'bmi', mode: 'latest' },
  HKQuantityTypeIdentifierDietaryWater: { key: 'water', mode: 'sum', water: true },
  HKQuantityTypeIdentifierStepCount: { key: 'steps', mode: 'sum' },
  HKQuantityTypeIdentifierActiveEnergyBurned: { key: 'activeEnergy', mode: 'sum' },
  HKQuantityTypeIdentifierAppleExerciseTime: { key: 'exerciseMinutes', mode: 'sum' },
  HKQuantityTypeIdentifierDistanceWalkingRunning: { key: 'distance', mode: 'sum', distance: true },
  HKQuantityTypeIdentifierHeartRate: { key: 'heartRate', mode: 'average' },
  HKQuantityTypeIdentifierRestingHeartRate: { key: 'restingHeartRate', mode: 'average' },
};

function dateKeyFromAppleHealth(value) {
  const raw = String(value || '');
  const directDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (directDate) return directDate[0];
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function normalizeAppleHealthValue(value, unit, config) {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  if (config?.percent && String(unit || '').includes('%') && parsed <= 1) return +(parsed * 100).toFixed(1);
  if (config?.water && String(unit || '').toLowerCase() === 'ml') return +(parsed / 1000).toFixed(2);
  if (config?.distance && String(unit || '').toLowerCase() === 'm') return +(parsed / 1000).toFixed(2);
  return parsed;
}

function getAppleHealthDay(dayMap, day) {
  if (!dayMap.has(day)) {
    dayMap.set(day, {
      date: day,
      sourceModule: 'apple-health',
      appleHealth: {},
      _latestAt: {},
      _average: {},
    });
  }
  return dayMap.get(day);
}

function applyAppleHealthMetric(day, key, value, mode, endDate) {
  if (value === null) return;
  if (mode === 'sum') {
    day.appleHealth[key] = +((day.appleHealth[key] || 0) + value).toFixed(2);
    return;
  }
  if (mode === 'average') {
    const avg = day._average[key] || { total: 0, count: 0 };
    avg.total += value;
    avg.count += 1;
    day._average[key] = avg;
    day.appleHealth[key] = +(avg.total / avg.count).toFixed(1);
    return;
  }
  const currentLatestAt = day._latestAt[key] || '';
  if (!currentLatestAt || String(endDate || '').localeCompare(currentLatestAt) >= 0) {
    day._latestAt[key] = String(endDate || '');
    day.appleHealth[key] = value;
  }
}

function parseAppleHealthExportXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('File XML Apple Health không hợp lệ. Hãy chọn đúng export.xml từ app Sức khỏe.');

  const dayMap = new Map();
  doc.querySelectorAll('Record').forEach((record) => {
    const type = record.getAttribute('type');
    const metric = APPLE_HEALTH_METRICS[type];
    if (!metric) return;
    const value = normalizeAppleHealthValue(record.getAttribute('value'), record.getAttribute('unit'), metric);
    const endDate = record.getAttribute('endDate') || record.getAttribute('startDate');
    const day = getAppleHealthDay(dayMap, dateKeyFromAppleHealth(endDate));
    applyAppleHealthMetric(day, metric.key, value, metric.mode, endDate);
  });

  return Array.from(dayMap.values())
    .map(({ _latestAt, _average, ...day }) => day)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeAppleHealthJson(payload) {
  const source = Array.isArray(payload) ? payload : (payload?.records || payload?.days || payload?.data || []);
  if (!Array.isArray(source)) return [];
  return source.map((entry) => ({
    date: String(entry.date || entry.day || entry.startDate || new Date().toISOString()).slice(0, 10),
    sourceModule: 'apple-health',
    appleHealth: {
      weight: parseNumber(entry.weight ?? entry.bodyMass),
      muscle: parseNumber(entry.muscle ?? entry.leanBodyMass),
      fat: normalizeAppleHealthValue(entry.fat ?? entry.bodyFatPercentage, '%', { percent: true }),
      bmi: parseNumber(entry.bmi),
      water: normalizeAppleHealthValue(entry.water ?? entry.dietaryWater, entry.waterUnit || 'L', { water: true }),
      steps: parseNumber(entry.steps ?? entry.stepCount),
      activeEnergy: parseNumber(entry.activeEnergy ?? entry.activeEnergyBurned),
      exerciseMinutes: parseNumber(entry.exerciseMinutes ?? entry.appleExerciseTime),
      distance: parseNumber(entry.distance ?? entry.distanceWalkingRunning),
      heartRate: parseNumber(entry.heartRate),
      restingHeartRate: parseNumber(entry.restingHeartRate),
    },
  })).filter(day => day.date);
}

function buildAppleHealthDashboardRecords(appleDays, fallbackRecord = {}) {
  return appleDays.map((day) => {
    const metrics = day.appleHealth || {};
    const steps = metrics.steps || 0;
    const activityScore = Math.min(20, Math.round(steps / 500));
    const exerciseScore = Math.min(10, Math.round((metrics.exerciseMinutes || 0) / 3));
    const bodyScore = metrics.fat ? Math.max(0, Math.min(20, Math.round(20 - Math.abs(metrics.fat - 22) * 0.8))) : 10;

    return {
      date: day.date,
      sourceModule: 'apple-health',
      device: 'Apple Health iPhone',
      weight: metrics.weight ?? fallbackRecord.weight ?? 0,
      muscle: metrics.muscle ?? fallbackRecord.muscle ?? fallbackRecord.skeletalMuscle ?? 0,
      skeletalMuscle: metrics.muscle ?? fallbackRecord.skeletalMuscle ?? fallbackRecord.muscle ?? 0,
      fat: metrics.fat ?? fallbackRecord.fat ?? 0,
      water: metrics.water ?? fallbackRecord.water ?? 0,
      bmi: metrics.bmi ?? fallbackRecord.bmi ?? 0,
      score: Math.min(100, Math.max(40, 50 + activityScore + exerciseScore + bodyScore)),
      appleHealth: metrics,
    };
  });
}

function mergeRecordsByDate(baseRecords, incomingRecords) {
  const merged = new Map();
  baseRecords.forEach(record => merged.set(record.date, record));
  incomingRecords.forEach(record => merged.set(record.date, { ...(merged.get(record.date) || {}), ...record }));
  return Array.from(merged.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function formatInBodyDate(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 8) return String(raw || '');
  const date = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (digits.length < 12) return date;
  return `${date} ${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
}

function decodeBase64Text(base64Data) {
  if (!base64Data) return '';
  try {
    const binary = atob(base64Data);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    try { return atob(base64Data); } catch { return ''; }
  }
}

function isSummaryAllInBodyRecord(record) {
  return record?.fileType === 'csv' && (
    record.sourceModule === 'ai-inbody-portal-summary' ||
    String(record.notes || '').includes('Summary All InBody Records') ||
    String(record.filename || '').startsWith('FullTrackInBody_')
  );
}

async function loadLatestSummaryAllInBodyRecords(ownerUuid) {
  const allRecords = await getAllRecords({ ownerUuid, includeUnowned: false });
  const summaryRecord = allRecords
    .filter(isSummaryAllInBodyRecord)
    .sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')))[0];
  if (!summaryRecord) return null;
  const csvText = summaryRecord.textContent || decodeBase64Text(summaryRecord.base64Data);
  const parsedRecords = parseInBodyCsv(csvText);
  return parsedRecords.length ? { record: summaryRecord, parsedRecords } : null;
}

function parseInBodyCsv(csvText) {
  const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(header => header.replace(/\ufeff/g, '').trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => ({ ...row, [header]: values[index] }), {});
  });

  return rows.map((row) => ({
    date: formatInBodyDate(row['ngày']),
    rawDate: String(row['ngày'] || ''),
    device: row['Thiết bị đo'] || '',
    weight: parseNumber(row['Cân nặng(kg)']),
    skeletalMuscle: parseNumber(row['Khối lượng cơ xương(kg)']),
    muscle: parseNumber(row['Khối lượng cơ xương(kg)']) ?? parseNumber(row['Khối lượng cơ(kg)']),
    bodyFatMass: parseNumber(row['Khối lượng mỡ trong cơ thể(kg)']),
    fat: parseNumber(row['Tỷ lệ mỡ cơ thể(%)']),
    bmi: parseNumber(row['BMI(kg/m²)']),
    bmr: parseNumber(row['Tỷ lệ trao đổi chất cơ bản(kcal)']),
    score: parseNumber(row['Điểm InBody']),
    water: parseNumber(row['Lượng nước trong cơ thể(L)']),
    intracellularWater: parseNumber(row['Nước nội bào(L)']),
    extracellularWater: parseNumber(row['Nước ngoại bào(L)']),
    ecwRatio: parseNumber(row['Tỷ lệ ECW']),
    visceralFatLevel: parseNumber(row['Mức độ chất béo nội tạng(Level)']),
    waistHipRatio: parseNumber(row['Tỷ lệ mỡ bụng']),
    protein: parseNumber(row['Protein(kg)']),
    minerals: parseNumber(row['Khoáng chất(kg)']),
    boneMineral: parseNumber(row['Hàm lượng khoáng trong xương(kg)']),
    bodyCellMass: parseNumber(row['Khối lượng tế bào cơ thể(kg)']),
    smi: parseNumber(row['Chỉ số khối cơ xương(kg/m²)']),
    phaseAngle: parseNumber(row['Góc pha toàn bộ cơ thể(°)']),
    rightArmMuscle: parseNumber(row['Khối lượng cơ ở cánh tay phải(kg)']),
    leftArmMuscle: parseNumber(row['Khối lượng cơ ở cánh tay trái(kg)']),
    trunkMuscle: parseNumber(row['Khối lượng cơ ở thân mình(kg)']),
    rightLegMuscle: parseNumber(row['Khối lượng cơ ở chân phải(kg)']),
    leftLegMuscle: parseNumber(row['Khối lượng cơ ở chân trái(kg)']),
  })).filter(record => record.weight !== null && (record.rawDate || record.date)).sort((a, b) => (a.rawDate || a.date).localeCompare(b.rawDate || b.date));
}

function buildSimulatedClaudeAnalysis(records, fileName = STANDARD_INBODY_FILE) {
  const first  = records[0];
  const latest = records[records.length - 1];
  const prev   = records[records.length - 2] || first;
  const diff   = (key) => latest?.[key] != null && first?.[key] != null ? latest[key] - first[key] : 0;
  const trend  = diff('fat') <= 0 ? 'ok' : 'warn';

  // Build date range string from real data
  const dates       = records.map(r => r.date || r.rawDate).filter(Boolean);
  const uniqueDates = [...new Set(dates)].sort();
  const dateRange   = uniqueDates.length > 1
    ? `từ ${uniqueDates[0]} đến ${uniqueDates[uniqueDates.length - 1]}`
    : uniqueDates[0] ? `ngày ${uniqueDates[0]}` : '';

  const measureCount = records.length;
  const dayCount     = uniqueDates.length;
  const measureDesc  = dayCount > 1
    ? `${measureCount} lần đo trên ${dayCount} ngày (${dateRange})`
    : `${measureCount} lần đo ${dateRange}`;

  const isConverted = fileName.includes('_converted') || fileName.includes('Convert');
  const source      = isConverted ? 'Groq Vision (llama-4-scout)' : 'CSV LookinBody';

  return {
    summary: `${source} phân tích ${fileName}: phát hiện ${measureDesc}. Cân nặng: ${latest?.weight ?? '-'}kg · Cơ xương: ${latest?.muscle ?? '-'}kg · Mỡ: ${latest?.fat ?? '-'}% · BMI: ${latest?.bmi ?? '-'} · Điểm InBody: ${latest?.score ?? '-'}. Dashboard đã dựng đồ thị theo thời gian để theo dõi cân nặng, cơ, mỡ, nước, ECW và điểm InBody.`,
    tags: [
      { label: isConverted ? 'Groq Vision Convert' : 'CSV chuẩn LookinBody', type: 'ok' },
      { label: trend === 'ok' ? 'Mỡ ổn định/giảm' : 'Mỡ tăng nhẹ', type: trend },
      { label: 'Đồ thị thời gian đã tạo', type: 'info' },
    ],
    metrics: {
      'Số lần đo': measureCount,
      'Ngày đo': dateRange || '-',
      'Cân nặng mới nhất': `${latest?.weight ?? '-'} kg`,
      'Thay đổi cân nặng': records.length > 1 ? `${diff('weight') >= 0 ? '+' : ''}${diff('weight').toFixed(1)} kg` : '-',
      'Cơ xương mới nhất': `${latest?.muscle ?? '-'} kg`,
      'Thay đổi cơ': records.length > 1 ? `${diff('muscle') >= 0 ? '+' : ''}${diff('muscle').toFixed(1)} kg` : '-',
      'Mỡ cơ thể mới nhất': `${latest?.fat ?? '-'}%`,
      'ECW Ratio': latest?.ecwRatio ?? '-',
      'Điểm InBody': latest?.score ?? '-',
      'So với lần trước': prev !== latest ? `Cân ${latest.weight - prev.weight >= 0 ? '+' : ''}${(latest.weight - prev.weight).toFixed(1)}kg · Mỡ ${latest.fat - prev.fat >= 0 ? '+' : ''}${(latest.fat - prev.fat).toFixed(1)}%` : '-',
    },
  };
}

// ─── Sample data (replace with real DB) ───────────────────────────────────
const SAMPLE_RECORDS = [
  { date: '2025-04-01', weight: 70.2, muscle: 29.2, fat: 23.5, water: 53.1, bmi: 24.2 },
  { date: '2025-05-01', weight: 69.6, muscle: 29.4, fat: 22.9, water: 53.8, bmi: 23.8 },
  { date: '2025-06-01', weight: 68.4, muscle: 29.8, fat: 22.1, water: 54.3, bmi: 23.1 },
];

// ─── Sub-components ─────────────────────────────────────────────────────────
function HeroCard({ levelInfo, latest }) {
  const classNames = ['Người mới', 'Học viên', 'Chiến binh', 'Võ sĩ', 'Cao thủ', 'Đại sư'];
  const className = classNames[Math.min(Math.floor(levelInfo.level / 2), classNames.length - 1)];

  return (
    <div className="hero-card">
      <div className="avatar">
        <span className="avatar-emoji">💪</span>
        <span className="level-badge">Lv.{levelInfo.level}</span>
      </div>
      <div className="hero-info">
        <div className="hero-name">{className} · {levelInfo.xp} XP</div>
        <div className="hero-class">
          Cân nặng: <b>{latest?.weight} kg</b> · BMI: <b>{latest?.bmi}</b>
        </div>
        <div className="bar-row">
          <span className="bar-label">XP</span>
          <div className="bar-track">
            <div className="bar-fill xp" style={{ width: `${levelInfo.progress}%` }} />
          </div>
          <span className="bar-val">{levelInfo.progress}%</span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, unit, delta, deltaUp }) {
  return (
    <div className="metric-card">
      <span className="metric-icon">{icon}</span>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value} <span className="metric-unit">{unit}</span></div>
      {delta && (
        <div className={`metric-delta ${deltaUp ? 'up' : 'down'}`}>
          {deltaUp ? '▲' : '▼'} {delta}
        </div>
      )}
    </div>
  );
}

function InBodyTrendPreview({ records }) {
  if (!records?.length) return null;
  const chartData = records.map((record) => ({
    ...record,
    // Show "MM-DD HH:mm" when datetime is available (multiple measures per day), else "MM-DD"
    dateLabel: record.date.includes(' ') ? record.date.slice(5) : record.date.slice(5),
  }));
  const latest = records[records.length - 1];

  return (
    <div className="inbody-simulated-charts">
      <div className="section-title">Đồ thị sức khoẻ theo thời gian · InBody-20260508 3.csv</div>
      <div className="inbody-chart-grid">
        <div className="inbody-chart-card">
          <div className="chart-title">Cân nặng · BMI · Điểm InBody</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="weight" name="Cân nặng kg" stroke="#378ADD" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bmi" name="BMI" stroke="#BA7517" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="score" name="Điểm" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="inbody-chart-card">
          <div className="chart-title">Cơ · Mỡ · Nước</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="muscle" name="Cơ xương kg" stroke="#0058bc" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="bodyFatMass" name="Mỡ kg" stroke="#D85A30" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="water" name="Nước L" stroke="#00a6d6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="inbody-chart-card wide">
          <div className="chart-title">Cân bằng nước · ECW · Phase angle</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="intracellularWater" name="ICW L" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="extracellularWater" name="ECW L" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ecwRatio" name="ECW ratio" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="phaseAngle" name="Góc pha" stroke="#111827" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="inbody-reference-strip">
        <div><b>Latest</b><span>{latest.date}</span></div>
        <div><b>Protein</b><span>{latest.protein ?? '-'} kg</span></div>
        <div><b>Khoáng</b><span>{latest.minerals ?? '-'} kg</span></div>
        <div><b>SMI</b><span>{latest.smi ?? '-'} kg/m²</span></div>
        <div><b>Mỡ nội tạng</b><span>Level {latest.visceralFatLevel ?? '-'}</span></div>
      </div>
      <div className="inbody-reference-gallery">
        {INBODY_REFERENCE_IMAGES.map((image) => (
          <figure key={image.label}>
            <img src={image.src} alt={image.label} />
            <figcaption>Tham khảo: {image.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function UploadTab({ onAnalysis, onViewMedicalRecord }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [simulatedRecords, setSimulatedRecords] = useState([]);
  const [lastAnalyzedFileName, setLastAnalyzedFileName] = useState('');
  const [uploadRecordStatus, setUploadRecordStatus] = useState('');
  const [savedUploadRecord, setSavedUploadRecord] = useState(null);
  const inputRef = useRef();


  const saveUploadRecord = async (selectedFile, extra = {}) => {
    const [dataUrl, base64Data] = await Promise.all([fileToDataUrl(selectedFile), fileToBase64(selectedFile)]);
    const isCsv = selectedFile.name.toLowerCase().endsWith('.csv') || selectedFile.type === 'text/csv';
    const textContent = isCsv ? await selectedFile.text() : '';
    const record = {
      id: `inbody_portal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename: selectedFile.name,
      name: selectedFile.name,
      fileType: detectFileType(selectedFile.type, selectedFile.name),
      type: detectFileType(selectedFile.type, selectedFile.name),
      mimeType: selectedFile.type || (isCsv ? 'text/csv' : 'image/jpeg'),
      size: selectedFile.size,
      uploadedAt: new Date().toISOString(),
      dataUrl,
      base64Data,
      textContent,
      notes: isCsv ? `AI inbody Portal · ${parseInBodyCsv(textContent).length} dòng dữ liệu` : 'AI inbody Portal image upload',
      ownerUuid: user?.uuid || null,
      ownerEmail: user?.email || '',
      ownerName: user?.name || '',
      ownerAvatar: user?.avatar || '',
      ownerProvider: user?.provider || '',
      sourceModule: 'ai-inbody-portal',
      ...extra,
    };
    await saveRecord(record, { ownerUuid: user?.uuid, ownerEmail: user?.email, ownerName: user?.name, ownerAvatar: user?.avatar, ownerProvider: user?.provider });
    notifyUpload();
    setSavedUploadRecord(record);
    setUploadRecordStatus(`Đã lưu vào Upload Records: ${record.filename}`);
    return record;
  };

  const saveCsvTextToUploadRecords = async (csvText, filename, extra = {}) => {
    const csvFile = new File([csvText], filename, { type: 'text/csv' });
    return saveUploadRecord(csvFile, { sourceModule: 'ai-inbody-portal-summary', ...extra });
  };

  const runSimulatedCsvAnalysis = (csvText, fileName = STANDARD_INBODY_FILE) => {
    setLastAnalyzedFileName(fileName);
    const parsedRecords = parseInBodyCsv(csvText);
    if (!parsedRecords.length) throw new Error('CSV không có dòng dữ liệu InBody hợp lệ.');
    const analysis = buildSimulatedClaudeAnalysis(parsedRecords, fileName);
    setResult(analysis);
    setSimulatedRecords(parsedRecords);
    if (onAnalysis) onAnalysis(analysis, parsedRecords);
  };

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (f) {
      setResult(null);
      setError(null);
      setSimulatedRecords([]);
      setUploadRecordStatus('');
      setSavedUploadRecord(null);
      try {
        // HEIC/HEIF (default iPhone photo format) can't be previewed by most
        // browsers nor accepted by Groq's vision API — convert to JPEG right
        // away so the file used everywhere downstream (preview, AI analysis,
        // Upload Records) is already a safe format.
        const safeFile = await ensureBrowserSafeImage(f);
        setFile(safeFile);
        saveUploadRecord(safeFile).catch((error) => setUploadRecordStatus(`Không lưu được Upload Records: ${error.message || error}`));
      } catch (error) {
        setError(`Không đọc được file HEIC: ${error.message || error}`);
      }
    }
  };

  const saveCurrentFileToUploadRecords = async () => {
    if (!file) {
      setUploadRecordStatus('Vui lòng chọn file/hình trước khi lưu Upload Records.');
      return;
    }
    try {
      await saveUploadRecord(file);
    } catch (error) {
      setUploadRecordStatus(`Không lưu được Upload Records: ${error.message || error}`);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      if (file.name === STANDARD_INBODY_FILE || file.name.toLowerCase().endsWith('.csv')) {
        const csvText = await file.text();
        runSimulatedCsvAnalysis(csvText, file.name);
        setLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];
          const mediaType = file.type;
          const analysis = await analyzeInBodyWithAI(base64, mediaType, file);
          setResult(analysis);
          if (onAnalysis) onAnalysis(analysis);
        } catch (err) {
          setError(err.message || 'Lỗi phân tích. Vui lòng thử lại.');
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Không đọc được file. Vui lòng thử lại.');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message || 'Lỗi phân tích. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  const loadBundledStandardCsv = () => {
    const demoFile = new File([standardInBodyCsv], STANDARD_INBODY_FILE, { type: 'text/csv' });
    setFile(demoFile);
    setError(null);
    setResult(null);
    setSimulatedRecords([]);
  };

  const convertCurrentImageToCsv = async () => {
    if (!file || file.name.toLowerCase().endsWith('.csv')) return;

    setLoading(true);
    try {
      const base64 = await fileToBase64Promise(file);
      const fallback = parseInBodyCsv(standardInBodyCsv).at(-1);

      // Delegate all 3 steps to shared lib (same logic as MedicalUploader)
      const { csvText, analysisResult: enrichedAnalysis } = await convertInBodyImageToCsv({
        base64Image:    base64,
        mediaType:      file.type,
        file,
        fallbackRecord: fallback,
        sourceName:     file.name,
        cachedAnalysis: result,   // reuse if "🧠 Phân tích AI" was already run
      });

      // Surface the analysis result so the UI panel updates
      if (!result && enrichedAnalysis) {
        setResult(enrichedAnalysis);
        if (onAnalysis) onAnalysis(enrichedAnalysis);
      }

      const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9._-]+/gi, '_') || 'InBody_Image';
      await saveCsvTextToUploadRecords(csvText, `${safeName}_converted.csv`, {
        notes: `Convert InBody Image thành .CSV từ ${file.name}`,
      });
      runSimulatedCsvAnalysis(csvText, `${safeName}_converted.csv`);
    } catch (err) {
      setError(err.message || 'Lỗi convert ảnh thành CSV. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const summarizeAllInBodyRecords = async () => {
    const ownerUuid = user?.uuid;
    const allRecords = await getAllRecords({ ownerUuid, includeUnowned: false });
    const parsed = [];
    allRecords.forEach((record) => {
      if (record.fileType !== 'csv') return;
      const csvText = record.textContent || (record.base64Data ? atob(record.base64Data) : '');
      parsed.push(...parseInBodyCsv(csvText));
    });
    if (simulatedRecords.length) parsed.push(...simulatedRecords);
    const unique = Array.from(new Map(parsed.map(record => [record.rawDate, record])).values()).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
    if (!unique.length) {
      setUploadRecordStatus('Chưa có dữ liệu InBody CSV để Summary.');
      return;
    }
    const loginName = (user?.name || user?.email || 'Guest').replace(/[^a-z0-9._-]+/gi, '_');
    const filename = `FullTrackInBody_${loginName}.CSV`;
    const csvText = recordsToInBodyCsv(unique);
    await saveCsvTextToUploadRecords(csvText, filename, { notes: `Summary All InBody Records · ${unique.length} dòng · ${user?.email || 'guest'}` });
    runSimulatedCsvAnalysis(csvText, filename);
  };

  return (
    <div>
      <div className="upload-zone" onClick={() => inputRef.current?.click()}>
        <div className="upload-icon">📁</div>
        <div className="upload-title">Upload kết quả InBody</div>
        <div className="upload-sub">Ảnh chụp phiếu hoặc file CSV từ LookinBody</div>
        <div className="upload-formats">
          <span className="fmt pdf">PDF</span>
          <span className="fmt img">JPG/PNG</span>
          <span className="fmt csv">CSV</span>
        </div>
      </div>
      <input
        ref={inputRef} type="file" hidden
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.csv,image/*"
        onChange={handleFile}
      />
      <div className="inbody-upload-actions">
        <button type="button" className="sample-csv-btn" onClick={loadBundledStandardCsv}>
          🧪 Nạp file mẫu chuẩn: {STANDARD_INBODY_FILE}
        </button>
        <button type="button" className="sample-csv-btn" onClick={() => inputRef.current?.click()}>
          📤 upload file .csv / hình vào Upload Records
        </button>
        <button type="button" className="sample-csv-btn" onClick={saveCurrentFileToUploadRecords} disabled={!file}>
          💾 Lưu Upload Records
        </button>
        <button type="button" className="sample-csv-btn" onClick={summarizeAllInBodyRecords}>
          📚 Summary All InBody Records
        </button>
      </div>
      {uploadRecordStatus && <div className="file-preview">{uploadRecordStatus}</div>}
      {savedUploadRecord && (
        <button type="button" className="inbody-medical-record-btn" onClick={onViewMedicalRecord}>
          Xem hình tại Medical Records
        </button>
      )}
      {file && (
        <div className="file-preview">
          ✅ {file.name} ({(file.size / 1024).toFixed(0)} KB)
          {file.name === STANDARD_INBODY_FILE && <span className="standard-file-pill">CSV chuẩn · giả lập Claude</span>}
        </div>
      )}
      <button className="analyze-btn" onClick={handleAnalyze} disabled={!file || loading}>
        {loading ? '⏳ Đang phân tích...' : '🧠 Phân tích AI với Claude'}
      </button>
      {file && !file.name.toLowerCase().endsWith('.csv') && (
        <button className="analyze-btn" onClick={convertCurrentImageToCsv} type="button">
          📈 Convert InBody Image thành .CSV
        </button>
      )}
      {error && <div className="error-msg">{error}</div>}
      {result && (
        <div className="ai-result">
          <div className="ai-header">
            <span className="ai-badge">
              {simulatedRecords.length
                ? (lastAnalyzedFileName.includes('_converted') || lastAnalyzedFileName.includes('Convert')
                    ? '🤖 Groq Vision'
                    : '📊 CSV LookinBody')
                : '🔬 Groq Vision'}
            </span>
            <span className="ai-title">Phân tích InBody</span>
          </div>
          <p className="ai-text">{result.summary}</p>
          <div className="ai-tags">
            {result.tags?.map((tag) => (
              <span key={tag.label} className={`ai-tag ${tag.type}`}>{tag.label}</span>
            ))}
          </div>
          {result.metrics && (
            <div className="ai-metrics">
              {Object.entries(result.metrics).map(([k, v]) => (
                <div key={k} className="ai-metric-row">
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <InBodyTrendPreview records={simulatedRecords} />
    </div>
  );
}

function QuestsTab({ records }) {
  const quests = getActiveQuests(records);
  return (
    <div>
      <div className="section-title">Nhiệm vụ đang thực hiện</div>
      {quests.map((q) => (
        <div key={q.id} className="quest-item">
          <div className="quest-icon">{q.icon}</div>
          <div className="quest-body">
            <div className="quest-name">{q.name}</div>
            <div className="quest-desc">{q.desc}</div>
            <div className="quest-bar">
              <div className="quest-fill" style={{ width: `${q.progress}%`, background: q.color }} />
            </div>
          </div>
          <div className="quest-reward">+{q.reward} XP</div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ records }) {
  const chartData = records.map((record) => ({
    date: record.date.slice(5),
    muscle: record.muscle,
    fat: record.fat,
  }));

  return (
    <div>
      <div className="section-title">Xu hướng 3 tháng</div>
      <div className="inbody-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -18, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="muscle" name="Cơ bắp (kg)" stroke="#378ADD" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="fat" name="Mỡ (%)" stroke="#D85A30" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="section-title" style={{ marginTop: '1rem' }}>Lịch sử đo</div>
      {records.map((r, i) => {
        const prev = records[i - 1];
        const muscleChange = prev ? (r.muscle - prev.muscle).toFixed(1) : null;
        const fatChange = prev ? (r.fat - prev.fat).toFixed(1) : null;
        return (
          <div key={r.date} className="hist-row">
            <span className="hist-date">{r.date}</span>
            <span className="hist-weight">{r.weight} kg</span>
            {muscleChange && (
              <span className={`hist-delta ${+muscleChange >= 0 ? 'up' : 'down'}`}>
                Cơ {muscleChange >= 0 ? '+' : ''}{muscleChange}
              </span>
            )}
            {fatChange && (
              <span className={`hist-delta ${+fatChange <= 0 ? 'up' : 'down'}`}>
                Mỡ {fatChange > 0 ? '+' : ''}{fatChange}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InBodyAppScreensTab({ onAppleHealthImport, latest }) {
  const [appleStatus, setAppleStatus] = useState('Sẵn sàng nhận dữ liệu thật từ Apple Health trên iPhone.');
  const [applePreview, setApplePreview] = useState([]);
  const [latestAppleRecords, setLatestAppleRecords] = useState([]);
  const inbodyFrameRef = useRef(null);
  const nativeBridge = typeof window !== 'undefined' && (
    window.webkit?.messageHandlers?.appleHealth ||
    window.webkit?.messageHandlers?.healthKit
  );

  const pushAppleHealthToInBodyFrame = (records = latestAppleRecords) => {
    const frameWindow = inbodyFrameRef.current?.contentWindow;
    if (!frameWindow || !records.length) return;
    frameWindow.postMessage({ source: 'ai-doctor-admin', type: 'APPLE_HEALTH_DAYS_SYNC', records }, '*');
  };

  const importAppleHealthDays = (days, sourceLabel = 'Apple Health') => {
    if (!days.length) throw new Error('Không tìm thấy dữ liệu Apple Health được hỗ trợ trong file đã chọn.');
    const dashboardRecords = buildAppleHealthDashboardRecords(days, latest);
    onAppleHealthImport?.(dashboardRecords);
    setLatestAppleRecords(dashboardRecords);
    try { localStorage.setItem(APPLE_HEALTH_STORAGE_KEY, JSON.stringify(dashboardRecords)); } catch {}
    window.setTimeout(() => pushAppleHealthToInBodyFrame(dashboardRecords), 0);
    setApplePreview(dashboardRecords.slice(-5).reverse());
    setAppleStatus(`Đã đồng bộ ${dashboardRecords.length} ngày dữ liệu thật từ ${sourceLabel} vào dashboard InBody và Trang tổng Apple Health.`);
  };

  const handleAppleHealthFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAppleStatus(`Đang đọc ${file.name} từ iPhone...`);
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        throw new Error('Apple Health xuất mặc định thành export.zip. Trên iPhone hãy chạm file ZIP trong Files → Uncompress/Giải nén → chọn file apple_health_export/export.xml.');
      }
      const text = await file.text();
      const isJson = file.name.toLowerCase().endsWith('.json') || file.type.includes('json');
      const days = isJson ? normalizeAppleHealthJson(JSON.parse(text)) : parseAppleHealthExportXml(text);
      importAppleHealthDays(days, file.name);
    } catch (error) {
      setApplePreview([]);
      setAppleStatus(error.message || 'Không đồng bộ được Apple Health.');
    } finally {
      event.target.value = '';
    }
  };

  const handleNativeAppleHealthSync = () => {
    const bridge = window.webkit?.messageHandlers?.appleHealth || window.webkit?.messageHandlers?.healthKit;
    if (!bridge) {
      setAppleStatus('Safari/web không cho đọc HealthKit trực tiếp. Trên iPhone hãy mở Sức khỏe → avatar → Xuất tất cả dữ liệu sức khỏe → chọn file export.xml tại đây. Nếu app được bọc bằng iOS native, hãy gắn WKWebView messageHandler tên appleHealth hoặc healthKit.');
      return;
    }
    bridge.postMessage({
      type: 'REQUEST_APPLE_HEALTH_SYNC',
      metrics: Object.keys(APPLE_HEALTH_METRICS),
      rangeDays: 365,
    });
    setAppleStatus('Đã gửi yêu cầu tới HealthKit native bridge trên iPhone. Đang chờ dữ liệu trả về...');
  };

  useEffect(() => {
    try {
      const storedRecords = JSON.parse(localStorage.getItem(APPLE_HEALTH_STORAGE_KEY) || '[]');
      if (Array.isArray(storedRecords) && storedRecords.length) {
        setLatestAppleRecords(storedRecords);
        setApplePreview(storedRecords.slice(-5).reverse());
        setAppleStatus(`Đã nạp ${storedRecords.length} ngày Apple Health đã đồng bộ trước đó cho Trang tổng.`);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleNativeMessage = (event) => {
      const payload = event.data || event.detail;
      if (!payload || payload.source !== 'apple-health') return;
      try {
        importAppleHealthDays(normalizeAppleHealthJson(payload), 'HealthKit native bridge');
      } catch (error) {
        setAppleStatus(error.message || 'Không nhận được dữ liệu từ HealthKit native bridge.');
      }
    };
    window.addEventListener('message', handleNativeMessage);
    window.addEventListener('apple-health-data', handleNativeMessage);
    return () => {
      window.removeEventListener('message', handleNativeMessage);
      window.removeEventListener('apple-health-data', handleNativeMessage);
    };
  }, [latest, onAppleHealthImport]);

  return (
    <div className="inbody-app-screen-panel inbody-app-html-panel">
      <div className="apple-health-card">
        <div className="apple-health-copy">
          <div className="apple-health-icon"></div>
          <div>
            <div className="section-title">Apple Health thật từ iPhone</div>
            <h3>Đồng bộ Apple Health vào tab Hình ảnh</h3>
            <p>
              Nhập file <b>export.xml</b> trong gói export.zip xuất trực tiếp từ app <b>Sức khỏe</b> trên iPhone để lấy cân nặng,
              % mỡ, lean body mass, BMI, nước, bước chân, năng lượng, vận động và nhịp tim.
            </p>
          </div>
        </div>
        <div className="apple-health-actions">
          <label className="apple-health-file-btn">
            Chọn export.xml từ iPhone
            <input type="file" accept=".xml,text/xml,application/xml,.json,application/json,.zip,application/zip" onChange={handleAppleHealthFile} />
          </label>
          <button type="button" onClick={handleNativeAppleHealthSync} className={nativeBridge ? 'bridge-ready' : ''}>
            {nativeBridge ? 'Kết nối HealthKit native' : 'Kiểm tra Apple Health' }
          </button>
        </div>
        <div className="apple-health-status">{appleStatus}</div>
        {applePreview.length > 0 && (
          <div className="apple-health-preview">
            {applePreview.map((record) => (
              <div key={record.date}>
                <b>{record.date}</b>
                <span>{record.appleHealth?.steps ? `${Math.round(record.appleHealth.steps).toLocaleString()} bước` : 'Apple Health'}</span>
                <span>{record.weight ? `${record.weight}kg` : '—'}</span>
                <span>{record.fat ? `${record.fat}% mỡ` : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="inbody-app-html-copy">
        <div>
          <div className="section-title">Hình ảnh InBody app</div>
          <p>Nguồn hiển thị đã được thay bằng file HTML gốc <code>src/inbody-khanh/inbody_app_health_tracker.html</code>.</p>
        </div>
        <a href={inbodyAppHealthTrackerUrl} target="_blank" rel="noreferrer">Mở toàn màn hình ↗</a>
      </div>
      <iframe
        ref={inbodyFrameRef}
        title="InBody app health tracker"
        src={inbodyAppHealthTrackerUrl}
        className="inbody-app-html-frame"
        loading="lazy"
        onLoad={() => pushAppleHealthToInBodyFrame()}
      />
    </div>
  );
}

function RankingHeader({ latest }) {
  return (
    <div className="ranking-hero">
      <div className="ranking-topline">
        <span className="ranking-logo">InBody</span>
        <span>Trang tổng</span>
        <span>Chi tiết</span>
        <span>Thay đổi</span>
        <b>Xếp hạng</b>
      </div>
      <div className="ranking-scoreline">
        <span>Điểm InBody của tôi</span>
        <strong>{latest?.score ?? 64}<small>Điểm</small></strong>
      </div>
      <div className="ranking-filter-row">
        <button type="button">Nam giới / Cùng độ tuổi(40~50Tuổi) ▾</button>
        <span>Top 94%</span>
      </div>
      <p>Thiết bị chăm sóc sức khỏe tại nhà, dữ liệu nhập thủ công chỉ phản ánh trong bảng xếp hạng bạn bè.</p>
    </div>
  );
}

function RankingRows({ rows, compact = false }) {
  return (
    <div className={compact ? 'ranking-list compact' : 'ranking-list'}>
      {rows.map((row, index) => (
        <div key={`${row.name}-${index}`} className="ranking-row">
          <span className="ranking-rank">{row.rank}</span>
          <span className="ranking-new">NEW</span>
          <span className={row.photo ? 'ranking-avatar photo' : 'ranking-avatar'}>{row.photo ? '👤' : ''}</span>
          <span className="ranking-name">{row.name}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

function RankingsTab({ latest }) {
  const [group, setGroup] = useState(RANKING_GROUPS[0]);
  const [showConnect, setShowConnect] = useState(false);

  return (
    <div className="ranking-panel">
      <RankingHeader latest={latest} />
      <div className="ranking-pill-tabs">
        {RANKING_GROUPS.map((item) => (
          <button key={item.id} type="button" className={group.id === item.id ? 'active' : ''} onClick={() => setGroup(item)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="ranking-body-card">
        <div className="ranking-info"><span>i</span>{group.info}</div>
        {group.friendMode && (
          <div className="ranking-privacy-row">
            <h3>{group.title}</h3>
            <span>Riêng tư</span><button type="button" aria-label="Đổi riêng tư công khai" /><b>Công khai</b>
          </div>
        )}
        {!group.friendMode && (
          <div className="ranking-section-heading">
            <h3>{group.title}</h3>
            <div><b>Tổng</b><span>Nam giới</span><span>Nữ giới</span></div>
          </div>
        )}
        {group.empty ? <div className="ranking-empty">{group.empty}</div> : <RankingRows rows={group.rows} compact={group.friendMode} />}
        {group.friendMode && (
          <button type="button" className="ranking-connect-btn" onClick={() => setShowConnect(!showConnect)}>
            {showConnect ? 'Đóng kết bạn' : 'Kết bạn'}
          </button>
        )}
        {showConnect && (
          <div className="ranking-connect-card">
            <div className="ranking-connect-title">‹ <b>Kết bạn</b></div>
            <h3>Yêu cầu kết bạn</h3>
            <div className="ranking-input">Số điện thoại di động</div>
            <div className="ranking-input">Tên</div>
            <button type="button">Gửi yêu cầu</button>
            <h3>Danh sách bạn bè</h3>
            <p>Không có bạn bè.</p>
          </div>
        )}
        <div className="ranking-section-heading secondary">
          <h3>Xếp hạng điểm InBody hằng ngày</h3>
          <div><b>Tổng</b><span>Nam giới</span><span>Nữ giới</span></div>
        </div>
        <RankingRows rows={DAILY_SCORE_ROWS} />
        <div className="ranking-section-heading secondary">
          <h3>Xếp hạng tỷ lệ mỡ trong cơ thể hằng ngày</h3>
          <div><b>Nam giới</b><span>Nữ giới</span></div>
        </div>
        <RankingRows rows={BODY_FAT_ROWS} />
        <a className="ranking-opt-out" href="#ranking-opt-out">Không tham gia vào việc xếp hạng.</a>
      </div>
      <details className="inbody-reference-details">
        <summary>Ảnh tham chiếu IMG_2651.PNG → IMG_2657.PNG</summary>
        <div className="inbody-reference-gallery ranking-gallery">
          {RANKING_REFERENCE_IMAGES.map((image) => (
            <figure key={image.label}><img src={image.src} alt={image.label} /><figcaption>{image.label}</figcaption></figure>
          ))}
        </div>
      </details>
    </div>
  );
}

function ChallengeTab({ records, levelInfo }) {
  const latest = records[records.length - 1];
  const completedTasks = CHALLENGE_DAILY_TASKS.filter((task) => task.done).length;
  return (
    <div className="challenge-panel">
      <div className="challenge-hero">
        <div>
          <span className="challenge-kicker">AI CLINIC · HEALTH UNIVERSE</span>
          <h2>Thử Thách InBody Warrior</h2>
          <p>Biến dữ liệu InBody thành hành trình nhiệm vụ: upload, AI phân tích, chọn phác đồ, nhận bounty và mở khóa thành tựu như RoadMap + Hành Trình.</p>
        </div>
        <div className="challenge-level-card">
          <span>Lv. {levelInfo.level}</span>
          <b>{levelInfo.xp.toLocaleString()} XP</b>
          <div className="challenge-xp"><i style={{ width: `${levelInfo.progress}%` }} /></div>
          <small>{levelInfo.progress}% tới level kế tiếp</small>
        </div>
      </div>
      <div className="challenge-grid">
        <section className="challenge-card overview">
          <div className="challenge-card-head"><span>04</span><b>Dashboard Bệnh nhân</b></div>
          <div className="challenge-stats">
            <div><small>Sức khỏe</small><b>{latest?.score ?? 72}</b></div>
            <div><small>Nhiệm vụ</small><b>{completedTasks}</b></div>
            <div><small>Token</small><b>4,250 HLT</b></div>
            <div><small>Cấp độ</small><b>{levelInfo.level}</b></div>
          </div>
          <div className="challenge-radar">
            <span>Miễn dịch 72</span><span>Trao đổi chất 65</span><span>Tinh thần 68</span><span>Giấc ngủ 75</span><span>Tim mạch 80</span>
          </div>
        </section>
        <section className="challenge-card upload-flow">
          <div className="challenge-card-head"><span>InBody</span><b>Upload kết quả InBody</b></div>
          <img src={aiClinicInBodyRef} alt="AIClinicInBody reference" />
          <button type="button">Phân tích ngay</button>
        </section>
        <section className="challenge-card programs">
          <div className="challenge-card-head"><span>09</span><b>Challenge / Bounty Marketplace</b></div>
          {CHALLENGE_PROGRAMS.map((program) => (
            <div key={program.name} className="challenge-program">
              <span>{program.icon}</span>
              <div><b>{program.name}</b><small>{program.state} · {program.reward}</small><i><em style={{ width: `${program.progress}%` }} /></i></div>
              <strong>{program.tag}</strong>
            </div>
          ))}
        </section>
        <section className="challenge-card daily">
          <div className="challenge-card-head"><span>55</span><b>Nhiệm vụ hôm nay</b></div>
          {CHALLENGE_DAILY_TASKS.map((task) => (
            <div key={task.name} className={task.done ? 'challenge-task done' : 'challenge-task'}>
              <span>{task.icon}</span><b>{task.name}</b><small>+{task.xp} XP</small><em>{task.done ? '✓' : '○'}</em>
            </div>
          ))}
        </section>
        <section className="challenge-card story">
          <div className="challenge-card-head"><span>09</span><b>Hành trình Story Mode</b></div>
          <div className="story-map">
            <div className="story-node active">Day 1</div><div className="story-line" /><div className="story-node active">Day 7</div><div className="story-line" /><div className="story-node locked">Boss</div>
          </div>
          <p>Chapter 1 · The Awakening · 60%</p>
          <button type="button">Nhận nhiệm vụ kế tiếp</button>
        </section>
        <section className="challenge-card leaderboard-mini">
          <div className="challenge-card-head"><span>15</span><b>Bảng xếp hạng</b></div>
          {['Titan', 'Shadow', 'Phoenix', 'Samurai', 'You'].map((name, index) => (
            <div key={name}><span>{index + 1}</span><b>{name}</b><small>XP {index === 4 ? '7,540' : (18450 - index * 2210).toLocaleString()}</small></div>
          ))}
        </section>
      </div>
      <div className="challenge-reference-grid">
        <figure><img src={challengeRoadMapRef} alt="RoadMap Health Universe" /><figcaption>RoadMap.png · screen map thử thách/bounty</figcaption></figure>
        <figure><img src={challengeJourneyRef} alt="HanhTrinh3 Neuro Quest" /><figcaption>HanhTrinh3.png · hành trình chiến binh</figcaption></figure>
      </div>
    </div>
  );
}

function BadgesTab({ records }) {
  const achievements = getAchievements(records);
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return (
    <div>
      <div className="section-title">Huy hiệu thành tích ({unlocked}/{achievements.length})</div>
      <div className="badges-grid">
        {achievements.map((a) => (
          <div key={a.id} className={`badge-item ${a.unlocked ? '' : 'locked'}`}>
            <div className="badge-icon">{a.icon}</div>
            <div className="badge-name">{a.name}</div>
          </div>
        ))}
      </div>
      <div className="badge-progress-wrap">
        <div className="badge-progress-label">
          Tiến độ: {unlocked}/{achievements.length}
        </div>
        <div className="bar-track">
          <div className="bar-fill xp" style={{ width: `${Math.round((unlocked / achievements.length) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function InBodyDashboard({ userId, initialRecords, onViewMedicalRecord }) {
  const { user } = useAuth();
  const [records, setRecords] = useState(initialRecords || SAMPLE_RECORDS);
  const [tab, setTab] = useState('upload');
  const [initialSummaryStatus, setInitialSummaryStatus] = useState('');
  const latest = records[records.length - 1];
  const prev = records[records.length - 2];
  const levelInfo = calcLevel(calcXP(records));

  useEffect(() => {
    let cancelled = false;
    loadLatestSummaryAllInBodyRecords(user?.uuid)
      .then((summary) => {
        if (cancelled || !summary) return;
        setRecords(summary.parsedRecords);
        setTab('history');
        setInitialSummaryStatus(`Đã nạp Lịch sử từ Summary All InBody Records gần nhất: ${summary.record.filename}`);
      })
      .catch((error) => {
        if (!cancelled) setInitialSummaryStatus(`Không nạp được Summary All InBody Records: ${error.message || error}`);
      });
    return () => { cancelled = true; };
  }, [user?.email]);

  const handleNewAnalysis = (analysis, parsedRecords) => {
    if (parsedRecords?.length) {
      setRecords(parsedRecords);
      return;
    }

    // If AI extracts metrics, add to records
    if (analysis?.metrics) {
      // Use the date extracted from the image by AI; fall back to today ONLY as last resort
      const aiDate = analysis.metrics["Ngày đo"] || analysis.metrics["Ngày"] || analysis.metrics["Date"] || "";
      const parsedAiDate = aiDate ? String(aiDate).slice(0, 10) : "";
      const dateRegex = /^(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
      const recordDate = dateRegex.test(parsedAiDate) ? parsedAiDate : new Date().toISOString().slice(0, 10);
      const newRecord = {
        date: recordDate,
        weight: parseFloat(analysis.metrics["Cân nặng"]) || latest.weight,
        muscle: parseFloat(analysis.metrics["Cơ bắp"]) || latest.muscle,
        fat: parseFloat(analysis.metrics["Mỡ (%)"]) || latest.fat,
        water: parseFloat(analysis.metrics["Nước (%)"]) || latest.water,
        bmi: parseFloat(analysis.metrics["BMI"]) || latest.bmi,
      };
      setRecords((prev) => [...prev, newRecord]);
    }
  };

  const tabs = [
    { id: 'upload', label: 'Scan', icon: '📤' },
    { id: 'quests', label: 'Nhiệm vụ', icon: '⚔️' },
    { id: 'history', label: 'Lịch sử', icon: '📈' },
    { id: 'screens', label: 'Hình ảnh', icon: '🖼️' },
    { id: 'rankings', label: 'Xếp Hạng', icon: '🏆' },
    { id: 'challenges', label: 'Thử Thách', icon: '🚀' },
    { id: 'badges', label: 'Huy hiệu', icon: '🏅' },
  ];

  return (
    <div className="inbody-dashboard">
      <HeroCard levelInfo={levelInfo} latest={latest} />
      {initialSummaryStatus && <div className="inbody-initial-summary-status">{initialSummaryStatus}</div>}

      <div className="metrics-grid">
        <MetricCard icon="⚖️" label="Cân nặng" value={latest?.weight} unit="kg"
          delta={prev ? `${Math.abs((latest.weight - prev.weight).toFixed(1))} kg` : null}
          deltaUp={latest?.weight < prev?.weight} />
        <MetricCard icon="💪" label="Cơ bắp" value={latest?.muscle} unit="kg"
          delta={prev ? `${Math.abs((latest.muscle - prev.muscle).toFixed(1))} kg` : null}
          deltaUp={latest?.muscle > prev?.muscle} />
        <MetricCard icon="🔥" label="Mỡ cơ thể" value={latest?.fat} unit="%"
          delta={prev ? `${Math.abs((latest.fat - prev.fat).toFixed(1))}%` : null}
          deltaUp={latest?.fat < prev?.fat} />
        <MetricCard icon="💧" label="Nước" value={latest?.water} unit="L"
          delta="Ổn định" deltaUp />
      </div>

      <div className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab === 'upload' && <UploadTab onAnalysis={handleNewAnalysis} onViewMedicalRecord={onViewMedicalRecord} />}
        {tab === 'quests' && <QuestsTab records={records} />}
        {tab === 'history' && <HistoryTab records={records} />}
        {tab === 'screens' && <InBodyAppScreensTab latest={latest} onAppleHealthImport={(appleRecords) => setRecords(prevRecords => mergeRecordsByDate(prevRecords, appleRecords))} />}
        {tab === 'rankings' && <RankingsTab latest={latest} />}
        {tab === 'challenges' && <ChallengeTab records={records} levelInfo={levelInfo} />}
        {tab === 'badges' && <BadgesTab records={records} />}
      </div>

      <style>{`
        .inbody-dashboard { font-family: var(--font-sans, system-ui); max-width: 100%; color: #111827; }
        .inbody-chart { height: 260px; width: 100%; margin-bottom: 1rem; }
        .hero-card { display: flex; align-items: center; gap: 16px; padding: 1.25rem; background: #f8f9fa; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #e9ecef; }
        .avatar { width: 64px; height: 64px; border-radius: 50%; background: #e6f1fb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 2px solid #378ADD; position: relative; }
        .avatar-emoji { font-size: 28px; }
        .level-badge { position: absolute; bottom: -4px; right: -4px; background: #BA7517; color: #fff; font-size: 10px; font-weight: 500; padding: 2px 5px; border-radius: 8px; }
        .hero-info { flex: 1; }
        .hero-name { font-size: 16px; font-weight: 500; margin-bottom: 2px; }
        .hero-class { font-size: 12px; color: #666; margin-bottom: 8px; }
        .bar-row { display: flex; align-items: center; gap: 8px; }
        .bar-label { font-size: 11px; color: #888; width: 20px; }
        .bar-track { flex: 1; height: 7px; background: #e9ecef; border-radius: 4px; overflow: hidden; }
        .bar-fill.xp { height: 100%; background: #1D9E75; border-radius: 4px; }
        .bar-val { font-size: 11px; color: #888; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 1rem; }
        .metric-card { background: #f8f9fa; border-radius: 8px; padding: 12px; border: 1px solid #e9ecef; }
        .metric-icon { font-size: 18px; margin-bottom: 4px; display: block; }
        .metric-label { font-size: 11px; color: #888; margin-bottom: 2px; }
        .metric-value { font-size: 20px; font-weight: 500; }
        .metric-unit { font-size: 11px; color: #888; }
        .metric-delta { font-size: 11px; margin-top: 3px; }
        .metric-delta.up { color: #1D9E75; }
        .metric-delta.down { color: #D85A30; }
        .tab-bar { display: flex; gap: 4px; background: #f1f3f4; padding: 4px; border-radius: 8px; margin-bottom: 1rem; }
        .tab-btn { flex: 1; padding: 7px 4px; font-size: 12px; border: none; background: transparent; border-radius: 6px; cursor: pointer; color: #666; }
        .tab-btn.active { background: #fff; color: #111; font-weight: 500; border: 1px solid #e9ecef; }
        .tab-content { min-height: 300px; }
        .section-title { font-size: 11px; font-weight: 500; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
        .upload-zone { border: 1.5px dashed #ccc; border-radius: 12px; padding: 2rem; text-align: center; cursor: pointer; transition: background 0.15s; margin-bottom: 1rem; }
        .upload-zone:hover { background: #f8f9fa; }
        .upload-icon { font-size: 32px; margin-bottom: 8px; }
        .upload-title { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
        .upload-sub { font-size: 12px; color: #888; }
        .upload-formats { display: flex; gap: 6px; justify-content: center; margin-top: 10px; }
        .fmt { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
        .fmt.pdf { background: #FAECE7; color: #4A1B0C; }
        .fmt.img { background: #E6F1FB; color: #042C53; }
        .fmt.csv { background: #E1F5EE; color: #085041; }
        .file-preview { padding: 8px 12px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; font-size: 13px; margin-bottom: 10px; }
        .analyze-btn { width: 100%; padding: 11px; background: #378ADD; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; margin-bottom: 1rem; }
        .analyze-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .error-msg { color: #D85A30; font-size: 13px; margin-bottom: 8px; }
        .ai-result { background: #f0f9ff; border-radius: 12px; padding: 1.25rem; border: 1px solid #bae6fd; }
        .ai-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .ai-badge { font-size: 11px; background: #E6F1FB; color: #042C53; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
        .ai-title { font-size: 14px; font-weight: 500; }
        .ai-text { font-size: 13px; line-height: 1.6; margin-bottom: 10px; }
        .ai-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .ai-tag { font-size: 11px; padding: 3px 8px; border-radius: 4px; }
        .ai-tag.ok { background: #E1F5EE; color: #085041; }
        .ai-tag.warn { background: #FAEEDA; color: #633806; }
        .ai-tag.info { background: #E6F1FB; color: #042C53; }
        .ai-metrics { margin-top: 10px; border-top: 1px solid #e0f2fe; padding-top: 10px; }
        .ai-metric-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .quest-item { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid #e9ecef; border-radius: 8px; margin-bottom: 8px; background: #fff; }
        .quest-icon { font-size: 24px; flex-shrink: 0; }
        .quest-body { flex: 1; }
        .quest-name { font-size: 13px; font-weight: 500; }
        .quest-desc { font-size: 11px; color: #888; margin-top: 2px; }
        .quest-bar { height: 4px; background: #e9ecef; border-radius: 2px; margin-top: 6px; overflow: hidden; }
        .quest-fill { height: 100%; border-radius: 2px; }
        .quest-reward { font-size: 11px; color: #BA7517; font-weight: 500; white-space: nowrap; }
        .hist-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f3f4; font-size: 12px; }
        .hist-date { color: #888; width: 85px; flex-shrink: 0; }
        .hist-weight { font-weight: 500; min-width: 55px; }
        .hist-delta.up { color: #1D9E75; }
        .hist-delta.down { color: #D85A30; }
        .badges-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; margin-bottom: 1rem; }
        .badge-item { text-align: center; padding: 10px 6px; border-radius: 8px; border: 1px solid #e9ecef; background: #fff; }
        .badge-item.locked { opacity: 0.3; filter: grayscale(1); }
        .badge-icon { font-size: 24px; margin-bottom: 4px; }
        .badge-name { font-size: 10px; color: #666; line-height: 1.2; }
        .badge-progress-wrap { padding: 10px 14px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; }
        .badge-progress-label { font-size: 12px; color: #666; margin-bottom: 6px; }
        .inbody-upload-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: -4px 0 10px; }
        .sample-csv-btn { width: 100%; padding: 10px 12px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #085041; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; margin: 0; }
        .standard-file-pill { display: inline-flex; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: #E1F5EE; color: #085041; font-size: 11px; font-weight: 700; }
        .inbody-medical-record-btn { width: 100%; padding: 11px 12px; margin: 0 0 10px; border: 0; border-radius: 10px; background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 12px 28px rgba(34,197,94,.24); }
        .inbody-initial-summary-status { margin: -4px 0 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; }
        .inbody-simulated-charts { margin-top: 1rem; }
        .inbody-chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .inbody-chart-card { min-width: 0; padding: 12px; border: 1px solid #e9ecef; border-radius: 12px; background: #fff; }
        .inbody-chart-card.wide { grid-column: 1 / -1; }
        .chart-title { font-size: 12px; font-weight: 700; color: #111827; margin-bottom: 8px; }
        .inbody-reference-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
        .inbody-reference-strip > div { padding: 10px; border-radius: 10px; background: #f8f9fa; border: 1px solid #e9ecef; }
        .inbody-reference-strip b { display: block; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .04em; }
        .inbody-reference-strip span { display: block; margin-top: 3px; font-size: 12px; font-weight: 700; color: #111827; }
        .inbody-reference-gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
        .inbody-reference-gallery figure { margin: 0; overflow: hidden; border: 1px solid #e9ecef; border-radius: 12px; background: #fff; }
        .inbody-reference-gallery img { display: block; width: 100%; height: clamp(360px, 68vh, 980px); object-fit: contain; object-position: top; background: #fff; }
        .inbody-reference-gallery figcaption { padding: 7px 9px; color: #666; font-size: 10px; font-weight: 700; }
        .inbody-app-screen-panel { padding: 14px; border: 1px solid #e5e7eb; border-radius: 18px; background: linear-gradient(180deg, #fff, #f8fafc); }
        .apple-health-card { margin-bottom: 14px; padding: clamp(14px, 2.4vw, 22px); border-radius: 22px; border: 1px solid rgba(17,24,39,.12); background: radial-gradient(circle at 8% 0%, rgba(17,24,39,.10), transparent 30%), linear-gradient(135deg, #ffffff, #f1f5f9); box-shadow: 0 18px 45px rgba(15,23,42,.10); }
        .apple-health-copy { display: flex; gap: 14px; align-items: flex-start; }
        .apple-health-icon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; flex-shrink: 0; color: #fff; background: linear-gradient(135deg, #111827, #475569); font-size: 24px; box-shadow: 0 12px 28px rgba(15,23,42,.25); }
        .apple-health-copy h3 { margin: 0 0 6px; color: #111827; font-size: clamp(18px, 2vw, 24px); }
        .apple-health-copy p { margin: 0; color: #475569; font-size: 13px; line-height: 1.6; }
        .apple-health-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
        .apple-health-actions button, .apple-health-file-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 10px 14px; border-radius: 12px; border: 0; cursor: pointer; font-weight: 900; font-size: 13px; }
        .apple-health-file-btn { color: #fff; background: linear-gradient(135deg, #111827, #2563eb); box-shadow: 0 12px 24px rgba(37,99,235,.22); }
        .apple-health-file-btn input { display: none; }
        .apple-health-actions button { color: #111827; background: #fff; border: 1px solid #dbe3ef; }
        .apple-health-actions button.bridge-ready { color: #065f46; background: #ecfdf5; border-color: #a7f3d0; }
        .apple-health-status { margin-top: 12px; padding: 10px 12px; border-radius: 12px; color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 12px; font-weight: 700; line-height: 1.5; }
        .apple-health-preview { display: grid; gap: 6px; margin-top: 12px; }
        .apple-health-preview div { display: grid; grid-template-columns: 1fr repeat(3, auto); gap: 8px; align-items: center; padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,.78); border: 1px solid #e2e8f0; color: #475569; font-size: 12px; }
        .apple-health-preview b { color: #111827; }
        .inbody-app-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .inbody-logo-text { margin-right: auto; font-size: 24px; font-weight: 900; color: #1f2937; letter-spacing: -.04em; }
        .inbody-app-chip, .inbody-app-icon { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 999px; background: #fff; color: #374151; font-size: 12px; font-weight: 800; }
        .inbody-app-icon { width: 36px; height: 36px; padding: 0; display: grid; place-items: center; }
        .inbody-app-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; color: #c0c6cf; font-size: clamp(15px, 2.2vw, 24px); text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        .inbody-app-nav b { color: #111827; border-bottom: 4px solid #111827; padding-bottom: 8px; }
        .inbody-app-date { display: grid; grid-template-columns: 28px 1fr 28px 42px; align-items: center; gap: 8px; margin: 14px 0; color: #6b7280; font-weight: 700; }
        .inbody-app-date span { padding: 11px 14px; border-radius: 999px; background: #fff; text-align: center; box-shadow: 0 8px 22px rgba(15,23,42,.06); }
        .inbody-app-date button { border: 0; border-radius: 16px; background: #fff; min-height: 42px; cursor: pointer; box-shadow: 0 8px 22px rgba(15,23,42,.06); }
        .inbody-app-score { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; margin-bottom: 18px; border-radius: 20px; background: #fff; box-shadow: 0 10px 24px rgba(15,23,42,.06); color: #5b6678; }
        .inbody-app-score strong { font-size: 36px; color: #526078; }
        .inbody-app-score small { font-size: 16px; font-weight: 600; }
        .inbody-screen-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 6px; border-radius: 14px; background: #e9edf2; margin-bottom: 10px; }
        .inbody-screen-tabs button { min-height: 48px; border: 0; border-radius: 10px; background: transparent; color: #6b7280; font-weight: 900; cursor: pointer; font-size: 14px; }
        .inbody-screen-tabs button.active { background: #fff; color: #334155; box-shadow: 0 8px 20px rgba(15,23,42,.08), inset 0 -3px 0 var(--screen-accent); }
        .inbody-screen-summary { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; border-left: 4px solid; border-radius: 12px; background: #fff; color: #475569; font-size: 12px; margin-bottom: 10px; }
        .inbody-screen-figure { margin: 0; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; background: #fff; }
        .inbody-screen-figure img { display: block; width: 100%; max-height: 760px; object-fit: contain; object-position: top; background: #fff; }
        .ranking-panel { border-radius: 22px; overflow: hidden; background: #fff; border: 1px solid #e5e7eb; }
        .ranking-hero { padding: 24px 24px 30px; color: #fff; background: linear-gradient(135deg, #ed3d68 0%, #8d358e 100%); }
        .ranking-topline { display: grid; grid-template-columns: 1.1fr repeat(4, minmax(0, .8fr)); align-items: center; gap: 12px; color: rgba(255,255,255,.48); font-size: clamp(14px, 2.3vw, 22px); font-weight: 800; }
        .ranking-logo { justify-self: start; color: #fff; font-size: clamp(22px, 3vw, 34px); font-weight: 950; letter-spacing: -.05em; }
        .ranking-topline b { justify-self: end; padding: 10px 20px; border-radius: 999px; background: #fff; color: #6f287e; }
        .ranking-scoreline { display: flex; justify-content: flex-end; align-items: baseline; gap: 14px; margin-top: 26px; font-size: 20px; font-weight: 700; }
        .ranking-scoreline strong { font-size: clamp(52px, 8vw, 82px); line-height: .9; }
        .ranking-scoreline small { font-size: 20px; margin-left: 6px; }
        .ranking-filter-row { display: flex; align-items: center; justify-content: flex-end; gap: 18px; margin-top: 10px; font-size: clamp(20px, 3vw, 34px); font-weight: 700; }
        .ranking-filter-row button { border: 0; border-radius: 999px; padding: 12px 20px; color: #fff; background: rgba(82, 28, 86, .48); font-size: clamp(14px, 2vw, 22px); cursor: pointer; }
        .ranking-hero p { margin: 26px 0 0 auto; max-width: 760px; text-align: right; font-size: clamp(13px, 1.8vw, 20px); line-height: 1.35; }
        .ranking-pill-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: -22px; position: relative; z-index: 1; }
        .ranking-pill-tabs button { min-height: 70px; border: 0; border-radius: 26px 26px 0 0; background: rgba(176, 69, 148, .74); color: rgba(255,255,255,.42); font-size: clamp(15px, 2.2vw, 28px); font-weight: 900; cursor: pointer; }
        .ranking-pill-tabs button.active { background: #fff; color: #111; }
        .ranking-body-card { padding: 22px 28px 34px; background: #fff; }
        .ranking-info { display: flex; gap: 12px; padding: 18px 22px; border-radius: 18px; background: #f0f2f5; color: #111; font-size: clamp(13px, 1.8vw, 20px); line-height: 1.35; }
        .ranking-info span { width: 24px; height: 24px; display: inline-grid; place-items: center; flex: 0 0 24px; border-radius: 50%; background: #315bd7; color: #fff; font-weight: 900; }
        .ranking-section-heading, .ranking-privacy-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin: 26px 0 12px; color: #4b5563; }
        .ranking-section-heading.secondary { margin-top: 34px; }
        .ranking-section-heading h3, .ranking-privacy-row h3 { margin: 0; max-width: 440px; color: #4b5563; font-size: clamp(20px, 2.8vw, 34px); line-height: 1.1; }
        .ranking-section-heading div { display: flex; gap: 8px; font-size: clamp(14px, 2vw, 22px); white-space: nowrap; }
        .ranking-section-heading b, .ranking-privacy-row b { color: #c72f43; }
        .ranking-list { display: grid; gap: 8px; }
        .ranking-row { display: grid; grid-template-columns: 46px 64px 58px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 72px; color: #4b5563; font-size: clamp(17px, 2.2vw, 28px); }
        .ranking-list.compact .ranking-row { padding: 12px 22px; border-radius: 999px; background: #f4f4f5; }
        .ranking-rank, .ranking-row strong { font-weight: 900; font-size: clamp(22px, 3vw, 38px); }
        .ranking-new { color: #c72f43; font-size: clamp(12px, 1.7vw, 19px); }
        .ranking-avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(#e8e9eb, #ddd); display: grid; place-items: center; color: #bfc3ca; overflow: hidden; }
        .ranking-avatar.photo { background: radial-gradient(circle at 35% 25%, #f6d7a8, #5274c9 44%, #1b2550 70%); }
        .ranking-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ranking-privacy-row { justify-content: flex-start; }
        .ranking-privacy-row h3 { margin-right: auto; color: #374151; }
        .ranking-privacy-row button { width: 86px; height: 44px; border: 0; border-radius: 999px; background: #bf263b; position: relative; }
        .ranking-privacy-row button::after { content: ''; position: absolute; right: 5px; top: 5px; width: 34px; height: 34px; border-radius: 50%; background: #fff; }
        .ranking-empty { margin: 18px -28px 8px; padding: 32px 28px; border-radius: 14px; background: #f8f8f8; color: #94a3b8; font-size: clamp(18px, 2.4vw, 30px); line-height: 1.35; }
        .ranking-connect-btn { width: 100%; margin-top: clamp(22px, 8vw, 120px); min-height: 60px; border: 0; border-radius: 999px; background: #1f2433; color: #fff; font-size: 24px; font-weight: 900; cursor: pointer; }
        .ranking-connect-card { margin-top: 18px; padding: 22px; border-radius: 22px; border: 1px solid #e5e7eb; background: #fff; box-shadow: 0 18px 40px rgba(15,23,42,.08); }
        .ranking-connect-title { display: flex; justify-content: space-between; color: #1f2433; font-size: 18px; }
        .ranking-connect-card h3 { font-size: 24px; margin: 24px 0 16px; }
        .ranking-input { padding: 18px 8px; border-bottom: 1px solid #e5e7eb; color: #c4c7cc; font-size: 20px; }
        .ranking-connect-card button { width: 100%; margin: 18px 0; padding: 16px; border: 0; border-radius: 8px; background: #d69396; color: #fff; font-size: 20px; font-weight: 900; }
        .ranking-connect-card p { text-align: center; color: #8b8b8b; font-size: 20px; padding: 28px 0; }
        .ranking-opt-out { display: inline-block; margin-top: 24px; color: #94a3b8; font-size: 22px; }
        .inbody-reference-details { margin-top: 14px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 16px; background: #f8fafc; }
        .inbody-reference-details summary { cursor: pointer; font-size: 12px; font-weight: 800; color: #475569; }
        .ranking-gallery { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
        .ranking-gallery img { height: clamp(320px, 58vh, 680px); }
        .challenge-panel { padding: 16px; border-radius: 22px; color: #e5f0ff; background: radial-gradient(circle at 20% 0%, rgba(116,58,213,.32), transparent 32%), linear-gradient(135deg, #07111f, #030812 68%, #09061b); border: 1px solid rgba(148,163,184,.22); }
        .challenge-hero { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 16px; padding: 22px; border-radius: 20px; background: rgba(15, 23, 42, .78); border: 1px solid rgba(148,163,184,.18); }
        .challenge-kicker { color: #67e8f9; font-size: 12px; font-weight: 900; letter-spacing: .12em; }
        .challenge-hero h2 { margin: 8px 0; font-size: clamp(28px, 5vw, 52px); line-height: 1; background: linear-gradient(90deg, #64d9ff, #9f5cff, #2dd4bf); -webkit-background-clip: text; color: transparent; }
        .challenge-hero p { max-width: 760px; margin: 0; color: #cbd5e1; line-height: 1.55; }
        .challenge-level-card { padding: 18px; border-radius: 18px; background: linear-gradient(160deg, rgba(79,70,229,.55), rgba(15,23,42,.72)); border: 1px solid rgba(125, 92, 255, .45); }
        .challenge-level-card span, .challenge-level-card small { color: #a5b4fc; font-size: 12px; font-weight: 800; }
        .challenge-level-card b { display: block; margin: 6px 0 12px; font-size: 30px; }
        .challenge-xp { height: 10px; border-radius: 999px; overflow: hidden; background: rgba(148,163,184,.18); }
        .challenge-xp i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #38bdf8, #2dd4bf, #a855f7); }
        .challenge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
        .challenge-card { min-width: 0; padding: 16px; border-radius: 18px; background: rgba(15,23,42,.74); border: 1px solid rgba(148,163,184,.16); box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
        .challenge-card-head { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; }
        .challenge-card-head span { padding: 5px 8px; border-radius: 9px; background: rgba(124,58,237,.22); color: #a78bfa; font-size: 11px; font-weight: 900; }
        .challenge-card-head b { font-size: 16px; }
        .challenge-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .challenge-stats div, .challenge-radar, .leaderboard-mini div { padding: 12px; border-radius: 12px; background: rgba(30,41,59,.64); }
        .challenge-stats small { color: #93c5fd; font-size: 11px; }
        .challenge-stats b { display: block; margin-top: 4px; font-size: 22px; }
        .challenge-radar { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; color: #cbd5e1; font-size: 12px; }
        .upload-flow img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; object-position: top; border-radius: 12px; opacity: .9; border: 1px solid rgba(148,163,184,.18); }
        .upload-flow button, .story button { width: 100%; margin-top: 12px; border: 0; border-radius: 10px; padding: 12px; color: #fff; font-weight: 900; background: linear-gradient(90deg, #2563eb, #7c3aed); }
        .challenge-program { display: grid; grid-template-columns: 34px 1fr auto; gap: 10px; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(148,163,184,.12); }
        .challenge-program div b, .challenge-program div small { display: block; }
        .challenge-program div small { color: #94a3b8; margin: 3px 0 6px; }
        .challenge-program i { display: block; height: 6px; border-radius: 999px; background: rgba(148,163,184,.14); overflow: hidden; }
        .challenge-program em { display: block; height: 100%; background: linear-gradient(90deg, #10b981, #8b5cf6); }
        .challenge-program strong { color: #fbbf24; font-size: 11px; }
        .challenge-task { display: grid; grid-template-columns: 30px 1fr auto 24px; gap: 8px; align-items: center; padding: 9px; border-radius: 10px; margin-bottom: 7px; background: rgba(30,41,59,.58); }
        .challenge-task small { color: #22c55e; }
        .challenge-task em { color: #64748b; font-style: normal; }
        .challenge-task.done em { color: #22c55e; }
        .story-map { display: grid; grid-template-columns: 70px 1fr 70px 1fr 70px; align-items: center; margin: 18px 0; }
        .story-node { display: grid; place-items: center; min-height: 54px; border-radius: 50%; background: rgba(59,130,246,.2); border: 1px solid #38bdf8; color: #e0f2fe; font-weight: 900; font-size: 12px; }
        .story-node.active { box-shadow: 0 0 24px rgba(34,211,238,.35); }
        .story-node.locked { border-color: #64748b; color: #94a3b8; }
        .story-line { height: 2px; background: linear-gradient(90deg, #38bdf8, #8b5cf6); }
        .story p { color: #cbd5e1; }
        .leaderboard-mini div { display: grid; grid-template-columns: 26px 1fr auto; gap: 8px; margin-bottom: 8px; align-items: center; }
        .leaderboard-mini div:nth-child(6) { border: 1px solid rgba(244,114,182,.55); }
        .leaderboard-mini small { color: #c4b5fd; }
        .challenge-reference-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
        .challenge-reference-grid figure { margin: 0; overflow: hidden; border-radius: 16px; border: 1px solid rgba(148,163,184,.22); background: rgba(15,23,42,.86); }
        .challenge-reference-grid img { display: block; width: 100%; max-height: 580px; object-fit: contain; object-position: top; background: #050b17; }
        .challenge-reference-grid figcaption { padding: 10px 12px; color: #cbd5e1; font-size: 12px; font-weight: 800; }
        @media (max-width: 760px) {
          .hero-card { align-items: flex-start; }
          .tab-bar { overflow-x: auto; }
          .tab-btn { min-width: 92px; }
          .inbody-chart-grid { grid-template-columns: 1fr; }
          .inbody-upload-actions { grid-template-columns: 1fr; }
          .inbody-app-header { flex-wrap: wrap; }
          .inbody-app-nav { font-size: 14px; }
          .inbody-app-date { grid-template-columns: 22px 1fr 22px; }
          .inbody-app-date button { grid-column: 1 / -1; }
          .inbody-screen-summary { flex-direction: column; }
          .inbody-reference-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .inbody-reference-gallery { grid-template-columns: 1fr; }
          .inbody-reference-gallery img { height: clamp(420px, 74vh, 980px); }
          .hist-row { flex-wrap: wrap; }
          .ranking-topline { grid-template-columns: 1fr 1fr; font-size: 13px; }
          .ranking-logo { grid-column: 1 / -1; }
          .ranking-topline b { justify-self: stretch; text-align: center; }
          .ranking-scoreline, .ranking-filter-row, .ranking-hero p { justify-content: flex-start; text-align: left; }
          .ranking-filter-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .ranking-pill-tabs { overflow-x: auto; grid-template-columns: repeat(4, minmax(150px, 1fr)); }
          .ranking-body-card { padding: 18px 16px 28px; }
          .ranking-section-heading, .ranking-privacy-row { align-items: flex-start; flex-direction: column; }
          .ranking-row { grid-template-columns: 34px 42px 44px minmax(0, 1fr) auto; min-height: 58px; gap: 7px; }
          .ranking-avatar { width: 42px; height: 42px; }
          .ranking-empty { margin-left: -16px; margin-right: -16px; }
          .challenge-hero, .challenge-grid, .challenge-reference-grid { grid-template-columns: 1fr; }
          .challenge-stats { grid-template-columns: repeat(2, 1fr); }
        }

      `}</style>
    </div>
  );
}
