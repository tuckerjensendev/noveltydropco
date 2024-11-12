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

    setupDropdownControls();
    restoreFormState();
    setupInputPersistence();
    initializeLinkHighlighting();
    setupFormSubmissionSpinner();
    setupSaveButtonForAccess();
});

// Dropdown control and form toggle functions
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

// Restore form visibility and values based on sessionStorage
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

    // Restore input values if they exist in sessionStorage
    document.getElementById("email").value = sessionStorage.getItem("loginEmail") || "";
    document.getElementById("first_name").value = sessionStorage.getItem("registerFirstName") || "";
    document.getElementById("last_name").value = sessionStorage.getItem("registerLastName") || "";
    document.getElementById("register_email").value = sessionStorage.getItem("registerEmail") || "";
}

// Functions to toggle forms with session persistence
function showRegisterForm() {
    const dropdown = document.getElementById('dropdown');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const signInButton = document.querySelector('.sign-in-button');

    isDropdownOpen = true;
    isRegisterFormOpen = true;
    dropdown.classList.add('show', 'register-mode');
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    signInButton?.classList.add("active-border");

    console.log("Active border added to Sign-In button (Register Form Open)");
    sessionStorage.setItem("showRegisterForm", "true");
    sessionStorage.removeItem("showLoginForm");
}

function showLoginForm() {
    const dropdown = document.getElementById('dropdown');
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const signInButton = document.querySelector('.sign-in-button');

    isDropdownOpen = true;
    isRegisterFormOpen = false;
    dropdown.classList.add("show");
    dropdown.classList.remove("register-mode");
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
    signInButton?.classList.add("active-border");

    console.log("Active border added to Sign-In button (Login Form Open)");
    sessionStorage.setItem("showLoginForm", "true");
    sessionStorage.removeItem("showRegisterForm");
}

function toggleDropdown(event) {
    event.stopPropagation();
    isDropdownOpen ? closeDropdown() : showLoginForm();
}

// Close dropdown function
function closeDropdown() {
    const dropdown = document.getElementById('dropdown');
    const signInButton = document.querySelector('.sign-in-button');

    isDropdownOpen = false;
    dropdown.classList.remove("show", "register-mode");
    signInButton?.classList.remove("active-border");

    console.log("Active border removed from Sign-In button (Dropdown Closed)");
    sessionStorage.removeItem("showLoginForm");
    sessionStorage.removeItem("showRegisterForm");
}

// Attach showLoginForm in case of error
function handleError() {
    sessionStorage.setItem("showLoginForm", "true");
    showLoginForm();
}

// Save input values as user types to ensure persistence across sessions
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

// Initialize active link highlighting based on current URL
function initializeLinkHighlighting() {
    const currentPath = window.location.pathname;
    const linkMap = {
        '/admin/superadmin-dashboard': 'superAdminDashboardLink',
        '/admin/staff-dashboard': 'dashboardLink',
        '/admin/create-staff': 'createStaffLink',
        '/admin/manage-access': 'manageAccessLink',
        '/admin/content-workshop': 'contentWorkshopLink'
    };
    const activeLinkId = linkMap[currentPath];
    if (activeLinkId) {
        document.getElementById(activeLinkId)?.classList.add('active');
        console.log(`Active border added to ${activeLinkId}`);
    }
}

// Attach spinner to all form submissions
function setupFormSubmissionSpinner() {
    document.querySelectorAll("form").forEach(form => {
        form.addEventListener("submit", showSpinner);
    });
}

// Enables / disables save button in manage-access.ejs based on checkbox activity
function setupSaveButtonForAccess() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const saveButton = document.getElementById('saveChangesButton');

    if (!saveButton) return;

    function checkForChanges() {
        const hasChanges = Array.from(checkboxes).some(checkbox =>
            checkbox.checked.toString() !== checkbox.getAttribute('data-original')
        );
        saveButton.disabled = !hasChanges;
    }

    checkboxes.forEach(checkbox => checkbox.addEventListener('change', checkForChanges));

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'checked') {
                checkForChanges();
            }
        });
    });

    checkboxes.forEach(checkbox => observer.observe(checkbox, { attributes: true }));
    checkForChanges();
}
