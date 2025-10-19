import { createClient } from '@supabase/supabase-js';

// Substitua pelos seus dados do Supabase
const SUPABASE_URL = 'https://djpfhgbxspibucvacxpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcGZoZ2J4c3BpYnVjdmFjeHB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg3NzMwNCwiZXhwIjoyMDc2NDUzMzA0fQ.dziOb3cIrlGiiM0PuJABuFioOf9BgnMcABQpM27N3qc'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
