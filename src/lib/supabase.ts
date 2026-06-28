import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mdzjmcvpjzgshuxxqicq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kemptY3Zwanpnc2h1eHhxaWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg3NzMsImV4cCI6MjA5ODIxNDc3M30.4FW7SFz90fxWukQdJXYvhb4s33kyuYIhqpW9swURJDk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
