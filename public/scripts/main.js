// main.js

let isDropdownOpen = false;
let isRegisterFormOpen = false;

// Spinner show/hide functions
function showSpinner() {
    document.getElementById("loadingSpinner").style.display = "flex";
}
function hideSpinner() {
    document.getElementById("loadingSpinner").style.display = "none";
}

// Show spinner on page load and hide when fully loaded
document.addEventListener("DOMContentLoaded", () => {
    showSpinner();
    window.addEventListener("load", hideSpinner);

    // Debug: Confirm event listener attachment for show-register
    const showRegisterLink = document.getElementById('show-register');
    if (showRegisterLink) {
        console.log("show-register element found, adding event listener.");
        showRegisterLink.addEventListener('click', (event) => {
            event.preventDefault();
            showRegisterForm();
        });
    } else {
        console.warn("show-register element not found!");
    }

    const showLoginLink = document.getElementById('show-login');
    showLoginLink?.addEventListener('click', (event) => {
        event.preventDefault();
        showLoginForm();
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const flashMessage = document.getElementById("flashMessage");
    if (flashMessage) {
        // Hide the flash message after 10 seconds
        setTimeout(() => {
            flashMessage.style.display = "none"; // Instantly hides the message
            flashMessage.remove(); // Removes from the DOM for performance
        }, 10000); // Wait 10 seconds before hiding
    }
});



// Initialize active link highlighting based on current URL
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;

    // Map routes to their corresponding link IDs
    const linkMap = {
        '/admin/superadmin-dashboard': 'superAdminDashboardLink',
        '/admin/staff-dashboard': 'dashboardLink',  // Mapping updated to reflect "Dashboard"
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

// Attach spinner to all form submissions
document.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", () => {
        showSpinner();
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
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const overlay = document.getElementById('overlay');
    const signInButton = document.querySelector('.sign-in-button');
    
    // Debugging statements to verify element presence
    if (!dropdown || !loginForm || !registerForm || !overlay) {
        console.error("One or more elements missing in showRegisterForm:");
        console.log("dropdown:", dropdown, "loginForm:", loginForm, "registerForm:", registerForm, "overlay:", overlay);
        return;
    }
    
    isRegisterFormOpen = true; // Track register form status
    dropdown.classList.add('show');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    dropdown.classList.add('register-mode');
    overlay.classList.remove('hidden');
    signInButton?.classList.add('disabled');
    document.querySelector('.profile').classList.add('active-border');
}

// Function to show the login form
function showLoginForm() {
    const dropdown = document.getElementById('dropdown');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const overlay = document.getElementById('overlay');
    const signInButton = document.querySelector('.sign-in-button');
    
    isRegisterFormOpen = false; // Reset register form status
    if (dropdown && loginForm && registerForm && overlay) {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        dropdown.classList.remove('register-mode');
        overlay.classList.add('hidden');
        signInButton?.classList.remove('disabled');
        setTimeout(() => {
            dropdown.classList.add('show');
            document.querySelector('.profile').classList.add('active-border');
        }, 10);
    }
}


// Trigger login on both Enter key press and button click
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');

// Ensure form submits on Enter key
if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        login(event);  // Trigger login on form submit (Enter key)
    });
}

// Ensure login button works as expected
if (loginButton) {
    loginButton.addEventListener('click', (event) => {
        event.preventDefault();
        login(event);  // Trigger login on button click
    });
}

// Async function for user registration
async function register() {
  showSpinner(); // Show spinner at the start
  const firstName = document.getElementById('first_name').value;
  const lastName = document.getElementById('last_name').value;
  const email = document.getElementById('register_email').value;
  const password = document.getElementById('register_password').value;
  const confirmPassword = document.getElementById('confirm_password').value;
  const csrfToken = document.getElementById('profile').getAttribute('data-csrf');

  // Validation checks
  if (!firstName || firstName.length < 2) {
      showFlashMessage("First name must contain at least 2 letters.", "error");
      hideSpinner();
      return;
  }
  if (!lastName || lastName.length < 2) {
      showFlashMessage("Last name must contain at least 2 letters.", "error");
      hideSpinner();
      return;
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email)) {
      showFlashMessage("Please enter a valid email address.", "error");
      hideSpinner();
      return;
  }
  if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      showFlashMessage("Password must be at least 8 characters long and contain one uppercase letter and one number.", "error");
      hideSpinner();
      return;
  }
  if (password !== confirmPassword) {
      showFlashMessage("Passwords do not match. Please try again.", "error");
      hideSpinner();
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
          showFlashMessage(result.message, "success");

          // Log in the user after registration
          const loginResponse = await fetch('/login', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'X-CSRF-Token': csrfToken
              },
              body: JSON.stringify({ email, password })
          });

          if (loginResponse.ok) {
              showFlashMessage("Account created and logged in successfully!", "success");
              setTimeout(() => {
                  window.location.href = '/';
              }, 3000);
          } else {
              showFlashMessage("Account created, but login failed. Please log in manually.", "error");
          }
      } else {
          showFlashMessage(result.error || "Unexpected error during registration.", "error");
      }
  } catch (error) {
      console.error('Error during registration:', error);
      showFlashMessage('An error occurred. Please try again later.', "error");
  } finally {
      hideSpinner(); // Ensure the spinner is hidden in all cases
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

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', checkForChanges);
    });

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

    checkForChanges();
});
