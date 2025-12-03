const socket = io();

// DOM Elements
const registerView = document.getElementById('register-view');
const dashboardView = document.getElementById('dashboard-view');
const chatView = document.getElementById('chat-view');

const registerBtn = document.getElementById('register-btn');
const myUsernameSpan = document.getElementById('my-username');
const targetUsernameInput = document.getElementById('target-username');
const connectBtn = document.getElementById('connect-btn');
const dashboardError = document.getElementById('dashboard-error');

const backBtn = document.getElementById('back-btn');
const chatPartnerSpan = document.getElementById('chat-partner');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

let myUsername = '';
let currentChatPartner = '';

// UI Navigation
function showView(view) {
    [registerView, dashboardView, chatView].forEach(v => v.classList.add('hidden'));
    [registerView, dashboardView, chatView].forEach(v => v.classList.remove('active'));
    view.classList.remove('hidden');
    view.classList.add('active');
}

function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', type);
    msgDiv.textContent = text;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Event Listeners
registerBtn.addEventListener('click', () => {
    socket.emit('register');
});

connectBtn.addEventListener('click', () => {
    const target = targetUsernameInput.value.trim().toUpperCase();
    if (target) {
        socket.emit('join_chat', target);
    }
});

backBtn.addEventListener('click', () => {
    currentChatPartner = '';
    messagesContainer.innerHTML = '';
    showView(dashboardView);
});

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const msg = messageInput.value.trim();
    if (msg && currentChatPartner) {
        socket.emit('private_message', { to: currentChatPartner, message: msg });
        messageInput.value = '';
    }
}

// Socket Events
socket.on('registration_success', (username) => {
    myUsername = username;
    myUsernameSpan.textContent = username;
    showView(dashboardView);
});

socket.on('chat_started', (partnerUsername) => {
    currentChatPartner = partnerUsername;
    chatPartnerSpan.textContent = partnerUsername;
    dashboardError.textContent = '';
    showView(chatView);
});

socket.on('private_message', ({ from, message }) => {
    if (currentChatPartner === from) {
        addMessage(message, 'received');
    } else {
        // Optional: Notification if chatting with someone else
        // For MVP, we assume single active chat or just ignore
        if (!currentChatPartner) {
            // Auto-open chat if in dashboard? Or just notify?
            // For MVP simplicity:
            currentChatPartner = from;
            chatPartnerSpan.textContent = from;
            showView(chatView);
            addMessage(message, 'received');
        }
    }
});

socket.on('private_message_sent', ({ to, message }) => {
    if (currentChatPartner === to) {
        addMessage(message, 'sent');
    }
});

socket.on('error', (msg) => {
    if (dashboardView.classList.contains('active')) {
        dashboardError.textContent = msg;
    } else {
        alert(msg);
    }
});
