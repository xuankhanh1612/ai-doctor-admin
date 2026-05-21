import React, { createContext, useContext, useState, useEffect } from 'react'

const AppContext = createContext(null)

export const TRANSLATIONS = {
  vi: {
    appName: 'Consensus Doctor',
    tagline: 'Nền tảng AI Y tế · Digital Twin Bệnh nhân',
    login: 'Đăng nhập',
    register: 'Đăng ký',
    logout: 'Đăng xuất',
    email: 'Email',
    password: 'Mật khẩu',
    name: 'Họ và tên',
    continueGoogle: 'Tiếp tục với Google',
    continueApple: 'Tiếp tục với Apple',
    orEmail: 'Hoặc dùng email',
    noAccount: 'Chưa có tài khoản?',
    hasAccount: 'Đã có tài khoản?',
    welcome: 'Xin chào',
    dashboard: 'Tổng quan',
    patients: 'Bệnh nhân',
    imaging: 'Chẩn đoán hình ảnh',
    checkin: 'Kiểm tra triệu chứng',
    twin: 'Digital Twin',
    simulation: 'Mô phỏng điều trị',
    consensus: 'Đồng thuận AI',
    adminPanel: 'Quản trị hệ thống',
    familyTree: 'Gia phả bệnh lý',
    uploadRecords: 'Tải lên hồ sơ',
    addPatient: 'Thêm bệnh nhân',
    allPatients: 'Tất cả bệnh nhân',
    medicalHistory: 'Lịch sử bệnh án',
    recommendations: 'Gợi ý xét nghiệm',
    darkMode: 'Chế độ tối',
    lightMode: 'Chế độ sáng',
    language: 'Ngôn ngữ',
    profile: 'Hồ sơ cá nhân',
    agentsActive: 'AGENT ĐANG HOẠT ĐỘNG',
    next: 'Tiếp theo',
    back: 'Quay lại',
    save: 'Lưu',
    cancel: 'Hủy',
    upload: 'Tải lên',
    uploadFile: 'Chọn hoặc kéo thả file',
    uploadTypes: 'Hỗ trợ: DICOM, PDF, JPEG, PNG, DOCX',
    familyRelation: 'Quan hệ',
    addFamilyMember: 'Thêm thành viên',
    aiSuggestion: 'Gợi ý AI',
    testSuggestion: 'Xét nghiệm được gợi ý',
    confidence: 'Độ tin cậy',
    allUsers: 'Tất cả người dùng',
    allRecords: 'Tất cả hồ sơ',
    activityLog: 'Nhật ký hoạt động',
    adminOnly: 'Chỉ dành cho quản trị viên',
    loginRequired: 'Vui lòng đăng nhập để tiếp tục',
    patientProgress: 'Tiến triển bệnh',
    uploadSuccess: 'Tải lên thành công',
    relation_self: 'Bản thân',
    relation_father: 'Cha',
    relation_mother: 'Mẹ',
    relation_sibling: 'Anh/Chị/Em',
    relation_child: 'Con',
    relation_spouse: 'Vợ/Chồng',
    relation_grandparent: 'Ông/Bà',
  },
  en: {
    appName: 'Consensus Doctor',
    tagline: 'Medical AI Platform · Patient Digital Twin',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    name: 'Full Name',
    continueGoogle: 'Continue with Google',
    continueApple: 'Continue with Apple',
    orEmail: 'Or use email',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    welcome: 'Welcome',
    dashboard: 'Dashboard',
    patients: 'Patients',
    imaging: 'Imaging Analysis',
    checkin: 'Symptom Check-in',
    twin: 'Digital Twin',
    simulation: 'Treatment Simulation',
    consensus: 'AI Consensus',
    adminPanel: 'Admin Panel',
    familyTree: 'Family Medical Tree',
    uploadRecords: 'Upload Records',
    addPatient: 'Add Patient',
    allPatients: 'All Patients',
    medicalHistory: 'Medical History',
    recommendations: 'Test Recommendations',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    language: 'Language',
    profile: 'Profile',
    agentsActive: 'AGENTS ACTIVE',
    next: 'Next',
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    upload: 'Upload',
    uploadFile: 'Select or drag & drop file',
    uploadTypes: 'Supported: DICOM, PDF, JPEG, PNG, DOCX',
    familyRelation: 'Relation',
    addFamilyMember: 'Add Member',
    aiSuggestion: 'AI Suggestion',
    testSuggestion: 'Suggested Tests',
    confidence: 'Confidence',
    allUsers: 'All Users',
    allRecords: 'All Records',
    activityLog: 'Activity Log',
    adminOnly: 'Admin Access Only',
    loginRequired: 'Please login to continue',
    patientProgress: 'Disease Progress',
    uploadSuccess: 'Upload Successful',
    relation_self: 'Self',
    relation_father: 'Father',
    relation_mother: 'Mother',
    relation_sibling: 'Sibling',
    relation_child: 'Child',
    relation_spouse: 'Spouse',
    relation_grandparent: 'Grandparent',
  }
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('cdoc_theme') || 'dark')
  const [lang, setLang] = useState(() => localStorage.getItem('cdoc_lang') || 'vi')

  useEffect(() => {
    localStorage.setItem('cdoc_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('cdoc_lang', lang)
  }, [lang])

  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['vi'][key] || key

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <AppContext.Provider value={{ theme, toggleTheme, lang, setLang, t }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
