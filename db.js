const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./noveltydropco.db'); // Centralized connection to the database

module.exports = db; // Export the single connection instance
