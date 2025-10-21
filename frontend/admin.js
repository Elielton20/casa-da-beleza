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
        await this.loadProducts();
        await this.loadStats();
        this.setupEventListeners();
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/admin/products', {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao carregar produtos');
            
            this.products = await response.json();
            this.renderProducts();
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao carregar produtos');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) throw new Error('Erro ao carregar estatísticas');
            
            const stats = await response.json();
            this.updateStats(stats);
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    renderProducts() {
        const tbody = document.getElementById('admin-products-list');
        tbody.innerHTML = '';

        this.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${product.image}" alt="${product.name}" class="product-image-admin" 
                         onerror="this.src='https://via.placeholder.com/60x60?text=Imagem'">
                </td>
                <td>${product.name}</td>
                <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.category_name}</td>
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

        // Preview de Imagem
        document.getElementById('product-image').addEventListener('change', (e) => {
            this.previewImage(e.target.files[0]);
        });

        // Botão Cancelar
        document.querySelector('.btn-cancel').addEventListener('click', () => {
            this.closeProductModal();
        });

        // Busca
        document.getElementById('admin-search').addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });

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
        document.getElementById('manage-categories-btn').addEventListener('click', () => {
            alert('Funcionalidade de gerenciar categorias em desenvolvimento!');
        });

        document.getElementById('update-prices-btn').addEventListener('click', () => {
            alert('Funcionalidade de alterar preços em massa em desenvolvimento!');
        });

        document.getElementById('bulk-upload-btn').addEventListener('click', () => {
            alert('Funcionalidade de upload em massa em desenvolvimento!');
        });

        // Modais
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                modal.style.display = 'none';
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
        document.getElementById('product-modal').style.display = 'none';
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
        preview.innerHTML = `<img src="${product.image}" alt="Preview">`;
    }

    clearProductForm() {
        this.currentProductId = null;
        document.getElementById('product-form').reset();
        document.getElementById('image-preview').innerHTML = '<i class="fas fa-image" style="color: #ccc;"></i>';
    }

    previewImage(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('image-preview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    }

    async saveProduct() {
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
            alert('Por favor, preencha todos os campos obrigatórios!');
            return;
        }

        // Simular upload de imagem (em produção, você enviaria para o servidor)
        const imageFile = document.getElementById('product-image').files[0];
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                formData.image = e.target.result;
                this.finalizeSave(formData);
            };
            reader.readAsDataURL(imageFile);
        } else {
            // Manter imagem existente se estiver editando
            if (this.currentProductId) {
                const existingProduct = this.products.find(p => p.id === this.currentProductId);
                formData.image = existingProduct.image;
            } else {
                formData.image = 'https://via.placeholder.com/300x300?text=Produto+Sem+Imagem';
            }
            this.finalizeSave(formData);
        }
    }

    async finalizeSave(formData) {
        try {
            let response;
            
            if (this.currentProductId) {
                // Editar produto existente
                response = await fetch(`/api/admin/products/${this.currentProductId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
            } else {
                // Adicionar novo produto
                response = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(formData)
                });
            }

            if (!response.ok) {
                throw new Error('Erro ao salvar produto');
            }

            await this.loadProducts();
            await this.loadStats();
            this.closeProductModal();
            
            alert('Produto salvo com sucesso!');
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao salvar produto');
        }
    }

    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            this.openProductModal(product);
        }
    }

    confirmDelete(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            document.getElementById('confirm-message').textContent = 
                `Tem certeza que deseja excluir o produto "${product.name}"?`;
            
            const modal = document.getElementById('confirm-modal');
            modal.style.display = 'block';

            document.getElementById('confirm-delete').onclick = () => {
                this.deleteProduct(id);
                modal.style.display = 'none';
            };

            // Botão cancelar no modal de confirmação
            modal.querySelector('.btn-cancel').onclick = () => {
                modal.style.display = 'none';
            };
        }
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
            alert('Produto excluído com sucesso!');
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao excluir produto');
        }
    }

    searchProducts(query) {
        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.category_name.toLowerCase().includes(query.toLowerCase())
        );
        
        const tbody = document.getElementById('admin-products-list');
        tbody.innerHTML = '';

        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${product.image}" alt="${product.name}" class="product-image-admin"
                         onerror="this.src='https://via.placeholder.com/60x60?text=Imagem'">
                </td>
                <td>${product.name}</td>
                <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.category_name}</td>
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
    }

    updateStats(stats) {
        document.getElementById('total-products').textContent = stats.totalProducts;
        document.getElementById('total-value').textContent = `R$ ${stats.totalValue.toFixed(2)}`;
        document.getElementById('total-categories').textContent = stats.totalCategories;
    }
}''

// Inicializar o gerenciador de produtos
const productManager = new ProductManager();