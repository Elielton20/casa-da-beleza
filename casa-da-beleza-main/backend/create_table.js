// create-tables.js
require('dotenv').config();
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '-03:00'
});

const promisePool = pool.promise();

async function createTables() {
    let connection;
    try {
        console.log('🗃️ Conectando ao banco de dados...');
        connection = await promisePool.getConnection();
        
        console.log('🗃️ Iniciando criação de tabelas...');
        
        // 1. Tabela categories
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                image VARCHAR(500),
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        console.log('✅ Tabela categories criada');

        // 2. Tabela products
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                image VARCHAR(500),
                category_id INT,
                stock INT DEFAULT 0,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela products criada');

        // 3. Tabela users
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela users criada');

        // 4. Tabela admin_users
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela admin_users criada');

        // 5. Inserir dados iniciais
        console.log('📥 Inserindo dados iniciais...');
        
        // Categorias
        await connection.execute(`
            INSERT IGNORE INTO categories (name, description) VALUES
            ('Salgados', 'Deliciosos salgados fritos e assados'),
            ('Doces', 'Sobremesas e doces caseiros'),
            ('Bolos', 'Bolos artesanais para todas as ocasiões'),
            ('Tortas', 'Tortas doces e salgadas'),
            ('Bebidas', 'Bebidas geladas e quentes')
        `);

        // Admin user (senha: admin123)
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.execute(`
            INSERT IGNORE INTO admin_users (username, email, password_hash) 
            VALUES (?, ?, ?)
        `, ['admin', 'admin@casabelza.com', hashedPassword]);

        // Produtos de exemplo
        await connection.execute(`
            INSERT IGNORE INTO products (name, description, price, category_id, stock) VALUES
            ('Coxinha de Frango', 'Coxinha com recheio de frango temperado', 5.50, 1, 50),
            ('Brigadeiro', 'Brigadeiro tradicional de chocolate', 2.00, 2, 100),
            ('Bolo de Chocolate', 'Bolo de chocolate com cobertura', 25.00, 3, 10),
            ('Torta de Limão', 'Torta de limão com merengue', 20.00, 4, 8),
            ('Suco de Laranja', 'Suco natural de laranja', 8.00, 5, 30)
        `);

        console.log('🎉 TODAS AS TABELAS CRIADAS COM SUCESSO!');
        console.log('🔑 CREDENCIAIS DO ADMIN:');
        console.log('   👤 Usuário: admin');
        console.log('   🔐 Senha: admin123');
        console.log('\n🌐 AGORA VOCÊ PODE:');
        console.log('   1. Executar: node server.js');
        console.log('   2. Acessar: http://localhost:10000');
        console.log('   3. Fazer login em: http://localhost:10000/admin.html');

    } catch (error) {
        console.error('❌ ERRO AO CRIAR TABELAS:', error.message);
        console.log('🔧 Verifique se:');
        console.log('   - As credenciais do banco estão corretas no arquivo .env');
        console.log('   - O banco está online no Clever Cloud');
    } finally {
        if (connection) {
            connection.release();
        }
        await promisePool.end();
    }
}

createTables();