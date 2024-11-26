// routes/admin.js
const express = require('express');
const router = express.Router();
const userDb = require('../models/User'); // For user-specific operations
const db = require('../db'); // For permissions/content-related queries
const bcrypt = require('bcrypt');
const { enforceRoleAccess, ensurePermission } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const csurf = require('csurf');
const csrfProtection = csurf({ cookie: true });
const fs = require('fs');
const path = require('path');

// Path to the log file
const logFilePath = path.join(__dirname, '../logs/staff_sessiontimeout.log');

// Ensure the logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)){
    fs.mkdirSync(logsDir);
}

// Role levels are ordered from lowest to highest authority.
const roleHierarchy = {
  'staff1': 1,
  'staff2': 2,
  'manager1': 3,
  'manager2': 4,
  'superadmin': 5
};

// Helper function to get the hierarchy level of a role
function getRoleLevel(role) {
  return roleHierarchy[role] || 0; // Return 0 if role is not found (fallback for undefined roles)
}

// Helper function for loading permissions (used in manage-access route)
async function loadPermissions(req, res) {
  try {
    const permissions = await new Promise((resolve, reject) => {
      db.all(`
        SELECT p.id, p.permission_name AS name,
               GROUP_CONCAT(r.role_name) AS roles
        FROM permissions AS p
        LEFT JOIN role_permissions AS rp ON p.id = rp.permission_id
        LEFT JOIN roles AS r ON rp.role_id = r.id
        GROUP BY p.id
      `, (err, rows) => {
        if (err) return reject(err);
        rows.forEach(row => {
          row.roles = row.roles ? row.roles.split(',') : [];
        });

        // Friendly name mappings
        const permissionFriendlyNames = {
          'can_edit_content': 'Edit Content',
          'can_view_reports': 'View Reports',
          'can_access_financials': 'Access Financials',
          'can_create_user': 'Create User',
          'can_manage_access_page': 'Manage Access Page',
          'can_edit_hero_section': 'Edit Hero Section',
          'can_edit_product_grids': 'Edit Product Grids',
          'can_edit_custom_banners': 'Edit Custom Banners',
          'can_edit_footer': 'Edit Footer'
        };

        // Apply friendly names
        rows.forEach(row => {
          row.name = permissionFriendlyNames[row.name] || row.name;
        });

        // Sort permissions in the desired order
        const orderedPermissions = [
          'Edit Hero Section',
          'Edit Product Grids',
          'Edit Custom Banners',
          'Edit Footer',
          'Edit Content',
          'View Reports',
          'Access Financials',
          'Create User',
          'Manage Access Page'
        ];

        rows.sort((a, b) => {
          const indexA = orderedPermissions.indexOf(a.name);
          const indexB = orderedPermissions.indexOf(b.name);
          return indexA - indexB;
        });

        resolve(rows);
      });
    });

    res.render('admin/manage-access', { user: req.user, csrfToken: req.csrfToken(), permissions });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Server error while fetching permissions." });
  }
}

// Middleware for session timeout tracking
// Note: Since the front-end handles inactivity, we don't need server-side inactivity tracking here.
// Instead, we'll provide an endpoint to log session timeouts sent from the client.

// **Single POST route for logging session timeout**
router.post('/log-session-timeout', (req, res) => {
  const now = new Date();
  const formattedDate = now.toLocaleString('en-US', { hour12: false });
  const isoTimestamp = now.toISOString();
  const { userId, role, ip } = req.body;

  const logMessage = `[${formattedDate}] [${isoTimestamp}] Session timeout for role: ${role || 'unknown'}, ID: ${userId || 'unknown'}, IP: ${ip || 'unknown'}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
      return res.status(500).json({ error: 'Failed to log session timeout.' });
    }

    res.status(200).json({ message: 'Session timeout logged successfully.' });
  });
});

// Superadmin Dashboard Route
router.get('/superadmin-dashboard', enforceRoleAccess, (req, res) => {
  res.render('admin/superadmin-dashboard', { user: req.user });
});

// Staff Dashboard Route
router.get('/staff-dashboard', enforceRoleAccess, (req, res) => {
  res.render('admin/staff-dashboard', { user: req.user });
});

// Staff User Page (requires 'can_create_user' permission)
router.get('/create-staff', ensurePermission('can_create_user'), csrfProtection, (req, res) => {
  console.log("Rendering create-staff with user:", req.user); // Add this debug line
  res.render('admin/create-staff', {
    user: req.user,
    csrfToken: req.csrfToken()
  });
});

// Content Workshop Route (requires 'can_edit_content' permission)
router.get('/content-workshop', ensurePermission('can_edit_content'), csrfProtection, async (req, res) => {
  try {
    const page_id = 'home'; // Adjust if needed for different pages
    const blocks = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM content_blocks WHERE page_id = ?', [page_id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    res.render('admin/content-workshop', {
      user: req.user,
      csrfToken: req.csrfToken(),
      blocks,
      scripts: [
        '/scripts/contentWorkshop.js',
        '/scripts/secondToolbar.js',
        '/scripts/Sortable.min.js'
      ]
    });
  } catch (error) {
    console.error("Error loading content workshop:", error);
    res.status(500).send("Error loading content workshop.");
  }
});

// Manage Access Page (requires 'can_manage_access_page' permission)
router.get('/manage-access', ensurePermission('can_manage_access_page'), csrfProtection, (req, res) => {
  loadPermissions(req, res);
});

// POST route to handle permissions update on /manage-access page
router.post('/manage-access', csrfProtection, async (req, res) => {
  const permissionsData = req.body.permissions || {};
  const userRoleLevel = getRoleLevel(req.user.role); // Get the role level of the current user
  console.log("Permissions data received:", permissionsData);

  try {
    // Step 1: Fetch all existing role-permission mappings
    const existingPermissions = await new Promise((resolve, reject) => {
      db.all(`
        SELECT roles.role_name, permissions.id AS permission_id
        FROM role_permissions
        INNER JOIN roles ON role_permissions.role_id = roles.id
        INNER JOIN permissions ON role_permissions.permission_id = permissions.id
      `, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    // Map current permissions per role for easy lookup
    const currentPermissionsMap = {};
    existingPermissions.forEach(({ role_name, permission_id }) => {
      if (!currentPermissionsMap[role_name]) {
        currentPermissionsMap[role_name] = new Set();
      }
      currentPermissionsMap[role_name].add(permission_id.toString());
    });

    let changesDetected = false;
    const deletionQueue = [];
    const additionQueue = [];

    // ** Step 2: Detect deletions **
    Object.entries(currentPermissionsMap).forEach(([role, permissionIds]) => {
      const roleLevel = getRoleLevel(role);
      if (roleLevel >= userRoleLevel) return; // Skip deletions for roles at or above the user's level

      permissionIds.forEach(permissionId => {
        if (!(role + '_' + permissionId in permissionsData)) {
          deletionQueue.push({ role, permissionId });
          changesDetected = true;
        }
      });
    });

    // ** Step 3: Detect additions **
    Object.entries(permissionsData).forEach(([roleWithId, isChecked]) => {
      if (isChecked === 'on') {
        const [role, permissionId] = roleWithId.split('_');
        const roleLevel = getRoleLevel(role);
        if (roleLevel >= userRoleLevel) return; // Skip additions for roles at or above the user's level

        if (!currentPermissionsMap[role] || !currentPermissionsMap[role].has(permissionId)) {
          additionQueue.push({ role, permissionId });
          changesDetected = true;
        }
      }
    });

    // Execute deletions
    for (const { role, permissionId } of deletionQueue) {
      await new Promise((resolve, reject) => {
        db.run(
          `DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE role_name = ?) AND permission_id = ?`,
          [role, permissionId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      console.log(`Removed permission ${permissionId} from role ${role}`);
    }

    // Execute additions
    for (const { role, permissionId } of additionQueue) {
      const roleId = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM roles WHERE role_name = ?', [role], (err, row) => {
          if (err || !row) return reject(err);
          resolve(row.id);
        });
      });

      if (roleId) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
            [roleId, permissionId],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
        console.log(`Assigned permission ${permissionId} to role ${role}`);
      }
    }

    res.redirect('/admin/manage-access');
  } catch (error) {
    console.error("Error updating role permissions:", error);
    res.status(500).send("Server error while updating permissions.");
  }
});

// POST route to handle staff creation (uses userDb)
router.post('/create-staff', ensurePermission('can_create_user'), csrfProtection, [
  body('first_name').isAlpha().trim().escape().withMessage('First name must contain only letters.'),
  body('last_name').isAlpha().trim().escape().withMessage('Last name must contain only letters.'),
  body('personal_email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Invalid personal email format.'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid work email format.'),
  body('password').isLength({ min: 8 }).matches(/\d/).matches(/[A-Z]/).withMessage('Password must be at least 8 characters, including one uppercase letter and one number.'),
  body('role').isIn(['staff1', 'staff2', 'manager1', 'manager2']).withMessage('Invalid role selected.')
], async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("Validation errors during staff creation:", errors.array());
    return next({ status: 400, message: errors.array()[0].msg });
  }

  const { first_name, last_name, personal_email, email, password, role } = req.body;

  try {
    userDb.get('SELECT * FROM users WHERE work_email = ?', [email], async (err, row) => {
      if (err) {
        return res.render('admin/create-staff', {
          flashMessage: 'Database error during email check',
          flashType: 'error',
          csrfToken: req.csrfToken()
        });
      }
      if (row) {
        return res.render('admin/create-staff', {
          flashMessage: 'Email already registered',
          flashType: 'error',
          csrfToken: req.csrfToken()
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      userDb.run(
        `INSERT INTO users (first_name, last_name, personal_email, work_email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [first_name, last_name, personal_email || null, email, hashedPassword, role],
        (err) => {
          if (err) {
            return res.render('admin/create-staff', {
              flashMessage: 'Error creating staff in database',
              flashType: 'error',
              csrfToken: req.csrfToken()
            });
          }
          res.redirect('/admin/staff-dashboard');
        }
      );
    });
  } catch (error) {
    console.error("Unexpected error during staff creation:", error.message);
    res.render('admin/create-staff', {
      flashMessage: 'Unexpected server error',
      flashType: 'error',
      csrfToken: req.csrfToken()
    });
  }
});

// Export the router
module.exports = router;
