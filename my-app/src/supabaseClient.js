import { createClient } from '@supabase/supabase-js'
// Replace with your actual values
const supabaseUrl = "https://ttkxjsgpnofqruqxuuks.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a3hqc2dwbm9mcXJ1cXh1dWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMzc1NTcsImV4cCI6MjA4OTYxMzU1N30.tsFq-e-sO7J_8AdWabOLf8eUuVUSlPz17tYw-6g2JQo"
// Create connection
export const supabase = createClient(supabaseUrl, supabaseKey)