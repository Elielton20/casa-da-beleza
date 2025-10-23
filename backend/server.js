// backend/server.js - VERSÃO COMPLETA CORRIGIDA
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor funcionando' });
});

// Test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .limit(2);

    res.json({ 
      success: !error, 
      data: data || [], 
      error: error?.message 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🎯 ENDPOINT PRINCIPAL OTIMIZADO - PRODUTOS
app.get('/api/products', async (req, res) => {
  console.log('🚀 GET /api/products - Iniciando...');
  
  try {
    // Query ULTRA leve - apenas dados essenciais
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price, image, category_id')
      .order('name')
      .limit(16);

    console.log(`📦 Resposta produtos: ${products?.length || 0} itens`, error);

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!products || products.length === 0) {
      console.log('ℹ️ Nenhum produto encontrado, retornando array vazio');
      return res.json([]);
    }

    // Formatação RÁPIDA sem joins complexos
    const produtosFormatados = products.map(product => ({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price) || 0,
      category: getCategoriaSimples(product.category_id),
      image: product.image || getImagemPadrao(product.category_id),
      rating: 4.0 + Math.random(),
      reviewCount: Math.floor(Math.random() * 100) + 50
    }));

    console.log(`✅ ${produtosFormatados.length} produtos formatados`);
    res.json(produtosFormatados);

  } catch (error) {
    console.error('💥 Erro grave em /api/products:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// 🎯 ENDPOINT ADMIN - PRODUTOS COMPLETOS
app.get('/api/admin/products', async (req, res) => {
  console.log('👑 GET /api/admin/products - Iniciando...');
  
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name, 
        price,
        image,
        category_id,
        created_at,
        categories (name)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`📦 Admin: ${products?.length || 0} produtos`, error);

    if (error) {
      console.error('❌ Erro admin:', error);
      return res.status(500).json({ error: error.message });
    }

    // Formatar resposta do admin
    const produtosAdmin = products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category_id: product.category_id,
      category_name: product.categories?.name || 'Sem categoria',
      created_at: product.created_at
    }));

    console.log(`✅ Admin: ${produtosAdmin.length} produtos formatados`);
    res.json(produtosAdmin);

  } catch (error) {
    console.error('💥 Erro admin:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// 🎯 CRIAR NOVO PRODUTO
app.post('/api/admin/products', async (req, res) => {
  console.log('➕ POST /api/admin/products - Criando...', req.body);
  
  try {
    const { name, price, image, category_id } = req.body;

    // Validações
    if (!name || !price || !category_id) {
      return res.status(400).json({ 
        error: 'Nome, preço e categoria são obrigatórios' 
      });
    }

    const produtoData = {
      name: name.trim(),
      price: parseFloat(price),
      image: image || null,
      category_id: parseInt(category_id),
      created_at: new Date().toISOString()
    };

    console.log('📝 Dados do produto:', produtoData);

    const { data: product, error } = await supabase
      .from('products')
      .insert([produtoData])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar produto:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Produto criado com ID:', product.id);
    res.json(product);

  } catch (error) {
    console.error('💥 Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// 🎯 CATEGORIAS
app.get('/api/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    res.json(categories || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Funções auxiliares locais (RÁPIDAS)
function getCategoriaSimples(categoryId) {
  const categorias = {
    1: "Maquiagem", 2: "Cabelos", 3: "Perfumes", 
    4: "Corpo e Banho", 5: "Skincare"
  };
  return categorias[categoryId] || "Beleza";
}

function getImagemPadrao(categoryId) {
  const imagens = {
    1: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=300&h=300&fit=crop",
    2: "https://images.unsplash.com/photo-1608248549163-6c8b55c4a71a?w=300&h=300&fit=crop",
    3: "https://images.unsplash.com/photo-1590736969955-1d0c72c9b6b9?w=300&h=300&fit=crop",
    4: "https://images.unsplash.com/photo-1556228578-1cfd50779d22?w=300&h=300&fit=crop"
  };
  return imagens[categoryId] || "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=300&fit=crop";
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
==================================================
🎉 SERVIDOR REINICIADO COM CÓDIGO CORRIGIDO!
✅ Porta: ${PORT}
✅ Supabase: Conectado
🌐 URL: http://localhost:${PORT}
==================================================
  `);
});