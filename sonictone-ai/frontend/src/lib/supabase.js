import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wptnigbajznllzdwihry.supabase.co'        // ← paste yours
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdG5pZ2JhanpubGx6ZHdpaHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjk5MzEsImV4cCI6MjA4OTg0NTkzMX0.sfHWP7Rd3HlWMfVySX4wCUVxRgpOgpMLyqHp7hY-P2I'  // ← paste yours

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)