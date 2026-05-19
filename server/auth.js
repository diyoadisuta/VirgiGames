const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const router = express.Router();

// Register
router.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);

    req.session.userId = result.lastInsertRowid;
    req.session.username = username;
    res.json({ ok: true, username });
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ ok: true, username: user.username, wins: user.wins });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ ok: true });
});

// Get current user
router.get('/me', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
    const user = db.prepare('SELECT username, wins, games_played FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json(user);
});

// Auth middleware
function requireAuth(req, res, next) {
    if (!req.session.userId) return res.redirect('/login.html');
    next();
}

module.exports = { router, requireAuth };
