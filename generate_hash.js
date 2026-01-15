const bcrypt = require('bcryptjs');

// Senha fixa do seu projeto
const senhaFixa = 'casadabelza@eve2y2';

// Gerar hash (síncrono, direto)
const hash = bcrypt.hashSync(senhaFixa, 12); // 12 = custo recomendado

console.log('Senha fixa:', senhaFixa);
console.log('Hash gerado:', hash);

