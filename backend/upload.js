// routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configuração do multer para salvar imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/images/products';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `product-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas!'), false);
    }
  }
});

// POST /api/upload
router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    // Retorna a URL da imagem
    const imageUrl = `${req.protocol}://${req.get('host')}/images/products/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      message: 'Imagem uploadada com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro no upload da imagem' });
  }
});

module.exports = router;