import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)
const ADMIN_EMAIL = 'khanhlegood1@gmail.com'
const getUsers = () => { try { return JSON.parse(localStorage.getItem('cdoc_users') || '{}') } catch { return {} } }
const saveUsers = (u) => localStorage.setItem('cdoc_users', JSON.stringify(u))
const getSavedSession = () => { try { return JSON.parse(localStorage.getItem('cdoc_session') || 'null') } catch { return null } }
const saveSession = (s) => s ? localStorage.setItem('cdoc_session', JSON.stringify(s)) : localStorage.removeItem('cdoc_session')

function seedAdmin() {
  const users = getUsers()
  if (!users[ADMIN_EMAIL]) {
    users[ADMIN_EMAIL] = { email: ADMIN_EMAIL, name: 'Lê Xuân Khánh', password: 'admin123', avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=khanh`, provider: 'email', createdAt: '2024-01-01T00:00:00.000Z', patients: [], records: [] }
    saveUsers(users)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    seedAdmin()
    const session = getSavedSession()
    if (session) { const users = getUsers(); if (users[session.email]) setUser({ ...users[session.email], isAdmin: session.email === ADMIN_EMAIL }) }
    setLoading(false)
  }, [])
  const _finalize = (u) => { const enriched = { ...u, isAdmin: u.email === ADMIN_EMAIL }; setUser(enriched); saveSession({ email: u.email }); return enriched }
  const _upsert = (providerUser) => { const users = getUsers(); if (!users[providerUser.email]) { users[providerUser.email] = { ...providerUser, patients: [], records: [], createdAt: new Date().toISOString() }; saveUsers(users) } return _finalize(users[providerUser.email]) }
  const loginWithGoogle = async () => _upsert({ email: 'demo.google@gmail.com', name: 'Nguyễn Demo Google', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=googlevn', provider: 'google', password: null })
  const loginWithApple = async () => _upsert({ email: 'demo.apple@icloud.com', name: 'Trần Demo Apple', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=applevn', provider: 'apple', password: null })
  const loginWithEmail = async (email, password, name = null) => {
    const users = getUsers()
    if (name) { if (users[email]) throw new Error('Email đã tồn tại. Vui lòng đăng nhập.'); const u = { email, name, password, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`, provider: 'email', patients: [], records: [], createdAt: new Date().toISOString() }; users[email] = u; saveUsers(users); return _finalize(u) }
    else { const u = users[email]; if (!u) throw new Error('Tài khoản không tồn tại'); if (u.password !== password) throw new Error('Sai mật khẩu'); return _finalize(u) }
  }
  const logout = () => { setUser(null); saveSession(null) }
  const updateProfile = (updates) => { const users = getUsers(); const updated = { ...users[user.email], ...updates }; users[user.email] = updated; saveUsers(users); setUser({ ...updated, isAdmin: user.isAdmin }) }
  const getAllUsers = () => Object.values(getUsers()).map(u => ({ ...u, isAdmin: u.email === ADMIN_EMAIL }))
  const getPatients = () => { try { return JSON.parse(localStorage.getItem('cdoc_patients') || '[]') } catch { return [] } }
  const savePatient = (patient) => { const patients = getPatients(); const idx = patients.findIndex(p => p.id === patient.id); if (idx >= 0) patients[idx] = patient; else patients.push(patient); localStorage.setItem('cdoc_patients', JSON.stringify(patients)) }
  const getMedicalRecords = (patientId) => { try { const all = JSON.parse(localStorage.getItem('cdoc_records') || '[]'); return patientId ? all.filter(r => r.patientId === patientId) : all } catch { return [] } }
  const saveMedicalRecord = (record) => { const records = getMedicalRecords(); records.push({ ...record, id: `R-${Date.now()}`, createdAt: new Date().toISOString(), uploadedBy: user?.email }); localStorage.setItem('cdoc_records', JSON.stringify(records)); return records[records.length - 1] }
  return <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithApple, loginWithEmail, logout, updateProfile, getAllUsers, getPatients, savePatient, getMedicalRecords, saveMedicalRecord }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
