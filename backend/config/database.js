const { createClient } = require('@supabase/supabase-js');

// Conexão com Supabase - usa variáveis de ambiente do Render
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Testar conexão com Supabase
async function testSupabaseConnection() {
  try {
    // Tenta buscar qualquer tabela que exista no seu banco
    const { data, error } = await supabase
      .from('clientes') // ou qualquer tabela que você tenha
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Conectado ao Supabase com sucesso!');
  } catch (error) {
    console.log('❌ Erro ao conectar ao Supabase:', error.message);
  }
}

testSupabaseConnection();

module.exports = supabase;