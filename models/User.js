const db = require('../db'); // Reuse the centralized connection
const bcrypt = require('bcrypt');

// User-specific setup
db.serialize(() => {
  // Create the users table if it doesn't exist
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

  // Check if a superadmin exists; if not, create one
  db.get('SELECT * FROM users WHERE superadmin = 1', async (err, row) => {
    if (!row) {
      const hashedPassword = await bcrypt.hash('superpassword', 10);
      db.run(
        `INSERT INTO users (first_name, last_name, personal_email, work_email, personal_phone, role, password, superadmin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Super', 'Admin', 'superadmin@noveltydropco.com', 'admin@noveltydropco.com', '123-456-7890', 'superadmin', hashedPassword, 1],
        (err) => {
          if (err) console.error("Error creating superadmin:", err.message);
        }
      );
    }
  });
});

module.exports = db; // Export the db if further user operations are needed
