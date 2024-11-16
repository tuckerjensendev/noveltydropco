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

module.exports = db;
