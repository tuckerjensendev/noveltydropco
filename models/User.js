const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./noveltydrops.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      personal_email TEXT UNIQUE,
      work_email TEXT UNIQUE,
      personal_phone TEXT,
      role TEXT NOT NULL DEFAULT 'client',
      password TEXT NOT NULL,
      superadmin BOOLEAN DEFAULT 0
    )
  `);

  db.get('SELECT * FROM users WHERE superadmin = 1', async (err, row) => {
    if (!row) {
      const hashedPassword = await bcrypt.hash('superpassword', 10);
      db.run(
        `INSERT INTO users (first_name, last_name, personal_email, work_email, personal_phone, role, password, superadmin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Super', 'Admin', 'superadmin@noveltydrops.com', 'admin@noveltydrops.com', '123-456-7890', 'superadmin', hashedPassword, 1],
        (err) => {
          if (err) console.error("Error creating superadmin:", err.message);
        }
      );
    }
  });
});

module.exports = db;
