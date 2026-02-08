import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://djpfhgbxspibucvacxpt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqcGZoZ2J4c3BpYnVjdmFjeHB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDg3NzMwNCwiZXhwIjoyMDc2NDUzMzA0fQ.dziOb3cIrlGiiM0PuJABuFioOf9BgnMcABQpM27N3qc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Pasta temporária
const TEMP_DIR = './temp-images';
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

function base64ToBuffer(base64) {
  const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) return null;

  return {
    mime: matches[1],
    buffer: Buffer.from(matches[2], 'base64')
  };
}

async function migrateImages() {
  console.log('🔍 Buscando produtos com base64...');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, image')
    .like('image', 'data:image%');

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return;
  }

  console.log(`📦 ${products.length} imagens encontradas`);

  for (const product of products) {
    try {
      const parsed = base64ToBuffer(product.image);
      if (!parsed) continue;

      const ext = parsed.mime.split('/')[1];
      const fileName = `product-${product.id}.${ext}`;
      const filePath = path.join(TEMP_DIR, fileName);

      fs.writeFileSync(filePath, parsed.buffer);

      console.log(`⬆️ Upload produto ${product.id}`);

      const { error: uploadError } = await supabase
        .storage
        .from('products')
        .upload(fileName, fs.readFileSync(filePath), {
          contentType: parsed.mime,
          upsert: true
        });

      if (uploadError) {
        console.error('Erro upload:', uploadError);
        continue;
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/products/${fileName}`;

      await supabase
        .from('products')
        .update({ image: publicUrl })
        .eq('id', product.id);

      fs.unlinkSync(filePath);

      console.log(`✅ Produto ${product.id} migrado`);
    } catch (err) {
      console.error(`❌ Erro no produto ${product.id}`, err);
    }
  }

  console.log('🎉 MIGRAÇÃO FINALIZADA');
}

migrateImages();
