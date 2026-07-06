import { create } from 'zustand'
import { authApi, userApi } from '../lib/api'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  timezone?: string
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null

  register: (name: string, email: string, password: string, phone: string) => Promise<void>
  verifyNumber: (phone: string, otp: string) => Promise<void>
  login: (phone: string, password: string) => Promise<void>
  generateOtp: (phone: string) => Promise<void>
  loginWithOtp: (phone: string, otp: string) => Promise<void>
  forgotPassword: (phone: string) => Promise<void>
  resetPassword: (phone: string, otp: string, newPassword: string) => Promise<void>
  logout: () => void
  fetchProfile: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('echo_token'),
  isLoading: false,
  error: null,

  register: async (name, email, password, phone) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.register(name, email, password, phone)
      set({ isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Registration failed' })
      throw err
    }
  },

  verifyNumber: async (phone, otp) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.verifyNumber(phone, otp)
      set({ isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Verification failed' })
      throw err
    }
  },

  login: async (phone, password) => {
    set({ isLoading: true, error: null })
    try {
      const res = await authApi.login(phone, password)
      const { token, user } = res.data
      localStorage.setItem('echo_token', token)
      set({ token, user, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login failed' })
      throw err
    }
  },

  generateOtp: async (phone) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.generateOtp(phone)
      set({ isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to generate OTP' })
      throw err
    }
  },

  loginWithOtp: async (phone, otp) => {
    set({ isLoading: true, error: null })
    try {
      const res = await authApi.loginWithOtp(phone, otp)
      const { token, user } = res.data
      localStorage.setItem('echo_token', token)
      set({ token, user, isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'OTP login failed' })
      throw err
    }
  },

  forgotPassword: async (phone) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.forgotPassword(phone)
      set({ isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to send OTP' })
      throw err
    }
  },

  resetPassword: async (phone, otp, newPassword) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.resetPassword(phone, otp, newPassword)
      set({ isLoading: false })
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Password reset failed' })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('echo_token')
    set({ user: null, token: null })
  },

  fetchProfile: async () => {
    try {
      const res = await userApi.getProfile()
      set({ user: res.data })
    } catch {
      // token expired or invalid
      localStorage.removeItem('echo_token')
      set({ user: null, token: null })
    }
  },

  clearError: () => set({ error: null }),
}))
