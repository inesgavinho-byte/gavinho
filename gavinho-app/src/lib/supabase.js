import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vctcppuvqjstscbzdykn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjdGNwcHV2cWpzdHNjYnpkeWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzM5MTQsImV4cCI6MjA4MTYwOTkxNH0.013iN76cfweIznJbWYu5ntalrNHW7Ib-IV_-jBIVHhI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'gavinho-auth',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
