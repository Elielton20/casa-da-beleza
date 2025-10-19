import { createClient } from '@supabase/supabase-js';

// Isso deve pegar automaticamente do Render
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);