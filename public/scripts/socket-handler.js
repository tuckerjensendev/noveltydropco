// public/scripts/socket-handler.js

document.addEventListener('DOMContentLoaded', () => {
    // Establish Socket.IO connection
    const socket = io();
  
    // Handle successful connection
    socket.on('connect', () => {
      logDebug('Connected to server via Socket.IO');
    });
  
    // Handle server shutdown notification
    socket.on('serverShutdown', (data) => {
      alert(data.message); // Optional: Display a message to the user
  
      // Perform logout procedures
      // This can vary based on how you manage authentication on the client
      // Example:
      fetch('/logout', { method: 'POST' })
        .then(() => {
          // Redirect to login or homepage after logout
          window.location.href = '/login';
        })
        .catch((err) => {
          console.error('Error during logout:', err);
          // Fallback: Redirect regardless of logout success
          window.location.href = '/login';
        });
    });
  
    // Handle unexpected disconnections
    socket.on('disconnect', (reason) => {
      console.warn(`Disconnected from server: ${reason}`);
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the client
        // Optionally, attempt to reconnect
        socket.connect();
      } else {
        // Handle other disconnection reasons (e.g., network issues)
        // Optionally, notify the user or attempt reconnection
      }
    });
  
    // Optional: Handle reconnection attempts and failures
    socket.on('reconnect_attempt', () => {
      logDebug('Attempting to reconnect to the server...');
    });
  
    socket.on('reconnect_failed', () => {
      console.error('Reconnection failed. Redirecting to login.');
      // Perform logout and redirect
      fetch('/logout', { method: 'POST' })
        .then(() => {
          window.location.href = '/login';
        })
        .catch(() => {
          window.location.href = '/login';
        });
    });
  });
  