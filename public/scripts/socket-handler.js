document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    let countdownInterval = null; // Global variable to track countdown interval
    let isDisconnected = false; // Track disconnection state

    // Handle server heartbeat
    socket.on('heartbeat', () => {
        console.log('Server heartbeat received'); // Debug log
        if (isDisconnected) {
            console.log('Server is back online. Reloading...');
            isDisconnected = false; // Reset the disconnection state
            setTimeout(() => {
                location.href = location.href; // Force page reload
            }, 100); // Short delay to ensure stable refresh
        }
    });

    // Handle server shutdown notification
    socket.on('serverShutdown', (data) => {
        console.log('Server shutdown notification received', data); // Debug log
        const { remainingTime } = data;

        // Clear any existing intervals and remove existing containers
        if (countdownInterval) clearInterval(countdownInterval);
        let countdownContainer = document.getElementById('shutdown-warning');
        if (countdownContainer) countdownContainer.remove();

        // Create the warning container
        countdownContainer = document.createElement('div');
        countdownContainer.id = 'shutdown-warning';
        countdownContainer.style.position = 'fixed';
        countdownContainer.style.top = '50%';
        countdownContainer.style.left = '50%';
        countdownContainer.style.transform = 'translate(-50%, -50%)'; // Centers horizontally and vertically
        countdownContainer.style.padding = '25px';
        countdownContainer.style.backgroundColor = '#ffcccb'; // Light red for warning
        countdownContainer.style.border = '1px solid red';
        countdownContainer.style.color = '#000';
        countdownContainer.style.fontSize = '18px';
        countdownContainer.style.zIndex = '1000';
        countdownContainer.style.textAlign = 'center';
        countdownContainer.style.borderRadius = '5px';
        countdownContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        document.body.appendChild(countdownContainer);

        // Start the countdown from the remaining time
        let countdown = Math.ceil(remainingTime / 1000);
        const updateCountdownMessage = () => {
            countdownContainer.innerHTML = `<strong>Warning:</strong> The server will shut down in <span id="countdown-timer" style="display: inline-block; width: 2ch; text-align: center;"><strong>${countdown}</strong></span> seconds.`;
        };
        updateCountdownMessage(); // Initial message

        countdownInterval = setInterval(() => {
            countdown--;
            updateCountdownMessage();

            if (countdown <= 0) {
                clearInterval(countdownInterval);

                // Clear the page content
                document.body.innerHTML = '<h1 style="text-align: center; margin-top: 50px;">The server has shut down. Please try again later.</h1>';

                // Perform logout procedures
                fetch('/logout', { method: 'POST', credentials: 'same-origin' })
                    .then(() => {
                        // Redirect to login or homepage after logout
                        window.location.href = '/';
                    })
                    .catch((err) => {
                        console.error('Error during logout:', err);
                        // Fallback: Redirect regardless of logout success
                        window.location.href = '/';
                    });
            }
        }, 1000);
    });

    // Handle unexpected disconnections
    socket.on('disconnect', (reason) => {
        console.warn(`Disconnected from server: ${reason}`);
        if (!isDisconnected) {
            console.log('Marking as disconnected');
            isDisconnected = true; // Mark as disconnected
        }
    });

    // Handle reconnection attempts
    socket.on('reconnect_attempt', () => {
        console.log('Attempting to reconnect to the server...');
    });

    // Handle reconnection failures
    socket.on('reconnect_failed', () => {
        console.error('Reconnection failed. Redirecting to login.');
        fetch('/logout', { method: 'POST', credentials: 'same-origin' })
            .then(() => {
                window.location.href = '/';
            })
            .catch(() => {
                window.location.href = '/';
            });
    });

    // Handle successful reconnection
    socket.on('connect', () => {
        console.log('Reconnected to server'); // Debug log
        if (isDisconnected) {
            console.log('Reconnection detected. Reloading page...');
            isDisconnected = false; // Reset disconnection state
            setTimeout(() => {
                location.href = location.href; // Force page reload
            }, 100); // Short delay to avoid race conditions
        }
    });
});
