import React, { createContext, useContext, useState, useEffect } from 'react'
import { FAMILY_MEMBERS_CHANGED_EVENT, FAMILY_USER_STORAGE_KEY, LXK_PATIENT_PROFILE, getFamilyOwnerKey } from '../components/family/familyData.js'

const AuthContext = createContext(null)
const ADMIN_EMAIL = 'khanhlegood1@gmail.com'

// ─── Storage helpers ───────────────────────────────────────────────────────────
const getUsers = () => { try { return JSON.parse(localStorage.getItem('cdoc_users') || '{}') } catch { return {} } }
const saveUsers = (u) => localStorage.setItem('cdoc_users', JSON.stringify(u))
const getSavedSession = () => { try { return JSON.parse(localStorage.getItem('cdoc_session') || 'null') } catch { return null } }
const saveSession = (s) => s ? localStorage.setItem('cdoc_session', JSON.stringify(s)) : localStorage.removeItem('cdoc_session')

// ─── Anonymous UUID: HEALTH-YYYYMMDDhhmmss-XXXXXXXX-SALT ──────────────────────
function generateDeviceSalt() {
  try {
    const stored = localStorage.getItem('cdoc_device_salt')
    if (stored) return stored
    const salt = Math.random().toString(36).substring(2, 6).toUpperCase()
    localStorage.setItem('cdoc_device_salt', salt)
    return salt
  } catch { return 'D0' + Math.random().toString(36).substring(2, 4).toUpperCase() }
}

export function generateAnonymousUUID() {
  const now = new Date()
  const pad = (n, d = 2) => String(n).padStart(d, '0')
  const timestamp =
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  const random8 = Math.floor(10000000 + Math.random() * 89999999)
  const salt = generateDeviceSalt()
  return `HEALTH-${timestamp}-${random8}-${salt}`
}

function getOrCreateAnonUUID() {
  try {
    const stored = localStorage.getItem('cdoc_anon_uuid')
    if (stored) return stored
    const uuid = generateAnonymousUUID()
    localStorage.setItem('cdoc_anon_uuid', uuid)
    return uuid
  } catch { return generateAnonymousUUID() }
}

// ─── Family sync helper ────────────────────────────────────────────────────────
const syncPrimaryPatientNameInFamilyTree = (email, name, avatar = '') => {
  const patientName = String(name || '').trim()
  const patientAvatar = String(avatar || '').trim()
  if (!email || (!patientName && !patientAvatar)) return
  try {
    const ownerKey = getFamilyOwnerKey(email)
    const byUser = JSON.parse(localStorage.getItem(FAMILY_USER_STORAGE_KEY) || '{}')
    const userPatients = byUser[ownerKey]
    const members = userPatients?.['LXK-2024']
    if (!Array.isArray(members)) return

    let changed = false
    const nextMembers = members.map(member => {
      if (member?.relation !== 'self' && member?.id !== LXK_PATIENT_PROFILE.id) return member
      const nextName = patientName || member.name
      const nextAvatar = patientAvatar || member.avatar_url
      if (member.name === nextName && member.avatar_url === nextAvatar && member.medicalRecord?.name === nextName && member.medicalRecord?.avatar_url === nextAvatar) return member
      changed = true
      return {
        ...member, name: nextName,
        ...(nextAvatar ? { avatar_url: nextAvatar } : {}),
        medicalRecord: member.medicalRecord ? {
          ...member.medicalRecord, name: nextName,
          avatar_initials: nextName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase(),
          ...(nextAvatar ? { avatar_url: nextAvatar } : {}),
        } : member.medicalRecord,
      }
    })
    if (!changed) return
    byUser[ownerKey] = { ...userPatients, 'LXK-2024': nextMembers }
    localStorage.setItem(FAMILY_USER_STORAGE_KEY, JSON.stringify(byUser))
    window.dispatchEvent(new CustomEvent(FAMILY_MEMBERS_CHANGED_EVENT, { detail: { patientId: 'LXK-2024', ownerId: ownerKey } }))
  } catch (e) { console.error('Profile-to-family sync error:', e) }
}

// ─── OAuth simulations ─────────────────────────────────────────────────────────
function simulateGoogleOAuth(hint = null) {
  if (hint === ADMIN_EMAIL) {
    return { email: ADMIN_EMAIL, name: 'Lê Xuân Khánh', given_name: 'Khánh', family_name: 'Lê', picture: `https://ui-avatars.com/api/?name=Le+Xuan+Khanh&background=00b8cc&color=fff&size=128&bold=true&rounded=true`, provider: 'google', email_verified: true, locale: 'vi' }
  }
  return { email: 'nguyen.demo@gmail.com', name: 'Nguyễn Văn Demo', given_name: 'Demo', family_name: 'Nguyễn', picture: `https://ui-avatars.com/api/?name=Nguyen+Demo&background=4285F4&color=fff&size=128&bold=true&rounded=true`, provider: 'google', email_verified: true, locale: 'vi' }
}
function simulateAppleOAuth() {
  return { email: 'user@icloud.com', name: 'Apple User', given_name: 'Apple', family_name: 'User', picture: `https://ui-avatars.com/api/?name=Apple+User&background=1c1c1e&color=fff&size=128&bold=true&rounded=true`, provider: 'apple', email_verified: true, locale: 'vi' }
}

function seedAdmin() {
  const users = getUsers()
  if (!users[ADMIN_EMAIL]) {
    const googleProfile = simulateGoogleOAuth(ADMIN_EMAIL)
    users[ADMIN_EMAIL] = { email: ADMIN_EMAIL, name: googleProfile.name, given_name: googleProfile.given_name, family_name: googleProfile.family_name, avatar: googleProfile.picture, googleAvatar: googleProfile.picture, provider: 'google', password: 'admin123', specialty: 'Quản trị hệ thống', phone: '', profileComplete: true, createdAt: '2024-01-01T00:00:00.000Z', patients: [], records: [] }
    saveUsers(users)
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)

  useEffect(() => {
    seedAdmin()
    const session = getSavedSession()
    if (session) {
      if (session.isAnonymous) {
        // Restore anonymous guest session
        const anon = buildAnonUser(session.anonUUID || getOrCreateAnonUUID())
        setUser(anon)
      } else {
        const users = getUsers()
        if (users[session.email]) {
          setUser({ ...users[session.email], isAdmin: session.email === ADMIN_EMAIL })
        }
      }
    }
    setLoading(false)
  }, [])

  // Build a guest user object from a UUID
  function buildAnonUser(uuid) {
    const stored = (() => { try { return JSON.parse(localStorage.getItem('cdoc_anon_profile') || 'null') } catch { return null } })()
    return {
      isAnonymous: true,
      anonUUID: uuid,
      name: stored?.name || 'Guest Explorer',
      avatar: stored?.avatar || `https://ui-avatars.com/api/?name=Guest+Explorer&background=2d8a5e&color=fff&size=128&bold=true&rounded=true`,
      level: stored?.level || 1,
      journeyProgress: stored?.journeyProgress || 0,
      achievements: stored?.achievements || 0,
      email: null,
      provider: null,
      isAdmin: false,
      createdAt: stored?.createdAt || new Date().toISOString(),
    }
  }

  const _finalize = (u) => {
    const enriched = { ...u, isAdmin: u.email === ADMIN_EMAIL }
    setUser(enriched)
    saveSession({ email: u.email })
    return enriched
  }

  const _upsertOAuth = (oauthProfile, anonUUID = null) => {
    const users = getUsers()
    const existing = users[oauthProfile.email]

    if (!existing) {
      const newUser = {
        email: oauthProfile.email, name: oauthProfile.name,
        given_name: oauthProfile.given_name, family_name: oauthProfile.family_name,
        avatar: oauthProfile.picture, googleAvatar: oauthProfile.picture,
        provider: oauthProfile.provider, email_verified: oauthProfile.email_verified,
        locale: oauthProfile.locale || 'vi', specialty: '', phone: '',
        profileComplete: false, password: null, patients: [], records: [],
        createdAt: new Date().toISOString(),
        // Preserve old anon UUID for reference
        upgradedFromUUID: anonUUID || null,
        linkedProviders: [oauthProfile.provider],
      }
      users[oauthProfile.email] = newUser
      saveUsers(users)
      setNeedsProfileSetup(true)
      return _finalize(newUser)
    } else {
      const refreshed = {
        ...existing,
        googleAvatar: oauthProfile.provider === 'google' ? oauthProfile.picture : existing.googleAvatar,
        avatar: existing.avatarCustomized ? existing.avatar : oauthProfile.picture,
        // Add provider to linked list if not already there
        linkedProviders: Array.from(new Set([...(existing.linkedProviders || [existing.provider]), oauthProfile.provider])),
        upgradedFromUUID: existing.upgradedFromUUID || anonUUID || null,
      }
      users[oauthProfile.email] = refreshed
      saveUsers(users)
      return _finalize(refreshed)
    }
  }

  // ─── Public auth methods ───────────────────────────────────────────────────

  /** Start as anonymous guest — no login required */
  const loginAsGuest = () => {
    const uuid = getOrCreateAnonUUID()
    const anonUser = buildAnonUser(uuid)
    setUser(anonUser)
    saveSession({ isAnonymous: true, anonUUID: uuid })
    return anonUser
  }

  const loginWithGoogle = async (adminHint = null) => {
    const profile = simulateGoogleOAuth(adminHint)
    // Carry over anon UUID if currently a guest
    const anonUUID = user?.isAnonymous ? user.anonUUID : null
    if (user?.isAnonymous) {
      // Clear anon session so upgrade flow is clean
      localStorage.removeItem('cdoc_anon_uuid')
      localStorage.removeItem('cdoc_anon_profile')
    }
    return _upsertOAuth(profile, anonUUID)
  }

  const loginWithApple = async () => {
    const profile = simulateAppleOAuth()
    const anonUUID = user?.isAnonymous ? user.anonUUID : null
    if (user?.isAnonymous) {
      localStorage.removeItem('cdoc_anon_uuid')
      localStorage.removeItem('cdoc_anon_profile')
    }
    return _upsertOAuth(profile, anonUUID)
  }

  const loginWithEmail = async (email, password, name = null) => {
    const users = getUsers()
    if (name) {
      if (users[email]) throw new Error('Email đã tồn tại. Vui lòng đăng nhập.')
      const anonUUID = user?.isAnonymous ? user.anonUUID : null
      const u = {
        email, name,
        given_name: name.split(' ').pop(), family_name: name.split(' ').slice(0, -1).join(' '),
        password, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6b3fd4&color=fff&size=128&bold=true&rounded=true`,
        googleAvatar: null, provider: 'email', specialty: '', phone: '',
        profileComplete: false, patients: [], records: [],
        createdAt: new Date().toISOString(),
        upgradedFromUUID: anonUUID || null,
        linkedProviders: ['email'],
      }
      users[email] = u
      saveUsers(users)
      if (user?.isAnonymous) { localStorage.removeItem('cdoc_anon_uuid'); localStorage.removeItem('cdoc_anon_profile') }
      setNeedsProfileSetup(true)
      return _finalize(u)
    } else {
      const u = users[email]
      if (!u) throw new Error('Tài khoản không tồn tại')
      if (u.password !== password) throw new Error('Sai mật khẩu')
      return _finalize(u)
    }
  }

  /** Connect an additional provider (Google or Apple) to existing real account */
  const linkProvider = async (provider) => {
    if (!user || user.isAnonymous) return
    const profile = provider === 'google' ? simulateGoogleOAuth() : simulateAppleOAuth()
    const users = getUsers()
    const updated = {
      ...users[user.email],
      linkedProviders: Array.from(new Set([...(users[user.email]?.linkedProviders || [user.provider]), provider])),
      googleAvatar: provider === 'google' ? profile.picture : users[user.email]?.googleAvatar,
    }
    users[user.email] = updated
    saveUsers(users)
    setUser({ ...updated, isAdmin: user.isAdmin })
  }

  /** Disconnect a provider from the account */
  const unlinkProvider = async (provider) => {
    if (!user || user.isAnonymous) return
    const users = getUsers()
    const existing = users[user.email]
    if (!existing) return
    const updated = {
      ...existing,
      linkedProviders: (existing.linkedProviders || [existing.provider]).filter(p => p !== provider),
    }
    users[user.email] = updated
    saveUsers(users)
    setUser({ ...updated, isAdmin: user.isAdmin })
  }

  const logout = () => {
    setUser(null)
    setNeedsProfileSetup(false)
    saveSession(null)
    // Clear anon profile on explicit logout
    localStorage.removeItem('cdoc_anon_uuid')
    localStorage.removeItem('cdoc_anon_profile')
  }

  const updateProfile = (updates) => {
    if (user?.isAnonymous) {
      // For anonymous users, persist optional profile info locally
      const stored = { name: updates.name, avatar: updates.avatar, level: user.level, journeyProgress: user.journeyProgress, achievements: user.achievements, createdAt: user.createdAt }
      try { localStorage.setItem('cdoc_anon_profile', JSON.stringify(stored)) } catch {}
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      return updatedUser
    }
    const users = getUsers()
    const existingUser = users[user.email] || {}
    const hasCustomAvatar = updates.avatar && updates.avatar !== existingUser.googleAvatar
    const avatarCustomized = typeof updates.avatarCustomized === 'boolean'
      ? updates.avatarCustomized
      : hasCustomAvatar || existingUser.avatarCustomized || false
    const updated = { ...existingUser, ...updates, avatarCustomized, profileComplete: true }
    users[user.email] = updated
    saveUsers(users)
    syncPrimaryPatientNameInFamilyTree(user.email, updated.name, updated.avatar)
    const enriched = { ...updated, isAdmin: user.isAdmin }
    setUser(enriched)
    return enriched
  }

  const dismissProfileSetup = () => {
    setNeedsProfileSetup(false)
    const users = getUsers()
    if (users[user?.email]) {
      users[user.email].profileComplete = true
      saveUsers(users)
      setUser(u => ({ ...u, profileComplete: true }))
    }
  }

  const getAllUsers = () => Object.values(getUsers()).map(u => ({ ...u, isAdmin: u.email === ADMIN_EMAIL }))
  const getPatients = () => { try { return JSON.parse(localStorage.getItem('cdoc_patients') || '[]') } catch { return [] } }
  const savePatient = (patient) => {
    const patients = getPatients()
    const idx = patients.findIndex(p => p.id === patient.id)
    if (idx >= 0) patients[idx] = patient; else patients.push(patient)
    localStorage.setItem('cdoc_patients', JSON.stringify(patients))
  }
  const getMedicalRecords = (patientId) => {
    try { const all = JSON.parse(localStorage.getItem('cdoc_records') || '[]'); return patientId ? all.filter(r => r.patientId === patientId) : all } catch { return [] }
  }
  const saveMedicalRecord = (record) => {
    const records = getMedicalRecords()
    records.push({ ...record, id: `R-${Date.now()}`, createdAt: new Date().toISOString(), uploadedBy: user?.email })
    localStorage.setItem('cdoc_records', JSON.stringify(records))
    return records[records.length - 1]
  }

  return (
    <AuthContext.Provider value={{
      user, loading,
      needsProfileSetup, dismissProfileSetup,
      loginAsGuest, loginWithGoogle, loginWithApple, loginWithEmail,
      linkProvider, unlinkProvider,
      logout, updateProfile,
      getAllUsers, getPatients, savePatient, getMedicalRecords, saveMedicalRecord,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
