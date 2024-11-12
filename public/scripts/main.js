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

// Flash message timeout with targeted click-to-hide functionality
function setupFlashMessageTimeout() {
    const flashMessage = document.getElementById('flashMessage');
    if (flashMessage) {
        // Set timeout to hide flash message after 10 seconds
        const timeoutId = setTimeout(() => {
            flashMessage.style.display = 'none';
        }, 20000); // 20 seconds

        // Hide flash message only when clicked directly
        flashMessage.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevents click from affecting other elements
            flashMessage.style.display = 'none';
            clearTimeout(timeoutId); // Prevents the timeout from running if already hidden
        });
    }
}

// Call the function after the page loads
document.addEventListener("DOMContentLoaded", () => {
    showSpinner();
    window.addEventListener("load", hideSpinner);
    setupDropdownControls();
    restoreFormState();
    setupInputPersistence();
    setupFormSubmissionSpinner();
    setupFlashMessageTimeout(); // Initialize flash message timeout and click-to-hide
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
    const emailField = document.getElementById("email");
    const firstNameField = document.getElementById("first_name");
    const lastNameField = document.getElementById("last_name");
    const registerEmailField = document.getElementById("register_email");
    if (emailField) emailField.value = sessionStorage.getItem("loginEmail") || "";
    if (firstNameField) firstNameField.value = sessionStorage.getItem("registerFirstName") || "";
    if (lastNameField) lastNameField.value = sessionStorage.getItem("registerLastName") || "";
    if (registerEmailField) registerEmailField.value = sessionStorage.getItem("registerEmail") || "";
}

// Functions to toggle forms with session persistence
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

    console.log("Active border added to Sign-In button (Register Form Open)");
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

    console.log("Active border added to Sign-In button (Login Form Open)");
    sessionStorage.setItem("showLoginForm", "true");
    sessionStorage.removeItem("showRegisterForm");
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('dropdown');

    if (!dropdown) {
        console.error("Dropdown element is missing.");
        return;
    }

    if (isDropdownOpen) {
        closeDropdown();
    } else {
        dropdown.classList.add("show");
        isDropdownOpen = true;
        console.log("Dropdown opened for profile picture click");
    }
}


// Close dropdown function
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

    console.log("Active border removed from Sign-In button (Dropdown Closed)");

    // Ensure all form states are reset
    sessionStorage.removeItem("showLoginForm");
    sessionStorage.removeItem("showRegisterForm");
    sessionStorage.removeItem("loginEmail");
    sessionStorage.removeItem("registerFirstName");
    sessionStorage.removeItem("registerLastName");
    sessionStorage.removeItem("registerEmail");
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

    // Set the active class based on the current path on page load
    const activeLinkId = linkMap[currentPath];
    if (activeLinkId) {
        document.getElementById(activeLinkId)?.classList.add('active-border'); // Use active-border if that’s the intended style

    }

    // Ensure click listeners dynamically add 'active' to clicked links
    Object.values(linkMap).forEach(id => {
        const linkElement = document.getElementById(id);
        if (linkElement) {
            linkElement.addEventListener('click', (event) => {
                // Remove 'active' class from all links in the staff-header-content
                document.querySelectorAll('.staff-header-content a').forEach(link => {
                    link.classList.remove('active');
                });
                event.currentTarget.classList.add('active');
            });
        }
    });
});


// Attach spinner to all form submissions
function setupFormSubmissionSpinner() {
    document.querySelectorAll("form").forEach(form => {
        form.addEventListener("submit", showSpinner);
    });
}

// Enables / disables save button in manage-access.ejs based on checkbox activity
document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const saveButton = document.getElementById('saveChangesButton');

    // Check for changes in checkboxes and update save button state
    function checkForChanges() {
        if (!saveButton) return; // Exit if saveButton is not in the DOM

        const hasChanges = Array.from(checkboxes).some(checkbox =>
            checkbox.checked.toString() !== checkbox.getAttribute('data-original')
        );
        saveButton.disabled = !hasChanges;
    }

    // Attach change event listeners to all checkboxes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', checkForChanges);
    });

    // Mutation observer to detect attribute changes on checkboxes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'checked') {
                checkForChanges();
            }
        });
    });

    // Observe each checkbox for attribute changes
    checkboxes.forEach(checkbox => {
        observer.observe(checkbox, { attributes: true });
    });

    // Initial check for changes on page load
    checkForChanges();
});
