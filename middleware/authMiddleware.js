const db = require('../models/User');
const logUnauthorizedAccess = require('./logUnauthorizedAccess');

// Middleware to ensure the user has the necessary permissions + tracking of unauthorized access
function ensurePermission(permissionName) {
  return (req, res, next) => {
    const userRole = req.isAuthenticated() 
      ? `role: ${req.user.role}, ID: ${req.user.id || "unknown ID"}`
      : "unauthenticated user";

    if (!req.user?.permissions || !req.user.permissions.includes(permissionName)) {
      logUnauthorizedAccess(`Unauthorized access attempt to ${req.originalUrl} by ${userRole} from IP: ${req.ip}`);
      return res.redirect('/');
    }

    next();
  };
}

// Middleware to restrict access based on specific role paths
function enforceRoleAccess(req, res, next) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const requestedPath = req.originalUrl;

  const userRole = req.isAuthenticated() 
    ? `role: ${req.user.role}, ID: ${req.user.id || "unknown ID"}`
    : "unauthenticated user";

  // Superadmin bypass
  if (req.user && req.user.role === 'superadmin') {
    console.log(`Superadmin bypasses all permission checks for ${requestedPath}`);
    return next();
  }

  // Handle unauthenticated user case
  if (!req.isAuthenticated()) {
    logUnauthorizedAccess(`Unauthorized access attempt to ${requestedPath} by unauthenticated user from IP: ${ipAddress}`);
    return res.redirect('/');
  }

  // Role-based restrictions for specific paths
  if (requestedPath === '/admin/superadmin-dashboard' && req.user.role !== 'superadmin') {
    logUnauthorizedAccess(`Unauthorized access attempt to ${requestedPath} by ${userRole} from IP: ${ipAddress}`);
    return res.redirect('/');
  }

  if (requestedPath === '/admin/staff-dashboard' && req.user.role === 'client') {
    logUnauthorizedAccess(`Unauthorized access attempt to ${requestedPath} by ${userRole} from IP: ${ipAddress}`);
    return res.redirect('/');
  }

  next();
}

// Middleware to attach permissions to the user object
async function attachPermissions(req, res, next) {
  if (req.isAuthenticated() && req.user) {
    try {
      const userRole = req.user.role;
      if (userRole === 'superadmin') {
        const allPermissions = await new Promise((resolve, reject) => {
          db.all(`SELECT permission_name FROM permissions`, (err, rows) => {
            if (err) return reject(err);
            resolve(rows.map(permission => permission.permission_name));
          });
        });
        req.user.permissions = allPermissions;
      } else {
        const permissions = await new Promise((resolve, reject) => {
          db.all(
            `SELECT permissions.permission_name 
             FROM permissions
             INNER JOIN role_permissions ON permissions.id = role_permissions.permission_id
             INNER JOIN roles ON role_permissions.role_id = roles.id
             WHERE roles.role_name = ?`, 
            [userRole],
            (err, rows) => {
              if (err) return reject(err);
              resolve(rows.map(permission => permission.permission_name));
            }
          );
        });
        req.user.permissions = permissions;
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      req.user.permissions = [];
    }
  }

  res.locals.user = req.user;  // Make user globally accessible in views
  next();
}

module.exports = {
  enforceRoleAccess,
  ensurePermission,
  attachPermissions
};
