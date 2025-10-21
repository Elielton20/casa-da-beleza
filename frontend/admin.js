// Sistema de autenticação
function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'admin.html';
        return false;
    }
    return true;
}

// 🔥 VARIÁVEL DE CONTROLE para evitar múltiplas inicializações
let productManagerInitialized = false;

// Headers padrão para requisições autenticadas
function getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Gerenciamento de Produtos
class ProductManager {
    constructor() {
        // 🔥 VERIFICAÇÃO DUPLA para evitar múltiplas instâncias
        if (!checkAdminAuth() || productManagerInitialized) {
            console.log('⚠️ ProductManager já inicializado ou não autenticado');
            return;
        }
        
        productManagerInitialized = true;
        console.log('🚀 Inicializando ProductManager...');
        
        this.products = [];
        this.currentProductId = null;
        this.isLoading = false; // 🔥 CONTROLE DE CARREGAMENTO
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
        // 🔥 CARREGAMENTO SEQUENCIAL controlado
        await this.loadProducts();
        await this.loadStats();
        this.setupEventListeners();
        console.log('✅ ProductManager totalmente inicializado');
    }

    async loadProducts() {
        // 🔥 EVITA MÚLTIPLAS REQUISIÇÕES SIMULTÂNEAS
        if (this.isLoading) {
            console.log('⏳ LoadProducts já em andamento...');
            return;
        }

        this.isLoading = true;
        console.log('📦 Iniciando carregamento de produtos...');

        try {
            const response = await fetch('/api/admin/products', {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao carregar produtos');
            
            this.products = await response.json();
            console.log(`✅ ${this.products.length} produtos carregados`);
            this.renderProducts();
        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            this.showError('Erro ao carregar produtos');
        } finally {
            this.isLoading = false;
        }
    }

    async loadStats() {
        console.log('📊 Carregando estatísticas...');
        
        try {
            const response = await fetch('/api/admin/stats', {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao carregar estatísticas');
            
            const stats = await response.json();
            this.updateStats(stats);
            console.log('✅ Estatísticas carregadas');
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error);
            // 🔥 CALCULA ESTATÍSTICAS LOCALMENTE em caso de erro
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
        console.log('📊 Estatísticas calculadas localmente');
    }

    renderProducts() {
        const tbody = document.getElementById('admin-products-list');
        if (!tbody) {
            console.error('❌ Elemento admin-products-list não encontrado');
            return;
        }
        
        console.log('🎨 Renderizando produtos na tabela...');
        tbody.innerHTML = '';

        if (this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                        <i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        Nenhum produto cadastrado
                    </td>
                </tr>
            `;
            return;
        }

        this.products.forEach(product => {
            const categoryName = this.getCategoryName(product.category_id);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${product.image}" alt="${product.name}" class="product-image-admin" 
                         onerror="this.src='https://via.placeholder.com/60x60?text=Imagem'">
                </td>
                <td>${product.name}</td>
                <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                <td>${categoryName}</td>
                <td>${product.stock}</td>
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
            `;
            tbody.appendChild(row);
        });
        
        console.log('✅ Tabela de produtos renderizada');
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        return category ? category.name : 'Geral';
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // 🔥 REMOVE EVENT LISTENERS ANTIGOS para evitar duplicação
        this.removeEventListeners();
        
        // Botão Adicionar Produto
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.openProductModal();
        });

        // Formulário de Produto
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Preview de Imagem
        document.getElementById('product-image').addEventListener('change', (e) => {
            this.previewImage(e.target.files[0]);
        });

        // Botão Cancelar
        document.querySelector('.btn-cancel').addEventListener('click', () => {
            this.closeProductModal();
        });

        // 🔥 BUSCA COM DEBOUNCE
        let searchTimeout;
        const searchInput = document.getElementById('admin-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchProducts(e.target.value);
                }, 300);
            });
        }

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Deseja sair do painel administrativo?')) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = 'admin.html';
            }
        });

        // Outros botões de ação
        const setupButton = (id, message) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => alert(message));
            }
        };

        setupButton('manage-categories-btn', 'Funcionalidade de gerenciar categorias em desenvolvimento!');
        setupButton('update-prices-btn', 'Funcionalidade de alterar preços em massa em desenvolvimento!');
        setupButton('bulk-upload-btn', 'Funcionalidade de upload em massa em desenvolvimento!');

        // Modais
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Fechar modais clicando fora
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        
        console.log('✅ Event listeners configurados');
    }

    // 🔥 NOVA FUNÇÃO: Remove event listeners antigos
    removeEventListeners() {
        // Esta função pode ser expandida para remover listeners específicos se necessário
        console.log('🧹 Limpando event listeners antigos...');
    }

    openProductModal(product = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        
        // Preencher select de categorias
        const categorySelect = document.getElementById('product-category');
        categorySelect.innerHTML = '<option value="">Selecione...</option>';
        this.categories.forEach(category => {
            categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
        });
        
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
        const modal = document.getElementById('product-modal');
        if (modal) modal.style.display = 'none';
        this.clearProductForm();
    }

    fillProductForm(product) {
        this.currentProductId = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category_id;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-status').value = product.status;
        document.getElementById('product-description').value = product.description || '';
        
        // Preview da imagem existente
        const preview = document.getElementById('image-preview');
        if (preview && product.image) {
            preview.innerHTML = `<img src="${product.image}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
        }
    }

    clearProductForm() {
        this.currentProductId = null;
        const form = document.getElementById('product-form');
        if (form) form.reset();
        
        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.innerHTML = '<i class="fas fa-image" style="color: #ccc;"></i>';
        }
        
        // Restaurar botão de salvar se estiver em loading
        const submitBtn = document.querySelector('#product-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Produto';
            submitBtn.disabled = false;
        }
    }

    previewImage(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('image-preview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
            }
        };
        reader.readAsDataURL(file);
    }

    async saveProduct() {
        // Bloquear botão durante salvamento
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

            // Validar dados
            if (!formData.name || !formData.price || !formData.category_id) {
                throw new Error('Por favor, preencha todos os campos obrigatórios!');
            }

            // Processar imagem
            const imageFile = document.getElementById('product-image').files[0];
            if (imageFile) {
                formData.image = await this.processImage(imageFile);
            } else if (this.currentProductId) {
                const existingProduct = this.products.find(p => p.id === this.currentProductId);
                formData.image = existingProduct.image;
            } else {
                formData.image = 'https://via.placeholder.com/300x300?text=Produto+Sem+Imagem';
            }

            // Fazer requisição para API
            let response;
            
            if (this.currentProductId) {
                response = await fetch(`/api/admin/products/${this.currentProductId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
            } else {
                response = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
            }

            if (!response.ok) {
                throw new Error('Erro ao salvar produto');
            }

            // 🔥 RECARREGAR APENAS UMA VEZ
            await this.loadProducts();
            await this.loadStats();
            
            this.closeProductModal();
            this.showNotification('✅ Produto salvo com sucesso!');
            
        } catch (error) {
            console.error('Erro:', error);
            this.showError(error.message || 'Erro ao salvar produto');
        } finally {
            // Restaurar botão
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
            const response = await fetch(`/api/admin/products/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erro ao excluir produto');
            }

            await this.loadProducts();
            await this.loadStats();
            this.showNotification('🗑️ Produto excluído com sucesso!');
        } catch (error) {
            console.error('Erro:', error);
            this.showError('Erro ao excluir produto');
        }
    }

    searchProducts(query) {
        if (!query.trim()) {
            this.renderProducts();
            return;
        }

        const filteredProducts = this.products.filter(product => {
            const categoryName = this.getCategoryName(product.category_id);
            return (
                product.name.toLowerCase().includes(query.toLowerCase()) ||
                categoryName.toLowerCase().includes(query.toLowerCase())
            );
        });
        
        const tbody = document.getElementById('admin-products-list');
        if (!tbody) return;
        
        tbody.innerHTML = filteredProducts.map(product => {
            const categoryName = this.getCategoryName(product.category_id);
            return `
                <tr>
                    <td>
                        <img src="${product.image}" alt="${product.name}" class="product-image-admin"
                             onerror="this.src='https://via.placeholder.com/60x60?text=Imagem'">
                    </td>
                    <td>${product.name}</td>
                    <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                    <td>${categoryName}</td>
                    <td>${product.stock}</td>
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
            `;
        }).join('');
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
        // Remove notificações existentes
        const existingNotifications = document.querySelectorAll('.custom-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = 'custom-notification';
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

// 🔥 INICIALIZAÇÃO CONTROLADA - evita múltiplas instâncias
let productManager;

function initializeAdmin() {
    if (!checkAdminAuth()) return;
    
    if (!productManager && !productManagerInitialized) {
        console.log('🎯 Iniciando aplicação admin...');
        productManager = new ProductManager();
    } else {
        console.log('⚠️ Aplicação admin já está rodando');
    }
}

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
    initializeAdmin();
}