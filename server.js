const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { router: authRouter } = require('./server/auth');
const initSocket = require('./server/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
const sessionMiddleware = session({
    secret: 'virgi-pout-super-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
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

// Protected route for game center
app.get('/play', (req, res) => {
    if (!req.session.userId) return res.redirect('/login.html');
    res.sendFile(path.join(__dirname, 'public', 'play.html'));
});

// Initialize WebSocket
initSocket(io);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
