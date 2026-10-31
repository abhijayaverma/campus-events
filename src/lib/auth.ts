import type { User } from '@supabase/supabase-js'
import { requireSupabase } from './supabase'

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await requireSupabase().auth.signUp({
    email, password, options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function resetPasswordWithEmail(email: string) {
  const redirectTo = 'https://campus-events-sable.vercel.app/account'
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error && error.name !== 'AuthSessionMissingError') throw error
  return data.user
}
