// test-db.js
require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

connection.connect((error) => {
    if (error) {
        console.error('❌ ERRO DE CONEXÃO:', error.message);
    } else {
        console.log('✅ CONEXÃO BEM-SUCEDIDA!');
        console.log('📍 Host:', process.env.DB_HOST);
        console.log('🗄️  Banco:', process.env.DB_NAME);
    }
    connection.end();
});