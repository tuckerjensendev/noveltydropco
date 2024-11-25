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

    const lengthMet = password.length >= 6;
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

function logTimeoutToServer() {
  fetch('/admin/log-session-timeout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: document.body.getAttribute('data-user-id'),
      role: document.body.getAttribute('data-role'),
      ip: document.body.getAttribute('data-ip'),
    }),
  }).catch((error) => console.error('Error logging session timeout:', error));
}

// Client-side session timeout tracker
function setupInactivityTracker() {
  const inactivityTimeout = 60 * 1000; // 60 seconds total for testing
  const warningTime = 30 * 1000; // Show warning at 30 seconds before logout
  let timeoutHandle, warningHandle;
  let isPopupVisible = false; // Track popup visibility

  // Create the warning popup element
  const warningPopup = document.createElement('div');
  warningPopup.id = 'warningPopup'; // Ensure the CSS applies based on this ID
  document.body.appendChild(warningPopup);

  // Reset the inactivity timer
  function resetInactivityTimer() {
    if (isPopupVisible) return; // Do not reset timer if popup is visible
    clearTimeout(timeoutHandle);
    clearTimeout(warningHandle);
    hideWarningPopup();

    // Start the warning timer
    warningHandle = setTimeout(() => {
      showWarningPopup(30); // Show popup with a 30-second countdown
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
    warningPopup.style.display = 'block'; // Make the popup visible
    warningPopup.innerHTML = `
      <p><strong>You have been inactive for ${inactivityTimeout / 1000 - warningTime / 1000} seconds.</strong></p>
      <p>You will be logged out in <span id="countdown">${secondsRemaining}</span> seconds.</p>
      <p id="click-anywhere-warning">Click anywhere to dismiss</p>
    `;

    // Start the countdown
    const countdownElement = document.getElementById('countdown');
    const countdownInterval = setInterval(() => {
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
        document.removeEventListener('click', closePopupOnClick); // Remove the click listener
      }
    }
  }

  // Hide the warning popup
  function hideWarningPopup() {
    warningPopup.style.display = 'none';
  }

  // Attach activity listeners to reset the inactivity timer
  ['click', 'keypress', 'scroll', 'touchstart'].forEach((event) => {
    window.addEventListener(event, resetInactivityTimer);
  });

  // Start the inactivity timer
  resetInactivityTimer();
}

// Disable logout button upon form submission to prevent multiple submissions
function setupLogoutButtonDisable() {
  const logoutForm = document.getElementById('logoutForm');
  const logoutButton = document.getElementById('logoutButton');

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
  setupInactivityTracker();

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
