const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const users = new Map(); // username -> socketId
const socketToUser = new Map(); // socketId -> username

function generateUsername() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'USER-';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness (simple check)
    const express = require('express');
    const http = require('http');
    const { Server } = require('socket.io');
    const path = require('path');

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    app.use(express.static(path.join(__dirname, 'public')));

    const users = new Map(); // username -> socketId
    const socketToUser = new Map(); // socketId -> username

    function generateUsername() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'USER-';
        for (let i = 0; i < 4; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        // Ensure uniqueness (simple check)
        if (users.has(result)) {
            return generateUsername();
        }
        return result;
    }

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Check if user has a stored username
        let username = socket.handshake.auth.username;

        if (username) {
            if (users.has(username)) {
                // Username exists. In a production app, we'd verify a token.
                // For this MVP, we assume it's a reconnection/refresh and allow takeover.
                const oldSocketId = users.get(username);
                // Check if it's a different socket (it should be)
                if (oldSocketId !== socket.id) {
                    console.log(`User ${username} reconnected. Taking over from ${oldSocketId}`);
                    // Optionally disconnect the old socket if it's still hanging around
                    const oldSocket = io.sockets.sockets.get(oldSocketId);
                    if (oldSocket) {
                        oldSocket.disconnect(true);
                    }
                    // Update maps
                    users.set(username, socket.id);
                    socketToUser.delete(oldSocketId); // Remove old mapping
                }
            }
            // If not taken, just use it (users.set below)
        } else {
            username = generateUsername();
            // Ensure uniqueness
            while (users.has(username)) {
                username = generateUsername();
            }
        }

        users.set(username, socket.id);
        socketToUser.set(socket.id, username);
        socket.emit('registration_success', username);
        console.log(`User registered: ${username} (${socket.id})`);

        socket.on('join_chat', (targetUsername) => {
            const myUsername = socketToUser.get(socket.id);
            if (!myUsername) {
                socket.emit('error', 'You must register first.');
                return;
            }

            if (targetUsername === myUsername) {
                socket.emit('error', 'You cannot chat with yourself.');
                return;
            }

            if (users.has(targetUsername)) {
                socket.emit('chat_started', targetUsername);
                console.log(`${myUsername} started chat with ${targetUsername}`);
            } else {
                socket.emit('error', 'User not found or offline.');
            }
        });

        socket.on('private_message', ({ to, message }) => {
            const myUsername = socketToUser.get(socket.id);
            const targetSocketId = users.get(to);

            if (targetSocketId) {
                io.to(targetSocketId).emit('private_message', {
                    from: myUsername,
                    message: message
                });
                // Echo back to sender so they see their own message
                socket.emit('private_message_sent', {
                    to: to,
                    message: message
                });
            } else {
                socket.emit('error', 'User is offline.');
            }
        });

        socket.on('disconnect', () => {
            const username = socketToUser.get(socket.id);
            if (username) {
                // Only delete if the socket ID matches the current one for that user
                // (to prevent deleting the new socket if a race condition happened)
                if (users.get(username) === socket.id) {
                    users.delete(username);
                    console.log(`User disconnected: ${username}`);
                }
                socketToUser.delete(socket.id);
            }
        });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
