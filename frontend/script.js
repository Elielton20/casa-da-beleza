// ========== CORREÇÕES DE BUGS ==========

// Dados iniciais dos produtos (fallback) - MANTIDO
const initialProducts = [
    // ... seus produtos iniciais ...
];

// Variáveis de otimização - CORRIGIDO: Adicionado verificação de null
let currentPage = 0;
const PRODUCTS_PER_PAGE = 12;
let allProducts = [];
let starsCache = new Map();

// Carrinho de compras - CORRIGIDO: Inicialização correta
let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
let currentProducts = [];

// Sistema de Usuário - CORRIGIDO: Verificação de segurança
let currentUser = null;
try {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
} catch (e) {
    console.error('Erro ao carregar usuário:', e);
    currentUser = null;
}

const WHATSAPP_NUMBER = "559391445597";

// ========== FUNÇÕES PRINCIPAIS CORRIGIDAS ==========

async function loadProducts() {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) {
        console.error('❌ Container de produtos não encontrado');
        return;
    }
    
    try {
        allProducts = await loadProductsFromStorage();
        currentProducts = allProducts;
        
        productsContainer.innerHTML = '';
        currentPage = 0;
        
        console.log('📦 Produtos carregados:', allProducts.length);
        
        if (!allProducts || allProducts.length === 0) {
            productsContainer.innerHTML = `
                <div class="no-products" style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                    <i class="fas fa-box-open" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <h3 style="color: #666; margin-bottom: 1rem;">Nenhum produto</h3>
                    <p style="color: #999;">Os produtos serão adicionados em breve.</p>
                </div>
            `;
            return;
        }
        
        renderProductsChunk();
        setupInfiniteScroll();
        setupLazyLoading();
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
        productsContainer.innerHTML = `
            <div class="no-products" style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3 style="color: #666; margin-bottom: 1rem;">Erro ao carregar produtos</h3>
                <p style="color: #999;">Tente recarregar a página.</p>
            </div>
        `;
    }
}

// Função para carregar produtos do servidor - CORRIGIDA
async function loadProductsFromStorage() {
    try {
        console.log('🔄 Iniciando carregamento de produtos...');
        
        // Tenta carregar do Supabase
        if (typeof supabase !== 'undefined' && supabaseUrl && supabaseKey) {
            console.log('📡 Conectando ao Supabase...');
            
            const { data: products, error } = await supabase
                .from('products')
                .select(`
                    id,
                    name, 
                    price,
                    image,
                    category_id,
                    categories (name)
                `)
                .order('name');

            console.log('📦 Resposta do Supabase:', { 
                productsCount: products ? products.length : 0, 
                error: error ? error.message : 'Nenhum erro' 
            });
            
            if (!error && products && products.length > 0) {
                console.log('✅ Produtos carregados do Supabase:', products.length);
                
                const produtosFormatados = products.map(product => ({
                    id: product.id,
                    name: product.name,
                    price: parseFloat(product.price) || 0,
                    category_id: product.category_id,
                    category: product.categories?.name || 'Sem categoria',
                    image: product.image || 'https://via.placeholder.com/300x300?text=Produto+Sem+Imagem',
                    rating: 4.5,
                    reviewCount: Math.floor(Math.random() * 200) + 50
                }));
                
                return produtosFormatados;
            }
        }
        
        // Fallback: Tenta carregar do localStorage (admin)
        console.log('🔄 Tentando carregar do localStorage...');
        const adminProducts = localStorage.getItem('adminProducts');
        if (adminProducts) {
            try {
                const parsedProducts = JSON.parse(adminProducts);
                console.log('📦 Produtos do localStorage:', parsedProducts.length);
                return parsedProducts;
            } catch (e) {
                console.error('Erro ao parsear produtos do admin:', e);
            }
        }
        
        // Fallback final: produtos locais
        console.log('🔄 Usando produtos locais como fallback');
        return initialProducts;
        
    } catch (error) {
        console.error('💥 Erro crítico ao carregar produtos:', error);
        return initialProducts;
    }
}

// Nova função: Renderizar produtos em partes - CORRIGIDA
function renderProductsChunk() {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer || !currentProducts.length) return;
    
    const startIndex = currentPage * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const productsToRender = currentProducts.slice(startIndex, endIndex);
    
    const fragment = document.createDocumentFragment();
    
    productsToRender.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img data-src="${product.image}" alt="${product.name}" class="product-image lazy"
                 onerror="this.src='https://via.placeholder.com/300x300?text=Produto+Sem+Imagem'">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-price">R$ ${(product.price || 0).toFixed(2)}</div>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(product.rating || 4.5)}
                    </div>
                    <span>(${product.reviewCount || 0})</span>
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
        fragment.appendChild(productCard);
    });
    
    productsContainer.appendChild(fragment);
    currentPage++;
}

// Nova função: Scroll infinito - CORRIGIDA
function setupInfiniteScroll() {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    
    // Remove trigger existente
    const existingTrigger = document.getElementById('load-more-trigger');
    if (existingTrigger) {
        existingTrigger.remove();
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && 
                (currentPage * PRODUCTS_PER_PAGE) < currentProducts.length) {
                renderProductsChunk();
                setupLazyLoading();
            }
        });
    }, {
        threshold: 0.1
    });
    
    const trigger = document.createElement('div');
    trigger.id = 'load-more-trigger';
    trigger.style.height = '10px';
    productsContainer.appendChild(trigger);
    
    observer.observe(trigger);
}

// Nova função: Lazy Loading para imagens - CORRIGIDA
function setupLazyLoading() {
    const lazyImages = document.querySelectorAll('.product-image.lazy:not([data-observed])');
    
    if (lazyImages.length === 0) return;
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                img.setAttribute('data-observed', 'true');
                imageObserver.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => {
        img.setAttribute('data-observed', 'true');
        imageObserver.observe(img);
    });
}

// Função generateStars OTIMIZADA com cache - CORRIGIDA
function generateStars(rating) {
    const numericRating = parseFloat(rating) || 0;
    const cacheKey = numericRating.toString();
    
    if (starsCache.has(cacheKey)) {
        return starsCache.get(cacheKey);
    }
    
    const fullStars = Math.floor(numericRating);
    const halfStar = numericRating % 1 >= 0.5;
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
    
    starsCache.set(cacheKey, stars);
    return stars;
}

// ========== FUNÇÕES DO CARRINHO CORRIGIDAS ==========

// Adicionar produto ao carrinho - CORRIGIDA
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
            price: product.price || 0,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCartToStorage();
    updateCartCounter();
    showNotification(`${product.name} adicionado ao carrinho!`);
}

// Salvar carrinho no localStorage - CORRIGIDA
function saveCartToStorage() {
    try {
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
    } catch (e) {
        console.error('Erro ao salvar carrinho:', e);
    }
}

// Carregar carrinho do localStorage - CORRIGIDA
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('shoppingCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    } catch (e) {
        console.error('Erro ao carregar carrinho:', e);
        cart = [];
    }
}

// Atualizar contador do carrinho - CORRIGIDA
// ========== CORREÇÕES ESPECÍFICAS PARA O CARRINHO ==========

// Atualizar exibição do carrinho - CORREÇÃO COMPLETA
function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const emptyCartElement = document.getElementById('empty-cart');
    const cartContentElement = document.getElementById('cart-content');
    
    console.log('🛒 Atualizando exibição do carrinho, itens:', cart.length);
    
    if (!cartItemsContainer || !cartTotalElement || !emptyCartElement || !cartContentElement) {
        console.error('❌ Elementos do carrinho não encontrados!');
        return;
    }
    
    if (cart.length === 0) {
        console.log('🛒 Carrinho vazio');
        emptyCartElement.style.display = 'block';
        cartContentElement.style.display = 'none';
        return;
    }
    
    console.log('🛒 Exibindo', cart.length, 'itens no carrinho');
    emptyCartElement.style.display = 'none';
    cartContentElement.style.display = 'block';
    
    cartItemsContainer.innerHTML = '';
    
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        total += itemTotal;
        
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        cartItemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}" 
                 onerror="this.src='https://via.placeholder.com/60x60?text=Produto'">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <div class="cart-item-price">R$ ${(item.price || 0).toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
                <button onclick="updateQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity || 1}</span>
                <button onclick="updateQuantity(${item.id}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemElement);
    });
    
    cartTotalElement.textContent = `R$ ${total.toFixed(2)}`;
    console.log('🛒 Total do carrinho: R$', total.toFixed(2));
}

// Remover item do carrinho - CORRIGIDA
function removeFromCart(productId) {
    console.log('🗑️ Removendo item do carrinho:', productId);
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCartCounter();
    updateCartDisplay(); // ATUALIZA A EXIBIÇÃO IMEDIATAMENTE
    showNotification('Produto removido do carrinho!');
}

// Atualizar quantidade do item no carrinho - CORRIGIDA
function updateQuantity(productId, change) {
    console.log('🔄 Atualizando quantidade do produto:', productId, 'mudança:', change);
    
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity = (item.quantity || 1) + change;
        
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCartToStorage();
            updateCartCounter();
            updateCartDisplay(); // ATUALIZA A EXIBIÇÃO IMEDIATAMENTE
        }
    }
}

// Adicionar produto ao carrinho - CORRIGIDA (já tinha, mas vou garantir)
function addToCart(productId) {
    const product = currentProducts.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Produto não encontrado!');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCartToStorage();
    updateCartCounter();
    showNotification(`${product.name} adicionado ao carrinho!`);
    
    // ATUALIZA A EXIBIÇÃO SE O CARRINHO ESTIVER ABERTO
    if (document.getElementById('cart-modal').style.display === 'flex') {
        updateCartDisplay();
    }
}

// ========== CORREÇÃO DOS EVENT LISTENERS DO CARRINHO ==========

// Substitua a parte dos event listeners do carrinho por esta versão corrigida:

// Modal do Carrinho - VERSÃO CORRIGIDA
const cartBtn = document.getElementById('cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeCartModal = cartModal?.querySelector('.close-modal');

if (cartBtn && cartModal && closeCartModal) {
    cartBtn.addEventListener('click', () => {
        console.log('📱 Abrindo modal do carrinho');
        updateCartDisplay(); // GARANTE QUE ATUALIZA ANTES DE ABRIR
        cartModal.style.display = 'flex';
    });
    
    closeCartModal.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
}

// ========== CORREÇÃO DA INICIALIZAÇÃO DO CARRINHO ==========

// Adicione esta função para garantir que o carrinho seja inicializado corretamente
function initializeCart() {
    console.log('🛒 Inicializando carrinho...');
    loadCartFromStorage();
    updateCartCounter();
    
    // Garante que os elementos do carrinho existam
    setTimeout(() => {
        updateCartDisplay();
    }, 100);
}

// ========== ATUALIZE A INICIALIZAÇÃO PRINCIPAL ==========

// Substitua esta parte no DOMContentLoaded:
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando aplicação...');
    
    // 1. PRIMEIRO: Inicializa o carrinho
    initializeCart();
    
    // 2. SEGUNDO: Carrega os produtos
    await loadProducts();
    
    // 3. TERCEIRO: Configurações adicionais
    await updateCategoryButtons();
    setupEventListeners();
    checkUserAuth();
    
    console.log('✅ Aplicação inicializada com sucesso!');
});

// ========== FUNÇÃO AUXILIAR PARA DEBUG ==========

// Adicione esta função para ajudar no debug (opcional)
function debugCart() {
    console.log('=== DEBUG DO CARRINHO ===');
    console.log('Itens no array cart:', cart);
    console.log('LocalStorage:', localStorage.getItem('shoppingCart'));
    console.log('Contador no DOM:', document.getElementById('cart-count')?.textContent);
    console.log('Modal visível:', document.getElementById('cart-modal').style.display);
    updateCartDisplay();
}

// ========== GARANTIR QUE TODAS AS FUNÇÕES DO CARRINHO ESTÃO CORRETAS ==========

// Salvar carrinho no localStorage - REESCRITA PARA MAIOR CONFIABILIDADE
function saveCartToStorage() {
    try {
        console.log('💾 Salvando carrinho no localStorage:', cart.length, 'itens');
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
    } catch (e) {
        console.error('❌ Erro ao salvar carrinho:', e);
    }
}

// Carregar carrinho do localStorage - REESCRITA PARA MAIOR CONFIABILIDADE
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('shoppingCart');
        console.log('📂 Carrinho salvo no localStorage:', savedCart);
        
        if (savedCart) {
            cart = JSON.parse(savedCart);
            console.log('🛒 Carrinho carregado:', cart.length, 'itens');
        } else {
            cart = [];
            console.log('🛒 Nenhum carrinho salvo encontrado, iniciando vazio');
        }
    } catch (e) {
        console.error('❌ Erro ao carregar carrinho:', e);
        cart = [];
    }
}

// Atualizar contador do carrinho - REESCRITA PARA MAIOR CONFIABILIDADE
function updateCartCounter() {
    const cartCounter = document.getElementById('cart-count');
    const totalItems = cart.reduce((total, item) => total + (item.quantity || 1), 0);
    
    console.log('🔢 Atualizando contador do carrinho:', totalItems, 'itens');
    
    if (cartCounter) {
        cartCounter.textContent = totalItems;
        cartCounter.style.display = totalItems > 0 ? 'flex' : 'none';
    } else {
        console.error('❌ Elemento cart-count não encontrado!');
        // Tenta criar se não existir
        createCartCounter();
    }
}

// ========== FUNÇÕES DE FILTRO E BUSCA CORRIGIDAS ==========

// Função para filtrar produtos por categoria - CORRIGIDA
function filterProductsByCategory(categoryId, event) {
    console.log('🎯 Filtrando produtos por categoria ID:', categoryId);
    
    // Remove a classe active de todos os botões
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adiciona active no botão clicado
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Se for "Todos", mostra todos os produtos
    if (categoryId === 'all') {
        currentProducts = allProducts;
        resetProductView();
        return;
    }
    
    // Filtra os produtos pela categoria ID
    const filteredProducts = allProducts.filter(product => 
        product.category_id == categoryId
    );
    
    currentProducts = filteredProducts;
    resetProductView();
}

// Resetar visualização de produtos - NOVA FUNÇÃO
function resetProductView() {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    
    productsContainer.innerHTML = '';
    currentPage = 0;
    
    if (currentProducts.length === 0) {
        productsContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1 / -1;">
                <i class="fas fa-search" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3 style="color: #666; margin-bottom: 1rem;">Nenhum produto</h3>
                <p style="color: #999;">Tente outra categoria ou busca.</p>
            </div>
        `;
        return;
    }
    
    renderProductsChunk();
    setupInfiniteScroll();
    setupLazyLoading();
}

// Buscar produtos - CORRIGIDA
function searchProducts(query) {
    if (!query.trim()) {
        currentProducts = allProducts;
        resetProductView();
        return;
    }
    
    const filteredProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
    );
    
    currentProducts = filteredProducts;
    resetProductView();
}

// ========== CONFIGURAÇÃO DE EVENT LISTENERS CORRIGIDA ==========

function setupEventListeners() {
    // Modal de Login
    const loginBtn = document.getElementById('user-btn');
    const loginModal = document.getElementById('login-modal');
    const closeLoginModal = loginModal?.querySelector('.close-modal');
    
    if (loginBtn && loginModal && closeLoginModal) {
        loginBtn.addEventListener('click', () => {
            if (currentUser) {
                alert(`Logado como: ${currentUser.name}\nEmail: ${currentUser.email}`);
            } else {
                loginModal.style.display = 'flex';
            }
        });
        
        closeLoginModal.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }
    
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
    
    // Fechar modais clicando fora
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Filtros de categoria - CORRIGIDA
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const categoryId = this.getAttribute('data-category-id') || this.getAttribute('data-category');
            filterProductsByCategory(categoryId, e);
        });
    });
    
    // Busca COM DEBOUNCE
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchProducts(e.target.value);
            }, 300);
        });
    }
    
    // Ordenação
    const sortSelect = document.querySelector('.sort select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortProducts(e.target.value);
        });
    }
    
    // Event listener para formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleUserLogin);
    }
}

// ========== INICIALIZAÇÃO CORRIGIDA ==========

document.addEventListener('DOMContentLoaded', async function() {
    // Carrega o carrinho primeiro
    loadCartFromStorage();
    updateCartCounter();
    
    // Depois carrega os produtos
    await loadProducts();
    await updateCategoryButtons();
    setupEventListeners();
    checkUserAuth();
    
    // Verificação de novos produtos
    setTimeout(() => {
        checkForNewProducts();
    }, 2000);
});

// ========== OUTRAS CORREÇÕES ==========

// Verificar novos produtos do admin - CORRIGIDA
function checkForNewProducts() {
    const shouldRefresh = localStorage.getItem('forceRefreshProducts');
    if (shouldRefresh === 'true') {
        console.log('🔄 Recarregando produtos por solicitação do admin...');
        localStorage.removeItem('forceRefreshProducts');
        loadProducts();
        return true;
    }
    return false;
}

// Finalizar compra via WhatsApp - CORRIGIDA
function checkout() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    let message = `🛍️ *PEDIDO - Casa da Beleza* 🛍️\n\n`;
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        total += itemTotal;
        
        message += `*Produto ${index + 1}:*\n`;
        message += `📦 ${item.name}\n`;
        message += `💰 Preço unitário: R$ ${(item.price || 0).toFixed(2)}\n`;
        message += `🔢 Quantidade: ${item.quantity || 1}\n`;
        message += `💵 Subtotal: R$ ${itemTotal.toFixed(2)}\n\n`;
    });
    
    message += `*TOTAL DO PEDIDO: R$ ${total.toFixed(2)}*\n\n`;
    message += `Olá! Gostaria de finalizar minha compra com os produtos listados acima. Poderia me ajudar?`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    
    cart = [];
    saveCartToStorage();
    updateCartCounter();
    updateCartDisplay();
    
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.style.display = 'none';
    }
    
    showNotification('Pedido enviado para o WhatsApp!');
}

// COMPRAR AGORA - CORRIGIDA
function buyNow(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) {
        alert('Produto não encontrado!');
        return;
    }

    const message = `🛍️ *COMPRA DIRETA* 🛍️\n\n` +
                   `*Produto:* ${product.name}\n` +
                   `*Preço:* R$ ${(product.price || 0).toFixed(2)}\n` +
                   `*Categoria:* ${product.category || 'Sem categoria'}\n\n` +
                   `Olá! Gostaria de comprar este produto. Poderia me ajudar?`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
}

// Restante do código mantido sem alterações...
// [Todas as outras funções permanecem como estão]

// ========== FUNÇÕES RESTANTES MANTIDAS (sem alterações) ==========

// Verificar novos produtos do admin - MANTIDA
// Verificar novos produtos do admin - VERSÃO CORRIGIDA
function checkForNewProducts() {
    // ⚠️ REMOVIDO: setInterval automático
    // ⚠️ AGORA: Só verifica quando há uma ação específica do admin
    
    console.log('🔍 Verificação de novos produtos (modo manual)');
    
    // Apenas verifica se houver uma flag específica no localStorage
    const shouldRefresh = localStorage.getItem('forceRefreshProducts');
    if (shouldRefresh === 'true') {
        console.log('🔄 Recarregando produtos por solicitação do admin...');
        localStorage.removeItem('forceRefreshProducts'); // Limpa a flag
        loadProducts();
        return true;
    }
    
    return false;
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

// Login do usuário - MANTIDA
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

// Logout do usuário - MANTIDA
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

// Mostrar formulário de registro - MANTIDA
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

// Mostrar formulário de login - MANTIDA
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
    
    loginForm.addEventListener('submit', handleUserLogin);
}

// Registro do usuário - MANTIDA
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

// ========== FUNÇÕES DE FILTRO E BUSCA (MANTIDAS) ==========

// Buscar produtos - MANTIDA
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

// Ordenar produtos - MANTIDA
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

// Função para forçar atualização dos produtos - MANTIDA
function refreshProducts() {
    loadProducts();
    showNotification('Produtos atualizados!');
}