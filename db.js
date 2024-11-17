const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./noveltydropco.db');

// Fetch content blocks for a specific page
db.getContentBlocksFromDatabase = function (pageId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM content_blocks WHERE page_id = ?', [pageId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper function to use Promises with db.run
db.runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        console.error('Database error:', err.message);
        reject(err);
      } else {
        console.log('Database update success for ID:', params[params.length - 1]);
        resolve(this); // 'this' contains metadata (like `lastID`)
      }
    });
  });
};

module.exports = db;
