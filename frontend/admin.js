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

// Variável global para armazenar a imagem atual
let currentImageFile = null;

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
        this.initializeImageUpload();
    }

    async loadProducts() {
        try {
            // Carrega produtos do localStorage (usado pela loja principal)
            const storedProducts = localStorage.getItem('products');
            if (storedProducts) {
                this.products = JSON.parse(storedProducts);
            } else {
                // Produtos padrão se não existir
                this.products = [
                    {
                        id: 1,
                        name: "Base Líquida Professional",
                        price: 89.90,
                        category: "Maquiagem",
                        category_id: 1,
                        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500",
                        stock: 15,
                        status: "active",
                        description: "Base líquida de alta cobertura",
                        rating: 4.5,
                        reviewCount: 120
                    },
                    {
                        id: 2,
                        name: "Hidratante Facial com Vitamina C",
                        price: 129.90,
                        category: "Skincare",
                        category_id: 2,
                        image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500",
                        stock: 8,
                        status: "active",
                        description: "Hidratante facial revitalizante",
                        rating: 4.8,
                        reviewCount: 89
                    }
                ];
                this.saveProductsToStorage();
            }
            
            this.renderProducts();
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            this.products = [];
            this.renderProducts();
        }
    }

    async loadStats() {
        try {
            const totalProducts = this.products.length;
            const totalValue = this.products.reduce((sum, product) => sum + (product.price * (product.stock || 0)), 0);
            const totalCategories = this.categories.length;

            this.updateStats({
                totalProducts,
                totalValue,
                totalCategories
            });
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    renderProducts() {
        const tbody = document.getElementById('admin-products-list');
        if (!tbody) return;
        
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
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${product.image}" alt="${product.name}" class="product-image-admin" 
                         onerror="this.src='https://via.placeholder.com/60x60?text=Imagem'">
                </td>
                <td>${product.name}</td>
                <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.category || 'Sem categoria'}</td>
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
            `;
            tbody.appendChild(row);
        });
    }

    // 🔥 SISTEMA DE UPLOAD DE IMAGENS PARA IPHONE
    initializeImageUpload() {
        const fileInput = document.getElementById('product-image');
        const uploadContainer = document.getElementById('upload-container');
        
        if (!fileInput || !uploadContainer) {
            console.log('Elementos de upload não encontrados');
            return;
        }
        
        // Clique na área de upload
        uploadContainer.addEventListener('click', function(e) {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });
        
        // Drag and drop
        uploadContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadContainer.style.background = '#e8eaff';
            uploadContainer.style.borderColor = '#8a2be2';
        });
        
        uploadContainer.addEventListener('dragleave', function() {
            uploadContainer.style.background = '#f8f9ff';
            uploadContainer.style.borderColor = '#8a2be2';
        });
        
        uploadContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadContainer.style.background = '#f8f9ff';
            uploadContainer.style.borderColor = '#8a2be2';
            
            if (e.dataTransfer.files.length) {
                this.handleImageUpload(e.dataTransfer.files[0]);
            }
        }.bind(this));
        
        // Mudança no input de arquivo
        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length) {
                this.handleImageUpload(e.target.files[0]);
            }
        }.bind(this));
    }

    handleImageUpload(file) {
        const fileInfo = document.getElementById('file-info');
        const imagePreview = document.getElementById('image-preview');
        
        // Verificar se é imagem
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione uma imagem válida.');
            return;
        }
        
        // Verificar tamanho (aumente o limite para 20MB)
        if (file.size > 20 * 1024 * 1024) {
            alert('Imagem muito grande. Máximo: 20MB');
            return;
        }
        
        // Atualizar informações do arquivo
        if (fileInfo) {
            fileInfo.textContent = `${file.name} (${this.formatFileSize(file.size)})`;
        }
        
        // Armazenar arquivo
        currentImageFile = file;
        
        // Criar preview
        const reader = new FileReader();
        reader.onload = function(e) {
            // Limpar preview anterior
            if (imagePreview) {
                imagePreview.innerHTML = '';
                
                // Criar nova imagem
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Preview do produto';
                
                // Manter a qualidade original - sem compressão
                img.style.maxWidth = '100%';
                img.style.maxHeight = '300px';
                img.style.objectFit = 'contain';
                img.style.borderRadius = '8px';
                
                imagePreview.appendChild(img);
                
                // Mostrar informações da imagem
                const info = document.createElement('div');
                info.style.marginTop = '0.5rem';
                info.style.color = '#666';
                info.style.fontSize = '0.8rem';
                info.innerHTML = `<i class="fas fa-info-circle"></i> Imagem carregada em alta qualidade`;
                imagePreview.appendChild(info);
            }
        };
        
        reader.readAsDataURL(file);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

        // Botão Cancelar
        document.querySelector('.btn-cancel').addEventListener('click', () => {
            this.closeProductModal();
        });

        // Busca
        const searchInput = document.getElementById('admin-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchProducts(e.target.value);
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
        if (modal) {
            modal.style.display = 'none';
        }
        this.clearProductForm();
    }

    fillProductForm(product) {
        this.currentProductId = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-stock').value = product.stock || 0;
        document.getElementById('product-status').value = product.status;
        document.getElementById('product-description').value = product.description || '';
        
        // Preview da imagem existente
        const preview = document.getElementById('image-preview');
        if (preview && product.image) {
            preview.innerHTML = `<img src="${product.image}" alt="Preview" style="max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 8px;">`;
        }

        // Limpar arquivo atual
        currentImageFile = null;
        const fileInfo = document.getElementById('file-info');
        if (fileInfo) {
            fileInfo.textContent = 'Imagem do produto atual';
        }
    }

    clearProductForm() {
        this.currentProductId = null;
        const form = document.getElementById('product-form');
        if (form) {
            form.reset();
        }
        
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview) {
            imagePreview.innerHTML = '<i class="fas fa-image"></i><span>Prévia aparecerá aqui</span>';
        }
        
        const fileInfo = document.getElementById('file-info');
        if (fileInfo) {
            fileInfo.textContent = 'Nenhum arquivo escolhido';
        }
        
        currentImageFile = null;
    }

    async saveProduct() {
        const formData = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value,
            stock: parseInt(document.getElementById('product-stock').value) || 0,
            status: document.getElementById('product-status').value,
            description: document.getElementById('product-description').value,
            // Campos adicionais para a loja principal
            rating: 4.5,
            reviewCount: Math.floor(Math.random() * 200) + 50
        };

        // Validar dados
        if (!formData.name || !formData.price || !formData.category) {
            alert('Por favor, preencha todos os campos obrigatórios!');
            return;
        }

        try {
            // Processar imagem se existir
            if (currentImageFile) {
                const imageBase64 = await this.processImage(currentImageFile);
                formData.image = imageBase64;
            } else if (this.currentProductId) {
                // Manter imagem existente se estiver editando
                const existingProduct = this.products.find(p => p.id === this.currentProductId);
                formData.image = existingProduct.image;
            } else {
                formData.image = 'https://via.placeholder.com/300x300?text=Produto+Sem+Imagem';
            }

            await this.finalizeSave(formData);
            
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            alert('Erro ao salvar produto. Tente novamente.');
        }
    }

    processImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async finalizeSave(formData) {
        try {
            if (this.currentProductId) {
                // Editar produto existente
                const index = this.products.findIndex(p => p.id === this.currentProductId);
                if (index !== -1) {
                    this.products[index] = {
                        ...this.products[index],
                        ...formData,
                        id: this.currentProductId
                    };
                }
            } else {
                // Adicionar novo produto
                const newProduct = {
                    ...formData,
                    id: Date.now(),
                    createdAt: new Date().toISOString()
                };
                this.products.push(newProduct);
            }

            // 🔥 SALVAR NO LOCALSTORAGE QUE A LOJA PRINCIPAL USA
            this.saveProductsToStorage();
            
            // Recarregar dados
            await this.loadProducts();
            await this.loadStats();
            
            this.closeProductModal();
            this.showNotification('Produto salvo com sucesso!');
            
        } catch (error) {
            console.error('Erro ao salvar produto:', error);
            alert('Erro ao salvar produto');
        }
    }

    // 🔥 FUNÇÃO CRÍTICA: Salvar produtos no localStorage que a loja principal usa
    saveProductsToStorage() {
        // Salva no localStorage com a chave que a loja principal espera
        localStorage.setItem('products', JSON.stringify(this.products));
        console.log('✅ Produtos salvos no localStorage para a loja principal:', this.products.length);
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
            this.products = this.products.filter(p => p.id !== id);
            this.saveProductsToStorage(); // 🔥 Atualizar localStorage
            
            await this.loadProducts();
            await this.loadStats();
            this.showNotification('Produto excluído com sucesso!');
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao excluir produto');
        }
    }

    searchProducts(query) {
        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            (product.category && product.category.toLowerCase().includes(query.toLowerCase()))
        );
        
        const tbody = document.getElementById('admin-products-list');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: #666;">
                        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        Nenhum produto encontrado
                    </td>
                </tr>
            `;
            return;
        }

        filteredProducts.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${product.image}" alt="${product.name}" class="product-image-admin"
                         onerror="this.src='https://via.placeholder.com/60x60?text=Imagem'">
                </td>
                <td>${product.name}</td>
                <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
                <td>${product.category || 'Sem categoria'}</td>
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
            `;
            tbody.appendChild(row);
        });
    }

    updateStats(stats) {
        const totalProductsEl = document.getElementById('total-products');
        const totalValueEl = document.getElementById('total-value');
        const totalCategoriesEl = document.getElementById('total-categories');
        
        if (totalProductsEl) totalProductsEl.textContent = stats.totalProducts;
        if (totalValueEl) totalValueEl.textContent = `R$ ${stats.totalValue.toFixed(2)}`;
        if (totalCategoriesEl) totalCategoriesEl.textContent = stats.totalCategories;
    }

    showNotification(message) {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #8a2be2;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animação de entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar o gerenciador de produtos
const productManager = new ProductManager();