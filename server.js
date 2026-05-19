const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { router: authRouter } = require('./server/auth');
const initSocket = require('./server/socket');

const app = express();
const server = http.createServer(app);

// CORS for cross-origin frontend (e.g. Netlify)
app.use(cors({
    origin: function (origin, callback) {
        // Allow any origin for development/demo purposes
        callback(null, true);
    },
    credentials: true
}));

const io = new Server(server, {
    cors: {
        origin: true,
        credentials: true
    }
});

// Trust proxy required for secure cookies when hosted on Replit/Render
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
const sessionMiddleware = session({
    secret: 'virgi-pout-super-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true, // Must be true for SameSite=none
        sameSite: 'none', // Required for cross-origin cookies
        maxAge: 24 * 60 * 60 * 1000 
    }
});
app.use(sessionMiddleware);

// Share session with socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', authRouter);

// Initialize WebSocket
initSocket(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
