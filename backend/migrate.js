// ✅ certo
const { Pool } = require('pg');

const fs = require('fs');
const path = require('path');

// CONFIGURAÇÕES DO SEU BANCO - AJUSTE!
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'seu_banco',
  password: 'sua_senha',
  port: 5432,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migração de imagens...');
    
    // Busca produtos com base64
    const result = await client.query(`
      SELECT id, name, image 
      FROM products 
      WHERE image LIKE 'data:image%'
    `);
    
    console.log(`📦 ${result.rows.length} produtos para migrar`);
    
    for (const product of result.rows) {
      try {
        const base64Data = product.image;
        const matches = base64Data.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
        
        if (matches) {
          const imageType = matches[1];
          const imageData = matches[2];
          const buffer = Buffer.from(imageData, 'base64');
          
          // Nome do arquivo
          const filename = `product-${product.id}.${imageType === 'jpeg' ? 'jpg' : imageType}`;
          const filepath = path.join(__dirname, 'public', 'images', 'products', filename);
          
          // Cria diretório
          const dir = path.dirname(filepath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Salva arquivo
          fs.writeFileSync(filepath, buffer);
          
          // Atualiza NOVA coluna (image_url)
          const imageUrl = `/images/products/${filename}`;
          await client.query(
            'UPDATE products SET image_url = $1 WHERE id = $2',
            [imageUrl, product.id]
          );
          
          console.log(`✅ ${product.id}: ${product.name}`);
        }
      } catch (error) {
        console.log(`❌ Erro em ${product.id}: ${error.message}`);
      }
    }
    
    console.log('🎉 Migração concluída!');
    
  } catch (error) {
    console.error('💥 Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();