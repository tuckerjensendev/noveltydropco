// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../models/User');
const bcrypt = require('bcrypt');
const { enforceRoleAccess, ensurePermission } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const csurf = require('csurf');
const csrfProtection = csurf({ cookie: true });

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
        
        // Sort permissions in the desired order
        const orderedPermissions = [
          'can_edit_content',
          'can_view_reports',
          'can_access_financials',
          'can_create_user',
          'can_manage_access_page'
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
  res.render('admin/create-staff', {
    user: req.user,
    csrfToken: req.csrfToken()
  });
});

// Content Workshop Route (requires 'can_edit_content' permission)
router.get('/content-workshop', ensurePermission('can_edit_content'), csrfProtection, (req, res) => {
  res.render('admin/content-workshop', {
      user: req.user,
      csrfToken: req.csrfToken()
  });
});

// POST route to handle content updates in Content Workshop**
router.post('/update-content', ensurePermission('can_edit_content'), csrfProtection, async (req, res) => {
  const { homePageContent } = req.body;

  try {
    // Assume content table has 'id' and 'homepage' columns
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE content_table SET homepage = ? WHERE id = 1`, 
        [homePageContent],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    console.log("Content updated successfully");
    res.redirect('/admin/content-workshop');
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).send("Error updating content");
  }
});

// POST route to handle staff creation
router.post('/create-staff', ensurePermission('can_create_user'), csrfProtection, [
  body('first_name').isAlpha().trim().escape().withMessage('First name must contain only letters.'),
  body('last_name').isAlpha().trim().escape().withMessage('Last name must contain only letters.'),
  body('personal_email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Invalid personal email format.'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid work email format.'),
  body('password').isLength({ min: 8 }).matches(/\d/).matches(/[A-Z]/).withMessage('Password must contain at least 8 characters, including one uppercase letter and one number.'),
  body('role').isIn(['staff1', 'staff2', 'manager1', 'manager2']).withMessage('Invalid role selected.')
], async (req, res) => {
  const errors = validationResult(req);
  const { first_name, last_name, personal_email, email, password, role } = req.body;

  if (!errors.isEmpty()) {
    console.log("Validation errors during staff creation:", errors.array());
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  try {
    db.get('SELECT * FROM users WHERE work_email = ?', [email], async (err, row) => {
      if (err) {
        console.error("Database error during email check:", err.message);
        return res.status(500).json({ error: 'Database error during email check' });
      }
      if (row) {
        logUnauthorizedAccess(`[${new Date().toLocaleString()}] Email already registered: ${email}`);
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (first_name, last_name, personal_email, work_email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [first_name, last_name, personal_email || null, email, hashedPassword, role],
        (err) => {
          if (err) {
            console.error("Error creating staff in database:", err.message);
            return res.status(500).json({ error: 'Error creating staff in database' });
          }
          res.status(200).json({ message: 'Staff account created successfully' });
        }
      );
    });
  } catch (error) {
    console.error("Unexpected error during staff creation:", error.message);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});

// Manage Access Page (requires 'can_manage_access_page' permission)
router.get('/manage-access', ensurePermission('can_manage_access_page'), csrfProtection, (req, res) => {
  loadPermissions(req, res);
});

// POST route to handle permissions update on /manage-access page
router.post('/manage-access', csrfProtection, async (req, res) => {
  const permissionsData = req.body.permissions || {};
  console.log("Permissions data received:", permissionsData);

  try {
    // Step 1: Fetch all existing role-permission mappings
    const existingPermissions = await new Promise((resolve, reject) => {
      db.all(
        `SELECT roles.role_name, permissions.id AS permission_id
         FROM role_permissions
         INNER JOIN roles ON role_permissions.role_id = roles.id
         INNER JOIN permissions ON role_permissions.permission_id = permissions.id`,
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
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

    // ** Step 2: Detect deletions ** - Only remove permissions explicitly unchecked in permissionsData
    // AND exclude the logged-in user's role from deletion processing.
    Object.entries(currentPermissionsMap).forEach(([role, permissionIds]) => {
      if (role === req.user.role) return; // Skip deletion for the logged-in user role

      permissionIds.forEach(permissionId => {
        const permissionKey = `${role}_${permissionId}`;
        if (!(permissionKey in permissionsData)) {
          // If permission is missing in the form data, queue it for deletion
          deletionQueue.push({ role, permissionId });
          changesDetected = true;
        }
      });
    });

    // ** Step 3: Detect additions ** - Only add permissions that are explicitly checked in permissionsData
    Object.entries(permissionsData).forEach(([roleWithId, isChecked]) => {
      if (isChecked === 'on') {
        const [role, permissionId] = roleWithId.split('_');
        if (!currentPermissionsMap[role] || !currentPermissionsMap[role].has(permissionId)) {
          // Queue for addition if checked and not in current permissions
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
          if (err || !row) {
            console.error(`Role not found for role name: ${role}`);
            return resolve(null);
          }
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

    // Final redirect after saving changes
    res.redirect('/admin/manage-access');
  } catch (error) {
    console.error("Error updating role permissions:", error);
    res.status(500).send("Server error while updating permissions.");
  }
});

module.exports = router;
