import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cpfpnuezbvxkysorjklm.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZnBudWV6YnZ4a3lzb3Jqa2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNDE3NDgsImV4cCI6MjA2NTkxNzc0OH0.UrQBhyIBNw2HzT9logwwkkJBozxoHEm-YNjbr6-jr2E'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 