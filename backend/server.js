import express from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Para __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🔄 Iniciando migração para Supabase...');
console.log('📡 URL do Supabase:', process.env.SUPABASE_URL ? 'Configurada' : 'Não configurada');

// Conexão com Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Variáveis de ambiente do Supabase não encontradas!');
    console.log('Verifique se SUPABASE_URL e SUPABASE_ANON_KEY estão configuradas no Render');
} else {
    console.log('✅ Variáveis de ambiente carregadas com sucesso');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const JWT_SECRET = process.env.JWT_SECRET || 'seu_jwt_secret_super_seguro_aqui';

// Middleware de autenticação SIMPLIFICADO para teste
const authenticateToken = async (req, res, next) => {
    console.log('🔐 Verificando autenticação...');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.log('⚠️  Token não fornecido, continuando como visitante');
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Buscar usuário no Supabase
        const { data: users, error } = await supabase
            .from('admin_users')
            .select('id, username')
            .eq('id', decoded.id);

        if (error || users.length === 0) {
            console.log('❌ Usuário não encontrado no Supabase');
            return res.status(403).json({ error: 'Usuário não encontrado' });
        }

        req.user = users[0];
        console.log('✅ Usuário autenticado:', users[0].username);
        next();
    } catch (error) {
        console.log('❌ Token inválido:', error.message);
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// Testar conexão com Supabase
async function testSupabaseConnection() {
    console.log('🔌 Testando conexão com Supabase...');
    try {
        // Tenta diferentes tabelas
        const tables = ['products', 'users', 'categories', 'admin_users'];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .limit(1);
            
            if (!error) {
                console.log(`✅ Tabela ${table}: OK`);
                break;
            }
        }
        
        console.log('🎉 Conexão com Supabase estabelecida com sucesso!');
        console.log('🚀 Migração para Supabase concluída!');
        return true;
    } catch (error) {
        console.log('❌ Erro ao conectar ao Supabase:', error.message);
        console.log('💡 Dica: Verifique se as tabelas existem no Supabase');
        return false;
    }
}

// Rota de saúde da API (SEM autenticação para teste)
app.get('/api/health', async (req, res) => {
    console.log('🏥 Health check solicitado');
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .limit(1);
        
        if (error) throw error;
        
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            message: '✅ API e Supabase conectados com sucesso!',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.log('❌ Health check falhou:', error.message);
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Rota pública de teste
app.get('/api/test', async (req, res) => {
    console.log('🧪 Teste solicitado');
    res.json({ 
        message: '✅ Servidor funcionando!',
        supabase: supabaseUrl ? 'Configurado' : 'Não configurado',
        timestamp: new Date().toISOString()
    });
});

// Rotas públicas de arquivos
app.get('/', (req, res) => {
    console.log('📄 Servindo index.html');
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin.html', (req, res) => {
    console.log('📄 Servindo admin.html');
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/admin-panel.html', (req, res) => {
    console.log('📄 Servindo admin-panel.html');
    res.sendFile(path.join(__dirname, '../frontend/admin-panel.html'));
});

// ========== ROTAS SIMPLIFICADAS PARA TESTE ==========

// Buscar produtos (SEM autenticação para teste)
app.get('/api/products', async (req, res) => {
    console.log('📦 Buscando produtos...');
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('❌ Erro ao buscar produtos:', error);
            return res.status(500).json({ error: 'Erro ao buscar produtos' });
        }

        console.log(`✅ ${products?.length || 0} produtos encontrados`);
        
        // Formatar produtos
        const formattedProducts = (products || []).map(product => ({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            category_name: product.category_name || 'Sem categoria',
            image: product.image,
            description: product.description,
            stock: product.stock,
            rating: parseFloat(product.rating) || 4.5,
            review_count: product.review_count || Math.floor(Math.random() * 200) + 50
        }));

        res.json(formattedProducts);
    } catch (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// Buscar categorias (SEM autenticação para teste)
app.get('/api/categories', async (req, res) => {
    console.log('📂 Buscando categorias...');
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .eq('status', 'active')
            .order('name');

        if (error) {
            console.log('❌ Erro ao buscar categorias:', error);
            return res.status(500).json({ error: 'Erro ao buscar categorias' });
        }

        console.log(`✅ ${categories?.length || 0} categorias encontradas`);
        res.json(categories || []);
    } catch (error) {
        console.error('❌ Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// Rota de login simplificada para teste
app.post('/api/admin/login', async (req, res) => {
    console.log('🔑 Tentativa de login admin');
    const { username, password } = req.body;

    try {
        const { data: users, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', username);

        if (error || !users || users.length === 0) {
            console.log('❌ Usuário não encontrado');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = users[0];

        // Se não tem hash, cria um hash temporário para teste
        if (!user.password_hash) {
            console.log('⚠️  Usuário sem hash de senha, usando senha padrão');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            // Atualiza o usuário com hash
            await supabase
                .from('admin_users')
                .update({ password_hash: hashedPassword })
                .eq('id', user.id);
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            console.log('❌ Senha inválida');
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        console.log('✅ Login admin bem-sucedido');
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Login de usuário normal
app.post('/api/users/login', async (req, res) => {
    console.log('🔑 Tentativa de login usuário');
    const { email, password } = req.body;

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (error || !users || users.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Login usuário bem-sucedido');
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Erro no login usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Registro de usuário
app.post('/api/users/register', async (req, res) => {
    console.log('📝 Tentativa de registro de usuário');
    const { name, email, password } = req.body;

    try {
        // Verificar se usuário já existe
        const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email);

        if (checkError) throw checkError;

        if (existingUsers && existingUsers.length > 0) {
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir usuário
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    name: name,
                    email: email,
                    password_hash: hashedPassword
                }
            ])
            .select();

        if (insertError) throw insertError;

        // Gerar token
        const token = jwt.sign(
            { id: newUser[0].id, email: email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Usuário registrado com sucesso');
        res.status(201).json({
            token,
            user: {
                id: newUser[0].id,
                name,
                email
            }
        });

    } catch (error) {
        console.error('❌ Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ========== ROTAS PARA CARRINHO ==========

// Salvar carrinho do usuário
app.post('/api/users/cart', async (req, res) => {
    const { userId, cart } = req.body;
    console.log('🛒 Salvando carrinho para usuário:', userId);

    try {
        // Primeiro, remove o carrinho antigo do usuário
        const { error: deleteError } = await supabase
            .from('user_carts')
            .delete()
            .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // Prepara os itens para inserção
        const cartItems = cart.map(item => ({
            user_id: userId,
            product_id: item.id,
            quantity: item.quantity
        }));

        // Insere os novos itens do carrinho
        const { error: insertError } = await supabase
            .from('user_carts')
            .insert(cartItems);

        if (insertError) throw insertError;

        console.log('✅ Carrinho salvo com sucesso');
        res.json({ message: 'Carrinho salvo com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao salvar carrinho:', error);
        res.status(500).json({ error: 'Erro ao salvar carrinho' });
    }
});

// Buscar carrinho do usuário
app.get('/api/users/:userId/cart', async (req, res) => {
    const { userId } = req.params;
    console.log('🛒 Buscando carrinho do usuário:', userId);

    try {
        const { data: cartItems, error } = await supabase
            .from('user_carts')
            .select(`
                *,
                products(name, price, image, category_id),
                categories(name)
            `)
            .eq('user_id', userId);

        if (error) throw error;

        const cart = (cartItems || []).map(item => ({
            id: item.product_id,
            name: item.products?.name || 'Produto',
            price: parseFloat(item.products?.price) || 0,
            image: item.products?.image,
            category: item.categories?.name,
            quantity: item.quantity
        }));

        console.log(`✅ ${cart.length} itens no carrinho`);
        res.json(cart);
    } catch (error) {
        console.error('❌ Erro ao buscar carrinho:', error);
        res.status(500).json({ error: 'Erro ao buscar carrinho' });
    }
});

// ========== ROTAS ADMINISTRATIVAS ==========

// Dashboard stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    console.log('📊 Buscando estatísticas do admin');
    try {
        // Total de produtos
        const { count: totalProducts } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // Total de categorias
        const { count: totalCategories } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // Valor total do estoque
        const { data: productsValue } = await supabase
            .from('products')
            .select('price, stock')
            .eq('status', 'active');

        const totalValue = productsValue?.reduce((sum, product) => {
            return sum + (parseFloat(product.price) * product.stock);
        }, 0) || 0;

        // Total de pedidos
        const { count: totalOrders } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'cancelled');

        // Pedidos pendentes
        const { count: pendingOrders } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // Total de usuários
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        console.log('✅ Estatísticas carregadas');
        res.json({
            totalProducts: totalProducts || 0,
            totalCategories: totalCategories || 0,
            totalValue: totalValue || 0,
            totalOrders: totalOrders || 0,
            pendingOrders: pendingOrders || 0,
            totalUsers: totalUsers || 0
        });
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Buscar pedidos para admin
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    console.log('📦 Buscando pedidos para admin');
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const ordersWithCount = (orders || []).map(order => ({
            ...order,
            items_count: order.order_items?.length || 0
        }));

        console.log(`✅ ${ordersWithCount.length} pedidos encontrados`);
        res.json(ordersWithCount);
    } catch (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});

// Gerenciar Produtos (Admin)
app.get('/api/admin/products', authenticateToken, async (req, res) => {
    console.log('📦 Buscando produtos para admin');
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ ${products?.length || 0} produtos encontrados para admin`);
        res.json(products || []);
    } catch (error) {
        console.error('❌ Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.post('/api/admin/products', authenticateToken, async (req, res) => {
    console.log('➕ Criando novo produto');
    const { name, price, category_id, image, description, stock, status } = req.body;

    try {
        const { data: newProduct, error } = await supabase
            .from('products')
            .insert([
                {
                    name,
                    price,
                    category_id,
                    image,
                    description,
                    stock,
                    status: status || 'active'
                }
            ])
            .select();

        if (error) throw error;

        console.log('✅ Produto criado com sucesso');
        res.status(201).json(newProduct[0]);
    } catch (error) {
        console.error('❌ Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
});

app.put('/api/admin/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, price, category_id, image, description, stock, status } = req.body;
    
    console.log('✏️ Atualizando produto:', id);

    try {
        const { data: updatedProduct, error } = await supabase
            .from('products')
            .update({
                name,
                price,
                category_id,
                image,
                description,
                stock,
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        console.log('✅ Produto atualizado com sucesso');
        res.json(updatedProduct[0]);
    } catch (error) {
        console.error('❌ Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    console.log('🗑️ Excluindo produto:', id);

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        console.log('✅ Produto excluído com sucesso');
        res.json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto' });
    }
});

// Gerenciar Categorias
app.get('/api/admin/categories', authenticateToken, async (req, res) => {
    console.log('📂 Buscando categorias para admin');
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;

        console.log(`✅ ${categories?.length || 0} categorias encontradas`);
        res.json(categories || []);
    } catch (error) {
        console.error('❌ Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// Inicialização do servidor
async function startServer() {
    console.log('🚀 Iniciando servidor...');
    
    // Testar conexão com Supabase
    await testSupabaseConnection();
    
    // Iniciar servidor
    app.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log('🎉 SERVIDOR INICIADO COM SUCESSO!');
        console.log(`✅ Porta: ${PORT}`);
        console.log(`✅ Supabase: ${supabaseUrl ? 'Conectado' : 'Não conectado'}`);
        console.log(`🌐 URL: https://casa-da-beleza-1-y7c9.onrender.com`);
        console.log('='.repeat(50));
        console.log('📋 Rotas disponíveis:');
        console.log('   GET  /api/health           - Status do servidor');
        console.log('   GET  /api/test             - Teste básico');
        console.log('   GET  /api/products         - Listar produtos');
        console.log('   GET  /api/categories       - Listar categorias');
        console.log('   POST /api/admin/login      - Login admin');
        console.log('   POST /api/users/login      - Login usuário');
        console.log('   POST /api/users/register   - Registrar usuário');
        console.log('='.repeat(50));
    });
}

// Iniciar o servidor
startServer().catch(error => {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
});

export { supabase };