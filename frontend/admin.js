// Sistema de autenticação
function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'admin.html';
        return false;
    }
    return true;
}

// Verificar autenticação ao carregar a página
if (!checkAdminAuth()) {
    // Redirecionamento já acontece na função acima
}

// 🔥 CACHE para produtos - evita recarregamentos desnecessários
let productsCache = null;
let lastCacheTime = 0;
const CACHE_DURATION = 30000; // 30 segundos

// Headers padrão para requisições autenticadas
function getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// 🔥 Função fetch OTIMIZADA com timeout
async function fastFetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// Gerenciamento de Produtos
class ProductManager {
    constructor() {
        if (!checkAdminAuth()) return;
        
        this.products = [];
        this.currentProductId = null;
        this.categories = [
            { id: 1, name: 'Maquiagem' },
            { id: 2, name: 'Skincare' },
            { id: 3, name: 'Cabelos' },
            { id: 4, name: 'Perfumes' },
            { id: 5, name: 'Corpo e Banho' }
        ];
        this.init();
    }

    async init() {
        // 🔥 CARREGAMENTO PARALELO - Mais rápido
        await Promise.all([
            this.loadProducts(),
            this.loadStats()
        ]);
        this.setupEventListeners();
    }

    async loadProducts() {
        // 🔥 USAR CACHE se disponível e recente
        const now = Date.now();
        if (productsCache && (now - lastCacheTime) < CACHE_DURATION) {
            this.products = productsCache;
            this.renderProducts();
            return;
        }

        try {
            // 🔥 FETCH RÁPIDO com timeout
            this.products = await fastFetch('/api/admin/products', {
                headers: getAuthHeaders()
            });
            
            // 🔥 ATUALIZAR CACHE
            productsCache = this.products;
            lastCacheTime = Date.now();
            
            this.renderProducts();
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            this.showError('Erro ao carregar produtos. Usando cache local.');
            this.renderProducts();
        }
    }

    async loadStats() {
        try {
            // 🔥 STATS RÁPIDO - Não bloqueia a interface
            const stats = await fastFetch('/api/admin/stats', {
                headers: getAuthHeaders()
            });
            this.updateStats(stats);
        } catch (error) {
            console.error('Erro stats:', error);
            // 🔥 CALCULAR STATS LOCALMENTE se API falhar
            this.calculateLocalStats();
        }
    }

    calculateLocalStats() {
        const totalProducts = this.products.length;
        const totalValue = this.products.reduce((sum, product) => 
            sum + (product.price * (product.stock || 0)), 0
        );
        const totalCategories = new Set(this.products.map(p => p.category)).size;

        this.updateStats({
            totalProducts,
            totalValue,
            totalCategories
        });
    }

    renderProducts() {
        const tbody = document.getElementById('admin-products-list');
        if (!tbody) return;
        
        // 🔥 RENDERIZAÇÃO RÁPIDA com template string
        if (this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <i class="fas fa-box-open"></i>
                        Nenhum produto cadastrado
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>
                    <img src="${product.image}" alt="${product.name}" 
                         class="product-image-admin"
                         onerror="this.src='https://via.placeholder.com/60x60?text=Imagem'">
                </td>
                <td>${this.escapeHtml(product.name)}</td>
                <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                <td>${this.escapeHtml(product.category_name || product.category || 'Geral')}</td>
                <td>${product.stock || 0}</td>
                <td>
                    <span class="status-badge ${product.status === 'active' ? 'active' : 'inactive'}">
                        ${product.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="productManager.editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-delete" onclick="productManager.confirmDelete(${product.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 🔥 ESCAPE HTML para segurança
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupEventListeners() {
        // Botão Adicionar Produto
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.openProductModal();
        });

        // Formulário de Produto
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Preview de Imagem - DELEGAÇÃO para performance
        document.getElementById('product-image').addEventListener('change', (e) => {
            this.previewImage(e.target.files[0]);
        });

        // Botão Cancelar
        document.querySelector('.btn-cancel').addEventListener('click', () => {
            this.closeProductModal();
        });

        // 🔥 BUSCA OTIMIZADA com debounce
        let searchTimeout;
        document.getElementById('admin-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchProducts(e.target.value);
            }, 300); // 300ms debounce
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Deseja sair do painel administrativo?')) {
                localStorage.removeItem('adminToken');
                window.location.href = 'admin.html';
            }
        });

        // Outros botões
        ['manage-categories-btn', 'update-prices-btn', 'bulk-upload-btn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    alert('Funcionalidade em desenvolvimento!');
                });
            }
        });

        // Modais
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Fechar modais clicando fora
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    openProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        
        // 🔥 PREENCHER CATEGORIAS RAPIDAMENTE
        const categorySelect = document.getElementById('product-category');
        categorySelect.innerHTML = this.categories.map(cat => 
            `<option value="${cat.id}">${cat.name}</option>`
        ).join('');
        
        if (product) {
            title.textContent = 'Editar Produto';
            this.fillProductForm(product);
        } else {
            title.textContent = 'Adicionar Novo Produto';
            this.clearProductForm();
        }
        
        modal.style.display = 'block';
    }

    closeProductModal() {
        document.getElementById('product-modal').style.display = 'none';
        this.clearProductForm();
    }

    fillProductForm(product) {
        this.currentProductId = product.id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-category').value = product.category_id || product.category || '';
        document.getElementById('product-stock').value = product.stock || 0;
        document.getElementById('product-status').value = product.status || 'active';
        document.getElementById('product-description').value = product.description || '';
        
        // Preview da imagem
        const preview = document.getElementById('image-preview');
        if (preview && product.image) {
            preview.innerHTML = `<img src="${product.image}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
        }
    }

    clearProductForm() {
        this.currentProductId = null;
        document.getElementById('product-form').reset();
        document.getElementById('image-preview').innerHTML = '<i class="fas fa-image" style="color: #ccc;"></i>';
    }

    previewImage(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('image-preview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(file);
    }

    async saveProduct() {
        // 🔥 BLOQUEAR BOTÃO durante salvamento
        const submitBtn = document.querySelector('#product-form button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        submitBtn.disabled = true;

        try {
            const formData = {
                name: document.getElementById('product-name').value,
                price: parseFloat(document.getElementById('product-price').value),
                category_id: parseInt(document.getElementById('product-category').value),
                stock: parseInt(document.getElementById('product-stock').value),
                status: document.getElementById('product-status').value,
                description: document.getElementById('product-description').value
            };

            // Validação rápida
            if (!formData.name || !formData.price || !formData.category_id) {
                throw new Error('Preencha nome, preço e categoria');
            }

            // Processar imagem se houver
            const imageFile = document.getElementById('product-image').files[0];
            if (imageFile) {
                formData.image = await this.processImage(imageFile);
            } else if (this.currentProductId) {
                const existing = this.products.find(p => p.id === this.currentProductId);
                formData.image = existing?.image;
            }

            // 🔥 SALVAMENTO RÁPIDO na API
            let response;
            if (this.currentProductId) {
                response = await fastFetch(`/api/admin/products/${this.currentProductId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
            } else {
                response = await fastFetch('/api/admin/products', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
            }

            // 🔥 INVALIDAR CACHE - forçar recarregamento
            productsCache = null;
            
            await this.loadProducts();
            await this.loadStats();
            this.closeProductModal();
            
            this.showNotification('✅ Produto salvo com sucesso!');
            
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.showError(`Erro ao salvar: ${error.message}`);
        } finally {
            // 🔥 RESTAURAR BOTÃO
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    processImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }

    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) this.openProductModal(product);
    }

    confirmDelete(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        document.getElementById('confirm-message').textContent = 
            `Tem certeza que deseja excluir "${product.name}"?`;
        
        const modal = document.getElementById('confirm-modal');
        modal.style.display = 'block';

        document.getElementById('confirm-delete').onclick = () => {
            this.deleteProduct(id);
            modal.style.display = 'none';
        };
    }

    async deleteProduct(id) {
        try {
            await fastFetch(`/api/admin/products/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            // 🔥 INVALIDAR CACHE
            productsCache = null;
            
            await this.loadProducts();
            await this.loadStats();
            this.showNotification('🗑️ Produto excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir:', error);
            this.showError('Erro ao excluir produto');
        }
    }

    searchProducts(query) {
        if (!query.trim()) {
            this.renderProducts();
            return;
        }

        const filtered = this.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            (product.category_name && product.category_name.toLowerCase().includes(query.toLowerCase()))
        );
        
        const tbody = document.getElementById('admin-products-list');
        if (!tbody) return;
        
        tbody.innerHTML = filtered.length ? filtered.map(product => `
            <tr>
                <td>
                    <img src="${product.image}" alt="${product.name}" class="product-image-admin"
                         onerror="this.src='https://via.placeholder.com/60x60?text=Imagem'">
                </td>
                <td>${this.escapeHtml(product.name)}</td>
                <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                <td>${this.escapeHtml(product.category_name || product.category || 'Geral')}</td>
                <td>${product.stock || 0}</td>
                <td>
                    <span class="status-badge ${product.status === 'active' ? 'active' : 'inactive'}">
                        ${product.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="productManager.editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-delete" onclick="productManager.confirmDelete(${product.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </td>
            </tr>
        `).join('') : `
            <tr>
                <td colspan="7" class="text-center">
                    <i class="fas fa-search"></i>
                    Nenhum produto encontrado
                </td>
            </tr>
        `;
    }

    updateStats(stats) {
        document.getElementById('total-products').textContent = stats.totalProducts;
        document.getElementById('total-value').textContent = `R$ ${stats.totalValue.toFixed(2)}`;
        document.getElementById('total-categories').textContent = stats.totalCategories;
    }

    showNotification(message) {
        this.showMessage(message, '#28a745');
    }

    showError(message) {
        this.showMessage(message, '#dc3545');
    }

    showMessage(message, color) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }
}

// Inicializar
const productManager = new ProductManager();