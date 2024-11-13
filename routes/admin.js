// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../models/User');
const bcrypt = require('bcrypt');
const { enforceRoleAccess, ensurePermission } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const csurf = require('csurf');
const csrfProtection = csurf({ cookie: true });

// Assuming role levels are ordered from lowest to highest authority.
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
  console.log("Rendering create-staff with user:", req.user); // Add this debug line
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

    // ** Step 2: Detect deletions **
    Object.entries(currentPermissionsMap).forEach(([role, permissionIds]) => {
      const roleLevel = getRoleLevel(role);
      if (roleLevel >= userRoleLevel) return; // Skip deletions for roles at or above the user's level

      permissionIds.forEach(permissionId => {
        const permissionKey = `${role}_${permissionId}`;
        if (!(permissionKey in permissionsData)) {
          // If permission is missing in the form data, queue it for deletion
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


// // POST route to handle staff creation with EJS rendering on errors
// router.post('/create-staff', ensurePermission('can_create_user'), csrfProtection, [
//   body('first_name').isAlpha().trim().escape().withMessage('First name must contain only letters.'),
//   body('last_name').isAlpha().trim().escape().withMessage('Last name must contain only letters.'),
//   body('personal_email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Invalid personal email format.'),
//   body('email').isEmail().normalizeEmail().withMessage('Invalid work email format.'),
//   body('password').isLength({ min: 8 }).matches(/\d/).matches(/[A-Z]/).withMessage('Password must contain at least 8 characters, including one uppercase letter and one number.'),
//   body('role').isIn(['staff1', 'staff2', 'manager1', 'manager2']).withMessage('Invalid role selected.')
// ], async (req, res) => {
//   const errors = validationResult(req);

//   if (!errors.isEmpty()) {
//     console.log("Validation errors during staff creation:", errors.array());
//     // Render the create-staff page with flash message on validation errors
//     return res.status(400).render('admin/create-staff', {
//       user: req.user,
//       csrfToken: req.csrfToken(),
//       flashMessage: errors.array()[0].msg, // Error message passed to the template
//       flashType: 'error'
//     });
//   }

//   const { first_name, last_name, personal_email, email, password, role } = req.body;
//   try {
//     db.get('SELECT * FROM users WHERE work_email = ?', [email], async (err, row) => {
//       if (err) {
//         console.error("Database error during email check:", err.message);
//         return res.status(500).render('admin/create-staff', {
//           user: req.user,
//           csrfToken: req.csrfToken(),
//           flashMessage: 'Database error during email check',
//           flashType: 'error'
//         });
//       }
//       if (row) {
//         console.warn("Email already registered:", email);
//         return res.status(400).render('admin/create-staff', {
//           user: req.user,
//           csrfToken: req.csrfToken(),
//           flashMessage: 'Email already registered',
//           flashType: 'error'
//         });
//       }

//       const hashedPassword = await bcrypt.hash(password, 10);
//       db.run(
//         `INSERT INTO users (first_name, last_name, personal_email, work_email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
//         [first_name, last_name, personal_email || null, email, hashedPassword, role],
//         (err) => {
//           if (err) {
//             console.error("Error creating staff in database:", err.message);
//             return res.status(500).render('admin/create-staff', {
//               user: req.user,
//               csrfToken: req.csrfToken(),
//               flashMessage: 'Error creating staff in database',
//               flashType: 'error'
//             });
//           }
//           // Redirect to staff list or reload page on success
//           res.redirect('/admin/staff-dashboard');
//         }
//       );
//     });

//   } catch (error) {
//     console.error("Unexpected error during staff creation:", error.message);
//     res.status(500).render('admin/create-staff', {
//       user: req.user,
//       csrfToken: req.csrfToken(),
//       flashMessage: 'Unexpected server error',
//       flashType: 'error'
//     });
//   }
// });
module.exports = router;

