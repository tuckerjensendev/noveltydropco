const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./noveltydropco.db');

// Fetch content blocks for a specific page (deprecated in favor of getContentBlocksByStatus)
db.getContentBlocksFromDatabase = function (pageId) {
  return new Promise((resolve, reject) => {
    console.log(`[DB INFO] Fetching content blocks for page ID: ${pageId}`);
    db.all(
      'SELECT * FROM content_blocks WHERE page_id = ? ORDER BY row ASC',
      [pageId],
      (err, rows) => {
        if (err) {
          console.error(`[DB ERROR] Failed to fetch content blocks: ${err.message}`);
          reject(err);
        } else {
          console.log(`[DB INFO] Fetched content blocks: ${JSON.stringify(rows, null, 2)}`);
          resolve(rows);
        }
      }
    );
  });
};

// New function to fetch content blocks by page ID and status
db.getContentBlocksByStatus = function (pageId, status) {
  return new Promise((resolve, reject) => {
    console.log(`[DB INFO] Fetching ${status} content blocks for page ID: ${pageId}`);
    db.all(
      'SELECT * FROM content_blocks WHERE page_id = ? AND status = ? ORDER BY row ASC',
      [pageId, status],
      (err, rows) => {
        if (err) {
          console.error(`[DB ERROR] Failed to fetch ${status} content blocks: ${err.message}`);
          reject(err);
        } else {
          console.log(`[DB INFO] Fetched ${status} content blocks: ${JSON.stringify(rows, null, 2)}`);
          resolve(rows);
        }
      }
    );
  });
};

// Helper function to use Promises with db.run
db.runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        console.error(`[DB ERROR] Query Failed: ${query}`);
        console.error(`[DB ERROR] Params: ${JSON.stringify(params)}`);
        console.error(`[DB ERROR] Error Message: ${err.message}`);
        reject(err);
      } else {
        console.log(`[DB INFO] Query Succeeded: ${query}`);
        console.log(`[DB INFO] Params: ${JSON.stringify(params)}`);
        console.log(`[DB INFO] Changes: ${this.changes}, LastID: ${this.lastID}`);
        resolve({ changes: this.changes, lastID: this.lastID });
      }
    });
  });
};

module.exports = db;
