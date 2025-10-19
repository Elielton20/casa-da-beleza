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

// Conexão com Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const JWT_SECRET = process.env.JWT_SECRET || 'seu_jwt_secret_super_seguro_aqui';

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Buscar usuário no Supabase
        const { data: users, error } = await supabase
            .from('admin_users')
            .select('id, username')
            .eq('id', decoded.id);

        if (error || users.length === 0) {
            return res.status(403).json({ error: 'Usuário não encontrado' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// Testar conexão com Supabase
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Conectado ao Supabase com sucesso!');
  } catch (error) {
    console.log('❌ Erro ao conectar ao Supabase:', error.message);
  }
}

testSupabaseConnection();

// Rotas públicas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/admin-panel.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-panel.html'));
});

// Rota de saúde da API
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      message: 'API e Supabase conectados com sucesso!'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Login Admin
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const { data: users, error } = await supabase
            .from('admin_users')
            .select('*')
            .eq('username', username);

        if (error || users.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = users[0];

        if (!password || !user.password_hash) {
            return res.status(400).json({ error: 'Senha não fornecida ou inválida' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Login de usuário
app.post('/api/users/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (error || users.length === 0) {
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

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Erro no login usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Registro de usuário
app.post('/api/users/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Verificar se usuário já existe
        const { data: existingUsers, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email);

        if (checkError) throw checkError;

        if (existingUsers.length > 0) {
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

        res.status(201).json({
            token,
            user: {
                id: newUser[0].id,
                name,
                email
            }
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar produtos (público)
app.get('/api/products', async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                categories(name)
            `)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Formatar os produtos
        const formattedProducts = products.map(product => ({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            category_name: product.categories?.name || 'Sem categoria',
            image: product.image,
            description: product.description,
            stock: product.stock,
            rating: parseFloat(product.rating) || 4.5,
            review_count: product.review_count || Math.floor(Math.random() * 200) + 50
        }));

        res.json(formattedProducts);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

// Buscar categorias (público)
app.get('/api/categories', async (req, res) => {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .eq('status', 'active')
            .order('name');

        if (error) throw error;
        res.json(categories);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// ========== ROTAS PARA CARRINHO ==========

// Salvar carrinho do usuário
app.post('/api/users/cart', async (req, res) => {
    const { userId, cart } = req.body;

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

        res.json({ message: 'Carrinho salvo com sucesso' });
    } catch (error) {
        console.error('Erro ao salvar carrinho:', error);
        res.status(500).json({ error: 'Erro ao salvar carrinho' });
    }
});

// Buscar carrinho do usuário
app.get('/api/users/:userId/cart', async (req, res) => {
    const { userId } = req.params;

    try {
        const { data: cartItems, error } = await supabase
            .from('user_carts')
            .select(`
                *,
                products(name, price, image, category_id),
                categories(name)
            `)
            .eq('user_id', userId)
            .eq('products.status', 'active');

        if (error) throw error;

        const cart = cartItems.map(item => ({
            id: item.product_id,
            name: item.products.name,
            price: parseFloat(item.products.price),
            image: item.products.image,
            category: item.categories?.name,
            quantity: item.quantity
        }));

        res.json(cart);
    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        res.status(500).json({ error: 'Erro ao buscar carrinho' });
    }
});

// ========== ROTAS PARA PEDIDOS VIA WHATSAPP ==========

// Criar pedido via WhatsApp
app.post('/api/orders/whatsapp', async (req, res) => {
    const { customerName, customerEmail, items, total, message } = req.body;

    try {
        // Criar pedido
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([
                {
                    customer_name: customerName,
                    customer_email: customerEmail,
                    total_amount: total,
                    payment_method: 'whatsapp',
                    status: 'pending'
                }
            ])
            .select();

        if (orderError) throw orderError;

        const orderId = order[0].id;

        // Adicionar itens do pedido
        const orderItems = items.map(item => ({
            order_id: orderId,
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // Registrar mensagem do WhatsApp
        const { error: whatsappError } = await supabase
            .from('whatsapp_orders')
            .insert([
                {
                    order_id: orderId,
                    customer_message: message,
                    whatsapp_number: '559391445597'
                }
            ]);

        if (whatsappError) throw whatsappError;

        res.status(201).json({ 
            success: true,
            orderId,
            message: 'Pedido registrado com sucesso. Aguarde contato via WhatsApp.'
        });

    } catch (error) {
        console.error('Erro ao criar pedido WhatsApp:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao processar pedido. Tente novamente.' 
        });
    }
});

// ========== ROTAS ADMINISTRATIVAS ==========

// Dashboard stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
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

        res.json({
            totalProducts: totalProducts || 0,
            totalCategories: totalCategories || 0,
            totalValue: totalValue || 0,
            totalOrders: totalOrders || 0,
            pendingOrders: pendingOrders || 0,
            totalUsers: totalUsers || 0
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Buscar pedidos para admin
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const ordersWithCount = orders.map(order => ({
            ...order,
            items_count: order.order_items.length
        }));

        res.json(ordersWithCount);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});

// Buscar detalhes de um pedido
app.get('/api/admin/orders/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError) throw orderError;

        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select(`
                *,
                products(image)
            `)
            .eq('order_id', id);

        if (itemsError) throw itemsError;

        res.json({
            ...order,
            items
        });
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
});

// Atualizar status do pedido
app.put('/api/admin/orders/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Status do pedido atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
});

// Gerenciar Produtos (Admin)
app.get('/api/admin/products', authenticateToken, async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                *,
                categories(name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.post('/api/admin/products', authenticateToken, async (req, res) => {
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
            .select(`
                *,
                categories(name)
            `);

        if (error) throw error;

        res.status(201).json(newProduct[0]);
    } catch (error) {
        console.error('Erro ao criar produto:', error);
        res.status(500).json({ error: 'Erro ao criar produto' });
    }
});

app.put('/api/admin/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, price, category_id, image, description, stock, status } = req.body;

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
            .select(`
                *,
                categories(name)
            `);

        if (error) throw error;

        res.json(updatedProduct[0]);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto' });
    }
});

// Gerenciar Categorias
app.get('/api/admin/categories', authenticateToken, async (req, res) => {
    try {
        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        res.json(categories);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});