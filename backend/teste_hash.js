const bcrypt = require('bcryptjs');

(async () => {
  const hash = '$2b$10$7EqJtq98hPqEX7fNZaFWoOa6u5jY1jF9Y0q1YwqfY6a5Q9d/1G7K6';
  const senha = 'admin123';

  const ok = await bcrypt.compare(senha, hash);
  console.log(ok);
})();