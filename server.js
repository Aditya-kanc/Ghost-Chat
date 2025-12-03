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

    // Auto-register
    const username = generateUsername();
    users.set(username, socket.id);
    socketToUser.set(socket.id, username);
    socket.emit('registration_success', username);
    console.log(`User auto-registered: ${username} (${socket.id})`);

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
            users.delete(username);
            socketToUser.delete(socket.id);
            console.log(`User disconnected: ${username}`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
