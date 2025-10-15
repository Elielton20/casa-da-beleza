const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'hoot123', // coloque a senha do seu MySQL aqui
    database: 'casa_da_beleza',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testar conexão
db.getConnection()
    .then(connection => {
        console.log('✅ Conectado ao MySQL com sucesso!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Erro ao conectar ao MySQL:', err);
    });

module.exports = db;
