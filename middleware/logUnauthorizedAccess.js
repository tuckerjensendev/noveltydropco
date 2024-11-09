// middleware/logUnauthorizedAccess.js
const fs = require('fs');
const path = require('path');

// Path to the unauthorized access log file
const logFilePath = path.join(__dirname, '../logs', 'unauthorized_access.log');

// Function to log unauthorized access attempts
function logUnauthorizedAccess(message) {
  const logEntry = `[${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}] ${message}\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write unauthorized access log:', err);
    }
  });
}

module.exports = logUnauthorizedAccess;
