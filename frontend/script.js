// ========== INICIALIZAÇÃO DO SUPABASE ==========
const supabaseUrl = 'https://seu-projeto.supabase.co'; // SUA URL DO SUPABASE
const supabaseKey = 'sua-chave-anonima'; // SUA CHAVE ANÔNIMA
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

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

// ========== VARIÁVEIS GLOBAIS ==========
let cart = [];
let currentProducts = [];
let currentUser = null;
const WHATSAPP_NUMBER = "559391445597";

// ========== FUNÇÕES PRINCIPAIS CORRIGIDAS ==========

// Função para carregar produtos - VERSÃO CORRIGIDA E SEGURA
async function loadProductsFromStorage() {
    try {
        console.log('🔄 Carregando produtos...');
        
        // Tenta carregar do Supabase primeiro
        if (typeof supabase !== 'undefined' && supabase) {
            const { data: products, error } = await supabase
                .from('products')
                .select(`
                    *,
                    categories (name)
                `)
                .order('name');

            if (!error && products && products.length > 0) {
                console.log('✅ Produtos carregados do Supabase:', products.length);
                
                return products.map(product => ({
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price),
                    category_id: product.category_id,
                    category: product.categories?.name || 'Sem categoria',
                    image: product.image || 'https://via.placeholder.com/300x300?text=Produto+Sem+Imagem',
                    rating: parseFloat(product.rating) || 4.5,
                    reviewCount: product.review_count || Math.floor(Math.random() * 200) + 50
                }));
            }
        }
        
        // Fallback para produtos locais
        console.log('🔄 Usando produtos locais');
        return initialProducts;
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        console.log('🔄 Usando produtos locais como fallback');
        return initialProducts;
    }
}

// Função para carregar categorias - VERSÃO CORRIGIDA E SEGURA
async function loadCategoriesFromAPI() {
    try {
        console.log('🔄 Carregando categorias...');
        
        // Tenta carregar do Supabase primeiro
        if (typeof supabase !== 'undefined' && supabase) {
            const { data: categories, error } = await supabase
                .from('categories')
                .select('*')
                .eq('status', 'active')
                .order('name');

            if (!error && categories && categories.length > 0) {
                console.log('✅ Categorias carregadas do Supabase:', categories.length);
                return categories;
            }
        }
        
        // Fallback para categorias locais
        console.log('🔄 Usando categorias locais');
        return [
            { id: 1, name: "Maquiagem", status: "active" },
            { id: 2, name: "Skincare", status: "active" },
            { id: 3, name: "Cabelos", status: "active" },
            { id: 4, name: "Perfumes", status: "active" },
            { id: 5, name: "Corpo e Banho", status: "active" }
        ];
        
    } catch (error) {
        console.error('❌ Erro ao carregar categorias:', error);
        return [
            { id: 1, name: "Maquiagem", status: "active" },
            { id: 2, name: "Skincare", status: "active" },
            { id: 3, name: "Cabelos", status: "active" },
            { id: 4, name: "Perfumes", status: "active" },
            { id: 5, name: "Corpo e Banho", status: "active" }
        ];
    }
}

// Função para atualizar botões de categoria - CORRIGIDA
async function updateCategoryButtons() {
    try {
        const categories = await loadCategoriesFromAPI();
        const categoriesContainer = document.querySelector('.categories');
        
        if (!categoriesContainer) {
            console.error('❌ Container de categorias não encontrado');
            return;
        }
        
        // Limpa categorias existentes (exceto "Todos")
        const existingButtons = categoriesContainer.querySelectorAll('.category-btn');
        existingButtons.forEach(btn => {
            if (btn.getAttribute('data-category-id') !== 'all') {
                btn.remove();
            }
        });
        
        // Adiciona categorias
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.setAttribute('data-category-id', category.id);
            button.textContent = category.name;
            button.addEventListener('click', function() {
                filterProductsByCategory(category.id);
            });
            
            categoriesContainer.appendChild(button);
        });
        
        console.log('✅ Botões de categoria atualizados');
    } catch (error) {
        console.error('❌ Erro ao atualizar botões de categoria:', error);
    }
}

// Função para filtrar produtos por categoria - CORRIGIDA
function filterProductsByCategory(categoryId) {
    console.log('🎯 Filtrando produtos por categoria ID:', categoryId);
    
    // Remove a classe active de todos os botões
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adiciona active no botão clicado
    event.target.classList.add('active');
    
    // Se for "Todos", mostra todos os produtos
    if (categoryId === 'all') {
        loadProducts();
        return;
    }
    
    // Filtra os produtos pela categoria ID
    const filteredProducts = currentProducts.filter(product => 
        product.category_id == categoryId || product.category === categoryId
    );
    
    renderFilteredProducts(filteredProducts);
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando aplicação...');
    await loadProducts();
    await updateCategoryButtons();
    setupEventListeners();
    checkUserAuth();
    loadCartFromStorage();
    updateCartCounter();
});

// Carregar produtos na página - CORRIGIDA
async function loadProducts() {
    const productsContainer = document.getElementById('products-container');
    
    if (!productsContainer) {
        console.error('❌ Container de produtos não encontrado');
        return;
    }
    
    productsContainer.innerHTML = '<div class="loading">Carregando produtos...</div>';
    
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

// ========== FUNÇÕES DO CARRINHO (MANTIDAS E OTIMIZADAS) ==========
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

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCartCounter();
    updateCartDisplay();
}

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

function saveCartToStorage() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('shoppingCart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (error) {
            console.error('❌ Erro ao carregar carrinho:', error);
            cart = [];
        }
    }
}

function updateCartCounter() {
    const cartCounter = document.getElementById('cart-count');
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    if (cartCounter) {
        cartCounter.textContent = totalItems;
        cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const emptyCartElement = document.getElementById('empty-cart');
    const cartContentElement = document.getElementById('cart-content');
    
    if (!cartItemsContainer || !emptyCartElement || !cartContentElement) return;
    
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
    
    if (cartTotalElement) {
        cartTotalElement.textContent = `R$ ${total.toFixed(2)}`;
    }
}

// ========== FUNÇÕES DE COMPRA ==========
function checkout() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    let message = `🛍️ *PEDIDO - Casa da Beleza* 🛍️\n\n`;
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
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    // Limpa carrinho após compra
    cart = [];
    saveCartToStorage();
    updateCartCounter();
    updateCartDisplay();
    
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) cartModal.style.display = 'none';
    
    showNotification('Pedido enviado para o WhatsApp!');
}

function buyNow(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) {
        alert('Produto não encontrado!');
        return;
    }

    const message = `🛍️ *COMPRA DIRETA* 🛍️\n\n` +
                   `*Produto:* ${product.name}\n` +
                   `*Preço:* R$ ${product.price.toFixed(2)}\n` +
                   `*Categoria:* ${product.category}\n\n` +
                   `Olá! Gostaria de comprar este produto. Poderia me ajudar?`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// ========== FUNÇÕES AUXILIARES ==========
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (halfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';
    
    return stars;
}

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
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// ========== CONFIGURAÇÃO DE EVENT LISTENERS ==========
function setupEventListeners() {
    // Modal do Carrinho
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
    
    // Filtros de categoria
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-category-id');
            filterProductsByCategory(categoryId);
        });
    });
    
    // Busca
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchProducts(e.target.value);
        });
    }
    
    // Ordenação
    const sortSelect = document.querySelector('.sort select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortProducts(e.target.value);
        });
    }
    
    // Fechar modais clicando fora
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ========== FUNÇÕES DE BUSCA E ORDENAÇÃO ==========
function searchProducts(query) {
    const filteredProducts = currentProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
    );
    
    renderFilteredProducts(filteredProducts);
}

function sortProducts(criteria) {
    let sortedProducts = [...currentProducts];
    
    switch (criteria) {
        case 'Menor preço': sortedProducts.sort((a, b) => a.price - b.price); break;
        case 'Maior preço': sortedProducts.sort((a, b) => b.price - a.price); break;
        case 'Mais vendidos': sortedProducts.sort((a, b) => b.reviewCount - a.reviewCount); break;
        case 'Melhor avaliados': sortedProducts.sort((a, b) => b.rating - a.rating); break;
    }
    
    renderFilteredProducts(sortedProducts);
}

function renderFilteredProducts(filteredProducts) {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    
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

// ========== FUNÇÕES DE USUÁRIO (SIMPLIFICADAS) ==========
function checkUserAuth() {
    const user = localStorage.getItem('user');
    if (user) {
        currentUser = JSON.parse(user);
        updateUserInterface();
    }
}

function updateUserInterface() {
    const userBtn = document.getElementById('user-btn');
    if (userBtn && currentUser) {
        userBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
        userBtn.title = `Logado como ${currentUser.name}`;
    }
}

// ========== FUNÇÃO DE ATUALIZAÇÃO ==========
function refreshProducts() {
    loadProducts();
    showNotification('Produtos atualizados!');
}

console.log('✅ Aplicação carregada com sucesso!');