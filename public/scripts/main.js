// main.js

let isDropdownOpen = false;
let isRegisterFormOpen = false;

// Initialize active link highlighting based on current URL
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname;

  // Map routes to their corresponding link IDs
  const linkMap = {
    '/admin/superadmin-dashboard': 'superAdminDashboardLink',
    '/admin/staff-dashboard': 'dashboardLink',
    '/admin/create-staff': 'createStaffLink',
    '/admin/manage-access': 'manageAccessLink',
    '/admin/content-workshop': 'contentWorkshopLink'
};

  // Set active class on the corresponding link
  const activeLinkId = linkMap[currentPath];
  if (activeLinkId) {
    document.getElementById(activeLinkId)?.classList.add('active');
  }

  // Add click listeners to dynamically display active links
  Object.values(linkMap).forEach(id => {
    const linkElement = document.getElementById(id);
    linkElement?.addEventListener('click', () => {
      // Remove active class from all links before adding it to the clicked one
      document.querySelectorAll('.staff-header-content a').forEach(link => link.classList.remove('active'));
      linkElement.classList.add('active');
    });
  });

  const profile = document.getElementById('profile');
  const profilePicture = document.getElementById('profile-picture');
  const signInButton = document.querySelector('.sign-in-button');

  if (profile && !profilePicture && signInButton) {
    // Make "Hello, Sign in" clickable only if register form is not open
    signInButton.addEventListener('click', (event) => {
      if (!isRegisterFormOpen) {
        toggleDropdown(event);
      }
    });
  } else if (profilePicture) {
    // User is logged in, only profile picture should be clickable
    profilePicture.addEventListener('click', toggleDropdown);
  }

  // Close dropdown when clicking outside, keeping register form open if visible
  document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('dropdown');
    const registerForm = document.getElementById('register-form');

    if (
      dropdown && profile && !profile.contains(event.target) &&
      !dropdown.contains(event.target) && 
      !(registerForm && !registerForm.classList.contains('hidden'))
    ) {
      closeDropdown();
    }
  });
});

// Toggle dropdown visibility
function toggleDropdown(event) {
  const dropdown = document.getElementById('dropdown');
  const profile = document.querySelector('.profile');
  if (dropdown) {
    isDropdownOpen = !isDropdownOpen;
    dropdown.classList.toggle('show', isDropdownOpen);
    profile.classList.toggle('active-border', isDropdownOpen);
    event.stopPropagation();
  }
}

// Close dropdown function
function closeDropdown() {
  const dropdown = document.getElementById('dropdown');
  const profile = document.querySelector('.profile');
  if (dropdown) {
    dropdown.classList.remove('show');
    isDropdownOpen = false;
  }
  profile?.classList.remove('active-border');
}

// Prevent dropdown from closing when clicking inside it
document.getElementById('dropdown')?.addEventListener('click', (event) => {
  event.stopPropagation();
});

// Function to show the registration form and keep it open when clicked outside
function showRegisterForm() {
  const dropdown = document.getElementById('dropdown');
  const hamburgerMenuIcon = document.querySelector('.hamburger-menu-icon');
  const signInButton = document.querySelector('.sign-in-button');
  
  isRegisterFormOpen = true; // Track register form status
  if (dropdown) {
    dropdown.classList.add('show');
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    dropdown.classList.add('register-mode');
    document.getElementById('overlay').classList.remove('hidden');
    signInButton?.classList.add('disabled'); // Disable "Hello, Sign in"

    document.querySelector('.profile').classList.add('active-border');
    if (hamburgerMenuIcon) {
      hamburgerMenuIcon.classList.add('active');
    }
  }
}

// Function to show the login form
function showLoginForm() {
  const dropdown = document.getElementById('dropdown');
  const hamburgerMenuIcon = document.querySelector('.hamburger-menu-icon');
  const signInButton = document.querySelector('.sign-in-button');
  
  isRegisterFormOpen = false; // Reset register form status
  if (dropdown) {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    dropdown.classList.remove('register-mode');
    document.getElementById('overlay').classList.add('hidden');
    signInButton?.classList.remove('disabled'); // Enable "Hello, Sign in" again

    setTimeout(() => {
      dropdown.classList.add('show');
      document.querySelector('.profile').classList.add('active-border');
      if (hamburgerMenuIcon) {
        hamburgerMenuIcon.classList.add('active');
      }
    }, 10);
  }
}

// Async function for user login
async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const csrfToken = document.getElementById('profile').getAttribute('data-csrf');

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const user = await response.json();
      if (user.role === 'client') {
        window.location.href = '/';
      } else if (user.superadmin) {
        window.location.href = '/admin/superadmin-dashboard';
      } else {
        window.location.href = '/admin/staff-dashboard';
      }
    } else {
      const error = await response.json();
      alert(error.error || 'Login failed. Please check your email and password.');
    }
  } catch (error) {
    console.error('Error during login:', error);
    alert('An error occurred. Please try again later.');
  }
}

// Async function for user registration
async function register() {
  const firstName = document.getElementById('first_name').value;
  const lastName = document.getElementById('last_name').value;
  const email = document.getElementById('register_email').value;
  const password = document.getElementById('register_password').value;
  const confirmPassword = document.getElementById('confirm_password').value;
  const csrfToken = document.getElementById('profile').getAttribute('data-csrf');

  if (password !== confirmPassword) {
    alert("Passwords do not match. Please try again.");
    return;
  }

  try {
    const response = await fetch('/customer-register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, personal_email: email, password })
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      window.location.href = '/login';
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Error during registration:', error);
    alert('An error occurred. Please try again later.');
  }
}

// Async function for staff registration
async function createStaff(event) {
  event.preventDefault(); // Prevent default form submission

  // Collect all form field values
  const firstName = document.getElementById('first_name').value;
  const lastName = document.getElementById('last_name').value;
  const personalEmail = document.getElementById('personal_email').value; // Ensure this field is captured
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const csrfToken = document.querySelector('input[name="_csrf"]').value;

  // Send request to create staff
  try {
    const response = await fetch('/admin/create-staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        personal_email: personalEmail, // Include personal_email
        email: email,
        password: password,
        role: role
      })
    });

    if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
      const result = await response.json();
      alert(result.message);
      document.getElementById('createStaffForm').reset();
    } else {
      const error = await response.json();
      alert(error.error || "Unexpected server response.");
    }
  } catch (error) {
    console.error('Error during staff creation:', error);
    alert('An error occurred. Please try again later.');
  }
}

// Only add one listener for form submission
document.getElementById('createStaffForm')?.addEventListener('submit', createStaff);

// Event Listeners
document.getElementById('login-button')?.addEventListener('click', (event) => {
  event.preventDefault();
  login();
});
document.getElementById('register-button')?.addEventListener('click', (event) => {
  event.preventDefault();
  register();
});
document.getElementById('show-register')?.addEventListener('click', (event) => {
  event.preventDefault();
  showRegisterForm();
});
document.getElementById('show-login')?.addEventListener('click', (event) => {
  event.preventDefault();
  showLoginForm();
});


// enables / disables save button in manage-access.ejs based off checkbox activity
document.addEventListener('DOMContentLoaded', () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const saveButton = document.getElementById('saveChangesButton');

  function logState() {
    console.clear();
    console.log("=== Checkbox States ===");
    checkboxes.forEach((checkbox, index) => {
      console.log(`Checkbox ${index + 1}: Checked=${checkbox.checked}, Original=${checkbox.getAttribute('data-original')}`);
    });
    console.log("Save Button Status:", saveButton.disabled ? "Disabled" : "Enabled");
  }

  function checkForChanges() {
    const hasChanges = Array.from(checkboxes).some(checkbox => 
      checkbox.checked.toString() !== checkbox.getAttribute('data-original')
    );
    saveButton.disabled = !hasChanges;
    logState();
  }

  // Attach the event listener to each checkbox
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', checkForChanges);
  });

  // Observe mutations on checkboxes for any unexpected DOM changes
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'checked') {
        console.log("Mutation detected on checkbox:", mutation.target);
        checkForChanges();
      }
    });
  });

  checkboxes.forEach(checkbox => {
    observer.observe(checkbox, { attributes: true });
  });

  // Initial check to ensure button is correctly disabled
  checkForChanges();
});
