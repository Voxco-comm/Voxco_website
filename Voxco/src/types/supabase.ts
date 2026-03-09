import { User } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  loading: boolean
  signingOut: boolean
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

export interface UserMetadata {
  name?: string
  message?: string
}

