// main.js

let isDropdownOpen = false;
let isRegisterFormOpen = false;

// Spinner show/hide functions
function showSpinner() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.style.display = "flex";
}
function hideSpinner() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.style.display = "none";
}

// Client facing errors - Flash message timeout with targeted click-to-hide functionality
function setupFlashMessageTimeout() {
  const flashMessage = document.getElementById('flashMessage');
  if (flashMessage) {
    const timeoutId = setTimeout(() => {
      flashMessage.style.display = 'none';
    }, 20000);

    flashMessage.addEventListener('click', (event) => {
      event.stopPropagation();
      flashMessage.style.display = 'none';
      clearTimeout(timeoutId);
    });
  }
}

// For login / client registration - dropdown control and form toggle functions
function setupDropdownControls() {
  const showRegisterLink = document.getElementById('show-register');
  const showLoginLink = document.getElementById('show-login');
  const signInButton = document.querySelector('.sign-in-button');
  const profilePicture = document.getElementById('profile-picture');
  const dropdown = document.getElementById('dropdown');

  showRegisterLink?.addEventListener('click', (event) => {
    event.preventDefault();
    showRegisterForm();
  });

  showLoginLink?.addEventListener('click', (event) => {
    event.preventDefault();
    showLoginForm();
  });

  signInButton?.addEventListener('click', (event) => {
    event.preventDefault();
    isDropdownOpen ? closeDropdown() : showLoginForm();
  });

  profilePicture?.addEventListener('click', toggleDropdown);

  document.addEventListener('click', (event) => {
    if (dropdown && !dropdown.contains(event.target) && !signInButton?.contains(event.target)) {
      if (!isRegisterFormOpen) closeDropdown();
    }
  });
}

// For Login / Client Registration - restore form visibility and values based on sessionStorage
function restoreFormState() {
  const showLoginFormState = sessionStorage.getItem("showLoginForm") === "true";
  const showRegisterFormState = sessionStorage.getItem("showRegisterForm") === "true";

  if (showLoginFormState) {
    showLoginForm();
  } else if (showRegisterFormState) {
    showRegisterForm();
  } else {
    closeDropdown();
  }

  const emailField = document.getElementById("email");
  const firstNameField = document.getElementById("first_name");
  const lastNameField = document.getElementById("last_name");
  const registerEmailField = document.getElementById("register_email");

  if (emailField) emailField.value = sessionStorage.getItem("loginEmail") || "";
  if (firstNameField) firstNameField.value = sessionStorage.getItem("registerFirstName") || "";
  if (lastNameField) lastNameField.value = sessionStorage.getItem("registerLastName") || "";
  if (registerEmailField) registerEmailField.value = sessionStorage.getItem("registerEmail") || "";
}

// Client Registration - Password validation functions
function validatePassword() {
  const passwordField = document.getElementById("register_password");
  const confirmPasswordField = document.getElementById("confirm_password");

  if (passwordField && confirmPasswordField) {
    const password = passwordField.value;
    const confirmPassword = confirmPasswordField.value;

    const lengthReq = document.querySelector('[data-requirement="length"]');
    const uppercaseReq = document.querySelector('[data-requirement="uppercase"]');
    const numberReq = document.querySelector('[data-requirement="number"]');
    const matchReq = document.querySelector('[data-requirement="match"]');

    const lengthMet = password.length >= 8;
    const uppercaseMet = /[A-Z]/.test(password);
    const numberMet = /\d/.test(password);
    const matchMet = password === confirmPassword && password !== "";

    toggleRequirementClass(lengthReq, lengthMet);
    toggleRequirementClass(uppercaseReq, uppercaseMet);
    toggleRequirementClass(numberReq, numberMet);
    toggleRequirementClass(matchReq, matchMet);
  }
}

function toggleRequirementClass(element, isMet) {
  if (element) {
    if (isMet) {
      element.classList.add("met");
    } else {
      element.classList.remove("met");
    }
  }
}

function resetPasswordRequirements() {
  const requirementsContainer = document.getElementById("password-requirements-container");
  const requirementsList = document.getElementById("password-requirements");

  if (requirementsContainer && requirementsList) {
    requirementsContainer.classList.remove("show");
    requirementsList.classList.add("hidden");
    document.querySelectorAll('.requirement').forEach(req => req.classList.remove("met"));
  }
}

// Specifically for login/client registration forms - functions to toggle forms with session persistence
function showRegisterForm() {
  const dropdown = document.getElementById('dropdown');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const signInButton = document.querySelector('.sign-in-button');

  if (!dropdown || !loginForm || !registerForm) {
    console.error("One or more elements missing for showRegisterForm.");
    return;
  }

  isDropdownOpen = true;
  isRegisterFormOpen = true;
  dropdown.classList.add('show', 'register-mode');
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  signInButton?.classList.add("active-border");

  sessionStorage.setItem("showRegisterForm", "true");
  sessionStorage.removeItem("showLoginForm");
}

function showLoginForm() {
  const dropdown = document.getElementById('dropdown');
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const signInButton = document.querySelector('.sign-in-button');

  if (!dropdown || !loginForm || !registerForm) {
    console.error("One or more elements missing for showLoginForm.");
    return;
  }

  isDropdownOpen = true;
  isRegisterFormOpen = false;
  dropdown.classList.add("show");
  dropdown.classList.remove("register-mode");
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  signInButton?.classList.add("active-border");

  sessionStorage.setItem("showLoginForm", "true");
  sessionStorage.removeItem("showRegisterForm");
}

function toggleDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('dropdown');

  if (isDropdownOpen) {
    closeDropdown();
  } else {
    if (dropdown) dropdown.classList.add("show");
    isDropdownOpen = true;
  }
}

// Login/Logout menu - close dropdown function
function closeDropdown() {
  const dropdown = document.getElementById('dropdown');
  const signInButton = document.querySelector('.sign-in-button');

  if (!dropdown) {
    console.error("Dropdown element is missing.");
    return;
  }

  isDropdownOpen = false;
  dropdown.classList.remove("show", "register-mode");
  signInButton?.classList.remove("active-border");

  sessionStorage.removeItem("showLoginForm");
  sessionStorage.removeItem("showRegisterForm");
  sessionStorage.removeItem("loginEmail");
  sessionStorage.removeItem("registerFirstName");
  sessionStorage.removeItem("registerLastName");
  sessionStorage.removeItem("registerEmail");

  // Additionally, remove inactivity tracker if implemented
  removeInactivityTracker();
}

// For client login & registration - save input values as user types to ensure persistence across sessions
function setupInputPersistence() {
  document.getElementById("email")?.addEventListener("input", (event) => {
    sessionStorage.setItem("loginEmail", event.target.value);
  });
  document.getElementById("first_name")?.addEventListener("input", (event) => {
    sessionStorage.setItem("registerFirstName", event.target.value);
  });
  document.getElementById("last_name")?.addEventListener("input", (event) => {
    sessionStorage.setItem("registerLastName", event.target.value);
  });
  document.getElementById("register_email")?.addEventListener("input", (event) => {
    sessionStorage.setItem("registerEmail", event.target.value);
  });
}

// On staff-header.ejs file - active link highlighting based on current URL
function setupActiveLinkHighlighting() {
  const currentPath = window.location.pathname;

  const linkMap = {
    '/admin/superadmin-dashboard': 'superAdminDashboardLink',
    '/admin/staff-dashboard': 'dashboardLink',
    '/admin/create-staff': 'createStaffLink',
    '/admin/manage-access': 'manageAccessLink',
    '/admin/content-workshop': 'contentWorkshopLink',
  };

  const activeLinkId = linkMap[currentPath];
  if (activeLinkId) {
    document.getElementById(activeLinkId)?.classList.add('active-border');
  }

  Object.values(linkMap).forEach((id) => {
    const linkElement = document.getElementById(id);
    if (linkElement) {
      linkElement.addEventListener('click', (event) => {
        document.querySelectorAll('.staff-header-content a').forEach((link) => {
          link.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
      });
    }
  });
}

// Attach spinner to all form submissions
function setupFormSubmissionSpinner() {
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", showSpinner);
  });
}

// **Updated logTimeoutToServer Function with sessionStorage**
function logTimeoutToServer() {
  if (sessionStorage.getItem('sessionTimeoutLogged')) {
    return; // Already logged
  }

  sessionStorage.setItem('sessionTimeoutLogged', 'true');

  const userId = document.body.getAttribute('data-user-id');
  const role = document.body.getAttribute('data-role');
  const ip = document.body.getAttribute('data-ip');

  const data = { userId, role, ip };
  console.log('Logging session timeout with data:', data); // Debugging Line

  fetch('/admin/log-session-timeout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      console.log('Session timeout logged successfully.');
    })
    .catch(error => console.error('Error logging session timeout:', error));
}

// Client-side session timeout tracker
let timeoutHandle, warningHandle; // Moved to global scope for removal
let isPopupVisible = false; // Track popup visibility
let countdownInterval; // To clear countdown interval when needed

function setupInactivityTracker() {
  const inactivityTimeout = 15 * 60 * 1000; // 15 minutes in milliseconds
  const warningTime = 60 * 1000; // Show warning 60 seconds (1 minute) before logout

  // Create the warning popup element
  const warningPopup = document.createElement('div');
  warningPopup.id = 'warningPopup';
  warningPopup.classList.add('timeoutpopup'); // Use consistent CSS styling
  document.body.appendChild(warningPopup);

  // Reset the inactivity timer
  function resetInactivityTimer() {
    if (isPopupVisible) return; // Do not reset timer if popup is visible
    clearTimeout(timeoutHandle);
    clearTimeout(warningHandle);
    hideWarningPopup();

    // Start the warning timer
    warningHandle = setTimeout(() => {
      showWarningPopup(60); // Show popup with a 60-second countdown
    }, inactivityTimeout - warningTime);

    // Start the inactivity timeout
    timeoutHandle = setTimeout(() => {
      logTimeoutToServer(); // Log timeout to the server
      const logoutForm = document.getElementById('logoutForm');
      if (logoutForm) {
        showSpinner();
        logoutForm.submit();
      } else {
        console.error('Logout form not found.');
      }
    }, inactivityTimeout);
  }

  // Show the warning popup
  function showWarningPopup(secondsRemaining) {
    isPopupVisible = true; // Mark popup as visible
    warningPopup.style.display = 'flex'; // Flexbox container for alignment
    warningPopup.innerHTML = `
      <p id="main-timeout-warning-line"><strong>You have been inactive for 14 minutes.</strong></p>
      <p>You will be logged out in <strong><span id="countdown">${secondsRemaining}</span></strong> seconds.</p>
      <p id="click-anywhere-warning">Click anywhere to dismiss</p>
    `;

    // Start the countdown
    const countdownElement = document.getElementById('countdown');
    countdownInterval = setInterval(() => {
      secondsRemaining--;
      countdownElement.textContent = secondsRemaining;
      if (secondsRemaining <= 0) {
        clearInterval(countdownInterval);
        hideWarningPopup();
      }
    }, 1000);

    // Add click listeners to close the popup
    document.addEventListener('click', closePopupOnClick);
  }

  // Close popup on click
  function closePopupOnClick(event) {
    if (isPopupVisible) {
      // Check if the click is inside or outside the popup
      if (event.target.id === 'warningPopup' || !warningPopup.contains(event.target)) {
        isPopupVisible = false; // Mark popup as not visible
        hideWarningPopup();
        clearInterval(countdownInterval);
        document.removeEventListener('click', closePopupOnClick); // Remove the click listener
      }
    }
  }

  // Hide the warning popup
  function hideWarningPopup() {
    warningPopup.style.display = 'none';
  }

  // Attach activity listeners to reset the inactivity timer
  ['click', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    window.addEventListener(event, resetInactivityTimer);
  });

  // Start the inactivity timer
  resetInactivityTimer();
}

// Function to remove inactivity tracker (e.g., on logout)
function removeInactivityTracker() {
  ['click', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    window.removeEventListener(event, resetInactivityTimer);
  });
  clearTimeout(timeoutHandle);
  clearTimeout(warningHandle);
  clearInterval(countdownInterval);
  hideWarningPopup();
}

// Show "Logged Out Due to Inactivity" popup if session timeout occurred
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('sessionTimeoutLogged')) {
    // Show the second popup
    const logoutPopup = document.createElement('div');
    logoutPopup.id = 'logoutPopup';
    logoutPopup.classList.add('timeoutpopup');
    logoutPopup.innerHTML = `
      <p id="timed-out-logout"><strong>You have been logged out due to inactivity.</strong></p>
      <p>Please log back in to continue.</p>
    `;

    document.body.appendChild(logoutPopup);

    // Remove the flag to prevent repeated popups
    sessionStorage.removeItem('sessionTimeoutLogged');

    // Add event listener to dismiss the popup on click
    document.addEventListener('click', function dismissPopup(event) {
      if (logoutPopup.contains(event.target)) {
        // Prevent dismissing if the click is inside the popup
        return;
      }
      document.body.removeChild(logoutPopup);
      document.removeEventListener('click', dismissPopup); // Remove the listener after the popup is dismissed
    });
  }
});

// Disable logout button upon form submission to prevent multiple submissions
function setupLogoutButtonDisable() {
  const logoutForm = document.getElementById('logoutForm');
  const logoutButton = document.getElementById('logoutButton'); // This button has been removed from main.ejs

  if (logoutForm && logoutButton) {
    logoutForm.addEventListener('submit', function (e) {
      logoutButton.disabled = true;
    });
  }
}

// Manage-access.ejs: Enables/disables save button based on checkbox activity
function setupSaveButtonToggle() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const saveButton = document.getElementById('saveChangesButton');

  function checkForChanges() {
    if (!saveButton) return;
    const hasChanges = Array.from(checkboxes).some(
      (checkbox) => checkbox.checked.toString() !== checkbox.getAttribute('data-original')
    );
    saveButton.disabled = !hasChanges;
  }

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', checkForChanges);
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'checked') {
        checkForChanges();
      }
    });
  });

  checkboxes.forEach((checkbox) => observer.observe(checkbox, { attributes: true }));
  checkForChanges();
}

// Consolidated DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  showSpinner();
  window.addEventListener("load", hideSpinner);

  setupDropdownControls();
  restoreFormState();
  setupInputPersistence();
  setupFormSubmissionSpinner();
  setupFlashMessageTimeout();
  setupSaveButtonToggle();
  setupActiveLinkHighlighting();
  setupLogoutButtonDisable();

  // Conditionally initialize inactivity tracker only if user is logged in
  const userId = document.body.getAttribute('data-user-id');
  if (userId) {
    setupInactivityTracker();
  }

  const passwordField = document.getElementById("register_password");
  const confirmPasswordField = document.getElementById("confirm_password");
  const requirementsContainer = document.getElementById("password-requirements-container");
  const requirementsList = document.getElementById("password-requirements");

  // Show requirements container on focus
  passwordField?.addEventListener("focus", showPasswordRequirements);
  confirmPasswordField?.addEventListener("focus", showPasswordRequirements);

  // Validate password as user types
  passwordField?.addEventListener("input", validatePassword);
  confirmPasswordField?.addEventListener("input", validatePassword);

  // Hide requirements if both password fields are empty and focus is lost
  document.addEventListener("click", (event) => {
    if (
      (!passwordField || !passwordField.value) &&
      (!confirmPasswordField || !confirmPasswordField.value) &&
      requirementsContainer &&
      !requirementsContainer.contains(event.target) &&
      event.target !== passwordField &&
      event.target !== confirmPasswordField
    ) {
      hidePasswordRequirements();
    }
  });

  function showPasswordRequirements() {
    if (requirementsContainer) requirementsContainer.classList.add("show");
    if (requirementsList) requirementsList.classList.remove("hidden");
  }

  function hidePasswordRequirements() {
    if (requirementsContainer) requirementsContainer.classList.remove("show");
    if (requirementsList) requirementsList.classList.add("hidden");
  }
});
