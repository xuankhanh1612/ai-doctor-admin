import React, { createContext, useContext, useState, useEffect } from 'react'
import { FAMILY_MEMBERS_CHANGED_EVENT, FAMILY_USER_STORAGE_KEY, LXK_PATIENT_PROFILE, getFamilyOwnerKey } from '../components/family/familyData.js'
import { getAnonSession, saveAnonSession, clearAllGuestData } from '../lib/anonDB.js'

const AuthContext = createContext(null)
const ADMIN_EMAIL = 'khanhlegood1@gmail.com'

const getUsers = () => { try { return JSON.parse(localStorage.getItem('cdoc_users') || '{}') } catch { return {} } }
const saveUsers = (u) => localStorage.setItem('cdoc_users', JSON.stringify(u))
const getSavedSession = () => { try { return JSON.parse(localStorage.getItem('cdoc_session') || 'null') } catch { return null } }
const saveSession = (s) => s ? localStorage.setItem('cdoc_session', JSON.stringify(s)) : localStorage.removeItem('cdoc_session')

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
        ...member,
        name: nextName,
        ...(nextAvatar ? { avatar_url: nextAvatar } : {}),
        medicalRecord: member.medicalRecord ? {
          ...member.medicalRecord,
          name: nextName,
          avatar_initials: nextName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase(),
          ...(nextAvatar ? { avatar_url: nextAvatar } : {}),
        } : member.medicalRecord,
      }
    })
    if (!changed) return

    byUser[ownerKey] = { ...userPatients, 'LXK-2024': nextMembers }
    localStorage.setItem(FAMILY_USER_STORAGE_KEY, JSON.stringify(byUser))
    window.dispatchEvent(new CustomEvent(FAMILY_MEMBERS_CHANGED_EVENT, {
      detail: { patientId: 'LXK-2024', ownerId: ownerKey },
    }))
  } catch (e) { console.error('Profile-to-family sync error:', e) }
}

// Simulate Google OAuth — in production replace with real Google Sign-In SDK
// Returns a profile object mimicking what Google's ID token gives you
// ─── Google Identity Services (real OAuth popup) ──────────────────────────────
// Replace VITE_GOOGLE_CLIENT_ID in your .env with your actual OAuth 2.0 Client ID
// from https://console.cloud.google.com → APIs & Services → Credentials
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function googleOAuthPopup() {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_CLIENT_ID chưa được cấu hình trong file .env'))
      return
    }

    // Wait for GSI library to load
    const tryInit = (retries = 20) => {
      if (typeof window.google === 'undefined' || !window.google?.accounts?.oauth2) {
        if (retries <= 0) { reject(new Error('Google Identity Services chưa tải xong')); return }
        setTimeout(() => tryInit(retries - 1), 200)
        return
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error))
            return
          }
          try {
            // Fetch real user profile from Google People API
            const res = await fetch(
              `https://www.googleapis.com/oauth2/v3/userinfo`,
              { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
            )
            if (!res.ok) throw new Error('Không lấy được thông tin tài khoản Google')
            const info = await res.json()
            resolve({
              email: info.email,
              name: info.name,
              given_name: info.given_name || '',
              family_name: info.family_name || '',
              picture: info.picture || '',
              provider: 'google',
              email_verified: info.email_verified ?? true,
              locale: info.locale || 'vi',
            })
          } catch (err) {
            reject(err)
          }
        },
        error_callback: (err) => {
          // User closed popup or denied permission — treat as cancellation
          reject(new Error(err?.message || 'Đăng nhập Google bị huỷ'))
        },
      })
      client.requestAccessToken({ prompt: 'select_account' })
    }

    tryInit()
  })
}

function simulateAppleOAuth() {
  return {
    email: 'user@icloud.com',
    name: 'Apple User',
    given_name: 'Apple',
    family_name: 'User',
    picture: `https://ui-avatars.com/api/?name=Apple+User&background=1c1c1e&color=fff&size=128&bold=true&rounded=true`,
    provider: 'apple',
    email_verified: true,
    locale: 'vi',
  }
}

// ─── Anonymous UUID Generator ─────────────────────────────────────────────────
// Format: HEALTH-YYYYMMDDhhmmss-XXXXXXXX-SALT
// SALT = short hash derived from browser fingerprint (userAgent + screen + timezone)
function generateAnonUUID() {
  const now = new Date()
  const pad = (n, l = 2) => String(n).padStart(l, '0')
  const timestamp =
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  const random = Math.floor(10000000 + Math.random() * 90000000) // 8 digits
  // Device salt: simple non-cryptographic fingerprint
  const raw = `${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0 }
  const salt = Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)
  return `HEALTH-${timestamp}-${random}-${salt}`
}




  const users = getUsers()
  if (!users[ADMIN_EMAIL]) {
    const adminName = 'Lê Xuân Khánh'
    const adminAvatar = `https://ui-avatars.com/api/?name=Le+Xuan+Khanh&background=00b8cc&color=fff&size=128&bold=true&rounded=true`
    users[ADMIN_EMAIL] = {
      email: ADMIN_EMAIL,
      name: adminName,
      given_name: 'Khánh',
      family_name: 'Lê',
      // Use Google avatar as default — user can change later
      avatar: adminAvatar,
      googleAvatar: adminAvatar, // keep original Google avatar
      provider: 'google',
      password: 'admin123',
      specialty: 'Quản trị hệ thống',
      phone: '',
      profileComplete: true, // admin profile pre-seeded
      createdAt: '2024-01-01T00:00:00.000Z',
      patients: [],
      records: [],
    }
    saveUsers(users)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // needsProfileSetup = true right after first OAuth login, triggers setup modal
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)

  useEffect(() => {
    const init = async () => {
      seedAdmin()
      // 1. Restore named session first
      const session = getSavedSession()
      if (session) {
        const users = getUsers()
        if (users[session.email]) {
          setUser({ ...users[session.email], isAdmin: session.email === ADMIN_EMAIL })
          setLoading(false)
          return
        }
      }
      // 2. Restore anonymous session from IndexedDB
      try {
        const anon = await getAnonSession()
        if (anon?.anonUUID) {
          setUser({ ...anon, isAnonymous: true, isAdmin: false })
        }
      } catch (e) {
        console.warn('anonDB restore failed, falling back to localStorage', e)
      }
      setLoading(false)
    }
    init()
  }, [])

  // Enrich and save a new or returning user, then set as current session
  const _finalize = (u) => {
    const enriched = { ...u, isAdmin: u.email === ADMIN_EMAIL }
    setUser(enriched)
    saveSession({ email: u.email })
    return enriched
  }

  // Create user from OAuth profile if first time, else merge only non-overridable fields
  const _upsertOAuth = (oauthProfile) => {
    const users = getUsers()
    const existing = users[oauthProfile.email]

    if (!existing) {
      // First-time login: seed from Google/Apple profile
      const newUser = {
        email: oauthProfile.email,
        name: oauthProfile.name,                  // from Google
        given_name: oauthProfile.given_name,
        family_name: oauthProfile.family_name,
        avatar: oauthProfile.picture,             // Google photo
        googleAvatar: oauthProfile.picture,       // keep original; used in profile UI
        provider: oauthProfile.provider,
        email_verified: oauthProfile.email_verified,
        locale: oauthProfile.locale || 'vi',
        specialty: '',
        phone: '',
        profileComplete: false,                   // trigger profile-setup prompt
        password: null,
        patients: [],
        records: [],
        createdAt: new Date().toISOString(),
      }
      users[oauthProfile.email] = newUser
      saveUsers(users)
      setNeedsProfileSetup(true)              // show profile setup after login
      return _finalize(newUser)
    } else {
      // Returning user: refresh Google avatar in case it changed, but keep custom name if set
      const refreshed = {
        ...existing,
        googleAvatar: oauthProfile.picture,   // always sync latest Google photo
        // Only update avatar if user hasn't customised it
        avatar: existing.avatarCustomized ? existing.avatar : oauthProfile.picture,
      }
      users[oauthProfile.email] = refreshed
      saveUsers(users)
      return _finalize(refreshed)
    }
  }

  // ── Anonymous login: no account needed, progress stored in IndexedDB ────────
  const loginAnonymous = async () => {
    // Reuse existing anon session if present (same device)
    try {
      const existing = await getAnonSession()
      if (existing?.anonUUID) {
        const anonUser = { ...existing, isAnonymous: true, isAdmin: false }
        setUser(anonUser)
        return anonUser
      }
    } catch (e) {
      console.warn('anonDB read failed', e)
    }
    const uuid = generateAnonUUID()
    const anonUser = {
      anonUUID: uuid,
      name: 'Guest Explorer',
      email: null,
      provider: 'anonymous',
      isAnonymous: true,
      isAdmin: false,
      avatar: null,
      createdAt: new Date().toISOString(),
    }
    try {
      await saveAnonSession(anonUser)
    } catch (e) {
      console.warn('anonDB write failed, session will not persist', e)
    }
    setUser(anonUser)
    return anonUser
  }

  const loginWithGoogle = async (adminHint = null) => {
    // adminHint kept for backward-compat but real OAuth always opens popup
    const profile = await googleOAuthPopup()
    return _upsertOAuth(profile)
  }

  const loginWithApple = async () => {
    const profile = simulateAppleOAuth()
    return _upsertOAuth(profile)
  }

  const loginWithEmail = async (email, password, name = null) => {
    const users = getUsers()
    if (name) {
      // Register
      if (users[email]) throw new Error('Email đã tồn tại. Vui lòng đăng nhập.')
      const u = {
        email, name,
        given_name: name.split(' ').pop(),
        family_name: name.split(' ').slice(0, -1).join(' '),
        password,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6b3fd4&color=fff&size=128&bold=true&rounded=true`,
        googleAvatar: null,
        provider: 'email',
        specialty: '',
        phone: '',
        profileComplete: false,
        patients: [], records: [],
        createdAt: new Date().toISOString(),
      }
      users[email] = u
      saveUsers(users)
      setNeedsProfileSetup(true)
      return _finalize(u)
    } else {
      // Login
      const u = users[email]
      if (!u) throw new Error('Tài khoản không tồn tại')
      if (u.password !== password) throw new Error('Sai mật khẩu')
      return _finalize(u)
    }
  }

  const logout = () => {
    setUser(null)
    setNeedsProfileSetup(false)
    saveSession(null)
    // Clear IndexedDB guest data asynchronously (fire-and-forget on logout)
    clearAllGuestData().catch(e => console.warn('anonDB clear failed', e))
  }

  // Called from ProfileSetupModal or Settings when user updates their info
  const updateProfile = (updates) => {
    const users = getUsers()
    const existingUser = users[user.email] || {}
    const hasCustomAvatar = updates.avatar && updates.avatar !== existingUser.googleAvatar
    const avatarCustomized = typeof updates.avatarCustomized === 'boolean'
      ? updates.avatarCustomized
      : hasCustomAvatar || existingUser.avatarCustomized || false
    const updated = {
      ...existingUser,
      ...updates,
      avatarCustomized,
      profileComplete: true,
    }
    users[user.email] = updated
    saveUsers(users)
    syncPrimaryPatientNameInFamilyTree(user.email, updated.name, updated.avatar)
    const enriched = { ...updated, isAdmin: user.isAdmin }
    setUser(enriched)
    return enriched
  }

  const dismissProfileSetup = () => {
    setNeedsProfileSetup(false)
    // Mark profile as "seen" so we don't re-prompt on refresh
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
    try {
      const all = JSON.parse(localStorage.getItem('cdoc_records') || '[]')
      return patientId ? all.filter(r => r.patientId === patientId) : all
    } catch { return [] }
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
      loginWithGoogle, loginWithApple, loginWithEmail, loginAnonymous,
      logout, updateProfile,
      getAllUsers, getPatients, savePatient, getMedicalRecords, saveMedicalRecord,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
