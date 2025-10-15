// Dados iniciais dos produtos (fallback) - MANTIDO
const initialProducts = [
    {
        id: 1,
        name: "Base Líquida Professional",
        price: 89.90,
        category: "Maquiagem",
        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500",
        rating: 4.5,
        reviewCount: 120
    },
    {
        id: 2,
        name: "Hidratante Facial com Vitamina C",
        price: 129.90,
        category: "Skincare",
        image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500",
        rating: 4.8,
        reviewCount: 89
    },
    {
        id: 3,
        name: "Shampoo Reconstruidor",
        price: 45.90,
        category: "Cabelos",
        image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500",
        rating: 4.3,
        reviewCount: 156
    },
    {
        id: 4,
        name: "Perfume Flor do Campo",
        price: 159.90,
        category: "Perfumes",
        image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500",
        rating: 4.6,
        reviewCount: 203
    },
    {
        id: 5,
        name: "Óleo Corporal Relaxante",
        price: 67.90,
        category: "Corpo e Banho",
        image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500",
        rating: 4.4,
        reviewCount: 78
    },
    {
        id: 6,
        name: "Paleta de Sombras Profissionais",
        price: 139.90,
        category: "Maquiagem",
        image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500",
        rating: 4.7,
        reviewCount: 145
    }
];

// ========== ADICIONADO: Carrinho de compras ==========
let cart = [];
let currentProducts = [];

// ========== NOVO: Sistema de Usuário ==========
let currentUser = null;
const WHATSAPP_NUMBER = "559391445597";

// Função para carregar produtos do servidor - ATUALIZADA
async function loadProductsFromStorage() {
    try {
        // Primeiro tenta carregar do localStorage (produtos do admin)
        const adminProducts = localStorage.getItem('adminProducts');
        if (adminProducts) {
            const parsedProducts = JSON.parse(adminProducts);
            if (parsedProducts && parsedProducts.length > 0) {
                console.log('Carregando produtos do admin:', parsedProducts);
                return parsedProducts;
            }
        }

        // Se não tem produtos do admin, tenta carregar da API
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Erro ao carregar produtos');
        const products = await response.json();
        
        return products.map(product => ({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            category: product.category_name,
            image: product.image,
            rating: parseFloat(product.rating) || 4.5,
            reviewCount: product.review_count || Math.floor(Math.random() * 200) + 50
        }));
    } catch (error) {
        console.error('Erro ao carregar produtos:', error);
        return initialProducts;
    }
}

// Inicialização - ATUALIZADA
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    setupEventListeners();
    checkUserAuth();
    loadCartFromStorage();
    updateCartCounter();
});

// Carregar produtos na página - ATUALIZADA
async function loadProducts() {
    const productsContainer = document.getElementById('products-container');
    currentProducts = await loadProductsFromStorage();
    
    productsContainer.innerHTML = '';
    
    if (currentProducts.length === 0) {
        productsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-box-open" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3 style="color: #666; margin-bottom: 1rem;">Nenhum produto disponível</h3>
                <p style="color: #999;">Os produtos serão adicionados em breve.</p>
            </div>
        `;
        return;
    }
    
    currentProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image"
                 onerror="this.src='https://via.placeholder.com/300x300?text=Produto+Sem+Imagem'">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(product.rating)}
                    </div>
                    <span>(${product.reviewCount})</span>
                </div>
                <div class="product-actions">
                    <button class="buy-now-btn" onclick="buyNow(${product.id})">
                        <i class="fab fa-whatsapp"></i> Comprar Agora
                    </button>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Carrinho
                    </button>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
}

// ========== FUNÇÕES DO CARRINHO (ADICIONADAS) ==========

// Adicionar produto ao carrinho
function addToCart(productId) {
    const product = currentProducts.find(p => p.id === productId);
    
    if (!product) {
        alert('Produto não encontrado!');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCartToStorage();
    updateCartCounter();
    showNotification(`${product.name} adicionado ao carrinho!`);
}

// Remover item do carrinho
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCartCounter();
    updateCartDisplay();
}

// Atualizar quantidade do item no carrinho
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity += change;
        
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCartToStorage();
            updateCartCounter();
            updateCartDisplay();
        }
    }
}

// Salvar carrinho no localStorage
function saveCartToStorage() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

// Carregar carrinho do localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('shoppingCart');
    console.log('Saved cart from storage:', savedCart); // Para debug
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}
    


// Atualizar contador do carrinho
// Atualizar contador do carrinho - CORRIGIDA
function updateCartCounter() {
    const cartCounter = document.getElementById('cart-count');
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    console.log('Total de itens no carrinho:', totalItems); // Para debug
    
    if (cartCounter) {
        cartCounter.textContent = totalItems;
        
        // Garantir que o contador seja visível quando há itens
        if (totalItems > 0) {
            cartCounter.style.display = 'flex';
            cartCounter.style.opacity = '1';
            cartCounter.style.visibility = 'visible';
        } else {
            cartCounter.style.display = 'none';
        }
    } else {
        console.error('Elemento cart-count não encontrado!');
        // Criar o elemento se não existir
        createCartCounter();
    }
    // Criar contador do carrinho se não existir
function createCartCounter() {
    const cartBtn = document.getElementById('cart-btn');
    if (!cartBtn) return;
    
    // Verificar se já existe um contador
    let cartCounter = document.getElementById('cart-count');
    if (!cartCounter) {
        cartCounter = document.createElement('span');
        cartCounter.id = 'cart-count';
        cartCounter.className = 'cart-count';
        cartBtn.appendChild(cartCounter);
    }
    
    updateCartCounter();
}
}

// Atualizar exibição do carrinho
function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const emptyCartElement = document.getElementById('empty-cart');
    const cartContentElement = document.getElementById('cart-content');
    
    if (cart.length === 0) {
        emptyCartElement.style.display = 'block';
        cartContentElement.style.display = 'none';
        return;
    }
    
    emptyCartElement.style.display = 'none';
    cartContentElement.style.display = 'block';
    
    cartItemsContainer.innerHTML = '';
    
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}" 
                 onerror="this.src='https://via.placeholder.com/60x60?text=Produto'">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <div class="cart-item-price">R$ ${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
                <button onclick="updateQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity(${item.id}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    cartTotalElement.textContent = `R$ ${total.toFixed(2)}`;
}
// Menu Hamburguer para Mobile
// Menu Hamburguer para Mobile
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.createElement('button');
    menuToggle.className = 'menu-toggle';
    menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
    
    const headerContainer = document.querySelector('.header-container');
    const nav = document.querySelector('nav');
    
    // Inserir o botão do menu no header
    headerContainer.insertBefore(menuToggle, nav);
    
    // Toggle do menu
    menuToggle.addEventListener('click', function() {
        nav.classList.toggle('active');
        menuToggle.innerHTML = nav.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });
    
    // Fechar menu ao clicar em um link
    nav.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
            nav.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
    
    // Fechar menu ao redimensionar para desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            nav.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
});
// Finalizar compra via WhatsApp
function checkout() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    let message = `🛍️ *PEDIDO - LOJA DE COSMÉTICOS* 🛍️\n\n`;
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        message += `*Produto ${index + 1}:*\n`;
        message += `📦 ${item.name}\n`;
        message += `💰 Preço unitário: R$ ${item.price.toFixed(2)}\n`;
        message += `🔢 Quantidade: ${item.quantity}\n`;
        message += `💵 Subtotal: R$ ${itemTotal.toFixed(2)}\n\n`;
    });
    
    message += `*TOTAL DO PEDIDO: R$ ${total.toFixed(2)}*\n\n`;
    message += `Olá! Gostaria de finalizar minha compra com os produtos listados acima. Poderia me ajudar?`;
    
    // Codificar a mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Criar URL do WhatsApp
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    // Abrir WhatsApp em nova aba
    window.open(whatsappUrl, '_blank');
    
    // Limpar carrinho após finalizar compra
    cart = [];
    saveCartToStorage();
    updateCartCounter();
    updateCartDisplay();
    
    // Fechar modal do carrinho
    document.getElementById('cart-modal').style.display = 'none';
    
    showNotification('Pedido enviado para o WhatsApp!');
}

// ========== FUNÇÃO COMPRAR AGORA (ATUALIZADA) ==========
function buyNow(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) {
        alert('Produto não encontrado!');
        return;
    }

    // Mensagem formatada para o WhatsApp
    const message = `🛍️ *COMPRA DIRETA* 🛍️\n\n` +
                   `*Produto:* ${product.name}\n` +
                   `*Preço:* R$ ${product.price.toFixed(2)}\n` +
                   `*Categoria:* ${product.category}\n\n` +
                   `Olá! Gostaria de comprar este produto. Poderia me ajudar?`;
    
    // Codificar a mensagem para URL
    const encodedMessage = encodeURIComponent(message);
    
    // Criar URL do WhatsApp
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    // Abrir WhatsApp em nova aba
    window.open(whatsappUrl, '_blank');
}

// Gerar estrelas para avaliação - MANTIDO
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
}

// Configurar event listeners - ATUALIZADA
function setupEventListeners() {
    // Modal de Login - ATUALIZADO
    const loginBtn = document.getElementById('user-btn');
    const loginModal = document.getElementById('login-modal');
    const closeLoginModal = loginModal?.querySelector('.close-modal');
    
    if (loginBtn && loginModal && closeLoginModal) {
        loginBtn.addEventListener('click', () => {
            if (currentUser) {
                // Se usuário está logado, mostra informações
                alert(`Logado como: ${currentUser.name}\nEmail: ${currentUser.email}`);
            } else {
                // Se não está logado, abre modal
                loginModal.style.display = 'flex';
            }
        });
        
        closeLoginModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }
    
    // Modal do Carrinho - ADICIONADO
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCartModal = cartModal?.querySelector('.close-modal');
    
    if (cartBtn && cartModal && closeCartModal) {
        cartBtn.addEventListener('click', () => {
            updateCartDisplay();
            cartModal.style.display = 'flex';
        });
        
        closeCartModal.addEventListener('click', () => {
            cartModal.style.display = 'none';
        });
    }
    
    // Fechar modais clicando fora - MANTIDO
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Filtros de categoria - MANTIDO
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterProducts(btn.textContent);
        });
    });
    
    // Busca - MANTIDO
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchProducts(e.target.value);
        });
    }
    
    // Ordenação - MANTIDO
    const sortSelect = document.querySelector('.sort select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortProducts(e.target.value);
        });
    }
    
    // NOVO: Event listener para formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleUserLogin);
    }

    // Verificar se há novos produtos do admin
    checkForNewProducts();
}

// Verificar novos produtos do admin
function checkForNewProducts() {
    // Verificar a cada 5 segundos se há novos produtos
    setInterval(async () => {
        const adminProducts = localStorage.getItem('adminProducts');
        if (adminProducts) {
            const parsedProducts = JSON.parse(adminProducts);
            const currentProductIds = currentProducts.map(p => p.id);
            const newProductIds = parsedProducts.map(p => p.id);
            
            // Se há produtos diferentes, recarregar
            if (JSON.stringify(currentProductIds) !== JSON.stringify(newProductIds)) {
                console.log('Novos produtos detectados, recarregando...');
                await loadProducts();
            }
        }
    }, 5000);
}

// ========== FUNÇÕES DE USUÁRIO (MANTIDAS) ==========

// Verificar se usuário está logado
function checkUserAuth() {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('userToken');
    
    if (user && token) {
        currentUser = JSON.parse(user);
        updateUserInterface();
        return true;
    }
    return false;
}

// Atualizar interface do usuário
function updateUserInterface() {
    const userBtn = document.getElementById('user-btn');
    
    if (userBtn) {
        if (currentUser) {
            userBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
            userBtn.title = `Logado como ${currentUser.name}`;
            userBtn.setAttribute('data-logged', 'true');
        } else {
            userBtn.innerHTML = `<i class="fas fa-user"></i>`;
            userBtn.title = 'Fazer login';
            userBtn.setAttribute('data-logged', 'false');
        }
    }
}

// Login do usuário
async function handleUserLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            updateUserInterface();
            document.getElementById('login-modal').style.display = 'none';
            
            showNotification(`Bem-vindo(a), ${data.user.name}!`);
        } else {
            alert(data.error || 'Erro no login');
        }
    } catch (error) {
        console.error('Erro:', error);
        // Simulação de login para demonstração
        showLoading();
        setTimeout(() => {
            hideLoading();
            currentUser = {
                name: "Usuário Demo",
                email: email
            };
            
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('userToken', 'demo-token');
            updateUserInterface();
            document.getElementById('login-modal').style.display = 'none';
            
            showNotification(`Bem-vindo(a), ${currentUser.name}!`);
        }, 1000);
    }
}

// Logout do usuário
function logoutUser() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    currentUser = null;
    
    updateUserInterface();
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.style.display = 'none';
    }
    
    showNotification('Você saiu da sua conta');
}

// Mostrar formulário de registro
function showRegisterForm() {
    const loginModal = document.getElementById('login-modal');
    if (!loginModal) return;
    
    const loginForm = loginModal.querySelector('form');
    const modalHeader = loginModal.querySelector('.modal-header h2');
    
    modalHeader.textContent = 'Criar Conta';
    loginForm.innerHTML = `
        <div class="form-group">
            <label for="register-name">Nome completo</label>
            <input type="text" id="register-name" required>
        </div>
        <div class="form-group">
            <label for="register-email">E-mail</label>
            <input type="email" id="register-email" required>
        </div>
        <div class="form-group">
            <label for="register-password">Senha</label>
            <input type="password" id="register-password" required>
        </div>
        <div class="form-group">
            <label for="register-confirm-password">Confirmar senha</label>
            <input type="password" id="register-confirm-password" required>
        </div>
        <button type="button" class="login-btn" onclick="handleUserRegister()">Criar conta</button>
        <div style="text-align: center; margin-top: 1rem;">
            <a href="#" style="color: var(--primary-color);" onclick="showLoginForm()">Já tenho uma conta</a>
        </div>
    `;
}

// Mostrar formulário de login
function showLoginForm() {
    const loginModal = document.getElementById('login-modal');
    if (!loginModal) return;
    
    const loginForm = loginModal.querySelector('form');
    const modalHeader = loginModal.querySelector('.modal-header h2');
    
    modalHeader.textContent = 'Login';
    loginForm.innerHTML = `
        <div class="form-group">
            <label for="email">E-mail</label>
            <input type="email" id="email" required>
        </div>
        <div class="form-group">
            <label for="password">Senha</label>
            <input type="password" id="password" required>
        </div>
        <div class="form-options">
            <label>
                <input type="checkbox"> Lembrar-me
            </label>
            <a href="#">Esqueci minha senha</a>
        </div>
        <button type="submit" class="login-btn">Entrar</button>
        <div style="text-align: center; margin-top: 1rem;">
            <a href="#" style="color: var(--primary-color);" onclick="showRegisterForm()">Criar conta</a>
        </div>
    `;
    
    // Re-adicionar event listener
    loginForm.addEventListener('submit', handleUserLogin);
}

// Registro do usuário
async function handleUserRegister() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
    }
    
    if (password.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres!');
        return;
    }
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            updateUserInterface();
            document.getElementById('login-modal').style.display = 'none';
            
            showNotification(`Conta criada com sucesso! Bem-vindo(a), ${data.user.name}!`);
        } else {
            alert(data.error || 'Erro no registro');
        }
    } catch (error) {
        console.error('Erro:', error);
        // Simulação de registro para demonstração
        showLoading();
        setTimeout(() => {
            hideLoading();
            currentUser = {
                name: name,
                email: email
            };
            
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('userToken', 'demo-token');
            updateUserInterface();
            document.getElementById('login-modal').style.display = 'none';
            
            showNotification(`Conta criada com sucesso! Bem-vindo(a), ${currentUser.name}!`);
        }, 1000);
    }
}

// ========== FUNÇÕES DE FILTRO E BUSCA (ATUALIZADAS) ==========

// Filtrar produtos por categoria - ATUALIZADO
function filterProducts(category) {
    const productsContainer = document.getElementById('products-container');
    const productsToShow = category === 'Todos' ? 
        currentProducts : 
        currentProducts.filter(product => product.category === category);
    
    productsContainer.innerHTML = '';
    
    if (productsToShow.length === 0) {
        productsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-search" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3 style="color: #666; margin-bottom: 1rem;">Nenhum produto encontrado</h3>
                <p style="color: #999;">Tente outra categoria ou busca.</p>
            </div>
        `;
        return;
    }
    
    productsToShow.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image"
                 onerror="this.src='https://via.placeholder.com/300x300?text=Produto+Sem+Imagem'">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(product.rating)}
                    </div>
                    <span>(${product.reviewCount})</span>
                </div>
                <div class="product-actions">
                    <button class="buy-now-btn" onclick="buyNow(${product.id})">
                        <i class="fab fa-whatsapp"></i> Comprar Agora
                    </button>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Carrinho
                    </button>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
}

// Buscar produtos - ATUALIZADO
function searchProducts(query) {
    const filteredProducts = currentProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    
    const productsContainer = document.getElementById('products-container');
    productsContainer.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        productsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-search" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3 style="color: #666; margin-bottom: 1rem;">Nenhum produto encontrado</h3>
                <p style="color: #999;">Tente outros termos de busca.</p>
            </div>
        `;
        return;
    }
    
    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image"
                 onerror="this.src='https://via.placeholder.com/300x300?text=Produto+Sem+Imagem'">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(product.rating)}
                    </div>
                    <span>(${product.reviewCount})</span>
                </div>
                <div class="product-actions">
                    <button class="buy-now-btn" onclick="buyNow(${product.id})">
                        <i class="fab fa-whatsapp"></i> Comprar Agora
                    </button>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Carrinho
                    </button>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
}

// Ordenar produtos - ATUALIZADO
function sortProducts(criteria) {
    let sortedProducts = [...currentProducts];
    
    switch (criteria) {
        case 'Menor preço':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'Maior preço':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
        case 'Mais vendidos':
            sortedProducts.sort((a, b) => b.reviewCount - a.reviewCount);
            break;
        case 'Melhor avaliados':
            sortedProducts.sort((a, b) => b.rating - a.rating);
            break;
    }
    
    const productsContainer = document.getElementById('products-container');
    productsContainer.innerHTML = '';
    
    sortedProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image"
                 onerror="this.src='https://via.placeholder.com/300x300?text=Produto+Sem+Imagem'">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(product.rating)}
                    </div>
                    <span>(${product.reviewCount})</span>
                </div>
                <div class="product-actions">
                    <button class="buy-now-btn" onclick="buyNow(${product.id})">
                        <i class="fab fa-whatsapp"></i> Comprar Agora
                    </button>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Carrinho
                    </button>
                </div>
            </div>
        `;
        productsContainer.appendChild(productCard);
    });
}

// Mostrar notificação - MANTIDO
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Simular loading - MANTIDO
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Função para forçar atualização dos produtos (pode ser chamada pelo admin)
function refreshProducts() {
    loadProducts();
    showNotification('Produtos atualizados!');
}