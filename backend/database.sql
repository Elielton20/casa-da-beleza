-- Criar banco de dados
CREATE DATABASE IF NOT EXISTS casa_da_beleza;
USE casa_da_beleza;

-- Tabela de administradores (JÁ EXISTE)
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de categorias (JÁ EXISTE)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produtos (JÁ EXISTE)
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category_id INT,
    image TEXT,
    description TEXT,
    stock INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    rating DECIMAL(3,2) DEFAULT 4.5,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Tabela de pedidos (JÁ EXISTE)
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_method ENUM('pix', 'card') DEFAULT 'pix',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de itens do pedido (JÁ EXISTE)
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- NOVA: Tabela de usuários/clientes
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inserir categorias (MANTIDO)
INSERT IGNORE INTO categories (name, description) VALUES 
('Maquiagem', 'Produtos de maquiagem e beleza facial'),
('Skincare', 'Cuidados com a pele'),
('Cabelos', 'Produtos para cuidados capilares'),
('Perfumes', 'Fragrâncias e colônias'),
('Corpo e Banho', 'Produtos para cuidados com o corpo');

-- Admin padrão COM HASH CORRETO (MANTIDO)
INSERT IGNORE INTO admin_users (username, password_hash, email) 
VALUES ('admin', '$2a$10$HxrsbHkA2SgIn1r97qjsg.rTv/0NFuYbIltHGmN2narX.W182TAMS', 'evelensilva354@gmail.com');

-- NOVO: Usuário cliente de teste
INSERT IGNORE INTO users (name, email, password_hash) 
VALUES ('Cliente Teste', 'cliente@teste.com', '$2a$10$HxrsbHkA2SgIn1r97qjsg.rTv/0NFuYbIltHGmN2narX.W182TAMS');

-- Produtos iniciais (MANTIDO)
INSERT IGNORE INTO products (name, price, category_id, image, description, stock, rating, review_count) VALUES
('Base Líquida Professional', 89.90, 1, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500', 'Base líquida de alta cobertura para uma pele impecável', 15, 4.5, 120),
('Hidratante Facial com Vitamina C', 129.90, 2, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500', 'Hidratante facial com vitamina C para pele radiante', 8, 4.8, 89),
('Shampoo Reconstruidor', 45.90, 3, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500', 'Shampoo reconstruidor para cabelos danificados', 22, 4.3, 156),
('Perfume Flor do Campo', 159.90, 4, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500', 'Perfume floral suave e duradouro', 12, 4.6, 203),
('Óleo Corporal Relaxante', 67.90, 5, 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500', 'Óleo corporal para hidratação profunda', 18, 4.4, 78),
('Paleta de Sombras Profissionais', 139.90, 1, 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500', 'Paleta com 12 cores altamente pigmentadas', 10, 4.7, 145);