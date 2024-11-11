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
    // Select any element with the class 'flash-message'
    const flashMessage = document.querySelector(".flash-message");

    if (flashMessage) {
        console.log("Flash message found:", flashMessage.textContent); // Debugging log

        // Set a default duration, and override with `flashDuration` if available
        let duration = 10000; // Default to 10 seconds
        if (flashMessage.dataset.duration) {
            duration = parseInt(flashMessage.dataset.duration, 10);
        }

        console.log(`Hiding flash message in ${duration / 1000} seconds`);

        // Set timeout to hide the flash message after the specified duration
        setTimeout(() => {
            flashMessage.style.display = "none";
            console.log("Flash message hidden after timeout."); // Debugging log
        }, duration);
    } else {
        console.log("No flash message found."); // Debugging log
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // Select form elements and links
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const showRegisterLink = document.getElementById("show-register");
    const showLoginLink = document.getElementById("show-login");

    // Restore form visibility based on session storage
    if (sessionStorage.getItem("showLoginForm") === "true") {
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        sessionStorage.removeItem("showLoginForm");
    } else if (sessionStorage.getItem("showRegisterForm") === "true") {
        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
        sessionStorage.removeItem("showRegisterForm");
    }

    // Save visibility state and toggle forms
    showRegisterLink?.addEventListener("click", (event) => {
        event.preventDefault();
        sessionStorage.setItem("showRegisterForm", "true");
        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
    });

    showLoginLink?.addEventListener("click", (event) => {
        event.preventDefault();
        sessionStorage.setItem("showLoginForm", "true");
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    });

    // Retain input data in session storage
    document.getElementById("loginForm")?.addEventListener("submit", () => {
        sessionStorage.setItem("loginEmail", document.getElementById("email").value);
    });

    document.getElementById("registerForm")?.addEventListener("submit", () => {
        sessionStorage.setItem("registerFirstName", document.getElementById("first_name").value);
        sessionStorage.setItem("registerLastName", document.getElementById("last_name").value);
        sessionStorage.setItem("registerEmail", document.getElementById("register_email").value);
    });

    // Populate form fields with stored data
    document.getElementById("email").value = sessionStorage.getItem("loginEmail") || "";
    document.getElementById("first_name").value = sessionStorage.getItem("registerFirstName") || "";
    document.getElementById("last_name").value = sessionStorage.getItem("registerLastName") || "";
    document.getElementById("register_email").value = sessionStorage.getItem("registerEmail") || "";

    // Clear session storage for form fields upon successful submission (optional)
    // This can be managed based on server response after the form posts.
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
