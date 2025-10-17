const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const JWT_SECRET = 'seu_jwt_secret_super_seguro_aqui';

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await db.execute(
            'SELECT id, username FROM admin_users WHERE id = ?', 
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(403).json({ error: 'Usuário não encontrado' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

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

// Login Admin
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await db.execute(
            'SELECT * FROM admin_users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
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
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
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
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir usuário
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // Gerar token
        const token = jwt.sign(
            { id: result.insertId, email: email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: result.insertId,
                name,
                email
            }
        });

    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Buscar produtos (público) - ATUALIZADA para incluir rating e review_count
app.get('/api/products', async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT p.*, c.name as category_name,
                   COALESCE(AVG(r.rating), 4.5) as rating,
                   COUNT(r.id) as review_count
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN product_reviews r ON p.id = r.product_id
            WHERE p.status = 'active' 
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        
        // Formatar os produtos para incluir rating e review_count
        const formattedProducts = products.map(product => ({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            category_name: product.category_name,
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
        const [categories] = await db.execute(`
            SELECT * FROM categories WHERE status = 'active' ORDER BY name
        `);
        res.json(categories);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

// ========== NOVAS ROTAS PARA CARRINHO ==========

// Salvar carrinho do usuário
app.post('/api/users/cart', async (req, res) => {
    const { userId, cart } = req.body;

    try {
        // Primeiro, remove o carrinho antigo do usuário
        await db.execute('DELETE FROM user_carts WHERE user_id = ?', [userId]);

        // Insere os novos itens do carrinho
        for (const item of cart) {
            await db.execute(
                'INSERT INTO user_carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [userId, item.id, item.quantity]
            );
        }

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
        const [cartItems] = await db.execute(`
            SELECT uc.*, p.name, p.price, p.image, p.category_id, c.name as category_name
            FROM user_carts uc
            JOIN products p ON uc.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE uc.user_id = ? AND p.status = 'active'
        `, [userId]);

        const cart = cartItems.map(item => ({
            id: item.product_id,
            name: item.name,
            price: parseFloat(item.price),
            image: item.image,
            category: item.category_name,
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
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Criar pedido
            const [orderResult] = await connection.execute(
                `INSERT INTO orders (customer_name, customer_email, total_amount, payment_method, status) 
                 VALUES (?, ?, ?, 'whatsapp', 'pending')`,
                [customerName, customerEmail, total]
            );

            const orderId = orderResult.insertId;

            // Adicionar itens do pedido
            for (const item of items) {
                await connection.execute(
                    `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [orderId, item.id, item.name, item.quantity, item.price]
                );
            }

            // Registrar mensagem do WhatsApp
            await connection.execute(
                `INSERT INTO whatsapp_orders (order_id, customer_message, whatsapp_number) 
                 VALUES (?, ?, ?)`,
                [orderId, message, '559391445597']
            );

            await connection.commit();
            
            res.status(201).json({ 
                success: true,
                orderId,
                message: 'Pedido registrado com sucesso. Aguarde contato via WhatsApp.'
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao criar pedido WhatsApp:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao processar pedido. Tente novamente.' 
        });
    }
});

// ========== ROTAS ADMINISTRATIVAS ATUALIZADAS ==========

// Dashboard stats - ATUALIZADA
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
    try {
        const [[{ totalProducts }]] = await db.execute(
            'SELECT COUNT(*) as totalProducts FROM products WHERE status = "active"'
        );

        const [[{ totalCategories }]] = await db.execute(
            'SELECT COUNT(*) as totalCategories FROM categories WHERE status = "active"'
        );

        const [[{ totalValue }]] = await db.execute(
            'SELECT COALESCE(SUM(price * stock), 0) as totalValue FROM products WHERE status = "active"'
        );

        const [[{ totalOrders }]] = await db.execute(
            'SELECT COUNT(*) as totalOrders FROM orders WHERE status != "cancelled"'
        );

        const [[{ pendingOrders }]] = await db.execute(
            'SELECT COUNT(*) as pendingOrders FROM orders WHERE status = "pending"'
        );

        const [[{ totalUsers }]] = await db.execute(
            'SELECT COUNT(*) as totalUsers FROM users'
        );

        res.json({
            totalProducts,
            totalCategories,
            totalValue: parseFloat(totalValue),
            totalOrders,
            pendingOrders,
            totalUsers
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Buscar pedidos para admin
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        const [orders] = await db.execute(`
            SELECT o.*, COUNT(oi.id) as items_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);
        res.json(orders);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});

// Buscar detalhes de um pedido
app.get('/api/admin/orders/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const [order] = await db.execute('SELECT * FROM orders WHERE id = ?', [id]);
        const [items] = await db.execute(`
            SELECT oi.*, p.image 
            FROM order_items oi 
            LEFT JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?
        `, [id]);

        if (order.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }

        res.json({
            ...order[0],
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
        await db.execute(
            'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, id]
        );

        res.json({ message: 'Status do pedido atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
});

// Gerenciar Produtos (Admin) - MANTIDO
app.get('/api/admin/products', authenticateToken, async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            ORDER BY p.created_at DESC
        `);
        res.json(products);
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});

app.post('/api/admin/products', authenticateToken, async (req, res) => {
    const { name, price, category_id, image, description, stock, status } = req.body;

    try {
        const [result] = await db.execute(
            `INSERT INTO products (name, price, category_id, image, description, stock, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, price, category_id, image, description, stock, status || 'active']
        );

        const [newProduct] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = ?
        `, [result.insertId]);

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
        await db.execute(
            `UPDATE products SET 
                name = ?, price = ?, category_id = ?, image = ?, 
                description = ?, stock = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [name, price, category_id, image, description, stock, status, id]
        );

        const [updatedProduct] = await db.execute(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.id = ?
        `, [id]);

        res.json(updatedProduct[0]);
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        await db.execute('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Produto excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir produto:', error);
        res.status(500).json({ error: 'Erro ao excluir produto' });
    }
});



// Gerenciar Categorias - MANTIDO
app.get('/api/admin/categories', authenticateToken, async (req, res) => {
    try {
        const [categories] = await db.execute('SELECT * FROM categories ORDER BY name');
        res.json(categories);
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
});

//const PORT = process.env.PORT || 3000;
//app.listen(PORT, () => {
   //// console.log(`Servidor rodando na porta ${PORT}`);
   // console.log(`Acesse: http://localhost:${PORT}`);
//});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
