//
// File: server.js
// Description: The main backend server using Express and Socket.IO, updated to handle usernames.
//
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Server-side state
let requiredUsernames = [];
const clickedUsernames = new Set();
const userClickStatus = new Map(); // Maps username to true if they've clicked

// Socket.IO event handling
io.on('connection', (socket) => {
    console.log(`A user connected with ID: ${socket.id}`);

    // Update the newly connected client with the current list of users
    socket.emit('updateUserList', requiredUsernames);
    
    // Update the newly connected curtain page with the current progress
    socket.on('registerCurtain', () => {
        const progress = requiredUsernames.length > 0 ? (clickedUsernames.size / requiredUsernames.length) * 100 : 0;
        socket.emit('progressUpdate', { progress, clicked: clickedUsernames.size, total: requiredUsernames.length });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });

    // Handle the 'setUsers' event from the dashboard
    socket.on('setUsers', (usernamesString) => {
        // Parse the comma-separated string into an array of names
        requiredUsernames = usernamesString.split(',').map(name => name.trim()).filter(name => name.length > 0);
        clickedUsernames.clear(); // Reset the count
        userClickStatus.clear();
        console.log(`Required users set to: ${requiredUsernames}`);

        // Broadcast the new list to all clients
        io.emit('updateUserList', requiredUsernames);
        io.emit('progressUpdate', { progress: 0, clicked: 0, total: requiredUsernames.length });
    });

    // Handle the 'userClicked' event from the button pages
    socket.on('userClicked', (username) => {
        if (!userClickStatus.has(username)) {
            clickedUsernames.add(username);
            userClickStatus.set(username, true);
            console.log(`User clicked: ${username}. Total clicks: ${clickedUsernames.size}`);

            const progress = (clickedUsernames.size / requiredUsernames.length) * 100;

            // Broadcast the progress update to all clients
            io.emit('progressUpdate', { progress, clicked: clickedUsernames.size, total: requiredUsernames.length });

            // Check if the required number of users has been reached
            if (clickedUsernames.size >= requiredUsernames.length && requiredUsernames.length > 0) {
                console.log('Required users reached! Opening the curtain.');
                io.emit('openCurtain');
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
