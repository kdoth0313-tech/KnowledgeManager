import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const AUTH_KEY = 'km-auth'
const HASH_KEY = 'km-pwd-hash'

/**
 * Simple SHA-256 hashing using the Web Crypto API.
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(sessionStorage.getItem(AUTH_KEY) === '1')

  /** True if no password has been set up yet (first-time user) */
  const isSetup = computed(() => {
    return localStorage.getItem(HASH_KEY) !== null
  })

  async function setupPassword(password: string): Promise<boolean> {
    if (password.length < 4) return false
    const hash = await sha256(password)
    localStorage.setItem(HASH_KEY, hash)
    sessionStorage.setItem(AUTH_KEY, '1')
    isAuthenticated.value = true
    return true
  }

  async function login(password: string): Promise<boolean> {
    const storedHash = localStorage.getItem(HASH_KEY)
    if (!storedHash) return false
    const hash = await sha256(password)
    if (hash !== storedHash) return false
    sessionStorage.setItem(AUTH_KEY, '1')
    isAuthenticated.value = true
    return true
  }

  function logout(): void {
    sessionStorage.removeItem(AUTH_KEY)
    isAuthenticated.value = false
  }

  return { isAuthenticated, isSetup, setupPassword, login, logout }
})
