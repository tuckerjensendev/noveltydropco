const db = require('../db'); // Use centralized db connection
const bcrypt = require('bcrypt');

// Initialize users table
function initializeUserTable() {
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
  `, (err) => {
    if (err) console.error("Error creating users table:", err.message);
    else console.log("Users table initialized.");
  });
}

// Ensure superadmin exists
function createSuperadminIfNotExists() {
  db.get('SELECT * FROM users WHERE superadmin = 1', async (err, row) => {
    if (err) {
      console.error("Error checking for superadmin:", err.message);
      return;
    }

    if (!row) {
      console.log("No superadmin found. Creating default superadmin...");
      const hashedPassword = await bcrypt.hash('superpassword', 10);
      db.run(
        `INSERT INTO users (first_name, last_name, personal_email, work_email, personal_phone, role, password, superadmin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Super', 'Admin', 'superadmin@noveltydropco.com', 'admin@noveltydropco.com', '123-456-7890', 'superadmin', hashedPassword, 1],
        (err) => {
          if (err) console.error("Error creating superadmin:", err.message);
          else console.log("Superadmin created successfully.");
        }
      );
    } else {
      console.log("Superadmin already exists.");
    }
  });
}

// Initialize on load
initializeUserTable();
createSuperadminIfNotExists();

// Export both db and user-related utilities
module.exports = db;
